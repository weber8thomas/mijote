import { applyAction, initialHousehold, isAction, type Action, type HouseholdState } from "@mijote/shared";
import { eq, lt } from "drizzle-orm";
import { actionLog, householdState, meta, type Db } from "./db";

// L'état du foyer côté serveur : chargé une fois, gardé en mémoire, écrit à chaque lot d'actions.
// Les actions sont appliquées dans l'ordre d'arrivée, numérotées (version) et diffusées aux téléphones.

export type Envelope = { actionId: string; action: Action };
export type Applied = { version: number; actionId: string; clientId: string; action: Action };
type Listener = (applied: Applied[]) => void;

export class Household {
  private state: HouseholdState;
  private version: number;
  private readonly listeners = new Set<Listener>();
  private readonly db: Db;

  constructor(db: Db, now: () => Date = () => new Date()) {
    this.db = db;
    const row = db.orm.select().from(householdState).where(eq(householdState.id, 1)).get();
    if (row) {
      this.state = JSON.parse(row.json) as HouseholdState;
      this.version = row.version;
    } else {
      this.state = initialHousehold(now());
      this.version = 0;
      db.orm.insert(householdState).values({ id: 1, version: 0, json: JSON.stringify(this.state), updatedAt: now().toISOString() }).run();
    }
  }

  snapshot() {
    return { version: this.version, state: this.state };
  }

  /**
   * Applique un lot d'actions d'un appareil, dans une transaction. Une action déjà reçue (même actionId) est ignorée :
   * un téléphone peut renvoyer sa file sans risque après une coupure.
   */
  apply(batch: Envelope[], clientId: string, memberId?: string): { version: number; applied: Applied[] } {
    const applied: Applied[] = [];
    let state = this.state;
    let version = this.version;
    const seen = this.db.sqlite.prepare("SELECT 1 FROM action_log WHERE action_id = ?");
    const tx = this.db.sqlite.transaction(() => {
      for (const { actionId, action } of batch) {
        if (typeof actionId !== "string" || !actionId || !isAction(action)) throw new BadAction(`Action invalide : ${JSON.stringify(action)?.slice(0, 120)}`);
        if (seen.get(actionId) || applied.some((a) => a.actionId === actionId)) continue;
        state = applyAction(state, action);
        version += 1;
        applied.push({ version, actionId, clientId, action });
        this.db.orm
          .insert(actionLog)
          .values({ version, actionId, clientId, memberId: memberId ?? null, type: action.type, payload: JSON.stringify(action), at: new Date().toISOString() })
          .run();
      }
      if (applied.length) this.db.orm.update(householdState).set({ version, json: JSON.stringify(state), updatedAt: new Date().toISOString() }).where(eq(householdState.id, 1)).run();
    });
    tx();
    if (applied.length) {
      this.state = state;
      this.version = version;
      for (const l of this.listeners) l(applied);
    }
    return { version: this.version, applied };
  }

  /** Actions appliquées après une version (rattrapage d'un téléphone qui revient). */
  since(version: number): Applied[] | undefined {
    const rows = this.db.sqlite.prepare("SELECT version, action_id, client_id, payload FROM action_log WHERE version > ? ORDER BY version").all(version) as {
      version: number;
      action_id: string;
      client_id: string;
      payload: string;
    }[];
    // Journal purgé entre-temps : le téléphone recharge l'état complet.
    if (version < this.version && (!rows.length || rows[0].version !== version + 1)) return undefined;
    return rows.map((r) => ({ version: r.version, actionId: r.action_id, clientId: r.client_id, action: JSON.parse(r.payload) as Action }));
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }

  /** Garde 30 jours de journal. */
  prune(now = new Date()) {
    const limit = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    this.db.orm.delete(actionLog).where(lt(actionLog.at, limit)).run();
  }

  getMeta<T>(key: string): T | undefined {
    const row = this.db.orm.select().from(meta).where(eq(meta.key, key)).get();
    return row ? (JSON.parse(row.value) as T) : undefined;
  }

  setMeta(key: string, value: unknown) {
    this.db.orm
      .insert(meta)
      .values({ key, value: JSON.stringify(value) })
      .onConflictDoUpdate({ target: meta.key, set: { value: JSON.stringify(value) } })
      .run();
  }
}

export class BadAction extends Error {}
