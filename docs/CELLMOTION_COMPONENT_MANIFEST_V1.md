# CellMotion Component Manifest v1

`cellmotion-component/v1` is the portable handoff format between a CellMotion editor and an AI-assisted frontend workflow. It carries the selected effect, its runtime contract, editable parameter definitions, and the user's current composition without introducing a second animation implementation.

The JSON Schema is [`site/schemas/cellmotion-component-v1.schema.json`](../site/schemas/cellmotion-component-v1.schema.json). Type Cascade is the first implementation; its descriptor is [`site/effects/typecascade.component.json`](../site/effects/typecascade.component.json), and the working example is [`site/typecascade-component-demo.html`](../site/typecascade-component-demo.html).

## Manifest shape

| Field | Purpose |
| --- | --- |
| `schemaVersion` | Manifest format version. v1 is `1.0.0`. |
| `generator` | Identifies CellMotion and confirms that the payload came from live editor state. |
| `effect` | Stable effect id, localized name, version, and category. |
| `runtime` | Rendering entry point and iframe bridge version. |
| `capabilities` | Features an integrating frontend may expose or describe. |
| `behavior` | Human-readable effect summary and effect-owned phase semantics. |
| `parameterDefinitions` | Paths, scopes, types, units, and bounds for AI/UI tools. |
| `composition` | Complete serializable editor scheme at the instant the user chooses “用于 AI”. |
| `assets` | A dependency index for fonts, icons, row backgrounds, and embedded custom assets. |
| `presentation` | Autoplay, responsive fitting, and reduced-motion intent. |

`composition` remains the rendering source of truth. It contains canvas geometry, typography, motion values, stable row ids, text, per-row font and color choices, inline icons, background media, video trim values, and transitions. `assets` is an index for integration and inspection; it does not replace the composition fields.

Curved Gallery is also verified with its native `{effect: "curvedgallery", version: 2, settings, assets}` composition. Canvas geometry comes from `settings.width/height`; ordered image assets retain their embedded data, crop, opacity, shared library identity and per-image effects. Its [descriptor](../site/effects/curvedgallery.component.json) declares 55 editable parameter paths. The asset index references `composition.assets[i]` instead of duplicating embedded image bytes. No synthetic rows are introduced.

## Creating a live Manifest

Load `cellmotion-ai-manifest.js`, fetch the effect descriptor, and pass the current scheme exposed by the editor bridge:

```js
const definition = await fetch("effects/typecascade.component.json").then((response) => response.json());
const manifest = CellMotionAI.createManifest({
  definition,
  scheme: CellMotionEffectBridge.getScheme(),
  baseUrl: document.baseURI
});
```

Always create the Manifest on demand. Do not cache an earlier payload after the user changes text, fonts, icons, row backgrounds, media trim, canvas size, or motion values. Each effect's existing scheme remains its editor save/import format; the component Manifest is an additional integration format.

## Rendering without reimplementing the effect

Load the generic custom element and assign the complete Manifest:

```html
<script src="cellmotion-player.js"></script>
<cellmotion-player id="motion"></cellmotion-player>
<script>
  document.querySelector("#motion").manifest = manifest;
</script>
```

Generated code loads the shared player script from the renderer's `runtime.entry` host using a classic script before assigning the Manifest. The player preserves the composition aspect ratio, opens the effect's existing preview renderer in an iframe, waits for `cellmotion:ready`, and sends `cellmotion:configure`. Its public methods are `play()`, `pause()`, `restart()`, `seek(seconds)`, and `update(composition)`.

The iframe bridge accepts the matching `cellmotion:play`, `cellmotion:pause`, `cellmotion:restart`, and `cellmotion:seek` messages. Preview and exported media therefore continue to use the effect's deterministic Canvas timeline and geometry.

## AI adoption status

AI compatibility is graduated: **Described** (descriptor), **Connected** (live editor Manifest), **Playable** (ready/configure/play/pause/restart/seek/duration/live-update bridge), then **Verified** (real player and media checks). A descriptor or standalone demonstration page alone is not an AI-ready integration.

