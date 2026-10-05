import { matchProduct } from "./inventory";
import { CHANNEL_LABELS } from "./labels";
import type { Channel, Ingredient, ProductInfo, Recipe, ShoppingItem, WeekPlan } from "./schemas";
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
  "Divers",
];

export type BuildInput = {
  week: WeekPlan;
  recipes: Map<string, Recipe>;
  ingredients: Map<string, Ingredient>;
  /** Basiques du placard en stock : exclus de la liste. */
  pantryInStock: Set<string>;
  /** Liste précédente : on garde ce qui était coché / « j'ai déjà », et les articles ajoutés à la main. */
  previous?: ShoppingItem[];
  /** Ingrédients présents dans l'inventaire (placard, frigo) : proposés en « déjà à la maison ». */
  atHome?: Set<string>;
};

export function buildShoppingList({ week, recipes, ingredients, pantryInStock, previous = [], atHome = new Set() }: BuildInput): ShoppingItem[] {
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
  const prev = new Map(previous.filter((p) => !p.manual).map((p) => [p.ingredientId, p]));
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
      haveAlready: p?.haveAlready ?? atHome.has(id),
      checked: p?.checked ?? false,
      checkedBy: p?.checkedBy,
      updatedAt: p?.updatedAt,
    });
  }
  // Les articles ajoutés à la main restent, même quand les repas changent.
  items.push(...previous.filter((p) => p.manual));
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
      for (const it of g.items) lines.push(`${it.checked ? "☑" : "☐"} ${itemLine(it, ingredients)}`);
    }
  }
  return lines.join("\n");
}

// ——— Ajout à la main (texte libre, voix, partage) ———

const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
/** « carottes » → « carotte », « choux » → « chou ». */
const singular = (w: string) => w.replace(/(eaux|oux)$/, (m) => m.slice(0, -1)).replace(/s$/, "");

export type ParsedLine = { text: string; label: string; ingredientId?: string; qty?: number; unit?: "g" | "ml" | "piece" };

const UNITS: Record<string, { unit: "g" | "ml"; factor: number }> = {
  g: { unit: "g", factor: 1 },
  gr: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  l: { unit: "ml", factor: 1000 },
};

/** Retrouve l'ingrédient du catalogue le plus proche d'un libellé (« lait » → lait demi-écrémé). */
export function matchIngredient(label: string, ingredients: Ingredient[]): Ingredient | undefined {
  const words = norm(label).split(/[^a-z0-9]+/).filter((w) => w.length > 1).map(singular);
  if (!words.length) return undefined;
  let best: { ing: Ingredient; score: number } | undefined;
  for (const ing of ingredients) {
    const names = [ing.name, ing.plural ?? "", ing.pieceName ?? ""].map(norm).filter(Boolean);
    for (const n of names) {
      const nw = n.split(/[^a-z0-9]+/).filter(Boolean).map(singular);
      const hits = words.filter((w) => nw.includes(w)).length;
      if (!hits) continue;
      // Tous les mots du libellé retrouvés, et le nom du catalogue le plus court possible.
      const score = hits / words.length + (nw[0] === words[0] ? 0.5 : 0) - nw.length * 0.05;
      if (!best || score > best.score) best = { ing, score };
    }
  }
  return best && best.score >= 0.5 ? best.ing : undefined;
}

