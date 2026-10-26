# Bubble Fluid refinement — 2026-10-25

## Short-text typography correction (2026-10-25)

Both desktop references were rechecked with Watch and contact sheets. The
16.87-second curved-stage clip uses a dense two-row, fourteen-letter lockup;
its letters change contour and position without each letter growing to fill an
arbitrary cell. The 26.57-second phone clip shows rounded, inflated letters
staying individually legible through compression and expansion. Neither video
shows a one-letter or short-row stage composition, so that layout is inferred.

| Evidence | Frozen behavior | Disputed behavior |
| --- | --- | --- |
| Stage clip, 2-4 s and 13-16 s | Keep the measured default lockup, curved screen, and letter motion. | Do not apply its fourteen measured boxes to unrelated text with the same character count. |
| Phone clip, 3-18 s | Keep rounded silhouettes, visible counters, continuous turns, and the existing rhythm. | Preserve each glyph's aspect ratio when a row has fewer characters. |

Current failure: `layoutGlyphs()` divides 95% of the screen width among every
row's characters, including a single character. A one-letter row therefore
receives almost the whole screen width. Size glyphs from row height and glyph
class, center the phrase, and scale width and height together only if the row
would exceed the screen. Preview and export share this layout function.
Letters present in the stage clip use the traced video contours in short text
as well as the default lockup; other Latin letters remain style extrapolations.

## Scope and sources

User goal: continuously flowing, full-screen inflated letters, fluorescent color choices, no central information panel, in the photographed curved-screen stage from the earlier reference.

New source: Desktop `微信视频2026-10-25_003827_453.mp4`; HEVC 592 × 1280, nominal 30 fps, 753 frames, container duration 26.576667 seconds, AAC audio. It shows phone presentations of the same visual identity, followed by a still typographic poster. The phone, people, social controls and information cards are excluded by request. The physical stage comes from the earlier `a6f47c0c4d46a482c6e12eb7bb4fb2ac.mp4`.

## Evidence and motion contract

Watch broad pass: seven chronological frames; rectified phone-screen samples every 0.75 seconds from 1.5 to 18 seconds, followed by a 10 fps inspection from 3.6 to 4.7 seconds. Dense samples show the top letter unfolding before the lower letter finishes turning, with continuous residual movement. Working images remain in ignored `output/liquid-type-reference`.

| Source time | Observation | Applied rule |
| --- | --- | --- |
| 1.5–3 s | Three pink inflated letters occupy the lower region beneath a portrait | Preserve thick, uneven, round silhouettes; exclude portrait |
| 3–5.25 s | Portrait slides upward; letters expand, twist and redistribute vertically | Couple local squash/stretch to position changes; retain counters |
| 5.25–7.5 s | Large letters continue settling and changing shape | Retain residual movement; no rigid stop |
| 8.25–10.5 s | Orange title changes from four readable rows to a compressed group above another portrait | Use the letter compression language without the portrait or empty area |
| 10.5–14.25 s | Individual letters roll and deform inside the packed group | Preserve independent letter identities and staggered soft deformation |
| 14.25–18 s | Group expands as the lower portrait leaves | Keep the entire stage screen occupied throughout the adapted cycle |
| 22 s onward | Static pink-on-dark-green lettering poster | Color and silhouette evidence only |

Interpretation: inflated elastic lettering with viscous easing, rather than a simulated fluid material. The requested combined stage and continuous full-screen choreography are an adaptation of two sources, not a shot present in the second recording.

## Implementation and verification

1. Retain measured stage geometry and letter contours; replace perimeter-frame choreography with three full-screen flowing poses. Verify occupancy at dense time samples and a seamless cycle.
2. Remove information fields and rendering. Add neon pink, yellow, green, cyan, orange and violet; recolor the photographic bounce light while preserving luminance, furniture and shadows. Verify screenshots for each color.
3. Reuse the existing editor, scheme and export systems. Verify arbitrary text, CJK, controls, desktop layout, PNG/GIF/MP4 downloads and a complete gallery export.

The original stage plate is 592 pixels wide. Recoloring preserves photographed texture but is not physical 3D relighting. Unseen alphabet glyphs and intermediate paths remain inferred; there is no claim of exact per-frame or original-font recovery.

`prepare-bubble-fluid-glyphs.py` removes thin segmentation fragments from the earlier measured contours, fills spurious internal seams, and generates smooth silhouettes. Whole letters rotate inside their measured moving boxes before a shared continuous displacement field and local pressure deform the contours. This avoids the spikes observed during direct contour-to-contour morphing. Inner counters stay attached to their letter. Unknown Latin glyphs retain the rounded centerline alphabet; CJK uses the shared font catalog.

