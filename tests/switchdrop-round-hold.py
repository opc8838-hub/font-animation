"""Run against a static site server; pass --exports to regenerate review artifacts."""
import base64
import io
import json
import os
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output' / 'switchdrop-round-hold'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('CELLMOTION_TEST_URL', 'http://127.0.0.1:4177')
failures = []


def check(condition, message):
    if not condition:
        failures.append(message)


def download(page, selector, filename):
    with page.expect_download(timeout=240000) as info:
        page.locator(selector).evaluate('(el)=>el.click()')
    info.value.save_as(OUT / filename)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL + '/switchdrop.html?from=gallery')
    page.wait_for_function('window.__switchdropTest && document.fonts.status === "loaded"')
    page.wait_for_timeout(500)
    original = page.evaluate('CellMotionEffectBridge.getScheme()')
    check(original['motion']['hold'] == 6000, 'Default ending hold must be 6 seconds')
    check(page.locator('#holdDuration').get_attribute('max') == '30000', 'Ending hold must allow 30 seconds')
    check(page.locator('#holdDuration').get_attribute('min') == '2000', 'Ending hold must have a 2-second minimum')
    exact = page.locator('#holdDurationExact')
    check(exact.get_attribute('min') == '2' and exact.get_attribute('max') == '30', 'Custom ending hold input must use seconds')
    page.locator('.tc-tabs [data-panel="global"]').click()
    exact.fill('2.5')
    exact.press('Enter')
    check(page.evaluate('CellMotionEffectBridge.getScheme().motion.hold') == 2500, 'Custom 2.5-second input must update timing')
    exact.fill('1')
    exact.press('Enter')
    check(page.evaluate('CellMotionEffectBridge.getScheme().motion.hold') == 2000, 'Values below 2 seconds must clamp to 2 seconds')
    page.screenshot(path=str(OUT/'ending-hold-control.png'))
    imported = json.loads(json.dumps(original))
    imported['motion']['hold'] = 500
    page.evaluate('(s)=>CellMotionEffectBridge.applyScheme(s,{autoplay:false})', imported)
    check(page.evaluate('CellMotionEffectBridge.getScheme().motion.hold') == 2000, 'Imported timing must respect the 2-second minimum')

    # Isolate punctuation pixels using the real renderer and a neutral subject.
    isolated = json.loads(json.dumps(original))
    isolated['subject'].update(mode='text', text='ME', color='#cccccc', nightLogo=False, rim=0)
    page.evaluate('(s)=>CellMotionEffectBridge.applyScheme(s,{autoplay:false})', isolated)
    data = page.evaluate('''()=>{
        const c=document.createElement('canvas');c.width=1920;c.height=1080;
        __switchdropTest.renderFrame(c,3,1920,1080,false);
        return c.toDataURL('image/png').split(',')[1];
    }''')
    image = Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB')
    pixels = [(x, y) for y in range(image.height) for x in range(image.width)
              if max(abs(a-b) for a,b in zip(image.getpixel((x,y)), (130,119,245))) < 25]
    check(bool(pixels), 'Purple punctuation must be visible')
    if pixels:
        left, right = min(x for x,y in pixels), max(x for x,y in pixels)
        top, bottom = min(y for x,y in pixels), max(y for x,y in pixels)
        width, height = right-left+1, bottom-top+1
        coverage = len(pixels)/(width*height)
        check(abs(width-height) <= 2 and .68 < coverage < .87,
              f'Punctuation must be circular: {width}x{height}, coverage={coverage:.3f}')
        image.crop((left-5,top-5,right+6,bottom+6)).resize((200,200)).save(OUT/'dot-detail.png')

    page.evaluate('(s)=>CellMotionEffectBridge.applyScheme(s,{autoplay:false})', original)
    page.locator('#holdDuration').evaluate('(el)=>{el.value="20000";el.dispatchEvent(new Event("input",{bubbles:true}))}')
    check(page.evaluate('CellMotionEffectBridge.getScheme().motion.hold') == 20000, 'Editing hold must retain 20 seconds')
    duration = page.evaluate('CellMotionEffectBridge.durationMs()')
    check(duration == 21950, f'Timeline must include the edited hold: {duration}')
    page.goto(URL + '/switchdrop.html')
    page.wait_for_function('window.__switchdropTest')
    check(page.evaluate('CellMotionEffectBridge.getScheme().motion.hold') == 20000, 'Refresh must retain saved timing')
    page.locator('#restoreScheme').evaluate('(el)=>el.click()')
    page.evaluate('CellMotionEffectBridge.seek(3)')
    page.screenshot(path=str(OUT/'desktop.png'))
    download(page, '#saveScheme', 'switchdrop-default.json')
    saved = json.loads((OUT/'switchdrop-default.json').read_text(encoding='utf-8'))
    check(saved == original, 'Saved JSON must match the published default')
    for width,height in [(1080,1080),(1080,1920)]:
        s = json.loads(json.dumps(original))
        s['canvas'].update(width=width,height=height,preset=f'{width}x{height}')
        s['title']['text'] = '今日.地球'
        page.evaluate('(s)=>{CellMotionEffectBridge.applyScheme(s,{autoplay:false});CellMotionEffectBridge.seek(3)}', s)
        page.wait_for_timeout(200)
        box = page.locator('#compositionFrame').bounding_box()
        check(abs(box['width']/box['height']-width/height) < .02, 'Preview must follow selected canvas ratio')
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT/'mobile.png'), full_page=True)
    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile editor must fit the viewport')
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('(s)=>{CellMotionEffectBridge.applyScheme(s,{autoplay:false});CellMotionEffectBridge.seek(3)}', original)
    if '--exports' in sys.argv:
        download(page, '#exportPng', 'switchdrop-poster.png')
        download(page, '#exportMp4', 'switchdrop-card.mp4')
        s = json.loads(json.dumps(original))
        s['canvas'].update(width=640,height=360,preset='custom')
        page.evaluate('(s)=>CellMotionEffectBridge.applyScheme(s,{autoplay:false})', s)
        download(page, '#exportGif', 'switchdrop.gif')
    page.goto(URL + '/')
    page.wait_for_selector('#recent-grid .recent-card')
    check(page.locator('#recent-title').inner_text() == '最近上新', 'Recent releases title must have no period')
    check('switchdrop.html' in page.locator('#recent-grid .recent-card').first.get_attribute('href'), 'Switch Drop must be the newest release')
    page.locator('#recent').scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/'recent.png'))
    check(not errors, f'Browser errors: {errors}')
    browser.close()

assert not failures, '\n'.join(failures)
print('PASS: circular punctuation, long hold editing/persistence, saved default, canvas ratios, mobile, homepage' + (' and PNG/MP4/GIF exports' if '--exports' in sys.argv else ''))
