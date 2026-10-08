import { ingredientLine, ingredientMap, RECIPES, type Recipe } from "@mijote/shared";

// Essai Nest Hub : une recette du seed → ce que l'écran affiche (ingrédients accordés, étapes, portion bébé).
// Usage : npx tsx apps/cast/payload.ts <id-de-recette> | uv run apps/cast/send.py --app <APP_ID>
// Sans argument : la liste des ids.

const fmtMinutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

export function castPayload(r: Recipe) {
  const ings = ingredientMap();
  return {
    v: 1,
    id: r.id,
    title: r.title,
    meta: [`Préparation ${fmtMinutes(r.prepMinutes)}`, r.cookMinutes ? `cuisson ${fmtMinutes(r.cookMinutes)}` : "", `${r.servingsBase} parts adultes`].filter(Boolean).join(" · "),
    ingredients: r.ingredients
      .filter((ri) => !ri.babyPortionOnly)
      .map((ri) => {
        const ing = ings.get(ri.ingredientId);
        const line = ing ? ingredientLine(ri.qty, ri.unit, ing) : { qty: String(ri.qty), name: ri.ingredientId };
        return { ...line, note: [ri.note, ri.adultOnly ? "adultes" : ""].filter(Boolean).join(", ") || undefined };
      }),
    steps: r.steps,
    baby: r.babyAdaptation,
  };
}

const id = process.argv[2];
if (!id) {
  console.log(RECIPES.map((r) => `${r.id}  ${r.title}`).join("\n"));
} else {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) {
    console.error(`Recette inconnue : ${id}`);
    process.exit(1);
  }
  console.log(JSON.stringify(castPayload(r), null, 2));
}
