# Effect analysis: `Focus Portal / 焦点转场`

## Source material

- Normal-speed file: `动效9-1.qt`
- Slow-motion file: `动效9-2.qt`
- Normal metadata: H.264 + AAC, 5.633333s, 30fps, 169 video frames, 720×1556
- Slow metadata: H.264 + AAC, 8.033333s, 30fps, 241 video frames, 720×1556
- Relevant crop: social-app UI and preview overlays are excluded; only the pale landscape panel is reconstructed.
- Analysis date: 2026-08-16

## One-sentence target

A minimal centered title sequence resolves to a final phrase, then one chosen glyph or icon becomes the visual anchor for a continuous rotating zoom into the next scene.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–1.20s | 000–035 | Opening badge | `13` remains centered inside a faint triangular field | first item receives a longer readable hold | high |
| 1.20–2.90s | 036–086 | Minimal sequence | icon, `Introducing`, `iPhone`, `13`, and `Pro` replace one another | short rolling/hard replacements on a shared center | high |
| 2.90–3.90s | 087–116 | Focus phrase | `Our fastest model yet.` holds centered | readable setup before the move | high |
| 3.90–5.00s | 117–149 | Zoom / rotation | phrase accelerates toward the viewer; the initial `O` becomes dominant and the line rotates | transform the whole measured phrase around the selected glyph center while preserving velocity | high |
| 5.00–5.63s | 150–168 | Portal reveal | enlarged circular letter shape matches the camera lenses and phone image | focus shape covers the stage, then reveals the next scene | high |

## Element model

- Text unit: one centered item per sequence beat, then one glyph-addressable phrase.
- Persistent elements: pale background until the focus portal covers it.
- Replaced/removed elements: each sequence item is mutually exclusive; selected focus glyph can be replaced by an icon.
- Image/icon behavior: `[icon]` is a sequence item; the final focus index can use text, project icon, transparent animal, or uploaded image/GIF.
- Layer order: background → current title/phrase → motion trails → portal cover → final scene/media.

## Spatial rules

- Composition center: actual stage center.
- Alignment: all sequence items and the focus phrase are centered.
- Scale behavior: the phrase scales around the selected glyph center, not its group center.
- Responsive/aspect-ratio behavior: stage-relative focus point and uniform scale preserve the transition in square, portrait, and landscape exports.
- Entry/exit boundaries: zoomed phrase and its trails intentionally leave the canvas; portal fill covers every edge.

## Timing and easing

- Total reference loop: 5.633333s.
- Default implementation loop: 5.63s.
- Phase durations: 1.20s opening hold, five 0.34s sequence beats, 1.00s phrase hold, 1.10s zoom, 0.63s final hold.
- Overlaps: motion trails sample slightly earlier zoom progress; the final scene starts during the portal-cover tail.
- Holds with residual motion: the focus phrase is static before its acceleration.
- Hard cuts: the short centered titles are deliberately crisp.
- Easing hypothesis: strongly accelerating scale/rotation; trails are time-offset copies rather than independent particles.

## Reuse plan

- Existing animation/math to reuse: Glyph Relay icon renderer, Focus Wheel smooth phase mapping, shared deterministic export loop.
- Shared UI files: `me-motion-editor.css/js` and current editor control primitives.
- Shared media/image files: transparent animals and optional uploaded focus/final images.
- Shared export files: local GIF worker and WebM writer.
- New core logic required: glyph-centered phrase transform and glyph/icon portal substitution.

## User-editable parameters

### Common

- Sequence lines, focus phrase, first hold, sequence interval, phrase hold, zoom duration, final hold, focus type, focus index, icon, icon size, and zoom scale.

### Advanced

- Two font sizes, rotation, trail count, stage position, and optional final image/GIF.

## Uncertainties to verify

- The original final camera footage is not committed; the default draws an abstract camera cluster, while users may upload a final image/GIF.
- The faint opening triangle is treated as reference-specific decoration and is not a separate editable layer yet.

## Acceptance evidence

- [x] Normal-speed comparison
- [x] Key paused frames
- [x] Chinese input
- [x] Desktop stage centering
- [x] Inspector scroll reaches bottom
- [x] Mobile layout
- [x] Console clean
- [x] PNG generated
- [x] GIF generated
- [x] Video generated

## Feedback discoveries

- 2026-08-16: the chosen letter is the transform origin for the whole phrase. Replacing it with an icon must preserve its slot width and transform origin, not overlay an icon on the letter.
