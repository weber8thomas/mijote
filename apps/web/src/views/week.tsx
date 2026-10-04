import {
  addDays,
  buildShoppingList,
  dayIron,
  DAYS,
  DAYS_SHORT,
  formatEuros,
  parseISODate,
  SLOT_LABELS,
  SLOT_LABELS_LONG,
  totals,
  type PlanEntry,
  type Recipe,
  type Slot,
  type WeekPlan,
} from "@mijote/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, ChevronDown, Flame, MoonStar, Printer, RefreshCw, ShoppingBasket, Sparkles, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, RecipeCard, RecipeRow, RecipeTile } from "@/components/cards";
import { EmptyState, IronLeaves, PageHeader, Segmented } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, dayIndex, ingredientsOf, nextWeek, thisWeek, today, useAlternatives, useStore, useWeek } from "@/data/store";
import { go } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const weekRange = (weekStart: string) => {
  const a = parseISODate(weekStart);
  const b = parseISODate(addDays(weekStart, 6));
  const sameMonth = a.getMonth() === b.getMonth();
  return `du ${format(a, sameMonth ? "d" : "d MMMM", { locale: fr })} au ${format(b, "d MMMM", { locale: fr })}`;
};

export const dayLabel = (weekStart: string, day: number) => format(parseISODate(addDays(weekStart, day)), "d", { locale: fr });

/** Ordre d'affichage des créneaux : le dessert suit le repas auquel il est rattaché. */
export const slotOrder = (dessertSlot: "lunch" | "dinner"): Slot[] => (dessertSlot === "lunch" ? ["breakfast", "lunch", "dessert", "dinner"] : ["breakfast", "lunch", "dinner", "dessert"]);

export function WeekSwitch() {
  const [week, setWeek] = useSelectedWeek();
  return (
    <Segmented
      value={week === thisWeek() ? "this" : "next"}
      onChange={(v) => setWeek(v === "this" ? thisWeek() : nextWeek())}
      options={[
        { value: "this", label: "Cette semaine" },
        { value: "next", label: "Semaine prochaine" },
      ]}
      className="w-full sm:w-auto"
    />
  );
}

