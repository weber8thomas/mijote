import { ingredientLine, householdPortions, type Recipe } from "@mijote/shared";
import { Baby, BookOpen, MoonStar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RecipeMeta, RecipeVisual } from "@/components/kit";
import { ingredientsOf, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { usePressHold } from "@/lib/use-press-hold";
import { cn } from "@/lib/utils";

// Aperçu flottant d'une recette (appui long). Relâcher ferme ; glisser jusqu'à « Ouvrir la fiche » puis relâcher l'ouvre.
// Au clavier / lecteur d'écran : bouton « Aperçu », l'aperçu reste alors ouvert.

type Mode = "hold" | "sticky";
type Current = { recipe: Recipe; mode: Mode; layoutId?: string };
type Ctx = { show: (recipe: Recipe, mode: Mode, layoutId?: string) => void; release: (point: { x: number; y: number }) => void; hide: () => void };

const PreviewContext = createContext<Ctx | null>(null);

export const usePreview = () => use(PreviewContext)!;

const overOpenButton = (p: { x: number; y: number }) => !!document.elementFromPoint(p.x, p.y)?.closest("[data-preview-open]");

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [hover, setHover] = useState(false);
  const ref = useRef(current);
  useEffect(() => {
    ref.current = current;
  }, [current]);

  const hide = useCallback(() => setCurrent(null), []);
  const show = useCallback((recipe: Recipe, mode: Mode, layoutId?: string) => setCurrent({ recipe, mode, layoutId }), []);
  const release = useCallback((p: { x: number; y: number }) => {
    const c = ref.current;
    if (!c || c.mode !== "hold") return;
    setCurrent(null);
    setHover(false);
    if (overOpenButton(p)) go(`/recettes/${c.recipe.slug}`);
  }, []);

  // Pendant l'appui : suivre le doigt pour surligner le bouton « Ouvrir la fiche ».
  useEffect(() => {
    if (current?.mode !== "hold") return;
    const move = (e: PointerEvent) => setHover(overOpenButton({ x: e.clientX, y: e.clientY }));
    const up = (e: PointerEvent) => release({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [current?.mode, release]);

  useEffect(() => {
    if (!current) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [current, hide]);

  return (
    <PreviewContext value={{ show, release, hide }}>
      {children}
      <AnimatePresence>{current && <PreviewCard key={current.recipe.id} current={current} hover={hover} onClose={hide} />}</AnimatePresence>
    </PreviewContext>
  );
}

function PreviewCard({ current, hover, onClose }: { current: Current; hover: boolean; onClose: () => void }) {
  const { recipe, mode, layoutId } = current;
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const factor = householdPortions(s.household) / recipe.servingsBase;
  const sticky = mode === "sticky";
  return (
    <motion.div
      className="no-callout fixed inset-0 z-[60] grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={sticky ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu : ${recipe.title}`}
    >
      <div className="absolute inset-0 bg-[#2f2a24]/40 backdrop-blur-sm" aria-hidden />
      <motion.article
        layoutId={layoutId}
        className="paper relative w-full max-w-sm overflow-hidden rounded-[1.75rem] shadow-float"
        initial={layoutId ? undefined : { scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
      >
        <RecipeVisual recipe={recipe} className="h-36" />
        <div className="space-y-3 p-5">
          <div>
            <h2 className="text-xl leading-snug font-semibold">{recipe.title}</h2>
            <RecipeMeta recipe={recipe} className="mt-1.5" />
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm">
            {recipe.ingredients
              .filter((ri) => !ri.adultOnly)
              .slice(0, 8)
              .map((ri) => {
                const ing = ingredients.get(ri.ingredientId);
                if (!ing) return null;
                const line = ingredientLine(ri.babyPortionOnly ? ri.qty : ri.qty * factor, ri.unit, ing);
                return (
                  <li key={ri.ingredientId} className="truncate">
                    <span className="font-semibold tabular-nums">{line.qty}</span> {line.name}
                  </li>
                );
              })}
          </ul>
          <p className="flex gap-2 rounded-2xl bg-primary-soft/70 px-3 py-2 text-sm text-primary-ink">
            <Baby className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Pour bébé :</strong> {recipe.babyAdaptation.when}, {recipe.babyAdaptation.texture.toLowerCase()}.
            </span>
          </p>
          {recipe.prepAhead && (
            <p className="flex gap-2 text-sm text-plum-ink">
              <MoonStar className="mt-0.5 size-4 shrink-0" aria-hidden />
              La veille : {recipe.prepAheadSteps[0]}
            </p>
          )}
          <button
            type="button"
            data-preview-open
            onClick={() => {
              onClose();
              go(`/recettes/${recipe.slug}`);
            }}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold transition-all",
              hover ? "scale-[1.03] bg-primary-hover text-primary-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            <BookOpen className="size-4" aria-hidden /> Ouvrir la fiche
          </button>
          {!sticky && <p className="text-center text-xs text-muted-foreground">Relâche pour fermer · glisse sur le bouton pour ouvrir</p>}
        </div>
      </motion.article>
    </motion.div>
  );
}

/** Rend un élément « appuyable » : tap = onTap, appui long = aperçu. */
export function usePressable(recipe: Recipe | undefined, onTap: () => void, layoutId?: string) {
  const preview = usePreview();
  const press = usePressHold(
    () => recipe && preview.show(recipe, "hold", layoutId),
    (p) => preview.release(p),
  );
  return {
    holding: press.holding,
    props: {
      ...press.handlers,
      onClick: () => {
        if (!press.consumed()) onTap();
      },
    },
    openSticky: () => recipe && preview.show(recipe, "sticky"),
  };
}
