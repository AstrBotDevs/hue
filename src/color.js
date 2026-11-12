export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function hsvToRgb(h, s, v) {
  const channel = (n) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [channel(5), channel(3), channel(1)];
}

export function rgbToHsv(r, g, b, fallbackHue = 0) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = fallbackHue;
  if (delta) {
    h = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    h = ((h * 60) + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export const rgbToHex = (rgb) => `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
export const hexToRgb = (hex) => hex.replace('#', '').match(/.{2}/g).map((part) => parseInt(part, 16));

export function rgbToHsl(rgb) {
  const { h, s, v } = rgbToHsv(...rgb);
  const l = v * (1 - s / 2);
  const saturation = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return [Math.round(h), Math.round(saturation * 100), Math.round(l * 100)];
}

export function readableInk(rgb) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return luminance > 0.179 ? '#17151C' : '#FFFFFF';
}
