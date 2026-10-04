// Courges : butternut, potiron, potimarron (entiers sur la pastille ; dés, quartier, purée dans l'assiette).
import type { IllustrationKey } from "@mijote/shared";
import { cube, E, G, In, L, LEAF, P, STEM } from "./draw";
import type { Food } from "./food";

const cubes = (pts: [number, number][], s: number, top: string, left: string, right: string) => (
  <>
    {pts.map(([x, y], i) => {
      const c = cube(x, y, s, s * 0.9);
      return (
        <g key={i}>
          <P d={c.left} f={left} />
          <P d={c.right} f={right} />
          <P d={c.top} f={top} />
        </g>
      );
    })}
  </>
);

export const SQUASH = {
  courge: {
    product: () => (
      <G t="rotate(-10 60 64)">
        <P d="M55 24C55 17 56 13 58 9C60 7 64 8 64 10C62 14 62 18 63 24Z" f={STEM} />
        <P d="M55 22C51 25 50 34 50 46C50 57 44 63 39 72C32 87 40 106 60 106C80 106 88 87 81 72C76 63 70 57 70 46C70 34 69 25 65 22C62 20 58 20 55 22Z" f="#f4c57c" />
        <In>
          <P d="M42 82C45 73 55 70 64 71C76 73 82 84 78 93C72 102 50 102 45 95C42 91 41 86 42 82Z" f="#eea251" />
          <P d="M66 26C69 38 68 52 74 61C82 72 88 88 78 100C72 106 64 106 58 105C72 100 80 88 74 76C68 66 64 54 64 40C64 34 65 30 66 28Z" f="#d99a4c" />
          <P d="M56 30C54 40 54 52 50 61C48 66 46 71 45 77C48 70 52 66 55 61C57 52 58 41 58 30Z" f="#fde3b4" />
        </In>
        <L d="M63 12C70 6 78 10 75 15C73 18 69 16 70 13" c={LEAF} w={1.8} />
      </G>
    ),
    // Dés rôtis.
    plated: () => cubes([[48, 76], [72, 76], [36, 86], [60, 86], [84, 86]], 12, "#f9bb68", "#ee9a3f", "#d17a26"),
  },
  potiron: {
    product: () => (
      <>
        <E x={31} y={77} rx={19} ry={25} f="#de7428" />
        <E x={89} y={77} rx={19} ry={25} f="#c9621d" />
        <E x={45} y={75} rx={20} ry={28} f="#ee8a35" />
        <E x={75} y={75} rx={20} ry={28} f="#e27a2b" />
        <E x={60} y={74} rx={16} ry={29} f="#f59c46" />
        <In>
          <P d="M40 54C35 62 34 72 36 82C38 72 40 63 45 55Z" f="#fbbd78" />
          <P d="M57 48C54 58 54 70 56 82C58 70 59 59 62 48Z" f="#fbbd78" />
          <P d="M80 96C88 90 92 82 92 72C96 82 96 92 90 98C86 101 82 100 80 96Z" f="#ad5216" />
        </In>
        <P d="M55 48C55 40 53 33 49 29C54 25 63 25 67 28C64 34 64 41 65 48C62 50 58 50 55 48Z" f="#6f6a37" />
        <In>
          <P d="M49 29C54 25 63 25 67 28C62 31 54 31 49 29Z" f="#a9a26a" />
        </In>
        <L d="M66 34C73 26 83 28 82 35C81 40 75 39 76 35" c={LEAF} w={1.8} />
      </>
    ),
    // Dés rôtis, plus orangés que la butternut, avec un liseré de peau.
    plated: () => cubes([[60, 66], [48, 76], [72, 76], [36, 86], [60, 86], [84, 86]], 12, "#f7a04a", "#e4802c", "#b85a1c"),
  },
  potimarron: {
    product: () => (
      <>
        <P d="M60 34C71 34 79 42 87 51C97 63 101 77 95 89C89 100 75 105 60 105C45 105 31 100 25 89C19 77 23 63 33 51C41 42 49 34 60 34Z" f="#e3602c" />
        <In>
          <P d="M68 38C80 48 92 60 95 76C97 92 82 103 66 104C80 96 86 84 84 70C82 56 76 46 68 38Z" f="#bb4519" />
          <P d="M38 56C33 64 31 74 33 84C36 74 39 66 45 58Z" f="#f28e5c" />
          <L d="M53 40C42 56 40 82 47 102M67 40C77 56 79 82 73 102" c="#c9501f" w={2} />
        </In>
        <P d="M56 38C55 30 53 25 48 21C53 16 63 16 67 20C64 26 64 31 64 38C62 40 58 40 56 38Z" f="#5c6233" />
        <In>
          <P d="M48 21C53 16 63 16 67 20C61 23 53 23 48 21Z" f="#9aa266" />
        </In>
      </>
    ),
    // Purée en dôme, sillons de cuillère.
    plated: () => (
      <>
        <P d="M16 103C16 86 30 75 46 72C48 62 62 58 70 66C88 68 104 84 104 103C80 108 40 108 16 103Z" f="#f08e3e" />
        <In>
          <P d="M70 66C88 68 104 84 104 103C96 106 86 107 76 107C92 98 92 80 70 66Z" f="#d5702a" />
          <L d="M30 92C40 84 56 82 68 86M40 80C48 76 58 76 64 78M58 66C62 63 66 64 68 67" c="#f8b06a" w={3} />
        </In>
      </>
    ),
  },
} satisfies Partial<Record<IllustrationKey, Food>>;
