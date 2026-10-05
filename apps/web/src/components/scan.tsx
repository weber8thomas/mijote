import { itemName, matchProduct, matchShoppingItem, type InventoryItem, type ProductInfo, type ShoppingItem } from "@mijote/shared";
import { Check, ChevronRight, Loader2, Plus, ScanBarcode, ShoppingBasket, Undo2, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Art } from "@/components/art";
import { AvoidBand, BabyBox, INTO, NutriBadge, ProductDetails, ProductSkeleton, ProductThumb, shoppingLabel, ShelveFields, storedToast, useLookup, useShelve, addProductToShopping } from "@/components/product";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, getState, ingredientsOf, type ProductMemo } from "@/data/store";
import { isBarcode, lookupProduct, type Lookup } from "@/lib/off";
import { go } from "@/lib/router";
import { getSelectedWeek, useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Scanner global, monté une fois dans App : on l'ouvre de partout avec openScan(mode).
// - « fiche » : ouvre la fiche du produit (#/produit/<code>) ;
// - « placard » : fiche résumée puis rangement au placard, au frigo ou au congélateur ;
// - « magasin » : coche l'article de la liste de courses, et la caméra reste ouverte pour enchaîner.

// Le lecteur (caméra + polyfill) n'est chargé qu'à la première ouverture.
const BarcodeScanner = lazy(() => import("@/components/scanner").then((m) => ({ default: m.BarcodeScanner })));

export type ScanMode = "fiche" | "magasin" | "placard";
type Request = { mode: ScanMode; id: number; onStored?: (items: InventoryItem[]) => void };

let request: Request | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = (r: Request | null) => {
  request = r;
  listeners.forEach((l) => l());
};

/** Ouvre le lecteur de code-barres. onStored : rappel après un rangement (mode « placard »). */
export function openScan(mode: ScanMode, options: { onStored?: (items: InventoryItem[]) => void } = {}) {
  toast.dismiss();
  emit({ mode, id: nextId++, onStored: options.onStored });
}
export const closeScan = () => emit(null);

const useRequest = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => request,
  );

/** Chaque produit lu est retenu dans « Mes produits » (avec le nombre de scans). */
function rememberScan(code: string) {
  void lookupProduct(code).then((r) => r.status === "found" && actions.rememberProduct(code, r.product, true));
}

export function ScanHost() {
  const req = useRequest();
  // Mode placard : code lu, gardé pendant l'animation de fermeture de la fiche.
  const [shelf, setShelf] = useState<{ code: string; open: boolean; onStored?: Request["onStored"] } | null>(null);

  const detected = (code: string) => {
    if (!req) return;
    rememberScan(code);
    if (req.mode === "fiche") {
      closeScan();
      go(`/produit/${encodeURIComponent(code)}`);
    } else if (req.mode === "placard") {
      closeScan();
      setShelf({ code, open: true, onStored: req.onStored });
    }
  };

  return (
    <>
      {req && (
        <Suspense fallback={null}>
          {req.mode === "magasin" ? (
            <StoreScanner key={req.id} onClose={closeScan} />
          ) : (
            <BarcodeScanner key={req.id} onClose={closeScan} onDetected={detected} title={req.mode === "fiche" ? "Scanner un produit" : "Ranger un produit"} />
          )}
        </Suspense>
      )}
      {shelf && (
        <ShelfSheet
          key={shelf.code}
          code={shelf.code}
          open={shelf.open}
          onOpenChange={(o) => setShelf((cur) => cur && { ...cur, open: o })}
          onStored={(items) => {
            setShelf((cur) => cur && { ...cur, open: false });
            storedToast(items);
            shelf.onStored?.(items);
          }}
          onRescan={() => {
            const onStored = shelf.onStored;
            setShelf(null);
            openScan("placard", { onStored });
          }}
        />
      )}
    </>
  );
}

// ——— Mode placard : fiche résumée, puis rangement ———

