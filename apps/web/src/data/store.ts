import {
  AI_SAMPLES,
  chooseEntry,
  choicesFor,
  pickableFor,
  unchooseEntry,
  buildShoppingList,
  checkWeek,
  DEFAULT_THRESHOLDS,
  generateWeek,
  householdPortions,
  INGREDIENTS,
  mondayOf,
  addDays,
  PANTRY_BASICS,
  RECIPES,
  type Household,
  type Ingredient,
  type Recipe,
  type RecipeStatus,
  type ShoppingItem,
  type WeekPlan,
} from "@mijote/shared";
import { useMemo, useSyncExternalStore } from "react";

// État de la vitrine, gardé dans le navigateur (localStorage). Aucun serveur : les hooks ci-dessous
// imitent la future API (useWeek, useShopping…) pour être remplacés par TanStack Query en phase 3.

export type State = {
  household: Household;
  /** Nom de cet appareil (qui a coché quoi). */
  member: string;
  statuses: Record<string, RecipeStatus>;
  /** Recettes ajoutées à la main ou gardées parmi les propositions. */
  customRecipes: Recipe[];
  /** Prix modifiés par le foyer (€ par unité de prix). */
  prices: Record<string, number>;
  weeks: Record<string, WeekPlan>;
  shopping: Record<string, ShoppingItem[]>;
  /** Basiques du placard : true = en stock. */
  pantry: Record<string, boolean>;
  /** Tâches de veille faites, par jour (clé AAAA-MM-JJ:tâche). */
  prepDone: Record<string, boolean>;
  /** Brouillons « IA » déjà proposés (simulation). */
  draftsSeen: string[];
  installSeen?: boolean;
};

// v2 : plus de petit-déjeuner, 6 choix par repas.
const KEY = "mijote-demo-v2";

export const today = () => new Date();
export { dayIndex } from "@mijote/shared";
export const thisWeek = () => mondayOf(today());
export const nextWeek = () => addDays(thisWeek(), 7);

const HOUSEHOLD: Household = { id: "foyer", name: "Notre foyer", adults: 2, babies: 1, dessertSlot: "dinner", priceThresholds: DEFAULT_THRESHOLDS };

function initial(): State {
  const base: State = {
    household: HOUSEHOLD,
    member: "Moi",
    statuses: {},
    customRecipes: [],
    prices: {},
    weeks: {},
    shopping: {},
    pantry: Object.fromEntries(PANTRY_BASICS.map((id) => [id, true])),
    prepDone: {},
    draftsSeen: [],
  };
  // La semaine en cours est déjà planifiée et validée : l'écran « Aujourd'hui » a du contenu dès l'ouverture.
  const draft = generateWeek(planContext(base), thisWeek(), 7);
  const week = { ...draft, status: "validated" as const, validatedAt: new Date().toISOString(), entries: draft.entries.map((e) => ({ ...e, confirmed: true })) };
  return withShopping({ ...base, weeks: { [week.weekStart]: week } }, week.weekStart);
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // Données illisibles : on repart de zéro.
  }
  return initial();
}

let state: State;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Navigation privée : la démo marche quand même, sans mémoire.
  }
  notify();
}

// Synchro en direct entre onglets / fenêtres du même navigateur (simule la synchro entre téléphones).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = JSON.parse(e.newValue) as State;
      notify();
    } catch {
      // ignoré
    }
  });
}

export const useStore = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  );

export const getState = () => state;

// ——— Données dérivées (mémorisées par référence) ———

const memo = <A extends object, R>(fn: (a: A) => R) => {
  const cache = new WeakMap<A, R>();
  return (a: A) => {
    if (!cache.has(a)) cache.set(a, fn(a));
    return cache.get(a)!;
  };
};

const ingredientsFor = memo((prices: Record<string, number>) => {
  const list: Ingredient[] = INGREDIENTS.map((i) => (prices[i.id] !== undefined ? { ...i, avgPrice: prices[i.id] } : i));
  return { list, byId: new Map(list.map((i) => [i.id, i])) };
});

