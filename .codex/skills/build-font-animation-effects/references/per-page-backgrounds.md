# Per-page Background and Media

Read this reference when a sequence lets individual rows, pages, scenes, or slides use different background colors or uploaded media.

## State ownership

- Give every page a stable id and store its background on that page: solid color, optional media, opacity/tint, transition style, transition duration, and video trim values.
- A global background may act as the default for newly created pages, but it must not silently overwrite pages the user has edited independently.
- Add, delete, duplicate, and reorder operations move the complete page state together. Remove runtime media caches only when their owning media is no longer referenced.

Keep serializable media data separate from runtime objects. Scheme JSON may contain the source name, MIME type, data URL or stable project path, opacity/tint, trim start/end, and transition settings. It must not contain `Image`, `Video`, canvas, decoder, promise, or seek-state objects.

## Editor behavior

- Put the controls in the corresponding page row, normally inside a compact `本行背景 / 元素` disclosure. The user should not have to choose the page again in a detached card.
- Always show the page color. Support upload, replace, and remove for the image/GIF/video formats already handled by the renderer.
- For video, show a filmstrip timeline with two draggable handles and precise start/end number inputs. Clamp both values to the decoded duration, keep a positive clip length, and update all representations from one state.
- Offer `直接切换` and `柔和叠化`. Direct adds no transition frames. Crossfade exposes a duration precise enough for short motion work, including hundredths of a second when appropriate.
- Preserve a deliberate direct-switch option; do not force every background change through a fade.
- Do not add debug page numbers, corner stamps, timestamps, watermarks, or safe-area guides to the rendered composition unless explicitly requested.

## Preview and export

- Use the same deterministic page timeline and background compositor for the live stage, PNG, GIF, and MP4.
- Scale and crop media from the selected logical canvas size so 1:1, portrait, vertical, and landscape previews show the same composition as export.
- Base video time on the page-local time and the selected trim interval. Export must seek the source and wait for the requested frame; never depend on a live autoplay clock.
- Keep the outgoing rendered background visible while incoming media decodes or seeks. A crossfade blends outgoing and incoming frames; it must not fade through an uninitialized transparent or black frame.
- GIF and animated image playback must follow the deterministic effect timeline rather than a separate DOM animation clock.

## Verification

In a real browser:

1. Assign different colors to two pages and confirm changing either one does not mutate the other.
2. Upload an image/GIF to one page and a video to another, then reorder the pages and verify ownership is preserved.
3. Trim the video with handles and numeric inputs; reload or import the scheme and confirm the same interval returns.
4. Compare direct switching with a short crossfade and inspect the boundary for blank, black, stale, or flashing frames.
5. Switch among 16:9, 9:16, and 1:1 and confirm media crop, text, and icons match a real exported frame.
6. Inspect a real GIF and MP4 containing the trimmed video and at least one background transition.
