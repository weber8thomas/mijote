// Garde-manger : châtaigne, légumineuses, poisson, œuf, avoine.
import { Frame, Hi, Ink, LEAF_LIGHT, LG, RG, W, blob, ell, leaf, polar, rng, url } from "./primitives";
import type { IllustrationProps } from "./primitives";

const NUT = "M0 -27C-6 -26 -20 -12 -22 2C-24 16 -18 26 -4 27C10 28 20 24 22 12C24 -2 10 -20 3 -26C2 -27 1 -27 0 -27Z";
const NUT_BASE = "M-21 14C-17 23 -9 28 0 28C10 28 18 25 21 18C14 22 4 24 -4 23C-12 22 -18 19 -21 14Z";
function Nut({ t }: { t: string }) {
  return (
    <g transform={t}>
      <W d={NUT} f={url("chataigne-a")} o={0.92} />
      <W d="M10 -18C20 -6 24 8 18 20C12 26 4 27 -2 27C12 18 18 2 10 -18Z" f="#3f2414" o={0.4} />
      <Hi d="M-6 -18C-12 -10 -16 -2 -16 6C-13 -2 -9 -10 -3 -16Z" o={0.6} />
      <W d={NUT_BASE} f="#dcc7a4" o={0.9} />
      <Ink o={0.55}>
        <path d="M0 -27L-1 -33M1 -27L3 -32M-1 -27L-4 -31" />
        <path d="M-19 15C-14 20 -6 23 0 23C8 23 14 21 20 17" />
      </Ink>
      <Ink o={0.25} w={1}>
        <path d="M0 -22C-6 -10 -10 4 -10 20M4 -22C6 -8 6 6 4 22" />
      </Ink>
    </g>
  );
}
export function Chataigne({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="chataigne-a" c={["#a26c46", "#7a4a2e", "#55311e"]} cx={0.36} cy={0.3} />
      </defs>
      <W d={leaf(16, 104, 104, 20, 9, 4)} f={LEAF_LIGHT} o={0.5} />
      <Nut t="translate(40 62) rotate(-14)" />
      <Nut t="translate(80 58) rotate(16) scale(.94)" />
      <Nut t="translate(61 86) rotate(3) scale(.86)" />
    </Frame>
  );
}

const LENS = (() => {
  const r = rng(21);
  const a: string[] = [];
  const b: string[] = [];
  const hi: string[] = [];
  const lines: string[] = [];
  let row = 0;
  for (let y = 93; y > 52; y -= 4.4, row++) {
    for (let x = 14 + (row % 2) * 3.6; x < 107; x += 7.4) {
      const top = 54 + ((x - 60) / 44) ** 2 * 40;
      if (y < top + 1.5) continue;
      const cx = x + (r() - 0.5) * 2.4;
      const cy = y + (r() - 0.5) * 1.6;
      const p = ell(cx, cy, 3.7, 2.6, (r() - 0.5) * 1.1);
      (r() > 0.45 ? a : b).push(p);
      hi.push(ell(cx - 1.2, cy - 0.9, 1.3, 0.7, -0.2));
      if (r() > 0.5) lines.push(p);
    }
  }
  const loose: [number, number, number][] = [[14, 103, 0.3], [27, 106, -0.4], [93, 105, 0.6], [106, 101, -0.2], [78, 109, 0.1], [44, 109, -0.6]];
  for (const [x, y, t] of loose) {
    const p = ell(x, y, 3.7, 2.6, t);
    a.push(p);
    lines.push(p);
  }
  return { a: a.join(""), b: b.join(""), hi: hi.join(""), lines: lines.join("") };
})();
export function Lentilles({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="lentilles-a" c={["#9da262", "#80854a", "#666a3c"]} />
      </defs>
      <W d="M12 95C22 72 40 54 60 52C80 54 98 72 108 95C94 100 26 100 12 95Z" f={url("lentilles-a")} o={0.6} />
      <W d={LENS.b} f="#a3a766" o={0.88} />
      <W d={LENS.a} f="#7d8245" o={0.85} />
      <W d="M80 60C94 70 102 82 107 95C98 98 86 99 76 99C88 88 88 74 80 60Z" f="#4f5230" o={0.3} />
      <path d={LENS.hi} fill="#f3f0d0" opacity={0.45} />
      <Ink o={0.4} w={0.7}>
        <path d={LENS.lines} />
      </Ink>
    </Frame>
  );
}

