import { guessLocation, illustrationOf, LOCATION_LABELS, matchProduct, type Ingredient, type InventoryItem, type Nutrients, type ProductInfo, type StorageLocation } from "@mijote/shared";
import { Baby, ChevronRight, ExternalLink, Star, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Art } from "@/components/art";
import { ProductPhotoButton } from "@/components/photo-viewer";
import { Box, Segmented } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, getState, ingredientsOf, useStore, type ProductMemo } from "@/data/store";
import { babyWarnings, lookupProduct, offPage, type Lookup } from "@/lib/off";
import { cn } from "@/lib/utils";

// Briques communes à tout ce qui montre un produit du commerce (Open Food Facts) :
// fiche, Nutri-Score, NOVA, vignette, rangement au placard, ajout aux courses.

// ——— Nutri-Score et NOVA ———

// Couleurs officielles du Nutri-Score (repère connu en magasin), texte choisi pour rester lisible.
export const NUTRI: Record<string, string> = {
  a: "bg-[#038141] text-white",
  b: "bg-[#85bb2f] text-foreground",
  c: "bg-[#fecb02] text-foreground",
  d: "bg-[#ee8100] text-foreground",
  e: "bg-[#c7350e] text-white",
};

export function NutriBadge({ grade, className }: { grade: string; className?: string }) {
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold uppercase", NUTRI[grade], className)} title={`Nutri-Score ${grade.toUpperCase()}`}>
      <span aria-hidden>{grade}</span>
      <span className="sr-only">Nutri-Score {grade.toUpperCase()}</span>
    </span>
  );
}

export function NutriScale({ grade }: { grade: string }) {
  return (
    <div role="img" aria-label={`Nutri-Score ${grade.toUpperCase()}`} className="flex items-center gap-1">
      {["a", "b", "c", "d", "e"].map((g) => (
        <span
          key={g}
          aria-hidden
          className={cn(
            "grid place-items-center rounded-lg font-bold uppercase transition-all",
            NUTRI[g],
            g === grade ? "h-10 w-9 text-lg shadow-card ring-2 ring-card" : "h-7 w-6 text-xs opacity-45",
          )}
        >
          {g}
        </span>
      ))}
    </div>
  );
}

export const NOVA_TONES: Record<number, string> = {
  1: "bg-sage-soft text-sage-ink",
  2: "bg-sage-soft text-sage-ink",
  3: "bg-ochre-soft text-ochre-ink",
  4: "bg-terracotta-soft text-terracotta-ink",
};
export const NOVA_LABELS: Record<number, string> = { 1: "brut", 2: "ingrédient culinaire", 3: "transformé", 4: "ultra-transformé" };

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-16 flex-col justify-center gap-1 rounded-2xl bg-paper-deep/70 px-3 py-2">
      <span className="text-[0.7rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{label}</span>
      <div className="font-semibold">{children}</div>
    </div>
  );
}

// ——— Vignettes et pastilles ———

/** Photo du produit sur fond blanc, ou brin de feuillage s'il n'y en a pas. */
export function ProductThumb({ product, className, artClassName = "size-9" }: { product?: Pick<ProductInfo, "image" | "name">; className?: string; artClassName?: string }) {
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-border", !product?.image && "bg-paper-deep ring-0", className)}>
      {product?.image ? <img src={product.image} alt="" className="size-full object-contain" loading="lazy" decoding="async" /> : <Art name="sprig" className={artClassName} />}
    </span>
  );
}

/** Pastille de liste : « à éviter » (marqué par la famille), sinon « bébé » si Open Food Facts signale un point d'attention. */
export function BabyPastille({ product, mark, className }: { product: ProductInfo; mark?: ProductMemo["mark"]; className?: string }) {
  if (mark === "eviter")
    return (
      <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-ochre px-2 text-[0.7rem] font-bold text-foreground", className)} title="Marqué à éviter pour bébé">
        <TriangleAlert className="size-3" aria-hidden /> à éviter
      </span>
    );
  const n = babyWarnings(product).length;
  if (!n) return null;
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-ochre-soft px-2 text-[0.7rem] font-bold text-ochre-ink", className)} title={`${n} point${n > 1 ? "s" : ""} d'attention pour bébé`}>
      <Baby className="size-3" aria-hidden /> bébé
      <span className="sr-only">
        : {n} point{n > 1 ? "s" : ""} d'attention
      </span>
    </span>
  );
}

