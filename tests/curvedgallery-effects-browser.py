"""Pixel and state checks for reusable effects; artifacts stay outside the repository."""
import base64
import io
import json
import cv2
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output' / 'curved-gallery-reference' / 'image-effects'
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4177/curvedgallery.html'
image = Image.new('RGB', (480, 360))
draw = ImageDraw.Draw(image)
for x in range(0, 480, 10):
    for y in range(0, 360, 10):
        draw.rectangle((x, y, x+9, y+9), fill=(x*255//480, y*255//360, 220 if (x+y)//10 % 2 else 40))
buffer = io.BytesIO(); image.save(buffer, 'PNG')
data = 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode()

def scheme(page):
    return page.evaluate('JSON.parse(JSON.stringify(CurvedGallery.collectScheme()))')

def edit(page, key, value):
    page.locator(f'[data-image-effect="{key}"]').evaluate('(n,v)=>{n.value=v;n.dispatchEvent(new Event("input",{bubbles:true}))}', str(value))

def pixels(page, time=.3):
    url=page.evaluate('''t=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');CurvedGallery.render(ctx,640,360,t);return c.toDataURL()}''', time)
    return np.asarray(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA'))

def export(page, kind):
    with page.expect_download(timeout=180000) as download:
        page.evaluate('(kind)=>CurvedGallery.exportFile(kind)',kind)
    file = OUT / f'effects.{kind}'
    download.value.save_as(file)
    assert '已生成' in page.locator('#exportStatus').inner_text() or 'saved' in page.locator('#exportStatus').inner_text()
    return file

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':1440,'height':1000}, accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function('window.CurvedGallery && document.fonts.check("400 64px " + STGFontLibrary.family(CurvedGallery.collectScheme().settings.font))')
    original=scheme(page)
    composition={**original,'assets':[{'id':f'photo-{i}','imageName':f'fixture-{i}.png','fileType':'image/png','originalDataUrl':data} for i in range(2)]}
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)',composition)
    page.locator('#contentList button').first.click()
    assert page.locator('#imageEffect option').count()==8
    assert page.locator('#imageLook option').count()==8
    untouched=scheme(page)['assets'][1]
    base=pixels(page)
    deltas=[]
    for effect in range(7):
        edit(page,'effect',effect)
        edit(page,'effectRadius',1)
        edit(page,'hoverDistortionStrength',.15)
        current=pixels(page)
        delta=float(np.abs(current.astype('int16')-base.astype('int16')).mean())
        assert delta>.1,(effect,delta)
        assert scheme(page)['assets'][1]==untouched
        deltas.append(round(delta,3))
    print('Actual pixel differences for all seven parallax effects:',deltas)
    edit(page,'effect',2)
    assert np.abs(pixels(page,.3).astype('int16')-pixels(page,.7).astype('int16')).sum()>1000
    edit(page,'effect',-1)
    assert np.array_equal(pixels(page),base),'No effect must preserve image colors and orientation'
    for look in ['fog','neon','trail','reed','frost','crystal','pink']:
        edit(page,'look',look)
        assert np.abs(pixels(page).astype('int16')-base.astype('int16')).mean()>.1,look
        assert scheme(page)['assets'][1]==untouched
        edit(page,'lookStrength',0)
        assert np.abs(pixels(page).astype('int16')-base.astype('int16')).mean()<.6,'zero-strength look must restore original'
        edit(page,'lookStrength',1)
    edit(page,'look','crystal');edit(page,'effect',1);edit(page,'focusX',.25)
    edit(page,'uvScale',.84);edit(page,'parallaxIntensity',.3)
    page.locator('#cropX').fill('0.2')
    before=scheme(page)['assets'][0]
    replacement=io.BytesIO();Image.new('RGB',(480,360),'#42d8bd').save(replacement,'PNG')
    page.locator('#replaceImage').set_input_files({'name':'new.png','mimeType':'image/png','buffer':replacement.getvalue()})
    page.wait_for_function('CurvedGallery.collectScheme().assets[0].imageName==="new.png"')
    replaced=scheme(page)['assets'][0]
    assert replaced['id']==before['id'] and replaced['effects']==before['effects'] and replaced['cropX']==.2
    assert '已保留' in page.locator('#schemeStatus').inner_text()
    page.locator('#moveDown').click()
    assert scheme(page)['assets'][1]==replaced
    saved=scheme(page)
    with page.expect_download() as download:page.locator('#saveScheme').click()
    download.value.save_as(OUT/'scheme.json')
    assert json.loads((OUT/'scheme.json').read_text())==saved
    page.wait_for_timeout(1000);page.reload()
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().assets.length===2')
    assert scheme(page)==saved
    page.locator('#clearScheme').click()
    page.locator('#importScheme').set_input_files(str(OUT/'scheme.json'))
    page.wait_for_function('CurvedGallery.collectScheme().assets.length===2')
    assert scheme(page)==saved
    invalid=json.loads(json.dumps(saved));invalid['assets'][0]['effects']['effect']=9
    page.locator('#importScheme').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(invalid).encode()})
    page.wait_for_timeout(200);assert scheme(page)==saved
    # Parallax Studio imports both per-image type and global shader controls.
    backup={'version':1,'settings':{'uvScale':.82,'grainStrength':.13,'effectRadius':.6,'hoverDistortionStrength':.11},'images':[{'name':'one.png','src':data,'effect':2},{'name':'two.png','src':data,'effect':5}]}
    page.locator('#parallaxImport').set_input_files({'name':'parallax.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
    page.wait_for_function('CurvedGallery.collectScheme().assets[0].imageName==="one.png"')
    imported=scheme(page)
    assert [a['effects']['effect'] for a in imported['assets']]==[2,5]
    assert all(a['effects']['uvScale']==.82 and a['effects']['grainStrength']==.13 for a in imported['assets'])
    # Hover responds to the actual projected image and leaves deterministic export unaffected.
    page.locator('#contentList button').first.click()
    edit(page,'activation','hover');edit(page,'strength',1)
    page.evaluate('CurvedGallery.seek(.3)')
    page.locator('#exitImagePreview').click()
    fixed=pixels(page)
    preview_before=page.locator('#canvas').screenshot()
    canvas=page.locator('#canvas').bounding_box()
    point=page.evaluate('''()=>{const s=CurvedGallery.collectScheme().settings,p=CurvedGalleryMotion.pose(s,.3);for(let i=0;i<s.slots;i+=2){const q=CurvedGalleryMotion.panelPoints(s,p,i,.5,.5);if(q.x>200&&q.x<1720&&q.y>100&&q.y<980&&Math.cos(i*Math.PI*2/s.slots+p.angle)>.25)return q}throw Error('No visible test panel')}''')
    page.mouse.move(canvas['x']+canvas['width']*point['x']/1920,canvas['y']+canvas['height']*point['y']/1080)
    page.wait_for_timeout(500)
    assert page.locator('#canvas').screenshot()!=preview_before,'Mouse hover must change the actual image preview'
    assert np.array_equal(pixels(page),fixed),'Export cannot depend on a previous mouse position'
    # All formats use the same textured, filtered renderer.
    page.locator('#canvasPreset').select_option('custom')
    page.locator('#canvasWidth').fill('640');page.locator('#canvasWidth').dispatch_event('change')
    page.locator('#canvasHeight').fill('360');page.locator('#canvasHeight').dispatch_event('change')
    page.evaluate('CurvedGallery.seek(.3)')
    expected=pixels(page)
    png=export(page,'png')
    assert np.abs(np.asarray(Image.open(png).convert('RGBA')).astype('int16')-expected.astype('int16')).mean()<.05
    page.locator('#exportShortcut').click()
    page.locator('#exportDuration').select_option('custom');page.locator('#customDuration').fill('0.6')
    page.locator('#exportFps').select_option('15')
    gif=export(page,'gif');assert Image.open(gif).n_frames>1
    mp4=export(page,'mp4');assert mp4.stat().st_size>1000
    video=cv2.VideoCapture(str(mp4))
    assert int(video.get(cv2.CAP_PROP_FRAME_COUNT))==9
    video.set(cv2.CAP_PROP_POS_FRAMES,4);ok,frame=video.read();assert ok
    decoded=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)
    assert np.abs(decoded.astype('int16')-pixels(page,4/15)[:,:,:3].astype('int16')).mean()<8,'Encoded video must retain the real filtered pixels'
    video.release()
    page.locator('#canvasWidth').fill('320');page.locator('#canvasWidth').dispatch_event('change')
    page.locator('#canvasHeight').fill('320');page.locator('#canvasHeight').dispatch_event('change')
    square_expected=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=c.height=320;const ctx=c.getContext('2d');CurvedGallery.render(ctx,320,320,.3);return Array.from(ctx.getImageData(0,0,320,320).data)}''')
    square=export(page,'png')
    assert np.abs(np.asarray(Image.open(square).convert('RGBA')).astype('int16')-np.array(square_expected,dtype='int16').reshape(320,320,4)).mean()<.05
    square.replace(OUT/'effects-square.png')
    # Seven baked examples preserve their approved pixels; replacing activates the assigned look.
    page.goto(URL+'?demo=portraits')
    page.wait_for_function('window.CurvedGallery && CurvedGallery.collectScheme().assets.length===7',timeout=90000)
    page.wait_for_timeout(500)
    assert all(a['effects']['lookBaked'] for a in scheme(page)['assets'])
    page.locator('#contentList button').nth(5).click()
    assert page.locator('#imageLook').input_value()=='crystal'
    page.locator('#replaceImage').set_input_files({'name':'own.png','mimeType':'image/png','buffer':buffer.getvalue()})
    page.wait_for_function('CurvedGallery.collectScheme().assets[5].imageName==="own.png"')
    assert scheme(page)['assets'][5]['effects']['look']=='crystal'
    assert not scheme(page)['assets'][5]['effects']['lookBaked']
    page.locator('#languageButton').click();page.locator('#themeButton').click()
    assert page.locator('#imageLook').input_value()=='crystal'
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function('document.documentElement.scrollWidth<=window.innerWidth+1',timeout=5000)
    assert not errors,errors
    print('PASS seven real shader effects, seven editable looks, replacement/order/state/import, hover/export isolation, real matching PNG/GIF/MP4 and mobile/theme/language')
    browser.close()
