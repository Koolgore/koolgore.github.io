// GLSL ES 3.00 Shaders for PolaroidTextSim (WebGL2) — v5 Cinematic Photochemical & Physical Polaroid

export const QUAD_VERT = `#version 300 es
precision highp float;

const vec2 POS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

out vec2 vUv;

void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const NOISE_GLSL = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.05 + vec2(11.3, 23.9);
    a *= 0.5;
  }
  return v;
}

float ridgedFbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    v += a * n * n;
    p = rot * p * 2.12 + vec2(9.2, 27.4);
    a *= 0.48;
  }
  return v;
}
`;

/**
 * Pass 1: Wet Photochemical Diffusion, Opacifier Clearing & Silver-Halide Nucleation (Ping-Pong RGBA16F)
 *
 * Output RGBA16F:
 *   R = developed core photochemical density (mottled & fixed as word completes)
 *   G = wet chemical diffusion halo (amber/crimson emulsion scatter)
 *   B = early opacifier/cyan-ghost veil (peaks early in development, clears as reagent oxidizes)
 *   A = local chemical fixation progress (0..1)
 */
export const DIFFUSION_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrevState;
uniform sampler2D uTextMask;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uTime;
uniform float uSeed;
uniform float uChemicalBleed;
uniform float uDevelopSpeed;

${NOISE_GLSL}

