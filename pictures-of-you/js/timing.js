// Timeline, in seconds of SONG time (album version, 7:28 / 448 s).
//
// Line starts come from community-synced timestamps; four independent syncs
// agree within ~0.05 s and they sit on a steady 86.13 BPM grid at exactly
// two bars per line. Word onsets inside a line are spread by syllable across
// the sung span of each line. If anything feels early/late, nudge LINE starts
// here or use the "offset" control in the player.

export const BPM = 86.13;
export const BEAT = 60 / BPM;          // 0.6966 s
export const BAR = BEAT * 4;           // 2.786 s

export const VIDEO_START = 111.20;     // song time at video t = 0
export const VIDEO_END = 155.60;       // song time at the last frame
export const FADE_IN = [111.20, 112.20];
export const FADE_OUT = [149.80, 154.66];

// Each print holds one sung line. Its words come from js/lyrics.local.js
// (rows of [word, syllables]; see js/lyrics.example.js). `segments` maps word
// ranges to sung timestamps.
export const SEGMENTS = [
  [{ from: 0, to: 10, t: 112.87, span: 4.25 }],
  [{ from: 0, to: 7, t: 118.43, span: 3.70 }],
  [{ from: 0, to: 10, t: 123.90, span: 4.25 }],
  [{ from: 0, to: 7, t: 129.57, span: 3.85 }, { from: 7, to: 12, t: 134.15, span: 2.05 }],
];

export async function loadPolaroids() {
  let mod;
  try { mod = await import('./lyrics.local.js'); } catch { mod = await import('./lyrics.example.js'); }
  return mod.LYRICS.map((rows, i) => ({ rows, segments: SEGMENTS[i] }));
}

// Burn choreography (song time). `ign` = ignition points in polaroid-local cm
// (x right, y up the photo; card spans x ±4.4, y ±5.35) with start time and
// spread speed in cm/s.
export const BURNS = [
  { ign: [[-4.1, 5.0, 116.90, 4.6]] },
  { ign: [[-1.2, 5.3, 122.40, 4.6]] },
  { ign: [[-4.2, 4.9, 127.90, 4.6]] },
  { ign: [[-4.3, -5.0, 137.45, 2.1], [4.3, -1.5, 137.95, 1.9], [1.0, 5.3, 139.30, 2.2]] },
];

export const FLOURISH = 137.94;         // downbeat where the interlude opens

// Flatten the word list for each polaroid and compute onset times.
export function wordsFor(p) {
  const words = [];
  p.rows.forEach((row, r) => row.forEach(([w, syl]) => words.push({ text: w, syl, row: r })));
  for (const seg of p.segments) {
    const ws = words.slice(seg.from, seg.to);
    const total = ws.reduce((a, w) => a + w.syl, 0);
    const step = total > 1 ? seg.span / (total - 1) : 0;
    let s = 0;
    for (const w of ws) { w.onset = seg.t + s * step; s += w.syl; }
  }
  return words;
}
