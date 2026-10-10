# CardBot → CellMotion preservation contract

Source: the user's already approved `cardbot/motion-kits/login-handoff` and `bot/public/motion.html` + `cardbot-reglages-default.json`. No new reference film or generated motion was used. Existing CardBot and Bot sites/files are left unchanged.

## Flip-to-login / card-login

| Phase | Time at 1× | Contract |
| --- | --- | --- |
| Size-matched handoff | 0–0.100 s / frames 0–6 at 60 fps | Layout 440 × 590; scale .47 / .445; Y −14; rotateY −2°; rotateZ −5°. No smaller intermediate card. |
| Rotate and grow | .100–1.600 s / frames 6–96 | cubic-bezier(.25,.1,.25,1); transform moves to scale 1.01, Y 180°, Z 0°. |
| White face | .576018 s / around frame 35 | Switch during rotation at 32.001%, never after the expanded black face. |
| Reveal content | 1.050–1.650 s / frames 63–99 | opacity 0→1; Y 18→0; cubic-bezier(.22,1,.36,1). |
| Settle | 1.600–1.800 s / frames 96–108 | scale 1.01→1; cubic-bezier(.22,1,.36,1). |
| Presentation hold | 1.800–3.000 s | Editor loop only; the original transition remains 1.8 s. |

Perspective is 1500 logical pixels. Projection applies Z rotation, Y rotation, X/Y scale, then perspective. Face textures are mapped into the same plane for preview/export; shared time sampling also supports arbitrary seek. Responsive composition fits the card to available *canvas* bounds; it does not read browser viewport dimensions for motion geometry. The original CSS/DOM handoff is provided unchanged in a source kit for interactive-form integration.

## Card Deck / carddeck

| Phase | Time at 1× | Contract |
| --- | --- | --- |
| Stack | 0–.900 s | Only the black focus cover is visible; no duplicate shadow stack. |
| Spread | .900–1.500 s | Default lift-from-behind; row delay .2 × spread duration; card stagger .08 s; flight tilt 18°; scale 1→.82. Original horizontal fan also retained. |
| Alternating drift | 1.500–2.400 s | .8 grid cells per second; even and odd rows move oppositely; wrapped guards remain outside the crop. |
| Gather | 2.400–3.400 s | Drift continues while converging. Vertical converge ends at .62; stack .20–.78; cover alone returns to full size in .78–1.0. Row-by-row alternative retained. |

Default: three rows; gap .08; size 1.11; height/width 1.4; stack angle −12°. Original quintic smootherstep, linear, and quartic easing options are retained. The exact 45-card preset order is immutable, rather than re-randomizing on every visit. Each built-in eye uses the source SVG path and exported matrix keyframes; alternate cycle/duration is preserved and each grid position has a deterministic clock offset. No approximated fixed blink FPS. Shared GIF assets use source delays via `CellMotionAnimatedImage`.

## Deliberate differences / uncertainties

- The original deck randomized equally distributed color/expression selection; the published preset's 45-card order is now reproducible for export/AI handoff.
- Login is a visual animation, not authentication. Canvas output is not an accessible HTML form; use the bundled original DOM/CSS source for real form controls.
- Canvas perspective texture strips use overlapping clipping to avoid antialias seams; exact flat endpoints use one affine texture draw.
- Arbitrary animated SVG is not silently frozen: original CardBot matrix-keyframe exports are parsed deterministically; other custom SVG animation is rejected with an instruction to upload GIF. Static SVG is sanitized; scripts and external references are removed.
- Large GIFs have an explicit memory guard; users can lower canvas/FPS or use MP4. MP4 is deterministic H.264 frame encoding, not a browser screen recording.

## Entry and state

Gallery `?from=gallery` opens the immutable preset. Normal refresh resumes browser autosave. AI preview starts at the preset then configures the live manifest. Restore uses a fresh default clone. Language/theme are editor preferences only. Card id/order/asset/color/size/opacity/offsets travel together on reorder, save and import. Background trim belongs to the composition and is serialized with embedded media.
