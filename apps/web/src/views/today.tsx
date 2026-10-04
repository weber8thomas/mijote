import { dayIron, illustrationOf, INGREDIENTS, MONTHS, seasonalProduce, SLOT_LABELS_LONG } from "@mijote/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download } from "lucide-react";
import { Badge, RecipeRow } from "@/components/cards";
import { Art } from "@/components/art";
import { Disclaimer, EmptyState, IronGauge, PageHeader } from "@/components/kit";
import { CocotteIcon } from "@/components/brand";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { actions, dayIndex, nextWeek, thisWeek, today, useStore, useWeek } from "@/data/store";
import { isIOS, isStandalone } from "@/lib/install";
import { go } from "@/lib/router";
import { setSelectedWeek } from "@/lib/ui";
import { slotOrder } from "@/views/week";

const IRON_TEXT = ["Pas de vraie source de fer aujourd'hui.", "Un peu de fer aujourd'hui.", "Une bonne source de fer aujourd'hui.", "Journée riche en fer."];

export function TodayView() {
  const s = useStore();
  const now = today();
  const day = dayIndex(now);
  const { week, byId } = useWeek(thisWeek());
  const entries = week ? slotOrder(s.household.dessertSlot).map((slot) => week.entries.find((e) => e.day === day && e.slot === slot)).filter((e) => !!e) : [];
  const iron = week ? dayIron(week, day, byId) : 0;
  const month = now.getMonth() + 1;
  const produce = seasonalProduce(INGREDIENTS, month).slice(0, 8);
  const nextReady = !!s.weeks[nextWeek()];
  const showInstall = !s.installSeen && isIOS() && !isStandalone();

  return (
    <Shell tab="today">
      <PageHeader title="Aujourd'hui" subtitle={format(now, "EEEE d MMMM", { locale: fr })} />

      {showInstall && (
        <button type="button" onClick={() => go("/installer")} className="mb-4 flex w-full items-center gap-3 rounded-3xl bg-primary-soft px-4 py-3 text-left text-sm text-primary-ink">
          <Download className="size-5 shrink-0" aria-hidden />
          <span className="flex-1">
            <strong>Installe Mijoté</strong> sur ton écran d'accueil pour l'ouvrir comme une appli, même sans réseau.
          </span>
        </button>
      )}

      {day >= 4 && !nextReady && (
        <div className="paper mb-5 flex items-center gap-4 rounded-3xl p-4 shadow-card ring-1 ring-border">
          <Art name="courge" className="size-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-semibold">La semaine prochaine t'attend</p>
            <p className="text-sm text-muted-foreground">5 minutes pour tout prévoir.</p>
          </div>
          <Button
            className="h-12 shrink-0"
            onClick={() => {
              setSelectedWeek(nextWeek());
              actions.generate(nextWeek());
              go("/semaine");
            }}
          >
            <CocotteIcon className="size-5" /> Préparer
          </Button>
        </div>
      )}

      {!week ? (
        <EmptyState illustration="poireau" title="Rien de prévu cette semaine" action={<Button size="lg" className="h-14 w-full" onClick={() => go("/semaine")}>Voir la semaine</Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3">
            {entries.map((e) => {
              const r = byId.get(e.recipeId)!;
              return (
                <RecipeRow
                  key={e.id}
                  recipe={r}
                  eyebrow={SLOT_LABELS_LONG[e.slot]}
                  onTap={() => go(`/recettes/${r.slug}`)}
                  badges={e.isLeftover ? <Badge tone="sage">Reste d'hier soir</Badge> : undefined}
                />
              );
            })}
          </div>

          <aside className="space-y-4">
            <section className="paper rounded-3xl p-5 shadow-card ring-1 ring-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Fer du jour</h2>
                <IronGauge level={iron} size={34} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{IRON_TEXT[iron]}</p>
            </section>

            <section className="paper rounded-3xl p-5 shadow-card ring-1 ring-border">
              <h2 className="text-lg font-semibold">De saison en {MONTHS[month - 1]}</h2>
              <ul className="mt-3 grid grid-cols-4 gap-2">
                {produce.map((p) => (
                  <li key={p.id} className="flex flex-col items-center text-center text-[0.7rem] leading-tight font-semibold text-muted-foreground">
                    <Art name={illustrationFor(p.id)} className="size-12" />
                    {p.name.replace(/ \(.*\)/, "")}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}

      <Disclaimer className="mt-8" />
    </Shell>
  );
}

/** Illustration exacte d'un ingrédient (repli : brin de feuillage). */
const illustrationFor = (id: string) => illustrationOf(id) ?? "sprig";
