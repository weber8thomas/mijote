import { describe, expect, it } from "vitest";
import { AI_SAMPLES, INGREDIENTS, RECIPES, ingredientMap } from "../content";
import { lintRecipe } from "../baby-rules";
import { DEFAULT_THRESHOLDS } from "../pricing";
import type { Household, Recipe } from "../schemas";
import { buildShoppingList, totals } from "../shopping";
import { checkWeek, dayIron, prepTasksFor } from "./check";
import { ALTERNATIVES, alternativesFor, generateWeek, LIMITS, replaceEntry, tally } from "./generate";

const household: Household = { id: "h", name: "Test", adults: 2, babies: 1, dessertSlot: "dinner", priceThresholds: DEFAULT_THRESHOLDS };
const ingredients = ingredientMap();
const ctx = { recipes: RECIPES, ingredients, household };
const byId = new Map(RECIPES.map((r) => [r.id, r]));
const WEEKS = ["2026-10-05", "2026-10-12", "2026-11-02", "2026-12-07", "2027-01-11", "2027-02-01"];
const mains = (w: ReturnType<typeof generateWeek>) => w.entries.filter((e) => (e.slot === "lunch" || e.slot === "dinner") && !e.isLeftover);

describe("planificateur", () => {
  it("est déterministe pour une même graine", () => {
    const a = generateWeek(ctx, "2026-10-05", 42);
    const b = generateWeek(ctx, "2026-10-05", 42);
    expect(a).toEqual(b);
    expect(generateWeek(ctx, "2026-10-05", 43).entries.map((e) => e.recipeId)).not.toEqual(a.entries.map((e) => e.recipeId));
  });

  for (const weekStart of WEEKS)
    for (const seed of [1, 7, 99]) {
      describe(`semaine ${weekStart} · graine ${seed}`, () => {
        const week = generateWeek(ctx, weekStart, seed);
        const t = tally(week.entries, byId);

        it("remplit les 28 cases avec 6 alternatives", () => {
          expect(week.entries).toHaveLength(28);
          for (const e of week.entries) {
            expect(e.alternatives.length).toBe(ALTERNATIVES);
            expect(e.alternatives).not.toContain(e.recipeId);
            if (!e.isLeftover) expect(byId.get(e.recipeId)!.slots).toContain(e.slot);
          }
        });

        it("respecte l'équilibre de la semaine", () => {
          expect(t.fish).toBeGreaterThanOrEqual(2);
          expect(t.oilyFish).toBeGreaterThanOrEqual(1);
          expect(t.legumes).toBeGreaterThanOrEqual(2);
          expect(t.redMeat).toBeLessThanOrEqual(LIMITS.redMeat);
          expect(t.longCook).toBeLessThanOrEqual(LIMITS.longCook);
        });

        it("ne répète pas une recette, ni une protéine deux repas de suite", () => {
          const ids = week.entries.filter((e) => !e.isLeftover && e.slot !== "breakfast" && e.slot !== "dessert" && !byId.get(e.recipeId)!.tags.includes("repeatable")).map((e) => e.recipeId);
          expect(new Set(ids).size).toBe(ids.length);
          const warnings = checkWeek(week, byId);
          expect(warnings.filter((w) => w.id.startsWith("seq-") || w.id.startsWith("dup-"))).toEqual([]);
        });

        it("place les cuissons longues le week-end", () => {
          for (const e of mains(week)) if (byId.get(e.recipeId)!.longCook) expect(e.day).toBeGreaterThanOrEqual(5);
        });

        it("privilégie les petits-déjeuners préparés la veille en semaine", () => {
          const weekday = week.entries.filter((e) => e.slot === "breakfast" && e.day < 5);
          expect(weekday.filter((e) => byId.get(e.recipeId)!.prepAhead).length).toBeGreaterThanOrEqual(4);
        });

        it("transforme un reste de dîner en midi du lendemain", () => {
          for (const e of week.entries.filter((x) => x.isLeftover)) {
            const dinner = week.entries.find((x) => x.day === e.day - 1 && x.slot === "dinner")!;
            expect(dinner.recipeId).toBe(e.recipeId);
            expect(byId.get(e.recipeId)!.yieldsLeftovers).toBe(true);
          }
          expect(t.leftovers).toBeLessThanOrEqual(LIMITS.leftovers);
        });
      });
    }

  it("garde une source de fer presque tous les jours", () => {
    let low = 0;
    for (const weekStart of WEEKS) {
      const week = generateWeek(ctx, weekStart, 3);
      for (let d = 0; d < 7; d++) if (dayIron(week, d, byId) < 2) low++;
    }
    expect(low).toBeLessThanOrEqual(2);
  });
});

