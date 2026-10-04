// Protéines et féculents : lentilles, pois chiches, haricots, poisson, œuf, viande, poulet, tofu, pâtes, riz, céréales, pain, avoine.
import type { IllustrationKey } from "@mijote/shared";
import { C, cube, dots, E, G, heap, In, L, leaf, LEAF, P } from "./draw";
import type { Pt } from "./draw";
import type { Food } from "./food";

// ---------- Légumineuses ----------
const MOUND = heap(60, 102, 46, 40, 16, 2.4);
const lentils = () => (
  <>
    <P d={MOUND} f="#8e8b4c" />
    <In>
      <P d="M70 64C88 70 104 84 106 102C98 104 90 105 82 105C90 92 86 76 70 64Z" f="#706d38" />
      <P d={dots([[34, 86], [46, 76], [58, 68], [70, 74], [52, 90], [40, 96], [66, 88], [78, 84], [28, 96], [60, 98], [48, 82], [56, 78]], 2.6)} f="#b8b571" />
      <P d={dots([[40, 86], [52, 72], [64, 80], [72, 94], [58, 92], [34, 94], [76, 70], [88, 88], [86, 98]], 2.4)} f="#5d5b2c" />
    </In>
  </>
);

const CHICKPEAS: Pt[] = [[28, 93], [49, 95], [70, 95], [91, 93], [38, 77], [59, 78], [80, 77], [49, 61], [70, 61]];
const chickpea = ([x, y]: Pt, i: number) => (
  <g key={i}>
    <C x={x} y={y} r={11} f="#e6c27f" />
    <In>
      <P d={`M${x - 10} ${y + 4}C${x - 6} ${y + 12} ${x + 8} ${y + 12} ${x + 11} ${y}C${x + 6} ${y + 6} ${x - 4} ${y + 8} ${x - 10} ${y + 4}Z`} f="#c99e57" />
      <L d={`M${x - 2} ${y - 10}C${x - 4} ${y - 4} ${x - 2} ${y + 2} ${x + 2} ${y + 6}`} c="#d4ad68" w={1.6} />
      <C x={x - 5} y={y - 4} r={2.4} f="#f4dca6" />
    </In>
  </g>
);

const BEANS: [number, number, number][] = [[32, 94, -10], [58, 97, 8], [84, 94, -6], [44, 79, 14], [70, 80, -12], [58, 64, -4], [92, 78, 24]];
const bean = ([x, y, a]: [number, number, number], i: number) => (
  <G key={i} t={`translate(${x} ${y}) rotate(${a})`}>
    <P d="M-15 0C-15-9-7-12-1-8C5-12 15-10 15-1C15 8 7 11 0 11C-7 11-15 8-15 0Z" f="#9c3b2e" />
    <In>
      <P d="M-13 3C-10 9-4 10 0 10C7 10 13 7 14 0C10 5 4 7-1 7C-6 7-10 6-13 3Z" f="#762a20" />
      <L d="M-8-4C-6-6-3-6-1-5" c="#cf7a63" w={2} />
    </In>
  </G>
);

// ---------- Poisson, œuf, viande, volaille ----------
const FILLET = "M-22-12C-19-20 8-23 21-17C24-14 23-9 19-7C7-3-13-3-20-5C-23-7-23-10-22-12Z";
const salmon = () => (
  <G t="translate(60 102) scale(2.3)">
    <G t="translate(0 5)">
      <P d={FILLET} f="#cc5f3d" />
    </G>
    <P d={FILLET} f="#f48c6b" />
    <In>
      <L d="M-12-16C-14-12-14-9-12-5.5M-3-18C-5-14-5-10-3-5M6-18.5C4-15 4-10 6-6M14-17C12-14 12-10 14-7.5" c="#ffd9c8" w={1.7} />
    </In>
  </G>
);

const halfEgg = (x: number, y: number) => (
  <>
    <E x={x} y={y + 4} rx={21} ry={12.5} f="#e8decc" />
    <E x={x} y={y} rx={21} ry={12.5} f="#ffffff" />
    <E x={x} y={y + 0.5} rx={10} ry={6.8} f="#f7b62a" />
    <In>
      <P d={`M${x - 10} ${y + 1.5}C${x - 8} ${y + 6} ${x + 8} ${y + 6} ${x + 10} ${y + 1.5}C${x + 8} ${y + 4} ${x - 8} ${y + 4} ${x - 10} ${y + 1.5}Z`} f="#d99520" />
      <E x={x - 3} y={y - 1.5} rx={3.6} ry={2} f="#ffffff" o={0.6} />
    </In>
  </>
);

