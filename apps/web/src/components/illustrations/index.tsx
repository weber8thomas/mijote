// Illustrations « Pastille » de Mijoté : aplats nets, ombre plate, pastille teintée, découpe crème. Aucun filtre.
// Ces composants ne servent qu'à l'export (scripts/illustrations.ts → public/illustrations) ; l'appli affiche les
// fichiers en <img> (components/art.tsx) et ne lit ici que les métadonnées (meta.ts).
import type { IllustrationKey } from "@mijote/shared";
import type { Food } from "./food";
import { FRUITS } from "./fruits";
import { GARDEN } from "./garden";
import { GREENS, SPRIG_FOOD } from "./greens";
import { PANTRY } from "./pantry";
import { ROOTS } from "./roots";
import { SQUASH } from "./squash";

export type { Food } from "./food";
export { META, metaOf, SOUPS, TONES } from "./meta";
export type { Meta, Soup, Tone } from "./meta";

export const ILLUSTRATIONS: Record<IllustrationKey, Food> = { ...SQUASH, ...ROOTS, ...GREENS, ...GARDEN, ...FRUITS, ...PANTRY };

/** Repli d'une clé inconnue : un brin de feuillage. */
export const SPRIG = SPRIG_FOOD;

/** Nom accessible de chaque fichier exporté (role="img"). */
export const LABELS: Record<IllustrationKey | "sprig", string> = {
  courge: "Courge butternut",
  potiron: "Potiron",
  potimarron: "Potimarron",
  carotte: "Carotte",
  poireau: "Poireau",
  chou: "Chou vert",
  "chou-rouge": "Chou rouge",
  "chou-fleur": "Chou-fleur",
  brocoli: "Brocoli",
  epinard: "Épinards",
  mache: "Mâche",
  endive: "Endives",
  fenouil: "Fenouil",
  courgette: "Courgette",
  betterave: "Betterave",
  panais: "Panais",
  "patate-douce": "Patate douce",
  champignon: "Champignons",
  celeri: "Céleri-rave",
  navet: "Navet",
  poivron: "Poivron",
  tomate: "Tomates",
  "petits-pois": "Petits pois",
  oignon: "Oignon",
  ail: "Ail",
  echalote: "Échalotes",
  gingembre: "Gingembre",
  herbes: "Herbes",
  poire: "Poire",
  pomme: "Pomme",
  raisin: "Raisin",
  figue: "Figues",
  coing: "Coing",
  kiwi: "Kiwi",
  clementine: "Clémentine",
  orange: "Orange",
  citron: "Citron",
  chataigne: "Châtaignes",
  quetsche: "Quetsches",
  "fruits-rouges": "Fruits rouges",
  banane: "Banane",
  lentilles: "Lentilles",
  "pois-chiche": "Pois chiches",
  haricot: "Haricots",
  poisson: "Poisson",
  "poisson-blanc": "Poisson blanc",
  oeuf: "Œuf",
  viande: "Viande",
  poulet: "Poulet",
  tofu: "Tofu",
  pates: "Pâtes",
  riz: "Riz",
  cereales: "Céréales",
  pain: "Pain",
  "pomme-de-terre": "Pommes de terre",
  avoine: "Avoine",
  sprig: "Brin de feuillage",
};
