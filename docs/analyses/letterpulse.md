# 字阶 / Letter Pulse

## Source and target

- Source: local screen recording `飞书20260924-184804.qt`, 7.133 s, 540 × 1166, H.264, 30 fps, 214 frames. The upper rectangle is about x=23–489, y=274–596.
- The recording begins with phone UI briefly over the animation. Timing below is measured from the recording, so the clip's first 0.3 s is not part of the effect.
- Target: a heavy single word repeatedly hands emphasis from one glyph to the next. Each glyph swells to nearly the frame height while neighbors compress and overlap on one baseline; the line then scatters to tiny endpoint glyphs and reassembles.

## Phase table

| Recording time | Frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.3–1.6 s | 9–48 | Full word | White `doel` fills a black horizontal box. `o` is largest; `e` is small. | Hold an asymmetric glyph-size composition. | high |
| 1.7–2.2 s | 51–66 | Pulse transfer | `d` expands while `o` shrinks; next `e` grows. Letter centers stay near the same baseline but spacing changes. | Interpolate size per glyph and recompute neighboring centers, with mild overlap. | high |
| 2.2–3.5 s | 66–105 | Rolling emphasis | The tall glyph appears successively across the word, ending with a huge `l` and smaller preceding letters. | One moving emphasis window, not a global word zoom. | high |
| 3.5–4.0 s | 105–120 | Scatter / reset | Most canvas turns black; tiny `d` survives at the left and a tiny endpoint appears at the right before letters grow back. | Shrink and spread glyphs outward, then rebuild from the endpoints. | medium |
| 4.0–6.7 s | 120–201 | Repeat | Similar pulse pattern recurs with an irregular small/large grouping. | Loop the same motion family; do not freeze all glyphs together. | high |

## Observable motion contract

- Each grapheme is an independent scale channel, yet the line shares a horizontal baseline and common layout calculation.
- Adjacent widths are recomputed as sizes change; overlap is intentional, with later glyphs drawn over earlier ones.
- Pulse uses fast growth and slower contraction. Scatter reduces scale and fans glyph centers to opposite sides; the canvas remains opaque black.
- The last small letters are visible before the following expansion. There is no blur or afterimage.
- A 4-glyph default reproduces the observed proportions; arbitrary Latin or CJK text uses the same per-glyph method.

## Uncertainty

- The exact pulse order of `e` and `l` near 2.6–3.1 s is partly obscured by crop and overlap.
- The source font appears to be a very heavy sans, but the face is not identifiable from the recording. Use the shared font library and an editable heavy default.
- The first visible cycle may have started before screen capture; use the clearly observed full-word pose as local time zero.

## Reuse and verification

- Reuse the CellMotion editor shell conventions, shared font library, deterministic Canvas rendering, and local GIF/H.264 encoders.
- Compare full word, transfer, giant final glyph, tiny endpoint, and rebuilt word frames at normal speed and in export.
- Browser review on 2026-09-24: full-word and pulse frames checked at desktop 1440 × 900; Chinese text checked on 9:16 and mobile 390 × 844; console showed no errors. PNG, GIF, and MP4 generation completed at 320 × 240 in the in-app browser.
