/* Temporary composition: the published ocean plus Oddball ink handwriting. */
(() => {
  'use strict';
  const ocean = window.CardMotion, editor = window.CellMotionEditorExtension;
  const clamp = ocean.clamp, smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const noise = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const ink = document.createElement('canvas'), fullInk = document.createElement('canvas'), glyph = document.createElement('canvas'), mask = document.createElement('canvas'), cloud = document.createElement('canvas'), wet = document.createElement('canvas');
  const softCloud = document.createElement('canvas'), blend = document.createElement('canvas');
  const inkBlur = Array.from({length: 6}, () => document.createElement('canvas'));
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
  let cachedKey = '', fullKey = '', particleAlpha = 1, particles = [];
  const inkKey = (w, h, s) => [w, h, s.scene.inkText, s.scene.inkSize, s.scene.inkColor].join('|');
  function clearLayer(canvas, w, h) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'); ctx.resetTransform(); ctx.globalAlpha = 1; ctx.clearRect(0, 0, w, h); return ctx;
  }
  function inkCurrent(x, y, t) {
    // A shared curling current keeps nearby ink together as it stretches into wisps.
    return [
      .046 * Math.sin(y * 9 + t * .24) + .024 * Math.sin(y * 19 - x * 5 - t * .19),
      .012 + .037 * Math.sin(x * 11 - t * .21) + .018 * Math.sin(x * 23 + y * 4 + t * .17)
    ];
  }
  function layout(ctx, w, h, s) {
    const preset = STGFontLibrary.preset('stg:oddball');
    const lines = s.scene.inkText.replace(/\r\n?/g, '\n').split('\n');
    let size = Math.min(Math.min(w * .145, h * .31) * s.scene.inkSize, h * .68 / (1 + (lines.length - 1) * 1.2));
    const set = () => { ctx.font = `${preset.style} ${preset.weight} ${size}px ${STGFontLibrary.family('stg:oddball')}`; };
    set(); const width = Math.max(...lines.map(line => ctx.measureText(line).width));
    if (width > w * .74) { size *= w * .74 / width; set(); }
    const bounds = lines.map(line => ctx.measureText(line || 'Mg'));
    const ascent = Math.max(...bounds.map(b => b.actualBoundingBoxAscent)), descent = Math.max(...bounds.map(b => b.actualBoundingBoxDescent));
    const firstY = (h - (lines.length - 1) * size * 1.2 + ascent - descent) / 2, letters = [];
    lines.forEach((line, row) => {
      let x = (w - ctx.measureText(line).width) / 2;
      for (const ch of line) { letters.push({ch, x, y: firstY + row * size * 1.2}); x += ctx.measureText(ch).width; }
    });
    return {size, letters};
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
    const key = inkKey(w, h, s);
    if (progress === 1 && fullKey === key) return fullInk;
    const ctx = clearLayer(ink, w, h), {size, letters} = layout(ctx, w, h, s);
    ctx.fillStyle = s.scene.inkColor; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    letters.forEach(({ch, x: pen, y}, index) => {
      const p = clamp(progress * letters.length - index);
      if (p >= 1) ctx.fillText(ch, pen, y); else if (p > 0) writeGlyph(ctx, ch, pen, y, size, smooth(p));
      const strokes = window.ODDBALL_STROKES[ch] || [], points = strokes.flat();
      for (let j = 0; j < 8 && p > 0; j++) {
        const n = index * 827 + j * 211, point = points[Math.floor(noise(n + 1) * points.length)];
        if (!point || noise(n + 1) > p) continue;
        const a = noise(n + 2) * Math.PI * 2, d = size * (.04 + noise(n + 3) * .08);
        ctx.globalAlpha = .18 + noise(n + 4) * .25; ctx.beginPath();
        ctx.arc(pen + point[0] * size / 256 + Math.cos(a) * d, y + point[1] * size / 256 + Math.sin(a) * d, size * (.003 + noise(n + 5) * .008), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    if (progress === 1) { clearLayer(fullInk, w, h).drawImage(ink, 0, 0); fullKey = key; return fullInk; }
    return ink;
  }
  function prepareInk(w, h, s) {
    const key = inkKey(w, h, s);
    if (key !== cachedKey) {
      const sampleWidth = 640, sampleHeight = 360, step = 4;
      const sample = lettering(sampleWidth, sampleHeight, s, 1), data = sample.getContext('2d').getImageData(0, 0, sampleWidth, sampleHeight).data;
      const image = lettering(w, h, s, 1);
      particles = []; particleAlpha = Math.pow(step * 384 / sampleWidth, 2);
      inkBlur.forEach((canvas, i) => {
        const bw = Math.ceil(w / 2), bh = Math.ceil(h / 2);
        const blur = clearLayer(canvas, bw, bh); blur.filter = `blur(${i / 5 * bw * .007}px)`;
        blur.drawImage(image, 0, 0, bw, bh); blur.filter = 'none';
      });
      for (let y = 0; y < sampleHeight; y += step) for (let x = 0; x < sampleWidth; x += step) if (data[(y * sampleWidth + x) * 4 + 3] > 80) {
        const path = new Float32Array(98); let px = x / sampleWidth, py = y / sampleHeight;
        path[0] = px; path[1] = py;
        for (let i = 1; i <= 48; i++) {
          const t = (i - 1) * .16, a = inkCurrent(px, py, t);
          const b = inkCurrent(px + a[0] * .08, py + a[1] * .08, t + .08);
          px += b[0] * .16; py += b[1] * .16; path[i * 2] = px; path[i * 2 + 1] = py;
        }
        const seed = x * 31 + y * 17;
        particles.push({path, jitterX: noise(seed) - .5, jitterY: noise(seed + 1) - .5, radius: .7 + noise(seed + 7) * .6});
      }
      cachedKey = key;
    }
  }
  function dissolve(ctx, w, h, s, p, detailScale) {
    // Continuous ribbons stretch the wet lettering; plumes grow from its ink pixels.
    const band = Math.max(3, Math.round(w / 240));
    ctx.fillStyle = s.scene.inkColor;
    const vanish = 1 - smooth((p - .4) / .6), release = smooth(p);
    if (p < .62) {
    const blurPosition = release * 5, lower = Math.floor(blurPosition), mix = blurPosition - lower;
    const source = clearLayer(blend, w, h); source.globalCompositeOperation = 'lighter';
    source.globalAlpha = 1 - mix; source.drawImage(inkBlur[lower], 0, 0);
    source.globalAlpha = mix; source.drawImage(inkBlur[Math.min(5, lower + 1)], 0, 0);
    source.globalCompositeOperation = 'source-over';
    const stream = clearLayer(wet, w, h);
    for (let y = 0; y < h; y += band) {
      const spread = 1 + release * .28, dx = Math.sin(y * detailScale * .016 + p * 3) * w * release * .025;
      const dy = (y - h / 2) * (1 + release * .28) + h / 2 + h * release * .025;
      stream.drawImage(blend, 0, y, w, Math.min(band, h - y), w * (1 - spread) / 2 + dx, dy, w * spread, band * (1 + release * .28));
    }
    ctx.globalAlpha = 1 - smooth(p / .62); ctx.drawImage(wet, 0, 0);
    }
    const mistScale = detailScale / 4;
    const mist = clearLayer(cloud, Math.round(w * mistScale), Math.round(h * mistScale)); mist.scale(mistScale, mistScale); mist.fillStyle = s.scene.inkColor;
    mist.globalAlpha = Math.min(1, smooth(p / .18) * .26 * vanish * particleAlpha / (1 + release * 1.6));
    mist.strokeStyle = s.scene.inkColor; mist.lineCap = mist.lineJoin = 'round';
    const travel = release * 47, index = Math.floor(travel), fraction = travel - index;
    for (const point of particles) {
      const {path, jitterX, jitterY, radius} = point, i = index * 2;
      const px = (path[i] + (path[i + 2] - path[i]) * fraction) * w + jitterX * w * release * .007;
      const py = (path[i + 1] + (path[i + 3] - path[i + 1]) * fraction) * h + jitterY * h * release * .01;
      const r = w * (.0015 + release * .0015) * radius;
      const tail = Math.max(0, index - 3) * 2;
      mist.lineWidth = r * 1.2; mist.beginPath(); mist.moveTo(path[tail] * w, path[tail + 1] * h); mist.lineTo(px, py); mist.stroke();
      mist.beginPath(); mist.arc(px, py, r, 0, Math.PI * 2); mist.fill();
    }
    const soft = clearLayer(softCloud, cloud.width, cloud.height);
    // Small weighted copies soften the mist without a per-frame filter readback.
    const blur = w * (.0007 + release * .002) * mistScale * Math.SQRT2;
    soft.globalCompositeOperation = 'lighter';
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
      soft.globalAlpha = (x === 0 ? .5 : .25) * (y === 0 ? .5 : .25);
      soft.drawImage(cloud, x * blur, y * blur);
    }
    soft.globalAlpha = 1; soft.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1; ctx.drawImage(softCloud, 0, 0, w, h);
  }
  function draw(g, time, w, h, s, resources) {
    const scale = Math.min(w / 1920, h / 1080), sizeScale = 1080 * scale / Math.min(w, h);
    const iw = Math.min(1920, Math.max(640, Math.ceil(g.canvas.width / w * scale * 1920))), ih = Math.round(iw * 1080 / 1920);
    prepareInk(iw, ih, s);
    const scene = sizeScale === 1 ? s : {...s, scene: {...s.scene, size: s.scene.size * sizeScale}};
    AsciiOceanRenderer.render(g, time, w, h, scene, resources, s.motion.swim / s.motion.speed);
    const t = time * s.motion.speed - s.motion.lead, end = s.motion.write + s.motion.hold;
    if (t <= 0 || t >= end + s.motion.dissolve) return;
    g.save(); g.setTransform(g.canvas.width / w * scale * 1920 / iw, 0, 0, g.canvas.height / h * scale * 1080 / ih,
      g.canvas.width / w * ((w - 1920 * scale) / 2 + w * (s.scene.inkX ?? 0) / 100), g.canvas.height / h * ((h - 1080 * scale) / 2 + h * (s.scene.inkY ?? 0) / 100));
    if (t <= end) g.drawImage(lettering(iw, ih, s, clamp(t / s.motion.write)), 0, 0);
    else {
      const dw = inkBlur[0].width, dh = inkBlur[0].height;
      g.scale(iw / dw, ih / dh);
      dissolve(g, dw, dh, s, (t - end) / s.motion.dissolve, iw / dw);
    }
    g.restore();
  }
  window.CardMotion = {...ocean, defaults(id) {
    const s = ocean.defaults(id); s.backgroundColor = '#ffffff'; Object.assign(s.motion, {lead: .6, write: 3.2, hold: 1, dissolve: 10, swim: 27});
    if (new URLSearchParams(location.search).get('ratio') === '4:5') s.canvas = {width: 1080, height: 1350};
    Object.assign(s.scene, {inkText: 'love from', inkSize: .84, inkColor: '#29262c', inkX: 0, inkY: 0}); return s;
  }, phases, duration: s => phases(s).reduce((sum, p) => sum + p.duration, 0), draw};
  window.CellMotionEditorExtension = {...editor, title: ['海洋墨写', 'Ocean Ink'],
    fields: [...phaseInfo.map(([id, zh, en]) => ['motion.' + id, zh, en, id === 'lead' ? 0 : .1, id === 'hold' ? 5 : 10, .1, 's']), ...editor.fields],
    content(args) {
      const {input, range, t} = args;
      return '<section class="gm-card"><h2>' + t('中央墨写', 'Center handwriting') + '</h2><label class="gm-field"><span>' + t('手写文字（回车换行）', 'Handwritten text (Enter for a new line)') + '</span><textarea data-path="scene.inkText" rows="3" maxlength="60"></textarea></label>' + input('scene.inkColor', '墨水颜色', 'Ink color', 'color') + range(['scene.inkSize', '文字大小', 'Text size', .4, 1.6, .01, '']) + range(['scene.inkX', '左右位置', 'Horizontal position', -50, 50, 1, '%']) + range(['scene.inkY', '上下位置', 'Vertical position', -50, 50, 1, '%']) + '</section>' + editor.content(args);
    },
    async prepare(...args) { await editor.prepare(...args); const font = STGFontLibrary.preset('stg:oddball'); await document.fonts.load(`${font.style} ${font.weight} 172px ${STGFontLibrary.family('stg:oddball')}`); },
    normalize(raw, s, def) {
      editor.normalize(raw, s, def); s.scene.inkText = String(s.scene.inkText ?? 'love from').replace(/\r\n?/g, '\n').replace(/[^\x20-\x7e\n]/g, '').slice(0, 60);
      s.scene.inkSize = clamp(Number(s.scene.inkSize) || 1, .4, 1.6);
      for (const key of ['inkX', 'inkY']) s.scene[key] = clamp(Number(s.scene[key]) || 0, -50, 50);
      if (!/^#[\da-f]{6}$/i.test(s.scene.inkColor)) s.scene.inkColor = def.scene.inkColor;
    },
    stable: s => (s.motion.lead + s.motion.write + s.motion.hold * .5) / s.motion.speed,
    seekForPath(s, path) { const p = phases(s).find(p => 'motion.' + p.id === path); return p ? p.start + p.duration * .5 : this.stable(s); }
  };
})();
