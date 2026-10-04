// Potager, suite : chou rouge, potimarron, courgette, endive, fenouil, mâche, petits pois.
import { Frame, Hi, Ink, LEAF, LEAF_DARK, LEAF_LIGHT, LG, RG, W, blob, ell, leaf, polar, url, veins } from "./primitives";
import type { IllustrationProps } from "./primitives";

const n1 = (n: number) => String(Math.round(n * 10) / 10);

// ---------- Chou rouge : pomme entière + demi-chou tranché (nervures blanches ondulées) ----------
const CR_RINGS = [5, 9.5, 14].map((r, k) => polar(85, 88, (t) => r * (1 + 0.1 * Math.sin(5 * t + k * 2)), 12)).join("");
export function ChouRouge({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="chou-rouge-a" c={["#9a6a9e", "#6a4278"]} x2={0.4} />
        <RG id="chou-rouge-b" c={["#c9a3c6", "#9a6aa0", "#673d75"]} cx={0.42} cy={0.35} />
      </defs>
      <W d="M44 24C24 24 10 40 12 60C14 76 26 88 42 90C37 79 34 65 36 51C37 40 39 31 44 24Z" f={url("chou-rouge-a")} o={0.8} />
      <W d="M58 24C78 22 92 38 90 58C88 66 85 72 80 76C76 66 74 50 72 42C69 34 64 28 58 24Z" f={url("chou-rouge-a")} o={0.8} />
      <W d="M51 24C34 24 26 40 26 56C26 74 36 88 51 88C66 88 78 76 79 58C79 40 68 24 51 24Z" f={url("chou-rouge-b")} o={0.9} />
      <W d="M54 27C68 30 78 44 78 60C78 74 68 86 54 88C62 77 65 64 63 51C62 41 59 33 54 27Z" f="#6e3f78" o={0.55} />
      <Hi d="M40 34C34 41 32 50 33 58C36 50 39 43 45 38Z" o={0.55} />
      <Ink c="#efe0ec" o={0.75} w={1.1}>
        <path d="M44 86C40 72 40 52 48 30M43 70C38 64 35 58 33 51M44 56C40 51 38 46 38 41M44 74C49 67 55 62 62 59" />
        <path d="M17 58C22 53 27 49 34 47M86 50C82 48 79 47 76 47" />
      </Ink>
      <W d={blob(85, 88, 23, 22, 1, 0.03)} f="#5c3466" o={0.92} />
      <W d={blob(85, 88, 20.5, 19.5, 2, 0.03)} f="#8b5794" o={0.95} />
      <Ink c="#f6ecf4" o={0.9} w={1.5}>
        <path d={CR_RINGS} />
      </Ink>
      <W d="M80 108C82 100 83 94 85 88C87 94 88 100 90 108C87 109 83 109 80 108Z" f="#f3e6f0" o={0.92} />
      <Ink o={0.45}>
        <path d="M12 60C14 76 26 88 42 90M64 86C76 82 79 70 79 58" />
      </Ink>
    </Frame>
  );
}

// ---------- Potimarron : goutte rouge-orangé, côtes discrètes, gros pédoncule liégeux ----------
export function Potimarron({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="potimarron-a" c={["#f2955a", "#dc5f2c", "#ae401e"]} cx={0.4} cy={0.45} r={0.75} />
      </defs>
      <W d={leaf(62, 30, 92, 16, 9, -2)} f={LEAF} o={0.8} />
      <Ink o={0.5} w={1}>
        <path d={veins(62, 30, 92, 16, 3, 9)} />
      </Ink>
      <W d="M60 30C50 34 38 44 30 58C22 72 22 88 32 98C40 106 50 108 60 108C70 108 80 106 88 98C98 88 98 72 90 58C82 44 70 34 60 30Z" f={url("potimarron-a")} o={0.9} />
      <W d="M76 42C88 54 96 70 92 88C88 98 78 106 64 108C82 98 90 76 76 42Z" f="#952f17" o={0.42} />
      <W d="M64 36C72 52 74 82 68 106C71 105 73 104 75 103C80 82 78 54 64 36Z" f="#a8391b" o={0.32} />
      <Hi d="M46 48C38 58 34 70 35 82C39 70 43 60 50 51Z" o={0.55} />
      <W d="M56 33C56 26 55 20 52 15C56 12 62 12 66 14C64 20 64 26 64 33C61 35 58 35 56 33Z" f="#9a8a58" o={0.92} />
      <W d="M52 15C56 12 62 12 66 14C62 17 56 17 52 15Z" f="#d8c99a" o={0.85} />
      <Ink>
        <path d="M56 34C46 50 40 78 46 104M64 34C74 50 80 78 74 104" />
        <path d="M66 16C72 9 82 10 82 16C82 21 76 22 75 18" />
      </Ink>
      <Ink o={0.35} w={1}>
        <path d="M60 36C58 56 58 84 60 106M48 40C34 54 28 80 36 98M72 40C86 54 92 80 84 98" />
      </Ink>
    </Frame>
  );
}

