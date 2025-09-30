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

  let model = null;
  let modelReady = false;
  let videoReady = false;
  let currentObjectUrl = null;
  let processing = false;
  let recorder = null;
  let recordedChunks = [];
  let animationId = null;

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

  async function loadModel() {
    if (modelReady || model) {
      return model;
    }
    try {
      if (typeof tf !== 'undefined' && tf.setBackend) {
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
      }
      if (typeof tf !== 'undefined' && tf.ready) {
        await tf.ready();
      }
      setStatus('Loading face detection model…');
      model = await blazeface.load();
      modelReady = true;
      setStatus('Model ready. Choose a video to begin.');
      enableProcessButton();
    } catch (error) {
      console.error(error);
      setStatus('Failed to load the face detection model. Please refresh and try again.');
    }
    return model;
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

    outputCtx.imageSmoothingEnabled = false;
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
    outputCtx.imageSmoothingEnabled = true;
  }

  async function startProcessing() {
    if (!videoReady || !modelReady || processing) {
      return;
    }

    const detector = await loadModel();
    if (!detector) {
      return;
    }

    try {
      disableProcessButton();
      resetOutput();
      progressEl.classList.remove('hidden');
      updateProgress(0);
      setStatus('Preparing video…');
      processing = true;

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
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      recorder = new MediaRecorder(stream, { mimeType });
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
        const blob = new Blob(recordedChunks, { type: recorder.mimeType || mimeType || 'video/webm' });
        revokeObjectUrl();
        currentObjectUrl = URL.createObjectURL(blob);
        processedVideo.src = currentObjectUrl;
        processedVideo.load();
        downloadLink.href = currentObjectUrl;
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

      const handleFrame = async () => {
        if (!processing) {
          return;
        }

        hiddenCtx.drawImage(videoEl, 0, 0, width, height);
        outputCtx.drawImage(hiddenCanvas, 0, 0);

        let faces = [];
        try {
          faces = await detector.estimateFaces(hiddenCanvas, false, false);
        } catch (error) {
          console.error(error);
          setStatus('Face tracking failed. Please refresh and try again.');
          finalize();
          return;
        }

        const scoreThreshold = threshold();
        const expand = expansion();
        const pixelScale = mosaicScale();

        for (const face of faces) {
          const confidence = face.probability ? face.probability[0] : 1;
          if (confidence < scoreThreshold) {
            continue;
          }
          const [x1, y1] = face.topLeft;
          const [x2, y2] = face.bottomRight;
          let x = Math.floor(x1) - expand;
          let y = Math.floor(y1) - expand;
          let w = Math.floor(x2 - x1) + expand * 2;
          let h = Math.floor(y2 - y1) + expand * 2;

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
  detectionThresholdInput.addEventListener('input', updateSliderLabels);

  updateSliderLabels();
  loadModel();
})();
