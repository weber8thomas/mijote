import type { ProductInfo, ProductPhoto } from "@mijote/shared";
import { Search, X, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useRef, useState } from "react";
import { Art } from "@/components/art";
import { cn } from "@/lib/utils";

// Photos d'un produit en grand (Open Food Facts) : le produit, la liste d'ingrédients, le tableau nutritionnel.
// Double tap ou bouton loupe : image entière ↔ taille réelle (on se déplace en faisant glisser) ; pincer marche aussi.

type Shot = { key: "front" | "ingredients" | "nutrition"; label: string; photo: ProductPhoto };
const LABELS = { front: "Produit", ingredients: "Ingrédients", nutrition: "Valeurs nutritionnelles" } as const;

export function productShots(product: Pick<ProductInfo, "image" | "images">): Shot[] {
  const shots = (["front", "ingredients", "nutrition"] as const).flatMap((key) => {
    const photo = product.images?.[key];
    return photo ? [{ key, label: LABELS[key], photo }] : [];
  });
  // Fiche gardée avant l'ajout des photos en grand : on montre au moins la vignette.
  if (!shots.length && product.image) shots.push({ key: "front", label: LABELS.front, photo: { display: product.image, full: product.image } });
  return shots;
}

/** Vignette du produit qui ouvre les photos en grand. */
export function ProductPhotoButton({ product, className, artClassName = "size-16" }: { product: ProductInfo; className?: string; artClassName?: string }) {
  const [open, setOpen] = useState(false);
  const shots = productShots(product);
  const src = product.image ?? shots[0]?.photo.display;
  if (!src)
    return (
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-3xl bg-white ring-1 ring-border", className)}>
        <Art name="sprig" className={artClassName} />
      </span>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("group relative grid shrink-0 place-items-center overflow-hidden rounded-3xl bg-white ring-1 ring-border transition-shadow hover:shadow-card", className)}
        aria-label={`Voir la photo en grand : ${product.name}`}
      >
        <img src={src} alt="" className="size-full object-contain" decoding="async" />
        <span className="absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-full bg-foreground/70 text-white shadow-card" aria-hidden>
          <Search className="size-3.5" />
        </span>
      </button>
      <PhotoViewer open={open} onOpenChange={setOpen} title={product.name} shots={shots} />
    </>
  );
}

export function PhotoViewer({ open, onOpenChange, title, shots }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; shots: Shot[] }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const lastTap = useRef(0);
  const shot = shots[Math.min(index, shots.length - 1)];
  if (!shot) return null;
  const fullReady = loaded[shot.photo.full];

  const toggleZoom = () => setZoomed((z) => !z);
  // Double tap au doigt (le double-clic suffit à la souris).
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const now = Date.now();
    if (now - lastTap.current < 300) toggleZoom();
    lastTap.current = now;
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setZoomed(false);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#1b1714]/[0.97] duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="pt-safe pb-safe fixed inset-0 z-[60] flex flex-col text-white outline-none" aria-describedby={undefined}>
          <div className="flex items-center gap-2 px-2 py-2">
            <DialogPrimitive.Close className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fermer la photo">
              <X className="size-5" />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-center font-heading text-lg">{title}</DialogPrimitive.Title>
            <button type="button" onClick={toggleZoom} className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={zoomed ? "Voir l'image entière" : "Voir en taille réelle"} aria-pressed={zoomed}>
              {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            </button>
          </div>

          <div
            className={cn("relative min-h-0 flex-1 touch-pan-x touch-pan-y touch-pinch-zoom overscroll-contain", zoomed ? "overflow-auto" : "grid place-items-center overflow-hidden p-3")}
            onClick={(e) => {
              // Toucher le fond (hors de l'image) ferme, comme une visionneuse de photos.
              if (e.target === e.currentTarget && !zoomed) onOpenChange(false);
            }}
            onDoubleClick={toggleZoom}
            onPointerUp={onPointerUp}
          >
            {/* L'image affichée sert d'aperçu pendant que la pleine résolution arrive. */}
            {!fullReady && <img src={shot.photo.display} alt="" className={cn("select-none", zoomed ? "max-w-none" : "max-h-full max-w-full object-contain")} draggable={false} />}
            <img
              key={shot.photo.full}
              src={shot.photo.full}
              alt={`${shot.label} : ${title}`}
              onLoad={() => setLoaded((l) => ({ ...l, [shot.photo.full]: true }))}
              className={cn("select-none", !fullReady && "absolute size-0 opacity-0", zoomed ? "max-w-none" : "max-h-full max-w-full rounded-xl object-contain")}
              draggable={false}
            />
          </div>

          <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-3">
            {shots.length > 1 && (
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/10 p-1" role="tablist" aria-label="Photos du produit">
                {shots.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    onClick={() => {
                      setIndex(i);
                      setZoomed(false);
                    }}
                    className={cn("h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors", i === index ? "bg-white text-foreground" : "text-white/85 hover:bg-white/10")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-white/65">Photo : Open Food Facts · CC BY-SA · double tap pour zoomer</p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
