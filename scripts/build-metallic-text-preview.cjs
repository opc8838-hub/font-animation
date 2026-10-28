// node scripts/build-metallic-text-preview.cjs <node_modules> <browser> [base URL]
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8784';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/metallic-text.html`);
    await page.waitForFunction(() => window.CellMotionEffectBridge);
    await page.evaluate(async () => {
      const scheme = await (await fetch('assets/presets/metallic-text-default.json')).json();
      scheme.canvas = { width: 960, height: 540 };
      await CellMotionMetallicText.applyScheme(scheme, { autoplay: false });
      CellMotionMetallicText.seek(2.1);
    });
    await page.locator('#openExport').click();
    const png = page.waitForEvent('download');
    await page.locator('#exportPng').click();
    await (await png).saveAs(path.resolve(__dirname, '../site/final_metallic-text.png'));
    await page.locator('#exportFps').selectOption('30', { force: true });
    const mp4 = page.waitForEvent('download', { timeout: 180000 });
    await page.locator('#exportMp4').click();
    const target = path.resolve(__dirname, '../site/assets/previews/metallic-text-card.mp4');
    await (await mp4).saveAs(target);
    if (errors.length) throw new Error(errors.join('\n'));
    if (fs.statSync(target).size < 2000) throw new Error('Empty gallery video');
    console.log(`Built Metallic Text poster and 960 × 540 H.264 gallery loop (${fs.statSync(target).size} bytes).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
