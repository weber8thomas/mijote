import { XIcon } from "lucide-react";
import { motion, useDragControls } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Bottom sheet (Radix Dialog) : glisser la poignée vers le bas pour fermer. Fenêtre centrée sur grand écran.

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Sheet({ open, onOpenChange, title, description, children, footer, className }: Props) {
  const controls = useDragControls();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#2f2a24]/45 backdrop-blur-[2px] duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content asChild>
          <motion.div
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onOpenChange(false);
            }}
            className={cn(
              "paper fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[1.75rem] shadow-float outline-none duration-300 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
              "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-h-[86dvh] md:w-[min(44rem,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.75rem] md:data-open:slide-in-from-bottom-4 md:data-closed:slide-out-to-bottom-4",
              className,
            )}
          >
            <div className="cursor-grab touch-none px-5 pt-2.5 pb-3 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-border-strong md:hidden" aria-hidden />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="font-heading text-xl leading-tight font-semibold">{title}</DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
                  ) : (
                    <DialogPrimitive.Description className="sr-only">Fenêtre de choix</DialogPrimitive.Description>
                  )}
                </div>
                <DialogPrimitive.Close className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Fermer">
                  <XIcon className="size-5" />
                </DialogPrimitive.Close>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
            {footer && <div className="border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
            {!footer && <div className="pb-safe" />}
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
