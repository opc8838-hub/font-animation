# Effect analysis: Focus Wheel / 焦轮

## Source material

- Normal-speed file: `最新88888888888888飞书20260814-224354.qt`（仅保存在用户桌面，不提交）
- Slow-motion file: 无
- Duration / fps / dimensions: 2.926 秒 / 30fps / 540×1166 / 87 帧 / H.264
- Relevant crop: 原视频约 y=120–770 的白色文字滚轮区域；社交平台状态栏、作者信息、互动按钮和播放控件不属于动效
- Analysis date: 2026-08-14

## One-sentence target

多行词项沿同一中心轴持续纵向循环，进入中心焦点带时同步放大、变黑并变清晰，离开后对称缩小、变灰并淡出。

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.50s | 000–014 | 连续上移 A | `Stem Separation / and more / MIDI / Effects / Synths` 依次穿过中心区域；相邻帧没有停顿 | 所有词共享一个线性纵向相位，中心样式由距离连续计算 | high |
| 0.50–1.00s | 015–029 | 连续上移 B | `Effects / Synths / Chat bar` 逐渐变黑、变大，旧词向上变浅 | 焦点权重近似对称钟形曲线，不是单行硬切换 | high |
| 1.00–1.50s | 030–044 | 连续上移 C | `Chat bar / Automation / Stem Separation` 穿过中心；长词仍围绕同一水平中心 | 每行独立测量宽度并共享中心锚点 | high |
| 1.50–2.00s | 045–059 | 连续上移 D | `Automation / Stem Separation / and more` 位于最深色区域，上下边缘词接近白色 | 透明度、颜色、模糊和缩放由离中心距离共同驱动 | high |
| 2.00–2.50s | 060–074 | 连续上移 E | `Stem Separation / and more / MIDI` 接替中心，速度保持连续 | 相位跨词项边界时保持速度，不重新启动 easing | high |
| 2.50–2.90s | 075–086 | 循环闭合 | 画面重新接近开头的词序与位置 | 7 个词项约 2.9 秒完成一轮，默认约 0.41 秒/项 | high |

## Element model

- Text unit: 一行一个词项；参考共 7 项
- Persistent elements: 所有词项都持续存在并按周期重复
- Replaced/removed elements: 无硬删除；仅在上下边缘淡到不可见
- Image/icon behavior: 参考没有图片或图标，不引入第二套媒体模型
- Layer order: 远离中心的浅色词先绘制，中心深色词后绘制，避免模糊边缘压住焦点文字

## Spatial rules

- Composition center: 真实右侧舞台的水平中心与可编辑垂直焦点位置
- Alignment: 默认每行独立居中；提供统一左/中/右锚点
- Scale behavior: 中心最大，向上下两侧连续衰减；横向可增加轻微透视压缩
- Responsive/aspect-ratio behavior: 基础字号、行距和模糊按输出高度缩放，锚点使用输出宽高百分比
- Entry/exit boundaries: 上下边缘通过透明度与模糊渐隐，不产生硬裁切

## Timing and easing

- Total loop: 默认 7 × 0.42 = 2.94 秒
- Phase durations: 没有离散阶段；以“每项时间”控制恒速相位
- Overlaps: 多个相邻词同时处于焦点带，样式连续叠加
- Holds with residual motion: 无停留；可选逐项吸附模式作为编辑扩展
- Hard cuts: 无
- Easing hypothesis: 位置线性；焦点缩放/颜色/透明度使用平滑钟形或 smoothstep 距离曲线

## Reuse plan

- Existing animation/math to reuse: Creator Merge / Phrase Build 的 deterministic canvas 时间线与帧步进
- Shared UI files: `continuation.css`, `currentwall.css`, `me-motion-editor.css`, `me-motion-editor.js`
- Shared media/image files: 不需要媒体层
- Shared export files: `js/continuation-gif.js`, `CCapture.all.min.js`，以及现代 Canvas PNG/GIF/视频导出结构
- New core logic required: 周期纵向排布、焦点距离场、变权重字体、边缘模糊与淡出

## User-editable parameters

### Common

- 每行一个词项、参考文案/中文示例
- 滚动方向、滑动速度、每项基础时间、连续/逐项吸附
- 字体、基础/焦点字重、字号、字距、行距
- 焦点位置、水平位置、左/中/右对齐
- 焦点范围、中心放大、边缘透明度、颜色与背景
- 导出尺寸、时长、帧率、PNG/GIF/视频

### Advanced

- 焦点曲线、透视压缩、最大模糊、起始相位、吸附停留比例

## Uncertainties to verify

- 原视频包含社交平台压缩和屏幕录制，极浅边缘文字的真实模糊半径无法精确还原。
- 中心区域看似覆盖约 2–3 行；默认采用宽焦点带，后续可按用户反馈收窄。
- 源片从循环中段开始，0 帧不是设计上的显式开场。

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

Verification artifacts used a 320 × 320 test export. PNG was confirmed as 320 × 320; the deterministic WebM was confirmed as VP8, 15fps, 1.000s; the GIF validation artifact was confirmed as 15 frames, 1.000s. The in-app browser's own Statsig telemetry timeout is external to the page and did not produce an application console error.

## Feedback discoveries

- 2026-08-14：参考是无停顿的完整循环，位置必须保持线性连续；所有“感觉”来自中心距离场，不应把每一行拆成独立入场动画。
- 2026-08-14：参考“汇聚”的中心附近虚拟行绘制方式，焦轮不再遍历多组屏外重复行；逐字宽度按字体状态缓存，并把字重分档缓存友好化，以减少逐帧测量和字体栅格化造成的卡顿。
- 2026-08-15：性能回归定位为逐行 Canvas `blur()` 在每帧触发软件滤镜。实时播放改用距离场透明度，不启用模糊；暂停帧与导出仍保留完整模糊。暂停状态只在参数或时间变化时重绘，高分屏预览倍率上限降为 1.25，导出分辨率不受影响。
