// Screen-space 2D smoke/fire solver (stable fluids + vorticity confinement).
// Temperature drives buoyancy; flames are rendered from temperature, smoke
// from density. Sources come from a low-res render of the burning prints.
import * as THREE from 'three';
import { Pass, PingPong, rt } from './gpu.js';
import { GLSL_NOISE } from './noise.js';

const HEAD = /* glsl */ `
varying vec2 vUv;
uniform vec2 uTexel;
uniform float uAspect;
`;

export class FireFluid {
  constructor(renderer, w, h) {
    this.r = renderer;
    this.w = w; this.h = h;
    this.vel = new PingPong(w, h);
    this.scal = new PingPong(w, h);
    this.prs = new PingPong(w, h);
    this.div = rt(w, h);
    this.curl = rt(w, h);
    this.source = rt(w, h, { depthBuffer: true });
    const texel = { value: new THREE.Vector2(1 / w, 1 / h) };
    this.aspect = { value: w / h };
    // units: screen heights, seconds
    this.params = {
      buoyancy: 9.0, smokeWeight: 0.6, cool: 5.2, smokeDecay: 0.9, heatRate: 9.0, smokeRate: 2.2,
      injectVel: 4.0, vort: 0.10, turb: 5.0, windK: 1.4,
    };
    this.wind = new THREE.Vector2(0, 0);

    this.curlPass = new Pass(HEAD + /* glsl */ `
      uniform sampler2D uVel;
      void main() {
        float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
        float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
        float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
        gl_FragColor = vec4(0.5 * ((R - L) - (T - B)) / uTexel.y, 0.0, 0.0, 1.0);
      }`, { uTexel: texel, uAspect: this.aspect, uVel: { value: null } });

    this.forcePass = new Pass(HEAD + GLSL_NOISE + /* glsl */ `
      uniform sampler2D uVel, uCurl, uScal, uSrc;
      uniform float uDt, uBuoy, uSmokeW, uVort, uInject, uTurb, uTime, uWindK;
      uniform vec2 uWind;
      void main() {
        vec2 v = texture(uVel, vUv).xy;
        float L = abs(texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x);
        float R = abs(texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x);
        float B = abs(texture(uCurl, vUv - vec2(0.0, uTexel.y)).x);
        float T = abs(texture(uCurl, vUv + vec2(0.0, uTexel.y)).x);
        float C = texture(uCurl, vUv).x;
        vec2 f = 0.5 * vec2(T - B, R - L);
        f /= length(f) + 1e-4;
        f *= uVort * C; f.y *= -1.0;
        vec4 sc = texture(uScal, vUv);
        vec4 src = texture(uSrc, vUv);
        vec2 acc = f;
        acc.y += uBuoy * sc.x - uSmokeW * sc.y;
        acc.y += uInject * src.r;
        // turbulent eddies, stronger where it's hot
        vec2 q = vUv * vec2(9.0 * uAspect / 1.7778, 5.0);
        float n1 = fbm3(vec3(q, uTime * 1.3), 3) - 0.5;
        float n2 = fbm3(vec3(q + 7.7, uTime * 1.3 + 3.1), 3) - 0.5;
        acc += vec2(n1, n2 * 0.6) * uTurb * (0.25 + min(sc.x, 2.0));
        acc += (uWind - v) * uWindK * smoothstep(0.0, 0.3, sc.x + sc.y + 0.02);
        v += acc * uDt;
        v *= 0.995;
        gl_FragColor = vec4(v, 0.0, 1.0);
      }`, {
      uTexel: texel, uAspect: this.aspect, uVel: { value: null }, uCurl: { value: null }, uScal: { value: null }, uSrc: { value: null },
      uDt: { value: 0 }, uBuoy: { value: 0 }, uSmokeW: { value: 0 }, uVort: { value: 0 }, uInject: { value: 0 },
      uTurb: { value: 0 }, uTime: { value: 0 }, uWind: { value: this.wind }, uWindK: { value: 0 },
    });

    this.advectPass = new Pass(HEAD + /* glsl */ `
      uniform sampler2D uVel, uField, uSrc;
      uniform float uDt, uDecayX, uDecayY, uAddX, uAddY, uMode;
      void main() {
        vec2 v = texture(uVel, vUv).xy;
        vec2 p = vUv - uDt * v * vec2(1.0 / uAspect, 1.0);
        vec4 q = texture(uField, p);
        if (uMode > 0.5) {
          vec4 src = texture(uSrc, vUv);
          q.x = q.x * exp(-uDecayX * uDt) + src.r * uAddX * uDt;
          q.y = q.y * exp(-uDecayY * uDt) + src.g * uAddY * uDt;
          q.x = min(q.x, 4.0); q.y = min(q.y, 3.0);
        } else {
          q.xy *= 0.999;
        }
        // open boundaries: fade at the frame edge
        vec2 e = min(vUv, 1.0 - vUv);
        q *= smoothstep(0.0, 0.01, min(e.x, e.y));
        gl_FragColor = q;
      }`, {
      uTexel: texel, uAspect: this.aspect, uVel: { value: null }, uField: { value: null }, uSrc: { value: null }, uDt: { value: 0 },
      uDecayX: { value: 0 }, uDecayY: { value: 0 }, uAddX: { value: 0 }, uAddY: { value: 0 }, uMode: { value: 0 },
    });

    this.divPass = new Pass(HEAD + /* glsl */ `
      uniform sampler2D uVel;
      void main() {
        float L = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
        float T = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
        gl_FragColor = vec4(0.5 * (R - L + T - B) / uTexel.y, 0.0, 0.0, 1.0);
      }`, { uTexel: texel, uAspect: this.aspect, uVel: { value: null } });

    this.jacobiPass = new Pass(HEAD + /* glsl */ `
      uniform sampler2D uP, uDiv;
      void main() {
        float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
        float d = texture(uDiv, vUv).x;
        gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
      }`, { uTexel: texel, uAspect: this.aspect, uP: { value: null }, uDiv: { value: null } });

    this.gradPass = new Pass(HEAD + /* glsl */ `
      uniform sampler2D uP, uVel;
      void main() {
        float L = texture(uP, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture(uP, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture(uP, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture(uP, vUv + vec2(0.0, uTexel.y)).x;
        vec2 v = texture(uVel, vUv).xy - 0.5 * vec2(R - L, T - B) * uTexel.y;
        gl_FragColor = vec4(v, 0.0, 1.0);
      }`, { uTexel: texel, uAspect: this.aspect, uP: { value: null }, uVel: { value: null } });

    this.scalePass = new Pass(HEAD + /* glsl */ `
      uniform sampler2D uP; uniform float uK;
      void main() { gl_FragColor = texture(uP, vUv) * uK; }`, { uTexel: texel, uAspect: this.aspect, uP: { value: null }, uK: { value: 0.8 } });

    this.clearAll();
  }

