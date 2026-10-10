"""Verify discoverability, honest component availability, and the old AI pilot."""
import sys
from playwright.sync_api import sync_playwright

BASE=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4186/').rstrip('/')+'/'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'cellmotion.html',wait_until='networkidle')
    page.wait_for_selector('#recent-grid .recent-card')
    recent=page.locator('#recent-grid .recent-card').evaluate_all('(nodes)=>nodes.slice(0,2).map(n=>n.getAttribute("href"))')
    assert recent[0].startswith('card-login.html') and recent[1].startswith('carddeck.html'),recent
    page.goto(BASE+'cellmotion-components.html?use=web',wait_until='networkidle')
    page.wait_for_function('document.querySelector("#result-count").textContent.length>0')
    assert page.locator('#catalog-grid .catalog-card').count()==2, 'The two verified web components must be discoverable'
    assert page.locator('#catalog-grid .card-capabilities').filter(has_text='AI').count()==2
    for effect in ['card-login','carddeck']:
        assert page.locator(f'#catalog-grid a[href^="{effect}.html"]').count()>0
    assert page.locator('#web-planned').is_hidden()
    page.goto(BASE+'cellmotion-editors.html?q=Card%20Deck',wait_until='networkidle')
    page.wait_for_selector('#catalog-grid .catalog-card')
    assert page.locator('#catalog-grid .catalog-card').count()==1
    assert page.locator('#catalog-grid a[href^="carddeck.html"]').count()>0
    page.goto(BASE+'typecascade-component-demo.html',wait_until='networkidle')
    page.wait_for_function('document.querySelector("cellmotion-player").duration>0')
    assert page.evaluate('CellMotionAI.validate(document.querySelector("cellmotion-player").manifest).valid')
    assert page.evaluate('Array.isArray(document.querySelector("cellmotion-player").manifest.composition.rows)')
    assert not errors,errors
    print('PASS: homepage, both directories, verified web filter, previous rows-model AI pilot',flush=True)
    browser.close()
