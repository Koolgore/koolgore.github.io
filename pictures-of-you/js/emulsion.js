// One developing print emulsion per Polaroid, driven by the vendored
// PolaroidTextSim (photochemical text development, halation, leaks, grain).
//
// The sim is stateful (ping-pong chemical buffers), so it is always advanced in
// fixed 1/30 s steps from its own reset time. That keeps renders deterministic
// even when the director jumps in time: going backwards resets and replays.
import * as THREE from 'three';
import { PolaroidTextSim } from '../vendor/polaroid-text-sim/src/PolaroidTextSim.js';

const STEP = 1 / 30;
let fontReady = null;

export function loadEmulsionFont(url = 'vendor/polaroid-text-sim/fonts/Caveat-Variable.ttf') {
  if (!fontReady) fontReady = PolaroidTextSim.loadFont('PolaroidHand', url).then(() => document.fonts.ready);
  return fontReady;
}

export class PrintEmulsion {
  // words: [{text, row, onset}] in song time
  constructor(words, { seed = 4.2, res = 1024, develop = 1.7, params = {} } = {}) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = res; this.canvas.height = res;
    this.sim = new PolaroidTextSim(this.canvas, {
      showFrame: false,
      simResolution: res,
      seed,
      fontSize: 150,
      lineHeight: 1.12,
      ...params,
    });
    this.edgeBurn = this.sim.params.edgeBurn;
    this.develop = develop;
    this.words = words;
    // timeline: begin a little before the first word so the blank emulsion is settled
    this.t0 = words.length ? Math.min(...words.map((w) => w.onset)) - 0.6 : 0;
    this.t1 = words.length ? Math.max(...words.map((w) => w.onset)) + develop + 1.2 : 0;
    this.sim.setWords(words.map((w) => ({ text: w.text, start: w.onset, duration: develop, line: w.row })));
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;      // decoded to linear in the print shader
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.reset();
  }

  reset() {
    this.sim.reset();
    this.t = this.t0;
    this.sim.setParams({ edgeBurn: 0 });
    this.sim.update(this.t, STEP);
    this.texture.needsUpdate = true;
  }

  // advance to song time t (clamped to this print's active window)
  update(t) {
    const target = Math.min(Math.max(t, this.t0), this.t1);
    if (target < this.t - 1e-6) this.reset();
    if (target - this.t < STEP * 0.5) return false;
    while (this.t + STEP <= target + 1e-6) {
      this.t += STEP;
      // stray light fogs the edges as the line is exposed, not before
      const p = Math.min(1, Math.max(0, (this.t - this.t0 - 0.4) / (this.t1 - this.t0 - 1.4)));
      this.sim.setParams({ edgeBurn: this.edgeBurn * p });
      this.sim.update(this.t, STEP);
    }
    this.texture.needsUpdate = true;
    return true;
  }
}
