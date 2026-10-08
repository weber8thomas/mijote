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

## Itérer sans déployer

`uv run apps/cast/serve.py` sert `apps/web/public` en HTTP sur le réseau, **sans cache**, puis affiche l'URL à mettre dans la console Cast (`http://<IP du Mac>:8799/cast/`). La console accepte le HTTP tant que l'appli n'est pas publiée, à condition d'utiliser l'IP du Mac (pas `localhost`). Redémarre le Hub après avoir changé l'URL. GitHub Pages met le fichier en cache 10 minutes : c'est ce qui rend les essais trompeurs.

Quand le récepteur est prêt, remets l'URL de production (`https://mijote.laboiteaframboises.duckdns.org/cast/` ou GitHub Pages).

## Avec le serveur du foyer (fait)

Le serveur parle directement au Hub (Cast v2 : TLS sur le port 8009, `apps/server/src/cast.ts`, sans dépendance) : plus besoin de `send.py` ni de `payload.ts`, qui restent pour l'essai.

```env
CAST_HOST=192.168.0.230      # IP fixe du Hub (à réserver dans le routeur)
CAST_APP_ID=7E270F5D         # console Cast, appli « Mijoté »
```

| Route (session du foyer) | Effet |
|---|---|
| `POST /api/cast/show { recipeId, adults?, babies? }` | Lance l'appli et affiche la recette, quantités selon les adultes et bébés (ceux du foyer par défaut) |
| `POST /api/cast/show {}` | **Reprend** la recette qui était à l'écran, à la page où elle s'était arrêtée |
| `POST /api/cast/stop` | Ferme l'appli sur le Hub |
| `GET /api/cast/status` | Hub configuré, recette à l'écran, dernière erreur |

- **Si la recette disparaît** (le Hub ferme l'appli, ou la page se recharge) : le Hub garde la recette et la page en cours (`localStorage`, récepteur), et le serveur retient la dernière recette envoyée. `show {}` la remet à la bonne page. Le serveur ne relance rien tout seul : « Ok Google, arrête » doit rester respecté.
- **Sur le téléphone** : bouton « Écran cuisine » à côté de « Mode cuisine » sur la fiche recette (mode serveur seulement). Il envoie les adultes et bébés réglés sur la fiche.
- **Docker** : le conteneur doit joindre le Hub par son IP (réseau bridge par défaut : OK, pas de mDNS nécessaire).
- Une connexion par commande, fermée aussitôt. Une commande à la fois (deux téléphones qui appuient ensemble passent l'un après l'autre).
- Tests : `apps/server/src/cast.test.ts` (faux Hub TCP), `packages/shared/src/cast.test.ts`.

## Demander une recette à voix haute

Le point dur : **Google ne transmet pas un mot dit à voix haute** (« bœuf carottes ») à un script Home Assistant, et un Nest Hub ne peut pas envoyer sa phrase à Assist. Il y a donc deux voix, qui se complètent :

| Voix | Recettes | Matériel | Phrase |
|---|---|---|---|
| **Google (le Hub lui-même)** | Une phrase par script : le repas du soir ou du midi, la reprise, la fermeture, et les recettes que tu choisis | Le Hub, Home Assistant exposé à Google | « Ok Google, active Recette du soir » |
| **Assist (Home Assistant)** | **N'importe laquelle**, par son nom | Un micro Assist : HA Voice Preview Edition, un satellite ESP32, ou l'appli HA (bouton Assist) | « Affiche la recette bœuf carottes » |

Dans les deux cas, c'est Home Assistant qui appelle le serveur : `POST /api/cast-hook/show`, avec le jeton `CAST_TOKEN` (en-tête `Authorization`, il n'ouvre que `/api/cast-hook`).

| Corps JSON | Effet |
|---|---|
| `{"q": "bœuf carottes"}` | Recette par son nom : sans accents ni « œ », singulier ou pluriel, petits mots ignorés. Le titre le plus proche l'emporte ; à égalité, **409** avec les candidates (rien ne s'affiche) |
| `{"meal": "dinner"}` | Le dîner prévu aujourd'hui dans le plan de la semaine (`lunch`, `dinner`, `dessert`, ou `now` : le midi avant 15 h, le soir ensuite) |
| `{"recipeId": "boeuf-carottes-mijote"}` | Une recette précise |
| `{}` | Reprend celle de l'écran, à sa page |

Ajoute `adults` et `babies` pour changer les quantités. `POST /api/cast-hook/stop` ferme l'appli, `GET /status` dit ce qui est affiché.

### Mise en place

1. **Jeton** : `openssl rand -hex 32` → `CAST_TOKEN` dans l'environnement du serveur (avec `CAST_HOST` et `CAST_APP_ID`), puis `docker compose up -d`.
2. **Test à la main, avant Home Assistant** :
   ```bash
   curl -X POST https://<ton-domaine>/api/cast-hook/show \
     -H "Authorization: Bearer $CAST_TOKEN" -H "Content-Type: application/json" \
     -d '{"q": "boeuf carottes"}'
   ```
3. **Générer la configuration de HA** (recettes du seed ; `--scripts` : celles qui auront leur propre phrase Google) :
   ```bash
   npx tsx apps/cast/ha-config.ts --url https://<ton-domaine> --scripts boeuf-carottes-mijote,tortilla-pommes-de-terre-epinards
   ```
   Copie `apps/cast/ha/packages/mijote_cast.yaml` dans `config/packages/` (avec `homeassistant: packages: !include_dir_named packages` dans `configuration.yaml`) et `apps/cast/ha/custom_sentences/fr/mijote.yaml` dans `config/custom_sentences/fr/`. Dans `secrets.yaml` : `mijote_cast_bearer: "Bearer <CAST_TOKEN>"`. Redémarre HA.
4. **Assist** : « affiche la recette bœuf carottes », dans l'appli HA ou sur le micro Assist. Les recettes ajoutées ensuite par le foyer ne sont pas dans la liste : relance le générateur (ou utilise `{"q": …}` directement).
5. **Google** : expose les scripts `Recette du soir`, `Recette du midi`, etc. à Google (Home Assistant Cloud, ou ton projet Google Cloud), puis dis « Ok Google, active Recette du soir ». Les sources disent que « active <nom> » marche surtout en anglais et que le script doit avoir un nom unique, parfois être rattaché à une pièce : **à vérifier sur ton Hub, sous Gemini**. Plan B : une routine Google Home, déclenchée par la phrase de ton choix, dont l'action est le script ou un interrupteur `input_boolean` exposé.

## Reste à faire

- **Menu sur le Hub** : l'écran d'accueil du récepteur liste « Au menu cette semaine » et le toucher ouvre la recette. Demande un jeton en lecture seule pour que le récepteur interroge le serveur.
- **Bouton sur les repas du jour** (la semaine, l'accueil), en plus de la fiche recette.
- **Minuteurs** : toucher une durée surlignée (« 1 h 30 ») lance un minuteur à l'écran.
- **Récepteur en TS** : seconde entrée Vite, types partagés, journal masqué (appui long pour l'afficher).
