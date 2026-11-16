const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8789';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/metallic-text.html?from=gallery`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    const output = path.resolve(__dirname, '../output/metallic-water'); fs.mkdirSync(output, { recursive: true });
    const report = await page.evaluate(async () => {
      const s = CellMotionMetallicText.getScheme(), c = document.createElement('canvas'); c.width = 640; c.height = 360;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const frame = t => { ctx.clearRect(0, 0, 640, 360); MetallicTextRenderer.draw(ctx, s, t, 640, 360, true); return ctx.getImageData(0, 0, 640, 360).data; };
      const delta = (a, b, alpha = false) => { let sum = 0, n = 0; for (let i = 0; i < a.length; i += 4) { if (alpha) { sum += Math.abs(a[i + 3] - b[i + 3]); n++; } else if (a[i + 3] > 250 && b[i + 3] > 250) { for (let j = 0; j < 3; j++) sum += Math.abs(a[i + j] - b[i + j]); n += 3; } } return sum / Math.max(1, n); };
      const legacy = frame(.7); s.scene.lightStyle = 'band'; const band = frame(.7); s.scene.lightStyle = 'water'; const water = frame(.7);
      const samples = [.0, .5, 1, 1.5, 2].map(at => { frame(at); return { at, png: c.toDataURL() }; });
      const tails = [], seams = [], masks = [];
      Object.assign(s.scene, { text: 'B2\nW', writeDuration: .8, sweep: 3.6, hold: 1.58 });
      for (const revealMode of ['none', 'scan', 'laser']) for (const direction of ['forward', 'reverse']) {
        Object.assign(s.scene, { revealMode, direction }); await CellMotionMetallicText.applyScheme(s, { autoplay: false });
        const changes = []; let previous = frame(3.8);
        for (let t = 3.9; t < 5.18; t += .1) { const next = frame(t); changes.push(delta(previous, next)); previous = next; }
        tails.push({ revealMode, direction, minChange: Math.min(...changes) });
        s.scene.lightStyle = 'band'; const oldMask = frame(.4); s.scene.lightStyle = 'water'; masks.push(delta(oldMask, frame(.4), true));
      }
      s.scene.revealMode = 'none'; const duration = MetallicTextRenderer.duration(s.scene);
      for (const lightSpeed of [.5, 1, 1.5, 2, 2.5, 3]) { s.scene.lightSpeed = lightSpeed; const a = frame(0), b = frame(duration); seams.push({ lightSpeed, endpoint: delta(a, b), before: delta(frame(duration - 1 / 60), a), after: delta(a, frame(1 / 60)) }); }
      s.scene.lightSpeed = 1; const normal = frame(.8); s.scene.lightSpeed = 2; const fast = frame(.4);
      s.scene.lightAmplitude = .08; const small = frame(.4); s.scene.lightAmplitude = .42; const large = frame(.4);
      return { legacyDelta: delta(legacy, band), styleDelta: delta(band, water), silhouetteDelta: delta(band, water, true), tails, seams, masks, speedDelta: delta(normal, fast), amplitudeDelta: delta(small, large), samples };
    });
    assert.equal(report.legacyDelta, 0); assert.ok(report.styleDelta > 2); assert.equal(report.silhouetteDelta, 0);
    for (const sample of report.tails) assert.ok(sample.minChange > .3, JSON.stringify(sample));
    for (const sample of report.seams) { assert.equal(sample.endpoint, 0); assert.ok(sample.before < sample.after * 2 + .2); }
    assert.ok(report.masks.every(delta => delta === 0)); assert.equal(report.speedDelta, 0); assert.ok(report.amplitudeDelta > 2);
    for (const sample of report.samples) fs.writeFileSync(path.join(output, `water-${sample.at}.png`), Buffer.from(sample.png.split(',')[1], 'base64')); delete report.samples;
    await page.locator('[data-panel="motion"]').first().click(); await page.locator('#lightStyle').selectOption('water');
    const edited = await page.evaluate(() => CellMotionMetallicText.getScheme()); assert.equal(edited.scene.lightStyle, 'water');
    await page.goto(`${base}/metallic-text.html`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.deepEqual(await page.evaluate(() => CellMotionMetallicText.getScheme()), edited);
    await page.locator('[data-panel="motion"]').first().click(); assert.equal(await page.locator('#lightStyle').inputValue(), 'water');
    await page.evaluate(() => CellMotionMetallicText.seek(4.6)); await page.screenshot({ path: path.join(output, 'controls.png') });
    for (const width of [390, 320]) { await page.setViewportSize({ width, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
    assert.deepEqual(errors, []); fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2));
    console.log('PASS: water reflection, unchanged band/silhouette/reveal, continuous hold, all loop speeds, amplitude, saved selection and mobile');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
