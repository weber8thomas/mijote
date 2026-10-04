import { describe, expect, it } from "vitest";
import { INGREDIENTS, ingredientMap, RECIPES } from "./content";
import { DEFAULT_THRESHOLDS } from "./pricing";
import { generateWeek } from "./planner/generate";
import { buildShoppingList, itemLine, manualItem, matchIngredient, parseShoppingText } from "./shopping";

const ingredients = ingredientMap();
const ctx = { recipes: RECIPES, ingredients, household: { id: "h", name: "t", adults: 2, babies: 1, dessertSlot: "dinner" as const, priceThresholds: DEFAULT_THRESHOLDS } };

describe("ajout à la main", () => {
  it("retrouve les ingrédients du catalogue", () => {
    expect(matchIngredient("carottes", INGREDIENTS)?.id).toBe("carotte");
    expect(matchIngredient("lait", INGREDIENTS)?.id).toBe("lait");
    expect(matchIngredient("papier toilette", INGREDIENTS)).toBeUndefined();
  });

  it("découpe un texte libre avec quantités", () => {
    const lines = parseShoppingText("3 carottes, du lait et 500 g de farine ; papier toilette", INGREDIENTS);
    expect(lines.map((l) => l.ingredientId)).toEqual(["carotte", "lait", "farine", undefined]);
    expect(lines[0]).toMatchObject({ qty: 3, unit: "piece" });
    expect(lines[2]).toMatchObject({ qty: 500, unit: "g" });
    expect(lines[3].label).toBe("papier toilette");
  });

  it("garde les articles manuels quand la liste est recalculée", () => {
    const week = { ...generateWeek(ctx, "2026-10-05", 3), status: "validated" as const };
    const first = buildShoppingList({ week, recipes: new Map(RECIPES.map((r) => [r.id, r])), ingredients, pantryInStock: new Set() });
    const extra = parseShoppingText("papier toilette, 2 citrons", INGREDIENTS).map((l) => manualItem(week.weekStart, l, ingredients));
    const again = buildShoppingList({ week, recipes: new Map(RECIPES.map((r) => [r.id, r])), ingredients, pantryInStock: new Set(), previous: [...first, ...extra] });
    expect(again.filter((i) => i.manual)).toHaveLength(2);
    expect(again.filter((i) => i.manual).map((i) => itemLine(i, ingredients))).toEqual(expect.arrayContaining(["papier toilette", "2 citrons"]));
  });

  it("propose en « déjà à la maison » ce qui est dans l'inventaire", () => {
    const week = { ...generateWeek(ctx, "2026-10-05", 3), status: "validated" as const };
    const recipes = new Map(RECIPES.map((r) => [r.id, r]));
    const some = buildShoppingList({ week, recipes, ingredients, pantryInStock: new Set() })[0].ingredientId;
    const items = buildShoppingList({ week, recipes, ingredients, pantryInStock: new Set(), atHome: new Set([some]) });
    expect(items.find((i) => i.ingredientId === some)?.haveAlready).toBe(true);
  });
});
