/* Smooth ribbon material and a separate depth mask, shared by every output. */
(function (root) {
  'use strict';
  let ink, rear, layer;
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  function surface(canvas, w, h) {
    canvas ||= document.createElement('canvas');
    if (canvas.width !== Math.ceil(w) || canvas.height !== Math.ceil(h)) { canvas.width = Math.ceil(w); canvas.height = Math.ceil(h); }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }
  function outline(points) {
    const path = new Path2D(), a = points[0], b = points[points.length - 1];
    const side = (p, s) => [p.x - Math.sin(p.angle) * p.r * s, p.y + Math.cos(p.angle) * p.r * s];
    path.moveTo(...side(a, 1));
    for (let i = 1; i < points.length; i++) path.lineTo(...side(points[i], 1));
    path.arc(b.x, b.y, b.r, b.angle + Math.PI / 2, b.angle - Math.PI / 2, true);
    for (let i = points.length - 2; i >= 0; i--) path.lineTo(...side(points[i], -1));
    path.arc(a.x, a.y, a.r, a.angle - Math.PI / 2, a.angle + Math.PI / 2, true);
    path.closePath(); return path;
  }
  function draw(route, motion, w, h, unit, brushWidth, colors, time, speed, density, weave) {
    ink = surface(ink, w, h); rear = surface(rear, w, h); layer = surface(layer, w, h);
    const ctx = ink.getContext('2d'), depth = rear.getContext('2d'), paint = layer.getContext('2d');
    if (motion.head <= motion.tail) return { ink, rear };
    const noise = root.RibbonInkFreehand.noise;
    for (const part of route.parts) {
      const from = Math.max(part.start, motion.tail), to = Math.min(part.end, motion.head);
      if (to <= from) continue;
      const points = root.RibbonInkSequence.section(part.points, from, to).map(p => {
        const organic = .96 + .12 * Math.sin(p.length / 84) + .10 * noise(p.length / 135, 7);
        const pressure = .89 + .11 * Math.cos(p.angle * 2 - .4);
        const tail = motion.tail > 0 ? .28 + .72 * smooth((p.length - motion.tail) / 46) : 1;
        const head = .68 + .32 * smooth((motion.head - p.length) / 32);
        return { ...p, r: brushWidth * .5 * organic * pressure * Math.min(head, tail) };
      });
      if (points.length < 2) continue;
      paint.setTransform(1, 0, 0, 1, 0, 0); paint.clearRect(0, 0, w, h);
      paint.save(); paint.scale(unit, unit); paint.translate(-motion.camera * w / unit, 0);
      const body = outline(points);
      paint.fillStyle = colors[0]; paint.fill(body);
      paint.globalCompositeOperation = 'source-atop';
      const vein = points.map(p => {
        const u = (p.length - time * 24 * speed) * density;
        const offset = (.64 * Math.sin(u / 77) + noise(u / 74, 11) * 1.35) * p.r;
        return { ...p, x: p.x - Math.sin(p.angle) * offset, y: p.y + Math.cos(p.angle) * offset,
          r: p.r * (.49 + .15 * Math.sin(u / 111 + 1) + .12 * noise(u / 85, 3)) };
      });
      paint.fillStyle = colors[1]; paint.fill(outline(vein));
      // Broad pigment islands, not evenly spaced stripes or a hairline highlight.
      const step = 195 / density, drift = time * 24 * speed;
      for (let k = Math.floor((from - drift) / step) - 1; k * step + drift < to + step; k++) {
        const center = k * step + drift + noise(k, 23) * step * .38;
        const half = 36 + 24 * (noise(k, 41) + 1);
        const pool = points.filter(p => Math.abs(p.length - center) < half).map(p => {
          const side = noise(k, 13) > 0 ? .64 : -.60;
          return { ...p, x: p.x - Math.sin(p.angle) * p.r * side, y: p.y + Math.cos(p.angle) * p.r * side,
            r: Math.max(.001, p.r * .58 * Math.sin((p.length - center + half) / (2 * half) * Math.PI)) };
        });
        if (pool.length < 2) continue;
        paint.globalAlpha = .8; paint.fillStyle = colors[[2, 4, 3][Math.abs(k) % 3]]; paint.fill(outline(pool));
      }
      paint.restore();
      ctx.drawImage(layer, 0, 0);
      const behind = weave === 'back' || (weave !== 'front' && (weave === 'reverse' ? !part.rear : part.rear));
      // A later foreground pass must also clear an earlier rear pass at self-crossings.
      depth.globalCompositeOperation = behind ? 'source-over' : 'destination-out';
      depth.save(); depth.scale(unit, unit); depth.translate(-motion.camera * w / unit, 0);
      depth.fillStyle = '#fff';
      // Cover the ink's antialiased fringe so a rear stroke cannot leave a
      // colored hairline across a solid glyph when the text is composited back.
      depth.fill(outline(points.map(p => ({ ...p, r: p.r + 1.25 }))));
      depth.restore();
    }
    depth.globalCompositeOperation = 'source-over';
    return { ink, rear };
  }
  root.RibbonInkWriting = { draw };
})(typeof window === 'undefined' ? globalThis : window);
