// État du foyer et actions, partagés entre le téléphone et le serveur.
// Chaque action est une donnée (nom + paramètres) ; applyAction est une fonction pure et déterministe :
// la date, la graine du planificateur et les identifiants sont dans l'action. Rejouer le même journal
// d'actions donne donc le même état, sur un téléphone hors ligne comme sur le serveur.

import { AI_SAMPLES, INGREDIENTS, PANTRY_BASICS, RECIPES } from "./content";
import { addDays, dayIndex, mondayOf } from "./dates";
import type { LocalChange } from "./ha-sync";
import { clearLowBought } from "./inventory";
import { householdPortions } from "./pricing";
import { chooseEntry, generateWeek, rerollChoices, unchooseEntry, type PlanContext } from "./planner";
import { DEFAULT_THRESHOLDS } from "./pricing";
import type { Household, Ingredient, InventoryItem, ProductInfo, Recipe, RecipeStatus, ShoppingItem, WeekPlan } from "./schemas";
import { buildShoppingList, manualItem, parseShoppingText } from "./shopping";

/** Un produit retenu : sa fiche, quand on l'a vu, et la marque du foyer (favori, à éviter pour bébé). */
export type ProductMemo = { product: ProductInfo; firstSeen: string; lastSeen: string; scans: number; mark?: "favori" | "eviter" };

/** Ce que partagent tous les appareils du foyer. */
export type HouseholdState = {
  household: Household;
  statuses: Record<string, RecipeStatus>;
  /** Recettes ajoutées à la main ou gardées parmi les propositions. */
  customRecipes: Recipe[];
  /** Prix modifiés par le foyer (€ par unité de prix). */
  prices: Record<string, number>;
  weeks: Record<string, WeekPlan>;
  shopping: Record<string, ShoppingItem[]>;
  /** Basiques du placard : true = en stock. */
  pantry: Record<string, boolean>;
  /** Idées de la démo déjà proposées. */
  draftsSeen: string[];
  /** Ce qu'il y a à la maison (placard, frigo, congélateur). */
  inventory?: InventoryItem[];
  /** Recettes proposées par Claude, pas encore gardées ni jetées. */
  aiDrafts?: Recipe[];
  /** Ingrédients créés par l'IA pour ses recettes (« à vérifier »). */
  customIngredients?: Ingredient[];
  /** Produits scannés ou consultés (Open Food Facts), par code-barres. */
  products?: Record<string, ProductMemo>;
};

export const DEFAULT_HOUSEHOLD: Household = { id: "foyer", name: "Notre foyer", adults: 2, babies: 1, dessertSlot: "dinner", priceThresholds: DEFAULT_THRESHOLDS };

// ——— Données dérivées (mémorisées par référence) ———

const memo = <A extends object, R>(fn: (a: A) => R) => {
  const cache = new WeakMap<A, R>();
  return (a: A) => {
    if (!cache.has(a)) cache.set(a, fn(a));
    return cache.get(a)!;
  };
};

const NO_INGREDIENTS: Ingredient[] = [];
let ingredientsCache: { prices: Record<string, number>; custom: Ingredient[]; value: { list: Ingredient[]; byId: Map<string, Ingredient> } } | undefined;

/** Catalogue + ingrédients ajoutés par l'IA (« à vérifier »), avec les prix du foyer. */
export function ingredientsOfState(s: Pick<HouseholdState, "prices" | "customIngredients">) {
  const custom = s.customIngredients ?? NO_INGREDIENTS;
  if (ingredientsCache?.prices === s.prices && ingredientsCache.custom === custom) return ingredientsCache.value;
  const known = new Set(INGREDIENTS.map((i) => i.id));
  const list: Ingredient[] = [...INGREDIENTS, ...custom.filter((i) => !known.has(i.id))].map((i) => (s.prices[i.id] !== undefined ? { ...i, avgPrice: s.prices[i.id] } : i));
  const value = { list, byId: new Map(list.map((i) => [i.id, i])) };
  ingredientsCache = { prices: s.prices, custom, value };
  return value;
}

