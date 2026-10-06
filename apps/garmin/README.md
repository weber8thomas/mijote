# Mijoté au poignet (Garmin Connect IQ)

Appli Connect IQ pour la **Forerunner 255 Music** (`fr255m`). Elle affiche la liste de courses de la semaine et permet de cocher un article aux boutons. Elle passe par le téléphone (appli Garmin Connect en Bluetooth) et ne parle qu'au **serveur du foyer** (`/api/watch`), jamais à Keep ni à Home Assistant. Le serveur relaie les coches aux téléphones et à HA/Keep.

```
 ┌──────────────────────┐
 │     23 à acheter     │   titre : ce qui reste
 │ Rafraîchir           │   START : recharge la liste
 │   À jour 14:32       │   état : à jour, Téléphone absent, Hors ligne (2)…
 │ Pomme de terre   ( ●)│   START : coche / décoche (vibration courte)
 │   1,3 kg · Légumes   │
 │ Poireau          ( ●)│
 └──────────────────────┘
```

- **HAUT / BAS** : défiler.
- **START** : cocher ou décocher, ou « Rafraîchir » sur la première ligne.
- **RETOUR** : quitter.
- **Ordre** : ce qui reste, par rayon, puis ce qui est coché (on peut décocher une erreur).
- **Hors ligne** : la dernière liste reste affichée. Les coches attendent sur la montre et partent au prochain « Rafraîchir » ou à la prochaine ouverture.

## 1. Prérequis sur le Mac

**Déjà installé ?**
```bash
cat ~/Library/Application\ Support/Garmin/ConnectIQ/current-sdk.cfg 2>/dev/null || echo "SDK absent"
ls ~/Library/Application\ Support/Garmin/ConnectIQ/Devices/ 2>/dev/null | grep -x fr255m || echo "fr255m absent"
java -version 2>&1 | head -1
```

