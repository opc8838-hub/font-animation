// node scripts/build-glass-icon-reveal-preview.cjs <node_modules directory> <browser executable> [base URL]
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = (process.argv[4] || 'http://127.0.0.1:8767').replace(/\/$/, '');
const site = path.resolve(__dirname, '../site');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/glass-icon-reveal.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CellMotionGlassReveal && document.querySelector('#view').width > 0, null, { timeout: 60000 });
    await page.locator('#canvasPreset').selectOption('custom');
    await page.locator('#canvasWidth').fill('640'); await page.locator('#canvasWidth').dispatchEvent('change');
    await page.locator('#canvasHeight').fill('360'); await page.locator('#canvasHeight').dispatchEvent('change');
    await page.evaluate(() => CellMotionGlassReveal.seek(.84));
    await page.locator('#view').screenshot({ path: path.join(site, 'final_glass-icon-reveal.png') });
    await page.locator('#openExport').click();
    await page.locator('#exportFps').selectOption('15');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 180000 }),
      page.locator('#exportMp4').click()
    ]);
    const destination = path.join(site, 'assets/previews/glass-icon-reveal-card.mp4');
    await download.saveAs(destination);
    if (fs.statSync(destination).size < 1000) throw new Error('Preview video is empty');
    console.log(`Poster and preview saved: ${destination}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
