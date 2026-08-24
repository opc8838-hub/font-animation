# Effect analysis: `assemble`

## Source material

- Normal-speed file/URL: `C:\Users\Administrator\Desktop\动效\动效1.qt`
- Slow-motion file/URL: n/a
- Duration / fps / dimensions: 3.13s, 30 fps, 720×1556, 94 frames, H.264 + AAC
- Relevant crop: ignore Xiaohongshu chrome; motion lives in the center band
- Analysis date: 2026-08-19

Do not commit the source `.qt`.

## One-sentence target

Colored icon fragments and mixed glyphs fly in from a scattered band, lock into a colorful title, then flatten into a single-color wordmark.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.25s | dense 001–004 | Pop | Green scribble, orange stroke, cyan dash, purple hook on a thin band | Fragments pop onto the title line, not from screen corners | high |
| 0.25–1.10s | dense 005–014 | Assemble | More icons/letters appear along the same baseline | Per-glyph stagger ~55ms, short local slide | high |
| 1.10–1.45s | dense 015–018 | Color hold | Mixed Creator Studio, some slots still icons | Brief colorful lockup | high |
| 1.45–1.90s | dense 019–024 | Flatten | Icons become letters, colors drain to white | Fast crossfade, ~0.4s | high |
| 1.90–3.13s | dense 025–038 | Hold | White wordmark + leading mark | Parked | high |

## Element model

- Text unit: grapheme. Spaces keep width but have no fragment.
- Persistent elements: final title glyphs.
- Replaced/removed elements: doodles / colored stand-ins used only in scatter/fly/color hold.
- Image/icon behavior: built-in doodles, optional uploads stamp a few slots. No Apple logo.
- Layer order: page → fragments → final title on flatten.

## Spatial rules

- Composition center: horizontal midline of the stage, not the window.
- Alignment: whole lockup centered; fit to ~86% of stage width.
- Scale behavior: fragments start at 0.4–1.2× and settle to 1.
- Responsive/aspect-ratio behavior: font size from stage height, then shrink to width.
- Entry/exit boundaries: scatter band is wider than the title and shorter than the stage.

## Timing and easing

- Total loop ≈ 3.15s at 1× (matches source).
- Phase durations: 0.20 / 1.15 / 0.45 / 0.55 / 0.80.
- Overlaps: per-glyph fly delay ≈ 30ms so the line does not slam as one brick.
- Holds with residual motion: color hold is still.
- Hard cuts: none. Loop jumps from hold end to scatter.
- Easing/spring hypotheses: fly = ease-out cubic; flatten = smootherstep.

## Reuse plan

- Existing animation/math to reuse: seeded jitter and palette idea from 汇聚/彩组. No name-scroll, no glitch pass. New fly-in path.
- Shared UI files: `me-motion-editor.css/js`, `stg-cn.css`, `continuation.css`, `currentwall.css`. Included only.
- Shared media/image files: none required.
- Shared export files: `js/continuation-gif.js`, `js/h264-mp4-encoder.web.js`.
- New core logic required: `site/assemble.js`.

## User-editable parameters

### Common

- Title text
- Font + weight + size
- Background / final ink
- Fragment palette
- Icon mix
- Fly / flatten / hold
- Global speed

### Advanced

- Scatter spread
- Per-glyph delay
- Leading mark on/off
- Seed

## Uncertainties to verify

- Source uses Apple Creator Studio branding. We reconstruct the motion, not the trademark mark.
- Social-app chrome is not part of the effect.

## Acceptance evidence

- [ ] Normal-speed comparison
- [ ] Key paused frames
- [ ] Chinese input
- [ ] Desktop stage centering
- [ ] Inspector scroll reaches bottom
- [ ] Mobile layout
- [ ] Console clean
- [ ] PNG / GIF / MP4 export UI present
