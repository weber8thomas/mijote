# Mijoté en cuisine (Nest Hub) — essai

Google a retiré les recettes guidées des Nest Hub en 2024. On les refait pour Mijoté : une recette choisie dans l'appli s'affiche page par page sur l'écran de la cuisine. On tourne les pages **au doigt** et **à la voix** (« Ok Google, suivant »).

Cet essai répond à trois questions avant de construire la vraie fonction :

1. **La voix** : « Ok Google, suivant / précédent » arrive-t-il à notre appli, maintenant que Gemini a remplacé l'Assistant ?
2. **La tenue** : l'écran garde-t-il la recette 30 min, 1 h, sans se rendormir ?
3. **Le toucher** : toucher et glisser marchent-ils dans une appli Cast ?

## Principe

```
 send.py (essai), puis le serveur du foyer
   │ 1. lance l'appli Mijoté sur le Hub
   │ 2. envoie la recette (urn:x-cast:app.mijote), puis peut se déconnecter
   ▼
 Nest Hub Cuisine ── charge ──► https://weber8thomas.github.io/mijote/cast/ (récepteur)
   pages : ingrédients → étapes → bon appétit
   file média : 1 page = 1 silence en boucle
   ▲
   « Ok Google, suivant » → commande de file → page suivante
```

- **Le récepteur** (`apps/web/public/cast/`) est une page statique servie par la vitrine. Le Hub ne parle jamais au serveur du foyer : la recette arrive par le canal Cast. Pas besoin de HTTPS ni de jeton chez soi.
- **L'astuce de la voix** : chaque page est un élément d'une file média (`silence.wav`, 30 s, répété sur place). Pour le Hub, la recette est une playlist. « Suivant » et « précédent » arrivent donc comme commandes de file (`QUEUE_UPDATE`), la page suit. Comme « ça joue », l'appli ne devrait pas se fermer.
- **Le toucher** : tiers gauche = précédent, le reste = suivant, glisser, ou les boutons. La file suit la page touchée, pour que la voix reparte du bon endroit.
- **Le journal** : la bande en bas de l'écran montre ce que le Hub reçoit vraiment. Un toucher l'agrandit. Une ligne « toujours là » s'ajoute toutes les 5 min.

## Émuler un Nest Hub ?

Non. Il n'y a pas d'émulateur : le moteur Cast et l'assistant vocal n'existent que sur l'appareil. On sépare donc :

| Quoi | Aperçu dans le navigateur | Sur le Hub |
|---|---|---|
| Rendu 1024×600, pages, toucher, glisser | ✅ `?preview` | ✅ |
| Commandes vocales | ❌ | ✅ |
| Tenue dans le temps | ❌ | ✅ |
| Erreurs JavaScript | console | journal à l'écran ; Chrome distant `chrome://inspect` → `192.168.0.230:9222` (appareils de dev, à vérifier sur le Hub) |

### Aperçu local

```bash
npm run dev                                  # puis http://localhost:5173/cast/?preview
# ou, sans Vite :
cd apps/web/public && python3 -m http.server 8799   # puis http://127.0.0.1:8799/cast/?preview
```

Flèches ← →, toucher, glisser. Dans Chrome, le mode appareil des DevTools en 1024×600 simule le tactile.

La recette de démo vient du seed :

```bash
npx tsx apps/cast/payload.ts                                   # liste des ids
npx tsx apps/cast/payload.ts boeuf-carottes-mijote > apps/web/public/cast/demo.json
```

## Essai sur le Hub

Compte environ 30 min, plus l'attente de la console Cast.

