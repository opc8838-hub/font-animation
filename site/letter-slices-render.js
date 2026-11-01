(() => {
  'use strict';
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  const glyph = document.createElement('canvas');
  const cyan = document.createElement('canvas');
  const amber = document.createElement('canvas');
  let cacheKey = '';
  let bounds = {left:0, right:0};

  function ink(canvas, color) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(glyph, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  function build(scene, width, height) {
    const key = [width, height, scene.text, scene.font, scene.fontSize, scene.fontHeight, scene.extraBold,
      scene.positionX, scene.positionY, scene.alignment, scene.textColor].join('|');
    if (key === cacheKey) return;
    cacheKey = key;
    for (const canvas of [glyph, cyan, amber]) { canvas.width = width; canvas.height = height; }
    const ctx = glyph.getContext('2d');
    const preset = window.STGFontLibrary.preset(scene.font);
    const nominal = height * .9;
    ctx.font = `${preset.style} ${preset.weight} ${nominal}px ${window.STGFontLibrary.family(scene.font)}`;
    ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText(scene.text || ' ');
    const ascent = Math.max(1, metrics.actualBoundingBoxAscent);
    const descent = Math.max(0, metrics.actualBoundingBoxDescent);
    const bodyHeight = (ascent + descent) * scene.fontHeight;
    const scale = Math.min(height * scene.fontSize / bodyHeight, width * .64 / Math.max(1, metrics.width));
    const letterWidth = metrics.width * scale;
    const left = scene.alignment === 'left' ? width * .16 : scene.alignment === 'right' ? width * .84 - letterWidth : (width - letterWidth) / 2;
    const top = (height - bodyHeight * scale) / 2;
    const xOffset = width * (scene.positionX || 0) / 100;
    bounds = {left:left + xOffset, right:left + letterWidth + xOffset};
    ctx.save();
    ctx.translate(left + xOffset,
      top + ascent * scale * scene.fontHeight + height * (scene.positionY || 0) / 100);
    ctx.scale(scale, scale * scene.fontHeight);
    ctx.fillStyle = scene.textColor;
    ctx.strokeStyle = scene.textColor;
    ctx.lineJoin = 'round';
    ctx.lineWidth = nominal * scene.extraBold * 2;
    ctx.fillText(scene.text, 0, 0);
    if (scene.extraBold) ctx.strokeText(scene.text, 0, 0);
    ctx.restore();
    ink(cyan, '#008bdb'); ink(amber, '#f0a02a');
  }

  function progress(scene, time) {
    const opening = scene.intro;
    const spreadEnd = opening + scene.sweep;
    const holdEnd = spreadEnd + scene.hold;
    const gatherEnd = holdEnd + scene.return;
    if (time <= opening) return 0;
    if (time < spreadEnd) return ease((time - opening) / scene.sweep);
    if (time < holdEnd) return 1;
    if (time < gatherEnd) return 1 - ease((time - holdEnd) / scene.return);
    return 0;
  }

  function draw(ctx, state, time, width, height) {
    const scene = state.scene;
    if (!scene.text) return;
    build(scene, width, height);
    const amount = progress(scene, time);
    if (amount < .001) { ctx.drawImage(glyph, 0, 0, width, height); return; }
    const count = Math.max(4, Math.round(scene.slices));
    const begin = Math.max(0, bounds.left - width * scene.spread * .3);
    const end = Math.min(width, bounds.right + width * scene.spread * .3);
    const strip = Math.max(1, (end - begin) / (count * 4));
    const travel = width * scene.spread * .36 * amount;
    const period = (end - begin) / count;
    const fringe = scene.fringe * Math.min(width, height) / 1080 * amount;
    const drawBands = (source, colorOffset) => {
      for (let x = begin; x < end; x += strip) {
        const phase = (x - begin) / period * Math.PI * 2;
        const triangle = Math.asin(Math.sin(phase)) * 2 / Math.PI;
        const sourceX = clamp(x + triangle * travel * (scene.direction === 'reverse' ? -1 : 1), 0, width - strip);
        ctx.drawImage(source, sourceX, 0, strip + .5, height, x + colorOffset, 0, strip + .5, height);
      }
    };
    ctx.globalAlpha = .58;
    drawBands(amber, -fringe);
    drawBands(cyan, fringe);
    ctx.globalAlpha = 1;
    drawBands(glyph, 0);
  }

  window.LetterSlicesRenderer = {
    draw,
    invalidate: () => { cacheKey = ''; },
    duration: scene => scene.intro + scene.sweep + scene.hold + scene.return + scene.settle
  };
})();