**Sinon :**
1. **SDK Manager** : https://developer.garmin.com/connect-iq/sdk/ (fichier `connectiq-sdk-manager.dmg`).
   - Connecte-toi avec ton compte Garmin (celui de Garmin Connect, pas besoin d'un autre compte).
   - Télécharge le dernier SDK (9.2.0 en octobre 2026) et l'appareil **Forerunner 255 Music**.
   - Choisis ce SDK comme SDK courant.
2. **Java 11 ou plus**, par exemple `brew install --cask temurin`.
3. **Facultatif** : VS Code et l'extension **Monkey C** (Garmin). Elle fait la même chose que les commandes ci-dessous.
4. Commandes du SDK dans le terminal :
   ```bash
   export PATH="$PATH:$(cat ~/Library/Application\ Support/Garmin/ConnectIQ/current-sdk.cfg)/bin"
   ```

**Clé développeur**, une fois pour toutes, **hors du dépôt** :
```bash
mkdir -p ~/.garmin && cd ~/.garmin
openssl genrsa -out developer_key.pem 4096
openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem -out developer_key.der -nocrypt
chmod 600 developer_key.*
```
Garde cette clé : une nouvelle version de l'appli doit être signée avec la même clé.

## 2. Compiler

```bash
cd ~/mijote/apps/garmin
monkeyc -d fr255m -f monkey.jungle -o bin/MIJOTE.prg -y ~/.garmin/developer_key.der -w
```

Ce code n'a pas pu être compilé là où il a été écrit (pas de SDK). En cas d'erreur, renvoie la sortie complète de `monkeyc`.

## 3. Essayer au simulateur, contre un serveur jetable

**Serveur du foyer neuf**, sans Home Assistant : ta vraie liste Keep n'est jamais touchée. Le jeton est créé sans être affiché :
```bash
mkdir -p /tmp/mijote-essai && openssl rand -hex 32 > /tmp/mijote-essai/token && chmod 600 /tmp/mijote-essai/token
cd ~/mijote && nvm use 22
env -u HA_URL -u HA_TOKEN HOUSEHOLD_PASSPHRASE=essai-jetable DATA_DIR=/tmp/mijote-essai/data \
  WATCH_TOKEN="$(cat /tmp/mijote-essai/token)" npm run dev:server
# Dans un autre terminal : la liste d'exemple (~47 articles)
curl -s -H "Authorization: Bearer $(cat /tmp/mijote-essai/token)" http://127.0.0.1:8080/api/watch/list | head -c 300
```

**Simulateur**
1. `connectiq &`
2. Dans le menu *Settings*, décoche **Use Device HTTPS Requirements**. Le serveur local est en http ; la vraie montre exige https.
3. `monkeydo bin/MIJOTE.prg fr255m`
4. Saisis les réglages par *File → Edit Persistent Storage → Edit Application.Properties data* :
   - `serverUrl` = `http://127.0.0.1:8080` ;
   - `token` : `pbcopy < /tmp/mijote-essai/token`, puis colle.

   Relance l'appli.
5. Boutons du simulateur : clique sur ceux de la montre (START en haut à droite, RETOUR en bas à droite, HAUT et BAS à gauche).

**À regarder** : les accents (é è à ç ·), la longueur des libellés, la coche, la vibration, l'état « Téléphone absent » (arrête le serveur). Une coche faite dans le simulateur apparaît en direct sur l'appli web branchée au même serveur (`npm run dev`).

## 4. Installer sur la montre (USB)

1. Quitte Garmin Express s'il tourne, y compris son icône dans la barre des menus.
2. Installe **OpenMTP** (`brew install --cask openmtp`) : la FR255 se branche en MTP, et macOS ne lit pas le MTP tout seul.
3. Branche la montre et copie `bin/MIJOTE.prg` dans `GARMIN/APPS/`.
4. Débranche. L'appli apparaît dans la liste des activités et applis (START depuis le cadran). Ajoute-la aux favoris pour l'avoir en haut.

## 5. Réglages sur la montre : fichier .SET

Garmin Connect **ne peut pas** modifier les réglages d'une appli installée par USB : c'est réservé aux applis du Store. On passe donc par le fichier `.SET` que produit le simulateur. C'est une astuce de la communauté Garmin, pas une procédure officielle.

1. Le serveur de production doit avoir son `WATCH_TOKEN` (README principal, section « Montre Garmin »).
2. Copie le jeton du serveur dans le presse-papiers, sans l'afficher :
   ```bash
   ssh <ton-serveur> "grep -m1 '^WATCH_TOKEN=' /chemin/vers/mijote/.env" | cut -d= -f2- | tr -d '\n' | pbcopy
   ```
3. Dans le simulateur (étape 3.4), mets :
   - `serverUrl` = l'adresse publique de ton serveur, en https (`https://mijote.mondomaine.fr`) ;
   - `token` : colle.

   Lance l'appli une fois : avec « Use Device HTTPS Requirements » coché, elle doit afficher la liste de production.
4. Retrouve le fichier :
   ```bash
   find "$TMPDIR" -iname '*.set' -mmin -10 2>/dev/null
   ```
5. Copie-le avec OpenMTP dans `GARMIN/APPS/SETTINGS/`, **sous le même nom que le .prg** : `MIJOTE.SET` à côté de `GARMIN/APPS/MIJOTE.PRG`. La casse compte.
6. Efface la copie du Mac, qui contient le jeton : `rm "<le fichier trouvé>"`. Vide le presse-papiers : `pbcopy < /dev/null`.

**Si la montre ignore le .SET** (l'appli affiche « Règle URL et jeton »), utilise le secours, l'injection à la compilation. Attention : le `.prg` contient alors le jeton.
```bash
cp local.jungle.example local.jungle
cp -r resources-settings resources-local
# remplis serverUrl et token dans resources-local/properties.xml (ces deux fichiers sont ignorés par git)
monkeyc -d fr255m -f "monkey.jungle;local.jungle" -o bin/MIJOTE.prg -y ~/.garmin/developer_key.der -w
```

## 6. Sur le Pixel

Garmin Connect doit rester connecté à la montre. Mets la batterie de Garmin Connect en **Sans restriction** : Paramètres → Applis → Garmin Connect → Batterie. Sinon, l'appli affiche souvent « Téléphone absent ».

## Réglages d'affichage

Tout en bas de la liste, la ligne **Réglages** (on y arrive en remontant depuis « Rafraîchir »). START change la valeur de la ligne ; elle est gardée sur la montre.

| Réglage | Valeurs |
|---|---|
| Affichage | **Auto** : quantité seulement au-delà d'une pièce, sans unité (`×3 · Fruits`) ; les poids et volumes disparaissent. **Complet** : `400 g · Fruits`. **Sans quantité** : le rayon seul. **Compact** : le nom seul, une ligne par article, dessinée par l'appli (`CustomMenu`) en petite police. |
| Tri | **Par rayon** (l'ordre du serveur), **A → Z** (accents ignorés) ou **Ordre d'ajout**. Les articles cochés restent en bas. Les titres de rayon n'existent que dans l'ordre par rayon. Le tri se fait sur la montre, donc hors ligne aussi. |
| Taille (Compact) | **Petit** (lignes de 22 px, texte de 17 px : environ 10 articles à l'écran sans titres), **Moyen**, **Grand**. Sert au mode Compact seulement. |
| Cochés | Visibles ou Masqués (un article coché reste affiché jusqu'au prochain rafraîchissement). |
| Rayons | Titres (`— Fruits —`, puis `— Cochés —`) ou Sans titre. |
| Statut | Le serveur répond-il, sa version, Home Assistant, ce qui reste à acheter, coches en attente, heure de la dernière synchro (`GET /api/watch/status`). |

Ces réglages sont sur la montre, pas dans Garmin Connect : l'appli est installée en USB, et Garmin Connect ne peut modifier que les applis du Store.

## Messages

| À l'écran | Ce que ça veut dire |
|---|---|
| Téléphone absent | Bluetooth coupé ou Garmin Connect endormi. |
| Pas de réponse | Le serveur n'a pas répondu à temps. |
| Jeton refusé | Le jeton du .SET n'est pas celui du serveur. |
| Montre non activée | Pas de `WATCH_TOKEN` sur le serveur, ou adresse fausse. |
| https requis | L'adresse est en http, ou le proxy n'envoie pas `X-Forwarded-Proto`. |
| Trop d'essais | 10 jetons refusés : attends un quart d'heure. |
| Hors ligne (N) | N coches attendent sur la montre. « Rafraîchir » les renvoie. |
| Règle URL et jeton | Réglages vides : voir la section 5. |

## Fichiers

- `manifest.xml` : appli (`watch-app`), appareil `fr255m`, permission `Communications`, français. Pour une autre montre, ajoute son identifiant (`fr255`, `fr255s`, `fr255sm`) et télécharge l'appareil dans le SDK Manager.
- `source/MijoteApp.mc` : démarrage, réglages.
- `source/StartView.mc` : vue d'accueil qui ouvre la liste.
- `source/ShopDelegate.mc` : boutons de la liste. `source/SettingsDelegate.mc` : réglages d'affichage. `source/StatusView.mc` : écran Statut. `source/Row.mc` : ligne du mode Compact.
- `source/Shop.mc` : liste, file de coches, cache, requêtes, messages.
- `resources/` : textes, réglages (`settings.xml`), icône.
- `resources-settings/properties.xml` : réglages vides. Rien de secret dans git.
- Contrat des routes : `apps/server/src/watch.ts`. Chaque ligne de la liste est `[clé, nom, « quantité · rayon », coché, nombre de pièces, rayon, rang alphabétique, rang d'ajout]` ; les 4 premiers champs n'ont jamais changé, ce qui laisse marcher une appli plus ancienne. La liste fait 80 articles au plus, libellés de 24 caractères et sous-libellés de 22 ; ces longueurs se règlent côté serveur, sans recompiler la montre.
