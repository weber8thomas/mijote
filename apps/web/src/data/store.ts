import {
  applyActionWithResult,
  checkWeek,
  choicesFor,
  haItemId,
  ingredientsOfState,
  initialHousehold,
  itemLine,
  mondayOf,
  addDays,
  pickableFor,
  pickHousehold,
  planContextOf,
  recipeMapOf,
  recipesOfState,
  shoppingWeekOf,
  type Action,
  type ActionResult,
  type HouseholdState,
  type LocalChange,
  type Household,
  type InventoryItem,
  type ProductInfo,
  type ProductMemo,
  type Ingredient,
  type Recipe,
  type RecipeStatus,
  type ShoppingItem,
} from "@mijote/shared";
import { useMemo, useSyncExternalStore } from "react";

// État de l'appli : la part du foyer (partagée, modifiée seulement par des actions, voir packages/shared/src/state.ts)
// + ce qui est propre à cet appareil. Vitrine : tout reste dans le navigateur (localStorage).
// Serveur du foyer (data/sync.ts) : chaque action part aussi au serveur, qui la renvoie à l'autre téléphone.

export type { ProductMemo };

/** Ce qui reste propre à cet appareil (jamais envoyé au serveur). */
export type DeviceState = {
  /** Nom de cet appareil (qui a coché quoi). */
  member: string;
  installSeen?: boolean;
  /** Mode magasin : ranger aussi au placard ce qu'on scanne (désactivé par défaut). */
  shelveOnScan?: boolean;
  /** Connexions : Home Assistant, IA. Gardées sur cet appareil, jamais exportées. */
  integrations?: Integrations;
  /** État de la synchro de la liste avec Home Assistant (vitrine : faite par cet appareil). */
  haSync?: HaSyncState;
};

export type State = HouseholdState & DeviceState;

/** Ce que Mijoté sait de la liste Home Assistant depuis la dernière synchro. */
export type HaSyncState = {
  weekStart: string;
  lastSync?: string;
  lastError?: string;
  /** Article Mijoté → article HA tel qu'il était à la dernière synchro. */
  synced: Record<string, { uid: string; status: "needs_action" | "completed"; summary: string }>;
};

export type Integrations = {
  ha?: { url: string; token: string; entity: string; autoSync?: boolean };
  ai?: { apiKey: string; model: string; dailyLimit: number; used?: { day: string; count: number } };
};

// v2 : plus de petit-déjeuner, 6 choix par repas.
const KEY = "mijote-demo-v2";

export const today = () => new Date();
export { dayIndex } from "@mijote/shared";
export const thisWeek = () => mondayOf(today());
export const nextWeek = () => addDays(thisWeek(), 7);

/** Semaine des courses en cours : la suivante si elle est validée et qu'on est en fin de semaine (vendredi → dimanche). */
export const shoppingWeek = (s: State = state) => shoppingWeekOf(s, today());

const initial = (): State => ({ ...initialHousehold(today()), member: "Moi" });

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as State;
      return { ...saved, inventory: saved.inventory ?? [], integrations: saved.integrations ?? {} };
    }
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

/** Remplace l'état (synchro serveur) sans repasser par les actions. */
export const replaceState = (next: State) => set(next);

// Synchro en direct entre onglets / fenêtres du même navigateur.
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

/** Abonnement hors React (synchro Home Assistant, serveur). */
export const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

// ——— Données dérivées ———

export const ingredientsOf = (s: State) => ingredientsOfState(s);
export const recipesOf = (s: State) => recipesOfState(s);
export const recipeMap = (s: State) => recipeMapOf(s);
const planContext = (s: State) => planContextOf(s);

state = load();

// ——— Envoi des actions ———

/** Abonné aux actions du foyer (data/sync.ts les envoie au serveur). */
let actionSink: ((a: Action) => void) | undefined;
export const setActionSink = (fn: ((a: Action) => void) | undefined) => (actionSink = fn);

