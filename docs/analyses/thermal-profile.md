# Effect analysis: 热感 / Thermal Profile

## Source material
- Local source: 热感/微信视频2026-10-14_142240_400.mp4; original preserved, not committed.
- 3.000 s video, 30 fps, 90 frames, 888 × 1920 HEVC; AAC audio.
- Actual artwork crop approximately x=0 y=626 w=888 h=502 (16:9); surrounding phone/social UI excluded.
- Portrait: 微信图片_20261014142450_529_4.png, three-quarter face toward left, white background.
- 2026-10-14: Watch 6 chronological frames; FFmpeg 10 fps contact sheet across all 3 seconds.

## Target
User portrait reduced to a soft silhouette, warm/cool thermal color fields flowing through it, optional centered hely.fun type.

## Phase table
| Time | Frames | Phase | Observation | Interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0–1.2s | 0–35 | Warm silhouette / player pause | Peach-to-violet background, magenta crown, pale gold neck. Player pause icon changes. | Do not reproduce player pause as choreography. | high |
| 1.2–1.9s | 36–56 | Heat drift | Gold patch crosses forehead; neck turns pink, soft silhouette persists. | Continuous independent color fields; small silhouette drift. | high |
| 1.9–2.4s | 57–71 | Type reveal | Small line appears near center; right side faint, left becomes pale. | Opacity plus progressive color reveal, no bounce. | medium |
| 2.4–3s | 72–89 | Cool field | Violet crown, magenta body, background warms from below. Type remains. | Continuous palette travel and residual movement. | high |

## Motion contract
One persistent portrait mask; no eyes, nose shading, skin or shirt texture. Nose/jaw/hair/shoulder perimeter comes from supplied photo. Default preserves original facing left (reference faces right); flip is editable. Silhouette bottom extends beyond canvas. Heat and background move continuously. Text stays at center with a gentle reveal and white scan. No hard cut. A 6s periodic return is an authored extension because source contains only the opening of a 29s piece.

## Reuse
Shared ME editor shell/classes, font catalog, stgMediaCreateAsset + connected-background mask and resource keys; bundled GIF/H.264 encoders. One deterministic canvas renderer for preview/export. Icons and multi-page controls do not apply to this single silhouette composition.

## Geometry and controls
Stage-based exact output ratio, default 1920×1080. Editable portrait size/X/Y/facing/softness, hot/magenta/cool colors, text size/tracking/X/Y/font/color/toggle, phase timing, speed, export duration/FPS. Scheme includes serializable shared media asset fields; no original image detail is painted.

## Uncertainties
- Source is a short screen recording with a pause, not the full 29s source animation.
- Exact heat field/easing is inferred; silhouette is stable with slight drift, no evidence sufficient to reconstruct a 3D head turn from one photo.
- Final source phrase is clipped; user replacement hely.fun is authoritative.

## Validation
Pending implementation/export/browser checks.

## Verification 2026-10-14
- Chrome: live desktop centered at x456 within 420px inspector; PNG 1920×1080, deterministic H.264 MP4 960×540 6s/30fps and GIF 480×270 6s/15fps actually generated.
- Browser console clean; portrait Chinese and 390px mobile checked.
- Static generic editor checker reports candidate-library/drawer controls absent: this version has one replaceable portrait and no icon candidate library. Per-portrait size/position are inline controls. Full canonical drawer interaction is not claimed.

## 2026-10-14 contour refinement
User requested a clearer outline. Freeze heat-field paths, portrait geometry, all timing and type reveal. Reduce default edge blur from 1.6% to 0.4% of canvas height; add modest portrait-only saturation (1.16) and contrast (1.06). Source RGB remains excluded.

## 2026-10-14 editable per-character reveal
User requested replaceable text with per-character motion. Freeze portrait contour, heat fields and existing phase boundaries. Each grapheme now fades and rises 0.5em with stagger; last character finishes exactly at the reveal-phase end for arbitrary lengths. Text edits (including completed IME input) replay the text phase; a dedicated replay button is provided. Shared renderer preserves export parity.

Validation: current 4:5 IAB preview retained, Chinese replacement 热感流动 verified at the middle of the reveal (only leading characters visible), restored hely.fun and replayed. PNG 1080×1350 generated through real UI. JavaScript syntax and diff whitespace checks passed.

## 2026-10-14 HD material refinement
User found the finish too hazy. Preserve mask geometry, thermal trajectories and all per-character choreography. Use native portrait mask resolution (1448px high for supplied asset, capped at 2048), minimum 2× preview raster resolution, 0.05% default edge feather, high-quality resampling. Separate lighter pastel background from deeper violet/magenta foreground and tighten color-field shoulders. No source facial detail reintroduced.

HD validation: current 4:5 composition retained; live IAB render inspected at 3.8s with legible small text, detailed perimeter and no facial RGB. Working scheme softness set to 0.05%.
- Real H.264 MP4 1080×1350 generated successfully through current UI; console errors empty. Playback resumed.

## 2026-10-14 larger editable type
User approved the HD finish and requested 2–3× larger type. Freeze the portrait, palette and motion; raise default font size from 5.3% to 13.3% (2.51×), extend the existing editable size range to 1–40%. Keep text replacement, grapheme stagger and full-line fit behavior.

