(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    beforeLabel: $("#beforeLabel"),
    afterLabel: $("#afterLabel"),
    compareHold: $("#compareHold"),
    generateDuration: $("#generateDuration"),
    resultHold: $("#resultHold"),
    speed: $("#speed"),
    blankHold: $("#blankHold"),
    dropDuration: $("#dropDuration"),
    morphDuration: $("#morphDuration"),
    cutSoft: $("#cutSoft"),
    radius: $("#radius"),
    pagePad: $("#pagePad"),
    compareBg: $("#compareBg"),
    generateBg: $("#generateBg"),
    labelColor: $("#labelColor"),
    ringColor: $("#ringColor")
  };

  const photos = { before: null, after: null };
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpColor = (a, b, t) => {
    const pa = hexToRgb(a);
    const pb = hexToRgb(b);
    return `rgb(${Math.round(lerp(pa[0], pb[0], t))},${Math.round(lerp(pa[1], pb[1], t))},${Math.round(lerp(pa[2], pb[2], t))})`;
  };
  const hexToRgb = (hex) => {
    const raw = String(hex || "#000000").replace("#", "");
    const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.padEnd(6, "0");
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const easeInOutCubic = (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

  function settings() {
    return {
      beforeLabel: inputs.beforeLabel.value.trim() || "BEFORE",
      afterLabel: inputs.afterLabel.value.trim() || "AFTER",
      compareHold: Number(inputs.compareHold.value) / 1000,
      generateDuration: Number(inputs.generateDuration.value) / 1000,
      resultHold: Number(inputs.resultHold.value) / 1000,
      speed: Number(inputs.speed.value) / 100,
      blankHold: Number(inputs.blankHold.value) / 1000,
      dropDuration: Number(inputs.dropDuration.value) / 1000,
      morphDuration: Number(inputs.morphDuration.value) / 1000,
      cutSoft: Number(inputs.cutSoft.value) / 1000,
      radius: Number(inputs.radius.value),
      pagePad: Number(inputs.pagePad.value) / 100,
      compareBg: inputs.compareBg.value,
      generateBg: inputs.generateBg.value,
      labelColor: inputs.labelColor.value,
      ringColor: inputs.ringColor.value
    };
  }

  function marks(options) {
    const dropEnd = options.blankHold + options.dropDuration;
    const compareEnd = dropEnd + options.compareHold;
    const morphEnd = compareEnd + options.morphDuration;
    const generateEnd = morphEnd + options.generateDuration;
    const resultEnd = generateEnd + options.resultHold;
    return { dropEnd, compareEnd, morphEnd, generateEnd, resultEnd };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => loadImage(reader.result).then(resolve, reject);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function roundRect(context, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawCover(context, image, x, y, w, h, radius) {
    if (!image || w <= 1 || h <= 1) return;
    context.save();
    roundRect(context, x, y, w, h, radius);
    context.clip();
    const scale = Math.max(w / image.width, h / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    context.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    context.restore();
  }

  function drawEmpty(context, x, y, w, h, radius, color) {
    context.save();
    context.setLineDash([8, 7]);
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    roundRect(context, x, y, w, h, radius);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = color;
    context.font = `500 ${Math.max(12, w * 0.045)}px "Satoshi", "General Sans", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("+", x + w / 2, y + h / 2 - 8);
    context.font = `500 ${Math.max(10, w * 0.032)}px "Satoshi", "General Sans", sans-serif`;
    context.fillText("上传", x + w / 2, y + h / 2 + 12);
    context.restore();
  }

  function drawLabel(context, text, cx, y, color, size) {
    context.save();
    context.fillStyle = color;
    context.font = `600 ${size}px "Satoshi", "Noto Sans SC", sans-serif`;
    context.letterSpacing = `${Math.max(2, size * 0.28)}px`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, cx, y);
    context.restore();
  }

  function drawRing(context, cx, cy, radius, progress, color) {
    const start = -Math.PI / 2;
    context.save();
    context.lineWidth = Math.max(4, radius * 0.09);
    context.lineCap = "round";
    context.strokeStyle = "rgba(255,255,255,0.28)";
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = color;
    context.beginPath();
    context.arc(cx, cy, radius, start, start + Math.PI * 2 * clamp01(progress));
    context.stroke();
    context.fillStyle = "#fff";
    context.font = `600 ${Math.round(radius * 0.42)}px "Satoshi", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${Math.round(clamp01(progress) * 100)}%`, cx, cy + 1);
    context.restore();
  }

  function compareLayout(w, h, options) {
    const pad = options.pagePad * Math.min(w, h);
    const labelH = Math.max(22, h * 0.038);
    const gap = Math.max(10, h * 0.018);
    const innerW = w - pad * 2;
    const innerH = h - pad * 2 - labelH * 2 - gap * 3;
    const cardH = innerH / 2;
    const top = pad;
    return {
      beforeLabelY: top + labelH / 2,
      before: { x: pad, y: top + labelH + gap * 0.4, w: innerW, h: cardH },
      afterLabelY: top + labelH + gap * 0.4 + cardH + gap + labelH / 2,
      after: { x: pad, y: top + labelH * 2 + gap * 1.4 + cardH, w: innerW, h: cardH }
    };
  }

  function generateCard(w, h, options) {
    const pad = options.pagePad * Math.min(w, h) * 0.85;
    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const ratio = 0.72;
    let cw = maxW;
    let ch = cw / ratio;
    if (ch > maxH) {
      ch = maxH;
      cw = ch * ratio;
    }
    return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
  }

  function mixRect(a, b, t) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      w: lerp(a.w, b.w, t),
      h: lerp(a.h, b.h, t)
    };
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    const options = settings();
    const line = marks(options);
    const clock = mod(time * options.speed, Math.max(0.05, line.resultEnd));
    const layout = compareLayout(w, h, options);
    const card = generateCard(w, h, options);
    const radius = options.radius * Math.min(w, h) / 720;

    let phase = "blank";
    let drop = 0;
    let morph = 0;
    let progress = 0;
    let reveal = 0;
    if (clock >= line.generateEnd) {
      phase = "result";
      progress = 1;
      morph = 1;
      drop = 1;
      reveal = clamp01((clock - line.generateEnd) / Math.max(0.0001, options.cutSoft));
    } else if (clock >= line.morphEnd) {
      phase = "generate";
      drop = 1;
      morph = 1;
      progress = clamp01((clock - line.morphEnd) / Math.max(0.0001, options.generateDuration));
    } else if (clock >= line.compareEnd) {
      phase = "morph";
      drop = 1;
      morph = easeInOutCubic((clock - line.compareEnd) / Math.max(0.0001, options.morphDuration));
    } else if (clock >= options.blankHold) {
      phase = clock >= line.dropEnd ? "compare" : "drop";
      drop = easeOutCubic((clock - options.blankHold) / Math.max(0.0001, options.dropDuration));
    }

    const page = lerpColor(options.compareBg, options.generateBg, morph);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = page;
    context.fillRect(0, 0, w, h);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const beforeRect = mixRect(layout.before, card, morph);
    const afterStart = {
      x: layout.after.x,
      y: layout.after.y + (1 - drop) * 36,
      w: layout.after.w,
      h: layout.after.h
    };
    const fly = {
      x: lerp(w * 0.58, layout.before.x, drop),
      y: lerp(h * 0.62, layout.before.y, drop),
      w: lerp(layout.before.w * 0.42, layout.before.w, drop),
      h: lerp(layout.before.h * 0.42, layout.before.h, drop)
    };
    const shownBefore = phase === "blank" ? layout.before : (phase === "drop" ? fly : beforeRect);

    const labelAlpha = (phase === "drop" || phase === "compare" ? drop : 1 - morph);
    const afterAlpha = phase === "result" ? 0 : (phase === "blank" ? 0 : drop * (1 - morph));
    const emptyAlpha = phase === "blank" ? 1 : (phase === "drop" ? 1 - drop : 0);

    if (emptyAlpha > 0.02) {
      context.globalAlpha = emptyAlpha;
      drawEmpty(context, layout.before.x, layout.before.y, layout.before.w, layout.before.h, radius, "#8d8d92");
      drawEmpty(context, layout.after.x, layout.after.y, layout.after.w, layout.after.h, radius, "#8d8d92");
      context.globalAlpha = 1;
    }

    if (labelAlpha > 0.02) {
      context.globalAlpha = labelAlpha;
      const labelColor = morph > 0.4 ? "#f3f3f3" : options.labelColor;
      drawLabel(context, options.beforeLabel, w / 2, layout.beforeLabelY, labelColor, Math.max(13, h * 0.022));
      drawLabel(context, options.afterLabel, w / 2, layout.afterLabelY, labelColor, Math.max(13, h * 0.022));
      context.globalAlpha = 1;
    }

    if (afterAlpha > 0.02) {
      context.globalAlpha = afterAlpha;
      if (photos.after) drawCover(context, photos.after, afterStart.x, afterStart.y, afterStart.w, afterStart.h, radius);
      else drawEmpty(context, afterStart.x, afterStart.y, afterStart.w, afterStart.h, radius, "#8d8d92");
      context.globalAlpha = 1;
    }

    if (drop > 0.02 && reveal < 0.999) {
      context.globalAlpha = 1 - reveal;
      if (photos.before) drawCover(context, photos.before, shownBefore.x, shownBefore.y, shownBefore.w, shownBefore.h, radius);
      else if (phase !== "blank") drawEmpty(context, shownBefore.x, shownBefore.y, shownBefore.w, shownBefore.h, radius, "#8d8d92");
      context.globalAlpha = 1;
    }

    if ((phase === "generate" || (phase === "result" && reveal < 1)) && progress > 0) {
      context.globalAlpha = 1 - reveal;
      const ringR = Math.min(shownBefore.w, shownBefore.h) * 0.16;
      drawRing(context, shownBefore.x + shownBefore.w / 2, shownBefore.y + shownBefore.h / 2, ringR, easeOutCubic(progress), options.ringColor);
      context.globalAlpha = 1;
    }

    if (reveal > 0.001 && photos.after) {
      context.globalAlpha = reveal;
      drawCover(context, photos.after, 0, 0, w, h, radius * 0.4);
      context.globalAlpha = 1;
    }

    if (target === canvas) {
      canvas.dataset.motionPhase = phase;
      canvas.dataset.progress = progress.toFixed(3);
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
    return Math.max(0.05, marks(options).resultEnd / Math.max(0.05, options.speed));
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    renderFrame(canvas, currentTime(), canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.round(mod(currentTime(), cycleLength()) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function formatSeconds(seconds) {
    if (seconds < 1) return `${seconds.toFixed(2)}秒`;
    return `${seconds.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}秒`;
  }

  function updateOutputs() {
    const options = settings();
    $("#compareHoldOut").textContent = formatSeconds(options.compareHold);
    $("#generateDurationOut").textContent = formatSeconds(options.generateDuration);
    $("#resultHoldOut").textContent = formatSeconds(options.resultHold);
    $("#speedOut").textContent = `${options.speed.toFixed(2)}×`;
    $("#blankHoldOut").textContent = formatSeconds(options.blankHold);
    $("#dropDurationOut").textContent = formatSeconds(options.dropDuration);
    $("#morphDurationOut").textContent = formatSeconds(options.morphDuration);
    $("#cutSoftOut").textContent = formatSeconds(options.cutSoft);
    $("#radiusOut").textContent = `${options.radius}px`;
    $("#pagePadOut").textContent = `${Math.round(options.pagePad * 100)}%`;
  }

  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", () => {
      updateOutputs();
      if (input !== inputs.radius && input !== inputs.pagePad && !String(input.type).includes("color")) setTime(0);
    });
  });

  async function onUpload(kind, file) {
    if (!file) return;
    photos[kind] = await fileToImage(file);
    $(kind === "before" ? "#beforeName" : "#afterName").textContent = file.name;
    setTime(0);
  }
  $("#beforeFile").addEventListener("change", (event) => onUpload("before", event.target.files[0]));
  $("#afterFile").addEventListener("change", (event) => onUpload("after", event.target.files[0]));

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
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function setExportBusy(busy, message) {
    ["exportPng", "exportGif", "exportVideo", "exportVerticalVideo"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = busy;
    });
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
      downloadBlob(blob, `before-after-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。";
      return;
    }
    const output = makeExportCanvas();
    const gifFps = 12;
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
      downloadBlob(blob, `before-after-${output.width}x${output.height}.gif`);
      setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height}`);
    });
    gif.render();
  });

  function recordVideo(width, height) {
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const stream = output.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      downloadBlob(new Blob(chunks, { type: "video/webm" }), `before-after-${width}x${height}.webm`);
      setExportBusy(false, `视频已生成 · ${width} × ${height}`);
    };
    const duration = cycleLength();
    const total = Math.ceil(duration * fps);
    setExportBusy(true, `正在导出视频 · 0 / ${total} 帧`);
    recorder.start();
    let frame = 0;
    const step = () => {
      renderFrame(output, frame / fps, width, height, 1);
      frame += 1;
      exportStatus.textContent = `正在导出视频 · ${frame} / ${total} 帧`;
      if (frame >= total) recorder.stop();
      else requestAnimationFrame(step);
    };
    step();
  }
  $("#exportVideo").addEventListener("click", () => {
    const [width, height] = exportDimensions();
    recordVideo(Math.max(240, width), Math.max(240, height));
  });
  $("#exportVerticalVideo").addEventListener("click", () => recordVideo(1080, 1920));

  Promise.all([
    loadImage("assets/beforeafter-before.jpg"),
    loadImage("assets/beforeafter-after.jpg")
  ]).then(([before, after]) => {
    photos.before = before;
    photos.after = after;
  }).catch(() => {});

  updateOutputs();
  previewLoop();
})();
