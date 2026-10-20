# Temporary Ocean Ink composition

User request: write `lovefrom` in the center using the existing Oddball Ink font and handwriting, hold the completed word for exactly one second, then dissolve its ink into the continuously swimming ocean.

The published ASCII Ocean renderer, creatures, colors, defaults and preview artifacts are frozen. A separate `ascii-ocean-ink.html` entry layers handwriting over that renderer, reusing the shared Oddball font and stroke data. No production release or gallery changes are part of this temporary preview.

| Seconds at default speed | Phase | Contract |
| --- | --- | --- |
| 0–0.6 | Ocean opening | Existing animals move normally. |
| 0.6–3.8 | Handwriting | Stroke masks reveal lowercase `lovefrom` from left to right; small wet ink speckles appear. |
| 3.8–4.8 | Hold | Complete word remains unchanged for one second; ocean keeps moving. |
| 4.8–9.6 | Dissolve | Continuous wet ink ribbons deform and travel outward; soft plumes originate at the glyph pixels, spread through the water and dissipate. |
| 9.6–30 | Ocean cruise | Clean original ocean continues. |

Preview, timeline seeking, component and exports use the same deterministic composition renderer. Verify the writing progression, full hold, dissolution boundaries, moving animals, real MP4/GIF output, saved settings and portrait layout. This is a procedural ink diffusion treatment, not a fluid simulation.

Acceptance: `python tests/ocean-ink-browser.py` verifies the one-second unchanged letter layer independently of the moving ocean, progressive stroke reveal, deterministic diffusion, a clean ending, saved scheme, portrait layout and actual video/GIF exports. Blur is composited once per offscreen ink layer to keep continuous preview and export responsive.
