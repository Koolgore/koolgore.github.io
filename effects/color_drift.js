export function applyColorDrift(imageData, params) {
  const { hue = 20, saturation = 1, lightness = 1 } = params;
  const src = imageData.data;
  const length = src.length;
  const hueShift = (hue % 360) / 360;
  const satMult = Math.max(0, saturation);
  const lightMult = Math.max(0, lightness);

  for (let i = 0; i < length; i += 4) {
    const r = src[i] / 255;
    const g = src[i + 1] / 255;
    const b = src[i + 2] / 255;

    let { h, s, l } = rgbToHsl(r, g, b);
    h = (h + hueShift + 1) % 1;
    s = Math.min(1, s * satMult);
    l = Math.min(1, l * lightMult);

    const { r: nr, g: ng, b: nb } = hslToRgb(h, s, l);
    src[i] = nr * 255;
    src[i + 1] = ng * 255;
    src[i + 2] = nb * 255;
  }

  return imageData;
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      case b:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return { h, s: isFinite(s) ? s : 0, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    return { r: l, g: l, b: l };
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return { r, g, b };
}
