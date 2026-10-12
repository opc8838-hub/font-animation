# 视频对比 / Video Compare

## Source material

- 用户本机「对比/参考.jpg」：1280 × 2769 的平台截图；Before 较小、After 较大，两框均为横屏视频。平台控件、工作流、模型与其它署名不属于目标画面。
- 用户提供 B2W / Back 2 Work Studio 黑白 Logo，成品底部仅保留该标志。
- 分析与更新日期：2026-10-13。参考为静态截图，没有可观察的动作时序；按用户要求不增加入场、转场或其它动效。
- 第二轮要求：两句说明可编辑；Before 必须小于 After；开放 9:16 成品；明确源视频尺寸与整体画布尺寸分别如何适配。

## Target and phase table

两段独立上传的视频同步播放，用较小的 Before 和较大的 After 做静态对比。

| Time | Phase | Visible behavior | Confidence |
| --- | --- | --- | --- |
| 0–较短片段结束 | 双视频对比 | 固定版式，两段素材从各自裁剪起点同步播放 | high |
| 较短片段结束–总时长 | 末帧保留 / 短片循环 | 可选停在末帧或重复短片；长片继续播放 | high；产品处理规则 |
| 全程 | 持续元素 | 主标签、独立说明与 B2W 底部署名静止 | high |

## Source aspect versus output canvas

1. **源视频尺寸**是文件实际的宽高，上传后在该视频的上传栏显示，例如 1920 × 1080 · 16:9 横屏、1080 × 1920 · 9:16 竖屏。
2. **视频框比例**控制版式中的两个视频框。默认自动匹配素材，优先使用 After 的实际比例；没有 After 时取 Before，没有素材时取 16:9。也可手动固定为 16:9 或 9:16，以便上传前排版。
3. **整体画布尺寸**控制最终 PNG / GIF / MP4 的宽高，支持 16:9、9:16、4:3、3:2、1:1 和 320–3840 范围内的自定义偶数尺寸。修改画布不会改变原素材或拉伸视频。

| 同组视频素材 | 16:9 成品 | 9:16 成品 |
| --- | --- | --- |
| 16:9 横屏 | 左右并排，Before 小、After 大 | 参考图式上下排列，Before 小且居中、After 大 |
| 9:16 竖屏 | 并排，保留两个竖屏框 | 并排利用画布高度，一小一大，保留竖屏框 |

- 两个框始终使用相同比例。Before 默认是 After 宽度和高度的 65%，允许 45%–85%；不允许达到或超过 After。
- 方形及较窄画布中的横屏视频上下排列；竖屏视频采用并排布局。上下排列增大两组之间的留白，默认净间距为画布高度的 9.5%，使 After 标题与上方视频保持清楚距离。
- 所有画幅顶部居中显示非常小、低对比度的 have a good day，可在版式设置修改；字段保存在本机和 JSON 中，旧方案补入默认文案。
- 不同比例的混合素材：自动模式以 After 为框比例；另一段默认完整显示并留边。各段可独立切换铺满裁切、缩放和水平/垂直取景。
- 视频和文本布局全部按画布逻辑尺寸同比例计算。视频取景使用相同缩放因子处理宽和高，禁止拉伸；预览 CSS 只缩放整张成品。
- 标签字号随所属视频框缩放，长文案自动缩小以避免覆盖另一侧说明。圆角、边距、视频间距和 Logo 大小可调。

## Editing and reuse

- Before / After 主标签及「网上看到的 / 我做的」说明分别归属两个稳定槽位，均为自由文本。
- 右侧显示「说明文字 · 可编辑」。点击画布中的标签或说明，可直接选中对应槽位并聚焦文字输入框。
- 沿用 Type Cascade 三栏、方案四按钮、播放/重播、彩色时间轴、完整共享字体库与中英文/深浅色 UI。界面偏好独立于成品黑白配色和用户文案。
- 不引入工作流、模型、文本段落增删或图标库。原有 beforeafter 图片动效保持独立；新入口为 video-compare.html。
- 两段素材独立上传、替换、移除、裁剪；缩略时间轴可拖拽或方向键微调。
- IndexedDB 自动保存完整方案及视频；JSON 嵌入媒体，可迁移、导入和恢复。保留 version 1，旧方案缺少视频框比例/大小字段时补为 auto / 65%。
- 保存、导入、恢复默认、清理及 Ctrl/Cmd+Z / Shift+Z / Y 撤销重做。每段文件上限 200 MB，需浏览器支持文件内部的编码。

## Timing and export

- 完整视频时长取两段已裁剪片段的较长者；可选 3/5/10 秒或自定义 0.1–120 秒。空模板时长 6 秒。
- PNG / GIF / MP4 共享 renderFrame、geometry、mediaPlacement 与 sourceTime。视频帧等待解码及 seeked，使用项目 HME 编码器，非实时录屏。
- H.264 MP4 为 24/30/60 fps；GIF 至多 30 fps；PNG 保存当前暂停帧。MP4 保留已开启的原视频声音；PNG / GIF 没有音轨。

## Audio contract (2026-10-13)

