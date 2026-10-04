import { CHANNEL_LABELS } from "./labels";
import type { Channel, Ingredient, Recipe, ShoppingItem, WeekPlan } from "./schemas";
import { baseUnitOf, formatQty, priceOf, roundForShopping, toBase } from "./units";

// Liste de courses : agrégation des quantités de la semaine, par canal (marché / supermarché) et par rayon.

/** Ordre des rayons dans le magasin (sinon ordre alphabétique). */
export const AISLE_ORDER = [
  "Fruits",
  "Légumes",
  "Herbes",
  "Boucherie",
  "Volaille",
  "Poissonnerie",
  "Œufs",
  "Crèmerie",
  "Fromages",
  "Boulangerie",
  "Épicerie salée",
  "Conserves",
  "Féculents",
  "Légumineuses",
  "Céréales & petit-déj",
  "Épicerie sucrée",
  "Huiles & condiments",
  "Épices",
  "Bébé",
  "Surgelés",
];

export type BuildInput = {
  week: WeekPlan;
  recipes: Map<string, Recipe>;
  ingredients: Map<string, Ingredient>;
  /** Basiques du placard en stock : exclus de la liste. */
  pantryInStock: Set<string>;
  /** Liste précédente : on garde ce qui était coché / « j'ai déjà ». */
  previous?: ShoppingItem[];
};

export function buildShoppingList({ week, recipes, ingredients, pantryInStock, previous = [] }: BuildInput): ShoppingItem[] {
  const acc = new Map<string, { qty: number; recipeIds: Set<string> }>();
  for (const e of week.entries) {
    const r = recipes.get(e.recipeId);
    if (!r) continue;
    const factor = e.servings / r.servingsBase;
    for (const ri of r.ingredients) {
      const ing = ingredients.get(ri.ingredientId);
      if (!ing) continue;
      if (ing.pantryBasic && pantryInStock.has(ing.id)) continue;
      // La portion bébé ne grandit pas avec le nombre d'adultes.
      const q = ri.babyPortionOnly ? toBase(ri.qty, ri.unit, ing) : toBase(ri.qty, ri.unit, ing) * factor;
      const cur = acc.get(ing.id) ?? { qty: 0, recipeIds: new Set<string>() };
      cur.qty += q;
      cur.recipeIds.add(r.id);
      acc.set(ing.id, cur);
    }
  }
  const prev = new Map(previous.map((p) => [p.ingredientId, p]));
  const items: ShoppingItem[] = [];
  for (const [id, { qty, recipeIds }] of acc) {
    const ing = ingredients.get(id)!;
    const unit = baseUnitOf(ing);
    const rounded = roundForShopping(qty, unit);
    const p = prev.get(id);
    items.push({
      id: `${week.weekStart}:${id}`,
      ingredientId: id,
      qty: rounded,
      unit,
      channel: ing.channel,
      aisle: ing.aisle,
      cost: priceOf(rounded, ing),
      recipeIds: [...recipeIds],
      haveAlready: p?.haveAlready ?? false,
      checked: p?.checked ?? false,
      checkedBy: p?.checkedBy,
      updatedAt: p?.updatedAt,
    });
  }
  return sortItems(items, ingredients);
}

const aisleRank = (a: string) => {
  const i = AISLE_ORDER.indexOf(a);
  return i < 0 ? AISLE_ORDER.length : i;
};

export function sortItems(items: ShoppingItem[], ingredients: Map<string, Ingredient>): ShoppingItem[] {
  return [...items].sort(
    (a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.aisle.localeCompare(b.aisle) || (ingredients.get(a.ingredientId)?.name ?? "").localeCompare(ingredients.get(b.ingredientId)?.name ?? ""),
  );
}

/** Regroupe par rayon, dans l'ordre du magasin. */
export function groupByAisle(items: ShoppingItem[]): { aisle: string; items: ShoppingItem[] }[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const it of items) groups.set(it.aisle, [...(groups.get(it.aisle) ?? []), it]);
  return [...groups].map(([aisle, items]) => ({ aisle, items })).sort((a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.aisle.localeCompare(b.aisle));
}

/** Total estimé de ce qui reste à acheter (hors « j'ai déjà »). */
export function totals(items: ShoppingItem[]): Record<Channel, number> {
  const t: Record<Channel, number> = { market: 0, supermarket: 0 };
  for (const it of items) if (!it.haveAlready) t[it.channel] += it.cost;
  return t;
}

/** Liste en texte brut, à partager par message. */
export function shoppingText(items: ShoppingItem[], ingredients: Map<string, Ingredient>, title = "Courses"): string {
  const lines = [`🧺 ${title}`];
  for (const channel of ["market", "supermarket"] as const) {
    const list = items.filter((i) => i.channel === channel && !i.haveAlready);
    if (!list.length) continue;
    lines.push("", `— ${CHANNEL_LABELS[channel]} —`);
    for (const g of groupByAisle(list)) {
      lines.push(`${g.aisle} :`);
      for (const it of g.items) {
        const ing = ingredients.get(it.ingredientId)!;
        lines.push(`${it.checked ? "☑" : "☐"} ${it.unit === "piece" ? formatQty(it.qty, it.unit, ing) : `${ing.name} · ${formatQty(it.qty, it.unit)}`}`);
      }
    }
  }
  return lines.join("\n");
}
