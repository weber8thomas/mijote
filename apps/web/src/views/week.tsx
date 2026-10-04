import {
  addDays,
  buildShoppingList,
  dayIron,
  DAYS,
  DAYS_SHORT,
  formatEuros,
  mealsOf,
  nextToChoose,
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
import { AlertTriangle, CalendarPlus, CheckCircle2, ChevronDown, ChevronLeft, Flame, Plus, Printer, RefreshCw, RotateCcw, Search, ShoppingBasket, Undo2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge, RecipeCard, RecipeTile } from "@/components/cards";
import { EmptyState, IronGauge, PageHeader, Segmented } from "@/components/kit";
import { CocotteIcon } from "@/components/brand";
import { Shell } from "@/components/shell";
import { SearchDialog } from "@/components/search";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, dayIndex, getState, ingredientsOf, thisWeek, today, useChoices, usePickable, useStore, useWeek } from "@/data/store";
import { go, replace } from "@/lib/router";
import { downloadOrShareIcs, icsFilename, weekToIcs } from "@/lib/ics";
import { setSelectedWeek, useSelectedWeek } from "@/lib/ui";
import { MonthView } from "@/views/month";
import { WeekPicker, weeksFromNow } from "@/components/week-picker";
import { cn } from "@/lib/utils";

export const weekRange = (weekStart: string) => {
  const a = parseISODate(weekStart);
  const b = parseISODate(addDays(weekStart, 6));
  const sameMonth = a.getMonth() === b.getMonth();
  return `du ${format(a, sameMonth ? "d" : "d MMMM", { locale: fr })} au ${format(b, "d MMMM", { locale: fr })}`;
};

export const dayLabel = (weekStart: string, day: number) => format(parseISODate(addDays(weekStart, day)), "d", { locale: fr });

/** Ordre d'affichage : le dessert suit le repas auquel il est rattaché. */
export const slotOrder = (dessertSlot: "lunch" | "dinner"): Slot[] => (dessertSlot === "lunch" ? ["lunch", "dessert", "dinner"] : ["lunch", "dinner", "dessert"]);

const mealTitle = (e: Pick<PlanEntry, "day" | "slot">) => `${DAYS[e.day]} · ${SLOT_LABELS_LONG[e.slot]}`;

/** Sélecteur de semaine (flèches + calendrier), partagé avec l'écran Courses. */
export function WeekSwitch() {
  return <WeekPicker className="w-full sm:w-auto" />;
}

/** Choix d'une recette, avec annulation si un choix précédent est remplacé. */
function chooseWithUndo(weekStart: string, entry: PlanEntry, r: Recipe) {
  const previous = entry.recipeId;
  const nextLunch = (w = getState().weeks[weekStart]) => (entry.slot === "dinner" ? w?.entries.find((e) => e.day === entry.day + 1 && e.slot === "lunch") : undefined);
  const wasLeftover = nextLunch()?.isLeftover && nextLunch()?.confirmed;
  actions.choose(weekStart, entry.id, r.id);
  // Le midi du lendemain était le reste de ce dîner : il redevient à choisir.
  const freed = wasLeftover && nextLunch()?.confirmed === false ? nextLunch() : undefined;
  if (freed) {
    toast(`${mealTitle(freed)} est à choisir`, { description: "Le nouveau dîner ne laisse pas de reste pour le lendemain midi." });
    return;
  }
  if (previous !== r.id && entry.confirmed)
    toast(`${mealTitle(entry)} : ${r.title}`, {
      action: { label: "Annuler", onClick: () => actions.choose(weekStart, entry.id, previous) },
      icon: <Undo2 className="size-4" />,
    });
}

// ——— Vue d'ensemble de la semaine ———

