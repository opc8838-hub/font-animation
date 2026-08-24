# Editor interaction contract

Read this contract whenever an effect adds or changes text, asset, scheme, timeline, playback, or export UI. “Looks similar” is not sufficient; the behavior below is the compatibility boundary.

## Text card

- Keep the text input, text color, and background color in the same text-editing card. Do not place the two color fields after advanced motion controls.
- Content edits immediately rebuild derived rows, selected assets, replacement targets, and choreography labels.

## Selected assets and library

Use one asset state model and three distinct surfaces:

1. **Selected layer** — assets already used by the composition. Its compact header shows the real count and an `展开已选` button.
2. **Library** — built-in and uploaded candidates. Put large libraries inside collapsed `<details>` groups. Clicking a library item only selects it; it never inserts or adds by itself.
3. **Single-asset editor** — opened only by an explicit `单独编辑` action on a selected item. Do not duplicate this editor below the compact library.

Required interaction:

- Adding or uploading an asset does not automatically expand the selected layer.
- A separate `添加` or `插入到光标` action commits the current library selection.
- Expanding uses a fixed overlay equal to the existing left-editor width. It shows the complete selected list and does not resize or shift the live stage.
- Each selected row shows preview, name, usage/role, `单独编辑`, and remove. The list supports the effect's meaningful order; when order affects playback, drag and keyboard reorder must update the state model.
- Single editing opens a drawer immediately to the right of the left editor and overlays the stage instead of shrinking it. Closing the drawer keeps the selected list expanded. `Escape` closes the drawer first, then the expanded list.
- The DOM uses `me-layer-panel`, `me-layer-toggle`, `me-layer-items`, `me-asset-drawer`, `me-asset-library`, `me-asset-choice`, `me-asset-editor`, and `me-asset-commit`. The expanded state is `is-list-expanded`.
- Import, reset, clear, text edits, insertion, removal, and reorder all rerender the selected count/list. Do not rebuild the list per animation frame.

## Scheme, choreography, and playback

- The scheme card contains exactly Save, Import, Restore Default, and Clear/Rebuild in the shared two-column layout.
- Choreography uses the shared colored `me-choreo-*` blocks, legend, playhead, and click-to-seek behavior. Phase labels and widths derive from the same timing model as preview/export.
- The stage contains synchronized Pause/Play and Replay controls using `me-stage-controls`.

## Acceptance checks

Test these observable behaviors in a real browser:

1. Library click changes selection but leaves composition text/state unchanged.
2. Explicit commit changes the composition and immediately adds a selected row.
3. Adding another asset does not open the selected manager.
4. Expand shows every selected item; collapse restores the normal editor without changing stage bounds.
5. `单独编辑` opens one drawer only; sliders change that exact asset and export geometry.
6. Close and `Escape` follow the drawer-first order.

Run `scripts/check_editor_contract.py` for a fast structural check, then perform the browser checks above. Static success does not replace interaction testing.
