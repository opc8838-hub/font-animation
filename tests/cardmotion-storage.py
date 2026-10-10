"""A full browser quota must not prevent downloading the user's scheme."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(accept_downloads=True)
    page.goto('http://127.0.0.1:4186/carddeck.html?from=gallery',wait_until='networkidle')
    page.wait_for_function('!!window.CardMotionEditor')
    page.locator('#backgroundUpload').set_input_files(ROOT/'site/assets/previews/carddeck-card.mp4')
    page.wait_for_function('document.querySelectorAll("#filmstrip img").length===6')
    page.wait_for_timeout(350)
    page.evaluate('''()=>{localStorage.removeItem('cellmotion-carddeck-v1');const chunk='x'.repeat(512*1024);try{for(let i=0;i<20;i++)localStorage.setItem('quota-test-'+i,chunk);}catch{}}''')
    with page.expect_download(timeout=5000) as download:
        page.click('#saveScheme')
    download.value.save_as(ROOT/'output/cardmotion/quota-scheme.json')
    assert (ROOT/'output/cardmotion/quota-scheme.json').stat().st_size>10000
    print('PASS: scheme download survives full local storage',flush=True)
    browser.close()
