import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import { themeFromSourceColor, argbFromHex, applyTheme, labFromArgb } from '@material/material-color-utilities';
import namedColors from './named-colors.json';
import paletteLibrary from './palettes.json';
import { clamp, hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, rgbToHsl, readableInk } from './color.js';
import { ColorPlane } from './plane.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const paths = {
  minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14M12 5v14"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse: '<path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  moon: '<path d="M20.9 13.3A9 9 0 0 1 10.7 3.1a9 9 0 1 0 10.2 10.2Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bookmark: '<path d="M6 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15l-6-4-6 4Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  shuffle: '<path d="m17 3 4 4-4 4M3 17h3a4 4 0 0 0 3.2-1.6l5.6-6.8A4 4 0 0 1 18 7h3M3 7h3a4 4 0 0 1 3.2 1.6M14.8 15.4A4 4 0 0 0 18 17h3m-4-4 4 4-4 4"/>',
  pipette: '<path d="m15 6 3-3a2.1 2.1 0 0 1 3 3l-3 3M13 4l7 7M14 7 4 17l-1 4 4-1L17 10"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  'chevron-left': '<path d="m14 6-6 6 6 6"/>',
  'chevron-right': '<path d="m10 6 6 6-6 6"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });



let stored = {};
try { stored = JSON.parse(localStorage.getItem('hue-studio') || '{}') || {}; } catch { /* Storage is optional. */ }
const validHex = (value) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const initialHex = validHex(stored.color) ? stored.color : '#8B7AE8';
const state = {
  ...rgbToHsv(...hexToRgb(initialHex)),
  zoom: 1, x: 0, y: 0,
  dark: stored.dark === true,
  recent: Array.isArray(stored.recent) ? stored.recent.filter(validHex).slice(0, 8) : [initialHex],
  savedColors: Array.isArray(stored.savedColors) ? stored.savedColors.filter(validHex).slice(0, 40) : [],
  savedPalettes: Array.isArray(stored.savedPalettes) ? stored.savedPalettes.filter((id) => paletteLibrary.some((p) => p.id === id)) : [],
  tab: 'curated', paletteOffset: 0, paletteStyle: 'all',
};
const canvas = $('color-plane');
const picker = document.querySelector('.picker');
const plane = new ColorPlane(canvas);
let colorHex = initialHex, colorRgb = hexToRgb(initialHex), colorHsl = rgbToHsl(colorRgb);
let frame = 0, colorDirty = true, planeDirty = true, hoverPoint = null, toastTimer;
let themeTimer = 0, lastThemeAt = 0, lastThemeKey = '';
const namedColorLabs = namedColors.map((color) => labFromArgb(argbFromHex(color.hex)));
let preferredNamedColor = null, libraryGroup = 'all', libraryLimit = 72;

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2300);
}

function persist() {
  try {
    localStorage.setItem('hue-studio', JSON.stringify({ color: colorHex, dark: state.dark, recent: state.recent, savedColors: state.savedColors, savedPalettes: state.savedPalettes }));
  } catch { /* The picker also works when browser storage is unavailable. */ }
}

function updateTheme() {
  clearTimeout(themeTimer);
  themeTimer = 0;
  const key = `${state.dark}:${colorHex}`;
  if (key === lastThemeKey) return;
  lastThemeKey = key;
  lastThemeAt = performance.now();
  applyTheme(themeFromSourceColor(argbFromHex(colorHex)), { target: document.documentElement, dark: state.dark });
  document.documentElement.style.colorScheme = state.dark ? 'dark' : 'light';
  $('theme-toggle').innerHTML = icon(state.dark ? 'sun' : 'moon');
  $('theme-toggle').setAttribute('aria-label', state.dark ? '切换浅色模式' : '切换深色模式');
  $('theme-toggle').title = state.dark ? '切换浅色模式' : '切换深色模式';
  document.querySelector('meta[name="theme-color"]').content = state.dark ? '#1c1b1f' : '#f7f2fa';
}

