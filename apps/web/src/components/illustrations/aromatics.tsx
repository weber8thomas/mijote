// Aromates : ail, échalote, gingembre, bouquet d'herbes (persil, ciboulette, coriandre).
import { Frame, Hi, Ink, LEAF, LEAF_DARK, LG, RG, W, blob, ell, leaf, url } from "./primitives";
import type { IllustrationProps } from "./primitives";

const n1 = (n: number) => String(Math.round(n * 10) / 10);

// ---------- Ail : tête en gousses bombées, stries violines, + une gousse ----------
const AIL_HEAD = [ell(60, 74, 14, 27), ell(43, 77, 13, 23, -0.28), ell(77, 77, 13, 23, 0.28), ell(31, 82, 9, 17, -0.55), ell(89, 82, 9, 17, 0.55)].join("");
export function Ail({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="ail-a" c={["#fdfaf2", "#f0e6d6", "#d7c6b2"]} cx={0.4} cy={0.38} />
      </defs>
      <W d="M54 52C55 40 56 30 58 18C60 16 62 16 63 18C64 30 66 40 66 52Z" f="#e3d6bd" o={0.9} />
      <W d={AIL_HEAD} f={url("ail-a")} o={0.93} />
      <W d="M74 56C86 64 94 78 90 92C86 99 78 102 70 102C82 94 86 76 74 56Z" f="#bba58c" o={0.42} />
      <Hi d="M50 58C46 66 44 76 46 86C48 76 50 68 54 60Z" o={0.7} />
      <Ink c="#a8789a" o={0.5} w={1}>
        <path d="M60 50C56 64 56 84 60 100M44 58C38 70 38 86 44 98M76 58C82 70 82 86 76 98M30 70C26 78 26 88 30 96M90 70C94 78 94 88 90 96" />
      </Ink>
      <Ink o={0.55}>
        <path d="M58 20C57 32 55 44 52 52M63 20C64 32 66 44 68 52" />
        <path d="M52 102C50 106 47 108 44 109M58 102C58 106 57 109 56 112M64 102C66 106 68 108 72 109" />
      </Ink>
      <W d="M86 106C90 96 98 92 106 94C110 96 112 100 110 104C104 108 94 109 86 106Z" f="#f4ebdc" o={0.92} />
      <W d="M88 106C96 104 104 102 110 104C104 108 94 109 88 106Z" f="#c9a7b8" o={0.6} />
      <Ink o={0.5}>
        <path d="M86 106C90 96 98 92 106 94C109 95 111 97 112 99" />
      </Ink>
    </Frame>
  );
}

// ---------- Échalote : deux bulbes en goutte, peau cuivrée rosée, col sec ----------
const ECHALOTE = "M60 22C58 32 50 42 46 54C40 70 40 86 50 96C54 100 58 101 60 101C62 101 66 100 70 96C80 86 80 70 74 54C70 42 62 32 60 22Z";
function Bulb({ back }: { back?: boolean }) {
  return (
    <>
      <W d="M58 26C58 18 59 12 61 6C63 12 62 18 62 26Z" f="#c79a72" o={0.85} />
      <W d={ECHALOTE} f={url("echalote-a")} o={back ? 0.85 : 0.92} />
      <W d="M46 70C46 84 52 96 60 100C68 96 74 84 74 70C66 76 54 76 46 70Z" f="#b0607a" o={0.35} soft />
      <W d="M68 44C78 58 82 78 74 92C70 98 64 101 60 101C72 92 76 72 68 44Z" f="#7a3a30" o={back ? 0.5 : 0.4} />
      {!back && <Hi d="M52 54C47 64 46 74 48 84C50 74 52 64 56 56Z" o={0.6} />}
      <Ink o={back ? 0.4 : 0.55}>
        <path d="M60 24C54 44 50 70 56 98M60 24C66 44 70 70 64 98" />
        <path d="M57 101C55 104 52 106 49 107M60 101C60 104 61 107 60 110M63 101C65 104 68 106 71 106" />
      </Ink>
    </>
  );
}
export function Echalote({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="echalote-a" c={["#e6ae90", "#c47458", "#94503f"]} x2={1} y2={0.3} />
      </defs>
      <g transform="translate(16 -4) rotate(16 60 100) scale(.9)">
        <Bulb back />
      </g>
      <g transform="translate(-12 4) rotate(-10 60 100)">
        <Bulb />
      </g>
    </Frame>
  );
}

