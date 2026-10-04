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

/** 2,5 → « 2½ », 0,75 → « ¾ » (au quart près). */
export function fraction(n: number): string {
  const q = Math.round(n * 4) / 4;
  const whole = Math.floor(q);
  const part = { 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" }[q - whole as 0 | 0.25 | 0.5 | 0.75];
  return whole ? `${whole}${part}` : part || "0";
}

/** Arrondi lisible des masses et volumes : 188 g → 190 g. */
const roundMass = (n: number) => (n < 20 ? Math.round(n) : n < 250 ? Math.round(n / 5) * 5 : Math.round(n / 10) * 10);

/** Affichage d'une quantité de recette dans son unité d'origine. */
export function formatRecipeQty(qty: number, unit: QtyUnit): string {
  switch (unit) {
    case "g":
    case "ml": {
      const n = roundMass(qty);
      const big = unit === "g" ? "kg" : "L";
      return n >= 1000 ? `${nf(n / 1000, 2)} ${big}` : `${n} ${unit}`;
    }
    case "cs":
      return `${fraction(qty)} c. à soupe`;
    case "cc":
      return `${fraction(qty)} c. à café`;
    case "pincee":
      return qty > 1.5 ? `${Math.round(qty)} pincées` : "1 pincée";
    case "piece":
      return fraction(qty);
  }
}

/** Arrondi d'affichage d'un nombre de pièces : au demi près, à l'unité supérieure pour les petites pièces (gousse d'ail). */
export function roundPieces(qty: number, ing?: Pick<Ingredient, "pieceWeight">): number {
  if (ing?.pieceWeight !== undefined && ing.pieceWeight < 20) return Math.max(1, Math.ceil(qty - 0.1));
  return Math.max(0.5, Math.round(qty * 2) / 2);
}

/** « 2 carottes », « 1 gousse d'ail », « 300 g de… » : quantité de recette + nom d'ingrédient accordé. */
export function ingredientLine(qty: number, unit: QtyUnit, ing: Pick<Ingredient, "name" | "plural" | "pieceName" | "pieceNamePlural" | "pieceWeight">): { qty: string; name: string } {
  if (unit !== "piece") return { qty: formatRecipeQty(qty, unit), name: ing.name };
  const n = roundPieces(qty, ing);
  const many = n > 1;
  const name = ing.pieceName ? (many ? (ing.pieceNamePlural ?? ing.pieceName) : ing.pieceName) : many ? (ing.plural ?? ing.name) : ing.name;
  return { qty: fraction(n), name };
}
