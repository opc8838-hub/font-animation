# Effect analysis: `impactbuild`

## Source material

- Normal-speed file: `Desktop/飞书20260831-175005.qt` (not committed)
- Duration / fps / dimensions: 3.466667s / 30fps / 540×1166, 104 video frames
- Relevant crop: x=0, y=307, w=540, h=304 (embedded 16:9 motion area)
- Analysis date: 2026-08-31

## One-sentence target

A lead word lands as a huge horizontally smeared impact, settles smaller, then each later word whips in from the right while the growing phrase recenters as one unit.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.03s | 001 | Pre-roll | unrelated bright interface frame | exclude from the reusable loop | high |
| 0.03–0.10s | 002–004 | Lead impact | `Action` fills most of the width with symmetric horizontal trails, then snaps smaller | oversized lead word plus multi-sample directional smear; fast ease-out scale | high |
| 0.10–1.00s | 004–030 | Settle | lead word stays centered and gradually becomes smaller and sharper | continuous settle, no pause or second entrance | high |
| 1.00–1.20s | 031–037 | First append | lead phrase compresses into a horizontal streak while `becomes` appears to its right; both resolve together | one shared phrase layout, horizontal smear and squeeze, then recenter | high |
| 1.20–1.67s | 037–050 | Hold | two-word phrase remains stable | readable hold with near-zero residual scale | high |
| 1.67–1.90s | 051–058 | Second append | `progress` enters from the right during the same streak/squeeze event | repeat append event with the same shared motion field | high |
| 1.90–3.20s | 058–097 | Final hold | complete phrase stays centered | long readable hold with very slight breathing | high |
| 3.20–3.47s | 097–104 | Loop tail | phrase softens into a mild horizontal blur without leaving frame | short blur tail before the hard loop cut | medium |

## Element model

- Text unit: whitespace-delimited word; arbitrary word count
- Persistent elements: all previously introduced words
- Replaced/removed elements: none
- Image/icon behavior: optional shared-library icon tokens participate as word units and share phrase motion
- Layer order: background media → smear ghosts → sharp phrase

## Spatial rules

- Composition center: stage center plus editable X/Y offsets
- Alignment: phrase is remeasured and recentered whenever a word joins
- Scale behavior: impact scale is aspect-ratio-aware; final phrase is fit to the current canvas
- Responsive behavior: preview canvas uses the selected real aspect ratio and the export renderer receives identical geometry
- Entry/exit boundaries: later words start just right of their final slot; the phrase never drifts toward the browser viewport

## Timing and easing

- Default loop: 3.47s
- Overlaps: append word visibility, phrase recentering, squeeze, and smear are simultaneous
- Holds with residual motion: final hold has an editable low-amplitude breathing scale
- Hard cuts: loop tail cuts directly back to the lead impact
- Easing hypothesis: cubic ease-out for impact; smoothstep-based append recovery

## Reuse plan

- Closest effect: `textswell` for arbitrary word measurement, shared editor/export structure, and icon token layout
- Shared UI: `workspace-editor.css`, `me-motion-editor.css`, `me-motion-editor.js`
- Shared fonts/icons: `shared-font-library.js`, `shared-fonts.css`, `shared-icon-library.js`
- Shared export: `continuation-gif.js`, `h264-mp4-encoder.web.js`
- New core logic: deterministic horizontal smear/squeeze append choreography

## User-editable parameters

### Common

- Canvas ratio/custom size, phrase, font/weight, colors, font size, word gap, phrase position
- Impact scale/duration, settle duration, append duration/interval, final hold, blur strength
- Optional icon insertion and icon/text gap

### Advanced

- Settle scale, append squeeze, append travel, final breathing, loop-tail blur, master speed

## Uncertainties to verify

- The source is a phone screen recording; the first source frame belongs to the preceding screen rather than the motion itself.
- The final 0.25s blur may be camera/screen-recording softness; keep it editable and subtle by default.

## Acceptance evidence

- [x] Normal-speed comparison
- [x] Key paused frames
- [x] Chinese input
- [x] Desktop stage centering
- [x] Inspector scroll reaches bottom
- [ ] Mobile layout
- [x] Console clean
- [x] PNG generated
- [x] GIF generated
- [x] Video generated

## Feedback discoveries

- 2026-08-31: append motion must recenter existing and incoming words as one phrase; independent word movement looks detached.
- 2026-08-31: exported MP4 verified at 320×320, 15fps, 52 frames, 3.466667s; extracted event frames preserve the same impact, append, and hold geometry as the live preview.
- 2026-08-31: dense 30fps recheck confirmed the lead word stays oversized for two useful frames and then snaps down; both append events travel from right to left with the shadow trailing only to the right, while the whole phrase recenters together.
- 2026-08-31: the impact needs temporal continuity: a dim blurred precursor gathers into the oversized word, and the first small-word frame retains a faint sample of the collapsing large layer. Append trails should be short, low-opacity temporal echoes on the right—not a long symmetric smear.