function render() {
  frame = 0;
  if (planeDirty) { plane.draw(state); planeDirty = false; }
  if (colorDirty) {
    colorRgb = hsvToRgb(state.h, state.s, state.v);
    colorHex = rgbToHex(colorRgb);
    colorHsl = rgbToHsl(colorRgb);
    $('color-card').style.backgroundColor = colorHex;
    $('color-card').style.color = readableInk(colorRgb);
    $('hero-hex').textContent = colorHex;
    $('selection-label').textContent = colorHex;
    if (document.activeElement !== $('hex-input')) $('hex-input').value = colorHex;
    for (const [id, value] of [['rgb-value', colorRgb.join(',')], ['hsl-value', `${colorHsl[0]}°,${colorHsl[1]}%,${colorHsl[2]}%`]]) {
      const input = $(id);
      if (document.activeElement !== input) {
        input.value = value;
        input.removeAttribute('aria-invalid');
        input.parentElement.classList.remove('invalid');
      }
    }
    const lab = labFromArgb(argbFromHex(colorHex));
    let nearest = namedColors[0], distance = Infinity;
    // CIE Lab distance accounts for lightness and chroma, not just the hue.
    for (let index = 0; index < namedColors.length; index++) {
      const candidate = namedColorLabs[index];
      const difference = (lab[0] - candidate[0]) ** 2 + (lab[1] - candidate[1]) ** 2 + (lab[2] - candidate[2]) ** 2;
      if (difference < distance) { distance = difference; nearest = namedColors[index]; }
    }
    if (preferredNamedColor?.hex === colorHex) nearest = preferredNamedColor;
    const exactName = nearest.hex === colorHex;
    $('color-family').textContent = nearest.name;
    $('color-family').lang = nearest.group === 'css' ? 'en' : 'zh-CN';
    $('color-family').title = `${exactName ? '' : '最接近的命名色：'}${nearest.name} ${nearest.hex} · 点击打开颜色大全`;
    $('save-color').classList.toggle('saved', state.savedColors.includes(colorHex));
    $('save-color').setAttribute('aria-pressed', String(state.savedColors.includes(colorHex)));
    $('save-color').setAttribute('aria-label', state.savedColors.includes(colorHex) ? '取消收藏当前颜色' : '收藏当前颜色');
    $('hue').value = state.h;
    $('hue').style.setProperty('--thumb-color', `hsl(${state.h} 100% 50%)`);
    $('hue-value').innerHTML = `${Math.round(state.h)}<span>°</span>`;
    // Keep the theme responsive during dragging without recomputing it per pointer event.
    const themeDelay = Math.max(0, 50 - (performance.now() - lastThemeAt));
    if (!themeDelay) updateTheme();
    else if (!themeTimer) themeTimer = setTimeout(updateTheme, themeDelay);
    colorDirty = false;
  }
  const px = (state.s - state.x) * state.zoom * canvas.clientWidth;
  const py = (1 - state.v - state.y) * state.zoom * canvas.clientHeight;
  $('selection').style.transform = `translate(${px - 16}px, ${py - 16}px)`;
  $('selection').style.visibility = px < 0 || py < 0 || px > canvas.clientWidth || py > canvas.clientHeight ? 'hidden' : 'visible';
  $('zoom-reset').innerHTML = `${Math.round(state.zoom * 100)}<span>%</span>`;
  $('zoom-out').disabled = state.zoom <= 1;
  $('zoom-in').disabled = state.zoom >= 16;
  if (hoverPoint) {
    const { x, y } = hoverPoint;
    const rgb = hsvToRgb(state.h, clamp(state.x + x / canvas.clientWidth / state.zoom), 1 - clamp(state.y + y / canvas.clientHeight / state.zoom));
    const hex = rgbToHex(rgb);
    $('hover-color').style.display = 'flex';
    $('hover-color').style.transform = `translate(${Math.max(5, Math.min(x + 20, canvas.clientWidth - 120))}px, ${Math.max(5, Math.min(y + 20, canvas.clientHeight - 42))}px)`;
    $('hover-color').querySelector('i').style.background = hex;
    $('hover-color').querySelector('span').textContent = hex;
  } else $('hover-color').style.display = 'none';
}

function schedule({ color = false, plane: redraw = false } = {}) {
  colorDirty ||= color;
  planeDirty ||= redraw;
  if (!frame) frame = requestAnimationFrame(render);
}

function renderRecent() {
  $('recent-colors').replaceChildren();
  for (const hex of state.recent) {
    const button = document.createElement('button');
    button.style.background = hex;
    button.title = hex;
    button.setAttribute('aria-label', `选择最近的颜色 ${hex}`);
    button.classList.toggle('current', hex === colorHex);
    button.addEventListener('click', () => selectHex(hex));
    $('recent-colors').append(button);
  }
  if (!state.recent.length) $('recent-colors').innerHTML = '<p class="empty-state">下一次发现，从这里开始。</p>';
}

