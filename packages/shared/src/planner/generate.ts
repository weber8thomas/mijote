import { addDays, monthOfWeek } from "../dates";
import { costPerPortion, costTier, householdPortions } from "../pricing";
import type { Household, Ingredient, MainProtein, PlanEntry, Recipe, Slot, WeekPlan } from "../schemas";
import { SLOTS } from "../schemas";
import { isInSeason } from "../seasons";

// Planificateur déterministe : mêmes entrées + même graine = même semaine. Pas d'IA.

export type PlanContext = {
  recipes: Recipe[];
  ingredients: Map<string, Ingredient>;
  household: Household;
  /** Recettes de la semaine précédente (variété). */
  previousRecipeIds?: string[];
};

export const ALTERNATIVES = 6;
export const LIMITS = { redMeat: 2, fish: 2, legumes: 2, longCook: 2, leftovers: 2, repeatable: 3 };

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
const isMain = (s: Slot) => s === "lunch" || s === "dinner";
const isWeekend = (day: number) => day >= 5;
const totalMinutes = (r: Recipe) => r.prepMinutes + r.cookMinutes;
/** Protéines qui ne doivent pas se suivre deux repas de suite. */
const tracked = (p: MainProtein) => p !== "veggie" && p !== "none" && p !== "dairy";

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
    if (!isMain(e.slot)) continue;
    if (r.mainProtein === "red-meat") t.redMeat++;
    if (isFish(r.mainProtein)) t.fish++;
    if (r.mainProtein === "oily-fish") t.oilyFish++;
    if (r.mainProtein === "legume") t.legumes++;
    if (r.longCook) t.longCook++;
  }
  return t;
}

/** Repas principal qui précède (midi → soir de la veille, soir → midi du jour). */
export function previousMain(entries: PlanEntry[], day: number, slot: Slot): PlanEntry | undefined {
  if (slot === "lunch") return entries.find((e) => e.day === day - 1 && e.slot === "dinner");
  if (slot === "dinner") return entries.find((e) => e.day === day && e.slot === "lunch");
  return undefined;
}

export function nextMain(entries: PlanEntry[], day: number, slot: Slot): PlanEntry | undefined {
  if (slot === "lunch") return entries.find((e) => e.day === day && e.slot === "dinner");
  if (slot === "dinner") return entries.find((e) => e.day === day + 1 && e.slot === "lunch");
  return undefined;
}

type SlotCtx = { day: number; slot: Slot; entries: PlanEntry[]; tally: Tally; month: number; excludeId?: string };

/** Contraintes dures : une recette qui ne les respecte pas n'est ni retenue ni proposée. */
export function eligible(r: Recipe, c: SlotCtx, byId: Map<string, Recipe>): boolean {
  if (r.status === "excluded" || !r.slots.includes(c.slot) || r.id === c.excludeId) return false;
  const used = c.tally.uses.get(r.id) ?? 0;
  if (used > 0 && !(r.tags.includes("repeatable") && used < LIMITS.repeatable)) return false;
  if (!isMain(c.slot)) return true;
  if (r.mainProtein === "red-meat" && c.tally.redMeat >= LIMITS.redMeat) return false;
  if (r.longCook && c.tally.longCook >= LIMITS.longCook) return false;
  if (tracked(r.mainProtein)) {
    for (const n of [previousMain(c.entries, c.day, c.slot), nextMain(c.entries, c.day, c.slot)]) {
      const p = n && byId.get(n.recipeId)?.mainProtein;
      if (p && (p === r.mainProtein || (isFish(p) && isFish(r.mainProtein)))) return false;
    }
  }
  return true;
}

/** Score d'une recette pour une case. Plus c'est haut, mieux c'est. */
export function score(r: Recipe, c: SlotCtx, ctx: PlanContext, byId: Map<string, Recipe>): number {
  let s = 0;
  s += isInSeason(r, ctx.ingredients, c.month) ? 3 : -6;
  if (r.status === "favorite") s += 2;
  if (r.source !== "seed") s += 0.5;
  const tier = costTier(costPerPortion(r, ctx.ingredients), ctx.household.priceThresholds);
  s += tier === 1 ? 0.6 : tier === 3 ? -0.6 : 0;
  if (ctx.previousRecipeIds?.includes(r.id)) s -= 1.5;
  const weekend = isWeekend(c.day);

  if (c.slot === "breakfast") {
    if (!weekend && r.prepAhead) s += 2.5;
    if (!weekend && totalMinutes(r) > 15 && !r.prepAhead) s -= 2;
    if (weekend && !r.prepAhead) s += 1;
  }

  if (isMain(c.slot)) {
    const dayIron = Math.max(0, ...c.entries.filter((e) => e.day === c.day).map((e) => byId.get(e.recipeId)?.ironScore ?? 0));
    s += r.ironScore * (dayIron < 2 ? (c.slot === "dinner" ? 1.4 : 0.9) : 0.3);
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
    if (c.slot === "dinner" && r.yieldsLeftovers && c.day <= 3 && c.tally.leftovers < LIMITS.leftovers) s += 0.8;
  }

  if (c.slot === "dessert") {
    if (r.tags.includes("seasonal-fruit")) s += 1.5;
    const attached = c.entries.find((e) => e.day === c.day && e.slot === ctx.household.dessertSlot);
    const main = attached && byId.get(attached.recipeId);
    if (main && main.ironScore >= 2 && r.tags.includes("dairy-heavy")) s -= 1.5;
  }
  return s;
}

