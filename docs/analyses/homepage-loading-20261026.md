# Homepage loading — 2026-10-26

Production baseline: a cold desktop root visit transferred about 17.7 MB in 43 requests without scrolling. The 1920×1080 / 60 fps hero was 11,807,900 bytes and took about 11.6 seconds to finish downloading on the measured connection.

## Changes

Original media remains untouched. Separate H.264 fast-start derivatives retain 10.75 seconds and 60 fps: desktop 1280×720 / 3,122,158 bytes; mobile 854×480 / 1,671,747 bytes. The mobile source is selected at initial viewport widths up to 760 px.

21 large raster covers (5,984,696 bytes) have 720 px WebP derivatives totaling 586,290 bytes. The inline homepage media map uses complete versioned source URLs and content-hashed derivative names; unknown/new versions fall back to the source. No extra blocking map request is introduced.

Poster sources attach only within 160 px of the viewport. The offscreen featured poster waits for playback. All 31 recent-release covers stayed deferred at initial desktop/mobile view.

## Maintenance

Run node scripts/optimize-homepage-posters.cjs [path-to-node_modules] with Sharp installed, then commit the updated media map and derivatives when adding/replacing large approved covers. Source artwork stays authoritative.

FFmpeg settings: -an -vf scale=1280:-2 -c:v libx264 -preset medium -crf 28 -pix_fmt yuv420p -movflags +faststart. Mobile uses scale=854:-2; duration/frame rate are inherited.

The existing Pages workflow runs node scripts/prepare-homepage.mjs [site-directory] to inline CSS and the map.

## Verification

Run node tests/homepage-loading.cjs [node_modules] [browser-executable] [homepage-url] against the prepared artifact. Fresh local Chrome contexts measured 4,141,376 desktop / 2,655,914 mobile resource bytes. Local byte counts are not production speed claims.

Checked root URL preservation, video selection, absence of original hero/large-cover requests, scroll-triggered cover display, pause/resume, mobile fit and a clean page console. Compared original/desktop video at 2 seconds: composition and wordmark match. JavaScript syntax and git diff --check passed.
