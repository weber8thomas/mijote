import type { Ingredient, Recipe } from "./schemas";
import { toBase } from "./units";

// Illustration exacte de chaque ingrédient, et « assiette » d'une recette : les illustrations de sa protéine,
// de son légume et de son féculent, déduites des ingrédients (le plus présent de chaque famille).
// Un dessert garde son illustration unique.

/** Légumes (catégorie `legume`) qui peuvent tenir le rôle de légume de l'assiette. */
const VEGETABLES: Record<string, string> = {
  "courge-butternut": "courge",
  potimarron: "potimarron",
  potiron: "potiron",
  carotte: "carotte",
  poireau: "poireau",
  "chou-vert": "chou",
  "chou-rouge": "chou-rouge",
  "chou-fleur": "chou-fleur",
  brocoli: "brocoli",
  epinard: "epinard",
  "epinard-surgele": "epinard",
  mache: "mache",
  endive: "endive",
  fenouil: "fenouil",
  courgette: "courgette",
  betterave: "betterave",
  panais: "panais",
  "patate-douce": "patate-douce",
  champignon: "champignon",
  "celeri-rave": "celeri",
  navet: "navet",
  poivron: "poivron",
  tomate: "tomate",
  "petits-pois-surgeles": "petits-pois",
};

/** Aromates et herbes : illustrés, mais jamais légume vedette d'une assiette. */
const AROMATICS: Record<string, string> = {
  basilic: "herbes",
  oignon: "oignon",
  echalote: "echalote",
  ail: "ail",
  gingembre: "gingembre",
  persil: "herbes",
  ciboulette: "herbes",
  coriandre: "herbes",
};

const FRUITS: Record<string, string> = {
  pomme: "pomme",
  poire: "poire",
  raisin: "raisin",
  figue: "figue",
  coing: "coing",
  kiwi: "kiwi",
  clementine: "clementine",
  orange: "orange",
  citron: "citron",
  banane: "banane",
  prune: "quetsche",
  chataigne: "chataigne",
  "fruits-rouges-surgeles": "fruits-rouges",
};

/** Fruits ou légumes volontairement génériques : pas d'illustration propre. */
export const GENERIC_PRODUCE = ["fruits-de-saison"] as const;

const PROTEIN: Record<string, string> = {
  "thon-boite": "poisson",
  crevettes: "poisson",
  "poulet-entier": "poulet",
  "veau-blanquette": "viande",
  "jambon-blanc": "viande",
  lardons: "viande",
  chorizo: "viande",
  merguez: "viande",
  "saucisse-toulouse": "viande",
  "haricots-rouges": "haricot",
  "boeuf-hache": "viande",
  "boeuf-braiser": "viande",
  "agneau-epaule": "viande",
  "porc-echine": "viande",
  "poulet-cuisse": "poulet",
  "poulet-filet": "poulet",
  "dinde-escalope": "poulet",
  cabillaud: "poisson",
  lieu: "poisson",
  merlu: "poisson",
  saumon: "poisson",
  truite: "poisson",
  maquereau: "poisson",
  sardine: "poisson",
  "sardines-huile": "poisson",
  espadon: "poisson",
  oeuf: "oeuf",
  "lentilles-vertes": "lentilles",
  "lentilles-corail": "lentilles",
  "pois-casses": "lentilles",
  "pois-chiches": "pois-chiche",
  "haricots-blancs": "haricot",
  tofu: "tofu",
};

const STARCH: Record<string, string> = {
  nouilles: "pates",
  "feuilles-lasagne": "pates",
  "tortilla-ble": "pain",
  "pate-pizza": "pain",
  "pate-feuilletee": "pain",
  "pain-mie": "pain",
  "pain-burger": "pain",
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

/** Produits d'épicerie dont l'illustration est évidente. */
const PANTRY: Record<string, string> = {
  "tomates-concassees": "tomate",
  "concentre-tomate": "tomate",
  "flocons-avoine": "avoine",
};

const ILLUSTRATION_OF: Record<string, string> = { ...PANTRY, ...FRUITS, ...AROMATICS, ...VEGETABLES, ...PROTEIN, ...STARCH };

/** Clé d'illustration exacte d'un ingrédient (produits frais, protéines, féculents), sinon `undefined`. */
export function illustrationOf(ingredientId: string): string | undefined {
  return ILLUSTRATION_OF[ingredientId];
}

const VEG_KEYS = new Set(Object.values(VEGETABLES));

/** Variantes d'un même légume : l'illustration choisie par la recette cède la place à la variante réellement cuisinée. */
const FAMILY: Record<string, string> = {
  courge: "courge",
  potiron: "courge",
  potimarron: "courge",
  chou: "chou",
  "chou-rouge": "chou",
  epinard: "feuilles",
  mache: "feuilles",
};

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

/** Légume vedette : celui choisi par l'auteur (ou sa variante réellement présente), sinon le plus présent. */
function vegOf(recipe: Recipe, ingredients: Map<string, Ingredient>): string | undefined {
  const vegKey = (i: Ingredient) => VEGETABLES[i.id];
  const chosen = recipe.illustration;
  if (VEG_KEYS.has(chosen)) {
    if (recipe.ingredients.some((ri) => VEGETABLES[ri.ingredientId] === chosen)) return chosen;
    const family = FAMILY[chosen];
    const variant = family ? heaviest(recipe, ingredients, (i) => (FAMILY[vegKey(i) ?? ""] === family ? vegKey(i) : undefined)) : undefined;
    return variant ?? chosen;
  }
  return heaviest(recipe, ingredients, vegKey);
}

export function plateOf(recipe: Recipe, ingredients: Map<string, Ingredient>): string[] {
  if (!recipe.slots.some((s) => s === "lunch" || s === "dinner")) return [recipe.illustration];
  const protein = heaviest(recipe, ingredients, (i) => PROTEIN[i.id] ?? (i.category === "poisson" ? "poisson" : undefined));
  const starch = heaviest(recipe, ingredients, (i) => STARCH[i.id]);
  const veg = vegOf(recipe, ingredients);
  const plate = [protein, veg, starch].filter((k, i, all): k is string => !!k && all.indexOf(k) === i);
  return plate.length ? plate : [recipe.illustration];
}
