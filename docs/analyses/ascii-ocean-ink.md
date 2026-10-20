# Temporary Ocean Ink composition

User request: write `love from` in the center using the existing Oddball Ink font and handwriting, hold the completed word for exactly one second, then dissolve its ink into the continuously swimming ocean.

The published ASCII Ocean renderer, creatures, colors, defaults and preview artifacts are frozen. A separate `ascii-ocean-ink.html` entry layers handwriting over that renderer, reusing the shared Oddball font and stroke data. No production release or gallery changes are part of this temporary preview.

| Seconds at default speed | Phase | Contract |
| --- | --- | --- |
| 0–0.6 | Ocean opening | Existing animals move normally. |
| 0.6–3.8 | Handwriting | Stroke masks reveal lowercase `love from` from left to right; small wet ink speckles appear. |
| 3.8–4.8 | Hold | Complete word remains unchanged for one second; ocean keeps moving. |
| 4.8–9.6 | Dissolve | Wet lettering slowly releases ink into a shared curling current. Nearby ink follows coherent streamlines, stretching into soft descending filaments and plumes before dissipating. |
| 9.6–30 | Ocean cruise | Clean original ocean continues. |

Preview, timeline seeking, component and exports use the same deterministic composition renderer. Verify the writing progression, full hold, dissolution boundaries, moving animals, real MP4/GIF output, saved settings and portrait layout. This is a procedural ink diffusion treatment, not a fluid simulation.

Acceptance: `python tests/ocean-ink-browser.py` verifies the one-second unchanged letter layer independently of the moving ocean, progressive stroke reveal, deterministic diffusion, a clean ending, saved scheme, portrait layout and actual video/GIF exports. Blur is composited once per offscreen ink layer to keep continuous preview and export responsive.

User refinement: reduce the text scale from 1 to 0.84, add a literal space between the two words, and extend diffusion from 4.8 to 10 seconds. Opening, handwriting duration, one-second hold and the existing ocean motion remain frozen. The diffusion paths are deterministic, precomputed from the letter pixels and transported through a shared curling velocity field.
