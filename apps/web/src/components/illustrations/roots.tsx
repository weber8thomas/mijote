// Racines et tubercules : carotte, panais, patate douce, betterave, navet, céleri-rave, pomme de terre, gingembre.
import type { IllustrationKey } from "@mijote/shared";
import { along, C, dots, E, G, In, L, leaf, LEAF, LEAF_DARK, LEAF_LIGHT, P, polar, rings, root } from "./draw";
import type { ReactNode } from "react";
import type { Pt } from "./draw";
import type { Food } from "./food";

/** Rondelles (carotte, courgette, betterave) : tranche, chair, cœur. */
const rounds = (pts: Pt[], side: string, face: string, core: string, rx = 17, ry = 10.5, extra?: (x: number, y: number) => ReactNode) => (
  <>
    {pts.map(([x, y], i) => (
      <g key={i}>
        <E x={x} y={y + 4.5} rx={rx} ry={ry} f={side} />
        <E x={x} y={y} rx={rx} ry={ry} f={face} />
        <In>
          <E x={x} y={y} rx={rx * 0.45} ry={ry * 0.45} f={core} />
          {extra?.(x, y)}
        </In>
      </g>
    ))}
  </>
);

const POTATO = { base: "#ecc77d", shade: "#cc9d55", cut: "#fdeeb8", eye: "#b0844a" };
const potatoes = (t: string) => (
  <G t={t}>
    <P d="M-20-6C-20-13-12-16-5-15C2-14 6-10 5-4C4 1-3 3-10 2C-17 1-20-1-20-6Z" f={POTATO.base} />
    <In>
      <P d="M-19-3C-16 1-8 3-2 1C2 0 5-2 5-4C2 1-12 1-19-3Z" f={POTATO.shade} />
      <P d={dots([[-13, -9], [-6, -11], [-9, -4]], 0.8)} f={POTATO.eye} />
    </In>
    <P d="M2-3C3-10 10-13 16-12C22-11 24-6 22-1C20 3 14 4 8 3C4 2 2 0 2-3Z" f={POTATO.base} />
    <In>
      <P d="M3-1C6 3 15 4 20 1C21 0 22-1 22-1C19 2 9 3 3-1Z" f={POTATO.shade} />
      <P d="M5.5-4C6.5-8.5 11-10.5 16-9.5C19.5-8.5 20.5-6 19-3C17-0.5 12 .5 8.5-.5C6.5-1 5.5-2.5 5.5-4Z" f={POTATO.cut} />
    </In>
  </G>
);

/** Céleri-rave : boule entière bosselée, et le bord de peau de la moitié coupée posée devant. */
const CELERIAC = polar(46, 70, (t) => 28 + 2.6 * Math.sin(5 * t + 0.5), 15, 0.96);
const CELERIAC_HALF = polar(82, 86, (t) => 22 + 1.6 * Math.sin(6 * t), 12, 0.8);

