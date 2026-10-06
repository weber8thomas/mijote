import { formatQty, ingredientsOfState, itemName, shoppingWeekOf, sortItems, type HouseholdState, type ShoppingItem } from "@mijote/shared";
import { Hono } from "hono";
import { createHash } from "node:crypto";
import { clientIp, failureLimiter, rateLimiter, samePassphrase } from "./auth";
import type { Household } from "./household";

// Montre Garmin (apps/garmin) : la liste de courses de la semaine, cochable aux boutons, par le téléphone.
// Un jeton dédié (WATCH_TOKEN), lu dans l'en-tête Authorization seulement : il n'ouvre que ces routes.
// Réponses courtes (le Bluetooth de la montre fait quelques centaines d'octets par seconde).

/** Longueur des libellés sur la montre (nom, puis quantité · rayon). */
export const NAME_MAX = 24;
export const SUB_MAX = 22;
/** Au-delà, la liste est coupée (`more`) : la réponse reste sous 8 Ko. */
export const MAX_ITEMS = 80;
const CLIENT = "watch";
const BY = "Montre";
const ACTION_ID = /^[A-Za-z0-9_-]{8,40}$/;

/** Coché ou non : un booléen JSON, ou 1/0, "true"/"false" (selon ce que le téléphone transmet de la montre). */
const bool = (v: unknown) => (v === true || v === 1 || v === "true" ? true : v === false || v === 0 || v === "false" ? false : undefined);

/** Clé courte et stable d'un article (ses ids complets font jusqu'à 50 caractères). */
export const watchKey = (id: string) => createHash("sha256").update(id).digest("base64url").slice(0, 8);

/** Caractère imprimable de Latin-1 (ce que les polices de la montre savent afficher, accents compris). */
const printable = (ch: string) => {
  const n = ch.charCodeAt(0);
  return (n >= 0x20 && n < 0x7f) || (n >= 0xa0 && n <= 0xff);
};

/** Texte sûr pour la montre (« œ » → « oe », « ā » → « a », sans emoji), majuscule, au plus `max` caractères. */
export function watchText(s: string, max: number) {
  const t = [...s.replace(/œ/g, "oe").replace(/Œ/g, "Oe").replace(/[’‘]/g, "'").replace(/\s+/g, " ").normalize("NFC")]
    .map((ch) => (printable(ch) ? ch : [...ch.normalize("NFD")].filter(printable).join("")))
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();
  return fit(t.charAt(0).toLocaleUpperCase("fr-FR") + t.slice(1), max);
}

/** Trop long : sans les notes entre parenthèses (« (boîte) »), puis coupé après un mot entier. */
function fit(t: string, max: number) {
  if (t.length <= max) return t;
  const bare = t.replace(/\s*\([^)]*\)/g, "").trim();
  if (bare.length <= max) return bare;
  const space = bare.slice(0, max + 1).lastIndexOf(" ");
  return (space >= max / 2 ? bare.slice(0, space) : bare.slice(0, max)).replace(/[\s·&,;:(-]+$/, "");
}

/** La liste de la semaine des courses, comme la montre l'affiche : ce qui reste (par rayon), puis ce qui est coché. */
export function watchList(state: HouseholdState, now: Date) {
  const w = shoppingWeekOf(state, now);
  const byId = ingredientsOfState(state).byId;
  const shown = sortItems((state.shopping[w] ?? []).filter((i) => !i.haveAlready), byId);
  const ordered = [...shown.filter((i) => !i.checked), ...shown.filter((i) => i.checked)];
  const row = (it: ShoppingItem) => [watchKey(it.id), watchText(itemName(it, byId), NAME_MAX), watchText(it.qty ? `${formatQty(it.qty, it.unit)} · ${it.aisle}` : it.aisle, SUB_MAX), it.checked] as const;
  return { v: 1, w, left: remaining(state.shopping[w]), more: Math.max(0, ordered.length - MAX_ITEMS), i: ordered.slice(0, MAX_ITEMS).map(row) };
}

const remaining = (items: ShoppingItem[] = []) => items.filter((i) => !i.haveAlready && !i.checked).length;

export function watchRoutes({
  household,
  token,
  secure = false,
  kick = () => {},
  now = () => new Date(),
}: {
  household: Household;
  /** WATCH_TOKEN ; absent : les routes répondent 404. */
  token?: string;
  /** Adresse publique en https : la requête doit arriver en https (X-Forwarded-Proto du reverse proxy). */
  secure?: boolean;
  /** Synchro Home Assistant après une coche. */
  kick?: () => void;
  now?: () => Date;
}) {
  const app = new Hono();
  const allow = rateLimiter(120, 60_000);
  const refused = failureLimiter(10, 15 * 60_000);

  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    if (!token) return c.json({ error: "Introuvable." }, 404);
    if (secure && c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() !== "https") return c.json({ error: "https requis." }, 403);
    const ip = clientIp((h) => c.req.header(h));
    if (refused.blocked(ip)) return c.json({ error: "Trop d'essais. Réessaie dans un quart d'heure." }, 429);
    if (!allow(ip)) return c.json({ error: "Trop de requêtes. Réessaie dans une minute." }, 429);
    const given = /^Bearer\s+(\S+)$/i.exec(c.req.header("authorization") ?? "")?.[1];
    if (!given || !samePassphrase(given, token)) {
      refused.fail(ip);
      return c.json({ error: "Jeton refusé." }, 401);
    }
    await next();
  });

  app.get("/list", (c) => c.json(watchList(household.snapshot().state, now())));

  /** Coche ou décoche un article. Renvoyer la même coche (même `a`) ne fait rien. */
  app.post("/check", async (c) => {
    const body = (await c.req.json<unknown>().catch(() => null)) as { k?: unknown; c?: unknown; w?: unknown; a?: unknown } | null;
    const { k, w, a } = body ?? {};
    const checked = bool(body?.c);
    if (typeof k !== "string" || !k || k.length > 16 || checked === undefined || typeof w !== "string" || typeof a !== "string" || !ACTION_ID.test(a)) {
      return c.json({ error: "Requête invalide." }, 400);
    }
    const at = now();
    const { state } = household.snapshot();
    const week = shoppingWeekOf(state, at);
    if (w !== week) return c.json({ error: "La semaine a changé.", w: week }, 409);
    const item = (state.shopping[week] ?? []).find((i) => watchKey(i.id) === k);
    if (!item) return c.json({ error: "Article introuvable : recharge la liste." }, 409);
    const { applied } = household.apply([{ actionId: `watch:${a}`, action: { type: "setChecked", weekStart: week, itemId: item.id, checked, by: BY, at: at.toISOString() } }], CLIENT);
    if (applied.length) kick();
    const items = household.snapshot().state.shopping[week];
    return c.json({ ok: true, k, c: items?.find((i) => i.id === item.id)?.checked ?? checked, left: remaining(items) });
  });

  // Rien d'autre sous /api/watch (et surtout pas la garde de session des téléphones).
  app.all("*", (c) => c.json({ error: "Introuvable." }, 404));

  return app;
}
