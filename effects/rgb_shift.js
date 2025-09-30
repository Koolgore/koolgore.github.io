export function applyRGBShift(imageData, params) {
  const { offset = 5 } = params;
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  const shift = Math.floor(offset);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const sample = (x, y, channel) => {
    x = clamp(x, 0, width - 1);
    y = clamp(y, 0, height - 1);
    const idx = (y * width + x) * 4 + channel;
    return src[idx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      dst[base] = sample(x - shift, y, 0);
      dst[base + 1] = sample(x, y - shift, 1);
      dst[base + 2] = sample(x + shift, y, 2);
      dst[base + 3] = src[base + 3];
    }
  }

  imageData.data.set(dst);
  return imageData;
}
