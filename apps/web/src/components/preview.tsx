import { householdPortions, ingredientLine, type Recipe } from "@mijote/shared";
import { Baby, BookOpen, MoonStar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RecipeMeta, RecipeVisual } from "@/components/kit";
import { ingredientsOf, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { usePressHold } from "@/lib/use-press-hold";
import { cn } from "@/lib/utils";

// Aperçu flottant d'une recette (appui long, façon « force touch »). Il naît de la carte pressée et s'agrandit
// au centre. Relâcher ferme ; glisser jusqu'à « Ouvrir la fiche » puis relâcher l'ouvre.
// Au clavier / lecteur d'écran : bouton « Aperçu », l'aperçu reste alors ouvert.

type Mode = "hold" | "sticky";
type Current = { recipe: Recipe; mode: Mode; origin?: DOMRect };
type Ctx = { show: (recipe: Recipe, mode: Mode, origin?: DOMRect) => void; release: (point: { x: number; y: number }) => void; hide: () => void };

const PreviewContext = createContext<Ctx | null>(null);

export const usePreview = () => use(PreviewContext)!;

const overOpenButton = (p: { x: number; y: number }) => !!document.elementFromPoint(p.x, p.y)?.closest("[data-preview-open]");

/** Ressort amorti, sans rebond : rapide au départ, doux à l'arrivée. */
const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.85 } as const;

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [hover, setHover] = useState(false);
  const ref = useRef(current);
  useEffect(() => {
    ref.current = current;
  }, [current]);

  const hide = useCallback(() => setCurrent(null), []);
  const show = useCallback((recipe: Recipe, mode: Mode, origin?: DOMRect) => setCurrent({ recipe, mode, origin }), []);
  const release = useCallback((p: { x: number; y: number }) => {
    const c = ref.current;
    if (!c || c.mode !== "hold") return;
    setCurrent(null);
    setHover(false);
    if (overOpenButton(p)) go(`/recettes/${c.recipe.slug}`);
  }, []);

  // Pendant l'appui : suivre le doigt (surligner « Ouvrir la fiche ») et bloquer le défilement de la page.
  useEffect(() => {
    if (current?.mode !== "hold") return;
    const move = (e: PointerEvent) => setHover(overOpenButton({ x: e.clientX, y: e.clientY }));
    const up = (e: PointerEvent) => release({ x: e.clientX, y: e.clientY });
    const noScroll = (e: TouchEvent) => e.preventDefault();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("touchmove", noScroll);
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
  const { recipe, mode, origin } = current;
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const factor = householdPortions(s.household) / recipe.servingsBase;
  const sticky = mode === "sticky";
  // Départ : centré sur la carte pressée, à sa taille.
  const from = origin
    ? { x: origin.left + origin.width / 2 - window.innerWidth / 2, y: origin.top + origin.height / 2 - window.innerHeight / 2, scale: Math.min(0.9, Math.max(0.35, origin.width / 384)) }
    : { x: 0, y: 24, scale: 0.92 };

  return (
    <div className="no-callout fixed inset-0 z-[60] grid touch-none place-items-center p-4" role="dialog" aria-modal="true" aria-label={`Aperçu : ${recipe.title}`}>
      <motion.div
        className="absolute inset-0 bg-[#2f2a24]/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.16 } }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={sticky ? onClose : undefined}
        aria-hidden
      />
      <motion.article
        className="paper relative w-full max-w-sm overflow-hidden rounded-[1.75rem] shadow-float"
        style={{ willChange: "transform, opacity" }}
        initial={{ opacity: 0, ...from }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94, y: 8, transition: { duration: 0.16, ease: "easeIn" } }}
        transition={{ ...SPRING, opacity: { duration: 0.12 } }}
      >
        <RecipeVisual recipe={recipe} className="h-40" />
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
              "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition-transform duration-150",
              hover && "scale-[1.04] bg-primary-hover",
            )}
          >
            <BookOpen className="size-4" aria-hidden /> Ouvrir la fiche
          </button>
          {!sticky && <p className="text-center text-xs text-muted-foreground">Relâche pour fermer · glisse sur le bouton pour ouvrir</p>}
        </div>
      </motion.article>
    </div>
  );
}

/** Rend un élément « appuyable » : tap = onTap, appui long = aperçu. */
export function usePressable(recipe: Recipe | undefined, onTap: () => void) {
  const preview = usePreview();
  const press = usePressHold(
    (origin) => recipe && preview.show(recipe, "hold", origin),
    (p) => preview.release(p),
  );
  return {
    holding: press.holding,
    /** Classes de la carte : elle s'enfonce pendant l'appui, puis se relâche quand l'aperçu apparaît. */
    pressClass: cn("transition-transform", press.pressing ? "scale-[0.95] duration-[450ms] ease-out" : "duration-200 ease-out active:scale-[0.97]"),
    props: {
      ...press.handlers,
      onClick: () => {
        if (!press.consumed()) onTap();
      },
    },
    openSticky: (e?: { currentTarget: Element }) => recipe && preview.show(recipe, "sticky", e?.currentTarget.closest(".group")?.getBoundingClientRect()),
  };
}
