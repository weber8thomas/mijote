import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { nameWords, RECIPES } from "@mijote/shared";

// Configuration Home Assistant pour l'écran de cuisine (Nest Hub), générée depuis les recettes du seed.
//   npx tsx apps/cast/ha-config.ts --url https://mijote.mondomaine.fr [--scripts boeuf-carottes-mijote,tortilla-pommes-de-terre-epinards] [--out apps/cast/ha]
// --scripts : les recettes qui auront leur propre script, à exposer à Google (« Ok Google, active Bœuf carottes »). Aucune par défaut :
// 120 scripts encombreraient Google Home. Assist, lui, connaît toutes les recettes (liste de noms).
// Écrit deux fichiers à copier dans la config de HA (voir apps/cast/README.md) :
//   packages/mijote_cast.yaml          rest_command + scripts (exposables à Google : « active Bœuf carottes ») + intents
//   custom_sentences/fr/mijote.yaml    phrases d'Assist : « affiche la recette bœuf carottes »
// Le jeton CAST_TOKEN reste dans secrets.yaml (mijote_cast_bearer: "Bearer <jeton>"), jamais dans ces fichiers.

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const url = arg("url")?.replace(/\/+$/, "");
if (!url?.startsWith("http")) {
  console.error("Usage : npx tsx apps/cast/ha-config.ts --url https://mijote.mondomaine.fr [--scripts id,id] [--out dossier]");
  process.exit(1);
}
const wanted = arg("scripts")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
const out = arg("out") ?? "apps/cast/ha";
const recipes = RECIPES.filter((r) => r.status !== "excluded");
const missing = wanted.filter((id) => !recipes.some((r) => r.id === id));
if (missing.length) {
  console.error(`Recettes inconnues : ${missing.join(", ")}`);
  process.exit(1);
}
const withScript = recipes.filter((r) => wanted.includes(r.id));

const q = (s: string) => JSON.stringify(s); // chaîne YAML entre guillemets
const slug = (id: string) => id.replace(/-/g, "_");

const hook = (name: string, payload: string) => `  ${name}:
    url: ${q(`${url}/api/cast-hook/${name === "mijote_cast_stop" ? "stop" : "show"}`)}
    method: post
    timeout: 60
    headers:
      authorization: !secret mijote_cast_bearer
      content-type: application/json
    payload: ${q(payload)}
`;

const script = (id: string, alias: string, action: string, data = "") => `  ${id}:
    alias: ${q(alias)}
    icon: mdi:chef-hat
    mode: single
    sequence:
      - action: rest_command.${action}${data}
`;

const intent = (name: string, action: string, data: string, speech: string) => `  ${name}:
    action:
      - action: rest_command.${action}${data}
    speech:
      text: ${q(speech)}
`;

const pkg = `# Écran de cuisine Mijoté (Nest Hub) : généré par apps/cast/ha-config.ts, ne pas modifier à la main.
# Jeton : secrets.yaml → mijote_cast_bearer: "Bearer <CAST_TOKEN du serveur>"

rest_command:
${hook("mijote_cast_recipe", '{"recipeId": "{{ recipe_id }}"}')}${hook("mijote_cast_name", '{"q": "{{ name }}"}')}${hook("mijote_cast_meal", '{"meal": "{{ meal }}"}')}${hook("mijote_cast_resume", "{}")}${hook("mijote_cast_stop", "{}")}
script:
${script("mijote_recette_du_soir", "Recette du soir", "mijote_cast_meal", '\n        data:\n          meal: dinner')}${script("mijote_recette_du_midi", "Recette du midi", "mijote_cast_meal", '\n        data:\n          meal: lunch')}${script("mijote_reprendre_la_recette", "Reprendre la recette", "mijote_cast_resume")}${script("mijote_fermer_la_recette", "Fermer la recette", "mijote_cast_stop")}${withScript.map((r) => script(`mijote_${slug(r.id)}`, r.title, "mijote_cast_recipe", `\n        data:\n          recipe_id: ${q(r.id)}`)).join("")}
intent_script:
${intent("MijoteRecette", "mijote_cast_recipe", "\n        data:\n          recipe_id: \"{{ recette }}\"", "C'est parti.")}${intent("MijoteRepas", "mijote_cast_meal", "\n        data:\n          meal: \"{{ repas }}\"", "Je l'affiche.")}${intent("MijoteReprise", "mijote_cast_resume", "", "Je la remets.")}${intent("MijoteFerme", "mijote_cast_stop", "", "C'est fermé.")}`;

// Un nom peut se dire avec ou sans les petits mots : « bœuf carottes », « bœuf aux carottes ».
const spoken = (title: string) => [...new Set([title.toLowerCase(), nameWords(title).join(" ")])];

const sentences = `# Phrases d'Assist pour l'écran de cuisine Mijoté : généré par apps/cast/ha-config.ts.
language: "fr"
intents:
  MijoteRecette:
    data:
      - sentences:
          - "(affiche|montre|lance|ouvre|mets) [moi] [la] recette [de|du|des|d'] {recette}"
          - "(affiche|montre|lance|ouvre|mets) [moi] {recette} (en cuisine|sur l'écran)"
  MijoteRepas:
    data:
      - sentences:
          - "(affiche|montre|lance|ouvre|mets) [moi] [la] recette (du|de ce) {repas}"
  MijoteReprise:
    data:
      - sentences:
          - "(reprends|remets|rouvre) la recette"
  MijoteFerme:
    data:
      - sentences:
          - "(ferme|arrête|enlève) la recette"
lists:
  repas:
    values:
      - in: "[du] soir"
        out: "dinner"
      - in: "[du] midi"
        out: "lunch"
  recette:
    values:
${recipes.flatMap((r) => spoken(r.title).map((s) => `      - in: ${q(s)}\n        out: ${q(r.id)}`)).join("\n")}
`;

mkdirSync(join(out, "packages"), { recursive: true });
mkdirSync(join(out, "custom_sentences", "fr"), { recursive: true });
writeFileSync(join(out, "packages", "mijote_cast.yaml"), pkg);
writeFileSync(join(out, "custom_sentences", "fr", "mijote.yaml"), sentences);
console.log(`${recipes.length} recettes pour Assist, ${withScript.length} scripts de recette → ${join(out, "packages/mijote_cast.yaml")} et ${join(out, "custom_sentences/fr/mijote.yaml")}`);
