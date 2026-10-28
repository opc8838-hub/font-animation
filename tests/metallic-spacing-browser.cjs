// node tests/metallic-spacing-browser.cjs <node_modules> <browser> [base URL]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8784';
const output = path.resolve(__dirname, '../output/metallic-spacing-verification');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/metallic-text.html?from=gallery`);
    await page.waitForFunction(() => window.CellMotionEffectBridge);
    const reports = await page.evaluate(async () => {
      const reports = [];
      for (const [text, font, tracking] of [['AVATR', 'cellmotion-square', .015], ['AVATR', 'cellmotion-square', .1], ['AVATAR To', 'inter', .015], ['金属间距', 'noto-sc-black', .015]]) {
        const state = CellMotionMetallicText.getScheme();
        Object.assign(state.scene, { text, font: `stg:${font}`, fontSize: .2, fontHeight: 1, extraBold: 0, tracking });
        await CellMotionMetallicText.applyScheme(state, { autoplay: false });
        const width = 1920, height = 1080, size = height * state.scene.fontSize;
        const expected = document.createElement('canvas'); expected.width = width; expected.height = height;
        const ctx = expected.getContext('2d');
        const preset = STGFontLibrary.preset(state.scene.font);
        ctx.font = `${preset.style} ${preset.weight} ${size}px ${STGFontLibrary.family(state.scene.font)}`;
        ctx.fontKerning = 'normal';
        const kern = ctx.measureText('AV').width - ctx.measureText('A').width - ctx.measureText('V').width;
        ctx.letterSpacing = `${size * tracking}px`;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width - size * tracking;
        ctx.fillStyle = '#fff';
        ctx.fillText(text, (width - textWidth) / 2, (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
        const actual = document.createElement('canvas'); actual.width = width; actual.height = height;
        MetallicTextRenderer.draw(actual.getContext('2d'), state, 2.1, width, height, true);
        const a = actual.getContext('2d').getImageData(0, 0, width, height).data;
        const b = ctx.getImageData(0, 0, width, height).data;
        let different = 0, ink = 0;
        for (let i = 3; i < a.length; i += 4) {
          const x = a[i] > 127, y = b[i] > 127;
          if (x || y) ink++;
          if (x === y) continue;
          // Canvas transforms and the shader can rasterize an edge one pixel apart.
          const other = x ? b : a;
          let neighbor = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (other[i + (dy * width + dx) * 4] > 127) neighbor = true;
          if (!neighbor) different++;
        }
        reports.push({ text, font, tracking, kern, mismatch: different / ink });
      }
      return reports;
    });
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(reports, null, 2));
    assert.ok(reports[0].kern < -50, 'Square font must expose its AV pair kerning to the browser');
    for (const report of reports) assert.ok(report.mismatch < .005, `${report.font} ${report.text} tracking ${report.tracking}: metal silhouette must match native shaped text (mismatch ${report.mismatch})`);
    await page.evaluate(async () => { const s = CellMotionMetallicText.getScheme(); Object.assign(s.scene, { text: 'AVATR', font: 'stg:cellmotion-square', fontSize: .8, fontHeight: .8, extraBold: .015, tracking: .015 }); await CellMotionMetallicText.applyScheme(s, { autoplay: false }); await CellMotionMetallicText.seek(2.1); });
    await page.locator('#view').screenshot({ path: path.join(output, 'avatr-corrected.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: AVATR pair kerning, native text silhouettes, tracking and CJK spacing');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
