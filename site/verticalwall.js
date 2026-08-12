(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    rows: $("#rowsInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    lineGap: $("#lineGap"), assetScale: $("#assetScale"), rowCount: $("#rowCount"),
    background: $("#backgroundColor"), foreground: $("#textColor"),
    motionMode: $("#motionMode"), introWord: $("#introWord"), nextWord: $("#nextWord"), finalStates: $("#finalStates"),
    collapseDirection: $("#collapseDirection"), introDuration: $("#introDuration"),
    singleDuration: $("#singleDuration"), spreadDuration: $("#spreadDuration"),
    holdDuration: $("#holdDuration"), collapseDuration: $("#collapseDuration"), finalDuration: $("#finalDuration"),
    bounce: $("#bounce"), stagger: $("#stagger"), edgeFade: $("#edgeFade"),
    verticalDrift: $("#verticalDrift"), horizontalPhase: $("#horizontalPhase"), nextOpacity: $("#nextOpacity"),
    finalShrink: $("#finalShrink"), finalSwapInterval: $("#finalSwapInterval"),
    assetItemScale: $("#assetItemScale"),
    assetOffsetX: $("#assetOffsetX"), assetOffsetY: $("#assetOffsetY")
  };

  const fontPresets = {
    "snap-inter-medium": { family: "Continuation Inter Medium", weight: 500, style: "normal" },
    "snap-inter-black": { family: "Continuation Inter", weight: 900, style: "normal" },
    "snap-ibm-plex": { family: "Continuation IBM Plex Mono", weight: 700, style: "italic" },
    "snap-space-mono": { family: "Continuation Space Mono", weight: 700, style: "normal" },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 700, style: "normal" },
    "ff-space-grotesk": { family: "Continuation Space Grotesk", weight: 400, style: "normal" },
    "ff-martian-mono": { family: "Continuation Martian Mono", weight: 400, style: "normal" },
    "ff-oi": { family: "Continuation Oi", weight: 400, style: "normal" },
    "ff-barriecito": { family: "Continuation Barriecito", weight: 400, style: "normal" },
    "uncut-berlin": { family: "Continuation Berlin", weight: 400, style: "normal" },
    "uncut-berlin-bold": { family: "Continuation Berlin", weight: 700, style: "normal" },
    "fs-satoshi": { family: "Satoshi", weight: 500, style: "normal" },
    "fs-general-sans": { family: "General Sans", weight: 500, style: "normal" },
    "fs-clash-display": { family: "Clash Display", weight: 500, style: "normal" },
    "fs-cabinet": { family: "Cabinet Grotesk", weight: 700, style: "normal" },
    "cn-noto-regular": { family: "Continuation SC", weight: 400, style: "normal" },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900, style: "normal" }
  };

  const assets = new Map();
  const layoutCache = new Map();
  let uploadSerial = 0;
  let assetRevision = 0;
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let rafId = 0;
  let activeTokenInput = inputs.rows;
  let selectedAssetId = "music";
  let animalLibraryOpen = false;

  const svg = (body, background = "#ffffff") => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`
  )}`;

  const builtIns = [
    ["music", "音乐", svg('<g transform="translate(-7.5 -1)"><path d="M45 25v35.5c-2.8-1.3-6.4-1.5-9.6-.4-6.9 2.1-11.1 7.7-9.3 12.5 1.8 4.9 8.8 7.1 15.7 5 6.1-1.9 10.2-6.5 9.6-11V38l23-6v23.5c-2.8-1.3-6.4-1.5-9.6-.4-6.9 2.1-11.1 7.7-9.3 12.5 1.8 4.9 8.8 7.1 15.7 5 6.1-1.9 10.2-6.5 9.6-11V20z" fill="white"/></g>', "#fa264f")],
    ["play", "播放", svg('<circle cx="50" cy="50" r="35" fill="none" stroke="white" stroke-width="6"/><path d="M40 29 69 50 40 71z" fill="white"/>', "#111111")],
    ["cloud", "云", svg('<g transform="translate(-4.5 -1.5)"><circle cx="37" cy="53" r="16" fill="white"/><circle cx="52" cy="44" r="22" fill="white"/><circle cx="72" cy="53" r="16" fill="white"/><rect x="21" y="52" width="67" height="22" rx="11" fill="white"/></g>', "#1389ff")],
    ["watch", "手表", svg('<rect x="27" y="20" width="46" height="60" rx="16" fill="#111"/><rect x="34" y="28" width="32" height="44" rx="10" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8")]
  ];

  function addAsset(id, label, src, removable = false) {
    const image = new Image();
    const asset = { id, label, src, image, ratio: 1, ready: false, removable, scale: 1, offsetX: 0, offsetY: 0 };
    image.onload = () => {
      asset.ratio = Math.max(.2, Math.min(5, image.naturalWidth / Math.max(1, image.naturalHeight)));
      asset.ready = true;
      assetRevision += 1;
      layoutCache.clear();
    };
    image.src = src;
    assets.set(id, asset);
    assetRevision += 1;
    layoutCache.clear();
  }

  builtIns.forEach(([id, label, src]) => addAsset(id, label, src));
  window.TokenAssetTools.animalAssets().forEach(({ id, label, src }) => addAsset(id, label, src));

  function parseRows() {
    const rows = inputs.rows.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return rows.length ? rows.slice(0, 24) : ["leveling up"];
  }

  function parseFinalStates() {
    return inputs.finalStates.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 24);
  }

  function renderAssetGrid() {
    const grid = $("#assetGrid");
    grid.replaceChildren();
    let animalIndex = 0;
    assets.forEach((asset) => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.classList.toggle("is-selected", asset.id === selectedAssetId);
      const isAnimal = asset.id.startsWith("animal");
      if (isAnimal && animalIndex++ >= 8 && !animalLibraryOpen) card.classList.add("is-library-hidden");
      const insert = document.createElement("button");
      insert.type = "button";
      insert.className = "asset-insert";
      insert.title = `插入 {{${asset.id}}}`;
      const preview = document.createElement("img");
      preview.src = asset.src;
      preview.alt = "";
      preview.loading = "lazy";
      preview.decoding = "async";
      const label = document.createElement("span");
      label.textContent = asset.label;
      insert.append(preview, label);
      insert.addEventListener("click", () => {
        selectedAssetId = asset.id;
        syncAssetTuner();
        renderAssetGrid();
        insertToken(asset.id);
      });
      card.append(insert);
      if (asset.removable) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "asset-remove";
        remove.textContent = "×";
        remove.title = `移除 ${asset.label}`;
        remove.addEventListener("click", () => removeAsset(asset.id));
        card.append(remove);
      }
      grid.append(card);
    });
    const divider = document.createElement("div");
    divider.className = "asset-library-divider";
    divider.innerHTML = `<span>透明动物素材 · 31 张</span><button type="button">${animalLibraryOpen ? "收起" : "查看全部"}</button>`;
    divider.querySelector("button").addEventListener("click", () => { animalLibraryOpen = !animalLibraryOpen; renderAssetGrid(); });
    grid.insertBefore(divider, grid.children[4] || null);
  }

  function syncAssetTuner() {
    const asset = assets.get(selectedAssetId) || assets.values().next().value;
    if (!asset) return;
    selectedAssetId = asset.id;
    $("#selectedAssetName").textContent = asset.label;
    inputs.assetItemScale.value = String(Math.round(asset.scale * 100));
    inputs.assetOffsetX.value = String(Math.round(asset.offsetX));
    inputs.assetOffsetY.value = String(Math.round(asset.offsetY));
    $("#assetItemScaleOut").textContent = `${Math.round(asset.scale * 100)}%`;
    $("#assetOffsetXOut").textContent = `${Math.round(asset.offsetX)}%`;
    $("#assetOffsetYOut").textContent = `${Math.round(asset.offsetY)}%`;
  }

  function updateSelectedAsset() {
    const asset = assets.get(selectedAssetId);
    if (!asset) return;
    asset.scale = Number(inputs.assetItemScale.value) / 100;
    asset.offsetX = Number(inputs.assetOffsetX.value);
    asset.offsetY = Number(inputs.assetOffsetY.value);
    assetRevision += 1;
    layoutCache.clear();
    syncAssetTuner();
  }

  function insertToken(id) {
    const textarea = activeTokenInput || inputs.rows;
    const token = `{{${id}}}`;
    const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
    const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : start;
    textarea.setRangeText(token, start, end, "end");
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  [inputs.rows, inputs.introWord, inputs.nextWord, inputs.finalStates].forEach((field) => {
    field.addEventListener("focus", () => { activeTokenInput = field; });
  });

  function removeAsset(id) {
    const asset = assets.get(id);
    if (!asset?.removable) return;
    assets.delete(id);
    if (selectedAssetId === id) selectedAssetId = "music";
    assetRevision += 1;
    layoutCache.clear();
    [inputs.rows, inputs.introWord, inputs.nextWord, inputs.finalStates].forEach((field) => {
      field.value = field.value.split(`{{${id}}}`).join("");
    });
    renderAssetGrid();
    syncAssetTuner();
  }

  $("#assetUpload").addEventListener("change", async (event) => {
    const files = [...event.currentTarget.files].filter((file) => file.type.startsWith("image/"));
    for (const file of files) {
      const id = `img${++uploadSerial}`;
      $("#assetProcessStatus").textContent = `正在处理 ${file.name}…`;
      try {
        const result = await window.TokenAssetTools.processFile(file, { removeBackground: $("#assetRemoveBackground").checked });
        addAsset(id, file.name.replace(/\.[^.]+$/, "").slice(0, 12) || id, result.src, true);
        selectedAssetId = id;
        renderAssetGrid();
        syncAssetTuner();
        insertToken(id);
        $("#assetProcessStatus").textContent = `${file.name} · ${result.status} · 可独立调大小与位置。`;
      } catch (error) {
        $("#assetProcessStatus").textContent = `${file.name} 处理失败，请换用 PNG、JPG、WebP、SVG 或 GIF。`;
      }
    }
    event.currentTarget.value = "";
  });

  function tokensFor(line) {
    const tokens = [];
    const expression = /\{\{([^{}]+)\}\}/g;
    let cursor = 0;
    let match;
    while ((match = expression.exec(line))) {
      if (match.index > cursor) tokens.push({ type: "text", value: line.slice(cursor, match.index) });
      tokens.push({ type: "asset", id: match[1] });
      cursor = match.index + match[0].length;
    }
    if (cursor < line.length) tokens.push({ type: "text", value: line.slice(cursor) });
    return tokens.length ? tokens : [{ type: "text", value: "everything" }];
  }

  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const smooth = (value) => {
    const x = clamp01(value);
    return x * x * (3 - 2 * x);
  };
  const smoother = (value) => {
    const x = clamp01(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const rangeProgress = (value, from, to) => clamp01((value - from) / (to - from));

  function layoutTokens(context, line, fontPx, assetHeight, repeatGap) {
    const cacheKey = [line, context.font, fontPx.toFixed(3), assetHeight.toFixed(3), repeatGap.toFixed(3), assetRevision].join("|");
    const cached = layoutCache.get(cacheKey);
    if (cached) return cached;
    const items = tokensFor(line).map((token) => {
      if (token.type === "text") return { ...token, width: context.measureText(token.value).width };
      const asset = assets.get(token.id);
      const tunedHeight = assetHeight * (asset?.scale || 1);
      return { ...token, asset, width: tunedHeight * (asset?.ratio || 1), height: tunedHeight };
    });
    const layout = { items, width: Math.max(fontPx, items.reduce((sum, item) => sum + item.width, 0) + repeatGap) };
    if (layoutCache.size > 240) layoutCache.clear();
    layoutCache.set(cacheKey, layout);
    return layout;
  }

  function drawSequence(context, layout, x, y, color, assetRotation = 0) {
    let cursor = x;
    context.fillStyle = color;
    layout.items.forEach((item) => {
      if (item.type === "text") {
        context.fillText(item.value, cursor, y);
      } else if (item.asset?.ready) {
        const drawX = cursor + item.height * item.asset.offsetX / 100;
        const drawY = y + item.height * item.asset.offsetY / 100;
        if (assetRotation) {
          context.save();
          context.translate(drawX + item.width / 2, drawY);
          context.rotate(assetRotation);
          context.drawImage(item.asset.image, -item.width / 2, -item.height / 2, item.width, item.height);
          context.restore();
        } else {
          context.drawImage(item.asset.image, drawX, drawY - item.height / 2, item.width, item.height);
        }
      } else {
        context.save();
        context.strokeStyle = color;
        context.lineWidth = Math.max(1, item.height * .045);
        context.strokeRect(cursor + 1, y - item.height / 2, Math.max(2, item.width - 2), item.height);
        context.restore();
      }
      cursor += item.width;
    });
  }

  function drawRepeatedLine(context, layout, y, width, color, shift, alpha = 1, assetRotation = 0) {
    let x = -mod(shift, layout.width) - layout.width;
    context.save();
    context.globalAlpha *= clamp01(alpha);
    while (x < width + layout.width) {
      drawSequence(context, layout, x, y, color, assetRotation);
      x += layout.width;
    }
    context.restore();
  }

  function drawAnchoredLine(context, layout, y, width, color, anchorX, alpha = 1) {
    context.save();
    context.globalAlpha *= clamp01(alpha);
    for (let x = anchorX; x < width + layout.width; x += layout.width) drawSequence(context, layout, x, y, color);
    for (let x = anchorX - layout.width; x > -layout.width * 2; x -= layout.width) drawSequence(context, layout, x, y, color);
    context.restore();
  }

  function choreographyTiming() {
    const duration = [
      inputs.introDuration, inputs.singleDuration, inputs.spreadDuration,
      inputs.holdDuration, inputs.collapseDuration, inputs.finalDuration
    ]
      .map((input) => Number(input.value) / 1000);
    const cycle = duration.reduce((sum, value) => sum + value, 0);
    const end = [];
    duration.reduce((sum, value, index) => {
      end[index] = sum + value;
      return end[index];
    }, 0);
    return {
      cycle, duration,
      introEnd: end[0], singleEnd: end[1], spreadEnd: end[2],
      holdEnd: end[3], collapseEnd: end[4], finalEnd: end[5]
    };
  }

  function popEase(value, strength) {
    const x = clamp01(value);
    const overshoot = 1.15 + strength * 1.9;
    return 1 + (overshoot + 1) * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, w, h);

    const rows = parseRows();
    const preset = fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const scale = h / 900;
    const fontPx = Math.max(8, Number(inputs.fontSize.value) * scale);
    const lineHeight = Math.max(fontPx * .66, fontPx + Number(inputs.lineGap.value) * scale);
    const assetHeight = fontPx * Number(inputs.assetScale.value) / 100;
    const requestedRows = Math.max(3, Math.round(Number(inputs.rowCount.value)) | 1);
    const maxRowsForCanvas = Math.max(3, (Math.ceil(h / Math.max(1, lineHeight)) + 4) | 1);
    const uniqueRowCount = rows.length % 2 === 0 ? Math.max(1, rows.length - 1) : rows.length;
    const rowCount = Math.min(requestedRows, maxRowsForCanvas, uniqueRowCount);
    const halfRows = Math.floor(rowCount / 2);
    const choreography = inputs.motionMode.value === "choreography";
    const timing = choreographyTiming();
    const localTime = choreography ? mod(time, timing.cycle) : time;
    const bounceStrength = Number(inputs.bounce.value) / 100;
    const staggerStrength = Number(inputs.stagger.value) / 100;
    const edgeFade = Number(inputs.edgeFade.value) / 100;
    const horizontalPhase = Number(inputs.horizontalPhase.value) * scale;
    const verticalSpeed = Number(inputs.verticalDrift.value) * scale;

    context.font = `${preset.style} ${preset.weight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;

    const centerSource = Math.floor(rows.length / 2);
    const lineForLane = (lane) => rows[mod(centerSource + lane, rows.length)];
    const wallLayouts = new Map(rows.map((line) => [line, layoutTokens(context, line, fontPx, assetHeight, 0)]));
    const wallContentWidth = Math.max(fontPx, ...Array.from(wallLayouts.values(), (layout) => layout.width));
    const wallZoom = Math.max(1, Math.min(1.75, w * .96 / Math.max(1, wallContentWidth)));
    const drawCentered = (line, y, xOffset = 0, alpha = 1, rowScale = 1, fillWidth = false) => {
      const layout = fillWidth
        ? (wallLayouts.get(line) || layoutTokens(context, line, fontPx, assetHeight, 0))
        : layoutTokens(context, line, fontPx, assetHeight, 0);
      context.save();
      context.globalAlpha *= clamp01(alpha);
      context.translate(w / 2 + xOffset, h / 2 + y);
      const compositionScale = rowScale * (fillWidth ? wallZoom : 1);
      context.scale(compositionScale, compositionScale);
      if (fillWidth) {
        context.scale(wallContentWidth / Math.max(1, layout.width), 1);
        drawSequence(context, layout, -layout.width / 2, 0, inputs.foreground.value);
      } else {
        drawSequence(context, layout, -layout.width / 2, 0, inputs.foreground.value);
      }
      context.restore();
    };
    const markPhase = (phase, extras = {}) => {
      if (target !== canvas) return;
      canvas.dataset.motionPhase = phase;
      canvas.dataset.renderedRows = String(extras.rows ?? 1);
      canvas.dataset.finalState = String(extras.finalState ?? -1);
      canvas.dataset.finalScale = String((extras.finalScale ?? 1).toFixed(4));
    };

    if (!choreography) {
      const loopHeight = rowCount * lineHeight * wallZoom;
      const drift = mod(localTime * verticalSpeed + loopHeight / 2, loopHeight) - loopHeight / 2;
      for (let lane = -halfRows - 1; lane <= halfRows + 1; lane += 1) {
        let y = lane * lineHeight * wallZoom + drift;
        if (y < -(halfRows + 1) * lineHeight * wallZoom) y += loopHeight;
        if (y > (halfRows + 1) * lineHeight * wallZoom) y -= loopHeight;
        drawCentered(lineForLane(lane), y, horizontalPhase, 1, 1, true);
      }
      markPhase("continuous", { rows: rowCount });
      return;
    }

    if (localTime < timing.introEnd) {
      const progress = rangeProgress(localTime, 0, timing.introEnd);
      const breathingScale = lerp(.98, 1, easeOut(progress));
      drawCentered(inputs.introWord.value.trim() || "motivation", 0, 0, 1, breathingScale);
      markPhase("intro-single");
      return;
    }

    const primaryLine = lineForLane(0);
    if (localTime < timing.singleEnd) {
      const progress = rangeProgress(localTime, timing.introEnd, timing.singleEnd);
      const outgoing = 1 - easeOut(rangeProgress(progress, 0, .28));
      if (outgoing > .002) {
        drawCentered(inputs.introWord.value.trim() || "motivation", 0, 0, outgoing, lerp(1, .76, easeOut(progress)));
      }
      const arrival = popEase(rangeProgress(progress, .08, .82), Math.min(.28, bounceStrength));
      const arrivalAlpha = easeOut(rangeProgress(progress, .08, .28));
      drawCentered(primaryLine, 0, 0, arrivalAlpha, lerp(.72, 1, arrival));
      markPhase("line-pop");
      return;
    }

    const spreadProgress = rangeProgress(localTime, timing.singleEnd, timing.spreadEnd);
    const collapseProgress = rangeProgress(localTime, timing.holdEnd, timing.collapseEnd);
    const afterSpread = Math.max(0, localTime - timing.spreadEnd);
    let driftY = Math.min(afterSpread, timing.duration[3] + timing.duration[4]) * verticalSpeed;
    const direction = inputs.collapseDirection.value;
    if (localTime >= timing.holdEnd && direction !== "center") {
      driftY += (direction === "up" ? -1 : 1) * h * .32 * smoother(collapseProgress);
    }

    if (localTime < timing.collapseEnd) {
      for (let lane = -halfRows; lane <= halfRows; lane += 1) {
        const distance = Math.abs(lane);
        const distanceRatio = distance / Math.max(1, halfRows);
        const appearStart = distance === 0 ? 0 : (distance - 1) / Math.max(1, halfRows) * staggerStrength * .84;
        const appearEnd = Math.min(1, appearStart + lerp(.42, .18, staggerStrength));
        const appear = distance === 0 ? 1 : popEase(rangeProgress(spreadProgress, appearStart, appearEnd), bounceStrength);
        const appearAlpha = distance === 0 ? 1 : smoother(rangeProgress(spreadProgress, appearStart, Math.min(1, appearStart + .16)));
        const edgeAlpha = 1 - edgeFade * .7 * smoother(rangeProgress(distanceRatio, .66, 1));
        const collapseOrder = (halfRows - distance) / Math.max(1, halfRows);
        const disappearStart = collapseOrder * .58;
        const disappear = localTime < timing.holdEnd
          ? 0
          : smoother(rangeProgress(collapseProgress, disappearStart, Math.min(1, disappearStart + .30)));
        const alpha = appearAlpha * edgeAlpha * (1 - disappear);
        if (alpha <= .002) continue;
        const spreadPosition = distance === 0 ? 1 : popEase(rangeProgress(spreadProgress, appearStart, appearEnd), bounceStrength);
        const exitScale = lerp(1, 1.10, easeOut(collapseProgress));
        const y = lane * lineHeight * wallZoom * spreadPosition + driftY;
        const rowScale = lerp(.76, 1, appear) * exitScale;
        drawCentered(lineForLane(lane), y, horizontalPhase, alpha, rowScale, true);
      }

      if (localTime >= timing.holdEnd) {
        const nextReveal = smoother(rangeProgress(collapseProgress, .38, .92));
        const nextAlpha = Number(inputs.nextOpacity.value) / 100 * nextReveal;
        const nextY = lerp(lineHeight * .34, 0, easeOut(nextReveal));
        drawCentered(inputs.nextWord.value.trim() || "togetherness", nextY, 0, nextAlpha, lerp(1.08, 1, easeOut(nextReveal)));
      }
      markPhase(localTime < timing.spreadEnd ? "wall-spread" : localTime < timing.holdEnd ? "wall-full" : "wall-exit", { rows: rowCount });
      return;
    }

    const finalElapsed = Math.max(0, localTime - timing.collapseEnd);
    const finalProgress = rangeProgress(localTime, timing.collapseEnd, timing.finalEnd);
    const finalStates = parseFinalStates();
    const swapInterval = Math.max(.06, Number(inputs.finalSwapInterval.value) / 1000);
    const rawStateIndex = Math.floor(finalElapsed / swapInterval);
    const stateIndex = Math.min(finalStates.length, rawStateIndex);
    const currentLine = stateIndex === 0 ? (inputs.nextWord.value.trim() || "togetherness") : finalStates[stateIndex - 1];
    const previousLine = stateIndex <= 1
      ? (inputs.nextWord.value.trim() || "togetherness")
      : finalStates[stateIndex - 2];
    const stateTime = mod(finalElapsed, swapInterval);
    const transitionDuration = Math.min(.10, swapInterval * .34);
    const swapProgress = stateIndex === 0 || rawStateIndex > finalStates.length
      ? 1
      : smoother(rangeProgress(stateTime, 0, transitionDuration));
    const shrinkAmount = Number(inputs.finalShrink.value) / 100;
    const closingScale = 1 - shrinkAmount * smooth(finalProgress);
    const nextAlpha = Number(inputs.nextOpacity.value) / 100;
    if (stateIndex > 0 && swapProgress < .998) {
      drawCentered(previousLine, 0, 0, nextAlpha * (1 - swapProgress), closingScale * lerp(1, .985, swapProgress));
    }
    drawCentered(currentLine, 0, 0, nextAlpha * swapProgress, closingScale * lerp(1.015, 1, swapProgress));
    markPhase("final-shrink-swap", { finalState: stateIndex, finalScale: closingScale });
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

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    const displayTime = inputs.motionMode.value === "choreography" ? mod(time, choreographyTiming().cycle) : time;
    frameCounter.textContent = `F ${String(Math.round(displayTime * fps)).padStart(4, "0")}`;
    rafId = requestAnimationFrame(previewLoop);
  }

  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }

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
  $("#backButton").addEventListener("click", () => { paused = true; setTime(currentTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(currentTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });

  function updateOutputs() {
    const timing = choreographyTiming();
    const formatSeconds = (seconds) => `${seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1)}秒`;
    const values = {
      fontSizeOut: inputs.fontSize.value,
      lineGapOut: inputs.lineGap.value,
      assetScaleOut: `${inputs.assetScale.value}%`,
      rowCountOut: inputs.rowCount.value,
      cycleDurationOut: formatSeconds(timing.cycle),
      introDurationOut: formatSeconds(timing.duration[0]),
      singleDurationOut: formatSeconds(timing.duration[1]),
      spreadDurationOut: formatSeconds(timing.duration[2]),
      holdDurationOut: formatSeconds(timing.duration[3]),
      collapseDurationOut: formatSeconds(timing.duration[4]),
      finalDurationOut: formatSeconds(timing.duration[5]),
      finalShrinkOut: `${inputs.finalShrink.value}%`,
      finalSwapIntervalOut: `${inputs.finalSwapInterval.value}ms`,
      bounceOut: `${inputs.bounce.value}%`,
      staggerOut: `${inputs.stagger.value}%`,
      edgeFadeOut: `${inputs.edgeFade.value}%`,
      verticalDriftOut: inputs.verticalDrift.value,
      horizontalPhaseOut: inputs.horizontalPhase.value,
      nextOpacityOut: `${inputs.nextOpacity.value}%`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    document.documentElement.style.setProperty("--text-color", inputs.foreground.value);
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  inputs.finalSwapInterval.addEventListener("input", () => setTime(choreographyTiming().collapseEnd));
  inputs.finalShrink.addEventListener("input", () => setTime(choreographyTiming().collapseEnd + choreographyTiming().duration[5] * .7));
  [inputs.assetItemScale, inputs.assetOffsetX, inputs.assetOffsetY].forEach((input) => {
    input.addEventListener("input", updateSelectedAsset);
  });
  inputs.motionMode.addEventListener("change", () => setTime(0));

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(window.innerWidth), Math.round(window.innerHeight)];
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

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo")];
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
      downloadBlob(blob, `vertical-rise-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新页面后重试。";
      return;
    }
    const output = makeExportCanvas();
    const gifFps = 12;
    const duration = inputs.motionMode.value === "choreography" ? choreographyTiming().cycle : 4;
    const frameTotal = gifFps * duration;
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    try {
      const gif = new GIF({
        workers: 2, quality: 10, width: output.width, height: output.height,
        workerScript: "js/continuation-gif.worker.js"
      });
      for (let frame = 0; frame < frameTotal; frame += 1) {
        renderFrame(output, frame / gifFps, output.width, output.height, 1);
        gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
      }
      gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => {
        downloadBlob(blob, `vertical-rise-${output.width}x${output.height}.gif`);
        setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height}`);
      });
      gif.render();
    } catch (error) {
      console.error(error);
      setExportBusy(false, "GIF 编码失败，请缩小尺寸后重试。");
    }
  });

  $("#exportVideo").addEventListener("click", async () => {
    const output = makeExportCanvas();
    if (!output.captureStream || !window.MediaRecorder) {
      exportStatus.textContent = "当前浏览器不支持视频录制，请使用最新版 Chrome / Edge。";
      return;
    }
    const candidates = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const stream = output.captureStream(fps);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        downloadBlob(new Blob(chunks, { type }), `vertical-rise-${output.width}x${output.height}.${extension}`);
        resolve(extension.toUpperCase());
      };
    });
    const duration = inputs.motionMode.value === "choreography" ? choreographyTiming().cycle : 4;
    setExportBusy(true, "正在录制视频 · 0%");
    recorder.start();
    const started = performance.now();
    await new Promise((resolve) => {
      function draw(now) {
        const elapsed = (now - started) / 1000;
        renderFrame(output, elapsed, output.width, output.height, 1);
        exportStatus.textContent = `正在录制视频 · ${Math.min(100, Math.round(elapsed / duration * 100))}%`;
        if (elapsed < duration) requestAnimationFrame(draw);
        else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    const extension = await finished;
    stream.getTracks().forEach((track) => track.stop());
    setExportBusy(false, `${extension} 视频已生成 · ${output.width} × ${output.height}`);
  });

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  renderAssetGrid();
  syncAssetTuner();
  updateOutputs();
  document.fonts.ready.finally(previewLoop);
})();
