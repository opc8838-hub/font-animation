# Approved release, Dot Resolve deferred

User approved publishing all reviewed changes except Dot Resolve on 2026-09-04.

- Publish Sprout Shift, Mist Lift, Type Cascade, Glyph Reveal and Glyph Morph editor refinements.
- Publish four 640 × 360 wide cover movies, capped at 640 CSS px, and the exact desktop-approved Type Cascade preset.
- `morphports-reviewed.js` and `glyphmorph-reviewed.css` are a temporary rollout boundary. Approved pages use these files; the published Dot Resolve HTML, its original runtime/CSS, preset, cover and gallery configuration stay unchanged until its replacement sample is approved. Do not silently point Dot Resolve at the reviewed runtime.
- Keep local Dot Resolve development and its wide preview outside the release commit. When it is approved, consolidate the versioned runtime/CSS deliberately and rerun shared regressions.
- Parent the release on the latest origin/main, retaining its Continuation centering and centered-card changes.
- Previous browser and real-export verification is recorded in `morph-responsive-playback.md`. Re-run static checks and browser smoke checks after the dependency split.
