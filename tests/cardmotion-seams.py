"""Catch exposed triangle seams on the otherwise solid white face mid-flip."""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / 'output/cardmotion'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000})
    page.goto('http://127.0.0.1:4186/card-login.html?from=gallery', wait_until='networkidle')
    page.wait_for_function('!!window.CardMotionEditor')
    for width, height in [(1920,1080),(480,640)]:
        pixels = page.evaluate('''({width,height})=>{const c=document.createElement('canvas');c.width=width;c.height=height;CardMotionEditor.draw(c.getContext('2d'),1.05,width,height);const row=c.getContext('2d').getImageData(0,Math.floor(height/2),width,1).data;const white=[];for(let x=0;x<width;x++)if(row[x*4]>230)white.push(x);const first=white[0]+8,last=white.at(-1)-8;let min=255;for(let x=first;x<last;x++)min=Math.min(min,row[x*4]);return {min,first,last}}''',{'width':width,'height':height})
        print(width,height,pixels,flush=True)
        assert pixels['last']>pixels['first']+20
        assert pixels['min']>=245, 'A solid face must not expose its background between texture strips'
    page.evaluate('CardMotionEditor.seek(1.05)')
    page.locator('#canvas').screenshot(path=str(OUT/'login-seam-regression.png'))
    browser.close()
