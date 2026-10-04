import { z } from "zod";

// Contrats partagés front / back / contenu. Toute donnée qui entre dans Mijoté passe par ces schémas.

/** Créneaux planifiés : midi, soir et un dessert par jour (pas de petit-déjeuner). */
export const SLOTS = ["lunch", "dinner", "dessert"] as const;
export const Slot = z.enum(SLOTS);
export type Slot = z.infer<typeof Slot>;
/** Les repas qu'on choisit un à un. */
export const MEAL_SLOTS = ["lunch", "dinner"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const Channel = z.enum(["market", "supermarket"]);
export type Channel = z.infer<typeof Channel>;

/** Unité de prix d'un ingrédient (prix moyen indicatif par kg, par litre ou à la pièce). */
export const PriceUnit = z.enum(["kg", "L", "piece"]);
export type PriceUnit = z.infer<typeof PriceUnit>;

/** Unités utilisées dans les recettes. cs = cuillère à soupe, cc = cuillère à café. */
export const QtyUnit = z.enum(["g", "ml", "piece", "cs", "cc", "pincee"]);
export type QtyUnit = z.infer<typeof QtyUnit>;

export const IngredientCategory = z.enum([
  "legume",
  "fruit",
  "herbe",
  "viande",
  "volaille",
  "poisson",
  "oeuf",
  "laitier",
  "feculent",
  "legumineuse",
  "cereale",
  "oleagineux",
  "matiere-grasse",
  "epice",
  "sucrant",
  "epicerie",
]);
export type IngredientCategory = z.infer<typeof IngredientCategory>;

/**
 * Étiquettes d'ingrédient lues par les règles bébé et le planificateur.
 * honey, added-salt, stock-cube, added-sugar, raw-milk, charcuterie, predator-fish, strong-spice, sprouted : interdits bébé
 * nut : seulement en poudre ou purée lisse · choking-round : coupé en quatre ou cuit · choking-hard : râpé ou cuit
 * vit-c : source de vitamine C · iron-blocker : freine l'absorption du fer · cow-milk : lait de vache
 */
export const IngredientTag = z.enum([
  "honey",
  "added-salt",
  "stock-cube",
  "added-sugar",
  "raw-milk",
  "charcuterie",
  "predator-fish",
  "strong-spice",
  "sprouted",
  "nut",
  "choking-round",
  "choking-hard",
  "vit-c",
  "iron-blocker",
  "cow-milk",
]);
export type IngredientTag = z.infer<typeof IngredientTag>;

export const Ingredient = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  plural: z.string().optional(),
  category: IngredientCategory,
  aisle: z.string().min(1),
  channel: Channel,
  unit: PriceUnit,
  /** Prix moyen indicatif en € par unité de prix. */
  avgPrice: z.number().nonnegative(),
  /** Nom d'une pièce quand il diffère (« gousse d'ail »). */
  pieceName: z.string().optional(),
  pieceNamePlural: z.string().optional(),
  /** Poids moyen d'une pièce en grammes (conversions g ↔ pièce). */
  pieceWeight: z.number().positive().optional(),
  /** Mois de pleine saison (1-12), produits frais uniquement. */
  seasonMonths: z.array(z.number().int().min(1).max(12)).optional(),
  ironRich: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  pantryBasic: z.boolean().default(false),
  tags: z.array(IngredientTag).default([]),
  /** À vérifier : ingrédient créé par l'IA, prix et canal à confirmer. */
  toReview: z.boolean().optional(),
  // Préparation v2 (panier drive), non utilisés en v1.
  ean: z.string().optional(),
  driveSearchTerm: z.string().optional(),
});
export type Ingredient = z.infer<typeof Ingredient>;
export type IngredientInput = z.input<typeof Ingredient>;

/** Forme sous laquelle l'ingrédient est servi : utile aux règles anti-étouffement. */
export const IngredientForm = z.enum(["raw", "grated", "cooked", "puree", "powder", "quartered"]);
export type IngredientForm = z.infer<typeof IngredientForm>;