// ---------- Courgette : longue, vert sombre striée, + rondelle ----------
const CG_DOTS = [22, 34, 46, 58, 70, 82].map((x, i) => `M${x} ${i % 2 ? 56 : 63}h.1M${x + 6} ${i % 2 ? 64 : 55}h.1`).join("");
export function Courgette({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="courgette-a" c={["#7ea35a", "#4f7a3a", "#36592a"]} />
      </defs>
      <g transform="rotate(-34 60 60)">
        <W d="M12 60C12 50 20 47 30 48L92 50C100 50 104 54 104 60C104 66 100 70 92 70L30 72C20 73 12 70 12 60Z" f={url("courgette-a")} o={0.92} />
        <W d="M16 66C30 71 70 70 102 64C100 68 96 70 92 70L30 72C22 72 18 70 16 66Z" f="#2f4f24" o={0.45} />
        <Hi d="M22 53C40 51 70 52 94 53C70 55 40 55 22 56Z" o={0.45} />
        <Ink c="#c3d696" o={0.55} w={1.2}>
          <path d="M20 57C44 55 70 56 98 57M22 64C46 64 72 63 98 62" />
        </Ink>
        <Ink c="#d6e3b0" o={0.6} w={2}>
          <path d={CG_DOTS} />
        </Ink>
        <W d="M103 55L110 54C114 54 116 57 116 60C116 63 114 66 110 66L103 65Z" f="#8a9a5a" o={0.92} />
        <W d={blob(13, 60, 4, 5, 1, 0.1)} f="#c9b884" o={0.8} />
      </g>
      <W d={blob(82, 88, 18, 17, 2, 0.03)} f="#4f7a3a" o={0.92} />
      <W d={blob(82, 88, 15.5, 14.5, 3, 0.03)} f="#eef0cc" o={0.95} />
      <W d={blob(82, 88, 8.5, 8, 4, 0.05)} f="#d6dfa0" o={0.75} soft />
      <Ink o={0.4} w={1.6}>
        <path d="M82 81h.1M88 84h.1M88 92h.1M82 95h.1M76 92h.1M76 84h.1" />
      </Ink>
      <Ink o={0.5}>
        <path d="M20 94C40 82 62 66 86 48" />
      </Ink>
    </Frame>
  );
}

