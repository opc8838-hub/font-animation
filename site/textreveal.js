(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, easeInOut, formatSeconds } = FX;
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function words() {
    const parts = ($("#titleText").value || "看见真实账单").trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return parts;
    return FX.graphemes(parts[0] || "看见");
  }
  function cycleLength() {
    return (6 + 12) / 30 / speed() + Number($("#recedeDuration").value) / 1000 / speed() + Number($("#assembleDuration").value) / 1000 / speed() + 0.8;
  }
  FX.create({
    filePrefix: "textreveal",
    cycleLength,
    updateOutputs() {
      $("#leadOut").textContent = `${(Number($("#initialScale").value) / 100).toFixed(2)}×`;
      $("#recedeOut").textContent = formatSeconds(Number($("#recedeDuration").value) / 1000);
      $("#assembleOut").textContent = formatSeconds(Number($("#assembleDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const list = words();
      const size = Math.max(20, Math.min(w, h) * Number($("#fontSize").value) / 100);
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      const space = list[0].length === 1 && list.join("").length === list.length ? 0 : ctx.measureText(" ").width;
      const widths = list.map((word) => ctx.measureText(word).width);
      const total = widths.reduce((a, b) => a + b, 0) + space * Math.max(0, list.length - 1);
      const t = FX.mod(time, cycleLength());
      const intro = 6 / 30 / speed();
      const hold = 12 / 30 / speed();
      const recede = Number($("#recedeDuration").value) / 1000 / speed();
      const assemble = Number($("#assembleDuration").value) / 1000 / speed();
      const leadScale = Number($("#initialScale").value) / 100;
      const recedeP = easeInOut(clamp01((t - intro - hold) / Math.max(0.0001, recede)));
      const scale = lerp(leadScale, 1, recedeP);
      const fade = clamp01(t / intro);
      ctx.save();
      ctx.translate(w / 2, h / 2 + size * 0.32);
      ctx.scale(Math.min(1, (w * 0.86) / (total * scale)), Math.min(1, (w * 0.86) / (total * scale)));
      const assembleP = easeOutCubic(clamp01((t - intro - hold) / Math.max(0.0001, assemble)));
      const shift = lerp(0, -total / 2 + widths[0] / 2, assembleP);
      ctx.translate(shift, 0);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.globalAlpha = fade;
      ctx.fillStyle = $("#textColor").value;
      ctx.fillText(list[0], -widths[0] / 2, 0);
      ctx.restore();
      if (t > intro + hold + 7 / 30 / speed()) {
        let x = widths[0] / 2 + space;
        for (let i = 1; i < list.length; i += 1) {
          const start = (i - 1) * (4 / 30 / speed());
          const p = easeOutCubic(clamp01((t - intro - hold - 7 / 30 / speed() - start) / (14 / 30 / speed())));
          if (p <= 0) break;
          ctx.globalAlpha = fade * p;
          ctx.fillStyle = $("#textColor").value;
          ctx.fillText(list[i], lerp(x + size * 0.5, x, p), 0);
          x += widths[i] + space;
        }
      }
      ctx.restore();
    }
  });
})();
