// Briques de dessin des illustrations « Pastille » : aplats nets, une ombre plate plus foncée, aucun filtre.
// Chaque dessin est rendu deux fois dans l'autocollant : en couleurs, et en silhouette (mode `Cut`) pour la découpe
// crème et son ombre décalée. En silhouette, les primitives perdent leurs couleurs (elles héritent du groupe) et
// les détails intérieurs (`In`) disparaissent : la découpe ne garde que le contour.
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/** Un dessin : éléments SVG dans une boîte 120 × 120, posé sur la ligne de sol y = BASE, centré en x = 60. */
export type Draw = () => ReactNode;
export const BASE = 104;

export const CREAM = "#fffaf1";
export const LEAF = "#6fa148";
export const LEAF_DARK = "#4f8a35";
export const LEAF_LIGHT = "#94c063";
export const STEM = "#83703e";

const CutMode = createContext(false);
const r1 = (n: number) => Math.round(n * 10) / 10;
export const Cut = ({ children }: { children: ReactNode }) => <CutMode.Provider value>{children}</CutMode.Provider>;

/** Aplat. */
export function P({ d, f, o }: { d: string; f: string; o?: number }) {
  return useContext(CutMode) ? <path d={d} /> : <path d={d} fill={f} opacity={o} />;
}

/** Ellipse (rotation `a` en degrés). */
export function E({ x: x0, y: y0, rx: rx0, ry: ry0, f, a, o }: { x: number; y: number; rx: number; ry: number; f: string; a?: number; o?: number }) {
  const [x, y, rx, ry] = [r1(x0), r1(y0), r1(rx0), r1(ry0)];
  const t = a ? `rotate(${r1(a)} ${x} ${y})` : undefined;
  return useContext(CutMode) ? <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={t} /> : <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={f} transform={t} opacity={o} />;
}

export function C({ x: x0, y: y0, r: r0, f, o }: { x: number; y: number; r: number; f: string; o?: number }) {
  const [x, y, r] = [r1(x0), r1(y0), r1(r0)];
  return useContext(CutMode) ? <circle cx={x} cy={y} r={r} /> : <circle cx={x} cy={y} r={r} fill={f} opacity={o} />;
}

/** Trait (tige, nervure, vrille) : bouts ronds. En silhouette, il s'épaissit comme le reste de la découpe. */
export function L({ d, c, w = 2 }: { d: string; c: string; w?: number }) {
  return useContext(CutMode) ? <path d={d} fill="none" strokeWidth={w + 8} /> : <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

/** Détails intérieurs (ombres, reflets, graines) : absents de la silhouette de découpe. */
export function In({ children }: { children: ReactNode }) {
  return useContext(CutMode) ? null : <>{children}</>;
}

export const G = ({ t, children }: { t: string; children: ReactNode }) => <g transform={t}>{children}</g>;

// ---------- Géométrie ----------
export type Pt = [number, number];
export const f1 = (n: number) => String(Math.round(n * 10) / 10);
const pt = (p: Pt) => `${f1(p[0])} ${f1(p[1])}`;

/** Plusieurs petits disques en un seul chemin (graines, grains, pépins). */
export const dots = (pts: Pt[], r: number) => pts.map(([x, y]) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`).join("");
/** Disques de rayons différents [x, y, r] en un seul chemin. */
export const discs = (ds: [number, number, number][]) => ds.map(([x, y, r]) => dots([[x, y]], r)).join("");

/** Courbe fermée lisse passant par les points (Catmull-Rom → Bézier). */
export function smooth(pts: Pt[]): string {
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n] as Pt;
  let d = `M${pt(at(0))}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return `${d}Z`;
}

/** Forme polaire lisse r(θ) (choux, potirons côtelés, fleurs). */
export function polar(cx: number, cy: number, r: (t: number) => number, n = 24, sy = 1): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * r(t), cy + Math.sin(t) * r(t) * sy]);
  }
  return smooth(pts);
}

/** Feuille en amande de la base (bx,by) à la pointe (tx,ty), demi-largeur w, `bend` la courbe. */
export function leaf(bx: number, by: number, tx: number, ty: number, w: number, bend = 0): string {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const [ux, uy, nx, ny] = [dx / len, dy / len, -dy / len, dx / len];
  const at = (t: number, m: number): Pt => [bx + ux * len * t + nx * (m + bend), by + uy * len * t + ny * (m + bend)];
  return `M${f1(bx)} ${f1(by)}C${pt(at(0.25, w * 1.3))} ${pt(at(0.75, w * 0.9))} ${f1(tx)} ${f1(ty)}C${pt(at(0.75, -w * 0.9))} ${pt(at(0.25, -w * 1.3))} ${f1(bx)} ${f1(by)}Z`;
}

