(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const context = canvas.getContext("2d");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;

  const inputs = {
    items: $("#itemsText"), font: $("#fontFamily"), baseWeight: $("#baseWeight"), focusWeight: $("#focusWeight"),
    direction: $("#direction"), motionMode: $("#motionMode"), secondsPerItem: $("#secondsPerItem"), fontSize: $("#fontSize"),
    lineGap: $("#lineGap"), focusScale: $("#focusScale"), focusRadius: $("#focusRadius"), tracking: $("#tracking"),
    horizontalPosition: $("#horizontalPosition"), focusPosition: $("#focusPosition"), focusCurve: $("#focusCurve"),
    perspective: $("#perspective"), edgeFade: $("#edgeFade"), idleOpacity: $("#idleOpacity"), maxBlur: $("#maxBlur"),
    compression: $("#compression"), startPhase: $("#startPhase"), snapHold: $("#snapHold"),
    background: $("#backgroundColor"), focusColor: $("#focusColor"), idleColor: $("#idleColor")
  };

  const fontPresets = {
    inter: '"Focus Inter", "Focus Noto SC", sans-serif',
    "space-grotesk": '"Focus Space Grotesk", "Focus Noto SC", sans-serif',
    satoshi: '"Satoshi", "Focus Noto SC", sans-serif',
    "general-sans": '"General Sans", "Focus Noto SC", sans-serif',
    manrope: '"Focus Manrope", "Focus Noto SC", sans-serif',
    poppins: '"Focus Poppins", "Focus Noto SC", sans-serif',
    "noto-sc": '"Focus Noto SC", sans-serif'
  };

  const referenceItems = ["Stem Separation", "and more", "MIDI", "Effects", "Synths", "Chat bar", "Automation"];
  const chineseItems = ["灵感采样", "人声分离", "节奏生成", "音色设计", "智能编曲", "混音空间", "现在开始"];
  let alignment = "center";
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const smoother = (value) => {
    const progress = clamp(value);
    return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
  };
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

  function parseItems() {
    const values = inputs.items.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    return values.length ? values : ["Focus", "Wheel"];
  }

  function cycleDuration() {
    return Math.max(.12, Number(inputs.secondsPerItem.value) / 1000) * parseItems().length;
  }

  function timelineTime() {
    return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000);
  }

  function setTime(seconds) {
    pausedAt = Math.max(0, seconds);
    animationStart = performance.now() - pausedAt * 1000;
    drawPreview(pausedAt);
  }

  function restart() {
    pausedAt = 0;
    animationStart = performance.now();
    paused = false;
    $("#pauseButton").textContent = "暂停";
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value.padEnd(6, "0").slice(0, 6);
    return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) || 0);
  }

  function mixColor(from, to, progress) {
    const start = hexToRgb(from);
    const end = hexToRgb(to);
    return `rgb(${start.map((channel, index) => Math.round(lerp(channel, end[index], clamp(progress)))).join(",")})`;
  }

  function fontFamily() {
    return fontPresets[inputs.font.value] || fontPresets.inter;
  }

  function curveExponent() {
    if (inputs.focusCurve.value === "sharp") return 2.8;
    if (inputs.focusCurve.value === "balanced") return 1.9;
    return 1.35;
  }

  function motionPhase(time, itemCount) {
    const seconds = Math.max(.12, Number(inputs.secondsPerItem.value) / 1000);
    const start = Number(inputs.startPhase.value) / 100 * itemCount;
    const raw = time / seconds + start;
    let phase = raw;
    if (inputs.motionMode.value === "snap") {
      const whole = Math.floor(raw);
      const fraction = raw - whole;
      const hold = Math.min(.75, Number(inputs.snapHold.value) / 100);
      phase = fraction <= hold ? whole : whole + smoother((fraction - hold) / Math.max(.001, 1 - hold));
    }
    // Keep the phase inside one item cycle. Without wrapping, a long-running
    // preview eventually moves beyond the finite set of repeated rows and the
    // canvas appears empty even though the animation is still running.
    const loopedPhase = mod(phase, itemCount);
    return inputs.direction.value === "down" ? -loopedPhase : loopedPhase;
  }

  function textWidth(renderContext, text, tracking) {
    const glyphs = Array.from(text);
    return glyphs.reduce((width, glyph, index) => width + renderContext.measureText(glyph).width + (index < glyphs.length - 1 ? tracking : 0), 0);
  }

  function drawTrackedText(renderContext, text, x, y, tracking, align) {
    const glyphs = Array.from(text);
    const width = textWidth(renderContext, text, tracking);
    let cursor = align === "left" ? x : align === "right" ? x - width : x - width / 2;
    glyphs.forEach((glyph, index) => {
      renderContext.fillText(glyph, cursor, y);
      cursor += renderContext.measureText(glyph).width + (index < glyphs.length - 1 ? tracking : 0);
    });
  }

  function renderFrame(target, time, width, height, ratio = 1) {
    const renderContext = target.getContext("2d");
    const items = parseItems();
    const count = items.length;
    const unit = height / 900;
    const gap = Math.max(12, Number(inputs.lineGap.value) * unit);
    const fontSize = Math.max(10, Number(inputs.fontSize.value) * unit);
    const tracking = Number(inputs.tracking.value) * unit;
    const focusRadius = Math.max(gap * .7, height * Number(inputs.focusRadius.value) / 100);
    const focusX = width * Number(inputs.horizontalPosition.value) / 100;
    const focusY = height * Number(inputs.focusPosition.value) / 100;
    const maxScale = Number(inputs.focusScale.value) / 100;
    const perspective = Number(inputs.perspective.value) / 100;
    const compression = Number(inputs.compression.value) / 100;
    const idleOpacity = Number(inputs.idleOpacity.value) / 100;
    const maximumBlur = Number(inputs.maxBlur.value) * unit;
    const baseWeight = Number(inputs.baseWeight.value);
    const focusWeight = Number(inputs.focusWeight.value);
    const phase = motionPhase(time, count);
    const loopHeight = Math.max(gap, count * gap);
    const repeats = Math.max(2, Math.ceil(height / loopHeight) + 2);
    const fadeStrength = Number(inputs.edgeFade.value) / 100;
    const fadeStart = height * (0.48 - .22 * fadeStrength);
    const fadeEnd = height * .54;
    const exponent = curveExponent();
    const entries = [];

    renderContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderContext.globalAlpha = 1;
    renderContext.filter = "none";
    renderContext.fillStyle = inputs.background.value;
    renderContext.fillRect(0, 0, width, height);
    renderContext.textBaseline = "middle";
    renderContext.textAlign = "left";

    for (let copy = -repeats; copy <= repeats; copy += 1) {
      for (let index = 0; index < count; index += 1) {
        const step = index + copy * count - phase;
        const rawY = step * gap;
        if (Math.abs(rawY) > height * .72 + gap) continue;
        const distance = Math.abs(rawY) / focusRadius;
        const focus = Math.exp(-Math.pow(distance, exponent));
        const focusEase = smoother(focus);
        const projectedY = focusY + rawY * (1 + perspective * focusEase);
        const edgeProgress = clamp((Math.abs(projectedY - focusY) - fadeStart) / Math.max(1, fadeEnd - fadeStart));
        const edgeAlpha = 1 - smoother(edgeProgress);
        const opacity = (idleOpacity + (1 - idleOpacity) * Math.pow(focus, .88)) * edgeAlpha;
        if (opacity <= .002) continue;
        entries.push({
          text: items[index], index, focus, focusEase, opacity, y: projectedY,
          scale: 1 + (maxScale - 1) * focusEase,
          scaleX: 1 - compression * (1 - focusEase),
          blur: maximumBlur * Math.pow(1 - focus, 1.25),
          weight: Math.round(lerp(baseWeight, focusWeight, focusEase))
        });
      }
    }

    entries.sort((a, b) => a.focus - b.focus);
    entries.forEach((entry) => {
      renderContext.save();
      renderContext.translate(focusX, entry.y);
      renderContext.scale(entry.scale * entry.scaleX, entry.scale);
      renderContext.globalAlpha = entry.opacity;
      renderContext.filter = entry.blur > .08 ? `blur(${entry.blur.toFixed(2)}px)` : "none";
      renderContext.fillStyle = mixColor(inputs.idleColor.value, inputs.focusColor.value, Math.pow(entry.focus, .72));
      renderContext.font = `${entry.weight} ${fontSize}px ${fontFamily()}`;
      drawTrackedText(renderContext, entry.text, 0, 0, tracking, alignment);
      renderContext.restore();
    });

    renderContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderContext.filter = "none";
    renderContext.globalAlpha = 1;

    if (target === canvas) {
      const active = entries.reduce((closest, entry) => !closest || Math.abs(entry.y - focusY) < Math.abs(closest.y - focusY) ? entry : closest, null);
      canvas.dataset.motionPhase = inputs.motionMode.value;
      canvas.dataset.activeIndex = String((active?.index ?? 0) + 1);
      canvas.dataset.activeText = active?.text || "";
      canvas.dataset.itemCount = String(count);
      canvas.dataset.cycleDuration = cycleDuration().toFixed(3);
      canvas.dataset.direction = inputs.direction.value;
      canvas.dataset.focusX = focusX.toFixed(2);
      canvas.dataset.focusY = focusY.toFixed(2);
      canvas.dataset.focusScale = String(maxScale);
      canvas.dataset.timelineTime = time.toFixed(4);
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.dataset.ratio = String(ratio);
    }
  }

  function drawPreview(time = timelineTime()) {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`;
  }

  function previewLoop() {
    drawPreview();
    requestAnimationFrame(previewLoop);
  }

  function updateOutputs() {
    const values = {
      secondsPerItemOut: `${(Number(inputs.secondsPerItem.value) / 1000).toFixed(2)}秒`,
      fontSizeOut: `${inputs.fontSize.value}px`, lineGapOut: `${inputs.lineGap.value}px`, focusScaleOut: `${inputs.focusScale.value}%`,
      focusRadiusOut: `${inputs.focusRadius.value}%`, trackingOut: `${inputs.tracking.value}px`,
      horizontalPositionOut: `${inputs.horizontalPosition.value}%`, focusPositionOut: `${inputs.focusPosition.value}%`,
      perspectiveOut: `${inputs.perspective.value}%`, edgeFadeOut: `${inputs.edgeFade.value}%`, idleOpacityOut: `${inputs.idleOpacity.value}%`,
      maxBlurOut: `${inputs.maxBlur.value}px`, compressionOut: `${inputs.compression.value}%`, startPhaseOut: `${inputs.startPhase.value}%`,
      snapHoldOut: `${inputs.snapHold.value}%`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    inputs.snapHold.disabled = inputs.motionMode.value !== "snap";
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  inputs.items.addEventListener("input", () => setTime(timelineTime()));
  inputs.motionMode.addEventListener("change", updateOutputs);
  document.querySelectorAll("[data-align]").forEach((button) => button.addEventListener("click", () => {
    alignment = button.dataset.align;
    document.querySelectorAll("[data-align]").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
  $("#referencePreset").addEventListener("click", () => { inputs.items.value = referenceItems.join("\n"); restart(); });
  $("#chinesePreset").addEventListener("click", () => { inputs.items.value = chineseItems.join("\n"); inputs.font.value = "noto-sc"; restart(); });
  $("#reverseItems").addEventListener("click", () => { inputs.items.value = parseItems().reverse().join("\n"); restart(); });
  $("#restartButton").addEventListener("click", restart);
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; event.currentTarget.textContent = "暂停"; }
    else { pausedAt = timelineTime(); paused = true; event.currentTarget.textContent = "继续"; }
  });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(timelineTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(timelineTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });
  window.addEventListener("resize", resizeCanvas);

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }

  function makeExportCanvas(verticalHD = false) {
    const result = document.createElement("canvas");
    const [width, height] = verticalHD ? [1080, 1920] : exportDimensions();
    result.width = clamp(Math.round(width) || 1080, 240, 3840);
    result.height = clamp(Math.round(height) || 1080, 240, 3840);
    return result;
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
      downloadBlob(blob, `focus-wheel-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas();
    const exportFps = Number($("#exportFps").value) || 15;
    const duration = selectedDuration();
    const frameTotal = Math.max(1, Math.ceil(duration * exportFps));
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < frameTotal; frame += 1) {
      renderFrame(output, frame / exportFps, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / exportFps });
    }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `focus-wheel-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); });
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
    downloadBlob(blob, `focus-wheel-${output.width}x${output.height}.webm`);
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

  updateOutputs();
  document.fonts.ready.then(restart);
  previewLoop();
})();
