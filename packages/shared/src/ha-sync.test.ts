import { describe, expect, it } from "vitest";
import { markerOf, reconcileTodo, type SyncLocalItem, type SyncMemory, type TodoItem } from "./ha-sync";

const W = "2026-10-05";
const item = (id: string, line: string, over: Partial<SyncLocalItem> = {}): SyncLocalItem => ({ id: `${W}:${id}`, line, checked: false, haveAlready: false, ...over });
const todo = (uid: string, summary: string, over: Partial<TodoItem> = {}): TodoItem => ({ uid, summary, status: "needs_action", ...over });

/** Applique un plan comme le ferait l'appli, pour vérifier qu'une 2e synchro ne fait plus rien. */
function apply(local: SyncLocalItem[], remote: TodoItem[], plan: ReturnType<typeof reconcileTodo>) {
  let r = [...remote];
  let l = [...local];
  let n = 0;
  const synced = { ...plan.synced };
  for (const op of plan.remote) {
    if (op.op === "add") r.push({ uid: `new${n++}`, summary: op.summary, status: op.status, description: op.description });
    if (op.op === "remove") r = r.filter((t) => t.uid !== op.uid);
    if (op.op === "update") r = r.map((t) => (t.uid === op.uid ? { ...t, status: op.status ?? t.status, summary: op.rename ?? t.summary } : t));
  }
  for (const c of plan.local) {
    if (c.kind === "check") l = l.map((x) => (x.id === c.itemId ? { ...x, checked: c.checked } : x));
    if (c.kind === "remove") l = l.filter((x) => x.id !== c.itemId);
    if (c.kind === "have") l = l.map((x) => (x.id === c.itemId ? { ...x, haveAlready: true } : x));
    if (c.kind === "create") {
      const id = `${W}:manual:${n++}`;
      l.push({ id, line: c.summary, checked: c.done, haveAlready: false, manual: true });
      synced[id] = { uid: c.uid, status: "needs_action", summary: c.summary };
    }
  }
  return { local: l, remote: r, memory: { weekStart: W, lastSync: "2026-10-05T10:00:00Z", synced } satisfies SyncMemory };
}