const recipesFor = memo((s: State) => {
  const all = [...RECIPES, ...s.customRecipes].map((r) => ({ ...r, status: s.statuses[r.id] ?? r.status }));
  return { all, byId: new Map(all.map((r) => [r.id, r])) };
});

/** Les recettes utiles aux semaines déjà planifiées restent connues même si elles viennent des brouillons. */
const knownFor = memo((s: State) => {
  const { byId } = recipesFor(s);
  const map = new Map(byId);
  for (const r of AI_SAMPLES) if (!map.has(r.id)) map.set(r.id, r);
  return map;
});

export const ingredientsOf = (s: State) => ingredientsFor(s.prices);
export const recipesOf = (s: State) => recipesFor(s);
export const recipeMap = (s: State) => knownFor(s);

function planContext(s: State) {
  return { recipes: recipesFor(s).all, ingredients: ingredientsFor(s.prices).byId, household: s.household };
}

function withShopping(s: State, weekStart: string): State {
  const week = s.weeks[weekStart];
  if (!week || week.status !== "validated") return s;
  const pantryInStock = new Set(Object.entries(s.pantry).filter(([, v]) => v).map(([k]) => k));
  const items = buildShoppingList({ week, recipes: knownFor(s), ingredients: ingredientsFor(s.prices).byId, pantryInStock, previous: s.shopping[weekStart] });
  return { ...s, shopping: { ...s.shopping, [weekStart]: items } };
}

const refreshAllShopping = (s: State) => Object.keys(s.weeks).reduce(withShopping, s);

state = load();

// ——— Hooks « API » ———

export function useRecipes() {
  const s = useStore();
  return recipesOf(s);
}

export function useIngredients() {
  const s = useStore();
  return ingredientsOf(s);
}

export function useWeek(weekStart: string) {
  const s = useStore();
  const week = s.weeks[weekStart];
  const byId = recipeMap(s);
  const warnings = useMemo(() => (week ? checkWeek(week, byId, s.household.dessertSlot) : []), [week, byId, s.household.dessertSlot]);
  return { week, warnings, byId };
}

/** Les 6 choix d'un repas, à jour avec ce qui est déjà décidé dans la semaine. */
export function useChoices(weekStart: string, entryId: string | undefined) {
  const s = useStore();
  const week = s.weeks[weekStart];
  const byId = recipeMap(s);
  return useMemo(
    () => (week && entryId ? choicesFor(week, entryId, planContext(s)).map((id) => byId.get(id)).filter((r): r is Recipe => !!r) : []),
    [week, entryId, s, byId],
  );
}

/** Recettes à masquer / à signaler quand on cherche une autre recette pour un repas. */
export function usePickable(weekStart: string, entryId: string | undefined) {
  const s = useStore();
  const week = s.weeks[weekStart];
  return useMemo(() => (week && entryId ? pickableFor(week, entryId, planContext(s)) : { hidden: new Set<string>(), warns: new Set<string>() }), [week, entryId, s]);
}

export function useShopping(weekStart: string) {
  const s = useStore();
  return s.shopping[weekStart] ?? [];
}

// ——— Actions ———

const uid = () => Math.random().toString(36).slice(2, 9);

