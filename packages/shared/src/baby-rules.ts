import { ILLUSTRATION_KEYS } from "./illustrations";
import type { Ingredient, IngredientTag, Recipe, RecipeTag } from "./schemas";

// Règles de diversification 11-12 mois (v1, fixes). Données + linter : le seed et toute recette IA doivent passer.

export const BABY_DISCLAIMER = "Règles générales de diversification. Demandez conseil à votre pédiatre en cas de doute ou d'allergie.";

/** Ingrédients interdits dans la portion bébé (autorisés seulement s'ils sont ajoutés après prélèvement : adultOnly). */
export const FORBIDDEN_TAGS: Partial<Record<IngredientTag, string>> = {
  honey: "Miel interdit avant 1 an (risque de botulisme)",
  "added-salt": "Pas de sel ajouté dans la portion bébé",
  "stock-cube": "Pas de bouillon cube dans la portion bébé",
  "added-sugar": "Pas de sucre ajouté dans la portion bébé",
  "raw-milk": "Lait cru et fromages au lait cru interdits",
  charcuterie: "Pas de charcuterie avant 3 ans",
  "predator-fish": "Poissons prédateurs (espadon, marlin, requin, lamproie) interdits",
  "strong-spice": "Pas d'épices fortes ni de piment",
  sprouted: "Pas de graines germées crues",
};

/** Étiquettes de recette refusées : œufs non totalement cuits, viande/poisson non cuits à cœur. */
export const FORBIDDEN_RECIPE_TAGS: Partial<Record<RecipeTag, string>> = {
  "raw-egg": "Œufs non totalement cuits (mousse, mayonnaise, tiramisu…) interdits",
  "rare-meat": "Viande, poisson ou volaille doivent être cuits à cœur",
};

/** Formes acceptées selon le risque. */
const NUT_FORMS = new Set(["powder", "puree"]);
const ROUND_FORMS = new Set(["quartered", "cooked", "puree"]);
const HARD_FORMS = new Set(["grated", "cooked", "puree"]);

export const IRON_SOURCES = ["viande rouge", "lentilles", "pois chiches", "jaune d'œuf cuit", "poisson", "quinoa", "légumes verts"];
export const VIT_C_SOURCES = ["agrumes", "kiwi", "poivron", "persil", "chou", "brocoli"];

export type LintIssue = { level: "error" | "warning"; recipeId: string; message: string };

/** Vérifie une recette contre les règles bébé. Les erreurs bloquent le seed et les propositions IA. */
export function lintRecipe(recipe: Recipe, ingredients: Map<string, Ingredient>): LintIssue[] {
  const issues: LintIssue[] = [];
  const err = (message: string) => issues.push({ level: "error", recipeId: recipe.id, message });
  const warn = (message: string) => issues.push({ level: "warning", recipeId: recipe.id, message });

  for (const tag of recipe.tags) {
    const why = FORBIDDEN_RECIPE_TAGS[tag];
    if (why) err(why);
  }

  let hasIronRich = false;
  let hasVitC = false;
  let cowMilkMl = 0;

  for (const ri of recipe.ingredients) {
    const ing = ingredients.get(ri.ingredientId);
    if (!ing) {
      err(`Ingrédient inconnu : ${ri.ingredientId}`);
      continue;
    }
    if (ing.ironRich && !ri.adultOnly) hasIronRich = true;
    if (ing.tags.includes("vit-c")) hasVitC = true;
    if (ing.tags.includes("cow-milk") && ri.unit === "ml") cowMilkMl += ri.qty;
    if (ri.adultOnly) continue;

    for (const tag of ing.tags) {
      const why = FORBIDDEN_TAGS[tag];
      if (why) err(`${ing.name} : ${why}`);
    }
    if (ing.tags.includes("nut") && !(ri.form && NUT_FORMS.has(ri.form)))
      err(`${ing.name} : fruits à coque seulement en poudre ou purée lisse (form: powder | puree)`);
    if (ing.tags.includes("choking-round") && !(ri.form && ROUND_FORMS.has(ri.form)))
      err(`${ing.name} : à couper en quatre ou cuire (risque d'étouffement)`);
    if (ing.tags.includes("choking-hard") && ri.form === "raw") err(`${ing.name} cru : à râper ou cuire (risque d'étouffement)`);
    if (ing.tags.includes("choking-hard") && !ri.form && recipe.cookMinutes === 0)
      err(`${ing.name} : préciser la forme (râpé ou cuit), la recette est sans cuisson`);
    if (ing.tags.includes("choking-hard") && ri.form && !HARD_FORMS.has(ri.form) && ri.form !== "raw")
      warn(`${ing.name} : forme « ${ri.form} » inhabituelle`);
  }

  const b = recipe.babyAdaptation;
  if (b.when.length < 8 || b.texture.length < 5) err("Adaptation bébé trop vague (moment et texture)");
  if (cowMilkMl >= 150 && !/lait infantile|lait de suite|lait 2e âge/i.test(`${b.when} ${b.texture} ${b.notes ?? ""}`))
    warn("Beaucoup de lait de vache : préciser que la portion bébé peut être faite au lait infantile");

  if (recipe.ironScore >= 2 && !hasIronRich) err(`ironScore ${recipe.ironScore} sans ingrédient riche en fer`);
  if (recipe.ironScore >= 2 && !hasVitC && recipe.slots.some((s) => s === "lunch" || s === "dinner"))
    warn("Plat riche en fer sans source de vitamine C : penser au persil, poivron, agrumes en dessert");

  const fishy = recipe.ingredients.some((ri) => ingredients.get(ri.ingredientId)?.category === "poisson");
  if ((recipe.mainProtein === "fish" || recipe.mainProtein === "oily-fish") && !fishy) err("mainProtein poisson sans poisson dans les ingrédients");
  if (recipe.longCook && recipe.cookMinutes < 60) warn("longCook avec moins d'une heure de cuisson");
  if (recipe.prepAhead && recipe.prepAheadSteps.length === 0) err("prepAhead sans étape de veille (prepAheadSteps)");
  if (recipe.slug !== recipe.id) err("slug et id doivent être identiques");
  if (!(ILLUSTRATION_KEYS as readonly string[]).includes(recipe.illustration)) err(`Illustration inconnue : ${recipe.illustration}`);

  return issues;
}
