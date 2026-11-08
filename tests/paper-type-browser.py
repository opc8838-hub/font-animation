"""Exercise the actual Paper Type editor and inspect its exported media."""
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
SITE = ROOT / 'site'
OUT = ROOT / 'output/paper-type'
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'


def capture_canvas(page, name):
    data = page.locator('#paperCanvas').evaluate('(canvas) => canvas.toDataURL().split(",")[1]')
    (OUT / name).write_bytes(base64.b64decode(data))


def select(page, selector, value):
    page.locator(selector).select_option(value, force=True)


def download(page, selector, name):
    with page.expect_download(timeout=180000) as event:
        page.locator(selector).click()
    path = OUT / name
    event.value.save_as(path)
    page.wait_for_function('!document.querySelector("#exportPng").disabled')
    return path


try:
    with sync_playwright() as p:
        candidates = [Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')]
        candidates += list((Path.home() / '.cache/puppeteer/chrome').glob('win64-*/chrome-win64/chrome.exe'))
        executable = next((str(path) for path in reversed(candidates) if path.is_file()), None)
        browser = p.chromium.launch(executable_path=executable, headless=True)
        page = browser.new_page(viewport={'width': 1500, 'height': 1000}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.goto(base + 'paper-type.html?from=gallery')
        page.wait_for_function('window.CellMotionPaperType?.ready')
        page.wait_for_timeout(500)
        assert page.evaluate('CellMotionPaperType.getScheme().rows.map(r=>r.text)') == ['16', 'PAPERS', 'jpg.']
        assert page.evaluate('document.fonts.check("40px \'STG Papyrus\'")')
        page.screenshot(path=str(OUT / 'desktop.png'), full_page=True)
        capture_canvas(page, 'default.png')
        # Three complete and simultaneously visible panels, with room for all ink.
        with Image.open(OUT / 'default.png') as im:
            w, h = im.size
            for i in range(3):
                part = im.crop((w*.08, h*(i/3+.03), w*.9, h*(i/3+.25))).convert('L')
                assert sum(part.histogram()[:75]) > 250
        assert page.locator('#font option:not([hidden])').count() > 40
        page.locator('#text').fill('纸上生活\nHello 2026')
        page.wait_for_timeout(1000)
        assert page.evaluate('CellMotionPaperType.getScheme().rows[1].text') == 'PAPERS'
        select(page, '#paper', '1')
        page.locator('[data-row="paper-2"]').click()
        select(page, '#paper', '2')
        page.locator('#text').fill('PAPER / 02')
        page.wait_for_timeout(500)
        assert page.evaluate('CellMotionPaperType.getScheme().rows.map(r=>r.paper)') == ['1', '2', '3']
        page.locator('#moveUp').click()
        assert page.evaluate('CellMotionPaperType.getScheme().rows[0].id') == 'paper-2'
        assert page.evaluate('CellMotionPaperType.getScheme().rows[0].paper') == '2'
        page.locator('#moveDown').click()
        # Persistent uploaded media belongs to the selected stable block ID.
        Image.new('RGB', (200, 100), '#8caba2').save(OUT / 'background.png')
        page.locator('#backgroundFile').set_input_files(OUT / 'background.png')
        page.wait_for_function('CellMotionPaperType.getScheme().rows[1].paper === "upload"')
        page.wait_for_timeout(700)
        saved = download(page, '#saveScheme', 'scheme.json')
        scheme = json.loads(saved.read_text(encoding='utf-8'))
        assert scheme['rows'][1]['media']['url'].startswith('data:image/png;base64,')
        page.goto(base + 'paper-type.html')
        page.wait_for_function('window.CellMotionPaperType?.ready')
        assert page.evaluate('CellMotionPaperType.getScheme().rows[0].text') == '纸上生活\nHello 2026'
        assert page.evaluate('CellMotionPaperType.getScheme().rows[1].media.name') == 'background.png'
        page.locator('#resetScheme').click()
        page.locator('#schemeFile').set_input_files(saved)
        page.wait_for_function('CellMotionPaperType.getScheme().rows[1].paper === "upload"')
        page.locator('[data-row="paper-2"]').click()
        page.locator('#applyBackground').click()
        assert page.evaluate('CellMotionPaperType.getScheme().rows.every(r=>r.paper==="upload")')
        page.locator('#removeBackground').click()
        assert page.evaluate('CellMotionPaperType.getScheme().rows.map(r=>r.paper)') == ['upload', 'color', 'upload']
        page.locator('#addRow').click()
        assert page.locator('#rowList button').count() == 4
        page.locator('#deleteRow').click()
        assert page.locator('#rowList button').count() == 3
        page.locator('#clearScheme').click()
        assert page.evaluate('CellMotionPaperType.getScheme().rows.length') == 1
        assert page.locator('#deleteRow').is_disabled()
        page.locator('#text').fill('Solo')
        page.locator('#replay').click()
        page.wait_for_timeout(120)
        assert page.evaluate('CellMotionPaperType.playing')
        page.locator('#pause').click()
        page.locator('#resetScheme').click()
        page.locator('#languageToggle').click()
        assert page.locator('html').get_attribute('lang') == 'en'
        page.locator('#themeToggle').click()
        assert page.locator('body').get_attribute('data-editor-theme') == 'dark'
        page.screenshot(path=str(OUT / 'desktop-dark.png'), full_page=True)
        page.locator('#languageToggle').click()
        page.locator('#themeToggle').click()
        # Compare every channel; Canvas may round antialiasing by one level.
        page.locator('#exportShortcut').click()
        png = download(page, '#exportPng', 'full-size.png')
        data = page.evaluate('''async () => { const c=document.createElement('canvas'); c.width=1080;c.height=1440;
          await CellMotionPaperType.render(c,CellMotionPaperType.time);return c.toDataURL().split(',')[1]; }''')
        (OUT / 'renderer.png').write_bytes(base64.b64decode(data))
        with Image.open(png) as a, Image.open(OUT / 'renderer.png') as b:
            assert a.size == (1080, 1440)
            difference = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
            max_error = max(hi for lo, hi in difference.getextrema())
            assert max_error <= 1
        # All supported aspect ratios update the stage immediately.
        for preset in ['1920x1080', '1080x1920', '1080x1080']:
            select(page, '#canvasPreset', preset)
            page.wait_for_timeout(150)
            rect = page.locator('#compositionFrame').bounding_box()
            width, height = map(int, preset.split('x'))
            assert abs(rect['width']/rect['height'] - width/height) < .01
        select(page, '#canvasPreset', 'custom')
        page.locator('#canvasWidth').fill('360'); page.locator('#canvasWidth').press('Tab')
        page.locator('#canvasHeight').fill('480'); page.locator('#canvasHeight').press('Tab')
        select(page, '#exportFps', '15')
        select(page, '#exportDuration', 'custom')
        page.locator('#customDuration').fill('2')
        gif = download(page, '#exportGif', 'motion.gif')
        mp4 = download(page, '#exportMp4', 'motion.mp4')
        with Image.open(gif) as im:
            assert im.size == (360, 480) and im.n_frames == 30
            im.seek(0); first = im.convert('RGB').copy(); im.seek(20); last = im.convert('RGB')
            assert ImageChops.difference(first, last).getbbox()
        assert mp4.stat().st_size > 10000
        probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,duration', '-of', 'json', str(mp4)], capture_output=True, text=True, check=True)
        stream = json.loads(probe.stdout)['streams'][0]
        assert (stream['codec_name'], stream['width'], stream['height'], stream['r_frame_rate'], stream['duration']) == ('h264', 360, 480, '15/1', '2.000000')
        # GIF and trimmed video keep their own timelines and survive reordering.
        colors = [Image.new('RGB', (160, 120), color) for color in ['#e36c68', '#6cc38e', '#6c8ee3']]
        colors[0].save(OUT / 'background.gif', save_all=True, append_images=colors[1:], duration=200, loop=0)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x120:rate=10:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(OUT / 'background.mp4')], check=True)
        page.locator('[data-row="paper-1"]').click()
        page.locator('#backgroundFile').set_input_files(OUT / 'background.gif')
        page.wait_for_function('CellMotionPaperType.getScheme().rows[0].media?.name === "background.gif"')
        page.locator('[data-row="paper-2"]').click()
        page.locator('#backgroundFile').set_input_files(OUT / 'background.mp4')
        page.wait_for_function('CellMotionPaperType.getScheme().rows[1].media?.name === "background.mp4"')
        page.locator('#trimStart').wait_for(state='visible')
        page.locator('#trimStart').fill('0.5')
        page.locator('#trimEnd').fill('1.5')
        page.locator('#trimStartHandle').evaluate('(el)=>{el.value=.6;el.dispatchEvent(new Event("input",{bubbles:true}))}')
        assert page.evaluate('CellMotionPaperType.getScheme().rows[1].media.videoStart') == .6
        page.locator('#moveUp').click()
        assert page.evaluate('CellMotionPaperType.getScheme().rows[0].media.videoEnd') == 1.5
        page.locator('#moveDown').click()
        media_scheme = download(page, '#saveScheme', 'media-scheme.json')
        page.reload()
        page.wait_for_function('window.CellMotionPaperType?.ready')
        assert page.evaluate('CellMotionPaperType.getScheme().rows[1].media.videoStart') == .6
        page.locator('#schemeFile').set_input_files(media_scheme)
        page.wait_for_timeout(800)
        for at in [.05, .25, .05]:
            page.evaluate('(at)=>CellMotionPaperType.seek(at)', at)
            page.wait_for_timeout(300)
            capture_canvas(page, f'media-{at}.png')
        with Image.open(OUT / 'media-0.05.png') as a, Image.open(OUT / 'media-0.25.png') as b:
            assert ImageChops.difference(a.convert('RGB'), b.convert('RGB')).getbbox()
        page.locator('#exportShortcut').click()
        select(page, '#exportFps', '15'); select(page, '#exportDuration', 'custom')
        page.locator('#customDuration').fill('1')
        download(page, '#exportGif', 'media-motion.gif')
        download(page, '#exportMp4', 'media-motion.mp4')
        with Image.open(OUT / 'media-motion.gif') as im:
            assert im.n_frames == 15
        # Produce the catalog loop through the real encoder, with all three blocks.
        page.locator('#resetScheme').click()
        select(page, '#canvasPreset', 'custom')
        page.locator('#canvasWidth').fill('540'); page.locator('#canvasWidth').press('Tab')
        page.locator('#canvasHeight').fill('720'); page.locator('#canvasHeight').press('Tab')
        select(page, '#exportFps', '24'); select(page, '#exportDuration', 'cycle')
        download(page, '#exportMp4', 'catalog-source.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'catalog-source.mp4'), '-vf', 'scale=390:520,pad=960:600:285:40:0xf8f7f2', '-c:v', 'libx264', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(SITE / 'assets/previews/paper-type-card.mp4')], check=True)
        poster = Image.new('RGB', (960, 600), '#f8f7f2')
        with Image.open(OUT / 'full-size.png') as im:
            poster.paste(im.convert('RGB').resize((390, 520), Image.Resampling.LANCZOS), (285, 40))
        poster.save(SITE / 'final_paper-type.png')
        # Mobile order and page overflow.
        page.locator('#resetScheme').click()
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(500)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('.tc-center').bounding_box()['y'] < page.locator('.tc-content').bounding_box()['y']
        page.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
        assert not errors, errors
        (OUT / 'verification.json').write_text(json.dumps({'threeBlocks': True, 'independentTextAndBackground': True, 'uploadPersistence': True,
            'reorder': True, 'singleBlockMotion': True, 'schemeRoundTrip': True, 'pngMaxChannelError': max_error, 'gifFrames': 30,
            'mp4Bytes': mp4.stat().st_size, 'mp4Codec': stream, 'animatedBackgrounds': True, 'videoTrimPersistence': True,
            'mobileOverflow': False, 'consoleErrors': errors}, indent=2), encoding='utf-8')
        print((OUT / 'verification.json').read_text())
        browser.close()
finally:
    server.shutdown()
