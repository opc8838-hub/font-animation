(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    switchMode: $("#switchMode"), switchShape: $("#switchShape"), subjectMode: $("#subjectMode"), subjectText: $("#subjectText"), title: $("#titleText"),
    font: $("#fontFamily"), fontWeight: $("#fontWeight"), subjectSize: $("#subjectSize"), startY: $("#startY"),
    endY: $("#endY"), dropDuration: $("#dropDuration"), dropSpeed: $("#dropSpeed"), dropOvershoot: $("#dropOvershoot"), subjectShadow: $("#subjectShadow"),
    switchDelay: $("#switchDelay"), switchDuration: $("#switchDuration"), switchEase: $("#switchEase"),
    irisSoftness: $("#irisSoftness"), settleDuration: $("#settleDuration"), nightLogoEnabled: $("#nightLogoEnabled"),
    nightThreshold: $("#nightThreshold"), nightBlendDuration: $("#nightBlendDuration"), nightGlow: $("#nightGlow"),
    shiftDuration: $("#shiftDuration"), titleDuration: $("#titleDuration"),
    titleDelay: $("#titleDelay"), titleSize: $("#titleSize"), titleGap: $("#titleGap"),
    titleTracking: $("#titleTracking"), titleSpring: $("#titleSpring"), holdDuration: $("#holdDuration"),
    startColor: $("#startColor"), endColor: $("#endColor"), titleColor: $("#titleColor"),
    dotColor: $("#dotColor"), subjectColor: $("#subjectColor")
  };
  const fontPresets = {
    "fs-satoshi": { family: "Satoshi", weight: 700 },
    "snap-inter-black": { family: "Continuation Inter", weight: 900 },
    "fs-general-sans": { family: "General Sans", weight: 600 },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 700 },
    "fs-cabinet": { family: "Cabinet Grotesk", weight: 700 },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900 }
  };

  const svgData = (body) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`)}`;
  const assets = new Map();
  const nightLogo = new Image();
  nightLogo.decoding = "async";
  let nightLogoProcessed = null;
  nightLogo.onload = () => {
    const source = { x: 88, y: 139, width: 1016, height: 977 };
    const keyed = document.createElement("canvas");
    keyed.width = source.width;
    keyed.height = source.height;
    const keyedContext = keyed.getContext("2d", { willReadFrequently: true });
    keyedContext.drawImage(nightLogo, source.x, source.y, source.width, source.height, 0, 0, source.width, source.height);
    const imageData = keyedContext.getImageData(0, 0, source.width, source.height);
    const pixels = imageData.data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      const light = Math.max(red, green, blue) / 255;
      if (light < .012) { pixels[offset + 3] = 0; continue; }
      const alpha = Math.pow(light, 1.12);
      pixels[offset] = Math.min(255, red / Math.max(.035, light));
      pixels[offset + 1] = Math.min(255, green / Math.max(.035, light));
      pixels[offset + 2] = Math.min(255, blue / Math.max(.035, light));
      pixels[offset + 3] = Math.round(alpha * 255);
    }
    keyedContext.clearRect(0, 0, source.width, source.height);
    keyedContext.putImageData(imageData, 0, 0);
    nightLogoProcessed = keyed;
  };
  nightLogo.src = "assets/hely-brand-night-reference.png";
  let selectedAssetId = "hely";
  let uploadedCount = 0;
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const rangeProgress = (value, from, to) => clamp01((value - from) / Math.max(.0001, to - from));
  const smoother = (value) => { const x = clamp01(value); return x * x * x * (x * (x * 6 - 15) + 10); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 4);
  const easeOutBack = (value, strength) => {
    const x = clamp01(value) - 1;
    const c = .55 + strength * 1.9;
    return 1 + (c + 1) * x * x * x + c * x * x;
  };
  const springOut = (value, amount) => {
    const x = clamp01(value);
    const base = 1 - Math.pow(1 - x, 4);
    return base + Math.sin(x * Math.PI * 2.25) * (1 - x) * amount;
  };
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);

  function addAsset(id, label, src, options = {}) {
    const image = new Image();
    image.decoding = "async";
    const asset = { id, label, src, image, removable: Boolean(options.removable), special: options.special || "" };
    assets.set(id, asset);
    image.onload = () => { asset.ready = true; };
    image.src = src;
    return asset;
  }

  addAsset("hely", "Hely Logo", "assets/hely-brand-reference.png", { special: "hely" });
  addAsset("watch", "手表", svgData('<rect x="31" y="18" width="66" height="92" rx="24" fill="#111"/><rect x="38" y="25" width="52" height="78" rx="19" fill="#f4f4f4"/><circle cx="64" cy="64" r="18" fill="#8277f5"/><path d="M64 50v15l12 8" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'));
  addAsset("bolt", "闪电", svgData('<path d="M72 8 25 72h33l-4 48 49-70H70z" fill="#8277f5"/>'));
  addAsset("play", "播放", svgData('<rect x="8" y="8" width="112" height="112" rx="30" fill="#111"/><path d="m50 37 43 27-43 27z" fill="#fff"/>'));
  addAsset("cloud", "云朵", svgData('<path d="M38 94h55a24 24 0 0 0 2-48 34 34 0 0 0-64-2A25 25 0 0 0 38 94Z" fill="#8277f5"/>'));
  window.TokenAssetTools.animalAssets(8).forEach(({ id, label, src }) => addAsset(id, label, src));

  function renderAssetGrid() {
    const grid = $("#assetGrid");
    grid.innerHTML = [...assets.values()].map((asset) => `
      <div class="asset-card ${asset.id === selectedAssetId ? "is-selected" : ""}" data-asset-id="${asset.id}">
        <button class="asset-insert" type="button" aria-label="选择${asset.label}">
          <img class="${asset.special === "hely" ? "hely-source" : ""}" src="${asset.src}" alt=""><span>${asset.label}</span>
        </button>
        ${asset.removable ? '<button class="asset-remove" type="button" aria-label="删除图片">×</button>' : ""}
      </div>`).join("");
    grid.querySelectorAll(".asset-insert").forEach((button) => button.addEventListener("click", () => {
      selectedAssetId = button.closest(".asset-card").dataset.assetId;
      inputs.subjectMode.value = "asset";
      renderAssetGrid();
      restartPreview();
    }));
    grid.querySelectorAll(".asset-remove").forEach((button) => button.addEventListener("click", () => {
      const id = button.closest(".asset-card").dataset.assetId;
      assets.delete(id);
      if (selectedAssetId === id) selectedAssetId = "hely";
      renderAssetGrid();
    }));
  }

  $("#assetUpload").addEventListener("change", async (event) => {
    const files = [...event.currentTarget.files];
    if (!files.length) return;
    const status = $("#assetProcessStatus");
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      status.textContent = `正在处理 ${index + 1} / ${files.length} · ${file.name}`;
      try {
        const result = await window.TokenAssetTools.processFile(file, { removeBackground: $("#assetRemoveBackground").checked });
        uploadedCount += 1;
        const id = `upload${uploadedCount}`;
        addAsset(id, file.name, result.src, { removable: true });
        selectedAssetId = id;
        status.textContent = `${result.status} · 已设为当前主体`;
      } catch (error) {
        status.textContent = `处理失败：${error.message || "无法读取图片"}`;
      }
    }
    inputs.subjectMode.value = "asset";
    renderAssetGrid();
    event.currentTarget.value = "";
    restartPreview();
  });

  function timing() {
    const dropSpeed = Math.max(.25, Number(inputs.dropSpeed.value) / 100);
    const drop = Number(inputs.dropDuration.value) / 1000 / dropSpeed;
    const settle = Number(inputs.settleDuration.value) / 1000;
    const shift = Number(inputs.shiftDuration.value) / 1000;
    const shiftStart = Math.max(0, drop + settle);
    const switchDelay = Number(inputs.switchDelay.value) / 1000;
    const switchStart = shiftStart + switchDelay;
    const switchDuration = Number(inputs.switchDuration.value) / 1000;
    const switchEnd = switchStart + switchDuration;
    const titleDelay = Number(inputs.titleDelay.value) / 1000;
    const title = Number(inputs.titleDuration.value) / 1000;
    const titleStart = shiftStart + titleDelay;
    const finish = Math.max(shiftStart + shift, titleStart + title, switchEnd);
    const hold = Number(inputs.holdDuration.value) / 1000;
    return { drop, dropSpeed, switchDelay, switchStart, switchDuration, switchEnd, settle, shift, titleDelay, title, shiftStart, titleStart, finish, hold, cycle: finish + hold };
  }

  function parseHex(hex) {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  }
  function mixColor(from, to, progress) {
    const a = parseHex(from); const b = parseHex(to);
    return `rgb(${a.map((value, index) => Math.round(lerp(value, b[index], progress))).join(",")})`;
  }
  function fillSwitchBackground(context, w, h, progress) {
    const safeProgress = Number.isFinite(progress) ? clamp01(progress) : 0;
    if (inputs.switchShape.value === "uniform") {
      context.fillStyle = mixColor(inputs.startColor.value, inputs.endColor.value, safeProgress);
      context.fillRect(0, 0, w, h);
      return;
    }
    if (safeProgress <= .0001) {
      context.fillStyle = inputs.startColor.value;
      context.fillRect(0, 0, w, h);
      return;
    }
    context.fillStyle = inputs.endColor.value;
    context.fillRect(0, 0, w, h);
    if (safeProgress >= .9999) return;

    // The previous implementation grew a circular patch from the center, which
    // read as an explosion. Keep the incoming color full-frame and contract the
    // outgoing scene as one soft, wide pool of light instead.
    const cx = w / 2;
    const cy = h / 2;
    const aspectX = 1.34;
    const aspectY = .78;
    const maxRadius = Math.hypot(w / (2 * aspectX), h / (2 * aspectY)) * 1.34;
    const remaining = 1 - safeProgress;
    const softnessRatio = Number(inputs.irisSoftness.value) / 100;
    const radius = maxRadius * (softnessRatio + 1.08) * Math.pow(remaining, .72);
    const feather = Math.min(radius * .92, maxRadius * softnessRatio * (.28 + .72 * Math.sqrt(remaining)));
    const innerStop = radius > 0 ? Math.max(0, (radius - feather) / radius) : 0;
    context.save();
    context.translate(cx, cy);
    context.scale(aspectX, aspectY);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, Math.max(.01, radius));
    gradient.addColorStop(0, inputs.startColor.value);
    gradient.addColorStop(innerStop, inputs.startColor.value);
    gradient.addColorStop(1, inputs.endColor.value);
    context.fillStyle = gradient;
    context.fillRect(-w, -h, w * 2, h * 2);
    context.restore();
  }
  function switchCurve(progress) {
    if (inputs.switchEase.value === "balanced") return smoother(progress);
    if (inputs.switchEase.value === "snappy") return easeOut(progress);
    const x = clamp01(progress);
    return x < .42 ? .5 * Math.pow(x / .42, 2.35) : .5 + .5 * (1 - Math.pow(1 - (x - .42) / .58, 3.4));
  }
  function textMetrics(context, text, tracking) {
    const glyphs = graphemes(text);
    const widths = glyphs.map((glyph) => context.measureText(glyph).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * tracking;
    return { glyphs, widths, total };
  }
  function drawHelyLogo(context, image, x, y, size) {
    const source = { x: 178, y: 193, width: 415, height: 414 };
    context.save();
    context.beginPath();
    context.arc(x, y, size * .49, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, source.x, source.y, source.width, source.height, x - size / 2, y - size / 2, size, size);
    context.restore();
  }
  function drawHelyNightLogo(context, x, y, size, alpha) {
    if (!nightLogoProcessed || alpha <= .001) return;
    const glowScale = 1.26;
    const drawWidth = size * glowScale;
    const drawHeight = drawWidth * nightLogoProcessed.height / nightLogoProcessed.width;
    const glow = Number(inputs.nightGlow.value) / 100;
    context.save();
    context.globalAlpha = Math.min(1, alpha * Math.min(1.25, glow));
    context.globalCompositeOperation = "source-over";
    context.filter = `brightness(${.8 + glow * .2})`;
    context.drawImage(nightLogoProcessed, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    context.restore();
  }
  function drawAssetSubject(context, asset, x, y, size) {
    if (!asset?.ready) return;
    if (asset.special === "hely") { drawHelyLogo(context, asset.image, x, y, size); return; }
    const ratio = asset.image.naturalWidth / Math.max(1, asset.image.naturalHeight);
    const drawWidth = ratio >= 1 ? size : size * ratio;
    const drawHeight = ratio >= 1 ? size / ratio : size;
    context.drawImage(asset.image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
  }
  function drawSubject(context, x, y, size, scale, nightMix) {
    const shadow = Number(inputs.subjectShadow.value) / 100;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.translate(-x, -y);
    const allowGenericShadow = !(inputs.subjectMode.value === "asset" && selectedAssetId === "hely");
    context.shadowColor = allowGenericShadow ? `rgba(0,0,0,${shadow * .42})` : "rgba(0,0,0,0)";
    context.shadowBlur = allowGenericShadow ? size * shadow * .16 : 0;
    context.shadowOffsetY = allowGenericShadow ? size * shadow * .05 : 0;
    if (inputs.subjectMode.value === "text") {
      const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["fs-satoshi"];
      context.font = `900 ${size * .58}px "${preset.family}", "Continuation SC Black", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = inputs.subjectColor.value;
      context.fillText(inputs.subjectText.value.trim() || "ME", x, y);
    } else if (selectedAssetId === "hely" && inputs.nightLogoEnabled.checked) {
      context.save();
      context.globalAlpha = 1 - nightMix;
      drawAssetSubject(context, assets.get(selectedAssetId), x, y, size);
      context.restore();
      drawHelyNightLogo(context, x, y, size, nightMix);
    } else {
      drawAssetSubject(context, assets.get(selectedAssetId), x, y, size);
    }
    context.restore();
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const currentTiming = timing();
    const localTime = mod(time, currentTiming.cycle);
    const isFinalHold = localTime >= currentTiming.finish;
    const dropRaw = rangeProgress(localTime, 0, currentTiming.drop);
    const dropProgress = easeOutBack(dropRaw, Number(inputs.dropOvershoot.value) / 100);
    const switchRaw = isFinalHold ? 1 : rangeProgress(localTime, currentTiming.switchStart, currentTiming.switchEnd);
    const switchProgress = isFinalHold ? 1 : switchCurve(switchRaw);
    const shiftRaw = rangeProgress(localTime, currentTiming.shiftStart, currentTiming.shiftStart + currentTiming.shift);
    const shiftProgress = smoother(shiftRaw);
    const titleRaw = rangeProgress(localTime, currentTiming.titleStart, currentTiming.titleStart + currentTiming.title);
    const titleProgress = clamp01(springOut(titleRaw, Number(inputs.titleSpring.value) / 100));
    fillSwitchBackground(context, w, h, switchProgress);

    const layoutScale = Math.min(w / 1100, h / 850);
    const subjectSize = Math.max(18, Number(inputs.subjectSize.value) * layoutScale);
    const titleSize = Math.max(14, Number(inputs.titleSize.value) * layoutScale);
    const tracking = Number(inputs.titleTracking.value) * layoutScale;
    const gap = Number(inputs.titleGap.value) * layoutScale;
    const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["fs-satoshi"];
    const fontWeight = Number(inputs.fontWeight.value) || preset.weight;
    context.font = `${fontWeight} ${titleSize}px "${preset.family}", "Continuation SC Black", sans-serif`;
    context.textBaseline = "middle";
    context.textAlign = "left";
    const title = inputs.title.value || "hely.fun";
    const metrics = textMetrics(context, title, tracking);
    const groupWidth = subjectSize + gap + metrics.total;
    const groupFit = Math.min(1, w * .82 / Math.max(1, groupWidth));
    const fittedSubjectSize = subjectSize * groupFit;
    const fittedTitleSize = titleSize * groupFit;
    const fittedGap = gap * groupFit;
    const fittedTracking = tracking * groupFit;
    context.font = `${fontWeight} ${fittedTitleSize}px "${preset.family}", "Continuation SC Black", sans-serif`;
    const fittedMetrics = textMetrics(context, title, fittedTracking);
    const fittedGroupWidth = fittedSubjectSize + fittedGap + fittedMetrics.total;

    const startY = h * Number(inputs.startY.value) / 100 - fittedSubjectSize * .5;
    const endY = h * Number(inputs.endY.value) / 100;
    const subjectY = lerp(startY, endY, dropProgress);
    const centeredX = w / 2;
    const finalSubjectX = w / 2 - fittedGroupWidth / 2 + fittedSubjectSize / 2;
    const subjectX = lerp(centeredX, finalSubjectX, shiftProgress);
    const dropScale = lerp(.88, 1, smoother(dropRaw));
    const darkness = inputs.switchMode.value === "light-to-dark" ? switchProgress : 1 - switchProgress;
    const nightThreshold = Number(inputs.nightThreshold.value) / 100;
    const blendSpan = Number(inputs.nightBlendDuration.value) <= 0
      ? 0
      : Math.min(.9, Number(inputs.nightBlendDuration.value) / 1000 / Math.max(.001, currentTiming.switchDuration));
    const nightMix = blendSpan <= .0001
      ? Number(darkness >= nightThreshold)
      : smoother(rangeProgress(darkness, nightThreshold - blendSpan / 2, nightThreshold + blendSpan / 2));
    drawSubject(context, subjectX, subjectY, fittedSubjectSize, dropScale, nightMix);

    if (titleRaw > 0) {
      const titleX = subjectX + fittedSubjectSize / 2 + fittedGap;
      const visibleWidth = Math.max(1, fittedMetrics.total * clamp01(titleRaw * 1.08));
      const slide = (1 - titleProgress) * Math.max(16, fittedTitleSize * .28);
      const titleScale = lerp(.92, 1, titleProgress);
      context.save();
      context.beginPath();
      context.rect(titleX - 2, endY - fittedTitleSize, visibleWidth + 8, fittedTitleSize * 2);
      context.clip();
      context.translate(titleX - slide, endY);
      context.scale(titleScale, titleScale);
      let cursor = 0;
      fittedMetrics.glyphs.forEach((glyph, index) => {
        context.fillStyle = glyph === "." ? inputs.dotColor.value : inputs.titleColor.value;
        context.fillText(glyph, cursor, 0);
        cursor += fittedMetrics.widths[index] + fittedTracking;
      });
      context.restore();
    }

    if (target === canvas) {
      const phase = localTime < currentTiming.shiftStart ? "drop" : isFinalHold ? "final-hold-locked" : "turn-light-expand";
      canvas.dataset.motionPhase = phase;
      canvas.dataset.dropProgress = dropRaw.toFixed(4);
      canvas.dataset.backgroundProgress = switchRaw.toFixed(4);
      canvas.dataset.shiftProgress = shiftRaw.toFixed(4);
      canvas.dataset.titleProgress = titleRaw.toFixed(4);
      canvas.dataset.subjectMode = inputs.subjectMode.value;
      canvas.dataset.selectedAsset = selectedAssetId;
      canvas.dataset.switchMode = inputs.switchMode.value;
      canvas.dataset.switchShape = inputs.switchShape.value;
      canvas.dataset.darkness = darkness.toFixed(4);
      canvas.dataset.nightLogoMix = nightMix.toFixed(4);
    }
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
  function currentTime() { return paused ? pausedAt : (performance.now() - animationStart) / 1000; }
  function setTime(time) { pausedAt = Math.max(0, time); animationStart = performance.now() - pausedAt * 1000; }
  function restartPreview() {
    paused = false;
    setTime(0);
    const button = $("#pauseButton");
    button.textContent = "暂停";
    button.setAttribute("aria-pressed", "false");
  }
  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.round(mod(time, timing().cycle) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function formatSeconds(value) {
    const seconds = Number(value) / 1000;
    return `${seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(2)}秒`;
  }
  function updateOutputs() {
    const values = {
      subjectSizeOut: `${inputs.subjectSize.value}px`, startYOut: `${inputs.startY.value}%`, endYOut: `${inputs.endY.value}%`,
      dropDurationOut: formatSeconds(inputs.dropDuration.value), dropSpeedOut: `${(Number(inputs.dropSpeed.value) / 100).toFixed(2)}×`,
      dropOvershootOut: `${inputs.dropOvershoot.value}%`,
      subjectShadowOut: `${inputs.subjectShadow.value}%`, switchDelayOut: formatSeconds(inputs.switchDelay.value),
      switchDurationOut: formatSeconds(inputs.switchDuration.value), irisSoftnessOut: `${inputs.irisSoftness.value}%`,
      settleDurationOut: formatSeconds(inputs.settleDuration.value),
      nightThresholdOut: `${inputs.nightThreshold.value}%`, nightBlendDurationOut: formatSeconds(inputs.nightBlendDuration.value), nightGlowOut: `${inputs.nightGlow.value}%`,
      shiftDurationOut: formatSeconds(inputs.shiftDuration.value), titleDurationOut: formatSeconds(inputs.titleDuration.value),
      titleDelayOut: formatSeconds(inputs.titleDelay.value), titleSizeOut: `${inputs.titleSize.value}px`, titleGapOut: `${inputs.titleGap.value}px`,
      titleTrackingOut: `${inputs.titleTracking.value}px`, titleSpringOut: `${inputs.titleSpring.value}%`, holdDurationOut: formatSeconds(inputs.holdDuration.value)
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
  }

  inputs.switchMode.addEventListener("change", () => {
    const reverse = inputs.switchMode.value === "light-to-dark";
    inputs.startColor.value = reverse ? "#ffffff" : "#050505";
    inputs.endColor.value = reverse ? "#050505" : "#ffffff";
    inputs.titleColor.value = reverse ? "#ffffff" : "#050505";
    restartPreview();
  });
  Object.entries(inputs).forEach(([name, input]) => {
    const eventName = input.matches("select, input[type=checkbox]") ? "change" : "input";
    input.addEventListener(eventName, () => {
      updateOutputs();
      if (name !== "switchMode") restartPreview();
    });
  });
  $("#restartButton").addEventListener("click", restartPreview);
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
      event.currentTarget.textContent = "暂停";
      event.currentTarget.setAttribute("aria-pressed", "false");
    } else {
      pausedAt = currentTime();
      paused = true;
      event.currentTarget.textContent = "继续";
      event.currentTarget.setAttribute("aria-pressed", "true");
    }
  });
  function stepFrame(direction) {
    const next = currentTime() + direction / fps;
    paused = true;
    setTime(next);
    $("#pauseButton").textContent = "继续";
    $("#pauseButton").setAttribute("aria-pressed", "true");
  }
  $("#backButton").addEventListener("click", () => stepFrame(-1));
  $("#forwardButton").addEventListener("click", () => stepFrame(1));

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
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) { exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => { if (!blob) return; downloadBlob(blob, `switch-drop-${output.width}x${output.height}.png`); exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas(); const gifFps = 15; const duration = timing().cycle; const frameTotal = Math.ceil(duration * gifFps);
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < frameTotal; frame += 1) { renderFrame(output, frame / gifFps, output.width, output.height, 1); gif.addFrame(output, { copy: true, delay: 1000 / gifFps }); }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `switch-drop-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); });
    gif.render();
  });
  function supportedVideoType() {
    const candidates = [
      "video/mp4;codecs=h264", "video/mp4;codecs=avc1.42E01E", "video/mp4",
      "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }
  async function exportWebMFrames(output, duration) {
    if (typeof window.WebMWriter !== "function") throw new Error("逐帧视频编码器未加载");
    const writer = new WebMWriter({ quality: .94, frameRate: fps });
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    for (let frame = 0; frame < frameCount; frame += 1) {
      renderFrame(output, frame / fps, output.width, output.height, 1);
      writer.addFrame(output);
      if (frame % 2 === 0) {
        exportStatus.textContent = `正在逐帧生成 ${output.width} × ${output.height} 高清视频 · ${Math.round((frame + 1) / frameCount * 100)}%`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    exportStatus.textContent = "正在封装视频文件…";
    const blob = await writer.complete();
    if (!blob || !blob.size) throw new Error("视频文件为空");
    downloadBlob(blob, `switch-drop-${output.width}x${output.height}-hd.webm`);
    return { extension: "WEBM", size: blob.size };
  }
  async function exportVideo(verticalHD = false) {
    const output = verticalHD ? document.createElement("canvas") : makeExportCanvas();
    if (verticalHD) { output.width = 1080; output.height = 1920; }
    const duration = timing().cycle;
    if (!output.captureStream || typeof MediaRecorder === "undefined") {
      setExportBusy(true, `正在逐帧生成 ${output.width} × ${output.height} 高清视频 · 0%`);
      try {
        const result = await exportWebMFrames(output, duration);
        setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
      } catch (error) {
        console.error(error);
        setExportBusy(false, `视频导出失败：${error.message || "编码器异常"}`);
      }
      return;
    }
    const stream = output.captureStream(fps);
    const mimeType = supportedVideoType();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: verticalHD ? 20_000_000 : 12_000_000 } : undefined);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      setExportBusy(true, `正在逐帧生成 ${output.width} × ${output.height} 高清视频 · 0%`);
      try {
        const result = await exportWebMFrames(output, duration);
        setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
      } catch (fallbackError) {
        console.error(fallbackError);
        setExportBusy(false, `视频导出失败：${fallbackError.message || "编码器异常"}`);
      }
      return;
    }
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve, reject) => {
      recorder.onerror = (event) => reject(event.error || new Error("视频编码失败"));
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunks, { type });
        if (!blob.size) { reject(new Error("视频文件为空")); return; }
        downloadBlob(blob, `switch-drop-${output.width}x${output.height}-hd.${extension}`);
        resolve({ extension: extension.toUpperCase(), size: blob.size });
      };
    });
    setExportBusy(true, `正在录制 ${output.width} × ${output.height} 高清视频 · 0%`);
    recorder.start(250);
    const start = performance.now();
    try {
      await new Promise((resolve) => {
        const step = (now) => {
          const elapsed = Math.min(duration, (now - start) / 1000);
          renderFrame(output, elapsed, output.width, output.height, 1);
          exportStatus.textContent = `正在录制 ${output.width} × ${output.height} 高清视频 · ${Math.min(100, Math.round(elapsed / duration * 100))}%`;
          if (elapsed < duration) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
      recorder.stop();
      const result = await finished;
      setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      console.error(error);
      if (recorder.state !== "inactive") recorder.stop();
      setExportBusy(false, `视频导出失败：${error.message || "编码器异常"}`);
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  renderAssetGrid();
  document.fonts.ready.then(restartPreview);
  updateOutputs();
  previewLoop();
})();
