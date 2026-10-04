// Exporte les illustrations « Pastille » en SVG autonomes, sans filtre ni image : nettes à toutes les tailles (iPhone compris).
// - public/illustrations/<clé>.svg : le produit en autocollant sur sa pastille (Art : produits, états vides, placard…).
// - public/illustrations/food/<clé>.svg : l'aliment nu, forme « cuisinée », pour les assiettes composées (Plate) ;
//   food/whole/<clé>.svg : le produit entier nu, qui dépasse derrière un bol.
// - public/illustrations/food/_badge-<ton>.svg, _plate.svg, _bowl-<couleur>.svg, _soup-<couleur>.svg : pastilles et contenants.
// L'appli les affiche en <img> : rastérisés une fois, fluides pendant les animations.
// Usage : npm run art -w @mijote/web (lancé aussi par dev et build).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ILLUSTRATION_KEYS } from "@mijote/shared";
import { ILLUSTRATIONS, LABELS, SPRIG } from "../src/components/illustrations/index.tsx";
import { Badge, Bare, Bowl, BOWL_COLORS, PlateDish, SoupSurface, Sticker } from "../src/components/illustrations/frame.tsx";
import type { BowlColor } from "../src/components/illustrations/frame.tsx";
import { metaOf, SOUP_NAMES, TONE_NAMES } from "../src/components/illustrations/meta.ts";

const out = new URL("../public/illustrations/", import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL("food/whole/", out), { recursive: true });

// Balises vides auto-fermantes : un tiers d'octets en moins.
const markup = (el: ReactElement) => renderToStaticMarkup(el).replace(/><\/(path|ellipse|circle|use)>/g, "/>");

const sizes: Record<string, number> = { sticker: 0, food: 0, containers: 0 };
const write = (file: string, el: ReactElement, group: string) => {
  const svg = markup(el);
  if (/<filter|<image|feTurbulence|feDisplacement|blur|<mask/i.test(svg)) throw new Error(`${file} : filtre ou image interdits`);
  if (svg.length > 8000) console.warn(`⚠ ${file} pèse ${(svg.length / 1024).toFixed(1)} Ko`);
  writeFileSync(new URL(file, out), svg);
  sizes[group] += svg.length;
};

const missing = ILLUSTRATION_KEYS.filter((k) => !ILLUSTRATIONS[k]);
if (missing.length) throw new Error(`Illustrations manquantes : ${missing.join(", ")}`);

for (const key of [...ILLUSTRATION_KEYS, "sprig"] as const) {
  const food = key === "sprig" ? SPRIG : ILLUSTRATIONS[key];
  const meta = metaOf(key);
  write(`${key}.svg`, createElement(Sticker, { draw: food.product, tone: meta.tone, label: LABELS[key] }), "sticker");
  write(`food/${key}.svg`, createElement(Bare, { draw: food.plated ?? food.product, foot: meta.foot }), "food");
  // Produit entier sans pastille ni ombre : ce qui dépasse derrière un bol.
  write(`food/whole/${key}.svg`, createElement(Bare, { draw: food.product, foot: 0 }), "food");
}
for (const tone of TONE_NAMES) write(`food/_badge-${tone}.svg`, createElement(Badge, { tone }), "containers");
write("food/_plate.svg", createElement(PlateDish), "containers");
for (const color of Object.keys(BOWL_COLORS) as BowlColor[]) write(`food/_bowl-${color}.svg`, createElement(Bowl, { color }), "containers");
for (const soup of SOUP_NAMES) write(`food/_soup-${soup}.svg`, createElement(SoupSurface, { soup }), "containers");

const ko = (n: number) => `${(n / 1024).toFixed(0)} Ko`;
console.log(`${ILLUSTRATION_KEYS.length + 1} illustrations exportées : autocollants ${ko(sizes.sticker)}, aliments ${ko(sizes.food)}, contenants ${ko(sizes.containers)}`);
