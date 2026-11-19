// Post chain: fire & smoke composite -> depth of field -> bloom -> filmic grade.
import * as THREE from 'three';
import { Pass, rt } from './gpu.js';
import { GLSL_NOISE } from './noise.js';
import { GLSL_LIGHTING } from './lighting.js';

export class Post {
  constructor(renderer, w, h) {
    this.r = renderer; this.w = w; this.h = h;
    this.comp = rt(w, h);
    this.dof = rt(w, h);
    this.nearCoc = rt(Math.ceil(w / 4), Math.ceil(h / 4));
    this.nearCoc2 = rt(Math.ceil(w / 4), Math.ceil(h / 4));
    this.mips = [];
    let mw = w, mh = h;
    for (let i = 0; i < 6; i++) { mw = Math.max(1, Math.ceil(mw / 2)); mh = Math.max(1, Math.ceil(mh / 2)); this.mips.push(rt(mw, mh)); }
    this.ups = this.mips.map((m) => rt(m.width, m.height));

    this.fireComp = new Pass(GLSL_NOISE + `
      varying vec2 vUv;
      uniform sampler2D uScene, uScal, uVel;
      uniform float uTime, uFireGain, uSmokeGain, uAspect;
      ${GLSL_LIGHTING.match(/vec3 fireRamp[\s\S]*?\n}\n/)[0]}
      void main() {
        vec4 sc = texture(uScene, vUv);
        // skip all the noise where there is no fire or smoke nearby
        vec4 pk = max(max(texture(uScal, vUv + vec2(0.012, 0.0)), texture(uScal, vUv - vec2(0.012, 0.0))),
                      max(texture(uScal, vUv + vec2(0.0, 0.016)), texture(uScal, vUv - vec2(0.0, 0.016))));
        pk = max(pk, texture(uScal, vUv));
        if (pk.x < 0.08 && pk.y < 0.01) { gl_FragColor = sc; return; }
        // detail: break the low-res temperature into licking tongues
        vec2 v = texture(uVel, vUv).xy;
        vec2 q = vUv * vec2(uAspect, 1.0);
        float n1 = fbm3(vec3(q * 15.0 - vec2(0.0, uTime * 2.6), uTime * 0.9), 4);
        float n2 = fbm3(vec3(q * 34.0 - vec2(0.0, uTime * 5.0), uTime * 1.7), 3);
        vec2 off = (vec2(n1, n2) - 0.5) * vec2(0.010, 0.013);
        vec4 f = texture(uScal, vUv + off);
        float T = f.x;
        float shape = T * (0.40 + 0.9 * n1) * (0.70 + 0.6 * n2);
        float flame = smoothstep(0.30, 1.05, shape);
        vec3 fire = fireRamp(shape * 0.75) * flame * (0.35 + 1.5 * shape) * uFireGain;
        // faint blue base where the flame is born (hot but sooty-free)
        // smoke: absorbs, lit warm from below by the flames
        float sm = f.y * (0.65 + 0.7 * fbm3(vec3(q * 9.0 - vec2(0.0, uTime * 0.8), uTime * 0.4), 3));
        float a = (1.0 - exp(-sm * 1.1)) * uSmokeGain;
        vec3 smokeCol = vec3(0.045, 0.043, 0.045) + vec3(0.5, 0.22, 0.07) * min(T, 1.0) * 0.35;
        vec3 col = mix(sc.rgb, smokeCol, a);
        // heat haze: slightly displace what's behind hot air
        col += fire;
        gl_FragColor = vec4(col, sc.a);
      }`, {
      uScene: { value: null }, uScal: { value: null }, uVel: { value: null }, uTime: { value: 0 },
      uFireGain: { value: 1 }, uSmokeGain: { value: 0.85 }, uAspect: { value: w / h },
    });

    // depth of field: CoC from linear depth stored in alpha
    const cocFn = `
      uniform float uFocus, uAperture, uMaxCoc;
      float coc(float z) { return clamp(uAperture * abs(z - uFocus) / max(z, 0.1), 0.0, uMaxCoc); }
      float cocSigned(float z) { return clamp(uAperture * (z - uFocus) / max(z, 0.1), -uMaxCoc, uMaxCoc); }`;
    const dofU = () => ({ uFocus: { value: 30 }, uAperture: { value: 40 }, uMaxCoc: { value: 22 } });
    this.nearPass = new Pass(`
      varying vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; ${cocFn}
      void main() {
        float m = 0.0;
        for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
          float z = texture(uSrc, vUv + vec2(x, y) * uTexel).a;
          m = max(m, -cocSigned(z));
        }
        gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
      }`, { uSrc: { value: null }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, ...dofU() });
    this.nearBlur = new Pass(`
      varying vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel;
      void main() {
        float m = 0.0;
        for (int y = -3; y <= 3; y++) for (int x = -3; x <= 3; x++) m = max(m, texture(uSrc, vUv + vec2(x, y) * uTexel).r);
        gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
      }`, { uSrc: { value: null }, uTexel: { value: new THREE.Vector2(4 / w, 4 / h) } });
    this.dofPass = new Pass(`
      varying vec2 vUv; uniform sampler2D uSrc, uNear; uniform vec2 uTexel; ${cocFn}
      void main() {
        vec4 c0 = texture(uSrc, vUv);
        float r0 = coc(c0.a);
        float rn = texture(uNear, vUv).r;
        float R = max(r0, rn);
        if (R < 0.9) { gl_FragColor = c0; return; }
        vec3 acc = c0.rgb; float wsum = 1.0;
        const float GA = 2.39996323;
        for (int i = 1; i < 30; i++) {
          float fi = float(i);
          float rr = sqrt(fi / 30.0) * R;
          vec2 o = vec2(cos(fi * GA), sin(fi * GA)) * rr;
          vec4 s = texture(uSrc, vUv + o * uTexel);
          float sc = coc(s.a);
          // background samples may not bleed over a sharper foreground
          float cw = (s.a > c0.a + 1.0) ? min(sc, r0) : sc;
          float w = clamp(cw - rr + 1.0, 0.0, 1.0);
          acc += s.rgb * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, c0.a);
      }`, { uSrc: { value: null }, uNear: { value: null }, uTexel: { value: new THREE.Vector2(1 / w, 1 / h) }, ...dofU() });
    this.dofUniformSets = [this.nearPass.uniforms, this.dofPass.uniforms];

    this.down = new Pass(`
      varying vec2 vUv; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uFirst;
      vec3 s(vec2 o) { vec3 c = texture(uSrc, vUv + o * uTexel).rgb; return c; }
      void main() {
        vec3 a = s(vec2(-1, -1)) + s(vec2(1, -1)) + s(vec2(-1, 1)) + s(vec2(1, 1));
        vec3 b = s(vec2(-2, 0)) + s(vec2(2, 0)) + s(vec2(0, -2)) + s(vec2(0, 2));
        vec3 c = s(vec2(0));
        vec3 col = c * 0.25 + a * 0.125 + b * 0.0625;
        if (uFirst > 0.5) { float l = max(max(col.r, col.g), col.b); col *= smoothstep(0.35, 1.6, l); }
        gl_FragColor = vec4(min(col, vec3(60.0)), 1.0);
      }`, { uSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 0 } });
    this.up = new Pass(`
      varying vec2 vUv; uniform sampler2D uSrc, uBase; uniform vec2 uTexel; uniform float uW;
      void main() {
        vec3 c = vec3(0.0);
        c += texture(uSrc, vUv + vec2(-1, -1) * uTexel).rgb;
        c += texture(uSrc, vUv + vec2(0, -1) * uTexel).rgb * 2.0;
        c += texture(uSrc, vUv + vec2(1, -1) * uTexel).rgb;
        c += texture(uSrc, vUv + vec2(-1, 0) * uTexel).rgb * 2.0;
        c += texture(uSrc, vUv).rgb * 4.0;
        c += texture(uSrc, vUv + vec2(1, 0) * uTexel).rgb * 2.0;
        c += texture(uSrc, vUv + vec2(-1, 1) * uTexel).rgb;
        c += texture(uSrc, vUv + vec2(0, 1) * uTexel).rgb * 2.0;
        c += texture(uSrc, vUv + vec2(1, 1) * uTexel).rgb;
        gl_FragColor = vec4(c / 16.0 + texture(uBase, vUv).rgb * uW, 1.0);
      }`, { uSrc: { value: null }, uBase: { value: null }, uTexel: { value: new THREE.Vector2() }, uW: { value: 1 } });

