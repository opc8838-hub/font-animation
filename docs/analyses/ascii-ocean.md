# ASCII Ocean

2026-10-20. Effect id: ascii-sharks. Release on cellmotion.cn.

The final composition combines four shark variants, one whale and one manta ray in a light, finely gridded ocean. The draft ascii-whale.html URL redirects to the combined editor. See [video analysis and user refinements](ascii-sharks-video.md) for evidence and uncertainty.

The original renderer uses deterministic paths, articulated spines, attached fins, species-specific silhouettes, shaded character tiles, traveling light and staggered glyph/glint changes. One continuous phase drives preview, seek, component playback and all exports. The default frame is 1920 by 1080 (16:9), as requested after the manta-tail refinement. The hammerhead has a rigid local transverse head bar, a narrow neck and terminal eyes. Whale geometry includes a broad rounded head, long pectoral fins and transverse flukes.

The effect adapter reuses cardmotion-editor.js, the shared font/media libraries, queued component bridge, scheme persistence and PNG/GIF/H.264 encoders. Controls expose tint, background, accent, tile contrast, light flow, creature size, density, fish count, particles, tail amplitude, direction, cycle duration and speed. Per-creature state owns size, opacity, position, rotation and optional caption/font/color/gap. Gallery entry opens immutable defaults; normal refresh resumes autosave.

Start a site server on port 4183 and run python tests/ascii-ocean-browser.py. The acceptance script checks deterministic motion and loop endpoints, timeline/playback, desktop/portrait/square layout, explicit insert, per-asset editing, Chinese captions, save/import/reset/storage precedence, the real component popup/player, mobile layout and actual PNG/GIF/MP4 exports. It regenerates the default JSON, poster and full-cycle gallery MP4. Review artifacts stay in ../output/ascii-ocean-review.

Static gates cover syntax, editor/shared contracts, catalog generation, site references and git diff --check. No upstream source code or character artwork is distributed. The unavailable original simulation seed and pointer history prevent claiming frame-identical paths; the reconstruction targets the observed visual and articulated motion contract.

## 2026-10-21 optional ink release

User explicitly requested publishing the latest fish and ink version, a selectable ink layer, and a gallery movie containing `love from .`. The existing ascii-sharks route now loads the optimized ink adapter. Ink is enabled in the approved example and can be disabled with one checkbox, leaving only the ocean cruise timeline and avoiding all ink preparation/drawing. The complete setting is persisted in schemes and component manifests; old schemes without the setting inherit enabled ink. Multiline text, size, two-axis position, pure white background, 4:5 proportional fitting and fish refinements are included. A 960x540 30 FPS full 27-second gallery export and a 4.3-second written-state poster replace the old plain-ocean cover. No additional gallery entry or effect count is introduced.

Browser release checks cover toggle behavior and hidden ink pixels when off, phase removal/restoration, saved/imported disabled multiline schemes and positions, the real AI player, mobile header, 16:9/4:5/square/portrait canvases and PNG/GIF/MP4 downloads.
