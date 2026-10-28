// node tests/metallic-backgrounds-browser.cjs <node_modules> <browser> [base URL]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8784';
const fixture = name => path.resolve(__dirname, 'fixtures/metallic-backgrounds', name);
const output = path.resolve(__dirname, '../output/metallic-background-verification'); fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  const errors = [];
  context.on('page', page => { page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); }); });
  const page = await context.newPage();
  const state = () => page.evaluate(() => CellMotionMetallicText.getScheme());
  async function setNumber(id, value) { await page.locator('#' + id).fill(String(value)); await page.locator('#' + id).dispatchEvent('change'); }
  async function capture(target, at) {
    return target.evaluate(async at => {
      await CellMotionMetallicText.seek(at); await CellMotionMetallicText.prepareFrame(at);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 320; CellMotionMetallicText.render(canvas, at);
      return { pixel: [...canvas.getContext('2d').getImageData(5, 5, 1, 1).data], png: canvas.toDataURL('image/png') };
    }, at);
  }
  async function upload(name) {
    await page.locator('#openBackground').click(); await page.locator('#backgroundFile').setInputFiles(fixture(name));
    await page.waitForFunction(name => CellMotionMetallicText.getScheme().scene.backgroundMedia?.name === name, name);
    await page.waitForFunction(() => document.getElementById('backgroundStatus').textContent.includes('已更新'));
  }
  async function download(selector, name) {
    if (selector.startsWith('#export')) await page.locator('#openExport').click();
    const pending = page.waitForEvent('download', { timeout: 180000 }); await page.locator(selector).click();
    const file = path.join(output, name); await (await pending).saveAs(file); assert.ok(fs.statSync(file).size > 100); return file;
  }
  const dominant = (rgba, channel) => assert.ok(rgba[channel] > 180 && rgba.filter((_, i) => i < 3 && i !== channel).every(value => value < 100), `Expected channel ${channel}: ${rgba}`);
  try {
    await page.goto(`${base}/metallic-text.html?from=gallery`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    const preservation = await page.evaluate(async () => {
      await CellMotionMetallicText.seek(2.1);
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540; CellMotionMetallicText.render(canvas, 2.1);
      const current = canvas.getContext('2d').getImageData(0, 0, 960, 540).data;
      const source = await createImageBitmap(await (await fetch('final_metallic-text.png')).blob());
      canvas.getContext('2d').drawImage(source, 0, 0); const previous = canvas.getContext('2d').getImageData(0, 0, 960, 540).data;
      let total = 0, max = 0; for (let i = 0; i < current.length; i++) { const delta = Math.abs(current[i] - previous[i]); total += delta; max = Math.max(max, delta); }
      return { mean: total / current.length, max };
    });
    assert.ok(preservation.mean < .05, `Frozen default material: ${JSON.stringify(preservation)}`);
    const initial = await state();
    await page.locator('#tcBackdropToggle').click(); await page.locator('#tcBackdropEnabled').check();
    await page.locator('#tcBackdropColor').evaluate(input => { input.value = '#ff00aa'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#tcBackdropEnabled').uncheck(); await page.keyboard.press('Escape');
    assert.deepEqual(await state(), initial, 'Stage fill is separate from composition');
    await page.locator('#fontSettings').evaluate(details => { details.open = true; }); await setNumber('fontSizeExact', 73);
    assert.equal((await state()).scene.fontSize, .73); await page.locator('#undoButton').click();
    await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.fontSize === .8);
    await page.locator('#redoButton').click(); await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.fontSize === .73);
    await page.locator('#restoreScheme').click();
    await page.locator('#canvasPreset').selectOption('custom', { force: true }); await setNumber('canvasWidth', 320); await setNumber('canvasHeight', 320);
    await upload('crop.png'); await setNumber('cropZoomExact', 2);
    const crop = page.locator('#backgroundCrop'), box = await crop.boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5, { steps: 8 }); await page.mouse.up();
    assert.ok((await state()).scene.backgroundMedia.cropX < .35, 'Crop drag pans the selected background');
    await crop.focus(); await page.keyboard.press('ArrowRight');
    const imageState = await state();
    assert.equal(imageState.scene.backgroundMedia.cropZoom, 2);
    await page.screenshot({ path: path.join(output, 'image-crop-desktop.png') });
    await page.locator('#text').fill('已编辑'); await page.locator('#text').dispatchEvent('change');
    await page.goto(`${base}/metallic-text.html?from=gallery`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.equal((await state()).scene.text, 'OK', 'Gallery entry always opens approved default');
    await page.goto(`${base}/metallic-text.html`); await page.waitForFunction(() => window.CellMotionEffectBridge); await page.locator('#restoreScheme').click();
    await page.locator('#canvasPreset').selectOption('custom', { force: true }); await setNumber('canvasWidth', 320); await setNumber('canvasHeight', 320);
    await upload('delays.gif');
    const gifSamples = [];
    for (const [at, channel] of [[.05, 0], [.2, 1], [.6, 2], [.75, 0]]) { const frame = await capture(page, at); dominant(frame.pixel, channel); gifSamples.push(frame.pixel); }
    const gifScheme = await download('#saveScheme', 'gif-project.json');
    await page.reload(); await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.equal((await state()).scene.backgroundMedia.fileType, 'image/gif'); dominant((await capture(page, .2)).pixel, 1);
    await page.locator('#openExport').click(); await page.locator('#exportDuration').selectOption('custom', { force: true }); await setNumber('customDuration', .9);
    await page.locator('#exportFps').selectOption('15', { force: true }); await download('#exportGif', 'gif-background.gif');
    await upload('trim-source.mp4');
    await setNumber('videoStart', .6); await setNumber('videoEnd', 2.4);
    await page.locator('#videoStartHandle').focus(); await page.keyboard.press('ArrowRight');
    assert.ok(Math.abs((await state()).scene.backgroundMedia.videoStart - .7) < .001);
    const track = await page.locator('#videoTimeline').boundingBox(), handle = await page.locator('#videoEndHandle').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down(); await page.mouse.move(track.x + track.width * .7, handle.y + handle.height / 2, { steps: 6 }); await page.mouse.up();
    assert.ok((await state()).scene.backgroundMedia.videoEnd < 2.2, 'Video trim handle changes the selected interval');
    await setNumber('videoEnd', 2.4);
    await page.waitForFunction(() => { const ctx = document.getElementById('videoFilmstrip').getContext('2d'); return ctx.getImageData(45, 48, 1, 1).data[0] > 150; });
    const videoSamples = [];
    for (const [at, channel] of [[.5, 1], [1.4, 2], [1.9, 0]]) { const frame = await capture(page, at); dominant(frame.pixel, channel); videoSamples.push(frame.pixel); }
    const saved = await download('#saveScheme', 'video-project.json'), videoState = await state();
    await page.reload(); await page.waitForFunction(() => window.CellMotionEffectBridge); assert.deepEqual(await state(), videoState, 'Video, crop and trim survive reload');
    await page.locator('#restoreScheme').click(); await page.locator('#schemeFile').setInputFiles(saved);
    await page.waitForFunction(() => CellMotionMetallicText.getScheme().scene.backgroundMedia?.name === 'trim-source.mp4');
    assert.deepEqual(await state(), videoState, 'Video source bytes and trim survive import');
    await page.locator('#openExport').click(); await page.locator('#exportDuration').selectOption('custom', { force: true }); await setNumber('customDuration', 2.2);
    await page.locator('#exportFps').selectOption('15', { force: true }); await download('#exportMp4', 'trimmed-video-background.mp4'); await download('#exportPng', 'video-background.png');
    await page.locator('#openBackground').click(); await page.screenshot({ path: path.join(output, 'video-trim-desktop.png') });
    await page.locator('.tc-ai-trigger').click(); const manifestFile = await download('[data-ai-action="json"]', 'media-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert.deepEqual(manifest.composition, videoState); assert.equal(manifest.assets.backgrounds[0].owner, 'scene');
    assert.equal(manifest.assets.videos[0].trimStart, .7); assert.equal(manifest.assets.videos[0].trimEnd, 2.4);
    assert.ok(manifest.assets.embedded.some(asset => asset.kind === 'video' && asset.embedded));
    assert.equal(manifest.parameterDefinitions.length, 31);
    const demo = await context.newPage(); await demo.goto(`${base}/typecascade-component-demo.html?effect=metallic-text`);
    await demo.waitForFunction(() => document.getElementById('demoPlayer')?._ready);
    manifest.presentation.autoplay = false; await demo.evaluate(manifest => { document.getElementById('demoPlayer').manifest = manifest; }, manifest);
    await demo.waitForFunction(() => document.getElementById('demoPlayer').iframe.contentWindow.CellMotionMetallicText.getScheme().scene.backgroundMedia?.name === 'trim-source.mp4');
    const frame = demo.frames().find(frame => frame.url().includes('metallic-text.html'));
    assert.equal((await capture(page, 1.4)).png, (await capture(frame, 1.4)).png, 'Trimmed video has identical editor/player pixels');
    const gif = JSON.parse(fs.readFileSync(gifScheme, 'utf8'));
    await demo.evaluate(scheme => document.getElementById('demoPlayer').update(scheme), gif);
    await frame.waitForFunction(() => CellMotionMetallicText.getScheme().scene.backgroundMedia?.name === 'delays.gif'); dominant((await capture(frame, .2)).pixel, 1);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await page.evaluate(() => scrollTo(0, 0));
      for (const language of ['zh', 'en']) {
        if (await page.locator('body').getAttribute('data-editor-language') !== language) await page.locator('#languageButton').click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Background editor fits mobile');
      }
      await page.screenshot({ path: path.join(output, `mobile-${width}.png`), fullPage: true });
    }
    await page.locator('#openBackground').click(); await page.locator('#removeBackground').click();
    assert.equal((await state()).scene.backgroundMedia, undefined, 'Remove returns to solid background');
    assert.deepEqual(errors, [], 'Console stays clean with media, seeking and exports');
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ preservation, gifSamples, videoSamples, parameters: 31, mediaRoundtrip: true, videoPlayerPixelsEqual: true, errors }, null, 2));
    console.log('PASS: frozen default, stage preferences, exact values/history, image crop, GIF delays, video filmstrip/trim, media save/import/reload, real exports and live AI media parity.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