void main() {
  vec2 uv = vUv;
  float dt = clamp(uDt, 0.001, 0.05);
  float bleed = uChemicalBleed;
  vec2 sOff = vec2(uSeed * 13.7, uSeed * 7.3);

  // Subtle optical/emulsion micro-bleed (preserves authentic handwritten font shapes)
  float wMacroX = fbm3(uv * 5.0 + sOff) - 0.5;
  float wMacroY = fbm3(uv * 5.0 + sOff + vec2(5.7, 12.1)) - 0.5;
  float wMesoX  = fbm(uv * 16.5 + sOff) - 0.5;
  float wMesoY  = fbm(uv * 18.0 + sOff + vec2(8.3, 3.1)) - 0.5;
  float wMicroX = vnoise(uv * 58.0 + sOff) - 0.5;
  float wMicroY = vnoise(uv * 54.0 + sOff + vec2(19.4, 7.2)) - 0.5;

  float rollerBias = (fbm3(vec2(uv.x * 13.0 + uSeed * 4.1, uv.y * 3.0)) - 0.5) * 0.0035 * bleed;

  vec2 totalWarp =
    vec2(wMacroX, wMacroY) * 0.0020 * bleed +
    vec2(wMesoX,  wMesoY)  * 0.0036 * bleed +
    vec2(wMicroX, wMicroY) * 0.0022 * bleed +
    vec2(0.0, rollerBias);

  vec2 sampleUv = clamp(uv + totalWarp, 0.0, 1.0);
  vec4 mask = texture(uTextMask, sampleUv);
  float rawExp   = mask.r;
  float wordProg = mask.g;
  float surge    = mask.b;

  // Patchy silver-halide chemical nucleation (organic darkroom precipitation)
  float chemPatch = fbm(uv * 10.5 + sOff + vec2(2.1, -1.7));
  float chemClump = fbm3(uv * 28.0 + sOff * 0.7);
  float fineGrain = vnoise(uv * 95.0 + sOff);

  float nucThreshold = mix(0.68, 0.05, smoothstep(0.0, 0.85, wordProg));
  float nucleation = smoothstep(
    nucThreshold - 0.22,
    nucThreshold + 0.22,
    rawExp * 0.88 + chemPatch * 0.38 + chemClump * 0.14
  );

  // Authentic analog stroke density variation (subtle silver clumping inside strokes)
  float organicEdge = smoothstep(0.14, 0.76, rawExp + (chemPatch - 0.5) * 0.20 + (fineGrain - 0.5) * 0.12);
  float densityMottle = 0.76 + 0.36 * chemClump + 0.18 * (chemPatch - 0.5);
  float targetCore = organicEdge * nucleation * densityMottle;

  // Isotropic wet-emulsion diffusion that freezes as acid timing layer neutralizes pH
  float activeChem = 1.0 - smoothstep(0.65, 1.0, wordProg) * 0.80;
  vec4 prev = texture(uPrevState, uv);

  vec2 dx = vec2(uTexelSize.x * 1.45, 0.0);
  vec2 dy = vec2(0.0, uTexelSize.y * 1.45);
  vec4 avg = (
    texture(uPrevState, clamp(uv - dx, 0.0, 1.0)) +
    texture(uPrevState, clamp(uv + dx, 0.0, 1.0)) +
    texture(uPrevState, clamp(uv - dy, 0.0, 1.0)) +
    texture(uPrevState, clamp(uv + dy, 0.0, 1.0)) +
    texture(uPrevState, clamp(uv - dx - dy, 0.0, 1.0)) * 0.7 +
    texture(uPrevState, clamp(uv + dx - dy, 0.0, 1.0)) * 0.7 +
    texture(uPrevState, clamp(uv - dx + dy, 0.0, 1.0)) * 0.7 +
    texture(uPrevState, clamp(uv + dx + dy, 0.0, 1.0)) * 0.7
  ) / 6.8;

  // Core exposure density (R)
  float cDiff = mix(prev.r, avg.r, clamp(dt * 2.2 * bleed * activeChem, 0.0, 0.20));
  float nextCore = mix(cDiff, targetCore, 1.0 - exp(-dt * 4.4 * uDevelopSpeed));

  // Wet chemical diffusion halo (G)
  float hDiff = mix(prev.g, avg.g, clamp(dt * 9.0 * bleed, 0.0, 0.52));
  float hazeTarget = rawExp * (0.52 + 0.76 * chemPatch) + surge * 0.72 * chemClump;
  float nextHaze = mix(hDiff, hazeTarget, 1.0 - exp(-dt * 2.5 * uDevelopSpeed));

  // Early Polaroid opacifier/cyan-ghost veil (B): peaks in early phase (0.05..0.45), clears cleanly
  float earlyGhost = smoothstep(0.02, 0.25, wordProg) * (1.0 - smoothstep(0.32, 0.85, wordProg));
  float ghostTarget = (rawExp * 0.7 + surge * 0.65) * earlyGhost * (0.6 + 0.7 * chemPatch);
  float gDiff = mix(prev.b, avg.b, clamp(dt * 8.0, 0.0, 0.48));
  float nextGhost = mix(gDiff, ghostTarget, 1.0 - exp(-dt * 4.2 * uDevelopSpeed));

  float nextAct = max(prev.a, wordProg);
  fragColor = vec4(nextCore, nextHaze, nextGhost, nextAct);
}
`;

/**
 * Pass 2: Delicate Straight Optical Light-Scatter & Roller Streaks
 */
export const ANISO_STREAK_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uChemState;
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uSeed;
uniform float uStreakStrength;

${NOISE_GLSL}

void main() {
  float macroCol = fbm(vec2(vUv.x * 9.0 + uSeed * 5.3, 1.4));
  float fineCol  = vnoise(vec2(vUv.x * 42.0 + uSeed * 11.7, 3.1));
  float rareShaft = pow(clamp(macroCol * 0.65 + fineCol * 0.45, 0.0, 1.0), 4.8);
  float microBleed = pow(clamp(fineCol, 0.0, 1.0), 2.4) * 0.20;

  float accumUp = 0.0;
  float accumDown = 0.0;
  float wSum = 0.0;

  const int STEPS = 14;
  for (int i = 1; i <= STEPS; i++) {
    float fi = float(i) / float(STEPS);
    float w = exp(-fi * 2.9);

    float reachUp = (0.007 + 0.018 * microBleed + 0.130 * rareShaft) * fi;
    vec4 sDown = texture(uChemState, clamp(vUv - vec2(0.0, reachUp), 0.0, 1.0));
    float eUp = max(0.0, sDown.r * 1.15 - 0.25);
    accumUp += eUp * w;

    float reachDown = (0.007 + 0.016 * microBleed + 0.052 * rareShaft) * fi;
    vec4 sUp = texture(uChemState, clamp(vUv + vec2(0.0, reachDown), 0.0, 1.0));
    float eDown = max(0.0, sUp.r * 1.05 - 0.27);
    accumDown += eDown * w * 0.72;

    wSum += w;
  }

  float streak = ((accumUp + accumDown) / wSum) * (0.12 + microBleed * 0.60 + rareShaft * 3.3) * uStreakStrength;

  vec4 center = texture(uChemState, vUv);
  float patchMod = 0.62 + 0.72 * fbm3(vUv * 11.0 + uSeed * 6.1);
  float brightCore = max(0.0, (center.r * 1.25 + center.g * 0.30 - 0.06) * patchMod);

  fragColor = vec4(brightCore, streak, center.b, 1.0);
}
`;

