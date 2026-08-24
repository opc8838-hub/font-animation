(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, formatSeconds, loadImages } = FX;
  const cards = loadImages(Array.from({ length: 8 }, (_, i) => `assets/transparent-animals/animal-${String(i + 3).padStart(2, "0")}.png`));
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (Number($("#orbitDuration").value) + Number($("#collapseDuration").value) + 1600) / 1000 / speed();
  }
  FX.create({
    filePrefix: "logoassemble",
    cycleLength,
    updateOutputs() {
      $("#orbitOut").textContent = formatSeconds(Number($("#orbitDuration").value) / 1000);
      $("#collapseOut").textContent = formatSeconds(Number($("#collapseDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const t = FX.mod(time, cycleLength());
      const orbitT = Number($("#orbitDuration").value) / 1000 / speed();
      const collapseT = Number($("#collapseDuration").value) / 1000 / speed();
      const collapse = easeOutCubic(clamp01((t - orbitT) / collapseT));
      const reveal = easeOutCubic(clamp01((t - orbitT - collapseT) / 0.7));
      const radius = Math.min(w, h) * 0.28 * (1 - collapse);
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      cards.forEach((image, i) => {
        if (!image.complete) return;
        const angle = t * 1.4 + (i / cards.length) * Math.PI * 2;
        const x = w / 2 + Math.cos(angle) * radius;
        const y = h / 2 + Math.sin(angle) * radius;
        const card = size * 1.5 * (1 - collapse * 0.7);
        ctx.save();
        ctx.globalAlpha = 1 - collapse;
        ctx.translate(x, y);
        ctx.rotate(angle + 0.4);
        ctx.fillStyle = "#1b1b20";
        ctx.fillRect(-card / 2, -card / 2, card, card);
        ctx.drawImage(image, -card * 0.4, -card * 0.4, card * 0.8, card * 0.8);
        ctx.restore();
      });
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (collapse < 0.85) {
        ctx.globalAlpha = 1 - collapse;
        ctx.fillStyle = $("#textColor").value;
        ctx.fillText($("#middleText").value || "先看图", w / 2, h / 2);
      }
      ctx.globalAlpha = reveal;
      ctx.fillStyle = $("#textColor").value;
      ctx.beginPath();
      ctx.arc(w / 2 - size * 1.6 * reveal, h / 2, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "left";
      ctx.fillText($("#brandText").value || "出片工坊", w / 2 - size * 0.9 * reveal, h / 2);
    }
  });
})();