export const ROOTS = {
  carotte: {
    product: () => (
      <>
        <L d="M80 36C82 28 84 22 86 14M82 37C88 30 96 24 104 22" c={LEAF_DARK} w={2.2} />
        <P d={leaf(84, 26, 76, 6, 5, 1)} f={LEAF_DARK} />
        <P d={leaf(88, 26, 102, 8, 5.5, -1)} f={LEAF} />
        <P d={leaf(90, 30, 110, 26, 5, -1)} f={LEAF_LIGHT} />
        <P d={root(78, 40, 24, 104, 14)} f="#ee8436" />
        <In>
          <P d={root(78, 40, 24, 104, 14, true)} f="#c35c1c" />
          <L d={rings(78, 40, 24, 104, 14, [0.22, 0.42, 0.62])} c="#c35c1c" w={2} />
          <L d={`M${along(78, 40, 24, 104, 0.08, 7).join(" ")}L${along(78, 40, 24, 104, 0.4, 8).join(" ")}`} c="#ffb06a" w={3} />
        </In>
      </>
    ),
    plated: () => rounds([[42, 74], [76, 76], [34, 89], [66, 91]], "#c35c1c", "#ee8436", "#ffb06a"),
  },
  panais: {
    product: () => (
      <>
        <L d="M38 34L30 16M42 32L46 12M36 38L20 30" c="#86ad55" w={4.5} />
        <P d={root(42, 40, 96, 106, 17)} f="#efe1bb" />
        <In>
          <P d={root(42, 40, 96, 106, 17, true)} f="#d4bf8b" />
          <E x={41} y={38} rx={13} ry={7} a={-50} f="#d9c48f" />
          <L d={rings(42, 40, 96, 106, 17, [0.25, 0.45, 0.65])} c="#c4ac72" w={2} />
          <L d={`M${along(42, 40, 96, 106, 0.1, -9).join(" ")}L${along(42, 40, 96, 106, 0.45, -9).join(" ")}`} c="#fbf3dc" w={3} />
        </In>
      </>
    ),
    plated: () => rounds([[42, 74], [76, 76], [34, 89], [66, 91]], "#cdb781", "#f3e7c6", "#e2cf9d"),
  },
  "patate-douce": {
    product: () => (
      <G t="translate(-6 -22) scale(1.1)">
        <L d="M16 77L6 72M103 79L113 82" c="#8f3f35" w={2.5} />
        <P d="M14 78C16 62 44 52 72 56C94 59 106 68 104 80C102 92 86 98 62 98C36 98 12 92 14 78Z" f="#b4584a" />
        <In>
          <P d="M16 84C24 94 46 98 64 98C86 98 100 92 104 82C94 90 76 92 58 91C38 90 24 88 16 84Z" f="#8f3f35" />
          <P d="M30 67C40 60 56 57 70 58C58 61 44 64 32 71Z" f="#d17e6a" />
        </In>
        <E x={84} y={94} rx={17} ry={11} f="#8f3f35" />
        <E x={84} y={92} rx={15} ry={9.5} f="#f39a4f" />
        <In>
          <E x={84} y={92} rx={8} ry={4.8} f="#f8b878" />
        </In>
      </G>
    ),
    // Quartiers rôtis : chair orange, peau rouge.
    plated: () => (
      <>
        {(
          [
            [30, 92, 58, 72],
            [52, 98, 84, 78],
            [70, 100, 100, 86],
          ] as const
        ).map(([bx, by, tx, ty], i) => (
          <g key={i}>
            <P d={leaf(bx, by + 4, tx, ty + 4, 9)} f="#9c4638" />
            <P d={leaf(bx, by, tx, ty, 9)} f="#f39a4f" />
            <In>
              <P d={leaf(bx + 4, by - 2, tx - 4, ty + 1, 3)} f="#f8b878" />
            </In>
          </g>
        ))}
      </>
    ),
  },
  betterave: {
    product: () => (
      <>
        <L d="M57 54C53 42 46 32 38 24M63 54C67 42 74 32 82 22" c="#a8325a" w={3} />
        <P d={leaf(44, 34, 22, 8, 10, 1)} f={LEAF_DARK} />
        <P d={leaf(76, 32, 100, 8, 10, -1)} f={LEAF} />
        <In>
          <L d="M44 34L24 10M76 32L98 10" c="#a8325a" w={1.6} />
        </In>
        <L d="M60 100C60 106 64 110 70 111" c="#6a1d3c" w={2.5} />
        <C x={60} y={76} r={26} f="#8c2950" />
        <In>
          <P d="M70 52C82 58 88 70 86 82C84 94 74 102 62 102C76 94 80 76 70 52Z" f="#6a1d3c" />
          <P d="M42 66C44 60 48 56 54 54C50 60 47 66 46 74C44 72 42 69 42 66Z" f="#b44d72" />
        </In>
      </>
    ),
    plated: () => rounds([[42, 74], [76, 76], [34, 89], [66, 91]], "#6a1d3c", "#9a2f58", "#c04f7a", 17, 10.5, (x, y) => <L d={`M${x - 11} ${y}C${x - 9} ${y - 6} ${x + 9} ${y - 6} ${x + 11} ${y}`} c="#c04f7a" w={1.4} />),
  },
  navet: {
    product: () => (
      <>
        <P d={leaf(56, 44, 38, 10, 8, 1)} f={LEAF_DARK} />
        <P d={leaf(64, 44, 84, 10, 8, -1)} f={LEAF} />
        <P d={leaf(60, 44, 60, 6, 7)} f={LEAF_LIGHT} />
        <P d="M60 42C80 42 92 54 92 69C92 85 77 96 65 100L60 110L55 100C43 96 28 85 28 69C28 54 40 42 60 42Z" f="#fbf6ee" />
        <P d="M28 69C28 54 40 42 60 42C80 42 92 54 92 69C86 62 74 64 66 61C58 64 50 60 42 62C36 63 31 65 28 69Z" f="#b2589a" />
        <In>
          <P d="M78 46C88 52 93 62 92 72C90 86 78 96 66 100C80 90 86 76 84 62C83 56 81 50 78 46Z" f="#e6dccb" />
          <P d="M78 46C86 50 91 57 92 66C88 62 84 61 80 61C81 56 80 50 78 46Z" f="#8e3f7c" />
          <P d="M38 54C42 48 48 45 54 44C48 50 44 56 42 62C40 60 38 57 38 54Z" f="#cc80b8" />
        </In>
      </>
    ),
  },
  // Céleri-rave : boule bosselée à radicelles, une moitié coupée (chair crème) devant, tiges courtes au sommet.
  // Dans l'assiette : purée ivoire en volute (plus blanche que la pomme de terre), feuilles de céleri.
  celeri: {
    product: () => (
      <>
        <L d="M40 46L32 26M47 44L46 18M54 46L62 26" c="#8fb85a" w={5} />
        <P d={`${leaf(32, 26, 22, 14, 5, 1)}${leaf(46, 18, 40, 6, 4.5, 1)}${leaf(46, 18, 54, 6, 4.5)}${leaf(62, 26, 72, 16, 5, -1)}`} f={LEAF} />
        <L d="M30 92C26 98 22 100 16 100M38 97C36 102 33 106 29 108M48 99C49 104 48 107 51 110M24 82C19 84 16 88 12 88" c="#937649" w={1.8} />
        <P d={CELERIAC} f="#cdb586" />
        <In>
          <P d="M62 50C72 58 76 72 70 84C64 94 52 99 42 98C58 92 68 80 66 66C65 60 64 54 62 50Z" f="#ad945f" />
          <E x={46} y={46} rx={12} ry={5} f="#b7b77a" />
          <L d="M28 64C31 62 33 62 35 64M34 80C37 78 39 78 41 80M50 58C53 56 55 56 57 58M46 88C49 86 51 86 53 88" c="#a88e5a" w={1.8} />
          <P d="M30 70C30 60 36 54 42 52C38 58 35 64 35 74Z" f="#e2d1a6" />
        </In>
        <L d="M72 104C70 108 68 109 64 110M86 105C87 109 90 110 94 110" c="#937649" w={1.8} />
        <P d={CELERIAC_HALF} f="#b79c68" />
        <E x={82} y={85} rx={19} ry={14.5} f="#fbf5e1" />
        <In>
          <E x={82} y={86} rx={11} ry={8} f="#efe5c6" />
        </In>
      </>
    ),
    plated: () => (
      <>
        <P d="M22 103C20 84 38 68 60 68C82 68 100 84 98 103C84 107 36 107 22 103Z" f="#d9cfb6" />
        <P d="M24 100C22 84 40 70 60 70C80 70 98 84 96 100C82 104 38 104 24 100Z" f="#fbf8ef" />
        <In>
          <P d="M66 71C84 74 98 86 96 100C90 102 82 103 74 103C84 94 82 80 66 71Z" f="#e4dcc6" />
          <L d="M36 94C40 82 56 76 70 80C82 84 80 96 66 96C56 96 54 88 60 84" c="#e4dcc6" w={2.6} />
        </In>
        <P d={`${leaf(58, 74, 44, 62, 5.5, 1)}${leaf(58, 74, 58, 58, 5)}${leaf(58, 74, 72, 62, 5.5, -1)}`} f={LEAF} />
        <In>
          <P d={dots([[40, 96], [78, 92], [52, 88], [86, 98]], 1.4)} f={LEAF_DARK} />
        </In>
      </>
    ),
  },
  "pomme-de-terre": { product: () => potatoes("translate(58 84) scale(2.5)"), plated: () => potatoes("translate(58 103) scale(2.2)") },
  // Rhizome en « main » : phalanges en traits épais à bouts ronds, cernes, bouts coupés jaunes.
  gingembre: {
    product: () => (
      <>
        <L d="M24 82C40 78 64 80 92 76M46 80L36 52M66 79L72 48M86 77L104 60" c="#c99c5c" w={22} />
        <L d="M24 78C40 74 64 76 92 72M46 76L36 50M66 75L72 46M86 73L104 58" c="#e2bd7f" w={18} />
        <In>
          <L d="M30 72L32 82M56 70L57 82M78 68L80 79M38 62L46 60M70 60L78 62M94 66L98 72" c="#c09254" w={2} />
          <L d="M30 74C44 70 60 70 74 70" c="#f1d6a2" w={3} />
        </In>
        <C x={36} y={42} r={7.5} f="#f3d36b" />
        <C x={73} y={38} r={7.5} f="#f3d36b" />
        <In>
          <C x={36} y={42} r={3.5} f="#e6b93f" />
          <C x={73} y={38} r={3.5} f="#e6b93f" />
        </In>
      </>
    ),
  },
} satisfies Partial<Record<IllustrationKey, Food>>;
