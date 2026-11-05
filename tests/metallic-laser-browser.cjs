const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8789';
const mode = process.argv[5] || 'laser';
const output = path.resolve(__dirname, `../output/metallic-${mode}`); fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
    const page = await context.newPage(), errors = [];
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/metallic-text.html?from=gallery`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.deepEqual(await page.locator('#revealMode option').evaluateAll(options => options.map(option => option.value)), ['none', 'scan', 'laser']);
    const report = await page.evaluate(async mode => {
      const original = CellMotionMetallicText.getScheme();
      const sample = (state, at) => {
        const c = document.createElement('canvas'); c.width = 640; c.height = 360;
        MetallicTextRenderer.draw(c.getContext('2d'), state, at, c.width, c.height, true);
        const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let ink = 0; const rows = [], halves = [0, 0];
        for (let y = 0; y < c.height; y++) { let n = 0; for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 127) n++; rows.push(n); ink += n; halves[y < 180 ? 0 : 1] += n; }
        let bands = 0; rows.forEach((n, i) => { if (n && !rows[i - 1]) bands++; });
        return { ink, bands, halves, png: c.toDataURL() };
      };
      const first = sample(original, 0), opening = sample(original, .1), full = sample(original, 1);
      const state = structuredClone(original); Object.assign(state.scene, { text: 'AVATR\nLASER', lineHeight: 1.4, revealMode: mode, writeDuration: 2.4 });
      await CellMotionMetallicText.applyScheme(state, { autoplay: false });
      const frames = [0, .3, .9, 1.2, 1.8, 2.4].map(at => ({ at, ...sample(state, at) }));
      const noLaser = structuredClone(state); noLaser.scene.revealMode = 'none';
      return { first, opening, full, frames, complete: sample(noLaser, 0), duration: MetallicTextRenderer.duration(state.scene) };
    }, mode);
    for (const frame of report.frames) fs.writeFileSync(path.join(output, `laser-${frame.at}.png`), Buffer.from(frame.png.split(',')[1], 'base64'));
    assert.ok(report.first.ink > 1000, 'Default opening must show stable text at time zero, without a fade/flash');
    assert.equal(report.first.ink, report.opening.ink); assert.equal(report.first.ink, report.full.ink);
    assert.equal(report.complete.bands, 2, 'Manual newline produces two separated text lines');
    assert.equal(report.frames[0].ink, 0, 'Laser opening starts empty');
    assert.ok(report.frames[1].ink > 0 && report.frames[1].ink < report.frames[2].ink);
    assert.equal(report.frames[2].halves[1], 0, 'Second line waits for first line to finish');
    assert.ok(report.frames[4].halves[1] > 0, 'Laser continues on the next line');
    assert.equal(report.frames[5].ink, report.complete.ink, 'Laser completion has exactly the final layout');
    assert.ok(Math.abs(report.duration - 4.2) < .001);
    assert.equal(await page.locator('#text').evaluate(el => el.tagName), 'TEXTAREA');
    await page.locator('#text').fill('AVATR\nLASER'); await page.locator('#text').dispatchEvent('change');
    await page.locator('[data-panel="motion"]').first().click();
    await page.locator('#revealMode').selectOption('none', { force: true });
    assert.ok(await page.locator('#writeDurationField').isHidden());
    assert.equal(await page.locator('#timeline button').count(), 2);
    await page.locator('#revealMode').selectOption(mode, { force: true });
    assert.ok(await page.locator('#writeDurationField').isVisible());
    await page.locator('#writeDurationExact').fill('2.4'); await page.locator('#writeDurationExact').dispatchEvent('change');
    await page.locator('#lightAmplitudeExact').fill('36'); await page.locator('#lightAmplitudeExact').dispatchEvent('change');
    await page.locator('#lightSpeedExact').fill('1.5'); await page.locator('#lightSpeedExact').dispatchEvent('change');
    assert.equal(await page.locator('#timeline button').count(), 3);
    await page.locator('#selectText').click(); await page.locator('#fontSettings').evaluate(el => { el.open = true; });
    await page.locator('#lineHeightExact').fill('1.4'); await page.locator('#lineHeightExact').dispatchEvent('change');
    const edited = await page.evaluate(() => CellMotionMetallicText.getScheme());
    await page.goto(`${base}/metallic-text.html`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    assert.deepEqual(await page.evaluate(() => CellMotionMetallicText.getScheme()), edited, 'Multiline and laser settings survive reload');
    await page.locator('#pauseForEdit').click();
    assert.ok(await page.evaluate(() => CellMotionMetallicText.time >= 2.4));
    const samples = await page.evaluate(async () => {
      const s = CellMotionMetallicText.getScheme(); s.scene.revealMode = 'none'; s.scene.font = 'stg:noto-sc-black'; s.scene.text = '未来\n\n已来';
      await CellMotionMetallicText.applyScheme(s, { autoplay: false });
      const results = [];
      for (const alignment of ['left', 'center', 'right']) {
        s.scene.alignment = alignment; await CellMotionMetallicText.applyScheme(s, { autoplay: false });
        const c = document.createElement('canvas'); c.width = 360; c.height = 640; CellMotionMetallicText.render(c, 0);
        results.push({ alignment, png: c.toDataURL() });
      }
      return results;
    });
    for (const s of samples) fs.writeFileSync(path.join(output, `cjk-${s.alignment}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
    await page.evaluate(async s => { s.canvas = { width: 320, height: 320 }; await CellMotionMetallicText.applyScheme(s, { autoplay: false }); await CellMotionMetallicText.seek(.9); }, edited);
    await page.locator('.tc-ai-trigger').click();
    const manifestDownload = page.waitForEvent('download'); await page.locator('[data-ai-action="json"]').click();
    const manifestFile = path.join(output, 'live-manifest.json'); await (await manifestDownload).saveAs(manifestFile);
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert.equal(manifest.composition.scene.text, 'AVATR\nLASER');
    assert.equal(manifest.composition.scene.revealMode, mode);
    assert.deepEqual(manifest.parameterDefinitions.find(p => p.path === 'composition.scene.revealMode').values, ['none', 'scan', 'laser']);
    assert.equal(manifest.composition.scene.lightAmplitude,.36);assert.equal(manifest.composition.scene.lightSpeed,1.5);
    for (const key of ['lineHeight', 'writeDuration', 'revealMode', 'lightAmplitude', 'lightSpeed']) assert.ok(manifest.parameterDefinitions.some(p => p.path === `composition.scene.${key}`));
    await page.locator('.tc-ai-trigger').click(); const opened = context.waitForEvent('page'); await page.locator('[data-ai-action="preview"]').click();
    const demo = await opened; await demo.waitForFunction(() => document.getElementById('demoPlayer')?._ready);
    await demo.locator('[data-player-action="pause"]').click();
    const child = demo.frames().find(frame => frame.url().includes('metallic-text.html'));
    const pixels = (target, at) => target.evaluate(async at => { await CellMotionMetallicText.seek(at); const c = document.createElement('canvas'); c.width = c.height = 320; CellMotionMetallicText.render(c, at); return c.toDataURL(); }, at);
    for (const at of [0, .3, 1.3, 2.4, 3.8]) assert.equal(await pixels(page, at), await pixels(child, at), `AI player matches editor at ${at}`);
    await demo.close();
    await page.evaluate(() => CellMotionMetallicText.seek(.9)); await page.locator('#openExport').click();
    await page.locator('#exportFps').selectOption('15', { force: true });
    for (const [id, name] of [['exportPng', 'laser.png'], ['exportGif', 'laser.gif'], ['exportMp4', 'laser.mp4']]) {
      const downloading = page.waitForEvent('download', { timeout: 180000 }); await page.locator('#' + id).click();
      const file = path.join(output, name); await (await downloading).saveAs(file); assert.ok(fs.statSync(file).size > 1000);
    }
    await page.locator('#selectText').click(); await page.locator('#pauseForEdit').click();
    await page.screenshot({ path: path.join(output, 'editor-desktop.png') });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    const reduced = await browser.newContext({ reducedMotion: 'reduce' }), quiet = await reduced.newPage();
    await quiet.goto(`${base}/metallic-text.html?from=gallery`); await quiet.waitForFunction(() => window.CellMotionEffectBridge);
    await quiet.evaluate(s => CellMotionMetallicText.applyScheme(s, { reducedMotion: 'pause' }), edited);
    assert.deepEqual(await quiet.evaluate(() => ({ playing: CellMotionMetallicText.playing, time: CellMotionMetallicText.time })), { playing: false, time: 2.4 });
    await reduced.close();
    assert.deepEqual(errors, []);
    console.log(`PASS (${mode}): stable opening, multiline/CJK layout, reveal order, autosave, AI frame parity, PNG/GIF/MP4, mobile and reduced motion`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
