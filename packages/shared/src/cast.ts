import type { Ingredient, Recipe } from "./schemas";
import { ingredientLine } from "./units";

// Écran de cuisine (Nest Hub, apps/web/public/cast) : ce que le récepteur reçoit pour une recette.
// Quantités et noms déjà accordés (comme la fiche recette) : le récepteur n'a que du texte à afficher.

export type CastIngredient = { qty: string; name: string; note?: string };
export type CastRecipe = {
  v: 1;
  id: string;
  title: string;
  meta: string;
  ingredients: CastIngredient[];
  steps: string[];
  baby: Recipe["babyAdaptation"];
};

const minutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

/**
 * @param factor quantités de la recette × factor (portions du foyer ÷ servingsBase) ; 1 = les quantités de la recette
 * @param portions texte des parts affiché sous le titre (par défaut : les parts adultes de la recette)
 */
export function castRecipe(r: Recipe, ingredients: Map<string, Ingredient>, { factor = 1, portions }: { factor?: number; portions?: string } = {}): CastRecipe {
  return {
    v: 1,
    id: r.id,
    title: r.title,
    meta: [`Préparation ${minutes(r.prepMinutes)}`, r.cookMinutes ? `cuisson ${minutes(r.cookMinutes)}` : "", portions ?? `${r.servingsBase} parts adultes`].filter(Boolean).join(" · "),
    ingredients: r.ingredients.flatMap((ri) => {
      const ing = ingredients.get(ri.ingredientId);
      if (!ing) return [];
      const line = ingredientLine(ri.babyPortionOnly ? ri.qty : ri.qty * factor, ri.unit, ing);
      const note = [ri.note, ri.adultOnly ? "adultes" : "", ri.babyPortionOnly ? "bébé" : ""].filter(Boolean).join(", ");
      return [{ ...line, ...(note ? { note } : {}) }];
    }),
    steps: r.steps,
    baby: r.babyAdaptation,
  };
}
