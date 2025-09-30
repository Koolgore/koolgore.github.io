import './style.css';
import type { AnonymizationMode } from './types';
import { FaceDetector } from './faceDetector';
import { VideoProcessor } from './videoProcessor';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Application root element not found.');
}

app.innerHTML = `
  <main>
    <h1>Browser Face Anonymizer</h1>
    <p class="status">Select a video, choose an anonymization style, and anonymize faces directly in your browser.</p>
    <section class="controls">
      <label>
        Video file
        <input id="videoFile" type="file" accept="video/mp4,video/webm" />
      </label>
      <label>
        Anonymization mode
        <select id="mode">
          <option value="blur">Gaussian blur</option>
          <option value="pixelate">Pixelation</option>
          <option value="solid">Solid box</option>
        </select>
      </label>
      <label>
        Strength
        <input id="strength" type="range" min="4" max="50" value="15" step="1" />
        <span id="strengthLabel" class="status">Blur radius: 15px</span>
      </label>
      <button id="process">Anonymize video</button>
      <progress id="progress" max="1" value="0"></progress>
      <div id="status" class="status">No video processed yet.</div>
      <div id="log" class="log"></div>
    </section>
    <section class="video-preview">
      <div>
        <h2>Original video</h2>
        <video id="inputPreview" controls playsinline></video>
      </div>
      <div>
        <h2>Processing preview</h2>
        <canvas id="framePreview"></canvas>
      </div>
      <div>
        <h2>Anonymized output</h2>
        <video id="outputVideo" controls playsinline></video>
        <div class="output-actions">
          <a id="downloadLink" href="#" download style="display: none;">Download anonymized video</a>
        </div>
      </div>
    </section>
  </main>
`;

const fileInput = document.querySelector<HTMLInputElement>('#videoFile');
const modeSelect = document.querySelector<HTMLSelectElement>('#mode');
const strengthInput = document.querySelector<HTMLInputElement>('#strength');
const strengthLabel = document.querySelector<HTMLSpanElement>('#strengthLabel');
const processButton = document.querySelector<HTMLButtonElement>('#process');
const progressBar = document.querySelector<HTMLProgressElement>('#progress');
const statusMessage = document.querySelector<HTMLDivElement>('#status');
const logContainer = document.querySelector<HTMLDivElement>('#log');
const inputPreview = document.querySelector<HTMLVideoElement>('#inputPreview');
const outputVideo = document.querySelector<HTMLVideoElement>('#outputVideo');
const downloadLink = document.querySelector<HTMLAnchorElement>('#downloadLink');
const framePreview = document.querySelector<HTMLCanvasElement>('#framePreview');
const framePreviewCtx = framePreview?.getContext('2d') ?? null;

if (
  !fileInput ||
  !modeSelect ||
  !strengthInput ||
  !strengthLabel ||
  !processButton ||
  !progressBar ||
  !statusMessage ||
  !logContainer ||
  !inputPreview ||
  !outputVideo ||
  !downloadLink ||
  !framePreview ||
  !framePreviewCtx
) {
  throw new Error('Failed to initialise UI components.');
}

const detector = new FaceDetector();
const processor = new VideoProcessor();
let currentVideoUrl: string | null = null;
let currentResultUrl: string | null = null;
const logLines: string[] = [];

const strengthLabelEl = strengthLabel;
const progressBarEl = progressBar;
const statusMessageEl = statusMessage;
const logContainerEl = logContainer;

if (!strengthLabelEl || !progressBarEl || !statusMessageEl || !logContainerEl) {
  throw new Error('Failed to establish UI bindings.');
}

updateStrengthLabel(modeSelect.value as AnonymizationMode, Number(strengthInput.value));

function updateStrengthLabel(mode: AnonymizationMode, value: number) {
  switch (mode) {
    case 'pixelate':
      strengthLabelEl.textContent = `Pixel block size: ${value}px`;
      break;
    case 'solid':
      strengthLabelEl.textContent = 'Solid fill opacity: 92% (fixed)';
      break;
    case 'blur':
    default:
      strengthLabelEl.textContent = `Blur radius: ${value}px`;
      break;
  }
}

function appendLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  logLines.push(`[${timestamp}] ${message}`);
  if (logLines.length > 200) {
    logLines.shift();
  }
  logContainerEl.textContent = logLines.join('\n');
  logContainerEl.scrollTop = logContainerEl.scrollHeight;
}

function setStatus(message: string) {
  statusMessageEl.textContent = message;
}

function resetProgress() {
  progressBarEl.value = 0;
  progressBarEl.removeAttribute('data-stage');
}

strengthInput.addEventListener('input', () => {
  const value = Number(strengthInput.value);
  const mode = modeSelect.value as AnonymizationMode;
  updateStrengthLabel(mode, value);
});

modeSelect.addEventListener('change', () => {
  const value = Number(strengthInput.value);
  const mode = modeSelect.value as AnonymizationMode;
  const disableStrength = mode === 'solid';
  strengthInput.disabled = disableStrength;
  if (disableStrength) {
    strengthLabel.textContent = 'Solid fill opacity: 92% (fixed)';
  } else {
    updateStrengthLabel(mode, value);
  }
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }
  if (currentVideoUrl) {
    URL.revokeObjectURL(currentVideoUrl);
  }
  currentVideoUrl = URL.createObjectURL(file);
  inputPreview.src = currentVideoUrl;
  setStatus(`Ready to process: ${file.name}`);
});

processButton.addEventListener('click', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    setStatus('Please select a video file before processing.');
    return;
  }

  processButton.disabled = true;
  resetProgress();
  logLines.length = 0;
  logContainerEl.textContent = '';
  setStatus('Initialising...');
  downloadLink.style.display = 'none';
  outputVideo.removeAttribute('src');
  outputVideo.load();
  framePreviewCtx.clearRect(0, 0, framePreview.width, framePreview.height);

  try {
    appendLog('Loading face detection model...');
    await detector.init();
    appendLog(`Face detector ready (provider: ${detector.provider ?? 'unknown'}).`);

    appendLog('Starting FFmpeg worker...');

    const mode = modeSelect.value as AnonymizationMode;
    const strength = Number(strengthInput.value);

    const result = await processor.process(file, {
      detector,
      mode,
      strength,
      previewCanvas: framePreview,
      onStatus: (message) => {
        setStatus(message);
        appendLog(message);
      },
      onProgress: (value, stage) => {
        progressBarEl.value = value;
        progressBarEl.dataset.stage = stage;
      },
      onFrame: (canvas) => {
        framePreviewCtx.clearRect(0, 0, framePreview.width, framePreview.height);
        framePreviewCtx.drawImage(canvas, 0, 0);
      },
      onLog: (message) => appendLog(message)
    });

    if (currentResultUrl) {
      URL.revokeObjectURL(currentResultUrl);
    }

    currentResultUrl = URL.createObjectURL(result.blob);
    outputVideo.src = currentResultUrl;
    outputVideo.load();
    downloadLink.href = currentResultUrl;
    downloadLink.download = `anonymized-${file.name.replace(/\.[^.]+$/, '')}.mp4`;
    downloadLink.style.display = 'inline-flex';

    setStatus(
      `Finished processing ${result.frameCount} frames at ${result.width}×${result.height} pixels. Ready for download.`
    );
    appendLog('Processing completed successfully.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Processing failed: ${message}`);
    appendLog(`Processing failed: ${message}`);
    console.error(error);
  } finally {
    processButton.disabled = false;
  }
});
