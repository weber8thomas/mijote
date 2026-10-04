// Légumes verts et feuilles : poireau, choux, brocoli, épinard, mâche, endive, fenouil, courgette, petits pois, herbes, brin.
import type { IllustrationKey } from "@mijote/shared";
import { C, discs, dots, E, f1, G, halfLeaf, In, L, leaf, LEAF, LEAF_DARK, LEAF_LIGHT, P, polar, root, STEM } from "./draw";
import type { Pt } from "./draw";
import type { Food } from "./food";

/** Chou (vert ou rouge) : collerette frisée, pomme, deux feuilles enveloppantes, nervures. */
const cabbage = (k: { frill: string; head: string; left: string; right: string; vein: string }) => (
  <>
    <P d={polar(60, 76, (t) => 45 + 3.5 * Math.sin(9 * t), 18, 0.66)} f={k.frill} />
    <C x={60} y={64} r={31} f={k.head} />
    <P d="M29 66C28 82 42 100 62 101C50 92 46 76 48 58C49 50 52 44 56 40C40 42 30 52 29 66Z" f={k.left} />
    <P d="M91 66C92 82 78 100 58 101C70 92 74 76 72 58C71 50 68 44 64 40C80 42 90 52 91 66Z" f={k.right} />
    <In>
      <L d="M60 100C52 88 44 78 34 72M60 100C70 88 76 78 86 72M60 100C58 84 60 66 60 46" c={k.vein} w={2.2} />
      <L d="M50 84L40 84M70 84L80 84M60 76L50 70M60 76L70 70" c={k.vein} w={1.6} />
    </In>
  </>
);

const CROWN = "M-12-14C-15-20-9-26-4-24C-2-29 6-29 7-24C12-26 16-19 12-14C10-11 6-10 4-12C2-9-2-9-4-12C-6-10-10-11-12-14Z";
const floret = () => (
  <>
    <P d="M-3.5 0C-3-4-3-8-4.5-12H4.5C3-8 3-4 3.5 0Z" f="#b2cd7c" />
    <P d={CROWN} f="#5f8f3e" />
    <In>
      <P d="M-12-14C-10-11-6-10-4-12C-2-9 2-9 4-12C6-10 10-11 12-14C8-13 4-15 0-14C-4-15-8-13-12-14Z" f="#4b7432" />
      <P d={dots([[-6, -19], [2, -23]], 3.5) + dots([[8, -19]], 2.8)} f="#86b257" />
    </In>
  </>
);

/** Fleurettes de chou-fleur : dôme ombré puis boules crème. */
const CF: [number, number, number][] = [
  [60, 46, 13],
  [44, 52, 12],
  [76, 52, 12],
  [34, 65, 11],
  [52, 62, 13],
  [69, 62, 13],
  [86, 65, 11],
  [44, 76, 11],
  [60, 75, 12],
  [76, 76, 11],
];

const pea = (x: number, y: number, r = 7.5) => (
  <>
    <C x={x} y={y} r={r} f="#7fb84a" />
    <In>
      <P d={`M${f1(x - r * 0.9)} ${f1(y + 2)}C${f1(x - r * 0.4)} ${f1(y + r)} ${f1(x + r * 0.7)} ${f1(y + r * 0.8)} ${f1(x + r)} ${y}C${f1(x + r * 0.6)} ${f1(y + r * 0.5)} ${f1(x - r * 0.3)} ${f1(y + r * 0.6)} ${f1(x - r * 0.9)} ${f1(y + 2)}Z`} f="#5f9a3f" />
      <C x={x - r * 0.35} y={y - r * 0.35} r={r * 0.3} f="#bde084" />
    </In>
  </>
);

const PEA_PILE: Pt[] = [
  [28, 97], [42, 98], [56, 99], [70, 98], [84, 97], [96, 95],
  [34, 86], [48, 87], [62, 88], [76, 87], [90, 85],
  [42, 75], [56, 76], [70, 76], [83, 74],
  [50, 64], [64, 65], [76, 64],
];

const HERB_TIPS: [number, number, number][] = [
  [30, 52, -50],
  [44, 36, -20],
  [62, 28, 0],
  [80, 36, 20],
  [92, 54, 50],
];

