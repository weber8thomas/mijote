import { ingredientsOfState, sortItems, type Action } from "@mijote/shared";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { loadConfig, type Config } from "./config";
import { openDb } from "./db";
import { Household } from "./household";
import { MAX_ITEMS, NAME_MAX, SUB_MAX, watchKey, watchRoutes, watchText } from "./watch";

/** Corps JSON d'une réponse (forme libre dans les tests). */
// oxlint-disable-next-line no-explicit-any
const body = async (r: Response | Promise<Response>): Promise<any> => (await r).json();

const TOKEN = "0123456789abcdef0123456789abcdef-montre";
const WEEK = "2026-10-05";
const NEXT = "2026-10-12";
type Row = [string, string, string, boolean, number, string];

/** La montre seule, avec une horloge réglable (mercredi par défaut). */
function setup({ off = false, secure = false } = {}) {
  const household = new Household(openDb(":memory:"), () => new Date("2026-10-05T09:00:00"));
  const clock = { now: new Date("2026-10-07T10:00:00") };
  const kick = vi.fn();
  const watch = watchRoutes({ household, token: off ? undefined : TOKEN, secure, kick, now: () => clock.now });
  const call = (path: string, init: RequestInit = {}, auth: string | null = `Bearer ${TOKEN}`) =>
    watch.request(path, { ...init, headers: { ...(auth ? { authorization: auth } : {}), "Content-Type": "application/json", ...(init.headers as Record<string, string>) } });
  const list = async () => (await body(call("/list"))) as { v: number; w: string; left: number; more: number; i: Row[] };
  const check = (k: string, c: boolean, a: string, w = WEEK) => call("/check", { method: "POST", body: JSON.stringify({ k, c, w, a }) });
  const items = (w = WEEK) => household.snapshot().state.shopping[w];
  const byKey = (k: string, w = WEEK) => items(w).find((i) => watchKey(i.id) === k)!;
  return { household, clock, kick, call, list, check, items, byKey };
}

describe("montre : réglage", () => {
  it("WATCH_TOKEN facultatif, 32 caractères au moins", () => {
    const env = { HOUSEHOLD_PASSPHRASE: "soupe-de-courge" };
    expect(loadConfig(env).watchToken).toBeUndefined();
    expect(loadConfig({ ...env, WATCH_TOKEN: "  " }).watchToken).toBeUndefined();
    expect(() => loadConfig({ ...env, WATCH_TOKEN: "x".repeat(31) })).toThrow(/WATCH_TOKEN/);
    expect(loadConfig({ ...env, WATCH_TOKEN: ` ${TOKEN}\n` }).watchToken).toBe(TOKEN);
  });
});

