# Continuation: visible composition centering

Scope: the user's gallery screenshots show the hand and cow rows off center / clipped. Preserve the approved scheme, font/icon catalogs, relative pop path, easing, phase durations, colors, video trim and transitions. Center the visible text + icons as one group around the selected row anchor (default: canvas center).

## Causes and correction

- Gallery used `object-fit: cover` plus `scale(1.14)`, cropping the existing composition. Use contain, centered, with no extra scale.
- Renderer centered the final full advance width even while the suffix was invisible or only partially revealed. Build one visible draw list for both measurement and drawing.
- Font advances and icon rectangles included empty space but excluded icon offsets / rotated ink. Measure actual glyph ink and cached bitmap/GIF alpha bounds; use the shared vector renderer for vector bounds. Include pop transforms and icon offsets in this same group coordinate frame.
- Fit the measured group in both axes. Preview, PNG, GIF and MP4 continue to use the same `renderFrame`.
- Whole-group anticipation translation conflicts with the requested always-centered composition. Keep its duration as a centered preparation beat; hide/disable the legacy translation-ratio control while retaining its serialized field for scheme compatibility. Explicit row-position controls remain available for deliberate placement.
- Ignore below-one-alpha-level items in measurement and drawing, including floating-point residue exactly at reveal boundaries.

## Evidence

- Baseline: 375 deterministic samples across the five approved rows and 640×360, 360×640, 480×480. Maximum observed horizontal error: 175.5px; clipping reproduced.
- Corrected: same 375 samples; maximum observed center error 1px; no clipping.
- Additional cases: Latin, Chinese, Japanese and Korean; 0/1/2 icons; large sizes, 96-unit gaps, ±160 X / ±120 Y offsets and rotated icons. Passed centered bounds and no-clipping checks.
- Browser: Edge via Playwright; desktop and mobile layouts, 16:9 / 1:1 / 9:16 stage refitting; PNG, GIF and deterministic H.264 MP4 generated. No effect-page JavaScript errors during the regression run.
- Independent MP4 decode: 640×360, 15fps, 30 frames and 960×540, 30fps, 219 frames. Actual text/icon pixels inspected, not merely export completion messages.
- Gallery preview: `continuation-card-centered.mp4` uses the unchanged approved default scheme. The original `continuation-card.mp4` and preset bytes remain untouched. This host's headless video element returns blank pixels despite valid readyState; the preview-generation harness decodes the original embedded background with OpenCV, selects frames using the existing trim/time function, and feeds those images to the unchanged composition renderer. No background content, trim values, or production decoder was changed.

## Repeat

Serve `site/` on port 8765, then run:

```sh
python tests/continuation_centering.py --baseline
python tests/continuation_centering.py
python tests/continuation_centering.py --gallery-preview
python tests/continuation_video_check.py site/assets/previews/continuation-card-centered.mp4
python tests/continuation_gallery_check.py
python .codex/skills/build-font-animation-effects/scripts/check_editor_contract.py site/continuation.html site/continuation.js
node --check site/continuation.js
git diff --check
```

Tests require Python Playwright, Edge, Pillow and OpenCV. Diagnostic frames go into a new system-temp folder, not the repository.
