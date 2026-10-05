import { itemLine, reconcileTodo, type SyncLocalItem } from "@mijote/shared";
import { useEffect, useSyncExternalStore } from "react";
import { actions, getState, ingredientsOf, shoppingWeek, subscribe } from "@/data/store";
import { isServerMode } from "@/data/sync";
import { addItemMarked, getItems, HaError, removeItems, updateItem, type HaConfig } from "@/lib/home-assistant";

// La liste « À faire » de Home Assistant est la référence partagée : Assist, Gemini ou Google (via HA),
// l'appli HA et l'autre téléphone y lisent et écrivent. Mijoté s'y synchronise dans les deux sens.

/** Liste partagée active : adresse, jeton, liste, et l'interrupteur « liste partagée » des réglages. */
export const haConfig = (): HaConfig | null => {
  // Avec le serveur du foyer, c'est lui qui synchronise (même téléphones fermés).
  if (isServerMode()) return null;
  const ha = getState().integrations?.ha;
  return ha?.url && ha.token && ha.entity && ha.autoSync ? ha : null;
};

/**
 * Une synchro à la fois sur tout l'appareil : deux onglets ouverts ne doivent pas envoyer les mêmes articles en double.
 * L'onglet suivant attend, puis travaille sur la liste déjà mise à jour (le store suit les autres onglets).
 */
const acrossTabs = (fn: () => Promise<void>) => (typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("mijote-ha-sync", fn) : fn());

let running: Promise<void> | null = null;
let again = false;
let busy = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Une synchro à la fois ; une demande pendant une synchro en relance une juste après. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await acrossTabs(syncOnce);
    } while (again);
  })().finally(() => {
    running = null;
    busy = false;
    notify();
  });
  return running;
}

async function syncOnce() {
  const cfg = haConfig();
  if (!cfg) return;
  busy = true;
  notify();
  const started = new Date().toISOString();
  try {
    const remote = (await getItems(cfg)).map((t) => ({ ...t, uid: t.uid ?? t.summary }));
    const s = getState();
    const weekStart = shoppingWeek(s);
    const byId = ingredientsOf(s).byId;
    const local: SyncLocalItem[] = (s.shopping[weekStart] ?? []).map((it) => ({
      id: it.id,
      line: itemLine(it, byId),
      checked: it.checked,
      haveAlready: it.haveAlready,
      manual: it.manual,
      updatedAt: it.updatedAt,
    }));
    const plan = reconcileTodo({ weekStart, local, remote, memory: s.haSync });
    // D'abord Home Assistant (si ça échoue, rien n'est changé ici et on réessaiera), puis la liste locale.
    const removed = plan.remote.flatMap((o) => (o.op === "remove" ? [o.uid] : []));
    if (removed.length) await removeItems(cfg, removed);
    for (const op of plan.remote) {
      if (op.op === "add") await addItemMarked(cfg, op.summary, op.description);
      if (op.op === "update") await updateItem(cfg, op.uid, { status: op.status, rename: op.rename });
    }
    // Les articles ajoutés n'ont pas encore d'uid : la prochaine synchro les retrouve par leur marqueur.
    // Un article ajouté déjà coché doit aussi passer « terminé » dans HA : on relance une synchro.
    applying = true;
    actions.applyHaSync(weekStart, plan.local, plan.synced, started);
    applying = false;
    if (plan.remote.some((o) => o.op === "add")) again = true;
    failures = 0;
  } catch (e) {
    applying = false;
    failures++;
    // Réseau du téléphone qui coupe un instant : on réessaie sans rien afficher ; l'erreur ne s'affiche qu'à la 2e fois.
    if (failures === 1 && e instanceof HaError && e.kind === "network") {
      window.setTimeout(() => void syncNow(), 2000);
      return;
    }
    actions.setHaSyncError(e instanceof HaError ? e.message : e instanceof Error ? e.message : String(e));
  }
}

let failures = 0;

let applying = false;

/** État pour l'interface : synchro en cours ? */
export function useHaSyncBusy() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => busy,
  );
}

/**
 * Déclencheurs, montés une fois dans l'appli : à l'ouverture, au retour au premier plan,
 * toutes les 30 s quand l'appli est visible, et 1,5 s après un changement de la liste locale.
 */
export function useHaSyncLoop() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const visible = () => document.visibilityState === "visible";
    const tick = () => {
      if (visible() && haConfig()) void syncNow();
    };
    tick();
    const interval = window.setInterval(tick, 30_000);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    let timer = 0;
    let last = getState().shopping;
    const unsubscribe = subscribe(() => {
      const s = getState();
      if (s.shopping === last) return;
      last = s.shopping;
      if (applying || !haConfig()) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, 1500);
    });
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      unsubscribe();
    };
  }, []);
}
