"""Temporary composition acceptance. Serve site on localhost:4183."""
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'output/ocean-ink'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4183/ascii-ocean-ink.html?from=gallery')
    page.wait_for_function('Boolean(window.CardMotionEditor)')
    scheme = page.evaluate('CardMotionEditor.getScheme()')
    assert scheme['scene']['inkText'] == 'lovefrom' and scheme['motion']['hold'] == 1
    (ROOT / 'site/assets/presets/ascii-ocean-ink-default.json').write_text(json.dumps(scheme, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Editor ready', flush=True)
    result = page.evaluate('''() => {
      const original=AsciiOceanRenderer.render, c=document.createElement('canvas');c.width=640;c.height=360;
      const g=c.getContext('2d'),frame=t=>{g.clearRect(0,0,640,360);CardMotionEditor.draw(g,t,640,360);return c.toDataURL()};
      AsciiOceanRenderer.render=()=>{};
      try { return {hold:frame(3.801)===frame(4.799),written:frame(2)!==frame(3.801),
        dissolving:frame(5.8)!==frame(4.799),deterministic:frame(6)===frame(6),clear:frame(9.6)===frame(0)}; }
      finally { AsciiOceanRenderer.render=original; }
    }''')
    assert all(result.values()), result
    print('PASS writing, exact hold, ink displacement, deterministic seek and clean ending', flush=True)
    for at in [2, 4.3, 5.8, 7.2, 9.6]:
        data = page.evaluate('''t=>{const c=document.createElement('canvas');c.width=1280;c.height=720;CardMotionEditor.draw(c.getContext('2d'),t,1280,720);return c.toDataURL().split(',')[1]}''', at)
        (OUT / f'frame-{at}.png').write_bytes(base64.b64decode(data))
    page.evaluate('CardMotionEditor.seek(4.3)')
    page.screenshot(path=str(OUT / 'editor.png'))
    with page.expect_download() as download:
        page.locator('#saveScheme').click()
    download.value.save_as(OUT / 'ocean-ink-scheme.json')
    page.locator('[data-panel="motion"]').first.click()
    assert page.locator('[data-phase="hold"]').count() == 1
    page.evaluate('s=>CardMotionEditor.apply(s)', {**scheme, 'canvas': {'width': 960, 'height': 540}})
    page.locator('[data-panel="export"]').first.click()
    page.select_option('#exportDuration', 'custom')
    page.fill('#customDuration', '10.5')
    page.select_option('#exportFps', '24')
    with page.expect_download(timeout=180000) as download:
        page.locator('#exportMp4').click()
    download.value.save_as(OUT / 'lovefrom-ocean-ink.mp4')
    print('PASS real MP4', flush=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate('s=>CardMotionEditor.apply(s)', {**scheme, 'canvas': {'width': 360, 'height': 640}})
    page.evaluate('CardMotionEditor.seek(5.8)')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
    page.fill('#customDuration', '.6')
    page.select_option('#exportFps', '15')
    with page.expect_download(timeout=120000) as download:
        page.locator('#exportGif').click()
    download.value.save_as(OUT / 'portrait.gif')
    assert not errors, errors
    browser.close()
    print('PASS scheme save, mobile, GIF and clean console', flush=True)
