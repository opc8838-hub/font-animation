# Effect analysis: `switchdrop`（降临）— Apple-style light-off

## Source material

- File: `微信视频2026-10-10_014119_378.mp4` (user's desktop, not committed). It is a screen recording of an Apple Watch Ultra promo.
- Duration / fps / dimensions: 1.69 s, 34 frames at 20.4 fps. The video area is 592 × 332, at y 337–669 in the 592 × 1280 recording.
- Analysis date: 2026-10-10

## One-sentence target

The lit product shot loses its light in about a quarter of a second. The light pool contracts from the frame edges toward the centre, the dimming speeds up, and the last step cuts straight to black. Only rim light and self-lit parts stay visible.

## Phase table

Remaining light is measured relative to frame 14, by elliptical distance r from the frame centre. r = 1 at the middle of each frame edge.

| Frame | τ | r 0–0.3 | 0.3–0.5 | 0.5–0.7 | 0.7–0.9 | 0.9–1.1 | 1.1–1.3 | 1.3–1.5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | 0 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 15 | 0.2 | .987 | .987 | .982 | .973 | .954 | .935 | .917 |
| 16 | 0.4 | .940 | .926 | .906 | .869 | .781 | .711 | .658 |
| 17 | 0.6 | .788 | .753 | .683 | .579 | .440 | .370 | .338 |
| 18 | 0.8 | .338 | .296 | .241 | .192 | .155 | .137 | .130 |
| 19 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Frames 1–13 are lit, with a slow camera move. Frames 19–34 are black, with rim light on the watches and their screens still on.

## Findings

- **Duration:** about 0.24 s (5 frames at 20.4 fps).
- **Curve:** the centre falls 0.99 → 0.94 → 0.79 → 0.34 → 0. It is slow at first and fastest at the very end, with no slow-down into black. The editor's old 「电影调光 · 慢入快出」 curve eased out at the end and settled slowly into black. That is the part that read as un-Apple. 「平衡丝滑」 (smootherstep) and 「快速开关」 (ease-out) also decelerate at the end.
- **Shape:** the edges lead the centre. At τ = 0.6 the centre still has 79 % of its light while the edges have 34 %.
- **Lit frame:** a soft pool. The centre is #dcdbe4, flat out to r ≈ 0.7, then falls to about 0.88 at the edge middles and about 0.63 in the corners.
- **Dark frame:** #010002.

## Implementation

- `site/switchdrop-editor.js` holds the table above. Each column is interpolated over τ with monotone cubics, and linearly across r.
- One elliptical radial gradient multiplies the lit scene by (lit pool × remaining light). The lit scene is the background colour, the media and the subject.
- 「苹果关灯 · 慢入快出（原片）」 uses τ = progress directly. 「平衡丝滑」 and 「快速开关」 keep the measured spatial shape but retime the centre brightness to their own curves.
- Lights-on plays the same measurement in reverse.
- In the dark, the Hely Logo crossfades to its night version. Other subjects get a rim light, drawn as the silhouette minus its eroded copy. The title is drawn on top and is not affected by the light.
- Checked against the reference frame by frame. The remaining light differs by at most 0.04 in every r bin for frames 15–18.

## Editor changes (2026-10-10)

- Rebuilt on the shared row shell used by 字芽, 城市字塔 and 聚光. There are two content rows (主体, 标题).
- Canvas size presets now sit at the right end of the preview toolbar.
- Added an image / GIF / video background with crop and trim.
- Added an overall speed control. The phase timeline is generated from the actual timing.
- Export is PNG, GIF and MP4 at the chosen canvas size. This replaces the old 「当前画板」 and 9:16-only video buttons.
- Fixed truncated asset names (「动」「H」) and the 9:16 export button that wrapped onto four lines.
