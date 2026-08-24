(() => {
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#gradientCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;

  const inputs = {
    introText: $("#introText"), mainText: $("#mainText"), font: $("#fontFamily"), fontWeight: $("#fontWeight"),
    typingRhythm: $("#typingRhythm"), playbackSpeed: $("#playbackSpeed"), charInterval: $("#charInterval"),
    introHold: $("#introHold"), clearGap: $("#clearGap"), mainHold: $("#mainHold"), fontSize: $("#fontSize"),
    tracking: $("#tracking"), lineHeight: $("#lineHeight"), maxWidth: $("#maxWidth"), textX: $("#textX"), textY: $("#textY"),
    palettePreset: $("#palettePreset"), gradientAngle: $("#gradientAngle"), gradientSpeed: $("#gradientSpeed"), gradientScale: $("#gradientScale"),
    color1: $("#color1"), color2: $("#color2"), color3: $("#color3"), color4: $("#color4"),
    textColor: $("#textColor"), shadowColor: $("#shadowColor"), shadowStrength: $("#shadowStrength"),
    shadowOffset: $("#shadowOffset"), caretStyle: $("#caretStyle"), caretBlink: $("#caretBlink"), startOffset: $("#startOffset")
  };

  const fontFamilies = {
    inter: '"Gradient Inter", "Gradient Noto SC", sans-serif',
    "space-grotesk": '"Gradient Space Grotesk", "Gradient Noto SC", sans-serif',
    manrope: '"Gradient Manrope", "Gradient Noto SC", sans-serif',
    poppins: '"Gradient Poppins", "Gradient Noto SC", sans-serif',
    "work-sans": '"Gradient Work Sans", "Gradient Noto SC", sans-serif',
    "noto-sc": '"Gradient Noto SC", sans-serif'
  };

  const palettes = {
    reference: ["#d800d5", "#ff006f", "#ff2e19", "#f39668"],
    neon: ["#6317ff", "#f000ff", "#ff176b", "#ff7b00"],
    ocean: ["#071952", "#088395", "#37b7c3", "#7c5cff"],
    acid: ["#c8ff00", "#00f5d4", "#8a2be2", "#ff2a6d"]
  };

  let alignment = "center";
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;
  let previewDirty = true;
  let lastCycleDuration = 1;
  const metricCache = new Map();

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const smooth = (progress) => {
    const value = clamp(progress);
    return value * value * (3 - 2 * value);
  };

  function hexToRgb(hex) {
    const value = String(hex || "#000000").replace("#", "");
    const normalized = value.length === 3 ? value.split("").map((character) => character + character).join("") : value.padEnd(6, "0").slice(0, 6);
    return {
      r: parseInt(normalized.slice(0, 2), 16) || 0,
      g: parseInt(normalized.slice(2, 4), 16) || 0,
      b: parseInt(normalized.slice(4, 6), 16) || 0
    };
  }

  function mixHex(start, end, progress) {
    const a = hexToRgb(start);
    const b = hexToRgb(end);
    const mix = smooth(progress);
    return `rgb(${Math.round(lerp(a.r, b.r, mix))}, ${Math.round(lerp(a.g, b.g, mix))}, ${Math.round(lerp(a.b, b.b, mix))})`;
  }

  function rgba(hex, alpha) {
    const color = hexToRgb(hex);
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha)})`;
  }

  function paletteColors() {
    return [inputs.color1.value, inputs.color2.value, inputs.color3.value, inputs.color4.value];
  }

  function paletteAt(position, colors) {
    const wrapped = mod(position, 1);
    const scaled = wrapped * colors.length;
    const index = Math.floor(scaled) % colors.length;
    return mixHex(colors[index], colors[(index + 1) % colors.length], scaled - Math.floor(scaled));
  }

  function timingConfig() {
    const speed = Math.max(.25, Number(inputs.playbackSpeed.value));
    const characters = Math.max(1, Array.from(inputs.mainText.value || " ").length);
    return {
      speed,
      characters,
      intro: Math.max(0, Number(inputs.introHold.value)) / 1000 / speed,
      gap: Math.max(0, Number(inputs.clearGap.value)) / 1000 / speed,
      typing: characters * Math.max(10, Number(inputs.charInterval.value)) / 1000 / speed,
      hold: Math.max(0, Number(inputs.mainHold.value)) / 1000 / speed
    };
  }

  function cycleDuration() {
    const timing = timingConfig();
    return Math.max(1 / fps, timing.intro + timing.gap + timing.typing + timing.hold);
  }

  function timelineTime() {
    return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000);
  }

  function setTime(time) {
    const next = Math.max(0, time);
    pausedAt = next;
    animationStart = performance.now() - next * 1000;
    previewDirty = true;
    drawPreview(next);
  }

  function restart() {
    pausedAt = 0;
    animationStart = performance.now();
    paused = false;
    lastCycleDuration = cycleDuration();
    previewDirty = true;
    $("#pauseButton").textContent = "暂停";
  }

  function preserveCyclePhase() {
    const current = timelineTime();
    const previousDuration = Math.max(1 / fps, lastCycleDuration || cycleDuration());
    const loop = Math.floor(current / previousDuration);
    const phase = mod(current, previousDuration) / previousDuration;
    const nextDuration = cycleDuration();
    const rebased = loop * nextDuration + phase * nextDuration;
    lastCycleDuration = nextDuration;
    if (paused) pausedAt = rebased;
    else animationStart = performance.now() - rebased * 1000;
    previewDirty = true;
    drawPreview(rebased);
  }

  function rhythmProgress(progress) {
    const value = clamp(progress);
    if (inputs.typingRhythm.value === "accelerate") return Math.pow(value, 1.8);
    if (inputs.typingRhythm.value === "decelerate") return 1 - Math.pow(1 - value, 2.2);
    if (inputs.typingRhythm.value === "pulse") {
      const tau = Math.PI * 2;
      return clamp(value - .12 * Math.sin(tau * 3 * value) / (tau * 3));
    }
    if (inputs.typingRhythm.value === "punch") {
      if (value < .16) return .34 * smooth(value / .16);
      if (value < .74) return .34 + .38 * smooth((value - .16) / .58);
      return .72 + .28 * smooth((value - .74) / .26);
    }
    return value;
  }

  function sceneAt(time) {
    const duration = cycleDuration();
    const offset = Number(inputs.startOffset.value) / 100 * duration;
    const phase = mod(time + offset, duration);
    const timing = timingConfig();
    if (phase < timing.intro) return { phase, scene: "intro", text: inputs.introText.value, progress: 1, visible: Array.from(inputs.introText.value).length };
    if (phase < timing.intro + timing.gap) return { phase, scene: "gap", text: "", progress: 0, visible: 0 };
    const typingStart = timing.intro + timing.gap;
    if (phase < typingStart + timing.typing) {
      const progress = clamp((phase - typingStart) / Math.max(.001, timing.typing));
      const characters = Array.from(inputs.mainText.value);
      const visible = Math.min(characters.length, Math.max(1, Math.floor(rhythmProgress(progress) * characters.length) + 1));
      return { phase, scene: "typing", text: characters.slice(0, visible).join(""), progress, visible };
    }
    return { phase, scene: "hold", text: inputs.mainText.value, progress: 1, visible: Array.from(inputs.mainText.value).length };
  }

  function visualScale(width, height) {
    return Math.max(.24, Math.min(width / 1000, height / 900));
  }

  function textMetrics(renderContext, text, tracking) {
    const key = `${renderContext.font}|${tracking}|${text}`;
    let result = metricCache.get(key);
    if (!result) {
      const glyphs = Array.from(text);
      const widths = glyphs.map((glyph) => renderContext.measureText(glyph).width);
      result = { glyphs, widths, width: widths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * tracking };
      if (metricCache.size > 1600) metricCache.clear();
      metricCache.set(key, result);
    }
    return result;
  }

  function drawTrackedLine(renderContext, text, anchorX, y, tracking, align) {
    const metrics = textMetrics(renderContext, text, tracking);
    let x = anchorX;
    if (align === "center") x -= metrics.width / 2;
    else if (align === "right") x -= metrics.width;
    metrics.glyphs.forEach((glyph, index) => {
      renderContext.fillText(glyph, x, y);
      x += metrics.widths[index] + tracking;
    });
    return metrics.width;
  }

  function fittedFontSize(renderContext, fullText, baseSize, tracking, maximumWidth, fontWeight, family) {
    const lines = String(fullText || " ").split("\n");
    renderContext.font = `${fontWeight} ${baseSize}px ${family}`;
    const widest = Math.max(1, ...lines.map((line) => textMetrics(renderContext, line || " ", tracking).width));
    return widest > maximumWidth ? baseSize * maximumWidth / widest : baseSize;
  }

  function drawGradient(renderContext, time, width, height) {
    const colors = paletteColors();
    const angle = Number(inputs.gradientAngle.value) * Math.PI / 180;
    const vectorX = Math.cos(angle);
    const vectorY = Math.sin(angle);
    const span = Math.abs(vectorX) * width / 2 + Math.abs(vectorY) * height / 2 || height / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const gradient = renderContext.createLinearGradient(
      centerX - vectorX * span, centerY - vectorY * span,
      centerX + vectorX * span, centerY + vectorY * span
    );
    const phase = time * Number(inputs.gradientSpeed.value) / 18;
    const density = Number(inputs.gradientScale.value) / 100 * .65;
    const stopCount = 16;
    for (let index = 0; index <= stopCount; index += 1) {
      const progress = index / stopCount;
      gradient.addColorStop(progress, paletteAt(progress * density + phase, colors));
    }
    renderContext.fillStyle = gradient;
    renderContext.fillRect(0, 0, width, height);
  }

  function renderFrame(target, time, width, height, ratio = 1) {
    const renderContext = target.getContext("2d");
    renderContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderContext.clearRect(0, 0, width, height);
    drawGradient(renderContext, time, width, height);

    const state = sceneAt(time);
    if (state.text) {
      const scale = visualScale(width, height);
      const family = window.STGFontLibrary?.family(inputs.font.value) || fontFamilies[inputs.font.value] || fontFamilies.inter;
      const fontWeight = Number(inputs.fontWeight.value);
      const baseSize = Number(inputs.fontSize.value) * scale;
      const tracking = Number(inputs.tracking.value) * scale;
      const maximumWidth = width * Number(inputs.maxWidth.value) / 100;
      const fullSceneText = state.scene === "intro" ? inputs.introText.value : inputs.mainText.value;
      const fontSize = fittedFontSize(renderContext, fullSceneText, baseSize, tracking, maximumWidth, fontWeight, family);
      renderContext.font = `${fontWeight} ${fontSize}px ${family}`;
      renderContext.textBaseline = "middle";
      renderContext.fillStyle = inputs.textColor.value;
      const shadowStrength = Number(inputs.shadowStrength.value) / 100;
      renderContext.shadowColor = rgba(inputs.shadowColor.value, shadowStrength);
      renderContext.shadowBlur = shadowStrength * 2.4 * scale;
      renderContext.shadowOffsetX = 0;
      renderContext.shadowOffsetY = Number(inputs.shadowOffset.value) * scale;

      const lines = state.text.split("\n");
      const lineHeight = fontSize * Number(inputs.lineHeight.value) / 100;
      const anchorX = width * Number(inputs.textX.value) / 100;
      const centerY = height * Number(inputs.textY.value) / 100;
      const firstY = centerY - (lines.length - 1) * lineHeight / 2;
      let lastLineWidth = 0;
      lines.forEach((line, index) => {
        lastLineWidth = drawTrackedLine(renderContext, line, anchorX, firstY + index * lineHeight, tracking, alignment);
      });

      if (state.scene === "typing" && inputs.caretStyle.value !== "none") {
        const blinkMs = Math.max(120, Number(inputs.caretBlink.value));
        const visible = Math.floor(time * 1000 / blinkMs) % 2 === 0;
        if (visible) {
          const caretWidth = inputs.caretStyle.value === "block" ? Math.max(3, fontSize * .42) : Math.max(1.5, fontSize * .055);
          let caretX = anchorX + lastLineWidth + fontSize * .08;
          if (alignment === "center") caretX = anchorX + lastLineWidth / 2 + fontSize * .08;
          else if (alignment === "right") caretX = anchorX + fontSize * .08;
          const caretY = firstY + (lines.length - 1) * lineHeight;
          renderContext.shadowColor = "transparent";
          renderContext.fillRect(caretX, caretY - fontSize * .48, caretWidth, fontSize * .96);
        }
      }
    }

    if (target === canvas) {
      canvas.dataset.scene = state.scene;
      canvas.dataset.visibleCharacters = String(state.visible);
      canvas.dataset.phase = state.phase.toFixed(4);
      canvas.dataset.cycleDuration = cycleDuration().toFixed(4);
      canvas.dataset.gradientPhase = mod(time * Number(inputs.gradientSpeed.value) / 18, 1).toFixed(4);
      canvas.dataset.timelineTime = time.toFixed(4);
      canvas.dataset.previewQuality = "realtime";
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.dataset.ratio = String(ratio);
      previewDirty = true;
    }
  }

  function drawPreview(time = timelineTime()) {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    previewDirty = false;
    frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`;
  }

  function previewLoop() {
    if (!paused || previewDirty) drawPreview();
    rafId = requestAnimationFrame(previewLoop);
  }

  function updateOutputs() {
    previewDirty = true;
    const values = {
      playbackSpeedOut: `${Number(inputs.playbackSpeed.value).toFixed(2)}×`,
      charIntervalOut: `${inputs.charInterval.value}ms`, introHoldOut: `${inputs.introHold.value}ms`,
      clearGapOut: `${inputs.clearGap.value}ms`, mainHoldOut: `${inputs.mainHold.value}ms`,
      fontSizeOut: `${inputs.fontSize.value}px`, trackingOut: `${inputs.tracking.value}px`,
      lineHeightOut: `${inputs.lineHeight.value}%`, maxWidthOut: `${inputs.maxWidth.value}%`,
      textXOut: `${inputs.textX.value}%`, textYOut: `${inputs.textY.value}%`,
      gradientAngleOut: `${inputs.gradientAngle.value}°`, gradientSpeedOut: `${Number(inputs.gradientSpeed.value).toFixed(2)}×`,
      gradientScaleOut: `${inputs.gradientScale.value}%`, shadowStrengthOut: `${inputs.shadowStrength.value}%`,
      shadowOffsetOut: `${inputs.shadowOffset.value}px`, caretBlinkOut: `${inputs.caretBlink.value}ms`, startOffsetOut: `${inputs.startOffset.value}%`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    inputs.caretBlink.disabled = inputs.caretStyle.value === "none";
  }

  function applyPalette(name) {
    if (!palettes[name]) return;
    [inputs.color1, inputs.color2, inputs.color3, inputs.color4].forEach((input, index) => { input.value = palettes[name][index]; });
    previewDirty = true;
    drawPreview();
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  [inputs.introText, inputs.mainText, inputs.playbackSpeed, inputs.charInterval, inputs.introHold, inputs.clearGap, inputs.mainHold]
    .forEach((input) => input.addEventListener("input", preserveCyclePhase));
  [inputs.color1, inputs.color2, inputs.color3, inputs.color4].forEach((input) => input.addEventListener("input", () => { inputs.palettePreset.value = "custom"; }));
  inputs.palettePreset.addEventListener("change", () => applyPalette(inputs.palettePreset.value));

  document.querySelectorAll("[data-align]").forEach((button) => button.addEventListener("click", () => {
    alignment = button.dataset.align;
    document.querySelectorAll("[data-align]").forEach((item) => item.classList.toggle("is-active", item === button));
    previewDirty = true;
  }));

  $("#referencePreset").addEventListener("click", () => {
    inputs.introText.value = "SUNO Studio 2.0";
    inputs.mainText.value = "Obsession isn't a flaw.";
    inputs.font.value = "inter";
    applyPalette("reference");
    restart();
  });
  $("#chinesePreset").addEventListener("click", () => {
    inputs.introText.value = "灵感正在发生";
    inputs.mainText.value = "专注不是缺点。\n它是一种天赋。";
    inputs.font.value = "noto-sc";
    restart();
  });
  $("#swapCopy").addEventListener("click", () => {
    const intro = inputs.introText.value;
    inputs.introText.value = inputs.mainText.value.replace(/\n/g, " ");
    inputs.mainText.value = intro;
    restart();
  });

  $("#restartButton").addEventListener("click", restart);
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
      previewDirty = true;
      event.currentTarget.textContent = "暂停";
    } else {
      pausedAt = timelineTime();
      paused = true;
      drawPreview(pausedAt);
      event.currentTarget.textContent = "继续";
    }
  });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(timelineTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(timelineTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else {
      animationStart = performance.now() - timelineTime() * 1000;
      previewLoop();
    }
  });

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }

  function makeExportCanvas(verticalHD = false) {
    const output = document.createElement("canvas");
    const [width, height] = verticalHD ? [1080, 1920] : exportDimensions();
    output.width = clamp(Math.round(width) || 1080, 240, 3840);
    output.height = clamp(Math.round(height) || 1080, 240, 3840);
    return output;
  }

  function selectedDuration() {
    const value = $("#exportDuration").value;
    if (value === "cycle") return cycleDuration();
    if (value === "custom") return clamp(Number($("#customDuration").value) || 3, .5, 30);
    return Number(value) || 3;
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }

  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, timelineTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) { exportStatus.textContent = "PNG 生成失败"; return; }
      downloadBlob(blob, `gradient-type-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas();
    const exportFps = Number($("#exportFps").value) || 30;
    const duration = selectedDuration();
    const frameTotal = Math.max(1, Math.ceil(duration * exportFps));
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < frameTotal; frame += 1) {
      renderFrame(output, frame / exportFps, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / exportFps });
    }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `gradient-type-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); });
    gif.render();
  });

  async function exportWebMFrames(output, duration, exportFps) {
    if (typeof window.WebMWriter !== "function") throw new Error("逐帧视频编码器未加载");
    const writer = new WebMWriter({ quality: .94, frameRate: exportFps });
    const frameCount = Math.max(1, Math.ceil(duration * exportFps));
    for (let frame = 0; frame < frameCount; frame += 1) {
      renderFrame(output, frame / exportFps, output.width, output.height, 1);
      writer.addFrame(output);
      if (frame % 2 === 0) {
        exportStatus.textContent = `正在逐帧生成 ${output.width} × ${output.height} 视频 · ${Math.round((frame + 1) / frameCount * 100)}%`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    const blob = await writer.complete();
    if (!blob || !blob.size) throw new Error("视频文件为空");
    downloadBlob(blob, `gradient-type-${output.width}x${output.height}.webm`);
    return { extension: "WEBM", size: blob.size };
  }

  async function exportVideo(verticalHD = false) {
    const output = makeExportCanvas(verticalHD);
    const duration = selectedDuration();
    const exportFps = Number($("#exportFps").value) || 30;
    setExportBusy(true, `正在逐帧生成 ${output.width} × ${output.height} 视频 · 0%`);
    try {
      const result = await exportWebMFrames(output, duration, exportFps);
      setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      console.error(error);
      setExportBusy(false, `视频导出失败：${error.message || "编码器异常"}`);
    }
  }

  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  applyPalette("reference");
  updateOutputs();
  lastCycleDuration = cycleDuration();
  document.fonts.ready.then(restart);
  previewLoop();
})();
