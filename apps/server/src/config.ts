// Réglages du serveur, lus dans l'environnement (voir .env.example).

export type Config = {
  port: number;
  /** Dossier des données : mijote.sqlite et backups/. */
  dataDir: string;
  /** Build du front à servir (apps/web/dist), même origine que l'API. */
  webDir?: string;
  /** Phrase secrète du foyer, demandée une fois sur chaque téléphone. */
  passphrase: string;
  /** Adresse publique (https://mijote.mondomaine.fr) : cookies sécurisés. */
  publicUrl?: string;
  ha?: { url: string; token: string; entity: string; intervalMs: number };
  ai?: { apiKey: string; model: string; dailyLimit: number };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const passphrase = env.HOUSEHOLD_PASSPHRASE?.trim();
  if (!passphrase || passphrase.length < 8) throw new Error("HOUSEHOLD_PASSPHRASE manquante ou trop courte (8 caractères au moins).");
  const ha = env.HA_URL && env.HA_TOKEN ? { url: env.HA_URL, token: env.HA_TOKEN, entity: env.HA_TODO_ENTITY || "todo.mijote_courses", intervalMs: Number(env.HA_SYNC_SECONDS || 30) * 1000 } : undefined;
  const ai = env.ANTHROPIC_API_KEY ? { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || "claude-opus-5-5", dailyLimit: Number(env.AI_DAILY_LIMIT || 20) } : undefined;
  return {
    port: Number(env.PORT || 8080),
    dataDir: env.DATA_DIR || "./data",
    webDir: env.WEB_DIR || undefined,
    passphrase,
    publicUrl: env.PUBLIC_URL || undefined,
    ha,
    ai,
  };
}
