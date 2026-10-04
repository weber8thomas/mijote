import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  FORBIDDEN_RECIPE_TAGS,
  FORBIDDEN_TAGS,
  ILLUSTRATION_KEYS,
  Ingredient,
  IngredientCategory,
  IngredientForm,
  IngredientTag,
  lintRecipe,
  MainProtein,
  PriceUnit,
  QtyUnit,
  Recipe,
  RecipeTag,
  Slot,
  StorageLocation,
  type Ingredient as IngredientT,
  type Recipe as RecipeT,
} from "@mijote/shared";
import { z } from "zod";

// Appels à Claude depuis le navigateur, avec la clé API du foyer (gardée sur l'appareil).
// Chaque réponse est un JSON contraint par un schéma (sorties structurées), converti en Recipe,
// puis passé dans lintRecipe : 0 erreur exigée, sinon Claude corrige une fois.

export const AI_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Le plus juste (par défaut)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "Plus rapide, moins cher" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Le plus rapide" },
] as const;
export const DEFAULT_MODEL = AI_MODELS[0].id;

export type AiConfig = { apiKey: string; model: string };

export class AiError extends Error {
  readonly kind: "auth" | "rate" | "refusal" | "invalid" | "network" | "other";
  constructor(message: string, kind: AiError["kind"]) {
    super(message);
    this.kind = kind;
  }
}

// ——— Schémas de réponse (sans contraintes min/max, gérées par Zod côté client) ———

const DraftIngredient = z.object({
  ingredientId: z.string().describe("Identifiant du catalogue, ou l'id d'un ingrédient de newIngredients"),
  qty: z.number(),
  unit: QtyUnit,
  note: z.string().nullable(),
  form: IngredientForm.nullable(),
  adultOnly: z.boolean().describe("true si ajouté après avoir prélevé la portion bébé (sel, piment…)"),
});

const NewIngredient = z.object({
  id: z.string().describe("slug en minuscules, chiffres et tirets"),
  name: z.string(),
  category: IngredientCategory,
  aisle: z.string().describe("Rayon, par exemple Fruits et légumes, Épicerie, Frais"),
  channel: z.enum(["market", "supermarket"]),
  unit: PriceUnit,
  avgPrice: z.number().describe("Prix moyen en euros par unité de prix"),
  pieceWeight: z.number().nullable(),
  ironRich: z.boolean(),
  tags: z.array(IngredientTag),
});

const Draft = z.object({
  title: z.string(),
  description: z.string(),
  slots: z.array(Slot),
  prepMinutes: z.number().int(),
  cookMinutes: z.number().int(),
  longCook: z.boolean(),
  yieldsLeftovers: z.boolean(),
  servingsBase: z.number().int(),
  ingredients: z.array(DraftIngredient),
  newIngredients: z.array(NewIngredient),
  steps: z.array(z.string()),
  babyAdaptation: z.object({ when: z.string(), texture: z.string(), amount: z.string(), notes: z.string().nullable() }),
  ironScore: z.number().int().describe("0 à 3"),
  mainProtein: MainProtein,
  tags: z.array(RecipeTag),
  illustration: z.string().describe("Une clé de la liste des illustrations"),
});
type Draft = z.infer<typeof Draft>;

const Drafts = z.object({ recipes: z.array(Draft) });

const FridgeItems = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("Nom simple en français, au singulier"),
      ingredientId: z.string().nullable().describe("Identifiant du catalogue s'il correspond, sinon null"),
      location: StorageLocation,
      qty: z.number().nullable(),
      unit: z.enum(["g", "ml", "piece"]).nullable(),
    }),
  ),
});
export type FridgeItem = z.infer<typeof FridgeItems>["items"][number];

// ——— Contexte envoyé à Claude (stable, donc mis en cache) ———

