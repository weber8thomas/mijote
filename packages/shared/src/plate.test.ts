import { describe, expect, it } from "vitest";
import { AI_SAMPLES, INGREDIENTS, RECIPES, ingredientMap } from "./content";
import { ILLUSTRATION_KEYS } from "./illustrations";
import { GENERIC_PRODUCE, illustrationOf, isBowlDish, looksLikeBowl, plateOf } from "./plate";

const KEYS = new Set<string>(ILLUSTRATION_KEYS);
const ingredients = ingredientMap();
const generic = new Set<string>(GENERIC_PRODUCE);

describe("illustrationOf", () => {
  it("donne une illustration exacte à chaque fruit, légume et herbe", () => {
    const fresh = INGREDIENTS.filter((i) => ["legume", "fruit", "herbe"].includes(i.category) && !generic.has(i.id));
    expect(fresh.length).toBeGreaterThan(30);
    const missing = fresh.filter((i) => !KEYS.has(illustrationOf(i.id) ?? "")).map((i) => i.id);
    expect(missing).toEqual([]);
  });

  it("couvre protéines et féculents", () => {
    const families = ["viande", "volaille", "poisson", "oeuf", "legumineuse", "feculent"];
    const skip = new Set(["farine", "maizena"]); // ingrédients de liaison, pas un féculent d'assiette
    const missing = INGREDIENTS.filter((i) => families.includes(i.category) && !skip.has(i.id) && !KEYS.has(illustrationOf(i.id) ?? "")).map((i) => i.id);
    expect(missing).toEqual([]);
  });

  it("distingue les variantes", () => {
    expect(illustrationOf("chou-rouge")).toBe("chou-rouge");
    expect(illustrationOf("chou-vert")).toBe("chou");
    expect(illustrationOf("potimarron")).toBe("potimarron");
    expect(illustrationOf("courge-butternut")).toBe("courge");
    expect(illustrationOf("epinard-surgele")).toBe("epinard");
    expect(illustrationOf("sardines-huile")).toBe("poisson");
    expect(illustrationOf("persil")).toBe("herbes");
    expect(illustrationOf("prune")).toBe("quetsche");
    expect(illustrationOf("fruits-de-saison")).toBeUndefined();
    expect(illustrationOf("sel")).toBeUndefined();
  });
});

describe("plateOf", () => {
  it("renvoie 1 à 3 illustrations valides, sans doublon, pour chaque recette", () => {
    for (const r of [...RECIPES, ...AI_SAMPLES]) {
      const plate = plateOf(r, ingredients);
      expect(plate.length, r.id).toBeGreaterThanOrEqual(1);
      expect(plate.length, r.id).toBeLessThanOrEqual(3);
      expect(new Set(plate).size, r.id).toBe(plate.length);
      for (const k of plate) expect(KEYS.has(k), `${r.id} → ${k}`).toBe(true);
    }
  });

  it("montre le potimarron des recettes au potimarron", () => {
    for (const r of RECIPES.filter((x) => x.ingredients.some((i) => i.ingredientId === "potimarron") && !x.ingredients.some((i) => ["potiron", "courge-butternut"].includes(i.ingredientId))))
      expect(plateOf(r, ingredients), r.id).toContain("potimarron");
  });

  it("garde le légume vedette choisi par la recette", () => {
    const r = RECIPES.find((x) => x.id === "potee-chou-echine-porc")!;
    expect(plateOf(r, ingredients)).toContain("chou");
  });

  it("un dessert garde son illustration unique", () => {
    for (const r of RECIPES.filter((x) => x.slots.every((s) => s === "dessert"))) expect(plateOf(r, ingredients)).toEqual([r.illustration]);
  });
});

describe("poisson blanc et bol", () => {
  it("un poisson blanc (cabillaud, lieu, merlu) a son illustration, pas le saumon", () => {
    const lieu = RECIPES.find((r) => r.id === "lieu-beurre-citron-puree-potimarron")!;
    expect(plateOf(lieu, ingredients)).toContain("poisson-blanc");
    expect(illustrationOf("saumon")).toBe("poisson");
  });

  it("chaque recette du seed qui se mange à la cuillère porte l'étiquette bowl", () => {
    const missing = RECIPES.filter((r) => looksLikeBowl(r) && !r.tags.includes("bowl")).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("un gâteau au yaourt reste dans l'assiette", () => {
    const cake = RECIPES.find((r) => r.title.startsWith("Gâteau au yaourt"));
    if (cake) expect(isBowlDish(cake)).toBe(false);
  });
});
