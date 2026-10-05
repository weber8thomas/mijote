import { illustrationOf, INGREDIENTS, MONTHS, rankByInventory, seasonalProduce, SLOT_LABELS, type Ingredient, type Recipe, type Slot } from "@mijote/shared";
import { Command } from "cmdk";
import { AlertTriangle, ArrowLeft, ChevronRight, Globe, Loader2, PackageSearch, Refrigerator, ScanBarcode, Search, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Art, Plate } from "@/components/art";
import { Chip, RecipeMeta } from "@/components/kit";
import { runAi } from "@/components/new-recipe-sheet";
import { NutriBadge, ProductThumb } from "@/components/product";
import { openScan } from "@/components/scan";
import { actions, getState, ingredientsOf, recipesOf, today, useRecipes, useStore } from "@/data/store";
import { ideas } from "@/lib/claude";
import { go } from "@/lib/router";
import { normalize } from "@/lib/text";
import { cn } from "@/lib/utils";

// Recherche plein écran (recettes et ingrédients), ouverte depuis la loupe de l'en-tête,
// ou depuis le choix d'un repas (« Autre recette… ») : elle est alors limitée au créneau et choisit la recette.

export type PickMode = {
  slot: Slot;
  title: string;
  onPick: (r: Recipe) => void;
  /** Recette qui déclencherait une alerte d'équilibre (affichée, mais signalée). */
  warns?: (r: Recipe) => boolean;
  /** Recettes à masquer (déjà au menu). */
  hidden?: Set<string>;
};

// Ouverture de la recherche globale depuis n'importe où (loupe, raccourci clavier).
let globalOpen = false;
const listeners = new Set<() => void>();
const setGlobal = (v: boolean) => {
  globalOpen = v;
  listeners.forEach((l) => l());
};
export const openSearch = () => setGlobal(true);
const useGlobalOpen = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => globalOpen,
  );

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]");
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
      e.preventDefault();
      setGlobal(true);
    }
  });
}

/** Recherche globale, montée une fois à la racine. */
export function GlobalSearch() {
  const open = useGlobalOpen();
  return <SearchDialog open={open} onOpenChange={setGlobal} />;
}

