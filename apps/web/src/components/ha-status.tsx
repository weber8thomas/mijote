import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, HouseWifi, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/data/store";
import { isServerMode, syncHaNow, useServerHa, useSyncMode } from "@/data/sync";
import { haConfig, syncNow, useHaSyncBusy } from "@/lib/ha-sync";
import { go } from "@/lib/router";
import { cn } from "@/lib/utils";

/** Ligne d'état de la liste partagée avec Home Assistant (écran Courses). */
export function HaStatus({ className }: { className?: string }) {
  const s = useStore();
  const localBusy = useHaSyncBusy();
  useSyncMode();
  const server = useServerHa();
  // Rafraîchit « il y a 2 min » sans attendre une synchro.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
  // Avec le serveur du foyer, c'est lui qui synchronise : on montre son état.
  const onServer = isServerMode();
  if (onServer ? !server?.enabled : !haConfig()) return null;
  const sync = onServer ? server : s.haSync;
  const busy = onServer ? !!server?.busy : localBusy;
  const error = sync?.lastError;
  const when = sync?.lastSync ? formatDistanceToNowStrict(new Date(sync.lastSync), { locale: fr, addSuffix: true }) : undefined;
  return (
    <div className={cn("flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm", error ? "bg-ochre-soft/80 text-ochre-ink" : "bg-sage-soft/70 text-sage-ink", className)} role="status">
      {error ? <AlertTriangle className="size-4 shrink-0" aria-hidden /> : <HouseWifi className="size-4 shrink-0" aria-hidden />}
      <button type="button" onClick={() => (error ? go("/reglages") : undefined)} className="min-w-0 flex-1 truncate text-left">
        {error ? `Home Assistant : ${error}` : busy ? "Synchro…" : `Partagée avec Home Assistant${when ? ` · ${when.replace(/^il y a /, "")}` : ""}`}
      </button>
      <button type="button" onClick={() => void (onServer ? syncHaNow() : syncNow())} disabled={busy} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-card/60" aria-label="Synchroniser maintenant">
        <RefreshCw className={cn("size-4", busy && "animate-spin")} aria-hidden />
      </button>
    </div>
  );
}