export const RecipeIngredient = z.object({
  ingredientId: z.string(),
  qty: z.number().positive(),
  unit: QtyUnit,
  note: z.string().optional(),
  form: IngredientForm.optional(),
  /** Uniquement pour la portion bébé (ex. lait infantile). */
  babyPortionOnly: z.boolean().optional(),
  /** Ajouté après avoir prélevé la portion bébé (ex. sel, piment). */
  adultOnly: z.boolean().optional(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredient>;

export const BabyAdaptation = z.object({
  /** Moment où prélever la portion bébé. */
  when: z.string().min(1),
  /** Texture adaptée. */
  texture: z.string().min(1),
  /** Quantité indicative. */
  amount: z.string().min(1),
  notes: z.string().optional(),
});
export type BabyAdaptation = z.infer<typeof BabyAdaptation>;

export const MainProtein = z.enum(["red-meat", "poultry", "fish", "oily-fish", "egg", "legume", "dairy", "veggie", "none"]);
export type MainProtein = z.infer<typeof MainProtein>;

export const RecipeStatus = z.enum(["active", "favorite", "excluded"]);
export type RecipeStatus = z.infer<typeof RecipeStatus>;

export const RecipeSource = z.enum(["seed", "ai", "manual"]);
export type RecipeSource = z.infer<typeof RecipeSource>;

/** Étiquettes de recette. raw-egg et rare-meat sont refusées par le linter bébé. */
export const RecipeTag = z.enum([
  "quick",
  "overnight",
  "batch",
  "oven",
  "one-pot",
  "soup",
  "gratin",
  "salad",
  "seasonal-fruit",
  "repeatable",
  "dairy-heavy",
  "raw-egg",
  "rare-meat",
  "finger-food",
  /** Se mange à la cuillère, dans un bol (soupe, dahl, curry, compote…) : décide de l'illustration bol ou assiette. */
  "bowl",
]);
export type RecipeTag = z.infer<typeof RecipeTag>;

export const Recipe = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  slots: z.array(Slot).min(1),
  prepMinutes: z.number().int().nonnegative(),
  cookMinutes: z.number().int().nonnegative(),
  longCook: z.boolean().default(false),
  prepAhead: z.boolean().default(false),
  prepAheadSteps: z.array(z.string()).default([]),
  yieldsLeftovers: z.boolean().default(false),
  /** Nombre de portions adultes pour les quantités indiquées. */
  servingsBase: z.number().int().positive(),
  ingredients: z.array(RecipeIngredient).min(1),
  steps: z.array(z.string().min(1)).min(1),
  babyAdaptation: BabyAdaptation,
  ironScore: z.number().int().min(0).max(3),
  mainProtein: MainProtein,
  tags: z.array(RecipeTag).default([]),
  /** Clé de l'illustration (produit vedette, style « Pastille »). */
  illustration: z.string().min(1),
  photoUrl: z.string().url().optional(),
  photoCreditName: z.string().optional(),
  photoCreditUrl: z.string().url().optional(),
  photoSource: z.enum(["unsplash", "pexels"]).optional(),
  source: RecipeSource.default("seed"),
  status: RecipeStatus.default("active"),
  createdAt: z.string().optional(),
});
export type Recipe = z.infer<typeof Recipe>;
export type RecipeInput = z.input<typeof Recipe>;

export const PriceThresholds = z.object({
  /** En dessous : €. */
  low: z.number().positive(),
  /** Au-dessus : €€€. */
  high: z.number().positive(),
});
export type PriceThresholds = z.infer<typeof PriceThresholds>;

export const Household = z.object({
  id: z.string(),
  name: z.string(),
  adults: z.number().int().min(1).max(10),
  babies: z.number().int().min(0).max(4),
  dessertSlot: z.enum(["lunch", "dinner"]),
  priceThresholds: PriceThresholds,
});
export type Household = z.infer<typeof Household>;

export const PlanEntry = z.object({
  id: z.string(),
  day: z.number().int().min(0).max(6),
  slot: Slot,
  recipeId: z.string(),
  servings: z.number().positive(),
  /** Les 6 choix proposés (le premier est la suggestion du planificateur) ; recipeId en fait partie. */
  choices: z.array(z.string()).max(6),
  /** Reste du dîner de la veille. */
  isLeftover: z.boolean().default(false),
  /** Choisi par le foyer (sinon : simple suggestion, qui peut encore s'ajuster). */
  confirmed: z.boolean().default(false),
  /** Nombre de fois où l'on a relancé les 6 idées (« Autres idées »). */
  rerolls: z.number().int().nonnegative().optional(),
});
export type PlanEntry = z.infer<typeof PlanEntry>;

export const WeekPlan = z.object({
  id: z.string(),
  /** Lundi de la semaine, AAAA-MM-JJ. */
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["draft", "validated"]),
  validatedAt: z.string().optional(),
  seed: z.number().int(),
  entries: z.array(PlanEntry),
});
export type WeekPlan = z.infer<typeof WeekPlan>;

export const ShoppingItem = z.object({
  id: z.string(),
  /** Ingrédient connu, ou « divers:<slug> » pour un article ajouté à la main hors catalogue. */
  ingredientId: z.string(),
  /** Libellé affiché pour un article hors catalogue (« papier toilette »). */
  label: z.string().optional(),
  /** Ajouté à la main (ou par la voix, un partage, Home Assistant) : gardé quand la liste est recalculée. */
  manual: z.boolean().optional(),
  /** Quantité dans l'unité de base (g, ml ou pièce). */
  qty: z.number().nonnegative(),
  unit: z.enum(["g", "ml", "piece"]),
  channel: Channel,
  aisle: z.string(),
  /** Coût estimé en €. */
  cost: z.number().nonnegative(),
  /** Recettes qui utilisent cet ingrédient. */
  recipeIds: z.array(z.string()),
  haveAlready: z.boolean().default(false),
  checked: z.boolean().default(false),
  checkedBy: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ShoppingItem = z.infer<typeof ShoppingItem>;

export const PantryItem = z.object({ ingredientId: z.string(), inStock: z.boolean() });
export type PantryItem = z.infer<typeof PantryItem>;

export const StorageLocation = z.enum(["placard", "frigo", "congelateur"]);
export type StorageLocation = z.infer<typeof StorageLocation>;

/** Fiche Open Food Facts résumée (scan d'un code-barres). */
export const ProductInfo = z.object({
  name: z.string(),
  brand: z.string().optional(),
  image: z.string().optional(),
  nutriscore: z.string().optional(),
  nova: z.number().optional(),
  additives: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  ingredientsText: z.string().optional(),
  quantity: z.string().optional(),
});
export type ProductInfo = z.infer<typeof ProductInfo>;

/** Ce qu'il y a à la maison : placard, frigo, congélateur. */
export const InventoryItem = z.object({
  id: z.string(),
  name: z.string(),
  /** Ingrédient du catalogue reconnu (sert aux courses et à « Avec ce que j'ai »). */
  ingredientId: z.string().optional(),
  location: StorageLocation,
  qty: z.number().positive().optional(),
  unit: z.enum(["g", "ml", "piece"]).optional(),
  barcode: z.string().optional(),
  product: ProductInfo.optional(),
  addedAt: z.string(),
});
export type InventoryItem = z.infer<typeof InventoryItem>;
