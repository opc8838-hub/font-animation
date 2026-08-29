# ME Motion Studio development rules

These rules apply to the whole repository and are intended for both human contributors and coding agents.

## Before building a reference-video effect

1. Read [`docs/REFERENCE_VIDEO_WORKFLOW.md`](docs/REFERENCE_VIDEO_WORKFLOW.md) completely.
2. Inspect the video with `ffprobe` and FFmpeg-assisted frame extraction before writing animation code. Do not conclude FFmpeg is unavailable only because it is missing from `PATH`; check bundled workspace runtimes and known dependency directories first.
3. Record the observed phases, timestamps, geometry, easing, visibility changes, and uncertain details in a short analysis note. Use [`docs/analyses/TEMPLATE.md`](docs/analyses/TEMPLATE.md).
4. Treat normal-speed footage as the source of rhythm and slow-motion footage as evidence for ordering, paths, and overlap.
5. Use Watch + FFmpeg + the existing Canvas/SVG/CSS/GSAP runtime by default. Do **not** load `oil-motion` merely because a reference video exists; use it only for generated/pre-rendered semantic motion such as realistic material deformation, articulated bodies, changing topology/occlusion, or a user-requested video/atlas pipeline. The exact boundary is in [`.codex/skills/build-font-animation-effects/references/video-analysis-workflow.md`](.codex/skills/build-font-animation-effects/references/video-analysis-workflow.md).

## UI and rendering baseline

- The current product baseline is **ME Motion Studio**, not the old STG panel.
- Reuse the shared editor layers where possible: `site/workspace-editor.css`, `site/media-layer.js`, `site/media-layer.css`, `site/me-motion-editor.css`, and `site/me-motion-editor.js`.
- Desktop editors use a 420px left inspector and an independent right-hand stage. Mobile uses the stage above the inspector.
- Calculate preview geometry from the actual stage or canvas client size, never blindly from `window.innerWidth`. Text and compositions must stay centered in the stage after the editor width is excluded.
- The inspector must scroll independently and expose every control.
- New effects should support Chinese text and the repository font library where applicable.

## Expected editing and export capability

- Expose timing controls for visually meaningful phases, not a long list of unexplained low-level values.
- Preserve editable direction, speed, spacing, size, alignment, colors, and hold durations when those concepts exist in the reference.
- When images or icons participate in the animation, reuse the shared media/resource model instead of creating a second incompatible uploader.
- Provide PNG, GIF, and video export when the effect uses the modern canvas export stack. GIF/video duration and output size must be selectable.
- Verify export rendering from output dimensions, not the browser viewport.

## Git scope

- Start a dedicated branch for each new effect or focused refinement.
- Do not overwrite unrelated work from another contributor.
- Commit only the new effect, its shared changes, gallery/navigation entries, preview image, documentation, and tests needed for that effect.
- Before merging, compare against the latest `origin/main`, resolve shared gallery/navigation changes deliberately, and test the combined result.

## Definition of done

- The reference analysis has a phase table and an uncertainty list.
- The animation is checked at normal speed and at key paused frames.
- Desktop centering, inspector scrolling, and mobile layout are checked.
- Chinese input is tested.
- Browser console is clean.
- Relevant PNG/GIF/video exports are actually generated at least once.
- The gallery card, global navigation, effect count, and README are updated.

## Reusable project skill

When creating a new motion effect or adding shared editor/export capabilities in this repository, use the project skill at [`.codex/skills/build-font-animation-effects/SKILL.md`](.codex/skills/build-font-animation-effects/SKILL.md). Read its referenced baseline or reuse map only when the current task needs that detail.

The skill supplies the default requirements for the shared icon library, asset sizing/spacing, scheme save/import/reset/clear/undo/redo, timeline controls, responsive canvas, and PNG/GIF/video export. The user should not need to repeat those requirements for each effect.

## Low-token continuation

For a fresh chat or another computer, follow [`docs/CONTINUE_EFFECT_DEVELOPMENT.md`](docs/CONTINUE_EFFECT_DEVELOPMENT.md). Do not scan the full repository, README history, or old conversations by default. Start from the requested effect's HTML/CSS/JS and load only the conditional references named in that document.
