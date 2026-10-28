# Shared loading readiness — 2026-10-28

The previous homepage performance measurement stopped at first paint. It did not establish preview or editor readiness. A 1 Mbit/s, 120 ms latency HTTP/1.1 reproduction showed preview requests lasting tens of seconds while multiple visible ribbon videos competed for connections and bandwidth.

## Changes

- Limit automatic ribbon video sources to two, prefer loaded covers, and detach superseded/offscreen video sources. Add readable effect names under posters and hide video surfaces until playback starts. Apply a two-preview automatic limit to recent/catalog cards as well; explicit play remains available.
- At artifact preparation, upgrade HTTP cellmotion.cn document visits to HTTPS while preserving path, query and fragment. This is a browser-level upgrade; no GitHub Pages admin setting is changed.
- Rewrite root editor HTML to lightweight lossless logo derivatives and an MP4 encoder proxy. The actual H.264 library loads when createH264MP4Encoder is called, rather than before editing.
- Generate same-metric common UI font layers for SC Regular, SC Black and JP Thin (196,384 / 199,872 / 205,556 bytes). Keep complete coverage in disjoint fallback ranges, with losslessly compressed full SC Regular and JP Thin font sources. Apply these faces to legacy CSS aliases as well as shared-fonts.css.
- Avoid loading an entire fallback-family stack for the Bubble editor English default; the shared helper loads script-relevant fonts for edited content.

## Maintenance

Python dependencies: fontTools and Brotli. Run scripts/compress-editor-fonts.py, then scripts/subset-editor-ui-fonts.py; each accepts an optional dependency-directory argument. Originals are unchanged. Subsets derive common characters from root HTML and JavaScript; regenerate when changing UI vocabulary. Unknown characters retain a full-font fallback rather than losing glyph coverage. Font generators verify original character maps and per-character advance metrics.

Run scripts/prepare-homepage.mjs before serving the published artifact. The root CSS and HTML rewrites are artifact-only so source editors retain their existing files.

## Verification

tests/editor-readiness.cjs exercises slow-network visible covers, bounded video sources, startup of Bubble Fluid and Type Cascade, Chinese input, absence of eager complete CJK fonts/MP4 codecs, and HTTP upgrade with preserved URL components. No page errors occurred. Type Cascade initially requests about 396 KB of CJK UI font files rather than the complete Regular/Black fonts.

Generated real 320px PNG (99,159 bytes), GIF (78,303 bytes) and MP4 (21,103 bytes) from Bubble Fluid. The full MP4 encoder was absent before export and present after the MP4 request.

Hosting remains GitHub Pages. These changes address demonstrated client-side request contention and startup dependencies; they do not establish reliable delivery for every visitor network.
