# Effect analysis: 无重力翻转 / Zero-G Flip

## Source material

- Normal-speed file: desktop `无重力翻转.qt` → `work/zero-g-flip/reference-inner.mp4` crop `720x480`
- Slow-motion file: desktop `慢飞书20260917-233532.qt` (13.2s) — **ordering only, not rhythm**
- Duration / fps / dimensions: **5.27s · 30fps · inner 720×480**
- Analysis date: 2026-09-18 (second-level rebuild; 10fps original `orig10/o_01–o_53`)

Do not commit the private source video.

## One-sentence target

A centered picture-card hangs in zero-g, makes **one** silky yaw turn in ~1.2s, eases to face-on, then holds still while **only the card** changes color; the camera creeps past the room, it does not carousel.

## Phase table (normal speed, 10fps)

| Time | Frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–1.00s | o_01–o_09 | 合拢（本效果不做） | Exploded plates collapse | Skip. Card starts already assembled. | high |
| 1.00s | o_10 | 翻转起 | Assembled, **back 3/4**, ~20–28° yaw, slight pitch | Rest pose is never billboard-flat | high |
| 1.10s | o_11 | 侧棱 | Thin edge, still centered | Continuous yaw, ~90° | high |
| 1.20s | o_12 | 侧棱→正面 | Screen sliver | Same yaw, no X drift | high |
| 1.30–1.50s | o_13–o_15 | 正面 3/4 | Lock screen, 斜角 shrinking | Passing front, still one turn | high |
| 1.60–1.80s | o_16–o_18 | 再侧棱 | Front thins, then edge-on stick | Continuing the **same** 360° | high |
| 1.90–2.10s | o_19–o_21 | 背面 3/4 | Back + camera island, lights/glass in bg | ~270–330° | high |
| 2.10–2.30s | o_21–o_23 | **回正** | Yaw eases to nearly face-on back | Last ~0.25s of the **same** spin, not a cut | high |
| 2.30–3.40s | o_24–o_34 | **定住** | Phone locked, burgundy; desk band stays | Card velocity ≈ 0. Camera still creeps, room recedes | high |
| 3.50–4.00s | o_35–o_40 | 变色 银 | **Phone** goes silver; room still visible | Direct material swap, no flash, no global black | high |
| 4.20–4.60s | o_42–o_46 | 变色 黑 | Phone black | Hold silver then cut/crossfade to black | high |
| 4.80–5.27s | o_48–o_53 | 变色 蓝 | Phone steel-blue | Direct swap again | high |

## Motion contract (frozen)

1. **Card stays screen-center.** No X translation. Zero-g = no fall, no table bounce, no carousel of the subject.
2. **One yaw turn** from assembled 3/4 to facing: **1.20s**, mostly even angular speed, last ~0.25s eases into 回正.
3. **Camera is a slow room-slide**, not a 360° merry-go-round. During the 1.2s flip the room changes (monitors → desk → lights → glass) ≈ **50–80°**. During hold+color it creeps maybe **+20–30°** more and the room recedes. Total orbit over the assembled clip ≈ **80°**, never a full wrap.
4. **Color is only on the card**, after lock: original → silver → black → steel blue. Environment stays the office. No brightness pulse.
5. Slow-mo is for pose (斜角, edge-on, center lock). **Normal speed decides seconds.**

## Timing to implement (2026-09-18 ms pass)

30fps crop `flip30/f_001–f_042` = original **1.000–2.367s**. Slow-mo not used for seconds.

| t (s) | Frame | Card yaw (approx) | Camera / background | Shared? |
| --- | --- | --- | --- | --- |
| 1.000 | f_001 | back 3/4 ~25° | dark, monitor bar | start |
| 1.100 | f_004 | edge ~90° | desk appears | same clock |
| 1.200 | f_007 | front 3/4 | desk bright | same |
| 1.300–1.400 | f_010–013 | front, 斜角 shrinking | desk holds, room | same |
| 1.500 | f_016 | front leaving | lights enter top-right | same |
| 1.633–1.733 | f_019–022 | edge-on stick | lights streak (camera fast) | same |
| 1.833–1.900 | f_025–028 | back 3/4 | lights + glass | same |
| 2.000–2.200 | f_031–037 | 回正 to facing | glass wall in, still moving | **brake together** |
| 2.300+ | f_040 | locked | slow residual pan | camera coasts |

**圈 = 一次 360°。** 原片 1.00–2.20s 是背面→正面→背面，正好 **1 圈**。把「3 圈」当成三次 360° 会转出 6 次翻面。

镜头在这 1.20s 里和旋转同一时钟往右推（桌沿、灯带、玻璃墙一起进来），回正后卡片停、镜头带着余速再漂。

Loop: **1×360° / 1.20s** + hold 1.15s + recolor 1.90s. Wide plate `bg-office-wide.jpg`.

## Uncertainties

- Exact camera degrees are estimated from background features, not tracked 3D.
- Explode/assemble (0–1.0s) stays out of this effect.
- Caption is screen-space.
