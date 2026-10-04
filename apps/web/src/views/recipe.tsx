import { BABY_PORTION, ingredientLine, MONTHS, outOfSeason, SLOT_LABELS_LONG, type Recipe } from "@mijote/shared";
import { Baby, Ban, ChefHat, ChevronLeft, ChevronRight, Clock, Flame, Heart, Leaf, Minus, MoonStar, Plus, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Box, CostTier, Disclaimer, EmptyState, formatMinutes, IronLeaves, RecipeVisual, useCost } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { actions, ingredientsOf, recipeMap, today, useStore } from "@/data/store";
import { back } from "@/lib/router";
import { cn } from "@/lib/utils";

export function RecipeView({ slug }: { slug: string }) {
  const s = useStore();
  const recipe = [...recipeMap(s).values()].find((r) => r.slug === slug);
  if (!recipe)
    return (
      <Shell tab="recipes">
        <div className="pt-6">
          <EmptyState illustration="oignon" title="Recette introuvable" action={<Button onClick={() => back("/recettes")}>Retour</Button>} />
        </div>
      </Shell>
    );
  return <RecipeDetail recipe={recipe} />;
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const [adults, setAdults] = useState(s.household.adults);
  const [babies, setBabies] = useState(s.household.babies);
  const [cooking, setCooking] = useState(false);
  const { per } = useCost(recipe);
  const factor = (adults + babies * BABY_PORTION) / recipe.servingsBase;
  const month = today().getMonth() + 1;
  const off = outOfSeason(recipe, ingredients, month);
  const fav = recipe.status === "favorite";
  const inLibrary = s.customRecipes.some((r) => r.id === recipe.id) || recipe.source === "seed";

  return (
    <Shell tab="recipes">
      <div className="-mx-4 lg:mx-0">
        <div className="relative lg:overflow-hidden lg:rounded-[2rem]">
          <RecipeVisual recipe={recipe} size="lg" className="h-56 sm:h-72" />
          <button type="button" onClick={() => back("/recettes")} className="absolute top-3 left-3 grid size-11 place-items-center rounded-full bg-card/90 shadow-card" aria-label="Retour">
            <ChevronLeft className="size-5" />
          </button>
          {inLibrary && (
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => actions.setStatus(recipe.id, fav ? "active" : "favorite")}
                aria-pressed={fav}
                aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                className="grid size-11 place-items-center rounded-full bg-card/90 shadow-card"
              >
                <Heart className={cn("size-5", fav && "fill-terracotta text-terracotta")} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const was = recipe.status;
                  actions.setStatus(recipe.id, was === "excluded" ? "active" : "excluded");
                  toast(was === "excluded" ? "Recette restaurée" : "Recette écartée : elle ne sera plus proposée", {
                    action: { label: "Annuler", onClick: () => actions.setStatus(recipe.id, was) },
                  });
                }}
                aria-label={recipe.status === "excluded" ? "Restaurer la recette" : "Écarter la recette"}
                className="grid size-11 place-items-center rounded-full bg-card/90 shadow-card"
              >
                {recipe.status === "excluded" ? <RotateCcw className="size-5" /> : <Ban className="size-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <header>
            <p className="text-sm font-semibold text-muted-foreground">
              {recipe.slots.map((x) => SLOT_LABELS_LONG[x]).join(" · ")}
              {recipe.source === "ai" && " · nouveauté"}
              {recipe.source === "manual" && " · ta recette"}
            </p>
            <h1 className="mt-1 text-3xl leading-tight font-semibold md:text-4xl">{recipe.title}</h1>
            {recipe.description && <p className="mt-2 text-lg text-muted-foreground">{recipe.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Fact icon={<Clock className="size-4" />}>
                {formatMinutes(recipe.prepMinutes)} de prépa{recipe.cookMinutes > 0 && ` · ${formatMinutes(recipe.cookMinutes)} de cuisson`}
              </Fact>
              <Fact>
                <CostTier recipe={recipe} /> <span className="text-muted-foreground">~ {per.toFixed(2).replace(".", ",")} €/portion</span>
              </Fact>
              {recipe.ironScore > 0 && (
                <Fact>
                  <IronLeaves level={recipe.ironScore} /> fer
                </Fact>
              )}
              {recipe.longCook && <Fact icon={<Flame className="size-4 text-terracotta-ink" />}>Cuisson longue</Fact>}
              <Fact icon={<Leaf className={cn("size-4", off.length ? "text-ochre-ink" : "text-primary-ink")} />}>
                {off.length ? `Hors saison en ${MONTHS[month - 1]} : ${off.map((i) => i.name).join(", ")}` : `De saison en ${MONTHS[month - 1]}`}
              </Fact>
            </div>
          </header>

          {recipe.prepAhead && (
            <Box title="La veille" icon={<MoonStar className="size-5" />} tone="plum">
              <ul className="space-y-1">
                {recipe.prepAheadSteps.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </Box>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Ingrédients</h2>
              <div className="flex items-center gap-2 text-sm">
                <Stepper label="adultes" value={adults} min={1} max={10} onChange={setAdults} />
                <Stepper label="bébé" value={babies} min={0} max={4} onChange={setBabies} />
              </div>
            </div>
            <ul className="paper divide-y divide-border rounded-3xl px-4 shadow-card ring-1 ring-border">
              {recipe.ingredients.map((ri) => {
                const ing = ingredients.get(ri.ingredientId);
                if (!ing) return null;
                const line = ingredientLine(ri.babyPortionOnly ? ri.qty : ri.qty * factor, ri.unit, ing);
                return (
                  <li key={`${ri.ingredientId}-${ri.note ?? ""}`} className="flex items-baseline gap-3 py-2.5">
                    <span className="w-24 shrink-0 font-bold tabular-nums">{line.qty}</span>
                    <span className="flex-1">
                      <span className="first-letter:uppercase">{line.name}</span>
                      {ri.note && <span className="text-muted-foreground"> · {ri.note}</span>}
                    </span>
                    {ri.adultOnly && <span className="rounded-full bg-terracotta-soft px-2 py-0.5 text-xs font-bold text-terracotta-ink">adultes</span>}
                    {ri.babyPortionOnly && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-ink">bébé</span>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Étapes</h2>
              <Button variant="outline" className="h-11" onClick={() => setCooking(true)}>
                <ChefHat aria-hidden /> Mode cuisine
              </Button>
            </div>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-heading font-semibold text-primary-ink">{i + 1}</span>
                  <p className="pt-1 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <Box title="Pour bébé" icon={<Baby className="size-5" />} tone="sage">
            <dl className="space-y-2">
              <div>
                <dt className="font-bold">Quand prélever</dt>
                <dd>{recipe.babyAdaptation.when}</dd>
              </div>
              <div>
                <dt className="font-bold">Texture</dt>
                <dd>{recipe.babyAdaptation.texture}</dd>
              </div>
              <div>
                <dt className="font-bold">Quantité</dt>
                <dd>{recipe.babyAdaptation.amount}</dd>
              </div>
              {recipe.babyAdaptation.notes && <p className="text-muted-foreground">{recipe.babyAdaptation.notes}</p>}
            </dl>
          </Box>
          <Disclaimer />
        </aside>
      </div>

      <AnimatePresence>{cooking && <CookMode recipe={recipe} onClose={() => setCooking(false)} />}</AnimatePresence>
    </Shell>
  );
}

function Fact({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-card px-3 py-1 shadow-card ring-1 ring-border">
      {icon}
      {children}
    </span>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center rounded-full bg-card shadow-card ring-1 ring-border">
      <button type="button" className="grid size-10 place-items-center disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Moins de ${label}`}>
        <Minus className="size-4" />
      </button>
      <span className="min-w-14 text-center font-semibold tabular-nums" aria-live="polite">
        {value} {label}
      </span>
      <button type="button" className="grid size-10 place-items-center disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Plus de ${label}`}>
        <Plus className="size-4" />
      </button>
    </span>
  );
}

/** Mode cuisine : une étape à la fois, en grand, écran maintenu allumé (Wake Lock) si possible. */
function CookMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
        setLocked(true);
      })
      .catch(() => setLocked(false));
    return () => void lock?.release();
  }, []);
  const last = recipe.steps.length - 1;
  return (
    <motion.div className="paper fixed inset-0 z-[70] flex flex-col" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 300 }} role="dialog" aria-modal="true" aria-label={`Mode cuisine : ${recipe.title}`}>
      <div className="pt-safe flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold">{recipe.title}</p>
          <p className="text-xs text-muted-foreground">{locked ? "L'écran reste allumé" : "Mode cuisine"}</p>
        </div>
        <button type="button" onClick={onClose} className="grid size-12 place-items-center rounded-full bg-muted" aria-label="Quitter le mode cuisine">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex gap-1.5 px-4">
        {recipe.steps.map((_, k) => (
          <span key={k} className={cn("h-1.5 flex-1 rounded-full", k <= i ? "bg-primary" : "bg-paper-deep")} />
        ))}
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            <p className="font-heading text-xl font-semibold text-primary-ink">Étape {i + 1}</p>
            <p className="mt-3 text-3xl leading-snug font-medium md:text-4xl">{recipe.steps[i]}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="pb-safe grid grid-cols-2 gap-3 px-4 pt-2 pb-4">
        <Button variant="outline" size="lg" className="h-16 text-base" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft aria-hidden /> Précédente
        </Button>
        {i < last ? (
          <Button size="lg" className="h-16 text-base" onClick={() => setI(i + 1)}>
            Suivante <ChevronRight aria-hidden />
          </Button>
        ) : (
          <Button size="lg" className="h-16 text-base" onClick={onClose}>
            Bon appétit !
          </Button>
        )}
      </div>
    </motion.div>
  );
}
