"""Focused CellMotion Dither / ASCII browser and export check."""
import base64
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUT = ROOT / "output" / "dither-ascii-check"
OUT.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(SITE)))
Thread(target=server.serve_forever, daemon=True).start()

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        context = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(f"http://127.0.0.1:{server.server_port}/dither-ascii.html?from=gallery")
        page.wait_for_function("Boolean(window.CardMotionEditor)")
        default = page.evaluate("CardMotionEditor.getScheme()")
        (OUT / "default.json").write_text(json.dumps(default, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        assert page.locator(".tc-content").is_visible()
        assert page.locator(".tc-center").is_visible()
        assert page.locator("#inspector").is_visible()

        result = page.evaluate("""() => {
          const s=CardMotionEditor.getScheme(),c=document.createElement('canvas');c.width=240;c.height=300;
          const g=c.getContext('2d'),render=(t)=>{CardMotionEditor.draw(g,t,240,300);return c.toDataURL()};
          return {source:render(0),flutter:render(.25),dither:render(2),repeat:render(2),end:render(CardMotion.duration(s))};
        }""")
        assert result["source"] != result["dither"]
        assert result["source"] != result["flutter"]
        assert result["dither"] == result["repeat"]
        assert result["source"] == result["end"]
        poster = page.evaluate("""() => {const c=document.createElement('canvas');c.width=960;c.height=720;CardMotionEditor.draw(c.getContext('2d'),2.3,960,720);return c.toDataURL('image/png').split(',')[1]}""")
        (OUT / "poster.png").write_bytes(base64.b64decode(poster))
        page.locator('[data-path="scene.mode"]').select_option("dither")
        assert page.evaluate("CardMotionEditor.getScheme().scene.mode") == "dither"
        assert page.evaluate("CardMotionEditor.getScheme().scene.cellSize") == 15
        dither = page.evaluate("""() => {const c=document.createElement('canvas');c.width=960;c.height=720;CardMotionEditor.draw(c.getContext('2d'),2.3,960,720);return c.toDataURL('image/png').split(',')[1]}""")
        (OUT / "dither.png").write_bytes(base64.b64decode(dither))
        ink = Image.open(OUT / "dither.png").crop((70, 110, 470, 500))
        assert sum(pixel[0] < 210 and pixel[1] < 215 and pixel[2] < 190 for pixel in ink.get_flattened_data()) > 500
        right_wing = Image.open(OUT / "dither.png").crop((500, 90, 780, 520))
        assert sum(pixel[0] < 210 and pixel[1] < 215 and pixel[2] < 190 for pixel in right_wing.get_flattened_data()) > 500
        page.locator('[data-swatch="#8bb0e9"]').click()
        assert page.evaluate("CardMotionEditor.getScheme().scene.foreground") == "#8bb0e9"
        assert page.locator('[data-swatch="#8bb0e9"]').get_attribute("aria-pressed") == "true"
        ascii_frame = page.evaluate("""() => {const c=document.createElement('canvas');c.width=240;c.height=300;CardMotionEditor.draw(c.getContext('2d'),2,240,300);return c.toDataURL()}""")
        assert ascii_frame != result["dither"]
        page.locator('[data-path="scene.mask"]').select_option("circle")
        page.locator('[data-path="scene.strength"]').fill("1.5")
        assert page.evaluate("CardMotionEditor.getScheme().scene.strength") == 1.5
        assert page.evaluate("""async () => {const m=await CardMotionEditor.manifest();return CellMotionAI.validate(m).valid && m.composition.scene.strength===1.5}""")
        page.locator('#openLibrary').click()
        page.locator('#uploadAssets').set_input_files(str(OUT / "poster.png"))
        page.wait_for_function("CardMotionEditor.getScheme().customAssets.length===1")
        uploaded = page.evaluate("CardMotionEditor.getScheme().customAssets[0].libraryId")
        assert page.evaluate("CardMotionEditor.getScheme().cards.length") == 1
        page.locator(f'[data-insert="{uploaded}"]').evaluate("node => node.closest('details').open = true")
        page.locator(f'[data-insert="{uploaded}"]').click()
        page.wait_for_function("CardMotionEditor.getScheme().cards.length===2")
        page.locator('#closeLibrary').click()
        page.locator('#languageButton').click()
        assert page.locator('[data-path="scene.mode"] option:checked').inner_text() == "Dither"
        page.locator('#languageButton').click()
        page.locator('#themeButton').click()
        page.locator('#themeButton').click()

        page.locator('#canvasPreset').select_option("custom")
        page.locator('[data-path="canvas.width"]').fill("240")
        page.locator('[data-path="canvas.height"]').fill("300")
        page.locator('.tc-tabs [data-panel="export"]').click()
        page.locator('#exportFps').select_option("15")
        page.locator('#exportDuration').select_option("custom")
        page.locator('#customDuration').fill("0.5")
        for button, name in [("#exportPng", "frame.png"), ("#exportGif", "motion.gif"), ("#exportMp4", "motion.mp4")]:
            with page.expect_download(timeout=120000) as pending:
                page.locator(button).click()
            path = OUT / name
            pending.value.save_as(path)
            assert path.stat().st_size > 100, name
        page.screenshot(path=str(OUT / "desktop.png"))
        page.set_viewport_size({"width": 390, "height": 844})
        page.screenshot(path=str(OUT / "mobile.png"), full_page=True)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2")
        page.close()
        demo = context.new_page()
        demo.on("pageerror", lambda error: errors.append(str(error)))
        demo.goto(f"http://127.0.0.1:{server.server_port}/archive-motion-demo.html?effect=dither-ascii")
        demo.wait_for_function("document.querySelector('#demoStatus').textContent.includes('就绪')", timeout=30000)
        assert demo.locator('#demoTitle').inner_text() == '网格显影'
        gallery = context.new_page()
        gallery.on("pageerror", lambda error: errors.append(str(error)))
        gallery.goto(f"http://127.0.0.1:{server.server_port}/cellmotion-components.html")
        gallery.locator('a[href*="dither-ascii.html"]').first.wait_for(state="attached")
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
