import type { Recipe } from "@mijote/shared";
import { Check, Eye } from "lucide-react";
import type { ReactNode } from "react";
import { RecipeMeta, RecipeVisual } from "@/components/kit";
import { usePressable } from "@/components/preview";
import { cn } from "@/lib/utils";

// Cartes recette : la carte entière est la cible (tap), l'appui long ouvre l'aperçu.

type CardProps = {
  recipe: Recipe;
  onTap: () => void;
  /** Petit texte au-dessus du titre (créneau, « reste du dîner »…). */
  eyebrow?: ReactNode;
  badges?: ReactNode;
  /** Actions superposées (favori…), hors de la zone de tap. */
  corner?: ReactNode;
  selected?: boolean;
  /** Proposé dans l'aperçu (appui long) : « Choisir ce repas ». */
  onChoose?: () => void;
  /** Version serrée (grille de choix 2 × 3 qui tient dans un écran de téléphone). */
  compact?: boolean;
  className?: string;
};

/** Vignette compacte de la grille semaine. */
export function RecipeTile({ recipe, onTap, eyebrow, badges, selected, className }: CardProps) {
  const p = usePressable(recipe, onTap);
  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        {...p.props}
        className={cn(
          "no-callout flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card text-left shadow-card ring-1 ring-border",
          p.pressClass,
          selected && "ring-2 ring-primary",
        )}
        aria-label={`${typeof eyebrow === "string" ? `${eyebrow} : ` : ""}${recipe.title}. Appui long pour un aperçu.`}
      >
        <RecipeVisual recipe={recipe} size="sm" className="aspect-[5/4] w-full" />
        <span className="flex flex-1 flex-col gap-0.5 px-2 pt-1.5 pb-2">
          {eyebrow && <span className="text-[0.65rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">{eyebrow}</span>}
          <span className="line-clamp-3 text-[0.8rem] leading-tight font-semibold md:text-sm">{recipe.title}</span>
        </span>
        {badges && <span className="pointer-events-none absolute top-1.5 left-1.5 flex flex-col items-start gap-1">{badges}</span>}
      </button>
      <PreviewButton onClick={p.openSticky} title={recipe.title} />
    </div>
  );
}

/** Carte standard : alternatives, bibliothèque. */
export function RecipeCard({ recipe, onTap, onChoose, eyebrow, badges, corner, selected, compact, className }: CardProps) {
  const p = usePressable(recipe, onTap, onChoose);
  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        {...p.props}
        className={cn(
          "no-callout flex h-full w-full flex-col overflow-hidden rounded-3xl bg-card text-left shadow-card ring-1 ring-border",
          p.pressClass,
          selected && "ring-[3px] ring-primary",
        )}
      >
        <RecipeVisual recipe={recipe} className={cn("w-full", compact ? "min-h-0 flex-1" : "aspect-[4/3]")} />
        <span className={cn("flex flex-col gap-1", compact ? "shrink-0 px-2.5 pt-1.5 pb-2" : "flex-1 p-3")}>
          {eyebrow && <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">{eyebrow}</span>}
          <span className={cn("line-clamp-2 font-semibold", compact ? "text-[0.9rem] leading-tight" : "leading-snug")}>{recipe.title}</span>
          <RecipeMeta recipe={recipe} compact dense={compact} className={cn("mt-auto", compact ? "flex-nowrap overflow-hidden" : "pt-1")} />
        </span>
        {badges && <span className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1">{badges}</span>}
        {selected && (
          <span className="pointer-events-none absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-card">
            <Check className="size-4.5" strokeWidth={3} aria-hidden />
          </span>
        )}
      </button>
      {corner && <div className="absolute top-1.5 right-1.5 flex gap-1">{corner}</div>}
      <PreviewButton onClick={p.openSticky} title={recipe.title} />
    </div>
  );
}

/** Grande carte horizontale (« Aujourd'hui », recette retenue). */
export function RecipeRow({ recipe, onTap, eyebrow, badges, className }: CardProps) {
  const p = usePressable(recipe, onTap);
  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        {...p.props}
        className={cn(
          "no-callout flex w-full items-stretch overflow-hidden rounded-3xl bg-card text-left shadow-card ring-1 ring-border",
          p.pressClass,
        )}
      >
        <RecipeVisual recipe={recipe} className="w-28 shrink-0 sm:w-36" />
        <span className="flex min-h-28 flex-1 flex-col justify-center gap-1 px-4 py-3">
          {eyebrow && <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">{eyebrow}</span>}
          <span className="text-lg leading-snug font-semibold">{recipe.title}</span>
          <RecipeMeta recipe={recipe} />
          {badges && <span className="mt-1 flex flex-wrap gap-1">{badges}</span>}
        </span>
      </button>
      <PreviewButton onClick={p.openSticky} title={recipe.title} />
    </div>
  );
}

/** Alternative accessible à l'appui long : visible au clavier uniquement. */
function PreviewButton({ onClick, title }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sr-only rounded-full bg-card px-3 py-2 text-sm font-semibold shadow-card focus:not-sr-only focus:absolute focus:right-2 focus:bottom-2 focus:inline-flex focus:items-center focus:gap-1"
    >
      <Eye className="size-4" aria-hidden /> Aperçu<span className="sr-only"> de {title}</span>
    </button>
  );
}

export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "plum" | "terracotta" | "sage" | "ochre" }) {
  const tones = {
    plain: "bg-card/95 text-foreground",
    plum: "bg-plum-soft text-plum-ink",
    terracotta: "bg-terracotta-soft text-terracotta-ink",
    sage: "bg-primary-soft text-primary-ink",
    ochre: "bg-ochre-soft text-ochre-ink",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold shadow-sm", tones[tone])}>{children}</span>;
}