1. **Publier le récepteur** : push sur `main` (déploiement `pages.yml`). Vérifie ensuite que https://weber8thomas.github.io/mijote/cast/?preview s'ouvre.
2. **Console Cast** (https://cast.google.com/publish, 5 $ une seule fois) :
   - *Add new application* → **Custom Receiver**, nom « Mijoté », URL `https://weber8thomas.github.io/mijote/cast/`. Note l'**App ID** (8 caractères). Ne publie pas l'appli : elle reste réservée aux appareils déclarés.
   - *Add new device* → numéro de série du **Nest Hub Cuisine**. Il est sous le pied de l'appareil ; l'appli Google Home l'affiche peut-être aussi, dans les informations de l'appareil. Attends « Ready for testing » (souvent 15 min), puis **redémarre le Hub**.
3. **Lancer** (rien ne part vers le Hub sans ces commandes) :
   ```bash
   uv run apps/cast/send.py --list
   npx tsx apps/cast/payload.ts boeuf-carottes-mijote \
     | uv run apps/cast/send.py --app <APP_ID> --device "Nest Hub Cuisine"
   uv run apps/cast/send.py --app <APP_ID> --device "Nest Hub Cuisine" --quit   # fermer
   ```
   Sans recette sur l'entrée standard, le récepteur affiche sa démo au bout de 3 s. Le CaC Tool de Google peut aussi lancer l'appli, sans script.

### Grille de test

| # | Test | Attendu | Résultat |
|---|---|---|---|
| 1 | Lancement | Recette affichée ; journal : `recette reçue`, `file prête : 8 pages` | |
| 2 | Toucher : tiers droit, tiers gauche, glisser, boutons | La page change | |
| 3 | « Ok Google, suivant », puis « Ok Google, précédent » | Journal : `demande QUEUE_UPDATE jump=1` (ou `QUEUE_NEXT`), puis `file → Étape 2` | |
| 4 | Variantes : « étape suivante », « page suivante », « reviens en arrière », « Hey Google, next » | Noter celles qui marchent | |
| 5 | Toucher 2 pages, puis « suivant » | Part de la page touchée | |
| 6 | Laisser 30 min, puis 1 h sur une page | Toujours là (lignes « toujours là ») ; sinon noter l'heure de fermeture | |
| 7 | « Ok Google, pause », puis attendre 15 min | Reste ouvert ? (en pause, plus rien ne « joue ») | |
| 8 | « Ok Google, minuteur 10 minutes » pendant la recette | La recette reste ; journal : `FOCUS_STATE` | |
| 9 | Script terminé | `SENDER_DISCONNECTED` dans le journal, la recette reste | |
| 10 | « Ok Google, arrête » | L'appli se ferme proprement | |

**Ce qui décide la suite : les tests 3 et 6.**
- Si le test 3 échoue, il reste le toucher, déjà utile. On cherchera d'autres formulations, ou un autre type de média (vidéo).
- Si le test 6 échoue, le serveur relancera l'appli sur la page en cours.

## Plan si l'essai passe

**1. Récepteur propre**
- `packages/shared/src/cast.ts` : `castPayload(recipe, ingredients, servings)`, repris de `payload.ts`. Les quantités suivent les portions du repas planifié. Tests Vitest : pages, durées, page bébé.
- Récepteur en TS sans React, comme seconde entrée Vite (`apps/web/cast.html`) : léger pour le Hub, types partagés.
- Minuteurs : toucher une durée surlignée (« 1 h 30 ») lance un minuteur à l'écran.
- Journal masqué (appui long pour l'afficher).

**2. Serveur du foyer**
- `apps/server/src/cast.ts` : client Cast minimal en TS (TLS port 8009 + message protobuf `CastMessage`, environ 150 lignes, sans dépendance), ou une bibliothèque si l'une est maintenue.
- Réglages : `CAST_APP_ID`, `CAST_HOST` (IP fixe, plus simple que le mDNS dans Docker).
- Routes `POST /api/cast/show { recipeId, entryId?, page? }` et `POST /api/cast/stop` (cookie de session). Tests avec un faux appareil Cast, comme `watch.test.ts`.

**3. Appli**
- Bouton « Afficher en cuisine » sur la fiche recette et sur les repas du jour, en mode serveur seulement (caché dans la vitrine).
- Facultatif : la page en cours remonte au téléphone (message `{type:"page"}` → SSE), qui sert alors de télécommande.

**4. Choisir à la voix (facultatif)**
- Script HA `rest_command` → `/api/cast/show?today=dinner`, avec un jeton dédié `CAST_TOKEN` (comme `WATCH_TOKEN`). Exposé à Google Home : « Ok Google, recette du soir ».
- Choisir une recette par son nom à la voix reste impossible : il n'y a plus d'actions vocales tierces.