/** Candidats triés pour une case, avec un léger hasard reproductible pour varier les semaines. */
export function rankCandidates(c: SlotCtx, ctx: PlanContext, byId: Map<string, Recipe>, random: () => number): Recipe[] {
  return ctx.recipes
    .filter((r) => eligible(r, c, byId))
    .map((r) => ({ r, s: score(r, c, ctx, byId) + random() * 1.5 }))
    .sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id))
    .map((x) => x.r);
}

const entryId = (weekStart: string, day: number, slot: Slot) => `${weekStart}-${day}-${slot}`;

/** Génère une semaine complète : 1 recette retenue + 6 alternatives par case. */
export function generateWeek(ctx: PlanContext, weekStart: string, seed: number): WeekPlan {
  const byId = new Map(ctx.recipes.map((r) => [r.id, r]));
  const random = rng(seed ^ hash(weekStart));
  const month = monthOfWeek(weekStart);
  const portions = householdPortions(ctx.household);
  const entries: PlanEntry[] = [];

  for (let day = 0; day < 7; day++) {
    for (const slot of SLOTS) {
      const t = tally(entries, byId);
      const c: SlotCtx = { day, slot, entries, tally: t, month };
      const ranked = rankCandidates(c, ctx, byId, random);
      const prevDinner = slot === "lunch" ? entries.find((e) => e.day === day - 1 && e.slot === "dinner") : undefined;
      const leftoverOf = prevDinner && !isWeekend(day) && !prevDinner.isLeftover ? byId.get(prevDinner.recipeId) : undefined;

      if (leftoverOf?.yieldsLeftovers && t.leftovers < LIMITS.leftovers) {
        entries.push({
          id: entryId(weekStart, day, slot),
          day,
          slot,
          recipeId: leftoverOf.id,
          servings: portions,
          alternatives: ranked.slice(0, ALTERNATIVES).map((r) => r.id),
          isLeftover: true,
        });
        continue;
      }
      const [chosen, ...rest] = ranked;
      if (!chosen) continue;
      entries.push({
        id: entryId(weekStart, day, slot),
        day,
        slot,
        recipeId: chosen.id,
        servings: portions,
        alternatives: rest.slice(0, ALTERNATIVES).map((r) => r.id),
        isLeftover: false,
      });
    }
  }
  return { id: `week-${weekStart}`, weekStart, status: "draft", seed, entries };
}

/** Remplace la recette d'une case par une alternative ; l'ancienne prend sa place parmi les alternatives. */
export function replaceEntry(week: WeekPlan, entryId: string, recipeId: string, byId: Map<string, Recipe>): WeekPlan {
  const target = week.entries.find((e) => e.id === entryId);
  if (!target) return week;
  const previous = target.recipeId;
  const swapAlternatives = (alts: string[]) => {
    const i = alts.indexOf(recipeId);
    const next = [...alts];
    if (i >= 0) next.splice(i, 1, ...(target.isLeftover ? [] : [previous]));
    else if (!target.isLeftover) next.unshift(previous);
    return [...new Set(next)].filter((a) => a !== recipeId).slice(0, ALTERNATIVES);
  };
  let entries = week.entries.map((e) => (e.id === entryId ? { ...e, recipeId, isLeftover: false, alternatives: swapAlternatives(e.alternatives) } : e));

  // Le midi suivant était le reste de ce dîner : il suit le nouveau plat s'il en laisse, sinon il redevient un repas à part.
  if (target.slot === "dinner") {
    const next = entries.find((e) => e.day === target.day + 1 && e.slot === "lunch" && e.isLeftover);
    if (next) {
      const r = byId.get(recipeId);
      const used = new Set(entries.map((e) => e.recipeId));
      const fallback = next.alternatives.find((a) => !used.has(a));
      entries = entries.map((e) =>
        e.id !== next.id ? e : r?.yieldsLeftovers ? { ...e, recipeId } : fallback ? { ...e, recipeId: fallback, isLeftover: false, alternatives: e.alternatives.filter((a) => a !== fallback) } : e,
      );
    }
  }
  return { ...week, entries };
}

/** Jour de semaine d'un plan, en AAAA-MM-JJ. */
export const dateOf = (week: Pick<WeekPlan, "weekStart">, day: number) => addDays(week.weekStart, day);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
