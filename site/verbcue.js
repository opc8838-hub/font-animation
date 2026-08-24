(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, smoother, graphemes, seeded, formatSeconds } = FX;

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function sceneLen() { return Number($("#sceneDuration").value) / 1000 / speed(); }
  function cycleLength() { return sceneLen() * 5; }
  function fontPx(w, h) { return Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100); }

  function drawCentered(ctx, text, color, size, x, y) {
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${size}px "Continuation Inter", "Continuation SC", sans-serif`;
    ctx.fillText(text, x, y);
  }

  function drawBin(ctx, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, size * 0.06);
    ctx.fillStyle = "rgba(230,230,230,0.95)";
    ctx.beginPath();
    ctx.moveTo(-size * 0.32, -size * 0.08);
    ctx.lineTo(-size * 0.26, size * 0.42);
    ctx.lineTo(size * 0.26, size * 0.42);
    ctx.lineTo(size * 0.32, -size * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d8d8d8";
    ctx.fillRect(-size * 0.38, -size * 0.16, size * 0.76, size * 0.1);
    const bits = ["#34c759", "#0a84ff", "#ff9f0a", "#bf5af2"];
    bits.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(-size * 0.18 + i * size * 0.1, -size * 0.02, size * 0.08, size * 0.1);
    });
    ctx.restore();
  }

  function drawScatter(ctx, text, color, size, progress) {
    const chars = graphemes(text);
    ctx.font = `700 ${size}px "Continuation Inter", "Continuation SC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    const widths = chars.map((g) => ctx.measureText(g).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let cursor = -total / 2;
    chars.forEach((glyph, i) => {
      const fly = easeOutCubic(clamp01((progress - i * 0.04) / 0.72));
      const x = cursor + widths[i] / 2 + (seeded(i + 2) - 0.5) * size * 1.8 * (1 - fly);
      const y = (seeded(i + 9) - 0.5) * size * 1.4 * (1 - fly);
      const rot = (seeded(i + 4) - 0.5) * 0.8 * (1 - fly);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillText(glyph, 0, 0);
      ctx.restore();
      cursor += widths[i];
    });
  }

  function drawPixel(ctx, text, color, size, progress, w) {
    const off = document.createElement("canvas");
    const pad = Math.ceil(size * 0.4);
    off.width = Math.ceil(w);
    off.height = Math.ceil(size * 2);
    const octx = off.getContext("2d");
    octx.font = `700 ${size}px "Continuation Inter", "Continuation SC", sans-serif`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = color;
    octx.fillText(text, off.width / 2, off.height / 2);
    const wipe = clamp01(progress);
    const block = Math.max(4, Math.round(size * 0.16));
    const split = off.width * wipe;
    ctx.drawImage(off, 0, 0, split, off.height, -off.width / 2, -off.height / 2, split, off.height);
    for (let y = 0; y < off.height; y += block) {
      for (let x = split; x < off.width; x += block) {
        const sample = octx.getImageData(Math.min(off.width - 1, x + block / 2), Math.min(off.height - 1, y + block / 2), 1, 1).data;
        if (sample[3] < 20) continue;
        ctx.fillStyle = `rgba(${sample[0]},${sample[1]},${sample[2]},${sample[3] / 255})`;
        ctx.fillRect(-off.width / 2 + x, -off.height / 2 + y, block - 1, block - 1);
      }
    }
  }

  function drawSplit(ctx, text, color, size, progress) {
    const parts = text.trim().split(/\s+/);
    const left = parts[0] || text;
    const right = parts.slice(1).join(" ") || "";
    const open = 1 - smoother(progress);
    ctx.font = `700 ${size}px "Continuation Inter", "Continuation SC", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const gap = size * 0.9 * open;
    ctx.fillText(left, -ctx.measureText(right).width / 2 - gap / 2, 0);
    if (right) ctx.fillText(right, ctx.measureText(left).width / 2 + gap / 2, 0);
  }

  FX.create({
    filePrefix: "verbcue",
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
      const index = Math.min(4, Math.floor(local / len));
      const p = clamp01((local - index * len) / len);
      const size = fontPx(w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (index === 0) drawBin(ctx, size * 1.6, Math.min(1, p * 4) * (p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1));
      else if (index === 1) drawScatter(ctx, $("#scatterText").value || "Move it.", $("#scatterColor").value, size, p);
      else if (index === 2) drawPixel(ctx, $("#pixelText").value || "Upscale it.", $("#pixelColor").value, size, p, w * 0.9);
      else if (index === 3) drawSplit(ctx, $("#splitText").value || "Share it.", $("#splitColor").value, size, p);
      else drawCentered(ctx, $("#holdText").value || "Get it for $12.99/mo.", $("#holdColor").value, size * 0.72, 0, 0);
      ctx.restore();
    }
  });
})();
