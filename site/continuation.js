(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const designFrame = $("#designFrame");
  const phraseStage = $("#phraseStage");
  const livePhrase = $("#livePhrase");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    font: $("#fontFamily"), leadFontSize: $("#leadFontSize"), suffixFontSize: $("#suffixFontSize"),
    leadFontWeight: $("#leadFontWeight"), suffixFontWeight: $("#suffixFontWeight"),
    anticipation: $("#anticipation"), wordGap: $("#wordGap"), settleScale: $("#settleScale"),
    introDistance: $("#introDistance"), speed: $("#speed"), background: $("#backgroundColor"),
    foreground: $("#textColor"), introDuration: $("#introDuration"), rootHold: $("#rootHold"),
    anticipationDuration: $("#anticipationDuration"), suffixRevealDuration: $("#suffixRevealDuration"),
    settleDuration: $("#settleDuration"), phraseHold: $("#phraseHold")
  };

  const fontPresets = {
    "snap-inter-medium": { family: "Continuation Inter", weight: 500, style: "normal" },
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

  let timeline;
  let activeIndex = 0;
  let rebuildTimer;
  let rebuildSerial = 0;
  let currentCycle = 29 / fps;
  let rowPositions = [];
  let phrasePairs = [
    { lead: "One", suffix: "subscription." },
    { lead: "Endless", suffix: "creativity." }
  ];

  if (!window.gsap) {
    phraseStage.innerHTML = '<p class="load-error">GSAP 加载失败，请刷新页面。</p>';
    return;
  }
  gsap.ticker.fps(fps);

  function parsePairs() {
    const pairs = phrasePairs
      .map(({ lead, suffix }) => [lead.trim(), suffix.trim()])
      .filter(([lead]) => lead);
    return pairs.length ? pairs.slice(0, 8) : [["One", "subscription."]];
  }

  function renderPairEditor() {
    const editor = $("#pairEditor");
    editor.replaceChildren();
    phrasePairs.forEach((pair, index) => {
      const row = document.createElement("div");
      row.className = "pair-editor-row";
      row.innerHTML = `
        <span class="pair-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        <label><span class="sr-only">第 ${index + 1} 组前半句</span><input class="pair-lead-input" type="text" spellcheck="false" aria-label="第 ${index + 1} 组前半句"></label>
        <i aria-hidden="true">→</i>
        <label><span class="sr-only">第 ${index + 1} 组后半句</span><input class="pair-suffix-input" type="text" spellcheck="false" aria-label="第 ${index + 1} 组后半句"></label>
        <button class="remove-pair-button" type="button" aria-label="删除第 ${index + 1} 组">×</button>`;
      const leadInput = row.querySelector(".pair-lead-input");
      const suffixInput = row.querySelector(".pair-suffix-input");
      const removeButton = row.querySelector(".remove-pair-button");
      leadInput.value = pair.lead;
      suffixInput.value = pair.suffix;
      const updatePair = () => {
        phrasePairs[index] = { lead: leadInput.value, suffix: suffixInput.value };
        syncRowPositionControls();
        scheduleRebuild();
      };
      leadInput.addEventListener("input", updatePair);
      suffixInput.addEventListener("input", updatePair);
      removeButton.disabled = phrasePairs.length === 1;
      removeButton.addEventListener("click", () => {
        if (phrasePairs.length === 1) return;
        phrasePairs.splice(index, 1);
        rowPositions.splice(index, 1);
        renderPairEditor();
        syncRowPositionControls();
        scheduleRebuild();
      });
      editor.append(row);
    });
    $("#addPairButton").disabled = phrasePairs.length >= 8;
  }

  function updateRowPositionItem(item, position) {
    item.querySelector(".row-position-output").textContent = `${position}%`;
    item.querySelectorAll("button[data-position]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.position) === position));
    });
  }

  function syncRowPositionControls() {
    const pairs = parsePairs();
    rowPositions = pairs.map((_, index) => Number.isFinite(rowPositions[index]) ? rowPositions[index] : 50);
    const list = $("#rowPositionList");
    list.replaceChildren();

    pairs.forEach(([lead, suffix], index) => {
      const item = document.createElement("div");
      item.className = "row-position-item";
      item.innerHTML = `
        <div class="row-position-head">
          <span class="row-position-title"></span>
          <output class="row-position-output">${rowPositions[index]}%</output>
        </div>
        <div class="row-position-tools">
          <div class="row-position-presets" aria-label="第 ${index + 1} 行快捷位置">
            <button type="button" data-position="25">左</button>
            <button type="button" data-position="50">中</button>
            <button type="button" data-position="75">右</button>
          </div>
          <input class="row-position-range" type="range" min="10" max="90" step="1" value="${rowPositions[index]}" aria-label="第 ${index + 1} 行水平位置">
        </div>`;
      item.querySelector(".row-position-title").textContent = `${String(index + 1).padStart(2, "0")} · ${lead}${suffix ? ` ${suffix}` : ""}`;
      const range = item.querySelector(".row-position-range");
      range.addEventListener("input", () => {
        rowPositions[index] = Number(range.value);
        updateRowPositionItem(item, rowPositions[index]);
        scheduleRebuild();
      });
      item.querySelectorAll("button[data-position]").forEach((button) => {
        button.addEventListener("click", () => {
          rowPositions[index] = Number(button.dataset.position);
          range.value = String(rowPositions[index]);
          updateRowPositionItem(item, rowPositions[index]);
          scheduleRebuild();
        });
      });
      updateRowPositionItem(item, rowPositions[index]);
      list.append(item);
    });
  }

  function timingValues() {
    const timing = {
      intro: Number(inputs.introDuration.value) / 1000,
      hold: Number(inputs.rootHold.value) / 1000,
      anticipation: Number(inputs.anticipationDuration.value) / 1000,
      reveal: Number(inputs.suffixRevealDuration.value) / 1000,
      settle: Number(inputs.settleDuration.value) / 1000,
      phraseHold: Number(inputs.phraseHold.value) / 1000
    };
    timing.revealAt = timing.intro + timing.hold + timing.anticipation;
    timing.cycle = timing.revealAt + Math.max(timing.reveal, timing.settle) + timing.phraseHold;
    return timing;
  }

  function updateOutputs() {
    const values = {
      leadFontSizeOut: inputs.leadFontSize.value,
      suffixFontSizeOut: inputs.suffixFontSize.value,
      anticipationOut: `${inputs.anticipation.value}%`,
      wordGapOut: inputs.wordGap.value,
      settleScaleOut: `${inputs.settleScale.value}%`,
      introDistanceOut: inputs.introDistance.value,
      speedOut: `${(Number(inputs.speed.value) / 100).toFixed(2)}×`,
      introDurationOut: inputs.introDuration.value,
      rootHoldOut: inputs.rootHold.value,
      anticipationDurationOut: inputs.anticipationDuration.value,
      suffixRevealDurationOut: inputs.suffixRevealDuration.value,
      settleDurationOut: inputs.settleDuration.value,
      phraseHoldOut: inputs.phraseHold.value
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
  }

  function makeRows(pairs) {
    phraseStage.replaceChildren();
    return pairs.map(([leadText, suffixText], index) => {
      const slot = document.createElement("div");
      slot.className = "phrase-slot";
      slot.dataset.index = String(index);
      const motion = document.createElement("div");
      motion.className = "phrase-motion";
      const anchor = document.createElement("div");
      anchor.className = "phrase-anchor";
      const lead = document.createElement("span");
      lead.className = "phrase-lead";
      lead.textContent = leadText;
      const suffix = document.createElement("span");
      suffix.className = "phrase-suffix";
      suffix.textContent = suffixText;
      motion.append(lead, suffix);
      anchor.append(motion);
      slot.append(anchor);
      phraseStage.append(slot);
      return { slot, motion, lead, suffix, leadText, suffixText };
    });
  }

  function applyFontPreset() {
    const preset = fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    document.documentElement.style.setProperty("--phrase-font", `"${preset.family}"`);
    document.documentElement.style.setProperty("--phrase-style", preset.style);
    return preset;
  }

  async function rebuild({ keepPaused = false } = {}) {
    const serial = ++rebuildSerial;
    const wasPaused = keepPaused && timeline?.paused();
    const oldProgress = timeline?.progress() || 0;
    timeline?.pause();

    document.documentElement.style.setProperty("--stage-background", inputs.background.value);
    document.documentElement.style.setProperty("--stage-foreground", inputs.foreground.value);
    document.documentElement.style.setProperty("--lead-size", `${inputs.leadFontSize.value}px`);
    document.documentElement.style.setProperty("--suffix-size", `${inputs.suffixFontSize.value}px`);
    document.documentElement.style.setProperty("--lead-weight", inputs.leadFontWeight.value);
    document.documentElement.style.setProperty("--suffix-weight", inputs.suffixFontWeight.value);
    const fontPreset = applyFontPreset();
    updateOutputs();
    await Promise.race([
      Promise.all([
        document.fonts.load(`${fontPreset.style} ${inputs.leadFontWeight.value} ${inputs.leadFontSize.value}px "${fontPreset.family}"`),
        document.fonts.load(`${fontPreset.style} ${inputs.suffixFontWeight.value} ${inputs.suffixFontSize.value}px "${fontPreset.family}"`)
      ]),
      new Promise((resolve) => window.setTimeout(resolve, 1800))
    ]);
    if (serial !== rebuildSerial) return;
    timeline?.kill();

    const rows = makeRows(parsePairs());
    const gap = Number(inputs.wordGap.value);
    const anticipationRatio = Number(inputs.anticipation.value) / 100;
    const settleScale = Number(inputs.settleScale.value) / 100;
    const introDistance = Number(inputs.introDistance.value);
    const timing = timingValues();
    currentCycle = timing.cycle;
    const stageWidth = designFrame.clientWidth;
    const metrics = rows.map((row, index) => {
      const leadWidth = row.lead.getBoundingClientRect().width;
      const suffixWidth = row.suffix.getBoundingClientRect().width;
      const fullWidth = leadWidth + (suffixWidth ? gap : 0) + suffixWidth;
      const anchorPercent = rowPositions[index] ?? 50;
      const anchorX = stageWidth * anchorPercent / 100;
      const availableWidth = Math.max(120, 2 * (Math.min(anchorX, stageWidth - anchorX) - 40));
      return {
        leadWidth, suffixWidth, fullWidth, anchorPercent,
        leadFit: Math.min(1, availableWidth / Math.max(1, leadWidth * settleScale)),
        phraseFit: Math.min(1, availableWidth / Math.max(1, fullWidth * settleScale))
      };
    });

    const slots = rows.map((row) => row.slot);
    gsap.set(slots, { autoAlpha: 0 });
    gsap.set(rows.map((row) => row.suffix), { autoAlpha: 0 });
    let shownIndex = -1;
    function activateRow(index) {
      if (index === shownIndex) return;
      gsap.set(slots, { autoAlpha: 0 });
      gsap.set(rows[index].slot, { autoAlpha: 1 });
      shownIndex = index;
      activeIndex = index;
      livePhrase.textContent = rows[index].suffixText
        ? `${rows[index].leadText} ${rows[index].suffixText}` : rows[index].leadText;
    }
    activateRow(0);

    timeline = gsap.timeline({
      repeat: -1,
      defaults: { overwrite: "auto" },
      onUpdate() {
        const index = Math.min(rows.length - 1, Math.floor((timeline.time() + 0.000001) / currentCycle));
        activateRow(index);
        frameCounter.textContent = `F ${String(Math.round(timeline.time() * fps)).padStart(3, "0")}`;
      },
      onRepeat() { shownIndex = -1; activateRow(0); }
    });

    rows.forEach((row, index) => {
      const at = index * timing.cycle;
      const revealAt = at + timing.revealAt;
      const { leadWidth, suffixWidth, fullWidth, anchorPercent, leadFit, phraseFit } = metrics[index];
      const actualGap = suffixWidth ? gap : 0;
      const anticipationShift = -suffixWidth * anticipationRatio;

      timeline.set(row.slot, { left: `${anchorPercent}%` }, at);
      timeline.set(row.suffix, { autoAlpha: 0, left: leadWidth + actualGap, x: -actualGap }, at);
      timeline.set(row.motion, {
        x: index === 0 ? -introDistance : 0,
        width: leadWidth,
        scale: index === 0 ? leadFit : leadFit * settleScale,
        transformOrigin: "50% 50%"
      }, at);
      timeline.to(row.motion, index === 0
        ? { x: 0, duration: timing.intro, ease: "power2.out" }
        : { scale: leadFit, duration: timing.intro, ease: "expo.out" }, at);
      timeline.to(row.motion, {
        x: anticipationShift,
        duration: timing.anticipation,
        ease: "power3.in"
      }, at + timing.intro + timing.hold);
      timeline.set(row.motion, {
        x: 0,
        width: fullWidth,
        scale: phraseFit * settleScale,
        transformOrigin: "50% 50%"
      }, revealAt);
      if (timing.reveal === 0) timeline.set(row.suffix, { autoAlpha: 1 }, revealAt);
      else timeline.to(row.suffix, { autoAlpha: 1, duration: timing.reveal, ease: "power1.out" }, revealAt);
      timeline.to(row.suffix, {
        x: 0,
        duration: Math.max(2 / fps, timing.reveal),
        ease: "power1.out"
      }, revealAt);
      timeline.to(row.motion, { scale: phraseFit, duration: timing.settle, ease: "power1.out" }, revealAt);
    });
    timeline.set({}, {}, rows.length * timing.cycle);
    timeline.timeScale(Number(inputs.speed.value) / 100);
    if (oldProgress && keepPaused) timeline.progress(oldProgress);
    if (wasPaused) timeline.pause();
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuild({ keepPaused: true }), 80);
  }

  Object.values(inputs).forEach((input) => {
    if (input === inputs.speed) {
      input.addEventListener("input", () => {
        updateOutputs();
        timeline?.timeScale(Number(input.value) / 100);
      });
    } else input.addEventListener("input", scheduleRebuild);
  });
  document.querySelectorAll("[data-color-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.colorTarget);
      if (!input) return;
      input.value = button.dataset.color;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
  $("#addPairButton").addEventListener("click", () => {
    if (phrasePairs.length >= 8) return;
    phrasePairs.push({ lead: "New", suffix: "continuation." });
    rowPositions.push(50);
    renderPairEditor();
    syncRowPositionControls();
    scheduleRebuild();
    $("#pairEditor .pair-editor-row:last-child .pair-lead-input")?.select();
  });

  $("#restartButton").addEventListener("click", () => timeline.restart());
  $("#pauseButton").addEventListener("click", (event) => {
    const pause = !timeline.paused();
    timeline.paused(pause);
    event.currentTarget.textContent = pause ? "播放" : "暂停";
    event.currentTarget.setAttribute("aria-pressed", String(pause));
  });
  function stepFrame(direction) {
    timeline.pause();
    $("#pauseButton").textContent = "播放";
    $("#pauseButton").setAttribute("aria-pressed", "true");
    const duration = timeline.duration();
    timeline.time((timeline.time() + direction / fps + duration) % duration, false);
  }
  $("#backButton").addEventListener("click", () => stepFrame(-1));
  $("#forwardButton").addEventListener("click", () => stepFrame(1));

  const ease = {
    intro: gsap.parseEase("power2.out"),
    laterIntro: gsap.parseEase("expo.out"),
    anticipation: gsap.parseEase("power3.in"),
    settle: gsap.parseEase("power1.out")
  };
  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") {
      return { width: Math.max(240, designFrame.clientWidth), height: Math.max(240, designFrame.clientHeight) };
    }
    if (preset === "custom") {
      return {
        width: Math.max(240, Math.min(3840, Number($("#exportWidth").value) || 1080)),
        height: Math.max(240, Math.min(3840, Number($("#exportHeight").value) || 1080))
      };
    }
    const [width, height] = preset.split("x").map(Number);
    return { width, height };
  }

  function makeExportCanvas() {
    const canvas = document.createElement("canvas");
    const { width, height } = exportDimensions();
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function renderCanvasFrame(canvas, simulationTime) {
    const context = canvas.getContext("2d");
    const pairs = parsePairs();
    const timing = timingValues();
    const duration = pairs.length * timing.cycle;
    const wrapped = ((simulationTime % duration) + duration) % duration;
    const pairIndex = Math.min(pairs.length - 1, Math.floor(wrapped / timing.cycle));
    const local = wrapped - pairIndex * timing.cycle;
    const [leadText, suffixText] = pairs[pairIndex];
    const anchorPercent = rowPositions[pairIndex] ?? 50;
    const anchorX = canvas.width * anchorPercent / 100;
    const preset = fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const previewShort = Math.max(1, Math.min(designFrame.clientWidth, designFrame.clientHeight));
    const scaleToOutput = Math.min(canvas.width, canvas.height) / previewShort;
    const leadFontSize = Number(inputs.leadFontSize.value) * scaleToOutput;
    const suffixFontSize = Number(inputs.suffixFontSize.value) * scaleToOutput;
    const leadWeight = Number(inputs.leadFontWeight.value);
    const suffixWeight = Number(inputs.suffixFontWeight.value);
    const gap = (suffixText ? Number(inputs.wordGap.value) : 0) * scaleToOutput;
    const introDistance = Number(inputs.introDistance.value) * scaleToOutput;
    const settleScale = Number(inputs.settleScale.value) / 100;
    const anticipationRatio = Number(inputs.anticipation.value) / 100;

    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = inputs.foreground.value;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.font = `${preset.style} ${leadWeight} ${leadFontSize}px "${preset.family}"`;
    const leadWidth = context.measureText(leadText).width;
    context.font = `${preset.style} ${suffixWeight} ${suffixFontSize}px "${preset.family}"`;
    const suffixWidth = context.measureText(suffixText).width;
    const fullWidth = leadWidth + gap + suffixWidth;
    const maxWidth = Math.max(canvas.width * .16, 2 * (Math.min(anchorX, canvas.width - anchorX) - canvas.width * .04));
    const leadFit = Math.min(1, maxWidth / Math.max(1, leadWidth * settleScale));
    const phraseFit = Math.min(1, maxWidth / Math.max(1, fullWidth * settleScale));
    const anticipationStart = timing.intro + timing.hold;
    let x = 0;
    let scale = leadFit;
    let suffixAlpha = 0;
    let suffixGap = 0;

    if (local < timing.revealAt) {
      const introProgress = ease[pairIndex === 0 ? "intro" : "laterIntro"](clamp01(local / timing.intro));
      if (pairIndex === 0) x = -introDistance * (1 - introProgress);
      else scale = leadFit * (settleScale + (1 - settleScale) * introProgress);
      if (local >= anticipationStart) {
        x = -suffixWidth * anticipationRatio * ease.anticipation(clamp01((local - anticipationStart) / timing.anticipation));
      }
    } else {
      const settleProgress = ease.settle(clamp01((local - timing.revealAt) / timing.settle));
      scale = phraseFit * (settleScale + (1 - settleScale) * settleProgress);
      x = 0;
      suffixAlpha = timing.reveal === 0 ? 1 : ease.settle(clamp01((local - timing.revealAt) / timing.reveal));
      suffixGap = gap * ease.settle(clamp01((local - timing.revealAt) / Math.max(2 / fps, timing.reveal)));
    }

    context.save();
    context.translate(anchorX + x * scale, canvas.height / 2);
    context.scale(scale, scale);
    context.globalAlpha = 1;
    const leadX = local < timing.revealAt ? -leadWidth / 2 : -fullWidth / 2;
    context.font = `${preset.style} ${leadWeight} ${leadFontSize}px "${preset.family}"`;
    context.fillText(leadText, leadX, 0);
    if (suffixText && suffixAlpha > 0) {
      context.globalAlpha = suffixAlpha;
      context.font = `${preset.style} ${suffixWeight} ${suffixFontSize}px "${preset.family}"`;
      context.fillText(suffixText, -fullWidth / 2 + leadWidth + suffixGap, 0);
    }
    context.restore();
    return { pairIndex, duration };
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }

  $("#exportPreset").addEventListener("change", (event) => {
    $("#customSize").hidden = event.currentTarget.value !== "custom";
  });

  $("#exportPng").addEventListener("click", () => {
    const canvas = makeExportCanvas();
    renderCanvasFrame(canvas, timeline?.time() || 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `continuation-${canvas.width}x${canvas.height}-frame-${String(Math.round((timeline?.time() || 0) * fps)).padStart(3, "0")}.png`);
      exportStatus.textContent = `PNG 已生成 · ${canvas.width} × ${canvas.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新页面后重试。";
      return;
    }
    const canvas = makeExportCanvas();
    const speed = Number(inputs.speed.value) / 100;
    const simulationDuration = parsePairs().length * timingValues().cycle;
    const outputDuration = simulationDuration / speed;
    const frameCount = Math.max(1, Math.ceil(outputDuration * fps));
    setExportBusy(true, `正在准备 GIF · 0 / ${frameCount} 帧`);
    try {
      const gif = new GIF({
        workers: 2, quality: 10, width: canvas.width, height: canvas.height,
        workerScript: "js/continuation-gif.worker.js"
      });
      for (let frame = 0; frame < frameCount; frame += 1) {
        renderCanvasFrame(canvas, frame / fps * speed);
        gif.addFrame(canvas, { copy: true, delay: 1000 / fps });
        if (frame % 10 === 0) exportStatus.textContent = `正在准备 GIF · ${frame + 1} / ${frameCount} 帧`;
      }
      gif.on("progress", (progress) => {
        exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`;
      });
      gif.on("finished", (blob) => {
        downloadBlob(blob, `continuation-${canvas.width}x${canvas.height}.gif`);
        setExportBusy(false, `GIF 已生成 · ${canvas.width} × ${canvas.height}`);
      });
      gif.on("abort", () => setExportBusy(false, "GIF 编码已取消。"));
      gif.render();
    } catch (error) {
      console.error(error);
      setExportBusy(false, "GIF 编码失败，请缩小尺寸或减少文字组数后重试。");
    }
  });

  function supportedVideoType() {
    const candidates = [
      "video/mp4;codecs=h264", "video/mp4;codecs=avc1.42E01E", "video/mp4",
      "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  async function exportWebMFrames(canvas, outputDuration, renderAt) {
    if (typeof window.WebMWriter !== "function") throw new Error("逐帧视频编码器未加载");
    const writer = new WebMWriter({ quality: .94, frameRate: fps });
    const frameCount = Math.max(1, Math.ceil(outputDuration * fps));
    for (let frame = 0; frame < frameCount; frame += 1) {
      renderAt(frame / fps);
      writer.addFrame(canvas);
      if (frame % 2 === 0) {
        exportStatus.textContent = `正在逐帧生成 ${canvas.width} × ${canvas.height} 高清视频 · ${Math.round((frame + 1) / frameCount * 100)}%`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    exportStatus.textContent = "正在封装视频文件…";
    const blob = await writer.complete();
    if (!blob || !blob.size) throw new Error("视频文件为空");
    downloadBlob(blob, `continuation-${canvas.width}x${canvas.height}-hd.webm`);
    return { extension: "WEBM", size: blob.size };
  }

  async function exportVideo(verticalHD = false) {
    const canvas = verticalHD ? document.createElement("canvas") : makeExportCanvas();
    if (verticalHD) { canvas.width = 1080; canvas.height = 1920; }
    const speed = Number(inputs.speed.value) / 100;
    const outputDuration = parsePairs().length * timingValues().cycle / speed;
    if (!canvas.captureStream || !window.MediaRecorder) {
      setExportBusy(true, `正在逐帧生成 ${canvas.width} × ${canvas.height} 高清视频 · 0%`);
      try {
        const result = await exportWebMFrames(canvas, outputDuration, (time) => renderCanvasFrame(canvas, time * speed));
        setExportBusy(false, `${result.extension} 视频已生成 · ${canvas.width} × ${canvas.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
      } catch (error) {
        console.error(error);
        setExportBusy(false, `视频导出失败：${error.message || "编码器异常"}`);
      }
      return;
    }
    const mimeType = supportedVideoType();
    const stream = canvas.captureStream(fps);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: verticalHD ? 20_000_000 : 12_000_000 } : undefined);
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      setExportBusy(true, `正在逐帧生成 ${canvas.width} × ${canvas.height} 高清视频 · 0%`);
      try {
        const result = await exportWebMFrames(canvas, outputDuration, (time) => renderCanvasFrame(canvas, time * speed));
        setExportBusy(false, `${result.extension} 视频已生成 · ${canvas.width} × ${canvas.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
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
        downloadBlob(blob, `continuation-${canvas.width}x${canvas.height}-hd.${extension}`);
        resolve({ extension: extension.toUpperCase(), size: blob.size });
      };
    });
    setExportBusy(true, `正在录制 ${canvas.width} × ${canvas.height} 高清视频 · 0%`);
    recorder.start(250);
    const startedAt = performance.now();
    try {
      await new Promise((resolve) => {
        function draw(now) {
          const elapsed = Math.min(outputDuration, (now - startedAt) / 1000);
          renderCanvasFrame(canvas, elapsed * speed);
          exportStatus.textContent = `正在录制 ${canvas.width} × ${canvas.height} 高清视频 · ${Math.min(100, Math.round(elapsed / outputDuration * 100))}%`;
          if (elapsed < outputDuration) requestAnimationFrame(draw);
          else resolve();
        }
        requestAnimationFrame(draw);
      });
      recorder.stop();
      const result = await finished;
      setExportBusy(false, `${result.extension} 视频已生成 · ${canvas.width} × ${canvas.height} · ${(result.size / 1024 / 1024).toFixed(1)} MB`);
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

  window.addEventListener("resize", scheduleRebuild);
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  renderPairEditor();
  syncRowPositionControls();
  document.fonts.ready.then(() => rebuild());
})();
