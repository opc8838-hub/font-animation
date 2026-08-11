# STG 中文版 —— Space Type Generator 中文改造

原站 [spacetypegenerator.com](https://spacetypegenerator.com)（kielm 开源项目，p5.js 实现）的本地中文版。
**27 个字体动效 + 中文渲染支持 + 中文编辑面板 + 响应式效果画廊。**

在线浏览：[GitHub Pages](https://opc8838-hub.github.io/font-animation/gallery.html)

---

## 快速运行

```bash
# 双击 C:\Users\Administrator\stg_cn\启动中文版.bat
# 或手动：
cd C:\Users\Administrator\stg_cn\site
python -m http.server 8080
# 浏览器打开 http://127.0.0.1:8080/gallery.html
```

> 必须走 HTTP 服务（p5.js `loadFont` 禁止 file:// 直接打开）。

---

## 目录结构

```
stg_cn/
├── README.md              # 本文件
├── 启动中文版.bat          # 一键启动
├── mirror.py               # 原站镜像脚本（可重跑补齐）
├── translate_js.py         # UI 中文翻译脚本（含英→中映射表）
├── NotoSansSC-vf.ttf       # 中文字体源（可变字体，供重新实例化）
├── _scratch/               # 临时验证截图，可删
└── site/                   # ★ 网站本体（27 个效果）
    ├── gallery.html        # 效果画廊入口（27 张卡片，链接各效果）
    ├── index.html ~ creatorstudio.html  # 27 个效果页
    ├── sketch_*.js          # 各效果的 p5.js 主程序
    ├── *_script/ *_res/     # 复杂效果的子模块与资源
    ├── assets/              # 字体等公共资源
    │   ├── NotoSansSC-Regular.ttf   # ★ 中文字体（实际使用）
    │   ├── NotoSansSC-Black.ttf     # 中文字体粗体
    │   └── (其余为原站拉丁字体，已不用，可删)
    └── final_*.png          # 画廊用的效果截图
```

---

## 已完成的改动（交接核心）

1. **中文渲染**：字体型效果统一使用 `assets/NotoSansSC-Regular.ttf`
   - 原站用 IBMPlexMono 等拉丁字体，无中文字形 → 中文显示为方块
   - 已实测 p5.js `textToPoints()` 对中文正常：每字提取 35~57 个轮廓点
   - 字体是 TrueType（glyf 表），`textToPoints` 兼容性最佳；**OTF/CFF 会出问题**
   - 圆柱、场域、线圈等早期效果原本只支持 A-Z；现在保留英文手绘字形，并为中文及其它字符增加 Noto Sans SC 兜底
   - Flag 的四角字形、Ribbon 的反向字宽、Boost 的 3D 字体轮廓均有独立中文兼容处理
   - BoxSquad 原本没有文字功能，现已增加中文文字输入并绘制到每个方格
2. **主要 UI 中文化**：
   - 统一工具栏、24 个效果导航、常用编辑区、保存与参数标签已中文化
   - JS canvas 上绘制的滑块标签（`text("圆柱半径 "+v)` 之类）和 `createButton` 按钮文字已补译
   - 原字体名和原作专有名称保留英文，避免技术值被误改
   - 翻译映射集中在 `translate_js.py` 的字典里，改文案直接改那里
3. **故障修复**：
   - snap/vessel/boost/flash 报 `getElementById("textArea")` null → 是批量替换 textarea 时把 id 改坏了，**已恢复 `id="textArea"`**
   - field/snap 之前被判定"白屏"是误判，实为浅灰文字设计，正常
   - 修复静态服务器下 `/field` 等无扩展名导航 404
   - 补齐 Snap 缺失样式和 Construct 缺失的 12 个 GIF 素材
   - 移除失效透明背景图引用，以及原站遗留的 Google Analytics / Cloudflare 统计代码
4. **各页面输入框默认文字**设为「中文渲染测试」（可改任意文字实时看动画）
5. **效果画廊重做**：支持搜索、类型筛选、整卡点击、桌面与手机布局
6. **统一效果工具栏**：每页可返回画廊、切换上一个/下一个效果，触屏设备可点击打开完整菜单
7. **编辑器交互重做**：
   - 11 个旧版 p5 效果由共享编辑层接管散落在画布上的控件，按“文字 / 形态 / 动效 / 颜色 / 操作”分组，滑杆显示实时数值
   - 12 个已有 HTML 面板的效果统一为可滚动侧栏，默认展开首个编辑区，并提供手机底部面板布局
   - 代理控件只同步原始参数和事件，不改动画算法；原控件仍是实际状态源
8. **浏览器实测**：原有 23 个效果已完成中文输入审计；新增「续句」已完成 30fps 关键帧、桌面和手机布局验证

---

## ⚠️ 关键坑（改代码前必读）

- **textarea 的 id 不要统一改**：有的效果代码用 `getElementById("textArea")`（大写 A），有的用 `select("#textfield")`。改 id 会直接弄挂页面。当前已各就各位。
- **第三方库不要翻译**：`CCapture.all.min.js`、`js/gif.worker.js` 是压缩第三方库，已从原站恢复原版。任何批量文本替换都要排除它们（`translate_js.py` 已排除 p5/CCapture/gif.worker）。
- **字体用 TTF 不用 OTF**：p5.js `textToPoints` 对 CFF/OTF 轮廓有兼容问题。
- **旧版控件变量名不要随意改**：共享编辑层会根据 p5 控件对应的全局变量名生成中文标签；改名后功能仍可能运行，但标签会退回为通用“参数”。
- **不要用程序化 click 展开现代面板**：部分 p5 效果把页面任意点击当作画布交互；应直接设置折叠区状态，避免触发动画函数。
- **CDN 依赖**：页面引用了 cdnjs 的 p5.js 等，目前需要联网加载。要做完全离线需本地化这些 CDN 文件（见待办）。
- **子集化前先备份**：字体裁剪后建议用 `textToPoints` 测试目标文字，防止字形丢失。

---

## 待办（尚未做）

- [ ] **子集化性能优化**：现在每页加载全量 Noto Sans SC ~10MB。方案：fontTools 裁剪到常用 3000~3500 字（~2MB），覆盖日常输入 99%。注意各效果用到的预设中文文案也要包含。
- [ ] **深度导出验证**：24 个页面已完成基础 HTTP 与浏览器检查；复杂录制、GIF/MP4/SVG/JPG 导出以及每一个参数组合仍需逐项人工验收。
- [ ] **CDN 本地化**：p5.js 等从 cdnjs 引用，离线环境需下载到 `site/js/` 并改引用。
- [ ] **预设文案可定制**：canvas 预设文案（"属于你""时光流逝"等）目前是直译，用户可能要换。
- [ ] **少量专有预设名复核**：字体名保持英文；个别原作预设名是否翻译，可根据实际使用习惯继续调整。

---

## 技术栈

- p5.js 1.0.0（WEBGL 渲染）+ opentype.js（内部字形解析）；续句使用 GSAP 3.13 时间轴
- 字体：Noto Sans SC（思源黑体，SIL OFL 开源可商用），fontTools 从 variable 字体实例化
- 纯静态站，无需构建，HTTP 服务即可运行

## 许可

- 原站作者 kielm 声明开源；镜像仅供学习/个人改造
- 中文字体 Noto Sans SC：SIL Open Font License 1.1，可免费商用
- p5.js：LGPL 2.1
