# Effect analysis: Color Canvas / 彩幕组句

Reference: `排序2.qt`, 8.081 s, 720 × 1556, 242 frames at about 30 fps.

## Phase table

| Reference range | Motion retained in the editor |
| --- | --- |
| 0–50 | The first word appears oversized, changes weight and contracts to its final scale. |
| 51–105 | Following words arrive one by one and reorganize into a multiline composition. |
| 106–139 | A magenta and purple field grows behind the completed copy. |
| 140–205 | The field shifts to yellow-green while broad radial arcs keep flowing continuously. |
| 206–241 | The original adds a hand, stylus and device movement. Those product-shot elements are intentionally excluded. The completed canvas remains directly editable and exportable. |

## Reused principles

- The deterministic stage timeline and phase-preserving controls reuse the project’s newer Canvas editors.
- The gradient interpolation is adapted from Gradient Type, but uses only three broad radial fields instead of per-pixel or per-letter effects.
- Preview DPR is capped at 1.25, hidden tabs stop their animation frame, and text/background share one Canvas. This avoids the CPU spike caused by many independent DOM animations.

## Editable parameters

- Multiline copy, Chinese fonts, font weight, size, tracking, line gap, width and alignment.
- Intro, reveal, stagger, purple hold, green transition and flowing hold durations.
- Four reveal rhythms, intro scale and travel distance.
- Background palette, flow speed, orb size, softness and brightness.
- PNG, GIF and WebM export with common social sizes, custom dimensions, duration and fps.
