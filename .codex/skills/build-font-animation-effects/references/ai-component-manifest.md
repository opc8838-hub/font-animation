# AI component Manifest

Read this reference when an effect adds or changes the “用于 AI / For AI” handoff, an effect descriptor, `cellmotion-component/v1`, or `<cellmotion-player>`.

## Architecture boundary

- Keep the existing effect renderer authoritative. v1 embeds that renderer through the shared iframe bridge; do not implement a visually similar second animation.
- Keep the editor scheme as its existing save/import format. Generate the component Manifest as an additional live-state view only when the user invokes an AI action.
- Put cross-effect structure in `site/cellmotion-ai-manifest.js`, `site/cellmotion-player.js`, and the JSON Schema. Put capability flags, behavior copy, phase semantics, and parameter definitions in `site/effects/<slug>.component.json`.
- Resolve `runtime.entry` from the editor/site base passed to `createManifest`. The descriptor path itself is not the resolution base.

## Live-state and asset contract

- `composition` is the complete serializable scheme and remains the rendering source of truth.
- Include the current canvas, text, typography, motion, row/page ownership, colors, icons, custom assets, backgrounds, transitions, and video trim. Never export a hard-coded default when the user has edited the composition.
- Index fonts, icon library ids, per-row media, and embedded custom assets under `assets` without removing them from `composition`.
- Do not serialize runtime `Image`, `Video`, canvas, decoder, promise, or seek-cache objects.
- Treat Manifest strings and uploaded data as untrusted input in integrating tools. Preserve unknown fields for forward-compatible effect-specific state.

## Editor surface

- Put one compact “用于 AI / For AI” menu next to the primary export shortcut, outside the canonical four scheme actions.
- The first release exposes Copy AI prompt, Copy configured code, Download component JSON, and View parameter guide.
- Match the approved rounded light/dark editor shell, provide visible focus states, close menus/dialogs with Escape, and keep the header within narrow mobile widths.
- Language switching updates component UI copy without changing composition state or menu structure.

## Player and bridge

- `<cellmotion-player>` preserves the Manifest canvas aspect ratio and waits for `cellmotion:ready` before sending configuration.
- Support configure, play, pause, restart, seek, and composition update through the versioned bridge.
- v1 may use `"*"` for the local/static same-origin pilot. Document that production integration must restrict target and accepted origins; do not imply that wildcard messaging is the production security posture.
- Preview mode hides all editor chrome but does not change renderer geometry, deterministic timing, or composition pixels.

## Adoption levels

Use these labels in reviews and documentation; do not call an effect “AI ready” merely because a descriptor or demo page exists.

1. **Described** — a versioned effect descriptor declares capabilities, behavior, and editable parameters.
2. **Connected** — the editor generates the Manifest from its current live scheme and exposes it through the approved “用于 AI / For AI” menu.
3. **Playable** — the existing authoritative renderer implements ready, configure, play, pause, restart, seek, duration reporting, and live composition updates through the versioned bridge.
4. **Verified** — changed state, animated media, desktop/mobile layout, player controls, origin policy, and a clean console have been checked in the real player.

Type Cascade is the v1 pilot and is the only effect that may currently be labelled Verified. For another effect, add a small effect-owned adapter to the shared bridge/player modules; do not copy `typecascade-ai.js` or claim compatibility after adding only a JSON file.

The v1 schema models Type Cascade's stable rows. Before adapting an effect whose natural composition is scenes, layers, glyphs, or another structure, generalize the shared schema deliberately and preserve that effect's native model. Do not force unrelated effects into row-shaped data.

Animated images must use the shared `CellMotionAnimatedImage` runtime and the source file's frame delays. AI playback, editor preview, paused seek frames, and export must select the same frame from the same composition time.

## Verification

Generate a Manifest after changing text, font, text color, row background color, an inline icon, and a motion parameter. Test an uploaded image/GIF and a trimmed video background and confirm their data remains attached to the correct stable row. Validate the Manifest, load it in the real demo player, exercise play/pause/restart/seek/live update, confirm duration and ready messages, switch languages and themes, check desktop and mobile header layout, and keep the browser console clean. The static contract checker is a gate, not a substitute for this live verification.
