# Editor migration playbook

Read this reference only when adapting an existing effect to the approved CellMotion editor standard. The goal is a consistent product shell, not uniform choreography or identical motion settings.

## Scope and unit of work

- Migrate one effect per focused task and branch. Finish browser and export verification for that effect before opening the next migration.
- Do not run a site-wide codemod, copy one renderer across unrelated effects, or update every gallery asset in one pass.
- Keep shared-shell improvements narrowly reusable. If a shared change would alter an already approved effect, split it from the migration or protect the old behavior behind explicit compatibility logic.
- Limit the change set to the selected effect, genuinely shared editor modules required by it, its approved preset, cache keys, tests, and its gallery preview when the user approves replacement.

## Freeze the effect before changing its editor

Record a compact preservation contract:

- Default scheme and entry-path precedence: approved default versus working autosave.
- Motion phases, total cycle, loop boundary, easing, overlap, and the stable frame used for editing.
- Text/page/asset ownership and any effect-specific state that must remain independently editable.
- Supported canvas sizes and normalized composition geometry.
- Existing PNG/GIF/video export formats and the approved gallery artifact.

Use scoped diffs or checksums for frozen presets and gallery media. Do not regenerate approved bytes merely because the surrounding editor changed.

## Classify before choosing a reuse path

Choose the nearest capability family, then compose only the pieces needed:

1. **Row or page typography** — start from the current Morph Ports/Glyph Morph row editor for per-row text, fonts, inline icons, pause-to-edit, backgrounds, schemes, timeline, and deterministic export.
2. **Media-led page sequence** — combine the row editor with Continuation's page-owned upload, filmstrip trim, and direct/crossfade background model.
3. **Asset choreography** — retain the effect renderer and use Icon Burst's selected/library/single-editor state model and choreography UI.
4. **Particle, physics, 3D, path, or multi-layer effects** — keep the specialized renderer and expose its meaningful parameters through the shared shell. Do not force it into text rows or remove controls needed to reproduce its motion.

An effect may combine families. Shared layout and state surfaces can be reused without copying another effect's timing or animation formulas.

## Required migration outcome

Unless genuinely irrelevant to the selected effect, the migrated page provides:

- Canvas size first; independently scrolling inspector and unobscured live stage.
- Shared font catalog, including per-row/page overrides where text units are independent.
- Row/page-owned controls for content, hold, effect-specific timing, icons, and background/media.
- `插入图标` and `暂停修改` on each applicable row; compact icon chips with a small `编辑` action.
- A responsive adjacent library drawer with selection-only tiles and an explicit nearby `插入` action.
- Exactly Save, Import, Restore Default, and Clear/Rebuild in the scheme card.
- Colored choreography blocks, playhead, click-to-seek, stage Pause/Play, and Replay.
- One deterministic clock and geometry path shared by live preview and real PNG/GIF/video export.
- GIF icons and GIF backgrounds decoded through `cellmotion-animated-image.js`, preserving source frame delays instead of a fixed per-effect FPS.

Keep advanced or effect-specific controls inside compact disclosures near the row, page, layer, or phase they affect. Do not hide useful complexity by deleting it, and do not dump every low-level value into the default view.

Use the Type Cascade three-column shell, theme, language, rounded hierarchy, aligned row tools, stage, and timeline as the reference. `动效设置` may contain additional sections or controls required by the effect; preserve them and organize them rather than forcing Type Cascade's parameter count.

## Conflict rules

- **Shared editor versus approved motion:** approved motion wins. Adapt the editor to the renderer, not the renderer to a simpler example.
- **Global control versus independent units:** use a clearly labeled inherited global default plus per-unit overrides.
- **Opening motion versus row editing:** Replay includes the opening from time zero; row pause and icon edit land on the complete stable row.
- **Single-row sequence:** preserve a meaningful entrance/exit/reset cycle instead of becoming a static frame. Set the minimum row count from semantics, not from another effect's implementation.
- **Large library versus canvas space:** the canvas stays visible. Refit beside the drawer on wide desktop, replace/overlay the inspector at medium widths, and keep the stage above the sheet on mobile.
- **Old saved schemes versus new fields:** migrate missing fields from immutable defaults; never mutate the approved default source with autosaved state.
- **Gallery preview versus editor responsiveness:** replace the preview only after the migrated effect is approved and a real card-size export has been inspected.

## Per-effect completion gate

Run the editor interaction contract and the normal effect completion gate, then specifically verify:

1. The frozen motion phases and default composition remain visually unchanged except for user-approved additions.
2. One row/page can be edited without changing another; add, delete, reorder, save, import, and reload preserve ownership.
3. Every row pause and icon edit shows the entire intended row at a stable frame.
4. Replay begins at time zero; opening, loop, and single-row behavior remain complete.
5. The library never causes inspector down-then-up scrolling and never covers the composition.
6. At least 1:1, 9:16, and 16:9 live layouts match real export geometry.
7. The browser console is clean and at least one real GIF and MP4 have been inspected.
8. Only after approval, update that effect's preset/gallery artifact and move to the next migration.
9. Run `check_shared_contracts.py`; private `ImageDecoder` ownership or a missing shared-runtime script is a migration failure.