export function WeekView() {
  const [weekStart] = useSelectedWeek();
  const { week, warnings, byId } = useWeek(weekStart);
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [mode, setMode] = useState<"week" | "month">("week");
  const past = weeksFromNow(weekStart) < 0;
  const entry = week?.entries.find((e) => e.id === open);
  const meals = week ? mealsOf(week) : [];
  const chosen = meals.filter((e) => e.confirmed).length;
  const next = week && nextToChoose(week);

  const estimate = useMemo(() => {
    if (!week) return null;
    const items =
      s.shopping[weekStart] ??
      buildShoppingList({ week, recipes: byId, ingredients: ingredientsOf(s).byId, pantryInStock: new Set(Object.keys(s.pantry).filter((k) => s.pantry[k])) });
    return totals(items);
  }, [week, s, weekStart, byId]);

  const prepare = () => {
    actions.generate(weekStart);
    go("/semaine/choix");
  };

  const bottomBar = week && estimate && (
    <div className="paper mx-auto flex max-w-3xl items-center gap-3 rounded-full py-2 pr-2 pl-5 shadow-float ring-1 ring-border lg:max-w-4xl">
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-xs font-semibold text-muted-foreground">Total estimé</p>
        <p className="truncate text-sm font-bold">
          ~ {formatEuros(estimate.market)} marché · ~ {formatEuros(estimate.supermarket)} supermarché
        </p>
      </div>
      {week.status === "validated" ? (
        <Button size="lg" className="h-12 shrink-0" onClick={() => go("/courses")}>
          <ShoppingBasket aria-hidden /> Courses
        </Button>
      ) : next ? (
        <Button size="lg" className="h-12 shrink-0" onClick={() => go("/semaine/choix")}>
          Choisir · {chosen}/{meals.length}
        </Button>
      ) : (
        <Button size="lg" className="h-12 shrink-0" onClick={() => setConfirming(true)}>
          <CheckCircle2 aria-hidden /> Valider
        </Button>
      )}
    </div>
  );

  return (
    <Shell tab="week" bottomBar={mode === "week" ? bottomBar : undefined}>
      <PageHeader
        title="Semaine"
        subtitle={weekRange(weekStart)}
        actions={
          week && (
            <>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Ajouter les repas à mon agenda"
                onClick={async () => {
                  const how = await downloadOrShareIcs(icsFilename(weekStart), weekToIcs(week, byId, { onlyConfirmed: week.status === "draft" }));
                  if (how === "downloaded") toast.success("Fichier agenda téléchargé", { description: "Ouvre-le pour ajouter les repas à ton agenda." });
                }}
              >
                <CalendarPlus className="size-5" />
              </Button>
              <Button variant="ghost" size="icon-lg" onClick={() => go(`/semaine/imprimer/${weekStart}`)} aria-label="Imprimer le tableau frigo">
                <Printer className="size-5" />
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <WeekSwitch />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "week", label: "Semaine" },
            { value: "month", label: "Mois" },
          ]}
        />
        {mode === "week" && week && (
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", week.status === "validated" ? "bg-primary-soft text-primary-ink" : "bg-ochre-soft text-ochre-ink")}>
            {week.status === "validated" ? "Validée" : `${chosen}/${meals.length} repas choisis`}
          </span>
        )}
        {mode === "week" && week?.status === "validated" && (
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              actions.reopen(weekStart);
              go(`/semaine/choix/${meals[0].id}`);
              toast("Semaine rouverte", { description: "Change les repas que tu veux, puis valide à nouveau : les articles déjà cochés restent cochés." });
            }}
          >
            <RotateCcw aria-hidden /> Modifier les repas
          </Button>
        )}
      </div>

      {mode === "month" && (
        <MonthView
          onPickDay={(ws) => {
            setSelectedWeek(ws);
            setMode("week");
          }}
        />
      )}

      {mode === "month" ? null : !week ? (
        <EmptyState
          illustration="courge"
          title={past ? "Semaine passée, rien de prévu" : "La semaine n'est pas encore prête"}
          action={
            past ? undefined : (
              <Button size="lg" className="h-14 w-full text-base" onClick={prepare}>
                <CocotteIcon className="size-5" /> Préparer la semaine
              </Button>
            )
          }
        >
          Pour chaque déjeuner et dîner, Mijoté te propose 6 idées de saison, équilibrées et adaptées à bébé. Tu choisis, repas par repas.
        </EmptyState>
      ) : (
        <>
          {week.status === "draft" && next && (
            <button
              type="button"
              onClick={() => go("/semaine/choix")}
              className="mb-4 flex w-full items-center gap-4 rounded-3xl bg-primary px-5 py-4 text-left text-primary-foreground shadow-brand"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-lg font-semibold">{chosen === 0 ? "Choisis tes repas" : "Continue tes choix"}</span>
                <span className="text-sm opacity-90">
                  {meals.length - chosen} à choisir · prochain : {mealTitle(next).toLowerCase()}
                </span>
              </span>
              <span className="h-2 w-16 overflow-hidden rounded-full bg-white/25">
                <span className="block h-full rounded-full bg-white" style={{ width: `${(chosen / meals.length) * 100}%` }} />
              </span>
            </button>
          )}

          {warnings.length > 0 && (
            <div className="mb-4 rounded-3xl bg-ochre-soft/80 text-ochre-ink">
              <button type="button" className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold" onClick={() => setShowWarnings((v) => !v)} aria-expanded={showWarnings}>
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{warnings.length === 1 ? warnings[0].message : `${warnings.length} petits points d'équilibre à regarder`}</span>
                {warnings.length > 1 && <ChevronDown className={cn("size-4 transition-transform", showWarnings && "rotate-180")} aria-hidden />}
              </button>
              {showWarnings && warnings.length > 1 && (
                <ul className="px-4 pb-2 text-sm">
                  {warnings.map((w) => (
                    <li key={w.id} className="border-t border-ochre/20 py-2 first:border-0">
                      {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <WeekGrid week={week} byId={byId} order={slotOrder(s.household.dessertSlot)} onOpen={setOpen} warnedIds={new Set(warnings.flatMap((w) => w.entryIds))} />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>Touche un repas pour voir ses 6 choix · appui long pour un aperçu</span>
            {week.status === "draft" && chosen === 0 && (
              <button type="button" onClick={() => actions.generate(weekStart)} className="inline-flex h-10 items-center gap-1 font-semibold underline-offset-4 hover:underline">
                <RefreshCw className="size-3.5" aria-hidden /> Tout reproposer
              </button>
            )}
          </div>
        </>
      )}

      {week && entry && <ChoiceSheet week={week} entry={entry} onClose={() => setOpen(null)} />}

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
          <li>• 14 repas, dont {meals.filter((e) => e.isLeftover).length} restes réutilisés, et 7 desserts</li>
          <li>• Les basiques du placard en stock ne seront pas ajoutés</li>
        </ul>
      </Sheet>
    </Shell>
  );
}

function WeekGrid({ week, byId, order, onOpen, warnedIds }: { week: WeekPlan; byId: Map<string, Recipe>; order: Slot[]; onOpen: (id: string) => void; warnedIds: Set<string> }) {
  const at = (day: number, slot: Slot) => week.entries.find((e) => e.day === day && e.slot === slot);
  const todayIdx = week.weekStart === thisWeek() ? dayIndex(today()) : -1;
  const tile = (e: PlanEntry | undefined) => {
    if (!e) return <div className="aspect-[4/5] rounded-2xl border border-dashed border-border-strong" />;
    const r = byId.get(e.recipeId)!;
    const suggestion = !e.confirmed && e.slot !== "dessert" && week.status === "draft";
    return (
      <RecipeTile
        recipe={r}
        onTap={() => onOpen(e.id)}
        eyebrow={SLOT_LABELS[e.slot]}
        className={cn("h-full", suggestion && "opacity-70")}
        badges={
          <>
            {suggestion && <Badge tone="ochre">à choisir</Badge>}
            {e.isLeftover && <Badge tone="sage">Reste</Badge>}
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

  return (
    <>
      {/* Mobile & tablette : un jour par ligne, déjeuner · dîner · dessert */}
      <div className="grid gap-5 md:grid-cols-2 md:gap-x-6 xl:hidden">
        {DAYS.map((name, day) => (
          <section key={day} aria-label={name}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className={cn("font-heading text-lg font-semibold", day === todayIdx && "text-primary-ink")}>
                {name} <span className="font-sans text-sm font-semibold text-muted-foreground">{dayLabel(week.weekStart, day)}</span>
                {day === todayIdx && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 font-sans text-xs text-primary-ink">aujourd'hui</span>}
              </h2>
              <IronGauge level={dayIron(week, day, byId)} size={26} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {order.map((slot) => (
                <div key={slot}>{tile(at(day, slot))}</div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop : tableau 7 × 3 */}
      <div className="hidden xl:block">
        <div className="grid grid-cols-[6rem_repeat(7,minmax(0,1fr))] gap-2.5">
          <div />
          {DAYS_SHORT.map((d, day) => (
            <div key={d} className={cn("rounded-2xl py-2 text-center", day === todayIdx && "bg-primary-soft")}>
              <p className="font-heading text-lg font-semibold">
                {d} <span className="font-sans text-sm text-muted-foreground">{dayLabel(week.weekStart, day)}</span>
              </p>
              <IronGauge level={dayIron(week, day, byId)} className="mx-auto mt-0.5" />
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

const PAGE = 6;

/** Moulinette : relancer les 6 idées, ou en afficher 6 de plus. */
function ChoiceTools({ weekStart, entry, count, total, onMore, className }: { weekStart: string; entry: PlanEntry; count: number; total: number; onMore: () => void; className?: string }) {
  const [spin, setSpin] = useState(0);
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant="outline"
        className="h-12 flex-1"
        onClick={() => {
          setSpin((v) => v + 1);
          actions.reroll(weekStart, entry.id);
        }}
      >
        <motion.span key={spin} initial={{ rotate: spin ? -360 : 0 }} animate={{ rotate: 0 }} transition={{ duration: 0.5, ease: [0.22, 0.8, 0.3, 1] }} className="inline-flex">
          <RefreshCw aria-hidden />
        </motion.span>
        Autres idées
      </Button>
      <Button variant="outline" className="h-12 flex-1" disabled={total < count} onClick={onMore}>
        <Plus aria-hidden /> 6 de plus
      </Button>
    </div>
  );
}

/** Les choix d'un repas en grille 2 × 3 (+ 6 par page). Tap = choisir, appui long = aperçu. */
function ChoiceGrid({ weekStart, entry, picked, onChosen, fill, count = PAGE }: { weekStart: string; entry: PlanEntry; picked?: string | null; onChosen: (r: Recipe) => void; fill?: boolean; count?: number }) {
  const choices = useChoices(weekStart, entry.id, count);
  const selected = picked ?? (entry.confirmed ? entry.recipeId : undefined);
  const ref = useRef<HTMLDivElement>(null);
  // Une page de plus : la grille défile jusqu'aux nouvelles idées.
  const shown = useRef(count);
  useEffect(() => {
    if (count > shown.current) (ref.current?.children[shown.current] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", block: "start" });
    shown.current = count;
  }, [count]);
  const paged = count > PAGE;
  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3",
        fill && !paged && "h-full grid-rows-3 sm:grid-rows-2",
        // Plusieurs pages : chaque rangée garde la hauteur d'un tiers (mobile) ou d'une moitié (tablette) de l'écran.
        fill && paged && "auto-rows-[calc((100cqh-1.25rem)/3)] sm:auto-rows-[calc((100cqh-0.75rem)/2)]",
      )}
    >
      {choices.map((r, i) => {
        const leftover = entry.isLeftover && r.id === entry.recipeId;
        return (
          <RecipeCard
            key={r.id}
            recipe={r}
            onTap={() => onChosen(r)}
            onChoose={() => onChosen(r)}
            selected={r.id === selected}
            compact={fill}
            className={cn(fill && "min-h-0", i >= PAGE && "animate-in duration-300 fade-in slide-in-from-bottom-2")}
            badges={
              <>
                {leftover && <Badge tone="sage">Reste d'hier soir</Badge>}
                {i === 0 && !leftover && !entry.confirmed && <Badge tone="ochre">suggestion</Badge>}
                {r.longCook && (
                  <Badge tone="terracotta">
                    <Flame className="size-3" aria-hidden /> mijote
                  </Badge>
                )}
              </>
            }
          />
        );
      })}
    </div>
  );
}

/** Nombre de choix affichés pour un repas ; repart à 6 quand on change de repas ou qu'on relance. */
function usePages(entry: PlanEntry | undefined) {
  const [pages, setPages] = useState({ key: "", count: PAGE });
  const key = entry ? `${entry.id}:${entry.rerolls ?? 0}` : "";
  const count = pages.key === key ? pages.count : PAGE;
  return { count, more: () => setPages({ key, count: count + PAGE }) };
}

function ChoiceSheet({ week, entry, onClose }: { week: WeekPlan; entry: PlanEntry; onClose: () => void }) {
  const [searching, setSearching] = useState(false);
  const pickable = usePickable(week.weekStart, entry.id);
  const pages = usePages(entry);
  const total = useChoices(week.weekStart, entry.id, pages.count).length;
  const pick = (r: Recipe) => {
    chooseWithUndo(week.weekStart, entry, r);
    onClose();
  };
  return (
    <>
      <Sheet
        open={!searching}
        onOpenChange={(o) => !o && onClose()}
        title={mealTitle(entry)}
        description={`${total} idées · touche pour choisir, appui long pour un aperçu`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 flex-1" onClick={() => setSearching(true)}>
              <Search aria-hidden /> Autre recette…
            </Button>
            {entry.confirmed && entry.slot !== "dessert" && week.status === "draft" && (
              <Button
                variant="ghost"
                className="h-12"
                onClick={() => {
                  actions.unchoose(week.weekStart, entry.id);
                  onClose();
                }}
              >
                <RotateCcw aria-hidden /> À choisir
              </Button>
            )}
          </div>
        }
      >
        <ChoiceTools weekStart={week.weekStart} entry={entry} count={pages.count} total={total} onMore={pages.more} className="mb-3" />
        <ChoiceGrid weekStart={week.weekStart} entry={entry} onChosen={pick} count={pages.count} />
      </Sheet>
      <SearchDialog
        open={searching}
        onOpenChange={(o) => (o ? setSearching(true) : onClose())}
        pick={{ slot: entry.slot, title: mealTitle(entry), onPick: pick, hidden: pickable.hidden, warns: (r) => pickable.warns.has(r.id) }}
      />
    </>
  );
}

// ——— Choix guidé, repas par repas ———
// Chaque repas a sa route (#/semaine/choix/<id>) : le geste retour du téléphone revient au repas précédent.

/** Annule un choix : retour à la recette précédente, ou « à choisir » si le repas ne l'était pas encore. */
function undoChoice(weekStart: string, before: PlanEntry) {
  if (before.confirmed) actions.choose(weekStart, before.id, before.recipeId);
  else actions.unchoose(weekStart, before.id);
}

export function ChooseView({ entryId }: { entryId?: string }) {
  const [weekStart] = useSelectedWeek();
  const { week } = useWeek(weekStart);
  const meals = week ? mealsOf(week) : [];
  const [pickedFor, setPickedFor] = useState<{ entry: string; recipe: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const found = meals.findIndex((e) => e.id === entryId);
  const fallback = week ? (nextToChoose(week) ?? meals[0]) : undefined;
  const index = found >= 0 ? found : fallback ? meals.indexOf(fallback) : 0;
  const entry = meals[index];
  // Sens de l'animation : vers la droite quand on avance dans la semaine.
  const [nav, setNav] = useState({ index, direction: 1 });
  if (nav.index !== index) {
    setNav({ index, direction: index >= nav.index ? 1 : -1 });
    // Revenir sur un repas repart d'un écran neuf (le choix « en cours » de la visite précédente est oublié).
    setPickedFor(null);
  }
  const direction = nav.direction;
  const picked = pickedFor && pickedFor.entry === entry?.id ? pickedFor.recipe : null;
  // Sans repas dans l'adresse : on y met celui à choisir, sans créer d'étape d'historique.
  useEffect(() => {
    if (entry && found < 0) replace(`/semaine/choix/${entry.id}`);
  }, [entry, found]);
  const pickable = usePickable(weekStart, entry?.id);
  const pages = usePages(entry);
  const total = useChoices(weekStart, entry?.id, pages.count).length;

  if (!week || !entry)
    return (
      <div className="mx-auto max-w-md p-6 pt-16">
        <EmptyState illustration="courge" title="Rien à choisir" action={<Button onClick={() => go("/semaine")}>Voir la semaine</Button>} />
      </div>
    );

  const open = (id: string) => go(`/semaine/choix/${id}`);

  const onChosen = (r: Recipe) => {
    if (picked) return;
    const before = entry;
    setPickedFor({ entry: entry.id, recipe: r.id });
    actions.choose(weekStart, entry.id, r.id);
    toast(`${mealTitle(entry)} : ${r.title}`, {
      action: {
        label: "Annuler",
        onClick: () => {
          undoChoice(weekStart, before);
          open(before.id);
        },
      },
      icon: <Undo2 className="size-4" />,
    });
    // Laisse voir la coche un instant, puis passe au repas suivant pas encore choisi.
    window.setTimeout(() => {
      const fresh = mealsOf(getState().weeks[weekStart]);
      const after = fresh.find((e, i) => i > index && !e.confirmed) ?? fresh.find((e) => !e.confirmed);
      if (after) open(after.id);
      else {
        toast.success("Tous les repas sont choisis", { description: "Jette un œil à la semaine, puis valide." });
        replace("/semaine");
      }
    }, 280);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="pt-safe shrink-0 bg-background/90">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 pt-2">
          <button type="button" onClick={() => replace("/semaine")} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Retour à la semaine">
            <X className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Repas {index + 1}/{meals.length} · appui long : aperçu
            </p>
            <h1 className="truncate text-2xl leading-tight font-semibold">
              {DAYS[entry.day]} {dayLabel(weekStart, entry.day)} · {SLOT_LABELS_LONG[entry.slot]}
            </h1>
          </div>
        </div>
        <div className="mx-auto flex max-w-3xl gap-1 px-4 pt-2 pb-2.5">
          {meals.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => open(e.id)}
              className="flex h-6 flex-1 items-center"
              aria-label={`${mealTitle(e)}${e.confirmed ? " (choisi)" : ""}`}
              aria-current={i === index ? "step" : undefined}
            >
              <span className={cn("h-1.5 w-full rounded-full transition-colors duration-300", i === index ? "bg-primary" : e.confirmed ? "bg-primary/45" : "bg-paper-deep")} />
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden px-3 pb-2 sm:px-4">
        {entry.isLeftover && <p className="mb-1.5 shrink-0 text-sm text-primary-ink">Le dîner d'hier en laisse assez pour ce midi : garde-le, ou choisis autre chose.</p>}
        <ChoiceTools weekStart={weekStart} entry={entry} count={pages.count} total={total} onMore={pages.more} className="mb-2 shrink-0" />
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={entry.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 56, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -56, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26, ease: [0.22, 0.8, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            className={cn("min-h-0 flex-1", pages.count > PAGE && "overflow-y-auto overscroll-contain [container-type:size]")}
          >
            <ChoiceGrid key={entry.rerolls ?? 0} weekStart={weekStart} entry={entry} picked={picked} onChosen={onChosen} fill count={pages.count} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="pb-safe shrink-0 border-t border-border bg-card/95">
        <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-2 py-2">
          <Button variant="ghost" size="icon-lg" className="size-12" disabled={index === 0} onClick={() => open(meals[index - 1].id)} aria-label="Repas précédent">
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="outline" className="h-12 flex-1" onClick={() => setSearching(true)}>
            <Search aria-hidden /> Autre recette…
          </Button>
          {entry.confirmed ? (
            <Button
              variant="ghost"
              className="h-12"
              onClick={() => {
                actions.unchoose(weekStart, entry.id);
                toast(`${mealTitle(entry)} : à choisir`);
              }}
            >
              <RotateCcw aria-hidden /> À choisir
            </Button>
          ) : null}
          <Button className="h-12" onClick={() => replace("/semaine")}>
            Semaine
          </Button>
        </div>
      </footer>

      <SearchDialog
        open={searching}
        onOpenChange={setSearching}
        pick={{ slot: entry.slot, title: mealTitle(entry), onPick: onChosen, hidden: pickable.hidden, warns: (r) => pickable.warns.has(r.id) }}
      />
    </div>
  );
}
