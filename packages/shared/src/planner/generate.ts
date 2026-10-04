import { addDays, monthOfWeek } from "../dates";
import { costPerPortion, costTier, householdPortions } from "../pricing";
import type { Household, Ingredient, MainProtein, MealSlot, PlanEntry, Recipe, Slot, WeekPlan } from "../schemas";
import { SLOTS } from "../schemas";
import { isInSeason } from "../seasons";

// Planificateur déterministe : mêmes entrées + même graine = même semaine. Pas d'IA.
// La semaine compte 14 repas (midi et soir) + 1 dessert par jour. Pour chacun : 6 choix, le premier est la suggestion.

export type PlanContext = {
  recipes: Recipe[];
  ingredients: Map<string, Ingredient>;
  household: Household;
  /** Recettes de la semaine précédente (variété). */
  previousRecipeIds?: string[];
};

export const CHOICES = 6;
export const LIMITS = { redMeat: 2, fish: 2, legumes: 2, longCook: 2, leftovers: 2, dessertRepeat: 2, repeatable: 3 };

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isFish = (p: MainProtein) => p === "fish" || p === "oily-fish";
const isWeekend = (day: number) => day >= 5;
const totalMinutes = (r: Recipe) => r.prepMinutes + r.cookMinutes;
/** Protéines qui ne doivent pas se suivre deux repas de suite. */
const tracked = (p: MainProtein) => p !== "veggie" && p !== "none" && p !== "dairy";
const isMeal = (s: Slot): s is MealSlot => s === "lunch" || s === "dinner";
/** Rang chronologique d'un repas dans la semaine (lundi midi = 0, lundi soir = 1, lundi dessert = 2…). */
export const mealIndex = (e: Pick<PlanEntry, "day" | "slot">) => e.day * 3 + SLOTS.indexOf(e.slot);
const byOrder = (a: PlanEntry, b: PlanEntry) => mealIndex(a) - mealIndex(b);

/** Compteurs d'une semaine en cours de construction (ou déjà construite). */
export type Tally = {
  redMeat: number;
  fish: number;
  oilyFish: number;
  legumes: number;
  longCook: number;
  leftovers: number;
  uses: Map<string, number>;
};

export function tally(entries: PlanEntry[], byId: Map<string, Recipe>): Tally {
  const t: Tally = { redMeat: 0, fish: 0, oilyFish: 0, legumes: 0, longCook: 0, leftovers: 0, uses: new Map() };
  for (const e of entries) {
    const r = byId.get(e.recipeId);
    if (!r) continue;
    if (e.isLeftover) {
      t.leftovers++;
      continue;
    }
    t.uses.set(r.id, (t.uses.get(r.id) ?? 0) + 1);
    if (!isMeal(e.slot)) continue;
    if (r.mainProtein === "red-meat") t.redMeat++;
    if (isFish(r.mainProtein)) t.fish++;
    if (r.mainProtein === "oily-fish") t.oilyFish++;
    if (r.mainProtein === "legume") t.legumes++;
    if (r.longCook) t.longCook++;
  }
  return t;
}

/** Repas qui précède (midi → soir de la veille, soir → midi du jour). */
export function previousMain(entries: PlanEntry[], day: number, slot: MealSlot): PlanEntry | undefined {
  return slot === "lunch" ? entries.find((e) => e.day === day - 1 && e.slot === "dinner") : entries.find((e) => e.day === day && e.slot === "lunch");
}

export function nextMain(entries: PlanEntry[], day: number, slot: MealSlot): PlanEntry | undefined {
  return slot === "lunch" ? entries.find((e) => e.day === day && e.slot === "dinner") : entries.find((e) => e.day === day + 1 && e.slot === "lunch");
}

type SlotCtx = { day: number; slot: Slot; entries: PlanEntry[]; tally: Tally; month: number; dessertSlot: MealSlot };

/**
 * Contraintes dures : une recette qui ne les respecte pas n'est ni suggérée ni proposée.
 * relaxed : seules restent les règles qui fâchent vraiment (créneau, écartée, doublon) ; le reste devient une alerte douce.
 */
