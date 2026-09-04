"""Focused browser regression. Run with site/ served at http://127.0.0.1:8765.

The test-only hook is injected into the response, never shipped with the effect.
Use --baseline to measure HEAD before the fix; outputs go outside the repository.
"""
import argparse
import base64
import cv2
import json
from pathlib import Path
import subprocess
import tempfile
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--gallery-preview', action='store_true')
args = parser.parse_args()
source = (subprocess.check_output(['git', 'show', 'HEAD:site/continuation.js'], cwd=ROOT).decode('utf-8')
          if args.baseline else (ROOT / 'site/continuation.js').read_text(encoding='utf-8'))
hook = '''
  window.centeringTest = {
    async configure(scheme) {
      applyScheme(scheme); playing = false;
      await prepareAllAssets();
      for (const pair of parsePairs()) {
        const preset = fontPreset(pair[28]);
        await document.fonts.load(`400 80px "${preset.family}"`);
        await document.fonts.load(`500 80px "${preset.family}"`);
      }
      await document.fonts.ready;
      playing = false;
    },
    timeline: timelineValues,
    async useDecodedBackgrounds(sources) {
      // Test-host workaround: headless Edge can report readyState=4 while
      // returning blank video pixels. Decode the unchanged source independently.
      const decoded = new Map();
      for (const source of sources) {
        const frames = await Promise.all(source.urls.map(url => new Promise((resolve,reject) => {
          const image = new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src=url;
        })));
        decoded.set(source.rowId,{...source,frames});
      }
      const originalImageAt = backgroundImageAt;
      const originalSeek = seekRuntimeBackground;
      backgroundImageAt = (rowId,time,media,preview) => {
        const source=decoded.get(rowId);
        if (!source) return originalImageAt(rowId,time,media,preview);
        const target=videoClipTime(media,source.duration,time);
        return source.frames[Math.min(source.frames.length-1,Math.floor(target*source.fps))];
      };
      seekRuntimeBackground = (rowId,media,time) => decoded.has(rowId) ? Promise.resolve() : originalSeek(rowId,media,time);
    },
    frame(time, width, height, visible = false) {
      playing = false; simulationTime = time;
      const canvas = visible ? previewCanvas : document.createElement('canvas');
      if (!visible) { canvas.width = width; canvas.height = height; }
      renderFrame(canvas, time, canvas.width, canvas.height);
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let l = canvas.width, r = -1, t = canvas.height, b = -1;
      for (let y=0; y<canvas.height; y++) for (let x=0; x<canvas.width; x++) {
        const i=(y*canvas.width+x)*4;
        if (Math.min(data[i], data[i+1], data[i+2]) > 235) continue;
        l=Math.min(l,x); r=Math.max(r,x); t=Math.min(t,y); b=Math.max(b,y);
      }
      return r < 0 ? null : {dx:(l+r+1)/2-canvas.width/2, dy:(t+b+1)/2-canvas.height/2,
        l,r,t,b,width:canvas.width,height:canvas.height};
    }
  };
'''
source = source.replace('  initialize();\n})();', hook + '  initialize();\n})();')
output = Path(tempfile.mkdtemp(prefix='continuation-centering-'))
scheme = json.loads((ROOT / 'site/assets/presets/continuation-default.json').read_text(encoding='utf-8'))
approved_scheme = json.loads(json.dumps(scheme))
for pair in scheme['pairs']:
    pair.update(backgroundMedia=None, backgroundColor='#ffffff', backgroundTransition='direct',
                leadColor='#000000', suffixColor='#000000', punctuationColor='#000000', sweepEnabled=False)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge', args=['--disable-gpu'])
    page = browser.new_page(viewport={'width':1440, 'height':1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/continuation.js?*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto('http://127.0.0.1:8765/continuation.html', wait_until='networkidle')
    page.wait_for_function('window.centeringTest && document.querySelectorAll(".pair-editor-row").length === 5')
    if args.gallery_preview:
        page.evaluate('(scheme) => centeringTest.configure(scheme)',approved_scheme)
        decoded_sources = []
        for pair in approved_scheme['pairs']:
            media = pair.get('backgroundMedia')
            if not media or not media.get('fileType','').startswith('video/'):
                continue
            video_path = output/(pair['id']+'.mp4')
            video_path.write_bytes(base64.b64decode(media['url'].split(',')[1]))
            capture = cv2.VideoCapture(str(video_path))
            fps = capture.get(cv2.CAP_PROP_FPS)
            urls = []
            while True:
                ok,frame = capture.read()
                if not ok: break
                name = f'{pair["id"]}-{len(urls)}.png'
                cv2.imwrite(str(output/name),frame)
                urls.append('http://127.0.0.1:8765/qa-background/'+name)
            capture.release()
            assert fps>0 and len(urls)>1
            decoded_sources.append({'rowId':pair['id'],'fps':fps,'duration':len(urls)/fps,'urls':urls})
        page.route('**/qa-background/*',lambda route:route.fulfill(path=str(output/route.request.url.rsplit('/',1)[-1]),content_type='image/png'))
        page.evaluate('(sources) => centeringTest.useDecodedBackgrounds(sources)',decoded_sources)
        page.locator('#exportPreset').select_option('custom')
        page.locator('#exportWidth').fill('960')
        page.locator('#exportHeight').fill('540')
        page.locator('#exportDuration').select_option('full')
        page.locator('#exportFps').select_option('30')
        with page.expect_download(timeout=180000) as download:
            page.locator('#exportVideo').click()
        download.value.save_as(ROOT/'site/assets/previews/continuation-card-centered.mp4')
        print('PASS: default scheme re-exported without changing the original preset or preview',flush=True)
        browser.close()
        raise SystemExit(0)
    page.evaluate('(scheme) => centeringTest.configure(scheme)', scheme)
    timeline = page.evaluate('centeringTest.timeline()')
    cases = []
    for width,height in [(640,360),(360,640),(480,480)]:
        for row in timeline['rows']:
            timing = row['timing']
            points = [0.1, timing['intro']+timing['hold']/2, timing['revealAt']-.01]
            points += [timing['revealAt'] + timing['reveal']*i/20 for i in range(21)]
            points += [timing['finish']+.05]
            for local in points:
                bounds = page.evaluate('(v) => centeringTest.frame(...v)', [row['start']+local,width,height])
                if bounds:
                    cases.append({'row':row['index'],'time':round(local,4),'size':[width,height],**bounds})
    worst = sorted(cases,key=lambda v:max(abs(v['dx']),abs(v['dy'])),reverse=True)[:8]
    print(json.dumps({'baseline':args.baseline,'samples':len(cases),'worst':worst,'errors':errors,'output':str(output)},ensure_ascii=False), flush=True)
    (output/'results.json').write_text(json.dumps(cases,indent=2),encoding='utf-8')
    if not args.baseline:
        assert not errors, errors
        # Font rasterization and antialiasing may differ by a few device pixels.
        assert all(abs(v['dx']) <= 5 and abs(v['dy']) <= 5 for v in cases), worst
        assert all(v['l'] > 0 and v['r'] < v['width']-1 and v['t'] > 0 and v['b'] < v['height']-1 for v in cases)
        for font,lead,suffix in [('inter','Hi','Wave'),('noto-sc-black','喜欢','图标居中'),('noto-jp-black','こんにちは','世界'),('noto-kr-black','안녕','세계')]:
            for count in [0,1,2]:
                variant = json.loads(json.dumps(scheme))
                variant['pairs'] = [variant['pairs'][-1]]
                pair = variant['pairs'][0]
                pair.update(lead=lead,suffix=suffix,fontFamily='stg:'+font,leadFontSize=160,suffixFontSize=180)
                variant['rowPositions'] = [50]
                variant['assets'] = [{**scheme['assets'][-1],'id':f'test-{i}','rowId':pair['id'],
                                      'insertPart':'suffix','insertOffset':i+1,'size':250,'spacing':96,
                                      'x':(-1 if i else 1)*160,'y':(-1 if i else 1)*120,'rotation':47+i*91}
                                     for i in range(count)]
                page.evaluate('(scheme) => centeringTest.configure(scheme)',variant)
                for dimensions in [(640,360),(360,640)]:
                    for time in [.2,.55,1.4]:
                        v = page.evaluate('(v) => centeringTest.frame(...v)',[time,*dimensions])
                        assert v and abs(v['dx']) <= 5 and abs(v['dy']) <= 5, (font,count,time,v)
                        assert v['l']>0 and v['r']<v['width']-1 and v['t']>0 and v['b']<v['height']-1, v
        print('PASS: Latin/Chinese/Japanese/Korean, 0/1/2 icons, large sizes, spacing, rotation and offsets',flush=True)
        page.evaluate('(scheme) => centeringTest.configure(scheme)',scheme)
        for preset in ['1920x1080','1080x1080','1080x1920']:
            page.locator('#exportPreset').select_option(preset)
            page.wait_for_timeout(220)
            rect = page.locator('#designFrame').bounding_box()
            w,h = map(int,preset.split('x'))
            assert abs(rect['width']/rect['height']-w/h)<.01
        page.locator('#exportPreset').select_option('1920x1080')
        page.wait_for_timeout(220)
        cow = timeline['rows'][-1]
        page.evaluate('(t) => centeringTest.frame(t,0,0,true)',cow['start']+cow['timing']['finish']+.05)
        page.screenshot(path=str(output/'desktop.png'))
        export_scheme = json.loads(json.dumps(scheme))
        export_scheme['pairs'] = [export_scheme['pairs'][-1]]
        export_scheme['assets'] = [a for a in export_scheme['assets'] if a['rowId'] == export_scheme['pairs'][0]['id']]
        export_scheme['rowPositions'] = [50]
        page.evaluate('(scheme) => centeringTest.configure(scheme)', export_scheme)
        page.locator('#exportPreset').select_option('custom')
        page.locator('#exportWidth').fill('640')
        page.locator('#exportHeight').fill('360')
        page.evaluate('(t) => centeringTest.frame(t,0,0,true)',cow['timing']['finish']+.05)
        with page.expect_download() as download:
            page.locator('#exportPng').click()
        download.value.save_as(output/'frame.png')
        png = Image.open(output/'frame.png').convert('RGB')
        assert ImageChops.difference(png,Image.new('RGB',png.size,'white')).getbbox()
        page.locator('#exportDuration').select_option('2')
        page.locator('#exportFps').select_option('15')
        for selector,name in [('#exportGif','motion.gif'),('#exportVideo','motion.mp4')]:
            with page.expect_download(timeout=120000) as download:
                page.locator(selector).click()
            download.value.save_as(output/name)
        gif = Image.open(output/'motion.gif')
        assert gif.size == (640,360) and gif.n_frames > 20
        gif.seek(16)
        gif.convert('RGB').save(output/'gif-frame.png')
        video = cv2.VideoCapture(str(output/'motion.mp4'))
        assert video.get(cv2.CAP_PROP_FRAME_WIDTH)==640 and video.get(cv2.CAP_PROP_FRAME_HEIGHT)==360
        video.set(cv2.CAP_PROP_POS_MSEC,1100)
        ok,frame = video.read()
        assert ok and (frame.min(axis=2)<230).sum()>100
        cv2.imwrite(str(output/'mp4-frame.png'),frame)
        video.release()
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#exportPreset').select_option('1080x1920')
        page.wait_for_timeout(250)
        page.evaluate('(t) => centeringTest.frame(t,0,0,true)',cow['timing']['finish']+.05)
        page.screenshot(path=str(output/'mobile.png'))
        print('PASS: centering, clipping, aspect ratios, desktop/mobile and PNG/GIF/MP4 exports', flush=True)
    browser.close()
