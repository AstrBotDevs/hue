import { extractColors } from './image-colors.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, colors: extractColors(new Uint8ClampedArray(data.pixels), data.count) });
  } catch {
    self.postMessage({ id: data.id, error: true });
  }
};
