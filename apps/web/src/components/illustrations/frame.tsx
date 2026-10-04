// Cadres des illustrations « Pastille » : autocollant (pastille teintée, anneau crème, disque d'ombre décalé,
// découpe crème autour de l'aliment), aliment nu pour les assiettes composées, et contenants (assiette, bol, surface).
import type { ReactNode } from "react";
import { BASE, CREAM, Cut, LEAF, LEAF_DARK, leaf } from "./draw";
import type { Draw } from "./draw";
import { SOUPS, TONES } from "./meta";
import type { Soup, Tone } from "./meta";

const svg = (label: string | undefined, children: ReactNode) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role={label ? "img" : undefined} aria-label={label}>
    {children}
  </svg>
);

/** Pastille seule : disque d'ombre décalé, disque teinté, anneau crème. */
export function BadgeShape({ tone }: { tone: Tone }) {
  const t = TONES[tone];
  return (
    <>
      <circle cx={63.5} cy={64.5} r={52} fill={t.shadow} />
      <circle cx={60} cy={60} r={52} fill={t.soft} stroke={CREAM} strokeWidth={3} />
    </>
  );
}

export const Badge = ({ tone }: { tone: Tone }) => svg(undefined, <BadgeShape tone={tone} />);

/** Produit en autocollant sur sa pastille (fichier public/illustrations/<clé>.svg). */
export function Sticker({ draw: D, tone, label }: { draw: Draw; tone: Tone; label?: string }) {
  const shadow = TONES[tone].shadow;
  return svg(
    label,
    <>
      <BadgeShape tone={tone} />
      {/* Réduit autour de (60, 62) pour que l'aliment et sa découpe tiennent dans la pastille. */}
      <g transform="matrix(.84 0 0 .84 9.6 9.9)">
        <use href="#cut" transform="translate(2.5 3)" fill={shadow} stroke={shadow} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        <g fill={CREAM} stroke={CREAM} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round">
          <g id="cut">
            <Cut>
              <D />
            </Cut>
          </g>
        </g>
        <D />
      </g>
    </>,
  );
}

/** Aliment nu, posé sur une petite ombre de contact (`foot` = 0 : sans ombre). Fichiers public/illustrations/food/… */
export function Bare({ draw: D, foot = 34 }: { draw: Draw; foot?: number }) {
  return svg(
    undefined,
    <>
      {foot > 0 && <ellipse cx={60} cy={BASE + 1} rx={foot} ry={6} fill="#5a4630" opacity={0.13} />}
      <D />
    </>,
  );
}

// ---------- Contenants (Plate dans art.tsx les superpose : pastille → contenant → aliments) ----------

/** Assiette vue de trois quarts : rebord crème, fond légèrement plus sombre. Le fond est centré en (60, 70). */
export const PlateDish = () =>
  svg(
    undefined,
    <>
      <ellipse cx={60} cy={74} rx={48} ry={33} fill="#e0d2ba" />
      <ellipse cx={60} cy={70} rx={48} ry={33} fill={CREAM} />
      <ellipse cx={60} cy={71} rx={39} ry={26} fill="#efe6d4" />
    </>,
  );

export const BOWL_COLORS = {
  terracotta: { base: "#c75c36", shade: "#a84726", band: "#f8d9c8" },
  sage: { base: "#7fa65a", shade: "#5f8a40", band: "#e9f0dc" },
} as const;
export type BowlColor = keyof typeof BOWL_COLORS;

/** Bol : le bord intérieur crème est une ellipse centrée en (60, 66), la surface s'y pose. */
export function Bowl({ color }: { color: BowlColor }) {
  const b = BOWL_COLORS[color];
  return svg(
    undefined,
    <>
      <path d="M14 66C14 90 34 107 60 107C86 107 106 90 106 66Z" fill={b.base} />
      <path d="M86 101C99 92 106 80 106 66H97C97 81 93 93 86 101Z" fill={b.shade} />
      <path d="M19 83C36 92 84 92 101 83" fill="none" stroke={b.band} strokeWidth={2.6} strokeLinecap="round" />
      <ellipse cx={60} cy={66} rx={46} ry={16} fill={CREAM} />
    </>,
  );
}

/** Surface d'un bol (soupe, dahl, compote) : aplat, bord ombré, éclats, feuille de persil. */
export function SoupSurface({ soup, garnish = true }: { soup: Soup; garnish?: boolean }) {
  const s = SOUPS[soup];
  return svg(
    undefined,
    <>
      <ellipse cx={60} cy={67.5} rx={40.5} ry={12.5} fill={s.base} />
      <path d="M19.5 67C22 60 38 55 60 55C82 55 98 60 100.5 67C94 62 80 59.5 60 59.5C40 59.5 26 62 19.5 67Z" fill={s.shade} />
      <path d="M36 70C42 66 52 66 58 69M64 72C70 69 78 69 84 71" fill="none" stroke={s.bits} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M31 65.5h3M47 75h3M76 64h3M88 70h3M54 63h2.5" stroke={s.shade} strokeWidth={2} strokeLinecap="round" />
      {garnish && (
        <>
          <path d={leaf(70, 66, 84, 56, 4.2, 0.5)} fill={LEAF} />
          <path d={leaf(70, 66, 64, 54, 3.4, -0.5)} fill={LEAF_DARK} />
        </>
      )}
    </>,
  );
}
