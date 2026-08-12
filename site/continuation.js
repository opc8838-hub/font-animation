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
    pairs: $("#pairsInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    anticipation: $("#anticipation"), wordGap: $("#wordGap"), settleScale: $("#settleScale"),
    introDistance: $("#introDistance"), speed: $("#speed"), background: $("#backgroundColor"),
    foreground: $("#textColor"), introDuration: $("#introDuration"), rootHold: $("#rootHold"),
    anticipationDuration: $("#anticipationDuration"), suffixRevealDuration: $("#suffixRevealDuration"),
    settleDuration: $("#settleDuration"), phraseHold: $("#phraseHold")
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

  let timeline;
  let activeIndex = 0;
  let rebuildTimer;
  let rebuildSerial = 0;
  let currentCycle = 29 / fps;
  let rowPositions = [];

  if (!window.gsap) {
    phraseStage.innerHTML = '<p class="load-error">GSAP 加载失败，请刷新页面。</p>';
    return;
  }
  gsap.ticker.fps(fps);

  function parsePairs() {
    const pairs = inputs.pairs.value.split(/\r?\n/).map((line) => {
      const divider = line.indexOf("|");
      return divider < 0
        ? [line.trim(), ""]
        : [line.slice(0, divider).trim(), line.slice(divider + 1).trim()];
    }).filter(([lead]) => lead);
    return pairs.length ? pairs.slice(0, 8) : [["One", "subscription."]];
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
      fontSizeOut: inputs.fontSize.value,
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
    document.documentElement.style.setProperty("--phrase-weight", String(preset.weight));
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
    document.documentElement.style.setProperty("--phrase-size", `${inputs.fontSize.value}px`);
    const fontPreset = applyFontPreset();
    updateOutputs();
    await Promise.race([
      document.fonts.load(`${fontPreset.style} ${fontPreset.weight} ${inputs.fontSize.value}px "${fontPreset.family}"`),
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
    if (input === inputs.pairs) return;
    if (input === inputs.speed) {
      input.addEventListener("input", () => {
        updateOutputs();
        timeline?.timeScale(Number(input.value) / 100);
      });
    } else input.addEventListener("input", scheduleRebuild);
  });
  inputs.pairs.addEventListener("input", () => {
    syncRowPositionControls();
    scheduleRebuild();
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
    const fontSize = Number(inputs.fontSize.value) * scaleToOutput;
    const gap = (suffixText ? Number(inputs.wordGap.value) : 0) * scaleToOutput;
    const introDistance = Number(inputs.introDistance.value) * scaleToOutput;
    const settleScale = Number(inputs.settleScale.value) / 100;
    const anticipationRatio = Number(inputs.anticipation.value) / 100;

    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = inputs.foreground.value;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.font = `${preset.style} ${preset.weight} ${fontSize}px "${preset.family}"`;
    const leadWidth = context.measureText(leadText).width;
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
    context.fillText(leadText, leadX, 0);
    if (suffixText && suffixAlpha > 0) {
      context.globalAlpha = suffixAlpha;
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

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo")];
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

  $("#exportVideo").addEventListener("click", async () => {
    const canvas = makeExportCanvas();
    if (!canvas.captureStream || !window.MediaRecorder) {
      exportStatus.textContent = "当前浏览器不支持视频录制，请使用最新版 Chrome / Edge。";
      return;
    }
    const candidates = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        downloadBlob(new Blob(chunks, { type }), `continuation-${canvas.width}x${canvas.height}.${extension}`);
        resolve(extension.toUpperCase());
      };
    });
    const speed = Number(inputs.speed.value) / 100;
    const outputDuration = parsePairs().length * timingValues().cycle / speed;
    setExportBusy(true, `正在录制视频 · 0%`);
    recorder.start();
    const startedAt = performance.now();
    await new Promise((resolve) => {
      function draw(now) {
        const elapsed = (now - startedAt) / 1000;
        renderCanvasFrame(canvas, elapsed * speed);
        exportStatus.textContent = `正在录制视频 · ${Math.min(100, Math.round(elapsed / outputDuration * 100))}%`;
        if (elapsed < outputDuration) requestAnimationFrame(draw);
        else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    const extension = await finished;
    stream.getTracks().forEach((track) => track.stop());
    setExportBusy(false, `${extension} 视频已生成 · ${canvas.width} × ${canvas.height}`);
  });

  window.addEventListener("resize", scheduleRebuild);
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  syncRowPositionControls();
  document.fonts.ready.then(() => rebuild());
})();
