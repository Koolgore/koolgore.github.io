import * as THREE from 'three';
import { Polaroid, CARD_W, CARD_H, IMG } from './polaroid.js';
const IMG_X0 = IMG.x0, IMG_Y0 = IMG.y0, IMG_W = IMG.x1 - IMG.x0;
import { PrintEmulsion, loadEmulsionFont, loadPhoto } from './emulsion.js';
import { lightingUniforms, MAX_FIRE_LIGHTS } from './lighting.js';
import { makeTable } from './table.js';
import { FireFluid } from './fluid.js';
import { Post } from './post.js';
import { Particles } from './particles.js';
import { mulberry32, noise1, gnoise } from './noise.js';
import * as TL from './timing.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// photographs under each print's words, in print order
export const PHOTOS = ['kari_01', 'kari_02', 'kari_03', 'kari_04'];
const PHOTO_SET = 'scribbled';   // or 'sq' for the unscribbled originals

// a different light-leak layout on each print (which edges and corners leak, and how hard)
export const LEAKS = [
  { leakFlip: [1, 1], leakSwap: 0, leakShift: 0.0, leakGain: [1.0, 0.45, 0.9, 0.5] },     // left edge, top-left flare
  { leakFlip: [-1, 1], leakSwap: 0, leakShift: -0.22, leakGain: [0.3, 1.2, 0.35, 0.9] },  // right edge, low corner burn
  { leakFlip: [-1, 1], leakSwap: 1, leakShift: 0.12, leakGain: [1.35, 1.0, 1.0, 0.35] },  // top edge, both top corners
  { leakFlip: [1, 1], leakSwap: 1, leakShift: -0.08, leakGain: [1.15, 0.6, 0.75, 1.0] },  // bottom edge, bottom-right flare
]

// loose stack, top first: [x, y, z, yaw(deg)]
const STACK = [
  [-0.35, 0.330, -0.15, 4.0],
  [0.65, 0.240, 0.35, -3.5],
  [-0.85, 0.150, 0.55, 7.0],
  [0.80, 0.060, -0.45, -9.0],
];

export class LyricVideo {
  constructor(canvas, { width = 1080, height = 1920, capture = false } = {}) {
    this.canvas = canvas; this.W = width; this.H = height; this.capture = capture;
  }

  async init() {
    const W = this.W, H = this.H;
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false, preserveDrawingBuffer: this.capture, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer = renderer;

    this.shared = { uTime: { value: TL.VIDEO_START }, lighting: lightingUniforms() };
    this.lighting = this.shared.lighting;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, W / H, 1, 400);
    this.table = makeTable(this.lighting);
    this.table.mesh.renderOrder = 20;
    this.scene.add(this.table.mesh);

    // the four prints
    const defs = await TL.loadPolaroids();
    await loadEmulsionFont();
    // the photographs under the words, one per print
    // (photos: Iván Santiesteban, CC BY; set PHOTO_SET to 'sq' for the unscribbled originals)
    const photos = await Promise.all(PHOTOS.map((n) => loadPhoto(`assets/photos/${n}_${PHOTO_SET}.jpg`)));
    this.prints = defs.map((def, i) => {
      const words = TL.wordsFor(def);
      // each print develops its own emulsion (photochemical text sim) over its photo
      const emulsion = new PrintEmulsion(words, {
        seed: 4.2 + i * 3.7,
        photo: photos[i],
        params: { fontSize: 118, textYOffset: -0.02, bgIntensity: 0.55, ...LEAKS[i] },   // the sim centres at 0.52; -0.02 = true centre
      });
      const p = new Polaroid({ seed: 1.37 + i * 2.91, shared: this.shared });
      p.emulsion = emulsion;
      p.uniforms.uEmul.value = emulsion.texture;
      p.uniforms.uUseEmul.value = 1;
      const [x, y, z, yaw] = STACK[i];
      p.home = { x, y, z, yaw: THREE.MathUtils.degToRad(yaw) };
      p.mesh.position.set(x, y, z);
      p.mesh.rotation.set(-Math.PI / 2, 0, p.home.yaw);
      p.setIgnitions(TL.BURNS[i].ign);
      p.buildBurnGrid();
      p.uniforms.uBow.value = 0.035;
      p.mesh.renderOrder = i;   // front-to-back for early depth rejection
      this.scene.add(p.mesh);
      return p;
    });

