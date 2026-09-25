"""Build the static, offline locale dictionary used by all CellMotion pages."""
from __future__ import annotations

import json
import re
import ast
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CJK = re.compile(r"[\u3400-\u9fff]")
PAIR = re.compile(r"'((?:\\.|[^'\\])*)'\s*:\s*'((?:\\.|[^'\\])*)'")


class VisibleTextAudit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.strings: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "svg", "code", "pre"}:
            self.hidden += 1
        for name, value in attrs:
            if name in {"aria-label", "title", "placeholder", "alt"} and value:
                self.strings.append(value.strip())

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "code", "pre"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        value = re.sub(r"\s+", " ", data).strip()
        if value and not self.hidden:
            self.strings.append(value)


def js_unquote(value: str) -> str:
    return json.loads('"' + value.replace('"', '\\"') + '"')


def dictionary_pairs(path: Path):
    source = path.read_text(encoding="utf-8")
    marker = "Object.entries({"
    start = source.find(marker)
    if start < 0:
        return
    start += len(marker)
    end = source.find("}));", start)
    if end < 0:
        return
    for match in PAIR.finditer(source[start:end]):
        left, right = map(js_unquote, match.groups())
        if not left.strip() or not right.strip() or left == right:
            continue
        if CJK.search(left) and not CJK.search(right):
            yield left, right
        elif CJK.search(right) and not CJK.search(left):
            yield right, left


