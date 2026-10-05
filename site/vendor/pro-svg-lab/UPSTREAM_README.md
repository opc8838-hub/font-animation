# PRO · SVG 材质实验室

打开 `index.html` 即可。无需安装依赖，也无需联网加载字体或库。浏览器可直接打开 `pro.svg` 播放原生动效。

这是对 Mike Bespalov / Refero 的 PRO 动效的技术研究和独立复现。滤镜结构依据公开页面核对；字形、色表采样、实验界面和扩展效果重新编写。未复制或分发网站的应用脚本。

## 使用

- 点击 01–06 查看滤镜每一步；时间与参数会保留。
- 暂停后拖动时间轴，观察同一相位的不同处理结果。
- 切换四种色谱，调整柔度、颗粒与周期。
- 展开“进一步实验”，添加流体置换和浮雕高光。两者是本实验新增，默认均关闭。
- “导出当前 SVG”保存完整最终材质，包括当前参数和原生动画，不导出实验室 JavaScript。导出文件从第零秒开始播放。
- 页面遵循系统的减少动态效果设置：主动画默认暂停，下面的对照插图换成静态 SVG。独立动画 SVG 本身持续循环；需要静态版本时用 `pro-static.svg`。

## 文件

| 文件 | 用途 |
|---|---|
| `index.html`、`style.css`、`app.js` | 交互实验室；JS 仅管理参数、时间控制和导出 |
| `renderer.js` | 参数化 SVG 生成器；动画由生成的 SMIL 执行 |
| `pro.svg` | 默认复现，原始文件 6,613 字节，gzip 1,969 字节 |
| `pro-silver.svg` / `pro-lava.svg` / `pro-violet.svg` | 三种独立材质变体 |
| `pro-static.svg` | 无动画静态版 |
| `analysis.md` | 逐帧观察、机制、公式与设计启发 |
| `evidence/` | 滤镜分解、材质样片、原片对照、页面截图与验证记录 |
| `build.cjs` | 无依赖生成脚本；`node build.cjs` 重建 SVG 文件 |

原视频位于 `assets/refero-pro-animation.mp4`，用于本研究的逐帧对照，原作归 Mike Bespalov / Refero 所有。[查看原帖](https://x.com/bbssppllvv/status/2104747296671883312)。

## 本地运行与重新生成

直接打开 `index.html`，或在仓库根目录运行静态服务器：

```sh
python3 -m http.server 8000
```

随后访问 `http://localhost:8000`。如需重新生成独立 SVG，安装 Node.js 后运行：

```sh
node build.cjs
```

项目不需要安装 npm 依赖。

## 使用到其他页面

```html
<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="pro-static.svg">
  <img src="pro.svg" width="746" height="354" alt="Pro">
</picture>
```

改变文字时，应替换 `renderer.js` 中的路径并重新考虑字重、字腔和模糊尺度；仅改 aria-label 不会改变可见字形。多个内联 SVG 的 `id` 必须唯一，生成器支持 `id` 参数。`<img>` 中的 SVG 不共享宿主文档的 ID 命名空间。

## 验证范围

已在本机 Chrome 验证桌面 1440px、手机 390px、暂停、重播、时间滑块、四种色谱、扩展效果、参数还原、SVG 下载，以及禁用 JavaScript 时的原生动画。没有宣称完成 Safari / Firefox 或低端手机的性能测试。

原作的白色背景参与滤镜计算，因此这些 SVG **不是透明背景贴纸**。换背景需要同时修改底色、颜色映射与透明度逻辑。
