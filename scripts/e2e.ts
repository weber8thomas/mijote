// Parcours principal de la vitrine, de bout en bout (Playwright, Chromium).
// Préparer la semaine → remplacer 3 repas → aperçu par appui long → valider → courses → cocher, synchro entre 2 onglets → impressions.
// Usage : npm run build && npm run preview (autre terminal), puis npm run test:e2e [url]
import { existsSync, mkdirSync, readFileSync } from "node:fs";
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
// Service worker bloqué : les faux serveurs (Home Assistant, Anthropic, Open Food Facts) passent par page.route.
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const page = await ctx.newPage();
page.setDefaultTimeout(10000);
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));

await step("l'accueil s'ouvre sur la semaine en cours", async () => {
  await page.goto(`${base}#/`);
  await page.getByRole("heading", { name: "Aujourd'hui" }).waitFor();
  await page.getByText("Fer du jour").waitFor();
  if (await page.getByText(/veille|Ce soir, pour demain/).count()) throw new Error("mention « veille » encore visible");
});

await step("préparer la semaine prochaine → choix repas par repas", async () => {
  await page.goto(`${base}#/semaine`);
  // Le week-end, la semaine prochaine est déjà sélectionnée ; sinon, on avance d'une semaine.
  if (!(await page.getByText("semaine prochaine", { exact: true }).isVisible().catch(() => false))) await page.getByRole("button", { name: "Semaine suivante" }).click();
  await page.getByText("semaine prochaine", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Préparer la semaine" }).click();
  await page.getByText("Repas 1/14", { exact: false }).waitFor();
  const cards = await page.locator("main .grid > div > button:first-child").count();
  if (cards !== 6) throw new Error(`6 choix attendus, ${cards} trouvés`);
  await shot(page, "1-choix");
});

await step("appui long : l'aperçu reste ouvert, « Choisir ce repas »", async () => {
  const card = page.locator("main .grid > div > button:first-child").nth(3);
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  const preview = page.getByRole("dialog", { name: /Aperçu/ });
  await page.waitForTimeout(400);
  if (!(await preview.isVisible())) throw new Error("l'aperçu s'est fermé au relâchement");
  await shot(page, "2-apercu");
  await preview.getByRole("button", { name: "Choisir ce repas" }).click();
  await page.getByText("Repas 2/14", { exact: false }).waitFor();
});

await step("geste retour → repas précédent, puis « À choisir »", async () => {
  await page.goBack();
  await page.getByText("Repas 1/14", { exact: false }).waitFor();
  await page.getByRole("button", { name: "À choisir" }).click();
  await page.getByText("à choisir", { exact: false }).first().waitFor();
});

await step("« Autre recette… » : chercher et choisir hors des 6 idées", async () => {
  await page.getByRole("button", { name: "Autre recette…" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder(/Chercher pour/).fill("lentilles");
  await dialog.locator("[cmdk-item]").first().click();
  await page.getByText("Repas 2/14", { exact: false }).waitFor();
});

await step("moulinette : « Autres idées » puis « 6 de plus »", async () => {
  const cards = page.locator("main .grid > div > button:first-child");
  const titles = async () => (await cards.allInnerTexts()).map((t) => t.split("\n")[0]).join("|");
  const before = await titles();
  await page.getByRole("button", { name: "Autres idées" }).click();
  const sel = "main .grid > div > button:first-child";
  await page.waitForFunction(`[...document.querySelectorAll(${JSON.stringify(sel)})].map((e) => e.innerText.split("\\n")[0]).join("|") !== ${JSON.stringify(before)}`);
  await page.getByRole("button", { name: "6 de plus" }).click();
  await page.waitForFunction(`document.querySelectorAll(${JSON.stringify(sel)}).length === 12`);
  await shot(page, "2b-moulinette");
});

await step("choisir les autres repas", async () => {
  for (let i = 1; i < 14; i++) {
    const label = page.getByText(/Repas \d+\/14/).first();
    if (!(await label.isVisible().catch(() => false))) break;
    await page.locator("main .grid > div > button:first-child").nth(i % 6).click();
    await page.waitForTimeout(450);
  }
  await page.getByRole("heading", { name: "Semaine" }).waitFor();
  await shot(page, "3-semaine");
});

await step("changer un repas depuis la semaine (sheet 2 × 3)", async () => {
  const tile = page.getByRole("region", { name: "Mercredi" }).locator("button[aria-label^='Midi']");
  await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const before = await tile.getAttribute("aria-label");
  await tile.click();
  const sheet = page.getByRole("dialog");
  await sheet.getByText("6 idées").waitFor();
  // Une idée autre que la recette déjà choisie (celle qui porte la coche).
  await sheet.locator(".grid > div > button:first-child").filter({ hasNot: page.locator("svg.lucide-check") }).nth(3).click();
  await sheet.waitFor({ state: "detached" });
  await page.waitForTimeout(400);
  if (before === (await tile.getAttribute("aria-label"))) throw new Error("la recette n'a pas changé");
});

await step("pas de doublon dans la semaine", async () => {
  if (await page.getByText(/apparaît deux fois/).count()) throw new Error("une recette apparaît deux fois");
});

await step("valider la semaine", async () => {
  await page.getByRole("button", { name: "Valider" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Valider" }).click();
  await page.getByText("Validée", { exact: true }).first().waitFor();
});

await step("semaine validée → « Modifier les repas » puis revalider", async () => {
  await page.getByRole("button", { name: "Modifier les repas" }).click();
  await page.getByText("Repas 1/14", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Semaine", exact: true }).click();
  await page.getByRole("button", { name: "Valider" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Valider" }).click();
  await page.getByText("Validée", { exact: true }).first().waitFor();
});

await step("export agenda (.ics)", async () => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Ajouter les repas à mon agenda" }).click()]);
  const path = await download.path();
  const text = (await import("node:fs")).readFileSync(path!, "utf8");
  if (!text.startsWith("BEGIN:VCALENDAR") || (text.match(/BEGIN:VEVENT/g) ?? []).length < 14) throw new Error("fichier .ics incomplet");
});

await step("vue du mois puis retour à une semaine", async () => {
  await page.getByRole("tab", { name: "Mois" }).click();
  const day = page.locator("button[aria-label*='déjeuner']").first();
  await day.waitFor();
  await shot(page, "8-mois");
  await day.click();
  await page.getByRole("tab", { name: "Semaine", selected: true }).waitFor();
});

await step("calendrier : choisir une autre semaine", async () => {
  await page.getByRole("button", { name: "Choisir une semaine dans le calendrier" }).click();
  await page.getByRole("dialog").waitFor();
  await shot(page, "9-calendrier");
  await page.getByRole("dialog").getByRole("button", { name: "Aujourd'hui", exact: true }).click();
  await page.getByText("cette semaine", { exact: true }).waitFor();
});

await step("recherche globale (loupe) → fiche recette", async () => {
  await page.getByRole("button", { name: /Rechercher une recette/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("Recette, ingrédient…").fill("courge");
  await dialog.locator("[cmdk-item]").first().waitFor();
  await shot(page, "7-recherche");
  await dialog.locator("[cmdk-group]").last().locator("[cmdk-item]").first().click();
  await page.getByText("Pour bébé").first().waitFor();
});

const second = await ctx.newPage();
await step("liste de courses, cochée en direct dans un 2e onglet", async () => {
  await page.goto(`${base}#/courses`);
  await page.getByRole("tab", { name: /Marché/ }).waitFor();
  await second.goto(`${base}#/courses`);
  // Les deux onglets sur la même semaine (le premier a été ramené à « cette semaine » par le calendrier).
  if (await second.getByText("semaine prochaine", { exact: true }).isVisible().catch(() => false)) await second.getByRole("button", { name: "Semaine précédente" }).click();
  await second.getByRole("tab", { name: /Marché/ }).waitFor();
  const first = page.locator("ul li button[aria-pressed]").first();
  const name = (await first.innerText()).split("\n")[0];
  await first.click();
  if ((await first.getAttribute("aria-pressed")) !== "true") throw new Error("article non coché");
  await second.locator("ul li button[aria-pressed='true']").first().waitFor({ timeout: 3000 });
  await shot(page, "4-courses");
  console.log(`  coché : ${name}`);
});

await step("filtrer la liste de courses", async () => {
  const filter = page.getByLabel("Filtrer la liste de courses");
  const before = await page.locator("ul li button[aria-pressed]").count();
  await filter.fill("zzz");
  if ((await page.locator("ul li button[aria-pressed]").count()) !== 0) throw new Error("le filtre ne filtre pas");
  await filter.fill("");
  if ((await page.locator("ul li button[aria-pressed]").count()) !== before) throw new Error("liste incomplète après filtre");
});

await step("« J'ai déjà » sort l'article de la liste", async () => {
  const have = page.getByRole("button", { name: /^J'ai déjà/ }).nth(1);
  const label = await have.getAttribute("aria-label");
  await have.click();
  await page.getByRole("heading", { name: "Déjà à la maison" }).waitFor();
  if (await page.getByRole("button", { name: label! }).count()) throw new Error("toujours dans la liste");
});

await step("ajout à la main : « 2 carottes, papier cuisson »", async () => {
  await page.getByLabel("Ajouter un article à la liste").fill("2 carottes, papier cuisson");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.getByText("2 articles ajoutés").waitFor();
  await page.getByRole("tab", { name: /Supermarché/ }).click();
  await page.getByRole("button", { name: "Retirer : papier cuisson" }).waitFor();
});

await step("lien profond #/courses/ajouter?t=… (Gemini, raccourci)", async () => {
  await page.goto(`${base}#/courses/ajouter?t=${encodeURIComponent("lait d'avoine")}`);
  await page.getByText(/ : ajouté$/).first().waitFor();
  await page.waitForURL(/#\/courses$/);
});

await step("Home Assistant : relier, envoyer, importer", async () => {
  const added: string[] = [];
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
  await page.route("https://ha.test/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const json = (body: unknown) => route.fulfill({ status: 200, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (req.headers().authorization !== "Bearer jeton-test") return route.fulfill({ status: 401, headers: cors });
    if (url.pathname === "/api/") return json({ message: "API running." });
    if (url.pathname === "/api/services/todo/get_items")
      return json({ service_response: { "todo.shopping_list": { items: [{ summary: "Bananes", uid: "1", status: "needs_action" }, ...added.map((a, i) => ({ summary: a, uid: `a${i}`, status: "needs_action" }))] } } });
    if (url.pathname === "/api/services/todo/add_item") {
      added.push(JSON.parse(req.postData() ?? "{}").item);
      return json([]);
    }
    return json([]);
  });
  await page.goto(`${base}#/reglages`);
  await page.getByRole("button", { name: /Home Assistant/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("https://maison.ui.nabu.casa").fill("https://ha.test");
  await dialog.getByLabel("Jeton d'accès longue durée").fill("jeton-test");
  await dialog.getByRole("button", { name: "Tester" }).click();
  await page.getByText("Home Assistant répond").waitFor();
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.goto(`${base}#/courses`);
  await page.getByRole("button", { name: "Envoyer la liste" }).click();
  await page.getByRole("button", { name: /Envoyer à Home Assistant/ }).click();
  await page.getByText(/envoyés? à Home Assistant/).waitFor();
  if (added.length < 3) throw new Error(`seulement ${added.length} article(s) envoyé(s)`);
  await page.getByRole("button", { name: "Envoyer la liste" }).click();
  await page.getByRole("button", { name: /Importer depuis Home Assistant/ }).click();
  await page.getByText(/banane.* : ajouté/i).first().waitFor();
  console.log(`  envoyés : ${added.length}, importé : Bananes`);
});

await step("placard et frigo", async () => {
  await page.goto(`${base}#/courses`);
  await page.getByRole("button", { name: "Placard et frigo" }).click();
  await page.getByRole("heading", { name: /Placard/ }).first().waitFor();
  await shot(page, "5-placard");
});

await step("scanner un produit (Open Food Facts simulé) → placard", async () => {
  await page.route("https://world.openfoodfacts.org/**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({
        status: 1,
        code: "3560070000000",
        product: { product_name_fr: "Lentilles vertes", brands: "Bio Village", quantity: "500 g", nutriscore_grade: "a", nova_group: 1, additives_tags: [], allergens_tags: [], ingredients_text_fr: "Lentilles vertes" },
      }),
    }),
  );
  await page.evaluate("window.__mijoteFakeBarcode = '3560070000000'");
  await page.getByRole("button", { name: "Scanner un produit" }).first().click();
  await page.getByText("Lentilles vertes").first().waitFor();
  await shot(page, "5b-scan");
  await page.getByRole("button", { name: /^Ajouter au (placard|frigo|congélateur)$/ }).click();
  await page.getByText(/rangé au/).first().waitFor();
});

await step("impressions frigo et courses", async () => {
  await page.goto(`${base}#/semaine/imprimer`);
  await page.getByText("Tableau frigo").first().waitFor();
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: `${out}flow-frigo.pdf`, landscape: true, format: "A4", printBackground: true }).catch(() => undefined);
  await page.emulateMedia({ media: "screen" });
  await page.goto(`${base}#/courses/imprimer`);
  await page.getByText("Supermarché").first().waitFor();
});

await step("bibliothèque, nouveautés (démo) et fiche recette", async () => {
  await page.goto(`${base}#/recettes`);
  await page.getByRole("button", { name: "Nouvelle recette" }).click();
  await page.getByRole("button", { name: /Idées de saison/ }).click();
  await page.getByRole("button", { name: "Garder" }).first().click({ timeout: 10000 });
  await page.keyboard.press("Escape");
  await page.locator("main .grid.gap-3 > div > button").first().click();
  await page.getByText("Pour bébé").waitFor();
  await shot(page, "6-fiche");
});

await step("Claude (API simulée) : relier, idées de dîners, garder", async () => {
  const seed = (JSON.parse(readFileSync(new URL("../content/recipes/dinner.json", import.meta.url), "utf8")) as Record<string, any>[])[0];
  // Brouillon au format demandé à Claude, à partir d'une recette du seed (qui passe le linter bébé).
  const draft = {
    title: `${seed.title} (Claude)`,
    description: seed.description ?? "",
    slots: ["dinner"],
    prepMinutes: seed.prepMinutes,
    cookMinutes: seed.cookMinutes,
    longCook: !!seed.longCook,
    yieldsLeftovers: !!seed.yieldsLeftovers,
    servingsBase: seed.servingsBase,
    ingredients: seed.ingredients.map((i: Record<string, any>) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit, note: i.note ?? null, form: i.form ?? null, adultOnly: !!i.adultOnly })),
    newIngredients: [],
    steps: seed.steps,
    babyAdaptation: { ...seed.babyAdaptation, notes: seed.babyAdaptation.notes ?? null },
    ironScore: seed.ironScore,
    mainProtein: seed.mainProtein,
    tags: seed.tags ?? [],
    illustration: seed.illustration,
  };
  let body: Record<string, any> = {};
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
  await page.route("https://api.anthropic.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    body = JSON.parse(req.postData() ?? "{}");
    // Photo du frigo : inventaire ; sinon, des recettes.
    const fridge = JSON.stringify(body.system ?? "").includes("inventaire");
    const answer = fridge ? { items: [{ name: "yaourt nature", ingredientId: null, location: "frigo", qty: 4, unit: "piece" }, { name: "carotte", ingredientId: "carotte", location: "frigo", qty: null, unit: null }] } : { recipes: [draft] };
    await route.fulfill({
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: body.model,
        content: [{ type: "text", text: JSON.stringify(answer) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
    });
  });
  await page.goto(`${base}#/reglages`);
  await page.getByRole("button", { name: /Claude \(IA\)/ }).click();
  await page.getByRole("dialog").getByLabel("Clé API Anthropic").fill("sk-ant-test");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await page.goto(`${base}#/recettes`);
  await page.getByRole("button", { name: "Nouvelle recette" }).click();
  await page.getByRole("button", { name: /Idées de saison/ }).click();
  await page.getByRole("button", { name: "Dîners" }).click();
  await page.getByText(draft.title).first().waitFor();
  await shot(page, "7-claude");
  await page.getByRole("button", { name: "Garder" }).first().click();
  await page.getByText(/ajoutée à tes recettes/).waitFor();
  if (body.model !== "claude-opus-5-5") throw new Error(`modèle : ${body.model}`);
  if (body.fallbacks !== "default" || !body.output_config?.format) throw new Error("requête sans repli ou sans format structuré");
});

await step("« Autre recette… » : avec ce que j'ai, puis une idée de Claude", async () => {
  await page.goto(`${base}#/semaine`);
  const tile = page.getByRole("region", { name: "Jeudi" }).locator("button[aria-label^='Soir']");
  await tile.evaluate("(el) => el.scrollIntoView({ block: 'center' })");
  await tile.click();
  await page.getByRole("button", { name: "Autre recette…" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Avec ce que j'ai" }).click();
  await dialog.getByText(/^Avec ce que j'ai · \d+/).waitFor();
  await dialog.getByRole("button", { name: "Idées de Claude" }).click();
  await dialog.locator("[cmdk-group]", { hasText: "Proposées par Claude" }).locator("[cmdk-item]").first().click();
  await dialog.waitFor({ state: "detached" });
  await page.waitForFunction("[...document.querySelectorAll('button[aria-label]')].some((b) => b.getAttribute('aria-label').includes('(Claude)'))");
});

await step("photo du frigo (Claude simulé) → placard", async () => {
  await page.goto(`${base}#/placard`);
  // Une image PNG de 1 × 1 pixel suffit : la réponse est simulée.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
  await page.locator("input[type=file][capture]").setInputFiles({ name: "frigo.png", mimeType: "image/png", buffer: png });
  await page.getByText("yaourt nature").waitFor();
  await page.getByRole("button", { name: /Ranger 2 produits/ }).click();
  await page.getByText("2 produits rangés").waitFor();
});

await step("aucune erreur JavaScript", async () => {
  if (errors.length) throw new Error(errors.join(" | "));
});

await browser.close();
console.log(failures ? `\n${failures} étape(s) en échec` : "\nParcours complet ✓");
process.exit(failures ? 1 : 0);
