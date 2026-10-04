import type { Draw } from "./draw";

/** Un aliment : sa forme « produit » (pastille, liste de courses, placard) et, au besoin, sa forme « cuisinée » pour l'assiette. */
export type Food = { product: Draw; plated?: Draw };
