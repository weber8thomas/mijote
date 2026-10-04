import type { Household, Ingredient, PriceThresholds, Recipe } from "./schemas";
import { priceOf, toBase } from "./units";

export type CostTier = 1 | 2 | 3;

export const DEFAULT_THRESHOLDS: PriceThresholds = { low: 2, high: 4 };

/** Part d'une portion adulte que mange un bébé de 11-12 mois. */
export const BABY_PORTION = 0.5;

/** Nombre de portions adultes à cuisiner pour le foyer. */
export const householdPortions = (h: Pick<Household, "adults" | "babies">) => h.adults + h.babies * BABY_PORTION;

/** Coût total de la recette pour ses portions de base. */
export function recipeCost(recipe: Recipe, ingredients: Map<string, Ingredient>): number {
  let total = 0;
  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing || ri.babyPortionOnly) continue;
    total += priceOf(toBase(ri.qty, ri.unit, ing), ing);
  }
  return total;
}

/** Coût par portion adulte. */
export const costPerPortion = (recipe: Recipe, ingredients: Map<string, Ingredient>) => recipeCost(recipe, ingredients) / recipe.servingsBase;

export function costTier(perPortion: number, t: PriceThresholds = DEFAULT_THRESHOLDS): CostTier {
  return perPortion < t.low ? 1 : perPortion > t.high ? 3 : 2;
}

export const tierLabel = (tier: CostTier) => "€".repeat(tier);

/** « 54 € » : estimation arrondie à l'euro. */
export const formatEuros = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/** « 2,40 € » : prix précis. */
export const formatPrice = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
