import { addDays, mondayOf, parseISODate } from "@mijote/shared";
import { useSyncExternalStore } from "react";
import { dayIndex, nextWeek, thisWeek, today } from "@/data/store";

// Petit état d'interface partagé entre les onglets (semaine affichée). Non persisté.

const listeners = new Set<() => void>();
// Le week-end, on prépare la semaine suivante.
let selectedWeek = dayIndex(today()) >= 5 ? nextWeek() : thisWeek();

export function useSelectedWeek() {
  const week = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => selectedWeek,
  );
  return [week, setSelectedWeek] as const;
}

export const getSelectedWeek = () => selectedWeek;

/** Sélectionne la semaine contenant ce jour (n'importe quelle date AAAA-MM-JJ, ramenée à son lundi). */
export function setSelectedWeek(week: string) {
  const monday = mondayOf(parseISODate(week));
  if (monday === selectedWeek) return;
  selectedWeek = monday;
  listeners.forEach((l) => l());
}

/** Avance (n > 0) ou recule (n < 0) de n semaines. */
export const shiftWeek = (n: number) => setSelectedWeek(addDays(selectedWeek, 7 * n));
