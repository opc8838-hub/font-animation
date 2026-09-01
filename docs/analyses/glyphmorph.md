# Effect analysis: `字融 / Glyph Morph`

## Source material

- Normal-speed file/URL: `C:\Users\Administrator\Desktop\飞书20260901-212801.qt`
- Slow-motion file/URL: none
- Duration / fps / dimensions: 23.383s / 30fps / 720×1556 / 700 video frames / H.264 with AAC audio
- Relevant crop: the embedded white motion card, approximately source pixels `x=10..709`, `y=470..859`; the useful screen-recording interval begins around 3.0s
- Analysis date: 2026-09-01

The private desktop recording, Watch output, and extracted frame caches are analysis inputs only and are not committed.

## One-sentence target

A centered sequence of words changes rapidly by preserving and sliding reusable glyphs, shrinking removed glyphs away, and growing new glyphs into their final slots with opposing per-character stagger.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–3.00s | 000–089 | Screen setup | iOS Control Center closes and the social post becomes visible | exclude from the effect | high |
| 3.00–3.40s | 090–101 | Existing loop already in progress | partial previous/month glyphs are visible before the first clean word | do not use as the loop start | high |
| 6.15–6.28s | 185–188 | Hold on `August` | the complete word is centered and still | short stable hold before the next change | high |
| 6.28–6.68s | 189–200 | `August` → `September` | final old glyphs begin shrinking first; `Sep` appears before `tember`; the retained lowercase `t` moves toward its new slot | old progress is advanced by glyph index, new progress is delayed by glyph index, matched glyphs interpolate horizontally | high |
| 6.68–6.98s | 201–209 | Hold on `September` | the full word is readable and centered | residual easing completes during a short hold | high |
| 6.98–7.30s | 210–219 | `September` → `October` | several old clusters shrink in place while new `Oc`, then `to`, then `ber` grow into separated slots; spacing closes quickly | diff old/new glyph identities, preserve first unmatched equal glyph, then interpolate every destination slot | high |
| 7.30–7.62s | 220–228 | Hold on `October` | final word remains centered; no bounce or vertical travel | stable end state | high |
| 7.62–8.02s | 229–240 | `October` → `November` | shared `o/e/b/r` glyphs slide; unmatched old glyphs shrink; `N/v/e/m` grow left-to-right | same morph family; transition starts from current centered metrics, not fixed character indices | high |
| 8.02s–end | 241–699 | Repeating sequence | month transitions repeat with the same rhythm across short and long words | deterministic per-row cycle, approximately 0.70s between transition starts | high |

## Element model

- Text unit: Unicode grapheme cluster, not UTF-16 code unit.
- Persistent elements: the first still-unclaimed equal grapheme found in the destination text.
- Replaced/removed elements: unmatched old graphemes shrink toward a near-zero scale and fade; unmatched new graphemes grow from near zero and fade in.
- Image/icon behavior: none in the reference; keep this effect text-only so media does not obscure the motion contract.
- Layer order: old/moving glyphs first, new glyphs second; matched destination glyphs are not drawn twice.

## Spatial rules

- Composition center: each complete word is optically centered in the card/stage.
- Alignment: horizontal baseline; word bounds are recomputed from real font metrics for both source and destination.
- Scale behavior: removed glyphs scale down; added glyphs scale up; persistent glyphs retain full font size while translating horizontally.
- Responsive/aspect-ratio behavior: the selected logical canvas controls geometry; font size, tracking, offsets, and clipping scale from output dimensions rather than browser viewport size.
- Entry/exit boundaries: glyphs remain on the baseline; disappearance completes when scale/alpha reaches zero rather than by leaving the canvas.

## Timing and easing

- Total loop: `rowCount × (morph duration + hold duration)`.
- Phase durations: representative transition start spacing ≈ 0.70s; default morph 0.60s plus 0.10s hold.
- Overlaps: old shrink/move and new growth occur concurrently.
- Holds with residual motion: the ease-out tail is visually subtle; no inserted zero-velocity pause inside the morph.
- Hard cuts: none between sequence rows.
- Easing/spring hypotheses: quintic ease-out for position and scale; no bounce, recoil, rotation, blur, or vertical offset in the reference.
- Per-character ordering: old glyph progress advances by roughly `+0.026 × index`; new glyph progress delays by roughly `−0.026 × index`.

