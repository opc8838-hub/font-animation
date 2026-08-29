# Reusable editor baseline

Apply this baseline to new effect pages unless the user explicitly removes a capability or it is genuinely irrelevant to the effect.

## Canvas and content

- Use the Icon Burst editor as the canonical project visual and interaction language: scrollable light-gray left editor, sticky header, rounded white section cards, consistent fields/buttons, and a large right stage. Reuse the shared `me-*` scheme, choreography, asset, and stage-control classes from `site/me-motion-editor.css`; do not give each effect an unrelated editor shell.
- Put Pause/Play and Replay in the stage itself, horizontally centered near the bottom with the same compact dark translucent control used by Icon Burst. Any duplicate controls in the editor must share one playback state and stay synchronized.
- Put the canvas-size card first in the scrollable editor. Offer 1:1 1080×1080, 4:5 1080×1350, 9:16 1080×1920, 16:9 1920×1080, and custom dimensions there so the user chooses the composition before editing.
- Refit the right-side stage immediately when size changes. Preserve the selected output aspect ratio inside the available workspace and derive preview layout from the same logical width/height used by export; never wait until export to reveal portrait or landscape composition changes.
- Text must accept Chinese and Latin content and remain centered by default. Expose alignment or X/Y positioning when the choreography benefits from it.
- Populate every font selector from `site/shared-font-library.js` and load faces from `site/shared-fonts.css`. The catalog consolidates the project fonts and provides Latin, Chinese, Japanese, and Korean choices; do not copy a reduced option list or a private font map into a new effect.
- Resolve selected values through `STGFontLibrary.preset()` or `STGFontLibrary.family()` so Canvas, DOM preview, GIF, and video use the same face, weight, and style.
- Font labels show only the font name and useful language coverage. Do not expose “原片”, “视频字体”, “参考”, “复刻”, or “近似” in font options or help text.
- Provide text color, background color, and background upload for image, GIF, and video where backgrounds are editable. When a sequence contains independent rows or pages, follow [per-page-backgrounds.md](per-page-backgrounds.md): each page owns its media, trim, and transition instead of sharing one detached global background control.
- Recompute layout from actual text metrics. Do not assume a fixed word, equal left/right character counts, or a fixed number of lines.
- For row/page sequences, use stable page ids and keep page-specific controls inside the corresponding row. When the effect exposes them, font family, font sizes, text/punctuation colors, letter/segment spacing, reveal style, phase durations, page hold, order, and assigned assets are independent per page.
- Rebuild order options and all dependent page/asset controls after add or delete. Reordering moves the complete page state rather than copying visible text into a different page object.
- When inline icons are supported, let the user insert each icon at a meaningful character boundary and edit its text-to-icon gap; do not automatically add the same icon to every page.

## Shared icon and media library

Load the current shared sources from `site/shared-icon-library.js`:

- `groups.flow`: music, play, cloud, watch, and rainbow-ring icons.
- `groups.animals`: transparent animals under `site/assets/transparent-animals/`.
- `groups.bots`: animated Bot GIFs under `site/assets/bot-series/`.
- `groups.gifMotion`: collision GIFs and the complete construct-motion set.
- `drawVector(context, asset, size, time)`: the deterministic Canvas renderer for vector candidates.

The shared `GIF 动图` group includes:

- Collision hand: `site/crash_resources/images/0.gif`.
- Collision sky: `site/crash_resources/images/1.gif`.
- Construct motion: dynamic cloud, orbit loops, multicolor stroke, gradient bar, light wave, ribbon, rotating coil, and pulse lines.
- Transparent black-line variants: `construct-cloud-paper`, `construct-loop-paper`, and `construct-coil-paper`.

Present the complete group as `GIF 动图`. Keep real GIF/WebP/APNG candidates animated in the live preview instead of snapshotting their first frame; call the shared vector renderer with the consuming effect's deterministic timeline so preview and export share the same motion. Do not rasterize vector screenshots or recreate a reduced private list.

When icon quantity is part of the choreography, treat the selected list as a candidate pool. Adding a candidate raises the possible peak count; it must not force every selected asset into one permanently wider row. Compute a centered count envelope such as few → many → few, reveal outward and recover inward, keep visible assets flipping throughout the phase, and schedule without replacement inside each frame.

