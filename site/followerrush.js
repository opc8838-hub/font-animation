(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, formatSeconds, loadImages } = FX;
  const faces = loadImages(Array.from({ length: 8 }, (_, i) => `assets/transparent-animals/animal-${String(i + 12).padStart(2, "0")}.png`));
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() { return Number($("#rushDuration").value) / 1000 / speed() + 2.2; }
  FX.create({
    filePrefix: "followerrush",
    cycleLength,
    updateOutputs() {
      $("#rushOut").textContent = formatSeconds(Number($("#rushDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const t = FX.mod(time, cycleLength());
      const rushT = Number($("#rushDuration").value) / 1000 / speed();
      const size = Math.max(16, Math.min(w, h) * Number($("#fontSize").value) / 100);
      const from = Number($("#fromCount").value) || 0;
      const to = Number($("#toCount").value) || 10000;
      const p = easeOutCubic(clamp01((t - 0.45) / rushT));
      const count = Math.round(lerp(from, to, p));
      const wave = clamp01((t - 0.45 - rushT) / 0.8);
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.save();
      ctx.translate(w / 2, h * 0.38);
      ctx.fillStyle = "#16181c";
      const cardW = Math.min(w * 0.84, 520);
      ctx.fillRect(-cardW / 2, -size * 1.6, cardW, size * 3.4);
      ctx.fillStyle = $("#accentColor").value;
      ctx.beginPath();
      ctx.arc(-cardW / 2 + size * 1.1, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = $("#textColor").value;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText($("#nameText").value || "今晚出片", -cardW / 2 + size * 1.9, -size * 0.45);
      FX.applyFont(ctx, $("#fontFamily").value, size * 0.55);
      ctx.fillStyle = "#8b98a5";
      ctx.fillText("关注了你", -cardW / 2 + size * 1.9, size * 0.45);
      ctx.restore();
      faces.forEach((image, i) => {
        const appear = easeOutCubic(clamp01((t - 0.15 - i * 0.08) / 0.25));
        if (appear <= 0 || !image.complete) return;
        const x = w / 2 + (i - 3.5) * size * 0.95;
        const y = h * 0.68 + Math.sin(t * 3 + i) * size * 0.25 * wave;
        ctx.save();
        ctx.globalAlpha = appear;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(image, x - size * 0.55, y - size * 0.55, size * 1.1, size * 1.1);
        ctx.restore();
      });
      FX.applyFont(ctx, $("#fontFamily").value, size * 1.4);
      ctx.fillStyle = $("#textColor").value;
      ctx.textAlign = "center";
      ctx.fillText(`${count.toLocaleString("zh-CN")} 人`, w / 2, h * 0.84);
    }
  });
})();