function systemPrompt(ingredients: IngredientT[]) {
  const catalog = ingredients.map((i) => `${i.id} : ${i.name} (${i.category}${i.tags.length ? `, ${i.tags.join(" ")}` : ""})`).join("\n");
  return `Tu écris des recettes pour Mijoté, le planificateur de repas d'une famille française : deux adultes et un bébé de 11-12 mois qui mange la même chose, en texture adaptée.

Le foyer cuisine au quotidien : plats rapides de semaine (20-30 min), cuisine du monde douce (curry, dahl, wok, tacos, couscous), classiques familiaux français, desserts simples maison. Les dîners sont de vrais plats du soir. Produits de saison, budget raisonnable, souvent assez pour un reste le lendemain midi.

Règles bébé, obligatoires :
${Object.values(FORBIDDEN_TAGS).map((t) => `- ${t}`).join("\n")}
${Object.values(FORBIDDEN_RECIPE_TAGS).map((t) => `- ${t}`).join("\n")}
- Ce qui est interdit à bébé n'apparaît qu'avec adultOnly: true, ajouté après avoir prélevé sa portion (le dire dans babyAdaptation.when).
- Fruits à coque : seulement en poudre ou en purée lisse (form powder ou puree).
- Petits aliments ronds (raisin, tomate cerise, myrtille) : coupés en quatre ou cuits (form quartered, cooked ou puree).
- Aliments durs (carotte crue, pomme crue) : râpés ou cuits (form grated, cooked ou puree).
- Pense au fer (viande rouge, lentilles, pois chiches, œuf bien cuit, poisson, légumes verts) avec une source de vitamine C. ironScore : 0 aucun, 1 un peu, 2 bonne source, 3 très riche.

Format :
- Textes en français, phrases courtes, tutoiement. Étapes courtes et concrètes.
- slots parmi lunch, dinner, dessert. Un dessert n'a que dessert.
- Quantités pour servingsBase portions adultes. Unités : g, ml, piece, cs, cc, pincee.
- Utilise d'abord les ingrédients du catalogue (leur identifiant exact). Si un ingrédient manque, ajoute-le dans newIngredients avec un id nouveau et utilise cet id.
- illustration : le produit vedette, parmi : ${ILLUSTRATION_KEYS.join(", ")}.
- longCook : cuisson de plus d'1 h 30, réservée au week-end.
- tags : ajoute bowl quand le plat se mange à la cuillère, dans un bol (soupe, velouté, dahl, curry, chili, compote, yaourt, riz au lait…).

Catalogue des ingrédients (identifiant : nom (catégorie, étiquettes)) :
${catalog}`;
}

// ——— Appel ———

const client = (cfg: AiConfig) => new Anthropic({ apiKey: cfg.apiKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 1 });

/** Repli automatique côté serveur en cas de refus, sur les modèles qui le prennent en charge. */
const fallbackFor = (model: string) => (model === "claude-haiku-4-5" ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const });
/** Effort : moyen pour écrire des recettes (Haiku n'a pas de réglage d'effort). */
const effortFor = (model: string) => (model === "claude-haiku-4-5" ? {} : { effort: "medium" as const });

type UserContent = Anthropic.Beta.BetaContentBlockParam[];

function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new AiError("Clé API refusée. Vérifie-la dans les réglages.", "auth");
  if (e instanceof Anthropic.RateLimitError) return new AiError("Trop de demandes pour l'instant. Réessaie dans une minute.", "rate");
  if (e instanceof Anthropic.BadRequestError) return new AiError(`Demande refusée par l'API : ${e.message}`, "invalid");
  if (e instanceof Anthropic.APIConnectionError) return new AiError("Pas de connexion à l'API Anthropic.", "network");
  if (e instanceof Anthropic.APIError) return new AiError(`Erreur de l'API (${e.status}).`, "other");
  return new AiError(e instanceof Error ? e.message : String(e), "other");
}

/**
 * Un échange avec sortie structurée. Reprend les tours mis en pause par l'outil web (pause_turn).
 * Renvoie la sortie validée et l'historique (pour une éventuelle correction).
 */
async function ask<S extends z.ZodType>(
  cfg: AiConfig,
  schema: S,
  messages: Anthropic.Beta.BetaMessageParam[],
  system: string,
  opts: { webFetch?: boolean; maxTokens?: number } = {},
): Promise<{ output: z.infer<S>; messages: Anthropic.Beta.BetaMessageParam[] }> {
  const api = client(cfg);
  const history = [...messages];
  try {
    for (let turn = 0; turn < 4; turn++) {
      const res = await api.beta.messages.parse({
        model: cfg.model,
        max_tokens: opts.maxTokens ?? 16000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: history,
        output_config: { format: betaZodOutputFormat(schema), ...effortFor(cfg.model) },
        ...(opts.webFetch ? { tools: [{ type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 3 }] } : {}),
        ...fallbackFor(cfg.model),
      });
      history.push({ role: "assistant", content: res.content });
      if (res.stop_reason === "pause_turn") continue;
      if (res.stop_reason === "refusal") throw new AiError("Claude a refusé cette demande.", "refusal");
      if (res.stop_reason === "max_tokens") throw new AiError("Réponse trop longue, coupée. Demande moins de recettes.", "invalid");
      if (!res.parsed_output) throw new AiError("Réponse illisible.", "invalid");
      return { output: res.parsed_output as z.infer<S>, messages: history };
    }
    throw new AiError("La page a mis trop de temps à être lue.", "other");
  } catch (e) {
    throw toAiError(e);
  }
}

