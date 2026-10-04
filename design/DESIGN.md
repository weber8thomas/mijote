# Mijoté — Design

Univers **botanique illustré** : fruits et légumes en pastilles d'aplats nets (style « Pastille »), papier crème légèrement texturé, chaleur d'un carnet de recettes familial. Jamais enfantin, jamais chargé.

## Principes
- **Mobile d'abord** (390 px), puis tablette (2 colonnes de jours) et desktop (rail latéral + tableau 7 × 4).
- **La carte entière est la cible.** Cibles tactiles ≥ 48 px, actions principales en bas (zone du pouce), safe-area iOS.
- **Tap = choisir, appui long = aperçu.** L'aperçu a toujours une alternative clavier (bouton « Aperçu » visible au focus).
- **Rassurer sans alarmer** : alertes d'équilibre douces (ocre), jamais bloquantes ; encadré « Pour bébé » en sauge.

## Palette (jetons CSS, `apps/web/src/index.css`)
| Jeton | Valeur | Usage | Contraste |
|---|---|---|---|
| `--background` | `#f7f1e5` | papier | — |
| `--card` | `#fffaf1` | cartes, feuilles | — |
| `--foreground` | `#2f2a24` | encre | 12,6:1 sur papier |
| `--muted-foreground` | `#6b6052` | textes secondaires | 5,5:1 |
| `--primary` | `#b85532` | terracotta, la couleur du « é » du logo : boutons, onglet actif, sélection | blanc dessus 4,8:1 |
| `--primary-soft` / `--primary-ink` | `#f5ddd0` / `#9a4426` | fonds et textes d'accent | 5,0:1 |
| `--sage` / `-soft` / `-ink` | `#4f6b3f` / `#e4ead6` / `#3f5a33` | le végétal et tout ce qui concerne bébé (« Pour bébé », semaines validées) | 6,3:1 |
| `--terracotta` / `-soft` / `-ink` | `#b85532` / `#f5ddd0` / `#9a4426` | cocotte, cuisson longue, favoris | 5,0:1 |
| `--ochre` / `-soft` / `-ink` | `#d79a2b` / `#f8ebcc` / `#7a5710` | prix, alertes douces | 5,6:1 |
| `--plum` / `-soft` / `-ink` | `#8a3b5c` / `#f2dfe6` / `#7d3452` | « la veille » | 6,6:1 |

Pas de thème sombre en v1, mais tout passe par les jetons.

## Typographie (identité v2, choisie dans Claude Design : direction « Carnet » + éléments « Potager »)
- **Young Serif** (titres, mot-symbole « mijoté ») — serif douce de carnet de cuisine, une seule graisse : jamais de faux gras (`font-synthesis-weight: none`).
- **Outfit Variable** (texte, interface, cartes) — géométrique et ronde, titres de cartes en 600, petites capitales espacées (0,1 em) pour les créneaux.
- Auto-hébergées via Fontsource.

## Formes
Rayon de base 1 rem ; cartes 1,5–2 rem ; puces et boutons en pilule. Ombre `--shadow-card` douce et chaude, `--shadow-float` pour les aperçus et feuilles.

## Illustrations — style « Pastille »
Choisi sur la planche d'icônes v2 (style c). Objectif : net sur iPhone à toutes les tailles, lisible à 40 px, charmant à 120 px.

