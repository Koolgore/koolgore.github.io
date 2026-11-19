// A single instant-film print: card geometry, burn field, developing text,
// and the three render passes it takes part in (shadow depth, fire source, beauty).
import * as THREE from 'three';
import { GLSL_NOISE, fbm2, gnoise } from './noise.js';
import { GLSL_LIGHTING, GLSL_COVER, coverUniforms } from './lighting.js';
import { FRAG_OUT, Pass } from './gpu.js';

export const CARD_W = 8.8, CARD_H = 10.7;
export const IMG = { x0: -3.95, y0: -3.15, x1: 3.95, y1: 4.75 };
export const MAX_IGN = 3;
export const MAX_WORDS = 16;

const GLSL_BURN_PROC = /* glsl */ `
uniform vec4 uIgn[${MAX_IGN}];
uniform float uSeed;
const vec2 CARD = vec2(${CARD_W.toFixed(2)}, ${CARD_H.toFixed(2)});
float burnTimeProc(vec2 p) {
  vec2 sp = p + vec2(uSeed * 13.1, uSeed * 7.3);
  vec2 w = vec2(fbm2(sp * 0.32, 3), fbm2(sp * 0.32 + vec2(19.7, 4.1), 3)) - 0.5;
  float jag = (fbm2(sp * 1.15 + 3.3, 4) - 0.5) * 1.7 + (gnoise(sp * 4.3) - 0.5) * 0.35;
  float best = 1e6;
  for (int i = 0; i < ${MAX_IGN}; i++) {
    vec4 g = uIgn[i];
    if (g.z > 9000.0) continue;
    float d = max(length(p + w * 2.4 - g.xy) + jag, 0.0);
    best = min(best, g.z + 0.32 + d / g.w);
  }
  return best;
}
float crumbleProc(vec2 p) { return 0.40 + 0.55 * fbm2(p * 0.9 + uSeed * 3.0, 3); }
`;

// Runtime: burn time / crumble delay are baked into a texture per print
const GLSL_BURN = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uBurning;
uniform sampler2D uBurnTex;
uniform float uBurnBase;
const vec2 CARD = vec2(${CARD_W.toFixed(2)}, ${CARD_H.toFixed(2)});
vec2 burnTex(vec2 p) { return textureLod(uBurnTex, p / CARD + 0.5, 0.0).rg; }
float burnQ(vec2 p) { return uBurning > 0.5 ? uTime - (uBurnBase + burnTex(p).r) : -100.0; }
float crumbleAt(vec2 p) { return burnTex(p).g; }
`;

const VERT_COMMON = /* glsl */ `
${GLSL_NOISE}
${GLSL_BURN}
uniform float uBow;
uniform vec4 uBend;      // amplitude, axis angle, spatial freq, phase
uniform vec2 uCurl;      // amount, axis angle (whole-card curl from heat / wind)

float heightAt(vec2 p, float q) {
  float h = uBow * (0.55 * (p.x * p.x) / 19.36 + 0.25 * (p.y * p.y) / 28.6);
  vec2 ax = vec2(cos(uBend.y), sin(uBend.y));
  h += uBend.x * sin(dot(p, ax) * uBend.z + uBend.w);
  vec2 cx = vec2(cos(uCurl.y), sin(uCurl.y));
  float s = dot(p, cx);
  h += uCurl.x * s * s * 0.05;
  float heat = smoothstep(-1.0, 0.0, q);
  h += heat * heat * (0.06 + 0.20 * gnoise(p * 0.9 + uSeed));
  float c = smoothstep(0.0, 0.75, q);
  h += c * (0.20 + 0.85 * gnoise(p * 0.65 + uSeed + 5.0));
  return h;
}

varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNrm;
varying float vViewZ;

