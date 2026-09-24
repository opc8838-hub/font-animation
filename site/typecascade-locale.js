/* Editor-only localization. Never rewrites input values, scheme data or renderer text. */
(() => {
  if (!document.body.classList.contains('tc-workspace')) return;
  const body = document.body;
  const dictionary = new Map(Object.entries({
    '字倾': 'Type Cascade', '字倾编辑器': 'Type Cascade editor',
    '字芽': 'Sprout Shift', '字芽编辑器': 'Sprout Shift editor',
    '点解': 'Dot Resolve', '点解编辑器': 'Dot Resolve editor',
    '字融': 'Glyph Morph', '字融编辑器': 'Glyph Morph editor',
    '续句': 'Continuation', '续句编辑器': 'Continuation editor',
    '雾升': 'Mist Lift', '雾升编辑器': 'Mist Lift editor',
    '字现': 'Glyph Reveal', '字现编辑器': 'Glyph Reveal editor',
    '水流': 'Water Flow', '冲击接句': 'Impact Build', '轨书': 'Path Writer',
    '快门对比': 'Shutter After', '图标爆发': 'Icon Burst', '纵跃': 'Vertical Rise',
    '汇聚': 'Creator Merge', '上下翻转': 'Split Flip', '无重力翻转': 'Zero-G Flip', '字标接力': 'Glyph Relay',
    '拆开': 'Explode', '漂浮': 'Drift', '合拢': 'Assemble', '翻转': 'Flip', '站稳': 'Settle',
    '漂起': 'Rise', '悬停': 'Hover', '镜头推移': 'Camera drift', '卡片厚度': 'Card thickness',
    '漂浮幅度': 'Float amount', '更换空间背景': 'Replace space background', '默认暗空间': 'Default dark space',
    '上传卡片图片': 'Upload card image', '显示字幕（贴在屏幕上，不跟卡片翻）': 'Show caption (screen space, does not flip)',
    '产品爆炸图': 'Product explode', '画面组件': 'Image pieces',
    '上传产品或图片': 'Upload product or image', '默认示例产品': 'Sample product',
    '把文字当成一层组件一起拆开': 'Treat caption as a component',
    '拆开程度': 'Explode amount', '翻转圈数': 'Flip turns', '产品层数': 'Product layers', '画面网格': 'Image grid',
    '回正': 'Settle', '切图': 'Cut images', '图片高度': 'Image height', '上下移': 'Move vertically',
    '翻转首图': 'First image', '翻转后切图（可多选 2–3 张）': 'Images after flip (2–3)', '切图过渡': 'Cut transition',
    '镜头环绕': 'Camera orbit', '斜角': 'Tilt', '起始朝向': 'Start facing',
    '城市字塔': 'City Stack', 'Delete': 'Delete',
    '萌发开场': 'Sprout intro', '缩放生长': 'Scale grow', '雾凝开场': 'Mist intro', '升散浮入': 'Lift in',
    '用于 AI': 'For AI',
    'CellMotion 首页': 'CellMotion home',
    '让创意，自由生长': 'Let creativity grow freely', '动效库': 'Effects', '导出作品': 'Export',
    '☀ 浅色': '☀ Light', '☾ 深色': '☾ Dark', '切换为浅色编辑器': 'Switch to light theme', '切换为深色编辑器': 'Switch to dark theme',
    '▧ 铺满背景': '▧ Fill backdrop', '开启背景铺满': 'Enable full backdrop', '关闭背景铺满': 'Disable full backdrop',
    '内容': 'Content', '当前编辑': 'Selected',
    '文字段落': 'Text blocks', '＋ 添加段落': '＋ Add', '添加文字段落': 'Add text block', '选择一段文字，在右侧编辑': 'Select a block to edit on the right',
    '选择文字段落': 'Select a text block', '段落导航': 'Text navigation', '当前段落': 'Text block', '动效设置': 'Motion',
    '属性分类': 'Settings tabs', '导出': 'Export', '画布预览': 'Preview', '画布与播放': 'Canvas and playback',
    '预设': 'Preset', '自定义': 'Custom', '宽度': 'Width', '高度': 'Height', '停留 / 毫秒': 'Hold / ms',
    '本行字体': 'Block font', '跟随全局字体': 'Use default font', '复位留白': 'Blank reset',
    '本段文字颜色': 'Block text color', '本段背景颜色': 'Block background color', '应用到全部段落': 'Apply to all blocks',
    '＋ 插入图标': '＋ Add icon', '暂停修改': 'Pause & edit', '上移': 'Move up', '下移': 'Move down', '删除': 'Remove',
    '至少保留一段文字': 'Keep at least one block', '本行倾倒与下落': 'Tilt & fall', '调整快慢 / 悬停': 'Timing / hang',
    '倾倒时长（毫秒）': 'Tilt time (ms)', '悬停时长（毫秒）': 'Hang time (ms)', '下落时长（毫秒）': 'Fall time (ms)',
    '下落时长越短越快；悬停设为 0 可直接落下。修改后从本行倾倒开始播放。': 'Shorter falls move faster. Set hang to 0 to fall immediately. Edits replay this block from its tilt.',
    '本行背景': 'Background', '背景 · 图片 / GIF / 视频': 'Background · Image / GIF / Video', '纯色': 'Solid color', '背景颜色': 'Background color', '上传背景视频': 'Upload video',
    '上传 / 更换背景': 'Upload / replace background', '请选择图片、GIF 或视频文件。': 'Choose an image, GIF, or video file.',
    '将背景颜色应用到全部段落': 'Apply background color to all blocks',
    '背景转场': 'Transition', '直接切换': 'Cut', '柔和叠化': 'Crossfade', '叠化时长': 'Fade time', '毫秒': 'ms',
    '移除视频': 'Remove video', '移除素材': 'Remove media', '图片': 'Image', '视频': 'Video',
    '拖动两侧把手裁剪视频片段': 'Drag the handles to trim the video', '读取中…': 'Loading…',
    '开始秒数': 'Start (s)', '结束秒数': 'End (s)', '编辑': 'Edit',
    '画面裁剪': 'Crop media', '在画面中拖动选择保留区域': 'Drag to choose the visible area',
    '背景画面裁剪预览': 'Background crop preview', '画面缩放': 'Media zoom', '居中并恢复原始缩放': 'Center and reset zoom',
    '字体与构图': 'Type & layout', '全局默认字体': 'Default font', '字号': 'Font size', '字距': 'Tracking',
    '水平': 'Horizontal', '垂直': 'Vertical', '对齐': 'Alignment', '左': 'Left', '中': 'Center', '右': 'Right',
    '文字色': 'Text color', '全部行背景色': 'All backgrounds', '新增行默认文字色': 'New block text color', '新增行默认背景色': 'New block background', '新段落默认文字色': 'New block text color', '新段落默认开头颜色': 'New block start color', '新段落默认背景': 'New block background', '新词默认字色': 'New word default color', '倾倒节奏': 'Motion timing',
    '开场先让字符从左右倾斜中立稳；之后旧字绕底部摆落、新字从基线长入。': 'Letters settle upright, then tilt and fall as new letters rise from the baseline.',
    '立字开场': 'Stand up', '开场时长': 'Intro duration', '开场逐字错峰': 'Intro stagger', '新字长入时长': 'Grow-in time',
    '摆落错峰': 'Fall stagger', '倾倒角度': 'Tilt angle', '总速度': 'Speed', '循环播放': 'Loop',
    '停留': 'Hold', '倾倒': 'Tilt', '悬停': 'Hang', '下落': 'Fall', '结束停留': 'End hold', '倾倒坠落': 'Tilt & fall', '基线长入': 'Grow in',
    '阶段详情': 'Phase details', '名称与起止时间': 'Labels and timing', '字倾动效时间轴': 'Type Cascade timeline',
    '时间轴播放头': 'Timeline playhead', '预览控制': 'Playback controls', '字倾效果预览': 'Type Cascade preview',
    '编辑器': 'Editor', '重播': 'Replay', '暂停': 'Pause', '播放': 'Play',
    '方案': 'Project', '保存方案': 'Save', '导入方案': 'Import', '恢复默认': 'Reset', '清理重做': 'Clear', '清空所有行': 'Clear all blocks',
    '真实导出': 'Export', '时长': 'Duration', '完整循环': 'Full cycle', '帧率': 'Frame rate',
    '输出将严格使用当前画布尺寸。': 'Exports use the selected canvas dimensions.',
    '画布尺寸': 'Canvas size', '插入到当前段落': 'Insert into this block', '插入到': 'Insert into',
    '前半句默认': 'Lead defaults', '后半句默认': 'Suffix defaults', '字重': 'Weight',
    '前后句间距': 'Lead–suffix gap', '收束起点': 'Settle start', '播放速度': 'Speed',
    '整体动效': 'Motion', '本行水平位置': 'Horizontal position', '本页停留': 'Page hold', '本页停留 / 秒': 'Page hold / s',
    '素材透明度': 'Media opacity', '染色强度': 'Tint strength', '染色颜色': 'Tint color',
    '拖动左右把手选择片段，也可输入精确秒数；预览和导出使用同一区间。': 'Drag the handles to trim the clip, or type exact seconds. Preview and export use the same range.',
    '前半句入场': 'Lead entrance', '后半句形式': 'Suffix reveal', '原有入场': 'Original entrance',
    '轻弹出现': 'Soft pop', '整体快速出现': 'Appear together', '逐字快速扫入': 'Type on',
    '向右弹出': 'Pop right', '本行动效节奏 · 独立': 'This block’s timing', '本行背景 / 元素': 'Background / media',
    '主词入场': 'Lead in', '主词停顿': 'Lead hold', '居中预备': 'Center prep', '后句接入': 'Suffix join',
    '前半句': 'Lead', '后半句': 'Suffix', '标点': 'Punctuation', '逐字扫色': 'Color sweep',
    '重新随机': 'Shuffle', '扫色快慢': 'Sweep speed', '前半句字号': 'Lead size', '后半句字号': 'Suffix size',
    '前半句字间距': 'Lead tracking', '后半句字间距': 'Suffix tracking', '前后两段间距': 'Pair gap',
    '方案已保存并下载 JSON。': 'Project saved and downloaded as JSON.',
    '已恢复默认方案。': 'Default project restored.', '方案已导入。': 'Project imported.',
    '独立段落': 'Independent block', '句组': 'Phrase pair',
    '每个色块对应后半句一个字；扫过后恢复原文字颜色。': 'Each swatch is one suffix character; color returns after the sweep.',
    '图标库': 'Icon library', '图标库侧窗': 'Icon library drawer', '右侧展开': 'Open drawer', '打开图标库': 'Open library',
    '当前文字行的图标': 'Icons for this block', '关闭图标库': 'Close icon library', '已插入图标': 'Added icons',
    '展开已选': 'Show added', '收起已选': 'Hide added', '当前候选': 'Selected asset', '请先选择图标': 'Select an icon',
    '插入到光标': 'Insert at cursor', '单图标编辑': 'Icon editor', '单独编辑': 'Edit icon', '图标': 'Icon', '返回图标库': 'Back to library',
    '所属文字行': 'Text block', '插入位置': 'Insert position', '图标大小': 'Icon size', '图标与文字间距': 'Icon–text gap',
    '水平左右位置': 'Horizontal', '垂直位置': 'Vertical', '删除这个图标': 'Remove icon', '＋ 插入': '＋ Insert',
    '上传自己的图片': 'Upload your image', '本地抠图': 'Local cutout', '上传图片 / GIF': 'Upload image / GIF',
    '适合 Logo、商品图和纯色背景图片。上传只会加入图库，不会自动插入文字。': 'For logos, product shots, and solid-color backgrounds. Uploading adds an asset to the library without inserting it.',
    '自动去除四角连通背景': 'Remove connected corner background', '容差': 'Tolerance', '边缘羽化': 'Edge feather',
    '图片在浏览器本地处理，不会上传服务器。': 'Images are processed locally in your browser and are not uploaded.',
    '我的图片': 'My images', '上传后会出现在这里，再由你决定插入哪一行。': 'Uploads appear here so you can choose where to insert them.',
    '自定义图片': 'Custom image', '可更换原图或重新抠图': 'Replace the source or run the cutout again', '更换图片': 'Replace image',
    '按当前参数重新抠图': 'Reprocess with these settings', '从图库删除这张图片': 'Delete image from library',
    '这张图片保存在当前方案中。': 'This image is stored in the current project.',
    '正在浏览器本地处理图片…': 'Processing locally in your browser…', '正在更换并处理图片…': 'Replacing and processing image…',
    '正在按当前参数重新抠图…': 'Reprocessing with the current settings…',
    '文字开头': 'Start of text', '文字末尾': 'End of text',
    '还没有插入图标。先从下方图库选择，再点击“插入到光标”。': 'Choose an icon below, then select “Insert at cursor”.',
    '方案已保存并下载 JSON。': 'Project saved and downloaded as JSON.', '方案已导入。': 'Project imported.',
    '已恢复不可变默认方案。': 'Default project restored.', '全部文字内容已清空，当前样式与画布保持不变。': 'Text cleared. Style and canvas are unchanged.',
    '目标行已经有同一个图标。': 'This block already contains that icon.', 'GIF 编码器未加载。': 'GIF encoder is not loaded.',
    '正在准备 GIF…': 'Preparing GIF…', 'GIF 已生成': 'GIF ready', '正在加载 MP4 编码器…': 'Loading MP4 encoder…',
    'MP4 已生成': 'MP4 ready', '背景视频较大，当前编辑仍可使用；请保存 JSON 方案以长期保留。': 'This video is too large to autosave. Download the JSON project to keep it.',
    '上传素材较大，当前编辑仍可使用；请下载 JSON 方案以长期保留。': 'The uploaded media is too large to autosave. Download the JSON project to keep it.',
    '文字颜色已应用到全部段落。': 'Text color applied to all blocks.',
    '背景颜色已应用到全部段落；图片、GIF 和视频保持独立。': 'Background color applied to all blocks; images, GIFs, and videos remain independent.',
    '从文字行点击“插入图标”，图库会在右侧独立打开，左栏不再上下跳动。': 'Choose “Add icon” on a block to open the library beside the canvas.',
    '水流音乐': 'Flow music', '水流播放': 'Flow play', '水流云': 'Flow cloud', '水流手表': 'Flow watch',
    '彩虹圆环': 'Rainbow ring', '动态手掌': 'Moving hand', '动态天空': 'Moving sky', '动态线云': 'Line cloud',
    '动态线云 · 透明底黑线': 'Line cloud · black / alpha', '环绕线条': 'Orbit lines', '环绕线条 · 透明底黑线': 'Orbit lines · black / alpha',
    '彩色粗线': 'Color strokes', '渐变粗条': 'Gradient bars', '流光波线': 'Glowing waves', '双层飘带': 'Twin ribbons',
    '旋转线圈': 'Spinning coil', '旋转线圈 · 透明底黑线': 'Spinning coil · black / alpha', '脉冲线束': 'Pulsing lines', '鲸鱼': 'Whale',
    '选择一段内容，在右侧编辑': 'Select a block to edit on the right',
    '主标题': 'Title', '文字': 'Text', '字体': 'Font', '字重': 'Weight',
    '文字大小': 'Size', '文字间距': 'Tracking', '文字颜色': 'Text color',
    '上传背景图片 / GIF / 视频': 'Upload image / GIF / video',
    '当前使用纯色背景': 'Solid background', '清除背景素材': 'Remove media',
    '共 27 款真实本地字体：已完整同步 SNAP 的 26 款，并新增 Archivo Black 粗黑近似字体。': '27 local fonts. The 26 SNAP fonts, plus Archivo Black.',
    '连续换色': 'Color', '颜色动效': 'Color motion', '使用颜色数量': 'Color count',
    '1 个颜色': '1 color', '2 个颜色': '2 colors', '3 个颜色': '3 colors', '4 个颜色': '4 colors',
    '颜色 A': 'Color A', '颜色 B': 'Color B', '颜色 C': 'Color C', '颜色 D': 'Color D',
    '换色速度': 'Sweep speed', '颜色停留': 'Color hold',
    '柔光扫过 · Color Sweep': 'Soft sweep', '全体同时亮 · Full Flash': 'Full flash',
    '逐字轮流亮 · Color Chase': 'Color chase', '中心向两侧亮 · Center Out': 'Center out',
    '逐字接力 · Letter Relay': 'Letter relay', '流体渐变 · Aurora Flow': 'Aurora',
    '色彩呼吸 · Color Pulse': 'Color pulse', '节奏硬切 · Beat Cut': 'Beat cut',
    '扫色严格按已启用的 A → B → C → D 顺序经过；最后一个启用颜色会作为整句统一收尾色。换色速度最高 24×，可做超级快速扫色。': 'Colors run A → B → C → D. The last color fills the line. Sweep speed goes up to 24×.',
    '图片与图标': 'Icons', '内容模式': 'Content',
    '保留文字 · 环绕收拢后只换色': 'Keep text · color only',
    '一个字切换成图标 / 图片': 'Replace one character',
    '多个字切换成图标 / 图片': 'Replace several characters',
    '文字切换图标 / 图片': 'Text becomes icons', '紧凑标题停留': 'Compact title hold',
    '中央标题与图标起步': 'Title and icons start', '文字接入 · 图标聚拢': 'Words enter · icons gather',
    '图标滞空继续流动': 'Icons keep drifting', '换色完成与复位': 'Color settles',
    '阶段详情': 'Phase details', '名称与起止时间': 'Labels and timing',
    '↻ 重播': '↻ Replay', '暂停': 'Pause', '播放': 'Play', '从头播放': 'Play from start',
    '节奏': 'Timing', '节奏细节': 'Timing details', '循环速度': 'Loop speed',
    '同时替换数量': 'Replacements at once', '每组最短时长': 'Minimum beat', '全局切换速度': 'Swap speed',
    '1 个 · 依次播放': '1 · one by one', '2 个 · 两两播放': '2 · in pairs', '3 个': '3', '4 个': '4', '全部同时': 'All at once',
    '滞空时长': 'Hang time', '慢动作速度': 'Slow-motion speed', '终点前转幅度': 'Overshoot',
    '图文同步速度': 'Sync speed', '字体靠拢速度': 'Word approach', '单对碰撞时长': 'Pair duration',
    '逐对碰撞间隔': 'Pair gap', '球体旋转速度': 'Orbit speed', '字体回归时长': 'Return time',
    '图标聚拢密度': 'Cluster density', '收拢轨迹弧度': 'Curve', '替字收尾放大': 'Final scale', '收尾放大时长': 'Scale time',
    '爆发范围': 'Burst range', '图标大小': 'Icon size', '左右文字与图标间距': 'Word spacing', '图标与文字间距': 'Icon and text spacing',
    '删除': 'Remove', '可删除': 'can remove', '单独编辑': 'Edit', '正在编辑': 'Editing',
    '聚拢图标整体水平位置': 'Cluster position',
    '阶段 1 · 开场': 'Phase 1 · Opening', '阶段 3 · 颜色结束后': 'Phase 3 · After color',
    '已选环绕图标': 'Orbit icons', '已选字体图标 / 图片': 'Letter icons',
    '展开已选': 'Show selected', '项 · 展开后拖动排序': 'items · drag to reorder',
    '＋ 添加环绕图片（可多选）': '＋ Add orbit images',
    '＋ 添加字体图片（可多选）': '＋ Add letter images',
    '＋ 添加内置透明动物图片': '＋ Add animals',
    '＋ 添加 Bot 系列动态素材': '＋ Add Bot motion',
    '＋ 添加音乐、播放、云朵、手表': '＋ Add music, play, cloud, watch',
    '圆环': 'Ring', '彩虹圆环': 'Rainbow ring', '＋ 环绕图形': '＋ Orbit shape', '＋ 字体图形': '＋ Letter shape',
    '直接这样编辑': 'Edit like this',
    '① 添加图标或图片': '1. Add an icon or image',
    '② 每一项分别设置字位、顺序、速度和停留时间': '2. Set position, order, speed, and hold for each',
    '③ “同时替换数量”决定依次播放还是并行播放': '3. Replacement count plays them in sequence or together',
    '每个字体图标可单独设置字位、顺序、速度和停留时间；停留变长时，循环会自动延长，不会截断图标。': 'Each letter icon has its own position, order, speed, and hold. A longer hold extends the loop.',
    '间距控制左右文字离图标多远；整体水平位置用负值向左、正值向右移动聚拢后的整组图标。': 'Spacing sets how far the words sit from the icons. Negative cluster position moves the group left.',
    '“字体靠拢速度”会同时缩短每一对字体的移动时间与接力间隔；单对时长和逐对间隔可继续精调。换色速度控制碰撞开始后从左向右连续扫过整句的速度。': 'Approach speed shortens each pair and the handoff. Sweep speed runs left to right after the words meet.',
    '文字、节奏、颜色、背景素材与全部图片/图标都会随方案保存。': 'Text, timing, colors, background, and icons are saved with the project.',
    '已恢复上次自动保存的方案。': 'Restored the last autosaved project.',
    '已载入最新默认示例。': 'Loaded the default example.',
    '导出': 'Export', '导出时长': 'Duration', '完整一轮': 'Full cycle', '自定义': 'Custom', '自定义秒数': 'Custom seconds',
    '帧率': 'Frame rate', 'PNG 图片': 'PNG', 'GIF 动图': 'GIF', 'MP4 视频': 'MP4',
    '导出使用与预览相同的文字、背景、图标素材和确定性时间轴。': 'Export uses the same text, background, icons, and timeline as the preview.',
    '宽': 'W', '高': 'H', '画布尺寸': 'Canvas size',
    '颜色动效结束后，多个文字位置可由不同字体图标或图片分别接管。': 'After the color, different icons can take over different characters.',
    '环绕与字体换面完成后，多个文字位置可由不同字体图标或图片分别接管。': 'After the orbit and the color, different icons can take over different characters.',
    '环绕与字体换面完成后，每个节拍只让一个文字位置切换成字体图标或图片。': 'After the orbit and the color, one character becomes an icon on each beat.',
    '环绕图标从首帧沿弧线转向聚拢；字体始终保持水平，图标消失后文字闭合并继续换色。': 'Icons arc in from the first frame. The words stay level, then close and change color.',
    '正在单独编辑': 'Editing', '关闭': 'Close', '素材类型': 'Asset type', '内置图形': 'Shape', '图片': 'Image',
    '替换字位': 'Replace character', '自动轮换': 'Auto', '图标停留时间': 'Hold',
    '图形': 'Shape', '图形颜色': 'Shape color', '星形（当前方案）': 'Star',
    '替换当前素材图片': 'Replace this image',
    '自动去除四角连通背景（保护主体内部白色）': 'Remove the connected corner background',
    '自动识别四角': 'Detect corners', '开启': 'On', '背景容差': 'Tolerance', '边缘过渡': 'Edge',
    '上传后会保留高清主体，并裁掉透明空白。': 'The upload keeps the subject and trims empty space.',
    '编辑大小': 'Size', '独立透明度': 'Opacity', '水平偏移': 'X', '垂直偏移': 'Y', '独立旋转': 'Rotate',
    '文字替换': 'Replace text', '爆发': 'Burst', '漂浮': 'Float', '环绕': 'Orbit',
    '当前动画只换色，但这里仍可预先编辑字体图标；切换为单字或多字模式后开始播放。': 'This mode only changes color. Icons edited here play after you switch to a replace mode.',
    '点一段可跳到那一拍': 'Click a phase to jump there', '编舞时间轴': 'Timeline'
  }));
  const phaseNames = ['立字开场', '结束停留', '倾倒坠落', '基线长入', '停留', '倾倒', '悬停', '下落', '主词入场', '主词停顿', '居中预备', '后句接入', '本页停留'];
  const languageButton = document.createElement('button');
  languageButton.type = 'button';
  languageButton.id = 'tcLanguageToggle';
  languageButton.className = 'tc-language-toggle';
  document.getElementById('tcThemeToggle').after(languageButton);
  let language = 'zh';
  const originals = new WeakMap();
  const excluded = 'script,style,textarea,output,.tc-row-text,#timeline small,.gm-background-video-head strong,.stg-cn-toolbar,.stg-cn-drawer,.stg-cn-backdrop';

  function translate(value, element, attribute = '') {
    const s = value.trim();
    if (!s) return value;
    let out = s;
    // These labels embed user-authored text: only translate the UI prefix.
    if (element.matches('#iconRow option')) out = s.replace(/^第 (\d+) 行 · /, 'Block $1 · ');
    else if (element.matches('#iconBoundary option')) out = dictionary.get(s) || s.replace(/^第 (\d+) 字“(.*)”之后$/, 'After character $1 “$2”');
    else if (element.matches('.tc-phase-details strong')) {
      for (const name of phaseNames) out = out.replace(new RegExp(`^(\\d+\\. )${name} · `), `$1${dictionary.get(name)} · `);
    } else if (element.matches('#timeline [data-seek-ms]') && attribute) {
      for (const name of phaseNames) if (s.startsWith(`${name} · `)) out = dictionary.get(name) + s.slice(name.length);
    } else {
      out = dictionary.get(s) || s;
      if (out === s) {
        const beat = s.match(/^(\d+)\s·\s(.+)$/);
        if (beat && dictionary.get(beat[2])) out = `${beat[1]} · ${dictionary.get(beat[2])}`;
        else if (/^\d+ 对字体逐对靠拢并同步换色$/.test(s)) out = s.replace(/^(\d+) 对字体逐对靠拢并同步换色$/, '$1 pairs meet and change color');
      }
      if (out === s) {
        out = s
          .replace(/^(\d+:\d+) (方形|竖版|全屏|横版)/, (_, ratio, kind) => `${ratio} ${{方形:'Square',竖版:'Portrait',全屏:'Portrait',横版:'Landscape'}[kind]}`)
          .replace(/^段落 (\d+)$/, 'Block $1')
          .replace(/^(\d+(?:\.\d+)?)s 停留 · (\d+) 个图标$/, (_,time,count) => `${time}s hold · ${count} ${count === '1' ? 'icon' : 'icons'}`)
          .replace(/^(\d+) 个图标$/, (_,count) => `${count} ${count === '1' ? 'icon' : 'icons'}`)
          .replace(/^位置 (\d+)$/, 'Pos. $1')
          .replace(/^第 (\d+) 行文字$/, 'Block $1 text')
          .replace(/^第 (\d+) 行停留毫秒$/, 'Block $1 hold in milliseconds')
          .replace(/^第 (\d+) 行字体$/, 'Block $1 font')
          .replace(/^第 (\d+) 行 · 边界 (\d+) · (.*?) · 间距 (.*)$/, 'Block $1 · Position $2 · $3 · Gap $4')
          .replace(/^目标：第 (\d+) 行 · /, 'Target: block $1 · ')
          .replace(/文字开头$/, 'Start of text').replace(/文字末尾$/, 'End of text').replace(/第 (\d+) 字后$/, 'After character $1')
          .replace(/^([\d.]+) 秒$/, '$1 s')
          .replace(/^(整体快速出现|逐字快速扫入|向右弹出) ([\d.]+) 秒$/, (_, kind, n) => `${{整体快速出现:'Appear together',逐字快速扫入:'Type on',向右弹出:'Pop right'}[kind]} ${n}s`)
          .replace(/^纯色 · 直接切换$/, 'Solid color · Cut')
          .replace(/^纯色 · 柔和叠化(?: ([\d.]+) 秒)?$/, (_, n) => n ? `Solid color · Crossfade ${n}s` : 'Solid color · Crossfade')
          .replace(/ · 中文$/, ' · Chinese').replace(/ · 日文$/, ' · Japanese').replace(/ · 韩文$/, ' · Korean');
        if (s.endsWith('数值')) out = `${dictionary.get(s.slice(0, -2)) || s.slice(0, -2)} value`;
        // Built-in asset names only. User-uploaded filenames are excluded above.
        const assets = [['Bot 动态图标', 'Bot motion'], ['原始图标', 'Original icons'], ['流动图标', 'Flow icons'], ['GIF 动图', 'Animated GIFs'], ['透明动物', 'Animals'], ['动态图标', 'Motion icon']];
        for (const [zh, en] of assets) out = out.replace(zh, en);
        if (attribute && /^(编辑|插入)/.test(out)) {
          const action = out.startsWith('编辑') ? 'Edit ' : 'Insert ';
          const name = out.slice(2);
          out = action + (dictionary.get(name) || name);
        }
        const status = [['字体加载失败：','Font loading failed: '], ['导入失败：','Import failed: '], ['PNG 已生成','PNG ready'], ['MP4 已生成','MP4 ready'], ['正在编码 GIF','Encoding GIF'], ['正在导出 MP4','Exporting MP4'], ['GIF 生成失败：','GIF failed: '], ['MP4 生成失败：','MP4 failed: '], ['图片处理失败：','Image processing failed: '], ['更换失败：','Replacement failed: '], ['重新处理失败：','Reprocessing failed: '], ['背景已转透明','Background removed'], ['保留原背景','Original background kept'], ['GIF 保留原动画，不执行自动抠图。','GIF animation preserved; automatic cutout was not applied.']];
        for (const [zh,en] of status) if (out.startsWith(zh)) out = en + out.slice(zh.length);
        out = out.replace(/^已将“(.*)”插入第 (\d+) 行。$/, 'Inserted “$1” into block $2.')
          .replace(/^“(.*)”已经在这一行；可在单独编辑中移动它。$/, '“$1” is already in this block. Use Edit icon to move it.')
          .replace(/^(.*) 已设为本行背景。$/, '$1 is now the background for this block.')
          .replace(/ · 已加入“我的图片”，尚未自动插入。$/, ' · Added to “My images” without inserting it.');
      }
      if (language === 'en') out = out.replace(/([\d.]+)秒/g, '$1s');
    }
    return value.replace(s, out);
  }
  function localize(node, key, element) {
    const current = key === 'text' ? node.nodeValue : node.getAttribute(key);
    if (current == null) return;
    let record = originals.get(node);
    if (!record) { record = {}; originals.set(node, record); }
    const prior = record[key];
    const source = prior && prior.last === current ? prior.source : current;
    const result = language === 'en' ? translate(source, element, key) : source;
    record[key] = { source, last: result };
    if (result !== current) {
      if (key === 'text') node.nodeValue = result;
      else node.setAttribute(key, result);
    }
  }
  function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (parent?.matches('.gm-row-background:not(.gm-row-motion) summary b') && root.nodeValue.trim() !== '纯色' && !originals.has(root)) return;
      if (parent && !parent.closest(excluded) && !parent.closest('#tcLanguageToggle')) localize(root, 'text', parent);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.matches(excluded) || root.id === 'tcLanguageToggle') return;
    for (const attribute of ['aria-label', 'title', 'placeholder']) if (root.hasAttribute(attribute)) localize(root, attribute, root);
    for (const child of root.childNodes) walk(child);
  }
  const observer = new MutationObserver(records => {
    // Translate only changed UI subtrees, never rescan the whole editor on playback ticks.
    for (const record of records) {
      if (record.target.parentElement?.closest('#timeNow,#timeTotal,.tc-time-ruler,output') || ['timeNow','timeTotal'].includes(record.target.id)) continue;
      if (record.type === 'childList') record.addedNodes.forEach(walk);
      else if (record.type === 'attributes') localize(record.target, record.attributeName, record.target);
      else walk(record.target);
    }
  });
  function setLanguage(next) {
    language = next;
    body.dataset.editorLanguage = next;
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
    languageButton.textContent = next === 'en' ? '中文' : 'EN';
    languageButton.setAttribute('aria-label', next === 'en' ? 'Switch to Chinese' : '切换为英文');
    languageButton.lang = next === 'en' ? 'zh-CN' : 'en';
    walk(body);
    const heading = document.querySelector('.tc-header h1, .gm-header h1');
    document.title = heading ? `${heading.textContent.replace(/\s+/g, ' ').trim()} | CellMotion` : document.title;
    try { localStorage.setItem('cellmotion-editor-language', next); } catch (_) { /* Optional preference. */ }
    document.dispatchEvent(new CustomEvent('tc-languagechange', { detail: { language: next } }));
  }
  languageButton.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
  let saved;
  try { saved = localStorage.getItem('cellmotion-editor-language'); } catch (_) { /* Chinese default. */ }
  setLanguage(saved === 'en' ? 'en' : 'zh');
  observer.observe(body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] });
})();
