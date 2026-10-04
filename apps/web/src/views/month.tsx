import { addDays, DAYS, mondayOf, parseISODate, toISODate, type PlanEntry, type Recipe } from "@mijote/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Plate } from "@/components/art";
import { recipeMap, today, useStore } from "@/data/store";
import { useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Vue « Mois » : une case par jour, avec les assiettes du déjeuner et du dîner. Touche un jour pour l'ouvrir.

const INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

/** 1er du mois contenant la date, AAAA-MM-JJ. */
const firstOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
/** Mois de la semaine : celui de son jeudi (comme pour la saison). */
const monthOfWeekStart = (weekStart: string) => firstOfMonth(addDays(weekStart, 3));

function shiftMonth(first: string, n: number) {
  const d = parseISODate(first);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

/** Lundis des semaines (lignes) qui couvrent le mois. */
function weeksOfMonth(first: string) {
  const d = parseISODate(first);
  const last = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const rows: string[] = [];
  for (let w = mondayOf(d); w <= last; w = addDays(w, 7)) rows.push(w);
  return rows;
}

type Meal = { entry: PlanEntry; recipe: Recipe } | undefined;

function MiniPlate({ meal, className }: { meal: Meal; className: string }) {
  if (!meal) return <span className={cn("block aspect-square", className)} aria-hidden />;
  if (!meal.entry.confirmed) return <span className={cn("block aspect-square scale-75 rounded-full border-[1.5px] border-dashed border-ochre/70", className)} aria-hidden />;
  return <Plate recipe={meal.recipe} className={className} />;
}

const mealLabel = (slot: string, meal: Meal) => (!meal ? undefined : `${slot} : ${meal.entry.confirmed ? meal.recipe.title : "à choisir"}`);

export function MonthView({ onPickDay }: { onPickDay: (weekStart: string, day: number) => void }) {
  const [selectedWeek] = useSelectedWeek();
  const s = useStore();
  const byId = recipeMap(s);
  const todayIso = toISODate(today());

  // Mois affiché : suit la semaine choisie, et se navigue librement avec ‹ ›.
  const [anchor, setAnchor] = useState(selectedWeek);
  const [month, setMonth] = useState(() => monthOfWeekStart(selectedWeek));
  if (anchor !== selectedWeek) {
    setAnchor(selectedWeek);
    setMonth(monthOfWeekStart(selectedWeek));
  }

  const monthDate = parseISODate(month);
  const rows = weeksOfMonth(month);
  const title = format(monthDate, "LLLL yyyy", { locale: fr });
  const isCurrentMonth = month === firstOfMonth(todayIso);

  const mealOf = (weekStart: string, day: number, slot: "lunch" | "dinner"): Meal => {
    const entry = s.weeks[weekStart]?.entries.find((e) => e.day === day && e.slot === slot);
    const recipe = entry && byId.get(entry.recipeId);
    return entry && recipe ? { entry, recipe } : undefined;
  };

  return (
    <section aria-label={`Repas de ${title}`}>
      <div className="mb-3 flex items-center gap-1">
        <h2 className="min-w-0 flex-1 truncate text-2xl font-semibold first-letter:uppercase md:text-3xl" aria-live="polite">
          {title}
        </h2>
        {!isCurrentMonth && (
          <button type="button" onClick={() => setMonth(firstOfMonth(todayIso))} className="h-12 shrink-0 rounded-full px-4 text-sm font-bold text-primary-ink hover:bg-primary-soft">
            Aujourd'hui
          </button>
        )}
        <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-paper-deep" aria-label="Mois précédent">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-paper-deep" aria-label="Mois suivant">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 lg:gap-2" aria-hidden>
        {INITIALS.map((d, i) => (
          <span key={i} title={DAYS[i]} className="pb-1 text-center text-xs font-bold text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      <ol className="grid gap-0.5 sm:gap-1.5 lg:gap-2">
        {rows.map((weekStart) => {
          const selected = weekStart === selectedWeek;
          return (
            <li key={weekStart} className={cn("grid grid-cols-7 gap-0.5 rounded-lg sm:gap-1.5 sm:rounded-2xl lg:gap-2", selected && "bg-primary-soft ring-4 ring-primary-soft")}>
              {Array.from({ length: 7 }, (_, day) => {
                const iso = addDays(weekStart, day);
                const date = parseISODate(iso);
                const inMonth = iso.slice(0, 7) === month.slice(0, 7);
                const isToday = iso === todayIso;
                const lunch = mealOf(weekStart, day, "lunch");
                const dinner = mealOf(weekStart, day, "dinner");
                const label = [isToday ? "Aujourd'hui" : undefined, format(date, "EEEE d MMMM", { locale: fr }), mealLabel("déjeuner", lunch), mealLabel("dîner", dinner), !lunch && !dinner ? "rien de prévu" : undefined]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onPickDay(weekStart, day)}
                    aria-label={label}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "group relative flex min-h-20 min-w-0 flex-col items-center rounded-md px-0.5 pt-1 pb-1 transition-[transform,background-color] active:scale-[0.96] sm:min-h-24 sm:rounded-2xl sm:px-1.5 sm:pt-1.5 lg:min-h-28",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none",
                      inMonth ? "bg-card shadow-card hover:bg-muted/60" : "bg-card/40 opacity-55 hover:opacity-80",
                      isToday && "ring-2 ring-terracotta ring-inset",
                    )}
                  >
                    <span
                      className={cn(
                        "self-center font-heading text-[0.8rem] leading-none font-semibold tabular-nums sm:self-start sm:pl-0.5 sm:text-sm lg:text-base",
                        isToday ? "text-terracotta-ink" : inMonth ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {(lunch || dinner) && (
                      <span className="mt-0.5 flex flex-1 flex-col items-center justify-center sm:mt-1 sm:w-full sm:flex-row sm:justify-center sm:gap-0.5 lg:gap-1">
                        <MiniPlate meal={lunch} className="h-[1.85rem] sm:h-10 lg:h-12 xl:h-14" />
                        <MiniPlate meal={dinner} className="h-[1.85rem] sm:h-10 lg:h-12 xl:h-14" />
                      </span>
                    )}
                  </button>
                );
              })}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
