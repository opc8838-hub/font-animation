"""Verify independent typography controls, scheme persistence and actual exports."""
import base64
import json
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/paper-type-typography'
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'site')))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/paper-type.html'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(base + '?from=gallery')
        page.wait_for_function('CellMotionPaperType?.ready')
        assert page.locator('#fontWeight').is_disabled()
        assert page.locator('#fontWeight option').count() == 1
        # Render at the exact requested px, without automatic shrinking.
        page.locator('#text').fill('Paper\nInk')
        page.locator('#fontSize').fill('96')
        page.locator('#tracking').fill('0.08')
        page.locator('#lineHeight').fill('1.8')
        page.locator('#autoFit').uncheck()
        page.wait_for_function('document.querySelector("#typeMetrics").textContent.includes("96.0 px")')
        scheme = page.evaluate('CellMotionPaperType.getScheme()')
        assert (scheme['rows'][0]['fontSizePx'], scheme['rows'][0]['tracking'], scheme['rows'][0]['lineHeight']) == (96, .08, 1.8)
        assert scheme['rows'][1]['tracking'] == 0 and scheme['rows'][1]['lineHeight'] == 1.4
        page.locator('#font').select_option('stg:noto-sc', force=True)
        assert page.locator('#fontWeight option').all_text_contents() == ['200', '400', '900']
        page.locator('#fontWeight').select_option('stg:noto-sc-black', force=True)
        assert page.evaluate('CellMotionPaperType.getScheme().rows[0].font') == 'stg:noto-sc-black'
        page.locator('#text').fill('纸上\nHello')
        page.locator('#moveDown').click()
        assert page.evaluate('CellMotionPaperType.getScheme().rows[1].fontSizePx') == 96
        page.locator('#moveUp').click()
        with page.expect_download() as event:
            page.locator('#saveScheme').click()
        event.value.save_as(OUT / 'scheme.json')
        page.goto(base)
        page.wait_for_function('CellMotionPaperType?.ready')
        assert page.locator('#fontSize').input_value() == '96'
        assert page.locator('#tracking').input_value() == '0.08'
        assert page.locator('#lineHeight').input_value() == '1.8'
        assert page.locator('#fontWeight').input_value() == 'stg:noto-sc-black'
        page.locator('#resetScheme').click()
        page.locator('#schemeFile').set_input_files(OUT / 'scheme.json')
        page.wait_for_function('CellMotionPaperType.getScheme().rows[0].tracking===.08')
        # Compare on-screen and exported pixels at identical logical dimensions.
        page.locator('#canvasPreset').select_option('custom', force=True)
        page.locator('#canvasWidth').fill('360'); page.locator('#canvasWidth').press('Tab')
        page.locator('#canvasHeight').fill('480'); page.locator('#canvasHeight').press('Tab')
        page.locator('#fontSize').fill('24')
        page.wait_for_function('document.querySelector("#typeMetrics").textContent.includes("24.0 px")')
        page.wait_for_timeout(150)
        page.screenshot(path=str(OUT / 'editor.png'), full_page=True)
        data = page.locator('#paperCanvas').evaluate('(c)=>c.toDataURL().split(",")[1]')
        (OUT / 'preview.png').write_bytes(base64.b64decode(data))
        page.locator('#exportShortcut').click()
        for format in ['Png', 'Gif', 'Mp4']:
            if format != 'Png':
                page.locator('#exportFps').select_option('15', force=True)
                page.locator('#exportDuration').select_option('custom', force=True)
                page.locator('#customDuration').fill('1')
            with page.expect_download(timeout=90000) as event:
                page.locator('#export' + format).click()
            event.value.save_as(OUT / ('edited.' + format.lower()))
            page.wait_for_function('!document.querySelector("#exportPng").disabled')
        with Image.open(OUT / 'edited.png') as a, Image.open(OUT / 'preview.png') as b:
            assert a.size == b.size == (360, 480)
            assert max(hi for lo, hi in ImageChops.difference(a.convert('RGB'), b.convert('RGB')).getextrema()) <= 1
        with Image.open(OUT / 'edited.gif') as im:
            assert im.size == (360, 480) and im.n_frames == 15
        probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height,duration', '-of', 'json', str(OUT / 'edited.mp4')], capture_output=True, text=True, check=True)
        assert json.loads(probe.stdout)['streams'][0] == {'codec_name': 'h264', 'width': 360, 'height': 480, 'duration': '1.000000'}
        # Migrate original v1 region-relative sizes to output pixels.
        old = page.evaluate('CellMotionPaperType.getScheme()')
        for row in old['rows']:
            for key in ['fontSizePx', 'tracking', 'lineHeight', 'autoFit']:
                row.pop(key)
        page.evaluate('(s)=>CellMotionPaperType.applyScheme(s)', old)
        migrated = page.evaluate('CellMotionPaperType.getScheme()')
        region_width = page.evaluate('PaperType.regions(CellMotionPaperType.getScheme())[0].width')
        assert abs(migrated['rows'][0]['fontSizePx'] - old['rows'][0]['fontSize'] * region_width / 1000) < .001
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('[data-panel="block"]').first.click()
        page.wait_for_timeout(100)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('#tracking').is_visible()
        assert page.locator('#lineHeight').is_visible()
        assert not errors, errors
        print(json.dumps({'independentControls': True, 'realWeights': [200, 400, 900], 'exactPx': True, 'savedAndImported': True,
                          'legacySizeMigration': True, 'pngMatchesPreview': True, 'gifFrames': 15, 'h264': True, 'mobileOverflow': False, 'consoleErrors': errors}))
        browser.close()
finally:
    server.shutdown()
