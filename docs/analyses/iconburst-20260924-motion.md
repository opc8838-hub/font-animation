# Icon Burst: full-field orbit, central collapse and impact sweep

## Source and scope

- Local reference: Desktop `飞书20260924-191848.qt`; source unchanged and not committed.
- 540 × 1168, H.264, 30 fps, 364 frames, 12.133333 seconds, AAC audio.
- Useful composition crop: x=0, y=276, width=540, height=304. Phone/browser chrome is excluded.
- Watch: 24 chronological broad frames, no deduplication or audio upload. Dense FFmpeg pass: all 84 frames from 2.100–4.900 seconds at 30 fps.
- Normal-speed recording, with repeated loops. Frame repetition comes from the embedded GIF/recording; it does not imply a deliberately static hold.
- Target: a screen-wide spatial icon field and title retreat together, turn into a compact moving cluster, shrink all the way to the center, then hand off to an inward letter collision and a fast center-out color wave.

## Observed phases (absolute source time)

| Time | Frames (30 fps) | Evidence | Interpretation | Confidence |
| --- | --- | --- | --- | --- |
| 2.567–2.733 | 77–82 | Korean opening title fills ~55% width; icons reach all four edges and cross the crop. | Wide 3D field, not a circle sized from the shorter canvas edge. | High |
| 2.767–2.933 | 83–88 | Opening title shrinks into the same central field. Rings/cards move laterally and change projected width; GOOD/JOB enter from opposite edges before it is fully gone. | Shared inward progression with depth/yaw; overlap title handoff. | High for overlap/scale, medium for exact 3D axis |
| 2.967–3.333 | 89–100 | Side words brake toward an open central slot while icons rotate into the cluster. | Fast entry with a continuous deceleration. | High |
| 3.333–4.067 | 100–122 | Compact cluster has small ongoing position/orientation changes. Text keeps its open slot. | Low-speed residual orbit, no restart or new random layout. | High |
| 4.100–4.200 | 123–126 | Pink ring/yellow card and other assets converge from their current positions; cloud radius AND individual sizes contract. At 4.167/4.200 a tiny central bundle remains. | Scale the composed cloud, including custom offsets, toward the exact center. Preserve rotation while collapsing. | High |
| 4.233–4.367 | 127–131 | Icons are gone. Inner letters close first; outer G/B finish later. Purple appears on D/J while outer letters are still white/moving. No preparatory outward jump. | Short center-first stagger with color triggered by first contact, not last-pair completion. | High |
| 4.367–4.533 | 131–136 | Color fills the title; center becomes white before the two outside ends. At 4.500 the ends remain pink; 4.533 is white. | Both color and base-color fronts travel center-out. | High |
| 4.567 onward | 137+ | Fully restored line, later matched icon substitutions. | Preserve existing editable replacement model. | High |

## Motion contract and frozen scope

- Freeze asset contents, saved typography/palette, editor layout, scheme ownership, replacement order/hold semantics, gallery preview bytes.
- Correct the default motion timings to the measured normal-speed phases; saved user timing overrides remain editable and are not overwritten.
- Opening radii use both actual composition width and height. Depth order comes from one orbital pose; icon artwork keeps its natural proportions.
- The final cloud scale applies to every icon position, user X/Y offset, cluster offset and icon size; alpha stays visible until subpixel collapse. No scale-in-place plus opacity cut.
- Intro and icon field share the same gather clock. Side text starts beyond the corresponding canvas edges and brakes into the slot.
- Collision is a center-first inward closure with no invented outward anticipation or large rebound. Color begins at the first contact and overlaps later letter arrivals.
- Center-out mode keeps the selected A→B→C→D palette order in each wave; ordinary linear sweep remains an available separate mode.
- DOM and Canvas use the same orbital pose, collision beat, text-entry displacement and center-wave sampler.

## Uncertainties

