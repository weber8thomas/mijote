import { CHANNEL_LABELS, formatEuros, formatQty, groupByAisle, PANTRY_BASICS, shoppingText, totals, type Channel, type Ingredient, type ShoppingItem } from "@mijote/shared";
import { Check, Home, Package, Printer, Search, Share2, Undo2 } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Chip, EmptyState, PageHeader, Segmented } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, ingredientsOf, useShopping, useStore, useWeek } from "@/data/store";
import { go } from "@/lib/router";
import { normalize } from "@/lib/text";
import { useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { weekRange, WeekSwitch } from "@/views/week";

export function ShoppingView() {
  const [weekStart] = useSelectedWeek();
  const { week } = useWeek(weekStart);
  const items = useShopping(weekStart);
  const s = useStore();
  const ingredients = ingredientsOf(s).byId;
  const [channel, setChannel] = useState<Channel>("market");
  const [pantryOpen, setPantryOpen] = useState(false);
  const t = totals(items);
  const [q, setQ] = useState("");
  const nq = normalize(q.trim());
  const matches = (i: ShoppingItem) => !nq || normalize(ingredients.get(i.ingredientId)?.name ?? "").includes(nq);
  const visible = items.filter((i) => i.channel === channel && !i.haveAlready && matches(i));
  const have = items.filter((i) => i.channel === channel && i.haveAlready);
  const done = visible.filter((i) => i.checked).length;

  const share = async () => {
    const text = shoppingText(items, ingredients, `Courses ${weekRange(weekStart)}`);
    try {
      if (navigator.share) await navigator.share({ title: "Liste de courses Mijoté", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Liste copiée", { description: "Colle-la dans un message." });
      }
    } catch {
      // partage annulé
    }
  };

  return (
    <Shell tab="shopping">
      <PageHeader
        title="Courses"
        subtitle={weekRange(weekStart)}
        actions={
          items.length > 0 && (
            <>
              <Button variant="ghost" size="icon-lg" onClick={() => setPantryOpen(true)} aria-label="Placard">
                <Package className="size-5" />
              </Button>
              <Button variant="ghost" size="icon-lg" onClick={share} aria-label="Partager la liste">
                <Share2 className="size-5" />
              </Button>
              <Button variant="ghost" size="icon-lg" onClick={() => go(`/courses/imprimer/${weekStart}`)} aria-label="Imprimer la liste">
                <Printer className="size-5" />
              </Button>
            </>
          )
        }
      />
      <div className="mb-4">
        <WeekSwitch />
      </div>

      {!week || week.status !== "validated" ? (
        <EmptyState
          illustration="carotte"
          title={week ? "Semaine pas encore validée" : "Pas encore de liste"}
          action={
            <Button size="lg" className="h-14 w-full" onClick={() => go("/semaine")}>
              Aller à la semaine
            </Button>
          }
        >
          Valide la semaine : Mijoté prépare la liste, rangée par rayon, au marché et au supermarché.
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

          {visible.length === 0 && have.length === 0 && <p className="py-10 text-center text-muted-foreground">{nq ? `Aucun article ne correspond à « ${q} ».` : "Rien à acheter ici cette semaine."}</p>}

          <div className="space-y-5">
            {groupByAisle(visible).map((g) => (
              <section key={g.aisle} aria-label={g.aisle}>
                <h2 className="mb-1.5 px-1 font-sans text-sm font-bold tracking-wide text-muted-foreground uppercase">{g.aisle}</h2>
                <ul className="paper divide-y divide-border overflow-hidden rounded-3xl shadow-card ring-1 ring-border">
                  {g.items.map((it) => (
                    <ShoppingRow key={it.id} item={it} ingredient={ingredients.get(it.ingredientId)!} weekStart={weekStart} />
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
                      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border-strong bg-card px-3 text-sm text-muted-foreground"
                    >
                      <Undo2 className="size-3.5" aria-hidden />
                      {ingredients.get(it.ingredientId)?.name}
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

      <PantrySheet open={pantryOpen} onOpenChange={setPantryOpen} ingredients={ingredients} />
    </Shell>
  );
}

function ShoppingRow({ item, ingredient, weekStart }: { item: ShoppingItem; ingredient: Ingredient; weekStart: string }) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-110, -30, 0], [1, 0.4, 0]);
  const qty = item.unit === "piece" ? formatQty(item.qty, "piece") : formatQty(item.qty, item.unit);
  const have = () => {
    actions.toggleHave(weekStart, item.id);
    toast(`${ingredient.name} : déjà à la maison`, { action: { label: "Annuler", onClick: () => actions.toggleHave(weekStart, item.id) } });
  };
  return (
    <li className="relative">
      <motion.div style={{ opacity: reveal }} className="absolute inset-0 flex items-center justify-end bg-primary-soft pr-5 text-sm font-bold text-primary-ink" aria-hidden>
        <Home className="mr-1.5 size-4" /> J'ai déjà
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -90) have();
        }}
        className="paper relative flex items-center"
      >
        <button
          type="button"
          onClick={() => actions.toggleChecked(weekStart, item.id)}
          aria-pressed={item.checked}
          className="flex min-h-14 flex-1 items-center gap-3 py-2 pr-2 pl-4 text-left"
        >
          <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors", item.checked ? "border-primary bg-primary text-white" : "border-border-strong")}>
            {item.checked && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("relative font-semibold transition-colors first-letter:uppercase", item.checked && "text-muted-foreground")}>
              {ingredient.name}
              <motion.span
                className="absolute top-1/2 left-0 h-[2px] bg-muted-foreground"
                initial={false}
                animate={{ width: item.checked ? "100%" : "0%" }}
                transition={{ duration: 0.25 }}
                aria-hidden
              />
            </span>
            {item.checked && item.checkedBy && <span className="block text-xs text-muted-foreground">coché par {item.checkedBy}</span>}
          </span>
          <span className={cn("shrink-0 text-sm font-semibold tabular-nums", item.checked ? "text-muted-foreground" : "text-foreground")}>{qty}</span>
        </button>
        <button type="button" onClick={have} className="grid size-12 shrink-0 place-items-center text-muted-foreground hover:text-primary-ink" aria-label={`J'ai déjà : ${ingredient.name}`}>
          <Home className="size-4.5" />
        </button>
      </motion.div>
    </li>
  );
}

function PantrySheet({ open, onOpenChange, ingredients }: { open: boolean; onOpenChange: (o: boolean) => void; ingredients: Map<string, Ingredient> }) {
  const s = useStore();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Placard" description="Coche ce que tu as en stock : ces basiques ne seront pas ajoutés à la liste.">
      <div className="flex flex-wrap gap-2">
        {PANTRY_BASICS.map((id) => {
          const inStock = !!s.pantry[id];
          return (
            <Chip key={id} active={inStock} onClick={() => actions.setPantry(id, !inStock)} className="h-12 px-4">
              {inStock && <Check className="size-4" aria-hidden />}
              <span className="first-letter:uppercase">{ingredients.get(id)?.name}</span>
            </Chip>
          );
        })}
      </div>
    </Sheet>
  );
}
