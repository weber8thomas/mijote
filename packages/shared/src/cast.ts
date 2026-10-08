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

// ——— Retrouver une recette par son nom, tel qu'il est dit à voix haute ———

const FILLER = new Set(["de", "du", "des", "d", "la", "le", "les", "l", "un", "une", "au", "aux", "a", "et", "en", "recette", "recettes", "plat"]);

/** Mots utiles d'un texte : minuscules, sans accents (« œ » → « oe »), sans petits mots, singulier (« carottes » → « carotte »). */
export function nameWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !FILLER.has(w))
    .map((w) => (w.length > 3 ? w.replace(/[sx]$/, "") : w));
}

export type RecipeMatch = { recipe: Recipe } | { candidates: Recipe[] } | undefined;

/**
 * La recette dont le titre contient tous les mots demandés. Plusieurs candidates : la plus proche (le moins de mots en plus,
 * puis les favorites) l'emporte si elle est seule à l'être, sinon c'est ambigu (`candidates`). Aucune : `undefined`.
 */
export function findRecipeByName(recipes: Recipe[], query: string): RecipeMatch {
  const wanted = nameWords(query);
  if (!wanted.length) return undefined;
  const hits = recipes
    .filter((r) => r.status !== "excluded")
    .map((r) => ({ r, words: nameWords(r.title) }))
    .filter(({ words }) => wanted.every((w) => words.includes(w)))
    .map(({ r, words }) => ({ r, extra: words.length - wanted.length, fav: r.status === "favorite" ? 0 : 1 }))
    .sort((a, b) => a.extra - b.extra || a.fav - b.fav || a.r.title.localeCompare(b.r.title, "fr"));
  const [best, next] = hits;
  if (!best) return undefined;
  if (!next || best.extra < next.extra || best.fav < next.fav) return { recipe: best.r };
  return { candidates: hits.filter((h) => h.extra === best.extra && h.fav === best.fav).map((h) => h.r) };
}
