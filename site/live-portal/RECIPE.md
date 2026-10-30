# Live Portal — recipe

Turn a few iPhone Live Photos into tiltable 3D cards you can step into, with an iMac-style intro and a pull-back to a hand-held iPhone Duo.

Everything here is plain WebGL (three.js r160, no framework). Open `index.html` from any static server (`python -m http.server`), or `index.html?scheme=b` for the angled-hold variant.

## What you see

| Phase | Time | What happens |
|---|---|---|
| Emerge | 0 – 1.4 s | The centre card turns to ~88° (curve measured frame by frame from Apple's iMac intro). Six cards slide out from behind it in pairs (0.50 / 0.58 / 0.66 s). Each outer card is chained to the inner one, so it stays hidden until the inner card has moved past. |
| Turn to front | 1.6 – 2.75 s | All seven turn to face you. Scheme A: bottom-aligned row, sizes 1 / .88 / .77 / .67. Scheme B: an angled fan at ~42°. |
| Hold | 2.75 – 4.87 s | 2 s hold; every card is a playing Live Photo. |
| Collapse | 4.87 – 5.52 s | Four cards recede and fade; three land on the home arc. Titles fade in. |
| Home | — | Tilt the phone (gyroscope) or move the mouse: each card is a "spatial photo" with per-pixel depth parallax. Only the hovered card gets a glass highlight. |
| Open | 0.9 s | Spring zoom to full screen, like opening a photo on iPhone. The cropped edges of the footage appear, then AI-extended scenery continues left and right; tilt or drag to look around. |
| Outro | 3.4 s | Press **O**. The page becomes the screen of an iPhone Duo held in two hands. The pull-back is constant in log-scale (as in Apple's film), so you don't realise it's a phone until the bezel creeps in. **B** reverses. |

## How it's built

1. **Footage, never cut apart.** Each card plays the original Live Photo. No cut-out people, no layers: the person and the scene always come from the same frame.
2. **Depth per frame.** Depth Anything V2 (Small) estimates a depth map for every frame, globally normalised and temporally smoothed. RGB and depth are stacked into one video (top = RGB, bottom = depth), so they can never drift out of sync.
3. **Spatial-photo shader.** The fragment shader offsets each pixel by `tilt × (depth − subjectDepth) × k`. The subject stays put and the background moves, which reads as real depth with no tearing.
4. **The world beyond the frame.** Each scene is outpainted to about 260° with an image model. Seams are matched in low-frequency colour and in sharpness: AI pixels may not be sharper than the original. Hand-held camera motion is tracked per frame (affine + gain) so the static extension moves with the video.
5. **Loops that don't jump.** Loop points are background-registered, then 4 frames are synthesised with DIS optical flow. Shots in different places are joined with a 0.4 s Gaussian focus-pull: hard-switch at maximum blur, so you never see two people at once. Slow motion is stabilise first, then `minterpolate`.
6. **60 fps on a weak GPU.** No MSAA (rounded corners are SDF anti-aliased in the shader). Small 360 px videos during the intro. Video textures upload only on new frames (`requestVideoFrameCallback`). Everything is warmed up before the intro starts. Ext tracking uses the presented frame's `mediaTime`, not `currentTime`.
7. **The phone.** The iPhone Duo is rendered from Apple's public product-viewer glTF. The hands are generated around a green screen; the real render is pasted back on top and only the thumbs are kept. The page is rendered into a render target with the viewport's own layout, so frame 1 of the outro is pixel-identical to the home page.

## Files

- `js/main.js`: the whole runtime (intro, cards, full screen, outro). Search for `introPose`, `homeRect`, `fullGeom`, `stepOutro`.
- `assets/<card>/`
  - `live*.mp4`: RGB/depth stacked video. `live_s` is the small version used in the intro, `live_card` is the card version, `live_full` is the full-screen version.
  - `meta.json`: card window, subject depth, per-frame camera track and gain, loop and shot data.
  - `ext*.jpg`: the extended scenery.
- `outro/`: hand-held phone photo, with the screen area transparent, plus its screen geometry.
- `tools/`: the offline pipeline scripts, copied as-is. They contain local Windows paths; read them as reference, not as a turnkey CLI.

## Make your own

1. Replace each `assets/<card>/` with your own Live Photo: run it through depth estimation, pack it, and write the `meta.json` fields. `tools/prep_v2.py` shows the full chain.
2. Change the titles in `DEFS` in `main.js`.
3. Keep the four intro-only cards, or remove them from `EXTRA_DEFS`.