/** « 3 carottes, du lait et 500 g de farine » → une ligne par article, avec quantité si elle est dite. */
export function parseShoppingText(text: string, ingredients: Ingredient[]): ParsedLine[] {
  return text
    .split(/[,;\n]+|\s+et\s+|\s+\+\s+/i)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((raw) => {
      let rest = raw.replace(/^(ajoute[rz]?|ajout|achete[rz]?|il faut|prendre)\s+/i, "");
      let qty: number | undefined;
      let unit: ParsedLine["unit"];
      const m = rest.match(/^(\d+(?:[.,]\d+)?)\s*(kg|gr|g|cl|ml|l)?\b\s*/i);
      if (m) {
        const n = Number(m[1].replace(",", "."));
        const u = m[2] ? UNITS[m[2].toLowerCase()] : undefined;
        qty = u ? n * u.factor : n;
        unit = u ? u.unit : "piece";
        rest = rest.slice(m[0].length);
      } else if (/^(un|une)\s+/i.test(rest)) {
        qty = 1;
        unit = "piece";
      }
      // Article en tête de ligne : un mot entier (« le » de « lentilles » reste en place).
      const label = rest.replace(/^(?:(?:un|une|des|du|de la|de|les|le|la)\s+|(?:de l|d|l)['’]\s*)/i, "").trim() || raw;
      const ing = matchIngredient(label, ingredients);
      return { text: raw, label, ingredientId: ing?.id, qty, unit };
    });
}

const slug = (t: string) =>
  norm(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Article de liste ajouté à la main, à partir d'une ligne analysée. */
export function manualItem(weekStart: string, line: ParsedLine, ingredients: Map<string, Ingredient>, now = new Date(), id?: string): ShoppingItem {
  const ing = line.ingredientId ? ingredients.get(line.ingredientId) : undefined;
  const base = ing ? baseUnitOf(ing) : (line.unit ?? "piece");
  let qty = 0;
  if (ing && line.qty !== undefined && line.unit) qty = line.unit === base ? line.qty : line.unit === "piece" ? toBase(line.qty, "piece", ing) : toBase(line.qty, line.unit, ing);
  else if (!ing && line.qty !== undefined) qty = line.qty;
  return {
    id: id ?? `${weekStart}:manual:${ing?.id ?? slug(line.label)}:${now.getTime().toString(36)}`,
    ingredientId: ing?.id ?? `divers:${slug(line.label)}`,
    label: ing ? undefined : line.label,
    manual: true,
    qty,
    unit: base,
    channel: ing?.channel ?? "supermarket",
    aisle: ing?.aisle ?? "Divers",
    cost: ing && qty ? priceOf(qty, ing) : 0,
    recipeIds: [],
    haveAlready: false,
    checked: false,
    updatedAt: now.toISOString(),
  };
}

/** Nom affiché d'un article (catalogue ou libellé libre). */
export const itemName = (it: ShoppingItem, ingredients: Map<string, Ingredient>) => ingredients.get(it.ingredientId)?.name ?? it.label ?? it.ingredientId.replace(/^divers:/, "").replace(/-/g, " ");

/** « 3 carottes », « lait · 1 L », « papier toilette » : l'article en une ligne de texte. */
export function itemLine(it: ShoppingItem, ingredients: Map<string, Ingredient>): string {
  const ing = ingredients.get(it.ingredientId);
  const name = itemName(it, ingredients);
  if (!it.qty) return name;
  if (it.unit === "piece") return ing ? formatQty(it.qty, "piece", ing) : `${formatQty(it.qty, "piece")} ${name}`;
  return `${name} · ${formatQty(it.qty, it.unit)}`;
}

// ——— Scan en magasin ———

/** Mots qui ne disent rien du produit (« de », « bio »…), ignorés pour comparer un libellé et un nom de produit. */
const FILLER = new Set(["de", "du", "des", "le", "la", "les", "au", "aux", "et", "en", "avec", "sans", "pour", "sur", "bio", "nature", "naturel", "naturelle", "france", "francais", "francaise", "origine"]);
const meaningful = (t: string) =>
  norm(t)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !FILLER.has(w))
    .map(singular);

/**
 * Article de la liste correspondant à un produit scanné en magasin.
 * - même ingrédient du catalogue (reconnu prudemment par matchProduct : « pâte à tartiner » ne coche pas les pâtes) ;
 * - ou article ajouté à la main hors catalogue dont tous les mots se retrouvent dans le nom du produit
 *   (« papier toilette » ↔ « Papier toilette confort 12 rouleaux »).
 * Un article non coché passe devant un article déjà coché ; les articles « J'ai déjà » sont ignorés.
 */
export function matchShoppingItem(product: Pick<ProductInfo, "name">, items: ShoppingItem[], ingredients: Ingredient[]): ShoppingItem | undefined {
  const ing = matchProduct(product.name, ingredients);
  const words = new Set(meaningful(product.name));
  const byLabel = (it: ShoppingItem) => {
    if (!it.label) return false;
    const label = meaningful(it.label);
    return label.length > 0 && label.every((w) => words.has(w));
  };
  const hits = items.filter((it) => !it.haveAlready && ((ing && it.ingredientId === ing.id) || byLabel(it)));
  return hits.find((it) => !it.checked) ?? hits[0];
}
