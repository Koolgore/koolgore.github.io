// Basic monoline letterforms made of straight lines and elliptical arcs, and a
// light-pen that writes them: a point source moving along each stroke with a
// human velocity profile (two-thirds power law: slower in tight curves, easing
// in and out at stroke ends), hand wobble, and pen lifts between strokes.
// Output is a list of exposure "splats" (position, weight, time) for the film.
import { mulberry32, noise1 } from './noise.js';

// x-height = 1, baseline = 0. Angles in degrees, swept from a0 to a1.
const L = (x0, y0, x1, y1) => ({ t: 'L', x0, y0, x1, y1 });
const E = (cx, cy, rx, ry, a0, a1) => ({ t: 'E', cx, cy, rx, ry, a0, a1 });
const D = (x, y) => ({ t: 'D', x, y });
const bowl = (cx, a0, a1, rx = 0.42) => E(cx, 0.5, rx, 0.5, a0, a1);

export const GLYPHS = {
  a: { w: 1.0, s: [[bowl(0.46, 25, 385)], [L(0.88, 1.0, 0.88, 0)]] },
  b: { w: 1.0, s: [[L(0.08, 1.75, 0.08, 0)], [bowl(0.5, 180, 540)]] },
  c: { w: 0.9, s: [[bowl(0.5, 50, 310)]] },
  d: { w: 1.0, s: [[bowl(0.46, 0, 360)], [L(0.88, 1.75, 0.88, 0)]] },
  e: { w: 0.98, s: [[L(0.08, 0.5, 0.92, 0.5), bowl(0.5, 0, 318)]] },
  f: { w: 0.68, s: [[E(0.62, 1.38, 0.27, 0.32, 50, 180), L(0.35, 1.38, 0.35, 0)], [L(0.1, 1.0, 0.66, 1.0)]] },
  g: { w: 1.0, s: [[bowl(0.46, 0, 360)], [L(0.88, 1.0, 0.88, -0.3), E(0.5, -0.3, 0.38, 0.32, 0, -160)]] },
  h: { w: 0.92, s: [[L(0.08, 1.75, 0.08, 0)], [E(0.45, 0.55, 0.37, 0.42, 180, 0), L(0.82, 0.55, 0.82, 0)]] },
  i: { w: 0.26, s: [[L(0.12, 1.0, 0.12, 0)], [D(0.12, 1.42)]] },
  j: { w: 0.42, s: [[L(0.3, 1.0, 0.3, -0.35), E(0.05, -0.35, 0.25, 0.28, 0, -170)], [D(0.3, 1.42)]] },
  k: { w: 0.82, s: [[L(0.08, 1.75, 0.08, 0)], [L(0.72, 1.0, 0.08, 0.38)], [L(0.3, 0.58, 0.78, 0)]] },
  l: { w: 0.26, s: [[L(0.12, 1.75, 0.12, 0)]] },
  m: { w: 1.26, s: [[L(0.08, 1.0, 0.08, 0)], [E(0.35, 0.58, 0.27, 0.38, 180, 0), L(0.62, 0.58, 0.62, 0)], [E(0.89, 0.58, 0.27, 0.38, 180, 0), L(1.16, 0.58, 1.16, 0)]] },
  n: { w: 0.92, s: [[L(0.08, 1.0, 0.08, 0)], [E(0.45, 0.55, 0.37, 0.42, 180, 0), L(0.82, 0.55, 0.82, 0)]] },
  o: { w: 1.0, s: [[E(0.5, 0.5, 0.45, 0.5, 90, 450)]] },
  p: { w: 1.0, s: [[L(0.08, 1.0, 0.08, -0.65)], [bowl(0.5, 180, 540)]] },
  q: { w: 1.0, s: [[bowl(0.46, 0, 360)], [L(0.88, 1.0, 0.88, -0.65)]] },
  r: { w: 0.62, s: [[L(0.08, 1.0, 0.08, 0)], [E(0.42, 0.55, 0.34, 0.4, 180, 55)]] },
  s: { w: 0.86, s: [[E(0.47, 0.745, 0.32, 0.245, 30, 270), E(0.47, 0.255, 0.34, 0.255, 90, -160)]] },
  t: { w: 0.74, s: [[L(0.38, 1.45, 0.38, 0.25), E(0.62, 0.25, 0.24, 0.25, 180, 300)], [L(0.08, 1.0, 0.72, 1.0)]] },
  u: { w: 0.92, s: [[L(0.08, 1.0, 0.08, 0.45), E(0.45, 0.45, 0.37, 0.45, 180, 360)], [L(0.82, 1.0, 0.82, 0)]] },
  v: { w: 0.9, s: [[L(0.04, 1.0, 0.45, 0), L(0.45, 0, 0.86, 1.0)]] },
  w: { w: 1.2, s: [[L(0.04, 1.0, 0.3, 0), L(0.3, 0, 0.6, 0.72), L(0.6, 0.72, 0.9, 0), L(0.9, 0, 1.16, 1.0)]] },
  x: { w: 0.86, s: [[L(0.06, 1.0, 0.8, 0)], [L(0.8, 1.0, 0.06, 0)]] },
  y: { w: 0.94, s: [[L(0.04, 1.0, 0.47, 0.08)], [L(0.9, 1.0, 0.32, -0.65)]] },
  z: { w: 0.88, s: [[L(0.08, 1.0, 0.8, 1.0), L(0.8, 1.0, 0.08, 0), L(0.08, 0, 0.82, 0)]] },
  "'": { w: 0.25, s: [[L(0.14, 1.75, 0.08, 1.35)]] },
  I: { w: 0.32, s: [[L(0.15, 1.6, 0.15, 0)]] },
  T: { w: 1.05, s: [[L(0, 1.6, 1.05, 1.6)], [L(0.52, 1.6, 0.52, 0)]] },
};
const glyphFor = (ch) => GLYPHS[ch] || GLYPHS[ch.toLowerCase()] || null;

