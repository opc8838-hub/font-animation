# Effect analysis: `City Stack / 城市字塔`

## Source material

- Reference file: `动效11.qt`
- Metadata: H.264, 4.233334s, 30fps, 127 video frames, 540×1166
- Relevant crop: only the central green/gray typography is reconstructed; the horse-racing footage, social-app chrome, and account UI are intentionally excluded.
- Analysis date: 2026-08-16

## One-sentence target

A fixed-top, high-weight Chinese/English word tower builds one item at a time with a brief neon flash and restrained upward settle, then completes an edge-to-center subtitle and fades in a gray signature.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.67s | 000–019 | Background lead-in | no title text is visible | deliberate opening delay before the typographic build | high |
| 0.67–1.53s | 020–045 | Chinese block build | `只 → 在 → 香 → 港` fills a fixed two-column grid | every character appears at its final position, stays bright for roughly 3–4 frames, drops almost out for 2–3 frames, then relights and stabilizes | high |
| 1.53–2.10s | 046–062 | English lines | `HONG`, then `KONG`, extends the tower downward while the last Chinese character is settling | English enters as complete line units with the same visible bright/off/relight structure | high |
| 2.10–2.93s | 063–087 | Subtitle completion | `亚洲`, then `都会`, then the middle `国际` completes `亚洲国际都会` | subtitle arrives as three two-character groups, expanding from the two outer pairs toward the center pair | high |
| 2.93–3.50s | 088–104 | Signature reveal | gray `discoverhongkong.cn` appears below the green tower | independent soft opacity fade with no large movement | high |
| 3.50–4.23s | 105–126 | Final hold | completed lockup remains stable | clean hold for legibility | high |

## Element model

- Text units: individual Chinese characters, complete English lines, individual subtitle characters, and one footer/signature line.
- Persistent elements: the already-revealed title units remain visible through the rest of the cycle.
- Replaced/removed elements: none; this is an additive build.
- Background behavior: a single editable solid color; the reference footage is out of scope by user request.
- Layer order: base background → primary green title tower → gray signature.

## Spatial rules

- Composition center: actual right-hand stage center, not browser-window center.
- Alignment: every line is independently measured and horizontally centered on a shared vertical axis.
- Anchor behavior: the top of the tower remains fixed while new rows extend downward.
- Typography: geometric sans / Chinese grotesk at Extra Bold to Black weight, tight line height, minimal tracking, square proportions.
- Measured final geometry at 540×1166: five green line widths are 247–262px; Chinese row starts are about 123px apart; English row starts are about 74px apart; the final green block spans y=275–745 and is centered near x=270.
- Responsive behavior: a portrait-oriented logical composition scales uniformly into desktop, mobile, and export dimensions.

## Timing and easing

- Total reference loop: 4.233334s.
- Default implementation loop: 5.72s. After visual review, the editor default deliberately prioritizes clearly readable, strictly serial flashes over the source video's partially overlapping 4.23s timing.
- Default phase model: 0.67s lead-in; every Chinese character receives a complete 0.32s flash and a 0.04s post-flash wait before the next character begins. English lines and subtitle groups use the same 0.32s + 0.04s serial rule, followed by a 0.50s footer delay, 0.30s footer fade, and 0.716s hold.
- Entry geometry: the reference default has no translation and no scale change; alternative rise/snap rhythms remain editable.
- Flash model: only the currently entering character or English line follows a 0.32s bright → almost off → dim → bright sequence; already-visible text stays stable. A following unit cannot start until the current unit has completed the entire sequence and its post-flash wait.

## Reuse plan

- Shared UI/export engine: `sequence-motion.js`, `sequence-motion.css`, `me-motion-editor.css/js`.
- Shared deterministic playback: pause, single-frame stepping, cycle-relative export, aspect-ratio presets.
- Shared local font assets: Relay Noto variable font, with Inter/Space Grotesk/Manrope/Poppins alternates.
- New core logic: additive grid/line tower, subtitle outside-to-center ordering, and synchronized short flash pulses.

## User-editable parameters

### Common

- Four text areas/fields, arbitrary Chinese character count, font family, weight, overall speed, opening delay, unified flash duration, wait-after-each-flash, English/subtitle waits, section gap, subtitle delay, footer delay/fade, final hold, entry rhythm, background, separate Chinese/English/subtitle/signature colors, and a dedicated local-flash color.

### Advanced

- Five Chinese order modes (row left-to-right, row right-to-left, column top-to-bottom, reverse, and custom); a custom 1-based position sequence; optional comma-separated per-character flash durations; Chinese/English/subtitle/footer sizes; independent horizontal spacing for Chinese, English, subtitle, and signature; independent vertical spacing for Chinese rows, English rows, Chinese-to-English, subtitle, and signature; entry distance, entry scale, local-flash strength, and stage X/Y position.

## Uncertainties to verify

- The exact source typeface appears customized or brand-selected; the local Noto Sans SC variable font is the closest redistributable project font and remains user-replaceable.
- A few one-frame brightness changes may partly come from source video compression/exposure; the implementation treats them as a controlled flash amount rather than random noise.

## Acceptance evidence

- [x] Key paused frames
- [x] Chinese input
- [x] Desktop stage centering
- [x] Inspector scroll reaches bottom
- [x] Mobile layout
- [x] Console clean
- [x] PNG generated at 320×320
- [x] GIF generated at 320×320, 1s, 15fps
- [x] WEBM video generated at 320×320, 1s, 15fps
- [x] Strict no-overlap keyframe: while `在` is flashing, `香` is not yet visible
- [x] Six-character custom order and six independent durations recalculate the complete timeline
