// Shared lighting model: one soft cool key light with PCF shadows, a dim
// hemisphere ambient, up to four flickering fire point-lights, GGX specular and
// a procedural "dark room with one window" environment for glossy reflections.
import * as THREE from 'three';

export const MAX_FIRE_LIGHTS = 4;

export function lightingUniforms() {
  return {
    uKeyDir: { value: new THREE.Vector3(-0.42, 0.78, -0.46).normalize() },
    uKeyCol: { value: new THREE.Vector3(0.66, 0.72, 0.86).multiplyScalar(0.95) },
    uAmbTop: { value: new THREE.Vector3(0.014, 0.017, 0.024) },
    uAmbBot: { value: new THREE.Vector3(0.004, 0.004, 0.005) },
    uFireL: { value: Array.from({ length: MAX_FIRE_LIGHTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uFireCol: { value: new THREE.Vector3(1.0, 0.50, 0.17) },
    uPenLight: { value: new THREE.Vector4(0, 0, 0, 0) },
    uShadow: { value: null },
    uShadowMat: { value: new THREE.Matrix4() },
    uShadowTexel: { value: 1 / 2048 },
    uEnvGain: { value: 1.0 },
    uPoolCenter: { value: new THREE.Vector3(-1.5, 0, -1.0) },
    uPoolScale: { value: 1.0 },
  };
}

export const GLSL_COVER = /* glsl */ `
uniform mat4 uCover[4];
uniform int uCoverN;
// true when an intact print lies directly above this world point (cheap occlusion cull)
bool coveredByPrint(vec3 wp) {
  for (int i = 0; i < 4; i++) {
    if (i >= uCoverN) break;
    vec3 lp = (uCover[i] * vec4(wp, 1.0)).xyz;
    if (abs(lp.x) < 4.25 && abs(lp.y) < 5.2 && lp.z < -0.01) return true;
  }
  return false;
}
`;
export function coverUniforms() {
  return { uCover: { value: Array.from({ length: 4 }, () => new THREE.Matrix4()) }, uCoverN: { value: 0 } };
}

export const GLSL_LIGHTING = /* glsl */ `
uniform vec3 uKeyDir; uniform vec3 uKeyCol;
uniform vec3 uAmbTop; uniform vec3 uAmbBot;
uniform vec4 uFireL[${MAX_FIRE_LIGHTS}];
uniform vec3 uFireCol;
uniform vec4 uPenLight;      // the light pen as a small point source (world pos, intensity)
uniform sampler2D uShadow; uniform mat4 uShadowMat; uniform float uShadowTexel;
uniform float uEnvGain;

const vec2 POISSON[12] = vec2[12](
  vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
  vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893),
  vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));

float shadowAt(vec3 wp, float soft) {
  vec4 sc = uShadowMat * vec4(wp, 1.0);
  vec3 c = sc.xyz / sc.w;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return 1.0;
  float z = c.z - 0.0012;
  float ang = hash12(gl_FragCoord.xy) * 6.2831853;
  mat2 rot = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
  // blocker search -> penumbra grows with occluder height (lamp is an area light)
  float bsum = 0.0, bn = 0.0;
  for (int i = 0; i < 12; i += 2) {
    vec2 o = rot * POISSON[i] * uShadowTexel * 60.0;
    float d = texture(uShadow, c.xy + o).r;
    if (d < z) { bsum += d; bn += 1.0; }
  }
  if (bn < 0.5) return 1.0;
  float gap = (z - bsum / bn) * 119.0;              // cm between occluder and receiver
  float rad = soft + gap * 9.0;                      // texels
  rad = min(rad, 90.0);
  float lit = 0.0;
  for (int i = 0; i < 12; i++) {
    vec2 o = rot * POISSON[i] * uShadowTexel * rad;
    float d = texture(uShadow, c.xy + o).r;
    lit += (z <= d) ? 1.0 : 0.0;
  }
  return lit / 12.0;
}

float D_GGX(float NdH, float a) {
  float a2 = a * a; float d = NdH * NdH * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * d * d);
}
float V_Smith(float NdV, float NdL, float a) {
  float k = a * 0.5;
  return 0.25 / ((NdV * (1.0 - k) + k) * (NdL * (1.0 - k) + k));
}

// Dark room, one soft window far behind the stack (so it glances across the
// glossy photos as seen from the camera), faint warm practical on the right.
vec3 envLight(vec3 R, float rough) {
  vec3 col = mix(uAmbBot, uAmbTop, R.y * 0.5 + 0.5) * 1.6;
  vec3 wdir = normalize(vec3(-0.10, 0.70, -0.71));
  vec3 wx = normalize(cross(wdir, vec3(0.0, 1.0, 0.0)));
  vec3 wy = cross(wx, wdir);
  float fw = dot(R, wdir);
  vec2 pr = vec2(dot(R, wx), dot(R, wy)) / max(fw, 0.05);
  float soft = 0.35 + rough * 1.2;
  float box = smoothstep(0.75 + soft, 0.75 - soft, abs(pr.x)) * smoothstep(0.5 + soft, 0.5 - soft, abs(pr.y + 0.25));
  box *= box;
  col += vec3(0.55, 0.64, 0.80) * 0.09 * box * step(0.0, fw);
  vec3 pdir = normalize(vec3(0.9, 0.35, 0.2));
  col += vec3(0.9, 0.55, 0.3) * 0.05 * pow(max(dot(R, pdir), 0.0), 6.0 / (rough + 0.2));
  return col * uEnvGain;
}

uniform vec3 uPoolCenter;
uniform float uPoolScale;
// the key is a shaded lamp: a soft pool of light that falls off across the table
float keyPool(vec3 P) {
  vec2 d = (P.xz - uPoolCenter.xz) / (vec2(19.0, 15.0) * uPoolScale);
  return 0.08 + 0.92 * exp(-dot(d, d) * 1.6);
}

struct Surf { vec3 albedo; float rough; float f0; vec3 emit; float sheen; };

vec3 shade(Surf s, vec3 P, vec3 N, vec3 V, float shadow) {
  float NdV = max(dot(N, V), 1e-3);
  float a = max(s.rough * s.rough, 0.002);
  vec3 col = vec3(0.0);
  // key light
  vec3 L = uKeyDir; vec3 H = normalize(L + V);
  float NdL = max(dot(N, L), 0.0);
  float NdH = max(dot(N, H), 0.0);
  float F = s.f0 + (1.0 - s.f0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  float pool = keyPool(P);
  col += (s.albedo * (1.0 - F) + D_GGX(NdH, a) * V_Smith(NdV, NdL, a) * F) * uKeyCol * NdL * shadow * pool;
  // ambient
  col += s.albedo * mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
  // fire lights
  for (int i = 0; i < ${MAX_FIRE_LIGHTS}; i++) {
    vec4 fl = uFireL[i];
    if (fl.w <= 0.0) continue;
    vec3 Lv = fl.xyz - P; float d2 = dot(Lv, Lv);
    vec3 l = Lv * inversesqrt(d2);
    float att = fl.w / (d2 + 2.0);
    float nl = max(dot(N, l), 0.0) * 0.85 + 0.15 * max(dot(N, l) * 0.5 + 0.5, 0.0);
    vec3 h = normalize(l + V);
    float spec = D_GGX(max(dot(N, h), 0.0), max(a, 0.02)) * V_Smith(NdV, max(dot(N, l), 0.0), a) * (s.f0 + (1.0 - s.f0) * pow(1.0 - max(dot(h, V), 0.0), 5.0));
    col += (s.albedo * nl + spec * max(dot(N, l), 0.0)) * uFireCol * att;
  }
  // light pen spill
  if (uPenLight.w > 0.0) {
    vec3 Lv = uPenLight.xyz - P; float d2 = dot(Lv, Lv);
    vec3 l = Lv * inversesqrt(d2);
    vec3 h = normalize(l + V);
    float nl = max(dot(N, l), 0.0);
    float spec = D_GGX(max(dot(N, h), 0.0), max(a, 0.03)) * V_Smith(NdV, nl, a) * (s.f0 + (1.0 - s.f0) * pow(1.0 - max(dot(h, V), 0.0), 5.0));
    col += (s.albedo * nl + spec * nl) * vec3(1.0, 0.93, 0.82) * uPenLight.w / (d2 + 0.6);
  }
  // environment reflection
  vec3 R = reflect(-V, N);
  float Fe = s.f0 + (1.0 - s.f0) * pow(1.0 - NdV, 5.0) / (1.0 + 4.0 * s.rough);
  col += envLight(R, s.rough) * Fe * s.sheen * mix(0.35, 1.0, shadow);
  return col + s.emit;
}

// Mikkelsen-style bump mapping from a scalar height using screen derivatives
vec3 bumpNormal(vec3 N, vec3 P, float h, float scale) {
  vec3 dpx = dFdx(P), dpy = dFdy(P);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - grad * scale);
}

vec3 fireRamp(float x) {
  x = max(x, 0.0);
  vec3 c = mix(vec3(0.35, 0.015, 0.0), vec3(1.0, 0.22, 0.02), smoothstep(0.0, 0.35, x));
  c = mix(c, vec3(1.0, 0.55, 0.12), smoothstep(0.35, 0.7, x));
  c = mix(c, vec3(1.0, 0.86, 0.55), smoothstep(0.7, 1.1, x));
  return c;
}
`;
