# Project reuse map

Choose the closest source by capability and copy only the relevant pattern.

## Current ME Motion Studio shell

Use `site/workspace-editor.css`, `site/me-motion-editor.css`, `site/me-motion-editor.js`, `site/media-layer.css`, and `site/media-layer.js` for the current shared editor layout and media model. New effects should extend this product language instead of reviving the old STG panel.

## Shared font catalog

Use `site/shared-font-library.js` for the single project-wide font list and value resolution, and `site/shared-fonts.css` for the local font faces. `site/stg-cn.js` loads the catalog for project pages. Effect renderers must resolve the selected `stg:*` value through the shared library instead of falling back to a private default.

## Rich icon editor and scheme model

Use `site/shared-icon-library.js` for the canonical flow, `GIF 动图`, transparent-animal, and Bot candidate groups. Its stable `libraryId` values and `drawVector()` function keep newly added line-motion variants available to every consuming effect without copying arrays or Canvas recipes.

Use `site/iconburst.html`, `site/iconburst.css`, `site/iconburst-overrides.css`, and `site/iconburst.js` for:

- The canonical left-editor section cards, exact four-button two-column scheme actions, colored choreography blocks/legend, selection-first asset editor, status messaging, and bottom-center stage Pause/Play + Replay controls. Reuse the `me-scheme-*`, `me-choreo-*`, `me-asset-*`, and `me-stage-controls` implementations in `site/me-motion-editor.css`.
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
- First-card square, portrait, vertical, landscape, and custom canvas sizes with a live stage that refits to the selected ratio; lower export controls reuse that same size state.
- Full-cycle/custom duration, FPS, PNG, GIF, and video controls.
- Deterministic `renderFrame(target, time, width, height)` structure.

Do not copy its small fixed `iconOptions` when the task needs the full current library; connect the Icon Burst asset sources instead.

## Row text and inline-icon editing

Use `site/glyphmorph.html`, `site/glyphmorph.css`, and `site/glyphmorph.js` for:

- Stable text rows with grapheme-aware caret boundaries and row-owned inline icons.
- Per-row `插入图标` and `暂停修改`, where pause seeks to the row's complete readable hold frame.
- Compact inserted-icon chips with preview, boundary, and a small explicit `编辑` button.
- A right-side candidate drawer that reserves space on wide desktop, replaces the inspector at medium widths, and sits below the sticky stage on mobile, so the canvas is never covered.
- Selection-only candidate tiles plus adjacent one-step `插入` buttons that avoid reverse scrolling through a long library.
- Focused editing of icon row, character boundary, size, text gap, X, and Y while the owning row stays paused.
- One deterministic Canvas layout for live preview, PNG, GIF, and H.264 MP4 at 24/30/60 FPS.

The approved default is `site/assets/presets/glyphmorph-default.json`; the gallery loop is `site/assets/previews/glyphmorph-card.mp4`. Do not regenerate either after unrelated refinements.

## Per-page background and video editing

Use `site/continuation.html`, `site/continuation.css`, and `site/continuation.js` for row-scoped background color, image/GIF/video upload, video filmstrip trimming, direct/crossfade transitions, stable row-id assignment, serialized media state, and deterministic preview/export seeking. Apply the behavioral requirements in [per-page-backgrounds.md](per-page-backgrounds.md); copy only the media pattern, not Continuation's typography choreography.

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
- Transparent animals: `site/assets/transparent-animals/`, currently stable ids `animal-01` through `animal-59`; follow [icon-library-maintenance.md](icon-library-maintenance.md) when expanding them.
- Bot GIFs: `site/assets/bot-series/`.
- Shared icon/expression catalog and deterministic vector renderer: `site/shared-icon-library.js`.
- Collision GIFs: `site/crash_resources/images/0.gif` for the animated hand and `site/crash_resources/images/1.gif` for animated sky.
- Construct vector recipes: `site/construct/g_cloud.js`, `site/construct/g_scribble.js`, `site/construct/g_zigzag.js`, and `site/construct/g_gradient.js`. Reuse their geometry as resolution-independent Canvas drawing, with static SVG previews only for the asset picker.
- GIF encoder: `site/js/continuation-gif.js` and `site/js/continuation-gif.worker.js`.
- H.264 MP4 encoder: `site/js/h264-mp4-encoder.web.js`.
- Existing WebM support: `site/WebMWriter.js` where already used.

Prefer these local assets and libraries. Do not add a CDN solely to reproduce an existing project capability.