/** Petit bouquet de trois folioles (persil plat) au bout d'une tige, orienté selon `a` (degrés). */
const sprigTip = (x: number, y: number, a: number, f: string) => (
  <G t={`rotate(${a} ${x} ${y})`}>
    <P d={leaf(x, y, x - 13, y - 11, 5) + leaf(x, y, x, y - 18, 6) + leaf(x, y, x + 13, y - 11, 5)} f={f} />
  </G>
);

const SPRIG: [number, number, number, number][] = [
  [38, 86, 18, 74],
  [44, 78, 54, 96],
  [52, 66, 32, 54],
  [62, 56, 78, 70],
  [70, 46, 54, 30],
  [80, 38, 98, 46],
];

export const GREENS = {
  poireau: {
    product: () => (
      <G t="rotate(-32 60 60)">
        <L d="M56 103l-3 7M60 104v7M64 103l3 7" c="#cdb68d" w={1.8} />
        <P d="M53 50C49 36 43 24 34 11C46 17 55 30 61 44Z" f="#477a2d" />
        <P d="M62 50C68 36 80 27 101 23C91 33 78 43 69 54Z" f="#5a8d3c" />
        <P d="M54 48C53 32 56 18 62 3C68 18 69 34 67 48Z" f="#83b356" />
        <In>
          <L d="M61 10C60 24 60 36 60 48" c="#5a8d3c" w={1.3} />
        </In>
        <P d="M51 44H69V67H51Z" f="#c8de92" />
        <P d="M51 65V96C51 104 69 104 69 96V65Z" f="#ffffff" />
        <In>
          <P d="M62 44H69V96C69 101 65 103.5 62 103.5Z" f="#e6dfcb" />
          <P d="M51 61C55 68 65 68 69 61V69C65 74 55 74 51 69Z" f="#c8de92" />
        </In>
      </G>
    ),
  },
  chou: { product: () => cabbage({ frill: "#3f7a2e", head: "#6fa64a", left: "#8fc05a", right: "#7fb34f", vein: "#c6e092" }) },
  "chou-rouge": {
    product: () => (
      <>
        {cabbage({ frill: "#5a2f6b", head: "#7d4590", left: "#9a5cab", right: "#8a4f9c", vein: "#c9a0d4" })}
        <E x={84} y={93} rx={21} ry={13} f="#5a2f6b" />
        <E x={84} y={90} rx={20} ry={12} f="#f4e9f0" />
        <In>
          <L d="M68 88C72 84 76 92 80 86C84 80 88 92 92 86C95 82 98 88 100 89M70 94C76 90 80 97 86 92C90 89 94 96 98 93" c="#8a4f9c" w={1.8} />
        </In>
      </>
    ),
  },
  "chou-fleur": {
    product: () => (
      <>
        <P d={leaf(54, 100, 16, 60, 13, 2)} f={LEAF_DARK} />
        <P d={leaf(66, 100, 104, 60, 13, -2)} f={LEAF} />
        <P d={discs(CF.map(([x, y, r]) => [x + 2, y + 2, r]))} f="#e2d3ad" />
        <In>
          <P d={discs(CF.map(([x, y, r]) => [x, y, r * 0.9]))} f="#f8f1de" />
        </In>
        <P d={leaf(48, 104, 26, 80, 9, 1)} f={LEAF_LIGHT} />
        <P d={leaf(72, 104, 94, 80, 9, -1)} f={LEAF} />
        <In>
          <L d="M48 104L28 82M72 104L92 82" c="#c6e092" w={1.6} />
        </In>
      </>
    ),
  },
  brocoli: {
    product: () => <G t="translate(60 106) scale(2.75)">{floret()}</G>,
    plated: () => (
      <G t="translate(60 104) scale(2.3)">
        <G t="translate(11 0) scale(.8)">{floret()}</G>
        <G t="translate(-7 0)">{floret()}</G>
      </G>
    ),
  },
  epinard: {
    product: () => (
      <>
        <L d="M58 98L54 108M62 98L66 108M60 98V108" c="#8fbd5a" w={3} />
        {(
          [
            [56, 98, 22, 38, 14, 3, "#3f7a2e"],
            [64, 98, 98, 38, 14, -3, "#4a8434"],
            [60, 100, 60, 18, 16, 0, "#5f9a3f"],
          ] as const
        ).map(([bx, by, tx, ty, w, b, f], i) => (
          <g key={i}>
            <P d={leaf(bx, by, tx, ty, w, b)} f={f} />
            <In>
              <P d={halfLeaf(bx, by, tx, ty, w, b)} f="#2f6522" o={0.35} />
              <L d={`M${bx} ${by}L${(bx + tx * 5) / 6} ${(by + ty * 5) / 6}`} c="#a6cf74" w={1.8} />
            </In>
          </g>
        ))}
      </>
    ),
  },
  mache: {
    product: () => (
      <>
        {[0, 1].map((ring) =>
          (ring ? [15, 75, 135, 195, 255, 315] : [0, 45, 90, 135, 180, 225, 270, 315]).map((a) => {
            const r = ring ? 11 : 25;
            const t = (a * Math.PI) / 180;
            return <E key={`${ring}-${a}`} x={60 + Math.cos(t) * r} y={72 + Math.sin(t) * r * 0.78} rx={ring ? 13 : 17} ry={ring ? 8.5 : 11} a={a} f={ring ? "#86b85a" : "#4f8a35"} />;
          }),
        )}
        <In>
          <C x={60} y={72} r={6} f="#a6cf74" />
          <L
            d={[0, 45, 90, 135, 180, 225, 270, 315]
              .map((a) => {
                const t = (a * Math.PI) / 180;
                return `M${(60 + Math.cos(t) * 14).toFixed(1)} ${(72 + Math.sin(t) * 11).toFixed(1)}L${(60 + Math.cos(t) * 34).toFixed(1)} ${(72 + Math.sin(t) * 27).toFixed(1)}`;
              })
              .join("")}
            c="#79ad4c"
            w={1.4}
          />
        </In>
      </>
    ),
  },
  endive: {
    product: () => (
      <>
        {(
          [
            [42, 102, 58, 22, 15],
            [76, 104, 90, 34, 14],
          ] as const
        ).map(([ax, ay, bx, by, w], i) => {
          const mx = ax + (bx - ax) * 0.5;
          const my = ay + (by - ay) * 0.5;
          return (
            <g key={i}>
              <P d={root(ax, ay, bx, by, w)} f="#fbf5df" />
              <In>
                <P d={root(ax, ay, bx, by, w, true)} f="#e6dbb8" />
              </In>
              <P d={root(mx, my, bx, by, w * 0.68)} f="#d9e07a" />
              <In>
                <P d={root(mx, my, bx, by, w * 0.68, true)} f="#b9c454" />
                <L d={`M${ax - w * 0.5} ${ay - 8}C${mx - w * 0.6} ${my + 10} ${mx - w * 0.3} ${my} ${mx - 2} ${my - 6}`} c="#e6dbb8" w={1.6} />
              </In>
            </g>
          );
        })}
      </>
    ),
  },
  fenouil: {
    product: () => (
      <>
        <L d="M50 66L40 26M60 64L60 18M70 66L82 28" c="#a9c66f" w={7} />
        <In>
          <L d="M40 26C34 20 30 16 24 16M40 26C38 18 38 12 34 6M60 18C56 12 54 8 50 4M60 18C64 12 68 8 72 6M82 28C86 20 90 16 96 14M82 28C88 26 94 26 100 28" c={LEAF} w={2} />
          <L d="M30 18l-4-4M28 18l-3 3M38 12l-4-2M54 8l-4-2M66 10l4-4M90 16l2-5M94 26l4-4" c={LEAF_LIGHT} w={1.6} />
        </In>
        <P d="M28 87C28 70 42 60 60 60C78 60 92 70 92 87C92 99 79 105 60 105C41 105 28 99 28 87Z" f="#f1f5dc" />
        <In>
          <P d="M70 61C84 64 92 74 92 87C92 99 80 105 64 105C78 98 84 88 82 76C81 70 77 65 70 61Z" f="#d3e0b2" />
          <L d="M44 64C38 74 38 90 44 102M60 61C54 72 54 92 60 104M76 64C82 74 82 90 76 102" c="#c9d9a0" w={2} />
          <P d="M44 60C48 56 56 56 60 60C56 62 48 62 44 60ZM62 60C66 56 74 56 78 60C74 62 66 62 62 60Z" f="#b9d17f" />
        </In>
      </>
    ),
  },
  courgette: {
    product: () => (
      <>
        <L d="M93 32L102 23" c="#7a6a3a" w={6} />
        <L d="M26 88L92 34" c="#3f7a2e" w={25} />
        <In>
          <L d="M30 93L96 39" c="#2f6522" w={12} />
          <L d="M34 74L50 61M58 64L74 51M44 84L58 72M70 60L84 48" c="#7fae52" w={2.2} />
        </In>
        <E x={80} y={92} rx={17} ry={11} f="#3f7a2e" />
        <E x={80} y={90} rx={15} ry={9.5} f="#eef3c9" />
        <In>
          <P d={dots([[74, 88], [80, 86], [86, 88], [80, 92], [74, 92], [86, 92]], 1.2)} f="#c5d48a" />
        </In>
      </>
    ),
    plated: () => (
      <>
        {(
          [
            [42, 74],
            [76, 76],
            [34, 89],
            [66, 91],
          ] as Pt[]
        ).map(([x, y], i) => (
          <g key={i}>
            <E x={x} y={y + 4.5} rx={17} ry={10.5} f="#2f6522" />
            <E x={x} y={y} rx={17} ry={10.5} f="#4f8a35" />
            <E x={x} y={y} rx={14.5} ry={8.5} f="#eef3c9" />
            <In>
              <P d={dots([[x - 5, y], [x, y - 3], [x + 5, y], [x, y + 3]], 1.3)} f="#c5d48a" />
            </In>
          </g>
        ))}
      </>
    ),
  },
  "petits-pois": {
    product: () => (
      <>
        <L d="M14 60C10 52 12 44 18 40" c="#6fa148" w={2.2} />
        <P d="M12 62C34 48 86 48 110 66C88 60 34 60 12 62Z" f="#4f8a35" />
        {[28, 44, 60, 76, 92].map((x, i) => (
          <g key={x}>{pea(x, 66 + (i === 0 || i === 4 ? 0 : i === 2 ? 4 : 3), 8.5)}</g>
        ))}
        <P d="M10 62C24 90 92 98 112 66C100 82 70 88 58 88C40 88 22 80 10 62Z" f="#8cc04e" />
        <In>
          <L d="M18 70C34 84 82 88 104 72" c="#b4d97e" w={2} />
        </In>
        {pea(44, 98, 6.5)}
        {pea(60, 100, 6.5)}
      </>
    ),
    plated: () => (
      <>
        {[...PEA_PILE].reverse().map(([x, y], i) => (
          <g key={i}>{pea(x, y, 7.5)}</g>
        ))}
      </>
    ),
  },
  herbes: {
    product: () => (
      <>
        <L d={HERB_TIPS.map(([x, y]) => `M60 104L${x} ${y}`).join("")} c="#6f9a42" w={2.6} />
        {HERB_TIPS.map(([x, y, a], i) => (
          <g key={i}>{sprigTip(x, y, a, i % 2 ? LEAF : LEAF_DARK)}</g>
        ))}
        {sprigTip(46, 62, -35, LEAF_LIGHT)}
        {sprigTip(74, 60, 35, LEAF_LIGHT)}
        <P d="M51 84H69L67 93H53Z" f="#d79a2b" />
        <In>
          <P d="M53 88H67V89.5H53Z" f="#b37a17" />
        </In>
      </>
    ),
  },
} satisfies Partial<Record<IllustrationKey, Food>>;

/** Brin de feuillage : repli d'une clé inconnue. */
export const SPRIG_FOOD: Food = {
  product: () => (
    <>
      <L d="M24 104C40 84 60 60 78 40C84 34 90 28 96 20" c={STEM} w={2.6} />
      {SPRIG.map(([bx, by, tx, ty], i) => (
        <g key={i}>
          <P d={leaf(bx, by, tx, ty, 7, i % 2 ? -1.5 : 1.5)} f={[LEAF, LEAF_DARK, LEAF_LIGHT][i % 3] ?? LEAF} />
        </g>
      ))}
      <P d={leaf(90, 28, 102, 10, 6)} f={LEAF} />
    </>
  ),
};
