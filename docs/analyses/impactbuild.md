# Effect analysis: `impactbuild`

## Source material

- Normal-speed file: `Desktop/飞书20260831-175005.qt` (not committed)
- Duration / fps / dimensions: 3.466667s / 30fps / 540×1166, 104 video frames
- Rhythm recheck: `Desktop/飞书20260831-220006.qt` (not committed), 1.533333s / 30fps / 540×1166, 46 video frames
- Relevant crop: x=0, y=307, w=540, h=304 (embedded 16:9 motion area)
- Analysis date: 2026-08-31

## One-sentence target

A lead word lands as a huge horizontally smeared impact, settles smaller, then each later word whips in from the right while the growing phrase recenters as one unit.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.03s | 001 | Pre-roll | unrelated bright interface frame | exclude from the reusable loop | high |
| 0.03–0.10s | 002–004 | Lead impact | `Action` grows into a bright oversized smear, then passes through a visibly smaller intermediate frame | very fast grow-and-shrink with resolution-normalized horizontal/radial smear | high |
| 0.10–1.00s | 004–030 | Settle | lead word completes the last short scale step and stays sharp and centered | two-frame shrink, then no large-word residue or second entrance | high |
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
- Easing hypothesis: cubic ease-out for impact; each append uses one continuous inertial curve with a short acceleration phase and a longer deceleration phase
- Append blur rule: directional trail strength follows normalized instantaneous append velocity, so it rises from zero, peaks near maximum speed, and returns to zero at the destination

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

- 2026-08-31: v12's append still felt rigid because its acceleration occupied 38% of the event: at 30fps/200ms the first moving frame advanced only 7.3%, and the incoming word inherited the same 7.3% opacity before the next frames jumped by 21.9% and 30.5%. v13 shortens acceleration to 16%, uses a sine/cosine-integrated velocity curve with a smooth speed peak, reveals the incoming word independently over the first two frames, and changes the migrated default append duration from 200ms to 170ms. The corrected 30fps samples advance about 22%, 30%, 25%, 17%, and 7% before stopping, preserving the approved velocity-driven trail while removing the sticky start.
- 2026-08-31: the 1.533333s original-speed rhythm recheck shows the first append launching at frame 015, strongest directional blur across frames 015–017, recovery at frame 018, and a clear destination by frame 019; the second append repeats the same shape. v12 replaces the previous start-fast cubic ease-out with a continuous acceleration/deceleration curve and drives every append trail layer from that curve's instantaneous velocity.
- 2026-08-31: v11 starts the first append on the exact frame where the lead impact ends. Lead recovery, leftward reflow, incoming-word reveal, and both words' directional afterimage now overlap. Temporal samples are clamped to the active append start so the trail cannot accidentally re-sample the earlier giant impact state. `接词滑动时长` is the explicit fast/slow control.
- 2026-08-31: v10 removes the zero-motion gap between lead-word settling and the first append. The impact now lands slightly below the final small scale, recovers continuously, and overlaps the first leftward phrase reflow during the final 22% of the editable settle window. Nine lightweight right-side samples make the launch trail readable at normal speed without restoring Gaussian-filter jank.
- 2026-08-31: the v8 preview regression was caused by repeated Canvas `filter: blur()` passes over the full phrase. At normal playback it measured about 48.8fps with 116.7ms worst frames; replacing Gaussian filtering with lightweight directional opacity samples and spreading the impact collapse over consecutive frames measured about 57.9fps, 16.8ms p99, and 33.4ms worst frame while preserving the launch trail.
- 2026-08-31: v8 uses the append event's raw linear progress for its blur envelope instead of the already eased layout progress. This keeps a visible right-side afterimage in the first moving frames and removes it as soon as the leftward move settles. The lead impact uses a wider, softer normalized bloom so the opening reads as an exaggerated flash rather than a clean scale-up.
- 2026-08-31: append motion must recenter existing and incoming words as one phrase; independent word movement looks detached.
- 2026-08-31: exported MP4 verified at 320×320, 15fps, 52 frames, 3.466667s; extracted event frames preserve the same impact, append, and hold geometry as the live preview.
- 2026-08-31: dense 30fps recheck confirmed the lead word stays oversized for two useful frames and then snaps down; both append events travel from right to left with the shadow trailing only to the right, while the whole phrase recenters together.
- 2026-08-31: a second 30fps frame-by-frame comparison established that the loop begins black and the oversized word occupies the first impact frames without leaving a separate large-word residue after the shrink. During an append, the phrase moves left over 2–3 frames and leaves a short but clearly visible temporal trail on the right.
- 2026-08-31: v6 was exported at 1920×1080, 30fps, 104 frames, 3.466667s and compared at frames 001–024 and 025–042; the corrected intro cut and right-side append trail remain present in the real MP4 renderer.
- 2026-08-31: the 34.4s extreme-slow reference `飞书20260831-203348.qt` produced four unique intro states after frame deduplication: prior scene, bright smeared large word, medium sharp word, final small word. The shrink therefore needs a very short continuous curve rather than a hard cut. The five unique first-append states confirmed that the directional trail exists only while the phrase is moving left; it must clear immediately when the layout settles.
- 2026-08-31: v7 was exported at 1920×1080, 60fps, 207 frames, 3.45s. Frames 001–007 preserve black → growth → bright impact → medium → final small states, while frames 059–074 show the right-side temporal trail only during the first append.
