import { haItemId, ingredientsOfState, itemLine, reconcileTodo, shoppingWeekOf, type SyncLocalItem, type SyncMemory } from "@mijote/shared";
import { addItemMarked, getItems, HaError, removeItems, testConnection, updateItem, type HaConfig } from "@mijote/shared/ha-client";
import { randomUUID } from "node:crypto";
import type { Household } from "./household";

// Synchro de la liste de courses avec une liste « À faire » de Home Assistant, faite par le serveur :
// elle tourne même quand les téléphones sont fermés. Une liste Google Keep (intégration HACS Google Keep Sync)
// marche aussi : Gemini et l'Assistant Google y écrivent, Mijoté retrouve les articles par leur texte.

type Settings = { url: string; token: string; entity: string; intervalMs: number };
export type HaStatus = { enabled: true; entity: string; lastSync?: string; lastError?: string; busy: boolean; items?: number; descriptions?: boolean };

const MEMORY = "ha-sync";
const CLIENT = "home-assistant";

export function startHaSync(household: Household, settings: Settings, { autoStart = true } = {}) {
  const cfg: HaConfig = { url: settings.url, token: settings.token, entity: settings.entity, autoSync: true };
  const status: HaStatus = { enabled: true, entity: settings.entity, busy: false };
  let running: Promise<void> | null = null;
  let again = false;
  let timer: NodeJS.Timeout | undefined;

  async function once() {
    const remote = await getItems(cfg);
    status.items = remote.length;
    status.descriptions = remote.some((t) => !!t.description);
    const { state } = household.snapshot();
    const now = new Date();
    const weekStart = shoppingWeekOf(state, now);
    const byId = ingredientsOfState(state).byId;
    const local: SyncLocalItem[] = (state.shopping[weekStart] ?? []).map((it) => ({ id: it.id, line: itemLine(it, byId), checked: it.checked, haveAlready: it.haveAlready, manual: it.manual, updatedAt: it.updatedAt }));
    const memory = household.getMeta<SyncMemory>(MEMORY);
    const plan = reconcileTodo({ weekStart, local, remote, memory });

    // D'abord Home Assistant (en cas d'échec, rien n'est changé ici et on réessaie), puis le foyer.
    const removed = plan.remote.flatMap((o) => (o.op === "remove" ? [o.uid] : []));
    if (removed.length) await removeItems(cfg, removed);
    for (const op of plan.remote) {
      if (op.op === "add") await addItemMarked(cfg, op.summary, op.description);
      if (op.op === "update") await updateItem(cfg, op.uid, { status: op.status, rename: op.rename });
    }
    const changes = plan.local.map((c) => (c.kind === "create" ? { ...c, id: haItemId(weekStart, c.uid) } : c));
    if (changes.length) household.apply([{ actionId: `ha:${randomUUID()}`, action: { type: "haChanges", weekStart, changes, at: now.toISOString() } }], CLIENT);

    // Mémoire : ce qu'on vient d'accorder, plus les articles dictés créés à l'instant.
    const synced = { ...plan.synced };
    const after = household.snapshot().state;
    for (const c of changes) {
      if (c.kind !== "create") continue;
      const it = after.shopping[weekStart]?.find((i) => i.id === c.id);
      // Mémorisé avec le texte Mijoté : le texte dicté, différent, compte comme « renommé dans HA » et n'est jamais écrasé.
      if (it) synced[it.id] = { uid: c.uid, status: c.done ? "completed" : "needs_action", summary: itemLine(it, byId) };
    }
    household.setMeta(MEMORY, { weekStart, lastSync: now.toISOString(), synced } satisfies SyncMemory);
    status.lastSync = now.toISOString();
    status.lastError = undefined;
    // Les articles ajoutés n'ont pas encore d'uid : une 2e passe les retrouve (et passe « terminé » ceux déjà cochés).
    if (plan.remote.some((o) => o.op === "add")) again = true;
  }

  function sync(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    status.busy = true;
    running = (async () => {
      let rounds = 0;
      do {
        again = false;
        try {
          await once();
        } catch (e) {
          status.lastError = e instanceof HaError ? e.message : e instanceof Error ? e.message : String(e);
          again = false;
        }
      } while (again && ++rounds < 3);
    })().finally(() => {
      running = null;
      status.busy = false;
    });
    return running;
  }

  /** Après un changement de la liste : synchro une seconde plus tard (les coches rapides sont regroupées). */
  let pending: NodeJS.Timeout | undefined;
  const kick = () => {
    clearTimeout(pending);
    pending = setTimeout(() => void sync(), 1000);
  };

  if (autoStart) {
    void sync();
    timer = setInterval(() => void sync(), settings.intervalMs);
    timer.unref();
  }

  return {
    status: () => ({ ...status }),
    kick,
    sync,
    /** Diagnostic pour les réglages : HA répond-il, la liste existe-t-elle, gère-t-elle les descriptions ? */
    async check() {
      try {
        const items = await testConnection(cfg);
        return { enabled: true, ok: true, entity: cfg.entity, items, descriptions: status.descriptions ?? null, lastSync: status.lastSync, lastError: status.lastError };
      } catch (e) {
        return { enabled: true, ok: false, entity: cfg.entity, error: e instanceof Error ? e.message : String(e) };
      }
    },
    stop: () => {
      clearInterval(timer);
      clearTimeout(pending);
    },
  };
}
