import {
  guessLocation,
  illustrationOf,
  LOCATION_LABELS,
  PANTRY_BASICS,
  parseShoppingText,
  rankByInventory,
  formatQty,
  type Ingredient,
  type InventoryItem,
  type ProductInfo,
  type StorageLocation,
} from "@mijote/shared";
import { ArrowRightLeft, Camera, Check, ChevronRight, PackageSearch, Plus, ScanBarcode, ShoppingBasket, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Art } from "@/components/art";
import { FridgePhotoSheet } from "@/components/fridge-photo";
import { Chip, EmptyState, PageHeader, RecipeVisual, Segmented } from "@/components/kit";
import { addNameToShopping, INTO, LOCATIONS, LocationPicker, NutriBadge, ProductDetails, storedToast } from "@/components/product";
import { openScan } from "@/components/scan";
import { Shell } from "@/components/shell";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { actions, ingredientsOf, recipesOf, useStore } from "@/data/store";
import { go } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Placard & frigo : ce qu'il y a à la maison. Scan d'un code-barres (Open Food Facts), ajout à la main,
// basiques du placard, et idées de recettes avec ce qu'on a déjà.

const EMPTY: Record<StorageLocation, { art: string; title: string }> = {
  placard: { art: "lentilles", title: "Placard vide" },
  frigo: { art: "oeuf", title: "Frigo vide" },
  congelateur: { art: "petits-pois", title: "Congélateur vide" },
};

type NewItem = Omit<InventoryItem, "id" | "addedAt">;

const artOf = (item: { ingredientId?: string }) => (item.ingredientId ? (illustrationOf(item.ingredientId) ?? "sprig") : "sprig");

function qtyLabel(item: InventoryItem): string | undefined {
  if (item.qty && item.unit) return item.unit === "piece" ? `× ${formatQty(item.qty, "piece")}` : formatQty(item.qty, item.unit);
  return item.product?.quantity;
}

function removeItem(item: InventoryItem) {
  actions.removeInventory(item.id);
  const { id: _id, addedAt: _at, ...rest } = item;
  void _id;
  void _at;
  toast(`${item.name} : retiré`, { action: { label: "Annuler", onClick: () => actions.addInventory([rest]) } });
}

function moveItem(item: InventoryItem, location: StorageLocation) {
  if (item.location === location) return;
  const from = item.location;
  actions.updateInventory(item.id, { location });
  toast(`${item.name} : rangé ${INTO[location]}`, { action: { label: "Annuler", onClick: () => actions.updateInventory(item.id, { location: from }) } });
}

