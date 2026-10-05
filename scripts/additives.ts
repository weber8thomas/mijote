// Régénère content/additives.json depuis les taxonomies d'Open Food Facts (ODbL) :
// nom français, fonctions, et ce que l'EFSA et l'ANSES en disent. Usage : npm run additives
import { writeFileSync } from "node:fs";

type Tax = Record<string, Record<string, Record<string, string> | string[] | undefined>>;
const get = async (name: string) => (await (await fetch(`https://static.openfoodfacts.org/data/taxonomies/${name}.json`)).json()) as Tax;
const [additives, classes] = await Promise.all([get("additives"), get("additives_classes")]);

const en = (v: Tax[string], k: string) => (v[k] as Record<string, string> | undefined)?.en;
const list = (s?: string) => (s ? s.split(",").map((x) => x.trim()) : []);
const frName = (v: Tax[string], code: string) => {
  const names = v.name as Record<string, string>;
  const n = names.fr ?? names.en ?? code;
  return n.replace(/^E\d+[a-z]*\s*-\s*/i, "").replace(/^./, (c) => c.toUpperCase());
};

const out: Record<string, unknown> = {};
for (const [key, v] of Object.entries(additives)) {
  if (!en(v, "e_number")) continue;
  const code = key.replace(/^en:/, "").toUpperCase();
  const groups = list(en(v, "efsa_evaluation_exposure_95th_greater_than_adi"));
  const adi = Number(en(v, "efsa_evaluation_adi"));
  out[code] = {
    name: frName(v, code),
    classes: list(en(v, "additives_classes")).map((c) => (classes[c]?.name as Record<string, string> | undefined)?.fr ?? c.replace(/^en:/, "")),
    ...(en(v, "efsa_evaluation_overexposure_risk") ? { efsa: en(v, "efsa_evaluation_overexposure_risk")!.replace(/^en:/, "") } : {}),
    ...(Number.isFinite(adi) && adi > 0 ? { adi } : {}),
    ...(groups.some((g) => g === "en:infants" || g === "en:toddlers") ? { babies: true } : {}),
    ...(en(v, "anses_additives_of_interest") === "yes" ? { anses: true } : {}),
    ...(en(v, "sweetener") === "yes" ? { sweetener: true } : {}),
    ...((v.parents as string[] | undefined)?.length ? { parent: String((v.parents as string[])[0]).replace(/^en:/, "").toUpperCase() } : {}),
  };
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
writeFileSync(new URL("../content/additives.json", import.meta.url), `${JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"')}\n`);
console.log(`${Object.keys(sorted).length} additifs`);
