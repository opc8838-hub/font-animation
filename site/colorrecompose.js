(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    title: $("#titleText"), source: $("#sourceText"), font: $("#fontFamily"), fontWeight: $("#fontWeight"),
    fontSize: $("#fontSize"), tracking: $("#tracking"), intro: $("#introDuration"),
    recompose: $("#recomposeDuration"), fragmentRate: $("#fragmentRate"), hold: $("#holdDuration"),
    fragmentStrength: $("#fragmentStrength"), fragmentJitter: $("#fragmentJitter"), fragmentWidth: $("#fragmentWidth"),
    baseTextOpacity: $("#baseTextOpacity"),
    background: $("#backgroundColor"), foreground: $("#textColor"),
    punctuationEnabled: $("#punctuationEnabled"), punctuation: $("#punctuationColor")
  };
  const paletteInputs = [...document.querySelectorAll(".palette-color")];
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
    "fs-satoshi": { family: "Satoshi", weight: 500, style: "normal" },
    "fs-general-sans": { family: "General Sans", weight: 500, style: "normal" },
    "fs-clash-display": { family: "Clash Display", weight: 500, style: "normal" },
    "fs-cabinet": { family: "Cabinet Grotesk", weight: 700, style: "normal" },
    "cn-noto-regular": { family: "Continuation SC", weight: 400, style: "normal" },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900, style: "normal" },
    "ib-archivo": { family: "CRArchivo", weight: 900, style: "normal" },
    "ib-roboto-condensed": { family: "CRRobotoCondensed", weight: 700, style: "normal" },
    "ib-work": { family: "CRWork", weight: 400, style: "normal" },
    "ib-lora": { family: "CRLora", weight: 400, style: "normal" },
    "ib-fenix": { family: "CRFenix", weight: 400, style: "normal" },
    "ib-vollkorn": { family: "CRVollkorn", weight: 700, style: "italic" },
    "ib-cairo": { family: "CRCairo", weight: 700, style: "normal" },
    "ib-aguafina": { family: "CRAguafina", weight: 400, style: "normal" },
    "ib-manrope": { family: "CRManrope", weight: 500, style: "normal" },
    "ib-spartan": { family: "CRSpartan", weight: 500, style: "normal" },
    "ib-cinzel": { family: "CRCinzel", weight: 500, style: "normal" },
    "ib-instrument": { family: "CRInstrument", weight: 400, style: "normal" },
    "ib-bebas": { family: "CRBebas", weight: 400, style: "normal" },
    "ib-poppins": { family: "CRPoppins", weight: 400, style: "normal" },
    "ib-rajdhani": { family: "CRRajdhani", weight: 700, style: "normal" },
    "ib-teko": { family: "CRTeko", weight: 500, style: "normal" },
    "ib-khand": { family: "CRKhand", weight: 400, style: "normal" },
    "ib-fraunces": { family: "CRFraunces", weight: 500, style: "normal" },
    "ib-sc-thin": { family: "CRSCThin", weight: 200, style: "normal" },
    "ib-jp-thin": { family: "CRJPThin", weight: 200, style: "normal" },
    "ib-jp-black": { family: "CRJPBlack", weight: 900, style: "normal" },
    "ib-kr-black": { family: "CRKRBlack", weight: 900, style: "normal" }
  };

  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;
  const smoother = (value) => {
    const x = clamp01(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const rangeProgress = (value, from, to) => clamp01((value - from) / Math.max(.0001, to - from));
  const seeded = (seed) => {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);
  const isPunctuation = (glyph) => {
    try { return /\p{P}/u.test(glyph); }
    catch (_) { return /[!-/:-@[-`{-~，。！？；：、（）【】《》〈〉「」『』“”‘’—…·]/.test(glyph); }
  };
  const titleColorFor = (glyph) => inputs.punctuationEnabled.checked && isPunctuation(glyph)
    ? inputs.punctuation.value
    : inputs.foreground.value;
  function colorLuminance(hex) {
    const value = hex.replace("#", "");
    const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
      .map((channel) => channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055, 2.4));
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  }
  function fragmentBlendMode() {
    const luminance = colorLuminance(inputs.background.value);
    if (luminance >= .62) return { mode: "multiply", alpha: 1, label: "light-background" };
    if (luminance <= .18) return { mode: "screen", alpha: 1, label: "dark-background" };
    return { mode: "source-over", alpha: 1, label: "mid-background" };
  }

  function timing() {
    const intro = Number(inputs.intro.value) / 1000;
    const recompose = Number(inputs.recompose.value) / 1000;
    const hold = Number(inputs.hold.value) / 1000;
    return { intro, recompose, hold, recomposeEnd: intro + recompose, cycle: intro + recompose + hold };
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, w, h);

    const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["snap-inter-black"];
    const scale = h / 900;
    const fontPx = Math.max(12, Number(inputs.fontSize.value) * scale);
    const tracking = Number(inputs.tracking.value) * scale;
    const title = inputs.title.value.trim() || "MAKE IT VIVID";
    const glyphs = graphemes(title);
    const palette = paletteInputs.map((input) => input.value);
    const sourceLines = inputs.source.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const sourceGlyphs = graphemes(sourceLines.join("")).filter((glyph) => !/\s/.test(glyph));
    const currentTiming = timing();
    const localTime = mod(time, currentTiming.cycle);
    const recomposeElapsed = Math.max(0, localTime - currentTiming.intro);
    const safeWidth = w * .84;

    const selectedWeight = Number(inputs.fontWeight.value) || preset.weight;
    context.font = `${preset.style} ${selectedWeight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;
    const widths = glyphs.map((glyph) => context.measureText(glyph).width);
    const totalWidth = widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, glyphs.length - 1);
    const fit = Math.min(1, safeWidth / Math.max(1, totalWidth));
    const strength = Number(inputs.fragmentStrength.value) / 100;
    const progress = rangeProgress(recomposeElapsed, 0, currentTiming.recompose);
    const attack = smoother(rangeProgress(progress, 0, .13));
    const resolve = smoother(rangeProgress(progress, .48, 1));
    const fragmentActivity = localTime < currentTiming.intro || localTime >= currentTiming.recomposeEnd ? 0 : attack * (1 - resolve);
    const chaos = fragmentActivity * strength;
    const jitter = Number(inputs.fragmentJitter.value) * scale * chaos;
    const fragmentWidthFactor = Number(inputs.fragmentWidth.value) / 100;
    const fragmentSpread = lerp(1, fragmentWidthFactor, fragmentActivity);
    const baseTextOpacity = Number(inputs.baseTextOpacity.value) / 100;
    const baseTextAlpha = lerp(1, baseTextOpacity, fragmentActivity);
    const bucket = Math.floor(localTime * Number(inputs.fragmentRate.value));
    const blend = fragmentBlendMode();

    context.save();
    context.translate(w / 2, h / 2);
    context.scale(fit, fit);
    context.save();
    context.globalAlpha = baseTextAlpha;
    let baseCursor = -totalWidth / 2;
    glyphs.forEach((glyph, index) => {
      context.fillStyle = titleColorFor(glyph);
      context.fillText(glyph, baseCursor, 0);
      baseCursor += widths[index] + tracking;
    });
    context.restore();

    let cursor = -totalWidth / 2;
    let lockedCount = 0;
    glyphs.forEach((glyph, index) => {
      const width = widths[index];
      const punctuation = isPunctuation(glyph);
      const locked = chaos < .015 || /\s/.test(glyph) || punctuation || seeded(index * 37 + bucket * 3.1) < resolve;
      if (locked) {
        lockedCount += /\s/.test(glyph) ? 0 : 1;
        context.fillStyle = titleColorFor(glyph);
        context.fillText(glyph, cursor, 0);
      } else {
        const sourceGlyph = sourceGlyphs[Math.floor(seeded(index * 53 + bucket * 1.7) * Math.max(1, sourceGlyphs.length))] || glyph;
        const color = palette[Math.floor(seeded(index * 19 + bucket * 2.3) * palette.length) % palette.length];
        context.save();
        context.globalCompositeOperation = blend.mode;
        context.globalAlpha = (.78 + chaos * .22) * blend.alpha;
        context.fillStyle = color;
        const fragmentCenterX = (cursor + width / 2) * fragmentSpread;
        context.translate(fragmentCenterX + (seeded(index * 23 + bucket) - .5) * jitter, (seeded(index * 31 - bucket) - .5) * jitter);
        context.scale(lerp(.78, 1.22, seeded(index * 41 + bucket)), 1);
        const sourceWidth = context.measureText(sourceGlyph).width;
        context.fillText(sourceGlyph, -sourceWidth / 2, 0);
        if (chaos > .3) {
          context.globalAlpha = .18 * chaos;
          context.fillRect(-width * .42, -fontPx * .48, width * .84, Math.max(1, fontPx * .06));
          context.fillRect(-width * .3, fontPx * .22, width * .6, Math.max(1, fontPx * .035));
        }
        context.restore();
      }
      cursor += width + tracking;
    });
    context.restore();

    if (target === canvas) {
      canvas.dataset.motionPhase = localTime < currentTiming.intro ? "mono-title" : localTime < currentTiming.recomposeEnd ? "fragment-recompose" : "final-lock";
      canvas.dataset.chaos = chaos.toFixed(4);
      canvas.dataset.lockedGlyphs = String(lockedCount);
      canvas.dataset.punctuationCount = String(glyphs.filter(isPunctuation).length);
      canvas.dataset.punctuationIndependent = String(inputs.punctuationEnabled.checked);
      canvas.dataset.punctuationColor = inputs.punctuationEnabled.checked ? inputs.punctuation.value : inputs.foreground.value;
      canvas.dataset.fontFamily = preset.family;
      canvas.dataset.fontWeight = String(selectedWeight);
      canvas.dataset.fragmentBlend = blend.label;
      canvas.dataset.fragmentWidth = inputs.fragmentWidth.value;
      canvas.dataset.fragmentSpread = fragmentSpread.toFixed(4);
      canvas.dataset.baseTextOpacity = inputs.baseTextOpacity.value;
      canvas.dataset.baseTextAlpha = baseTextAlpha.toFixed(4);
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
  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    frameCounter.textContent = `F ${String(Math.round(mod(time, timing().cycle) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function updateOutputs() {
    const currentTiming = timing();
    const formatSeconds = (seconds) => `${seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1)}秒`;
    const values = {
      fontSizeOut: inputs.fontSize.value,
      trackingOut: `${inputs.tracking.value}px`,
      introDurationOut: formatSeconds(currentTiming.intro),
      recomposeDurationOut: formatSeconds(currentTiming.recompose),
      fragmentRateOut: `${inputs.fragmentRate.value} FPS`,
      holdDurationOut: formatSeconds(currentTiming.hold),
      fragmentStrengthOut: `${inputs.fragmentStrength.value}%`,
      fragmentJitterOut: `${inputs.fragmentJitter.value}px`,
      fragmentWidthOut: `${inputs.fragmentWidth.value}%`,
      baseTextOpacityOut: `${inputs.baseTextOpacity.value}%`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  paletteInputs.forEach((input) => input.addEventListener("input", updateOutputs));
  [inputs.intro, inputs.recompose, inputs.hold].forEach((input) => input.addEventListener("input", () => setTime(0)));
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
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `color-recompose-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas();
    const gifFps = 15;
    const duration = timing().cycle;
    const frameTotal = Math.ceil(duration * gifFps);
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < frameTotal; frame += 1) {
      renderFrame(output, frame / gifFps, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
    }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `color-recompose-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成"); });
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
    downloadBlob(blob, `color-recompose-${output.width}x${output.height}-hd.webm`);
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
        downloadBlob(blob, `color-recompose-${output.width}x${output.height}-hd.${extension}`);
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

  document.fonts.ready.then(() => setTime(0));
  updateOutputs();
  previewLoop();
})();
