/* Fixed world-space ink. Only the head/tail arc distances and camera advance. */
(function (root) {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const mix = (a, b, t) => a + (b - a) * t;
  // Positive velocity: fast launch, brief slow-motion pocket, fast release.
  function progress(x, options) {
    x = clamp(x);
    if (!options) return x + .075 * Math.sin(2 * Math.PI * x);
    const width = Math.max(.1, Math.min(.5, options.width ?? .3));
    const center = Math.max(width / 2, Math.min(1 - width / 2, options.position ?? .48));
    const strength = options.rhythm === 'linear' ? 0 : options.rhythm === 'smooth' ? .45 : .96 * clamp(options.strength ?? .82);
    const d = Math.max(0, Math.min(width, x - center + width / 2));
    const area = d / 2 - width / (4 * Math.PI) * Math.sin(2 * Math.PI * d / width);
    return (x - strength * area) / (1 - strength * width / 2);
  }
  function inverse(value, options) {
    let a = 0, b = 1;
    for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (progress(m, options) < value) a = m; else b = m; }
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
    else if (shape === 'wave') segments.push(
      [p(0, 0), p(78, 58), p(126, 111), p(178, 58)],
      [p(178, 58), p(230, 5), p(204, -110), p(275, -88)],
      [p(275, -88), p(346, -66), [2 * W + 40, cy + 65], [2 * W + 130, cy + 35]]
    );
    else if (shape === 'eight') segments.push(
      [p(0, 0), p(100, 74), p(232, 115), p(245, 15)],
      [p(245, 15), p(258, -85), p(112, -95), p(0, 0)],
      [p(0, 0), p(-112, 95), p(-252, 125), p(-250, 5)],
      [p(-250, 5), p(-248, -115), p(-110, -100), p(0, 0)],
      [p(0, 0), p(110, 100), p(300, 90), [2 * W + 130, cy - 55]]
    );
    else if (shape === 'spiral') segments.push(
      [p(0, 0), p(55, 41), p(115, 50), p(105, -5)],
      [p(105, -5), p(95, -60), p(0, -88), p(-85, -35)],
      [p(-85, -35), p(-170, 18), p(-120, 110), p(20, 115)],
      [p(20, 115), p(160, 120), p(258, 56), p(252, -48)],
      [p(252, -48), p(246, -152), p(10, -174), p(-168, -99)],
      [p(-168, -99), p(-346, -24), p(-245, 147), p(-58, 145)],
      [p(-58, 145), p(129, 143), p(285, 40), [2 * W + 130, cy -55]]
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
  function settings(values) {
    return { rhythm: values.page2Rhythm, position: Number(values.page2SlowPosition) / 100,
      width: Number(values.page2SlowWidth) / 100, strength: Number(values.page2SlowStrength) / 100,
      finish: Number(values.page2Finish) / 100 };
  }
  function distances(elapsed, bridge, hold, options) {
    if (!options) {
      const delay = Math.min(hold * .85, bridge * .57 + Math.min(.22, hold * .18));
      return { head: progress(elapsed / bridge), tail: progress((elapsed - delay) / bridge) };
    }
    const head = .84 * progress(elapsed / bridge, options);
    const tail = .84 * progress((elapsed - bridge * .6) / bridge, options);
    if (elapsed <= bridge) return { head, tail };
    const t = clamp((elapsed - bridge) / options.finish);
    const h = clamp(t / .58), r = clamp(t / .78);
    const startTail = .84 * progress(.4, options);
    return { head: mix(.84, 1, .15 * h + .85 * h * h),
      tail: mix(startTail, 1, .15 * r + .85 * r * r * r) };
  }
  function releaseAt(distance, bridge, hold, options) {
    let a = 0, b = options ? bridge + options.finish : bridge + Math.min(hold * .85, bridge * .57 + Math.min(.22, hold * .18));
    for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (distances(m, bridge, hold, options).tail < distance) a = m; else b = m; }
    return (a + b) / 2;
  }
  function evaluate(elapsed, bridge, popDuration, route, hold = 1.25, options) {
    const q = Math.max(0, elapsed) / bridge;
    const contact = inverse(route.contactDistance / route.length / (options ? .84 : 1), options) * bridge;
    const u = clamp((elapsed - contact) / popDuration);
    const c = 1.70158;
    const scale = u === 0 ? 0 : 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
    const stroke = distances(elapsed, bridge, hold, options);
    const cameraEnd = Math.max(.08, contact / bridge * .92);
    return { camera: smooth((q - .005) / (cameraEnd - .005)), head: stroke.head * route.length,
      tail: stroke.tail * route.length, contact, scale, pop: u };
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
  function textExit(progress) {
    const q = clamp(progress), collapse = q * q * q;
    return { sx: 1 + .08 * Math.sin(Math.PI * q), sy: 1 - .94 * collapse, dx: .075 * q * q, alpha: 1 - collapse };
  }
  function singleTextExit(progress) {
    const q = clamp(progress);
    let sx, sy, dy;
    if (q < .28) {
      const t = smooth(q / .28);
      sx = mix(1, 1.025, t); sy = mix(1, .84, t); dy = mix(0, .016, t);
    } else if (q < .48) {
      const t = smooth((q - .28) / .20);
      sx = mix(1.025, .99, t); sy = mix(.84, .95, t); dy = mix(.016, .006, t);
    } else {
      const t = smooth((q - .48) / .52);
      sx = mix(.99, .90, t); sy = mix(.95, .06, t); dy = mix(.006, .014, t);
    }
    const fade = smooth((q - .24) / .76);
    return { sx, sy, dx: 0, dy, alpha: 1 - fade * fade };
  }
  root.RibbonInkSequence = { compile, evaluate, progress, section, settings, distances, releaseAt, textExit, singleTextExit };
})(typeof window === 'undefined' ? globalThis : window);
