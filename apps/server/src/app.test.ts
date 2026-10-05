import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { Config } from "./config";
import { openDb } from "./db";
import { Household } from "./household";

/** Corps JSON d'une réponse (forme libre dans les tests). */
// oxlint-disable-next-line no-explicit-any
const body = async (r: Response | Promise<Response>): Promise<any> => (await r).json();

const config: Config = { port: 0, dataDir: ":memory:", passphrase: "soupe-de-courge" };

function setup() {
  const db = openDb(":memory:");
  const household = new Household(db, () => new Date("2026-10-05T09:00:00"));
  const app = createApp({ db, household, config });
  return { db, household, app };
}

async function join(app: ReturnType<typeof createApp>, name = "Tom") {
  const res = await app.request("/api/auth/join", { method: "POST", body: JSON.stringify({ passphrase: "soupe-de-courge", displayName: name }), headers: { "Content-Type": "application/json" } });
  const cookie = res.headers.get("set-cookie")!.split(";")[0];
  return { res, cookie };
}

describe("API du foyer", () => {
  it("santé publique, le reste demande la phrase secrète", async () => {
    const { app } = setup();
    expect((await app.request("/api/health")).status).toBe(200);
    expect((await app.request("/api/state")).status).toBe(401);
    const bad = await app.request("/api/auth/join", { method: "POST", body: JSON.stringify({ passphrase: "non" }), headers: { "Content-Type": "application/json" } });
    expect(bad.status).toBe(401);
    const { res, cookie } = await join(app);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    const state = await body(app.request("/api/state", { headers: { cookie } }));
    expect(state.version).toBe(0);
    expect(Object.keys(state.state.weeks)).toHaveLength(1);
  });

  it("applique les actions dans l'ordre, une seule fois chacune", async () => {
    const { app, household } = setup();
    const { cookie } = await join(app);
    const week = Object.keys(household.snapshot().state.weeks)[0];
    const item = household.snapshot().state.shopping[week][0];
    const send = (actions: unknown[]) => app.request("/api/actions", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ clientId: "phone-1", actions }) });
    const batch = [{ actionId: "a1", action: { type: "setChecked", weekStart: week, itemId: item.id, checked: true, by: "Tom", at: "2026-10-05T10:00:00.000Z" } }];
    expect(await body(send(batch))).toEqual({ version: 1, applied: 1 });
    // Renvoi après une coupure : sans effet.
    expect(await body(send(batch))).toEqual({ version: 1, applied: 0 });
    expect(household.snapshot().state.shopping[week][0].checked).toBe(true);
    expect((await send([{ actionId: "x", action: { type: "pirater" } }])).status).toBe(400);
    // Rattrapage d'un téléphone qui revient.
    const since = await body(app.request("/api/actions?since=0", { headers: { cookie } }));
    expect(since.actions.map((a: { actionId: string }) => a.actionId)).toEqual(["a1"]);
  });

  it("l'état survit à un redémarrage", async () => {
    const { db, app, household } = setup();
    const { cookie } = await join(app);
    const week = Object.keys(household.snapshot().state.weeks)[0];
    await app.request("/api/actions", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: "p", actions: [{ actionId: "b1", action: { type: "addToShopping", weekStart: week, text: "piles", at: "2026-10-05T10:00:00.000Z" } }] }),
    });
    const again = new Household(db);
    expect(again.snapshot().version).toBe(1);
    expect(again.snapshot().state.shopping[week].some((i) => i.label === "piles")).toBe(true);
  });

  it("membres du foyer : liste, renommer, retirer (la session ne marche plus)", async () => {
    const { app } = setup();
    const tom = await join(app, "Tom");
    await join(app, "Marie");
    const list = await body(app.request("/api/members", { headers: { cookie: tom.cookie } }));
    expect(list.members.map((m: { displayName: string }) => m.displayName).sort()).toEqual(["Marie", "Tom"]);
    const me = await body(app.request("/api/me", { headers: { cookie: tom.cookie } }));
    await app.request(`/api/members/${me.member.id}`, { method: "DELETE", headers: { cookie: tom.cookie } });
    expect((await app.request("/api/state", { headers: { cookie: tom.cookie } })).status).toBe(401);
  });

  it("limite les essais de phrase secrète", async () => {
    const { app } = setup();
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await app.request("/api/auth/join", { method: "POST", body: JSON.stringify({ passphrase: "faux" }), headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" } })).status;
    expect(last).toBe(429);
  });
});
