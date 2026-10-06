import { applyAction, type Action, type HouseholdState } from "@mijote/shared";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getState, replaceState, setActionSink, type State } from "@/data/store";

// Serveur du foyer : quand Mijoté est servi par son serveur (Docker à la maison), l'état du foyer y vit.
// Le téléphone applique chaque action tout de suite (affichage instantané, même hors ligne), la garde dans une file,
// l'envoie au serveur, et reçoit en direct (SSE) les actions de l'autre téléphone et de Home Assistant.
// Affiché = état confirmé par le serveur + actions encore en attente, rejouées par-dessus (même logique partout).

export type SyncMode = "demo" | "detecting" | "join" | "online" | "offline";
type Pending = { actionId: string; action: Action };
type Applied = { version: number; actionId: string; clientId: string; action: Action };
type Saved = { version: number; confirmed: HouseholdState; pending: Pending[]; clientId: string };

const API = `${import.meta.env.BASE_URL}api`;
const KEY = "mijote-sync-v1";

let mode: SyncMode = "detecting";
let member: { id: string; displayName: string } | undefined;
let saved: Saved | undefined;
let events: EventSource | undefined;
let flushing = false;
let haStatus: ServerHaStatus | undefined;
let serverAi = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const setMode = (m: SyncMode) => {
  if (m === mode) return;
  mode = m;
  notify();
};

export const syncMode = () => mode;
export const isServerMode = () => mode !== "demo" && mode !== "detecting";
export const currentMember = () => member;
/** Le serveur a-t-il une clé Claude (ANTHROPIC_API_KEY) ? */
export const hasServerAi = () => isServerMode() && serverAi;

const subscribeSync = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export const useSyncMode = () => useSyncExternalStore(subscribeSync, () => mode);
/** État de la synchro Home Assistant faite par le serveur (reçu avec le direct). */
export const useServerHa = () => useSyncExternalStore(subscribeSync, () => haStatus);
const setHa = (h: ServerHaStatus | undefined) => {
  if (!h || JSON.stringify(h) === JSON.stringify(haStatus)) return;
  haStatus = h;
  notify();
};

const persist = () => {
  try {
    if (saved) localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // plein ou privé : la file reste en mémoire
  }
};

/** Affiché = confirmé + en attente ; ce qui est propre à l'appareil (nom, réglages) est gardé. */
function render() {
  if (!saved) return;
  const household = saved.pending.reduce((s, p) => applyAction(s, p.action), saved.confirmed);
  const device = getState();
  replaceState({ ...household, member: member?.displayName ?? device.member, installSeen: device.installSeen, shelveOnScan: device.shelveOnScan, integrations: device.integrations, haSync: device.haSync } as State);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  if (res.status === 401) {
    stop();
    setMode("join");
    throw new Error("Session absente");
  }
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

/** Au démarrage : y a-t-il un serveur Mijoté derrière cette adresse ? Sinon, c'est la vitrine. */
export async function startSync() {
  // La vitrine publique n'a jamais de serveur : inutile de demander.
  if (location.hostname.endsWith("github.io")) return setMode("demo");
  let health: { app?: string; ha?: boolean; ai?: boolean } | undefined;
  try {
    const res = await fetch(`${API}/health`, { cache: "no-store" });
    health = res.ok ? ((await res.json().catch(() => undefined)) as typeof health) : undefined;
  } catch {
    // Hors ligne au démarrage : si on a déjà un état du serveur, on l'affiche et on attend le réseau.
    if (loadSaved()) {
      setMode("offline");
      attach();
      render();
      return;
    }
  }
  if (health?.app !== "mijote") return setMode("demo");
  serverAi = !!health.ai;
  loadSaved();
  try {
    const me = await api<{ member: { id: string; displayName: string } }>("/me");
    member = me.member;
  } catch (e) {
    // Pas de session → « Rejoindre le foyer » (api() l'a déjà signalé). Réseau coupé entre-temps → hors ligne.
    if (mode !== "join" && loadSaved()) {
      setMode("offline");
      attach();
      render();
    } else if (mode !== "join") setMode("join");
    void e;
    return;
  }
  attach();
  if (saved) render();
  await refresh();
  connect();
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    saved = raw ? (JSON.parse(raw) as Saved) : undefined;
  } catch {
    saved = undefined;
  }
  return saved;
}

/** Rejoindre le foyer avec la phrase secrète. */
export async function joinHousehold(passphrase: string, displayName: string) {
  const res = await fetch(`${API}/auth/join`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase, displayName }) });
  const body = (await res.json().catch(() => ({}))) as { error?: string; member?: { id: string; displayName: string } };
  if (!res.ok || !body.member) throw new Error(body.error ?? "Impossible de rejoindre le foyer.");
  member = body.member;
  attach();
  await refresh(true);
  connect();
}

export async function leaveHousehold() {
  await api("/auth/logout", { method: "POST" }).catch(() => undefined);
  stop();
  localStorage.removeItem(KEY);
  saved = undefined;
  member = undefined;
  setMode("join");
}

let attached = false;
/** Les actions de l'appli partent dans la file, puis au serveur. */
function attach() {
  if (attached) return;
  attached = true;
  setActionSink((action) => {
    if (!saved) return;
    saved.pending.push({ actionId: crypto.randomUUID(), action });
    persist();
    void flush();
  });
  window.addEventListener("online", () => void reconnect());
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void reconnect());
}

