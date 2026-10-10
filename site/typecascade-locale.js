/* Editor-only localization. Never rewrites input values, scheme data or renderer text. */
(() => {
  if (!document.body.classList.contains('tc-workspace')) return;
  const body = document.body;
  const dictionary = new Map(Object.entries({
    "柔和揭示后直接放大、展示文案、缩回原构图。扫描周期控制材质纹理的运动；总速度调节整轮节奏。每段停留保留在原构图阶段，完整循环导出包含缩回与停留。": "After the soft reveal, zoom in, show captions and return. Scan period controls the material texture; master speed adjusts the full cycle. Row hold stays before zoom. Complete-loop exports include the return and hold.",
    "拖动色块右边缘调整时长；方向键微调。共用阶段会同步调整。": "Drag the right edge to change duration; use arrow keys to fine-tune. Shared phases update together.",
    "拖动调整共用时长": "Drag to change shared duration",
    "拖动调整时长": "Drag to change duration",
    "柔和揭示时长": "Soft reveal duration",
    "首条叠加文案": "First overlay caption",
    "首条文案停留时间": "First caption hold time",
    "叠加文案": "Overlay caption",
    "叠加文案列表": "Overlay captions",
    "＋ 新增文案": "+ Add caption",
    "本条停留 / 秒": "Caption hold / seconds",
    "本条开始": "Caption starts",
    "切换下一条": "Next caption starts",
    "开始缩回": "Zoom-out starts",
    "预览这条文案": "Preview this caption",
    "文案上移": "Move caption up",
    "文案下移": "Move caption down",
    "删除文案": "Delete caption",
    "每条文案按出现、停留、淡出的顺序播放，再切换下一条；最后一条结束后缩回。每条可独立调整停留，字体与出现、淡出设置共用。每段放大时播放该序列。上方为首段内时刻，其他段落请查看时间轴。": "Each caption enters, holds and fades before the next one starts. Zoom returns after the last caption. Hold is independent; font, entrance and fade settings are shared. The sequence plays whenever a block zooms in. Times above are within the first block; use the timeline for other blocks.",
    "宣发构图": "Promo composition",
    "追加放大、文案与缩回": "Append zoom, caption and return",
    "放大时间": "Zoom-in time",
    "缩回时间": "Zoom-out time",
    "缩回后停留": "Hold after return",
    "材质放大": "Material zoom-in",
    "缩回原构图": "Return to original framing",
    "原构图停留": "Original framing hold",
    "全局叠加文案": "Global overlay caption",
    "文案字体": "Caption font",
    "文案字号": "Caption size",
    "文案颜色": "Caption color",
    "文案垂直位置": "Caption vertical position",
    "材质放大倍数": "Material zoom",
    "缩放呼吸幅度": "Zoom breathing amount",
    "放大前流动次数": "Flow cycles before zoom",
    "文案逐字出现": "Type caption letter by letter",
    "文案出现时间": "Caption entrance time",
    "文案停留时间": "Caption hold time",
    "文案淡出时间": "Caption fade time",
    "轮间空隙": "Loop gap",
    "文案出现": "Caption entrance",
    "文案逐字": "Caption typing",
    "文案停留": "Caption hold",
    "文案淡出": "Caption fade",
    "输入宣发文案，支持换行": "Enter caption; line breaks supported",
    "保留原有材质动效，再放大、展示文案、缩回原构图。扫描周期继续控制材质；总速度调节整轮节奏。每段停留保留在原构图阶段，完整循环导出包含缩回与停留。": "Keep the original material motion, then zoom in, show the caption and return to the original framing. Scan period controls material; master speed adjusts the whole cycle. Row hold stays in the original framing phase. Complete-loop exports include the return and hold.",
    "每段文字可独立停留、插入图标并设置背景。宣发构图可为流动材质叠加独立文案。": "Each row has its own hold, icons and background. Promo composition adds an independent caption over flowing material.",
    '彩铸': 'PRO SVG Lab', '彩铸编辑器': 'PRO SVG Lab editor',
    '流动材质': 'Flowing material', '色谱': 'Palette', '光谱': 'Spectrum', '冷银': 'Silver', '熔岩': 'Lava', '电离紫': 'Violet',
    '滤镜分解': 'Filter stages', '柔度': 'Softness', '颗粒': 'Grain', '扫描周期': 'Scan period', '扫描方向': 'Scan direction',
    'PRO 不区分大小写使用定制字形；其他文字沿用当前粗体、字形高度和材质尺度。选择字体可切换字形。': 'PRO uses custom outlines regardless of case; other text keeps the current bold type, visible height and material scale. Choose a font to change the outlines.',
    '首次柔和揭示': 'First soft reveal', 'PRO 使用定制字形': 'Use custom PRO outlines',
    '进一步实验': 'Further experiments', '流体置换': 'Displacement', '浮雕高光': 'Specular light',
    '柔和揭示': 'Soft reveal', '色谱流动': 'Material flow', '材质停留': 'Material hold', '背景淡化': 'Background fade',
    '时长 / 秒': 'Duration / seconds', 'SVG · 当前材质动画': 'SVG · Current material',
    '01 · 字形': '01 · Glyph', '02 · 灰度轮廓': '02 · Grayscale relief', '03 · 移动扫描': '03 · Moving scan', '04 · 柔化场': '04 · Soft field', '05 · 颗粒调制': '05 · Grain', '06 · 色谱映射': '06 · Palette mapping',
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
    '字间距': 'Letter spacing',
    'Georgia · 系统字体': 'Georgia · system font',
    '字间距按字号的百分比计算，字放大缩小都保持同样的松紧（网页上 32px 字号的 -2px ≈ -6%）。花园会自动缩放到画面 6% 的边距之内；做手机壁纸时可以把文字往下移，避开锁屏时间。': 'Letter spacing is a percentage of the type size, so it holds at any scale (-2px at 32px on a web page ≈ -6%). The garden fits inside a 6% margin. For phone wallpapers, move the type down to clear the lock-screen clock.',
    '叠加效果': 'Add-ons',
    '可叠在任何动态上，「边打边长」里也会出现': 'Works on any motion, and in Type to grow too',
    '追光光点': 'Guiding lights',
    '访客动态自带蝴蝶': 'Visitor already has butterflies',
    '追光动态自带光点': 'Reach already has lights',
    '画面背景': 'Background',
    '黑色': 'Black',
    '白色': 'White',
    '其他': 'Other',
    '黑色背景': 'Black background',
    '白色背景': 'White background',
    '其他背景颜色': 'Other background colour',
    '其他颜色': 'Other colour',
    '雪白': 'Snow',
    '白黑': 'Mono light',
    '追光 · 前半圈': 'Reach · first half', '追光 · 后半圈': 'Reach · second half',
    '蝴蝶数量': 'Butterflies',
    '光点数量': 'Lights',
    '花朵数量': 'Flowers',
    '文字始终在最前面（花不挡字）': 'Keep type in front (flowers never cover it)',
    '缓慢摇曳': 'Slow sway',
    '盛开后收回': 'Bloom, then back',
    '输入、剪断、重来': 'Type, cut, repeat',
    '一阵风扫过': 'Wind sweeps through',
    '花茎追随光点': 'Stems follow a light',
    '随机绽放后淡去': 'Random bloom, fade',
    '蝴蝶来访': 'Butterfly drops by',
    '背景 · 图片 / GIF / 视频': 'Background · image / GIF / video',
    '视频': 'Video',
    '图片': 'Image',
    '水平位置': 'Horizontal position',
    '垂直位置': 'Vertical position',
    '结束秒数': 'End (s)',
    '拖动左右把手选择片段，也可输入精确秒数；片段会在动画里循环，预览和导出使用同一区间。': 'Drag the handles to pick a clip, or type exact seconds. The clip loops under the animation, in preview and export alike.',
    '视频片段开始': 'Clip start',
    '视频片段结束': 'Clip end',
    '0.0 秒': '0.0 s',
    '输入文字 · 长出花园': 'Type · grow a garden',
    '空格 · 剪断': 'Space · cut',
    '退格 · 凋谢': 'Backspace · wither',
    '回车 · 清空': 'Enter · clear',
    '点击画布 · 放蝴蝶': 'Click canvas · release a butterfly',
    '边打边长操作说明': 'Type to grow controls',
    '字园': 'Type Garden',
    '字园编辑器': 'Type Garden editor',
    '字园效果预览': 'Type Garden preview',
    '字园动效时间轴': 'Type Garden timeline',
    '循环海报': 'Poster loop',
    '边打边长': 'Type to grow',
    '锁屏预览': 'Lock screen',
    '用这段文字做循环海报': 'Make a poster loop from this text',
    '预览模式': 'Preview mode',
    '社交与视频': 'Social & video',
    '手机壁纸': 'Phone wallpaper',
    '平板与电脑壁纸': 'Tablet & desktop wallpaper',
    '9:16 竖屏视频 · 1080 × 1920': '9:16 vertical video · 1080 × 1920',
    'iPhone 标准 · 1179 × 2556': 'iPhone · 1179 × 2556',
    '安卓 20:9 · 1080 × 2400': 'Android 20:9 · 1080 × 2400',
    '安卓 2K · 1440 × 3200': 'Android 2K · 1440 × 3200',
    '电脑 2K · 2560 × 1440': 'Desktop 2K · 2560 × 1440',
    '电脑 4K · 3840 × 2160': 'Desktop 4K · 3840 × 2160',
    '花园动态': 'Garden motion',
    '茎叶密度': 'Stem density',
    '剪断回弹': 'Cut recoil',
    '生长种子': 'Seed',
    '手绘抖动（线条轻微颤动）': 'Hand-drawn boil',
    '↻ 重新生长一片': '↻ Regrow garden',
    '循环动态': 'Loop motion',
    '配色': 'Palette',
    '自定义颜色': 'Custom colors',
    '花朵': 'Flower',
    '茎与叶': 'Stem & leaf',
    '花瓣线': 'Petal line',
    '未上传': 'None',
    '呼吸': 'Breathe',
    '生长与凋谢': 'Grow & wither',
    '打字': 'Typed',
    '阵风': 'Gust',
    '追光': 'Reach',
    '散开': 'Scatter',
    '访客': 'Visitor',
    '缓慢摇曳 · 3s': 'Slow sway · 3s',
    '盛开后收回 · 6s': 'Bloom, then back · 6s',
    '输入、剪断、重来 · 5s': 'Type, cut, repeat · 5s',
    '一阵风扫过 · 4s': 'Wind sweeps through · 4s',
    '花茎追随光点 · 6s': 'Stems follow a light · 6s',
    '随机绽放后淡去 · 6s': 'Random bloom, fade · 6s',
    '蝴蝶来访 · 7s': 'Butterfly drops by · 7s',
    '整园呼吸': 'Breathing garden',
    '逐字生长': 'Letters grow',
    '盛放停留': 'Full bloom',
    '依次凋谢': 'Wither in turn',
    '留白': 'Empty',
    '逐字输入': 'Typing',
    '剪断收尾': 'Cut and settle',
    '清屏': 'Clear',
    '静候': 'Still',
    '阵风扫过': 'Gust passes',
    '余摆回稳': 'Settle',
    '追光 · 右侧': 'Reach · right',
    '追光 · 左侧': 'Reach · left',
    '随机绽放': 'Random bloom',
    '一齐凋谢': 'Wither together',
    '蝴蝶飞入': 'Butterfly in',
    '停在花上': 'Perch',
    '换一朵花': 'Next flower',
    '再次停驻': 'Perch again',
    '飞离': 'Fly away',
    '玫瑰黑': 'Rose noir',
    '纸本': 'Paper',
    '午夜': 'Midnight',
    '柑橘': 'Citrus',
    '兰紫': 'Orchid',
    '苔绿': 'Moss',
    '番茄': 'Tomato',
    '奶油': 'Butter',
    '腮红': 'Blush',
    '黑白': 'Mono',
    '跟随配色中': 'Following palette',
    '改回跟随配色': 'Follow palette',
    '全局字体': 'Global font',
    'GIF 尺寸': 'GIF size',
    '原尺寸': 'Full size',
    '1/2（推荐，文件小）': '1/2 (recommended)',
    '1/3': '1/3',
    '2 个循环': '2 loops',
    '5 秒': '5 s',
    '10 秒': '10 s',
    '15 秒': '15 s',
    '写一行字，让花园长出来': 'Write a line and let the garden grow',
    '新的一行': 'New line',
    '每一段是一行文字，字母里都会长出花茎。空格把一个词剪断，下一个词另起一片花园。': 'Each block is one line; stems grow out of every letter. A space cuts a word, and the next word starts a new garden.',
    '插入的图标会像字母一样长出花茎。': 'Inserted icons grow stems just like letters.',
    '花园会自动缩放到画面 6% 的边距之内；做手机壁纸时可以把文字往下移，避开锁屏时间。': 'The garden fits inside a 6% margin. For phone wallpapers, move the type down to clear the lock-screen clock.',
    '在这里打字，花园会长出来': 'Type here and the garden grows',
    '全部文字': 'All text', '直接修改任意一行；点一行，下方显示这一行的设置': 'Edit any line directly; select a line to show its settings below',
    '主汉字': 'Chinese', '英文行': 'English', '副标题': 'Subtitle', '署名': 'Signature',
    '选择一个阶段，在右侧调整时长和亮度': 'Select a phase to adjust its length and brightness', '聚光': 'Spotlight', '聚光编辑器': 'Spotlight editor', '聚光效果预览': 'Spotlight preview', '聚光动效时间轴': 'Spotlight timeline',
    '光效阶段': 'Light phases', '＋ 添加停顿': '＋ Add pause', '光点亮起': 'Spark', '光球绽放': 'Orb bloom', '光球收拢': 'Orb gathers', '化为光锥': 'Becomes a cone',
    '收窄上移': 'Narrows and rises', '光柱停驻': 'Beam holds', '地面光斑': 'Floor light', '渐暗熄灭': 'Fade out', '黑场': 'Black', '停顿': 'Pause',
    '本阶段时长': 'Phase length', '本阶段亮度': 'Phase brightness', '暂停查看': 'Pause here', '▶ 从这里播放': '▶ Play from here', '恢复原片时长': 'Reset to reference timing',
    '速度与亮度': 'Speed & brightness', '整体速度': 'Overall speed', '整体亮度': 'Overall brightness', '结束后停留': 'Hold at end',
    '光的颜色与形状': 'Light colour & shape', '光球与光源': 'Orb & source', '光柱颜色': 'Beam colour', '地面光色': 'Floor light colour', '背景': 'Background',
    '光源水平位置': 'Source X', '光源最终升高': 'Final source lift', '地面位置': 'Floor position', '光芒数量': 'Rays', '光柱粗细': 'Beam width', '地面光斑宽度': 'Floor light width',
    '整体速度同时缩放所有阶段：2× 用一半时间播完，0.5× 慢放一倍。': 'Overall speed scales every phase: 2× plays in half the time, 0.5× at half speed.',
    '降临': 'Switch Drop', '降临编辑器': 'Switch Drop editor', '降临效果预览': 'Switch Drop preview', '降临动效时间轴': 'Switch Drop timeline',
    '画面内容': 'Content', '选择主体或标题，在右侧修改；灯光与节奏在「动效设置」': 'Select the subject or the title to edit it; light and timing live in Motion',
    '两行内容：主体（图标、图片或文字）和右侧标题。': 'Two blocks: the subject (icon, image or text) and the title on its right.',
    '主体': 'Subject', '标题': 'Title', '主体名称': 'Subject name', '主体文字': 'Subject text', '标题文字': 'Title text',
    '主体降临': 'Subject drops', '落点停顿': 'Settle', '关灯': 'Lights off', '开灯': 'Lights on', '关灯 · 左移': 'Lights off · slide', '开灯 · 左移': 'Lights on · slide', '左移 · 标题': 'Slide · title',
    '主体类型': 'Subject type', '图标 / 图片': 'Icon / image', '主体大小': 'Subject size', '文字主体颜色': 'Text subject colour', '关灯后轮廓光': 'Rim light after lights off',
    'Hely Logo 关灯后切换夜光版本': 'Hely Logo switches to its glow version in the dark', '夜光强度': 'Glow strength', '主体图片': 'Subject image', '上传图片': 'Upload image',
    '上传时自动去背景并裁掉透明空白': 'Remove background and trim transparent edges on upload',
    '图片只在浏览器本地处理，不会上传到服务器。关灯后，普通图片会留下一圈轮廓光，Hely Logo 换成夜光版本。': 'Images are processed locally in your browser. In the dark, images keep a rim light and the Hely Logo switches to its glow version.',
    '手表': 'Watch', '闪电': 'Bolt', '播放': 'Play', '云朵': 'Cloud',
    '字号': 'Size', '与主体间距': 'Gap to subject', '字距': 'Tracking', '字重': 'Weight', '文字颜色': 'Text colour', '标点颜色': 'Punctuation colour',
    '标题在主体左移时从右侧弹出，字体在「动效设置 → 标题字体」里换。关灯时标题用浅色，开灯时用深色。': 'The title pops out as the subject slides left; change its font under Motion → Title font. Lights off uses a light title, lights on a dark one.',
    '灯光开关': 'Light switch', '方向': 'Direction', '关灯 · 亮 → 黑': 'Lights off · lit → black', '开灯 · 黑 → 亮': 'Lights on · black → lit',
    '开关曲线': 'Switch curve', '慢入快出 · 关灯（原片）': 'Slow in, fast out · lights off (reference)', '平衡丝滑': 'Balanced', '快速开关': 'Snappy',
    '光的形态': 'Light shape', '聚光收拢 · 四周先暗（原片）': 'Spot closes · edges first (reference)', '整屏均匀变暗': 'Even dim',
    '开关时长': 'Switch length', '相对左移延后': 'Delay after slide starts', '亮灯时四周暗角': 'Lit vignette', '亮灯背景': 'Lit background', '关灯后颜色': 'Dark colour',
    '关灯时四周先暗、光往中间收，越暗越快，最后一下黑掉。「光源收拢」越大，中间那团光越明显；100% 为原片。': 'Edges go dark first and the light gathers to the centre, faster and faster, then cuts to black. Higher Light gather makes the central pool stronger; 100% matches the reference.', '光源收拢': 'Light gather',
    '速度与节奏': 'Speed & timing', '下降时长': 'Drop length', '开始高度': 'Start height', '落点高度': 'Landing height', '下降惯性': 'Drop overshoot', '到底停顿': 'Settle',
    '左移时长': 'Slide length', '标题延后': 'Title delay', '标题弹出': 'Title pop', '标题弹性': 'Title spring', '结束定格': 'Final hold', '标题字体': 'Title font', '字体': 'Font', '标题颜色': 'Title colour',
    '背景图片或视频处在灯光下，关灯时会和主体一起暗下去。': 'A background image or video sits under the light and goes dark with the subject.',
    '按参考视频逐帧测得的 9 个阶段。每个阶段可改名称、时长和亮度；“添加停顿”会把画面停在上一阶段的结尾。': 'Nine phases measured frame by frame from the reference. Rename, retime or dim any phase; Add pause holds the end of the previous phase.',
    '阶段已恢复为原片节奏；颜色、形状和画布保持不变。': 'Phases restored to the reference timing; colours, shape and canvas unchanged.',
    '城市字塔编辑器': 'City Stack editor', '城市字塔效果预览': 'City Stack preview', '城市字塔动效时间轴': 'City Stack timeline',
    '本行类型': 'Block role', '主汉字 · 逐字点亮': 'Chinese · per character', '英文行 · 整行点亮': 'English · whole line',
    '副标题 · 两端先亮': 'Subtitle · ends first', '署名 · 最后淡入': 'Signature · fade in',
    '本行字重': 'Block weight', '字体默认': 'Font default', 'Bold 750 · 原片': 'Bold 750 · reference',
    '原片字形': 'Reference lettering', '原片字形 · 只在香港': 'Reference lettering · 只在香港',
    '本行排版': 'Block layout', '字号 / 比例 / 间距': 'Size / scale / spacing', '字号': 'Size', '纵向比例': 'Vertical scale',
    '行宽比例': 'Width ratio', '与上一行间距': 'Gap above', '本行点亮节奏': 'Block lighting', '亮起 / 熄灭': 'On / off',
    '淡入开始 / 时长': 'Fade start / length', '亮起时间': 'On times', '熄灭区间': 'Off windows', '淡入开始': 'Fade start', '淡入时长': 'Fade length',
    '▶ 预览本行点亮': '▶ Preview this block', '统一行宽': 'Shared line width', '整体大小': 'Overall size', '点亮节奏': 'Lighting rhythm',
    '开始出现': 'Lead-in', '完成后停留': 'Final hold', '画面背景': 'Background', '背景 · 图片 / GIF': 'Background · image / GIF',
    '素材不透明度': 'Media opacity', '画面缩放': 'Media zoom', '新段落默认文字色': 'Default text color for new blocks', '字塔文字': 'Tower text',
    '至少保留一行文字': 'Keep at least one block',
    '每一段是字塔中的一行：主汉字逐字点亮、英文整行点亮、副标题两端先亮、署名最后淡入。': 'Each block is one line of the tower: Chinese lights per character, English per line, the subtitle from both ends, and the signature fades in last.',
    '统一行宽让各行左右边缘对齐；每行可在“本行排版”里设置自己的行宽比例，设为 0 则保持字体原宽。': 'The shared line width aligns every block edge. Set a per-block width ratio in Block layout; 0 keeps the natural width.',
    '按 HK 原片逐帧测得：每一项硬切亮起，在熄灭区间整项消失，之后常亮。每行的亮起时间与熄灭区间在“本行点亮节奏”里单独调整。': 'Measured frame by frame from the HK reference: each unit cuts on, disappears inside its off windows, then stays lit. Edit each block in Block lighting.',
    '行宽比例按“统一行宽”计算，100% 时与其它行左右对齐；设为 0 保持字体原宽。': 'Width ratio is relative to the shared line width; 100% aligns with other blocks, 0 keeps the natural width.',
    '时间从“开始出现”之后算起；淡入为先快后慢，与原片署名一致。': 'Times count from the lead-in. The fade eases out like the reference signature.',
    '全部文字内容已清空，每行的字体、颜色、排版与节奏保持不变。': 'All text cleared; fonts, colors, layout and rhythm stay unchanged.',
    '文字颜色已应用到全部段落。': 'Text color applied to all blocks.',
    '汉字点亮': 'Chinese on', '英文点亮': 'English on', '副标题点亮': 'Subtitle on', '署名淡入': 'Signature fade', '结果定格': 'Final lockup', '完整字塔': 'Full tower',
    '萌发开场': 'Sprout intro', '缩放生长': 'Scale grow', '雾凝开场': 'Mist intro', '升散浮入': 'Lift in',
    '用于 AI': 'For AI',
    'CellMotion 首页': 'CellMotion home',
    '让创意，自由生长': 'Let creativity grow freely', '动效库': 'Effects', '导出作品': 'Export',
    '☀ 浅色': '☀ Light', '☾ 深色': '☾ Dark', '切换为浅色编辑器': 'Switch to light theme', '切换为深色编辑器': 'Switch to dark theme',
    '▧ 铺满背景': '▧ Fill backdrop', '开启背景铺满': 'Enable full backdrop', '关闭背景铺满': 'Disable full backdrop',
    '内容': 'Content', '当前编辑': 'Selected', '文字与画面': 'Text & canvas', '动效': 'Motion',
    '文字段落': 'Text blocks', '＋ 添加段落': '＋ Add', '添加文字段落': 'Add text block', '选择一段文字，在右侧编辑': 'Select a block to edit on the right',
    '选择文字段落': 'Select a text block', '段落导航': 'Text navigation', '当前段落': 'Text block', '动效设置': 'Motion',
    '属性分类': 'Settings tabs', '导出': 'Export', '画布预览': 'Preview', '画布与播放': 'Canvas and playback',
    '预设': 'Preset', '自定义': 'Custom', '宽度': 'Width', '高度': 'Height', '停留 / 毫秒': 'Hold / ms', '编辑与预览尺寸': 'Edit and preview dimensions', 'Edit and preview dimensions': '编辑与预览尺寸',
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
    '间距越大，左右文字离中间图标越远。下面可以直接增加或删除当前示例里的图标。': 'More spacing moves the words farther from the center icon. Add or remove icons below.',
    '＋ 添加': '＋ Add', '图标布局细节': 'Icon layout', '图标爆发编舞时间轴': 'Icon Burst timeline',
    '字内预告': 'Text preview', '标题起步': 'Title Rise', '图标聚拢': 'Icon Gather',
    '滞空': 'Hover', '对字靠拢': 'Pairs Close', '颜色扫过': 'Color Sweep',
    '文字复位': 'Text Return', '图标替字': 'Icon Swap', '成品停留': 'Final Hold',
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
    '节奏': 'Timing', '节奏细节': 'Timing details', '悬停与轨迹': 'Hover and trajectory',
    '文字碰撞与复位': 'Text collision and return', '图标收拢与收尾': 'Icon gathering and finish', '循环速度': 'Loop speed',
    '同时替换数量': 'Replacements at once', '每组最短时长': 'Minimum beat', '全局切换速度': 'Swap speed',
    '1 个 · 依次播放': '1 · one by one', '2 个 · 两两播放': '2 · in pairs', '3 个': '3', '4 个': '4', '全部同时': 'All at once',
    '滞空时长': 'Hang time', '慢动作速度': 'Slow-motion speed', '终点前转幅度': 'Overshoot',
    '开场图标聚拢速度': 'Opening gather speed',
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
    '正在单独编辑': 'Editing', '只改这一张': 'This icon only',
    '大小、透明度和位置只作用于这一张图标，不会改文字，也不会改其他图标。': 'Size, opacity, and position change this icon only.',
    '替换哪个字': 'Which character', '这一张停留': 'Hold', '这一张的大小': 'This icon’s size',
    '这一张的透明度': 'Opacity', '左右位置': 'Left / right', '上下位置': 'Up / down', '旋转': 'Rotate',
    '更多': 'More', '换成另一张图片': 'Replace image', '去掉白底': 'Remove white background',
    '白底颜色': 'Background color', '只去掉图片四个角连着的底色': 'Only the background touching the corners',
    '去白底的力度': 'Removal strength', '边缘柔和': 'Soft edge',
    '停在字上': 'Stay on the letter', '轻轻上下浮': 'Float', '向外炸开': 'Burst', '原地打转': 'Spin',
    '替换成字之后': 'After it replaces a letter', '关闭': 'Close', '素材类型': 'Asset type', '内置图形': 'Shape', '图片': 'Image',
    '替换字位': 'Replace character', '自动轮换': 'Auto', '图标停留时间': 'Hold',
    '图形': 'Shape', '图形颜色': 'Shape color', '星形（当前方案）': 'Star',
    '替换当前素材图片': 'Replace this image',
    '自动去除四角连通背景（保护主体内部白色）': 'Remove the connected corner background',
    '自动识别四角': 'Detect corners', '开启': 'On', '背景容差': 'Tolerance', '边缘过渡': 'Edge',
    '上传后会保留高清主体，并裁掉透明空白。': 'The upload keeps the subject and trims empty space.',
    '编辑大小': 'Size', '独立透明度': 'Opacity', '水平偏移': 'X', '垂直偏移': 'Y', '独立旋转': 'Rotate',
    '文字替换': 'Replace text', '爆发': 'Burst', '漂浮': 'Float', '环绕': 'Orbit',
    '当前动画只换色，但这里仍可预先编辑字体图标；切换为单字或多字模式后开始播放。': 'This mode only changes color. Icons edited here play after you switch to a replace mode.',
    '点一段可跳到那一拍': 'Click a phase to jump there', '编舞时间轴': 'Timeline',
    // 无重力翻转
    "素材": "Assets", "片名与底色": "Title & base color", "片名": "Title", "片名字体": "Title font", "底色": "Base color",
    "结尾切黑出片名": "End on a black title card", "翻转主体": "Flip subject", "上传主体图": "Upload subject", "透明底 PNG 效果最好；白底图会自动抠掉连通的底色。系统根据轮廓自动生成厚度、侧面和背面。": "Transparent PNGs work best; a plain connected background is removed automatically. Thickness, sides and back are generated from the outline.",
    "爆炸拆解": "Exploded view", "开场爆炸": "Explode at start", "主体按切线拆成前壳、后壳、两侧和底部，在空间里飞散后真实拼回。拖动图上的切线调整拆法。": "The subject splits along the cut lines into front, back, sides and base, flies apart in 3D and reassembles. Drag the lines to change the split.", "拆出两侧（紫线）": "Split sides (purple)",
    "拆出底部（青线）": "Split base (teal)", "内部结构": "Inner parts", "来自爆炸图，合拢时被外壳吞进去": "from the exploded image, swallowed by the shell", "上传爆炸图": "Upload exploded image",
    "不用爆炸图": "No exploded image", "系统按空白缝自动切出零件，点亮的零件会插在前后壳之间。": "Parts are cut automatically at blank gaps; highlighted parts sit between the shells.", "未使用爆炸图：开场只拆主体外壳。上传爆炸图可加入内部结构。": "No exploded image: only the shell splits. Upload one to add inner parts.", "正在切分爆炸图…": "Cutting the exploded image…",
    "展厅背景": "Backdrop", "上传全景图": "Upload panorama", "恢复默认展厅": "Restore default hall", "用越宽的图，镜头横移越有空间感。": "Wider images give the camera pan more room.",
    "收尾切换": "Ending cuts", "翻转回正后按顺序硬切；拖动或 Alt + ↑↓ 调整顺序。": "After the flip settles, images cut in order; drag or press Alt + ↑↓ to reorder.", "最后切回主体": "End on the subject", "文物素材": "Objects",
    "选择后再添加": "Select, then add", "素材库": "Library", "添加所选": "Add selected", "上传图片": "Upload images",
    "插入": "Insert", "爆炸与合拢": "Explode & assemble", "散开距离": "Spread", "仰角": "Low angle",
    "广角开场": "Wide-angle start", "圈数": "Turns", "翻转时长": "Flip duration", "回正余晃": "Settle sway",
    "主体厚度": "Thickness", "镜头与灯光": "Camera & light", "背景推移": "Background pan", "推移方向": "Pan direction",
    "从左到右": "Left to right", "从右到左": "Right to left", "背景虚化": "Background blur", "关灯": "Lights down",
    "边缘反光": "Rim light", "地面倒影": "Floor reflection", "主体大小": "Subject size", "收尾节奏": "Ending rhythm",
    "首次切换前停留": "Hold before first cut", "切换间隔": "Cut interval", "越切越快": "Speed-up", "最后一张停留": "Last image hold",
    "片名时长": "Title duration", "完整一遍": "Full loop", "输出严格使用当前画布尺寸；GIF / MP4 带运动模糊。": "Output uses the exact canvas size; GIF / MP4 include motion blur.", "水平位置": "Horizontal",
    "画面已停在这件素材上，调整会立即生效。": "Paused on this image; changes apply immediately.", "正在生成立体效果…": "Building 3D…", "当前素材": "Assets", "爆炸拆开": "Explode",
    "回正关灯": "Settle & lights down", "回到主体": "Back to subject", "爆炸拆解 → 合拢 → 翻转 → 关灯 → 收尾切换 → 片名。右侧「当前素材」换主体、爆炸图、背景和切换素材": "Explode → assemble → flip → lights down → ending cuts → title. Use “Assets” on the right to change the subject, exploded image, backdrop and cuts.", "选择翻转主体": "Choose the flip subject",
    "拖动切线调整拆解位置": "Drag the cut lines", "选择作为内部结构的零件": "Choose inner parts", "单独编辑切换素材": "Edit one cut image", "青铜人头像 · 平顶": "Bronze head · flat top",
    "青铜人头像 · 圆顶": "Bronze head · round top", "青铜器 · 兽耳": "Bronze vessel", "青铜神树": "Bronze tree", "青铜铃": "Bronze bell",
    "大小": "Size"
  }));
  const phaseNames = ['爆炸拆开', '回正关灯', '片名', '汉字点亮', '英文点亮', '副标题点亮', '署名淡入', '结果定格', '立字开场', '结束停留', '倾倒坠落', '基线长入', '停留', '倾倒', '悬停', '下落', '主词入场', '主词停顿', '居中预备', '后句接入', '本页停留'];
  const languageButton = document.createElement('button');
  languageButton.type = 'button';
  languageButton.id = 'tcLanguageToggle';
  languageButton.className = 'tc-language-toggle';
  document.getElementById('tcThemeToggle').after(languageButton);
  let language = 'zh';
  const originals = new WeakMap();
  const excluded = 'script,style,textarea,output,.site-preferences,.tc-row-text,#timeline small,.gm-background-video-head strong,.stg-cn-toolbar,.stg-cn-drawer,.stg-cn-backdrop';

  function translate(value, element, attribute = '') {
    const s = value.trim();
    if (!s) return value;
    let out = s;
    // These labels embed user-authored text: only translate the UI prefix.
    if (element.matches('.ib-choreo-block') && attribute === 'title') {
      const title = s.match(/^(.+?) · (.+?) · ([\d.]+)秒$/);
      out = title ? `${title[2]} · ${title[3]}s` : s;
    } else if (element.matches('.ib-layer-title-copy small') && s === '项') {
      out = Number(element.querySelector('b')?.textContent || 0) === 1 ? 'item' : 'items';
    } else if (element.matches('#iconRow option')) out = s.replace(/^第 (\d+) 行 · /, 'Block $1 · ');
    else if (element.matches('#iconBoundary option')) out = dictionary.get(s) || s.replace(/^第 (\d+) 字“(.*)”之后$/, 'After character $1 “$2”');
    else if (element.matches('.tc-phase-details strong')) {
      for (const name of phaseNames) out = out.replace(new RegExp(`^(\\d+\\. )${name} · `), `$1${dictionary.get(name)} · `);
    } else if (element.matches('#timeline [data-seek-ms]') && attribute) {
      for (const name of phaseNames) if (s.startsWith(`${name} · `)) out = dictionary.get(name) + s.slice(name.length);
    } else {
      out = dictionary.get(s) || s;
      if (out === s) {
        const itemCount = s.match(/^(\d+)\s*项$/);
        const beat = s.match(/^(\d+)\s·\s(.+)$/);
        if (itemCount) out = `${itemCount[1]} ${itemCount[1] === '1' ? 'item' : 'items'}`;
        else if (/^\d+ [只个]$/.test(s)) out = s.replace(/ [只个]$/, '');
        else if (beat && dictionary.get(beat[2])) out = `${beat[1]} · ${dictionary.get(beat[2])}`;
        else if (/^\d+ 对字体逐对靠拢并同步换色$/.test(s)) out = s.replace(/^(\d+) 对字体逐对靠拢并同步换色$/, '$1 pairs meet and change color');
      }
      if (out === s) {
        out = s
          .replace(/^(\d+:\d+) (方形|竖版|全屏|横版)/, (_, ratio, kind) => `${ratio} ${{方形:'Square',竖版:'Portrait',全屏:'Portrait',横版:'Landscape'}[kind]}`)
          .replace(/^段落 (\d+)$/, 'Block $1')
          .replace(/^阶段 (\d+)$/, 'Phase $1')
          .replace(/^动物 (\d+)$/, 'Animal $1')
          .replace(/^文字 · (.+)$/, 'Text · $1')
          .replace(/^图片 · (.+)$/, 'Image · $1')
          .replace(/^(\d+(?:\.\d+)?)s 停留 · (\d+) 个图标$/, (_,time,count) => `${time}s hold · ${count} ${count === '1' ? 'icon' : 'icons'}`)
          .replace(/^(\d+) 个图标$/, (_,count) => `${count} ${count === '1' ? 'icon' : 'icons'}`)
          .replace(/^位置 (\d+)$/, 'Pos. $1')
          .replace(/^第 (\d+) 行文字$/, 'Block $1 text')
          .replace(/^第 (\d+) 行停留毫秒$/, 'Block $1 hold in milliseconds')
          .replace(/^第 (\d+) 行字体$/, 'Block $1 font')
          .replace(/^第 (\d+) 行类型$/, 'Block $1 role')
          .replace(/^第 (\d+) 行字重$/, 'Block $1 weight')
          .replace(/^(\d+) 个点亮单位$/, (_, count) => `${count} ${count === '1' ? 'unit' : 'units'}`)
          .replace(/^本行点亮单位：(.*?)。时间从“开始出现”之后算起；熄灭区间里整项消失，例如 100-233 表示亮起 0.10 秒后熄灭到 0.233 秒。$/, 'Units: $1. Times count from the lead-in; a unit disappears inside its off windows, e.g. 100-233 turns off from 0.10 s to 0.233 s after it lights.')
          .replace(/^(主汉字|英文行|副标题|署名) · (原片字形|.*?) · ([\d.]+)–([\d.]+)s$/, (_, role, font, a, b) => `${{主汉字:'Chinese',英文行:'English',副标题:'Subtitle',署名:'Signature'}[role]} · ${font === '原片字形' ? 'Reference lettering' : font} · ${a}–${b}s`)
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
