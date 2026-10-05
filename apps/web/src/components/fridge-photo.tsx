import { type InventoryItem } from "@mijote/shared";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, getState, ingredientsOf } from "@/data/store";
import { readFridge, type FridgeItem } from "@/lib/claude";
import { aiConfig } from "@/components/new-recipe-sheet";
import { cn } from "@/lib/utils";

const PLACE = { placard: "placard", frigo: "frigo", congelateur: "congélateur" } as const;

/** Photo du frigo ou du placard → Claude liste les produits → on coche ce qu'on range. */
export function FridgePhotoSheet({ photo, onClose, onAdded }: { photo: File | null; onClose: () => void; onAdded: (items: InventoryItem[]) => void }) {
  const [state, setState] = useState<{ photo: File; items?: FridgeItem[]; error?: string } | null>(null);
  const [off, setOff] = useState<Set<number>>(new Set());

  // Nouvelle photo : on relance la lecture (état remis à zéro pendant le rendu, puis appel dans l'effet).
  if (photo && state?.photo !== photo) {
    setState({ photo });
    setOff(new Set());
  }
  useEffect(() => {
    if (!photo) return;
    let live = true;
    const cfg = aiConfig();
    const run = async () => {
      if (!cfg) throw new Error("Relie Claude dans les réglages.");
      if (cfg !== "server" && !actions.useAiCall()) throw new Error("Limite d'appels du jour atteinte.");
      return readFridge(cfg, ingredientsOf(getState()).list, photo);
    };
    run().then(
      (items) => live && setState({ photo, items }),
      (e: unknown) => live && setState({ photo, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [photo]);

  const items = state?.items ?? [];
  const chosen = items.filter((_, i) => !off.has(i));

  return (
    <Sheet
      open={!!photo}
      onOpenChange={(o) => !o && onClose()}
      title="Photo du frigo"
      description={state?.items ? `${items.length} produit${items.length > 1 ? "s" : ""} reconnu${items.length > 1 ? "s" : ""}. Décoche ce qui n'est pas juste.` : "Claude regarde la photo…"}
      footer={
        state?.items && items.length > 0 ? (
          <Button
            size="lg"
            className="h-12 w-full"
            disabled={!chosen.length}
            onClick={() => {
              const added = actions.addInventory(
                chosen.map((i) => ({ name: i.name, ingredientId: i.ingredientId ?? undefined, location: i.location, qty: i.qty ?? undefined, unit: i.unit ?? undefined })),
              );
              onAdded(added);
              onClose();
            }}
          >
            <Check aria-hidden /> Ranger {chosen.length} produit{chosen.length > 1 ? "s" : ""}
          </Button>
        ) : undefined
      }
    >
      {state?.error ? (
        <p className="rounded-2xl bg-ochre-soft/80 p-4 text-sm text-ochre-ink">{state.error}</p>
      ) : !state?.items ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-paper-deep" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Aucun produit reconnu. Essaie une photo plus nette, porte grande ouverte.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const on = !off.has(i);
            return (
              <li key={`${it.name}-${i}`}>
                <label className={cn("flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-2 shadow-card ring-1 ring-border", !on && "opacity-50")}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setOff((cur) => {
                        const next = new Set(cur);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className="size-5 accent-[var(--primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold first-letter:uppercase">{it.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {PLACE[it.location]}
                      {it.qty ? ` · ${it.qty}${it.unit === "piece" ? "" : ` ${it.unit}`}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
