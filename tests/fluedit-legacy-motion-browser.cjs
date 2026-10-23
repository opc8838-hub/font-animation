// node tests/fluedit-legacy-motion-browser.cjs <node_modules> <browser> [base URL]
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = (process.argv[4] || 'http://127.0.0.1:8765').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const state = {
      shape: 'butterfly', field: { spread: 100, offset: 0 }, areas: [],
      motion: { enabled: true, speed: 35, amount: 35, effect: 'flow', scale: 50,
        shiftEnabled: false, shiftAmount: 25, shiftSpeed: 50,
        spreadEnabled: false, spreadAmount: 30, spreadSpeed: 50 },
      stops: ['#020d10', '#0800ff', '#ff32ee', '#ff2400', '#ffff00'].map((color, i) => ({ id: i + 1, color, position: i / 4, midpoint: .5, blend: 1 })),
      depth: 50, saturation: 100, contrast: 100, brightness: 0, softness: 0, grain: 100,
      background: '#dae2fc',
    };
    state.stops[2].color = '#ef30ee';
    localStorage.setItem('cellmotion-fluedit-library-v1', JSON.stringify({ active: 'butterfly', documents: { butterfly: state } }));
  });
  const ready = async () => {
    await page.goto(`${base}/fluedit/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.CellMotionFluedit, null, { timeout: 90000 });
  };
  const pixels = () => page.locator('canvas').evaluate(canvas => {
    const sample = document.createElement('canvas'); sample.width = 160; sample.height = 90;
    const context = sample.getContext('2d'); context.drawImage(canvas, 0, 0, 160, 90);
    return Array.from(context.getImageData(0, 0, 160, 90).data);
  });
  try {
    await ready();
    const state = await page.evaluate(() => CellMotionFluedit.state());
    assert.equal(state.motion.speed, 81, 'legacy playing defaults must migrate');
    assert.equal(state.motion.shiftEnabled, true);
    assert.equal(state.motion.shiftAmount, 68);
    assert.equal(state.background, '#dae2fc');
    assert.equal(state.stops[2].color, '#ef30ee');
    await page.evaluate(() => CellMotionFluedit.seek(0));
    const before = await pixels();
    await page.locator('#cmPlay').click();
    await page.waitForFunction(() => CellMotionFluedit.time() > 1 && CellMotionFluedit.time() < 2.5);
    const after = await pixels();
    const difference = after.reduce((sum, value, i) => sum + Math.abs(value - before[i]), 0) / after.length;
    assert.ok(difference > 10, `autoplay pixels must visibly flow, actual difference ${difference}`);
    await page.locator('#cmPlay').click();
    const paused = await pixels();
    await page.waitForTimeout(300);
    assert.deepEqual(await pixels(), paused);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ legacyPlayingMigration: true, editedColorsPreserved: true, livePixelDifference: difference, pauseFreezesPixels: true, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
