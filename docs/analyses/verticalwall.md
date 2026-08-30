# Effect analysis: 纵跃 / Vertical Rise

## Source material

- Normal-speed file: local desktop `飞书20260830-113624.qt` (not committed)
- Duration / fps / dimensions: 3.90s / 30fps / 540×1166 / 117 frames
- Relevant crop: central white animation area; phone and social-app chrome excluded from motion interpretation
- Analysis date: 2026-08-30

## One-sentence target

`leveling up` 从画布正中心纵深跳出并连续带动多行弹满，不插入静止停留；收束后以水流同款扫变完成末行字母与单次定向甩动图标的切换，最后快速消失。

## Phase table

| Time | Source frames | Phase | Visible evidence | Motion interpretation | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0.00–0.26s | 用户修订 | 中心跳出 | 首个可见内容直接是 `leveling up` | 由小到大快速 back/pop，不再显示 `motivation` 或 `togetherness` | high |
| 0.26–0.62s | 用户修订 | 连续弹满 | 中心行保持回弹运动，同时上下各行迅速铺开 | 中心行不冻结；逐行弹出与中心余势连续衔接 | high |
| 0.62–0.92s | 用户修订 | 立即收束 | 满屏完成的下一刻直接进入外围行退场 | 不设置满屏静止段，收尾单行在退场后半段接管中心 | high |
| 0.92–1.44s | 用户修订 | 末行扫变 | 指定字母依次替换为图标，再依次恢复 | 沿用水流的“字母→图标→字母”扫变；每个图标按独立 0–360° 方向、距离和自身旋转角单次甩出，不往返震动 | high |
| 1.44–1.58s | 用户修订 | 恢复后停留 | 完整 `leveling up` 短暂停留 | 停留时长可编辑 | high |
| 1.58–1.70s | 用户修订 | 快速消失 | 末行快速缩小并淡出 | 独立可编辑退场时长，结束后循环回到首帧 | high |

## Element model

- Text unit: 开场词、逐行字墙、收尾字母槽位
- Persistent elements: 背景与中心对齐轴
- Replaced elements: 收尾指定字母槽位与对应图标互斥显示
- Image/icon behavior: 每行拥有独立字图间距；收尾每个槽位拥有独立前后间距、大小、位置、甩动方向、甩动距离和自身旋转角
- Layer order: 背景 → 字墙/末行 → 舞台播放控件（仅编辑器）

## Spatial rules

- Composition center: 实际画板中心，不使用浏览器窗口中心
- Alignment: 单行水平居中；字墙从中心行向上下展开
- Scale behavior: 开场从画布中心由小到大快速纵深跳出并在铺满阶段继续回弹；收尾图标动态撑开相邻文字并单次定向甩出
- Responsive behavior: 1:1、4:5、9:16、16:9 和自定义尺寸共用归一化几何
- Entry/exit boundaries: 外围行允许超出画板裁切；编辑器标记不进入导出

## Timing and easing

- Total loop: 由中心跳出、连续弹满、立即收束、收尾扫变、恢复停留、快速消失六段共同决定
- Overlaps: 字墙退场后半段提前显露收尾文字
- Holds with residual motion: 满屏没有停留；图标在水流扫变窗口内完成一次甩动，到恢复节点立即换回字母
- Hard cuts: 无开场换词硬切，首行与收尾默认统一为 `leveling up`
- Easing: 开场使用 back/pop 并把余势带入铺满；收尾沿用水流扫变 easing，末帧快速缩小淡出

## Reuse plan

- Existing animation/math: 保留纵跃字墙展开与回收
- Shared UI: `currentwall.css`, `me-motion-editor.css`, `me-motion-editor.js`
- Shared media: `shared-icon-library.js`, `token-asset-tools.js`
- Shared export: `continuation-gif.js`, `h264-mp4-encoder.web.js`
- New core logic: 每行独立字图间距状态；水流同款末行槽位扫变

## Uncertainties

- 源视频带有录屏 UI，首段尺度变化幅度只能从中央动画区域估算。
- 源片节奏被用户后续口述明确覆盖：删除开场换词与满屏停留，以连续运动为准。
- 源片末行最终停在全图标态；本次按用户明确要求改为水流同款双向扫变，并增加每字位独立的 360° 定向甩动，明确排除往返震动。

## Acceptance evidence

- [x] Normal-speed and dense-frame comparison
- [x] Key paused frames
- [x] Desktop stage centering
- [x] Inspector interaction and scrolling
- [x] Canvas-size card is the first inspector card; 16:9, 9:16, 1:1, 4:5, and custom 700×500 refit to exact ratios while the 420px inspector remains fixed
- [x] Per-slot throw direction/distance/rotation remain independent and survive auto-save/reload
- [x] Console clean
- [x] PNG generated
- [x] Full-cycle GIF generated (320×320, 26 frames)
- [x] H.264 full-cycle MP4 generated (320×320, 15fps, 26 frames)