The first fluid iteration used a 10.8-second cycle. It was rejected as too mechanical and insufficiently faithful; the measured-motion revision below supersedes its guessed angles and sinusoidal displacement field. There is no perimeter frame, information label, portrait or central panel. Recolored stage plates are cached between color edits; lighting retains the photographed spatial structure. All geometry is rendered through the same curved-screen projection in preview and export.

The fluid version uses `cellmotion-bubble-frame-fluid-v1` autosave, leaving previous stage schemes stored under their existing key. Legacy JSON imports retain compatible text/style/size values; removed information and frame settings are ignored. Restore Default always loads the immutable pink fluid preset.

Checks of the first fluid iteration (historical):

- `tests/bubble-fluid-browser.cjs`: all six colors, arbitrary replacement text, single letter, Chinese, three actual phases, removed information controls, clean browser console and request log.
- Twenty-four evenly spaced renders retain 54.7%–66.4% bright letter coverage inside the LED polygon. This checks absence of an empty-center phase, not source similarity. Time zero and the cycle endpoint are pixel-identical.
- `tests/bubble-frame-browser.cjs`: scheme persistence/save/import/clear, font choices, theme/language, aspect ratios, desktop/mobile layout, actual PNG/GIF/MP4 downloads. Passed with no browser errors.
- Complete gallery MP4: H.264, 640 × 360, 30 fps, 10.8 seconds. An exported frame is decoded for visual inspection. The poster is rendered at 1920 × 1080.
- Shared editor contract, JavaScript syntax, 88-entry catalog and website file-reference checks pass.

The old static matching scores in `bubble-frame.md` describe the superseded frame effect and do not measure this new choreography. Current visual evidence and the six-color contact sheet are in ignored `output/bubble-fluid`.

## Measured-motion and screen-color correction

User feedback: non-green screens were nearly black, and the motion still looked rough. Frozen requirements: the photographed stage, chairs, perspective, editable text and removal of the center panel. Changed items: paired screen colors and letter deformation.

Reinspection covered the first clip from 12.6 to 15.4 seconds at 0.2-second intervals and the second clip from 3 to 17 seconds. The second clip uses a clearly saturated magenta screen behind pink/orange type. In the stage clip, letters change width, counters and mutual spacing during their turns; fitting a rotating static silhouette into a box does not reproduce this.

`scripts/trace-bubble-motion.py` now tracks fourteen labelled letter regions through **49 source samples from 13.0 to 14.6 seconds**. Backward optical flow propagates the manually identified regions from 13.2 seconds. Each frame retains a 128-point outer contour and a 48-point counter, aligned by winding and adjacent-frame correspondence. Small segmentation fragments and impossible counters are removed, and a five-sample temporal filter reduces codec jitter. The generated `site/bubble-frame-motion.js` is vector data, not a source-video playback layer.

Matching letter instances use those measured changing contours directly. Replacement letters inherit the measured positions, scale changes and estimated turns; unseen alphabet shapes remain style approximations. The global sine-wave drift and guessed turn-angle table have been removed. The current cycle is **2 seconds of expansion, 0.6 seconds of settling, and 2.2 seconds of reverse flow**. The reverse section is an adaptation for the requested repeating composition, not a reverse segment present in the recording.

Screen pairs: pink `#ff54dc` / magenta `#861267`; yellow `#f1ff38` / yellow-green `#797914`; green `#17ff9f` / green `#076f45`; cyan `#49edff` / cyan-blue `#126d83`; orange `#ff9c28` / orange-brown `#994516`; violet `#bd80ff` / violet `#6336a1`. Custom foreground colors also derive a colored screen. The screen color remains independently editable. New autosave key `cellmotion-bubble-frame-fluid-v2` migrates existing v1 text and sizing while correcting the old dark palette and motion defaults.

Verification: all six presets are checked for screen brightness and chroma, custom color pairing is checked, and legacy text migration is checked. Dense rendered occupancy remains above 51% with no central information phase; loop endpoints match exactly. Browser controls, Chinese/replacement text, schemes, PNG/GIF/MP4 exports and the website catalog pass. `tests/bubble-motion-comparison.cjs` aligns four rendered checkpoints to the original recording, with the visual comparison in `output/bubble-research/source-motion-comparison.jpg`. These checkpoints test the measured source segment; they do not validate unseen letters or claim whole-video identity.

The final smoothed contour data was exported again and decoded for inspection: 640 × 360 H.264, 30 fps, **144 frames / 4.800000 seconds**. A floating-point rounding error that previously added one extra export frame was corrected. Six-palette evidence is in `output/bubble-research/screen-palettes.jpg` and the decoded export checkpoint is `output/bubble-research/final-export.png`.

## Individual-letter stutter correction

Reported symptom: individual letters repeatedly jump while the composition continues playing. The disputed channels are silhouette topology and continuity between measured samples. Stage geometry, palette pairs, phase durations, source interval and return direction are unchanged.

