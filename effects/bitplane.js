export function applyBitPlane(imageData, params) {
  const {
    dropEnabled = true,
    drop = 1,
    invertEnabled = false,
    invert = 5,
  } = params;

  const src = imageData.data;
  const dropBit = dropEnabled ? Math.max(0, Math.min(7, drop | 0)) : null;
  const invertBit = invertEnabled ? Math.max(0, Math.min(7, invert | 0)) : null;

  for (let i = 0; i < src.length; i += 4) {
    if (dropBit !== null) {
      const mask = 0xff ^ (1 << dropBit);
      src[i] &= mask;
      src[i + 1] &= mask;
      src[i + 2] &= mask;
    }
    if (invertBit !== null) {
      const mask = 1 << invertBit;
      src[i] ^= mask;
      src[i + 1] ^= mask;
      src[i + 2] ^= mask;
    }
  }

  return imageData;
}
