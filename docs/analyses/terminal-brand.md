# Effect analysis: Terminal Brand / 终端署名

Reference: `排序5.qt`, 6.665 s, 540 × 1166, 199 frames at about 30 fps.

## Phase table

| Approx. time | Visual state |
| --- | --- |
| 0.0–2.3 s | A cyan cursor types `hey there.` over faint horizontal/vertical guide lines. |
| 2.3–3.2 s | The sentence backspaces from the end until the canvas is empty. |
| 3.2–4.0 s | A small cyan geometric logo appears alone at center. |
| 4.0–5.2 s | The logo shifts left while `Composio` types to its right. |
| 5.2–6.3 s | Completed logo lockup holds. |
| 6.3–6.7 s | The lockup fades to black. |

Phone and X/Twitter UI are excluded.

## Implementation and reuse

- The character timeline reuses the deterministic typing principle from Gradient Type, adding a reverse/backspace pass and a second icon-anchored typing pass.
- Natural typing uses seeded per-character weights with longer pauses after spaces and punctuation; other rhythms are uniform, burst and word-step.
- Icon selection reuses project music/play/cloud/watch vectors and transparent animal assets, with image/GIF upload fallback.
- One Canvas renders guides, type, cursor and icon. Preview DPR is capped at 1.25 and hidden tabs stop drawing.

## Editable parameters

- Two text fields and seven independent phase durations plus overall speed.
- Four typing cadences and cursor rate.
- Icon asset, upload, size, gap and X/Y offsets.
- Font, size, tracking, position, glow, guide opacity and colors.
- PNG, GIF and WebM output at common/custom dimensions, durations and fps.
