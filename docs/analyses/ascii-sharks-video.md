# ASCII sharks reference reconstruction · 2026-10-20

Source: https://x.com/stackedlol/status/2112257760628986188
Local reference: `../output/ascii-sharks-reference-video.mp4` (not committed).
ffprobe: H.264, 1192×1080, 24.525 s, 1411 frames, reported r_frame_rate 120/1; the average delivery cadence is about 57.5 fps. No audio. Watch broad pass at 0.3 fps and a 10 fps contact sheet from 2–4 s were inspected before changing the renderer.

User correction: reproduce this light scene first, with all conversational interface removed, then create whales using the same visual grammar. The previous dark, single-animal orbit was a draft and is superseded.

| Time | Visible evidence | Interpretation / contract | Confidence |
| --- | --- | --- | --- |
| 0–3 s | Four separate sharks: slender warm long-tail upper left, pale classic near center, blue-gray hammerhead right, warm broad shark below. Square gray tiles, inverse light glyphs, a few colored cells. | Independent trajectories and depth; several distinct shapes. No shared rigid formation. | High |
| 2–4 s dense pass | Hammerhead travels toward upper right, warm animal moves toward lower left. Fins follow the local body angle; the tail trails through a curved spine. | Moving spine with attached fins and a traveling tail wave. Forward travel continues while turning. | High |
| 3–10 s | Several animals leave through the boundaries. Fish are small neutral dashes in loose schools; a fine neutral grid remains stationary. | Allow natural clipping at the scene edges; never shrink animals to keep them all onscreen. | High |
| 10–17 s | Sharks reenter from different edges and cross at different apparent depths. No global entrance, hold or exit. | One continuous swimming phase. No artificial synchronized three-phase rotation. | High |
| 17–24.5 s | Bodies sweep into long curves; pale and darker animals remain distinguishable. The central prompt/input and History overlay are fixed. | Keep tile shading, glints and independent motion; omit all overlay UI from composition pixels. | High |

## Frozen visual requirements

- Light neutral background, faint fixed rectangular grid, dark neutral small fish.
- Filled gray tile silhouettes with fine light gaps and inverse monospace glyphs; muted blue, olive and warm gray bodies with sparse accent flashes.
- Hammerhead bar, pointed classic, long ribbon tail and broad warm shark must read as different animals.
- At least four separately posed sharks in the default shark composition; local pectoral/pelvic fins remain attached to the bending spine.
- Whole animals can pass beyond an edge. All animals continue forward at normal speed, with no freeze at a labeled phase boundary.
- No prompt, input box, History control, glass card or dialog in the animation. CellMotion editor chrome stays outside exported pixels.
- One deterministic renderer and clock for editing, component playback, paused frames and exports.

## Implementation decisions and uncertainties

The exact original random simulation seed and pointer history are unavailable. Reconstruct the observable style and motion using original deterministic paths and an articulated sampled spine; do not claim frame-identical trajectories. Preserve the public repository as a visual/source reference only; no source is bundled because its checkout has no license file.

Whales use the same grid/tile/shading engine after the shark scene is checked. Their broad rounded rostrum, long pectoral fins, paired blowholes and broad transverse flukes distinguish them; their beat and travel are slower.

## User refinement: combined scene and stronger light

The user asked to combine sharks and whales, make the hammerhead recognizable, and strengthen flowing tile depth. The default is now one `ascii-sharks` composition titled 字符海洋 / ASCII Ocean, with four shark variants and one whale; the draft whale URL forwards to it. The hammerhead uses a rigid local transverse bar, wider tips, a thinner neck and terminal eyes. Tile luminance covers a wider range, including a dark dorsal ridge; two spatial light waves and staggered glyph/accent clocks move across the articulated body. `方格明暗对比` and `明暗流动强度` edit these visible properties. The conversational overlay remains absent.

Latest refinement: preserve the muted colored glints, lift neutral tile luminance by 11 levels, increase local tile-value variation, and use stronger traveling body waves with a small smooth glide-speed modulation. Shark beats are faster than whale beats; all modulation remains periodic.

Manta addition: the shared scene and candidate library now include a manta with broad triangular wings, paired cephalic lobes and a thin unlobed tail. Its slow independent wing beat changes projected span and sweep. Existing color glints and the lighter shader are retained. Anatomical visual reference: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/manta-ray/ .

Manta tail refinement: extend the tail portion by 50 percent while preserving the disc and wing dimensions. Enforce a minimum raster width based on the cell diagonal, preventing a thin geometric tail from disappearing between sample centers. Give the tail a darker continuous tile value.
