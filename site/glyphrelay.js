(() => {
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#relayCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    a: $("#sceneAText"), b: $("#sceneBText"), c: $("#sceneCText"), font: $("#fontFamily"), weight: $("#fontWeight"), speed: $("#playbackSpeed"),
    aDuration: $("#sceneADuration"), colorDuration: $("#colorDuration"), bHold: $("#sceneBHold"), arcDuration: $("#arcDuration"), cHold: $("#sceneCHold"),
    colorRhythm: $("#colorRhythm"), softness: $("#colorSoftness"), fontSize: $("#fontSize"), tracking: $("#tracking"), textX: $("#textX"), textY: $("#textY"),
    iconPreset: $("#iconPreset"), iconUpload: $("#iconUpload"), targetA: $("#targetA"), targetC: $("#targetC"), outlineTarget: $("#outlineTarget"),
    iconSize: $("#iconSize"), iconGap: $("#iconGap"), iconX: $("#iconX"), iconY: $("#iconY"), arcCurve: $("#arcCurve"), arcWidth: $("#arcWidth"),
    background: $("#backgroundColor"), textColor: $("#textColor"), colorA: $("#colorA"), colorB: $("#colorB"), colorC: $("#colorC")
  };
  const fontMap = {
    inter: '"Relay Inter", "Relay Noto", sans-serif', space: '"Relay Space", "Relay Noto", sans-serif',
    manrope: '"Relay Manrope", "Relay Noto", sans-serif', poppins: '"Relay Poppins", "Relay Noto", sans-serif', noto: '"Relay Noto", sans-serif'
  };
  const imageCache = new Map();
  let uploadedImage = null;
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;
  let previewDirty = true;
  let lastDuration = 1;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);

  function hexToRgb(hex) {
    const raw = String(hex).replace("#", "");
    const value = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16) || 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  function mixColor(from, to, progress) {
    const a = hexToRgb(from), b = hexToRgb(to), t = clamp(progress);
    return `rgb(${a.map((channel, index) => Math.round(lerp(channel, b[index], t))).join(",")})`;
  }
  function paletteColor(progress) {
    const colors = [inputs.colorA.value, inputs.colorB.value, inputs.colorC.value, inputs.colorA.value];
    const scaled = mod(progress, 1) * (colors.length - 1);
    const index = Math.floor(scaled);
    return mixColor(colors[index], colors[index + 1], scaled - index);
  }

  function timing() {
    const speed = Math.max(.25, Number(inputs.speed.value));
    return {
      a: Number(inputs.aDuration.value) / 1000 / speed,
      color: Number(inputs.colorDuration.value) / 1000 / speed,
      bHold: Number(inputs.bHold.value) / 1000 / speed,
      arc: Number(inputs.arcDuration.value) / 1000 / speed,
      cHold: Number(inputs.cHold.value) / 1000 / speed
    };
  }
  function cycleDuration() { const t = timing(); return Math.max(1 / fps, t.a + t.color + t.bHold + t.arc + t.cHold); }
  function timelineTime() { return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000); }
  function setTime(time) { const next = Math.max(0, time); pausedAt = next; animationStart = performance.now() - next * 1000; previewDirty = true; drawPreview(next); }
  function restart() { pausedAt = 0; animationStart = performance.now(); paused = false; lastDuration = cycleDuration(); previewDirty = true; $("#pauseButton").textContent = "暂停"; }
  function preservePhase() {
    const current = timelineTime();
    const previous = Math.max(1 / fps, lastDuration);
    const next = cycleDuration();
    const rebased = (Math.floor(current / previous) + mod(current, previous) / previous) * next;
    lastDuration = next;
    if (paused) pausedAt = rebased; else animationStart = performance.now() - rebased * 1000;
    drawPreview(rebased);
  }
  function sceneAt(time) {
    const phase = mod(time, cycleDuration());
    const t = timing();
    if (phase < t.a) return { name: "replace", local: phase, progress: phase / Math.max(.001, t.a) };
    if (phase < t.a + t.color) return { name: "color", local: phase - t.a, progress: (phase - t.a) / Math.max(.001, t.color) };
    if (phase < t.a + t.color + t.bHold) return { name: "color-hold", local: phase - t.a - t.color, progress: 1 };
    const arcStart = t.a + t.color + t.bHold;
    if (phase < arcStart + t.arc) return { name: "arc", local: phase - arcStart, progress: (phase - arcStart) / Math.max(.001, t.arc) };
    return { name: "arc-hold", local: phase - arcStart - t.arc, progress: 1 };
  }

  function scaleFor(width, height) { return Math.max(.24, Math.min(width / 1000, height / 900)); }
  function layoutText(renderContext, text, replacements, width, height) {
    const scale = scaleFor(width, height);
    let fontSize = Number(inputs.fontSize.value) * scale;
    const tracking = Number(inputs.tracking.value) * scale;
    const family = fontMap[inputs.font.value] || fontMap.inter;
    renderContext.font = `${inputs.weight.value} ${fontSize}px ${family}`;
    const characters = Array.from(text || " ");
    const replacementSet = new Set(replacements || []);
    const slotWidth = fontSize * .82 * Number(inputs.iconGap.value) / 100;
    const measure = () => characters.map((character, index) => replacementSet.has(index) ? slotWidth : renderContext.measureText(character).width);
    let widths = measure();
    let total = widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, characters.length - 1);
    const maximum = width * .92;
    if (total > maximum) {
      const factor = maximum / total;
      fontSize *= factor;
      renderContext.font = `${inputs.weight.value} ${fontSize}px ${family}`;
      widths = characters.map((character, index) => replacementSet.has(index) ? fontSize * .82 * Number(inputs.iconGap.value) / 100 : renderContext.measureText(character).width);
      total = widths.reduce((sum, value) => sum + value, 0) + tracking * factor * Math.max(0, characters.length - 1);
    }
    let x = width * Number(inputs.textX.value) / 100 - total / 2;
    const y = height * Number(inputs.textY.value) / 100;
    const items = characters.map((character, index) => {
      const item = { character, index, x, y, width: widths[index], centerX: x + widths[index] / 2, fontSize };
      x += widths[index] + tracking;
      return item;
    });
    return { items, fontSize };
  }

  function getImage(path) {
    if (!path) return null;
    if (!imageCache.has(path)) {
      const image = new Image();
      image.onload = () => { previewDirty = true; };
      image.src = path;
      imageCache.set(path, image);
    }
    return imageCache.get(path);
  }
  function selectedImage() {
    if (inputs.iconPreset.value === "upload") return uploadedImage;
    if (inputs.iconPreset.value.startsWith("animal-")) return getImage(`assets/transparent-animals/${inputs.iconPreset.value}.png`);
    return null;
  }

  function roundedRect(renderContext, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    renderContext.beginPath();
    renderContext.moveTo(x + r, y); renderContext.arcTo(x + width, y, x + width, y + height, r); renderContext.arcTo(x + width, y + height, x, y + height, r);
    renderContext.arcTo(x, y + height, x, y, r); renderContext.arcTo(x, y, x + width, y, r); renderContext.closePath();
  }
  function drawBuiltinIcon(renderContext, type, x, y, size) {
    renderContext.save();
    if (type === "target") {
      [inputs.colorB.value, "#ffde00", inputs.colorC.value, "#32c5ff", "#111111"].forEach((color, index) => {
        renderContext.beginPath(); renderContext.fillStyle = color; renderContext.arc(x, y, size * (.5 - index * .08), 0, Math.PI * 2); renderContext.fill();
      });
      renderContext.restore(); return;
    }
    const background = type === "music" ? "#fa264f" : type === "play" ? "#111" : type === "cloud" ? "#1389ff" : "#d8d8d8";
    roundedRect(renderContext, x - size / 2, y - size / 2, size, size, size * .23); renderContext.fillStyle = background; renderContext.fill();
    renderContext.fillStyle = "#fff"; renderContext.strokeStyle = "#fff"; renderContext.lineWidth = size * .07;
    if (type === "play") { renderContext.beginPath(); renderContext.moveTo(x - size * .1, y - size * .2); renderContext.lineTo(x + size * .23, y); renderContext.lineTo(x - size * .1, y + size * .2); renderContext.closePath(); renderContext.fill(); }
    else if (type === "cloud") { renderContext.beginPath(); renderContext.arc(x - size * .17, y + size * .06, size * .16, 0, Math.PI * 2); renderContext.arc(x + size * .02, y - size * .04, size * .22, 0, Math.PI * 2); renderContext.arc(x + size * .22, y + size * .06, size * .15, 0, Math.PI * 2); renderContext.fill(); }
    else if (type === "watch") { roundedRect(renderContext, x - size * .22, y - size * .31, size * .44, size * .62, size * .12); renderContext.fillStyle = "#111"; renderContext.fill(); roundedRect(renderContext, x - size * .15, y - size * .2, size * .3, size * .4, size * .08); renderContext.fillStyle = "#d7ff2f"; renderContext.fill(); }
    else { renderContext.beginPath(); renderContext.moveTo(x - size * .06, y - size * .28); renderContext.lineTo(x - size * .06, y + size * .18); renderContext.stroke(); renderContext.beginPath(); renderContext.arc(x - size * .17, y + size * .23, size * .12, 0, Math.PI * 2); renderContext.fill(); renderContext.beginPath(); renderContext.arc(x + size * .07, y + size * .14, size * .12, 0, Math.PI * 2); renderContext.fill(); }
    renderContext.restore();
  }
  function drawIcon(renderContext, x, y, fontSize, scale = 1) {
    const size = fontSize * .78 * Number(inputs.iconSize.value) / 100 * scale;
    const offsetX = Number(inputs.iconX.value) * scaleFor(canvas.clientWidth || 1000, canvas.clientHeight || 900);
    const offsetY = Number(inputs.iconY.value) * scaleFor(canvas.clientWidth || 1000, canvas.clientHeight || 900);
    const image = selectedImage();
    if (image?.complete && image.naturalWidth) {
      renderContext.drawImage(image, x - size / 2 + offsetX, y - size / 2 + offsetY, size, size);
    } else drawBuiltinIcon(renderContext, inputs.iconPreset.value === "upload" ? "target" : inputs.iconPreset.value, x + offsetX, y + offsetY, size);
  }

  function drawSceneA(renderContext, width, height) {
    const target = clamp(Number(inputs.targetA.value) - 1, 0, Math.max(0, Array.from(inputs.a.value).length - 1));
    const layout = layoutText(renderContext, inputs.a.value, [target], width, height);
    renderContext.textBaseline = "middle"; renderContext.fillStyle = inputs.textColor.value;
    layout.items.forEach((item) => { if (item.index === target) drawIcon(renderContext, item.centerX, item.y, layout.fontSize); else renderContext.fillText(item.character, item.x, item.y); });
    return layout;
  }
  function colorPulse(index, count, progress) {
    const mode = inputs.colorRhythm.value;
    if (mode === "flash") return Math.sin(Math.PI * clamp(progress));
    let order = index / Math.max(1, count - 1);
    if (mode === "center") order = Math.abs(index - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
    if (mode === "sweep") return smooth((progress - order * .5) / .28) * (1 - smooth((progress - .72 - order * .18) / .2));
    const windowSize = lerp(.18, .55, Number(inputs.softness.value) / 100);
    const local = (progress - order * .55) / Math.max(.08, windowSize);
    return Math.sin(Math.PI * clamp(local));
  }
  function drawSceneB(renderContext, width, height, progress, colored) {
    const layout = layoutText(renderContext, inputs.b.value, [], width, height);
    renderContext.textBaseline = "middle";
    layout.items.forEach((item) => {
      const pulse = colored ? colorPulse(item.index, layout.items.length, progress) : 0;
      renderContext.fillStyle = mixColor(inputs.textColor.value, paletteColor(item.index / Math.max(1, layout.items.length - 1) + progress * .35), pulse);
      renderContext.fillText(item.character, item.x, item.y);
    });
    return layout;
  }
  function bezierPoint(start, controlA, controlB, end, t) {
    const u = 1 - t;
    return { x: u ** 3 * start.x + 3 * u * u * t * controlA.x + 3 * u * t * t * controlB.x + t ** 3 * end.x, y: u ** 3 * start.y + 3 * u * u * t * controlA.y + 3 * u * t * t * controlB.y + t ** 3 * end.y };
  }
  function drawArc(renderContext, target, progress, width, height) {
    const curve = Number(inputs.arcCurve.value) / 100;
    const start = { x: target.x - width * (.24 + curve * .2), y: target.y - height * (.17 + curve * .18) };
    const controlA = { x: start.x + width * .05, y: start.y + height * .02 };
    const controlB = { x: target.x - width * .08, y: target.y - height * .03 };
    const endProgress = smooth(clamp(progress / .72));
    const startProgress = progress < .52 ? 0 : smooth((progress - .52) / .48);
    const colors = [inputs.colorB.value, "#ffde00", inputs.colorC.value, "#22d9ff"];
    colors.forEach((color, band) => {
      renderContext.beginPath();
      for (let index = 0; index <= 52; index += 1) {
        const t = lerp(startProgress, endProgress, index / 52);
        const point = bezierPoint(start, controlA, controlB, target, t);
        const offset = (band - 1.5) * Number(inputs.arcWidth.value) * .75;
        if (index === 0) renderContext.moveTo(point.x + offset, point.y); else renderContext.lineTo(point.x + offset, point.y);
      }
      renderContext.strokeStyle = color; renderContext.lineWidth = Number(inputs.arcWidth.value) * scaleFor(width, height); renderContext.lineCap = "round"; renderContext.stroke();
    });
  }
  function drawSceneC(renderContext, width, height, progress) {
    const characters = Array.from(inputs.c.value);
    const target = clamp(Number(inputs.targetC.value) - 1, 0, Math.max(0, characters.length - 1));
    const outline = clamp(Number(inputs.outlineTarget.value) - 1, 0, Math.max(0, characters.length - 1));
    const layout = layoutText(renderContext, inputs.c.value, [target, outline], width, height);
    renderContext.textBaseline = "middle"; renderContext.fillStyle = inputs.textColor.value;
    layout.items.forEach((item) => {
      if (item.index === target) {
        const iconProgress = smooth((progress - .42) / .48);
        if (iconProgress > 0) {
          const old = inputs.iconPreset.value;
          if (!selectedImage()) drawBuiltinIcon(renderContext, "target", item.centerX, item.y, layout.fontSize * .78 * Number(inputs.iconSize.value) / 100 * iconProgress);
          else drawIcon(renderContext, item.centerX, item.y, layout.fontSize, iconProgress);
          if (old === "target") previewDirty = previewDirty;
        }
      } else if (item.index === outline) {
        renderContext.beginPath(); renderContext.strokeStyle = mixColor("#c8c8c8", inputs.textColor.value, .35); renderContext.lineWidth = Math.max(1, layout.fontSize * .025); renderContext.arc(item.centerX, item.y, layout.fontSize * .32, 0, Math.PI * 2); renderContext.stroke();
      } else renderContext.fillText(item.character, item.x, item.y);
    });
    const targetItem = layout.items[target];
    if (targetItem) drawArc(renderContext, { x: targetItem.centerX, y: targetItem.y }, progress, width, height);
    return layout;
  }

  function renderFrame(targetCanvas, time, width, height, ratio = 1) {
    const renderContext = targetCanvas.getContext("2d");
    renderContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderContext.fillStyle = inputs.background.value; renderContext.fillRect(0, 0, width, height);
    const state = sceneAt(time);
    if (state.name === "replace") drawSceneA(renderContext, width, height);
    else if (state.name === "color") drawSceneB(renderContext, width, height, state.progress, true);
    else if (state.name === "color-hold") drawSceneB(renderContext, width, height, 1, false);
    else drawSceneC(renderContext, width, height, state.progress);
    if (targetCanvas === canvas) {
      canvas.dataset.scene = state.name; canvas.dataset.phase = mod(time, cycleDuration()).toFixed(4); canvas.dataset.cycleDuration = cycleDuration().toFixed(4); canvas.dataset.timelineTime = time.toFixed(4); canvas.dataset.previewQuality = "realtime";
    }
  }
  function resizeCanvas() {
    const ratio = Math.min(1.25, Math.max(1, devicePixelRatio || 1)); const width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight);
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; canvas.dataset.ratio = String(ratio); previewDirty = true; }
  }
  function drawPreview(time = timelineTime()) { resizeCanvas(); const ratio = Number(canvas.dataset.ratio || 1); renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio); previewDirty = false; frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`; }
  function previewLoop() { if (!paused || previewDirty) drawPreview(); rafId = requestAnimationFrame(previewLoop); }

  function updateOutputs() {
    previewDirty = true;
    const values = { playbackSpeedOut: `${Number(inputs.speed.value).toFixed(2)}×`, sceneADurationOut: `${(inputs.aDuration.value / 1000).toFixed(2)}秒`, colorDurationOut: `${(inputs.colorDuration.value / 1000).toFixed(2)}秒`, sceneBHoldOut: `${(inputs.bHold.value / 1000).toFixed(2)}秒`, arcDurationOut: `${(inputs.arcDuration.value / 1000).toFixed(2)}秒`, sceneCHoldOut: `${(inputs.cHold.value / 1000).toFixed(2)}秒`, colorSoftnessOut: `${inputs.softness.value}%`, fontSizeOut: `${inputs.fontSize.value}px`, trackingOut: `${inputs.tracking.value}px`, textXOut: `${inputs.textX.value}%`, textYOut: `${inputs.textY.value}%`, targetAOut: inputs.targetA.value, targetCOut: inputs.targetC.value, outlineTargetOut: inputs.outlineTarget.value, iconSizeOut: `${inputs.iconSize.value}%`, iconGapOut: `${inputs.iconGap.value}%`, iconXOut: `${inputs.iconX.value}px`, iconYOut: `${inputs.iconY.value}px`, arcCurveOut: `${inputs.arcCurve.value}%`, arcWidthOut: `${inputs.arcWidth.value}px` };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
  }
  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  [inputs.a, inputs.b, inputs.c, inputs.speed, inputs.aDuration, inputs.colorDuration, inputs.bHold, inputs.arcDuration, inputs.cHold].forEach((input) => input.addEventListener("input", preservePhase));
  inputs.iconPreset.addEventListener("change", () => { previewDirty = true; });
  inputs.iconUpload.addEventListener("change", () => {
    const file = inputs.iconUpload.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { uploadedImage = image; inputs.iconPreset.value = "upload"; previewDirty = true; }; image.src = reader.result; }; reader.readAsDataURL(file);
  });
  function setReference() { inputs.a.value = "a season of"; inputs.b.value = "joy"; inputs.c.value = "motivation"; inputs.font.value = "inter"; inputs.targetA.value = 5; inputs.targetC.value = 2; inputs.outlineTarget.value = 9; restart(); updateOutputs(); }
  $("#referencePreset").addEventListener("click", setReference);
  $("#chinesePreset").addEventListener("click", () => { inputs.a.value = "热爱是一种"; inputs.b.value = "快乐"; inputs.c.value = "持续行动"; inputs.font.value = "noto"; inputs.targetA.value = 3; inputs.targetC.value = 2; inputs.outlineTarget.value = 4; restart(); updateOutputs(); });
  [$("#restartTop"), $("#restartButton")].forEach((button) => button.addEventListener("click", restart));
  $("#pauseButton").addEventListener("click", (event) => { if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; event.currentTarget.textContent = "暂停"; } else { pausedAt = timelineTime(); paused = true; drawPreview(pausedAt); event.currentTarget.textContent = "继续"; } });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(timelineTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(timelineTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(rafId); else { animationStart = performance.now() - timelineTime() * 1000; previewLoop(); } });

  function exportDimensions() { const value = $("#exportPreset").value; if (value === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)]; if (value === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)]; return value.split("x").map(Number); }
  function makeExportCanvas(vertical = false) { const result = document.createElement("canvas"); const size = vertical ? [1080, 1920] : exportDimensions(); result.width = clamp(Math.round(size[0]) || 1080, 240, 3840); result.height = clamp(Math.round(size[1]) || 1080, 240, 3840); return result; }
  function selectedDuration() { const value = $("#exportDuration").value; if (value === "cycle") return cycleDuration(); if (value === "custom") return clamp(Number($("#customDuration").value) || 5, .5, 30); return Number(value) || 5; }
  function downloadBlob(blob, filename) { const link = document.createElement("a"), url = URL.createObjectURL(blob); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) { exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => { const output = makeExportCanvas(); renderFrame(output, timelineTime(), output.width, output.height, 1); output.toBlob((blob) => { if (!blob) return; downloadBlob(blob, `glyph-relay-${output.width}x${output.height}.png`); exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png"); });
  $("#exportGif").addEventListener("click", () => { if (!window.GIF) return; const output = makeExportCanvas(), exportFps = Number($("#exportFps").value) || 30, duration = selectedDuration(), frames = Math.ceil(duration * exportFps); setExportBusy(true, `正在准备 GIF · 0 / ${frames} 帧`); const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" }); for (let frame = 0; frame < frames; frame += 1) { renderFrame(output, frame / exportFps, output.width, output.height, 1); gif.addFrame(output, { copy: true, delay: 1000 / exportFps }); } gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; }); gif.on("finished", (blob) => { downloadBlob(blob, `glyph-relay-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); }); gif.render(); });
  async function exportVideo(vertical = false) { const output = makeExportCanvas(vertical), exportFps = Number($("#exportFps").value) || 30, duration = selectedDuration(), frames = Math.ceil(duration * exportFps); setExportBusy(true, "正在逐帧生成视频 · 0%"); try { const writer = new WebMWriter({ quality: .94, frameRate: exportFps }); for (let frame = 0; frame < frames; frame += 1) { renderFrame(output, frame / exportFps, output.width, output.height, 1); writer.addFrame(output); if (frame % 2 === 0) { exportStatus.textContent = `正在逐帧生成视频 · ${Math.round((frame + 1) / frames * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); } } const blob = await writer.complete(); downloadBlob(blob, `glyph-relay-${output.width}x${output.height}.webm`); setExportBusy(false, `WEBM 视频已生成 · ${output.width} × ${output.height}`); } catch (error) { setExportBusy(false, `视频导出失败：${error.message}`); } }
  $("#exportVideo").addEventListener("click", () => exportVideo(false)); $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  updateOutputs(); lastDuration = cycleDuration(); document.fonts.ready.then(restart); previewLoop();
})();
