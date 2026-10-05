// Serveur du foyer, de bout en bout : deux téléphones (Playwright), un faux Home Assistant, le vrai serveur.
// Rejoindre le foyer → coché sur l'un, coché sur l'autre en direct → hors ligne puis rattrapage → liste dictée dans HA.
// Usage : npm run build:web:server && npm run build:server, puis npm run test:e2e:server
// (WEB_DIR=… pour un autre build du front, construit avec BASE_PATH=/).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, devices, type Page } from "playwright";

const root = new URL("..", import.meta.url).pathname;
const webDir = process.env.WEB_DIR ?? join(root, "apps/web/dist-server");
if (!existsSync(join(webDir, "index.html"))) throw new Error(`Front introuvable dans ${webDir} : lance npm run build:web:server`);
const executablePath = process.env.CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const PASS = "soupe-de-courge";

// ——— Faux Home Assistant : une liste « À faire » en mémoire ———
type Todo = { uid: string; summary: string; status: "needs_action" | "completed"; description?: string };
const todos: Todo[] = [];
let n = 0;
const ha = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : {};
    const send = (data: unknown) => (res.writeHead(200, { "Content-Type": "application/json" }), res.end(JSON.stringify(data)));
    if (req.headers.authorization !== "Bearer jeton") return (res.writeHead(401), res.end());
    if (req.url === "/api/") return send({ message: "API running." });
    if (req.url === "/api/services/todo/get_items?return_response") return send({ service_response: { [body.entity_id]: { items: todos } } });
    if (req.url?.startsWith("/api/services/todo/add_item")) todos.push({ uid: `u${n++}`, summary: body.item, status: "needs_action", ...(body.description ? { description: body.description } : {}) });
    if (req.url?.startsWith("/api/services/todo/update_item")) {
      const t = todos.find((x) => x.uid === body.item || x.summary === body.item);
      if (t) Object.assign(t, body.status ? { status: body.status } : {}, body.rename ? { summary: body.rename } : {});
    }
    if (req.url?.startsWith("/api/services/todo/remove_item")) for (const uid of [body.item].flat()) todos.splice(todos.findIndex((x) => x.uid === uid), 1);
    send([]);
  });
});
await new Promise<void>((r) => ha.listen(8124, r));

// ——— Le serveur du foyer, sur une base neuve ———
const dataDir = mkdtempSync(join(tmpdir(), "mijote-e2e-"));
const port = 8091;
const base = `http://localhost:${port}/`;
if (await fetch(`${base}api/health`).then(() => true, () => false)) throw new Error(`Le port ${port} est déjà pris (un serveur d'un essai précédent ?)`);
// Un seul processus (pas de npx) : il s'arrête bien à la fin.
const server = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
  cwd: join(root, "apps/server"),
  env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, WEB_DIR: webDir, HOUSEHOLD_PASSPHRASE: PASS, HA_URL: "http://localhost:8124", HA_TOKEN: "jeton", HA_TODO_ENTITY: "todo.courses", HA_SYNC_SECONDS: "2" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
for (let i = 0; ; i++) {
  if (await fetch(`${base}api/health`).then((r) => r.ok).catch(() => false)) break;
  if (i > 60) throw new Error(`Le serveur ne démarre pas :\n${serverLog}`);
  await new Promise((r) => setTimeout(r, 250));
}

let failures = 0;
const browser = await chromium.launch({ executablePath });
const phone = async (name: string) => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => console.error(`  [${name}] erreur :`, e.message));
  return { ctx, page };
};
const a = await phone("Tom");
const b = await phone("Marie");
const step = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    await a.page.screenshot({ path: join(dataDir, `fail-${failures}-a.png`) }).catch(() => undefined);
    await b.page.screenshot({ path: join(dataDir, `fail-${failures}-b.png`) }).catch(() => undefined);
    console.error(`✗ ${name}\n  ${(e as Error).message.split("\n")[0]}`);
  }
};
const items = (p: Page) => p.locator("ul li button[aria-pressed]");
const until = async (what: string, fn: () => boolean | Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`délai dépassé : ${what}`);
};

await step("sans session : « Rejoindre le foyer », mauvaise phrase refusée", async () => {
  await a.page.goto(`${base}#/courses`);
  await a.page.getByRole("button", { name: "Rejoindre le foyer" }).waitFor();
  await a.page.getByLabel("Phrase secrète du foyer").fill("pas la bonne");
  await a.page.getByRole("button", { name: "Rejoindre le foyer" }).click();
  await a.page.getByRole("alert").getByText("Phrase secrète incorrecte").waitFor();
  await a.page.screenshot({ path: join(root, "design/screens/server-rejoindre.png") });
});

