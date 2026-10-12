# Effect analysis: Bot 语音

## Source material
- Local archive: `E:/360MoveData/Users/Administrator/Desktop/单独一段动画/存档` (source files remain unchanged).
- Normal-speed: 第四段.mp4. H.264, 60 fps, 1080×1920, 708 frames, 11.8s, no audio.
- Analysis date: 2026-10-13. FFprobe metadata and FFmpeg chronological contact sheet inspected before code.

## One-sentence target
Preserve the supplied deterministic choreography and artwork inside the standard editable CellMotion workspace.

## Phase table
| Time | Source frames | Phase | Visible evidence / motion contract | Confidence |
| --- | --- | --- | --- | --- |
| 0–1.12s | 0–67 | 手机特写·按键 | 白底竖屏手机局部特写；手指触碰边框按键，按键处发光，手机轮廓和手同步响应。 | high |
| 1.12–2.35s | 67–141 | Bot 挤进屏幕 | 1.12s 蓝点点亮，Bot 从侧边挤入屏幕；玻璃泡泡在 1.47s 消退，Bot 不跳切到新位置。 | high |
| 2.35–3.4s | 141–204 | 12:00 · 猫 · 拉远 | 2.35s 开始同时显示时间和猫、镜头拉远，3.4s 完成主体拉远，继续保留轻微呼吸式退镜。 | high |
| 3.4–4.4s | 204–264 | Bot 边飞边变方块 | Bot 沿连续曲线飞向左上再回到中央，在飞行过程中变为方块；手机在 3.55–4.25s 淡出，两者有重叠。 | high |
| 4.4–7.6s | 264–456 | 方块流动 | 蓝色方块沿原路径连续流动；宽高、弧线和透明度随相位变化，最终收成蓝色圆点。 | high |
| 7.6–11.8s | 456–708 | 语音 | 7.6s 起圆点在约 0.6s 内展开语音胶囊，波形持续跳动约 3.6s，结尾不缩回。 | high |

## Spatial rules
Native composition 1080×1920; all output ratios use one centered contain transform, plus editable size and position. Background fills output dimensions.

## Timing and easing
Use archived source curves without replacing them. Phase durations remap source time monotonically; speed applies to every phase. Native code owns overlap.

## Reuse plan
Extend shared cardmotion-editor, font/icon catalogs, animated-image decoder, H.264/GIF encoders and AI bridge. Native renderer has no private player or uploader.

## Uncertainties to verify
- 未提供单独慢放视频；飞行连续路径和阶段交叠以原始源码、正常速度视频、密集抽帧共同确认。
- 猫为原图素材，可替换；手机边框、手和波形为可重绘图形。
- 方块和语音使用同一强调色控制；原稿中极少数局部色值略有差别，编辑器默认做了统一。

## Acceptance evidence
2026-10-13 本地检查通过：1440×1000 桌面左栏 420px、舞台居中；390×844 手机舞台在上且无横向溢出；原生比例及 16:9 / 9:16 / 1:1 输出；逐阶段暂停与正常速度播放；中文输入及 PNG 导出；素材选择/插入/逐项编辑/替换；方案保存、导入、清空、重置、自动恢复；共享矢量/GIF 与视频背景六帧条；实时 AI 组件预览。

实际生成原生 PNG、320×320 / 15fps GIF 与 H.264 MP4、完整循环 30fps 动态卡片预览。GIF 的 1s 输出经源延时解析验证为 1000ms。浏览器没有 pageerror / console error。详见 `docs/ARCHIVE_MOTION_EDITORS.md`，可重复执行 `scripts/test-archive-motion.cjs`。本次只在独立分支保存，未推送、未部署。
