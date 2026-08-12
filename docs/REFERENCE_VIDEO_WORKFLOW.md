# Reference video → editable motion effect

This is the repeatable workflow used to turn a reference recording into a new ME Motion Studio effect. It records the methods learned while building Continuation, Current Wall, Vertical Rise, Creator Merge, Path Writer, Prism, and the Icon Burst refinements.

The goal is not to copy a few screenshots. The goal is to reconstruct the motion logic, timing, spatial relationships, and editable parameters closely enough that the result still feels right with different text, fonts, icons, and output sizes.

## 1. Preserve the source and define the scope

- Keep the original reference file unchanged.
- Note whether each clip is normal speed, slow motion, or a screen recording with UI overlays.
- If two clips show the same motion, use the normal-speed version for rhythm and the slow-motion version for event ordering and path inspection.
- Do not commit the source video unless its rights and repository size make that appropriate. Commit the analysis note instead.
- Write down the user-visible goal in one sentence before analyzing, for example: “one centered phrase types in, bends onto a wave, then follows the path out.”

## 2. Tool preflight: do not guess that FFmpeg is missing

Run these checks first:

```powershell
ffmpeg -version
ffprobe -version
where.exe ffmpeg
where.exe ffprobe
```

If a command is not on `PATH`, check the workspace dependency runtime and known project dependency directories before reporting it missing. Codex desktop workspaces may contain bundled `ffmpeg-static` / `ffprobe-static` executables. Use the absolute executable path when found.

Also confirm Python when using the Watch Skill. On Windows use `python`, not `python3`.

## 3. Read exact video metadata

Record duration, dimensions, frame rate, frame count, codec, and whether audio exists.

```powershell
ffprobe -v error -show_entries stream=index,codec_name,width,height,r_frame_rate,nb_frames,duration -show_entries format=duration -of json "REFERENCE.qt"
```

Why this matters:

- A 4.2-second clip at 30fps has about 126 source frames; a six-frame visual guess is not a frame analysis.
- Screen-recording UI may occupy most of the frame while the useful animation lives in a small crop.
- Variable or unusual frame rates affect timestamp-to-frame calculations.

## 4. Run a broad Watch pass

When the Watch Skill is installed, run its preflight and use a scene-aware first pass. Resolve the skill directory from the installed `SKILL.md`; do not hardcode another computer’s home path.

```powershell
python "<WATCH_SKILL_DIR>\scripts\setup.py" --check
python "<WATCH_SKILL_DIR>\scripts\watch.py" "REFERENCE.qt" --detail balanced --no-whisper --out-dir "work\reference-name"
```

For motion design clips with subtle changes, use the high-fidelity mode and keep near-duplicate frames:

```powershell
python "<WATCH_SKILL_DIR>\scripts\watch.py" "REFERENCE.qt" --detail token-burner --fps 2 --no-dedup --no-whisper --out-dir "work\reference-name-dense"
```

Important Watch behavior:

- `balanced` is scene-aware and capped; it is useful for finding major phases.
- `token-burner` removes the normal frame cap, but Watch still clamps sampling to 2fps.
- `--no-dedup` is important when judging small frame-to-frame movement, brief holds, or easing.
- Read every frame that Watch lists, in chronological order.
- Use `--start`, `--end`, or `--timestamps` to revisit a specific interval instead of repeatedly scanning the whole video.

## 5. Add dense FFmpeg sampling for micro-timing

Watch is the first pass, not the ceiling. For a short kinetic-type reference, 2fps may miss a pop, cut, recoil, or one-frame overlap. After locating an important interval, extract it at 10–30fps with FFmpeg.

Broad 2fps frames:

```powershell
ffmpeg -i "REFERENCE.qt" -vf "fps=2,scale=960:-2" "work\frames\broad_%04d.jpg"
```

Dense 30fps window from 1.20s for 0.80s:

```powershell
ffmpeg -ss 1.20 -t 0.80 -i "REFERENCE.qt" -vf "fps=30,scale=960:-2" "work\frames\dense_%04d.jpg"
```

Contact sheet for fast comparison:

```powershell
ffmpeg -ss 1.20 -t 2.00 -i "REFERENCE.qt" -vf "fps=10,scale=320:-2,tile=5x4" "work\contact_%02d.jpg"
```

Crop out irrelevant app chrome when it improves readability. Keep the timestamp mapping in the filename or analysis note.

## 6. Build an evidence table before coding

Create `docs/analyses/<effect-slug>.md` from the template in this repository. At minimum record:

| Time | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- |
| 0.00–0.70s | Intro | centered word, no path | opacity/typing reveal on a flat baseline | high |
| 0.70–1.40s | Formation | path appears and glyph angles diverge | interpolate glyph centers from baseline to sampled curve | medium |
| 1.40–2.80s | Travel | whole phrase advances along curve | shared path offset with per-glyph tangent rotation | high |

Separate observation from interpretation. “The center row moves first” is evidence; “a cubic Bézier drives the wave” is an implementation hypothesis.

## 7. Decompose the animation into reusable systems