// ---------- Gingembre : rhizome noueux + rondelle jaune ----------
const GINGER = [ell(52, 64, 32, 14, -0.12), ell(24, 56, 11, 9, -0.6), ell(46, 46, 9, 11, 0.25), ell(78, 48, 11, 9, 0.5), ell(84, 68, 10, 8, 0.2)].join("");
export function Gingembre({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="gingembre-a" c={["#ecd09c", "#d3a86c", "#a87d48"]} />
      </defs>
      <W d={GINGER} f={url("gingembre-a")} o={0.92} />
      <W d={ell(56, 71, 26, 6, -0.12) + ell(84, 72, 7, 4, 0.2)} f="#8e6538" o={0.35} soft />
      <W d={ell(17, 52, 4, 3.5, -0.6) + ell(48, 37, 3.5, 3.5) + ell(87, 44, 4, 3.5, 0.5)} f="#e0a890" o={0.6} soft />
      <Hi d="M30 56C44 52 60 52 74 54C60 56 44 58 30 60Z" o={0.5} />
      <Ink o={0.5} w={1.1}>
        <path d="M20 52C22 56 24 60 24 62M30 50C32 54 32 58 30 62M42 46C46 46 50 48 52 50M66 50C68 54 68 60 66 64M76 44C76 48 78 52 80 54M84 62C86 66 86 70 84 74M44 58C46 62 46 66 44 72" />
      </Ink>
      <Ink o={0.55}>
        <path d="M20 64C22 72 32 78 46 78C60 78 80 80 92 70" />
      </Ink>
      <W d={blob(84, 96, 17, 14, 1, 0.05)} f="#c49460" o={0.92} />
      <W d={blob(84, 96, 14.5, 11.8, 2, 0.05)} f="#f3dc84" o={0.95} />
      <Ink c="#d8b45a" o={0.6} w={1}>
        <path d="M74 92C78 96 90 96 94 92M76 100C80 98 88 98 92 100M84 86C84 92 84 100 84 106" />
      </Ink>
    </Frame>
  );
}

// ---------- Herbes : bouquet de persil plat noué d'une ficelle ----------
type Stem = [number, number, number];
const STEMS: Stem[] = [
  [26, 50, 0],
  [36, 32, 1],
  [52, 22, 2],
  [70, 20, 0],
  [86, 30, 1],
  [96, 48, 2],
  [42, 52, 2],
  [60, 40, 1],
  [78, 52, 0],
  [32, 68, 1],
  [88, 66, 2],
];
const sprigOf = ([x, y]: Stem) => {
  const a = Math.atan2(y - 88, x - 60);
  return [0, -0.72, 0.72]
    .map((d) => {
      const b = a + d;
      const L = d ? 12 : 15;
      return leaf(x, y, x + Math.cos(b) * L, y + Math.sin(b) * L, d ? 5.4 : 6.4, 0, true);
    })
    .join("");
};
const HERB_LEAVES = [0, 1, 2].map((c) => STEMS.filter((s) => s[2] === c).map(sprigOf).join(""));
const HERB_STEMS = STEMS.map(([x, y]) => `M60 110Q${n1(60 + (x - 60) * 0.12)} ${n1(84)} ${x} ${y}`).join("");
export function Herbes({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <Ink c="#8aa564" o={0.95} w={1.8}>
        <path d={HERB_STEMS} />
      </Ink>
      <W d={HERB_LEAVES[0]} f={LEAF} o={0.85} />
      <W d={HERB_LEAVES[1]} f={LEAF_DARK} o={0.85} />
      <W d={HERB_LEAVES[2]} f="#6f9a4c" o={0.85} />
      <Ink o={0.4} w={0.9}>
        <path d={STEMS.map(([x, y]) => `M${x} ${y}l${n1((x - 60) * 0.18)} ${n1((y - 88) * 0.18)}`).join("")} />
      </Ink>
      <Ink c="#b98a4e" o={0.95} w={2.6}>
        <path d="M54 92C58 94 62 94 66 92M54 96C58 98 62 98 66 96" />
      </Ink>
      <Ink c="#b98a4e" o={0.85} w={1.6}>
        <path d="M66 94C72 90 78 92 74 96C71 99 68 97 66 94C70 100 72 104 76 106M66 94C64 100 62 104 60 106" />
      </Ink>
    </Frame>
  );
}