/** Recettes du foyer (seed + ajoutées), avec leur statut (favori, écartée). */
export const recipesOfState = memo((s: HouseholdState) => {
  const all = [...RECIPES, ...s.customRecipes].map((r) => ({ ...r, status: s.statuses[r.id] ?? r.status }));
  return { all, byId: new Map(all.map((r) => [r.id, r])) };
});

/** Toutes les recettes connues, y compris les brouillons déjà placés dans une semaine. */
export const recipeMapOf = memo((s: HouseholdState) => {
  const map = new Map(recipesOfState(s).byId);
  for (const r of [...AI_SAMPLES, ...(s.aiDrafts ?? [])]) if (!map.has(r.id)) map.set(r.id, r);
  return map;
});

export const planContextOf = (s: HouseholdState): PlanContext => ({ recipes: recipesOfState(s).all, ingredients: ingredientsOfState(s).byId, household: s.household });

/** Recalcule la liste de courses d'une semaine validée (les coches et les ajouts à la main sont gardés). */
export function withShopping<S extends HouseholdState>(s: S, weekStart: string): S {
  const week = s.weeks[weekStart];
  if (!week || week.status !== "validated") return s;
  const pantryInStock = new Set(Object.entries(s.pantry).filter(([, v]) => v).map(([k]) => k));
  // « Presque fini » n'est plus à la maison : les recettes qui en ont besoin le remettent aux courses.
  const atHome = new Set((s.inventory ?? []).flatMap((i) => (i.ingredientId && !i.low ? [i.ingredientId] : [])));
  const items = buildShoppingList({ week, recipes: recipeMapOf(s), ingredients: ingredientsOfState(s).byId, pantryInStock, atHome, previous: s.shopping[weekStart] });
  return { ...s, shopping: { ...s.shopping, [weekStart]: items } };
}

export const refreshAllShopping = <S extends HouseholdState>(s: S): S => Object.keys(s.weeks).reduce(withShopping, s);

/** Semaine des courses en cours : la suivante si elle est validée et qu'on est en fin de semaine (vendredi → dimanche). */
export function shoppingWeekOf(s: Pick<HouseholdState, "weeks">, now: Date) {
  const thisWeek = mondayOf(now);
  const next = addDays(thisWeek, 7);
  return s.weeks[next]?.status === "validated" && dayIndex(now) >= 4 ? next : thisWeek;
}

/** État de départ : la semaine en cours est déjà planifiée et validée, l'accueil a du contenu dès l'ouverture. */
export function initialHousehold(now: Date): HouseholdState {
  const base: HouseholdState = {
    household: DEFAULT_HOUSEHOLD,
    statuses: {},
    customRecipes: [],
    prices: {},
    weeks: {},
    shopping: {},
    pantry: Object.fromEntries(PANTRY_BASICS.map((id) => [id, true])),
    draftsSeen: [],
    inventory: [],
  };
  const draft = generateWeek(planContextOf(base), mondayOf(now), 7);
  const week: WeekPlan = { ...draft, status: "validated", validatedAt: now.toISOString(), entries: draft.entries.map((e) => ({ ...e, confirmed: true })) };
  return withShopping({ ...base, weeks: { [week.weekStart]: week } }, week.weekStart);
}

// ——— Actions ———

