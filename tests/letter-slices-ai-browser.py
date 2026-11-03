"""Release checks for responsive words, background media and the actual AI player."""
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
OUT = ROOT / "output" / "letter-slices-ai"
OUT.mkdir(parents=True, exist_ok=True)
FIXTURES = ROOT / "tests" / "fixtures" / "metallic-backgrounds"


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
    server = TestServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(directory)))
    Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}/"


def image(data):
    return Image.open(io.BytesIO(base64.b64decode(data.split(",")[1]))).convert("RGB")


def field(page, name, value):
    page.locator("#" + name).evaluate("""(input,value) => {
      input.value=value; input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }""", str(value))


def ai_action(page, action):
    page.locator(".tc-ai-trigger").click()
    page.locator(f'[data-ai-action="{action}"]').click()


def download_manifest(page, name):
    with page.expect_download() as event:
        ai_action(page, "json")
    path = OUT / name
    event.value.save_as(path)
    manifest = json.loads(path.read_text(encoding="utf-8"))
    jsonschema.validate(manifest, json.loads((ROOT / "site/schemas/cellmotion-component-v1.schema.json").read_text(encoding="utf-8")))
    assert page.evaluate("(m)=>CellMotionAI.validate(m).valid", manifest)
    assert manifest["composition"] == page.evaluate("CellMotionLetterSlices.getScheme()")
    return manifest


def upload(page, filename):
    page.locator("#openBackground").click()
    page.locator("#backgroundFile").set_input_files(str(FIXTURES / filename))
    page.wait_for_function("(n)=>CellMotionLetterSlices.getScheme().scene.backgroundMedia?.name===n", arg=filename)
    page.wait_for_function("document.querySelector('#backgroundStatus').textContent.includes('已更新')")


def render(page, at, width, height):
    return page.evaluate("""async ({at,width,height})=>{
      await CellMotionLetterSlices.prepareFrame(at);
      const c=document.createElement('canvas');c.width=width;c.height=height;
      CellMotionLetterSlices.render(c,at);return c.toDataURL();
    }""", {"at": at, "width": width, "height": height})