// ——— Fiche produit ———

export function BabyBox({ product, compact = false }: { product: ProductInfo; compact?: boolean }) {
  const warnings = babyWarnings(product);
  const shown = compact ? warnings.slice(0, 2) : warnings;
  return warnings.length ? (
    <Box tone="ochre" title="Pour bébé" icon={<Baby className="size-5" aria-hidden />} className={compact ? "px-4 py-3 [&_h3]:mb-1 [&_h3]:text-base" : undefined}>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {shown.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      {shown.length < warnings.length && <p className="mt-1 text-muted-foreground">+ {warnings.length - shown.length} sur la fiche</p>}
    </Box>
  ) : (
    <Box tone="sage" title="Pour bébé" icon={<Baby className="size-5" aria-hidden />} className={compact ? "px-4 py-3 [&_h3]:mb-1 [&_h3]:text-base" : undefined}>
      Ni sel, ni sucre, ni miel, ni édulcorant repéré dans les ingrédients.
    </Box>
  );
}

/** Fiche détaillée : Nutri-Score, NOVA, additifs, alertes bébé, allergènes, ingrédients, lien Open Food Facts. */
export function ProductDetails({ product, code, hideName = false, hideHeader = false }: { product: ProductInfo; code?: string; hideName?: boolean; hideHeader?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {!hideHeader && (
        <div className="flex items-center gap-4">
          <ProductPhotoButton product={product} className="size-24" />
          <div className="min-w-0">
            {!hideName && <p className="font-heading text-xl leading-tight">{product.name}</p>}
            {(product.brand || product.quantity) && <p className="mt-1 text-sm text-muted-foreground">{[product.brand, product.quantity].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
        <Stat label="Nutri-Score">{product.nutriscore ? <NutriScale grade={product.nutriscore} /> : <span className="text-sm text-muted-foreground">inconnu</span>}</Stat>
        <Stat label="NOVA">
          {product.nova ? (
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-sm", NOVA_TONES[product.nova])} title={NOVA_LABELS[product.nova]}>
              {product.nova} <span className="sr-only">: {NOVA_LABELS[product.nova]}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">inconnu</span>
          )}
        </Stat>
        <Stat label="Additifs">
          <span className="tabular-nums">{product.additives.length}</span>
        </Stat>
        <Stat label={`Énergie / ${product.nutrition?.per === "100ml" ? "100 ml" : "100 g"}`}>
          {product.nutrition?.energyKcal !== undefined ? (
            <span className="tabular-nums">
              {fr0(product.nutrition.energyKcal)} <span className="text-sm font-normal text-muted-foreground">kcal</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">inconnue</span>
          )}
        </Stat>
      </div>

      <BabyBox product={product} />

      <NutritionTable product={product} />

      {product.allergens.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold">Allergènes</p>
          <div className="flex flex-wrap gap-1.5">
            {product.allergens.map((a) => (
              <span key={a} className="rounded-full bg-plum-soft px-3 py-1 text-sm font-semibold text-plum-ink first-letter:uppercase">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {(product.ingredientsText || product.additives.length > 0) && (
        <details className="group rounded-2xl bg-paper-deep/50 px-4 text-sm">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-semibold">
            Ingrédients et additifs
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          {product.ingredientsText && <p className="pb-3 leading-relaxed text-muted-foreground">{product.ingredientsText}</p>}
          {product.additives.length > 0 && <p className="pb-3 text-muted-foreground">Additifs : {product.additives.join(", ")}</p>}
        </details>
      )}

      <OffSource code={code} updatedAt={product.updatedAt} />
    </div>
  );
}

// ——— Valeurs nutritionnelles ———

const fr0 = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const frG = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 1 ? 2 : 1 })} g`;

type LevelKey = keyof NonNullable<ProductInfo["levels"]>;
const LEVEL_DOT = { low: "bg-sage", moderate: "bg-ochre", high: "bg-terracotta" } as const;
const LEVEL_LABEL = { low: "faible", moderate: "modéré", high: "élevé" } as const;

const ROWS: { key: keyof Nutrients; label: string; sub?: boolean; level?: LevelKey }[] = [
  { key: "fat", label: "Matières grasses", level: "fat" },
  { key: "saturatedFat", label: "dont saturés", sub: true, level: "saturatedFat" },
  { key: "carbs", label: "Glucides" },
  { key: "sugars", label: "dont sucres", sub: true, level: "sugars" },
  { key: "fiber", label: "Fibres" },
  { key: "proteins", label: "Protéines" },
  { key: "salt", label: "Sel", level: "salt" },
];

/** Tableau « Valeurs nutritionnelles » comme sur l'emballage, avec les repères (faible, modéré, élevé). */
export function NutritionTable({ product }: { product: ProductInfo }) {
  const n = product.nutrition;
  const sv = product.serving;
  const per = n?.per === "100ml" ? "100 ml" : "100 g";
  if (!n)
    return (
      <p className="rounded-2xl bg-paper-deep/50 px-4 py-3 text-sm text-muted-foreground">
        Valeurs nutritionnelles non renseignées sur Open Food Facts{product.images?.nutrition ? " : regarde la photo du tableau (touche la photo du produit)." : "."}
      </p>
    );
  const energy = (x: Nutrients | undefined) =>
    x?.energyKcal !== undefined ? (
      <>
        <span className="font-semibold whitespace-nowrap">{fr0(x.energyKcal)} kcal</span>
        {x.energyKj !== undefined && <span className="block text-xs whitespace-nowrap text-muted-foreground">{fr0(x.energyKj)} kJ</span>}
      </>
    ) : (
      "—"
    );
  return (
    <section aria-labelledby="nutrition-title" className="overflow-hidden rounded-2xl ring-1 ring-border">
      <h3 id="nutrition-title" className="bg-paper-deep/70 px-4 py-2.5 font-sans text-sm font-bold">
        Valeurs nutritionnelles
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2 text-left font-semibold">
              <span className="sr-only">Nutriment</span>
            </th>
            <th scope="col" className="px-3 py-2 text-right align-bottom font-semibold whitespace-nowrap">
              Pour {per}
            </th>
            {sv && (
              <th scope="col" className="px-4 py-2 text-right align-bottom font-semibold">
                <span className="whitespace-nowrap">Par portion</span>
                <span className="block font-normal">{sv.size}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          <tr className="border-b border-border">
            <th scope="row" className="px-4 py-2 text-left font-semibold">
              Énergie
            </th>
            <td className="px-3 py-2 text-right">{energy(n)}</td>
            {sv && <td className="px-4 py-2 text-right">{energy(sv)}</td>}
          </tr>
          {ROWS.map((r) => {
            const level = r.level ? product.levels?.[r.level] : undefined;
            return (
              <tr key={r.key} className="border-b border-border last:border-0">
                <th scope="row" className={cn("py-2 pr-2 text-left", r.sub ? "pl-7 font-normal text-muted-foreground" : "pl-4 font-semibold")}>
                  {r.label}
                </th>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {n[r.key] !== undefined ? frG(n[r.key]!) : "—"}
                    {level && (
                      <span className={cn("size-2.5 shrink-0 rounded-full", LEVEL_DOT[level])} title={`Teneur ${LEVEL_LABEL[level]}`}>
                        <span className="sr-only">(teneur {LEVEL_LABEL[level]})</span>
                      </span>
                    )}
                  </span>
                </td>
                {sv && <td className="px-4 py-2 text-right whitespace-nowrap">{sv[r.key] !== undefined ? frG(sv[r.key]!) : "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      {product.levels && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted-foreground" aria-hidden>
          {(["low", "moderate", "high"] as const).map((l) => (
            <span key={l} className="inline-flex items-center gap-1">
              <span className={cn("size-2 rounded-full", LEVEL_DOT[l])} /> teneur {LEVEL_LABEL[l]}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

// ——— Source ———

/** D'où viennent les données : Open Food Facts, base libre et collaborative. */
export function OffSource({ code, updatedAt, short = false, className }: { code?: string; updatedAt?: string; short?: boolean; className?: string }) {
  return (
    <aside className={cn("rounded-2xl bg-paper-deep/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground", className)}>
      <p>
        <strong className="text-foreground">Source : Open Food Facts</strong>
        {short
          ? ", base libre et collaborative (association à but non lucratif)."
          : ", base de données libre et collaborative tenue par une association française à but non lucratif. Les fiches sont saisies par des bénévoles et des fabricants à partir des emballages : vérifie l'étiquette en cas de doute. Données sous licence ODbL, photos sous CC BY-SA."}
        {updatedAt && !short && ` Fiche mise à jour le ${new Date(updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`}
      </p>
      {code && (
        <a href={offPage(code)} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary-ink underline-offset-4 hover:underline">
          Voir ou compléter sur Open Food Facts <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </aside>
  );
}

export function ProductSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de la fiche produit">
      <div className="flex items-center gap-4">
        <div className="size-24 animate-pulse rounded-3xl bg-paper-deep" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-paper-deep" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-paper-deep" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-paper-deep" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-3xl bg-paper-deep" />
    </div>
  );
}

// ——— Données ———

/** Fiche Open Food Facts d'un code (cache de session dans lib/off). */
export function useLookup(code: string) {
  const [state, setState] = useState<{ code: string; result: Lookup } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void lookupProduct(code).then((result) => !cancelled && setState({ code, result }));
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);
  const result = state && state.code === code ? state.result : undefined;
  return {
    result,
    retry: () => {
      setState(null);
      setAttempt((a) => a + 1);
    },
  };
}

/**
 * Fiche d'un produit : celle d'Open Food Facts, sinon celle gardée dans « Mes produits » (hors ligne).
 * La fiche gardée s'affiche tout de suite, la fraîche la remplace dès qu'elle arrive.
 */
export function useProduct(code: string) {
  const memo = useStore().products?.[code];
  const { result, retry } = useLookup(code);
  const fresh = result?.status === "found" ? result.product : undefined;
  return { product: fresh ?? memo?.product, memo, result, retry, stale: !fresh && !!memo && result?.status === "offline" };
}

/** Retient la fiche dans « Mes produits » une fois par affichage (et à chaque nouvelle version). */
export function useRemember(code: string, product: ProductInfo | undefined) {
  const done = useRef<ProductInfo | undefined>(undefined);
  useEffect(() => {
    if (!product || product === done.current) return;
    done.current = product;
    actions.rememberProduct(code, product);
  }, [code, product]);
}

// ——— Placard et courses ———

export const LOCATIONS: StorageLocation[] = ["placard", "frigo", "congelateur"];
export const INTO: Record<StorageLocation, string> = { placard: "au placard", frigo: "au frigo", congelateur: "au congélateur" };

/** Nom passé à la liste de courses : une seule ligne, sans séparateurs que l'analyseur découperait. */
export const shoppingLabel = (name: string) => name.replace(/[,;+\n]+/g, " ").replace(/\s+et\s+/gi, " ").replace(/\s+/g, " ").trim();

/** Ajoute un nom aux courses, avec un toast « Annuler ». Renvoie les articles ajoutés (ou remis à acheter). */
export function addNameToShopping(weekStart: string, name: string) {
  const label = shoppingLabel(name);
  const added = actions.addToShopping(weekStart, label);
  if (added.length)
    toast.success(`${label} : ajouté aux courses`, {
      action: { label: "Annuler", onClick: () => added.forEach((i) => actions.removeShoppingItem(weekStart, i.id)) },
    });
  return added;
}

/** Nom d'un produit pour la liste : l'ingrédient du catalogue s'il est reconnu (rayon, prix), sinon le nom du produit. */
export const shoppingNameOf = (product: Pick<ProductInfo, "name">) => matchProduct(product.name, ingredientsOf(getState()).list)?.name ?? product.name;

export const addProductToShopping = (weekStart: string, product: Pick<ProductInfo, "name">) => addNameToShopping(weekStart, shoppingNameOf(product));

/** Toast après un rangement, avec « Annuler ». */
export function storedToast(items: InventoryItem[]) {
  if (!items.length) return;
  const text = items.length === 1 ? `${items[0].name} : rangé ${INTO[items[0].location]}` : `${items.length} produits rangés`;
  toast.success(text, { action: { label: "Annuler", onClick: () => items.forEach((i) => actions.removeInventory(i.id)) } });
}

export function LocationPicker({ value, onChange }: { value: StorageLocation; onChange: (l: StorageLocation) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Où le ranger ?</legend>
      <Segmented className="flex w-full" value={value} onChange={onChange} options={LOCATIONS.map((l) => ({ value: l, label: LOCATION_LABELS[l] }))} />
    </fieldset>
  );
}

export function MatchLine({ match, onClear }: { match?: Ingredient; onClear: () => void }) {
  if (!match) return <p className="text-sm text-muted-foreground">Pas d'ingrédient reconnu : il sera rangé tel quel.</p>;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sage-soft/60 py-1 pr-1 pl-2">
      <Art name={illustrationOf(match.id) ?? "sprig"} className="size-10" />
      <p className="min-w-0 flex-1 text-sm">
        Reconnu : <span className="font-semibold">{match.name}</span>
        <span className="block text-xs text-muted-foreground">Sert aux idées de recettes et aux courses.</span>
      </p>
      <Button variant="ghost" className="h-12 shrink-0 text-sage-ink" onClick={onClear}>
        Ce n'est pas ça
      </Button>
    </div>
  );
}

/** Formulaire « ranger à la maison » : nom, ingrédient reconnu, emplacement. */
export function useShelve(defaultName: string) {
  const ingredients = ingredientsOf(useStore()).list;
  const [nameEdit, setName] = useState<string | null>(null);
  const name = nameEdit ?? defaultName;
  const [noMatch, setNoMatch] = useState(false);
  const match = useMemo(() => (noMatch || !name.trim() ? undefined : matchProduct(name, ingredients)), [noMatch, name, ingredients]);
  const [locEdit, setLoc] = useState<StorageLocation | null>(null);
  const location = locEdit ?? guessLocation(match);
  return {
    name,
    match,
    location,
    ready: !!name.trim(),
    setName: (v: string) => {
      setName(v);
      setNoMatch(false);
    },
    clearMatch: () => setNoMatch(true),
    setLocation: setLoc,
    /** Range le produit ; renvoie l'article créé. */
    store: (code: string | undefined, product: ProductInfo | undefined) =>
      actions.addInventory([{ name: name.trim(), ingredientId: match?.id, location, barcode: code, product }]),
  };
}

export function ShelveFields({ form, id = "shelve-name" }: { form: ReturnType<typeof useShelve>; id?: string }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          Nom
        </label>
        <Input id={id} value={form.name} placeholder="Ex. lentilles vertes" onChange={(e) => form.setName(e.target.value)} className="h-12 text-base" />
        <MatchLine match={form.match} onClear={form.clearMatch} />
      </div>
      <LocationPicker value={form.location} onChange={form.setLocation} />
    </>
  );
}

// ——— Favori, à éviter ———

/** Deux bascules exclusives : ☆ Favori (terracotta) et ⚠ À éviter pour bébé (ocre). */
export function MarkToggles({ code, product, className }: { code: string; product: ProductInfo; className?: string }) {
  const mark = useStore().products?.[code]?.mark;
  const toggle = (m: NonNullable<ProductMemo["mark"]>) => {
    if (!getState().products?.[code]) actions.rememberProduct(code, product);
    const next = mark === m ? undefined : m;
    actions.markProduct(code, next);
    if (next === "favori") toast.success(`${product.name} : dans tes favoris`);
    else if (next === "eviter") toast(`${product.name} : à éviter pour bébé`, { description: "Un bandeau te le rappellera au scan." });
  };
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <button
        type="button"
        aria-pressed={mark === "favori"}
        onClick={() => toggle("favori")}
        className={cn(
          "flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          mark === "favori" ? "border-terracotta bg-terracotta-soft text-terracotta-ink" : "border-border-strong bg-card hover:bg-muted",
        )}
      >
        <Star className={cn("size-4.5", mark === "favori" && "fill-current")} aria-hidden /> Favori
      </button>
      <button
        type="button"
        aria-pressed={mark === "eviter"}
        onClick={() => toggle("eviter")}
        className={cn(
          "flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] px-3 text-sm font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          mark === "eviter" ? "border-ochre bg-ochre-soft text-ochre-ink" : "border-border-strong bg-card hover:bg-muted",
        )}
      >
        <TriangleAlert className="size-4.5" aria-hidden /> À éviter pour bébé
      </button>
    </div>
  );
}

/** Bandeau ocre : le produit est marqué « à éviter » par la famille. */
export function AvoidBand({ className }: { className?: string }) {
  return (
    <p role="note" className={cn("flex items-center gap-2 rounded-2xl bg-ochre px-4 py-2.5 text-sm font-semibold text-foreground", className)}>
      <TriangleAlert className="size-4.5 shrink-0" aria-hidden />
      Tu l'as marqué « à éviter pour bébé ».
    </p>
  );
}
