"""Extract verifiable font specifications without changing the source font.

Usage: python scripts/inspect-font.py FONT OUTPUT.json
"""
import json
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

source, destination = map(Path, sys.argv[1:3])
font = TTFont(source)
names, os2 = font['name'], font['OS/2']
cmap, glyphs = font.getBestCmap(), font.getGlyphSet()


def ink_top(character):
    pen = BoundsPen(glyphs)
    glyphs[cmap[ord(character)]].draw(pen)
    return pen.bounds[3] if pen.bounds else None


features = sorted({record.FeatureTag for tag in ['GSUB', 'GPOS'] if tag in font
                   for record in getattr(font[tag].table.FeatureList, 'FeatureRecord', [])})
record = {
    'family': names.getDebugName(16) or names.getDebugName(1),
    'style': names.getDebugName(17) or names.getDebugName(2),
    'version': names.getDebugName(5), 'weight': os2.usWeightClass,
    'unitsPerEm': font['head'].unitsPerEm,
    'typographicMetrics': {'ascender': os2.sTypoAscender, 'descender': os2.sTypoDescender, 'lineGap': os2.sTypoLineGap},
    'capHeight': getattr(os2, 'sCapHeight', None), 'xHeight': getattr(os2, 'sxHeight', None),
    'measuredInkTop': {c: ink_top(c) for c in ['H', 'x'] if ord(c) in cmap},
    'glyphs': font['maxp'].numGlyphs, 'mappedCharacters': len(cmap),
    'variableAxes': [{'tag': a.axisTag, 'min': a.minValue, 'default': a.defaultValue, 'max': a.maxValue} for a in font['fvar'].axes] if 'fvar' in font else [],
    'openTypeFeatures': features, 'hasLegacyKern': 'kern' in font,
    'copyright': names.getDebugName(0), 'sourceFile': source.name,
}
destination.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"{record['family']} {record['style']}: weight {record['weight']}, {record['unitsPerEm']} UPM, {record['mappedCharacters']} mapped characters")
