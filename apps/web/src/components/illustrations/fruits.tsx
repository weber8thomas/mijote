// Fruits : poire, pomme, raisin, figue, coing, kiwi, agrumes.
import { BARK, Frame, Hi, Ink, LEAF, LEAF_DARK, LG, RG, W, blob, leaf, polar, rng, url, veins } from "./primitives";
import type { IllustrationProps } from "./primitives";

export function Poire({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="poire-a" c={["#e2dc8c", "#c9c46a", "#a39c4a"]} x2={1} y2={0.4} />
      </defs>
      <W d={leaf(64, 20, 90, 12, 7, -2)} f={LEAF} o={0.82} />
      <W d="M58 28C52 28 50 36 50 44C50 53 40 59 34 71C26 87 36 105 58 105C80 105 92 89 86 73C82 61 70 54 68 44C66 36 64 28 58 28Z" f={url("poire-a")} o={0.9} />
      <W d="M70 74C80 72 86 82 82 92C78 98 70 102 62 102C74 94 76 84 70 74Z" f="#c97a4c" o={0.4} />
      <W d="M70 50C76 58 86 66 86 80C86 92 76 102 64 104C78 94 82 78 74 64C72 60 70 56 70 50Z" f="#8f8a3e" o={0.42} />
      <Hi d="M53 44C50 52 44 58 40 66C38 72 38 78 39 84C42 74 46 66 52 58C55 54 56 48 56 44Z" o={0.6} />
      <Ink c={BARK} o={0.9} w={2.4}>
        <path d="M59 30C59 23 61 17 66 12" />
      </Ink>
      <Ink o={0.5} w={1}>
        <path d={veins(64, 20, 90, 12, 3, 7)} />
      </Ink>
      <Ink>
        <path d="M86 73C92 89 80 105 58 105M50 44C50 53 40 59 34 71" />
      </Ink>
      <Ink o={0.35} w={1.6}>
        <path d="M48 76h.1M62 66h.1M70 86h.1M56 92h.1M44 92h.1M76 78h.1" />
      </Ink>
    </Frame>
  );
}

export function Pomme({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="pomme-a" c={["#e08566", "#c8553d", "#9e3a2a"]} cx={0.45} cy={0.42} r={0.7} />
      </defs>
      <W d={leaf(64, 26, 90, 16, 8, -2)} f={LEAF} o={0.85} />
      <W d="M60 34C52 28 40 28 32 36C22 46 22 66 28 80C34 94 46 104 58 100C60 99 62 99 64 100C76 104 88 94 94 80C100 66 98 46 88 36C80 28 68 28 60 34Z" f={url("pomme-a")} o={0.88} />
      <W d="M56 36C48 31 38 32 32 40C26 48 26 60 30 70C36 66 42 60 46 52C50 46 54 40 56 36Z" f="#d3c46a" o={0.55} soft />
      <W d="M86 42C96 54 96 72 90 84C84 94 74 100 66 100C80 90 90 72 86 42Z" f="#86301f" o={0.45} />
      <Hi d="M38 44C34 50 32 58 33 66C36 58 38 52 43 46Z" o={0.65} />
      <Ink c={BARK} o={0.9} w={2.4}>
        <path d="M61 37C60 30 62 24 66 19" />
      </Ink>
      <Ink o={0.5} w={1}>
        <path d={veins(64, 26, 90, 16, 3, 8)} />
      </Ink>
      <Ink>
        <path d="M52 37C56 40 64 40 69 37M94 80C88 94 76 104 64 100" />
      </Ink>
      <Ink o={0.3} w={1}>
        <path d="M72 50C74 60 74 70 72 80M80 48C83 58 83 68 81 78M64 60C65 68 64 76 62 84" />
      </Ink>
    </Frame>
  );
}

