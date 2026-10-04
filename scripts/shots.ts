// Captures des écrans clés aux viewports cibles (revue design). Usage : npx tsx scripts/shots.ts [url]
import { existsSync } from "node:fs";
import { chromium, devices } from "playwright";

const base = process.argv[2] ?? "http://localhost:4173/mijote/";
const out = new URL("../design/screens/", import.meta.url).pathname;
const VIEWPORTS = {
  iphone13: devices["iPhone 13"],
  pixel7: devices["Pixel 7"],
  ipad: devices["iPad (gen 7)"],
  desktop: { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 },
};
const ROUTES = ["", "semaine", "courses", "recettes", "recettes/soupe-pois-casses-carottes-cumin", "reglages"];
const only = process.env.ONLY?.split(",");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined) });
for (const [name, device] of Object.entries(VIEWPORTS)) {
  if (only && !only.includes(name)) continue;
  const ctx = await browser.newContext({ ...device, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${name}] ${e.message}`));
  for (const r of ROUTES) {
    await page.goto(`${base}#/${r}`);
    await page.waitForTimeout(600);
    const file = `${out}${name}-${r.replaceAll("/", "_") || "aujourdhui"}.png`;
    await page.screenshot({ path: file, fullPage: name !== "desktop" });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
