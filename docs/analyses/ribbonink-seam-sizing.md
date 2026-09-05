# Ribbon Ink: responsive handoff and larger typography

## Contract (2026-09-05)

- Keep the approved first-page mother image, pigment style, I/E/M reactions,
  second-page route family, contact/pop timing model and downward exit intact.
- A single writing head continues from the visible first-page ink into page two.
  Neither changing canvas aspect nor changing brush width/scale may insert a gap.
- Both page-owned size sliders must enlarge actual rendered glyphs. Preview,
  PNG, GIF and MP4 use the same geometry, fit rule and timeline.

## Evidence and change

The old handoff transformed a fixed source point `(710,195)`. The first-page
scratch layer was already clipped to the canvas. At brush scale 150%, width 55%
and portrait aspect, the second stroke began beyond that clipped layer, visibly
separated by blank space. This reproduces the reported screenshots.

Read the mother image's final opaque run per source column once at load time.
Start the continuation just inside the actual visible right boundary, using that
run's center, tangent and normal thickness. Blend its radius into the established
second-page body width over the first path segment. Pigment mapping and glyph
contact testing share the same radius profile. No compensating camera translation
or new UI repair parameter is added.

The old type fit repeatedly capped the result at 76% canvas width, cancelling
slider enlargement. Fit up to the established 270 baseline, then apply the user's
larger size as a composition zoom. Both independent sliders now reach 540.
The default 270 remains unchanged; large values deliberately allow canvas crop,
explained beside both controls. This is not a promise to keep arbitrarily large
or long text entirely inside the frame.

## Verification

- Browser pixel regression: 27 combinations of landscape/square/portrait,
  brush scale 55/100/150 and width 55/100/160; 2,376 sampled overlap pixels covered.
- Both pages: Inter, Chinese, Japanese and Korean, sizes 270/340/540. Actual
  glyph heights increase on both pages (Chinese at 640 square: ~115/145/231 px).
- Keyboard slider editing changes only its page; 540/540 survives scheme
  save, reset and real file import. Mobile stage stays centered and inspector scrolls.
- Real 360×640 GIF and H.264 MP4 (30 fps, 90 video frames), seam PNG, plus
  640×640 Chinese PNG/MP4. Dense exported frames 41–52 show no former gap.
- Existing route, sequence, glyph, single-ending, ending and material checks pass;
  syntax, editor contract, diff checks pass. Browser console has no errors.
- Live playback was exercised. This browser session's RAF cadence varied around
  20–30 fps; warmed direct render samples were about 0.1–12 ms at 640 square.
  Do not infer a universal 60 fps guarantee from deterministic export success.

Regression helper: `check_ribbonink_seam_browser.cjs` exports an async function
accepting the active Playwright page. It checks real canvas pixels and restores
the incoming scheme afterward. Artifacts stay under ignored `output/playwright/`.
