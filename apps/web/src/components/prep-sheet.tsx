import { householdPortions, ingredientLine, SLOT_LABELS_LONG, type PlanEntry, type Recipe } from "@mijote/shared";
import { BookOpen, Check, MoonStar } from "lucide-react";
import { RecipeVisual } from "@/components/kit";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, ingredientsOf, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { cn } from "@/lib/utils";

// Détail d'une préparation de veille : quoi faire ce soir, pour quel repas de demain, avec quels ingrédients.

export function PrepSheet({ recipe, entry, doneKey, onClose }: { recipe: Recipe; entry: PlanEntry; doneKey: (i: number) => string; onClose: () => void }) {
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const factor = (entry.servings || householdPortions(s.household)) / recipe.servingsBase;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Ce soir, pour demain"
      description={`Pour le ${SLOT_LABELS_LONG[entry.slot].toLowerCase()} de demain : ${recipe.title}`}
      footer={
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full"
          onClick={() => {
            onClose();
            go(`/recettes/${recipe.slug}`);
          }}
        >
          <BookOpen aria-hidden /> Voir toute la recette
        </Button>
      }
    >
      <RecipeVisual recipe={recipe} className="mb-4 h-36 rounded-3xl" />
      <section className="rounded-3xl bg-plum-soft/70 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-heading text-lg text-plum-ink">
          <MoonStar className="size-5" aria-hidden /> À faire ce soir
        </h3>
        <ul className="space-y-2">
          {recipe.prepAheadSteps.map((step, i) => {
            const done = !!s.prepDone[doneKey(i)];
            return (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => actions.togglePrep(doneKey(i))}
                  aria-pressed={done}
                  className="flex min-h-12 w-full items-start gap-3 rounded-2xl bg-card/80 px-3 py-2.5 text-left"
                >
                  <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2", done ? "border-plum bg-plum text-white" : "border-plum/40")}>
                    {done && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className={cn("flex-1", done && "text-muted-foreground line-through")}>{step}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-plum-ink/80">Compte environ {recipe.prepMinutes} min de préparation pour la recette entière.</p>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 font-heading text-lg">Ingrédients de la recette</h3>
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {recipe.ingredients.map((ri) => {
            const ing = ingredients.get(ri.ingredientId);
            if (!ing) return null;
            const line = ingredientLine(ri.babyPortionOnly ? ri.qty : ri.qty * factor, ri.unit, ing);
            return (
              <li key={`${ri.ingredientId}-${ri.note ?? ""}`} className="flex gap-2 border-b border-border py-1.5">
                <span className="w-20 shrink-0 font-semibold tabular-nums">{line.qty}</span>
                <span className="first-letter:uppercase">
                  {line.name}
                  {ri.note && <span className="text-muted-foreground"> · {ri.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </Sheet>
  );
}
