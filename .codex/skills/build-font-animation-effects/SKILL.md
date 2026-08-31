---
name: build-font-animation-effects
description: Build or upgrade effects in opc8838-hub/font-animation using the project's reusable editor, icon library, scheme, timeline, canvas, and export baseline. Use for new effect pages or shared-editor changes in this repository; do not use for unrelated websites.
---

# Build Font Animation Effects

Create the effect-specific motion while reusing the site's established editing and export capabilities. Do not make the user restate the common editor requirements for every new effect.

## Start here

1. For any editor UI or interaction work, read [references/editor-interaction-contract.md](references/editor-interaction-contract.md). It defines observable compatibility with Icon Burst; matching only colors or card shapes does not satisfy it.
2. Read [references/editor-baseline.md](references/editor-baseline.md) before creating or substantially upgrading an effect page.
3. Read [references/reuse-map.md](references/reuse-map.md) to choose the closest existing implementation instead of rebuilding common systems.
4. When the user supplies a reference video or asks to refine a reference-driven effect, read [references/video-analysis-workflow.md](references/video-analysis-workflow.md) before changing motion. It defines the evidence workflow, motion-contract and regression protocol, and the boundary for optional Oil Motion use.
5. When rows or pages can use different colors, images, GIFs, or videos, read [references/per-page-backgrounds.md](references/per-page-backgrounds.md).
6. Preserve the user's unrelated work and commit only the effect or shared baseline files placed in scope.

If the task includes a reference video, use the available video-analysis workflow to inspect both normal-speed rhythm and slowed detail before choosing motion phases. Treat the user's video as visual evidence, not as permission to copy unrelated scene framing. Do not invoke `oil-motion` by default: ordinary kinetic typography, path following, color, icon, layout, Canvas, SVG, CSS, or GSAP work should stay in this skill unless the decision boundary in the video-analysis reference is actually met.

For repeated motion refinement, freeze already approved phases and write a compact motion contract before editing: moving group membership, coordinate frame, phase overlap, path/direction, velocity profile, visibility/afterimage behavior, and the exact exit boundary. Change only the disputed contract item until normal-speed playback and dense frames both support the result.

## Working rules

- Separate the unique choreography from the reusable editor shell.
- Reuse shared fonts and icon/media assets by path; do not duplicate them into each effect.
- Use the project-wide `site/shared-font-library.js` and `site/shared-fonts.css` catalog for every font selector and renderer. New effects must not maintain a private reduced font list.
- Use `site/shared-icon-library.js` as the canonical icon/expression catalog. Consume its `flow`, `gifMotion`, `animals`, and `bots` groups and its deterministic `drawVector()` renderer instead of copying private asset arrays from another effect.
- Present the complete shared `gifMotion` group under `GIF 动图`, including collision GIFs, construct motion, and the transparent black-line cloud, orbit, and coil variants. A new effect must not silently expose only a subset when it claims to use the shared icon library.
- Support arbitrary user text and asset counts. Rebuild dependent controls, timelines, and replacement targets when content changes.
- Whenever an icon can sit beside or replace text, expose a dedicated plain-language `图标与文字间距` control in addition to positional X/Y offsets. Apply it to inline, repeated-row, and final replacement layouts, and keep its normalized spacing identical in preview and export.
- In sequence effects, keep page-owned editing on the page: stable id, order, hold, typography, color, spacing, motion timing, assigned icons, and background/media. Adding, deleting, or reordering pages must rebuild dependent controls without applying one page's values to the others.
- Give every effect editor the Icon Burst choreography UI, not merely a functional timeline. Reuse `me-choreo-track`, `me-choreo-scroll`, `me-choreo-bar`, `me-choreo-block`, `me-choreo-playhead`, and `me-choreo-legend`; preserve the colored phase blocks, visible playhead, legend rows, and click-to-seek behavior.
- Use Icon Burst as the canonical editor UI and interaction language across effects. Implement the state transitions and surface separation in the editor interaction contract, not a lookalike custom hierarchy.
- Treat selected assets, the candidate library, and the single-asset drawer as three different surfaces backed by one state model. Do not auto-expand on add and do not duplicate the single-asset editor under the compact library.
- Put a compact Pause/Play and Replay control group at the horizontal center near the bottom of the live stage, matching Icon Burst. Keep editor-panel playback controls synchronized when both are present.
- Make canvas size the first card in the editor. Selecting 1:1, 4:5, 9:16, 16:9, or custom dimensions must immediately refit the right-side live stage to that exact aspect ratio and composition geometry; keep duration, FPS, and export actions lower in the export card without duplicating size there.
- Keep the selected canvas centered and responsive inside the available right-side workspace. The framed stage is the actual composition, not a decorative mockup, and typography, icons, spacing, and positions must match the selected export dimensions.
- Drive preview and export from the same deterministic timeline and geometry functions. Never maintain a visually similar second renderer with independent constants.
- Treat page-specific backgrounds as page state, not one global decoration. Keep color, uploaded media, video trim, transition style, and transition duration attached to the page through add, delete, and reorder operations.
- Use transform/opacity-based motion and `requestAnimationFrame`; avoid per-frame DOM reconstruction and layout reads.
- Keep analysis provenance internal. Product UI must name the motion itself and must not expose labels such as “参考视频”, “参考编舞”, “原片复刻”, or similar implementation notes.
- Preserve project attribution and existing licenses.

