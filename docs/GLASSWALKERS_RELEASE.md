# Glass Walkers release

## Entry points

- Editor: `glasswalkers.html?from=gallery&tracking=feet&v=20261103-release-ai1`.
- Component preview: `typecascade-component-demo.html?effect=glasswalkers`.
- Definition: `effects/glasswalkers.component.json`.
- Default component composition: `assets/presets/glasswalkers-default.json`.

The approved renderer, cover and gallery video are byte-identical to the accepted knee-gait revision (`0623cf4`). Editor presentation now uses the shared CellMotion polish, rounded selects, theme-aware logo and five-action For AI menu. The four scheme actions remain Save, Import, Restore Default and Clear; Ctrl/Cmd+Z and Shift+Z provide history without adding scheme buttons. Gallery entry and Reset select the approved footstep code-tracking default. Older flat version-1 schemes remain readable.

## Component contract

The saved editor scheme remains flat. For AI generates a separate live-state `cellmotion-component/v1` Manifest: `canvas` owns dimensions, `motion.speed` owns playback speed, and `scene` owns all remaining figure/material/tracking settings. All 14 declared parameter paths resolve into the current composition. Figures and shoes are procedural: there are no editable text rows, uploaded assets, video trims or font selectors to serialize.

The queued shared bridge invokes the same `GlassWalkersRenderer` as preview and PNG/GIF/MP4. It supports configure, play, pause, restart, seek, duration and composition updates, accepts the parent/referrer-derived origin, and rejects invalid versions/origins. Embedded preview hides editor chrome and ignores editor autosave. The general player and copied HTML preserve canvas aspect ratio across a different hosting origin. Rendering requires WebGL 2.

## Verification

- `node scripts/check-glasswalkers-motion.mjs`: all eight person profiles, both knees, landing/stance/swing timing, planted contact and joint continuity.
- `python tests/glasswalkers-ai-browser.py`: exact approved cover pixels; real rounded dropdown and portrait framing; four scheme actions and keyboard history; all five AI actions and JSON Schema validation; changed live state and all parameter paths; actual player/editor pixel equality; play/pause/restart/seek/update and duration changes; rejected invalid bridge messages; actual copied code hosted on another origin; direct demo; desktop/mobile in Chinese/English and light/dark; clean console.
- `python .codex/skills/build-font-animation-effects/scripts/check_editor_contract.py site/glasswalkers.html site/glasswalkers.js`: procedural-scene shell requirements, without irrelevant text/asset-library checks.
- `python .codex/skills/build-font-animation-effects/scripts/check_shared_contracts.py`: shared runtime/bridge audit.
- `node scripts/check-cellmotion-website.mjs`: site/catalog files and readiness rules.
- Real square PNG/GIF/H.264 MP4 exports after the UI/bridge integration, plus the accepted 12-second 1280×720/30 fps gallery-source export. The editor does not replace deterministic encoding with real-time recording.

Latest `origin/main` was merged before release; the letter-slices release routes, artwork and AI handoff were retained. Only the Glass Walkers entry is added to the public catalog and recent-release ordering.