/** Moitié d'une feuille (côté ombré), même géométrie que `leaf`. */
export function halfLeaf(bx: number, by: number, tx: number, ty: number, w: number, bend = 0): string {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const [ux, uy, nx, ny] = [dx / len, dy / len, -dy / len, dx / len];
  const at = (t: number, m: number): Pt => [bx + ux * len * t + nx * (m + bend), by + uy * len * t + ny * (m + bend)];
  return `M${f1(bx)} ${f1(by)}C${pt(at(0.25, -w * 1.3))} ${pt(at(0.75, -w * 0.9))} ${f1(tx)} ${f1(ty)}Q${pt(at(0.5, bend * 0.5))} ${f1(bx)} ${f1(by)}Z`;
}

/** Losange isométrique (dés de courge, tofu) : faces dessus / gauche / droite. */
export function cube(x: number, y: number, s: number, h = s): { top: string; left: string; right: string } {
  const a = s;
  const b = s / 2;
  return {
    top: `M${f1(x)} ${f1(y - b)}l${f1(a)} ${f1(b)}l${f1(-a)} ${f1(b)}l${f1(-a)} ${f1(-b)}Z`,
    left: `M${f1(x - a)} ${f1(y)}l${f1(a)} ${f1(b)}v${f1(h)}l${f1(-a)} ${f1(-b)}Z`,
    right: `M${f1(x)} ${f1(y + b)}l${f1(a)} ${f1(-b)}v${f1(h)}l${f1(-a)} ${f1(b)}Z`,
  };
}

/** Racine (carotte, panais) : bout arrondi en A, pointe en B. `shade` donne la bande ombrée du côté gauche. */
export function root(ax: number, ay: number, bx: number, by: number, w: number, shade = false): string {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const [ux, uy, nx, ny] = [dx / len, dy / len, -dy / len, dx / len];
  const p = (t: number, m: number): Pt => [ax + ux * len * t + nx * m, ay + uy * len * t + ny * m];
  const B: Pt = [bx, by];
  if (shade) return `M${pt(p(0, -w))}C${pt(p(0.4, -w * 1.05))} ${pt(p(0.85, -w * 0.35))} ${pt(B)}C${pt(p(0.8, -w * 0.05))} ${pt(p(0.4, -w * 0.45))} ${pt(p(0, -w * 0.5))}Z`;
  const cap = (q: Pt): Pt => [q[0] - ux * w * 1.33, q[1] - uy * w * 1.33];
  const r0 = p(0, w);
  const l0 = p(0, -w);
  return `M${pt(r0)}C${pt(p(0.4, w * 1.05))} ${pt(p(0.85, w * 0.35))} ${pt(B)}C${pt(p(0.85, -w * 0.35))} ${pt(p(0.4, -w * 1.05))} ${pt(l0)}C${pt(cap(l0))} ${pt(cap(r0))} ${pt(r0)}Z`;
}

/** Point le long de A→B (t de 0 à 1), décalé de m perpendiculairement. */
export function along(ax: number, ay: number, bx: number, by: number, t: number, m = 0): Pt {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return [ax + dx * t - (dy / len) * m, ay + dy * t + (dx / len) * m];
}

/** Petits traits en travers d'une racine (cernes), du côté droit. */
export function rings(ax: number, ay: number, bx: number, by: number, w: number, ts: number[]): string {
  return ts
    .map((t) => {
      const a = along(ax, ay, bx, by, t, w * (1 - t) * 0.95);
      const b = along(ax, ay, bx, by, t + 0.03, w * (1 - t) * 0.3);
      return `M${pt(a)}L${pt(b)}`;
    })
    .join("");
}

/** Tas (lentilles, semoule) : dôme à bord bosselé posé sur y = base. */
export function heap(cx: number, base: number, rx: number, ry: number, n = 14, bump = 2): string {
  const pts: Pt[] = [[cx + rx, base], [cx, base + 3], [cx - rx, base]];
  for (let i = 1; i < n; i++) {
    const t = Math.PI - (i / n) * Math.PI;
    const k = i % 2 ? bump : -bump * 0.4;
    pts.push([cx + Math.cos(t) * (rx + k * 0.5), base - Math.sin(t) * (ry + k)]);
  }
  return smooth(pts);
}