/** Les actions du foyer. `at` : date ISO de l'action (posée par l'appareil qui l'a faite). */
export type Action =
  | { type: "generate"; weekStart: string; seed: number }
  | { type: "reroll"; weekStart: string; entryId: string }
  | { type: "choose"; weekStart: string; entryId: string; recipeId: string }
  | { type: "unchoose"; weekStart: string; entryId: string }
  | { type: "reopen"; weekStart: string }
  | { type: "validate"; weekStart: string; at: string }
  | { type: "setChecked"; weekStart: string; itemId: string; checked: boolean; by?: string; at: string }
  | { type: "setHave"; weekStart: string; itemId: string; have: boolean; at: string }
  | { type: "addToShopping"; weekStart: string; text: string; at: string }
  | { type: "haChanges"; weekStart: string; changes: (LocalChange & { id?: string })[]; at: string }
  | { type: "removeShoppingItem"; weekStart: string; itemId: string }
  | { type: "restoreShoppingItem"; weekStart: string; item: ShoppingItem }
  | { type: "addInventory"; items: InventoryItem[] }
  | { type: "updateInventory"; id: string; patch: Partial<InventoryItem> }
  | { type: "removeInventory"; id: string }
  | { type: "rememberProduct"; code: string; product: ProductInfo; scanned: boolean; at: string }
  | { type: "markProduct"; code: string; mark: ProductMemo["mark"] }
  | { type: "forgetProduct"; code: string }
  | { type: "setPantry"; ingredientId: string; inStock: boolean }
  | { type: "setStatus"; recipeId: string; status: RecipeStatus }
  | { type: "addIngredients"; list: Ingredient[] }
  | { type: "addAiDrafts"; recipes: Recipe[] }
  | { type: "removeAiDraft"; id: string }
  | { type: "addRecipe"; recipe: Recipe }
  | { type: "markDraftsSeen"; ids: string[] }
  | { type: "updateHousehold"; patch: Partial<Household> }
  | { type: "setPrice"; ingredientId: string; price?: number }
  | { type: "replaceHousehold"; state: HouseholdState };

export type ActionType = Action["type"];

/** Les noms d'actions connus (contrôle des actions reçues par le serveur). */
const KNOWN: Record<ActionType, true> = {
  generate: true,
  reroll: true,
  choose: true,
  unchoose: true,
  reopen: true,
  validate: true,
  setChecked: true,
  setHave: true,
  addToShopping: true,
  haChanges: true,
  removeShoppingItem: true,
  restoreShoppingItem: true,
  addInventory: true,
  updateInventory: true,
  removeInventory: true,
  rememberProduct: true,
  markProduct: true,
  forgetProduct: true,
  setPantry: true,
  setStatus: true,
  addIngredients: true,
  addAiDrafts: true,
  removeAiDraft: true,
  addRecipe: true,
  markDraftsSeen: true,
  updateHousehold: true,
  setPrice: true,
  replaceHousehold: true,
};
export const isAction = (a: unknown): a is Action => !!a && typeof a === "object" && typeof (a as { type?: unknown }).type === "string" && (a as { type: string }).type in KNOWN;

/** Ce qu'une action renvoie à l'écran qui l'a lancée (articles ajoutés…). */
export type ActionResult = { items?: ShoppingItem[]; inventory?: InventoryItem[] };

/** Identifiant d'un article dicté dans Home Assistant (le même sur tous les appareils). */
export const haItemId = (weekStart: string, uid: string) => `${weekStart}:ha:${uid}`;

const setShopping = <S extends HouseholdState>(s: S, weekStart: string, items: ShoppingItem[]): S => ({ ...s, shopping: { ...s.shopping, [weekStart]: items } });
const mapItems = <S extends HouseholdState>(s: S, weekStart: string, fn: (i: ShoppingItem) => ShoppingItem): S => setShopping(s, weekStart, (s.shopping[weekStart] ?? []).map(fn));
const omit = <T extends Record<string, unknown>>(o: T, key: string): T => {
  const { [key]: _gone, ...rest } = o;
  void _gone;
  return rest as T;
};