server, base = host(ROOT / "site")
code_server = None
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        context = browser.new_context(viewport={"width": 1440, "height": 960}, accept_downloads=True)
        errors = []
        context.on("page", lambda child: child.on("pageerror", lambda error: errors.append(str(error))))
        page = context.new_page()
        page.goto(base + "letter-slices.html?from=gallery")
        page.wait_for_function("CellMotionEffectBridge?.version==='1.0.0'")
        default = page.evaluate("CellMotionLetterSlices.getScheme()")
        assert default == json.loads((ROOT / "site/assets/presets/letter-slices-default.json").read_text(encoding="utf-8"))
        frozen = Image.open(ROOT / "site/final_letter-slices.png").convert("RGB")
        assert ImageChops.difference(image(render(page, 1.8, 1080, 1080)), frozen).getbbox() is None
        assert page.locator(".scheme-actions button").count() == 4
        assert page.locator("[data-ai-action]").count() == 5
        assert page.evaluate("""()=>{
          const blocks=[...document.querySelectorAll('.me-choreo-block')];
          return new Set(blocks.map(b=>getComputedStyle(b).backgroundColor)).size===5
            && blocks.every(b=>parseFloat(getComputedStyle(b).borderRadius)>=12);
        }""")
        page.locator("#pauseForEdit").click()
        assert not page.evaluate("CellMotionLetterSlices.playing")
        assert page.evaluate("CellMotionLetterSlices.time") < default["scene"]["intro"]

        page.locator("#text").fill("GLASS MOTION")
        page.locator("#text").dispatch_event("change")
        page.locator("#fontSettings").evaluate("d=>d.open=true")
        field(page, "trackingExact", 2)
        field(page, "lineHeightExact", 1.3)
        field(page, "positionXExact", 0)
        page.evaluate("async()=>{await document.fonts.ready;}")
        inspector = page.locator(".metal-inspector").bounding_box()
        for preset in ["1600x800", "1920x1080", "1080x1920", "1080x1080"]:
            page.select_option("#canvasPreset", preset, force=True)
            width, height = map(int, preset.split("x"))
            page.evaluate("CellMotionLetterSlices.seek(.1)")
            box = page.locator("#stageFrame").bounding_box()
            assert abs(box["width"] / box["height"] - width / height) < .01
            assert abs(page.locator(".metal-inspector").bounding_box()["width"] - inspector["width"]) < 1
            for at in [.1, 1.8]:
                w, h = round(width * 640 / max(width, height)), round(height * 640 / max(width, height))
                artwork = image(render(page, at, w, h))
                delta = ImageChops.difference(artwork, Image.new("RGB", artwork.size, "white")).convert("L")
                bounds = delta.point(lambda v: 255 if v > 20 else 0).getbbox()
                assert bounds and bounds[0] > 2 and bounds[1] > 2 and bounds[2] < w - 2 and bounds[3] < h - 2, (preset, at, bounds)
                artwork.save(OUT / f"words-{preset}-{at}.png")
        assert page.evaluate("CellMotionLetterSlices.getScheme().scene.text") == "GLASS MOTION"
        page.locator("#text").fill("GLASS\nMOTION")
        page.locator("#text").dispatch_event("change")
        assert page.evaluate("CellMotionLetterSlices.getScheme().scene.text") == "GLASS\nMOTION"
        before = render(page, .1, 400, 400)
        field(page, "trackingExact", 10)
        assert render(page, .1, 400, 400) != before
        page.locator("#text").fill("玻璃 动效")
        field(page, "font", "stg:noto-sc-black")
        page.evaluate("async()=>{await document.fonts.ready;}")
        chinese = image(render(page, .1, 400, 400))
        assert chinese.convert("L").getextrema()[0] < 80
        chinese.save(OUT / "chinese-words.png")
        field(page, "font", "stg:inter")
        page.evaluate("async()=>{await document.fonts.ready;}")
        page.locator("#text").fill("GLASS MOTION")
        field(page, "trackingExact", 2)
        print("PASS complete words, manual breaks, spacing and 10:5 / 16:9 / portrait / square fitting")

        for color in ["#fff0cf", "#dceaff", "#ffffff"]:
            page.locator("#openBackground").click()
            page.locator(f'[data-background-color="{color}"]').click()
            page.wait_for_function("(c)=>CellMotionLetterSlices.getScheme().scene.background===c", arg=color)
            png = image(render(page, .1, 320, 320))
            assert png.getpixel((0, 0)) == tuple(bytes.fromhex(color[1:]))
            assert page.locator(f'[data-background-color="{color}"]').get_attribute("aria-pressed") == "true"
        upload(page, "crop.png")
        image_manifest = download_manifest(page, "image-component.json")
        assert image_manifest["assets"]["embedded"][0]["kind"] == "image"
        upload(page, "delays.gif")
        manifest = download_manifest(page, "gif-component.json")
        assert manifest["assets"]["embedded"][0]["kind"] == "gif"
        assert manifest["assets"]["fonts"][0]["id"] == "stg:inter"
        assert len(manifest["parameterDefinitions"]) == 32
        assert page.evaluate("""m=>m.parameterDefinitions.every(p=>{
          let value={composition:m.composition};
          for(const key of p.path.split('.')) { if(value==null || !(key in value))return false; value=value[key]; }
          return true;
        })""", manifest)
        assert manifest["runtime"]["kind"] == "iframe-bridge"
        page.evaluate("()=>{window.copied=[];CellMotionAI.copyText=async value=>copied.push(value);}")
        ai_action(page, "prompt")
        page.wait_for_function("copied.length===1")
        assert "字距行距" in page.evaluate("copied[0]")
        assert "账号认证" not in page.evaluate("copied[0]")
        ai_action(page, "code")
        page.wait_for_function("copied.length===2")
        code = page.evaluate("copied[1]")
        assert "<cellmotion-player" in code and "GLASS MOTION" in code
        ai_action(page, "params")
        assert page.locator(".tc-ai-dialog").is_visible()
        assert page.locator(".tc-ai-params code").count() == 32
        page.keyboard.press("Escape")
        assert not page.locator(".tc-ai-dialog").is_visible()
        page.locator("#languageButton").click()
        assert page.locator(".tc-ai-trigger").inner_text().startswith("For AI")
        page.locator("#themeButton").click()
        state = page.evaluate("CellMotionLetterSlices.getScheme()")
        for viewport in [{"width": 390, "height": 844}, {"width": 320, "height": 740}]:
            page.set_viewport_size(viewport)
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
            header = page.locator(".tc-header").bounding_box()
            for selector in [".tc-ai-trigger", "#openExport", "#languageButton", "#themeButton"]:
                rect = page.locator(selector).bounding_box()
                assert rect["x"] >= header["x"] and rect["x"] + rect["width"] <= header["x"] + header["width"] + 1
            page.locator(".tc-ai-trigger").click()
            assert page.locator(".tc-ai-menu").is_visible()
            page.keyboard.press("Escape")
            page.screenshot(path=str(OUT / f"mobile-{viewport['width']}.png"))
        assert page.evaluate("CellMotionLetterSlices.getScheme()") == state
        page.set_viewport_size({"width": 1440, "height": 960})
        page.locator("#languageButton").click()
        page.locator("#themeButton").click()
        page.screenshot(path=str(OUT / "desktop.png"))
        print("PASS live Manifest, full parameter guide, both themes/languages and 320px header")

        with page.expect_popup() as event:
            ai_action(page, "preview")
        demo = event.value
        demo.wait_for_function("document.querySelector('#demoPlayer').duration>0")
        child = demo.locator("cellmotion-player").locator("iframe").element_handle().content_frame()
        demo.wait_for_function("""()=>document.querySelector('#demoPlayer').iframe.contentWindow.CellMotionLetterSlices?.getScheme().scene.text==='GLASS MOTION'""")
        assert child.locator(".tc-header").is_hidden()
        assert child.locator(".tc-timeline").is_hidden()
        assert demo.evaluate("document.querySelector('#demoPlayer').manifest.composition") == manifest["composition"]

        def compare_player(at):
            demo.evaluate("(t)=>document.querySelector('#demoPlayer').seek(t)", at)
            demo.wait_for_function("(t)=>document.querySelector('#demoPlayer').iframe.contentWindow.CellMotionLetterSlices.time===t", arg=at)
            actual = child.locator("#view").evaluate("""async (canvas,t)=>{
              await CellMotionLetterSlices.prepareFrame(t);
              await new Promise(requestAnimationFrame);
              return {png:canvas.toDataURL(),w:canvas.width,h:canvas.height};
            }""", at)
            expected = render(page, at, actual["w"], actual["h"])
            assert ImageChops.difference(image(actual["png"]), image(expected)).getbbox() is None, at

        for at in [.05, .2, .6, 1.8]:
            compare_player(at)
        demo.locator('[data-player-action="play"]').click()
        demo.wait_for_function("document.querySelector('#demoPlayer').iframe.contentWindow.CellMotionLetterSlices.playing")
        demo.locator('[data-player-action="pause"]').click()
        demo.wait_for_function("!document.querySelector('#demoPlayer').iframe.contentWindow.CellMotionLetterSlices.playing")
        demo.locator('[data-player-action="restart"]').click()
        demo.wait_for_function("document.querySelector('#demoPlayer').iframe.contentWindow.CellMotionLetterSlices.time<.3")
        print("PASS real popup player, controls and exact GIF/refraction pixels")

        upload(page, "trim-source.mp4")
        field(page, "videoStart", .6)
        field(page, "videoEnd", 2.4)
        field(page, "cropZoomExact", 1.3)
        video_manifest = download_manifest(page, "video-component.json")
        assert video_manifest["assets"]["videos"][0]["trimStart"] == .6
        assert video_manifest["assets"]["videos"][0]["trimEnd"] == 2.4
        assert video_manifest["composition"]["scene"]["backgroundMedia"]["cropZoom"] == 1.3
        updated = video_manifest["composition"]
        updated["scene"]["text"] = "LIVE UPDATE"
        updated["canvas"] = {"width": 1600, "height": 800}
        page.evaluate("(s)=>CellMotionLetterSlices.applyScheme(s,{autoplay:false})", updated)
        demo.evaluate("(s)=>document.querySelector('#demoPlayer').update(s)", updated)
        demo.wait_for_function("""()=>document.querySelector('#demoPlayer').iframe.contentWindow.CellMotionLetterSlices.getScheme().scene.text==='LIVE UPDATE'""")
        assert demo.evaluate("document.querySelector('#demoPlayer').style.aspectRatio") == "1600 / 800"
        for at in [.5, 1.4]:
            compare_player(at)
        # Invalid bridge versions cannot mutate the composition.
        demo.evaluate("""()=>{
          const p=document.querySelector('#demoPlayer');
          p.iframe.contentWindow.postMessage({type:'cellmotion:update',bridgeVersion:'9.0.0',composition:{}},new URL(p.iframe.src).origin);
        }""")
        demo.wait_for_timeout(100)
        assert child.evaluate("CellMotionLetterSlices.getScheme().scene.text") == "LIVE UPDATE"
        child.evaluate("""()=>{
          const composition=CellMotionLetterSlices.getScheme();composition.scene.text='INVALID SOURCE';
          window.postMessage({type:'cellmotion:update',bridgeVersion:'1.0.0',composition},location.origin);
        }""")
        demo.wait_for_timeout(100)
        assert child.evaluate("CellMotionLetterSlices.getScheme().scene.text") == "LIVE UPDATE"
        demo.set_viewport_size({"width": 390, "height": 844})
        assert demo.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        demo.screenshot(path=str(OUT / "mobile-player.png"))
        page.locator("#openExport").click()
        field(page, "exportDuration", "custom")
        field(page, "customDuration", .8)
        field(page, "exportFps", 15)
        field(page, "exportScale", .25)
        for fmt in ["png", "gif", "mp4"]:
            with page.expect_download(timeout=120000) as download:
                page.locator("#export" + fmt.title()).click()
            destination = OUT / ("wide-video-background." + fmt)
            download.value.save_as(destination)
            assert destination.stat().st_size > 1000
            if fmt != "mp4":
                assert Image.open(destination).size == (400, 200)
        print("PASS real wide PNG/GIF/MP4 exports with multiword text and trimmed video")

        (OUT / "embedded-code.html").write_text(code, encoding="utf-8")
        code_server, code_base = host(OUT)
        embedded = context.new_page()
        embedded.goto(code_base + "embedded-code.html")
        embedded.wait_for_function("document.querySelector('cellmotion-player')?.duration>0")
        # The iframe has a different origin from this host; inspect it through Playwright.
        embedded_child = embedded.locator("cellmotion-player").locator("iframe").element_handle().content_frame()
        embedded_child.wait_for_function("CellMotionLetterSlices.getScheme().scene.text==='GLASS MOTION'")
        assert embedded_child.evaluate("CellMotionLetterSlices.getScheme().scene.backgroundMedia.fileType") == "image/gif"
        direct = context.new_page()
        direct.goto(base + "typecascade-component-demo.html?effect=letter-slices")
        direct.wait_for_function("document.querySelector('#demoPlayer').duration>0")
        assert direct.evaluate("document.querySelector('#demoPlayer').manifest.composition") == default
        catalog = context.request.get(base + "cellmotion-catalog.json").json()
        entry = next(effect for effect in catalog["effects"] if effect["id"] == "letter-slices")
        assert entry["status"] == "ready" and entry["webComponent"]["descriptor"] == "effects/letter-slices.component.json"
        assert catalog["recent"][0] == {"id": "letter-slices", "date": "2026-11-03"}
        listing = context.new_page()
        listing.goto(base + "cellmotion-components.html?use=web&q=letter-slices")
        listing.locator('#catalog-grid .card-caption a[href*="letter-slices.html"]').first.wait_for()
        page.locator("#openBackground").click()
        page.locator('[data-background-color="#ffffff"]').click()
        page.wait_for_function("CellMotionLetterSlices.getScheme().scene.backgroundMedia===null")
        assert image(render(page, .5, 320, 320)).getpixel((0, 0)) == (255, 255, 255)
        print("PASS cropped/trimmed video, player update, version rejection, cross-origin copied code and default demo")
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    if code_server:
        code_server.shutdown()
        code_server.server_close()
