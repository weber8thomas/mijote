/** Texte sans accents ni majuscules, pour chercher « epinard » et trouver « Épinards ». */
export const normalize = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
