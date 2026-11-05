# 金属流光 / Metallic Text

## Source and target

- Public source: https://x.com/_crisjav/status/2113977792647827606
- Examined copy: 4.667 s, 1152 × 720, 60 fps, 280 frames, H.264, no audio.
- The recording shows a design tool with a black composition on the left. Its controls, pointer and text field are not part of the exported composition.
- Target: bold, wide silver lettering on black, with a slow cool/warm specular band passing across its surface.

## Observed phases

| Time | Frames | Visible evidence | Interpretation | Confidence |
| --- | --- | --- | --- | --- |
| 0.00–0.70 s | 0–42 | A single broad, square-cornered O is centered; its top is dark steel, its lower face is pale silver, and a blue/amber streak crosses the middle. | The lettering is a stable mask shaded by layered gradients. | High |
| 0.70–1.00 s | 42–60 | The operator adds K in the tool's text field; the composition becomes OK and refits horizontally. | Text editing is an interaction in the recording, not a required animation phase. | High |
| 1.00–4.67 s | 60–280 | OK remains in place. The cool/warm reflection moves even while the pointer is outside the lettering, then continues while the pointer crosses the word. There is no text exit. | A timed traveling reflection reproduces the visible motion; pointer causality is not established. | High for appearance, medium for the exact reflection path |

## Motion contract

- The entire word is one centered, stationary object. Letter spacing and font size change the same geometry in preview and export.
- The metallic face has a dark upper edge, layered silver/charcoal bands, a bright lower edge, and restrained blue/amber spectral highlights.
- A moving light band changes the shading inside the letter mask; it does not move the glyphs or background.
- The highlight uses a repeatable timed sweep. A brief editable entrance and hold make the effect usable as a looping CellMotion component; these are product adaptations, not claims about the source.

## Uncertainties

- The recording does not show a complete automatic loop, so its exact period is not observable.
- The source identifies Librestile with an additional square style. Librestile Extended Bold was obtained from its OFL upstream; a renamed derivative, CellMotion Square, gives the capital O a rounded rectangular contour and counter. Both are in the shared catalog, with their license and regeneration script. Other glyphs retain the upstream shapes.
- Fine material shading is limited by the compressed 1152 px recording. The implementation prioritizes the visible silver silhouette, moving blue/amber band, and black negative space.

## Implementation and verification

- The renderer caches a smooth contour-distance texture when text, typography or dimensions change, then shades the same mask in WebGL 2. Preview, exported PNG/GIF/H.264 and the iframe component use this single renderer and deterministic clock.
- Three semantic phases: silver reveal (0.45 s), light sweep (3.6 s), lit hold (0.6 s). Speed scales all three, timeline blocks, seek positions and exported duration together.
- `tests/metallic-text-browser.cjs` checks local save/reload/import/restore/clear, Latin/Chinese/Japanese/Korean fonts, canvas ratios, real exports, edited-state AI Manifest, real player controls and updates, pixel parity, origin rejection, cross-origin copied code, mobile headers, reduced motion and directory entries.
- Export evidence: 960 × 540 H.264 gallery loop, 30 FPS, 140 frames / 4.667 s; square PNGs and 320 × 320 GIF/H.264, 15 FPS, 15 frames / 1 s. FFmpeg frame inspection confirms the silver silhouette remains stationary as the reflection travels.
- The native composition declares 31 AI parameter paths after the 2026-10-28 editor alignment. The emitted edited-state Manifest passes the published JSON Schema. Text, font, canvas, material, colors, spacing, timing and background source/crop/trim remain in the composition; asset indexes are generated from live state.
- Desktop preview and 320/390 px mobile headers, inspector scrolling, both editor themes/languages, and the actual component demo are checked in Chromium. Reduced motion pauses on readable lettering rather than a blank opening frame.

## Source attribution

The animation is an independent reconstruction from the public recording. Librestile is by ocelothe2k1, licensed under SIL OFL 1.1. The unmodified font, renamed square derivative and license live under `site/assets/fonts/librestile/`.

## 2026-10-28: alignment with Sprout Shift and website release

