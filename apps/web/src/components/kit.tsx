import { BABY_DISCLAIMER, costPerPortion, costTier, tierLabel, type Recipe } from "@mijote/shared";
import { Baby, Clock, Flame } from "lucide-react";
import type { ReactNode } from "react";
import { Art, Plate } from "@/components/art";
import { metaOf, TONES } from "@/components/illustrations/meta";
import { ingredientsOf, useStore } from "@/data/store";
import { cn } from "@/lib/utils";

// Petites briques partagées : visuel du plat, pictos, puces, en-têtes, états vides.

/** Fond de carte derrière une illustration : version très pâle de la teinte de sa pastille (jetons « -soft » de DESIGN.md). */
export const tintOf = (key: string) => TONES[metaOf(key).tone].wash;

/** Visuel d'une recette : le plat en pastille (protéine, légume, féculent) sur un fond pâle de la même teinte. */
export function RecipeVisual({ recipe, className, size = "md" }: { recipe: Recipe; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={cn("relative grid place-items-center overflow-hidden", className)} style={{ backgroundColor: tintOf(recipe.illustration) }}>
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "var(--paper-noise)" }} aria-hidden />
      <Plate recipe={recipe} className={cn("relative", size === "sm" ? "h-[92%]" : size === "lg" ? "h-[86%] max-h-64" : "h-[96%]")} />
    </div>
  );
}

/** Picto fer : un anneau en trois arcs autour de « Fe », comme un objectif du jour à compléter (0 à 3). */
export function IronGauge({ level, className, size = 22 }: { level: number; className?: string; size?: number }) {
  const arc = 26.3;
  const gap = 3;
  const filled = Math.max(0, Math.min(3, level));
  const dash = filled === 1 ? `${arc} 100` : filled === 2 ? `${arc} ${gap} ${arc} 100` : `${arc} ${gap}`;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" className={cn("shrink-0", className)} role="img" aria-label={`Fer : ${filled} sur 3`}>
      <title>{`Fer : ${filled}/3`}</title>
      <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(90 74 94 / 0.18)" strokeWidth="4" strokeDasharray={`${arc} ${gap}`} transform="rotate(-90 18 18)" />
      {filled > 0 && <circle cx="18" cy="18" r="14" fill="none" stroke="#5a4a5e" strokeWidth="4" strokeDasharray={dash} strokeLinecap="butt" transform="rotate(-90 18 18)" />}
      <text x="18" y="22" textAnchor="middle" fontFamily="Outfit Variable, sans-serif" fontWeight="700" fontSize="11" fill="#5a4a5e">
        Fe
      </text>
    </svg>
  );
}

export function useCost(recipe: Recipe) {
  const s = useStore();
  const per = costPerPortion(recipe, ingredientsOf(s).byId);
  return { per, tier: costTier(per, s.household.priceThresholds) };
}

export function CostTier({ recipe, className }: { recipe: Recipe; className?: string }) {
  const { tier, per } = useCost(recipe);
  return (
    <span className={cn("font-semibold tracking-tight whitespace-nowrap text-ochre-ink tabular-nums", className)} title={`~ ${per.toFixed(2).replace(".", ",")} € par portion adulte`}>
      {tierLabel(tier)}
      <span className="text-ochre-ink/30">{"€".repeat(3 - tier)}</span>
    </span>
  );
}

export const minutes = (r: Recipe) => r.prepMinutes + r.cookMinutes;
export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}` : `${m} min`);

/** Pictos d'une recette : temps, prix, fer, cuisson longue. */
/** compact : pictos sans libellés · dense : en plus, sans le picto cuisson longue (déjà en badge). */
export function RecipeMeta({ recipe, className, compact = false, dense = false }: { recipe: Recipe; className?: string; compact?: boolean; dense?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Clock className="size-3.5" aria-hidden />
        {formatMinutes(minutes(recipe))}
      </span>
      <CostTier recipe={recipe} />
      {recipe.ironScore > 0 && <IronGauge level={recipe.ironScore} />}
      {recipe.longCook && !dense && (
        <span className="inline-flex items-center gap-1 text-terracotta-ink" title="Cuisson longue">
          <Flame className="size-3.5" aria-hidden />
          {!compact && "mijote"}
          <span className="sr-only">Cuisson longue</span>
        </span>
      )}
      {!compact && (
        <span className="inline-flex items-center gap-1 text-sage-ink" title="Adaptable pour bébé">
          <Baby className="size-3.5" aria-hidden />
          <span className="sr-only">Adaptable pour bébé</span>
        </span>
      )}
    </div>
  );
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card text-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-full bg-paper-deep p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 flex-1 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-all",
            value === o.value ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-end justify-between gap-3 pt-2 pb-4", className)}>
      <div className="min-w-0">
        {subtitle && <p className="text-base font-medium text-muted-foreground first-letter:uppercase">{subtitle}</p>}
        <h1 className="text-3xl leading-tight font-semibold md:text-4xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

export function EmptyState({ illustration, title, children, action }: { illustration: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="paper flex flex-col items-center rounded-3xl border border-border px-6 py-10 text-center shadow-card">
      <Art name={illustration} className="size-28" />
      <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
      {children && <div className="mt-2 max-w-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-2xl bg-sage-soft/60 px-4 py-3 text-xs leading-relaxed text-sage-ink", className)}>
      <Baby className="mt-0.5 size-4 shrink-0" aria-hidden />
      {BABY_DISCLAIMER}
    </p>
  );
}

export function Box({ title, icon, tone = "sage", children, className }: { title: ReactNode; icon?: ReactNode; tone?: "sage" | "plum" | "ochre" | "terracotta"; children: ReactNode; className?: string }) {
  const tones = {
    sage: "bg-sage-soft/70 text-sage-ink",
    plum: "bg-plum-soft/80 text-plum-ink",
    ochre: "bg-ochre-soft text-ochre-ink",
    terracotta: "bg-terracotta-soft/80 text-terracotta-ink",
  };
  return (
    <section className={cn("rounded-3xl px-5 py-4", tones[tone], className)}>
      <h3 className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold">
        {icon}
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  );
}
