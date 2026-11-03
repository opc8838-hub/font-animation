# 玻璃漫步 / Glass Walkers

## Primary reference: user recording, 2026-11-03

### Horizontal posture correction

- User still rejects the sideways walkers as stooped. The existing test proves a world-space upright trunk, but does not establish that the projected silhouette reads upright.
- Hypothesis: horizontal perspective convergence displaces the head/shoulders toward the camera's centre while upper-body attenuation erases the shoulder/head silhouette. Compare identical poses on both sides of the viewport, walking in both directions, before changing additional gait channels.
- Scope: human horizontal upper-body projection and visibility. Keep planted foot geometry, cadence, high heels, vertical walkers, animals, paths, glass grain and code tracker timing fixed. Verify the projected trunk and compare dense side-view frames and real export.
- Alignment/attenuation alone still left a visually compressed upper trunk in the matched frames. The final lateral projection keeps the trunk over the projected hips, expands the above-hip vertical silhouette by 35%, and reduces upper-body blur by 25% so the shoulder/head do not dissolve into one bent-looking patch. This is a deliberate silhouette correction to the below-glass projection, rather than a claim that the physical camera changed.
- Verified actual uploaded shadow geometry across both horizontal directions, three viewport positions and four phases: maximum normalized shoulder/hip horizontal displacement falls from 0.01764 to 0.00482. Vertical-person and animal-only frames remain pixel-identical to the previous renderer. All footwear contact/continuity tests pass. Reviewed matched side-view frames and 18 dense frames decoded from the real 1280 × 720 / 30 fps / 360-frame export. PNG/GIF/MP4, mobile entry/toggle and browser-console checks pass; the effect's gallery assets and cache revisions were refreshed.

### Optional footstep tracking

- Visual correction requested after the first tracker was judged too faint and missing the reference's code-like appearance. The 9.50 s still shows monospaced names and white glyphs through grey body shadows; source inspection confirms labels resolving from symbol noise and brackets tightening during acquisition. Adapt those channels to each foot: resolve `STEP_01.L/R` from deterministic symbols, tighten corner brackets on landing, blink the crosshair during acquisition, and strengthen/enlarge glyph grain in the enabled footstep mode. Keep gait and non-tracking material unchanged. Per-step reacquisition and the scanning line are deliberate emphasis for this adaptation, not claimed as a literal recording of the original overlay.
- Checked the revised overlay at its real editor display size and 18 dense frames (15 fps) decoded from the new 1280 × 720 / 30 fps / 360-frame export. Save/import/reset, mobile controls, PNG/GIF/MP4 and console checks passed. Existing figure-mode pixels and disabled-mode output match the prior renderer; enabled code tracking repeats exactly across 12-second boundaries at 0.5×, 1× and 2× speed.

- The recording at 9.50 s shows colored corner brackets and a small label near a person's feet. The source implementation centers its default bracket on the pair of feet; it is not evidence of a separate box on each foot.
- Requested adaptation: add a selectable footstep mode with one stable L/R identifier per shoe. Frame the current projected shoe geometry, including high heels; dim the frame as that shoe lifts. Use the same below-glass projection and export time as the shadow. Keep the existing figure mode and off switch, including compatibility with older saved schemes.
- Human gait, animals, glass rendering, default scheme appearance and existing gallery media remain unchanged. Animals retain their existing figure markers.
- Verified old-versus-new renderer equality in figure mode at the same dimensions and time, deterministic repeated footstep frames and identical output for both modes when markers are off. Browser checks passed for mode selection, off/disabled state, save/reload/import/reset/clear, the direct preview link, English/light theme and mobile layout. Exported PNG, one-second GIF and a complete 12-second 1280 × 720 / 30 fps MP4 with no page errors.
- The general editor contract checker still reports its 12 asset/text-panel requirements for this procedural effect, which has no text rows or uploaded assets. This checker is not a passing validation; mode-specific browser checks and website checks are separate.
- Entry follow-up: the user could not find the new mode. All local gallery/home/library links now explicitly select footstep tracking, and a visible stage toggle reports its on/off state and stays synchronized with the inspector. Verified entry with both clean storage and an old saved scheme with markers disabled, pixel restoration after toggling, and 320/390 px layouts. The default Reset scheme and gallery media remain unchanged. These changes are local; an HTTP check of `https://cellmotion.cn/glasswalkers.html` returned 404 on 2026-11-03, so no online release is claimed.

