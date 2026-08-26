(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    phrases: $("#phrasesInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    letterSpacing: $("#letterSpacing"), curveSpacing: $("#curveSpacing"), pathOffset: $("#pathOffset"), rideDistance: $("#rideDistance"), rideRhythm: $("#rideRhythm"), amplitude: $("#amplitude"), waves: $("#waves"),
    pathWidth: $("#pathWidth"), tilt: $("#tilt"), lineWidth: $("#lineWidth"), glow: $("#glow"),
    typeDuration: $("#typeDuration"), trackSync: $("#trackSync"), syncSlide: $("#syncSlide"), bendDuration: $("#bendDuration"), holdDuration: $("#holdDuration"),
    rideDuration: $("#rideDuration"), fadeDuration: $("#fadeDuration"), direction: $("#direction"),
    verticalPosition: $("#verticalPosition"), bendEase: $("#bendEase"), pathOpacity: $("#pathOpacity"),
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
  const DEFAULT_SCHEME_URL = "assets/presets/pathwriter-default.json?v=20260825-1";
  const DEFAULT_SCHEME_REVISION = "20260825-1";

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

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
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

  function phrases() {
    const rows = inputs.phrases.value.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    return rows.length ? rows : ["Write it."];
  }

  function timing() {
    const result = {
      type: Number(inputs.typeDuration.value) / 1000,
      bend: Number(inputs.bendDuration.value) / 1000,
      hold: Number(inputs.holdDuration.value) / 1000,
      ride: Number(inputs.rideDuration.value) / 1000,
      fade: Number(inputs.fadeDuration.value) / 1000
    };
    result.phrase = result.type + result.bend + result.hold + result.ride + result.fade;
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
    renderFrame(canvas, safe, canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight, window.devicePixelRatio || 1);
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
    const { centerX, centerY, pathSpan, amplitude, waves, tilt, phase, direction } = options;
    const s = direction < 0 ? 1 - progress : progress;
    const angle = (s * waves + phase) * Math.PI * 2;
    const tiltSlope = Math.tan(tilt * Math.PI / 180);
    const x = centerX + (s - .5) * pathSpan;
    const y = centerY + Math.sin(angle) * amplitude + (s - .5) * pathSpan * tiltSlope;
    const dy = Math.cos(angle) * amplitude * waves * Math.PI * 2 / pathSpan + tiltSlope;
    const tangent = Math.atan2(dy, 1) * (direction < 0 ? -1 : 1);
    return { x, y, tangent };
  }

  function pathTable(options) {
    const points = [];
    let length = 0;
    let previous = null;
    for (let index = 0; index <= 900; index += 1) {
      const progress = mix(-.28, 1.28, index / 900);
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
    if (target <= points[0].length) return points[0].point;
    if (target >= points[points.length - 1].length) return points[points.length - 1].point;
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (points[middle].length < target) low = middle; else high = middle;
    }
    const a = points[low];
    const b = points[high];
    const amount = (target - a.length) / Math.max(.0001, b.length - a.length);
    return { x: mix(a.point.x, b.point.x, amount), y: mix(a.point.y, b.point.y, amount), tangent: mix(a.point.tangent, b.point.tangent, amount) };
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
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      if (glowAmount > 0) { ctx.shadowColor = color; ctx.shadowBlur = glowAmount * 18; }
      ctx.fillText(element.character, 0, 0);
    }
    ctx.restore();
  }

  function drawPath(ctx, options, reveal, alpha, lineWidth, color, anchor = .5) {
    if (reveal <= 0 || alpha <= 0) return;
    const safeReveal = clamp(reveal);
    const safeAnchor = clamp(anchor, 0, 1);
    const forwardEnd = mix(safeAnchor, 1, easeOut(safeReveal));
    const backwardReveal = clamp((safeReveal - .18) / .82);
    const start = mix(safeAnchor, 0, easeInOut(backwardReveal));
    const end = Math.max(start + .001, forwardEnd);
    const steps = Math.max(12, Math.round((end - start) * 160));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const point = pathPoint(mix(start, end, index / steps), options);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
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
    const scale = fontScale(displayWidth, displayHeight);
    const desiredSize = Number(inputs.fontSize.value) * scale;
    const spacing = Number(inputs.letterSpacing.value) * scale;
    const curveSpacing = Number(inputs.curveSpacing.value) * scale;
    const pathSpan = displayWidth * Number(inputs.pathWidth.value) / 100;
    const fit = measureElements(ctx, phrase, desiredSize, Math.min(displayWidth * .72, pathSpan * .78), spacing);
    const curvedFit = measureElements(ctx, phrase, fit.size, pathSpan * .94, curveSpacing);
    const centerX = displayWidth / 2;
    const centerY = displayHeight * Number(inputs.verticalPosition.value) / 100;
    const direction = inputs.direction.value === "left" ? -1 : 1;
    const pathOptions = {
      centerX, centerY, pathSpan,
      amplitude: Number(inputs.amplitude.value) * scale,
      waves: Number(inputs.waves.value), tilt: Number(inputs.tilt.value),
      phase: -.08, direction
    };
    const pathAlpha = Number(inputs.pathOpacity.value) / 100;
    const lineWidth = Number(inputs.lineWidth.value) * scale;
    const glowAmount = Number(inputs.glow.value) / 100;
    const foreground = inputs.foreground.value;
    const accent = inputs.accent.value;
    const lineColor = inputs.lineColor.value;
    const syncStart = Number(inputs.trackSync.value) / 100;
    const syncSlideShare = Number(inputs.syncSlide.value) / 100;
    const earlyCurveAmount = .72;
    let phase = "type";
    let progress = clamp(local / Math.max(.001, span.type));
    if (local >= span.type) {
      phase = "bend";
      progress = clamp((local - span.type) / Math.max(.001, span.bend));
    }
    if (local >= span.type + span.bend) {
      phase = "hold";
      progress = clamp((local - span.type - span.bend) / Math.max(.001, span.hold));
    }
    if (local >= span.type + span.bend + span.hold) {
      phase = "ride";
      progress = clamp((local - span.type - span.bend - span.hold) / Math.max(.001, span.ride));
    }
    if (local >= span.type + span.bend + span.hold + span.ride) {
      phase = "fade";
      progress = clamp((local - span.type - span.bend - span.hold - span.ride) / Math.max(.001, span.fade));
    }

    const table = pathTable(pathOptions);
    const textLineOffset = fit.size * .5 + Number(inputs.pathOffset.value) * scale;
    const rideSpan = Number(inputs.rideDistance.value) / 100 * pathSpan * direction;
    const trackAnchor = clamp(.5 + direction * curvedFit.total / Math.max(1, pathSpan) / 2, 0, 1);

    if (phase === "type") {
      const typingProgress = progress;
      const trackProgress = clamp((typingProgress - syncStart) / Math.max(.01, 1 - syncStart));
      const bendProgress = easeOut(trackProgress) * earlyCurveAmount;
      const rideDistance = easeInOut(trackProgress) * syncSlideShare * rideSpan;
      drawPath(ctx, pathOptions, trackProgress, pathAlpha * easeOut(trackProgress), lineWidth, lineColor, trackAnchor);

      const typed = typingProgress * fit.elements.length;
      const visibleCount = Math.min(fit.elements.length, Math.ceil(typed));
      const visible = fit.elements.slice(0, visibleCount);
      const visibleWidth = visible.reduce((sum, glyph) => sum + glyph.width, 0) + Math.max(0, visible.length - 1) * spacing;
      let cursor = centerX - fit.total / 2;
      visible.forEach((element, index) => {
        const curvedElement = curvedFit.elements[index] || element;
        const point = pointAtPathDistance(table, curvedElement.center + rideDistance);
        const liftedX = point.x + Math.sin(point.tangent) * textLineOffset;
        const liftedY = point.y - Math.cos(point.tangent) * textLineOffset;
        const straightX = cursor + element.width / 2;
        const isActive = index === visible.length - 1 && visibleCount < fit.elements.length + 1;
        const fraction = typed >= fit.elements.length ? 1 : typed - Math.floor(typed);
        const alpha = index === visible.length - 1 ? clamp(fraction * 1.8, .35, 1) : 1;
        drawElement(
          ctx,
          element,
          mix(straightX, liftedX, bendProgress),
          mix(centerY, liftedY, bendProgress),
          point.tangent * bendProgress,
          fit.size,
          alpha,
          isActive ? accent : foreground,
          isActive ? glowAmount : 0
        );
        cursor += element.width + spacing;
      });

      const straightCaretX = centerX - fit.total / 2 + visibleWidth + Math.max(3, fit.size * .06);
      const lastCurved = curvedFit.elements[Math.max(0, visibleCount - 1)];
      const caretDistance = lastCurved ? lastCurved.center + lastCurved.width / 2 + curveSpacing * .45 + rideDistance : -curvedFit.total / 2 + rideDistance;
      const caretPoint = pointAtPathDistance(table, caretDistance);
      const curvedCaretX = caretPoint.x + Math.sin(caretPoint.tangent) * textLineOffset;
      const curvedCaretY = caretPoint.y - Math.cos(caretPoint.tangent) * textLineOffset;
      const caretX = mix(straightCaretX, curvedCaretX, bendProgress);
      const caretY = mix(centerY, curvedCaretY, bendProgress);
      const blink = .45 + .55 * Math.abs(Math.sin(rawTime * Math.PI * 3.5));
      ctx.save();
      ctx.translate(caretX, caretY);
      ctx.rotate(caretPoint.tangent * bendProgress);
      ctx.globalAlpha = blink;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.2, fit.size * .022);
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8 + glowAmount * 18;
      ctx.beginPath();
      ctx.moveTo(0, -fit.size * .55);
      ctx.lineTo(0, fit.size * .55);
      ctx.stroke();
      ctx.restore();
    } else {
      const elastic = Number(inputs.bendEase.value) / 100;
      const bendFinish = clamp(easeOut(progress) + Math.sin(progress * Math.PI) * .06 * elastic);
      const bendProgress = phase === "bend" ? mix(earlyCurveAmount, 1, bendFinish) : 1;
      const rideProgress = phase === "ride" ? mix(syncSlideShare, 1, rideEase(progress)) : phase === "fade" ? 1 + easeIn(progress) * .28 : syncSlideShare;
      const fadeAlpha = phase === "fade" ? 1 - easeIn(progress) : 1;
      drawPath(ctx, pathOptions, 1, pathAlpha * fadeAlpha, lineWidth, lineColor, trackAnchor);
      const rideDistance = rideProgress * rideSpan;
      curvedFit.elements.forEach((element, index) => {
        const point = pointAtPathDistance(table, element.center + rideDistance);
        const straightElement = fit.elements[index] || element;
        const straightX = centerX + straightElement.center;
        const liftedX = point.x + Math.sin(point.tangent) * textLineOffset;
        const liftedY = point.y - Math.cos(point.tangent) * textLineOffset;
        const x = mix(straightX, liftedX, bendProgress);
        const y = mix(centerY, liftedY, bendProgress);
        const angle = point.tangent * bendProgress;
        const remainingBend = clamp((bendProgress - earlyCurveAmount) / Math.max(.001, 1 - earlyCurveAmount));
        const activeIndex = Math.min(curvedFit.elements.length - 1, Math.floor(remainingBend * curvedFit.elements.length));
        const isActive = phase === "bend" && index === activeIndex;
        const elementAlpha = fadeAlpha;
        drawElement(ctx, element, x, y, angle, fit.size, elementAlpha, isActive ? accent : foreground, isActive ? glowAmount : 0);
      });
      if (phase === "bend") {
        const tip = pathPoint(mix(trackAnchor, 1, easeOut(progress)), pathOptions);
        glowText(ctx, "·", tip.x, tip.y, Math.max(12, fit.size * .42), accent, glowAmount);
      }
    }

    updateChoreography(local, span);
    if (target === canvas) frameCounter.textContent = `F ${String(Math.floor(rawTime * fps) % 10000).padStart(4, "0")}`;
  }

  function resizeCanvas() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    renderFrame(canvas, currentTime(), canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, ratio);
  }

  function previewLoop() {
    renderFrame(canvas, currentTime(), canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, Math.min(2, window.devicePixelRatio || 1));
    rafId = requestAnimationFrame(previewLoop);
  }

  function choreographyBeats(span = timing()) {
    let cursor = 0;
    return [
      ["输入＋轨道跟随", "intro", span.type],
      ["贴轨完成", "contact", span.bend],
      ["贴轨停留", "hold", span.hold],
      ["沿轨滑走", "orbit", span.ride],
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
      waves: (value) => Number(value).toFixed(2),
      pathWidth: (value) => `${value}%`,
      tilt: (value) => `${value}°`,
      lineWidth: (value) => Number(value).toFixed(1),
      glow: (value) => `${value}%`,
      typeDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      trackSync: (value) => `${value}%`,
      syncSlide: (value) => `${value}%`,
      bendDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      holdDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      rideDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
      fadeDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
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
    return { version: 3, effect: "path-writer", values, assets: state.assets.map(({ id, name, url, slot, size, opacity, offsetX, offsetY, rotation }) => ({ id, name, url, slot, size, opacity, offsetX, offsetY, rotation })) };
  }

  function applyScheme(data) {
    if (!data || data.effect !== "path-writer") throw new Error("不是轨书方案");
    Object.entries(data.values || {}).forEach(([key, value]) => { if (inputs[key] && value != null) inputs[key].value = value; });
    state.assets = Array.isArray(data.assets) ? data.assets.map((asset) => Object.assign({ id: `asset-${Math.random()}`, name: "图标", slot: 0, size: 100, opacity: 100, offsetX: 0, offsetY: 0, rotation: 0 }, asset)) : [];
    state.assets.forEach((asset) => cachedImage(asset.url));
    renderSelectedAssets();
    updateOutputs();
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
    input.addEventListener("input", () => { updateOutputs(); queueAutosave(); });
    input.addEventListener("change", () => { updateOutputs(); queueAutosave(); });
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
  $("#backButton").addEventListener("click", () => { if (!paused) $("#pauseButton").click(); setTime(pausedAt - 1 / fps); });
  $("#forwardButton").addEventListener("click", () => { if (!paused) $("#pauseButton").click(); setTime(pausedAt + 1 / fps); });
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
    result.width = clamp(Math.round(width), 240, 3840);
    result.height = clamp(Math.round(height), 240, 3840);
    return result;
  }

  function exportDurationSeconds() {
    const selected = $("#exportDuration").value;
    if (selected === "full") return timing().cycle;
    if (selected === "custom") return clamp(Number($("#exportDurationCustom").value) || 4.2, .5, 15);
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

  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
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
    const gifFps = 12;
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
        downloadBlob(blob, `path-writer-${output.width}x${output.height}-${durationFileLabel(duration)}.gif`);
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
    if (!output.captureStream || !window.MediaRecorder) { exportStatus.textContent = "当前浏览器不支持视频录制，请使用新版 Chrome / Edge。"; return; }
    const candidates = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const stream = output.captureStream(fps);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const duration = exportDurationSeconds();
    const finished = new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        downloadBlob(new Blob(chunks, { type }), `path-writer-${output.width}x${output.height}-${durationFileLabel(duration)}.${extension}`);
        resolve(extension.toUpperCase());
      };
    });
    setExportBusy(true, "正在录制视频 · 0%");
    recorder.start();
    const started = performance.now();
    await new Promise((resolve) => {
      function draw(now) {
        const elapsed = (now - started) / 1000;
        renderFrame(output, elapsed, output.width, output.height, 1);
        exportStatus.textContent = `正在录制视频 · ${Math.min(100, Math.round(elapsed / duration * 100))}%`;
        if (elapsed < duration) requestAnimationFrame(draw); else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    const extension = await finished;
    stream.getTracks().forEach((track) => track.stop());
    setExportBusy(false, `${extension} 视频已生成 · ${output.width} × ${output.height} · ${duration.toFixed(1)}秒`);
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
  initializeApprovedDefault().finally(() => document.fonts.ready.finally(previewLoop));
})();
