// PolaroidTextSim.js — Zero-dependency modular WebGL2 Polaroid chemical/light text engine
import {
  QUAD_VERT,
  DIFFUSION_FRAG,
  ANISO_STREAK_FRAG,
  KAWASE_DOWN_FRAG,
  KAWASE_UP_FRAG,
  COMPOSITE_FRAG,
} from './shaders.js';

const DEFAULT_PARAMS = {
  showFrame: true,
  simResolution: 768,
  fontFamily: '"PolaroidHand", "Caveat", "Bradley Hand", cursive',
  fontWeight: '700',
  fontSize: 138,
  lineHeight: 1.08,
  letterSpacing: 0.5,
  charJitter: 0.22,      // Gentle variation preserving natural handwritten flow
  charStagger: 0.045,    // Subtle left-to-right character stagger inside each word (seconds)
  halationStrength: 1.05,
  streakStrength: 0.95,
  chemicalBleed: 1.05,
  edgeBurn: 1.0,
  grainAmount: 0.065,
  warmth: 0.58,
  exposure: 1.12,
  developSpeed: 1.0,
  bgIntensity: 0.45,
  bgDevelop: 1.0,
  textYOffset: 0.0,      // Vertical offset in normalized emulsion coords (-0.5..0.5, + = lower)
  // per-print light-leak layout (added; defaults reproduce the original layout)
  leakGain: [1, 1, 1, 1],   // corner leak, pod-corner leak, edge burn line, minor hints
  leakFlip: [1, 1],         // mirror the layout in x / y
  leakSwap: 0,              // 1 = rotate the layout onto the other pair of edges
  leakShift: 0,             // slide leaks along their edge
  seed: 4.2,
};

