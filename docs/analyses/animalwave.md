# Effect analysis: 动物浪潮

## Source material
- Local archive: `E:/360MoveData/Users/Administrator/Desktop/动物/存档_动物头像动效` (source files remain unchanged).
- Normal-speed: 动物头像动效_v3.mp4. H.264, 60 fps, 1920×1080, 660 frames, 11s, no audio.
- Analysis date: 2026-10-13. FFprobe metadata and FFmpeg chronological contact sheet inspected before code.

## One-sentence target
Preserve the supplied deterministic choreography and artwork inside the standard editable CellMotion workspace.

## Phase table
| Time | Source frames | Phase | Visible evidence / motion contract | Confidence |
| --- | --- | --- | --- | --- |
| 0–1s | 0–60 | 单只亮相 | 首个狮子头像与名称、爪印徽标、is here 同行出现，约 0.45s 完成入场；头像有白边和软阴影。 | high |
| 1–5.85s | 60–351 | 头像递增 | 1s 起字幕用约 0.32s 从同行落到头像下方；前 18 只每隔 0.26s 挤入，用约 0.24s 的弹性过渡，数量文字随出场递增。 | high |
| 5.85–7.5s | 351–450 | 加速成浪 | 5.85s 起数量加速增长，到 7.5s 达到 59 只；6s 起由一排连续过渡为波浪，速度先上冲再落回巡航，波浪与数量变化重叠。 | high |
| 7.5–8.5s | 450–510 | 波浪巡航 | 头像沿正弦波继续流动，保留深度带来的大小、层级变化；字幕在波浪下方放大居中。 | high |
| 8.5–11s | 510–660 | 品牌收尾 | 8.5s 起原字幕在约 0.35s 内上移淡出；8.8s 起品牌图标和 hely.Animals 上升进入，约 9.5s 落定，头像浪继续到结束。 | high |

## Spatial rules
Native composition 1920×1080; all output ratios use one centered contain transform, plus editable size and position. Background fills output dimensions.

## Timing and easing
Use archived source curves without replacing them. Phase durations remap source time monotonically; speed applies to every phase. Native code owns overlap.

## Reuse plan
Extend shared cardmotion-editor, font/icon catalogs, animated-image decoder, H.264/GIF encoders and AI bridge. Native renderer has no private player or uploader.

## Uncertainties to verify
- 未提供单独慢放视频；到达顺序和波浪深度由原始源码和正常速度视频交叉确认。
- 默认保留 59 个头像及原有顺序；替换、增删后沿同样的递增和波浪规则重新计算，数量不再固定。
- 名称和品牌文字可编辑；图片内部的像素内容不受字体选择影响。

## Acceptance evidence
2026-10-13 本地检查通过：1440×1000 桌面左栏 420px、舞台居中；390×844 手机舞台在上且无横向溢出；原生比例及 16:9 / 9:16 / 1:1 输出；逐阶段暂停与正常速度播放；中文输入及 PNG 导出；素材选择/插入/逐项编辑/替换；方案保存、导入、清空、重置、自动恢复；共享矢量/GIF 与视频背景六帧条；实时 AI 组件预览。

实际生成原生 PNG、320×320 / 15fps GIF 与 H.264 MP4、完整循环 30fps 动态卡片预览。GIF 的 1s 输出经源延时解析验证为 1000ms。浏览器没有 pageerror / console error。详见 `docs/ARCHIVE_MOTION_EDITORS.md`，可重复执行 `scripts/test-archive-motion.cjs`。本次只在独立分支保存，未推送、未部署。

## 2026-10-19 竖屏取景修订

- 冻结原头像出场顺序、波浪路径、字幕阶段和品牌收尾；16:9 几何不变。
- 9:16 从原先的完整容纳改为温和的 1.4 倍主体取景，标题与头像同比放大；开场文字和波浪字幕仍保留在画幅内。1080×1920 输出的开场非白区域宽约 864px。
- 预览离屏画布按显示像素下采样，导出仍使用完整 1920×1080 内部画布。两者共用相同时间与几何逻辑。
