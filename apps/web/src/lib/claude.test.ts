import { INGREDIENTS, RECIPES } from "@mijote/shared";
import { describe, expect, it } from "vitest";
import { convert } from "./claude";

// Brouillon au format demandé à Claude, à partir d'une recette du seed.
const seed = RECIPES.find((r) => r.slots.includes("dinner"))!;
const draft = {
  title: `${seed.title} (Claude)`,
  description: seed.description ?? "",
  slots: seed.slots,
  prepMinutes: seed.prepMinutes,
  cookMinutes: seed.cookMinutes,
  longCook: seed.longCook,
  yieldsLeftovers: seed.yieldsLeftovers,
  servingsBase: seed.servingsBase,
  ingredients: seed.ingredients.map((i) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit, note: i.note ?? null, form: i.form ?? null, adultOnly: !!i.adultOnly })),
  newIngredients: [],
  steps: seed.steps,
  babyAdaptation: { ...seed.babyAdaptation, notes: seed.babyAdaptation.notes ?? null },
  ironScore: seed.ironScore,
  mainProtein: seed.mainProtein,
  tags: seed.tags,
  illustration: seed.illustration,
};
const catalog = new Map(INGREDIENTS.map((i) => [i.id, i]));

describe("brouillon Claude → recette", () => {
  it("convertit un brouillon valide", () => {
    const out = convert(draft, catalog, "x");
    expect("errors" in out ? out.errors : []).toEqual([]);
    if ("recipe" in out) expect(out.recipe.source).toBe("ai");
  });

  it("refuse le miel dans la portion bébé", () => {
    const out = convert({ ...draft, ingredients: [...draft.ingredients, { ingredientId: "miel", qty: 1, unit: "cs", note: null, form: null, adultOnly: false }] }, catalog, "x");
    expect("errors" in out).toBe(true);
  });

  it("crée un ingrédient inconnu « à vérifier »", () => {
    const out = convert(
      {
        ...draft,
        ingredients: [...draft.ingredients, { ingredientId: "citronnelle", qty: 1, unit: "piece", note: null, form: null, adultOnly: false }],
        newIngredients: [{ id: "citronnelle", name: "citronnelle", category: "herbe", aisle: "Fruits et légumes", channel: "supermarket", unit: "piece", avgPrice: 1, pieceWeight: 20, ironRich: false, tags: [] }],
      },
      catalog,
      "x",
    );
    expect("errors" in out ? out.errors : []).toEqual([]);
    if ("recipe" in out) expect(out.newIngredients[0]).toMatchObject({ id: "citronnelle", toReview: true });
  });
});
