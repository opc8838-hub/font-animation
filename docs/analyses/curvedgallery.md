# 弧廊归标 / Curved Gallery

## Source material

Private desktop file: `微信视频2026-10-09_073417_351.mp4`. Do not commit it or extracted frames.
2026-10-09: ffprobe reports HEVC, 592 × 1280, 5.766667 seconds, 115 variable-rate frames, nominal 30 fps. Watch: twelve chronological frames, followed by a 12 fps contact sheet of the actual 592 × 333 composition at y=415. Phone UI, AssistiveTouch, author caption and playback controls are excluded.

## Target

Curved image panels rotate around a cylinder, continuously pull back into a small segmented ring mark, then make room for an upward-masked brand word.

## Evidence / motion contract

| Source time | Visible evidence | Interpretation | Confidence |
| --- | --- | --- | --- |
| 0–1.17s | Same large curved black panels; player shows pause | Recording lead-in, excluded from animation | high |
| 1.17–2.30s | Panel gaps travel horizontally while upper and lower contours remain arcs | One cylinder rotating about its vertical axis; panels themselves are curved | high |
| 2.30–3.45s | Radius and height shrink together; rear narrow vertical strokes become visible | Camera pullback of the complete ring, overlapping rotation deceleration | high |
| 3.45–3.90s | Small mark stabilizes, no word yet | Short mark-only hold | high |
| 3.90–4.45s | Ring moves left; tops of letters emerge from bottom edge | Whole lockup centers; word rises behind a fixed mask | high |
| 4.45–5.50s | Black segmented mark and `Sentr` word remain steady | Final lockup hold | high |
| 5.50–5.77s | Complete lockup turns gray together | Short opacity exit | medium |

The mark is one persistent group. No per-card flyout, spiral, bounce or crossfade to an unrelated logo. Rotation and pullback overlap; no artificial stop between them. Final rear panels reduce to narrow posts while front panels keep their arc. Default twelve slots produce seven upper panels and five visible rear posts. All coordinates derive from output dimensions; aspect changes preserve the composition's geometry rather than stretching it.

## Uncertainties

- Source is a compressed screen recording, not original design files. Exact camera perspective, hidden panel count and source font cannot be recovered with certainty.
- Only black panels are present in the video. User photos are an extension: texture follows the curved panels and settles into the same solid-color mark during pullback. This can be disabled to retain photos in the final ring.
- Visible brand appears to read `Sentr`; it remains editable. Default uses the shared Inter font, the closest available neutral sans-serif.

## Reuse

Type Cascade workspace surfaces and rounded select adapter; shared `me-motion-editor.css` timeline, scheme, asset and playback primitives; shared font and icon catalogs; canonical animated-image decoder; existing GIF and H.264 encoders. Media state uses stable `id`, `source`, `originalDataUrl`, `fileType`, `imageName`, `libraryId`; runtime resources stay out of backups. A Parallax Studio v1 backup imports embedded image textures only (hover shaders are interactive and are not baked into the photo backup).

Preview, PNG, GIF and MP4 call the same deterministic renderer. Curved cylinder panels use overlapping affine Canvas texture strips inside a shared curved outline; no separate export geometry. The cylinder's vertical sides are parallel, so triangles are unnecessary and introduced avoidable diagonal antialias seams.

## Controls

Images and their order/crop, brand text/font/weight/color, background and mark color, twelve-slot count, card gaps, height, curvature/tilt, direction and turns, pullback size, logo/text spacing, photo-to-mark transition; spin/pullback/overlap/mark hold/text reveal/final hold/fade and global speed. Save, import, restore default and clear/rebuild; responsive canvas sizes and deterministic exports.

## Acceptance evidence

- Watch twelve-frame overview and 12 fps source crop inspected; normal-cadence exported frames inspected at 8 fps, including rotation/pullback overlap and upward text reveal.
- Final source vs export compared at source 4.60s / export 3.40s. Final radius, word size and gap adjusted to 174 / 186 / 65 logical pixels to match the lockup bounds. Original camera/font remain approximate; this is a reconstruction, not recovered source geometry.
- `node tests/curvedgallery-motion.test.cjs`: continuity, monotonic pullback, phase overlap, curvature and stable final pose pass.
- Project editor-contract and shared-contract checks pass.
- `python tests/curvedgallery-browser.py`: batch backup conversion, per-image replacement/crop, complete-state reorder, IndexedDB reload, portable save/import, invalid-import rejection, immutable reset, clear, selection-before-insertion, four shared font families, theme/language preservation, three ratios, seeking/replay, mobile/no horizontal overflow and console pass.
- Real PNG, GIF and H.264 MP4 generated and inspected. Full-size gallery video: 1920 × 1080, 30 fps, 138 frames, exactly 4.600s. Portrait video: 360 × 640, 15 fps, 69 frames, exactly 4.600s. GIF: 360 × 640, 69 frames, corrected cumulative centisecond delays total exactly 4600ms (individual 15 fps delays alternate 60/70ms instead of rounding every frame to 70ms).
- Private source, extracted frames, browser screenshots and scratch exports remain outside Git. Gallery poster/video are generated by the authoritative renderer.
- Additional latest-renderer checks: original gallery portrait uploaded and exported; shared hand GIF, Bot GIF and vector line recipe rendered/exported without console errors; 640 × 360 H.264 at 60 fps has 30 frames / 0.500s. Homepage and component catalog contain the new live editor link. All pre-existing catalog entries, featured ids, recent-release order and approved preview revisions compare identical to the remote baseline after removing the one new entry.
