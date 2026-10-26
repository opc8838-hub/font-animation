const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const url = process.argv[4] || 'http://127.0.0.1:8772/';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const results = [];
  try {
    for (const [name, width, height, budget] of [['desktop', 1440, 900, 4500000], ['mobile', 390, 844, 3000000]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage(), errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForFunction(() => document.querySelector('#recent-grid img'), null, { timeout: 10000 });
      await page.waitForFunction(() => document.querySelector('#hero-video').readyState >= 2, null, { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      assert.equal(new URL(page.url()).pathname, '/');
      assert.match(await page.title(), /CellMotion/);
      assert.ok(!requests.some(url => url.includes('hero-11s.mp4')), 'Original large video must not download');
      assert.ok(!requests.some(url => /cases\/case-\d\.mp4/.test(url)), 'Offscreen case videos must not download');
      assert.ok(!requests.some(url => /final_(bubble-frame|thermal-profile|patentcount)\.png/.test(url)), 'Large source covers must not download');
      const metrics = await page.evaluate(() => ({
        bytes: performance.getEntriesByType('resource').reduce((sum, item) => sum + item.transferSize, 0),
        hero: document.querySelector('#hero-video').currentSrc,
        deferred: [...document.querySelectorAll('#recent-grid img')].filter(image => !image.hasAttribute('src')).length,
        overflow: document.documentElement.scrollWidth > innerWidth
      }));
      assert.ok(metrics.bytes < budget, name + ' initial view exceeds byte budget: ' + metrics.bytes);
      assert.ok(metrics.deferred > 0, 'Offscreen recent covers must remain deferred');
      assert.equal(metrics.overflow, false);
      assert.ok(metrics.hero.includes(name === 'mobile' ? 'hero-mobile.mp4' : 'hero-web.mp4'));
      const cover = page.locator('#recent-grid img').first();
      await cover.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('#recent-grid img').naturalWidth > 0, null, { timeout: 10000 });
      assert.match(await cover.getAttribute('src'), /thumbnails\/.*\.webp/);
      const toggle = page.locator('#hero-toggle');
      await page.locator('#hero-video').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !document.querySelector('#hero-video').paused, null, { timeout: 10000 });
      await toggle.click();
      assert.equal(await page.locator('#hero-video').evaluate(video => video.paused), true);
      await toggle.click();
      await page.waitForFunction(() => !document.querySelector('#hero-video').paused, null, { timeout: 10000 });
      assert.deepEqual(errors, []);
      results.push({ name, ...metrics });
      await context.close();
    }
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