## Skill maintenance discipline

- Keep only cross-effect invariants and routing in this file. Put conditional procedures in `references/`, effect-specific evidence and approved values in `docs/analyses/`, and repeatable deterministic checks in `scripts/`.
- Add a rule only when it changes a future decision and is supported by a repeated or high-cost failure. Consolidate or replace overlapping wording instead of appending another near-duplicate rule.
- Do not promote one effect's approved timing, easing, colors, or preset into a universal default. Preserve those values in that effect's scheme and analysis note.
- When a section becomes specialized enough that most tasks do not need it, move it behind a clearly named reference link rather than growing the entrypoint.

## Completion gate

Before handing off an effect:

- Test editing with different text lengths and more/fewer icons.
- Change icon size and `图标与文字间距` in both the main composition and any final replacement line; confirm adjacent text reflows without clipping and the same spacing appears in a real export.
- In page-based sequences, change two pages independently, reorder them, save/reload, and confirm their typography, timing, icons, and background/media remain attached to the correct content.
- Test at least one Latin, Chinese, Japanese, and Korean font from the shared catalog in preview and export.
- Check that timeline blocks, durations, active beat, playhead, and click-to-seek all stay synchronized after timing edits.
- Test save, reload, JSON export/import, reset, and clear. If undo/redo exists internally, do not add extra visible scheme-card buttons that make the canonical four-action card inconsistent.
- Check that the scheme card shows exactly the shared four Icon Burst actions, choreography uses the colored Icon Burst blocks and legend, library-card clicks do not insert content, and stage Pause/Play and Replay work without desynchronizing the timeline.
- Switch among 1:1, 9:16, and 16:9 before export; confirm the live frame changes aspect immediately while the inspector keeps its bounds, then compare the normalized live composition with a real export at the selected size.
- Run `python .codex/skills/build-font-animation-effects/scripts/check_editor_contract.py <effect.html> <effect.js>` for pages using the shared editor, then test every acceptance check in the editor interaction contract in a real browser.
- Export and inspect at least one real GIF and one real video, not only the live preview.
- Check one square or portrait size in addition to 16:9 when the effect claims multi-size export.
- For page-specific backgrounds, test direct and softened transitions across color, image/GIF, and trimmed video pages; confirm no decode flash and compare the same transition frame in preview and a real export.
- For fast continuous choreography reconstructed from video, compare dense reference and exported frames at every phase boundary. Confirm active elements never freeze accidentally, icons remain in the same motion field as adjacent text, and character-to-icon scans restore each original character and spacing before completion.
- During refinement, confirm previously approved phases remain visually unchanged and that a shared moving group never resets its geometry or splits into independent paths at a transition or exit.
- Confirm the gallery card uses the approved preview. Prefer an approved exported MP4 loop when an iframe would produce a different responsive composition.
- Run syntax checks and `git diff --check`, bump cache versions, and avoid staging unrelated files.
