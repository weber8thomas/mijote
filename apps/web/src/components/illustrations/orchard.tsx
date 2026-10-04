// Verger, suite : quetsches, fruits rouges, banane, orange.
import { BARK, Frame, Hi, Ink, LEAF, LEAF_DARK, LG, RG, W, blob, ell, leaf, rng, url, veins } from "./primitives";
import type { IllustrationProps } from "./primitives";

const n1 = (n: number) => String(Math.round(n * 10) / 10);

// ---------- Quetsche : prunes violettes ovales à pruine, + une moitié dénoyautée ----------
export function Quetsche({ className }: IllustrationProps) {
  const plum1 = blob(40, 68, 17, 23, 1, 0.03, -0.3);
  const plum2 = blob(68, 50, 16, 22, 2, 0.03, 0.3);
  return (
    <Frame className={className}>
      <defs>
        <RG id="quetsche-a" c={["#8e6aa6", "#5a3d78", "#3a2552"]} cx={0.38} cy={0.35} />
      </defs>
      <W d={leaf(66, 28, 96, 14, 8, -2)} f={LEAF} o={0.82} />
      <Ink o={0.5} w={1}>
        <path d={veins(66, 28, 96, 14, 3, 8)} />
      </Ink>
      <W d={plum2} f={url("quetsche-a")} o={0.88} />
      <W d={plum1} f={url("quetsche-a")} o={0.92} />
      <W d={blob(36, 62, 10, 13, 3, 0.05, -0.3) + blob(64, 44, 9, 12, 4, 0.05, 0.3)} f="#b9a8d0" o={0.4} soft />
      <Hi d={blob(32, 58, 3, 6, 1, 0.05, -0.3) + blob(61, 40, 3, 6, 2, 0.05, 0.3)} o={0.6} />
      <Ink c={BARK} o={0.9} w={2.2}>
        <path d="M66 29C66 22 68 18 72 14M44 46C43 40 42 36 40 32" />
      </Ink>
      <Ink o={0.4}>
        <path d="M44 46C48 60 48 76 42 90M66 29C60 40 60 56 66 71" />
      </Ink>
      <W d={blob(86, 88, 17, 21, 3, 0.03, 0.2)} f="#4a2f66" o={0.92} />
      <W d={blob(86, 88, 14.5, 18.5, 4, 0.03, 0.2)} f="#eab24a" o={0.95} />
      <W d={blob(86, 88, 9, 12, 5, 0.04, 0.2)} f="#f4cc6a" o={0.6} soft />
      <W d={ell(86, 88, 5, 8, 0.2)} f="#a8682e" o={0.88} />
      <Hi d={ell(84.5, 85, 1.5, 3, 0.2)} o={0.6} />
    </Frame>
  );
}

// ---------- Fruits rouges : framboises, myrtilles, grappe de groseilles ----------
const CURRANTS: [number, number][] = [
  [70, 28],
  [80, 34],
  [74, 42],
  [88, 42],
  [84, 52],
  [96, 52],
  [92, 62],
];
const RASPS: [number, number, number, number][] = [
  [36, 74, 15, 17],
  [58, 88, 13, 15],
];
const DRUPES = (() => {
  const r = rng(5);
  return RASPS.map(([cx, cy, rx, ry]) => {
    let d = "";
    for (let y = -ry + 5; y < ry - 3; y += 5)
      for (let x = -rx + 4 + (Math.abs(y) % 2) * 2.5; x < rx - 3; x += 5) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 0.75) continue;
        d += `M${n1(cx + x + r())} ${n1(cy + y + r())}h.1`;
      }
    return d;
  }).join("");
})();
const BLUES: [number, number][] = [
  [82, 92],
  [99, 86],
  [94, 104],
];
const crown = ([x, y]: [number, number]) =>
  [0, 1, 2, 3, 4].map((i) => `M${x - 2} ${y - 3}l${n1(Math.cos(i * 1.26) * 2.6)} ${n1(Math.sin(i * 1.26) * 2.6)}`).join("");
export function FruitsRouges({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="fruits-rouges-a" c={["#ec7088", "#cc3a56", "#962038"]} cx={0.4} cy={0.35} />
        <RG id="fruits-rouges-b" c={["#8696c4", "#4c5a8c", "#2e3868"]} cx={0.38} cy={0.35} />
      </defs>
      <W d={leaf(44, 50, 20, 22, 9, 2)} f={LEAF} o={0.8} />
      <Ink o={0.45} w={1}>
        <path d={veins(44, 50, 20, 22, 3, 9)} />
      </Ink>
      <Ink c="#7f8a52" o={0.9} w={1.3}>
        <path d={`M62 14C74 22 88 36 98 60${CURRANTS.map(([x, y]) => `M${x} ${y - 5}L${n1(x - 3)} ${y - 9}`).join("")}`} />
      </Ink>
      <W d={CURRANTS.map(([x, y]) => ell(x, y, 5.6, 5.4)).join("")} f="#d8362e" o={0.82} />
      <Hi d={CURRANTS.map(([x, y]) => ell(x - 1.6, y - 1.8, 1.6, 1.2)).join("")} o={0.85} />
      <W d={RASPS.map(([cx, cy, rx, ry], i) => blob(cx, cy, rx, ry, i, 0.04)).join("")} f={url("fruits-rouges-a")} o={0.92} />
      <Ink c="#f3a0b0" o={0.75} w={2.6}>
        <path d={DRUPES} />
      </Ink>
      <W d={BLUES.map(([x, y], i) => blob(x, y, 9, 8.6, i, 0.03)).join("")} f={url("fruits-rouges-b")} o={0.93} />
      <W d={BLUES.map(([x, y]) => ell(x - 2, y - 2, 5, 4)).join("")} f="#c2cae0" o={0.35} soft />
      <Ink c="#1f2546" o={0.7} w={1}>
        <path d={BLUES.map(crown).join("")} />
      </Ink>
    </Frame>
  );
}