function commitColor() {
  if (frame) { cancelAnimationFrame(frame); frame = 0; }
  render();
  state.recent = [colorHex, ...state.recent.filter((hex) => hex !== colorHex)].slice(0, 8);
  updateTheme();
  renderRecent();
  persist();
}

function selectHex(hex) {
  Object.assign(state, rgbToHsv(...hexToRgb(hex), state.h));
  // Keep the selected point visible when choosing a color from another source.
  state.x = clamp(state.s - .5 / state.zoom, 0, 1 - 1 / state.zoom);
  state.y = clamp(1 - state.v - .5 / state.zoom, 0, 1 - 1 / state.zoom);
  $('hex-input').value = hex.toUpperCase();
  $('hex-input').removeAttribute('aria-invalid');
  document.querySelector('.hex-field').classList.remove('invalid');
  colorDirty = true;
  planeDirty = true;
  commitColor();
}

function renderPalettes() {
  const section = document.querySelector('.inspiration-section');
  const scroller = document.querySelector('.sidebar-content');
  const scrollTop = scroller.scrollTop;
  // Reserve the current panel height so a short favorites list cannot clamp scrollTop.
  if (state.tab === 'saved' && !section.style.minHeight) section.style.minHeight = `${section.getBoundingClientRect().height}px`;
  if (state.tab === 'curated') section.style.removeProperty('min-height');
  const holder = $('palettes');
  holder.replaceChildren();
  $('saved-count').textContent = state.savedPalettes.length + state.savedColors.length;
  for (const tab of ['curated', 'saved']) {
    $(`${tab}-tab`).classList.toggle('active', state.tab === tab);
    $(`${tab}-tab`).setAttribute('aria-pressed', String(state.tab === tab));
  }
  $('shuffle-palettes').disabled = state.tab === 'saved';
  const filtered = paletteLibrary.filter((palette) => state.paletteStyle === 'all' || palette.category === state.paletteStyle);
  const palettes = state.tab === 'saved'
    ? paletteLibrary.filter((p) => state.savedPalettes.includes(p.id))
    : filtered.slice(state.paletteOffset, state.paletteOffset + 3);
  $('palette-filter-row').hidden = state.tab === 'saved';
  document.querySelectorAll('[data-style]').forEach((button) => {
    button.classList.toggle('active', button.dataset.style === state.paletteStyle);
    button.setAttribute('aria-pressed', String(button.dataset.style === state.paletteStyle));
  });
  $('palette-pagination').hidden = state.tab === 'saved';
  $('palette-page').textContent = `${state.paletteOffset + 1}–${Math.min(state.paletteOffset + 3, filtered.length)} / ${filtered.length} 组`;
  $('palette-prev').disabled = state.paletteOffset === 0;
  $('palette-next').disabled = state.paletteOffset + 3 >= filtered.length;
  if (state.tab === 'saved' && state.savedColors.length) {
    const colors = document.createElement('div');
    colors.className = 'saved-colors';
    for (const hex of state.savedColors) {
      const chip = document.createElement('div');
      chip.className = 'saved-chip';
      chip.innerHTML = `<button style="background:${hex};color:${readableInk(hexToRgb(hex))}" aria-label="选择 ${hex}">${hex}</button><button aria-label="取消收藏 ${hex}" title="取消收藏">×</button>`;
      chip.firstChild.addEventListener('click', () => selectHex(hex));
      chip.lastChild.addEventListener('click', () => {
        state.savedColors = state.savedColors.filter((color) => color !== hex);
        renderPalettes(); schedule({ color: true }); persist();
      });
      colors.append(chip);
    }
    holder.append(colors);
  }
  for (const palette of palettes) {
    const card = document.createElement('article');
    card.className = 'palette';
    const saved = state.savedPalettes.includes(palette.id);
    card.innerHTML = `<div class="palette-colors">${palette.colors.map((hex) => `<button style="background:${hex};color:${readableInk(hexToRgb(hex))}" title="${hex}" aria-label="选择 ${palette.name} 中的 ${hex}" data-color="${hex}"></button>`).join('')}</div><div class="palette-meta"><div class="palette-name">${palette.name}<span>${palette.en}</span></div><button class="save-palette ${saved ? 'saved' : ''}" aria-label="${saved ? '取消收藏' : '收藏'}${palette.name}" aria-pressed="${saved}" title="${saved ? '取消收藏' : '收藏配色'}">${icon('heart')}</button></div>`;
    card.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => selectHex(button.dataset.color)));
    card.querySelector('.save-palette').addEventListener('click', () => {
      state.savedPalettes = saved ? state.savedPalettes.filter((id) => id !== palette.id) : [...state.savedPalettes, palette.id];
      renderPalettes(); persist();
      toast(saved ? '已取消收藏' : `已收藏「${palette.name}」`);
    });
    holder.append(card);
  }
  if (state.tab === 'saved' && !palettes.length && !state.savedColors.length) holder.innerHTML = '<p class="empty-state">把心动的颜色留下来。<br>点击色卡上的书签，或配色旁的爱心。</p>';
  scroller.scrollTop = scrollTop;
}