// ---------- Endive : bourgeon serré de feuilles blanches, pointes jaune-vert ----------
const ENDIVE = "M60 12C49 19 40 40 40 64C40 88 48 102 60 108C72 102 80 88 80 64C80 40 71 19 60 12Z";
const ENDIVE_LEFT = "M60 108C47 101 40 86 40 64C40 44 46 26 55 16C51 34 49 52 51 70C53 86 56 98 60 108Z";
const ENDIVE_RIGHT = "M60 108C73 101 80 86 80 64C80 44 74 28 66 18C70 34 71 52 69 70C67 86 64 98 60 108Z";
function EndiveBud({ shade }: { shade?: boolean }) {
  return (
    <>
      <W d={ENDIVE} f={url("endive-a")} o={0.94} />
      <W d={ENDIVE_LEFT} f="#f7f2dc" o={0.9} />
      <W d={ENDIVE_RIGHT} f={shade ? "#d6cd9e" : "#e9e2bf"} o={0.9} />
      <W d="M60 12C52 17 46 28 43 42C50 38 70 38 77 42C74 28 68 17 60 12Z" f="#cfcf5e" o={0.6} soft />
      {!shade && <Hi d="M46 50C44 62 44 76 48 88C48 76 48 62 50 52Z" o={0.7} />}
      <Ink o={shade ? 0.4 : 0.6}>
        <path d="M60 108C47 101 40 86 40 64C40 44 46 26 55 16C51 34 49 52 51 70C53 86 56 98 60 108M60 108C73 101 80 86 80 64C80 44 74 28 66 18C70 34 71 52 69 70C67 86 64 98 60 108" />
      </Ink>
    </>
  );
}
export function Endive({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="endive-a" c={[["#d6d070", 0], ["#ebe7a8", 0.28], ["#f5f1da", 0.6], ["#faf7ea", 1]]} />
      </defs>
      <g transform="translate(12 -2) rotate(16 60 108) scale(.9)">
        <EndiveBud shade />
      </g>
      <g transform="translate(-12 2) rotate(-12 60 108)">
        <EndiveBud />
      </g>
    </Frame>
  );
}

// ---------- Fenouil : bulbe large en gaines, tiges épaisses, plumets ----------
const FENNEL_STALKS: [number, number, number, number][] = [
  [48, 64, 34, 28],
  [60, 62, 60, 20],
  [72, 64, 88, 30],
];
const FRONDS = FENNEL_STALKS.map(([bx, by, x, y]) => {
  const a = Math.atan2(y - by, x - bx);
  return [-1, -0.5, 0, 0.5, 1]
    .map((da) => {
      const b = a + da;
      const L = 19 - Math.abs(da) * 4;
      const P = (t: number, dx = 0, l = 0) => `${n1(x + Math.cos(b) * L * t + Math.cos(b + dx) * l)} ${n1(y + Math.sin(b) * L * t + Math.sin(b + dx) * l)}`;
      return `M${x} ${y}L${P(1)}M${P(0.4)}L${P(0.4, 0.8, 6)}M${P(0.4)}L${P(0.4, -0.8, 6)}M${P(0.75)}L${P(0.75, 0.8, 4)}M${P(0.75)}L${P(0.75, -0.8, 4)}`;
    })
    .join("");
}).join("");
export function Fenouil({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="fenouil-a" c={["#fbfaee", "#e9efcc", "#c6d49c"]} cx={0.42} cy={0.4} />
      </defs>
      <Ink c="#7f9c5a" o={0.85} w={1.1}>
        <path d={FRONDS} />
      </Ink>
      <Ink c="#bccf8e" o={1} w={7}>
        <path d={FENNEL_STALKS.map(([bx, by, x, y]) => `M${bx} ${by}L${x} ${y}`).join("")} />
      </Ink>
      <Ink c="#8fa865" o={0.6} w={1.4}>
        <path d="M51 62L38 28M63 61L63 21M75 63L90 32" />
      </Ink>
      <W d="M22 84C20 70 32 62 44 64C50 59 70 59 76 64C88 62 100 70 98 84C96 98 80 107 60 107C40 107 24 98 22 84Z" f={url("fenouil-a")} o={0.94} />
      <W d="M44 64C30 66 24 78 28 92C32 101 44 107 56 107C44 99 38 84 44 64Z" f="#f6f6e4" o={0.85} />
      <W d="M76 64C90 66 96 78 92 92C88 101 76 107 64 107C76 99 82 84 76 64Z" f="#c9d6a0" o={0.8} />
      <W d="M84 70C94 78 96 92 86 100C80 104 72 106 66 107C80 98 88 86 84 70Z" f="#a3b676" o={0.45} />
      <Hi d="M34 76C32 84 33 92 37 98C37 90 37 84 39 78Z" o={0.7} />
      <Ink o={0.55}>
        <path d="M44 64C30 66 24 78 28 92C32 101 44 107 56 107M76 64C90 66 96 78 92 92C88 101 76 107 64 107M44 64C48 70 54 73 60 73C66 73 72 70 76 64" />
      </Ink>
    </Frame>
  );
}

