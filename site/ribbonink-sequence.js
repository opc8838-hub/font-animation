(function (root) {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  // One world-space trajectory, including after the camera has reached page 2.
  const travel = q => 1.4 * (Math.max(0, q) - .08 * (1 - Math.exp(-Math.max(0, q) / .08)));
  function evaluate(elapsed, bridge, popDuration, tip = 1) {
    const q = Math.max(0, elapsed) / bridge;
    const camera = smooth((q - .10) / .24);
    let lo = .34, hi = 4;
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2;
      if (travel(mid) + tip - 1 < .5) lo = mid; else hi = mid;
    }
    const contact = (lo + hi) / 2 * bridge;
    const u = clamp((elapsed - contact) / popDuration);
    const c = 1.70158;
    const scale = u === 0 ? 0 : 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
    return { world: travel(q), camera, offset: travel(q) - camera, contact, scale, pop: u };
  }
  root.RibbonInkSequence = { evaluate, travel };
})(typeof window === 'undefined' ? globalThis : window);
