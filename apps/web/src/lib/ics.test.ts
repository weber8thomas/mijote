import type { PlanEntry, Recipe, WeekPlan } from "@mijote/shared";
import { describe, expect, it } from "vitest";
import { escapeText, foldLine, weekToIcs } from "./ics";

const recipe = (id: string, over: Partial<Recipe> = {}): Recipe =>
  ({
    id,
    title: `Recette ${id}`,
    slug: id,
    slots: ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 20,
    longCook: false,
    prepAhead: false,
    prepAheadSteps: [],
    yieldsLeftovers: false,
    servingsBase: 4,
    ingredients: [],
    steps: ["Cuire."],
    babyAdaptation: { when: "Avant le sel", texture: "Écrasé à la fourchette", amount: "100 g" },
    ironScore: 1,
    mainProtein: "veggie",
    tags: [],
    illustration: "courge",
    source: "seed",
    status: "active",
    ...over,
  }) as Recipe;

const entry = (day: number, slot: PlanEntry["slot"], recipeId: string, over: Partial<PlanEntry> = {}): PlanEntry => ({
  id: `${day}-${slot}`,
  day,
  slot,
  recipeId,
  servings: 3,
  choices: [recipeId],
  isLeftover: false,
  confirmed: true,
  ...over,
});

const recipes = new Map<string, Recipe>([
  ["soupe", recipe("soupe", { title: "Soupe de courge, lait de coco; cumin \\ curry" })],
  ["daube", recipe("daube", { title: "Daube provençale", prepAhead: true, prepAheadSteps: ["Faire mariner la viande au vin, au frais", "Éplucher les carottes"] })],
  ["compote", recipe("compote", { slots: ["dessert"], prepAhead: true, prepAheadSteps: ["Cuire les pommes"] })],
  ["long", recipe("long", { title: "Gratin dauphinois aux châtaignes, poireaux fondants et noisettes torréfiées de la ferme d'à côté" })],
]);

const week: WeekPlan = {
  id: "w",
  weekStart: "2026-10-05",
  status: "validated",
  seed: 1,
  entries: [
    entry(0, "lunch", "soupe"),
    entry(0, "dinner", "daube"),
    entry(0, "dessert", "compote"),
    entry(1, "lunch", "daube", { isLeftover: true }),
    entry(1, "dinner", "long"),
    entry(2, "lunch", "soupe", { confirmed: false }),
  ],
};

const NOW = new Date(Date.UTC(2026, 9, 4, 8, 15, 0));
const ics = weekToIcs(week, recipes, { now: NOW });
const unfolded = ics.replace(/\r\n /g, "");
const events = unfolded.split("BEGIN:VEVENT").slice(1);

describe("weekToIcs", () => {
  it("encadre un VCALENDAR valide", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("utilise CRLF partout", () => {
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("un évènement par déjeuner et dîner, plus la veille ; pas de dessert", () => {
    // 5 repas + 1 rappel de veille (la daube du lundi soir ; son reste du mardi midi n'en a pas).
    expect(events).toHaveLength(6);
    expect(unfolded).not.toContain("compote");
    expect(unfolded).not.toContain("Cuire les pommes");
    expect(new Set(events.map((e) => e.match(/UID:(.*)\r\n/)?.[1])).size).toBe(6);
    for (const e of events) expect(e).toContain("DTSTAMP:20261004T081500Z\r\n");
  });

  it("place les repas aux bonnes heures, en heure locale flottante", () => {
    expect(events[0]).toContain("DTSTART:20261005T123000\r\nDTEND:20261005T133000\r\n");
    expect(unfolded).toContain("SUMMARY:Dîner : Daube provençale\r\n");
    expect(unfolded).not.toContain("TZID");
  });

  it("décrit l'adaptation bébé et les restes", () => {
    const leftover = events.find((e) => e.includes("DTSTART:20261006T123000"))!;
    expect(leftover).toContain("DESCRIPTION:Reste du dîner de la veille.\\nPour bébé : Avant le sel\\nTexture : Écrasé à la fourchette");
  });

  it("échappe virgules, points-virgules, antislash et retours à la ligne", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(unfolded).toContain("SUMMARY:Déjeuner : Soupe de courge\\, lait de coco\\; cumin \\\\ curry\r\n");
  });

  it("plie les lignes à 75 octets sans couper un caractère", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).toMatch(/\r\n [^\r\n]/);
    const folded = foldLine(`SUMMARY:${"é".repeat(80)}`);
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"é".repeat(80)}`);
    expect(folded).not.toContain("�");
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(unfolded).toContain("noisettes torréfiées de la ferme d'à côté\r\n");
  });

  it("rappelle la veille à 20 h 30 avec une alarme", () => {
    const prep = events.filter((e) => e.includes("VALARM"));
    expect(prep).toHaveLength(1);
    expect(prep[0]).toContain("DTSTART:20261004T203000\r\nDTEND:20261004T204500\r\n");
    expect(prep[0]).toContain("SUMMARY:Ce soir\\, pour demain : Faire mariner la viande au vin\\, au frais\r\n");
    expect(prep[0]).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\n");
    expect(prep[0]).toContain("TRIGGER:-PT0M\r\nEND:VALARM\r\n");
    expect(prep[0]).toContain("• Éplucher les carottes");
  });

  it("peut se limiter aux repas choisis", () => {
    const only = weekToIcs(week, recipes, { now: NOW, onlyConfirmed: true });
    expect(only.split("BEGIN:VEVENT")).toHaveLength(6);
  });
});
