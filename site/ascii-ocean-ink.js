/* Temporary composition: the published ocean plus Oddball ink handwriting. */
(() => {
  'use strict';
  const ocean = window.CardMotion, editor = window.CellMotionEditorExtension;
  const clamp = ocean.clamp, smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const noise = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const ink = document.createElement('canvas'), glyph = document.createElement('canvas'), mask = document.createElement('canvas'), cloud = document.createElement('canvas'), wet = document.createElement('canvas');
  const phaseInfo = [
    ['lead', '海洋开场', 'Ocean opening', '#8ec8ff'], ['write', '手写落墨', 'Ink handwriting', '#d4b8ff'],
    ['hold', '写完停留', 'Written hold', '#ffd27d'], ['dissolve', '融墨入海', 'Ink into water', '#9de7d7']
  ];
  function phases(s) {
    let start = 0;
    const result = phaseInfo.map(([id, zh, en, color]) => {
      const duration = s.motion[id] / s.motion.speed, p = {id, zh, en, color, start, duration}; start += duration; return p;
    });
    result.push({id: 'swim', zh: '海洋巡游', en: 'Ocean cruise', color: '#8ec8ff', start, duration: Math.max(2, s.motion.swim / s.motion.speed - start)});
    return result;
  }
  let cachedKey = '', particles = [];
  function layout(ctx, w, h, s) {
    const preset = STGFontLibrary.preset('stg:oddball');
    let size = Math.min(w * .145, h * .31) * s.scene.inkSize;
    const set = () => { ctx.font = `${preset.style} ${preset.weight} ${size}px ${STGFontLibrary.family('stg:oddball')}`; };
    set(); if (ctx.measureText(s.scene.inkText).width > w * .74) { size *= w * .74 / ctx.measureText(s.scene.inkText).width; set(); }
    const bounds = ctx.measureText(s.scene.inkText);
    return {size, x: (w - bounds.width) / 2, y: h / 2 + (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2};
  }
  // Same glyph mask and stroke coordinates as the existing Oddball Ink effect.
  function writeGlyph(ctx, ch, x, y, size, progress) {
    const strokes = window.ODDBALL_STROKES[ch]; if (!strokes) return;
    const b = ctx.measureText(ch), pad = Math.ceil(size * .16), ox = Math.ceil(b.actualBoundingBoxLeft + pad), oy = Math.ceil(b.actualBoundingBoxAscent + pad);
    glyph.width = mask.width = Math.max(1, Math.ceil(b.actualBoundingBoxLeft + b.actualBoundingBoxRight + pad * 2));
    glyph.height = mask.height = Math.max(1, Math.ceil(b.actualBoundingBoxAscent + b.actualBoundingBoxDescent + pad * 2));
    const g = glyph.getContext('2d'), m = mask.getContext('2d');
    g.font = ctx.font; g.fillStyle = ctx.fillStyle; g.fillText(ch, ox, oy);
    m.fillStyle = m.strokeStyle = '#000'; m.lineCap = m.lineJoin = 'round';
    const k = size / 256; let remaining = progress * strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    for (const stroke of strokes) {
      for (let i = 0; i < stroke.length && remaining > 0; i++, remaining--) {
        const a = stroke[Math.max(0, i - 1)], b = stroke[i], f = Math.min(1, remaining);
        const px = ox + (a[0] + (b[0] - a[0]) * f) * k, py = oy + (a[1] + (b[1] - a[1]) * f) * k;
        const r = (a[2] + (b[2] - a[2]) * f) * k;
        if (i) { m.lineWidth = a[2] * k + r; m.beginPath(); m.moveTo(ox + a[0] * k, oy + a[1] * k); m.lineTo(px, py); m.stroke(); }
        m.beginPath(); m.arc(px, py, Math.max(.5, r), 0, Math.PI * 2); m.fill();
      }
      if (remaining <= 0) break;
    }
    g.globalCompositeOperation = 'destination-in'; g.drawImage(mask, 0, 0);
    ctx.drawImage(glyph, x - ox, y - oy);
  }
  function lettering(w, h, s, progress) {
    ink.width = w; ink.height = h;
    const ctx = ink.getContext('2d'), {size, x, y} = layout(ctx, w, h, s);
    ctx.fillStyle = s.scene.inkColor; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let pen = x;
    [...s.scene.inkText].forEach((ch, index) => {
      const p = clamp(progress * s.scene.inkText.length - index);
      if (p >= 1) ctx.fillText(ch, pen, y); else if (p > 0) writeGlyph(ctx, ch, pen, y, size, smooth(p));
      const strokes = window.ODDBALL_STROKES[ch] || [], points = strokes.flat();
      for (let j = 0; j < 8 && p > 0; j++) {
        const n = index * 827 + j * 211, point = points[Math.floor(noise(n + 1) * points.length)];
        if (!point || noise(n + 1) > p) continue;
        const a = noise(n + 2) * Math.PI * 2, d = size * (.04 + noise(n + 3) * .08);
        ctx.globalAlpha = .18 + noise(n + 4) * .25; ctx.beginPath();
        ctx.arc(pen + point[0] * size / 256 + Math.cos(a) * d, y + point[1] * size / 256 + Math.sin(a) * d, size * (.003 + noise(n + 5) * .008), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; pen += ctx.measureText(ch).width;
    });
    return ink;
  }
  function dissolve(ctx, w, h, s, p) {
    const key = [w, h, s.scene.inkText, s.scene.inkSize, s.scene.inkColor].join('|');
    if (key !== cachedKey) {
      lettering(w, h, s, 1); const data = ink.getContext('2d').getImageData(0, 0, w, h).data;
      particles = []; const step = Math.max(3, Math.round(w / 360));
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 80) {
        particles.push({x, y, seed: x * 31 + y * 17});
      }
      cachedKey = key;
    }
    // Continuous ribbons stretch the wet lettering; plumes grow from its ink pixels.
    const band = Math.max(2, Math.round(w / 480));
    ctx.fillStyle = s.scene.inkColor;
    const vanish = 1 - smooth((p - .48) / .52), release = smooth(p / .6);
    wet.width = w; wet.height = h; const stream = wet.getContext('2d');
    for (let y = 0; y < h; y += band) {
      const spread = 1 + release * .65, dx = Math.sin(y * .023 + p * 5) * w * release * .045;
      const dy = (y - h / 2) * (1 + release * .4) + h / 2 - h * release * .025;
      stream.drawImage(ink, 0, y, w, Math.min(band, h - y), w * (1 - spread) / 2 + dx, dy, w * spread, band * (1 + release * .4));
    }
    ctx.globalAlpha = 1 - smooth(p / .85); ctx.filter = `blur(${release * w * .004}px)`;
    ctx.drawImage(wet, 0, 0); ctx.filter = 'none';
    cloud.width = Math.round(w / 4); cloud.height = Math.round(h / 4);
    const mist = cloud.getContext('2d'); mist.scale(.25, .25); mist.fillStyle = s.scene.inkColor;
    mist.globalAlpha = Math.sin(Math.PI * p) * .11 * vanish;
    for (const point of particles) {
      const {x, y, seed} = point, a = noise(seed) * Math.PI * 2, drift = .4 + noise(seed + 5) * .6;
      const distance = release * release;
      const px = x + (x - w / 2) * distance * 1.1 + Math.cos(a) * w * distance * .15 + Math.sin(y * .025 + p * 6) * w * release * .055;
      const py = y + (y - h / 2) * distance * 1.6 + Math.sin(a) * h * distance * .24 - h * distance * .06;
      const r = w * (.0009 + release * (.002 + noise(seed + 7) * .006)) * drift;
      mist.beginPath(); mist.ellipse(px, py, r * (1 + release), r, a, 0, Math.PI * 2); mist.fill();
    }
    ctx.globalAlpha = 1; ctx.filter = `blur(${w * (.001 + release * .005)}px)`;
    ctx.drawImage(cloud, 0, 0, w, h); ctx.filter = 'none';
  }
  function draw(g, time, w, h, s, resources) {
    AsciiOceanRenderer.render(g, time, w, h, s, resources, s.motion.swim / s.motion.speed);
    const t = time * s.motion.speed - s.motion.lead, end = s.motion.write + s.motion.hold;
    if (t <= 0 || t >= end + s.motion.dissolve) return;
    g.save(); g.setTransform(g.canvas.width / 1920, 0, 0, g.canvas.height / (1920 * h / w), 0, 0);
    const ih = Math.round(1920 * h / w);
    if (t <= end) { cachedKey = ''; g.drawImage(lettering(1920, ih, s, clamp(t / s.motion.write)), 0, 0); }
    else dissolve(g, 1920, ih, s, (t - end) / s.motion.dissolve);
    g.restore();
  }
  window.CardMotion = {...ocean, defaults(id) {
    const s = ocean.defaults(id); Object.assign(s.motion, {lead: .6, write: 3.2, hold: 1, dissolve: 4.8});
    Object.assign(s.scene, {inkText: 'lovefrom', inkSize: 1, inkColor: '#29262c'}); return s;
  }, phases, duration: s => phases(s).reduce((sum, p) => sum + p.duration, 0), draw};
  window.CellMotionEditorExtension = {...editor, title: ['海洋墨写', 'Ocean Ink'],
    fields: [...phaseInfo.map(([id, zh, en]) => ['motion.' + id, zh, en, id === 'lead' ? 0 : .1, id === 'hold' ? 5 : 10, .1, 's']), ...editor.fields],
    content(args) {
      const {input, range, t} = args;
      return '<section class="gm-card"><h2>' + t('中央墨写', 'Center handwriting') + '</h2>' + input('scene.inkText', '手写文字', 'Handwritten text', 'text') + input('scene.inkColor', '墨水颜色', 'Ink color', 'color') + range(['scene.inkSize', '文字大小', 'Text size', .4, 1.6, .01, '']) + '</section>' + editor.content(args);
    },
    async prepare(...args) { await editor.prepare(...args); const font = STGFontLibrary.preset('stg:oddball'); await document.fonts.load(`${font.style} ${font.weight} 172px ${STGFontLibrary.family('stg:oddball')}`); },
    normalize(raw, s, def) {
      editor.normalize(raw, s, def); s.scene.inkText = String(s.scene.inkText ?? 'lovefrom').replace(/[^\x20-\x7e]/g, '').slice(0, 60);
      s.scene.inkSize = clamp(Number(s.scene.inkSize) || 1, .4, 1.6);
      if (!/^#[\da-f]{6}$/i.test(s.scene.inkColor)) s.scene.inkColor = def.scene.inkColor;
    },
    stable: s => (s.motion.lead + s.motion.write + s.motion.hold * .5) / s.motion.speed,
    seekForPath(s, path) { const p = phases(s).find(p => 'motion.' + p.id === path); return p ? p.start + p.duration * .5 : this.stable(s); }
  };
})();
