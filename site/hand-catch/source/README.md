# 接住 Hand Catch · 发布版源码

B2W 于 2026-11-20 制作。构图与节奏参考 Jose Sáez Merino 用 Matte app 制作的演示。[原帖](https://x.com/josesaezmerino/status/2117964564285317500)

## 准备

- Python 3.9+，安装 `numpy`、带 FFmpeg 支持的 OpenCV 4.8+ 和 `Pillow`。
- 安装带 `libx264` 的 FFmpeg，将它加入 PATH，或把环境变量 `FFMPEG` 指向可执行文件。
- 准备你可使用的参考视频、关键帧编辑工具和 MiniMax API 账号。运行补帧前在当前环境里设置 `MINIMAX_API_KEY`。
- 从解压后的目录运行以下命令。

```sh
python -m pip install numpy "opencv-python>=4.8" Pillow
```

## 1. 编辑关键帧

按参考视频标出手机入画、张手、接触、转正、停顿、视角绕转和硬切。先用自己的 3D 渲染编辑一张手部定妆图，再给每个关键时刻准备两张输入图。第一张是该时刻的编辑对象，第二张是同一只手的身份参考。只重画手，保留构图、手机姿态和运动模糊。

用 [定妆提示词](img/prompt_grip.md) 和 [关键帧提示词](img/prompt_key.md) 起步。按 [批处理脚本](tools/video/batch_fl2v.py) 的 `SRC` 映射把生成的关键帧保存到 `img/out/`，或根据你的视频更新 `SRC` 和 `SEGS`。

## 2. 生成首尾帧片段

```sh
python tools/video/batch_fl2v.py
```

脚本将关键帧转成 `video/keys/` 内的 JPG，按四种提示词生成下落、接住、镜头绕转与停住的片段。默认配置为 MiniMax-H3-Max、5 秒、768P，每段提交一次海螺生成并计费。以服务商实际价格为准。已生成的输出会跳过。

批处理为本片准备 18 段，包含 `video/seg_fall.mp4`、`video/seg_open_to_grip.mp4` 和 `video/segs/` 下的其余片段。也可以用 `python tools/video/fl2v.py --help` 查看单段调用方法。

## 3. 测速、剪辑和检查

```sh
python tools/video/ref_motion.py path/to/reference.mp4 --crop 160 130 1630 1630 --preset-mask
python tools/video/assemble3.py --out video/hand-catch.mp4
python tools/video/check_smooth.py video/hand-catch.mp4
```

裁切参数和 `--preset-mask` 对应本片参考录屏里的方形画面及右下角工具栏。使用自己的参考视频时，按实际画面传入裁切坐标。画面已裁齐时可省略 `--crop`，无工具栏时可省略 `--preset-mask`。

`ref_motion.py` 写出 `video/motion/ref.json`。`assemble3.py` 调用 `motion.py` 测各片段实际运动进度，依参考曲线重排时间，并在连续镜头的接口做光流变形。想套用到其他镜头，更新 `assemble3.py` 里的片段路径、时间线、硬切和异常片段的剪接点。重新生成本片片段时，也需按实际结果复核「接住又松手」那一段的 2.75 秒和 2.17 秒裁点。可用 `--until 5` 先输出一段检查。

`check_smooth.py` 逐帧列出运动量突变候选。逐个回看候选及镜头交界，确认刻意保留的硬切和连贯的跨段速度。剪辑、测速及质检在本地执行。
