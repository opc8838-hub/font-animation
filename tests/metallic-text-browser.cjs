// node tests/metallic-text-browser.cjs <node_modules> <browser> [base URL]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8784';
const output = path.resolve(__dirname, '../output/metallic-text-verification');
fs.mkdirSync(output, { recursive: true });
const browserPath = process.argv[3] || undefined;

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  context.on('page', opened => {
    opened.on('pageerror', error => errors.push(error.message));
    opened.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const scheme = () => page.evaluate(() => CellMotionMetallicText.getScheme());
  async function showText() { await page.locator('#selectText').click(); await page.locator('#fontSettings').evaluate(details => { details.open = true; }); }
  async function download(button, name) {
    if (button.startsWith('#export')) await page.locator('#openExport').click();
    const pending = page.waitForEvent('download', { timeout: 180000 });
    await page.locator(button).click();
    const file = path.join(output, name); await (await pending).saveAs(file);
    assert.ok(fs.statSync(file).size > 100, `Nonempty ${name}`); return file;
  }
  try {
    await page.goto(`${base}/metallic-text.html`);
    await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.deepEqual(await scheme(), await page.evaluate(async () => (await fetch('assets/presets/metallic-text-default.json')).json()));
    await page.evaluate(() => CellMotionMetallicText.seek(2.1));
    await page.screenshot({ path: path.join(output, 'desktop-dark.png') });
    const frames = await page.evaluate(() => {
      const target = document.createElement('canvas'); target.width = 640; target.height = 360;
      return [0, .45, 1.2, 2.1, 4.05, 4.64].map(at => { CellMotionMetallicText.render(target, at); return { at, png: target.toDataURL('image/png').split(',')[1] }; });
    });
    for (const frame of frames) fs.writeFileSync(path.join(output, `phase-${frame.at}.png`), Buffer.from(frame.png, 'base64'));
    assert.notEqual(frames[1].png, frames[3].png, 'Reflection changes pixels while lettering stays in place');
    await showText(); await page.locator('#text').fill('金属流光'); await page.locator('#text').dispatchEvent('change');
    await page.locator('#font').selectOption('stg:noto-sc-black', { force: true });
    await page.evaluate(() => {
      for (const [id, value] of Object.entries({ textColor: '#edc9a4', backgroundColor: '#102131', coolTint: '#64cfff', shine: '1.25', sweep: '2.8' })) {
        const input = document.getElementById(id); input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    const edited = await scheme();
    assert.equal(edited.scene.text, '金属流光'); assert.equal(edited.settings.font, 'stg:noto-sc-black');
    const saved = await download('#saveScheme', 'project.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(saved, 'utf8')), edited);
    await page.reload(); await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.deepEqual(await scheme(), edited, 'Reload retains edited material and text');
    await page.locator('#restoreScheme').click(); await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.text === 'OK');
    await page.locator('#schemeFile').setInputFiles(saved);
    await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.text === '金属流光');
    assert.deepEqual(await scheme(), edited, 'Import restores the complete scheme');
    await page.locator('#clearScheme').click(); await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.text === '');
    await page.locator('#schemeFile').setInputFiles(saved); await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.text === '金属流光');

    const ratios = [];
    for (const value of ['1080x1080', '1080x1920', '1920x1080']) {
      await page.locator('#canvasPreset').selectOption(value, { force: true });
      const ratio = await page.evaluate(() => { const rect = document.getElementById('stageFrame').getBoundingClientRect(); const c = CellMotionMetallicText.getScheme().canvas; return { actual: rect.width / rect.height, expected: c.width / c.height }; });
      assert.ok(Math.abs(ratio.actual - ratio.expected) < .002, `Stage ratio ${value}`); ratios.push(ratio);
    }
    const beforePreferences = await scheme();
    await page.locator('#themeButton').click(); await page.locator('#languageButton').click();
    assert.deepEqual(await scheme(), beforePreferences, 'Theme/language do not change composition');
    assert.equal(await page.locator('.tc-ai-trigger span').textContent(), 'For AI');
    await page.screenshot({ path: path.join(output, 'desktop-light-en.png') });
    await page.locator('#languageButton').click(); await page.locator('#themeButton').click();
    await page.locator('#canvasPreset').selectOption('custom', { force: true });
    for (const id of ['canvasWidth', 'canvasHeight']) { await page.locator(`#${id}`).fill('320'); await page.locator(`#${id}`).dispatchEvent('change'); }
    await page.locator('#openExport').click();
    const samples = [['cellmotion-square', 'METAL'], ['noto-sc-black', '金属流光'], ['noto-jp-black', '金属の光'], ['noto-kr-black', '금속빛']];
    for (const [font, text] of samples) {
      await showText();
      await page.locator('#text').fill(text); await page.locator('#text').dispatchEvent('change');
      await page.locator('#font').selectOption(`stg:${font}`, { force: true });
      await page.evaluate(() => CellMotionMetallicText.seek(1.8));
      await download('#exportPng', `${font}-320.png`);
    }
    await page.locator('#exportDuration').selectOption('custom', { force: true }); await page.locator('#customDuration').fill('1'); await page.locator('#customDuration').dispatchEvent('change');
    await page.locator('#exportFps').selectOption('15', { force: true });
    await download('#exportGif', 'square.gif'); await download('#exportMp4', 'square.mp4');
    await page.locator('[data-panel="motion"]').first().click();
    const scroll = await page.locator('.tc-properties[data-panel="motion"]').evaluate(element => { element.scrollTop = element.scrollHeight; return { bottom: element.scrollTop + element.clientHeight, height: element.scrollHeight }; });
    assert.ok(scroll.bottom >= scroll.height - 2, 'Inspector reaches its final control');

    await showText(); await page.locator('#text').fill('你好 AI'); await page.locator('#text').dispatchEvent('change');
    await page.locator('#font').selectOption('stg:noto-sc-black', { force: true });
    await page.locator('.tc-ai-trigger').click();
    const manifestFile = await download('[data-ai-action="json"]', 'live-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert.deepEqual(manifest.composition, await scheme());
    assert.ok(manifest.assets.fonts.some(font => font.id === 'stg:noto-sc-black'));
    assert.equal(manifest.parameterDefinitions.length, 31);
    assert.equal(await page.evaluate(value => CellMotionAI.validate(value).valid, manifest), true);
    await page.locator('.tc-ai-trigger').click(); await page.locator('[data-ai-action="params"]').click();
    assert.equal(await page.locator('.tc-ai-params code').count(), 31); await page.keyboard.press('Escape');
    await page.locator('.tc-ai-trigger').click();
    const popupPending = context.waitForEvent('page'); await page.locator('[data-ai-action="preview"]').click();
    const demo = await popupPending; await demo.waitForLoadState('domcontentloaded');
    await demo.waitForFunction(() => document.getElementById('demoPlayer')?._ready);
    const frame = demo.frameLocator('cellmotion-player iframe');
    await demo.locator('[data-player-action="pause"]').click();
    await frame.locator('#view').waitFor();
    await demo.waitForFunction(() => !document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.playing);
    const child = () => demo.evaluate(() => document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.getScheme());
    assert.deepEqual(await child(), manifest.composition, 'Real demo receives edited live state');
    await demo.locator('[data-player-action="play"]').click();
    await demo.waitForFunction(() => document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.playing);
    await demo.locator('#demoSeek').evaluate(input => { input.value = '1.5'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await demo.waitForFunction(() => Math.abs(document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.time - 1.5) < .01);
    const pixels = async target => target.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 320;
      CellMotionMetallicText.render(c, 1.5); return c.toDataURL('image/png');
    });
    const childFrame = demo.frames().find(item => item.url().includes('metallic-text.html'));
    await page.evaluate(() => CellMotionMetallicText.seek(1.5));
    assert.equal(await pixels(page), await pixels(childFrame), 'Editor and real player render identical pixels');
    await demo.locator('[data-player-action="restart"]').click();
    await demo.waitForFunction(() => document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.time < .25);
    const update = structuredClone(manifest.composition); update.scene.text = '更新成功'; update.scene.sweep = 1.2;
    await demo.evaluate(composition => document.getElementById('demoPlayer').update(composition), update);
    await demo.waitForFunction(() => document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.getScheme().scene.text === '更新成功');
    assert.ok(Math.abs(await demo.evaluate(() => document.getElementById('demoPlayer').duration) - (update.scene.intro + update.scene.sweep + update.scene.hold) / update.scene.speed) < .01);
    await childFrame.evaluate(() => window.dispatchEvent(new MessageEvent('message', { source: parent, origin: 'https://invalid.example', data: { type: 'cellmotion:update', bridgeVersion: '1.0.0', composition: {} } })));
    assert.equal((await child()).scene.text, '更新成功', 'Invalid origins cannot configure the renderer');
    await demo.screenshot({ path: path.join(output, 'live-ai-player.png'), fullPage: true });

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await page.evaluate(() => scrollTo(0, 0));
      for (const lang of ['zh', 'en']) {
        const current = await page.locator('body').getAttribute('data-editor-language'); if (current !== lang) await page.locator('#languageButton').click();
        const fit = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth, buttons: [...document.querySelectorAll('.tc-header button')].map(button => { const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, width: button.clientWidth, content: button.scrollWidth }; }) }));
        assert.ok(fit.page <= fit.viewport + 1, `No horizontal overflow at ${width} ${lang}`);
        assert.ok(fit.buttons.every(button => button.left >= 0 && button.right <= width && button.content <= button.width + 1), `Header buttons fit at ${width} ${lang}`);
      }
      await page.screenshot({ path: path.join(output, `mobile-${width}.png`), fullPage: true });
      await demo.setViewportSize({ width, height: 844 });
      assert.ok(await demo.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'AI demo fits mobile');
    }
    const host = await context.newPage();
    await host.goto(base.replace('127.0.0.1', 'localhost') + '/gallery.html');
    const configuredCode = await page.evaluate(value => CellMotionAI.configuredCode(value), manifest);
    await host.setContent(configuredCode);
    await host.waitForFunction(() => document.querySelector('cellmotion-player')?._ready);
    await host.evaluate(() => document.querySelector('cellmotion-player').seek(1.5));
    const remote = host.frames().find(item => item.url().includes('metallic-text.html'));
    await remote.waitForFunction(() => Math.abs(CellMotionMetallicText.time - 1.5) < .01);
    assert.equal(await pixels(page), await pixels(remote), 'Copied code works across origins with the same pixels');
    await host.close();
    const reduced = await context.newPage(); await reduced.emulateMedia({ reducedMotion: 'reduce' });
    await reduced.goto(`${base}/typecascade-component-demo.html?effect=metallic-text`);
    await reduced.waitForFunction(() => document.getElementById('demoPlayer')?._ready);
    const reducedFrame = reduced.frames().find(item => item.url().includes('metallic-text.html'));
    await reducedFrame.waitForFunction(() => window.CellMotionEffectBridge && CellMotionMetallicText.time > 0 && !CellMotionMetallicText.playing);
    await reduced.close();
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [url, selector] of [
      ['/', '#recent-grid a[href*="metallic-text.html"]'],
      ['/cellmotion-components.html', '.card-caption a[href*="metallic-text.html"]'],
      ['/cellmotion-editors.html', '.card-caption a[href*="metallic-text.html"]'],
      ['/gallery.html', '.card-caption a[href*="metallic-text.html"]'],
      ['/gallery.html?legacy=1', '.effect-link[href*="metallic-text.html"]']
    ]) {
      await page.goto(base + url); await page.locator(selector).first().waitFor();
      assert.ok(await page.locator(selector).count(), `Published directory entry ${url}`);
    }
    assert.deepEqual(errors, [], 'Clean browser console');
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ ratios, fontSamples: samples.length, liveParameters: manifest.parameterDefinitions.length, editorPlayerPixelsEqual: true, exports: ['png', 'gif', 'mp4'], errors }, null, 2));
    console.log('PASS: schemes, four language samples, ratios, exports, live/cross-origin AI pixel parity, reduced motion, mobile headers, all directory entries and clean console.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
