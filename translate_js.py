# -*- coding: utf-8 -*-
"""Translate STG UI strings in JS files to Chinese."""
import glob, re, sys

M = {
 # TYPE / 字体
 "TYPE":"字体","TYPE COLOR":"字体颜色","Font Size":"字号","Type Size":"字号",
 "Type Color":"字体颜色","TYPE: Weight":"字重","TYPE: X-Scale":"横向缩放",
 "TYPE: Y-Scale":"纵向缩放","TYPE: Tracking":"字距","TYPE: Line Space":"行距",
 "FULL TEXT":"全文","Animation style: ":"动画风格：","Leading":"行距",
 # CYLINDER
 "CYLINDER: Radius":"圆柱半径","CYLINDER: Count":"圆柱数量",
 "CYLINDER: Rotate":"圆柱旋转","CYLINDER: Offset":"圆柱偏移",
 # WAVE
 "WAVE":"波浪","WAVE: Count":"波浪数","WAVE: Size":"波浪尺寸","WAVE: Speed":"波浪速度",
 "WAVE: Length":"波长","WAVE: Wavelength":"波长","WAVE: Slope":"倾斜",
 "WAVE: Latitude":"纬度","WAVE: Longitude":"经度","WAVE: Ripple":"涟漪",
 "WAVE: X-Scale":"横向缩放","WAVE: Y-Scale":"纵向缩放","WAVE: X Size":"横向尺寸",
 "WAVE: Y Size":"纵向尺寸",
 "WAVE: Z Size":"纵深尺寸","WAVE: Offset":"波浪偏移","WAVE: Row Offset":"行偏移",
 # GRID
 "GRID":"网格","GRID: Columns":"列数","GRID: Rows":"行数","GRID: Tracking":"字距",
 "GRID: Line Space":"行距",
 # RIBBON
 "RIBBON: Caps":"端帽","RIBBON: Count":"数量","RIBBON: Offset":"偏移",
 "RIBBON: Size":"尺寸","RIBBON: X Space":"横向间距","RIBBON: Y Space":"纵向间距",
 # SPIRAL
 "SPIRAL: Radius":"螺旋半径","SPIRAL: Spacing":"间距","SPIRAL: Spin":"旋转",
 "SPIRAL: Start":"起始",
 # AMPLITUDE
 "AMPLITUDE":"振幅","AMPLITUDE: X Axis":"X轴振幅","AMPLITUDE: Y Axis":"Y轴振幅",
 "AMPLITUDE: Z Axis":"Z轴振幅","AMPLITUDE: X Stretch":"横向拉伸",
 "AMPLITUDE: Y Stretch":"纵向拉伸",
 # CAMERA / TWEAK
 "CAMERA: X-Rotation":"相机X旋转","CAMERA: Y-Rotation":"相机Y旋转",
 "CAMERA: Z-Rotation":"相机Z旋转","CAMERA: Zoom":"相机缩放",
 "TWEAK: X Rotation":"微调X旋转","TWEAK: Y Rotation":"微调Y旋转",
 "TWEAK: Z Rotation":"微调Z旋转",
 # 操作按钮
 "Reset":"重置","Save Loop":"保存循环","Save PNG":"保存PNG","PRIDE!":"彩虹!",
 "Run":"运行","PRESETS":"预设","OFFSET":"偏移","ROTATE":"旋转","SIZE":"尺寸",
 "SPEED":"速度",
 # 颜色/背景
 "BACKGROUND":"背景","BKGD COLOR":"背景色","BKGD COLORS":"背景色","INNER":"内层",
 "Inner Width":"内宽","Inner Height":"内高","Gradient Mode":"渐变模式",
 "Mirror":"镜像","Invert":"反色","SEGMENT TOGGLES AND COLORS":"分段开关与颜色",
 # 预设名
 "Simple":"简洁","Complex":"复杂","Complex Z":"复杂Z","Crown":"皇冠",
 "Jellyfish":"水母","Weave":"编织","Zebra":"斑马","Hoops":"圆环","Amoeba":"变形虫",
 "Hourglass":"沙漏","Kitty":"小猫","Lemniscate":"无穷环","Pretzel":"蝴蝶结",
 "Star":"星星","Super":"超级","Wide":"加宽","ZZtar":"锯齿星","Spacer":"间隔",
 "Salmon":"鲑鱼","Subway":"地铁","Bricks":"砖块","Checker":"棋盘格","Circle":"圆形",
 "Columns":"列","Flat":"扁平","Grid":"网格","Harlequin":"小丑格","Mosaic":"马赛克",
 "No stripes":"无条纹","Pixel Gradient":"像素渐变","Round":"圆角","Rows":"行",
 "Stacks":"堆叠","Ticker":"跑马灯","To Space":"太空","Upward":"向上",
 "X Stretch":"横向拉伸","Z Smooth":"Z平滑",
 # 效果预设文案
 "All Yours":"属于你","Be Aggressive":"激进","Cascade":"瀑布","Cheer":"欢呼",
 "Classic":"经典","Color Sea":"色彩海","Date":"日期","Dot Spiral":"点螺旋",
 "Hopes":"希望","Just OK":"还行","Lost Time":"时光流逝","Marquee":"跑马灯",
 "Meat Space":"肉空间","Not So Good":"不太好","Not So Weird":"不太怪",
 "Old Sea":"旧海","Racer":"赛车","Speed Racer":"极速赛车","Simple Wave":"简单波浪",
 "Simple Wave 2":"简单波浪2","Simple Z":"简单Z","Sparkle":"闪烁","Web Art":"网页艺术",
 "Wow":"哇","Complexity":"复杂度","2d":"2D",
 # 通用
 "Offset":"偏移","Size":"尺寸","Speed":"速度","Rotate":"旋转","Layers ":"层数",
 "Layers":"层数","Quarter ":"四分之一","Front ":"前面","Type Color":"字体颜色",
 "Animation style":"动画风格","Type Size ":"字号",
 # 旧版画布参数与预设
 "2D":"二维","All":"全部","Alternate":"交替","Background":"背景",
 "Foreground":"前景","Camera Zoom":"相机缩放","Line space":"行距","Scale":"缩放",
 "Slope":"斜率","Tracking":"字距","Weight":"粗细","Text":"文字","SAVE":"保存",
 "MIRROR":"镜像","BKGD":"背景","B&W":"黑白","Outlines":"轮廓",
 "Segment Space":"分段间距","Segment Count":"分段数量","Type Height":"字体高度",
 "Type Stroke":"字体粗细","Ribbon Height":"丝带高度","Ribbon Stretch":"丝带拉伸",
 "Ribbon Count":"丝带数量","Ribbon Spacing":"丝带间距","Ribbon Offset":"丝带偏移",
 "Rotate X":"X轴旋转","Rotate Y":"Y轴旋转","Rotate Z":"Z轴旋转",
 "Gradient Steps":"渐变层级","Gradient 1":"渐变色一","Gradient 2":"渐变色二",
 "GRADIENT KNOTS":"渐变节点","A-Side":"正面","B-SIDE/TEXT":"背面文字",
 "B-Side Color":"背面颜色","Round Cap":"圆角端点","Strip Count":"条带数量",
 "Strip Height":"条带高度","Post Space":"段后间距","Scroll":"滚动",
 "Scroll Speed":"滚动速度","FLIP SPEED":"翻转速度","ROW FLUX":"行波动",
 "TEXT: Padding":"文字间距","TEXT: Type X":"文字横向缩放","TEXT: Type Y":"文字纵向缩放",
 "TEXT: Weight":"文字粗细","Type & Stripe adjust":"字体与条纹调整",
 "Click & drag to lay down points. Press ENTER to start a new string.":"点击拖动以放置节点，按回车开始新线条。",
 "Reset Points":"重置节点","Use to smooth form\\nafter LATITUDE (x,y)\\nor RIPPLE (z) adjust":"用于平滑纬度或涟漪调整后的形态",
 "A Banner":"旗帜","A Twist":"扭转","Barber":"理发店旋纹","Basic":"基础",
 "Beach":"海滩","Bridge":"桥接","Cola Waves":"可乐波浪","Dream-ager":"梦游者",
 "Edge Case":"边缘","Eels & wind":"鳗鱼与风","Flat Sea":"平静海面","Flux Loop":"波动循环",
 "Folds":"折叠","Guts":"内核","Hot/Cold":"冷暖","Juicy":"多汁","Link":"连接",
 "Matte":"哑光","Mixture":"混合","MOON":"月亮","Mystery":"神秘","Newsprint":"报纸",
 "Origami":"折纸","Origami 2":"折纸二","Primary":"原色","Recede":"后退",
 "River":"河流","Sea":"海面","Silos":"筒仓","Snake":"蛇形","Streamers":"飘带",
 "Stripes":"条纹","Terrace":"阶梯","Track":"轨道","Track II":"轨道二",
 "Tracks":"多轨","Vote":"投票","Whitney":"惠特尼","Yes &":"是与"
}

pat = re.compile(r"(?P<fn>createButton|text|createP|createDiv|createSpan)\s*\(\s*(?P<q>['\"])(?P<key>[^'\"]{1,80})(?P=q)")

SKIP_NAMES = {"gif.worker.js", "CCapture.all.min.js"}

count = 0
for f in glob.glob("**/*.js", recursive=True):
    normalized_path = f.replace("\\", "/")
    if normalized_path.startswith("js/") or normalized_path.endswith(".min.js") or normalized_path.split("/")[-1] in SKIP_NAMES:
        continue
    s = open(f, encoding="utf-8", errors="ignore").read()
    def rep(m):
        global count
        key = m.group("key")
        normalized = key.strip()
        if normalized in M:
            count += 1
            leading = key[:len(key) - len(key.lstrip())]
            trailing = key[len(key.rstrip()):]
            translated = leading + M[normalized] + trailing
            return m.group("fn") + "(" + m.group("q") + translated + m.group("q")
        return m.group(0)
    s2 = pat.sub(rep, s)
    if s2 != s:
        open(f, "w", encoding="utf-8").write(s2)
        print("updated", f)

print("translated", count, "strings")
