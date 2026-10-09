/* Deterministic cylinder choreography shared by preview and every export. */
((root) => {
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const defaults = Object.freeze({
    text: 'Sentr', font: 'stg:inter', weight: 400, fontSize: 186,
    background: '#eeeeed', color: '#000000', markColor: '#000000',
    slots: 12, gap: 0.16, cardHeight: 530, curvature: 0.36, turns: 0.625,
    direction: 1, finalSize: 174, textGap: 65,
    spin: 1.23, pullback: 1.42, overlap: 0.05, markHold: 0,
    shiftOverlap: 0.12, shift: 0.85, textDelay: 0.40,
    reveal: 0.45, hold: 1.02, fade: 0.25, speed: 1,
    width: 1920, height: 1080,
  });
  // Camera curve fitted to the reference's measured ring width: accelerate, then brake.
  function cameraEase(value, handle1 = 0.76038327, handle2 = 0.24865819) {
    const t = clamp(value);
    if (t === 0 || t === 1) return t;
    const cubic = (u, a, b) => 3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const u = (lo + hi) / 2; if (cubic(u, handle1, handle2) < t) lo = u; else hi = u; }
    return cubic((lo + hi) / 2, 0, 1);
  }
  function timeline(s) {
    const pullStart = Math.max(0, s.spin - s.overlap);
    const pullEnd = pullStart + s.pullback;
    const shiftStart = Math.max(pullStart, pullEnd + s.markHold - s.shiftOverlap);
    const shiftEnd = shiftStart + s.shift;
    const revealStart = shiftStart + s.textDelay;
    const revealEnd = revealStart + s.reveal;
    const fadeStart = Math.max(shiftEnd, revealEnd) + s.hold;
    return { pullStart, pullEnd, shiftStart, shiftEnd, revealStart, revealEnd, fadeStart,
      total: (fadeStart + s.fade) / s.speed,
      phases: [
        { name: '环形转动', en: 'Rotate', start: 0, end: s.spin, color: '#8ec8ff' },
        { name: '压弯聚拢', en: 'Fold / pull back', start: pullStart, end: pullEnd, color: '#d4b8ff' },
        ...(s.markHold > 0 ? [{ name: '标志停留', en: 'Mark hold', start: pullEnd, end: pullEnd + s.markHold, color: '#a8dfbf' }] : []),
        { name: '整组左移', en: 'Move left', start: shiftStart, end: shiftEnd, color: '#9de7d7' },
        { name: '文字揭开', en: 'Word reveal', start: revealStart, end: revealEnd, color: '#ffc4d6' },
        { name: '组合停留', en: 'Lockup hold', start: Math.max(shiftEnd, revealEnd), end: fadeStart, color: '#ffd27d' },
        { name: '淡出', en: 'Fade', start: fadeStart, end: fadeStart + s.fade, color: '#d7ff2f' },
      ].map(p => ({ ...p, start: p.start / s.speed, end: p.end / s.speed })),
    };
  }
  function pose(s, time, textWidth = 0) {
    const t = Math.max(0, time) * s.speed, line = timeline(s);
    const pull = cameraEase((t - line.pullStart) / s.pullback);
    const word = clamp((t - line.revealStart) / s.reveal);
    // Integrate velocity with continuous braking; rotation never jumps at pullback onset.
    const brake = clamp((t - line.pullStart) / s.pullback);
    const distance = Math.min(t, line.pullStart) + s.pullback * (brake - brake * brake + brake ** 3 / 3);
    const angularSpeed = s.turns * Math.PI * 2 / (line.pullStart + s.pullback / 3);
    const angle = distance * angularSpeed * s.direction;
    return { pull, word, reveal: smooth(word),
      radius: mix(1000, s.finalSize, pull),
      cardHeight: mix(s.cardHeight, s.finalSize * 0.50, Math.pow(pull, 0.85)),
      tilt: mix(s.curvature, 0.45, pull),
      y: mix(870, 546, pull),
      x: 960 - (textWidth + s.textGap) * 0.5 * cameraEase((t - line.shiftStart) / s.shift, 0.79439918, 0.37476227),
      angle: angle - s.turns * Math.PI * 2 * s.direction,
      alpha: 1 - smooth((t - line.fadeStart) / Math.max(0.001, s.fade)),
    };
  }
  function rearFacing(s, p, index) {
    return smooth((0.08 - Math.cos(index * Math.PI * 2 / s.slots + p.angle)) / 0.28);
  }
  function edgeFold(s, p, index) { return rearFacing(s, p, index) * smooth(p.pull); }
  function panelPoints(s, p, index, u, v) {
    let a = index * Math.PI * 2 / s.slots + p.angle;
    const width = (Math.PI * 2 / s.slots) * (1 - s.gap) * mix(1, 0.13, edgeFold(s, p, index));
    a += (u - 0.5) * width;
    return { x: p.x + Math.sin(a) * p.radius,
      y: p.y - Math.cos(a) * p.radius * p.tilt + (v - 0.5) * p.cardHeight + rearFacing(s, p, index) * s.cardHeight * (0.33 * (1 - p.pull) + 0.67 * (1 - p.pull) ** 8) };
  }
  function render(ctx, width, height, time, s, assets = [], resources = new Map(), fonts = root.STGFontLibrary) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = s.background; ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / 1920, height / 1080);
    ctx.save(); ctx.translate((width - 1920 * scale) / 2, (height - 1080 * scale) / 2); ctx.scale(scale, scale);
    const preset = fonts?.preset(s.font);
    ctx.font = `${preset?.style || 'normal'} ${s.weight} ${s.fontSize}px ${fonts?.family(s.font) || 'sans-serif'}`;
    let textWidth = ctx.measureText(s.text).width;
    const availableText = Math.max(100, 1720 - s.finalSize * 2 - s.textGap);
    if (textWidth > availableText) {
      ctx.font = `${preset?.style || 'normal'} ${s.weight} ${s.fontSize * availableText / textWidth}px ${fonts?.family(s.font) || 'sans-serif'}`;
      textWidth = availableText;
    }
    const p = pose(s, time, textWidth);
    ctx.globalAlpha = p.alpha;
    const order = Array.from({ length: s.slots }, (_, i) => i).sort((a, b) =>
      Math.cos(a * Math.PI * 2 / s.slots + p.angle) - Math.cos(b * Math.PI * 2 / s.slots + p.angle));
    for (const i of order) {
      const asset = assets.length ? assets[i % assets.length] : null;
      const resource = asset ? resources.get(asset.id) : null;
      let texture = root.CellMotionAnimatedImage?.frameAt(resource?.animated, time) || resource?.image;
      if (asset?.kind === 'vector' && resource?.canvas && root.STGIconLibrary) {
        const vectorCtx = resource.canvas.getContext('2d'); vectorCtx.clearRect(0, 0, 256, 256);
        vectorCtx.save(); vectorCtx.translate(128, 128); root.STGIconLibrary.drawVector(vectorCtx, asset, 230, time); vectorCtx.restore();
        texture = resource.canvas;
      }
      // Keep each texture strip at least about one output pixel wide; many
      // subpixel draws otherwise wash thin pictures into the background.
      const xs = [0, .5, 1].map(u => panelPoints(s, p, i, u, 0).x);
      const pixelWidth = (Math.max(...xs) - Math.min(...xs)) * scale;
      const slices = Math.max(2, Math.min(32, Math.ceil(pixelWidth / 2) * 2));
      const outline = () => {
        ctx.beginPath();
        // One compound fill keeps curved strips seamless. Match their winding so
        // a side panel's overlapping front/back projections form one rounded cap.
        for (let j = 0; j < 48; j++) {
          const u0 = j / 48, u1 = (j + 1) / 48;
          const q = [panelPoints(s, p, i, u0, 0), panelPoints(s, p, i, u1, 0), panelPoints(s, p, i, u1, 1), panelPoints(s, p, i, u0, 1)];
          if (q[1].x < q[0].x) q.reverse();
          ctx.moveTo(q[0].x, q[0].y); for (let k = 1; k < 4; k++) ctx.lineTo(q[k].x, q[k].y); ctx.closePath();
        }
      };
      // Black in the reference is the source material, not a recoloring stage.
      // A photo fills the same panel geometry even when it becomes a thin strip.
      if (!texture) { ctx.fillStyle = s.markColor; outline(); ctx.fill(); continue; }
      ctx.save(); outline(); ctx.clip();
      for (let j = 0; j < slices; j++) {
        const u0 = j / slices, u1 = (j + 1) / slices;
        const q = [panelPoints(s, p, i, u0, 0), panelPoints(s, p, i, u1, 0)];
        ctx.save(); ctx.globalAlpha = p.alpha * (asset.opacity ?? 1);
        const iw = texture.width || texture.naturalWidth, ih = texture.height || texture.naturalHeight;
        const aspect = p.radius * Math.PI * 2 / s.slots * (1 - s.gap) / p.cardHeight;
        let sw = iw, sh = ih;
        if (asset.fit !== 'stretch') { if (iw / ih > aspect) sw = ih * aspect; else sh = iw / aspect; }
        const sx = (iw - sw) * (asset.cropX ?? 0.5), sy = (ih - sh) * (asset.cropY ?? 0.5);
        // A cylinder strip has parallel vertical sides, so one affine image strip is exact.
        // Slightly overlapping source strips avoid Canvas triangle-diagonal antialias seams.
        const strip = sw * (u1 - u0), dx = q[1].x - q[0].x, dy = q[1].y - q[0].y;
        const overlap = Math.min(strip * 0.9, strip * 6 / Math.max(0.1, Math.abs(dx)));
        ctx.transform(dx / strip, dy / strip, 0, p.cardHeight / sh, q[0].x, q[0].y);
        ctx.drawImage(texture, sx + sw * u0, sy, strip + overlap, sh, 0, 0, strip + overlap, sh);
        ctx.restore();
      }
      ctx.restore();
    }
    if (p.reveal > 0 && s.text) {
      const x = p.x + p.radius + s.textGap, baseline = 540 + s.fontSize * 0.35;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 2, baseline - s.fontSize * 1.35, textWidth + 4, s.fontSize * 1.48); ctx.clip();
      ctx.fillStyle = s.color; ctx.textBaseline = 'alphabetic';
      // Keep the word's kerning, but reveal letters through their own vertical masks.
      const letters = Array.from(s.text);
      for (let i = 0; i < letters.length; i++) {
        const start = ctx.measureText(letters.slice(0, i).join('')).width;
        const end = ctx.measureText(letters.slice(0, i + 1).join('')).width;
        const reveal = smooth((p.word - 0.20 * i / Math.max(1, letters.length - 1)) / 0.80);
        ctx.save(); ctx.beginPath(); ctx.rect(x + start - (i ? 0 : 2), baseline - s.fontSize * 1.35, end - start + (i === letters.length - 1 ? 4 : 0), s.fontSize * 1.48); ctx.clip();
        ctx.fillText(s.text, x, baseline + (1 - reveal) * s.fontSize * 1.5); ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  root.CurvedGalleryMotion = Object.freeze({ defaults, timeline, pose, panelPoints, render });
  if (typeof module !== 'undefined') module.exports = root.CurvedGalleryMotion;
})(typeof window === 'undefined' ? globalThis : window);