// ---------- Banane : deux doigts courbes, jaune, pointe brune ----------
const BANANA = "M14 40C20 70 48 92 80 86C90 84 96 78 100 68L102 62C96 68 88 72 78 72C54 72 32 60 20 38C18 36 15 37 14 40Z";
export function Banane({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="banane-a" c={["#f8e08a", "#efc84a", "#cf9e2a"]} />
      </defs>
      <g transform="translate(6 -12) rotate(-8 100 62)">
        <W d={BANANA} f="#e6c25a" o={0.85} />
        <W d="M16 44C30 66 54 78 82 76C90 74 96 72 100 66C94 78 86 82 78 82C52 84 30 70 16 44Z" f="#b8902a" o={0.35} />
        <Ink o={0.4}>
          <path d="M14 40C20 70 48 92 80 86C90 84 96 78 100 68" />
        </Ink>
      </g>
      <W d={BANANA} f={url("banane-a")} o={0.92} />
      <W d="M18 46C30 70 52 84 80 82C90 80 96 76 100 68C96 80 88 86 78 87C50 90 26 72 18 46Z" f="#b98a22" o={0.42} />
      <Hi d="M26 46C36 60 52 68 70 70C52 66 38 58 28 44Z" o={0.6} />
      <W d="M100 68L102 62L110 44C112 42 115 43 114 46L108 66C106 70 102 71 100 68Z" f="#9a9a52" o={0.9} />
      <W d="M14 40C15 37 18 36 20 38C19 41 16 43 14 40Z" f="#4e3a26" o={0.9} />
      <W d="M110 44C112 41 116 42 115 46Z" f="#5e4a30" o={0.8} />
      <Ink o={0.55}>
        <path d="M14 40C20 70 48 92 80 86C90 84 96 78 100 68M22 46C34 64 54 78 80 80" />
      </Ink>
      <Ink o={0.35} w={1.6}>
        <path d="M44 74h.1M60 80h.1M72 78h.1M36 62h.1" />
      </Ink>
    </Frame>
  );
}

// ---------- Orange : fruit entier à peau grenue + demi-orange en quartiers ----------
const ORANGE_DOTS = (() => {
  const r = rng(13);
  let d = "";
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const m = Math.sqrt(r()) * 26;
    d += `M${n1(46 + Math.cos(a) * m)} ${n1(54 + Math.sin(a) * m)}h.1`;
  }
  return d;
})();
const ORANGE_SEGS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + 0.15;
  return `M84 88L${n1(84 + Math.cos(a) * 17)} ${n1(88 + Math.sin(a) * 16)}`;
}).join("");
export function Orange({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="orange-a" c={["#f9b45a", "#ec8a2a", "#c8641a"]} cx={0.38} cy={0.35} />
      </defs>
      <W d={blob(46, 54, 33, 32, 3, 0.025)} f={url("orange-a")} o={0.92} />
      <W d="M68 30C80 42 82 62 74 76C68 84 58 88 48 87C66 80 76 62 68 30Z" f="#b0521a" o={0.42} />
      <Hi d="M24 42C28 34 36 29 44 28C36 32 30 38 27 46Z" o={0.65} />
      <Ink o={0.3} w={1.6}>
        <path d={ORANGE_DOTS} />
      </Ink>
      <W d={leaf(46, 23, 70, 10, 7, -2)} f={LEAF_DARK} o={0.85} />
      <Ink c={BARK} o={0.9} w={2}>
        <path d="M46 24C46 20 45 18 43 16" />
      </Ink>
      <W d={blob(84, 88, 24, 23, 1, 0.02)} f="#e07a22" o={0.94} />
      <W d={blob(84, 88, 21.5, 20.5, 2, 0.02)} f="#fbf0d8" o={0.96} />
      <W d={blob(84, 88, 19.5, 18.5, 3, 0.02)} f="#f29a36" o={0.92} />
      <Ink c="#fdf3dc" o={0.95} w={1.3}>
        <path d={ORANGE_SEGS} />
      </Ink>
      <W d={ell(84, 88, 3, 3)} f="#fdf3dc" o={0.95} />
      <Ink o={0.45}>
        <path d="M14 58C16 74 28 86 46 87" />
      </Ink>
    </Frame>
  );
}