function zoomAt(factor, px = canvas.clientWidth / 2, py = canvas.clientHeight / 2) {
  const nextZoom = clamp(state.zoom * factor, 1, 16);
  const u = px / canvas.clientWidth, v = py / canvas.clientHeight;
  state.x = clamp(state.x + u / state.zoom - u / nextZoom, 0, 1 - 1 / nextZoom);
  state.y = clamp(state.y + v / state.zoom - v / nextZoom, 0, 1 - 1 / nextZoom);
  state.zoom = nextZoom;
  schedule({ plane: true });
}

// Coordinates stay in normalized HSV space, so zoom never changes color precision.
const pointers = new Map();
let drag = null, spaceHeld = false, pinch = null;
function pickAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  state.s = clamp(state.x + (clientX - rect.left) / rect.width / state.zoom);
  state.v = 1 - clamp(state.y + (clientY - rect.top) / rect.height / state.zoom);
  schedule({ color: true });
}

canvas.addEventListener('pointerdown', (event) => {
  if (![0, 1].includes(event.button)) return;
  event.preventDefault();
  canvas.setAttribute('data-pointer-focus', '');
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  hoverPoint = null;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    drag = null;
    return;
  }
  drag = { x: event.clientX, y: event.clientY, pan: spaceHeld || event.button === 1, moved: false, touch: event.pointerType === 'touch' };
  picker.classList.toggle('panning', drag.pan);
  // Delay a touch pick until movement/up so a second finger can begin a pinch.
  if (!drag.pan && !drag.touch) pickAt(event.clientX, event.clientY);
});

canvas.addEventListener('pointermove', (event) => {
  if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const rect = canvas.getBoundingClientRect();
    if (pinch.distance > 0) zoomAt(distance / pinch.distance, pinch.x - rect.left, pinch.y - rect.top);
    state.x = clamp(state.x - (center.x - pinch.x) / rect.width / state.zoom, 0, 1 - 1 / state.zoom);
    state.y = clamp(state.y - (center.y - pinch.y) / rect.height / state.zoom, 0, 1 - 1 / state.zoom);
    pinch = { distance, ...center };
    schedule({ plane: true });
  } else if (drag && pointers.has(event.pointerId)) {
    drag.moved = true;
    if (drag.pan) {
      state.x = clamp(state.x - (event.clientX - drag.x) / canvas.clientWidth / state.zoom, 0, 1 - 1 / state.zoom);
      state.y = clamp(state.y - (event.clientY - drag.y) / canvas.clientHeight / state.zoom, 0, 1 - 1 / state.zoom);
      drag.x = event.clientX; drag.y = event.clientY;
      schedule({ plane: true });
    } else pickAt(event.clientX, event.clientY);
  } else if (event.pointerType === 'mouse' && !pointers.size) {
    const rect = canvas.getBoundingClientRect();
    hoverPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    schedule();
  }
});

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(type, (event) => {
    if (!pointers.has(event.pointerId)) return;
    if (type === 'pointerup' && drag && !drag.pan && !pinch) {
      pickAt(event.clientX, event.clientY);
      commitColor();
    }
    pointers.delete(event.pointerId);
    drag = null;
    if (!pointers.size) pinch = null;
    picker.classList.remove('panning');
  });
}
canvas.addEventListener('pointerleave', () => { hoverPoint = null; schedule(); });
let wheelMode = 'pan', lastWheelAt = 0;
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
  const delta = event.deltaY * unit;
  const rect = canvas.getBoundingClientRect();
  if (event.ctrlKey) {
    zoomAt(Math.exp(-clamp(delta, -250, 250) * .012), event.clientX - rect.left, event.clientY - rect.top);
    return;
  }
  // WheelEvent has no device type. Keep each gesture consistent and recognize
  // discrete wheel steps; smooth pixel deltas and horizontal motion are panning.
  const now = performance.now();
  if (now - lastWheelAt > 180) {
    const amount = Math.abs(event.deltaY);
    const smoothRatio = amount > 0 && Math.abs(Math.abs(event.wheelDeltaY / event.deltaY) - 3) < .01;
    const discreteStep = amount >= 50 && (amount % 50 === 0 || amount % 120 === 0);
    wheelMode = event.deltaMode !== 0 || (discreteStep && !smoothRatio && event.deltaX === 0) ? 'zoom' : 'pan';
  }
  lastWheelAt = now;
  if (wheelMode === 'zoom' && !event.shiftKey) {
    zoomAt(Math.exp(-clamp(delta, -250, 250) * .0025), event.clientX - rect.left, event.clientY - rect.top);
  } else {
    state.x = clamp(state.x + event.deltaX * unit / rect.width / state.zoom, 0, 1 - 1 / state.zoom);
    state.y = clamp(state.y + delta / rect.height / state.zoom, 0, 1 - 1 / state.zoom);
    hoverPoint = null;
    schedule({ plane: true });
  }
}, { passive: false });
canvas.addEventListener('mousedown', (event) => { if (event.button === 1) event.preventDefault(); });
canvas.addEventListener('auxclick', (event) => { if (event.button === 1) event.preventDefault(); });

