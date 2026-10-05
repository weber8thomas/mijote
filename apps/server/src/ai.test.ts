import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiRoutes } from "./ai";
import { createApp } from "./app";
import type { Config } from "./config";
import { openDb } from "./db";
import { Household } from "./household";

// oxlint-disable-next-line no-explicit-any
type Json = any;
const body = async (r: Response | Promise<Response>): Promise<Json> => (await r).json();

// Brouillon au format demandé à Claude, à partir d'une recette du seed (qui passe le linter bébé).
const seed = (JSON.parse(readFileSync(new URL("../../../content/recipes/dinner.json", import.meta.url), "utf8")) as Json[])[0];
const draft = {
  title: `${seed.title} (Claude)`,
  description: seed.description ?? "",
  slots: ["dinner"],
  prepMinutes: seed.prepMinutes,
  cookMinutes: seed.cookMinutes,
  longCook: !!seed.longCook,
  yieldsLeftovers: !!seed.yieldsLeftovers,
  servingsBase: seed.servingsBase,
  ingredients: seed.ingredients.map((i: Json) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit, note: i.note ?? null, form: i.form ?? null, adultOnly: !!i.adultOnly })),
  newIngredients: [],
  steps: seed.steps,
  babyAdaptation: { ...seed.babyAdaptation, notes: seed.babyAdaptation.notes ?? null },
  ironScore: seed.ironScore,
  mainProtein: seed.mainProtein,
  tags: seed.tags ?? [],
  illustration: seed.illustration,
};

/** Faux Anthropic : répond des recettes, ou refuse la clé. */
function fakeAnthropic(status = 200) {
  const requests: Json[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url instanceof Request ? url.url : url)).toContain("api.anthropic.com");
      const req = JSON.parse(String(init?.body ?? "{}"));
      requests.push({ ...req, key: new Headers(init?.headers).get("x-api-key") });
      if (status !== 200) return new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), { status, headers: { "Content-Type": "application/json" } });
      const answer = { recipes: [draft] };
      return new Response(JSON.stringify({ id: "msg", type: "message", role: "assistant", model: req.model, content: [{ type: "text", text: JSON.stringify(answer) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return requests;
}

afterEach(() => vi.unstubAllGlobals());

const config: Config = { port: 0, dataDir: ":memory:", passphrase: "soupe-de-courge" };

async function setup(withAi = true, dailyLimit = 2) {
  const db = openDb(":memory:");
  const household = new Household(db, () => new Date("2026-10-05T09:00:00"));
  const ai = withAi ? aiRoutes(household, { apiKey: "sk-serveur", model: "claude-opus-5-5", dailyLimit }) : undefined;
  const app = createApp({ db, household, config, services: { ai } });
  const res = await app.request("/api/auth/join", { method: "POST", body: JSON.stringify({ passphrase: "soupe-de-courge", displayName: "Tom" }), headers: { "Content-Type": "application/json" } });
  const cookie = res.headers.get("set-cookie")!.split(";")[0];
  const post = (path: string, data: unknown) => app.request(`/api/ai/${path}`, { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const get = (path: string) => app.request(path, { headers: { cookie } });
  return { app, post, get };
}

const ctx = { month: "octobre", seasonal: ["courge"], favorites: [], excluded: [], slot: "dinner", count: 2 };

describe("Claude côté serveur", () => {
  it("idées : la clé du serveur, recettes vérifiées par le linter bébé", async () => {
    const requests = fakeAnthropic();
    const { post, get } = await setup();
    const res = await post("ideas", { ctx });
    expect(res.status).toBe(200);
    const { recipes } = await body(res);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].recipe.title).toBe(draft.title);
    expect(recipes[0].recipe.source).toBe("ai");
    expect(requests[0].key).toBe("sk-serveur");
    expect(requests[0].model).toBe("claude-opus-5-5");
    expect((await body(get("/api/ai/status"))).used).toBe(1);
  });

  it("limite du jour pour tout le foyer", async () => {
    fakeAnthropic();
    const { post } = await setup(true, 1);
    expect((await post("ideas", { ctx })).status).toBe(200);
    const again = await post("ideas", { ctx });
    expect(again.status).toBe(429);
    expect((await body(again)).error).toMatch(/Limite du jour/);
  });

  it("clé refusée : message pour le .env, pas pour le téléphone", async () => {
    fakeAnthropic(401);
    const { post } = await setup();
    const res = await post("inventory", { have: ["courge", "lentilles"], month: "octobre" });
    expect(res.status).toBe(502);
    expect((await body(res)).error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("demandes invalides refusées sans appel", async () => {
    const requests = fakeAnthropic();
    const { post } = await setup();
    expect((await post("url", { url: "javascript:alert(1)" })).status).toBe(400);
    expect((await post("photo", { image: { mediaType: "text/html", data: "x" } })).status).toBe(400);
    expect(requests).toHaveLength(0);
  });

  it("sans clé sur le serveur : désactivé", async () => {
    const { get } = await setup(false);
    expect(await body(get("/api/ai/status"))).toEqual({ enabled: false });
    expect((await body(get("/api/health"))).ai).toBe(false);
  });
});
