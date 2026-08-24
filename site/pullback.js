(() => {
  "use strict";
  const { $, clamp01, lerp, easeInOut, formatSeconds } = FX;

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (Number($("#zoomDuration").value) / 1000 + Number($("#holdDuration").value) / 1000) / speed();
  }

  FX.create({
    filePrefix: "pullback",
    cycleLength,
    updateOutputs() {
      $("#startScaleOut").textContent = `${$("#startScale").value}%`;
      $("#endScaleOut").textContent = `${$("#endScale").value}%`;
      $("#zoomOut").textContent = formatSeconds(Number($("#zoomDuration").value) / 1000);
      $("#holdOut").textContent = formatSeconds(Number($("#holdDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const s = speed();
      const zoom = Number($("#zoomDuration").value) / 1000 / s;
      const local = FX.mod(time, cycleLength());
      const p = easeInOut(clamp01(local / Math.max(0.0001, zoom)));
      const scale = lerp(Number($("#startScale").value) / 100, Number($("#endScale").value) / 100, p);
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      const text = $("#titleText").value || "精彩继续";
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = $("#textColor").value;
      ctx.font = `700 ${size}px "Continuation SC", "Continuation Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  });
})();
