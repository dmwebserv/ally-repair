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
- Month-view calendar with per-day totals vs goal — tap any day to jump back to it
- No account, no cost — data lives on your device, with optional cloud backup
  (see below)

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

## Sharing the app & per-device profiles

Every install generates its own private profile id, and each profile backs
up to its own file (`data/backups/<profile-id>.json` in the repo via the
Cloudflare Worker). That means you can send the link to a friend and your
data can never mix with theirs — goals, favorites, history, and cloud
backups are all separate per device.

- **Second phone?** Open Backup & restore on your first device, copy the
  *sync code*, and paste it on the new device (*Link device*) to share one
  backup across both.
- **Upgrading?** Installs that already held logs automatically merge the
  original single-file backup (`data/nutrilog-backup.json`) once, then
  switch to their own per-profile file. The original file is left untouched
  as an archive.

Note: anyone you share the deployed link with also shares your Worker's
OpenAI key for AI scans. For family use that's usually fine; for wider
sharing, consider per-user limits or a separate deployment.
