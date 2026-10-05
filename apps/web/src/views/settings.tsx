import { formatPrice, householdPortions, type Ingredient } from "@mijote/shared";
import { ChevronLeft, ChevronRight, Download, HouseWifi, KeyRound, Mic, Minus, Package, PackageSearch, Plus, RotateCcw, Smartphone, Sparkles, Upload, Users } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand";
import { Art } from "@/components/art";
import { ClaudeSheet, HomeAssistantSheet, VoiceSheet } from "@/components/connections";
import { Disclaimer, PageHeader, Segmented } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, ingredientsOf, useStore } from "@/data/store";
import { isIOS, isStandalone, promptInstall, useCanInstall } from "@/lib/install";
import { back, go } from "@/lib/router";

export function SettingsView() {
  const s = useStore();
  const h = s.household;
  const file = useRef<HTMLInputElement>(null);
  const [prices, setPrices] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [ha, setHa] = useState(false);
  const [voice, setVoice] = useState(false);
  const [ai, setAi] = useState(false);

  const exportFile = () => {
    const blob = new Blob([actions.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mijote-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (f: File) => {
    try {
      actions.importJSON(await f.text());
      toast.success("Sauvegarde restaurée");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Shell>
      <button type="button" onClick={() => back("/")} className="-ml-2 flex h-11 items-center gap-1 rounded-full px-2 font-semibold text-muted-foreground lg:hidden">
        <ChevronLeft className="size-5" aria-hidden /> Retour
      </button>
      <PageHeader title="Réglages" subtitle={h.name} />

      <div className="max-w-xl space-y-6">
        <Group title="Le foyer">
          <Row label="Adultes">
            <Counter value={h.adults} min={1} max={10} onChange={(adults) => actions.updateHousehold({ adults })} label="adultes" />
          </Row>
          <Row label="Bébé (11-12 mois)" hint="Une portion bébé compte pour une demi-portion adulte.">
            <Counter value={h.babies} min={0} max={4} onChange={(babies) => actions.updateHousehold({ babies })} label="bébés" />
          </Row>
          <Row label="Dessert servi">
            <Segmented
              value={h.dessertSlot}
              onChange={(dessertSlot) => actions.updateHousehold({ dessertSlot })}
              options={[
                { value: "lunch", label: "Le midi" },
                { value: "dinner", label: "Le soir" },
              ]}
            />
          </Row>
          <p className="px-4 pb-3 text-xs text-muted-foreground">On cuisine pour {householdPortions(h).toLocaleString("fr-FR")} portions par repas.</p>
        </Group>

        <Group title="Prix">
          <Row label="€ en dessous de" hint="par portion adulte">
            <EuroInput value={h.priceThresholds.low} onChange={(low) => actions.updateHousehold({ priceThresholds: { ...h.priceThresholds, low } })} />
          </Row>
          <Row label="€€€ au-dessus de" hint="par portion adulte">
            <EuroInput value={h.priceThresholds.high} onChange={(high) => actions.updateHousehold({ priceThresholds: { ...h.priceThresholds, high } })} />
          </Row>
          <LinkRow onClick={() => setPrices(true)} icon={<Art name="carotte" className="size-7" />}>
            Prix des ingrédients
          </LinkRow>
        </Group>

        <Group title="Membres et appareils">
          <Row label="Nom de cet appareil" hint="Affiché quand tu coches un article.">
            <Input defaultValue={s.member} onBlur={(e) => actions.setMember(e.target.value.trim() || "Moi")} className="h-11 w-36 text-base" />
          </Row>
          <SoonRow icon={<Users className="size-5" />}>Membres du foyer</SoonRow>
          <SoonRow icon={<KeyRound className="size-5" />}>Phrase secrète du foyer</SoonRow>
        </Group>

        <Group title="Maison et connexions">
          <LinkRow onClick={() => go("/placard")} icon={<Package className="size-5" />}>
            Placard et frigo
          </LinkRow>
          <LinkRow onClick={() => go("/produits")} icon={<PackageSearch className="size-5" />}>
            Mes produits
          </LinkRow>
          <LinkRow onClick={() => setHa(true)} icon={<HouseWifi className="size-5" />} detail={s.integrations?.ha ? "relié" : undefined}>
            Home Assistant
          </LinkRow>
          <LinkRow onClick={() => setAi(true)} icon={<Sparkles className="size-5" />} detail={s.integrations?.ai ? "relié" : undefined}>
            Claude (IA)
          </LinkRow>
          <LinkRow onClick={() => setVoice(true)} icon={<Mic className="size-5" />}>
            À la voix (Gemini, Assistant)
          </LinkRow>
        </Group>

        <Group title="Sauvegarde">
          <LinkRow onClick={exportFile} icon={<Download className="size-5" />}>
            Exporter (JSON)
          </LinkRow>
          <LinkRow onClick={() => file.current?.click()} icon={<Upload className="size-5" />}>
            Importer une sauvegarde
          </LinkRow>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </Group>

        <Group title="Appli">
          <LinkRow onClick={() => go("/installer")} icon={<Smartphone className="size-5" />}>
            Installer Mijoté sur le téléphone
          </LinkRow>
          <LinkRow onClick={() => setResetting(true)} icon={<RotateCcw className="size-5" />}>
            Remettre la démo à zéro
          </LinkRow>
        </Group>

        <Disclaimer />
        <p className="flex items-center gap-2 pb-4 text-xs text-muted-foreground">
          <LogoMark className="size-5" mono /> Mijoté · vitrine de démonstration · données gardées sur cet appareil
        </p>
      </div>

      <PricesSheet open={prices} onOpenChange={setPrices} />
      <HomeAssistantSheet open={ha} onOpenChange={setHa} />
      <VoiceSheet open={voice} onOpenChange={setVoice} />
      <ClaudeSheet open={ai} onOpenChange={setAi} />
      <Sheet
        open={resetting}
        onOpenChange={setResetting}
        title="Remettre la démo à zéro ?"
        description="Les semaines, listes, favoris et recettes ajoutées seront effacés de cet appareil."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="lg" className="h-12 flex-1" onClick={() => setResetting(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="h-12 flex-1"
              onClick={() => {
                actions.reset();
                setResetting(false);
                toast.success("Démo remise à zéro");
                go("/");
              }}
            >
              Tout effacer
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </Shell>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 font-sans text-sm font-bold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="paper divide-y divide-border overflow-hidden rounded-3xl shadow-card ring-1 ring-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function LinkRow({ onClick, icon, detail, children }: { onClick: () => void; icon: ReactNode; detail?: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-semibold hover:bg-muted/60">
      <span className="grid size-8 place-items-center text-primary-ink">{icon}</span>
      <span className="flex-1">{children}</span>
      {detail && <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-xs text-sage-ink">{detail}</span>}
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </button>
  );
}

function SoonRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 text-muted-foreground">
      <span className="grid size-8 place-items-center">{icon}</span>
      <span className="flex-1 font-semibold">{children}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">avec le serveur</span>
    </div>
  );
}

function Counter({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-card ring-1 ring-border">
      <button type="button" className="grid size-11 place-items-center disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Moins de ${label}`}>
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center font-heading text-lg font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className="grid size-11 place-items-center disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Plus de ${label}`}>
        <Plus className="size-4" />
      </button>
    </span>
  );
}

function EuroInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="relative">
      <Input
        type="number"
        inputMode="decimal"
        step="0.5"
        min={0.5}
        defaultValue={value}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (v > 0) onChange(v);
        }}
        className="h-11 w-24 pr-7 text-base"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">€</span>
    </span>
  );
}

const UNIT_LABEL: Record<Ingredient["unit"], string> = { kg: "/kg", L: "/L", piece: "/pièce" };

function PricesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useStore();
  const { list } = ingredientsOf(s);
  const [q, setQ] = useState("");
  const shown = useMemo(() => list.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [list, q]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Prix des ingrédients" description="Prix moyens indicatifs. Corrige-les : ils deviennent la référence du foyer.">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un ingrédient" className="mb-3 h-12 text-base" />
      <ul className="divide-y divide-border">
        {shown.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold first-letter:uppercase">{i.name}</span>
              <span className="text-xs text-muted-foreground">
                {i.channel === "market" ? "Marché" : "Supermarché"} · {i.aisle}
                {s.prices[i.id] !== undefined && " · modifié"}
              </span>
            </span>
            <span className="relative">
              <Input
                key={`${i.id}-${i.avgPrice}`}
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                defaultValue={i.avgPrice}
                aria-label={`Prix de ${i.name} ${UNIT_LABEL[i.unit]}`}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v >= 0 && v !== i.avgPrice) {
                    actions.setPrice(i.id, v);
                    toast(`${i.name} : ${formatPrice(v)} ${UNIT_LABEL[i.unit]}`);
                  }
                }}
                className="h-11 w-24 pr-12 text-right text-base"
              />
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground">€{UNIT_LABEL[i.unit]}</span>
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function InstallView() {
  const canInstall = useCanInstall();
  const ios = isIOS();
  const standalone = isStandalone();
  const steps = [
    { title: "Ouvre Mijoté dans Safari", text: "L'installation sur iPhone et iPad passe par Safari." },
    { title: "Touche le bouton Partager", text: "Le carré avec une flèche vers le haut, en bas de l'écran (en haut sur iPad)." },
    { title: "« Sur l'écran d'accueil »", text: "Fais défiler la liste si besoin, puis touche « Ajouter »." },
  ];
  return (
    <Shell>
      <button type="button" onClick={() => back("/reglages")} className="-ml-2 flex h-11 items-center gap-1 rounded-full px-2 font-semibold text-muted-foreground">
        <ChevronLeft className="size-5" aria-hidden /> Retour
      </button>
      <PageHeader title="Installer Mijoté" subtitle="Comme une vraie appli, même sans réseau" />
      <div className="max-w-xl space-y-5">
        {standalone ? (
          <p className="rounded-3xl bg-primary-soft px-5 py-4 font-semibold text-primary-ink">Mijoté est déjà installée sur cet appareil. 🎉</p>
        ) : canInstall ? (
          <Button
            size="lg"
            className="h-14 w-full text-base"
            onClick={async () => {
              if (await promptInstall()) toast.success("Mijoté est installée");
            }}
          >
            <Download aria-hidden /> Installer Mijoté
          </Button>
        ) : null}

        <section className="paper rounded-3xl p-5 shadow-card ring-1 ring-border">
          <h2 className="mb-4 text-xl font-semibold">Sur iPhone et iPad</h2>
          <ol className="space-y-4">
            {steps.map((st, i) => (
              <li key={st.title} className="flex gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                  {i === 0 ? <Compass /> : i === 1 ? <ShareIcon /> : <Plus className="size-7" />}
                </span>
                <span>
                  <span className="block font-bold">
                    {i + 1}. {st.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{st.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {ios && !standalone && <p className="mt-4 rounded-2xl bg-ochre-soft px-4 py-2 text-sm text-ochre-ink">Tu es sur iPhone ou iPad : suis ces étapes maintenant.</p>}
        </section>

        <section className="paper rounded-3xl p-5 shadow-card ring-1 ring-border">
          <h2 className="mb-2 text-xl font-semibold">Sur Android</h2>
          <p className="text-sm text-muted-foreground">Dans Chrome, touche le bouton « Installer Mijoté » ci-dessus, ou le menu ⋮ puis « Installer l'application ».</p>
        </section>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full"
          onClick={() => {
            actions.setInstallSeen();
            go("/");
          }}
        >
          C'est fait, merci
        </Button>
      </div>
    </Shell>
  );
}

const Compass = () => (
  <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" fillOpacity=".25" strokeLinejoin="round" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </svg>
);
