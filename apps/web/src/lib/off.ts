import type { Nutrients, ProductInfo, ProductPhoto } from "@mijote/shared";

// Open Food Facts : fiche d'un produit à partir de son code-barres (API v2, publique, sans clé).
// Hors ligne ou produit inconnu : on ne plante jamais, l'interface propose la saisie à la main.

const FIELDS = [
  "product_name",
  "product_name_fr",
  "brands",
  "image_front_small_url",
  "nutriscore_grade",
  "nova_group",
  "additives_tags",
  "allergens_tags",
  "ingredients_text_fr",
  "ingredients_text",
  "quantity",
  "nutriments",
  "nutrition_data_per",
  "serving_size",
  "nutrient_levels",
  "image_front_url",
  "image_ingredients_url",
  "image_nutrition_url",
  "last_modified_t",
].join(",");

export const offUrl = (code: string) => `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
/** Fiche publique du produit (pour « Voir sur Open Food Facts »). */
export const offPage = (code: string) => `https://fr.openfoodfacts.org/produit/${encodeURIComponent(code)}`;

type OffProduct = {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  image_front_small_url?: string;
  nutriscore_grade?: string;
  nova_group?: number | string;
  additives_tags?: string[];
  allergens_tags?: string[];
  ingredients_text_fr?: string;
  ingredients_text?: string;
  quantity?: string;
  nutriments?: Record<string, number | string | undefined>;
  nutrition_data_per?: string;
  serving_size?: string;
  nutrient_levels?: Record<string, string>;
  image_front_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;
  last_modified_t?: number;
};

export type Lookup = { status: "found"; product: ProductInfo } | { status: "not-found" } | { status: "offline" };

/** Un code-barres plausible : EAN-8, UPC-A, EAN-13, GTIN-14. */
export const isBarcode = (code: string) => /^\d{8,14}$/.test(code.trim());

const ALLERGENS: Record<string, string> = {
  milk: "lait",
  gluten: "gluten",
  eggs: "œufs",
  nuts: "fruits à coque",
  peanuts: "arachides",
  soybeans: "soja",
  fish: "poisson",
  crustaceans: "crustacés",
  molluscs: "mollusques",
  celery: "céleri",
  mustard: "moutarde",
  "sesame-seeds": "sésame",
  "sulphur-dioxide-and-sulphites": "sulfites",
  lupin: "lupin",
};

/** « en:e330 » → « E330 », « en:milk » → « lait », « fr:noisette » → « noisette ». */
const stripLang = (tag: string) => tag.replace(/^[a-z]{2}:/, "");
const additiveLabel = (tag: string) => stripLang(tag).toUpperCase();
const allergenLabel = (tag: string) => ALLERGENS[stripLang(tag)] ?? stripLang(tag).replace(/-/g, " ");

const clean = (t: string | undefined) => t?.replace(/\s+/g, " ").trim() || undefined;

// Nutriments Open Food Facts → nos clés (grammes ; énergie en kcal et kJ).
const NUTRIENTS: [keyof Nutrients, string][] = [
  ["fat", "fat"],
  ["saturatedFat", "saturated-fat"],
  ["carbs", "carbohydrates"],
  ["sugars", "sugars"],
  ["fiber", "fiber"],
  ["proteins", "proteins"],
  ["salt", "salt"],
];

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Nutriments « _100g » ou « _serving » ; kcal recalculées depuis les kJ si elles manquent. */
function nutrientsOf(n: OffProduct["nutriments"], suffix: "100g" | "serving"): Nutrients | undefined {
  if (!n) return undefined;
  const out: Nutrients = {};
  for (const [key, off] of NUTRIENTS) {
    const v = num(n[`${off}_${suffix}`]);
    if (v !== undefined) out[key] = v;
  }
  const kj = num(n[`energy-kj_${suffix}`]) ?? (n["energy_unit"] === "kJ" ? num(n[`energy_${suffix}`]) : undefined);
  const kcal = num(n[`energy-kcal_${suffix}`]) ?? (kj !== undefined ? Math.round(kj / 4.184) : undefined);
  if (kcal !== undefined) out.energyKcal = kcal;
  if (kj !== undefined) out.energyKj = kj;
  return Object.keys(out).length ? out : undefined;
}

