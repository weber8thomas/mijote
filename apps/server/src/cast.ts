import { castRecipe, dayIndex, findRecipeByName, householdPortions, ingredientsOfState, mondayOf, recipeMapOf, recipesOfState, Slot, type CastRecipe, type HouseholdState } from "@mijote/shared";
import { Hono } from "hono";
import type { Duplex } from "node:stream";
import { connect as tlsConnect } from "node:tls";
import { clientIp, failureLimiter, rateLimiter, samePassphrase } from "./auth";
import type { Household } from "./household";

// Écran de cuisine : le serveur lance l'appli Mijoté sur un Nest Hub (Google Cast) et lui envoie la recette.
// Récepteur : apps/web/public/cast. Protocole Cast v2 : TLS sur le port 8009, messages protobuf `CastMessage`
// précédés de leur longueur sur 4 octets. Le Hub n'a pas de certificat vérifiable : on ne parle qu'à l'adresse
// configurée (CAST_HOST), sur le réseau de la maison. Une connexion par commande, fermée aussitôt.

export const CAST_NAMESPACE = "urn:x-cast:app.mijote";
const NS_CONNECTION = "urn:x-cast:com.google.cast.tp.connection";
const NS_HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
const NS_RECEIVER = "urn:x-cast:com.google.cast.receiver";
const SENDER = "sender-0";
const PLATFORM = "receiver-0";
const CURRENT = "cast-current";

/** Erreur à montrer telle quelle au téléphone (message court, en français). */
export class CastError extends Error {
  readonly status: 400 | 404 | 502 | 504;
  constructor(message: string, status: 400 | 404 | 502 | 504 = 502) {
    super(message);
    this.status = status;
  }
}

// ——— Messages Cast : protobuf à la main (6 champs, tous des chaînes ou des énumérations) ———

export type CastMessage = { source: string; dest: string; ns: string; payload: Record<string, unknown> };

const varint = (n: number) => {
  const out: number[] = [];
  for (; n > 127; n = Math.floor(n / 128)) out.push((n % 128) | 128);
  out.push(n);
  return Buffer.from(out);
};
const text = (num: number, value: string) => {
  const b = Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from([(num << 3) | 2]), varint(b.length), b]);
};

/** Un message prêt à écrire : longueur (4 octets) + CastMessage. */
export function encodeMessage(m: CastMessage): Buffer {
  // protocol_version = CASTV2_1_0 (0), payload_type = STRING (0)
  const body = Buffer.concat([Buffer.from([0x08, 0x00]), text(2, m.source), text(3, m.dest), text(4, m.ns), Buffer.from([0x28, 0x00]), text(6, JSON.stringify(m.payload))]);
  const head = Buffer.alloc(4);
  head.writeUInt32BE(body.length);
  return Buffer.concat([head, body]);
}

export function decodeMessage(body: Buffer): CastMessage | undefined {
  const fields = new Map<number, string>();
  let i = 0;
  const read = () => {
    let n = 0;
    for (let mul = 1; ; mul *= 128) {
      const b = body[i++];
      if (b === undefined) throw new Error("message tronqué");
      n += (b & 127) * mul;
      if (!(b & 128)) return n;
    }
  };
  try {
    while (i < body.length) {
      const key = read();
      const wire = key & 7;
      if (wire === 0) read();
      else if (wire === 2) {
        const len = read();
        fields.set(key >> 3, body.subarray(i, i + len).toString("utf8"));
        i += len;
      } else return undefined;
    }
    const payload = fields.get(6) ? (JSON.parse(fields.get(6)!) as Record<string, unknown>) : {};
    return { source: fields.get(2) ?? "", dest: fields.get(3) ?? "", ns: fields.get(4) ?? "", payload };
  } catch {
    return undefined;
  }
}

/** Découpe le flux TCP en messages (un message peut arriver en plusieurs morceaux, ou plusieurs ensemble). */
export class Framer {
  private buf = Buffer.alloc(0);
  feed(chunk: Buffer): CastMessage[] {
    this.buf = Buffer.concat([this.buf, chunk]);
    const out: CastMessage[] = [];
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0);
      if (this.buf.length < 4 + len) break;
      const m = decodeMessage(this.buf.subarray(4, 4 + len));
      this.buf = this.buf.subarray(4 + len);
      if (m) out.push(m);
    }
    return out;
  }
}

// ——— Une conversation avec le Hub ———

export type Connect = (host: string, port: number) => Promise<Duplex>;
export type CastSettings = { host: string; appId: string; port?: number };
export type CastTimeouts = { connectMs: number; launchMs: number; replyMs: number };
const TIMEOUTS: CastTimeouts = { connectMs: 8_000, launchMs: 45_000, replyMs: 10_000 };

