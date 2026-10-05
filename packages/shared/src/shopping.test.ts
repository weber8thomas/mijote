import { describe, expect, it } from "vitest";
import { INGREDIENTS, ingredientMap, RECIPES } from "./content";
import { DEFAULT_THRESHOLDS } from "./pricing";
import { generateWeek } from "./planner/generate";
import { buildShoppingList, itemLine, manualItem, matchIngredient, matchShoppingItem, parseShoppingText } from "./shopping";

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

describe("matchShoppingItem (scan en magasin)", () => {
  const week = "2026-10-05";
  const add = (text: string) => parseShoppingText(text, INGREDIENTS).map((l, i) => manualItem(week, l, ingredients, new Date(Date.UTC(2026, 9, 5, 10, 0, i))));
  const list = [...add("carottes"), ...add("lentilles vertes"), ...add("papier toilette"), ...add("lait")];
  const byName = (name: string) => matchShoppingItem({ name }, list, INGREDIENTS);

  it("coche l'article du même ingrédient", () => {
    expect(byName("Carottes des sables")?.ingredientId).toBe("carotte");
    expect(byName("Lentilles vertes du Puy")?.ingredientId).toBe("lentilles-vertes");
    expect(byName("Lait demi-écrémé UHT")?.ingredientId).toBe("lait");
  });

  it("retrouve un article hors catalogue par ses mots", () => {
    expect(byName("Papier toilette confort 12 rouleaux")?.label).toBe("papier toilette");
    expect(byName("Papier cuisson")).toBeUndefined();
  });

  it("reste prudent : un produit qui ne fait que ressembler ne coche rien", () => {
    expect(byName("Pâte à tartiner aux noisettes")).toBeUndefined();
    expect(byName("Lentilles corail")).toBeUndefined();
    expect(byName("Biscuits au chocolat")).toBeUndefined();
  });

  it("préfère un article non coché, ignore « J'ai déjà »", () => {
    const [carrot] = add("carottes");
    const checked = { ...carrot, id: "c1", checked: true };
    const open = { ...carrot, id: "c2" };
    expect(matchShoppingItem({ name: "Carottes" }, [checked, open], INGREDIENTS)?.id).toBe("c2");
    expect(matchShoppingItem({ name: "Carottes" }, [checked], INGREDIENTS)?.id).toBe("c1");
    expect(matchShoppingItem({ name: "Carottes" }, [{ ...open, haveAlready: true }], INGREDIENTS)).toBeUndefined();
  });
});