  clearAll() {
    const r = this.r;
    const prev = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    for (const t of [this.vel.a, this.vel.b, this.scal.a, this.scal.b, this.prs.a, this.prs.b, this.div, this.curl, this.source]) {
      r.setRenderTarget(t); r.clear(true, true, false);
    }
    r.setClearColor(0x000000, prev);
  }

  step(dt, time) {
    const P = this.params, r = this.r;
    this.curlPass.uniforms.uVel.value = this.vel.read.texture;
    this.curlPass.render(r, this.curl);

    const fu = this.forcePass.uniforms;
    fu.uVel.value = this.vel.read.texture; fu.uCurl.value = this.curl.texture;
    fu.uScal.value = this.scal.read.texture; fu.uSrc.value = this.source.texture;
    fu.uDt.value = dt; fu.uBuoy.value = P.buoyancy; fu.uSmokeW.value = P.smokeWeight; fu.uVort.value = P.vort;
    fu.uInject.value = P.injectVel; fu.uTurb.value = P.turb; fu.uTime.value = time; fu.uWindK.value = P.windK;
    this.forcePass.render(r, this.vel.write); this.vel.swap();

    const au = this.advectPass.uniforms;
    au.uVel.value = this.vel.read.texture; au.uField.value = this.vel.read.texture; au.uDt.value = dt; au.uMode.value = 0;
    this.advectPass.render(r, this.vel.write); this.vel.swap();

    this.divPass.uniforms.uVel.value = this.vel.read.texture;
    this.divPass.render(r, this.div);
    this.scalePass.uniforms.uP.value = this.prs.read.texture;
    this.scalePass.render(r, this.prs.write); this.prs.swap();
    const ju = this.jacobiPass.uniforms;
    ju.uDiv.value = this.div.texture;
    for (let i = 0; i < 18; i++) {
      ju.uP.value = this.prs.read.texture;
      this.jacobiPass.render(r, this.prs.write); this.prs.swap();
    }
    const gu = this.gradPass.uniforms;
    gu.uP.value = this.prs.read.texture; gu.uVel.value = this.vel.read.texture;
    this.gradPass.render(r, this.vel.write); this.vel.swap();

    au.uVel.value = this.vel.read.texture; au.uField.value = this.scal.read.texture; au.uSrc.value = this.source.texture;
    au.uMode.value = 1; au.uDecayX.value = P.cool; au.uDecayY.value = P.smokeDecay;
    au.uAddX.value = P.heatRate; au.uAddY.value = P.smokeRate;
    this.advectPass.render(r, this.scal.write); this.scal.swap();
  }
}
