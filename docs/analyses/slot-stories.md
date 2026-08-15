# Effect analysis: Slot Stories / 字位剧场

Reference: `排序6.qt`, 6.966 s, 540 × 1166, 208 frames at about 30 fps.

## Phase table

| Approx. time | Visual state |
| --- | --- |
| 0.0–0.3 s | A large white case rapidly shrinks into the missing `a` slot in `escape`. |
| 0.3–1.9 s | The case lid opens and two earbud-like forms rise, while the word stays centered. |
| 2.0–2.5 s | A horizontal white band stretches from the center and fills the canvas. |
| 2.5–3.8 s | Black `stories` holds on white with two glyph positions replaced by compact icons. |
| 3.8–4.5 s | The previous word exits left as `characters` enters from the right. |
| 4.5–7.0 s | The new word holds; one slot is a compact icon and another is a character that turns/poses. |

Phone and social platform chrome are excluded. Brand-specific logos are replaced with editable project assets.

## Implementation and reuse

- Glyph layout and replacement slots reuse the project’s Glyph Relay principle: each replacement receives a measurable slot before the whole group is centered.
- The case is a lightweight vector drawing with an analytic lid transform and two rising elements.
- The white wipe and scene slide are transform-only Canvas geometry; the character motion is deterministic.
- Project icons and transparent animal assets can be selected, while two user upload slots accept image/GIF files.

## Editable parameters

- Three texts, five replacement positions, three asset selectors and two uploads.
- Seven phase durations, wipe rhythm, character motion and motion amplitude.
- Font, tracking, icon size/slot width, position, slide distance and scene colors.
- PNG, GIF and WebM export at common/custom dimensions, durations and fps.
