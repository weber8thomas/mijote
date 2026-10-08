import { connect as netConnect, createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { RECIPES } from "@mijote/shared";
import { createApp } from "./app";
import { CAST_NAMESPACE, castHookRoutes, decodeMessage, encodeMessage, Framer, plannedRecipeId, startCast, type CastMessage, type CastService } from "./cast";
import { loadConfig, type Config } from "./config";
import { openDb } from "./db";
import { Household } from "./household";

// Faux Nest Hub : un serveur TCP qui parle le protocole Cast (sans TLS : le client reçoit une fonction `connect`).

const APP = "7E270F5D";
const NS_HEARTBEAT = "urn:x-cast:com.google.cast.tp.heartbeat";
const NS_RECEIVER = "urn:x-cast:com.google.cast.receiver";
const WEB = "web-1";

type Behaviour = { launch?: "ok" | "refuse" | "silent"; ack?: boolean; running?: boolean; splitWrites?: boolean };

// oxlint-disable-next-line no-explicit-any
const body = async (r: Response | Promise<Response>): Promise<any> => (await r).json();

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

async function fakeHub(behaviour: Behaviour = {}) {
  const seen: CastMessage[] = [];
  let running = behaviour.running ?? false;
  const server = createServer((socket: Socket) => {
    const framer = new Framer();
    const say = (m: CastMessage) => {
      const bytes = encodeMessage(m);
      if (behaviour.splitWrites) {
        socket.write(bytes.subarray(0, 7));
        setTimeout(() => socket.write(bytes.subarray(7)), 5);
      } else socket.write(bytes);
    };
    const status = (requestId: unknown) => ({ type: "RECEIVER_STATUS", requestId, status: { applications: running ? [{ appId: APP, transportId: WEB, sessionId: "s-1" }] : [] } });
    socket.on("data", (d) => {
      for (const m of framer.feed(d)) {
        seen.push(m);
        const reply = (payload: Record<string, unknown>) => say({ source: m.dest, dest: m.source, ns: m.ns, payload });
        if (m.ns === NS_RECEIVER && m.payload.type === "GET_STATUS") reply(status(m.payload.requestId));
        if (m.ns === NS_RECEIVER && m.payload.type === "LAUNCH" && behaviour.launch !== "silent") {
          if (behaviour.launch === "refuse") reply({ type: "LAUNCH_ERROR", requestId: m.payload.requestId, reason: "NOT_FOUND" });
          else {
            running = true;
            reply(status(m.payload.requestId));
          }
        }
        if (m.ns === NS_RECEIVER && m.payload.type === "STOP") {
          running = false;
          reply(status(m.payload.requestId));
        }
        if (m.ns === NS_HEARTBEAT && m.payload.type === "PING") reply({ type: "PONG" });
        if (m.ns === CAST_NAMESPACE && m.dest === WEB && behaviour.ack !== false) say({ source: WEB, dest: m.source, ns: CAST_NAMESPACE, payload: { type: "ok", pages: 8 } });
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const port = (server.address() as { port: number }).port;
  const connect = () =>
    new Promise<Socket>((resolve, reject) => {
      const s = netConnect(port, "127.0.0.1", () => resolve(s));
      s.once("error", reject);
    });
  return { seen, connect, isRunning: () => running };
}

const FAST = { connectMs: 500, launchMs: 300, replyMs: 300 };

async function setup(behaviour: Behaviour = {}) {
  const hub = await fakeHub(behaviour);
  const household = new Household(openDb(":memory:"), () => new Date("2026-10-05T09:00:00"));
  const cast = startCast(household, { host: "127.0.0.1", appId: APP }, { connect: hub.connect, timeouts: FAST, now: () => new Date("2026-10-07T18:30:00Z") });
  const recipes = () => hub.seen.filter((m) => m.ns === CAST_NAMESPACE);
  return { hub, household, cast, recipes };
}

describe("cast : messages", () => {
  it("aller-retour d'un message, même coupé en morceaux", () => {
    const m: CastMessage = { source: "sender-0", dest: "web-1", ns: CAST_NAMESPACE, payload: { type: "recipe", recipe: { title: "Soupe à l'oignon · étape « 3 »" } } };
    const bytes = Buffer.concat([encodeMessage(m), encodeMessage(m)]);
    const framer = new Framer();
    expect(framer.feed(bytes.subarray(0, 10))).toEqual([]);
    expect(framer.feed(bytes.subarray(10))).toEqual([m, m]);
    expect(decodeMessage(encodeMessage(m).subarray(4))).toEqual(m);
    expect(decodeMessage(Buffer.from([0x0a]))).toBeUndefined();
  });

  it("un long message (plus de 127 octets) garde sa longueur", () => {
    const big: CastMessage = { source: "a", dest: "b", ns: "urn:x-cast:x", payload: { t: "é".repeat(500) } };
    expect(new Framer().feed(encodeMessage(big))).toEqual([big]);
  });
});

describe("cast : réglage", () => {
  const env = { HOUSEHOLD_PASSPHRASE: "soupe-de-courge" };
  it("CAST_HOST et CAST_APP_ID vont ensemble, App ID en 8 caractères hexadécimaux", () => {
    expect(loadConfig(env).cast).toBeUndefined();
    expect(loadConfig({ ...env, CAST_HOST: " 192.168.0.230 ", CAST_APP_ID: "7e270f5d" }).cast).toEqual({ host: "192.168.0.230", appId: APP });
    expect(() => loadConfig({ ...env, CAST_HOST: "192.168.0.230" })).toThrow(/CAST_HOST et CAST_APP_ID/);
    expect(() => loadConfig({ ...env, CAST_APP_ID: APP })).toThrow(/CAST_HOST et CAST_APP_ID/);
    expect(() => loadConfig({ ...env, CAST_HOST: "x", CAST_APP_ID: "pas-un-id" })).toThrow(/CAST_APP_ID invalide/);
  });
});

describe("cast : afficher une recette", () => {
  it("lance l'appli, envoie la recette aux portions du foyer, retient ce qui est à l'écran", async () => {
    const { hub, cast, recipes, household } = await setup({ splitWrites: true });
    const { adults, babies } = household.snapshot().state.household;
    const status = await cast.show({ recipeId: "boeuf-carottes-mijote" });
    expect(status).toMatchObject({ enabled: true, busy: false, current: { recipeId: "boeuf-carottes-mijote", title: "Bœuf carottes", at: "2026-10-07T18:30:00.000Z" } });
    expect(hub.isRunning()).toBe(true);
    expect(hub.seen.some((m) => m.ns === NS_RECEIVER && m.payload.type === "LAUNCH" && m.payload.appId === APP)).toBe(true);
    const sent = recipes();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.payload).toMatchObject({ type: "recipe", resume: false, recipe: { v: 1, id: "boeuf-carottes-mijote", title: "Bœuf carottes" } });
    const meta = (sent[0]!.payload.recipe as { meta: string }).meta;
    expect(meta).toContain(`${adults} adulte`);
    if (babies) expect(meta).toContain("bébé");
  });

  it("les quantités suivent les portions demandées", async () => {
    const { cast, recipes } = await setup();
    await cast.show({ recipeId: "boeuf-carottes-mijote", adults: 4, babies: 0 });
    await cast.show({ recipeId: "boeuf-carottes-mijote", adults: 2, babies: 0 });
    const qty = recipes().map((m) => (m.payload.recipe as { ingredients: { qty: string }[] }).ingredients[0]?.qty);
    expect(qty).toEqual(["900 g", "450 g"]);
  });

  it("sans recette demandée : reprend celle de l'écran, et le récepteur reprend à sa page", async () => {
    const { cast, recipes } = await setup();
    await expect(cast.show({})).rejects.toThrow(/Aucune recette à reprendre/);
    await cast.show({ recipeId: "boeuf-carottes-mijote" });
    await cast.show({});
    expect(recipes().map((m) => [m.payload.resume, (m.payload.recipe as { id: string }).id])).toEqual([
      [false, "boeuf-carottes-mijote"],
      [true, "boeuf-carottes-mijote"],
    ]);
  });

  it("recette inconnue : rien n'est envoyé au Hub", async () => {
    const { cast, hub } = await setup();
    await expect(cast.show({ recipeId: "n-existe-pas" })).rejects.toMatchObject({ status: 404 });
    expect(hub.seen).toHaveLength(0);
  });

  it("refus du Hub, silence, pas d'accusé : l'erreur dit quoi, et reste dans l'état", async () => {
    const refused = await setup({ launch: "refuse" });
    await expect(refused.cast.show({ recipeId: "boeuf-carottes-mijote" })).rejects.toThrow(/refuse l'appli \(NOT_FOUND\)/);
    expect(refused.cast.status().lastError).toMatch(/NOT_FOUND/);
    expect(refused.cast.status().current).toBeUndefined();

    const silent = await setup({ launch: "silent" });
    await expect(silent.cast.show({ recipeId: "boeuf-carottes-mijote" })).rejects.toThrow(/ne démarre pas/);

    const mute = await setup({ ack: false });
    await expect(mute.cast.show({ recipeId: "boeuf-carottes-mijote" })).rejects.toThrow(/pas été confirmée/);
    expect(mute.cast.status().current).toBeUndefined();
  });

  it("Hub éteint : message clair, et la commande suivante repart", async () => {
    const household = new Household(openDb(":memory:"), () => new Date("2026-10-05T09:00:00"));
    const dead = startCast(household, { host: "192.0.2.1", appId: APP }, { connect: () => Promise.reject(new Error("ECONNREFUSED")), timeouts: FAST });
    await expect(dead.show({ recipeId: "boeuf-carottes-mijote" })).rejects.toThrow(/Hub injoignable sur 192.0.2.1 \(ECONNREFUSED\)/);
    expect(dead.status().busy).toBe(false);
  });

  it("deux commandes en même temps passent l'une après l'autre", async () => {
    const { cast, recipes } = await setup();
    await Promise.all([cast.show({ recipeId: "boeuf-carottes-mijote" }), cast.show({ recipeId: "veloute-potimarron-lentilles-corail" })]);
    expect(recipes().map((m) => (m.payload.recipe as { id: string }).id)).toEqual(["boeuf-carottes-mijote", "veloute-potimarron-lentilles-corail"]);
    expect(cast.status().current?.recipeId).toBe("veloute-potimarron-lentilles-corail");
  });
});

describe("cast : arrêter", () => {
  it("ferme l'appli si elle tourne, ne fait rien sinon", async () => {
    const running = await setup({ running: true });
    await running.cast.stop();
    expect(running.hub.isRunning()).toBe(false);
    expect(running.hub.seen.some((m) => m.payload.type === "STOP")).toBe(true);

    const idle = await setup();
    await idle.cast.stop();
    expect(idle.hub.seen.some((m) => m.payload.type === "STOP")).toBe(false);
  });
});

describe("cast : routes des téléphones", () => {
  async function api(service?: CastService) {
    const db = openDb(":memory:");
    const household = new Household(db, () => new Date("2026-10-05T09:00:00"));
    const config: Config = loadConfig({ HOUSEHOLD_PASSPHRASE: "soupe-de-courge" });
    const app = createApp({ db, household, config, services: { cast: service } });
    const join = await app.request("/api/auth/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase: "soupe-de-courge", displayName: "Test" }) });
    const cookie = join.headers.get("set-cookie")!.split(";")[0]!;
    const call = (path: string, init: RequestInit = {}) => app.request(path, { ...init, headers: { "Content-Type": "application/json", cookie, ...(init.headers as Record<string, string>) } });
    return { app, call };
  }

  it("demandent la session du foyer", async () => {
    const { app } = await api();
    expect((await app.request("/api/cast/status")).status).toBe(401);
    expect((await app.request("/api/cast/show", { method: "POST", body: "{}" })).status).toBe(401);
  });

  it("sans Hub configuré : désactivé, et /api/health le dit", async () => {
    const { app, call } = await api();
    expect(await body(call("/api/cast/status"))).toEqual({ enabled: false });
    expect((await body(app.request("/api/health"))).cast).toBe(false);
  });

  it("show / status / stop avec un Hub", async () => {
    const { hub, cast } = await setup();
    const { app, call } = await api(cast);
    expect((await body(app.request("/api/health"))).cast).toBe(true);
    const shown = await call("/api/cast/show", { method: "POST", body: JSON.stringify({ recipeId: "boeuf-carottes-mijote", adults: 2, babies: 1 }) });
    expect(shown.status).toBe(200);
    expect(await shown.json()).toMatchObject({ enabled: true, current: { recipeId: "boeuf-carottes-mijote" } });
    expect(await body(call("/api/cast/status"))).toMatchObject({ host: "127.0.0.1", busy: false, current: { title: "Bœuf carottes" } });
    expect((await call("/api/cast/stop", { method: "POST" })).status).toBe(200);
    expect(hub.isRunning()).toBe(false);
  });

  it("requêtes invalides et erreurs du Hub : codes et messages utiles", async () => {
    const { cast } = await setup({ launch: "refuse" });
    const { call } = await api(cast);
    const post = (b: unknown) => call("/api/cast/show", { method: "POST", body: JSON.stringify(b) });
    expect((await post({ recipeId: 12 })).status).toBe(400);
    expect((await post({ recipeId: "boeuf-carottes-mijote", adults: -1 })).status).toBe(400);
    expect((await post({ recipeId: "boeuf-carottes-mijote", babies: 9 })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ recipeId: "n-existe-pas" })).status).toBe(404);
    const refused = await post({ recipeId: "boeuf-carottes-mijote" });
    expect(refused.status).toBe(502);
    expect(((await refused.json()) as { error: string }).error).toMatch(/NOT_FOUND/);
  });
});

describe("cast : routes de Home Assistant", () => {
  const TOKEN = "0123456789abcdef0123456789abcdef-cuisine";
  const WEEK = "2026-10-05";

  async function hook({ withToken = true, secure = false, at = "2026-10-07T18:30:00" } = {}) {
    const hub = await setup();
    hub.household.apply([{ actionId: "g1", action: { type: "generate", weekStart: WEEK, seed: 7 } }], "phone");
    const routes = castHookRoutes({ household: hub.household, service: hub.cast, token: withToken ? TOKEN : undefined, secure, now: () => new Date(at) });
    const call = (path: string, init: RequestInit = {}, auth: string | null = `Bearer ${TOKEN}`) =>
      routes.request(path, { ...init, headers: { ...(auth ? { authorization: auth } : {}), "Content-Type": "application/json", ...(init.headers as Record<string, string>) } });
    const show = (b: unknown, auth?: string | null) => call("/show", { method: "POST", body: JSON.stringify(b) }, auth);
    const shown = () => hub.recipes().map((m) => (m.payload.recipe as { id: string }).id);
    return { ...hub, call, show, shown, isRunning: hub.hub.isRunning };
  }

  it("CAST_TOKEN facultatif, 32 caractères au moins", () => {
    const env = { HOUSEHOLD_PASSPHRASE: "soupe-de-courge" };
    expect(loadConfig(env).castToken).toBeUndefined();
    expect(() => loadConfig({ ...env, CAST_TOKEN: "x".repeat(31) })).toThrow(/CAST_TOKEN/);
    expect(loadConfig({ ...env, CAST_TOKEN: ` ${TOKEN}\n` }).castToken).toBe(TOKEN);
  });

  it("le jeton, dans l'en-tête Authorization seulement ; sans jeton configuré : introuvable", async () => {
    const { call, show, shown } = await hook();
    expect((await show({ q: "boeuf carottes" }, null)).status).toBe(401);
    expect((await show({ q: "boeuf carottes" }, "Bearer faux-jeton")).status).toBe(401);
    expect((await show({ q: "boeuf carottes" }, `Basic ${TOKEN}`)).status).toBe(401);
    expect((await call(`/status?token=${TOKEN}`, {}, null)).status).toBe(401);
    expect(shown()).toEqual([]);
    expect((await (await hook({ withToken: false })).call("/status")).status).toBe(404);
    expect((await (await hook({ secure: true })).call("/status")).status).toBe(403);
  });

  it("par son nom, comme on le dit à voix haute", async () => {
    const { show, shown } = await hook();
    const r = await show({ q: "la recette de bœuf aux carotte" });
    expect(r.status).toBe(200);
    expect(await body(r)).toMatchObject({ shown: "Bœuf carottes", current: { recipeId: "boeuf-carottes-mijote" } });
    expect(shown()).toEqual(["boeuf-carottes-mijote"]);
  });

  it("nom inconnu : 404 ; ambigu : 409 avec les candidates, et rien n'est affiché", async () => {
    const { household, show, shown } = await hook();
    const boeuf = RECIPES.find((r) => r.id === "boeuf-carottes-mijote")!;
    for (const [id, title] of [["soupe-verte", "Soupe verte"], ["soupe-rouge", "Soupe rouge"]] as const) {
      household.apply([{ actionId: `r-${id}`, action: { type: "addRecipe", recipe: { ...boeuf, id, slug: id, title, source: "manual" } } }], "phone");
    }
    expect((await show({ q: "lasagnes à la fraise" })).status).toBe(404);
    const ambiguous = await show({ q: "soupe" });
    expect(ambiguous.status).toBe(409);
    expect((await body(ambiguous)).candidates).toEqual(["Soupe rouge", "Soupe verte"]);
    expect(shown()).toEqual([]);
    // Une recette ajoutée par le foyer se retrouve comme les autres.
    expect((await show({ q: "soupe verte" })).status).toBe(200);
    expect(shown()).toEqual(["soupe-verte"]);
  });

  it("le repas prévu : « dinner » ce soir, « now » selon l'heure", async () => {
    const evening = await hook();
    const state = evening.household.snapshot().state;
    const dinner = plannedRecipeId(state, "dinner", new Date("2026-10-07T18:30:00"))!;
    const lunch = plannedRecipeId(state, "lunch", new Date("2026-10-07T12:00:00"))!;
    expect(dinner).toBeTruthy();
    expect(lunch).toBeTruthy();
    expect((await evening.show({ meal: "dinner" })).status).toBe(200);
    expect((await evening.show({ meal: "now" })).status).toBe(200); // 18 h 30 : le soir
    expect(evening.shown()).toEqual([dinner, dinner]);

    const noon = await hook({ at: "2026-10-07T12:00:00" });
    await noon.show({ meal: "now" });
    expect(noon.shown()).toEqual([lunch]);
  });

  it("rien de prévu (autre semaine) : 404 ; créneau inconnu : 400", async () => {
    const { show } = await hook({ at: "2026-11-18T18:30:00" });
    expect((await show({ meal: "dinner" })).status).toBe(404);
    expect((await show({ meal: "goûter" })).status).toBe(400);
  });

  it("sans rien : reprend la recette de l'écran ; recipeId direct ; une seule désignation à la fois", async () => {
    const { show, shown } = await hook();
    expect((await show({})).status).toBe(400);
    await show({ recipeId: "boeuf-carottes-mijote", adults: 2, babies: 0 });
    expect((await show({})).status).toBe(200);
    expect(shown()).toEqual(["boeuf-carottes-mijote", "boeuf-carottes-mijote"]);
    expect((await show({ q: "boeuf", meal: "dinner" })).status).toBe(400);
    expect((await show({ q: 12 })).status).toBe(400);
    expect((await show({ recipeId: "boeuf-carottes-mijote", adults: -1 })).status).toBe(400);
  });

  it("stop ferme l'appli, status dit ce qui est à l'écran", async () => {
    const { call, show, isRunning } = await hook();
    await show({ recipeId: "boeuf-carottes-mijote" });
    expect(isRunning()).toBe(true);
    expect(await body(call("/status"))).toMatchObject({ enabled: true, current: { title: "Bœuf carottes" } });
    expect((await call("/stop", { method: "POST" })).status).toBe(200);
    expect(isRunning()).toBe(false);
  });

  it("branchée dans l'appli : avant la session des téléphones, avec le jeton seulement", async () => {
    const { cast, household } = await setup();
    const db = openDb(":memory:");
    const config = loadConfig({ HOUSEHOLD_PASSPHRASE: "soupe-de-courge", CAST_TOKEN: TOKEN });
    const app = createApp({ db, household, config, services: { cast } });
    expect((await app.request("/api/cast-hook/status", { headers: { authorization: `Bearer ${TOKEN}` } })).status).toBe(200);
    expect((await app.request("/api/cast-hook/status")).status).toBe(401);
    // Le jeton n'ouvre rien d'autre.
    expect((await app.request("/api/state", { headers: { authorization: `Bearer ${TOKEN}` } })).status).toBe(401);
  });
});
