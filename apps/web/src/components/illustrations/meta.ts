// Métadonnées des illustrations « Pastille », sans aucun dessin : importables par l'appli (art.tsx, kit.tsx)
// sans embarquer les composants SVG, qui ne servent qu'à l'export (scripts/illustrations.ts).
import type { IllustrationKey } from "@mijote/shared";

/** Pastilles : jetons « -soft » de DESIGN.md, l'ombre décalée en plus soutenu, le fond de carte en plus pâle. */
export const TONES = {
  sage: { soft: "#e4ead6", shadow: "#c9d5b3", wash: "#eff3e6" },
  terracotta: { soft: "#f5ddd0", shadow: "#e7bfa9", wash: "#faede5" },
  ochre: { soft: "#f8ebcc", shadow: "#ead2a0", wash: "#fbf4e2" },
  plum: { soft: "#f2dfe6", shadow: "#e0bfcd", wash: "#f8eef2" },
} as const;
export type Tone = keyof typeof TONES;
export const TONE_NAMES = Object.keys(TONES) as Tone[];

/** Surface d'un bol (soupe, dahl, compote…) : couleur, ombre de bord, et petits éclats de texture. */
export const SOUPS = {
  orange: { base: "#f2a452", shade: "#dc8a3a", bits: "#fbc983" },
  green: { base: "#9dbb5f", shade: "#82a247", bits: "#c3d98c" },
  red: { base: "#d9603f", shade: "#bd4a2d", bits: "#f08c66" },
  yellow: { base: "#f1c24f", shade: "#d9a535", bits: "#f9db8a" },
  beige: { base: "#e7cfa1", shade: "#d0b37f", bits: "#f5e6c6" },
  brown: { base: "#9c6b45", shade: "#835533", bits: "#c08f62" },
  cream: { base: "#fbf1dc", shade: "#e9dcbf", bits: "#ffffff" },
  purple: { base: "#a2527c", shade: "#863f65", bits: "#c97ea4" },
} as const;
export type Soup = keyof typeof SOUPS;
export const SOUP_NAMES = Object.keys(SOUPS) as Soup[];

export type Kind = "veg" | "fruit" | "protein" | "starch" | "aromatic" | "pantry";

/**
 * - `tone` : pastille, choisie pour contraster avec l'aliment (orange sur sauge, vert sur terracotta…).
 * - `height` : 1 plat (rondelles, purée) · 2 moyen · 3 haut (brocoli, dôme de riz). Le plus haut des accompagnements va au fond.
 * - `size` : échelle dans l'assiette (1 = normal). `foot` : demi-largeur de l'ombre de contact (boîte 120).
 * - `soup` : couleur de la surface quand l'aliment colore un bol.
 */
export type Meta = { tone: Tone; kind: Kind; height: 1 | 2 | 3; size?: number; foot?: number; soup: Soup };

const m = (tone: Tone, kind: Kind, height: 1 | 2 | 3, soup: Soup, extra: Partial<Meta> = {}): Meta => ({ tone, kind, height, soup, ...extra });

export const META: Record<IllustrationKey, Meta> = {
  courge: m("sage", "veg", 2, "orange"),
  potiron: m("sage", "veg", 2, "orange"),
  potimarron: m("sage", "veg", 1, "orange"),
  carotte: m("sage", "veg", 1, "orange"),
  poireau: m("terracotta", "veg", 2, "green", { size: 1.05 }),
  chou: m("ochre", "veg", 2, "green"),
  "chou-rouge": m("sage", "veg", 2, "purple"),
  "chou-fleur": m("terracotta", "veg", 3, "cream"),
  brocoli: m("terracotta", "veg", 3, "green"),
  epinard: m("ochre", "veg", 2, "green"),
  mache: m("plum", "veg", 1, "green"),
  endive: m("plum", "veg", 2, "cream"),
  fenouil: m("terracotta", "veg", 3, "cream"),
  courgette: m("ochre", "veg", 1, "green"),
  betterave: m("ochre", "veg", 2, "purple"),
  panais: m("plum", "veg", 1, "beige"),
  "patate-douce": m("sage", "veg", 1, "orange"),
  champignon: m("sage", "veg", 2, "beige"),
  celeri: m("terracotta", "veg", 2, "beige"),
  navet: m("sage", "veg", 2, "cream"),
  poivron: m("ochre", "veg", 2, "red"),
  tomate: m("sage", "veg", 2, "red"),
  "petits-pois": m("plum", "veg", 1, "green"),
  oignon: m("sage", "aromatic", 2, "beige"),
  ail: m("terracotta", "aromatic", 2, "cream"),
  echalote: m("sage", "aromatic", 2, "beige"),
  gingembre: m("plum", "aromatic", 2, "yellow"),
  herbes: m("ochre", "aromatic", 3, "green"),
  poire: m("plum", "fruit", 3, "beige"),
  pomme: m("ochre", "fruit", 3, "beige"),
  raisin: m("ochre", "fruit", 3, "purple"),
  figue: m("sage", "fruit", 2, "purple"),
  coing: m("plum", "fruit", 3, "yellow"),
  kiwi: m("plum", "fruit", 2, "green"),
  clementine: m("sage", "fruit", 2, "orange"),
  orange: m("sage", "fruit", 2, "orange"),
  citron: m("sage", "fruit", 2, "yellow"),
  chataigne: m("ochre", "fruit", 2, "brown"),
  quetsche: m("ochre", "fruit", 2, "purple"),
  "fruits-rouges": m("sage", "fruit", 2, "red"),
  banane: m("sage", "fruit", 2, "yellow"),
  lentilles: m("plum", "protein", 2, "yellow"),
  "pois-chiche": m("terracotta", "protein", 1, "beige"),
  haricot: m("sage", "protein", 1, "brown"),
  poisson: m("terracotta", "protein", 2, "cream", { size: 1.05 }),
  oeuf: m("plum", "protein", 2, "yellow"),
  viande: m("sage", "protein", 2, "brown"),
  poulet: m("sage", "protein", 2, "beige", { size: 1.05 }),
  tofu: m("sage", "protein", 2, "cream"),
  pates: m("terracotta", "starch", 2, "yellow"),
  riz: m("terracotta", "starch", 3, "cream"),
  cereales: m("sage", "starch", 2, "yellow"),
  pain: m("sage", "starch", 2, "beige"),
  "pomme-de-terre": m("plum", "starch", 2, "beige"),
  avoine: m("terracotta", "pantry", 2, "beige"),
};

const FALLBACK: Meta = m("ochre", "aromatic", 2, "green");
export const metaOf = (key: string): Meta => (Object.hasOwn(META, key) ? META[key as IllustrationKey] : FALLBACK);
