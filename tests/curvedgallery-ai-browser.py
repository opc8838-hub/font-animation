"""Live AI handoff, native schema, authoritative player pixels and aligned timing."""
import base64
import io
import json
import threading
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import jsonschema
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'output'/'curved-gallery-reference'/'ai-timeline'
OUT.mkdir(parents=True,exist_ok=True)
URL='http://127.0.0.1:4177/'

def image_url(animated=False):
    out=io.BytesIO()
    frames=[Image.new('RGB',(180,240),color) for color in ['#ff523c','#338be5','#31cba0']]
    if animated:frames[0].save(out,'GIF',save_all=True,append_images=frames[1:],duration=[80,160,300],loop=0)
    else:frames[0].save(out,'PNG')
    return 'data:image/'+('gif' if animated else 'png')+';base64,'+base64.b64encode(out.getvalue()).decode()

def action(page,name):
    page.locator('.tc-ai-trigger').click()
    page.locator(f'[data-ai-action="{name}"]').click()

def pixels(url):
    return np.asarray(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB'))

@contextmanager
def code_host(code):
    (OUT/'embedded-code.html').write_text(code,encoding='utf-8')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(OUT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:yield f'http://127.0.0.1:{server.server_port}/embedded-code.html'
    finally:server.shutdown();server.server_close();thread.join()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':1900,'height':1000},accept_downloads=True)
    page=context.new_page();errors=[]
    context.on('page',lambda child:child.on('pageerror',lambda e:errors.append(str(e))))
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL+'curvedgallery.html')
    page.wait_for_function('window.CellMotionEffectBridge && document.fonts.check("400 64px "+STGFontLibrary.family(CurvedGallery.collectScheme().settings.font))',timeout=60000)
    original=page.evaluate('CurvedGallery.collectScheme()')
    scheme={**original,'settings':{**original['settings'],'text':'comingsoon AI','font':'stg:noto-sc','color':'#17236e','background':'#f4e9de','width':640,'height':360,'pullback':1.8,'markHold':.3},'assets':[
        {'id':'photo','imageName':'photo</script>.png','originalDataUrl':image_url(),'cropX':.22,'cropY':.76,'effects':{'effect':2,'strength':.5,'look':'crystal','lookStrength':.4}},
        {'id':'gif','imageName':'moving.gif','originalDataUrl':image_url(True),'fileType':'image/gif','effects':{'effect':4,'grainStrength':.16}},
        {'id':'vector','imageName':'cloud','originalDataUrl':'library','libraryId':'construct-cloud-paper'}]}
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)',scheme)
    page.evaluate('document.fonts.load("400 64px "+STGFontLibrary.family(CurvedGallery.collectScheme().settings.font))')
    page.evaluate('CurvedGallery.seek(3.7)')
    geometry=page.evaluate('''()=>{
      const bar=document.querySelector('#timeline'),scroll=bar.closest('.me-choreo-scroll'),ruler=document.querySelector('#timelineRuler');
      const b=bar.getBoundingClientRect(),r=ruler.getBoundingClientRect(),line=CurvedGalleryMotion.timeline(CurvedGallery.collectScheme().settings);
      const blocks=[...bar.querySelectorAll('button')].map(n=>{const q=n.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height,start:+n.dataset.start,end:+n.dataset.end,label:n.getAttribute('aria-label'),color:getComputedStyle(n).backgroundColor}});
      return {bar:{x:b.x,w:b.width},ruler:{x:r.x,w:r.width},available:scroll.clientWidth,total:line.total,blocks};
    }''')
    assert abs(geometry['bar']['w']-geometry['available'])<2 and abs(geometry['bar']['w']-geometry['ruler']['w'])<1,geometry
    for block in geometry['blocks']:
        assert abs(block['x']-geometry['bar']['x']-block['start']/geometry['total']*geometry['bar']['w'])<1
        assert abs(block['w']-(block['end']-block['start'])/geometry['total']*geometry['bar']['w'])<1
        assert block['label']
    for i,a in enumerate(geometry['blocks']):
        for b in geometry['blocks'][i+1:]:
            assert min(a['x']+a['w'],b['x']+b['w'])<=max(a['x'],b['x'])+.1 or min(a['y']+a['h'],b['y']+b['h'])<=max(a['y'],b['y'])+.1
    assert len({b['color'] for b in geometry['blocks']})>=6
    print('PASS full-width timeline, aligned lanes and real phase positions')
    page.locator('.tc-timeline').screenshot(path=str(OUT/'aligned-timeline.png'))
    for block in geometry['blocks']:
        page.locator('#timeline button').filter(has_text=block['label'].split(':')[0]).first.click()
        assert abs(float(page.locator('#timeReadout').inner_text().split('/')[0])-block['start'])<.02
    page.locator('#contentList button').first.click()
    with page.expect_download() as download:action(page,'json')
    download.value.save_as(OUT/'curvedgallery-component.json')
    manifest=json.loads((OUT/'curvedgallery-component.json').read_text(encoding='utf-8'))
    current=page.evaluate('CurvedGallery.collectScheme()')
    assert manifest['composition']==current and 'rows' not in manifest['composition']
    assert manifest['assets']['fonts'][0]['id']=='stg:noto-sc'
    assert any(i['id']=='construct-cloud-paper' for i in manifest['assets']['icons'])
    assert len(manifest['assets']['embedded'])==3 and len(manifest['parameterDefinitions'])==55
    jsonschema.validate(manifest,json.loads((ROOT/'site/schemas/cellmotion-component-v1.schema.json').read_text(encoding='utf-8')))
    print('PASS native live Manifest, embedded media and schema')
    assert page.evaluate('(m)=>CellMotionAI.validate(m).valid',manifest)
    assert not page.evaluate('(m)=>CellMotionAI.validate({...m,runtime:{...m.runtime,bridgeVersion:"9.0.0"}}).valid',manifest)
    # Every native parameter path resolves in the scheme, including all per-image effects.
    assert page.evaluate('''(m)=>{
      const resolve=(v,keys)=>{if(!keys.length)return v!==undefined;const [key,...rest]=keys;return key.endsWith('[]')?v?.[key.slice(0,-2)]?.some(a=>resolve(a,rest)):resolve(v?.[key],rest)};
      return m.parameterDefinitions.every(p=>resolve({composition:m.composition},p.path.split('.')));
    }''',manifest)
    page.evaluate('()=>{window.copied=[];CellMotionAI.copyText=async value=>copied.push(value)}')
    action(page,'prompt');page.wait_for_function('copied.length===1')
    action(page,'code');page.wait_for_function('copied.length===2')
    code=page.evaluate('copied[1]')
    assert '<cellmotion-player' in code and 'type="module"' not in code and r'<\/script>' in code
    action(page,'params');assert page.locator('.tc-ai-dialog').is_visible()
    assert page.locator('.tc-ai-params code').count()==55
    page.keyboard.press('Escape');assert not page.locator('.tc-ai-dialog').is_visible()
    page.locator('#languageButton').click();assert page.locator('.tc-ai-trigger').inner_text().startswith('For AI')
    action(page,'prompt');page.wait_for_function('copied.length===3');assert page.evaluate('copied[2]').startswith('Integrate')
    page.locator('#themeButton').click()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function('document.documentElement.scrollWidth<=innerWidth+1')
    page.locator('.tc-ai-trigger').click();assert page.locator('.tc-ai-menu').is_visible()
    page.keyboard.press('Escape');assert page.locator('.tc-ai-menu').is_hidden()
    page.screenshot(path=str(OUT/'mobile-editor.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    # Actual menu popup passes live state to the shared demo and authoritative renderer.
    with page.expect_popup() as pop:action(page,'preview')
    demo=pop.value;demo.wait_for_function('document.querySelector("#demoPlayer").duration>0')
    demo.wait_for_function('(s)=>document.querySelector("#demoPlayer").iframe.contentWindow.CurvedGallery?.collectScheme().settings.text===s',arg=current['settings']['text'])
    child=demo.locator('cellmotion-player').locator('iframe').content_frame
    assert child.locator('.tc-header').is_hidden() and child.locator('.tc-timeline').is_hidden()
    assert demo.evaluate('document.querySelector("#demoPlayer").manifest.composition')==current
    assert abs(demo.evaluate('document.querySelector("#demoPlayer").duration')-geometry['total'])<.001
    # Pause/seek pixels match the same editor renderer, including variable-duration GIF frames and vector resources.
    for seconds in [.09,.27,1.1,3.7]:
        demo.evaluate('(t)=>document.querySelector("#demoPlayer").seek(t)',seconds)
        demo.wait_for_function('(t)=>Math.abs(parseFloat(document.querySelector("#demoPlayer").iframe.contentWindow.document.querySelector("#timeReadout").textContent)-t)<.011',arg=seconds)
        actual=child.locator('#canvas').evaluate('(c)=>c.toDataURL()')
        expected=page.evaluate('''({t,w,h})=>{const c=document.createElement('canvas');c.width=w;c.height=h;CurvedGallery.render(c.getContext('2d'),w,h,t);return c.toDataURL()}''',{'t':seconds,'w':pixels(actual).shape[1],'h':pixels(actual).shape[0]})
        assert np.array_equal(pixels(actual),pixels(expected)),seconds
    demo.evaluate('document.querySelector("#demoPlayer").play()');demo.wait_for_timeout(200)
    demo.evaluate('document.querySelector("#demoPlayer").pause()');demo.wait_for_timeout(100)
    frozen=child.locator('#timeReadout').inner_text();demo.wait_for_timeout(150);assert child.locator('#timeReadout').inner_text()==frozen
    demo.evaluate('document.querySelector("#demoPlayer").restart()');demo.wait_for_timeout(80)
    assert float(child.locator('#timeReadout').inner_text().split('/')[0])<1
    updated={**current,'settings':{**current['settings'],'text':'Updated gypqj','width':360,'height':640,'speed':2}}
    demo.evaluate('(s)=>document.querySelector("#demoPlayer").update(s)',updated)
    demo.wait_for_function('document.querySelector("#demoPlayer").iframe.contentWindow.CurvedGallery?.collectScheme().settings.text==="Updated gypqj"')
    demo.wait_for_function('(d)=>Math.abs(document.querySelector("#demoPlayer").duration-d)<.001',arg=geometry['total']/2)
    assert demo.locator('cellmotion-player').evaluate('(n)=>getComputedStyle(n).aspectRatio')=='360 / 640'
    # Reject incorrect origin and protocol; retain state rather than applying the forged payload.
    demo.evaluate('document.querySelector("#demoPlayer").seek(1.2)')
    demo.wait_for_function('parseFloat(document.querySelector("#demoPlayer").iframe.contentWindow.document.querySelector("#timeReadout").textContent)===1.2')
    demo.evaluate('''(s)=>{
      const frame=document.querySelector('#demoPlayer').iframe.contentWindow;
      frame.dispatchEvent(new MessageEvent('message',{source:window,origin:'https://untrusted.invalid',data:{type:'cellmotion:configure',manifest:{effect:{id:'curvedgallery'},composition:s}}}));
      frame.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{type:'cellmotion:seek',bridgeVersion:'9.0.0',seconds:0}}));
      frame.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{type:42}}));
    }''',current)
    demo.wait_for_timeout(80)
    assert float(child.locator('#timeReadout').inner_text().split('/')[0])==1.2
    assert demo.evaluate('document.querySelector("#demoPlayer").iframe.contentWindow.CurvedGallery.collectScheme().settings.text')=='Updated gypqj'
    demo.set_viewport_size({'width':390,'height':844});demo.wait_for_function('document.documentElement.scrollWidth<=innerWidth+1')
    demo.screenshot(path=str(OUT/'mobile-player.png'))
    print('PASS shared player controls, deterministic photo/GIF/vector frames and live update')
    # The copied HTML itself initializes the player, without an async script registration race.
    context.route('**/ai-code-smoke.html',lambda route:route.fulfill(body=code,content_type='text/html'))
    code_page=context.new_page();code_page.goto(URL+'ai-code-smoke.html')
    code_page.wait_for_function('document.querySelector("cellmotion-player").duration>0')
    code_page.wait_for_function('(t)=>document.querySelector("cellmotion-player").iframe.contentWindow.CurvedGallery?.collectScheme().settings.text===t',arg=current['settings']['text'])
    assert code_page.locator('cellmotion-player').evaluate('(n)=>getComputedStyle(n).aspectRatio')=='640 / 360'
    # Preserve the established row-based pilot and its schema.
    pilot=page.evaluate('''async()=>CellMotionAI.createManifest({definition:await fetch('effects/typecascade.component.json').then(r=>r.json()),scheme:await fetch('assets/presets/typecascade-default.json').then(r=>r.json()),baseUrl:document.baseURI})''')
    pilot['composition']['rows'][0]['text']='Pilot AI row'
    jsonschema.validate(pilot,json.loads((ROOT/'site/schemas/cellmotion-component-v1.schema.json').read_text(encoding='utf-8')))
    code_page.evaluate('(m)=>document.querySelector("cellmotion-player").manifest=m',pilot)
    code_page.wait_for_function('document.querySelector("cellmotion-player").iframe.contentWindow.CellMotionEffectBridge?.effectId==="typecascade" && document.querySelector("cellmotion-player").iframe.contentWindow.CellMotionEffectBridge.getScheme().rows[0].text==="Pilot AI row"')
    with code_host(code) as host:
        cross=context.new_page();cross.goto(host)
        cross.wait_for_function('document.querySelector("cellmotion-player").duration>0')
        cross_frame=next(f for f in cross.frames if 'curvedgallery.html' in f.url)
        cross_frame.wait_for_function('(t)=>window.CurvedGallery?.collectScheme().settings.text===t',arg=current['settings']['text'])
        assert cross_frame.locator('.tc-header').is_hidden()
        cross.evaluate('()=>{const p=document.querySelector("cellmotion-player");window.protocolError=null;p.addEventListener("cellmotion-error",e=>protocolError=e.detail.message);p.manifest={...p.manifest,schemaVersion:"9.0.0"}}')
        assert 'Unsupported' in cross.evaluate('protocolError') and cross.evaluate('document.querySelector("cellmotion-player").duration')==0
    assert not errors,errors
    print('PASS aligned full-width timing/lanes, all 55 native parameters, live JSON/prompt/code, original PNG/GIF/vector pixels, player controls/update/origin, mobile/theme/language and Type Cascade compatibility')
    browser.close()
