import { describe, expect, it } from "vitest";
import { applyAction, applyActionWithResult, initialHousehold, pickHousehold, shoppingWeekOf, withShopping, type Action, type HouseholdState } from "./state";

const NOW = new Date("2026-10-05T09:00:00");
const W = "2026-10-12";
const at = (min: number) => new Date(NOW.getTime() + min * 60_000).toISOString();
const replay = (s: HouseholdState, log: Action[]) => log.reduce(applyAction, s);

/** Une semaine préparée, choisie et validée, puis quelques coches. */
function journal(s0: HouseholdState): Action[] {
  const log: Action[] = [{ type: "generate", weekStart: W, seed: 42 }];
  const week = replay(s0, log).weeks[W];
  for (const e of week.entries.filter((x) => x.slot !== "dessert")) log.push({ type: "choose", weekStart: W, entryId: e.id, recipeId: e.recipeId });
  log.push({ type: "validate", weekStart: W, at: at(5) });
  log.push({ type: "addToShopping", weekStart: W, text: "piles, 2 carottes", at: at(6) });
  return log;
}

describe("état du foyer partagé", () => {
  const s0 = initialHousehold(NOW);

  it("le même journal donne le même état (téléphone et serveur)", () => {
    const log = journal(s0);
    expect(JSON.stringify(replay(s0, log))).toBe(JSON.stringify(replay(initialHousehold(NOW), log)));
  });

  it("cocher est rejouable sans effet de bord", () => {
    const s1 = replay(s0, journal(s0));
    const item = s1.shopping[W][0];
    const check: Action = { type: "setChecked", weekStart: W, itemId: item.id, checked: true, by: "Marie", at: at(10) };
    const once = applyAction(s1, check);
    expect(applyAction(once, check)).toEqual(once);
    expect(once.shopping[W].find((i) => i.id === item.id)).toMatchObject({ checked: true, checkedBy: "Marie" });
  });

  it("hors ligne puis rejoué : les coches des deux téléphones se combinent", () => {
    const s1 = replay(s0, journal(s0));
    const [a, b] = s1.shopping[W];
    const phone1: Action[] = [{ type: "setChecked", weekStart: W, itemId: a.id, checked: true, by: "Tom", at: at(20) }];
    const phone2: Action[] = [{ type: "setChecked", weekStart: W, itemId: b.id, checked: true, by: "Marie", at: at(21) }];
    // Le serveur reçoit le téléphone 2, puis le téléphone 1 qui revient du supermarché.
    const server = replay(s1, [...phone2, ...phone1]);
    expect(server.shopping[W].filter((i) => i.checked).map((i) => i.checkedBy).sort()).toEqual(["Marie", "Tom"]);
  });

  it("ajout à la main : renvoie les articles et garde des identifiants stables", () => {
    const s1 = replay(s0, [{ type: "generate", weekStart: W, seed: 1 }]);
    const { result, state } = applyActionWithResult(s1, { type: "addToShopping", weekStart: W, text: "papier cuisson", at: at(1) });
    expect(result.items?.map((i) => i.label)).toEqual(["papier cuisson"]);
    const again = applyActionWithResult(s1, { type: "addToShopping", weekStart: W, text: "papier cuisson", at: at(1) });
    expect(again.state.shopping[W].map((i) => i.id)).toEqual(state.shopping[W].map((i) => i.id));
  });

  it("un article dicté dans Home Assistant a le même identifiant partout, et n'est créé qu'une fois", () => {
    const s1 = replay(s0, journal(s0));
    const dictated: Action = { type: "haChanges", weekStart: W, changes: [{ kind: "create", summary: "Lait d'avoine", uid: "abc", done: false }], at: at(30) };
    const once = applyAction(s1, dictated);
    const twice = applyAction(once, dictated);
    expect(twice.shopping[W].filter((i) => i.label === "Lait d'avoine" || i.id.endsWith(":ha:abc"))).toHaveLength(1);
  });

  it("la sauvegarde ne garde que la part du foyer", () => {
    const withDevice = { ...s0, member: "Tom", integrations: { ai: { apiKey: "secret" } } } as HouseholdState;
    expect(Object.keys(pickHousehold(withDevice))).not.toContain("integrations");
    expect(Object.keys(pickHousehold(withDevice))).not.toContain("member");
  });

  it("semaine des courses : la suivante le week-end si elle est validée", () => {
    const s1 = replay(s0, journal(s0));
    expect(shoppingWeekOf(s1, new Date("2026-10-07T10:00:00"))).toBe("2026-10-05");
    expect(shoppingWeekOf(s1, new Date("2026-10-10T10:00:00"))).toBe(W);
  });

  it("« presque fini » : à racheter, reste marqué après l'ajout aux courses, repasse en stock une fois coché", () => {
    const s1 = replay(s0, journal(s0));
    const add: Action = { type: "addInventory", items: [{ id: "i1", name: "Riz", ingredientId: "riz", location: "placard", addedAt: at(1) }, { id: "i2", name: "Papier cuisson", location: "placard", addedAt: at(1) }] };
    const s2 = applyAction(s1, add);
    const low: Action = { type: "updateInventory", id: "i1", patch: { low: true } };
    const lowed = applyAction(s2, low);
    expect(applyAction(lowed, low)).toEqual(lowed);
    const [loweredPaper] = [applyAction(lowed, { type: "updateInventory", id: "i2", patch: { low: true } })];
    // Ajout aux courses (deux fois : pas de doublon), l'article reste « presque fini ».
    const text = "riz, papier cuisson";
    const addA: Action = { type: "addToShopping", weekStart: W, text, at: at(2) };
    const added = applyAction(applyAction(loweredPaper, addA), { ...addA, at: at(3) });
    expect(added.shopping[W].filter((i) => i.ingredientId === "riz")).toHaveLength(1);
    expect(added.inventory?.filter((i) => i.low).map((i) => i.id)).toEqual(["i1", "i2"]);
    // Coché en courses : seul l'article racheté repasse en stock.
    const rice = added.shopping[W].find((i) => i.ingredientId === "riz")!;
    const bought = applyAction(added, { type: "setChecked", weekStart: W, itemId: rice.id, checked: true, at: at(4) });
    expect(bought.inventory?.map((i) => [i.id, !!i.low])).toEqual([["i1", false], ["i2", true]]);
    const paper = bought.shopping[W].find((i) => i.label === "papier cuisson")!;
    const bought2 = applyAction(bought, { type: "setChecked", weekStart: W, itemId: paper.id, checked: true, at: at(5) });
    expect(bought2.inventory?.some((i) => i.low)).toBe(false);
    // Via Home Assistant aussi.
    const viaHa = applyAction(added, { type: "haChanges", weekStart: W, changes: [{ kind: "check", itemId: rice.id, checked: true }], at: at(6) });
    expect(viaHa.inventory?.find((i) => i.id === "i1")?.low).toBe(false);
  });

  it("« presque fini » n'est plus compté à la maison pour les courses des recettes", () => {
    const s1 = replay(s0, journal(s0));
    const week = s1.shopping[W];
    const wanted = week.find((i) => !i.manual)!;
    const inv = (low: boolean): HouseholdState => ({ ...s1, shopping: {}, inventory: [{ id: "i9", name: "x", ingredientId: wanted.ingredientId, location: "placard" as const, addedAt: at(1), low }] });
    // Liste recalculée de zéro : en stock → déjà à la maison ; « presque fini » → à acheter.
    expect(withShopping(inv(false), W).shopping[W].find((i) => i.ingredientId === wanted.ingredientId)?.haveAlready).toBe(true);
    expect(withShopping(inv(true), W).shopping[W].find((i) => i.ingredientId === wanted.ingredientId)?.haveAlready).toBe(false);
  });
});
