# Effect analysis: `spotlight`（聚光）

## Source material

- Normal-speed file: `微信视频2026-10-09_235046_504.mp4` (user's desktop, not committed)
- Duration / fps / dimensions: ≈11.7 s, 20 fps effective, letterboxed; video area cropped to height 332 for measurement
- Relevant crop: full video area; the "LOADING" sticker in the source is an overlay and is intentionally not reproduced
- Analysis date: 2026-10-10

## One-sentence target

A point of light flares into a big soft orb with iridescent rays. The orb then pulls together into a cone of light that narrows into a thin beam shining down from above. The beam lights an arc-shaped pool on the floor and then goes dark.

## Phase table

Times are on the reference clock (0–11 700 ms). The editor exposes each phase as one row.

| Time | Phase (row) | Visible evidence | Confidence |
| --- | --- | --- | --- |
| 0.00–0.20s | 光点亮起 ignite | small bluish blob appears at frame centre | medium |
| 0.20–1.30s | 光球绽放 bloom | orb grows to ≈1 U radius halo, soft rays and lens ring | high |
| 1.30–2.60s | 光球收拢 gather | orb shrinks and dims slightly, rays fade | high |
| 2.60–3.20s | 化为光锥 cone | orb collapses into a wide cone (≈60° half angle) | high |
| 3.20–6.00s | 收窄上移 narrow | cone narrows to a beam (≈1°), source rises 0.5→0.21 of height | high |
| 6.00–6.60s | 光柱停驻 hold | beam steady | high |
| 6.60–10.2s | 地面光斑 pool | floor arc and small dot fade in at 0.77 of height | high |
| 10.2–11.4s | 渐暗熄灭 fade | beam shortens, everything fades | medium |
| 11.4–11.7s | 黑场 dark | black | high |

## Element model

- Orb: a radial profile measured from the source (table `ORB` in `spotlight-render.js`), with a blue-white halo (193, 206, 255).
- Rays: 8 fixed angles with soft width 0.07 U.
- Cone/beam: a conic gradient (super-Gaussian across the angle) multiplied by a radial falloff from a virtual apex above the source, so the beam already has width at the source.
- Floor arc: an arc of radius 0.39 U, stroked with a Gaussian-in-angle conic gradient, plus the source-dot ellipse.
- Layer order: soft layer (half resolution, additive, blurred) under the sharp source dot.

## Spatial rules

- U = min(height, width × 9/16). Everything scales with U, so any canvas preset keeps the composition.
- The source is horizontally centred (editable offset). The floor sits at 0.766 of the height (editable).

## Timing and easing

- Total loop: 11.7 s at 1× speed.
- Every quantity is a keyframe track with smoothstep interpolation on the reference clock. Values were fitted to per-frame measurements: mean brightness, glow radius, source y, cone angle, beam length, and pool position, width and brightness.
- Checked by frame index against the source: mean brightness at 0.5 s is 63.0 vs 62.8, at 1.0 s 70.7 vs 76.5, and at 3.0 s 29.5 vs 32.5.

## User-editable parameters

- Overall speed, 0.25–3×. It scales every phase together.
- Per phase: name, duration and brightness gain. "添加停顿" inserts a hold that freezes the previous phase's last frame.
- Overall brightness, hold at end, loop.
- Colours: light/orb, beam, floor pool, background.
- Shape: source x, final source height, floor position, number of rays, beam width, pool width.
- Canvas presets, scheme save/import/restore, PNG/GIF/MP4 export.

## Known differences

- At about 0.15 s the source shows a softer, larger bluish blob than ours.
- The iridescent ring is slightly fainter than in the source.
- The floor arc is slightly whiter than in the source.
