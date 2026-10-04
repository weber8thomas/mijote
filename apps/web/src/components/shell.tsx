import { BookOpen, CalendarDays, Settings, ShoppingBasket, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand";
import { useStore } from "@/data/store";
import { go } from "@/lib/router";
import { cn } from "@/lib/utils";

// Coquille de l'appli : en-tête, navigation basse (mobile/tablette) ou rail latéral (desktop).

export type Tab = "today" | "week" | "shopping" | "recipes";

const TABS: { id: Tab; label: string; href: string; icon: typeof Sun }[] = [
  { id: "today", label: "Aujourd'hui", href: "/", icon: Sun },
  { id: "week", label: "Semaine", href: "/semaine", icon: CalendarDays },
  { id: "shopping", label: "Courses", href: "/courses", icon: ShoppingBasket },
  { id: "recipes", label: "Recettes", href: "/recettes", icon: BookOpen },
];

export function Shell({ tab, children, bottomBar }: { tab?: Tab; children: ReactNode; bottomBar?: ReactNode }) {
  const s = useStore();
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Rail desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-paper-deep/60 px-4 py-6 lg:flex">
        <button type="button" onClick={() => go("/")} className="mb-8 px-2 text-left" aria-label="Mijoté, accueil">
          <Logo />
        </button>
        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.href}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "flex h-12 items-center gap-3 rounded-2xl px-4 font-semibold transition-colors",
                tab === t.id ? "bg-card text-primary-ink shadow-card" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <t.icon className="size-5" aria-hidden />
              {t.label}
            </a>
          ))}
        </nav>
        <a href="#/reglages" className="mt-auto flex h-12 items-center gap-3 rounded-2xl px-4 font-semibold text-muted-foreground hover:bg-card/60 hover:text-foreground">
          <Settings className="size-5" aria-hidden /> Réglages
        </a>
      </aside>

      {/* En-tête mobile */}
      <header className="no-print pt-safe sticky top-0 z-30 border-b border-transparent bg-background/85 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <button type="button" onClick={() => go("/")} className="-ml-1 flex items-center gap-2" aria-label="Mijoté, accueil">
            <LogoMark className="size-8" />
            <span className="font-heading text-xl font-semibold">Mijoté</span>
          </button>
          <a
            href="#/reglages"
            className="grid size-11 place-items-center rounded-full bg-primary-soft font-heading text-base font-semibold text-primary-ink ring-2 ring-card"
            aria-label={`Réglages du foyer (${s.household.adults} adultes, ${s.household.babies} bébé)`}
          >
            {s.household.adults + s.household.babies}
          </a>
        </div>
      </header>

      <main className={cn("mx-auto max-w-3xl px-4 pt-2 lg:max-w-6xl lg:px-10 lg:pt-8", bottomBar ? "pb-44" : "pb-28 lg:pb-12")}>{children}</main>

      {bottomBar && <div className="no-print fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-3 lg:bottom-4 lg:left-64">{bottomBar}</div>}

      {/* Navigation basse */}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden" aria-label="Navigation principale">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {TABS.map((t) => (
            <a
              key={t.id}
              href={`#${t.href}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn("flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.72rem] font-bold", tab === t.id ? "text-primary-ink" : "text-muted-foreground")}
            >
              <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", tab === t.id && "bg-primary-soft")}>
                <t.icon className="size-[1.35rem]" strokeWidth={tab === t.id ? 2.4 : 2} aria-hidden />
              </span>
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