export function eligible(r: Recipe, c: SlotCtx, byId: Map<string, Recipe>, relaxed = false): boolean {
  if (r.status === "excluded" || !r.slots.includes(c.slot)) return false;
  const used = c.tally.uses.get(r.id) ?? 0;
  if (c.slot === "dessert") {
    // Un dessert peut revenir dans la semaine, mais pas deux jours de suite (le fruit de saison, jusqu'à 3 fois).
    if (used >= (r.tags.includes("repeatable") ? LIMITS.repeatable : LIMITS.dessertRepeat)) return false;
    return !c.entries.some((e) => e.slot === "dessert" && e.day === c.day - 1 && e.recipeId === r.id);
  }
  if (used > 0) return false;
  if (relaxed) return true;
  if (r.mainProtein === "red-meat" && c.tally.redMeat >= LIMITS.redMeat) return false;
  // Cuissons longues : au plus 2, et seulement le week-end.
  if (r.longCook && (c.tally.longCook >= LIMITS.longCook || !isWeekend(c.day))) return false;
  if (tracked(r.mainProtein)) {
    for (const n of [previousMain(c.entries, c.day, c.slot as MealSlot), nextMain(c.entries, c.day, c.slot as MealSlot)]) {
      const p = n && byId.get(n.recipeId)?.mainProtein;
      if (p && (p === r.mainProtein || (isFish(p) && isFish(r.mainProtein)))) return false;
    }
  }
  return true;
}

/** Score d'une recette pour un repas. Plus c'est haut, mieux c'est. */
export function score(r: Recipe, c: SlotCtx, ctx: PlanContext, byId: Map<string, Recipe>): number {
  let s = 0;
  s += isInSeason(r, ctx.ingredients, c.month) ? 3 : -6;
  if (r.status === "favorite") s += 2;
  if (r.source !== "seed") s += 0.5;
  const tier = costTier(costPerPortion(r, ctx.ingredients), ctx.household.priceThresholds);
  s += tier === 1 ? 0.6 : tier === 3 ? -0.6 : 0;
  if (ctx.previousRecipeIds?.includes(r.id)) s -= 1.5;
  const weekend = isWeekend(c.day);

  if (c.slot === "dessert") {
    if (r.tags.includes("seasonal-fruit")) s += 1.5;
    if (!r.tags.includes("repeatable") && (c.tally.uses.get(r.id) ?? 0) > 0) s -= 2;
    const attached = c.entries.find((e) => e.day === c.day && e.slot === c.dessertSlot);
    const main = attached && byId.get(attached.recipeId);
    if (main && main.ironScore >= 2 && r.tags.includes("dairy-heavy")) s -= 1.5;
    return s;
  }

  const dayIron = Math.max(0, ...c.entries.filter((e) => e.day === c.day).map((e) => byId.get(e.recipeId)?.ironScore ?? 0));
  // Le fer compte, sans écraser le reste : sinon les mêmes plats riches en fer reviennent chaque semaine.
  s += r.ironScore * (dayIron < 2 ? (c.slot === "dinner" ? 0.8 : 0.5) : 0.15);
  if (isFish(r.mainProtein)) {
    s += c.tally.fish < LIMITS.fish ? 2 : -8;
    if (r.mainProtein === "oily-fish" && c.tally.oilyFish === 0) s += 1;
  }
  if (r.mainProtein === "legume") s += c.tally.legumes < LIMITS.legumes ? 2 : 0;
  if (r.mainProtein === "red-meat") s += c.tally.redMeat === 0 ? 0.5 : -0.5;
  if (r.longCook) s += weekend ? 1.5 : -4;
  if (!weekend && !r.longCook) {
    const t = totalMinutes(r);
    if (c.slot === "lunch" && t <= 30) s += 1;
    if (c.slot === "dinner" && t <= 40) s += 1;
    if (t > 60 && !r.prepAhead) s -= 1.5;
  }
  // Le week-end, on a le temps : les plats familiaux plus longs passent devant.
  if (weekend && !r.longCook && totalMinutes(r) > 40) s += 1;
  // Varier les protéines sur la semaine (volaille, œufs, laitages… pas seulement fer et poisson).
  const sameProtein = c.entries.filter((e) => e.slot !== "dessert" && byId.get(e.recipeId)?.mainProtein === r.mainProtein).length;
  s -= 0.6 * sameProtein;
  if (c.slot === "dinner" && r.yieldsLeftovers && c.day <= 3 && c.tally.leftovers < LIMITS.leftovers) s += 0.8;
  return s;
}

/** Candidats triés pour un repas, avec un léger hasard reproductible pour varier les semaines. */
export function rankCandidates(c: SlotCtx, ctx: PlanContext, byId: Map<string, Recipe>, random: () => number, relaxed = false): Recipe[] {
  return ctx.recipes
    .filter((r) => eligible(r, c, byId, relaxed))
    .map((r) => ({ r, s: score(r, c, ctx, byId) + random() * 2.5 }))
    .sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id))
    .map((x) => x.r);
}

