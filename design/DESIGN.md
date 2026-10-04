# Mijoté — Design

Univers **botanique illustré** : fruits et légumes à l'aquarelle, papier crème légèrement texturé, chaleur d'un carnet de recettes familial. Jamais enfantin, jamais chargé.

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
| `--primary` | `#4f6b3f` | sauge profonde : boutons, sélection | blanc dessus 6,0:1 |
| `--primary-soft` / `--primary-ink` | `#e4ead6` / `#3f5a33` | bébé, succès | 6,3:1 |
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

## Illustrations
32 produits en SVG (`apps/web/src/components/illustrations`), lavis superposés + filtres partagés (`<WatercolorDefs/>` monté une fois) : `wc-wash` (bords organiques, pigment qui s'accumule), `wc-soft`, `wc-ink` (trait tremblé), `wc-grain`. Chaque recette choisit son produit vedette (`illustration`) ; fond de lavis assorti (`tintOf`). < 2 Ko par illustration.

## Pictos
- **Fer** : anneau en trois arcs prune autour de « Fe » (`IronGauge`), comme un objectif du jour à compléter.
- **Assiette** : la vignette d'un plat superpose protéine, légume et féculent (2 ou 3 illustrations), le dessert garde son fruit.

## Logo
Direction « Carnet » : une cocotte dessinée à l'encre (couvercle terracotta) sur un lavis rond terracotta pâle ; la vapeur monte en tige et devient une feuille sauge. Mot-symbole « mijoté » en minuscules, Young Serif, l'accent du é en terracotta. Versions : couleur, monochrome (`LogoMark mono`), favicon (cocotte crème sur carré terracotta). Planche : https://claude.ai/artifact/LHRP6HfmYnyKZckmmshNpH `public/logo.svg`, favicon, icônes PWA 192/512/maskable et apple-touch générées par `npm run icons -w @mijote/web`.

## Ton
Tutoiement, phrases courtes, verbes d'action. « Touche un repas pour le changer. » Pas de jargon nutritionnel : « Une bonne source de fer aujourd'hui. »

## Impression
Tableau frigo A4 paysage (7 colonnes × Déjeuner / Dîner / Dessert / Ce soir pour demain), liste A4 portrait en deux colonnes. Noir et blanc lisible, aucune navigation imprimée.
