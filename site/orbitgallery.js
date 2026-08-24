(() => {
  "use strict";
  const { $, clamp01, formatSeconds, loadImages } = FX;
  const images = loadImages(Array.from({ length: 12 }, (_, i) => `assets/transparent-animals/animal-${String(i + 1).padStart(2, "0")}.png`));
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() { return Number($("#spinDuration").value) / 1000 / speed(); }
  FX.create({
    filePrefix: "orbitgallery",
    cycleLength,
    updateOutputs() {
      $("#spinOut").textContent = formatSeconds(Number($("#spinDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const t = FX.mod(time, cycleLength());
      const turns = t / cycleLength();
      const maxR = Math.min(w, h) * 0.48;
      images.forEach((image, i) => {
        if (!image.complete || !image.naturalWidth) return;
        const u = (i / images.length + turns) % 1;
        const radius = maxR * (0.18 + 0.82 * (1 - u));
        const angle = u * Math.PI * 5.2 + i;
        const x = w / 2 + Math.cos(angle) * radius;
        const y = h / 2 + Math.sin(angle) * radius * 0.72;
        const card = Math.max(28, (0.12 + u * 0.28) * Math.min(w, h));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + u);
        ctx.globalAlpha = 0.35 + u * 0.65;
        ctx.fillStyle = "#16161a";
        ctx.fillRect(-card / 2, -card / 2, card, card);
        ctx.drawImage(image, -card * 0.42, -card * 0.42, card * 0.84, card * 0.84);
        ctx.restore();
      });
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.fillStyle = $("#textColor").value;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 1;
      ctx.fillText($("#titleText").value || "作品在转", w / 2, h / 2);
    }
  });
})();