    this.final = new Pass(GLSL_NOISE + `
      varying vec2 vUv;
      uniform sampler2D uSrc, uBloom;
      uniform float uBloomK, uExposure, uFade, uTime, uGrain, uAspect;
      vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        vec2 uv = vUv;
        vec2 cc = uv - 0.5;
        float r2 = dot(cc * vec2(uAspect, 1.0), cc * vec2(uAspect, 1.0));
        // subtle lateral chromatic aberration toward the edges
        float ca = 0.0012 * r2;
        vec3 col;
        col.r = texture(uSrc, uv + cc * ca).r;
        col.g = texture(uSrc, uv).g;
        col.b = texture(uSrc, uv - cc * ca).b;
        vec3 bl = texture(uBloom, uv).rgb;
        col += bl * uBloomK;
        col *= uExposure;
        // vignette
        col *= mix(1.0, 0.30, smoothstep(0.08, 0.95, r2));
        col = aces(col);
        // grade: cool shadows, warm highlights, slightly lifted blacks
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, col * vec3(0.90, 0.98, 1.10), (1.0 - smoothstep(0.0, 0.45, l)) * 0.6);
        col = mix(col, col * vec3(1.05, 1.0, 0.93), smoothstep(0.5, 1.0, l) * 0.5);
        col = mix(vec3(l), col, 0.92);
        col = col * 0.975 + vec3(0.006, 0.007, 0.010);
        col *= uFade;
        vec3 s = toSRGB(clamp(col, 0.0, 1.0));
        // film grain (luma-weighted, per-frame)
        float g = hash3i(ivec3(ivec2(gl_FragCoord.xy), int(uTime * 30.0))) - 0.5;
        float g2 = hash3i(ivec3(ivec2(gl_FragCoord.xy * 0.5), int(uTime * 30.0) + 99)) - 0.5;
        float gm = (g * 0.6 + g2 * 0.4) * uGrain * (0.55 + 0.6 * (1.0 - abs(l - 0.35)));
        s += gm;
        // dither
        s += (hash3i(ivec3(ivec2(gl_FragCoord.xy), 7)) - 0.5) / 255.0;
        gl_FragColor = vec4(s, 1.0);
      }`, {
      uSrc: { value: null }, uBloom: { value: null }, uBloomK: { value: 0.16 }, uExposure: { value: 1.0 },
      uFade: { value: 1 }, uTime: { value: 0 }, uGrain: { value: 0.045 }, uAspect: { value: w / h },
    });
  }

  setDof(focus, aperture, maxCoc = 22) {
    const k = this.h / 1080;
    for (const u of this.dofUniformSets) { u.uFocus.value = focus; u.uAperture.value = aperture * k; u.uMaxCoc.value = maxCoc * k; }
  }

  run(sceneTex, fluid, opts) {
    const r = this.r;
    const fu = this.fireComp.uniforms;
    fu.uScene.value = sceneTex; fu.uScal.value = fluid.scal.read.texture; fu.uVel.value = fluid.vel.read.texture;
    fu.uTime.value = opts.time; fu.uFireGain.value = opts.fireGain ?? 1; fu.uSmokeGain.value = opts.smokeGain ?? 0.85;
    this.fireComp.render(r, this.comp);

    let src = this.comp.texture;
    if (opts.dof) {
      this.nearPass.uniforms.uSrc.value = src;
      this.nearPass.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
      this.nearPass.render(r, this.nearCoc);
      this.nearBlur.uniforms.uSrc.value = this.nearCoc.texture;
      this.nearBlur.render(r, this.nearCoc2);
      this.dofPass.uniforms.uSrc.value = src;
      this.dofPass.uniforms.uNear.value = this.nearCoc2.texture;
      this.dofPass.render(r, this.dof);
      src = this.dof.texture;
    }

    // bloom
    let prev = src, pw = this.w, ph = this.h;
    this.mips.forEach((m, i) => {
      this.down.uniforms.uSrc.value = prev;
      this.down.uniforms.uTexel.value.set(1 / pw, 1 / ph);
      this.down.uniforms.uFirst.value = i === 0 ? 1 : 0;
      this.down.render(r, m);
      prev = m.texture; pw = m.width; ph = m.height;
    });
    let upSrc = this.mips[this.mips.length - 1].texture;
    for (let i = this.mips.length - 2; i >= 0; i--) {
      const m = this.mips[i + 1];
      this.up.uniforms.uSrc.value = upSrc;
      this.up.uniforms.uBase.value = this.mips[i].texture;
      this.up.uniforms.uTexel.value.set(1 / m.width, 1 / m.height);
      this.up.uniforms.uW.value = 1.0;
      this.up.render(r, this.ups[i]);
      upSrc = this.ups[i].texture;
    }

    const fin = this.final.uniforms;
    fin.uSrc.value = src; fin.uBloom.value = upSrc;
    fin.uFade.value = opts.fade; fin.uTime.value = opts.time; fin.uExposure.value = opts.exposure ?? 1;
    fin.uBloomK.value = opts.bloom ?? 0.16;
    this.final.render(r, null);
  }
}