- **Dessin** : aplats francs + **une seule ombre plate** plus foncée (côté droit / bas), un reflet clair en haut à gauche. Pas de contour d'encre. **Aucun `<filter>`, flou, masque, `feTurbulence`/`feDisplacementMap` ni image matricielle** : l'export échoue s'il en trouve un.
- **Autocollant** (`public/illustrations/<clé>.svg`, composant `Art`) : pastille ronde teintée (jetons `-soft`), anneau crème `#fffaf1`, disque d'ombre décalé (3,5 ; 4,5) dans la même teinte plus soutenue, puis l'aliment avec une **découpe crème** (sa silhouette épaissie de 8) et l'ombre de cette découpe. Sert aux produits seuls : saison, placard, courses, états vides, recherche.
- **Teintes de pastille** (`components/illustrations/meta.ts`, `TONES`) : sauge `#e4ead6`, terracotta `#f5ddd0`, ocre `#f8ebcc`, prune `#f2dfe6` ; ombre `#c9d5b3 / #e7bfa9 / #ead2a0 / #e0bfcd` ; fond de carte (`tintOf`) encore plus pâle. Chaque produit prend la teinte qui le fait ressortir : orange sur sauge, vert sur terracotta ou ocre, rouge et violet sur ocre ou sauge, crème et beige sur prune ou terracotta.
- **Lisibilité** : une silhouette franche par produit, et les cousins se distinguent par la forme autant que par la couleur — carotte (orange, fanes) / panais (ivoire, sens inverse) / patate douce (couchée, rouge, coupée) ; butternut (poire beige) / potiron (côtelé, aplati) / potimarron (goutte rouge, sans côtes) ; chou vert / chou rouge (violet, demi-chou marbré) ; clémentine (feuilles) / orange (demi-tranche) ; pomme (ronde, rouge) / poire (verte, col fin) / coing (poire trapue bosselée, jaune moutarde mat, duvet pâle, grande feuille ovale) ; épinard (feuilles pointues) / mâche (touffe de feuilles rondes en cuillère, sans cœur ni symétrie de fleur) ; céleri-rave (boule bosselée, radicelles, moitié coupée crème, tiges courtes ; purée ivoire en volute dans l'assiette) / pomme de terre (jaune, demi-patate) ; poisson entier ou pavé de saumon (rose) / poisson blanc (filet nacré à stries, peau grise dessous ; dans l'assiette bord doré poêlé + quartier de citron, sinon il disparaît sur l'assiette crème).
- **Viande et poisson toujours cuits à cœur dans l'assiette** (règles bébé) : la viande `plated` est un rôti en tranches en éventail, croûte brune, liseré de gras, chair beige rosé — jamais de rouge ni de rosé saignant, pas de marques de gril (elles faisaient « burger »). Le steak rouge ne reste qu'en produit cru (autocollant).
- **Deux formes par aliment** : `product` (entier, iconique) et, au besoin, `plated` (cuisiné : rondelles, dés, purée, quartiers, tranches, fleurettes, dôme de riz ou de semoule, penne…). Exports : `food/<clé>.svg` = forme cuisinée nue, posée sur y = 104 avec une ombre de contact ; `food/whole/<clé>.svg` = produit entier nu (ce qui dépasse derrière un bol).
- **Contenants** : `food/_badge-<teinte>.svg`, `_plate.svg` (assiette crème vue de trois quarts), `_bowl-terracotta|sage.svg` (bol à liseré crème), `_soup-<couleur>.svg` (surface : orange, vert, rouge, jaune, beige, brun, crème, violet + feuille de persil).
- **Assiette composée** (`Plate`, `components/art.tsx`) : une seule pastille par plat, teinte du produit vedette. Calques `<img>` superposés : pastille → assiette → aliments de l'arrière vers l'avant. Créneaux : **protéine au fond à droite**, l'accompagnement **le plus haut** (`height` dans `meta.ts`) **au fond à gauche**, le plus plat **devant**. Deux aliments : le plus haut au fond à gauche, l'autre devant à droite.
- **Bol plutôt qu'assiette** : plat avec le tag `soup` ou dont le titre contient soupe, velouté, potage, dahl, curry, chili, harira, minestrone, mafé, potée ; dessert dont le titre contient compote, yaourt, petits-suisses, riz au lait, semoule, crème, flan. Surface = couleur du légume (`soup` dans `meta.ts`), crème pour les desserts lactés, brun pour le chocolat, couleur du fruit pour une compote. Les produits entiers (légume à gauche, protéine à droite, ou le fruit du dessert) dépassent derrière le bol. Bol sauge sur pastille terracotta ou prune, terracotta sinon (jamais une soupe verte dans un bol vert).
- **Dessert sans bol** : l'autocollant du produit vedette.
- **Poids** : 56 produits + brin de repli ; autocollants 1,2–4,3 Ko (≈ 120 Ko au total), aliments nus 0,5–3,7 Ko. Planche : `design/screens/icons-v2-sheet.png`.
- **Ajouter un produit** : une clé dans `packages/shared/src/illustrations.ts`, ses métadonnées dans `meta.ts`, son dessin (`product`, éventuellement `plated`) dans le fichier de famille (`squash`, `roots`, `greens`, `garden`, `fruits`, `pantry`), son nom dans `LABELS` (`index.tsx`). Primitives : `draw.tsx` (`P`, `E`, `C`, `L`, `In` pour les détails absents de la découpe).

## Logo
Direction « Carnet » : une cocotte dessinée à l'encre (couvercle terracotta) sur un lavis rond terracotta pâle ; la vapeur monte en tige et devient une feuille sauge. Mot-symbole « mijoté » en minuscules, Young Serif, l'accent du é en terracotta. Versions : couleur, monochrome (`LogoMark mono`), favicon (cocotte crème sur carré terracotta). Planche : https://claude.ai/artifact/LHRP6HfmYnyKZckmmshNpH `public/logo.svg`, favicon, icônes PWA 192/512/maskable et apple-touch générées par `npm run icons -w @mijote/web`.

## Ton
Tutoiement, phrases courtes, verbes d'action. « Touche un repas pour le changer. » Pas de jargon nutritionnel : « Une bonne source de fer aujourd'hui. »

## Impression
Tableau frigo A4 paysage (7 colonnes × Déjeuner / Dîner / Dessert / Ce soir pour demain), liste A4 portrait en deux colonnes. Noir et blanc lisible, aucune navigation imprimée.