describe("remplacement", () => {
  it("échange la recette et l'alternative choisie", () => {
    const week = generateWeek(ctx, "2026-10-05", 5);
    const e = week.entries.find((x) => x.slot === "dinner" && !x.isLeftover)!;
    const pick = e.alternatives[2];
    const next = replaceEntry(week, e.id, pick, byId);
    const ne = next.entries.find((x) => x.id === e.id)!;
    expect(ne.recipeId).toBe(pick);
    expect(ne.alternatives).toContain(e.recipeId);
    expect(ne.alternatives).not.toContain(pick);
    expect(ne.alternatives).toHaveLength(ALTERNATIVES);
  });

  it("les alternatives recalculées n'introduisent pas de doublon", () => {
    let week = generateWeek(ctx, "2026-10-05", 9);
    // Remplace chaque dîner de semaine par sa première alternative à jour.
    for (const day of [0, 1, 2, 3, 4]) {
      const e = week.entries.find((x) => x.day === day && x.slot === "dinner")!;
      const alts = alternativesFor(week, e.id, ctx);
      expect(alts).toHaveLength(ALTERNATIVES);
      week = replaceEntry(week, e.id, alts[0].id, byId);
    }
    expect(checkWeek(week, byId).filter((w) => w.id.startsWith("dup-"))).toEqual([]);
  });

  it("le midi « reste » suit le dîner remplacé", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const week = generateWeek(ctx, "2026-10-05", seed);
      const left = week.entries.find((x) => x.isLeftover);
      if (!left) continue;
      const dinner = week.entries.find((x) => x.day === left.day - 1 && x.slot === "dinner")!;
      const plain = dinner.alternatives.find((id) => !byId.get(id)!.yieldsLeftovers)!;
      const next = replaceEntry(week, dinner.id, plain, byId);
      const nl = next.entries.find((x) => x.id === left.id)!;
      expect(nl.isLeftover).toBe(false);
      expect(nl.recipeId).not.toBe(plain);
      return;
    }
  });
});

describe("liste de courses", () => {
  const week = { ...generateWeek(ctx, "2026-10-05", 11), status: "validated" as const };
  const pantry = new Set(INGREDIENTS.filter((i) => i.pantryBasic).map((i) => i.id));

  it("agrège par ingrédient et exclut le placard en stock", () => {
    const items = buildShoppingList({ week, recipes: byId, ingredients, pantryInStock: pantry });
    expect(new Set(items.map((i) => i.ingredientId)).size).toBe(items.length);
    for (const it of items) expect(ingredients.get(it.ingredientId)!.pantryBasic && pantry.has(it.ingredientId)).toBe(false);
    const t = totals(items);
    expect(t.market).toBeGreaterThan(20);
    expect(t.supermarket).toBeGreaterThan(5);
    expect(t.market + t.supermarket).toBeLessThan(250);
  });

  it("garde les cases cochées en régénérant", () => {
    const first = buildShoppingList({ week, recipes: byId, ingredients, pantryInStock: pantry });
    const checked = first.map((i, k) => (k % 2 ? { ...i, checked: true } : i));
    const again = buildShoppingList({ week, recipes: byId, ingredients, pantryInStock: pantry, previous: checked });
    expect(again.filter((i) => i.checked).length).toBe(checked.filter((i) => i.checked).length);
  });

  it("ajoute un basique du placard quand il manque", () => {
    const without = buildShoppingList({ week, recipes: byId, ingredients, pantryInStock: new Set() });
    expect(without.length).toBeGreaterThan(buildShoppingList({ week, recipes: byId, ingredients, pantryInStock: pantry }).length);
  });
});

describe("contenu", () => {
  it("toutes les recettes passent le linter bébé", () => {
    const all: Recipe[] = [...RECIPES, ...AI_SAMPLES];
    const errors = all.flatMap((r) => lintRecipe(r, ingredients)).filter((i) => i.level === "error");
    expect(errors).toEqual([]);
  });

  it("le linter refuse le miel et les œufs crus", () => {
    const base = RECIPES.find((r) => r.slots.includes("dessert"))!;
    const honey = { ...base, ingredients: [...base.ingredients, { ingredientId: "miel", qty: 1, unit: "cs" as const }] };
    expect(lintRecipe(honey, ingredients).some((i) => i.level === "error")).toBe(true);
    const adultHoney = { ...base, ingredients: [...base.ingredients, { ingredientId: "miel", qty: 1, unit: "cs" as const, adultOnly: true }] };
    expect(lintRecipe(adultHoney, ingredients).filter((i) => i.level === "error")).toEqual([]);
    expect(lintRecipe({ ...base, tags: [...base.tags, "raw-egg"] }, ingredients).some((i) => i.level === "error")).toBe(true);
  });

  it("propose des tâches de veille", () => {
    const week = generateWeek(ctx, "2026-10-05", 1);
    const tasks = [0, 1, 2, 3, 4].flatMap((d) => prepTasksFor(week, d, byId));
    expect(tasks.length).toBeGreaterThan(3);
  });
});