The deterministic reproduction found two causes:

- Compression bridges closed the upper C's mouth intermittently. The extractor alternated between a long open contour and a short exterior plus a counter; aligning and filtering these incompatible paths made the letter pulse. The old counter appeared and disappeared repeatedly, reaching 1,080 square pixels on the 600 × 320 analysis plane. Similar accidental bridges affected clefts in other open letters.
- Linear interpolation preserved position but changed velocity abruptly at each sample. The renderer's largest one-sided velocity mismatch at a measured knot was 677.74 pixels/second, measured on that same plane with a 10-microsecond finite difference.

The extractor now avoids morphological closing, removes thin compression fragments with a five-pixel opening, and reconnects false counters to the exterior through their thin bridge. The upper C's cut is constrained to the observed upward mouth so an equally thin side wall cannot become the opening. Only O/A retain counters. Catmull–Rom interpolation supplies shared tangents between source samples for both forward and reverse playback.

`tests/bubble-motion-continuity.cjs` failed on the previous data/renderer and passes after the correction. It exercises drawing coordinates at every sample boundary and checks counter topology, mouth concavity and per-letter area changes. Results: no false C counters; minimum upper-C mouth area 1,310.98 square pixels; maximum adjacent-sample letter-area change 6.53% (previously 10.34%); maximum finite-difference velocity mismatch 0.30 pixels/second. These are regression checks, not a measure of overall resemblance to the source.

A separate 120-frame browser timing probe at 1920 × 1080 measured median 3.1 ms, p95 5.1 ms and maximum 18.1 ms for composition drawing on this machine. It does not establish performance on other hardware. Dense source/contour comparisons are saved in `output/bubble-research/jump-before.jpg` and `c-mouth-after.jpg`.

Post-fix verification: the fluid browser suite passes all six palettes, custom color pairing, replacement text, Chinese, single-letter input and scheme migration with no console/request errors. Loop endpoints remain pixel-identical. A new full-cycle MP4 export is H.264, 640 × 360, 30 fps, 144 frames / 4.8 seconds; decoded dense checkpoints from 0.4–1.5 seconds are inspected in `output/bubble-research/continuous-export.jpg`. The editor contract, JavaScript syntax and website references also pass. Motion assets and the gallery preview use cache version `20261025-continuous3`.

## Remove melting edge detail

The user rejected the local contour deformation as resembling melting ice cream. The motion contract now requires stable, inflated complete glyphs: each letter may move, turn, squeeze or stretch as a whole, while its edge, mouth and counter stay attached to the same master. The stage and existing timeline remain in place.

The renderer no longer morphs measured perimeter points. It extracts whole-letter center, width, height and relative turn from the measurements, interpolates those channels continuously, and applies them to fixed masters. `prepare-bubble-fluid-glyphs.py` builds those masters from the starting pose using normalized morphological opening and tapered Fourier smoothing; O bowls/counters use ellipses to remove neighboring segmentation fragments. This deliberately sacrifices local source deformation to meet the clarified visual direction. Unseen letters retain the existing rounded alphabet implementation.

The continuity regression now marks reference items exactly as the editor does and additionally samples 96 times across the complete cycle. It checks that every rendered perimeter point retains the same affine coordinates within its whole letter; local melting or a changing counter would fail this check. The measured maximum local-coordinate deviation is below 1e-8. All six palettes, replacement text, Chinese, a single letter and the seamless loop are checked through the browser. Assets use cache version `20261025-clean4`.

The complete revised MP4 was exported and decoded: H.264, 640 × 360, 144 frames / 4.8 seconds. Its 0.7-second checkpoint is inspected at `output/bubble-research/clean-export.png`. Browser checks, knot continuity and editor/website contract checks pass.

## Restore letter recognition

The user accepted removal of rough/melting detail but could not recognize the resulting letters. The previous masters froze intermediate source poses: an already rotated U could resemble S, and segmentation remnants distorted T. Smooth edges alone did not preserve letter identity.

The generator now produces 36 upright Latin/digit masters from the existing explicit rounded alphabet paths, with open C/U mouths, O counters and recognizable crossbars. This is a readable alphabet approximation, not recovery of the original typeface. Both the default phrase and replacements use the same left-to-right row layout. The old default-only source-slot arrangement is removed; row height is retained when horizontal fitting narrows longer lines. Whole-letter squeeze, drift and turn are smoothly bounded so letters stay recognizable and separated. The stage photograph, palette pairs and 4.8-second timeline remain.

