# 弧廊归标 / Curved Gallery

## Source material

Private desktop recording: `微信视频2026-10-09_073417_351.mp4`; never commit the recording or extracted frames. HEVC, 592 × 1280, 5.766667s, 115 variable-rate frames, nominal 30fps. Actual composition: x=0, y=415, 592 × 333. Exclude phone UI, AssistiveTouch and the paused 0–1.17s recording lead-in. Inspected using Watch overview and dense FFmpeg frames, including 20fps fold/word transitions.

## Current contract: replace the source material, preserve its motion

The user clarified that black is the reference pictures’ color, not a required recoloring phase. Every uploaded image replaces a source panel and retains its own pixels/colors throughout, including the final thin rear strips. This supersedes all earlier interpretations that made photos become black.

- Start with complete curved pictures rotating, without preset rear strokes.
- The same panels retreat and shrink continuously. Rear picture geometry progressively narrows to 13% of its original angular width; the image fills that complete geometry rather than shrinking inside a black plate.
- Do not darken pictures, expose black backs, crossfade to a solid mark or substitute a separate logo. Black/other solid color is only the fallback for a panel that has no image.
- The whole image group moves left before the editable brand word rises behind a mask with slight letter stagger.
- Freeze camera timing, initial intact-picture stage, final geometry, left shift, word reveal and the existing editor/export model. Correct the material mapping everywhere, including arbitrary replacements, not only the portrait demo.
- Removed `solidMark`. Old v1/v2 schemes keep their images and known settings; the removed recoloring switch is ignored. The IndexedDB key and scheme version stay compatible.

## Geometry and motion evidence

Measured ring horizontal half-span at source 2.8/2.9/3.0/3.1/3.2/3.3/3.4/3.5/3.6s: approximately 282/254/219/161/113/83.5/67/61/53.5px. Camera Bézier x handles .760/.249, y handles 0/1, interval approximately source 2.35–3.77s. Do not launch shrink at peak speed using an ease-out.

Measured upper-ring x center at source 3.7/3.8/3.9/4.0/4.1/4.2/4.3/4.4/4.5s: 293/290.5/286.5/282/268.5/237.5/225.5/221.5/220.5px. Left-shift Bézier x handles .794/.375. The shift begins before visible letters.

| Source time | Animation time | Channel |
| --- | --- | --- |
| 1.17–2.40 | 0–1.23 | Complete curved pictures rotate |
| 2.35–3.77 | 1.18–2.60 | Accelerated-then-braked retreat and shrink; rear photos narrow |
| 3.65–4.50 | 2.48–3.33 | Entire image group moves left |
| 4.05–4.50 | 2.88–3.33 | Word rises behind masks; visible tops near source 4.2s |
| 4.50–5.52 | 3.33–4.35 | Final textured lockup holds |
| 5.52–5.77 | 4.35–4.60 | Entire lockup fades together |

Panels remain in one persistent cylinder. Front/rear widths and depth use continuous functions, including `cos(angle)=0`. Rear depth begins below the composition and reaches zero in the final ring. One compound curved path with matched winding prevents side projections from cancelling into detached fragments. Texture-strip count adapts to output pixel width; using many subpixel image draws washed the thinnest colored strips into the background. Camera positions/geometry remain independent of that sampling detail.

## Shared implementation and controls

Preview, scrubbing, PNG, GIF and H.264 MP4 use one deterministic renderer. Textures use affine cylinder strips clipped to the same panel geometry; photo opacity is only the user value multiplied by the whole-group exit opacity. Shared Type Cascade shell, font/icon catalogs, animated-image decoder and encoders are reused. Assets keep stable ids, original embedded images, crop/order and library metadata; runtime decoders stay out of backups.

Controls: upload/replace/crop/order, shared media, brand/font/weight/colors, background, fallback panel color when no image exists, slot count/gap/height/curvature/rotation, final size and text gap; rotation/retreat overlap, group-shift interval, word delay/reveal, holds, fade and global speed. Four scheme actions, responsive ratios and real exports remain available. Parallax Studio backups now import embedded original pictures together with per-image shader types and supported shader settings.

`curvedgallery.html?demo=portraits` loads the existing public `xiaoguo-/gallery/01.png` through `07.png` into this same renderer. `&preview` uses the existing full-stage view. Initial demo loading does not overwrite the user's saved composition. No copied picture catalog or special demo renderer. The companion portrait MP4 is a real 1280 × 720 / 30fps / 138-frame / 4.600s export.

