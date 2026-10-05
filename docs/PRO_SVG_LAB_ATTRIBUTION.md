# PRO SVG Lab — 来源与贡献说明 / Attribution

- 技术实现上游：Johnlzx，https://github.com/Johnlzx/pro-svg-lab
- 固定上游版本：`abef02c26b2b62cb1316ccc16dd92032aaeb3ba4`
- 更早的视觉原作：Mike Bespalov / Refero，https://x.com/bbssppllvv/status/2104747296671883312

**此 SVG 材质动效不是本仓库维护者的原创。** 本仓库在 Johnlzx 的公开实现基础上进行编辑器接入与二次创作，并保留其代码说明与来源。上游自己也将其工作描述为对 Mike Bespalov / Refero 视觉动效的独立技术研究和复现。请分别保留这两层署名。

本次贡献：与字芽相同的 CellMotion 工作台；共享多语种字体、段落、图标与媒体模型；画布尺寸、方案导入/保存/恢复/清空、撤销重做、确定性时间轴；PNG、GIF、H.264 MP4 与 SVG 材质导出；官网目录、兼容导航和验证。未来二创应继续区分原作、上游实现与新增部分，不把上游成果称作本项目原创。

`site/vendor/pro-svg-lab/renderer.js` 保持上游原始字节不变。`site/prosvg.js` 是本项目的适配层，负责暂停帧求值、可编辑字形蒙版与共用导出计算。原作视频、上游页面截图和证据目录均不再分发。

## License status

The inspected upstream revision contains no explicit license grant. Public availability and attribution do not establish a redistribution license. This notice preserves provenance; it does not assign this repository’s license to the upstream generator or claim permission from Johnlzx, Mike Bespalov or Refero. Any further redistribution must respect the applicable upstream rights and any separately obtained permission.

## Fidelity

The requested Johnlzx implementation is the default rendering target. Its custom PRO paths, four palettes, six filter stages, default 4.4 s scan, first reveal, grain, warp and light settings are retained. Johnlzx documents differences from the earlier Refero recording; CellMotion likewise makes no claim of pixel identity to that earlier work.
