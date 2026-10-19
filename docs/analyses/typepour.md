# Effect analysis: Type Pour / 字体倒水

## Source material
- Six PNG screenshots in E:/360MoveData/Users/Administrator/Desktop/字体倒水, filenames ending 484_4 through 489_4.
- Inspected all six on 2026-10-13. No video/audio supplied; timestamps below are authored prototype timing, not measured evidence. FFprobe/Watch source-video sampling is not applicable.
- Reference 487_4 and 489_4: white ground, transparent tumbler, irregular black serif glyph stream entering the cup; 488_4: a line breaks into scattered letters; 484_4: blue selection squares interspersed with black glyphs.
- User explicitly wants blue squares as visible content and continuous water-like motion, including before the cup fills.

## Target
Black letters and blue squares pour as one fluid stream into a clear glass, spread, circulate and fill it, then settle with residual waves.

## Phase table
| Authored time | Phase | Evidence | Interpretation | Confidence |
| --- | --- | --- | --- | --- |
| 0–0.45 s | Empty glass | Glass and white ground in stills | Establish composition before emission | Authored |
| 0.45–1.65 s | Pour begins | Loose glyph stream above cup | Gravity accelerates a mixed stream from upper left | High shape, unverified rhythm |
| 1.65–7.2 s | Spread and fill | Dense glyphs at base, sparse stream above | Shared density pressure and viscosity spread particles against cup walls; fill and circulation overlap | User requirement |
| 7.2–8.3 s | Last drops | Not shown in stills | Emission stops; in-flight particles continue into current fluid state | Authored |
| 8.3–12 s | Settle | Not shown in stills | Surface waves and internal circulation decay without resetting positions | Authored |

## Motion contract
- Glyphs and squares belong to one liquid; visual identity never changes at impact.
- Gravity-driven upper-left entry, continuous acceleration, no teleport into final slots.
- Cup wall and floor constraints; pressure keeps particles from stacking as a rigid granular heap.
- Inflow, spreading, recirculation and level rise overlap. Stop emission without restarting accumulated fluid.
- Rotation follows local velocity changes with damping. No static afterimage.
- Deterministic fixed-step simulation with cached frames; preview, scrub and exports use the same snapshots.
- Composition in a 900×1000 logical coordinate system, fitted into actual output bounds. No viewport-dependent geometry.
- Transparent glass back, fluid, glass highlights/front lip/base. No raster screenshot cutouts or copied UI.

## Reuse plan
- Shared STGFontLibrary and local fonts, GIF and H.264 encoders.
- New isolated fluid simulation and canvas renderer; independent prototype page first, per user staging request.
- Editor/gallery integration remains a later stage after motion validation; no changes to shared gallery/navigation in this prototype.

## Uncertainties
- All sources are stills: no observable original speed, easing or liquid dynamics.
- Blue squares appear to be Illustrator selection handles; they are deliberately promoted to visible particles at user request.
- Exact emission origin is not specified: default upper-left offscreen stream without invented face or mouth.
- Proportion/size of squares and final fill level require visual review.
- Prototype glass is drawn procedurally, not an extracted photo.

## Acceptance evidence
Validated 2026-10-13 in bundled Chromium, using the final 1,360-particle simulation.

- All six source stills inspected; no source motion/rhythm claim is made.
- Key frames inspected at 1.7, 3, 5, 7.5, 10 and 12 s. Airborne pressure was disabled after the first render showed an overly scattered stream. The continuous falling jet, spreading pool and existing settled state now remain connected.
- Numerical checks: all positions finite, no final cup-wall/floor penetration, no final overflow, lateral impact spread >220 logical pixels, exact deterministic replay to 3 s. Maximum displacement between cached 60 FPS frames: 19.49 px. Mean particle movement during the final 2 s: 8.16 px (residual settling).
- Desktop 1440×1080 and mobile 390×844 checked. Mobile has no horizontal overflow; controls remain accessible below the stage. This standalone prototype has no editor inspector to scroll.
- Pause produces zero clock drift; normal playback advances 0.80 s over 0.80 s; replay and scrubbing work.
- Chinese input and shared Chinese serif, Latin, Japanese and Korean fonts tested; actual PNG exports generated for each. Square and portrait proportions checked.
- Real PNG: 900×1000 at 6 s; Chinese portrait PNG: 540×960 via the visible download button.
- Real GIF: 450×500, 240 frames, 12 s. Real H.264 MP4: 720×800, 30 FPS, 12 s. Square MP4: 540×540, 3 s via the visible export button.
- MP4 decoded again in browser: dimensions and duration correct; normal-speed playback advances 1.601 s in 1.601 wall seconds. Decoded 6 s frame inspected; mean RGB channel difference from scaled PNG is 2.41 / 255.
- No page errors or browser error messages during these tests.
- Local evidence is under output/playwright/typepour/ (ignored by Git). Preview command: node scripts/preview-typepour.cjs; localhost port 4179. Behavioral check: node scripts/check-typepour.cjs.
- No formal gallery/editor registration yet: this delivery is the motion-validation prototype requested before editor integration.

