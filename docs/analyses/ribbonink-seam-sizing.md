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

## Entry extension refinement (2026-09-05)

At small brush scales the mother image's source `x=0` can land inside the canvas,
exposing the original asset's straight crop. Preserve every source pixel of the
approved mother image and prepend a generated cubic centerline underneath it.
Its far end is well outside the full editor position range; the final tangent and
normal width match the measured mother edge. A lightly irregular outline and
short, moving pigment lobes prevent the added area from reading as a geometric
bar. The reveal head traverses the extension first, then catches the original
timeline by 22% progress; erase traverses the same geometry in the same order.

The mathematical extension remains long enough for every responsive layout, but
its visible start is now selected dynamically. When the mother source crop would
land inside the frame, the start center is inset by the current stroke radius so
the complete round cap stays visible and joins the unchanged mother silhouette.
When the mother crop is already outside the frame, its approved silhouette and
timing remain untouched. The browser regression checks 54 landscape, square and
portrait combinations at brush scale 55/100/150, horizontal position 8/50/92 and
width 55/160: applicable extensions must precede the source crop and must not
touch an outer composition edge.

Dense 0.00–0.45 s browser frames and a decoded real 640×640 H.264 export confirm
that the inset cap stays round throughout write-in rather than popping from a
flat crop. The 54-combination entry check, 27-combination cross-page seam check,
all existing Ribbon Ink motion/material/glyph/ending/freehand checks, shared
editor contract, syntax, diff and a clean browser console pass. Direct 640-square
rendering measured 0.3 ms median and 0.6 ms p95 across 48 sampled frames.
