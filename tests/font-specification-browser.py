"""Check source-derived specifications and actual type tester CSS metrics."""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/font-specification'
OUT.mkdir(parents=True, exist_ok=True)
assets = ROOT / 'site/assets/fonts/paper-series'
spec = json.loads((assets / 'specification.json').read_text(encoding='utf-8'))
font = TTFont(assets / 'Papyrus-Regular.ttf')
assert spec['weight'] == font['OS/2'].usWeightClass == 400
assert spec['unitsPerEm'] == font['head'].unitsPerEm == 2048
assert spec['mappedCharacters'] == len(font.getBestCmap())
assert spec['variableAxes'] == [] and spec['openTypeFeatures'] == []
assert spec['capHeight'] is None and spec['xHeight'] is None


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'site')))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/paper-fonts.html')
        page.wait_for_function('document.querySelector("#font-specification").textContent.includes("2048")')
        page.wait_for_function('document.querySelector("#lab-coverage").textContent.includes("原生")')
        assert page.locator('#lab-weight').is_disabled()
        assert page.locator('#lab-weight option').count() == 1
        page.locator('#lab-size').fill('96')
        page.locator('#lab-tracking').fill('0.05')
        page.locator('#lab-leading').fill('1.8')
        values = page.locator('#lab-preview').evaluate('(el)=>{const s=getComputedStyle(el);return [s.fontSize,s.fontWeight,parseFloat(s.letterSpacing),parseFloat(s.lineHeight)]}')
        assert values[:2] == ['96px', '400']
        assert abs(values[2] - 4.8) < .01 and abs(values[3] - 172.8) < .01
        page.locator('#lab-size').fill('999')
        page.locator('#lab-size').press('Tab')
        assert page.locator('#lab-size').input_value() == '240'
        assert page.locator('#lab-preview').evaluate('(el)=>getComputedStyle(el).fontSize') == '240px'
        page.locator('#lab-size').fill('96')
        page.locator('#lab-text').fill('PAPERS\njpg. 16')
        assert page.locator('#lab-preview').inner_text() == 'PAPERS\njpg. 16'
        page.locator('#lab-text').fill('纸上字样 ABC')
        page.wait_for_function('document.querySelector("#lab-coverage").textContent.includes("4 种字符")')
        assert page.evaluate('document.fonts.check("40px \'STG Noto Sans SC\'", "纸上字样")')
        page.locator('#lab-text').fill('Hamburgefontsiv\nPAPERS 16 jpg.')
        page.wait_for_function('document.querySelector("#lab-coverage").textContent.includes("原生")')
        page.locator('.size-study summary').click()
        assert page.locator('.size-row p').evaluate_all('(els)=>els.map(el=>parseFloat(getComputedStyle(el).fontSize))') == [16, 24, 36, 48, 72, 120]
        page.locator('#sample-size').fill('100')
        page.wait_for_timeout(200)
        assert '230.0 px' in page.locator('.sample-metrics').nth(0).inner_text()
        assert '100.0 px' in page.locator('.sample-metrics').nth(1).inner_text()
        assert '210.0 px' in page.locator('.sample-metrics').nth(2).inner_text()
        page.locator('.type-lab').screenshot(path=str(OUT / 'type-lab-desktop.png'))
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(200)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        for index in range(3):
            size = page.locator('.hero-sample').nth(index).evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize).toFixed(1)')
            assert size + ' px' in page.locator('.sample-metrics').nth(index).inner_text()
        page.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
        assert not errors, errors
        result = {'specificationMatchesFont': True, 'realWeight': 400, 'exactSizeTrackingLeading': True,
                  'waterfallSizes': [16, 24, 36, 48, 72, 120], 'fallbackReported': True, 'mobileOverflow': False, 'consoleErrors': errors}
        (OUT / 'verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
        print(json.dumps(result))
        browser.close()
finally:
    server.shutdown()