// Safari delivers trackpad pinch as gesture events rather than ctrl-wheel.
let gestureScale = 1;
canvas.addEventListener('gesturestart', (event) => { event.preventDefault(); gestureScale = 1; });
canvas.addEventListener('gesturechange', (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  zoomAt(event.scale / gestureScale, event.clientX - rect.left, event.clientY - rect.top);
  gestureScale = event.scale;
});
canvas.addEventListener('gestureend', (event) => event.preventDefault());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' || event.key.startsWith('Arrow')) canvas.removeAttribute('data-pointer-focus');
  if (event.composedPath().some((node) => node instanceof HTMLElement && (node.matches('input, textarea, md-filled-tonal-button, md-icon-button, button') || node.isContentEditable))) return;
  if (event.code === 'Space') { event.preventDefault(); spaceHeld = true; picker.classList.add('pan-ready'); }
  if (event.key === '+' || event.key === '=') zoomAt(1.25);
  if (event.key === '-') zoomAt(1 / 1.25);
  if (event.key === '0') { state.zoom = 1; state.x = 0; state.y = 0; schedule({ plane: true }); }
  if (event.key.startsWith('Arrow') && document.activeElement === canvas) {
    event.preventDefault();
    const step = (event.shiftKey ? .05 : .005) / state.zoom;
    if (event.key === 'ArrowLeft') state.s = clamp(state.s - step);
    if (event.key === 'ArrowRight') state.s = clamp(state.s + step);
    if (event.key === 'ArrowUp') state.v = clamp(state.v + step);
    if (event.key === 'ArrowDown') state.v = clamp(state.v - step);
    schedule({ color: true });
  }
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space') { spaceHeld = false; picker.classList.remove('pan-ready'); }
  if (event.key.startsWith('Arrow') && document.activeElement === canvas) commitColor();
});
window.addEventListener('blur', () => { spaceHeld = false; picker.classList.remove('pan-ready', 'panning'); });

$('hue').addEventListener('input', (event) => {
  state.h = Number(event.target.value);
  schedule({ color: true, plane: true });
});
$('hue').addEventListener('change', commitColor);
$('zoom-in').addEventListener('click', () => zoomAt(1.25));
$('zoom-out').addEventListener('click', () => zoomAt(1 / 1.25));
$('zoom-reset').addEventListener('click', () => { state.zoom = 1; state.x = 0; state.y = 0; schedule({ plane: true }); });
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else toast('当前浏览器不支持全屏，请使用浏览器全屏功能');
  } catch { toast('无法进入全屏，请使用浏览器全屏功能'); }
});
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').innerHTML = icon(document.fullscreenElement ? 'collapse' : 'expand');
  $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '进入全屏');
  $('fullscreen').title = document.fullscreenElement ? '退出全屏' : '全屏';
});
$('theme-toggle').addEventListener('click', () => { state.dark = !state.dark; updateTheme(); persist(); });

