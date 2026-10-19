## 2026-10-19 review: portrait crop and cover flip

Source: `第一段.mp4`, 1920×1080, 60 fps, 15.8167 s; inspected FFmpeg stills at 0.90, 1.15, 1.45, 1.75, 2.05, 2.35 s (source stills in `patentwall-review/`). Normal-speed clip remains the rhythm reference.

| Time | Observed phase | Geometry / visibility |
| --- | --- | --- |
| 0.90 s | White logo cover held | Centered portrait card, no other cards |
| 1.15 s | Cover begins Y-axis turn | Right edge recedes; card stays centered |
| 1.45 s | Turn crosses thin edge | Backside is about to appear; side cards still hidden |
| 1.75 s | Artwork cover turns to camera | Side cards already appear behind it |
| 2.05 s | Artwork cover settles | Side stack remains aligned behind main card |
| 2.35 s | Spread begins | Neighbor cards move sideways from main card |

Motion contract: keep the existing source timing and front/back art order; the first artwork visible after the flip must be the same artwork as the first carousel card so there is no cut at the phase boundary. Freeze later carousel and wall phase timings. At 9:16, the settled wall artwork should reach all four output edges by intentional center crop, while keeping the 16:9 layout unchanged.

Uncertainty: Source reference contains certificates whereas the editable release uses supplied artworks with different aspect ratios. Preserve the source flip silhouette and overlap, not literal certificate contents.
