"""Build the OFL Librestile derivative used by the square metallic preset.

Usage: python scripts/build-metallic-square-font.py <LibrestileExtBold.ttf>
The upstream font and license are https://github.com/ocelothe/Librestile.
"""
from pathlib import Path
import sys

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

font = TTFont(sys.argv[1])
# Browsers ignore this source's legacy kern table; preserve its pairs in GPOS.
pairs = font['kern'].kernTables[0].kernTable
addOpenTypeFeaturesFromString(font, 'languagesystem DFLT dflt; languagesystem latn dflt; feature kern {\n'
                             + '\n'.join(f'pos {left} {right} {value};' for (left, right), value in pairs.items())
                             + '\n} kern;')


def rectangle(pen, left, bottom, right, top, radius, reverse=False):
    points = [
        (left + radius, bottom), (right - radius, bottom), (right, bottom),
        (right, bottom + radius), (right, top - radius), (right, top),
        (right - radius, top), (left + radius, top), (left, top),
        (left, top - radius), (left, bottom + radius), (left, bottom),
    ]
    if reverse:
        points = [points[0]] + list(reversed(points[1:]))
        pen.moveTo(points[0])
        for i in range(1, 12, 3):
            pen.qCurveTo(points[i], points[i + 1])
            pen.lineTo(points[(i + 2) % 12])
    else:
        pen.moveTo(points[0])
        for i in range(1, 12, 3):
            pen.lineTo(points[i])
            pen.qCurveTo(points[i + 1], points[(i + 2) % 12])
    pen.closePath()


glyph = font['glyf']['O']
left, right, bottom, top = glyph.xMin, glyph.xMax, glyph.yMin, glyph.yMax
width, height = right - left, top - bottom
pen = TTGlyphPen(None)
rectangle(pen, left, bottom, right, top, round(height * .24))
rectangle(pen, round(left + width * .25), round(bottom + height * .22),
          round(right - width * .25), round(top - height * .22), round(height * .10), reverse=True)
font['glyf']['O'] = pen.glyph()
family = 'CellMotion Square'
for record in font['name'].names:
    if record.nameID in (1, 4, 6, 16):
        record.string = (family.replace(' ', '') if record.nameID == 6 else family).encode(record.getEncoding())
font.flavor = 'woff2'
target = Path(__file__).resolve().parents[1] / 'site/assets/fonts/librestile/cellmotion-square.woff2'
font.save(target)
print(target)
