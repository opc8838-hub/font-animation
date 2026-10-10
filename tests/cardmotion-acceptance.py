"""Browser checks, real downloads, AI bridge, and responsive layout.
Start: python -m http.server 4186 --bind 127.0.0.1 --directory site
Run: python tests/cardmotion-acceptance.py
"""
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'cardmotion'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:4186/'

def edit(page, path, value):
    page.evaluate('''({path,value})=>{const n=document.querySelector(`[data-path="${path}"]`);if(n.type==='checkbox')n.checked=value;else n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));}''', {'path': path, 'value': value})

def scheme(page):
    return page.evaluate('CardMotionEditor.getScheme()')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for effect in ['card-login', 'carddeck']:
        errors = []
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + effect + '.html?from=gallery', wait_until='networkidle')
        page.wait_for_function('!!window.CardMotionEditor')
        default = scheme(page)
        assert default['effect'] == effect
        for width, height in [(1920,1080),(1440,900),(1024,768),(768,1024),(390,844),(320,740)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('CardMotionEditor.seek(1.9)')
            page.wait_for_timeout(120)
            metrics = page.evaluate('''()=>{const b=document.querySelector('#frame').getBoundingClientRect(),s=document.querySelector('#stage').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,headerOverflow:[...document.querySelector('.tc-header').querySelectorAll('button')].some(n=>n.getBoundingClientRect().right>innerWidth),frame:b.toJSON(),stage:s.toJSON()}}''')
            assert not metrics['overflow'], (effect,width,metrics)
            assert not metrics['headerOverflow'], (effect,width,metrics)
            f, s = metrics['frame'], metrics['stage']
            assert f['left'] >= s['left']-1 and f['right'] <= s['right']+1, metrics
            assert f['top'] >= s['top']-1 and f['bottom'] <= s['bottom']+1, metrics
            timeline=page.evaluate('''()=>{const scroll=document.querySelector('.me-choreo-scroll').getBoundingClientRect();return [...document.querySelectorAll('.me-choreo-block')].map(n=>({bottom:n.getBoundingClientRect().bottom,limit:scroll.bottom,font:parseFloat(getComputedStyle(n.querySelector('strong')).fontSize)}))}''')
            assert all(n['bottom']<=n['limit']-2 for n in timeline),'Timeline blocks are vertically clipped'
            assert all(n['font']>=12 for n in timeline),'Timeline text is too small'
            page.screenshot(path=str(OUT/f'{effect}-{width}.png'))
        page.set_viewport_size({'width':1440,'height':1000})
        for size in ['1080x1920','1080x1080','1920x1080']:
            page.locator('#canvasPreset').select_option(size,force=True)
            page.wait_for_timeout(100)
            ratio=page.locator('#frame').evaluate('(n)=>n.clientWidth/n.clientHeight')
            w,h=map(int,size.split('x'))
            assert abs(ratio-w/h)<.02,(effect,size,ratio)
        before=scheme(page)
        page.click('#languageButton')
        page.click('#themeButton')
        page.wait_for_function('getComputedStyle(document.querySelector(".tc-header")).backgroundColor==="rgb(255, 255, 255)"')
        assert scheme(page)==before, 'Editor preferences mutated composition'
        page.screenshot(path=str(OUT/f'{effect}-light-en.png'))
        page.click('#languageButton')
        page.click('#themeButton')
        if effect=='card-login':
            edit(page,'scene.title','你好，世界。')
            edit(page,'scene.accent','#a855f7')
            for font in ['stg:inter','stg:noto-sc','stg:noto-jp-black','stg:noto-kr-black']:
                edit(page,'typography.fontFamily',font)
                page.wait_for_timeout(120)
                assert scheme(page)['typography']['fontFamily']==font
            edit(page,'typography.fontFamily','stg:noto-sc')
            for frame in [0,6,18,32,35,48,63,90,96,108]:
                page.evaluate(f'CardMotionEditor.seek({frame}/60)')
                page.locator('#canvas').screenshot(path=str(OUT/f'login-frame-{frame:03}.png'))
            # Verify frame-level size/easing and the white-face crossover.
            assert page.evaluate('CardMotion.loginFrame(CardMotionEditor.getScheme(),.575).front') is False
            assert page.evaluate('CardMotion.loginFrame(CardMotionEditor.getScheme(),.577).front') is True
        else:
            page.click('#openLibrary')
            count=len(scheme(page)['cards'])
            page.locator('[data-candidate="construct-cloud-paper"]').evaluate('(n)=>n.click()')
            assert len(scheme(page)['cards'])==count, 'Candidate selection inserted an asset'
            page.locator('[data-insert="construct-cloud-paper"]').evaluate('(n)=>n.click()')
            assert len(scheme(page)['cards'])==count+1
            assert page.locator('#selectedAssets').is_hidden()
            page.click('#closeLibrary')
            page.click('#assetToggle')
            page.locator('[data-edit]').first.click()
            page.locator('[data-card-key="scale"]').evaluate("n=>{n.value=1.3;n.dispatchEvent(new Event('input',{bubbles:true}));}")
            assert scheme(page)['cards'][0]['scale']==1.3
            page.locator('[data-move="1"]').click()
            assert scheme(page)['cards'][1]['scale']==1.3
            page.keyboard.press('Escape')
            page.keyboard.press('Escape')
            # Custom animated SVG from the packaged originals is parsed, not frozen.
            page.click('#openLibrary')
            page.locator('#uploadAssets').set_input_files(ROOT/'site/assets/cardbot/cardbot-00.svg')
            page.wait_for_function('CardMotionEditor.getScheme().customAssets.length>0')
            assert scheme(page)['customAssets'][-1]['kind']=='cardbot'
            page.click('#insertCandidate')
            page.click('#closeLibrary')
        changed=scheme(page)
        with page.expect_download() as download:
            page.click('#saveScheme')
        download.value.save_as(OUT/f'{effect}-scheme.json')
        page.click('#restoreScheme')
        page.wait_for_function(f'CardMotionEditor.getScheme().effect==="{effect}"')
        page.locator('#schemeFile').set_input_files(OUT/f'{effect}-scheme.json')
        page.wait_for_timeout(350)
        assert scheme(page)==changed, 'Scheme round trip lost state'
        manifest=page.evaluate('CardMotionEditor.manifest()')
        assert manifest['composition']==changed
        assert page.evaluate('(m)=>CellMotionAI.validate(m).valid',manifest)
        (OUT/f'{effect}-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        # Open the actual AI component preview, carrying edited live state.
        page.click('#aiButton')
        with page.expect_popup() as popup:
            page.locator('[data-ai="preview"]').click()
        demo=popup.value
        demo.wait_for_function('document.querySelector("#demoPlayer").duration>0')
        demo.wait_for_timeout(300)
        assert demo.evaluate('document.querySelector("#demoPlayer").manifest.composition')==changed
        demo.locator('[data-player-action="pause"]').click()
        demo.locator('#demoSeek').evaluate("n=>{n.value=1;n.dispatchEvent(new Event('input'));}")
        iframe=demo.frames[1]
        iframe.wait_for_function('!!window.CardMotionEditor')
        assert iframe.evaluate('CardMotionEditor.getScheme()')==changed
        demo.locator('[data-player-action="restart"]').click()
        demo.locator('[data-player-action="pause"]').click()
        update=json.loads(json.dumps(changed));update['motion']['speed']=1.4
        demo.evaluate('(c)=>document.querySelector("#demoPlayer").update(c)',update)
        demo.wait_for_timeout(250)
        assert iframe.evaluate('CardMotionEditor.getScheme().motion.speed')==1.4
        for w in [1440,390,320]:
            demo.set_viewport_size({'width':w,'height':900})
            assert demo.evaluate('document.documentElement.scrollWidth<=innerWidth')
        demo.close()
        # Export a real square/portrait frame and deterministic GIF/MP4 at exact custom dimensions.
        page.locator('#canvasPreset').select_option('custom',force=True)
        edit(page,'canvas.width',480)
        edit(page,'canvas.height',640 if effect=='card-login' else 270)
        page.evaluate('CardMotionEditor.seek(1.8)')
        page.click('#exportShortcut')
        page.locator('#exportFps').select_option('15',force=True)
        for fmt,selector in [('png','#exportPng'),('gif','#exportGif'),('mp4','#exportMp4')]:
            with page.expect_download(timeout=120000) as download:
                page.click(selector)
            path=OUT/f'{effect}-test.{fmt}'
            download.value.save_as(path)
            assert path.stat().st_size>100
            if fmt in ['png','gif']:
                image=Image.open(path)
                assert image.size==(480,640 if effect=='card-login' else 270)
                if fmt=='gif':assert image.n_frames>10
            else:
                movie='data:video/mp4;base64,'+base64.b64encode(path.read_bytes()).decode()
                metadata=page.evaluate('''async src=>{const v=document.createElement('video');v.muted=true;v.src=src;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(new Error('Exported MP4 is not decodable'));});return {width:v.videoWidth,height:v.videoHeight,duration:v.duration}}''',movie)
                assert metadata['width']==480 and metadata['height']==(640 if effect=='card-login' else 270)
                assert abs(metadata['duration']-(3 if effect=='card-login' else 3.4))<.15,metadata
            print('EXPORT',effect,fmt,path.stat().st_size,flush=True)
        assert not errors, errors
        print('PASS',effect,'responsive, scheme, controls, AI, PNG/GIF/MP4',flush=True)
        page.close()
    browser.close()
