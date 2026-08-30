# Effect analysis: 纵跃 / Vertical Rise

## Source material

- Normal-speed file: local desktop `飞书20260830-113624.qt` (not committed)
- Duration / fps / dimensions: 3.90s / 30fps / 540×1166 / 117 frames
- Relevant crop: central white animation area; phone and social-app chrome excluded from motion interpretation
- Analysis date: 2026-08-30

## One-sentence target

`leveling up` 从画布正中心以约 75% 尺寸纵深跳到 100%，并连续带动多行弹满；收束后以水流同款扫变完成末行字母与原位二维旋转图标的切换，最后快速消失。

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.30s | 源片 009–018，内容按用户修订 | 中心跳出 | 源片 `leveling up` 黑色像素包围盒从约 365×72 增长到 484×95，即约 75%→100%；中心位置稳定且无淡入 | 把源片这段尺度轨迹移到循环首帧，直接显示 `leveling up`；使用近线性纵深放大，不从极小尺寸起跳、不回摆 | high |
| 0.30–0.66s | 源片 019 起 | 连续弹满 | 单行达到全尺寸后，下一批密集帧立即出现上下相邻行 | 中心行继续匹配字墙尺寸，逐行弹出紧接开场 | high |
| 0.66–0.96s | 用户修订 | 立即收束 | 满屏完成的下一刻直接进入外围行退场 | 不设置满屏静止段，收尾单行在退场后半段接管中心 | high |
| 0.96–1.48s | 用户修订 | 末行扫变 | 指定字母依次替换为图标，再依次恢复 | 完整沿用水流的“字母→图标→字母”扫变；每个图标保持原槽位中心，只应用独立二维平面旋转角度 | high |
| 1.48–1.62s | 用户修订 | 恢复后停留 | 完整 `leveling up` 短暂停留 | 停留时长可编辑 | high |
| 1.62–1.74s | 用户修订 | 快速消失 | 末行快速缩小并淡出 | 独立可编辑退场时长，结束后循环回到首帧 | high |

## Element model

- Text unit: 开场词、逐行字墙、收尾字母槽位
- Persistent elements: 背景与中心对齐轴
- Replaced elements: 收尾指定字母槽位与对应图标互斥显示
- Image/icon behavior: 每行拥有独立字图间距；收尾每个槽位拥有独立前后间距、大小、静态位置和 −360°～360° 二维平面旋转角
- Layer order: 背景 → 字墙/末行 → 舞台播放控件（仅编辑器）

## Spatial rules

- Composition center: 实际画板中心，不使用浏览器窗口中心
- Alignment: 单行水平居中；字墙从中心行向上下展开
- Scale behavior: 开场从画布中心约 75% 尺寸近线性放大到 100%，随后继续匹配字墙尺寸；收尾图标动态撑开相邻文字但中心位置不漂移
- Responsive behavior: 1:1、4:5、9:16、16:9 和自定义尺寸共用归一化几何
- Entry/exit boundaries: 外围行允许超出画板裁切；编辑器标记不进入导出

## Timing and easing

- Total loop: 由中心跳出、连续弹满、立即收束、收尾扫变、恢复停留、快速消失六段共同决定
- Overlaps: 字墙退场后半段提前显露收尾文字
- Holds with residual motion: 满屏没有停留；图标在水流扫变窗口内保持设定平面角度，到恢复节点立即换回字母
- Hard cuts: 无开场换词硬切，首行与收尾默认统一为 `leveling up`
- Easing: 开场按源片密集帧使用近线性尺度增长；收尾沿用水流扫变 easing，末帧快速缩小淡出

## Reuse plan

- Existing animation/math: 保留纵跃字墙展开与回收
- Shared UI: `currentwall.css`, `me-motion-editor.css`, `me-motion-editor.js`
- Shared media: `shared-icon-library.js`, `token-asset-tools.js`
- Shared export: `continuation-gif.js`, `h264-mp4-encoder.web.js`
- New core logic: 每行独立字图间距状态；水流同款末行槽位扫变

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
- [x] Console clean
- [x] PNG generated
- [x] Full-cycle GIF generated (320×320, 27 frames)
- [x] H.264 full-cycle MP4 generated (320×320, 15fps, 27 frames)
