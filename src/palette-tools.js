import { Hct, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import { clamp } from './color.js';

export function generatePalette(hex, mode, previous = [], locks = [], variation = 0) {
  const base = Hct.fromInt(argbFromHex(hex));
  const offsets = { complementary: [0, 180, 180, 0, 180], analogous: [0, -30, -15, 15, 30], triadic: [0, 120, 240, 120, 240], monochrome: [0, 0, 0, 0, 0] }[mode];
  const tones = [base.tone, 85, 65, 40, 22];
  return offsets.map((offset, index) => {
    if (locks[index] && previous[index]) return previous[index];
    if (!index) return hex.toUpperCase();
    const shift = variation ? Math.sin(variation * 2.399 + index * 1.7) : 0;
    const tone = clamp(tones[index] + shift * 9, 8, 95);
    const chroma = base.chroma * (1 + shift * .2);
    return hexFromArgb(Hct.from((base.hue + offset + 360) % 360, chroma, tone).toInt()).toUpperCase();
  });
}

export function generateScale(hex) {
  const palette = TonalPalette.fromInt(argbFromHex(hex));
  return [98, 95, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((tone, index) => ({
    label: String(index === 0 ? 50 : index === 10 ? 950 : index * 100),
    hex: hexFromArgb(palette.tone(tone)).toUpperCase(),
  }));
}

export function parseShareHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const color = params.get('color');
  const palette = params.get('palette')?.split(',');
  const valid = (value) => /^[\da-f]{6}$/i.test(value || '');
  if ((color !== null && !valid(color)) || (palette && (palette.length > 12 || !palette.every(valid)))) return null;
  if (!color && !palette) return null;
  return { color: `#${(color || palette[0]).toUpperCase()}`, colors: palette?.map((value) => `#${value.toUpperCase()}`) || [] };
}

export function shareUrl(baseUrl, selected, colors) {
  const url = new URL(baseUrl);
  const params = new URLSearchParams({ color: selected.slice(1) });
  if (colors.length > 1) params.set('palette', colors.map((hex) => hex.slice(1)).join(','));
  url.hash = params.toString();
  return url.href;
}
