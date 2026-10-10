"""Package the original CardBot SVG paths and matrix keyframes without changing them.

Usage: python scripts/build-cardbot-assets.py E:/card编辑/bot/public
Generated data is versioned; the editor never depends on another website.
"""
from pathlib import Path
import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET

source = Path(sys.argv[1])
site = Path(__file__).resolve().parents[1] / 'site'
target = site / 'assets' / 'cardbot'
target.mkdir(parents=True, exist_ok=True)
preset = json.loads((source / 'cardbot-reglages-default.json').read_text(encoding='utf-8'))
cards = []
ns = {'s': 'http://www.w3.org/2000/svg'}
for index, name in enumerate(preset['cartes']):
    color = name.split('-')[1]
    file = source / 'bloub-export' / color / name
    svg = file.read_text(encoding='utf-8')
    root = ET.fromstring(svg)
    mask = root.find('.//s:mask', ns)
    paths = mask.findall('s:path', ns)
    style = root.find('s:style', ns).text
    fill = root.find('.//s:g[@mask]/s:rect', ns).get('fill')
    eyes = []
    for path in paths[1:]:
        key = path.get('class')
        track = re.search(r'@keyframes ' + key + r'\{(.*?)(?=@keyframes|$)', style).group(1)
        frames = [[float(p) / 100, *map(float, matrix.split(','))]
                  for p, matrix in re.findall(r'([\d.]+)%\{transform:matrix\(([^)]+)\)', track)]
        if not frames:
            raise ValueError(f'Missing deterministic eye matrices: {name}')
        eyes.append({'path': path.get('d'), 'frames': frames})
    slug = f'cardbot-{index:02d}'
    shutil.copyfile(file, target / f'{slug}.svg')
    cards.append({'libraryId': slug, 'name': name.removesuffix('.svg').removeprefix('扑克牌-'),
                  'src': f'assets/cardbot/{slug}.svg', 'kind': 'cardbot', 'color': fill,
                  'body': paths[0].get('d'), 'eyes': eyes,
                  'duration': float(re.search(r'animation-duration:([\d.]+)s', style).group(1))})
(target / 'library.json').write_text(json.dumps({'cards': cards}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Packaged {len(cards)} original SVGs with deterministic keyframes')
