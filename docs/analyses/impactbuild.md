# Effect analysis: `impactbuild`

## Source material

- Normal-speed file: `Desktop/飞书20260831-175005.qt` (not committed)
- Duration / fps / dimensions: 3.466667s / 30fps / 540×1166, 104 video frames
- Rhythm recheck: `Desktop/飞书20260831-220006.qt` (not committed), 1.533333s / 30fps / 540×1166, 46 video frames
- Relevant crop: x=0, y=307, w=540, h=304 (embedded 16:9 motion area)
- Analysis date: 2026-08-31

## One-sentence target

A lead word lands as a huge horizontally smeared impact and settles; at each join, the existing phrase receives the leftward impulse first and the incoming word follows from the right into the same final layout.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.000–0.033s | 001 | Pre-roll | unrelated bright interface frame | exclude from the reusable loop | high |
| 0.033–0.100s | 002–003 | Lead impact | `Action` flashes oversized and resolves to the small line | very fast grow-and-shrink with resolution-normalized horizontal/radial smear | high |
| 0.100–0.450s | 003–014 | Settle / hold | lead word stays sharp and centered | rapid final scale recovery followed by a readable hold | high |
| 0.450–0.650s | 015–020 | First append | `Action` moves left before `becomes` becomes readable; both decelerate into place | existing phrase impulse followed by a delayed incoming-word track | high |
| 0.650–0.783s | 021–024 | Hold | two-word phrase remains stable | short readable hold | high |
| 0.783–0.983s | 025–030 | Second append | the existing two-word phrase moves left together, then `progress` follows from the right | repeat the same two-track join field | high |
| 0.983–1.383s | 031–042 | Final hold | complete phrase stays centered | readable hold with very slight breathing | high |
| 1.383–1.533s | 043–046 | Loop tail | phrase softens into a mild horizontal blur | short blur tail before the loop cut | medium |

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

- Default loop: 1.533s
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
- Impact scale/duration, settle duration, append duration/interval, final hold, afterimage length/count/force
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

- 2026-08-31: v16 separates the append afterimage into editable length, layer count, and opacity force. The join curve now reaches 96% of its destination during the first 68% of the event, then continuously brakes through the final 4% as a short inertia tail with no overshoot or recoil. The live preview no longer requests a readback-optimized Canvas context, while MP4 export retains it for `getImageData`, keeping preview and export geometry identical without forcing the browser preview onto the slower readback path.
- 2026-08-31: direct measurement of the 46-frame normal-speed recheck corrected the choreography and timeline in v15. The first visible join frame is 015 and the second is 025, so their continuous starts lie between the preceding stable frame and those samples (modelled at 0.450s and 0.783s). Each join lasts about 0.200s, the final hold is about 0.400s, and the complete loop is 1.533s. During the first join, `Action` moves left one frame before `becomes` is readable; during the second, the already-visible `Action becomes` phrase moves as one old group before `progress` follows. v15 therefore removes per-old-word staggering, delays only the incoming word, uses a fast impulse followed by continuous deceleration, and removes the unsupported 25% sharp-text squeeze while retaining velocity-driven afterimages.
- 2026-08-31: v14 corrects the remaining rigid-body feel without changing the approved afterimage. Existing words no longer share one recenter progress: the leftmost word launches immediately and each word to its right follows roughly 7% of the 170ms append event later (about 12ms), capped at a subtle 20% total drag. Every follower still reaches the same final layout on the same end frame, so the result is a crisp inertial pull rather than a visible word-by-word sequence.
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
