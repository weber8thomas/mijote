import { INGREDIENTS, MONTHS, seasonalProduce, type Recipe } from "@mijote/shared";
import { Camera, ChevronLeft, Link2, Lightbulb, PenLine, Refrigerator, Sparkles } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, getState, ingredientsOf, recipesOf, today, useStore } from "@/data/store";
import { hasServerAi, isServerMode } from "@/data/sync";
import { AiError, fromInventory, fromPhoto, fromUrl, ideas, type AiRecipe, type AiTarget } from "@/lib/claude";
import { go } from "@/lib/router";
import { cn } from "@/lib/utils";

/** Où demander à Claude : au serveur du foyer s'il a une clé, sinon avec la clé de cet appareil (vitrine). */
export const aiConfig = (): AiTarget | null => {
  if (isServerMode()) return hasServerAi() ? "server" : null;
  const ai = getState().integrations?.ai;
  return ai?.apiKey ? { apiKey: ai.apiKey, model: ai.model } : null;
};

/** Ce qu'il y a à la maison : inventaire + basiques du placard en stock. */
export function atHomeNames() {
  const s = getState();
  const byId = ingredientsOf(s).byId;
  const names = [...(s.inventory ?? []).map((i) => i.name), ...Object.keys(s.pantry).filter((k) => s.pantry[k]).map((k) => byId.get(k)?.name ?? k)];
  return [...new Set(names)];
}

/**
 * Lance un appel à Claude (limite du jour comprise) et range le résultat parmi les brouillons.
 * Les ingrédients nouveaux sont ajoutés « à vérifier » pour que la fiche s'affiche.
 */
export async function runAi(call: (cfg: AiTarget) => Promise<AiRecipe[]>): Promise<Recipe[]> {
  const cfg = aiConfig();
  if (!cfg) throw new AiError("Relie Claude dans les réglages.", "auth");
  // Avec le serveur, la limite du jour est comptée là-bas, pour tout le foyer.
  if (cfg !== "server" && !actions.useAiCall()) throw new AiError("Limite d'appels du jour atteinte (réglable dans les réglages).", "rate");
  const results = await call(cfg);
  if (!results.length) throw new AiError("Aucune recette ne passe les règles bébé. Réessaie.", "invalid");
  actions.addIngredients(results.flatMap((r) => r.newIngredients));
  const recipes = results.map((r) => r.recipe);
  actions.addAiDrafts(recipes);
  return recipes;
}

const monthName = () => MONTHS[today().getMonth()];

/** Les entrées « Nouvelle recette » : idées, avec ce que j'ai, lien, photo, à la main. */
export function NewRecipeSheet({
  open,
  onOpenChange,
  onRun,
  onDemoIdeas,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Lance la génération ; le parent affiche les brouillons. */
  onRun: (label: string, run: () => Promise<Recipe[]>) => void;
  /** Sans clé : idées pré-écrites de la démo. */
  onDemoIdeas: () => void;
}) {
  useStore(); // suit la clé enregistrée dans les réglages
  const hasAi = !!aiConfig();
  const [mode, setMode] = useState<"menu" | "ideas" | "link">("menu");
  const [url, setUrl] = useState("");
  const photo = useRef<HTMLInputElement>(null);
  const home = atHomeNames();

  const close = () => {
    onOpenChange(false);
    setMode("menu");
  };
  const ingredients = () => ingredientsOf(getState()).list;

  const runIdeas = (slot?: "lunch" | "dinner" | "dessert") => {
    close();
    const st = getState();
    const all = recipesOf(st).all;
    const month = today().getMonth() + 1;
    onRun("Idées de saison", () =>
      runAi((cfg) =>
        ideas(cfg, ingredients(), {
          month: monthName(),
          slot,
          seasonal: seasonalProduce(INGREDIENTS, month).map((i) => i.name),
          favorites: all.filter((r) => r.status === "favorite").map((r) => r.title),
          excluded: all.filter((r) => r.status === "excluded").map((r) => r.title),
        }),
      ),
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title={mode === "link" ? "Importer un lien" : mode === "ideas" ? "Idées de saison" : "Nouvelle recette"}
      description={hasAi ? "Claude propose, le linter bébé vérifie, tu gardes ce qui te plaît." : "Relie Claude dans les réglages pour tout débloquer."}
    >
      {mode !== "menu" && (
        <button type="button" onClick={() => setMode("menu")} className="-mt-1 mb-2 flex h-10 items-center gap-1 text-sm font-semibold text-muted-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Retour
        </button>
      )}

      {mode === "menu" && (
        <div className="space-y-2.5">
          <Entry icon={<Lightbulb className="size-5" />} title="Idées de saison" hint={hasAi ? "Selon le mois et vos favoris." : "Démo : idées pré-écrites."} onClick={() => (hasAi ? setMode("ideas") : (close(), onDemoIdeas()))} />
          <Entry
            icon={<Refrigerator className="size-5" />}
            title="Avec ce que j'ai"
            hint={home.length ? `${home.length} produits à la maison.` : "Remplis d'abord le placard."}
            disabled={!hasAi || !home.length}
            onClick={() => {
              close();
              onRun("Avec ce que j'ai", () => runAi((cfg) => fromInventory(cfg, ingredients(), home, monthName())));
            }}
          />
          <Entry icon={<Link2 className="size-5" />} title="Importer un lien" hint="Une recette trouvée sur le web." disabled={!hasAi} onClick={() => setMode("link")} />
          <Entry icon={<Camera className="size-5" />} title="Photo d'une recette" hint="Livre, écran ou fiche écrite à la main." disabled={!hasAi} onClick={() => photo.current?.click()} />
          <Entry
            icon={<PenLine className="size-5" />}
            title="Écrire ma recette"
            hint="À la main, étape par étape."
            onClick={() => {
              close();
              go("/recettes/nouvelle");
            }}
          />
          {!hasAi && (
            <Button variant="outline" className="h-12 w-full" onClick={() => (close(), go("/reglages"))}>
              <Sparkles aria-hidden /> Relier Claude
            </Button>
          )}
          <input
            ref={photo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              close();
              onRun("Photo d'une recette", () => runAi((cfg) => fromPhoto(cfg, ingredients(), file)));
            }}
          />
        </div>
      )}

      {mode === "ideas" && (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [undefined, "Un peu de tout"],
              ["lunch", "Déjeuners"],
              ["dinner", "Dîners"],
              ["dessert", "Desserts"],
            ] as const
          ).map(([slot, label]) => (
            <Button key={label} variant={slot ? "outline" : "default"} className="h-14 text-base" onClick={() => runIdeas(slot)}>
              {label}
            </Button>
          ))}
        </div>
      )}

      {mode === "link" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const link = url.trim();
            if (!/^https?:\/\//.test(link)) return;
            close();
            setUrl("");
            onRun("Recette importée", () => runAi((cfg) => fromUrl(cfg, ingredients(), link)));
          }}
        >
          <Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" placeholder="https://…" autoFocus className="h-12 text-base" aria-label="Adresse de la recette" />
          <Button type="submit" className="h-12 w-full" disabled={!/^https?:\/\//.test(url.trim())}>
            <Link2 aria-hidden /> Importer
          </Button>
          <p className="text-xs text-muted-foreground">Claude lit la page, garde l'esprit du plat et l'adapte à bébé.</p>
        </form>
      )}
    </Sheet>
  );
}

function Entry({ icon, title, hint, onClick, disabled }: { icon: ReactNode; title: string; hint: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("flex min-h-16 w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-card ring-1 ring-border transition-colors hover:bg-muted", disabled && "opacity-55")}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
