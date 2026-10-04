import { describe, expect, it } from "vitest";
import { AI_SAMPLES, INGREDIENTS, RECIPES, ingredientMap } from "../content";
import { lintRecipe } from "../baby-rules";
import { DEFAULT_THRESHOLDS } from "../pricing";
import type { Household, Recipe } from "../schemas";
import { buildShoppingList, totals } from "../shopping";
import { checkWeek, dayIron, prepTasksFor } from "./check";
import { CHOICES, chooseEntry, choicesFor, generateWeek, LIMITS, mealsOf, nextToChoose, pickableFor, tally, unchooseEntry } from "./generate";
import { plateOf } from "../plate";

const household: Household = { id: "h", name: "Test", adults: 2, babies: 1, dessertSlot: "dinner", priceThresholds: DEFAULT_THRESHOLDS };
const ingredients = ingredientMap();
const ctx = { recipes: RECIPES, ingredients, household };
const byId = new Map(RECIPES.map((r) => [r.id, r]));
const WEEKS = ["2026-10-05", "2026-10-12", "2026-11-02", "2026-12-07", "2027-01-11", "2027-02-01"];
const mains = (w: ReturnType<typeof generateWeek>) => mealsOf(w).filter((e) => !e.isLeftover);

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

        it("propose 14 repas + 7 desserts, chacun avec 6 choix dont la suggestion", () => {
          expect(week.entries).toHaveLength(21);
          expect(mealsOf(week)).toHaveLength(14);
          for (const e of week.entries) {
            expect(e.choices).toHaveLength(CHOICES);
            expect(e.choices[0]).toBe(e.recipeId);
            expect(new Set(e.choices).size).toBe(CHOICES);
            expect(e.confirmed).toBe(false);
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
          const ids = mains(week).map((e) => e.recipeId);
          expect(new Set(ids).size).toBe(ids.length);
          const warnings = checkWeek(week, byId);
          expect(warnings.filter((w) => w.id.startsWith("seq-") || w.id.startsWith("dup-"))).toEqual([]);
        });

        it("place les cuissons longues le week-end", () => {
          for (const e of mains(week)) if (byId.get(e.recipeId)!.longCook) expect(e.day).toBeGreaterThanOrEqual(5);
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

describe("choix repas par repas", () => {
  it("parcourt les 14 repas dans l'ordre, sans doublon ni protéine répétée", () => {
    let week = generateWeek(ctx, "2026-10-05", 9);
    let n = 0;
    // On choisit toujours le 3e choix : la semaine doit rester cohérente.
    for (let e = nextToChoose(week); e; e = nextToChoose(week)) {
      const choices = choicesFor(week, e.id, ctx);
      expect(choices).toHaveLength(CHOICES);
      week = chooseEntry(week, e.id, choices[2], ctx);
      expect(week.entries.find((x) => x.id === e!.id)!.recipeId).toBe(choices[2]);
      n++;
    }
    expect(n).toBe(14);
    expect(week.entries).toHaveLength(21);
    expect(mealsOf(week).every((e) => e.confirmed)).toBe(true);
    const dup = checkWeek(week, byId).filter((w) => w.id.startsWith("dup-"));
    expect(dup).toEqual([]);
  });

  it("les suggestions suivantes s'adaptent au choix", () => {
    const week = generateWeek(ctx, "2026-10-05", 4);
    const first = mealsOf(week)[0];
    const pick = first.choices[1];
    const next = chooseEntry(week, first.id, pick, ctx);
    const later = mealsOf(next).filter((e) => !e.confirmed);
    expect(later.map((e) => e.recipeId)).not.toContain(pick);
    expect(later.every((e) => e.choices.length === CHOICES)).toBe(true);
  });

  it("la recherche d'une autre recette masque celles déjà au menu", () => {
    const week = generateWeek(ctx, "2026-10-05", 2);
    const [first, second] = mealsOf(week);
    const { hidden, warns } = pickableFor(week, first.id, ctx);
    expect(hidden.has(second.recipeId)).toBe(true);
    expect(hidden.has(first.recipeId)).toBe(false);
    for (const id of warns) expect(hidden.has(id)).toBe(false);
  });

  it("un repas choisi peut être remis à choisir", () => {
    const week = generateWeek(ctx, "2026-10-05", 6);
    const [first, second] = mealsOf(week);
    const chosen = chooseEntry(chooseEntry(week, first.id, first.choices[3], ctx), second.id, second.choices[1], ctx);
    const back = unchooseEntry(chosen, first.id, ctx);
    const e1 = back.entries.find((e) => e.id === first.id)!;
    const e2 = back.entries.find((e) => e.id === second.id)!;
    expect(e1.confirmed).toBe(false);
    expect(e2.confirmed).toBe(true);
    expect(e2.recipeId).toBe(second.choices[1]);
    expect(nextToChoose(back)?.id).toBe(first.id);
    expect(back.entries).toHaveLength(21);
  });

  it("le midi « reste » suit le dîner choisi", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const week = generateWeek(ctx, "2026-10-05", seed);
      const left = week.entries.find((x) => x.isLeftover);
      if (!left) continue;
      const dinner = week.entries.find((x) => x.day === left.day - 1 && x.slot === "dinner")!;
      const plain = dinner.choices.find((id) => !byId.get(id)!.yieldsLeftovers)!;
      const next = chooseEntry(week, dinner.id, plain, ctx);
      const nl = next.entries.find((x) => x.id === left.id)!;
      expect(nl.isLeftover).toBe(false);
      expect(nl.recipeId).not.toBe(plain);
      return;
    }
  });
});

describe("assiette", () => {
  it("montre protéine, légume et féculent quand la recette les réunit", () => {
    for (const r of RECIPES.filter((x) => x.slots.includes("dinner"))) {
      const plate = plateOf(r, ingredients);
      expect(plate.length).toBeGreaterThan(0);
      expect(plate.length).toBeLessThanOrEqual(3);
    }
    const mixed = RECIPES.filter((r) => r.slots.includes("dinner") && plateOf(r, ingredients).length === 3);
    expect(mixed.length).toBeGreaterThan(5);
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
    const weeks = [1, 2, 3, 4, 5].map((seed) => generateWeek(ctx, "2026-10-05", seed));
    const tasks = weeks.flatMap((week) => [0, 1, 2, 3, 4, 5, 6].flatMap((d) => prepTasksFor(week, d, byId)));
    expect(tasks.length).toBeGreaterThan(0);
  });
});