const GRAPE_ROWS: [number, number[]][] = [
  [44, [36, 50, 64, 78]],
  [56, [43, 57, 71, 85]],
  [68, [48, 62, 76]],
  [80, [55, 69]],
  [92, [62]],
];
const grapeRow = (y: number, xs: number[], k: number, s = 1, dx = 0, dy = 0) => xs.map((x, i) => blob(x + dx, y + dy, 8 * s, 8.5 * s, k + i, 0.04)).join("");
const LEAF_GRAPE = polar(84, 22, (t) => 15 * (0.72 + 0.28 * Math.abs(Math.cos(2.5 * (t + 0.3)))), 30);
export function Raisin({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <W d={LEAF_GRAPE} f={LEAF} o={0.78} />
      <Ink o={0.5} w={1}>
        <path d="M80 30L84 22M80 30L74 16M80 30L92 15M80 30L98 26M80 30L70 28" />
      </Ink>
      <Ink c={BARK} o={0.9} w={2.4}>
        <path d="M58 40C58 32 62 26 70 24C74 23 78 26 80 30" />
      </Ink>
      {GRAPE_ROWS.map(([y, xs], i) => (
        <W key={y} d={grapeRow(y, xs, i * 3)} f={i % 2 ? "#8b6890" : "#765380"} o={0.88} />
      ))}
      <W d={GRAPE_ROWS.map(([y, xs], i) => grapeRow(y, xs, i, 0.55, 2.8, 3)).join("")} f="#4f3157" o={0.4} />
      <Hi d={GRAPE_ROWS.map(([y, xs], i) => grapeRow(y, xs, i, 0.22, -3, -3.5)).join("")} o={0.7} />
      <Ink o={0.4}>
        <path d="M46 34C44 30 46 26 50 26C52 28 50 32 48 32" />
      </Ink>
    </Frame>
  );
}

const FIG_SEEDS = (() => {
  const r = rng(7);
  let d = "";
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const m = 3 + r() * 9;
    d += `M${(84 + Math.cos(a) * m * 0.9).toFixed(1)} ${(85 + Math.sin(a) * m).toFixed(1)}h.1`;
  }
  return d;
})();
const FIG_HALF = "M84 54C81 54 80 58 80 62C80 68 70 72 66 80C60 92 66 105 84 105C102 105 108 92 102 80C98 72 88 68 88 62C88 58 87 54 84 54Z";
export function Figue({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="figue-a" c={["#9c5a7c", "#6e3b5a", "#4a2440"]} cx={0.4} cy={0.55} />
        <RG id="figue-b" c={["#e8899a", "#cf5f73", "#a8425a"]} cx={0.5} cy={0.6} r={0.6} />
      </defs>
      <W d="M44 16C40 16 39 22 39 28C39 38 26 44 20 56C12 72 20 92 42 94C64 94 74 76 68 58C64 46 50 38 49 28C49 22 48 16 44 16Z" f={url("figue-a")} o={0.9} />
      <W d="M44 18C40 18 40 24 40 30C40 36 36 40 32 44C40 42 50 42 56 44C52 40 48 36 48 30C48 24 47 18 44 18Z" f="#8a8f4e" o={0.55} soft />
      <W d="M62 50C72 62 72 80 62 88C56 92 48 94 42 94C58 86 66 72 62 50Z" f="#3e1c34" o={0.45} />
      <Hi d="M30 58C26 64 25 72 27 78C29 70 31 64 35 59Z" o={0.4} />
      <W d={FIG_HALF} f="#6e3b5a" o={0.9} />
      <g transform="translate(84 86) scale(.86) translate(-84 -86)">
        <W d={FIG_HALF} f="#f1e2c4" o={0.95} />
      </g>
      <g transform="translate(84 88) scale(.64) translate(-84 -88)">
        <W d={FIG_HALF} f={url("figue-b")} o={0.92} />
      </g>
      <Ink c="#f6e3b4" o={0.9} w={1.6}>
        <path d={FIG_SEEDS} />
      </Ink>
      <Ink o={0.5}>
        <path d="M44 16C44 12 45 9 47 7M84 54C84 51 85 49 86 47" />
        <path d="M42 94C64 94 74 76 68 58" />
      </Ink>
    </Frame>
  );
}

