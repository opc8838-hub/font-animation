# Z1 Scrawl 学习与现有字体差距

核对日期：2026-11-07。依据 [仓库](https://github.com/bravohenry/z1-scrawl)、[build.py](https://github.com/bravohenry/z1-scrawl/blob/main/sources/build.py)、[glyphs.py](https://github.com/bravohenry/z1-scrawl/blob/main/sources/glyphs.py)、[pen.py](https://github.com/bravohenry/z1-scrawl/blob/main/sources/pen.py) 与[演示页](https://z1han.com/font)的 HTML。未在本地执行其构建脚本，未独立验证其“字节级可复现”声明。

## 实际做法

- 字重为 Light 300、Regular 400、Bold 700，各有 OTF/WOFF2。笔半径分别为 26/38/54；宽度补偿分别为 0.96/1.0/1.14。它不是对同一轮廓套 CSS bold。
- 字形中心线、笔画顺序、单字姿态、内白与侧距数据放在 glyphs.py；pen.py 负责笔触扫掠，build.py 负责字重、异体、命名与字体打包。
- UPM 1000；最终中心线网格的 cap/xheight/ascender 为 690/365/730。字体 OS/2 中的墨高会再计入笔半径与上提，不能把中心线数值直接当成最终墨高。
- 每字三个异体，使用 `calt`、`ss01`、`ss02`；演示用异体切帧形成约 12 fps 的线条跳动，并照顾减少动态偏好。这与整段文字淡入淡出是不同能力。
- 演示页包含真实字重切换、24–240 的字号滑块、异体和动态开关、字重样张、字符表、特性说明、制作过程、规格与下载。
- build.py 有同源 manifest 输出，包含身份、字重文件、字符与特性；用固定随机种子和时间戳支持复现。检查到侧距与宽度处理，不据此宣称已经具备完整字偶 kerning 系统。

## 对我们当前实现的判断

前期将 `16 / PAPERS / jpg.` 称为三个完整字体体系不准确。源包只有 Papyrus Regular；现阶段交付是现有字体接入、三个字样和动效编辑器。

直接读取 PAPYRUS.TTF：Regular 400、UPM 2048、255 个字形、242 个字符映射；没有 fvar、GSUB、GPOS 或旧式 kern 表。OS/2 未记录 capHeight/xHeight；H/x 的墨迹上边界测得 1675/796，只作为测量结果，不代替原生度量。源文件不具备 Light/Bold、动态异体或笔顺数据。

## 本次完善

1. 生成 `specification.json`，如实记录原字体规格；缺失字段保持 null。
2. 字体页增加规格区、真实单字重展示、白底多行试字、精确字号、字距和行高，以及六档字号对照；提示实际回退字符。
3. 保留已经认可的三张纸纹样张与比例，补充各块实际 CSS 字号，避免把基准滑块数值误当成三块相同字号。
4. 建立 [字体设计与交付规范](../FONT_DESIGN_STANDARD.md)，供后续原创字体与字库引入采用。
5. 动效编辑器中的字体帮助直接连接规格页。浏览器检查见 `tests/font-specification-browser.py`：核对真实 400 字重、精确字号/字距/行高、数值边界、六档字号、中文回退提示与移动端实际字号；结果记录于 `output/font-specification/verification.json`。

这次没有复制 Z1 Scrawl 字形、添加第三方字体或改造 Papyrus 原轮廓。真正新增多字重家族仍需字形设计、字腔补偿、间距校正及跨字号验收，不能把增加界面控件当作字体设计完成。
