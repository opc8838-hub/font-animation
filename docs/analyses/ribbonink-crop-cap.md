# Ribbon Ink: finish the exposed source crop

Baseline: accepted pre-rounding restoration f2c7b13. The 9:16 screenshot exposes
the mother PNG's straight bottom crop at its entry. Round only that underside;
keep the left frame filled and freeze scale, placement, original contours,
pigment, text reactions, page handoff and timing.

Read the opaque end of the source bottom row and the adjacent lower-edge slope.
Complete a circular arc tangent to that edge only outside the source crop, with
a half-logical-pixel overlap to avoid an antialias seam. Continue the bottom-row
pigment masks into the missing arc. The original source pixels are not replaced.
The default 16:9 frame clips this small completion entirely.

Verification: nine aspect/width combinations compared against the accepted
renderer with only this completion disabled. Every pixel outside the local
crop region is unchanged. At 360×640, the flat end at y=430 becomes a curved
underside reaching y=444 at the left edge. Real PNG, 36-frame GIF and 1.2-second
30-fps H.264 exports were generated and their decoded frames inspected.
Application exceptions: zero. Existing motion and sequence checks pass.

Regression: check_ribbonink_crop_browser.cjs. Its baseline route uses no-store
so the diagnostic response cannot contaminate subsequent preview/export checks.
