// Illustrations aquarelle « botanique illustré » de Mijoté.
// <WatercolorDefs /> doit être rendu une fois à la racine : il porte les filtres partagés.
import type { ComponentType } from "react";
import type { IllustrationKey } from "@mijote/shared";
import { IllustrationTitle } from "./primitives";
import type { IllustrationProps } from "./primitives";
import { Sprig } from "./decor";
import { Betterave, Brocoli, Carotte, Celeri, Champignon, Chou, ChouFleur, Courge, Epinard, Navet, Oignon, Panais, PatateDouce, Poireau, Poivron, PommeDeTerre, Potiron, Tomate } from "./vegetables";
import { Citron, Clementine, Coing, Figue, Kiwi, Poire, Pomme, Raisin } from "./fruits";
import { Avoine, Chataigne, Lentilles, Oeuf, PoisChiche, Poisson } from "./pantry";
import { Cereales, Haricot, Pain, Pates, Poulet, Riz, Tofu, Viande } from "./staples";

export { WatercolorDefs } from "./defs";
export { PaperLeaf, Sprig } from "./decor";
export type { IllustrationProps } from "./primitives";

export const ILLUSTRATIONS: Record<IllustrationKey, ComponentType<IllustrationProps>> = {
  courge: Courge,
  potiron: Potiron,
  carotte: Carotte,
  poireau: Poireau,
  chou: Chou,
  "chou-fleur": ChouFleur,
  brocoli: Brocoli,
  epinard: Epinard,
  betterave: Betterave,
  panais: Panais,
  "patate-douce": PatateDouce,
  champignon: Champignon,
  "pomme-de-terre": PommeDeTerre,
  oignon: Oignon,
  celeri: Celeri,
  navet: Navet,
  poivron: Poivron,
  tomate: Tomate,
  poire: Poire,
  pomme: Pomme,
  raisin: Raisin,
  figue: Figue,
  coing: Coing,
  kiwi: Kiwi,
  clementine: Clementine,
  citron: Citron,
  chataigne: Chataigne,
  lentilles: Lentilles,
  "pois-chiche": PoisChiche,
  poisson: Poisson,
  oeuf: Oeuf,
  avoine: Avoine,
  viande: Viande,
  poulet: Poulet,
  haricot: Haricot,
  tofu: Tofu,
  pates: Pates,
  riz: Riz,
  cereales: Cereales,
  pain: Pain,
};

const isKey = (name: string): name is IllustrationKey => Object.hasOwn(ILLUSTRATIONS, name);

/**
 * Illustration d'un produit par sa clé (repli : brin de feuillage).
 * Sans `title` elle est décorative (aria-hidden) ; avec `title` le SVG porte role="img" + aria-label.
 */
export function Illustration({ name, className, title }: { name: string; className?: string; title?: string }) {
  const Component = isKey(name) ? ILLUSTRATIONS[name] : Sprig;
  return (
    <IllustrationTitle value={title}>
      <Component className={className} />
    </IllustrationTitle>
  );
}