// ---------- Mâche : rosettes de petites feuilles en cuillère ----------
type Rosette = [number, number, number, number, number];
const ROSETTES: Rosette[] = [
  [66, 38, 22, 5, 0.3],
  [36, 68, 28, 6, 0.1],
  [84, 84, 24, 5, 0.9],
];
const rosette = ([cx, cy, r, n, a0]: Rosette, odd: number) =>
  Array.from({ length: n }, (_, i) => i)
    .filter((i) => i % 2 === odd)
    .map((i) => {
      const a = a0 + (i / n) * Math.PI * 2;
      return ell(cx + Math.cos(a) * r * 0.56, cy + Math.sin(a) * r * 0.56, r * 0.48, r * 0.3, a);
    })
    .join("");
const MACHE_RIBS = ROSETTES.map(([cx, cy, r, n, a0]) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    return `M${cx} ${cy}L${n1(cx + Math.cos(a) * r * 0.9)} ${n1(cy + Math.sin(a) * r * 0.9)}`;
  }).join(""),
).join("");
const MACHE_INNER = ROSETTES.map(([cx, cy, r, , a0]) => rosette([cx, cy, r * 0.5, 4, a0 + 0.7], 0) + rosette([cx, cy, r * 0.5, 4, a0 + 0.7], 1)).join("");
export function Mache({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <W d={ROSETTES.map((r) => rosette(r, 0)).join("")} f={LEAF_DARK} o={0.88} />
      <W d={ROSETTES.map((r) => rosette(r, 1)).join("")} f="#6a944a" o={0.9} />
      <W d={MACHE_INNER} f={LEAF_LIGHT} o={0.45} />
      <Ink o={0.45} w={1}>
        <path d={MACHE_RIBS} />
      </Ink>
      <W d={ROSETTES.map(([cx, cy], i) => blob(cx, cy, 2.5, 2.5, i)).join("")} f="#e9e2c4" o={0.9} />
    </Frame>
  );
}

// ---------- Petits pois : cosse ouverte + pois ----------
const PEAS: [number, number][] = [
  [30, 58],
  [45, 55],
  [60, 54],
  [75, 54],
  [90, 55],
];
export function PetitsPois({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="petits-pois-a" c={["#cfe39a", "#93b85a", "#5f8a3a"]} cx={0.38} cy={0.35} />
        <LG id="petits-pois-b" c={["#a6c672", "#6f9a48"]} />
      </defs>
      <g transform="rotate(-20 60 60)">
        <W d="M12 60C26 40 90 34 110 52C96 44 30 46 12 60Z" f={LEAF_DARK} o={0.85} />
        <W d="M14 60C28 48 88 44 108 53C98 62 36 68 14 60Z" f="#d7e3b0" o={0.9} />
        <W d={PEAS.map(([x, y]) => ell(x, y, 7.6, 7.3)).join("")} f={url("petits-pois-a")} o={0.95} />
        <Hi d={PEAS.map(([x, y]) => ell(x - 2.5, y - 2.8, 2.4, 1.8)).join("")} o={0.75} />
        <W d="M10 60C34 70 90 68 112 52C106 74 72 86 46 83C28 81 16 73 10 60Z" f={url("petits-pois-b")} o={0.93} />
        <W d="M20 72C40 82 80 82 104 66C96 80 70 88 46 85C34 84 26 80 20 72Z" f="#4f7536" o={0.4} />
        <W d={leaf(110, 52, 118, 42, 3) + leaf(110, 52, 118, 58, 3)} f={LEAF} o={0.85} />
        <Ink o={0.55}>
          <path d="M10 60C34 70 90 68 112 52M12 60C26 40 90 34 110 52M12 60C8 58 6 56 5 52" />
        </Ink>
        <Ink c="#5f7d45" o={0.9} w={2}>
          <path d="M112 52C116 46 116 40 112 36" />
        </Ink>
      </g>
      <W d={ell(40, 104, 7, 6.8) + ell(56, 108, 6.5, 6.3)} f={url("petits-pois-a")} o={0.95} />
      <Hi d={ell(38, 101.5, 2.2, 1.6) + ell(54, 105.5, 2, 1.5)} o={0.75} />
    </Frame>
  );
}
