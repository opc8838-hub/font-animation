# Effect analysis: Scrap Bin / 揉纸入篓

Reference: `排序4.qt`, 9.521 s, 720 × 1556, 285 frames at about 30 fps.

## Phase table

| Approx. time | Visual state |
| --- | --- |
| 0–1 s | Clean white `Scrap it.` on black. |
| 1–3.8 s | A translucent bin grows/fades in below the copy; both hold. |
| 4.0 s | The copy abruptly becomes ink printed on a pale paper rectangle. |
| 4.1–5.4 s | The rectangle folds and compresses into an irregular crumpled ball while rotating. |
| 5.5–5.9 s | The ball accelerates into the bin. |
| 6.0 s onward | Colored scrap pieces appear above the bin’s glass body and the result holds. |

All short-video app chrome and phone overlays are excluded.

## Implementation and reuse

- The paper is a bounded ten-point polygon. Its vertices, compression and wrinkle lines are deterministic, so preview and export match.
- The fall uses a small analytical motion model (gravity, smooth, bounce or snap), not a continuously running physics engine.
- The translucent bin and its contents are Canvas gradients and clipped polygons. There are no image textures or per-frame allocations.
- Preview DPR is capped at 1.25 and background tabs stop drawing.

## Editable parameters

- Eight stage durations, overall speed, fall rhythm, rotations and horizontal sway.
- Paper width/wrinkles, bin size/gap/opacity and scrap count/bounce.
- Text/font/position and material colors.
- PNG, GIF and WebM output at common and custom sizes, durations and fps.
