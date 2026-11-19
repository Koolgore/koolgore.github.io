# PolaroidTextSim (WebGL2) — Integration Package

A zero-dependency, modular **WebGL2** photochemical & optical light-exposure text simulation designed to drop directly into a lyric video pipeline (real-time browser playback or deterministic offline frame-by-frame export).

---

## Package Contents

```text
polaroid-text-sim/
├── README.md                          # This guide
├── index.html                         # Interactive WebGL2 tuning studio & WebM recorder
├── demo.js                            # Demo wiring + headless render hooks
├── src/
│   ├── PolaroidTextSim.js             # Self-contained WebGL2 engine class (ES module)
│   └── shaders.js                     # 5-pass GLSL ES 3.00 (RGBA16F) photochemical shaders
├── assets/
│   ├── fonts/
│   │   └── Caveat-Variable.ttf        # Self-hosted handwritten font (OFL)
│   └── real_photos/
│       ├── kari_01_scribbled.jpg      # 1:1 square real 35mm photo (night trees + Sharpie)
│       ├── kari_02_scribbled.jpg      # 1:1 square real 35mm photo (parking garage + Sharpie)
│       ├── kari_03_scribbled.jpg      # 1:1 square real 35mm photo (bed & cat + Sharpie)
│       ├── kari_04_scribbled.jpg      # 1:1 square real 35mm photo (woods + Sharpie)
│       └── kari_01..04_sq.jpg         # Unscribbled 1:1 square originals
└── scripts/
    ├── render_videos.mjs              # Zero-dep Node 22 + headless Chrome + FFmpeg MP4 exporter
    ├── render_portrait_demo.mjs       # Portrait double-exposure MP4 render example
    └── scribble_faces.mjs             # Procedural glossy Sharpie face-scribble generator
```

> **Photo Attribution (CC-BY):** The 4 real 35mm photographs in `assets/real_photos/` are by **Iván Santiesteban** (Flickr, CC-BY licensed via Openverse).

---

## WebGL2 Pipeline Overview

Each `sim.update(timeSec, dt)` call executes a 5-pass floating-point (`RGBA16F`) GPU pipeline:
1. **Dynamic Exposure Mask (2D Canvas → GPU Texture):** Rasterizes timed words/characters with subtle organic jitter, per-character stagger, and a wide-to-crisp chemical focus curve.
2. **Wet Photochemical Diffusion & Opacifier Clearing (Ping-Pong `RGBA16F`):** Isotropic wet-emulsion diffusion that settles/fixes as each word finishes developing, with patchy silver-halide nucleation and an early cool milky-cyan Polaroid opacifier ghost.
3. **Optical Light-Scatter Pass:** Sparse, straight vertical lens/roller scatter shafts.
4. **Dual-Kawase Halation Pyramid (4 mip levels):** Dual-spectrum optical halation (tight golden-amber inner scatter + wide deep crimson backing-layer halation + RGB layer parallax).
5. **Photochemical Composite & AgX Tone Mapping:** Double-exposes the glowing lyrics linearly onto the optional background photo, applies AgX highlight roll-off, asymmetric corner light-leaks, glossy Mylar plastic sheen, 3-pod bottom crystallization wisps, 24fps 3D silver-halide grain, and an optional sculpted Polaroid cardstock frame.

---

## Quick Integration