## 2026-10-14 local general image silhouettes
- PNG/JPEG/WebP/AVIF/GIF/BMP/SVG uploads share the existing stgMedia resource model. Images remain local; no model weights, inference or remote segmentation requests.
- Automatic alpha preservation, dominant border-color flood removal (white/dark/colored backgrounds), dark/light logo thresholds. Internal same-color regions can be protected.
- Complex backgrounds: manual polygon, erase/restore strokes, background color picker, 100/200/400% edit zoom, undo repair/reset extraction. Masks/strokes/settings serialize with source media and survive scheme import.
- New uploads fit complete extracted bounds at center; original portrait retains half-body composition. Native alpha up to 4096px; smooth thermal field evaluated separately at up to 768px, then native alpha composited at render dimensions. This retains detailed edges without recomputing large gradient fields. No invented detail beyond input resolution.
- Six browser tests pass: semitransparent alpha and holes, white object on dark background, interior protection toggle, logo negative space, polygon + erase/restore JSON roundtrip, native landscape resolution. Test fixture: tests/thermal-mask.browser.html.
- Real UI: uploaded a 1600×1600 white product on dark blue background; automatic foreground extraction and centered complete product verified.

- 任意图片补充验证：浏览器 6 项遮罩回归全部通过（透明半透明、深底白物、内部同色保护、Logo 镂空、圈选/笔刷及序列化、宽幅原生分辨率）。通过真实上传控件载入 1600×1600 产品 SVG，完整居中并生成 1080×1080 PNG 与 MP4，控制台无错误。

## 2026-10-14 halo refinement contract
Original crop re-inspected at 0 / 0.5 / 1 / 1.5 / 2 / 2.5 s. Broad elliptical warm/cool regions blend through the silhouette; no hard round highlight plateau. Slight colored diffusion outside the contour, warm cream highlights, restrained magenta. Freeze portrait placement, mask extraction, upload/repair, text size/choreography, phase boundaries and field center trajectories. Change only field falloff, material palette mapping and layered optical diffusion. Source compression makes the exact edge radius uncertain; preserve a readable high-resolution core instead of copying the recording blur.

Halo validation: actual IAB 4:5 working scheme preserved; inspected 0.8s and 3.8s paused frames, then resumed 1× playback. PNG and full-cycle MP4 1080×1350 generated through real editor controls; no console errors. Syntax and whitespace checks passed. Text choreography and mask extraction code are byte-identical to pre-refinement sections. Screenshot work/thermal/thermal-halo.png.

## 2026-10-14 MP4 smoothness
Freeze material palette, geometry, phase timings and glyph motion. Default MP4 output 60fps, resolution/FPS-scaled bitrate. Cache static high-resolution feathered alpha; evaluate low-frequency bloom at 320px with padding; preserve native core. Stop repainting paused/hidden previews and reset clock on visibility changes. Full-cycle start/end pixel identity tested before optimization. Baseline forced-readback 872×1090: median63.6ms, P95 92.2ms; this is a conservative completed-render benchmark, not display FPS.
- Removed forced 2× supersampling on 1× displays: preview now follows actual devicePixelRatio (capped 2), while export still renders explicitly selected dimensions. The earlier 2× minimum rendered four times the necessary preview pixels.
- Export audit caught rate-control startup artifacts: decoded first/last seam MAE 3.466/255, while last adjacent step 0.279. Replaced bitrate mode with fixed quantization 18 (kbps=0) to avoid changing initial quality. API source: https://github.com/TrevorSundberg/h264-mp4-encoder#api .
- Same-host live preview 119-frame sample after actual-pixel rendering: median33.3ms, P95 50ms; prior forced supersampling median66.7ms/P95 83.4ms. This supports improved preview, not a guaranteed 60fps on every device. Offline output is independent of preview speed.
- Final QP18 export verified by FFprobe: H.264 1080×1350, 60fps, 360 frames, exactly6s. Decoded adjacent duplicate frames:0. Quantized 64×80 seam MAE improved from3.466 to0.613/255; first/last adjacent differences0.290/0.300. First/second/last frames inspected visually: initial macroblock noise resolved. Original renderer endpoints remain pixel-identical. Delivered 成品/hely-thermal-HD-60fps.mp4.

## 2026-10-15 CellMotion release
Migrated to shared CellMotion three-column shell, precise range inputs, theme/language, independent content/properties, semantic duration-proportional timeline and visible export surface. Candidate selection is separate from explicit silhouette insertion; a focused repair drawer preserves the current composition and pauses on readable hold. Shared For AI menu exposes five actions; scene/canvas/motion Manifest preserves live text, font, colors, native media and repair strokes and reuses the original renderer through the origin-checked queued bridge.
Browser validation passed: Chinese/live state, embedded image/strokes, asset/font index, duration, pause/seek/play/restart/update, exact editor/player pixels and rejected bridge version/source. Real menu output contains COPY 热感, stg:noto-sc and edited hot color. PNG/GIF/MP4 rendering exercised through the same export path; 1080×1350 60fps H.264 was verified before shell migration. No approved preview/preset geometry or heat choreography was regenerated by this UI migration.

Reproducible test fixtures: thermal-mask.browser.html, thermal-cellmotion.browser.html and thermal-editor.browser.html. Serve the fixture copies under site with scripts/serve-thermal-check.cjs; the helper accepts only PNG/GIF/MP4/JSON test outputs inside work/thermal. Browser checks use edited live state rather than static default descriptors.
