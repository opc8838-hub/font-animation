# Shared icon library maintenance

Read this reference when importing, replacing, or expanding assets in `site/shared-icon-library.js`. The library is shared product infrastructure: update it once, preserve stable ids, and let every effect consume the same groups.

## Canonical inventory

- `groups.flow`: shared flow/vector candidates.
- `groups.gifMotion`: the complete animated GIF and deterministic construct-motion collection.
- `groups.animals`: transparent PNG animals. The current catalog is `animal-01` through `animal-59`.
- `groups.bots`: animated Bot GIFs.

Never copy these arrays into an effect or freeze a group count in editor code. Render the current group, name, `libraryId`, URL, and file type from `STGIconLibrary`.

## Adding transparent animal assets

1. Inspect every source file for dimensions, format, and a real alpha channel. A checkerboard shown by an image viewer is not evidence; inspect pixel alpha and confirm the background contains transparent pixels.
2. If the source is opaque, remove the background before it enters the repository. Check hair, ears, whiskers, antlers, and soft shadow edges at high zoom; do not leave white or dark matte halos.
3. Export a tightly framed transparent PNG with the subject optically centered. Preserve useful soft edge alpha and avoid arbitrary square background plates.
4. Append the next sequential filename and stable id, such as `animal-60.png` / `animal-60`. Never renumber or reuse an existing id because saved schemes refer to it.
5. Keep new animals in `groups.animals`; do not invent another category merely because they arrived in a later batch.
6. Update `site/shared-icon-library.js` once. Consumers must derive the visible count from `groups.animals.length`, not from a duplicated numeric constant.
7. Bump the `shared-icon-library.js` query version in every direct HTML consumer changed by the addition. Do not edit unrelated pages solely to normalize old cache strings.

## Candidate and editing UI

- Put large groups in collapsed `<details>` sections and keep the active group scrollable inside a side drawer.
- The main candidate tile is selection-only. Give every tile a nearby small explicit `插入` button for one-step commit at the active target; selecting a tile alone must never mutate the composition.
- Opening the library must not scroll the main inspector or cover the composition canvas. Use a reserved adjacent column on wide desktop, replace/overlay only the inspector at medium widths, and keep the stage above a lower sheet on mobile.
- After insertion, show the icon on its owning text row with preview/name, boundary, and a small `编辑` button. Opening edit pauses on that row's fully readable frame.
- Keep selected items, candidates, and focused single-icon editing as distinct views backed by the same serialized asset state.

## Verification

- Confirm every new file decodes, has non-opaque pixels where transparency is expected, and has no visible matte on both light and dark test backgrounds.
- Confirm the library count and final id in a real browser; open the last group page rather than assuming registration succeeded.
- Insert one early and one newly appended asset into different text rows. Verify boundary, size, text gap, X/Y, save/reload, JSON export/import, Restore Default, and removal.
- Check a paused live frame and one real exported frame at the same timestamp. The artwork, alpha edge, optical center, size, and text gap must match.
- Check desktop and mobile drawer geometry, candidate-adjacent insertion, and console/network errors.
