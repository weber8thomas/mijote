import { addDays, parseISODate, type PlanEntry, type Recipe, type WeekPlan } from "@mijote/shared";

// Export iCalendar (RFC 5545) d'une semaine : un évènement par déjeuner et dîner.
// Les desserts ne sont pas exportés.
//
// Heures « flottantes » (sans TZID ni Z) : 12 h 30 reste 12 h 30 dans le fuseau de l'appareil qui
// importe le fichier. C'est le sens voulu pour un repas, et on évite un bloc VTIMEZONE à maintenir.

export type IcsOptions = {
  /** Horodatage DTSTAMP (défaut : maintenant). */
  now?: Date;
  /** N'exporter que les repas choisis par le foyer (défaut : tous). */
  onlyConfirmed?: boolean;
  /** Nom du calendrier affiché par certaines applis (X-WR-CALNAME). */
  calendarName?: string;
};

const CRLF = "\r\n";
const MEALS = {
  lunch: { label: "Déjeuner", start: "123000", end: "133000" },
  dinner: { label: "Dîner", start: "193000", end: "203000" },
} as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** AAAA-MM-JJ → AAAAMMJJ. */
const basicDate = (iso: string) => iso.replaceAll("-", "");

/** Date-heure UTC (DTSTAMP). */
const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Échappement d'une valeur TEXT (RFC 5545 § 3.3.11). */
export function escapeText(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/** Pliage des lignes à 75 octets (RFC 5545 § 3.1), sans couper un caractère UTF-8. */
export function foldLine(line: string) {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  // La première ligne fait 75 octets au plus ; les suivantes commencent par une espace, donc 74.
  let limit = 75;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

type Event = { uid: string; date: string; start: string; end: string; summary: string; description?: string };

function vevent(e: Event, stamp: string): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${basicDate(e.date)}T${e.start}`,
    `DTEND:${basicDate(e.date)}T${e.end}`,
    `SUMMARY:${escapeText(e.summary)}`,
  ];
  if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  // Un repas n'occupe pas l'agenda (disponible).
  lines.push("TRANSP:TRANSPARENT");
  lines.push("END:VEVENT");
  return lines;
}

function mealDescription(entry: PlanEntry, r: Recipe) {
  const b = r.babyAdaptation;
  return [
    entry.isLeftover ? "Reste du dîner de la veille." : undefined,
    `Pour bébé : ${b.when}`,
    `Texture : ${b.texture}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Calendrier iCalendar de la semaine (lignes CRLF, pliées à 75 octets). */
export function weekToIcs(week: WeekPlan, recipesById: Map<string, Recipe>, opts: IcsOptions = {}): string {
  const stamp = utcStamp(opts.now ?? new Date());
  const events: Event[] = [];
  const entries = week.entries
    .filter((e): e is PlanEntry & { slot: "lunch" | "dinner" } => e.slot === "lunch" || e.slot === "dinner")
    .filter((e) => !opts.onlyConfirmed || e.confirmed)
    .sort((a, b) => a.day - b.day || (a.slot === b.slot ? 0 : a.slot === "lunch" ? -1 : 1));

  for (const entry of entries) {
    const r = recipesById.get(entry.recipeId);
    if (!r) continue;
    const meal = MEALS[entry.slot];
    const date = addDays(week.weekStart, entry.day);
    events.push({
      uid: `${week.weekStart}-${entry.day}-${entry.slot}@mijote`,
      date,
      start: meal.start,
      end: meal.end,
      summary: `${meal.label} : ${r.title}`,
      description: mealDescription(entry, r),
    });
  }

  const first = parseISODate(week.weekStart);
  const name = opts.calendarName ?? `Mijoté · semaine du ${first.getDate()}/${pad(first.getMonth() + 1)}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mijoté//Repas de la semaine//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap((e) => vevent(e, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Nom de fichier conseillé : « mijote-semaine-2026-10-05.ics ». */
export const icsFilename = (weekStart: string) => `mijote-semaine-${weekStart}.ics`;

/**
 * Partage le fichier (feuille de partage du téléphone → Calendrier) quand le navigateur le permet,
 * sinon le télécharge. Renvoie ce qui s'est passé ; « cancelled » si l'utilisateur a fermé le partage.
 */
export async function downloadOrShareIcs(filename: string, ics: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const type = "text/calendar;charset=utf-8";
  const file = new File([ics], filename, { type });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Partage refusé (permission, geste expiré…) : on retombe sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(new Blob([ics], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
