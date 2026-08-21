(() => {
  "use strict";
  const { $, clamp01, lerp, smoother, formatSeconds } = FX;

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function cycleLength() {
    return (0.45 + Number($("#subDuration").value) / 1000 + Number($("#holdDuration").value) / 1000 + Number($("#logoDuration").value) / 1000) / speed();
  }

  function drawTitle(ctx, text, accent, size, color, accentColor) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${size}px "Continuation Inter", "Continuation SC", sans-serif`;
    if (!accent || !text.includes(accent)) {
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      return;
    }
    const i = text.indexOf(accent);
    const left = text.slice(0, i);
    const right = text.slice(i + accent.length);
    const leftW = ctx.measureText(left).width;
    const accW = ctx.measureText(accent).width;
    const rightW = ctx.measureText(right).width;
    let x = -(leftW + accW + rightW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = color;
    ctx.fillText(left, x, 0);
    x += leftW;
    ctx.fillStyle = accentColor;
    ctx.fillText(accent, x, 0);
    x += accW;
    ctx.fillStyle = color;
    ctx.fillText(right, x, 0);
  }

  FX.create({
    filePrefix: "titlecard",
    cycleLength,
    updateOutputs() {
      $("#subOut").textContent = formatSeconds(Number($("#subDuration").value) / 1000);
      $("#holdOut").textContent = formatSeconds(Number($("#holdDuration").value) / 1000);
      $("#logoOut").textContent = formatSeconds(Number($("#logoDuration").value) / 1000);
      $("#fontSizeOut").textContent = `${$("#fontSize").value}%`;
      $("#speedOut").textContent = `${speed().toFixed(2)}×`;
    },
    renderFrame(ctx, time, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = $("#backgroundColor").value;
      ctx.fillRect(0, 0, w, h);
      const s = speed();
      const intro = 0.45 / s;
      const sub = Number($("#subDuration").value) / 1000 / s;
      const hold = Number($("#holdDuration").value) / 1000 / s;
      const logo = Number($("#logoDuration").value) / 1000 / s;
      const local = FX.mod(time, cycleLength());
      const size = Math.max(18, Math.min(w, h) * Number($("#fontSize").value) / 100);
      const title = $("#titleText").value || "iPhone 17e";
      const subText = $("#subText").value || "";
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (local < intro + sub + hold) {
        const titleA = clamp01(local / intro);
        ctx.globalAlpha = titleA;
        drawTitle(ctx, title, $("#accentText").value, size, $("#textColor").value, $("#accentColor").value);
        const subP = smoother(clamp01((local - intro) / Math.max(0.0001, sub)));
        ctx.globalAlpha = subP;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-w / 2, size * 0.55, w * subP, size);
        ctx.clip();
        ctx.filter = `blur(${(1 - subP) * 8}px)`;
        ctx.fillStyle = $("#accentColor").value;
        ctx.font = `500 ${size * 0.42}px "Continuation SC", "Continuation Inter", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(subText, 0, size * 0.85);
        ctx.restore();
      } else {
        const p = clamp01((local - intro - sub - hold) / Math.max(0.0001, logo));
        const alpha = p < 0.35 ? p / 0.35 : 1 - clamp01((p - 0.55) / 0.45);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = $("#accentColor").value;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  });
})();
