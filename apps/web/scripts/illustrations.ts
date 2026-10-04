// Exporte chaque illustration aquarelle en fichier SVG autonome (filtres inclus) dans public/illustrations/.
// L'appli les affiche en <img> : le navigateur les rastérise une fois, au lieu de recalculer les filtres
// à chaque image d'animation ou de défilement. Usage : npm run art -w @mijote/web (lancé aussi par dev et build).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ILLUSTRATIONS, Sprig, WatercolorDefs } from "../src/components/illustrations/index.tsx";

const out = new URL("../public/illustrations/", import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const defs = renderToStaticMarkup(createElement(WatercolorDefs)).match(/<defs>[\s\S]*<\/defs>/)?.[0];
if (!defs) throw new Error("Filtres aquarelle introuvables dans WatercolorDefs");

let total = 0;
const entries = [...Object.entries(ILLUSTRATIONS), ["sprig", Sprig] as const];
for (const [key, Component] of entries) {
  const svg = renderToStaticMarkup(createElement(Component))
    .replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/ aria-hidden="true"/, "")
    .replace(/^(<svg[^>]*>)/, `$1${defs}`);
  writeFileSync(new URL(`${key}.svg`, out), svg);
  total += svg.length;
}
console.log(`${entries.length} illustrations exportées (${Math.round(total / 1024)} Ko) dans public/illustrations/`);