describe("synchro Home Assistant", () => {
  it("première synchro : envoie la liste, reprend ce qui a été dicté", () => {
    const local = [item("carotte", "carottes · 600 g"), item("lait", "lait · 1 L", { checked: true })];
    const remote = [todo("u1", "Bananes")];
    const plan = reconcileTodo({ weekStart: W, local, remote });
    expect(plan.remote).toEqual([
      { op: "add", itemId: `${W}:carotte`, summary: "carottes · 600 g", status: "needs_action", description: markerOf(`${W}:carotte`) },
      { op: "add", itemId: `${W}:lait`, summary: "lait · 1 L", status: "completed", description: markerOf(`${W}:lait`) },
    ]);
    expect(plan.local).toEqual([{ kind: "create", summary: "Bananes", uid: "u1", done: false }]);
  });

  it("une deuxième synchro ne fait plus rien", () => {
    const local = [item("carotte", "carottes · 600 g"), item("lait", "lait · 1 L", { checked: true })];
    const first = apply(local, [todo("u1", "Bananes")], reconcileTodo({ weekStart: W, local, remote: [todo("u1", "Bananes")] }));
    const second = reconcileTodo({ weekStart: W, local: first.local, remote: first.remote, memory: first.memory });
    expect(second.remote).toEqual([]);
    expect(second.local).toEqual([]);
    const third = apply(first.local, first.remote, second);
    expect(reconcileTodo({ weekStart: W, local: third.local, remote: third.remote, memory: third.memory })).toMatchObject({ remote: [], local: [] });
  });

  const synced = (over: Partial<SyncMemory["synced"]> = {}): SyncMemory => ({
    weekStart: W,
    lastSync: "2026-10-05T10:00:00Z",
    synced: { [`${W}:carotte`]: { uid: "c", status: "needs_action", summary: "carottes · 600 g" }, ...over },
  });

  it("coché dans HA (ou à la voix) → coché dans Mijoté", () => {
    const plan = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 600 g")], remote: [todo("c", "carottes · 600 g", { status: "completed" })], memory: synced() });
    expect(plan.local).toEqual([{ kind: "check", itemId: `${W}:carotte`, checked: true }]);
    expect(plan.remote).toEqual([]);
  });

  it("coché dans Mijoté → terminé dans HA", () => {
    const plan = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 600 g", { checked: true })], remote: [todo("c", "carottes · 600 g")], memory: synced() });
    expect(plan.remote).toEqual([{ op: "update", uid: "c", status: "completed" }]);
    expect(plan.local).toEqual([]);
  });

  it("changé des deux côtés : le plus récent gagne", () => {
    const remote = [todo("c", "carottes · 600 g", { status: "completed" })];
    const mem = synced({ [`${W}:carotte`]: { uid: "c", status: "needs_action", summary: "carottes · 600 g" } });
    // Côté local, rien n'a bougé depuis la synchro : HA gagne.
    expect(reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 600 g", { checked: false })], remote, memory: mem }).local).toEqual([{ kind: "check", itemId: `${W}:carotte`, checked: true }]);
  });

  it("supprimé dans HA : article à la main supprimé, article de recette « J'ai déjà »", () => {
    const local = [item("carotte", "carottes · 600 g"), item("manual:x", "piles", { manual: true })];
    const mem = synced({ [`${W}:manual:x`]: { uid: "p", status: "needs_action", summary: "piles" } });
    const plan = reconcileTodo({ weekStart: W, local, remote: [], memory: mem });
    expect(plan.local).toEqual([
      { kind: "have", itemId: `${W}:carotte` },
      { kind: "remove", itemId: `${W}:manual:x` },
    ]);
  });

  it("supprimé ou « J'ai déjà » dans Mijoté → retiré de HA", () => {
    const gone = reconcileTodo({ weekStart: W, local: [], remote: [todo("c", "carottes · 600 g")], memory: synced() });
    expect(gone.remote).toEqual([{ op: "remove", uid: "c" }]);
    const have = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 600 g", { haveAlready: true })], remote: [todo("c", "carottes · 600 g")], memory: synced() });
    expect(have.remote).toEqual([{ op: "remove", uid: "c" }]);
  });

  it("quantité recalculée : renomme dans HA, sauf si renommé là-bas", () => {
    const plan = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 800 g")], remote: [todo("c", "carottes · 600 g")], memory: synced() });
    expect(plan.remote).toEqual([{ op: "update", uid: "c", rename: "carottes · 800 g" }]);
    const renamed = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 800 g")], remote: [todo("c", "carottes bio")], memory: synced() });
    expect(renamed.remote).toEqual([]);
  });

  it("un article HA identique (liste sans description) est reconnu par son texte", () => {
    const plan = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 600 g")], remote: [todo("z", "Carottes · 600 g")] });
    expect(plan.remote).toEqual([]);
    expect(plan.local).toEqual([]);
    expect(plan.synced[`${W}:carotte`].uid).toBe("z");
  });

  it("l'article d'un autre téléphone n'est jamais supprimé, il est repris", () => {
    const plan = reconcileTodo({ weekStart: W, local: [], remote: [todo("o", "lait", { description: markerOf(`${W}:manual:lait:abc`) })], memory: synced({}) });
    expect(plan.remote.filter((o) => o.op === "remove" && o.uid === "o")).toEqual([]);
    expect(plan.local).toContainEqual({ kind: "create", summary: "lait", uid: "o", done: false });
  });

  it("nouvelle semaine : retire ce qui était coché, reprend le reste à acheter", () => {
    const old: SyncMemory = { weekStart: "2026-09-28", synced: { "2026-09-28:pain": { uid: "a", status: "completed", summary: "pain" }, "2026-09-28:riz": { uid: "b", status: "needs_action", summary: "riz" } } };
    const remote = [todo("a", "pain", { status: "completed" }), todo("b", "riz")];
    const plan = reconcileTodo({ weekStart: W, local: [item("carotte", "carottes · 600 g")], remote, memory: old });
    expect(plan.remote).toContainEqual({ op: "remove", uid: "a" });
    expect(plan.local).toContainEqual({ kind: "create", summary: "riz", uid: "b", done: false });
    expect(plan.remote).toContainEqual(expect.objectContaining({ op: "add", itemId: `${W}:carotte` }));
  });
});
