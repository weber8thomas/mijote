import { Check, Copy, Loader2, PlugZap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, today, useStore } from "@/data/store";
import { AI_MODELS, DEFAULT_MODEL, testKey } from "@/lib/claude";
import { checkHa, isServerMode, useServerHa, type HaCheck } from "@/data/sync";
import { syncNow } from "@/lib/ha-sync";
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

/** Réglages Home Assistant : sur le serveur du foyer s'il y en a un, sinon sur cet appareil (vitrine). */
export function HomeAssistantSheet(props: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return isServerMode() ? <ServerHaSheet {...props} /> : <DeviceHaSheet {...props} />;
}

/** Serveur du foyer : HA est réglé dans son fichier .env ; ici, l'état et un diagnostic. */
function ServerHaSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const status = useServerHa();
  const [check, setCheck] = useState<HaCheck>();
  const [testing, setTesting] = useState(false);
  const test = async () => {
    setTesting(true);
    try {
      setCheck(await checkHa());
    } catch (e) {
      setCheck({ enabled: true, ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };
  const result = check ?? (status?.enabled ? undefined : { enabled: false });
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Home Assistant"
      description="Le serveur du foyer synchronise la liste de courses avec une liste « À faire » de Home Assistant, toutes les 30 s et après chaque changement, même téléphones fermés."
      footer={
        <Button variant="outline" className="h-12 w-full" disabled={testing || status?.enabled === false} onClick={test}>
          {testing ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />} Tester la connexion
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        {status?.enabled && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
            <dt className="text-muted-foreground">Liste</dt>
            <dd className="font-semibold">{status.entity}</dd>
            <dt className="text-muted-foreground">Articles dans HA</dt>
            <dd>{status.items ?? "…"}</dd>
            <dt className="text-muted-foreground">Dernière synchro</dt>
            <dd>{status.lastSync ? new Date(status.lastSync).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "pas encore"}</dd>
            {status.descriptions === false && (
              <>
                <dt className="text-muted-foreground">Type</dt>
                <dd>sans description (Google Keep) : articles reconnus par leur texte</dd>
              </>
            )}
            {status.lastError && (
              <>
                <dt className="text-ochre-ink">Erreur</dt>
                <dd className="text-ochre-ink">{status.lastError}</dd>
              </>
            )}
          </dl>
        )}
        {result && (
          <p role="status" className={result.ok ? "rounded-2xl bg-sage-soft/70 p-4 text-sage-ink" : "rounded-2xl bg-ochre-soft/70 p-4 text-ochre-ink"}>
            {!result.enabled
              ? "Pas encore relié : ajoute HA_URL et HA_TOKEN dans le fichier .env du serveur, puis redémarre-le."
              : result.ok
                ? `Home Assistant répond. ${result.entity} : ${result.items} article${(result.items ?? 0) > 1 ? "s" : ""}.`
                : `Connexion impossible : ${result.error}`}
          </p>
        )}
        <div className="space-y-2 rounded-2xl bg-paper-deep p-4">
          <p className="font-semibold">Dans le fichier .env du serveur</p>
          <pre className="overflow-x-auto rounded-xl bg-card/80 p-3 text-xs">{`HA_URL=http://homeassistant.local:8123\nHA_TOKEN=…jeton longue durée…\nHA_TODO_ENTITY=${status?.entity ?? "todo.mijote_courses"}`}</pre>
          <p className="text-muted-foreground">Le jeton reste sur le serveur : il ne passe jamais par les téléphones. Pas besoin de CORS.</p>
        </div>
      </div>
    </Sheet>
  );
}

/** Vitrine : adresse, jeton longue durée, liste à faire, gardés sur cet appareil. */
function DeviceHaSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useStore();
  const saved = s.integrations?.ha;
  const [url, setUrl] = useState(saved?.url ?? "");
  const [token, setToken] = useState(saved?.token ?? "");
  const [entity, setEntity] = useState(saved?.entity ?? "todo.mijote_courses");
  const [autoSync, setAutoSync] = useState(saved?.autoSync ?? true);
  const [testing, setTesting] = useState(false);
  const cfg = { url: url.trim(), token: token.trim(), entity: entity.trim() || "todo.mijote_courses", autoSync };

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
      description="La liste de courses vit aussi dans Home Assistant : Assist, Gemini ou Google (reliés à HA), l'appli HA et l'autre téléphone la lisent et la modifient, même Mijoté fermé."
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
              toast.success("Home Assistant enregistré", { description: cfg.autoSync ? "Première synchro en cours…" : undefined });
              if (cfg.autoSync) void syncNow();
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
        <Field label="Liste" hint="Dans HA : Paramètres → Appareils et services → Ajouter une intégration → « Liste de tâches locale », nommée « Mijoté courses ».">
          <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="todo.mijote_courses" autoComplete="off" className="h-12 text-base" />
        </Field>
        <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-2 shadow-card ring-1 ring-border">
          <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} className="size-5 accent-[var(--primary)]" />
          <span className="text-sm">
            <span className="block font-semibold">Liste partagée avec Home Assistant</span>
            <span className="block text-muted-foreground">Dans les deux sens : ajouts, cases cochées, suppressions. Synchro à l'ouverture, puis toutes les 30 s.</span>
          </span>
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
          <h3 className="text-lg">Gemini et « Ok Google » (via Google Keep)</h3>
          <p>Gemini et l'Assistant Google écrivent les courses dans Google Keep. Le serveur du foyer suit cette liste à travers Home Assistant :</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Sur le téléphone : réglages de Gemini ou de l'Assistant → Notes et listes → Google Keep.</li>
            <li>Dans HA : HACS → « Google Keep Sync », puis choisis ta liste « Courses » (elle devient todo.google_keep_courses).</li>
            <li>Dans le .env du serveur : HA_TODO_ENTITY=todo.google_keep_courses.</li>
            <li>Dis « Ok Google, ajoute du lait à ma liste de courses » : il arrive dans Mijoté en moins d'une minute.</li>
          </ol>
          <p className="text-muted-foreground">« Qu'y a-t-il sur ma liste de courses ? » marche aussi : Keep a la liste complète de Mijoté.</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-lg">Avec Home Assistant et Assist</h3>
          <p>Active « Liste partagée » dans Réglages → Home Assistant. La liste « Mijoté courses » de HA est alors la même que celle de Mijoté, dans les deux sens.</p>
          <p>Avec Assist (l'assistant de HA, qui peut remplacer l'assistant du téléphone sur Android) : « ajoute du lait à Mijoté courses », « qu'y a-t-il sur Mijoté courses ? ». Ce que tu dictes apparaît dans Mijoté ; ce que tu coches en magasin se coche dans HA.</p>
          <p>Gemini ou Google Assistant passent par la liaison de HA avec Google : selon ton installation, ils voient la liste HA. À vérifier chez toi.</p>
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
