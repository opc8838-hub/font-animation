(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, formatSeconds, loadImages } = FX;
  const screen = loadImages(["assets/beforeafter-after.jpg"])[0];
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() { return Number($("#tiltDuration").value) / 1000 / speed() + 1.8; }
  FX.create({
    filePrefix: "phoneframe",
    cycleLength,
    updateOutputs() {
      $("#tiltOut").textContent = formatSeconds(Number($("#tiltDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const t = FX.mod(time, cycleLength());
      const tiltT = Number($("#tiltDuration").value) / 1000 / speed();
      const p = easeOutCubic(clamp01(t / tiltT));
      const rotY = lerp(0.7, 0.08, p);
      const rotX = lerp(0.18, 0.04, p);
      const phoneH = Math.min(h * 0.62, w * 0.85);
      const phoneW = phoneH * 0.49;
      const size = Math.max(16, Math.min(w, h) * Number($("#fontSize").value) / 100);
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.fillStyle = $("#textColor").value;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = p;
      ctx.fillText($("#titleText").value || "把产品放进手机里", w / 2, h * 0.12);
      ctx.save();
      ctx.translate(w / 2, h * 0.56);
      ctx.transform(Math.cos(rotY), Math.sin(rotX) * 0.25, 0, Math.cos(rotX), 0, 0);
      ctx.fillStyle = "#1a1a1c";
      round(ctx, -phoneW / 2, -phoneH / 2, phoneW, phoneH, phoneW * 0.12);
      ctx.fill();
      ctx.fillStyle = "#0b0b0d";
      const inset = phoneW * 0.06;
      round(ctx, -phoneW / 2 + inset, -phoneH / 2 + inset * 1.6, phoneW - inset * 2, phoneH - inset * 3.1, phoneW * 0.08);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      round(ctx, -phoneW / 2 + inset, -phoneH / 2 + inset * 1.6, phoneW - inset * 2, phoneH - inset * 3.1, phoneW * 0.08);
      ctx.clip();
      if (screen.complete && screen.naturalWidth) {
        ctx.drawImage(screen, -phoneW / 2 + inset, -phoneH / 2 + inset * 1.6, phoneW - inset * 2, phoneH - inset * 3.1);
      }
      ctx.restore();
      ctx.fillStyle = "#111";
      round(ctx, -phoneW * 0.16, -phoneH / 2 + phoneH * 0.035, phoneW * 0.32, phoneH * 0.045, 8);
      ctx.fill();
      ctx.restore();
    }
  });
  function round(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad);
    else ctx.rect(x, y, w, h);
  }
})();
