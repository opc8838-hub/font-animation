import sys
if len(sys.argv) > 1: sys.path.insert(0, sys.argv[1])
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.ttLib import woff2
_brotli_compress = woff2.brotli.compress
def _compress(data, **options):
    options["quality"] = 6
    return _brotli_compress(data, **options)
woff2.brotli.compress = _compress

site = Path(__file__).resolve().parents[1] / 'site'
for src, dest in [('assets/NotoSansSC-Regular.ttf', 'assets/fonts/NotoSansSC-Regular.woff2'), ('assets/NotoSansJP-Thin.otf', 'assets/fonts/NotoSansJP-Thin.woff2')]:
    original = TTFont(site / src, recalcTimestamp=False)
    original.flavor = 'woff2'
    original.save(site / dest)
    packed = TTFont(site / dest)
    assert original.getBestCmap() == packed.getBestCmap()
    assert original['hmtx'].metrics == packed['hmtx'].metrics
    print(src, (site / src).stat().st_size, '->', (site / dest).stat().st_size)
