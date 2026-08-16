# Effect analysis: `Rapid Sequence / 速序轮播`

## Source material

- Normal-speed file: `动效10-1.qt`
- Slow-motion file: `动效10-2.qt`
- Normal metadata: H.264 + AAC, 4.933333s, 30fps, 148 video frames, 720×1556
- Slow metadata: H.264 + AAC, 8.200000s, 30fps, 246 video frames, 720×1556
- Relevant crop: social-app chrome is excluded; only the centered pale animation panel is reconstructed.
- Analysis date: 2026-08-16

## One-sentence target

Three left-aligned lines build with short vertical rolls, a two-part title replaces them, and a fast but continuous centered text carousel resolves into an icon and colored shape.

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.24s | 000–006 | First line | `Smooth.` rolls into the center group | one line-level vertical entrance | high |
| 0.24–0.92s | 007–027 | Line build | `Stylish.` and `Customizable.` join below with shared left edge | stagger complete lines, not per-letter animation | high |
| 0.92–2.00s | 028–059 | Three-line hold | completed three-line group remains readable | hold the measured group; no unnecessary per-glyph motion | high |
| 2.00–2.65s | 060–078 | Two-part title | `That's` appears first, then the emphasized `iPhone.` is appended | re-center the group as the colored suffix arrives | high |
| 2.65–3.00s | 079–089 | Icon cut | dark frame with centered icon | short hard scene cut | high |
| 3.00–4.08s | 090–121 | Fast sequence | several small centered labels replace/roll rapidly | continuous item position driven by one mapped progress curve | medium |
| 4.08–4.93s | 122–147 | Icon / shape outro | icon returns and a pale shape grows behind it | stable icon-centered ending with short shape pop | high |

## Element model

- Text unit: complete line for the intro; complete label for the rapid carousel.
- Persistent elements: pale background except the brief dark icon cut.
- Replaced/removed elements: three-line group, bridge title, icon cut, rapid labels, and outro are mutually exclusive scenes.
- Image/icon behavior: project icon, transparent animal, or uploaded image/GIF participates in both icon scenes.
- Layer order: background → current text item → icon → outro shape.

## Spatial rules

- Composition center: stage center.
- Alignment: intro lines share one measured left edge; bridge and carousel are centered.
- Scale behavior: no per-letter scale animation; icon size is independent.
- Responsive/aspect-ratio behavior: composition uses the actual stage and uniform logical scale.
- Entry/exit boundaries: line and carousel entries use vertical travel inside the stage.

## Timing and easing

- Total reference loop: 4.933333s.
- Default implementation loop: 4.93s.
- Phase durations: 0.23s line stagger, 0.19s line roll, 1.35s readable hold, 0.65s bridge, 0.35s icon cut, six 0.18s carousel beats, 0.85s outro.
- Overlaps: each intro line starts before the previous entrance fully settles.
- Holds with residual motion: none required; movement resumes from the next scene without a blank frame.
- Hard cuts: bridge-to-dark-icon scene is hard.
- Easing hypothesis: line entrances use smoothstep; carousel offers steady, accelerating, decelerating, pulsed, and whip mappings over one continuous position.

## Reuse plan

- Existing animation/math to reuse: Focus Wheel continuous phase mapping and Creator Studio's line-level carousel principle.
- Shared UI files: latest ME Motion Studio shell and collapsed advanced controls.
- Shared media/image files: project icons and transparent animals.
- Shared export files: local GIF and WebM encoders.
- New core logic required: line-group builder, two-part re-centering title, and selectable continuous carousel speed curves.

## User-editable parameters

### Common

- Three-line text, bridge title, rapid labels, overall speed, line stagger, line roll, readable hold, per-item carousel time, rhythm preset, icon, icon size, icon cut, and outro hold.

### Advanced

- Font size, line gap, scroll distance, roll softness, and stage position.

## Uncertainties to verify

- Several rapid labels are too small in the source recording to transcribe confidently; editable defaults preserve the motion system rather than those specific product labels.
- The original outro shape may be a translucent triangular badge; implementation uses a rounded colored slab to remain brand-neutral.

## Acceptance evidence

- [x] Normal-speed comparison
- [x] Key paused frames
- [x] Chinese input
- [x] Desktop stage centering
- [x] Inspector scroll reaches bottom
- [x] Mobile layout
- [x] Console clean
- [x] PNG generated
- [x] GIF generated
- [x] Video generated

## Feedback discoveries

- 2026-08-16: the fast stage should animate one complete label at a time. Animating every glyph adds cost and visual noise without matching the reference.
