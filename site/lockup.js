(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, formatSeconds } = FX;

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function sceneLen() { return Number($("#sceneDuration").value) / 1000 / speed(); }
  function cycleLength() { return sceneLen() * 4; }

  function drawPhone(ctx, size) {
    ctx.save();
    ctx.fillStyle = "#d8d8dc";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(-size * 0.18, -size * 0.7, size * 0.36, size * 1.4, size * 0.12);
    else ctx.rect(-size * 0.18, -size * 0.7, size * 0.36, size * 1.4);
    ctx.fill();
    ctx.fillStyle = "#c5c5c8";
    ctx.fillRect(-size * 0.06, -size * 0.18, size * 0.07, size * 0.16);
    ctx.fillRect(-size * 0.06, 0.04 * size, size * 0.07, size * 0.16);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(-size * 0.02, -size * 0.42, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFiveG(ctx, size, color, t) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px "Continuation Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText($("#midText").value || "5G", 0, 0);
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    const pulse = 0.55 + 0.45 * Math.sin(t * 8);
    for (let i = 0; i < 3; i += 1) {
      ctx.globalAlpha = pulse * (1 - i * 0.22);
      ctx.lineWidth = size * 0.06;
      ctx.beginPath();
      ctx.moveTo(-size * 0.72 - i * size * 0.12, -size * 0.28);
      ctx.lineTo(-size * 0.58 - i * size * 0.12, 0);
      ctx.lineTo(-size * 0.72 - i * size * 0.12, size * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.72 + i * size * 0.12, -size * 0.28);
      ctx.lineTo(size * 0.58 + i * size * 0.12, 0);
      ctx.lineTo(size * 0.72 + i * size * 0.12, size * 0.28);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlug(ctx, size) {
    ctx.save();
    ctx.fillStyle = "#efefef";
    ctx.fillRect(-size * 0.16, -size * 0.28, size * 0.32, size * 0.36);
    ctx.fillStyle = "#d0d0d0";
    ctx.fillRect(-size * 0.07, -size * 0.02, size * 0.14, size * 0.7);
    ctx.fillStyle = "#111";
    ctx.fillRect(-size * 0.09, -size * 0.2, size * 0.18, size * 0.08);
    ctx.restore();
  }

  function drawFace(ctx, size) {
    ctx.save();
    ctx.strokeStyle = "#7eb6ff";
    ctx.lineWidth = size * 0.06;
    ctx.lineCap = "round";
    const r = size * 0.34;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx * r, sy * r * 0.35);
      ctx.lineTo(sx * r, sy * r);
      ctx.lineTo(sx * r * 0.35, sy * r);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.05, r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.05, r * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#7eb6ff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.22, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  function pair(ctx, left, right, size, color, midDraw) {
    ctx.font = `700 ${size}px "Continuation SC", "Continuation Inter", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const gap = size * 1.35;
    ctx.fillText(left, -gap, 0);
    ctx.fillText(right, gap, 0);
    midDraw();
  }

  FX.create({
    filePrefix: "lockup",
    cycleLength,
    updateOutputs() {
      $("#sceneOut").textContent = formatSeconds(Number($("#sceneDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const len = sceneLen();
      const local = FX.mod(time, cycleLength());
      const index = Math.min(3, Math.floor(local / len));
      const p = easeOutCubic(clamp01((local - index * len) / 0.35));
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      const color = $("#textColor").value;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.globalAlpha = p;
      ctx.scale(lerp(0.92, 1, p), lerp(0.92, 1, p));
      if (index === 0) pair(ctx, $("#aL").value, $("#aR").value, size, color, () => drawPhone(ctx, size * 0.85));
      else if (index === 1) drawFiveG(ctx, size * 1.35, $("#accentColor").value, local);
      else if (index === 2) pair(ctx, $("#bL").value, $("#bR").value, size, color, () => drawPlug(ctx, size));
      else pair(ctx, $("#cL").value, $("#cR").value, size, color, () => drawFace(ctx, size));
      ctx.restore();
    }
  });
})();
