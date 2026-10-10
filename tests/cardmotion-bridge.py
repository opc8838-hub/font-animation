"""Exercise copied HTML on another origin and reject forged protocol messages."""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import threading
from urllib.parse import urlsplit
import json
import jsonschema
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/cardmotion';OUT.mkdir(parents=True,exist_ok=True)
@contextmanager
def host(code):
    (OUT/'copied-component.html').write_text(code,encoding='utf-8')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(OUT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:yield f'http://127.0.0.1:{server.server_port}/copied-component.html'
    finally:server.shutdown();server.server_close();thread.join()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for effect in ['card-login','carddeck']:
        page=browser.new_page()
        page.goto(f'http://127.0.0.1:4186/{effect}.html?from=gallery',wait_until='networkidle')
        page.wait_for_function('!!window.CardMotionEditor')
        manifest=page.evaluate('CardMotionEditor.manifest()')
        manifest['composition']['motion']['speed']=1.3
        manifest['presentation']['autoplay']=False
        jsonschema.validate(manifest,json.loads((ROOT/'site/schemas/cellmotion-component-v1.schema.json').read_text(encoding='utf-8')))
        code=page.evaluate('(m)=>CellMotionAI.configuredCode(m)',manifest)
        with host(code) as url:
            embed=browser.new_page()
            embed.goto(url,wait_until='networkidle')
            embed.wait_for_function('document.querySelector("cellmotion-player").duration>0')
            frame=next(f for f in embed.frames if effect+'.html' in f.url)
            frame.wait_for_function('CardMotionEditor.getScheme().motion.speed===1.3')
            embed.evaluate('''()=>{const p=document.querySelector('cellmotion-player');p.pause();p.seek(.75);}''')
            frame.wait_for_function('document.querySelector("#timeReadout").textContent.startsWith("0.75")')
            origin=urlsplit(url).scheme+'://'+urlsplit(url).netloc
            frame.evaluate('''origin=>{dispatchEvent(new MessageEvent('message',{source:parent,origin,data:{type:'cellmotion:seek',bridgeVersion:'9.0.0',seconds:0}}));dispatchEvent(new MessageEvent('message',{source:parent,origin:'https://untrusted.invalid',data:{type:'cellmotion:seek',bridgeVersion:'1.0.0',seconds:0}}));}''',origin)
            frame.wait_for_timeout(100)
            assert frame.locator('#timeReadout').inner_text().startswith('0.75'), 'An unsupported origin/version changed playback'
            embed.evaluate('''()=>{const p=document.querySelector('cellmotion-player'),s=structuredClone(p.manifest.composition);s.motion.speed=1.6;p.update(s);p.pause();p.seek(.5);}''')
            frame.wait_for_function('CardMotionEditor.getScheme().motion.speed===1.6 && document.querySelector("#timeReadout").textContent.startsWith("0.50")')
            assert frame.locator('.tc-header').is_hidden()
            embed.close()
        page.close()
        print('PASS',effect,'native schema, copied code, cross-origin, protocol policy, queued configure/seek',flush=True)
    browser.close()
