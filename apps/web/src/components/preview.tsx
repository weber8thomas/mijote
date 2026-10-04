import { householdPortions, ingredientLine, type Recipe } from "@mijote/shared";
import { Baby, BookOpen, Check, MoonStar } from "lucide-react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RecipeMeta, RecipeVisual } from "@/components/kit";
import { ingredientsOf, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { usePressHold } from "@/lib/use-press-hold";
import { cn } from "@/lib/utils";

// Aperçu d'une recette, façon menu contextuel d'iPhone : appui long sur une carte → la carte s'enfonce,
// l'aperçu naît de la carte et RESTE ouvert au relâchement. On le ferme en touchant à côté, en le glissant
// vers le bas ou avec Échap. Actions : « Choisir ce repas » (quand on est en train de choisir) et « Voir la fiche ».

type Options = { origin?: DOMRect; onChoose?: () => void };
type Current = Options & { recipe: Recipe; openedAt: number };
type Ctx = { show: (recipe: Recipe, options?: Options) => void; hide: () => void };

const PreviewContext = createContext<Ctx | null>(null);
export const usePreview = () => use(PreviewContext)!;

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const hide = useCallback(() => setCurrent(null), []);
  const show = useCallback((recipe: Recipe, options: Options = {}) => setCurrent({ recipe, ...options, openedAt: performance.now() }), []);
  // Valeur stable : ouvrir l'aperçu ne re-rend pas toutes les cartes de la page.
  const value = useMemo(() => ({ show, hide }), [show, hide]);

  useEffect(() => {
    if (!current) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [current, hide]);

  return (
    <PreviewContext value={value}>
      {children}
      {createPortal(<AnimatePresence>{current && <PreviewCard key={current.openedAt} current={current} onClose={hide} />}</AnimatePresence>, document.body)}
    </PreviewContext>
  );
}

function PreviewCard({ current, onClose }: { current: Current; onClose: () => void }) {
  const { recipe, origin, onChoose, openedAt } = current;
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const factor = householdPortions(s.household) / recipe.servingsBase;
  const reduced = useReducedMotion();
  const drag = useDragControls();

  // Départ : à la place et à la taille de la carte pressée.
  const from =
    origin && !reduced
      ? { x: origin.left + origin.width / 2 - window.innerWidth / 2, y: origin.top + origin.height / 2 - window.innerHeight / 2, scale: Math.min(0.85, Math.max(0.4, origin.width / 384)), opacity: 0.6 }
      : { opacity: 0, scale: 0.97, y: 12 };

  // Le doigt qui se lève juste après l'ouverture ne doit pas refermer l'aperçu.
  const closeFromBackdrop = () => {
    if (performance.now() - openedAt > 350) onClose();
  };

  const lines = recipe.ingredients.filter((ri) => !ri.adultOnly);

  return (
    <div className="no-callout fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Aperçu : ${recipe.title}`}>
      <motion.div
        className="absolute inset-0 touch-none bg-[#2f2a24]/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={closeFromBackdrop}
        aria-hidden
      />
      <motion.article
        className="paper relative flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] shadow-float"
        style={{ willChange: "transform, opacity" }}
        initial={from}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
        transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9, opacity: { duration: 0.14 } }}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.8 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 700) onClose();
        }}
      >
        {/* Poignée : l'illustration et le titre se glissent vers le bas pour fermer. */}
        <div className="shrink-0 cursor-grab touch-none active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
          <div className="relative">
            <RecipeVisual recipe={recipe} className="h-40" />
            <span className="absolute top-2 left-1/2 h-1.5 w-11 -translate-x-1/2 rounded-full bg-[#2f2a24]/20" aria-hidden />
          </div>
          <div className="px-5 pt-4">
            <h2 className="text-xl leading-snug font-semibold">{recipe.title}</h2>
            <RecipeMeta recipe={recipe} className="mt-1.5" />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">
          {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {lines.map((ri) => {
              const ing = ingredients.get(ri.ingredientId);
              if (!ing) return null;
              const line = ingredientLine(ri.babyPortionOnly ? ri.qty : ri.qty * factor, ri.unit, ing);
              return (
                <li key={`${ri.ingredientId}-${ri.note ?? ""}`} className="truncate">
                  <span className="font-semibold tabular-nums">{line.qty}</span> {line.name}
                </li>
              );
            })}
          </ul>
          <p className="flex gap-2 rounded-2xl bg-primary-soft/70 px-3 py-2.5 text-sm text-primary-ink">
            <Baby className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Pour bébé :</strong> {recipe.babyAdaptation.when}. {recipe.babyAdaptation.texture}. {recipe.babyAdaptation.amount}.
            </span>
          </p>
          {recipe.prepAhead && (
            <div className="rounded-2xl bg-plum-soft/70 px-3 py-2.5 text-sm text-plum-ink">
              <p className="mb-1 flex items-center gap-2 font-bold">
                <MoonStar className="size-4" aria-hidden /> La veille
              </p>
              <ul className="space-y-0.5">
                {recipe.prepAheadSteps.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pb-safe flex shrink-0 gap-2 border-t border-border px-4 pt-3 pb-4">
          {onChoose && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onChoose();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground active:scale-[0.98]"
            >
              <Check className="size-4" aria-hidden /> Choisir ce repas
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onClose();
              go(`/recettes/${recipe.slug}`);
            }}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-semibold active:scale-[0.98]",
              onChoose ? "border-[1.5px] border-border-strong bg-card" : "bg-primary text-primary-foreground",
            )}
          >
            <BookOpen className="size-4" aria-hidden /> Voir la fiche
          </button>
        </div>
      </motion.article>
    </div>
  );
}

/** Rend une carte « appuyable » : tap = onTap, appui long = aperçu (qui peut proposer de choisir la recette). */
export function usePressable(recipe: Recipe | undefined, onTap: () => void, onChoose?: () => void) {
  const preview = usePreview();
  const press = usePressHold((origin) => recipe && preview.show(recipe, { origin, onChoose }));
  return {
    holding: press.holding,
    /** La carte s'enfonce pendant l'appui, puis se relâche quand l'aperçu apparaît. */
    pressClass: cn("transition-transform will-change-transform", press.pressing ? "scale-[0.94] duration-[350ms] ease-out" : "duration-200 ease-out"),
    props: {
      ...press.handlers,
      onClick: () => {
        if (!press.consumed()) onTap();
      },
    },
    openSticky: (e?: { currentTarget: Element }) => recipe && preview.show(recipe, { origin: e?.currentTarget.closest(".group")?.getBoundingClientRect(), onChoose }),
  };
}
