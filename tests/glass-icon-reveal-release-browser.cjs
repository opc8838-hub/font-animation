// node tests/glass-icon-reveal-release-browser.cjs <node_modules> <browser> [base URL]
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = (process.argv[4] || 'http://127.0.0.1:8767').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function movingVideo(card) {
    await card.waitFor({ timeout: 60000 });
    await card.scrollIntoViewIfNeeded();
    const video = card.locator('video');
    await video.waitFor();
    await page.waitForFunction(node => node.videoWidth > 0 && !node.paused && node.currentTime > .05, await video.elementHandle(), { timeout: 60000 });
    const sample = () => video.evaluate(node => {
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 90;
      const ctx = canvas.getContext('2d'); ctx.drawImage(node, 0, 0, 160, 90);
      return Array.from(ctx.getImageData(0, 0, 160, 90).data);
    });
    const before = await sample(); let difference = 0;
    for (let i = 0; i < 8 && difference < .5; i++) {
      await page.waitForTimeout(350);
      const after = await sample();
      difference = after.reduce((sum, value, index) => sum + Math.abs(value - before[index]), 0) / after.length;
    }
    assert.ok(difference > .5, `preview must change actual pixels: ${difference}`);
    assert.equal(await video.evaluate(node => node.loop && node.muted && node.playsInline), true);
    return difference;
  }
  try {
    await page.goto(`${base}/?v=20261023-glass2`, { waitUntil: 'domcontentloaded' });
    const home = await movingVideo(page.locator('#recent-grid a[href*="glass-icon-reveal"]'));
    await page.goto(`${base}/cellmotion-components.html?q=glass-icon-reveal`, { waitUntil: 'domcontentloaded' });
    const catalog = await movingVideo(page.locator('#catalog-grid .catalog-card').filter({ has: page.locator('a[href*="glass-icon-reveal"]') }));
    await page.locator('#catalog-grid .card-caption a[href*="glass-icon-reveal"]').first().click();
    await page.waitForFunction(() => window.CellMotionGlassReveal?.ready, null, { timeout: 60000 });
    const time = await page.evaluate(() => CellMotionGlassReveal.time);
    await page.waitForFunction(before => Math.abs(CellMotionGlassReveal.time - before) > .1, time);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ homepagePixelDifference: home, catalogPixelDifference: catalog, loopMutedInline: true, editorAutoplay: true, mobileFits: true, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