/** Applique une action et dit ce qu'elle a produit. Pure : même état + même action → même résultat. */
export function applyActionWithResult<S extends HouseholdState>(s: S, a: Action): { state: S; result: ActionResult } {
  const done = (state: S, result: ActionResult = {}) => ({ state, result });
  switch (a.type) {
    case "generate": {
      const previous = s.weeks[addDays(a.weekStart, -7)];
      const week = generateWeek({ ...planContextOf(s), previousRecipeIds: previous?.entries.map((e) => e.recipeId) }, a.weekStart, a.seed);
      return done({ ...s, weeks: { ...s.weeks, [a.weekStart]: week }, shopping: omit(s.shopping, a.weekStart) });
    }
    case "reroll": {
      const week = s.weeks[a.weekStart];
      return done(week ? { ...s, weeks: { ...s.weeks, [a.weekStart]: rerollChoices(week, a.entryId, planContextOf(s)) } } : s);
    }
    case "choose":
    case "unchoose": {
      const week = s.weeks[a.weekStart];
      if (!week) return done(s);
      const next = a.type === "choose" ? chooseEntry(week, a.entryId, a.recipeId, planContextOf(s)) : unchooseEntry(week, a.entryId, planContextOf(s));
      return done(withShopping({ ...s, weeks: { ...s.weeks, [a.weekStart]: next } }, a.weekStart));
    }
    case "reopen": {
      const week = s.weeks[a.weekStart];
      return done(week ? { ...s, weeks: { ...s.weeks, [a.weekStart]: { ...week, status: "draft", validatedAt: undefined } } } : s);
    }
    case "validate": {
      const week = s.weeks[a.weekStart];
      return done(week ? withShopping({ ...s, weeks: { ...s.weeks, [a.weekStart]: { ...week, status: "validated", validatedAt: a.at } } }, a.weekStart) : s);
    }
    case "setChecked": {
      const next = mapItems(s, a.weekStart, (i) => (i.id === a.itemId ? { ...i, checked: a.checked, checkedBy: a.checked ? a.by : undefined, updatedAt: a.at } : i));
      // Racheté : un article « presque fini » du même nom repasse en stock (sans recalculer : l'article coché reste dans la liste).
      const bought = a.checked ? (s.shopping[a.weekStart] ?? []).filter((i) => i.id === a.itemId) : [];
      return done(bought.length ? { ...next, inventory: clearLowBought(next.inventory, bought) } : next);
    }
    case "setHave":
      return done(mapItems(s, a.weekStart, (i) => (i.id === a.itemId ? { ...i, haveAlready: a.have, updatedAt: a.at } : i)));
    case "addToShopping": {
      const { list, byId } = ingredientsOfState(s);
      const lines = parseShoppingText(a.text, list);
      if (!lines.length) return done(s, { items: [] });
      const current = s.shopping[a.weekStart] ?? [];
      // Déjà dans la liste (pour une recette) : on le remet à acheter plutôt que de le doubler.
      const revive = new Set<string>();
      const fresh = lines.filter((l) => {
        const hit = l.ingredientId && current.find((i) => i.ingredientId === l.ingredientId);
        if (hit) revive.add(hit.id);
        return !hit;
      });
      const t = Date.parse(a.at);
      const added = fresh.map((l, i) => manualItem(a.weekStart, l, byId, new Date(t + i)));
      const kept = current.map((i) => (revive.has(i.id) ? { ...i, haveAlready: false, checked: false, checkedBy: undefined, updatedAt: a.at } : i));
      return done(setShopping(s, a.weekStart, [...kept, ...added]), { items: [...kept.filter((i) => revive.has(i.id)), ...added] });
    }
    case "haChanges": {
      const { list, byId } = ingredientsOfState(s);
      let items = [...(s.shopping[a.weekStart] ?? [])];
      let inv = s.inventory;
      for (const c of a.changes) {
        if (c.kind === "check" && c.checked) inv = clearLowBought(inv, items.filter((it) => it.id === c.itemId));
        if (c.kind === "check") items = items.map((it) => (it.id === c.itemId ? { ...it, checked: c.checked, checkedBy: c.checked ? "Home Assistant" : undefined, updatedAt: a.at } : it));
        if (c.kind === "remove") items = items.filter((it) => it.id !== c.itemId);
        if (c.kind === "have") items = items.map((it) => (it.id === c.itemId ? { ...it, haveAlready: true, updatedAt: a.at } : it));
        if (c.kind === "create") {
          const id = c.id ?? haItemId(a.weekStart, c.uid);
          if (items.some((it) => it.id === id)) continue;
          // Le texte dicté reste tel quel (« lait d'avoine bio ») ; on retrouve juste l'ingrédient pour le rayon.
          const [line] = parseShoppingText(c.summary, list);
          items.push({ ...manualItem(a.weekStart, { ...(line ?? { text: c.summary }), label: c.summary }, byId, new Date(a.at), id), checked: c.done, updatedAt: a.at });
        }
      }
      return done(inv === s.inventory ? setShopping(s, a.weekStart, items) : { ...setShopping(s, a.weekStart, items), inventory: inv });
    }
    case "removeShoppingItem":
      return done(setShopping(s, a.weekStart, (s.shopping[a.weekStart] ?? []).filter((i) => i.id !== a.itemId)));
    case "restoreShoppingItem": {
      const list = s.shopping[a.weekStart] ?? [];
      return done(list.some((i) => i.id === a.item.id) ? s : setShopping(s, a.weekStart, [...list, a.item]));
    }
    case "addInventory": {
      const have = new Set((s.inventory ?? []).map((i) => i.id));
      const added = a.items.filter((i) => !have.has(i.id));
      return done(refreshAllShopping({ ...s, inventory: [...(s.inventory ?? []), ...added] }), { inventory: added });
    }
    case "updateInventory":
      return done(refreshAllShopping({ ...s, inventory: (s.inventory ?? []).map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) }));
    case "removeInventory":
      return done(refreshAllShopping({ ...s, inventory: (s.inventory ?? []).filter((i) => i.id !== a.id) }));
    case "rememberProduct": {
      const old = s.products?.[a.code];
      const memo: ProductMemo = { product: a.product, firstSeen: old?.firstSeen ?? a.at, lastSeen: a.at, scans: (old?.scans ?? 0) + (a.scanned ? 1 : 0), mark: old?.mark };
      return done({ ...s, products: { ...s.products, [a.code]: memo } });
    }
    case "markProduct": {
      const old = s.products?.[a.code];
      return done(old ? { ...s, products: { ...s.products, [a.code]: { ...old, mark: a.mark } } } : s);
    }
    case "forgetProduct":
      return done({ ...s, products: omit(s.products ?? {}, a.code) });
    case "setPantry":
      return done(refreshAllShopping({ ...s, pantry: { ...s.pantry, [a.ingredientId]: a.inStock } }));
    case "setStatus":
      return done({ ...s, statuses: { ...s.statuses, [a.recipeId]: a.status } });
    case "addIngredients": {
      const have = new Set(ingredientsOfState(s).list.map((i) => i.id));
      const fresh = a.list.filter((i) => !have.has(i.id));
      return done(fresh.length ? { ...s, customIngredients: [...(s.customIngredients ?? []), ...fresh] } : s);
    }
    case "addAiDrafts":
      return done({ ...s, aiDrafts: [...(s.aiDrafts ?? []).filter((r) => !a.recipes.some((x) => x.id === r.id)), ...a.recipes] });
    case "removeAiDraft":
      return done({ ...s, aiDrafts: (s.aiDrafts ?? []).filter((r) => r.id !== a.id) });
    case "addRecipe":
      return done({ ...s, customRecipes: [...s.customRecipes.filter((r) => r.id !== a.recipe.id), a.recipe] });
    case "markDraftsSeen":
      return done({ ...s, draftsSeen: [...new Set([...s.draftsSeen, ...a.ids])] });
    case "updateHousehold": {
      const household = { ...s.household, ...a.patch };
      const portions = householdPortions(household);
      const weeks = Object.fromEntries(Object.entries(s.weeks).map(([k, w]) => [k, { ...w, entries: w.entries.map((e) => ({ ...e, servings: portions })) }]));
      return done(refreshAllShopping({ ...s, household, weeks }));
    }
    case "setPrice": {
      const prices = a.price === undefined ? omit(s.prices, a.ingredientId) : { ...s.prices, [a.ingredientId]: a.price };
      return done(refreshAllShopping({ ...s, prices }));
    }
    case "replaceHousehold":
      return done({ ...s, ...pickHousehold(a.state), inventory: a.state.inventory ?? [] });
  }
}

export const applyAction = <S extends HouseholdState>(s: S, a: Action): S => applyActionWithResult(s, a).state;

const HOUSEHOLD_KEYS = ["household", "statuses", "customRecipes", "prices", "weeks", "shopping", "pantry", "draftsSeen", "inventory", "aiDrafts", "customIngredients", "products"] as const;

/** La part partagée d'un état (sans ce qui est propre à un appareil). */
export function pickHousehold(s: HouseholdState): HouseholdState {
  const out: Record<string, unknown> = {};
  for (const k of HOUSEHOLD_KEYS) if (s[k] !== undefined) out[k] = s[k];
  return out as HouseholdState;
}
