import { cn } from "@/lib/utils";

// Logo Mijoté (direction « Carnet ») : une cocotte dessinée à l'encre, sa vapeur monte en tige et devient une feuille,
// sur un lavis terracotta. Mot-symbole « mijoté » en Young Serif, l'accent en terracotta.

export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  if (mono)
    return (
      <svg viewBox="0 0 120 120" className={cn("shrink-0", className)} aria-hidden>
        <path d="M60 41c-6-7 4-10 0-17s3-10 9-11" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M69 13c8-4 17-2 20 4-7 4-16 3-20-4z" fill="currentColor" />
        <path d="M30 61c4-9 16-13 30-13s26 4 30 13z" fill="currentColor" />
        <rect x="55" y="41" width="10" height="7" rx="3" fill="currentColor" />
        <path d="M27 62h66l-5 25c-1.5 7-7 11-14 11H46c-7 0-12.5-4-14-11z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M27 69h-8M93 69h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 120" className={cn("shrink-0", className)} aria-hidden>
      <circle cx="60" cy="66" r="47" fill="#f5ddd0" />
      <path d="M60 41c-6-7 4-10 0-17s3-10 9-11" fill="none" stroke="#4f6b3f" strokeWidth="3" strokeLinecap="round" />
      <path d="M69 13c8-4 17-2 20 4-7 4-16 3-20-4z" fill="#7d9a5b" stroke="#4f6b3f" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M30 61c4-9 16-13 30-13s26 4 30 13z" fill="#b85532" stroke="#2f2a24" strokeWidth="3" strokeLinejoin="round" />
      <rect x="55" y="41" width="10" height="7" rx="3" fill="#b85532" stroke="#2f2a24" strokeWidth="3" />
      <path d="M27 62h66l-5 25c-1.5 7-7 11-14 11H46c-7 0-12.5-4-14-11z" fill="#fffaf1" stroke="#2f2a24" strokeWidth="3" strokeLinejoin="round" />
      <path d="M27 69h-8M93 69h8" stroke="#2f2a24" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 76c8 3 36 3 44 0" fill="none" stroke="#b85532" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Mot-symbole « mijoté ». */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading leading-none tracking-[-0.01em] text-foreground", className)}>
      mijot<span className="text-terracotta">é</span>
    </span>
  );
}

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="Mijoté">
      <LogoMark className={size === "lg" ? "size-16" : size === "sm" ? "size-8" : "size-10"} />
      <Wordmark className={size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-3xl"} />
    </span>
  );
}

/** Petite cocotte au trait (format des icônes lucide) : l'action « préparer la semaine ». Prend la couleur du texte. */
export function CocotteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={cn("size-4 shrink-0", className)} aria-hidden>
      <path d="M12 7.4c-1-1.1.5-1.8-.2-3" />
      <path d="M12.3 3.6c1.3-.8 2.9-.5 3.5.5-1.3.8-2.8.6-3.5-.5z" />
      <path d="M5.2 11.3C6.2 9 8.8 8 12 8s5.8 1 6.8 3.3z" />
      <path d="M4 11.3h16l-1.1 5.6a3.3 3.3 0 0 1-3.2 2.6H8.3a3.3 3.3 0 0 1-3.2-2.6z" />
      <path d="M4.2 13.6H2.4M19.8 13.6h1.8" />
    </svg>
  );
}
