import { householdPortions, ingredientLine, type Recipe } from "@mijote/shared";
import { Baby, BookOpen, Check, MoonStar } from "lucide-react";
import { createContext, memo, use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RecipeMeta, RecipeVisual } from "@/components/kit";
import { ingredientsOf, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { usePressHold } from "@/lib/use-press-hold";
import { cn } from "@/lib/utils";

// Aperçu d'une recette, façon menu contextuel d'iPhone : appui long sur une carte → la carte s'enfonce,
// l'aperçu naît de la carte et RESTE ouvert au relâchement. On le ferme en touchant à côté, en le glissant
// vers le bas ou avec Échap. Actions : « Choisir ce repas » (quand on est en train de choisir) et « Voir la fiche ».
//
// Fluidité : toutes les animations passent par l'API Web Animations, sur `transform` et `opacity` uniquement.
// Le navigateur les joue sur le compositeur, sans JavaScript à chaque image : un rendu React ou le décodage
// d'une image en parallèle ne les fait pas saccader. Le point de départ est mesuré sur l'élément réel.

type Options = { origin?: DOMRect; onChoose?: () => void };
/** armed : construit en coulisse pendant l'appui (invisible), révélé au déclenchement. */
type Current = Options & { recipe: Recipe; openedAt: number; armed: boolean };
type Ctx = {
  show: (recipe: Recipe, options?: Options) => void;
  arm: (recipe: Recipe, onChoose?: () => void) => void;
  disarm: () => void;
  hide: () => void;
};

const PreviewContext = createContext<Ctx | null>(null);
export const usePreview = () => use(PreviewContext)!;

/** Courbe d'un ressort amorti (sans rebond), en CSS linear() quand le navigateur la connaît. */
const SPRING =
  typeof CSS !== "undefined" && CSS.supports?.("transition-timing-function", "linear(0, 1)")
    ? "linear(0, 0.13 4%, 0.42 11%, 0.69 19%, 0.85 27%, 0.94 36%, 0.98 46%, 1)"
    : "cubic-bezier(0.2, 0.9, 0.25, 1)";
const OPEN_MS = 420;
const CLOSE_MS = 200;
const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [closing, setClosing] = useState(false);
  const hide = useCallback(() => setClosing(true), []);
  const show = useCallback((recipe: Recipe, options: Options = {}) => {
    setClosing(false);
    // Déjà construit pendant l'appui : on garde le même élément (pas de nouveau rendu complet), on le révèle.
    setCurrent((c) => (c?.armed && c.recipe.id === recipe.id ? { ...c, origin: options.origin, armed: false, openedAt: performance.now() } : { recipe, ...options, armed: false, openedAt: performance.now() }));
  }, []);
  const arm = useCallback((recipe: Recipe, onChoose?: () => void) => {
    setClosing(false);
    setCurrent((c) => (c && !c.armed ? c : { recipe, onChoose, armed: true, openedAt: performance.now() }));
  }, []);
  const disarm = useCallback(() => setCurrent((c) => (c?.armed ? null : c)), []);
  const done = useCallback(() => {
    setCurrent(null);
    setClosing(false);
  }, []);
  // Valeur stable : ouvrir l'aperçu ne re-rend pas toutes les cartes de la page.
  const value = useMemo(() => ({ show, arm, disarm, hide }), [show, arm, disarm, hide]);
  const visible = !!current && !current.armed;

  useEffect(() => {
    if (!visible) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && hide();
    // Bloque le défilement de la page sous l'aperçu (le doigt de l'appui long est souvent encore posé),
    // sans toucher à la mise en page : seule la liste de l'aperçu défile.
    const noScroll = (e: TouchEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-preview-scroll]")) e.preventDefault();
    };
    window.addEventListener("keydown", esc);
    window.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("touchmove", noScroll);
    };
  }, [visible, hide]);

  return (
    <PreviewContext value={value}>
      {children}
      {current && createPortal(<PreviewCard key={current.recipe.id} current={current} closing={closing} onClose={hide} onClosed={done} />, document.body)}
    </PreviewContext>
  );
}

