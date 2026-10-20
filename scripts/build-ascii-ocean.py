"""Package the combined ASCII ocean and its live component descriptor."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
ASSETS = SITE / 'assets/ascii-ocean'
ASSETS.mkdir(parents=True, exist_ok=True)
library = []
for slug, name, english, shape in [
    ('ascii-shark', '鲨鱼', 'Shark', 'M20 80Q35 52 70 64L91 23 93 69Q134 71 164 81L187 54 182 83 190 107 164 90Q126 103 89 91L91 132 69 98Q35 106 20 80Z'),
    ('ascii-hammerhead', '锤头鲨', 'Hammerhead', 'M25 48L45 45 51 65Q110 58 162 79L190 58 182 82 193 108 162 91Q110 107 51 95L45 115 25 112 33 81Z'),
    ('ascii-longtail', '长尾鲨', 'Longtail', 'M22 80Q38 59 76 70L91 45 95 73Q142 78 205 44Q166 95 96 88L92 115 76 92Q40 104 22 80Z'),
    ('ascii-tiger', '虎鲨', 'Tiger shark', 'M17 80Q25 48 70 62L94 27 97 68Q135 72 164 81L189 53 182 83 192 111 164 91Q128 109 94 98L92 134 69 104Q22 108 17 80Z'),
    ('ascii-whale', '鲸鱼', 'Whale', 'M16 80Q19 48 59 55L92 19 103 27 86 60Q128 64 153 77L182 47 194 52 182 80 194 108 182 113 153 85Q122 102 86 100L103 133 92 141 58 105Q19 112 16 80Z'),
    ('ascii-manta', '魔鬼鱼', 'Manta ray', 'M44 66L33 61 28 66 39 76 21 57 88 18Q77 54 92 68L201 80 92 92Q77 106 88 142L21 103 39 84 28 94 33 99 44 94Q63 86 44 66Z'),
]:
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="220" height="160" viewBox="0 0 220 160"><rect width="220" height="160" rx="16" fill="#fcfcfa"/><path d="{shape}" fill="#7d8588"/><circle cx="33" cy="74" r="2" fill="#fcfcfa"/></svg>'
    (ASSETS / f'{slug}.svg').write_text(svg, encoding='utf-8')
    library.append({'libraryId': slug, 'name': name + ' / ' + english, 'kind': 'image', 'src': f'assets/ascii-ocean/{slug}.svg'})
(ASSETS / 'library.json').write_text(json.dumps({'cards': library}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

for slug, name, english in [('ascii-sharks', '字符海洋', 'ASCII Ocean')]:
    html = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{name} {english} | CellMotion</title><meta name="description" content="ASCII 字符海洋生物，支持颜色、密度、巡游节奏与 PNG / GIF / MP4 导出。">
<link rel="icon" href="favicon.svg"><link rel="stylesheet" href="shared-fonts.css?v=20261020-oddball2"><link rel="stylesheet" href="me-motion-editor.css?v=20260909-timeline-color">
<link rel="stylesheet" href="typecascade-workspace.css?v=20260909-1"><link rel="stylesheet" href="typecascade-polish.css?v=20261006-garden1"><link rel="stylesheet" href="cardmotion-editor.css?v=20261010-1"><link rel="stylesheet" href="archive-motion.css?v=20261019-layout1"><link rel="stylesheet" href="ascii-ocean.css?v=20261020-ocean-release1"></head>
<body class="tc-workspace me-motion-editor cm-editor" data-cardmotion="{slug}" data-editor-theme="dark"><div id="editorLoading" role="status">正在加载编辑器…</div>
<script src="shared-font-library.js?v=20261020-oddball2"></script><script src="shared-icon-library.js?v=20261009-1"></script><script src="cellmotion-animated-image.js"></script><script src="js/continuation-gif.js"></script><script src="js/h264-mp4-encoder.web.js"></script><script src="cellmotion-ai-manifest.js?v=20261010-cards2"></script><script src="ascii-ocean-renderer.js?v=20261021-ocean-ink1"></script><script src="ascii-ocean.js?v=20261020-ocean-release1"></script><script src="oddball-strokes.js?v=20261020-ink2"></script><script src="ascii-ocean-ink.js?v=20261021-ocean-ink1"></script><script src="cellmotion-effect-bridge.js?v=20261010-ai1"></script><script src="cardmotion-editor.js?v=20261021-ocean-ink1"></script><script src="typecascade-selects.js?v=20260909-1"></script></body></html>
'''
    (SITE / f'{slug}.html').write_text(html, encoding='utf-8')
    parameters = []
    for path, zh, en, lo, hi in [
        ('motion.speed', '整体速度', 'Overall speed', .25, 3), ('motion.swim', '巡游一轮', 'Swim cycle', 8, 60),
        ('scene.size', '主体大小', 'Subject size', .3, 1.4), ('scene.density', '字符密度', 'Character density', .6, 1.6), ('scene.fish', '小鱼数量', 'Small fish', 0, 420), ('scene.dots', '海水微粒', 'Water particles', 0, 1), ('scene.amplitude', '摆尾幅度', 'Tail amplitude', 0, 2), ('scene.direction', '巡游方向', 'Swim direction', -1, 1),
        ('scene.contrast', '方格明暗对比', 'Tile contrast', .4, 2), ('scene.shimmer', '明暗流动强度', 'Flowing light', 0, 2),
    ]:
        parameters.append({'path': 'composition.' + path, 'scope': 'effect', 'name': {'zh': zh, 'en': en}, 'type': 'number', 'minimum': lo, 'maximum': hi})
    for path, zh, en, lo, hi in [
        ('motion.lead', '海洋开场', 'Ocean opening', 0, 10), ('motion.write', '手写落墨', 'Ink handwriting', .1, 10),
        ('motion.hold', '写完停留', 'Written hold', .1, 5), ('motion.dissolve', '融墨入海', 'Ink into water', .1, 10),
        ('scene.inkSize', '文字大小', 'Text size', .4, 1.6), ('scene.inkX', '左右位置', 'Horizontal position', -50, 50), ('scene.inkY', '上下位置', 'Vertical position', -50, 50),
    ]:
        parameters.append({'path': 'composition.' + path, 'scope': 'effect', 'name': {'zh': zh, 'en': en}, 'type': 'number', 'minimum': lo, 'maximum': hi})
    parameters.append({'path': 'composition.scene.inkEnabled', 'scope': 'effect', 'name': {'zh': '水墨文字', 'en': 'Ink handwriting'}, 'type': 'boolean'})
    for path in ['backgroundColor', 'scene.color', 'scene.accent', 'scene.inkText', 'scene.inkColor', 'typography.fontFamily', 'cards[].caption', 'cards[].fontFamily', 'cards[].textColor']:
        parameters.append({'path': 'composition.' + path, 'scope': 'asset' if 'cards' in path else 'effect', 'name': {'zh': path, 'en': path}, 'type': 'string'})
    for path in ['scale', 'opacity', 'rotation', 'x', 'y', 'gap']:
        parameters.append({'path': 'composition.cards[].' + path, 'scope': 'asset', 'name': {'zh': path, 'en': path}, 'type': 'number'})
    definition = {'effect': {'id': slug, 'name': {'zh': name, 'en': english}, 'version': '1.0.0', 'category': 'graphic'},
        'runtime': {'kind': 'iframe-bridge', 'entry': slug + '.html?preview=1&embed=1&v=20261021-ocean-ink1', 'bridgeVersion': '1.0.0', 'renderer': 'canvas2d'},
        'capabilities': {'compositionModel': 'media', 'timeline': True, 'responsiveCanvas': True, 'exports': ['png', 'gif', 'mp4'], 'customImageAssets': True, 'backgrounds': ['color', 'image', 'gif', 'video'], 'videoTrim': True},
        'behavior': {'summary': {'zh': name + '在白底细网格中独立巡游，身体随转向弯曲，灰色字符方格呈现明暗。', 'en': english + ' swim independently over a light grid, with articulated bodies and shaded character tiles.'}, 'phases': [{'id': 'swim', 'name': {'zh': '连续巡游', 'en': 'Continuous swim'}, 'colorToken': 'phase.sky'}]}, 'parameters': parameters}
    definition['effect']['version'] = '1.1.0'
    definition['behavior']['summary'] = {'zh': '字符海洋生物持续巡游，可选多行水墨手写，停留后缓慢融入海水。', 'en': 'Marine life cruises continuously with optional multiline handwriting that slowly disperses into the water.'}
    definition['behavior']['phases'] = [{'id': phase, 'name': {'zh': zh, 'en': en}, 'colorToken': 'phase.' + color} for phase, zh, en, color in [
        ('lead', '海洋开场', 'Ocean opening', 'sky'), ('write', '手写落墨', 'Ink handwriting', 'violet'), ('hold', '写完停留', 'Written hold', 'amber'), ('dissolve', '融墨入海', 'Ink into water', 'mint'), ('swim', '海洋巡游', 'Ocean cruise', 'sky')]]
    (SITE / f'effects/{slug}.component.json').write_text(json.dumps(definition, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Preserve the draft whale URL as an alias for the combined ocean composition.
(SITE / 'ascii-whale.html').write_text('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=ascii-sharks.html?from=gallery"><title>ASCII Ocean</title></head><body><a href="ascii-sharks.html?from=gallery">ASCII Ocean</a></body></html>\n', encoding='utf-8')