describe("montre : accès", () => {
  it("le jeton, dans l'en-tête Authorization seulement", async () => {
    const { call } = setup();
    expect((await call("/list", {}, null)).status).toBe(401);
    expect((await call("/list", {}, "Bearer faux-jeton")).status).toBe(401);
    expect((await call("/list", {}, `Basic ${TOKEN}`)).status).toBe(401);
    expect((await call(`/list?token=${TOKEN}`, {}, null)).status).toBe(401);
    expect((await call("/list", { headers: { cookie: `mijote_session=${TOKEN}` } }, null)).status).toBe(401);
    const ok = await call("/list");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(ok.headers.get("set-cookie")).toBeNull();
    expect((await call("/nope")).status).toBe(404);
  });

  it("sans WATCH_TOKEN, la montre n'existe pas (404)", async () => {
    const { call } = setup({ off: true });
    expect((await call("/list")).status).toBe(404);
    expect((await call("/check", { method: "POST", body: "{}" })).status).toBe(404);
  });

  it("https seulement quand l'adresse publique est en https", async () => {
    const { call } = setup({ secure: true });
    expect((await call("/list")).status).toBe(403);
    expect((await call("/list", { headers: { "x-forwarded-proto": "http" } })).status).toBe(403);
    expect((await call("/list", { headers: { "x-forwarded-proto": "https" } })).status).toBe(200);
  });

  it("10 jetons refusés : l'adresse attend un quart d'heure, les autres non", async () => {
    const { call } = setup();
    const from = (ip: string) => ({ headers: { "x-forwarded-for": ip } });
    for (let n = 0; n < 10; n++) expect((await call("/list", from("1.2.3.4"), "Bearer faux")).status).toBe(401);
    expect((await call("/list", from("1.2.3.4"))).status).toBe(429);
    expect((await call("/list", from("5.6.7.8"))).status).toBe(200);
  });

  it("au plus 120 requêtes par minute et par adresse", async () => {
    const { call } = setup();
    let last = 0;
    for (let n = 0; n < 121; n++) last = (await call("/list")).status;
    expect(last).toBe(429);
  });

  it("dans l'API du foyer : le jeton n'ouvre que /api/watch, la session n'ouvre pas la montre", async () => {
    const db = openDb(":memory:");
    const household = new Household(db, () => new Date());
    const config: Config = { port: 0, dataDir: ":memory:", passphrase: "soupe-de-courge", watchToken: TOKEN };
    const app = createApp({ db, household, config });
    const bearer = { authorization: `Bearer ${TOKEN}` };
    expect((await app.request("/api/watch/list", { headers: bearer })).status).toBe(200);
    expect((await app.request("/api/watch/nope", { headers: bearer })).status).toBe(404);
    expect((await app.request("/api/state", { headers: bearer })).status).toBe(401);
    expect((await app.request("/api/actions?since=0", { headers: bearer })).status).toBe(401);
    // Un téléphone du foyer (cookie de session) n'a pas accès aux routes de la montre.
    const join = await app.request("/api/auth/join", { method: "POST", body: JSON.stringify({ passphrase: "soupe-de-courge" }), headers: { "Content-Type": "application/json" } });
    const cookie = join.headers.get("set-cookie")!.split(";")[0];
    expect((await app.request("/api/watch/list", { headers: { cookie } })).status).toBe(401);
    // Sans WATCH_TOKEN : 404, pas la garde de session.
    const off = createApp({ db, household, config: { ...config, watchToken: undefined } });
    expect((await off.request("/api/watch/list", { headers: bearer })).status).toBe(404);
  });
});

describe("montre : statut", () => {
  it("serveur en ligne, version, Home Assistant, ce qui reste", async () => {
    const { call, list } = setup();
    const res = await call("/status");
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ver: unknown };
    const l = await list();
    expect(data).toMatchObject({ v: 1, ok: true, ha: false, left: l.left, total: l.i.length, at: new Date("2026-10-07T10:00:00").toISOString() });
    expect(typeof data.ver).toBe("number");
    expect((await call("/status", {}, null)).status).toBe(401);
  });
});

