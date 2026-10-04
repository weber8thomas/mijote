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
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft, Flame, MoonStar, Printer, RefreshCw, ShoppingBasket, Sparkles, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, RecipeCard, RecipeTile } from "@/components/cards";
import { EmptyState, IronGauge, PageHeader, Segmented } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, dayIndex, getState, ingredientsOf, nextWeek, thisWeek, today, useChoices, useStore, useWeek } from "@/data/store";
import { back, go } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";
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
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", week.status === "validated" ? "bg-primary-soft text-primary-ink" : "bg-ochre-soft text-ochre-ink")}>
            {week.status === "validated" ? "Validée" : `${chosen}/${meals.length} repas choisis`}
          </span>
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
            {week.status === "draft" && (
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
              <IronGauge level={dayIron(week, day, byId)} />
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
              <IronGauge level={dayIron(week, day, byId)} className="justify-center" />
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

/** Les 6 choix d'un repas en grille 2 × 3. Tap = choisir, appui long = aperçu. */
function ChoiceGrid({ weekStart, entry, picked, onChosen, fill }: { weekStart: string; entry: PlanEntry; picked?: string | null; onChosen: (r: Recipe) => void; fill?: boolean }) {
  const choices = useChoices(weekStart, entry.id);
  const selected = picked ?? (entry.confirmed ? entry.recipeId : undefined);
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3", fill && "h-full grid-rows-3 sm:grid-rows-2")}>
      {choices.map((r, i) => {
        const leftover = entry.isLeftover && r.id === entry.recipeId;
        return (
          <RecipeCard
            key={r.id}
            recipe={r}
            onTap={() => onChosen(r)}
            selected={r.id === selected}
            compact={fill}
            className={fill ? "min-h-0" : undefined}
            badges={
              <>
                {leftover && <Badge tone="sage">Reste d'hier soir</Badge>}
                {i === 0 && !leftover && <Badge tone="ochre">suggestion</Badge>}
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
        );
      })}
    </div>
  );
}

function ChoiceSheet({ week, entry, onClose }: { week: WeekPlan; entry: PlanEntry; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={mealTitle(entry)} description="6 idées · touche pour choisir, appui long pour un aperçu">
      <ChoiceGrid
        weekStart={week.weekStart}
        entry={entry}
        onChosen={(r) => {
          chooseWithUndo(week.weekStart, entry, r);
          onClose();
        }}
      />
    </Sheet>
  );
}

// ——— Choix guidé, repas par repas ———

export function ChooseView() {
  const [weekStart] = useSelectedWeek();
  const { week } = useWeek(weekStart);
  const meals = week ? mealsOf(week) : [];
  const [currentId, setCurrentId] = useState<string | undefined>(() => (week ? (nextToChoose(week) ?? meals[0])?.id : undefined));
  const [direction, setDirection] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const index = Math.max(0, meals.findIndex((e) => e.id === currentId));
  const entry = meals[index];

  if (!week || !entry)
    return (
      <div className="mx-auto max-w-md p-6 pt-16">
        <EmptyState illustration="courge" title="Rien à choisir" action={<Button onClick={() => go("/semaine")}>Voir la semaine</Button>} />
      </div>
    );

  const goTo = (id: string | undefined, dir: number) => {
    setDirection(dir);
    setPicked(null);
    setCurrentId(id);
  };

  const onChosen = (r: Recipe) => {
    if (picked) return;
    setPicked(r.id);
    actions.choose(weekStart, entry.id, r.id);
    // Laisse voir la coche un instant, puis passe au repas suivant pas encore choisi.
    window.setTimeout(() => {
      const fresh = mealsOf(getState().weeks[weekStart]);
      const after = fresh.find((e, i) => i > index && !e.confirmed) ?? fresh.find((e) => !e.confirmed);
      if (after) goTo(after.id, 1);
      else {
        toast.success("Tous les repas sont choisis", { description: "Jette un œil à la semaine, puis valide." });
        go("/semaine");
      }
    }, 280);
  };


  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="pt-safe shrink-0 bg-background/90">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 pt-2">
          <button type="button" onClick={() => back("/semaine")} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Retour à la semaine">
            <ArrowLeft className="size-5" />
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
        <div className="mx-auto flex max-w-3xl gap-1 px-4 pt-2 pb-2.5" aria-hidden>
          {meals.map((e, i) => (
            <span key={e.id} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i === index ? "bg-primary" : e.confirmed ? "bg-primary/45" : "bg-paper-deep")} />
          ))}
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden px-3 pb-2 sm:px-4">
        {entry.isLeftover && <p className="mb-1.5 shrink-0 text-sm text-primary-ink">Le dîner d'hier en laisse assez pour ce midi : garde-le, ou choisis autre chose.</p>}
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
            className="min-h-0 flex-1"
          >
            <ChoiceGrid weekStart={weekStart} entry={entry} picked={picked} onChosen={onChosen} fill />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="pb-safe shrink-0 border-t border-border bg-card/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <Button variant="ghost" className="h-12" disabled={index === 0} onClick={() => goTo(meals[index - 1]?.id, -1)}>
            <ChevronLeft aria-hidden /> Précédent
          </Button>
          <div className="flex-1" />
          {entry.confirmed && index < meals.length - 1 && (
            <Button variant="outline" className="h-12" onClick={() => goTo(meals[index + 1].id, 1)}>
              Suivant
            </Button>
          )}
          <Button className="h-12" onClick={() => go("/semaine")}>
            Voir la semaine
          </Button>
        </div>
      </footer>
    </div>
  );
}
