/* Fixed world-space ink. Only the head/tail arc distances and camera advance. */
(function (root) {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const mix = (a, b, t) => a + (b - a) * t;
  // Positive velocity: fast launch, brief slow-motion pocket, fast release.
  function progress(x) { x = clamp(x); return x + .075 * Math.sin(2 * Math.PI * x); }
  function inverse(value) {
    let a = 0, b = 1;
    for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (progress(m) < value) a = m; else b = m; }
    return (a + b) / 2;
  }
  function point(segment, t) {
    const u = 1 - t;
    return { x: u ** 3 * segment[0][0] + 3 * u * u * t * segment[1][0] + 3 * u * t * t * segment[2][0] + t ** 3 * segment[3][0],
      y: u ** 3 * segment[0][1] + 3 * u * u * t * segment[1][1] + 3 * u * t * t * segment[2][1] + t ** 3 * segment[3][1] };
  }
  function compile(shape, W, H, entry) {
    const cx = W * 1.5, cy = H / 2;
    const p = (x, y) => [cx + x, cy + y];
    const segments = [[entry, [entry[0] + 105, entry[1] - 36], p(-135, -100), p(0, 0)]];
    if (shape === 'arc') segments.push(
      [p(0, 0), p(120, 90), p(255, 110), p(270, 5)],
      [p(270, 5), p(288, -140), p(42, -168), p(-155, -72)],
      [p(-155, -72), p(-342, 18), p(-210, 155), p(-30, 115)],
      [p(-30, 115), p(145, 76), p(270, -8), [2 * W + 130, cy - 48]]
    );
    else segments.push(
      [p(0, 0), p(100, 92), p(262, 130), p(245, -8)],
      [p(245, -8), p(230, -165), p(-20, -150), p(-128, -45)],
      [p(-128, -45), p(-237, 65), p(-95, 148), p(38, 61)],
      [p(38, 61), p(145, -12), p(191, -89), [2 * W + 130, cy - 55]]
    );
    let length = 0, previous;
    const parts = segments.map((segment, index) => {
      const points = [];
      const estimate = segment.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - segment[i][0], p[1] - segment[i][1]), 0);
      const steps = Math.max(32, Math.ceil(estimate / 3));
      for (let i = 0; i <= steps; i++) {
        const q = point(segment, i / steps);
        if (previous) length += Math.hypot(q.x - previous.x, q.y - previous.y);
        points.push({ ...q, length, pressure: 1 }); previous = q;
      }
      points.forEach((q, i) => { const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]; q.angle = Math.atan2(b.y - a.y, b.x - a.x); });
      return { points, start: points[0].length, end: length, rear: index % 2 === 0 };
    });
    return { parts, length, contactDistance: parts[0].end };
  }
  function evaluate(elapsed, bridge, popDuration, route, hold = 1.25) {
    const q = Math.max(0, elapsed) / bridge;
    const contact = inverse(route.contactDistance / route.length) * bridge;
    const u = clamp((elapsed - contact) / popDuration);
    const c = 1.70158;
    const scale = u === 0 ? 0 : 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
    const delay = Math.min(hold * .85, bridge * .57 + Math.min(.22, hold * .18));
    const cameraEnd = Math.max(.08, contact / bridge * .92);
    return { camera: smooth((q - .005) / (cameraEnd - .005)), head: progress(q) * route.length,
      tail: progress((elapsed - delay) / bridge) * route.length, contact, scale, pop: u };
  }
  function section(points, from, to) {
    const result = [];
    if (to <= from) return result;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (b.length < from || a.length > to) continue;
      const at = length => { const t = clamp((length - a.length) / Math.max(1e-8, b.length - a.length));
        const turn = Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle));
        return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), length, angle: a.angle + turn * t }; };
      if (!result.length) result.push(at(Math.max(from, a.length)));
      result.push(at(Math.min(to, b.length)));
    }
    return result;
  }
  root.RibbonInkSequence = { compile, evaluate, progress, section };
})(typeof window === 'undefined' ? globalThis : window);
