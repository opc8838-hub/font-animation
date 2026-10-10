"""Generate the two release previews with the same renderer as the editors."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for effect in ['card-login','carddeck']:
        page=browser.new_page(accept_downloads=True)
        page.goto(f'http://127.0.0.1:4186/{effect}.html?from=gallery',wait_until='networkidle')
        page.wait_for_function('!!window.CardMotionEditor')
        page.evaluate('CardMotionEditor.seek(0)')
        # Thumbnail resolution must not redefine the preset's logical geometry.
        # Render the approved 1920×1080 composition to a half-resolution target.
        page.evaluate('''()=>{window.releaseCanvas=document.createElement('canvas');releaseCanvas.width=960;releaseCanvas.height=540;}''')
        with page.expect_download(timeout=120000) as download:
            page.evaluate('''async()=>{const s=CardMotionEditor.getScheme(),c=releaseCanvas.getContext('2d',{willReadFrequently:true}),encoder=await HME.createH264MP4Encoder();try{encoder.width=960;encoder.height=540;encoder.frameRate=30;encoder.speed=10;encoder.kbps=3500;encoder.initialize();for(let i=0;i<Math.ceil(CardMotion.duration(s)*30);i++){CardMotionEditor.draw(c,i/30,s.canvas.width,s.canvas.height);encoder.addFrameRgba(c.getImageData(0,0,960,540).data);}encoder.finalize();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([encoder.FS.readFile(encoder.outputFilename)],{type:'video/mp4'}));a.download='preview.mp4';a.click();}finally{encoder.delete();}}''')
        download.value.save_as(ROOT/f'site/assets/previews/{effect}-card.mp4')
        with page.expect_download() as download:
            page.evaluate('''async()=>{const s=CardMotionEditor.getScheme();CardMotionEditor.draw(releaseCanvas.getContext('2d'),s.effect==='card-login'?1.8:1.9,s.canvas.width,s.canvas.height);const a=document.createElement('a');a.href=releaseCanvas.toDataURL('image/png');a.download='poster.png';a.click();}''')
        png=ROOT/f'site/final_{effect}.png'
        download.value.save_as(png)
        Image.open(png).convert('RGB').save(ROOT/f'site/assets/cellmotion/poster-{effect}.jpg',quality=88)
        print('Generated',effect,flush=True)
        page.close()
    browser.close()