- 两个视频槽位各有「原视频声音」开关，预览与 MP4 使用相同设置。默认 Before 关闭、After 开启；旧版 JSON / 本机方案采用相同默认值。
- 可选只听 Before、只听 After、两路混合、全部静音。混音时有音轨的已开启素材各用 1/N 增益，避免两路叠加超出范围；不额外加背景音乐。
- 原片的声音从对应裁剪起点开始。末帧保留时声音在片段结束后静音；循环时重复同一裁剪片段的声音。无音轨素材显示提示，并继续按无声素材处理。
- 预览仅对预览视频元素开启声音；缩略图与逐帧导出元素持续静音。暂停、取景编辑、导出开始均停止预览声音；用户点击播放/重播时启动有声播放。
- 导出使用本地固定的 Mediabunny 1.61.3（MPL-2.0，原始源码来源与许可在 site/js/vendor/mediabunny/），按源音轨时间戳解码选中区间，Web Audio 离线混合至 48 kHz 双声道，编码 AAC 192 kbps。
- 现有 HME 逐帧 H.264 编码保持不变；将其压缩视频包原样拷贝到最终 MP4，并加入处理后的 AAC 音轨。全部关闭或选中素材本身无声时保留原有无声 MP4。
- 声音设置归属稳定视频槽位，替换视频时保留；JSON、IndexedDB 与撤销/重做均保存。导出期间锁定声音与时间设置，支持取消。

## Upload blank-preview fix (2026-10-13)

- Reproduced the reported appearance (only greeting and logo visible) using a genuine AAC-only MP4 uploaded as video: native loadeddata fires with finite duration but videoWidth / videoHeight both zero. The old automatic aspect became NaN and erased both video boxes and labels. The user's original file was unavailable; this reproduces the same symptom and can also occur when only a file's audio codec is decodable.
- Readiness now requires a decoded video picture with positive dimensions and finite duration. A failure names H.264 MP4 / AAC compatibility, preserves a previously uploaded video, and allows selecting the same file again.
- Validated source dimensions are cached for layout and source information. Transient zero live dimensions cannot poison automatic aspect or the other video; drawing falls back to the upload placeholder until a valid frame is available.
- Only the preview decoder is required to upload. Filmstrips are optional background work and release their decoder afterwards. Export decoders are created only when needed and released at export completion. Thumbnail failure cannot reject a valid video upload.
- Old upload and thumbnail tasks check runtime ownership before publishing results. Scheme restore retains embedded files and shows per-slot decode errors instead of clearing user data.
- tests/video-compare-upload-browser.cjs failed on the previous version, then passed: invalid audio-only input; previous-video preservation and retry; transient dimension loss plus continued playback; visible decoded pixels after recovery; failed filmstrip decoder isolated from the preview. Browser errors are empty.

## Acceptance evidence

Windows 上使用 Node Playwright + Microsoft Edge 执行 tests/video-compare-browser.cjs，第二轮共 22 项检查全部通过：

- 三栏、两槽位和四个方案操作；真实横屏/竖屏 MP4 上传，实际素材比例识别与裁剪定位。
- 两句中文说明可编辑；自动保存刷新恢复，UI 语言/主题切换保持内容。
- 视频框比例、Before 相对大小及 9:16 画布进入自动保存与嵌入 JSON 往返。
- 自定义宽高同步到预览和实际输出；暂停 PNG 与实时画布像素一致。
- 横屏与竖屏素材分别进入 640 × 360、360 × 640，共四种组合：所有框均保持素材比例，Before 的宽高严格小于 After，内容位于画布内。
- 320 × 180 与 1920 × 1080 的对应几何严格同比例缩放。
- 混合素材中的竖屏源进入横屏框时，实际像素验证两侧留边、内部视频可见，宽高缩放一致。
- 实际生成横屏 MP4、两种源比例的竖屏 MP4，以及横竖 PNG / GIF；24 fps 下 0.4 秒上取整为 10 帧，MP4 解码时长为 10/24 秒。
- 实际生成 1080 × 1080 PNG；Before 大小输入 100% 的导入值被限制为 85%。
- 点击画面说明聚焦正确视频槽位的 caption 输入框。
- 1440/1200/1024/768/390 像素视口无横向溢出，9:16 画布在 stage 内；手机 stage 优先。
- 顶部小字在七个主流/自定义画幅中均通过实际像素检查；修改后刷新可恢复。
- 浏览器运行错误为空。上一轮已实际预览并导出 Manrope、Noto Sans SC/JP/KR 四种共享字体。

新增 tests/video-compare-audio-browser.cjs：两段带不同频率音轨的真实 MP4，实际生成 Before / After / mixed / muted / loop 五个文件；重新解码音轨核对频率、裁剪点、混音增益、末帧静音、循环、音视频时长与音轨数量，并检查用户点击播放、独立开关、中英文和方案往返。原有 22 项验收仍通过。

测试视频、导出与截图在被忽略的 output/video-compare/ 中；仓库保存新模板封面、用户 Logo、编辑器与测试。当前为本地版本，未发布网站。

## Uncertainties to verify

- 竖屏源视频在竖屏成品中采用并排一小一大的设计，属于本轮适配方案，待用户视觉确认。
- AAC 导出需要浏览器支持原生编码；Windows 当前 Edge 已通过真实导出测试。不支持的浏览器会明确提示，禁止悄悄丢弃声音。
