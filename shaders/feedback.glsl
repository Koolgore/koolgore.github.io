// Placeholder shader for future WebGL-based feedback effects.
// You can use this template to experiment with ping-pong framebuffers or
// other GPU-based glitch techniques.
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uFrame;
uniform sampler2D uFeedback;
uniform float uMix;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 current = texture2D(uFrame, uv);
  vec2 offset = vec2(sin(uv.y * 20.0), cos(uv.x * 24.0)) * 0.003;
  vec4 feedback = texture2D(uFeedback, uv + offset);
  gl_FragColor = mix(current, feedback, uMix);
}
