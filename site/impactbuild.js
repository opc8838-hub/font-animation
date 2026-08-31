(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const canvas = $("#impactCanvas");
  const shell = $("#canvasShell");
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  const PREVIEW = new URLSearchParams(location.search).has("preview");
  const STORAGE_KEY = "impactbuild-scheme-v1";
  const VERSION = 6;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const smooth = (value) => { const p = clamp(value); return p * p * (3 - 2 * p); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 4);
  const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const APPEND_INCOMING_DELAY = 0.12;
  const inertialProgress = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const inertialVelocity = (value) => {
    const p = clamp(value);
    const launch = smooth(p / 0.08);
    return launch * Math.pow(1 - p, 1.6);
  };
  const incomingRawProgress = (rawProgress) => clamp((rawProgress - APPEND_INCOMING_DELAY) / (1 - APPEND_INCOMING_DELAY));
  const impactCollapseAt = (progress) => smooth((progress - 0.28) / 0.68);
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const ms = (id) => Number($(id).value) / 1000;
  const number = (id) => Number($(id).value);
  const wordsOf = () => ($("#phrase").value || "").trim().split(/\s+/).filter(Boolean);
  const DEFAULT = {
    phrase: "Action becomes progress", fontFamily: "stg:inter", fontWeight: "600",
    backgroundColor: "#050505", textColor: "#f5f5f5", accentColor: "#b783ff",
    canvasPreset: "1920x1080", canvasWidth: "1920", canvasHeight: "1080",
    impactScale: "420", impactDuration: "100", settleDuration: "350", appendInterval: "333",
    appendDuration: "200", finalHold: "400", blurStrength: "115", masterSpeed: "100",
    fontSize: "10.5", wordGap: "42", iconTextGap: "28", positionX: "50", positionY: "50",
    settleScale: "100", appendSqueeze: "0", appendTravel: "200", breathAmount: "1.5", tailBlur: "22",
    exportDuration: "cycle", exportFps: "30", customDuration: "3.5",
    wordSettings: [
      { color: "#b783ff", offset: 0, strength: 100 },
      { color: "#f5f5f5", offset: 0, strength: 100 },
      { color: "#b783ff", offset: 0, strength: 100 }
    ], assetTunes: {}, backgroundMedia: null
  };

  let wordSettings = structuredClone(DEFAULT.wordSettings);
  let backgroundMedia = null;
  let backgroundElement = null;
  let backgroundReady = false;
  let startStamp = performance.now();
  let pausedAt = 0;
  let paused = false;
  let persistTimer = 0;
  const iconImages = new Map();
  let assetTunes = {};
  let selectedCandidate = "";
  let editingAssetId = "";

  function dimensions() {
    if ($("#canvasPreset").value === "custom") return [clamp(number("#canvasWidth"), 240, 3840), clamp(number("#canvasHeight"), 240, 3840)];
    return $("#canvasPreset").value.split("x").map(Number);
  }

  function syncCanvasShell() {
    const [w, h] = dimensions();
    const stage = $(".impact-stage");
    const availableW = Math.max(120, stage.clientWidth - (PREVIEW ? 0 : 68));
    const availableH = Math.max(120, stage.clientHeight - (PREVIEW ? 0 : 152));
    const ratio = w / h;
    let cssW = availableW;
    let cssH = cssW / ratio;
    if (cssH > availableH) { cssH = availableH; cssW = cssH * ratio; }
    shell.style.width = `${Math.round(cssW)}px`;
    shell.style.height = `${Math.round(cssH)}px`;
    shell.style.aspectRatio = `${w}/${h}`;
    resizeCanvas();
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, shell.clientWidth);
    const h = Math.max(1, shell.clientHeight);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.dataset.dpr = String(dpr);
    }
  }

  function ensureWordSettings() {
    const words = wordsOf();
    const previous = wordSettings;
    wordSettings = words.map((_, index) => previous[index] || {
      color: index % 2 === 0 ? $("#accentColor").value : $("#textColor").value,
      offset: 0, strength: 100
    });
  }

  function wordStart(index) {
    if (index <= 0) return 0;
    const firstJoin = ms("#impactDuration") + ms("#settleDuration");
    return firstJoin + (index - 1) * ms("#appendInterval") + (wordSettings[index]?.offset || 0) / 1000;
  }

  function timeline() {
    const words = wordsOf();
    const impactEnd = ms("#impactDuration");
    const settleEnd = impactEnd + ms("#settleDuration");
    const appendEnd = words.length > 1
      ? Math.max(...words.slice(1).map((_, index) => wordStart(index + 1) + ms("#appendDuration")))
      : settleEnd;
    const finalEnd = appendEnd + ms("#finalHold");
    const tail = 0.15;
    return { impactEnd, settleEnd, appendEnd, finalEnd, tail, cycle: Math.max(0.5, finalEnd + tail) / Math.max(0.4, number("#masterSpeed") / 100) };
  }

  function rawLocalTime(time) {
    const speed = Math.max(0.4, number("#masterSpeed") / 100);
    return mod(time, timeline().cycle) * speed;
  }

  function fontSpec(ctx, px) {
    const preset = window.STGFontLibrary?.preset($("#fontFamily").value);
    const family = window.STGFontLibrary?.family($("#fontFamily").value) || '"STG Noto Sans SC",sans-serif';
    const style = preset?.style || "normal";
    ctx.font = `${style} ${number("#fontWeight")} ${px}px ${family}`;
    ctx.textBaseline = "middle";
  }

  function iconAsset(word) {
    const match = /^\{\{([^{}]+)\}\}$/.exec(word);
    return match ? window.STGIconLibrary?.byId.get(match[1]) || null : null;
  }

  function ensureIconImage(asset) {
    if (!asset || asset.kind === "vector") return null;
    if (!iconImages.has(asset.libraryId)) {
      const image = new Image(); image.src = asset.url; iconImages.set(asset.libraryId, image);
    }
    return iconImages.get(asset.libraryId);
  }

  function measurePhrase(ctx, words, fontPx, gapPx) {
    const items = words.map((word) => {
      const asset = iconAsset(word);
      const width = asset ? fontPx + number("#iconTextGap") / 100 * fontPx : ctx.measureText(word).width;
      return { word, asset, width };
    });
    const width = items.reduce((sum, item) => sum + item.width, 0) + Math.max(0, items.length - 1) * gapPx;
    return { items, width };
  }

  function visibleState(time, words) {
    let count = words.length ? 1 : 0;
    let activeIndex = -1;
    let progress = 1;
    let rawProgress = 1;
    for (let index = 1; index < words.length; index += 1) {
      const start = wordStart(index);
      if (time >= start) {
        count = index + 1;
        const duration = Math.max(0.001, ms("#appendDuration") / Math.max(0.35, (wordSettings[index]?.strength || 100) / 100));
        if (time < start + duration) {
          activeIndex = index;
          rawProgress = clamp((time - start) / duration);
          progress = inertialProgress(rawProgress);
        }
      }
    }
    return { count, activeIndex, progress, rawProgress };
  }

  function drawBackground(ctx, time, w, h) {
    ctx.fillStyle = $("#backgroundColor").value; ctx.fillRect(0, 0, w, h);
    if (!backgroundReady || !backgroundElement) return;
    const sw = backgroundElement.videoWidth || backgroundElement.naturalWidth || 1;
    const sh = backgroundElement.videoHeight || backgroundElement.naturalHeight || 1;
    const scale = Math.max(w / sw, h / sh);
    const dw = sw * scale, dh = sh * scale;
    try { ctx.drawImage(backgroundElement, (w - dw) / 2, (h - dh) / 2, dw, dh); } catch (_) {}
    if (backgroundElement instanceof HTMLVideoElement && backgroundElement.duration) {
      const target = mod(time, backgroundElement.duration);
      if (Math.abs(backgroundElement.currentTime - target) > 0.08) backgroundElement.currentTime = target;
    }
  }

  function drawItem(ctx, item, x, y, fontPx, color, time) {
    if (!item.asset) { ctx.fillStyle = color; ctx.fillText(item.word, x, y); return; }
    const tune = assetTunes[item.asset.libraryId] || { scale: 100, offsetX: 0, offsetY: 0 };
    const size = fontPx * tune.scale / 100;
    ctx.save(); ctx.translate(x + item.width / 2 + fontPx * tune.offsetX / 100, y + fontPx * tune.offsetY / 100);
    if (item.asset.kind === "vector") window.STGIconLibrary.drawVector(ctx, item.asset, size, time);
    else {
      const image = ensureIconImage(item.asset);
      if (image?.complete) ctx.drawImage(image, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }

  function drawPhraseLayer(ctx, time, w, h, alpha, offsetX, blurPx, scaleXExtra, colorOverride = "") {
    const words = wordsOf(); if (!words.length) return;
    const minSide = Math.min(w, h);
    let fontPx = minSide * number("#fontSize") / 100;
    fontSpec(ctx, fontPx);
    const gapPx = number("#wordGap") / 100 * fontPx;
    const state = visibleState(time, words);
    const currentWords = words.slice(0, state.count);
    const current = measurePhrase(ctx, currentWords, fontPx, gapPx);
    const previous = state.activeIndex > 0 ? measurePhrase(ctx, words.slice(0, state.activeIndex), fontPx, gapPx) : current;

    const settledScale = number("#settleScale") / 100;
    let scale = settledScale;
    const impactDuration = Math.max(0.001, ms("#impactDuration"));
    if (time < impactDuration) {
      const p = clamp(time / impactDuration);
      const reveal = easeOut(p / 0.2);
      const collapse = impactCollapseAt(p);
      const incomingScale = lerp(2.15, number("#impactScale") / 100, reveal);
      scale = lerp(incomingScale, settledScale * 0.92, collapse);
    } else if (time < timeline().settleEnd) {
      const settleMotionDuration = Math.min(0.07, Math.max(0.001, timeline().settleEnd - impactDuration));
      const settleProgress = clamp((time - impactDuration) / settleMotionDuration);
      scale = lerp(settledScale * 0.92, settledScale, easeOutCubic(settleProgress));
    }
    if (time >= timeline().appendEnd && time < timeline().finalEnd) {
      const breath = number("#breathAmount") / 100;
      scale *= 1 + Math.sin((time - timeline().appendEnd) * Math.PI * 1.15) * breath;
    }

    const transitionAmount = state.activeIndex > 0 ? Math.sin(Math.PI * state.progress) : 0;
    const squeeze = 1 - number("#appendSqueeze") / 100 * transitionAmount;
    const layoutWidth = current.width;
    const centerX = w * number("#positionX") / 100;
    const centerY = h * number("#positionY") / 100;
    const impactAmount = time < impactDuration ? 1 - impactCollapseAt(time / impactDuration) : 0;
    const widthEnvelope = lerp(0.9, 0.72, impactAmount);
    const fit = Math.min(1, w * widthEnvelope / Math.max(1, current.width * scale));
    scale *= fit;
    const left = centerX - layoutWidth / 2;
    const previousLeft = centerX - previous.width / 2;
    const appendShift = Math.max(0, previousLeft - left);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";
    ctx.translate(centerX + offsetX, centerY);
    ctx.scale(scale * squeeze * scaleXExtra, scale);
    ctx.translate(-centerX, -centerY);
    let cursor = left;
    current.items.forEach((item, index) => {
      const setting = wordSettings[index] || {};
      let itemAlpha = 1;
      let travel = 0;
      let followOffset = 0;
      if (state.activeIndex > 0 && index < state.activeIndex) {
        followOffset = appendShift * (1 - state.progress);
      }
      if (index === state.activeIndex) {
        const incomingRaw = incomingRawProgress(state.rawProgress);
        const follow = inertialProgress(incomingRaw);
        itemAlpha = smooth(incomingRaw / 0.55);
        followOffset = appendShift * (1 - follow);
        travel = number("#appendTravel") / 100 * fontPx * (1 - follow);
      }
      ctx.save(); ctx.globalAlpha *= itemAlpha;
      drawItem(ctx, item, cursor + followOffset + travel, centerY, fontPx, colorOverride || setting.color || $("#textColor").value, time);
      ctx.restore(); cursor += item.width + gapPx;
    });
    ctx.restore();
  }

  function renderFrame(ctx, seconds, w, h, ratio = 1) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const time = rawLocalTime(seconds);
    drawBackground(ctx, time, w, h);
    const state = visibleState(time, wordsOf());
    const impactDuration = Math.max(0.001, ms("#impactDuration"));
    const impactProgress = clamp(time / impactDuration);
    const impactReveal = time < impactDuration ? easeOut((impactProgress - 0.16) / 0.12) : 1;
    const impactCollapse = time < impactDuration ? impactCollapseAt(impactProgress) : 1;
    const impact = time < impactDuration ? impactReveal * (1 - impactCollapse) : 0;
    const append = state.activeIndex > 0 ? inertialVelocity(state.rawProgress) : 0;
    const tail = time > timeline().finalEnd ? clamp((time - timeline().finalEnd) / timeline().tail) : 0;
    const strength = number("#blurStrength") / 100;
    if (impact > 0.01 && strength > 0) {
      const distance = Math.min(w, h) * 0.29 * impact * strength;
      drawPhraseLayer(ctx, time, w, h, 0.3 * impact, 0, 0, 1 + 0.38 * impact);
      for (let index = 4; index >= 1; index -= 1) {
        const amount = index / 4;
        const alpha = 0.09 * (1 - amount * 0.28) * impact;
        const stretch = 1 + 0.56 * amount * impact;
        drawPhraseLayer(ctx, time, w, h, alpha, distance * amount, 0, stretch);
        drawPhraseLayer(ctx, time, w, h, alpha, -distance * amount, 0, stretch);
      }
    }
    if (append > 0.01 && strength > 0) {
      const blurUnit = Math.min(w, h) / 304;
      const distance = Math.min(w, h) * 0.32 * append * strength;
      const appendLag = Math.max(0.001, ms("#appendDuration")) * 0.58;
      drawPhraseLayer(ctx, time, w, h, 0.58 * append, distance * 0.34, 3.4 * blurUnit, 1 + 0.18 * append);
      for (let index = 7; index >= 1; index -= 1) {
        const amount = index / 7;
        const alpha = 0.14 * (1 - amount * 0.38) * append;
        drawPhraseLayer(ctx, time, w, h, alpha, distance * amount, 0, 1 + 0.16 * amount * append);
      }
      for (let index = 6; index >= 1; index -= 1) {
        const amount = index / 6;
        const sampledTime = Math.max(wordStart(state.activeIndex), time - appendLag * amount);
        const alpha = 0.12 * (1 - amount * 0.34) * append;
        drawPhraseLayer(ctx, sampledTime, w, h, alpha, distance * amount * 0.86, 0, 1 + 0.13 * amount * append);
      }
    }
    const tailSmear = tail * number("#tailBlur") / 100;
    if (tailSmear > 0.01 && strength > 0) {
      const distance = Math.min(w, h) * 0.08 * tailSmear * strength;
      for (let index = 5; index >= 1; index -= 1) {
        const amount = index / 5;
        const alpha = 0.045 * (1 - amount * 0.4) * tailSmear;
        drawPhraseLayer(ctx, time, w, h, alpha, distance * amount, 0, 1 + 0.08 * tailSmear);
        drawPhraseLayer(ctx, time, w, h, alpha, -distance * amount, 0, 1 + 0.08 * tailSmear);
      }
    }
    const leadAlpha = time < impactDuration ? impactReveal : 1;
    drawPhraseLayer(ctx, time, w, h, leadAlpha, 0, 0, 1);
    if (impact > 0.01) drawPhraseLayer(ctx, time, w, h, 0.76 * impact, 0, 0, 1.04, $("#textColor").value);
    if (ctx.filter !== "none") ctx.filter = "none";
    if (ctx === context) {
      canvas.dataset.timelineTime = seconds.toFixed(4);
      canvas.dataset.phase = time.toFixed(4);
      canvas.dataset.cycleDuration = timeline().cycle.toFixed(4);
    }
  }

  function currentTime() { return paused ? pausedAt : (performance.now() - startStamp) / 1000; }
  function setTime(time) { pausedAt = Math.max(0, time); startStamp = performance.now() - pausedAt * 1000; }
  function replay() { paused = false; setTime(0); syncPauseLabels(); }
  function syncPauseLabels() { const label = paused ? "继续" : "暂停"; $("#stagePause").textContent = label; }
  function togglePause() { if (paused) { paused = false; startStamp = performance.now() - pausedAt * 1000; } else { pausedAt = currentTime(); paused = true; } syncPauseLabels(); }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.dpr || 1);
    renderFrame(context, currentTime(), canvas.width / ratio, canvas.height / ratio, ratio);
    updatePlayhead();
    requestAnimationFrame(previewLoop);
  }

  function beats() {
    const time = timeline(); const words = wordsOf();
    const result = [
      { label: "首词冲击", start: 0, end: time.impactEnd, kind: "impact" },
      { label: "收稳", start: time.impactEnd, end: time.settleEnd, kind: "hold" }
    ];
    words.slice(1).forEach((word, index) => result.push({ label: `接入 ${word}`, start: wordStart(index + 1), end: wordStart(index + 1) + ms("#appendDuration"), kind: "append" }));
    result.push({ label: "整句停留", start: time.appendEnd, end: time.finalEnd, kind: "final" }, { label: "模糊收尾", start: time.finalEnd, end: time.finalEnd + time.tail, kind: "contact" });
    return result;
  }

  function renderTimeline() {
    const bar = $("#choreoBar"); const legend = $("#choreoLegend");
    bar.querySelectorAll(".me-choreo-block").forEach((node) => node.remove()); legend.replaceChildren();
    const total = timeline().cycle * Math.max(0.4, number("#masterSpeed") / 100);
    beats().forEach((beat, index) => {
      const block = document.createElement("button");
      block.type = "button"; block.className = `me-choreo-block is-${beat.kind}`;
      block.style.width = `${Math.max(9, (beat.end - beat.start) / total * 100)}%`;
      block.innerHTML = `<em>${index + 1}</em><strong>${beat.label}</strong><small>${beat.start.toFixed(2)}–${beat.end.toFixed(2)}s</small>`;
      block.addEventListener("click", () => setTime(beat.start / Math.max(0.4, number("#masterSpeed") / 100)));
      bar.insertBefore(block, $("#choreoPlayhead"));
      const item = document.createElement("li"); item.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.label}</b><span>${(beat.end - beat.start).toFixed(2)}秒</span>`; legend.append(item);
    });
  }

  function updatePlayhead() {
    const local = mod(currentTime(), timeline().cycle) / timeline().cycle;
    $("#choreoPlayhead").style.left = `${local * 100}%`;
    const raw = rawLocalTime(currentTime());
    const all = beats(); const active = all.findIndex((beat) => raw >= beat.start && raw < beat.end);
    $$(".me-choreo-block").forEach((node, index) => node.classList.toggle("is-active", index === active));
  }

  function renderWordRows() {
    ensureWordSettings(); const box = $("#wordRows"); box.replaceChildren();
    wordsOf().forEach((word, index) => {
      const setting = wordSettings[index]; const row = document.createElement("div"); row.className = "word-row";
      row.innerHTML = `<div><strong>${word}</strong><small>${index === 0 ? "首词 · 大幅冲击" : `第 ${index + 1} 拍接入`}</small></div><input type="color" value="${setting.color}" aria-label="${word}颜色"><div class="word-controls">${index ? `<label>节拍微调 <output>${setting.offset}ms</output><input data-key="offset" type="range" min="-300" max="600" value="${setting.offset}"></label>` : ""}<label>冲击强度 <output>${setting.strength}%</output><input data-key="strength" type="range" min="35" max="180" value="${setting.strength}"></label></div>`;
      row.querySelector('input[type="color"]').addEventListener("input", (event) => { setting.color = event.target.value; schedulePersist(); });
      row.querySelectorAll('input[type="range"]').forEach((input) => input.addEventListener("input", () => { setting[input.dataset.key] = Number(input.value); input.previousElementSibling.textContent = input.dataset.key === "offset" ? `${input.value}ms` : `${input.value}%`; renderTimeline(); schedulePersist(); }));
      box.append(row);
    });
  }

  function usedAssetIds() {
    const found = [];
    const regex = /\{\{([^{}]+)\}\}/g;
    let match;
    while ((match = regex.exec($("#phrase").value || ""))) if (window.STGIconLibrary?.byId.has(match[1]) && !found.includes(match[1])) found.push(match[1]);
    return found;
  }

  function setAssetManager(expanded) {
    const panel = $("#assetPanel");
    panel.classList.toggle("is-list-expanded", expanded);
    $("#selectedAssetItems").hidden = !expanded;
    $("#toggleSelectedAssets").textContent = expanded ? "收起已选" : "展开已选";
  }

  function selectAssetCandidate(id) {
    selectedCandidate = id;
    const asset = window.STGIconLibrary?.byId.get(id);
    $("#assetCandidateName").textContent = asset?.name || "尚未选择";
    $("#commitAsset").disabled = !asset;
    $$(".me-asset-choice").forEach((button) => button.classList.toggle("is-selected", button.dataset.assetId === id));
  }

  function insertSelectedAsset() {
    if (!selectedCandidate) return;
    const field = $("#phrase"); const start = field.selectionStart ?? field.value.length; const end = field.selectionEnd ?? start;
    const token = `{{${selectedCandidate}}}`;
    const leftSpace = start > 0 && !/\s/.test(field.value[start - 1]) ? " " : "";
    const rightSpace = end < field.value.length && !/\s/.test(field.value[end]) ? " " : "";
    field.setRangeText(`${leftSpace}${token}${rightSpace}`, start, end, "end");
    field.dispatchEvent(new Event("input", { bubbles: true }));
    renderSelectedAssets();
  }

  function removeAssetToken(id) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    $("#phrase").value = $("#phrase").value.replace(new RegExp(`\\s*\\{\\{${escaped}\\}\\}\\s*`, "g"), " ").trim().replace(/\s+/g, " ");
    $("#phrase").dispatchEvent(new Event("input", { bubbles: true }));
    renderSelectedAssets();
  }

  function openAssetEditor(id) {
    editingAssetId = id;
    const asset = window.STGIconLibrary?.byId.get(id); const tune = assetTunes[id] || (assetTunes[id] = { scale: 100, offsetX: 0, offsetY: 0 });
    $("#assetDrawerTitle").textContent = asset?.name || "图标编辑";
    $("#assetScale").value = tune.scale; $("#assetOffsetX").value = tune.offsetX; $("#assetOffsetY").value = tune.offsetY;
    syncAssetEditor(); $("#assetDrawer").hidden = false;
  }

  function closeAssetEditor() { editingAssetId = ""; $("#assetDrawer").hidden = true; }

  function syncAssetEditor() {
    $("#assetScaleOut").textContent = `${$("#assetScale").value}%`;
    $("#assetOffsetXOut").textContent = `${$("#assetOffsetX").value}%`;
    $("#assetOffsetYOut").textContent = `${$("#assetOffsetY").value}%`;
  }

  function renderSelectedAssets() {
    const ids = usedAssetIds(); const box = $("#selectedAssetItems"); box.replaceChildren(); $("#selectedAssetCount").textContent = String(ids.length);
    ids.forEach((id, index) => {
      const asset = window.STGIconLibrary.byId.get(id); const row = document.createElement("div"); row.className = "selected-asset-row";
      row.innerHTML = `<img src="${asset.url}" alt=""><span><b>${asset.name}</b><small>第 ${index + 1} 个图标词位</small></span><button type="button" data-edit>单独编辑</button><button type="button" data-remove>×</button>`;
      row.querySelector("[data-edit]").addEventListener("click", () => openAssetEditor(id)); row.querySelector("[data-remove]").addEventListener("click", () => removeAssetToken(id)); box.append(row);
    });
    if (!ids.length) { const empty = document.createElement("p"); empty.className = "status-copy"; empty.textContent = "句子里还没有图标。"; box.append(empty); }
  }

  function renderAssets() {
    const library = $("#assetLibrary"); library.replaceChildren();
    const assets = [...(window.STGIconLibrary?.groups.flow || []), ...(window.STGIconLibrary?.groups.gifMotion || [])];
    assets.forEach((asset) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "me-asset-choice"; button.dataset.assetId = asset.libraryId;
      button.innerHTML = `<img src="${asset.url}" alt=""><span>${asset.name}</span>`; button.addEventListener("click", () => selectAssetCandidate(asset.libraryId)); library.append(button);
    });
    renderSelectedAssets();
  }

  const outputMap = {
    impactScale: (v) => `${(v / 100).toFixed(2)}×`, impactDuration: (v) => `${(v / 1000).toFixed(2)}秒`, settleDuration: (v) => `${(v / 1000).toFixed(2)}秒`, appendInterval: (v) => `${(v / 1000).toFixed(2)}秒`, appendDuration: (v) => `${(v / 1000).toFixed(2)}秒`, finalHold: (v) => `${(v / 1000).toFixed(2)}秒`, blurStrength: (v) => `${v}%`, masterSpeed: (v) => `${(v / 100).toFixed(2)}×`, fontSize: (v) => `${v}%`, wordGap: (v) => `${v}%`, iconTextGap: (v) => `${v}%`, positionX: (v) => `${v}%`, positionY: (v) => `${v}%`, settleScale: (v) => `${(v / 100).toFixed(2)}×`, appendSqueeze: (v) => `${v}%`, appendTravel: (v) => `${v}%`, breathAmount: (v) => `${v}%`, tailBlur: (v) => `${v}%`
  };

  function updateOutputs() { Object.entries(outputMap).forEach(([id, format]) => { const node = $(`#${id}`); const out = $(`#${id}Out`); if (node && out) out.textContent = format(Number(node.value)); }); }

  function collectState() {
    const state = { version: VERSION, wordSettings, assetTunes, backgroundMedia };
    [...Object.keys(DEFAULT).filter((key) => key !== "wordSettings" && key !== "backgroundMedia")].forEach((key) => { const node = $(`#${key}`); if (node) state[key] = node.value; });
    return state;
  }

  function applyState(next) {
    const state = { ...DEFAULT, ...(next || {}) };
    Object.entries(state).forEach(([key, value]) => { const node = $(`#${key}`); if (node && typeof value !== "object") node.value = String(value); });
    wordSettings = Array.isArray(state.wordSettings) ? structuredClone(state.wordSettings) : [];
    assetTunes = state.assetTunes && typeof state.assetTunes === "object" ? structuredClone(state.assetTunes) : {};
    setBackgroundMedia(state.backgroundMedia || null);
    $("#customSize").hidden = $("#canvasPreset").value !== "custom";
    ensureWordSettings(); renderWordRows(); renderAssets(); renderTimeline(); updateOutputs(); syncCanvasShell(); setTime(0);
  }

  function schedulePersist() {
    clearTimeout(persistTimer); persistTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState())); } catch (_) {} }, 220);
  }

  function setBackgroundMedia(media) {
    backgroundMedia = media; backgroundElement = null; backgroundReady = false;
    if (!media?.dataUrl) return;
    if (media.type?.startsWith("video/")) {
      const video = document.createElement("video"); video.src = media.dataUrl; video.muted = true; video.loop = true; video.playsInline = true; video.addEventListener("loadeddata", () => { backgroundReady = true; video.play().catch(() => {}); }); backgroundElement = video;
    } else {
      const image = new Image(); image.onload = () => { backgroundReady = true; }; image.src = media.dataUrl; backgroundElement = image;
    }
  }

  async function prepareBackground(time) {
    if (!(backgroundElement instanceof HTMLVideoElement) || !backgroundReady || !Number.isFinite(backgroundElement.duration)) return;
    const target = mod(time, backgroundElement.duration);
    if (Math.abs(backgroundElement.currentTime - target) < 0.02) return;
    await new Promise((resolve) => { const done = () => resolve(); backgroundElement.addEventListener("seeked", done, { once: true }); backgroundElement.currentTime = target; setTimeout(resolve, 180); });
  }

  function exportDuration() { const value = $("#exportDuration").value; return value === "cycle" ? timeline().cycle : value === "custom" ? clamp(number("#customDuration"), 0.5, 30) : Number(value); }
  function makeExportCanvas() { const [w, h] = dimensions(); const target = document.createElement("canvas"); target.width = Math.round(w / 2) * 2; target.height = Math.round(h / 2) * 2; return target; }
  function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1200); }
  function busy(value, text) { ["#exportPng", "#exportGif", "#exportMp4"].forEach((id) => { $(id).disabled = value; }); $("#exportStatus").textContent = text; }

  $("#exportPng").addEventListener("click", async () => { const target = makeExportCanvas(); await prepareBackground(rawLocalTime(currentTime())); renderFrame(target.getContext("2d"), currentTime(), target.width, target.height); target.toBlob((blob) => { if (blob) download(blob, `impact-build-${target.width}x${target.height}.png`); }, "image/png"); });
  $("#exportGif").addEventListener("click", async () => {
    if (!window.GIF) return busy(false, "GIF 编码器未加载");
    const target = makeExportCanvas(); const ctx = target.getContext("2d"); const fps = number("#exportFps"); const duration = exportDuration(); const count = Math.ceil(duration * fps); busy(true, `准备 GIF · 0/${count}`);
    const gif = new GIF({ workers: 2, quality: 10, width: target.width, height: target.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < count; frame += 1) { await prepareBackground(rawLocalTime(frame / fps)); renderFrame(ctx, frame / fps, target.width, target.height); gif.addFrame(target, { copy: true, delay: 1000 / fps }); if (frame % 4 === 0) { $("#exportStatus").textContent = `准备 GIF · ${frame + 1}/${count}`; await new Promise((resolve) => setTimeout(resolve, 0)); } }
    gif.on("progress", (progress) => { $("#exportStatus").textContent = `编码 GIF · ${Math.round(progress * 100)}%`; }); gif.on("finished", (blob) => { download(blob, `impact-build-${target.width}x${target.height}-${fps}fps.gif`); busy(false, "GIF 已生成"); }); gif.render();
  });
  $("#exportMp4").addEventListener("click", async () => {
    if (!window.HME?.createH264MP4Encoder) return busy(false, "MP4 编码器未加载");
    const target = makeExportCanvas(); const ctx = target.getContext("2d", { willReadFrequently: true }); const fps = number("#exportFps"); const duration = exportDuration(); const count = Math.ceil(duration * fps); busy(true, `导出 MP4 · 0%`);
    const encoder = await HME.createH264MP4Encoder(); encoder.outputFilename = "impact-build.mp4"; encoder.width = target.width; encoder.height = target.height; encoder.frameRate = fps; encoder.kbps = 16000; encoder.groupOfPictures = Math.max(1, Math.round(fps / 2)); encoder.initialize();
    try { for (let frame = 0; frame < count; frame += 1) { await prepareBackground(rawLocalTime(frame / fps)); renderFrame(ctx, frame / fps, target.width, target.height); encoder.addFrameRgba(ctx.getImageData(0, 0, target.width, target.height).data); if (frame % 2 === 0) { $("#exportStatus").textContent = `导出 MP4 · ${Math.round((frame + 1) / count * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); } } encoder.finalize(); const bytes = encoder.FS.readFile(encoder.outputFilename); download(new Blob([bytes], { type: "video/mp4" }), `impact-build-${target.width}x${target.height}-${fps}fps.mp4`); busy(false, "MP4 已生成"); } catch (error) { busy(false, `MP4 失败：${error.message}`); } finally { try { encoder.delete(); } catch (_) {} }
  });

  $("#stagePause").addEventListener("click", togglePause); $("#stageReplay").addEventListener("click", replay);
  $("#canvasPreset").addEventListener("change", () => { $("#customSize").hidden = $("#canvasPreset").value !== "custom"; syncCanvasShell(); renderTimeline(); schedulePersist(); });
  ["#canvasWidth", "#canvasHeight"].forEach((id) => $(id).addEventListener("input", () => { syncCanvasShell(); schedulePersist(); }));
  $("#phrase").addEventListener("input", () => { ensureWordSettings(); renderWordRows(); renderSelectedAssets(); renderTimeline(); schedulePersist(); });
  $("#backgroundUpload").addEventListener("change", (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; const reader = new FileReader(); reader.onload = () => { setBackgroundMedia({ name: file.name, type: file.type, dataUrl: reader.result }); schedulePersist(); }; reader.readAsDataURL(file); });
  $("#clearBackground").addEventListener("click", () => { setBackgroundMedia(null); schedulePersist(); });
  $("#exportDuration").addEventListener("change", () => { $("#customDurationWrap").hidden = $("#exportDuration").value !== "custom"; schedulePersist(); });
  $("#toggleSelectedAssets").addEventListener("click", () => setAssetManager(!$("#assetPanel").classList.contains("is-list-expanded")));
  $("#commitAsset").addEventListener("click", insertSelectedAsset);
  $("#closeAssetDrawer").addEventListener("click", closeAssetEditor);
  ["#assetScale", "#assetOffsetX", "#assetOffsetY"].forEach((id) => $(id).addEventListener("input", () => {
    if (!editingAssetId) return; const tune = assetTunes[editingAssetId] || (assetTunes[editingAssetId] = { scale: 100, offsetX: 0, offsetY: 0 });
    tune.scale = number("#assetScale"); tune.offsetX = number("#assetOffsetX"); tune.offsetY = number("#assetOffsetY"); syncAssetEditor(); schedulePersist();
  }));
  document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!$("#assetDrawer").hidden) closeAssetEditor(); else if ($("#assetPanel").classList.contains("is-list-expanded")) setAssetManager(false); });

  $$("input,textarea,select").forEach((node) => {
    if (["phrase", "canvasPreset", "canvasWidth", "canvasHeight", "backgroundUpload", "importScheme"].includes(node.id)) return;
    node.addEventListener("input", () => { updateOutputs(); if (/impactDuration|settleDuration|appendInterval|appendDuration|finalHold|masterSpeed/.test(node.id)) renderTimeline(); schedulePersist(); });
    node.addEventListener("change", schedulePersist);
  });

  $("#saveScheme").addEventListener("click", () => { const blob = new Blob([JSON.stringify(collectState(), null, 2)], { type: "application/json" }); download(blob, "impact-build-scheme.json"); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState())); } catch (_) {} $("#schemeStatus").textContent = "方案已保存并下载"; });
  $("#importScheme").addEventListener("change", async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { applyState(JSON.parse(await file.text())); schedulePersist(); $("#schemeStatus").textContent = "方案导入成功"; } catch (_) { $("#schemeStatus").textContent = "方案文件无法读取"; } });
  $("#restoreDefault").addEventListener("click", () => { applyState(DEFAULT); schedulePersist(); $("#schemeStatus").textContent = "已恢复默认示例"; });
  $("#clearRebuild").addEventListener("click", () => { applyState({ ...DEFAULT, phrase: "", wordSettings: [] }); schedulePersist(); $("#schemeStatus").textContent = "已清空，可重新输入"; });

  window.addEventListener("resize", syncCanvasShell);
  let initial = DEFAULT;
  if (!PREVIEW) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.version === VERSION) initial = saved;
      else if (saved?.version === 1 || saved?.version === 2 || saved?.version === 3 || saved?.version === 4 || saved?.version === 5) {
        const usedOldDefault = saved.settleDuration === "900" || saved.settleDuration === "320" || saved.settleDuration === "200" || saved.settleDuration === "367";
        const usedOldAppendDefault = saved.appendDuration === "170";
        initial = {
          ...saved,
          version: VERSION,
          settleDuration: usedOldDefault ? DEFAULT.settleDuration : saved.settleDuration,
          appendInterval: saved.appendInterval === "667" ? DEFAULT.appendInterval : saved.appendInterval,
          appendDuration: usedOldAppendDefault ? DEFAULT.appendDuration : saved.appendDuration,
          finalHold: saved.finalHold === "1300" ? DEFAULT.finalHold : saved.finalHold,
          appendSqueeze: saved.appendSqueeze === "25" ? DEFAULT.appendSqueeze : saved.appendSqueeze
        };
      }
    } catch (_) {}
  }
  applyState(initial);
  renderAssets();
  window.STGFontLibrary?.enhanceAll(document);
  document.fonts?.ready?.then(() => replay());
  previewLoop();
})();
