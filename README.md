# Browser Face Anonymizer

A fully client-side video face anonymisation tool that runs entirely in the browser. Upload an MP4 or WebM file, detect a single face per frame using the SCRFD model executed with ONNX Runtime Web (preferring WebGPU, falling back to WASM), anonymise it with Gaussian blur, pixelation, or a black box overlay, and export a downloadable MP4 via `ffmpeg.wasm` while preserving the original audio track.

## Features

- ✅ **Client-side only** – no uploads or servers beyond static hosting.
- 🎯 **Face detection** with ONNX Runtime Web and the SCRFD 500m model.
- 🛡️ **Three anonymisation modes** (blur, pixelate, solid box) with adjustable strength.
- 🎬 **Video transcoding** using `ffmpeg.wasm`, re-encoding to MP4 and keeping the audio stream intact.
- 🖥️ **Browser support** for the latest Chromium, Firefox, and Safari releases.
- 📈 **Live progress and preview** while frames are processed.

## Getting started

### Prerequisites

- Node.js 18 or newer (required by `ffmpeg.wasm`).
- npm (comes bundled with Node.js).

### Installation

```bash
npm install
```

### Development server

```bash
npm run dev
```

This launches Vite with the security headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`) required by `ffmpeg.wasm` for multi-threaded execution.

### Production build

```bash
npm run build
```

Serve the contents of `dist/` with the same COOP/COEP headers to allow the WASM worker to initialise correctly. For static hosting (e.g., Netlify, Vercel, GitHub Pages), configure the platform to emit these headers. Example for an nginx server:

```
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
```

## How it works

1. The SCRFD ONNX model is fetched at runtime from the InsightFace release mirror and loaded into ONNX Runtime Web, preferring the WebGPU execution provider when available.
2. `ffmpeg.wasm` demuxes the input video into individual PNG frames and extracts the audio track.
3. Each frame is analysed for the most confident face detection. The selected anonymisation effect is rendered onto the frame in a canvas.
4. Processed frames are written back to the FFmpeg virtual filesystem and stitched into an MP4 (H.264 + original audio).
5. The resulting file is presented for preview and download without ever leaving the browser.

## Notes

- Large videos may require significant memory and processing time because every frame is decoded and re-encoded in the browser. Prefer shorter clips when possible.
- WebGPU support varies by browser and hardware. The app automatically falls back to the WASM execution provider if WebGPU is unavailable.
- All computation happens locally. Closing the tab clears all intermediate data.

## License

MIT