await step("deux téléphones rejoignent le foyer", async () => {
  for (const [p, name] of [
    [a.page, "Tom"],
    [b.page, "Marie"],
  ] as const) {
    if (p === b.page) await p.goto(`${base}#/courses`);
    await p.getByLabel("Phrase secrète du foyer").fill(PASS);
    await p.getByLabel("Ton prénom").fill(name);
    await p.getByRole("button", { name: "Rejoindre le foyer" }).click();
    await p.getByRole("tab", { name: /Marché/ }).waitFor();
  }
  await a.page.screenshot({ path: join(root, "design/screens/server-courses.png") });
});

await step("coché chez Tom → coché chez Marie en moins de 2 s (direct)", async () => {
  const first = items(a.page).first();
  const label = (await first.innerText()).split("\n")[0];
  await first.click();
  const t = Date.now();
  await b.page.locator("ul li button[aria-pressed='true']").filter({ hasText: label }).first().waitFor({ timeout: 2000 });
  console.log(`  « ${label} » chez Marie en ${Date.now() - t} ms`);
  await b.page.getByText(/par Tom/).first().waitFor();
});

await step("Tom hors ligne : 3 coches gardées, envoyées au retour du réseau", async () => {
  await a.ctx.setOffline(true);
  const labels: string[] = [];
  for (let i = 0; i < 3; i++) {
    const it = a.page.locator("ul li button[aria-pressed='false']").first();
    labels.push((await it.innerText()).split("\n")[0]);
    await it.click();
  }
  await a.page.waitForTimeout(500);
  const checkedB = await b.page.locator("ul li button[aria-pressed='true']").count();
  if (checkedB !== 1) throw new Error(`Marie voit déjà ${checkedB} coches`);
  await a.ctx.setOffline(false);
  await a.page.evaluate("window.dispatchEvent(new Event('online'))");
  await until("les 4 coches chez Marie", async () => (await b.page.locator("ul li button[aria-pressed='true']").count()) === 4, 8000);
});

await step("même liste dans Home Assistant, coches comprises", async () => {
  await until("liste envoyée à HA", async () => todos.length > 0 && todos.filter((t) => t.status === "completed").length === 4, 10000);
  const shown = await items(a.page).count();
  if (todos.length < shown) throw new Error(`${todos.length} articles dans HA pour ${shown} affichés`);
});

await step("dicté à Gemini (ajouté dans HA) → sur les deux téléphones", async () => {
  todos.push({ uid: "voix", summary: "Piles AA", status: "needs_action" });
  for (const p of [a.page, b.page]) {
    await p.getByRole("tab", { name: /Supermarché/ }).click();
    await p.getByText("Piles AA").first().waitFor({ timeout: 10000 });
  }
});

await step("coché dans HA → coché sur les téléphones ; coché sur un téléphone → terminé dans HA", async () => {
  todos.find((t) => t.uid === "voix")!.status = "completed";
  await b.page.locator("ul li button[aria-pressed='true']").filter({ hasText: "Piles AA" }).waitFor({ timeout: 10000 });
  const it = b.page.locator("ul li button[aria-pressed='false']").first();
  const label = (await it.innerText()).split("\n")[0];
  await it.click();
  await until(`« ${label} » terminé dans HA`, () => todos.filter((t) => t.status === "completed").length === 6, 10000);
});

await step("réglages : serveur connecté, 2 appareils, HA relié", async () => {
  await a.page.goto(`${base}#/reglages`);
  await a.page.getByRole("button", { name: /Serveur du foyer/ }).click();
  await a.page.getByText(/Connecté · 2 appareils/).waitFor();
  await a.page.getByText("Marie").waitFor();
  await a.page.screenshot({ path: join(root, "design/screens/server-membres.png") });
  await a.page.keyboard.press("Escape");
  await a.page.getByRole("button", { name: /Home Assistant/ }).click();
  await a.page.getByRole("button", { name: "Tester la connexion" }).click();
  await a.page.getByText(/Home Assistant répond/).waitFor();
});

await step("rechargé : l'état vient du serveur", async () => {
  await b.page.reload();
  await b.page.getByRole("tab", { name: /Marché/ }).first().click();
  await until("4 coches au marché après rechargement", async () => (await b.page.locator("ul li button[aria-pressed='true']").count()) === 4);
  await b.page.getByRole("tab", { name: /Supermarché/ }).click();
  await until("2 coches au supermarché après rechargement", async () => (await b.page.locator("ul li button[aria-pressed='true']").count()) === 2);
});

await browser.close();
server.kill("SIGTERM");
ha.close();
if (!failures) rmSync(dataDir, { recursive: true, force: true });
else console.error(`Captures et base : ${dataDir}`);
console.log(failures ? `${failures} étape(s) en échec` : "Serveur du foyer ✓");
process.exit(failures ? 1 : 0);
