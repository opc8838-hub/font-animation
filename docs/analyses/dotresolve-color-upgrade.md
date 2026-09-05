# Dot Resolve optional color sweep — 2026-09-04

## Approved change contract

- Preserve pixelation, glyph matching, positions, opacity, timing, row fonts and icon motion.
- Each row owns initial color, optional single/multi effect colors, and an independent left-to-right sweep switch.
- Hold and incoming text use that row's initial color. Outgoing pixelation paints the effect color, with no return-to-original phase. Next row owns its own colors.
- Sweep uses normalized pixelation progress. Account for the existing outgoing stagger so the last character is painted before it disappears; add no independent duration or hidden hold.
- No color mode is the backward-compatible default. Non-text icons retain their artwork colors. Multi-color controls are indexed by grapheme; spaces have no visible color control.
- Changing effect colors previews the outgoing transition; `暂停修改` still seeks the fully readable hold. An explicit preview button replays the selected row.
- Five recent effect cards use new 16:9 preview exports and span two desktop grid columns. Preserve old square preview files and the unrelated approved Glyph Morph cover.
- Type Cascade's reset source matches the desktop `typecascade-scheme.json`: seven rows, Inter 167, 810 ms morph, 0.052 stagger, 168° tilt, Bot 08 after Sketch, and original row timing.

## Verification

- Regression script exercises all six renderers, Unicode color slots, single/multi/off modes, sweep order and final colors, stable layout and original timing invariants.
- Browser: row-scoped multi-color controls, second-character color edit, toggle, autosave/reload and complete pause inspected.
- Actual H.264 export: 640 × 360, 60 fps, 329 frames, 5.483333 s. Dense exported frames show black hold → left-to-right colors during outgoing pixelation → next row's black text.
- Actual GIF: 640 × 360, 165 frames, 5.50 s. Browser import restores custom colors and scan switch; moving a single-color row above a multi-color row keeps both sets attached to their ids.
- Mobile 390 × 844 checked with a 9:16 canvas, Chinese text and one emoji; the full paused row is visible above the independently scrolling color controls.
- All five new cover files are real 640 × 360, 30 fps full-cycle browser exports. Gallery desktop card measured 809.33 × 455.23, exactly matching video aspect without gutters. Type Cascade live saved scheme deep-equals the desktop scheme except the migrated version number.
- Keep a clickable download link after encoding: browser-managed asynchronous download may be delayed/blocked, and revoking after one second can invalidate it before completion.
- Local review only. No commit, push or main merge authorized for this iteration.
- Follow-up cover review: the initial two-column cards were too large. Cap only these five cards at 640 px wide, keep 16:9 and existing 640 × 360 media, and leave all motion/editor files unchanged. Desktop measured 640 × 360 on all five, so the player no longer upscales the source.