// ——— Brouillon → recette Mijoté ———

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export type AiRecipe = { recipe: RecipeT; newIngredients: IngredientT[]; warnings: string[] };
type Converted = AiRecipe | { errors: string[] };

export function convert(d: Draft, catalog: Map<string, IngredientT>, stamp: string): Converted {
  const errors: string[] = [];
  const newIngredients: IngredientT[] = [];
  for (const n of d.newIngredients) {
    if (catalog.has(n.id)) continue;
    const parsed = Ingredient.safeParse({ ...n, id: slugify(n.id) || slugify(n.name), pieceWeight: n.pieceWeight ?? undefined, toReview: true });
    if (parsed.success) newIngredients.push(parsed.data);
    else errors.push(`Ingrédient « ${n.name} » mal décrit.`);
  }
  const all = new Map([...catalog, ...newIngredients.map((i) => [i.id, i] as const)]);
  const missing = d.ingredients.filter((i) => !all.has(i.ingredientId)).map((i) => i.ingredientId);
  if (missing.length) errors.push(`Ingrédients inconnus (ni au catalogue, ni dans newIngredients) : ${missing.join(", ")}.`);
  const slug = slugify(d.title) || "recette";
  const parsed = Recipe.safeParse({
    ...d,
    // Le linter exige slug = id.
    id: `ia-${slug}-${stamp}`,
    slug: `ia-${slug}-${stamp}`,
    prepAhead: false,
    prepAheadSteps: [],
    ingredients: d.ingredients.map((i) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit, note: i.note || undefined, form: i.form ?? undefined, adultOnly: i.adultOnly || undefined })),
    babyAdaptation: { ...d.babyAdaptation, notes: d.babyAdaptation.notes || undefined },
    ironScore: Math.max(0, Math.min(3, d.ironScore)),
    illustration: (ILLUSTRATION_KEYS as readonly string[]).includes(d.illustration) ? d.illustration : "herbes",
    source: "ai",
    status: "active",
    createdAt: new Date().toISOString(),
  });
  if (!parsed.success) errors.push(...parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`));
  if (errors.length || !parsed.success) return { errors };
  const issues = lintRecipe(parsed.data, all);
  const blocking = issues.filter((i) => i.level === "error").map((i) => i.message);
  if (blocking.length) return { errors: blocking };
  return { recipe: parsed.data, newIngredients, warnings: issues.map((i) => i.message) };
}

/**
 * Demande des recettes, les convertit et les vérifie. Les recettes en erreur sont renvoyées une fois
 * à Claude avec la liste des problèmes ; celles qui échouent encore sont écartées.
 */
async function recipesFrom(cfg: AiConfig, content: UserContent, ingredients: IngredientT[], opts: { webFetch?: boolean } = {}): Promise<AiRecipe[]> {
  const catalog = new Map(ingredients.map((i) => [i.id, i]));
  const system = systemPrompt(ingredients);
  const stamp = Date.now().toString(36);
  const first = await ask(cfg, Drafts, [{ role: "user", content }], system, opts);
  const results = first.output.recipes.map((d, i) => convert(d, catalog, `${stamp}${i}`));
  const failed = results.flatMap((r, i) => ("errors" in r ? [{ i, title: first.output.recipes[i].title, errors: r.errors }] : []));
  let fixed: Converted[] = [];
  if (failed.length) {
    const report = failed.map((f) => `« ${f.title} » :\n${f.errors.map((e) => `- ${e}`).join("\n")}`).join("\n\n");
    const retry = await ask(
      cfg,
      Drafts,
      [...first.messages, { role: "user", content: `Ces recettes ne passent pas les règles. Corrige-les et renvoie seulement les versions corrigées, dans le même ordre.\n\n${report}` }],
      system,
    );
    fixed = retry.output.recipes.map((d, i) => convert(d, catalog, `${stamp}c${i}`));
  }
  return [...results, ...fixed].filter((r): r is AiRecipe => !("errors" in r));
}

// ——— Les quatre entrées ———

export type IdeasContext = { month: string; seasonal: string[]; favorites: string[]; excluded: string[]; slot?: "lunch" | "dinner" | "dessert"; count?: number };

/** Idées de saison selon les goûts du foyer. */
export function ideas(cfg: AiConfig, ingredients: IngredientT[], ctx: IdeasContext) {
  const what = ctx.slot === "dessert" ? "desserts" : ctx.slot === "dinner" ? "dîners" : ctx.slot === "lunch" ? "déjeuners" : "plats (déjeuner ou dîner) et un dessert";
  const text = `Propose ${ctx.count ?? 4} ${what} pour ${ctx.month}, variés et différents de ce que nous avons déjà.
Produits de saison : ${ctx.seasonal.join(", ")}.
Nos favoris : ${ctx.favorites.join(", ") || "aucun encore"}.
À éviter (écartées) : ${ctx.excluded.join(", ") || "rien"}.`;
  return recipesFrom(cfg, [{ type: "text", text }], ingredients);
}

/** Recettes avec ce qu'il y a au placard et au frigo. */
export function fromInventory(cfg: AiConfig, ingredients: IngredientT[], have: string[], month: string) {
  const text = `Nous avons à la maison : ${have.join(", ")}.
Propose 3 recettes pour ${month} qui utilisent surtout ces produits (le moins d'achats possible). Une peut être un dessert si ça s'y prête.`;
  return recipesFrom(cfg, [{ type: "text", text }], ingredients);
}

/** Importe une recette depuis une page web (lue par l'outil web_fetch, côté Anthropic). */
export function fromUrl(cfg: AiConfig, ingredients: IngredientT[], url: string) {
  const text = `Lis cette recette avec l'outil web_fetch : ${url}
Adapte-la en une recette Mijoté pour 4 portions adultes, avec la portion bébé. Garde l'esprit du plat ; remplace ce qui est interdit à bébé ou passe-le en adultOnly. Une seule recette.`;
  return recipesFrom(cfg, [{ type: "text", text }], ingredients, { webFetch: true });
}

/** Lit une recette en photo (livre, écran, fiche manuscrite). */
export async function fromPhoto(cfg: AiConfig, ingredients: IngredientT[], photo: File) {
  const image = await imageBlock(photo);
  return recipesFrom(cfg, [image, { type: "text", text: "Voici la photo d'une recette. Transcris-la en recette Mijoté, adaptée à bébé. Une seule recette." }], ingredients);
}

/** Reconnaît les produits d'une photo du frigo ou du placard. */
export async function readFridge(cfg: AiConfig, ingredients: IngredientT[], photo: File): Promise<FridgeItem[]> {
  const image = await imageBlock(photo);
  const catalog = ingredients.map((i) => `${i.id} : ${i.name}`).join("\n");
  const system = `Tu fais l'inventaire d'une cuisine française à partir d'une photo. Liste chaque produit alimentaire visible et identifiable, une fois, avec une quantité estimée si elle est claire. location : frigo, placard ou congelateur selon la photo. N'invente rien de caché.

Catalogue (identifiant : nom) :
${catalog}`;
  const { output } = await ask(cfg, FridgeItems, [{ role: "user", content: [image, { type: "text", text: "Qu'y a-t-il sur cette photo ?" }] }], system, { maxTokens: 8000 });
  return output.items.map((i) => ({ ...i, ingredientId: i.ingredientId && ingredients.some((x) => x.id === i.ingredientId) ? i.ingredientId : null }));
}

/** Vérifie la clé avec un tout petit appel. */
export async function testKey(cfg: AiConfig) {
  try {
    await client(cfg).models.retrieve(cfg.model);
  } catch (e) {
    throw toAiError(e);
  }
}

// ——— Images ———

/** Photo → JPEG ≤ 1568 px (taille utile maximale pour la vision), en base64. */
async function imageBlock(file: File): Promise<Anthropic.Beta.BetaImageBlockParam> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const data = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data } };
}
