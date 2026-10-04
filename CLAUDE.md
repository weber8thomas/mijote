# Mijoté — notes pour Claude

Planificateur de repas familial de saison, partagé avec un bébé de 11-12 mois. Spécification complète : voir le plan d'implémentation (phases 0 → 7).

**État actuel : vitrine statique** déployée sur GitHub Pages (https://weber8thomas.github.io/mijote/). Pas de serveur : données dans `localStorage`, synchro entre onglets via l'évènement `storage`, IA simulée avec `content/ai-samples.json`. Le serveur Hono + SQLite (phase 3) remplacera `apps/web/src/data/store.ts` ; les hooks `useWeek`, `useShopping`, `useRecipes` imitent déjà la future API.

## Organisation
- `packages/shared` — schémas Zod, règles bébé + linter, saisons, unités, prix, planificateur déterministe (`planner/`), liste de courses, contenu chargé (`content.ts`). Testé par Vitest.
- `content/` — seed : `ingredients.json`, `recipes/{breakfast,lunch,dinner,dessert}.json`, `pantry-basics.json`, `ai-samples.json`.
- `apps/web` — Vite + React 19 + Tailwind 4 + Radix/shadcn + Motion. Routeur par ancre (`src/lib/router.ts`, repris de zubio).
- `scripts/` — `lint-bebe.ts`, `e2e.ts` (parcours Playwright), `shots.ts` (captures dans `design/screens`).
- `design/DESIGN.md` — identité, jetons, règles.

## Commandes
```bash
npm install
npm run dev          # vitrine en local
npm run lint         # oxlint
npm run typecheck    # tsc -b
npm test             # vitest (planificateur, courses, linter)
npm run lint:bebe    # chaque recette contre les règles 11-12 mois
npm run build && npm run preview   # puis : npm run test:e2e
```

## Règles
- Toute recette (seed, IA, manuelle) passe `lintRecipe` : 0 erreur exigée. Sel, sucre, miel, fromages au lait cru… uniquement avec `adultOnly: true`.
- Le planificateur reste déterministe (graine) et sans IA ; toute nouvelle contrainte a son test.
- Textes en français, tutoiement, phrases courtes. Cibles tactiles ≥ 48 px.
- Chromium est préinstallé (`/opt/pw-browsers/chromium`) : ne pas lancer `playwright install`.
- Déploiement : push sur `main` → workflow `.github/workflows/pages.yml`.
