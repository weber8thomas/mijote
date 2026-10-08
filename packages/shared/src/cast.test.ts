import { describe, expect, it } from "vitest";
import { castRecipe } from "./cast";
import { ingredientMap, RECIPES } from "./content";

const ingredients = ingredientMap();
const boeuf = RECIPES.find((r) => r.id === "boeuf-carottes-mijote")!;

describe("castRecipe : la recette pour l'écran de cuisine", () => {
  it("quantités et noms accordés, étapes et portion bébé reprises telles quelles", () => {
    const c = castRecipe(boeuf, ingredients);
    expect(c).toMatchObject({ v: 1, id: boeuf.id, title: "Bœuf carottes", steps: boeuf.steps, baby: boeuf.babyAdaptation });
    expect(c.meta).toBe("Préparation 20 min · cuisson 2 h 30 · 4 parts adultes");
    expect(c.ingredients[0]).toEqual({ qty: "900 g", name: "bœuf à braiser (paleron)", note: "paleron ou macreuse" });
    expect(c.ingredients.find((i) => i.name === "gousses d'ail")?.qty).toBe("2");
  });

  it("le facteur multiplie les quantités, et le texte des parts est celui du foyer", () => {
    const half = castRecipe(boeuf, ingredients, { factor: 0.5, portions: "2 adultes, 1 bébé" });
    expect(castRecipe(boeuf, ingredients).ingredients[0]?.qty).toBe("900 g");
    expect(half.ingredients[0]?.qty).toBe("450 g");
    expect(half.meta.endsWith("2 adultes, 1 bébé")).toBe(true);
  });

  it("le sel et le poivre sont signalés « adultes »", () => {
    const sel = castRecipe(boeuf, ingredients).ingredients.find((i) => i.name === "sel");
    expect(sel?.note).toBe("au service, adultes");
  });

  it("un ingrédient inconnu est ignoré plutôt que d'afficher son identifiant", () => {
    const c = castRecipe(boeuf, new Map([...ingredients].filter(([id]) => id !== "carotte")));
    expect(c.ingredients.some((i) => i.name === "carotte")).toBe(false);
    expect(c.ingredients).toHaveLength(boeuf.ingredients.length - 1);
  });
});
