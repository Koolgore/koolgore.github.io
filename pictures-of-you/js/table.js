// Dark, oiled walnut tabletop.
import * as THREE from 'three';
import { GLSL_NOISE } from './noise.js';
import { GLSL_LIGHTING, GLSL_COVER, coverUniforms } from './lighting.js';
import { FRAG_OUT } from './gpu.js';

const VERT = /* glsl */ `
varying vec3 vWorld;
varying float vViewZ;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = FRAG_OUT + /* glsl */ `
${GLSL_NOISE}
${GLSL_LIGHTING}
${GLSL_COVER}
uniform float uSource;
varying vec3 vWorld;
varying float vViewZ;
void main() {
  if (uSource > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  if (coveredByPrint(vWorld)) { gl_FragColor = vec4(0.0, 0.0, 0.0, vViewZ); return; }
  vec2 p = vWorld.xz;
  // planks running along x, ~14 cm wide
  float pw = 14.0;
  float plank = floor((p.y + 3.7) / pw);
  float pv = fract((p.y + 3.7) / pw);
  float ph = hash12(vec2(plank, 3.0));
  vec2 wp = vec2(p.x + ph * 300.0, p.y + ph * 40.0);
  // long cathedral figure + tight straight grain, heavily stretched along x
  float warp = fbm2(vec2(wp.x * 0.035, wp.y * 0.12), 3) * 3.5;
  float figure = sin((wp.y * 0.55 + warp) * 3.14159);
  float grainL = fbm2(vec2(wp.x * 0.02, wp.y * 4.5 + warp * 2.0), 3);
  float pores = smoothstep(0.70, 0.9, gnoise(vec2(wp.x * 0.5, wp.y * 22.0))) * 0.6;
  vec3 light = vec3(0.060, 0.034, 0.020);
  vec3 dark = vec3(0.020, 0.011, 0.007);
  vec3 alb = mix(light, dark, clamp(0.5 + 0.35 * figure + 0.6 * (grainL - 0.5), 0.0, 1.0));
  alb *= 0.85 + 0.3 * ph;
  alb *= 1.0 - pores * 0.25;
  float seam = smoothstep(0.004, 0.0, min(pv, 1.0 - pv) * pw * 0.01);
  alb *= 1.0 - seam * 0.8;
  float dust = smoothstep(0.70, 0.95, fbm2(p * 0.35, 2));
  alb += vec3(0.010, 0.0095, 0.009) * dust;
  float fine = grainL;
  Surf s;
  s.albedo = alb;
  s.rough = 0.30 + 0.18 * fine + dust * 0.35;
  s.f0 = 0.04;
  s.sheen = 0.9;
  s.emit = vec3(0.0);
  vec3 N = vec3(0.0, 1.0, 0.0);
  float bump = (grainL - 0.5) * 0.012 + figure * 0.002 - pores * 0.006 - seam * 0.05;
  N = bumpNormal(N, vWorld, bump, 1.0);
  vec3 V = normalize(cameraPosition - vWorld);
  float sh = shadowAt(vWorld + N * 0.02, 4.0);
  vec3 col = shade(s, vWorld, N, V, sh);
  gl_FragColor = vec4(col, vViewZ);
}
`;

export function makeTable(lighting) {
  const uniforms = { ...lighting, ...coverUniforms(), uSource: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, glslVersion: THREE.GLSL3 });
  const geo = new THREE.PlaneGeometry(400, 400, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
