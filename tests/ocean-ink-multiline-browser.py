"""Multiline input, scheme roundtrip, writing order and shared export renderer."""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[2] / 'output/ocean-ink'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4183/ascii-ocean-ink.html?ratio=4:5')
    page.wait_for_function('Boolean(window.CardMotionEditor)')
    field = page.locator('textarea[data-path="scene.inkText"]')
    field.fill('love\nfrom')
    assert page.evaluate('CardMotionEditor.getScheme().scene.inkText') == 'love\nfrom'
    scheme = page.evaluate('CardMotionEditor.getScheme()')
    scheme['scene']['inkText'] = 'love\r\nfrom'
    page.evaluate('s=>CardMotionEditor.apply(s)', scheme)
    assert field.input_value() == 'love\nfrom'
    result = page.evaluate('''() => {
      const original=AsciiOceanRenderer.render;
      AsciiOceanRenderer.render=()=>{};
      const c=document.createElement('canvas');c.width=960;c.height=540;
      const g=c.getContext('2d');
      const frame=t=>{
        g.clearRect(0,0,960,540);CardMotionEditor.draw(g,t,960,540);
        const data=g.getImageData(0,0,960,540).data, rows=[];
        for(let y=0;y<540;y++){let sum=0;for(let x=0;x<960;x++)sum+=data[(y*960+x)*4+3];rows.push(sum);}
        return {rows,url:c.toDataURL()};
      };
      try {
        const early=frame(2),hold=frame(4.3),bands=[];
        hold.rows.forEach((sum,y)=>{if(sum>500){const last=bands.at(-1);if(last&&y===last[1]+1)last[1]=y;else bands.push([y,y]);}});
        const main=bands.filter(([a,b])=>b-a>8), second=main[1];
        return {bands:main,earlySecond:early.rows.slice(second[0],second[1]+1).reduce((a,b)=>a+b,0),
          holdStable:hold.url===frame(4.7).url,diffuses:hold.url!==frame(9.8).url,
          clear:frame(14.8).rows.every(n=>n===0)};
      } finally {AsciiOceanRenderer.render=original;}
    }''')
    assert len(result['bands']) == 2, result
    assert result['earlySecond'] == 0, result
    assert result['holdStable'] and result['diffuses'] and result['clear'], result
    for width, height in [(960, 540), (640, 800)]:
        data = page.evaluate('''([w,h])=>{
          const c=document.createElement('canvas');c.width=w;c.height=h;
          CardMotionEditor.draw(c.getContext('2d'),4.3,w,h);
          return c.toDataURL().split(',')[1];
        }''', [width, height])
        (OUT / f'multiline-{width}x{height}.png').write_bytes(base64.b64decode(data))
    page.wait_for_function("""Object.values(localStorage).some(value => {
      try { return JSON.parse(value).scene?.inkText === 'love\\nfrom'; } catch { return false; }
    })""")
    page.reload()
    page.wait_for_function('Boolean(window.CardMotionEditor)')
    assert field.input_value() == 'love\nfrom'
    assert not errors, errors
    browser.close()
    print('PASS multiline input, CRLF import, sequential writing, hold/diffusion, two ratios and persistence')
