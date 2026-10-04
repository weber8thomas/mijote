import type { Ingredient, Recipe, StorageLocation } from "./schemas";
import { matchIngredient } from "./shopping";

// Inventaire de la maison (placard, frigo, congélateur) : où ranger un produit, et quoi cuisiner avec ce qu'on a.

export type InventoryMatch = {
  recipe: Recipe;
  /** Ingrédients de la recette déjà à la maison. */
  have: string[];
  /** Ingrédients qu'il faudrait acheter (hors basiques du placard et ajouts réservés aux adultes). */
  missing: string[];
  /** Part des ingrédients à la maison (0 à 1). */
  ratio: number;
};

/**
 * Classe les recettes selon ce qu'il y a déjà à la maison. Seuls comptent les ingrédients « qui s'achètent » :
 * ni basiques du placard (sel, huile, farine…), ni ajouts réservés aux adultes. Recettes sans aucun ingrédient
 * à la maison et recettes exclues écartées ; à égalité, celle à laquelle il manque le moins passe devant.
 */
export function rankByInventory(recipes: Recipe[], inventoryIngredientIds: Set<string>, ingredients: Map<string, Ingredient>): InventoryMatch[] {
  const out: InventoryMatch[] = [];
  for (const recipe of recipes) {
    if (recipe.status === "excluded") continue;
    const needed = new Set<string>();
    for (const ri of recipe.ingredients) {
      if (ri.adultOnly) continue;
      const ing = ingredients.get(ri.ingredientId);
      if (ing?.pantryBasic) continue;
      needed.add(ri.ingredientId);
    }
    if (!needed.size) continue;
    const have = [...needed].filter((id) => inventoryIngredientIds.has(id));
    if (!have.length) continue;
    const missing = [...needed].filter((id) => !inventoryIngredientIds.has(id));
    out.push({ recipe, have, missing, ratio: have.length / needed.size });
  }
  return out.sort(
    (a, b) => b.ratio - a.ratio || a.missing.length - b.missing.length || b.have.length - a.have.length || a.recipe.title.localeCompare(b.recipe.title, "fr"),
  );
}

const COLD = new Set<Ingredient["category"]>(["viande", "volaille", "poisson", "laitier", "oeuf"]);

/** Où ranger un produit : surgelés au congélateur, frais (viande, poisson, laitages, œufs) au frigo, le reste (conserves comprises) au placard. */
export function guessLocation(ingredient: Pick<Ingredient, "category" | "aisle"> | undefined): StorageLocation {
  if (!ingredient) return "placard";
  if (/surgel/i.test(ingredient.aisle)) return "congelateur";
  // Conserves et lait infantile en poudre : au placard, même si c'est du poisson ou du lait.
  if (/conserve|b[ée]b[ée]/i.test(ingredient.aisle)) return "placard";
  if (COLD.has(ingredient.category)) return "frigo";
  return "placard";
}

export const LOCATION_LABELS: Record<StorageLocation, string> = {
  placard: "Placard",
  frigo: "Frigo",
  congelateur: "Congélateur",
};

const STOP = new Set(["de", "du", "des", "le", "la", "les", "l", "d", "au", "aux", "a", "et", "en", "avec", "sans", "pour", "sur", "bio", "nature", "naturel", "naturelle", "france", "francais", "francaise", "origine"]);
const words = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/(eaux|oux)$/, (m) => m.slice(0, -1)).replace(/s$/, ""));

/**
 * Ingrédient du catalogue correspondant au nom d'un produit scanné (« Lentilles vertes du Puy » → lentilles vertes).
 * Plus prudent que matchIngredient : au moins la moitié des mots du produit doivent se retrouver dans l'ingrédient,
 * pour qu'une « pâte à tartiner aux noisettes » ne devienne pas des pâtes.
 */
export function matchProduct(name: string, ingredients: Ingredient[]): Ingredient | undefined {
  const ing = matchIngredient(name, ingredients);
  if (!ing) return undefined;
  const product = words(name);
  if (!product.length) return undefined;
  const known = new Set([ing.name, ing.plural ?? "", ing.pieceName ?? ""].flatMap(words));
  const hits = product.filter((w) => known.has(w)).length;
  return hits / product.length >= 0.5 ? ing : undefined;
}
