export function applyFrameSmear(imageData, params, state = {}) {
  const { mix = 0.5 } = params;
  const src = imageData.data;
  const length = src.length;

  if (!state.previousFrame || state.previousFrame.length !== length) {
    state.previousFrame = new Uint8ClampedArray(src);
    return imageData;
  }

  const previous = state.previousFrame;
  const alpha = Math.min(Math.max(mix, 0), 0.99);
  const invAlpha = 1 - alpha;

  for (let i = 0; i < length; i += 4) {
    src[i] = invAlpha * src[i] + alpha * previous[i];
    src[i + 1] = invAlpha * src[i + 1] + alpha * previous[i + 1];
    src[i + 2] = invAlpha * src[i + 2] + alpha * previous[i + 2];
  }

  state.previousFrame = new Uint8ClampedArray(src);
  return imageData;
}
