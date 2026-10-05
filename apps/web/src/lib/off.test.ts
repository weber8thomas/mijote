import { describe, expect, it } from "vitest";
import { babyWarnings, toProductInfo } from "./off";

// Réponse type de l'API v2 (champs demandés par Mijoté), d'après une pâte à tartiner.
const raw = {
  product_name_fr: "Pâte à tartiner noisettes et cacao",
  brands: "Marque A, Marque B",
  nutriscore_grade: "e",
  nova_group: 4,
  additives_tags: ["en:e322"],
  allergens_tags: ["en:milk", "en:nuts", "en:soybeans"],
  ingredients_text_fr: "Sucre, huile de palme, noisettes 13 %, lait écrémé en poudre, cacao maigre, émulsifiant : lécithines (soja), vanilline.",
  quantity: "400 g",
  nutrition_data_per: "100g",
  serving_size: "15 g",
  nutriments: {
    "energy-kj_100g": 2252,
    "energy-kcal_100g": 539,
    fat_100g: 30.9,
    "saturated-fat_100g": 10.6,
    carbohydrates_100g: 57.5,
    sugars_100g: 56.3,
    proteins_100g: 6.3,
    salt_100g: 0.107,
    "energy-kj_serving": 338,
    sugars_serving: 8.45,
  },
  nutrient_levels: { fat: "high", "saturated-fat": "high", sugars: "high", salt: "low" },
  image_front_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.633.400.jpg",
  image_front_small_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.633.200.jpg",
  image_nutrition_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/nutrition_fr.106.400.jpg",
  last_modified_t: 1790000000,
};

describe("Open Food Facts → fiche Mijoté", () => {
  const p = toProductInfo(raw);

  it("reprend les valeurs nutritionnelles pour 100 g et par portion", () => {
    expect(p.nutrition).toMatchObject({ per: "100g", energyKcal: 539, energyKj: 2252, fat: 30.9, saturatedFat: 10.6, carbs: 57.5, sugars: 56.3, proteins: 6.3, salt: 0.107 });
    // kcal par portion absentes : recalculées depuis les kJ.
    expect(p.serving).toMatchObject({ size: "15 g", energyKj: 338, energyKcal: 81, sugars: 8.45 });
    expect(p.levels).toEqual({ fat: "high", saturatedFat: "high", sugars: "high", salt: "low" });
  });

  it("donne les photos en pleine résolution", () => {
    expect(p.images?.front).toEqual({ display: raw.image_front_url, full: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.633.full.jpg" });
    expect(p.images?.nutrition?.full).toMatch(/nutrition_fr\.106\.full\.jpg$/);
    expect(p.images?.ingredients).toBeUndefined();
    expect(p.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("une fiche sans nutriments reste valide", () => {
    const bare = toProductInfo({ product_name: "Produit" });
    expect(bare.nutrition).toBeUndefined();
    expect(bare.serving).toBeUndefined();
    expect(bare.images).toBeUndefined();
  });

  it("alertes bébé à partir des chiffres", () => {
    const w = babyWarnings(p);
    expect(w).toContain("Riche en sucres (56,3 g pour 100 g) : à limiter pour bébé.");
    expect(w.some((x) => x.startsWith("Assez salé"))).toBe(false);
    const salty = babyWarnings({ ...p, nutrition: { per: "100g", salt: 1.2 } });
    expect(salty).toContain("Assez salé pour bébé (1,2 g de sel pour 100 g).");
  });
});
