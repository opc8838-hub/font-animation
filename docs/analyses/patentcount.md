# Effect analysis: 专利数量

## Source material
- Normal-speed file: `E:/360MoveData/Users/Administrator/Desktop/新的一段/存档/第五段_专利墙.mp4` (source unchanged).
- Parameter record: same directory `参数.json`; 4.8s, H.264, 1920×1080, 60fps, 288 frames, no audio.
- 2fps full contact sheet and 10fps contact sheet of 0–2.5s inspected with FFmpeg on 2026-10-19. No separate slow-motion footage.

## One-sentence target
A close-up artwork pulls back into a softly moving three-row arc of distinct mutedmen works while an editable headline, count and supporting copy enter over a blue glow background.

## Phase table
| Time | Frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0–0.55s | 0–33 | 主卡拉远 | One centered tall artwork starts as an almost full-frame close-up, then shrinks; white recedes into blue. | Logarithmic zoom centered on the hero slot; blue background crossfade starts after 0.25s. | high |
| 0.55–1.45s | 33–87 | 弧形进场 | Neighbors arrive from above/below in distance order; the three concave rows form without the top corners. | Staggered vertical slides toward ellipse slots, 0.95s each with soft landing. | high |
| 1.45–2.8s | 87–168 | 文字与计数 | Headline types in; number races upward and + pops; English subtitle follows. | Overlapping per-glyph rise/alpha, eased count, delayed plus. | high |
| 2.2–4.8s | 132–288 | 说明与巡航 | Lower-left two proof points type in; artworks remain visible and drift slowly along the curved rows. | Slow arc slot shift with ramp-in; no static hold or hard cut. | medium |

## Element model
- Hero image: one editable work (default is a distinct mutedmen artwork).
- Arc: three rows of unique editable works from the existing 196-item patentwall library; default slot assignment does not repeat an image.
- Text: headline, English subtitle, count target, plus mark, two Chinese/English proof points, and independent font/color controls.
- Layer order: editable background → white intro veil → art cards → text and count.

## Spatial rules
- Native coordinates 1920×1080. Arc center (960,150), radii (1138,590); row factors 1/0.82/0.645; slot width 72 at center; yCut 255 with 70px fade; hero is center row slot zero.
- The editor uses the shared stage geometry and export transform. Portrait framing enlarges the central composition with an easing camera, while maintaining readable text.

## Timing and easing
- Total 4.8s. Background transition 0.25–1.4s; art arrival begins around 0.55s; title begins 1.45s; entire arc drifts through the end at 0.16 slots/s after ramp-in.
- The supplied cubic-bezier curves `out`, `wallZoom`, `land`, `soft`, `pop` are the initial motion contract. Phase overlaps are intentional.

## Reuse plan
- Reuse the shared archive editor, timeline, fonts, card library, image/GIF/video background model, scheme save/import/reset, PNG/GIF/MP4 exporters, and For AI manifest.
- Reuse `assets/patentwall/library.json` and its image paths; do not duplicate mutedmen works. Copy only the supplied 1920×1080 wall background into the new effect assets.
- Implement a focused Canvas native renderer for the curved wall and kinetic type.

## Uncertainties to verify
- The provided source uses six repeated certificate photos; the requested mutedmen substitution requires unique default works, changing local color/texture but keeping row timing and geometry.
- The first scene is a continuation of the older Patent Wall finale. This standalone effect begins at that close-up; no earlier logo flip/slide is included.
- Text inside artwork images is pixel content; editable typography applies to the added foreground text.

## Acceptance evidence
- [ ] Normal-speed and key-frame comparison
- [ ] Unique default art mapping
- [ ] Chinese and English editing
- [ ] Desktop/mobile, 16:9 and 9:16
- [ ] No console errors
- [ ] PNG, GIF and MP4 exported
