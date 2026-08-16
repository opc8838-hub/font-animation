# Effect analysis: `Word Gather / 词序汇聚`

## Source material

- Normal-speed file: `动效8-2.qt`
- Slow-motion file: `动效8-1.qt`
- Normal metadata: H.264 + AAC, 2.233333s, 30fps, 67 video frames, 720×1556
- Slow metadata: H.264 + AAC, 4.433333s, 30fps, 133 video frames, 720×1556
- Relevant crop: social-app chrome is excluded; only the centered landscape animation panel is reconstructed.
- Analysis date: 2026-08-16

## One-sentence target

Four word groups assemble as a relay: each group reveals character-by-character, rises into the composition, and continuously enlarges while the already-visible phrase re-centers; the assembled line then matched-cuts to a short title and expanding color field.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.16s | 000–004 | Blank / first cue | pale empty panel, then `All` appears above center | short blank lead-in and a crisp scale/opacity entrance | high |
| 0.16–0.82s | 005–024 | Relay build | `All`, `new`, and `interface` appear in reading order, with later groups entering from below | each group reveals internally from left to right; prior content shifts to keep the currently assembled phrase centered | high |
| 0.82–1.20s | 025–035 | Final group rise | `design` enters from below while the preceding groups remain at the smaller assembly size | vertical entry and phrase re-centering finish before the major scale change | high |
| 1.20–1.40s | 036–041 | Assembled phrase enlargement | the four groups settle onto one baseline and then become noticeably larger | a separate whole-phrase zoom follows the rise; the two actions are sequential, not simultaneous | high |
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
- Alignment: the currently visible prefix/suffix is measured as one centered cluster; adding a new group smoothly redistributes the whole cluster toward the final centered baseline. Later groups begin progressively farther from that baseline (`All` nearest, `design` farthest in the reference order).
- Scale behavior: reference mode keeps the assembly small while groups rise, then enlarges the whole centered phrase; an alternate retained mode allows enlargement to run simultaneously with the rise.
- Responsive/aspect-ratio behavior: normalized 1280×720 composition is centered and uniformly scaled inside any output size.
- Entry/exit boundaries: starts inside the stage; final color reveal expands beyond all edges.

## Timing and easing

- Total reference loop: 2.233333s.
- Default implementation loop: 2.23s.
- Phase durations: 1.16s relay/rise, 0.04s post-rise delay, 0.20s whole-phrase zoom, 0.17s title cut, 0.35s color reveal, 0.31s hold.
- Overlaps: each later group starts while the already-visible cluster is still enlarging, creating a continuous relay rather than simultaneous scatter motion.
- Holds with residual motion: none observed after the final color field settles.
- Hard cuts: phrase-to-title is intentionally crisp.
- Easing hypothesis: quintic smooth convergence plus a restrained back-ease entry pop.

## Reuse plan

- Existing animation/math to reuse: deterministic canvas timeline and project icon drawing from Glyph Relay; centered stage geometry from the modern effects.
- Shared UI files: `me-motion-editor.css/js`, Current Wall / Focus Wheel inspector primitives.
- Shared media/image files: `assets/transparent-animals/` and uploaded image/GIF decoding.
- Shared export files: `js/continuation-gif.js`, `CCapture.all.min.js` / WebM writer.
- New core logic required: weighted progressive phrase layout, per-group relay timing, per-character reveal order, vertical entry direction, continuous group scaling, plus radial color reveal.

## User-editable parameters

### Common

- Word groups, final title, font, weight, overall speed, motion version, horizontal reveal order, vertical entry direction, rise start time, first-group start distance, per-group distance increment, group interval, group rise duration, character interval, character reveal duration, rise-stage scale, completed zoom scale, post-rise delay, zoom duration, zoom easing, title-cut duration, color-reveal duration, hold, icon choice and icon size.

### Advanced

- Gather/final font sizes, word gap, stage position, and motion softness.

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
- 2026-08-16: first implementation incorrectly modeled the scene as independent scattered words. User feedback clarified the essential behavior: sequential group relay, internal character reveal, vertical rise/fall, progressive re-centering, and continuous enlargement.
- 2026-08-16: normal and slow frames show that the reference separates motion into two stages: groups rise/re-center first, then the assembled phrase enlarges. The previous simultaneous-rise-and-enlarge behavior is retained as an explicit alternate style instead of being discarded.
- 2026-08-16: later feedback identified insufficient visible travel. Re-checking both speeds showed progressively lower starts for later groups. The renderer now uses a first-group distance plus a per-group increment, and vertical travel is decoupled from text scale so shrinking the text no longer also shrinks the path.
