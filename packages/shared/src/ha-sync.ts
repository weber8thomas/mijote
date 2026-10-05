// Synchronisation de la liste de courses avec une liste « À faire » de Home Assistant, dans les deux sens.
// Fonction pure : elle compare la liste locale, la liste HA et ce qu'on savait à la dernière synchro,
// et dit quoi changer de chaque côté. L'appli applique ensuite (services todo.* et actions du store).

export type TodoStatus = "needs_action" | "completed";
export type TodoItem = { uid: string; summary: string; status: TodoStatus; description?: string | null };

/** Article Mijoté tel que la synchro le voit (line = son texte dans HA, « carottes · 600 g »). */
export type SyncLocalItem = { id: string; line: string; checked: boolean; haveAlready: boolean; manual?: boolean; updatedAt?: string };

/** Ce qu'on savait d'un article à la dernière synchro. */
export type SyncedEntry = { uid: string; status: TodoStatus; summary: string };
export type SyncMemory = { weekStart: string; lastSync?: string; synced: Record<string, SyncedEntry> };

export type RemoteOp =
  | { op: "add"; itemId: string; summary: string; status: TodoStatus; description: string }
  | { op: "update"; uid: string; status?: TodoStatus; rename?: string }
  | { op: "remove"; uid: string };

export type LocalChange =
  /** Coché ou décoché dans HA (ou par la voix). */
  | { kind: "check"; itemId: string; checked: boolean }
  /** Ajouté dans HA (Assist, Gemini, l'appli HA, l'autre téléphone) : devient un article à la main. */
  | { kind: "create"; summary: string; uid: string; done: boolean }
  /** Supprimé dans HA : un article à la main disparaît… */
  | { kind: "remove"; itemId: string }
  /** … un article de recette passe en « J'ai déjà ». */
  | { kind: "have"; itemId: string };

export type SyncPlan = { local: LocalChange[]; remote: RemoteOp[]; synced: Record<string, SyncedEntry> };

/** Marqueur posé dans la description HA des articles envoyés par Mijoté. */
export const MARKER = "mijote:";
export const markerOf = (itemId: string) => `${MARKER}${itemId}`;
const markedId = (t: TodoItem) => (t.description?.startsWith(MARKER) ? t.description.slice(MARKER.length) : undefined);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const statusOf = (checked: boolean): TodoStatus => (checked ? "completed" : "needs_action");

export function reconcileTodo({ weekStart, local, remote, memory }: { weekStart: string; local: SyncLocalItem[]; remote: TodoItem[]; memory?: SyncMemory }): SyncPlan {
  const out: SyncPlan = { local: [], remote: [], synced: {} };
  const byUid = new Map(remote.map((t) => [t.uid, t]));
  const used = new Set<string>();
  const sameWeek = memory?.weekStart === weekStart;
  const prevOf = (id: string) => (sameWeek ? memory?.synced[id] : undefined);

  // Semaine de courses changée : on retire de HA ce qui était coché ; le reste à acheter est repris (importé plus bas).
  if (memory && !sameWeek) {
    for (const entry of Object.values(memory.synced)) {
      const t = byUid.get(entry.uid);
      if (t?.status === "completed") {
        out.remote.push({ op: "remove", uid: t.uid });
        used.add(t.uid);
      }
    }
  }

  // 1. Retrouver l'article HA de chaque article local : par uid connu, par marqueur, sinon par texte identique.
  const match = new Map<string, TodoItem>();
  const take = (id: string, t: TodoItem | undefined) => {
    if (!t || used.has(t.uid)) return false;
    used.add(t.uid);
    match.set(id, t);
    return true;
  };
  for (const l of local) take(l.id, byUid.get(prevOf(l.id)?.uid ?? ""));
  for (const l of local) if (!match.has(l.id)) take(l.id, remote.find((t) => markedId(t) === l.id));
  for (const l of local) if (!match.has(l.id) && !prevOf(l.id) && !l.haveAlready) take(l.id, remote.find((t) => !used.has(t.uid) && !markedId(t) && same(t.summary, l.line)));

  // 2. Article par article.
  const localIds = new Set(local.map((l) => l.id));
  for (const l of local) {
    const t = match.get(l.id);
    const prev = prevOf(l.id);
    if (!t) {
      if (prev) out.local.push(l.manual ? { kind: "remove", itemId: l.id } : { kind: "have", itemId: l.id });
      else if (!l.haveAlready) out.remote.push({ op: "add", itemId: l.id, summary: l.line, status: statusOf(l.checked), description: markerOf(l.id) });
      continue;
    }
    if (l.haveAlready) {
      out.remote.push({ op: "remove", uid: t.uid });
      continue;
    }
    let status = t.status;
    const localStatus = statusOf(l.checked);
    if (t.status !== localStatus) {
      const remoteChanged = !prev || prev.status !== t.status;
      const localChanged = !prev || prev.status !== localStatus;
      // Les deux ont bougé : le plus récent gagne (une modification locale après la dernière synchro l'emporte).
      const localWins = localChanged && (!remoteChanged || (!!prev && !!l.updatedAt && !!memory?.lastSync && l.updatedAt > memory.lastSync));
      if (localWins) {
        out.remote.push({ op: "update", uid: t.uid, status: localStatus });
        status = localStatus;
      } else out.local.push({ kind: "check", itemId: l.id, checked: t.status === "completed" });
    }
    // Quantité recalculée dans Mijoté : on renomme dans HA, sauf si quelqu'un l'a renommé là-bas.
    let summary = t.summary;
    if (prev && l.line !== prev.summary && t.summary === prev.summary) {
      out.remote.push({ op: "update", uid: t.uid, rename: l.line });
      summary = l.line;
    }
    out.synced[l.id] = { uid: t.uid, status, summary };
  }

  // 3. Articles HA sans correspondance locale.
  const deletedHere = new Set(sameWeek && memory ? Object.entries(memory.synced).filter(([id]) => !localIds.has(id)).map(([, e]) => e.uid) : []);
  for (const t of remote) {
    if (used.has(t.uid)) continue;
    // Supprimé dans Mijoté depuis la dernière synchro : on le retire de HA. (Un article marqué par l'autre
    // téléphone, inconnu ici, n'est jamais supprimé : il est repris comme article à la main.)
    if (deletedHere.has(t.uid)) {
      out.remote.push({ op: "remove", uid: t.uid });
      continue;
    }
    // Ajouté ailleurs (voix, appli HA, autre téléphone) : on le reprend, s'il reste à acheter.
    if (t.status === "needs_action") out.local.push({ kind: "create", summary: t.summary, uid: t.uid, done: false });
  }
  return out;
}
