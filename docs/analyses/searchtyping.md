# Effect analysis: `searchtyping`

## Source material

- Normal-speed file/URL: https://www.snapcn.dev/docs/components?item=search-typing
- Slow-motion file/URL: n/a — source is a Remotion component with published timing constants
- Duration / fps / dimensions: 420 frames at 60 fps, 1280×720 default composition
- Relevant crop: full frame; the search field is wider than the shot
- Analysis date: 2026-08-19

Do not commit private or unlicensed source video. Record enough metadata to identify it locally.

## One-sentence target

A search field sits slightly back, types a sentence one character at a time, dollies forward and pans to keep the caret in frame, then recedes far enough that the whole field and finished sentence are visible at once.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.50s | 000–030 | Intro | Field parked back, caret blinking, no text | `startDelay`; rest scale = front / 1.25 | high |
| 0.50–1.30s | 030–078 | Dolly | First keystroke; field comes forward | `dollyDuration` 0.8s, inOut sine; scale rest → front | high |
| 0.50–~3.5s | 030–210 | Type | Characters appear; pauses after spaces and punctuation | 14 cps, humanize 0.35, wordPause 1.55×, punct 2.2× | high |
| mid-type | — | Pan | Caret approaches ~88% of visible page; field slides | `panDuration` default 1.4s (快 0.5 / 稳 1.4 / 慢 2.6), ease selectable; left-anchor → right-anchor | high |
| type end–+0.90s | — | Hold | Finished sentence at the front, caret blinking | `holdAfter` 0.9s | high |
| +0.90–+2.10s | — | Recede | Field travels further back than start; whole bar in frame | `recedeDuration` 1.2s, inOut cubic; scale front → end | high |

## Element model

- Text unit: grapheme (character). Whole sentence is laid out once and revealed by clipping.
- Persistent elements: search/sparkle icon, field chrome, blinking caret.
- Replaced/removed elements: none. Characters never re-kern as later ones land.
- Image/icon behavior: optional search magnifier or sparkle; not a `{图}` media token.
- Layer order: backdrop → field surface + shadow → icon → clipped text → caret.

## Spatial rules

- Composition center: field vertically centered; scale pivots on the text baseline so glyphs do not climb the pixel grid.
- Alignment: left-anchored while typing the first half; right-anchored after the pan; retreat keeps the right cap pinned.
- Scale behavior: rest (front/dolly) → front (`fieldHeight` × frame height) → end (whole field fits `pageWidth`).
- Responsive/aspect-ratio behavior: `fieldHeight` is a fraction of stage height; field is padded longer than its sentence so it stays slim.
- Entry/exit boundaries: `edgeInset` margin; `frontVisible` 0.56 of the field is in frame at the front.

## Timing and easing

- Total loop: startDelay + typing + holdAfter + recedeDuration (≈ 7s at defaults).
- Phase durations: 0.5 / 0.8 / typing / 1.4 pan default (overlaps typing) / 0.9 / 1.2.
- Overlaps: dolly and pan finish inside the typing window; they never extend the clip.
- Holds with residual motion: intro and hold only have caret blink; field scale is parked.
- Hard cuts: none. Loop jumps from recede end back to intro.
- Easing/spring hypotheses: dolly = inOut sine; pan and recede = inOut cubic. Confirmed in source.

## Reuse plan

- Existing animation/math to reuse: none of the 33 effects implement a search-field camera. Port the published `buildTypingSchedule` / `cameraPush` / `cameraPan` / `cameraRetreat` math into a new canvas renderer.
- Shared UI files: `me-motion-editor.css`, `me-motion-editor.js`, `stg-cn.css`, `continuation.css` (fonts + form), `currentwall.css` (stage chrome). Included only, not edited.
- Shared media/image files: none.
- Shared export files: `js/continuation-gif.js` + worker, `CCapture.all.min.js`. Included only.
- New core logic required: `site/searchtyping.js`.

## User-editable parameters

### Common

- Sentence text
- Typing speed, humanize, word/punctuation pause
- Surface (glass / shadcn), icon, background / ink
- Font family + weight
- Start delay, hold, recede
- Dolly amount and field height

### Advanced

- Dolly / pan / recede durations
- Front visible fraction
- Edge inset
- Caret on/off and blink rate
- Global speed
- Seed

## Uncertainties to verify

- Default demo sentence is not in the published function signature; used a long Chinese sentence that still triggers pan.
- Outfit 300 is the reference face; repo uses Inter / Space Grotesk / Noto Sans SC instead of adding a new font file.
- Canvas `measureText` prefix advances vs DOM Range advances may differ by a few pixels on some faces.

## Acceptance evidence

- [x] Normal-speed comparison — CDP sampled hold-start → type/dolly/pan → loop
- [x] Key paused frames — intro empty field; mid-type Chinese glyphs on glass bar
- [x] Chinese input — default sentence types with Noto Sans SC Light 300
- [x] Desktop stage centering — 420px inspector, canvas client ~1004×805
- [x] Inspector scroll reaches bottom — panel overflow-y scroll, export section present
- [x] Mobile layout — stage above, inspector below; canvas 390×490
- [x] Console clean — no window error events during playback
- [ ] PNG generated — export UI present; headless download not captured
- [ ] GIF generated
- [ ] Video generated

## Feedback discoveries

- 2026-08-19: Source is a Remotion component, not a video. Timing, ratios, and camera marks were taken from the published `search-typing.tsx` comments and functions.
- 2026-08-19: Existing effects must not be edited; other machines still have unsaved work. This effect is isolated files plus additive gallery/nav lines.
