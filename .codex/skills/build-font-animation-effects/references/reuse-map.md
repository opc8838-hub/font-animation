# Project reuse map

Choose the closest source by capability and copy only the relevant pattern.

## Current ME Motion Studio shell

Use `site/workspace-editor.css`, `site/me-motion-editor.css`, `site/me-motion-editor.js`, `site/media-layer.css`, and `site/media-layer.js` for the current shared editor layout and media model. New effects should extend this product language instead of reviving the old STG panel.

## Rich icon editor and scheme model

Use `site/iconburst.html`, `site/iconburst.css`, `site/iconburst-overrides.css`, and `site/iconburst.js` for:

- Shared animal, Bot, and flow-icon libraries.
- Expandable selected-asset lists, drag reorder, and per-asset drawer editing.
- Dynamic glyph replacement target/order/speed/hold controls.
- Background image/GIF/video handling and local image processing.
- `collectScheme`, `applyScheme`, version migration, auto-save, reset, and clear patterns.
- Visual choreography track and phase controls.
- PNG/GIF/H.264 MP4 export with current/custom dimensions and duration.

Preserve the invariant established in `renderExportFrame`: exported typography, composition bounds, icon base size, spacing, and glyph placement derive from the same live geometry instead of hard-coded alternative percentages.

## Reusable canvas sequence shell

Use `site/sequence-motion.js` and `site/sequence-motion.css` for:

- A shared canvas renderer across multiple effect modes.
- Common font/color/playback controls.
- Current, square, portrait, vertical, landscape, and custom export sizes.
- Full-cycle/custom duration, FPS, PNG, GIF, and video controls.
- Deterministic `renderFrame(target, time, width, height)` structure.

Do not copy its small fixed `iconOptions` when the task needs the full current library; connect the Icon Burst asset sources instead.

## Visual timeline and scheme UX

Use `site/textswell.html`, `site/textswell.css`, and `site/textswell.js` for:

- Large, readable choreography blocks with playhead.
- Scheme save/import/reset controls and status messaging.
- Timeline-aware export duration and H.264 MP4 patterns.

## Gallery preview

Use `site/gallery.js` and `site/gallery.css` for cards. For Icon Burst, the approved card path is `site/assets/previews/iconburst-card.mp4`, rendered as a muted autoplaying loop. This avoids a responsive iframe becoming visually different from the approved 16:9 export.

For a new effect, use a live iframe only when it preserves the same composition at card size. Otherwise export an approved lightweight MP4 loop and keep the card link pointed at the editor.

## Shared media and encoders

- Fonts: `site/assets/` and `site/assets/fonts/`.
- Transparent animals: `site/assets/transparent-animals/`.
- Bot GIFs: `site/assets/bot-series/`.
- GIF encoder: `site/js/continuation-gif.js` and `site/js/continuation-gif.worker.js`.
- H.264 MP4 encoder: `site/js/h264-mp4-encoder.web.js`.
- Existing WebM support: `site/WebMWriter.js` where already used.

Prefer these local assets and libraries. Do not add a CDN solely to reproduce an existing project capability.
