import type { ProductInfo } from "@mijote/shared";
import { ArrowLeft, Check, Package, PackageSearch, ScanBarcode, ShoppingBasket, Trash2, WifiOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Art } from "@/components/art";
import { EmptyState } from "@/components/kit";
import { addProductToShopping, AvoidBand, INTO, MarkToggles, ProductDetails, ProductSkeleton, ShelveFields, storedToast, useProduct, useRemember, useShelve } from "@/components/product";
import { openScan } from "@/components/scan";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions } from "@/data/store";
import { isBarcode } from "@/lib/off";
import { back, go } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";

// Fiche d'un produit du commerce (#/produit/<code>) : ouverte après un scan, une recherche, ou depuis « Mes produits ».

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export function ProductView({ code: raw }: { code: string }) {
  const code = decodeURIComponent(raw);
  const [weekStart] = useSelectedWeek();
  const { product, memo, result, retry, stale } = useProduct(code);
  useRemember(code, product);
  const [shelving, setShelving] = useState(false);

  const toShopping = () => product && addProductToShopping(weekStart, product);
  const bottomBar = product && (
    <div className="paper mx-auto grid max-w-3xl grid-cols-2 gap-2 rounded-full p-2 shadow-float ring-1 ring-border lg:hidden">
      <Button variant="outline" size="lg" className="h-12 border-border-strong" onClick={() => setShelving(true)}>
        <Package aria-hidden /> Ranger
      </Button>
      <Button size="lg" className="h-12" onClick={toShopping}>
        <ShoppingBasket aria-hidden /> Aux courses
      </Button>
    </div>
  );

  const top = (
    <div className="flex items-center gap-2 pt-1 pb-3">
      <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => back("/produits")} aria-label="Retour">
        <ArrowLeft className="size-5" />
      </Button>
      <p className="min-w-0 flex-1 text-sm font-semibold tracking-[0.1em] text-muted-foreground uppercase">Fiche produit</p>
      <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => go("/produits")} aria-label="Mes produits">
        <PackageSearch className="size-5" />
      </Button>
      <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => openScan("fiche")} aria-label="Scanner un autre produit">
        <ScanBarcode className="size-5" />
      </Button>
    </div>
  );

  if (!product)
    return (
      <Shell tab="shopping">
        {top}
        {!result ? (
          <div className="mx-auto max-w-xl">
            <ProductSkeleton />
          </div>
        ) : result.status === "offline" ? (
          <div className="mx-auto flex max-w-xl items-start gap-3 rounded-3xl bg-ochre-soft px-5 py-5 text-ochre-ink">
            <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <h1 className="font-heading text-xl">Pas de réseau</h1>
              <p className="mt-1 text-sm text-foreground">La fiche n'a pas pu être chargée. Vérifie ta connexion.</p>
              <Button variant="outline" className="mt-3 h-12 border-ochre-ink/40" onClick={retry}>
                Réessayer
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            illustration="sprig"
            title="Produit inconnu"
            action={
              <Button size="lg" className="h-14 w-full" onClick={() => openScan("fiche")}>
                <ScanBarcode aria-hidden /> Scanner un autre produit
              </Button>
            }
          >
            {isBarcode(code) ? `Open Food Facts ne connaît pas le code ${code}.` : "Ce code n'est pas un code-barres de produit."}
          </EmptyState>
        )}
      </Shell>
    );

  return (
    <Shell tab="shopping" bottomBar={bottomBar}>
      {top}
      <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <section aria-labelledby="product-name" className="flex flex-col gap-4 lg:sticky lg:top-8">
          {memo?.mark === "eviter" && <AvoidBand />}
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            <span className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-border lg:size-56">
              {product.image ? <img src={product.image} alt={`Photo : ${product.name}`} className="size-full object-contain" /> : <Art name="sprig" className="size-20 lg:size-36" />}
            </span>
            <div className="min-w-0">
              <h1 id="product-name" className="font-heading text-2xl leading-tight lg:text-3xl">
                {product.name}
              </h1>
              {(product.brand || product.quantity) && <p className="mt-1 text-muted-foreground">{[product.brand, product.quantity].filter(Boolean).join(" · ")}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">Code {code}</p>
            </div>
          </div>
          <MarkToggles code={code} product={product} />
          {stale && memo && (
            <p className="flex items-center gap-2 rounded-2xl bg-ochre-soft px-3 py-2 text-sm text-ochre-ink">
              <WifiOff className="size-4 shrink-0" aria-hidden /> Hors ligne : fiche gardée le {dateFr(memo.lastSeen)}.
            </p>
          )}
          <div className="hidden grid-cols-2 gap-2 lg:grid">
            <Button variant="outline" size="lg" className="h-12 border-border-strong" onClick={() => setShelving(true)}>
              <Package aria-hidden /> Ranger
            </Button>
            <Button size="lg" className="h-12" onClick={toShopping}>
              <ShoppingBasket aria-hidden /> Aux courses
            </Button>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-6 lg:mt-0">
          <ProductDetails product={product} code={code} hideHeader />
          {memo && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <span>
                Vu la première fois le {dateFr(memo.firstSeen)}
                {memo.scans > 0 && ` · scanné ${memo.scans} fois`}
              </span>
              <Button
                variant="ghost"
                className="h-12 px-3"
                onClick={() => {
                  const kept = memo;
                  actions.forgetProduct(code);
                  toast(`${product.name} : retiré de Mes produits`, {
                    action: { label: "Annuler", onClick: () => (actions.rememberProduct(code, kept.product), kept.mark && actions.markProduct(code, kept.mark)) },
                  });
                  back("/produits");
                }}
              >
                <Trash2 aria-hidden /> Oublier ce produit
              </Button>
            </div>
          )}
        </div>
      </div>

      <ShelveSheet code={code} product={product} open={shelving} onOpenChange={setShelving} />
    </Shell>
  );
}

/** « Ranger » : nom, ingrédient reconnu et emplacement, puis ajout à l'inventaire. */
function ShelveSheet({ code, product, open, onOpenChange }: { code: string; product: ProductInfo; open: boolean; onOpenChange: (o: boolean) => void }) {
  const form = useShelve(product.name);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ranger à la maison"
      description={product.name}
      footer={
        <Button
          size="lg"
          className="h-14 w-full text-base"
          disabled={!form.ready}
          onClick={() => {
            storedToast(form.store(isBarcode(code) ? code : undefined, product));
            onOpenChange(false);
          }}
        >
          <Check aria-hidden /> Ajouter {INTO[form.location]}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <ShelveFields form={form} id="shelve-name" />
      </div>
    </Sheet>
  );
}