function ShelfSheet({ code, open, onOpenChange, onStored, onRescan }: { code: string; open: boolean; onOpenChange: (o: boolean) => void; onStored: (items: InventoryItem[]) => void; onRescan: () => void }) {
  const [weekStart] = useSelectedWeek();
  const { result, retry } = useLookup(code);
  const product = result?.status === "found" ? result.product : undefined;
  const form = useShelve(product?.name ?? "");
  const ready = !!result && form.ready;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={product ? "Produit scanné" : result?.status === "offline" ? "Pas de réseau" : result ? "Produit inconnu" : "Recherche du produit…"}
      description={`Code ${code}`}
      footer={
        result && (
          <div className="flex flex-col gap-2">
            <Button size="lg" className="h-14 w-full text-base" disabled={!ready} onClick={() => onStored(form.store(isBarcode(code) ? code : undefined, product))}>
              <Check aria-hidden /> Ajouter {INTO[form.location]}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="lg"
                className="h-12"
                disabled={!ready}
                onClick={() => {
                  addProductToShopping(weekStart, { name: form.match?.name ?? form.name });
                  onOpenChange(false);
                }}
              >
                <ShoppingBasket aria-hidden /> Aux courses
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12"
                disabled={!product}
                onClick={() => {
                  onOpenChange(false);
                  go(`/produit/${encodeURIComponent(code)}`);
                }}
              >
                Fiche complète
              </Button>
            </div>
          </div>
        )
      }
    >
      {!result ? (
        <ProductSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          {product ? (
            <ProductDetails product={product} code={code} />
          ) : result.status === "offline" ? (
            <div className="flex items-start gap-3 rounded-3xl bg-ochre-soft px-4 py-4 text-ochre-ink">
              <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">La fiche n'a pas pu être chargée.</p>
                <p className="mt-1 text-foreground">Vérifie ta connexion. Tu peux aussi le nommer et le ranger quand même.</p>
                <Button variant="outline" className="mt-3 h-12 border-ochre-ink/40" onClick={retry}>
                  Réessayer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-3xl bg-paper-deep/70 px-4 py-4">
              <Art name="sprig" className="size-16 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">{isBarcode(code) ? "Open Food Facts ne connaît pas ce produit." : "Ce code n'est pas un code-barres de produit."}</p>
                <p className="mt-1 text-muted-foreground">Donne-lui un nom pour le ranger, ou scanne à nouveau.</p>
                <Button variant="outline" className="mt-3 h-12" onClick={onRescan}>
                  <ScanBarcode aria-hidden /> Scanner à nouveau
                </Button>
              </div>
            </div>
          )}
          <ShelveFields form={form} id="scan-name" />
        </div>
      )}
    </Sheet>
  );
}

// ——— Mode magasin : chaque scan coche l'article de la liste ———

/** Articles cochés pendant une séance de scan (pour le bilan à la fermeture). */
type Session = Map<string, { weekStart: string; name: string }>;

function StoreScanner({ onClose }: { onClose: () => void }) {
  // n : numéro de lecture (le même produit relu plus tard donne un nouveau résultat).
  const [hit, setHit] = useState<{ code: string; n: number } | null>(null);
  const [session] = useState<Session>(() => new Map());
  // En fermant : un seul toast-bilan, avec « Annuler » (pendant le scan, la carte du bas sert de toast et laisse l'en-tête libre).
  const finish = () => {
    onClose();
    const ticked = [...session.entries()].filter(([id, t]) => getState().shopping[t.weekStart]?.find((i) => i.id === id)?.checked);
    if (!ticked.length) return;
    const text = ticked.length === 1 ? `${ticked[0][1].name} : coché` : `${ticked.length} articles cochés`;
    toast.success(text, {
      description: ticked.length > 1 ? ticked.map(([, t]) => t.name).join(", ") : undefined,
      action: {
        label: "Annuler",
        onClick: () => ticked.forEach(([id, t]) => getState().shopping[t.weekStart]?.find((i) => i.id === id)?.checked && actions.toggleChecked(t.weekStart, id)),
      },
    });
  };
  return (
    <BarcodeScanner
      continuous
      title="Scanner en magasin"
      hint="Vise le code-barres : l'article se coche tout seul."
      onClose={finish}
      onDetected={(code) => setHit((h) => ({ code, n: (h?.n ?? 0) + 1 }))}
    >
      {hit && (
        <StoreResult
          key={hit.n}
          code={hit.code}
          session={session}
          onOpen={() => {
            finish();
            go(`/produit/${encodeURIComponent(hit.code)}`);
          }}
        />
      )}
    </BarcodeScanner>
  );
}

type Outcome =
  | { kind: "loading" }
  | { kind: "offline" }
  | { kind: "unknown" }
  | { kind: "ticked"; product: ProductInfo; item: ShoppingItem; name: string; undone?: boolean }
  | { kind: "already"; product: ProductInfo; name: string }
  | { kind: "absent"; product: ProductInfo; added?: boolean };

/** Fiche Open Food Facts, sinon celle gardée dans « Mes produits » (pratique au fond du magasin, sans réseau). */
async function storeLookup(code: string): Promise<{ result: Lookup; memo?: ProductMemo }> {
  const result = await lookupProduct(code);
  return { result, memo: getState().products?.[code] };
}