type Pea = [number, number, number, number];
const PEAS: Pea[] = [
  [40, 50, 12, -2.3],
  [64, 44, 12.5, -1.2],
  [87, 56, 11.5, -0.4],
  [32, 74, 11.5, 2.7],
  [57, 70, 13, -1.9],
  [82, 80, 12, 0.3],
  [54, 96, 11.5, 1.1],
];
const chick = ([cx, cy, r, a]: Pea, k: number, s = 1) =>
  polar(cx, cy, (t) => {
    const d = Math.atan2(Math.sin(t - a), Math.cos(t - a));
    return s * r * (1 + 0.045 * Math.sin(3 * t + k) + 0.02 * Math.cos(5 * t + k) + 0.15 * Math.exp(-(d * d) / 0.07));
  }, 24);
const crease = ([cx, cy, r, a]: Pea) => {
  const P = (m: number, t: number) => `${(cx + Math.cos(a + t) * r * m).toFixed(1)} ${(cy + Math.sin(a + t) * r * m).toFixed(1)}`;
  return `M${P(1.08, 0)}Q${P(0.62, 0.4)} ${P(0.55, 1.1)}`;
};
export function PoisChiche({ className }: IllustrationProps) {
  const back = PEAS.slice(0, 3);
  const front = PEAS.slice(3);
  return (
    <Frame className={className}>
      <defs>
        <RG id="pois-chiche-a" c={["#f3dfae", "#e3c387", "#c9a262"]} cx={0.38} cy={0.35} />
      </defs>
      <W d={back.map((p, i) => chick(p, i)).join("")} f={url("pois-chiche-a")} o={0.9} />
      <W d={front.map((p, i) => chick(p, i + 3)).join("")} f={url("pois-chiche-a")} o={0.92} />
      <W d={PEAS.map(([x, y, r, a], i) => chick([x + 3, y + 3.5, r * 0.62, a], i)).join("")} f="#b38846" o={0.38} />
      <Hi d={PEAS.map(([x, y, r, a], i) => chick([x - 3.5, y - 4, r * 0.3, a], i)).join("")} o={0.6} />
      <Ink o={0.45} w={1}>
        <path d={PEAS.map(crease).join("")} />
      </Ink>
    </Frame>
  );
}

export function Poisson({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="poisson-a" c={[["#56707f", 0], ["#7c93a3", 0.4], ["#c3ced2", 0.62], ["#eceee8", 1]]} />
      </defs>
      <g transform="rotate(-10 60 62)">
        <W d="M60 44C64 36 70 33 77 35C75 39 73 42 72 46Z" f="#6d8494" o={0.6} />
        <W d="M98 59C102 54 108 47 114 42C112 51 110 57 110 62C110 66 112 72 114 82C108 78 102 71 98 66Z" f="#6d8494" o={0.75} />
        <W d="M12 62C24 47 48 41 72 44C84 46 93 52 99 59C99 62 99 64 99 66C93 73 84 78 72 80C48 84 24 78 12 62Z" f={url("poisson-a")} o={0.9} />
        <W d="M28 52C40 46 56 44 72 46C84 48 92 53 97 60C88 56 74 54 60 54C48 54 36 56 28 52Z" f="#8fa898" o={0.35} soft />
        <Hi d="M26 66C40 64 60 64 92 64C76 68 50 70 30 68Z" o={0.75} />
        <W d="M40 66C46 63 53 65 57 70C51 72 45 70 40 66Z" f="#7c93a3" o={0.6} />
        <W d={blob(25, 59, 3.8, 3.6, 1, 0.03)} f="#f4eedc" o={0.95} />
        <circle cx={25.3} cy={59} r={1.9} fill="#2e2a24" opacity={0.85} />
        <Ink c="#3e5260" o={0.55} w={1.4}>
          <path d="M42 50c1 3 3 4 5 3M50 47c0 3 2 5 4 5M58 46c1 3 0 5-2 7M66 46c2 2 2 5 1 7M74 47c1 3 3 4 5 4M82 50c0 2 1 4 3 5M90 54c0 2 1 3 2 4M62 53c2 0 4 1 5 3" />
        </Ink>
        <Ink o={0.6}>
          <path d="M36 51C40 56 40 65 35 72M12 62C15 63 18 63 21 62" />
          <path d="M12 62C24 78 48 84 72 80C84 78 93 73 99 66" />
          <path d="M104 56L109 62L104 69" />
        </Ink>
        <Ink o={0.3} w={1}>
          <path d="M40 62C56 61 76 61 96 62" />
        </Ink>
      </g>
    </Frame>
  );
}

