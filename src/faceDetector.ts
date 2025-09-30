import * as ort from 'onnxruntime-web';
import type { Detection } from './types';

const MODEL_URLS = [
  'https://github.com/deepinsight/insightface/releases/download/scrfd/scrfd_500m_bnkps.onnx',
  'https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/detection/scrfd/models/scrfd_500m_bnkps.onnx',
  'https://huggingface.co/mbzuai-oryx/SCRFD/resolve/main/scrfd_500m_bnkps.onnx?download=1'
];

const INPUT_SIZE = 640;
const SCORE_THRESHOLD = 0.4;
const EXPANSION_RATIO = 0.2;

interface StrideOutputs {
  stride: number;
  cls: string;
  bbox: string;
  kps?: string;
}

interface TransformMeta {
  scale: number;
  padX: number;
  padY: number;
  originalWidth: number;
  originalHeight: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

async function downloadModel(): Promise<ArrayBuffer> {
  let lastError: unknown = null;
  for (const url of MODEL_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      console.warn(`Failed to fetch SCRFD model from ${url}:`, error);
    }
  }
  throw new Error(`Unable to download SCRFD model. Last error: ${String(lastError)}`);
}

export class FaceDetector {
  private session: ort.InferenceSession | null = null;
  private strideOutputs: StrideOutputs[] = [];
  private preprocessCanvas: OffscreenCanvas | HTMLCanvasElement;
  private preprocessCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  private executionProvider: 'webgpu' | 'wasm' | null = null;

  constructor() {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.preprocessCanvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = INPUT_SIZE;
      canvas.height = INPUT_SIZE;
      this.preprocessCanvas = canvas;
    }

    const ctx = this.preprocessCanvas.getContext('2d', {
      willReadFrequently: true
    });

    if (!ctx) {
      throw new Error('Failed to create preprocessing canvas context.');
    }

