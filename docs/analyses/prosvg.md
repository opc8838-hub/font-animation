# 彩铸 / PRO SVG Lab

## Source and scope

Requested source: https://github.com/Johnlzx/pro-svg-lab (Johnlzx). Earlier visual original: Mike Bespalov / Refero. This contribution adapts the material to the CellMotion editor; it does not claim authorship of either source. Reference video: upstream assets/refero-pro-animation.mp4, 1840×1200, H.264, 60 fps, 1028 frames, 17.133333 s, no audio. No source video is redistributed.

## Observable contract

| Time | Frames | Observation | Contract | Confidence |
|---|---|---|---|---|
| 0–1 s | 0–60 | P then partial R emerge at a soft diagonal boundary | Fixed letter paths, first reveal layer | high |
| 1–2.5 s | 60–150 | R fills, O closes; blue/cyan/yellow/orange/magenta contour order | Moving grayscale field, not glyph deformation | high |
| 2.5–4.4 s | 150–264 | P then R blend back into white | Continue scan with no translation or opacity fade | high |
| 4.4 s onward | 264 onward | Repeated left recovery / right disappearance | 4.4 s linear repeat; first reveal is one-shot | high |

Inspected a 2 fps full-video contact sheet, eight Watch frames, and a 12 fps crop at 1.5–2.5 s. The upstream generator is the requested fidelity target: fixed PRO paths, −35° sweep, 486-unit period, 1.5/4.5/9.5 inner blurs, 7.3 finish blur, 0.12 grain, 61-entry color tables. Warp/light remain off by default.

## Reuse and editability

Reuse the actual Sprout Shift HTML and its morphports-reviewed runtime, typecascade workspace/polish/select/locale adapters, fonts, icons, media, schemes and GIF/H.264 encoders. Add opt-in material hooks only; older ports retain their existing code paths and defaults. Same deterministic SVG snapshot feeds preview and every raster export. One-time intro plus continuous material scan. Row switching and custom text are CellMotion additions.

## Uncertainties

- Upstream already documents that its redrawn paths and sampled palettes are not pixel-identical to the earlier Refero recording. Match the requested Johnlzx implementation, without claiming pixel equality to Refero.
- Noise is rasterization-dependent; compare equal output dimensions.
- No explicit license file was listed upstream at inspection time; attribution is not a license grant. Keep a separate third-party notice without assigning the project license to upstream code.
- Browser-specific filter and high-resolution encoding performance require measured verification.

## Acceptance evidence

Verified in desktop Chromium on 2026-10-05:

- Nine equal-size comparisons against upstream native SVG/SMIL (default phases, all palettes, warp/light): mean RGBA channel error below 0.02 on a 0–255 scale. This measures the requested upstream renderer, not the earlier Refero footage.
- Viewed full reference and actual 1080p export contact sheets; checked desktop at 1440×1000 and mobile at 390×844, centered square/portrait/landscape canvases, independently scrolling properties, and mobile asset drawer with unobscured stage.
- Real files generated: PNG 320×320; GIF 320×320 at 24 fps; H.264 MP4 320×320 at 15/24/60 fps; H.264 MP4 1920×1080 at 30 fps, 8.8 seconds / 264 frames. FFprobe confirmed dimensions, duration and frame rates. GIF timing uses centisecond quantization and caps at 30 fps. SVG material download verified.
- Actual PNG exports with Inter, Chinese, Japanese and Korean fonts plus an inserted animated icon; visually inspected all four. Icon selection does not insert until confirmed; size/spacing, focused editor and Escape behavior verified.
- Scheme JSON save/import round trip, clear/reset, Ctrl+Z / Ctrl+Shift+Z, multiple-row reorder, video background trim and background crossfade checked. A 5-second, 15 fps MP4 includes both rows and the video background.
- Console clean in editor validation. Existing six morph-port layout regressions, editor contract, new material tests and website checks run before publication.
- Browser coverage is Chromium only. High-resolution exports are offline frame rendering; the tested 1080p 8.8-second export took about 70 seconds on this machine. Safari/Firefox and every possible font/media combination have not been tested.
- Disable the one-shot intro to export the continuous scan alone; the default full-cycle export deliberately includes the initial reveal.
