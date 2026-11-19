// Builds a signed-distance field of a polaroid's words, plus a per-pixel
// "nearest word" index, so the shader can grow every word out of its own
// stroke centres in time with the vocal.
import * as THREE from 'three';

export const FIELD = 1024;      // texels across the 7.9 cm image area
export const SDF_RANGE = 64;    // px, distances are clamped to ±this

let fontReady = null;
export function loadFont(url) {
  if (!fontReady) {
    const ff = new FontFace('PolaroidHand', `url(${url})`, { style: 'italic', weight: '600' });
    fontReady = ff.load().then((f) => { document.fonts.add(f); return f; });
  }
  return fontReady;
}

const INF = 1e20;
function edt1d(grid, offset, stride, length, f, v, z) {
  // Felzenszwalb & Huttenlocher squared EDT on one row/column
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    do {
      const r = v[k];
      s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    grid[offset + q * stride] = f[r] + (q - r) * (q - r);
  }
}
function edt(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), v = new Uint16Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

// words: [{text,row}], returns {texture, boxes}
export function buildTextField(words, opts = {}) {
  const S = FIELD;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rows = [];
  for (const w of words) (rows[w.row] ||= []).push(w);

  // size the type to fit the square with margins
  const maxW = S * 0.80, maxH = S * 0.74;
  let fs = 150;
  const space = () => fs * 0.26;
  const measureRow = (row) => row.reduce((a, w, i) => {
    ctx.font = `italic 600 ${fs}px PolaroidHand`;
    return a + ctx.measureText(w.text).width + (i ? space() : 0);
  }, 0);
  for (; fs > 40; fs -= 2) {
    ctx.font = `italic 600 ${fs}px PolaroidHand`;
    const widest = Math.max(...rows.map(measureRow));
    const lineH = fs * 1.02;
    if (widest <= maxW && lineH * rows.length <= maxH) break;
  }
  const lineH = fs * 1.02;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 600 ${fs}px PolaroidHand`;
  const blockH = lineH * rows.length;
  const top = (S - blockH) / 2 + fs * 0.06;
  const boxes = [];
  rows.forEach((row, r) => {
    const rowW = measureRow(row);
    // slightly ragged, hand-placed feel
    let x = (S - rowW) / 2 + (opts.jitter ? (opts.jitter[r] || 0) * fs : 0);
    const base = top + lineH * (r + 0.78);
    row.forEach((w) => {
      const m = ctx.measureText(w.text);
      ctx.fillText(w.text, x, base);
      boxes.push({
        x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight,
        y0: base - m.actualBoundingBoxAscent, y1: base + m.actualBoundingBoxDescent,
      });
      x += m.width + space();
    });
  });

  // TinySDF style subpixel distance transform
  const img = ctx.getImageData(0, 0, S, S).data;
  const outer = new Float64Array(S * S), inner = new Float64Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const a = img[i * 4] / 255;
    if (a >= 0.999) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0.001) { outer[i] = INF; inner[i] = 0; }
    else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
  }
  edt(outer, S, S); edt(inner, S, S);

  const data = new Float32Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    // texture row 0 is the bottom of the image (uv.y up)
    const ty = S - 1 - y;
    for (let x = 0; x < S; x++) {
      const i = y * S + x, o = (ty * S + x) * 4;
      const d = Math.sqrt(inner[i]) - Math.sqrt(outer[i]); // + inside
      data[o] = Math.max(-SDF_RANGE, Math.min(SDF_RANGE, d));
      // two nearest word boxes, so glows can cross-fade between words
      let best = 0, bd = INF, second = 0, sd2 = INF;
      for (let k = 0; k < boxes.length; k++) {
        const b = boxes[k];
        const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1);
        const dd = Math.sqrt(dx * dx + dy * dy * 1.6);
        if (dd < bd) { second = best; sd2 = bd; bd = dd; best = k; }
        else if (dd < sd2) { sd2 = dd; second = k; }
      }
      data[o + 1] = best;
      data[o + 2] = second;
      data[o + 3] = boxes.length > 1 ? 0.5 * Math.exp(-(sd2 - bd) / 14) : 0;
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { texture: tex, boxes, fontSize: fs };
}

let blank = null;
export function blankField() {
  if (blank) return blank;
  const d = new Float32Array(4 * 4 * 4);
  for (let i = 0; i < 16; i++) { d[i * 4] = -SDF_RANGE; }
  blank = new THREE.DataTexture(d, 4, 4, THREE.RGBAFormat, THREE.FloatType);
  blank.needsUpdate = true;
  return blank;
}
