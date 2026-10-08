import { describe, expect, it } from "vitest";
import { castRecipe, findRecipeByName } from "./cast";
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

describe("findRecipeByName : retrouver une recette dite à voix haute", () => {
  const find = (q: string) => findRecipeByName(RECIPES, q);
  const id = (m: ReturnType<typeof find>) => (m && "recipe" in m ? m.recipe.id : m && "candidates" in m ? m.candidates.map((r) => r.id) : undefined);

  it("sans accents, sans « œ », au singulier comme au pluriel, avec ou sans petits mots", () => {
    for (const q of ["bœuf carottes", "boeuf carotte", "Bœuf aux carottes", "la recette de boeuf carottes", "BOEUF CAROTTES"]) expect(id(find(q))).toBe("boeuf-carottes-mijote");
  });

  it("quelques mots suffisent quand un seul titre les contient", () => {
    expect(id(find("potimarron"))).toBe("veloute-potimarron-lentilles-corail");
    expect(id(find("tortilla"))).toBe("tortilla-pommes-de-terre-epinards");
  });

  it("plusieurs titres possibles : le plus proche (le moins de mots en plus) l'emporte", () => {
    const lentilles = RECIPES.filter((r) => r.title.toLowerCase().includes("lentilles"));
    expect(lentilles.length).toBeGreaterThan(1);
    const shortest = [...lentilles].sort((a, b) => a.title.split(" ").length - b.title.split(" ").length)[0]!;
    expect(id(find("lentilles"))).toBe(shortest.id);
  });

  it("ambigu à égalité : les candidates, jamais un choix au hasard", () => {
    const a = { ...boeuf, id: "a", title: "Soupe verte" };
    const b = { ...boeuf, id: "b", title: "Soupe rouge" };
    expect(id(findRecipeByName([a, b], "soupe"))).toEqual(["b", "a"]);
  });

  it("inconnu, ou vide : rien", () => {
    expect(find("lasagnes à la fraise")).toBeUndefined();
    expect(find("la recette")).toBeUndefined();
    expect(find("")).toBeUndefined();
  });

  it("une recette écartée n'est jamais proposée, un favori départage", () => {
    const boeuf = RECIPES.find((r) => r.id === "boeuf-carottes-mijote")!;
    expect(id(findRecipeByName([{ ...boeuf, status: "excluded" }], "boeuf carottes"))).toBeUndefined();
    const a = { ...boeuf, id: "a", title: "Soupe verte" };
    const b = { ...boeuf, id: "b", title: "Soupe rouge", status: "favorite" as const };
    expect(id(findRecipeByName([a, b], "soupe"))).toBe("b");
    expect(id(findRecipeByName([a, { ...b, status: "active" as const }], "soupe"))).toEqual(["b", "a"]);
  });
});
