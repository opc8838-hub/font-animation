from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(r"C:\Users\Administrator\AppData\Roaming\grokapp\grok-app\data\workspaces\general\preview")
OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:8081"
GRAY = "rgb(231, 231, 234)"
LIME = "rgb(215, 255, 47)"
SKY = "rgb(142, 200, 255)"
MINT = "rgb(157, 231, 215)"

def page_info(page):
    return page.evaluate("""() => ({
      shell: document.body.classList.contains('tc-workspace'),
      rows: [...document.querySelectorAll('#tcRowList .tc-row-text')].map(el => el.textContent.trim()),
      ai: !!document.querySelector('.tc-ai-trigger'),
      blocks: [...document.querySelectorAll('#timeline .gm-timeline-block, #choreoBar .me-choreo-block, .me-choreo-bar .me-choreo-block')].slice(0, 10).map(el => ({
        label: el.querySelector('strong')?.textContent?.trim(),
        color: getComputedStyle(el).backgroundColor
      })),
      errors: window.__pageErrors || []
    })""")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.add_init_script("window.__pageErrors=[]; window.addEventListener('error', e => window.__pageErrors.push(e.message));")
    page.add_init_script("localStorage.setItem('cellmotion-editor-theme','light');")

    page.goto(f"{BASE}/sproutshift.html?from=gallery", wait_until="domcontentloaded")
    page.wait_for_timeout(2200)
    page.evaluate("() => { window.__morphPortTest?.setTime(0); document.querySelector('.tc-phase-scroll') && (document.querySelector('.tc-phase-scroll').scrollLeft = 0); }")
    sprout = page_info(page)
    print("SPROUT", sprout)
    assert sprout["shell"]
    assert "ME Studio" not in " ".join(sprout["rows"])
    assert len(sprout["rows"]) == 6
    assert sprout["ai"]
    FIVE = {LIME, SKY, MINT, "rgb(255, 196, 214)", "rgb(255, 210, 125)"}
    labels = [b["label"] for b in sprout["blocks"]]
    assert "萌发开场" in labels and "停留" in labels and "缩小退出" in labels and "缩放生长" in labels and "放大出现" in labels, labels
    colors = {b["color"] for b in sprout["blocks"]}
    assert GRAY not in colors, sprout["blocks"]
    assert FIVE <= colors, colors
    page.screenshot(path=str(OUT / "30-latest-ziya.png"))

    page.goto(f"{BASE}/typecascade.html?from=gallery", wait_until="domcontentloaded")
    page.wait_for_selector("#timeline .gm-timeline-block", timeout=15000)
    page.wait_for_timeout(800)
    cascade = page_info(page)
    print("CASCADE", cascade["blocks"][:6], "ai", cascade["ai"])
    by = {b["label"]: b["color"] for b in cascade["blocks"]}
    assert by.get("立字开场") == LIME
    assert by.get("停留") == SKY
    assert by.get("倾倒") == MINT
    assert cascade["ai"]
    page.screenshot(path=str(OUT / "31-latest-ziqing.png"))

    page.goto(f"{BASE}/currentwall.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1800)
    water = page_info(page)
    print("WATER shell", water["shell"], "blocks", water["blocks"][:5], "errors", water["errors"])
    assert water["shell"]
    assert water["blocks"]
    assert all(b["color"] != GRAY for b in water["blocks"] if b["color"])
    page.screenshot(path=str(OUT / "32-latest-water.png"))

    page.goto(f"{BASE}/mistlift.html?from=gallery", wait_until="domcontentloaded")
    page.wait_for_timeout(1800)
    mist = page_info(page)
    print("MIST", mist["rows"][:3], "ai", mist["ai"], "blocks", mist["blocks"][:3])
    assert mist["shell"] and mist["ai"]
    browser.close()
print("PASS")
