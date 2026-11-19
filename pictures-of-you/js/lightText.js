// Accumulates light-pen exposure on a print's film (additive Gaussian splats
// along the pen path, weighted by dwell time), then derives the light that
// scatters inside the emulsion (glow) and bounces off the film base (halation).
//   expo.r = exposure, expo.g = exposure-weighted time (for per-pixel age)
import * as THREE from 'three';
import { Pass, FRAG_OUT } from './gpu.js';
import { writeWithLight, penAt } from './lightGlyphs.js';

const SIZE = 1024;
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
let blurH = null, blurV = null, down = null;

function hf(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, generateMipmaps: false,
  });
}

export class LightText {
  constructor(renderer, words, seed) {
    this.r = renderer;
    const res = writeWithLight(words, { size: SIZE, seed });
    this.strokes = res.strokes;
    this.sigma = res.sigma;
    const n = res.splats.length / 4;
    this.count = n;
    // keep times small for half-float precision
    this.base = words.length ? Math.min(...words.map((w) => w.onset)) : 0;
    const data = new Float32Array(res.splats);
    let tMax = -1e9;
    for (let i = 0; i < n; i++) { data[i * 4 + 3] -= this.base; tMax = Math.max(tMax, data[i * 4 + 3]); }
    this.tStart = this.base - 0.05;
    this.tEnd = this.base + tMax + 0.02;

    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setAttribute('iS', new THREE.InstancedBufferAttribute(data, 4));
    g.setAttribute('iR', new THREE.InstancedBufferAttribute(res.radii, 1));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { uT: { value: 0 }, uSigma: { value: this.sigma }, uSize: { value: SIZE } },
      vertexShader: /* glsl */ `
        attribute vec4 iS; attribute float iR;
        uniform float uT, uSigma, uSize;
        varying vec2 vD; varying float vW; varying float vTau; varying float vR;
        void main() {
          vR = iR;
          float r = iR * 1.7;
          vD = position.xy * r;
          vW = iS.z; vTau = iS.w;
          vec2 px = iS.xy + vD;
          gl_Position = iS.w <= uT ? vec4(px / uSize * 2.0 - 1.0, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
        }`,
      fragmentShader: FRAG_OUT + /* glsl */ `
        uniform float uSigma;
        varying vec2 vD; varying float vW; varying float vTau; varying float vR;
        void main() {
          float q = dot(vD, vD) / (vR * vR);
          float k = exp(-q * q) * vW;            // flat-topped spot with a soft shoulder
          gl_FragColor = vec4(k, k * vTau, 0.0, 0.0);
        }`,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
      depthTest: false, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);

    this.expo = hf(SIZE, SIZE);
    this.q1 = hf(256, 256); this.q2 = hf(256, 256);
    this.e1 = hf(128, 128); this.e2 = hf(128, 128);
    if (!blurH) {
      const blur = (dir) => new Pass(/* glsl */ `
        varying vec2 vUv; uniform sampler2D uSrc; uniform vec2 uStep;
        void main() {
          vec4 c = texture(uSrc, vUv) * 0.2270;
          c += (texture(uSrc, vUv + uStep * 1.3846) + texture(uSrc, vUv - uStep * 1.3846)) * 0.3162;
          c += (texture(uSrc, vUv + uStep * 3.2308) + texture(uSrc, vUv - uStep * 3.2308)) * 0.0703;
          gl_FragColor = c;
        }`, { uSrc: { value: null }, uStep: { value: new THREE.Vector2() } });
      blurH = blur(); blurV = blur();
      down = new Pass(/* glsl */ `
        varying vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTx;
        void main() {
          gl_FragColor = 0.25 * (texture(uSrc, vUv + uTx * vec2(-1.0, -1.0)) + texture(uSrc, vUv + uTx * vec2(1.0, -1.0))
                               + texture(uSrc, vUv + uTx * vec2(-1.0, 1.0)) + texture(uSrc, vUv + uTx * vec2(1.0, 1.0)));
        }`, { uSrc: { value: null }, uTx: { value: new THREE.Vector2() } });
    }
    this.key = null;
    this.update(-1e9, true);
  }

  // re-expose only while the pen is writing (or when time jumps)
  update(t, force = false) {
    const key = Math.min(Math.max(t, this.tStart), this.tEnd);
    if (!force && key === this.key) return;
    this.key = key;
    const r = this.r;
    const prevAlpha = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    this.mat.uniforms.uT.value = key - this.base;
    r.setRenderTarget(this.expo); r.clear(true, false, false);
    if (key > this.tStart) r.render(this.scene, cam);
    // 1024 -> 256 (two 2x2 box steps folded into one 4-tap bilinear pass, twice)
    down.uniforms.uSrc.value = this.expo.texture; down.uniforms.uTx.value.set(1 / SIZE, 1 / SIZE);
    down.render(r, this.q2);
    down.uniforms.uSrc.value = this.q2.texture; down.uniforms.uTx.value.set(1 / 512, 1 / 512);
    down.render(r, this.q1);
    // emulsion scatter: tight, ~5 px at film resolution
    this.blur(this.q1, this.q2, 256, 1.1);
    // halation: a fairly tight red bleed (~16 px), from a further downsample
    down.uniforms.uSrc.value = this.q1.texture; down.uniforms.uTx.value.set(0.5 / 256, 0.5 / 256);
    down.render(r, this.e1);
    this.blur(this.e1, this.e2, 128, 1.4);
    r.setRenderTarget(null);
    r.setClearColor(0x000000, prevAlpha);
  }

  blur(a, tmp, res, step) {
    blurH.uniforms.uSrc.value = a.texture; blurH.uniforms.uStep.value.set(step / res, 0);
    blurH.render(this.r, tmp);
    blurV.uniforms.uSrc.value = tmp.texture; blurV.uniforms.uStep.value.set(0, step / res);
    blurV.render(this.r, a);
  }

  get textures() { return { expo: this.expo.texture, glow: this.q1.texture, hal: this.e1.texture }; }

  // pen tip in film uv (0..1) with intensity
  pen(t) {
    const p = penAt(this.strokes, t);
    return p ? { x: p.x / SIZE, y: p.y / SIZE, I: p.I } : null;
  }
}
