/* One logical composition for the stage and every exported frame. */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = v => { const p = clamp(v, 0, 1); return 1 - (1 - p) ** 3; };
  const words = new Intl.Segmenter(undefined, { granularity: 'word' });
  function timing(scene) {
    const entrance = scene.reveal + scene.stagger * (scene.rows.length - 1);
    return { entrance: entrance / scene.speed, hold: scene.hold / scene.speed, fade: scene.fade / scene.speed,
      duration: (entrance + scene.hold + scene.fade) / scene.speed };
  }
  function media(row) {
    return ['1', '2', '3'].includes(row.paper)
      ? { url: `assets/backgrounds/paper-series/Paper-${row.paper}.png`, fileType: 'image/png', name: `Paper ${row.paper}` }
      : row.paper === 'upload' ? row.media : null;
  }
  function regions(scene) {
    const { width, height, rows, layout } = scene;
    const unit = Math.min(width, height) / 1080, margin = 30 * unit;
    const gap = Math.min(scene.gap * unit, (layout === 'vertical' ? height : width) / (rows.length * 4));
    const w = layout === 'horizontal' ? (width - margin * 2 - gap * (rows.length - 1)) / rows.length : width - margin * 2;
    const h = layout === 'vertical' ? (height - margin * 2 - gap * (rows.length - 1)) / rows.length : height - margin * 2;
    return rows.map((row, index) => ({ id: row.id, x: margin + (layout === 'horizontal' ? index * (w + gap) : 0),
      y: margin + (layout === 'vertical' ? index * (h + gap) : 0), width: w, height: h }));
  }
  function font(ctx, row, size) {
    const face = STGFontLibrary.preset(row.font);
    ctx.font = `${face?.style || 'normal'} ${face?.weight || 400} ${size}px ${STGFontLibrary.family(row.font)}`;
    ctx.letterSpacing = `${(row.tracking || 0) * size}px`;
  }
  function textInBox(ctx, row, text, box, desiredSize, wrap) {
    if (!text) return;
    font(ctx, row, desiredSize);
    const lines = [];
    for (const paragraph of text.split('\n')) {
      if (!wrap) { lines.push(paragraph); continue; }
      let line = '';
      for (const { segment } of words.segment(paragraph)) {
        if (line && ctx.measureText(line + segment).width > box.width) { lines.push(line.trimEnd()); line = segment.trimStart(); }
        else line += segment;
      }
      lines.push(line);
    }
    const measure = size => {
      font(ctx, row, size);
      const metrics = lines.map(line => ctx.measureText(line || ' '));
      const ascent = Math.max(size * .2, ...metrics.map(m => m.actualBoundingBoxAscent));
      const descent = Math.max(0, ...metrics.map(m => m.actualBoundingBoxDescent));
      const advance = row.lineHeight == null ? Math.max(size * 1.25, ascent + descent + size * .15) : size * row.lineHeight;
      return { metrics, ascent, descent, advance, width: Math.max(1, ...metrics.map(m => Math.max(m.width, m.actualBoundingBoxLeft + m.actualBoundingBoxRight))),
        height: ascent + descent + (lines.length - 1) * advance };
    };
    const initial = measure(desiredSize);
    const size = desiredSize * (row.autoFit === false ? 1 : Math.min(1, box.width / initial.width, box.height / initial.height));
    const measured = measure(size);
    const baseline = box.y + (box.height - measured.height) / 2 + measured.ascent;
    lines.forEach((line, index) => {
      const m = measured.metrics[index];
      const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const left = row.align === 'center' ? (box.width - inkWidth) / 2 : row.align === 'right' ? box.width - inkWidth : 0;
      ctx.fillText(line, box.x + left + m.actualBoundingBoxLeft, baseline + index * measured.advance);
    });
    return size;
  }
  class PaperTypeRenderer {
    constructor() { this.backgrounds = new Map(); this.fonts = new Map(); }
    async ready(scene) {
      const ids = new Set(scene.rows.map(row => row.id));
      for (const [id, runtime] of this.backgrounds) if (!ids.has(id)) { runtime.dispose(); this.backgrounds.delete(id); }
      await Promise.all(scene.rows.map(async row => {
        const key = row.font + ':' + row.text + ':' + row.specimen;
        if (!this.fonts.has(key)) {
          const promise = STGFontLibrary.load(row.font, row.text + row.specimen).catch(error => { this.fonts.delete(key); throw error; });
          this.fonts.set(key, promise);
        }
        let runtime = this.backgrounds.get(row.id);
        if (!runtime) { runtime = CellMotionBackgroundMedia.create(); this.backgrounds.set(row.id, runtime); }
        await Promise.all([this.fonts.get(key), runtime.setMedia(media(row))]);
      }));
    }
    async prepare(scene, seconds) {
      const t = ((seconds % timing(scene).duration) + timing(scene).duration) % timing(scene).duration;
      await Promise.all(scene.rows.map(row => this.backgrounds.get(row.id)?.prepare(t, media(row))));
    }
    draw(canvas, scene, seconds) {
      this.metrics = new Map();
      const ctx = canvas.getContext('2d');
      ctx.setTransform(canvas.width / scene.width, 0, 0, canvas.height / scene.height, 0, 0);
      ctx.globalAlpha = 1; ctx.fillStyle = scene.canvasColor; ctx.fillRect(0, 0, scene.width, scene.height);
      const clock = timing(scene), t = ((seconds % clock.duration) + clock.duration) % clock.duration;
      const fade = 1 - ease((t - clock.entrance - clock.hold) / clock.fade);
      regions(scene).forEach((rect, index) => {
        const row = scene.rows[index], reveal = ease((t * scene.speed - index * scene.stagger) / scene.reveal);
        ctx.save(); ctx.translate(rect.x, rect.y); ctx.beginPath(); ctx.rect(0, 0, rect.width, rect.height); ctx.clip();
        ctx.fillStyle = row.backgroundColor; ctx.fillRect(0, 0, rect.width, rect.height);
        this.backgrounds.get(row.id)?.draw(ctx, rect.width, rect.height, media(row));
        // Work in a 1000-unit paper width; all geometry scales with the panel.
        const scale = rect.width / 1000, h = rect.height / scale;
        ctx.scale(scale, scale); ctx.translate(0, (1 - reveal) * 16);
        ctx.globalAlpha = reveal * fade; ctx.fillStyle = row.textColor;
        const pad = Math.min(44, h * .08), auxiliary = row.showSpecimen && row.specimen ? Math.min(134, h * .29) : 0;
        const pixels = textInBox(ctx, row, row.text, { x: pad, y: pad, width: 1000 - pad * 2, height: Math.max(1, h - pad * 2 - auxiliary - (auxiliary ? 22 : 0)) }, row.fontSizePx == null ? row.fontSize : row.fontSizePx / scale, true);
        this.metrics.set(row.id, { fontSizePx: pixels == null ? 0 : pixels * scale });
        if (auxiliary) textInBox(ctx, { ...row, align: 'left', tracking: 0, lineHeight: null, autoFit: true }, row.specimen, { x: pad, y: h - pad - auxiliary, width: 1000 - pad * 2, height: auxiliary }, 31, false);
        ctx.restore();
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    dispose() { for (const runtime of this.backgrounds.values()) runtime.dispose(); this.backgrounds.clear(); }
  }
  window.PaperType = { Renderer: PaperTypeRenderer, timing, media, regions };
})();
