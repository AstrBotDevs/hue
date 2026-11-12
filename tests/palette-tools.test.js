import test from 'node:test';
import { extractColors } from '../src/image-colors.js';
import assert from 'node:assert/strict';
import { Hct, argbFromHex } from '@material/material-color-utilities';
import { generatePalette, generateScale, parseShareHash, shareUrl } from '../src/palette-tools.js';

for (const mode of ['complementary', 'analogous', 'triadic', 'monochrome']) {
  test(`${mode} follows the base color and preserves locked colors`, () => {
    const first = generatePalette('#8B7AE8', mode);
    const original = [...first];
    const next = generatePalette('#197A65', mode, first, [false, true, false, true, false], 2);
    assert.equal(next[0], '#197A65');
    assert.equal(next[1], first[1]);
    assert.equal(next[3], first[3]);
    assert.notEqual(next[2], first[2]);
    assert.deepEqual(first, original);
    assert.ok(next.every((hex) => /^#[\dA-F]{6}$/.test(hex)));
    assert.deepEqual(generatePalette('#000000', mode, first, [true, true, true, true, true], 5), first);
  });
}

test('regeneration changes unlocked variants while retaining the anchor', () => {
  const first = generatePalette('#8B7AE8', 'triadic');
  const next = generatePalette('#8B7AE8', 'triadic', first, [], 1);
  assert.equal(first[0], next[0]);
  assert.notDeepEqual(first, next);
});

for (const base of ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#8B7AE8']) {
  test(`tonal scale for ${base} has ordered perceptual lightness`, () => {
    const scale = generateScale(base);
    assert.deepEqual(scale.map((entry) => entry.label), ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']);
    const tones = scale.map((entry) => Hct.fromInt(argbFromHex(entry.hex)).tone);
    assert.ok(tones.every((tone, index) => index === 0 || tone < tones[index - 1]));
  });
}

test('share links restore the selected color and every palette entry', () => {
  const colors = generateScale('#8B7AE8').map((entry) => entry.hex);
  const url = shareUrl('https://hue.astrbot.app/#old', '#8B7AE8', colors);
  assert.deepEqual(parseShareHash(new URL(url).hash), { color: '#8B7AE8', colors });
  assert.deepEqual(parseShareHash(new URL(shareUrl('https://hue.astrbot.app/', '#123456', ['#123456'])).hash), { color: '#123456', colors: [] });
  assert.deepEqual(parseShareHash('#palette=ff0000,00ff00'), { color: '#FF0000', colors: ['#FF0000', '#00FF00'] });
});

for (const hash of ['#color=<script>', '#palette=000000,nope', '#palette=', '#color=123', '#palette=' + Array(13).fill('112233').join(','), '#unknown=123456']) {
  test(`rejects malformed or unbounded share payload: ${hash.slice(0, 35)}`, () => assert.equal(parseShareHash(hash), null));
}

test('image extraction keeps solid regions and ignores transparent pixels', () => {
  const pixels = new Uint8ClampedArray([
    ...Array(12).fill([255, 0, 0, 255]).flat(),
    ...Array(8).fill([0, 255, 0, 255]).flat(),
    ...Array(4).fill([0, 0, 255, 255]).flat(),
    ...Array(20).fill([255, 255, 255, 0]).flat(),
  ]);
  assert.deepEqual(extractColors(pixels, 6), ['#FF0000', '#00FF00', '#0000FF']);
  assert.deepEqual(extractColors(new Uint8ClampedArray([240, 20, 30, 0]), 8), []);
  assert.deepEqual(extractColors(new Uint8ClampedArray([240, 20, 30, 128]), 8), ['#F0141E']);
});

test('complex image extraction is bounded and returns distinct valid colors', () => {
  const pixels = new Uint8ClampedArray(192 * 192 * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = (i * 13) % 256; pixels[i + 1] = (i / 4 * 17) % 256; pixels[i + 2] = (i / 16) % 256; pixels[i + 3] = 255;
  }
  const colors = extractColors(pixels, 8);
  assert.ok(colors.length > 0 && colors.length <= 8);
  assert.equal(colors.length, new Set(colors).size);
  assert.ok(colors.every((hex) => /^#[\dA-F]{6}$/.test(hex)));
});
