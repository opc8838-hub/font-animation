# Effect analysis: `City Stack / 城市字塔`

## Source material

- Reference file: `动效11.qt`
- Metadata: H.264, 4.233334s, 30fps, 127 video frames, 540×1166
- Alternate reference: `动效11-1.qt`, H.264, 3.566667s, 30fps, 108 frames, 540×1166.
- Relevant crop: only the central green/gray typography is reconstructed; the horse-racing footage, social-app chrome, and account UI are intentionally excluded.
- Analysis date: 2026-08-16

## One-sentence target

A fixed-top Chinese/English word tower builds one item at a time with a brief neon flash and restrained upward settle, then completes an edge-to-center subtitle and fades in a gray signature.

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
- Alternate-reference behavior: the complete lockup cuts on at 0.20s, then only explicitly selected units pulse; every unit omitted from the flash sequence remains fully stable.

## Alternate reference 11-1

- Measured local-flash order: `香` (`H3`) → `国际` together (`S3+S4`) → `HONG` (`E1`) → `KONG` (`E2`). `只`, `在`, `港`, `亚洲`, and `都会` never drop out.
- Default editor token sequence: `H3,S3+S4,E1,E2`. Commas are strict serial order; `+` means a simultaneous group. Removing a token disables flashing for that unit, and arbitrary valid `H`, `E`, and `S` positions are accepted.
- Reconstructed timing: full tower at 0.20s; first pulse at 0.32s; per-group durations 0.52/0.24/0.30/0.46s; post-group waits 0.36/0.10/0.20/0s; total loop 3.57s.
- The selected item does not make one slow fade. It performs four quick bright/off/relight pulses inside its assigned duration, matching the frame-level strobe visible in the alternate clip.

## Spatial rules

- Composition center: actual right-hand stage center, not browser-window center.
- Alignment: every line is independently measured and horizontally centered on a shared vertical axis.
- Anchor behavior: the top of the tower remains fixed while new rows extend downward.
- Typography: official open-source Noto Sans HK variable font. Primary Chinese and English use Medium 500; the fifth subtitle line uses Bold 700; the signature uses Semibold 600.
- Font reconstruction: the source frame is a Hong Kong modern grotesk rather than the previous synthetic Extra Bold Simplified-Chinese face. The first Chinese row uses a 96% vertical transform and the second uses 130%, with a 57px logical row gap. This reproduces the source's flatter first line and much taller `香港` line.
- Width rule: all five visible title lines—both Chinese rows, both English rows, and the subtitle—normalize to one editable 520px logical ink width. Added Chinese or English lines inherit the same target automatically, so every left and right edge remains aligned despite different scripts or character counts.
- Source-frame measurements at 540×1166: line widths 254/259/248/248/247px; heights 108/149/62/61/35px; the final coloured block spans y=276–746 and is centered near x=270.
- Responsive behavior: a portrait-oriented logical composition scales uniformly into desktop, mobile, and export dimensions.

## Timing and easing

- Total reference loop: 4.233334s.
- Default implementation loop: 5.72s. After visual review, the editor default deliberately prioritizes clearly readable, strictly serial flashes over the source video's partially overlapping 4.23s timing.
- Default phase model: 0.67s lead-in; every Chinese character receives a complete 0.32s flash and a 0.04s post-flash wait before the next character begins. English lines and subtitle groups use the same 0.32s + 0.04s serial rule, followed by a 0.50s footer delay, 0.30s footer fade, and 0.716s hold.
- Entry geometry: the reference default has no translation and no scale change; alternative rise/snap rhythms remain editable.
- Flash model: only the currently entering character or English line follows a 0.32s bright → almost off → dim → bright sequence; already-visible text stays stable. A following unit cannot start until the current unit has completed the entire sequence and its post-flash wait.
- Alternate pulse model: all text is present first; only sequence-listed units receive a configurable 1–6 pulse strobe. Group and item timing remains deterministic and strictly serial.

## Reuse plan

- Shared UI/export engine: `sequence-motion.js`, `sequence-motion.css`, `me-motion-editor.css/js`.
- Shared deterministic playback: pause, single-frame stepping, cycle-relative export, aspect-ratio presets.
- Shared local font assets: Noto Sans HK variable font from the official Google Fonts GitHub repository, with Noto Sans SC/Inter/Space Grotesk/Manrope/Poppins alternates.
- New core logic: additive grid/line tower, full-lockup selective-pulse mode, tokenized unit/group ordering, subtitle outside-to-center ordering, synchronized short flash pulses, and per-row X/Y glyph transforms.

## User-editable parameters

### Common

- Four text areas/fields, arbitrary Chinese character count, build/pulse structure, selectable flash targets and grouped ordering, font family, weight, overall speed, opening delay, full-lockup-to-first-pulse delay, unified or per-item flash durations, unified or per-item waits, flash count, English/subtitle waits, section gap, subtitle delay, footer delay/fade, final hold, entry rhythm, background, separate Chinese/English/subtitle/signature colors, and a dedicated local-flash color.

### Advanced

- Five Chinese build-order modes (row left-to-right, row right-to-left, column top-to-bottom, reverse, and custom); a custom 1-based position sequence; optional comma-separated per-item durations and waits; automatic equal-width primary lines with editable target width; arbitrary per-row horizontal and vertical percentages when equal-width mode is disabled; Chinese/English/subtitle/footer sizes; independent horizontal spacing for Chinese, English, subtitle, and signature; independent vertical spacing for Chinese rows, English rows, Chinese-to-English, subtitle, and signature; entry distance, entry scale, local-flash strength, and stage X/Y position.

## Uncertainties to verify

- The campaign does not publish a typeface name. Frame-level glyph comparison identifies Noto Sans HK Medium as the closest redistributable match; it uses the correct Hong Kong regional glyph set and remains user-replaceable.
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
- [x] Alternate-reference keyframes at 0.40s (`H3`), 1.23s (`S3+S4`), and 1.60s (`E1`)
- [x] Single-target `H2` test disables every other flash and recalculates the loop to 1.91s
- [x] Alternate preset loop equals 3.57s reference duration
- [x] Official OFL Noto Sans HK variable font loads locally at weights 500/500/700
- [x] Uniform width mode performs a final raster-pixel fit so every visible line shares the same left and right edges
- [x] Five-line visible-ink normalization includes the subtitle, not only the first four lines
- [x] Source-frame geometry recorded as widths 254/259/248/248/247px and heights 108/149/62/61/35px
