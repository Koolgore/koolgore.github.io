(() => {
  const fileInput = document.getElementById('video-upload');
  const processBtn = document.getElementById('process-btn');
  const statusEl = document.getElementById('status');
  const mosaicScaleInput = document.getElementById('mosaic-scale');
  const mosaicScaleValue = document.getElementById('mosaic-scale-value');
  const maskExpansionInput = document.getElementById('mask-expansion');
  const maskExpansionValue = document.getElementById('mask-expansion-value');
  const detectionThresholdInput = document.getElementById('detection-threshold');
  const detectionThresholdValue = document.getElementById('detection-threshold-value');
  const videoEl = document.getElementById('input-video');
  const outputCanvas = document.getElementById('output-canvas');
  const progressEl = document.getElementById('progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const resultEl = document.getElementById('result');
  const processedVideo = document.getElementById('processed-video');
  const downloadLink = document.getElementById('download-link');

  const hiddenCanvas = document.createElement('canvas');
  const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
  const outputCtx = outputCanvas.getContext('2d');
  const mosaicCanvas = document.createElement('canvas');
  const mosaicCtx = mosaicCanvas.getContext('2d');

  let faceDetector = null;
  let modelReady = false;
  let visionFileset = null;
  let videoReady = false;
  let currentObjectUrl = null;
  let processing = false;
  let recorder = null;
  let recordedChunks = [];
  let animationId = null;
  const activeTracks = new Map();
  let nextTrackId = 1;

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function updateProgress(progress) {
    const clamped = Math.min(1, Math.max(0, progress || 0));
    progressFill.style.width = `${(clamped * 100).toFixed(1)}%`;
    progressText.textContent = `${(clamped * 100).toFixed(1)}%`;
  }

  function updateSliderLabels() {
    mosaicScaleValue.textContent = mosaicScaleInput.value;
    maskExpansionValue.textContent = maskExpansionInput.value;
    detectionThresholdValue.textContent = Number(detectionThresholdInput.value).toFixed(2);
  }

  function applyDetectorThreshold() {
    if (faceDetector && typeof faceDetector.setOptions === 'function') {
      faceDetector.setOptions({
        minDetectionConfidence: parseFloat(detectionThresholdInput.value),
      });
    }
  }

  async function loadDetector() {
    if (modelReady && faceDetector) {
      return faceDetector;
    }

    const vision = window.vision;
    if (!vision || !vision.FaceDetector || !vision.FilesetResolver) {
      setStatus('Unable to load face detection libraries. Please refresh and try again.');
      return null;
    }

    try {
      setStatus('Loading face detection model…');
      if (!visionFileset) {
        visionFileset = await vision.FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
      }

      faceDetector = await vision.FaceDetector.createFromOptions(visionFileset, {
        baseOptions: {
          modelAssetPath:
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm/face_detector.task',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: parseFloat(detectionThresholdInput.value),
      });

      applyDetectorThreshold();
      modelReady = true;
      setStatus('Model ready. Choose a video to begin.');
      enableProcessButton();
    } catch (error) {
      console.error(error);
      setStatus('Failed to load the face detection model. Please refresh and try again.');
      faceDetector = null;
    }

    return faceDetector;
  }

  function enableProcessButton() {
    if (modelReady && videoReady && !processing) {
      processBtn.disabled = false;
    }
  }

  function disableProcessButton() {
    processBtn.disabled = true;
  }

  function resetOutput() {
    resultEl.classList.add('hidden');
    processedVideo.removeAttribute('src');
    processedVideo.load();
    downloadLink.removeAttribute('href');
  }

  function revokeObjectUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function waitForEvent(target, event) {
    return new Promise((resolve) => {
      const handler = () => {
        target.removeEventListener(event, handler);
        resolve();
      };
      target.addEventListener(event, handler);
    });
  }

  function applyMosaic(x, y, width, height, scale) {
    const pixelFactor = Math.max(2, Math.floor(scale));
    const downsampleWidth = Math.max(1, Math.floor(width / pixelFactor));
    const downsampleHeight = Math.max(1, Math.floor(height / pixelFactor));

    mosaicCanvas.width = downsampleWidth;
    mosaicCanvas.height = downsampleHeight;

    mosaicCtx.imageSmoothingEnabled = false;
    mosaicCtx.clearRect(0, 0, downsampleWidth, downsampleHeight);
    mosaicCtx.drawImage(
      hiddenCanvas,
      x,
      y,
      width,
      height,
      0,
      0,
      downsampleWidth,
      downsampleHeight
    );

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radiusX = Math.max(1, (width / 2) * 0.9);
    const radiusY = Math.max(1, (height / 2) * 1.15);

    outputCtx.save();
    outputCtx.imageSmoothingEnabled = false;
    outputCtx.beginPath();
    outputCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    outputCtx.clip();
    outputCtx.drawImage(
      mosaicCanvas,
      0,
      0,
      downsampleWidth,
      downsampleHeight,
      x,
      y,
      width,
      height
    );
    outputCtx.restore();
    outputCtx.imageSmoothingEnabled = true;
  }

  function detectionToBox(detection) {
    const box = detection.boundingBox || {};
    return {
      x: box.originX || 0,
      y: box.originY || 0,
      width: box.width || 0,
      height: box.height || 0,
      score:
        (detection.categories && detection.categories[0] && detection.categories[0].score) ||
        detection.score ||
        0,
    };
  }

  function computeIoU(a, b) {
    const xA = Math.max(a.x, b.x);
    const yA = Math.max(a.y, b.y);
    const xB = Math.min(a.x + a.width, b.x + b.width);
    const yB = Math.min(a.y + a.height, b.y + b.height);

    const intersection = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (intersection <= 0) {
      return 0;
    }

    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    const union = areaA + areaB - intersection;
    if (union <= 0) {
      return 0;
    }

    return intersection / union;
  }

  function blendBoxes(previous, current, smoothing) {
    const keep = Math.max(0, Math.min(1, smoothing));
    const apply = 1 - keep;
    return {
      x: previous.x * keep + current.x * apply,
      y: previous.y * keep + current.y * apply,
      width: previous.width * keep + current.width * apply,
      height: previous.height * keep + current.height * apply,
      score: current.score,
    };
  }

  function updateTracks(detections, minScore, timestamp) {
    const smoothing = 0.65;
    const maxIdleSeconds = 0.45;
    const maxOutputGap = 0.3;
    const matches = new Map();

    for (const detection of detections) {
      const box = detectionToBox(detection);
      if (box.score < minScore) {
        continue;
      }
      if (box.width <= 0 || box.height <= 0) {
        continue;
      }

      let bestId = null;
      let bestIoU = 0;
      for (const [trackId, track] of activeTracks) {
        if (matches.has(trackId)) {
          continue;
        }
        const iou = computeIoU(track.box, box);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestId = trackId;
        }
      }

      if (bestId !== null && bestIoU >= 0.25) {
        const track = activeTracks.get(bestId);
        track.box = blendBoxes(track.box, box, smoothing);
        track.lastSeen = timestamp;
        track.score = box.score;
        matches.set(bestId, true);
      } else {
        const newId = nextTrackId++;
        activeTracks.set(newId, {
          box,
          score: box.score,
          lastSeen: timestamp,
        });
        matches.set(newId, true);
      }
    }

    for (const [trackId, track] of activeTracks) {
      if (timestamp - track.lastSeen > maxIdleSeconds) {
        activeTracks.delete(trackId);
      }
    }

    const results = [];
    for (const track of activeTracks.values()) {
      if (track.score >= minScore && timestamp - track.lastSeen <= maxOutputGap) {
        results.push(track.box);
      }
    }
    return results;
  }

  async function startProcessing() {
    if (!videoReady || !modelReady || processing) {
      return;
    }

    if (!(await loadDetector())) {
      return;
    }

    try {
      disableProcessButton();
      resetOutput();
      progressEl.classList.remove('hidden');
      updateProgress(0);
      setStatus('Preparing video…');
      processing = true;
      activeTracks.clear();

      videoEl.pause();
      videoEl.currentTime = 0;
      await waitForEvent(videoEl, 'seeked');

      const width = videoEl.videoWidth;
      const height = videoEl.videoHeight;
      hiddenCanvas.width = width;
      hiddenCanvas.height = height;
      outputCanvas.width = width;
      outputCanvas.height = height;

      const stream = outputCanvas.captureStream(30);
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not supported in this browser.');
      }

      recordedChunks = [];
      const preferredMimeTypes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];

      let mimeType = preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      if (!mimeType) {
        mimeType = '';
      }

      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        if (!recordedChunks.length) {
          setStatus('No video data captured. Try using a different browser.');
          return;
        }
        const usedMimeType = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: usedMimeType });
        const extension = usedMimeType.includes('mp4') ? 'mp4' : 'webm';
        revokeObjectUrl();
        currentObjectUrl = URL.createObjectURL(blob);
        processedVideo.src = currentObjectUrl;
        processedVideo.load();
        downloadLink.href = currentObjectUrl;
        downloadLink.download = `anonymized.${extension}`;
        resultEl.classList.remove('hidden');
        setStatus('Processing complete. Review the anonymized video below.');
        updateProgress(1);
        progressEl.classList.add('hidden');
        enableProcessButton();
      };
      recorder.start();

      setStatus('Analyzing frames…');
      await videoEl.play();

      const threshold = () => parseFloat(detectionThresholdInput.value);
      const expansion = () => parseInt(maskExpansionInput.value, 10);
      const mosaicScale = () => parseInt(mosaicScaleInput.value, 10);

      const finalize = () => {
        if (!processing) {
          return;
        }
        processing = false;
        activeTracks.clear();
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        videoEl.pause();
        setStatus('Finalizing video…');
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          progressEl.classList.add('hidden');
          enableProcessButton();
        }
      };

      const handleFrame = () => {
        if (!processing) {
          return;
        }

        hiddenCtx.drawImage(videoEl, 0, 0, width, height);
        outputCtx.drawImage(hiddenCanvas, 0, 0);

        let detections = [];
        try {
          if (!faceDetector) {
            throw new Error('Face detector unavailable.');
          }
          const detectionResult = faceDetector.detectForVideo(
            videoEl,
            Math.round(videoEl.currentTime * 1000)
          );
          detections = detectionResult && detectionResult.detections ? detectionResult.detections : [];
        } catch (error) {
          console.error(error);
          setStatus('Face tracking failed. Please refresh and try again.');
          finalize();
          return;
        }

        const scoreThreshold = threshold();
        const expand = expansion();
        const pixelScale = mosaicScale();

        const trackedBoxes = updateTracks(detections, scoreThreshold, videoEl.currentTime);

        for (const box of trackedBoxes) {
          let x = Math.floor(box.x) - expand;
          let y = Math.floor(box.y) - expand;
          let w = Math.floor(box.width) + expand * 2;
          let h = Math.floor(box.height) + expand * 2;

          x = Math.max(0, x);
          y = Math.max(0, y);
          w = Math.min(w, width - x);
          h = Math.min(h, height - y);
          if (w <= 0 || h <= 0) {
            continue;
          }
          applyMosaic(x, y, w, h, pixelScale);
        }

        if (videoEl.duration) {
          updateProgress(videoEl.currentTime / videoEl.duration);
        }

        if (videoEl.ended) {
          finalize();
          return;
        }

        if ('requestVideoFrameCallback' in videoEl) {
          videoEl.requestVideoFrameCallback(() => {
            handleFrame();
          });
        } else {
          animationId = requestAnimationFrame(handleFrame);
        }
      };

      if ('requestVideoFrameCallback' in videoEl) {
        videoEl.requestVideoFrameCallback(() => {
          handleFrame();
        });
      } else {
        animationId = requestAnimationFrame(handleFrame);
      }

      videoEl.addEventListener('ended', finalize, { once: true });
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'An unexpected error occurred during processing.');
      progressEl.classList.add('hidden');
      processing = false;
      enableProcessButton();
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    }
  }

  fileInput.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    videoReady = false;
    disableProcessButton();
    resetOutput();
    revokeObjectUrl();
    activeTracks.clear();

    if (!file) {
      setStatus('Model ready. Choose a video to begin.');
      videoEl.removeAttribute('src');
      videoEl.load();
      return;
    }

    const url = URL.createObjectURL(file);
    currentObjectUrl = url;
    videoEl.src = url;
    videoEl.load();

    const onLoaded = () => {
      videoEl.removeEventListener('loadedmetadata', onLoaded);
      videoReady = true;
      setStatus('Video loaded. Adjust the controls and start anonymizing.');
      enableProcessButton();
    };

    videoEl.addEventListener('loadedmetadata', onLoaded);
  });

  processBtn.addEventListener('click', startProcessing);

  mosaicScaleInput.addEventListener('input', updateSliderLabels);
  maskExpansionInput.addEventListener('input', updateSliderLabels);
  detectionThresholdInput.addEventListener('input', () => {
    updateSliderLabels();
    applyDetectorThreshold();
    activeTracks.clear();
  });

  updateSliderLabels();
  loadDetector();
})();
