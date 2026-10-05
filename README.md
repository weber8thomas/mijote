# Mijoté

Planificateur de repas familial de saison, partageable avec un bébé de 11 mois.
PWA mobile-first (téléphone, tablette, ordinateur).

**Vitrine en ligne** : https://weber8thomas.github.io/mijote/ — prototype 100 % statique, les données restent dans le navigateur.

## Ce que fait la vitrine
- **Semaine** : 14 repas (déjeuner et dîner) + un dessert par jour. Pour chaque repas, 6 idées de saison : tu choisis, repas par repas, et les suggestions suivantes s'ajustent (poisson 2×, légumineuses, fer chaque jour, viande rouge ≤ 2, cuissons longues le week-end, restes du dîner pour le midi). « Autres idées », appui long pour l'aperçu, vue du mois, export agenda.
- **Courses** : liste Marché / Supermarché par rayon, total estimé, « j'ai déjà », ajout à la main ou par lien, partage, impression, scan en magasin. Partagée avec Home Assistant.
- **Recettes** : 123 recettes de famille de saison (déjeuners, dîners, desserts), toutes vérifiées par le linter bébé ; favoris, écarter, ta recette, Claude (idées, lien, photo).
- **Placard, frigo et produits** : inventaire, scan de code-barres, fiches Open Food Facts (nutrition, alertes bébé), photo du frigo lue par Claude.
- **Aujourd'hui** : repas du jour, fer du jour, produits de saison.
- **Impression** : tableau frigo A4 paysage et liste de courses.
- Installable (Android et iPhone) et utilisable hors ligne.

## Installation chez toi (serveur du foyer)

La vitrine garde tout dans le navigateur. Le **serveur du foyer** partage tout entre vos téléphones, en direct et même hors ligne au magasin :
- la semaine, les courses, le placard et les produits ;
- la liste de courses avec Home Assistant, donc avec Gemini et « Ok Google » ;
- Claude, avec une clé qui reste sur le serveur.

Une seule image Docker (`ghcr.io/weber8thomas/mijote`, amd64 et arm64) : l'appli, l'API et une base SQLite dans `./data`.

### 1. Lancer

```bash
mkdir mijote && cd mijote
curl -O https://raw.githubusercontent.com/weber8thomas/mijote/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/weber8thomas/mijote/main/.env.example
nano .env                 # HOUSEHOLD_PASSPHRASE, PUBLIC_URL au minimum
docker compose up -d
curl http://localhost:8080/api/health    # {"ok":true,"app":"mijote",…}
```

Ouvre l'adresse sur chaque téléphone. Ensuite :
- donne la phrase secrète et ton prénom (« coché par Marie ») ;
- ajoute Mijoté à l'écran d'accueil.

### 2. Reverse proxy (https)

Les téléphones ont besoin de https : installation de l'appli, appareil photo pour le scanner. Le direct passe par des *Server-Sent Events* (`/api/events`), donc ne bufferise pas cette route.

**Caddy** (inclus) : `MIJOTE_DOMAIN=mijote.mondomaine.fr` dans `.env`, puis `docker compose --profile with-caddy up -d`.

**nginx / Nginx Proxy Manager** :
```nginx
location / {
  proxy_pass http://127.0.0.1:8080;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_http_version 1.1;
  proxy_buffering off;          # direct (SSE)
  proxy_read_timeout 1h;
  client_max_body_size 8m;      # photos pour Claude
}
```

**Traefik** : labels habituels sur le service `mijote` (port 8080). Le SSE marche sans réglage.

### 3. Home Assistant : la liste de courses partagée

Le serveur synchronise la liste de courses avec une liste « À faire » de HA. La synchro va dans les deux sens : ajouts, coches et suppressions. Elle tourne toutes les 30 s et juste après un changement, même téléphones fermés.

1. Dans HA, ouvre Profil → Sécurité → **Jeton d'accès longue durée**.
2. Dans `.env` :
   ```env
   HA_URL=http://homeassistant.local:8123
   HA_TOKEN=…
   ```
   C'est l'adresse vue depuis le serveur : pas besoin de https ni de CORS. Le jeton ne quitte jamais le serveur.
3. Choisis la liste :
   - **Liste locale** : Paramètres → Appareils et services → « Liste de tâches locale » nommée *Mijoté courses*, puis `HA_TODO_ENTITY=todo.mijote_courses`. La voix passe par Assist : « ajoute du lait à Mijoté courses ».
   - **Google Keep, pour Gemini et « Ok Google »** :
     1. Dans les réglages de Gemini ou de l'Assistant (Notes et listes), choisis Google Keep comme fournisseur de listes.
     2. Dans HACS, installe [Google Keep Sync](https://github.com/watkins-matt/home-assistant-google-keep-sync) et choisis ta liste *Courses*.
     3. Dans `.env` : `HA_TODO_ENTITY=todo.google_keep_courses`.

     « Ok Google, ajoute du lait à ma liste de courses » arrive dans Mijoté en moins d'une minute. Ce que tu coches au magasin se coche dans Keep.

     Keep n'a pas de champ description : Mijoté y reconnaît ses articles par leur texte. Google Keep Sync passe par une API non officielle de Google.
4. `docker compose up -d`. Dans Mijoté, ouvre Réglages → Home Assistant → **Tester la connexion**.

### 4. Claude (facultatif)

`ANTHROPIC_API_KEY` dans `.env` sert à plusieurs choses : idées de saison, recettes avec ce que tu as, import d'un lien ou d'une photo, photo du frigo.

- Prends une clé dédiée, avec une limite de dépense.
- `AI_DAILY_LIMIT` plafonne les demandes du foyer par jour.
- Chaque recette proposée passe le linter bébé.

### Sauvegarde, restauration, mise à jour

- **Sauvegarde** : chaque jour dans `data/backups/` (30 jours gardés), plus `data/mijote.sqlite`. Copie le dossier `data` ailleurs de temps en temps.
- **Restauration** :
  ```bash
  docker compose down
  cp data/backups/mijote-AAAA-MM-JJ.sqlite data/mijote.sqlite
  rm -f data/mijote.sqlite-wal data/mijote.sqlite-shm
  docker compose up -d
  ```
- **Export** : Réglages → Exporter (JSON), sans clé ni jeton.
- **Mise à jour** : `docker compose pull && docker compose up -d`.
- **Retirer un téléphone** : Réglages → Serveur du foyer. Pour changer la phrase secrète, modifie `.env` puis relance ; les téléphones déjà reliés le restent.

## Développement
Voir [CLAUDE.md](CLAUDE.md) pour l'organisation et les commandes. Serveur en local : `npm run dev:server` (avec `HOUSEHOLD_PASSPHRASE`), puis `npm run dev` (l'appli parle au serveur via le proxy `/api`).

> Règles générales de diversification. Demandez conseil à votre pédiatre en cas de doute ou d'allergie.
