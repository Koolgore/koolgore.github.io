// Headless, deterministic renderer.
//
//   node render.mjs                         full video (1080x1920) -> out/pictures.mp4
//   node render.mjs --w 540 --h 960         quick low-res pass (add --emures 768 to speed up the text sim)
//   node render.mjs --stills 114,118.6      PNG stills (simulation warms up 2.5 s before each)
//   node render.mjs --from 116 --to 121     render a time range (song seconds)
//   node render.mjs --audio song.m4a        mux YOUR copy of the album track into the mp4
//   node render.mjs --gpu                   use this machine's GPU (much faster; opens a browser window)
//
// Needs Playwright (with Chromium) and ffmpeg on PATH.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const W = +(args.w || 1080), H = +(args.h || 1920), FPS = +(args.fps || 30);
const OUT = path.resolve(args.out || path.join(ROOT, 'out'));
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// --gpu: use the machine's graphics card (opens a visible browser window while rendering).
// Without it, WebGL runs in software (SwiftShader), which works anywhere but is slow.
const browser = args.gpu
  ? await chromium.launch({ headless: false, args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
  : await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Math.min(W, 1920), height: Math.min(H, 1920) } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const threeLocal = fs.readFileSync(path.join(ROOT, 'node_modules/three/build/three.module.min.js'));
await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/build\/three\.module\.min\.js/, (route) =>
  route.fulfill({ status: 200, contentType: 'text/javascript', body: threeLocal }));
await page.goto(`http://127.0.0.1:${port}/index.html?capture&w=${W}&h=${H}${args.emures ? `&emures=${args.emures}` : ''}`);
await page.waitForFunction(() => window.lyricReady || window.lyricError, null, { timeout: 180000 });
const err = await page.evaluate(() => window.lyricError);
if (err) { console.error(err); process.exit(1); }
console.log('WebGL renderer:', await page.evaluate(() => {
  const gl = window.lyric.renderer.getContext();
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}));

if (args.nofire) await page.evaluate(() => { window.lyric.debugNoFire = true; });
const T = await page.evaluate(async () => {
  const m = await import('./js/timing.js');
  return { start: m.VIDEO_START, end: m.VIDEO_END };
});

async function stepTo(t, dt, render) {
  await page.evaluate(([t, dt, render]) => {
    const a = window.lyric;
    a.update(t, dt);
    if (render) a.render(dt);
    else {
      // simulation only (keeps fire state warm without the beauty pass)
      a.setPass('source');
      const r = a.renderer;
      r.setRenderTarget(a.fluid.source); r.setClearColor(0, 0); r.clear(true, true, false);
      r.render(a.scene, a.camera);
      a.fluid.step(dt / 2, t - dt / 2); a.fluid.step(dt / 2, t);
    }
  }, [t, dt, render]);
}
async function grabRaw() {
  const b64 = await page.evaluate(async () => {
    const px = window.lyric.readPixels();
    const blob = new Blob([px]);
    return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(blob); });
  });
  return Buffer.from(b64, 'base64');
}
async function savePng(file) {
  const raw = await grabRaw();
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', '-vf', 'vflip', file]);
    ff.on('close', (c) => (c ? rej(new Error('ffmpeg ' + c)) : res()));
    ff.stdin.end(raw);
  });
}

const dt = 1 / FPS;
const t0 = Date.now();
if (args.stills) {
  const times = String(args.stills).split(',').map(Number);
  for (const ts of times) {
    const warm = Math.max(T.start, ts - (+args.warm || 2.5));
    await page.evaluate((t) => window.lyric.reset(t), warm);
    let t = warm;
    while (t < ts - dt * 0.5) { t += dt; await stepTo(t, dt, false); }
    await stepTo(ts, dt, true);
    if (args.probe) console.log(await page.evaluate(() => {
      const a = window.lyric; const out = [];
      const v = new a.camera.position.constructor();
      for (const f of a.flyers) { if (!f.mesh.visible) continue; v.copy(f.mesh.position).project(a.camera); out.push(`(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(3)}) w=${f.mesh.position.toArray().map(n=>n.toFixed(1)).join(',')}`); }
      return 'cam ' + a.camera.position.toArray().map(n=>n.toFixed(1)).join(',') + ' | ' + out.join(' ');
    }));
    const f = path.join(OUT, `still_${ts.toFixed(2)}.png`);
    await savePng(f);
    console.log('wrote', f, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} else {
  const from = +(args.from || T.start), to = +(args.to || T.end);
  const n = Math.round((to - from) * FPS);
  const file = path.join(OUT, args.name || (args.from || args.to ? `range_${from}_${to}.mp4` : 'pictures.mp4'));
  const ffArgs = ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-'];
  if (args.audio) ffArgs.push('-ss', String(from), '-i', String(args.audio));
  ffArgs.push('-vf', 'vflip', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 15), '-pix_fmt', 'yuv420p', '-tune', 'grain', '-movflags', '+faststart');
  if (args.audio) ffArgs.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest');
  ffArgs.push(file);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const warm = Math.max(T.start, from - 2.5);
  await page.evaluate((t) => window.lyric.reset(t), warm);
  for (let t = warm; t < from - dt * 0.5;) { t += dt; await stepTo(t, dt, false); }
  for (let i = 0; i < n; i++) {
    const t = from + i * dt;
    await stepTo(t, dt, true);
    const raw = await grabRaw();
    if (!ff.stdin.write(raw)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`frame ${i}/${n}  song ${t.toFixed(2)}s  ${(el / (i + 1)).toFixed(2)} s/frame  eta ${((n - i) * el / (i + 1) / 60).toFixed(1)} min`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', file);
}
await browser.close();
server.close();
