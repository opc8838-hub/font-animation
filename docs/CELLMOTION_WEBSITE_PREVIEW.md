# CellMotion website preview — 2026-09-07

## Scope and entry points

- New homepage: `site/cellmotion.html`.
- Independent editor directory: `site/cellmotion-editors.html`.
- Independent categorized component library: `site/cellmotion-components.html`.
- Shared homepage styles / behavior: `site/cellmotion.css`, `site/cellmotion.js`.
- Approved editor implementations, presets and preview videos remain untouched. `site/gallery.html` is now a compatibility entry that redirects to the CellMotion component library; append `?legacy=1` only for internal legacy-gallery review.
- This is a local preview, not a deployment. Video stitching, project persistence, MCP and Figma integration are not implemented by this website pass.

The user-approved section order is brand Hero → selected motions → finished-video cases → categorized effect library. Editors also have their own directory entry.

## Visual and interaction decisions

- Follow the supplied CellMotion branding: off-white, dark type and a restrained purple accent. Header/footer/editor directory use the exact original `logo.png` pixels, copied to `assets/cellmotion/logo-original.png`. Never substitute live text or redraw the mark. CSS clips the original image's whitespace without editing it.
- Current approved Hero: full-width video fills the desktop viewport below navigation, with central baked-in Logo protected. A lower gradient safe area holds only “让创意，自由生长。”, one functional description, and “制作视频 / 浏览组件”. Desktop uses cover; mobile contains the entire video without cropping the brand. Original video pixels and Logo typography are not modified. The full-width curved ribbon follows the Hero; visible cards play/move horizontally, hover/focus/pause stops them, and offscreen/hidden playback stops.
- Brand video source: `C:/Users/Administrator/Desktop/cellmotion/hero区最新视频.mp4`, 10.75 seconds, 3840 × 2160, HEVC, 60 fps. Website derivative is H.264, 1920 × 1080, 60 fps, 10.75 seconds, no audio, fast-start; original unchanged. The earlier video dialog / large text headline iterations are superseded.
- Website-only typography uses local Manrope Variable and a generated subset of Noto Sans HK Variable. The repository's `NotoSansSC-Regular.ttf` identifies itself as Thin, so it is not used for the website UI. Rebuild the subset with `node scripts/build-cellmotion-font.mjs` after changing UI copy. Original Logo and fonts inside effect editors remain unchanged.
- Selected effects play a full existing preview before advancing. Manual selection disables rotation. Explicit preview pause and rotation controls are separate. Initial reduced-motion preference disables autoplay; offscreen/hidden videos pause.
- Editorial featured order: Sprout Shift, Type Cascade, Dot Resolve, Glyph Morph, Icon Burst, Path Writer. This is a provisional display sequence, not a claim that all listed effects passed user review.
- No real customer/creator case video has been supplied yet. The case area explicitly labels the three-preview sequence as a combination demonstration, not a finished film. Local file selection uses an object URL only and does not upload, publish or persist the file. Replacing the demo hides its original effect credits.
- Homepage contains only six varied catalog cards plus category links, not the entire 67-card inventory. The new component library has a left search/category sidebar and a right card grid. Mobile categories become a horizontal row. Full directories support Chinese/English/keyword search, category filters, 12-at-a-time loading, poster thumbnails, and one active card video at a time. Search/category/use states survive reload via URL parameters.
- Content categories and use cases are separate. All current entries link to existing editors. “视频创作” describes their intended use, NOT an assertion that every editor has validated MP4 export. Format availability is explicitly editor-specific. “网页使用” is an honest zero-ready/planned view: no React/SDK availability is inferred from preview videos. No fake install/copy-code buttons. “制作视频” opens the single-effect editor directory, which explicitly says the stitcher is not open yet.
- `site/index.html` remains the existing Cylinder effect; do not replace it as a website index without a routing migration.

## Catalog bridge

For this isolated preview, `site/gallery.js` remains the catalog source. `scripts/build-cellmotion-catalog.mjs` reads only its array declaration, validates editor/video paths, and generates `site/cellmotion-catalog.json` (schema version 1; 67 entries at this checkpoint). It does not execute gallery browser code.

After adding an effect to the gallery, run:

```text
node scripts/build-cellmotion-catalog.mjs
```

Optional website-only thumbnail generation:

```text
node scripts/build-cellmotion-posters.mjs <absolute-ffmpeg-path>
node scripts/build-cellmotion-catalog.mjs
```

Thumbnails are separate files under `site/assets/cellmotion/`; existing approved gallery artifacts are never overwritten. Source/entry generation is transitional; migrate both galleries to one canonical registry deliberately when the new homepage is accepted, rather than maintaining manually edited duplicate inventories.

Catalog cards with an approved MP4 preview autoplay while visible and pause when they leave the viewport or the tab is hidden. A user's explicit per-card pause is remembered until that card is rendered again. `prefers-reduced-motion` disables viewport autoplay but keeps the explicit play button available.

## Verification performed

- Catalog generator validated 67 editor targets and all mapped video paths. The approved `上下翻转 / Split Flip` implementation, default scheme, and preview from commit `deb32ab` were selectively restored into the dirty worktree without merging over unrelated changes; it is now present in both galleries.
- JavaScript module syntax check: `node --input-type=module --check < site/cellmotion.js`.
- `git diff --check` passes (existing line-ending warnings only).
- Real in-app browser: Hero plays and reports 10.75-second duration; selected preview rotates; manual Dot Resolve selection changes the source/name/link and disables rotation; pause changes playback state.
- Chinese search returns one Type Cascade result; unmatched search shows empty state; clearing restores the full catalog; load more produces 24 cards; media category produces seven results.
- Combination demonstration starts the actual Sprout Shift preview. Local file selection produces a blob URL, native controls, local-only status and hides demo effect credits.
- Separate editor directory opens with 12 cards; 390px viewport has no horizontal overflow, and visible images load. Desktop layout inspected at 1440px. Browser error log was empty during the homepage interaction checks.
- Latest full-screen revision checked at 1440×1000 and 390×844: desktop Hero is 914px below the 86px navigation; mobile video uses contain; neither page has horizontal overflow. Homepage has six catalog cards. Chinese search returns one 字倾; media filter returns seven; no-match empty state works; load-more gives 24; webpage tab shows zero ready components and restores video mode. Explicit card play verified readyState 4 / playing; fixed hover on the play button accidentally toggling playback off. Editor directory loads and retains its existing targets.
- A cached intermediate v5 module initially tried to initialize removed homepage filters. Cache-busting to the current shared module fixed it; no new console errors in the current revision. Old captured logs may still show v5 errors. Original logo binary comparison passed in the prior check.
- Scoped static regression command: `node scripts/check-cellmotion-website.mjs` validates page IDs, shared-module consistency, original Logo use, homepage/full-library separation, and local page/catalog asset references.
- Homepage exports and effect rendering were not changed, so this pass does not claim new effect/export verification.

## Git safety

The existing `agent/20260906-morph-intros` worktree had uncommitted editor/intro/preset changes before this pass. After fetch, HEAD was one commit behind origin/main. No switching, resetting, merging, committing or pushing was performed; all website work was added as separate new files. The protected concurrent branch was not touched. Before deployment, reconcile latest origin/main and the existing changes explicitly.

## Local preview

The previous 4173 endpoint returned 404 during this pass. A separate local server was started:

```text
python -m http.server 4177 --bind 127.0.0.1 --directory site
```

Open `http://127.0.0.1:4177/cellmotion.html`. This endpoint is local only and is not a public website.