## Reusable image effects (2026-10-09)

The user requires effects to remain adjustable after replacing any picture. `curvedgallery-effects.js` adapts the MIT fragment shader from `opc8838-hub/xiaoguo-` (`app/gallery-shaders.ts`), originally adapted from Xian/Codrops. Full attribution/license is retained in `docs/licenses/curvedgallery-parallax-MIT.txt`. Noise distortion, RGB dispersion, ripple, soft distortion, film grain, mosaic and magnifier use the original shader math. Negative effect selection uses `floor` before integer conversion so “no effect” actually disables distortion/grain.

Each stable image id owns `effects`: shader type, strength, UV scale, image parallax/multiplier, distortion, grain, radius, effect center, speed, hover response and activation; plus look, look strength/scale/color. Replace changes only source/name/type and drops old library identity while retaining crop/opacity/effects. Reorder, save/import and autosave retain the complete state. Older v1/v2 assets receive neutral defaults; old picture pixels and approved motion remain unchanged.

The seven sample PNGs have no embedded filter recipes. Their mist, neon, trails, reeded glass, frosted split, prism glass and pink haze are baked pictures. Seven new procedural looks approximate those appearances; they are **not** recovered original filters, exact source artwork, segmentation masks, or a pixel-identical reconstruction. Sample assets carry the corresponding look with `lookBaked=true` and shader strength zero, preserving their approved pixels. Replacement activates that stored look on the new image; explicitly adjusting a look applies it to the current picture. Graphics/text printed into the sample images are not filter layers.

An offscreen WebGL texture pass runs before the existing curved-panel mapping. Raw pictures and zero-strength looks bypass that pass exactly. Texture size is bounded to 1024px on the long side, with stable deterministic sampling for preview/export. GPU textures stay in runtime resources, are disposed on replacement/removal, and never enter scheme JSON. Animated media uses the shared canonical frame decoder.

Preview supports continuous effects or mouse hover using each curved panel's inverse strip coordinates and independent hover response for repeated instances. PNG/GIF/video never depend on the last mouse position: exports use the saved effect center, strength and speed, as stated beside the activation control. Image-internal parallax follows the panel's angle; the approved ring choreography is unchanged. The original horizontal gallery's scroll easing, page layout and hover-only camera are not imported as ring-motion controls.

Checks include actual pixel changes for all seven shader types and all seven looks; neutral pixels restored at zero strength; real hover changes in the stage; per-image isolation, retained effects/crops after replacement, reorder/save/reload/import, invalid effects rejected, source-gallery shader parameters imported, baked samples unchanged until replaced, bilingual/theme/mobile checks, and filtered PNG/GIF/MP4 exports. Decoded H.264 frames and landscape/square PNGs are compared with the same deterministic renderer. The user's desktop `20261009-110332.jpg` is used only in private validation artifacts; it is not added to the public repository.

## Verification

- The old renderer fails the photo-color regression: after retreat, colored fixture pixels fall to zero and turn into black pixels. The correction must retain photo pixels through the final lockup and within the thin rear strips.
- Pure motion checks: initial full rear geometry, continuous narrowing, front/back continuity, monotonic radius, stable final pose, early left shift, fade/speed and measured camera/shift positions. Reference radius error <10px and x-center error <5.5px in the 592px crop.
- Browser regression: opaque red/blue replacement pictures remain colored without any forced black pixels throughout rotation, shrink, narrow-strip lockup (excluding logo text), plus the actual PNG/GIF/H.264 exports; legacy imports drop the removed switch without losing photos. Backup conversion, reorder/crop/replace, reload, save/import/default/clear, explicit library insertion, four fonts, theme/language, aspect ratios, seeking and mobile remain checked.
- Portrait example checks all seven public image bytes against yesterday's local pictures, saved-user-scheme preservation, editor/full-stage loading and actual 1280 × 720 / 30fps MP4 export. Inspect decoded exported frames as well as live canvas colors before publishing.
- Editor/shared contract checks and console checks remain required. Only this effect's portrait demonstration is replaced; unrelated catalog entries, approved previews and the default black-reference artifact remain unchanged.

## Uncertainties

This compressed recording does not reveal the exact original camera, hidden panel topology or font. Default text appears to read `Sentr`, with shared Inter used as an approximation. The reconstruction follows measured geometry and rhythm; it is not proof of pixel-identical source frames. The required photo-color behavior comes from the user's clarification rather than from the recording's entirely black materials.
