import { addDays, dayIron, INGREDIENTS, MONTHS, prepTasksFor, seasonalProduce, SLOT_LABELS_LONG, toISODate } from "@mijote/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Download, MoonStar, Sparkles } from "lucide-react";
import { Badge, RecipeRow } from "@/components/cards";
import { Art } from "@/components/art";
import { Disclaimer, EmptyState, IronGauge, PageHeader } from "@/components/kit";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { actions, dayIndex, nextWeek, thisWeek, today, useStore, useWeek } from "@/data/store";
import { isIOS, isStandalone } from "@/lib/install";
import { go } from "@/lib/router";
import { setSelectedWeek } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { slotOrder } from "@/views/week";

const IRON_TEXT = ["Pas de vraie source de fer aujourd'hui.", "Un peu de fer aujourd'hui.", "Une bonne source de fer aujourd'hui.", "Journée riche en fer."];

export function TodayView() {
  const s = useStore();
  const now = today();
  const day = dayIndex(now);
  const { week, byId } = useWeek(thisWeek());
  const tomorrowWeek = day === 6 ? nextWeek() : thisWeek();
  const tomorrow = useWeek(tomorrowWeek);
  const tomorrowDay = (day + 1) % 7;
  const tasks = tomorrow.week ? prepTasksFor(tomorrow.week, tomorrowDay, tomorrow.byId) : [];
  const taskKey = (id: string) => `${addDays(toISODate(now), 1)}:${id}`;
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
            <Sparkles aria-hidden /> Préparer
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
            <section className="rounded-3xl bg-plum-soft/70 p-5" aria-labelledby="veille">
              <h2 id="veille" className="flex items-center gap-2 text-xl font-semibold text-plum-ink">
                <MoonStar className="size-5" aria-hidden /> Ce soir, pour demain
              </h2>
              {tasks.length === 0 ? (
                <p className="mt-2 text-sm text-plum-ink/90">{tomorrow.week ? "Rien à préparer ce soir. Profite !" : "La semaine prochaine n'est pas encore planifiée."}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {tasks.map((t) => {
                    const done = !!s.prepDone[taskKey(t.id)];
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => actions.togglePrep(taskKey(t.id))}
                          aria-pressed={done}
                          className="flex min-h-12 w-full items-start gap-3 rounded-2xl bg-card/80 px-3 py-2.5 text-left text-sm"
                        >
                          <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2", done ? "border-plum bg-plum text-white" : "border-plum/40")}>
                            {done && <Check className="size-3.5" strokeWidth={3} />}
                          </span>
                          <span className={cn("flex-1", done && "text-muted-foreground line-through")}>
                            {t.text}
                            <span className="block text-xs text-muted-foreground">{tomorrow.byId.get(t.recipeId)?.title}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="paper rounded-3xl p-5 shadow-card ring-1 ring-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Fer du jour</h2>
                <IronGauge level={iron} className="scale-125" />
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

/** Illustration la plus proche d'un ingrédient. */
const ILLU: Record<string, string> = {
  "courge-butternut": "courge",
  potimarron: "potiron",
  "chou-vert": "chou",
  "chou-rouge": "chou",
  "celeri-rave": "celeri",
  prune: "raisin",
  "fruits-rouges-surgeles": "raisin",
  endive: "poireau",
  mache: "epinard",
  fenouil: "celeri",
  courgette: "poivron",
};
const illustrationFor = (id: string) => ILLU[id] ?? id;
