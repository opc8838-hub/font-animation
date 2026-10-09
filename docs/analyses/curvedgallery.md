# 弧廊归标 / Curved Gallery

## Source material

Private desktop file: `微信视频2026-10-09_073417_351.mp4`. Do not commit it or extracted frames.
2026-10-09: ffprobe reports HEVC, 592 × 1280, 5.766667 seconds, 115 variable-rate frames, nominal 30 fps. Watch: twelve chronological frames, followed by a 12 fps contact sheet of the actual 592 × 333 composition at y=415. Phone UI, AssistiveTouch, author caption and playback controls are excluded.

## Target

Curved photo panels rotate, fold their image faces into edges, and continuously pull back into the same black segmented ring. The complete group moves left before the brand word emerges through an upward mask, with a small letter stagger.

## Latest correction: intact pictures first, strokes only after retreat

The user rejects rear strokes visible during the initial rotation. At `0 <= t <= pullStart`, every panel is a full curved picture: no pre-compressed rear geometry, no black back exposed beneath a picture, and no separate stroke objects. Camera retreat/shrink must begin before any narrow black edge appears. The rear faces start below the composition and join the same continuously shrinking ring during retreat. Keep all image identities, camera radius/timing, final ring, left shift, word reveal, editor and exports frozen. Correct only the initial panel width/face visibility and its coupled rear depth; verify actual initial-frame pixels with opaque colored pictures and real photo exports.

## 2026-10-09 user correction: motion contract superseding the first reconstruction

The first release is not accepted: camera pullback starts too quickly, changing front/rear widths at `cos(angle)=0` introduces a discontinuity, photos become black through a full-area opacity overlay, and the mark shifts only when the whole word starts revealing. Preserve image import/editing/export and the single persistent ring. Correct only these coupled motion channels.

- Black panels are replaceable photo surfaces. Texture must follow the curved geometry and visibly compress toward its edge; black backs are part of those same panels. Do not fade a complete photo rectangle to black or swap in a separate logo.
- Source measurements (592px crop, excluding phone/AssistiveTouch): ring horizontal half-span at 2.8/2.9/3.0/3.1/3.2/3.3/3.4/3.5/3.6s is approximately 282/254/219/161/113/83.5/67/61/53.5px. Fit a continuous accelerated-then-braked camera curve; do not use an ease-out that launches the shrink at peak speed.
- Fitted camera interval approximately 2.35–3.77s, cubic Bézier x handles .76/.249 and y handles 0/1. Recording lead-in remains 1.17s. This evidence replaces the original rough phase timing.
- Upper-ring center at 3.7/3.8/3.9/4.0/4.1/4.2/4.3/4.4/4.5s is 293/290.5/286.5/282/268.5/237.5/225.5/221.5/220.5px. Left movement starts before the first visible letter and continues smoothly; the whole ring owns that shift. Its independently fitted Bézier x handles are .794/.375.
- Word begins emerging around source 4.2s, after left shift starts, and is readable by 4.5s. Left-to-right letter reveal has a slight stagger rather than revealing every letter at once.
- Both front/rear geometry and the image-to-black edge compression must be continuous at every angle/time, including rear/front boundaries. Stable final mark and editable text remain in the same composition coordinates. Preview and exports continue sharing one renderer.

## Revised default timing (source / animation seconds)

| Source time | Animation time | Observed and implemented channel |
| --- | --- | --- |
| 0–1.17 | excluded | Paused recording lead-in; phone UI excluded |
| 1.17–2.40 | 0–1.23 | Continuous cylinder rotation |
| 2.35–3.77 | 1.18–2.60 | Accelerated-then-braked pullback, overlapping rotation; photo faces compress into black panel edges |
| 3.65–4.50 | 2.48–3.33 | Whole group shifts left before the word is visible |
| 4.05–4.50 | 2.88–3.33 | Letters rise behind their masks; first visible tops near 4.2s |
| 4.50–5.52 | 3.33–4.35 | Final lockup hold |
| 5.52–5.77 | 4.35–4.60 | Whole lockup fades together |

