---
name: build-font-animation-effects
description: Build or upgrade effects in opc8838-hub/font-animation using the project's reusable editor, icon library, scheme, timeline, canvas, and export baseline. Use for new effect pages or shared-editor changes in this repository; do not use for unrelated websites.
---

# Build Font Animation Effects

Create the effect-specific motion while reusing the site's established editing and export capabilities. Do not make the user restate the common editor requirements for every new effect.

## Start here

1. Read [references/editor-baseline.md](references/editor-baseline.md) before creating or substantially upgrading an effect page.
2. Read [references/reuse-map.md](references/reuse-map.md) to choose the closest existing implementation instead of rebuilding common systems.
3. Preserve the user's unrelated work and commit only the effect or shared baseline files placed in scope.

If the task includes a reference video, use the available video-analysis workflow to inspect both normal-speed rhythm and slowed detail before choosing motion phases. Treat the user's video as visual evidence, not as permission to copy unrelated scene framing.

## Working rules

- Separate the unique choreography from the reusable editor shell.
- Reuse shared fonts and icon/media assets by path; do not duplicate them into each effect.
- Use the project-wide `site/shared-font-library.js` and `site/shared-fonts.css` catalog for every font selector and renderer. New effects must not maintain a private reduced font list.
- Support arbitrary user text and asset counts. Rebuild dependent controls, timelines, and replacement targets when content changes.
- Give every effect editor a real visual choreography timeline. It must reflect the current durations, show a moving playhead, and seek when the user selects a beat.
- Use Icon Burst as the canonical editor UI and interaction language across effects. Reuse the `me-scheme-actions`, `me-scheme-import`, `me-scheme-history`, and `me-stage-controls` classes from `site/me-motion-editor.css`; do not invent a different panel, scheme card, button hierarchy, or playback interaction for each effect.
- Put a compact Pause/Play and Replay control group at the horizontal center near the bottom of the live stage, matching Icon Burst. Keep editor-panel playback controls synchronized when both are present.
- Keep the canvas centered and responsive. The right-side stage is the actual composition, not a decorative 9:16 mockup.
- Drive preview and export from the same deterministic timeline and geometry functions. Never maintain a visually similar second renderer with independent constants.
- Use transform/opacity-based motion and `requestAnimationFrame`; avoid per-frame DOM reconstruction and layout reads.
- Keep analysis provenance internal. Product UI must name the motion itself and must not expose labels such as “参考视频”, “参考编舞”, “原片复刻”, or similar implementation notes.
- Preserve project attribution and existing licenses.

## Completion gate

Before handing off an effect:

- Test editing with different text lengths and more/fewer icons.
- Test at least one Latin, Chinese, Japanese, and Korean font from the shared catalog in preview and export.
- Check that timeline blocks, durations, active beat, playhead, and click-to-seek all stay synchronized after timing edits.
- Test save, reload, JSON export/import, reset, clear, undo, and redo when those controls are present.
- Check that the scheme card follows the shared two-column Icon Burst pattern and that stage Pause/Play and Replay work without desynchronizing the timeline.
- Export and inspect at least one real GIF and one real video, not only the live preview.
- Check one square or portrait size in addition to 16:9 when the effect claims multi-size export.
- Confirm the gallery card uses the approved preview. Prefer an approved exported MP4 loop when an iframe would produce a different responsive composition.
- Run syntax checks and `git diff --check`, bump cache versions, and avoid staging unrelated files.
