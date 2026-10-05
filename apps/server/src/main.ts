import { serve } from "@hono/node-server";
import { createApp, type Services } from "./app";
import { backupNow } from "./backup";
import { loadConfig } from "./config";
import { openDb } from "./db";
import { Household } from "./household";

// Démarrage du serveur du foyer : base, état, synchro Home Assistant, Claude, sauvegardes.

const config = loadConfig();
const db = openDb(config.dataDir);
const household = new Household(db);
const services: Services = {};

if (config.ha) {
  const { startHaSync } = await import("./ha");
  services.ha = startHaSync(household, config.ha);
}
if (config.ai) {
  const { aiRoutes } = await import("./ai");
  services.ai = aiRoutes(household, config.ai);
}

const app = createApp({ db, household, config, services });

// Sauvegarde au démarrage puis chaque jour ; journal des actions gardé 30 jours.
const daily = () => {
  try {
    const file = backupNow(db, config.dataDir);
    household.prune();
    console.log(`Sauvegarde : ${file}`);
  } catch (e) {
    console.error("Sauvegarde impossible", e);
  }
};
if (config.dataDir !== ":memory:") {
  daily();
  setInterval(daily, 86_400_000).unref();
}

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`Mijoté écoute sur le port ${port} (données : ${db.file}${config.webDir ? `, front : ${config.webDir}` : ""}${config.ha ? `, Home Assistant : ${config.ha.entity}` : ""}${config.ai ? `, Claude : ${config.ai.model}` : ""})`);
});

const stop = () => {
  db.sqlite.close();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
