// node tests/glass-icon-reveal-browser.cjs <node_modules directory> <browser executable> [base URL]
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = (process.argv[4] || 'http://127.0.0.1:8766').replace(/\/$/, '');
const browserPath = process.argv[3] || undefined;
const output = path.resolve(__dirname, '../output/glass-icon-reveal');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  try {
    await page.goto(`${base}/glass-icon-reveal.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.CellMotionGlassReveal && document.querySelector('#view').width > 0, null, { timeout: 60000 });
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('#renderError').isHidden(), true);
    assert.equal(await page.locator('#timeline .me-choreo-block').count(), 4);
    await page.evaluate(() => CellMotionGlassReveal.seek(.12));
    await page.locator('#stageFrame').screenshot({ path: path.join(output, 'droplet-frame.png') });
    await page.evaluate(() => CellMotionGlassReveal.seek(1.45));
    await page.locator('#stageFrame').screenshot({ path: path.join(output, 'release-frame.png') });
    await page.evaluate(() => CellMotionGlassReveal.seek(.84));
    await page.locator('#stageFrame').screenshot({ path: path.join(output, 'square-frame.png') });
    await page.screenshot({ path: path.join(output, 'desktop.png') });
    await page.locator('.tc-tabs [data-panel="motion"]').click();
    await page.locator('#loop').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#loop').isVisible(), true);
    await page.locator('.tc-tabs [data-panel="content"]').click();
    const square = await page.locator('#stageFrame').boundingBox();
    assert.ok(Math.abs(square.width / square.height - 1) < .01);
    await page.locator('#themeButton').click();
    await page.locator('#languageButton').click();
    assert.equal(await page.locator('body').getAttribute('data-editor-theme'), 'light');
    assert.equal(await page.locator('.tc-tabs [data-panel="motion"]').textContent(), 'Motion');
    await page.locator('#canvasPreset').selectOption('1080x1920');
    const portrait = await page.locator('#stageFrame').boundingBox();
    assert.ok(Math.abs(portrait.width / portrait.height - 9 / 16) < .01);
    await page.locator('[data-preset="text"]').click();
    await page.locator('#logoText').fill('玻璃');
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#renderError').isHidden(), true);
    await page.locator('#stageFrame').screenshot({ path: path.join(output, 'portrait-chinese.png') });
    await page.locator('#undoButton').click();
    assert.equal(await page.evaluate(() => CellMotionGlassReveal.state().P.text), 'Aa');
    await page.locator('#redoButton').click();
    assert.equal(await page.evaluate(() => CellMotionGlassReveal.state().P.text), '玻璃');
    for (const [font, sample] of [['stg:space-grotesk', 'Motion'], ['stg:noto-sc', '玻璃'], ['stg:noto-jp-black', 'ガラス'], ['stg:noto-kr-black', '유리']]) {
      await page.locator('#logoFont').selectOption(font);
      await page.locator('#logoText').fill(sample);
      await page.waitForTimeout(450);
      await page.waitForFunction(() => CellMotionGlassReveal.ready);
      assert.equal(await page.locator('#renderError').isHidden(), true);
    }
    await page.locator('[data-source="library"]').click();
    await page.locator('[data-asset-id="flow-music"]').click();
    await page.locator('#insertAsset').click();
    await page.waitForFunction(() => CellMotionGlassReveal.state().assetId === 'flow-music');
    assert.equal(await page.locator('#renderError').isHidden(), true);
    const [scheme] = await Promise.all([page.waitForEvent('download'), page.locator('#saveScheme').click()]);
    const schemePath = path.join(output, 'scheme.json'); await scheme.saveAs(schemePath);
    await page.locator('#restoreScheme').click();
    assert.equal(await page.evaluate(() => CellMotionGlassReveal.state().assetId), '');
    await page.locator('#schemeFile').setInputFiles(schemePath);
    await page.waitForFunction(() => CellMotionGlassReveal.state().assetId === 'flow-music');
    await page.locator('[data-asset-id="construct-cloud-paper"]').click();
    await page.locator('#insertAsset').click();
    await page.waitForFunction(() => CellMotionGlassReveal.ready);
    assert.equal(await page.locator('#renderError').isHidden(), true);
    await page.locator('[data-asset-id="bot-01"]').click();
    await page.locator('#insertAsset').click();
    await page.waitForFunction(() => CellMotionGlassReveal.ready);
    assert.equal(await page.locator('#renderError').isHidden(), true);
    await page.locator('#restoreScheme').click();
    await page.locator('#canvasPreset').selectOption('custom');
    await page.locator('#canvasWidth').fill('256'); await page.locator('#canvasWidth').dispatchEvent('change');
    await page.locator('#canvasHeight').fill('256'); await page.locator('#canvasHeight').dispatchEvent('change');
    await page.locator('#openExport').click();
    await page.locator('#exportScale').selectOption('0.25');
    await page.locator('#exportFps').selectOption('15');
    await page.evaluate(() => CellMotionGlassReveal.seek(.84));
    for (const format of ['png', 'gif', 'mp4']) {
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.locator(`#export${format[0].toUpperCase()}${format.slice(1)}`).click()]);
      const file = path.join(output, download.suggestedFilename());
      await download.saveAs(file);
      assert.ok(fs.statSync(file).size > 100, `${format} export is empty`);
      if (format === 'png') { const bytes = fs.readFileSync(file); assert.equal(bytes.readUInt32BE(16), 64); assert.equal(bytes.readUInt32BE(20), 64); }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.evaluate(() => CellMotionGlassReveal.seek(.84));
    const mobile = await page.evaluate(() => {
      const stage = document.querySelector('.tc-center').getBoundingClientRect();
      const content = document.querySelector('.tc-content').getBoundingClientRect();
      return { stageBottom: stage.bottom, contentTop: content.top, overflow: document.documentElement.scrollWidth > innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(node => `${node.tagName}.${node.className || node.id}`) };
    });
    assert.ok(mobile.stageBottom <= mobile.contentTop + 2);
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    assert.equal(mobile.overflow, false, JSON.stringify(mobile));
    const gallery = await context.newPage();
    gallery.on('pageerror', error => errors.push(error.message));
    await gallery.goto(`${base}/gallery.html?legacy=1`, { waitUntil: 'domcontentloaded' });
    await gallery.waitForFunction(() => !!document.querySelector('a[href*="glass-icon-reveal.html"]'));
    assert.equal(await gallery.locator('video[src*="glass-icon-reveal-card.mp4"]').count(), 1);
    await gallery.goto(`${base}/cellmotion-components.html`, { waitUntil: 'domcontentloaded' });
    await gallery.waitForFunction(() => !!document.querySelector('a[href*="glass-icon-reveal.html"]'));
    assert.deepEqual(errors, []);
    console.log('Glass reveal browser, layout, Chinese text, PNG/GIF/MP4 exports: PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