## Implementation limits
- The fluid is a stylized 2D particle liquid with density pressure, damping and glass collision boundaries, not a 3D optical water simulation.
- Timing and final fill level are authored because the supplied references are stills.
- Current controls cover text/font, square ratio, glyph size, playback, composition ratio and export. Full shared-editor media, schemes and choreography controls belong to the integration stage.
- The first preview prepares a deterministic frame cache in a worker. Reloading recomputes it; changing text or visual styling reuses it.


## 2026-10-13 refinement: visible source and glass
- User accepted the first liquid result; freeze the simulation, in-cup paths, pressure, fill timing and settling. Frozen fluid SHA-256: e175fc1a50526c43f18826c388dd962df35e04dfa12ae775285af43caf0e30b8.
- Disputed items only: missing readable horizontal source line on the upper left; glass too diagrammatic compared with supplied photographic tumbler.
- Required: an extended readable text line remains visible while glyphs feed rightward and bend continuously downward into the existing stream. The source remains legible at start; no floating disconnected label.
- Glass: dark/bright Fresnel edge pairs, substantial refractive base, asymmetric studio highlights, clear interior and elliptical rim; preserve fluid visibility.
- No editor integration in this refinement.

### Refinement result and evidence
- Added a measured, repeating grapheme line on the left, visible from t=0; it advances at 92 logical px/s during the existing pour window (0.45–7.2 s). Its end bends into the airborne stream. It stops with the already accepted end-of-emission event; the pool continues settling.
- Upper approach is blended back to the unchanged particle pose by y=260, well above the y=450 cup rim. The whole composition is translated right by 110 logical pixels to make room for the visible source.
- Replaced the diagrammatic cup with the generated transparent clear-tumbler-v2.png shell; split back/body, front edges, near rim and thick base. Shared geometry still fixes the interior floor at y=865. Subtle copies of moving edge particles provide local refraction.
- Frozen fluid SHA-256 still exactly matches. No simulation, fill timing or settling changes.
- Browser screenshot inspected at 5 s; real MP4 at 720×800 / 12 s decoded at 5 s and inspected. Playback advances 0.806 s in 0.807 wall seconds. Real GIF has 240 frames / 12 s at 450×500. PNG is 900×1000. No browser errors. JavaScript syntax and git diff whitespace checks pass.
- New evidence uses output/playwright/typepour-v2/; previous preview assets remain intact. The user's current in-app browser was refreshed and visibly shows the source and the new glass.
- Asset provenance and full final prompt: site/assets/typepour/README.md.

## Refinement 3: sparse letter release and blue square markers
- User rejects details in source/stream and square appearance. New close-ups show readable isolated glyphs after a compact horizontal English line; dense blue axis-aligned selection-style squares overlap/abut black glyphs, instead of replacing glyphs as rotated confetti.
- Change default visible animation copy to English only, including stage caption. Keep Chinese input support available, not as default art.
- Freeze glass asset, geometry, simulated cup filling/settling. Refine airborne visibility/rotation and square rendering only.
- Upper stream is sparse near sentence end, broadens gradually and becomes dense near the cup. Blue squares remain attached to the same glyph flow, near-uniform size, upright; presence must not erase the black letter.

