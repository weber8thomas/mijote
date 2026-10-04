import type { Ingredient, QtyUnit } from "./schemas";

// Unités normalisées : tout s'agrège en g, ml ou pièces.
export type BaseUnit = "g" | "ml" | "piece";

/** Équivalences approximatives des mesures de cuisine (densité 1). */
const SPOON: Record<"cs" | "cc" | "pincee", number> = { cs: 15, cc: 5, pincee: 0.5 };

/** Unité de base dans laquelle on agrège un ingrédient (celle de son prix). */
export function baseUnitOf(ing: Ingredient): BaseUnit {
  return ing.unit === "piece" ? "piece" : ing.unit === "L" ? "ml" : "g";
}

/** Convertit une quantité de recette vers l'unité de base de l'ingrédient. */
export function toBase(qty: number, unit: QtyUnit, ing: Ingredient): number {
  const base = baseUnitOf(ing);
  const mass = unit === "g" || unit === "ml" ? qty : unit === "piece" ? undefined : qty * SPOON[unit];
  if (base === "piece") {
    if (unit === "piece") return qty;
    return (mass ?? 0) / (ing.pieceWeight ?? 100);
  }
  if (unit === "piece") return qty * (ing.pieceWeight ?? 100);
  return mass ?? 0;
}

/** Prix d'une quantité exprimée en unité de base. */
export function priceOf(qtyBase: number, ing: Ingredient): number {
  if (ing.unit === "piece") return qtyBase * ing.avgPrice;
  return (qtyBase / 1000) * ing.avgPrice;
}

const nf = (n: number, max = 1) => n.toLocaleString("fr-FR", { maximumFractionDigits: max });

/** Arrondi d'achat : on n'achète pas 137 g de poireaux. */
export function roundForShopping(qty: number, unit: BaseUnit): number {
  if (unit === "piece") return Math.max(1, Math.ceil(qty - 0.15));
  if (qty < 20) return Math.ceil(qty);
  if (qty < 250) return Math.ceil(qty / 10) * 10;
  if (qty < 1000) return Math.ceil(qty / 50) * 50;
  return Math.ceil(qty / 100) * 100;
}

/** Affichage humain d'une quantité en unité de base : « 1,2 kg », « 300 g », « 3 ». */
export function formatQty(qty: number, unit: BaseUnit, ing?: Pick<Ingredient, "name" | "plural">): string {
  if (unit === "piece") {
    const n = Math.round(qty * 2) / 2;
    const label = ing ? (n > 1 ? (ing.plural ?? ing.name) : ing.name) : "";
    return `${nf(n)}${label ? ` ${label}` : ""}`.trim();
  }
  if (unit === "g") return qty >= 1000 ? `${nf(qty / 1000, 2)} kg` : `${nf(qty, 0)} g`;
  return qty >= 1000 ? `${nf(qty / 1000, 2)} L` : `${nf(qty, 0)} ml`;
}

/** Affichage d'une quantité de recette dans son unité d'origine. */
export function formatRecipeQty(qty: number, unit: QtyUnit): string {
  const n = unit === "g" || unit === "ml" ? Math.round(qty) : Math.round(qty * 4) / 4;
  const pretty = n === 0.25 ? "¼" : n === 0.5 ? "½" : n === 0.75 ? "¾" : nf(n, 2);
  switch (unit) {
    case "g":
      return n >= 1000 ? `${nf(n / 1000, 2)} kg` : `${pretty} g`;
    case "ml":
      return n >= 1000 ? `${nf(n / 1000, 2)} L` : `${pretty} ml`;
    case "cs":
      return `${pretty} c. à soupe`;
    case "cc":
      return `${pretty} c. à café`;
    case "pincee":
      return n > 1 ? `${pretty} pincées` : "1 pincée";
    case "piece":
      return pretty;
  }
}