void deform(out vec3 objPos, out vec3 objNrm) {
  vec2 p = (uv - 0.5) * CARD;
  float e = 0.08;
  float q = burnQ(p);
  float h = heightAt(p, q);
  if (uBurning > 0.5 || abs(uBend.x) + abs(uCurl.x) > 0.0) {
    float hx = heightAt(p + vec2(e, 0.0), burnQ(p + vec2(e, 0.0)));
    float hy = heightAt(p + vec2(0.0, e), burnQ(p + vec2(0.0, e)));
    objNrm = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.0));
  } else {
    float hx = heightAt(p + vec2(e, 0.0), q);
    float hy = heightAt(p + vec2(0.0, e), q);
    objNrm = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.0));
  }
  objPos = vec3(p, h);
}
`;

const VERT_MAIN = /* glsl */ `
${VERT_COMMON}
void main() {
  vec3 op, on; deform(op, on);
  vec4 wp = modelMatrix * vec4(op, 1.0);
  vWorld = wp.xyz;
  vNrm = normalize(mat3(modelMatrix) * on);
  vUv = uv;
  vec4 mv = viewMatrix * wp;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_HEAD = FRAG_OUT + /* glsl */ `
${GLSL_NOISE}
${GLSL_BURN}
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNrm;
varying float vViewZ;
const vec4 IMG = vec4(${IMG.x0}, ${IMG.y0}, ${IMG.x1}, ${IMG.y1});

float cardMask(vec2 p) {
  vec2 dq = abs(p) - (CARD * 0.5 - 0.16);
  float sd = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - 0.16;
  float aa = max(fwidth(sd), 1e-4);
  return 1.0 - smoothstep(-aa, aa, sd);
}
`;

const FRAG_MAIN = /* glsl */ `
${FRAG_HEAD}
${GLSL_LIGHTING}
${GLSL_COVER}
uniform sampler2D uDetail;     // baked: grain, smudge, mottle, reagent
uniform sampler2D uTextNoise;  // baked: chem, density, fine
uniform sampler2D uExpo;       // light-pen exposure: r = exposure, g = exposure * time
uniform sampler2D uGlow;       // light scattered inside the emulsion
uniform sampler2D uHal;        // halation bounced off the film base
uniform vec4 uPen;             // pen tip: film uv, intensity, spot radius (px @1024)
uniform vec2 uPenPrev;         // tip position half a frame earlier (motion blur)
uniform float uTauBase;
uniform float uTextGain;
uniform float uGhost;          // >0 for flying prints: long-developed, faint
uniform vec4 uLeak;            // edge fog: amount, direction (x,y), unused
uniform float uDepthScale;

void main() {
  if (coveredByPrint(vWorld)) { gl_FragColor = vec4(0.0, 0.0, 0.0, vViewZ); return; }
  vec2 p = (vUv - 0.5) * CARD;
  float q = burnQ(p);
  float L = crumbleAt(p);
#ifdef CAN_DISCARD
  float alpha = cardMask(p);
  float qa = max(fwidth(q), 1e-4);
  alpha *= 1.0 - smoothstep(L - qa, L + qa, q);
  if (alpha < 0.5) discard;
#endif

  vec3 N = normalize(vNrm);
  bool front = gl_FrontFacing;
  if (!front) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);

  // ---------------------------------------------------------------- regions
  float inImg = step(IMG.x, p.x) * step(p.x, IMG.z) * step(IMG.y, p.y) * step(p.y, IMG.w);
  vec2 eImg = min(p - IMG.xy, IMG.zw - p);
  float edgeD = min(eImg.x, eImg.y);           // distance into the image area
  float aaI = fwidth(edgeD) + 1e-4;
  float img = smoothstep(-aaI, aaI, edgeD);

  Surf s;
  s.emit = vec3(0.0);
  float bump = 0.0;

  // paper/plastic frame
  vec4 det = texture(uDetail, vUv);
  float grain = det.r;
  vec3 frameCol = vec3(0.86, 0.85, 0.865) * (0.965 + 0.05 * grain);
  frameCol *= 1.0 - 0.35 * smoothstep(0.80, 0.86, grain) * smoothstep(0.4, 0.7, det.g);   // grime specks
  // slight aging toward the outer edge and handling smudges
  float rim = smoothstep(0.55, 0.0, min(CARD.x * 0.5 - abs(p.x), CARD.y * 0.5 - abs(p.y)));
  frameCol *= mix(vec3(1.0), vec3(0.93, 0.90, 0.82), rim * 0.6);
  frameCol *= 1.0 - 0.05 * smoothstep(0.55, 0.8, det.g);
  // the image area sits slightly below the frame: soft inner shadow
  float inner = smoothstep(0.10, 0.0, edgeD) * img;

  // undeveloped/black instant film emulsion
  vec2 tuv = (p - IMG.xy) / (IMG.zw - IMG.xy);
  float mott = det.b;
  vec3 emul = vec3(0.016, 0.008, 0.005) * (0.75 + 0.5 * mott);
  // reagent spread irregularity along the edges of the image
  float reag = smoothstep(0.16, 0.0, edgeD + (det.a - 0.5) * 0.14);
  emul = mix(emul, vec3(0.035, 0.030, 0.022), reag * 0.6);

  // ------------------------------------------- words exposed by light
  // Model (all in exposure space until the response curve):
  //   exposure  = light strokes + scatter inside the emulsion + red-layer halation
  //   response  = per dye layer S-curve in log exposure (warm light saturates red first)
  //   chemistry = dye diffusion frays edges (isotropic feathering, thicker reagent bleeds more)
  //   timing    = each spot develops on its own clock, blotchy with reagent thickness
  vec3 textEmit = vec3(0.0);
  vec3 textAlb = vec3(0.0);
  if (inImg > 0.5) {
    vec4 tn = texture(uTextNoise, tuv);
    float reag = tn.r;                               // local reagent thickness
    vec2 feather = (tn.ba - 0.5);
    // when was this spot exposed? cores use their own time; the fringe uses the
    // smooth, wide halation estimate so there are no seams between the two
    vec4 ex0 = texture(uExpo, tuv);
    vec4 hl0 = texture(uHal, tuv);
    float tauS = hl0.r > 1e-4 ? hl0.g / hl0.r : 1e4;
    float tauC = ex0.r > 2e-3 ? ex0.g / ex0.r : tauS;
    float ageC = uTime - (uTauBase + tauC);
    float age = uTime - (uTauBase + tauS);
    if (uGhost > 0.0) { age = 12.0; ageC = 12.0; }
    // development clock: thicker reagent develops later and spreads further
    float tdev = age / (0.75 + 0.6 * reag);
    float tdevC = ageC / (0.75 + 0.6 * reag);
    float d1 = smoothstep(0.00, 0.55, tdevC);        // stroke cores come up first
    float d2 = smoothstep(0.15, 1.30, tdev);         // scatter fringe blossoms outward
    float d3 = smoothstep(0.40, 2.40, tdev);         // halation rim last
    // dye diffusion: read the image through a fraying, isotropic warp that grows
    // outward from the cores and with reagent thickness
    float bleed = (0.5 + 0.9 * reag) * (0.35 + 0.65 * d2);
    vec2 w1 = feather * 0.0040 * bleed;
    vec2 w2 = feather * 0.0110 * bleed;
    vec2 w3 = feather * 0.0160 * bleed;
    float Ed = texture(uExpo, tuv + w1).r;
    float Eg = texture(uGlow, tuv + w2).r;
    float Eh = texture(uHal, tuv + w3).r;
    // fibrous dye migration: ridged, direction-free tendrils thin and thicken the fringe
    float rid = 1.0 - abs(tn.b * 2.0 - 1.0);
    float rid2 = 1.0 - abs(tn.a * 2.0 - 1.0);
    float fib = mix(1.0, 0.35 + 1.1 * rid * rid2 + 0.25 * rid, 0.85 * d2);
    Eg *= fib; Eh *= mix(1.0, fib, 0.7);
    // edge fog: stray light along one side, stretched along the edge, slowly warped
    vec2 ctr = (p - 0.5 * (IMG.xy + IMG.zw)) / (0.5 * (IMG.zw - IMG.xy));
    float side = smoothstep(-0.2, 1.0, dot(normalize(ctr + 1e-4), uLeak.yz));
    float leak = uLeak.x * side * exp(-edgeD / (0.20 + 0.25 * reag)) * (0.25 + 0.95 * det.a);
    // exposure per dye layer. Warm light: red layer receives the most.
    vec3 spec = vec3(1.0, 0.50, 0.16);
    vec3 E = (Ed * d1 + 0.45 * Eg * d2) * spec;
    E.r += (0.75 * Eh + 0.10 * Eg) * d3;             // halation re-exposes the red layer
    E.g += 0.18 * Eh * d3;
    E += leak * vec3(1.0, 0.42, 0.10);
    // per-layer characteristic curve (positive): two sub-layers, sigmoid in log10 E
    vec3 lE = log2(max(E, 1e-5)) * 0.30103;
    vec3 fast = 1.0 / (1.0 + exp(-3.6 * (lE + 0.45)));
    vec3 slow = 1.0 / (1.0 + exp(-3.0 * (lE - 0.18)));
    vec3 pos = 0.45 * fast + 0.55 * slow;
    // dye clouds: development isn't perfectly smooth at any scale
    pos *= 0.93 + 0.14 * tn.g;
    // overexposed cores clip to the film's faintly lavender cream white
    pos = mix(pos, vec3(1.0, 0.955, 0.985), smoothstep(0.85, 1.0, min(pos.r, pos.g)));
    // early in development the image is dim and cool, warm colour arrives last
    vec3 cool = vec3(dot(pos, vec3(0.3, 0.5, 0.2))) * vec3(0.55, 0.68, 0.85);
    float tv = max(tdev, tdevC);
    vec3 print = mix(cool * 0.6, pos, smoothstep(0.25, 1.6, tv)) * smoothstep(0.0, 0.25, tv);
    print = max(print, vec3(0.0));
    textAlb = print;
    // a print doesn't glow; a little lift keeps it legible in the dark room
    textEmit = print * print * 0.32 * uTextGain;
    if (uGhost > 0.0) { textAlb *= uGhost; textEmit *= uGhost * 0.5; }
  }
  vec3 imgAlb = max(emul, textAlb);

  s.albedo = mix(frameCol, imgAlb, img);
  s.rough = mix(0.62, 0.11 + 0.05 * mott, img);
  s.f0 = mix(0.035, 0.05, img);
  s.sheen = mix(0.25, 1.0, img);
  s.emit = textEmit * img;
  bump = mix(grain * 0.0025, (mott - 0.5) * 0.004, img);
  s.albedo *= 1.0 - inner * 0.35;

  // ------------------------------------------------------------- burning
  if (q > -0.6) {
    float h = smoothstep(-0.55, 0.0, q);          // heat ahead of the front
    float hi = smoothstep(-0.30, 0.0, q);         // emulsion reacts later, closer to the flame
    // paper scorch: white -> straw -> amber -> brown -> black
    vec3 sc = mix(vec3(1.0), vec3(0.93, 0.80, 0.52), smoothstep(0.0, 0.45, h));
    sc = mix(sc, vec3(0.40, 0.21, 0.08), smoothstep(0.45, 0.85, h));
    sc = mix(sc, vec3(0.05, 0.03, 0.018), smoothstep(0.85, 0.99, h));
    vec3 frameBurn = frameCol * sc;
    // emulsion: blisters, cooking dyes with a faint oily sheen
    vec2 cell = cellular(p * 2.3 + uSeed * 5.0);
    float br = 0.40 * smoothstep(0.1, 0.8, hi);
    float blister = smoothstep(br, br - 0.20, cell.x) * smoothstep(0.05, 0.3, hi);
    float ph = fbm2(p * 0.9 + uSeed, 3) * 1.6 + hi * 0.9;
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ph));
    vec3 dye = vec3(0.10, 0.045, 0.02) + irid * 0.035;
    vec3 emBurn = mix(imgAlb, mix(imgAlb * vec3(1.0, 0.55, 0.25), dye, 0.6), smoothstep(0.05, 0.6, hi));
    emBurn = mix(emBurn, vec3(0.025, 0.015, 0.01), smoothstep(0.6, 0.95, hi));
    s.albedo = mix(frameBurn, emBurn, img);
    s.emit *= (1.0 - smoothstep(0.2, 0.75, mix(h, hi, img))) * mix(vec3(1.0), vec3(1.0, 0.45, 0.15), hi);
    bump += blister * img * 0.05 + h * (gnoise(p * 6.0) - 0.5) * 0.008;
    s.rough = mix(s.rough, 0.40, h * (1.0 - img));
    s.rough = mix(s.rough, 0.06, blister * img);

    // char
    float ch = smoothstep(-0.02, 0.04, q);
    float ashT = smoothstep(L - 0.22, L, q);
    float ashN = fbm2(p * 7.0 + uSeed, 3);
    vec3 charCol = vec3(0.010, 0.009, 0.009) * (0.8 + 0.4 * gnoise(p * 25.0));
    charCol = mix(charCol, vec3(0.075, 0.072, 0.07) * (0.6 + 0.8 * ashN), ashT * smoothstep(0.5, 0.75, ashN) * 0.8);
    s.albedo = mix(s.albedo, charCol, ch);
    s.rough = mix(s.rough, 0.55, ch);
    s.f0 = mix(s.f0, 0.045, ch);
    s.sheen = mix(s.sheen, 0.45, ch);
    // crinkled, blistered char at a coarser scale than the paper grain
    float crink = fbm2(p * 3.2 + uSeed * 2.0, 4);
    bump += ch * ((crink - 0.5) * 0.10 + (gnoise(p * 14.0) - 0.5) * 0.006);

    // embers: a thin, broken glowing edge; sparse cooling specks behind it
    float flick = 0.65 + 0.7 * vnoise3(vec3(p * 2.4, uTime * 6.5));
    float along = smoothstep(0.25, 0.8, vnoise3(vec3(p * 1.1, uTime * 0.9 + uSeed)));
    float wdt = 0.018 + 0.05 * gnoise(p * 3.1 + uSeed);
    float fLine = exp(-max(q, 0.0) / wdt) * smoothstep(-0.035, 0.0, q) * (0.25 + 0.95 * along);
    float specks = smoothstep(0.74, 0.92, gnoise(p * 11.0 + uSeed * 4.0)) * exp(-max(q, 0.0) / 0.16) * ch;
    float vein = (1.0 - smoothstep(0.0, 0.025, abs(gnoise(p * 2.2 + uSeed) - 0.5))) * exp(-max(q, 0.0) / 0.10) * ch;
    float rimE = smoothstep(L - 0.05, L, q) * 0.30 * smoothstep(0.4, 0.7, gnoise(p * 4.0 + uTime * 0.5));
    float T = (fLine + specks * 0.75 + vein * 0.55 + rimE) * flick;
    // radiant pre-glow right at the front on the paper
    T += smoothstep(0.92, 1.0, h) * (1.0 - ch) * 0.25 * along;
    s.emit += fireRamp(T) * pow(T, 1.8) * 3.6;
  }

  N = bumpNormal(N, vWorld, bump, 1.0);
  if (!front) {
    // black backing of the print
    s.albedo = vec3(0.02, 0.02, 0.022) * (0.9 + 0.2 * grain);
    s.rough = 0.55; s.sheen = 0.3;
    s.emit = s.emit * 0.6;
  }

  float sh = shadowAt(vWorld + N * 0.03, 2.6);
  vec3 col = shade(s, vWorld, N, V, sh);
  gl_FragColor = vec4(col, vViewZ);
}
`;

const FRAG_SHADOW = /* glsl */ `
${FRAG_HEAD}
void main() {
  vec2 p = (vUv - 0.5) * CARD;
  float q = burnQ(p);
  if (cardMask(p) < 0.5 || q > crumbleAt(p)) discard;
  gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
}
`;

// Fire source: where flames are born (r = heat, g = smoke, b = flame-velocity hint)
const FRAG_SOURCE = /* glsl */ `
${FRAG_HEAD}
uniform float uFireGain;
void main() {
  vec2 p = (vUv - 0.5) * CARD;
  float q = burnQ(p);
  float L = crumbleAt(p);
  if (cardMask(p) < 0.5 || q > L) discard;
  float inImg = step(IMG.x, p.x) * step(p.x, IMG.z) * step(IMG.y, p.y) * step(p.y, IMG.w);
  float front = smoothstep(-0.05, 0.02, q) * (1.0 - smoothstep(0.10, 0.42, q));
  float tongues = smoothstep(0.40, 0.70, fbm2(p * 1.2 + vec2(uSeed, -uTime * 1.7), 3));
  float flick = 0.6 + 0.8 * vnoise3(vec3(p * 1.4, uTime * 9.0));
  float heat = front * (0.35 + 1.0 * tongues) * flick;
  float linger = smoothstep(0.1, 0.25, q) * (1.0 - smoothstep(0.25, L, q)) * 0.25 * tongues;
  float smoke = front * mix(0.5, 1.2, inImg) + linger * 1.5;
  gl_FragColor = vec4((heat + linger) * uFireGain, smoke * uFireGain, front, 1.0);
}
`;

export class Polaroid {
  constructor({ seg = [88, 107], seed = 1, light = null, shared }) {
    this.seed = seed;
    this.light = light;
    this.geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, seg[0], seg[1]);
    this.uniforms = {
      uTime: shared.uTime,
      uIgn: { value: Array.from({ length: MAX_IGN }, () => new THREE.Vector4(0, 0, 1e5, 1)) },
      uSeed: { value: seed },
      uBurning: { value: 0 },
      uBow: { value: 0.05 + 0.04 * ((seed * 7) % 3) },
      uBend: { value: new THREE.Vector4(0, 0, 0, 0) },
      uCurl: { value: new THREE.Vector2(0, 0) },
      uDetail: { value: null },
      uBurnTex: { value: null },
      uBurnBase: { value: 0 },
      uTextNoise: { value: null },
      uExpo: { value: light ? light.textures.expo : null },
      uGlow: { value: light ? light.textures.glow : null },
      uHal: { value: light ? light.textures.hal : null },
      uPen: { value: new THREE.Vector4(0, 0, 0, 3) },
      uPenPrev: { value: new THREE.Vector2(0, 0) },
      uLeak: { value: new THREE.Vector4(0, -1, 0.3, 0) },
      uTauBase: { value: light ? light.base : 0 },
      uTextGain: { value: 1 },
      uGhost: { value: 0 },
      uDepthScale: { value: 1 },
      uFireGain: { value: 1 },
      ...shared.lighting,
      ...coverUniforms(),
    };
    const common = { uniforms: this.uniforms, glslVersion: THREE.GLSL3, side: THREE.DoubleSide };
    // intact prints use a variant without discard so early depth rejection works
    this.matMainSolid = new THREE.ShaderMaterial({ ...common, vertexShader: VERT_MAIN, fragmentShader: FRAG_MAIN });
    this.matMain = new THREE.ShaderMaterial({ ...common, vertexShader: VERT_MAIN, fragmentShader: FRAG_MAIN, defines: { CAN_DISCARD: 1 } });
    this.matShadow = new THREE.ShaderMaterial({ ...common, vertexShader: VERT_MAIN, fragmentShader: FRAG_SHADOW });
    this.matSource = new THREE.ShaderMaterial({ ...common, vertexShader: VERT_MAIN, fragmentShader: FRAG_SOURCE });
    this.mesh = new THREE.Mesh(this.geometry, this.matMain);
    this.mesh.frustumCulled = false;
    this.ign = [];
    this.alive = true;
  }

  // Static per-print noise, computed once on the GPU
  bake(renderer) {
    const mk = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });
    if (!Polaroid._bakeCard) {
      Polaroid._bakeCard = new Pass(GLSL_NOISE + `
        varying vec2 vUv; uniform float uSeed;
        const vec2 CARD = vec2(${CARD_W.toFixed(2)}, ${CARD_H.toFixed(2)});
        const vec4 IMG = vec4(${IMG.x0}, ${IMG.y0}, ${IMG.x1}, ${IMG.y1});
        void main() {
          vec2 p = (vUv - 0.5) * CARD;
          vec2 tuv = (p - IMG.xy) / (IMG.zw - IMG.xy);
          gl_FragColor = vec4(fbm2(p * 38.0, 2), fbm2(p * 0.9 + uSeed * 9.0, 3), fbm2(tuv * 5.0 + uSeed * 4.0, 4), fbm2(p * 3.0 + uSeed, 3));
        }`, { uSeed: { value: 0 } });
      Polaroid._bakeText = new Pass(GLSL_NOISE + `
        varying vec2 vUv; uniform float uSeed;
        void main() {
          vec2 tuv = vUv;
          // r: reagent thickness (slow), g: dye clouds (fine), ba: isotropic feathering warp
          float reag = fbm2(tuv * 5.0 + uSeed * 2.0, 4);
          float clouds = fbm2(tuv * 70.0 + uSeed * 5.0, 3);
          float fx = fbm2(tuv * 34.0 + uSeed, 3) * 0.6 + fbm2(tuv * 72.0 + uSeed + 3.3, 2) * 0.4;
          float fy = fbm2(tuv * 34.0 + uSeed + vec2(13.7, 5.1), 3) * 0.6 + fbm2(tuv * 72.0 + uSeed + 9.1, 2) * 0.4;
          gl_FragColor = vec4(reag, clouds, fx, fy);
        }`, { uSeed: { value: 0 } });
    }
    // burn field (relative to the earliest ignition so half floats keep precision)
    if (!Polaroid._bakeBurn) {
      Polaroid._bakeBurn = new Pass(GLSL_NOISE + GLSL_BURN_PROC + `
        varying vec2 vUv; uniform float uBase;
        void main() { vec2 p = (vUv - 0.5) * CARD; gl_FragColor = vec4(min(burnTimeProc(p) - uBase, 60000.0), crumbleProc(p), 0.0, 1.0); }`,
        { uIgn: { value: null }, uSeed: { value: 0 }, uBase: { value: 0 } });
    }
    const big = this.fly ? 1 : 2;
    this.burnRT = new THREE.WebGLRenderTarget(512 * big, 623 * big, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });
    const base = this.ign.length ? Math.min(...this.ign.map((g) => g.t)) : 0;
    Object.assign(Polaroid._bakeBurn.uniforms, { uIgn: this.uniforms.uIgn, uSeed: { value: this.seed }, uBase: { value: base } });
    Polaroid._bakeBurn.material.uniforms = Polaroid._bakeBurn.uniforms;
    Polaroid._bakeBurn.render(renderer, this.burnRT);
    this.uniforms.uBurnTex.value = this.burnRT.texture;
    this.uniforms.uBurnBase.value = base;

    this.detailRT = mk(1024, 1246);
    this.textNoiseRT = mk(1024, 1024);
    Polaroid._bakeCard.uniforms.uSeed.value = this.seed;
    Polaroid._bakeCard.render(renderer, this.detailRT);
    Polaroid._bakeText.uniforms.uSeed.value = this.seed;
    Polaroid._bakeText.render(renderer, this.textNoiseRT);
    renderer.setRenderTarget(null);
    this.uniforms.uDetail.value = this.detailRT.texture;
    this.uniforms.uTextNoise.value = this.textNoiseRT.texture;
  }

  setIgnitions(list) {
    this.ign = list.map(([x, y, t, v]) => ({ x, y, t, v }));
    const u = this.uniforms.uIgn.value;
    for (let i = 0; i < MAX_IGN; i++) {
      const g = this.ign[i];
      if (g) u[i].set(g.x, g.y, g.t, g.v); else u[i].set(0, 0, 1e5, 1);
    }
  }

  useMaterial(kind) {
    const solid = this.uniforms.uBurning.value < 0.5 && !this.fly;
    this.mesh.material = kind === 'shadow' ? this.matShadow : kind === 'source' ? this.matSource : solid ? this.matMainSolid : this.matMain;
  }

  // ---------------------------------------------------------- CPU mirror
  burnTime(px, py) {
    const sx = px + this.seed * 13.1, sy = py + this.seed * 7.3;
    const wx = fbm2(sx * 0.32, sy * 0.32, 3) - 0.5;
    const wy = fbm2(sx * 0.32 + 19.7, sy * 0.32 + 4.1, 3) - 0.5;
    const jag = (fbm2(sx * 1.15 + 3.3, sy * 1.15 + 3.3, 4) - 0.5) * 1.7 + (gnoise(sx * 4.3, sy * 4.3) - 0.5) * 0.35;
    let best = 1e6;
    for (const g of this.ign) {
      const d = Math.max(Math.hypot(px + wx * 2.4 - g.x, py + wy * 2.4 - g.y) + jag, 0);
      best = Math.min(best, g.t + 0.32 + d / g.v);
    }
    return best;
  }
  crumbleAt(px, py) { return 0.40 + 0.55 * fbm2(px * 0.9 + this.seed * 3, py * 0.9 + this.seed * 3, 3); }

  // Precompute a grid of burn/crumble times for spawning and light placement
  buildBurnGrid(nx = 30, ny = 36) {
    this.grid = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = ((i + 0.5) / nx - 0.5) * CARD_W, y = ((j + 0.5) / ny - 0.5) * CARD_H;
      this.grid.push({ x, y, tb: this.burnTime(x, y), L: this.crumbleAt(x, y) });
    }
    this.gridCell = (CARD_W / nx) * (CARD_H / ny);
  }

  get burnStart() { return this.ign.length ? Math.min(...this.ign.map((g) => g.t)) : 1e9; }

  // local (cm) -> world, ignoring the small displacement
  localToWorld(x, y, h, out) {
    out.set(x, y, h);
    return out.applyMatrix4(this.mesh.matrixWorld);
  }
}

