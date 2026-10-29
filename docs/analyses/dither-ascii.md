# Dither / ASCII reference analysis

Source: https://x.com/Kubai087/status/2115091203465290087 (retrieved 2026-10-28). The 480 × 640, 60 fps, 20.933 s video was downloaded and inspected at six representative frames.

## Observed composition

The upper half is a white rounded two-column login card over a blurred cyan and orange backdrop. Its left panel shows a pale sage butterfly flapping, converted to a fine ASCII or Dither grid, with “Your browser, at command.” at the bottom. The wing silhouettes overlap and fold in the sampled frames; they were initially misread as landscape ridges. Its right panel contains “Welcome back”, email and password fields, a dark sign-in button, a Google button, and a signup prompt. The lower half is a dark control area with mask effect, ASCII / Dither mode, five color swatches, sampling strength, size, and spacing. ASCII mode also exposes Shadows / Highlights sampling.

## Observed progression and implementation

| Video phase | Evidence | CellMotion implementation |
| --- | --- | --- |
| Opening | A butterfly flaps behind sage ASCII with size 37, mask about 90, strength 100, spacing 0. | An original butterfly renderer animates both wings; mask, sample region, strength, cell size, and spacing stay editable. |
| Mode change | The pointer switches to Dither; the butterfly becomes a much finer Bayer-like grid and size reads 15. | ASCII and Bayer 4 × 4 modes share the same moving source card. The mode switch updates the default size. |
| Parameter demo | The mask and other controls are adjusted while the login card stays in place. | Controls live in the CellMotion inspector; the composition keeps the same two-column card. |

The reference is a parameter demonstration, not a fixed animation timeline. CellMotion adds an editable source → reveal → hold → reset timeline so the effect can be previewed and exported as motion. The login form is a visual composition, not an authentication flow. The animated butterfly and library thumbnail are original vector artwork shaped to match the reference's tonal structure; the source video itself is not bundled in the project. Exact wing anatomy and the video’s flap timing remain uncertain because the grid treatment obscures those details.