export function Coing({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="coing-a" c={["#f6dc6e", "#e7bd42", "#c4972c"]} cx={0.38} cy={0.35} />
      </defs>
      <W d={leaf(58, 32, 26, 12, 10, 3)} f={LEAF} o={0.82} />
      <W d={leaf(62, 30, 94, 16, 8, -2)} f={LEAF_DARK} o={0.75} />
      <W d="M56 32C46 30 34 36 29 48C23 60 24 76 31 88C39 101 53 106 65 103C81 101 95 90 96 74C98 62 93 50 84 42C78 34 70 36 64 34C61 32 59 32 56 32Z" f={url("coing-a")} o={0.9} />
      <W d="M84 46C96 58 98 76 88 90C80 99 70 103 62 104C80 94 92 76 84 46Z" f="#b77f22" o={0.45} />
      <W d={blob(48, 46, 14, 8, 1, 0.08, -0.4)} f="#e5dcbc" o={0.4} soft />
      <Hi d="M38 52C34 60 33 70 35 78C38 68 40 60 44 54Z" o={0.55} />
      <Ink o={0.5} w={1}>
        <path d={veins(58, 32, 26, 12, 3, 10) + veins(62, 30, 94, 16, 3, 8)} />
      </Ink>
      <Ink>
        <path d="M60 33C60 28 60 25 61 22" />
        <path d="M58 101l2-3 2 3M56 99l4 1 4-1" />
        <path d="M96 74C95 90 81 101 65 103" />
      </Ink>
      <Ink o={0.3} w={1.6}>
        <path d="M46 70h.1M62 58h.1M74 74h.1M56 86h.1M82 62h.1M40 84h.1" />
      </Ink>
    </Frame>
  );
}

const KIWI_SEEDS = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2;
  const r = i % 2 ? 9.5 : 11;
  const x = 78 + Math.cos(a) * r;
  const y = 77 + Math.sin(a) * r * 0.92;
  return leaf(x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1);
}).join("");
const KIWI_RAYS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + 0.1;
  return `M${(78 + Math.cos(a) * 6).toFixed(1)} ${(77 + Math.sin(a) * 5.5).toFixed(1)}L${(78 + Math.cos(a) * 18).toFixed(1)} ${(77 + Math.sin(a) * 16.5).toFixed(1)}`;
}).join("");
const KIWI_FUZZ = Array.from({ length: 30 }, (_, i) => {
  const a = Math.PI * 0.55 + (i / 30) * Math.PI * 1.45;
  const x = 48 + Math.cos(a) * 31.5;
  const y = 58 + Math.sin(a) * 26.5;
  return `M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a + 0.4) * 1.6).toFixed(1)} ${(Math.sin(a + 0.4) * 1.6).toFixed(1)}`;
}).join("");
export function Kiwi({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="kiwi-a" c={["#b48c60", "#9a744a", "#7a5838"]} cx={0.4} cy={0.35} />
        <RG id="kiwi-b" c={[["#f2f2cf", 0], ["#c4d670", 0.35], ["#9cb84a", 0.75], ["#7f9c38", 1]]} cx={0.5} cy={0.5} r={0.5} />
      </defs>
      <W d="M16 56C16 40 32 29 50 31C68 33 82 45 80 61C78 77 62 87 44 85C28 83 16 72 16 56Z" f={url("kiwi-a")} o={0.9} />
      <W d="M70 40C80 50 82 66 74 76C68 82 58 86 48 86C64 78 74 62 70 40Z" f="#5f4228" o={0.42} />
      <Hi d="M28 46C34 40 42 37 50 37C42 40 36 44 32 50Z" o={0.45} />
      <W d={blob(78, 77, 25, 23, 1, 0.03)} f="#8a6440" o={0.92} />
      <W d={blob(78, 77, 22.5, 20.5, 2, 0.03)} f={url("kiwi-b")} o={0.96} />
      <Ink c="#f4f1d6" o={0.5} w={0.8}>
        <path d={KIWI_RAYS} />
      </Ink>
      <W d={blob(78, 77, 5.5, 4.8, 3, 0.05)} f="#f7f4dc" o={0.95} soft />
      <path d={KIWI_SEEDS} fill="#2e2a24" opacity={0.85} />
      <Ink o={0.3} w={0.7}>
        <path d={KIWI_FUZZ} />
      </Ink>
    </Frame>
  );
}

