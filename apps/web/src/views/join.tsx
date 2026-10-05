import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { Logo, LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinHousehold } from "@/data/sync";

/** Premier lancement sur le serveur du foyer : la phrase secrète, et un nom pour ce téléphone. */
export function JoinView() {
  const [passphrase, setPassphrase] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await joinHousehold(passphrase, name.trim());
    } catch (err) {
      setError(err instanceof TypeError ? "Le serveur ne répond pas. Vérifie le réseau." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="lg" />
          <p className="text-muted-foreground">Rejoins ton foyer : la semaine, les courses et le placard sont partagés entre vos téléphones.</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Phrase secrète du foyer</span>
          <Input type="password" autoComplete="current-password" required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="h-12 text-base" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Ton prénom</span>
          <Input autoComplete="given-name" placeholder="Marie" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
          <span className="block text-xs text-muted-foreground">Affiché quand tu coches un article : « coché par Marie ».</span>
        </label>
        {error && (
          <p role="alert" className="rounded-2xl bg-ochre-soft/80 px-3 py-2 text-sm text-ochre-ink">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy || !passphrase}>
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <KeyRound className="size-5" aria-hidden />}
          Rejoindre le foyer
        </Button>
        <p className="text-center text-xs text-muted-foreground">La phrase secrète est dans le fichier .env du serveur (HOUSEHOLD_PASSPHRASE).</p>
      </form>
    </main>
  );
}

/** Le temps de savoir s'il y a un serveur (une fraction de seconde). */
export function Splash() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background" aria-busy>
      <LogoMark className="size-16 animate-pulse" />
    </main>
  );
}
