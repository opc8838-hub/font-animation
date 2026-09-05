# Ribbon Ink — per-character pressure (2026-09-05)

## Scope

- Both text pages expose “选字下压与穿插”; editing the page text opens its panel.
- “仅选中字下压” enables downward, bottom-anchored press on the selected graphemes and disables movement on the other graphemes of that page. It preserves depth annotations and does not change the other page.
- The pressure slider edits only the current selection. Zero is neutral; larger values press deeper. New glyphs default to 40%; explicit strengths in existing schemes remain unchanged.
- “所选字不动” disables only the selection. Existing contact/release timing, other motion choices, and scheme serialization remain shared by both pages.
- Frozen: authored TIME I/E behavior unless the user enters per-glyph customization; brush geometry/crop-cap from 9b0bebc; full-text ending motion; export renderer.

## Verification

- `check_ribbonink_glyphs.cjs`: grapheme identity, saved strengths, gentle new defaults, zero pressure, monotonic pressure, and existing motion/brush regressions pass.
- `check_ribbonink_pressure_browser.cjs`: real editor input “中文” (press only 文) and “风格上新” (press 风/上), independent page settings, 135 neutral-glyph pose checks, and actual scheme download/reset/import pass with zero page exceptions.
- Held vertical scales at first-page strengths 0/15/40/85%: 1 / .904 / .744 / .456. Second-page strengths 0/20/45/90%: 1 / .872 / .712 / .424.
- 1080×1920, 1080×1080, 1920×1080: repeated render frames on both pages are pixel-identical; neutral glyphs remain neutral.
- Desktop 1440px and mobile 390px: both panels fit horizontally; both pressure sliders support keyboard adjustment and remain reachable in the scrollable editor.
- Actual PNG, GIF and MP4 exported at 320×320, 15fps, full two-page loop. PNG exactly matches its preview frame. GIF contains 45 frames; MP4 is 3s. Comparing frames 10 and 31 against the shared renderer: GIF RGB mean absolute errors .445/.186; sequential PyAV MP4 decode 2.066/1.956 (compression differences).
- Browser video seeking selected the wrong presentation frame during the initial MP4 comparison; sequential decode by frame index confirmed the encoded frames instead. No export-code change was made.
- Proofs and temporary export files are in ignored `output/playwright/`; no generated binaries are committed.

## Entry

`ribbonink.html?from=gallery&sequence=2&rev=20260905-41`

Choose characters, click “仅选中字下压”, then adjust “下压力度”. To give multiple active characters different strengths, select the full active group once with the button, then select individual characters and adjust the slider (without pressing the exclusive-selection button again).
