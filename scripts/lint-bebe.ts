// Linter bébé : valide chaque recette (schéma Zod + règles 11-12 mois). Bloque le seed et la CI en cas d'erreur.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { Ingredient, Recipe, lintRecipe } from "../packages/shared/src/index.ts";

const root = new URL("../content/", import.meta.url);
const read = (f: string) => JSON.parse(readFileSync(new URL(f, root), "utf8"));

const ingredients = z.array(Ingredient).parse(read("ingredients.json"));
const byId = new Map(ingredients.map((i) => [i.id, i]));

let errors = 0;
let warnings = 0;
const seen = new Set<string>();
const files = ["recipes/breakfast.json", "recipes/lunch.json", "recipes/dinner.json", "recipes/dessert.json", "ai-samples.json"];

for (const file of files) {
  const raw: unknown[] = read(file);
  raw.forEach((r, i) => {
    const parsed = Recipe.safeParse(r);
    const label = `${file}#${i} ${(r as { id?: string }).id ?? "?"}`;
    if (!parsed.success) {
      errors++;
      console.error(`✗ ${label} : schéma invalide\n${z.prettifyError(parsed.error)}`);
      return;
    }
    if (seen.has(parsed.data.id)) {
      errors++;
      console.error(`✗ ${label} : id en double`);
    }
    seen.add(parsed.data.id);
    for (const issue of lintRecipe(parsed.data, byId)) {
      if (issue.level === "error") errors++;
      else warnings++;
      console[issue.level === "error" ? "error" : "warn"](`${issue.level === "error" ? "✗" : "⚠"} ${label} : ${issue.message}`);
    }
  });
}

console.log(`\n${seen.size} recettes vérifiées · ${errors} erreur(s) · ${warnings} avertissement(s)`);
process.exit(errors ? 1 : 0);
