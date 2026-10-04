import type { ProductInfo } from "@mijote/shared";

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

export function toProductInfo(p: OffProduct): ProductInfo {
  const grade = p.nutriscore_grade?.toLowerCase();
  const nova = Number(p.nova_group);
  return {
    name: clean(p.product_name_fr) ?? clean(p.product_name) ?? "Produit sans nom",
    brand: clean(p.brands?.split(",")[0]),
    image: p.image_front_small_url || undefined,
    nutriscore: grade && /^[a-e]$/.test(grade) ? grade : undefined,
    nova: nova >= 1 && nova <= 4 ? nova : undefined,
    additives: [...new Set((p.additives_tags ?? []).map(additiveLabel))],
    allergens: [...new Set((p.allergens_tags ?? []).map(allergenLabel))],
    ingredientsText: clean(p.ingredients_text_fr) ?? clean(p.ingredients_text),
    quantity: clean(p.quantity),
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

// ——— Vigilance bébé (11-12 mois) ———

const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const SWEETENER_CODES = new Set(["E420", "E421", "E950", "E951", "E952", "E953", "E954", "E955", "E957", "E959", "E960", "E961", "E962", "E964", "E965", "E966", "E967", "E968", "E969"]);
const SWEETENER_WORDS = /aspartame|sucralose|acesulfame|saccharine|cyclamate|neotame|advantame|steviol|stevia|sorbitol|maltitol|xylitol|erythritol|isomalt|edulcorant|sweetener/;

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
  if (/\bsel\b|\bsalt\b|\bsodium\b/.test(text)) out.push("Contient du sel : à garder pour les grands.");
  if (/\bsucres?\b|\bsugar\b|sirop|dextrose|glucose|fructose|maltodextrine|saccharose|\bsucrose\b/.test(text)) out.push("Contient du sucre ajouté : à limiter pour bébé.");
  if (additives.length > MANY_ADDITIVES) out.push(`Beaucoup d'additifs (${additives.length}) : préfère plus simple pour bébé.`);
  if (product.nutriscore === "d" || product.nutriscore === "e") out.push(`Nutri-Score ${product.nutriscore.toUpperCase()} : plutôt occasionnel.`);
  if (product.nova === 4) out.push("Produit ultra-transformé (NOVA 4).");
  if (!product.ingredientsText) out.push("Liste d'ingrédients absente : vérifie l'étiquette.");
  return out;
}
