// Deterministic noise shared by GLSL and JS.
// Both sides use the same integer PCG hash so CPU-side sampling (spark / ash
// spawning, fire-light placement) lines up with what the shaders draw.

export const GLSL_NOISE = /* glsl */ `
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hash2i(ivec2 p) { return float(pcg(uint(p.x) + pcg(uint(p.y) + 0x9E3779B9u))) * (1.0 / 4294967295.0); }
float hash3i(ivec3 p) { return float(pcg(uint(p.x) + pcg(uint(p.y) + pcg(uint(p.z) + 0x7F4A7C15u)))) * (1.0 / 4294967295.0); }
float hash12(vec2 p) { return hash2i(ivec2(floor(p))); }

// 2D gradient noise, returns ~[0,1]
float gnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = p - i;
  ivec2 ii = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a0 = hash2i(ii) * 6.2831853;
  float a1 = hash2i(ii + ivec2(1, 0)) * 6.2831853;
  float a2 = hash2i(ii + ivec2(0, 1)) * 6.2831853;
  float a3 = hash2i(ii + ivec2(1, 1)) * 6.2831853;
  float a = dot(vec2(cos(a0), sin(a0)), f);
  float b = dot(vec2(cos(a1), sin(a1)), f - vec2(1.0, 0.0));
  float c = dot(vec2(cos(a2), sin(a2)), f - vec2(0.0, 1.0));
  float d = dot(vec2(cos(a3), sin(a3)), f - vec2(1.0, 1.0));
  return 0.5 + 0.7071 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * gnoise(p); n += a;
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(17.13, -9.71);
    a *= 0.5;
  }
  return s / n;
}

// 3D value noise (cheap, for animated detail)
float vnoise3(vec3 p) {
  vec3 i = floor(p); vec3 f = p - i;
  ivec3 ii = ivec3(i);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash3i(ii), n100 = hash3i(ii + ivec3(1,0,0));
  float n010 = hash3i(ii + ivec3(0,1,0)), n110 = hash3i(ii + ivec3(1,1,0));
  float n001 = hash3i(ii + ivec3(0,0,1)), n101 = hash3i(ii + ivec3(1,0,1));
  float n011 = hash3i(ii + ivec3(0,1,1)), n111 = hash3i(ii + ivec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float fbm3(vec3 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * vnoise3(p); n += a;
    p = p * 2.03 + vec3(11.7, -3.1, 5.3);
    a *= 0.5;
  }
  return s / n;
}

// Cellular noise: returns (F1, F2) distances
vec2 cellular(vec2 p) {
  vec2 i = floor(p); vec2 f = p - i;
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    ivec2 c = ivec2(i) + ivec2(x, y);
    vec2 o = vec2(hash2i(c), hash2i(c + ivec2(31, 17)));
    vec2 r = vec2(float(x), float(y)) + o - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return sqrt(vec2(d1, d2));
}
`;

// ---------------------------------------------------------------- JS side
function pcg(v) {
  const s = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}
export function hash2i(x, y) {
  return pcg(((x >>> 0) + pcg(((y >>> 0) + 0x9E3779B9) >>> 0)) >>> 0) / 4294967295;
}
export function gnoise(px, py) {
  const ix = Math.floor(px), iy = Math.floor(py);
  const fx = px - ix, fy = py - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a0 = hash2i(ix, iy) * 6.2831853, a1 = hash2i(ix + 1, iy) * 6.2831853;
  const a2 = hash2i(ix, iy + 1) * 6.2831853, a3 = hash2i(ix + 1, iy + 1) * 6.2831853;
  const a = Math.cos(a0) * fx + Math.sin(a0) * fy;
  const b = Math.cos(a1) * (fx - 1) + Math.sin(a1) * fy;
  const c = Math.cos(a2) * fx + Math.sin(a2) * (fy - 1);
  const d = Math.cos(a3) * (fx - 1) + Math.sin(a3) * (fy - 1);
  const ab = a + (b - a) * ux, cd = c + (d - c) * ux;
  return 0.5 + 0.7071 * (ab + (cd - ab) * uy);
}
export function fbm2(px, py, oct) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * gnoise(px, py); n += a;
    const nx = 1.6 * px - 1.2 * py + 17.13;
    const ny = 1.2 * px + 1.6 * py - 9.71;
    px = nx; py = ny; a *= 0.5;
  }
  return s / n;
}

// Small seeded PRNG for CPU-side randomness (deterministic renders)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap smooth 1D noise for flicker / camera drift
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash2i(i, seed) * 2 - 1, b = hash2i(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
}
