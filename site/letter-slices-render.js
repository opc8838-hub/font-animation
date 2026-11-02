(() => {
  'use strict';
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  const glyph = document.createElement('canvas');
  const cyan = document.createElement('canvas');
  const highlight = document.createElement('canvas');
  const amber = document.createElement('canvas');
  const halo = document.createElement('canvas');
  const body = document.createElement('canvas');
  const layers = document.createElement('canvas');
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
    for (const canvas of [glyph, cyan, highlight, amber, halo, body, layers]) { canvas.width = width; canvas.height = height; }
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
    ink(cyan, '#0877ff'); ink(highlight, '#8edfff'); ink(amber, '#f5a63c');
    const haloContext = halo.getContext('2d');
    haloContext.filter = `blur(${Math.max(1, height * .003)}px)`;
    haloContext.drawImage(cyan, 0, 0);
    haloContext.filter = 'none';
    const bodyContext = body.getContext('2d');
    bodyContext.drawImage(glyph, 0, 0);
    bodyContext.globalCompositeOperation = 'destination-in';
    const depth = bodyContext.createLinearGradient(bounds.left, 0, bounds.right, 0);
    depth.addColorStop(0, 'transparent');
    depth.addColorStop(.28, 'black');
    depth.addColorStop(.7, 'black');
    depth.addColorStop(1, 'transparent');
    bodyContext.fillStyle = depth;
    bodyContext.fillRect(bounds.left, 0, bounds.right - bounds.left, height);
    bodyContext.globalCompositeOperation = 'source-over';
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
    const count = Math.max(2, Math.round(1 + (scene.slices - 1) * Math.pow(amount, 1.2)));
    const letterWidth = bounds.right - bounds.left;
    const finalSpan = letterWidth + width * scene.spread * .35;
    const span = finalSpan * (1 - Math.exp(-4 * amount)) / (1 - Math.exp(-4));
    const pitch = span / Math.max(1, count - 1);
    const ribWidth = letterWidth * Math.pow(1 - amount, 3) + pitch * .93 * amount;
    const center = (bounds.left + bounds.right) / 2 - width * .02 * amount;
    const fringe = scene.fringe * Math.min(width, height) / 1080 * Math.sqrt(amount);
    const layerCtx = layers.getContext('2d');
    layerCtx.clearRect(0, 0, width, height);
    layerCtx.globalAlpha = amount;
    layerCtx.drawImage(body, 0, 0);
    layerCtx.globalAlpha = 1;
    const rib = (source, x, w, offset, alpha) => {
      layerCtx.globalAlpha = alpha;
      layerCtx.drawImage(source, bounds.left, 0, letterWidth, height, x + offset, 0, w, height);
    };
    for (let i = 0; i < count; i++) {
      const order = scene.direction === 'reverse' ? count - i - 1 : i;
      const x = center - span / 2 + order * pitch;
      rib(halo, x, ribWidth, fringe * 2.8, .18);
      rib(amber, x, ribWidth, -fringe * .8, .45);
      rib(highlight, x, ribWidth, fringe * 2.3, .22);
      rib(cyan, x, ribWidth, fringe * 1.5, .5);
      rib(glyph, x, ribWidth, 0, 1);
    }
    layerCtx.globalAlpha = 1;
    layerCtx.globalCompositeOperation = 'destination-in';
    const maskWidth = letterWidth + width * scene.spread * .6 * amount;
    layerCtx.drawImage(glyph, bounds.left, 0, letterWidth, height,
      center - maskWidth / 2, 0, maskWidth, height);
    layerCtx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1 - ease((amount - .03) / .5);
    ctx.drawImage(glyph, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(layers, 0, 0);
  }

  window.LetterSlicesRenderer = {
    draw,
    invalidate: () => { cacheKey = ''; },
    duration: scene => scene.intro + scene.sweep + scene.hold + scene.return + scene.settle
  };
})();
