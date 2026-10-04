// Parcours principal de la vitrine, de bout en bout (Playwright, Chromium).
// Préparer la semaine → remplacer 3 repas → aperçu par appui long → valider → courses → cocher, synchro entre 2 onglets → impressions.
// Usage : npm run build && npm run preview (autre terminal), puis npm run test:e2e [url]
import { existsSync, mkdirSync } from "node:fs";
import { chromium, devices, type Page } from "playwright";

const base = process.argv[2] ?? "http://localhost:4173/mijote/";
const out = new URL("../design/screens/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const executablePath = process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

let failures = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    await page.screenshot({ path: `${out}fail-${failures}.png` }).catch(() => undefined);
    console.error(`✗ ${name}\n  ${(e as Error).message.split("\n")[0]}`);
  }
};
const shot = (page: Page, name: string) => page.screenshot({ path: `${out}flow-${name}.png` });

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "fr-FR", timezoneId: "Europe/Paris" });
const page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));

await step("l'accueil s'ouvre sur la semaine en cours", async () => {
  await page.goto(`${base}#/`);
  await page.getByRole("heading", { name: "Aujourd'hui" }).waitFor();
  await page.getByText("Ce soir, pour demain").waitFor();
});

await step("préparer la semaine prochaine", async () => {
  await page.goto(`${base}#/semaine`);
  await page.getByRole("tab", { name: "Semaine prochaine" }).click();
  await page.getByRole("button", { name: "Préparer la semaine" }).click();
  await page.getByRole("region", { name: "Lundi" }).waitFor();
  const tiles = await page.locator("section[aria-label] button[aria-label*='Appui long']").count();
  if (tiles !== 28) throw new Error(`28 vignettes attendues, ${tiles} trouvées`);
  await shot(page, "1-semaine");
});

for (const [i, day] of (["Mardi", "Mercredi", "Jeudi"] as const).entries()) {
  await step(`remplacer un repas (${day})`, async () => {
    const tile = page.getByRole("region", { name: day }).locator("button[aria-label^='Soir']");
    const before = await tile.getAttribute("aria-label");
    await tile.click();
    const sheet = page.getByRole("dialog");
    await sheet.getByText("autres idées").waitFor();
    if (i === 0) await shot(page, "2-alternatives");
    await sheet.locator(".grid > div > button").first().click();
    await sheet.waitFor({ state: "detached" });
    await page.waitForTimeout(400); // fin de l'animation de fermeture (voile)
    const after = await tile.getAttribute("aria-label");
    if (before === after) throw new Error("la recette n'a pas changé");
  });
}

await step("aperçu par appui long, relâcher ferme", async () => {
  const tile = page.getByRole("region", { name: "Vendredi" }).locator("button[aria-label^='Midi']");
  await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const box = (await tile.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.getByRole("dialog", { name: /Aperçu/ }).waitFor();
  await shot(page, "3-apercu");
  await page.mouse.up();
  await page.getByRole("dialog", { name: /Aperçu/ }).waitFor({ state: "detached" });
});

await step("pas de doublon après les remplacements", async () => {
  const dup = await page.getByText(/apparaît deux fois/).count();
  if (dup) throw new Error("une recette apparaît deux fois");
});

await step("valider la semaine", async () => {
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Valider" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Valider" }).click();
  await page.getByText("Validée", { exact: true }).first().waitFor();
});

const second = await ctx.newPage();
await step("liste de courses, cochée en direct dans un 2e onglet", async () => {
  await page.goto(`${base}#/courses`);
  await page.getByRole("tab", { name: /Marché/ }).waitFor();
  await second.goto(`${base}#/courses`);
  await second.getByRole("tab", { name: /Marché/ }).waitFor();
  const first = page.locator("ul li button[aria-pressed]").first();
  const name = (await first.innerText()).split("\n")[0];
  await first.click();
  if ((await first.getAttribute("aria-pressed")) !== "true") throw new Error("article non coché");
  await second.locator("ul li button[aria-pressed='true']").first().waitFor({ timeout: 3000 });
  await shot(page, "4-courses");
  console.log(`  coché : ${name}`);
});

await step("« J'ai déjà » sort l'article de la liste", async () => {
  const have = page.getByRole("button", { name: /^J'ai déjà/ }).nth(1);
  const label = await have.getAttribute("aria-label");
  await have.click();
  await page.getByRole("heading", { name: "Déjà à la maison" }).waitFor();
  if (await page.getByRole("button", { name: label! }).count()) throw new Error("toujours dans la liste");
});

await step("supermarché et placard", async () => {
  await page.getByRole("tab", { name: /Supermarché/ }).click();
  await page.getByRole("button", { name: "Placard" }).click();
  await page.getByRole("dialog").getByText("Coche ce que tu as en stock").waitFor();
  await shot(page, "5-placard");
  await page.keyboard.press("Escape");
});

await step("impressions frigo et courses", async () => {
  await page.goto(`${base}#/semaine/imprimer`);
  await page.getByText("Ce soir, pour demain").first().waitFor();
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: `${out}flow-frigo.pdf`, landscape: true, format: "A4", printBackground: true }).catch(() => undefined);
  await page.emulateMedia({ media: "screen" });
  await page.goto(`${base}#/courses/imprimer`);
  await page.getByText("Supermarché").first().waitFor();
});

await step("bibliothèque, nouveautés et fiche recette", async () => {
  await page.goto(`${base}#/recettes`);
  await page.getByRole("button", { name: "Nouveautés" }).click();
  await page.getByRole("button", { name: "Garder" }).first().click({ timeout: 10000 });
  await page.keyboard.press("Escape");
  await page.locator("main .grid.gap-3 > div > button").first().click();
  await page.getByText("Pour bébé").waitFor();
  await shot(page, "6-fiche");
});

await step("aucune erreur JavaScript", async () => {
  if (errors.length) throw new Error(errors.join(" | "));
});

await browser.close();
console.log(failures ? `\n${failures} étape(s) en échec` : "\nParcours complet ✓");
process.exit(failures ? 1 : 0);
