import { cn } from "@/lib/utils";

// Logo Mijoté : une cocotte dont la vapeur s'élève en tige et devient une feuille.

export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  const pot = mono ? "currentColor" : "#b85532";
  const lid = mono ? "currentColor" : "#9a4426";
  const leaf = mono ? "currentColor" : "#4f6b3f";
  const leafLight = mono ? "currentColor" : "#7d9a5b";
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden>
      {/* vapeur → tige → feuille */}
      <path d="M31 22c-3-4 1-6 0-10s2-7 6-8" fill="none" stroke={leaf} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36.5 4.2c5.5-1.6 11.4.4 13.6 4.6-4.6 2.4-11.2 1.6-13.6-4.6z" fill={leafLight} opacity={mono ? 1 : 0.95} />
      <path d="M37 4.6c4 1 7.6 2.6 11.6 4" fill="none" stroke={leaf} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      {/* couvercle */}
      <path d="M12 30.5c1.5-6 9.5-9 20-9s18.5 3 20 9z" fill={lid} />
      <rect x="28" y="18.5" width="8" height="4" rx="2" fill={lid} />
      {/* corps */}
      <path d="M9.5 32h45c.9 0 1.5.8 1.3 1.7l-2.6 12.6C52.4 51 48.6 54 44 54H20c-4.6 0-8.4-3-9.2-7.7L8.2 33.7c-.2-.9.4-1.7 1.3-1.7z" fill={pot} />
      <path d="M8.6 36.5H4.8c-1.4 0-1.9 1.9-.7 2.6l4.9 2.6zM55.4 36.5h3.8c1.4 0 1.9 1.9.7 2.6l-4.9 2.6z" fill={lid} />
      {!mono && <path d="M15 38c.6 4.6 2.4 8.4 6.4 10" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={size === "lg" ? "size-14" : size === "sm" ? "size-7" : "size-9"} />
      <span className={cn("font-heading font-semibold tracking-tight text-foreground", size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl")}>Mijoté</span>
    </span>
  );
}
