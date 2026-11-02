# 玻璃漫步 / Glass Walkers

## Source and scope

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

- The reference uses volumetric WebGL shadows; this effect uses original Canvas geometry, projected leg segments, gradients and a fine dot screen. The gait separates a planted-foot interval from the lifted-foot interval. Exact body anatomy and cat cadence are approximations.
- The reference has no global phase boundaries. The editor's timeline marks overlapping people crossings and the animal passage inside a 12-second repeatable export window.

## Verification

- Reviewed the reference at normal speed, 0.20 s intervals, and a 25-frame stride strip at the original 25 fps; reviewed the generated 12 s loop at 1 s intervals and paused editor frames.
- Tested the editor at 1440 × 900 and 390 × 844, including a portrait canvas, scheme save/import/reset/clear, language/theme switching, and browser errors.
- Generated PNG, GIF and H.264 MP4 at 320 × 320 with 15 fps; decoded both motion formats and confirmed eight frames. Generated the gallery loop at 640 × 360 and 15 fps.