def main() -> None:
    translations: dict[str, str] = {}
    for source in (SITE / "stg-cn.js", SITE / "typecascade-locale.js"):
        for chinese, english in dictionary_pairs(source):
            translations[chinese] = english
            translations[english] = chinese

    legacy = ast.parse((ROOT / "translate_js.py").read_text(encoding="utf-8"))
    for statement in legacy.body:
        if isinstance(statement, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "M" for target in statement.targets):
            for english, chinese in ast.literal_eval(statement.value).items():
                translations[english] = chinese
                translations.setdefault(chinese, english)
            break

    copy = {
        "跳到内容": "Skip to content", "组件库": "Components", "浏览组件库": "Browse components", "精选动效": "Featured effects",
        "成片案例": "Showcase", "打开编辑器": "Open editor", "联系": "Contact",
        "简体中文": "简体中文", "编辑这个动效 ↗": "Edit this effect ↗",
        "让创意，自由生长": "Let creativity grow freely", "让创意，自由生长。": "Let creativity grow freely.",
        "可编辑的动效，用于视频创作与网页表达。": "Editable motion for video creation and the web.",
        "从这里，开始创作": "Start creating here", "从这里，开始创作。": "Start creating here.",
        "一个动效，一个独立工作台。先完成你的片段，再使用编辑器提供的导出功能。": "Each effect has its own workspace. Finish your clip, then export it from the editor.",
        "当前是单动效编辑入口，轻量视频拼接器尚未开放。": "Each workspace edits one effect at a time. The lightweight video assembler is not available yet.",
        "选择工作台": "Choose a workspace", "36 个动效": "36 effects", "更多编辑器 ↓": "More editors ↓",
        "THE EDITOR / YOUR CREATIVE SPACE": "THE EDITOR / YOUR CREATIVE SPACE", "效果": "Effects", "全部动效": "All effects",
        "搜索动效": "Search effects", "选择动效编辑器": "Choose an effect editor", "回到顶部 ↑": "Back to top ↑",
        "暂停品牌视频": "Pause brand film", "播放品牌视频": "Play brand film", "暂停轮转": "Pause motion reel",
        "开始轮转": "Play motion reel", "正在载入动效": "Loading effect", "下一项": "Next", "上一项": "Previous",
        "联系 / 合作 / 咨询": "Contact / Collaboration / Inquiries", "合作、咨询，或只是打个招呼。": "For collaboration, questions, or just to say hello.",
        "CellMotion 还在持续更新。欢迎提 bug、提想法，也欢迎合作和咨询。": "CellMotion is still evolving. Bug reports, ideas, collaboration, and inquiries are welcome.",
        "CellMotion — 让创意，自由生长。": "CellMotion — Let creativity grow freely.",
        "01 / SELECTED MOTIONS": "01 / 精选动效", "LIVE PREVIEW": "实时预览", "02 / MADE OF MOTION": "02 / 动效成片",
        "03 / THE MOTION LIBRARY": "03 / 动效库", "YOUR NEXT MOVE": "下一步", "CASE 01": "案例 01", "CASE 02": "案例 02", "CASE 03": "案例 03",
        "CREATE A VIDEO": "创作视频", "BUILD FOR THE WEB": "构建网页动效", "图标爆发编辑器": "Icon Burst editor", "And let design grow.": "让设计持续生长。",
        "不止看见一个效果，": "See more than one effect,", "也看见它们在一起的可能。": "and imagine what they can become together.",
        "独立的动效，无限的组合。": "Independent motions, endless combinations.", "一个动效，一种表达。": "One motion, one expression.",
        "一个动效，一种表达": "One motion, one expression", "找到你的运动语言": "Find your motion language",
        "THE EDITOR / YOUR CREATIVE SPACE": "编辑器 / 你的创作空间", "THE MOTION LIBRARY": "动效库", "SELECTED MOTIONS": "精选动效",
        "Made of motion": "由动效构成", "实时预览": "Live preview", "案例 01": "CASE 01", "案例 02": "CASE 02", "案例 03": "CASE 03",
        "创作视频": "Create a video", "构建网页动效": "Build for the web", "让设计持续生长。": "And let design grow.",
        "独立的动效，无限的组合。": "Independent motions, endless combinations.", "一个动效，一种表达。": "One motion, one expression.",
        "制作视频": "Make a video", "浏览组件": "Browse components", "向下浏览动效": "Scroll to explore motion",
        "独立的动效，无限的组合。": "Independent motions, endless combinations.", "一个动效，一种表达。": "One motion, one expression.",
        "浏览全部": "Browse all", "精选序列": "Featured sequence", "完整播放 · 依次呈现": "Play in full · in sequence",
        "点击选择后停止自动轮换。": "Select an effect to stop autoplay.", "每一种运动，都值得被看清。": "Every motion deserves a closer look.",
        "逐字生长变形": "Letters grow and transform", "精选预览": "Featured preview", "自动轮播": "Autoplay",
        "找到你的运动语言": "Find your motion language", "找到你的运动语言。": "Find your motion language.",
        "从文字到图形，从一段运动到完整表达。按内容寻找，也按用途选择。": "From type to graphics, from a single movement to a complete expression. Browse by content or by purpose.",
        "进入组件库": "Explore the library", "文字排版": "Typography", "图标与图形": "Icons & shapes", "图片与媒体": "Images & media",
        "流动与路径": "Flow & paths", "立体空间": "3D space", "物理粒子": "Physics & particles", "待上新": "Coming soon",
        "文字到图形，从一段运动到完整表达。按内容寻找，也按用途选择。": "From type to graphics, from a single movement to a complete expression. Browse by content or by purpose.",
        "CREATE A VIDEO": "创作视频", "BUILD FOR THE WEB": "构建网页动效", "图标爆发编辑器": "Icon Burst editor", "构建网页动效 · 规划中": "Build for the web · In development",
        "移动 · 连接 · 重组 · 生长": "MOVE · CONNECT · RECOMBINE · GROW",
        "MOVE · CONNECT · RECOMBINE · GROW": "移动 · 连接 · 重组 · 生长", "编辑动效，创作视频": "Edit motion. Make video.",
        "改文字、配图标、调节奏，从一个片段开始。": "Change the text, add icons, tune the timing. Start with one scene.",
        "BUILD FOR THE WEB": "构建网页动效",
        "规划中": "In development", "把运动带进网页": "Bring motion to the web",
        "查看网页组件适配计划，与视频创作分开标注。": "See the web component roadmap, separate from video creation.",
        "把「如果」变成「这样」。": "Turn “what if” into “this.”", "选一个动效，换上你的文字、图标和节奏。": "Choose an effect, then add your text, icons, and timing.",
        "进入编辑器目录": "Browse editors",
        "基于 Space Type Generator 等开源项目持续创作 · 保留原作署名与许可": "Built on open-source projects including Space Type Generator · Original credits and licenses retained",
        "正在载入动效": "Loading effect", "动效目录加载失败，请刷新页面重试。": "The effects catalog failed to load. Refresh and try again.",
        "打开字芽编辑器": "Open Sprout Shift editor", "打开图标爆发编辑器": "Open Icon Burst editor", "打开流彩笔迹编辑器": "Open Ribbon Ink editor",
        "字芽编辑器": "Sprout Shift editor", "字芽 Sprout Shift": "Sprout Shift", "字倾 Type Cascade": "Type Cascade",
        "点解 Dot Resolve": "Dot Resolve", "字融 Glyph Morph": "Glyph Morph", "图标爆发 Icon Burst": "Icon Burst", "轨书 Path Writer": "Path Writer",
        "编辑字芽": "Edit Sprout Shift", "编辑图标爆发": "Edit Icon Burst", "编辑快门对比": "Edit Shutter After",
        "编辑水流": "Edit Water Flow", "编辑冲击接句": "Edit Impact Build", "编辑轨书": "Edit Path Writer",
        "快门对比 Shutter After": "Shutter After", "水流 Water Flow": "Water Flow", "冲击接句 Impact Build": "Impact Build", "轨书 Path Writer": "Path Writer",
        "播放精选预览": "Play featured preview", "播放或暂停字芽预览": "Play or pause Sprout Shift preview",
        "独立动效": "Independent motions", "无限组合": "Endless combinations", "CASE": "CASE",
        "左右滑动，查看三个案例": "Swipe to view all three cases", "三个真实动效视频案例": "Three real motion video examples",
        "逐字生长变形": "Letters grow and transform", "精选序列": "Featured sequence", "完整播放": "Full playback",
        "依次呈现": "In sequence", "精选序列 完整播放": "Featured sequence · Full playback",
        "找到你的运动语言。": "Find your motion language.", "从文字到图形": "From type to graphics",
        "把运动带进网页": "Bring motion to the web", "查看网页组件适配计划，与视频创作分开标注。": "See the web component roadmap, separate from video creation.",
        "选择本地视频预览": "Choose local videos to preview", "仅在本机预览，不上传。": "Preview locally. Nothing is uploaded.",
        "CellMotion 品牌视频，完整循环播放": "CellMotion brand film, looping",
        "真实成片案例一": "Real footage case 1", "真实成片案例二": "Real footage case 2", "真实成片案例三": "Real footage case 3",
        "CellMotion 品牌视频，完整循环播放": "CellMotion brand film, looping", "动效轮转展示": "Motion reel",
        "横向流动的动效预览": "A horizontal reel of motion previews", "按分类浏览组件": "Browse components by category",
        "独立成章，连接成片。": "Make a scene. Connect the story.",
        "不止看一个效果，也看见它们在一起的可能。": "See each effect on its own, then imagine what they can become together.",
        "选择本地视频预览": "Choose local videos to preview", "试试你的成片": "Preview your own videos",
        "仅在本机预览，不上传。": "Preview locally. Nothing is uploaded.", "真实成片": "Real footage",
        "暂停": "Pause", "重播": "Replay", "播放": "Play", "前后": "Before and after",
        "方案": "Presets", "保存方案": "Save preset", "导入方案": "Import preset", "恢复默认": "Reset to defaults",
        "清理重做": "Clear and redo", "保存预设": "Save preset", "导入预设": "Import preset",
        "字体": "Font", "字重": "Weight", "字号": "Font size", "字距": "Letter spacing",
        "文字颜色": "Text color", "背景颜色": "Background color", "背景色": "Background color",
        "导出": "Export", "导出作品": "Export video", "导出尺寸": "Export size", "当前画板": "Current canvas",
        "宽": "Width", "高": "Height", "宽度": "Width", "高度": "Height", "自定义尺寸": "Custom size",
        "导出 MP4": "Export MP4", "导出 GIF": "Export GIF", "GIF 动图": "Animated GIF",
        "PNG 图片": "PNG image", "时间轴": "Timeline", "时间轴控制": "Timeline controls", "播放速度": "Playback speed",
        "清空": "Clear", "清空所有": "Clear all", "删除": "Delete", "取消": "Cancel", "确定": "Confirm",
        "添加": "Add", "选择": "Select", "上传": "Upload", "关闭": "Close", "返回": "Back",
        "图标库": "Icon library", "选择图标": "Choose icons", "文字": "Text", "颜色": "Color", "参数": "Settings",
        "输入文字": "Enter text", "请输入文字": "Enter text", "预览": "Preview", "编辑器": "Editor",
        "标题": "Title", "方案已保存": "Preset saved", "已恢复默认方案": "Defaults restored",
        "正在导出": "Exporting", "字体加载失败": "Font failed to load", "加载中…": "Loading…",
        "联系 / 合作 / 咨询": "Contact / Collaboration / Inquiries",
        "合作、咨询，或是打个招呼。": "For collaboration, questions, or just to say hello.",
        "CellMotion 还在持续更新。欢迎提 bug、提想法，也欢迎合作和咨询。": "CellMotion is still evolving. Bug reports, ideas, collaboration, and inquiries are welcome.",
        "CellMotion is still being updated. Bug reports and ideas are welcome, and so are collaboration and consulting inquiries.": "CellMotion 还在持续更新。欢迎提 bug、提想法，也欢迎合作和咨询。",
        "微信": "WeChat", "复制微信号": "Copy WeChat ID", "已复制": "Copied", "复制失败": "Copy failed",
        "提交 Issue": "Open an issue", "创建 Pull Request": "Create a pull request", "贡献指南": "Contribution guide",
        "查看 GitHub 仓库": "View GitHub repository", "更多": "More", "特色案例": "Featured work",
        "加载更多": "Load more", "搜索": "Search", "搜索动效": "Search effects", "筛选": "Filter",
        "全部": "All", "最近更新": "Recently updated", "按名称排序": "Sort by name",
        "背景": "Background", "全局速度": "Overall speed", "中文渲染测试": "CJK text rendering test",
        "导出按输出画布单独排版。": "Exports are laid out for the selected canvas size.",
        "动效阶段": "Motion phases", "整体速度": "Overall speed", "左右": "Horizontal", "上下": "Vertical",
        "思源黑体 Thin": "Source Han Sans Thin", "字色": "Text color", "导出帧率": "Export frame rate",
        "大小": "Size", "音乐": "Music", "秒": "s", "参考文案": "Sample text", "多种设置": "Multiple settings",
        "中文示例": "Chinese sample", "居中": "Center", "透明度": "Opacity", "添加图片": "Add image",
        "句子": "Sentence", "常用调节": "Common adjustments", "动效时间轴": "Motion timeline",
        "画布播放控制": "Canvas playback controls", "画面播放控制": "Playback controls", "行距": "Line spacing",
        "画面": "Canvas", "背景素材": "Background media", "已选图标": "Selected icons", "字体粗细": "Font weight",
        "字体颜色": "Font color", "整体节奏": "Overall timing", "循环播放": "Loop playback", "保持": "Hold",
        "悬停": "Hover", "缩放": "Scale", "横向": "Horizontal", "纵向": "Vertical", "位置": "Position",
        "角度": "Angle", "距离": "Distance", "旋转": "Rotation", "透明": "Transparent", "纯色": "Solid color",
        "上传图片": "Upload image", "替换图片": "Replace image", "替换视频": "Replace video", "删除图片": "Delete image",
        "开始时间": "Start time", "结束时间": "End time", "持续时间": "Duration", "停留时间": "Hold time",
        "图标大小": "Icon size", "图标间距": "Icon spacing", "图标数量": "Icon count", "字体大小": "Font size",
        "文字大小": "Text size", "文字间距": "Letter spacing", "文字位置": "Text position", "字体选择": "Font selection",
        "扩展设置": "Advanced settings", "详细设置": "Detailed settings", "更多设置": "More settings",
        "播放控制": "Playback controls", "时间设置": "Timing", "尺寸设置": "Size settings", "颜色设置": "Color settings",
        "导出设置": "Export settings", "导出视频": "Export video", "导出图片": "Export image", "导出透明背景": "Export with transparent background",
        "自动": "Auto", "手动": "Manual", "开启": "On", "关闭": "Off", "启用": "Enable", "禁用": "Disable",
        "是": "Yes", "否": "No", "无": "None", "默认值": "Default", "重置参数": "Reset settings",
        "返回顶部": "Back to top", "上一帧": "Previous frame", "下一帧": "Next frame", "播放中": "Playing",
        "已暂停": "Paused", "结束": "End", "开始": "Start", "完成": "Done", "重试": "Retry",
        "导入文件": "Import file", "选择文件": "Choose file", "选择图片": "Choose image", "选择视频": "Choose video",
        "清除背景": "Remove background", "恢复背景": "Restore background", "添加图标": "Add icon", "移除图标": "Remove icon",
        "展开": "Expand", "收起": "Collapse", "上一项": "Previous", "下一项": "Next", "随机": "Random",
        "强度": "Intensity", "速度": "Speed", "间距": "Spacing", "范围": "Range", "偏移": "Offset",
        "文字内容": "Text content", "画布背景": "Canvas background", "页面背景": "Page background", "文字效果": "Text effect",
        "查看效果": "View effect", "复制链接": "Copy link", "复制成功": "Copied", "图片已加载": "Image loaded",
        "点击播放": "Click to play", "点击暂停": "Click to pause", "即将推出": "Coming soon", "开发中": "In development",
        "1:1 方形 · 1080 × 1080": "1:1 Square · 1080 × 1080", "4:5 竖版 · 1080 × 1350": "4:5 Portrait · 1080 × 1350",
        "9:16 全屏 · 1080 × 1920": "9:16 Full screen · 1080 × 1920", "16:9 横版 · 1920 × 1080": "16:9 Landscape · 1920 × 1080",
        "3:4 竖版 · 1080 × 1440": "3:4 Portrait · 1080 × 1440", "2:3 竖版 · 1080 × 1620": "2:3 Portrait · 1080 × 1620",
        "4:3 横版 · 1440 × 1080": "4:3 Landscape · 1440 × 1080", "3:2 横版 · 1620 × 1080": "3:2 Landscape · 1620 × 1080",
        "导出 9:16 MP4 · 1080 × 1920": "Export 9:16 MP4 · 1080 × 1920",
        "导出 9:16 高清视频 · 1080 × 1920": "Export 9:16 HD video · 1080 × 1920",
        "−1 帧": "−1 frame", "+1 帧": "+1 frame", "0.30秒": "0.30 s", "0.40秒": "0.40 s",
        "0.70秒": "0.70 s", "0.55秒": "0.55 s", "0.90秒": "0.90 s", "0.80秒": "0.80 s", "1.10秒": "1.10 s",
        "1.40秒": "1.40 s", "0.35秒": "0.35 s", "1.20秒": "1.20 s", "0.08秒": "0.08 s",
        "1 秒": "1 s", "2 秒": "2 s", "3 秒": "3 s", "5 秒": "5 s", "10 秒": "10 s",
        "目标：第 01 行 · 文字末尾": "Target: block 01 · End of text", "点一段可跳到该阶段": "Click a phase to jump to it",
        "上传时自动去背景并裁掉透明空白": "Automatically remove the background and trim transparent margins on upload",
        "水平位置": "Horizontal position", "Noto Sans SC · 中文": "Noto Sans SC · Chinese",
        "停住": "Hold still", "透明动物": "Transparent animals", "云朵": "Clouds", "GIF / 视频时长": "GIF / video duration",
        "静止": "Still", "项": "items", "持续": "Duration", "段末速度": "End-of-phase speed",
        "高级动效参数": "Advanced motion settings", "画板尺寸": "Canvas size", "给选中的字选择图标或表情": "Choose an icon or emoji for the selected character",
        "文字对齐": "Text alignment", "手表": "Watch", "打字": "Typing", "铺满阶段": "Fill phase",
        "阶段 2": "Phase 2", "阶段 3": "Phase 3", "阶段 4": "Phase 4", "阶段 5": "Phase 5", "进阶": "Advanced",
        "导出按输出画布单独排版，不含左侧编辑器。": "Exports are laid out for the selected canvas, excluding the editor panel.",
        "商业用途请联系": "Contact us for commercial use", "主导航": "Main navigation",
        "合作、咨询，或只是打个招呼。": "For collaboration, inquiries, or just to say hello.",
        "微信 allen_8838，扫码联系": "WeChat allen_8838 · Scan to connect", "播放视频案例": "Play video example",
        "图片 / GIF / 视频": "Image / GIF / Video", "上传背景": "Upload background", "动作节奏": "Motion timing",
        "显示图片 / 图形": "Show image / shape", "媒体层未显示": "Media layer hidden", "内容类型": "Content type",
        "方形": "Square", "三角形": "Triangle", "星形": "Star", "药丸形": "Pill",
        "插入文字位置（默认）": "Insert position for text (default)", "文字前方": "Before text", "文字后方": "After text",
        "图片附加动效": "Image entrance effect", "弹入 / Pop": "Pop", "左侧滑入": "Slide in from left",
        "底部滑入": "Slide in from bottom", "呼吸": "Pulse", "把当前图片插入光标位置": "Insert the current image at the cursor",
        "{图1}": "{Image 1}", "{图2}": "{Image 2}", "精细缩放": "Fine scale", "基线位置": "Baseline position",
        "图片与文字间距": "Image-to-text spacing", "宽高比": "Aspect ratio", "动效速度": "Motion speed",
        "精调时打开": "Enable fine adjustment", "当前素材编辑面板": "Current media settings", "光标闪烁": "Cursor blink",
        "完整显示": "Show full content", "截取中…": "Capturing…", "导出中…": "Exporting…",
        "背景颜色（默认）": "Background color (default)", "设置背景": "Set background", "恢复原图": "Restore original image",
        "文字段落": "Text blocks", "段落": "Block", "进入": "Enter", "退出": "Exit", "关键帧": "Keyframe",
        "图标轨迹": "Icon path", "位置偏移": "Position offset", "循环": "Loop", "单次": "Once", "随机播放": "Shuffle playback",
        "直接出现": "Appear instantly", "匀速": "Constant speed", "上传素材 B": "Upload asset B", "移除": "Remove",
        "覆盖图层": "Overlay layer", "最终一行": "Final line", "散开": "Scatter", "飞入": "Fly in", "整段": "Whole block",
        "横向散开": "Scatter horizontally", "Bebas Neue · 仅大写": "Bebas Neue · uppercase only", "文字上下空": "Vertical text spacing",
        "结尾熄屏": "End blackout", "电视关机式收束": "TV-style shutoff ending", "结束时添加熄屏效果": "Add a blackout at the end",
        "熄屏配色": "Blackout colors", "黑底白线": "White line on black", "白底黑线": "Black line on white",
        "熄屏时间": "Blackout timing", "熄屏后停留": "Hold after blackout", "亮线强度": "Light-line intensity",
        "熄屏底色": "Blackout background", "熄屏亮线": "Blackout line",
        "画面先压成一条亮线，再缩成亮点并完全熄灭；预览、GIF 与视频使用同一收尾。": "The image compresses to a bright line, shrinks to a point, and fades out. Preview, GIF, and video share the same ending.",
        "预览与导出": "Preview and export", "画面弹出": "Pop the image", "弹出幅度": "Pop amount", "轻微过冲": "Slight overshoot",
        "整段速度快捷选择": "Overall speed presets", "卡片圆角": "Card corner radius", "9:16 手机 · 1080 × 1920": "9:16 Phone · 1080 × 1920",
        "当前手机框": "Current phone frame", "动效分类": "Effect category", "返回首页 ↗": "Back to home ↗",
        "首词呼吸": "Lead word pulse", "逐行弹出": "Pop in line by line", "柔和滑入": "Soft slide-in", "收尾缩小": "Shrink at the end",
        "图标素材": "Icon assets", "流墙图标": "Flow wall icons", "Bot 动态表情": "Bot animated emoji",
        "PNG / JPG / SVG / GIF · 可多选": "PNG / JPG / SVG / GIF · Multiple files", "结合方式": "Composition",
        "图标素材库": "Icon library", "Bot 动态图标": "Bot animated icons", "图文间距": "Text and icon spacing",
        "内置透明动物可直接使用；上传图片在浏览器本地高清处理。": "Built-in transparent animals are ready to use. Uploaded images are processed locally in high resolution.",
        "标题接入": "Title entrance", "彩色重组": "Color recombination", "中心放大": "Center zoom", "自定义时长": "Custom duration",
        "实时预览与导出一致": "Preview matches export", "CellsMotion": "CellMotion",
        "CellMotion — 让创意，自由生长。": "CellMotion — Let creativity grow freely.",
    }
    for chinese, english in copy.items():
        translations[chinese] = english
        translations[english] = chinese
    catalog = json.loads((SITE / "cellmotion-catalog.json").read_text(encoding="utf-8"))
    for effect in catalog["effects"]:
        chinese, english = effect.get("name"), effect.get("english")
        if chinese and english:
            translations[chinese] = english
            translations[english] = chinese
    machine_file = SITE / "site-locale-machine.json"
    if machine_file.exists():
        for chinese, english in json.loads(machine_file.read_text(encoding="utf-8")).items():
            translations.setdefault(chinese, english)
            translations.setdefault(english, chinese)
    translations["简体中文"] = "简体中文"
    translations["English"] = "English"
    (SITE / "site-locale-dictionary.json").write_text(
        json.dumps(translations, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    injected = 0
    for page in SITE.rglob("*.html"):
        page_source = page.read_text(encoding="utf-8")
        relative = Path(__import__("os").path.relpath(SITE, page.parent)).as_posix()
        prefix = "" if relative == "." else relative + "/"
        stylesheet = f'<link rel="stylesheet" href="{prefix}site-preferences.css?v=20260926-17">'
        script = f'<script defer src="{prefix}site-preferences.js?v=20260926-17"></script>'
        changed = False
        if "site-preferences.css" not in page_source and re.search(r"</head\s*>", page_source, re.I):
            page_source = re.sub(r"</head\s*>", stylesheet + "\n</head>", page_source, count=1, flags=re.I)
            changed = True
        elif "site-preferences.css" in page_source:
            page_source, count = re.subn(r"site-preferences\.css(?:\?v=[^\"' ]*)?", f"site-preferences.css?v=20260926-17", page_source)
            changed |= count > 0
        if "site-preferences.js" not in page_source and re.search(r"</body\s*>", page_source, re.I):
            page_source = re.sub(r"</body\s*>", script + "\n</body>", page_source, count=1, flags=re.I)
            changed = True
        elif "site-preferences.js" in page_source:
            page_source, count = re.subn(r"site-preferences\.js(?:\?v=[^\"' ]*)?", f"site-preferences.js?v=20260926-17", page_source)
            changed |= count > 0
        if changed:
            page.write_text(page_source, encoding="utf-8", newline="")
            injected += 1
    missing = Counter()
    for page in SITE.rglob("*.html"):
        audit = VisibleTextAudit()
        audit.feed(page.read_text(encoding="utf-8"))
        for phrase in audit.strings:
            if CJK.search(phrase) and phrase not in translations:
                missing[phrase] += 1
    print(f"Wrote {len(translations):,} bidirectional phrases; enabled global preferences on {injected} pages")
    print(f"Untranslated visible Chinese phrases: {len(missing):,} unique ({sum(missing.values()):,} occurrences)")
    for phrase, count in missing.most_common(70):
        print(f"{count:>3}× {phrase}")


if __name__ == "__main__":
    main()
