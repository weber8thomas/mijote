// Décors : brin feuillu (repli générique) et petite feuille-indicateur.
import { Frame, Ink, LEAF, LEAF_DARK, LEAF_LIGHT, LG, W, leaf, url, veins } from "./primitives";
import type { IllustrationProps } from "./primitives";

const SPRIG: [number, number, number, number, number][] = [
  [36, 88, 18, 70, 7],
  [44, 76, 58, 90, 7],
  [52, 64, 32, 50, 7.5],
  [62, 54, 78, 68, 7.5],
  [70, 44, 54, 28, 7],
  [80, 36, 98, 46, 6.5],
  [88, 28, 98, 12, 6],
];
const SPRIG_COLORS = [LEAF, LEAF_LIGHT, LEAF_DARK];

/** Brin de feuillage aquarelle : décor, et repli pour une clé inconnue. */
export function Sprig({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <Ink c="#7f8a52" o={0.9} w={2}>
        <path d="M24 104C38 86 56 62 74 44C82 36 88 30 94 22" />
      </Ink>
      {SPRIG.map(([bx, by, tx, ty, w], i) => (
        <W key={i} d={leaf(bx, by, tx, ty, w, i % 2 ? -1.5 : 1.5)} f={SPRIG_COLORS[i % 3] ?? LEAF} o={0.8} />
      ))}
      <Ink o={0.45} w={1}>
        <path d={SPRIG.map(([bx, by, tx, ty, w]) => veins(bx, by, tx, ty, 2, w)).join("")} />
      </Ink>
    </Frame>
  );
}

const PAPER_LEAF = leaf(24, 98, 98, 22, 24, 2);

/** Petite feuille aquarelle (indicateur 1–3) : pleine ou simple contour. */
export function PaperLeaf({ className, filled = true }: IllustrationProps & { filled?: boolean }) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="paper-leaf-a" c={["#a9bf7f", "#6f8f50"]} x2={1} y2={1} />
      </defs>
      {filled ? (
        <>
          <W d={PAPER_LEAF} f={url("paper-leaf-a")} o={0.9} />
          <W d={leaf(40, 88, 96, 26, 10, 8)} f={LEAF_DARK} o={0.35} />
          <Ink o={0.55} w={4}>
            <path d="M18 104L28 94M28 94L90 30" />
          </Ink>
        </>
      ) : (
        <Ink o={0.5} w={6}>
          <path d={PAPER_LEAF} />
          <path d="M18 104L28 94M28 94L84 36" />
        </Ink>
      )}
    </Frame>
  );
}
