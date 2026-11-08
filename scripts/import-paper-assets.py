"""Import the supplied Papyrus font and completed paper PNGs without redrawing.

Usage: python scripts/import-paper-assets.py "E:/5695纸纹背景图片"
Requires fonttools, brotli and Pillow. Originals and metadata are preserved.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve()
FONTS = ROOT / 'site/assets/fonts/paper-series'
PAPERS = ROOT / 'site/assets/backgrounds/paper-series'
FONTS.mkdir(parents=True, exist_ok=True)
PAPERS.mkdir(parents=True, exist_ok=True)


def copy_original(source, target):
    shutil.copyfile(source, target)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
    return {'file': str(target.relative_to(ROOT / 'site')).replace('\\', '/'),
            'sourceFile': str(source.relative_to(SOURCE)).replace('\\', '/'), 'sha256': digest}


source_font = SOURCE / 'FONT/PAPYRUS.TTF'
font_record = copy_original(source_font, FONTS / 'Papyrus-Regular.ttf')
font = TTFont(source_font, recalcTimestamp=False)
assert font['name'].getDebugName(1) == 'Papyrus'
font_record.update({'family': 'Papyrus', 'style': font['name'].getDebugName(2),
                    'version': font['name'].getDebugName(5), 'copyright': font['name'].getDebugName(0),
                    'glyphs': font['maxp'].numGlyphs, 'characters': len(font.getBestCmap())})
font.flavor = 'woff2'
font.save(FONTS / 'Papyrus-Regular.woff2')
(FONTS / 'characters.json').write_text(json.dumps(sorted(font.getBestCmap())) + '\n', encoding='utf-8')

papers = []
for index in range(1, 4):
    source = SOURCE / f'JPG/Paper-{index}.png'
    with Image.open(source) as image:
        size = list(image.size)
        image.verify()
    record = copy_original(source, PAPERS / source.name)
    record['size'] = size
    papers.append(record)
skipped = [p.name for p in (SOURCE / 'JPG').iterdir() if p.name.endswith('.downloading')]
provenance = {'sourceDirectory': str(SOURCE), 'font': font_record, 'backgrounds': papers, 'skipped': skipped}
(FONTS / 'source.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"Papyrus: {font_record['glyphs']} glyphs, {font_record['characters']} characters; {len(papers)} original backgrounds; {len(skipped)} incomplete files skipped")