// sample one primitive into points (glyph units)
function samplePrim(p, out) {
  if (p.t === 'L') {
    const n = Math.max(2, Math.ceil(Math.hypot(p.x1 - p.x0, p.y1 - p.y0) / 0.01));
    for (let i = 0; i <= n; i++) out.push([p.x0 + (p.x1 - p.x0) * i / n, p.y0 + (p.y1 - p.y0) * i / n]);
  } else if (p.t === 'E') {
    const sweep = (p.a1 - p.a0) * Math.PI / 180;
    const n = Math.max(4, Math.ceil(Math.abs(sweep) * Math.max(p.rx, p.ry) / 0.01));
    for (let i = 0; i <= n; i++) {
      const a = p.a0 * Math.PI / 180 + sweep * i / n;
      out.push([p.cx + p.rx * Math.cos(a), p.cy + p.ry * Math.sin(a)]);
    }
  }
}

// Lay out rows of words into the film square (px, y up) and write them with light.
// words: [{text, row, onset}] ; returns {splats: Float32Array(x,y,w,tau), strokes, sigma, xh}
export function writeWithLight(words, { size = 1024, seed = 1 } = {}) {
  const rng = mulberry32(Math.floor(seed * 1e6) ^ 0x5bd1e995);
  const rows = [];
  for (const w of words) (rows[w.row] ||= []).push(w);
  const LETTER_GAP = 0.17, SPACE = 0.62, SLANT = 0.07;
  const wordWidth = (w) => [...w.text].reduce((a, ch, i) => a + ((glyphFor(ch) || { w: 0.5 }).w) + (i ? LETTER_GAP : 0), 0);
  const rowWidth = (r) => r.reduce((a, w, i) => a + wordWidth(w) + (i ? SPACE : 0), 0);
  const pitch = 2.55;
  const xh = Math.min(size * 0.82 / Math.max(...rows.map(rowWidth)), size * 0.80 / (rows.length * pitch + 0.4));
  const blockH = (rows.length - 1) * pitch * xh;
  const topBase = size / 2 + blockH / 2 - 0.45 * xh;

  // ---- place every stroke in px, word by word
  const wordStrokes = words.map(() => []);
  rows.forEach((row, r) => {
    const rw = rowWidth(row) * xh;
    let x = (size - rw) / 2 + (rng() - 0.5) * 0.35 * xh;
    const base = topBase - r * pitch * xh + (rng() - 0.5) * 0.12 * xh;
    const tilt = (rng() - 0.5) * 0.025;
    row.forEach((w) => {
      const wi = words.indexOf(w);
      for (const ch of w.text) {
        const g = glyphFor(ch);
        if (!g) { x += 0.5 * xh; continue; }
        // a little hand variation per letter
        const sc = 1 + (rng() - 0.5) * 0.07, rot = (rng() - 0.5) * 0.05, dy = (rng() - 0.5) * 0.05;
        const cr = Math.cos(rot), sr = Math.sin(rot);
        for (const st of g.s) {
          if (st[0].t === 'D') {
            const p = st[0];
            wordStrokes[wi].push({ dot: true, pts: [[x + (p.x + SLANT * p.y) * xh, base + (p.y + dy) * xh + (x - size / 2) * tilt]] });
            continue;
          }
          const pts = [];
          for (const prim of st) samplePrim(prim, pts);
          wordStrokes[wi].push({
            pts: pts.map(([gx, gy]) => {
              const lx = (gx - g.w / 2) * sc, ly = (gy - 0.5) * sc;
              const rx = lx * cr - ly * sr + g.w / 2, ry = lx * sr + ly * cr + 0.5 + dy;
              const px = x + (rx + SLANT * ry) * xh;
              return [px, base + ry * xh + (px - size / 2) * tilt];
            }),
          });
        }
        x += (g.w + LETTER_GAP) * xh;
      }
      x += (SPACE - LETTER_GAP) * xh;
    });
  });

  // ---- resample, wobble, velocity profile
  const DS = 0.6;                         // px between samples
  const sigma = 0.030 * xh;               // light-spot radius on the film
  const prepared = wordStrokes.map((strokes) => strokes.map((st) => {
    if (st.dot) return st;
    const src = st.pts;
    const res = [src[0]];
    let carry = 0;
    for (let i = 1; i < src.length; i++) {
      const [ax, ay] = src[i - 1], [bx, by] = src[i];
      const seg = Math.hypot(bx - ax, by - ay);
      let d = DS - carry;
      while (d <= seg) { res.push([ax + (bx - ax) * d / seg, ay + (by - ay) * d / seg]); d += DS; }
      carry = seg - (d - DS);
    }
    const n = res.length;
    // hand wobble along the normal: slow drift + faint tremor
    const ph = rng() * 100;
    const out = res.map(([x, y], i) => {
      const a = res[Math.max(0, i - 2)], b = res[Math.min(n - 1, i + 2)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const s = i * DS / xh;
      const off = (noise1(s * 2.1 + ph, 31) * 0.026 + noise1(s * 11 + ph, 32) * 0.005) * xh;
      return [x - ty * off, y + tx * off];
    });
    // curvature -> speed (v ∝ R^(1/3)), eased at both ends where the hand starts and stops
    const k = Math.max(2, Math.round(0.05 * xh / DS));
    const ang = (i) => { const a = out[Math.max(0, i - 1)], b = out[Math.min(n - 1, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const S = (n - 1) * DS;
    const v = out.map((_, i) => {
      let da = ang(Math.min(n - 1, i + k)) - ang(Math.max(0, i - k));
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const kap = Math.abs(da) / (2 * k * DS) + 1 / (3.0 * xh);
      const s = i * DS;
      const ease = 0.55 + 0.45 * smooth(0, 0.22 * xh, s) * smooth(0, 0.16 * xh, S - s);
      return Math.pow(1 / kap, 1 / 3) * ease;
    });
    return { pts: out, v, S };
  }));

  // ---- timing: each word is written across its sung duration
  const splats = [];
  const strokes = [];          // for the pen tip: {t0, t1, pts, taus}
  let vrefAll = [];
  const plans = prepared.map((strokesW, wi) => {
    const w = words[wi];
    const next = words.slice(wi + 1).find((o) => o.onset > w.onset);
    const end = Math.min(next ? next.onset - 0.05 : w.onset + 1.3, w.onset + 1.5);
    const window = Math.max(0.2, end - w.onset);
    const lines = strokesW.filter((s) => !s.dot).length;
    const ndots = strokesW.length - lines;
    // pen lifts, light on/off dwells and held dots get at most ~40% of the word's time
    const want = Math.max(0, strokesW.length - 1) * 0.05 + lines * 0.018 + ndots * 0.07;
    const k = Math.min(1, (0.4 * window) / Math.max(want, 1e-6));
    const timing = { lift: 0.05 * k, on: 0.012 * k, off: 0.006 * k, dot: 0.07 * k };
    let nat = 0;
    for (const st of strokesW) if (!st.dot) for (let i = 1; i < st.pts.length; i++) nat += DS / st.v[i];
    const f = (window - want * k) / nat;   // seconds per natural unit
    return { strokesW, f, t0: w.onset, timing };
  });
  for (const pl of plans) for (const st of pl.strokesW) if (!st.dot) for (let i = 1; i < st.pts.length; i++) vrefAll.push(st.v[i] / pl.f);
  vrefAll.sort((a, b) => a - b);
  const vref = vrefAll[Math.floor(vrefAll.length / 2)] || 300;
  const norm = 2.0 / (Math.sqrt(2 * Math.PI) * sigma);   // nominal stroke core ≈ 2.4 exposure units

  for (const pl of plans) {
    let t = pl.t0;
    const vs = [];
    for (const st of pl.strokesW) if (!st.dot) for (let i = 1; i < st.pts.length; i++) vs.push(st.v[i] / pl.f);
    vs.sort((a, b) => a - b);
    const vword = vs[Math.floor(vs.length / 2)] || vref;
    const vr = Math.sqrt(vref * vword);          // part of the speed difference shows as brightness
    pl.strokesW.forEach((st, si) => {
      const T = pl.timing;
      if (si) t += T.lift;
      if (st.dot) {
        const [x, y] = st.pts[0];
        splats.push(x, y, 5.0, t + T.dot * 0.5);       // a held dot burns in hot
        strokes.push({ t0: t, t1: t + T.dot, pts: [[x, y]], taus: [t] });
        t += T.dot;
        return;
      }
      // the light clicks on a beat before the hand moves: a hot dwell at the start
      const t0 = t;
      splats.push(st.pts[0][0], st.pts[0][1], 0.7, t + T.on * 0.5);
      t += T.on;
      const taus = [t];
      for (let i = 1; i < st.pts.length; i++) {
        const dt = DS / st.v[i] * pl.f;
        const vel = DS / dt;
        t += dt;
        taus.push(t);
        const flick = 1 + 0.04 * Math.sin(t * 47.0) * Math.sin(t * 13.0);
        splats.push(st.pts[i][0], st.pts[i][1], DS * Math.min(4, Math.max(0.35, vr / vel)) * norm * flick, t);
      }
      // and lingers a moment at the end before it's switched off
      const lp = st.pts[st.pts.length - 1];
      splats.push(lp[0], lp[1], 0.45, t + T.off * 0.5);
      t += T.off;
      strokes.push({ t0, t1: t, pts: st.pts, taus: [t0, ...taus.slice(1)], });
    });
  }
  return { splats: new Float32Array(splats), strokes, sigma, xh, size };
}

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// where the light pen is at time t (px), or null when it's off
export function penAt(strokes, t) {
  for (const st of strokes) {
    if (t < st.t0 - 0.02 || t > st.t1 + 0.02) continue;
    const ramp = smooth(st.t0 - 0.02, st.t0 + 0.015, t) * (1 - smooth(st.t1 - 0.01, st.t1 + 0.02, t));
    const tt = Math.min(Math.max(t, st.t0), st.t1);
    let lo = 0, hi = st.taus.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (st.taus[m] <= tt) lo = m; else hi = m; }
    const a = st.pts[lo], b = st.pts[hi] || a;
    const span = (st.taus[hi] - st.taus[lo]) || 1;
    const u = Math.min(1, Math.max(0, (tt - st.taus[lo]) / span));
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, I: ramp };
  }
  return null;
}
