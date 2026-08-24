(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const DOODLES = ["orb", "stroke", "squiggle", "note", "spark", "moon", "blob", "wave"];
  const inputs = {
    title: $("#titleText"),
    font: $("#fontFamily"),
    fontWeight: $("#fontWeight"),
    flyDuration: $("#flyDuration"),
    colorHold: $("#colorHold"),
    flattenDuration: $("#flattenDuration"),
    holdDuration: $("#holdDuration"),
    iconMix: $("#iconMix"),
    speed: $("#speed"),
    background: $("#backgroundColor"),
    foreground: $("#textColor"),
    leadingMark: $("#leadingMark"),
    scatterDuration: $("#scatterDuration"),
    spreadX: $("#spreadX"),
    spreadY: $("#spreadY"),
    fontSize: $("#fontSize"),
    tracking: $("#tracking"),
    stagger: $("#stagger")
  };
  const paletteInputs = [...document.querySelectorAll(".palette-color")];
  const fontPresets = {
    "snap-inter-medium": { family: "Continuation Inter", weight: 700 },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 700 },
    "ib-manrope": { family: "CRManrope", weight: 700 },
    "ib-poppins": { family: "CRPoppins", weight: 400 },
    "fs-satoshi": { family: "Satoshi", weight: 700 },
    "cn-noto-regular": { family: "Continuation SC", weight: 400 },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900 },
    "ib-sc-thin": { family: "CRSCThin", weight: 200 }
  };

  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;
  const mixHex = (from, to, progress) => {
    const parse = (hex) => {
      const value = hex.replace("#", "");
      return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16)
      ];
    };
    const a = parse(from);
    const b = parse(to);
    const t = clamp01(progress);
    return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
  };
  const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const smoother = (value) => {
    const x = clamp01(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);
  const seeded = (seed) => {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };

  function palette() {
    const colors = paletteInputs.map((input) => input.value).filter(Boolean);
    return colors.length ? colors : ["#34c759", "#ff9f0a", "#bf5af2", "#ffd60a"];
  }

  function cycleLength() {
    const speed = Math.max(0.4, Number(inputs.speed.value) / 100);
    const seconds = (
      Number(inputs.scatterDuration.value) +
      Number(inputs.flyDuration.value) +
      Number(inputs.colorHold.value) +
      Number(inputs.flattenDuration.value) +
      Number(inputs.holdDuration.value)
    ) / 1000;
    return Math.max(0.4, seconds / speed);
  }

  function phases(localTime) {
    const speed = Math.max(0.4, Number(inputs.speed.value) / 100);
    const scatter = Number(inputs.scatterDuration.value) / 1000 / speed;
    const fly = Number(inputs.flyDuration.value) / 1000 / speed;
    const colorHold = Number(inputs.colorHold.value) / 1000 / speed;
    const flatten = Number(inputs.flattenDuration.value) / 1000 / speed;
    const hold = Number(inputs.holdDuration.value) / 1000 / speed;
    const scatterEnd = scatter;
    const flyEnd = scatterEnd + fly;
    const colorEnd = flyEnd + colorHold;
    const flattenEnd = colorEnd + flatten;
    return { scatter, fly, colorHold, flatten, hold, scatterEnd, flyEnd, colorEnd, flattenEnd, t: localTime };
  }

  function applyFont(context, fontPx) {
    const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const weight = Number(inputs.fontWeight.value) || preset.weight;
    context.font = `${weight} ${fontPx}px "${preset.family}", "Continuation SC", "Noto Sans SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    return { preset, weight };
  }

  function buildSlots(context, fontPx) {
    const raw = (inputs.title.value || "Creator Studio").replace(/\n/g, " ");
    const chars = graphemes(raw);
    const tracking = Number(inputs.tracking.value);
    const colors = palette();
    const iconMix = Number(inputs.iconMix.value) / 100;
    const items = [];
    if (inputs.leadingMark.checked) {
      items.push({ glyph: "", mark: true, width: fontPx * 0.92 });
    }
    chars.forEach((glyph) => {
      const width = Math.max(context.measureText(glyph).width, glyph === " " ? fontPx * 0.32 : 0);
      items.push({ glyph, mark: false, width: width + tracking });
    });
    const total = items.reduce((sum, item) => sum + item.width, 0);
    let cursor = -total / 2;
    return items.map((item, index) => {
      const seed = index * 17.13 + 4.2;
      const isSpace = item.glyph === " ";
      const useDoodle = !item.mark && !isSpace && seeded(seed) < iconMix;
      const slot = {
        ...item,
        x: cursor + item.width / 2,
        color: colors[Math.floor(seeded(seed + 3) * colors.length) % colors.length],
        doodle: item.mark ? "orb" : (useDoodle ? DOODLES[Math.floor(seeded(seed + 8) * DOODLES.length) % DOODLES.length] : ""),
        startX: (seeded(seed + 1) - 0.5) * 0.7,
        startY: (seeded(seed + 2) - 0.5) * 0.55,
        startRot: (seeded(seed + 5) - 0.5) * 0.35,
        startScale: 0.82 + seeded(seed + 6) * 0.28,
        delay: index * Number(inputs.stagger.value) / 1000
      };
      cursor += item.width;
      return slot;
    });
  }

  function drawDoodle(context, kind, size, color) {
    const s = size;
    context.save();
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = Math.max(2, s * 0.11);
    if (kind === "orb") {
      context.beginPath();
      context.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      context.fill();
    } else if (kind === "stroke") {
      context.rotate(-0.7);
      context.beginPath();
      context.ellipse(0, 0, s * 0.07, s * 0.42, 0, 0, Math.PI * 2);
      context.fill();
    } else if (kind === "squiggle") {
      context.beginPath();
      context.moveTo(-s * 0.34, s * 0.12);
      context.bezierCurveTo(-s * 0.1, -s * 0.42, s * 0.08, s * 0.42, s * 0.36, -s * 0.08);
      context.stroke();
    } else if (kind === "note") {
      context.beginPath();
      context.ellipse(-s * 0.12, s * 0.18, s * 0.16, s * 0.12, -0.4, 0, Math.PI * 2);
      context.fill();
      context.fillRect(s * 0.02, -s * 0.36, s * 0.07, s * 0.5);
    } else if (kind === "spark") {
      context.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI / 4) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? s * 0.4 : s * 0.16;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
    } else if (kind === "moon") {
      context.beginPath();
      context.arc(0, 0, s * 0.34, 0.35, Math.PI * 1.85);
      context.arc(s * 0.14, -s * 0.06, s * 0.24, Math.PI * 1.7, 0.55, true);
      context.closePath();
      context.fill();
    } else if (kind === "blob") {
      context.beginPath();
      context.ellipse(0, 0, s * 0.28, s * 0.4, 0.4, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(-s * 0.36, s * 0.08);
      context.quadraticCurveTo(-s * 0.12, -s * 0.28, 0, s * 0.04);
      context.quadraticCurveTo(s * 0.14, s * 0.3, s * 0.36, -s * 0.06);
      context.stroke();
    }
    context.restore();
  }

  function slotProgress(localTime, slot, timing) {
    const pop = slot.delay / Math.max(0.4, Number(inputs.speed.value) / 100);
    const appearStart = Math.min(pop, timing.flyEnd * 0.85);
    const appear = smoother(clamp01((localTime - appearStart) / 0.09));
    const fly = easeOutCubic(clamp01((localTime - appearStart) / Math.max(0.12, timing.fly * 0.55)));
    const flatten = localTime <= timing.colorEnd
      ? 0
      : smoother(clamp01((localTime - timing.colorEnd) / Math.max(0.0001, timing.flatten)));
    return { fly, flatten, appear };
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, w, h);

    const localTime = mod(time, cycleLength());
    const timing = phases(localTime);
    const fontPx = Math.max(18, Math.min(w, h) * Number(inputs.fontSize.value) / 100);
    applyFont(context, fontPx);
    const slots = buildSlots(context, fontPx);
    const lineWidth = slots.reduce((sum, slot) => sum + slot.width, 0);
    const fit = Math.min(1, (w * 0.86) / Math.max(1, lineWidth));
    const size = fontPx * fit;
    applyFont(context, size);
    const fitted = buildSlots(context, size);
    const spreadX = w * Number(inputs.spreadX.value) / 100;
    const spreadY = h * Number(inputs.spreadY.value) / 100;
    const ink = inputs.foreground.value;

    context.save();
    context.translate(w / 2, h / 2);
    fitted.forEach((slot) => {
      const progress = slotProgress(localTime, slot, timing);
      if (progress.appear <= 0.01) return;
      const x = lerp(slot.startX * spreadX, slot.x, progress.fly);
      const y = lerp(slot.startY * spreadY, 0, progress.fly);
      const rotation = lerp(slot.startRot, 0, progress.fly);
      const scale = lerp(slot.startScale, 1, progress.fly);
      const color = mixHex(slot.color, ink, progress.flatten);
      const showDoodle = (slot.mark || slot.doodle) && progress.flatten < 0.92;
      context.save();
      context.globalAlpha = progress.appear;
      context.translate(x, y);
      context.rotate(rotation);
      context.scale(scale, scale);
      if (slot.mark) {
        if (progress.flatten < 0.5) drawDoodle(context, "orb", size, color);
        else {
          context.fillStyle = ink;
          context.beginPath();
          context.arc(0, 0, size * 0.32, 0, Math.PI * 2);
          context.fill();
        }
      } else if (slot.glyph === " ") {
        context.restore();
        return;
      } else if (showDoodle && slot.doodle) {
        context.globalAlpha *= 1 - progress.flatten;
        drawDoodle(context, slot.doodle, size, slot.color);
        context.globalAlpha = progress.appear * progress.flatten;
        context.fillStyle = color;
        const glyphWidth = context.measureText(slot.glyph).width;
        context.fillText(slot.glyph, -glyphWidth / 2, 0);
      } else {
        context.fillStyle = color;
        const glyphWidth = context.measureText(slot.glyph).width;
        context.fillText(slot.glyph, -glyphWidth / 2, 0);
      }
      context.restore();
    });
    context.restore();
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.dataset.ratio = String(dpr);
    }
  }

  function currentTime() {
    return paused ? pausedAt : (performance.now() - animationStart) / 1000;
  }

  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.round(mod(time, cycleLength()) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function formatSeconds(seconds) {
    return `${seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1)}秒`;
  }

  function updateOutputs() {
    const values = {
      flyOut: formatSeconds(Number(inputs.flyDuration.value) / 1000),
      colorHoldOut: formatSeconds(Number(inputs.colorHold.value) / 1000),
      flattenOut: formatSeconds(Number(inputs.flattenDuration.value) / 1000),
      holdOut: formatSeconds(Number(inputs.holdDuration.value) / 1000),
      iconMixOut: `${inputs.iconMix.value}%`,
      speedOut: `${(Number(inputs.speed.value) / 100).toFixed(2)}×`,
      scatterOut: formatSeconds(Number(inputs.scatterDuration.value) / 1000),
      spreadXOut: `${inputs.spreadX.value}%`,
      spreadYOut: `${inputs.spreadY.value}%`,
      fontSizeOut: `${inputs.fontSize.value}%`,
      trackingOut: inputs.tracking.value,
      staggerOut: `${inputs.stagger.value}ms`
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", updateOutputs);
  });
  paletteInputs.forEach((input) => input.addEventListener("input", updateOutputs));

  $("#restartButton").addEventListener("click", () => setTime(0));
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
      event.currentTarget.textContent = "暂停";
    } else {
      pausedAt = currentTime();
      paused = true;
      event.currentTarget.textContent = "继续";
    }
  });
  $("#backButton").addEventListener("click", () => {
    paused = true;
    setTime(currentTime() - 1 / fps);
    $("#pauseButton").textContent = "继续";
  });
  $("#forwardButton").addEventListener("click", () => {
    paused = true;
    setTime(currentTime() + 1 / fps);
    $("#pauseButton").textContent = "继续";
  });

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }
  function makeExportCanvas() {
    const [width, height] = exportDimensions();
    const result = document.createElement("canvas");
    result.width = Math.max(240, Math.min(3840, width));
    result.height = Math.max(240, Math.min(3840, height));
    return result;
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
  $("#exportPreset").addEventListener("change", (event) => {
    $("#customSize").hidden = event.currentTarget.value !== "custom";
  });
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `assemble-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。";
      return;
    }
    const output = makeExportCanvas();
    const gifFps = 15;
    const duration = cycleLength();
    const frameTotal = Math.ceil(duration * gifFps);
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: output.width,
      height: output.height,
      workerScript: "js/continuation-gif.worker.js"
    });
    for (let frame = 0; frame < frameTotal; frame += 1) {
      renderFrame(output, frame / gifFps, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
    }
    gif.on("progress", (progress) => {
      exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`;
    });
    gif.on("finished", (blob) => {
      downloadBlob(blob, `assemble-${output.width}x${output.height}.gif`);
      setExportBusy(false, "GIF 已生成");
    });
    gif.render();
  });
  async function exportVideo(verticalHD) {
    if (!window.HME || typeof HME.createH264MP4Encoder !== "function") {
      setExportBusy(false, "MP4 编码器未加载，请刷新后重试。");
      return;
    }
    let width;
    let height;
    if (verticalHD) {
      width = 1080;
      height = 1920;
    } else {
      [width, height] = exportDimensions();
    }
    width = Math.max(240, Math.min(3840, Math.round(width / 2) * 2));
    height = Math.max(240, Math.min(3840, Math.round(height / 2) * 2));
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { willReadFrequently: true });
    const duration = cycleLength();
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    setExportBusy(true, `正在导出 MP4 ${width} × ${height} · 0%`);
    const encoder = await HME.createH264MP4Encoder();
    encoder.outputFilename = `assemble-${width}x${height}.mp4`;
    encoder.width = width;
    encoder.height = height;
    encoder.frameRate = fps;
    encoder.kbps = 20000;
    encoder.groupOfPictures = 15;
    encoder.initialize();
    try {
      for (let frame = 0; frame < frameCount; frame += 1) {
        renderFrame(output, frame / fps, width, height, 1);
        encoder.addFrameRgba(context.getImageData(0, 0, width, height).data);
        if (frame % 2 === 0) {
          exportStatus.textContent = `正在导出 MP4 ${width} × ${height} · ${Math.round((frame + 1) / frameCount * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), `assemble-${width}x${height}.mp4`);
      setExportBusy(false, `MP4 已生成 · ${width} × ${height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder.delete(); } catch (_) {}
    }
  }
  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  document.fonts.ready.then(() => setTime(0));
  updateOutputs();
  previewLoop();
})();