export const KAWASE_DOWN_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform vec2 uHalfPixel;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv - uHalfPixel.xy);
  sum += texture(uSource, vUv + uHalfPixel.xy);
  sum += texture(uSource, vUv + vec2(uHalfPixel.x, -uHalfPixel.y));
  sum += texture(uSource, vUv - vec2(uHalfPixel.x, -uHalfPixel.y));
  fragColor = sum / 8.0;
}
`;

export const KAWASE_UP_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform sampler2D uAddSource;
uniform vec2 uHalfPixel;
uniform float uMixFactor;

void main() {
  vec2 hp = uHalfPixel;
  vec4 sum = vec4(0.0);
  sum += texture(uSource, vUv + vec2(-hp.x * 2.0, 0.0));
  sum += texture(uSource, vUv + vec2(-hp.x,  hp.y)) * 2.0;
  sum += texture(uSource, vUv + vec2( 0.0,   hp.y * 2.0));
  sum += texture(uSource, vUv + vec2( hp.x,  hp.y)) * 2.0;
  sum += texture(uSource, vUv + vec2( hp.x * 2.0, 0.0));
  sum += texture(uSource, vUv + vec2( hp.x, -hp.y)) * 2.0;
  sum += texture(uSource, vUv + vec2( 0.0,  -hp.y * 2.0));
  sum += texture(uSource, vUv + vec2(-hp.x, -hp.y)) * 2.0;
  vec4 blurred = sum / 12.0;
  vec4 prev = texture(uAddSource, vUv);
  fragColor = mix(blurred, blurred + prev * 0.55, uMixFactor);
}
`;

/**
 * Pass 4: Cinematic Photochemical Composite
 * - Spectral dual-radius halation (golden inner + deep crimson outer + RGB layer parallax)
 * - Early Polaroid cyan/slate opacifier ghost shifting into warm amber/ivory print
 * - Physical glossy Mylar plastic window sheen, micro-scratches & 3-pod roller bands
 * - Sculpted, directional-lit vintage Polaroid 600/SX-70 paper frame with bevel lip & pod ridges
 */
export const COMPOSITE_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uChemState;
uniform sampler2D uStreakTex;
uniform sampler2D uHalationTight;
uniform sampler2D uHalationWide;
uniform sampler2D uBgPhoto;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
uniform float uShowFrame;
uniform float uHasBgPhoto;
uniform float uBgIntensity;
uniform float uBgDevelop;
uniform float uHalationStrength;
uniform float uEdgeBurn;
uniform float uGrainAmount;
uniform float uWarmth;
uniform float uExposure;
// per-print light-leak layout (added): gains = corner leak, pod-corner leak, edge burn line, minor hints
uniform vec4 uLeakGain;
uniform vec3 uLeakXf;      // mirror x (+/-1), mirror y (+/-1), swap axes (0/1)
uniform float uLeakShift;  // slide the leaks along their edge

${NOISE_GLSL}

vec3 agxDefaultContrastApprox(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return + 15.5     * x4 * x2
         - 40.14    * x4 * x
         + 31.96    * x4
         - 6.868    * x2 * x
         + 0.4298   * x2
         + 0.1191   * x
         - 0.00232;
}

