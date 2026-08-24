# Effect analysis: `textswell`

## Source material

- https://www.snapcn.dev/docs/components?item=text-swell
- Source: `registry/snap-cn/text-swell` (MIT). Timing from `config.ts`.
- Duration: 110 frames at 30 fps ≈ 3.67s
- Analysis date: 2026-08-19

## One-sentence target

The lead word rises and floats toward you; later words push in from the right (first one bounces letters) and shove the lead word left; then the whole line falls back.

Default copy in studio: `Hely fun excellent` (not the snapcn demo sentence).

## Phase table

| Time (frames @30) | Phase | Evidence from snapcn docs | Confidence |
| --- | --- | --- | --- |
| 0–8 | Intro fade | `introDuration` 8 | high |
| 0–10 | Rise | `riseDuration` 10, `riseDistance` 0.7em | high |
| 14–34 | Approach | `approachDelay` 14, `approachDuration` 20, `frontScale` 2.1 | high |
| 27+ | Word shove | `wordDelay` 27, `wordStagger` 14, `wordPushDuration` 12 | high |
| first trailer | Bounce | `bounceWords` 1, letter swell 0.23, stagger 2, rise 3, fall 6 | high |
| after last word +6 | Front hold | `holdDuration` 6 | high |
| +18 | Recede | `recedeDuration` 18 | high |

## Reuse

- Shared editor/export: `fx-kit.js`, `me-motion-editor`, GIF/MP4 stack
- Not phrasebuild (no bounce/shove/camera). New files only.

## Uncertainties

- Official preview is a rendered mp4; we port the published timing, not a screen recording.
