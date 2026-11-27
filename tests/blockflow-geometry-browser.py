"""Regression: upright block silhouettes, proportional spacing and canvas fitting."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output/blockflow-upright'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 960}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8793/blockflow.html?from=gallery')
    page.wait_for_function('Boolean(window.CardMotionEditor)')
    page.evaluate('CardMotionEditor.seek(1.35)')
    result = page.evaluate('''() => {
      const state = CardMotionEditor.getScheme();
      const render = (w, h, size=1, gap=32, count=8, t=1.35) => {
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        const s={...state, scene:{...state.scene, blockSize:size, tileGap:gap},
          cards:Array.from({length:count},(_,i)=>state.cards[i%state.cards.length])};
        CardMotion.draw(c.getContext('2d'),t,w,h,s,CardMotionEditor.resources);
        const data=c.getContext('2d').getImageData(0,0,w,h).data;
        const blue=(x,y)=>{const i=(y*w+x)*4;return data[i+2]-data[i]>25;};
        const runs=y=>{const a=[];let l=-1;for(let x=0;x<=w;x++){
          if(x<w&&blue(x,y)){if(l<0)l=x;}else if(l>=0){a.push([l,x-1]);l=-1;}}
          return a;};
        const bars=runs(Math.floor(h/2)).map(([l,r])=>{
          const x=Math.floor((l+r)/2);let top=Math.floor(h/2),bottom=top;
          while(top>0&&blue(x,top-1))top--;while(bottom<h-1&&blue(x,bottom+1))bottom++;
          const edges=[.25,.75].map(f=>{const y=Math.round(top+(bottom-top)*f);let a=x,b=x;
            while(a>0&&blue(a-1,y))a--;while(b<w-1&&blue(b+1,y))b++;return [a,b];});
          return {l,r,top,bottom,skew:Math.max(Math.abs(edges[0][0]-edges[1][0]),Math.abs(edges[0][1]-edges[1][1]))};
        });
        if(!bars.length)return {bars,width:0,height:0,gap:0,center:null};
        const width=bars.at(-1).r-bars[0].l+1,height=Math.max(...bars.map(b=>b.bottom-b.top+1));
        return {bars,width,height,gap:bars[1]?bars[1].l-bars[0].r-1:0,center:(bars[0].l+bars.at(-1).r)/2};
      };
      return {portrait:render(1080,1920),square:render(1080,1080),landscape:render(1920,1080),
        fourFive:render(1080,1350),half:render(540,960),small:render(1080,1920,.5),
        many:render(1080,1920,.5,32,24),tight:render(1080,1920,1,0)};
    }''')
    portrait = result['portrait']
    assert len(portrait['bars']) == 8, portrait
    assert max(b['skew'] for b in portrait['bars']) <= 2, portrait
    for key in ['square', 'landscape', 'fourFive']:
        for dimension in ['width', 'height', 'gap']:
            assert abs(result[key][dimension] - portrait[dimension]) <= 3, (key, dimension, result[key])
    for key in ['half', 'small']:
        for dimension in ['width', 'height', 'gap']:
            assert abs(result[key][dimension] - portrait[dimension]/2) <= 3, (key, dimension, result[key])
    assert len(result['many']['bars']) == 24, result['many']
    assert result['tight']['gap'] < portrait['gap'], result['tight']
    assert abs(portrait['center'] - 539.5) < 2
    page.locator('#frame').screenshot(path=str(OUT / 'portrait.png'))
    page.select_option('#canvasPreset', '1920x1080')
    page.locator('#frame').screenshot(path=str(OUT / 'landscape.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    page.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 960})
    page.select_option('#canvasPreset', '1080x1920')
    page.evaluate('CardMotionEditor.seek(1.35)')
    with page.expect_download(timeout=60000) as download:
        page.evaluate("CardMotionEditor.exportFile('png')")
    download.value.save_as(OUT / 'blockflow.png')
    page.evaluate('''async () => {
      const s=CardMotionEditor.getScheme(); s.canvas={width:360,height:640};
      await CardMotionEditor.apply(s); CardMotionEditor.seek(1.35);
    }''')
    page.select_option('#exportFps', '24', force=True)
    for fmt in ['gif', 'mp4']:
        with page.expect_download(timeout=120000) as download:
            page.evaluate(f"CardMotionEditor.exportFile('{fmt}')")
        download.value.save_as(OUT / f'blockflow.{fmt}')
    assert not errors, errors
    browser.close()
    print('PASS: upright rectangles, proportional gaps and sizes, 9:16 / 1:1 / 16:9 / 4:5, mobile layout, PNG/GIF/MP4 downloads')
