(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, formatSeconds } = FX;
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (Number($("#exitDuration").value) + Number($("#enterDuration").value) + 800) / 1000 / speed();
  }
  FX.create({
    filePrefix: "textswap",
    cycleLength,
    updateOutputs() {
      $("#exitOut").textContent = formatSeconds(Number($("#exitDuration").value) / 1000);
      $("#enterOut").textContent = formatSeconds(Number($("#enterDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const size = Math.max(20, Math.min(w, h) * Number($("#fontSize").value) / 100);
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const t = FX.mod(time, cycleLength());
      const hold = 0.45 / speed();
      const exitT = Number($("#exitDuration").value) / 1000 / speed();
      const enterT = Number($("#enterDuration").value) / 1000 / speed();
      const from = $("#fromText").value || "手工对账到半夜";
      const to = $("#toText").value || "一键出表就下班";
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (t < hold) {
        ctx.fillStyle = $("#textColor").value;
        ctx.fillText(from, 0, 0);
      } else if (t < hold + exitT) {
        const p = clamp01((t - hold) / exitT);
        const travel = easeOutCubic(p);
        const scale = 1 / Math.max(0.08, 1 - travel * 0.91);
        ctx.save();
        ctx.scale(scale, scale);
        ctx.globalAlpha = p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28;
        ctx.fillStyle = $("#textColor").value;
        ctx.fillText(from, 0, 0);
        ctx.restore();
      } else {
        const p = clamp01((t - hold - exitT) / enterT);
        const scale = lerp(1.8, 1, easeOutCubic(p));
        ctx.save();
        ctx.scale(scale, scale);
        ctx.globalAlpha = clamp01(p * 1.4);
        ctx.fillStyle = $("#textColor").value;
        ctx.fillText(to, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }
  });
})();
