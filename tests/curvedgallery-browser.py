"""Run against python -m http.server 4177 --directory site. Artifacts stay outside the repo."""
import base64
import io
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output' / 'curved-gallery-reference' / 'validation'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4177/curvedgallery.html'

def image_data(color):
    data = io.BytesIO()
    Image.new('RGB', (300, 200), color).save(data, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(data.getvalue()).decode()

def scheme(page):
    return page.evaluate('JSON.parse(JSON.stringify(CurvedGallery.collectScheme()))')

def setting(page, key, value):
    page.locator(f'[data-setting="{key}"]').evaluate('(n,v)=>{if(n.type==="checkbox")n.checked=v;else n.value=v;n.dispatchEvent(new Event("input",{bubbles:true}))}', value)

def export(page, kind, name):
    with page.expect_download(timeout=180000) as info:
        page.evaluate('(kind)=>{CurvedGallery.exportFile(kind)}', kind)
    info.value.save_as(OUT / name)
    assert '已生成' in page.locator('#exportStatus').inner_text() or 'saved' in page.locator('#exportStatus').inner_text(), page.locator('#exportStatus').inner_text()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function('window.CurvedGallery && document.querySelector("#timeline button")')
    page.wait_for_timeout(500)
    original = scheme(page)
    assert original['settings']['text'] == 'Sentr'
    assert len(set(page.locator('.me-choreo-block').evaluate_all('(nodes)=>nodes.map(n=>getComputedStyle(n).backgroundColor)'))) == 6
    stage = page.locator('#stage').bounding_box()
    controls = page.locator('.me-stage-controls').bounding_box()
    assert abs(controls['x'] + controls['width'] / 2 - stage['x'] - stage['width'] / 2) < 2
    page.evaluate('CurvedGallery.seek(3.5)')
    page.screenshot(path=str(OUT / 'desktop.png'))

    # v1 autosaves upgrade untouched timing defaults without dropping uploaded images.
    legacy = {**original, 'version': 1, 'settings': {**original['settings'], 'spin': 1.2, 'pullback': 1.15, 'markHold': 0.45, 'reveal': 0.55, 'hold': 1.05, 'cardHeight': 570, 'text': 'My brand'}, 'assets': [
        {'id': 'legacy-photo', 'imageName': 'old.png', 'originalDataUrl': image_data('#e23b48'), 'fileType': 'image/png'}
    ]}
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)', legacy)
    upgraded = scheme(page)
    assert upgraded['version'] == 2 and upgraded['settings']['text'] == 'My brand'
    assert upgraded['assets'][0]['id'] == 'legacy-photo'
    assert upgraded['settings']['pullback'] == original['settings']['pullback']
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)', original)

    # Parallax Studio backup conversion, complete media state follows reorder.
    backup = {'version': 1, 'title': '我的画廊', 'settings': {}, 'images': [
        {'id': 'red', 'name': '红色图片', 'src': image_data('#ff3e42'), 'effect': 2},
        {'id': 'blue', 'name': '蓝色图片', 'src': image_data('#2266ff'), 'effect': 5},
    ]}
    page.locator('#parallaxImport').set_input_files({'name': 'parallax.json', 'mimeType': 'application/json', 'buffer': json.dumps(backup).encode()})
    page.wait_for_function('CurvedGallery.collectScheme().assets.length === 2')
    # Opaque photos must not expose a preset black skeleton during initial rotation.
    pixels = page.evaluate("""()=>{
      const c=document.createElement('canvas');c.width=592;c.height=333;
      const ctx=c.getContext('2d'), s=CurvedGallery.collectScheme().settings;
      const line=CurvedGalleryMotion.timeline(s);
      return [0,.3,.8,line.pullStart/s.speed,line.pullEnd/s.speed].map(t=>{
        CurvedGallery.render(ctx,c.width,c.height,t);
        const a=ctx.getImageData(0,0,c.width,c.height).data;let black=0;
        for(let i=0;i<a.length;i+=4)if(Math.max(a[i],a[i+1],a[i+2])<25)black++;
        return black;
      });
    }""")
    assert pixels[:4] == [0,0,0,0], ('early black strokes',pixels)
    assert pixels[4] > 1000, ('final black mark missing',pixels)

    page.locator('#contentList button').first.click()
    page.locator('#cropX').fill('0.2')
    first_id = scheme(page)['assets'][0]['id']
    page.locator('#moveDown').click()
    assert scheme(page)['assets'][1]['id'] == first_id
    assert scheme(page)['assets'][1]['cropX'] == 0.2
    page.wait_for_timeout(700)
    saved = scheme(page)
    page.reload()
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().assets.length === 2')
    assert scheme(page) == saved
    page.locator('#contentList button').first.click()
    page.locator('#replaceImage').set_input_files({'name': 'replacement.png', 'mimeType': 'image/png', 'buffer': base64.b64decode(image_data('#42d8bd').split(',')[1])})
    page.wait_for_function('CurvedGallery.collectScheme().assets[0].imageName === "replacement.png"')
    assert scheme(page)['assets'][1]['id'] == first_id
    page.evaluate('CurvedGallery.seek(.6)')
    page.screenshot(path=str(OUT / 'photos.png'))

    # Candidate click must never insert; explicit commit is required.
    page.locator('#openLibrary').click()
    before = len(scheme(page)['assets'])
    page.locator('.me-asset-choice').first.click()
    assert len(scheme(page)['assets']) == before
    page.locator('#insertCandidate').click()
    page.wait_for_function('CurvedGallery.collectScheme().assets.length === 3')
    with page.expect_download() as info:
        page.locator('#saveScheme').click()
    info.value.save_as(OUT / 'saved-scheme.json')
    portable = json.loads((OUT / 'saved-scheme.json').read_text())
    assert len(portable['assets']) == 3
    page.locator('#clearScheme').click()
    assert len(scheme(page)['assets']) == 0
    page.locator('#importScheme').set_input_files(str(OUT / 'saved-scheme.json'))
    page.wait_for_function('CurvedGallery.collectScheme().assets.length === 3')
    assert scheme(page) == portable
    page.locator('#importScheme').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{"version":99}'})
    page.wait_for_timeout(100)
    assert scheme(page) == portable

    # Shared font catalog, long text reflows, theme/language preserve composition.
    page.locator('#selectBrand').click()
    for font, text in [('stg:inter', 'An exceptionally long brand name'), ('stg:noto-sc', '让创意自由生长'), ('stg:noto-jp-black', 'クリエイティブ'), ('stg:noto-kr-black', '창의적인 브랜드')]:
        setting(page, 'font', font)
        setting(page, 'text', text)
        page.wait_for_timeout(150)
        page.evaluate('CurvedGallery.seek(3.5)')
        page.screenshot(path=str(OUT / (font.split(':')[1] + '.png')))
    unchanged = scheme(page)
    page.locator('#themeButton').click()
    page.locator('#languageButton').click()
    assert scheme(page) == unchanged
    page.locator('#languageButton').click()
    page.locator('#themeButton').click()

    # Canvas ratio refits immediately, controls remain inside their columns.
    for preset in ['1080x1080', '1080x1920', '1920x1080']:
        page.locator('#canvasPreset').select_option(preset)
        frame = page.locator('.gm-composition-frame').bounding_box()
        w, h = map(int, preset.split('x'))
        assert abs(frame['width'] / frame['height'] - w / h) < 0.005
    # Real exports at small dimensions to keep this regression lightweight.
    page.locator('#canvasPreset').select_option('custom')
    page.locator('#canvasWidth').fill('640'); page.locator('#canvasWidth').dispatch_event('change')
    page.locator('#canvasHeight').fill('360'); page.locator('#canvasHeight').dispatch_event('change')
    page.locator('#exportShortcut').click()
    page.locator('#exportFps').select_option('15')
    page.evaluate('CurvedGallery.seek(.5)')
    export(page, 'png', 'photos.png')
    export(page, 'mp4', 'photos.mp4')
    for font, text in [('stg:inter', 'Sentr'), ('stg:noto-sc', '自由生长'), ('stg:noto-jp-black', 'クリエイティブ'), ('stg:noto-kr-black', '브랜드')]:
        setting(page, 'font', font); setting(page, 'text', text); page.evaluate('CurvedGallery.seek(3.5)')
        export(page, 'png', font.split(':')[1] + '-export.png')
    page.locator('#canvasWidth').fill('360'); page.locator('#canvasWidth').dispatch_event('change')
    page.locator('#canvasHeight').fill('640'); page.locator('#canvasHeight').dispatch_event('change')
    export(page, 'gif', 'portrait.gif')
    animated = Image.open(OUT / 'portrait.gif')
    duration_ms = 0
    for index in range(animated.n_frames):
        animated.seek(index)
        duration_ms += animated.info.get('duration', 0)
    assert duration_ms == round(page.evaluate('CurvedGalleryMotion.timeline(CurvedGallery.collectScheme().settings).total') * 100) * 10
    export(page, 'mp4', 'portrait.mp4')

    page.locator('#resetScheme').click()
    page.wait_for_function('CurvedGallery.collectScheme().settings.text === "Sentr" && CurvedGallery.collectScheme().assets.length === 0')
    page.locator('#replayButton').click()
    assert float(page.locator('#seek').input_value()) < 0.25
    page.locator('#timeline button').nth(3).click()
    assert page.locator('#playButton').inner_text() == '播放'
    assert float(page.locator('#seek').input_value()) > 2.5
    # Actual full-size gallery video uses the authoritative exporter.
    page.locator('#exportFps').select_option('30')
    export(page, 'mp4', 'curvedgallery-card.mp4')
    assert not errors, errors

    mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    mobile.on('pageerror', lambda e: errors.append(str(e)))
    mobile.goto(URL); mobile.wait_for_function('window.CurvedGallery && document.querySelector("#timeline button")'); mobile.wait_for_timeout(300)
    assert mobile.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mobile.evaluate('CurvedGallery.seek(3.5)'); mobile.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
    stage = mobile.locator('#stage').bounding_box(); props = mobile.locator('#inspector').bounding_box()
    assert stage['y'] < props['y']
    mobile.locator('#openLibrary').click()
    drawer = mobile.locator('#libraryDrawer').bounding_box()
    assert drawer['y'] > stage['y'] + stage['height']
    assert not errors, errors
    print('PASS no early black strokes, images, backup conversion, reorder, replacement, reload, save/import/reset/clear, library, four fonts, theme/language, ratios, seek, mobile and real PNG/GIF/H264 exports')
    browser.close()
