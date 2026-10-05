// Liaison avec une liste « À faire » de Home Assistant (API REST, services todo.*).
// Home Assistant relaie ensuite vers Assist, Google Assistant, Gemini ou Google Keep selon sa configuration.
// L'appel part du navigateur : HA doit autoriser l'adresse de Mijoté (http: cors_allowed_origins)
// et être joignable en HTTPS (Mijoté est servi en HTTPS).

export type HaConfig = { url: string; token: string; entity: string; autoSync?: boolean };
export type HaItem = { summary: string; uid: string; status: "needs_action" | "completed"; description?: string | null };

export class HaError extends Error {
  readonly kind: "network" | "auth" | "entity" | "other";
  constructor(message: string, kind: HaError["kind"]) {
    super(message);
    this.kind = kind;
  }
}

const clean = (url: string) => url.trim().replace(/\/+$/, "");

async function call<T>(cfg: HaConfig, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${clean(cfg.url)}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${cfg.token.trim()}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const cause = e instanceof Error ? ` (${e.message})` : "";
    throw new HaError(`Home Assistant ne répond pas. Vérifie l'adresse (en https) et l'autorisation CORS.${cause}`, "network");
  }
  if (res.status === 401 || res.status === 403) throw new HaError("Jeton refusé par Home Assistant.", "auth");
  if (res.status === 400 || res.status === 404) throw new HaError(`Liste introuvable : ${cfg.entity}.`, "entity");
  if (!res.ok) throw new HaError(`Home Assistant a répondu ${res.status}.`, "other");
  return (await res.json()) as T;
}

/** Récupère les articles de la liste (service à réponse : todo.get_items). */
export async function getItems(cfg: HaConfig): Promise<HaItem[]> {
  const data = await call<{ service_response?: Record<string, { items?: HaItem[] }> }>(cfg, "/api/services/todo/get_items?return_response", { entity_id: cfg.entity });
  return data.service_response?.[cfg.entity]?.items ?? [];
}

/** Vérifie l'adresse, le jeton et la liste. Renvoie le nombre d'articles de la liste. */
export async function testConnection(cfg: HaConfig): Promise<number> {
  await call(cfg, "/api/");
  return (await getItems(cfg)).length;
}

export const addItem = (cfg: HaConfig, summary: string) => call(cfg, "/api/services/todo/add_item", { entity_id: cfg.entity, item: summary });

export const setDone = (cfg: HaConfig, summary: string, done: boolean) =>
  call(cfg, "/api/services/todo/update_item", { entity_id: cfg.entity, item: summary, status: done ? "completed" : "needs_action" });

/** Envoie les articles qui ne sont pas déjà dans la liste HA (comparaison sans casse). Renvoie le nombre envoyé. */
export async function pushItems(cfg: HaConfig, summaries: string[]): Promise<number> {
  const existing = new Set((await getItems(cfg)).filter((i) => i.status === "needs_action").map((i) => i.summary.toLowerCase()));
  const todo = summaries.filter((s) => !existing.has(s.toLowerCase()));
  for (const s of todo) await addItem(cfg, s);
  return todo.length;
}

/** Articles à faire dans HA qui ne sont pas encore dans Mijoté (ajoutés par la voix, par exemple). */
export async function pullNewItems(cfg: HaConfig, known: string[]): Promise<string[]> {
  const have = new Set(known.map((s) => s.toLowerCase()));
  return (await getItems(cfg)).filter((i) => i.status === "needs_action" && !have.has(i.summary.toLowerCase())).map((i) => i.summary);
}

/** Ajoute un article avec une description (marqueur Mijoté). Une liste qui ne gère pas les descriptions
 * (l'intégration « Liste de courses » historique, Google Keep Sync) refuse le champ : HA répond 400, ou 500
 * quand l'API REST ne traduit pas l'erreur de validation. On réessaie sans, sauf si le jeton ou le réseau est en cause. */
export async function addItemMarked(cfg: HaConfig, summary: string, description: string) {
  try {
    await call(cfg, "/api/services/todo/add_item", { entity_id: cfg.entity, item: summary, description });
  } catch (e) {
    if (e instanceof HaError && (e.kind === "entity" || e.kind === "other")) await addItem(cfg, summary);
    else throw e;
  }
}

/** Change le statut ou le texte d'un article (désigné par son uid). */
export const updateItem = (cfg: HaConfig, uid: string, patch: { status?: HaItem["status"]; rename?: string }) =>
  call(cfg, "/api/services/todo/update_item", { entity_id: cfg.entity, item: uid, ...patch });

export const removeItems = (cfg: HaConfig, uids: string[]) => call(cfg, "/api/services/todo/remove_item", { entity_id: cfg.entity, item: uids });
