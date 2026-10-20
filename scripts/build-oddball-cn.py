"""Build the CellMotion Chinese ink companion from Zhi Mang Xing (SIL OFL 1.1).

Source: https://github.com/google/fonts/tree/main/ofl/zhimangxing
Usage: python scripts/build-oddball-cn.py path/to/ZhiMangXing-Regular.ttf
"""

import hashlib
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont


SOURCE_SHA256 = "644e0cae9b40f0b10ab729a01bd32032e3973bac22be3dccae01bf6ae7fde969"
OUTPUT = Path(__file__).resolve().parents[1] / "site/assets/fonts/CellMotionInkCN-Regular.woff2"
SIZE = 384
LEFT = 96
BASELINE = 410


def chinese_codepoint(codepoint):
    return (0x2E80 <= codepoint <= 0x9FFF
            or 0xF900 <= codepoint <= 0xFAFF
            or 0xFF00 <= codepoint <= 0xFFEF)


def build_glyph(character, glyph_name, raster_font, scale):
    image = Image.new("L", (576, 576))
    ImageDraw.Draw(image).text((LEFT, BASELINE), character, font=raster_font, fill=255, anchor="ls")
    mask = np.asarray(image)
    ys, xs = np.where(mask > 128)
    if not len(xs):
        return None
    density = (mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1] > 128).mean()
    radius = 3 if density >= 0.37 else 4 if density >= 0.27 else 6
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1,) * 2))
    mask = cv2.GaussianBlur(mask, (0, 0), 1.6)
    mask = np.where(mask >= 112, 255, 0).astype("uint8")
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    pen = TTGlyphPen(None)
    phase = int.from_bytes(hashlib.sha256(glyph_name.encode()).digest()[:4], "big") * 0.0000001
    max_points = 0
    contour_count = 0
    for index, contour in enumerate(contours):
        contour = cv2.approxPolyDP(contour, 1.4, True).reshape(-1, 2)
        if len(contour) < 3:
            continue
        depth = 0
        parent = hierarchy[0][index][3]
        while parent != -1:
            depth += 1
            parent = hierarchy[0][parent][3]
        points = []
        for pixel_x, pixel_y in contour:
            x = (float(pixel_x) - LEFT) / scale
            y = (BASELINE - float(pixel_y)) / scale
            x += 7 * math.sin(y / 95 + phase) + 4 * math.sin((x + y) / 58 + phase * 1.7)
            y += 7 * math.sin(x / 102 + phase * 0.7) + 3 * math.sin((x - y) / 71 + phase * 1.3)
            points.append((round(x), round(y)))
        area = sum(points[i][0] * points[(i + 1) % len(points)][1]
                   - points[(i + 1) % len(points)][0] * points[i][1]
                   for i in range(len(points)))
        if (area < 0) != (depth % 2 == 0):
            points.reverse()
        pen.moveTo(points[0])
        for point in points[1:]:
            pen.lineTo(point)
        pen.closePath()
        max_points += len(points)
        contour_count += 1
    return pen.glyph(), max_points, contour_count


def main(source):
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise SystemExit("Source font hash differs from the reviewed Zhi Mang Xing release")
    font = TTFont(source)
    raster_font = ImageFont.truetype(str(source), SIZE)
    scale = SIZE / font["head"].unitsPerEm
    glyphs = {}
    for codepoint, glyph_name in font.getBestCmap().items():
        if chinese_codepoint(codepoint) and glyph_name not in glyphs:
            glyphs[glyph_name] = chr(codepoint)
    max_points = font["maxp"].maxPoints
    max_contours = font["maxp"].maxContours
    for index, (glyph_name, character) in enumerate(glyphs.items(), 1):
        result = build_glyph(character, glyph_name, raster_font, scale)
        if result is None:
            continue
        glyph, points, contours = result
        font["glyf"][glyph_name] = glyph
        glyph.recalcBounds(font["glyf"])
        advance, _ = font["hmtx"][glyph_name]
        font["hmtx"][glyph_name] = (advance, glyph.xMin)
        max_points = max(max_points, points)
        max_contours = max(max_contours, contours)
        if index % 1000 == 0:
            print(f"Built {index}/{len(glyphs)} glyphs", flush=True)
    font["maxp"].maxPoints = max_points
    font["maxp"].maxContours = max_contours
    names = font["name"]
    replacements = {
        1: "CellMotion Ink CN", 2: "Regular", 3: "CellMotionInkCN-Regular;2026",
        4: "CellMotion Ink CN Regular", 6: "CellMotionInkCN-Regular",
        16: "CellMotion Ink CN", 17: "Regular",
    }
    names.names = [record for record in names.names if record.nameID not in replacements and record.nameID != 7]
    for name_id, value in replacements.items():
        names.setName(value, name_id, 3, 1, 0x409)
        names.setName(value, name_id, 1, 0, 0)
    font.flavor = "woff2"
    font.save(OUTPUT)
    print(f"Saved {OUTPUT} with {len(glyphs)} modified CJK glyphs", flush=True)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