/** 6 choix : d'abord ceux qui cochent tout, complétés si besoin par des recettes à alerte douce (jamais un doublon). */
function topChoices(c: SlotCtx, ctx: PlanContext, byId: Map<string, Recipe>, seed: number, first: string[] = [], n = CHOICES, avoid: Set<string> = new Set()): string[] {
  const out = [...first];
  // Des idées variées : au plus 2 par protéine dans une page de 6 (premier passage seulement).
  const proteinCount = (p: string) => out.filter((id) => byId.get(id)?.mainProtein === p).length;
  const capped = (r: Recipe) => c.slot !== "dessert" && proteinCount(r.mainProtein) >= Math.ceil((out.length + 1) / CHOICES) * 2;
  // D'abord celles qui cochent tout et pas encore montrées, puis les déjà vues, puis les alertes douces.
  for (const [relaxed, skipAvoided, diverse] of [[false, true, true], [false, true, false], [false, false, false], [true, true, false], [true, false, false]] as const) {
    if (out.length >= n) break;
    for (const r of rankCandidates(c, ctx, byId, rng(seed), relaxed)) {
      if (out.length >= n) break;
      if (skipAvoided && avoid.has(r.id)) continue;
      if (diverse && capped(r)) continue;
      if (!out.includes(r.id)) out.push(r.id);
    }
  }
  return out.slice(0, n);
}

const entryId = (weekStart: string, day: number, slot: Slot) => `${weekStart}-${day}-${slot}`;

/**
 * Génère (ou complète) une semaine. Les repas `locked` (déjà choisis) sont gardés tels quels ;
 * les autres reçoivent une suggestion et 6 choix, en tenant compte de tout ce qui est verrouillé.
 */
export function generateWeek(ctx: PlanContext, weekStart: string, seed: number, locked: PlanEntry[] = []): WeekPlan {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const month = monthOfWeek(weekStart);
  const portions = householdPortions(ctx.household);
  const entries: PlanEntry[] = [...locked];
  const dessertSlot = ctx.household.dessertSlot;
  const isLocked = (day: number, slot: Slot) => locked.some((e) => e.day === day && e.slot === slot);

  for (let day = 0; day < 7; day++) {
    for (const slot of SLOTS) {
      if (isLocked(day, slot)) continue;
      const id = entryId(weekStart, day, slot);
      const t = tally(entries, byId);
      const c: SlotCtx = { day, slot, entries, tally: t, month, dessertSlot };
      const prevDinner = slot === "lunch" ? entries.find((e) => e.day === day - 1 && e.slot === "dinner") : undefined;
      const leftoverOf = prevDinner && !isWeekend(day) && !prevDinner.isLeftover ? byId.get(prevDinner.recipeId) : undefined;
      const seedFor = seed ^ hash(id);

      if (leftoverOf?.yieldsLeftovers && t.leftovers < LIMITS.leftovers) {
        const choices = topChoices(c, ctx, byId, seedFor, [leftoverOf.id]);
        entries.push({ id, day, slot, recipeId: leftoverOf.id, servings: portions, choices, isLeftover: true, confirmed: false });
        continue;
      }
      const choices = topChoices(c, ctx, byId, seedFor);
      if (!choices.length) continue;
      entries.push({ id, day, slot, recipeId: choices[0], servings: portions, choices, isLeftover: false, confirmed: false });
    }
  }
  return { id: `week-${weekStart}`, weekStart, status: "draft", seed, entries: entries.sort(byOrder) };
}

/**
 * Les 6 choix d'un repas, à jour avec ce qui est déjà décidé : les repas confirmés et ceux qui le précèdent.
 * Les suggestions suivantes, pas encore confirmées, s'adapteront après le choix (voir chooseEntry).
 */
export function choicesFor(week: WeekPlan, entryId: string, ctx: PlanContext, n = CHOICES): string[] {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const entry = week.entries.find((e) => e.id === entryId);
  if (!entry) return [];
  const others = week.entries.filter((e) => e.id !== entryId && (e.confirmed || mealIndex(e) < mealIndex(entry)));
  const c: SlotCtx = { day: entry.day, slot: entry.slot, entries: others, tally: tally(others, byId), month: monthOfWeek(week.weekStart), dessertSlot: ctx.household.dessertSlot };
  const kept = entry.choices.filter((id) => {
    if (entry.isLeftover && id === entry.recipeId) return true;
    const r = byId.get(id);
    return !!r && eligible(r, c, byId, true);
  });
  return topChoices(c, ctx, byId, week.seed ^ hash(entryId) ^ ((entry.rerolls ?? 0) * 7919), kept, n);
}

/**
 * « Autres idées » : 6 nouvelles propositions pour un repas, en évitant celles déjà montrées tant qu'il en reste.
 * Un repas déjà choisi garde sa recette (elle reste en tête des choix).
 */