function mulberry32(seed) {
  let a = (seed * 100000) | 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export class PolaroidTextSim {
  /**
   * Optional helper to load a custom TTF/WOFF2 handwritten font before calling setText().
   * @param {string} family
   * @param {string} url
   */
  static async loadFont(family, url) {
    const face = new FontFace(family, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    return face;
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Partial<typeof DEFAULT_PARAMS>} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.params = { ...DEFAULT_PARAMS, ...options };
    this.words = [];
    this.lastTime = 0;
    this.pingIndex = 0;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true, // Enables clean canvas capture / video export
    });

    if (!gl) {
      throw new Error('PolaroidTextSim requires WebGL2.');
    }
    this.gl = gl;

    // Enable floating-point FBO rendering & linear filtering
    this.extFloat = gl.getExtension('EXT_color_buffer_float');
    this.extFloatLinear = gl.getExtension('OES_texture_float_linear');
    this.useFloat = Boolean(this.extFloat);

    // Empty VAO for fullscreen procedural triangle
    this.vao = gl.createVertexArray();

    // Compile shader programs
    this.progDiffusion = this._createProgram(QUAD_VERT, DIFFUSION_FRAG);
    this.progStreak = this._createProgram(QUAD_VERT, ANISO_STREAK_FRAG);
    this.progKawaseDown = this._createProgram(QUAD_VERT, KAWASE_DOWN_FRAG);
    this.progKawaseUp = this._createProgram(QUAD_VERT, KAWASE_UP_FRAG);
    this.progComposite = this._createProgram(QUAD_VERT, COMPOSITE_FRAG);

    // Offscreen 2D canvas for rasterizing developing lyric exposure masks
    const res = this.params.simResolution;
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = res;
    this.maskCanvas.height = res;
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: false });

    // Create GPU textures & framebuffers
    this.textMaskTex = this._createTexture(res, res, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.bgPhotoTex = this._createTexture(1, 1, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.hasBgPhoto = false;
    this.chemFbos = [this._createFBO(res, res), this._createFBO(res, res)];
    this.streakFbo = this._createFBO(res, res);

    // Dual-Kawase halation pyramid (4 mip levels)
    this.pyramid = [];
    let pw = res >> 1;
    let ph = res >> 1;
    for (let i = 0; i < 4; i++) {
      this.pyramid.push({
        down: this._createFBO(pw, ph),
        up: this._createFBO(pw, ph),
        w: pw,
        h: ph,
      });
      pw = Math.max(16, pw >> 1);
      ph = Math.max(16, ph >> 1);
    }

    this.reset();
  }

  /**
   * Set a timed list of words to develop on the Polaroid.
   * Each entry: { text: string, start: number, duration?: number, line?: number, x?: number, y?: number, scale?: number }
   */
  setWords(wordEntries) {
    this.words = wordEntries.map((w, idx) => ({
      text: String(w.text ?? ''),
      start: Number(w.start ?? idx * 0.6),
      duration: Number(w.duration ?? 1.5),
      line: w.line ?? null,
      x: w.x ?? null,
      y: w.y ?? null,
      scale: Number(w.scale ?? 1.0),
    }));
    this._computeAutoLayout();
  }

  /**
   * Convenience helper: split a lyric string (supports "\n" for multi-line) into timed words.
   * @param {string} text
   * @param {{ start?: number, stagger?: number, wordDuration?: number }} [timing]
   */
  setText(text, timing = {}) {
    const start = timing.start ?? 0.35;
    const stagger = timing.stagger ?? 0.65;
    const wordDuration = timing.wordDuration ?? 1.65;

    const lines = String(text).split('\n');
    const entries = [];
    let t = start;
    lines.forEach((lineStr, lineIdx) => {
      const tokens = lineStr.trim().split(/\s+/).filter(Boolean);
      tokens.forEach((tok) => {
        entries.push({
          text: tok,
          start: t,
          duration: wordDuration,
          line: lineIdx,
        });
        t += stagger;
      });
    });
    this.setWords(entries);
  }

  /**
   * Upload an HTMLImageElement, HTMLCanvasElement, or HTMLVideoElement as the underlying Polaroid photo.
   * The photo sits inside the same physical emulsion layer (underneath halation, Mylar sheen & grain).
   * @param {TexImageSource} source
   */
  setBackgroundImage(source) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.bgPhotoTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.hasBgPhoto = true;
  }

  /**
   * Remove the underlying Polaroid photograph (back to pure darkroom emulsion).
   */
  clearBackgroundImage() {
    this.hasBgPhoto = false;
  }

  /**
   * Update visual parameters dynamically.
   */
  setParams(partial) {
    const needsLayout =
      partial.fontSize !== undefined ||
      partial.fontFamily !== undefined ||
      partial.fontWeight !== undefined ||
      partial.letterSpacing !== undefined ||
      partial.lineHeight !== undefined ||
      partial.charJitter !== undefined ||
      partial.textYOffset !== undefined ||
      partial.seed !== undefined;

    Object.assign(this.params, partial);
    if (needsLayout) {
      this._computeAutoLayout();
    }
  }

  /**
   * Clear chemical state buffers back to fresh, unexposed Polaroid emulsion.
   */
  reset() {
    const gl = this.gl;
    for (const fbo of this.chemFbos) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.streakFbo.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.pingIndex = 0;
    this.lastTime = 0;
  }

  /**
   * Advance the chemical simulation to `timeSeconds` with timestep `dt` and render to canvas.
   * Works both for real-time requestAnimationFrame and deterministic offline frame capture.
   */
  update(timeSeconds, dt = 1 / 60) {
    const gl = this.gl;
    const res = this.params.simResolution;

    // 1. Rasterize developing lyric exposure mask for current timestamp
    this._rasterizeExposureMask(timeSeconds);
    gl.bindTexture(gl.TEXTURE_2D, this.textMaskTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.maskCanvas);

    gl.bindVertexArray(this.vao);

    // 2. Chemical Diffusion & Latent Image Pass (Ping-Pong)
    const srcChem = this.chemFbos[this.pingIndex];
    const dstChem = this.chemFbos[1 - this.pingIndex];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dstChem.fb);
    gl.viewport(0, 0, res, res);
    gl.useProgram(this.progDiffusion.program);
    this._bindTex(this.progDiffusion.uniforms.uPrevState, srcChem.tex, 0);
    this._bindTex(this.progDiffusion.uniforms.uTextMask, this.textMaskTex, 1);
    gl.uniform2f(this.progDiffusion.uniforms.uTexelSize, 1 / res, 1 / res);
    gl.uniform1f(this.progDiffusion.uniforms.uDt, dt);
    gl.uniform1f(this.progDiffusion.uniforms.uTime, timeSeconds);
    gl.uniform1f(this.progDiffusion.uniforms.uSeed, this.params.seed);
    gl.uniform1f(this.progDiffusion.uniforms.uChemicalBleed, this.params.chemicalBleed);
    gl.uniform1f(this.progDiffusion.uniforms.uDevelopSpeed, this.params.developSpeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.pingIndex = 1 - this.pingIndex;
    const activeChem = dstChem;

    // 3. Anisotropic Vertical Streak + Bright-Pass Extraction
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.streakFbo.fb);
    gl.viewport(0, 0, res, res);
    gl.useProgram(this.progStreak.program);
    this._bindTex(this.progStreak.uniforms.uChemState, activeChem.tex, 0);
    gl.uniform2f(this.progStreak.uniforms.uTexelSize, 1 / res, 1 / res);
    gl.uniform1f(this.progStreak.uniforms.uTime, timeSeconds);
    gl.uniform1f(this.progStreak.uniforms.uSeed, this.params.seed);
    gl.uniform1f(this.progStreak.uniforms.uStreakStrength, this.params.streakStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 4. Dual-Kawase Halation Pyramid (Downsample)
    let prevTex = this.streakFbo.tex;
    let prevW = res;
    let prevH = res;
    gl.useProgram(this.progKawaseDown.program);
    for (let i = 0; i < this.pyramid.length; i++) {
      const lvl = this.pyramid[i];
      gl.bindFramebuffer(gl.FRAMEBUFFER, lvl.down.fb);
      gl.viewport(0, 0, lvl.w, lvl.h);
      this._bindTex(this.progKawaseDown.uniforms.uSource, prevTex, 0);
      gl.uniform2f(this.progKawaseDown.uniforms.uHalfPixel, 0.5 / prevW, 0.5 / prevH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      prevTex = lvl.down.tex;
      prevW = lvl.w;
      prevH = lvl.h;
    }

    // 4b. Dual-Kawase Halation Pyramid (Upsample)
    gl.useProgram(this.progKawaseUp.program);
    for (let i = this.pyramid.length - 1; i >= 0; i--) {
      const lvl = this.pyramid[i];
      const srcTex = i === this.pyramid.length - 1 ? lvl.down.tex : this.pyramid[i + 1].up.tex;
      const srcW = i === this.pyramid.length - 1 ? lvl.w : this.pyramid[i + 1].w;
      const srcH = i === this.pyramid.length - 1 ? lvl.h : this.pyramid[i + 1].h;

      gl.bindFramebuffer(gl.FRAMEBUFFER, lvl.up.fb);
      gl.viewport(0, 0, lvl.w, lvl.h);
      this._bindTex(this.progKawaseUp.uniforms.uSource, srcTex, 0);
      this._bindTex(this.progKawaseUp.uniforms.uAddSource, lvl.down.tex, 1);
      gl.uniform2f(this.progKawaseUp.uniforms.uHalfPixel, 0.5 / srcW, 0.5 / srcH);
      gl.uniform1f(this.progKawaseUp.uniforms.uMixFactor, i === this.pyramid.length - 1 ? 0.0 : 0.72);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 5. Final Photochemical Composite to Screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.progComposite.program);
    this._bindTex(this.progComposite.uniforms.uChemState, activeChem.tex, 0);
    this._bindTex(this.progComposite.uniforms.uStreakTex, this.streakFbo.tex, 1);
    this._bindTex(this.progComposite.uniforms.uHalationTight, this.pyramid[0].up.tex, 2);
    this._bindTex(this.progComposite.uniforms.uHalationWide, this.pyramid[2].up.tex, 3);
    this._bindTex(this.progComposite.uniforms.uBgPhoto, this.bgPhotoTex, 4);

    gl.uniform2f(this.progComposite.uniforms.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.progComposite.uniforms.uTime, timeSeconds);
    gl.uniform1f(this.progComposite.uniforms.uSeed, this.params.seed);
    gl.uniform1f(this.progComposite.uniforms.uShowFrame, this.params.showFrame ? 1.0 : 0.0);
    gl.uniform1f(this.progComposite.uniforms.uHasBgPhoto, this.hasBgPhoto ? 1.0 : 0.0);
    gl.uniform1f(this.progComposite.uniforms.uBgIntensity, this.params.bgIntensity);
    gl.uniform1f(this.progComposite.uniforms.uBgDevelop, this.params.bgDevelop);
    gl.uniform1f(this.progComposite.uniforms.uHalationStrength, this.params.halationStrength);
    gl.uniform1f(this.progComposite.uniforms.uEdgeBurn, this.params.edgeBurn);
    gl.uniform1f(this.progComposite.uniforms.uGrainAmount, this.params.grainAmount);
    gl.uniform1f(this.progComposite.uniforms.uWarmth, this.params.warmth);
    gl.uniform1f(this.progComposite.uniforms.uExposure, this.params.exposure);
    const lg = this.params.leakGain, lf = this.params.leakFlip;
    gl.uniform4f(this.progComposite.uniforms.uLeakGain, lg[0], lg[1], lg[2], lg[3]);
    gl.uniform3f(this.progComposite.uniforms.uLeakXf, lf[0], lf[1], this.params.leakSwap);
    gl.uniform1f(this.progComposite.uniforms.uLeakShift, this.params.leakShift);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    this.lastTime = timeSeconds;
  }

  /**
   * Compute centered multi-line layout & organic per-character jitter metadata.
   */
  _computeAutoLayout() {
    const res = this.params.simResolution;
    const ctx = this.maskCtx;
    const rng = mulberry32(this.params.seed + 11.7);

    // Group words by line index
    const lineMap = new Map();
    this.words.forEach((w) => {
      const li = w.line ?? 0;
      if (!lineMap.has(li)) lineMap.set(li, []);
      lineMap.get(li).push(w);
    });

    const lineKeys = Array.from(lineMap.keys()).sort((a, b) => a - b);
    const numLines = lineKeys.length;
    const baseSize = this.params.fontSize * (res / 768);
    ctx.font = `${this.params.fontWeight} ${baseSize}px ${this.params.fontFamily}`;

    const spaceW = ctx.measureText(' ').width * 1.15;
    const maxLineWidth = res * 0.86;

    // Auto-scale down if any line is wider than emulsion safe area
    let globalFit = 1.0;
    for (const key of lineKeys) {
      const lineWords = lineMap.get(key);
      let totalW = 0;
      lineWords.forEach((w, i) => {
        totalW += this._measureWordWidth(ctx, w.text, baseSize * w.scale);
        if (i < lineWords.length - 1) totalW += spaceW;
      });
      if (totalW > maxLineWidth) {
        globalFit = Math.min(globalFit, maxLineWidth / totalW);
      }
    }

    const effSize = baseSize * globalFit;
    const effSpace = spaceW * globalFit;
    const lineStep = effSize * this.params.lineHeight;
    const startY = res * (0.52 + this.params.textYOffset) - ((numLines - 1) * lineStep) * 0.5;

    this._layout = [];
    lineKeys.forEach((key, lineOrder) => {
      const lineWords = lineMap.get(key);
      let lineW = 0;
      const wordWidths = lineWords.map((w) => {
        const ww = this._measureWordWidth(ctx, w.text, effSize * w.scale);
        lineW += ww;
        return ww;
      });
      lineW += effSpace * Math.max(0, lineWords.length - 1);

      let cursorX = (res - lineW) * 0.5;
      const lineY = startY + lineOrder * lineStep;
      // Subtle natural handwriting slope across the line (~1.2 degrees)
      const lineSlope = (rng() - 0.52) * 0.032;

      lineWords.forEach((w, wi) => {
        const fontSize = effSize * w.scale;
        ctx.font = `${this.params.fontWeight} ${fontSize}px ${this.params.fontFamily}`;

        const wx = w.x !== null ? w.x * res : cursorX;
        const wy = w.y !== null ? w.y * res : lineY;

        const chars = [];
        let cx = wx;
        for (let ci = 0; ci < w.text.length; ci++) {
          const ch = w.text[ci];
          const cw = ctx.measureText(ch).width;
          const j = this.params.charJitter;
          const relX = (cx + cw * 0.5 - res * 0.5);
          chars.push({
            ch,
            x: cx + cw * 0.5 + (rng() - 0.5) * fontSize * 0.025 * j,
            y: wy + relX * lineSlope + (rng() - 0.5) * fontSize * 0.11 * j,
            rot: lineSlope * 0.8 + (rng() - 0.5) * 0.10 * j,
            scaleX: 1 + (rng() - 0.5) * 0.08 * j,
            scaleY: 1 + (rng() - 0.5) * 0.11 * j,
            timeOffset: ci * this.params.charStagger + (rng() - 0.5) * 0.07,
            intensity: 0.80 + rng() * 0.34,
          });
          cx += cw + this.params.letterSpacing * globalFit;
        }

        this._layout.push({ word: w, fontSize, chars });
        cursorX += wordWidths[wi] + effSpace;
      });
    });
  }

  _measureWordWidth(ctx, text, fontSize) {
    ctx.font = `${this.params.fontWeight} ${fontSize}px ${this.params.fontFamily}`;
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      w += ctx.measureText(text[i]).width;
      if (i < text.length - 1) w += this.params.letterSpacing;
    }
    return w;
  }

  /**
   * Draw per-word, per-character photochemical exposure masks onto the offscreen 2D canvas.
   * R = current exposure intensity (with dynamic soft-to-crisp chemical focus blur)
   * G = raw develop progress (0..1)
   * B = transient fiery surge bell curve (peaks mid-development)
   */
  _rasterizeExposureMask(timeSeconds) {
    const ctx = this.maskCtx;
    const res = this.params.simResolution;

    ctx.save();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, res, res);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';

    for (const item of this._layout) {
      const { word, fontSize, chars } = item;
      ctx.font = `${this.params.fontWeight} ${fontSize}px ${this.params.fontFamily}`;

      for (const c of chars) {
        const localT = timeSeconds - (word.start + c.timeOffset);
        if (localT <= 0) continue;

        const p = clamp01(localT / Math.max(0.1, word.duration));

        // Photochemical H&D S-curve: slow latent start, rapid burn-in, smooth saturation
        const exposure = smoothstep(0.0, 0.85, p) * c.intensity;
        // Transient flare surge peaks around p = 0.35 as light hits silver halide
        const surge = Math.sin(Math.pow(p, 0.75) * Math.PI);

        // Dynamic chemical focus: starts wide & smoky (18px blur), precipitates to organic soft print (2.8px)
        const blurPx = (1.0 - smoothstep(0.05, 0.82, p)) * 16.0 + 2.6;
        ctx.filter = `blur(${blurPx.toFixed(1)}px)`;

        const r = Math.min(255, Math.round(exposure * 255));
        const g = Math.min(255, Math.round(p * 255));
        const b = Math.min(255, Math.round(surge * 255));
        ctx.fillStyle = `rgb(${r},${g},${b})`;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.scale(c.scaleX, c.scaleY);
        ctx.fillText(c.ch, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // --- WebGL2 Helpers ---

  _createProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(`WebGL2 program link error:\n${log}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  }

  _compileShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      throw new Error(`WebGL2 shader compile error:\n${log}`);
    }
    return shader;
  }

  _createTexture(w, h, internalFormat, format, type) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    return tex;
  }

  _createFBO(w, h) {
    const gl = this.gl;
    const internalFormat = this.useFloat ? gl.RGBA16F : gl.RGBA8;
    const type = this.useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const tex = this._createTexture(w, h, internalFormat, gl.RGBA, type);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  }

  _bindTex(uniformLoc, tex, unit) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uniformLoc, unit);
  }

  destroy() {
    const gl = this.gl;
    gl.deleteVertexArray(this.vao);
    gl.deleteTexture(this.textMaskTex);
    gl.deleteTexture(this.bgPhotoTex);
    for (const fbo of [...this.chemFbos, this.streakFbo]) {
      gl.deleteFramebuffer(fbo.fb);
      gl.deleteTexture(fbo.tex);
    }
    for (const lvl of this.pyramid) {
      gl.deleteFramebuffer(lvl.down.fb);
      gl.deleteTexture(lvl.down.tex);
      gl.deleteFramebuffer(lvl.up.fb);
      gl.deleteTexture(lvl.up.tex);
    }
    for (const p of [
      this.progDiffusion,
      this.progStreak,
      this.progKawaseDown,
      this.progKawaseUp,
      this.progComposite,
    ]) {
      gl.deleteProgram(p.program);
    }
  }
}