### Refinement 3 verification
- Default artwork is English only. Inspected 1.7, 3, 5 and 7.5 s: readable horizontal source, isolated upper glyphs, gradual stream density and upright blue square markers attached to black glyphs. Each carrier retains a glyph; markers no longer replace text.
- Blue marker default coverage 84%, near-uniform 8.1–8.9 logical px at default glyph size 15; solid #5a80e3. Airborne visibility refines only approach; cup filling and glass remain frozen. Fluid SHA-256 matches the recorded baseline exactly.
- Actual outputs regenerated: PNG 900×1000 at 5 s; GIF 450×500, 240 frames / 12 s; MP4 720×800, 30 FPS / 12 s. Increased MP4 bitrate after decoded output revealed blurred fine letters and glass edges; final decoded 5 s frame inspected and sharp.
- Normal playback checked (0.9078 s motion / 0.9078 s wall time). Desktop and 390×844 mobile stage checked, no horizontal overflow. Browser error list empty. JavaScript syntax and git diff whitespace checks pass.
- Evidence: output/playwright/typepour-v3/. This remains a standalone prototype awaiting the separate editor-integration stage.

## Refinement 4: loose falling stream and an empty source after pouring
- User asks for falling-water spread based on the supplied stills and no source text after the pour ends.
- Keep glass, blue marker style and cup simulation frozen. Airborne glyphs should follow distinct smoothly diverging paths, with no rigid narrow column; preserve connection to the source and to the original cup entry.
- During the final source-length of travel, stop replenishing the line at its left edge. Its trailing end advances into the outlet. At 7.2 s the complete horizontal/bent source is empty; remaining airborne particles finish falling and the pool settles. Do not fade the whole source simultaneously.

### Refinement 4 verification
- Inspected 3, 6.3, 7.2 and 8.5 s frames. The source drains progressively, is empty at 7.2 s, and all remaining airborne glyphs have entered the cup by 8.5 s.
- Isolated source raster checks: 2527 visible pixels at 0 s, 697 at 6 s, exactly zero at 7.2, 8.5 and 12 s. Airborne pose reconnects identically at the cup rim. Frozen fluid hash remains unchanged.
- Generated PNG keyframes, full 12 s GIF (450×500, 240 frames) and MP4 (720×800, 30 FPS). Decoded MP4 at 8.5 s: no nonwhite pixels above the glass. Syntax/whitespace checks pass; the user-facing in-app preview has no errors or warnings. The export inspection harness logged one ERR_FILE_NOT_FOUND after revoking a temporary video Blob URL; the decoded output passed the end-frame check. Evidence: output/playwright/typepour-v4/.

## Pure typography variant
- Added typepour-type-only.html as a separate entry. Original blue-square version stays available; both pages include a two-version navigation. Shared simulation, source draining and glass are unchanged.
- Pure variant starts with zero blue markers and hides the square control. Exports use a typepour-pure filename prefix and the same canvas renderer.
- Verified both defaults independently: pure 0%, original 84%. Pure 900×1000 PNG contains zero saturated blue marker pixels (B-R>70 and B-G>45; slight glass reflections preserved); GIF 450×500 / 240 frames / 12 s and MP4 720×800 / 12 s generated. Desktop preview and mobile 390×844 checked; no horizontal overflow or pure-page browser errors. Syntax/whitespace checks pass. Evidence: output/playwright/typepour-pure/.

## Source height refinement
- User requests more vertical space between the source line and the glass. Raised the source by 70 logical px (baseline 110 → 40); gap to cup rim increases from 340 to 410 px, about 21%. Applied to both variants through their shared source renderer.
- Airborne y positions blend smoothly from the higher outlet back into the same cup rim position. Glass, liquid simulation, square style and source-empty timing are unchanged.
- Desktop and mobile 390×844 visually checked: source stays within canvas with no caption overlap. Exported 900×1000 PNG inspected; source exit and initial drop both meet at y=62, and rim pose remains y=450. Syntax and whitespace checks pass. Evidence: output/playwright/typepour-height/.

