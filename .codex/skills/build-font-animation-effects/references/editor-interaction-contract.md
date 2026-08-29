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

## Page-owned sequence editing

- A sequence page uses a stable id. Its order, hold, typography, colors, spacing, motion settings, assigned icons, and background/media stay attached to that id through add, delete, reorder, save, import, and reload.
- Put page-specific controls inside the corresponding page row, using compact disclosures for advanced timing or media. Do not collect the same controls in a detached global list that forces the user to map settings back to rows.
- If fonts, sizes, colors, punctuation colors, letter spacing, segment gaps, reveal styles, or phase timing are editable, each page can override them independently. A global value may remain an explicit inherited default.
- Page order is selected or edited in the row itself. Rebuild available positions immediately when the page count changes.
- Assign assets to explicit pages. Inline icons may be inserted at valid character boundaries and expose a text-to-icon gap; adding an icon must not clone it into every page.

## Canvas size and preview parity

- Canvas size is the first card in the scrollable inspector, before text, assets, motion, scheme, and export controls.
- Preset or custom size changes immediately refit the framed right-side stage to the selected aspect ratio without resizing or shifting the inspector.
- The live renderer receives the selected logical width and height (or an exactly proportional preview surface). Text metrics, icon geometry, spacing, and placement therefore use the same normalized composition as PNG, GIF, and video export.
- The lower export card contains duration, FPS, format actions, progress, and status. Do not duplicate canvas size there.

## Per-page background and media

- Put page-specific background controls inside that page's editor row or its collapsible advanced section. Background edits must not target a different page through a detached global selector.
- Each page can independently use a solid color or uploaded image, GIF, or video. Reorder, insert, duplicate, and delete operations keep the background attached to the same stable page id.
- Video pages expose a visible filmstrip timeline with draggable trim handles plus precise start/end inputs. Preview and export use the same clamped interval.
- Offer direct switching and a softened crossfade with an editable duration. Direct means truly immediate; crossfade blends the outgoing and incoming page backgrounds without a blank frame.
- Do not render debug indices, corner labels, timestamps, watermarks, or other editor-only marks into the composition unless the effect explicitly requires them.
- Keep decoded image/video objects and seek flags outside serialized scheme data. Uploaded media, trim values, opacity/tint, and transition settings must survive save, import, restore, and reload.

## Acceptance checks

Test these observable behaviors in a real browser:

1. Library click changes selection but leaves composition text/state unchanged.
2. Explicit commit changes the composition and immediately adds a selected row.
3. Adding another asset does not open the selected manager.
4. Expand shows every selected item; collapse restores the normal editor without changing stage bounds.
5. `单独编辑` opens one drawer only; sliders change that exact asset and export geometry.
6. Close and `Escape` follow the drawer-first order.
7. Switching 16:9 → 9:16 → 1:1 visibly changes the live frame to each exact aspect ratio while inspector bounds remain stable.
8. A real export at the selected size has the same normalized typography, icons, spacing, and positions as the live frame.
9. Editing one page's typography, timing, icon assignment, or hold leaves every other page unchanged.
10. Adding or deleting a page rebuilds order choices and asset targets without losing existing page ownership.
11. Changing one page's background color or media leaves every other page unchanged.
12. Reordering pages keeps typography, timing, icons, background, video trim, and transition attached to the original page content.
13. A trimmed video page previews and exports the same source interval without flashing between seeks.
14. Direct switching has no inserted fade; crossfade has no blank or uninitialized frame.

Run `scripts/check_editor_contract.py` for a fast structural check, then perform the browser checks above. Static success does not replace interaction testing.
