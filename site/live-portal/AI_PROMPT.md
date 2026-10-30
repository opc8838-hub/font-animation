You are recreating "Live Portal": a web page where iPhone Live Photos become tiltable 3D cards that you can step into. The reference implementation is at https://opc8838-hub.github.io/font-animation/live-portal/ and its source is in that folder of github.com/opc8838-hub/font-animation (`site/live-portal/`). Read `RECIPE.md` first.

Build it with plain three.js (r160), with no framework. Keep these rules. They are what makes it look real:

1. Never cut the person out or split the footage into layers. Depth comes from per-frame depth maps (Depth Anything V2), stacked under the RGB in the same video, and is applied as a parallax offset in the fragment shader: `uv += tilt * (depth - subjectDepth) * k`.
2. Intro (about 5.5 s):
   - The centre card turns to about 88° using a measured, monotonic curve.
   - Six cards slide out from directly behind it in pairs, each outer card chained behind the inner one.
   - All seven turn to face the viewer over about 1.15 s, hold for 2 s, then collapse to three cards in 0.65 s.
3. Home:
   - Three 3:4 cards on a concave arc; side cards turned ±25°, centre card about 8% larger.
   - Device-orientation tilt, with the iOS `DeviceOrientationEvent.requestPermission()` button; mouse on desktop.
   - The glass highlight shows only on the hovered card.
4. Open a card:
   - A 0.9 s critically damped spring zoom to full screen.
   - The scenery outside the original frame is a pre-generated extension, tracked per frame to the hand-held camera so it never slides against the video.
5. Loops and cuts:
   - Background-registered loop points with optical-flow in-betweens.
   - Different shots are joined with a Gaussian focus-pull (hard switch at maximum blur), never a long dissolve.
6. Outro:
   - Render the page into a render target that uses the viewport's own layout (taller canvas, same card positions).
   - Composite it into the transparent screen of a hand-held phone photo.
   - Scale from 1.06× cover to the end composition with ln(scale) falling at a constant rate over about 3.4 s (short ease-in, 0.5 s ease-out).
7. Performance:
   - No MSAA; anti-alias rounded corners in the shader.
   - Small videos during the intro.
   - Upload video textures only on new frames.
   - Warm up shaders and textures before the intro.

When you swap in your own Live Photos, keep the asset layout (`assets/<card>/live*.mp4` + `meta.json`) and regenerate depth and the camera track for each one.
