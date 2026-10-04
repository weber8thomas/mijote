import { useSyncExternalStore } from "react";

// Routage minimal par ancre (#/semaine/imprimer) : fonctionne tel quel sur GitHub Pages.
const read = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);

// Fil de navigation : d'où l'on vient, et où l'on en était dans chaque page.
const trail: string[] = [];
const scrolls = new Map<string, number>();

/** Restaure la position une fois la nouvelle page affichée (elle apparaît après une courte transition). */
function restore(y: number) {
  const until = performance.now() + 900;
  const step = () => {
    window.scrollTo({ top: y, behavior: "instant" });
    if (Math.abs(window.scrollY - y) > 2 && performance.now() < until) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

if (typeof window !== "undefined") {
  history.scrollRestoration = "manual";
  trail.push(window.location.hash);
  window.addEventListener("hashchange", (e) => {
    const from = new URL(e.oldURL).hash;
    const to = window.location.hash;
    scrolls.set(from, window.scrollY);
    if (trail.at(-2) === to) {
      trail.pop();
      restore(scrolls.get(to) ?? 0);
    } else {
      trail.push(to);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  });
}

export function useRoute() {
  const hash = useSyncExternalStore(
    (l) => (window.addEventListener("hashchange", l), () => window.removeEventListener("hashchange", l)),
    () => window.location.hash,
  );
  return hash ? read() : [];
}

/** Page précédente dans l'appli (ex. « #/recettes/soupe »), si on vient d'ailleurs dans Mijoté. */
export const previous = () => trail.at(-2);

/** Retour : page précédente si elle existe, sinon la page parente indiquée. */
export function back(fallback: string) {
  if (previous()) history.back();
  else go(fallback.replace(/^#/, ""));
}

export function go(path: string) {
  window.location.hash = path;
}

/** Comme go(), sans ajouter d'étape à l'historique (le retour ne revient pas ici). */
export function replace(path: string) {
  window.location.replace(`#${path.replace(/^#/, "")}`);
}
