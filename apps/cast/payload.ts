import { castRecipe, ingredientMap, RECIPES } from "@mijote/shared";

// Essai Nest Hub : une recette du seed → ce que l'écran affiche (voir packages/shared/src/cast.ts).
// Usage : npx tsx apps/cast/payload.ts <id-de-recette> | uv run apps/cast/send.py --app <APP_ID> --device "<écran>"
// Sans argument : la liste des ids. En production, c'est le serveur qui fait ça (apps/server/src/cast.ts).

const id = process.argv[2];
if (!id) {
  console.log(RECIPES.map((r) => `${r.id}  ${r.title}`).join("\n"));
} else {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) {
    console.error(`Recette inconnue : ${id}`);
    process.exit(1);
  }
  console.log(JSON.stringify(castRecipe(r, ingredientMap()), null, 2));
}
