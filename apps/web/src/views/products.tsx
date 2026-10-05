import type { ProductInfo } from "@mijote/shared";
import { Package, ScanBarcode, Search, ShoppingBasket, Star, WifiOff, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { EmptyState, PageHeader, Segmented } from "@/components/kit";
import { addProductToShopping, BabyPastille, NutriBadge, ProductThumb } from "@/components/product";
import { openScan } from "@/components/scan";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useStore, type ProductMemo } from "@/data/store";
import { cachedSearch, searchProducts, type ProductSearch } from "@/lib/off";
import { go, replace } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";

// « Mes produits » (#/produits) : ce qu'on a scanné ou consulté, les favoris, ce qu'on évite pour bébé,
// et la recherche par nom dans Open Food Facts (seulement à la validation : le service limite les recherches).

type Tab = "recents" | "favoris" | "eviter";

const EMPTY: Record<Tab, { art: string; title: string; text: string }> = {
  recents: { art: "pomme", title: "Aucun produit pour l'instant", text: "Scanne un code-barres ou cherche un produit par son nom : il restera ici." },
  favoris: { art: "fruits-rouges", title: "Pas encore de favori", text: "Sur une fiche produit, touche « Favori » : tu le retrouveras ici." },
  eviter: { art: "herbes", title: "Rien à éviter", text: "Sur une fiche produit, touche « À éviter pour bébé » : un bandeau te le rappellera en magasin." },
};

