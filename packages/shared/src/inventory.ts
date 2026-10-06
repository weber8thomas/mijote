import type { Ingredient, InventoryItem, ProductInfo, Recipe, ShoppingItem, StorageLocation } from "./schemas";
import { matchIngredient, slug } from "./shopping";

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

/**
 * Rangement automatique en mode magasin : l'article à ranger pour un produit scanné, ou rien.
 * Rien si le produit est inconnu, si le code n'est pas un code-barres, ou si ce code a déjà été rangé pendant la séance
 * (`shelved` : codes déjà rangés). Nom et emplacement suivent la même logique que le rangement à la main (matchProduct, guessLocation).
 */
export function planStoreShelving(code: string, product: ProductInfo | undefined, ingredients: Ingredient[], shelved: ReadonlySet<string>): Omit<InventoryItem, "id" | "addedAt"> | undefined {
  const barcode = code.trim();
  const name = product?.name.trim();
  if (!product || !name || !/^\d{8,14}$/.test(barcode) || shelved.has(barcode)) return undefined;
  const match = matchProduct(name, ingredients);
  return { name, ingredientId: match?.id, location: guessLocation(match), barcode, product };
}

// ——— « Presque fini » ———
// Un article de l'inventaire marqué `low` n'est plus « à la maison » (les courses des recettes le comptent de nouveau)
// et se range dans le groupe « à racheter ». Règle : il reste « presque fini » après son ajout aux courses, jusqu'à ce
// qu'il soit racheté (l'article des courses est coché : `clearLowBought`) ou remis « en stock » d'un tap par le foyer.

/** Articles « presque finis », dans l'ordre de l'inventaire. */
export const lowItems = (inventory: InventoryItem[] | undefined) => (inventory ?? []).filter((i) => i.low);

/** L'article des courses est-il l'achat de cet article d'inventaire ? (même ingrédient, ou même libellé hors catalogue) */
export const isRestockOf = (item: Pick<InventoryItem, "ingredientId" | "name">, shopping: Pick<ShoppingItem, "ingredientId">) =>
  item.ingredientId ? item.ingredientId === shopping.ingredientId : shopping.ingredientId === `divers:${slug(item.name)}`;

/** Racheté : remet « en stock » les articles « presque finis » correspondant à ces articles de courses cochés. */
export function clearLowBought(inventory: InventoryItem[] | undefined, bought: Pick<ShoppingItem, "ingredientId">[]): InventoryItem[] | undefined {
  if (!inventory?.some((i) => i.low && bought.some((b) => isRestockOf(i, b)))) return inventory;
  return inventory.map((i) => (i.low && bought.some((b) => isRestockOf(i, b)) ? { ...i, low: false } : i));
}