    // prints that tumble through the gust
    this.rng = mulberry32(20261118);
    this.flyers = [];
    const fr = mulberry32(777);
    for (let i = 0; i < 13; i++) {
      const src = this.prints[i % 4];
      const ghost = fr() < 0.5;
      const p = new Polaroid({ seg: [26, 32], seed: 11.3 + i * 1.77, shared: this.shared });
      if (ghost) { p.uniforms.uEmul.value = src.emulsion.texture; p.uniforms.uUseEmul.value = 1; }
      p.uniforms.uGhost.value = ghost ? 0.35 + fr() * 0.3 : 0;
      const t0 = TL.FLOURISH + 0.9 + i * 0.52 + fr() * 0.4;
      // depth along the view: mostly mid-air beyond the hero print, a couple whip past the lens
      const near = i === 3 || i === 9;
      const vd = near ? 20 + fr() * 4 : 34 + fr() * 34;
      p.fly = {
        t0, vd, dur: (near ? 1.5 : 3.0) + fr() * 1.6 + (vd - 30) * 0.03,
        y0: -0.25 + fr() * 0.9, rise: 0.15 + fr() * 0.5, wob: 0.05 + fr() * 0.07,
        axis: (() => { const a = fr() * 6.28; return new THREE.Vector3(Math.cos(a), Math.sin(a), 0); })(),
        spin: (0.8 + fr() * 1.6) * (fr() < 0.5 ? -1 : 1), a0: fr() * 6.28, roll: (fr() - 0.5) * 1.2,
        flutter: 0.25 + fr() * 0.55, fph: fr() * 6.28, sway: fr() * 6.28,
      };
      const burn = fr() < 0.72;
      if (burn) {
        const edge = fr();
        const ex = edge < 0.5 ? (fr() - 0.5) * CARD_W : (fr() < 0.5 ? -1 : 1) * CARD_W / 2;
        const ey = edge < 0.5 ? (fr() < 0.5 ? -1 : 1) * CARD_H / 2 : (fr() - 0.5) * CARD_H;
        p.setIgnitions([[ex, ey, t0 - 0.3 + fr() * 0.8, 1.8 + fr() * 1.0]]);
        p.buildBurnGrid(14, 17);
      }
      p.mesh.visible = false;
      this.scene.add(p.mesh);
      this.flyers.push(p);
    }

    this.particles = new Particles(this.rng);
    this.particles.sparkMat.uniforms.uRes.value.set(W, H);
    this.scene.add(this.particles.sparkMesh, this.particles.ashMesh);

