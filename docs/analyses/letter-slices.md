# 字形切片 / Letter Slices

## Source and corrected rendering model

Reference: https://x.com/abduzeedo/status/2115976186711134655.
The original recording is 1080 × 1080, 4.088 s and 240 frames.
The user also supplied the desktop file 微信视频2026-11-02_151456_633.mp4:
592 × 1280, 13.433 s, containing repeated playback of the same effect in X.
Both files remain in local working storage. They are not repository assets.

The user rejected both the flat Canvas stripes and the extruded Three.js blade
mesh. Their silhouettes and material response did not match the optical warping
in the recording. Merely switching to a 3D engine was insufficient.

## Visible evidence

| Original time | Observation | Reconstruction |
| --- | --- | --- |
| 0–0.3 s | Complete charcoal lowercase a on white | Undistorted glyph |
| 0.3–0.9 s | A few broad regions bend the letter; blue/cyan and amber collect at their edges | Low frequency glass refraction builds continuously |
| 0.9–1.65 s | Broad regions subdivide into many narrower repetitions | Increase cylindrical lens frequency and optical depth together |
| 1.65–2.45 s | Curved, pointed contours repeat along the outer edge and counter; central dark regions merge | Refract the continuous letter image rather than adding solid blade geometry |
| 2.45–3.5 s | Repetitions broaden, their number falls, the original letter returns | Reverse the same continuous optical field |
| 3.5–4.088 s | Complete letter holds | Undistorted glyph |

The desktop recording confirms the curved edge and color split around 2, 3,
4, 7, 11 and 12 s. Watch supplied chronological frames; FFmpeg supplied dense
sampling and matching reference/export sheets.

## Renderer

One full-screen Three.js shader uses the selected font's alpha texture. A periodic
convex normal field and GLSL refract calculate lateral sampling travel through a
glass array. Lens density and travel grow with one timeline progress value.
Separate spectral samples produce cyan/blue and amber edges. White reflections
stay weak so the broad letter face remains charcoal. Preview, seeking and real
PNG/GIF/MP4 exports share this deterministic renderer.

The existing Glass Icon Reveal core was inspected for its refraction, spectral
sampling and rim-light treatment. Its droplet/tile geometry is not part of this
effect and is not applied to the letter.

## Typography

Normalized static glyph masks were compared against the source. The local Inter
variable font at weight 700 and optical size 14 gave approximately 99.4% binary
intersection over union after fitting the bounds. The browser's automatic optical
size selected a visibly different terminal, so this effect registers a fixed
optical-size face from the existing shared font file. No font asset is duplicated.
Other font choices and Latin/Chinese/Japanese/Korean text remain editable.

## Verification and uncertainties

Browser checks cover real WebGL creation, both directions, multiple glyphs,
desktop/mobile fit, saved schemes, and actual PNG/GIF/MP4 downloads. The gallery
video is exported with the same default font as the editor.

The author's source shader and optical parameters are unavailable. The glass
field is a reconstruction from visible evidence; engine initialization and export
success do not by themselves establish visual fidelity. Matching dense frames,
phase boundaries and letter contours remains the relevant comparison.
