import { rgbToHex } from './color.js';

// Weighted clustering favors dominant regions and removes tiny resizing artifacts.
export function extractColors(pixels, count) {
  const bins = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    if (alpha < .1) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = (rgb[0] >> 3) << 10 | (rgb[1] >> 3) << 5 | (rgb[2] >> 3);
    let bin = bins.get(key);
    if (!bin) { bin = { sum: [0, 0, 0], weight: 0 }; bins.set(key, bin); }
    bin.weight += alpha;
    for (let c = 0; c < 3; c++) bin.sum[c] += rgb[c] * alpha;
  }
  const points = [...bins.values()].map((bin) => ({ rgb: bin.sum.map((v) => v / bin.weight), weight: bin.weight }));
  if (!points.length) return [];
  const centers = [[...points.reduce((a, b) => a.weight > b.weight ? a : b).rgb]];
  while (centers.length < count) {
    let best, bestScore = 0;
    for (const point of points) {
      const distance = Math.min(...centers.map((center) => center.reduce((sum, value, c) => sum + (value - point.rgb[c]) ** 2, 0)));
      const score = distance < 144 ? 0 : distance * point.weight;
      if (score > bestScore) { best = point; bestScore = score; }
    }
    if (!best) break;
    centers.push([...best.rgb]);
  }
  let groups;
  for (let pass = 0; pass < 8; pass++) {
    groups = centers.map(() => ({ sum: [0, 0, 0], weight: 0 }));
    for (const point of points) {
      let nearest = 0, distance = Infinity;
      centers.forEach((center, index) => {
        const difference = center.reduce((sum, value, c) => sum + (value - point.rgb[c]) ** 2, 0);
        if (difference < distance) { nearest = index; distance = difference; }
      });
      const group = groups[nearest]; group.weight += point.weight;
      for (let c = 0; c < 3; c++) group.sum[c] += point.rgb[c] * point.weight;
    }
    groups.forEach((group, index) => { if (group.weight) centers[index] = group.sum.map((value) => value / group.weight); });
  }
  const total = groups.reduce((sum, group) => sum + group.weight, 0);
  const ranked = groups.map((group, index) => ({ rgb: centers[index].map(Math.round), weight: group.weight }))
    .filter((group) => group.weight / total >= .005).sort((a, b) => b.weight - a.weight);
  const distinct = [];
  for (const color of ranked) {
    if (!distinct.some((other) => other.rgb.reduce((sum, value, c) => sum + (value - color.rgb[c]) ** 2, 0) < 144)) distinct.push(color);
  }
  return distinct.map(({ rgb }) => rgbToHex(rgb));
}