describe("montre : liste", () => {
  it("ce qui reste, par rayon, puis ce qui est coché ; « déjà à la maison » exclu", async () => {
    const { household, list, check, items } = setup();
    const first = await list();
    expect(first).toMatchObject({ v: 1, w: WEEK, more: 0 });
    expect(first.i.length).toBe(items().filter((i) => !i.haveAlready).length);
    expect(first.left).toBe(first.i.length);
    for (const row of first.i) {
      expect(row).toHaveLength(6);
      expect(typeof row[0]).toBe("string");
      expect(row[1].length).toBeLessThanOrEqual(NAME_MAX);
      expect(row[2].length).toBeLessThanOrEqual(SUB_MAX);
      expect(row[3]).toBe(false);
      expect(Number.isFinite(row[4]) && row[4] >= 0).toBe(true);
      expect(row[5].length).toBeLessThanOrEqual(SUB_MAX);
    }
    const state = household.snapshot().state;
    expect(first.i.map((r) => r[0])).toEqual(sortItems(items(), ingredientsOfState(state).byId).map((i) => watchKey(i.id)));

    // Un article coché passe en bas ; un article « déjà à la maison » disparaît.
    const [a, b] = first.i;
    expect((await check(a[0], true, "chk-0001")).status).toBe(200);
    const have = items().find((i) => watchKey(i.id) === b[0])!;
    household.apply([{ actionId: "h1", action: { type: "setHave", weekStart: WEEK, itemId: have.id, have: true, at: "2026-10-07T10:00:00.000Z" } }], "phone");
    const after = await list();
    expect(after.i.at(-1)).toEqual([a[0], a[1], a[2], true, a[4], a[5]]);
    expect(after.i.some((r) => r[0] === b[0])).toBe(false);
    expect(after.left).toBe(first.left - 2);
  });

  it("nombre de pièces seulement pour les articles comptés : 0 au poids, au volume ou sans quantité", async () => {
    const { household, list, items } = setup();
    const byUnit = (u: string) => items().filter((i) => !i.haveAlready && i.qty && i.unit === u);
    const key = new Map((await list()).i.map((r) => [r[0], r] as const));
    const pieces = byUnit("piece");
    const weighed = items().filter((i) => !i.haveAlready && (!i.qty || i.unit !== "piece"));
    expect(pieces.length).toBeGreaterThan(0);
    expect(weighed.length).toBeGreaterThan(0);
    for (const it of pieces) expect(key.get(watchKey(it.id))![4]).toBe(Math.round(it.qty * 2) / 2);
    for (const it of weighed) expect(key.get(watchKey(it.id))![4]).toBe(0);
    expect(household).toBeDefined();
  });

  it(`coupée à ${MAX_ITEMS} articles, sous 8 Ko`, async () => {
    const { household, call } = setup();
    const text = Array.from({ length: 100 }, (_, n) => `produit numéro ${n} au nom vraiment très très long`).join(", ");
    household.apply([{ actionId: "big", action: { type: "addToShopping", weekStart: WEEK, text, at: "2026-10-07T10:00:00.000Z" } }], "phone");
    const res = await call("/list");
    const raw = await res.text();
    const data = JSON.parse(raw) as { i: Row[]; more: number; left: number };
    expect(data.i).toHaveLength(MAX_ITEMS);
    expect(data.more).toBe(data.left - MAX_ITEMS);
    expect(Buffer.byteLength(raw)).toBeLessThan(8192);
    // Coupé à NAME_MAX caractères, sans espace au bout.
    expect(data.i.find((r) => r[1].startsWith("Produit numéro 0 "))?.[1]).toBe("Produit numéro 0 au nom");
  });

  it("des libellés que la montre sait afficher", () => {
    expect(watchText("bœuf haché 5 %", 24)).toBe("Boeuf haché 5 %");
    expect(watchText("Œufs", 24)).toBe("Oeufs");
    expect(watchText("🥕 carottes  nouvelles", 24)).toBe("Carottes nouvelles");
    expect(watchText("1 200 g · Légumes", 22)).toBe("1 200 g · Légumes");
    expect(watchText("pâtes ā l’ail", 24)).toBe("Pâtes a l'ail");
    // Trop long : sans la note entre parenthèses, puis coupé après un mot entier.
    expect(watchText("petites pâtes (coquillettes, orzo)", 24)).toBe("Petites pâtes");
    expect(watchText("thon au naturel (boîte)", 24)).toBe("Thon au naturel (boîte)");
    expect(watchText("nouilles chinoises aux œufs", 24)).toBe("Nouilles chinoises aux");
    expect(watchText("19 ml · Huiles & condiments", 22)).toBe("19 ml · Huiles");
    expect(watchText("anticonstitutionnellement", 10)).toBe("Anticonsti");
  });
});