- Exact source camera focal length and card Z coordinates cannot be recovered from a single recording. Ellipsoid projection and measured screen coverage are the reconstruction model.
- The reference has a different opening phrase and graphic collection. Keep the user's editable phrase/assets; match their motion rather than copying source artwork.
- Timing precision is approximately one source frame (33 ms), with occasional repeated recorded GIF frames.

## Validation

- Final default markers, relative to source 2.567s: side entry 0.270s, settled 0.750s, collapse 1.500–1.667s, center-first collision 1.620–1.807s, color starts 1.654s, base restored 1.964s. A first exported comparison showed entry about two frames late and collapse/color about one to two frames late; those defaults were corrected from the comparison.
- The last recorded cloud frames retain a visible little bundle. Replaced an overly steep collapse ease with continuous group scaling across five frames, ending at exactly zero position and size. Rotation continues through the collapse.
- Deterministic checks at 1920×1080: opening icon centers span 2474×1197px, the cloud span falls from 495px to 233px halfway through collapse, reaches 0.32px just before the exact zero endpoint, and includes custom asset/cluster offsets. Inward collision distance is monotonic with no outward anticipation or overshoot.
- Moving glyphs now carry their true text indices and close onto measured resting anchors. Both the wave and its restoration use center-pair ranks, including unequal halves, Chinese text, and the default double space. This fixes a spacing jump at the moving-to-resting handoff.
- Real production export buttons generated PNG 960×540, GIF 480×270, and H.264 MP4 960×540, 30fps, 3.133333s. FFprobe confirmed codec, dimensions, frame rate and duration. All exported opening/collision frames were extracted at 30fps for inspection, with a source/candidate comparison at phase boundaries.
- Export inspection exposed a pre-existing Canvas font bug: quoting an already quoted CSS family list caused Canvas to silently retain its 10px default font. Corrected the family syntax and used font metrics for centered/scaled baselines; regenerated all export files after the correction.
- Live and export checks covered Archivo Black Latin, Noto Sans SC Chinese, Noto Sans JP Japanese and Noto Sans KR Korean; square 1080×1080 and portrait 1080×1920 PNGs were generated. Measured horizontal centering error was 0px for both additional aspect ratios. One and 30 orbit assets were exercised; desktop and 390px mobile screenshots inspected. No page errors in the completed browser runs.
- `node --check site/iconburst.js`, shared `check_editor_contract.py`, and `git diff --check` passed. Cache keys updated to `20260924-motion1`. Asset files, gallery preview, existing editor controls and scheme storage were not changed.
- Local evidence (not committed): `output/iconburst-reference-20260924/` for original Watch/dense frames; `output/playwright/iconburst-motion/` for exported media, source comparison, screenshots, FFprobe metadata, and browser metrics. These are reconstruction checks, not a claim that the unavailable original 3D scene or different artwork was recovered exactly.
- Follow-up hover refinement: the original 3.333–4.067s hold continues forward along the incoming orbit. The initial implementation moved sample icons only about 4–9px across a 960px frame during the 0.75s hold, so it read as frozen. A smooth extra arc activated only after gather progress 0.86 raises visible travel without a new path or position reset. Six paused preview frames from 0.75–1.50s and shared pose samples show continuous travel into collapse. The opening and collision clocks remain unchanged.
- Finale centering regression and correction: the first attempted fix contracted the visible icon together with its slot for 160 ms before its matched cut. A side-by-side browser check against `d064cf8` showed the last icon shrinking from about 100px to 61px before it disappeared, changing the established motion. That attempt was reverted. The visible icon size, drift and reserved space now match `d064cf8` frame for frame through the last cut. Only slots whose release would outlive the cycle settle over 100 ms after their icon disappears; the cycle allows 130 ms for that release. The restored word reaches exact center at 3.16 s in the default 16:9, 1:1 and 9:16 previews. Opening, collision, colors, icon order and visible replacement geometry remain frozen.
