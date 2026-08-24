(() => {
  "use strict";
  const { $, clamp01, lerp, easeOutCubic, easeInOut, formatSeconds, loadImages } = FX;
  const photos = loadImages([
    "assets/beforeafter-before.jpg",
    "assets/beforeafter-after.jpg",
    ...Array.from({ length: 6 }, (_, i) => `assets/transparent-animals/animal-${String(i + 20).padStart(2, "0")}.png`)
  ]);
  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (Number($("#scatterDuration").value) + Number($("#pushDuration").value) + 1400) / 1000 / speed();
  }
  FX.create({
    filePrefix: "moodboard",
    cycleLength,
    updateOutputs() {
      $("#scatterOut").textContent = formatSeconds(Number($("#scatterDuration").value) / 1000);
      $("#pushOut").textContent = formatSeconds(Number($("#pushDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const t = FX.mod(time, cycleLength());
      const titleT = 0.7 / speed();
      const scatterT = Number($("#scatterDuration").value) / 1000 / speed();
      const pushT = Number($("#pushDuration").value) / 1000 / speed();
      const scatter = easeOutCubic(clamp01((t - titleT) / scatterT));
      const push = easeInOut(clamp01((t - titleT - scatterT) / pushT));
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      const slots = [
        [-0.28, -0.22, 0.22], [0.26, -0.18, 0.2], [-0.32, 0.18, 0.18],
        [0.3, 0.22, 0.2], [-0.02, -0.3, 0.16], [0.02, 0.3, 0.16]
      ];
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(lerp(1, 1.55, push), lerp(1, 1.55, push));
      slots.forEach((slot, i) => {
        const image = photos[i + 2] || photos[0];
        if (!image.complete) return;
        const a = easeOutCubic(clamp01((scatter - i * 0.08) / 0.35));
        if (a <= 0) return;
        const x = slot[0] * w * a;
        const y = slot[1] * h * a;
        const card = slot[2] * Math.min(w, h);
        ctx.save();
        ctx.globalAlpha = a * (1 - push * 0.35);
        ctx.translate(x, y);
        ctx.rotate((i % 2 ? 1 : -1) * 0.12 * (1 - a));
        ctx.fillStyle = "#2a241c";
        ctx.fillRect(-card / 2, -card / 2, card, card);
        ctx.drawImage(image, -card * 0.46, -card * 0.46, card * 0.92, card * 0.92);
        ctx.restore();
      });
      const hero = photos[1];
      if (hero.complete && push > 0.15) {
        ctx.globalAlpha = clamp01((push - 0.15) / 0.5);
        const hw = Math.min(w, h) * 0.42;
        ctx.drawImage(hero, -hw / 2, -hw * 0.62, hw, hw * 1.24);
      }
      ctx.restore();
      FX.applyFont(ctx, $("#fontFamily").value, size);
      ctx.fillStyle = $("#textColor").value;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = clamp01(t / (0.35 / speed())) * (1 - push);
      ctx.fillText($("#titleText").value || "这一季的味道", w / 2, h * 0.14);
    }
  });
})();
