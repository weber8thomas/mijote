import type { Ingredient, Recipe } from "./schemas";
import { toBase } from "./units";

// « Assiette » d'une recette : les illustrations de sa protéine, de son légume et de son féculent,
// déduites des ingrédients (le plus présent de chaque famille). Un dessert garde son illustration unique.

const PROTEIN: Record<string, string> = {
  "boeuf-hache": "viande",
  "boeuf-braiser": "viande",
  "agneau-epaule": "viande",
  "porc-echine": "viande",
  "poulet-cuisse": "poulet",
  "poulet-filet": "poulet",
  "dinde-escalope": "poulet",
  oeuf: "oeuf",
  "lentilles-vertes": "lentilles",
  "lentilles-corail": "lentilles",
  "pois-casses": "lentilles",
  "pois-chiches": "pois-chiche",
  "haricots-blancs": "haricot",
  tofu: "tofu",
};

const STARCH: Record<string, string> = {
  pates: "pates",
  "petites-pates": "pates",
  riz: "riz",
  quinoa: "cereales",
  semoule: "cereales",
  boulgour: "cereales",
  polenta: "cereales",
  pain: "pain",
  "pate-brisee": "pain",
  "pomme-de-terre": "pomme-de-terre",
};

const VEG: Record<string, string> = {
  "courge-butternut": "courge",
  potimarron: "potiron",
  potiron: "potiron",
  carotte: "carotte",
  poireau: "poireau",
  "chou-vert": "chou",
  "chou-rouge": "chou",
  "chou-fleur": "chou-fleur",
  brocoli: "brocoli",
  epinard: "epinard",
  "epinard-surgele": "epinard",
  mache: "epinard",
  betterave: "betterave",
  panais: "panais",
  "patate-douce": "patate-douce",
  champignon: "champignon",
  "celeri-rave": "celeri",
  navet: "navet",
  poivron: "poivron",
  tomate: "tomate",
};

const VEG_KEYS = new Set(Object.values(VEG));

/** Ingrédient le plus présent (en grammes) parmi ceux que `pick` reconnaît. */
function heaviest(recipe: Recipe, ingredients: Map<string, Ingredient>, pick: (ing: Ingredient) => string | undefined): string | undefined {
  let best: { key: string; qty: number } | undefined;
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing || ri.adultOnly || ri.babyPortionOnly) continue;
    const key = pick(ing);
    if (!key) continue;
    const grams = ing.unit === "piece" ? toBase(ri.qty, ri.unit, ing) * (ing.pieceWeight ?? 100) : toBase(ri.qty, ri.unit, ing);
    if (!best || grams > best.qty) best = { key, qty: grams };
  }
  return best?.key;
}

export function plateOf(recipe: Recipe, ingredients: Map<string, Ingredient>): string[] {
  if (!recipe.slots.some((s) => s === "lunch" || s === "dinner")) return [recipe.illustration];
  const protein = heaviest(recipe, ingredients, (i) => (i.category === "poisson" ? "poisson" : PROTEIN[i.id]));
  const starch = heaviest(recipe, ingredients, (i) => STARCH[i.id]);
  // Le légume vedette choisi par l'auteur de la recette prime, sinon le plus présent.
  const veg = VEG_KEYS.has(recipe.illustration) ? recipe.illustration : heaviest(recipe, ingredients, (i) => VEG[i.id]);
  const plate = [protein, veg, starch].filter((k, i, all): k is string => !!k && all.indexOf(k) === i);
  return plate.length ? plate : [recipe.illustration];
}