Built-in candidates have stable `libraryId` values. Unless the effect explicitly calls for clones, reject duplicate selected `libraryId` values and schedule visible icons without replacement so the same icon does not appear multiple times in one frame. Do not create several independently moving copies merely to make an effect look busier.

Do not reintroduce the removed square, triangle, heart, circle, or star choices into Icon Burst.

For icon-rich effects, support:

- Separate library selection from composition mutation. A library-card click only selects an item for editing; an explicit Add/Insert button commits it to the text, glyph slot, orbit list, or composition.
- Add/remove assets and arbitrary asset counts.
- Drag to reorder selected assets; expanded management should use the full editor width without shrinking the stage.
- Roles such as opening/orbit and glyph replacement when relevant.
- Per-asset size, opacity, horizontal/vertical offset, rotation, motion style, replacement target, play order, speed, and hold time.
- Global icon size, horizontal/vertical spacing, text-to-icon slot gap, cluster X/Y position, density, and effect-specific spacing controls.
- Upload/replace PNG, JPG, WebP, SVG, GIF, or other formats already supported by the consuming renderer.
- Keep artwork optically centered inside icon containers.

When text and icon counts are asymmetric, center the middle icon slot independently of left/right word length. Do not derive the slot center from character count alone.

## Scheme and editing state

Each effect needs a unique, versioned scheme key and a serializable state model.

Required actions:

- Present exactly Save, Import, Restore Default, and Clear/Rebuild as the same two-column large-button scheme card used by Icon Burst; keep status copy directly below it and do not append Undo/Redo or effect-specific actions inside this card.
- Save the current scheme to local storage and download JSON.
- Import JSON and rebuild dynamic rows, assets, targets, and timeline beats.
- Automatically persist meaningful edits after a short debounce.
- Restore the approved default example.
- Clear user content/assets without damaging shared built-ins.
- Undo/redo may remain available through a shared history surface or shortcuts, but must not change the canonical four-action scheme card.

Uploaded project media must survive scheme export/import when browser storage limits allow it. Strip runtime-only objects such as `Image`, canvas contexts, functions, and processing flags before serialization. Include a scheme version and migrate older shapes or fields instead of silently breaking saved files.

## Timeline and motion controls

- Every effect editor includes the same colored Icon Burst choreography blocks and legend by default; do not substitute gray pill rows, a static arrow diagram, or a paragraph of phase names.
- Each beat displays its name and start/end or duration, and the track includes a moving playhead driven by the same clock as the preview.
- Clicking a beat seeks to that part. Timing edits rebuild the beat widths, labels, total duration, active state, and seek points immediately.
- Expose master playback speed plus the phase-specific durations, delays, stagger, rhythm/easing, hold, and direction that materially change the reference motion.
- Use plain Chinese labels. Prefer “图标大小” over implementation terms such as “图标比例”.
- Keep advanced controls grouped or collapsible so the basic editor remains understandable.
- Describe the product motion directly, for example “铺满画面”, “向左水流”, and “逐行回收”. Never show “参考视频”, “参考编舞”, “原片复刻”, or analysis provenance in the end-user interface.

## Export

Offer these controls when the page claims full export support:

- PNG current frame.
- GIF animation.
- MP4 video; use WebM only when clearly labeled as WebM.
- Canvas dimensions are selected in the first editor card; the lower export card keeps full-cycle/fixed/custom duration, FPS, format actions, progress, and status without repeating the size control.
- Full cycle, common fixed durations, and custom duration.
- 15, 24, 30, and 60 FPS where encoder performance permits.
- Progress, busy/disabled states, and clear success/failure messages.

The renderer must accept `(time, width, height)` or an equivalent deterministic frame state. Preview, PNG, GIF, and video must call the same timeline and layout calculations. Scale measured preview typography, composition bounds, icons, and uploaded media together. A successful encoder is not sufficient: inspect actual exported frames for layout parity.

Use the bundled encoders already present in `site/js/` rather than adding a network dependency.