export const actions = {
  generate(weekStart: string, seed = Math.floor(Math.random() * 1e6)) {
    const previous = state.weeks[addDays(weekStart, -7)];
    const ctx = { ...planContext(state), previousRecipeIds: previous?.entries.map((e) => e.recipeId) };
    const week = generateWeek(ctx, weekStart, seed);
    const { [weekStart]: _drop, ...shopping } = state.shopping;
    void _drop;
    set({ ...state, weeks: { ...state.weeks, [weekStart]: week }, shopping });
  },

  /** Choisit la recette d'un repas ; les suggestions suivantes s'ajustent. */
  choose(weekStart: string, entryId: string, recipeId: string) {
    const week = state.weeks[weekStart];
    if (!week) return;
    const next = chooseEntry(week, entryId, recipeId, planContext(state));
    set(withShopping({ ...state, weeks: { ...state.weeks, [weekStart]: next } }, weekStart));
  },

  /** Remet un repas « à choisir ». */
  unchoose(weekStart: string, entryId: string) {
    const week = state.weeks[weekStart];
    if (!week) return;
    set(withShopping({ ...state, weeks: { ...state.weeks, [weekStart]: unchooseEntry(week, entryId, planContext(state)) } }, weekStart));
  },

  /** Rouvre une semaine validée : elle repasse en brouillon, la liste et ses coches sont gardées pour la prochaine validation. */
  reopen(weekStart: string) {
    const week = state.weeks[weekStart];
    if (!week) return;
    set({ ...state, weeks: { ...state.weeks, [weekStart]: { ...week, status: "draft", validatedAt: undefined } } });
  },

  validate(weekStart: string) {
    const week = state.weeks[weekStart];
    if (!week) return;
    const next = { ...week, status: "validated" as const, validatedAt: new Date().toISOString() };
    set(withShopping({ ...state, weeks: { ...state.weeks, [weekStart]: next } }, weekStart));
  },

  toggleChecked(weekStart: string, itemId: string) {
    const items = (state.shopping[weekStart] ?? []).map((i) =>
      i.id === itemId ? { ...i, checked: !i.checked, checkedBy: !i.checked ? state.member : undefined, updatedAt: new Date().toISOString() } : i,
    );
    set({ ...state, shopping: { ...state.shopping, [weekStart]: items } });
  },

  toggleHave(weekStart: string, itemId: string) {
    const items = (state.shopping[weekStart] ?? []).map((i) => (i.id === itemId ? { ...i, haveAlready: !i.haveAlready, updatedAt: new Date().toISOString() } : i));
    set({ ...state, shopping: { ...state.shopping, [weekStart]: items } });
  },

  setPantry(ingredientId: string, inStock: boolean) {
    set(refreshAllShopping({ ...state, pantry: { ...state.pantry, [ingredientId]: inStock } }));
  },

  setStatus(recipeId: string, status: RecipeStatus) {
    set({ ...state, statuses: { ...state.statuses, [recipeId]: status } });
  },

  addRecipe(recipe: Recipe) {
    set({ ...state, customRecipes: [...state.customRecipes.filter((r) => r.id !== recipe.id), recipe] });
  },

  markDraftsSeen(ids: string[]) {
    set({ ...state, draftsSeen: [...new Set([...state.draftsSeen, ...ids])] });
  },

  updateHousehold(patch: Partial<Household>) {
    const household = { ...state.household, ...patch };
    const portions = householdPortions(household);
    const weeks = Object.fromEntries(Object.entries(state.weeks).map(([k, w]) => [k, { ...w, entries: w.entries.map((e) => ({ ...e, servings: portions })) }]));
    set(refreshAllShopping({ ...state, household, weeks }));
  },

  setMember(member: string) {
    set({ ...state, member });
  },

  setPrice(ingredientId: string, price: number | undefined) {
    const { [ingredientId]: _old, ...rest } = state.prices;
    void _old;
    set(refreshAllShopping({ ...state, prices: price === undefined ? rest : { ...rest, [ingredientId]: price } }));
  },

  togglePrep(key: string) {
    set({ ...state, prepDone: { ...state.prepDone, [key]: !state.prepDone[key] } });
  },

  setInstallSeen() {
    set({ ...state, installSeen: true });
  },

  exportJSON() {
    return JSON.stringify({ app: "mijote", version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
  },

  importJSON(text: string) {
    const data = JSON.parse(text) as { app?: string; state?: State };
    if (data.app !== "mijote" || !data.state?.household) throw new Error("Fichier de sauvegarde Mijoté invalide");
    set(data.state);
  },

  reset() {
    set(initial());
  },

  newId: uid,
};