### Follow-up: shoe variety and upright walking

- User supplied a cropped still of the current preview and rejected its crouched, wide-reaching posture. The still establishes the silhouette problem, not a new measured cadence.
- Change only human anatomy, gait and footwear: two high-heel walkers (slim heel and block heel), two narrow flat shoes, and two everyday shoes in the default six-person scene. High heels must show a small heel contact separated from the pointed forefoot by an elevated arch.
- Keep the existing paths, arrivals, animals, glass material, below-glass camera, markers and editor/export clock. Grounded shoes remain fixed; forefoot contact continues through heel lift; each moving leg and opposite arm belong to the same gait.
- Replace forward torso lean, deep support-knee bend and excessive swing lift with an upright torso, shorter spatial strides, narrower foot angles and restrained opposing arms. Verify joint lengths, planted contact, transition continuity and dense rendered frames for all shoe profiles.
- Verification: four footwear profiles sampled at 120 Hz retain equal leg lengths, an extended support leg and continuous joints. Grounded intervals are 0.35–0.42 s. Inspected isolated profile frames and 36 consecutive frames from the real HD export, plus a 2 fps overview of the complete 12 s loop. Re-exported 1280 × 720 / 30 fps / 360-frame MP4, gallery video, PNG and GIF; browser checks include portrait framing and mobile scheme controls, with no page errors.

- Desktop file `20261103-135050.mp4`: H.264, 43.866667 s, 1316 frames at 30 fps. Encoded 888 × 1280 with 90° rotation metadata; displayed 1280 × 888. Safari controls are outside the effect.
- Reviewed 44 chronological overview frames, full-resolution stills, and all 42 consecutive crop frames from 9.00–10.37 s. Recordings and extracted images remain outside the repository.
- The earlier Canvas oval implementation was rejected. Its geometry and shading are not an approved baseline.

| User clip time | Visible evidence | Required behavior | Confidence |
| --- | --- | --- | --- |
| 0–2 s | Tablet controls and browser opening. | Exclude device UI. | high |
| 2–8 s | One shoe can be sharp while its partner is a broad soft patch. | Give each foot an independent height and contact state. | high |
| 9.00–9.37 s | The lower-left shoe stays near the same glass position while the body advances. | Keep a planted foot fixed in world coordinates. | high |
| 9.37–10.37 s | The partner advances; trailing contact shortens, lifts and disperses. | Continuous heel roll, hinged forefoot, toe-off and swing. | high |
| 12–32 s | Staggered crossings, empty areas, faint upper bodies converging toward the upper page. | Independent arrivals and a camera below the glass. | high |
| 33–35 s | Browser reload and loading state. | Exclude reload transitions. | high |
| 36–43 s | Continuous independent crossings resume. | No synchronized global stop. | high |

The shoe is approximately 80–100 px long in this 1280 px recording. Ankles, knees, hips, torso and arms have different heights; higher geometry projects toward the camera's vanishing point and loses contrast. A lifted shoe softens through increased distance from the glass, rather than merely fading a fixed silhouette. The dot screen and pale glyph grain stay in the glass coordinate system.

## Earlier reference

- Reference: https://nusretuzman.com/ (viewed 2026-11-02).
- Browser recording for analysis: 18.8 s, 1440 × 900, VP8 at 25 fps. All 395 frames from 3.00–18.76 s were decoded; 0.20 s overview sheets and a 25-frame, 0.04 s close-up of one stride were reviewed. Recording and extracted frames remain outside the repository.
- Target: pedestrians and occasional animals cross an open frosted-glass field, with no central card or other content block.

## Observed motion