```js
import { PolaroidTextSim } from './src/PolaroidTextSim.js';

// 1. Load the bundled handwritten font (or any custom .ttf / .woff2)
await PolaroidTextSim.loadFont('PolaroidHand', './assets/fonts/Caveat-Variable.ttf');

// 2. Initialize on any <canvas> (880x1070 for full Polaroid card, or 768x768 for emulsion-only)
const sim = new PolaroidTextSim(canvas, {
  showFrame: true,       // Set false to render ONLY the square emulsion texture (for 3D cards / fire shaders)
  fontFamily: '"PolaroidHand", cursive',
  fontSize: 152,
  textYOffset: 0.21,     // Shift lyrics into lower third over portraits (-0.5 .. 0.5)
  bgIntensity: 0.58,     // Brightness of underlying photo inside the emulsion
  bgDevelop: 1.0,        // 0..1 — animate to develop the photo itself out of darkness
  halationStrength: 1.08,
  streakStrength: 0.90,
  chemicalBleed: 1.05,
  edgeBurn: 0.92,
  grainAmount: 0.068,
  exposure: 1.18,
  seed: 4.2,             // Change per Polaroid card for unique light-leaks & chemical texture
});

// 3. Optional: set a real Polaroid background photo (HTMLImageElement, Canvas, or Video)
const img = new Image();
img.src = './assets/real_photos/kari_01_scribbled.jpg';
await img.decode();
sim.setBackgroundImage(img);

// 4. Schedule lyrics — either auto-staggered or exact per-word audio timestamps
sim.setWords([
  { text: 'pictures', start: 0.35, duration: 1.75, line: 0 },
  { text: 'of',       start: 1.13, duration: 1.75, line: 0 },
  { text: 'you',      start: 1.91, duration: 1.75, line: 0 },
]);
// Or convenience helper:
// sim.setText('pictures of you', { start: 0.35, stagger: 0.78, wordDuration: 1.75 });

// 5a. Real-time loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  sim.update(audio.currentTime, dt);
  requestAnimationFrame(loop);
}

// 5b. Deterministic offline frame export (e.g., 30fps or 60fps)
// for (let f = 0; f < totalFrames; f++) {
//   sim.update(f / 30, 1 / 30);
//   // capture canvas or use as WebGL/Three.js CanvasTexture
// }
```

### Switching Cards / Clearing Between Lyrics
```js
sim.reset(); // Clears ping-pong chemical FBOs back to fresh darkroom emulsion
sim.setBackgroundImage(nextImg);
sim.setParams({ seed: 11.7 }); // Fresh light-leak & grain pattern for the new Polaroid
sim.setWords(nextLineWords);
```

### Using as a Texture on a 3D Polaroid / Burning-Card Shader
Set `showFrame: false` and size the offscreen canvas to `768×768` (or `1024×1024`). Pass `sim.canvas` directly as a `THREE.CanvasTexture` (with `texture.needsUpdate = true` each frame) or `gl.texImage2D` source into your Polaroid burning transition shader.

---

## Key Parameters (`sim.setParams({ ... })`)

| Parameter | Default | Description |
|---|---|---|
| `showFrame` | `true` | `true` = full sculpted Polaroid card; `false` = square emulsion only |
| `simResolution` | `768` | Internal WebGL2 FBO resolution (constructor option) |
| `fontFamily` | `PolaroidHand` | CSS font family string |
| `fontSize` | `138` | Base font size in px (auto-scales down to fit emulsion width) |
| `charJitter` | `0.22` | Subtle per-character position/rotation/scale variation (`0` = rigid) |
| `charStagger` | `0.045` | Per-character left-to-right develop stagger inside each word (seconds) |
| `textYOffset` | `0.0` | Vertical text offset (`+0.20` places lyrics in lower third of portraits) |
| `bgIntensity` | `0.45` | Linear brightness of underlying background photo inside emulsion |
| `bgDevelop` | `1.0` | `0..1` chemical reveal of the background photo itself |
| `halationStrength` | `1.05` | Dual-spectrum golden/crimson optical halation intensity |
| `streakStrength` | `0.95` | Subtle straight vertical optical roller/lens scatter shafts |
| `chemicalBleed` | `1.05` | Wet-emulsion diffusion spread & micro-bleed |
| `edgeBurn` | `1.0` | Asymmetric corner light-leaks & bottom 3-pod crystallization wisps |
| `grainAmount` | `0.065` | 24fps temporal 3D silver-halide grain |
| `warmth` | `0.58` | Dye color temperature (`0` cooler → `1` warmer) |
| `exposure` | `1.12` | Overall HDR exposure into the AgX tone mapper |
| `developSpeed` | `1.0` | Speed multiplier for chemical accumulation |
| `seed` | `4.2` | Deterministic seed for grain, light-leaks, and handwriting variation |
