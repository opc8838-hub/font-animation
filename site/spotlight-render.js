(() => {
  "use strict";

  // Spotlight renderer. Reproduces the reference light sequence measured frame by frame from
  // the 592×333 reference (docs/analyses/spotlight.md). Geometry is in units of U, the height of
  // a 16:9 frame; refTime is the reference clock in milliseconds (0 … REF_DURATION).
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const smooth = (t) => t * t * (3 - 2 * t);
  // Monotone cubic (Fritsch–Carlson) through the keyframes: velocity stays continuous across
  // keyframes, so motion never stalls at a key, and it never overshoots between two keys.
  function track(points) {
    const n = points.length;
    const slopes = [];
    for (let index = 0; index < n - 1; index += 1) {
      slopes.push((points[index + 1][1] - points[index][1]) / Math.max(1e-6, points[index + 1][0] - points[index][0]));
    }
    const tangents = points.map((_, index) => {
      if (index === 0 || index === n - 1) return 0;
      const a = slopes[index - 1], b = slopes[index];
      if (a * b <= 0) return 0;
      const ha = points[index][0] - points[index - 1][0], hb = points[index + 1][0] - points[index][0];
      return 3 * (ha + hb) / ((2 * hb + ha) / a + (hb + 2 * ha) / b);
    });
    return (time) => {
      if (time <= points[0][0]) return points[0][1];
      for (let index = 1; index < n; index += 1) {
        const [t1, v1] = points[index];
        if (time <= t1) {
          const [t0, v0] = points[index - 1];
          const h = Math.max(1e-6, t1 - t0), t = (time - t0) / h, t2 = t * t, t3 = t2 * t;
          return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * tangents[index - 1] + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * tangents[index];
        }
      }
      return points[n - 1][1];
    };
  }

  const REF_DURATION = 11700;
  const T = {
    // Orb: size factor (1 = measured profile at 1.2 s) and strength.
    orbS: track([[0, 0.05], [60, 0.18], [150, 0.5], [350, 0.86], [700, 0.95], [1200, 1], [1600, 1], [2000, 0.95], [2400, 0.82], [2600, 0.72], [2800, 0.6], [3000, 0.42], [3200, 0.28], [3500, 0.1]]),
    orbI: track([[0, 0], [40, 0.42], [100, 0.55], [150, 0.62], [250, 0.88], [350, 1], [1600, 1], [2000, 0.98], [2400, 0.97], [2600, 0.97], [2800, 0.82], [3000, 0.38], [3200, 0.12], [3500, 0]]),
    spark: track([[0, 0], [40, 1], [150, 0.8], [350, 0], [3000, 0]]),
    flareDisc: track([[0, 0], [80, 1], [220, 0.7], [400, 0]]),
    orbY: track([[0, 0.5], [2400, 0.5], [2600, 0.5], [3000, 0.488], [3200, 0.478]]),
    rays: track([[0, 0], [250, 0.3], [700, 0.75], [1400, 1], [2000, 0.85], [2400, 0.45], [2700, 0.1], [2900, 0]]),
    ghost: track([[0, 0], [300, 0.8], [1200, 1], [2400, 0.9], [2900, 0.5], [3400, 0]]),
    ring: track([[2600, 0], [2900, 0.6], [3600, 0.5], [4300, 0.32], [4800, 0.1], [5200, 0]]),
    haze: track([[2600, 0], [3000, 1], [3800, 0.8], [4600, 0.35], [5400, 0.15], [11000, 0.12], [11500, 0]]),
    // Source point (top of the cone), travelling upward while the cone narrows.
    srcY: track([[0, 0.5], [2600, 0.5], [3200, 0.491], [4000, 0.462], [4400, 0.428], [4800, 0.378], [5200, 0.312], [5600, 0.255], [6000, 0.225], [6600, 0.21], [8000, 0.216], [10000, 0.222], [11200, 0.24]]),
    cone: track([[2600, 0], [2900, 0.6], [3200, 1], [10200, 1], [10600, 0.92], [11000, 0.8], [11200, 0.66], [11400, 0.25], [11600, 0]]),
    // Beam width at the source (U) and spread half-angle (deg) derived from the measured widths.
    bw: track([[2600, 0.012], [4000, 0.018], [4400, 0.026], [5000, 0.04], [5600, 0.038], [6000, 0.034], [8000, 0.04], [10200, 0.05], [10600, 0.04], [10800, 0.026], [11000, 0.017], [11200, 0.008], [11450, 0.004]]),
    half: track([[2600, 59.5], [2800, 55.9], [3000, 52.5], [3200, 43.2], [3400, 33.5], [3600, 25.6], [3800, 21], [4000, 17], [4200, 13], [4400, 10.4], [4600, 7.6], [4800, 5.6], [5000, 3.8], [5200, 2.6], [5400, 1.8], [5600, 1.3], [5800, 1.0], [7600, 1.0], [8000, 1.1], [9400, 1.3], [10200, 1.6], [10600, 1.4], [11000, 1.2], [11200, 1.0]]),
    beamEnd: track([[0, 1.25], [4300, 1.25], [4400, 0.97], [4600, 0.89], [4800, 0.82], [5000, 0.76], [5200, 0.71], [5400, 0.655], [5600, 0.612], [5800, 0.573], [6000, 0.537], [6200, 0.52], [6600, 0.497], [7000, 0.49], [8000, 0.49], [9000, 0.51], [10000, 0.548], [10200, 0.548], [10600, 0.512], [10800, 0.472], [11000, 0.42], [11200, 0.38]]),
    dot: track([[2600, 0], [3000, 0.85], [3400, 1.15], [5200, 1.3], [6000, 1.0], [8000, 1.05], [10200, 1.45], [10600, 1.15], [11000, 0.55], [11300, 0.15], [11450, 0]]),
    // Floor arc: circle of radius 0.39U whose top sits at poolY; hw is the half-width at 50% brightness.
    poolI: track([[6500, 0], [6700, 0.35], [7000, 0.7], [7600, 0.9], [8000, 1], [10600, 1], [11000, 0.8], [11200, 0.45], [11400, 0.15], [11600, 0]]),
    poolY: track([[6600, 0.85], [6800, 0.848], [7200, 0.825], [8000, 0.803], [9000, 0.786], [10200, 0.773], [11400, 0.766]]),
    poolHW: track([[6600, 0.012], [6800, 0.02], [7200, 0.029], [7600, 0.038], [8000, 0.046], [9000, 0.058], [9600, 0.062], [10600, 0.063], [11200, 0.05], [11400, 0.045]])
  };

  // Measured orb radial profile at 1.2 s (fraction of white vs radius in U).
  const ORB = [[0, 1], [0.03, 0.995], [0.06, 0.985], [0.09, 0.965], [0.12, 0.935], [0.15, 0.89], [0.18, 0.835], [0.24, 0.7], [0.3, 0.56], [0.39, 0.39], [0.48, 0.27], [0.6, 0.17], [0.75, 0.12], [0.9, 0.1], [1.1, 0.075], [1.5, 0.03], [2, 0]];
  const RAYS = [[-124, 0.95, 0.5], [-58, 0.8, 0.3], [9, 1.25, 0.6], [168, 0.8, 0.55], [-96, 0.65, 0.4], [38, 0.6, 0.4], [124, 0.55, 0.35], [-150, 0.75, 0.5]];

  function hexToRgb(hex, fallback) {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!match) return fallback;
    const value = parseInt(match[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(alpha)})`;
  const mix = (a, b, t) => [0, 1, 2].map((index) => Math.round(a[index] + (b[index] - a[index]) * clamp(t)));
  const tint = (rgb, factor) => rgb.map((channel) => Math.round(channel * factor));

  const soft = document.createElement("canvas");
  const softContext = soft.getContext("2d");
  const coneCanvas = document.createElement("canvas");
  const coneContext = coneCanvas.getContext("2d");

  function state(time) {
    const value = {};
    Object.entries(T).forEach(([key, fn]) => { value[key] = fn(time); });
    return value;
  }

  // settings: lightColor, beamColor, poolColor, backgroundColor, brightness (%), sourceX (% of U),
  // sourceTop (% of U, raises the final source), floorY (% of U), rayCount, beamWidth (%), poolWidth (%)
  function renderFrame(ctx, width, height, refTime, settings = {}, phaseGain = 1) {
    // U sizes the light (calibrated at 1920×1080, where U = 1080); V places it vertically, so a
    // tall canvas stretches the beam from the source down to the floor instead of shrinking it.
    const U = Math.min(height, width);
    const V = Math.min(height, U * 1.6);
    const cx = width / 2 + (Number(settings.sourceX) || 0) / 100 * U;
    const top = (height - V) / 2;
    const light = hexToRgb(settings.lightColor, [234, 238, 255]);
    const beamRgb = hexToRgb(settings.beamColor, [186, 188, 240]);
    const poolRgb = hexToRgb(settings.poolColor, [226, 196, 236]);
    const haloRgb = [193, 206, 255];
    const gain = clamp((Number(settings.brightness ?? 100)) / 100 * phaseGain, 0, 3);
    const rise = (Number(settings.sourceTop) || 0) / 100;
    const floorShift = (Number(settings.floorY) || 0) / 100;
    const beamScale = (Number(settings.beamWidth) || 100) / 100;
    const poolScale = (Number(settings.poolWidth) || 100) / 100;
    const rayCount = Math.max(0, Math.min(RAYS.length, Math.round(Number(settings.rayCount ?? 6))));
    const s = state(refTime);
    const riseNow = rise * smooth(clamp((refTime - 2600) / 3400));

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = settings.backgroundColor || "#010002";
    ctx.fillRect(0, 0, width, height);

    const scale = 0.5;
    soft.width = Math.max(2, Math.round(width * scale));
    soft.height = Math.max(2, Math.round(height * scale));
    const sc = softContext;
    sc.setTransform(scale, 0, 0, scale, 0, 0);
    sc.clearRect(0, 0, width, height);
    sc.globalCompositeOperation = "lighter";

    const orbY = top + s.orbY * V;
    const srcY = top + (s.srcY - riseNow) * V;

    // 1. Orb: measured radial profile, white core shading to blue-grey haze.
    if (s.orbI > 0.001) {
      const radius = 2 * U * Math.max(0.02, s.orbS);
      const glow = sc.createRadialGradient(cx, orbY, 0, cx, orbY, radius);
      ORB.forEach(([r, v]) => {
        const at = r / 2;
        const color = mix([255, 255, 255], haloRgb, smooth(clamp((r - 0.07) / 0.35)));
        glow.addColorStop(at, rgba(mix(color, light, 0.15), v * s.orbI * gain));
      });
      sc.fillStyle = glow;
      sc.fillRect(0, 0, width, height);
      if (s.flareDisc > 0.001) {
        const disc = sc.createRadialGradient(cx, orbY, 0.1 * U, cx, orbY, 0.66 * U);
        disc.addColorStop(0, rgba(haloRgb, 0.08 * s.flareDisc * gain));
        disc.addColorStop(0.85, rgba(haloRgb, 0.06 * s.flareDisc * gain));
        disc.addColorStop(1, rgba(haloRgb, 0));
        sc.fillStyle = disc;
        sc.fillRect(0, 0, width, height);
      }
      // Lens ghost circle and blue bloom at the bottom edge.
      if (s.ghost > 0.001) {
        sc.strokeStyle = rgba([175, 190, 225], 0.1 * s.ghost * gain);
        sc.lineWidth = 0.012 * U;
        sc.beginPath(); sc.arc(cx, top + 0.81 * V, 0.075 * U, 0, Math.PI * 2); sc.stroke();
        const blue = sc.createRadialGradient(cx, top + V, 0, cx, top + V, 0.2 * U);
        blue.addColorStop(0, rgba([60, 100, 210], 0.6 * s.ghost * gain));
        blue.addColorStop(1, "rgba(60,100,210,0)");
        sc.fillStyle = blue;
        sc.fillRect(cx - 0.25 * U, top + V - 0.25 * U, 0.5 * U, 0.4 * U);
      }
    }
    if (s.spark > 0.001) {
      const spark = sc.createRadialGradient(cx, orbY, 0, cx, orbY, 0.06 * U);
      spark.addColorStop(0, rgba([255, 255, 255], s.spark * gain));
      spark.addColorStop(1, rgba(light, 0));
      sc.fillStyle = spark;
      sc.beginPath(); sc.arc(cx, orbY, 0.06 * U, 0, Math.PI * 2); sc.fill();
    }

    // 2. Soft starburst rays.
    if (s.rays > 0.001 && rayCount) {
      const turn = refTime / 1000 * 1.6 + (Number(settings.rotation) || 0);
      RAYS.slice(0, rayCount).forEach(([angle, length, strength]) => {
        const a = (angle + turn) * Math.PI / 180;
        const len = length * U;
        const grad = sc.createLinearGradient(cx, orbY, cx + Math.cos(a) * len, orbY + Math.sin(a) * len);
        grad.addColorStop(0, rgba(light, 0));
        grad.addColorStop(0.15, rgba(haloRgb, 0.12 * strength * s.rays * gain));
        grad.addColorStop(0.55, rgba(haloRgb, 0.045 * strength * s.rays * gain));
        grad.addColorStop(1, rgba(light, 0));
        sc.fillStyle = grad;
        const w = 0.07 * U;
        sc.beginPath();
        sc.moveTo(cx + Math.cos(a + Math.PI / 2) * w, orbY + Math.sin(a + Math.PI / 2) * w);
        sc.lineTo(cx + Math.cos(a) * len, orbY + Math.sin(a) * len);
        sc.lineTo(cx + Math.cos(a - Math.PI / 2) * w, orbY + Math.sin(a - Math.PI / 2) * w);
        sc.closePath(); sc.fill();
      });
    }

    // 3. Faint iridescent lens ring while the cone forms.
    if (s.ring > 0.001) {
      const ring = sc.createRadialGradient(cx, srcY, 0.4 * U, cx, srcY, 0.7 * U);
      ring.addColorStop(0, "rgba(0,0,0,0)");
      ring.addColorStop(0.3, rgba([95, 62, 52], 0.2 * s.ring * gain));
      ring.addColorStop(0.55, rgba([62, 70, 100], 0.15 * s.ring * gain));
      ring.addColorStop(0.8, rgba([45, 50, 70], 0.05 * s.ring * gain));
      ring.addColorStop(1, "rgba(0,0,0,0)");
      sc.fillStyle = ring;
      sc.fillRect(0, 0, width, height);
    }

    // 4. Cone / beam: angular Gaussian (conic gradient) × axial falloff (radial gradient), from a
    // virtual apex placed so the beam already has width bw at the source.
    const endY = top + (s.beamEnd - riseNow) * V;
    if (s.cone > 0.001) {
      coneCanvas.width = soft.width; coneCanvas.height = soft.height;
      const cc = coneContext;
      cc.setTransform(scale, 0, 0, scale, 0, 0);
      cc.globalCompositeOperation = "source-over";
      cc.clearRect(0, 0, width, height);
      const halfDeg = Math.max(0.05, s.half);
      const theta = halfDeg * Math.PI / 180;
      const bw = s.bw * beamScale * U;
      const k = bw / 2 / Math.tan(theta);
      const apexY = srcY - k;
      const length = Math.max(1, Math.min(endY, top + 1.25 * V) - srcY);
      const sigma = theta / 1.03; // 35% brightness at the measured edge with the super-Gaussian profile
      const conic = cc.createConicGradient(0, cx, apexY);
      const down = 0.25; // conic angle 0 = +x; down = π/2 → 0.25 of a turn
      const steps = [0, 0.4, 0.7, 0.9, 1.05, 1.2, 1.4, 1.7, 2.1];
      const color = mix(beamRgb, [255, 255, 255], clamp((halfDeg - 3) / 30) * 0.45);
      const pieces = [];
      steps.forEach((n) => { const off = n * sigma / (Math.PI * 2); const a = Math.exp(-(n ** 4)); pieces.push([down - off, a], [down + off, a]); });
      pieces.push([down - 2.6 * sigma / (Math.PI * 2), 0], [down + 2.6 * sigma / (Math.PI * 2), 0]);
      pieces.sort((a, b) => a[0] - b[0]);
      let last = -1;
      pieces.forEach(([at, a]) => { const p = clamp(at, 0, 1); if (p > last) { conic.addColorStop(p, rgba(color, a)); last = p; } });
      cc.fillStyle = conic;
      cc.fillRect(0, 0, width, height);
      cc.globalCompositeOperation = "destination-in";
      const axial = cc.createRadialGradient(cx, apexY, Math.max(0, k), cx, apexY, k + length * 1.15);
      axial.addColorStop(0, "rgba(0,0,0,1)");
      axial.addColorStop(0.1, "rgba(0,0,0,0.88)");
      axial.addColorStop(0.45, "rgba(0,0,0,0.6)");
      axial.addColorStop(0.75, "rgba(0,0,0,0.32)");
      axial.addColorStop(1, "rgba(0,0,0,0)");
      cc.fillStyle = axial;
      cc.fillRect(0, 0, width, height);
      cc.clearRect(0, 0, width, Math.max(0, srcY - 0.002 * U));
      // The wide cone is near-white close to the apex: stack a second pass while it is wide.
      const passes = s.cone * gain * (1 + 0.2 * clamp((halfDeg - 4) / 20));
      sc.globalAlpha = clamp(passes);
      sc.drawImage(coneCanvas, 0, 0, width, height);
      if (passes > 1) { sc.globalAlpha = clamp(passes - 1); sc.drawImage(coneCanvas, 0, 0, width, height); }
      sc.globalAlpha = 1;
      // Soft blue haze around the cone and source.
      if (s.haze > 0.001) {
        const haze = sc.createRadialGradient(cx, srcY + length * 0.35, 0, cx, srcY + length * 0.35, Math.max(0.15 * U, length * 0.7));
        haze.addColorStop(0, rgba(beamRgb, 0.07 * s.haze * gain));
        haze.addColorStop(1, rgba(beamRgb, 0));
        sc.fillStyle = haze;
        sc.fillRect(0, 0, width, height);
      }
    }

    ctx.globalCompositeOperation = "lighter";
    ctx.filter = `blur(${Math.max(0.5, U * 0.008)}px)`;
    ctx.drawImage(soft, 0, 0, width, height);
    ctx.filter = "none";

    // Sharp layer: the source point.
    if (s.dot > 0.001 && s.cone > 0.001) {
      const rx = 0.016 * U * s.dot;
      const ry = 0.0088 * U * s.dot;
      const glow = ctx.createRadialGradient(cx, srcY, 0, cx, srcY, rx * 1.9);
      glow.addColorStop(0, rgba([255, 255, 255], 0.55 * s.cone * gain));
      glow.addColorStop(0.5, rgba(light, 0.2 * s.cone * gain));
      glow.addColorStop(1, rgba(light, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, srcY, rx * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], s.cone * gain);
      ctx.beginPath(); ctx.ellipse(cx, srcY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Floor arc: brightness along the arc is Gaussian with 50% at ±hw; two parallel rims.
    if (s.poolI > 0.001) {
      const R = 0.39 * U;
      const topY = top + (s.poolY + floorShift) * V;
      const cy = topY + R;
      const hw = s.poolHW * 1.12 * poolScale * U;
      const sigma = hw / 0.833;
      const span = Math.min(Math.PI / 2, (sigma * 4) / R);
      const angSigma = sigma / R;
      // Brightness along the arc: Gaussian in angle around the top (−90°), white-tinted at the centre.
      const conicFor = (strength, y) => {
        const g = ctx.createConicGradient(-Math.PI / 2, cx, y);
        const stops = [];
        for (let n = 0; n <= 4; n += 0.25) {
          const off = n * angSigma / (Math.PI * 2);
          const a = Math.exp(-0.5 * n * n) * strength * s.poolI * gain;
          const c = mix(poolRgb, [255, 255, 255], 0.25 * Math.exp(-0.5 * (n / 0.6) ** 2));
          stops.push([off, rgba(c, a)], [1 - off, rgba(c, a)]);
        }
        stops.sort((p, q) => p[0] - q[0]);
        let last = -1;
        stops.forEach(([at, color]) => { const pos = clamp(at, 0, 1); if (pos > last) { g.addColorStop(pos, color); last = pos; } });
        return g;
      };
      ctx.lineCap = "butt";
      [[0, 0.0065, 1], [0, 0.0035, 0.5], [0.011, 0.0035, 0.42], [0, 0.03, 0.24]].forEach(([drop, lineWidth, strength]) => {
        const y = cy + drop * U;
        ctx.lineWidth = Math.max(0.8, lineWidth * U);
        ctx.strokeStyle = conicFor(strength, y);
        ctx.beginPath(); ctx.arc(cx, y, R, -Math.PI / 2 - span, -Math.PI / 2 + span); ctx.stroke();
      });
      // Reflection dash under the arc and a faint blue under-glow.
      ctx.fillStyle = rgba(mix(poolRgb, [255, 255, 255], 0.4), 0.5 * s.poolI * gain);
      ctx.beginPath(); ctx.ellipse(cx, topY + 0.03 * U, hw * 0.35, Math.max(0.5, 0.0035 * U), 0, 0, Math.PI * 2); ctx.fill();
      const under = ctx.createRadialGradient(cx, topY + 0.09 * U, 0, cx, topY + 0.09 * U, 0.12 * U);
      under.addColorStop(0, rgba([30, 30, 90], 0.1 * s.poolI * gain));
      under.addColorStop(1, "rgba(40,40,120,0)");
      ctx.fillStyle = under;
      ctx.fillRect(cx - 0.15 * U, topY, 0.3 * U, 0.25 * U);
    }
    ctx.restore();
  }

  window.SpotlightRenderer = Object.freeze({ REF_DURATION, renderFrame, state });
})();
