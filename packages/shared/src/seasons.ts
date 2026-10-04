import type { Ingredient, Recipe } from "./schemas";

// Calendrier de saison France métropolitaine.
// Les mois de pleine saison sont portés par chaque ingrédient (content/ingredients.json, champ seasonMonths) ;
// ce module fournit la tolérance « toute l'année » et les calculs.

export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Produits frais considérés de saison toute l'année (conservation longue). */
export const ALL_YEAR = new Set(["oignon", "echalote", "ail", "citron", "pomme-de-terre", "carotte", "persil", "banane", "gingembre"]);

const FRESH = new Set<Ingredient["category"]>(["legume", "fruit", "herbe"]);

/** Un produit frais est-il de saison ce mois-ci ? Les produits non frais le sont toujours. */
export function ingredientInSeason(ing: Ingredient, month: number): boolean {
  if (!FRESH.has(ing.category) || ALL_YEAR.has(ing.id) || !ing.seasonMonths?.length) return true;
  return ing.seasonMonths.includes(month);
}

/** Produits frais de la recette hors saison ce mois-ci. */
export function outOfSeason(recipe: Recipe, ingredients: Map<string, Ingredient>, month: number): Ingredient[] {
  return recipe.ingredients
    .map((ri) => ingredients.get(ri.ingredientId))
    .filter((ing): ing is Ingredient => !!ing && !ingredientInSeason(ing, month));
}

/** Une recette est « de saison » si tous ses produits frais le sont. */
export const isInSeason = (recipe: Recipe, ingredients: Map<string, Ingredient>, month: number) => outOfSeason(recipe, ingredients, month).length === 0;

/** Fruits et légumes en pleine saison ce mois-ci (hors tolérance toute l'année). */
export const seasonalProduce = (ingredients: Ingredient[], month: number) =>
  ingredients.filter((i) => FRESH.has(i.category) && i.category !== "herbe" && !ALL_YEAR.has(i.id) && i.seasonMonths?.includes(month));