    this.preprocessCtx = ctx;
  }

  get provider(): 'webgpu' | 'wasm' | null {
    return this.executionProvider;
  }

  async init(): Promise<void> {
    if (this.session) {
      return;
    }

    ort.env.wasm.numThreads = Math.min(4, Math.max(1, navigator.hardwareConcurrency || 1));
    ort.env.wasm.proxy = true;

    const modelBuffer = await downloadModel();

    const tryCreateSession = async (
      executionProviders: ort.InferenceSession.SessionOptions['executionProviders']
    ) =>
      ort.InferenceSession.create(modelBuffer, {
        executionProviders,
        graphOptimizationLevel: 'all'
      });

    try {
      this.session = await tryCreateSession(['webgpu']);
      this.executionProvider = 'webgpu';
    } catch (error) {
      console.warn('WebGPU execution failed, falling back to WASM.', error);
      this.session = await tryCreateSession(['wasm']);
      this.executionProvider = 'wasm';
    }

    this.prepareStrideOutputs();
  }

  private prepareStrideOutputs(): void {
    if (!this.session) {
      throw new Error('Face detector session is not initialised.');
    }

    const outputs: Record<number, StrideOutputs> = {};

    for (const name of this.session.outputNames) {
      const lowered = name.toLowerCase();
      const strideMatch = lowered.match(/(\d+)/);
      if (!strideMatch) {
        continue;
      }
      const stride = parseInt(strideMatch[1], 10);
      if (!outputs[stride]) {
        outputs[stride] = { stride, cls: '', bbox: '' };
      }
      if (lowered.includes('cls')) {
        outputs[stride].cls = name;
      } else if (lowered.includes('bbox')) {
        outputs[stride].bbox = name;
      } else if (lowered.includes('kps')) {
        outputs[stride].kps = name;
      }
    }

    this.strideOutputs = Object.values(outputs)
      .filter((entry) => entry.cls && entry.bbox)
      .sort((a, b) => a.stride - b.stride);

    if (this.strideOutputs.length === 0) {
      throw new Error('Unexpected SCRFD model outputs.');
    }
  }

  private preprocess(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    sourceWidth: number,
    sourceHeight: number
  ): { tensor: ort.Tensor; meta: TransformMeta } {
    const ctx = this.preprocessCtx;
    const scale = Math.min(INPUT_SIZE / sourceWidth, INPUT_SIZE / sourceHeight);
    const newWidth = Math.round(sourceWidth * scale);
    const newHeight = Math.round(sourceHeight * scale);
    const padX = Math.floor((INPUT_SIZE - newWidth) / 2);
    const padY = Math.floor((INPUT_SIZE - newHeight) / 2);

    ctx.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    ctx.drawImage(canvas as CanvasImageSource, 0, 0, sourceWidth, sourceHeight, padX, padY, newWidth, newHeight);

    const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const { data } = imageData;
    const area = INPUT_SIZE * INPUT_SIZE;
    const floatData = new Float32Array(area * 3);

    for (let i = 0; i < area; i += 1) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];

      floatData[i] = r;
      floatData[i + area] = g;
      floatData[i + area * 2] = b;
    }

    const tensor = new ort.Tensor('float32', floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]);

    return {
      tensor,
      meta: {
        scale,
        padX,
        padY,
        originalWidth: sourceWidth,
        originalHeight: sourceHeight
      }
    };
  }

  private mapBoxToSource(box: Detection, meta: TransformMeta): Detection {
    const { scale, padX, padY, originalWidth, originalHeight } = meta;
    const x0 = (box.x - padX) / scale;
    const y0 = (box.y - padY) / scale;
    const x1 = (box.x + box.width - padX) / scale;
    const y1 = (box.y + box.height - padY) / scale;

    const mappedX0 = Math.max(0, Math.min(originalWidth, x0));
    const mappedY0 = Math.max(0, Math.min(originalHeight, y0));
    const mappedX1 = Math.max(0, Math.min(originalWidth, x1));
    const mappedY1 = Math.max(0, Math.min(originalHeight, y1));

    const width = Math.max(0, mappedX1 - mappedX0);
    const height = Math.max(0, mappedY1 - mappedY0);
    const expandX = (width * EXPANSION_RATIO) / 2;
    const expandY = (height * EXPANSION_RATIO) / 2;

    const expandedX0 = Math.max(0, mappedX0 - expandX);
    const expandedY0 = Math.max(0, mappedY0 - expandY);
    const expandedX1 = Math.min(originalWidth, mappedX1 + expandX);
    const expandedY1 = Math.min(originalHeight, mappedY1 + expandY);

    return {
      x: expandedX0,
      y: expandedY0,
      width: Math.max(0, expandedX1 - expandedX0),
      height: Math.max(0, expandedY1 - expandedY0),
      score: box.score
    };
  }

  async detect(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Detection | null> {
    if (!this.session) {
      throw new Error('Face detector session not initialised. Call init() first.');
    }

    const width = canvas.width;
    const height = canvas.height;

    if (!width || !height) {
      return null;
    }

    const { tensor, meta } = this.preprocess(canvas, width, height);
    const feeds: Record<string, ort.Tensor> = {
      [this.session.inputNames[0]]: tensor
    };

    const outputMap = await this.session.run(feeds);

    let bestDetection: Detection | null = null;

    for (const strideInfo of this.strideOutputs) {
      const clsTensor = outputMap[strideInfo.cls];
      const bboxTensor = outputMap[strideInfo.bbox];

      if (!clsTensor || !bboxTensor) {
        continue;
      }

      const clsData = clsTensor.data as Float32Array;
      const bboxData = bboxTensor.data as Float32Array;
      const dims = clsTensor.dims;
      const anchors = dims[1];
      const heightDim = dims[dims.length - 2];
      const widthDim = dims[dims.length - 1];
      const area = heightDim * widthDim;

      for (let anchor = 0; anchor < anchors; anchor += 1) {
        const anchorOffset = anchor * area;
        for (let index = 0; index < area; index += 1) {
          const score = sigmoid(clsData[anchorOffset + index]);
          if (score < SCORE_THRESHOLD) {
            continue;
          }
          const yIndex = Math.floor(index / widthDim);
          const xIndex = index % widthDim;
          const stride = strideInfo.stride;
          const centerX = (xIndex + 0.5) * stride;
          const centerY = (yIndex + 0.5) * stride;

          const bboxOffsetBase = anchor * 4 * area + index;
          const dx1 = bboxData[bboxOffsetBase];
          const dy1 = bboxData[bboxOffsetBase + area];
          const dx2 = bboxData[bboxOffsetBase + area * 2];
          const dy2 = bboxData[bboxOffsetBase + area * 3];

          const x0 = centerX - dx1 * stride;
          const y0 = centerY - dy1 * stride;
          const x1 = centerX + dx2 * stride;
          const y1 = centerY + dy2 * stride;

          const candidate: Detection = {
            x: x0,
            y: y0,
            width: x1 - x0,
            height: y1 - y0,
            score
          };

          if (!bestDetection || candidate.score > bestDetection.score) {
            bestDetection = candidate;
          }
        }
      }
    }

    if (!bestDetection) {
      return null;
    }

    return this.mapBoxToSource(bestDetection, meta);
  }
}
