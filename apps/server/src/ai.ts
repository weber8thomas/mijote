import type { Hono } from "hono";
import type { Env } from "./app";
import type { Household } from "./household";

// Claude côté serveur : la clé reste sur le serveur. Les routes /api/ai/* arrivent à l'étape 5.

export function aiRoutes(_household: Household, _settings: { apiKey: string; model: string; dailyLimit: number }) {
  void _household;
  void _settings;
  return {
    route(app: Hono<Env>) {
      app.get("/api/ai/status", (c) => c.json({ enabled: true }));
    },
  };
}
