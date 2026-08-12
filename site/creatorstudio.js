(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    rows: $("#rowsInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    lineGap: $("#lineGap"), assetScale: $("#assetScale"), assetGap: $("#assetGap"),
    background: $("#backgroundColor"), foreground: $("#textColor"),
    motionMode: $("#motionMode"), finalTitle: $("#finalTitle"), introDuration: $("#introDuration"),
    scrollSpeed: $("#scrollSpeed"), curveContrast: $("#curveContrast"), settleDuration: $("#settleDuration"),
    glitchDuration: $("#glitchDuration"), finalDuration: $("#finalDuration"),
    activeScale: $("#activeScale"), inactiveScale: $("#inactiveScale"),
    inactiveOpacity: $("#inactiveOpacity"),
    fragmentStrength: $("#fragmentStrength"), fragmentJitter: $("#fragmentJitter"),
    assetItemScale: $("#assetItemScale"),
    assetOffsetX: $("#assetOffsetX"), assetOffsetY: $("#assetOffsetY")
  };
  const scrollSegments = [1, 2, 3, 4].map((index) => ({
    duration: $(`#scrollSegment${index}Duration`),
    speed: $(`#scrollSegment${index}Speed`)
  }));

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

  function parseRows() {
    const palette = ["#9b35ff", "#e53ca8", "#fa315f", "#ff6f3d", "#e8ef42", "#46d86e", "#53dcb0", "#39cde0", "#4f9bff", "#819ed4"];
    const rows = inputs.rows.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((content, index) => ({
      color: palette[index % palette.length], content
    }));
    return rows.length ? rows.slice(0, 24) : [{ color: palette[0], content: "Final Cut Pro" }];
  }

  function renderAssetGrid() {
    const grid = $("#assetGrid");
    grid.replaceChildren();
    assets.forEach((asset) => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.classList.toggle("is-selected", asset.id === selectedAssetId);
      const insert = document.createElement("button");
      insert.type = "button";
      insert.className = "asset-insert";
      insert.title = `插入 {{${asset.id}}}`;
      const preview = document.createElement("img");
      preview.src = asset.src;
      preview.alt = "";
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

  [inputs.rows, inputs.finalTitle].forEach((field) => {
    field.addEventListener("focus", () => { activeTokenInput = field; });
  });

  function removeAsset(id) {
    const asset = assets.get(id);
    if (!asset?.removable) return;
    assets.delete(id);
    if (selectedAssetId === id) selectedAssetId = "music";
    assetRevision += 1;
    layoutCache.clear();
    [inputs.rows, inputs.finalTitle].forEach((field) => {
      field.value = field.value.split(`{{${id}}}`).join("");
    });
    renderAssetGrid();
    syncAssetTuner();
  }

  $("#assetUpload").addEventListener("change", (event) => {
    [...event.currentTarget.files].forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const id = `img${++uploadSerial}`;
        addAsset(id, file.name.replace(/\.[^.]+$/, "").slice(0, 12) || id, String(reader.result), true);
        renderAssetGrid();
        insertToken(id);
      };
      reader.readAsDataURL(file);
    });
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

  function layoutTokens(context, line, fontPx, assetHeight, repeatGap, assetGap = 0) {
    const cacheKey = [line, context.font, fontPx.toFixed(3), assetHeight.toFixed(3), repeatGap.toFixed(3), assetGap.toFixed(3), assetRevision].join("|");
    const cached = layoutCache.get(cacheKey);
    if (cached) return cached;
    const items = tokensFor(line).map((token) => {
      if (token.type === "text") return { ...token, width: context.measureText(token.value).width };
      const asset = assets.get(token.id);
      const tunedHeight = assetHeight * (asset?.scale || 1);
      const drawWidth = tunedHeight * (asset?.ratio || 1);
      return { ...token, asset, gap: assetGap, drawWidth, width: drawWidth + assetGap * 2, height: tunedHeight };
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
        const drawX = cursor + item.gap + item.height * item.asset.offsetX / 100;
        const drawY = y + item.height * item.asset.offsetY / 100;
        if (assetRotation) {
          context.save();
          context.translate(drawX + item.drawWidth / 2, drawY);
          context.rotate(assetRotation);
          context.drawImage(item.asset.image, -item.drawWidth / 2, -item.height / 2, item.drawWidth, item.height);
          context.restore();
        } else {
          context.drawImage(item.asset.image, drawX, drawY - item.height / 2, item.drawWidth, item.height);
        }
      } else {
        context.save();
        context.strokeStyle = color;
        context.lineWidth = Math.max(1, item.height * .045);
        context.strokeRect(cursor + item.gap + 1, y - item.height / 2, Math.max(2, item.drawWidth - 2), item.height);
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

  function readScrollCurve() {
    const overall = Math.max(.25, Number(inputs.scrollSpeed.value));
    const contrast = Math.max(1, Number(inputs.curveContrast.value));
    const segments = scrollSegments.map((segment) => {
      const rawSpeed = Math.max(.1, Number(segment.speed.value));
      return {
        duration: Math.max(.05, Number(segment.duration.value) / 1000),
        rawSpeed,
        speed: Math.pow(rawSpeed, contrast)
      };
    });
    const baseDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
    const startSpeed = 0;
    let previousSpeed = startSpeed;
    let totalWeight = 0;
    segments.forEach((segment) => {
      totalWeight += segment.duration * (previousSpeed + segment.speed) / 2;
      previousSpeed = segment.speed;
    });
    return {
      overall, contrast, segments, baseDuration, startSpeed,
      duration: baseDuration / overall,
      totalWeight: Math.max(.0001, totalWeight)
    };
  }

  function scrollCurveProgress(elapsed, curve) {
    let remaining = clamp01(elapsed / curve.duration) * curve.baseDuration;
    let travelled = 0;
    let previousSpeed = curve.startSpeed;
    for (const segment of curve.segments) {
      const used = Math.min(segment.duration, Math.max(0, remaining));
      const progress = used / segment.duration;
      travelled += segment.duration * (
        previousSpeed * progress + (segment.speed - previousSpeed) * progress * progress / 2
      );
      remaining -= used;
      if (used < segment.duration) break;
      previousSpeed = segment.speed;
    }
    return clamp01(travelled / curve.totalWeight);
  }

  function choreographyTiming() {
    const scrollCurve = readScrollCurve();
    const duration = [
      Number(inputs.introDuration.value) / 1000,
      scrollCurve.duration,
      Number(inputs.settleDuration.value) / 1000,
      Number(inputs.glitchDuration.value) / 1000,
      Number(inputs.finalDuration.value) / 1000
    ];
    const cycle = duration.reduce((sum, value) => sum + value, 0);
    const end = [];
    duration.reduce((sum, value, index) => {
      end[index] = sum + value;
      return end[index];
    }, 0);
    return {
      cycle, duration, scrollCurve,
      introEnd: end[0], scrollEnd: end[1], settleEnd: end[2],
      glitchEnd: end[3], finalEnd: end[4]
    };
  }

  function seeded(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function titleSlots(context, line, fontPx, assetHeight, assetGap) {
    const slots = [];
    tokensFor(line).forEach((token) => {
      if (token.type === "text") {
        Array.from(token.value).forEach((value) => slots.push({ type: "text", value, width: context.measureText(value).width }));
        return;
      }
      const asset = assets.get(token.id);
      const height = assetHeight * (asset?.scale || 1);
      const drawWidth = height * (asset?.ratio || 1);
      slots.push({ ...token, asset, gap: assetGap, drawWidth, height, width: drawWidth + assetGap * 2 });
    });
    return { slots, width: slots.reduce((sum, slot) => sum + slot.width, 0) };
  }

  function drawTitleSlots(context, title, x, y, color, alpha = 1) {
    let cursor = x;
    context.save();
    context.globalAlpha *= clamp01(alpha);
    context.fillStyle = color;
    title.slots.forEach((slot) => {
      if (slot.type === "text") context.fillText(slot.value, cursor, y);
      else if (slot.asset?.ready) {
        const drawX = cursor + slot.gap + slot.height * slot.asset.offsetX / 100;
        const drawY = y + slot.height * slot.asset.offsetY / 100;
        context.drawImage(slot.asset.image, drawX, drawY - slot.height / 2, slot.drawWidth, slot.height);
      }
      cursor += slot.width;
    });
    context.restore();
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
    const lineHeight = Math.max(fontPx * .9, fontPx + Number(inputs.lineGap.value) * scale);
    const assetHeight = fontPx * Number(inputs.assetScale.value) / 100;
    const assetGap = Number(inputs.assetGap.value) * scale;
    const choreography = inputs.motionMode.value === "choreography";
    const timing = choreographyTiming();
    const localTime = choreography ? mod(time, timing.cycle) : time;
    const activeScale = Number(inputs.activeScale.value) / 100;
    const inactiveScale = Number(inputs.inactiveScale.value) / 100;
    const inactiveOpacity = Number(inputs.inactiveOpacity.value) / 100;

    context.font = `${preset.style} ${preset.weight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;

    const finalLine = inputs.finalTitle.value.trim() || "Creator Studio";
    const finalLayout = layoutTokens(context, finalLine, fontPx, assetHeight, 0, assetGap);
    const finalSlots = titleSlots(context, finalLine, fontPx, assetHeight, assetGap);
    const sourceGlyphs = rows.map((row) => row.content.replace(/\{\{[^{}]+\}\}/g, "")).join("").replace(/\s/g, "");
    const sourceAssetIds = rows.flatMap((row) => [...row.content.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]));
    const virtualItems = [...rows, { color: inputs.foreground.value, content: finalLine }];
    const safeContentWidth = w * .88;
    const finalFit = Math.min(1, safeContentWidth / Math.max(1, finalSlots.width));

    const drawCentered = (line, y, color, alpha = 1, rowScale = 1) => {
      const layout = layoutTokens(context, line, fontPx, assetHeight, 0, assetGap);
      const fittedScale = Math.min(rowScale, safeContentWidth / Math.max(1, layout.width));
      context.save();
      context.globalAlpha *= clamp01(alpha);
      context.translate(w / 2, h / 2 + y);
      context.scale(fittedScale, fittedScale);
      drawSequence(context, layout, -layout.width / 2, 0, color);
      context.restore();
    };

    const drawFinalTitle = (alpha = 1) => {
      context.save();
      context.translate(w / 2, h / 2);
      context.scale(finalFit, finalFit);
      drawTitleSlots(context, finalSlots, -finalSlots.width / 2, 0, inputs.foreground.value, alpha);
      context.restore();
    };

    const drawTicker = (position, includeFinal = false) => {
      const low = Math.floor(position) - 3;
      const high = Math.ceil(position) + 3;
      for (let index = low; index <= high; index += 1) {
        if (index < 0 || index >= virtualItems.length || (!includeFinal && index >= rows.length)) continue;
        const delta = index - position;
        const distance = Math.abs(delta);
        if (distance > 2.65) continue;
        const focus = smoother(1 - Math.min(1, distance));
        const itemScale = lerp(inactiveScale, activeScale, focus);
        const alpha = lerp(inactiveOpacity, 1, focus) * (1 - smoother(rangeProgress(distance, 1.7, 2.7)));
        drawCentered(virtualItems[index].content, delta * lineHeight, virtualItems[index].color, alpha, itemScale);
      }
    };

    if (!choreography) {
      const loopPosition = mod(localTime * 10 * Math.max(.25, Number(inputs.scrollSpeed.value)), rows.length);
      drawTicker(loopPosition, false);
      return;
    }

    if (localTime < timing.scrollEnd) {
      const progress = scrollCurveProgress(localTime - timing.introEnd, timing.scrollCurve);
      drawTicker((rows.length - 1) * progress, false);
      return;
    }

    if (localTime < timing.settleEnd) {
      const progress = smoother(rangeProgress(localTime, timing.scrollEnd, timing.settleEnd));
      drawTicker(rows.length - 1 + progress, true);
      return;
    }

    if (localTime < timing.glitchEnd) {
      const progress = rangeProgress(localTime, timing.settleEnd, timing.glitchEnd);
      const attack = smoother(rangeProgress(progress, 0, .13));
      const resolve = smoother(rangeProgress(progress, .48, 1));
      const chaos = attack * (1 - resolve) * Number(inputs.fragmentStrength.value) / 100;
      const jitter = Number(inputs.fragmentJitter.value) * scale * chaos;
      const bucket = Math.floor(localTime * fps);
      let cursor = -finalSlots.width / 2;

      context.save();
      context.translate(w / 2, h / 2);
      context.scale(finalFit, finalFit);
      context.save();
      context.globalAlpha = lerp(1, .18, chaos);
      drawSequence(context, finalLayout, -finalLayout.width / 2, 0, inputs.foreground.value);
      context.restore();

      finalSlots.slots.forEach((slot, index) => {
        const locked = seeded(index * 37 + bucket * 3.1) < resolve || chaos < .015;
        if (locked) {
          const single = { items: [slot], width: slot.width };
          drawSequence(context, single, cursor, 0, inputs.foreground.value);
        } else if (slot.type === "asset" && sourceAssetIds.length) {
          const id = sourceAssetIds[Math.floor(seeded(index * 71 + bucket) * sourceAssetIds.length) % sourceAssetIds.length];
          const asset = assets.get(id);
          if (asset?.ready) {
            const size = assetHeight * lerp(.72, 1.08, seeded(index * 11 + bucket));
            context.save();
            context.globalAlpha = .75 + chaos * .25;
            context.drawImage(asset.image, cursor + (slot.width - size * asset.ratio) / 2 + (seeded(index + bucket) - .5) * jitter, -size / 2 + (seeded(index * 9 - bucket) - .5) * jitter, size * asset.ratio, size);
            context.restore();
          }
        } else {
          const glyph = sourceGlyphs[Math.floor(seeded(index * 53 + bucket * 1.7) * Math.max(1, sourceGlyphs.length))] || slot.value;
          const color = rows[Math.floor(seeded(index * 19 + bucket * 2.3) * rows.length) % rows.length].color;
          context.save();
          context.globalCompositeOperation = "screen";
          context.globalAlpha = .72 + chaos * .28;
          context.fillStyle = color;
          context.translate(cursor + slot.width / 2 + (seeded(index * 23 + bucket) - .5) * jitter, (seeded(index * 31 - bucket) - .5) * jitter);
          context.scale(lerp(.78, 1.22, seeded(index * 41 + bucket)), 1);
          const glyphWidth = context.measureText(glyph).width;
          context.fillText(glyph, -glyphWidth / 2, 0);
          if (chaos > .3) {
            context.globalAlpha = .18 * chaos;
            context.fillRect(-slot.width * .42, -fontPx * .48, slot.width * .84, Math.max(1, fontPx * .06));
          }
          context.restore();
        }
        cursor += slot.width;
      });
      context.restore();
      return;
    }

    drawFinalTitle(1);
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

  function updateCurvePlayhead(displayTime, timing) {
    const curve = $("#speedCurve");
    const active = inputs.motionMode.value === "choreography" && displayTime >= timing.introEnd && displayTime <= timing.scrollEnd;
    const progress = active ? rangeProgress(displayTime, timing.introEnd, timing.scrollEnd) : 0;
    curve.style.setProperty("--curve-playhead", `${progress * 100}%`);
    curve.style.setProperty("--curve-playhead-visible", active ? "1" : "0");
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    const timing = choreographyTiming();
    const displayTime = inputs.motionMode.value === "choreography" ? mod(time, timing.cycle) : time;
    updateCurvePlayhead(displayTime, timing);
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
    const maxEffectiveSpeed = Math.max(...timing.scrollCurve.segments.map((segment) => segment.speed), .001);
    let curveElapsed = 0;
    timing.scrollCurve.segments.forEach((segment, index) => {
      const actualDuration = segment.duration / timing.scrollCurve.overall;
      const rangeStart = curveElapsed;
      curveElapsed += actualDuration;
      $(`#scrollSegment${index + 1}RangeOut`).textContent = `${rangeStart.toFixed(2)}–${curveElapsed.toFixed(2)}秒`;
      $(`#scrollSegment${index + 1}DurationOut`).textContent = `${Math.round(segment.duration * 1000)}ms`;
      $(`#scrollSegment${index + 1}SpeedOut`).textContent = `${segment.rawSpeed.toFixed(2)}×`;
      const bar = $(`#speedCurveBar${index + 1}`);
      bar.style.flexGrow = String(segment.duration);
      bar.style.setProperty("--curve-speed", String(.05 + .95 * segment.speed / maxEffectiveSpeed));
    });
    $("#scrollCurveTotalOut").textContent = formatSeconds(timing.scrollCurve.duration);
    const values = {
      fontSizeOut: inputs.fontSize.value,
      lineGapOut: inputs.lineGap.value,
      assetScaleOut: `${inputs.assetScale.value}%`,
      assetGapOut: inputs.assetGap.value,
      cycleDurationOut: formatSeconds(timing.cycle),
      introDurationOut: formatSeconds(timing.duration[0]),
      scrollSpeedOut: `${Number(inputs.scrollSpeed.value).toFixed(2)}× · ${formatSeconds(timing.duration[1])}`,
      curveContrastOut: `${timing.scrollCurve.contrast.toFixed(2)}×`,
      settleDurationOut: formatSeconds(timing.duration[2]),
      glitchDurationOut: formatSeconds(timing.duration[3]),
      finalDurationOut: formatSeconds(timing.duration[4]),
      activeScaleOut: `${inputs.activeScale.value}%`,
      inactiveScaleOut: `${inputs.inactiveScale.value}%`,
      inactiveOpacityOut: `${inputs.inactiveOpacity.value}%`,
      fragmentStrengthOut: `${inputs.fragmentStrength.value}%`,
      fragmentJitterOut: inputs.fragmentJitter.value
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    document.documentElement.style.setProperty("--text-color", inputs.foreground.value);
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  scrollSegments.forEach((segment) => {
    segment.duration.addEventListener("input", updateOutputs);
    segment.speed.addEventListener("input", updateOutputs);
  });
  [inputs.assetItemScale, inputs.assetOffsetX, inputs.assetOffsetY].forEach((input) => {
    input.addEventListener("input", updateSelectedAsset);
  });
  inputs.motionMode.addEventListener("change", () => setTime(0));

  const curvePresets = {
    soft: { contrast: 1, durations: [200, 250, 300, 150], speeds: [.75, 1.25, 1, .4] },
    contrast: { contrast: 1.8, durations: [150, 250, 350, 150], speeds: [.55, 2.6, .8, .1] },
    burst: { contrast: 2.5, durations: [300, 150, 250, 200], speeds: [.2, 4, .6, .1] }
  };
  document.querySelectorAll("[data-curve-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = curvePresets[button.dataset.curvePreset];
      if (!preset) return;
      inputs.curveContrast.value = String(preset.contrast);
      scrollSegments.forEach((segment, index) => {
        segment.duration.value = String(preset.durations[index]);
        segment.speed.value = String(preset.speeds[index]);
      });
      updateOutputs();
      setTime(0);
    });
  });

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

  function exportDurationSeconds() {
    const selected = $("#exportDuration").value;
    if (selected === "full") return inputs.motionMode.value === "choreography" ? choreographyTiming().cycle : 4;
    if (selected === "custom") return Math.max(.5, Math.min(15, Number($("#exportDurationCustom").value) || 4));
    return Math.max(.5, Number(selected) || 3);
  }

  function durationFileLabel(duration) {
    return `${Number(duration.toFixed(1))}`.replace(".", "p") + "s";
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
  $("#exportDuration").addEventListener("change", (event) => {
    $("#customDuration").hidden = event.currentTarget.value !== "custom";
  });

  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `creator-merge-${output.width}x${output.height}.png`);
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
    const duration = exportDurationSeconds();
    const frameTotal = Math.max(1, Math.ceil(gifFps * duration));
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
        downloadBlob(blob, `creator-merge-${output.width}x${output.height}-${durationFileLabel(duration)}.gif`);
        setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height} · ${duration.toFixed(1)}秒`);
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
        downloadBlob(new Blob(chunks, { type }), `creator-merge-${output.width}x${output.height}-${durationFileLabel(duration)}.${extension}`);
        resolve(extension.toUpperCase());
      };
    });
    const duration = exportDurationSeconds();
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
    setExportBusy(false, `${extension} 视频已生成 · ${output.width} × ${output.height} · ${duration.toFixed(1)}秒`);
  });

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  renderAssetGrid();
  syncAssetTuner();
  updateOutputs();
  document.fonts.ready.finally(previewLoop);
})();
