# Effect analysis: 纵跃 / Vertical Rise

## Source material

- Normal-speed file: local desktop `飞书20260830-113624.qt` (not committed)
- Duration / fps / dimensions: 3.90s / 30fps / 540×1166 / 117 frames
- Relevant crop: central white animation area; phone and social-app chrome excluded from motion interpretation
- Analysis date: 2026-08-30

## One-sentence target

开场词从画面内轻微弹出，切到第二行并由中心向上下铺满，退场后以水流同款扫变完成末行字母与图标切换。

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.27s | 000–008 | 开场 | `motivation` 居中，首帧到稳定态有轻微尺度变化 | 小幅纵深缩放弹入，随后短停 | high |
| 0.27–0.47s | 008–014 | 第二行 | 开场词切为 `leveling up`，仍保持中心单行 | 快速交叉切换并以小弹性落定 | high |
| 0.47–0.80s | 014–024 | 满屏弹开 | 中心上下出现相邻行，迅速扩展到多行 | 保留现有由中心向外逐行弹出的编排 | high |
| 0.80–1.23s | 024–037 | 满屏停留 | 多行覆盖画面并保持轻微层次差 | 短停，边缘行保持较低透明度 | high |
| 1.23–1.83s | 037–055 | 逐行退场 | 外围行先消失，中心收束为 `togetherness` | 从外向内逐行回收，末行接管中心 | high |
| 1.83–3.90s | 055–116 | 末行换字 | 源片末行逐步出现多个图标 | 按用户要求改用水流的“字母→图标→字母”双向扫变与动态让位 | high |

## Element model

- Text unit: 开场词、逐行字墙、收尾字母槽位
- Persistent elements: 背景与中心对齐轴
- Replaced elements: 收尾指定字母槽位与对应图标互斥显示
- Image/icon behavior: 每行拥有独立字图间距；收尾每个槽位拥有独立前后间距、大小和位置
- Layer order: 背景 → 字墙/末行 → 舞台播放控件（仅编辑器）

## Spatial rules

- Composition center: 实际画板中心，不使用浏览器窗口中心
- Alignment: 单行水平居中；字墙从中心行向上下展开
- Scale behavior: 开场轻弹，字墙保持现有弹开尺度；收尾图标动态撑开相邻文字
- Responsive behavior: 1:1、4:5、9:16、16:9 和自定义尺寸共用归一化几何
- Entry/exit boundaries: 外围行允许超出画板裁切；编辑器标记不进入导出

## Timing and easing

- Total loop: 由六段可编辑时长和收尾扫变映射数量共同决定
- Overlaps: 字墙退场后半段提前显露收尾文字
- Holds with residual motion: 满屏短停保留纵向漂移
- Hard cuts: 开场词到第二行是快速交叉切换
- Easing: 开场与第二行使用轻微 back/pop；字墙保持既有逐行弹性；收尾沿用水流扫变 easing

## Reuse plan

- Existing animation/math: 保留纵跃字墙展开与回收
- Shared UI: `currentwall.css`, `me-motion-editor.css`, `me-motion-editor.js`
- Shared media: `shared-icon-library.js`, `token-asset-tools.js`
- Shared export: `continuation-gif.js`, `h264-mp4-encoder.web.js`
- New core logic: 每行独立字图间距状态；水流同款末行槽位扫变

## Uncertainties

- 源视频带有录屏 UI，首段尺度变化幅度只能从中央动画区域估算。
- 源片末行最终停在全图标态；本次按用户明确要求改为水流同款双向扫变。

## Acceptance evidence

- [x] Normal-speed and dense-frame comparison
- [x] Key paused frames
- [x] Desktop stage centering
- [x] Inspector interaction and scrolling
- [x] Square and portrait sizes
- [x] Console clean
- [x] PNG generated
- [x] GIF generated (320×320, 8 frames)
- [x] H.264 MP4 generated (320×320, 15fps, 8 frames)