const CLEM_DOTS = (() => {
  const r = rng(3);
  let d = "";
  for (let i = 0; i < 28; i++) {
    const a = r() * Math.PI * 2;
    const m = Math.sqrt(r()) * 24;
    d += `M${(55 + Math.cos(a) * m).toFixed(1)} ${(68 + Math.sin(a) * m * 0.92).toFixed(1)}h.1`;
  }
  return d;
})();
export function Clementine({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="clementine-a" c={["#f8b866", "#ee9134", "#cd6f22"]} cx={0.38} cy={0.35} />
      </defs>
      <W d={blob(58, 68, 32, 30, 2, 0.035)} f={url("clementine-a")} o={0.9} />
      <W d="M78 48C90 60 90 80 80 90C72 98 60 100 52 98C70 92 84 78 78 48Z" f="#b75a1c" o={0.42} />
      <Hi d="M36 52C40 46 46 43 52 42C46 46 42 50 40 56Z" o={0.65} />
      <Ink o={0.28} w={1.6}>
        <path d={CLEM_DOTS} />
      </Ink>
      <W d={leaf(56, 40, 88, 22, 9, -2)} f={LEAF_DARK} o={0.88} />
      <W d={leaf(55, 40, 36, 16, 7, 2)} f={LEAF} o={0.82} />
      <Ink o={0.5} w={1}>
        <path d={veins(56, 40, 88, 22, 3, 9) + veins(55, 40, 36, 16, 3, 7)} />
      </Ink>
      <Ink c={BARK} o={0.9} w={2}>
        <path d="M56 41C56 36 55 33 53 30" />
      </Ink>
    </Frame>
  );
}

const LEMON_SEGS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.2;
  return `M86 92L${(86 + Math.cos(a) * 12).toFixed(1)} ${(92 + Math.sin(a) * 12).toFixed(1)}`;
}).join("");
export function Citron({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="citron-a" c={["#fbe486", "#f2cf4a", "#d6ac2e"]} cx={0.4} cy={0.35} />
      </defs>
      <W d={leaf(62, 32, 88, 12, 8, -2)} f={LEAF} o={0.82} />
      <W d="M14 56C16 52 20 50 24 48C32 34 48 28 64 30C78 32 90 40 94 48C98 50 102 52 104 54C102 58 98 60 94 60C88 74 72 82 56 80C40 78 28 70 24 62C20 62 16 60 14 56Z" f={url("citron-a")} o={0.9} />
      <W d="M86 46C96 56 92 70 80 76C72 80 62 81 54 80C70 76 86 64 86 46Z" f="#c4961e" o={0.42} />
      <Hi d="M32 46C40 38 50 35 60 35C50 39 42 44 36 52Z" o={0.65} />
      <Ink o={0.5} w={1}>
        <path d={veins(62, 32, 88, 12, 3, 8)} />
      </Ink>
      <Ink o={0.28} w={1.6}>
        <path d="M40 56h.1M52 48h.1M66 44h.1M58 62h.1M74 58h.1M46 68h.1M80 50h.1M34 60h.1" />
      </Ink>
      <W d={blob(86, 92, 17, 16, 1, 0.03)} f="#f0c843" o={0.92} />
      <W d={blob(86, 92, 14.5, 13.5, 2, 0.03)} f="#faf1cc" o={0.95} />
      <W d={blob(86, 92, 12.5, 11.8, 3, 0.03)} f="#f6e07e" o={0.9} />
      <Ink c="#fdf8e6" o={0.95} w={1.2}>
        <path d={LEMON_SEGS} />
      </Ink>
      <Ink o={0.5}>
        <path d="M14 56C16 52 20 50 24 48M104 54C102 58 98 60 94 60" />
      </Ink>
    </Frame>
  );
}
