import { addDays, mondayOf, parseISODate, type WeekPlan } from "@mijote/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, LocateFixed } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange, DayButtonProps } from "react-day-picker";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { thisWeek, useStore } from "@/data/store";
import { setSelectedWeek, shiftWeek, useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Choix de la semaine : précédente / suivante, et calendrier du mois dans une feuille.

/** « 5 – 11 oct. », « 28 sept. – 4 oct. » ; l'année s'ajoute si la semaine n'est pas dans l'année en cours. */
export function weekShortRange(weekStart: string) {
  const a = parseISODate(weekStart);
  const b = parseISODate(addDays(weekStart, 6));
  const year = b.getFullYear() !== new Date().getFullYear() ? ` ${b.getFullYear()}` : "";
  const end = format(b, "d MMM", { locale: fr }) + year;
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${end}` : `${format(a, "d MMM", { locale: fr })} – ${end}`;
}

/** Écart en semaines avec la semaine en cours (0 = cette semaine). */
export const weeksFromNow = (weekStart: string) => Math.round((parseISODate(weekStart).getTime() - parseISODate(thisWeek()).getTime()) / (7 * 864e5));

/** « cette semaine », « semaine prochaine », « dans 3 semaines », « il y a 2 semaines »… */
export function relativeWeekLabel(weekStart: string) {
  const n = weeksFromNow(weekStart);
  if (n === 0) return "cette semaine";
  if (n === 1) return "semaine prochaine";
  if (n === -1) return "semaine dernière";
  return n > 0 ? `dans ${n} semaines` : `il y a ${-n} semaines`;
}

const weekRangeOf = (weekStart: string): DateRange => ({ from: parseISODate(weekStart), to: parseISODate(addDays(weekStart, 6)) });

/** Jours couverts par les semaines planifiées, selon leur statut (pour les pastilles du calendrier). */
function plannedRanges(weeks: Record<string, WeekPlan>) {
  const validated: DateRange[] = [];
  const draft: DateRange[] = [];
  for (const w of Object.values(weeks)) (w.status === "validated" ? validated : draft).push(weekRangeOf(w.weekStart));
  return { validated, draft };
}

function DayWithDot({ children, modifiers, ...props }: DayButtonProps) {
  const tone = modifiers.validated ? "bg-sage" : modifiers.draft ? "bg-ochre" : undefined;
  return (
    <CalendarDayButton modifiers={modifiers} {...props}>
      {children}
      {tone && <i aria-hidden className={cn("absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full", tone, modifiers.outside && "opacity-50")} />}
    </CalendarDayButton>
  );
}

const ICON_BTN = "grid size-12 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95";

/** Navigation de semaine : ‹ semaine précédente · libellé · semaine suivante › · calendrier. */
export function WeekPicker({ className }: { className?: string }) {
  const [week] = useSelectedWeek();
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("flex h-14 w-full items-center gap-0.5 rounded-full bg-paper-deep p-1 sm:w-auto", className)}>
      <button type="button" className={ICON_BTN} onClick={() => shiftWeek(-1)} aria-label="Semaine précédente">
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1 px-1 text-center leading-tight sm:min-w-36" aria-live="polite" aria-atomic>
        <p className="truncate font-heading text-[1.05rem] font-semibold tabular-nums">{weekShortRange(week)}</p>
        <p className={cn("truncate text-xs font-semibold", weeksFromNow(week) === 0 ? "text-primary-ink" : "text-muted-foreground")}>{relativeWeekLabel(week)}</p>
      </div>
      <button type="button" className={ICON_BTN} onClick={() => shiftWeek(1)} aria-label="Semaine suivante">
        <ChevronRight className="size-5" aria-hidden />
      </button>
      <button type="button" className={cn(ICON_BTN, "bg-card shadow-card")} onClick={() => setOpen(true)} aria-label="Choisir une semaine dans le calendrier" aria-haspopup="dialog">
        <CalendarDays className="size-5" aria-hidden />
      </button>
      <WeekCalendarSheet open={open} onOpenChange={setOpen} />
    </div>
  );
}

/** Feuille « Choisir une semaine » : touche un jour, sa semaine s'affiche. */
export function WeekCalendarSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [week] = useSelectedWeek();
  const s = useStore();
  const { validated, draft } = useMemo(() => plannedRanges(s.weeks), [s.weeks]);
  // Mois affiché : celui du jeudi de la semaine choisie, remis à jour à chaque ouverture.
  const [month, setMonth] = useState(() => parseISODate(addDays(week, 3)));
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMonth(parseISODate(addDays(week, 3)));
  }

  const pick = (date: Date) => {
    setSelectedWeek(mondayOf(date));
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Choisir une semaine"
      description="Touche un jour pour afficher sa semaine."
      className="md:w-[min(28rem,calc(100vw-3rem))]"
      footer={
        <Button size="lg" variant="outline" className="h-12 w-full" onClick={() => pick(new Date())}>
          <LocateFixed aria-hidden /> Aujourd'hui
        </Button>
      }
    >
      <Calendar
        mode="range"
        selected={weekRangeOf(week)}
        onSelect={(_, day) => pick(day)}
        month={month}
        onMonthChange={setMonth}
        fixedWeeks
        modifiers={{ validated, draft }}
        labels={{
          labelDayButton: (date, m) =>
            [m.today ? "Aujourd'hui" : undefined, format(date, "EEEE d MMMM yyyy", { locale: fr }), m.validated ? "semaine validée" : m.draft ? "semaine en préparation" : undefined, m.selected ? "semaine affichée" : undefined]
              .filter(Boolean)
              .join(", "),
        }}
        classNames={{
          range_start: "rounded-l-(--cell-radius) bg-primary-soft",
          range_middle: "rounded-none bg-primary-soft",
          range_end: "rounded-r-(--cell-radius) bg-primary-soft",
        }}
        components={{ DayButton: DayWithDot }}
        className="[&_[data-range-end=true]]:bg-transparent [&_[data-range-end=true]]:text-primary-ink [&_[data-range-start=true]]:bg-transparent [&_[data-range-start=true]]:text-primary-ink [&_[data-range-middle=true]]:text-primary-ink"
      />
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-semibold text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <i aria-hidden className="size-2 rounded-full bg-sage" /> Validée
        </li>
        <li className="flex items-center gap-1.5">
          <i aria-hidden className="size-2 rounded-full bg-ochre" /> En préparation
        </li>
        <li className="flex items-center gap-1.5">
          <i aria-hidden className="h-3 w-5 rounded-full bg-primary-soft" /> Semaine affichée
        </li>
      </ul>
    </Sheet>
  );
}
