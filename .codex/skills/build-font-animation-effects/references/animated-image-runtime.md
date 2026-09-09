# Animated image runtime

Read this reference whenever an effect renders GIF icons or GIF backgrounds into Canvas.

Load `site/cellmotion-animated-image.js` before the effect renderer and use `window.CellMotionAnimatedImage`.

- `decode({ url, type })` returns the complete canonical millisecond frame sequence. Never silently truncate a GIF cycle.
- `frameAt(resource, timeSeconds)` selects a frame from the effect's deterministic clock.
- `dispose(resource)` closes owned `ImageBitmap` frames when a cached asset is replaced or removed.
- GIF Graphic Control Extension delays are authoritative. Do not replace them with a fixed FPS or rounded `VideoFrame.duration`.
- The module creates independent `ImageBitmap` frames and closes decoder-owned frames.
- If decoding is unavailable, retain the existing native-image fallback; do not deliberately snapshot the first frame.

Do not instantiate `ImageDecoder` in an effect renderer. Animated icons and backgrounds use source frame delays while the effect timeline supplies elapsed time. Playback speed may scale the effect clock, but must not invent a separate icon FPS. Preview and export select frames from the same clock.

Run `python .codex\skills\build-font-animation-effects\scripts\check_shared_contracts.py`, then compare a built-in Bot and `GIF 动图` asset with the source `<img>` at normal speed and in one real export.
