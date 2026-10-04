import { BABY_DISCLAIMER, costPerPortion, costTier, tierLabel, type Recipe } from "@mijote/shared";
import { Baby, Clock, Flame, MoonStar } from "lucide-react";
import type { ReactNode } from "react";
import { Art, Plate } from "@/components/art";
import { ingredientsOf, useStore } from "@/data/store";
import { cn } from "@/lib/utils";

// Petites briques partagées : visuel aquarelle, pictos, puces, en-têtes, états vides.

/** Teinte de lavis derrière chaque illustration. */
const TINTS: Record<string, string> = {
  courge: "#f8e3c6",
  potiron: "#f8dfc2",
  carotte: "#f9e1cc",
  "patate-douce": "#f6dccb",
  clementine: "#fae2c4",
  chataigne: "#efe0cf",
  poireau: "#e5ecd6",
  chou: "#e1ead3",
  brocoli: "#dfe9d2",
  epinard: "#dce7cf",
  kiwi: "#e6ecd0",
  celeri: "#ebecd8",
  lentilles: "#e8e8d0",
  betterave: "#f1dbe3",
  raisin: "#ece0ea",
  figue: "#efdde3",
  tomate: "#f6dcd3",
  poivron: "#f6d9d0",
  pomme: "#f5e0d5",
  poisson: "#dfe7ec",
  citron: "#f8eec5",
  poire: "#eff0cf",
  coing: "#f6ecc8",
  oeuf: "#f8ead0",
  "pois-chiche": "#f5e8cf",
  avoine: "#f3e8d0",
  panais: "#f3ead6",
  "pomme-de-terre": "#f1e5cf",
  navet: "#efe5ea",
  oignon: "#f3e3d6",
  champignon: "#efe5d7",
  "chou-fleur": "#efede2",
};

export const tintOf = (key: string) => TINTS[key] ?? "#efe6d3";

/** Visuel d'une recette : l'assiette aquarelle (protéine, légume, féculent) sur un lavis de couleur. */
export function RecipeVisual({ recipe, className, size = "md" }: { recipe: Recipe; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={cn("relative grid place-items-center overflow-hidden", className)} style={{ backgroundColor: tintOf(recipe.illustration) }}>
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "var(--paper-noise)" }} aria-hidden />
      <Plate recipe={recipe} className={cn("relative", size === "sm" ? "h-[92%]" : size === "lg" ? "h-[86%] max-h-64" : "h-[88%]")} />
    </div>
  );
}

/** Jauge de fer : « Fe » + 3 barres (0 à 3). */
export function IronGauge({ level, className }: { level: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={`Fer : ${level} sur 3`} title={`Fer : ${level}/3`}>
      <span className="grid h-[1.15rem] min-w-[1.4rem] place-items-center rounded-md bg-[#5a4a5e] px-1 text-[0.62rem] leading-none font-extrabold tracking-tight text-white">Fe</span>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("w-[3px] rounded-full", i <= level ? "bg-[#5a4a5e]" : "bg-[#5a4a5e]/20")} style={{ height: `${5 + i * 3}px` }} />
        ))}
      </span>
    </span>
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

/** Pictos d'une recette : temps, prix, fer, veille, cuisson longue. */
/** compact : pictos sans libellés · dense : en plus, sans les pictos veille / cuisson longue (déjà en badge). */
export function RecipeMeta({ recipe, className, compact = false, dense = false }: { recipe: Recipe; className?: string; compact?: boolean; dense?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Clock className="size-3.5" aria-hidden />
        {formatMinutes(minutes(recipe))}
      </span>
      <CostTier recipe={recipe} />
      {recipe.ironScore > 0 && <IronGauge level={recipe.ironScore} />}
      {recipe.prepAhead && !dense && (
        <span className="inline-flex items-center gap-1 text-plum-ink" title="Se prépare la veille">
          <MoonStar className="size-3.5" aria-hidden />
          {!compact && "veille"}
          <span className="sr-only">À préparer la veille</span>
        </span>
      )}
      {recipe.longCook && !dense && (
        <span className="inline-flex items-center gap-1 text-terracotta-ink" title="Cuisson longue">
          <Flame className="size-3.5" aria-hidden />
          {!compact && "mijote"}
          <span className="sr-only">Cuisson longue</span>
        </span>
      )}
      {!compact && (
        <span className="inline-flex items-center gap-1 text-primary-ink" title="Adaptable pour bébé">
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
        {subtitle && <p className="text-sm font-semibold text-muted-foreground first-letter:uppercase">{subtitle}</p>}
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
    <p className={cn("flex items-start gap-2 rounded-2xl bg-primary-soft/60 px-4 py-3 text-xs leading-relaxed text-primary-ink", className)}>
      <Baby className="mt-0.5 size-4 shrink-0" aria-hidden />
      {BABY_DISCLAIMER}
    </p>
  );
}

export function Box({ title, icon, tone = "sage", children, className }: { title: ReactNode; icon?: ReactNode; tone?: "sage" | "plum" | "ochre" | "terracotta"; children: ReactNode; className?: string }) {
  const tones = {
    sage: "bg-primary-soft/70 text-primary-ink",
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
