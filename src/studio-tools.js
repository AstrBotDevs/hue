import { hexToRgb, readableInk } from './color.js';
import { generatePalette, generateScale, shareUrl } from './palette-tools.js';
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);

export class StudioTools {
  constructor({ color, shared, select, save, toast, icon, reveal }) {
    Object.assign(this, { color, shared, select, save, toast, icon, reveal });
    this.mode = 'complementary';
    this.locks = [false, false, false, false, false];
    this.variation = 0;
    this.generated = generatePalette(color, this.mode);
    this.scale = generateScale(color);
    this.imageColors = [];
    this.count = 6;
    this.request = 0;
    this.imageStatus = '';
    this.exportFormat = 'link';
    this.exportData = null;
    this.updateTimer = 0;
    this.worker = null;
    $('share-color').addEventListener('click', () => this.openExport([this.color]));
    $('choose-image').addEventListener('click', () => $('image-file').click());
    $('image-file').addEventListener('change', () => {
      const file = $('image-file').files[0];
      if (file) this.receiveImage(file);
      $('image-file').value = '';
    });
    document.addEventListener('paste', (event) => {
      const item = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (file) { event.preventDefault(); this.receiveImage(file); }
    });
    let dragDepth = 0;
    document.addEventListener('dragenter', (event) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault(); dragDepth++; $('drop-overlay').hidden = false;
    });
    document.addEventListener('dragover', (event) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop-overlay').hidden = true; } });
    document.addEventListener('drop', (event) => {
      dragDepth = 0; $('drop-overlay').hidden = true;
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      const file = [...event.dataTransfer.files].find((file) => file.type.startsWith('image/'));
      if (file) this.receiveImage(file); else this.toast(t('请选择支持的图片格式'));
    });
    window.addEventListener('blur', () => { dragDepth = 0; $('drop-overlay').hidden = true; });
    document.querySelectorAll('[data-count]').forEach((button) => button.addEventListener('click', () => {
      this.count = Number(button.dataset.count);
      if (this.imagePixels && this.worker) {
        this.busy = true; this.imageStatus = '正在提取配色…';
        const pixels = this.imagePixels.slice().buffer;
        this.worker.postMessage({ id: ++this.request, count: this.count, pixels }, [pixels]);
      }
      this.render();
    }));
    document.querySelectorAll('[data-harmony]').forEach((button) => button.addEventListener('click', () => {
      this.mode = button.dataset.harmony; this.variation = 0;
      this.generated = generatePalette(this.color, this.mode, this.generated, this.locks);
      this.render();
    }));
    $('regenerate').addEventListener('click', () => {
      this.generated = generatePalette(this.color, this.mode, this.generated, this.locks, ++this.variation);
      this.render();
    });
    for (const kind of ['image', 'harmony', 'scale', 'shared']) {
      $(`save-${kind}`).addEventListener('click', () => {
        const colors = kind === 'image' ? this.imageColors : kind === 'harmony' ? this.generated : kind === 'scale' ? this.scale.map((entry) => entry.hex) : this.shared;
        this.save(colors, kind);
      });
      $(`export-${kind}`).addEventListener('click', () => {
        const colors = kind === 'image' ? this.imageColors : kind === 'harmony' ? this.generated : kind === 'scale' ? this.scale.map((entry) => entry.hex) : this.shared;
        this.openExport(colors, kind === 'scale' ? this.scale.map((entry) => entry.label) : null);
      });
    }
    for (const id of ['harmony-tool', 'scale-tool']) $(id).addEventListener('toggle', () => this.render());
    $('close-export').addEventListener('click', () => $('export-dialog').close());
    document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => {
      this.exportFormat = button.dataset.format; this.renderExport();
    }));
    $('copy-export').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('export-text').value); this.toast(t('已复制')); }
      catch { $('export-text').focus(); $('export-text').select(); this.toast(t('请手动复制选中的内容')); }
    });
    $('download-text').addEventListener('click', () => {
      const blob = new Blob([$('export-text').value], { type: this.exportFormat === 'css' ? 'text/css;charset=utf-8' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `hue-palette.${this.exportFormat === 'css' ? 'css' : 'txt'}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $('download-png').addEventListener('click', async () => {
      const { colors, labels } = this.exportData;
      const canvas = document.createElement('canvas');
      const cellWidth = 180;
      canvas.width = Math.max(540, colors.length * cellWidth); canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FAF8FC'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#29252F'; ctx.font = '600 24px system-ui, sans-serif'; ctx.fillText('Hue by AstrBot', 24, 44);
      colors.forEach((hex, index) => {
        const width = canvas.width / colors.length, x = width * index;
        ctx.fillStyle = hex; ctx.fillRect(x, 72, width, 212);
        ctx.fillStyle = '#29252F'; ctx.font = '16px ui-monospace, monospace'; ctx.fillText(hex, x + 14, 316);
        if (labels) { ctx.font = '12px system-ui, sans-serif'; ctx.fillText(labels[index], x + 14, 340); }
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) { this.toast(t('图片导出失败，请重试')); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'hue-palette.png'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    this.render();
  }

  updateColor(hex) {
    if (hex === this.color) return;
    this.color = hex;
    // Defer derived palettes so pointer rendering remains the priority.
    if (!this.updateTimer) this.updateTimer = setTimeout(() => {
      this.updateTimer = 0;
      this.generated = generatePalette(this.color, this.mode, this.generated, this.locks, this.variation);
      this.scale = generateScale(this.color);
      this.render();
    }, 100);
  }

  renderSwatches(id, colors, lockable = false) {
    const holder = $(id);
    holder.replaceChildren();
    holder.classList.toggle('many-colors', colors.length > 6);
    colors.forEach((hex, index) => {
      const cell = document.createElement('div'); cell.className = 'tool-swatch';
      cell.innerHTML = `<button class="tool-color" style="background:${hex};color:${readableInk(hexToRgb(hex))}" aria-label="${t('选择 {hex}', { hex })}" title="${hex}"></button><code>${hex.slice(1)}</code>`;
      cell.firstChild.addEventListener('click', () => this.select(hex));
      if (lockable) {
        const lock = document.createElement('button');
        lock.className = 'lock-color'; lock.innerHTML = this.icon(this.locks[index] ? 'lock' : 'unlock');
        lock.title = t(this.locks[index] ? '解锁 {hex}' : '锁定 {hex}', { hex });
        lock.setAttribute('aria-label', lock.title); lock.setAttribute('aria-pressed', String(this.locks[index]));
        lock.addEventListener('click', () => { this.locks[index] = !this.locks[index]; this.render(); });
        cell.append(lock);
      }
      holder.append(cell);
    });
  }

  render() {
    this.renderSwatches('harmony-swatches', this.generated, true);
    this.renderSwatches('image-swatches', this.imageColors);
    this.renderSwatches('shared-swatches', this.shared);
    $('shared-palette').hidden = !this.shared.length;
    $('regenerate').disabled = this.locks.every(Boolean);
    $('save-image').disabled = $('export-image').disabled = !this.imageColors.length || this.busy;
    $('image-status').textContent = this.imageStatus === '已提取 {count} 个主色' ? t(this.imageStatus, { count: this.imageColors.length }) : t(this.imageStatus);
    $('image-tool').setAttribute('aria-busy', String(!!this.busy));
    document.querySelectorAll('[data-count]').forEach((button) => { button.setAttribute('aria-pressed', String(Number(button.dataset.count) === this.count)); button.disabled = !!this.decoding; });
    document.querySelectorAll('[data-harmony]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.harmony === this.mode)));
    $('scale-swatches').replaceChildren();
    this.scale.forEach(({ label, hex }) => {
      const button = document.createElement('button');
      button.style.background = hex; button.style.color = readableInk(hexToRgb(hex));
      button.innerHTML = `<span>${label}</span><code>${hex}</code>`;
      button.title = `${label} · ${hex}`; button.setAttribute('aria-label', t('选择 {hex}', { hex }));
      button.addEventListener('click', () => this.select(hex));
      $('scale-swatches').append(button);
    });
    if (this.exportData) this.renderExport();
  }

  async receiveImage(file) {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) { this.toast(t('请选择支持的图片格式')); return; }
    if (file.size > 20 * 1024 * 1024) { this.toast(t('图片不能超过 20 MB')); return; }
    const request = ++this.request;
    this.busy = true; this.decoding = true; this.imageStatus = '正在提取配色…';
    this.imageColors = []; this.imagePixels = null;
    $('image-tool').open = true; this.reveal(); this.render();
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (request !== this.request) return;
      if (image.naturalWidth * image.naturalHeight > 100000000) throw new Error('Image dimensions exceed limit');
      const ratio = Math.min(1, 192 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      this.imagePixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      $('image-preview').src = canvas.toDataURL('image/png'); $('image-preview').hidden = false;
      if (!this.worker) {
        this.worker = new Worker(new URL('./extract.worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }) => {
          if (data.id !== this.request) return;
          this.busy = false;
          this.imageColors = data.colors || [];
          this.imageStatus = data.error ? '无法分析图片，请换一张重试' : this.imageColors.length ? '已提取 {count} 个主色' : '图片中没有可见颜色';
          this.render();
        };
        this.worker.onerror = () => {
          this.busy = false; this.imageStatus = '无法分析图片，请换一张重试';
          this.worker.terminate(); this.worker = null; this.render();
        };
      }
      this.decoding = false;
      const pixels = this.imagePixels.slice().buffer;
      this.worker.postMessage({ id: request, count: this.count, pixels }, [pixels]);
      this.render();
    } catch {
      if (request === this.request) {
        this.busy = false; this.decoding = false; this.imageStatus = '无法读取图片，请换一张重试';
        $('image-preview').hidden = true; this.render();
      }
    } finally { URL.revokeObjectURL(url); }
  }

  openExport(colors, labels = null) {
    if (!colors.length) return;
    this.exportData = { colors: [...colors], labels, selected: colors.length === 1 ? colors[0] : this.color };
    this.exportFormat = 'link'; this.renderExport(); $('export-dialog').show();
  }

  renderExport() {
    const { colors, labels, selected } = this.exportData;
    $('export-swatches').replaceChildren();
    for (const hex of colors) {
      const swatch = document.createElement('span'); swatch.style.background = hex; swatch.title = hex; $('export-swatches').append(swatch);
    }
    $('export-text').value = this.exportFormat === 'link' ? shareUrl(location.href, selected, colors)
      : this.exportFormat === 'css' ? `:root {\n${colors.map((hex, index) => `  --color-${labels?.[index] || index + 1}: ${hex};`).join('\n')}\n}\n`
      : colors.join('\n');
    document.querySelectorAll('[data-format]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.format === this.exportFormat)));
  }
}