async function reconnect() {
  if (mode === "join" || mode === "demo") return;
  await flush();
  await catchUp();
  if (!events || events.readyState === EventSource.CLOSED) connect();
}

/** État complet du serveur (premier lancement, ou journal trop ancien). */
async function refresh(force = false) {
  try {
    if (!saved || force) {
      const { version, state } = await api<{ version: number; state: HouseholdState }>("/state");
      saved = { version, confirmed: state, pending: saved?.pending ?? [], clientId: saved?.clientId ?? crypto.randomUUID() };
      persist();
      render();
    } else await catchUp();
    await flush();
    setMode("online");
  } catch (e) {
    if (mode !== "join") setMode("offline");
    void e;
  }
}

/** Rattrapage : ce qui s'est passé pendant qu'on était hors ligne. */
async function catchUp() {
  if (!saved) return;
  try {
    const res = await fetch(`${API}/actions?since=${saved.version}`, { credentials: "same-origin" });
    if (res.status === 410) return void (await refresh(true));
    if (res.status === 401) return setMode("join");
    if (!res.ok) throw new Error(String(res.status));
    const { actions } = (await res.json()) as { actions: Applied[] };
    receive(actions);
    setMode("online");
  } catch {
    setMode("offline");
  }
}

/** Envoie la file. Un renvoi est sans risque : le serveur ignore une action déjà reçue. */
async function flush() {
  if (!saved?.pending.length || flushing) return;
  flushing = true;
  try {
    const batch = saved.pending.slice(0, 50);
    await api("/actions", { method: "POST", body: JSON.stringify({ clientId: saved.clientId, actions: batch }) });
    // Les actions reviennent par le direct (ou le rattrapage) ; si le direct est coupé, on rattrape tout de suite.
    if (!events || events.readyState !== EventSource.OPEN) await catchUp();
    if (saved.pending.length > batch.length) {
      flushing = false;
      return flush();
    }
  } catch (e) {
    if ((e as { status?: number }).status === 400) {
      // Action refusée (appli trop ancienne ?) : on la retire pour ne pas bloquer la file.
      saved.pending.shift();
      persist();
      toast.error("Une modification n'a pas pu être enregistrée sur le serveur.");
    } else setMode("offline");
  } finally {
    flushing = false;
  }
}

/** Actions confirmées par le serveur, dans l'ordre : appliquées à l'état confirmé, retirées de la file. */
function receive(list: Applied[]) {
  if (!saved || !list.length) return;
  let changed = false;
  for (const a of list) {
    if (a.version <= saved.version) continue;
    if (a.version !== saved.version + 1) return void catchUp();
    saved.confirmed = applyAction(saved.confirmed, a.action);
    saved.version = a.version;
    saved.pending = saved.pending.filter((p) => p.actionId !== a.actionId);
    changed = true;
  }
  if (changed) {
    persist();
    render();
  }
}

function connect() {
  events?.close();
  events = new EventSource(`${API}/events`, { withCredentials: true });
  events.addEventListener("hello", (e) => {
    const { version, ha } = JSON.parse((e as MessageEvent).data) as { version: number; ha?: ServerHaStatus };
    setHa(ha ?? { enabled: false });
    setMode("online");
    if (saved && version !== saved.version) void catchUp();
    void flush();
  });
  events.addEventListener("actions", (e) => receive(JSON.parse((e as MessageEvent).data) as Applied[]));
  events.addEventListener("ping", (e) => {
    const { version, ha } = JSON.parse((e as MessageEvent).data) as { version: number; ha?: ServerHaStatus };
    setHa(ha ?? { enabled: false });
    if (saved && version > saved.version) void catchUp();
  });
  events.onerror = () => setMode("offline");
}

function stop() {
  events?.close();
  events = undefined;
}

// ——— Serveur : membres, Home Assistant ———

export type MemberInfo = { id: string; displayName: string; lastSeen: string };
export const listMembers = () => api<{ members: MemberInfo[] }>("/members").then((r) => r.members);
/** Change le prénom de ce téléphone (affiché sur les articles cochés). */
export async function renameSelf(name: string) {
  const displayName = name.trim().slice(0, 40);
  if (!member || !displayName || displayName === member.displayName) return;
  await api(`/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ displayName }) });
  member = { ...member, displayName };
  render();
}
export const removeMember = (id: string) => api(`/members/${id}`, { method: "DELETE" });
export type ServerHaStatus = { enabled: boolean; entity?: string; lastSync?: string; lastError?: string; busy?: boolean; items?: number; descriptions?: boolean };
export type HaCheck = { enabled: boolean; ok?: boolean; entity?: string; items?: number; error?: string; descriptions?: boolean | null; lastSync?: string; lastError?: string };
export type ServerAiStatus = { enabled: boolean; model?: string; used?: number; limit?: number };
export const fetchAiStatus = () => api<ServerAiStatus>("/ai/status");
export const checkHa = () => api<HaCheck>("/ha/check", { method: "POST" });
/** « Synchroniser maintenant » : le serveur fait une passe complète et renvoie son état. */
export async function syncHaNow() {
  setHa({ ...(haStatus ?? { enabled: true }), busy: true });
  try {
    setHa(await api<ServerHaStatus>("/ha/sync", { method: "POST" }));
  } catch {
    setHa({ ...(haStatus ?? { enabled: true }), busy: false });
  }
}