vec3 agxToneMap(vec3 val) {
  const mat3 agx_mat = mat3(
    0.842479062253094, 0.0423282422610123, 0.0423756549057051,
    0.0784335999999992, 0.878468636469772, 0.0784336,
    0.0792237451477643, 0.0791661274605434, 0.879142973793104
  );
  const mat3 agx_mat_inv = mat3(
    1.19687900512017, -0.0528968517574562, -0.0529716355144438,
    -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
    -0.0990297440797205, -0.0989611768448433, 1.15107367264116
  );

  val = max(val, vec3(1e-6));
  val = agx_mat * val;
  val = clamp(log2(val), -12.47393, 4.026069);
  val = (val - (-12.47393)) / (4.026069 - (-12.47393));
  val = agxDefaultContrastApprox(val);
  val = agx_mat_inv * val;
  return clamp(val, 0.0, 1.0);
}

// Cinematic spectral dye ramp: dark sepia -> crimson-rust -> rich amber -> warm ivory
vec3 filmSpectrum(float density, float warmth) {
  vec3 cBlack  = vec3(0.0018, 0.0010, 0.0006);
  vec3 cCrim   = vec3(0.32,   0.024,  0.004);
  vec3 cAmber  = vec3(1.52,   0.36,   0.020);
  vec3 cGold   = vec3(3.05,   1.55,   0.28);
  vec3 cIvory  = vec3(6.10,   5.55,   3.95);

  vec3 col = mix(cBlack, cCrim, smoothstep(0.0, 0.22, density));
  col = mix(col, cAmber, smoothstep(0.15, 0.46, density));
  col = mix(col, cGold,  smoothstep(0.40, 0.72, density));
  col = mix(col, cIvory, smoothstep(0.64, 1.06, density));

  col.r *= mix(0.92, 1.08, warmth);
  col.b *= mix(1.14, 0.85, warmth);
  return col;
}

