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

---

# 2026-10-06 升级：爆炸拆解 + 体积翻转 + 收尾切换（三星堆默认方案）

## Source material

- Normal-speed file: 用户桌面 `d3b0bd65d43692bfcd39192da6e1bece.mp4`（手机录屏，内嵌 iPhone 16 Pro 片段）
- Duration / fps / dimensions: **6.57s · 19.95fps · 592×1280**，有效画面裁切 `y 360–634`（592×274）
- 用户逐轮确认的成片：本地 `E:\claude工作区\sanxingdui-zerog`（v2→v5，2026-10-03 至 10-04）
- Analysis date: 2026-10-03

## Phase table（原片，正常速度）

| Time | Frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.60s | 000–012 | 爆炸合拢 | 斜角爆炸图，镜头组/机芯/背板分层 | 零件沿机身深度轴快速吸合，镜头同步推近 | high |
| 0.60–2.00s | 012–040 | 翻转 | 背→侧棱→正面→侧棱→背 | 一圈，接近匀速、末段减速；背景同步横移（镜头绕拍） | high |
| 2.00–2.50s | 040–050 | 回正关灯 | 主体停正，背景逐渐压暗 | 轻微过冲余晃；环境压暗只留主体 | high |
| 2.50–6.30s | 050–126 | 切换 | 红→银→黑→蓝→红，每 ~0.65s | 位置不动，**硬切** | high |
| 6.30s– | 126– | 片名 | 切黑，小字 "iPhone 16 Pro" | 片名卡 | high |

## 用户确认的改动（覆盖 2026-09-18 契约中的对应条目）

1. **开场爆炸拆解恢复**：主体按切线拆成前壳、后壳、两侧、底部，在 3D 中飞散后**真实拼合**（不换图）；用户爆炸图只作为"内部结构"插在前后壳之间，合拢时被外壳吞没。第一版"平面零件平移 + 淡入"被用户判定为"假"。
2. **仰角 + 广角开场**：俯仰 −22°、FOV 40° 起，翻转中放平并收到 18°（物体大小不变）。
3. **背景推移从最左到最右**（全景整幅），原 2026-09-18 的"缓慢推 50–80°"被用户判定"幅度太小、没有感"。
4. **节奏**：合拢 0.85s（用户先嫌 0.5s 太快），翻转 1.47s（≈原片 1.4s），回正后 0.97s 首切。
5. **收尾越切越快**：间隔 0.50 → ×0.84 递减，最后一张停 0.40s，片名 1.35s。切换为硬切（一次 2 帧溶解被用户判为重影）。
6. **主体体积**：由透明底轮廓的距离场生成圆鼓厚度（单面厚 = 0.62×最大内切半径）、法线细节和去五官的背面铜锈纹理；空心内壁偏暗。

## Timing（默认方案，单位秒）

| 阶段 | 起 | 止 |
| --- | --- | --- |
| 爆炸拆开（悬停） | 0.00 | 0.30 |
| 合拢 | 0.30 | 1.11（1.15 吸合，"咔"一下边缘反光 + 1.4% 回弹） |
| 翻转 | 1.11 | 2.58 |
| 回正关灯 | 2.58 | 3.55（关灯 2.48–3.18） |
| 切图 ×5 | 3.55 / 4.05 / 4.47 / 4.82 / 5.12 | 5.52 |
| 片名 | 5.52 | 6.87 |

## Uncertainties

- 侧面/背面由正面轮廓推算，暂停细看比实物圆润；已在编辑器提示"正面清晰的透明底图效果最好"。
- 爆炸图自动切块按空白缝判断；零件粘连处可能合成一块（默认图中夹板与薄夹板合为一块），用户可在零件条里开关。
- 壳体飞散方向按 3/4 侧面 + 仰角 22° 调好；用户把起始朝向或仰角改得很大时，布局会偏离默认构图。

## Feedback discoveries

- 2026-10-04（爆炸合拢）：平面爆炸图无法与立体主体无缝合拢；必须由主体自身拆分，爆炸图只做内部结构。
- 2026-10-04（切换）：收尾切换一律硬切，任何溶解都会被看成重影。
