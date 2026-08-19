# Effect analysis: `beforeafter`

## Source material

- Still: `C:\Users\Administrator\Desktop\动效\20260819-144318.jpg` — stacked BEFORE / AFTER landscape
- Video: `C:\Users\Administrator\Desktop\动效\动效7.qt`
- Duration / fps / dimensions: 4.47s, 30 fps, 540×1166, 134 frames, H.264 + AAC
- Relevant crop: ignore phone status bar, tweet chrome, YouMind branding
- Analysis date: 2026-08-19

Do not commit the source `.qt`. Demo stills were cropped from the BEFORE/AFTER poster into `site/assets/beforeafter-*.jpg`.

## One-sentence target

A 9:16 phone frame first shows the full-screen BEFORE/AFTER comparison, slides to a second page that only has a Before label and one upload box, fills 100%, then cuts to the effect image full screen.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.50s | 001–015 | Blank | Empty dark rounded card | Empty stage / empty slots | high |
| 0.50–1.50s | 016–045 | Drop | Photo flies from lower right into a dashed card, then sits small in the center | Original flies into BEFORE slot; AFTER fades in below | high |
| still | — | Compare | Poster: BEFORE over AFTER, white page, tracked labels | Hold 1–2s on the stacked format | high |
| 2.00–2.50s | 060–075 | Generate | Original fills the card, pink ring ~56% then 100% | Circular progress on the original | high |
| 3.00–4.47s | 090–134 | Result | Watercolor / processed image full bleed | Instant switch to AFTER, then hold | high |

## Element model

- Text unit: BEFORE / AFTER labels, percent numeral
- Persistent elements: two user images (original + effect)
- Replaced/removed elements: empty slots, dashed drop hint, generate ring
- Image/icon behavior: two uploads, cover-fit, rounded cards
- Layer order: page → cards → photos → labels → ring

## Spatial rules

- Compare: vertical stack, centered, labels above each card
- Generate: one portrait card, image cover, ring at optical center
- Result: effect image cover, full stage
- Stage size comes from the canvas client box, not `window.innerWidth`

## Timing and easing

- Default loop ≈ 6.2s at 1×
- Blank 0.35 / drop 0.70 / compare 1.40 / morph 0.45 / generate 0.90 / result 1.60
- Drop and morph: ease-out cubic / ease-in-out cubic
- Generate: linear percent, ring ease-out
- Result: 0.18s crossfade after 100% so the cut is continuous, not a flash frame

## Reuse plan

- Shared UI: `me-motion-editor.css/js`, `stg-cn.css`, `continuation.css`, `currentwall.css`
- Shared export: `js/continuation-gif.js`, `CCapture.all.min.js`
- New files only: `beforeafter.html/css/js`, demo jpgs, analysis, gallery line

## User-editable parameters

### Common

- Original upload, effect upload
- BEFORE / AFTER labels
- Compare hold, generate duration, result hold
- Ring color, page colors
- Global speed

### Advanced

- Blank / drop / morph durations
- Card radius, page padding
- Cut softness

## Uncertainties to verify

- Source video is a social-app screen recording; we do not copy YouMind / tweet UI
- Default demo pair is the cropped landscape still, not the avatar video

## Acceptance evidence

- [ ] Normal-speed comparison
- [ ] Key paused frames
- [ ] Chinese labels
- [ ] Desktop stage centering
- [ ] Inspector scroll reaches bottom
- [ ] Mobile layout
- [ ] Console clean
- [ ] PNG / GIF / video export UI present
