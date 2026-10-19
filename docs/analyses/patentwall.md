# Effect analysis: 专利墙

## Source material
- Local archive: `E:/360MoveData/Users/Administrator/Desktop/第一段` (source files remain unchanged).
- Normal-speed: 第一段.mp4. H.264, 60 fps, 1920×1080, 949 frames, 15.8167s, no audio.
- Analysis date: 2026-10-13. FFprobe metadata and FFmpeg chronological contact sheet inspected before code.

## One-sentence target
Preserve the supplied choreography and timing while replacing the archived certificate artwork with unique editable work images from D:/mutedmen.

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
- 原证书含逐字分割元数据；替换作品图不使用这些遮罩，采用整图展示与可编辑附加文字。特写阶段保留源视频的约 1.008s 扫字节奏作为停留时长。
- 图片自带文字属于像素内容；字体选择作用于新增文字，不能改写图片里的字。
- 原画面直接绘制与编辑器原生离屏画布合成存在少量纹理采样差异；保留几何、遮挡和节奏，不承诺像素完全一致。

## Acceptance evidence
2026-10-13 本地检查通过：1440×1000 桌面左栏 420px、舞台居中；390×844 手机舞台在上且无横向溢出；原生比例及 16:9 / 9:16 / 1:1 输出；逐阶段暂停与正常速度播放；中文输入及 PNG 导出；素材选择/插入/逐项编辑/替换；方案保存、导入、清空、重置、自动恢复；共享矢量/GIF 与视频背景六帧条；实时 AI 组件预览。

实际生成原生 PNG、320×320 / 15fps GIF 与 H.264 MP4、完整循环 30fps 动态卡片预览。GIF 的 1s 输出经源延时解析验证为 1000ms。浏览器没有 pageerror / console error。详见 `docs/ARCHIVE_MOTION_EDITORS.md`，可重复执行 `scripts/test-archive-motion.cjs`。本次只在独立分支保存，未推送、未部署。

## 2026-10-19 作品图替换与回归

- 素材来源：D:/mutedmen。由 88 个作品文件夹选取 196 个不同源文件；用视觉哈希剔除近重复，单独生成 1 张开场封面和 195 张墙面作品。封面、23 格卡片带、4 张特写与 195 个墙面格的默认图片互不重复。
- 默认背景仍为白色；背景颜色、图片/GIF/视频均可编辑。作品本身的像素文字无法独立改写，卡片附加文字可编辑。
- 原参考的翻转、展开、滑动、推近、四段特写、拉远和墙面入场/缓慢滚动时间保持不变。原逐字遮罩与旧证书资源移除；特写展示整张作品图。
- 不确定项：源作品具有系列关联，局部主题和人物风格相近；逐张文件及墙面映射均唯一，未重复使用同一源图。
- 回归：四处关键帧目视检查；196 个默认资源 ID 唯一；桌面、手机、中文 PNG、1s GIF、For AI 预览通过，浏览器无错误。画廊 640×360 MP4 元数据为 15.833s。