| Time in recording | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- |
| 0–5 s | Page loads; the original site's card remains before the analysis overlay hides it. | Ignore the card and loading transition. | high |
| 5.40–6.36 s, 25 consecutive frames | A dark shoe remains nearly fixed on the glass across several 0.04 s frames while the torso shadow advances; its contact then softens as it lifts. | Stance and swing are separate phases; the foot must move relative to the translating body. | high |
| 5–8 s | Several dark pairs of soles travel across the field from different edges. Upper-body shadow shifts toward a point above the viewport, independent of walking direction. | One path and one gait phase per walker; project high body parts toward the viewer's vanishing point. | high |
| 8–14 s | Walkers keep crossing without a synchronized global stop. Silhouettes overlap and leave the viewport. | Staggered crossings with offscreen entry/exit, no global pause. | high |
| 14–18.8 s | New walkers replace departed ones. Small colored corner marks follow selected figures. | Periodic replenishment; marks are optional decoration. | medium |

The site's source describes occasional cats and optional dogs, but this short recording did not establish their exact arrival interval. The CellMotion default makes one animal passage visible in each export cycle so the requested subject is reviewable.

## Spatial and visual contract

- Full rectangular canvas, near-white background, no central frame.
- Feet are the darkest, sharpest shapes, roughly 70–100 px long at the 1440 px reference viewport. Legs and bodies form broad, soft shadows, and the torso recedes toward the top of the screen. Fine dot texture is visible through the grey areas. Animal movement uses four smaller paws and a tail.
- Paths cross horizontally and vertically from beyond the canvas edges; people remain independently phased.
- At export sizes, preview and PNG/GIF/MP4 use one deterministic renderer and clock.

## Editable controls

- Person and animal counts, animal type, travel direction, overall speed, figure scale, glass softness, dot density, shadow and background colors, optional tracking marks.
- Canvas size, pause/replay, seekable timeline, scheme save/import/reset/clear, PNG/GIF/MP4 output.

## Uncertainties and adaptation

- The new shared renderer builds 3D tapered capsules from an analytic gait, solves knees between hip and ankle, projects them through a below-glass camera and combines Gaussian coverage in WebGL 2. A second pass adds tone, a dot screen and glyph grain. Preview and export use this same renderer.
- Paths and arrivals are deterministic inside a 12-second export cycle. The source site uses a continuing crowd simulation, so the specific arrangement of people in the recording is not replayed frame for frame. The full cat gait and arrival interval remain uncertain from the supplied clip.
- The reference has no global phase boundaries. The editor's timeline marks overlapping people crossings and the animal passage inside a 12-second repeatable export window.

## Verification

- `node scripts/check-glasswalkers-motion.mjs` samples each shoe profile over six seconds: both feet keep fixed contact, swing feet lift, joint lengths stay constant, the torso remains upright and stance/swing boundaries do not teleport. The earlier flat-ellipse renderer has been removed.
- The first volumetric revision was exported through the editor as a 1280 × 720 H.264 video: 12 s, 30 fps, 360 decoded frames. Its PNG at 9.00 s and corresponding decoded MP4 frame differed by a mean absolute 0.887 per RGB channel on a 0–255 scale. Reviewed the gallery loop at 0.5 s intervals and the HD frame beside the user's reference; this is a motion/material comparison, not an exact replay of crowd positions. The subsequent footwear revision is verified above.
- Rechecked gallery, homepage and library links, mobile scheme controls, and actual PNG/GIF/MP4 exports without browser errors. The website check passes for 93 catalog entries and 325 file references.
- Reviewed the reference at normal speed, 0.20 s intervals, and a 25-frame stride strip at the original 25 fps; reviewed the generated 12 s loop at 1 s intervals and paused editor frames.
- Tested the editor at 1440 × 900 and 390 × 844, including a portrait canvas, scheme save/import/reset/clear, language/theme switching, and browser errors.
- Generated PNG, GIF and H.264 MP4 at 320 × 320 with 15 fps; decoded both motion formats and confirmed eight frames. Generated the gallery loop at 640 × 360 and 15 fps.
