(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const stage = document.querySelector(".writer-stage");
  const stageActions = document.querySelector(".writer-stage-actions");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const previewFps = 30;
  const inputs = {
    phrases: $("#phrasesInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    letterSpacing: $("#letterSpacing"), curveSpacing: $("#curveSpacing"), pathOffset: $("#pathOffset"), rideDistance: $("#rideDistance"), rideRhythm: $("#rideRhythm"), exitMode: $("#exitMode"), pathStyle: $("#pathStyle"), amplitude: $("#amplitude"), waves: $("#waves"), curvePhase: $("#curvePhase"),
    curvePoints: $("#curvePoints"), curveStartX: $("#curveStartX"), curveStartY: $("#curveStartY"), curveControl1X: $("#curveControl1X"), curveControl1Y: $("#curveControl1Y"), curveControl2X: $("#curveControl2X"), curveControl2Y: $("#curveControl2Y"), curveEndX: $("#curveEndX"), curveEndY: $("#curveEndY"),
    pathWidth: $("#pathWidth"), pathLeft: $("#pathLeft"), pathRight: $("#pathRight"), tilt: $("#tilt"), lineWidth: $("#lineWidth"), glow: $("#glow"),
    caretLead: $("#caretLead"), typingInterval: $("#typingInterval"), typeDuration: $("#typeDuration"), trackSync: $("#trackSync"), syncSlide: $("#syncSlide"), bendDuration: $("#bendDuration"), holdDuration: $("#holdDuration"),
    rideDuration: $("#rideDuration"), fadeDuration: $("#fadeDuration"), direction: $("#direction"),
    horizontalPosition: $("#horizontalPosition"), verticalPosition: $("#verticalPosition"), bendEase: $("#bendEase"), pathOpacity: $("#pathOpacity"),
    background: $("#backgroundColor"), foreground: $("#textColor"), lineColor: $("#lineColor"), accent: $("#accentColor")
  };

  const iconSvg = (body, background) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`)}`;
  const flowAssets = [
    { name: "音乐", url: iconSvg('<g transform="translate(-4 0)"><path d="M44 24v37c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V39l24-7v24c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V19z" fill="white"/></g>', "#fa264f") },
    { name: "播放", url: iconSvg('<circle cx="50" cy="50" r="34" fill="none" stroke="white" stroke-width="6"/><path d="M41 30 70 50 41 70z" fill="white"/>', "#111111") },
    { name: "云", url: iconSvg('<circle cx="34" cy="56" r="15" fill="white"/><circle cx="51" cy="45" r="22" fill="white"/><circle cx="70" cy="56" r="16" fill="white"/><rect x="19" y="54" width="67" height="21" rx="10" fill="white"/>', "#1389ff") },
    { name: "手表", url: iconSvg('<rect x="28" y="19" width="44" height="62" rx="15" fill="#111"/><rect x="35" y="28" width="30" height="44" rx="9" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8") }
  ];
  const animalAssets = Array.from({ length: 31 }, (_, index) => ({ name: `透明动物 ${String(index + 1).padStart(2, "0")}`, url: `assets/transparent-animals/animal-${String(index + 1).padStart(2, "0")}.png` }));
  const botFiles = [
    "bloub-capsule-colere-brun.gif", "bloub-cercle-attentif-violet.gif", "bloub-cercle-curieux-encre.gif",
    "bloub-galet-blase-orange.gif", "bloub-galet-somnolent-rouge.gif", "bloub-goutte-curieux-turquoise.gif",
    "bloub-hexagone-surpris-gris.gif", "bloub-nuage-mefiant-rouge.gif", "bloub-nuage-neutre-bleu.gif",
    "bloub-squircle-effraye-orange.gif", "bloub-triangle-mefiant-ambre.gif"
  ];
  const botAssets = botFiles.map((filename, index) => ({ name: `Bot 动态表情 ${String(index + 1).padStart(2, "0")}`, url: `assets/bot-series/${filename}` }));
  const shapeAssets = [{ name: "彩虹圆环", url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff365d"/><stop offset=".28" stop-color="#ffc400"/><stop offset=".52" stop-color="#35d07f"/><stop offset=".76" stop-color="#248bff"/><stop offset="1" stop-color="#9347ff"/></linearGradient></defs><circle cx="50" cy="50" r="31" fill="none" stroke="url(#g)" stroke-width="16"/></svg>')}` }];
  const mediaCache = new Map();
  const state = { assets: [], customLibrary: [], background: null, autosaveTimer: 0, librarySelection: null, activeAssetId: null };
  const DEFAULT_SCHEME_URL = "assets/presets/pathwriter-default.json?v=20260827-default2";
  const DEFAULT_SCHEME_REVISION = "20260827-default2";

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

  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let rafId = 0;
  let livePreviewSpec = null;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  function makeWavePoints(rawCount) {
    const count = clamp(Math.round(Number(rawCount) || 1), 1, 8);
    const interiorCount = count * 2;
    return Array.from({ length: interiorCount + 2 }, (_, index) => ({
      x: Number((index / (interiorCount + 1) * 100).toFixed(2)),
      y: index === 0 || index === interiorCount + 1 ? 50 : (index % 2 ? 18 : 82)
    }));
  }

  function readCurvePoints() {
    try {
      const parsed = JSON.parse(inputs.curvePoints.value || "[]");
      if (!Array.isArray(parsed) || parsed.length < 4) throw new Error("invalid curve points");
      return parsed.map((point) => ({ x: clamp(Number(point.x) || 0, 0, 100), y: clamp(Number(point.y) || 0, 0, 100) }));
    } catch (_) {
      const points = makeWavePoints(inputs.waves.value);
      inputs.curvePoints.value = JSON.stringify(points);
      return points;
    }
  }

  function writeCurvePoints(points) {
    inputs.curvePoints.value = JSON.stringify(points.map((point) => ({
      x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2))
    })));
  }

  function curveWaveCount(points = readCurvePoints()) {
    return clamp(Math.round((points.length - 2) / 2), 1, 8);
  }

  function splinePoint(points, amount) {
    const degree = Math.min(3, points.length - 1);
    const last = points.length - 1;
    const knots = Array.from({ length: points.length + degree + 1 }, (_, index) => {
      if (index <= degree) return 0;
      if (index >= last + 1) return 1;
      return (index - degree) / (last - degree + 1);
    });
    const value = clamp(amount);
    let span = last;
    if (value < 1) {
      for (let index = degree; index <= last; index += 1) {
        if (value >= knots[index] && value < knots[index + 1]) { span = index; break; }
      }
    }
    const work = Array.from({ length: degree + 1 }, (_, index) => ({ ...points[span - degree + index] }));
    for (let level = 1; level <= degree; level += 1) {
      for (let index = degree; index >= level; index -= 1) {
        const knotIndex = span - degree + index;
        const denominator = knots[knotIndex + degree - level + 1] - knots[knotIndex];
        const weight = denominator > .000001 ? (value - knots[knotIndex]) / denominator : 0;
        work[index] = {
          x: mix(work[index - 1].x, work[index].x, weight),
          y: mix(work[index - 1].y, work[index].y, weight)
        };
      }
    }
    return work[degree];
  }

  function sampleCurve(points, amount) {
    const value = clamp(amount);
    const point = splinePoint(points, value);
    const epsilon = .0005;
    const beforeAmount = Math.max(0, value - epsilon);
    const afterAmount = Math.min(1, value + epsilon);
    const before = splinePoint(points, beforeAmount);
    const after = splinePoint(points, afterAmount);
    const span = Math.max(.000001, afterAmount - beforeAmount);
    return {
      x: point.x,
      y: point.y,
      dx: (after.x - before.x) / span,
      dy: (after.y - before.y) / span
    };
  }
  const easeInOut = (value) => value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);
  const easeIn = (value) => value * value * value;

  function rideEase(value) {
    const progress = clamp(value);
    if (inputs.rideRhythm.value === "linear") return progress;
    if (inputs.rideRhythm.value === "fastStart") return easeOut(progress);
    if (inputs.rideRhythm.value === "fastFinish") return easeIn(progress);
    return easeInOut(progress);
  }

  function exitEase(value) {
    const progress = clamp(value);
    if (inputs.rideRhythm.value === "linear") return progress;
    if (inputs.rideRhythm.value === "fastStart") return easeOut(progress);
    if (inputs.rideRhythm.value === "fastFinish") return easeIn(progress);
    // Keep a non-zero launch velocity so the preceding glide does not appear
    // to stop for one beat before the final exit.
    const incomingSlope = .72;
    return (progress * progress * progress - 2 * progress * progress + progress) * incomingSlope
      + (-2 * progress * progress * progress + 3 * progress * progress);
  }

  function phrases() {
    const rows = inputs.phrases.value.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    return rows.length ? rows : ["Write it."];
  }

  function timing() {
    const longestTypingDuration = Math.max(...phrases().map((phrase) => typingDurationFor(phrase)));
    const result = {
      lead: Number(inputs.caretLead.value) / 1000,
      type: Math.max(Number(inputs.typeDuration.value) / 1000, longestTypingDuration),
      bend: Number(inputs.bendDuration.value) / 1000,
      hold: Number(inputs.holdDuration.value) / 1000,
      ride: Number(inputs.rideDuration.value) / 1000,
      fade: Number(inputs.fadeDuration.value) / 1000
    };
    result.phrase = result.lead + result.type + result.bend + result.hold + result.ride + result.fade;
    result.cycle = result.phrase * phrases().length;
    return result;
  }

  function currentTime() {
    return paused ? pausedAt : (performance.now() - animationStart) / 1000;
  }

  function setTime(seconds) {
    const safe = Math.max(0, seconds);
    if (paused) pausedAt = safe;
    else animationStart = performance.now() - safe * 1000;
    renderPreviewFrame(safe);
  }

  function fontScale(width, height) {
    return clamp(Math.sqrt((width * height) / (1440 * 900)), .52, 2.2);
  }

  function fontString(size) {
    const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    return `${preset.style} ${preset.weight} ${size}px "${preset.family}", "Arial", sans-serif`;
  }

  function measureGlyphs(ctx, phrase, desiredSize, maxWidth, spacing) {
    let size = desiredSize;
    let widths = [];
    let total = 0;
    const measure = () => {
      ctx.font = fontString(size);
      widths = Array.from(phrase, (character) => ctx.measureText(character).width);
      total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * spacing;
    };
    measure();
    if (total > maxWidth) {
      size *= maxWidth / total;
      measure();
    }
    let cursor = -total / 2;
    const glyphs = Array.from(phrase, (character, index) => {
      const width = widths[index];
      const center = cursor + width / 2;
      cursor += width + spacing;
      return { character, width, center };
    });
    return { glyphs, total, size };
  }

  function cachedImage(url) {
    if (!url) return null;
    if (!mediaCache.has(url)) {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      mediaCache.set(url, image);
    }
    return mediaCache.get(url);
  }

  function phraseElements(phrase) {
    const result = [];
    const assetsBySlot = new Map();
    state.assets.forEach((asset) => {
      const slot = clamp(Math.round(Number(asset.slot) || 0), 0, phrase.length);
      if (!assetsBySlot.has(slot)) assetsBySlot.set(slot, []);
      assetsBySlot.get(slot).push(asset);
    });
    for (let index = 0; index <= phrase.length; index += 1) {
      (assetsBySlot.get(index) || []).forEach((asset) => result.push({ type: "asset", asset }));
      if (index < phrase.length) result.push({ type: "text", character: phrase[index] });
    }
    return result;
  }

  function typingDurationFor(phrase) {
    return Math.max(.001, phraseElements(phrase).length * Number(inputs.typingInterval.value) / 1000);
  }

  function measureElements(ctx, phrase, desiredSize, maxWidth, spacing) {
    const source = phraseElements(phrase);
    let size = desiredSize;
    let widths = [];
    let total = 0;
    const measure = () => {
      ctx.font = fontString(size);
      widths = source.map((element) => element.type === "text" ? ctx.measureText(element.character).width : size * .9 * Number(element.asset.size || 100) / 100);
      total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * spacing;
    };
    measure();
    if (total > maxWidth) { size *= maxWidth / total; measure(); }
    let cursor = -total / 2;
    const elements = source.map((element, index) => {
      const width = widths[index];
      const center = cursor + width / 2;
      cursor += width + spacing;
      return Object.assign({}, element, { width, center });
    });
    return { elements, total, size };
  }

  function pathPoint(progress, options) {
    const { centerX, centerY, pathSpan, amplitude, waves, tilt, phase, direction, style } = options;
    const s = direction < 0 ? 1 - progress : progress;
    const tiltSlope = Math.tan(tilt * Math.PI / 180);
    let x = centerX + (s - .5) * pathSpan;
    let curveY = 0;
    let curveSlope = 0;
    const shifted = s + phase;
    if (style === "custom") {
      const sampled = sampleCurve(options.customPoints, s);
      const normalizedX = sampled.x / 100;
      const normalizedY = sampled.y / 100;
      const derivativeX = sampled.dx / 100 * pathSpan;
      const derivativeY = sampled.dy / 100 * amplitude * 2;
      x = centerX + (normalizedX - .5) * pathSpan;
      const localX = (normalizedX - .5) * pathSpan;
      const y = centerY + (normalizedY - .5) * amplitude * 2 + localX * tiltSlope;
      const orientedX = derivativeX * (direction < 0 ? -1 : 1);
      const orientedY = (derivativeY + derivativeX * tiltSlope) * (direction < 0 ? -1 : 1);
      return { x, y, tangent: Math.atan2(orientedY, orientedX) };
    } else if (style === "archUp" || style === "archDown") {
      const u = shifted - .5;
      const sign = style === "archUp" ? 1 : -1;
      curveY = sign * amplitude * (4 * u * u - 1);
      curveSlope = sign * 8 * amplitude * u / pathSpan;
    } else if (style === "rise" || style === "fall") {
      const sign = style === "rise" ? -1 : 1;
      const angle = (shifted - .5) * Math.PI / 2;
      curveY = sign * amplitude * Math.sin(angle);
      curveSlope = sign * amplitude * Math.cos(angle) * Math.PI / 2 / pathSpan;
    } else if (style !== "straight") {
      const angle = (s * waves + phase) * Math.PI * 2;
      curveY = Math.sin(angle) * amplitude;
      curveSlope = Math.cos(angle) * amplitude * waves * Math.PI * 2 / pathSpan;
    }
    const y = centerY + curveY + (s - .5) * pathSpan * tiltSlope;
    const dy = curveSlope + tiltSlope;
    const orientation = direction < 0 ? -1 : 1;
    const tangent = Math.atan2(dy * orientation, orientation);
    return { x, y, tangent };
  }

  function pathTable(options) {
    const points = [];
    let length = 0;
    let previous = null;
    for (let index = 0; index <= 900; index += 1) {
      // The authored curve is finite. pointAtPathDistance() extends both ends
      // along their last tangent instead of inventing another wave off-screen.
      const progress = index / 900;
      const point = pathPoint(progress, options);
      if (previous) length += Math.hypot(point.x - previous.x, point.y - previous.y);
      points.push({ progress, point, length });
      previous = point;
    }
    const centerIndex = points.reduce((best, item, index) => Math.abs(item.progress - .5) < Math.abs(points[best].progress - .5) ? index : best, 0);
    return { points, centerLength: points[centerIndex].length };
  }

  function pointAtPathDistance(table, distance) {
    const target = table.centerLength + distance;
    const points = table.points;
    if (target <= points[0].length) {
      const a = points[0];
      const travel = target - a.length;
      return { x: a.point.x + Math.cos(a.point.tangent) * travel, y: a.point.y + Math.sin(a.point.tangent) * travel, tangent: a.point.tangent };
    }
    if (target >= points[points.length - 1].length) {
      const b = points[points.length - 1];
      const travel = target - b.length;
      return { x: b.point.x + Math.cos(b.point.tangent) * travel, y: b.point.y + Math.sin(b.point.tangent) * travel, tangent: b.point.tangent };
    }
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (points[middle].length < target) low = middle; else high = middle;
    }
    const a = points[low];
    const b = points[high];
    const amount = (target - a.length) / Math.max(.0001, b.length - a.length);
    const angleDelta = Math.atan2(Math.sin(b.point.tangent - a.point.tangent), Math.cos(b.point.tangent - a.point.tangent));
    return { x: mix(a.point.x, b.point.x, amount), y: mix(a.point.y, b.point.y, amount), tangent: a.point.tangent + angleDelta * amount };
  }

  function drawElement(ctx, element, x, y, angle, size, alpha, color, glowAmount) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (element.type === "asset" ? Number(element.asset.rotation || 0) * Math.PI / 180 : 0));
    ctx.globalAlpha = alpha * (element.type === "asset" ? Number(element.asset.opacity ?? 100) / 100 : 1);
    if (element.type === "asset") {
      const image = cachedImage(element.asset.url);
      const side = size * .9 * Number(element.asset.size || 100) / 100;
      if (image?.complete && image.naturalWidth) ctx.drawImage(image, -side / 2 + Number(element.asset.offsetX || 0), -side / 2 + Number(element.asset.offsetY || 0), side, side);
    } else {
      ctx.font = fontString(size);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = color;
      if (glowAmount > 0) { ctx.shadowColor = color; ctx.shadowBlur = glowAmount * 18; }
      ctx.fillText(element.character, 0, 0);
    }
    ctx.restore();
  }

  function glowText(ctx, text, x, y, size, color, glowAmount) {
    ctx.save();
    ctx.font = fontString(size);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5 + glowAmount * 22;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawPathBetweenDistances(ctx, table, startDistance, endDistance, alpha, lineWidth, color) {
    if (alpha <= 0 || endDistance <= startDistance) return;
    const distance = endDistance - startDistance;
    const steps = Math.max(12, Math.round(distance / 7));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const point = pointAtPathDistance(table, mix(startDistance, endDistance, index / steps));
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBackgroundMedia(ctx, width, height) {
    if (!state.background?.url) return;
    const media = state.background.element || cachedImage(state.background.url);
    if (!media || (media instanceof HTMLImageElement && (!media.complete || !media.naturalWidth)) || (media instanceof HTMLVideoElement && media.readyState < 2)) return;
    const naturalWidth = media.videoWidth || media.naturalWidth || width;
    const naturalHeight = media.videoHeight || media.naturalHeight || height;
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    ctx.drawImage(media, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function renderFrame(target, rawTime, width, height, pixelRatio = 1) {
    const ctx = target.getContext("2d");
    const displayWidth = Math.max(1, Math.round(width));
    const displayHeight = Math.max(1, Math.round(height));
    const backingWidth = Math.max(1, Math.round(displayWidth * pixelRatio));
    const backingHeight = Math.max(1, Math.round(displayHeight * pixelRatio));
    if (target.width !== backingWidth || target.height !== backingHeight) {
      target.width = backingWidth;
      target.height = backingHeight;
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.fillStyle = inputs.background.value;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    drawBackgroundMedia(ctx, displayWidth, displayHeight);

    const rows = phrases();
    const span = timing();
    const cycleTime = ((rawTime % span.cycle) + span.cycle) % span.cycle;
    const phraseIndex = Math.min(rows.length - 1, Math.floor(cycleTime / span.phrase));
    const local = cycleTime - phraseIndex * span.phrase;
    const phrase = rows[phraseIndex];
    const phraseTypingDuration = typingDurationFor(phrase);
    const scale = fontScale(displayWidth, displayHeight);
    const desiredSize = Number(inputs.fontSize.value) * scale;
    const spacing = Number(inputs.letterSpacing.value) * scale;
    const curveSpacing = Number(inputs.curveSpacing.value) * scale;
    const pathSpan = displayWidth * Number(inputs.pathWidth.value) / 100;
    const fit = measureElements(ctx, phrase, desiredSize, Math.min(displayWidth * .72, pathSpan * .78), spacing);
    const curvedFit = measureElements(ctx, phrase, fit.size, pathSpan * .94, curveSpacing);
    const centerX = displayWidth * Number(inputs.horizontalPosition.value) / 100;
    const centerY = displayHeight * Number(inputs.verticalPosition.value) / 100;
    const direction = inputs.direction.value === "left" ? -1 : 1;
    const pathOptions = {
      centerX, centerY, pathSpan,
      amplitude: Number(inputs.amplitude.value) * scale,
      waves: Number(inputs.waves.value), tilt: Number(inputs.tilt.value),
      phase: Number(inputs.curvePhase.value) / 100, direction,
      style: inputs.pathStyle.value,
      customPoints: readCurvePoints()
    };
    const pathAlpha = Number(inputs.pathOpacity.value) / 100;
    const lineWidth = Number(inputs.lineWidth.value) * scale;
    const glowAmount = Number(inputs.glow.value) / 100;
    const foreground = inputs.foreground.value;
    const accent = inputs.accent.value;
    const lineColor = inputs.lineColor.value;
    const syncStart = Number(inputs.trackSync.value) / 100;
    const syncSlideShare = Number(inputs.syncSlide.value) / 100;
    // The rail reaches its final height during typing. Later phases may extend
    // and slide along it, but must not lift the whole composition again.
    const earlyCurveAmount = 1;
    const motionLocal = local - span.lead;
    let phase = "lead";
    let progress = span.lead > 0 ? clamp(local / span.lead) : 1;
    if (motionLocal >= 0) {
      phase = "type";
      progress = clamp(motionLocal / Math.max(.001, span.type));
    }
    if (motionLocal >= span.type) {
      phase = "bend";
      progress = clamp((motionLocal - span.type) / Math.max(.001, span.bend));
    }
    if (motionLocal >= span.type + span.bend) {
      phase = "hold";
      progress = clamp((motionLocal - span.type - span.bend) / Math.max(.001, span.hold));
    }
    if (motionLocal >= span.type + span.bend + span.hold) {
      phase = "ride";
      progress = clamp((motionLocal - span.type - span.bend - span.hold) / Math.max(.001, span.ride));
    }
    if (motionLocal >= span.type + span.bend + span.hold + span.ride) {
      phase = "fade";
      progress = clamp((motionLocal - span.type - span.bend - span.hold - span.ride) / Math.max(.001, span.fade));
    }

    const userPathOffset = Number(inputs.pathOffset.value) * scale;
    ctx.font = fontString(fit.size);
    const textMetrics = fit.elements
      .filter((element) => element.type === "text")
      .map((element) => ctx.measureText(element.character));
    const maxTextAscent = Math.max(fit.size * .68, ...textMetrics.map((metrics) => metrics.actualBoundingBoxAscent || 0));
    const maxTextDescent = Math.max(fit.size * .12, ...textMetrics.map((metrics) => metrics.actualBoundingBoxDescent || 0));
    const straightTextBaselineY = centerY + (maxTextAscent - maxTextDescent) / 2;
    const textTrackOffset = maxTextDescent + lineWidth / 2 + 2 * scale + userPathOffset;
    const pathNormalOffset = (element) => element.type === "asset"
      ? fit.size * .48 + userPathOffset
      : textTrackOffset;
    const rideSpan = Number(inputs.rideDistance.value) / 100 * pathSpan * direction;
    const leftTrackLength = pathSpan * .5 * Number(inputs.pathLeft.value) / 100;
    const rightTrackLength = pathSpan * .5 * Number(inputs.pathRight.value) / 100;
    const userTrackStart = direction > 0 ? -leftTrackLength : -rightTrackLength;
    const userTrackEnd = direction > 0 ? rightTrackLength : leftTrackLength;
    const straightTrackY = straightTextBaselineY + textTrackOffset;
    const pathAtBend = (amount) => ({
      ...pathOptions,
      centerY: mix(straightTrackY, centerY, amount),
      amplitude: pathOptions.amplitude * amount,
      tilt: pathOptions.tilt * amount
    });
    const normalOffsetAtBend = (element, amount) => {
      const straightY = element.type === "asset" ? centerY : straightTextBaselineY;
      const straightOffset = straightTrackY - straightY;
      return mix(straightOffset, pathNormalOffset(element), amount);
    };
    const trackStartTime = span.lead + phraseTypingDuration * syncStart;
    const continuousRideClock = clamp((local - trackStartTime) / Math.max(.001, span.phrase - trackStartTime));
    const typeEndClock = clamp((span.lead + phraseTypingDuration - trackStartTime) / Math.max(.001, span.phrase - trackStartTime), .01, .99);
    const rideAtTypeEnd = clamp(syncSlideShare, .005, .95);
    const rideExponent = Math.max(.08, Math.log(rideAtTypeEnd) / Math.log(typeEndClock));
    const continuousRideProgress = Math.pow(continuousRideClock, rideExponent);
    const continuousRideDistance = rideEase(continuousRideProgress) * rideSpan;

    if (phase === "lead") {
      const caretX = centerX;
      const blink = .72 + .28 * Math.abs(Math.sin(rawTime * Math.PI * 3.5));
      ctx.save();
      ctx.translate(caretX, straightTextBaselineY);
      ctx.globalAlpha = blink;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.2, fit.size * .022);
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8 + glowAmount * 18;
      ctx.beginPath();
      ctx.moveTo(0, -fit.size * .82);
      ctx.lineTo(0, fit.size * .18);
      ctx.stroke();
      ctx.restore();
    } else if (phase === "type") {
      const typingProgress = clamp(motionLocal / phraseTypingDuration);
      const trackProgress = clamp((typingProgress - syncStart) / Math.max(.01, 1 - syncStart));
      const bendProgress = easeOut(trackProgress) * earlyCurveAmount;
      const rideDistance = continuousRideDistance;
      const activePathOptions = pathAtBend(bendProgress);
      const activeTable = pathTable(activePathOptions);

      const typed = typingProgress * fit.elements.length;
      const completedCount = Math.min(fit.elements.length, Math.floor(typed + 1e-6));
      const fraction = completedCount >= fit.elements.length ? 1 : clamp(typed - completedCount);
      const reveal = completedCount >= fit.elements.length ? 1 : easeOut(fraction);
      const visibleCount = Math.min(
        fit.elements.length,
        completedCount + (completedCount < fit.elements.length && fraction > 1e-6 ? 1 : 0)
      );
      const visible = fit.elements.slice(0, visibleCount);
      const typingLayout = (elements, gap) => {
        const centersFor = (count) => {
          const slice = elements.slice(0, count);
          const total = slice.reduce((sum, glyph) => sum + glyph.width, 0) + Math.max(0, count - 1) * gap;
          let cursor = -total / 2;
          return {
            total,
            centers: slice.map((glyph) => {
              const center = cursor + glyph.width / 2;
              cursor += glyph.width + gap;
              return center;
            })
          };
        };
        const before = centersFor(completedCount);
        const after = centersFor(visibleCount);
        return {
          total: mix(before.total, after.total, reveal),
          centers: after.centers.map((center, index) => index < before.centers.length ? mix(before.centers[index], center, reveal) : center)
        };
      };
      const straightTypingLayout = typingLayout(fit.elements, spacing);
      const curvedTypingLayout = typingLayout(curvedFit.elements, curveSpacing);
      if (visibleCount > 0) {
        const firstStraight = fit.elements[0];
        const firstCurved = curvedFit.elements[0] || firstStraight;
        const lastIndex = visibleCount - 1;
        const lastStraightInPhrase = fit.elements[lastIndex];
        const lastCurvedInPhrase = curvedFit.elements[lastIndex] || lastStraightInPhrase;
        const textStartDistance = mix(
          straightTypingLayout.centers[0] - firstStraight.width / 2 - spacing * .18,
          curvedTypingLayout.centers[0] - firstCurved.width / 2 - curveSpacing * .18,
          bendProgress
        ) + rideDistance;
        const textEndDistance = mix(
          straightTypingLayout.centers[lastIndex] + lastStraightInPhrase.width / 2 + spacing * .18,
          curvedTypingLayout.centers[lastIndex] + lastCurvedInPhrase.width / 2 + curveSpacing * .18,
          bendProgress
        ) + rideDistance;
        const trackFill = easeInOut(trackProgress);
        const growingTrackStart = mix(textStartDistance, userTrackStart + rideDistance, trackFill);
        const growingTrackEnd = mix(textStartDistance, userTrackEnd + rideDistance, trackFill);
        drawPathBetweenDistances(
          ctx,
          activeTable,
          growingTrackStart,
          growingTrackEnd,
          pathAlpha * easeOut(trackProgress),
          lineWidth,
          lineColor
        );
      }
      const typingPulse = .72 + .28 * Math.abs(Math.sin((motionLocal / Math.max(.03, Number(inputs.typingInterval.value) / 1000)) * Math.PI * 2.2));
      visible.forEach((element, index) => {
        const curvedElement = curvedFit.elements[index] || element;
        const pathDistance = mix(straightTypingLayout.centers[index], curvedTypingLayout.centers[index], bendProgress) + rideDistance;
        const point = pointAtPathDistance(activeTable, pathDistance);
        const normalOffset = normalOffsetAtBend(element, bendProgress);
        const liftedX = point.x + Math.sin(point.tangent) * normalOffset;
        const liftedY = point.y - Math.cos(point.tangent) * normalOffset;
        const straightX = centerX + straightTypingLayout.centers[index];
        const straightY = element.type === "asset" ? centerY : straightTextBaselineY;
        const attachedToTrack = trackProgress > .0001;
        const isActive = index === visible.length - 1;
        const alpha = isActive ? clamp((.38 + reveal * .62) * typingPulse, .32, 1) : 1;
        drawElement(
          ctx,
          element,
          attachedToTrack ? liftedX : straightX,
          attachedToTrack ? liftedY : straightY,
          attachedToTrack ? point.tangent : 0,
          fit.size,
          alpha,
          isActive ? accent : foreground,
          isActive ? glowAmount * (.75 + typingPulse * .45) : 0
        );
      });

      const straightCaretX = centerX + straightTypingLayout.total / 2 + Math.max(3, fit.size * .06);
      const curvedCaretDistance = curvedTypingLayout.total / 2 + curveSpacing * .45;
      const straightCaretDistance = straightTypingLayout.total / 2 + spacing * .45;
      const caretDistance = mix(straightCaretDistance, curvedCaretDistance, bendProgress) + rideDistance;
      const caretPoint = pointAtPathDistance(activeTable, caretDistance);
      const caretNormalOffset = normalOffsetAtBend({ type: "text" }, bendProgress);
      const curvedCaretX = caretPoint.x + Math.sin(caretPoint.tangent) * caretNormalOffset;
      const curvedCaretY = caretPoint.y - Math.cos(caretPoint.tangent) * caretNormalOffset;
      const attachedToTrack = trackProgress > .0001;
      const caretX = attachedToTrack ? curvedCaretX : straightCaretX;
      const caretY = attachedToTrack ? curvedCaretY : straightTextBaselineY;
      const blink = .45 + .55 * Math.abs(Math.sin(rawTime * Math.PI * 3.5));
      ctx.save();
      ctx.translate(caretX, caretY);
      ctx.rotate(attachedToTrack ? caretPoint.tangent : 0);
      ctx.globalAlpha = blink;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.2, fit.size * .022);
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8 + glowAmount * 18;
      ctx.beginPath();
      ctx.moveTo(0, -fit.size * .82);
      ctx.lineTo(0, fit.size * .18);
      ctx.stroke();
      ctx.restore();
    } else {
      const elastic = Number(inputs.bendEase.value) / 100;
      const bendFinish = clamp(easeOut(progress) + Math.sin(progress * Math.PI) * .06 * elastic);
      const bendProgress = phase === "bend" ? mix(earlyCurveAmount, 1, bendFinish) : 1;
      const fadeAlpha = phase === "fade" ? 1 - easeIn(progress) : 1;
      const activePathOptions = pathAtBend(bendProgress);
      const activeTable = pathTable(activePathOptions);
      const rideStartTime = span.lead + span.type + span.bend + span.hold;
      const rideStartClock = clamp((rideStartTime - trackStartTime) / Math.max(.001, span.phrase - trackStartTime));
      const rideStartDistance = rideEase(Math.pow(rideStartClock, rideExponent)) * rideSpan;
      const pathExitSign = Math.sign(rideSpan || direction || 1);
      const firstCurvedElement = curvedFit.elements[0];
      const lastCurvedElement = curvedFit.elements[curvedFit.elements.length - 1];
      const textTrackStart = firstCurvedElement ? firstCurvedElement.center - firstCurvedElement.width / 2 - curveSpacing * .5 : 0;
      const textTrackEnd = lastCurvedElement ? lastCurvedElement.center + lastCurvedElement.width / 2 + curveSpacing * .5 : 0;
      const trailingDistance = pathExitSign > 0
        ? Math.min(userTrackStart, textTrackStart)
        : Math.max(userTrackEnd, textTrackEnd);
      const exitMargin = Math.max(displayWidth * .04, fit.size * .75);
      const exitStep = Math.max(12 * scale, Math.min(displayWidth, displayHeight) / 100);
      const maxExitTravel = Math.max(Math.hypot(displayWidth, displayHeight) * 3, pathSpan * 4);
      let exitTravelLength = 0;
      while (exitTravelLength < maxExitTravel) {
        const trailingPoint = pointAtPathDistance(
          activeTable,
          trailingDistance + rideStartDistance + exitTravelLength * pathExitSign
        );
        const outside = pathExitSign > 0
          ? trailingPoint.x > displayWidth + exitMargin || trailingPoint.y < -exitMargin || trailingPoint.y > displayHeight + exitMargin
          : trailingPoint.x < -exitMargin || trailingPoint.y < -exitMargin || trailingPoint.y > displayHeight + exitMargin;
        if (outside) break;
        exitTravelLength += exitStep;
      }
      const exitProgress = phase === "ride" ? exitEase(progress) : phase === "fade" ? 1 : 0;
      const exitTravel = exitTravelLength * pathExitSign * exitProgress;
      const textRideDistance = phase === "ride" || phase === "fade"
        ? rideStartDistance + exitTravel
        : continuousRideDistance;
      const railRideDistance = inputs.exitMode.value === "textOnly" && (phase === "ride" || phase === "fade")
        ? rideStartDistance
        : textRideDistance;
      drawPathBetweenDistances(
        ctx,
        activeTable,
        userTrackStart + railRideDistance,
        userTrackEnd + railRideDistance,
        pathAlpha * fadeAlpha,
        lineWidth,
        lineColor
      );
      curvedFit.elements.forEach((element, index) => {
        const straightElement = fit.elements[index] || element;
        const pathDistance = mix(straightElement.center, element.center, bendProgress) + textRideDistance;
        const point = pointAtPathDistance(activeTable, pathDistance);
        const normalOffset = normalOffsetAtBend(element, bendProgress);
        const liftedX = point.x + Math.sin(point.tangent) * normalOffset;
        const liftedY = point.y - Math.cos(point.tangent) * normalOffset;
        const elementAlpha = fadeAlpha;
        drawElement(ctx, element, liftedX, liftedY, point.tangent, fit.size, elementAlpha, foreground, 0);
      });
    }

    updateChoreography(local, span);
    if (target === canvas) frameCounter.textContent = `F ${String(Math.floor(rawTime * previewFps) % 10000).padStart(4, "0")}`;
  }

  function selectedPreviewDimensions() {
    if ($("#exportPreset").value === "current") return null;
    const [width, height] = exportDimensions();
    return [clamp(Math.round(width) || 1080, 240, 3840), clamp(Math.round(height) || 1920, 240, 3840)];
  }

  function renderPreviewFrame(time = currentTime()) {
    const spec = livePreviewSpec || {
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
      pixelRatio: Math.min(2, window.devicePixelRatio || 1)
    };
    renderFrame(canvas, time, spec.width, spec.height, spec.pixelRatio);
  }

  function updatePreviewLayout() {
    const selected = selectedPreviewDimensions();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!selected) {
      stage.classList.remove("is-sized-preview");
      canvas.style.removeProperty("position");
      canvas.style.removeProperty("left");
      canvas.style.removeProperty("top");
      canvas.style.removeProperty("width");
      canvas.style.removeProperty("height");
      stageActions.style.removeProperty("left");
      stageActions.style.removeProperty("bottom");
      $("#previewSizeBadge").textContent = `当前画板 · ${window.innerWidth} × ${window.innerHeight}`;
      $("#previewSizeBadge").style.removeProperty("left");
      livePreviewSpec = { width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight), pixelRatio: dpr };
      renderPreviewFrame();
      return;
    }

    const [logicalWidth, logicalHeight] = selected;
    const panelRect = document.querySelector(".writer-panel")?.getBoundingClientRect();
    const leftEdge = window.innerWidth > 720 ? Math.max(0, panelRect?.right || 0) : 0;
    const availableWidth = Math.max(240, window.innerWidth - leftEdge);
    const availableHeight = Math.max(240, window.innerHeight);
    const gutter = Math.min(28, Math.max(12, availableWidth * .025));
    const fit = Math.max(.05, Math.min(
      (availableWidth - gutter * 2) / logicalWidth,
      (availableHeight - gutter * 2) / logicalHeight
    ));
    const cssWidth = logicalWidth * fit;
    const cssHeight = logicalHeight * fit;
    const left = leftEdge + (availableWidth - cssWidth) / 2;
    const top = (availableHeight - cssHeight) / 2;

    stage.classList.add("is-sized-preview");
    Object.assign(canvas.style, {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${cssWidth}px`,
      height: `${cssHeight}px`
    });
    stageActions.style.left = `${left + cssWidth / 2}px`;
    stageActions.style.bottom = `${Math.max(12, window.innerHeight - top - cssHeight + 18)}px`;
    $("#previewSizeBadge").textContent = `${logicalWidth} × ${logicalHeight} · 实际导出构图`;
    $("#previewSizeBadge").style.left = `${left + cssWidth / 2}px`;
    livePreviewSpec = {
      width: logicalWidth,
      height: logicalHeight,
      pixelRatio: Math.min(2, Math.max(.05, fit * dpr))
    };
    renderPreviewFrame();
  }

  function resizeCanvas() {
    updatePreviewLayout();
  }

  function previewLoop() {
    renderPreviewFrame();
    rafId = requestAnimationFrame(previewLoop);
  }

  function curveEditorPath(points) {
    if (points.length < 2) return "";
    const steps = Math.max(120, points.length * 28);
    const start = splinePoint(points, 0);
    let path = `M ${start.x * 3.2} ${start.y * 1.6}`;
    for (let index = 1; index <= steps; index += 1) {
      const point = splinePoint(points, index / steps);
      path += ` L ${point.x * 3.2} ${point.y * 1.6}`;
    }
    return path;
  }

  function updateCurveEditor() {
    const points = readCurvePoints();
    const count = curveWaveCount(points);
    inputs.waves.value = count;
    $("#wavesOut").textContent = String(count);
    $("#curveWaveCount").textContent = `${count} 段`;
    $("#curveAddWave").disabled = count >= 8;
    $("#curveRemoveWave").disabled = count <= 1;
    $("#curveControlGuide").setAttribute("d", points.map((point, index) => `${index ? "L" : "M"} ${point.x * 3.2} ${point.y * 1.6}`).join(" "));
    $("#curveEditorPath").setAttribute("d", curveEditorPath(points));
    const layer = $("#curvePointLayer");
    layer.replaceChildren(...points.map((point, index) => {
      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.setAttribute("class", `writer-curve-handle ${index === 0 || index === points.length - 1 ? "is-anchor" : "is-peak"}`);
      handle.setAttribute("data-curve-index", index);
      handle.setAttribute("cx", point.x * 3.2);
      handle.setAttribute("cy", point.y * 1.6);
      handle.setAttribute("r", index === 0 || index === points.length - 1 ? 7 : 8);
      return handle;
    }));
    const position = $("#curvePositionHandle");
    position.setAttribute("transform", `translate(${clamp(Number(inputs.horizontalPosition.value), 0, 100) * 3.2} ${clamp(Number(inputs.verticalPosition.value), 0, 100) * 1.6})`);
    $("#curveEditor").classList.toggle("is-custom", inputs.pathStyle.value === "custom");
  }

  function setCurvePoint(index, rawX, rawY) {
    const points = readCurvePoints();
    if (!points[index]) return;
    const minimumX = index === 0 ? 0 : points[index - 1].x + 1.5;
    const maximumX = index === points.length - 1 ? 100 : points[index + 1].x - 1.5;
    points[index] = { x: clamp(rawX, minimumX, maximumX), y: clamp(rawY, 0, 100) };
    writeCurvePoints(points);
  }

  function setCurveWaveCount(rawCount) {
    const target = clamp(Math.round(Number(rawCount) || 1), 1, 8);
    const points = readCurvePoints();
    let current = curveWaveCount(points);
    while (current < target) {
      const end = points.pop();
      const lastY = points.at(-1)?.y ?? 50;
      points.push({ x: 0, y: lastY < 50 ? 82 : 18 }, { x: 0, y: lastY < 50 ? 18 : 82 }, end);
      current += 1;
    }
    while (current > target && points.length > 4) {
      points.splice(points.length - 3, 2);
      current -= 1;
    }
    points.forEach((point, index) => { point.x = index / (points.length - 1) * 100; });
    writeCurvePoints(points);
    inputs.waves.value = target;
    inputs.pathStyle.value = "custom";
    updateCurveEditor();
    updateOutputs();
    queueAutosave();
  }

  function resetCurveEditor() {
    writeCurvePoints(makeWavePoints(inputs.waves.value));
    inputs.pathStyle.value = "custom";
    updateCurveEditor();
    updateOutputs();
    queueAutosave();
  }

  const curveEditorSvg = $("#curveEditorSvg");
  let curveDrag = null;
  curveEditorSvg.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-curve-index]");
    const position = event.target.closest("#curvePositionHandle");
    if (!handle && !position) return;
    event.preventDefault();
    curveDrag = {
      pointerId: event.pointerId,
      kind: position ? "position" : "point",
      point: Number(handle?.dataset.curveIndex),
      bounds: curveEditorSvg.getBoundingClientRect()
    };
    curveEditorSvg.setPointerCapture?.(event.pointerId);
  });
  curveEditorSvg.addEventListener("pointermove", (event) => {
    if (!curveDrag || curveDrag.pointerId !== event.pointerId) return;
    const x = clamp((event.clientX - curveDrag.bounds.left) / curveDrag.bounds.width * 100, 0, 100);
    const y = clamp((event.clientY - curveDrag.bounds.top) / curveDrag.bounds.height * 100, 0, 100);
    if (curveDrag.kind === "position") {
      inputs.horizontalPosition.value = Number(x.toFixed(1));
      inputs.verticalPosition.value = Number(y.toFixed(1));
    } else {
      setCurvePoint(curveDrag.point, x, y);
      inputs.pathStyle.value = "custom";
    }
    updateCurveEditor();
    updateOutputs();
    queueAutosave();
  });
  const finishCurveDrag = (event) => {
    if (!curveDrag || curveDrag.pointerId !== event.pointerId) return;
    curveEditorSvg.releasePointerCapture?.(event.pointerId);
    curveDrag = null;
  };
  curveEditorSvg.addEventListener("pointerup", finishCurveDrag);
  curveEditorSvg.addEventListener("pointercancel", finishCurveDrag);
  $("#curveReset").addEventListener("click", resetCurveEditor);
  $("#curveAddWave").addEventListener("click", () => setCurveWaveCount(curveWaveCount() + 1));
  $("#curveRemoveWave").addEventListener("click", () => setCurveWaveCount(curveWaveCount() - 1));
  inputs.waves.addEventListener("input", () => setCurveWaveCount(inputs.waves.value));

  function choreographyBeats(span = timing()) {
    let cursor = 0;
    const syncStart = Number(inputs.trackSync.value) / 100;
    return [
      ["光标预备", "intro", span.lead],
      ["输入起步", "intro", span.type * syncStart],
      ["输入＋轨道滑行", "contact", span.type * (1 - syncStart)],
      ["连续贴轨滑出", "orbit", span.bend + span.hold + span.ride],
      ["淡出切换", "replace", span.fade]
    ].map(([label, kind, duration], index) => {
      const beat = { index, label, kind, duration, start: cursor, end: cursor + duration };
      cursor = beat.end;
      return beat;
    });
  }

  function renderChoreography() {
    const span = timing();
    const beats = choreographyBeats(span);
    const bar = $("#pathwriterChoreoBar");
    const playhead = $("#timelinePlayhead");
    const legend = $("#pathwriterChoreoLegend");
    bar.replaceChildren(playhead);
    legend.replaceChildren();
    beats.forEach((beat) => {
      const block = document.createElement("button");
      block.type = "button";
      block.className = `me-choreo-block is-${beat.kind}`;
      block.style.flexGrow = Math.max(.08, beat.duration);
      block.dataset.beatIndex = beat.index;
      block.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.label}</strong><small>${beat.duration.toFixed(2)}秒</small>`;
      block.addEventListener("click", () => setTime(beat.start + .01));
      bar.append(block);
      const item = document.createElement("li");
      item.dataset.beatIndex = beat.index;
      item.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.label}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      item.addEventListener("click", () => setTime(beat.start + .01));
      legend.append(item);
    });
    updateChoreography(currentTime() % Math.max(.001, span.phrase), span);
  }

  function updateChoreography(localTime, span = timing()) {
    const safe = ((localTime % Math.max(.001, span.phrase)) + span.phrase) % span.phrase;
    const progress = clamp(safe / Math.max(.001, span.phrase));
    const playhead = $("#timelinePlayhead");
    if (playhead) playhead.style.left = `${progress * 100}%`;
    const activeIndex = choreographyBeats(span).findIndex((beat) => safe >= beat.start && safe < beat.end);
    document.querySelectorAll("[data-beat-index]").forEach((node) => node.classList.toggle("is-active", Number(node.dataset.beatIndex) === activeIndex));
  }

  function updateOutputs() {
    const outputMap = {
      fontSize: (value) => value,
      letterSpacing: (value) => value,
      curveSpacing: (value) => value,
      pathOffset: (value) => value,
      rideDistance: (value) => `${value}%`,
      amplitude: (value) => value,
      waves: (value) => String(Math.round(Number(value))),
      curvePhase: (value) => `${value}%`,
      pathWidth: (value) => `${value}%`,
      pathLeft: (value) => `${value}%`,
      pathRight: (value) => `${value}%`,
      tilt: (value) => `${value}°`,
      lineWidth: (value) => Number(value).toFixed(1),
      glow: (value) => `${value}%`,
      caretLead: (value) => `${(value / 1000).toFixed(2)}秒`,
      typingInterval: (value) => `${value}ms / 字`,
      typeDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      trackSync: (value) => `${value}%`,
      syncSlide: (value) => `${value}%`,
      bendDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      holdDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      rideDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      fadeDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      horizontalPosition: (value) => `${value}%`,
      verticalPosition: (value) => `${value}%`,
      bendEase: (value) => `${value}%`,
      pathOpacity: (value) => `${value}%`
    };
    Object.entries(outputMap).forEach(([key, formatter]) => {
      const output = $(`#${key}Out`);
      if (output && inputs[key]) output.textContent = formatter(Number(inputs[key].value));
    });
    const span = timing();
    $("#cycleDurationOut").textContent = `${span.phrase.toFixed(2)} 秒 / 句`;
    renderChoreography();
  }

  function longestPhraseLength() {
    return Math.max(1, ...phrases().map((row) => row.length));
  }

  function assetGroups() {
    return [
      ["#flowAssetLibrary", flowAssets],
      ["#animalAssetLibrary", animalAssets],
      ["#botAssetLibrary", botAssets],
      ["#shapeAssetLibrary", shapeAssets],
      ["#customAssetLibrary", state.customLibrary]
    ];
  }

  function renderAssetLibrary() {
    assetGroups().forEach(([selector, assets]) => {
      const root = $(selector);
      root.replaceChildren();
      assets.forEach((asset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "writer-asset-card me-asset-choice";
        button.classList.toggle("is-selected", state.librarySelection?.url === asset.url);
        button.innerHTML = `<img alt="" src="${asset.url}"><span>${asset.name}</span>`;
        button.addEventListener("click", () => {
          state.librarySelection = asset;
          renderAssetLibrary();
        });
        root.append(button);
      });
    });
    $("#customAssetGroup").hidden = state.customLibrary.length === 0;
    $("#customAssetCount").textContent = state.customLibrary.length;
    const commit = $("#addSelectedAsset");
    commit.disabled = !state.librarySelection;
    commit.textContent = state.librarySelection ? `添加：${state.librarySelection.name}` : "选择一个图标后添加";
  }

  function addAsset(source) {
    const asset = {
      id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: source.name || "自定义图标",
      url: source.url,
      slot: Math.ceil(longestPhraseLength() / 2),
      size: 100,
      opacity: 100,
      offsetX: 0,
      offsetY: 0,
      rotation: 0
    };
    state.assets.push(asset);
    cachedImage(asset.url);
    renderSelectedAssets();
    queueAutosave();
  }

  function moveAsset(assetId, delta) {
    const from = state.assets.findIndex((item) => item.id === assetId);
    const to = clamp(from + delta, 0, state.assets.length - 1);
    if (from < 0 || from === to) return;
    const [moved] = state.assets.splice(from, 1);
    state.assets.splice(to, 0, moved);
    renderSelectedAssets();
    queueAutosave();
  }

  function closeAssetDrawer() {
    state.activeAssetId = null;
    $("#assetDrawer").hidden = true;
  }

  function openAssetDrawer(assetId) {
    state.activeAssetId = assetId;
    const asset = state.assets.find((item) => item.id === assetId);
    if (!asset) return closeAssetDrawer();
    const slot = $("#assetDrawerSlot");
    slot.innerHTML = Array.from({ length: longestPhraseLength() + 1 }, (_, index) => `<option value="${index}">第 ${index + 1} 个位置</option>`).join("");
    $("#assetDrawerTitle").textContent = asset.name;
    $("#assetDrawerPreview").src = asset.url;
    slot.value = String(clamp(Number(asset.slot) || 0, 0, longestPhraseLength()));
    $("#assetDrawerSize").value = asset.size ?? 100;
    $("#assetDrawerOpacity").value = asset.opacity ?? 100;
    $("#assetDrawerX").value = asset.offsetX ?? 0;
    $("#assetDrawerY").value = asset.offsetY ?? 0;
    $("#assetDrawerRotation").value = asset.rotation ?? 0;
    updateAssetDrawerOutputs();
    $("#assetDrawer").hidden = false;
  }

  function updateAssetDrawerOutputs() {
    $("#assetDrawerSizeOut").textContent = `${$("#assetDrawerSize").value}%`;
    $("#assetDrawerOpacityOut").textContent = `${$("#assetDrawerOpacity").value}%`;
    $("#assetDrawerXOut").textContent = $("#assetDrawerX").value;
    $("#assetDrawerYOut").textContent = $("#assetDrawerY").value;
    $("#assetDrawerRotationOut").textContent = `${$("#assetDrawerRotation").value}°`;
  }

  function renderSelectedAssets() {
    const root = $("#selectedAssets");
    root.replaceChildren();
    $("#selectedAssetCount").textContent = state.assets.length;
    $("#openSelectedAssets").disabled = state.assets.length === 0;
    if (!state.assets.length) {
      root.innerHTML = '<p class="writer-empty-assets">还没有添加图标。先在资源库选择，再点击添加。</p>';
      closeAssetDrawer();
      return;
    }
    state.assets.forEach((asset) => {
      const row = document.createElement("article");
      row.className = "writer-selected-row";
      row.draggable = true;
      row.tabIndex = 0;
      row.dataset.assetId = asset.id;
      row.innerHTML = `<span class="writer-drag-handle" aria-hidden="true">⋮⋮</span><img alt="" src="${asset.url}"><div class="writer-selected-copy"><b>${asset.name}</b><small>第 ${Number(asset.slot) + 1} 个位置 · ${asset.size}% · ${asset.opacity ?? 100}%</small></div><button type="button" data-move="-1" aria-label="上移">↑</button><button type="button" data-move="1" aria-label="下移">↓</button><button type="button" data-edit="1">单独编辑</button><button type="button" data-remove="1" aria-label="移除">×</button>`;
      row.querySelector("[data-remove]").addEventListener("click", () => {
        state.assets = state.assets.filter((item) => item.id !== asset.id);
        if (state.activeAssetId === asset.id) closeAssetDrawer();
        renderSelectedAssets();
        queueAutosave();
      });
      row.querySelector("[data-edit]").addEventListener("click", () => openAssetDrawer(asset.id));
      row.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => moveAsset(asset.id, Number(button.dataset.move))));
      row.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", asset.id));
      row.addEventListener("dragover", (event) => event.preventDefault());
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain");
        const from = state.assets.findIndex((item) => item.id === sourceId);
        const to = state.assets.findIndex((item) => item.id === asset.id);
        if (from < 0 || to < 0 || from === to) return;
        const [moved] = state.assets.splice(from, 1);
        state.assets.splice(to, 0, moved);
        renderSelectedAssets();
        queueAutosave();
      });
      row.addEventListener("keydown", (event) => {
        if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        moveAsset(asset.id, event.key === "ArrowUp" ? -1 : 1);
      });
      root.append(row);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setBackgroundFile(file) {
    if (!file) return;
    if (state.background?.objectUrl) URL.revokeObjectURL(state.background.objectUrl);
    const objectUrl = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = objectUrl;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.play().catch(() => {});
      state.background = { name: file.name, type: file.type, url: objectUrl, objectUrl, element: video };
    } else {
      const image = new Image();
      image.src = objectUrl;
      state.background = { name: file.name, type: file.type, url: objectUrl, objectUrl, element: image };
    }
    queueAutosave();
  }

  function schemeData() {
    const values = {};
    Object.entries(inputs).forEach(([key, input]) => { if (input) values[key] = input.value; });
    return { version: 4, effect: "path-writer", values, assets: state.assets.map(({ id, name, url, slot, size, opacity, offsetX, offsetY, rotation }) => ({ id, name, url, slot, size, opacity, offsetX, offsetY, rotation })) };
  }

  function applyScheme(data) {
    if (!data || data.effect !== "path-writer") throw new Error("不是轨书方案");
    Object.entries(data.values || {}).forEach(([key, value]) => { if (inputs[key] && value != null) inputs[key].value = value; });
    if (!data.values?.curvePoints) writeCurvePoints(makeWavePoints(inputs.waves.value));
    state.assets = Array.isArray(data.assets) ? data.assets.map((asset) => Object.assign({ id: `asset-${Math.random()}`, name: "图标", slot: 0, size: 100, opacity: 100, offsetX: 0, offsetY: 0, rotation: 0 }, asset)) : [];
    state.assets.forEach((asset) => cachedImage(asset.url));
    renderSelectedAssets();
    updateOutputs();
    updateCurveEditor();
    setTime(0);
  }

  function queueAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      try { localStorage.setItem("stg-path-writer-autosave", JSON.stringify(schemeData())); $("#schemeStatus").textContent = "已自动保存当前轨书方案。"; } catch (_) { $("#schemeStatus").textContent = "当前内容较大，请使用“保存方案”下载。"; }
    }, 240);
  }

  function downloadScheme() {
    downloadBlob(new Blob([JSON.stringify(schemeData(), null, 2)], { type: "application/json" }), "path-writer-scheme.json");
    $("#schemeStatus").textContent = "方案已保存。";
  }

  let defaultScheme = schemeData();
  renderAssetLibrary();
  renderSelectedAssets();
  $("#addSelectedAsset").addEventListener("click", () => {
    if (!state.librarySelection) return;
    addAsset(state.librarySelection);
  });

  function setAssetManager(open) {
    const overlay = $("#selectedAssetsOverlay");
    overlay.hidden = !open;
    overlay.classList.toggle("is-list-expanded", open);
    document.body.classList.toggle("is-list-expanded", open);
    if (!open) closeAssetDrawer();
  }

  $("#openSelectedAssets").addEventListener("click", () => setAssetManager(true));
  $("#closeSelectedAssets").addEventListener("click", () => setAssetManager(false));
  $("#closeAssetDrawer").addEventListener("click", closeAssetDrawer);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#assetDrawer").hidden) closeAssetDrawer();
    else if (!$("#selectedAssetsOverlay").hidden) setAssetManager(false);
  });

  const drawerControls = {
    assetDrawerSlot: "slot", assetDrawerSize: "size", assetDrawerOpacity: "opacity",
    assetDrawerX: "offsetX", assetDrawerY: "offsetY", assetDrawerRotation: "rotation"
  };
  Object.entries(drawerControls).forEach(([id, key]) => {
    $(`#${id}`).addEventListener("input", (event) => {
      const asset = state.assets.find((item) => item.id === state.activeAssetId);
      if (!asset) return;
      asset[key] = Number(event.currentTarget.value);
      updateAssetDrawerOutputs();
      renderSelectedAssets();
      queueAutosave();
    });
  });

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => { updateOutputs(); updateCurveEditor(); queueAutosave(); });
    input.addEventListener("change", () => { updateOutputs(); updateCurveEditor(); queueAutosave(); });
  });
  inputs.phrases.addEventListener("input", () => { setTime(0); renderSelectedAssets(); });
  inputs.font.addEventListener("change", () => setTime(0));

  $("#assetUpload").addEventListener("change", async (event) => {
    for (const file of Array.from(event.currentTarget.files || [])) {
      const candidate = { name: file.name, url: await readFileAsDataUrl(file) };
      state.customLibrary.push(candidate);
      state.librarySelection = candidate;
    }
    renderAssetLibrary();
    event.currentTarget.value = "";
  });
  $("#backgroundUpload").addEventListener("change", (event) => { setBackgroundFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; });
  $("#clearBackground").addEventListener("click", () => {
    if (state.background?.objectUrl) URL.revokeObjectURL(state.background.objectUrl);
    state.background = null;
    queueAutosave();
  });
  $("#saveScheme").addEventListener("click", downloadScheme);
  $("#importScheme").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try { applyScheme(JSON.parse(await file.text())); $("#schemeStatus").textContent = "方案已导入。"; queueAutosave(); } catch (error) { $("#schemeStatus").textContent = error.message || "方案导入失败。"; }
    event.currentTarget.value = "";
  });
  $("#resetScheme").addEventListener("click", () => { applyScheme(defaultScheme); setAssetManager(false); queueAutosave(); $("#schemeStatus").textContent = "已恢复默认方案。"; });
  $("#clearRedo").addEventListener("click", () => {
    applyScheme(defaultScheme);
    inputs.phrases.value = "";
    state.assets = [];
    renderSelectedAssets();
    setAssetManager(false);
    localStorage.removeItem("stg-path-writer-autosave");
    setTime(0);
    $("#schemeStatus").textContent = "已清理，可重新编辑。";
  });

  $("#restartButton").addEventListener("click", () => { pausedAt = 0; animationStart = performance.now(); });
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
      event.currentTarget.textContent = "暂停";
    } else {
      pausedAt = currentTime();
      paused = true;
      event.currentTarget.textContent = "播放";
    }
  });
  $("#stagePauseButton").addEventListener("click", () => {
    $("#pauseButton").click();
    $("#stagePauseButton").textContent = paused ? "播放" : "暂停";
  });
  $("#stageReplayButton").addEventListener("click", () => {
    pausedAt = 0;
    animationStart = performance.now();
    if (paused) { paused = false; $("#pauseButton").textContent = "暂停"; $("#stagePauseButton").textContent = "暂停"; }
  });
  $("#backButton").addEventListener("click", () => { if (!paused) $("#pauseButton").click(); setTime(pausedAt - 1 / exportFrameRate()); });
  $("#forwardButton").addEventListener("click", () => { if (!paused) $("#pauseButton").click(); setTime(pausedAt + 1 / exportFrameRate()); });
  window.addEventListener("resize", resizeCanvas);

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(window.innerWidth), Math.round(window.innerHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }

  function makeExportCanvas() {
    const [width, height] = exportDimensions();
    const result = document.createElement("canvas");
    result.width = clamp(Math.round(width / 2) * 2, 240, 3840);
    result.height = clamp(Math.round(height / 2) * 2, 240, 3840);
    return result;
  }

  function exportDurationSeconds() {
    const selected = $("#exportDuration").value;
    if (selected === "full") return timing().cycle;
    if (selected === "custom") return clamp(Number($("#exportDurationCustom").value) || 4.2, .5, 15);
    return Math.max(.5, Number(selected) || 3);
  }

  function exportFrameRate() {
    return clamp(Math.round(Number($("#exportFps").value) || 30), 15, 60);
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
    updatePreviewLayout();
  });
  [$("#exportWidth"), $("#exportHeight")].forEach((input) => input.addEventListener("input", updatePreviewLayout));
  $("#exportDuration").addEventListener("change", (event) => { $("#customDuration").hidden = event.currentTarget.value !== "custom"; });

  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `path-writer-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新页面后重试。"; return; }
    const output = makeExportCanvas();
    const gifFps = exportFrameRate();
    const duration = exportDurationSeconds();
    const frameTotal = Math.max(1, Math.ceil(gifFps * duration));
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    try {
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
      for (let frame = 0; frame < frameTotal; frame += 1) {
        renderFrame(output, frame / gifFps, output.width, output.height, 1);
        gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
      }
      gif.on("progress", (value) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(value * 100)}%`; });
      gif.on("finished", (blob) => {
        downloadBlob(blob, `path-writer-${output.width}x${output.height}-${durationFileLabel(duration)}-${gifFps}fps.gif`);
        setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height} · ${duration.toFixed(1)}秒 · ${gifFps} FPS`);
      });
      gif.render();
    } catch (error) {
      console.error(error);
      setExportBusy(false, "GIF 编码失败，请缩小尺寸后重试。");
    }
  });

  $("#exportVideo").addEventListener("click", async () => {
    if (!window.HME || typeof HME.createH264MP4Encoder !== "function") {
      exportStatus.textContent = "MP4 编码器未加载，请刷新页面后重试。";
      return;
    }
    const output = makeExportCanvas();
    const context = output.getContext("2d", { willReadFrequently: true });
    const videoFps = exportFrameRate();
    const duration = exportDurationSeconds();
    const frameTotal = Math.max(1, Math.ceil(videoFps * duration));
    const filename = `path-writer-${output.width}x${output.height}-${durationFileLabel(duration)}-${videoFps}fps.mp4`;
    let encoder;
    setExportBusy(true, `正在逐帧导出 MP4 · 0 / ${frameTotal} 帧`);
    try {
      encoder = await HME.createH264MP4Encoder();
      encoder.outputFilename = filename;
      encoder.width = output.width;
      encoder.height = output.height;
      encoder.frameRate = videoFps;
      encoder.kbps = videoFps >= 60 ? 24000 : 18000;
      encoder.groupOfPictures = Math.max(12, Math.round(videoFps / 2));
      encoder.initialize();

      for (let frame = 0; frame < frameTotal; frame += 1) {
        renderFrame(output, frame / videoFps, output.width, output.height, 1);
        encoder.addFrameRgba(context.getImageData(0, 0, output.width, output.height).data);
        if (frame % 2 === 0 || frame === frameTotal - 1) {
          exportStatus.textContent = `正在逐帧导出 MP4 · ${frame + 1} / ${frameTotal} 帧 · ${Math.round((frame + 1) / frameTotal * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      encoder.finalize();
      const bytes = encoder.FS.readFile(filename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), filename);
      setExportBusy(false, `MP4 已生成 · ${frameTotal} 个独立帧 · ${output.width} × ${output.height} · ${duration.toFixed(1)}秒 · ${videoFps} FPS`);
    } catch (error) {
      console.error(error);
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder?.delete(); } catch (_) {}
    }
  });

  async function initializeApprovedDefault() {
    try {
      const response = await fetch(DEFAULT_SCHEME_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`默认方案加载失败：${response.status}`);
      const approved = await response.json();
      if (approved?.effect !== "path-writer") throw new Error("默认方案格式不正确");
      defaultScheme = approved;
    } catch (error) {
      console.warn(error);
    }

    const appliedRevision = localStorage.getItem("stg-path-writer-default-revision");
    let saved = null;
    if (appliedRevision === DEFAULT_SCHEME_REVISION) {
      try { saved = JSON.parse(localStorage.getItem("stg-path-writer-autosave") || "null"); } catch (_) {}
    }
    if (saved?.effect === "path-writer") {
      applyScheme(saved);
      $("#schemeStatus").textContent = "已恢复上次自动保存的方案。";
    } else {
      applyScheme(defaultScheme);
      localStorage.setItem("stg-path-writer-default-revision", DEFAULT_SCHEME_REVISION);
      try { localStorage.setItem("stg-path-writer-autosave", JSON.stringify(schemeData())); } catch (_) {}
      $("#schemeStatus").textContent = "已载入轨书默认示例。";
    }
    updateOutputs();
  }

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  initializeApprovedDefault().finally(() => document.fonts.ready.finally(() => {
    updatePreviewLayout();
    previewLoop();
  }));
})();
