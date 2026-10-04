// Briques communes des illustrations aquarelle : cadre SVG, lavis, traits d'encre,
// dégradés, et petits générateurs de formes organiques (feuilles, galets, ellipses).
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type IllustrationProps = { className?: string };

export const INK = "#4a3b2f";
export const HI = "#fffaf0";
export const LEAF_LIGHT = "#a9bf7f";
export const LEAF = "#7d9a5b";
export const LEAF_DARK = "#5f7d45";
export const BARK = "#7a5a3a";

export const url = (id: string) => `url(#${id})`;

/** Titre accessible transmis par <Illustration title> sans ajouter d'élément DOM. */
export const IllustrationTitle = createContext<string | undefined>(undefined);

export function Frame({ className, children }: { className?: string; children: ReactNode }) {
  const title = useContext(IllustrationTitle);
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg viewBox="0 0 120 120" className={className} {...a11y}>
      <g filter="url(#wc-grain)">{children}</g>
    </svg>
  );
}

/** Lavis : forme remplie, bords aquarelle. */
export function W({ d, f, o = 0.8, soft }: { d: string; f: string; o?: number; soft?: boolean }) {
  return <path d={d} fill={f} opacity={o} filter={soft ? "url(#wc-soft)" : "url(#wc-wash)"} />;
}

/** Reflet clair, lavis doux. */
export function Hi({ d, o = 0.5 }: { d: string; o?: number }) {
  return <path d={d} fill={HI} opacity={o} filter="url(#wc-soft)" />;
}

/** Groupe de traits à l'encre (ou de tiges colorées si `c` est fourni). */
export function Ink({ children, o = 0.6, w = 1.2, c = INK }: { children: ReactNode; o?: number; w?: number; c?: string }) {
  return (
    <g fill="none" stroke={c} strokeOpacity={o} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" filter="url(#wc-ink)">
      {children}
    </g>
  );
}

type Stop = string | [string, number];
const stops = (c: Stop[]) =>
  c.map((s, i) => {
    const [color, offset] = typeof s === "string" ? [s, i / Math.max(1, c.length - 1)] : s;
    return <stop key={i} offset={offset} stopColor={color} />;
  });

export function LG({ id, c, x1 = 0, y1 = 0, x2 = 0, y2 = 1 }: { id: string; c: Stop[]; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops(c)}
    </linearGradient>
  );
}

export function RG({ id, c, cx = 0.38, cy = 0.35, r = 0.75 }: { id: string; c: Stop[]; cx?: number; cy?: number; r?: number }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r}>
      {stops(c)}
    </radialGradient>
  );
}

// ---------- Géométrie ----------
type Pt = [number, number];
const f1 = (n: number) => String(Math.round(n * 10) / 10);
const pt = (p: Pt) => `${f1(p[0])} ${f1(p[1])}`;

/** Courbe fermée lisse passant par les points (Catmull-Rom → Bézier). */
export function smooth(pts: Pt[]): string {
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n] as Pt;
  let d = `M${pt(at(0))}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return `${d}Z`;
}

/** Galet organique (jamais un cercle parfait). `k` varie la forme. */
export function blob(cx: number, cy: number, rx: number, ry: number, k = 0, wob = 0.06, rot = 0): string {
  const n = 9;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const f = 1 + wob * Math.sin(3 * t + k) + wob * 0.6 * Math.cos(5 * t + 2 * k);
    const x = Math.cos(t) * rx * f;
    const y = Math.sin(t) * ry * f;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return smooth(pts);
}

/** Forme polaire lisse : r(θ). */
export function polar(cx: number, cy: number, r: (t: number) => number, n = 40): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * r(t), cy + Math.sin(t) * r(t)]);
  }
  return smooth(pts);
}

/** Feuille en amande de la base (bx,by) à la pointe (tx,ty). `bend` courbe la feuille, `spade` l'élargit à la base. */
export function leaf(bx: number, by: number, tx: number, ty: number, w: number, bend = 0, spade = false): string {
  const dx = tx - bx;
  const dy = ty - by;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  const [a, b, wa, wb] = spade ? [0.08, 0.66, 1.65, 0.7] : [0.25, 0.75, 1.3, 0.9];
  const P = (t: number, m: number): Pt => [bx + ux * L * t + nx * (m + bend), by + uy * L * t + ny * (m + bend)];
  return `M${f1(bx)} ${f1(by)}C${pt(P(a, w * wa))} ${pt(P(b, w * wb))} ${f1(tx)} ${f1(ty)}C${pt(P(b, -w * wb))} ${pt(P(a, -w * wa))} ${f1(bx)} ${f1(by)}Z`;
}

/** Nervures d'une feuille : nervure centrale + nervures secondaires. */
export function veins(bx: number, by: number, tx: number, ty: number, n: number, w: number): string {
  const dx = tx - bx;
  const dy = ty - by;
  const nx = -dy / (Math.hypot(dx, dy) || 1);
  const ny = dx / (Math.hypot(dx, dy) || 1);
  let d = `M${f1(bx)} ${f1(by)}L${f1(bx + dx * 0.92)} ${f1(by + dy * 0.92)}`;
  for (let i = 1; i <= n; i++) {
    const t = 0.12 + (i / (n + 1)) * 0.7;
    const x = bx + dx * t;
    const y = by + dy * t;
    for (const s of [1, -1]) {
      d += `M${f1(x)} ${f1(y)}Q${f1(x + dx * 0.08 + nx * w * 0.4 * s)} ${f1(y + dy * 0.08 + ny * w * 0.4 * s)} ${f1(x + dx * 0.16 + nx * w * 0.75 * s)} ${f1(y + dy * 0.16 + ny * w * 0.75 * s)}`;
    }
  }
  return d;
}

/** Folioles alternées le long d'une tige (fanes, persil…). */
export function leaflets(x1: number, y1: number, x2: number, y2: number, n: number, len: number, w: number, ang = 0.75): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const base = Math.atan2(dy, dx);
  let d = "";
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    const a = base + (i % 2 ? ang : -ang);
    const l = len * (1 - t * 0.35);
    d += leaf(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, w * (1 - t * 0.3));
  }
  return d + leaf(x2, y2, x2 + Math.cos(base) * len * 0.8, y2 + Math.sin(base) * len * 0.8, w * 0.8);
}

/** Ellipse inclinée (rot en radians) sous forme de chemin. */
export function ell(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const a: Pt = [cx - rx * c, cy - rx * s];
  const b: Pt = [cx + rx * c, cy + rx * s];
  const deg = f1((rot * 180) / Math.PI);
  return `M${pt(a)}A${f1(rx)} ${f1(ry)} ${deg} 1 0 ${pt(b)}A${f1(rx)} ${f1(ry)} ${deg} 1 0 ${pt(a)}Z`;
}

/** Générateur pseudo-aléatoire déterministe (rendu identique serveur / client). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
