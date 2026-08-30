# Reference-video analysis workflow

Read this only when a user supplies a video or asks for close motion matching. The repository's longer checklist is `docs/REFERENCE_VIDEO_WORKFLOW.md`; this file records the routing rules another computer must apply before changing an effect.

## Evidence pass

1. Preserve the source file. Identify normal-speed versus slow-motion clips; normal speed decides rhythm and slow motion clarifies ordering, path, overlap, and brief holds.
2. Do not conclude FFmpeg is unavailable from `PATH` alone. Check `where ffmpeg`, `where ffprobe`, the bundled workspace dependencies, and known local tool directories. On Windows use `python`, not `python3`, for the Watch scripts.
3. Read exact duration, frame rate, frame count, and dimensions with `ffprobe` before sampling.
4. Use the `watch` skill for a broad chronological pass. Prefer `--no-dedup` for subtle kinetic motion and read every returned frame.
5. Watch is capped at 2 fps. For fast or sub-second motion, use FFmpeg for a dense 10–30 fps crop or contact sheet around the important interval. A six-frame overview is not a frame-level analysis of a 30 fps clip.
6. Write an evidence table before coding: timestamp/frame range, visible observation, motion interpretation, confidence, and uncertainty. Record phase overlaps; never assume phases are sequential.

## Translate evidence into implementation

- Separate content units, layout rules, motion channels, timing/overlap, and rendering choice.
- Search the repository first for reusable path math, timeline, editor, media, icon, font, and export systems.
- Make preview and export use the same deterministic time and geometry functions.
- Preserve velocity across a fluid phase boundary. A hold can contain low-speed residual motion; a pop, cut, spring, or matched switch must remain intentionally distinct.
- Expose user-facing parameters that match visible decisions: duration, start/overlap timing, stagger, hold, distance, direction, spacing, size, color, and rhythm. Avoid anonymous coefficients.
- Compare normal speed, then pause at phase boundaries and one or more overlap frames. Test changed text length and at least one CJK input.

## Reconstruct fast continuous choreography

Use these checks when a reference completes several visible phases within a few seconds, especially flowing text, repeated rows, rebounds, and ordered exits.

- Track at least one stable glyph or icon across consecutive dense frames. Record its position delta, scale, and visibility instead of inferring motion from the changing silhouette of the whole frame.
- Treat filling, drifting, reversing, and exiting as motion channels that may overlap. If rows are still entering while already drifting, begin drift per row at reveal time rather than after a global fill phase.
- Do not insert a zero-velocity hold merely because one named phase ends. At a fluid reversal, carry the incoming velocity into a short deceleration and acceleration curve, or use a deliberate impulse; verify that no middle row freezes while staggered rows change direction.
- Distinguish disappearance mechanisms from dense frames. Translation plus scale/opacity is not a wipe; clipping is not a row being pulled away. Match the observed glyph edges, spacing, and residual motion rather than choosing the easiest concealment.
- When entrance and exit share a visual gesture, model them from the same motion family with direction, order, and timing changed. Preserve per-row ordering while keeping every active row moving.
- Keep inline icons in the same token layout and motion field as text. They must inherit row drift, reversal, scale, and exit unless the evidence shows an independent path. Recompute adjacent text positions when icon size or gap changes so assets do not vanish, overlap accidentally, or leave uneven row endings.
- For a character-to-icon scan, preserve the character slot identity: character → icon → original character before advancing, unless concurrent replacements are visible in the reference. Animate the neighboring advances created by a wider icon, then restore the original spacing. Expose scan interval/hold plus per-slot icon scale and before/after gap when those decisions are visible.
- At responsive sizes, compare normalized row edges and exit envelopes. A crop may hide different content, but it must not create accidental short rows, missing icons, or inconsistent pull-away boundaries.

## Reference-to-export comparison loop

1. Align the reference and implementation at an observable event such as first reveal, full occupancy, reversal onset, or final restoration; do not align only by total duration.
2. Inspect both at normal speed for rhythm and at slowed speed for ordering. A slow-motion match that feels stalled at 1× is not accepted.
3. Extract matching dense frames around every phase boundary and at least one overlap. Compare position deltas between frames to detect accidental zero velocity, direction spikes, and rows that stop while others continue.
4. Compare the real exported video, not only the live stage. Use the same canvas ratio and inspect text/icon spacing, row edges, visibility, and phase timing at the aligned frames.
5. Change one timing control at a time during diagnosis. Confirm that its label changes the named interval or overlap directly; remove or rename controls whose effect cannot be explained from the visible timeline.

## Oil Motion decision boundary

`oil-motion` is optional and should not be loaded merely because a video exists.

Stay with `watch` + FFmpeg + the project's Canvas/SVG/CSS/GSAP runtime when the motion can be expressed with typography, paths, transforms, opacity, clipping, color, particles, icon/image layers, or deterministic timeline math. This is the default for nearly all font-animation effects and costs less context.

Use `oil-motion` only when the requested result genuinely needs generated or pre-rendered semantic motion that ordinary web animation cannot preserve, such as:

- realistic articulated bodies, paper folding/crumpling, liquid/material deformation, or changing object topology;
- evolving occlusion, contact, lighting, texture, or camera motion that cannot be represented by moving existing layers;
- a user-requested generated-video, keyframe-to-video, alpha-atlas, chroma-video, or interactive-media pipeline.

Even then, load only the Oil Motion reference route required by the chosen delivery. Do not run model configuration, generation, or delivery-selection steps for a normal Canvas/DOM effect.

## What is committed

Commit the effect code, shared systems, approved presets/previews, the reusable rule learned, and a compact analysis note when it adds durable evidence. Do not commit private source videos, Watch work directories, extracted frame caches, encoder scratch files, browser traces, or unrelated output folders.
