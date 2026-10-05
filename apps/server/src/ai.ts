import { ingredientsOfState } from "@mijote/shared";
import { AiError, fromInventory, fromPhoto, fromUrl, ideas, readFridge, type AiConfig, type IdeasContext, type ImageInput } from "@mijote/shared/ai";
import type { Context, Hono } from "hono";
import type { Env } from "./app";
import type { Household } from "./household";

// Claude côté serveur : la clé reste dans le .env, les téléphones n'en ont pas besoin.
// Mêmes invites et même vérification (lintRecipe) que dans la vitrine ; une limite d'appels par jour pour tout le foyer.

type Settings = { apiKey: string; model: string; dailyLimit: number };
type Usage = { day: string; count: number };

const USAGE = "ai-usage";
const STATUS: Record<AiError["kind"], 400 | 401 | 429 | 422 | 502 | 500> = { auth: 502, rate: 429, refusal: 422, invalid: 422, network: 502, other: 500 };

export function aiRoutes(household: Household, settings: Settings, today = () => new Date().toISOString().slice(0, 10)) {
  const cfg: AiConfig = { apiKey: settings.apiKey, model: settings.model };
  const usage = () => {
    const u = household.getMeta<Usage>(USAGE);
    return u?.day === today() ? u.count : 0;
  };
  const catalog = () => ingredientsOfState(household.snapshot().state).list;

  /** Compte l'appel avant de le faire (un appel raté coûte aussi), refuse au-delà de la limite. */
  async function run<T>(c: Context<Env>, call: () => Promise<T>) {
    const used = usage();
    if (used >= settings.dailyLimit) return c.json({ error: `Limite du jour atteinte (${settings.dailyLimit} demandes). Réessaie demain.`, kind: "rate" }, 429);
    household.setMeta(USAGE, { day: today(), count: used + 1 } satisfies Usage);
    try {
      return c.json(await call());
    } catch (e) {
      const err = e instanceof AiError ? e : new AiError(e instanceof Error ? e.message : String(e), "other");
      // Une clé refusée est un problème du serveur, pas du téléphone : message adapté.
      const message = err.kind === "auth" ? "La clé Claude du serveur est refusée. Vérifie ANTHROPIC_API_KEY dans le .env." : err.message;
      if (err.kind === "other") console.error("Claude :", e);
      return c.json({ error: message, kind: err.kind }, STATUS[err.kind]);
    }
  }

  const json = <T>(c: Context<Env>) => c.req.json<T>().catch(() => ({}) as Partial<T>);
  const isImage = (i: unknown): i is ImageInput => !!i && typeof (i as ImageInput).data === "string" && ["image/jpeg", "image/png", "image/webp"].includes((i as ImageInput).mediaType);
  const bad = (c: Context<Env>, error: string) => c.json({ error, kind: "invalid" }, 400);

  return {
    route(app: Hono<Env>) {
      app.get("/api/ai/status", (c) => c.json({ enabled: true, model: settings.model, used: usage(), limit: settings.dailyLimit }));

      app.post("/api/ai/ideas", async (c) => {
        const { ctx } = await json<{ ctx: IdeasContext }>(c);
        if (!ctx?.month || !Array.isArray(ctx.seasonal)) return bad(c, "Demande incomplète.");
        const safe: IdeasContext = { ...ctx, count: Math.min(6, Math.max(1, ctx.count ?? 4)), favorites: ctx.favorites ?? [], excluded: ctx.excluded ?? [] };
        return run(c, async () => ({ recipes: await ideas(cfg, catalog(), safe) }));
      });

      app.post("/api/ai/inventory", async (c) => {
        const { have, month } = await json<{ have: string[]; month: string }>(c);
        if (!Array.isArray(have) || !have.length || !month) return bad(c, "Rien à la maison ?");
        return run(c, async () => ({ recipes: await fromInventory(cfg, catalog(), have.slice(0, 200).map(String), month) }));
      });

      app.post("/api/ai/url", async (c) => {
        const { url } = await json<{ url: string }>(c);
        if (!url || !/^https?:\/\//i.test(url)) return bad(c, "Lien invalide.");
        return run(c, async () => ({ recipes: await fromUrl(cfg, catalog(), url) }));
      });

      app.post("/api/ai/photo", async (c) => {
        const { image } = await json<{ image: ImageInput }>(c);
        if (!isImage(image)) return bad(c, "Photo illisible.");
        return run(c, async () => ({ recipes: await fromPhoto(cfg, catalog(), image) }));
      });

      app.post("/api/ai/fridge", async (c) => {
        const { image } = await json<{ image: ImageInput }>(c);
        if (!isImage(image)) return bad(c, "Photo illisible.");
        return run(c, async () => ({ items: await readFridge(cfg, catalog(), image) }));
      });
    },
  };
}
