# CellMotion editor standard

Status: approved by the user on 2026-09-08. Type Cascade (`site/typecascade.html`) is the current visual and interaction reference.

Use this reference for every new editor and every migration of an existing effect. The standard defines the editor shell and product behavior; it does not standardize the effect's choreography or force every effect into the same controls.

## Shared product shell

- Use current CellMotion identity, copy, and theme-aware logo assets. Do not restore ME Motion Studio or legacy STG branding.
- Desktop uses one viewport-height workspace: compact page header; left content/page navigation and the four scheme actions; center composition stage, playback, and colored timeline; right properties with `当前段落 / 动效设置 / 导出`. Each working column scrolls internally so ordinary editing does not require long page scrolling.
- The center frame is the real selected composition ratio. Size changes refit 1:1, portrait, vertical, landscape, or custom canvases immediately without moving the side columns. The editor may show rounded frame corners, but PNG/GIF/MP4 exports remain the exact rectangular canvas.
- Mobile keeps the stage first, uses a compact horizontal page/row selector, and places properties below it without horizontal overflow.
- The icon/media library occupies an adjacent responsive surface and never covers the composition. On medium widths it may replace the property panel; on mobile it follows the visible stage.

## Visual language

- Use the approved rounded hierarchy: approximately 20px for primary panels, 14px for cards/disclosures, and 10px for controls. Do not leave actions, status rows, selects, or disclosures as square or visually detached elements.
- Use the CellMotion neutral surfaces in both light and dark themes. Purple is the editing/control accent; fluorescent growth green is reserved for primary actions, selected navigation, and high-value emphasis. Maintain readable contrast in both themes.
- Theme switching uses a short visual transition (currently 240ms) and crossfades the correct light/dark logo. Theme and language preferences are editor preferences, not composition state.
- Use a 14px desktop control-text baseline and a larger primary text input (Type Cascade currently uses 17px). Labels, units, values, and buttons align to stable columns.
- Controls belonging to one row/page share the same inner left and right edges. Text/background color controls, compact disclosures, and asset actions must not alternate between unrelated widths.
- Row/page actions such as `插入图标`, `暂停修改`, and asset count live in a complete rounded toolbar rather than floating as unframed text.
- A collapsed background disclosure shows the current background color as a swatch, not a disabled-looking `纯色` label. The expanded section owns color, image/GIF/video upload, transition, and video trim controls.
- All native-looking dropdowns use the approved rounded trigger, inset arrow, rounded popover, rounded options, grouping, keyboard behavior, and theme colors.

## Shared editing behavior

- Chinese and English switch in place without changing control grouping, column widths, composition state, user-entered text, option values, or uploaded filenames. `动效设置` becomes `Motion`; it may contain more or fewer controls by effect.
- Row/page text, font, color, hold, assigned assets, effect-specific timing, and background/media remain owned by a stable row/page id. Reorder, add, delete, save, import, and reload move the complete state together.
- Each applicable row/page exposes its own text color and background. An explicit apply-to-all action may copy a color, but it must not silently replace independent images, GIFs, videos, trim values, or transitions.
- Backgrounds accept solid color, image, GIF, and video. Video exposes filmstrip trimming with start/end values. Local image processing may remove a simple connected background without an AI dependency.
- The optional `铺满背景` presentation mode extends the active composition background through the stage for recording or presentation. It must not change canvas size, typography, icon geometry, saved composition, or export pixels.
- Use the shared font catalog and icon/media model. Candidate selection is separate from insertion; inserted assets have an explicit focused editor and row/page ownership.
- Keep exactly Save, Import, Restore Default, and Clear/Rebuild in the shared scheme surface.

## Timeline, playback, and export

- The timeline uses rounded colored blocks, readable effect-specific phase names, real phase durations, a visible playhead, click-to-seek, and synchronized stage Pause/Play and Replay controls. Do not replace it with generic gray blocks or reuse another effect's phase copy.
- Preview, seek, PNG, GIF, and MP4 share the effect's deterministic clock, renderer, logical dimensions, and geometry. Editor theme, language, panel layout, and presentation backdrop never enter exported composition state.
- Export keeps duration, FPS, format actions, progress, and status together without repeating the canvas-size selector.

## What varies by effect

Preserve and expose the controls needed by the actual motion. The following are intentionally not fixed by the standard:

- row, page, scene, layer, particle, path, 3D, or other composition model;
- phase names, number of phases, timings, easing, direction, overlap, and loop rules;
- amount and grouping of motion controls;
- asset roles, replacement logic, physics, path data, masks, brushes, or media choreography;
- default text, colors, assets, presets, and approved gallery preview.

Place common or frequently adjusted values first. Keep specialist or low-frequency controls in rounded disclosures near the object or phase they affect. A complex effect may have a longer `动效设置` panel; it still uses the same shell, alignment, typography, theme, language, timeline, scheme, and export rules.

## Migration rule

Migrate one effect at a time. Freeze its approved choreography, preset, gallery artifact, state ownership, and export geometry before changing its editor. Reuse the Type Cascade shell as the reference, but do not copy Type Cascade timing or renderer logic.

Current reference files are `site/typecascade.html`, `site/typecascade-workspace.css`, `site/typecascade-workspace.js`, `site/typecascade-polish.css`, `site/typecascade-polish.js`, `site/typecascade-selects.js`, and `site/typecascade-locale.js`. When a second editor needs the same behavior, move stable shell behavior into a shared CellMotion module or a parameterized adapter instead of duplicating effect-specific state code.

Verify each migrated effect independently in both themes and languages, at desktop and mobile widths, with representative canvas ratios, a clean console, and real exports when rendering or export code changed.
