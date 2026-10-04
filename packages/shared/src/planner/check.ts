import { DAYS, PROTEIN_LABELS, SLOT_LABELS } from "../labels";
import type { PlanEntry, Recipe, WeekPlan } from "../schemas";
import { LIMITS, previousMain, tally } from "./generate";

// Alertes douces : elles informent, elles ne bloquent jamais.

export type WeekWarning = { id: string; message: string; entryIds: string[] };

const where = (e: PlanEntry) => `${DAYS[e.day].toLowerCase()} ${SLOT_LABELS[e.slot].toLowerCase()}`;

export function checkWeek(week: WeekPlan, byId: Map<string, Recipe>, dessertSlot: "lunch" | "dinner" = "dinner"): WeekWarning[] {
  const out: WeekWarning[] = [];
  const t = tally(week.entries, byId);
  const mains = week.entries.filter((e) => (e.slot === "lunch" || e.slot === "dinner") && !e.isLeftover);
  const ofProtein = (...p: Recipe["mainProtein"][]) => mains.filter((e) => p.includes(byId.get(e.recipeId)!.mainProtein)).map((e) => e.id);

  if (t.redMeat > LIMITS.redMeat) out.push({ id: "red-meat", message: `Déjà ${t.redMeat} repas de viande rouge cette semaine (2 conseillés).`, entryIds: ofProtein("red-meat") });
  if (t.fish < LIMITS.fish) out.push({ id: "fish", message: t.fish === 0 ? "Pas de poisson cette semaine (2 conseillés)." : "Un seul repas de poisson cette semaine (2 conseillés).", entryIds: ofProtein("fish", "oily-fish") });
  else if (t.oilyFish === 0) out.push({ id: "oily-fish", message: "Pas de poisson gras (sardine, maquereau, saumon) cette semaine.", entryIds: ofProtein("fish") });
  if (t.legumes < LIMITS.legumes) out.push({ id: "legumes", message: `${t.legumes === 0 ? "Pas de" : "Un seul repas de"} légumineuses cette semaine (2 conseillés).`, entryIds: ofProtein("legume") });
  if (t.longCook > LIMITS.longCook) {
    const ids = mains.filter((e) => byId.get(e.recipeId)!.longCook).map((e) => e.id);
    out.push({ id: "long-cook", message: `${t.longCook} cuissons longues cette semaine : ça fait beaucoup.`, entryIds: ids });
  }

  const seen = new Map<string, string>();
  for (const e of week.entries) {
    if (e.isLeftover) continue;
    const r = byId.get(e.recipeId)!;
    if (seen.has(r.id) && !r.tags.includes("repeatable")) out.push({ id: `dup-${e.id}`, message: `« ${r.title} » apparaît deux fois.`, entryIds: [seen.get(r.id)!, e.id] });
    seen.set(r.id, e.id);
  }

  for (const e of mains) {
    const prev = previousMain(week.entries, e.day, e.slot);
    if (!prev || e.isLeftover) continue;
    const a = byId.get(prev.recipeId)!.mainProtein;
    const b = byId.get(e.recipeId)!.mainProtein;
    const fishy = (p: string) => p === "fish" || p === "oily-fish";
    if ((a === b || (fishy(a) && fishy(b))) && !["veggie", "none", "dairy"].includes(b))
      out.push({ id: `seq-${e.id}`, message: `Deux repas de suite à base de ${PROTEIN_LABELS[b]} (${where(prev)}, ${where(e)}).`, entryIds: [prev.id, e.id] });
  }

  for (let day = 0; day < 7; day++) {
    const dayEntries = week.entries.filter((e) => e.day === day);
    if (!dayEntries.length) continue;
    if (dayIron(week, day, byId) < 2) out.push({ id: `iron-${day}`, message: `${DAYS[day]} : pas de source de fer notable.`, entryIds: dayEntries.filter((e) => e.slot !== "dessert").map((e) => e.id) });
    const main = dayEntries.find((e) => e.slot === dessertSlot);
    const dessert = dayEntries.find((e) => e.slot === "dessert");
    const m = main && byId.get(main.recipeId);
    const d = dessert && byId.get(dessert.recipeId);
    if (m && d && m.ironScore >= 2 && d.tags.includes("dairy-heavy"))
      out.push({ id: `blocker-${day}`, message: `${DAYS[day]} : « ${d.title} » (laitage) freine l'absorption du fer du plat. Un fruit riche en vitamine C serait idéal.`, entryIds: [dessert!.id] });
  }
  return out;
}

/** Niveau de fer du jour, de 0 à 3 (meilleure source du jour, +1 si deux sources notables). */
export function dayIron(week: WeekPlan, day: number, byId: Map<string, Recipe>): number {
  const scores = week.entries.filter((e) => e.day === day && e.slot !== "dessert").map((e) => byId.get(e.recipeId)?.ironScore ?? 0);
  if (!scores.length) return 0;
  const best = Math.max(...scores);
  return Math.min(3, best + (scores.filter((s) => s >= 2).length > 1 ? 1 : 0));
}

export type PrepTask = { id: string; recipeId: string; entryId: string; text: string };

/** Tâches à faire la veille au soir pour les repas du jour `day`. */
export function prepTasksFor(week: WeekPlan, day: number, byId: Map<string, Recipe>): PrepTask[] {
  return week.entries
    .filter((e) => e.day === day && !e.isLeftover)
    .flatMap((e) => {
      const r = byId.get(e.recipeId);
      if (!r?.prepAhead) return [];
      return r.prepAheadSteps.map((text, i) => ({ id: `${e.id}:${i}`, recipeId: r.id, entryId: e.id, text }));
    });
}
