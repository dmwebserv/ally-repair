# NutriLog

A tiny, free food/calorie tracker. Log what you eat by typing it in, or by
photographing a nutrition label (parsed locally in your browser with OCR —
no paid API, no account, no server). Everything is stored on your device
via `localStorage`.

## Features

- Set a daily calorie goal and see consumed / remaining at a glance
- Log food manually (calories, protein, carbs, fat, servings)
- Snap or upload a photo of a nutrition label — it's OCR'd in-browser
  (Tesseract.js) and the calorie/protein/carb/fat fields are pre-filled for
  you to review before saving
- Browse previous days, see a 7-day calorie bar chart
- No backend, no account, no cost — data never leaves your device

## Running locally

```bash
npm install
npm run dev
```

## Building for production

```bash
npm run build
```

Outputs a static site to `dist/` — deploy it anywhere that serves static
files for free (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.).

## Notes on the OCR feature

The nutrition-label scanner runs entirely in your browser via
[Tesseract.js](https://github.com/naptha/tesseract.js). The worker script
and WASM engine are bundled locally (`public/tesseract/`); the English
language model is fetched from a public CDN the first time you scan a
label, then cached by the browser for future scans. This requires an
internet connection the first time, but no data is ever sent to a server —
the actual OCR runs on-device.

Label parsing uses simple heuristics (regex over the recognized text), so
always double-check the pre-filled numbers before saving — messy photos or
unusual label layouts can produce wrong matches.
