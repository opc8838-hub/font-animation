(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const LAYOUT = 240;
  const RATIO = {
    radius: 0.276,
    fontSize: 0.379,
    textInk: 1.024,
    sideBearing: 0.021,
    iconInset: 0.357,
    iconSize: 0.378,
    rightPad: 0.4,
    caretWidth: 0.024,
    caretHeight: 0.434,
    baselineNudge: 0.017
  };
  const TEXT_LEFT = (RATIO.textInk - RATIO.sideBearing) * LAYOUT;
  const ICON_GAP = TEXT_LEFT - RATIO.iconInset * LAYOUT - RATIO.iconSize * LAYOUT;
  const PAN_TRIGGER = 0.88;
  const PUNCTUATION = /[.,!?;:，。！？；：、]/;
  const inputs = {
    text: $("#searchText"),
    font: $("#fontFamily"),
    fontWeight: $("#fontWeight"),
    charsPerSecond: $("#charsPerSecond"),
    humanize: $("#humanize"),
    startDelay: $("#startDelay"),
    holdAfter: $("#holdAfter"),
    recedeDuration: $("#recedeDuration"),
    dolly: $("#dolly"),
    fieldHeight: $("#fieldHeight"),
    speed: $("#speed"),
    dollyDuration: $("#dollyDuration"),
    panDuration: $("#panDuration"),
    panEase: $("#panEase"),
    wordPause: $("#wordPause"),
    punctuationPause: $("#punctuationPause"),
    frontVisible: $("#frontVisible"),
    edgeInset: $("#edgeInset"),
    caretBlinks: $("#caretBlinks"),
    surface: $("#surface"),
    icon: $("#icon"),
    background: $("#backgroundColor"),
    foreground: $("#textColor"),
    caretEnabled: $("#caretEnabled")
  };
  const fontPresets = {
    "snap-inter-medium": { family: "Continuation Inter", weight: 300 },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 300 },
    "ib-manrope": { family: "CRManrope", weight: 300 },
    "ib-poppins": { family: "CRPoppins", weight: 400 },
    "fs-satoshi": { family: "Satoshi", weight: 300 },
    "fs-general-sans": { family: "General Sans", weight: 400 },
    "cn-noto-regular": { family: "Continuation SC", weight: 300 },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900 },
    "ib-sc-thin": { family: "CRSCThin", weight: 200 }
  };

  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const easeInOutSine = (value) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(value));
  const easeInOutCubic = (value) => {
    const x = clamp01(value);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);

  function hash01(seed) {
    let hash = 2166136261;
    const text = String(seed);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
  }

  function buildSchedule(chars, options) {
    const base = 1 / Math.max(0.1, options.charsPerSecond);
    const jitter = clamp01(options.humanize);
    const schedule = [0];
    let elapsed = 0;
    chars.forEach((char, index) => {
      const previous = index > 0 ? chars[index - 1] : "";
      let interval = base;
      if (previous === " ") interval *= options.wordPause;
      else if (previous && PUNCTUATION.test(previous)) interval *= options.punctuationPause;
      if (jitter > 0) {
        const random = hash01(`${options.seed}-key-${index}`) * 2 - 1;
        interval *= 1 + random * 0.35 * jitter;
      }
      elapsed += Math.max(0.001, interval);
      schedule.push(elapsed);
    });
    return schedule;
  }

  function typedCount(localTime, schedule) {
    if (localTime <= 0 || schedule.length <= 1) return 0;
    let count = 0;
    while (count + 1 < schedule.length && schedule[count + 1] <= localTime) count += 1;
    return count;
  }

  function caretOpacity(time, blinksPerSecond) {
    if (blinksPerSecond <= 0) return 1;
    const period = 1 / blinksPerSecond;
    const phase = mod(time, period) / period;
    const edge = 0.12;
    if (phase < 0.5 - edge) return 1;
    if (phase < 0.5) {
      const x = (phase - (0.5 - edge)) / edge;
      return 1 - x * x * (3 - 2 * x);
    }
    if (phase < 1 - edge) return 0;
    const x = (phase - (1 - edge)) / edge;
    return x * x * (3 - 2 * x);
  }

  function settings() {
    return {
      text: inputs.text.value.length ? inputs.text.value : "世界上最美的城市是哪里，今年最值得去的季节是什么",
      charsPerSecond: Number(inputs.charsPerSecond.value),
      humanize: Number(inputs.humanize.value) / 100,
      wordPause: Number(inputs.wordPause.value) / 100,
      punctuationPause: Number(inputs.punctuationPause.value) / 100,
      startDelay: Number(inputs.startDelay.value) / 1000,
      dollyDuration: Number(inputs.dollyDuration.value) / 1000,
      panDuration: Number(inputs.panDuration.value) / 1000,
      panEase: inputs.panEase.value,
      holdAfter: Number(inputs.holdAfter.value) / 1000,
      recedeDuration: Number(inputs.recedeDuration.value) / 1000,
      dolly: Number(inputs.dolly.value) / 100,
      fieldHeight: Number(inputs.fieldHeight.value) / 100,
      frontVisible: Number(inputs.frontVisible.value) / 100,
      edgeInset: Number(inputs.edgeInset.value),
      caretBlinks: Number(inputs.caretBlinks.value) / 10,
      speed: Number(inputs.speed.value) / 100,
      seed: "search-typing"
    };
  }

  function timeline(chars, options) {
    const schedule = buildSchedule(chars, options);
    const typing = schedule[schedule.length - 1] || 0;
    const typingStart = options.startDelay;
    const typingEnd = typingStart + typing;
    return {
      schedule,
      typingStart,
      typingEnd,
      dollyEnd: typingStart + options.dollyDuration,
      holdEnd: typingEnd + options.holdAfter,
      recedeEnd: typingEnd + options.holdAfter + options.recedeDuration
    };
  }

  function applyFont(context, fontPx) {
    const preset = fontPresets[inputs.font.value] || fontPresets["cn-noto-regular"];
    const weight = Number(inputs.fontWeight.value) || preset.weight;
    context.font = `${weight} ${fontPx}px "${preset.family}", "Continuation SC", "Noto Sans SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    return { preset, weight };
  }

  function measureAdvances(context, chars) {
    const advances = [0];
    let prefix = "";
    chars.forEach((char) => {
      prefix += char;
      advances.push(context.measureText(prefix).width);
    });
    return advances;
  }

  function drawSearchIcon(context, size, color) {
    const unit = size / 24;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 2.03 * unit;
    context.lineCap = "round";
    context.beginPath();
    context.arc(9 * unit, 9 * unit, 7.98 * unit, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(14.65 * unit, 14.65 * unit);
    context.lineTo(22.98 * unit, 22.98 * unit);
    context.stroke();
    context.restore();
  }

  function drawSparkle(context, size, color) {
    const unit = size / 24;
    context.save();
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(12 * unit, 2.6 * unit);
    context.lineTo(13.9 * unit, 9.1 * unit);
    context.lineTo(20.4 * unit, 11 * unit);
    context.lineTo(13.9 * unit, 12.9 * unit);
    context.lineTo(12 * unit, 19.4 * unit);
    context.lineTo(10.1 * unit, 12.9 * unit);
    context.lineTo(3.6 * unit, 11 * unit);
    context.lineTo(10.1 * unit, 9.1 * unit);
    context.closePath();
    context.fill();
    context.globalAlpha = 0.55;
    context.beginPath();
    context.moveTo(18.9 * unit, 16.4 * unit);
    context.lineTo(19.7 * unit, 19.1 * unit);
    context.lineTo(22.4 * unit, 19.9 * unit);
    context.lineTo(19.7 * unit, 20.7 * unit);
    context.lineTo(18.9 * unit, 23.4 * unit);
    context.lineTo(18.1 * unit, 20.7 * unit);
    context.lineTo(15.4 * unit, 19.9 * unit);
    context.lineTo(18.1 * unit, 19.1 * unit);
    context.closePath();
    context.fill();
    context.restore();
  }

  function fillRoundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    if (typeof context.roundRect === "function") context.roundRect(x, y, width, height, r);
    else {
      context.moveTo(x + r, y);
      context.arcTo(x + width, y, x + width, y + height, r);
      context.arcTo(x + width, y + height, x, y + height, r);
      context.arcTo(x, y + height, x, y, r);
      context.arcTo(x, y, x + width, y, r);
    }
    context.fill();
  }

  function strokeRoundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    if (typeof context.roundRect === "function") context.roundRect(x, y, width, height, r);
    else {
      context.moveTo(x + r, y);
      context.arcTo(x + width, y, x + width, y + height, r);
      context.arcTo(x + width, y + height, x, y + height, r);
      context.arcTo(x, y + height, x, y, r);
      context.arcTo(x, y, x + width, y, r);
    }
    context.stroke();
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    const options = settings();
    const chars = graphemes(options.text);
    const marks = timeline(chars, options);
    const clock = mod(time * options.speed, Math.max(0.05, marks.recedeEnd));
    const fontPx = RATIO.fontSize * LAYOUT;
    const { preset, weight } = applyFont(context, fontPx);
    const advances = measureAdvances(context, chars);
    const contentWidth = advances[advances.length - 1] || 0;
    const iconOn = inputs.icon.value !== "none";
    const naturalWidth = (iconOn ? TEXT_LEFT : RATIO.iconInset * LAYOUT) + contentWidth + RATIO.rightPad * LAYOUT;
    const pageWidth = Math.max(120, w - options.edgeInset * 2);
    const frontScale = (options.fieldHeight * h) / LAYOUT;
    const restScale = frontScale / Math.max(1.0001, options.dolly);
    const framedWidth = pageWidth / Math.max(0.05, Math.min(1, options.frontVisible)) / Math.max(0.05, frontScale);
    const fieldWidth = Math.max(naturalWidth, framedWidth);
    const count = typedCount(clock - marks.typingStart, marks.schedule);
    const caretX = advances[Math.min(count, advances.length - 1)] || 0;
    let triggerIndex = null;
    for (let index = 1; index < advances.length; index += 1) {
      if ((TEXT_LEFT + advances[index]) * frontScale > pageWidth * PAN_TRIGGER) {
        triggerIndex = index;
        break;
      }
    }
    const panStart = triggerIndex === null ? null : marks.typingStart + marks.schedule[triggerIndex];
    const panEnd = panStart === null ? 0 : panStart + options.panDuration;
    const push = marks.dollyEnd <= marks.typingStart
      ? (clock >= marks.typingStart ? 1 : 0)
      : easeInOutSine(clamp01((clock - marks.typingStart) / Math.max(0.0001, marks.dollyEnd - marks.typingStart)));
    const back = marks.recedeEnd <= marks.holdEnd
      ? 0
      : easeInOutCubic(clamp01((clock - marks.holdEnd) / Math.max(0.0001, marks.recedeEnd - marks.holdEnd)));
    const panRaw = panStart === null || panEnd <= panStart
      ? 0
      : clamp01((clock - panStart) / Math.max(0.0001, panEnd - panStart));
    const pan = options.panEase === "linear"
      ? panRaw
      : options.panEase === "sine"
        ? easeInOutSine(panRaw)
        : easeInOutCubic(panRaw);
    const forward = restScale + (frontScale - restScale) * push;
    const endScale = pageWidth / Math.max(1, fieldWidth);
    const scale = forward + (endScale - forward) * back;
    const originX = options.edgeInset + ((w - options.edgeInset - fieldWidth * scale) - options.edgeInset) * pan;
    const baselineY = LAYOUT / 2 + fontPx * 0.28 - RATIO.baselineNudge * LAYOUT;
    const glass = inputs.surface.value === "glass";
    const ink = glass ? "#111111" : inputs.foreground.value;
    const iconColor = glass ? "#111111" : inputs.foreground.value;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, w, h);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.save();
    context.translate(originX, (h - LAYOUT) / 2 + baselineY);
    context.scale(scale, scale);
    context.translate(0, -baselineY);

    const radius = RATIO.radius * LAYOUT;
    if (glass) {
      context.save();
      context.shadowColor = "rgba(9, 9, 12, 0.45)";
      context.shadowBlur = 0.12 * LAYOUT;
      context.shadowOffsetY = 0.045 * LAYOUT;
      const gradient = context.createLinearGradient(0, 0, 0, LAYOUT);
      gradient.addColorStop(0, "#C4C4C4");
      gradient.addColorStop(0.15, "#D6D6D6");
      gradient.addColorStop(0.3, "#E7E7E7");
      gradient.addColorStop(0.4, "#F3F3F3");
      gradient.addColorStop(0.5, "#FDFDFD");
      gradient.addColorStop(1, "#FDFDFD");
      context.fillStyle = gradient;
      fillRoundRect(context, 0, 0, fieldWidth, LAYOUT, radius);
      context.restore();
    } else {
      context.fillStyle = "#ffffff";
      fillRoundRect(context, 0, 0, fieldWidth, LAYOUT, radius);
      context.strokeStyle = "#c9c9cc";
      context.lineWidth = Math.max(1, 0.009 * LAYOUT);
      strokeRoundRect(context, 0, 0, fieldWidth, LAYOUT, radius);
    }

    const iconSize = RATIO.iconSize * LAYOUT;
    const iconX = RATIO.iconInset * LAYOUT;
    const iconY = (LAYOUT - iconSize) / 2;
    if (inputs.icon.value === "search") {
      context.save();
      context.translate(iconX, iconY);
      drawSearchIcon(context, iconSize, iconColor);
      context.restore();
    } else if (inputs.icon.value === "sparkle") {
      context.save();
      context.translate(iconX, iconY);
      drawSparkle(context, iconSize, iconColor);
      context.restore();
    }

    applyFont(context, fontPx);
    context.fillStyle = ink;
    context.save();
    context.beginPath();
    context.rect(TEXT_LEFT - 2, baselineY - fontPx * 1.05, Math.max(0, caretX) + 3, fontPx * 1.5);
    context.clip();
    context.fillText(chars.join(""), TEXT_LEFT, baselineY);
    context.restore();

    if (inputs.caretEnabled.checked) {
      const caretWidth = Math.max(1, RATIO.caretWidth * LAYOUT);
      const caretHeight = RATIO.caretHeight * LAYOUT;
      context.globalAlpha = caretOpacity(clock, options.caretBlinks);
      context.fillStyle = ink;
      context.fillRect(TEXT_LEFT + caretX, (LAYOUT - caretHeight) / 2, caretWidth, caretHeight);
      context.globalAlpha = 1;
    }

    context.restore();

    if (target === canvas) {
      const phase = clock < marks.typingStart ? "hold-start"
        : clock < marks.dollyEnd ? "dolly-type"
          : clock < marks.typingEnd ? (pan > 0 && pan < 1 ? "pan-type" : "type")
            : clock < marks.holdEnd ? "hold-end"
              : "recede";
      canvas.dataset.motionPhase = phase;
      canvas.dataset.typedCount = String(count);
      canvas.dataset.fontFamily = preset.family;
      canvas.dataset.fontWeight = String(weight);
      canvas.dataset.cameraPush = push.toFixed(4);
      canvas.dataset.cameraPan = pan.toFixed(4);
      canvas.dataset.cameraBack = back.toFixed(4);
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.dataset.ratio = String(ratio);
    }
  }

  function currentTime() { return paused ? pausedAt : (performance.now() - animationStart) / 1000; }
  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }
  function cycleLength() {
    const options = settings();
    const marks = timeline(graphemes(options.text), options);
    return Math.max(0.05, marks.recedeEnd / Math.max(0.05, options.speed));
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.round(mod(time, cycleLength()) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function syncPanPresets(seconds) {
    const ms = Math.round(seconds * 1000);
    document.querySelectorAll("[data-pan-ms]").forEach((button) => {
      const value = Number(button.dataset.panMs);
      button.setAttribute("aria-pressed", String(Math.abs(value - ms) <= 25));
    });
  }

  function formatSeconds(seconds) {
    if (seconds < 1) return `${seconds.toFixed(2)}秒`;
    return `${seconds.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}秒`;
  }

  function updateOutputs() {
    const options = settings();
    $("#charsPerSecondOut").textContent = `${options.charsPerSecond} 字/秒`;
    $("#humanizeOut").textContent = `${Math.round(options.humanize * 100)}%`;
    $("#startDelayOut").textContent = formatSeconds(options.startDelay);
    $("#holdAfterOut").textContent = formatSeconds(options.holdAfter);
    $("#recedeDurationOut").textContent = formatSeconds(options.recedeDuration);
    $("#dollyOut").textContent = `${options.dolly.toFixed(2)}×`;
    $("#fieldHeightOut").textContent = `${Math.round(options.fieldHeight * 100)}%`;
    $("#speedOut").textContent = `${options.speed.toFixed(2)}×`;
    $("#dollyDurationOut").textContent = formatSeconds(options.dollyDuration);
    $("#panDurationOut").textContent = formatSeconds(options.panDuration);
    syncPanPresets(options.panDuration);
    $("#wordPauseOut").textContent = `${options.wordPause.toFixed(2)}×`;
    $("#punctuationPauseOut").textContent = `${options.punctuationPause.toFixed(2)}×`;
    $("#frontVisibleOut").textContent = `${Math.round(options.frontVisible * 100)}%`;
    $("#edgeInsetOut").textContent = `${options.edgeInset}px`;
    $("#caretBlinksOut").textContent = `${options.caretBlinks.toFixed(1)} 次/秒`;
  }

  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", () => {
      updateOutputs();
      if (input === inputs.text || input === inputs.startDelay || input === inputs.holdAfter || input === inputs.recedeDuration || input === inputs.speed || input === inputs.panDuration || input === inputs.panEase) {
        setTime(0);
      }
    });
  });
  document.querySelectorAll("[data-pan-ms]").forEach((button) => {
    button.addEventListener("click", () => {
      inputs.panDuration.value = button.dataset.panMs;
      updateOutputs();
      setTime(0);
    });
  });
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
      downloadBlob(blob, `search-typing-${output.width}x${output.height}.png`);
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
      downloadBlob(blob, `search-typing-${output.width}x${output.height}.gif`);
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
    encoder.outputFilename = `search-typing-${width}x${height}.mp4`;
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
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), `search-typing-${width}x${height}.mp4`);
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