function StoreResult({ code, session, onOpen }: { code: string; session: Session; onOpen: () => void }) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "loading" });
  const [memo, setMemo] = useState<ProductMemo | undefined>(() => getState().products?.[code]);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void storeLookup(code).then(({ result, memo }) => {
      setMemo(memo);
      const product = result.status === "found" ? result.product : memo?.product;
      if (!product) return setOutcome({ kind: result.status === "offline" ? "offline" : "unknown" });
      const weekStart = getSelectedWeek();
      const { list, byId } = ingredientsOf(getState());
      const item = matchShoppingItem(product, getState().shopping[weekStart] ?? [], list);
      if (!item) return setOutcome({ kind: "absent", product });
      const name = itemName(item, byId);
      if (item.checked) return setOutcome({ kind: "already", product, name });
      actions.toggleChecked(weekStart, item.id);
      navigator.vibrate?.([20, 60, 20]);
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      session.set(item.id, { weekStart, name: label });
      setOutcome({ kind: "ticked", product, item, name: label });
    });
  }, [code, session]);

  const undoCard = () => {
    if (outcome.kind !== "ticked") return;
    const weekStart = getSelectedWeek();
    const current = getState().shopping[weekStart]?.find((i) => i.id === outcome.item.id);
    if (current?.checked) actions.toggleChecked(weekStart, outcome.item.id);
    session.delete(outcome.item.id);
    setOutcome({ ...outcome, undone: true });
  };

  const addAndTick = () => {
    if (outcome.kind !== "absent") return;
    const weekStart = getSelectedWeek();
    const name = matchProduct(outcome.product.name, ingredientsOf(getState()).list)?.name ?? outcome.product.name;
    const added = actions.addToShopping(weekStart, shoppingLabel(name));
    for (const it of added) {
      if (!it.checked) actions.toggleChecked(weekStart, it.id);
      session.set(it.id, { weekStart, name: shoppingLabel(name).replace(/^./, (c) => c.toUpperCase()) });
    }
    setOutcome({ ...outcome, added: true });
  };

  const avoid = memo?.mark === "eviter";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-live="polite"
      aria-label="Dernier produit scanné"
      className="paper overflow-hidden rounded-3xl text-foreground shadow-float"
    >
      {avoid && <AvoidBand className="rounded-none" />}
      <div className="flex flex-col gap-3 p-3">
        {outcome.kind === "loading" ? (
          <div className="flex items-center gap-3" aria-busy="true">
            <div className="size-14 animate-pulse rounded-2xl bg-paper-deep" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-5 w-2/3 animate-pulse rounded-full bg-paper-deep" />
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-paper-deep" />
            </div>
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Recherche du produit" />
          </div>
        ) : outcome.kind === "offline" || outcome.kind === "unknown" ? (
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ochre-soft text-ochre-ink">{outcome.kind === "offline" ? <WifiOff className="size-6" aria-hidden /> : <Art name="sprig" className="size-10" />}</span>
            <p className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">{outcome.kind === "offline" ? "Pas de réseau" : "Produit inconnu"}</span>
              <span className="text-muted-foreground">{outcome.kind === "offline" ? "La fiche n'a pas pu être chargée. Coche l'article à la main." : `Open Food Facts ne connaît pas le code ${code}.`}</span>
            </p>
          </div>
        ) : (
          <>
            <button type="button" onClick={onOpen} className="-m-1 flex items-center gap-3 rounded-2xl p-1 text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={`${outcome.product.name} : voir la fiche`}>
              <ProductThumb product={outcome.product} className="size-14" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 leading-snug font-semibold">{outcome.product.name}</span>
                {(outcome.product.brand || outcome.product.nutrition?.energyKcal !== undefined) && (
                  <span className="block truncate text-sm text-muted-foreground">
                    {[outcome.product.brand, outcome.product.nutrition?.energyKcal !== undefined ? `${Math.round(outcome.product.nutrition.energyKcal)} kcal/100 g` : undefined].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              {outcome.product.nutriscore && <NutriBadge grade={outcome.product.nutriscore} />}
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <StatusLine outcome={outcome} />
            <BabyBox product={outcome.product} compact />
            <div className="grid grid-cols-2 gap-2">
              {outcome.kind === "ticked" && !outcome.undone ? (
                <Button variant="outline" size="lg" className="h-12" onClick={undoCard}>
                  <Undo2 aria-hidden /> Annuler
                </Button>
              ) : outcome.kind === "absent" && !outcome.added ? (
                <Button size="lg" className="h-12" onClick={addAndTick}>
                  <Plus aria-hidden /> Ajouter et cocher
                </Button>
              ) : (
                <span />
              )}
              <Button variant="outline" size="lg" className="h-12" onClick={onOpen}>
                Voir la fiche
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}

function StatusLine({ outcome }: { outcome: Extract<Outcome, { product: ProductInfo }> }) {
  const tone =
    outcome.kind === "ticked" && !outcome.undone ? "bg-sage-soft text-sage-ink" : outcome.kind === "absent" && !outcome.added ? "bg-paper-deep text-foreground" : "bg-paper-deep text-muted-foreground";
  const text =
    outcome.kind === "ticked"
      ? outcome.undone
        ? `${outcome.name} : décoché`
        : `${outcome.name} : coché`
      : outcome.kind === "already"
        ? `${outcome.name} : déjà coché`
        : outcome.added
          ? "Ajouté à la liste et coché"
          : "Pas sur la liste";
  return (
    <p className={cn("flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold", tone)}>
      {outcome.kind === "ticked" && !outcome.undone ? <Check className="size-4.5" strokeWidth={3} aria-hidden /> : outcome.kind === "absent" && !outcome.added ? <ShoppingBasket className="size-4.5" aria-hidden /> : <Check className="size-4.5" aria-hidden />}
      <span className="first-letter:uppercase">{text}</span>
    </p>
  );
}
