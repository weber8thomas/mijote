import { ILLUSTRATION_KEYS, lintRecipe, PROTEIN_LABELS, QtyUnit, Recipe, SLOT_LABELS, SLOTS, type MainProtein, type RecipeIngredient, type Slot } from "@mijote/shared";
import { AlertTriangle, Check, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Art } from "@/components/art";
import { Chip, PageHeader } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { actions, ingredientsOf, today, useStore } from "@/data/store";
import { back, go } from "@/lib/router";
import { cn } from "@/lib/utils";

const STEPS = ["L'essentiel", "Ingrédients", "Étapes", "Pour bébé"];
const UNITS: { value: QtyUnit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "piece", label: "pièce" },
  { value: "cs", label: "c. à soupe" },
  { value: "cc", label: "c. à café" },
  { value: "pincee", label: "pincée" },
];
const PROTEINS: MainProtein[] = ["veggie", "legume", "fish", "oily-fish", "poultry", "red-meat", "egg", "dairy", "none"];

const slugify = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function NewRecipeView() {
  const s = useStore();
  const { list: allIngredients, byId } = ingredientsOf(s);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [slots, setSlots] = useState<Slot[]>(["dinner"]);
  const [prep, setPrep] = useState(15);
  const [cook, setCook] = useState(20);
  const [servings, setServings] = useState(4);
  const [protein, setProtein] = useState<MainProtein>("veggie");
  const [illustration, setIllustration] = useState<string>("courge");
  const [items, setItems] = useState<RecipeIngredient[]>([]);
  const [search, setSearch] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [prepAhead, setPrepAhead] = useState(false);
  const [aheadText, setAheadText] = useState("");
  const [when, setWhen] = useState("Prélever la portion de bébé avant d'ajouter le sel");
  const [texture, setTexture] = useState("Écrasé à la fourchette, petits morceaux fondants");
  const [amount, setAmount] = useState("3 à 4 cuillères à soupe");
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  const q = slugify(search);
  const suggestions = q ? allIngredients.filter((i) => slugify(i.name).includes(q) && !items.some((it) => it.ingredientId === i.id)).slice(0, 6) : [];

  const lines = (t: string) =>
    t
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const build = () => {
    const id = `${slugify(title) || "ma-recette"}-${actions.newId().slice(0, 4)}`;
    const ironRich = items.some((i) => byId.get(i.ingredientId)?.ironRich && !i.adultOnly);
    return Recipe.safeParse({
      id,
      slug: id,
      title: title.trim(),
      slots,
      prepMinutes: prep,
      cookMinutes: cook,
      longCook: cook >= 90,
      prepAhead,
      prepAheadSteps: prepAhead ? lines(aheadText) : [],
      servingsBase: servings,
      ingredients: items,
      steps: lines(stepsText),
      babyAdaptation: { when, texture, amount, notes: notes || undefined },
      ironScore: ironRich ? 2 : 0,
      mainProtein: protein,
      illustration,
      source: "manual",
      createdAt: today().toISOString(),
    });
  };

  const save = () => {
    const parsed = build();
    if (!parsed.success) {
      setIssues(parsed.error.issues.map((i) => `${i.path.join(".") || "recette"} : ${i.message}`));
      return;
    }
    const errors = lintRecipe(parsed.data, byId).filter((i) => i.level === "error");
    if (errors.length) {
      setIssues(errors.map((e) => e.message));
      return;
    }
    actions.addRecipe(parsed.data);
    toast.success("Recette ajoutée", { description: "Elle pourra être proposée dans tes prochaines semaines." });
    go(`/recettes/${parsed.data.slug}`);
  };

  const canNext = [title.trim().length > 2 && slots.length > 0, items.length > 0, lines(stepsText).length > 0, when.length > 7 && texture.length > 4 && amount.length > 0][step];

  return (
    <Shell tab="recipes">
      <button type="button" onClick={() => (step ? setStep(step - 1) : back("/recettes"))} className="-ml-2 flex h-11 items-center gap-1 rounded-full px-2 font-semibold text-muted-foreground">
        <ChevronLeft className="size-5" aria-hidden /> {step ? "Précédent" : "Recettes"}
      </button>
      <PageHeader title="Ma recette" subtitle={`Étape ${step + 1} sur 4 · ${STEPS[step]}`} />
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-paper-deep")} />
        ))}
      </div>

      <div className="max-w-xl space-y-5">
        {step === 0 && (
          <>
            <Field label="Nom de la recette">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Gratin de courge de mamie" className="h-12 text-base" />
            </Field>
            <Field group label="Pour quel repas ?">
              <div className="flex flex-wrap gap-2">
                {SLOTS.map((x) => (
                  <Chip key={x} active={slots.includes(x)} onClick={() => setSlots((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]))}>
                    {SLOT_LABELS[x]}
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Prépa (min)">
                <Input type="number" inputMode="numeric" min={0} value={prep} onChange={(e) => setPrep(Number(e.target.value) || 0)} className="h-12 text-base" />
              </Field>
              <Field label="Cuisson (min)">
                <Input type="number" inputMode="numeric" min={0} value={cook} onChange={(e) => setCook(Number(e.target.value) || 0)} className="h-12 text-base" />
              </Field>
              <Field label="Portions">
                <Input type="number" inputMode="numeric" min={1} value={servings} onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))} className="h-12 text-base" />
              </Field>
            </div>
            <Field group label="Ingrédient principal">
              <div className="flex flex-wrap gap-2">
                {PROTEINS.map((p) => (
                  <Chip key={p} active={protein === p} onClick={() => setProtein(p)}>
                    {p === "none" ? "aucun" : PROTEIN_LABELS[p]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field group label="Illustration">
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {ILLUSTRATION_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setIllustration(k)}
                    aria-pressed={illustration === k}
                    aria-label={k}
                    className={cn("grid aspect-square place-items-center rounded-2xl bg-card ring-1 ring-border", illustration === k && "ring-2 ring-primary")}
                  >
                    <Art name={k} className="size-[80%]" />
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Ajouter un ingrédient">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tape « courge », « lentilles »…" className="h-12 text-base" />
              {suggestions.length > 0 && (
                <ul className="mt-2 overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border">
                  {suggestions.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        className="flex h-12 w-full items-center gap-2 px-4 text-left hover:bg-muted"
                        onClick={() => {
                          setItems((cur) => [...cur, { ingredientId: i.id, qty: i.unit === "piece" ? 1 : 100, unit: i.unit === "piece" ? "piece" : i.unit === "L" ? "ml" : "g" }]);
                          setSearch("");
                        }}
                      >
                        <Plus className="size-4 text-primary" aria-hidden />
                        <span className="first-letter:uppercase">{i.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={it.ingredientId} className="flex items-center gap-2 rounded-2xl bg-card p-2 pl-4 shadow-card ring-1 ring-border">
                  <span className="min-w-0 flex-1 truncate font-semibold first-letter:uppercase">{byId.get(it.ingredientId)?.name}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={it.qty}
                    onChange={(e) => setItems((cur) => cur.map((c, k) => (k === idx ? { ...c, qty: Number(e.target.value) || 0 } : c)))}
                    className="h-11 w-20 text-base"
                    aria-label="Quantité"
                  />
                  <select
                    value={it.unit}
                    onChange={(e) => setItems((cur) => cur.map((c, k) => (k === idx ? { ...c, unit: e.target.value as QtyUnit } : c)))}
                    className="h-11 rounded-xl border border-input bg-card px-2"
                    aria-label="Unité"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setItems((cur) => cur.filter((_, k) => k !== idx))} className="grid size-11 place-items-center text-muted-foreground" aria-label="Retirer">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            {items.length === 0 && <p className="text-sm text-muted-foreground">Les prix et les rayons viennent de la liste des ingrédients : la recette entre directement dans les courses.</p>}
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Étapes (une par ligne)">
              <Textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} rows={8} placeholder={"Coupe la courge en dés.\nFais-la rôtir 30 min à 200 °C."} className="text-base" />
            </Field>
            <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-card px-4 shadow-card ring-1 ring-border">
              <input type="checkbox" checked={prepAhead} onChange={(e) => setPrepAhead(e.target.checked)} className="size-5 accent-[var(--primary)]" />
              <span className="font-semibold">Se prépare en partie la veille</span>
            </label>
            {prepAhead && (
              <Field label="À faire la veille (une tâche par ligne)">
                <Textarea value={aheadText} onChange={(e) => setAheadText(e.target.value)} rows={3} placeholder="Faire tremper les pois chiches" className="text-base" />
              </Field>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Quand prélever la portion de bébé ?">
              <Input value={when} onChange={(e) => setWhen(e.target.value)} className="h-12 text-base" />
            </Field>
            <Field label="Texture">
              <Input value={texture} onChange={(e) => setTexture(e.target.value)} className="h-12 text-base" />
            </Field>
            <Field label="Quantité indicative">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-base" />
            </Field>
            <Field label="Remarque (facultatif)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-12 text-base" />
            </Field>
            {issues.length > 0 && (
              <div className="rounded-3xl bg-terracotta-soft px-4 py-3 text-sm text-terracotta-ink" role="alert">
                <p className="mb-1 flex items-center gap-2 font-bold">
                  <AlertTriangle className="size-4" aria-hidden /> Le vérificateur bébé bloque la recette
                </p>
                <ul className="list-inside list-disc">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="pt-2">
          {step < 3 ? (
            <Button size="lg" className="h-14 w-full text-base" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continuer
            </Button>
          ) : (
            <Button size="lg" className="h-14 w-full text-base" disabled={!canNext} onClick={save}>
              <Check aria-hidden /> Enregistrer la recette
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, children, group }: { label: string; children: React.ReactNode; group?: boolean }) {
  if (group)
    return (
      <fieldset>
        <legend className="mb-1.5 block text-sm font-bold">{label}</legend>
        {children}
      </fieldset>
    );
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
