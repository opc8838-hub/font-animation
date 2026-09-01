# Effect analysis: `shutterafter`

## Source material

- Normal-speed file: `C:\Users\Administrator\Desktop\飞书20260826-143941.qt`
- Slow-motion file/URL: none
- Duration / fps / dimensions: 12.40s, 30 fps, 540×1166, 372 frames, H.264 + AAC
- Relevant crop: ignore phone status bar, tweet chrome, Reve branding; keep the three-card carousel
- Analysis date: 2026-08-26

Do not commit the source `.qt`. Demo stills were cropped from the center cards into `site/assets/shutterafter/`.

## One-sentence target

A 9:16 card carousel holds an original photo in the center with Before on top; tapping the shutter wipes it into the effect image and switches the label to After, then slides to the next pair.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.80s | 001–024 | Intro carousel | Three 9:16-ish cards; center is original PHOTOGENIC with white shutter | Cover-flow: center upright, sides yawed and smaller | high |
| 0.80–2.00s | 024–060 | Scroll | Next original (GOURMET / WATERCOLOR) eases to center | Shared horizontal offset, ease-in-out | high |
| 3.40–3.90s | ~102–117 | Shutter | Center photo dims/blurs to a dark plate; shutter stays | Capture flash, not a hard cut | high |
| 3.90–4.70s | ~117–141 | Reveal | Effect image (watercolor dog) fades/sharpens in | User request: directional wipe L→R or R→L | high / medium |
| 4.70–11.4s | — | Repeat | Comic, keychain, chibi each do original → shutter → after | Same pair cycle, at least 3 user-editable pairs | high |
| 11.4–12.4s | 340–372 | Loop | Returns toward photogenic; recording ends on tweet UI | Product loop should TV-off like 图片对比, not copy tweet chrome | high |

## Element model

- Text unit: Before / After labels; optional per-pair style title
- Persistent elements: N image pairs (original + effect), shutter disc on the center card
- Replaced/removed elements: none; pairs stay in the strip
- Image/icon behavior: cover-fit into 9:16 rounded cards
- Layer order: stage → side cards → center card → photo wipe → shutter → labels

## Spatial rules

- Composition center: stage center, independent of the 420px editor
- Alignment: center card axis-aligned; side cards fake `rotateY` via horizontal scale
- Scale behavior: center card ~50–56% of stage width, aspect 9:16, larger than the tweet’s small cards
- Responsive/aspect-ratio behavior: phone frame 9:16; export 1:1 / 4:5 / 9:16 / 16:9 share one layout function
- Entry/exit boundaries: opening stage pop; closing TV-off line

## Timing and easing

- Total loop: pop + N × (before hold + shutter + wipe + after hold) + (N−1) scrolls + TV-off
- Default pair: before 0.55s / shutter 0.18s / wipe 0.48s / after 0.55s / scroll 0.52s
- Overlaps: pop runs over the first Before hold
- Holds with residual motion: none after settle
- Hard cuts: none; shutter uses a short dim, wipe is clipped reveal
- Easing/spring hypotheses: default carousel is Apple-like inertia (light right yaw, ~3% overshoot, gentle rebound); other scroll styles keep cubic / back / snap; pop ease-out then settle; wipe ease-in-out

## Reuse plan

- Existing animation/math to reuse: `drawWithStagePop` and `drawTvShutdown` from 图片对比
- Shared UI files: `me-motion-editor.css/js`, `stg-cn.css`, `continuation.css`, `currentwall.css`, `shared-font-library.js`
- Shared media/image files: cropped demo stills under `site/assets/shutterafter/`
- Shared export files: `js/continuation-gif.js`, `js/h264-mp4-encoder.web.js`
- New core logic required: pair list, cover-flow, shutter, directional wipe

## User-editable parameters

### Common

- Add / remove at least 3 image pairs (original + effect + wipe direction)
- Before / After copy, font, size, tracking
- Card scale, radius, carousel spacing
- Before hold, shutter, wipe, after hold, scroll
- Global speed

### Advanced

- Stage pop duration / strength
- TV-off theme, duration, hold, glow
- Shutter size, page color, label color
- Optional pair titles

## Uncertainties to verify

- Source is a social-app screen recording; do not copy Reve / tweet UI
- Original clip uses blur-to-after more than a hard wipe; product wipe is the requested comparison language
- Demo crops still contain a faint shutter disc; the renderer draws its own button on top

## Acceptance evidence

- [ ] Normal-speed comparison
- [ ] Key paused frames
- [ ] Chinese labels
- [ ] Desktop stage centering
- [ ] Inspector scroll reaches bottom
- [ ] Mobile layout
- [ ] Console clean
- [ ] PNG / GIF / video export UI present