export function rerollChoices(week: WeekPlan, entryId: string, ctx: PlanContext): WeekPlan {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const entry = week.entries.find((e) => e.id === entryId);
  if (!entry) return week;
  const rerolls = (entry.rerolls ?? 0) + 1;
  const others = week.entries.filter((e) => e.id !== entryId && (e.confirmed || mealIndex(e) < mealIndex(entry)));
  const c: SlotCtx = { day: entry.day, slot: entry.slot, entries: others, tally: tally(others, byId), month: monthOfWeek(week.weekStart), dessertSlot: ctx.household.dessertSlot };
  const keep = entry.confirmed || entry.isLeftover ? [entry.recipeId] : [];
  const choices = topChoices(c, ctx, byId, week.seed ^ hash(entryId) ^ (rerolls * 7919), keep, CHOICES, new Set(entry.choices));
  const recipeId = keep.length ? entry.recipeId : choices[0];
  return { ...week, entries: week.entries.map((e) => (e.id === entryId ? { ...e, choices, rerolls, recipeId } : e)) };
}

/**
 * Pour chercher une autre recette que les 6 choix : celles à masquer (déjà au menu cette semaine)
 * et celles qui déclencheraient une alerte d'équilibre (proposées quand même, signalées).
 */
export function pickableFor(week: WeekPlan, entryId: string, ctx: PlanContext): { hidden: Set<string>; warns: Set<string> } {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const entry = week.entries.find((e) => e.id === entryId);
  const hidden = new Set<string>();
  const warns = new Set<string>();
  if (!entry) return { hidden, warns };
  const others = week.entries.filter((e) => e.id !== entryId);
  const c: SlotCtx = { day: entry.day, slot: entry.slot, entries: others, tally: tally(others, byId), month: monthOfWeek(week.weekStart), dessertSlot: ctx.household.dessertSlot };
  for (const r of ctx.recipes) {
    if (!r.slots.includes(entry.slot)) continue;
    if (!eligible(r, c, byId, true)) hidden.add(r.id);
    else if (!eligible(r, c, byId)) warns.add(r.id);
  }
  return { hidden, warns };
}

/** Choisit la recette d'un repas, puis réajuste les suggestions des repas pas encore confirmés. */
export function chooseEntry(week: WeekPlan, entryId: string, recipeId: string, ctx: PlanContext): WeekPlan {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const target = week.entries.find((e) => e.id === entryId);
  if (!target) return week;
  const prevDinner = target.slot === "lunch" ? week.entries.find((e) => e.day === target.day - 1 && e.slot === "dinner") : undefined;
  const isLeftover = !!prevDinner && prevDinner.recipeId === recipeId;
  const choices = target.choices.includes(recipeId) ? target.choices : [...target.choices.slice(0, CHOICES - 1), recipeId];
  let entries = week.entries.map((e) => (e.id === entryId ? { ...e, recipeId, isLeftover, confirmed: true, choices } : e));

  // Le midi suivant était le reste de ce dîner : il suit le nouveau plat s'il en laisse, sinon il redevient à choisir.
  if (target.slot === "dinner") {
    const next = entries.find((e) => e.day === target.day + 1 && e.slot === "lunch" && e.isLeftover);
    if (next) entries = entries.map((e) => (e.id !== next.id ? e : byId.get(recipeId)?.yieldsLeftovers ? { ...e, recipeId } : { ...e, isLeftover: false, confirmed: false }));
  }
  // Les desserts restent stables pendant qu'on choisit les repas.
  const locked = entries.filter((e) => e.confirmed || e.slot === "dessert");
  return { ...generateWeek(ctx, week.weekStart, week.seed, locked), id: week.id, status: week.status, validatedAt: week.validatedAt };
}

/** Remet un repas « à choisir » : il redevient une suggestion, qui s'ajuste avec les autres repas non confirmés. */
export function unchooseEntry(week: WeekPlan, entryId: string, ctx: PlanContext): WeekPlan {
  const target = week.entries.find((e) => e.id === entryId);
  if (!target || !target.confirmed || !isMeal(target.slot)) return week;
  const locked = week.entries.filter((e) => e.id !== entryId && (e.confirmed || e.slot === "dessert"));
  return { ...generateWeek(ctx, week.weekStart, week.seed, locked), id: week.id, status: week.status, validatedAt: week.validatedAt };
}

/** Prochain repas (midi ou soir) à choisir, dans l'ordre de la semaine. */
export const nextToChoose = (week: WeekPlan) => [...week.entries].sort(byOrder).find((e) => !e.confirmed && isMeal(e.slot));

/** Les 14 repas à choisir (midi et soir), dans l'ordre. */
export const mealsOf = (week: WeekPlan) => [...week.entries].filter((e) => isMeal(e.slot)).sort(byOrder);

/** Jour de semaine d'un plan, en AAAA-MM-JJ. */
export const dateOf = (week: Pick<WeekPlan, "weekStart">, day: number) => addDays(week.weekStart, day);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
