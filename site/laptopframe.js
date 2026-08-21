(() => {
  "use strict";
  const { $, clamp01, lerp, easeInOut, formatSeconds, loadImages } = FX;
  const screen = loadImages(["assets/beforeafter-before.jpg"])[0];
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (Number($("#openDuration").value) + Number($("#diveDuration").value) + 1100) / 1000 / speed();
  }
  FX.create({
    filePrefix: "laptopframe",
    cycleLength,
    updateOutputs() {
      $("#openOut").textContent = formatSeconds(Number($("#openDuration").value) / 1000);
      $("#diveOut").textContent = formatSeconds(Number($("#diveDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const t = FX.mod(time, cycleLength());
      const openT = Number($("#openDuration").value) / 1000 / speed();
      const hold = 0.55 / speed();
      const diveT = Number($("#diveDuration").value) / 1000 / speed();
      const open = easeInOut(clamp01(t / openT));
      const dive = easeInOut(clamp01((t - openT - hold) / diveT));
      const lid = lerp(0.08, 1, open);
      const zoom = lerp(1, 2.6, dive);
      const note = $("#noteText").value || "稿子已导出";
      const size = Math.max(14, Math.min(w, h) * Number($("#fontSize").value) / 100);
      const bodyW = Math.min(w * 0.72, h * 0.85);
      const bodyH = bodyW * 0.62;
      ctx.save();
      ctx.translate(w / 2, h * 0.54);
      ctx.scale(zoom, zoom);
      ctx.fillStyle = "#2a2a2c";
      ctx.fillRect(-bodyW / 2, bodyH * 0.32, bodyW, bodyH * 0.08);
      ctx.save();
      ctx.translate(0, bodyH * 0.32);
      ctx.scale(1, lid);
      ctx.translate(0, -bodyH * 0.58);
      ctx.fillStyle = "#1c1c1e";
      ctx.fillRect(-bodyW * 0.46, -bodyH * 0.42, bodyW * 0.92, bodyH * 0.62);
      ctx.fillStyle = "#111";
      ctx.fillRect(-bodyW * 0.42, -bodyH * 0.36, bodyW * 0.84, bodyH * 0.5);
      if (screen.complete && screen.naturalWidth && lid > 0.4) {
        ctx.globalAlpha = clamp01((lid - 0.4) / 0.4);
        ctx.drawImage(screen, -bodyW * 0.42, -bodyH * 0.36, bodyW * 0.84, bodyH * 0.5);
        ctx.globalAlpha = 1;
      }
      if (t > openT * 0.7 && t < openT + hold + 0.3) {
        FX.applyFont(ctx, $("#fontFamily").value, size * 0.55);
        ctx.fillStyle = "rgba(20,20,22,0.92)";
        ctx.fillRect(-bodyW * 0.22, -bodyH * 0.42, bodyW * 0.44, size * 0.9);
        ctx.fillStyle = $("#textColor").value;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(note, 0, -bodyH * 0.42 + size * 0.45);
      }
      ctx.restore();
      ctx.restore();
    }
  });
})();
