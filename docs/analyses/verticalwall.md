# Effect analysis: 纵跃 / Vertical Rise

## Source material

- Normal-speed file: local desktop `飞书20260830-113624.qt` (not committed)
- Duration / fps / dimensions: 3.90s / 30fps / 540×1166 / 117 frames
- Relevant crop: central white animation area; phone and social-app chrome excluded from motion interpretation
- Analysis date: 2026-08-30

## One-sentence target

`leveling up` 从画布中心略下方明显压缩起跳，向观看者跃出并越过中心落点后回稳，随即带动多行弹满；收束后以水流同款扫变完成末行字母与“正向→设定角度→回正”的原位二维图标切换，最后快速消失。

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.20s | 源片 009–015，内容按用户修订 | 中心跳出 | `leveling up` 的文字包围盒从约 368×74 增至 448×90，同时中心点向上移动约 21px | 不能只做等比放大；从中心略下方以轻微纵向压缩起跳，越过落点后回稳，开场快慢由独立参数控制 | high |
| 0.20–0.56s | 源片 015–019 起 | 跳出并连续弹满 | 中心词仍在向前放大时，上下相邻行已经出现 | 铺满提前与开场后段重叠，中心词不经过静止帧就继续匹配字墙尺寸 | high |
| 0.56–0.86s | 用户修订 | 立即收束 | 满屏完成的下一刻直接进入外围行退场 | 不设置满屏静止段，收尾单行在退场后半段接管中心 | high |
| 0.86–1.38s | 用户修订 | 末行扫变 | 指定字母依次替换为图标，再依次恢复 | 沿用水流的“字母→图标→字母”扫变；图标以 0° 正向扫入，快速原位旋转到设定角度，再回到 0°，随后才恢复字母 | high |
| 1.38–1.52s | 用户修订 | 恢复后停留 | 完整 `leveling up` 短暂停留 | 停留时长可编辑 | high |
| 1.52–1.64s | 用户修订 | 快速消失 | 末行快速缩小并淡出 | 独立可编辑退场时长，结束后循环回到首帧 | high |

## Element model

- Text unit: 开场词、逐行字墙、收尾字母槽位
- Persistent elements: 背景与中心对齐轴
- Replaced elements: 收尾指定字母槽位与对应图标互斥显示
- Image/icon behavior: 满屏每行分别拥有独立字图间距、图标大小和左右位置；收尾每个槽位拥有独立前后间距、大小、静态位置和 −360°～360° 二维平面旋转角
- Layer order: 背景 → 字墙/末行 → 舞台播放控件（仅编辑器）

## Spatial rules

- Composition center: 实际画板中心，不使用浏览器窗口中心
- Alignment: 单行水平居中；字墙从中心行向上下展开
- Scale behavior: 开场从画布中心约 75% 尺寸近线性放大到 100%，随后继续匹配字墙尺寸；收尾图标动态撑开相邻文字但中心位置不漂移
- Responsive behavior: 1:1、4:5、9:16、16:9 和自定义尺寸共用归一化几何
- Entry/exit boundaries: 外围行允许超出画板裁切；编辑器标记不进入导出

## Timing and easing

- Total loop: 由中心跳出、连续弹满、立即收束、收尾扫变、恢复停留、快速消失六段共同决定
- Overlaps: 中心跳出的后 32% 与字墙铺满重叠；字墙退场后半段提前显露收尾文字
- Holds with residual motion: 满屏没有停留；收尾图标先正向出现，在原槽位快速旋转到设定角度并回正，之后才进入字母恢复节点
- Hard cuts: 无开场换词硬切，首行与收尾默认统一为 `leveling up`
- Easing: 开场按源片密集帧使用近线性尺度增长；收尾沿用水流扫变 easing，末帧快速缩小淡出

## Reuse plan

- Existing animation/math: 保留纵跃字墙展开与回收
- Shared UI: `currentwall.css`, `me-motion-editor.css`, `me-motion-editor.js`
- Shared media: `shared-icon-library.js`, `token-asset-tools.js`
- Shared export: `continuation-gif.js`, `h264-mp4-encoder.web.js`
- New core logic: 每行独立字图间距、大小和左右位置状态及浮动满屏总览；带纵向轨迹和明显压缩/回弹的开场跳跃；水流同款末行槽位扫变

## Uncertainties

- 源视频带有录屏 UI；首段已裁取中央 540×500 动画区并按 30fps 测量，包围盒仍可能受字体抗锯齿影响约 1–2px。
- 源片节奏被用户后续口述明确覆盖：删除开场换词与满屏停留，以连续运动为准。
- 源片末行最终停在全图标态；本次按用户明确要求改为水流同款双向扫变，并只增加每字位独立的二维原位旋转角，明确排除位移、漂移、3D 翻转和往返震动。

## Acceptance evidence

- [x] Normal-speed and dense-frame comparison
- [x] Key paused frames
- [x] Desktop stage centering
- [x] Inspector interaction and scrolling
- [x] Canvas-size card is the first inspector card; 16:9, 9:16, 1:1, 4:5, and custom 700×500 refit to exact ratios while the 420px inspector remains fixed
- [x] Per-slot 2D rotation remains independent (25° versus 0° tested) and survives auto-save/reload
- [x] Per-row gap / icon size / horizontal position remain independent (row 1: 21px / 137% / −46px; row 2 stayed 0px / 92% / 0px) and survive auto-save/reload
- [x] The row editor opens as a two-part overlay: parameters occupy the original 420px inspector and a fixed full-wall preview sits immediately to its right without shifting the live stage
- [x] Global icon size and horizontal position apply to every row, remain the defaults for newly added rows, and still allow independent row overrides
- [x] Each wall row edits left text, one anchored icon, and right text directly; changing the row selector replaces that icon instead of inserting another token
- [x] Main row icons share a centered column while each row keeps independent size, column offset, left gap, and right gap
- [x] Overview renders exactly the input row count (11 rows and 3 rows tested), stays visible while row controls scroll, and updates from both global and row-owned controls
- [x] Fully revealed first and last wall rows use the same solid text color as every middle row; no distance-based edge fade remains
- [x] Single-asset scale / offset / gap edits do not stack onto the full-wall row geometry
- [x] Opening enters the overlap phase before the 0.30s center launch completes
- [x] Opening rhythm control is visible beside the opening word and updates the launch duration (0.30s and 0.62s tested)
- [x] Opening icons have an explicit insertion target, visible used-icon list, opening-only size/gap controls, and single-asset size/X/Y/before/after editing
- [x] Final icon shows an upright frame, turns to the configured angle, returns upright, then restores the letter
- [x] Console clean
- [x] PNG generated
- [x] Full-cycle GIF generated (320×320, 25 frames)
- [x] H.264 full-cycle MP4 generated (320×320, 15fps, 25 frames)
