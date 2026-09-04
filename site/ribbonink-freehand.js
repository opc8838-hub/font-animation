/* Recorded centerlines are independent of brush width and playback time. */
(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let materialCanvas;
  let bodyCanvas, bodyCache;
  function validate(data) {
    if (!data) return { width: 720, height: 405, strokes: [] };
    if (!Number.isFinite(data.width) || !Number.isFinite(data.height) || data.width < 1 || data.height < 1 || data.width > 10000 || data.height > 10000 || !Array.isArray(data.strokes) || data.strokes.length > 300) throw new Error("手绘方案尺寸或笔画数量无效");
    let count = 0;
    const strokes = data.strokes.map(stroke => {
      if (!Array.isArray(stroke) || !stroke.length || (count += stroke.length) > 60000) throw new Error("手绘方案点数无效或过多");
      return stroke.map(p => {
        if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3) || !p.every(Number.isFinite) || p[0] < 0 || p[0] > data.width || p[1] < 0 || p[1] > data.height || (p.length === 3 && (p[2] < .15 || p[2] > 1.3))) throw new Error("手绘坐标或笔压无效");
        return [...p];
      });
    });
    return { width: data.width, height: data.height, strokes };
  }
  function sample(stroke) {
    if (stroke.length === 1) return [{ x: stroke[0][0], y: stroke[0][1], pressure: stroke[0][2] ?? 1, length: 0, angle: 0 }];
    // Two corner-cutting passes remove mouse jitter without overshooting the route.
    let points = stroke.map(p => [p[0], p[1], p[2] ?? 1]);
    for (let pass = 0; pass < 2; pass++) {
      const next = [points[0]];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        next.push(a.map((v, k) => v * .75 + b[k] * .25), a.map((v, k) => v * .25 + b[k] * .75));
      }
      next.push(points[points.length - 1]); points = next;
    }
    let length = 0;
    const dense = points.map((p, i) => {
      if (i) length += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]);
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      return { x: p[0], y: p[1], pressure: p[2], length, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    });
    // Arc-length spacing prevents input event frequency from changing the material.
    const sampled = [dense[0]];
    let index = 1;
    const spacing = Math.max(1, length / 12000);
    for (let distance = spacing; distance < length; distance += spacing) {
      while (index < dense.length - 1 && dense[index].length < distance) index++;
      const a = dense[index - 1], b = dense[index], t = (distance - a.length) / Math.max(.00001, b.length - a.length);
      sampled.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pressure: a.pressure + (b.pressure - a.pressure) * t, length: distance, angle: b.angle });
    }
    sampled.push(dense[dense.length - 1]);
    return sampled.map((p, i) => {
      const a = sampled[Math.max(0, i - 4)], b = sampled[Math.min(sampled.length - 1, i + 4)];
      let pressure = 0, weight = 0;
      for (let k = Math.max(0, i - 24); k <= Math.min(sampled.length - 1, i + 24); k++) {
        const w = Math.exp(-(((sampled[k].length - p.length) / 12) ** 2));
        pressure += sampled[k].pressure * w; weight += w;
      }
      return { ...p, pressure: pressure / weight, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    });
  }
  function compile(data) {
    let total = 0;
    const strokes = data.strokes.map(stroke => {
      const points = sample(stroke), length = Math.max(8, points[points.length - 1].length);
      const result = { points, start: total, length }; total += length;
      return result;
    });
    return { strokes, total };
  }
  function section(points, from, to) {
    if (points.length === 1) return points;
    const result = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (b.length < from || a.length > to) continue;
      const interpolate = length => {
        const t = clamp((length - a.length) / Math.max(.00001, b.length - a.length), 0, 1);
        const turn = Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle));
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pressure: a.pressure + (b.pressure - a.pressure) * t, angle: a.angle + turn * t, length };
      };
      if (!result.length) result.push(interpolate(Math.max(from, a.length)));
      result.push(interpolate(Math.min(to, b.length)));
    }
    return result;
  }
  function transform(data, width, height) {
    const scale = Math.min(width / data.width, height / data.height);
    return { scale, x: (width - data.width * scale) / 2, y: (height - data.height * scale) / 2 };
  }
  const smooth = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };
  function noise(x, seed) {
    const hash = n => { const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
    // Cubic B-spline noise has continuous curvature at every knot.
    const cell = Math.floor(x), t = x - cell;
    return (hash(cell - 1) * (1 - t) ** 3 + hash(cell) * (3 * t ** 3 - 6 * t * t + 4)
      + hash(cell + 1) * (-3 * t ** 3 + 3 * t * t + 3 * t + 1) + hash(cell + 2) * t ** 3) / 6;
  }
  function radius(point, stroke, brushWidth, seed) {
    if (stroke.points.length === 1) return brushWidth * .43;
    const organic = .98 + noise(point.length / 160, seed) * .055;
    const direction = .94 + Math.cos(point.angle * 2 - .65) * .06;
    const head = .66 + .34 * smooth(point.length / 36);
    const tail = .38 + .62 * smooth((stroke.length - point.length) / 52);
    return brushWidth * .5 * organic * direction * Math.min(head, tail) * (.4 + point.pressure * .6);
  }
  function outline(points) {
    const path = new Path2D();
    const adjusted = points.map((p, i) => {
      const a = points[Math.max(0, i - 2)], b = points[Math.min(points.length - 1, i + 2)];
      return { ...p, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    });
    const first = adjusted[0], last = adjusted[adjusted.length - 1];
    if (adjusted.length === 1) { path.arc(first.x, first.y, first.r, 0, Math.PI * 2); return path; }
    const edge = (p, side) => [p.x - Math.sin(p.angle) * p.r * side, p.y + Math.cos(p.angle) * p.r * side];
    path.moveTo(...edge(first, 1));
    adjusted.slice(1).forEach(p => path.lineTo(...edge(p, 1)));
    path.arc(last.x, last.y, last.r, last.angle + Math.PI / 2, last.angle - Math.PI / 2, true);
    for (let i = adjusted.length - 2; i >= 0; i--) path.lineTo(...edge(adjusted[i], -1));
    path.arc(first.x, first.y, first.r, first.angle - Math.PI / 2, first.angle + Math.PI / 2, true);
    path.closePath(); return path;
  }
  function paintBody(ctx, points) {
    // Opaque round strokes union naturally without a costly self-intersecting clip.
    ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (points.length === 1) { ctx.fill(outline(points)); return; }
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      ctx.lineWidth = a.r + b.r; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function draw(ctx, data, compiled, width, height, visible, time, brushWidth, colors, speed, density) {
    if (visible.end <= visible.start || !compiled.total) return;
    const fit = transform(data, width, height);
    materialCanvas ||= document.createElement("canvas");
    if (materialCanvas.width !== width || materialCanvas.height !== height) {
      materialCanvas.width = width; materialCanvas.height = height;
    }
    const paint = materialCanvas.getContext("2d", { willReadFrequently: true });
    const destination = ctx;
    ctx = paint;
    for (const [strokeIndex, stroke] of compiled.strokes.entries()) {
      const from = Math.max(0, visible.start * compiled.total - stroke.start);
      const to = Math.min(stroke.length, visible.end * compiled.total - stroke.start);
      if (to <= from) continue;
      const seed = strokeIndex * 7.31 + 2.4;
      const points = section(stroke.points, from, to).map(p => ({ ...p, r: radius(p, stroke, brushWidth, seed) }));
      if (!points.length) continue;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, width, height);
      const bodyKey = [width, height, brushWidth, colors[0], from, to, fit.x, fit.y, fit.scale].join("|");
      if (!bodyCache || bodyCache.stroke !== stroke || bodyCache.key !== bodyKey) {
        bodyCanvas ||= document.createElement("canvas");
        if (bodyCanvas.width !== width || bodyCanvas.height !== height) { bodyCanvas.width = width; bodyCanvas.height = height; }
        const base = bodyCanvas.getContext("2d", { willReadFrequently: true });
        base.setTransform(1, 0, 0, 1, 0, 0); base.clearRect(0, 0, width, height);
        base.save(); base.translate(fit.x, fit.y); base.scale(fit.scale, fit.scale);
        base.fillStyle = colors[0]; paintBody(base, points); base.restore();
        bodyCache = { stroke, key: bodyKey };
      }
      ctx.drawImage(bodyCanvas, 0, 0);
      ctx.save(); ctx.translate(fit.x, fit.y); ctx.scale(fit.scale, fit.scale);
      // Like TIME's material layer, keep all pigment inside the same alpha mask.
      // Software rasterization avoids GPU clip seams at brush self-intersections.
      ctx.globalCompositeOperation = "source-atop";
      // TIME's material roles: dominant body + one wandering dark vein,
      // local light patches and sparse flowing accents, never a rainbow ramp.
      const river = points.map(p => {
        const u = (p.length - time * 28 * speed) * density;
        const offset = (noise(u / 105, seed + 8) * 2.7 + Math.sin(u / 165 + seed) * .38) * p.r;
        return { ...p, x: p.x - Math.sin(p.angle) * offset, y: p.y + Math.cos(p.angle) * offset,
          r: p.r * (.43 + .23 * noise(u / 130, seed + 2)) };
      });
      ctx.fillStyle = colors[1]; ctx.fill(outline(river));
      // Isolated ink pools vary in placement, size and length along each stroke.
      const step = 235 / density, drift = time * 28 * speed;
      for (let mark = Math.floor((from - drift) / step) - 1; mark * step + drift < to + step; mark++) {
        const center = mark * step + drift + noise(mark, seed + 19) * step * .28;
        const halfLength = 18 + (noise(mark, seed + 31) + 1) * 16;
        const pool = points.filter(p => Math.abs(p.length - center) < halfLength).map(p => {
          const side = noise(mark, seed + 22) > 0 ? .62 : -.62;
          return { ...p, x: p.x - Math.sin(p.angle) * p.r * side, y: p.y + Math.cos(p.angle) * p.r * side,
            r: Math.max(.01, p.r * .22 * Math.sin((p.length - center + halfLength) / (2 * halfLength) * Math.PI) ** 1.5) };
        });
        if (pool.length < 2) continue;
        const role = Math.abs(mark) % 4;
        ctx.globalAlpha = role === 0 ? .5 : .75;
        ctx.fillStyle = colors[[2, 1, 3, 4][role]]; ctx.fill(outline(pool));
      }
      ctx.restore();
      destination.drawImage(materialCanvas, 0, 0, width, height);
    }
  }
  root.RibbonInkFreehand = { validate, compile, section, transform, radius, noise, draw };
})(typeof window === "undefined" ? globalThis : window);
