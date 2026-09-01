(() => {
  "use strict";

  // Independent Canvas adaptation of the observable per-glyph diff model used by
  // LTMorphingLabel (MIT, lexrus/LTMorphingLabel). No Swift/UIKit source is embedded.
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "me-motion-glyphmorph-v1";
  const VERSION = 1;
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const split = (value) => segmenter ? Array.from(segmenter.segment(String(value)), ({ segment }) => segment) : Array.from(String(value));
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const easeOutQuint = (value) => 1 - Math.pow(1 - clamp(value), 5);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `gm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const DEFAULT_SCHEME = Object.freeze({
    version: VERSION,
    canvas: { width: 1080, height: 1080, preset: "1080x1080" },
    typography: { fontFamily: "stg:inter", fontSize: 150, tracking: 0, positionX: 0, positionY: 0, alignment: "center", textColor: "#111111", backgroundColor: "#ffffff" },
    motion: { morphDuration: 600, characterDelay: 26, scaleFloor: 0.02, speed: 1, loop: true },
    rows: [
      ["month-01", "January", 100], ["month-02", "February", 100], ["month-03", "March", 100],
      ["month-04", "April", 100], ["month-05", "May", 100], ["month-06", "June", 100],
      ["month-07", "July", 100], ["month-08", "August", 100], ["month-09", "September", 100],
      ["month-10", "October", 100], ["month-11", "November", 100], ["month-12", "December", 100]
    ].map(([id, text, hold]) => ({ id, text, hold }))
  });

  const state = {
    scheme: clone(DEFAULT_SCHEME),
    playing: true,
    elapsedMs: 0,
    lastFrame: performance.now(),
    exportBusy: false,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  const canvas = $("glyphMorphCanvas");
  const frame = $("compositionFrame");
  const context = canvas.getContext("2d");
  const controlIds = ["fontFamily", "fontSize", "tracking", "positionX", "positionY", "textColor", "backgroundColor", "morphDuration", "characterDelay", "scaleFloor", "speed", "loop"];
  const controls = Object.fromEntries(controlIds.map((id) => [id, $(id)]));

  function fontPreset() {
    return window.STGFontLibrary?.preset(state.scheme.typography.fontFamily) || { family: "STG Inter", weight: 500, style: "normal" };
  }

  function timelineSegments() {
    const rows = state.scheme.rows.length > 1 ? state.scheme.rows : [{ id: "blank-a", text: "", hold: 100 }, { id: "blank-b", text: "", hold: 100 }];
    return rows.map((row, index) => ({
      from: row,
      to: rows[(index + 1) % rows.length],
      morphMs: state.scheme.motion.morphDuration,
      holdMs: Math.max(0, Number(rows[(index + 1) % rows.length].hold) || 0),
      durationMs: state.scheme.motion.morphDuration + Math.max(0, Number(rows[(index + 1) % rows.length].hold) || 0)
    }));
  }

  function cycleDurationMs() {
    return timelineSegments().reduce((sum, segment) => sum + segment.durationMs, 0) / Math.max(0.01, state.scheme.motion.speed);
  }

  function resolveTimeline(timeMs) {
    const segments = timelineSegments();
    const speed = Math.max(0.01, state.scheme.motion.speed);
    const rawCycle = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
    const scaled = Math.max(0, timeMs) * speed;
    const local = state.scheme.motion.loop ? scaled % Math.max(1, rawCycle) : Math.min(scaled, Math.max(0, rawCycle - 0.001));
    let cursor = 0;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (local < cursor + segment.durationMs || index === segments.length - 1) {
        const segmentTime = local - cursor;
        return { segment, index, progress: clamp(segmentTime / Math.max(1, segment.morphMs)), inHold: segmentTime >= segment.morphMs };
      }
      cursor += segment.durationMs;
    }
    return { segment: segments[0], index: 0, progress: 0, inHold: false };
  }

  function glyphLayout(ctx, text, width, height) {
    const glyphs = split(text);
    const typography = state.scheme.typography;
    const unit = Math.min(width, height) / 1080;
    const baseSize = Math.max(1, typography.fontSize * unit);
    const tracking = typography.tracking * unit;
    const preset = fontPreset();
    const fallback = window.STGFontLibrary?.fallbackStack || "sans-serif";
    const family = `"${preset.family}",${fallback}`;
    const style = preset.style || "normal";
    const weight = preset.weight || 500;
    const measure = (size) => {
      ctx.font = `${style} ${weight} ${size}px ${family}`;
      const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
      return { widths, total: widths.reduce((sum, item) => sum + item, 0) + Math.max(0, glyphs.length - 1) * tracking * (size / baseSize) };
    };
    let fontSize = baseSize;
    let metrics = measure(fontSize);
    const maxWidth = width * 0.88;
    if (metrics.total > maxWidth) {
      fontSize *= maxWidth / metrics.total;
      metrics = measure(fontSize);
    }
    const appliedTracking = tracking * (fontSize / baseSize);
    const anchor = width * (0.5 + typography.positionX / 100);
    const baseline = height * (0.5 + typography.positionY / 100);
    let start = anchor - metrics.total / 2;
    if (typography.alignment === "left") start = width * 0.08 + typography.positionX / 100 * width;
    if (typography.alignment === "right") start = width * 0.92 + typography.positionX / 100 * width - metrics.total;
    let cursor = start;
    const slots = glyphs.map((glyph, index) => {
      const glyphWidth = metrics.widths[index];
      const slot = { glyph, x: cursor + glyphWidth / 2, y: baseline, width: glyphWidth };
      cursor += glyphWidth + appliedTracking;
      return slot;
    });
    return { glyphs, slots, fontSize, family, style, weight };
  }

  function matchGlyphs(from, to) {
    const claimed = new Set();
    const matches = new Map();
    from.forEach((glyph, oldIndex) => {
      const newIndex = to.findIndex((candidate, index) => candidate === glyph && !claimed.has(index));
      if (newIndex >= 0) {
        claimed.add(newIndex);
        matches.set(oldIndex, newIndex);
      }
    });
    return { matches, claimed };
  }

  function drawGlyph(ctx, slot, layout, scale, alpha) {
    if (!slot.glyph.trim() || alpha <= 0 || scale <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = state.scheme.typography.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${layout.style} ${layout.weight} ${layout.fontSize}px ${layout.family}`;
    ctx.translate(slot.x, slot.y);
    ctx.scale(scale, scale);
    ctx.fillText(slot.glyph, 0, 0);
    ctx.restore();
  }

  function renderFrame(targetCanvas, timeSeconds, width = targetCanvas.width, height = targetCanvas.height) {
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = state.scheme.typography.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    const timeline = resolveTimeline(timeSeconds * 1000);
    const fromLayout = glyphLayout(ctx, timeline.segment.from.text, width, height);
    const toLayout = glyphLayout(ctx, timeline.segment.to.text, width, height);
    if (timeline.inHold) {
      toLayout.slots.forEach((slot) => drawGlyph(ctx, slot, toLayout, 1, 1));
      ctx.restore();
      return timeline;
    }
    const { matches, claimed } = matchGlyphs(fromLayout.glyphs, toLayout.glyphs);
    const delayRatio = state.scheme.motion.characterDelay / Math.max(1, state.scheme.motion.morphDuration);
    const floor = state.scheme.motion.scaleFloor;
    fromLayout.slots.forEach((oldSlot, oldIndex) => {
      const glyphProgress = clamp(timeline.progress + delayRatio * oldIndex);
      const eased = easeOutQuint(glyphProgress);
      const newIndex = matches.get(oldIndex);
      if (newIndex == null) {
        drawGlyph(ctx, oldSlot, fromLayout, Math.max(floor, 1 - eased), 1 - eased);
        return;
      }
      const target = toLayout.slots[newIndex];
      drawGlyph(ctx, { glyph: oldSlot.glyph, x: oldSlot.x + (target.x - oldSlot.x) * eased, y: oldSlot.y }, fromLayout, 1, 1);
    });
    toLayout.slots.forEach((newSlot, newIndex) => {
      if (claimed.has(newIndex)) return;
      const glyphProgress = clamp(timeline.progress - delayRatio * newIndex);
      const eased = easeOutQuint(glyphProgress);
      drawGlyph(ctx, newSlot, toLayout, floor + (1 - floor) * eased, eased);
    });
    ctx.restore();
    return timeline;
  }

  function resizePreview() {
    const rect = frame.getBoundingClientRect();
    const ratio = state.scheme.canvas.width / state.scheme.canvas.height;
    frame.style.setProperty("--gm-aspect", String(ratio));
    const maxPixels = 1500;
    const scale = Math.min(window.devicePixelRatio || 1, 2, maxPixels / Math.max(rect.width, rect.height));
    canvas.width = Math.max(2, Math.round(rect.width * scale));
    canvas.height = Math.max(2, Math.round(rect.height * scale));
    renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
  }

  function renderRows() {
    $("sequenceRows").innerHTML = state.scheme.rows.map((row, index) => `
      <div class="gm-row" data-row-id="${row.id}">
        <span class="gm-row-index">${String(index + 1).padStart(2, "0")}</span>
        <input data-key="text" value="${escapeHtml(row.text)}" aria-label="第 ${index + 1} 行文字">
        <input data-key="hold" type="number" min="0" max="5000" step="10" value="${row.hold}" aria-label="第 ${index + 1} 行停留毫秒">
        <button data-action="up" type="button" aria-label="上移">↑</button>
        <button data-action="down" type="button" aria-label="下移">↓</button>
        <button data-action="delete" type="button" aria-label="删除">×</button>
      </div>`).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }

  function renderTimeline() {
    const segments = timelineSegments();
    $("timeline").innerHTML = segments.map(({ from, to, durationMs }) => `<div class="gm-timeline-block me-choreo-block" role="listitem"><strong>${escapeHtml(from.text || "空白")} → ${escapeHtml(to.text || "空白")}</strong><small>${(durationMs / 1000).toFixed(2)}s</small></div>`).join("");
    const total = cycleDurationMs();
    $("scrubber").max = String(Math.max(0.001, total));
    $("timeTotal").textContent = `${(total / 1000).toFixed(2)}s`;
  }

  function updateOutputs() {
    const formats = { fontSize: (v) => `${v}px`, tracking: (v) => `${v}px`, positionX: (v) => `${v}%`, positionY: (v) => `${v}%`, morphDuration: (v) => `${v}ms`, characterDelay: (v) => `${v}ms`, scaleFloor: (v) => `${Math.round(v * 100)}%`, speed: (v) => `${Number(v).toFixed(2)}×` };
    Object.entries(formats).forEach(([id, format]) => {
      const output = document.querySelector(`output[for="${id}"]`);
      if (output) output.value = format(Number(controls[id].value));
    });
  }

  function syncControlsFromState() {
    const { canvas: canvasState, typography, motion } = state.scheme;
    $("canvasPreset").value = canvasState.preset;
    $("canvasWidth").value = canvasState.width;
    $("canvasHeight").value = canvasState.height;
    document.querySelector(".gm-custom-size").hidden = canvasState.preset !== "custom";
    Object.entries(typography).forEach(([key, value]) => { if (controls[key]) controls[key].value = value; });
    Object.entries(motion).forEach(([key, value]) => { if (!controls[key]) return; if (controls[key].type === "checkbox") controls[key].checked = Boolean(value); else controls[key].value = value; });
    document.querySelector(`input[name="alignment"][value="${typography.alignment}"]`)?.click();
    window.STGFontLibrary?.enhanceSelect($("fontFamily"));
    $("fontFamily").value = typography.fontFamily;
    renderRows();
    renderTimeline();
    updateOutputs();
    resizePreview();
  }

  function collectControls() {
    const typographyNumbers = ["fontSize", "tracking", "positionX", "positionY"];
    const motionNumbers = ["morphDuration", "characterDelay", "scaleFloor", "speed"];
    typographyNumbers.forEach((id) => { state.scheme.typography[id] = Number(controls[id].value); });
    ["fontFamily", "textColor", "backgroundColor"].forEach((id) => { state.scheme.typography[id] = controls[id].value; });
    state.scheme.typography.alignment = document.querySelector('input[name="alignment"]:checked')?.value || "center";
    motionNumbers.forEach((id) => { state.scheme.motion[id] = Number(controls[id].value); });
    state.scheme.motion.loop = controls.loop.checked;
  }

  function autoSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scheme));
  }

  function changed({ restart = false } = {}) {
    collectControls();
    if (restart) state.elapsedMs = 0;
    renderTimeline();
    updateOutputs();
    autoSave();
    resizePreview();
  }

  function applyScheme(scheme, status = "") {
    if (!scheme || !Array.isArray(scheme.rows)) return;
    state.scheme = {
      version: VERSION,
      canvas: { ...clone(DEFAULT_SCHEME.canvas), ...(scheme.canvas || {}) },
      typography: { ...clone(DEFAULT_SCHEME.typography), ...(scheme.typography || {}) },
      motion: { ...clone(DEFAULT_SCHEME.motion), ...(scheme.motion || {}) },
      rows: scheme.rows.map((row) => ({ id: row.id || uid(), text: String(row.text ?? ""), hold: clamp(Number(row.hold) || 0, 0, 5000) }))
    };
    if (state.scheme.rows.length < 2) state.scheme.rows.push({ id: uid(), text: "", hold: 100 });
    state.elapsedMs = 0;
    syncControlsFromState();
    autoSave();
    if (status) $("exportStatus").textContent = status;
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCanvas() {
    const output = document.createElement("canvas");
    output.width = Math.max(2, Math.round(state.scheme.canvas.width));
    output.height = Math.max(2, Math.round(state.scheme.canvas.height));
    return output;
  }

  function exportSeconds() {
    return $("exportDuration").value === "cycle" ? cycleDurationMs() / 1000 : Number($("exportDuration").value);
  }

  function setBusy(value, message) {
    state.exportBusy = value;
    document.querySelectorAll("#exportPng,#exportGif,#exportMp4").forEach((button) => { button.disabled = value; });
    $("exportStatus").textContent = message;
  }

  let h264Loader;
  function loadH264Encoder() {
    if (window.HME?.createH264MP4Encoder) return Promise.resolve();
    if (!h264Loader) h264Loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/h264-mp4-encoder.web.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("MP4 编码器加载失败"));
      document.head.append(script);
    });
    return h264Loader;
  }

  $("canvasPreset").addEventListener("change", () => {
    const preset = $("canvasPreset").value;
    state.scheme.canvas.preset = preset;
    document.querySelector(".gm-custom-size").hidden = preset !== "custom";
    if (preset !== "custom") {
      const [width, height] = preset.split("x").map(Number);
      state.scheme.canvas.width = width;
      state.scheme.canvas.height = height;
      $("canvasWidth").value = width;
      $("canvasHeight").value = height;
    }
    changed({ restart: false });
  });
  ["canvasWidth", "canvasHeight"].forEach((id) => $(id).addEventListener("change", () => {
    state.scheme.canvas[id === "canvasWidth" ? "width" : "height"] = clamp(Number($(id).value) || 1080, 320, 3840);
    changed();
  }));
  controlIds.forEach((id) => controls[id].addEventListener("input", () => changed({ restart: id === "morphDuration" || id === "characterDelay" || id === "speed" })));
  document.querySelectorAll('input[name="alignment"]').forEach((input) => input.addEventListener("change", () => changed()));

  $("sequenceRows").addEventListener("input", (event) => {
    const rowElement = event.target.closest(".gm-row");
    const row = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!row) return;
    row[event.target.dataset.key] = event.target.dataset.key === "hold" ? clamp(Number(event.target.value) || 0, 0, 5000) : event.target.value;
    state.elapsedMs = 0;
    renderTimeline();
    autoSave();
  });
  $("sequenceRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const rowElement = button?.closest(".gm-row");
    if (!button || !rowElement) return;
    const index = state.scheme.rows.findIndex((item) => item.id === rowElement.dataset.rowId);
    if (button.dataset.action === "delete" && state.scheme.rows.length > 2) state.scheme.rows.splice(index, 1);
    if (button.dataset.action === "up" && index > 0) [state.scheme.rows[index - 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index - 1]];
    if (button.dataset.action === "down" && index < state.scheme.rows.length - 1) [state.scheme.rows[index + 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index + 1]];
    state.elapsedMs = 0;
    renderRows(); renderTimeline(); autoSave();
  });
  $("addRow").addEventListener("click", () => {
    state.scheme.rows.push({ id: uid(), text: "新文字", hold: 100 });
    renderRows(); renderTimeline(); autoSave();
    $("sequenceRows").lastElementChild?.querySelector('input[data-key="text"]')?.select();
  });

  $("scrubber").addEventListener("input", () => {
    state.elapsedMs = Number($("scrubber").value);
    state.playing = false;
    updatePlaybackButton();
    resizePreview();
  });
  $("togglePlayback").addEventListener("click", () => { state.playing = !state.playing; state.lastFrame = performance.now(); updatePlaybackButton(); });
  $("restartPreview").addEventListener("click", () => { state.elapsedMs = 0; state.playing = true; state.lastFrame = performance.now(); updatePlaybackButton(); });
  $("toggleInspector").addEventListener("click", () => {
    document.body.classList.toggle("gm-inspector-hidden");
    const hidden = document.body.classList.contains("gm-inspector-hidden");
    $("toggleInspector").setAttribute("aria-pressed", String(hidden));
    setTimeout(resizePreview, 220);
  });
  function updatePlaybackButton() {
    $("togglePlayback").innerHTML = state.playing ? "Ⅱ <span>暂停</span>" : "▶ <span>播放</span>";
    $("togglePlayback").setAttribute("aria-pressed", String(!state.playing));
  }

  $("saveScheme").addEventListener("click", () => {
    collectControls();
    autoSave();
    download(new Blob([JSON.stringify(state.scheme, null, 2)], { type: "application/json" }), "glyph-morph-scheme.json");
    $("exportStatus").textContent = "方案已保存并下载 JSON。";
  });
  $("importScheme").addEventListener("click", () => $("schemeFile").click());
  $("schemeFile").addEventListener("change", async () => {
    const file = $("schemeFile").files?.[0];
    if (!file) return;
    try { applyScheme(JSON.parse(await file.text()), "方案已导入。" ); } catch (error) { $("exportStatus").textContent = `导入失败：${error.message}`; }
    $("schemeFile").value = "";
  });
  $("restoreScheme").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); applyScheme(clone(DEFAULT_SCHEME), "已恢复不可变默认方案。" ); });
  $("clearScheme").addEventListener("click", () => $("clearDialog").showModal());
  $("clearChanges").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    applyScheme(clone(DEFAULT_SCHEME), "已清空全部改动并恢复默认方案。" );
    $("clearDialog").close("clear-changes");
  });
  $("clearAll").addEventListener("click", () => {
    const cleared = clone(state.scheme);
    cleared.rows = [{ id: uid(), text: "", hold: 100 }, { id: uid(), text: "", hold: 100 }];
    applyScheme(cleared, "全部文字内容已清空，当前样式与画布保持不变。" );
    $("clearDialog").close("clear-all");
  });
  $("closeClearDialog").addEventListener("click", () => $("clearDialog").close("cancel"));
  $("clearDialog").addEventListener("click", (event) => {
    if (event.target === $("clearDialog")) $("clearDialog").close("cancel");
  });

  $("exportPng").addEventListener("click", () => {
    const output = exportCanvas();
    renderFrame(output, state.elapsedMs / 1000, output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) return;
      download(blob, `glyph-morph-${output.width}x${output.height}.png`);
      $("exportStatus").textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("exportGif").addEventListener("click", async () => {
    if (!window.GIF) { $("exportStatus").textContent = "GIF 编码器未加载。"; return; }
    setBusy(true, "正在准备 GIF…");
    let workerUrl = "";
    try {
      const response = await fetch("js/continuation-gif.worker.js");
      if (!response.ok) throw new Error(`worker ${response.status}`);
      workerUrl = URL.createObjectURL(new Blob([await response.text()], { type: "text/javascript" }));
      const output = exportCanvas();
      const fps = Math.min(30, Number($("exportFps").value));
      const total = Math.max(1, Math.ceil(exportSeconds() * fps));
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: workerUrl });
      for (let index = 0; index < total; index += 1) {
        renderFrame(output, index / fps, output.width, output.height);
        gif.addFrame(output, { copy: true, delay: 1000 / fps });
      }
      gif.on("progress", (progress) => $("exportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`);
      gif.on("finished", (blob) => { URL.revokeObjectURL(workerUrl); download(blob, `glyph-morph-${output.width}x${output.height}.gif`); setBusy(false, "GIF 已生成"); });
      gif.render();
    } catch (error) {
      if (workerUrl) URL.revokeObjectURL(workerUrl);
      console.error(error); setBusy(false, `GIF 生成失败：${error.message}`);
    }
  });

  $("exportMp4").addEventListener("click", async () => {
    const output = exportCanvas();
    output.width -= output.width % 2; output.height -= output.height % 2;
    const fps = Number($("exportFps").value);
    const total = Math.max(1, Math.ceil(exportSeconds() * fps));
    let encoder = null;
    setBusy(true, "正在加载 MP4 编码器…");
    try {
      await loadH264Encoder();
      encoder = await window.HME.createH264MP4Encoder();
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.max(4000, Math.round(output.width * output.height * fps * 0.12 / 1000));
      encoder.outputFilename = "glyph-morph.mp4";
      encoder.initialize();
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      for (let index = 0; index < total; index += 1) {
        renderFrame(output, index / fps, output.width, output.height);
        encoder.addFrameRgba(outputContext.getImageData(0, 0, output.width, output.height).data);
        if (index % 3 === 0 || index === total - 1) $("exportStatus").textContent = `正在编码 MP4 · ${Math.round((index + 1) / total * 100)}%`;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      encoder.finalize();
      const mp4 = encoder.FS.readFile(encoder.outputFilename);
      download(new Blob([mp4], { type: "video/mp4" }), `glyph-morph-${output.width}x${output.height}.mp4`);
      setBusy(false, "MP4 已生成");
    } catch (error) {
      console.error(error); setBusy(false, `MP4 生成失败：${error.message}`);
    } finally { encoder?.delete(); }
  });

  function animationLoop(now) {
    const total = cycleDurationMs();
    if (state.playing && !state.reducedMotion) {
      state.elapsedMs += Math.min(80, now - state.lastFrame);
      if (!state.scheme.motion.loop && state.elapsedMs >= total) { state.elapsedMs = total; state.playing = false; updatePlaybackButton(); }
    }
    state.lastFrame = now;
    renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
    $("scrubber").value = String(Math.min(state.elapsedMs % Math.max(1, total), total));
    $("timeNow").textContent = `${(state.elapsedMs % Math.max(1, total) / 1000).toFixed(2)}s`;
    requestAnimationFrame(animationLoop);
  }

  function initialize() {
    window.STGFontLibrary?.enhanceSelect($("fontFamily"));
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    const useDefault = new URLSearchParams(location.search).has("preview");
    applyScheme(useDefault || stored?.version !== VERSION ? clone(DEFAULT_SCHEME) : stored);
    if (state.reducedMotion) { state.playing = false; state.elapsedMs = state.scheme.motion.morphDuration; updatePlaybackButton(); }
    new ResizeObserver(resizePreview).observe(frame);
    document.fonts?.ready.then(resizePreview);
    window.addEventListener("resize", resizePreview, { passive: true });
    window.__glyphMorphTest = { renderFrame, resolveTimeline, matchGlyphs, getScheme: () => clone(state.scheme), cycleDurationMs, setTime: (seconds) => { state.elapsedMs = seconds * 1000; resizePreview(); } };
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
