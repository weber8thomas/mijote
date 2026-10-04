import type { Ingredient, ShoppingItem } from "./schemas";

// Préparation v2 (panier drive Leclerc / Carrefour / Super U). Interface seulement : rien n'est implémenté en v1.

export type BasketLine = { item: ShoppingItem; ingredient: Ingredient; productRef?: string; matched: boolean };

export interface BasketProvider {
  readonly id: string;
  readonly label: string;
  /** Associe chaque article à un produit du drive (via ean ou driveSearchTerm). */
  match(items: ShoppingItem[], ingredients: Map<string, Ingredient>): Promise<BasketLine[]>;
  /** Remplit le panier et renvoie l'URL du panier à valider par l'utilisateur. */
  fill(lines: BasketLine[]): Promise<{ cartUrl: string; missing: BasketLine[] }>;
}
