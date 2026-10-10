# CardBot 动效在 CellMotion 的两个独立编辑器

发布：2026-10-10。它们不是跳转到旧 CardBot 页面的外链，也不会修改原 CardBot 网站。

## 在线入口

- [CellMotion 首页](https://opc8838-hub.github.io/font-animation/cellmotion.html)：最近上新。
- [翻牌登录 / Card Login](https://opc8838-hub.github.io/font-animation/card-login.html?from=gallery)：同尺寸交接，旋转中变白，再显现登录内容。
- [卡牌剧场 / Card Deck](https://opc8838-hub.github.io/font-animation/carddeck.html?from=gallery)：单卡叠放 → 展开分排 → 交错横移 → 收拢归位。
- [原始可输入表单示例](https://opc8838-hub.github.io/font-animation/card-login-source/) 与 [原始转场源码 ZIP](https://opc8838-hub.github.io/font-animation/assets/cardbot-login-handoff.zip)。

组件库和编辑器目录都可独立搜索这两款，分类是“立体空间”；组件库的“网页使用”也能找到这两款已验证的 AI 组件。

## 怎么编辑

两款共用现有三栏规范：左侧内容与方案，中间画布、播放和多色时间轴，右侧“当前内容 / 动效设置 / 导出”。手机先展示画布，下面再编辑内容；面板不会盖住预览。

### 翻牌登录

可改品牌、标题、说明、账号/密码标签、登录按钮与底部文案；使用站内完整共享字体库。卡背、白色正面、文字、强调色和背景可分别调整，卡片尺寸、圆角与位置独立可调。

动作保留之前确认的 1.8 秒衔接：起始与片尾卡牌同尺寸，不先缩小；翻转中途就变白，不再出现放大的黑色 CardBot 品牌面。整体速度、方向、翻转时长、变白时机、文字渐入与缓冲幅度均可调。编辑器默认追加 1.2 秒登录停留，便于循环观察；不是把原转场改成 3 秒。

### 卡牌剧场

默认带入原编辑器的 45 张表情卡牌及其顺序。表情不是静态截图：原 SVG 的眼睛路径、矩阵关键帧和交替周期被按时间采样，定位与导出均可复现。

可以调整行数、间距、卡片大小、高宽比、展开/横移/收拢时间、横移速度、交错、飞行角度及缓动。保留背后抽出/横向分排、同步/逐排收回两组动作选择。

每张卡牌独立保存大小、颜色、透明度、旋转与偏移。可在左侧拖动排序，或在单卡编辑里上移/下移；键盘 Alt + ↑/↓ 也可排序。首张是收拢后的主卡。排序不会把其它卡牌的参数串到当前卡上。

添加素材时先选择候选，再点明确的“插入”，上传不会自动插入。资源库包含 CardBot 原卡、站内完整图形/GIF/透明动物等分组；已选管理默认折叠，单卡编辑在右侧展开。

## 尺寸、背景与导出

- 画幅：16:9、1:1、4:5、3:4、2:3、9:16、4:3、3:2 和自定义；自定义边长 240–3840 像素，自动规范为偶数以兼容 H.264。
- 背景：纯色、图片、GIF、MP4/WebM；视频可用缩略图条和起止范围裁剪。
- PNG 保存当前帧；GIF、MP4 从第一帧导出完整一轮或指定时长；15/24/30/60 fps。
- MP4 使用逐帧 H.264 编码，不是屏幕录制。预览、定位、导出和 AI 播放器使用同一渲染器。
- 单个上传文件上限 12 MB。超大 GIF 会明确提示降低尺寸/FPS或改用 MP4，避免无提示卡死。浏览器 GIF 逐帧解码优先使用支持 ImageDecoder 的 Chrome/Edge；不支持时会提示，不能保证其它浏览器的 GIF 导出时序。
- 原 CardBot 导出的矩阵关键帧 SVG 可作为动态卡牌导入；静态 SVG 会清理脚本与外部引用。其它任意 SVG 动画不做虚假的“完整支持”，会要求改用 GIF。

## 方案管理

只保留四项：保存方案、导入方案、恢复默认、清理重做。自动保存在当前浏览器，Ctrl/⌘ Z 撤销，Shift + Ctrl/⌘ Z 重做。

从网站目录进入始终打开默认效果，普通刷新续接浏览器的工作状态。跨设备请保存并导入 JSON；上传素材内嵌在 JSON 中。较大媒体可能超过浏览器本地存储配额，此时请下载方案，不把本地缓存当作可靠备份。

## For AI 怎么用

右上角“用于 AI / For AI”有五项：

1. 预览 AI 组件：把当前编辑内容传给独立预览页，而不是打开默认效果。
2. 复制 AI 提示词：包含当前配置、资源、字体和接入边界。
3. 复制配置代码：可嵌入的 `<cellmotion-player>`，使用网站同一渲染器。
4. 下载组件 JSON：保存 `cellmotion-component/v1` 清单及当前完整状态。
5. 查看参数说明：原生参数、范围、动作阶段和能力限制。

登录使用 `scene` 模型，卡牌使用 `cards` 模型，不伪装成文字行。文字、卡牌顺序、逐卡设置、自有图片/GIF与背景视频的裁剪都包含在实时配置里。播放器支持 configure、play、pause、restart、seek、update 和 duration；可用于网页内的响应式动效组件。生产环境请进一步限定允许通信的域名。

“For AI”是给 AI 编程助手的组件交接，不是内置聊天模型，也不会调用 DeepSeek 等模型 API。

## 真实登录的边界

Canvas 播放器只呈现视觉，不是可填写、可提交的 HTML 表单，不包含账号认证、服务端或任何业务 API。

需要真正输入账号密码时，使用随附原始 HTML/CSS/JS 源码，保留同尺寸衔接与翻面参数，接入自己的表单验证、认证和路由。原始套件按原文件另存，不会用渲染画布替代真实表单。

## 验证与维护

已测 1920×1080、1440×900、1024×768、768×1024、390×844、320×740 界面，以及横屏、正方形与竖屏画布。浏览器验收覆盖方案往返、主题/语言不污染内容、字体、素材选择/插入/排序、自有动态 SVG、GIF 源时序及真实 GIF 导出、视频裁剪与刷新恢复、For AI 实时预览与更新，以及两款 PNG/GIF/MP4 实际下载。

另有旋转中白卡的像素回归检查，防止透视贴图接缝再次出现。测试不代表所有参数组合或所有浏览器均已覆盖。

```bash
python -m http.server 4186 --bind 127.0.0.1 --directory site
# 在另一个终端：
python tests/cardmotion-seams.py
python tests/cardmotion-media.py
python tests/cardmotion-storage.py
python tests/cardmotion-bridge.py
python tests/cardmotion-acceptance.py
python tests/cardmotion-site.py
node scripts/build-cardmotion-presets.cjs
node scripts/build-cellmotion-catalog.mjs
node scripts/check-cellmotion-website.mjs
```

素材构建脚本 `scripts/build-cardbot-assets.py` 只在重新同步 Bot 原始预设时使用；默认预设和关键帧已随站发布，运行网站不需要其它仓库。预览视频由 `tests/cardmotion-publish-assets.py` 调用实际编辑器导出。

来源与许可单独见 [CARDBOT_MOTION.md](licenses/CARDBOT_MOTION.md)，保真参数见 [cardmotion-preservation.md](analyses/cardmotion-preservation.md)。