const DRUM_MEAT = "M-20 0C-21-11-10-14 0-11C6-9 9-5 12-2V2C9 5 6 9 0 11C-10 14-21 11-20 0Z";
const DRUM_BONE = "M9-2.5H19C19-6 25-7.5 26.5-4.5C27.5-2.5 26-0.5 25 0C26 .5 27.5 2.5 26.5 4.5C25 7.5 19 6 19 2.5H9Z";
const drumstick = (t: string) => (
  <G t={t}>
    <P d={DRUM_BONE} f="#fff8ea" />
    <P d={DRUM_MEAT} f="#e0913f" />
    <In>
      <P d="M-20 1C-18 10-8 12 0 9.5C5 7.5 9 4.5 12 2C6 5-7 8-20 1Z" f="#b86a2a" />
      <P d="M3 2.5H19C19 4.5 21 6.5 24 6C21 8 18 6.5 18 4.5H9Z" f="#e6d6b6" />
      <L d="M-15-5C-11-9-5-9-1-8" c="#f3bd7a" w={2.4} />
    </In>
  </G>
);

/** Tranche de rôti posée à plat, vue de trois quarts. */
const ROAST = "M-21-3C-21-11-11-14 0-14C12-14 21-10 21-2C21 7 12 12 0 12C-12 12-21 7-21-3Z";

/** Filet de poisson blanc : bout épais arrondi à gauche, s'affine vers la queue à droite. Centré en (0, 0). */
const WHITE_FILLET = "M-42-2C-41-13-26-19-8-18C10-17 28-12 40-4C44-1 44 3 40 5C28 10 10 13-8 13C-26 13-41 9-42-2Z";
const FLAKES = "M-26-14C-30-6-30 4-26 11M-12-16C-16-8-16 4-12 12M2-16C-2-8-2 4 2 12M16-13C12-6 12 3 16 9M28-8C25-4 25 2 28 6";
const lemonWedge = (x: number, y: number) => (
  <>
    <P d={`M${x - 13} ${y}A13 11 0 0 0 ${x + 13} ${y}Z`} f="#e9b923" />
    <P d={`M${x - 10.5} ${y}A10.5 8.5 0 0 0 ${x + 10.5} ${y}Z`} f="#fbe27a" />
    <In>
      <L d={`M${x} ${y}V${y + 7}M${x} ${y}L${x - 6.5} ${y + 5.5}M${x} ${y}L${x + 6.5} ${y + 5.5}`} c="#fff6c9" w={1.4} />
    </In>
    <P d={`M${x - 13} ${y - 1.6}H${x + 13}V${y + 0.6}H${x - 13}Z`} f="#fff6c9" />
  </>
);

const STEAK = "M18 62C16 44 40 38 60 42C80 38 104 46 102 64C100 82 80 90 60 88C38 92 20 80 18 62Z";

// ---------- Féculents ----------
const DOME = "M-19 0C-20-12-11-21 0-21C11-21 20-12 19 0C12 4-12 4-19 0Z";
const rice = (t: string) => (
  <G t={t}>
    <P d={DOME} f="#ffffff" />
    <In>
      <P d="M5-20C13-17 20-10 19 0C14 3 8 3 3 3C10-3 11-13 5-20Z" f="#e8dfcd" />
      <L d="M-10-12l2.4-.8M-2-17l2.4-.8M4-10l2.4-.8M-7-5l2.4-.8M-14-6l2-.8" c="#c7b99f" w={1.3} />
    </In>
  </G>
);

// Penne : tube à bouts biseautés, stries, trou sombre.
const PENNE: [number, number, number][] = [[34, 94, -8], [66, 97, 10], [88, 88, -30], [44, 78, 24], [72, 78, -14], [56, 63, 6]];
const penne = ([x, y, a]: [number, number, number], i: number) => (
  <G key={i} t={`translate(${x} ${y}) rotate(${a})`}>
    <P d="M-18-6.5H11L18 6.5H-11Z" f="#f2c75c" />
    <In>
      <P d="M-11 6.5H18L16.4 3.5H-12.6Z" f="#d9a838" />
      <L d="M-9-2.5H8M-6 1.5H11" c="#f9e3a0" w={1.6} />
    </In>
    <E x={14.5} y={0} rx={2.6} ry={6.5} a={-28} f="#c08e26" />
  </G>
);

