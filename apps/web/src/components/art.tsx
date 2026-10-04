import { ILLUSTRATION_KEYS, ingredientMap, plateOf, type Recipe } from "@mijote/shared";
import { cn } from "@/lib/utils";

// Illustrations servies en images (public/illustrations, générées par scripts/illustrations.ts) :
// rastérisées une fois par le navigateur, elles restent fluides pendant les animations et le défilement.

const KNOWN = new Set<string>(ILLUSTRATION_KEYS);
const src = (name: string) => `${import.meta.env.BASE_URL}illustrations/${KNOWN.has(name) ? name : "sprig"}.svg`;

export function Art({ name, className, title }: { name: string; className?: string; title?: string }) {
  return <img src={src(name)} alt={title ?? ""} aria-hidden={title ? undefined : true} draggable={false} decoding="async" className={cn("pointer-events-none select-none", className)} />;
}

/** Positions des éléments d'une assiette : protéine devant, légume et féculent derrière. */
const LAYOUTS: Record<number, { w: string; left: string; top: string; z: number }[]> = {
  1: [{ w: "80%", left: "10%", top: "10%", z: 1 }],
  2: [
    { w: "64%", left: "4%", top: "30%", z: 2 },
    { w: "62%", left: "36%", top: "4%", z: 1 },
  ],
  3: [
    { w: "60%", left: "22%", top: "38%", z: 3 },
    { w: "56%", left: "44%", top: "0%", z: 2 },
    { w: "54%", left: "0%", top: "4%", z: 1 },
  ],
};

/** Composition calculée une fois par recette (les ingrédients d'une recette ne changent pas). */
// Les prix modifiés par le foyer n'y changent rien : la liste d'ingrédients de base suffit, sans abonnement au store.
const INGREDIENTS = ingredientMap();
const plates = new WeakMap<Recipe, string[]>();
const plateFor = (recipe: Recipe) => {
  let keys = plates.get(recipe);
  if (!keys) plates.set(recipe, (keys = plateOf(recipe, INGREDIENTS)));
  return keys;
};

/** Assiette aquarelle : protéine + légume + féculent de la recette (ou son produit vedette pour un dessert). */
export function Plate({ recipe, className }: { recipe: Recipe; className?: string }) {
  const keys = plateFor(recipe);
  const layout = LAYOUTS[keys.length];
  return (
    <span className={cn("relative block aspect-square", className)} aria-hidden>
      {keys.map((k, i) => (
        <span key={k} className="absolute" style={{ width: layout[i].w, left: layout[i].left, top: layout[i].top, zIndex: layout[i].z }}>
          <Art name={k} className="aspect-square w-full drop-shadow-[0_2px_2px_rgb(80_60_30_/_0.1)]" />
        </span>
      ))}
    </span>
  );
}
