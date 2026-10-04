import { AI_SAMPLES, isInSeason, SLOT_LABELS, type Recipe, type Slot } from "@mijote/shared";
import { Command as CommandPrimitive } from "cmdk";
import { Ban, Heart, Inbox, MoreHorizontal, RotateCcw, Search, Sparkles, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RecipeCard } from "@/components/cards";
import { Chip, EmptyState, PageHeader, Segmented } from "@/components/kit";
import { NewRecipeSheet } from "@/components/new-recipe-sheet";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { actions, ingredientsOf, today, useRecipes, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { normalize } from "@/lib/text";
import { cn } from "@/lib/utils";

type Filter = Slot | "season" | "favorite" | "quick" | "longCook" | "iron";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "lunch", label: SLOT_LABELS.lunch },
  { id: "dinner", label: SLOT_LABELS.dinner },
  { id: "dessert", label: SLOT_LABELS.dessert },
  { id: "season", label: "De saison" },
  { id: "favorite", label: "Favoris" },
  { id: "quick", label: "Rapide" },
  { id: "longCook", label: "Mijote" },
  { id: "iron", label: "Riche en fer" },
];

/** ingredient : n'afficher que les recettes qui le contiennent (lien depuis la recherche). */
export function RecipesView({ ingredient }: { ingredient?: string } = {}) {
  const s = useStore();
  const { all } = useRecipes();
  const ingredients = ingredientsOf(s).byId;
  const [tab, setTab] = useState<"active" | "excluded">("active");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [creating, setCreating] = useState(false);
  const pending = s.aiDrafts ?? [];

  // Sans clé Claude : une fournée de 6 idées pré-écrites pas encore vues (démo).
  const demoIdeas = () => {
    const kept = new Set(s.customRecipes.map((r) => r.id));
    const fresh = AI_SAMPLES.filter((r) => !s.draftsSeen.includes(r.id) && !kept.has(r.id));
    const pool = fresh.length >= 6 ? fresh : AI_SAMPLES.filter((r) => !kept.has(r.id));
    const recipes = pool.slice(0, 6);
    setDrafts({ label: "Nouveautés de saison", recipes, loading: true, ai: false });
    window.setTimeout(() => {
      setDrafts((d) => d && { ...d, loading: false });
      actions.markDraftsSeen(recipes.map((r) => r.id));
    }, 1400);
  };

  // Avec Claude : la feuille montre l'attente, puis les brouillons (ou l'erreur).
  const run = (label: string, call: () => Promise<Recipe[]>) => {
    setDrafts({ label, recipes: [], loading: true, ai: true });
    call().then(
      (recipes) => setDrafts((d) => d && { ...d, recipes, loading: false }),
      (e: unknown) => setDrafts((d) => d && { ...d, loading: false, error: e instanceof Error ? e.message : String(e) }),
    );
  };
  const month = today().getMonth() + 1;

  const toggle = (f: Filter) =>
    setFilters((cur) => {
      const next = new Set(cur);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const list = useMemo(() => {
    const slotFilters = [...filters].filter((f): f is Slot => ["lunch", "dinner", "dessert"].includes(f));
    const nq = normalize(q.trim());
    return all
      .filter((r) => (tab === "excluded" ? r.status === "excluded" : r.status !== "excluded"))
      .filter((r) => !slotFilters.length || r.slots.some((x) => slotFilters.includes(x)))
      .filter((r) => !filters.has("season") || isInSeason(r, ingredients, month))
      .filter((r) => !filters.has("favorite") || r.status === "favorite")
      .filter((r) => !filters.has("quick") || r.prepMinutes + r.cookMinutes < 20)
      .filter((r) => !filters.has("longCook") || r.longCook)
      .filter((r) => !filters.has("iron") || r.ironScore >= 2)
      .filter((r) => !ingredient || r.ingredients.some((i) => i.ingredientId === ingredient))
      .filter((r) => !nq || normalize(`${r.title} ${r.description ?? ""} ${r.ingredients.map((i) => ingredients.get(i.ingredientId)?.name).join(" ")}`).includes(nq))
      .sort((a, b) => Number(b.status === "favorite") - Number(a.status === "favorite") || a.title.localeCompare(b.title));
  }, [all, tab, filters, q, ingredients, month, ingredient]);

  return (
    <Shell tab="recipes">
      <PageHeader title="Recettes" subtitle={`${all.filter((r) => r.status !== "excluded").length} recettes de famille`} />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button size="lg" className="h-12" onClick={() => setCreating(true)}>
          <Sparkles aria-hidden /> Nouvelle recette
        </Button>
        <Button size="lg" variant="outline" className="h-12" disabled={!pending.length} onClick={() => setDrafts({ label: "Brouillons", recipes: pending, loading: false, ai: true })}>
          <Inbox aria-hidden /> Brouillons{pending.length ? ` (${pending.length})` : ""}
        </Button>
      </div>

      <CommandPrimitive shouldFilter={false} className="relative mb-3" label="Rechercher une recette">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <CommandPrimitive.Input
          value={q}
          onValueChange={setQ}
          placeholder="Courge, lentilles, overnight…"
          className="h-12 w-full rounded-full border border-border-strong bg-card pr-12 pl-12 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-muted-foreground" aria-label="Effacer">
            <X className="size-4" />
          </button>
        )}
        <CommandPrimitive.List className="hidden" />
      </CommandPrimitive>

      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Chip key={f.id} active={filters.has(f.id)} onClick={() => toggle(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {ingredient && (
        <button type="button" onClick={() => go("/recettes")} className="mb-3 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <span className="first-letter:uppercase">Avec : {ingredients.get(ingredient)?.name ?? ingredient}</span>
          <X className="size-4" aria-hidden />
          <span className="sr-only">Retirer ce filtre</span>
        </button>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: "active", label: "Au menu" },
          { value: "excluded", label: `Écartées (${all.filter((r) => r.status === "excluded").length})` },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState illustration={tab === "excluded" ? "oignon" : "champignon"} title={tab === "excluded" ? "Aucune recette écartée" : "Aucune recette ne correspond"}>
          {tab === "excluded" ? "Les recettes écartées ne sont plus jamais proposées. Tu peux les restaurer ici." : "Essaie d'enlever un filtre."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onTap={() => go(`/recettes/${r.slug}`)}
              eyebrow={r.slots.map((x) => SLOT_LABELS[x]).join(" · ")}
              corner={<RecipeActions recipe={r} />}
            />
          ))}
        </div>
      )}

      <NewRecipeSheet open={creating} onOpenChange={setCreating} onRun={run} onDemoIdeas={demoIdeas} />
      <DraftsSheet drafts={drafts} onClose={() => setDrafts(null)} />
    </Shell>
  );
}