const WHEAT: [number, number, number][] = [[61, 30, 0], [58, 40, -1], [64, 40, 1], [56, 51, -1], [66, 51, 1], [55, 62, -1], [67, 62, 1], [55, 73, -1], [66, 73, 1]];
const OAT: Pt[] = [[32, 28], [26, 42], [40, 40], [86, 28], [94, 42], [80, 40]];

export const PANTRY = {
  lentilles: { product: () => <G t="translate(0 -18)">{lentils()}</G>, plated: lentils },
  "pois-chiche": { product: () => <G t="translate(0 -16)">{CHICKPEAS.map(chickpea)}</G>, plated: () => <>{CHICKPEAS.map(chickpea)}</> },
  haricot: { product: () => <G t="translate(0 -16)">{BEANS.map(bean)}</G>, plated: () => <>{BEANS.map(bean)}</> },
  poisson: {
    product: () => (
      <>
        <P d="M54 44C58 34 70 32 80 40C72 40 64 42 58 48Z" f="#4d6a80" />
        <P d="M86 62L106 42C109 54 109 70 106 84L86 64Z" f="#4d6a80" />
        <P d="M14 63C26 44 62 38 88 60V66C62 88 26 84 14 63Z" f="#5f7f96" />
        <In>
          <P d="M14 63C26 74 58 80 88 66C62 88 26 84 14 63Z" f="#dae4e4" />
          <L d="M30 61C46 58 66 59 84 63" c="#9fb6c4" w={1.8} />
          <L d="M34 52C38 58 38 68 34 74" c="#4d6a80" w={2} />
          <C x={25} y={59} r={3.6} f="#ffffff" />
          <C x={24.4} y={59} r={2} f="#2f2a24" />
        </In>
        <P d="M44 78C48 86 56 88 62 84C56 82 50 80 44 78Z" f="#4d6a80" />
      </>
    ),
    plated: salmon,
  },
  // Poisson blanc (cabillaud, lieu, merlu) : filet nacré à stries, bande de peau grise dessous pour se détacher de la découpe crème.
  "poisson-blanc": {
    product: () => (
      <>
        <G t="translate(58 70) rotate(-22) scale(1.16)">
          <G t="translate(0 6)">
            <P d={WHITE_FILLET} f="#6f8591" />
          </G>
          <G t="translate(0 3)">
            <P d={WHITE_FILLET} f="#aab8bf" />
          </G>
          <P d={WHITE_FILLET} f="#f8f4ec" />
          <In>
            <L d={FLAKES} c="#cfc4b2" w={1.7} />
            <P d="M-36-6C-33-12-24-15-14-15C-22-12-28-8-31-3C-33-3-35-4-36-6Z" f="#ffffff" />
          </In>
        </G>
        {lemonWedge(90, 94)}
      </>
    ),
    // Filet poêlé : bord doré, chair blanche, quartier de citron pour qu'il se détache de l'assiette crème.
    plated: () => (
      <>
        <G t="translate(56 92) scale(1.12 .9)">
          <G t="translate(0 5)">
            <P d={WHITE_FILLET} f="#b8781f" />
          </G>
          <P d={WHITE_FILLET} f="#e4a53a" />
          <In>
            <G t="translate(-2 -1) scale(.86 .78)">
              <P d={WHITE_FILLET} f="#fbf7ee" />
            </G>
            <L d={FLAKES} c="#e7ddcd" w={1.6} />
            <P d="M-40 2C-36 8-26 11-14 12C-26 12-36 9-40 2Z" f="#c98a2a" />
          </In>
        </G>
        {lemonWedge(92, 92)}
      </>
    ),
  },
  oeuf: {
    product: () => (
      <>
        <P d="M46 16C32 16 24 42 24 60C24 78 34 90 46 90C58 90 68 78 68 60C68 42 60 16 46 16Z" f="#ecc58f" />
        <In>
          <P d="M56 22C64 32 68 48 68 60C68 78 58 90 46 90C58 84 64 72 64 58C64 44 61 30 56 22Z" f="#cfa067" />
          <P d="M33 42C35 33 39 27 44 25C40 32 38 39 37 48C35 47 33 45 33 42Z" f="#ffffff" o={0.55} />
        </In>
        {halfEgg(80, 87)}
      </>
    ),
    plated: () => (
      <>
        {halfEgg(42, 84)}
        {halfEgg(78, 90)}
      </>
    ),
  },
  viande: {
    product: () => (
      <>
        <G t="translate(0 7)">
          <P d={STEAK} f="#8f2b25" />
        </G>
        <P d={STEAK} f="#f3dfc8" />
        <P d="M24 64C22 50 42 46 60 49C78 46 96 52 95 64C94 78 78 84 60 82C40 86 26 76 24 64Z" f="#c8443c" />
        <In>
          <P d="M24 66C28 78 42 84 60 82C78 84 94 78 95 66C88 74 74 78 60 76C44 78 30 74 24 66Z" f="#a3342e" />
          <L d="M36 58C44 54 50 60 58 56M62 66C70 62 76 68 84 62M42 70C48 68 52 72 58 70" c="#e8857b" w={2} />
        </In>
      </>
    ),
    // Rôti en tranches, cuit à cœur (croûte brune, liseré de gras, chair beige rosé, jamais saignante), en éventail.
    plated: () => (
      <>
        {(
          [
            [36, 90, -16],
            [58, 84, -2],
            [82, 88, 14],
          ] as const
        ).map(([x, y, a], i) => (
          <g key={i}>
            <G t={`translate(${x} ${y + 4}) rotate(${a})`}>
              <P d={ROAST} f="#6b3d22" />
            </G>
            <G t={`translate(${x} ${y}) rotate(${a})`}>
              <P d={ROAST} f="#8f5434" />
              <In>
                <G t="translate(0 1) scale(.88 .8)">
                  <P d={ROAST} f="#f1e0c6" />
                </G>
                <G t="translate(0 1.5) scale(.84 .72)">
                  <P d={ROAST} f="#cf9a7e" />
                </G>
                <E x={-6} y={-1} rx={6} ry={2.4} f="#e2b49b" />
              </In>
            </G>
          </g>
        ))}
      </>
    ),
  },
  poulet: {
    product: () => drumstick("translate(54 64) scale(2.15) rotate(-30)"),
    plated: () => drumstick("translate(52 86) scale(2) rotate(-18)"),
  },
  tofu: {
    product: () => {
      const big = cube(54, 48, 32, 30);
      const small = cube(92, 84, 12, 11);
      return (
        <>
          <P d={big.left} f="#e9dfc4" />
          <P d={big.right} f="#d6c8a5" />
          <P d={big.top} f="#fbf6e6" />
          <P d={small.left} f="#e9dfc4" />
          <P d={small.right} f="#d6c8a5" />
          <P d={small.top} f="#fbf6e6" />
          <In>
            <P d={dots([[40, 70], [46, 82], [34, 82], [68, 78], [76, 70], [62, 88]], 1.3)} f="#cbbd98" />
          </In>
        </>
      );
    },
    plated: () => (
      <>
        {(
          [
            [48, 74],
            [74, 74],
            [36, 88],
            [62, 88],
            [86, 86],
          ] as Pt[]
        ).map(([x, y], i) => {
          const c = cube(x, y, 12, 10);
          return (
            <g key={i}>
              <P d={c.left} f="#e1ac4f" />
              <P d={c.right} f="#c88b36" />
              <P d={c.top} f="#f3cf7a" />
            </g>
          );
        })}
      </>
    ),
  },
  pates: { product: () => <G t="translate(-3 -20) scale(1.05)">{PENNE.map(penne)}</G>, plated: () => <>{PENNE.map(penne)}</> },
  riz: {
    product: () => (
      <>
        {rice("translate(60 70) scale(2)")}
        <P d="M20 66C20 90 38 104 60 104C82 104 100 90 100 66Z" f="#7fa65a" />
        <In>
          <P d="M82 99C94 90 100 80 100 66H92C92 80 89 91 82 99Z" f="#5f8a40" />
          <L d="M25 80C40 88 80 88 95 80" c="#e9f0dc" w={2.6} />
        </In>
        <E x={60} y={66} rx={40} ry={7} f="#5f8a40" />
        <P d="M22 66C30 60 46 58 60 58C74 58 90 60 98 66C86 70 34 70 22 66Z" f="#ffffff" />
      </>
    ),
    plated: () => rice("translate(60 104) scale(2.3)"),
  },
  cereales: {
    product: () => (
      <>
        <L d="M56 110C58 90 60 60 61 22" c="#c99a3c" w={2.6} />
        <P d={leaf(58, 96, 30, 76, 5, 2)} f="#b6a35a" />
        <L d={WHEAT.map(([x, y, s]) => `M${x} ${y - 6}l${s * 6} -14`).join("")} c="#d9a640" w={1.4} />
        {WHEAT.map(([x, y, s], i) => (
          <G key={i} t={`rotate(${s * 22} ${x} ${y})`}>
            <E x={x} y={y} rx={5.5} ry={8} f="#e7b54d" />
            <In>
              <P d={`M${x + 1} ${y - 7}C${x + 6} ${y - 4} ${x + 6} ${y + 4} ${x + 1} ${y + 8}C${x + 3} ${y + 3} ${x + 3} ${y - 3} ${x + 1} ${y - 7}Z`} f="#c58f2c" />
            </In>
          </G>
        ))}
      </>
    ),
    // Dôme de semoule.
    plated: () => (
      <>
        <P d="M16 102C20 82 38 66 60 66C82 66 100 82 104 102C80 108 40 108 16 102Z" f="#f2d07a" />
        <In>
          <P d="M66 67C86 70 100 82 104 102C96 104 88 105 80 106C88 92 84 78 66 67Z" f="#dcb252" />
          <P d={dots([[36, 90], [48, 80], [58, 72], [70, 80], [52, 96], [64, 92], [82, 92], [42, 100], [30, 98]], 1.3)} f="#c99a3c" />
          <P d={dots([[40, 86], [54, 86], [62, 76], [46, 92]], 1.4)} f="#fbe6a8" />
        </In>
        <P d={leaf(64, 70, 80, 58, 4.5)} f={LEAF} />
      </>
    ),
  },
  pain: {
    product: () => (
      <G t="rotate(-24 60 64)">
        <E x={60} y={68} rx={46} ry={23} f="#b06f2e" />
        <E x={60} y={62} rx={46} ry={22} f="#d9944a" />
        <In>
          <E x={40} y={60} rx={9} ry={4} a={-50} f="#f0c27e" />
          <E x={60} y={58} rx={9} ry={4} a={-50} f="#f0c27e" />
          <E x={80} y={58} rx={9} ry={4} a={-50} f="#f0c27e" />
          <L d="M26 66C36 74 70 78 96 70" c="#e8ad62" w={2} />
        </In>
      </G>
    ),
    plated: () => (
      <>
        {(
          [
            [-14, -6],
            [12, 0],
          ] as Pt[]
        ).map(([dx, dy], i) => (
          <G key={i} t={`translate(${dx} ${dy})`}>
            <P d="M38 104V68C30 66 30 50 42 48C46 40 74 40 78 48C90 50 90 66 82 68V104Z" f="#c98642" />
            <P d="M42 100V65C36 62 36 54 44 52C48 46 72 46 76 52C84 54 84 62 78 65V100Z" f="#f6dfae" />
            <In>
              <P d={dots([[52, 70], [64, 62], [68, 80], [54, 88], [60, 76]], 1.3)} f="#e6c88c" />
            </In>
          </G>
        ))}
      </>
    ),
  },
  // Tas de flocons, deux épillets d'avoine retombants derrière.
  avoine: {
    product: () => (
      <>
        <L d="M50 70C46 50 40 36 30 24M70 70C74 50 80 36 90 24" c="#c9a55a" w={2.4} />
        {OAT.map(([x, y], i) => (
          <P key={i} d={leaf(x, y, x + (x < 60 ? -3 : 3), y + 17, 5.5)} f={i % 2 ? "#d4ae5c" : "#e6c378"} />
        ))}
        <P d={heap(60, 100, 44, 32, 12, 3)} f="#e9d29d" />
        <In>
          <P d="M68 70C86 74 100 86 104 100C96 103 88 104 80 104C86 92 82 80 68 70Z" f="#d4b878" />
          {(
            [
              [36, 92, -10],
              [52, 86, 15],
              [66, 92, -20],
              [80, 88, 10],
              [46, 98, 5],
              [60, 76, -5],
              [88, 97, 25],
            ] as const
          ).map(([x, y, a], i) => (
            <E key={i} x={x} y={y} rx={7} ry={4.5} a={a} f={i % 2 ? "#f6e6bf" : "#d9bd82"} />
          ))}
        </In>
      </>
    ),
  },
} satisfies Partial<Record<IllustrationKey, Food>>;
