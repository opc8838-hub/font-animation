(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, smoother, graphemes, formatSeconds } = FX;

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function sceneLen() { return Number($("#sceneDuration").value) / 1000 / speed(); }
  function cycleLength() { return sceneLen() * 4; }

  function applyFont(ctx, size) {
    ctx.font = `700 ${size}px "Continuation Inter", "Continuation SC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  function drawMelt(ctx, text, color, size, p) {
    const chars = graphemes(text);
    applyFont(ctx, size);
    const widths = chars.map((g) => ctx.measureText(g).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let cursor = -total / 2;
    chars.forEach((glyph, i) => {
      const wave = Math.sin(p * 6 + i * 0.7) * size * 0.12 * p;
      const squash = 1 + p * 0.35;
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 1 - p * 0.15;
      ctx.translate(cursor + widths[i] / 2, wave);
      ctx.scale(1, squash);
      ctx.fillText(glyph, 0, 0);
      ctx.restore();
      if (p > 0.35) {
        ctx.save();
        ctx.globalAlpha = (p - 0.35) * 0.45;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cursor + widths[i] / 2, size * 0.42 + i * 2, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      cursor += widths[i];
    });
  }

  function drawGrid(ctx, text, color, size, p) {
    const chars = graphemes(text.replace(/\s/g, ""));
    const cells = Math.max(4, chars.length);
    const cell = size * 0.95;
    const width = cells * cell;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < cells; i += 1) {
      ctx.strokeRect(-width / 2 + i * cell, -cell / 2, cell, cell);
    }
    applyFont(ctx, size * 0.62);
    ctx.fillStyle = color;
    chars.forEach((glyph, i) => {
      const appear = easeOutCubic(clamp01((p - i / cells) / 0.35));
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      ctx.fillText(glyph, -width / 2 + i * cell + cell / 2, 0);
    });
    ctx.restore();
  }

  function drawSelect(ctx, text, color, size, p) {
    applyFont(ctx, size);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.fillText(text, size * 0.06, size * 0.05);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.fillText(text, 0, 0);
    const w = ctx.measureText(text).width;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + 0.6 * Math.sin(p * Math.PI);
    ctx.strokeRect(-w / 2 - 10, -size * 0.55, w + 20, size * 1.1);
  }

  FX.create({
    filePrefix: "promptcue",
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
      const p = clamp01((local - index * len) / len);
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (index === 0) drawMelt(ctx, $("#meltText").value || "Prompt it.", $("#meltColor").value, size, p);
      else if (index === 1) drawGrid(ctx, $("#gridText").value || "Perform it.", $("#gridColor").value, size, p);
      else if (index === 2) {
        applyFont(ctx, size);
        ctx.globalAlpha = smoother(Math.min(1, p * 3));
        ctx.fillStyle = $("#loopColor").value;
        ctx.fillText($("#loopText").value || "Loop it.", 0, 0);
      } else drawSelect(ctx, $("#selectText").value || "Select it.", $("#selectColor").value, size, p);
      ctx.restore();
    }
  });
})();