function RecipeActions({ recipe }: { recipe: Recipe }) {
  const fav = recipe.status === "favorite";
  if (recipe.status === "excluded")
    return (
      <button
        type="button"
        onClick={() => {
          actions.setStatus(recipe.id, "active");
          toast(`« ${recipe.title} » est de retour`);
        }}
        className="grid size-11 place-items-center rounded-full bg-card/90 shadow-card"
        aria-label={`Restaurer ${recipe.title}`}
      >
        <RotateCcw className="size-4.5" />
      </button>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => actions.setStatus(recipe.id, fav ? "active" : "favorite")}
        aria-pressed={fav}
        aria-label={fav ? `Retirer ${recipe.title} des favoris` : `Ajouter ${recipe.title} aux favoris`}
        className="grid size-11 place-items-center rounded-full bg-card/90 shadow-card"
      >
        <motion.span key={String(fav)} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
          <Heart className={cn("size-5", fav ? "fill-terracotta text-terracotta" : "text-foreground")} />
        </motion.span>
      </button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="grid size-11 place-items-center rounded-full bg-card/90 shadow-card" aria-label={`Plus d'actions pour ${recipe.title}`}>
          <MoreHorizontal className="size-5" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-2xl bg-popover p-1.5 shadow-float ring-1 ring-border">
            <DropdownMenu.Item
              onSelect={() => {
                actions.setStatus(recipe.id, "excluded");
                toast(`« ${recipe.title} » ne sera plus proposée`, { action: { label: "Annuler", onClick: () => actions.setStatus(recipe.id, recipe.status) } });
              }}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-destructive outline-none data-highlighted:bg-muted"
            >
              <Ban className="size-4" /> Écarter
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}

type Drafts = { label: string; recipes: Recipe[]; loading: boolean; error?: string; ai: boolean };

/** Brouillons de recettes (Claude, ou idées pré-écrites de la démo) : garder ou jeter. Déjà validés par le linter bébé. */
function DraftsSheet({ drafts, onClose }: { drafts: Drafts | null; onClose: () => void }) {
  const s = useStore();
  const kept = new Set(s.customRecipes.map((r) => r.id));
  const [thrown, setThrown] = useState<Set<string>>(new Set());
  const list = drafts?.recipes ?? [];

  return (
    <Sheet
      open={!!drafts}
      onOpenChange={(o) => !o && onClose()}
      title={drafts?.label ?? ""}
      description={drafts?.ai ? "Proposées par Claude, vérifiées par le linter bébé. Garde ce qui te plaît." : "Démo : idées pré-écrites. Relie Claude dans les réglages pour de vraies propositions."}
    >
      {drafts?.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: drafts.ai ? 4 : 6 }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-paper-deep" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
          <p className="col-span-full text-center text-sm text-muted-foreground">{drafts.ai ? "Claude cuisine des idées… (jusqu'à une minute)" : "Mijoté cherche des idées de saison…"}</p>
        </div>
      ) : drafts?.error ? (
        <p className="rounded-2xl bg-ochre-soft/80 p-4 text-sm text-ochre-ink">{drafts.error}</p>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Tu as déjà gardé toutes les idées de la démo.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((r) => {
            const isKept = kept.has(r.id);
            const isThrown = thrown.has(r.id);
            return (
              <div key={r.id} className={cn("flex flex-col gap-2 transition-opacity", isThrown && "opacity-40")}>
                <RecipeCard recipe={r} onTap={() => go(`/recettes/${r.slug}`)} eyebrow={r.slots.map((x) => SLOT_LABELS[x]).join(" · ")} />
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={isKept ? "secondary" : "default"}
                    className="h-11"
                    disabled={isKept || isThrown}
                    onClick={() => {
                      actions.addRecipe({ ...r, createdAt: new Date().toISOString() });
                      if (drafts?.ai) actions.removeAiDraft(r.id);
                      toast.success(`« ${r.title} » ajoutée à tes recettes`);
                    }}
                  >
                    {isKept ? "Gardée" : "Garder"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={isKept || isThrown}
                    onClick={() => {
                      setThrown((t) => new Set(t).add(r.id));
                      if (drafts?.ai) actions.removeAiDraft(r.id);
                    }}
                    aria-label={`Jeter ${r.title}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
