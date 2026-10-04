import { describe, expect, it } from "vitest";
import { INGREDIENTS, ingredientMap, RECIPES } from "./content";
import { guessLocation, matchProduct, rankByInventory } from "./inventory";
import type { Recipe } from "./schemas";

const ingredients = ingredientMap();
const ing = (id: string) => {
  const i = ingredients.get(id);
  if (!i) throw new Error(`ingrédient inconnu : ${id}`);
  return i;
};

const recipe = (id: string, items: { ingredientId: string; adultOnly?: boolean }[], extra: Partial<Recipe> = {}): Recipe => ({
  ...RECIPES[0],
  id,
  slug: id,
  title: id,
  status: "active",
  ingredients: items.map((i) => ({ qty: 1, unit: "piece" as const, ...i })),
  ...extra,
});

describe("guessLocation", () => {
  it("range le frais au frigo", () => {
    expect(guessLocation(ing("poulet-filet"))).toBe("frigo");
    expect(guessLocation(ing("boeuf-hache"))).toBe("frigo");
    expect(guessLocation(ing("cabillaud"))).toBe("frigo");
    expect(guessLocation(ing("yaourt-nature"))).toBe("frigo");
    expect(guessLocation(ing("oeuf"))).toBe("frigo");
  });

  it("range les surgelés au congélateur", () => {
    expect(guessLocation(ing("epinard-surgele"))).toBe("congelateur");
    expect(guessLocation(ing("petits-pois-surgeles"))).toBe("congelateur");
  });

  it("range le reste au placard, conserves comprises", () => {
    expect(guessLocation(ing("carotte"))).toBe("placard");
    expect(guessLocation(ing("riz"))).toBe("placard");
    expect(guessLocation(ing("sardines-huile"))).toBe("placard");
    expect(guessLocation(ing("lait-infantile"))).toBe("placard");
    expect(guessLocation(undefined)).toBe("placard");
  });
});

describe("rankByInventory", () => {
  const a = recipe("a", [{ ingredientId: "carotte" }, { ingredientId: "poireau" }, { ingredientId: "sel", adultOnly: true }, { ingredientId: "riz" }]);
  const b = recipe("b", [{ ingredientId: "carotte" }, { ingredientId: "poulet-filet" }, { ingredientId: "courgette" }]);
  const c = recipe("c", [{ ingredientId: "pomme" }]);
  const d = recipe("d", [{ ingredientId: "carotte" }, { ingredientId: "poireau" }, { ingredientId: "oignon" }, { ingredientId: "pomme-de-terre" }]);

  it("ignore basiques du placard et ajouts adultes, écarte les recettes sans rien à la maison", () => {
    const res = rankByInventory([a, b, c], new Set(["carotte", "poireau"]), ingredients);
    expect(res.map((r) => r.recipe.id)).toEqual(["a", "b"]);
    expect(res[0]).toMatchObject({ have: ["carotte", "poireau"], missing: [], ratio: 1 });
    expect(res[1].missing).toEqual(["poulet-filet", "courgette"]);
    expect(res[1].ratio).toBeCloseTo(1 / 3);
  });

  it("à égalité de proportion, il manque le moins d'abord", () => {
    // e (1/2, 1 manquant) et d (2/4, 2 manquants) ont la même proportion ; b (1/3) ferme la marche.
    const e = recipe("e", [{ ingredientId: "carotte" }, { ingredientId: "navet" }]);
    const res = rankByInventory([b, d, e], new Set(["carotte", "poireau"]), ingredients);
    expect(res.map((r) => r.recipe.id)).toEqual(["e", "d", "b"]);
  });

  it("écarte les recettes exclues", () => {
    const res = rankByInventory([{ ...a, status: "excluded" }], new Set(["carotte"]), ingredients);
    expect(res).toEqual([]);
  });

  it("fonctionne sur le catalogue réel", () => {
    const res = rankByInventory(RECIPES, new Set(["carotte", "oeuf", "pomme"]), ingredients);
    expect(res.length).toBeGreaterThan(0);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].ratio).toBeGreaterThanOrEqual(res[i].ratio);
    for (const r of res) expect(r.have.length).toBeGreaterThan(0);
  });
});

describe("matchProduct", () => {
  it("reconnaît les produits simples", () => {
    expect(matchProduct("Lentilles vertes", INGREDIENTS)?.id).toMatch(/^lentille/);
    expect(matchProduct("Carottes râpées", INGREDIENTS)?.id).toBe("carotte");
    expect(matchProduct("Lait demi-écrémé", INGREDIENTS)?.id).toBe("lait");
  });

  it("ne confond pas un produit composé avec un ingrédient", () => {
    expect(matchProduct("Pâte à tartiner aux noisettes et au cacao", INGREDIENTS)).toBeUndefined();
    expect(matchProduct("Biscuits fourrés au chocolat", INGREDIENTS)).toBeUndefined();
    expect(matchProduct("", INGREDIENTS)).toBeUndefined();
  });
});
