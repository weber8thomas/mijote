import { ILLUSTRATION_KEYS, ingredientMap, isBowlDish, plateOf, type Recipe } from "@mijote/shared";
import { metaOf, type Soup, type Tone } from "@/components/illustrations/meta";
import { cn } from "@/lib/utils";

// Illustrations « Pastille » servies en images (public/illustrations, générées par scripts/illustrations.ts) :
// SVG en aplats, sans filtre, rastérisés une fois par le navigateur → nets sur iPhone et fluides en animation.

const KNOWN = new Set<string>(ILLUSTRATION_KEYS);
const BASE = `${import.meta.env.BASE_URL}illustrations/`;
const keyOf = (name: string) => (KNOWN.has(name) ? name : "sprig");

/** Produit seul, en autocollant sur sa pastille (listes, placard, états vides, produits de saison). */
export function Art({ name, className, title }: { name: string; className?: string; title?: string }) {
  return <img src={`${BASE}${keyOf(name)}.svg`} alt={title ?? ""} aria-hidden={title ? undefined : true} draggable={false} decoding="async" className={cn("pointer-events-none select-none", className)} />;
}

// ---------- Assiette composée ----------
// Tout se passe dans une boîte 120 × 120 (celle des SVG) : pastille → contenant → aliments, de l'arrière vers l'avant.
// Chaque aliment (food/<clé>.svg) est dessiné posé sur y = 104 de sa propre boîte : on le place par son point de pose.

/** Un aliment placé : centre x, point de pose y, largeur de son image (unités de la boîte 120). */
type Item = { key: string; x: number; y: number; w: number; whole?: boolean };
type Dish =
  | { kind: "single"; key: string }
  | { kind: "plate"; tone: Tone; items: Item[] }
  | { kind: "bowl"; tone: Tone; items: Item[]; soup: Soup; bowl: "terracotta" | "sage" };

const GROUND = 104 / 120;

const isMain = (r: Recipe) => r.slots.some((s) => s === "lunch" || s === "dinner");

/** Créneaux de l'assiette : protéine au fond à droite, l'accompagnement le plus haut au fond à gauche, le plus plat devant. */
const SLOT = { backLeft: [37, 68], backRight: [83, 66], front: [60, 99] } as const;
const W = 64;

function plateItems(keys: string[]): Item[] {
  const at = (key: string, [x, y]: readonly [number, number], w = W): Item => ({ key, x, y, w: w * (metaOf(key).size ?? 1) });
  if (keys.length === 1) return [at(keys[0], [60, 94], 76)];
  const protein = keys.find((k) => metaOf(k).kind === "protein");
  const sides = keys.filter((k) => k !== protein).sort((a, b) => metaOf(b).height - metaOf(a).height);
  if (protein && sides.length >= 2) return [at(sides[0], SLOT.backLeft), at(protein, SLOT.backRight), at(sides[1], SLOT.front)];
  // Deux aliments : le plus haut au fond à gauche, l'autre devant à droite.
  const [back, front] = [...keys].sort((a, b) => metaOf(b).height - metaOf(a).height);
  return [at(back, [42, 74], 68), at(front, [78, 98], 64)];
}

/** Bol : les produits entiers du plat dépassent derrière le bol (légume à gauche, protéine à droite). */
function bowlItems(keys: string[]): Item[] {
  const protein = keys.find((k) => metaOf(k).kind === "protein");
  const veg = keys.find((k) => metaOf(k).kind === "veg" || metaOf(k).kind === "fruit");
  if (veg && protein) return [{ key: veg, x: 36, y: 64, w: 54, whole: true }, { key: protein, x: 84, y: 62, w: 50, whole: true }];
  const only = veg ?? protein ?? keys[0];
  return only ? [{ key: only, x: 78, y: 57, w: 60, whole: true }] : [];
}

function soupOf(r: Recipe, keys: string[]): Soup {
  if (!isMain(r)) return /chocolat/i.test(r.title) ? "brown" : /compote/i.test(r.title) ? metaOf(r.illustration).soup : "cream";
  const veg = keys.find((k) => metaOf(k).kind === "veg");
  return metaOf(veg ?? keys[0] ?? r.illustration).soup;
}

function dishOf(recipe: Recipe): Dish {
  const keys = plateOf(recipe, INGREDIENTS);
  const tone = metaOf(recipe.illustration).tone;
  if (isBowlDish(recipe)) {
    const items = isMain(recipe) ? bowlItems(keys) : [{ key: recipe.illustration, x: 78, y: 57, w: 60, whole: true }];
    const soup = soupOf(recipe, keys);
    // Bol sauge sur pastille rosée, terracotta sinon ; jamais une soupe verte dans un bol vert.
    return { kind: "bowl", tone, items, soup, bowl: (tone === "terracotta" || tone === "plum") && soup !== "green" ? "sage" : "terracotta" };
  }
  if (!isMain(recipe) && keys.length === 1) return { kind: "single", key: keys[0] };
  return { kind: "plate", tone, items: plateItems(keys).sort((a, b) => a.y - b.y) };
}

/** Composition calculée une fois par recette (les ingrédients d'une recette ne changent pas). */
// Les prix modifiés par le foyer n'y changent rien : la liste d'ingrédients de base suffit, sans abonnement au store.
const INGREDIENTS = ingredientMap();
const dishes = new WeakMap<Recipe, Dish>();
const dishFor = (recipe: Recipe) => {
  let dish = dishes.get(recipe);
  if (!dish) dishes.set(recipe, (dish = dishOf(recipe)));
  return dish;
};

const pct = (n: number) => `${(n / 1.2).toFixed(2)}%`;
const Layer = ({ file, item }: { file: string; item?: Item }) => (
  <img
    src={`${BASE}${file}.svg`}
    alt=""
    draggable={false}
    decoding="async"
    className="pointer-events-none absolute max-w-none select-none"
    style={item ? { left: pct(item.x - item.w / 2), top: pct(item.y - item.w * GROUND), width: pct(item.w) } : { inset: 0, width: "100%", height: "100%" }}
  />
);

/** En tout petit (moins de ~48 px), une assiette à trois aliments devient illisible : on montre seulement l'aliment vedette. */
function compactOf(dish: Dish): Dish {
  if (dish.kind !== "plate") return dish;
  const hero = dish.items.find((it) => metaOf(it.key).kind === "protein") ?? dish.items[0];
  return hero ? { kind: "single", key: hero.key } : dish;
}

/**
 * Le plat d'une recette dans une seule pastille : assiette ou bol, puis protéine, légume, féculent (ou le produit du dessert).
 * compact : pour les vignettes de moins de ~48 px (vue du mois), seulement l'aliment vedette en autocollant.
 */
export function Plate({ recipe, className, compact = false }: { recipe: Recipe; className?: string; compact?: boolean }) {
  const full = dishFor(recipe);
  const dish = compact ? compactOf(full) : full;
  return (
    <span className={cn("relative block aspect-square", className)} aria-hidden>
      {dish.kind === "single" ? (
        <Layer file={keyOf(dish.key)} />
      ) : (
        <>
          <Layer file={`food/_badge-${dish.tone}`} />
          {dish.kind === "plate" && <Layer file="food/_plate" />}
          {dish.items.map((it) => (
            <Layer key={it.key} file={`food/${it.whole ? "whole/" : ""}${keyOf(it.key)}`} item={it} />
          ))}
          {dish.kind === "bowl" && (
            <>
              <Layer file={`food/_bowl-${dish.bowl}`} />
              <Layer file={`food/_soup-${dish.soup}`} />
            </>
          )}
        </>
      )}
    </span>
  );
}