export function SearchDialog({ open, onOpenChange, pick }: { open: boolean; onOpenChange: (o: boolean) => void; pick?: PickMode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#2f2a24]/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          className="paper fixed inset-0 z-50 flex flex-col outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 sm:inset-x-auto sm:top-[8vh] sm:bottom-auto sm:left-1/2 sm:h-[80vh] sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[1.75rem] sm:shadow-float"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{pick ? pick.title : "Rechercher"}</DialogPrimitive.Title>
          {open && <SearchBody pick={pick} onClose={() => onOpenChange(false)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SearchBody({ pick, onClose }: { pick?: PickMode; onClose: () => void }) {
  const s = useStore();
  const { all } = useRecipes();
  const ingredients = ingredientsOf(s);
  const [q, setQ] = useState("");
  const nq = normalize(q.trim());
  // Choix d'un repas : filtre « Avec ce que j'ai » et idées de Claude pour ce repas.
  const [homeOnly, setHomeOnly] = useState(false);
  const [ai, setAi] = useState<{ loading: boolean; recipes: Recipe[]; error?: string } | null>(null);
  const hasAi = !!s.integrations?.ai?.apiKey;
  const atHome = useMemo(() => {
    if (!pick) return new Map<string, number>();
    const ids = new Set((s.inventory ?? []).flatMap((i) => (i.ingredientId ? [i.ingredientId] : [])));
    return new Map(rankByInventory(all, ids, ingredients.byId).map((m, i) => [m.recipe.id, i]));
  }, [pick, s.inventory, all, ingredients]);
  const askClaude = () => {
    if (!pick) return;
    setAi({ loading: true, recipes: [] });
    const all = recipesOf(getState()).all;
    const month = today().getMonth() + 1;
    runAi((cfg) =>
      ideas(cfg, ingredientsOf(getState()).list, {
        month: MONTHS[month - 1],
        slot: pick.slot,
        count: 3,
        seasonal: seasonalProduce(INGREDIENTS, month).map((i) => i.name),
        favorites: all.filter((r) => r.status === "favorite").map((r) => r.title),
        excluded: all.filter((r) => r.status === "excluded").map((r) => r.title),
      }),
    ).then(
      (recipes) => setAi({ loading: false, recipes }),
      (e: unknown) => setAi({ loading: false, recipes: [], error: e instanceof Error ? e.message : String(e) }),
    );
  };

  const haystack = useMemo(
    () => new Map(all.map((r) => [r.id, { title: normalize(r.title), rest: normalize(`${r.description ?? ""} ${r.ingredients.map((i) => ingredients.byId.get(i.ingredientId)?.name).join(" ")}`) }])),
    [all, ingredients],
  );

  const recipes = useMemo(() => {
    const pool = all.filter((r) => r.status !== "excluded" && (!pick || (r.slots.includes(pick.slot) && !pick.hidden?.has(r.id))) && (!homeOnly || atHome.has(r.id)));
    if (homeOnly && !nq) return pool.sort((a, b) => atHome.get(a.id)! - atHome.get(b.id)!);
    if (!nq) return pool.sort((a, b) => Number(b.status === "favorite") - Number(a.status === "favorite") || a.title.localeCompare(b.title));
    return pool
      .map((r) => {
        const h = haystack.get(r.id)!;
        const words = nq.split(/\s+/);
        if (!words.every((w) => h.title.includes(w) || h.rest.includes(w))) return null;
        return { r, rank: (h.title.startsWith(nq) ? 0 : h.title.includes(nq) ? 1 : 2) + (r.status === "favorite" ? -0.5 : 0) };
      })
      .filter((x): x is { r: Recipe; rank: number } => !!x)
      .sort((a, b) => a.rank - b.rank || a.r.title.localeCompare(b.r.title))
      .map((x) => x.r);
  }, [all, nq, pick, haystack, homeOnly, atHome]);

  const matchingIngredients = useMemo(() => {
    if (pick || nq.length < 2) return [];
    const used = new Set(all.flatMap((r) => r.ingredients.map((i) => i.ingredientId)));
    return ingredients.list.filter((i) => used.has(i.id) && normalize(i.name).includes(nq)).slice(0, 6);
  }, [pick, nq, all, ingredients]);

  // Produits déjà vus (« Mes produits ») dont le nom ou la marque contient tous les mots cherchés.
  const myProducts = useMemo(() => {
    if (pick || nq.length < 2) return [];
    const words = nq.split(/\s+/);
    return Object.entries(s.products ?? {})
      .filter(([, m]) => {
        const h = normalize(`${m.product.name} ${m.product.brand ?? ""}`);
        return words.every((w) => h.includes(w));
      })
      .sort(([, a], [, b]) => b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 4);
  }, [pick, nq, s.products]);

  const choose = (r: Recipe) => {
    onClose();
    // Idée de Claude choisie : elle rejoint les recettes du foyer.
    if (r.source === "ai" && !recipesOf(getState()).byId.has(r.id)) {
      actions.addRecipe(r);
      actions.removeAiDraft(r.id);
    }
    if (pick) pick.onPick(r);
    else go(`/recettes/${r.slug}`);
  };

  return (
    <Command shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col" label={pick ? pick.title : "Rechercher une recette, un ingrédient ou un produit"}>
      <div className="pt-safe shrink-0 border-b border-border">
        <div className="flex items-center gap-1 px-2 py-2">
          <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Fermer la recherche">
            <ArrowLeft className="size-5" />
          </button>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Command.Input
              autoFocus
              value={q}
              onValueChange={setQ}
              placeholder={pick ? `Chercher pour : ${pick.title.toLowerCase()}` : "Recette, ingrédient, produit…"}
              className="h-12 w-full rounded-full bg-paper-deep/70 pr-11 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground" aria-label="Effacer">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        {pick && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5">
            <Chip active={homeOnly} onClick={() => setHomeOnly((v) => !v)}>
              <Refrigerator className="size-4" aria-hidden /> Avec ce que j'ai
            </Chip>
            {hasAi && (
              <Chip active={!!ai} onClick={askClaude}>
                <Sparkles className="size-4" aria-hidden /> Idées de Claude
              </Chip>
            )}
          </div>
        )}
      </div>

      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-6">
        <Command.Empty className="px-4 py-10 text-center text-muted-foreground">Rien trouvé pour « {q} ».</Command.Empty>

        {matchingIngredients.length > 0 && (
          <Command.Group heading="Ingrédients" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase">
            {matchingIngredients.map((i) => (
              <IngredientItem
                key={i.id}
                ingredient={i}
                count={all.filter((r) => r.status !== "excluded" && r.ingredients.some((x) => x.ingredientId === i.id)).length}
                onSelect={() => {
                  onClose();
                  go(`/recettes/ingredient/${i.id}`);
                }}
              />
            ))}
          </Command.Group>
        )}

        {!pick && (
          <Command.Group heading="Produits" className={GROUP}>
            {nq ? (
              <>
                {myProducts.map(([code, m]) => (
                  <Command.Item
                    key={code}
                    value={`prod-${code}`}
                    onSelect={() => {
                      onClose();
                      go(`/produit/${encodeURIComponent(code)}`);
                    }}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 data-[selected=true]:bg-muted"
                  >
                    <ProductThumb product={m.product} className="size-11 rounded-xl" artClassName="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.product.brand ?? "Mes produits"}</span>
                    </span>
                    {m.product.nutriscore && <NutriBadge grade={m.product.nutriscore} className="size-7 text-xs" />}
                  </Command.Item>
                ))}
                {nq.length >= 2 && (
                  <ActionItem
                    value="prod-off"
                    icon={<Globe className="size-5" />}
                    title={`Chercher « ${q.trim()} » dans Open Food Facts`}
                    hint="Produits du commerce : Nutri-Score, alertes bébé"
                    onSelect={() => {
                      onClose();
                      go(`/produits?q=${encodeURIComponent(q.trim())}`);
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <ActionItem
                  value="prod-scan"
                  icon={<ScanBarcode className="size-5" />}
                  title="Scanner un produit"
                  hint="Nutri-Score, additifs, alertes bébé"
                  onSelect={() => {
                    onClose();
                    openScan("fiche");
                  }}
                />
                <ActionItem
                  value="prod-mine"
                  icon={<PackageSearch className="size-5" />}
                  title="Mes produits"
                  hint="Récents, favoris, à éviter"
                  onSelect={() => {
                    onClose();
                    go("/produits");
                  }}
                />
              </>
            )}
          </Command.Group>
        )}

        {ai && (
          <Command.Group heading="Proposées par Claude" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase">
            {ai.loading && (
              <Command.Loading>
                <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Claude cherche 3 idées pour ce repas…
                </p>
              </Command.Loading>
            )}
            {ai.error && <p className="mx-2 rounded-2xl bg-ochre-soft/80 px-3 py-2.5 text-sm text-ochre-ink">{ai.error}</p>}
            {ai.recipes.map((r) => (
              <Command.Item key={r.id} value={r.id} onSelect={() => choose(r)} className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 data-[selected=true]:bg-muted">
                <span className="grid size-16 shrink-0 place-items-center">
                  <Plate recipe={r} className="h-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 leading-snug font-bold">{r.title}</span>
                  <RecipeMeta recipe={r} compact dense className="mt-0.5" />
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group
          heading={nq ? `Recettes · ${recipes.length}` : homeOnly ? `Avec ce que j'ai · ${recipes.length}` : pick ? "Toutes les recettes possibles" : "Toutes les recettes"}
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase"
        >
          {recipes.map((r) => (
            <Command.Item
              key={r.id}
              value={r.id}
              onSelect={() => choose(r)}
              className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 data-[selected=true]:bg-muted"
            >
              <span className="grid size-16 shrink-0 place-items-center">
                <Plate recipe={r} className="h-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 leading-snug font-bold">{r.title}</span>
                <span className="mt-0.5 flex items-center gap-2">
                  {!pick && <span className="text-xs text-muted-foreground">{r.slots.map((x) => SLOT_LABELS[x]).join(" · ")}</span>}
                  <RecipeMeta recipe={r} compact dense />
                </span>
              </span>
              {pick?.warns?.(r) && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-ochre-soft px-2 py-1 text-[0.68rem] font-bold text-ochre-ink" title="Déséquilibre la semaine (alerte douce)">
                  <AlertTriangle className="size-3" aria-hidden /> équilibre
                </span>
              )}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command>
  );
}

const GROUP =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase";

function ActionItem({ value, icon, title, hint, onSelect }: { value: string; icon: React.ReactNode; title: string; hint: string; onSelect: () => void }) {
  return (
    <Command.Item value={value} onSelect={onSelect} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 data-[selected=true]:bg-muted">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Command.Item>
  );
}

function IngredientItem({ ingredient, count, onSelect }: { ingredient: Ingredient; count: number; onSelect: () => void }) {
  return (
    <Command.Item value={`ing-${ingredient.id}`} onSelect={onSelect} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-2 py-1.5 data-[selected=true]:bg-muted">
      <span className="grid size-11 shrink-0 place-items-center">
        <Art name={ingredientArt(ingredient.id)} className="size-11" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold first-letter:uppercase">{ingredient.name}</span>
        <span className="text-xs text-muted-foreground">
          {count} recette{count > 1 ? "s" : ""}
        </span>
      </span>
    </Command.Item>
  );
}

/** Illustration d'un ingrédient (repli : brin de feuillage). */
export const ingredientArt = (id: string) => illustrationOf(id) ?? "sprig";

/** Bouton loupe de l'en-tête. */
export function SearchButton({ className, label = false }: { className?: string; label?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={openSearch}
      className={cn("flex items-center gap-3 rounded-full", label ? "h-12 px-4 font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground" : "grid size-11 place-items-center hover:bg-muted", className)}
      aria-label="Rechercher une recette, un ingrédient ou un produit"
    >
      <Search className="size-5" aria-hidden />
      {label && (
        <>
          Rechercher <kbd className="ml-auto rounded-md border border-border-strong px-1.5 text-xs font-semibold">/</kbd>
        </>
      )}
    </motion.button>
  );
}
