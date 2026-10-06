import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { openDb } from "./db";
import { startHaSync } from "./ha";
import { Household } from "./household";
import { watchKey } from "./watch";

type Todo = { uid: string; summary: string; status: "needs_action" | "completed"; description?: string };

/** Faux Home Assistant : une liste « À faire » en mémoire. keep = liste Google Keep (pas de description). */
function fakeHa({ keep }: { keep: boolean }) {
  const todos: Todo[] = [];
  let n = 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    if (path === "/api/") return ok({ message: "API running." });
    if (path === "/api/services/todo/get_items") return ok({ service_response: { [body.entity_id]: { items: todos.map((t) => ({ ...t })) } } });
    if (path === "/api/services/todo/add_item") {
      // Le vrai HA renvoie 500 (ServiceValidationError non traduite par l'API REST) quand la liste ne gère pas les descriptions.
      if (keep && body.description) return new Response("description non gérée", { status: 500 });
      todos.push({ uid: `u${n++}`, summary: body.item, status: "needs_action", ...(body.description ? { description: body.description } : {}) });
    }
    if (path === "/api/services/todo/update_item") {
      const t = todos.find((x) => x.uid === body.item || x.summary === body.item);
      if (t) Object.assign(t, body.status ? { status: body.status } : {}, body.rename ? { summary: body.rename } : {});
    }
    if (path === "/api/services/todo/remove_item") for (const uid of body.item) todos.splice(todos.findIndex((x) => x.uid === uid), 1);
    return ok([]);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { todos, fetchMock };
}

afterEach(() => vi.unstubAllGlobals());

const NOW = new Date();

describe.each([
  { name: "liste HA locale (avec descriptions)", keep: false },
  { name: "liste Google Keep via HA (sans description)", keep: true },
])("synchro HA côté serveur : $name", ({ keep }) => {
  it("envoie la liste, reprend ce qui est dicté, suit les coches dans les deux sens", async () => {
    const { todos } = fakeHa({ keep });
    const household = new Household(openDb(":memory:"), () => NOW);
    const ha = startHaSync(household, { url: "http://ha.local:8123", token: "t", entity: "todo.courses", intervalMs: 60_000 }, { autoStart: false });
    todos.push({ uid: "voix", summary: "Lait d'avoine", status: "needs_action" });

    await ha.sync();
    const week = Object.keys(household.snapshot().state.shopping)[0];
    const items = () => household.snapshot().state.shopping[week];
    // Toute la liste est partie, le lait dicté est arrivé.
    expect(todos.length).toBe(items().length);
    const dictated = items().find((i) => i.id === `${week}:ha:voix`)!;
    expect(dictated).toBeTruthy();

    // Coché dans Keep (« j'ai pris le lait ») → coché dans Mijoté.
    todos.find((t) => t.uid === "voix")!.status = "completed";
    await ha.sync();
    expect(items().find((i) => i.id === dictated.id)?.checked).toBe(true);

    // Coché sur un téléphone → terminé dans HA.
    const first = items().find((i) => !i.checked && !i.manual)!;
    household.apply([{ actionId: "c1", action: { type: "setChecked", weekStart: week, itemId: first.id, checked: true, by: "Tom", at: new Date(Date.now() + 1000).toISOString() } }], "phone");
    await ha.sync();
    const remote = todos.filter((t) => t.status === "completed");
    expect(remote.length).toBe(2);

    // Une synchro de plus ne change rien.
    const before = JSON.stringify(todos);
    const version = household.snapshot().version;
    await ha.sync();
    expect(JSON.stringify(todos)).toBe(before);
    expect(household.snapshot().version).toBe(version);
    expect(ha.status().lastError).toBeUndefined();
  });
});

describe("montre Garmin", () => {
  it("une coche faite à la montre arrive dans la liste « À faire » de HA", async () => {
    const { todos } = fakeHa({ keep: false });
    const db = openDb(":memory:");
    const household = new Household(db, () => NOW);
    const ha = startHaSync(household, { url: "http://ha.local:8123", token: "t", entity: "todo.courses", intervalMs: 60_000 }, { autoStart: false });
    const token = "0123456789abcdef0123456789abcdef";
    const app = createApp({ db, household, config: { port: 0, dataDir: ":memory:", passphrase: "soupe-de-courge", watchToken: token }, services: { ha } });
    const headers = { authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    await ha.sync();

    const list = (await (await app.request("/api/watch/list", { headers })).json()) as { w: string; i: [string, string, string, boolean][] };
    const k = list.i[0][0];
    const item = household.snapshot().state.shopping[list.w].find((i) => watchKey(i.id) === k)!;
    // La coche doit être plus récente que la dernière synchro (horloge à la milliseconde).
    await new Promise((r) => setTimeout(r, 5));
    const res = await app.request("/api/watch/check", { method: "POST", headers, body: JSON.stringify({ k, c: true, w: list.w, a: "montre-0001" }) });
    expect(res.status).toBe(200);
    await ha.sync();
    expect(todos.find((t) => t.description?.includes(item.id))?.status).toBe("completed");
    expect(household.snapshot().state.shopping[list.w].find((i) => i.id === item.id)?.checked).toBe(true);
    ha.stop();
  });
});

describe("diagnostic", () => {
  it("dit si Home Assistant répond et combien d'articles a la liste", async () => {
    const { todos } = fakeHa({ keep: false });
    todos.push({ uid: "1", summary: "pain", status: "needs_action" });
    const ha = startHaSync(new Household(openDb(":memory:"), () => NOW), { url: "http://ha.local:8123", token: "t", entity: "todo.courses", intervalMs: 60_000 }, { autoStart: false });
    expect(await ha.check()).toMatchObject({ ok: true, entity: "todo.courses", items: 1 });
  });
});
