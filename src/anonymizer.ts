import type { AnonymizationMode, Detection } from './types';

const tempCanvas = document.createElement('canvas');
const tempCtxRaw = tempCanvas.getContext('2d');

const pixelCanvas = document.createElement('canvas');
const pixelCtxRaw = pixelCanvas.getContext('2d');

if (!tempCtxRaw || !pixelCtxRaw) {
  throw new Error('Failed to create helper canvases for anonymisation.');
}

const tempCtx = tempCtxRaw;
const pixelCtx = pixelCtxRaw;

function applyGaussianBlur(
  sourceCanvas: HTMLCanvasElement,
  destinationCtx: CanvasRenderingContext2D,
  box: Detection,
  radius: number
): void {
  const { x, y, width, height } = box;
  if (width <= 0 || height <= 0) {
    return;
  }

  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCtx.filter = `blur(${Math.max(1, radius)}px)`;
  tempCtx.drawImage(
    sourceCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    width,
    height
  );
  tempCtx.filter = 'none';
  destinationCtx.drawImage(tempCanvas, x, y);
}

function applyPixelation(
  sourceCanvas: HTMLCanvasElement,
  destinationCtx: CanvasRenderingContext2D,
  box: Detection,
  strength: number
): void {
  const { x, y, width, height } = box;
  if (width <= 0 || height <= 0) {
    return;
  }

  const blockSize = Math.max(4, Math.floor(strength));
  const targetWidth = Math.max(1, Math.floor(width / blockSize));
  const targetHeight = Math.max(1, Math.floor(height / blockSize));

  tempCanvas.width = targetWidth;
  tempCanvas.height = targetHeight;
  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(
    sourceCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  pixelCanvas.width = width;
  pixelCanvas.height = height;
  pixelCtx.imageSmoothingEnabled = false;
  pixelCtx.drawImage(
    tempCanvas,
    0,
    0,
    targetWidth,
    targetHeight,
    0,
    0,
    width,
    height
  );
  pixelCtx.imageSmoothingEnabled = true;

  destinationCtx.drawImage(pixelCanvas, x, y);
}

function applySolidFill(
  destinationCtx: CanvasRenderingContext2D,
  box: Detection
): void {
  const { x, y, width, height } = box;
  if (width <= 0 || height <= 0) {
    return;
  }

  destinationCtx.save();
  destinationCtx.fillStyle = '#000';
  destinationCtx.globalAlpha = 0.92;
  destinationCtx.fillRect(x, y, width, height);
  destinationCtx.restore();
}

export function anonymizeRegion(
  sourceCanvas: HTMLCanvasElement,
  destinationCtx: CanvasRenderingContext2D,
  box: Detection,
  mode: AnonymizationMode,
  strength: number
): void {
  switch (mode) {
    case 'blur':
      applyGaussianBlur(sourceCanvas, destinationCtx, box, strength);
      break;
    case 'pixelate':
      applyPixelation(sourceCanvas, destinationCtx, box, strength);
      break;
    case 'solid':
    default:
      applySolidFill(destinationCtx, box);
  }
}
