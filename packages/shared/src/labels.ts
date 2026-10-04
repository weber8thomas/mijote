import type { MainProtein, Slot } from "./schemas";

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const SLOT_LABELS: Record<Slot, string> = { breakfast: "Petit-déj", lunch: "Midi", dinner: "Soir", dessert: "Dessert" };
export const SLOT_LABELS_LONG: Record<Slot, string> = { breakfast: "Petit-déjeuner", lunch: "Midi", dinner: "Soir", dessert: "Dessert" };

export const PROTEIN_LABELS: Record<MainProtein, string> = {
  "red-meat": "viande rouge",
  poultry: "volaille",
  fish: "poisson",
  "oily-fish": "poisson gras",
  egg: "œuf",
  legume: "légumineuses",
  dairy: "laitage",
  veggie: "légumes",
  none: "—",
};

export const CHANNEL_LABELS = { market: "Marché", supermarket: "Supermarché" } as const;