The same twelve curved panels persist through the entire sequence. Front/rear widths and rear-stroke vertical placement depend on a continuous fold channel; no binary geometry change at `cos(angle)=0`. Back strokes stay lower during pullback, calibrated from the source; this extra depth continuously reaches zero at the final mark. Textures compress in their own clipped geometry, with black backs underneath and constant photo opacity. There is no full-photo fade to black and no swap to a separate logo. Curved strips use one compound path with matching winding; overlapping side projections form a connected end cap rather than cancelling into detached fragments.

## Uncertainties

- Source is a compressed screen recording, not original design files. Exact camera perspective, hidden panel count and source font cannot be recovered with certainty.
- Only black panels are present in the video. User photos are an extension: texture follows the curved panels and its visible face geometrically folds to an edge, revealing the same panels’ black backs during pullback. This can be disabled to retain photos in the final ring.
- Visible brand appears to read `Sentr`; it remains editable. Default uses the shared Inter font, the closest available neutral sans-serif.

## Reuse

Type Cascade workspace surfaces and rounded select adapter; shared `me-motion-editor.css` timeline, scheme, asset and playback primitives; shared font and icon catalogs; canonical animated-image decoder; existing GIF and H.264 encoders. Media state uses stable `id`, `source`, `originalDataUrl`, `fileType`, `imageName`, `libraryId`; runtime resources stay out of backups. A Parallax Studio v1 backup imports embedded image textures only (hover shaders are interactive and are not baked into the photo backup).

Preview, PNG, GIF and MP4 call the same deterministic renderer. Curved cylinder panels use overlapping affine Canvas texture strips inside a shared curved outline; no separate export geometry. The cylinder's vertical sides are parallel, so triangles are unnecessary and introduced avoidable diagonal antialias seams.

## Controls

Images and their order/crop, brand text/font/weight/color, background and mark color, twelve-slot count, card gaps, height, curvature/tilt, direction and turns, pullback size, logo/text spacing, photo-to-mark transition; spin/pullback/overlap/mark hold/group left shift/word delay/text reveal/final hold/fade and global speed. Save, import, restore default and clear/rebuild; responsive canvas sizes and deterministic exports.

## Acceptance evidence for the correction

- Source inspected at normal cadence and 20 fps around both disputed transitions. Fifteen aligned source/render frame pairs compared from source 2.30–4.50s; seven actual Parallax Studio portraits inspected throughout rotation, photo compression, black lockup, left shift and word emergence. Private footage, frame sheets and scratch videos remain outside Git.
- Camera regression uses nine measured source radii at 2.8–3.6s; reconstruction differs by less than 10px in the 592px composition crop. The left-shift regression follows nine measured centers within 5.5px. This is a measured reconstruction, not recovered original camera/font data or proof of pixel-identical frames.
- Initial-picture regression: all twelve photo faces remain complete through `pullStart`. Four opaque-photo frames (0 / .3 / .8 / 1.18s) contain zero black pixels at RGB < 25; the final mark contains over 1000. The previous renderer fails the complete-picture assertion before this fix. Seven real portraits and their 30fps export were rechecked.
- Pure renderer checks: measured camera timing, monotonic radius, front/back continuity, geometric photo compression, optional retained photos, group shift before word, curvature, stable final orientation, fade and global speed.
- Editor and shared contract checks pass. Browser regression passes image backup conversion, reorder/crop/replace, IndexedDB reload, portable save/import, invalid-import rejection, legacy v1 upgrade without losing images/custom text, default/clear, explicit shared-library insertion, four shared fonts, theme/language preservation, aspect ratios, playback/seek and mobile layout. Zero page errors.
- Authoritative real exports: default H.264 MP4 1920 × 1080 / 30fps / 138 frames / 4.600s; all seven original portraits exported at 640 × 360 / 30fps / 138 frames / 4.600s. PNG, portrait H.264 and GIF also checked. GIF cumulative centisecond delays match the complete timeline.
- Scheme version 2 adds independent left-shift and word-delay settings. v1 imports/autosaves retain all images and custom values; untouched v1 timing/height defaults upgrade to the corrected defaults. IndexedDB retains its existing key.
- Only this effect's unaccepted video/poster artifacts are regenerated. Existing catalog entries, featured order, recent releases and unrelated preview files remain frozen.
