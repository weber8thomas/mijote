# Mijoté — notes pour Claude

Planificateur de repas familial de saison, partagé avec un bébé de 11-12 mois. Spécification complète : voir le plan d'implémentation (phases 0 → 7).

**Deux modes, même appli.** Vitrine statique sur GitHub Pages (https://weber8thomas.github.io/mijote/) : données dans `localStorage`, synchro entre onglets via `storage`, IA simulée (`content/ai-samples.json`) ou clé de l'appareil. **Serveur du foyer** (`apps/server`, Docker chez soi) : l'appli le détecte au démarrage (`GET /api/health`, jamais sur `*.github.io`) et passe en mode serveur (`apps/web/src/data/sync.ts`).

## État partagé et serveur (phase 3)
- Toute la logique du foyer est pure : `applyAction(state, action)` (`packages/shared/src/state.ts`). Heure, graine et ids sont dans l'action ; pas de bascule (`setChecked` explicite). Rejouer un journal donne le même état. `store.ts` = `dispatch` → `applyActionWithResult` → `actionSink`.
- Téléphone en mode serveur : affiché = état confirmé + actions en attente rejouées ; file gardée hors ligne (`mijote-sync-v1`), envoi idempotent (`actionId`), direct SSE `/api/events`, rattrapage `/api/actions?since=` (410 → état complet). « Rejoindre le foyer » : `views/join.tsx`. Champs propres à l'appareil (`member`, `integrations`, `haSync`) jamais envoyés (`pickHousehold`).
- Serveur : Hono + better-sqlite3/Drizzle (`household_state`, `action_log` 30 j, `member`, `session`, `meta`), phrase secrète (`HOUSEHOLD_PASSPHRASE`) → cookie httpOnly 1 an, sauvegarde quotidienne `VACUUM INTO`. Réglages par env (`apps/server/src/config.ts`, `.env.example`).
- Home Assistant côté serveur (`apps/server/src/ha.ts`, client `@mijote/shared/ha-client`) : même `reconcileTodo`, jeton jamais sur les téléphones ; liste Google Keep (Gemini, « Ok Google ») via Google Keep Sync, articles reconnus par leur texte. En mode serveur `lib/ha-sync.ts` ne fait rien.
- Claude : `@mijote/shared/ai` (invites, schémas, `convert`, images en base64). Serveur `/api/ai/*` avec limite du jour du foyer ; vitrine = appel direct (`lib/claude.ts` choisit).
- Montre Garmin : `apps/garmin` (Connect IQ, Monkey C, hors workspaces npm) → serveur seulement, `/api/watch/list` et `/api/watch/check` (`apps/server/src/watch.ts`), jeton `WATCH_TOKEN` (en-tête Authorization, n'ouvre rien d'autre), coche `setChecked` « Montre » puis `kick()` HA. Liste de `shoppingWeekOf`, compacte (clé courte, Latin-1, 80 articles).
- Écran de cuisine : Nest Hub (Google Cast). Récepteur statique `apps/web/public/cast` (pages ingrédients/étapes, toucher et voix « suivant » via une file média de silences, `localStorage` pour reprendre), serveur `apps/server/src/cast.ts` (client Cast v2 sans dépendance, `CAST_HOST` + `CAST_APP_ID`, routes `/api/cast/show|stop|status` derrière la session, et `/api/cast-hook` pour Home Assistant : jeton `CAST_TOKEN`, recette par nom `findRecipeByName`, repas prévu `meal`, générateur `apps/cast/ha-config.ts`), contenu `castRecipe` (`packages/shared/src/cast.ts`), bouton « Écran cuisine » de la fiche recette (`hasServerCast`). `apps/cast` : essai (`send.py`, `serve.py`, README).
- Docker : `Dockerfile` (racine, multi-étapes, non-root via `docker/entrypoint.sh`), `docker-compose.yml` (profil `with-caddy`), image `ghcr.io/weber8thomas/mijote` (`.github/workflows/docker.yml`). Installation : README.

## Organisation
- `packages/shared` — schémas Zod, règles bébé + linter, saisons, unités, prix, planificateur déterministe (`planner/`), liste de courses, contenu chargé (`content.ts`). Testé par Vitest.
- `content/` — seed : `ingredients.json`, `recipes/{lunch,dinner,dessert}.json`, `pantry-basics.json`, `ai-samples.json`. Pas de petit-déjeuner dans l'appli.
- `apps/web` — Vite + React 19 + Tailwind 4 + Radix/shadcn + Motion. Routeur par ancre (`src/lib/router.ts`, repris de zubio).
- Illustrations : style « Pastille » (aplats + ombre plate, pastille teintée, découpe crème, **aucun filtre ni flou**). Dessins TSX dans `apps/web/src/components/illustrations` (`product` + forme `plated` facultative, primitives `draw.tsx`, métadonnées `meta.ts` : teinte, hauteur, couleur de soupe), exportés par `npm run art -w @mijote/web` (lancé par dev/build) en `public/illustrations/<clé>.svg` (autocollant, `Art`) et `food/<clé>.svg`, `food/whole/<clé>.svg`, `food/_badge|_plate|_bowl|_soup-*.svg` (calques de `Plate`, `components/art.tsx`). L'« assiette » d'une recette (protéine + légume + féculent) vient de `plateOf` (`packages/shared/src/plate.ts`) ; règle bol/assiette et créneaux dans `art.tsx`, détaillés dans `design/DESIGN.md`.
- Semaine : 14 repas choisis un à un parmi 6 (`choicesFor`, `chooseEntry`, `unchooseEntry`, `pickableFor` dans `planner/generate.ts`), + 1 dessert par jour. Une route par repas (`#/semaine/choix/<id>`) pour que le geste retour fonctionne. N'importe quelle semaine (`components/week-picker.tsx`), vue du mois (`views/month.tsx`), export agenda (`lib/ics.ts`).
- Moulinette : « Autres idées » (`rerollChoices`) et « 6 de plus » (`choicesFor(…, n)`) dans le choix d'un repas. Les 6 idées varient les protéines (2 au plus par protéine). Plus de préparation « la veille » dans l'interface (`prepAhead` reste dans les données, toujours `false`).
- Courses : ajout à la main (`parseShoppingText`, `manualItem`, gardés à la régénération), lien profond `#/courses/ajouter?t=…`, `share_target` et raccourcis dans le manifeste, envoi vers Keep (partage).
- Liste partagée avec Home Assistant, dans les deux sens : la liste « À faire » HA (`todo.mijote_courses`, Liste de tâches locale) est la référence que lisent et modifient Assist, Gemini/Google via HA, l'appli HA et l'autre téléphone. Réconciliation pure et testée `reconcileTodo` (`packages/shared/src/ha-sync.ts`, marqueur `mijote:<id>` en description), application et déclencheurs dans `apps/web/src/lib/ha-sync.ts` (ouverture, retour, 30 s, 1,5 s après un changement), état `state.haSync`, ligne d'état `components/ha-status.tsx`. Semaine synchronisée : `shoppingWeek()`.
- Additifs classés par nocivité (`packages/shared/src/additives.ts`, `content/additives.json` régénéré par `npm run additives` depuis les taxonomies Open Food Facts) : risque élevé / modéré / limité / sans risque connu, d'après l'EFSA (dépassement de la DJA, tout-petits), l'ANSES et la réglementation (E171 interdit, colorants « Southampton », nitrites). Liste `AdditivesList` dans la fiche.
- Produits façon Yuka : fiche `#/produit/<code>` (`views/product.tsx`, briques dans `components/product.tsx`), « Mes produits » `#/produits` (historique, favoris, à éviter pour bébé ; `state.products`), recherche par nom Open Food Facts (`searchProducts`, `lib/off.ts`, seulement à la validation), scanner global `openScan(mode)` (`components/scan.tsx` : fiche, placard, magasin — en magasin, scanner coche l'article via `matchShoppingItem`).
- Placard & frigo (`views/pantry.tsx`, route `#/placard`) : inventaire, scan de code-barres (`components/scanner.tsx`, BarcodeDetector ou polyfill zxing), `rankByInventory` (`packages/shared/src/inventory.ts`). Ce qui est à la maison sort de la liste de courses.
- Claude (`@mijote/shared/ai`, `lib/claude.ts`) : par le serveur du foyer, ou dans la vitrine avec la clé de l'appareil (`integrations.ai`, jamais exportée) ; sorties structurées (Zod) → `Recipe` → `lintRecipe`, une correction au plus. Idées, avec ce que j'ai, lien (`web_fetch`), photo de recette, photo du frigo. Brouillons dans `state.aiDrafts`, ingrédients inconnus créés « à vérifier » (`customIngredients`).
- Appui long (`components/preview.tsx`) : l'aperçu reste ouvert au relâchement (façon menu contextuel iOS). Recherche globale : `components/search.tsx` (loupe, `/` ou Ctrl/Cmd+K).
- `scripts/` — `lint-bebe.ts`, `e2e.ts` (parcours vitrine), `e2e-server.ts` (serveur du foyer), `shots.ts` (captures dans `design/screens`).
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
npm run dev:server   # serveur du foyer (HOUSEHOLD_PASSPHRASE=…), npm run dev parle à lui via /api
npm run build:web:server && npm run test:e2e:server   # deux téléphones + faux HA + faux Claude
```

## Règles
- Toute recette (seed, IA, manuelle) passe `lintRecipe` : 0 erreur exigée. Sel, sucre, miel, fromages au lait cru… uniquement avec `adultOnly: true`.
- Le planificateur reste déterministe (graine) et sans IA ; toute nouvelle contrainte a son test.
- Textes en français, tutoiement, phrases courtes. Cibles tactiles ≥ 48 px.
- Chromium est préinstallé (`/opt/pw-browsers/chromium`) : ne pas lancer `playwright install`.
- Déploiement : push sur `main` → `.github/workflows/pages.yml` (vitrine) et `docker.yml` (image du serveur).
- Clés et jetons : sur l'appareil dans la vitrine (jamais exportés), dans l'env du serveur sinon (jamais envoyés aux téléphones).
