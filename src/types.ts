export type AnonymizationMode = 'blur' | 'pixelate' | 'solid';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection extends BoundingBox {
  score: number;
}