/** Photo Open Food Facts : la version affichée (400 px) et la pleine résolution (« .full. »). */
const photoOf = (url: string | undefined): ProductPhoto | undefined => (url ? { display: url, full: url.replace(/\.(\d+|small|thumb)\.(jpe?g|png|webp)$/i, ".full.$2") } : undefined);

const LEVEL = { low: "low", moderate: "moderate", high: "high" } as const;
const levelOf = (v: string | undefined) => (v && v in LEVEL ? LEVEL[v as keyof typeof LEVEL] : undefined);

export function toProductInfo(p: OffProduct): ProductInfo {
  const grade = p.nutriscore_grade?.toLowerCase();
  const nova = Number(p.nova_group);
  const per100 = nutrientsOf(p.nutriments, "100g");
  const perServing = nutrientsOf(p.nutriments, "serving");
  const lv = p.nutrient_levels ?? {};
  const levels = { fat: levelOf(lv.fat), saturatedFat: levelOf(lv["saturated-fat"]), sugars: levelOf(lv.sugars), salt: levelOf(lv.salt) };
  const images = { front: photoOf(p.image_front_url), ingredients: photoOf(p.image_ingredients_url), nutrition: photoOf(p.image_nutrition_url) };
  return {
    name: clean(p.product_name_fr) ?? clean(p.product_name) ?? "Produit sans nom",
    brand: clean(p.brands?.split(",")[0]),
    image: p.image_front_small_url || p.image_front_url || undefined,
    nutriscore: grade && /^[a-e]$/.test(grade) ? grade : undefined,
    nova: nova >= 1 && nova <= 4 ? nova : undefined,
    additives: [...new Set((p.additives_tags ?? []).map(additiveLabel))],
    allergens: [...new Set((p.allergens_tags ?? []).map(allergenLabel))],
    ingredientsText: clean(p.ingredients_text_fr) ?? clean(p.ingredients_text),
    quantity: clean(p.quantity),
    nutrition: per100 && { ...per100, per: /ml/i.test(p.nutrition_data_per ?? "") ? "100ml" : "100g" },
    serving: perServing && clean(p.serving_size) ? { ...perServing, size: clean(p.serving_size)! } : undefined,
    levels: Object.values(levels).some(Boolean) ? levels : undefined,
    images: Object.values(images).some(Boolean) ? images : undefined,
    updatedAt: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString().slice(0, 10) : undefined,
  };
}

const cache = new Map<string, Lookup>();