## Motion contract (frozen before implementation)

- All glyphs share one baseline and one transition clock.
- Reusable graphemes keep their identity and interpolate from the previous centered glyph box to the destination centered glyph box.
- An old grapheme may match only one destination grapheme; repeated characters are claimed in first-unclaimed destination order.
- Unmatched old graphemes scale/fade out in place, with later indices leading.
- Unmatched new graphemes scale/fade in at final destination positions, with earlier indices leading.
- The whole destination word is centered from its measured width; character count is never used as a width proxy.
- No vertical motion, blur, rotation, particle effect, spring overshoot, or full-word crossfade is introduced unless later evidence requires it.

## Reuse plan

- Existing animation/math to reuse: Unicode splitting and deterministic Canvas layout patterns from Color Recompose; independently adapt the character-diff/limbo model described by LTMorphingLabel.
- Shared UI files: `site/workspace-editor.css`, `site/me-motion-editor.css`, `site/shared-font-library.js`, and `site/stg-cn.js`/`site/stg-cn.css`.
- Shared media/image files: none required by the reference.
- Shared export files: `site/js/continuation-gif.js`, `site/js/continuation-gif.worker.js`, `site/js/h264-mp4-encoder.web.js`.
- New core logic required: deterministic grapheme matching, measured source/destination glyph slots, per-glyph staggered quintic interpolation, and editable multi-row sequence state.
- External technical reference: [lexrus/LTMorphingLabel](https://github.com/lexrus/LTMorphingLabel), MIT licensed. Its per-character diff, intermediate glyph state, `easeOutQuint`, default 0.6s duration, and 0.026s character delay closely match the observed video. The web implementation remains native to this repository and does not import the Swift/UIKit package.

## User-editable parameters

### Common

- ordered text rows
- font, weight, size, tracking, alignment, text/background colors
- morph duration, hold duration, master speed, loop on/off
- canvas preset/custom size and composition X/Y

### Advanced

- character stagger
- scale floor for disappearing/appearing glyphs
- matching policy preview/reset

## Figma role

- Use Figma to document the composition frame, baseline, source/destination word boxes, representative 0%/25%/50%/75%/100% keyframes, and timing tokens.
- Do not use Smart Animate as the production renderer: arbitrary user text needs runtime grapheme diffing and font measurement that Figma cannot supply deterministically for every edit/export.
- If a Figma node is supplied later, read static and motion context from that exact node, then map only verified values into the shared deterministic Canvas timeline.

## Uncertainties to verify

- The original implementation may use LTMorphingLabel's simple first-unclaimed matching rather than an edit-distance/LCS matcher; default to the former because repeated-letter movement in the dense frames is consistent with it.
- The source recording contains a social-app mute badge inside the card; it is UI chrome and must not appear in the reconstructed effect.
- The exact source font is close to a heavy system sans. Use the repository Inter preset by default and keep the full shared font library editable.

## Acceptance evidence

- [x] Normal-speed comparison
- [x] Key paused frames (25% / 50% / 75% of `September` → `October`)
- [x] Chinese input (`春风又绿江南岸`, Noto Sans SC)
- [x] Desktop stage centering (square and 9:16)
- [x] Inspector scroll reaches bottom
- [x] Mobile layout (390×844, stage above inspector)
- [x] Console clean (application code; the GIF encoder emits one browser performance advisory during readback)
- [x] PNG generated (1080×1920)
- [x] GIF generated (320×320 test export)
- [x] Video generated (H.264, 320×320, 24fps, 3.000s test export)
- [x] Deterministic paused render (two 25% keyframe captures produced identical SHA-256)

## Feedback discoveries

- 2026-09-01: retained glyph identity plus opposing old/new stagger is the defining motion; a whole-word dissolve is not an acceptable approximation.
