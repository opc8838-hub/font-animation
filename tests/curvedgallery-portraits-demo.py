"""Verify the photo example, saved-user-state preservation and an actual preview export."""
import base64
import hashlib
import io
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output' / 'curved-gallery-reference' / 'portraits-demo'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4177/curvedgallery.html'
PHOTOS = Path('C:/Users/Administrator/xian-horizontal-parallax-gallery/public/gallery')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function('window.CurvedGallery && document.querySelector("#timeline button")')
    page.wait_for_timeout(300)
    original = page.evaluate('JSON.parse(JSON.stringify(CurvedGallery.collectScheme()))')
    original['settings']['text'] = '我的原方案'
    data = io.BytesIO(); Image.new('RGB', (300,200), '#ff3e42').save(data, 'PNG')
    original['assets'] = [{'id':'saved-user-photo', 'imageName':'my-photo.png', 'fileType':'image/png', 'originalDataUrl':'data:image/png;base64,' + base64.b64encode(data.getvalue()).decode()}]
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)', original)
    stored = page.evaluate('JSON.parse(JSON.stringify(CurvedGallery.collectScheme()))')
    with page.expect_download(): page.locator('#saveScheme').click()
    page.wait_for_function('document.querySelector("#schemeStatus").textContent.includes("方案已保存")')

    page.goto(URL + '?demo=portraits')
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().assets.length===7', timeout=90000)
    assets = page.evaluate('JSON.parse(JSON.stringify(CurvedGallery.collectScheme().assets))')
    for i, asset in enumerate(assets):
        name = f'{i+1:02d}.png'
        assert asset['imageName'] == name
        assert hashlib.sha256(base64.b64decode(asset['originalDataUrl'].split(',')[1])).digest() == hashlib.sha256((PHOTOS/name).read_bytes()).digest()
    page.evaluate('CurvedGallery.seek(.3)')
    page.screenshot(path=str(OUT/'loaded-editor.png'))
    page.goto(URL)
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().settings.text==="我的原方案"')
    assert page.evaluate('JSON.parse(JSON.stringify(CurvedGallery.collectScheme()))') == stored

    page.goto(URL + '?demo=portraits&preview')
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().assets.length===7', timeout=90000)
    page.evaluate('CurvedGallery.seek(.3)')
    page.screenshot(path=str(OUT/'full-stage-preview.png'))
    page.goto(URL + '?demo=portraits')
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().assets.length===7', timeout=90000)
    page.locator('#canvasPreset').select_option('custom')
    page.locator('#canvasWidth').fill('1280'); page.locator('#canvasWidth').dispatch_event('change')
    page.locator('#canvasHeight').fill('720'); page.locator('#canvasHeight').dispatch_event('change')
    page.locator('#exportShortcut').click()
    page.locator('#exportFps').select_option('30')
    with page.expect_download(timeout=180000) as download: page.evaluate("CurvedGallery.exportFile('mp4')")
    download.value.save_as(OUT/'curvedgallery-portraits-demo.mp4')
    assert '已生成' in page.locator('#exportStatus').inner_text(), page.locator('#exportStatus').inner_text()
    assert not errors, errors
    print('PASS all seven original images, preloaded editor/full-stage routes, original saved scheme preserved and actual 1280x720/30fps MP4 export')
    browser.close()