export function WeekView() {
  const [weekStart] = useSelectedWeek();
  const { week, warnings, byId } = useWeek(weekStart);
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const order = slotOrder(s.household.dessertSlot);
  const entry = week?.entries.find((e) => e.id === open);

  const estimate = useMemo(() => {
    if (!week) return null;
    const items =
      s.shopping[weekStart] ??
      buildShoppingList({ week, recipes: byId, ingredients: ingredientsOf(s).byId, pantryInStock: new Set(Object.keys(s.pantry).filter((k) => s.pantry[k])) });
    return totals(items);
  }, [week, s, weekStart, byId]);

  const warnedIds = new Set(warnings.flatMap((w) => w.entryIds));

  const prepare = () => {
    actions.generate(weekStart);
    toast.success("Semaine préparée", { description: "Touche un repas pour voir 6 autres idées." });
  };

  const bottomBar = week && estimate && (
    <div className="paper mx-auto flex max-w-3xl items-center gap-3 rounded-full py-2 pr-2 pl-5 shadow-float ring-1 ring-border lg:max-w-4xl">
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-xs font-semibold text-muted-foreground">Total estimé</p>
        <p className="truncate text-sm font-bold">
          ~ {formatEuros(estimate.market)} marché · ~ {formatEuros(estimate.supermarket)} supermarché
        </p>
      </div>
      {week.status === "draft" ? (
        <Button size="lg" className="h-12 shrink-0" onClick={() => setConfirming(true)}>
          <CheckCircle2 aria-hidden /> Valider
        </Button>
      ) : (
        <Button size="lg" className="h-12 shrink-0" onClick={() => go("/courses")}>
          <ShoppingBasket aria-hidden /> Courses
        </Button>
      )}
    </div>
  );

  return (
    <Shell tab="week" bottomBar={bottomBar}>
      <PageHeader
        title="Semaine"
        subtitle={weekRange(weekStart)}
        actions={
          week && (
            <Button variant="ghost" size="icon-lg" onClick={() => go(`/semaine/imprimer/${weekStart}`)} aria-label="Imprimer le tableau frigo">
              <Printer className="size-5" />
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <WeekSwitch />
        {week && (
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", week.status === "validated" ? "bg-primary-soft text-primary-ink" : "bg-ochre-soft text-ochre-ink")}>
              {week.status === "validated" ? "Validée" : "Brouillon"}
            </span>
            {week.status === "draft" && (
              <Button variant="ghost" size="sm" onClick={prepare}>
                <RefreshCw aria-hidden /> Autre proposition
              </Button>
            )}
          </div>
        )}
      </div>

      {!week ? (
        <EmptyState
          illustration="courge"
          title="La semaine n'est pas encore prête"
          action={
            <Button size="lg" className="h-14 w-full text-base" onClick={prepare}>
              <Sparkles aria-hidden /> Préparer la semaine
            </Button>
          }
        >
          Mijoté propose 7 jours de repas de saison, équilibrés et adaptés à bébé. Tu changes ce que tu veux ensuite.
        </EmptyState>
      ) : (
        <>
          {warnings.length > 0 && (
            <div className="mb-4 rounded-3xl bg-ochre-soft/80 text-ochre-ink">
              <button type="button" className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold" onClick={() => setShowWarnings((v) => !v)} aria-expanded={showWarnings}>
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{warnings.length === 1 ? warnings[0].message : `${warnings.length} petits points d'équilibre à regarder`}</span>
                {warnings.length > 1 && <ChevronDown className={cn("size-4 transition-transform", showWarnings && "rotate-180")} aria-hidden />}
              </button>
              <AnimatePresence initial={false}>
                {showWarnings && warnings.length > 1 && (
                  <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden px-4 text-sm">
                    {warnings.map((w) => (
                      <li key={w.id} className="border-t border-ochre/20 py-2 first:border-0">
                        {w.message}
                      </li>
                    ))}
                    <li className="h-2" />
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
          <WeekGrid week={week} byId={byId} order={order} onOpen={setOpen} warnedIds={warnedIds} />
          <p className="mt-4 text-center text-xs text-muted-foreground">Touche un repas pour le changer · appui long pour un aperçu</p>
        </>
      )}

      {week && entry && <AlternativesSheet week={week} entry={entry} byId={byId} onClose={() => setOpen(null)} />}

      <Sheet
        open={confirming}
        onOpenChange={setConfirming}
        title="Valider la semaine ?"
        description="La liste de courses sera générée. Tu pourras encore changer des repas : la liste suivra, en gardant ce qui est déjà coché."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="h-12 flex-1" onClick={() => setConfirming(false)}>
              Pas encore
            </Button>
            <Button
              size="lg"
              className="h-12 flex-1"
              onClick={() => {
                actions.validate(weekStart);
                setConfirming(false);
                toast.success("Semaine validée", { description: "La liste de courses est prête.", action: { label: "Voir", onClick: () => go("/courses") } });
              }}
            >
              <CheckCircle2 aria-hidden /> Valider
            </Button>
          </div>
        }
      >
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• {week?.entries.filter((e) => !e.isLeftover).length} repas, dont {week?.entries.filter((e) => e.isLeftover).length} restes réutilisés</li>
          <li>• Les basiques du placard en stock ne seront pas ajoutés</li>
        </ul>
      </Sheet>
    </Shell>
  );
}

function WeekGrid({ week, byId, order, onOpen, warnedIds }: { week: WeekPlan; byId: Map<string, Recipe>; order: Slot[]; onOpen: (id: string) => void; warnedIds: Set<string> }) {
  const at = (day: number, slot: Slot) => week.entries.find((e) => e.day === day && e.slot === slot);
  const tile = (e: PlanEntry | undefined) => {
    if (!e) return <div className="aspect-[5/6] rounded-2xl border border-dashed border-border-strong" />;
    const r = byId.get(e.recipeId)!;
    return (
      <RecipeTile
        recipe={r}
        layoutId={`entry-${e.id}`}
        onTap={() => onOpen(e.id)}
        eyebrow={SLOT_LABELS[e.slot]}
        className="h-full"
        badges={
          <>
            {e.isLeftover && <Badge tone="sage">Reste</Badge>}
            {r.prepAhead && !e.isLeftover && (
              <Badge tone="plum">
                <MoonStar className="size-3" aria-hidden />
                <span className="sr-only">À préparer la veille</span>
              </Badge>
            )}
            {r.longCook && !e.isLeftover && (
              <Badge tone="terracotta">
                <Flame className="size-3" aria-hidden />
                <span className="sr-only">Cuisson longue</span>
              </Badge>
            )}
            {warnedIds.has(e.id) && (
              <Badge tone="ochre">
                <AlertTriangle className="size-3" aria-hidden />
                <span className="sr-only">Point d'équilibre</span>
              </Badge>
            )}
          </>
        }
      />
    );
  };
  const todayIdx = week.weekStart === thisWeek() ? dayIndex(today()) : -1;

  return (
    <>
      {/* Mobile & tablette : un jour par ligne, 4 vignettes */}
      <div className="grid gap-5 md:grid-cols-2 md:gap-x-6 xl:hidden">
        {DAYS.map((name, day) => (
          <section key={day} aria-label={name}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className={cn("font-heading text-lg font-semibold", day === todayIdx && "text-primary-ink")}>
                {name} <span className="font-sans text-sm font-semibold text-muted-foreground">{dayLabel(week.weekStart, day)}</span>
                {day === todayIdx && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 font-sans text-xs text-primary-ink">aujourd'hui</span>}
              </h2>
              <IronLeaves level={dayIron(week, day, byId)} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {order.map((slot) => (
                <div key={slot}>{tile(at(day, slot))}</div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop : tableau 7 × 4 */}
      <div className="hidden xl:block">
        <div className="grid grid-cols-[6rem_repeat(7,minmax(0,1fr))] gap-2.5">
          <div />
          {DAYS_SHORT.map((d, day) => (
            <div key={d} className={cn("rounded-2xl py-2 text-center", day === todayIdx && "bg-primary-soft")}>
              <p className="font-heading text-lg font-semibold">
                {d} <span className="font-sans text-sm text-muted-foreground">{dayLabel(week.weekStart, day)}</span>
              </p>
              <IronLeaves level={dayIron(week, day, byId)} className="justify-center" />
            </div>
          ))}
          {order.map((slot) => (
            <div key={slot} className="contents">
              <div className="flex items-center text-sm font-bold text-muted-foreground">{SLOT_LABELS_LONG[slot]}</div>
              {DAYS.map((_, day) => (
                <div key={day}>{tile(at(day, slot))}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AlternativesSheet({ week, entry, byId, onClose }: { week: WeekPlan; entry: PlanEntry; byId: Map<string, Recipe>; onClose: () => void }) {
  const current = byId.get(entry.recipeId)!;
  const alts = useAlternatives(week.weekStart, entry.id);
  const choose = (r: Recipe) => {
    const previous = entry.recipeId;
    actions.replace(week.weekStart, entry.id, r.id);
    onClose();
    toast(`${SLOT_LABELS_LONG[entry.slot]} du ${DAYS[entry.day].toLowerCase()} : ${r.title}`, {
      action: { label: "Annuler", onClick: () => actions.replace(week.weekStart, entry.id, previous) },
      icon: <Undo2 className="size-4" />,
    });
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={`${DAYS[entry.day]} · ${SLOT_LABELS_LONG[entry.slot]}`} description={entry.isLeftover ? `Reste du dîner de ${DAYS[entry.day - 1]?.toLowerCase()} : rien à cuisiner.` : undefined}>
      <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Au menu</p>
      <RecipeRow recipe={current} onTap={() => go(`/recettes/${current.slug}`)} badges={entry.isLeftover ? <Badge tone="sage">Reste</Badge> : undefined} />
      <p className="mt-5 mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">{alts.length} autres idées · touche pour choisir</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {alts.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            onTap={() => choose(r)}
            badges={
              <>
                {r.prepAhead && (
                  <Badge tone="plum">
                    <MoonStar className="size-3" aria-hidden /> veille
                  </Badge>
                )}
                {r.longCook && (
                  <Badge tone="terracotta">
                    <Flame className="size-3" aria-hidden /> mijote
                  </Badge>
                )}
              </>
            }
          />
        ))}
      </div>
    </Sheet>
  );
}
