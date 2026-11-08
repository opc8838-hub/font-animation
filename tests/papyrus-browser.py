"""Verify original asset fidelity, font decoding, legacy IDs and editor export."""
import base64
import hashlib
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
OUT = ROOT / 'output/paper-fonts'
OUT.mkdir(parents=True, exist_ok=True)
FONTS = SITE / 'assets/fonts/paper-series'
LEGACY = ['cellmotion-sixteen', 'cellmotion-papers', 'cellmotion-jpg']
source = json.loads((FONTS / 'source.json').read_text(encoding='utf-8'))
for record in [source['font'], *source['backgrounds']]:
    assert hashlib.sha256((SITE / record['file']).read_bytes()).hexdigest() == record['sha256']
for record in source['backgrounds']:
    with Image.open(SITE / record['file']) as image:
        assert list(image.size) == [2000, 2000]
        image.verify()

original = TTFont(FONTS / 'Papyrus-Regular.ttf')
webfont = TTFont(FONTS / 'Papyrus-Regular.woff2')
assert original['name'].getDebugName(1) == webfont['name'].getDebugName(1) == 'Papyrus'
assert original['name'].getDebugName(0) == webfont['name'].getDebugName(0)
assert original.getBestCmap() == webfont.getBestCmap()
assert original['hmtx'].metrics == webfont['hmtx'].metrics
assert json.loads((FONTS / 'characters.json').read_text()) == sorted(original.getBestCmap())
for name in original.getGlyphOrder():
    left, right = RecordingPen(), RecordingPen()
    original.getGlyphSet()[name].draw(left)
    webfont.getGlyphSet()[name].draw(right)
    assert left.value == right.value, name


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        candidates = [Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')]
        candidates += list((Path.home() / '.cache/puppeteer/chrome').glob('win64-*/chrome-win64/chrome.exe'))
        executable = next((str(path) for path in reversed(candidates) if path.is_file()), None)
        browser = p.chromium.launch(executable_path=executable, headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(base + 'paper-fonts.html')
        page.wait_for_function('document.querySelector(".all-glyphs").textContent.length > 100')
        loaded = page.evaluate('''async () => {
          const faces = await STGFontLibrary.load('papyrus', '16 PAPERS jpg.');
          return faces[0].length === 1 && faces[0][0].status === 'loaded';
        }''')
        assert loaded
        assert page.evaluate('STGFontLibrary.fonts.filter(f=>f.id === "papyrus").length') == 1
        assert page.evaluate('(ids)=>ids.map(id=>STGFontLibrary.preset("stg:"+id).id)', LEGACY) == ['papyrus'] * 3
        page.screenshot(path=str(OUT / 'papyrus-desktop.png'), full_page=True)
        page.locator('#sample-text').fill('AVATAR Paper & ink 0123456789')
        assert page.locator('.hero-sample').all_text_contents() == ['AVATAR Paper & ink 0123456789'] * 3
        page.locator('#sample-size').fill('80')
        assert page.locator('#size-value').text_content() == '80 px'
        page.locator('#sample-text').fill('纸上字样 Paper')
        page.wait_for_function('document.fonts.check(\'400 40px "STG Noto Sans SC"\', "纸上字样")')
        page.locator('#reset-sample').click()
        page.wait_for_function('document.querySelector(".hero-sample").textContent === "16"')
        with page.expect_download() as download:
            page.locator('#download-font').click()
        assert download.value.suggested_filename == 'Papyrus-Regular.ttf'
        assert download.value.failure() is None
        for number in ['1', '2', '3']:
            page.locator('#paper-texture').select_option(number)
            assert page.locator('.face-sheet').first.evaluate('(node)=>getComputedStyle(node).backgroundImage').endswith(f'Paper-{number}.png")')
            with page.expect_download() as download:
                page.locator('#download-paper').click()
            assert download.value.suggested_filename == f'Paper-{number}.png'
            assert download.value.failure() is None
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(OUT / 'papyrus-mobile.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
        # The browser must render exactly the same pixels from the original TTF
        # and the web WOFF2, rather than falling back or using redrawn outlines.
        fidelity = page.evaluate('''async () => {
          const source = new FontFace('Papyrus Source Check', 'url(assets/fonts/paper-series/Papyrus-Regular.ttf)');
          await source.load();document.fonts.add(source);
          const render = family => {
            const c=document.createElement('canvas');c.width=1800;c.height=340;
            const ctx=c.getContext('2d');ctx.font=`150px "${family}"`;
            ctx.fillText('16 PAPERS jpg. ÀÉß!?',75,210);return c.toDataURL();
          };
          return {equal:render('STG Papyrus')===render('Papyrus Source Check'),
            distinct:render('STG Papyrus')!==render('serif')};
        }''')
        assert fidelity == {'equal': True, 'distinct': True}, fidelity
        poster = page.evaluate('''async () => {
          const paper=new Image();paper.src='assets/backgrounds/paper-series/Paper-3.png';await paper.decode();
          const c=document.createElement('canvas');c.width=1200;c.height=1200;
          const ctx=c.getContext('2d');ctx.drawImage(paper,0,0,1200,1200);
          for (const [text,size,x,top] of [['16',280,90,90],['PAPERS',132,85,480],['jpg.',245,70,850]]) {
            ctx.font=`${size}px "STG Papyrus"`;ctx.fillStyle='#111';
            const m=ctx.measureText(text);ctx.fillText(text,x+m.actualBoundingBoxLeft,top+m.actualBoundingBoxAscent);
          }
          ctx.font='12px sans-serif';ctx.fillText('PAPYRUS / ORIGINAL FONT + PAPER 03',720,1150);
          return c.toDataURL();
        }''')
        (OUT / 'papyrus-original-poster.png').write_bytes(base64.b64decode(poster.split(',')[1]))
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.goto(base + 'typecascade.html')
        page.wait_for_function('window.__morphPortTest')
        assert page.locator('#fontFamily option[value="stg:papyrus"]').count() == 1
        page.locator('#fontFamily').select_option('stg:papyrus', force=True)
        page.locator('select[data-key="fontFamily"]').first.select_option('stg:papyrus', force=True)
        assert page.evaluate('__morphPortTest.getScheme().rows[0].fontFamily') == 'stg:papyrus'
        scheme = page.evaluate('''() => {
          const s=__morphPortTest.getScheme();
          s.typography.fontFamily='stg:papyrus';
          s.rows.forEach(row=>{row.fontFamily='stg:papyrus';row.text='16 PAPERS jpg.';row.icons=[];});
          return s;
        }''')
        exports = []
        for font_id in ['papyrus', *LEGACY]:
            scheme['typography']['fontFamily'] = 'stg:' + font_id
            for row in scheme['rows']:
                row['fontFamily'] = 'stg:' + font_id
            page.evaluate('(s)=>CellMotionEffectBridge.applyScheme(s,{autoplay:false})', scheme)
            page.evaluate('STGFontLibrary.load("papyrus","16 PAPERS jpg.")')
            assert page.locator('#fontFamily').input_value() == 'stg:' + font_id
            assert page.evaluate('__morphPortTest.getScheme().rows[0].fontFamily') == 'stg:papyrus'
            page.evaluate('CellMotionEffectBridge.pause(); __morphPortTest.setTime(1)')
            page.locator('.tc-export-shortcut').click()
            with page.expect_download() as download:
                page.locator('#exportPng').click()
            path = OUT / f'original-editor-{font_id}.png'
            download.value.save_as(path)
            image = Image.open(path).convert('RGB')
            assert image.size == (1080, 1080)
            assert ImageChops.difference(image, Image.new('RGB', image.size, image.getpixel((0, 0)))).getbbox()
            exports.append(hashlib.sha256(image.tobytes()).hexdigest())
        assert len(set(exports)) == 1, 'Legacy aliases must render the original Papyrus identically'
        assert not errors, errors
        browser.close()
        report = {'font': 'Papyrus Regular', 'characters': len(original.getBestCmap()),
                  'glyphs': len(original.getGlyphOrder()), 'originalOutlinesPreserved': True,
                  'browserTtfWoff2PixelsIdentical': True, 'backgrounds': 3,
                  'legacyIdExportsIdentical': True, 'mobileOverflow': False, 'consoleErrors': errors}
        (OUT / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report))
finally:
    server.shutdown()
