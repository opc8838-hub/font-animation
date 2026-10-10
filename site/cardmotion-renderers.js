/* Two native composition models. Preview, seek, AI player and exports call these functions. */
(() => {
  'use strict';
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const rad = d => d * Math.PI / 180;
  const smooth = v => { const x = clamp(v); return x * x * x * (x * (x * 6 - 15) + 10); };
  function bezier(x, a, b, c, d) {
    x = clamp(x); let lo = 0, hi = 1, t = x;
    const at = (v, p, q) => 3 * (1 - v) ** 2 * v * p + 3 * (1 - v) * v * v * q + v ** 3;
    for (let n = 0; n < 20; n++) { t = (lo + hi) / 2; if (at(t, a, c) < x) lo = t; else hi = t; }
    return at(t, b, d);
  }
  const ease = p => bezier(p, .25, .1, .25, 1);
  const settle = p => bezier(p, .22, 1, .36, 1);
  function base(effect) {
    return { version: 1, effect, canvas: { width: 1920, height: 1080 }, typography: { fontFamily: 'stg:inter' },
      backgroundColor: '#0b0b0d', customAssets: [], cards: [], motion: { speed: 1, loop: true } };
  }
  function defaults(effect, library) {
    const s = base(effect);
    if (effect === 'card-login') {
      s.scene = { brand: 'CARDBOT WORKSPACE', title: 'Welcome back.', subtitle: 'Continue to your company workspace.',
        account: 'Account', password: 'Password', button: 'Log in', footer: 'One workday. Every conversation.',
        frontColor: '#f8f8f6', backColor: '#090a0a', textColor: '#171819', accent: '#6d4aff',
        width: 440, height: 590, radius: 24, x: 0, y: 25 };
      s.motion = { ...s.motion, duration: 1.8, hold: 1.2, scaleX: .47, scaleY: .445, offsetY: -14,
        startY: -2, startZ: -5, perspective: 1500, direction: 1, faceSwitch: .32001,
        contentDelay: 1.05, contentDuration: .6, overshoot: .01 };
      s.cards = [{ id: 'cover', libraryId: 'cardbot-00', scale: 1, opacity: 1, x: 0, y: 0, rotation: 0 }];
    } else {
      s.motion = { ...s.motion, rows: 3, gap: .08, ratio: 1.4, size: 1.11, derive: .8,
        repos: .9, ouvre: .6, tenue: .9, repli: 1, stagger: .08, angle: -12,
        mode: 'dos', modeRepli: 'synchrone', inclinaison: 18, pile: .82, rythme: 'fluide' };
      s.cards = library.map((a, i) => ({ id: `card-${i}`, libraryId: a.libraryId, scale: 1, opacity: 1, x: 0, y: 0, rotation: 0 }));
    }
    return s;
  }
  const palette = ['#8ec8ff', '#d4b8ff', '#ffc4d6', '#9de7d7', '#ffd27d'];
  function phases(s) {
    const m = s.motion, speed = m.speed;
    const list = s.effect === 'card-login'
      ? [['match', '同尺寸交接', 'Match footprint', m.duration / 18],
         ['flip', '旋转 · 变白', 'Flip & turn white', m.duration * 15 / 18],
         ['settle', '轻柔归位', 'Soft settle', m.duration * 2 / 18],
         ['hold', '登录停留', 'Login hold', m.hold]]
      : [['stack', '单卡叠放', 'Single-card stack', m.repos], ['spread', '展开分排', 'Spread into rows', m.ouvre],
         ['drift', '交错横移', 'Alternating drift', m.tenue], ['gather', '收拢归位', 'Gather & settle', m.repli]];
    let start = 0;
    return list.map((a, i) => ({a,color:palette[i]})).filter(({a}) => a[3] > 0).map(({a,color}) => { const duration = a[3] / speed;
      const result = { id: a[0], zh: a[1], en: a[2], start, duration, color }; start += duration; return result; });
  }
  const duration = s => phases(s).reduce((a, b) => a + b.duration, 0);
  function loginFrame(s, seconds) {
    const m = s.motion, t = Math.max(0, seconds * m.speed), p = clamp(t / m.duration);
    const main = ease((p - 1 / 18) / (15 / 18)), end = settle((p - 16 / 18) / (2 / 18));
    const sx = p < 16 / 18 ? mix(m.scaleX, 1 + m.overshoot, main) : mix(1 + m.overshoot, 1, end);
    const sy = p < 16 / 18 ? mix(m.scaleY, 1 + m.overshoot, main) : mix(1 + m.overshoot, 1, end);
    return { sx, sy, y: m.offsetY * (1 - main), ry: mix(m.startY, 180 * m.direction, main), rz: m.startZ * (1 - main),
      front: p >= m.faceSwitch, content: settle((t - m.contentDelay) / m.contentDuration), progress: p };
  }
  function round(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function font(ctx, id, size, weight) {
    const p = window.STGFontLibrary.preset(id);
    ctx.font = `${p.style || 'normal'} ${weight || p.weight || 500} ${size}px ${window.STGFontLibrary.family(id)}`;
  }
  function text(ctx, value, x, y, width, size, id, color, lines = 1, weight) {
    ctx.fillStyle = color; ctx.textBaseline = 'top'; font(ctx, id, size, weight);
    const chars = Array.from(String(value || '')); let line = '', row = 0;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > width && line) {
        if (row === lines - 1) { while (line && ctx.measureText(line + '…').width > width) line = line.slice(0, -1); ctx.fillText(line + '…', x, y + row * size * 1.2); return; }
        ctx.fillText(line, x, y + row++ * size * 1.2); line = chars[i];
      } else line = test;
    }
    ctx.fillText(line, x, y + row * size * 1.2);
  }
  const textures = new Map();
  function loginTexture(s, f, assets) {
    const a = s.scene, key = 'login', canvas = textures.get(key) || document.createElement('canvas');
    textures.set(key, canvas); const ratio = 1.5;
    const width = Math.round(a.width * ratio), height = Math.round(a.height * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const c = canvas.getContext('2d'); c.setTransform(ratio, 0, 0, ratio, 0, 0); c.clearRect(0, 0, a.width, a.height);
    round(c, 0, 0, a.width, a.height, a.radius, f.front ? a.frontColor : a.backColor);
    c.save(); c.beginPath(); c.roundRect(0, 0, a.width, a.height, a.radius); c.clip();
    if (!f.front) {
      // Original handoff eyes; scale is applied to the whole face, never rebuilt mid-flip.
      c.translate(a.width / 2 + 18, a.height / 2 - 36); c.rotate(rad(-13));
      round(c, -96, -66, 66, 132, 33, '#ffffff'); round(c, 33, -116, 66, 132, 33, '#ffffff');
    } else {
      c.globalAlpha = f.content; c.translate(0, 18 * (1 - f.content));
      const id = s.typography.fontFamily, k = Math.min(a.width / 440, a.height / 590), pad = 42 * k, inner = a.width - pad * 2;
      text(c, a.brand, pad, 46 * k, inner, 11 * k, id, a.accent);
      text(c, a.title, pad, 81 * k, inner, 44 * k, id, a.textColor, 2, 500);
      text(c, a.subtitle, pad, 190 * k, inner, 14 * k, id, a.textColor, 2, 400);
      for (const [label, yy] of [[a.account, 260], [a.password, 338]]) {
        text(c, label, pad, yy * k, inner, 11 * k, id, a.textColor);
        c.strokeStyle = '#d9dad5'; c.lineWidth = 1; c.beginPath(); c.moveTo(pad, (yy + 53) * k); c.lineTo(a.width - pad, (yy + 53) * k); c.stroke();
      }
      round(c, pad, 434 * k, inner, 46 * k, 23 * k, a.textColor);
      text(c, a.button, pad + 20 * k, 449 * k, inner - 60 * k, 14 * k, id, a.frontColor);
      text(c, '↗', a.width - pad - 32 * k, 447 * k, 24 * k, 17 * k, id, a.frontColor);
      text(c, a.footer, pad, a.height - 50 * k, inner, 10 * k, id, a.textColor, 2, 400);
    }
    c.restore(); return canvas;
  }
  // Perspective texture mapping, using the same transform order as CSS scale3d → rotateY → rotateZ.
  // Each narrow strip is split into two affine triangles; no separate export renderer exists.
  function triangle(c, image, src, dst) {
    const [a, b, d] = src, [p, q, r] = dst;
    const den = (b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(den) < 1e-7) return;
    const aa = ((q[0] - p[0]) * (d[1] - a[1]) - (r[0] - p[0]) * (b[1] - a[1])) / den;
    const cc = ((r[0] - p[0]) * (b[0] - a[0]) - (q[0] - p[0]) * (d[0] - a[0])) / den;
    const bb = ((q[1] - p[1]) * (d[1] - a[1]) - (r[1] - p[1]) * (b[1] - a[1])) / den;
    const dd = ((r[1] - p[1]) * (b[0] - a[0]) - (q[1] - p[1]) * (d[0] - a[0])) / den;
    // Offset each EDGE by a device pixel. Radially expanding the vertices barely
    // moves the long sides of a skinny triangle, leaving repeated dark seams.
    const transform = c.getTransform(), expansion = .8 / Math.max(.05,Math.hypot(transform.a,transform.b));
    const points=[p,q,r], orientation=Math.sign((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])) || 1;
    const edges=points.map((v,i)=>{const next=points[(i+1)%3],dx=next[0]-v[0],dy=next[1]-v[1],length=Math.max(1e-9,Math.hypot(dx,dy));return [orientation*dy/length,-orientation*dx/length];});
    const expanded=points.map((v,i)=>{const a=edges[(i+2)%3],b=edges[i],k=expansion/Math.max(1e-9,1+a[0]*b[0]+a[1]*b[1]);return [v[0]+(a[0]+b[0])*k,v[1]+(a[1]+b[1])*k];});
    c.save(); c.beginPath(); c.moveTo(...expanded[0]); c.lineTo(...expanded[1]); c.lineTo(...expanded[2]); c.closePath(); c.clip();
    c.transform(aa, bb, cc, dd, p[0] - aa * a[0] - cc * a[1], p[1] - bb * a[0] - dd * a[1]);
    c.drawImage(image, 0, 0); c.restore();
  }
  function loginDraw(c, s, seconds, w, h, assets) {
    const a = s.scene, m = s.motion, f = loginFrame(s, seconds), texture = loginTexture(s, f, assets);
    const scale = Math.min(1, (w - 80) / (a.width * 1.08), (h - 120) / (a.height * 1.08));
    const cy = h / 2 + a.y * scale, cx = w / 2 + a.x * scale;
    const ry = rad(f.ry), rz = rad(f.rz), sign = f.front ? -1 : 1;
    function project(u, v) {
      const x = (u / texture.width - .5) * a.width * sign, y = (v / texture.height - .5) * a.height;
      const rx = x * Math.cos(rz) - y * Math.sin(rz), yy = x * Math.sin(rz) + y * Math.cos(rz);
      const z = -rx * Math.sin(ry), perspective = m.perspective / (m.perspective - z);
      return [cx + rx * Math.cos(ry) * f.sx * scale * perspective,
        cy + (yy * f.sy + f.y) * scale * perspective];
    }
    if (Math.abs(Math.sin(ry)) < .000001) {
      const a=project(0,0),b=project(texture.width,0),d=project(0,texture.height);
      c.save();c.transform((b[0]-a[0])/texture.width,(b[1]-a[1])/texture.width,(d[0]-a[0])/texture.height,(d[1]-a[1])/texture.height,a[0],a[1]);c.drawImage(texture,0,0);c.restore();return f;
    }
    const n = 36;
    for (let i = 0; i < n; i++) {
      const x = i * texture.width / n, xx = (i + 1) * texture.width / n, hh = texture.height;
      const a = [x, 0], b = [xx, 0], d = [x, hh], e = [xx, hh];
      triangle(c, texture, [a, b, d], [project(...a), project(...b), project(...d)]);
      triangle(c, texture, [b, e, d], [project(...b), project(...e), project(...d)]);
    }
    return f;
  }
  const wrap = (x, center, span) => center + (((x - center + span / 2) % span + span) % span) - span / 2;
  function grid(s, w, h) {
    const m = s.motion, cardHeight = h / (m.rows + 1 + (m.rows - 1) * m.gap) * m.size;
    const width = cardHeight / m.ratio, dy = cardHeight * (1 + m.gap), dx = width + cardHeight * m.gap;
    let cols = Math.ceil(w / dx) + 2; if (cols % 2 === 0) cols++;
    const half = (cols - 1) / 2, top = (h - m.rows * cardHeight - (m.rows - 1) * cardHeight * m.gap) / 2;
    const list = [];
    for (let row = 0; row < m.rows; row++) for (let col = -half; col <= half; col++) list.push({ row, col, x: w / 2 + col * dx,
      y: top + row * dy + cardHeight / 2, order: half ? Math.abs(col) / half : 0, width, height: cardHeight, span: cols * dx, dx });
    const last = list.filter(d => d.row === m.rows - 1);
    const hero = last.reduce((a, b) => m.mode === 'dos'
      ? Math.abs(a.x - (w - width / 2)) < Math.abs(b.x - (w - width / 2)) ? a : b
      : Math.abs(a.col - 1) < Math.abs(b.col - 1) ? a : b);
    let index = 1;
    return list.map((d, i) => ({ ...d, hero: d === hero, card: s.cards.length ? s.cards[d === hero ? 0 : index++ % s.cards.length] : null,
      z: d === hero ? 10000 : m.mode === 'dos' ? 700 + d.row * 100 + half - Math.abs(d.col) : 1000 - Math.round(d.order * 100), seed: i }));
  }
  function deckFrame(s, d, seconds, w, h) {
    const m = s.motion, t = seconds * m.speed, cx = w / 2, cy = h / 2;
    const curve = x => { x = clamp(x); return m.rythme === 'regulier' ? x : m.rythme === 'vif' ? x < .5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2 : smooth(x); };
    const spread = m.repos, drift = spread + m.ouvre, gather = drift + m.tenue, direction = d.row % 2 ? -1 : 1;
    let x = cx, y = cy, open = 0, opacity = d.hero ? 1 : 0, scale = null, rotation = null;
    if (t >= spread && t < drift) {
      const local = t - spread;
      if (m.mode === 'dos') {
        const line = m.rows === 1 ? 0 : d.row / (m.rows - 1), delay = Math.min(line * m.ouvre * .2 + d.order * m.stagger * .55, m.ouvre * .42);
        const raw = clamp((local - delay) / Math.max(m.ouvre - delay, .05)), p = curve(raw);
        if (d.hero) { x = mix(cx, d.x, curve((p - .16) / .84)); y = mix(cy, d.y, curve(p / .72)); }
        else { const peak = cy - d.height * (.72 + (1 - line) * .24), q = 1 - p;
          x = mix(cx, d.x, curve((p - .04) / .96)); y = q * q * cy + 2 * q * p * peak + p * p * d.y; }
        open = p; opacity = d.hero ? 1 : curve(p / .16); scale = mix(1, m.pile, p);
        rotation = m.inclinaison * (d.hero || d.col >= 0 ? 1 : -1) * Math.sin(Math.PI * raw);
      } else {
        const delay = Math.min(d.order * m.stagger, m.ouvre * .35);
        const fan = curve((local - delay) / Math.max(m.ouvre * .76 - delay, .05));
        const rows = curve((local - m.ouvre * .27) / Math.max(m.ouvre * .73, .05));
        x = mix(cx, d.x, fan); y = mix(cy, d.y, rows); open = fan; opacity = d.hero ? 1 : curve(fan / .14);
      }
    } else if (t >= drift && t < gather) { x = wrap(d.x + direction * m.derive * d.dx * (t - drift), cx, d.span); y = d.y; open = opacity = 1; }
    else if (t >= gather) {
      const local = t - gather, u = clamp(local / m.repli);
      const movingX = wrap(d.x + direction * m.derive * d.dx * (m.tenue + local), cx, d.span);
      if (m.modeRepli === 'rangees') {
        const rowStep = m.rows > 1 ? (.78 - .32) / (m.rows - 1) : 0, p = curve((u - d.row * rowStep) / .32);
        x = mix(movingX, cx, p); y = mix(d.y, cy, p); open = 1 - p; opacity = d.hero ? 1 : 1 - curve((p - .82) / .18);
      } else {
        const vertical = curve(u / .62), stack = curve((u - .2) / .58);
        x = mix(movingX, cx, stack); y = mix(d.y, cy, vertical); open = 1 - stack; opacity = d.hero ? 1 : 1 - curve((stack - .86) / .14);
      }
      scale = d.hero ? mix(m.pile, 1, curve((u - .78) / .22)) : m.pile;
    }
    if (scale === null) scale = mix(1, m.pile, open);
    if (rotation === null) rotation = m.angle * (1 - open) * (d.hero || d.row % 2 === 0 ? 1 : -1);
    return { x, y, scale, rotation, opacity };
  }
  const paths = new Map();
  function path(value) { if (!paths.has(value)) paths.set(value, new Path2D(value)); return paths.get(value); }
  function matrixAt(frames, p) {
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid][0] <= p) lo = mid; else hi = mid - 1; }
    const a = frames[lo], b = frames[Math.min(lo + 1, frames.length - 1)], f = b[0] === a[0] ? 0 : clamp((p - a[0]) / (b[0] - a[0]));
    return a.slice(1).map((v, i) => mix(v, b[i + 1], f));
  }
  function drawAsset(c, a, card, t, width, height, seed = 0) {
    if (!a) return;
    if (a.kind === 'cardbot') {
      c.save(); const bounds = a.bounds || { x: -71.7, y: -100, width: 143.4, height: 200.5 };
      c.scale(width / bounds.width, height / bounds.height); c.translate(-bounds.x - bounds.width / 2, -bounds.y - bounds.height / 2);
      c.fillStyle = card.color || a.color; c.fill(path(a.body)); c.clip(path(a.body)); c.fillStyle = '#f9f9f9';
      const clock = (t / a.duration + seed * .137) % 2, p = clock <= 1 ? clock : 2 - clock;
      for (const eye of a.eyes) { c.save(); c.transform(...matrixAt(eye.frames, p)); c.fill(path(eye.path)); c.restore(); }
      c.restore(); return;
    }
    if (a.kind === 'vector') { window.STGIconLibrary.drawVector(c, a, Math.min(width, height), t); return; }
    const image = a.animated ? window.CellMotionAnimatedImage.frameAt(a.animated, t) : a.image;
    if (!image) return;
    const scale = Math.min(width / (image.width || image.naturalWidth), height / (image.height || image.naturalHeight));
    c.drawImage(image, -(image.width || image.naturalWidth) * scale / 2, -(image.height || image.naturalHeight) * scale / 2,
      (image.width || image.naturalWidth) * scale, (image.height || image.naturalHeight) * scale);
  }
  function deckDraw(c, s, seconds, w, h, assets) {
    for (const d of grid(s, w, h).sort((a, b) => a.z - b.z)) {
      if (!d.card) continue;
      const f = deckFrame(s, d, seconds, w, h), a = assets.get(d.card.libraryId);
      if (f.opacity < .001) continue;
      c.save(); c.globalAlpha = f.opacity * d.card.opacity;
      c.translate(f.x + d.card.x * w / 1920, f.y + d.card.y * h / 1080); c.rotate(rad(f.rotation + d.card.rotation));
      c.scale(f.scale * d.card.scale, f.scale * d.card.scale);
      drawAsset(c, a, d.card, seconds * s.motion.speed, d.width, d.height, d.seed); c.restore();
    }
  }
  function draw(c, seconds, w, h, s, assets) {
    c.save(); c.setTransform(c.canvas.width / w, 0, 0, c.canvas.height / h, 0, 0); c.globalAlpha = 1;
    c.fillStyle = s.backgroundColor; c.fillRect(0, 0, w, h);
    if (s.backgroundMedia) {
      const a = assets.get(s.backgroundMedia.libraryId), image = a?.video || (a?.animated ? window.CellMotionAnimatedImage.frameAt(a.animated,seconds*s.motion.speed) : a?.image);
      if (image) { const iw=image.videoWidth||image.naturalWidth||image.width, ih=image.videoHeight||image.naturalHeight||image.height;
        const scale=Math.max(w/iw,h/ih);if(iw&&ih)c.drawImage(image,(w-iw*scale)/2,(h-ih*scale)/2,iw*scale,ih*scale); }
    }
    if (s.effect === 'card-login') loginDraw(c, s, seconds, w, h, assets); else deckDraw(c, s, seconds, w, h, assets);
    c.restore();
  }
  window.CardMotion = { defaults, phases, duration, draw, loginFrame, deckFrame, grid, drawAsset, clamp };
})();
