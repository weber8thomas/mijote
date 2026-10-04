// Icônes PWA rendues depuis le logo (sharp). Usage : npm run icons -w @mijote/web
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const mark = `<path d="M60 41c-6-7 4-10 0-17s3-10 9-11" fill="none" stroke="#4f6b3f" stroke-width="3" stroke-linecap="round"/><path d="M69 13c8-4 17-2 20 4-7 4-16 3-20-4z" fill="#7d9a5b" stroke="#4f6b3f" stroke-width="1.6" stroke-linejoin="round"/><path d="M30 61c4-9 16-13 30-13s26 4 30 13z" fill="#b85532" stroke="#2f2a24" stroke-width="3" stroke-linejoin="round"/><rect x="55" y="41" width="10" height="7" rx="3" fill="#b85532" stroke="#2f2a24" stroke-width="3"/><path d="M27 62h66l-5 25c-1.5 7-7 11-14 11H46c-7 0-12.5-4-14-11z" fill="#fffaf1" stroke="#2f2a24" stroke-width="3" stroke-linejoin="round"/><path d="M27 69h-8M93 69h8" stroke="#2f2a24" stroke-width="3" stroke-linecap="round"/>`;

/** padding : part du carré laissée autour du logo (la zone sûre des icônes maskable est le cercle central de 80 %). */
// Icône « Carnet » : la cocotte sur fond terracotta pâle (viewBox du logo : 120).
const svg = (padding: number, radius: number) => {
  const inner = 120 * (1 - 2 * padding);
  const offset = 120 * padding;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="${radius}" fill="#f5ddd0"/><g transform="translate(${offset} ${offset}) scale(${inner / 120})">${mark}</g></svg>`;
};

const out = new URL("../public/", import.meta.url);
mkdirSync(new URL("icons/", out), { recursive: true });
const render = (s: string, size: number, file: string) => sharp(Buffer.from(s)).resize(size, size).png().toFile(new URL(file, out).pathname);

await render(svg(0.1, 0), 192, "icons/icon-192.png");
await render(svg(0.1, 0), 512, "icons/icon-512.png");
await render(svg(0.2, 0), 512, "icons/icon-maskable-512.png");
await render(svg(0.12, 0), 180, "apple-touch-icon.png");
writeFileSync(new URL("logo.svg", out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="66" r="47" fill="#f5ddd0"/>${mark}</svg>\n`);
console.log("Icônes générées dans apps/web/public/");