// Asymmetric Polaroid edge light-leaks, chemical corner burns & pod-roller crystal artifacts
vec3 computeEdgeBurns(vec2 euv, float strength, float seed) {
  if (strength <= 0.001) return vec3(0.0);

  // leak layout differs per print: mirror / rotate the frame they're placed in and slide them along
  // the edge. The reagent-pod marks below stay on the real bottom edge (euv).
  vec2 luv = uLeakXf.z > 0.5 ? euv.yx : euv;
  if (uLeakXf.x < 0.0) luv.x = 1.0 - luv.x;
  if (uLeakXf.y < 0.0) luv.y = 1.0 - luv.y;
  luv.y += uLeakShift;

  float nBig  = fbm(euv * 3.8 + vec2(seed * 3.1, seed * 7.7));
  float nMed  = fbm(euv * 11.5 + vec2(seed * 9.4, 2.3));
  float nRdg  = ridgedFbm(euv * 18.0 + vec2(seed * 2.1, 6.4));

  float dLeft   = luv.x;
  float dBottom = euv.y;

  // Subtle warm-mahogany chemical fog in upper-left quadrant
  float fogTL = smoothstep(0.66 + nBig * 0.24, 0.0, length((luv - vec2(0.05, 0.95)) * vec2(1.1, 1.0)));

  // Sharp bright top-left border light-leak
  float tlHot = smoothstep(0.14 + nMed * 0.07, 0.0, length((luv - vec2(-0.01, 0.96)) * vec2(2.7, 0.95))) * (0.55 + 0.65 * nRdg);

  // Bright bottom-left pod-corner chemical leak hugging bottom edge
  float blHot = smoothstep(0.21 + nMed * 0.08, 0.0, length((luv - vec2(0.02, -0.01)) * vec2(1.2, 2.9))) * (0.65 + 0.55 * nRdg);
  float blLeft = smoothstep(0.12 + nMed * 0.05, 0.0, length((luv - vec2(-0.01, 0.04)) * vec2(2.9, 1.3)));

  // Delicate irregular left-edge chemical burn line
  float leftLine = smoothstep(0.028 + nRdg * 0.022, 0.0, dLeft) * (0.35 + 0.82 * nMed);

  // Subtle right & top-right edge artifacts
  float brHint = smoothstep(0.13 + nMed * 0.05, 0.0, length((luv - vec2(1.01, 0.01)) * vec2(2.7, 1.9))) * 0.45;
  float trSpot = smoothstep(0.08 + nMed * 0.04, 0.0, length((luv - vec2(0.84, 1.01)) * vec2(1.4, 3.2))) * 0.36;

  // Authentic Polaroid 3-pod bottom-edge reagent crystallization "flames" (tiny milky-blue/cream wisps at y~0)
  float podX1 = exp(-pow((euv.x - 0.18) * 14.0, 2.0));
  float podX2 = exp(-pow((euv.x - 0.52) * 16.0, 2.0));
  float podX3 = exp(-pow((euv.x - 0.84) * 15.0, 2.0));
  float podFlame = (podX1 * 0.7 + podX2 * 0.9 + podX3 * 0.5) *
                   smoothstep(0.065 + nRdg * 0.045, 0.0, dBottom) *
                   smoothstep(0.35, 0.85, nRdg);

  float leftPin = smoothstep(0.015, 0.0, dLeft) * smoothstep(0.75, 0.95, nRdg) * 0.95;

  fogTL *= uLeakGain.x;
  float hotEnergy = ((tlHot * 1.30) * uLeakGain.x + (blHot * 1.48 + blLeft * 0.90) * uLeakGain.y
                   + (leftLine * 0.42 + leftPin) * uLeakGain.z + (brHint + trSpot) * uLeakGain.w) * strength;

  vec3 c = vec3(0.0);
  c += vec3(0.062, 0.020, 0.005) * fogTL * (0.4 + 0.8 * nMed) * strength;
  c += vec3(0.50, 0.065, 0.006) * smoothstep(0.0, 0.40, hotEnergy);
  c += vec3(1.55, 0.42,  0.024) * smoothstep(0.32, 0.85, hotEnergy);
  c += vec3(4.10, 3.45,  2.10)  * smoothstep(0.80, 1.48, hotEnergy);
  // Subtle milky-teal/cream pod crystallization right at bottom emulsion border
  c += vec3(0.28, 0.36, 0.42) * podFlame * 0.38 * strength;
  return c;
}