export function Oeuf({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="oeuf-a" c={["#f8eeda", "#efdfbf", "#d8bf92"]} x2={1} y2={0.5} />
        <RG id="oeuf-b" c={["#f9cf68", "#f2b33d", "#de9325"]} cx={0.42} cy={0.4} />
      </defs>
      <W d={blob(60, 100, 44, 6, 1, 0.05)} f="#d9ccae" o={0.35} soft />
      <W d="M48 20C34 20 24 44 24 62C24 82 34 94 48 94C62 94 72 82 72 62C72 44 62 20 48 20Z" f={url("oeuf-a")} o={0.92} />
      <W d="M62 34C70 46 72 66 68 78C64 88 56 94 48 94C62 84 68 64 62 34Z" f="#c7a978" o={0.42} />
      <Hi d="M38 34C33 42 31 52 31 60C34 52 37 44 42 37Z" o={0.75} />
      <W d={blob(84, 86, 26, 16, 2, 0.03, -0.05)} f="#e5dac4" o={0.9} />
      <W d={blob(84, 85, 23.5, 13.5, 3, 0.03, -0.05)} f="#fcf8ef" o={0.95} />
      <W d={blob(84, 85, 11, 9, 4, 0.05)} f={url("oeuf-b")} o={0.95} />
      <Hi d={blob(80, 82, 3.5, 2.4, 1)} o={0.65} />
      <Ink o={0.55}>
        <path d="M72 62C72 82 62 94 48 94M24 62C24 44 34 20 48 20" />
        <path d="M58 86C60 96 72 102 86 102C98 102 108 96 110 88" />
      </Ink>
      <Ink o={0.25} w={1.5}>
        <path d="M44 48h.1M56 58h.1M40 72h.1M58 76h.1M50 40h.1" />
      </Ink>
    </Frame>
  );
}

const OAT: [number, number, number, number, number, number][] = [
  [52, 58, 38, 62, 34, 78],
  [53, 52, 66, 57, 70, 73],
  [54, 46, 40, 47, 36, 63],
  [56, 39, 70, 40, 74, 56],
  [59, 31, 46, 31, 42, 47],
  [61, 26, 74, 25, 78, 41],
  [64, 20, 54, 17, 50, 32],
  [66, 16, 76, 12, 81, 26],
];
const OAT_SPIKES = OAT.map(([, , ax, ay, tx, ty]) => leaf(ax, ay, tx, ty, 3.8)).join("");
const OAT_MID = OAT.map(([, , ax, ay, tx, ty]) => `M${ax} ${ay + 2}L${(ax + (tx - ax) * 0.8).toFixed(1)} ${(ay + (ty - ay) * 0.8).toFixed(1)}`).join("");
const OAT_STALKS = OAT.map(([sx, sy, ax, ay]) => `M${sx} ${sy}Q${(sx + ax) / 2} ${Math.min(sy, ay) - 4} ${ax} ${ay}`).join("");
const FLAKES = [blob(80, 100, 9, 5.5, 1, 0.12, 0.3), blob(96, 96, 8, 5, 2, 0.12, -0.4), blob(102, 106, 7.5, 4.5, 3, 0.12, 0.2), blob(88, 108, 8, 4.5, 4, 0.12, -0.1), blob(70, 110, 7, 4, 5, 0.12, 0.5)];
export function Avoine({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <W d={leaf(47, 108, 24, 70, 3.5, 3)} f={LEAF_LIGHT} o={0.65} />
      <Ink c="#b59a5e" o={0.9} w={1.8}>
        <path d="M47 112C46 92 48 68 53 48C56 34 61 22 67 12" />
      </Ink>
      <Ink c="#b59a5e" o={0.85} w={1}>
        <path d={OAT_STALKS} />
      </Ink>
      <W d={OAT_SPIKES} f="#dcc58e" o={0.88} />
      <W d={OAT.map(([, , ax, ay, tx, ty]) => leaf(ax + 1, ay + 3, tx + 0.5, ty, 1.8)).join("")} f="#b99c5e" o={0.45} />
      <Ink o={0.45} w={0.9}>
        <path d={OAT_MID} />
      </Ink>
      <W d={FLAKES.join("")} f="#ead7a6" o={0.92} />
      <W d={FLAKES.map((_, i) => blob([82, 98, 103, 90, 72][i] ?? 0, [102, 98, 107, 109, 111][i] ?? 0, 5, 2.6, i)).join("")} f="#c7a96a" o={0.35} />
      <Ink o={0.45} w={1}>
        <path d="M72 98C76 96 82 95 87 97M90 93C94 91 99 91 103 93M96 104C99 103 103 103 106 105M81 106C84 105 89 105 93 107M64 108C67 107 71 107 74 109" />
      </Ink>
    </Frame>
  );
}
