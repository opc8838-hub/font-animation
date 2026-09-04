# Five morph effects: responsive and playback refinement

2026-09-04. Evidence: user screenshots and the existing five-video analysis.

## Disputed contract and scope

- Screenshot 1: retained `Motion` glyphs keep the outgoing large font while moving into a smaller incoming line. Freeze glyph matching, directions, content order and incoming easing; correct layout and retained-glyph geometry only.
- Use a sequence-wide fit to the longest composed row (including icons). The same selected size has one stable font size throughout its cycle, with identical normalized preview/export geometry.
- Enable looping for all five defaults; preserve user text/assets when migrating old working schemes. Explicit new-version loop-off remains supported.
- User explicitly changes Cascade exit: tip around the existing bottom pivot, optionally hang, then accelerate completely beyond the bottom edge. The old 10-unit displacement/fade is no longer the requested exit contract.
- Cascade row controls: tilt, hang and drop durations, all milliseconds before global speed. Entrance remains concurrent; transition finishes only after entrance and the last outgoing glyph both complete.
- Gallery: retain the complete square cover in a square card, without gray side gutters or cropping. Do not regenerate approved cover media for this layout-only fix.

## Phase boundaries / uncertainty

| Phase | Boundary | Requirement |
| --- | --- | --- |
| Readable hold | row start → hold | All glyphs complete, one stable fitted size |
| Tilt | stagger → tilt end | Existing alternating rotation and pivot |
| Hang | tilt end → hang end | Explicit user-controlled duration, zero allowed |
| Drop | hang end → drop end | Accelerate from current pose to beyond canvas bottom |
| Next row / loop | all channels complete | No truncated tail or font-size jump |

Exact new drop timing is a user-editable extension, not a newly inferred video measurement. Original reference phases outside these disputed items remain frozen.

## Per-row fonts (user addendum)

- All five ports plus Glyph Morph consume the complete 48-face shared catalog through `row-font-editor.js`; no private font list.
- Empty row `fontFamily` inherits the global default. Explicit values belong to stable row ids and survive reorder, autosave, JSON export/import. Changing a row font seeks to its fully readable hold.
- Canvas explicitly loads selected font faces and required CJK fallbacks before export. Font changes between matched glyphs crossfade the face while maintaining one moving slot and interpolated size.
- Glyph Morph's approved preset and all existing cover media bytes remain unchanged. Its square card is also fitted without gray gutters.

## Verification ledger

- Six-page structural editor checks and `node scripts/test-morphports-layout.cjs`: pass. Tests cover full catalog, row overrides, inheritance, square/portrait/landscape layout, normalized preview/export fit, loop wrap, row pause, Cascade timing deltas and full exit envelope.
- Browser: all six row font selectors expose 48 fonts plus inherit; selecting a face pauses the correct row. Lora, Chinese Black, Japanese Black and Korean Black visibly render. Reorder, save, refresh, reset and real JSON re-import checked; Glyph Morph's pre-test working scheme restored from its backup.
- Browser: 1:1, 9:16 and 16:9 checked. Mobile 390×844 revealed two legacy issues: CSS viewport-based fitting cropped the frame and whole-page scrolling hid the stage. Both now use actual stage geometry and independently scrolling inspector; rechecked full stage visibility while editing.
- Real H.264 exports: Sprout multi-font square 320×320, 60 fps, 582 frames / 9.7 s; Glyph Morph with row fonts/icons 320×568, 60 fps, 180 frames / 3 s; Cascade 320×320, 60 fps, 180 frames / 3 s. Extracted and inspected normal-sequence and dense Cascade exit frames.
- Real GIF: 320×320, 291 frames / 9.7 s, inspected multilingual frames. Fixed centisecond rounding drift found during verification (previous 30fps GIF shortened 9.7 s to 8.73 s).
- Browser custom-size verification found Glyph Morph only listened for change/blur; now it also listens for input. Re-export verified actual 320×568 rather than just input labels. PNG generated at the same portrait size.
- No remote push or main merge: user review is required before uploading.
- Live loop smoke check: seek to 25 ms before the end, resume, then confirm the visible playhead wraps to the beginning while Pause remains active. Square gallery video and card bounds both measured 393.66×393.66; no side gutters.