async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast(`已复制 ${value}`); }
  catch { toast('复制未获允许，请选中色值后手动复制'); $('hex-input').focus(); $('hex-input').select(); }
}
$('copy-hex').addEventListener('click', () => copy(colorHex));
$('copy-rgb').addEventListener('click', () => copy(`rgb(${colorRgb.join(', ')})`));
$('copy-hsl').addEventListener('click', () => copy(`hsl(${colorHsl[0]}, ${colorHsl[1]}%, ${colorHsl[2]}%)`));
for (const format of ['rgb', 'hsl']) {
  const input = $(`${format}-value`);
  input.addEventListener('blur', () => {
    const current = format === 'rgb' ? colorRgb.join(',') : `${colorHsl[0]}°,${colorHsl[1]}%,${colorHsl[2]}%`;
    if (input.value === current) {
      input.removeAttribute('aria-invalid'); input.parentElement.classList.remove('invalid');
      return;
    }
    const raw = input.value.trim().replace(new RegExp(`^${format}\\((.*)\\)$`, 'i'), '$1').trim();
    const parts = raw.includes(',') ? raw.split(',').map((part) => part.trim()) : raw.split(/\s+/);
    const validSyntax = parts.length === 3 && parts.every((part, index) => format === 'rgb'
      ? /^\d{1,3}$/.test(part)
      : (index === 0 ? /^(?:\d+(?:\.\d+)?|\.\d+)(?:deg|°)?$/i : /^(?:\d+(?:\.\d+)?|\.\d+)%?$/).test(part));
    const values = parts.map((part) => Number(part.replace(/(?:deg|°|%)$/i, '')));
    const validRange = values.every((value, index) => Number.isFinite(value) && value >= 0 && value <= (format === 'rgb' ? 255 : index === 0 ? 360 : 100));
    if (!validSyntax || !validRange) {
      input.setAttribute('aria-invalid', 'true'); input.parentElement.classList.add('invalid');
      toast(format === 'rgb' ? 'RGB 请填写三个 0–255 的整数，例如 189,147,63' : 'HSL 色相为 0–360，饱和度和亮度为 0–100，例如 40,50%,49%');
      return;
    }
    if (format === 'rgb') selectHex(rgbToHex(values));
    else {
      const [hue, saturation, lightness] = values;
      const l = lightness / 100;
      const v = l + saturation / 100 * Math.min(l, 1 - l);
      selectHex(rgbToHex(hsvToRgb(hue, v === 0 ? 0 : 2 * (1 - l / v), v)));
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
    if (event.key === 'Escape') {
      event.stopPropagation();
      input.value = format === 'rgb' ? colorRgb.join(',') : `${colorHsl[0]}°,${colorHsl[1]}%,${colorHsl[2]}%`;
      input.blur();
    }
  });
}
$('hex-input').addEventListener('blur', (event) => {
  let value = event.target.value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(value)) value = [...value].map((char) => char + char).join('');
  if (!/^[\da-f]{6}$/i.test(value)) {
    event.target.setAttribute('aria-invalid', 'true');
    document.querySelector('.hex-field').classList.add('invalid');
    toast('请输入 3 位或 6 位 HEX 色值，例如 #8B7AE8');
    return;
  }
  selectHex(`#${value.toUpperCase()}`);
});
$('hex-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') event.target.blur();
  if (event.key === 'Escape') {
    event.stopPropagation();
    event.target.value = colorHex;
    event.target.removeAttribute('aria-invalid');
    document.querySelector('.hex-field').classList.remove('invalid');
    event.target.blur();
  }
});

