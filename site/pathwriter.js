(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    phrases: $("#phrasesInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    letterSpacing: $("#letterSpacing"), amplitude: $("#amplitude"), waves: $("#waves"),
    pathWidth: $("#pathWidth"), tilt: $("#tilt"), lineWidth: $("#lineWidth"), glow: $("#glow"),
    typeDuration: $("#typeDuration"), bendDuration: $("#bendDuration"), holdDuration: $("#holdDuration"),
    rideDuration: $("#rideDuration"), fadeDuration: $("#fadeDuration"), direction: $("#direction"),
    verticalPosition: $("#verticalPosition"), bendEase: $("#bendEase"), pathOpacity: $("#pathOpacity"),
    background: $("#backgroundColor"), foreground: $("#textColor"), accent: $("#accentColor")
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

  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let rafId = 0;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const easeInOut = (value) => value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);
  const easeIn = (value) => value * value * value;

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
    const preset = fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
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

  function drawPath(ctx, options, reveal, alpha, lineWidth, color) {
    if (reveal <= 0 || alpha <= 0) return;
    const start = -.16;
    const end = mix(start, 1.18, clamp(reveal));
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

    const rows = phrases();
    const span = timing();
    const cycleTime = ((rawTime % span.cycle) + span.cycle) % span.cycle;
    const phraseIndex = Math.min(rows.length - 1, Math.floor(cycleTime / span.phrase));
    const local = cycleTime - phraseIndex * span.phrase;
    const phrase = rows[phraseIndex];
    const scale = fontScale(displayWidth, displayHeight);
    const desiredSize = Number(inputs.fontSize.value) * scale;
    const spacing = Number(inputs.letterSpacing.value) * scale;
    const pathSpan = displayWidth * Number(inputs.pathWidth.value) / 100;
    const fit = measureGlyphs(ctx, phrase, desiredSize, Math.min(displayWidth * .72, pathSpan * .78), spacing);
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

    if (phase === "type") {
      const typed = progress * phrase.length;
      const visibleCount = Math.min(phrase.length, Math.ceil(typed));
      const visible = fit.glyphs.slice(0, visibleCount);
      const visibleWidth = visible.reduce((sum, glyph) => sum + glyph.width, 0) + Math.max(0, visible.length - 1) * spacing;
      let cursor = centerX - fit.total / 2;
      ctx.font = fontString(fit.size);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      visible.forEach((glyph, index) => {
        const isActive = index === visible.length - 1 && visibleCount < phrase.length + 1;
        ctx.save();
        ctx.globalAlpha = index === visible.length - 1 ? clamp((typed - Math.floor(typed)) * 1.8, .35, 1) : 1;
        ctx.fillStyle = isActive ? accent : foreground;
        if (isActive) { ctx.shadowColor = accent; ctx.shadowBlur = 5 + 18 * glowAmount; }
        ctx.fillText(glyph.character, cursor, centerY);
        ctx.restore();
        cursor += glyph.width + spacing;
      });
      const caretX = centerX - fit.total / 2 + visibleWidth + Math.max(3, fit.size * .06);
      const blink = .45 + .55 * Math.abs(Math.sin(rawTime * Math.PI * 3.5));
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.2, fit.size * .022);
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8 + glowAmount * 18;
      ctx.beginPath();
      ctx.moveTo(caretX, centerY - fit.size * .55);
      ctx.lineTo(caretX, centerY + fit.size * .55);
      ctx.stroke();
      ctx.restore();
    } else {
      const elastic = Number(inputs.bendEase.value) / 100;
      const bendProgress = phase === "bend" ? clamp(easeOut(progress) + Math.sin(progress * Math.PI) * .06 * elastic) : 1;
      const rideProgress = phase === "ride" ? easeInOut(progress) : phase === "fade" ? 1 + easeIn(progress) * .28 : 0;
      const fadeAlpha = phase === "fade" ? 1 - easeIn(progress) : 1;
      const rideOffset = rideProgress * .82 * direction;
      const pathReveal = phase === "bend" ? easeOut(progress) : 1;
      drawPath(ctx, pathOptions, pathReveal, pathAlpha * fadeAlpha, lineWidth, accent);
      fit.glyphs.forEach((glyph, index) => {
        const normalized = .5 + glyph.center / pathSpan + rideOffset;
        const point = pathPoint(normalized, pathOptions);
        const straightX = centerX + glyph.center;
        const x = mix(straightX, point.x, bendProgress);
        const y = mix(centerY, point.y, bendProgress);
        const angle = point.tangent * bendProgress;
        const activeIndex = Math.min(fit.glyphs.length - 1, Math.floor(pathReveal * fit.glyphs.length));
        const isActive = phase === "bend" && index === activeIndex;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.globalAlpha = fadeAlpha * (phase === "bend" && index > activeIndex ? .12 : 1);
        ctx.font = fontString(fit.size);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isActive ? accent : foreground;
        if (isActive) { ctx.shadowColor = accent; ctx.shadowBlur = 5 + glowAmount * 22; }
        ctx.fillText(glyph.character, 0, 0);
        ctx.restore();
      });
      if (phase === "bend") {
        const tip = pathPoint(mix(-.16, 1.18, pathReveal), pathOptions);
        glowText(ctx, "·", tip.x, tip.y, Math.max(12, fit.size * .42), accent, glowAmount);
      }
    }

    const playhead = span.cycle ? cycleTime / span.cycle * 100 : 0;
    document.documentElement.style.setProperty("--timeline-playhead", `${playhead}%`);
    if (target === canvas) frameCounter.textContent = `F ${String(Math.floor(rawTime * fps) % 10000).padStart(4, "0")}`;
  }

  function resizeCanvas() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    renderFrame(canvas, currentTime(), window.innerWidth, window.innerHeight, ratio);
  }

  function previewLoop() {
    renderFrame(canvas, currentTime(), window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1));
    rafId = requestAnimationFrame(previewLoop);
  }

  function updateOutputs() {
    const outputMap = {
      fontSize: (value) => value,
      letterSpacing: (value) => value,
      amplitude: (value) => value,
      waves: (value) => Number(value).toFixed(2),
      pathWidth: (value) => `${value}%`,
      tilt: (value) => `${value}°`,
      lineWidth: (value) => Number(value).toFixed(1),
      glow: (value) => `${value}%`,
      typeDuration: (value) => `${(value / 1000).toFixed(2)}秒`,
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
    const phases = [span.type, span.bend, span.hold, span.ride, span.fade];
    document.querySelectorAll(".timeline-strip span").forEach((bar, index) => { bar.style.flexGrow = phases[index]; });
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", updateOutputs);
    input.addEventListener("change", updateOutputs);
  });
  inputs.phrases.addEventListener("input", () => setTime(0));
  inputs.font.addEventListener("change", () => setTime(0));

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

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  updateOutputs();
  document.fonts.ready.finally(previewLoop);
})();
