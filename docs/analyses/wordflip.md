# Effect analysis: `wordflip`

## Source material

- https://www.snapcn.dev/docs/components?item=word-flip
- Source: `registry/snap-cn/word-flip` (MIT). Timing from `config.ts` and motion math from `index.tsx`.
- Duration: 180 frames at 30 fps ≈ 6.00s (looping flips)
- Analysis date: 2026-08-21

## One-sentence target

The sentence types in around a reserved middle slot; then each replacement word 3D-flips in on the baseline with a backswing, without shoving the prefix or suffix.

Default studio copy (not the snapcn English demo): prefix `我想做一套`, words `干净 锋利 温柔`, suffix `封面`.

## Phase table

| Time (frames @30) | Phase | Evidence from snapcn source | Confidence |
| --- | --- | --- | --- |
| 0–4 | Hold before first key | `typeStart` 4 | high |
| 4+ | Prefix then suffix type | `cps` 9, `charFade` 6, `jitter` 0.18 | high |
| typingEnd+6 | Pause | `pause` 6 | high |
| then every 35 | Flip | `cycle` 35, `exitDuration` 9, `enterDuration` 9, `overlap` 3 | high |
| each exit | Backswing then throw | `easeInBack`, `exitY` -1.29em, `rotate` 90°, `blur` from speed | high |
| each enter | Settle from below | bezier(0.2, 0.6, 0.35, 1), `enterY` 0.135em | high |

## Element model

- Prefix and suffix type as individual glyphs. The flipping words are **not** typed.
- The slot is reserved at the widest word width before the first word arrives.
- Every flip word is uniformly scaled to that common width (`fitScales`).
- Transform origin is the baseline. Perspective is 6.5em.

## Timing and easing

- Exit: one `easeInBack` progress drives Y, rotateX, scale, and opacity.
- Blur follows `easeInBackSpeed` (sharp at the dip, smeared at peak travel).
- Enter starts `exitDuration - overlap` frames into the cycle.
- Looping is on; export length is typing + pause + one pass through all words.

## Reuse

- Shared editor/export: `fx-kit.js`, `me-motion-editor`, GIF/MP4 stack
- New files only: `wordflip.html` / `wordflip.js` / `wordflip.css`

## Uncertainties

- Official preview is a rendered mp4; this port uses the published math, not a screen recording.
- Canvas 2D approximates `rotateX` with a Y-scale of `cos(angle)` plus the published translate/blur/opacity curves.