Analyze each reference through these layers:

### Content

- What are the text units: phrase, line, word, glyph, icon, or image?
- Which units persist, switch, or disappear?
- Are icon substitutions mutually exclusive with their source glyphs?

### Layout

- What is the true composition center?
- Are rows aligned to edges, a shared grid, or their own text widths?
- Does the layout depend on the stage aspect ratio?
- What must remain centered when the left editor width changes?

### Motion

- Translation, scale, rotation, opacity, clipping, blur, color, or path following?
- Which elements share one progress value, and which are delayed?
- Does motion preserve velocity through a phase boundary, or visibly restart?
- Is movement continuous, a hard cut, a pop, a spring, or a matched cut?

### Timing

- Give each meaningful phase an explicit duration.
- Record overlap between phases; do not assume everything happens sequentially.
- Identify holds that are still moving slowly. “Slow motion” is not “pause.”
- Use normal-speed footage to decide whether the overall result feels right.

### Rendering

- Canvas 2D, DOM/CSS, SVG, p5.js, or a hybrid?
- Can an existing effect’s path, token, export, or media system be reused?
- Prefer transforms and opacity for animated DOM elements.

## 8. Search the repository before inventing a new system

Use `rg` to locate similar behavior and shared infrastructure:

```powershell
rg -n "Bezier|path|timeline|MediaRecorder|continuation-gif|media-layer|workspace-editor" site
```

Reusable project systems include:

- `site/workspace-editor.css`: latest ME Motion Studio workspace shell.
- `site/media-layer.js` / `site/media-layer.css`: multiple images, shapes, per-resource editing, background removal, and inline image tokens.
- `site/me-motion-editor.css` / `site/me-motion-editor.js`: shared modern shell for the six newer standalone effects.
- `site/js/continuation-gif.js` and worker: GIF encoding.
- Existing Canvas export code in Current Wall, Vertical Rise, Creator Merge, and Path Writer.

Reuse UI, fonts, media, export, and navigation. A new animation may need a new mathematical core; that does not justify duplicating the entire editor.

## 9. Translate evidence into editable parameters

Expose controls that match what a user can perceive:

- “formation duration,” “left-flow hold,” and “return duration” are clearer than anonymous coefficients.
- Keep a small “common adjustments” section and move specialist values into advanced controls.
- Give defaults that reproduce the reference before optimizing for arbitrary text.
- If two controls appear to do the same thing, prove they affect different phases or remove/rename one.
- Changing timing must preserve phase order and continuity.

Recommended phase model:

```text
intro → formation → hold/continuous travel → reversal/exit → final state → loop
```

Not every effect needs every phase. Use the smallest model that explains the evidence.

## 10. Implement against the real stage

Desktop editors reserve 420px on the left. The animation stage is the remaining area. Read the actual stage/canvas client size:

```js
const width = canvas.clientWidth || window.innerWidth;
const height = canvas.clientHeight || window.innerHeight;
```

Do not center at `window.innerWidth / 2` when a sidebar is present. Export rendering should accept explicit output dimensions and independently center the composition for that output.

For smooth canvas animation:

- Keep one `requestAnimationFrame` loop.
- Derive visual state deterministically from time rather than accumulating position errors.
- Avoid DOM measurement inside every frame when values can be cached.
- Preserve velocity across adjacent phases when the reference is fluid.
- Test long text, short text, Chinese, and icon/image tokens.

## 11. Acceptance checks

Before calling the effect complete:

- Compare it at normal speed with the original reference.
- Pause at the start/end of every phase and compare position, scale, visibility, and direction.
- Confirm the editor scrolls to the final control.
- Confirm content is centered in the actual right stage.
- Test at least one Chinese phrase.
- Test direction/alignment controls if provided.
- Check the browser console.
- Generate a PNG.
- Generate a short GIF and video at a small custom size (for example 320×320, 1 second) to verify the pipeline quickly.
- Then test at least one mainstream output size.

## 12. Repository delivery

Each new effect normally includes:

- `site/<slug>.html`
- `site/<slug>.css`
- `site/<slug>.js`
- `site/final_<slug>.png` or `.svg`
- Gallery entry in `site/gallery.js`
- Global navigation entry in `site/stg-cn.js`
- Updated effect count and relevant notes in `README.md`
- `docs/analyses/<slug>.md`

Use one branch per effect. Before opening a PR, sync with `origin/main`, resolve gallery/navigation conflicts deliberately, run syntax and browser checks, and describe what was actually validated.

## 13. What to save from each iteration

After user feedback, update the analysis note with the discovered rule, not only the code. Examples of reusable discoveries:

- A “hold” can still contain low-speed motion.
- The middle row may initiate a reversal while surrounding rows inherit it with ordered delays.
- A glyph-to-icon switch should be mutually exclusive rather than an icon drawn over the glyph.
- A composition can be mathematically centered in the viewport but visually wrong because the editor occupies part of it.
- Normal and slow-motion clips serve different analytical purposes.

This accumulated evidence is what lets another computer continue the work without repeating every failed interpretation.

