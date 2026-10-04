// Icônes PWA rendues depuis le logo (sharp). Usage : npm run icons -w @mijote/web
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const mark = `<path d="M31 22c-3-4 1-6 0-10s2-7 6-8" fill="none" stroke="#4f6b3f" stroke-width="2.6" stroke-linecap="round"/><path d="M36.5 4.2c5.5-1.6 11.4.4 13.6 4.6-4.6 2.4-11.2 1.6-13.6-4.6z" fill="#7d9a5b"/><path d="M37 4.6c4 1 7.6 2.6 11.6 4" fill="none" stroke="#4f6b3f" stroke-width="1.2" stroke-linecap="round" opacity=".8"/><path d="M12 30.5c1.5-6 9.5-9 20-9s18.5 3 20 9z" fill="#9a4426"/><rect x="28" y="18.5" width="8" height="4" rx="2" fill="#9a4426"/><path d="M9.5 32h45c.9 0 1.5.8 1.3 1.7l-2.6 12.6C52.4 51 48.6 54 44 54H20c-4.6 0-8.4-3-9.2-7.7L8.2 33.7c-.2-.9.4-1.7 1.3-1.7z" fill="#b85532"/><path d="M8.6 36.5H4.8c-1.4 0-1.9 1.9-.7 2.6l4.9 2.6zM55.4 36.5h3.8c1.4 0 1.9 1.9.7 2.6l-4.9 2.6z" fill="#9a4426"/><path d="M15 38c.6 4.6 2.4 8.4 6.4 10" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`;

/** padding : part du carré laissée autour du logo (la zone sûre des icônes maskable est le cercle central de 80 %). */
const svg = (padding: number, radius: number) => {
  const inner = 64 * (1 - 2 * padding);
  const offset = 64 * padding;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${radius}" fill="#f7f1e5"/><g transform="translate(${offset} ${offset}) scale(${inner / 64})">${mark}</g></svg>`;
};

const out = new URL("../public/", import.meta.url);
mkdirSync(new URL("icons/", out), { recursive: true });
const render = (s: string, size: number, file: string) => sharp(Buffer.from(s)).resize(size, size).png().toFile(new URL(file, out).pathname);

await render(svg(0.12, 0), 192, "icons/icon-192.png");
await render(svg(0.12, 0), 512, "icons/icon-512.png");
await render(svg(0.22, 0), 512, "icons/icon-maskable-512.png");
await render(svg(0.14, 0), 180, "apple-touch-icon.png");
writeFileSync(new URL("logo.svg", out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark}</svg>\n`);
console.log("Icônes générées dans apps/web/public/");