- Compared the running Sprout Shift editor and its shared editor contracts. Kept the native single-scene model and metal choreography; adopted left content navigation, right text/font/background disclosures, a background-color summary swatch, exact numeric editing, position/alignment, visible history actions and the same canvas presets.
- Background media uses the existing Morph Ports serializable shape (`url`, `name`, `fileType`, `videoStart`, `videoEnd`, `cropX`, `cropY`, `cropZoom`). A reusable scene runtime loads media, selects GIF frames through `CellMotionAnimatedImage`, seeks trimmed video, and composes the same crop for preview/export/player. Native objects stay outside saved state.
- Image/GIF/video upload, replacement and removal, crop drag/keyboard adjustment, zoom reset, video filmstrip/drag handles and precise start/end fields are available inside the scene's background disclosure. Single-scene media does not add meaningless page-transition controls.
- Stage fill follows the scene color or an independent saved editor color; its preference changes neither composition nor exports. Import and background replacement pause on readable lettering. Gallery entry opens the approved default; ordinary refresh resumes the autosave.
- `tests/metallic-backgrounds-browser.cjs` verifies image crop, canonical 120/400/180 ms GIF delays, a synthetic three-color video's 0.70–2.40 s trim and wrap, scheme save/import/reload, actual GIF/MP4 downloads, live player media update/pixel parity, mobile layout and a clean console. Synthetic fixtures are under `tests/fixtures/metallic-backgrounds/`.
- Real video-background export: 320 × 320, H.264, 15 FPS, 33 frames / 2.20 s. FFmpeg frames confirm the selected green/blue interval and the return to the trimmed start. The animated-background GIF was also exported and inspected.
- The approved preset, poster and gallery MP4 bytes are unchanged. The default 960 × 540 frame at 2.10 s has zero pixel difference from the approved poster. Optional layout/background fields migrate without changing the immutable default JSON.
- Font CSS is loaded before editor initialization to prevent a cold-load fallback font from being cached into the metal mask. Fonts with italic style retain that style during loading.

## 2026-10-28: AVATR spacing correction

- The reported AVATR frame exposed loose diagonal pairs beside a tight TR pair. The renderer drew isolated graphemes, and Chromium ignored the source font's legacy `kern` table even with normal kerning enabled. Native AV measured the same as isolated A + V despite the source's -351/1000 em adjustment.
- The square-font build preserves all 2,039 source kerning pairs in a browser-readable GPOS feature. The renderer now shapes the complete text with native kerning and Canvas letter spacing, retaining the editable tracking value and the single preview/export/player renderer. No glyph contours, material animation, default scheme or gallery media were replaced.
- `tests/metallic-spacing-browser.cjs` first failed on the missing AV kerning. It now checks AVATR at two tracking values, Inter AVATAR and Chinese against native text silhouettes, allowing one pixel for Canvas/shader edge rasterization. The AV adjustment at 216 px is -75.816 px; Latin silhouette differences beyond the edge tolerance are zero.
- The background/export/player regression suite passes. The approved default frame differs by at most one channel value in nine channel samples out of 2,073,600 (mean 0.00000434), while the approved preset, poster and MP4 bytes remain unchanged.

## 2026-11-04: steady opening, multiline layout and optional laser writing

- Requested contract: remove the initial whole-word flash, accept manual line breaks, and offer a technological per-letter laser entrance. Default text is fully visible at time zero without opacity or scale animation. The previous `intro` field remains readable in old schemes but no longer adds a fade or delay. Default reflection/hold duration is 4.2 seconds.
- Manual LF/CRLF breaks preserve empty lines; all lines share one fitted font scale. Line spacing defaults to 1.35 times glyph height, with left/center/right alignment applied per line. Each line is shaped as a complete string so the corrected AVATR kerning remains intact. Metal shading and bevel height repeat per line.
- Optional `revealMode: laser` writes visible graphemes left to right, then top to bottom. A narrow cool highlight follows the scan front and resolves to the same complete metal mask. Spaces and breaks consume no writing slots. `writeDuration` is the total writing interval (default 2.4 seconds); the reflection sweep follows it. Replay, pause-to-edit, reduced motion, exports and the AI bridge use this same clock.
- Contour and writing-time textures are cached on layout changes. Frames update shader uniforms rather than recomputing glyph contours. Startup waits for the font and background before displaying text; unchanged canvas dimensions no longer clear the preview during control synchronization.
- Regression coverage: stable first-frame silhouette, two-line laser order and final geometry, Chinese/blank lines/alignment, autosave, real PNG/GIF/H.264 exports, live AI pixel parity at five times, narrow mobile layout and reduced motion. The existing spacing, background and editor suites remain part of validation. AI exposes 33 parameters including the new layout/reveal settings.
- Validation passed: laser, spacing, background and complete editor/cross-origin player suites; syntax, shared/editor contracts and the 93-entry website catalog. The inspected laser MP4 is 320 × 320, H.264, 15 FPS, 99 frames / 6.6 seconds. The replacement default gallery loop is 960 × 540, H.264, 30 FPS, 126 frames / 4.2 seconds, with complete lettering in its first frame. The approved preset and poster bytes remain unchanged.

## 2026-11-04: follow letter strokes and align multiline ink