## 9:16 portrait composition
- User requests the cup lower and slightly right of center specifically for 9:16. In portrait, cup moves -90 logical px horizontally and +240 vertically; at 1080×1920 its center is x=594 (55% width), rim is about y=1145 and base y=1775 (92.5% height). Source remains in place; airborne letters blend smoothly into relocated cup coordinates.
- Applied to both variants. Front/back glass and refraction layers share the cup transform. Preview and exports derive composition from actual output dimensions.
- Verified 9:10 pure rendering remains pixel-identical to the prior accepted PNG. Exported portrait PNG 1080×1920 and MP4 540×960 / 12 s; decoded 5 s video frame checked for rim connection and unclipped base. Mobile 390×844 has no horizontal overflow. Syntax/whitespace checks pass. Evidence: output/playwright/typepour-portrait/.

## Procedural pouring sound
- User requests code-generated audio matching water pouring into the glass. Freeze all accepted visuals. Synthesize deterministic noise, water bubbles and subtle glass resonances; onset follows first cup impact, ongoing flow follows filling, then trailing droplets stop before the final hold.
- Preview audio must follow pause/seek/replay/speed with no competing loops. Explicit listening control unlocks browser audio, volume is adjustable, and MP4 includes sound by default with an opt-out. Reuse the same synthesized PCM for preview, WAV and AAC export.

### Audio verification
- Deterministic 48 kHz mono synthesis, 12 s; peak 0.615 before volume, RMS 0.103. No samples before contact at 1.45 s or during final hold after 10 s. WAV short clips end at zero. Behavioral check: node scripts/check-typepour-audio.cjs.
- Browser tests: explicit listening starts AudioContext; pause stops source; seeking to 5 s resumes audio at 5 s; speed 1.5× updates audio rate; replay resets to zero. Fixed negative first-frame elapsed time by clamping frame delta to zero before starting audio. No page errors during retest.
- Real MP4 exported at 540×960 / 30 FPS, decoded duration 12.0107 s (AAC packet padding). Decoded AAC is mono 48 kHz; lead and final-hold RMS zero, pouring RMS 0.0898. WAV generated. Visual 9:10 pure output remains pixel-identical to the previous accepted frame. Mobile sound controls fit without overflow.
- Preview sound requires pressing the listening button because browsers require an audio gesture. MP4 sound is independently enabled by default; PNG/GIF remain silent formats. Volume applies equally to preview and audio export. No microphone, recorded samples, remote audio, or upload endpoint.
- Browser video/audio muxing uses locally vendored Mediabunny 1.61.4 (MPL-2.0), with upstream integrity verified and license/source references in site/js/licenses/. Docs: https://mediabunny.dev/guide/writing-media-files and https://mediabunny.dev/guide/media-sources .
- Evidence: output/playwright/typepour-sound/.


## 2026-10-14 — CellMotion official editor release

The user approved the prototype and explicitly requested the latest editor UI, For AI, replaceable backgrounds, a 9:16 composition preview and official website release. The native liquid simulation, source drain, glass layers and portrait placement are frozen. No reference video was introduced in this integration; previous still-image analysis remains the motion evidence.

### Phase mapping

| Phase | Default output time | Canonical simulation | Editable |
| --- | --- | --- | --- |
| Lead hold | 0–0.45 s | 0–0.45 s | 0–3 s |
| Continuous pour + source drain | 0.45–7.20 s | 0.45–7.20 s | 2–15 s |
| Last drops and settling | 7.20–9.30 s | 7.20–9.30 s | 0.5–6 s |
| Final hold | 9.30–12.00 s | 9.30–12.00 s | 0–8 s |

Phase edits remap the same cached 60 FPS physics and procedural Foley. Preview, seek, AI embed, PNG, GIF and MP4 use typepour-runtime.js. The approved prototype remains available as the regression reference. Default 1080×1920 output at t=5 was compared as a PNG data URL: byte-identical. Physics file SHA256 remains e175fc1a50526c43f18826c388dd962df35e04dfa12ae775285af43caf0e30b8.

### Editor / interoperability

