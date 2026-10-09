"""Focused editing and unclipped descenders, including actual export frames."""
import base64
import io
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parents[2]/'output'/'curved-gallery-reference'/'focused-preview'
OUT.mkdir(parents=True,exist_ok=True)
def data(color):
    out=io.BytesIO();Image.new('RGB',(300,300),color).save(out,'PNG')
    return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
def canvas(page):
    url=page.locator('#canvas').evaluate('(c)=>c.toDataURL()')
    return np.asarray(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB'))
def edit(page,key,value):
    page.locator(f'[data-image-effect="{key}"]').evaluate('(n,v)=>{n.value=v;n.dispatchEvent(new Event("input",{bubbles:true}))}',str(value))
def export(page,kind):
    with page.expect_download(timeout=180000) as d:page.evaluate('(kind)=>CurvedGallery.exportFile(kind)',kind)
    target=OUT/('comingsoon.'+kind);d.value.save_as(target);return target

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4177/curvedgallery.html')
    page.wait_for_function('window.CurvedGallery && document.fonts.check("400 64px "+STGFontLibrary.family(CurvedGallery.collectScheme().settings.font))')
    original=page.evaluate('CurvedGallery.collectScheme()')
    assets=[{'id':str(i),'imageName':f'photo-{i}.png','originalDataUrl':data('#42d8bd' if i==13 else '#ff3e42')} for i in range(14)]
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)',{**original,'assets':assets})
    page.evaluate('CurvedGallery.seek(3.5)')
    page.locator('#contentList button').nth(13).click()
    assert page.locator('#focusStatus').is_visible() and 'photo-13.png' in page.locator('#focusName').inner_text()
    readout=page.locator('#timeReadout').inner_text()
    before=canvas(page)
    assert ((before[:,:,1]>170)&(before[:,:,0]<100)).sum()>1000,'Selected image beyond slot count must be visible'
    page.wait_for_timeout(300);assert page.locator('#timeReadout').inner_text()==readout,'Animation clock stays paused while editing'
    untouched=page.evaluate('CurvedGallery.collectScheme().assets[0]')
    edit(page,'look','pink')
    assert np.abs(canvas(page).astype('int16')-before.astype('int16')).mean()>1,'Effect change must update the selected large image'
    assert page.evaluate('CurvedGallery.collectScheme().assets[0]')==untouched
    page.screenshot(path=str(OUT/'focused-image.png'))
    page.locator('#exitImagePreview').click();assert page.locator('#focusStatus').is_hidden()
    edit(page,'lookStrength',.5);assert page.locator('#focusStatus').is_visible()
    page.locator('#replayButton').click();assert page.locator('#focusStatus').is_hidden()
    page.locator('#contentList button').nth(13).click();page.locator('#playButton').click();assert page.locator('#focusStatus').is_hidden()
    edit(page,'lookStrength',.3);assert page.locator('#focusStatus').is_visible()
    resumed=page.locator('#timeReadout').inner_text();page.wait_for_timeout(300)
    assert page.locator('#timeReadout').inner_text()==resumed,'Returning to image controls must pause playback'
    page.locator('#contentList button').first.click();assert 'photo-0.png' in page.locator('#focusName').inner_text()
    page.locator('#selectBrand').click();assert page.locator('#focusStatus').is_hidden()
    # Descender pixels must match a direct unmasked glyph draw after the reveal.
    result=page.evaluate('''async()=>{
      const results=[];
      for(const font of ['stg:inter','stg:noto-sc','stg:noto-jp-black','stg:noto-kr-black']){
        const family=STGFontLibrary.family(font);await document.fonts.load(`400 186px ${family}`);
        for(const text of ['g','comingsoon','gypqj'])for(const size of [140,186,310]){
          const s={...CurvedGalleryMotion.defaults,font,text,fontSize:size};
          const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=1920;a.height=b.height=1080;
          const ctx=a.getContext('2d'),ref=b.getContext('2d');CurvedGalleryMotion.render(ctx,1920,1080,3.5,s);
          const preset=STGFontLibrary.preset(font);ref.font=`${preset.style||'normal'} 400 ${size}px ${family}`;
          let width=ref.measureText(text).width,available=Math.max(100,1720-s.finalSize*2-s.textGap);
          if(width>available){ref.font=`${preset.style||'normal'} 400 ${size*available/width}px ${family}`;width=ref.measureText(text).width}
          const pose=CurvedGalleryMotion.pose(s,3.5,width),x=pose.x+pose.radius+s.textGap,baseline=540+size*.35;
          ref.fillStyle=s.background;ref.fillRect(0,0,1920,1080);ref.fillStyle=s.color;ref.textBaseline='alphabetic';ref.fillText(text,x,baseline);
          const actual=ctx.getImageData(0,0,1920,1080).data,expected=ref.getImageData(0,0,1920,1080).data;
          let count=0,missing=0;
          for(let y=Math.ceil(baseline+size*.13);y<Math.ceil(baseline+size*.5);y++)for(let px=Math.floor(x)-2;px<Math.ceil(x+width)+3;px++){
            const i=(y*1920+px)*4;if(expected[i]<100){count++;if(actual[i]>150)missing++}
          }
          results.push({font,text,size,count,missing});
        }
      }
      return results;
    }''')
    assert all(r['missing']<=3 for r in result),result
    assert sum(r['count'] for r in result)>1000,result
    # Extreme arc settings still fit the complete selected picture.
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)',{**original,'settings':{**original['settings'],'slots':4,'cardHeight':180,'curvature':.55},'assets':assets[:1]})
    page.locator('#contentList button').first.click()
    border=canvas(page);assert np.all(border[0,:,:]==border[0,0,:]) and np.all(border[-1,:,:]==border[-1,0,:])
    # Exports return to the complete animation and retain g's lower strokes.
    settings={**original['settings'],'text':'comingsoon','width':640,'height':360}
    page.evaluate('(s)=>CurvedGallery.applyScheme(s)',{**original,'settings':settings,'assets':assets[:1]})
    page.evaluate('CurvedGallery.seek(3.5)');page.locator('#contentList button').first.click()
    png=export(page,'png');assert page.locator('#focusStatus').is_hidden()
    url=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=640;c.height=360;CurvedGallery.render(c.getContext('2d'),640,360,3.5);return c.toDataURL()}''')
    expected=np.asarray(Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB'))
    assert np.array_equal(np.asarray(Image.open(png).convert('RGB')),expected),'PNG must export the animation, not the editing view'
    page.locator('#exportShortcut').click();page.locator('#exportDuration').select_option('custom');page.locator('#customDuration').fill('3.6');page.locator('#exportFps').select_option('15')
    gif=Image.open(export(page,'gif'));gif.seek(gif.n_frames-1)
    assert np.abs(np.asarray(gif.convert('RGB')).astype('int16')-expected.astype('int16')).mean()<10
    video=cv2.VideoCapture(str(export(page,'mp4')));video.set(cv2.CAP_PROP_POS_FRAMES,53);ok,frame=video.read();assert ok
    assert np.abs(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB).astype('int16')-expected.astype('int16')).mean()<8
    video.release()
    page.locator('#contentList button').first.click();page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function('document.documentElement.scrollWidth<=innerWidth+1')
    assert page.locator('#focusStatus').is_visible() and page.locator('#canvas').is_visible()
    assert not errors,errors
    print('PASS focused image/crop/effects view, paused timeline, playback/brand return, 36 natural glyph comparisons, unclipped PNG/GIF/H264 exports and mobile')
    browser.close()
