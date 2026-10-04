import { CHANNEL_LABELS, DAYS, formatEuros, formatQty, groupByAisle, prepTasksFor, SLOT_LABELS_LONG, totals, type Slot } from "@mijote/shared";
import { ChevronLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "@/components/brand";
import { Art } from "@/components/art";
import { EmptyState } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { ingredientsOf, useShopping, useStore, useWeek } from "@/data/store";
import { back } from "@/lib/router";
import { dayLabel, slotOrder, weekRange } from "@/views/week";

// Pages imprimables : aperçu à l'écran (feuille A4 à l'échelle), seule la feuille sort à l'impression.

function usePageSize(size: "A4 landscape" | "A4 portrait") {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@page { size: ${size}; margin: 9mm; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [size]);
}

function PrintFrame({ title, landscape, children, fallback }: { title: string; landscape?: boolean; children: React.ReactNode; fallback: string }) {
  return (
    <div className="min-h-dvh bg-paper-deep print:bg-white">
      <div className="no-print pt-safe sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
        <Button variant="ghost" className="h-11" onClick={() => back(fallback)}>
          <ChevronLeft aria-hidden /> Retour
        </Button>
        <p className="flex-1 truncate font-heading font-semibold">{title}</p>
        <Button className="h-11" onClick={() => window.print()}>
          <Printer aria-hidden /> Imprimer
        </Button>
      </div>
      <div className="overflow-x-auto p-4 print:overflow-visible print:p-0">
        <div className={landscape ? "sheet-landscape" : "sheet-portrait"}>{children}</div>
      </div>
      <style>{`
        .sheet-landscape, .sheet-portrait { background: #fff; color: #1f1b17; margin: 0 auto; box-shadow: 0 10px 40px -20px rgb(0 0 0 / .4); }
        .sheet-landscape { width: 279mm; min-height: 192mm; padding: 6mm 7mm; }
        .sheet-portrait { width: 192mm; min-height: 279mm; padding: 8mm 9mm; }
        @media print {
          .sheet-landscape, .sheet-portrait { box-shadow: none; padding: 0; margin: 0; width: auto; min-height: 0; }
        }
      `}</style>
    </div>
  );
}

export function FridgePrint({ weekStart }: { weekStart: string }) {
  usePageSize("A4 landscape");
  const s = useStore();
  const { week, byId } = useWeek(weekStart);
  if (!week) return <NoWeek fallback="/semaine" />;
  // Ordre du tableau : Déjeuner / Dîner / Dessert (le dessert suit le repas auquel il est rattaché).
  const rows: Slot[] = slotOrder(s.household.dessertSlot);
  const at = (day: number, slot: Slot) => week.entries.find((e) => e.day === day && e.slot === slot);
  // Tâches de veille : à faire le soir du jour J pour le lendemain.
  const prep = (day: number) => (day < 6 ? prepTasksFor(week, day + 1, byId) : []);

  return (
    <PrintFrame title="Tableau frigo" landscape fallback="/semaine">
      <div className="relative">
        <div className="pointer-events-none absolute -top-2 right-0 flex gap-1 opacity-[0.16] grayscale" aria-hidden>
          {["courge", "poireau", "pomme", "champignon", "poire"].map((k) => (
            <Art key={k} name={k} className="size-14" />
          ))}
        </div>
        <div className="mb-3 flex items-end gap-4">
          <Logo size="sm" />
          <p className="font-heading text-xl font-semibold">Semaine {weekRange(weekStart)}</p>
        </div>
        <table className="w-full table-fixed border-collapse text-[11pt] leading-snug">
          <thead>
            <tr>
              <th className="w-[22mm]" />
              {DAYS.map((d, day) => (
                <th key={d} className="border-b-2 border-[#1f1b17] pb-1.5 text-left font-heading text-[13pt] font-semibold">
                  {d} <span className="font-sans text-[10pt] font-normal">{dayLabel(weekStart, day)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((slot) => (
              <tr key={slot}>
                <th className="border-b border-[#bbb] py-3 pr-1 text-left align-top text-[9pt] font-bold uppercase">{SLOT_LABELS_LONG[slot]}</th>
                {DAYS.map((_, day) => {
                  const e = at(day, slot);
                  const r = e && byId.get(e.recipeId);
                  return (
                    <td key={day} className="h-[34mm] border-b border-[#bbb] px-1.5 py-3 align-top">
                      {r ? (
                        <>
                          {r.title}
                          {e.isLeftover && <span className="block text-[8.5pt] italic">reste de la veille</span>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className="py-3 pr-1 text-left align-top text-[9pt] font-bold uppercase">Ce soir, pour demain</th>
              {DAYS.map((_, day) => (
                <td key={day} className="px-1.5 py-3 align-top text-[9pt]">
                  {prep(day).map((t) => (
                    <span key={t.id} className="mb-0.5 block">
                      ☐ {t.text}
                    </span>
                  ))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-4 text-[8.5pt] text-[#555]">Portion bébé : prélever avant le sel. Règles générales de diversification, demandez conseil à votre pédiatre en cas de doute ou d'allergie.</p>
      </div>
    </PrintFrame>
  );
}

export function ShoppingPrint({ weekStart }: { weekStart: string }) {
  usePageSize("A4 portrait");
  const s = useStore();
  const items = useShopping(weekStart);
  const ingredients = ingredientsOf(s).byId;
  if (!items.length) return <NoWeek fallback="/courses" />;
  const t = totals(items);
  return (
    <PrintFrame title="Liste de courses" fallback="/courses">
      <div className="mb-4 flex items-end justify-between">
        <Logo size="sm" />
        <p className="font-heading text-lg font-semibold">Courses · semaine {weekRange(weekStart)}</p>
      </div>
      <div className="grid grid-cols-2 gap-6 text-[10pt]">
        {(["market", "supermarket"] as const).map((c) => (
          <section key={c}>
            <h2 className="mb-2 border-b-2 border-[#1f1b17] pb-1 font-heading text-[13pt] font-semibold">
              {CHANNEL_LABELS[c]} <span className="font-sans text-[9pt] font-normal">~ {formatEuros(t[c])}</span>
            </h2>
            {groupByAisle(items.filter((i) => i.channel === c && !i.haveAlready)).map((g) => (
              <div key={g.aisle} className="mb-3 break-inside-avoid">
                <h3 className="mb-1 text-[8.5pt] font-bold uppercase">{g.aisle}</h3>
                <ul>
                  {g.items.map((it) => {
                    const ing = ingredients.get(it.ingredientId)!;
                    return (
                      <li key={it.id} className="flex items-baseline gap-2 py-[1.5pt]">
                        <span className="inline-block size-[9pt] shrink-0 translate-y-[1pt] rounded-[2pt] border border-[#1f1b17]">{it.checked ? "✓" : ""}</span>
                        <span className="flex-1 first-letter:uppercase">{ing.name}</span>
                        <span className="tabular-nums">{formatQty(it.qty, it.unit)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </PrintFrame>
  );
}

function NoWeek({ fallback }: { fallback: string }) {
  return (
    <div className="mx-auto max-w-md p-6 pt-16">
      <EmptyState illustration="poireau" title="Rien à imprimer" action={<Button onClick={() => back(fallback)}>Retour</Button>}>
        Prépare et valide d'abord la semaine.
      </EmptyState>
    </div>
  );
}
