// node tests/fluedit-standard-browser.cjs <node_modules> <browser> [base URL]
const path = require('node:path');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = (process.argv[4] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const shapes = ['butterfly', 'iris', 'clover', 'aura', 'wings', 'bloom', 'halo', 'petal'];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  const errors = [];
  let embedServer;
  const output = path.resolve(__dirname, '../output/fluedit-standard');
  await fs.mkdir(output, { recursive: true });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(shapes => {
    const documents = Object.fromEntries(shapes.map((shape, index) => [shape, {
      shape, field: { spread: 100, offset: 0 }, areas: [],
      motion: { enabled: true, speed: 54 + index, amount: 35, effect: 'flow', scale: 50,
        shiftEnabled: false, shiftAmount: 25, shiftSpeed: 50,
        spreadEnabled: false, spreadAmount: 30, spreadSpeed: 50 },
      stops: ['#020d10', '#0800ff', '#ff32ee', '#ff2400', '#ffff00'].map((color, i) => ({ id: i + 1, color, position: i / 4, midpoint: .5, blend: 1 })),
      depth: 50, saturation: 100, contrast: 100, brightness: 0, softness: 0, grain: 100,
    }]));
    localStorage.setItem('cellmotion-fluedit-library-v1', JSON.stringify({ active: 'iris', documents }));
  }, shapes);
  const pixels = target => target.locator('canvas').evaluate(canvas => {
    const sample = document.createElement('canvas'); sample.width = 160; sample.height = 90;
    const context = sample.getContext('2d'); context.drawImage(canvas, 0, 0, 160, 90);
    return Array.from(context.getImageData(0, 0, 160, 90).data);
  });
  try {
    await page.goto(`${base}/fluedit/?v=20261023-standard1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.CellMotionFluedit, null, { timeout: 90000 });
    assert.equal(await page.evaluate(() => CellMotionFluedit.state().motion.shiftEnabled), true, 'edited legacy speed must still enable visible color shift');
    if (!process.argv.includes('--ui')) for (const [index, shape] of shapes.entries()) {
      await page.locator(`[data-shape="${shape}"]`).click();
      const state = await page.evaluate(() => CellMotionFluedit.state());
      assert.equal(state.motion.speed, 54 + index, 'retain the edited playback speed');
      await page.evaluate(() => CellMotionFluedit.seek(0));
      const before = await pixels(page);
      await page.locator('#cmPlay').click();
      await page.waitForFunction(() => CellMotionFluedit.time() > 1 && CellMotionFluedit.time() < 2.5);
      const after = await pixels(page);
      const difference = after.reduce((sum, value, i) => sum + Math.abs(value - before[i]), 0) / after.length;
      assert.ok(difference > 3, `${shape} should visibly animate: ${difference}`);
      console.log(JSON.stringify({ shape, livePixelDifference: difference }));
    }
    await page.locator('[data-shape="iris"]').click();
    await page.evaluate(() => CellMotionFluedit.seek(.8));
    const artwork = await page.evaluate(() => JSON.stringify(CellMotionFluedit.state()));
    await page.locator('#tcBackdropToggle').click();
    await page.locator('#tcBackdropColor').fill('#263344');
    await page.locator('#tcBackdropColor').dispatchEvent('input');
    assert.equal(await page.locator('.preview').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(38, 51, 68)');
    assert.equal(await page.evaluate(() => JSON.stringify(CellMotionFluedit.state())), artwork);
    await page.locator('#tcBackdropEnabled').check();
    assert.equal(await page.locator('.preview').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(209, 217, 254)');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.tc-backdrop-popover').isVisible(), false);
    for (const [preset, ratio] of [['1080x1080', 1], ['1080x1920', 9 / 16], ['1920x1080', 16 / 9]]) {
      await page.locator('#cmCanvasPreset').selectOption(preset, { force: true });
      const bounds = await page.locator('#stage').boundingBox();
      assert.ok(Math.abs(bounds.width / bounds.height - ratio) < .01);
    }
    await page.locator('#cmCanvasPreset').selectOption('custom', { force: true });
    for (const [id, value] of [['cmWidth', '320'], ['cmHeight', '480']]) {
      await page.locator(`#${id}`).fill(value); await page.locator(`#${id}`).dispatchEvent('change');
    }
    await page.locator('#cmBackground').fill('#b8c4d5');
    await page.locator('#cmBackground').dispatchEvent('input');
    await page.evaluate(() => {
      const scheme = CellMotionEffectBridge.getScheme();
      scheme.scene.stops[1].color = '#1144ee';
      scheme.scene.areas = [{ id: 1, color: '#44eedd', x: 42, y: 50, radius: 25, strength: 55, softness: 90, stretch: 100, mirror: true, visible: true, rotation: 0, bend: 0, taper: 0, wing: 'both' }];
      CellMotionEffectBridge.applyScheme(scheme, { autoplay: false });
    });
    const menu = async action => {
      await page.locator('.tc-ai-trigger').click();
      await page.locator(`[data-ai-action="${action}"]`).click();
    };
    console.log('PASS stage backdrop independence, canvas sizes and edited live state');
    const download = page.waitForEvent('download', { timeout: 30000 });
    await menu('json');
    const file = await download;
    const manifest = JSON.parse(await fs.readFile(await file.path(), 'utf8'));
    assert.equal(manifest.effect.id, 'fluedit');
    assert.equal(manifest.effect.name.zh, '流彩');
    assert.ok(manifest.parameterDefinitions.every(parameter => !parameter.name.zh.includes('??')));
    assert.equal(manifest.composition.scene.shape, 'iris');
    assert.equal(manifest.composition.scene.background, '#b8c4d5');
    assert.equal(manifest.composition.scene.stops[1].color, '#1144ee');
    assert.equal(manifest.composition.scene.areas[0].color, '#44eedd');
    assert.deepEqual(manifest.composition.canvas, { width: 320, height: 480, fps: 30 });
    assert.ok(new URL(manifest.$schema).pathname.endsWith('/schemas/cellmotion-component-v1.schema.json'));
    assert.equal(await page.evaluate(m => CellMotionAI.validate(m).valid, manifest), true);
    console.log('PASS live Manifest download and validation');
    await menu('params');
    assert.equal(await page.locator('.tc-ai-dialog').isVisible(), true);
    assert.ok(await page.locator('.tc-ai-params code').count() > 40);
    await page.keyboard.press('Escape');
    await menu('prompt');
    await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('不要重新猜测或重写动画'));
    assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('"#1144ee"'));
    await menu('code');
    await page.waitForFunction(async () => (await navigator.clipboard.readText()).startsWith('<script'));
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(copied.includes(`${base}/cellmotion-player.js`), 'copied code must resolve root player from nested editor');
    assert.ok(copied.includes('"#1144ee"'));
    console.log('PASS parameter guide and configured code clipboard');
    const storageBefore = await page.evaluate(() => localStorage.getItem('cellmotion-fluedit-library-v1'));
    const popupPromise = page.waitForEvent('popup');
    await menu('preview');
    const demo = await popupPromise;
    demo.on('pageerror', error => errors.push(error.message));
    await demo.waitForFunction(() => document.querySelector('cellmotion-player')?._ready, null, { timeout: 90000 });
    console.log('PASS real demo player ready');
    const frame = demo.frames().find(frame => frame.url().includes('/fluedit/'));
    assert.ok(frame, 'real shared player embeds the authoritative Fluedit renderer');
    await frame.waitForFunction(() => window.CellMotionFluedit?.state().stops[1].color === '#1144ee');
    assert.equal(await frame.locator('.tc-header').isVisible(), false);
    await demo.locator('[data-player-action="pause"]').click();
    await demo.locator('#demoSeek').fill('0.8'); await demo.locator('#demoSeek').dispatchEvent('input');
    await frame.waitForFunction(() => Math.abs(CellMotionFluedit.time() - .8) < .001);
    await page.evaluate(() => CellMotionFluedit.seek(.8));
    const editorPixels = await pixels(page), playerPixels = await pixels(frame);
    const parity = playerPixels.reduce((sum, value, i) => sum + Math.abs(value - editorPixels[i]), 0) / playerPixels.length;
    assert.ok(parity < 3, `player and editor must share artwork pixels: ${parity}`);
    await demo.locator('[data-player-action="restart"]').click();
    await frame.waitForFunction(() => CellMotionFluedit.time() > .1 && CellMotionFluedit.time() < 1);
    const updated = structuredClone(manifest.composition); updated.scene.stops[1].color = '#ee4400';
    await demo.evaluate(composition => document.querySelector('cellmotion-player').update(composition), updated);
    await frame.waitForFunction(() => CellMotionFluedit.state().stops[1].color === '#ee4400');
    assert.equal(await page.evaluate(() => localStorage.getItem('cellmotion-fluedit-library-v1')), storageBefore, 'preview must not overwrite editor autosave');
    await demo.close();
    const embed = await browser.newPage();
    embed.on('pageerror', error => { errors.push(error.message); console.log('Embed error:', error.message); });
    embedServer = http.createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html><body>${copied}</body></html>`);
    });
    await new Promise(resolve => embedServer.listen(0, '127.0.0.1', resolve));
    const embedOrigin = `http://127.0.0.1:${embedServer.address().port}`;
    await embed.goto(`${embedOrigin}/integration.html`);
    await embed.waitForFunction(() => document.querySelector('cellmotion-player')?._ready, null, { timeout: 90000 });
    const crossFrame = embed.frames().find(frame => frame.url().includes('/fluedit/'));
    await crossFrame.waitForFunction(() => window.CellMotionFluedit?.state().stops[1].color === '#1144ee');
    await embed.evaluate(() => document.querySelector('cellmotion-player').pause());
    await crossFrame.waitForFunction(() => document.querySelector('#cmPlay').getAttribute('aria-pressed') === 'false');
    const crossTime = await crossFrame.evaluate(() => CellMotionFluedit.time());
    await embed.evaluate(() => {
      const player = document.querySelector('cellmotion-player');
      player.iframe.contentWindow.postMessage({ type: 'cellmotion:seek', bridgeVersion: '999', seconds: 8 }, new URL(player.iframe.src).origin);
    });
    await crossFrame.waitForTimeout(150);
    assert.equal(await crossFrame.evaluate(() => CellMotionFluedit.time()), crossTime, 'reject unsupported bridge versions');
    await crossFrame.evaluate(() => {
      dispatchEvent(new MessageEvent('message', { source: parent, origin: 'https://invalid.example', data: { type: 'cellmotion:seek', bridgeVersion: '1.0.0', seconds: 8 } }));
      window.postMessage({ type: 'cellmotion:seek', bridgeVersion: '1.0.0', seconds: 8 }, location.origin);
    });
    await crossFrame.waitForTimeout(150);
    assert.equal(await crossFrame.evaluate(() => CellMotionFluedit.time()), crossTime, 'reject wrong origins and non-parent sources');
    await embed.close();
    await page.locator('.site-theme-toggle').click();
    await page.locator('.site-language-toggle').click();
    await page.waitForFunction(() => document.querySelector('.tc-ai-trigger').textContent.includes('For AI'));
    const beforePreferences = await page.evaluate(() => CellMotionFluedit.state());
    await page.locator('.tc-ai-trigger').click();
    await page.screenshot({ path: path.join(output, 'desktop-light-en.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await page.locator('.site-language-toggle').click();
    await page.locator('.site-theme-toggle').click();
    assert.deepEqual(await page.evaluate(() => CellMotionFluedit.state()), beforePreferences);
    for (const width of [320, 390, 1024, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${width}`);
      assert.equal(await page.locator('.tc-ai-trigger').isVisible(), true);
      assert.equal(await page.locator('#tcBackdropToggle').isVisible(), true);
      await page.screenshot({ path: path.join(output, `editor-${width}.png`), fullPage: true });
    }
    console.log(JSON.stringify({ stageBackdropIndependent: true, canvasRatios: true, liveManifest: true, menuAndClipboard: true, playerPixelDifference: parity, crossOriginCode: true, playerControls: true, previewPreservesAutosave: true, mobileHeader: true }));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); embedServer?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
