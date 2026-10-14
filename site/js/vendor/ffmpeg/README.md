# Pinned local FFmpeg conversion engine

- @ffmpeg/ffmpeg 0.12.15, ESM wrapper and module worker (MIT).
- @ffmpeg/core 0.12.10, ESM, single-thread WASM engine (GPL-2.0-or-later, contains FFmpeg and libx264).
- Downloaded from the public npm registry tarballs, with no modifications to shipped runtime files. Only the ESM distribution is used.
- Runtime dependencies are served from CellMotion's own origin and loaded only after native HEVC picture decoding fails. Source media stays on the device. SharedArrayBuffer / cross-origin isolation are not required.
- Official project/build sources: https://github.com/ffmpegwasm/ffmpeg.wasm ; pinned published distributions: https://registry.npmjs.org/@ffmpeg/core/-/core-0.12.10.tgz and https://registry.npmjs.org/@ffmpeg/ffmpeg/-/ffmpeg-0.12.15.tgz . FFmpeg sources/version builds and dependency build recipes are referenced by the project's Dockerfile and build scripts.
- FFmpeg source: https://github.com/FFmpeg/FFmpeg/tree/n5.1.4 ; libx264 source: https://code.videolan.org/videolan/x264 .
- Licenses are included as LICENSE-MIT.txt and LICENSE-GPLv2.txt.

Published integrity (registry):

Core: sha512-dzNplnn2Nxle2c2i2rrDhqcB19q9cglCkWnoMTDN9Q9l3PvdjZWd1HfSPjCNWc/p8Q3CT+Es9fWOR0UhAeYQZA==
Wrapper: sha512-1C8Obr4GsN3xw+/1Ww6PFM84wSQAGsdoTuTWPOj2OizsRDLT4CXTaVjPhkw6ARyDus1B9X/L2LiXHqYYsGnRFw==

Runtime SHA-256:

{
  "core/ffmpeg-core.js": "67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3",
  "core/ffmpeg-core.wasm": "9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7"
}
