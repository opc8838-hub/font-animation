# Effect analysis: Liquid Type / 液字凝结

Reference: `排序3.qt`, 3.437 s, 720 × 1556, 102 frames at about 30 fps.

## Dense frame findings

| Approx. time | Visual state |
| --- | --- |
| 0.0–0.35 s | Clean white `Prompt it.` centered on black. |
| 0.4–1.05 s | The glyphs break into pale grey and warm-white foam/crystal pieces while retaining their silhouette. |
| 1.1–1.35 s | The fragments rapidly condense into rounded cyan-blue letters. |
| 1.35–2.7 s | The blue gel word holds and breathes subtly. Bright droplets continue moving around the word. |
| 2.75–3.4 s | Blue collapses into a low-opacity red-brown word and a broad horizontal smoky band. |

All phone UI, account controls and the floating assistive button are excluded.

## Implementation

- An offscreen Canvas rasterizes the current text. Alpha pixels are sampled into a bounded, deterministic particle set, so custom Chinese and Latin copy generate matching foam and droplets.
- Liquid letters use rounded strokes, a colored glow, a screen-blended highlight and a very small breathing scale.
- Smoke is a fixed set of blurred radial fields. Particle count never accumulates over time.
- Preview DPR is capped at 1.25 and hidden tabs stop requesting frames.

## Editable parameters

- Six independent phase durations plus overall speed and four condensation rhythms.
- Particle density, droplet size, spread, drift, gel roundness/gloss, smoke width/blur and all colors.
- Font, weight, size, tracking and X/Y placement.
- PNG, GIF and WebM output at common or custom sizes, durations and frame rates.