describe("montre : cocher", () => {
  it("coche puis décoche, au nom de « Montre », et prévient Home Assistant", async () => {
    const { list, check, byKey, kick, clock } = setup();
    const { i, left } = await list();
    const k = i[0][0];
    expect(await body(check(k, true, "chk-0001"))).toEqual({ ok: true, k, c: true, left: left - 1 });
    expect(byKey(k)).toMatchObject({ checked: true, checkedBy: "Montre", updatedAt: clock.now.toISOString() });
    expect(kick).toHaveBeenCalledTimes(1);
    clock.now = new Date("2026-10-07T10:05:00");
    expect(await body(check(k, false, "chk-0002"))).toEqual({ ok: true, k, c: false, left });
    expect(byKey(k)).toMatchObject({ checked: false, updatedAt: clock.now.toISOString() });
    expect(byKey(k).checkedBy).toBeUndefined();
    expect(kick).toHaveBeenCalledTimes(2);
  });

  it("renvoyer la même coche ne fait rien (et redonne l'état réel)", async () => {
    const { household, list, check, kick } = setup();
    const k = (await list()).i[0][0];
    await check(k, true, "chk-0001");
    const version = household.snapshot().version;
    expect(await body(check(k, true, "chk-0001"))).toMatchObject({ ok: true, c: true });
    expect(household.snapshot().version).toBe(version);
    expect(kick).toHaveBeenCalledTimes(1);
    // Décoché ailleurs entre-temps : le renvoi de la vieille coche ne la réapplique pas.
    await check(k, false, "chk-0002");
    expect(await body(check(k, true, "chk-0001"))).toMatchObject({ ok: true, c: false });
  });

  it("requête invalide : 400 ; article inconnu : 409", async () => {
    const { call, list, check } = setup();
    const k = (await list()).i[0][0];
    const post = (b: unknown) => call("/check", { method: "POST", body: typeof b === "string" ? b : JSON.stringify(b) });
    expect((await post("pas du json")).status).toBe(400);
    expect((await post({ k, c: true, w: WEEK })).status).toBe(400);
    expect((await post({ k, c: "oui", w: WEEK, a: "chk-0001" })).status).toBe(400);
    expect((await post({ k, c: true, w: WEEK, a: "court" })).status).toBe(400);
    expect((await post({ k, c: true, w: WEEK, a: "avec des espaces" })).status).toBe(400);
    expect((await check("inconnu", true, "chk-0001")).status).toBe(409);
    // La montre peut transmettre la coche en 1/0 ou en texte.
    expect(await body(post({ k, c: 1, w: WEEK, a: "chk-0002" }))).toMatchObject({ ok: true, c: true });
    expect(await body(post({ k, c: "false", w: WEEK, a: "chk-0003" }))).toMatchObject({ ok: true, c: false });
  });

  it("les téléphones reçoivent la coche en direct", async () => {
    const { household, list, check, byKey } = setup();
    const spy = vi.fn();
    household.subscribe(spy);
    const k = (await list()).i[0][0];
    await check(k, true, "chk-0001");
    expect(spy).toHaveBeenCalledWith([expect.objectContaining({ clientId: "watch", actionId: "watch:chk-0001", action: expect.objectContaining({ type: "setChecked", itemId: byKey(k).id, checked: true, by: "Montre" }) })]);
  });

  it("bascule le vendredi vers la semaine suivante validée ; une coche de l'ancienne semaine → 409", async () => {
    const { household, clock, list, check, items } = setup();
    // Semaine suivante préparée, choisie et validée (comme sur un téléphone).
    const log: Action[] = [{ type: "generate", weekStart: NEXT, seed: 42 }];
    household.apply([{ actionId: "g", action: log[0] }], "phone");
    for (const e of household.snapshot().state.weeks[NEXT].entries.filter((x) => x.slot !== "dessert")) log.push({ type: "choose", weekStart: NEXT, entryId: e.id, recipeId: e.recipeId });
    log.push({ type: "validate", weekStart: NEXT, at: "2026-10-07T12:00:00.000Z" });
    household.apply(log.slice(1).map((action, n) => ({ actionId: `p${n}`, action })), "phone");

    clock.now = new Date("2026-10-08T20:00:00"); // jeudi soir
    const thursday = await list();
    expect(thursday.w).toBe(WEEK);
    clock.now = new Date("2026-10-09T10:00:00"); // vendredi
    const friday = await list();
    expect(friday.w).toBe(NEXT);
    expect(friday.i.length).toBe(items(NEXT).filter((i) => !i.haveAlready).length);
    expect(friday.i.length).toBeGreaterThan(0);

    const stale = await check(thursday.i[0][0], true, "chk-0001", WEEK);
    expect(stale.status).toBe(409);
    expect(await body(stale)).toMatchObject({ w: NEXT });
    expect((await check(friday.i[0][0], true, "chk-0002", NEXT)).status).toBe(200);
    expect(items(WEEK).some((i) => i.checked)).toBe(false);
  });
});