function PreviewCard({ current, closing, onClose, onClosed }: { current: Current; closing: boolean; onClose: () => void; onClosed: () => void }) {
  const { recipe, origin, onChoose, openedAt, armed } = current;
  const backdrop = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  /** Transformation de départ (depuis la carte pressée), réutilisée pour refermer vers elle. */
  const from = useRef("translateY(16px) scale(0.97)");

  // Ouverture : mesure la place finale, puis anime depuis la carte pressée. L'opacité monte vite, la position suit le ressort.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || armed) return;
    const reduced = reducedMotion();
    const end = el.getBoundingClientRect();
    if (origin && !reduced) {
      const dx = origin.left + origin.width / 2 - (end.left + end.width / 2);
      const dy = origin.top + origin.height / 2 - (end.top + end.height / 2);
      const scale = Math.min(0.9, Math.max(0.3, origin.width / end.width));
      from.current = `translate(${dx}px, ${dy}px) scale(${scale})`;
    }
    el.animate([{ transform: from.current }, { transform: "none" }], { duration: reduced ? 1 : OPEN_MS, easing: SPRING });
    el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });
  }, [origin, armed]);

  // Fermeture : vers la carte d'origine (ou vers le bas si on l'a glissé), puis démontage.
  useEffect(() => {
    if (!closing) return;
    const dragged = !!sheet.current?.style.transform;
    const target = dragged ? "translateY(45vh)" : origin ? from.current : "translateY(16px) scale(0.96)";
    const duration = reducedMotion() ? 1 : CLOSE_MS;
    const anims = [
      card.current?.animate([{ transform: "none", opacity: 1 }, { transform: target, opacity: 0 }], { duration, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }),
      backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-in", fill: "forwards" }),
    ];
    Promise.all(anims.map((a) => a?.finished)).finally(onClosed);
  }, [closing, origin, onClosed]);

  // Glisser vers le bas pour fermer : on déplace le conteneur directement (pas de rendu React par image).
  const drag = useRef<{ y: number; t: number } | null>(null);
  const handle = useMemo(() => {
    const onHandleDown = (e: React.PointerEvent) => {
      drag.current = { y: e.clientY, t: performance.now() };
      e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onHandleMove = (e: React.PointerEvent) => {
      if (!drag.current || !sheet.current) return;
      const dy = e.clientY - drag.current.y;
      sheet.current.style.transform = `translateY(${dy > 0 ? dy : dy / 6}px)`;
    };
    const onHandleUp = (e: React.PointerEvent) => {
      const start = drag.current;
      drag.current = null;
      const el = sheet.current;
      if (!start || !el) return;
      const dy = e.clientY - start.y;
      const velocity = dy / Math.max(1, performance.now() - start.t);
      if (dy > 90 || (dy > 20 && velocity > 0.6)) {
        onClose();
        return;
      }
      const was = el.style.transform;
      el.style.transform = "";
      if (was) el.animate([{ transform: was }, { transform: "none" }], { duration: 260, easing: SPRING });
    };
    return { onPointerDown: onHandleDown, onPointerMove: onHandleMove, onPointerUp: onHandleUp, onPointerCancel: onHandleUp };
  }, [onClose]);

  // Le doigt qui se lève juste après l'ouverture ne doit pas refermer l'aperçu.
  const closeFromBackdrop = () => {
    if (performance.now() - openedAt > 350) onClose();
  };

  return (
    <div
      className={cn("no-callout fixed inset-0 z-[60] flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6", armed && "invisible pointer-events-none")}
      role="dialog"
      aria-modal="true"
      aria-hidden={armed || undefined}
      aria-label={`Aperçu : ${recipe.title}`}
    >
      <div ref={backdrop} className="absolute inset-0 touch-none bg-[#2f2a24]/55" onClick={closeFromBackdrop} aria-hidden />
      <div ref={sheet} className="relative w-full max-w-sm">
        <article ref={card} className="flex max-h-[min(78dvh,44rem)] w-full flex-col overflow-hidden rounded-[1.75rem] bg-card shadow-float">
          <PreviewBody recipe={recipe} onChoose={onChoose} onClose={onClose} handle={handle} />
        </article>
      </div>
    </div>
  );
}

type Handle = Pick<React.HTMLAttributes<HTMLDivElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;

/** Contenu de l'aperçu, mémorisé : le révéler au déclenchement ne le re-rend pas. */
const PreviewBody = memo(function PreviewBody({ recipe, onChoose, onClose, handle }: { recipe: Recipe; onChoose?: () => void; onClose: () => void; handle: Handle }) {
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const factor = householdPortions(s.household) / recipe.servingsBase;
  const lines = recipe.ingredients.filter((ri) => !ri.adultOnly);
  return (
    <>
          {/* Poignée : l'illustration et le titre se glissent vers le bas pour fermer. */}
          <div className="shrink-0 cursor-grab touch-none active:cursor-grabbing" {...handle}>
            <div className="relative">
              <RecipeVisual recipe={recipe} className="h-32" />
              <span className="absolute top-2 left-1/2 h-1.5 w-11 -translate-x-1/2 rounded-full bg-[#2f2a24]/20" aria-hidden />
            </div>
            <div className="px-5 pt-3.5">
              <h2 className="text-xl leading-snug font-semibold">{recipe.title}</h2>
              <RecipeMeta recipe={recipe} className="mt-1.5" />
            </div>
          </div>

          <div data-preview-scroll className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">
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
            <p className="flex gap-2 rounded-2xl bg-sage-soft/70 px-3 py-2.5 text-sm text-sage-ink">
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

          <div className="flex shrink-0 gap-2 border-t border-border p-3">
            {onChoose && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChoose();
                }}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[0.95rem] font-semibold text-primary-foreground active:scale-[0.98]"
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
                "flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[0.95rem] font-semibold active:scale-[0.98]",
                onChoose ? "border-[1.5px] border-border-strong bg-card" : "bg-primary-soft text-primary-ink",
              )}
            >
              <BookOpen className="size-4" aria-hidden /> Voir la fiche
            </button>
          </div>
    </>
  );
});

/** Rend une carte « appuyable » : tap = onTap, appui long = aperçu (qui peut proposer de choisir la recette). */
export function usePressable(recipe: Recipe | undefined, onTap: () => void, onChoose?: () => void) {
  const preview = usePreview();
  const press = usePressHold({
    onArm: () => recipe && preview.arm(recipe, onChoose),
    onDisarm: preview.disarm,
    onHold: (origin) => recipe && preview.show(recipe, { origin, onChoose }),
  });
  return {
    /** La carte s'enfonce pendant l'appui (transition CSS, sur le compositeur), puis se relâche quand l'aperçu apparaît. */
    pressClass: cn("transition-transform", press.pressing ? "scale-[0.94] duration-[350ms] ease-out" : "duration-200 ease-out"),
    props: {
      ...press.handlers,
      onClick: () => {
        if (!press.consumed()) onTap();
      },
    },
    openSticky: (e?: { currentTarget: Element }) => recipe && preview.show(recipe, { origin: e?.currentTarget.closest(".group")?.getBoundingClientRect(), onChoose }),
  };
}