/** Cherche un produit ; distingue « inconnu » de « pas de réseau ». */
export async function lookupProduct(barcode: string, { timeout = 8000 }: { timeout?: number } = {}): Promise<Lookup> {
  const code = barcode.trim();
  if (!isBarcode(code)) return { status: "not-found" };
  const hit = cache.get(code);
  if (hit) return hit;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { status: "offline" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(offUrl(code), { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (res.status === 404) return remember(code, { status: "not-found" });
    if (!res.ok) return { status: "offline" };
    const data = (await res.json()) as { status?: number; product?: OffProduct };
    if (!data.product || data.status === 0) return remember(code, { status: "not-found" });
    return remember(code, { status: "found", product: toProductInfo(data.product) });
  } catch {
    return { status: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

const remember = (code: string, r: Lookup) => (cache.set(code, r), r);

/** La fiche du produit, ou null s'il est inconnu ou si le réseau ne répond pas. */
export async function fetchProduct(barcode: string): Promise<ProductInfo | null> {
  const r = await lookupProduct(barcode);
  return r.status === "found" ? r.product : null;
}

// ——— Recherche par nom ———

/** Un résultat de recherche : la fiche est partielle (ni ingrédients ni additifs) ; la fiche complète vient de lookupProduct. */
export type ProductHit = { code: string; product: ProductInfo };
export type ProductSearch = { status: "ok"; hits: ProductHit[] } | { status: "offline" } | { status: "busy" };

const SEARCH_FIELDS = "code,product_name,product_name_fr,brands,image_front_small_url,nutriscore_grade,nova_group";

/** Recherche plein texte, limitée aux produits vendus en France. */
export const offSearchUrl = (q: string) =>
  `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q.trim())}&search_simple=1&action=process&json=1&page_size=20` +
  `&tagtype_0=countries&tag_contains_0=contains&tag_0=france&fields=${SEARCH_FIELDS}`;

const searches = new Map<string, ProductSearch>();
const searchKey = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

/** Résultat déjà connu pour cette recherche (pas de nouvel appel). */
export const cachedSearch = (q: string) => searches.get(searchKey(q));

/**
 * Cherche des produits par leur nom. Open Food Facts limite le nombre de recherches :
 * on n'appelle qu'à la validation, et chaque recherche réussie est gardée pour la session.
 */
export async function searchProducts(q: string, { timeout = 10000 }: { timeout?: number } = {}): Promise<ProductSearch> {
  const key = searchKey(q);
  if (!key) return { status: "ok", hits: [] };
  const hit = searches.get(key);
  if (hit) return hit;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { status: "offline" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(offSearchUrl(key), { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (res.status === 429 || res.status === 503) return { status: "busy" };
    if (!res.ok) return { status: "offline" };
    const data = (await res.json()) as { products?: (OffProduct & { code?: string })[] };
    const seen = new Set<string>();
    const hits = (data.products ?? []).flatMap((p) => {
      const code = p.code?.trim();
      if (!code || !isBarcode(code) || seen.has(code) || !(clean(p.product_name_fr) ?? clean(p.product_name))) return [];
      seen.add(code);
      return [{ code, product: toProductInfo(p) }];
    });
    const result: ProductSearch = { status: "ok", hits };
    searches.set(key, result);
    return result;
  } catch {
    return { status: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

// ——— Vigilance bébé (11-12 mois) ———

const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const SWEETENER_CODES = new Set(["E420", "E421", "E950", "E951", "E952", "E953", "E954", "E955", "E957", "E959", "E960", "E961", "E962", "E964", "E965", "E966", "E967", "E968", "E969"]);
const SWEETENER_WORDS = /aspartame|sucralose|acesulfame|saccharine|cyclamate|neotame|advantame|steviol|stevia|sorbitol|maltitol|xylitol|erythritol|isomalt|edulcorant|sweetener/;

/** Au-delà de 0,3 g de sel pour 100 g, un produit est trop salé pour un bébé de moins d'un an. */
export const SALTY = 0.3;
const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Au-delà, la liste d'additifs est jugée longue. */
export const MANY_ADDITIVES = 5;

/**
 * Points d'attention pour bébé, du plus important au moins important. Phrases courtes, sans alarmer :
 * le miel est le seul vrai interdit ; le reste invite à garder le produit pour les grands.
 */
export function babyWarnings(product: ProductInfo): string[] {
  const out: string[] = [];
  const text = norm(product.ingredientsText ?? "");
  const additives = product.additives ?? [];
  if (/\bmiel\b|\bhoney\b/.test(text)) out.push("Contient du miel : interdit avant 1 an (risque de botulisme).");
  if (SWEETENER_WORDS.test(text) || additives.some((a) => SWEETENER_CODES.has(a.split(/[^A-Z0-9]/)[0]))) out.push("Contient des édulcorants : pas pour bébé.");
  const salt = product.nutrition?.salt;
  if (salt !== undefined && salt > SALTY) out.push(`Assez salé pour bébé (${fmt(salt)} g de sel pour 100 g).`);
  else if (/\bsel\b|\bsalt\b|\bsodium\b/.test(text)) out.push("Contient du sel : à garder pour les grands.");
  if (product.levels?.sugars === "high") out.push(`Riche en sucres${product.nutrition?.sugars !== undefined ? ` (${fmt(product.nutrition.sugars)} g pour 100 g)` : ""} : à limiter pour bébé.`);
  else if (/\bsucres?\b|\bsugar\b|sirop|dextrose|glucose|fructose|maltodextrine|saccharose|\bsucrose\b/.test(text)) out.push("Contient du sucre ajouté : à limiter pour bébé.");
  if (additives.length > MANY_ADDITIVES) out.push(`Beaucoup d'additifs (${additives.length}) : préfère plus simple pour bébé.`);
  if (product.nutriscore === "d" || product.nutriscore === "e") out.push(`Nutri-Score ${product.nutriscore.toUpperCase()} : plutôt occasionnel.`);
  if (product.nova === 4) out.push("Produit ultra-transformé (NOVA 4).");
  if (!product.ingredientsText) out.push("Liste d'ingrédients absente : vérifie l'étiquette.");
  return out;
}
