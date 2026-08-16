# Effect analysis: `Word Gather / 词序汇聚`

## Source material

- Normal-speed file: `动效8-2.qt`
- Slow-motion file: `动效8-1.qt`
- Normal metadata: H.264 + AAC, 2.233333s, 30fps, 67 video frames, 720×1556
- Slow metadata: H.264 + AAC, 4.433333s, 30fps, 133 video frames, 720×1556
- Relevant crop: social-app chrome is excluded; only the centered landscape animation panel is reconstructed.
- Analysis date: 2026-08-16

## One-sentence target

Four word groups appear at different vertical and horizontal positions, continuously converge into one centered line, then matched-cut to a short title and expanding color field.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.16s | 000–004 | Blank / first cue | pale empty panel, then `All` appears above center | short blank lead-in and a crisp scale/opacity entrance | high |
| 0.16–0.82s | 005–024 | Staggered words | `All`, `new`, and `interface` appear at successively lower positions | each word receives its own start offset and start time | high |
| 0.82–1.40s | 025–041 | Final word + convergence | `design` arrives low-right while earlier words keep moving | all visible words keep sharing a continuous convergence progress; no word freezes | high |
| 1.40–1.57s | 042–046 | Aligned phrase | `All new interface design` becomes one centered baseline | final layout is measured as one group | high |
| 1.57–1.74s | 047–051 | Matched title cut | phrase disappears and the small `iOS` title replaces it | brief scale/opacity cut rather than a long dissolve | medium |
| 1.74–2.23s | 052–066 | Color reveal / hold | colored blurred field expands behind the title and icon | radial reveal into a full-frame gradient, followed by a short hold | high |

## Element model

- Text unit: word group, followed by a final short title.
- Persistent elements: pale canvas background until the color-field phase.
- Replaced/removed elements: the assembled phrase is mutually exclusive with the final title.
- Image/icon behavior: optional project icon or uploaded image/GIF follows the final title.
- Layer order: background → word groups/title → final icon.

## Spatial rules

- Composition center: actual right-hand stage center, not browser-window center.
- Alignment: scattered words use independent start offsets; the final phrase uses one measured centered baseline.
- Scale behavior: short pop on entry; no continuous per-letter animation.
- Responsive/aspect-ratio behavior: normalized 1280×720 composition is centered and uniformly scaled inside any output size.
- Entry/exit boundaries: starts inside the stage; final color reveal expands beyond all edges.

## Timing and easing

- Total reference loop: 2.233333s.
- Default implementation loop: 2.23s.
- Phase durations: 1.40s gather, 0.17s title cut, 0.35s color reveal, 0.31s hold.
- Overlaps: each later word starts before earlier words finish converging.
- Holds with residual motion: none observed after the final color field settles.
- Hard cuts: phrase-to-title is intentionally crisp.
- Easing hypothesis: quintic smooth convergence plus a restrained back-ease entry pop.

## Reuse plan

- Existing animation/math to reuse: deterministic canvas timeline and project icon drawing from Glyph Relay; centered stage geometry from the modern effects.
- Shared UI files: `me-motion-editor.css/js`, Current Wall / Focus Wheel inspector primitives.
- Shared media/image files: `assets/transparent-animals/` and uploaded image/GIF decoding.
- Shared export files: `js/continuation-gif.js`, `CCapture.all.min.js` / WebM writer.
- New core logic required: per-word start offsets converging into one measured phrase plus radial color reveal.

## User-editable parameters

### Common

- Word groups, final title, font, weight, overall speed, gather duration, stagger, title-cut duration, color-reveal duration, hold, icon choice and icon size.

### Advanced

- Gather/final font sizes, word gap, stage position, pop strength, and each word's X/Y start offset.

## Uncertainties to verify

- The reference color field is optically blurred footage; the implementation uses a deterministic multi-stop gradient rather than a sampled video texture.
- The original word path may contain a few pixels of curved travel; current motion interpolates directly to the final baseline.

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

- 2026-08-16: normal-speed and slow-motion clips must be paired by measured duration rather than filename suffix; for this pair, take 2 is the normal-speed source.
