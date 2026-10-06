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


## 2026-10-06 grain-stage correction

A reported rectangle behind PRO was reproduced in filter stage 4 (UI “05 · 颗粒调制”), lava palette, 7.3 blur / 0.12 grain. The upstream intermediate-stage arithmetic multiplies the full white paper by grain, exposing its rectangular filter bounds. The adaptation now uses `1 - (1 - soft) * grain` for this isolated stage, keeping white fixed and texturing ink coverage. Upstream vendor bytes and stages 0–3/5 are unchanged; emitted SVG equality checked for those stages. The approved default scheme and gallery artifacts are unchanged.

Visually checked the reported desktop state, white-boundary pixels at grain 0 / 0.12 / 0.4, actual 1920×1080 PNG, 320×320 GIF and 24 fps MP4, and Chinese text on a colored background. The filter correction is shared by preview and all exports, including animated SVG. Numeric regression evaluates the emitted arithmetic for all four palettes and multiple noise/grain values. Browser console clean.


## 2026-10-06 editable-type correction

Typing lowercase `pro` previously left the canonical PRO path branch and used Inter 500 with CSS em-based sizing and a 193.5-unit mask. That changed apparent weight, height and material wavelength even though the size control remained 400.

The canonical PRO branch is now case-insensitive. The portable default selects the shared Archivo Black 900 font for editable content. Editable masks normalize actual ink height to the same 129-unit coordinate system as the canonical paths; only compositions wider than the canvas fit limit shrink. A fixed 486-unit material wavelength preserves band/blur scale across text lengths, while the initial reveal extends for long text. Explicit global/row font selection turns off canonical PRO outlines so the selected font applies to every word. Saved font choices are preserved on import.

Verified default PRO versus typed pro at paused 2.64 seconds with exact rendered-pixel equality. Actual 1920×1080 ink bounds: PRO/pro 400 px, ABC 396 px, Chinese 393 px, centered within rasterization tolerance. Font selection remains Inter / 400 after further typing when explicitly chosen. Tested mobile 390×844 with no horizontal overflow, new text PNG at 1920×1080, GIF and H.264 MP4 at 320×320 / 24 fps / 1 second. Visually inspected actual exported frames. Numeric regressions cover multiple font metrics, centered ink, long-text fitting and invariant material wavelength. Original default path rendering and existing gallery artifact bytes remain unchanged; default font metadata is corrected for editable text.


## 2026-10-06 toolbar and language correction

Size selection and its custom-dimension fields now sit at the right edge of the live-stage toolbar on desktop and mobile. The shared canvas card formerly grew to fill the row, leaving its actual select at the left even with an auto margin. Scoped sizing keeps the existing controls and responsive geometry.

The page opts into the shared gentle language-transition profile: 340 ms ease-out to 0.86 UI opacity, followed by 460 ms ease-in. No blur is applied, and the live stage is excluded. Measured at animation-frame intervals: header opacity reaches 0.86 and returns to 1; stage ancestor opacity remains 1; paused canvas bitmap is unchanged when switching back. Bidirectional and rapid double clicks settle correctly. Reduced-motion preference swaps language immediately. Desktop 1440×1000 and mobile 390×844 right inset is 12 px; custom 800×1000 is editable without horizontal overflow. Light-theme screenshots and a clean console verified.
