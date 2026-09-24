# Iconburst opening gather speed — 2026-09-24

## Motion contract

Baseline: `9b7233d`. Add a user-controlled 0.5–2× opening speed, default 1×.
The existing scattered icons retain their paths, rotation, scale and landing
positions. The central title remains coupled to their inward movement, and
the side-title entry stays inside this opening chapter.

| Phase | Timing | Frozen behavior |
| --- | --- | --- |
| Opening / gather | Original opening duration divided by speed | Same path and landing pose; default 1× samples identical to baseline |
| Hover / collapse | Starts after the resized opening | Original entry velocity, drift, duration and disappearance |
| Collision / sweep / replacement / finale | Shifted by opening duration delta | Original geometry, durations, overlaps and D–J spacing |

The opening clock eases back to the original velocity at the hover boundary.
Only the opening's duration changes; the minimum cycle duration shifts by the
same delta to preserve the final hold. Preview, timeline, seeking and exports
use the same markers. Releasing the control replays the opening. Save/import
persists the new control; schemes without it use 1×.

## Verification

- Chromium, 1440×900 editor; 1920×1080 and 1080×1920 compositions.
- Compared 1× against the baseline at 0, .2, .5, .75, .9, 1.55, 1.8, 2 and 2.4 seconds.
- At 0.5× and 2×, compared later phases after compensating only for their start-time shift: gather, orbit, text, gap, collision and replacement fields matched within 1e-7.
- Sampled both sides of the hover boundary: continuous, positive movement.
- Confirmed slower/faster gathering at the same elapsed time, save/reload,
  legacy import default, translated label, actual PNG export and no browser errors.
- Exported a full 0.5× cycle as GIF and H.264 MP4 at 480×480 / 30 fps;
  inspected FFmpeg contact sheets. MP4 duration is 3.90 seconds.

No new source-video interpretation is introduced by this control.
