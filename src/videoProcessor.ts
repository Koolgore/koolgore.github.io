import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { anonymizeRegion } from './anonymizer';
import type { FaceDetector } from './faceDetector';
import type { AnonymizationMode, Detection } from './types';

const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core`;
const CORE_MT_BASE = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd/ffmpeg-core`;

const INPUT_FILE = 'input-video';
const FRAME_PATTERN = 'frame_%05d.png';
const OUTPUT_PATTERN = 'proc_%05d.png';
const AUDIO_FILE = 'audio_track.m4a';
const OUTPUT_FILE = 'output.mp4';

async function canvasToUint8Array(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Failed to serialise canvas to PNG.'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

async function loadVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const metadata = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight
      };
      cleanup();
      resolve(metadata);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Unable to read video metadata.'));
    };
  });
}

function sortFrameFiles(files: string[]): string[] {
  return [...files].sort((a, b) => a.localeCompare(b));
}

export interface VideoProcessorOptions {
  mode: AnonymizationMode;
  strength: number;
  detector: FaceDetector;
  previewCanvas: HTMLCanvasElement;
  onStatus?: (message: string) => void;
  onProgress?: (value: number, stage: 'extract' | 'anonymize' | 'encode') => void;
  onFrame?: (canvas: HTMLCanvasElement, detection: Detection | null, index: number) => void;
  onLog?: (message: string) => void;
}

export interface VideoProcessorResult {
  blob: Blob;
  frameCount: number;
  width: number;
  height: number;
  duration: number;
}

export class VideoProcessor {
  private readonly ffmpeg = new FFmpeg();
  private loaded = false;

  async init(): Promise<void> {
    if (this.loaded) {
      return;
    }

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${CORE_MT_BASE}.worker.js`, 'text/javascript')
    });
    this.loaded = true;
  }

  async process(file: File, options: VideoProcessorOptions): Promise<VideoProcessorResult> {
    await this.init();

    const {
      detector,
      mode,
      strength,
      previewCanvas,
      onStatus,
      onProgress,
      onFrame,
      onLog
    } = options;

    const logHandler = (event: { message: string }) => {
      if (event.message.trim()) {
        onLog?.(event.message);
      }
    };

    this.ffmpeg.on('log', logHandler);

    const metadata = await loadVideoMetadata(file);

    const progressHandler = (event: { progress: number }) => {
      if (event.progress >= 0 && event.progress <= 1) {
        onProgress?.(event.progress, 'encode');
      }
    };

    this.ffmpeg.on('progress', progressHandler);

    const cleanupTempFiles = async () => {
      const candidates = [INPUT_FILE, AUDIO_FILE, OUTPUT_FILE];
      await Promise.all(
        candidates.map(async (name) => {
          try {
            await this.ffmpeg.deleteFile(name);
          } catch (error) {
            const message = (error as Error).message || '';
            if (message.includes('ENOENT') || message.includes('exist')) {
              return;
            }
            onLog?.(`Cleanup skipped for ${name}: ${message}`);
          }
        })
      );
    };

    const writeInput = async () => {
      onStatus?.('Loading video into FFmpeg filesystem...');
      const data = await fetchFile(file);
      await this.ffmpeg.writeFile(INPUT_FILE, data);
    };

    const extractFrames = async () => {
      onStatus?.('Decoding video frames...');
      onProgress?.(0, 'extract');
      await this.ffmpeg.exec(['-i', INPUT_FILE, '-vsync', '0', FRAME_PATTERN]);
      const nodes = await this.ffmpeg.listDir('/');
      const frameFiles = nodes
        .filter((entry) => !entry.isDir && entry.name.startsWith('frame_') && entry.name.endsWith('.png'))
        .map((entry) => entry.name);
      onProgress?.(1, 'extract');
      return sortFrameFiles(frameFiles);
    };

    const extractAudio = async () => {
      onStatus?.('Extracting audio track (if present)...');
      try {
        const code = await this.ffmpeg.exec([
          '-i',
          INPUT_FILE,
          '-vn',
          '-acodec',
          'copy',
          AUDIO_FILE
        ]);
        if (code !== 0) {
          return false;
        }
        await this.ffmpeg.readFile(AUDIO_FILE);
        return true;
      } catch (error) {
        onLog?.(`Audio extraction skipped: ${(error as Error).message}`);
        return false;
      }
    };

    try {
      await cleanupTempFiles();
      await writeInput();
      const frameFiles = await extractFrames();

      if (frameFiles.length === 0) {
        throw new Error('No frames were decoded from the input video.');
      }

      const hasAudio = await extractAudio();

      const previewCtx = previewCanvas.getContext('2d');
      if (!previewCtx) {
        throw new Error('Unable to obtain preview canvas context.');
      }

      let processed = 0;
      const total = frameFiles.length;
      let frameWidth = 0;
      let frameHeight = 0;

      onStatus?.('Anonymising detected faces frame-by-frame...');

      for (const frameName of frameFiles) {
        const frameData = await this.ffmpeg.readFile(frameName);
        const blob = new Blob([frameData], { type: 'image/png' });
        const bitmap = await createImageBitmap(blob);

        frameWidth = bitmap.width;
        frameHeight = bitmap.height;

        previewCanvas.width = frameWidth;
        previewCanvas.height = frameHeight;
        previewCtx.drawImage(bitmap, 0, 0);

        const detection = await detector.detect(previewCanvas);
        if (detection) {
          anonymizeRegion(previewCanvas, previewCtx, detection, mode, strength);
        }

        onFrame?.(previewCanvas, detection, processed);

        const outputName = `proc_${frameName.split('_')[1]}`;
        const outputData = await canvasToUint8Array(previewCanvas);
        await this.ffmpeg.writeFile(outputName, outputData);
        await this.ffmpeg.deleteFile(frameName);

        processed += 1;
        onProgress?.(processed / total, 'anonymize');
        bitmap.close();
      }

      const fps = (() => {
        const duration = Math.max(metadata.duration, 0.01);
        const value = total / duration;
        return Number.isFinite(value) && value > 0 ? value : 25;
      })();

      onStatus?.('Encoding anonymised video...');
      onProgress?.(0, 'encode');

      const encodeArgs = hasAudio
        ? [
            '-framerate',
            fps.toFixed(3),
            '-i',
            OUTPUT_PATTERN,
            '-i',
            AUDIO_FILE,
            '-map',
            '0:v:0',
            '-map',
            '1:a:0',
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'copy',
            '-shortest',
            OUTPUT_FILE
          ]
        : [
            '-framerate',
            fps.toFixed(3),
            '-i',
            OUTPUT_PATTERN,
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
            OUTPUT_FILE
          ];

      const encodeResult = await this.ffmpeg.exec(encodeArgs);
      if (encodeResult !== 0) {
        throw new Error('FFmpeg failed to encode the anonymised video.');
      }

      const outputData = await this.ffmpeg.readFile(OUTPUT_FILE);
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });

      const remainingNodes = await this.ffmpeg.listDir('/');
      await Promise.all(
        remainingNodes
          .filter((entry) => !entry.isDir && entry.name.startsWith('proc_'))
          .map((entry) => this.ffmpeg.deleteFile(entry.name))
      );
      await cleanupTempFiles();

      onStatus?.('Completed. Ready to download.');

      return {
        blob: outputBlob,
        frameCount: total,
        width: frameWidth,
        height: frameHeight,
        duration: metadata.duration
      };
    } finally {
      this.ffmpeg.off('log', logHandler);
      this.ffmpeg.off('progress', progressHandler);
    }
  }
}
