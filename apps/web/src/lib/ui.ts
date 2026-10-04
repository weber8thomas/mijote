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

export function setSelectedWeek(week: string) {
  selectedWeek = week;
  listeners.forEach((l) => l());
}