    // render targets
    this.hdr = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: this.msaa ?? 4, depthBuffer: true });
    this.shadowRT = new THREE.WebGLRenderTarget(2048, 2048, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.lighting.uShadow.value = this.shadowRT.texture;
    this.lighting.uShadowTexel.value = 1 / 2048;
    this.lightCam = new THREE.OrthographicCamera(-22, 22, 22, -22, 1, 120);
    this.fluid = new FireFluid(renderer, Math.round(W / 4), Math.round(H / 4));
    this.post = new Post(renderer, W, H);

    for (const p of [...this.prints, ...this.flyers]) p.bake(renderer);
    this.reset(TL.VIDEO_START);
    return this;
  }

  noLight() {
    if (!this._blank) {
      const tex = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType);
      tex.needsUpdate = true;
      this._blank = { textures: { expo: tex, glow: tex, hal: tex }, base: 0 };
    }
    return this._blank;
  }

  reset(t) {
    this.t = t;
    this.particles.sparks.length = 0;
    this.particles.ash.length = 0;
    this.fluid.clearAll();
    this.prevT = t;
    this.camState = null;
    this.burstDone = false;
    this.ashBurstDone = false;
    for (const p of this.prints) p.mesh.visible = true;
  }

  // ------------------------------------------------------------------ wind
  windAt(t) {
    const g = smooth(TL.FLOURISH - 0.25, TL.FLOURISH + 0.7, t) * (1 - smooth(145.5, 150.5, t) * 0.8);
    const gust = 1 + 0.35 * noise1(t * 1.7, 5) + 0.2 * noise1(t * 4.1, 6);
    const calm = smooth(145.5, 150.5, t);
    return new THREE.Vector3(36 * g * gust, 9 * g + calm * 5, -7 * g);
  }
  turb(p, t, ph, axis) {
    return (gnoise(p.x * 0.18 + axis * 31.7 + ph, p.z * 0.18 + p.y * 0.12 + t * 0.6) - 0.5) * 2;
  }

  // -------------------------------------------------------------- update
  update(t, dt) {
    this.t = t;
    this.shared.uTime.value = t;
    const rng = this.rng;
    const wind = this.windAt(t);
    this.wind = wind;

    // P4 is lifted by the gust, rises while burning, then drifts out top-right
    const p4 = this.prints[3];
    const lift = smooth(TL.FLOURISH + 0.15, TL.FLOURISH + 3.8, t);
    const drift = smooth(TL.FLOURISH + 3.5, TL.FLOURISH + 11.0, t);
    if (lift > 0) {
      const h = p4.home;
      p4.mesh.position.set(
        h.x + lift * 1.0 + drift * 22 + Math.sin(t * 1.3) * 0.8 * lift,
        h.y + lift * 9.0 + drift * 12 + Math.sin(t * 2.1) * 0.6 * lift,
        h.z + lift * 4.0 - drift * 6);
      // tip up toward the camera as it rises, slow wobble
      p4.mesh.rotation.set(
        -Math.PI / 2 + lift * 0.55 + Math.sin(t * 1.7) * 0.22 * lift + drift * 0.5,
        Math.sin(t * 1.1) * 0.25 * lift + drift * 0.9,
        h.yaw + lift * 0.35 + drift * 1.2);
      p4.uniforms.uBend.value.set(0.4 * lift * Math.sin(t * 4.2), 0.6, 0.55, t * 5.0);
      p4.uniforms.uCurl.value.set(0.3 * lift, 0.3);
    }

    // burning state & bookkeeping
    const fireLights = [];
    const tmp = new THREE.Vector3();
    const all = [...this.prints, ...this.flyers];
    for (const p of this.prints) {
      const start = p.burnStart;
      p.uniforms.uBurning.value = t > start - 1.6 ? 1 : 0;
      const doneAt = Math.max(...p.grid.map((g) => g.tb + g.L)) + 0.05;
      p.mesh.visible = t < doneAt;
    }

    // camera first: flyers are placed relative to it
    this.updateCamera(t, dt);
    const base = this.baseCam;
    const tanY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), tanX = tanY * this.camera.aspect;
    for (const f of this.flyers) {
      const F = f.fly;
      const u = t - F.t0;
      const s = u / F.dur;
      f.mesh.visible = s > -0.05 && s < 1.08;
      if (!f.mesh.visible) { f.uniforms.uBurning.value = 0; continue; }
      const nx = lerp(-1.45, 1.45, s) + Math.sin(u * 1.9 + F.sway) * F.wob;
      const ny = F.y0 + F.rise * s + Math.sin(u * 2.6 + F.sway * 2.0) * F.wob * 1.4;
      const d = F.vd;
      f.mesh.position.copy(base.pos)
        .addScaledVector(base.fwd, d)
        .addScaledVector(base.right, nx * tanX * d)
        .addScaledVector(base.up, ny * tanY * d);
      f.mesh.position.y = Math.max(f.mesh.position.y, 4.0 + 0.1 * d);
      const face = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(base.fwd.clone().negate(), new THREE.Vector3(), base.up));
      const flip = new THREE.Quaternion().setFromAxisAngle(F.axis, F.a0 + u * F.spin);
      const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), F.roll + u * 0.4 * Math.sign(F.spin));
      f.mesh.quaternion.copy(face).multiply(roll).multiply(flip);
      f.uniforms.uBend.value.set(F.flutter * Math.sin(u * 6.5 + F.fph), F.sway, 0.5, u * 7.0 + F.fph);
      f.uniforms.uBurning.value = f.ign.length && t > f.burnStart - 1 ? 1 : 0;
    }

    for (const p of all) p.mesh.updateMatrixWorld();

    // develop each print's emulsion up to now (fixed steps; frozen once finished)
    for (const p of this.prints) p.emulsion.update(t);

    // spawn sparks / ash from burn fronts, gather fire lights
    for (const p of all) {
      if (!p.mesh.visible || !p.ign.length || p.uniforms.uBurning.value < 0.5 || !p.grid) continue;
      let cx = 0, cy = 0, n = 0;
      const isFlyer = !!p.fly;
      const vel = new THREE.Vector3();
      for (const g of p.grid) {
        const q = t - g.tb;
        if (q < -0.06 || q > g.L + 0.1) continue;
        const qp = this.prevT - g.tb;
        if (q < 0.30) { cx += g.x; cy += g.y; n++; }
        const area = p.gridCell;
        if (q >= 0 && q < 0.22 && rng() < dt * 0.55 * area * (isFlyer ? 1.4 : 1)) {
          p.localToWorld(g.x + (rng() - 0.5) * 0.3, g.y + (rng() - 0.5) * 0.3, 0.2, tmp);
          vel.set((rng() - 0.5) * 9, 9 + rng() * 22, (rng() - 0.5) * 9).add(wind.clone().multiplyScalar(0.6));
          this.particles.spawnSpark(tmp, vel, 0.85 + rng() * 0.35, 0.035 + rng() * 0.04, 0.5 + rng() * 1.4);
        }
        if (qp < g.L && q >= g.L && rng() < (isFlyer ? 0.10 : 0.06)) {
          p.localToWorld(g.x, g.y, 0.4, tmp);
          vel.set((rng() - 0.5) * 6, 10 + rng() * 14, -4 - rng() * 6).add(wind.clone().multiplyScalar(0.5));
          const size = 0.08 + rng() * 0.18;
          this.particles.spawnAsh(tmp, vel, size, rng() < 0.35 ? 0.3 + rng() * 0.5 : rng() * 0.1, rng());
        }
      }
      if (n > 0) {
        p.localToWorld(cx / n, cy / n, 0, tmp);
        const flick = 0.75 + 0.25 * noise1(t * 11 + p.seed * 10, 3) + 0.12 * noise1(t * 23, 4);
        fireLights.push({ pos: tmp.clone().add(new THREE.Vector3(0, 1.6 + Math.sqrt(n) * 0.12, 0)), I: Math.sqrt(n) * 4.2 * flick });
      }
    }

    // flourish burst
    if (!this.burstDone && t >= TL.FLOURISH) {
      this.burstDone = true;
      const c = new THREE.Vector3(); p4.localToWorld(0, 0, 0.3, c);
      for (let i = 0; i < 520; i++) {
        const a = rng() * Math.PI * 2, r = rng() * 5.5;
        const pos = c.clone().add(new THREE.Vector3(Math.cos(a) * r, rng() * 1.5, Math.sin(a) * r * 1.2));
        const v = new THREE.Vector3((rng() - 0.3) * 40, 14 + rng() * 48, (rng() - 0.5) * 34);
        this.particles.spawnSpark(pos, v, 0.9 + rng() * 0.45, 0.03 + rng() * 0.05, 1.2 + rng() * 2.6);
      }
      for (let i = 0; i < 260; i++) {
        const pos = c.clone().add(new THREE.Vector3((rng() - 0.5) * 16, rng() * 3, (rng() - 0.5) * 12));
        const v = new THREE.Vector3((rng() - 0.2) * 18, 6 + rng() * 18, (rng() - 0.5) * 14);
        this.particles.spawnAsh(pos, v, 0.10 + rng() * 0.30, rng() < 0.5 ? 0.5 + rng() * 0.5 : 0.05, rng());
      }
    }
    // embers drifting in on the gust (the "chimes": slow twinkling motes)
    if (t > TL.FLOURISH && t < 153.5) {
      const rate = 60 * smooth(TL.FLOURISH, TL.FLOURISH + 1, t) * (1 - 0.75 * smooth(144, 149, t)) * (1 - smooth(151, 153.5, t));
      const cnt = Math.floor(rate * dt + rng());
      const B = this.baseCam;
      const tY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), tX = tY * this.camera.aspect;
      const edgePos = () => {
        const d = 10 + rng() * 30;
        return B.pos.clone().addScaledVector(B.fwd, d).addScaledVector(B.right, -1.15 * tX * d).addScaledVector(B.up, (rng() * 2.2 - 1.1) * tY * d);
      };
      for (let i = 0; i < cnt; i++) {
        const pos = edgePos();
        const v = wind.clone().multiplyScalar(0.6 + rng() * 0.7).add(new THREE.Vector3(0, 2 + rng() * 7, 0));
        const hot = rng();
        this.particles.spawnSpark(pos, v, 0.3 + hot * hot * 0.85, 0.015 + rng() * rng() * 0.06, 2.5 + rng() * 3.5);
      }
      const acnt = Math.floor(rate * 0.5 * dt + rng());
      for (let i = 0; i < acnt; i++) {
        const pos = edgePos();
        const v = wind.clone().multiplyScalar(0.7 + rng() * 0.5);
        this.particles.spawnAsh(pos, v, 0.10 + rng() * 0.28, rng() < 0.4 ? 0.3 + rng() * 0.5 : 0, rng());
      }
    }

    this.particles.update(dt, t, wind, this.turb.bind(this));
    this.particles.upload(1);

    // fire lights (strongest first)
    fireLights.sort((a, b) => b.I - a.I);
    const FL = this.lighting.uFireL.value;
    for (let i = 0; i < MAX_FIRE_LIGHTS; i++) {
      const l = fireLights[i];
      if (l) FL[i].set(l.pos.x, l.pos.y, l.pos.z, l.I); else FL[i].set(0, 0, 0, 0);
    }
    this.ashFire = fireLights.length ? Math.min(1, fireLights[0].I / 60) : 0;
    this.particles.ashMat.uniforms.uFireBoost.value = this.ashFire;

    // fluid wind in grid cells / s (screen-space approximation of world wind)
    // world cm/s -> screen heights/s (roughly 13 cm of table per screen height)
    this.fluid.wind.set(wind.x / 20, (wind.y - wind.z * 0.3) / 20);

    this.prevT = t;
  }

  focusTarget(t) {
    // centre of the image area of whichever print is on top
    const idx = t < 119.4 ? 0 : t < 124.9 ? 1 : t < 130.4 ? 2 : 3;
    const pts = this.prints.map((p) => {
      const v = new THREE.Vector3(p.home.x, p.home.y, p.home.z);
      const off = new THREE.Vector3(0, 0.8, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), p.home.yaw);
      return v.add(new THREE.Vector3(off.x, 0, -off.y));
    });
    const blendT = [119.4, 124.9, 130.4];
    let target = pts[0].clone();
    for (let i = 0; i < 3; i++) target.lerp(pts[i + 1], smooth(blendT[i] - 1.6, blendT[i] + 1.0, t));
    return target;
  }

  updateCamera(t) {
    const target = this.focusTarget(t);
    const v = smooth(TL.VIDEO_START, TL.FLOURISH, t);
    const fl = smooth(TL.FLOURISH - 0.1, TL.FLOURISH + 4.0, t);
    const end = smooth(TL.FLOURISH + 6.0, 155.0, t);
    // half-follow the rising print
    const follow = 0.5 * smooth(TL.FLOURISH + 0.3, TL.FLOURISH + 3.5, t) * (1 - 0.6 * smooth(TL.FLOURISH + 6.0, TL.FLOURISH + 11.0, t));
    if (follow > 0) target.lerp(this.prints[3].mesh.position, follow);
    const dist = lerp(30.0, 26.5, v) + fl * 24.0 + end * 4.0;
    const elev = THREE.MathUtils.degToRad(lerp(55, 50, v) - fl * 12 - end * 14);
    const azim = THREE.MathUtils.degToRad(lerp(-5, 3, v) + fl * 6 + end * 6);
    target.y += fl * 3.0 + end * 7.0;
    // vertical frame: sit the print in the lower part, leave the sky for flames
    target.z -= 1.8 * (1 - fl);
    const fov = 40 + fl * 8;
    if (Math.abs(this.camera.fov - fov) > 1e-4) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.lighting.uPoolScale.value = 1 + fl * 1.3;
    // handheld drift
    const hs = 0.06 + fl * 0.10;
    const jx = noise1(t * 0.35, 11) * 0.35 + noise1(t * 1.1, 12) * hs;
    const jy = noise1(t * 0.31, 13) * 0.25 + noise1(t * 1.3, 14) * hs;
    const kick = Math.exp(-Math.max(0, t - TL.FLOURISH) * 3.0) * (t > TL.FLOURISH ? 1 : 0) * 0.35;
    const cam = this.camera;
    cam.position.set(
      target.x + dist * Math.cos(elev) * Math.sin(azim),
      target.y + dist * Math.sin(elev),
      target.z + dist * Math.cos(elev) * Math.cos(azim));
    // un-jittered basis for camera-relative choreography
    const fwd = target.clone().sub(cam.position).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);
    this.baseCam = { pos: cam.position.clone(), fwd, right, up };
    cam.lookAt(target.x + jx + kick * noise1(t * 20, 21), target.y + jy + kick * noise1(t * 20, 22), target.z);
    cam.updateMatrixWorld();
    // focus on the image area of the print on top (the words), not the look target
    this.focusDist = follow > 0.05 ? cam.position.distanceTo(this.prints[3].mesh.position) : cam.position.distanceTo(this.focusTarget(t));
    // key-light shadow camera follows the stack
    const L = this.lighting.uKeyDir.value;
    const c0 = new THREE.Vector3(0, 0, 0);
    this.lightCam.position.copy(c0).addScaledVector(L, 60);
    this.lightCam.lookAt(c0);
    this.lightCam.updateMatrixWorld();
    this.lightCam.updateProjectionMatrix();
    const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.lighting.uShadowMat.value.copy(bias).multiply(this.lightCam.projectionMatrix).multiply(this.lightCam.matrixWorldInverse);
  }

  // which intact prints can occlude what (cheap shader-side occlusion cull)
  updateCover() {
    const intact = this.prints.filter((p) => p.mesh.visible && p.uniforms.uBurning.value < 0.5 && p.mesh.position.y < 0.5);
    const setFor = (u, list) => {
      u.uCoverN.value = list.length;
      list.forEach((p, i) => u.uCover.value[i].copy(p.mesh.matrixWorld).invert());
    };
    this.prints.forEach((p, k) => setFor(p.uniforms, intact.filter((o) => this.prints.indexOf(o) < k)));
    setFor(this.table.uniforms, intact);
  }

  // ---------------------------------------------------------------- render
  setPass(kind) {
    for (const p of [...this.prints, ...this.flyers]) p.useMaterial(kind);
    this.table.mesh.visible = kind !== 'shadow';
    this.table.uniforms.uSource.value = kind === 'source' ? 1 : 0;
    this.particles.sparkMesh.visible = kind === 'main';
    this.particles.ashMesh.visible = kind === 'main';
  }

  render(dt) {
    const r = this.renderer, t = this.t;
    // shadow map
    this.setPass('shadow');
    r.setRenderTarget(this.shadowRT);
    r.setClearColor(0xffffff, 1); r.clear(true, true, false);
    r.render(this.scene, this.lightCam);
    // fire sources -> fluid
    this.setPass('source');
    r.setRenderTarget(this.fluid.source);
    r.setClearColor(0x000000, 0); r.clear(true, true, false);
    r.render(this.scene, this.camera);
    const sub = 2;
    for (let i = 0; i < sub; i++) this.fluid.step(dt / sub, t - dt + (i + 1) * dt / sub);
    // beauty
    this.updateCover();
    this.setPass('main');
    r.setRenderTarget(this.hdr);
    r.setClearColor(0x000000, 1); r.clear(true, true, false);
    r.render(this.scene, this.camera);

    const fadeIn = smooth(TL.FADE_IN[0], TL.FADE_IN[1], t);
    const fadeOut = 1 - smooth(TL.FADE_OUT[0], TL.FADE_OUT[1], t);
    const fl = smooth(TL.FLOURISH - 0.3, TL.FLOURISH + 2, t);
    this.post.setDof(this.focusDist, 34 - fl * 14, 18);
    this.post.run(this.hdr.texture, this.fluid, {
      time: t, fade: fadeIn * fadeOut, dof: true, exposure: 1.0, bloom: 0.17 + 0.05 * fl,
      fireGain: this.debugNoFire ? 0 : 1.0, smokeGain: this.debugNoFire ? 0 : 0.8,
    });
  }

  step(t, dt) { this.update(t, dt); this.render(dt); }

  readPixels() {
    const gl = this.renderer.getContext();
    const px = new Uint8Array(this.W * this.H * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, this.W, this.H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }
}