// Physical Polaroid 600 / SX-70 cardstock border with directional lighting, bevel lip & embossed pod ridges
vec3 renderPolaroidFrame(vec2 uv, vec2 innerMin, vec2 innerMax) {
  // Warm vintage photographic cardstock
  vec3 paper = vec3(0.948, 0.938, 0.916);

  // Subtle directional studio lighting across card (warm top-left -> slightly cooler/darker bottom-right)
  float dirLight = dot(uv - 0.5, normalize(vec2(-0.6, 0.8)));
  paper *= 1.0 + dirLight * 0.042;
  paper += vec3(0.008, 0.004, -0.005) * max(0.0, dirLight);

  // Fine organic paper tooth & fiber
  float fiber = fbm(uv * 30.0 + uSeed * 4.1) * 0.022;
  float fineGrain = (hash12(uv * uResolution * 1.05) - 0.5) * 0.016;
  paper -= fiber;
  paper += fineGrain;

  // Vintage edge patina (slightly yellowed & worn outer perimeter)
  float outerDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float edgeWear = smoothstep(0.055, 0.0, outerDist);
  paper -= edgeWear * vec3(0.032, 0.038, 0.048) * (0.7 + 0.6 * fbm(uv * 14.0 + uSeed));

  // Realistic soft fingerprint/handling patina on bottom chin
  float chinMask = smoothstep(innerMin.y + 0.01, innerMin.y - 0.03, uv.y);
  float smudge = fbm(uv * vec2(8.5, 14.0) + vec2(uSeed * 2.3, 5.1));
  paper -= chinMask * smoothstep(0.45, 0.86, smudge) * vec3(0.036, 0.038, 0.044);

  // Authentic embossed reagent-pod ridge & 3-pod subtle vertical seams on bottom chin
  float podTopLine = smoothstep(0.0045, 0.0, abs(uv.y - (innerMin.y - 0.024)));
  float podHighlight = smoothstep(0.0045, 0.0, abs(uv.y - (innerMin.y - 0.029)));
  paper -= podTopLine * 0.024;
  paper += podHighlight * 0.014;

  // Subtle 3-pod pillow shading in the lower chin
  float podArea = smoothstep(innerMin.y - 0.035, innerMin.y - 0.06, uv.y) * smoothstep(0.015, 0.045, uv.y);
  float podDividers = exp(-pow((uv.x - 0.34) * 55.0, 2.0)) + exp(-pow((uv.x - 0.66) * 55.0, 2.0));
  paper -= podArea * podDividers * 0.014;

  // Crisp physical recessed window bevel:
  // Dark shadow on top & left inner edges, bright caught-light paper highlight on bottom & right!
  bool inX = uv.x >= innerMin.x - 0.004 && uv.x <= innerMax.x + 0.004;
  bool inY = uv.y >= innerMin.y - 0.004 && uv.y <= innerMax.y + 0.004;

  if (inX) {
    float topShadow = smoothstep(0.009, 0.0, uv.y - innerMax.y) * step(innerMax.y, uv.y);
    float botLight  = smoothstep(0.007, 0.0, innerMin.y - uv.y) * step(uv.y, innerMin.y);
    paper -= topShadow * 0.14;
    paper += botLight  * 0.055;
  }
  if (inY) {
    float leftShadow = smoothstep(0.008, 0.0, innerMin.x - uv.x) * step(uv.x, innerMin.x);
    float rightLight = smoothstep(0.007, 0.0, uv.x - innerMax.x) * step(innerMax.x, uv.x);
    paper -= leftShadow * 0.11;
    paper += rightLight * 0.045;
  }

  // Slight outer card edge bevel & rounded corner darkening
  vec2 corner = max(abs(uv - 0.5) - vec2(0.488, 0.488), 0.0);
  float cDist = length(corner);
  paper *= 1.0 - smoothstep(0.008, 0.014, cDist) * 0.42;

  return clamp(paper, 0.0, 1.0);
}

