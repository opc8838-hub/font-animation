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

Always create the Manifest on demand. Do not cache an earlier payload after the user changes text, fonts, icons, row backgrounds, media trim, canvas size, or motion values. The existing `typecascade-scheme.json` remains the editor save/import format; the component Manifest is an additional integration format.

## Rendering without reimplementing the effect

Load the generic custom element and assign the complete Manifest:

```html
<script src="cellmotion-player.js"></script>
<cellmotion-player id="motion"></cellmotion-player>
<script>
  document.querySelector("#motion").manifest = manifest;
</script>
```

The player preserves the composition aspect ratio, opens the effect's existing preview renderer in an iframe, waits for `cellmotion:ready`, and sends `cellmotion:configure`. Its public methods are `play()`, `pause()`, `restart()`, `seek(seconds)`, and `update(composition)`.

The iframe bridge accepts the matching `cellmotion:play`, `cellmotion:pause`, `cellmotion:restart`, and `cellmotion:seek` messages. Preview and exported media therefore continue to use the effect's deterministic Canvas timeline and geometry.

## Paths, assets, and trust boundary

`runtime.entry` in an effect descriptor is relative to the editor/site base used by `createManifest`; generated Manifests contain an absolute URL. Built-in fonts and icons use stable library ids. Uploaded images and background media may be embedded as data URLs in `composition` and `assets`, so consumers must treat Manifest content as untrusted user data and avoid inserting names or strings as HTML.

The v1 pilot sends iframe messages with `"*"` so same-origin local and static-site demos work without deployment-specific configuration. Production hosts should restrict both the target origin and accepted sender origin, serve the renderer from a trusted location, and apply an iframe Content Security Policy appropriate to their asset sources.

## Compatibility rules

- A consumer must preserve unknown fields so effect-specific state can evolve without being erased.
- An unsupported `schemaVersion` or bridge version must produce a clear error rather than silently reinterpret the payload.
- Parameter phase names belong to the effect. Shared timeline colors are semantic UI tokens, not universal choreography names.
- Reduced-motion handling may pause the component, but must not mutate the saved composition.
- A frontend tool should integrate the player when exact motion parity matters; recreating the animation from the prose summary is not equivalent.

## Verification

For every effect descriptor, generate a Manifest from changed live state and verify text, fonts, colors, icons, custom assets, background image/GIF/video data, trim values, transitions, motion parameters, and canvas size. Open the component demo, confirm there is no editor chrome inside the iframe, and exercise play, pause, restart, and seek with a clean console at desktop and mobile widths.
