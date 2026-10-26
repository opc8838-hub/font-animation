# Bubble Frame: historical reference analysis

This describes the earlier perimeter-frame iteration. The current editor is **Bubble Fluid**; see [current motion and verification](bubble-fluid.md). The user subsequently requested continuous full-screen lettering and removal of the central information area.

## Original reference

Desktop `a6f47c0c4d46a482c6e12eb7bb4fb2ac.mp4`: HEVC, 592 x 1280, nominal 30 fps, 502 frames, container 16.866667 seconds, AAC audio.

| Source time | Observation |
| --- | --- |
| 0-1.5 s | Recording controls and transition |
| 1.5-4.5 s | Interlocking title with a tall first T and nested small O |
| 4.5-5.3 s | Letters contract toward the screen perimeter |
| 5.3-12.1 s | Irregular border and central information |
| 12.1-14.7 s | Letters inflate and rotate |
| 14.7-16.7 s | Final title holds with several letters still rotated |

The final title does not return to the initial orientation. The earlier adapted cycle was 15.2 seconds.

## Retained source geometry

`scripts/trace-bubble-reference.py` rectifies the curved screen and traces fourteen letter instances at 2.4, 6.5, 13.2 and 15.5 seconds. The generated `site/bubble-frame-lettering.js` remains input to the new silhouette preparation script, rather than a runtime dependency of the fluid editor.

The 592 x 345 stage plate comes from 2.4 seconds, source crop y=410-755. It retains the actual floor, lighting, chairs, table and side walls. The curved screen maps x=101+389u, top=105-100u^2, bottom=237+50u^2 within that plate. Chair-back masks preserve foreground occlusion.

This is a photographed fixed-camera composition. It is not a reconstructed 3D stage, and larger exports do not restore photographic detail absent from the 592-pixel source.

## Historical measurements

Before the full-screen fluid revision, static bright-green silhouette intersection-over-union inside the LED polygon was 95.39% for the initial title, 91.36% for the frame, 92.70% for the intermediate pose, and 95.74% for the final pose. These four aligned masks were not a perceptual or full-motion similarity score.

That iteration passed real PNG/GIF/H.264 exports and browser checks. Its source-comparison tests and information image were retired when the user removed the frame/information choreography. Current checks live in `tests/bubble-fluid-browser.cjs` and `tests/bubble-frame-browser.cjs`.