const tlsDefault: Connect = (host, port) =>
  new Promise((resolve, reject) => {
    const socket = tlsConnect({ host, port, rejectUnauthorized: false });
    socket.once("secureConnect", () => resolve(socket));
    socket.once("error", reject);
  });

type Waiter = { match: (m: CastMessage) => boolean; resolve: (m: CastMessage) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };
type HubApp = { appId: string; transportId?: string; sessionId?: string };

class Hub {
  private framer = new Framer();
  private waiters = new Set<Waiter>();
  private requestId = 0;
  private heartbeat: NodeJS.Timeout;
  private down?: Error;
  private socket: Duplex;
  private timeouts: CastTimeouts;

  constructor(socket: Duplex, timeouts: CastTimeouts) {
    this.socket = socket;
    this.timeouts = timeouts;
    socket.on("data", (d: Buffer) => this.onData(d));
    socket.on("error", (e) => this.fail(new CastError(`Connexion au Hub perdue (${e.message}).`)));
    socket.on("close", () => this.fail(new CastError("Le Hub a fermé la connexion.")));
    this.heartbeat = setInterval(() => this.send(PLATFORM, NS_HEARTBEAT, { type: "PING" }), 5_000);
    this.heartbeat.unref();
    this.send(PLATFORM, NS_CONNECTION, { type: "CONNECT" });
  }

  private onData(chunk: Buffer) {
    for (const m of this.framer.feed(chunk)) {
      if (m.ns === NS_HEARTBEAT && m.payload.type === "PING") this.send(m.source, NS_HEARTBEAT, { type: "PONG" });
      for (const w of [...this.waiters]) {
        if (!w.match(m)) continue;
        this.waiters.delete(w);
        clearTimeout(w.timer);
        w.resolve(m);
      }
    }
  }

  private fail(e: Error) {
    this.down ??= e;
    for (const w of this.waiters) {
      clearTimeout(w.timer);
      w.reject(e);
    }
    this.waiters.clear();
  }

  send(dest: string, ns: string, payload: Record<string, unknown>) {
    if (!this.socket.destroyed) this.socket.write(encodeMessage({ source: SENDER, dest, ns, payload }));
  }

  /** Attend le prochain message qui correspond (à poser avant d'envoyer la demande, la réponse peut être immédiate). */
  expect(match: (m: CastMessage) => boolean, ms: number, timeout: CastError): Promise<CastMessage> {
    if (this.down) return Promise.reject(this.down);
    return new Promise((resolve, reject) => {
      const w: Waiter = { match, resolve, reject, timer: setTimeout(() => (this.waiters.delete(w), reject(timeout)), ms) };
      this.waiters.add(w);
    });
  }

  private ask(type: string, extra: Record<string, unknown>, ms: number, timeout: CastError) {
    const requestId = ++this.requestId;
    const reply = this.expect((m) => m.ns === NS_RECEIVER && m.payload.requestId === requestId, ms, timeout);
    this.send(PLATFORM, NS_RECEIVER, { type, requestId, ...extra });
    return reply;
  }

  private static apps(m: CastMessage): HubApp[] {
    return ((m.payload.status as { applications?: HubApp[] } | undefined)?.applications ?? []).filter((a) => typeof a.appId === "string");
  }

  async running(appId: string): Promise<HubApp | undefined> {
    const m = await this.ask("GET_STATUS", {}, this.timeouts.replyMs, new CastError("Le Hub ne répond pas.", 504));
    return Hub.apps(m).find((a) => a.appId === appId);
  }

  /** Lance l'appli (ou la retrouve si elle tourne déjà). Le Hub ne répond qu'une fois la page chargée et démarrée. */
  async launch(appId: string): Promise<HubApp & { transportId: string }> {
    const m = await this.ask("LAUNCH", { appId }, this.timeouts.launchMs, new CastError("L'appli ne démarre pas sur le Hub (page injoignable, ou Hub à redémarrer).", 504));
    if (m.payload.type === "LAUNCH_ERROR") throw new CastError(`Le Hub refuse l'appli (${String(m.payload.reason ?? "inconnu")}) : appareil enregistré dans la console Cast ?`);
    const app = Hub.apps(m).find((a) => a.appId === appId && a.transportId);
    if (!app?.transportId) throw new CastError("L'appli ne s'est pas lancée sur le Hub.");
    return { ...app, transportId: app.transportId };
  }

  async stop(app: HubApp) {
    if (app.sessionId) await this.ask("STOP", { sessionId: app.sessionId }, this.timeouts.replyMs, new CastError("Le Hub ne répond pas à l'arrêt.", 504));
  }