/** Applique une action du foyer ici, puis la confie au serveur s'il y en a un. */
function dispatch(a: Action): ActionResult {
  const { state: next, result } = applyActionWithResult(state, a);
  set(next);
  actionSink?.(a);
  return result;
}

const now = () => new Date().toISOString();

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
export function useChoices(weekStart: string, entryId: string | undefined, n?: number) {
  const s = useStore();
  const week = s.weeks[weekStart];
  const byId = recipeMap(s);
  return useMemo(
    () => (week && entryId ? choicesFor(week, entryId, planContext(s), n).map((id) => byId.get(id)).filter((r): r is Recipe => !!r) : []),
    [week, entryId, s, byId, n],
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
  /** Relance les 6 idées d'un repas (« Autres idées »). */
  reroll: (weekStart: string, entryId: string) => void dispatch({ type: "reroll", weekStart, entryId }),

  generate: (weekStart: string, seed = Math.floor(Math.random() * 1e6)) => void dispatch({ type: "generate", weekStart, seed }),

  /** Choisit la recette d'un repas ; les suggestions suivantes s'ajustent. */
  choose: (weekStart: string, entryId: string, recipeId: string) => void dispatch({ type: "choose", weekStart, entryId, recipeId }),

  /** Remet un repas « à choisir ». */
  unchoose: (weekStart: string, entryId: string) => void dispatch({ type: "unchoose", weekStart, entryId }),

  /** Rouvre une semaine validée : elle repasse en brouillon, la liste et ses coches sont gardées pour la prochaine validation. */
  reopen: (weekStart: string) => void dispatch({ type: "reopen", weekStart }),

  validate: (weekStart: string) => void dispatch({ type: "validate", weekStart, at: now() }),

  toggleChecked(weekStart: string, itemId: string) {
    const item = state.shopping[weekStart]?.find((i) => i.id === itemId);
    if (item) dispatch({ type: "setChecked", weekStart, itemId, checked: !item.checked, by: state.member, at: now() });
  },

  toggleHave(weekStart: string, itemId: string) {
    const item = state.shopping[weekStart]?.find((i) => i.id === itemId);
    if (item) dispatch({ type: "setHave", weekStart, itemId, have: !item.haveAlready, at: now() });
  },

  /** Ajoute des articles écrits à la main (« 3 carottes, du lait »). Renvoie les lignes ajoutées. */
  addToShopping: (weekStart: string, text: string): ShoppingItem[] => dispatch({ type: "addToShopping", weekStart, text, at: now() }).items ?? [],

  /**
   * Vitrine : applique le résultat d'une synchro Home Assistant faite par cet appareil.
   * `synced` est la nouvelle mémoire ; les articles dictés y sont ajoutés avec leur uid HA.
   */
  applyHaSync(weekStart: string, changes: LocalChange[], synced: HaSyncState["synced"], lastSync: string) {
    const withIds = changes.map((c) => (c.kind === "create" ? { ...c, id: haItemId(weekStart, c.uid) } : c));
    if (withIds.length) dispatch({ type: "haChanges", weekStart, changes: withIds, at: now() });
    const byId = ingredientsOf(state).byId;
    const memory = { ...synced };
    for (const c of withIds) {
      if (c.kind !== "create") continue;
      const it = state.shopping[weekStart]?.find((i) => i.id === c.id);
      // Mémorisé avec le texte Mijoté : le texte dicté, différent, compte comme « renommé dans HA » et n'est jamais écrasé.
      if (it) memory[it.id] = { uid: c.uid, status: c.done ? "completed" : "needs_action", summary: itemLine(it, byId) };
    }
    set({ ...state, haSync: { weekStart, lastSync, synced: memory } });
  },

  setHaSyncError(message: string | undefined) {
    set({ ...state, haSync: { ...(state.haSync ?? { weekStart: shoppingWeek(), synced: {} }), lastError: message } });
  },

  removeShoppingItem: (weekStart: string, itemId: string) => void dispatch({ type: "removeShoppingItem", weekStart, itemId }),

  restoreShoppingItem: (weekStart: string, item: ShoppingItem) => void dispatch({ type: "restoreShoppingItem", weekStart, item }),

  addInventory(items: Omit<InventoryItem, "id" | "addedAt">[]): InventoryItem[] {
    const at = now();
    return dispatch({ type: "addInventory", items: items.map((i) => ({ ...i, id: uid(), addedAt: at })) }).inventory ?? [];
  },

  updateInventory: (id: string, patch: Partial<InventoryItem>) => void dispatch({ type: "updateInventory", id, patch }),

  removeInventory: (id: string) => void dispatch({ type: "removeInventory", id }),

  /** Retient un produit consulté ou scanné (« Mes produits »). */
  rememberProduct: (code: string, product: ProductInfo, scanned = false) => void dispatch({ type: "rememberProduct", code, product, scanned, at: now() }),

  /** Favori, à éviter pour bébé, ou rien. */
  markProduct: (code: string, mark: ProductMemo["mark"]) => void dispatch({ type: "markProduct", code, mark }),

  forgetProduct: (code: string) => void dispatch({ type: "forgetProduct", code }),

  setIntegrations(patch: Partial<Integrations>) {
    set({ ...state, integrations: { ...state.integrations, ...patch } });
  },

  setPantry: (ingredientId: string, inStock: boolean) => void dispatch({ type: "setPantry", ingredientId, inStock }),

  setStatus: (recipeId: string, status: RecipeStatus) => void dispatch({ type: "setStatus", recipeId, status }),

  addIngredients(list: Ingredient[]) {
    if (list.length) dispatch({ type: "addIngredients", list });
  },

  /** Compte un appel à l'IA pour la limite du jour. Renvoie false si la limite est atteinte. */
  useAiCall() {
    const ai = state.integrations?.ai;
    if (!ai) return false;
    const day = new Date().toISOString().slice(0, 10);
    const count = ai.used?.day === day ? ai.used.count : 0;
    if (count >= ai.dailyLimit) return false;
    set({ ...state, integrations: { ...state.integrations, ai: { ...ai, used: { day, count: count + 1 } } } });
    return true;
  },

  addAiDrafts: (recipes: Recipe[]) => void dispatch({ type: "addAiDrafts", recipes }),

  removeAiDraft: (id: string) => void dispatch({ type: "removeAiDraft", id }),

  addRecipe: (recipe: Recipe) => void dispatch({ type: "addRecipe", recipe }),

  markDraftsSeen: (ids: string[]) => void dispatch({ type: "markDraftsSeen", ids }),

  updateHousehold: (patch: Partial<Household>) => void dispatch({ type: "updateHousehold", patch }),

  setMember(member: string) {
    set({ ...state, member });
  },

  setPrice: (ingredientId: string, price: number | undefined) => void dispatch({ type: "setPrice", ingredientId, price }),

  setShelveOnScan(shelveOnScan: boolean) {
    set({ ...state, shelveOnScan });
  },

  setInstallSeen() {
    set({ ...state, installSeen: true });
  },

  exportJSON() {
    // Les clés et jetons (IA, Home Assistant) restent sur l'appareil : jamais dans une sauvegarde.
    return JSON.stringify({ app: "mijote", version: 1, exportedAt: new Date().toISOString(), state: pickHousehold(state) }, null, 2);
  },

  importJSON(text: string) {
    const data = JSON.parse(text) as { app?: string; state?: HouseholdState };
    if (data.app !== "mijote" || !data.state?.household) throw new Error("Fichier de sauvegarde Mijoté invalide");
    // Une sauvegarde n'emporte pas les connexions de cet appareil.
    dispatch({ type: "replaceHousehold", state: data.state });
  },

  /** Vitrine seulement : repart de l'état de départ. */
  reset() {
    set({ ...initial(), member: state.member, integrations: state.integrations, shelveOnScan: state.shelveOnScan });
  },

  newId: uid,
};