if (!('EyeDropper' in window)) $('eyedropper').hidden = true;
$('eyedropper').addEventListener('click', async () => {
  try { const result = await new window.EyeDropper().open(); selectHex(result.sRGBHex); }
  catch (error) { if (error.name !== 'AbortError') toast('当前浏览器无法使用屏幕取色'); }
});
$('save-color').addEventListener('click', () => {
  const saved = state.savedColors.includes(colorHex);
  if (!saved && state.savedColors.length >= 40) { toast('已收藏 40 个颜色，请先移除一个'); return; }
  state.savedColors = saved ? state.savedColors.filter((hex) => hex !== colorHex) : [...state.savedColors, colorHex];
  schedule({ color: true }); renderPalettes(); persist(); toast(saved ? '已取消收藏' : `已收藏 ${colorHex}`);
});
$('shuffle-palettes').addEventListener('click', () => {
  const count = paletteLibrary.filter((palette) => state.paletteStyle === 'all' || palette.category === state.paletteStyle).length;
  const pages = Math.ceil(count / 3);
  state.paletteOffset = ((state.paletteOffset / 3 + 1 + Math.floor(Math.random() * (pages - 1))) % pages) * 3;
  renderPalettes();
});
document.querySelectorAll('[data-style]').forEach((button) => button.addEventListener('click', () => {
  state.paletteStyle = button.dataset.style; state.paletteOffset = 0; renderPalettes();
}));
$('palette-prev').addEventListener('click', () => { state.paletteOffset = Math.max(0, state.paletteOffset - 3); renderPalettes(); });
$('palette-next').addEventListener('click', () => { state.paletteOffset += 3; renderPalettes(); });
for (const tab of ['curated', 'saved']) $(`${tab}-tab`).addEventListener('click', () => { state.tab = tab; renderPalettes(); });
$('clear-recent').addEventListener('click', () => { state.recent = []; renderRecent(); persist(); });

function renderLibrary() {
  const query = $('color-search').value.trim().toLowerCase();
  const matches = namedColors.filter((color) => (libraryGroup === 'all' || color.group === libraryGroup) && `${color.name} ${color.alias} ${color.hex}`.toLowerCase().includes(query));
  $('library-results-count').textContent = `${matches.length} 色`;
  const fragment = document.createDocumentFragment();
  for (const color of matches.slice(0, libraryLimit)) {
    const button = document.createElement('button');
    button.className = 'library-color';
    button.setAttribute('aria-label', `选择 ${color.name} ${color.hex}`);
    button.innerHTML = '<span class="library-swatch"></span><span class="library-color-name"></span><code></code>';
    button.querySelector('.library-swatch').style.background = color.hex;
    button.querySelector('.library-color-name').textContent = color.name;
    button.querySelector('code').textContent = color.hex;
    button.addEventListener('click', () => {
      preferredNamedColor = color;
      selectHex(color.hex);
      $('color-library').close();
    });
    fragment.append(button);
  }
  $('library-grid').replaceChildren(fragment);
  if (!matches.length) $('library-grid').innerHTML = '<p class="library-empty">没有匹配的颜色，试试其他名称或色值。</p>';
  $('library-more').hidden = matches.length <= libraryLimit;
  document.querySelectorAll('[data-group]').forEach((button) => {
    button.classList.toggle('active', button.dataset.group === libraryGroup);
    button.setAttribute('aria-pressed', String(button.dataset.group === libraryGroup));
  });
}

for (const id of ['open-library', 'color-family']) $(id).addEventListener('click', () => {
  renderLibrary(); $('color-library').show();
});
$('close-library').addEventListener('click', () => $('color-library').close());
$('color-search').addEventListener('input', () => { libraryLimit = 72; renderLibrary(); });
document.querySelectorAll('[data-group]').forEach((button) => button.addEventListener('click', () => {
  libraryGroup = button.dataset.group; libraryLimit = 72; renderLibrary();
}));
$('library-more').addEventListener('click', () => { libraryLimit += 72; renderLibrary(); });
$('library-total').textContent = namedColors.length;

const sidebar = document.querySelector('.sidebar');
const mobile = matchMedia('(max-width: 760px)');
function syncSidebar() {
  sidebar.inert = mobile.matches && !sidebar.classList.contains('open');
  $('mobile-sidebar').setAttribute('aria-expanded', String(!sidebar.inert));
}
$('mobile-sidebar').addEventListener('click', () => { sidebar.classList.add('open'); syncSidebar(); $('close-sidebar').focus(); });
$('close-sidebar').addEventListener('click', () => { sidebar.classList.remove('open'); syncSidebar(); $('mobile-sidebar').focus(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobile.matches && sidebar.classList.contains('open')) $('close-sidebar').click();
});
mobile.addEventListener('change', syncSidebar);
new ResizeObserver(() => schedule({ plane: true })).observe(canvas);
syncSidebar();
render();
updateTheme();
renderPalettes();
renderRecent();
