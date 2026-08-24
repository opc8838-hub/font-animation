(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const colorValue = (id, fallback) => {
    const field = document.getElementById(id);
    const value = field && String(field.value || "").trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
  };
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const schemeStatus = $("#schemeStatus");
  const fps = 30;
  const SAVE_KEY = "me-beforeafter-preset";
  const inputs = {
    beforeLabel: $("#beforeLabel"),
    afterLabel: $("#afterLabel"),
    beforeFont: $("#beforeFont"),
    afterFont: $("#afterFont"),
    labelSize: $("#labelSize"),
    labelTracking: $("#labelTracking"),
    labelPad: $("#labelPad"),
    beforeShift: $("#beforeShift"),
    afterShift: $("#afterShift"),
    frameScale: $("#frameScale"),
    compareHold: $("#compareHold"),
    generateDuration: $("#generateDuration"),
    hundredHold: $("#hundredHold"),
    resultHold: $("#resultHold"),
    speed: $("#speed"),
    pageSwitch: $("#pageSwitch"),
    uploadHold: $("#uploadHold"),
    dropDuration: $("#dropDuration"),
    cutSoft: $("#cutSoft"),
    radius: $("#radius"),
    pagePad: $("#pagePad"),
    compareBg: $("#compareBg"),
    beforeColor: $("#beforeColor"),
    afterColor: $("#afterColor"),
    ringColor: $("#ringColor"),
    percentColor: $("#percentColor"),
    beforePanX: $("#beforePanX"),
    beforePanY: $("#beforePanY"),
    afterPanX: $("#afterPanX"),
    afterPanY: $("#afterPanY"),
    sliderEnabled: $("#sliderEnabled"),
    sliderStart: $("#sliderStart"),
    sliderEnd: $("#sliderEnd"),
    sliderDuration: $("#sliderDuration"),
    sliderHold: $("#sliderHold"),
    sliderMode: $("#sliderMode"),
    sliderHandleSize: $("#sliderHandleSize"),
    sliderLineColor: $("#sliderLineColor")
  };

  const fontMap = {
    archivoBlack: "IBArchivoBlack", robotoCondensed: "IBRobotoCondensed", space: "IBSpace", work: "IBWork", serif: "IBLora", mono: "IBMono",
    scRegular: "IBSCRegular", scBlack: "IBSCBlack", fenix: "IBFenix", spaceMonoBold: "IBSpaceMonoBold",
    vollkornBoldItalic: "IBVollkornBoldItalic", cairoBold: "IBCairoBold", aguafina: "IBAguafina",
    manrope: "IBManrope", spartan: "IBSpartan", cinzel: "IBCinzel",
    instrument: "IBInstrument", bebas: "IBBebas", poppins: "IBPoppins",
    rajdhani: "IBRajdhani", teko: "IBTeko", khand: "IBKhand", fraunces: "IBFraunces",
    scThin: "IBSCThin", jpThin: "IBJPThin", jpBlack: "IBJPBlack", krBlack: "IBKRBlack"
  };

  const photos = { before: null, after: null };
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let sliderOverride = null;
  let dragPointerId = null;
  let autoSaveTimer = 0;

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
      beforeLabel: inputs.beforeLabel.value,
      afterLabel: inputs.afterLabel.value,
      beforeFont: window.STGFontLibrary?.preset(inputs.beforeFont.value)?.family || fontMap[inputs.beforeFont.value] || "IBSpace",
      afterFont: window.STGFontLibrary?.preset(inputs.afterFont.value)?.family || fontMap[inputs.afterFont.value] || "IBSpace",
      labelSize: Number(inputs.labelSize.value) / 100,
      labelTracking: Number(inputs.labelTracking.value),
      labelPad: Number(inputs.labelPad.value),
      beforeShift: Number(inputs.beforeShift.value) / 100,
      afterShift: Number(inputs.afterShift.value) / 100,
      frameScale: Number(inputs.frameScale.value) / 100,
      compareHold: Number(inputs.compareHold.value) / 1000,
      generateDuration: Number(inputs.generateDuration.value) / 1000,
      hundredHold: Number(inputs.hundredHold.value) / 1000,
      resultHold: Number(inputs.resultHold.value) / 1000,
      speed: Number(inputs.speed.value) / 100,
      pageSwitch: Number(inputs.pageSwitch.value) / 1000,
      uploadHold: Number(inputs.uploadHold.value) / 1000,
      dropDuration: Number(inputs.dropDuration.value) / 1000,
      cutSoft: Number(inputs.cutSoft.value) / 1000,
      radius: Number(inputs.radius.value),
      pagePad: Number(inputs.pagePad.value) / 100,
      compareBg: colorValue("compareBg", "#ffffff"),
      beforeColor: colorValue("beforeColor", "#111111"),
      afterColor: colorValue("afterColor", "#111111"),
      ringColor: colorValue("ringColor", "#ff6b9a"),
      percentColor: colorValue("percentColor", "#111111"),
      beforePanX: Number(inputs.beforePanX && inputs.beforePanX.value || 0) / 100,
      beforePanY: Number(inputs.beforePanY && inputs.beforePanY.value || 0) / 100,
      afterPanX: Number(inputs.afterPanX && inputs.afterPanX.value || 0) / 100,
      afterPanY: Number(inputs.afterPanY && inputs.afterPanY.value || 0) / 100,
      sliderEnabled: Boolean(inputs.sliderEnabled && inputs.sliderEnabled.checked),
      sliderStart: Number(inputs.sliderStart && inputs.sliderStart.value || 18) / 100,
      sliderEnd: Number(inputs.sliderEnd && inputs.sliderEnd.value || 82) / 100,
      sliderDuration: Number(inputs.sliderDuration && inputs.sliderDuration.value || 1800) / 1000,
      sliderHold: Number(inputs.sliderHold && inputs.sliderHold.value || 1000) / 1000,
      sliderMode: inputs.sliderMode && inputs.sliderMode.value || "roundTrip",
      sliderHandleSize: Number(inputs.sliderHandleSize && inputs.sliderHandleSize.value || 44),
      sliderLineColor: colorValue("sliderLineColor", "#ffffff")
    };
  }

  function marks(options) {
    const compareEnd = options.compareHold;
    const switchEnd = compareEnd + options.pageSwitch;
    const uploadEnd = switchEnd + options.uploadHold;
    const dropEnd = uploadEnd + options.dropDuration;
    const generateEnd = dropEnd + options.generateDuration;
    const hundredHoldEnd = generateEnd + options.hundredHold;
    const resultEnd = hundredHoldEnd + options.resultHold;
    const sliderTravel = options.sliderEnabled ? options.sliderDuration * (options.sliderMode === "roundTrip" ? 2 : 1) : 0;
    const sliderMoveEnd = resultEnd + sliderTravel;
    const sliderEnd = sliderMoveEnd + (options.sliderEnabled ? options.sliderHold : 0);
    const cycleEnd = options.sliderEnabled ? sliderEnd : resultEnd;
    return { compareEnd, switchEnd, uploadEnd, dropEnd, generateEnd, hundredHoldEnd, resultEnd, sliderMoveEnd, sliderEnd, cycleEnd };
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

  function drawContain(context, image, x, y, w, h, radius) {
    if (!image || w <= 1 || h <= 1) return;
    context.save();
    roundRect(context, x, y, w, h, radius);
    context.clip();
    const scale = Math.min(w / image.width, h / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    context.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    context.restore();
  }

  function drawCover(context, image, x, y, w, h, radius, panX = 0, panY = 0) {
    if (!image || w <= 1 || h <= 1) return;
    context.save();
    roundRect(context, x, y, w, h, radius);
    context.clip();
    const scale = Math.max(w / Math.max(1, image.width), h / Math.max(1, image.height));
    const dw = image.width * scale;
    const dh = image.height * scale;
    const extraX = Math.max(0, dw - w);
    const extraY = Math.max(0, dh - h);
    const dx = x - extraX * (panX * 0.5 + 0.5);
    const dy = y - extraY * (panY * 0.5 + 0.5);
    context.drawImage(image, dx, dy, dw, dh);
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

  function drawLabel(context, text, cx, y, color, size, family, tracking) {
    context.save();
    context.fillStyle = color;
    context.font = `600 ${size}px "${family}", "IBSCRegular", sans-serif`;
    context.letterSpacing = `${tracking}px`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, cx, y);
    context.restore();
  }

  function drawRing(context, cx, cy, radius, progress, ringColor, percentColor) {
    const start = -Math.PI / 2;
    context.save();
    context.lineWidth = Math.max(4, radius * 0.09);
    context.lineCap = "round";
    context.strokeStyle = "rgba(17,17,17,0.16)";
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = ringColor;
    context.beginPath();
    context.arc(cx, cy, radius, start, start + Math.PI * 2 * clamp01(progress));
    context.stroke();
    const number = `${Math.round(clamp01(progress) * 100)}%`;
    const ink = colorValue("percentColor", percentColor || "#111111");
    context.font = `700 ${Math.round(radius * 0.42)}px "IBSpace", "IBSCRegular", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = ink;
    context.fillText(number, cx, cy + 1);
    context.restore();
  }

  function compareLayout(w, h, options) {
    const s = Math.max(0.9, Math.min(1.4, options.frameScale));
    const side = w * 0.02;
    const cardW = Math.min(w - side * 2, w * 0.98 * s);
    const labelBand = Math.max(16, h * 0.022) + options.labelPad;
    const gap = h * 0.012;
    const cardH = h * 0.42 * s;
    const total = labelBand + cardH + gap + labelBand + cardH;
    const top = Math.max(h * 0.02, (h - total) / 2);
    const beforeY = top + labelBand;
    const afterY = beforeY + cardH + gap + labelBand;
    return {
      beforeLabelY: beforeY - labelBand * 0.42 + options.beforeShift * h,
      before: { x: (w - cardW) / 2, y: beforeY, w: cardW, h: cardH },
      afterLabelY: afterY - labelBand * 0.42 + options.afterShift * h,
      after: { x: (w - cardW) / 2, y: afterY, w: cardW, h: cardH }
    };
  }

  function uploadLayout(w, h) {
    const padX = w * 0.045;
    const padTop = h * 0.075;
    const labelH = h * 0.05;
    return {
      labelY: padTop + labelH / 2,
      box: {
        x: padX,
        y: padTop + labelH + h * 0.018,
        w: w - padX * 2,
        h: h - padTop - labelH - h * 0.07
      }
    };
  }

  function drawComparePage(context, w, h, options, radius) {
    const layout = compareLayout(w, h, options);
    context.fillStyle = options.compareBg;
    context.fillRect(0, 0, w, h);
    const labelPx = Math.max(14, h * 0.024) * options.labelSize;
    drawLabel(context, options.beforeLabel, w / 2, layout.beforeLabelY, options.beforeColor, labelPx, options.beforeFont, options.labelTracking);
    if (photos.before) drawCover(context, photos.before, layout.before.x, layout.before.y, layout.before.w, layout.before.h, radius, options.beforePanX, options.beforePanY);
    else drawEmpty(context, layout.before.x, layout.before.y, layout.before.w, layout.before.h, radius, "#8d8d92");
    drawLabel(context, options.afterLabel, w / 2, layout.afterLabelY, options.afterColor, labelPx, options.afterFont, options.labelTracking);
    if (photos.after) drawCover(context, photos.after, layout.after.x, layout.after.y, layout.after.w, layout.after.h, radius, options.afterPanX, options.afterPanY);
    else drawEmpty(context, layout.after.x, layout.after.y, layout.after.w, layout.after.h, radius, "#8d8d92");
  }

  function drawResultPage(context, w, h, options) {
    const layout = uploadLayout(w, h);
    const radius = Math.min(w, h) * 0.035;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, w, h);
    const labelPx = Math.max(16, h * 0.028) * options.labelSize;
    drawLabel(context, options.afterLabel, w / 2, layout.labelY, options.afterColor, labelPx, options.afterFont, options.labelTracking);
    const box = layout.box;
    drawEmpty(context, box.x, box.y, box.w, box.h, radius, "rgba(17,17,17,0.28)");
    if (photos.after) drawCover(context, photos.after, box.x, box.y, box.w, box.h, radius, options.afterPanX, options.afterPanY);
  }

  function drawSliderCompare(context, w, h, options, position) {
    const layout = uploadLayout(w, h);
    const box = layout.box;
    const radius = Math.min(w, h) * 0.035;
    const sliderPosition = clamp01(position);
    const split = box.x + box.w * sliderPosition;
    const showingBefore = sliderPosition < 0.5;
    context.fillStyle = options.compareBg;
    context.fillRect(0, 0, w, h);
    const labelPx = Math.max(16, h * 0.028) * options.labelSize;
    drawLabel(
      context,
      showingBefore ? options.beforeLabel : options.afterLabel,
      w / 2,
      layout.labelY,
      showingBefore ? options.beforeColor : options.afterColor,
      labelPx,
      showingBefore ? options.beforeFont : options.afterFont,
      options.labelTracking
    );

    if (photos.after) drawCover(context, photos.after, box.x, box.y, box.w, box.h, radius, options.afterPanX, options.afterPanY);
    else drawEmpty(context, box.x, box.y, box.w, box.h, radius, "#8d8d92");

    context.save();
    roundRect(context, box.x, box.y, box.w, box.h, radius);
    context.clip();
    context.beginPath();
    context.rect(split, box.y, Math.max(0, box.x + box.w - split), box.h);
    context.clip();
    if (photos.before) drawCover(context, photos.before, box.x, box.y, box.w, box.h, radius, options.beforePanX, options.beforePanY);
    context.restore();

    const lineWidth = Math.max(2, Math.min(w, h) * .004);
    context.save();
    context.strokeStyle = options.sliderLineColor;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(split, box.y);
    context.lineTo(split, box.y + box.h);
    context.stroke();

    const handleRadius = Math.max(14, options.sliderHandleSize * Math.min(w, h) / 720);
    const cy = box.y + box.h / 2;
    context.shadowColor = "rgba(0,0,0,.2)";
    context.shadowBlur = handleRadius * .36;
    context.fillStyle = "rgba(255,255,255,.94)";
    context.beginPath();
    context.arc(split, cy, handleRadius, 0, Math.PI * 2);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = "rgba(72,72,76,.55)";
    context.lineWidth = Math.max(1.5, handleRadius * .075);
    const arrow = handleRadius * .37;
    context.beginPath();
    context.moveTo(split - arrow * .18, cy - arrow);
    context.lineTo(split - arrow, cy);
    context.lineTo(split - arrow * .18, cy + arrow);
    context.moveTo(split + arrow * .18, cy - arrow);
    context.lineTo(split + arrow, cy);
    context.lineTo(split + arrow * .18, cy + arrow);
    context.stroke();
    context.restore();

    return box;
  }

  function drawUploadPage(context, w, h, options, drop, progress) {
    const layout = uploadLayout(w, h);
    const radius = Math.min(w, h) * 0.035;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, w, h);
    const labelPx = Math.max(16, h * 0.028) * options.labelSize;
    drawLabel(context, options.beforeLabel, w / 2, layout.labelY, options.beforeColor, labelPx, options.beforeFont, options.labelTracking);
    const box = layout.box;
    drawEmpty(context, box.x, box.y, box.w, box.h, radius, "rgba(17,17,17,0.28)");
    if (drop <= 0) return;
    const filled = { x: box.x, y: box.y, w: box.w, h: box.h };
    const fly = {
      x: lerp(box.x + box.w * 0.28, filled.x, drop),
      y: lerp(box.y + box.h * 0.38, filled.y, drop),
      w: lerp(box.w * 0.44, filled.w, drop),
      h: lerp(box.h * 0.28, filled.h, drop)
    };
    const photo = progress > 0 ? filled : fly;
    if (photos.before) drawCover(context, photos.before, photo.x, photo.y, photo.w, photo.h, radius, options.beforePanX, options.beforePanY);
    if (progress > 0) {
      const ringR = Math.min(filled.w, filled.h) * 0.15;
      drawRing(context, filled.x + filled.w / 2, filled.y + filled.h / 2, ringR, easeOutCubic(progress), options.ringColor, options.percentColor);
    }
  }

  function renderFrame(target, time, width, height, pixelRatio = 1, manualSliderPosition = null) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    const options = settings();
    const line = marks(options);
    const clock = mod(time * options.speed, Math.max(0.05, line.cycleEnd));
    const radius = options.radius * Math.min(w, h) / 720;

    let phase = "compare";
    let switchT = 0;
    let drop = 0;
    let progress = 0;
    let reveal = 0;
    let sliderPosition = options.sliderStart;
    if (options.sliderEnabled && clock >= line.resultEnd) {
      phase = "slider";
      const elapsed = Math.max(0, clock - line.resultEnd);
      const leg = Math.max(.001, options.sliderDuration);
      if (options.sliderMode === "roundTrip" && elapsed > leg) {
        const back = easeInOutCubic((elapsed - leg) / leg);
        sliderPosition = lerp(options.sliderEnd, options.sliderStart, back);
      } else {
        sliderPosition = lerp(options.sliderStart, options.sliderEnd, easeInOutCubic(elapsed / leg));
      }
      if (target === canvas && sliderOverride != null) sliderPosition = sliderOverride;
      if (manualSliderPosition != null) sliderPosition = clamp01(manualSliderPosition);
    } else if (clock >= line.hundredHoldEnd) {
      phase = "result";
      switchT = 1;
      drop = 1;
      progress = 1;
      reveal = clamp01((clock - line.hundredHoldEnd) / Math.max(0.0001, options.cutSoft));
    } else if (clock >= line.generateEnd) {
      phase = "generate";
      switchT = 1;
      drop = 1;
      progress = 1;
    } else if (clock >= line.dropEnd) {
      phase = "generate";
      switchT = 1;
      drop = 1;
      progress = clamp01((clock - line.dropEnd) / Math.max(0.0001, options.generateDuration));
    } else if (clock >= line.uploadEnd) {
      phase = "drop";
      switchT = 1;
      drop = easeOutCubic((clock - line.uploadEnd) / Math.max(0.0001, options.dropDuration));
    } else if (clock >= line.switchEnd) {
      phase = "upload";
      switchT = 1;
    } else if (clock >= line.compareEnd) {
      phase = "switch";
      switchT = easeInOutCubic((clock - line.compareEnd) / Math.max(0.0001, options.pageSwitch));
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (phase === "slider") {
      drawSliderCompare(context, w, h, options, sliderPosition);
    } else if (phase === "result") {
      if (reveal < 1) {
        drawUploadPage(context, w, h, options, 1, 1);
        context.globalAlpha = reveal;
        drawResultPage(context, w, h, options);
        context.globalAlpha = 1;
      } else {
        drawResultPage(context, w, h, options);
      }
    } else {
      context.save();
      context.translate(-w * switchT, 0);
      drawComparePage(context, w, h, options, radius);
      context.restore();
      context.save();
      context.translate(w * (1 - switchT), 0);
      drawUploadPage(context, w, h, options, drop, progress);
      context.restore();
    }

    if (target === canvas) {
      canvas.dataset.motionPhase = phase;
      canvas.dataset.progress = progress.toFixed(3);
      canvas.dataset.sliderPosition = sliderPosition.toFixed(3);
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
    return Math.max(0.05, marks(options).cycleEnd / Math.max(0.05, options.speed));
  }

  function timelineBeats(options = settings(), line = marks(options)) {
    const beats = [
      { kind: "intro", name: "图片对比页", start: 0, end: line.compareEnd },
      { kind: "orbit", name: "切到上传页", start: line.compareEnd, end: line.switchEnd },
      { kind: "hold", name: "原图飞入", start: line.switchEnd, end: line.dropEnd },
      { kind: "color", name: "生成到 100%", start: line.dropEnd, end: line.generateEnd },
      { kind: "hold", name: "满格停留", start: line.generateEnd, end: line.hundredHoldEnd },
      { kind: "replace", name: "效果图成片", start: line.hundredHoldEnd, end: line.resultEnd }
    ];
    if (options.sliderEnabled) beats.push({ kind: "contact", name: "滑动对比", start: line.resultEnd, end: line.sliderEnd });
    return beats.map((beat, index) => ({ ...beat, index, duration: Math.max(0, beat.end - beat.start) }));
  }

  function renderTimeline() {
    const track = $("#beforeAfterTimelineTrack");
    const list = $("#beforeAfterTimelineList");
    if (!track || !list) return;
    const options = settings();
    const line = marks(options);
    const beats = timelineBeats(options, line);
    track.replaceChildren();
    list.replaceChildren();
    beats.forEach((beat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `me-choreo-block is-${beat.kind}`;
      button.style.flex = `${Math.max(.08, beat.duration)} 1 0`;
      button.dataset.beatIndex = String(beat.index);
      button.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.name}</strong><small>${formatSeconds(beat.duration)}</small>`;
      button.addEventListener("click", () => {
        sliderOverride = null;
        setTime((beat.start + .001) / Math.max(.05, options.speed));
      });
      track.append(button);
      const row = document.createElement("li");
      row.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.name}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      list.append(row);
    });
    const playhead = document.createElement("i");
    playhead.className = "me-choreo-playhead";
    playhead.id = "beforeAfterTimelinePlayhead";
    playhead.setAttribute("aria-hidden", "true");
    track.append(playhead);
  }

  function updateTimelinePlayhead(time) {
    const options = settings();
    const line = marks(options);
    const clock = mod(time * options.speed, Math.max(.05, line.cycleEnd));
    const playhead = $("#beforeAfterTimelinePlayhead");
    if (playhead) playhead.style.left = `${(clock / Math.max(.05, line.cycleEnd) * 100).toFixed(3)}%`;
    const active = timelineBeats(options, line).find((beat) => clock >= beat.start && clock < beat.end)?.index ?? 0;
    document.querySelectorAll("#beforeAfterTimelineTrack [data-beat-index]").forEach((element) => {
      element.classList.toggle("is-active", Number(element.dataset.beatIndex) === active);
    });
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    renderFrame(canvas, currentTime(), canvas.width / ratio, canvas.height / ratio, ratio);
    updateTimelinePlayhead(currentTime());
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
    $("#hundredHoldOut").textContent = formatSeconds(options.hundredHold);
    $("#resultHoldOut").textContent = formatSeconds(options.resultHold);
    $("#speedOut").textContent = `${options.speed.toFixed(2)}×`;
    $("#pageSwitchOut").textContent = formatSeconds(options.pageSwitch);
    $("#uploadHoldOut").textContent = formatSeconds(options.uploadHold);
    $("#dropDurationOut").textContent = formatSeconds(options.dropDuration);
    $("#cutSoftOut").textContent = formatSeconds(options.cutSoft);
    $("#radiusOut").textContent = `${options.radius}px`;
    $("#pagePadOut").textContent = `${Math.round(options.pagePad * 100)}%`;
    $("#labelSizeOut").textContent = `${Math.round(options.labelSize * 100)}%`;
    $("#labelTrackingOut").textContent = String(options.labelTracking);
    $("#labelPadOut").textContent = String(options.labelPad);
    $("#beforeShiftOut").textContent = String(Math.round(options.beforeShift * 100));
    $("#afterShiftOut").textContent = String(Math.round(options.afterShift * 100));
    $("#frameScaleOut").textContent = `${Math.round(options.frameScale * 100)}%`;
    const axis = (value, neg, pos) => Math.abs(value) < 0.02 ? "居中" : value < 0 ? `${neg} ${Math.round(-value * 100)}` : `${pos} ${Math.round(value * 100)}`;
    $("#beforePanXOut").textContent = axis(options.beforePanX, "左", "右");
    $("#beforePanYOut").textContent = axis(options.beforePanY, "上", "下");
    $("#afterPanXOut").textContent = axis(options.afterPanX, "左", "右");
    $("#afterPanYOut").textContent = axis(options.afterPanY, "上", "下");
    $("#sliderStartOut").textContent = `${Math.round(options.sliderStart * 100)}%`;
    $("#sliderEndOut").textContent = `${Math.round(options.sliderEnd * 100)}%`;
    $("#sliderDurationOut").textContent = formatSeconds(options.sliderDuration);
    $("#sliderHoldOut").textContent = formatSeconds(options.sliderHold);
    $("#sliderHandleSizeOut").textContent = String(Math.round(options.sliderHandleSize));
    $(".ba-slider-section")?.classList.toggle("is-disabled", !options.sliderEnabled);
    $("#previewSliderButton").disabled = !options.sliderEnabled;
    const percentOut = $("#percentColorOut");
    if (percentOut) percentOut.textContent = options.percentColor;
    renderTimeline();
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    const onEdit = () => {
      if ([inputs.sliderEnabled, inputs.sliderStart, inputs.sliderEnd, inputs.sliderDuration, inputs.sliderHold, inputs.sliderMode].includes(input)) sliderOverride = null;
      updateOutputs();
      scheduleAutoSave();
      const live = input === inputs.radius || input === inputs.pagePad || input === inputs.beforeFont || input === inputs.afterFont || input === inputs.labelSize || input === inputs.labelTracking || input === inputs.labelPad || input === inputs.beforeShift || input === inputs.afterShift || input === inputs.frameScale || input === inputs.beforePanX || input === inputs.beforePanY || input === inputs.afterPanX || input === inputs.afterPanY || input === inputs.sliderStart || input === inputs.sliderEnd || input === inputs.sliderHandleSize || input.type === "color";
      if (!live) setTime(0);
    };
    input.addEventListener("input", onEdit);
    input.addEventListener("change", onEdit);
  });

  async function onUpload(kind, file) {
    if (!file) return;
    photos[kind] = await fileToImage(file);
    $(kind === "before" ? "#beforeName" : "#afterName").textContent = file.name;
    scheduleAutoSave();
    setTime(0);
  }
  const defaultPhotos = { before: "assets/beforeafter-before.jpg", after: "assets/beforeafter-after.jpg" };
  const DEFAULT_PRESET_URL = "assets/presets/beforeafter-default.json?v=20260824-1";
  let approvedDefaultPreset = null;

  $("#beforeFile").addEventListener("change", (event) => onUpload("before", event.target.files[0]));
  $("#afterFile").addEventListener("change", (event) => onUpload("after", event.target.files[0]));
  async function restoreDefault() {
    clearTimeout(autoSaveTimer);
    if (approvedDefaultPreset) {
      await applyPreset(approvedDefaultPreset);
      localStorage.removeItem(SAVE_KEY);
      $("#beforeFile").value = "";
      $("#afterFile").value = "";
      exportStatus.textContent = "已恢复图片对比默认示例。";
      if (schemeStatus) schemeStatus.textContent = "已恢复默认示例。";
      if (paused) {
        paused = false;
        syncPauseButtons();
      }
      return;
    }
    const formIds = [
      ["beforeLabel", "Before"], ["afterLabel", "After"],
      ["beforeFont", "space"], ["afterFont", "space"],
      ["labelSize", "100"], ["labelTracking", "8"], ["labelPad", "24"],
      ["beforeShift", "0"], ["afterShift", "0"], ["frameScale", "118"],
      ["beforePanX", "0"], ["beforePanY", "0"], ["afterPanX", "0"], ["afterPanY", "0"],
      ["ringColor", "#ff6b9a"], ["percentColor", "#111111"],
      ["compareHold", "1400"], ["generateDuration", "900"], ["hundredHold", "800"], ["resultHold", "1600"], ["speed", "100"],
      ["pageSwitch", "400"], ["uploadHold", "350"], ["dropDuration", "550"], ["cutSoft", "180"],
      ["radius", "22"], ["pagePad", "7"],
      ["compareBg", "#ffffff"], ["beforeColor", "#111111"], ["afterColor", "#111111"],
      ["sliderStart", "18"], ["sliderEnd", "82"], ["sliderDuration", "1800"], ["sliderHold", "1000"],
      ["sliderMode", "roundTrip"], ["sliderHandleSize", "44"], ["sliderLineColor", "#ffffff"]
    ];
    formIds.forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field) field.value = value;
    });
    $("#beforeFile").value = "";
    $("#afterFile").value = "";
    $("#beforeName").textContent = "默认风景原图";
    $("#afterName").textContent = "默认风景效果图";
    try {
      const [before, after] = await Promise.all([loadImage(defaultPhotos.before), loadImage(defaultPhotos.after)]);
      photos.before = before;
      photos.after = after;
    } catch (_) {}
    inputs.sliderEnabled.checked = true;
    sliderOverride = null;
    updateOutputs();
    setTime(0);
    if (paused) {
      paused = false;
      syncPauseButtons();
    }
  }

  $("#resetButton").addEventListener("click", restoreDefault);
  $("#clearButton").addEventListener("click", () => {
    clearTimeout(autoSaveTimer);
    photos.before = null;
    photos.after = null;
    $("#beforeName").textContent = "未选择原图";
    $("#afterName").textContent = "未选择效果图";
    inputs.beforeLabel.value = "Before";
    inputs.afterLabel.value = "After";
    inputs.sliderEnabled.checked = false;
    sliderOverride = null;
    localStorage.removeItem(SAVE_KEY);
    updateOutputs();
    restartPlayback();
    exportStatus.textContent = "已清空图片和第二阶段，可重新上传制作。";
    if (schemeStatus) schemeStatus.textContent = "已清理，可重新上传图片制作。";
  });

  function syncPauseButtons() {
    $("#pauseButton").textContent = paused ? "继续" : "暂停";
    $("#stagePauseIcon").textContent = paused ? "▶" : "Ⅱ";
    $("#stagePauseLabel").textContent = paused ? "继续" : "暂停";
    $("#stagePauseButton").setAttribute("aria-pressed", String(paused));
  }

  function restartPlayback() {
    sliderOverride = null;
    paused = false;
    setTime(0);
    syncPauseButtons();
  }

  function togglePause() {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
    } else {
      pausedAt = currentTime();
      paused = true;
    }
    syncPauseButtons();
  }

  $("#restartButton").addEventListener("click", restartPlayback);
  $("#stageRestartButton").addEventListener("click", restartPlayback);
  $("#pauseButton").addEventListener("click", togglePause);
  $("#stagePauseButton").addEventListener("click", togglePause);
  $("#backButton").addEventListener("click", () => {
    paused = true;
    setTime(currentTime() - 1 / fps);
    syncPauseButtons();
  });
  $("#forwardButton").addEventListener("click", () => {
    paused = true;
    setTime(currentTime() + 1 / fps);
    syncPauseButtons();
  });

  $("#previewSliderButton").addEventListener("click", () => {
    if (!inputs.sliderEnabled.checked) return;
    const options = settings();
    sliderOverride = options.sliderStart;
    paused = true;
    setTime((marks(options).resultEnd + .001) / Math.max(.05, options.speed));
    syncPauseButtons();
  });

  function setSliderFromPointer(event) {
    const options = settings();
    if (!options.sliderEnabled) return false;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const px = (event.clientX - rect.left) * w / Math.max(1, rect.width);
    const py = (event.clientY - rect.top) * h / Math.max(1, rect.height);
    const box = uploadLayout(w, h).box;
    if (event.type === "pointerdown" && (px < box.x || px > box.x + box.w || py < box.y || py > box.y + box.h)) return false;
    sliderOverride = clamp01((px - box.x) / Math.max(1, box.w));
    paused = true;
    setTime((marks(options).resultEnd + .001) / Math.max(.05, options.speed));
    syncPauseButtons();
    return true;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!setSliderFromPointer(event)) return;
    dragPointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (dragPointerId !== event.pointerId) return;
    setSliderFromPointer(event);
    event.preventDefault();
  });
  const finishSliderDrag = (event) => {
    if (dragPointerId !== event.pointerId) return;
    dragPointerId = null;
    canvas.releasePointerCapture?.(event.pointerId);
  };
  canvas.addEventListener("pointerup", finishSliderDrag);
  canvas.addEventListener("pointercancel", finishSliderDrag);

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
    renderFrame(output, currentTime(), output.width, output.height, 1, sliderOverride);
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

  const fieldIds = Object.keys(inputs);

  function imageToDataURL(image) {
    if (!image) return "";
    const board = document.createElement("canvas");
    board.width = image.naturalWidth || image.width;
    board.height = image.naturalHeight || image.height;
    if (!board.width || !board.height) return "";
    board.getContext("2d").drawImage(image, 0, 0);
    return board.toDataURL("image/jpeg", 0.92);
  }

  function collectPreset() {
    const fields = {};
    fieldIds.forEach((id) => {
      const el = inputs[id];
      if (el && "value" in el) fields[id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return {
      version: 2,
      fields,
      beforeName: $("#beforeName") ? $("#beforeName").textContent : "",
      afterName: $("#afterName") ? $("#afterName").textContent : "",
      beforeImage: imageToDataURL(photos.before),
      afterImage: imageToDataURL(photos.after)
    };
  }

  async function applyPreset(preset) {
    if (!preset || !preset.fields) return;
    const fields = {
      sliderEnabled: true,
      sliderStart: "18",
      sliderEnd: "82",
      sliderDuration: "1800",
      sliderHold: "1000",
      sliderMode: "roundTrip",
      sliderHandleSize: "44",
      sliderLineColor: "#ffffff",
      ...preset.fields
    };
    Object.entries(fields).forEach(([id, value]) => {
      const field = inputs[id] || document.getElementById(id);
      if (!field || value == null) return;
      if (field.type === "checkbox") field.checked = value === true || value === "true" || value === "on" || value === 1;
      else field.value = value;
    });
    if (preset.beforeName && $("#beforeName")) $("#beforeName").textContent = preset.beforeName;
    if (preset.afterName && $("#afterName")) $("#afterName").textContent = preset.afterName;
    if (preset.beforeImage) photos.before = await loadImage(preset.beforeImage);
    if (preset.afterImage) photos.after = await loadImage(preset.afterImage);
    sliderOverride = null;
    updateOutputs();
    setTime(0);
  }

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(collectPreset()));
        if (schemeStatus) schemeStatus.textContent = "已自动保存当前图片对比方案。";
      } catch (_) {
        if (schemeStatus) schemeStatus.textContent = "自动保存空间不足，请使用“保存方案”下载 JSON。";
      }
    }, 500);
  }

  function savePreset(downloadFile) {
    const preset = collectPreset();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(preset)); } catch (error) {
      exportStatus.textContent = `保存失败：${error.message || "存储空间不足"}`;
      return;
    }
    if (downloadFile) {
      downloadBlob(new Blob([JSON.stringify(preset)], { type: "application/json" }), "beforeafter-preset.json");
    }
    exportStatus.textContent = downloadFile ? "方案已保存，并下载了模板文件。换尺寸后可直接导出。" : "方案已保存。换尺寸后可直接导出。";
    if (schemeStatus) schemeStatus.textContent = downloadFile ? "方案已保存并下载 JSON。" : "方案已保存。";
  }

  $("#saveButton").addEventListener("click", () => savePreset(true));
  $("#importFile").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const preset = JSON.parse(await file.text());
      await applyPreset(preset);
      localStorage.setItem(SAVE_KEY, JSON.stringify(preset));
      exportStatus.textContent = "方案已导入。";
      if (schemeStatus) schemeStatus.textContent = "方案已导入，滑杆阶段与图片已同步恢复。";
    } catch (error) {
      exportStatus.textContent = `导入失败：${error.message || "文件无效"}`;
    }
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
    encoder.outputFilename = `before-after-${width}x${height}.mp4`;
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
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), `before-after-${width}x${height}.mp4`);
      setExportBusy(false, `MP4 已生成 · ${width} × ${height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder.delete(); } catch (_) {}
    }
  }
  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  (async function initializePreset() {
    try {
      const [before, after] = await Promise.all([
        loadImage(defaultPhotos.before),
        loadImage(defaultPhotos.after)
      ]);
      photos.before = before;
      photos.after = after;
    } catch (_) {}

    try {
      const response = await fetch(DEFAULT_PRESET_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const preset = await response.json();
      if (!preset?.fields) throw new Error("方案格式不正确");
      approvedDefaultPreset = preset;
    } catch (error) {
      console.error("Image Compare default preset failed to load", error);
    }
    let initialPreset = approvedDefaultPreset;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) initialPreset = JSON.parse(raw);
    } catch (_) {}
    if (initialPreset) await applyPreset(initialPreset);
  })();

  if (document.fonts && document.fonts.load) {
    Object.values(fontMap).forEach((family) => {
      document.fonts.load(`600 32px "${family}"`).catch(() => {});
    });
  }

  updateOutputs();
  previewLoop();
})();