/** scan : ouvrir directement le scanner (raccourci d'appli « Scanner un produit »). */
export function PantryView({ scan: scanFirst = false }: { scan?: boolean } = {}) {
  const s = useStore();
  const { list, byId } = ingredientsOf(s);
  const inventory = useMemo(() => s.inventory ?? [], [s.inventory]);
  const [location, setLocation] = useState<StorageLocation>("placard");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = inventory.find((i) => i.id === openId);

  const counts = useMemo(() => Object.fromEntries(LOCATIONS.map((l) => [l, inventory.filter((i) => i.location === l).length])) as Record<StorageLocation, number>, [inventory]);
  const shown = useMemo(() => inventory.filter((i) => i.location === location).sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name, "fr")), [inventory, location]);

  const ideas = useMemo(() => {
    const atHome = new Set(inventory.flatMap((i) => (i.ingredientId ? [i.ingredientId] : [])));
    return atHome.size ? rankByInventory(recipesOf(s).all, atHome, byId).slice(0, 5) : [];
  }, [inventory, s, byId]);

  const added = (items: InventoryItem[]) => {
    if (!items.length) return;
    setLocation(items[0].location);
    storedToast(items);
  };
  // Après un scan, le rangement (et son toast) est fait par le scanner global : on montre juste le bon onglet.
  const openScanner = () => openScan("placard", { onStored: (items) => items[0] && setLocation(items[0].location) });

  // Raccourci #/placard/scanner : le lecteur s'ouvre tout de suite.
  const opened0 = useRef(false);
  useEffect(() => {
    if (!scanFirst || opened0.current) return;
    opened0.current = true;
    openScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanFirst]);

  // Photo du frigo, lue par Claude (seulement si une clé est enregistrée sur cet appareil).
  const hasAi = !!s.integrations?.ai?.apiKey;
  const [fridgePhoto, setFridgePhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoButton = hasAi && (
    <Button variant="outline" size="icon-lg" className="size-12 shrink-0 border-border-strong" onClick={() => photoInput.current?.click()} aria-label="Photo du frigo (Claude)">
      <Camera className="size-5" />
    </Button>
  );

  const bottomBar = (
    <div className="paper mx-auto flex max-w-3xl items-center gap-2 rounded-full p-2 shadow-float ring-1 ring-border lg:hidden">
      <Button variant="outline" size="lg" className="h-12 shrink-0 border-border-strong px-5" onClick={() => setAdding(true)}>
        <Plus aria-hidden /> Ajouter
      </Button>
      {photoButton}
      <Button size="lg" className="h-12 min-w-0 flex-1" onClick={openScanner}>
        <ScanBarcode aria-hidden /> Scanner un produit
      </Button>
    </div>
  );

  return (
    <Shell tab="shopping" bottomBar={bottomBar}>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) setFridgePhoto(file);
        }}
      />
      <FridgePhotoSheet photo={fridgePhoto} onClose={() => setFridgePhoto(null)} onAdded={added} />
      <PageHeader
        title="Placard & frigo"
        subtitle="Ce qu'il y a à la maison"
        actions={
          <>
            {/* Sur grand écran, les actions restent en haut (la barre du bas est réservée au mobile). */}
            <div className="mr-2 hidden items-center gap-2 lg:flex">
              <Button variant="outline" size="lg" className="h-12 border-border-strong" onClick={() => setAdding(true)}>
                <Plus aria-hidden /> Ajouter
              </Button>
              {photoButton}
              <Button size="lg" className="h-12" onClick={openScanner}>
                <ScanBarcode aria-hidden /> Scanner un produit
              </Button>
            </div>
            <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => go("/produits")} aria-label="Mes produits">
              <PackageSearch className="size-5" />
            </Button>
            <Button variant="ghost" size="icon-lg" className="size-12" onClick={() => go("/courses")} aria-label="Retour aux courses">
              <ShoppingBasket className="size-5" />
            </Button>
          </>
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-8">
        <section aria-label="Inventaire">
          <Segmented
            className="mb-4 flex w-full lg:w-auto"
            value={location}
            onChange={setLocation}
            options={LOCATIONS.map((l) => ({
              value: l,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {LOCATION_LABELS[l]}
                  <span className={cn("min-w-5 rounded-full px-1.5 text-xs tabular-nums", location === l ? "bg-primary-soft text-primary-ink" : "bg-card/70")}>{counts[l]}</span>
                </span>
              ),
            }))}
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              {shown.length === 0 ? (
                <EmptyState illustration={EMPTY[location].art} title={EMPTY[location].title}>
                  Scanne un produit ou ajoute-le à la main.
                </EmptyState>
              ) : (
                <ul className="paper divide-y divide-border overflow-hidden rounded-3xl border border-border shadow-card" aria-label={`${LOCATION_LABELS[location]} : ${shown.length} produits`}>
                  <AnimatePresence initial={false}>
                    {shown.map((item) => (
                      <motion.li key={item.id} layout="position" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <InventoryRow item={item} onOpen={() => setOpenId(item.id)} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        <div className="mt-8 flex flex-col gap-8 lg:mt-0">
          <PantryBasics ingredients={byId} />
          <CookIdeas ideas={ideas} ingredients={byId} empty={inventory.length === 0} />
        </div>
      </div>

      <AddSheet open={adding} onOpenChange={setAdding} ingredients={list} onAdded={added} />
      <ItemSheet item={opened} ingredient={opened?.ingredientId ? byId.get(opened.ingredientId) : undefined} onOpenChange={(o) => !o && setOpenId(null)} />
    </Shell>
  );
}

// ——— Une ligne de l'inventaire ———

function Thumb({ item, className }: { item: { ingredientId?: string; product?: ProductInfo }; className?: string }) {
  if (item.product?.image)
    return (
      <span className={cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-border", className)}>
        <img src={item.product.image} alt="" className="size-full object-contain" loading="lazy" decoding="async" />
      </span>
    );
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl bg-paper-deep", className)}>
      <Art name={artOf(item)} className="size-10" />
    </span>
  );
}

function InventoryRow({ item, onOpen }: { item: InventoryItem; onOpen: () => void }) {
  const qty = qtyLabel(item);
  const sub = [item.product?.brand, qty].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center">
      <button type="button" onClick={onOpen} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 pr-1 pl-3 text-left focus-visible:bg-muted focus-visible:outline-none" aria-label={`${item.name}${sub ? `, ${sub}` : ""} : voir la fiche`}>
        <Thumb item={item} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold first-letter:uppercase">{item.name}</span>
          {sub && <span className="block truncate text-sm text-muted-foreground">{sub}</span>}
        </span>
        {item.product?.nutriscore && <NutriBadge grade={item.product.nutriscore} />}
      </button>
      <MoveMenu item={item} />
      <button type="button" onClick={() => removeItem(item)} className="grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={`Retirer : ${item.name}`}>
        <Trash2 className="size-4.5" />
      </button>
    </div>
  );
}

function MoveMenu({ item }: { item: InventoryItem }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none data-[state=open]:bg-muted" aria-label={`Ranger ailleurs : ${item.name}`}>
        <ArrowRightLeft className="size-4.5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="paper z-50 min-w-48 rounded-2xl p-1.5 shadow-float ring-1 ring-border data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DropdownMenu.Label className="px-3 pt-1.5 pb-1 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">Ranger</DropdownMenu.Label>
          {LOCATIONS.map((l) => (
            <DropdownMenu.Item
              key={l}
              disabled={l === item.location}
              onSelect={() => moveItem(item, l)}
              className="flex h-12 cursor-pointer items-center gap-2 rounded-xl px-3 font-semibold outline-none data-[disabled]:cursor-default data-[disabled]:text-muted-foreground data-[highlighted]:bg-muted"
            >
              <span className="first-letter:uppercase">{INTO[l]}</span>
              {l === item.location && <Check className="ml-auto size-4" aria-label="(actuel)" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ItemSheet({ item, ingredient, onOpenChange }: { item?: InventoryItem; ingredient?: Ingredient; onOpenChange: (o: boolean) => void }) {
  const [weekStart] = useSelectedWeek();
  // Garde le contenu affiché pendant l'animation de fermeture.
  const [last, setLast] = useState(item);
  if (item && item !== last) setLast(item);
  const shown = item ?? last;
  return (
    <Sheet
      open={!!item}
      onOpenChange={onOpenChange}
      title={<span className="first-letter:uppercase">{shown?.name}</span>}
      description={shown ? `Rangé ${INTO[shown.location]}` : undefined}
      footer={
        shown && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              className="h-12"
              onClick={() => {
                removeItem(shown);
                onOpenChange(false);
              }}
            >
              <Trash2 aria-hidden /> Retirer
            </Button>
            <Button
              size="lg"
              className="h-12"
              onClick={() => {
                addNameToShopping(weekStart, ingredient?.name ?? shown.name);
                onOpenChange(false);
              }}
            >
              <ShoppingBasket aria-hidden /> Aux courses
            </Button>
          </div>
        )
      }
    >
      {shown && (
        <div className="flex flex-col gap-5">
          {shown.product ? (
            <ProductDetails product={shown.product} code={shown.barcode} hideName={shown.product.name === shown.name} />
          ) : (
            <div className="flex items-center gap-4">
              <Thumb item={shown} className="size-20 rounded-3xl [&_img]:size-16" />
              <div className="min-w-0">
                <p className="text-muted-foreground">{qtyLabel(shown) ?? (ingredient ? `Rayon ${ingredient.aisle.toLowerCase()}` : "Hors catalogue")}</p>
              </div>
            </div>
          )}
          <LocationPicker value={shown.location} onChange={(l) => moveItem(shown, l)} />
          {shown.barcode && (
            <Button
              variant="ghost"
              className="h-12 self-start px-3 text-primary-ink"
              onClick={() => {
                onOpenChange(false);
                go(`/produit/${encodeURIComponent(shown.barcode!)}`);
              }}
            >
              <PackageSearch aria-hidden /> Fiche complète, favori, à éviter
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ——— Ajout à la main ———

function AddSheet({ open, onOpenChange, ingredients, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; ingredients: Ingredient[]; onAdded: (items: InventoryItem[]) => void }) {
  const [text, setText] = useState("");
  const [where, setWhere] = useState<StorageLocation | "auto">("auto");
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const lines = useMemo(() => (text.trim() ? parseShoppingText(text, ingredients) : []), [text, ingredients]);
  const items: NewItem[] = lines.map((l) => {
    const ing = l.ingredientId ? byId.get(l.ingredientId) : undefined;
    return { name: ing?.name ?? l.label, ingredientId: ing?.id, qty: l.qty, unit: l.qty ? l.unit : undefined, location: where === "auto" ? guessLocation(ing) : where };
  });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!items.length) return;
    onAdded(actions.addInventory(items));
    setText("");
    setWhere("auto");
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter à la maison"
      description="Écris ce que tu as, séparé par des virgules."
      footer={
        <Button size="lg" className="h-14 w-full text-base" disabled={!items.length} onClick={() => submit()}>
          <Check aria-hidden /> {items.length > 1 ? `Ranger ${items.length} produits` : "Ranger"}
        </Button>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="add-text" className="sr-only">
            Produits à ajouter
          </label>
          <Textarea
            id="add-text"
            autoFocus
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            placeholder="3 carottes, du lait, 500 g de riz…"
            className="min-h-20 text-base md:text-base"
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Où le ranger ?</legend>
          <div className="flex flex-wrap gap-2">
            {(["auto", ...LOCATIONS] as const).map((l) => (
              <Chip key={l} active={where === l} onClick={() => setWhere(l)} className="h-12">
                {l === "auto" ? "Au bon endroit" : LOCATION_LABELS[l]}
              </Chip>
            ))}
          </div>
        </fieldset>
        {items.length > 0 && (
          <ul className="flex flex-col gap-1.5" aria-label="Aperçu">
            {items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex items-center gap-3 rounded-2xl bg-paper-deep/60 py-1.5 pr-3 pl-1.5">
                <Art name={artOf(it)} className="size-9" />
                <span className="min-w-0 flex-1 truncate font-semibold first-letter:uppercase">{it.name}</span>
                {it.qty && it.unit && <span className="text-sm text-muted-foreground tabular-nums">{it.unit === "piece" ? `× ${it.qty}` : formatQty(it.qty, it.unit)}</span>}
                <span className="text-xs font-semibold text-muted-foreground">{LOCATION_LABELS[it.location]}</span>
              </li>
            ))}
          </ul>
        )}
      </form>
    </Sheet>
  );
}

// ——— Basiques du placard ———

const BASICS_PREVIEW = 8;

function PantryBasics({ ingredients }: { ingredients: Map<string, Ingredient> }) {
  const s = useStore();
  const [all, setAll] = useState(false);
  const inStock = PANTRY_BASICS.filter((id) => s.pantry[id]).length;
  // Ce qui manque d'abord : c'est ce qu'on cherche en ouvrant le placard.
  const ordered = [...PANTRY_BASICS].sort((a, b) => Number(!!s.pantry[a]) - Number(!!s.pantry[b]));
  const shown = all ? ordered : ordered.slice(0, BASICS_PREVIEW);
  return (
    <section aria-labelledby="basics-title">
      <h2 id="basics-title" className="font-heading text-2xl">
        Basiques du placard
      </h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        Coche ce que tu as : ils ne seront pas ajoutés aux courses. <span className="font-semibold text-foreground tabular-nums">{inStock}</span> sur {PANTRY_BASICS.length} en stock.
      </p>
      <div id="basics-list" className="flex flex-wrap gap-2">
        {shown.map((id) => {
          const on = !!s.pantry[id];
          return (
            <Chip key={id} active={on} onClick={() => actions.setPantry(id, !on)} className="h-12 px-4">
              {on && <Check className="size-4" aria-hidden />}
              <span className="first-letter:uppercase">{ingredients.get(id)?.name ?? id}</span>
            </Chip>
          );
        })}
        {PANTRY_BASICS.length > BASICS_PREVIEW && (
          <Button variant="ghost" className="h-12 px-4 text-primary-ink" aria-expanded={all} aria-controls="basics-list" onClick={() => setAll((v) => !v)}>
            {all ? "Moins" : `Tout voir (${PANTRY_BASICS.length})`}
          </Button>
        )}
      </div>
    </section>
  );
}

// ——— Que cuisiner avec ça ? ———

function CookIdeas({ ideas, ingredients, empty }: { ideas: ReturnType<typeof rankByInventory>; ingredients: Map<string, Ingredient>; empty: boolean }) {
  const names = (ids: string[]) => ids.map((id) => ingredients.get(id)?.name ?? id);
  return (
    <section aria-labelledby="ideas-title" className="paper rounded-3xl border border-border p-4 shadow-card sm:p-5">
      <h2 id="ideas-title" className="font-heading text-2xl">
        Que cuisiner avec ça ?
      </h2>
      {ideas.length === 0 ? (
        <div className="mt-3 flex items-center gap-4">
          <Art name="herbes" className="size-20 shrink-0" />
          <p className="text-sm text-muted-foreground">{empty ? "Ajoute ce que tu as à la maison : je te propose des recettes." : "Rien ne colle encore. Ajoute un légume, une viande ou un poisson."}</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {ideas.map(({ recipe, have, missing }) => {
            const miss = names(missing);
            return (
              <li key={recipe.id}>
                <a href={`#/recettes/${recipe.slug}`} className="flex min-h-16 items-center gap-3 rounded-2xl bg-card p-2 ring-1 ring-border transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                  <RecipeVisual recipe={recipe} size="sm" className="size-14 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug font-semibold">{recipe.title}</span>
                    {miss.length ? (
                      <span className="block text-sm text-muted-foreground">
                        Il te manque : {miss.slice(0, 3).join(", ")}
                        {miss.length > 3 && ` +${miss.length - 3}`}
                      </span>
                    ) : (
                      <span className="block text-sm font-semibold text-sage-ink">Tout est à la maison</span>
                    )}
                    <span className="sr-only">
                      {`, ${have.length} ingrédient${have.length > 1 ? "s" : ""} à la maison`}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