void main() {
  vec2 innerMin = vec2(0.058, 0.202);
  vec2 innerMax = vec2(0.942, 0.934);

  vec2 euv = vUv;
  bool inEmulsion = true;

  if (uShowFrame > 0.5) {
    euv = (vUv - innerMin) / (innerMax - innerMin);
    inEmulsion = all(greaterThanEqual(euv, vec2(0.0))) && all(lessThanEqual(euv, vec2(1.0)));
  }

  if (!inEmulsion) {
    fragColor = vec4(renderPolaroidFrame(vUv, innerMin, innerMax), 1.0);
    return;
  }

  // Subtle multi-layer emulsion chromatic parallax (red layer sits deeper than blue/green)
  vec2 chromaOff = (euv - 0.5) * 0.0022;
  vec4 chem   = texture(uChemState, euv);
  vec4 chemR  = texture(uChemState, clamp(euv + chromaOff, 0.0, 1.0));
  vec4 streak = texture(uStreakTex, euv);
  vec4 halT   = texture(uHalationTight, euv);
  vec4 halW   = texture(uHalationWide, clamp(euv + chromaOff * 1.5, 0.0, 1.0));

  float coreDensity = chem.r;
  float chemHaze    = chem.g;
  float cyanGhost   = chem.b;
  float optShaft    = streak.g;

  // Static film-substrate irregularity (anchored to physical film sheet)
  float emulsionMod = 0.54 + 0.82 * fbm(euv * 11.5 + vec2(uSeed * 7.4, uSeed * 2.9));
  float fineClump   = vnoise(euv * 140.0 + uSeed * 11.1);

  // --- Base Polaroid Dark Emulsion (Optional Underlying Photograph Double-Exposure) ---
  float mottle = fbm(euv * 5.0 + vec2(uSeed * 4.7, uSeed * 2.1));
  float rollerBand = 0.92 + 0.16 * sin(euv.x * 18.85 + fbm3(euv * 4.0) * 1.5);
  vec3 darkWarm = vec3(0.0042, 0.0020, 0.0010);
  vec3 darkCool = vec3(0.0024, 0.0038, 0.0044); // Subtle Polaroid opacifier slate-teal
  vec3 hdr = mix(darkWarm, darkCool, smoothstep(0.35, 0.78, mottle) * 0.42) * (0.65 + 0.75 * mottle) * rollerBand;

  if (uHasBgPhoto > 0.5) {
    // Sample underlying Polaroid photograph with subtle RGB emulsion parallax
    vec3 bgSrgb = vec3(
      texture(uBgPhoto, clamp(euv + chromaOff * 0.8, 0.0, 1.0)).r,
      texture(uBgPhoto, euv).g,
      texture(uBgPhoto, clamp(euv - chromaOff * 0.8, 0.0, 1.0)).b
    );
    // Convert sRGB -> linear HDR and apply subtle vintage Polaroid emulsion grade
    vec3 bgLin = pow(max(bgSrgb, vec3(0.0)), vec3(2.2));
    // Vintage Polaroid warm-shadow / slightly desaturated film cast
    float bgLum = dot(bgLin, vec3(0.299, 0.587, 0.114));
    bgLin = mix(vec3(bgLum), bgLin, 0.82);
    bgLin *= vec3(1.06, 0.96, 0.84);
    // Subtle dark vignette & center-band darkening where lyrics sit for natural readability
    float bgVig = 1.0 - dot(euv - 0.5, euv - 0.5) * 0.85;
    bgLin *= clamp(bgVig, 0.35, 1.0) * rollerBand;
    // Allow photo itself to optionally emerge from Polaroid opacifier (uBgDevelop: 0..1)
    float photoReveal = smoothstep(0.0, 1.0, uBgDevelop * 1.15 - (1.0 - mottle) * 0.18);
    // Subtle darkening right behind dense text halation so bright letters pop like real double-exposure
    float textMaskShadow = 1.0 - clamp(chemHaze * 0.38, 0.0, 0.45);
    hdr += bgLin * uBgIntensity * photoReveal * textMaskShadow;
  }

  // Early Polaroid opacifier/cyan-teal chemical ghost (appears just before warm exposure blooms!)
  vec3 ghostCol = vec3(0.065, 0.145, 0.165);
  hdr += ghostCol * cyanGhost * emulsionMod * 0.95;

  // Submerged warm darkroom chemical bloom
  hdr += vec3(0.068, 0.013, 0.0015) * chemHaze * emulsionMod * 0.68;

  // Core photochemical exposed text (with subtle RGB depth-layer micro-fringe)
  float totalCore = coreDensity * (0.90 + 0.22 * fineClump) * uExposure;
  vec3 textCol = filmSpectrum(totalCore, uWarmth);
  // Extra deep red edge from deeper red-sensitive emulsion layer
  float redShift = max(0.0, chemR.r - coreDensity) * 1.65;
  textCol += vec3(0.95, 0.12, 0.01) * redShift * uExposure;
  hdr += textCol * smoothstep(0.02, 0.14, totalCore);

  // Delicate straight optical light-scatter / roller shafts
  vec3 shaftCol = mix(vec3(1.15, 0.18, 0.012), vec3(2.45, 1.05, 0.18), smoothstep(0.08, 0.78, optShaft));
  hdr += shaftCol * optShaft * 0.85 * uExposure;

  // Dual-spectrum optical halation:
  // 1) Tight golden-amber inner scatter
  float tightEnergy = (halT.r * 0.88 + halT.g * 0.45) * (0.52 + 0.80 * emulsionMod);
  hdr += vec3(1.55, 0.34, 0.018) * tightEnergy * uHalationStrength * 0.98 * uExposure;

  // 2) Wide deep crimson/ruby-red backing-layer halation
  float wideEnergy = (halW.r * 0.85 + halW.g * 0.38) * (0.55 + 0.75 * emulsionMod);
  hdr += vec3(0.92, 0.065, 0.012) * wideEnergy * uHalationStrength * 0.88 * uExposure;

  // Asymmetric Polaroid edge light-leaks, corner burns & bottom pod crystals
  hdr += computeEdgeBurns(euv, uEdgeBurn, uSeed);

  // Inner recessed window shadow cast onto emulsion edges (top & left slightly deeper)
  float innerShade =
    smoothstep(0.0, 0.022, euv.x) *
    smoothstep(0.0, 0.014, 1.0 - euv.x) *
    smoothstep(0.0, 0.014, euv.y) *
    smoothstep(0.0, 0.026, 1.0 - euv.y);
  hdr *= mix(0.48, 1.0, innerShade);

  // AgX tone mapping -> natural creamy photographic highlight roll-off
  vec3 col = agxToneMap(hdr);

  // Rich analog film contrast & saturation
  col = pow(col, vec3(1.11, 1.16, 1.22));
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.22);
  col = clamp(col, 0.0, 1.0);
  col = mix(vec3(0.015, 0.009, 0.007), vec3(1.0, 0.986, 0.950), col);

  // --- Physical Glossy Mylar / Plastic Top-Coat Reflection & Micro-Scratches ---
  // Soft diagonal window-light sheen across the glossy Polaroid plastic surface
  float wave = fbm3(euv * vec2(3.5, 4.5) + uSeed * 1.9) * 0.12;
  float diag = (euv.x * 0.72 + euv.y * 0.68) + wave;
  float broadSheen = exp(-pow((diag - 0.82) * 3.2, 2.0)) * 0.042;
  float edgeGlint  = exp(-pow((diag - 0.24) * 5.5, 2.0)) * 0.020;

  // Delicate physical surface micro-scratches catching the room light
  float s1 = smoothstep(0.0016, 0.0, abs((euv.x - 0.74) * 0.75 + (euv.y - 0.12))) *
             step(0.04, euv.y) * step(euv.y, 0.24) * 0.065;
  float s2 = smoothstep(0.0014, 0.0, abs((euv.x - 0.26) * 0.45 - (euv.y - 0.78))) *
             step(0.68, euv.y) * step(euv.y, 0.89) * 0.042;
  float dust = smoothstep(0.9972, 0.9998, hash12(floor(euv * 520.0) + uSeed * 3.7)) * 0.075;

  // Sheen is subtle & cool-white, visible primarily over the dark glossy emulsion
  vec3 sheenCol = vec3(0.86, 0.90, 0.96) * (broadSheen + edgeGlint) * (1.0 - luma * 0.65);
  col += sheenCol + vec3(0.24, 0.21, 0.18) * (s1 + s2 + dust);

  // 3D temporal silver-halide film grain (24fps film cadence)
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float grainWeight = 0.28 + 0.72 * (1.0 - abs(lum * 2.0 - 1.0));
  float tFrame = floor(uTime * 24.0);
  float g1 = hash13(vec3(floor(gl_FragCoord.xy * 0.80), tFrame + uSeed * 17.0)) - 0.5;
  float g2 = hash13(vec3(floor(gl_FragCoord.xy * 1.65), tFrame * 1.3 + uSeed * 31.0)) - 0.5;
  float grain = (g1 * 0.62 + g2 * 0.38) * uGrainAmount * grainWeight;
  col += vec3(grain * 1.05, grain * 0.97, grain * 0.89);

  if (uShowFrame > 0.5) {
    float edgeDist = min(min(euv.x, 1.0 - euv.x), min(euv.y, 1.0 - euv.y));
    float cutEdge = smoothstep(0.0, 0.0045, edgeDist);
    vec3 frameEdge = renderPolaroidFrame(vUv, innerMin, innerMax);
    col = mix(frameEdge, col, cutEdge);
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