- Updated motion contract: the optional laser must travel along the strokes of each glyph, including curves and reversals, rather than expose a vertical slice from left to right. The letter sequence, total writing duration, stationary final lettering, default immediate appearance, and subsequent reflection/hold remain fixed. UI now calls the option “沿笔画镭射 / Stroke-following laser”; saved `revealMode: laser` values remain compatible.
- The supplied B2/W screenshot shows different horizontal centres. Plain B2/W with default settings was already centred; leading/trailing whitespace reproduces the drift because line widths previously included invisible advances. Multiline alignment and fitting now use visible ink bounds and compensate each line's side bearing. Surrounding spaces remain in the saved text. The single-line default and its approved preset/poster/gallery video are unchanged.
- For the writing field, derive a thinned centreline from each rendered glyph, remove short cap spurs, traverse connected stroke segments, and extend their ordered times across the stroke width with a moving round pen. The light head follows those times. A top-left start preference and continuous branch traversal give U its down/round/up motion and 2 its curve/return/base motion. This is geometric tracing for the selected font, not a database of handwriting or language-specific stroke order.
- Per-letter masks use shaped prefix advances, including native pair kerning. They prevent overlapping letter bounding boxes (such as AV) from exposing pieces of the next character. The final silhouette still comes from the native whole-line mask. Centreline and time-field construction happen only on layout/reveal-mode changes; frames retain the existing cached WebGL shading path.
- `tests/metallic-strokes-browser.cjs` first failed on whitespace alignment. It now verifies left/centre/right visible bounds across Square/Inter/Chinese fonts, U's downward then upward reveal, 2's upper curve before the lower stroke, no V pixels during the first A, and complete native silhouettes for Latin/Chinese/Japanese/Korean. The laser suite exercises actual exports, five edited-state AI frame comparisons, saved settings, narrow mobile widths, and reduced motion; spacing and background suites verify existing kerning and frozen default/media behavior.
- Export inspection uses the real 320 × 320 H.264 file at 15 FPS (99 frames / 6.6 seconds), with dense frames over the writing interval. Additional B, 2, W, AVATR and B2/W frame sheets exercise rounded branches and diagonal turns. AI descriptor 1.2.0 and both prompt languages describe the stroke-following behavior without adding parameters.

## 2026-11-05: retain both laser reveal styles

- User requested retaining the earlier per-letter reveal alongside stroke writing. The selector now has `none` (直接呈现), `scan` (逐字镭射, the original horizontal scan within each letter), and `laser` (沿笔画镭射). Existing stroke-writing schemes keep their `laser` value; no saved stroke mode is silently changed. Both animated modes share the existing total writing duration, three-phase timeline, speed, reduced-motion hold and export clock.
- Restored the original prefix-based scan cells, reveal softness and broad laser head; stroke geometry and its narrower light head are unchanged. Multiline visible-ink alignment remains shared by all modes. Descriptor 1.3.0 and both AI prompt languages distinguish the three enum values without increasing the 33-parameter count.
- The export/AI suite accepts a mode argument and passes for both `scan` and `laser`, covering the mode selector, timing-control visibility, two/three timeline phases, reload, live Manifest enum/state, five player/editor pixel comparisons, PNG/GIF/MP4, mobile and reduced motion. Stroke regression also distinguishes U's complete-height horizontal scan from its down/round/up stroke reveal.
- Historical comparison: 24 frames across OK, AVATR, B2 and U against the original scan renderer have identical alpha masks; one color-channel sample differs by one 8-bit level. All 24 stroke frames match the previously published stroke renderer exactly. Syntax, shared editor and 93-entry website checks pass. Default scheme and gallery media remain unchanged.

## 2026-11-05: reveal and reflection play concurrently

- Requested contract: the light band moves while lettering appears. Both `scan` and `laser` now start reflection and writing at absolute time zero; the writing mask, scan/stroke paths, colors and direction remain unchanged. Each channel finishes at its own configured duration and holds its final state. Hold begins at `max(enabled writeDuration, sweep)`, so cycle duration is `(max(enabled writeDuration, sweep) + hold) / speed`. The default animated configuration is 4.2 seconds instead of 6.6 seconds. Immediate mode and its approved gallery artifacts are unchanged.
- The same core duration drives the editor, scrubber, export wrap and AI bridge. Pause-to-edit seeks to a fully visible frame without adding the old sweep offset. Timing-field edits and phase clicks seek within the actual interval. Writing and sweep occupy separate aligned timeline lanes starting at zero, with violet/sky semantic colors and a final amber hold spanning both lanes; their active outlines can be on simultaneously.
- `tests/metallic-overlap-browser.cjs` first failed because the already-revealed first O stayed static while later letters were writing. It now observes reflection changes on that same glyph during writing, in both reveal modes and both sweep directions. At writing completion, its pixels match immediate text at the same absolute time exactly. It also verifies parallel starts, hold timing for either channel being longer, speed, zero hold, seek, numeric controls and narrow mobile layout.
- Descriptor 1.4.0 and bilingual AI prompts explicitly describe overlap and the max-duration formula. Existing scheme fields and the 33 parameters are retained.
- Both reveal modes pass the real PNG/GIF/MP4, saved-state, edited AI player pixel-parity, mobile and reduced-motion suite. The exported H.264 videos are 320 × 320, 15 FPS, 63 frames / 4.2 seconds; dense writing-interval frames show the reflection moving on completed letters while later letters continue writing. Stroke/spacing/multiline regression, syntax, shared editor and the 93-entry website check pass.
