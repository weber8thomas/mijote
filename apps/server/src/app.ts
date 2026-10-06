import { serveStatic } from "@hono/node-server/serve-static";
import { pickHousehold } from "@mijote/shared";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clientIp, COOKIE, createSession, endSession, listMembers, memberOf, rateLimiter, removeMember, renameMember, samePassphrase, type Member } from "./auth";
import type { Config } from "./config";
import type { Db } from "./db";
import { BadAction, type Envelope, type Household } from "./household";
import { watchRoutes } from "./watch";

// API du foyer (préfixe /api) et front (build de apps/web), sur la même origine.

/** Services branchés à côté de l'API (Home Assistant, Claude). */
export type Services = {
  ha?: { status: () => unknown; check: () => Promise<unknown>; kick: () => void; sync: () => Promise<void> };
  ai?: { route: (app: Hono<Env>) => void };
};

export type Env = { Variables: { member: Member } };

export function createApp({ db, household, config, services = {} }: { db: Db; household: Household; config: Config; services?: Services }) {
  const app = new Hono<Env>();
  const allowJoin = rateLimiter();
  const secure = config.publicUrl?.startsWith("https://") ?? false;

  app.get("/api/health", (c) => c.json({ ok: true, app: "mijote", version: household.snapshot().version, ha: !!services.ha, ai: !!services.ai }));

  // ——— Rejoindre le foyer ———
  app.post("/api/auth/join", async (c) => {
    const ip = clientIp((h) => c.req.header(h));
    if (!allowJoin(ip)) return c.json({ error: "Trop d'essais. Réessaie dans un quart d'heure." }, 429);
    const body = await c.req.json<{ passphrase?: string; displayName?: string }>().catch(() => ({}) as { passphrase?: string; displayName?: string });
    if (!body.passphrase || !samePassphrase(body.passphrase, config.passphrase)) return c.json({ error: "Phrase secrète incorrecte." }, 401);
    const displayName = (body.displayName ?? "").trim().slice(0, 40) || "Téléphone";
    const { token, expiresAt, member } = createSession(db, displayName);
    setCookie(c, COOKIE, token, { httpOnly: true, secure, sameSite: "Lax", path: "/", expires: expiresAt });
    return c.json({ member });
  });

  // ——— Montre Garmin : son propre jeton, avant la garde de session (il n'ouvre que /api/watch) ———
  app.route("/api/watch", watchRoutes({ household, token: config.watchToken, secure, ha: !!services.ha, kick: () => services.ha?.kick() }));

  // Tout le reste de l'API demande une session.
  app.use("/api/*", async (c, next) => {
    const member = memberOf(db, getCookie(c, COOKIE));
    if (!member) return c.json({ error: "Session absente : rejoins le foyer." }, 401);
    c.set("member", member);
    await next();
  });

  app.post("/api/auth/logout", (c) => {
    const token = getCookie(c, COOKIE);
    if (token) endSession(db, token);
    deleteCookie(c, COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/api/me", (c) => c.json({ member: c.get("member") }));

  // ——— Membres du foyer ———
  app.get("/api/members", (c) => c.json({ members: listMembers(db).map((m) => ({ id: m.id, displayName: m.displayName, lastSeen: m.lastSeen })) }));
  app.patch("/api/members/:id", async (c) => {
    const { displayName } = await c.req.json<{ displayName?: string }>();
    if (!displayName?.trim()) return c.json({ error: "Nom vide." }, 400);
    renameMember(db, c.req.param("id"), displayName.trim().slice(0, 40));
    return c.json({ ok: true });
  });
  app.delete("/api/members/:id", (c) => {
    removeMember(db, c.req.param("id"));
    return c.json({ ok: true });
  });

  // ——— État et actions ———
  app.get("/api/state", (c) => {
    const { version, state } = household.snapshot();
    return c.json({ version, state: pickHousehold(state) });
  });

  app.post("/api/actions", async (c) => {
    const body = await c.req.json<{ clientId?: string; actions?: Envelope[] }>().catch(() => ({}) as { clientId?: string; actions?: Envelope[] });
    if (!body.clientId || !Array.isArray(body.actions)) return c.json({ error: "Requête invalide." }, 400);
    try {
      const { version, applied } = household.apply(body.actions, body.clientId, c.get("member").id);
      if (applied.some((a) => SHOPPING_ACTIONS.has(a.action.type))) services.ha?.kick();
      return c.json({ version, applied: applied.length });
    } catch (e) {
      if (e instanceof BadAction) return c.json({ error: e.message }, 400);
      throw e;
    }
  });

  /** Rattrapage : les actions après une version (ou « reload » si le journal ne remonte pas assez loin). */
  app.get("/api/actions", (c) => {
    const since = Number(c.req.query("since") ?? 0);
    const actions = household.since(since);
    return actions ? c.json({ version: household.snapshot().version, actions }) : c.json({ reload: true }, 410);
  });

  // ——— En direct (Server-Sent Events) ———
  app.get("/api/events", (c) => {
    // Derrière nginx : pas de mise en tampon, sinon le direct arrive par paquets.
    c.header("X-Accel-Buffering", "no");
    return streamSSE(c, async (stream) => {
      const { version } = household.snapshot();
      await stream.writeSSE({ event: "hello", data: JSON.stringify({ version, ha: services.ha?.status() }) });
      const unsubscribe = household.subscribe((applied) => {
        void stream.writeSSE({ event: "actions", data: JSON.stringify(applied) });
      });
      const ha = services.ha;
      const heartbeat = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: JSON.stringify({ version: household.snapshot().version, ha: ha?.status() }) });
      }, 25_000);
      await new Promise<void>((resolve) => stream.onAbort(resolve));
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // ——— Home Assistant ———
  app.get("/api/ha/status", (c) => c.json(services.ha ? services.ha.status() : { enabled: false }));
  app.post("/api/ha/check", async (c) => c.json(services.ha ? await services.ha.check() : { enabled: false }));
  app.post("/api/ha/sync", async (c) => {
    if (!services.ha) return c.json({ enabled: false });
    await services.ha.sync();
    return c.json(services.ha.status());
  });

  if (services.ai) services.ai.route(app);
  else app.get("/api/ai/status", (c) => c.json({ enabled: false }));

  app.notFound((c) => (c.req.path.startsWith("/api/") ? c.json({ error: "Introuvable." }, 404) : spa(c, config.webDir)));
  app.onError((e, c) => {
    console.error(e);
    return c.json({ error: "Erreur du serveur." }, 500);
  });

  // ——— Front : fichiers du build, sinon index.html (routes par ancre, PWA) ———
  if (config.webDir) app.use("/*", serveStatic({ root: config.webDir }));

  return app;
}

/** Les actions qui touchent la liste de courses (déclenchent une synchro Home Assistant). */
const SHOPPING_ACTIONS = new Set(["validate", "choose", "unchoose", "setChecked", "setHave", "addToShopping", "removeShoppingItem", "restoreShoppingItem", "setPantry", "addInventory", "removeInventory", "updateInventory", "updateHousehold", "setPrice", "replaceHousehold"]);

let indexHtml: string | undefined;
function spa(c: Context<Env>, webDir?: string) {
  if (!webDir) return c.text("Mijoté : API seule (WEB_DIR non défini).", 404);
  indexHtml ??= readFileSync(join(webDir, "index.html"), "utf8");
  return c.html(indexHtml);
}
