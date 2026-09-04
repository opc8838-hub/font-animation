"""Check the real gallery card's source and non-cropping CSS at three widths."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='msedge',args=['--disable-gpu'])
    page=browser.new_page()
    # Keep the test scoped to this card; unrelated preview media is not needed.
    def scoped(route):
        url=route.request.url.split('?')[0]
        if any(url.endswith('/'+name) for name in ['gallery.html','gallery.js','gallery.css','continuation-card-centered.mp4']):
            route.continue_()
        else:
            route.fulfill(status=204,body='')
    page.route('**/*',scoped)
    page.goto('http://127.0.0.1:8765/gallery.html',wait_until='networkidle')
    video=page.locator('[data-effect="continuation"] video.effect-loop')
    for width,height in [(1440,1000),(900,800),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        video.scroll_into_view_if_needed()
        result=video.evaluate('''v=>{const s=getComputedStyle(v),r=v.getBoundingClientRect(),c=v.closest('.effect-card').getBoundingClientRect();return {src:v.getAttribute('src'),fit:s.objectFit,transform:s.transform,dx:r.x+r.width/2-c.x-c.width/2,dy:r.y+r.height/2-c.y-c.height/2};}''')
        assert 'continuation-card-centered.mp4' in result['src']
        assert result['fit']=='contain' and result['transform']=='none'
        assert abs(result['dx'])<1 and abs(result['dy'])<1,result
        print(width,result,flush=True)
    browser.close()
print('PASS: actual gallery preview stays centered and uncropped',flush=True)
