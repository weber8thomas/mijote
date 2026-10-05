import table from "../../../content/additives.json";

// Additifs classés par nocivité, façon Yuka, mais sur des sources publiques :
// l'avis de l'EFSA (risque de dépasser la dose journalière admissible), la liste de l'ANSES,
// et les mesures réglementaires européennes (interdiction, mention obligatoire). Données : Open Food Facts (ODbL).

export type AdditiveRisk = "high" | "moderate" | "limited" | "none" | "unknown";
export type AdditiveInfo = { code: string; name?: string; classes: string[]; risk: AdditiveRisk; reasons: string[] };

type Entry = { name: string; classes: string[]; efsa?: "high" | "moderate" | "no"; adi?: number; babies?: boolean; anses?: boolean; sweetener?: boolean; parent?: string };
const TABLE = table as Record<string, Entry>;

export const RISK_ORDER: AdditiveRisk[] = ["high", "moderate", "limited", "none", "unknown"];
export const RISK_LABELS: Record<AdditiveRisk, string> = {
  high: "Risque élevé",
  moderate: "Risque modéré",
  limited: "Risque limité",
  none: "Sans risque connu",
  unknown: "Non évalué",
};

const SOUTHAMPTON = "Mention obligatoire en Europe : peut avoir des effets indésirables sur l'activité et l'attention des enfants.";
const NITRITES = "Nitrites et nitrates : l'ANSES recommande d'en réduire l'exposition (2022).";
/** Mesures réglementaires que les données de l'EFSA ne reflètent pas. */
const REGULATORY: Record<string, { risk: AdditiveRisk; reason: string }> = {
  E171: { risk: "high", reason: "Interdit dans l'Union européenne depuis 2022 (doute sur la génotoxicité)." },
  E102: { risk: "high", reason: SOUTHAMPTON },
  E104: { risk: "high", reason: SOUTHAMPTON },
  E110: { risk: "high", reason: SOUTHAMPTON },
  E122: { risk: "high", reason: SOUTHAMPTON },
  E124: { risk: "high", reason: SOUTHAMPTON },
  E129: { risk: "high", reason: SOUTHAMPTON },
  E249: { risk: "high", reason: NITRITES },
  E250: { risk: "high", reason: NITRITES },
  E251: { risk: "high", reason: NITRITES },
  E252: { risk: "high", reason: NITRITES },
};

const worse = (a: AdditiveRisk, b: AdditiveRisk) => (RISK_ORDER.indexOf(a) <= RISK_ORDER.indexOf(b) ? a : b);
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** « E322i », « e322 », « E150d » → la fiche de l'additif (ou de sa famille), son niveau et pourquoi. */
export function additiveInfo(label: string): AdditiveInfo {
  const code = label.trim().toUpperCase().split(/[^A-Z0-9]/)[0];
  const family = code.replace(/^(E\d+)[A-Z]*$/, "$1");
  const own = TABLE[code];
  const parent = TABLE[own?.parent ?? ""] ?? (family !== code ? TABLE[family] : undefined);
  const entries = [own, parent].filter((e): e is Entry => !!e);
  const display = code.replace(/^(E\d+)([A-Z]+)$/, (_, n: string, s: string) => n + s.toLowerCase());
  if (!entries.length) return { code: display, classes: [], risk: "unknown", reasons: ["Pas d'information sur cet additif."] };

  let risk: AdditiveRisk = "none";
  const reasons: string[] = [];
  const add = (r: AdditiveRisk, why: string) => {
    risk = worse(risk, r);
    if (!reasons.includes(why)) reasons.push(why);
  };
  const regulatory = REGULATORY[code] ?? REGULATORY[family];
  if (regulatory) add(regulatory.risk, regulatory.reason);
  for (const e of entries) {
    if (e.efsa === "high" || e.efsa === "moderate")
      add(e.efsa, e.babies ? "Selon l'EFSA, les tout-petits peuvent dépasser la dose journalière admissible." : "Selon l'EFSA, certains peuvent dépasser la dose journalière admissible.");
    if (e.sweetener) add("moderate", "Édulcorant : interdit dans les aliments pour bébés.");
    if (e.anses) add("limited", "Suivi de près par l'ANSES.");
    if (e.adi) add("limited", `Dose journalière admissible : ${fr(e.adi)} mg par kg de poids.`);
  }
  if (!reasons.length) reasons.push("Aucun risque identifié par l'EFSA ni l'ANSES.");
  const main = own ?? parent!;
  return { code: display, name: main.name, classes: main.classes, risk, reasons };
}

/** Les additifs d'un produit, du plus au moins préoccupant (puis par numéro). */
export function sortAdditives(labels: string[]): AdditiveInfo[] {
  const seen = new Set<string>();
  return labels
    .map(additiveInfo)
    .filter((a) => (seen.has(a.code) ? false : (seen.add(a.code), true)))
    .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || a.code.localeCompare(b.code, "en", { numeric: true }));
}

/** Le niveau le plus préoccupant d'une liste (pour la pastille de la fiche). */
export const worstRisk = (labels: string[]): AdditiveRisk | undefined => sortAdditives(labels)[0]?.risk;
