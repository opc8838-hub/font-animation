# Reusable editor baseline

Apply this baseline to new effect pages unless the user explicitly removes a capability or it is genuinely irrelevant to the effect.

## Canvas and content

- Use the Icon Burst editor as the canonical project visual and interaction language: scrollable light-gray left editor, sticky header, rounded white section cards, consistent fields/buttons, and a large right stage. Reuse the shared `me-*` scheme, choreography, asset, and stage-control classes from `site/me-motion-editor.css`; do not give each effect an unrelated editor shell.
- Put Pause/Play and Replay in the stage itself, horizontally centered near the bottom with the same compact dark translucent control used by Icon Burst. Any duplicate controls in the editor must share one playback state and stay synchronized.
- Text must accept Chinese and Latin content and remain centered by default. Expose alignment or X/Y positioning when the choreography benefits from it.
- Populate every font selector from `site/shared-font-library.js` and load faces from `site/shared-fonts.css`. The catalog consolidates the project fonts and provides Latin, Chinese, Japanese, and Korean choices; do not copy a reduced option list or a private font map into a new effect.
- Resolve selected values through `STGFontLibrary.preset()` or `STGFontLibrary.family()` so Canvas, DOM preview, GIF, and video use the same face, weight, and style.
- Font labels show only the font name and useful language coverage. Do not expose “原片”, “视频字体”, “参考”, “复刻”, or “近似” in font options or help text.
- Provide text color, background color, and background upload for image, GIF, and video where backgrounds are editable.
- Recompute layout from actual text metrics. Do not assume a fixed word, equal left/right character counts, or a fixed number of lines.

## Shared icon and media library

Use the current shared sources from `site/iconburst.js`:

- `flowIconImages`: music, play, cloud, and watch icons.
- `transparentAnimalImages`: transparent animals under `site/assets/transparent-animals/`.
- `botSeriesImages`: animated Bot GIFs under `site/assets/bot-series/`.
- Built-in rainbow ring where a simple graphic insert is useful.

Also expose these reusable motion assets when an effect benefits from animated inserts:

- Collision hand: `site/crash_resources/images/0.gif`.
- Collision sky: `site/crash_resources/images/1.gif`.
- Construct-style vector motion: cloud outline, orbit loops, multicolor thick stroke, and gradient bar. Port the drawing behavior from `site/construct/g_cloud.js`, `site/construct/g_scribble.js`, `site/construct/g_zigzag.js`, and `site/construct/g_gradient.js` into the consuming deterministic Canvas renderer; do not rasterize screenshots of these shapes.

Present collision GIFs and construct-style moving vectors in one library group named `GIF 动图`. Keep real GIF/WebP/APNG candidates animated in the live preview instead of snapshotting their first frame; drive vector lines from the renderer time so preview and export share the same motion. Include several line-motion choices when lines are part of the effect rather than exposing only one generic stroke.

When icon quantity is part of the choreography, treat the selected list as a candidate pool. Adding a candidate raises the possible peak count; it must not force every selected asset into one permanently wider row. Compute a centered count envelope such as few → many → few, reveal outward and recover inward, keep visible assets flipping throughout the phase, and schedule without replacement inside each frame.

Present collision GIFs and construct-style moving vectors in one library group named `GIF 动图`. Keep real GIF/WebP/APNG candidates animated in the live preview instead of snapshotting their first frame; drive vector lines from the renderer time so preview and export share the same motion. Include several line-motion choices when lines are part of the effect rather than exposing only one generic stroke.

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
- Current canvas, 1:1 1080×1080, 4:5 1080×1350, 9:16 1080×1920, 16:9 1920×1080, and custom dimensions.
- Full cycle, common fixed durations, and custom duration.
- 15, 24, 30, and 60 FPS where encoder performance permits.
- Progress, busy/disabled states, and clear success/failure messages.

The renderer must accept `(time, width, height)` or an equivalent deterministic frame state. Preview, PNG, GIF, and video must call the same timeline and layout calculations. Scale measured preview typography, composition bounds, icons, and uploaded media together. A successful encoder is not sufficient: inspect actual exported frames for layout parity.

Use the bundled encoders already present in `site/js/` rather than adding a network dependency.
