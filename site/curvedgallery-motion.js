/* Deterministic cylinder choreography shared by preview and every export. */
((root) => {
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const out = (t) => 1 - Math.pow(1 - clamp(t), 4);
  const defaults = Object.freeze({
    text: 'Sentr', font: 'stg:inter', weight: 400, fontSize: 186,
    background: '#eeeeed', color: '#000000', markColor: '#000000',
    slots: 12, gap: 0.16, cardHeight: 570, curvature: 0.36, turns: 0.625,
    direction: 1, finalSize: 174, textGap: 65, solidMark: true,
    spin: 1.20, pullback: 1.15, overlap: 0.05, markHold: 0.45,
    reveal: 0.55, hold: 1.05, fade: 0.25, speed: 1,
    width: 1920, height: 1080,
  });
  function timeline(s) {
    const pullStart = Math.max(0, s.spin - s.overlap);
    const pullEnd = pullStart + s.pullback;
    const revealStart = pullEnd + s.markHold;
    const revealEnd = revealStart + s.reveal;
    const fadeStart = revealEnd + s.hold;
    return { pullStart, pullEnd, revealStart, revealEnd, fadeStart,
      total: (fadeStart + s.fade) / s.speed,
      phases: [
        { name: '环形转动', en: 'Rotate', start: 0, end: s.spin, color: '#8ec8ff' },
        { name: '缩小归标', en: 'Pull back', start: pullStart, end: pullEnd, color: '#d4b8ff' },
        { name: '标志停留', en: 'Mark hold', start: pullEnd, end: revealStart, color: '#9de7d7' },
        { name: '文字揭开', en: 'Word reveal', start: revealStart, end: revealEnd, color: '#ffc4d6' },
        { name: '组合停留', en: 'Lockup hold', start: revealEnd, end: fadeStart, color: '#ffd27d' },
        { name: '淡出', en: 'Fade', start: fadeStart, end: fadeStart + s.fade, color: '#d7ff2f' },
      ].map(p => ({ ...p, start: p.start / s.speed, end: p.end / s.speed })),
    };
  }
  function pose(s, time, textWidth = 0) {
    const t = Math.max(0, time) * s.speed, line = timeline(s);
    const pull = 1 - Math.pow(1 - clamp((t - line.pullStart) / s.pullback), 2.2);
    const reveal = out((t - line.revealStart) / s.reveal);
    // Integrate a constant velocity followed by smooth braking: no stop at pullback onset.
    const brake = clamp((t - line.pullStart) / s.pullback);
    const distance = Math.min(t, line.pullStart) + s.pullback * (brake - brake * brake + brake ** 3 / 3);
    const angularSpeed = s.turns * Math.PI * 2 / (line.pullStart + s.pullback / 3);
    const angle = distance * angularSpeed * s.direction;
    return { pull, reveal,
      radius: mix(1000, s.finalSize, pull),
      cardHeight: mix(s.cardHeight, s.finalSize * 0.62, pull),
      tilt: mix(s.curvature, 0.40, pull),
      y: mix(822, 540, pull),
      x: 960 - (textWidth + s.textGap) * 0.5 * smooth((t - line.revealStart) / s.reveal),
      angle: angle - s.turns * Math.PI * 2 * s.direction,
      solid: s.solidMark ? smooth((pull - 0.25) / 0.65) : 0,
      alpha: 1 - smooth((t - line.fadeStart) / Math.max(0.001, s.fade)),
    };
  }
  function panelPoints(s, p, index, u, v) {
    let a = index * Math.PI * 2 / s.slots + p.angle;
    const rear = Math.cos(a) < 0;
    const width = (Math.PI * 2 / s.slots) * (1 - s.gap) * (rear ? mix(1, 0.09, clamp(p.pull * 1.8)) : 1);
    a += (u - 0.5) * width;
    return { x: p.x + Math.sin(a) * p.radius,
      y: p.y - Math.cos(a) * p.radius * p.tilt + (v - 0.5) * p.cardHeight + (rear ? s.cardHeight * (1 - p.pull) : 0) };
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
      const slices = texture && p.solid < 1 ? 32 : 12;
      const outline = () => {
        ctx.beginPath();
        for (let j = 0; j <= 48; j++) { const q = panelPoints(s, p, i, j / 48, 0); j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
        for (let j = 48; j >= 0; j--) { const q = panelPoints(s, p, i, j / 48, 1); ctx.lineTo(q.x, q.y); }
        ctx.closePath();
      };
      ctx.save(); outline(); ctx.clip();
      for (let j = 0; j < slices; j++) {
        const u0 = j / slices, u1 = (j + 1) / slices;
        const q = [panelPoints(s, p, i, u0, 0), panelPoints(s, p, i, u1, 0), panelPoints(s, p, i, u1, 1), panelPoints(s, p, i, u0, 1)];
        if (texture && p.solid < 1) {
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
      }
      ctx.restore();
      // Fill the entire curved outline once: adjacent slice antialiasing must not create white stripes.
      ctx.save(); ctx.globalAlpha = p.alpha * (texture ? p.solid : 1); ctx.fillStyle = s.markColor; outline(); ctx.fill(); ctx.restore();
    }
    if (p.reveal > 0 && s.text) {
      const x = p.x + p.radius + s.textGap, baseline = 540 + s.fontSize * 0.35;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 2, baseline - s.fontSize * 1.35, textWidth + 4, s.fontSize * 1.48); ctx.clip();
      ctx.fillStyle = s.color; ctx.textBaseline = 'alphabetic';
      ctx.fillText(s.text, x, baseline + (1 - p.reveal) * s.fontSize * 1.5); ctx.restore();
    }
    ctx.restore();
  }
  root.CurvedGalleryMotion = Object.freeze({ defaults, timeline, pose, panelPoints, render });
  if (typeof module !== 'undefined') module.exports = root.CurvedGalleryMotion;
})(typeof window === 'undefined' ? globalThis : window);
