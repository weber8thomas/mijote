import * as core from "@mijote/shared/ai";
import { AiError, type AiConfig, type AiRecipe, type FridgeItem, type IdeasContext, type ImageInput } from "@mijote/shared/ai";
import type { Ingredient } from "@mijote/shared";

// Claude, vu du téléphone : avec le serveur du foyer, la demande part au serveur (sa clé, sa limite du jour) ;
// dans la vitrine, elle part directement vers Anthropic avec la clé gardée sur l'appareil.

export { AI_MODELS, AiError, convert, DEFAULT_MODEL, testKey } from "@mijote/shared/ai";
export type { AiConfig, AiRecipe, FridgeItem, IdeasContext } from "@mijote/shared/ai";

/** Où part l'appel : le serveur du foyer, ou Anthropic avec la clé de l'appareil. */
export type AiTarget = AiConfig | "server";

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${import.meta.env.BASE_URL}api/ai/${path}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new AiError("Le serveur du foyer ne répond pas.", "network");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; kind?: AiError["kind"] };
  if (!res.ok) throw new AiError(data.error ?? `Erreur du serveur (${res.status}).`, data.kind ?? "other");
  return data;
}

export const ideas = (t: AiTarget, ingredients: Ingredient[], ctx: IdeasContext) =>
  t === "server" ? post<{ recipes: AiRecipe[] }>("ideas", { ctx }).then((r) => r.recipes) : core.ideas(t, ingredients, ctx);

export const fromInventory = (t: AiTarget, ingredients: Ingredient[], have: string[], month: string) =>
  t === "server" ? post<{ recipes: AiRecipe[] }>("inventory", { have, month }).then((r) => r.recipes) : core.fromInventory(t, ingredients, have, month);

export const fromUrl = (t: AiTarget, ingredients: Ingredient[], url: string) =>
  t === "server" ? post<{ recipes: AiRecipe[] }>("url", { url }).then((r) => r.recipes) : core.fromUrl(t, ingredients, url);

export async function fromPhoto(t: AiTarget, ingredients: Ingredient[], photo: File) {
  const image = await shrink(photo);
  return t === "server" ? post<{ recipes: AiRecipe[] }>("photo", { image }).then((r) => r.recipes) : core.fromPhoto(t, ingredients, image);
}

export async function readFridge(t: AiTarget, ingredients: Ingredient[], photo: File): Promise<FridgeItem[]> {
  const image = await shrink(photo);
  return t === "server" ? post<{ items: FridgeItem[] }>("fridge", { image }).then((r) => r.items) : core.readFridge(t, ingredients, image);
}

/** Photo → JPEG ≤ 1568 px (taille utile maximale pour la vision), en base64. */
async function shrink(file: File): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { mediaType: "image/jpeg", data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1] };
}
