// Sparks (motion-blurred streaks) and ash flakes (tumbling, ember-edged).
import * as THREE from 'three';
import { GLSL_NOISE } from './noise.js';
import { FRAG_OUT } from './gpu.js';

const MAX_SPARKS = 2600;
const MAX_ASH = 1600;

// alpha channel holds linear depth for DOF, so never write it from particles
function keepAlpha(mat, additive) {
  mat.blending = THREE.CustomBlending;
  mat.blendEquation = THREE.AddEquation;
  mat.blendSrc = additive ? THREE.OneFactor : THREE.SrcAlphaFactor;
  mat.blendDst = additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor;
  mat.blendEquationAlpha = THREE.AddEquation;
  mat.blendSrcAlpha = THREE.ZeroFactor;
  mat.blendDstAlpha = THREE.OneFactor;
  mat.transparent = true;
  mat.depthWrite = false;
  return mat;
}

export class Particles {
  constructor(rng) {
    this.rng = rng;
    this.sparks = [];
    this.ash = [];

    // ---------------------------------------------------------- sparks
    const sg = new THREE.InstancedBufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    this.sPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPARKS * 4), 4); // xyz, temp
    this.sVel = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPARKS * 4), 4); // vel xyz, size
    this.sPos.setUsage(THREE.DynamicDrawUsage); this.sVel.setUsage(THREE.DynamicDrawUsage);
    sg.setAttribute('iPos', this.sPos); sg.setAttribute('iVel', this.sVel);
    sg.instanceCount = 0;
    this.sparkMat = keepAlpha(new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { uRes: { value: new THREE.Vector2(1920, 1080) }, uShutter: { value: 1 / 90 }, uGain: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec4 iPos; attribute vec4 iVel;
        uniform vec2 uRes; uniform float uShutter;
        varying vec2 vQ; varying float vT; varying float vLen;
        void main() {
          vec4 a = projectionMatrix * viewMatrix * vec4(iPos.xyz, 1.0);
          vec4 b = projectionMatrix * viewMatrix * vec4(iPos.xyz - iVel.xyz * uShutter, 1.0);
          vec2 sa = a.xy / a.w * uRes * 0.5, sb = b.xy / b.w * uRes * 0.5;
          vec2 d = sa - sb; float len = length(d);
          vec2 dir = len > 1e-3 ? d / len : vec2(1.0, 0.0);
          vec2 nrm = vec2(-dir.y, dir.x);
          float w = iVel.w * (1.2 + 0.6 * iPos.w) * 60.0 / a.w;   // px
          w = clamp(w, 0.8, 9.0);
          vec2 s = mix(sb - dir * w, sa + dir * w, position.x) + nrm * position.y * w;
          vLen = len + 2.0 * w; vQ = vec2(position.x * vLen, position.y * w); vT = iPos.w;
          vQ.x = (position.x - 0.5) * vLen;
          vec2 ndc = s / (uRes * 0.5);
          float wz = mix(b.w, a.w, position.x);
          gl_Position = vec4(ndc * wz, mix(b.z, a.z, position.x), wz);
          vT = iPos.w * min(1.0, 3.0 * w / vLen + 0.35);   // energy spread along streak
        }`,
      fragmentShader: FRAG_OUT + /* glsl */ `
        varying vec2 vQ; varying float vT; varying float vLen;
        uniform float uGain;
        vec3 ramp(float x) {
          vec3 c = mix(vec3(0.6, 0.04, 0.0), vec3(1.0, 0.35, 0.05), smoothstep(0.0, 0.4, x));
          c = mix(c, vec3(1.0, 0.75, 0.35), smoothstep(0.4, 0.8, x));
          return mix(c, vec3(1.0, 0.95, 0.85), smoothstep(0.8, 1.2, x));
        }
        void main() {
          float hw = 1.0;
          float across = vQ.y;
          float along = max(abs(vQ.x) - (vLen * 0.5 - 1.0), 0.0);
          float d = length(vec2(along, across));
          float k = exp(-d * d * 2.2);
          vec3 c = ramp(vT) * k * (0.8 + 9.0 * vT * vT) * uGain;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: true,
    }), true);
    this.sparkMesh = new THREE.Mesh(sg, this.sparkMat);
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.renderOrder = 10;

    // ---------------------------------------------------------- ash
    const ag = new THREE.InstancedBufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ASH * 4), 4); // xyz, size
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ASH * 4), 4); // quaternion
    this.aMisc = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ASH * 4), 4); // temp, seed, fade, char
    for (const a of [this.aPos, this.aRot, this.aMisc]) a.setUsage(THREE.DynamicDrawUsage);
    ag.setAttribute('iPos', this.aPos); ag.setAttribute('iRot', this.aRot); ag.setAttribute('iMisc', this.aMisc);
    ag.instanceCount = 0;
    this.ashMat = keepAlpha(new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      side: THREE.DoubleSide,
      uniforms: { uKeyDir: { value: new THREE.Vector3(-0.42, 0.78, -0.46).normalize() }, uFireBoost: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 iPos; attribute vec4 iRot; attribute vec4 iMisc;
        varying vec2 vP; varying vec4 vMisc; varying vec3 vN;
        vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
        void main() {
          vec3 lp = vec3(position.xy * iPos.w, 0.0);
          lp.z = 0.15 * iPos.w * (position.x * position.x - 0.3);
          vec3 wp = iPos.xyz + qrot(iRot, lp);
          vN = qrot(iRot, vec3(0.0, 0.0, 1.0));
          vP = position.xy; vMisc = iMisc;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: FRAG_OUT + GLSL_NOISE + /* glsl */ `
        varying vec2 vP; varying vec4 vMisc; varying vec3 vN;
        uniform vec3 uKeyDir; uniform float uFireBoost;
        void main() {
          float seed = vMisc.y;
          vec2 p = vP;
          float r = length(p);
          float edge = 0.62 + 0.38 * fbm2(vec2(atan(p.y, p.x) * 1.4 + seed * 37.0, seed * 11.0), 3);
          float n = fbm2(p * 2.5 + seed * 19.0, 3);
          float m = edge - r - (n - 0.5) * 0.35;
          if (m < 0.0) discard;
          float rimD = smoothstep(0.07, 0.0, m);
          float lit = abs(dot(normalize(vN), uKeyDir)) * 0.6 + 0.4;
          float thin = smoothstep(0.0, 0.25, m);
          vec3 base = mix(vec3(0.014, 0.012, 0.011), vec3(0.16, 0.15, 0.14), vMisc.w * smoothstep(0.45, 0.8, n));
          base *= 0.25 + 0.3 * lit;
          float T = vMisc.x;
          // embers live on broken segments of the torn edge
          float seg = smoothstep(0.45, 0.7, fbm2(vec2(atan(p.y, p.x) * 2.2 + seed * 13.0, seed * 5.0), 2));
          vec3 glow = mix(vec3(0.9, 0.12, 0.0), vec3(1.0, 0.6, 0.2), smoothstep(0.3, 1.0, T));
          vec3 col = base + glow * T * T * rimD * seg * 3.0 * (1.0 + uFireBoost * 0.5);
          gl_FragColor = vec4(col, vMisc.z * mix(0.55, 0.95, thin));
        }`,
      depthTest: true,
    }), false);
    this.ashMesh = new THREE.Mesh(ag, this.ashMat);
    this.ashMesh.frustumCulled = false;
    this.ashMesh.renderOrder = 9;
  }

  spawnSpark(pos, vel, temp = 1, size = 0.05, life = 1.2) {
    if (this.sparks.length >= MAX_SPARKS) return;
    this.sparks.push({ p: pos.clone(), v: vel.clone(), T: temp, s: size, life, age: 0, ph: this.rng() * 100 });
  }
  spawnAsh(pos, vel, size, temp, charness = 1) {
    if (this.ash.length >= MAX_ASH) return;
    const r = this.rng;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (r() - 0.5) * 0.6, r() * 6.28, (r() - 0.5) * 0.6));
    const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    this.ash.push({ p: pos.clone(), v: vel.clone(), q, axis, w: 1 + r() * 5, s: size, T: temp, seed: r(), age: 0,
      life: 2.2 + r() * 2.5, ch: charness, flut: r() * 6.28 });
  }

  update(dt, t, wind, turb) {
    const tmp = new THREE.Vector3();
    // sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      s.T -= dt / s.life;
      if (s.T <= 0 || s.p.y < -0.5) { this.sparks.splice(i, 1); continue; }
      const k = 1.6;
      s.v.x += ((wind.x - s.v.x) * k + turb(s.p, t, s.ph, 0) * 70) * dt;
      s.v.y += ((wind.y - s.v.y) * k * 0.4 + 26 * s.T - 9 + turb(s.p, t, s.ph, 1) * 70) * dt;
      s.v.z += ((wind.z - s.v.z) * k + turb(s.p, t, s.ph, 2) * 70) * dt;
      s.p.addScaledVector(s.v, dt);
    }
    // ash
    for (let i = this.ash.length - 1; i >= 0; i--) {
      const a = this.ash[i];
      a.age += dt;
      a.T = Math.max(0, a.T - dt * 0.55);
      if (a.age > a.life || a.p.y < -1) { this.ash.splice(i, 1); continue; }
      const k = 3.2;
      const lift = 12 * a.T + 9.0 * Math.exp(-a.age * 0.8) - 1.2;   // flakes ride the hot plume up
      a.v.x += ((wind.x - a.v.x) * k + turb(a.p, t * 0.6, a.seed * 50, 0) * 36) * dt;
      a.v.y += ((wind.y - a.v.y) * k * 0.6 + lift + turb(a.p, t * 0.6, a.seed * 50, 1) * 30) * dt;
      a.v.z += ((wind.z - a.v.z) * k + turb(a.p, t * 0.6, a.seed * 50, 2) * 36) * dt;
      // flutter
      a.v.x += Math.sin(t * 3.1 + a.flut) * 4 * dt;
      a.p.addScaledVector(a.v, dt);
      if (a.p.y < 0.05 + a.s * 0.2) { a.p.y = 0.05 + a.s * 0.2; a.v.multiplyScalar(0.3); a.w *= 0.9; }
      tmp.copy(a.axis);
      const dq = new THREE.Quaternion().setFromAxisAngle(tmp, a.w * dt * (1 + a.v.length() * 0.08));
      a.q.premultiply(dq);
    }
  }

  upload(gain = 1) {
    const n = this.sparks.length;
    const P = this.sPos.array, V = this.sVel.array;
    for (let i = 0; i < n; i++) {
      const s = this.sparks[i];
      P[i * 4] = s.p.x; P[i * 4 + 1] = s.p.y; P[i * 4 + 2] = s.p.z;
      // twinkle
      P[i * 4 + 3] = s.T * (0.8 + 0.2 * Math.sin(s.age * 40 + s.ph));
      V[i * 4] = s.v.x; V[i * 4 + 1] = s.v.y; V[i * 4 + 2] = s.v.z; V[i * 4 + 3] = s.s;
    }
    this.sparkMesh.geometry.instanceCount = n;
    this.sPos.needsUpdate = true; this.sVel.needsUpdate = true;
    this.sparkMat.uniforms.uGain.value = gain;

    const m = this.ash.length;
    const A = this.aPos.array, R = this.aRot.array, M = this.aMisc.array;
    for (let i = 0; i < m; i++) {
      const a = this.ash[i];
      A[i * 4] = a.p.x; A[i * 4 + 1] = a.p.y; A[i * 4 + 2] = a.p.z; A[i * 4 + 3] = a.s;
      R[i * 4] = a.q.x; R[i * 4 + 1] = a.q.y; R[i * 4 + 2] = a.q.z; R[i * 4 + 3] = a.q.w;
      const fade = Math.min(1, a.age * 6) * Math.min(1, (a.life - a.age) / 1.2);
      M[i * 4] = a.T; M[i * 4 + 1] = a.seed; M[i * 4 + 2] = Math.max(0, fade); M[i * 4 + 3] = a.ch;
    }
    this.ashMesh.geometry.instanceCount = m;
    this.aPos.needsUpdate = true; this.aRot.needsUpdate = true; this.aMisc.needsUpdate = true;
  }
}
