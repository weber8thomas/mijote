import { CHANNEL_LABELS, formatEuros, formatQty, groupByAisle, itemLine, itemName, shoppingText, totals, type Channel, type Ingredient, type ShoppingItem } from "@mijote/shared";
import { Check, Copy, Download, Home, HouseWifi, Loader2, NotebookPen, Package, Plus, Printer, Search, Share2, Trash2, Undo2, X } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Segmented } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, getState, ingredientsOf, useShopping, useStore, useWeek } from "@/data/store";
import { type HaConfig, pullNewItems, pushItems, setDone } from "@/lib/home-assistant";
import { go, replace } from "@/lib/router";
import { normalize } from "@/lib/text";
import { useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { weekRange, WeekSwitch } from "@/views/week";

/** Envoi vers Home Assistant en tâche de fond, sans bloquer l'interface. */
function haSync(task: (cfg: HaConfig) => Promise<unknown>) {
  const cfg = getState().integrations?.ha;
  if (!cfg?.autoSync || !cfg.url || !cfg.token) return;
  task(cfg).catch((e: unknown) => toast.error("Home Assistant", { description: e instanceof Error ? e.message : String(e) }));
}

export function ShoppingView({ add }: { add?: string }) {
  const [weekStart] = useSelectedWeek();
  const { week } = useWeek(weekStart);
  const items = useShopping(weekStart);
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const [channel, setChannel] = useState<Channel>("market");
  const [sendOpen, setSendOpen] = useState(false);
  const t = totals(items);
  const [q, setQ] = useState("");
  const nq = normalize(q.trim());
  const matches = (i: ShoppingItem) => !nq || normalize(itemName(i, ingredients)).includes(nq);
  const visible = items.filter((i) => i.channel === channel && !i.haveAlready && matches(i));
  const have = items.filter((i) => i.channel === channel && i.haveAlready);
  const done = visible.filter((i) => i.checked).length;
  const hasList = (week?.status === "validated" || items.length > 0);
  const addRef = useRef<HTMLInputElement>(null);

  const addText = (text: string) => {
    const added = actions.addToShopping(weekStart, text);
    if (!added.length) return;
    const names = added.map((i) => itemName(i, ingredients));
    if (added.every((i) => i.channel !== channel)) setChannel(added[0].channel);
    toast.success(names.length === 1 ? `${names[0]} : ajouté` : `${names.length} articles ajoutés`, { description: names.length > 1 ? names.join(", ") : undefined });
    haSync((cfg) => pushItems(cfg, added.map((i) => itemLine(i, ingredients))));
  };

  // Lien profond #/courses/ajouter?t=… (Gemini, Assistant, raccourci, partage) : on ajoute, puis on revient à la liste.
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (add === handled.current) return;
    handled.current = add;
    if (add === undefined) return;
    if (add.trim()) addText(add);
    else addRef.current?.focus();
    replace("/courses");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add]);

  return (
    <Shell tab="shopping">
      <PageHeader
        title="Courses"
        subtitle={weekRange(weekStart)}
        actions={
          <>
            <Button variant="ghost" size="icon-lg" onClick={() => go("/placard")} aria-label="Placard et frigo">
              <Package className="size-5" />
            </Button>
            {items.length > 0 && (
              <>
                <Button variant="ghost" size="icon-lg" onClick={() => setSendOpen(true)} aria-label="Envoyer la liste">
                  <Share2 className="size-5" />
                </Button>
                <Button variant="ghost" size="icon-lg" onClick={() => go(`/courses/imprimer/${weekStart}`)} aria-label="Imprimer la liste">
                  <Printer className="size-5" />
                </Button>
              </>
            )}
          </>
        }
      />
      <div className="mb-4">
        <WeekSwitch />
      </div>

      <AddBar inputRef={addRef} onAdd={addText} />

      {!hasList ? (
        <EmptyState
          illustration="carotte"
          title={week ? "Semaine pas encore validée" : "Pas encore de liste"}
          action={
            <Button size="lg" className="h-14 w-full" onClick={() => go("/semaine")}>
              Aller à la semaine
            </Button>
          }
        >
          Valide la semaine : Mijoté prépare la liste, rangée par rayon, au marché et au supermarché. Tu peux déjà ajouter des articles à la main.
        </EmptyState>
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-4 bg-background/90 px-4 pt-1 pb-3 backdrop-blur-md lg:top-0">
            <Segmented
              value={channel}
              onChange={setChannel}
              className="w-full"
              options={(["market", "supermarket"] as const).map((c) => ({
                value: c,
                label: (
                  <span>
                    {CHANNEL_LABELS[c]} <span className="font-normal text-muted-foreground">~ {formatEuros(t[c])}</span>
                  </span>
                ),
              }))}
            />
            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-deep">
                <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${visible.length ? (done / visible.length) * 100 : 0}%` }} />
              </div>
              <span className="font-semibold text-muted-foreground tabular-nums">
                {done} / {visible.length}
              </span>
            </div>
          </div>

          {items.length > 8 && (
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtrer la liste…"
                aria-label="Filtrer la liste de courses"
                className="h-12 w-full rounded-full border border-border-strong bg-card pr-4 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
              />
            </div>
          )}

          {visible.length === 0 && have.length === 0 && <p className="py-10 text-center text-muted-foreground">{nq ? `Aucun article ne correspond à « ${q} ».` : "Rien à acheter ici cette semaine."}</p>}

          <div className="space-y-5">
            {groupByAisle(visible).map((g) => (
              <section key={g.aisle} aria-label={g.aisle}>
                <h2 className="mb-1.5 px-1 font-sans text-sm font-bold tracking-wide text-muted-foreground uppercase">{g.aisle}</h2>
                <ul className="paper divide-y divide-border overflow-hidden rounded-3xl shadow-card ring-1 ring-border">
                  {g.items.map((it) => (
                    <ShoppingRow key={it.id} item={it} name={itemName(it, ingredients)} line={itemLine(it, ingredients)} weekStart={weekStart} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {have.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-1.5 px-1 font-sans text-sm font-bold tracking-wide text-muted-foreground uppercase">Déjà à la maison</h2>
              <ul className="flex flex-wrap gap-2">
                {have.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => actions.toggleHave(weekStart, it.id)}
                      className="inline-flex h-12 items-center gap-1.5 rounded-full border border-border-strong bg-card px-4 text-sm text-muted-foreground"
                    >
                      <Undo2 className="size-3.5" aria-hidden />
                      <span className="first-letter:uppercase">{itemName(it, ingredients)}</span>
                      <span className="sr-only">: remettre dans la liste</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-8 rounded-2xl bg-primary-soft/50 px-4 py-3 text-xs text-primary-ink">
            Vitrine : ouvre Mijoté dans un deuxième onglet, les articles cochés s'y mettent à jour en direct. Avec le serveur, ce sera entre vos deux téléphones.
          </p>
        </>
      )}

      <SendSheet open={sendOpen} onOpenChange={setSendOpen} weekStart={weekStart} items={items} ingredients={ingredients} onImport={addText} />
    </Shell>
  );
}

/** Champ « Ajouter un article » : texte libre, plusieurs articles séparés par des virgules. */
function AddBar({ onAdd, inputRef }: { onAdd: (text: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mb-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText("");
      }}
    >
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        enterKeyHint="done"
        autoComplete="off"
        placeholder="Ajouter : 3 carottes, du lait…"
        aria-label="Ajouter un article à la liste"
        className="h-12 min-w-0 flex-1 rounded-full border border-border-strong bg-card px-5 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
      />
      <Button type="submit" size="icon-lg" className="size-12 shrink-0 rounded-full" disabled={!text.trim()} aria-label="Ajouter">
        <Plus className="size-5" />
      </Button>
    </form>
  );
}

function ShoppingRow({ item, name, line, weekStart }: { item: ShoppingItem; name: string; line: string; weekStart: string }) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-110, -30, 0], [1, 0.4, 0]);
  const qty = item.qty ? formatQty(item.qty, item.unit) : "";
  const have = () => {
    actions.toggleHave(weekStart, item.id);
    toast(`${name} : déjà à la maison`, { action: { label: "Annuler", onClick: () => actions.toggleHave(weekStart, item.id) } });
  };
  const remove = () => {
    actions.removeShoppingItem(weekStart, item.id);
    toast(`${name} : retiré`, { action: { label: "Annuler", onClick: () => actions.restoreShoppingItem(weekStart, item) } });
  };
  const toggle = () => {
    actions.toggleChecked(weekStart, item.id);
    haSync((cfg) => setDone(cfg, line, !item.checked));
  };
  return (
    <li className="relative">
      <motion.div style={{ opacity: reveal }} className="absolute inset-0 flex items-center justify-end bg-primary-soft pr-5 text-sm font-bold text-primary-ink" aria-hidden>
        {item.manual ? (
          <>
            <Trash2 className="mr-1.5 size-4" /> Retirer
          </>
        ) : (
          <>
            <Home className="mr-1.5 size-4" /> J'ai déjà
          </>
        )}
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -90) (item.manual ? remove : have)();
        }}
        className="paper relative flex items-center"
      >
        <button type="button" onClick={toggle} aria-pressed={item.checked} className="flex min-h-14 flex-1 items-center gap-3 py-2 pr-2 pl-4 text-left">
          <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors", item.checked ? "border-primary bg-primary text-white" : "border-border-strong")}>
            {item.checked && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("relative font-semibold transition-colors first-letter:uppercase", item.checked && "text-muted-foreground")}>
              {name}
              <motion.span
                className="absolute top-1/2 left-0 h-[2px] bg-muted-foreground"
                initial={false}
                animate={{ width: item.checked ? "100%" : "0%" }}
                transition={{ duration: 0.25 }}
                aria-hidden
              />
            </span>
            {item.checked && item.checkedBy ? (
              <span className="block text-xs text-muted-foreground">coché par {item.checkedBy}</span>
            ) : (
              item.manual && <span className="block text-xs text-muted-foreground">ajouté à la main</span>
            )}
          </span>
          <span className={cn("shrink-0 text-sm font-semibold tabular-nums", item.checked ? "text-muted-foreground" : "text-foreground")}>{qty}</span>
        </button>
        {item.manual ? (
          <button type="button" onClick={remove} className="grid size-12 shrink-0 place-items-center text-muted-foreground hover:text-destructive" aria-label={`Retirer : ${name}`}>
            <X className="size-4.5" />
          </button>
        ) : (
          <button type="button" onClick={have} className="grid size-12 shrink-0 place-items-center text-muted-foreground hover:text-primary-ink" aria-label={`J'ai déjà : ${name}`}>
            <Home className="size-4.5" />
          </button>
        )}
      </motion.div>
    </li>
  );
}

