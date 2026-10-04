// Dates de semaine, au format AAAA-MM-JJ, en heure locale.

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Lundi de la semaine contenant cette date. */
export function mondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISODate(d);
}

/** Jour de la semaine 0 (lundi) → 6 (dimanche). */
export const dayIndex = (date: Date) => (date.getDay() + 6) % 7;

/** Mois (1-12) retenu pour la saison d'une semaine : celui de son jeudi. */
export const monthOfWeek = (weekStart: string) => parseISODate(addDays(weekStart, 3)).getMonth() + 1;
