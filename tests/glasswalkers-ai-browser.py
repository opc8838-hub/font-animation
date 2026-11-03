"""Verify live For AI state, authoritative pixels, bridge controls and editor fit."""
import base64
import io
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import jsonschema
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/glasswalkers-release-ai'
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def handle(self):
        try:
            super().handle()
        except (ConnectionAbortedError, ConnectionResetError):
            pass


class TestServer(ThreadingHTTPServer):
    request_queue_size = 128


def host(directory):
    server = TestServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(directory)))
    Thread(target=server.serve_forever, daemon=True).start()
    return server, f'http://127.0.0.1:{server.server_port}/'


def field(page, name, value):
    page.locator('#' + name).evaluate('''(input,value)=>{
      if(input.type==='checkbox')input.checked=value;else input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }''', value)


def action(page, name):
    page.locator('.tc-ai-trigger').click()
    page.locator(f'[data-ai-action="{name}"]').click()


def render(page, at, width, height):
    return page.evaluate('''({at,width,height})=>{
      const c=document.createElement('canvas');c.width=width;c.height=height;
      CellMotionGlassWalkers.render(c,at);return c.toDataURL();
    }''', {'at': at, 'width': width, 'height': height})


def rgb(data):
    return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')


site, base = host(ROOT / 'site')
external = None
try:
    with sync_playwright() as p:
        candidates = [Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')]
        candidates += list((Path.home() / '.cache/puppeteer/chrome').glob('win64-*/chrome-win64/chrome.exe'))
        executable = next((str(path) for path in reversed(candidates) if path.is_file()), None)
        browser = p.chromium.launch(headless=True, executable_path=executable)
        context = browser.new_context(viewport={'width': 1440, 'height': 960}, accept_downloads=True)
        errors = []
        context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
        page = context.new_page()
        page.goto(base + 'glasswalkers.html?from=gallery', wait_until='domcontentloaded')
        page.wait_for_function("CellMotionEffectBridge?.version==='1.0.0'")
        preset = json.loads((ROOT / 'site/assets/presets/glasswalkers-default.json').read_text(encoding='utf8'))
        assert page.evaluate('CellMotionGlassWalkers.getComponentScheme()') == preset
        assert page.locator('.tc-scheme button').count() == 4
        assert page.locator('[data-ai-action]').count() == 5
        assert ImageChops.difference(rgb(render(page, 9, 1280, 720)), Image.open(ROOT / 'site/final_glasswalkers.png').convert('RGB')).getbbox() is None
        page.evaluate('CellMotionGlassWalkers.seek(3)')
        field(page, 'peopleCount', 2)
        page.wait_for_timeout(300)
        page.locator('#pause').focus()
        page.keyboard.press('Control+z')
        assert page.evaluate('CellMotionGlassWalkers.getScheme().peopleCount') == 6
        page.keyboard.press('Control+Shift+z')
        assert page.evaluate('CellMotionGlassWalkers.getScheme().peopleCount') == 2
        with page.expect_download() as saved:
            page.locator('#saveScheme').click()
        saved.value.save_as(OUT / 'native-scheme.json')
        native = json.loads((OUT / 'native-scheme.json').read_text(encoding='utf8'))
        assert native == page.evaluate('CellMotionGlassWalkers.getScheme()')
        page.locator('#resetScheme').click()
        assert page.evaluate('CellMotionGlassWalkers.getComponentScheme()') == preset
        page.locator('#schemeFile').set_input_files(OUT / 'native-scheme.json')
        page.wait_for_function('CellMotionGlassWalkers.getScheme().peopleCount===2')
        page.locator('#clearScheme').click()
        assert page.evaluate('CellMotionGlassWalkers.getScheme().peopleCount') == 0
        assert not page.evaluate('CellMotionGlassWalkers.getScheme().markers')
        page.locator('#resetScheme').click()
        assert page.evaluate('''()=>{
          const blocks=[...document.querySelectorAll('.me-choreo-block')];
          return new Set(blocks.map(b=>getComputedStyle(b).backgroundColor)).size===3
            && blocks.every(b=>parseFloat(getComputedStyle(b).borderRadius)>=12);
        }''')

        # Use the actual rounded dropdown, including its keyboard dismissal.
        page.locator('#canvasPreset + .tc-select-trigger').click()
        page.locator('.tc-select-popover [data-value="1080x1920"]').click()
        box = page.locator('#compositionFrame').bounding_box()
        assert abs(box['width'] / box['height'] - 1080 / 1920) < .01
        page.locator('#canvasPreset + .tc-select-trigger').click()
        page.keyboard.press('Escape')
        assert not page.locator('.tc-select-popover').is_visible()
        field(page, 'canvasPreset', 'custom')
        field(page, 'canvasWidth', 640)
        field(page, 'canvasHeight', 960)
        for name, value in {'peopleCount':4,'animalCount':2,'animalKind':'dog','direction':'horizontal','speed':1.35,'figureSize':125,'softness':55,'halftone':90,'background':'#eef4f7','shadow':'#1c2238','markers':True,'trackingMode':'feet'}.items():
            field(page, name, value)
        page.evaluate('CellMotionGlassWalkers.seek(3.2)')
        with page.expect_download() as event:
            action(page, 'json')
        event.value.save_as(OUT / 'live-component.json')
        manifest = json.loads((OUT / 'live-component.json').read_text(encoding='utf8'))
        jsonschema.validate(manifest, json.loads((ROOT / 'site/schemas/cellmotion-component-v1.schema.json').read_text(encoding='utf8')))
        assert manifest['composition'] == page.evaluate('CellMotionGlassWalkers.getComponentScheme()')
        assert manifest['composition']['scene']['peopleCount'] == 4
        assert manifest['composition']['scene']['animalKind'] == 'dog'
        assert manifest['composition']['canvas'] == {'width':640,'height':960}
        assert manifest['composition']['motion']['speed'] == 1.35
        assert manifest['assets'] == {'fonts': [], 'icons': [], 'backgrounds': [], 'embedded': []}
        assert page.evaluate('''m=>m.parameterDefinitions.length===14&&m.parameterDefinitions.every(p=>{
          let v={composition:m.composition};for(const key of p.path.split('.')){if(v==null||!(key in v))return false;v=v[key];}return true;
        })''', manifest)
        page.evaluate('()=>{window.copied=[];CellMotionAI.copyText=async text=>copied.push(text);}')
        action(page, 'prompt')
        page.wait_for_function('copied.length===1')
        prompt = page.evaluate('copied[0]')
        assert '膝关节' in prompt and '账号认证' not in prompt
        action(page, 'code')
        page.wait_for_function('copied.length===2')
        configured = page.evaluate('copied[1]')
        assert '<cellmotion-player' in configured and '"peopleCount": 4' in configured
        action(page, 'params')
        assert page.locator('.tc-ai-dialog').is_visible()
        assert page.locator('.tc-ai-params code').count() == 14
        page.keyboard.press('Escape')
        assert not page.locator('.tc-ai-dialog').is_visible()
        print('PASS approved pixels, rounded controls, live Manifest and all five AI actions', flush=True)

        with page.expect_popup() as event:
            action(page, 'preview')
        demo = event.value
        demo.wait_for_function("Math.abs(document.querySelector('#demoPlayer').duration-12/1.35)<.001")
        child = demo.locator('cellmotion-player').locator('iframe').element_handle().content_frame()
        child.wait_for_function('CellMotionGlassWalkers.getScheme().animalCount===2')
        assert child.locator('.tc-header').is_hidden()
        assert child.locator('.tc-timeline').is_hidden()
        assert child.locator('.gm-inspector').is_hidden()

        def compare(at):
            demo.evaluate("t=>document.querySelector('#demoPlayer').seek(t)", at)
            child.wait_for_function('(t)=>CellMotionGlassWalkers.time===t&&!CellMotionGlassWalkers.playing', arg=at)
            data = child.locator('#glassCanvas').evaluate('c=>({width:c.width,height:c.height,png:c.toDataURL()})')
            page.evaluate('t=>CellMotionGlassWalkers.seek(t)', at)
            source = page.locator('#glassCanvas').evaluate('c=>({width:c.width,height:c.height,png:c.toDataURL()})')
            assert (source['width'], source['height']) == (data['width'], data['height'])
            expected = source['png']
            difference = ImageChops.difference(rgb(data['png']), rgb(expected))
            if difference.getbbox() is not None:
                rgb(data['png']).save(OUT / 'player-mismatch.png')
                rgb(expected).save(OUT / 'editor-expected.png')
                print('mismatch', at, data['width'], data['height'], difference.getbbox(),
                      page.evaluate('CellMotionGlassWalkers.getScheme()'), child.evaluate('CellMotionGlassWalkers.getScheme()'), flush=True)
            assert difference.getbbox() is None

        for at in [0, 2.7, 5.2]:
            compare(at)
        demo.locator('[data-player-action="play"]').click()
        child.wait_for_function('CellMotionGlassWalkers.playing&&CellMotionGlassWalkers.time>5.3')
        demo.locator('[data-player-action="pause"]').click()
        child.wait_for_function('!CellMotionGlassWalkers.playing')
        paused = child.evaluate('CellMotionGlassWalkers.time')
        page.wait_for_timeout(150)
        assert child.evaluate('CellMotionGlassWalkers.time') == paused
        demo.locator('[data-player-action="restart"]').click()
        child.wait_for_function('CellMotionGlassWalkers.playing&&CellMotionGlassWalkers.time<1')
        demo.locator('[data-player-action="pause"]').click()
        updated = json.loads(json.dumps(manifest['composition']))
        updated['canvas'] = {'width':320,'height':320}
        updated['motion']['speed'] = .8
        updated['scene'].update(peopleCount=2, animalCount=0, markers=False, direction='vertical')
        demo.evaluate("c=>document.querySelector('#demoPlayer').update(c)", updated)
        child.wait_for_function('CellMotionGlassWalkers.getScheme().peopleCount===2&&CellMotionGlassWalkers.getScheme().width===320')
        demo.wait_for_function("document.querySelector('#demoPlayer').duration===15")
        page.evaluate("c=>CellMotionGlassWalkers.applyComponentScheme(c,{autoplay:false})", updated)
        compare(2)
        original = child.evaluate('CellMotionGlassWalkers.getComponentScheme()')
        child.evaluate('''()=>{const data={type:'cellmotion:update',bridgeVersion:'1.0.0',composition:{effect:'wrong'}};
          window.dispatchEvent(new MessageEvent('message',{source:parent,origin:'https://untrusted.example',data}));
          data.bridgeVersion='9.0.0';window.dispatchEvent(new MessageEvent('message',{source:parent,origin:new URL(document.referrer).origin,data}));
        }''')
        page.wait_for_timeout(100)
        assert child.evaluate('CellMotionGlassWalkers.getComponentScheme()') == original
        demo.screenshot(path=str(OUT / 'component-player.png'))
        assert demo.evaluate("getComputedStyle(document.querySelector('#demoTitle')).color===getComputedStyle(document.body).color")
        print('PASS real player pixels, play/pause/restart/seek/update, duration and rejected invalid bridge messages', flush=True)

        # The actual copied HTML must work when hosted at a different origin.
        (OUT / 'embed.html').write_text('<!doctype html><meta charset="utf-8">' + configured, encoding='utf8')
        external, external_base = host(OUT)
        embed = context.new_page()
        embed.goto(external_base + 'embed.html')
        embed.wait_for_function("Math.abs(document.querySelector('cellmotion-player').duration-12/1.35)<.001")
        embedded = embed.locator('cellmotion-player').locator('iframe').element_handle().content_frame()
        embedded.wait_for_function('CellMotionGlassWalkers.getScheme().animalKind==="dog"')
        embed.evaluate("document.querySelector('cellmotion-player').seek(3.2)")
        embedded.wait_for_function('CellMotionGlassWalkers.time===3.2')
        assert embedded.locator('.tc-header').is_hidden()
        embed.close()

        direct = context.new_page()
        direct.goto(base + 'typecascade-component-demo.html?effect=glasswalkers')
        direct.wait_for_function("document.querySelector('#demoPlayer').manifest?.effect.id==='glasswalkers'&&document.querySelector('#demoPlayer').duration===12")
        direct.close()
        page.evaluate("c=>CellMotionGlassWalkers.applyComponentScheme(c,{autoplay:false})", manifest['composition'])
        frozen = page.evaluate('CellMotionGlassWalkers.getComponentScheme()')
        for width in [390,320]:
            page.set_viewport_size({'width':width,'height':844})
            for language in ['en','zh']:
                if page.evaluate('document.body.dataset.editorLanguage') != language:
                    page.locator('#languageToggle').click()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, language)
                for selector in ['.tc-ai-trigger','#exportShortcut','#languageToggle','#themeToggle']:
                    rect = page.locator(selector).bounding_box()
                    assert rect['x']>=0 and rect['x']+rect['width']<=width, (width,language,selector,rect)
                page.locator('.tc-ai-trigger').click()
                assert page.locator('.tc-ai-menu').is_visible()
                page.keyboard.press('Escape')
            page.locator('#themeToggle').click()
            page.screenshot(path=str(OUT / f'mobile-{width}.png'))
        assert page.evaluate('CellMotionGlassWalkers.getComponentScheme()') == frozen
        page.set_viewport_size({'width':1440,'height':960})
        page.screenshot(path=str(OUT / 'editor-desktop.png'))
        assert not errors, errors
        print('PASS copied cross-origin HTML, direct demo, both languages/themes, mobile headers and clean console', flush=True)
        browser.close()
finally:
    site.shutdown()
    if external:
        external.shutdown()
