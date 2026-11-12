const english = {
  "颜色选择器": "Color picker",
  "饱和度与明度取色区。方向键调整颜色，Shift 加速；滚轮缩放，空格加拖动平移。": "Saturation and brightness. Arrow keys adjust color; Shift for larger steps. Mouse wheel or pinch to zoom; trackpad scroll, middle-button drag, or Space-drag to pan.",
  "打开颜色面板": "Open color panel",
  "色相与缩放控制": "Hue and zoom controls",
  "色相": "Hue",
  "缩小": "Zoom out",
  "缩小（−）": "Zoom out (−)",
  "重置视图（0）": "Reset view (0)",
  "重置缩放": "Reset zoom",
  "放大": "Zoom in",
  "放大（+）": "Zoom in (+)",
  "进入全屏": "Enter fullscreen",
  "退出全屏": "Exit fullscreen",
  "全屏": "Fullscreen",
  "当前颜色与配色灵感": "Selected color and palette inspiration",
  "切换深色模式": "Switch to dark mode",
  "切换浅色模式": "Switch to light mode",
  "关闭颜色面板": "Close color panel",
  "当前颜色": "Selected color",
  "在颜色大全中探索": "Explore the color library",
  "匹配颜色名称": "Matching color name",
  "收藏当前颜色": "Save this color",
  "取消收藏当前颜色": "Unsave this color",
  "输入 HEX 色值": "Enter HEX color",
  "复制 HEX 色值": "Copy HEX color",
  "复制 HEX": "Copy HEX",
  "输入 RGB 色值": "Enter RGB color",
  "R,G,B，各项为 0–255 的整数": "R,G,B: integers from 0 to 255",
  "复制 RGB": "Copy RGB",
  "复制 RGB 色值": "Copy RGB color",
  "输入 HSL 色值": "Enter HSL color",
  "H,S%,L%，色相 0–360，饱和度与亮度 0–100": "H,S%,L%: hue 0–360, saturation and lightness 0–100",
  "复制 HSL": "Copy HSL",
  "复制 HSL 色值": "Copy HSL color",
  "从屏幕取色": "Pick from screen",
  "颜色大全": "Color library",
  "配色灵感": "Palette inspiration",
  "换一组配色": "Shuffle palettes",
  "换一组": "Shuffle",
  "配色分类": "Palette tabs",
  "精选配色": "Curated palettes",
  "我的收藏": "Favorites",
  "配色风格": "Palette styles",
  "全部": "All",
  "自然": "Nature",
  "柔和": "Soft",
  "鲜明": "Vivid",
  "复古": "Retro",
  "深色": "Dark",
  "极简": "Minimal",
  "上一页配色": "Previous palettes",
  "下一页配色": "Next palettes",
  "最近探索": "Recent colors",
  "清空": "Clear",
  "关闭颜色大全": "Close color library",
  "搜索名称、拼音或 HEX": "Search name, pinyin, or HEX",
  "搜索颜色": "Search colors",
  "颜色来源": "Color sources",
  "中国传统色": "Chinese colors",
  "CSS 标准色": "CSS colors",
  "显示更多": "Show more",
  "中国色": "Zhongguose",
  "HUE — 全屏色彩工作台。探索颜色、自由缩放、收藏灵感。": "Hue by AstrBot — a full-screen color picker. Explore colors, zoom freely, and save your inspiration.",
  "最接近的命名色：": "Nearest named color: ",
  "点击打开颜色大全": "Open the color library",
  "选择最近的颜色 {hex}": "Select recent color {hex}",
  "下一次发现，从这里开始。": "Your next discovery starts here.",
  "{range} / {total} 组": "{range} / {total} palettes",
  "选择 {hex}": "Select {hex}",
  "取消收藏 {name}": "Unsave {name}",
  "取消收藏": "Unsave",
  "选择 {name} 中的 {hex}": "Select {hex} from {name}",
  "收藏 {name}": "Save {name}",
  "收藏配色": "Save palette",
  "已取消收藏": "Removed from favorites",
  "已收藏「{name}」": "Saved “{name}”",
  "把心动的颜色留下来。": "Keep the colors you love.",
  "点击色卡上的书签，或配色旁的爱心。": "Use the bookmark on a color or the heart beside a palette.",
  "当前浏览器不支持全屏，请使用浏览器全屏功能": "Fullscreen is unavailable. Try your browser’s fullscreen control.",
  "无法进入全屏，请使用浏览器全屏功能": "Could not enter fullscreen. Try your browser’s fullscreen control.",
  "已复制 {value}": "Copied {value}",
  "复制未获允许，请选中色值后手动复制": "Clipboard access was denied. Select the color value and copy it manually.",
  "RGB 请填写三个 0–255 的整数，例如 189,147,63": "Enter three RGB integers from 0 to 255, e.g. 189,147,63.",
  "HSL 色相为 0–360，饱和度和亮度为 0–100，例如 40,50%,49%": "HSL: hue 0–360, saturation and lightness 0–100, e.g. 40,50%,49%.",
  "请输入 3 位或 6 位 HEX 色值，例如 #8B7AE8": "Enter a 3- or 6-digit HEX color, e.g. #8B7AE8.",
  "当前浏览器无法使用屏幕取色": "Screen picking is unavailable in this browser.",
  "已收藏 40 个颜色，请先移除一个": "You have 40 saved colors. Remove one to add another.",
  "已收藏 {hex}": "Saved {hex}",
  "{count} 色": "{count} colors",
  "选择 {name} {hex}": "Select {name} {hex}",
  "没有匹配的颜色，试试其他名称或色值。": "No matching colors. Try another name or color value."
};

export let locale = 'zh-CN';

export function t(key, values = {}) {
  const message = locale === 'en' ? (english[key] ?? key) : key;
  return message.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}

export function setLocale(nextLocale) {
  locale = nextLocale === 'en' ? 'en' : 'zh-CN';
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  for (const attribute of ['aria-label', 'title', 'placeholder', 'content']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((element) => {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  const toggle = document.getElementById('language-toggle');
  toggle.querySelector('.language-label').textContent = locale === 'en' ? '中' : 'EN';
  toggle.querySelector('.language-label').lang = locale === 'en' ? 'zh-CN' : 'en';
  toggle.title = locale === 'en' ? '切换到中文' : 'Switch to English';
  toggle.setAttribute('aria-label', toggle.title);
}