- Reuses Type Cascade workspace and polish styles, shared fonts, STGIconLibrary, TokenAssetTools, CellMotionAnimatedImage and the shared AI menu/manifest/player/bridge.
- Native one-source composition with two visual variants. It does not replace liquid motion with a row-morph engine. Uploaded backgrounds belong to the entire composition; inserted images/icons belong to the source stream.
- Serializable schema preserves unknown fields. Scheme save downloads JSON and autosaves locally; import, immutable reset, clear, undo and redo are independent. Theme/language do not modify the scheme.
- GIF backgrounds use shared frame decoding. Video exports await exact trimmed timestamps before drawing. Preview uses asynchronous muted video seeks; very large media can preview less smoothly than exported frames.
- MP4 with Foley requires browser AAC/AVC encoding. The existing silent H.264 fallback remains available via the audio export checkbox. Audio starts only after a user gesture in the editor; AI embeds default to silent playback.
- Static/dynamic library assets are cached separately from serialized configuration. Selection and insertion are separate. The asset drawer occupies the inspector rather than the stage.

### Verification and evidence

- scripts/check-typepour-editor.cjs: approved portrait pixel equality, 121 font options, Chinese input, both variants, undo/redo, unknown-field preservation, immutable reset, clear/rebuild, selection-before-insertion, 390×844 mobile without overflow, real cellmotion-player configuration/seek/update and script-like text escaping. No page errors.
- Shared editor and GIF ownership contract checks passed. Website catalog check: 76 entries, 44 ready / 32 pending, 252 file references.
- Background PNG uploaded and exported; two-frame red/blue GIF verified at t=0 and 0.7. Video trim changed to 2–4 seconds and a real 3-second 270×480, 24 FPS MP4 was generated.
- Real complete 12-second exports: PNG (current t=5), GIF 270×480 / 180 frames / 12,000 ms, MP4 270×480 / 15 FPS / 12.010667 s (AAC padding). Decoded audio has silent lead/end and pour RMS ≈0.0896. Original codec sample rate is 48 kHz; browser decode may resample to its context rate.
- Local evidence: output/playwright/typepour-editor/ (ignored generated artifacts).
- Website media: final_typepour.png (1600×900), poster-typepour.jpg, typepour-card.mp4 (960×540 / 12 s), assets/typepour/portrait-preview.png (1080×1920). Artwork contains English only. The landscape cover presents the approved 9:16 artwork alongside the pure type variant.

### Remaining interpretation limits

The water is a deterministic 2D visual simulation, not a physical 3D fluid. Glass highlights are layered from the approved transparent asset. The procedural water Foley is synthesized, not a recorded pour. The single source has composition-level background ownership; multi-page sequencing is not part of this effect.

### Published startup check

The site is available at https://cellmotion.cn/typepour.html. GitHub Pages currently redirects its repository URL to HTTP; direct HTTPS preserves secure browser media APIs. English default text no longer preloads the large Chinese fallback font; it is loaded when non-Latin text is edited. A trial WebP conversion changed browser pixels and was discarded: the approved PNG glass is retained. The complete editor regression, including exact PNG hash comparison and Chinese input, passed after the font loading change.


## Full-cup containment correction — 2026-10-14

- Report: small glyph/blue-marker fragments extended beyond the glass when filled. The simulation bounded particle centers, but rotated glyphs and attached markers have a larger painted footprint.
- Motion contract: preserve source drain, flight paths, particle simulation, fill level, timing, cup placement, audio, and approved gallery artifacts. Only confine painted liquid to the photographed inner walls and curved floor; the top remains open for the incoming stream.
- Added a shared glass clipping path to the editor and both prototype variants, including the wall-refraction passes. The same path is used by preview and all exports; cup offsets and mirrored direction remain supported.
- Pixel regression: 60 combinations of full/partial phases (4, 7.2, 8.5, 10, 12 s), pure/blue variants, 15/28 px type, and 900×1000 / 540×960 / 960×540 outputs; zero out-of-envelope ink pixels. A shifted, mirrored cup also passed. Disabling the correction reproduces 8,147 out-of-envelope pixels at 10 s, confirming the check detects the reported bug. The airborne source region stays pixel-identical.
- Full editor regression passed (prototype parity, schemes, Chinese, assets, mobile and AI player); browser reported no page errors. Actual PNG, 180-frame / 12-second GIF and 12.010667-second AAC/MP4 exports at 270×480 were inspected at the full-cup frame. Evidence: output/playwright/typepour-containment/.
- Physics/source/audio and approved gallery image/video files are unchanged. This is a rendering boundary fix, not a new choreography or gallery redesign.