export function ProductsView({ q: initialQ = "" }: { q?: string }) {
  const s = useStore();
  const [tab, setTab] = useState<Tab>("recents");
  const [text, setText] = useState(initialQ);
  // Recherche validée (null : on affiche « Mes produits »).
  const [query, setQuery] = useState<string | null>(initialQ.trim() || null);
  const input = useRef<HTMLInputElement>(null);

  const all = useMemo(() => Object.entries(s.products ?? {}).sort(([, a], [, b]) => b.lastSeen.localeCompare(a.lastSeen)), [s.products]);
  const lists: Record<Tab, [string, ProductMemo][]> = {
    recents: all,
    favoris: all.filter(([, m]) => m.mark === "favori"),
    eviter: all.filter(([, m]) => m.mark === "eviter"),
  };
  const shown = lists[tab];

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const q = text.trim();
    if (!q) return;
    input.current?.blur();
    setQuery(q);
    // Le retour depuis une fiche revient sur ces résultats.
    replace(`/produits?q=${encodeURIComponent(q)}`);
  };
  const clear = () => {
    setText("");
    setQuery(null);
    replace("/produits");
    input.current?.focus();
  };

  const bottomBar = (
    <div className="paper mx-auto flex max-w-3xl items-center gap-2 rounded-full p-2 shadow-float ring-1 ring-border lg:hidden">
      <Button size="lg" className="h-12 min-w-0 flex-1" onClick={() => openScan("fiche")}>
        <ScanBarcode aria-hidden /> Scanner un produit
      </Button>
    </div>
  );

  return (
    <Shell tab="shopping" bottomBar={bottomBar}>
      <PageHeader
        title="Mes produits"
        subtitle="Scannés, cherchés, notés"
        actions={
          <>
            <Button size="lg" className="mr-1 hidden h-12 lg:inline-flex" onClick={() => openScan("fiche")}>
              <ScanBarcode aria-hidden /> Scanner un produit
            </Button>
            <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => go("/placard")} aria-label="Placard et frigo">
              <Package className="size-5" />
            </Button>
            <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => go("/courses")} aria-label="Retour aux courses">
              <ShoppingBasket className="size-5" />
            </Button>
          </>
        }
      />

      <form role="search" onSubmit={submit} className="mb-5 flex gap-2" aria-label="Chercher un produit dans Open Food Facts">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={input}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Nom ou marque"
            aria-label="Chercher un produit"
            className="h-12 w-full rounded-full border border-border-strong bg-card pr-11 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {(text || query) && (
            <button type="button" onClick={clear} className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Effacer la recherche">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="lg" className="h-12 shrink-0 px-5" disabled={!text.trim()}>
          Chercher
        </Button>
      </form>

      {query ? (
        <SearchResults key={query} query={query} />
      ) : (
        <>
          <Segmented
            className="mb-4 flex w-full lg:w-auto"
            value={tab}
            onChange={setTab}
            options={(
              [
                ["recents", "Récents"],
                ["favoris", "Favoris"],
                ["eviter", "À éviter"],
              ] as const
            ).map(([value, label]) => ({
              value,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {label}
                  <span className={cn("min-w-5 rounded-full px-1.5 text-xs tabular-nums", tab === value ? "bg-primary-soft text-primary-ink" : "bg-card/70")}>{lists[value].length}</span>
                </span>
              ),
            }))}
          />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              {shown.length === 0 ? (
                <EmptyState
                  illustration={EMPTY[tab].art}
                  title={EMPTY[tab].title}
                  action={
                    tab === "recents" ? (
                      <Button size="lg" className="h-14 w-full" onClick={() => openScan("fiche")}>
                        <ScanBarcode aria-hidden /> Scanner un produit
                      </Button>
                    ) : undefined
                  }
                >
                  {EMPTY[tab].text}
                </EmptyState>
              ) : (
                <ul className="paper divide-y divide-border overflow-hidden rounded-3xl border border-border shadow-card lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:shadow-none lg:[background:none]" aria-label={`${shown.length} produits`}>
                  {shown.map(([code, memo]) => (
                    <li key={code} className="bg-card lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:shadow-card">
                      <ProductRow code={code} product={memo.product} mark={memo.mark} />
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </Shell>
  );
}

/** Une ligne : toute la ligne ouvre la fiche ; « Aux courses » à droite, en un geste. */
export function ProductRow({ code, product, mark, warn = true }: { code: string; product: ProductInfo; mark?: ProductMemo["mark"]; warn?: boolean }) {
  const [weekStart] = useSelectedWeek();
  const sub = [product.brand, product.quantity].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => go(`/produit/${encodeURIComponent(code)}`)}
        className="flex min-h-18 min-w-0 flex-1 items-center gap-3 py-2 pr-1 pl-3 text-left hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none"
        aria-label={`${product.name}${sub ? `, ${sub}` : ""}${mark === "favori" ? ", favori" : ""}${mark === "eviter" ? ", à éviter pour bébé" : ""} : voir la fiche`}
      >
        <ProductThumb product={product} className="size-14" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {mark === "favori" && <Star className="size-3.5 shrink-0 fill-terracotta text-terracotta" aria-hidden />}
            <span className="line-clamp-2 leading-snug font-semibold">{product.name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            {sub && <span className="min-w-0 truncate text-sm text-muted-foreground">{sub}</span>}
            {warn && <BabyPastille product={product} mark={mark} />}
          </span>
        </span>
        {product.nutriscore && <NutriBadge grade={product.nutriscore} />}
      </button>
      <button
        type="button"
        onClick={() => addProductToShopping(weekStart, product)}
        className="mr-1 grid size-12 shrink-0 place-items-center rounded-full text-primary-ink hover:bg-primary-soft focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Aux courses : ${product.name}`}
      >
        <ShoppingBasket className="size-5" />
      </button>
    </div>
  );
}

function SearchResults({ query }: { query: string }) {
  const s = useStore();
  const [state, setState] = useState<{ attempt: number; result: ProductSearch } | null>(() => {
    const hit = cachedSearch(query);
    return hit ? { attempt: 0, result: hit } : null;
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (state && state.attempt === attempt) return;
    let cancelled = false;
    void searchProducts(query).then((result) => !cancelled && setState({ attempt, result }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, attempt]);
  const result = state?.attempt === attempt ? state.result : undefined;
  const retry = () => setAttempt((a) => a + 1);

  return (
    <section aria-labelledby="results-title" aria-busy={!result}>
      <h2 id="results-title" className="mb-2 px-1 font-sans text-sm font-bold tracking-wide text-muted-foreground uppercase">
        {result?.status === "ok" ? `Open Food Facts · ${result.hits.length} résultat${result.hits.length > 1 ? "s" : ""}` : "Open Food Facts"}
      </h2>
      {!result ? (
        <ul className="paper divide-y divide-border overflow-hidden rounded-3xl border border-border shadow-card" aria-label="Recherche en cours">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex min-h-18 items-center gap-3 px-3 py-2">
              <div className="size-14 animate-pulse rounded-2xl bg-paper-deep" style={{ animationDelay: `${i * 80}ms` }} />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-paper-deep" style={{ animationDelay: `${i * 80}ms` }} />
                <div className="h-3 w-1/3 animate-pulse rounded-full bg-paper-deep" style={{ animationDelay: `${i * 80}ms` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : result.status !== "ok" ? (
        <div className="flex items-start gap-3 rounded-3xl bg-ochre-soft px-5 py-5 text-ochre-ink">
          <WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{result.status === "busy" ? "Open Food Facts est très demandé." : "Pas de réseau."}</p>
            <p className="mt-1 text-sm text-foreground">{result.status === "busy" ? "Réessaie dans une minute, ou scanne le code-barres." : "La recherche a besoin d'internet. Le scan fonctionne avec les produits déjà vus."}</p>
            <Button variant="outline" className="mt-3 h-12 border-ochre-ink/40" onClick={retry}>
              Réessayer
            </Button>
          </div>
        </div>
      ) : result.hits.length === 0 ? (
        <EmptyState illustration="sprig" title={`Rien trouvé pour « ${query} »`}>
          Essaie un nom plus court ou une marque, ou scanne le code-barres.
        </EmptyState>
      ) : (
        <ul className="paper divide-y divide-border overflow-hidden rounded-3xl border border-border shadow-card lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:shadow-none lg:[background:none]">
          {result.hits.map((h) => (
            <li key={h.code} className="bg-card lg:overflow-hidden lg:rounded-2xl lg:border lg:border-border lg:shadow-card">
              {/* Fiche partielle : l'alerte bébé n'apparaît qu'une fois la fiche complète ouverte. */}
              <ProductRow code={h.code} product={h.product} mark={s.products?.[h.code]?.mark} warn={false} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
