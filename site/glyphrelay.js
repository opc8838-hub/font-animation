(() => {
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#relayCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    a: $("#sceneAText"), b: $("#sceneBText"), c: $("#sceneCText"), gapA: $("#sceneAGaps"), gapB: $("#sceneBGaps"), gapC: $("#sceneCGaps"), font: $("#fontFamily"), weight: $("#fontWeight"), speed: $("#playbackSpeed"),
    aDuration: $("#sceneADuration"), colorDuration: $("#colorDuration"), bHold: $("#sceneBHold"), arcDuration: $("#arcDuration"), cHold: $("#sceneCHold"),
    colorRhythm: $("#colorRhythm"), softness: $("#colorSoftness"), bMotionRhythm: $("#sceneBMotionRhythm"), bBurst: $("#sceneBBurstDuration"), bStartScale: $("#sceneBStartScale"), bPeakScale: $("#sceneBPeakScale"), fontSizeA: $("#fontSizeA"), fontSizeB: $("#fontSizeB"), fontSizeC: $("#fontSizeC"), tracking: $("#tracking"), textX: $("#textX"), textY: $("#textY"), introShift: $("#introShift"), introScale: $("#introScale"),
    iconPreset: $("#iconPreset"), iconUpload: $("#iconUpload"), targetA: $("#targetA"), targetC: $("#targetC"), outlineTarget: $("#outlineTarget"),
    iconSize: $("#iconSize"), iconGap: $("#iconGap"), iconX: $("#iconX"), iconY: $("#iconY"), endingMotion: $("#endingMotion"), endingShake: $("#endingShake"), endingShakeDuration: $("#endingShakeDuration"),
    background: $("#backgroundColor"), textColor: $("#textColor"), colorA: $("#colorA"), colorB: $("#colorB"), colorC: $("#colorC")
  };
  const fontMap = {
    inter: '"Relay Inter", "Relay Noto", sans-serif', space: '"Relay Space", "Relay Noto", sans-serif',
    manrope: '"Relay Manrope", "Relay Noto", sans-serif', poppins: '"Relay Poppins", "Relay Noto", sans-serif', noto: '"Relay Noto", sans-serif'
  };
  const imageCache = new Map();
  let uploadedImage = null;
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;
  let previewDirty = true;
  let lastDuration = 1;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const lerp = (start, end, progress) => start + (end - start) * progress;
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const popEase = (value, strength = .1) => { const t = clamp(value); return easeOut(t) + Math.sin(Math.PI * t) * (1 - t) * strength; };

  function hexToRgb(hex) {
    const source = String(hex).trim();
    const functional = source.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (functional) return functional.slice(1, 4).map((value) => clamp(Math.round(Number(value)), 0, 255));
    const raw = source.replace("#", "");
    const value = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16) || 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  function mixColor(from, to, progress) {
    const a = hexToRgb(from), b = hexToRgb(to), t = clamp(progress);
    return `rgb(${a.map((channel, index) => Math.round(lerp(channel, b[index], t))).join(",")})`;
  }
  function relayPaletteColor(progress) {
    const p = clamp(progress);
    if (p < .2) return inputs.colorA.value;
    if (p < .35) return mixColor(inputs.colorA.value, inputs.colorC.value, smooth((p - .2) / .15));
    if (p < .5) return inputs.colorC.value;
    if (p < .65) return mixColor(inputs.colorC.value, inputs.colorB.value, smooth((p - .5) / .15));
    return inputs.colorB.value;
  }

  function timing() {
    const speed = Math.max(.25, Number(inputs.speed.value));
    return {
      a: Number(inputs.aDuration.value) / 1000 / speed,
      color: Number(inputs.colorDuration.value) / 1000 / speed,
      bHold: Number(inputs.bHold.value) / 1000 / speed,
      arc: Number(inputs.arcDuration.value) / 1000 / speed,
      cHold: Number(inputs.cHold.value) / 1000 / speed
    };
  }
  function cycleDuration() { const t = timing(); return Math.max(1 / fps, t.a + t.color + t.bHold + t.arc + t.cHold); }
  function timelineTime() { return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000); }
  function setTime(time) { const next = Math.max(0, time); pausedAt = next; animationStart = performance.now() - next * 1000; previewDirty = true; drawPreview(next); }
  function restart() { pausedAt = 0; animationStart = performance.now(); paused = false; lastDuration = cycleDuration(); previewDirty = true; $("#pauseButton").textContent = "暂停"; }
  function preservePhase() {
    const current = timelineTime();
    const previous = Math.max(1 / fps, lastDuration);
    const next = cycleDuration();
    const rebased = (Math.floor(current / previous) + mod(current, previous) / previous) * next;
    lastDuration = next;
    if (paused) pausedAt = rebased; else animationStart = performance.now() - rebased * 1000;
    drawPreview(rebased);
  }
  function sceneAt(time) {
    const phase = mod(time, cycleDuration());
    const t = timing();
    if (phase < t.a) return { name: "replace", local: phase, progress: phase / Math.max(.001, t.a) };
    if (phase < t.a + t.color) return { name: "color", local: phase - t.a, progress: (phase - t.a) / Math.max(.001, t.color) };
    if (phase < t.a + t.color + t.bHold) return { name: "color-hold", local: phase - t.a - t.color, progress: (phase - t.a - t.color) / Math.max(.001, t.bHold) };
    const arcStart = t.a + t.color + t.bHold;
    if (phase < arcStart + t.arc) return { name: "arc", local: phase - arcStart, progress: (phase - arcStart) / Math.max(.001, t.arc) };
    return { name: "arc-hold", local: phase - arcStart - t.arc, progress: 1 };
  }

  function scaleFor(width, height) { return Math.max(.24, Math.min(width / 1000, height / 900)); }
  function gapValues(input, count, scale) {
    const values = String(input?.value || "").split(/[,，\s]+/).filter(Boolean).map(Number);
    return Array.from({ length: Math.max(0, count - 1) }, (_, index) => (Number.isFinite(values[index]) ? values[index] : 0) * scale);
  }
  function layoutText(renderContext, text, replacements, width, height, gapInput, fontSizeInput) {
    const scale = scaleFor(width, height);
    let fontSize = Number(fontSizeInput.value) * scale;
    let tracking = Number(inputs.tracking.value) * scale;
    const family = window.STGFontLibrary?.family(inputs.font.value) || fontMap[inputs.font.value] || fontMap.inter;
    renderContext.font = `${inputs.weight.value} ${fontSize}px ${family}`;
    const characters = Array.from(text || " ");
    const replacementSet = new Set(replacements || []);
    let customGaps = gapValues(gapInput, characters.length, scale);
    const measure = () => characters.map((character, index) => replacementSet.has(index) ? fontSize * .82 * Number(inputs.iconGap.value) / 100 : renderContext.measureText(character).width);
    let widths = measure();
    const totalWidth = () => widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, characters.length - 1) + customGaps.reduce((sum, value) => sum + value, 0);
    let total = totalWidth();
    const maximum = width * .92;
    if (total > maximum) {
      const factor = maximum / total;
      fontSize *= factor;
      tracking *= factor;
      customGaps = customGaps.map((value) => value * factor);
      renderContext.font = `${inputs.weight.value} ${fontSize}px ${family}`;
      widths = measure();
      total = totalWidth();
    }
    let x = width * Number(inputs.textX.value) / 100 - total / 2;
    const y = height * Number(inputs.textY.value) / 100;
    const items = characters.map((character, index) => {
      const item = { character, index, x, y, width: widths[index], centerX: x + widths[index] / 2, fontSize };
      x += widths[index] + tracking + (customGaps[index] || 0);
      return item;
    });
    return { items, fontSize, customGaps };
  }

  function getImage(path) {
    if (!path) return null;
    if (!imageCache.has(path)) {
      const image = new Image();
      image.onload = () => { previewDirty = true; };
      image.src = path;
      imageCache.set(path, image);
    }
    return imageCache.get(path);
  }
  function selectedImage() {
    if (inputs.iconPreset.value === "upload") return uploadedImage;
    if (inputs.iconPreset.value.startsWith("animal-")) return getImage(`assets/transparent-animals/${inputs.iconPreset.value}.png`);
    return null;
  }

  function roundedRect(renderContext, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    renderContext.beginPath();
    renderContext.moveTo(x + r, y); renderContext.arcTo(x + width, y, x + width, y + height, r); renderContext.arcTo(x + width, y + height, x, y + height, r);
    renderContext.arcTo(x, y + height, x, y, r); renderContext.arcTo(x, y, x + width, y, r); renderContext.closePath();
  }
  function drawBuiltinIcon(renderContext, type, x, y, size) {
    renderContext.save();
    if (type === "target") {
      [inputs.colorB.value, "#ffde00", inputs.colorC.value, "#32c5ff", "#111111"].forEach((color, index) => {
        renderContext.beginPath(); renderContext.fillStyle = color; renderContext.arc(x, y, size * (.5 - index * .08), 0, Math.PI * 2); renderContext.fill();
      });
      renderContext.restore(); return;
    }
    const background = type === "music" ? "#fa264f" : type === "play" ? "#111" : type === "cloud" ? "#1389ff" : "#d8d8d8";
    roundedRect(renderContext, x - size / 2, y - size / 2, size, size, size * .23); renderContext.fillStyle = background; renderContext.fill();
    renderContext.fillStyle = "#fff"; renderContext.strokeStyle = "#fff"; renderContext.lineWidth = size * .07;
    if (type === "play") { renderContext.beginPath(); renderContext.moveTo(x - size * .1, y - size * .2); renderContext.lineTo(x + size * .23, y); renderContext.lineTo(x - size * .1, y + size * .2); renderContext.closePath(); renderContext.fill(); }
    else if (type === "cloud") { renderContext.beginPath(); renderContext.arc(x - size * .17, y + size * .06, size * .16, 0, Math.PI * 2); renderContext.arc(x + size * .02, y - size * .04, size * .22, 0, Math.PI * 2); renderContext.arc(x + size * .22, y + size * .06, size * .15, 0, Math.PI * 2); renderContext.fill(); }
    else if (type === "watch") { roundedRect(renderContext, x - size * .22, y - size * .31, size * .44, size * .62, size * .12); renderContext.fillStyle = "#111"; renderContext.fill(); roundedRect(renderContext, x - size * .15, y - size * .2, size * .3, size * .4, size * .08); renderContext.fillStyle = "#d7ff2f"; renderContext.fill(); }
    else { renderContext.beginPath(); renderContext.moveTo(x - size * .06, y - size * .28); renderContext.lineTo(x - size * .06, y + size * .18); renderContext.stroke(); renderContext.beginPath(); renderContext.arc(x - size * .17, y + size * .23, size * .12, 0, Math.PI * 2); renderContext.fill(); renderContext.beginPath(); renderContext.arc(x + size * .07, y + size * .14, size * .12, 0, Math.PI * 2); renderContext.fill(); }
    renderContext.restore();
  }
  function drawIcon(renderContext, x, y, fontSize, scale = 1) {
    const size = fontSize * .78 * Number(inputs.iconSize.value) / 100 * scale;
    const offsetX = Number(inputs.iconX.value) * scaleFor(canvas.clientWidth || 1000, canvas.clientHeight || 900);
    const offsetY = Number(inputs.iconY.value) * scaleFor(canvas.clientWidth || 1000, canvas.clientHeight || 900);
    const image = selectedImage();
    if (image?.complete && image.naturalWidth) {
      renderContext.drawImage(image, x - size / 2 + offsetX, y - size / 2 + offsetY, size, size);
    } else drawBuiltinIcon(renderContext, inputs.iconPreset.value === "upload" ? "target" : inputs.iconPreset.value, x + offsetX, y + offsetY, size);
  }

  function drawSceneA(renderContext, width, height, progress) {
    const target = clamp(Number(inputs.targetA.value) - 1, 0, Math.max(0, Array.from(inputs.a.value).length - 1));
    const layout = layoutText(renderContext, inputs.a.value, [target], width, height, inputs.gapA, inputs.fontSizeA);
    const drift = Math.pow(clamp(progress), 2.35);
    const groupScale = 1 + Number(inputs.introScale.value) / 100 * drift;
    const centerX = width * Number(inputs.textX.value) / 100;
    const centerY = height * Number(inputs.textY.value) / 100;
    const shift = Number(inputs.introShift.value) * scaleFor(width, height) * drift;
    renderContext.save();
    renderContext.translate(centerX + shift, centerY);
    renderContext.scale(groupScale, groupScale);
    renderContext.translate(-centerX, -centerY);
    renderContext.textBaseline = "middle"; renderContext.fillStyle = inputs.textColor.value;
    layout.items.forEach((item) => { if (item.index === target) drawIcon(renderContext, item.centerX, item.y, layout.fontSize); else renderContext.fillText(item.character, item.x, item.y); });
    renderContext.restore();
    return layout;
  }
  function colorPulse(index, count, progress) {
    const mode = inputs.colorRhythm.value;
    if (mode === "flash") return Math.sin(Math.PI * clamp(progress));
    let order = index / Math.max(1, count - 1);
    if (mode === "center") order = Math.abs(index - (count - 1) / 2) / Math.max(1, (count - 1) / 2);
    if (mode === "sweep") return smooth((progress - order * .5) / .28) * (1 - smooth((progress - .72 - order * .18) / .2));
    const softness = Number(inputs.softness.value) / 100;
    const wave = .5 + .5 * Math.sin((progress * 2.2 - order * .72) * Math.PI * 2 - Math.PI / 2);
    return Math.pow(clamp(wave), lerp(2.15, .55, softness));
  }
  function heartbeatMotion(progress) {
    const p = clamp(progress);
    if (inputs.bMotionRhythm.value === "linear") return 1 - Math.abs(p * 2 - 1);
    if (inputs.bMotionRhythm.value === "fast") return Math.pow(Math.sin(Math.PI * p), .42);
    if (inputs.bMotionRhythm.value === "spring") return clamp(Math.sin(Math.PI * p) * (1 + Math.sin(Math.PI * p * 3) * .16), 0, 1.1);
    return Math.pow(Math.sin(Math.PI * p), .72);
  }
  function relayLetterState(index, count, progress) {
    if (inputs.colorRhythm.value !== "relay") {
      const pulse = colorPulse(index, count, progress);
      return { pulse, heartbeat: pulse, color: relayPaletteColor(mod(progress + index / Math.max(1, count), 1)) };
    }
    const heartbeatShare = clamp(Number(inputs.bBurst.value) / Math.max(1, Number(inputs.colorDuration.value)), .12, .84);
    const lastStart = Math.max(.04, 1 - heartbeatShare - .05);
    const reverseIndex = Math.max(0, count - 1 - index);
    const start = .025 + (count > 1 ? reverseIndex / (count - 1) * lastStart : lastStart / 2);
    const local = (progress - start) / heartbeatShare;
    if (local <= 0 || local >= 1) return { pulse: 0, heartbeat: 0, color: inputs.textColor.value };
    const edge = smooth(local / .04) * (1 - smooth((local - .96) / .04));
    return { pulse: edge, heartbeat: heartbeatMotion(local) * edge, color: relayPaletteColor(local) };
  }
  function drawSceneB(renderContext, width, height, progress, colored) {
    const layout = layoutText(renderContext, inputs.b.value, [], width, height, inputs.gapB, inputs.fontSizeB);
    const startScale = Number(inputs.bStartScale.value) / 100;
    const peakScale = Number(inputs.bPeakScale.value) / 100;
    renderContext.textBaseline = "middle";
    layout.items.forEach((item) => {
      const state = colored ? relayLetterState(item.index, layout.items.length, progress) : { pulse: 0, heartbeat: 0, color: inputs.textColor.value };
      const letterScale = lerp(startScale, peakScale, state.heartbeat);
      renderContext.save();
      renderContext.translate(item.centerX, item.y);
      renderContext.scale(letterScale, letterScale);
      renderContext.fillStyle = mixColor(inputs.textColor.value, state.color, state.pulse);
      renderContext.fillText(item.character, item.x - item.centerX, 0);
      renderContext.restore();
    });
    return layout;
  }
  function drawSceneC(renderContext, width, height, progress) {
    const characters = Array.from(inputs.c.value);
    const target = clamp(Number(inputs.targetC.value) - 1, 0, Math.max(0, characters.length - 1));
    const outline = clamp(Number(inputs.outlineTarget.value) - 1, 0, Math.max(0, characters.length - 1));
    const plainLayout = layoutText(renderContext, inputs.c.value, [outline], width, height, inputs.gapC, inputs.fontSizeC);
    const finalLayout = layoutText(renderContext, inputs.c.value, [target, outline], width, height, inputs.gapC, inputs.fontSizeC);
    const mode = inputs.endingMotion.value;
    const shakeShare = clamp(Number(inputs.endingShakeDuration.value) / Math.max(1, Number(inputs.arcDuration.value)), .07, .68);
    const shakeProgress = mode === "snap" ? 1 : smooth(progress / shakeShare);
    const roomStart = mode === "snap" ? 0 : shakeShare * .44;
    const roomProgress = smooth((progress - roomStart) / (mode === "snap" ? .18 : .28));
    const enterStart = mode === "snap" ? .02 : shakeShare * .72;
    const enterProgress = smooth((progress - enterStart) / (mode === "snap" ? .16 : .48));
    const shakeAmplitude = finalLayout.fontSize * Number(inputs.endingShake.value) / 100;
    renderContext.textBaseline = "middle"; renderContext.fillStyle = inputs.textColor.value;
    finalLayout.items.forEach((item, index) => {
      const previous = plainLayout.items[index] || item;
      const x = lerp(previous.x, item.x, roomProgress);
      const centerX = lerp(previous.centerX, item.centerX, roomProgress);
      if (item.index === target) {
        const shakeX = mode === "shake" ? Math.sin(shakeProgress * Math.PI * 8) * shakeAmplitude * (1 - shakeProgress * .34) : 0;
        const shakeY = mode === "shake" ? Math.sin(shakeProgress * Math.PI * 6 + Math.PI / 2) * shakeAmplitude * .18 * (1 - shakeProgress) : 0;
        if (enterProgress < .999) {
          renderContext.save();
          renderContext.globalAlpha = 1 - enterProgress;
          renderContext.translate(previous.centerX + shakeX, previous.y + shakeY);
          renderContext.scale(lerp(1, .78, enterProgress), lerp(1, .78, enterProgress));
          renderContext.fillStyle = inputs.textColor.value;
          renderContext.fillText(previous.character, previous.x - previous.centerX, 0);
          renderContext.restore();
        }
        if (enterProgress > .001) {
          const kickY = mode === "bounce" ? -Math.sin(enterProgress * Math.PI) * finalLayout.fontSize * .16 : 0;
          renderContext.save();
          renderContext.globalAlpha = enterProgress;
          drawIcon(renderContext, centerX, item.y + kickY, finalLayout.fontSize, lerp(.52, 1, popEase(enterProgress, .24)));
          renderContext.restore();
        }
      } else if (item.index === outline) {
        renderContext.beginPath(); renderContext.strokeStyle = mixColor("#c8c8c8", inputs.textColor.value, .35); renderContext.lineWidth = Math.max(1, finalLayout.fontSize * .025); renderContext.arc(centerX, item.y, finalLayout.fontSize * .32, 0, Math.PI * 2); renderContext.stroke();
      } else renderContext.fillText(item.character, x, item.y);
    });
    return finalLayout;
  }

  function renderFrame(targetCanvas, time, width, height, ratio = 1) {
    const renderContext = targetCanvas.getContext("2d");
    renderContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderContext.fillStyle = inputs.background.value; renderContext.fillRect(0, 0, width, height);
    const state = sceneAt(time);
    if (state.name === "replace") drawSceneA(renderContext, width, height, state.progress);
    else if (state.name === "color") drawSceneB(renderContext, width, height, state.progress, true);
    else if (state.name === "color-hold") drawSceneB(renderContext, width, height, 1, false);
    else drawSceneC(renderContext, width, height, state.progress);
    if (targetCanvas === canvas) {
      canvas.dataset.scene = state.name; canvas.dataset.phase = mod(time, cycleDuration()).toFixed(4); canvas.dataset.cycleDuration = cycleDuration().toFixed(4); canvas.dataset.timelineTime = time.toFixed(4); canvas.dataset.previewQuality = "realtime";
    }
  }
  function resizeCanvas() {
    const ratio = Math.min(1.25, Math.max(1, devicePixelRatio || 1)); const width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight);
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; canvas.dataset.ratio = String(ratio); previewDirty = true; }
  }
  function drawPreview(time = timelineTime()) { resizeCanvas(); const ratio = Number(canvas.dataset.ratio || 1); renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio); previewDirty = false; frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`; }
  function previewLoop() { if (!paused || previewDirty) drawPreview(); rafId = requestAnimationFrame(previewLoop); }

  function updateOutputs() {
    previewDirty = true;
    const values = { playbackSpeedOut: `${Number(inputs.speed.value).toFixed(2)}×`, sceneADurationOut: `${(inputs.aDuration.value / 1000).toFixed(2)}秒`, colorDurationOut: `${(inputs.colorDuration.value / 1000).toFixed(2)}秒`, sceneBHoldOut: `${(inputs.bHold.value / 1000).toFixed(2)}秒`, arcDurationOut: `${(inputs.arcDuration.value / 1000).toFixed(2)}秒`, sceneCHoldOut: `${(inputs.cHold.value / 1000).toFixed(2)}秒`, colorSoftnessOut: `${inputs.softness.value}%`, sceneBBurstDurationOut: `${(inputs.bBurst.value / 1000).toFixed(2)}秒`, sceneBStartScaleOut: `${inputs.bStartScale.value}%`, sceneBPeakScaleOut: `${inputs.bPeakScale.value}%`, fontSizeAOut: `${inputs.fontSizeA.value}px`, fontSizeBOut: `${inputs.fontSizeB.value}px`, fontSizeCOut: `${inputs.fontSizeC.value}px`, trackingOut: `${inputs.tracking.value}px`, textXOut: `${inputs.textX.value}%`, textYOut: `${inputs.textY.value}%`, introShiftOut: `${inputs.introShift.value}px`, introScaleOut: `${inputs.introScale.value}%`, targetAOut: inputs.targetA.value, targetCOut: inputs.targetC.value, outlineTargetOut: inputs.outlineTarget.value, iconSizeOut: `${inputs.iconSize.value}%`, iconGapOut: `${inputs.iconGap.value}%`, iconXOut: `${inputs.iconX.value}px`, iconYOut: `${inputs.iconY.value}px`, endingShakeOut: `${inputs.endingShake.value}%`, endingShakeDurationOut: `${(inputs.endingShakeDuration.value / 1000).toFixed(2)}秒` };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
  }
  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  [inputs.a, inputs.b, inputs.c, inputs.speed, inputs.aDuration, inputs.colorDuration, inputs.bHold, inputs.arcDuration, inputs.cHold].forEach((input) => input.addEventListener("input", preservePhase));
  inputs.iconPreset.addEventListener("change", () => { previewDirty = true; });
  inputs.iconUpload.addEventListener("change", () => {
    const file = inputs.iconUpload.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { uploadedImage = image; inputs.iconPreset.value = "upload"; previewDirty = true; }; image.src = reader.result; }; reader.readAsDataURL(file);
  });
  function setReference() { inputs.a.value = "a season of"; inputs.b.value = "joy"; inputs.c.value = "motivation"; inputs.font.value = "inter"; inputs.targetA.value = 5; inputs.targetC.value = 2; inputs.outlineTarget.value = 9; restart(); updateOutputs(); }
  $("#referencePreset").addEventListener("click", setReference);
  $("#chinesePreset").addEventListener("click", () => { inputs.a.value = "热爱是一种"; inputs.b.value = "快乐"; inputs.c.value = "持续行动"; inputs.font.value = "noto"; inputs.targetA.value = 3; inputs.targetC.value = 2; inputs.outlineTarget.value = 4; restart(); updateOutputs(); });
  [$("#restartTop"), $("#restartButton")].forEach((button) => button.addEventListener("click", restart));
  $("#pauseButton").addEventListener("click", (event) => { if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; event.currentTarget.textContent = "暂停"; } else { pausedAt = timelineTime(); paused = true; drawPreview(pausedAt); event.currentTarget.textContent = "继续"; } });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(timelineTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(timelineTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(rafId); else { animationStart = performance.now() - timelineTime() * 1000; previewLoop(); } });

  function exportDimensions() { const value = $("#exportPreset").value; if (value === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)]; if (value === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)]; return value.split("x").map(Number); }
  function makeExportCanvas(vertical = false) { const result = document.createElement("canvas"); const size = vertical ? [1080, 1920] : exportDimensions(); result.width = clamp(Math.round(size[0]) || 1080, 240, 3840); result.height = clamp(Math.round(size[1]) || 1080, 240, 3840); return result; }
  function selectedDuration() { const value = $("#exportDuration").value; if (value === "cycle") return cycleDuration(); if (value === "custom") return clamp(Number($("#customDuration").value) || 5, .5, 30); return Number(value) || 5; }
  function downloadBlob(blob, filename) { const link = document.createElement("a"), url = URL.createObjectURL(blob); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) { exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => { const output = makeExportCanvas(); renderFrame(output, timelineTime(), output.width, output.height, 1); output.toBlob((blob) => { if (!blob) return; downloadBlob(blob, `glyph-relay-${output.width}x${output.height}.png`); exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png"); });
  $("#exportGif").addEventListener("click", () => { if (!window.GIF) return; const output = makeExportCanvas(), exportFps = Number($("#exportFps").value) || 30, duration = selectedDuration(), frames = Math.ceil(duration * exportFps); setExportBusy(true, `正在准备 GIF · 0 / ${frames} 帧`); const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" }); for (let frame = 0; frame < frames; frame += 1) { renderFrame(output, frame / exportFps, output.width, output.height, 1); gif.addFrame(output, { copy: true, delay: 1000 / exportFps }); } gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; }); gif.on("finished", (blob) => { downloadBlob(blob, `glyph-relay-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); }); gif.render(); });
  async function exportVideo(vertical = false) { const output = makeExportCanvas(vertical), exportFps = Number($("#exportFps").value) || 30, duration = selectedDuration(), frames = Math.ceil(duration * exportFps); setExportBusy(true, "正在逐帧生成视频 · 0%"); try { const writer = new WebMWriter({ quality: .94, frameRate: exportFps }); for (let frame = 0; frame < frames; frame += 1) { renderFrame(output, frame / exportFps, output.width, output.height, 1); writer.addFrame(output); if (frame % 2 === 0) { exportStatus.textContent = `正在逐帧生成视频 · ${Math.round((frame + 1) / frames * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); } } const blob = await writer.complete(); downloadBlob(blob, `glyph-relay-${output.width}x${output.height}.webm`); setExportBusy(false, `WEBM 视频已生成 · ${output.width} × ${output.height}`); } catch (error) { setExportBusy(false, `视频导出失败：${error.message}`); } }
  $("#exportVideo").addEventListener("click", () => exportVideo(false)); $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  updateOutputs(); lastDuration = cycleDuration(); document.fonts.ready.then(restart); previewLoop();
})();
