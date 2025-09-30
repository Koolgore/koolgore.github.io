import { applyRGBShift } from "./effects/rgb_shift.js";
import { applyFrameSmear } from "./effects/smear.js";
import { applyBitPlane } from "./effects/bitplane.js";
import { applyColorDrift } from "./effects/color_drift.js";

const video = document.getElementById("source-video");
const canvas = document.getElementById("output-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const exportButton = document.getElementById("export-btn");
const effectControls = document.getElementById("effect-controls");
const dropHint = dropZone.querySelector(".drop-hint");

let currentObjectUrl = null;
let animationHandle = null;
let isRendering = false;
let isExporting = false;

const effectRuntimeState = new Map();
const effectSettings = new Map();
const effectUI = new Map();

const EFFECTS = [
  {
    id: "rgbShift",
    name: "RGB Channel Separation",
    description: "Offset each color channel to create chromatic aberration.",
    apply: applyRGBShift,
    params: {
      offset: {
        type: "range",
        label: "Offset (px)",
        min: 0,
        max: 40,
        step: 1,
        default: 6,
      },
    },
  },
  {
    id: "smear",
    name: "Frame Smear",
    description: "Blend current frame with the previous frame for a trailing effect.",
    apply: applyFrameSmear,
    params: {
      mix: {
        type: "range",
        label: "Smear strength",
        min: 0,
        max: 0.95,
        step: 0.05,
        default: 0.55,
      },
    },
  },
  {
    id: "bitplane",
    name: "Bit-plane Slicing",
    description: "Drop or invert individual RGB bit planes for digital noise.",
    apply: applyBitPlane,
    params: {
      dropEnabled: {
        type: "toggle",
        label: "Drop bit plane",
        default: true,
      },
      drop: {
        type: "range",
        label: "Plane to drop",
        min: 0,
        max: 7,
        step: 1,
        default: 2,
      },
      invertEnabled: {
        type: "toggle",
        label: "Invert bit plane",
        default: false,
      },
      invert: {
        type: "range",
        label: "Plane to invert",
        min: 0,
        max: 7,
        step: 1,
        default: 5,
      },
    },
  },
  {
    id: "colorDrift",
    name: "Color Drift",
    description: "Shift hue and tweak saturation/lightness in HSL space.",
    apply: applyColorDrift,
    params: {
      hue: {
        type: "range",
        label: "Hue shift",
        min: -180,
        max: 180,
        step: 1,
        default: 24,
      },
      saturation: {
        type: "range",
        label: "Saturation",
        min: 0,
        max: 2,
        step: 0.05,
        default: 1.05,
      },
      lightness: {
        type: "range",
        label: "Lightness",
        min: 0,
        max: 2,
        step: 0.05,
        default: 1,
      },
    },
  },
];

function initEffectUI() {
  EFFECTS.forEach((effect) => {
    const defaults = Object.fromEntries(
      Object.entries(effect.params).map(([key, config]) => [key, config.default ?? (config.type === "toggle" ? false : 0)])
    );
    effectSettings.set(effect.id, {
      enabled: false,
      params: defaults,
    });

    const group = document.createElement("div");
    group.className = "effect-group";

    const header = document.createElement("div");
    header.className = "effect-header";

    const title = document.createElement("h3");
    title.textContent = effect.name;
    header.appendChild(title);

    const toggleLabel = document.createElement("label");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.addEventListener("change", () => setEffectEnabled(effect.id, toggle.checked));
    toggleLabel.appendChild(toggle);
    const toggleText = document.createElement("span");
    toggleText.textContent = "Enable";
    toggleLabel.appendChild(toggleText);
    header.appendChild(toggleLabel);

    group.appendChild(header);

    const description = document.createElement("p");
    description.className = "effect-description";
    description.textContent = effect.description;
    group.appendChild(description);

    const sliderContainer = document.createElement("div");
    sliderContainer.className = "effect-sliders";

    const paramElements = new Map();

    Object.entries(effect.params).forEach(([paramKey, config]) => {
      if (config.type === "toggle") {
        const row = document.createElement("label");
        row.className = "slider-row";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = Boolean(config.default);
        input.addEventListener("change", () => {
          updateEffectParam(effect.id, paramKey, input.checked);
        });
        const span = document.createElement("span");
        span.textContent = config.label;
        row.appendChild(input);
        row.appendChild(span);
        sliderContainer.appendChild(row);
        paramElements.set(paramKey, { input, valueLabel: span, type: "toggle" });
      } else {
        const row = document.createElement("div");
        row.className = "slider-row";
        const label = document.createElement("span");
        label.textContent = config.label;
        const valueLabel = document.createElement("span");
        valueLabel.textContent = config.default;
        valueLabel.className = "slider-value";
        const input = document.createElement("input");
        input.type = "range";
        input.min = config.min;
        input.max = config.max;
        input.step = config.step;
        input.value = config.default;
        input.addEventListener("input", () => {
          const value = config.step % 1 === 0 ? parseInt(input.value, 10) : parseFloat(input.value);
          valueLabel.textContent = value;
          updateEffectParam(effect.id, paramKey, value);
        });
        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(valueLabel);
        sliderContainer.appendChild(row);
        paramElements.set(paramKey, { input, valueLabel, type: "range" });
      }
    });

    group.appendChild(sliderContainer);
    effectControls.appendChild(group);

    effectUI.set(effect.id, {
      group,
      toggle,
      paramElements,
    });

    setEffectEnabled(effect.id, false);
  });
}

function setEffectEnabled(id, enabled) {
  const settings = effectSettings.get(id);
  if (!settings) return;
  settings.enabled = enabled;

  if (!enabled) {
    effectRuntimeState.delete(id);
  }

  const ui = effectUI.get(id);
  if (ui) {
    ui.toggle.checked = enabled;
    ui.group.classList.toggle("active", enabled);
    ui.paramElements.forEach(({ input }) => {
      input.disabled = !enabled;
    });
  }
}

function updateEffectParam(id, paramKey, value) {
  const settings = effectSettings.get(id);
  if (!settings) return;
  settings.params[paramKey] = value;
  if (!settings.enabled) {
    // Reset runtime state so changes are applied when enabled again.
    effectRuntimeState.delete(id);
  }
}

function getRuntimeState(id) {
  if (!effectRuntimeState.has(id)) {
    effectRuntimeState.set(id, {});
  }
  return effectRuntimeState.get(id);
}

function handleFileSelection(file) {
  if (!file) return;
  if (!file.type.startsWith("video") && file.type !== "image/gif") {
    console.warn("Unsupported file type", file.type);
    return;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentObjectUrl = URL.createObjectURL(file);
  video.src = currentObjectUrl;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  video.addEventListener(
    "loadedmetadata",
    () => {
      resizeCanvasToVideo();
      dropZone.classList.add("loaded");
      if (dropHint) {
        dropHint.setAttribute("aria-hidden", "true");
      }
      startRendering();
      video.play().catch((err) => console.warn("Autoplay prevented", err));
      exportButton.disabled = false;
    },
    { once: true }
  );

  video.load();
}

function resizeCanvasToVideo() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

function startRendering() {
  if (isRendering) return;
  isRendering = true;
  const loop = () => {
    if (!isRendering) return;
    renderFrame();
    animationHandle = requestAnimationFrame(loop);
  };
  loop();
}

function stopRendering() {
  isRendering = false;
  if (animationHandle) {
    cancelAnimationFrame(animationHandle);
    animationHandle = null;
  }
}

function renderFrame() {
  if (!video || video.readyState < 2) {
    return;
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  let frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

  EFFECTS.forEach((effect) => {
    const settings = effectSettings.get(effect.id);
    if (!settings || !settings.enabled) {
      effectRuntimeState.delete(effect.id);
      return;
    }
    const state = getRuntimeState(effect.id);
    const processed = effect.apply(frame, settings.params, state);
    if (processed) {
      frame = processed;
    }
  });

  ctx.putImageData(frame, 0, 0);
}

async function exportVideo() {
  if (isExporting) {
    return;
  }

  if (typeof canvas.captureStream !== "function") {
    alert("MediaRecorder is not available. Consider adding ffmpeg.wasm in the lib directory as a fallback.");
    return;
  }

  isExporting = true;
  exportButton.disabled = true;

  const stream = canvas.captureStream(30);
  const mimeCandidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
  ];
  const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    alert(
      "No supported MP4 MediaRecorder codec found in this browser. " +
        "Consider adding ffmpeg.wasm in the lib directory as a fallback."
    );
    exportButton.disabled = false;
    isExporting = false;
    return;
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  const wasLooping = video.loop;
  video.loop = false;

  const stopRecording = () => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glitch-art.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    exportButton.disabled = false;
    isExporting = false;
    video.loop = wasLooping;
    video.pause();
    video.currentTime = 0;
    if (wasLooping) {
      video.play().catch(() => {});
    }
  };

  recorder.onerror = (event) => {
    console.error("MediaRecorder error", event.error);
    stopRecording();
    exportButton.disabled = false;
    isExporting = false;
    video.loop = wasLooping;
    video.pause();
    video.currentTime = 0;
  };

  const handleEnded = () => {
    video.removeEventListener("ended", handleEnded);
    stopRecording();
  };

  video.addEventListener("ended", handleEnded, { once: true });

  recorder.start();
  video.pause();
  video.currentTime = 0;
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch((err) => {
      console.warn("Autoplay prevented during export", err);
      stopRecording();
    });
  }
}

function setupDragAndDrop() {
  ["dragenter", "dragover"].forEach((type) => {
    dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  });
}

function setupControls() {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    handleFileSelection(file);
  });

  exportButton.addEventListener("click", () => {
    if (!isExporting) {
      exportVideo();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRendering();
    } else if (video.src) {
      startRendering();
    }
  });
}

initEffectUI();
setupDragAndDrop();
setupControls();