function SendOption({ icon, title, hint, onClick, disabled }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-card ring-1 ring-border transition-colors hover:bg-muted disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

/** Envoyer la liste : partage du téléphone (Keep, Messages…), copie, Home Assistant. */
function SendSheet({
  open,
  onOpenChange,
  weekStart,
  items,
  ingredients,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  weekStart: string;
  items: ShoppingItem[];
  ingredients: Map<string, Ingredient>;
  onImport: (text: string) => void;
}) {
  const s = useStore();
  const ha = s.integrations?.ha;
  const haReady = !!(ha?.url && ha.token && ha.entity);
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);
  const toBuy = items.filter((i) => !i.haveAlready && !i.checked);
  const text = shoppingText(items, ingredients, `Courses ${weekRange(weekStart)}`);
  // Keep : une ligne par article, sans titres de rayon, pour obtenir une liste à cocher.
  const plain = toBuy.map((i) => itemLine(i, ingredients)).join("\n");

  const run = async (kind: "push" | "pull") => {
    if (!ha) return;
    setBusy(kind);
    try {
      if (kind === "push") {
        const n = await pushItems(ha, toBuy.map((i) => itemLine(i, ingredients)));
        toast.success(n ? `${n} article${n > 1 ? "s" : ""} envoyé${n > 1 ? "s" : ""} à Home Assistant` : "Home Assistant a déjà toute la liste");
      } else {
        const fresh = await pullNewItems(ha, items.map((i) => itemLine(i, ingredients)));
        if (fresh.length) onImport(fresh.join("\n"));
        else toast("Rien de nouveau dans Home Assistant");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Home Assistant", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const share = async (body: string) => {
    try {
      if (navigator.share) await navigator.share({ title: "Liste de courses Mijoté", text: body });
      else {
        await navigator.clipboard.writeText(body);
        toast.success("Liste copiée", { description: "Colle-la dans Keep ou dans un message." });
      }
      onOpenChange(false);
    } catch {
      // partage annulé
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Envoyer la liste" description={`${toBuy.length} article${toBuy.length > 1 ? "s" : ""} à acheter`}>
      <div className="space-y-2.5">
        <SendOption icon={<NotebookPen className="size-5" />} title="Vers Google Keep" hint="Partage, puis choisis Keep : une case par article." onClick={() => share(plain)} />
        <SendOption icon={<Share2 className="size-5" />} title="Partager la liste" hint="Rangée par rayon, pour un message." onClick={() => share(text)} />
        <SendOption
          icon={<Copy className="size-5" />}
          title="Copier"
          hint="Dans le presse-papiers."
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => undefined);
            toast.success("Liste copiée");
            onOpenChange(false);
          }}
        />
        {haReady ? (
          <>
            <SendOption icon={busy === "push" ? <Loader2 className="size-5 animate-spin" /> : <HouseWifi className="size-5" />} title="Envoyer à Home Assistant" hint={ha.entity} onClick={() => run("push")} disabled={!!busy} />
            <SendOption icon={busy === "pull" ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />} title="Importer depuis Home Assistant" hint="Ce que tu as dicté à l'assistant." onClick={() => run("pull")} disabled={!!busy} />
          </>
        ) : (
          <button type="button" onClick={() => go("/reglages")} className="min-h-12 w-full rounded-2xl px-4 text-left text-sm text-muted-foreground underline-offset-4 hover:underline">
            Relier Home Assistant (et Gemini ou Google Assistant) dans les réglages →
          </button>
        )}
      </div>
    </Sheet>
  );
}
