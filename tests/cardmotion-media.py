"""Catch phase recoloring, stale custom assets, and missing restored video trim UI."""
import base64
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/cardmotion'
OUT.mkdir(parents=True,exist_ok=True)
gif=OUT/'timing-fixture.gif'
Image.new('RGB',(32,32),(240,32,32)).save(gif,save_all=True,append_images=[Image.new('RGB',(32,32),(32,220,80))],duration=[200,200],loop=0)
png=OUT/'replace-fixture.png'
Image.new('RGB',(32,32),(32,80,240)).save(png)
blue='data:image/png;base64,'+base64.b64encode(png.read_bytes()).decode()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(accept_downloads=True)
    page.goto('http://127.0.0.1:4186/carddeck.html?from=gallery',wait_until='networkidle')
    page.wait_for_function('!!window.CardMotionEditor')
    colors=page.evaluate('''()=>{const s=CardMotionEditor.getScheme(),before=CardMotion.phases(s);s.motion.repos=0;const after=CardMotion.phases(s);return after.map(a=>[a.color,before.find(b=>b.id===a.id).color]);}''')
    assert all(a==b for a,b in colors), 'Removing a phase must not recolor the other semantic phases'
    page.evaluate('''async()=>{const s=CardMotionEditor.getScheme();s.cards=[];s.canvas={width:320,height:240};await CardMotionEditor.apply(s);CardMotionEditor.seek(0);}''')
    page.locator('#backgroundUpload').set_input_files(gif)
    page.wait_for_function('!!CardMotionEditor.getScheme().backgroundMedia')
    def pixel(t):
        return page.evaluate('''t=>{const c=document.createElement('canvas');c.width=320;c.height=240;CardMotionEditor.draw(c.getContext('2d'),t,320,240);return [...c.getContext('2d').getImageData(1,1,1,1).data].slice(0,3)}''',t)
    assert pixel(.05)==[240,32,32]
    assert pixel(.25)==[32,220,80]
    assert pixel(.45)==[240,32,32], 'GIF source timing must loop deterministically'
    page.click('#exportShortcut')
    page.locator('#exportDuration').select_option('custom',force=True)
    page.locator('#customDuration').fill('1')
    page.locator('#exportFps').select_option('15',force=True)
    with page.expect_download() as d:
        page.click('#exportGif')
    d.value.save_as(OUT/'background-test.gif')
    exported=Image.open(OUT/'background-test.gif')
    exported.seek(0);assert exported.convert('RGB').getpixel((1,1))== (240,32,32)
    exported.seek(4);assert exported.convert('RGB').getpixel((1,1))== (32,220,80)
    # Updating an existing library ID must replace its decoded resource as well.
    page.evaluate('''async data=>{const s=CardMotionEditor.getScheme();Object.assign(s.customAssets[0],{type:'image/png',kind:'image',dataUrl:data});await CardMotionEditor.apply(s);CardMotionEditor.seek(0);}''',blue)
    assert pixel(0)==[32,80,240], 'A reused asset ID rendered the previous decoded image'
    page.click('[data-panel="content"]')
    page.locator('#backgroundUpload').set_input_files(ROOT/'site/assets/previews/carddeck-card.mp4')
    page.wait_for_function('document.querySelectorAll("#filmstrip img").length===6')
    page.locator('#videoStart').evaluate("n=>{n.value=.4;n.dispatchEvent(new Event('input',{bubbles:true}));}")
    page.locator('#videoEnd').evaluate("n=>{n.value=1.6;n.dispatchEvent(new Event('input',{bubbles:true}));}")
    page.evaluate('CardMotionEditor.seek(2)')
    page.wait_for_function('Math.abs(CardMotionEditor.resources.get(CardMotionEditor.getScheme().backgroundMedia.libraryId).video.currentTime-1.2)<.02')
    page.wait_for_timeout(400)
    page.goto('http://127.0.0.1:4186/carddeck.html',wait_until='networkidle')
    page.wait_for_function('!!window.CardMotionEditor')
    assert page.locator('#filmstrip img').count()==6, 'Restored video lost its trim thumbnails'
    assert page.evaluate('CardMotionEditor.getScheme().backgroundMedia.videoStart')==.4
    assert page.evaluate('CardMotionEditor.getScheme().backgroundMedia.videoEnd')==1.6
    saved=page.evaluate('CardMotionEditor.getScheme()')
    page.click('#aiButton')
    with page.expect_popup() as popup:
        page.click('[data-ai="preview"]')
    demo=popup.value
    demo.wait_for_function('document.querySelector("#demoPlayer").duration>0')
    demo.wait_for_function('document.querySelector("#demoStatus").textContent.includes("已就绪")')
    assert demo.evaluate('document.querySelector("#demoPlayer").manifest.composition')==saved
    demo.locator('[data-player-action="pause"]').click()
    demo.evaluate('document.querySelector("#demoPlayer").seek(2)')
    iframe=demo.frames[1]
    iframe.wait_for_function('Math.abs(CardMotionEditor.resources.get(CardMotionEditor.getScheme().backgroundMedia.libraryId).video.currentTime-1.2)<.02')
    demo.close()
    print('PASS: semantic colors, GIF source/export timing, resource replacement, video trim/autosave',flush=True)
    browser.close()
