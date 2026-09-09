# CellMotion timeline color contract

Status: global editor requirement. This contract applies to every CellMotion effect editor. It is not derived from Water Flow, Type Cascade, or any other individual effect.

## Content comes from the effect

- Timeline copy names the actual visible phases of the current effect. Derive labels from that effect's deterministic timing model and motion contract.
- Never copy another effect's phase names, order, timing, or explanation. Do not describe a new editor as "following the Water Flow timeline" or any equivalent effect-specific reference.
- Repeated instances of the same semantic phase keep the same label family and color inside one effect. Different semantic phases must remain visually distinguishable.

## Color is a shared UI language

Use the shared CellMotion chromatic palette. The palette is global; the mapping of colors to phase meanings is owned by each effect.

| Token | Default fill |
| --- | --- |
| `--me-phase-lime` | `#d7ff2f` |
| `--me-phase-sky` | `#8ec8ff` |
| `--me-phase-violet` | `#d4b8ff` |
| `--me-phase-coral` | `#ffc4d6` |
| `--me-phase-amber` | `#ffd27d` |
| `--me-phase-mint` | `#9de7d7` |

- An enabled phase block uses a chromatic fill. Neutral gray is reserved for the track, gaps, disabled controls, unavailable state, and secondary chrome; it is not a normal phase color.
- If an effect has three or more visibly different phase types, its timeline uses at least three distinct chromatic fills. If it has two phase types, use two distinct chromatic fills. A genuinely single-phase effect may use one.
- Fluorescent lime is one palette member, not the default for every unclassified block and not a substitute for the multi-color system.
- Do not alternate colors merely by row index when the blocks describe different semantics. Assign colors by the effect's phase meaning, then repeat that mapping consistently.
- Keep the semantic color mapping stable in light and dark editor themes. Adjust surrounding surfaces and text contrast rather than replacing all blocks with theme-colored gray.
- Active state is shown by the shared outline/playhead treatment. Do not recolor the active block in a way that destroys its phase identity.

## Shape, text, and behavior

- Every phase block is a filled rounded rectangle. Use a 12px minimum block radius in the shared editor; do not render square blocks or thin color strips on gray cards as the primary timeline.
- Show the phase name inside the block. Show its current row/page/content and duration when width permits; preserve the full accessible label or detail-row entry for narrow blocks.
- Block width comes from the real phase duration. The playhead, click-to-seek target, legend/detail row, preview, and export all use that same timing source.
- Color alone is never the only meaning: labels, order, duration, playhead, and active outline must remain readable.

## Acceptance check

Before handing off any new or migrated editor:

1. Count the effect's distinct visible phase types and confirm the required number of non-gray fills is present.
2. Confirm fluorescent lime is not being used as the fallback for unrelated phases.
3. Confirm every label describes the current effect rather than another editor's choreography.
4. Switch light/dark themes and verify labels remain readable without losing the color mapping.
5. Seek every block and confirm it reaches the phase named by that block at the displayed time.