  /** Envoie un message à l'appli et attend son accusé (`{ type: "ok" }`). */
  async tell(app: { transportId: string }, payload: Record<string, unknown>) {
    this.send(app.transportId, NS_CONNECTION, { type: "CONNECT" });
    const ack = this.expect((m) => m.ns === CAST_NAMESPACE && m.source === app.transportId && m.payload.type === "ok", this.timeouts.replyMs, new CastError("La recette n'a pas été confirmée par l'écran.", 504));
    this.send(app.transportId, CAST_NAMESPACE, payload);
    return ack;
  }

  close() {
    clearInterval(this.heartbeat);
    this.fail(new CastError("Connexion fermée."));
    this.socket.destroy();
  }
}

async function withHub<T>(settings: CastSettings, connect: Connect, timeouts: CastTimeouts, fn: (hub: Hub) => Promise<T>): Promise<T> {
  let socket: Duplex;
  try {
    socket = await Promise.race([
      connect(settings.host, settings.port ?? 8009),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("délai dépassé")), timeouts.connectMs).unref()),
    ]);
  } catch (e) {
    throw new CastError(`Hub injoignable sur ${settings.host} (${e instanceof Error ? e.message : String(e)}).`, 504);
  }
  const hub = new Hub(socket, timeouts);
  try {
    return await fn(hub);
  } finally {
    hub.close();
  }
}

// ——— Le service du foyer : ce qui est à l'écran, et les trois commandes ———

export type CastCurrent = { recipeId: string; title: string; at: string };
export type CastStatus = { enabled: true; host: string; current?: CastCurrent; busy: boolean; lastError?: string };
export type CastShow = { recipeId?: string; adults?: number; babies?: number };
export type CastService = { status: () => CastStatus; show: (req: CastShow) => Promise<CastStatus>; stop: () => Promise<CastStatus> };

export function startCast(household: Household, settings: CastSettings, { connect = tlsDefault, timeouts = TIMEOUTS, now = () => new Date() }: { connect?: Connect; timeouts?: CastTimeouts; now?: () => Date } = {}): CastService {
  let busy = false;
  let lastError: string | undefined;
  let chain: Promise<unknown> = Promise.resolve();

  const current = () => household.getMeta<CastCurrent>(CURRENT);
  const status = (): CastStatus => ({ enabled: true, host: settings.host, current: current(), busy, ...(lastError ? { lastError } : {}) });

  /** Une commande à la fois (deux téléphones qui appuient ensemble) ; l'état dit toujours la dernière erreur. */
  function queue(fn: () => Promise<void>): Promise<CastStatus> {
    const run = chain.catch(() => {}).then(async () => {
      busy = true;
      try {
        await fn();
        lastError = undefined;
      } catch (e) {
        lastError = e instanceof CastError ? e.message : "Erreur inattendue.";
        throw e;
      } finally {
        busy = false;
      }
    });
    chain = run;
    return run.then(status);
  }

  return {
    status,
    show: ({ recipeId, adults, babies }) =>
      queue(async () => {
        // Sans recette demandée : on reprend celle qui était à l'écran (l'appli s'est fermée, ou un autre déclencheur).
        const resume = !recipeId;
        const id = recipeId ?? current()?.recipeId;
        if (!id) throw new CastError("Aucune recette à reprendre : choisis-en une.", 400);
        const { state } = household.snapshot();
        const recipe = recipeMapOf(state).get(id);
        if (!recipe) throw new CastError("Recette introuvable.", 404);
        const people = { adults: adults ?? state.household.adults, babies: babies ?? state.household.babies };
        const portions = `${people.adults} adulte${people.adults > 1 ? "s" : ""}${people.babies ? ` + ${people.babies} bébé${people.babies > 1 ? "s" : ""}` : ""}`;
        const payload: CastRecipe = castRecipe(recipe, ingredientsOfState(state).byId, { factor: householdPortions(people) / recipe.servingsBase, portions });
        await withHub(settings, connect, timeouts, async (hub) => {
          const app = await hub.launch(settings.appId);
          await hub.tell(app, { type: "recipe", recipe: payload, resume });
        });
        household.setMeta(CURRENT, { recipeId: recipe.id, title: recipe.title, at: now().toISOString() } satisfies CastCurrent);
      }),
    stop: () =>
      queue(async () => {
        await withHub(settings, connect, timeouts, async (hub) => {
          const app = await hub.running(settings.appId);
          if (app) await hub.stop(app);
        });
      }),
  };
}

