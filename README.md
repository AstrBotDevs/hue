# Hue by AstrBot

A full-window color picker with a Material You interface, an HSV canvas, and floating hue and zoom controls.

- GPU rendering on demand, with a Canvas 2D fallback.
- Editable HEX, RGB, and HSL values, plus clipboard copying.
- Dynamic themes, light/dark appearance, and screen picking in supported desktop browsers.
- On phones, the selected color card sits above the hue/zoom controls, with direct copy, save, and share actions. Color tools remain in the sidebar drawer; screen picking and fullscreen controls are hidden.
- English and Chinese interfaces with a saved language preference; first visit follows the browser language. Color and palette names follow the selected language; color search accepts both languages, pinyin, and CSS keywords.
- 807 named colors searchable by name, pinyin, or HEX.
- 48 five-color palettes across six styles, with favorites and recent colors stored locally.
- Image palettes from file selection, drag-and-drop, or pasted screenshots, with 5–8 requested colors. Analysis runs in a Web Worker; images stay on the device. Simple or transparent images may yield fewer distinct colors.
- Complementary, analogous, triadic, and monochrome palettes with individual color locks.
- Material HCT tonal scales with 11 steps (50–950).
- Shareable color/palette links and CSS variables, HEX lists, and PNG exports. Custom palettes are saved locally in Favorites.
- Locally bundled Outfit, Noto Serif SC Light, and Cormorant Garamond Light fonts.

## Development

Requires Node.js 22.12+ and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development server runs at `http://127.0.0.1:5173`.

## Controls

- Click or drag to select saturation and brightness.
- Drag the rainbow slider to change hue.
- Mouse wheel or trackpad pinch to zoom; smooth trackpad scrolling pans.
- Hold the middle mouse button, or Space with a drag, to pan.
- Use the floating controls to zoom, reset, or enter fullscreen.
- With the canvas focused, arrow keys adjust the color; Shift increases the step.
- Press Enter or leave a color field to apply an edit; Escape cancels it.

Browsers do not expose a reliable wheel-device type. Smooth scrolling and discrete wheel steps are distinguished heuristically; the zoom buttons remain available on every device.

## Build and deploy

```sh
pnpm test
pnpm build
pnpm preview
```

The `dist/` directory is a standalone static website. Cloudflare Workers serves these assets directly, without a backend or database.

Authenticate with the Cloudflare account that manages `astrbot.app`, then deploy:

```sh
pnpm exec wrangler login
pnpm run deploy
```

The custom domain is configured in `wrangler.jsonc`: `hue.astrbot.app`.

Image input supports PNG, JPEG, WebP, GIF, and AVIF up to 20 MB. Animated images use a single decoded frame. Shared links contain only color values, never the source image. Sharing does not require an account.

## Color references and fonts

Named-color data comes from [中国色](https://zhongguose.com/), [Chinese Colors](https://github.com/zerosoul/chinese-colors), and [CSS Color 4](https://www.w3.org/TR/css-color-4/#named-colors). English names for traditional colors are descriptive translations, not standardized pigment names. Traditional colors are screen references; nearest names use CIE Lab distance. Hover over a name to see its reference value and whether the match is approximate.

Data attribution and third-party licenses are included in `public/`. Font licenses are in `public/fonts/`.
