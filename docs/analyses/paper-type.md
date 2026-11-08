# 纸上字样 / Paper Type

用户要求：在 CellMotion 中新增独立字体动效，使用源素材的字体任意输入，可换背景，同一作品同时显示 `16`、`PAPERS`、`jpg.` 三块效果。

## 来源与设计

- 三种示例实际均为 **Papyrus Regular**，使用 `E:\5695纸纹背景图片\FONT\PAPYRUS.TTF` 转换的原轮廓 WOFF2，不再使用前期手工重建字体。原字体与纸纹的 SHA-256 及版权信息见 `site/assets/fonts/paper-series/source.json`。
- 默认三个独立纸面，上下排列，1080 × 1440；每块包含主字样和可隐藏、可编辑的字符表。三块始终属于同一个画布，导出时一起显示。
- 背景默认 Paper-3，内置三张完整 PNG，支持纯色、上传图片、GIF 和静音视频背景。背景各自归属稳定区域 ID；只有明确点击“应用全部”才复制背景。
- 默认打开为三块完整展示的停留帧。重播从 0 开始，0.85 秒显现、区域错开 0.22 秒、共同停留 4 秒、淡出 0.7 秒，总长默认 5.99 秒。纸纹稳定，墨迹轻微上移并显现，不扭曲字体轮廓。
- Papyrus 不覆盖中文。共享字体库为中日韩文本加载配套字体，界面明确说明补字行为；可以选择共享字库的其他字体。
- 视频背景的起止点、缩略条和数值同步；GIF/视频按作品时间取帧。此作品是同时展示的区域组合，没有顺序翻页背景切换。

## 实现与入口

- `site/paper-type.html` / `.css`：CellMotion 三栏编辑器、移动端画布优先、主题和语言切换。
- `site/paper-type.js`：独立内容编辑、排序、画布比例、时间轴、IndexedDB 自动保存、JSON 方案、导出。
- `site/paper-type-renderer.js`：统一字形测量、布局和确定性动画；预览和导出使用同一计算。复用共享字体、动画图片与背景媒体运行时，以及项目现有 GIF/H.264 编码器。
- 动效库、工作台目录、首页最近上新、旧版全局导航和 Papyrus 字样页均连接本编辑器。目录预览在外围补留白，保证不同卡片比例仍可看见完整三块字样。
- 入口：`paper-type.html?from=gallery` 恢复默认示例；`paper-type.html` 读取自动保存的作品。2026-11-08 发布版本使用 `https://cellmotion.cn/paper-type.html?from=gallery&v=20261108-release1`。

## 验证

执行 `python tests/paper-type-browser.py`，真实 Chrome 覆盖三块同屏、独立内容与背景、上传持久化、排序、增删至单块、方案保存/导入/恢复/清空、主题语言、尺寸切换和移动端无横向溢出。比较 PNG 与同尺寸渲染器的每个像素通道，允许 Canvas 抗锯齿取整的 1/255 差异。实际编码并检查 GIF 帧数和 H.264 MP4 的尺寸、时长、帧率；验证 GIF、视频裁剪与背景方案恢复。

截图、导出文件和结构化结果位于忽略目录 `output/paper-type/`。静态结构检查：

2026-11-05 验证通过：主浏览器用例控制台无错误；H.264 为 360 × 480、15 fps、2 秒，动态图背景导出为 15 帧/1 秒；目录预览为 960 × 600、24 fps、6 秒。另检查 Inter、Noto Sans SC、Noto Sans JP Black、Noto Sans KR Black 的长文本与换行，实际导出横排 PNG；时间轴时长修改、点击跳转、三种阶段颜色及动效库入口均通过。页面目录共 94 项，其中 62 项可用、32 项待完成。

```text
python .codex/skills/build-font-animation-effects/scripts/check_editor_contract.py site/paper-type.html site/paper-type.js
node scripts/build-cellmotion-catalog.mjs
node scripts/check-cellmotion-website.mjs
```

PNG 导出当前暂停帧；GIF/MP4 从时间轴起点导出完整循环或指定时长。背景视频用于画面，导出不含其音频。

## 2026-11-07 编辑器排版补齐

当前区域新增实际输出像素字号、字距/em、行高/倍、自动缩小开关和实际绘制字号反馈。每块独立保存这些参数，排序、自动保存和 JSON 导入均保留。旧版区域基准字号转换为 `fontSizePx`；原 `fontSize` 保留用于读取旧方案。下方字符表继续使用其原有排版，主字样的调整不改变字符表。

字重/样式选择从共享字库中当前家族的真实字体记录生成，切换时更新对应字体 ID；Papyrus 仅有 400，Noto Sans SC 有 200/400/900。渲染器、字体加载与导出读取相同 ID，不做合成加粗。

`python tests/paper-type-typography-browser.py` 通过：独立调整、精确像素字号、真实字重切换、排序和方案往返、旧字号迁移、PNG 与预览像素对照、15 帧 GIF、1 秒 H.264 MP4、手机无横向溢出及控制台无错误。产物位于 `output/paper-type-typography/`。

## 2026-11-08 发布验证

在最新 `origin/main` 的独立工作区集成，保留 Oddball 和金属动效的最新版本。运行与 GitHub Pages 相同的 `prepare-homepage.mjs` 后，排版编辑与真实导出测试、字体规格浏览器测试均通过。发布准备脚本使用新的共享字体库版本，避免返回访问者继续读取旧字库缓存；源代码目录检查在构建前执行，生产转换后的 WebP Logo 由浏览器验证。