/** Routes des téléphones (derrière la session du foyer) : /api/cast/status, /show, /stop. */
export function castRoutes(service: CastService) {
  const app = new Hono();
  const count = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined);

  app.get("/status", (c) => c.json(service.status()));

  app.post("/show", async (c) => {
    const body = (await c.req.json<unknown>().catch(() => null)) as { recipeId?: unknown; adults?: unknown; babies?: unknown } | null;
    const recipeId = typeof body?.recipeId === "string" && body.recipeId.length <= 80 ? body.recipeId : undefined;
    const adults = count(body?.adults, 10);
    const babies = count(body?.babies, 4);
    if ((body?.recipeId !== undefined && !recipeId) || (body?.adults !== undefined && adults === undefined) || (body?.babies !== undefined && babies === undefined)) return c.json({ error: "Requête invalide." }, 400);
    try {
      return c.json(await service.show({ recipeId, adults: adults || undefined, babies }));
    } catch (e) {
      if (e instanceof CastError) return c.json({ error: e.message }, e.status);
      throw e;
    }
  });

  app.post("/stop", async (c) => {
    try {
      return c.json(await service.stop());
    } catch (e) {
      if (e instanceof CastError) return c.json({ error: e.message }, e.status);
      throw e;
    }
  });

  return app;
}

// ——— Pour Home Assistant : un jeton, et la recette désignée par son nom ou par le plan de la semaine ———

/** Le repas prévu aujourd'hui dans ce créneau (celui que le foyer a choisi, sinon la suggestion). */
export function plannedRecipeId(state: HouseholdState, slot: Slot, at: Date): string | undefined {
  const day = dayIndex(at);
  const entries = (state.weeks[mondayOf(at)]?.entries ?? []).filter((e) => e.day === day && e.slot === slot);
  return (entries.find((e) => e.confirmed) ?? entries[0])?.recipeId;
}

type HookBody = { q?: unknown; recipeId?: unknown; meal?: unknown; adults?: unknown; babies?: unknown };

/**
 * Routes de Home Assistant (jeton CAST_TOKEN dans l'en-tête Authorization, avant la session des téléphones) :
 * POST /show { q | recipeId | meal } désigne la recette, sans rien : reprend celle de l'écran. POST /stop, GET /status.
 *   q       : un nom dit à voix haute (« bœuf carottes »)
 *   meal    : « lunch », « dinner », « dessert » ou « now » (le midi avant 15 h, le soir ensuite), d'après le plan de la semaine
 */
export function castHookRoutes({ household, service, token, secure = false, now = () => new Date() }: { household: Household; service: CastService; token?: string; secure?: boolean; now?: () => Date }) {
  const app = new Hono();
  const allow = rateLimiter(60, 60_000);
  const refused = failureLimiter(10, 15 * 60_000);
  const count = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined);

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

  app.get("/status", (c) => c.json(service.status()));

  app.post("/show", async (c) => {
    const body = ((await c.req.json<unknown>().catch(() => null)) ?? {}) as HookBody;
    const adults = count(body.adults, 10);
    const babies = count(body.babies, 4);
    const given = [body.q, body.recipeId, body.meal].filter((v) => v !== undefined);
    if (given.length > 1 || given.some((v) => typeof v !== "string" || v.length > 120) || (body.adults !== undefined && adults === undefined) || (body.babies !== undefined && babies === undefined)) {
      return c.json({ error: "Requête invalide : une seule de q, recipeId, meal." }, 400);
    }
    const state = household.snapshot().state;
    let recipeId: string | undefined;
    if (typeof body.recipeId === "string") recipeId = body.recipeId;
    else if (typeof body.meal === "string") {
      const at = now();
      const meal = body.meal === "now" ? (at.getHours() < 15 ? "lunch" : "dinner") : Slot.safeParse(body.meal).data;
      if (!meal) return c.json({ error: "meal : lunch, dinner, dessert ou now." }, 400);
      recipeId = plannedRecipeId(state, meal, at);
      if (!recipeId) return c.json({ error: "Rien de prévu pour ce repas aujourd'hui." }, 404);
    } else if (typeof body.q === "string") {
      const match = findRecipeByName(recipesOfState(state).all, body.q);
      if (!match) return c.json({ error: `Aucune recette ne correspond à « ${body.q.slice(0, 60)} ».` }, 404);
      if ("candidates" in match) return c.json({ error: "Plusieurs recettes correspondent : précise.", candidates: match.candidates.slice(0, 5).map((r) => r.title) }, 409);
      recipeId = match.recipe.id;
    }
    try {
      const status = await service.show({ recipeId, adults: adults || undefined, babies });
      return c.json({ ...status, shown: status.current?.title });
    } catch (e) {
      if (e instanceof CastError) return c.json({ error: e.message }, e.status);
      throw e;
    }
  });

  app.post("/stop", async (c) => {
    try {
      return c.json(await service.stop());
    } catch (e) {
      if (e instanceof CastError) return c.json({ error: e.message }, e.status);
      throw e;
    }
  });

  return app;
}
