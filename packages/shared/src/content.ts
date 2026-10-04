import aiSamples from "../../../content/ai-samples.json";
import ingredientsJson from "../../../content/ingredients.json";
import pantryBasics from "../../../content/pantry-basics.json";
import breakfast from "../../../content/recipes/breakfast.json";
import dessert from "../../../content/recipes/dessert.json";
import dinner from "../../../content/recipes/dinner.json";
import lunch from "../../../content/recipes/lunch.json";
import { z } from "zod";
import { Ingredient, Recipe } from "./schemas";

// Contenu de départ (seed), validé par Zod au chargement.

export const SEED_FILES = { breakfast, lunch, dinner, dessert } as const;

export const INGREDIENTS: Ingredient[] = z.array(Ingredient).parse(ingredientsJson);
export const RECIPES: Recipe[] = z.array(Recipe).parse([...breakfast, ...lunch, ...dinner, ...dessert]);
/** Brouillons servis par « Proposer des nouveautés » dans la vitrine (simulation de l'IA). */
export const AI_SAMPLES: Recipe[] = z.array(Recipe).parse(aiSamples);
export const PANTRY_BASICS: string[] = pantryBasics;

export const ingredientMap = (list: Ingredient[] = INGREDIENTS) => new Map(list.map((i) => [i.id, i]));