The browser regression checks ordered non-overlapping default slots, all 36 master entries, and actual raster landmarks for O/C/U/H. It also passes single/short/replacement/CJK text, six colors, migration and exact loop endpoints without browser errors. The drawing continuity regression passes and local deformation remains below 1e-8. The complete MP4 is exported again; decoded frames spanning all phases are inspected in `output/bubble-research/readable-export.jpg`. Editor/website contracts and syntax pass. Runtime and gallery assets use `20261025-readable5`.

## Restore reference packing and letter turns

The readable-row revision was rejected: conventional rows discarded the original typography's identity and choreography. Reinspection at 2.4, 12.6, 13.0, 13.2, 13.8, 14.4, 14.8 and 15.6 seconds confirms a tall left T spanning rows, a small O nested under its arm, unequal letter sizes, and independently rotating right-hand letters. The second recording also shows letters filling each other's space while turning. Evidence: `output/bubble-research/reinspect-packing.jpg` and `phone-motion.jpg`.

The revised contract keeps smooth complete letters and clear counters, restores asymmetric interlocking slots, and restores the observed quarter-turns of U/C/A/T rather than clamping rotation to eight degrees. Clean display variants come from the original readable 2.4-second pose, with a complete rounded replacement alphabet. `fit-bubble-poses.py` fits whole-letter orientation to each of the 49 measured masks and regularizes the angle trajectory; `bubble-frame-poses.js` stores those small pose records. The renderer fits whole masters to the measured boxes without morphing their edges. It starts in the readable packed pose, then turns into the measured full-letter segment and returns. This opening-to-measured transition and reverse are adaptations; neither is claimed as an exact source sequence.

Angles and sizes are interpolated before constructing the affine transforms, avoiding collapse when a letter turns toward 180 degrees. Matching two-row, fourteen-letter replacement phrases inherit the same packing; short text keeps its own centered composition. The regression checks cross-row occupancy and the small nested O, replacement packing, continuous drawing velocity, exact loop endpoints and absence of local edge deformation. All six palettes, text edits, single/short/CJK input and raster opening/counter checks pass without browser errors. Cache version: `20261025-packing6`.

## Keep interlocking letters separate

The user supplied a green-stage screenshot showing merged strokes. Rasterizing each letter separately reproduced the failure: default A/T overlap reached 46.8% of the smaller letter, with another T/O pair also colliding during the turn. Independently fitting each letter into a measured box did not reserve room for its neighbor during intermediate rotations.

`fit-bubble-clearance.py` now captures the actual renderer's default paths, fits small whole-letter position/scale allowances against neighboring silhouettes at 49 progress samples, and smooths those allowances in time. It penalizes movement and shrinkage to preserve the asymmetric packing, and reserves a small contour gap. `bubble-frame-clearance.js` supplies the deterministic correction track to the same preview/export renderer. There is no edge warping or overlap masking. The fitting script captures geometry directly through a Node VM and does not depend on a manually saved diagnostic artifact.

`tests/bubble-letter-spacing.cjs` rasterizes individual default letters at 72 evenly spaced playback times over the complete forward/hold/reverse cycle. The maximum measured body overlap is now zero at the test's 360 × 192 resolution. This verifies the default phrase and controls, not every replacement phrase or extreme deformation setting. The fluid browser suite passes all six colors, replacement and CJK text, loop equality and editor state checks. Default bright-letter occupancy remains 47.8%–56.3% of the screen. Runtime/gallery cache version: `20261025-spacing7`.

## CellMotion UI and release — 2026-10-26

The effect now uses the shared rounded-select adapter, compact type/background disclosures, a swatch in the collapsed background summary, a complete pause-to-edit toolbar, keyboard-operable phase blocks and stored theme/language preferences. Background video has a separately decoded eight-frame filmstrip beside its existing trim values. UI controls synchronize without changing the renderer or motion parameters. Gallery entry explicitly loads the immutable default; an ordinary editor refresh continues to restore the working autosave.

The homepage recent list places Bubble Fluid first with the 2026-10-26 release date. Both editor-directory and legacy-gallery links use the versioned gallery entry route. Catalog status is ready in the typography category; site/catalog cache versions are updated together.

`tests/bubble-release-ui.cjs` checks actual rounded-menu selection, landscape/portrait/square sizing, both themes/languages, preference reload, unchanged composition pixels through theme/language changes, dropdown Escape, background swatch synchronization, real MP4 upload and eight-frame filmstrip decoding, trim/removal, keyboard phase seeking, three distinct phase fills, mobile width and ready/recent catalog status. It passes with no console or request errors. `tests/bubble-frame-browser.cjs` additionally passes text edits, scheme save/import/reset/clear/reload, Latin/CJK font selection and real PNG/GIF/MP4 downloads. Structural editor, syntax, catalog and website-reference checks pass. UI evidence: `output/bubble-release/desktop-dark.png`, `desktop-light.png`, `mobile.png`.