Type Cascade, Curved Gallery, Card Login and Card Deck are Verified. Other effects should reuse the shared Manifest/player/bridge modules and add a small effect-owned adapter; they must not copy the Type Cascade bridge into parallel implementations. The v1 schema accepts the existing row composition, Curved Gallery's native settings/assets composition, and the card editors' native canvas/motion/scene or canvas/motion/cards compositions. Future adapters must preserve their native models when extending the shared schema.

Card Login and Card Deck use `cellmotion-effect-bridge.js` and the same deterministic `CardMotion` renderer for editor preview, media export and AI playback. Their live Manifests preserve login text and flip timing, ordered cards and individual transforms, fonts, library identities, embedded media and video trim. See [CardBot editors](CARDBOT_EDITORS.md) for integration examples and limits; a rendered login is a visual component, not an authentication service.

System and uploaded GIFs use `CellMotionAnimatedImage`; source frame delays are authoritative. Preview, pause/seek, export, and AI player playback must derive the displayed frame from the same composition time.

## Paths, assets, and trust boundary

`runtime.entry` in an effect descriptor is relative to the editor/site base used by `createManifest`; generated Manifests contain an absolute URL. Built-in fonts and icons use stable library ids. Uploaded images and background media may be embedded as data URLs in `composition` and `assets`, so consumers must treat Manifest content as untrusted user data and avoid inserting names or strings as HTML.

The shared player sends messages only to the renderer's origin and accepts messages only from its iframe with that origin. Curved Gallery registers a small adapter with `cellmotion-effect-bridge.js`; the bridge accepts only its parent window and the parent origin derived from the document referrer (same-origin fallback). Configure and subsequent playback commands are serialized so asynchronous image/font loading completes first. Integrations must retain a usable referrer when hosting the renderer across origins. Unsupported schema/bridge versions raise a clear player error. The earlier Type Cascade effect-side pilot bridge still uses wildcard replies; its receiver has not been migrated by this change. Serve renderer scripts from a trusted location and use an iframe Content Security Policy appropriate to the assets.

## Compatibility rules

- A consumer must preserve unknown fields so effect-specific state can evolve without being erased.
- An unsupported `schemaVersion` or bridge version must produce a clear error rather than silently reinterpret the payload.
- Parameter phase names belong to the effect. Shared timeline colors are semantic UI tokens, not universal choreography names.
- Reduced-motion handling may pause the component, but must not mutate the saved composition.
- A frontend tool should integrate the player when exact motion parity matters; recreating the animation from the prose summary is not equivalent.
- An effect may be labelled AI ready only after all four adoption levels pass; static schema checks do not replace live player verification.

## Verification

For every effect descriptor, generate a Manifest from changed live state and verify every declared capability: text, fonts, colors, icons, custom assets, image/GIF data, motion parameters and canvas size; verify video trim and transitions when supported. Open the component demo, confirm there is no editor chrome inside the iframe, and exercise play, pause, restart, seek, live update, ready, and duration reporting with a clean console at desktop and mobile widths.

Curved Gallery's `tests/curvedgallery-ai-browser.py` validates all 55 parameter paths against edited live state and the JSON Schema, all five For AI actions, exact editor/player pixel equality for photos, variable-delay GIFs, vectors and effects, playback/seek/update/duration, real cross-origin copied-code embedding, invalid sender/protocol rejection, Type Cascade compatibility, and mobile/theme/language layout. Timeline checks verify full available width, true duration-scaled positions, separate non-overlapping lanes and correct phase seeking.

The card editors add `tests/cardmotion-acceptance.py`, `cardmotion-media.py`, `cardmotion-bridge.py` and `cardmotion-seams.py`: desktop/mobile layouts, live state round-tripping, decoded PNG/GIF/MP4 exports, GIF frame delays, video trim, cross-origin copied code, asynchronous configure/playback ordering, origin/version rejection, and white-face seam regression checks.
