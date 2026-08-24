(() => {
  "use strict";
  const { $, clamp01, lerp, smoother, formatSeconds } = FX;

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (0.4 + Number($("#closeDuration").value) / 1000 + Number($("#tintDuration").value) / 1000 + 1.2) / speed();
  }

  FX.create({
    filePrefix: "tighten",
    cycleLength,
    updateOutputs() {
      $("#openTrackOut").textContent = $("#openTrack").value;
      $("#closeTrackOut").textContent = $("#closeTrack").value;
      $("#closeOut").textContent = formatSeconds(Number($("#closeDuration").value) / 1000);
      $("#tintOut").textContent = formatSeconds(Number($("#tintDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const s = speed();
      const intro = 0.4 / s;
      const close = Number($("#closeDuration").value) / 1000 / s;
      const tint = Number($("#tintDuration").value) / 1000 / s;
      const local = FX.mod(time, cycleLength());
      const closeP = smoother(clamp01((local - intro) / Math.max(0.0001, close)));
      const tintP = smoother(clamp01((local - intro - close) / Math.max(0.0001, tint)));
      const tracking = lerp(Number($("#openTrack").value), Number($("#closeTrack").value), closeP);
      const words = ($("#titleText").value || "A19 芯片 持久 飙实力").trim().split(/\s+/);
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      ctx.font = `600 ${size}px "Continuation SC", "Continuation Inter", sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = FX.mixHex($("#textColor").value, $("#accentColor").value, tintP);
      const space = tracking * (size / 40);
      const widths = words.map((word) => ctx.measureText(word).width);
      const total = widths.reduce((a, b) => a + b, 0) + space * Math.max(0, words.length - 1);
      const fit = Math.min(1, (w * 0.86) / Math.max(1, total));
      let x = -total * fit / 2;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(fit, fit);
      words.forEach((word, i) => {
        ctx.fillText(word, x, 0);
        x += widths[i] + space;
      });
      ctx.restore();
    }
  });
})();
