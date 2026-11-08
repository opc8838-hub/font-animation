# Papyrus 原始字体与纸纹素材

## 已确认的源文件

用户于 2026-11-05 提供目录 `E:\5695纸纹背景图片`。其中只有一个字体文件 `FONT/PAPYRUS.TTF`，内部名称为 Papyrus Regular，Version 1.11，255 个字形、242 个 Unicode 字符映射。

直接渲染 `16 / PAPERS / jpg.` 后，可见三组字样均来自这一个字体：数字、大写、小写的造型差别不是三个字体家族。原图特征包括 6 的内侧墨块、S 右侧缺口、j/p 的竖笔破口和 g 的轮廓。此前将三组字样作为三个字体去重绘的方向错误，重绘版本已撤出运行目录并归档到 `output/paper-fonts/replaced-reconstructions/`。

`JPG/Paper-1.png`、`Paper-2.png`、`Paper-3.png` 均为完整、可解码的 2000×2000 PNG。Paper-3 的细竖纹与用户海报中的背景相符，作为试字页默认背景。Paper-4/5 仍带 `.baiduyun.p.downloading` 后缀，未导入；不依据部分可解码而判定下载完成。

## 接入

- 原始 TTF 原样复制到 `site/assets/fonts/paper-series/Papyrus-Regular.ttf`，保留原内部名称、版本、版权与嵌入标记。
- WOFF2 为同一字体的压缩包装，不改变字形、度量或字符映射；不添加人工字距，不做子集删减。
- 三张 PNG 原样复制到 `site/assets/backgrounds/paper-series/`。
- 资源路径、SHA-256、原字体元数据、跳过的文件记录在 `site/assets/fonts/paper-series/source.json`。
- 共享字体库中只显示 `Papyrus · 纸上书写`，分组「衬线与书写」，ID `stg:papyrus`，网页 family `STG Papyrus`。
- 旧 `stg:cellmotion-sixteen/papers/jpg` ID 兼容映射到 Papyrus。隐藏旧选择值用于方案加载，避免旧存档回退；不再作为三个字体家族展示。
- `paper-fonts.html` 保留数字、大写、小写三种字样，使用同一个原字体。可切换三张纸纹、下载原始 PNG/TTF、查看完整字符表。
- 中文沿用共享字体库回退；没有宣称此 Papyrus 文件提供中文字形。

## 构建与验证

```powershell
python scripts/import-paper-assets.py 'E:/5695纸纹背景图片'
python tests/papyrus-browser.py
node --check site/shared-font-library.js
node --check site/paper-fonts.js
git diff --check
```

导入需要 Python、fonttools、brotli、Pillow；浏览器检查需要 Playwright 和 Chrome/Chromium。

验证原始文件 SHA-256、全部字形绘制指令、字体度量与字符映射；比较浏览器从原 TTF 和 WOFF2 绘制出的像素；验证试字、字号、重置、中文回退、背景切换及四个原文件下载；检查 390px 手机布局；在 Type Cascade 使用规范 ID 和三个旧 ID 生成 PNG 并比较一致性。结果与截图保存在 `output/paper-fonts/`。

字体内部版权声明保留为：Copyright © Esselte Corporation 1997. Portions Copyright Microsoft Corporation 1997. All rights reserved. 本地素材来源及文件元数据记录不构成新增许可证或授权声明。
