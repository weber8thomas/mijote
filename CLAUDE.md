# Mijoté — notes pour Claude

Planificateur de repas familial de saison, partagé avec un bébé de 11-12 mois. Spécification complète : voir le plan d'implémentation (phases 0 → 7).

**État actuel : vitrine statique** déployée sur GitHub Pages (https://weber8thomas.github.io/mijote/). Pas de serveur : données dans `localStorage`, synchro entre onglets via l'évènement `storage`, IA simulée avec `content/ai-samples.json`. Le serveur Hono + SQLite (phase 3) remplacera `apps/web/src/data/store.ts` ; les hooks `useWeek`, `useShopping`, `useRecipes` imitent déjà la future API.

## Organisation
- `packages/shared` — schémas Zod, règles bébé + linter, saisons, unités, prix, planificateur déterministe (`planner/`), liste de courses, contenu chargé (`content.ts`). Testé par Vitest.
- `content/` — seed : `ingredients.json`, `recipes/{lunch,dinner,dessert}.json`, `pantry-basics.json`, `ai-samples.json`. Pas de petit-déjeuner dans l'appli.
- `apps/web` — Vite + React 19 + Tailwind 4 + Radix/shadcn + Motion. Routeur par ancre (`src/lib/router.ts`, repris de zubio).
- Illustrations : style « Pastille » (aplats + ombre plate, pastille teintée, découpe crème, **aucun filtre ni flou**). Dessins TSX dans `apps/web/src/components/illustrations` (`product` + forme `plated` facultative, primitives `draw.tsx`, métadonnées `meta.ts` : teinte, hauteur, couleur de soupe), exportés par `npm run art -w @mijote/web` (lancé par dev/build) en `public/illustrations/<clé>.svg` (autocollant, `Art`) et `food/<clé>.svg`, `food/whole/<clé>.svg`, `food/_badge|_plate|_bowl|_soup-*.svg` (calques de `Plate`, `components/art.tsx`). L'« assiette » d'une recette (protéine + légume + féculent) vient de `plateOf` (`packages/shared/src/plate.ts`) ; règle bol/assiette et créneaux dans `art.tsx`, détaillés dans `design/DESIGN.md`.
- Semaine : 14 repas choisis un à un parmi 6 (`choicesFor`, `chooseEntry`, `unchooseEntry`, `pickableFor` dans `planner/generate.ts`), + 1 dessert par jour. Une route par repas (`#/semaine/choix/<id>`) pour que le geste retour fonctionne. N'importe quelle semaine (`components/week-picker.tsx`), vue du mois (`views/month.tsx`), export agenda (`lib/ics.ts`).
- Moulinette : « Autres idées » (`rerollChoices`) et « 6 de plus » (`choicesFor(…, n)`) dans le choix d'un repas. Les 6 idées varient les protéines (2 au plus par protéine). Plus de préparation « la veille » dans l'interface (`prepAhead` reste dans les données, toujours `false`).
- Courses : ajout à la main (`parseShoppingText`, `manualItem`, gardés à la régénération), lien profond `#/courses/ajouter?t=…`, `share_target` et raccourcis dans le manifeste, envoi vers Keep (partage).
- Liste partagée avec Home Assistant, dans les deux sens : la liste « À faire » HA (`todo.mijote_courses`, Liste de tâches locale) est la référence que lisent et modifient Assist, Gemini/Google via HA, l'appli HA et l'autre téléphone. Réconciliation pure et testée `reconcileTodo` (`packages/shared/src/ha-sync.ts`, marqueur `mijote:<id>` en description), application et déclencheurs dans `apps/web/src/lib/ha-sync.ts` (ouverture, retour, 30 s, 1,5 s après un changement), état `state.haSync`, ligne d'état `components/ha-status.tsx`. Semaine synchronisée : `shoppingWeek()`.
- Produits façon Yuka : fiche `#/produit/<code>` (`views/product.tsx`, briques dans `components/product.tsx`), « Mes produits » `#/produits` (historique, favoris, à éviter pour bébé ; `state.products`), recherche par nom Open Food Facts (`searchProducts`, `lib/off.ts`, seulement à la validation), scanner global `openScan(mode)` (`components/scan.tsx` : fiche, placard, magasin — en magasin, scanner coche l'article via `matchShoppingItem`).
- Placard & frigo (`views/pantry.tsx`, route `#/placard`) : inventaire, scan de code-barres (`components/scanner.tsx`, BarcodeDetector ou polyfill zxing), `rankByInventory` (`packages/shared/src/inventory.ts`). Ce qui est à la maison sort de la liste de courses.
- Claude (`lib/claude.ts`) : clé API du foyer stockée sur l'appareil seulement (`integrations.ai`, jamais exportée), appel direct depuis le navigateur, sorties structurées (Zod) → `Recipe` → `lintRecipe`, une correction au plus. Idées, avec ce que j'ai, lien (`web_fetch`), photo de recette, photo du frigo. Brouillons dans `state.aiDrafts`, ingrédients inconnus créés « à vérifier » (`customIngredients`).
- Appui long (`components/preview.tsx`) : l'aperçu reste ouvert au relâchement (façon menu contextuel iOS). Recherche globale : `components/search.tsx` (loupe, `/` ou Ctrl/Cmd+K).
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
