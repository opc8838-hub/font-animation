"""Browser acceptance and real export checks. Start a site server on port 4183 first."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'output/ascii-ocean-review'
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('CELLMOTION_URL', 'http://127.0.0.1:4183')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors = []
    context.on('page', lambda page: page.on('pageerror', lambda err: errors.append(str(err))))
    page = context.new_page()
    for slug in ['ascii-sharks']:
        page.goto(f'{BASE}/{slug}.html?from=gallery')
        page.wait_for_function('Boolean(window.CardMotionEditor)')
        default = page.evaluate('CardMotionEditor.getScheme()')
        assert default['scene']['inkEnabled'] and default['scene']['inkText'] == 'love from .'
        ink_switch = page.locator('[data-path="scene.inkEnabled"]')
        ink_switch.uncheck()
        assert page.evaluate('CardMotion.phases(CardMotionEditor.getScheme()).length') == 1
        assert page.locator('[data-phase="write"]').count() == 0
        no_ink = page.evaluate('''() => {
          const original=AsciiOceanRenderer.render,c=document.createElement('canvas');c.width=320;c.height=180;
          AsciiOceanRenderer.render=()=>{};
          try { CardMotionEditor.draw(c.getContext('2d'),7,320,180);return c.getContext('2d').getImageData(0,0,320,180).data.every(v=>v===0); }
          finally {AsciiOceanRenderer.render=original;}
        }''')
        assert no_ink
        ink_switch.check()
        assert page.locator('[data-phase="write"]').count() == 1
        (ROOT / f'site/assets/presets/{slug}-default.json').write_text(json.dumps(default, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        checks = page.evaluate('''() => {
          const s=CardMotionEditor.getScheme(), canvas=document.createElement('canvas');
          canvas.width=640;canvas.height=360;const g=canvas.getContext('2d');
          const render=t=>{CardMotionEditor.draw(g,t,640,360);return canvas.toDataURL()};
          const a=render(2.4),b=render(2.4),c=render(2.8),duration=CardMotion.duration(s);
          return {deterministic:a===b,moving:a!==c,closed:render(0)===render(duration),duration};
        }''')
        assert all(checks[k] for k in ['deterministic', 'moving', 'closed']), checks
        print(slug, checks, flush=True)
        # User-visible timeline and transport drive the authoritative clock.
        for phase in ['swim']:
            page.locator(f'[data-phase="{phase}"]').click()
            assert page.locator(f'[data-phase="{phase}"]').get_attribute('aria-current') == 'true'
        page.locator('#replayButton').click()
        page.wait_for_timeout(120)
        page.locator('#playButton').click()
        for size in ['1080x1920', '1080x1350', '1080x1080', '1920x1080']:
            page.select_option('#canvasPreset', size)
            dimensions = page.locator('#frame').bounding_box()
            w, h = map(int, size.split('x'))
            assert abs(dimensions['width'] / dimensions['height'] - w / h) < .005
        page.locator('[data-path="scene.color"]').fill('#8ccbd9')
        page.locator('[data-path="scene.density"]').evaluate("n=>{n.value=1.2;n.dispatchEvent(new Event('input',{bubbles:true}))}")
        assert page.evaluate('CardMotionEditor.getScheme().scene.density') == 1.2
        # Library selection never inserts; its explicit action commits once.
        page.locator('#openLibrary').click()
        other = 'flow-music'
        page.locator(f'[data-candidate="{other}"]').evaluate("n=>n.closest('details').open=true")
        page.locator(f'[data-candidate="{other}"]').click()
        assert page.evaluate('CardMotionEditor.getScheme().cards.length') == 6
        page.locator(f'[data-insert="{other}"]').click()
        page.wait_for_function('CardMotionEditor.getScheme().cards.length===7')
        assert page.locator('#selectedAssets').is_hidden()
        page.locator('#closeLibrary').click()
        page.locator('#assetToggle').click()
        page.locator('#selectedAssets [data-edit]').first.click()
        assert page.locator('#singleAssetEditor').is_visible()
        page.locator('[data-card-key="caption"]').fill('深海鲸游 · Ocean')
        assert page.evaluate('CardMotionEditor.getScheme().cards[0].caption') == '深海鲸游 · Ocean'
        assert page.locator('#canvas').bounding_box()['width'] > 150
        page.keyboard.press('Escape')
        page.keyboard.press('Escape')
        edited = page.evaluate('CardMotionEditor.getScheme()')
        edited['scene'].update(inkText='love\nfrom .', inkX=8, inkY=-6, inkEnabled=False)
        page.evaluate('s=>CardMotionEditor.apply(s)', edited)
        with page.expect_download() as dl:
            page.locator('#saveScheme').click()
        scheme = OUT / f'{slug}-scheme.json'
        dl.value.save_as(scheme)
        page.locator('#restoreScheme').click()
        page.wait_for_function('CardMotionEditor.getScheme().cards.length===6')
        page.set_input_files('#schemeFile', str(scheme))
        page.wait_for_function('CardMotionEditor.getScheme().cards.length===7')
        assert page.evaluate('CardMotionEditor.getScheme()') == edited
        page.wait_for_timeout(400)
        page.goto(f'{BASE}/{slug}.html')
        page.wait_for_function('Boolean(window.CardMotionEditor)')
        assert page.evaluate('CardMotionEditor.getScheme()') == edited
        # A gallery entry always uses the immutable approved example.
        page.goto(f'{BASE}/{slug}.html?from=gallery')
        page.wait_for_function('Boolean(window.CardMotionEditor)')
        assert page.evaluate('CardMotionEditor.getScheme()') == default
        page.evaluate('CardMotionEditor.seek(4.3)')
        page.screenshot(path=str(OUT / f'{slug}-desktop.png'))
        # Capture the same renderer at output resolution, including paused frames.
        for t in [0, 3, 4.3, 6, 9]:
            data = page.evaluate('''t=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;CardMotionEditor.draw(c.getContext('2d'),t,1920,1080);return c.toDataURL().split(',')[1]}''', t)
            import base64
            (OUT / f'{slug}-{t:02}.png').write_bytes(base64.b64decode(data))
        (ROOT / f'site/final_{slug}.png').write_bytes((OUT / f'{slug}-4.3.png').read_bytes())
        # The configured AI component carries changed live state and plays through the same renderer.
        page.evaluate('s=>CardMotionEditor.apply(s)', edited)
        manifest = page.evaluate('CardMotionEditor.manifest()')
        assert manifest['composition'] == edited
        with page.expect_popup() as popup:
            page.locator('#aiButton').click()
            page.locator('[data-ai="preview"]').click()
        demo = popup.value
        demo.wait_for_function("document.querySelector('#demoStatus').textContent.includes('已就绪') || document.querySelector('#demoStatus').textContent.includes('Ready')")
        demo.locator('[data-player-action="pause"]').click()
        demo.locator('#demoSeek').evaluate("n=>{n.value=2.5;n.dispatchEvent(new Event('input'))}")
        demo.locator('[data-player-action="restart"]').click()
        demo.locator('[data-player-action="play"]').click()
        demo.locator('#language').click()
        demo.locator('#theme').click()
        demo.set_viewport_size({'width': 390, 'height': 844})
        assert demo.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        demo.close()
        # Real downloadable PNG, GIF, and deterministic H.264 MP4.
        small = dict(default, canvas={'width': 640, 'height': 360})
        page.evaluate('s=>CardMotionEditor.apply(s)', small)
        page.locator('[data-panel="export"]').first.click()
        page.select_option('#exportDuration', 'custom')
        page.fill('#customDuration', '.6')
        page.select_option('#exportFps', '15')
        for fmt, button in [('png', 'exportPng'), ('gif', 'exportGif'), ('mp4', 'exportMp4')]:
            with page.expect_download(timeout=120000) as dl:
                page.locator('#' + button).click()
            output = OUT / f'{slug}-640x360.{fmt}'
            dl.value.save_as(output)
            assert output.stat().st_size > 1000
            print('exported', output.name, output.stat().st_size, flush=True)
        # Lightweight full-cycle gallery movie, produced by the editor's actual export stack.
        page.evaluate('s=>CardMotionEditor.apply(s)', dict(default, canvas={'width': 960, 'height': 540}))
        page.select_option('#exportDuration', 'cycle')
        page.select_option('#exportFps', '30')
        with page.expect_download(timeout=180000) as dl:
            page.locator('#exportMp4').click()
        dl.value.save_as(ROOT / f'site/assets/previews/{slug}-card.mp4')
        print('gallery video', slug, flush=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(f'{BASE}/{slug}.html?from=gallery')
        page.wait_for_function('Boolean(window.CardMotionEditor)')
        page.select_option('#canvasPreset', '1080x1920')
        page.evaluate('CardMotionEditor.seek(3)')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(OUT / f'{slug}-mobile.png'), full_page=True)
        page.locator('#languageButton').click()
        page.locator('#themeButton').click()
        portrait = dict(default, canvas={'width': 360, 'height': 640})
        page.evaluate('s=>CardMotionEditor.apply(s)', portrait)
        page.locator('[data-panel="export"]').first.click()
        page.select_option('#exportDuration', 'custom')
        page.fill('#customDuration', '.6')
        page.select_option('#exportFps', '15')
        with page.expect_download(timeout=120000) as dl:
            page.locator('#exportGif').click()
        dl.value.save_as(OUT / f'{slug}-360x640.gif')
        page.set_viewport_size({'width': 1440, 'height': 1000})
    browser.close()
    assert not errors, errors
    print('PASS: combined ocean editor, live component, saved schemes, responsive canvases and real PNG/GIF/MP4 exports', flush=True)
