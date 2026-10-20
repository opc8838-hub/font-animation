"""Check proportional 4:5 rendering and an actual portrait video export."""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output/ocean-ink'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:4183/ascii-ocean-ink.html?from=gallery&ratio=4:5')
    page.wait_for_function('Boolean(window.CardMotionEditor)')
    assert page.evaluate('CardMotionEditor.getScheme().canvas') == {'width': 1080, 'height': 1350}
    assert page.locator('#canvasPreset').input_value() == '1080x1350'
    page.evaluate('CardMotionEditor.seek(4.3)')
    frame = page.locator('#frame').bounding_box()
    assert abs(frame['width'] / frame['height'] - .8) < .002
    result = page.evaluate('''() => {
      const original=AsciiOceanRenderer.render, scheme=CardMotionEditor.getScheme();
      AsciiOceanRenderer.render=()=>{};
      const bounds=(w,h,t)=>{
        const c=document.createElement('canvas');c.width=w;c.height=h;
        CardMotionEditor.draw(c.getContext('2d'),t,w,h);
        const data=c.getContext('2d').getImageData(0,0,w,h).data;
        let l=w,r=0,top=h,bottom=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        return {width:r-l+1,height:bottom-top+1,x:(l+r)/2,y:(top+bottom)/2};
      };
      try {return [4.3,9.8].map(t=>({wide:bounds(1920,1080,t),portrait:bounds(1080,1350,t)}));}
      finally {AsciiOceanRenderer.render=original;}
    }''')
    for pair in result:
        for key in ['width', 'height']:
            assert abs(pair['portrait'][key] - pair['wide'][key] * .5625) < 4, pair
    print('PASS 4:5 selector, exact stage ratio, uniform text and ink scaling', flush=True)
    for at in [4.3, 9.8]:
        data = page.evaluate('''t=>{const c=document.createElement('canvas');c.width=1080;c.height=1350;CardMotionEditor.draw(c.getContext('2d'),t,1080,1350);return c.toDataURL().split(',')[1]}''', at)
        (OUT / f'four-five-{at}.png').write_bytes(base64.b64decode(data))
    page.screenshot(path=str(OUT / 'four-five-editor.png'))
    page.select_option('#canvasPreset', '1920x1080')
    assert page.evaluate('CardMotionEditor.getScheme().canvas.width') == 1920
    page.select_option('#canvasPreset', '1080x1350')
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.screenshot(path=str(OUT / 'four-five-mobile.png'), full_page=True)
    scheme = page.evaluate('CardMotionEditor.getScheme()')
    page.evaluate('s=>CardMotionEditor.apply(s)', {**scheme, 'canvas': {'width': 640, 'height': 800}})
    page.locator('[data-panel="export"]').first.click()
    page.select_option('#exportDuration', 'custom')
    page.fill('#customDuration', '15.5')
    page.select_option('#exportFps', '24')
    with page.expect_download(timeout=180000) as download:
        page.locator('#exportMp4').click()
    download.value.save_as(OUT / 'love-from-4x5.mp4')
    assert not errors, errors
    browser.close()
    print('PASS 4:5 real MP4, mobile layout and clean console', flush=True)
