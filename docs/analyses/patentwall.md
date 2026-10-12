# Effect analysis: 专利墙

## Source material
- Local archive: `E:/360MoveData/Users/Administrator/Desktop/第一段` (source files remain unchanged).
- Normal-speed: 第一段.mp4. H.264, 60 fps, 1920×1080, 949 frames, 15.8167s, no audio.
- Analysis date: 2026-10-13. FFprobe metadata and FFmpeg chronological contact sheet inspected before code.

## One-sentence target
Preserve the supplied deterministic choreography and artwork inside the standard editable CellMotion workspace.

## Phase table
| Time | Source frames | Phase | Visible evidence / motion contract | Confidence |
| --- | --- | --- | --- | --- |
| 0–2.6s | 0–156 | Logo 翻转 | Logo 保持至约 0.8s；再停 0.1s，1.5s 绕 Y 轴旋转 180° 并从 0.65 放大到略超 1，0.2s 落定。转过 100° 即开始展开两侧证书。 | high |
| 2.6–6.141s | 156–368 | 展开·右滑·特写 1 | 两侧卡片从主卡背后对称展开；向右经过两张后推近第一张证书，推近尚未结束时就开始按行逐字显露，保留相邻证书的边缘。 | high |
| 6.141–8.099s | 368–486 | 特写 2 | 镜头维持特写倍率，用约 0.85s 平移到第二张；0.6s 时启动该张逐字显露，字符出完后停留 0.35s。 | high |
| 8.099–10.056s | 486–603 | 特写 3 | 同样平移到第三张；保持标题和字段区域的纵向取景，不把镜头重新缩回全卡。 | high |
| 10.056–12.015s | 603–721 | 特写 4 | 平移到第四张，保持字逐行显露和停留节奏；这张延续为专利墙中心。 | high |
| 12.015–15.815s | 721–949 | 拉远·专利墙 | 前 2s 从特写拉远成墙；周围证书约 0.55s 后按距离依次自上/下滑入，最后约 1.8s 邻列反向缓慢滚动并继续轻微拉远。 | high |

## Spatial rules
Native composition 1920×1080; all output ratios use one centered contain transform, plus editable size and position. Background fills output dimensions.

## Timing and easing
Use archived source curves without replacing them. Phase durations remap source time monotonically; speed applies to every phase. Native code owns overlap.

## Reuse plan
Extend shared cardmotion-editor, font/icon catalogs, animated-image decoder, H.264/GIF encoders and AI bridge. Native renderer has no private player or uploader.

## Uncertainties to verify
- 未提供单独慢放视频；跨帧顺序由原始渲染源码、正常速度视频和连接处密集抽帧交叉核对。
- 原证书含逐字分割元数据；新上传图片没有这些分割信息，使用整图展示和可编辑附加文字，避免错误套用原证书遮罩。
- 图片自带文字属于像素内容；字体选择作用于新增文字，不能改写图片里的字。
- 原画面直接绘制与编辑器原生离屏画布合成存在少量纹理采样差异；保留几何、遮挡和节奏，不承诺像素完全一致。

## Acceptance evidence
2026-10-13 本地检查通过：1440×1000 桌面左栏 420px、舞台居中；390×844 手机舞台在上且无横向溢出；原生比例及 16:9 / 9:16 / 1:1 输出；逐阶段暂停与正常速度播放；中文输入及 PNG 导出；素材选择/插入/逐项编辑/替换；方案保存、导入、清空、重置、自动恢复；共享矢量/GIF 与视频背景六帧条；实时 AI 组件预览。

实际生成原生 PNG、320×320 / 15fps GIF 与 H.264 MP4、完整循环 30fps 动态卡片预览。GIF 的 1s 输出经源延时解析验证为 1000ms。浏览器没有 pageerror / console error。详见 `docs/ARCHIVE_MOTION_EDITORS.md`，可重复执行 `scripts/test-archive-motion.cjs`。本次只在独立分支保存，未推送、未部署。
