(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, formatSeconds } = FX;
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function words() {
    const parts = ($("#titleText").value || "写稿 试讲 上线 再改").trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts : ["写稿"];
  }
  function cycleLength() {
    const n = words().length;
    return (10 / 30 + Math.max(0, n - 1) * Number($("#pushDuration").value) / 1000 + 1.1) / speed();
  }
  FX.create({
    filePrefix: "textbuild",
    cycleLength,
    updateOutputs() {
      $("#pushOut").textContent = formatSeconds(Number($("#pushDuration").value) / 1000);
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
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = $("#textColor").value;
      const axis = $("#axis").value;
      const push = Number($("#pushDuration").value) / 1000 / speed();
      const first = 10 / 30 / speed();
      const t = FX.mod(time, cycleLength());
      const space = size * 0.28;
      const widths = list.map((word) => ctx.measureText(word).width);
      const count = list.map((_, i) => {
        if (i === 0) return easeOutCubic(clamp01(t / first));
        return easeOutCubic(clamp01((t - first - (i - 1) * push) / push));
      });
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (axis === "y") {
        const shown = count.reduce((a, b) => a + b, 0);
        const height = (list.length - 1) * (size + space);
        list.forEach((word, i) => {
          if (count[i] <= 0.01) return;
          const y = lerp(-height / 2, -height / 2 + i * (size + space), count[i]);
          ctx.globalAlpha = count[i];
          ctx.fillText(word, 0, y);
        });
      } else {
        let used = 0;
        for (let i = 0; i < list.length; i += 1) used += (widths[i] + (i ? space : 0)) * count[i];
        let x = -used / 2;
        list.forEach((word, i) => {
          if (count[i] <= 0.01) return;
          const ww = widths[i];
          const from = x + ww + 88 * (size / 72);
          const to = x + ww / 2;
          ctx.globalAlpha = count[i];
          ctx.fillText(word, lerp(from, to, count[i]), 0);
          x += (ww + space) * count[i];
        });
      }
      ctx.restore();
    }
  });
})();
