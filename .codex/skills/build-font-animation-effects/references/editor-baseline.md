# Reusable editor baseline

Apply this baseline to new effect pages unless the user explicitly removes a capability or it is genuinely irrelevant to the effect.

## Canvas and content

- Use the latest project editor visual language: scrollable left editor, large right canvas, centered composition, play/pause/replay, and frame stepping where useful.
- Text must accept Chinese and Latin content and remain centered by default. Expose alignment or X/Y positioning when the choreography benefits from it.
- Provide the shared font collection already bundled under `site/assets/` and `site/assets/fonts/`; do not fetch fonts at runtime.
- Provide text color, background color, and background upload for image, GIF, and video where backgrounds are editable.
- Recompute layout from actual text metrics. Do not assume a fixed word, equal left/right character counts, or a fixed number of lines.

## Shared icon and media library

Use the current shared sources from `site/iconburst.js`:

- `flowIconImages`: music, play, cloud, and watch icons.
- `transparentAnimalImages`: transparent animals under `site/assets/transparent-animals/`.
- `botSeriesImages`: animated Bot GIFs under `site/assets/bot-series/`.
- Built-in rainbow ring where a simple graphic insert is useful.

Do not reintroduce the removed square, triangle, heart, circle, or star choices into Icon Burst.

For icon-rich effects, support:

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

- Save the current scheme to local storage and download JSON.
- Import JSON and rebuild dynamic rows, assets, targets, and timeline beats.
- Automatically persist meaningful edits after a short debounce.
- Restore the approved default example.
- Clear user content/assets without damaging shared built-ins.
- Undo and redo meaningful editor changes with bounded scheme snapshots; do not snapshot every animation frame.

Uploaded project media must survive scheme export/import when browser storage limits allow it. Strip runtime-only objects such as `Image`, canvas contexts, functions, and processing flags before serialization. Include a scheme version and migrate older shapes or fields instead of silently breaking saved files.

## Timeline and motion controls

- Show a readable visual timeline for multi-phase choreography. Each beat should display its name and start/end or duration.
- Clicking a beat should seek to that part when feasible.
- Expose master playback speed plus the phase-specific durations, delays, stagger, rhythm/easing, hold, and direction that materially change the reference motion.
- Use plain Chinese labels. Prefer “图标大小” over implementation terms such as “图标比例”.
- Keep advanced controls grouped or collapsible so the basic editor remains understandable.

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

