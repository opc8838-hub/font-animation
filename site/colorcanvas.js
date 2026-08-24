(() => {
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#motionCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    copy: $("#copyText"), font: $("#fontFamily"), weight: $("#fontWeight"), speed: $("#speed"), intro: $("#intro"), reveal: $("#reveal"), stagger: $("#stagger"),
    purpleHold: $("#purpleHold"), greenShift: $("#greenShift"), flowHold: $("#flowHold"), rhythm: $("#rhythm"), introScale: $("#introScale"), revealOffset: $("#revealOffset"),
    fontSize: $("#fontSize"), lineGap: $("#lineGap"), tracking: $("#tracking"), textX: $("#textX"), textY: $("#textY"), layout: $("#layout"), textWidth: $("#textWidth"), textOpacity: $("#textOpacity"),
    flowSpeed: $("#flowSpeed"), orbSize: $("#orbSize"), softness: $("#softness"), brightness: $("#brightness"), dark: $("#darkColor"), purple: $("#purpleColor"), green: $("#greenColor"), textColor: $("#textColor")
  };
  const fontMap = { inter: '"CC Inter","CC Noto",sans-serif', space: '"CC Space","CC Noto",sans-serif', manrope: '"CC Manrope","CC Noto",sans-serif', poppins: '"CC Poppins","CC Noto",sans-serif', noto: '"CC Noto",sans-serif' };
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;
  let previewDirty = true;
  let lastDuration = 1;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const easeBack = (value) => { const t = clamp(value), c = 1.18; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function hexToRgb(hex) { const raw = String(hex).replace("#", ""); const value = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16) || 0; return [(value >> 16) & 255, (value >> 8) & 255, value & 255]; }
  function mixColor(a, b, t, alpha = 1) { const x = hexToRgb(a), y = hexToRgb(b), p = clamp(t); return `rgba(${x.map((v, i) => Math.round(lerp(v, y[i], p))).join(",")},${alpha})`; }
  function lines() { const result = inputs.copy.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); return result.length ? result.slice(0, 8) : ["Take"]; }
  function timing() {
    const speed = Math.max(.25, Number(inputs.speed.value));
    return { intro: Number(inputs.intro.value) / 1000 / speed, reveal: Number(inputs.reveal.value) / 1000 / speed, purple: Number(inputs.purpleHold.value) / 1000 / speed, shift: Number(inputs.greenShift.value) / 1000 / speed, flow: Number(inputs.flowHold.value) / 1000 / speed };
  }
  function cycleDuration() { const t = timing(); return Math.max(1 / fps, t.intro + t.reveal + t.purple + t.shift + t.flow); }
  function timelineTime() { return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000); }
  function setTime(value) { const next = Math.max(0, value); pausedAt = next; animationStart = performance.now() - next * 1000; previewDirty = true; drawPreview(next); }
  function restart() { pausedAt = 0; animationStart = performance.now(); paused = false; lastDuration = cycleDuration(); previewDirty = true; $("#pauseButton").textContent = "暂停"; }
  function preservePhase() { const current = timelineTime(), previous = Math.max(1 / fps, lastDuration), next = cycleDuration(); const rebased = (Math.floor(current / previous) + mod(current, previous) / previous) * next; lastDuration = next; if (paused) pausedAt = rebased; else animationStart = performance.now() - rebased * 1000; previewDirty = true; }

  function phaseAt(time) {
    const p = mod(time, cycleDuration()), t = timing();
    if (p < t.intro) return { name: "intro", progress: p / Math.max(.001, t.intro), local: p };
    if (p < t.intro + t.reveal) return { name: "reveal", progress: (p - t.intro) / Math.max(.001, t.reveal), local: p - t.intro };
    if (p < t.intro + t.reveal + t.purple) return { name: "purple", progress: 1, local: p - t.intro - t.reveal };
    const shiftStart = t.intro + t.reveal + t.purple;
    if (p < shiftStart + t.shift) return { name: "shift", progress: (p - shiftStart) / Math.max(.001, t.shift), local: p - shiftStart };
    return { name: "flow", progress: 1, local: p - shiftStart - t.shift };
  }

  function drawBackground(ctx, width, height, time, phase) {
    ctx.fillStyle = inputs.dark.value;
    ctx.fillRect(0, 0, width, height);
    let colorAmount = 0, greenMix = 0;
    if (phase.name === "intro") colorAmount = smooth((phase.progress - .55) / .45) * .35;
    else if (phase.name === "reveal") colorAmount = .3 + smooth(phase.progress) * .7;
    else colorAmount = 1;
    if (phase.name === "shift") greenMix = smooth(phase.progress);
    else if (phase.name === "flow") greenMix = 1;
    if (colorAmount <= .001) return;

    const speed = Number(inputs.flowSpeed.value);
    const travel = time * speed;
    const orb = Math.max(width, height) * Number(inputs.orbSize.value) / 100;
    const softness = Number(inputs.softness.value) / 100;
    const brightness = Number(inputs.brightness.value) / 100;
    const baseColor = mixColor(inputs.purple.value, inputs.green.value, greenMix, colorAmount * .96);
    const accentColor = mixColor("#5611d7", "#d9ff43", greenMix, colorAmount * .92);
    const glowColor = mixColor("#ff38d0", "#7aff57", greenMix, colorAmount * .9);

    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, mixColor(inputs.dark.value, inputs.purple.value, .35 + .4 * (1 - greenMix), colorAmount));
    base.addColorStop(.52, baseColor);
    base.addColorStop(1, mixColor(inputs.purple.value, inputs.green.value, greenMix, colorAmount));
    ctx.save();
    ctx.globalAlpha = clamp(brightness, .35, 1.6);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const points = [
      [width * (.14 + .16 * Math.sin(travel * .63)), height * (.24 + .12 * Math.cos(travel * .52)), orb * 1.05, accentColor],
      [width * (.75 + .13 * Math.cos(travel * .47)), height * (.37 + .16 * Math.sin(travel * .58)), orb * .82, glowColor],
      [width * (.38 + .16 * Math.sin(travel * .39 + 2)), height * (.9 + .08 * Math.cos(travel * .71)), orb * .76, accentColor]
    ];
    points.forEach(([x, y, radius, color], index) => {
      const gradient = ctx.createRadialGradient(x, y, radius * (.08 + softness * .14), x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(.43 + softness * .25, index === 1 ? baseColor : color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });
    ctx.restore();
  }

  function trackedWidth(ctx, text, tracking) { const chars = Array.from(text); return chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + Math.max(0, chars.length - 1) * tracking; }
  function drawTracked(ctx, text, x, y, tracking, align) {
    const chars = Array.from(text), total = trackedWidth(ctx, text, tracking);
    let cursor = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    chars.forEach((char) => { ctx.fillText(char, cursor, y); cursor += ctx.measureText(char).width + tracking; });
  }
  function lineEase(value) {
    if (inputs.rhythm.value === "snap") return value >= .16 ? 1 : 0;
    if (inputs.rhythm.value === "smooth") return smooth(value);
    if (inputs.rhythm.value === "wave") return easeOut(value);
    return easeBack(value);
  }
  function drawText(ctx, width, height, phase) {
    const copyLines = lines();
    const scale = Math.max(.23, Math.min(width / 1000, height / 900));
    const baseSize = Number(inputs.fontSize.value) * scale;
    const tracking = Number(inputs.tracking.value) * scale;
    const lineStep = baseSize * Number(inputs.lineGap.value);
    const family = window.STGFontLibrary?.family(inputs.font.value) || fontMap[inputs.font.value] || fontMap.inter;
    const maxWidth = width * Number(inputs.textWidth.value) / 100;
    const centerX = width * Number(inputs.textX.value) / 100;
    const centerY = height * Number(inputs.textY.value) / 100;
    ctx.textBaseline = "middle";
    ctx.fillStyle = inputs.textColor.value;
    ctx.globalAlpha = Number(inputs.textOpacity.value) / 100;

    if (phase.name === "intro") {
      const pulse = Math.sin(phase.progress * Math.PI);
      const scaleAmount = lerp(Number(inputs.introScale.value) / 100, 1, smooth(phase.progress));
      const size = baseSize * scaleAmount;
      ctx.font = `${Math.round(lerp(800, Number(inputs.weight.value), smooth(phase.progress)))} ${size}px ${family}`;
      let measured = trackedWidth(ctx, copyLines[0], tracking * scaleAmount);
      if (measured > maxWidth) { const fit = maxWidth / measured; ctx.font = `${inputs.weight.value} ${size * fit}px ${family}`; }
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(1 + pulse * .015, 1 - pulse * .025);
      drawTracked(ctx, copyLines[0], 0, 0, tracking * scaleAmount, "center");
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }

    const revealProgress = phase.name === "reveal" ? phase.progress : 1;
    const staggerSeconds = Number(inputs.stagger.value) / 1000 / Math.max(.25, Number(inputs.speed.value));
    const revealSeconds = Math.max(.001, timing().reveal);
    const staggerUnit = clamp(staggerSeconds / revealSeconds, 0, .8);
    const durationUnit = Math.max(.08, 1 - staggerUnit * Math.max(0, copyLines.length - 1));
    const top = centerY - lineStep * (copyLines.length - 1) / 2;
    const offsets = [-.46, .28, -.43, -.2, .18, -.25, .24, -.1];
    copyLines.forEach((line, index) => {
      const raw = clamp((revealProgress - index * staggerUnit) / durationUnit);
      const progress = lineEase(raw);
      if (progress <= 0) return;
      let size = baseSize;
      ctx.font = `${inputs.weight.value} ${size}px ${family}`;
      const measured = trackedWidth(ctx, line, tracking);
      if (measured > maxWidth) { size *= maxWidth / measured; ctx.font = `${inputs.weight.value} ${size}px ${family}`; }
      let align = inputs.layout.value;
      let x = centerX;
      if (align === "reference") { x = centerX + offsets[index % offsets.length] * maxWidth; align = "left"; }
      else if (align === "left") x = centerX - maxWidth / 2;
      else if (align === "right") x = centerX + maxWidth / 2;
      const direction = index % 2 ? 1 : -1;
      const travel = Number(inputs.revealOffset.value) * scale;
      const y = top + index * lineStep + direction * (1 - clamp(progress)) * travel;
      ctx.save();
      ctx.globalAlpha = Number(inputs.textOpacity.value) / 100 * clamp(raw * 2.8);
      const popScale = inputs.rhythm.value === "spring" ? 1 + Math.sin(clamp(raw) * Math.PI) * .055 : 1;
      ctx.translate(x, y);
      ctx.scale(popScale, popScale);
      drawTracked(ctx, line, 0, 0, tracking, align === "center" ? "center" : align === "right" ? "right" : "left");
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function renderFrame(target, time, width, height, ratio = 1) {
    const ctx = target.getContext("2d", { alpha: false });
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const phase = phaseAt(time);
    drawBackground(ctx, width, height, time, phase);
    drawText(ctx, width, height, phase);
  }
  function resizeCanvas() {
    const ratio = Math.min(1.25, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth)), height = Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); canvas.dataset.ratio = String(ratio); previewDirty = true; }
  }
  function drawPreview(time = timelineTime()) { resizeCanvas(); const ratio = Number(canvas.dataset.ratio || 1); renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio); previewDirty = false; frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`; }
  function previewLoop() { if (!paused || previewDirty) drawPreview(); rafId = requestAnimationFrame(previewLoop); }

  const formats = {
    speed: (v) => `${Number(v).toFixed(2)}×`, intro: (v) => `${(v / 1000).toFixed(2)}秒`, reveal: (v) => `${(v / 1000).toFixed(2)}秒`, stagger: (v) => `${v}ms`, purpleHold: (v) => `${(v / 1000).toFixed(2)}秒`, greenShift: (v) => `${(v / 1000).toFixed(2)}秒`, flowHold: (v) => `${(v / 1000).toFixed(2)}秒`,
    introScale: (v) => `${v}%`, revealOffset: (v) => `${v}px`, fontSize: (v) => `${v}px`, lineGap: (v) => `${Number(v).toFixed(2)}×`, tracking: (v) => `${v}px`, textX: (v) => `${v}%`, textY: (v) => `${v}%`, textWidth: (v) => `${v}%`, textOpacity: (v) => `${v}%`, flowSpeed: (v) => `${Number(v).toFixed(2)}×`, orbSize: (v) => `${v}%`, softness: (v) => `${v}%`, brightness: (v) => `${v}%`
  };
  Object.entries(inputs).forEach(([key, input]) => {
    if (!input) return;
    const update = () => { const output = $(`#${input.id}Out`); if (output && formats[key]) output.textContent = formats[key](input.value); preservePhase(); };
    input.addEventListener(input.tagName === "SELECT" || input.type === "color" ? "change" : "input", update);
  });
  $("#referencePreset").addEventListener("click", () => { inputs.copy.value = "Take\nyour\ndesign\nanywhere."; restart(); });
  $("#chinesePreset").addEventListener("click", () => { inputs.copy.value = "把\n灵感\n带到\n任何地方"; inputs.font.value = "noto"; restart(); });
  $("#restartTop").addEventListener("click", restart);
  $("#restartButton").addEventListener("click", restart);
  $("#pauseButton").addEventListener("click", (event) => { if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; event.currentTarget.textContent = "暂停"; } else { pausedAt = timelineTime(); paused = true; drawPreview(pausedAt); event.currentTarget.textContent = "继续"; } });
  $("#backButton").addEventListener("click", () => { if (!paused) $("#pauseButton").click(); setTime(Math.max(0, pausedAt - 1 / fps)); });
  $("#forwardButton").addEventListener("click", () => { if (!paused) $("#pauseButton").click(); setTime(pausedAt + 1 / fps); });
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(rafId); else previewLoop(); });

  function exportDimensions(vertical = false) { if (vertical) return [1080, 1920]; const value = $("#exportPreset").value; if (value === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)]; if (value === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)]; return value.split("x").map(Number); }
  function makeExportCanvas(vertical = false) { const [width, height] = exportDimensions(vertical); const output = document.createElement("canvas"); output.width = Math.max(240, Math.min(3840, width)); output.height = Math.max(240, Math.min(3840, height)); return output; }
  function selectedDuration() { const value = $("#exportDuration").value; return value === "cycle" ? cycleDuration() : value === "custom" ? Number($("#customDuration").value) : Number(value); }
  function downloadBlob(blob, filename) { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1500); }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) { exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.target.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.target.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => { const output = makeExportCanvas(); renderFrame(output, timelineTime(), output.width, output.height, 1); output.toBlob((blob) => { if (!blob) return; downloadBlob(blob, `color-canvas-${output.width}x${output.height}.png`); exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png"); });
  $("#exportGif").addEventListener("click", () => { if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载"; return; } const output = makeExportCanvas(), rate = Number($("#exportFps").value) || 30, duration = selectedDuration(), frames = Math.ceil(duration * rate); setExportBusy(true, `正在准备 GIF · 0 / ${frames} 帧`); const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" }); for (let frame = 0; frame < frames; frame += 1) { renderFrame(output, frame / rate, output.width, output.height, 1); gif.addFrame(output, { copy: true, delay: 1000 / rate }); } gif.on("progress", (p) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(p * 100)}%`; }); gif.on("finished", (blob) => { downloadBlob(blob, `color-canvas-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); }); gif.render(); });
  async function exportVideo(vertical = false) { const output = makeExportCanvas(vertical), rate = Number($("#exportFps").value) || 30, duration = selectedDuration(), frames = Math.ceil(duration * rate); setExportBusy(true, "正在逐帧生成视频 · 0%"); try { const writer = new WebMWriter({ quality: .94, frameRate: rate }); for (let frame = 0; frame < frames; frame += 1) { renderFrame(output, frame / rate, output.width, output.height, 1); writer.addFrame(output); if (frame % 2 === 0) { exportStatus.textContent = `正在逐帧生成视频 · ${Math.round((frame + 1) / frames * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); } } const blob = await writer.complete(); downloadBlob(blob, `color-canvas-${output.width}x${output.height}.webm`); setExportBusy(false, `WEBM 视频已生成 · ${output.width} × ${output.height}`); } catch (error) { setExportBusy(false, `视频导出失败：${error.message}`); } }
  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  lastDuration = cycleDuration();
  resizeCanvas();
  previewLoop();
})();
