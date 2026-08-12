(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    font: $("#fontFamily"), weight: $("#fontWeight"), fontSize: $("#fontSize"), tracking: $("#tracking"),
    wordGap: $("#wordGap"), horizontalPosition: $("#horizontalPosition"), verticalPosition: $("#verticalPosition"),
    beatInterval: $("#beatInterval"), defaultReveal: $("#defaultReveal"), loopHold: $("#loopHold"),
    background: $("#backgroundColor"), foreground: $("#textColor")
  };
  const fontPresets = {
    "snap-inter-medium": { family: "Continuation Inter", weight: 500, style: "normal" },
    "snap-inter-black": { family: "Continuation Inter", weight: 900, style: "normal" },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 700, style: "normal" },
    "fs-satoshi": { family: "Satoshi", weight: 500, style: "normal" },
    "fs-general-sans": { family: "General Sans", weight: 500, style: "normal" },
    "ib-manrope": { family: "CRManrope", weight: 500, style: "normal" },
    "ib-poppins": { family: "CRPoppins", weight: 400, style: "normal" },
    "cn-noto-regular": { family: "Continuation SC", weight: 400, style: "normal" }
  };
  let phrases = [
    { id: 1, text: "One", color: "#050505", at: 160, reveal: 70, rhythm: "punch" },
    { id: 2, text: "shared", color: "#050505", at: 420, reveal: 70, rhythm: "punch" },
    { id: 3, text: "workspace", color: "#050505", at: 680, reveal: 70, rhythm: "punch" }
  ];
  let nextId = 4;
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let beatDrag = null;
  let suppressBeatClick = false;
  const beatTimelineMax = 8000;
  const beatTimelinePixelsPerSecond = 140;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);

  function restart() {
    pausedAt = 0;
    animationStart = performance.now();
    paused = false;
    $("#pauseButton").textContent = "暂停";
  }

  function secondsLabel(value) {
    const milliseconds = Math.max(0, Number(value) || 0);
    if (milliseconds === 0) return "0秒";
    if (milliseconds < 1000) return `${(milliseconds / 1000).toFixed(2).replace(/0$/, "")}秒`;
    return `${(milliseconds / 1000).toFixed(1).replace(/\.0$/, "")}秒`;
  }

  function beatFeeling(value) {
    const milliseconds = Number(value) || 0;
    if (milliseconds <= 140) return "疾速";
    if (milliseconds <= 320) return "很快";
    if (milliseconds <= 650) return "中速";
    if (milliseconds <= 1200) return "慢速";
    return "很慢";
  }

  function revealFeeling(value) {
    const milliseconds = Number(value) || 0;
    if (milliseconds === 0) return "瞬间";
    if (milliseconds <= 90) return "极快";
    if (milliseconds <= 220) return "有力";
    if (milliseconds <= 500) return "清晰";
    return "柔慢";
  }

  function timingOutput(kind, value) {
    if (kind === "at") return `第 ${secondsLabel(value)}出现`;
    return `${revealFeeling(value)} · ${secondsLabel(value)}`;
  }

  function renderPhraseList() {
    const list = $("#phraseList");
    list.innerHTML = phrases.map((phrase, index) => `
      <div class="phrase-card" data-id="${phrase.id}">
        <span class="phrase-index">${String(index + 1).padStart(2, "0")}</span>
        <div class="phrase-fields">
          <input class="phrase-text" type="text" value="${phrase.text.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}" aria-label="第 ${index + 1} 组文字">
          <input class="phrase-color" type="color" value="${phrase.color}" aria-label="第 ${index + 1} 组颜色">
          <div class="phrase-time-fields">
            <label class="phrase-slider phrase-at-slider"><span>出现时间点 <output class="phrase-at-out">${timingOutput("at", phrase.at)}</output></span><input class="phrase-at" type="range" min="0" max="8000" step="20" value="${phrase.at}" aria-label="第 ${index + 1} 组出现时间点"></label>
            <label class="phrase-slider"><span>出现速度 <output class="phrase-reveal-out">${timingOutput("reveal", phrase.reveal)}</output></span><input class="phrase-reveal" type="range" min="0" max="1200" step="10" value="${phrase.reveal}" aria-label="第 ${index + 1} 组出现速度"></label>
            <label class="phrase-rhythm-field"><span>出现力度</span><select class="phrase-rhythm">
              <option value="instant" ${phrase.rhythm === "instant" ? "selected" : ""}>瞬切</option>
              <option value="punch" ${phrase.rhythm === "punch" ? "selected" : ""}>强劲</option>
              <option value="crisp" ${phrase.rhythm === "crisp" ? "selected" : ""}>利落</option>
              <option value="soft" ${phrase.rhythm === "soft" ? "selected" : ""}>柔和</option>
            </select></label>
          </div>
        </div>
        <div class="phrase-tools">
          <button class="move-up" type="button" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="move-down" type="button" title="下移" ${index === phrases.length - 1 ? "disabled" : ""}>↓</button>
          <button class="remove-phrase" type="button" title="删除" ${phrases.length === 1 ? "disabled" : ""}>删除</button>
        </div>
      </div>`).join("");
    renderBeatTimeline();
  }

  function renderBeatTimeline() {
    const timeline = $("#beatTimeline");
    if (!timeline) return;
    timeline.style.width = `${beatTimelineMax / 1000 * beatTimelinePixelsPerSecond}px`;
    const ticks = Array.from({ length: 17 }, (_, index) => {
      const milliseconds = index * 500;
      const major = milliseconds % 1000 === 0;
      return `<span class="beat-tick ${major ? "is-major" : ""}" style="left:${milliseconds / beatTimelineMax * 100}%"><i></i>${major ? `<small>${milliseconds / 1000}s</small>` : ""}</span>`;
    }).join("");
    const markers = phrases.map((phrase, index) => {
      const left = Math.min(100, phrase.at / beatTimelineMax * 100);
      const stack = phrases.slice(0, index).filter((item) => item.at === phrase.at).length;
      return `<button class="beat-marker" type="button" data-beat-index="${index}" style="left:${left}%;--beat-stack:${stack}" title="拖动第 ${index + 1} 组 · ${secondsLabel(phrase.at)}" aria-label="第 ${index + 1} 组出现时间 ${secondsLabel(phrase.at)}" aria-valuemin="0" aria-valuemax="${beatTimelineMax}" aria-valuenow="${phrase.at}"><b>${String(index + 1).padStart(2, "0")}</b><small>${secondsLabel(phrase.at)}</small></button>`;
    }).join("");
    timeline.innerHTML = ticks + markers;
    $("#beatTimelineDuration").textContent = `0—${secondsLabel(beatTimelineMax)}`;
  }

  function setPhraseAt(index, requestedTime, marker = null) {
    if (!phrases[index]) return;
    const earliest = index > 0 ? phrases[index - 1].at : 0;
    const latest = index < phrases.length - 1 ? phrases[index + 1].at : beatTimelineMax;
    let nextTime = Math.round(Math.max(earliest, Math.min(latest, requestedTime)) / 20) * 20;
    [earliest, latest].forEach((neighborTime) => { if (Math.abs(nextTime - neighborTime) <= 60) nextTime = neighborTime; });
    phrases[index].at = nextTime;
    const card = $(`.phrase-card[data-id="${phrases[index].id}"]`);
    if (card) {
      card.querySelector(".phrase-at").value = String(nextTime);
      card.querySelector(".phrase-at-out").textContent = timingOutput("at", nextTime);
    }
    if (marker) {
      marker.style.left = `${nextTime / beatTimelineMax * 100}%`;
      marker.querySelector("small").textContent = secondsLabel(nextTime);
      marker.title = `拖动第 ${index + 1} 组 · ${secondsLabel(nextTime)}`;
      marker.setAttribute("aria-label", `第 ${index + 1} 组出现时间 ${secondsLabel(nextTime)}`);
      marker.setAttribute("aria-valuenow", String(nextTime));
      marker.classList.toggle("is-snapped", nextTime === earliest && index > 0 || nextTime === latest && index < phrases.length - 1);
    }
  }

  function previewPhrase(index) {
    const eventTime = Math.max(0, phrases[index]?.at || 0) / 1000;
    const previewStart = Math.max(0, eventTime - .16);
    pausedAt = previewStart;
    animationStart = performance.now() - previewStart * 1000;
    paused = false;
    $("#pauseButton").textContent = "暂停";
  }

  $("#phraseList").addEventListener("input", (event) => {
    const card = event.target.closest(".phrase-card");
    if (!card) return;
    const phrase = phrases.find((item) => item.id === Number(card.dataset.id));
    if (!phrase) return;
    if (event.target.classList.contains("phrase-text")) phrase.text = event.target.value;
    if (event.target.classList.contains("phrase-color")) phrase.color = event.target.value;
    if (event.target.classList.contains("phrase-at")) {
      const index = phrases.findIndex((item) => item.id === phrase.id);
      setPhraseAt(index, Number(event.target.value) || 0);
      renderBeatTimeline();
    }
    if (event.target.classList.contains("phrase-reveal")) {
      phrase.reveal = Math.max(0, Number(event.target.value) || 0);
      card.querySelector(".phrase-reveal-out").textContent = timingOutput("reveal", phrase.reveal);
    }
    if (event.target.classList.contains("phrase-rhythm")) phrase.rhythm = event.target.value;
    const index = phrases.findIndex((item) => item.id === phrase.id);
    if (event.target.matches(".phrase-at, .phrase-reveal, .phrase-rhythm")) previewPhrase(index);
    else restart();
  });
  $("#phraseList").addEventListener("change", (event) => {
    if (!event.target.classList.contains("phrase-rhythm")) return;
    const card = event.target.closest(".phrase-card");
    const phrase = phrases.find((item) => item.id === Number(card?.dataset.id));
    if (!phrase) return;
    phrase.rhythm = event.target.value;
    previewPhrase(phrases.findIndex((item) => item.id === phrase.id));
  });
  $("#phraseList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const card = event.target.closest(".phrase-card");
    if (!button || !card) return;
    const index = phrases.findIndex((item) => item.id === Number(card.dataset.id));
    const beatTimes = phrases.map((phrase) => phrase.at).sort((a, b) => a - b);
    if (button.classList.contains("remove-phrase") && phrases.length > 1) phrases.splice(index, 1);
    if (button.classList.contains("move-up") && index > 0) [phrases[index - 1], phrases[index]] = [phrases[index], phrases[index - 1]];
    if (button.classList.contains("move-down") && index < phrases.length - 1) [phrases[index + 1], phrases[index]] = [phrases[index], phrases[index + 1]];
    if (button.classList.contains("move-up") || button.classList.contains("move-down")) phrases.forEach((phrase, phraseIndex) => { phrase.at = beatTimes[phraseIndex]; });
    renderPhraseList();
    restart();
  });
  $("#addPhrase").addEventListener("click", () => {
    const lastAt = phrases.reduce((maximum, phrase) => Math.max(maximum, phrase.at), 0);
    phrases.push({ id: nextId++, text: `word ${phrases.length + 1}`, color: inputs.foreground.value, at: Math.min(beatTimelineMax, lastAt + Number(inputs.beatInterval.value)), reveal: Number(inputs.defaultReveal.value), rhythm: "punch" });
    renderPhraseList();
    restart();
    $("#phraseList").lastElementChild?.querySelector(".phrase-text")?.focus();
  });
  $("#beatTimeline").addEventListener("click", (event) => {
    const marker = event.target.closest(".beat-marker");
    if (!marker) return;
    if (suppressBeatClick) { suppressBeatClick = false; return; }
    previewPhrase(Number(marker.dataset.beatIndex));
  });
  $("#beatTimeline").addEventListener("pointerdown", (event) => {
    const marker = event.target.closest(".beat-marker");
    if (!marker) return;
    event.preventDefault();
    const timeline = $("#beatTimeline");
    beatDrag = { index: Number(marker.dataset.beatIndex), marker, pointerId: event.pointerId, startX: event.clientX, moved: false };
    marker.setPointerCapture?.(event.pointerId);
    marker.classList.add("is-dragging");
    timeline.classList.add("is-dragging");
  });
  $("#beatTimeline").addEventListener("pointermove", (event) => {
    if (!beatDrag || event.pointerId !== beatDrag.pointerId) return;
    const timeline = $("#beatTimeline");
    const rect = timeline.getBoundingClientRect();
    const progress = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
    if (Math.abs(event.clientX - beatDrag.startX) > 2) beatDrag.moved = true;
    setPhraseAt(beatDrag.index, progress * beatTimelineMax, beatDrag.marker);
    const previewTime = Math.max(0, phrases[beatDrag.index].at / 1000 - .10);
    pausedAt = previewTime;
    animationStart = performance.now() - previewTime * 1000;
    paused = false;
  });
  const finishBeatDrag = (event) => {
    if (!beatDrag || event.pointerId !== beatDrag.pointerId) return;
    beatDrag.marker.releasePointerCapture?.(event.pointerId);
    beatDrag.marker.classList.remove("is-dragging", "is-snapped");
    $("#beatTimeline").classList.remove("is-dragging");
    suppressBeatClick = beatDrag.moved;
    beatDrag = null;
    renderBeatTimeline();
    restart();
  };
  $("#beatTimeline").addEventListener("pointerup", finishBeatDrag);
  $("#beatTimeline").addEventListener("pointercancel", finishBeatDrag);
  $("#beatTimeline").addEventListener("keydown", (event) => {
    const marker = event.target.closest(".beat-marker");
    if (!marker || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const index = Number(marker.dataset.beatIndex);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setPhraseAt(index, phrases[index].at + direction * (event.shiftKey ? 100 : 20), marker);
    previewPhrase(index);
  });

  function timing() {
    const stages = phrases.map((phrase) => ({
      at: Math.max(0, phrase.at) / 1000,
      reveal: Math.max(0, phrase.reveal) / 1000,
      rhythm: phrase.rhythm || "punch"
    }));
    const contentDuration = stages.reduce((maximum, stage) => Math.max(maximum, stage.at + Math.max(1 / fps, stage.reveal)), 0);
    const loopHold = Number(inputs.loopHold.value) / 1000;
    return { stages, contentDuration, loopHold, cycle: Math.max(1 / fps, contentDuration + loopHold) };
  }

  function revealAlpha(progress, rhythm) {
    const x = clamp01(progress);
    if (rhythm === "instant") return x > 0 ? 1 : 0;
    if (rhythm === "punch") return Math.pow(x, .14);
    if (rhythm === "crisp") return 1 - Math.pow(1 - x, 4);
    return x * x * (3 - 2 * x);
  }

  function fontSpec(fontPx) {
    const preset = fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const weight = Number(inputs.weight.value) || preset.weight;
    return { preset, weight, css: `${preset.style} ${weight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif` };
  }

  function measureGroup(context, text, tracking) {
    const glyphs = graphemes(text || " ");
    const widths = glyphs.map((glyph) => context.measureText(glyph).width);
    return { glyphs, widths, tracking, width: widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, glyphs.length - 1) };
  }

  function layoutFor(context, count, tracking, gap) {
    const metrics = phrases.slice(0, count).map((phrase) => measureGroup(context, phrase.text.trim() || "word", tracking));
    const totalWidth = metrics.reduce((sum, metric) => sum + metric.width, 0) + gap * Math.max(0, count - 1);
    let cursor = -totalWidth / 2;
    const items = metrics.map((metric) => {
      const item = { metric, x: cursor };
      cursor += metric.width + gap;
      return item;
    });
    return { items, totalWidth };
  }

  function drawGroup(context, phrase, metric, x, y, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = phrase.color || inputs.foreground.value;
    context.translate(x, y);
    let cursor = 0;
    metric.glyphs.forEach((glyph, index) => {
      context.fillText(glyph, cursor, 0);
      cursor += metric.widths[index] + metric.tracking;
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
    const scale = Math.min(w, h) / 900;
    const fontPx = Math.max(12, Number(inputs.fontSize.value) * scale);
    const tracking = Number(inputs.tracking.value) * scale;
    const gap = Number(inputs.wordGap.value) * scale;
    const { preset, weight, css } = fontSpec(fontPx);
    context.font = css;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;
    const currentTiming = timing();
    const localTime = mod(time, currentTiming.cycle);
    const activeIndex = currentTiming.stages.reduce((latest, stage, index) => localTime >= stage.at ? index : latest, -1);
    const count = activeIndex + 1;
    const nextLayout = layoutFor(context, count, tracking, gap);
    const anchorX = w * Number(inputs.horizontalPosition.value) / 100;
    const edgePadding = w * .05;
    const safeWidth = Math.max(w * .15, Math.min(anchorX - edgePadding, w - edgePadding - anchorX) * 2);
    const fit = Math.min(1, safeWidth / Math.max(1, nextLayout.totalWidth));
    const y = h * Number(inputs.verticalPosition.value) / 100;
    const activeStage = activeIndex >= 0 ? currentTiming.stages[activeIndex] : null;
    const revealElapsed = activeStage ? Math.max(0, localTime - activeStage.at) : 0;
    const revealProgress = !activeStage ? 0 : activeStage.reveal === 0 ? 1 : clamp01(revealElapsed / activeStage.reveal);
    const incomingAlpha = activeStage ? revealAlpha(revealProgress, activeStage.rhythm) : 0;

    context.save();
    context.translate(anchorX, y);
    context.scale(fit, fit);
    for (let index = 0; index < count; index += 1) {
      const stage = currentTiming.stages[index];
      const stageProgress = stage.reveal === 0 ? 1 : clamp01((localTime - stage.at) / stage.reveal);
      const alpha = revealAlpha(stageProgress, stage.rhythm);
      drawGroup(context, phrases[index], nextLayout.items[index].metric, nextLayout.items[index].x, 0, alpha);
    }
    context.restore();

    if (target === canvas) {
      const lastStage = currentTiming.stages.at(-1);
      const finalHold = lastStage && localTime >= lastStage.at + lastStage.reveal;
      canvas.dataset.motionPhase = activeIndex < 0 ? "waiting-first-beat" : finalHold ? "final-hold" : revealProgress < 1 ? "revealing" : "between-beats";
      canvas.dataset.activeGroup = String(activeIndex + 1);
      canvas.dataset.visibleGroups = String(activeIndex < 0 ? 0 : activeIndex + (incomingAlpha > 0 ? 1 : 0));
      canvas.dataset.totalGroups = String(phrases.length);
      canvas.dataset.revealProgress = revealProgress.toFixed(4);
      canvas.dataset.revealAlpha = incomingAlpha.toFixed(4);
      canvas.dataset.rhythm = activeStage?.rhythm || "none";
      canvas.dataset.timelineTime = localTime.toFixed(4);
      canvas.dataset.nextBeat = String(currentTiming.stages.findIndex((stage) => stage.at > localTime) + 1);
      canvas.dataset.beatTimes = currentTiming.stages.map((stage) => stage.at.toFixed(3)).join(",");
      canvas.dataset.horizontalCenter = inputs.horizontalPosition.value;
      canvas.dataset.layoutCenterX = anchorX.toFixed(2);
      canvas.dataset.layoutLeft = (anchorX - nextLayout.totalWidth * fit / 2).toFixed(2);
      canvas.dataset.layoutRight = (anchorX + nextLayout.totalWidth * fit / 2).toFixed(2);
      canvas.dataset.fontFamily = preset.family;
      canvas.dataset.fontWeight = String(weight);
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
  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.round(mod(time, timing().cycle) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function updateOutputs() {
    const seconds = (value) => `${(Number(value) / 1000).toFixed(2).replace(/0$/, "")}秒`;
    const values = {
      fontSizeOut: inputs.fontSize.value, trackingOut: `${inputs.tracking.value}px`, wordGapOut: `${inputs.wordGap.value}px`, horizontalPositionOut: `${inputs.horizontalPosition.value}%`,
      verticalPositionOut: `${inputs.verticalPosition.value}%`,
      beatIntervalOut: `${beatFeeling(inputs.beatInterval.value)} · 每 ${secondsLabel(inputs.beatInterval.value)}一组`,
      defaultRevealOut: seconds(inputs.defaultReveal.value), loopHoldOut: seconds(inputs.loopHold.value)
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
  }
  Object.values(inputs).forEach((input) => input.addEventListener("input", () => {
    if (input === inputs.beatInterval) {
      const firstBeat = phrases[0]?.at || 0;
      const interval = Number(inputs.beatInterval.value);
      phrases.forEach((phrase, index) => { phrase.at = Math.min(8000, firstBeat + interval * index); });
      renderPhraseList();
    }
    updateOutputs();
    restart();
  }));
  inputs.foreground.addEventListener("change", () => {
    phrases.forEach((phrase) => { phrase.color = inputs.foreground.value; });
    renderPhraseList();
  });
  $("#restartButton").addEventListener("click", restart);
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; event.currentTarget.textContent = "暂停"; }
    else { pausedAt = currentTime(); paused = true; event.currentTarget.textContent = "继续"; }
  });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(currentTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(currentTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });

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
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) { exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => { if (!blob) return; downloadBlob(blob, `phrase-build-${output.width}x${output.height}.png`); exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas(); const gifFps = 15; const duration = timing().cycle; const frameTotal = Math.ceil(duration * gifFps);
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < frameTotal; frame += 1) { renderFrame(output, frame / gifFps, output.width, output.height, 1); gif.addFrame(output, { copy: true, delay: 1000 / gifFps }); }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `phrase-build-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); });
    gif.render();
  });
  function supportedVideoType() {
    const candidates = ["video/mp4;codecs=h264", "video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }
  async function exportWebMFrames(output, duration) {
    if (typeof window.WebMWriter !== "function") throw new Error("逐帧视频编码器未加载");
    const writer = new WebMWriter({ quality: .94, frameRate: fps });
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    for (let frame = 0; frame < frameCount; frame += 1) {
      renderFrame(output, frame / fps, output.width, output.height, 1); writer.addFrame(output);
      if (frame % 2 === 0) { exportStatus.textContent = `正在逐帧生成 ${output.width} × ${output.height} 高清视频 · ${Math.round((frame + 1) / frameCount * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); }
    }
    exportStatus.textContent = "正在封装视频文件…";
    const blob = await writer.complete();
    if (!blob || !blob.size) throw new Error("视频文件为空");
    downloadBlob(blob, `phrase-build-${output.width}x${output.height}-hd.webm`);
    return { extension: "WEBM", size: blob.size };
  }
  async function exportVideo(verticalHD = false) {
    const output = verticalHD ? document.createElement("canvas") : makeExportCanvas();
    if (verticalHD) { output.width = 1080; output.height = 1920; }
    const duration = timing().cycle;
    if (!output.captureStream || typeof MediaRecorder === "undefined") {
      setExportBusy(true, `正在逐帧生成 ${output.width} × ${output.height} 高清视频 · 0%`);
      try { const result = await exportWebMFrames(output, duration); setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`); }
      catch (error) { console.error(error); setExportBusy(false, `视频导出失败：${error.message || "编码器异常"}`); }
      return;
    }
    const stream = output.captureStream(fps); const mimeType = supportedVideoType(); let recorder;
    try { recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: verticalHD ? 20_000_000 : 12_000_000 } : undefined); }
    catch (error) {
      stream.getTracks().forEach((track) => track.stop()); setExportBusy(true, `正在逐帧生成 ${output.width} × ${output.height} 高清视频 · 0%`);
      try { const result = await exportWebMFrames(output, duration); setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`); }
      catch (fallbackError) { console.error(fallbackError); setExportBusy(false, `视频导出失败：${fallbackError.message || "编码器异常"}`); }
      return;
    }
    const chunks = []; recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve, reject) => {
      recorder.onerror = (event) => reject(event.error || new Error("视频编码失败"));
      recorder.onstop = () => { const type = recorder.mimeType || mimeType || "video/webm"; const extension = type.includes("mp4") ? "mp4" : "webm"; const blob = new Blob(chunks, { type }); if (!blob.size) { reject(new Error("视频文件为空")); return; } downloadBlob(blob, `phrase-build-${output.width}x${output.height}-hd.${extension}`); resolve({ extension: extension.toUpperCase(), size: blob.size }); };
    });
    setExportBusy(true, `正在录制 ${output.width} × ${output.height} 高清视频 · 0%`); recorder.start(250); const start = performance.now();
    try {
      await new Promise((resolve) => { const step = (now) => { const elapsed = Math.min(duration, (now - start) / 1000); renderFrame(output, elapsed, output.width, output.height, 1); exportStatus.textContent = `正在录制 ${output.width} × ${output.height} 高清视频 · ${Math.min(100, Math.round(elapsed / duration * 100))}%`; if (elapsed < duration) requestAnimationFrame(step); else resolve(); }; requestAnimationFrame(step); });
      recorder.stop(); const result = await finished; setExportBusy(false, `${result.extension} 视频已生成 · ${output.width} × ${output.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) { console.error(error); if (recorder.state !== "inactive") recorder.stop(); setExportBusy(false, `视频导出失败：${error.message || "编码器异常"}`); }
    finally { stream.getTracks().forEach((track) => track.stop()); }
  }
  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  renderPhraseList();
  updateOutputs();
  document.fonts.ready.then(restart);
  previewLoop();
})();
