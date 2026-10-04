// Assiette : protéines et féculents (viande, poulet, haricots, tofu, pâtes, riz, céréales, pain).
// Silhouettes compactes, lisibles à ~60 px, pensées pour se chevaucher dans une « assiette ».
import { Frame, Hi, Ink, LG, RG, W, blob, ell, leaflets, rng, smooth, url } from "./primitives";
import type { IllustrationProps } from "./primitives";

type Pt = [number, number];
const n1 = (n: number) => String(Math.round(n * 10) / 10);
/** Place des points locaux (centrés en 0,0) : rotation `a`, échelle `s`, translation (cx, cy). */
const place = (pts: Pt[], cx: number, cy: number, a: number, s = 1): Pt[] =>
  pts.map(([x, y]) => [cx + (x * Math.cos(a) - y * Math.sin(a)) * s, cy + (x * Math.sin(a) + y * Math.cos(a)) * s]);
const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join("L")}Z`;
const line = (pts: Pt[]) => `M${pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join("L")}`;

// ---------- Viande ----------
const THYME = leaflets(48, 74, 92, 42, 7, 6.5, 2.2, 0.85);
export function Viande({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="viande-a" c={["#d77d6c", "#bf4f43", "#96342e"]} cx={0.45} cy={0.5} r={0.65} />
      </defs>
      <W d="M20 58C20 44 36 34 57 36C73 37 84 30 96 38C106 45 104 60 98 70C92 82 78 91 60 91C39 92 20 78 20 58Z" f="#8a2f2a" o={0.8} />
      <g transform="translate(0 -5)">
        <W d="M20 58C20 44 36 34 57 36C73 37 84 30 96 38C106 45 104 60 98 70C92 82 78 91 60 91C39 92 20 78 20 58Z" f={url("viande-a")} o={0.93} />
        <W d="M58 36C74 37 84 30 96 38C106 45 104 60 98 70C99 60 97 50 91 45C83 40 72 42 61 41C58 40 57 38 58 36Z" f="#f3e2ca" o={0.95} />
      </g>
      <W d="M78 48C90 54 96 64 90 74C84 80 74 84 64 85C80 78 88 64 78 48Z" f="#7e2a27" o={0.35} />
      <Hi d="M32 58C40 50 52 46 62 46C52 50 42 56 36 64Z" o={0.45} />
      <Ink c="#f6e6d4" o={0.75} w={1.3}>
        <path d="M34 58C40 54 46 58 52 54M60 66C66 62 72 66 80 60M42 74C48 72 52 76 59 74M66 48C70 46 74 48 80 45" />
      </Ink>
      <Ink c="#5f7d45" o={0.9} w={1.3}>
        <path d="M46 76C58 66 74 54 94 40" />
      </Ink>
      <W d={THYME} f="#6f8a52" o={0.9} />
      <Ink o={0.55}>
        <path d="M20 58C20 72 30 86 48 91M22 64C24 76 34 88 52 92" />
      </Ink>
    </Frame>
  );
}

// ---------- Poulet ----------
export function Poulet({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="poulet-a" c={["#f0c77a", "#d99442", "#a8602a"]} cx={0.4} cy={0.38} />
        <LG id="poulet-b" c={["#fbf4e6", "#e6d8bf"]} x2={1} y2={1} />
      </defs>
      <W d="M74 54L88 42L95 49L81 60Z" f={url("poulet-b")} o={0.95} />
      <W d={blob(93, 41, 6.2, 5.6, 1, 0.04) + blob(98, 47, 6, 5.4, 2, 0.04)} f={url("poulet-b")} o={0.95} />
      <W d="M94 50C97 53 101 52 103 49C101 54 96 55 93 52Z" f="#cdbb9c" o={0.6} />
      <W d="M26 90C17 80 19 61 31 52C42 44 57 45 65 50C69 52 73 52 77 50L83 57C80 60 78 63 77 67C75 79 69 89 59 95C47 101 33 98 26 90Z" f={url("poulet-a")} o={0.93} />
      <W d="M68 56C78 64 78 78 68 88C61 94 52 98 42 98C58 92 72 78 68 56Z" f="#8e4a1e" o={0.42} />
      <W d={blob(44, 64, 7, 4, 1, 0.15, -0.5) + blob(58, 78, 6, 3.5, 2, 0.15, 0.3) + blob(36, 84, 5, 3, 3, 0.15, 0.2)} f="#a5591f" o={0.35} soft />
      <Hi d="M32 62C36 54 44 49 52 48C44 52 38 58 35 66Z" o={0.7} />
      <Ink o={0.55}>
        <path d="M77 67C75 79 69 89 59 95C49 100 36 99 28 92" />
        <path d="M78 51L88 43M83 57L95 49" />
      </Ink>
      <Ink o={0.3} w={1.6}>
        <path d="M40 56h.1M50 54h.1M46 72h.1M62 66h.1M54 88h.1M34 74h.1M66 80h.1" />
      </Ink>
    </Frame>
  );
}

// ---------- Haricots blancs ----------
const BEAN: Pt[] = Array.from({ length: 10 }, (_, i): Pt => {
  const t = (i / 10) * Math.PI * 2;
  const y = Math.sin(t);
  return [Math.cos(t) * 11, y * 6.2 * (y > 0 ? 0.72 : 1)];
});
const BEAN_ROWS = (() => {
  const r = rng(5);
  const rows: { fill: string; sh: string; eye: string }[] = [];
  let row = 0;
  for (let y = 58; y < 95; y += 10.5, row++) {
    let fill = "";
    let sh = "";
    let eye = "";
    for (let x = 20 + (row % 2) * 9.5; x < 104; x += 19) {
      const top = 50 + ((x - 60) / 46) ** 2 * 44;
      if (y < top + 4) continue;
      const cx = x + (r() - 0.5) * 3;
      const cy = y + (r() - 0.5) * 2;
      const rot = (r() - 0.5) * 0.9 + (r() > 0.85 ? 1.2 : 0);
      fill += smooth(place(BEAN, cx, cy, rot));
      sh += smooth(place(BEAN, cx + 1.6, cy + 2, rot, 0.62));
      eye += line(place([[-2, 4], [2, 4]], cx, cy, rot));
    }
    if (fill) rows.push({ fill, sh, eye });
  }
  return rows;
})();
export function Haricot({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <W d="M12 98C22 76 40 58 60 56C80 58 98 76 108 98C94 103 26 103 12 98Z" f="#d3c29c" o={0.5} />
      {BEAN_ROWS.map((b, i) => (
        <g key={i}>
          <W d={b.fill} f={i % 2 ? "#f1e7cf" : "#f6efdd"} o={0.97} />
          <W d={b.sh} f="#c4ad80" o={0.4} soft />
          <Ink o={0.45} w={0.9}>
            <path d={b.fill} />
            <path d={b.eye} strokeOpacity={0.6} />
          </Ink>
        </g>
      ))}
    </Frame>
  );
}

// ---------- Tofu ----------
const cube = (o: Pt, a: number, b: number, h: number) => {
  const u: Pt = [1, -0.3];
  const v: Pt = [1, 0.31];
  const P = (i: number, j: number, k = 0): Pt => [o[0] + u[0] * i + v[0] * j, o[1] + u[1] * i + v[1] * j + k];
  return {
    top: poly([P(0, 0), P(a, 0), P(a, b), P(0, b)]),
    left: poly([P(0, 0), P(0, b), P(0, b, h), P(0, 0, h)]),
    right: poly([P(0, b), P(a, b), P(a, b, h), P(0, b, h)]),
    edges: line([P(0, 0, h), P(0, 0), P(a, 0), P(a, b), P(a, b, h), P(0, b, h), P(0, 0, h)]) + line([P(0, 0), P(0, b), P(a, b)]) + line([P(0, b), P(0, b, h)]),
  };
};
const BLOCK = cube([16, 52], 40, 34, 24);
const PIECE = cube([70, 88], 16, 16, 16);
export function Tofu({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <W d={BLOCK.left + PIECE.left} f="#e8dcbd" o={0.95} />
      <W d={BLOCK.right + PIECE.right} f="#d5c49c" o={0.95} />
      <W d={BLOCK.top + PIECE.top} f="#faf5e8" o={0.95} />
      <Hi d="M30 50C42 46 54 44 64 44C54 48 42 50 32 54Z" o={0.6} />
      <Ink o={0.55} w={1.1}>
        <path d={BLOCK.edges + PIECE.edges} />
      </Ink>
      <Ink o={0.3} w={1.6}>
        <path d="M40 70h.1M28 64h.1M66 76h.1M78 68h.1M58 82h.1M36 76h.1M92 98h.1M80 100h.1M48 52h.1M72 50h.1" />
      </Ink>
    </Frame>
  );
}

// ---------- Pâtes ----------
const PENNE: Pt[] = [[-15, -4.6], [11, -4.6], [15, 4.6], [-11, 4.6]];
const penne = (cx: number, cy: number, a: number, s: number) => ({
  body: poly(place(PENNE, cx, cy, a, s)),
  hole: (() => {
    const [x, y] = place([[13, 0]], cx, cy, a, s)[0] ?? [cx, cy];
    return ell(x, y, 5 * s, 1.9 * s, a + 1.15);
  })(),
  ridges: [-2.4, 0, 2.4].map((y) => line(place([[-11 + y * 0.4, y], [9 + y * 0.4, y]], cx, cy, a, s))).join(""),
});
const WING: Pt[] = [[0, 0], [-6, -5], [-13, -9], [-17, -5], [-17, 5], [-13, 9], [-6, 5]];
const farfalle = (cx: number, cy: number, a: number, s: number) => ({
  body: smooth(place(WING, cx, cy, a, s)) + smooth(place(WING, cx, cy, a + Math.PI, s)),
  knot: smooth(place([[-3, -4], [3, -4], [3.5, 0], [3, 4], [-3, 4], [-3.5, 0]], cx, cy, a, s)),
  pleats: [-1, 1].map((d) => line(place([[d * 4, -3], [d * 9, -5]], cx, cy, a, s)) + line(place([[d * 4, 3], [d * 9, 5]], cx, cy, a, s))).join("") + [-1, 1].map((d) => line(place([[d * 17, -5], [d * 18, -2.5], [d * 17, 0], [d * 18, 2.5], [d * 17, 5]], cx, cy, a, s))).join(""),
});
const coquille = (cx: number, cy: number, a: number, s: number) => {
  const R = 9 * s;
  const r = 4.2 * s;
  const P = (m: number, t: number): Pt => [cx + Math.cos(a + t) * m, cy + Math.sin(a + t) * m];
  const t1 = 2.7;
  const [ox, oy] = P(R, 0);
  const [ex, ey] = P(R, t1);
  const [ix, iy] = P(r, t1);
  const [jx, jy] = P(r, 0);
  const [hx, hy] = P((R + r) / 2, t1);
  return {
    body: `M${n1(ox)} ${n1(oy)}A${n1(R)} ${n1(R)} 0 0 1 ${n1(ex)} ${n1(ey)}L${n1(ix)} ${n1(iy)}A${n1(r)} ${n1(r)} 0 0 0 ${n1(jx)} ${n1(jy)}Z`,
    hole: ell(hx, hy, (R - r) / 2, 1.8 * s, a + t1),
    ridges: [0.6, 1.2, 1.8].map((t) => line([P(r + 0.8, t), P(R - 0.8, t)])).join(""),
  };
};
const f = farfalle(60, 46, -0.2, 1.6);
const p1 = penne(36, 74, -0.6, 1.45);
const p2 = penne(84, 74, 0.55, 1.45);
const c1 = coquille(58, 84, 0.5, 1.7);
const c2 = coquille(90, 100, 3.3, 1.3);
export function Pates({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="pates-a" c={["#f3d690", "#e8bf68", "#d3a14a"]} x2={0.6} y2={1} />
      </defs>
      <W d={f.body} f={url("pates-a")} o={0.93} />
      <W d={f.knot} f="#d09a42" o={0.7} />
      <W d={p1.body + p2.body} f={url("pates-a")} o={0.93} />
      <W d={p1.hole + p2.hole} f="#b8822e" o={0.75} />
      <W d={c1.body + c2.body} f={url("pates-a")} o={0.93} />
      <W d={c1.hole + c2.hole} f="#b8822e" o={0.7} />
      <Hi d="M40 38C46 35 52 37 54 41C50 39 46 39 40 42Z" o={0.6} />
      <Ink o={0.45} w={1}>
        <path d={f.pleats + p1.ridges + p2.ridges + c1.ridges + c2.ridges} />
      </Ink>
      <Ink o={0.55} w={1.1}>
        <path d={f.body + p1.body + p2.body + c1.body + c2.body} />
      </Ink>
    </Frame>
  );
}

// ---------- Riz ----------
const RICE = (() => {
  const r = rng(13);
  let g = "";
  let o = "";
  for (let i = 0; i < 80; i++) {
    const x = 24 + r() * 72;
    const top = 60 - 26 * Math.sqrt(Math.max(0, 1 - ((x - 60) / 40) ** 2));
    const y = top + 2 + r() * (60 - top);
    const p = ell(x, y, 2.8, 1.25, (r() - 0.5) * 2.4);
    g += p;
    if (i % 2) o += p;
  }
  return { g, o };
})();
export function Riz({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="riz-a" c={["#a9bac3", "#8499a5", "#677c88"]} x2={1} y2={0.4} />
      </defs>
      <W d={ell(60, 62, 44, 8)} f="#5f7380" o={0.7} />
      <W d="M18 62C20 42 40 32 60 32C80 32 100 42 102 62C88 68 32 68 18 62Z" f="#f8f4ea" o={0.96} />
      <W d="M80 38C94 46 100 54 101 62C94 64 86 66 78 66C88 58 88 48 80 38Z" f="#d8d0bd" o={0.5} soft />
      <path d={RICE.g} fill="#fffdf6" opacity={0.9} />
      <Ink o={0.35} w={0.6}>
        <path d={RICE.o} />
      </Ink>
      <W d="M14 62C16 86 34 101 60 101C86 101 104 86 106 62C92 69 28 69 14 62Z" f={url("riz-a")} o={0.92} />
      <W d="M86 70C98 66 102 66 105 64C104 80 94 94 76 99C90 90 92 80 86 70Z" f="#4f6270" o={0.4} />
      <Hi d="M24 72C28 84 36 92 46 96C38 90 32 82 28 72Z" o={0.55} />
      <W d="M44 100C44 104 50 106 60 106C70 106 76 104 76 100C70 101 50 101 44 100Z" f="#677c88" o={0.85} />
      <Ink o={0.5}>
        <path d="M14 62C28 69 92 69 106 62M20 76C34 82 86 82 100 76" />
      </Ink>
    </Frame>
  );
}

// ---------- Céréales (quinoa, semoule, boulgour) ----------
const GRAINS = (() => {
  const r = rng(31);
  let a = "";
  let b = "";
  let q = "";
  for (let i = 0; i < 170; i++) {
    const y = 58 + r() * 38;
    const hw = Math.min(48, (y - 54) * 1.25);
    const x = 60 + (r() * 2 - 1) * hw * 0.95;
    const p = ell(x, y, 1.6, 1.15, r() * 3);
    if (i % 3 === 0) q += p;
    if (i % 2) a += p;
    else b += p;
  }
  for (const [x, y] of [[12, 102], [22, 105], [100, 104], [108, 100], [86, 107], [36, 107]] as Pt[]) b += ell(x, y, 1.6, 1.15, x);
  return { a, b, q };
})();
export function Cereales({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <LG id="cereales-a" c={["#f0dcae", "#dfc388", "#bf9f62"]} />
      </defs>
      <W d="M10 97C20 74 40 54 60 52C80 54 100 74 110 97C96 102 24 102 10 97Z" f={url("cereales-a")} o={0.92} />
      <W d="M80 60C94 70 104 84 109 97C100 100 88 101 78 101C90 90 90 74 80 60Z" f="#a88a52" o={0.4} />
      <Hi d="M44 62C38 68 32 76 30 84C36 78 42 70 50 64Z" o={0.5} />
      <path d={GRAINS.a} fill="#f6e8c4" opacity={0.85} />
      <path d={GRAINS.b} fill="#c4a468" opacity={0.75} />
      <Ink o={0.3} w={0.5}>
        <path d={GRAINS.q} />
      </Ink>
    </Frame>
  );
}

// ---------- Pain ----------
const CRUMB = (() => {
  const r = rng(9);
  let d = "";
  for (let i = 0; i < 14; i++) d += ell(78 + r() * 22, 86 + r() * 14, 1 + r() * 1.6, 0.8 + r() * 1, r() * 3);
  return d;
})();
export function Pain({ className }: IllustrationProps) {
  return (
    <Frame className={className}>
      <defs>
        <RG id="pain-a" c={["#e4b06a", "#c88a44", "#94602e"]} cx={0.4} cy={0.35} r={0.8} />
      </defs>
      <W d="M12 66C12 46 34 32 58 32C84 32 104 46 104 64C104 76 96 84 80 86L38 86C22 85 12 78 12 66Z" f={url("pain-a")} o={0.93} />
      <W d="M90 42C102 52 106 66 100 76C94 84 84 86 74 86C90 78 98 62 90 42Z" f="#7a4a22" o={0.42} />
      <W d="M26 60C40 48 62 42 88 46C66 48 46 54 30 66Z" f="#f2d59c" o={0.92} />
      <W d={blob(36, 44, 9, 4, 1, 0.12, -0.4) + blob(70, 38, 8, 3.5, 2, 0.12, 0.1) + blob(56, 70, 10, 4, 3, 0.12, -0.1)} f="#f8f0e0" o={0.45} soft />
      <Ink o={0.55}>
        <path d="M27 60C40 49 62 43 88 46" />
        <path d="M12 66C12 78 22 85 38 86" />
      </Ink>
      <W d="M68 106C66 90 74 78 88 78C102 78 110 90 108 106Z" f="#a96e34" o={0.95} />
      <W d="M71.5 104C70 92 77 82 88 82C99 82 106 92 104.5 104Z" f="#f4e4c2" o={0.97} />
      <path d={CRUMB} fill="#d9bf8c" opacity={0.75} />
      <Ink o={0.55}>
        <path d="M68 106C66 90 74 78 88 78C102 78 110 90 108 106L68 106" />
      </Ink>
    </Frame>
  );
}
