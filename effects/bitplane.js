export function applyBitPlane(imageData, params) {
  const {
    dropEnabled = true,
    drop = 1,
    invertEnabled = false,
    invert = 5,
  } = params;

  const src = imageData.data;
  const dropMask = dropEnabled ? ~(1 << Math.max(0, Math.min(7, drop))) : null;
  const invertMask = invertEnabled ? 1 << Math.max(0, Math.min(7, invert)) : 0;

  for (let i = 0; i < src.length; i += 4) {
    if (dropMask !== null) {
      src[i] &= dropMask;
      src[i + 1] &= dropMask;
      src[i + 2] &= dropMask;
    }
    if (invertMask) {
      src[i] ^= invertMask;
      src[i + 1] ^= invertMask;
      src[i + 2] ^= invertMask;
    }
  }

  return imageData;
}
