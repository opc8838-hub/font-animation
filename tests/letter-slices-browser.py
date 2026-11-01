"""Browser check for the Letter Slices editor and real exports."""
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "letter-slices-check"
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT / "site")))
Thread(target=server.serve_forever, daemon=True).start()

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        context = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/letter-slices.html?from=gallery")
        page.wait_for_function("Boolean(window.CellMotionLetterSlices)")
        page.locator("#playButton").click()
        page.screenshot(path=str(OUT / "desktop-editor.png"))
        assert page.locator("#text").input_value() == "a"
        assert page.locator(".me-choreo-block").count() == 5
        for time, name in [(0.1, "start"), (1.8, "echo"), (3.9, "end")]:
            page.evaluate("t => CellMotionLetterSlices.seek(t)", time)
            page.locator("#view").screenshot(path=str(OUT / f"{name}.png"))
        poster = page.evaluate("""() => { const canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1080; CellMotionLetterSlices.render(canvas,1.8); return canvas.toDataURL('image/png').split(',')[1]; }""")
        (OUT / "poster.png").write_bytes(base64.b64decode(poster))
        page.locator("#text").fill("B")
        assert page.evaluate("CellMotionLetterSlices.getScheme().scene.text") == "B"
        page.evaluate("CellMotionLetterSlices.seek(1.8)")
        page.locator("#view").screenshot(path=str(OUT / "B.png"))
        page.locator("#text").fill("字")
        assert page.evaluate("CellMotionLetterSlices.getScheme().scene.text") == "字"
        page.evaluate("CellMotionLetterSlices.seek(1.8)")
        page.locator("#view").screenshot(path=str(OUT / "CJK.png"))
        assert Image.open(OUT / "CJK.png").convert("L").getextrema()[0] < 100
        for character, font in [("字", "noto-sc-black"), ("あ", "noto-jp-black"), ("가", "noto-kr-black")]:
            page.locator("#text").fill(character)
            page.evaluate("""font => { const field=document.querySelector('#font'); field.value='stg:'+font; field.dispatchEvent(new Event('change')); }""", font)
            page.evaluate("async () => { await document.fonts.ready; }")
            page.evaluate("CellMotionLetterSlices.seek(1.8)")
            path = OUT / f"{font}.png"
            page.locator("#view").screenshot(path=str(path))
            assert Image.open(path).convert("L").getextrema()[0] < 100
        with page.expect_download() as download:
            page.evaluate("CellMotionLetterSlices.exportArtwork('png')")
        download.value.save_as(OUT / "Korean-export.png")
        assert Image.open(OUT / "Korean-export.png").convert("L").getextrema()[0] < 100
        page.locator("#text").fill("a")
        page.evaluate("""() => { const field=document.querySelector('#font'); field.value='stg:montserrat'; field.dispatchEvent(new Event('change')); }""")
        page.select_option("#canvasPreset", "custom")
        page.locator("#canvasWidth").fill("256")
        page.locator("#canvasWidth").dispatch_event("change")
        page.locator("#canvasHeight").fill("256")
        page.locator("#canvasHeight").dispatch_event("change")
        page.locator('.tc-tabs button[data-panel="export"]').click()
        page.evaluate("""() => { const field = document.querySelector('#exportDuration'); field.value = 'custom'; field.dispatchEvent(new Event('change')); }""")
        page.locator("#customDuration").fill("0.5")
        page.evaluate("""() => { const field = document.querySelector('#exportFps'); field.value = '15'; field.dispatchEvent(new Event('change')); }""")
        for fmt in ("png", "gif", "mp4"):
            with page.expect_download(timeout=120000) as download:
                page.locator(f"#export{fmt.title()}").click()
            download.value.save_as(OUT / f"export.{fmt}")
        assert Image.open(OUT / "export.png").size == (256, 256)
        assert Image.open(OUT / "export.gif").size == (256, 256)
        assert (OUT / "export.mp4").stat().st_size > 1000
        with page.expect_download() as download:
            page.locator("#saveScheme").click()
        scheme_path = OUT / "scheme.json"
        download.value.save_as(scheme_path)
        page.locator("#clearScheme").click()
        assert page.evaluate("CellMotionLetterSlices.getScheme().scene.text") == ""
        page.locator("#schemeFile").set_input_files(str(scheme_path))
        page.wait_for_function("CellMotionLetterSlices.getScheme().scene.text === 'a'")
        page.locator("#languageButton").click()
        assert page.locator("#languageButton").inner_text() == "中"
        page.locator("#themeButton").click()
        assert page.locator("body").get_attribute("data-editor-theme") == "light"
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT / "mobile-editor.png"))
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2")
        page.set_viewport_size({"width": 1440, "height": 900})
        page.evaluate("""() => {
          for (const [id, value] of [['canvasPreset','1080x1080'],['exportDuration','cycle'],['exportFps','24'],['exportScale','0.5']]) {
            const field=document.querySelector('#'+id); field.value=value; field.dispatchEvent(new Event('change'));
          }
        }""")
        with page.expect_download(timeout=180000) as download:
            page.locator("#exportMp4").click()
        download.value.save_as(ROOT / "site" / "assets" / "previews" / "letter-slices-card.mp4")
        assert not errors, (errors, page.evaluate("[typeof CellMotionBridge, [...document.scripts].map(s => s.src)]"))
        page.goto(f"http://127.0.0.1:{server.server_port}/gallery.html?legacy=1")
        page.wait_for_timeout(500)
        assert page.locator('[data-effect="letter-slices"]').count() == 1, (errors, page.title(), page.locator("body").inner_text()[:500])
        assert "letter-slices.html" in page.locator('[data-effect="letter-slices"] a.effect-link').get_attribute("href")
        assert page.locator('[data-effect="letter-slices"] video.effect-loop').count() == 1
        page.goto(f"http://127.0.0.1:{server.server_port}/cellmotion-components.html")
        page.locator("#search").fill("字形切片")
        page.wait_for_function("document.querySelectorAll('#catalog-grid a[href*=\"letter-slices.html\"]').length > 0")
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
