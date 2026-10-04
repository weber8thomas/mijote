import { Check, Copy, Loader2, PlugZap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, today, useStore } from "@/data/store";
import { AI_MODELS, DEFAULT_MODEL, testKey } from "@/lib/claude";
import { testConnection } from "@/lib/home-assistant";

const appUrl = () => `${window.location.origin}${window.location.pathname}`;
/** Lien profond qui ajoute du texte à la liste de courses. */
export const addLink = (text = "") => `${appUrl()}#/courses/ajouter${text ? `?t=${encodeURIComponent(text)}` : ""}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function CopyLine({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-paper-deep px-3 py-2">
      <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
      <Button
        variant="ghost"
        size="icon-lg"
        className="size-11 shrink-0"
        aria-label="Copier"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => undefined);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

/** Réglages Home Assistant : adresse, jeton longue durée, liste à faire. Gardés sur cet appareil. */
export function HomeAssistantSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useStore();
  const saved = s.integrations?.ha;
  const [url, setUrl] = useState(saved?.url ?? "");
  const [token, setToken] = useState(saved?.token ?? "");
  const [entity, setEntity] = useState(saved?.entity ?? "todo.shopping_list");
  const [autoSync, setAutoSync] = useState(saved?.autoSync ?? true);
  const [testing, setTesting] = useState(false);
  const cfg = { url: url.trim(), token: token.trim(), entity: entity.trim() || "todo.shopping_list", autoSync };

  const test = async () => {
    setTesting(true);
    try {
      const n = await testConnection(cfg);
      toast.success("Home Assistant répond", { description: `${cfg.entity} : ${n} article${n > 1 ? "s" : ""}.` });
    } catch (e) {
      toast.error("Connexion impossible", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Home Assistant"
      description="Envoie la liste vers une liste « À faire » de Home Assistant, et récupère ce que tu y dictes."
      footer={
        <div className="flex gap-2">
          {saved && (
            <Button
              variant="ghost"
              className="h-12"
              onClick={() => {
                actions.setIntegrations({ ha: undefined });
                onOpenChange(false);
                toast("Home Assistant déconnecté");
              }}
            >
              Déconnecter
            </Button>
          )}
          <Button variant="outline" className="h-12 flex-1" disabled={!cfg.url || !cfg.token || testing} onClick={test}>
            {testing ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />} Tester
          </Button>
          <Button
            className="h-12 flex-1"
            disabled={!cfg.url || !cfg.token}
            onClick={() => {
              actions.setIntegrations({ ha: cfg });
              onOpenChange(false);
              toast.success("Home Assistant enregistré");
            }}
          >
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Adresse" hint="En https, par exemple ton adresse Nabu Casa.">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://maison.ui.nabu.casa" inputMode="url" autoComplete="off" className="h-12 text-base" />
        </Field>
        <Field label="Jeton d'accès longue durée" hint="Profil → Sécurité → Jetons d'accès longue durée.">
          <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" className="h-12 text-base" />
        </Field>
        <Field label="Liste">
          <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="todo.shopping_list" autoComplete="off" className="h-12 text-base" />
        </Field>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-card px-4 shadow-card ring-1 ring-border">
          <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} className="size-5 accent-[var(--primary)]" />
          <span className="text-sm font-semibold">Synchroniser tout seul (ajouts et cases cochées)</span>
        </label>
        <div className="space-y-2 rounded-2xl bg-ochre-soft/70 p-4 text-sm text-ochre-ink">
          <p className="font-semibold">À ajouter une fois dans configuration.yaml :</p>
          <pre className="overflow-x-auto rounded-xl bg-card/80 p-3 text-xs">{`http:\n  cors_allowed_origins:\n    - ${window.location.origin}`}</pre>
          <p>Le jeton reste sur cet appareil : il n'est ni exporté dans la sauvegarde, ni envoyé ailleurs qu'à ton Home Assistant.</p>
        </div>
      </div>
    </Sheet>
  );
}

/** Aide : ajouter aux courses à la voix, via Gemini, Google Assistant ou Home Assistant. */
export function VoiceSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="À la voix" description="Mijoté n'écoute pas : ton assistant le fait, puis renvoie vers Mijoté.">
      <div className="space-y-5 text-sm">
        <section className="space-y-2">
          <h3 className="text-lg">Avec Home Assistant (le plus simple)</h3>
          <p>Relie Google Assistant, Gemini ou Assist à ta liste Home Assistant. Dis « ajoute du lait à la liste de courses », puis dans Mijoté : Courses → Envoyer → Importer.</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-lg">Avec un lien</h3>
          <p>Ce lien ajoute ce qui suit « t= » à la liste. Enregistre-le dans un raccourci (Raccourcis sur iPhone, routine Google), ou demande à Gemini de l'ouvrir.</p>
          <CopyLine value={addLink("lait, 6 œufs")} />
        </section>
        <section className="space-y-2">
          <h3 className="text-lg">Avec le partage (Android)</h3>
          <p>Installe Mijoté, puis partage un texte depuis Gemini ou Keep et choisis Mijoté : chaque ligne devient un article.</p>
        </section>
      </div>
    </Sheet>
  );
}

/** Réglages Claude : clé API Anthropic, modèle, limite d'appels par jour. Gardés sur cet appareil. */
export function ClaudeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useStore();
  const saved = s.integrations?.ai;
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? "");
  const [model, setModel] = useState<string>(saved?.model ?? DEFAULT_MODEL);
  const [limit, setLimit] = useState(saved?.dailyLimit ?? 20);
  const [testing, setTesting] = useState(false);
  const usedToday = saved?.used?.day === today().toISOString().slice(0, 10) ? saved.used.count : 0;

  const test = async () => {
    setTesting(true);
    try {
      await testKey({ apiKey, model });
      toast.success("Clé valide", { description: AI_MODELS.find((m) => m.id === model)?.label });
    } catch (e) {
      toast.error("Clé refusée", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Claude (IA)"
      description="Pour proposer des recettes, importer un lien ou une photo, et lire une photo du frigo."
      footer={
        <div className="flex gap-2">
          {saved && (
            <Button
              variant="ghost"
              className="h-12"
              onClick={() => {
                actions.setIntegrations({ ai: undefined });
                setApiKey("");
                onOpenChange(false);
                toast("Clé effacée de cet appareil");
              }}
            >
              Effacer
            </Button>
          )}
          <Button variant="outline" className="h-12 flex-1" disabled={!apiKey.trim() || testing} onClick={test}>
            {testing ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />} Tester
          </Button>
          <Button
            className="h-12 flex-1"
            disabled={!apiKey.trim()}
            onClick={() => {
              actions.setIntegrations({ ai: { apiKey: apiKey.trim(), model, dailyLimit: Math.max(1, limit), used: saved?.used } });
              onOpenChange(false);
              toast.success("Claude est relié");
            }}
          >
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Clé API Anthropic" hint="À créer sur console.anthropic.com → API Keys.">
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="off" placeholder="sk-ant-…" className="h-12 text-base" />
        </Field>
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Modèle</legend>
          {AI_MODELS.map((m) => (
            <label key={m.id} className="flex min-h-12 items-center gap-3 rounded-2xl bg-card px-4 py-2 shadow-card ring-1 ring-border">
              <input type="radio" name="model" checked={model === m.id} onChange={() => setModel(m.id)} className="size-5 accent-[var(--primary)]" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Appels par jour, au maximum" hint={`Aujourd'hui : ${usedToday}. Chaque proposition coûte quelques centimes.`}>
          <Input type="number" inputMode="numeric" min={1} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 1)} className="h-12 w-28 text-base" />
        </Field>
        <p className="rounded-2xl bg-ochre-soft/70 p-4 text-sm text-ochre-ink">
          La clé reste sur cet appareil : ni exportée, ni partagée avec l'autre téléphone. Les appels partent directement de ce navigateur vers Anthropic. Utilise une clé dédiée, avec une limite de dépense.
        </p>
      </div>
    </Sheet>
  );
}
