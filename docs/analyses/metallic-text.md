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
