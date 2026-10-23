// node tests/fluedit-motion-browser.cjs <node_modules> <browser> [base URL] [output directory]
const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = (process.argv[4] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const output = path.resolve(process.argv[5] || path.join(__dirname, '../output/fluedit-motion'));

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
  page.on('pageerror', error => errors.push(error.message));
  const ready = async target => {
    await target.goto(`${base}/fluedit/`, { waitUntil: 'domcontentloaded' });
    await target.waitForFunction(() => !!window.CellMotionFluedit, null, { timeout: 90000 });
  };
  const state = target => target.evaluate(() => CellMotionFluedit.state());
  const pixels = target => target.locator('canvas').evaluate(canvas => canvas.toDataURL());
  try {
    await ready(page);
    assert.deepEqual((await state(page)).motion, {
      enabled: true, speed: 81, amount: 100, effect: 'flow', scale: 50,
      shiftEnabled: true, shiftAmount: 68, shiftSpeed: 100,
      spreadEnabled: false, spreadAmount: 30, spreadSpeed: 50,
    });
    const time = await page.evaluate(() => CellMotionFluedit.time());
    await page.waitForFunction(before => CellMotionFluedit.time() > before + .3, time);
    await page.locator('#cmPlay').click();
    const paused = await page.evaluate(() => CellMotionFluedit.time());
    const pausedPixels = await pixels(page);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => CellMotionFluedit.time()), paused);
    assert.equal(await pixels(page), pausedPixels);
    await page.locator('#cmReplay').click();
    await page.waitForFunction(() => CellMotionFluedit.time() > .1 && CellMotionFluedit.time() < 1);
    await page.evaluate(() => CellMotionFluedit.seek(0));
    const zero = await pixels(page);
    for (const seconds of [0, 1, 3, 4.85]) {
      await page.evaluate(time => CellMotionFluedit.seek(time), seconds);
      if (seconds === 1) assert.notEqual(await pixels(page), zero);
      await page.locator('#stage').screenshot({ path: path.join(output, `phase-${seconds}.png`) });
    }
    await page.locator('[data-shape="iris"]').click();
    await page.locator('[data-preset="2"]').click();
    await page.locator('#cmPlay').click();
    const beforeShape = await page.evaluate(() => CellMotionFluedit.time());
    await page.waitForFunction(before => CellMotionFluedit.time() > before + .2, beforeShape);
    assert.equal((await state(page)).motion.enabled, true);
    await page.locator('#restoreScheme').click();
    await page.waitForFunction(() => CellMotionFluedit.state().shape === 'butterfly' && CellMotionFluedit.time() > .1);
    await page.locator('[data-panel="motion"]').first().click();
    await page.locator('#motion-enabled').uncheck();
    const still = await pixels(page);
    await page.waitForTimeout(200);
    assert.equal(await pixels(page), still);
    console.log('PASS fresh autoplay, real pixel movement, pause/replay, new shape, palette and static mode');

    const legacy = await state(page);
    legacy.motion = { ...legacy.motion, enabled: false, speed: 35, amount: 35, shiftEnabled: false, shiftAmount: 25, shiftSpeed: 50 };
    const migration = async edited => {
      const context = await browser.newContext();
      await context.addInitScript(({ legacy, edited }) => {
        if (edited) legacy.stops[1].color = '#335577';
        localStorage.setItem('cellmotion-fluedit-library-v1', JSON.stringify({ active: 'butterfly', documents: { butterfly: legacy } }));
      }, { legacy, edited });
      const target = await context.newPage();
      target.on('pageerror', error => errors.push(error.message));
      await ready(target);
      const result = await state(target);
      assert.equal(result.motion.enabled, !edited);
      if (edited) assert.equal(result.stops[1].color, '#335577');
      if (edited) {
        await target.locator('#cmPlay').click();
        const playing = await state(target);
        assert.equal(playing.motion.shiftEnabled, true);
        assert.equal(playing.motion.speed, 81);
        assert.equal(playing.stops[1].color, '#335577');
      }
      await context.close();
    };
    await migration(false);
    await migration(true);
    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await ready(reducedPage);
    const reducedTime = await reducedPage.evaluate(() => CellMotionFluedit.time());
    await reducedPage.waitForTimeout(200);
    assert.equal(await reducedPage.evaluate(() => CellMotionFluedit.time()), reducedTime);
    await reducedPage.locator('#cmPlay').click();
    await reducedPage.waitForFunction(() => CellMotionFluedit.time() > .1);
    await reduced.close();
    console.log('PASS untouched legacy migration, edited static preservation, reduced-motion preference and explicit play');

    await page.locator('#restoreScheme').click();
    await page.locator('#cmCanvasPreset').selectOption('custom', { force: true });
    for (const [id, size] of [['cmWidth', 768], ['cmHeight', 432]]) {
      await page.locator(`#${id}`).fill(String(size));
      await page.locator(`#${id}`).dispatchEvent('change');
    }
    const video = page.waitForEvent('download', { timeout: 180000 });
    await page.evaluate(() => { void CellMotionFluedit.exportArtwork('mp4'); });
    await (await video).saveAs(path.join(output, 'fluedit-default-cycle.mp4'));
    for (const [id, size] of [['cmWidth', 320], ['cmHeight', 320]]) {
      await page.locator(`#${id}`).fill(String(size));
      await page.locator(`#${id}`).dispatchEvent('change');
    }
    await page.locator('.tc-export-shortcut').click();
    await page.locator('#cmDuration').selectOption('custom', { force: true });
    await page.locator('#cmSeconds').fill('1'); await page.locator('#cmSeconds').dispatchEvent('change');
    await page.locator('#cmFps').selectOption('15', { force: true });
    const gif = page.waitForEvent('download', { timeout: 120000 });
    await page.locator('#cmExportGif').click();
    await (await gif).saveAs(path.join(output, 'fluedit-default.gif'));
    assert.deepEqual(errors, []);
    console.log('PASS real default-motion cycle MP4 and animated GIF exports; no page errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
