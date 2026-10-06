# Effect analysis: `Type Garden 字园`

## Source material

- Normal-speed file/URL: https://type-garden.vercel.app/ (live site, Type and Poster modes)
- Source code: https://type-garden.vercel.app/source.txt — the author's own published source and remix brief ("Copy code … paste it into Claude to grow your own"). No separate licence file is published; keep the credit in the engine header, editor and README.
- Duration / fps / dimensions: poster loops are 3–7 s at 30 fps, 1080 × 1080
- Analysis date: 2026-10-05

The source is code, not video, so the phase table is read from the deterministic poster renderer and confirmed by rendering the original and the port at the same times (`orig-*.png` vs `mine-*.png`, seed 7, "in bloom"): Breathe 0.4 / 1.5 s, Grow & wither 1.8 s, Visitor 2.5 s, Gust 2.0 s, Reach 1.2 s and Typed 1.5 s match stem for stem. The only visible difference is the typeface.

## One-sentence target

Stems, roses, leaves and curls grow out of every typed letter; a space cuts the stems so the next word starts its own garden, backspace withers, and seven loops animate the finished garden.

## Phase table (per poster preset, ms in the preset's own clock)

| Preset | Length | Phases | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| Breathe | 3000 | one continuous sway (sin of phase + x + stem height) | `warp`/`rotw` in breathe branch | high |
| Grow & wither | 6000 | letters born at 200 + i·min(110, 3000/n); full bloom until min(d); wither from 4200 + (n−1−i)·wd over 600 ms; empty tail | `l.b`, `l.d`, `st.wither = 600` | high |
| Typed | 5000 | letters born at 300 + i·min(85, 3600/n) with caret; cut end-growth at spaces; blank from 4400 | typed branch | high |
| Gust | 4000 | wind front x = −0.35 + u·1.9 sweeps left→right; still before, damped sway after | wind `warp` | high |
| Reach | 6000 | light at (cx + sin φ·430, cy + sin 2φ·260); stems lean towards it | reach branch | high |
| Scatter | 6000 | births random in 150–2550; all wither at 4700 + i·8 | scatter branch | high |
| Visitor | 7000 | butterfly enters 0–1.8 s, perches 1.8–3.4, hops 3.4–4.6, perches 4.6–5.8, leaves 5.8–7.0 | `posterFly` | high |

## Element model

- Text unit: one grapheme = one letter with its own stems; words share a seed (`ws`) and index (`wi`); the first letter of a word always carries a rose and a back curl.
- Persistent elements: stems (woven over/under the letter in segments), thorns, leaves with veins, six-petal roses with spiral and scallop lines, end tendril on the last letter of a word.
- Replaced/removed elements: backspace withers the last letter in 260 ms (live) / 600 ms (poster).
- Image/icon behaviour (CellMotion addition): an inserted icon is a letter whose advance is its size plus gap; it grows stems exactly like a glyph.
- Layer order: layer-0 stems/leaves/roses → type → layer-1 stems/leaves/roses.

## Spatial rules

- Composition centre: the type block is centred; the poster then scales so the whole garden fits a 6 % margin (k ≤ 1.25).
- Scale behaviour: one line at min(0.28 H, 0.8 W / width); multi-word text wraps when that falls under 0.1 H.
- Responsive/aspect-ratio behaviour (CellMotion addition): the logical canvas keeps its short side at 1080, so 1080 × 1080 is pixel-identical to the original and every other size keeps the original's stroke weights and pixel constants. Margins become 0.44 W / 0.44 H. Editor rows are forced line breaks; CJK characters and icons are their own words so long Chinese lines still wrap.

## Timing and easing

- Stem growth: ease-out cubic over max(320, len·620) ms. Leaves: spring (7, 15). Petals: spring (8, 14) staggered 85 ms, then spiral/scallop lines over 520 ms.
- New-letter wobble: damped sine (11 rad/s, e^−3.2t) for 2.5 s.
- Hand-drawn boil: jitter re-seeded every 120 ms, amplitude max(0.8, S·0.01).
- Cut recoil: end tendril pulls back by min(0.85, recoil / 0.6 S) over 150 ms.

## Reuse plan

- Engine: `site/typegarden-engine.js` is a line-for-line port of the original class methods; only the canvas host, letter width (`lw`) and preset constants tied to 1080 were generalised.
- Editor: City Stack / Sprout Shift shell (`typecascade-workspace.js`, polish, selects, locale), shared font and icon libraries, shared GIF worker and H.264 encoder.
- Live typing mode keeps the original keyboard/IME diffing, mouse-facing roses and click-to-release butterflies inside the composition frame.

## Uncertainties

- GT Ultra Fine (original letters) is commercial; Playfair Display Bold is the stand-in the author's own brief recommends. Glyph widths differ slightly, so stems sit a few pixels differently around letters.
- The original's SVG export used a private `glyphs.json` of outlines; the port exports stems and flowers as paths and type as editable `<text>`.
- The hidden `reference` preset in the source (bars animation) is not exposed by the original UI and is not ported.
