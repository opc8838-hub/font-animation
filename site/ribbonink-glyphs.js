/* Grapheme-owned annotations and deterministic pen-contact reactions. */
(function (root) {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const split = text => Array.from(segmenter.segment(String(text).normalize('NFC')), p => p.segment);
  const defaults = { depth: 'inherit', motion: 'auto', amount: .4, pivot: 'bottom', direction: 'down', rebound: .36 };
  function normalize(item = {}) {
    const option = (key, values) => values.includes(item[key]) ? item[key] : defaults[key];
    const number = (key, a, b) => Number.isFinite(Number(item[key])) ? clamp(Number(item[key]), a, b) : defaults[key];
    return { depth: option('depth', ['inherit', 'front', 'back']), motion: option('motion', ['auto', 'none', 'press', 'hide', 'lean', 'turn']),
      amount: number('amount', 0, 1.4), pivot: option('pivot', ['bottom', 'center', 'top']),
      direction: option('direction', ['down', 'left', 'right']), rebound: number('rebound', .16, .65) };
  }
  function reconcile(previous, text) {
    if (!Array.isArray(previous) || previous.length > 128) throw new Error('逐字标注格式无效');
    const chars = split(text).slice(0, 128), old = previous;
    const dp = Array.from({ length: old.length + 1 }, () => new Uint16Array(chars.length + 1));
    for (let i = old.length - 1; i >= 0; i--) for (let j = chars.length - 1; j >= 0; j--)
      dp[i][j] = old[i]?.text === chars[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const matches = new Map();
    let i = 0, j = 0;
    while (i < old.length && j < chars.length) {
      if (old[i]?.text === chars[j]) { matches.set(j++, old[i++]); }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    let next = old.reduce((n, g) => Math.max(n, Number(String(g?.id).replace(/^g/, '')) || 0), 0) + 1;
    const used = new Set();
    return chars.map((text, index) => {
      const source = matches.get(index) || {};
      const id = /^g\d{1,8}$/.test(source.id) && !used.has(source.id) ? source.id : `g${next++}`;
      used.add(id); return { id, text, ...normalize(source) };
    });
  }
  function at(route, distance) {
    const part = route.parts.find(p => distance <= p.end) || route.parts.at(-1);
    const points = part.points;
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (points[m].length < distance) lo = m; else hi = m; }
    const a = points[lo], b = points[hi], t = clamp((distance - a.length) / Math.max(1e-8, b.length - a.length));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, length: distance, angle: a.angle, rear: part.rear };
  }
  function inkContact(glyph, x, y, radius) {
    const { mask, mw, mh, left, top } = glyph;
    x -= left; y -= top;
    const x0 = Math.max(0, Math.floor(x - radius)), x1 = Math.min(mw - 1, Math.ceil(x + radius));
    const y0 = Math.max(0, Math.floor(y - radius)), y1 = Math.min(mh - 1, Math.ceil(y + radius));
    for (let yy = y0; yy <= y1; yy += 2) for (let xx = x0; xx <= x1; xx += 2)
      if ((xx - x) ** 2 + (yy - y) ** 2 <= radius ** 2 && mask[(yy * mw + xx) * 4 + 3] > 128) return true;
    return false;
  }
  function contacts(layout, route, options) {
    const { W, H, bridge, hold, pop, brushWidth, rhythm } = options;
    const events = layout.map(() => []), active = layout.map(() => null);
    const duration = bridge + (rhythm?.finish || 0);
    const steps = Math.max(120, Math.ceil(duration * 180));
    for (let frame = 0; frame <= steps; frame++) {
      const time = frame / steps * duration;
      const motion = root.RibbonInkSequence.evaluate(time, bridge, pop, route, hold, rhythm);
      // Let the whole-word entrance become readable before local deformation.
      if (motion.pop < .65 || motion.scale <= 0) continue;
      if (motion.head <= motion.tail) { active.fill(null); continue; }
      // The letters can pop into ink that was written before they appeared.
      // Check the visible body as well as the tip, in the same world coordinates.
      const samples = [];
      const stride = Math.max(6, brushWidth * .32);
      for (let d = motion.tail; d < motion.head; d += stride) samples.push(at(route, d));
      samples.push(at(route, motion.head));
      layout.forEach((g, index) => {
        let hit;
        for (let i = samples.length - 1; i >= 0; i--) {
          const tip = samples[i];
          const radius = root.RibbonInkWriting.radius(tip, motion, brushWidth, route.join) / motion.scale;
          const x = W / 2 + (tip.x - W * 1.5) / motion.scale;
          const y = H / 2 + (tip.y - H / 2) / motion.scale;
          if (inkContact(g, x, y, radius)) { hit = tip; break; }
        }
        if (hit) {
          if (!active[index]) {
            const event = { start: time, endDistance: hit.length, rear: hit.rear };
            events[index].push(event); active[index] = event;
          }
          active[index].endDistance = Math.max(active[index].endDistance, hit.length);
          active[index].lastSeen = time;
        } else active[index] = null;
      });
    }
    return events.map(list => {
      const merged = [];
      list.forEach(event => {
        event.release = Math.max(event.lastSeen, root.RibbonInkSequence.releaseAt(event.endDistance / route.length, bridge, hold, rhythm));
        const previous = merged.at(-1);
        if (previous && event.start < previous.release + .06) previous.release = Math.max(previous.release, event.release);
        else merged.push(event);
      });
      return merged;
    });
  }
  function pose(annotation, events, elapsed, end, weave) {
    const neutral = { sx: 1, sy: 1, dx: 0, rotation: 0, alpha: 1 };
    const a = normalize(annotation);
    if (a.motion === 'none' || !a.amount) return neutral;
    const event = events.find(e => elapsed >= e.start && elapsed < e.release + Math.min(a.rebound, Math.max(.01, end - e.release)));
    if (!event) return neutral;
    const recovery = Math.min(a.rebound, Math.max(.01, end - event.release));
    const u = clamp((elapsed - event.release) / recovery);
    const back = 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2;
    const weight = elapsed < event.release ? smooth((elapsed - event.start) / .085) : 1 - back;
    const behind = a.depth === 'back' || (a.depth === 'inherit' && (weave === 'back' || (weave !== 'front' && (weave === 'reverse' ? !event.rear : event.rear))));
    const amount = a.amount * (a.motion === 'auto' ? (behind ? .28 : .62) : 1);
    const value = weight * amount, sign = a.direction === 'left' ? -1 : 1;
    if (a.motion === 'lean') return { ...neutral, sx: 1 - .12 * value, dx: sign * .12 * value, rotation: sign * .09 * value };
    if (a.motion === 'turn') return { ...neutral, rotation: sign * .23 * value };
    const squash = (a.motion === 'hide' ? .95 : .64) * value;
    const alpha = a.motion === 'hide' ? 1 - smooth((weight - .62) / .28) : 1;
    return { ...neutral, sx: a.direction === 'down' ? 1 + .065 * value : Math.max(.03, 1 - squash),
      sy: a.direction === 'down' ? Math.max(.03, 1 - squash) : 1 + .04 * value,
      dx: a.direction === 'down' ? 0 : sign * .12 * value, alpha };
  }
  function renderer(fontSpec, options = {}) {
    let layoutKey = '', eventKey = '', layout = [], events = [];
    const base = document.createElement('canvas'), inherit = document.createElement('canvas'), back = document.createElement('canvas');
    function frame(width, height, motion, elapsed, route, span, settings, annotations) {
      const unit = Math.min(width / 720, height / 405), W = width / unit, H = height / unit;
      const font = fontSpec(Number(settings.page2Size));
      const text = annotations.map(a => a.text).join('');
      const key = JSON.stringify([W, H, unit, font, document.fonts.check(font, text || ' '), settings.page2Spacing, settings.page2Color, text, settings.centerX, settings.centerY]);
      if (layoutKey !== key) {
        const scratch = document.createElement('canvas'), ctx = scratch.getContext('2d', { willReadFrequently: true });
        const requested = Number(settings.page2Size), zoom = Math.max(1, requested / 270);
        let size = Math.min(requested, 270), gap = Number(settings.page2Spacing);
        ctx.font = fontSpec(size);
        const total = annotations.reduce((n, g) => n + ctx.measureText(g.text).width, 0) + gap * Math.max(0, annotations.length - 1);
        // Fit once at the default size; further enlargement is an intentional
        // composition zoom, not another fit that cancels the editor slider.
        const fit = Math.min(1, W * .76 / Math.max(1, total)) * zoom; size *= fit; gap *= fit;
        ctx.font = fontSpec(size);
        const metrics = ctx.measureText(annotations.map(g => g.text).join('') || ' ');
        const baseline = H * (settings.centerY ?? .5) + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        let cursor = W * (settings.centerX ?? .5) - total * fit / 2;
        layout = annotations.map(g => {
          ctx.font = fontSpec(size);
          const m = ctx.measureText(g.text), pad = 3;
          const left = cursor - m.actualBoundingBoxLeft - pad, top = baseline - m.actualBoundingBoxAscent - pad;
          const mw = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2));
          const mh = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2));
          scratch.width = mw; scratch.height = mh;
          ctx.font = fontSpec(size); ctx.fillText(g.text, m.actualBoundingBoxLeft + pad, m.actualBoundingBoxAscent + pad);
          const mask = ctx.getImageData(0, 0, mw, mh).data;
          const sprite = document.createElement('canvas'), raster = Math.max(1, unit);
          sprite.width = Math.ceil(mw * raster); sprite.height = Math.ceil(mh * raster);
          const ink = sprite.getContext('2d'); ink.scale(raster, raster); ink.font = fontSpec(size); ink.fillStyle = settings.page2Color;
          ink.fillText(g.text, m.actualBoundingBoxLeft + pad, m.actualBoundingBoxAscent + pad);
          const result = { left, top, mw, mh, mask, sprite, raster, cx: cursor + m.width / 2, baseline, bottom: baseline + m.actualBoundingBoxDescent, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
          cursor += m.width + gap; return result;
        });
        layoutKey = key; eventKey = '';
      }
      const rhythm = root.RibbonInkSequence.settings(settings);
      const nextEventKey = JSON.stringify([W, H, font, settings.page2Spacing, annotations.map(a => a.text), route?.parts[0].points[0], route?.join, settings.page2Route, span.bridge, span.page2, settings.page2Pop, settings.brushWidth, rhythm, options.contactKey?.()]);
      if (eventKey !== nextEventKey) {
        events = options.contacts ? options.contacts(layout, W, H) : contacts(layout, route, { W, H, bridge: span.bridge, hold: span.page2, pop: Number(settings.page2Pop) / 100, brushWidth: 74 * Number(settings.brushWidth) / 100, rhythm });
        eventKey = nextEventKey;
      }
      for (const canvas of [base, inherit, back]) {
        if (canvas.width !== Math.ceil(width) || canvas.height !== Math.ceil(height)) { canvas.width = Math.ceil(width); canvas.height = Math.ceil(height); }
        const ctx = canvas.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      const poses = annotations.map((a, index) => pose(a, events[index], elapsed, span.bridge + span.finish, settings.page2Weave));
      if (motion.scale > 0) annotations.forEach((a, index) => {
        const g = layout[index], p = poses[index];
        if (p.alpha <= 0) return;
        const pivotY = a.pivot === 'top' ? g.top + 3 : a.pivot === 'center' ? g.top + g.mh / 2 : g.bottom;
        const draw = canvas => {
          const ctx = canvas.getContext('2d'); ctx.save();
          ctx.scale(unit, unit); ctx.translate(W * (1 - motion.camera) + W / 2, H / 2); ctx.scale(motion.scale, motion.scale); ctx.translate(-W / 2, -H / 2);
          ctx.translate(g.cx + p.dx * g.height, pivotY); ctx.rotate(p.rotation); ctx.scale(p.sx, p.sy); ctx.globalAlpha = p.alpha;
          ctx.drawImage(g.sprite, g.left - g.cx, g.top - pivotY, g.sprite.width / g.raster, g.sprite.height / g.raster); ctx.restore();
        };
        draw(base);
        if (a.depth === 'inherit') draw(inherit);
        else if (a.depth === 'back') draw(back);
      });
      return { base, inherit, back, events, poses, layout, bottom: Math.max(0, ...layout.map(g => g.bottom)) * unit };
    }
    return { frame };
  }
  root.RibbonInkGlyphs = { defaults, split, normalize, reconcile, contacts, inkContact, pose, renderer };
})(typeof window === 'undefined' ? globalThis : window);
