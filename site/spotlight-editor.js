(() => {
  "use strict";

  // Spotlight editor. Rows are the light phases of the reference; each owns its name, duration and
  // brightness. The renderer (spotlight-render.js) is driven by a reference clock: every phase maps
  // its local progress onto its slice of the 11.7 s reference, so durations and the global speed
  // retime the sequence without changing the look of any frame.
  const $ = (id) => document.getElementById(id);
  const VERSION = 1;
  const SLUG = "spotlight";
  const STORAGE_KEY = `me-motion-${SLUG}-v1`;
  const R = window.SpotlightRenderer;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `spot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const number = (value, fallback, min, max) => { const result = Number(value); return clamp(Number.isFinite(result) ? result : fallback, min, max); };

  // Reference slices (ms) measured from the source video.
  const PHASES = {
    ignite: { name: "光点亮起", from: 0, to: 200, fill: "#d7ff2f" },
    bloom: { name: "光球绽放", from: 200, to: 1300, fill: "#8ec8ff" },
    gather: { name: "光球收拢", from: 1300, to: 2600, fill: "#9de7d7" },
    cone: { name: "化为光锥", from: 2600, to: 3200, fill: "#ffc4d6" },
    narrow: { name: "收窄上移", from: 3200, to: 6000, fill: "#ffd27d" },
    hold: { name: "光柱停驻", from: 6000, to: 6600, fill: "#d4b8ff" },
    pool: { name: "地面光斑", from: 6600, to: 10200, fill: "#8ec8ff" },
    fade: { name: "渐暗熄灭", from: 10200, to: 11400, fill: "#9de7d7" },
    dark: { name: "黑场", from: 11400, to: 11700, fill: "#ffc4d6" },
    pause: { name: "停顿", fill: "#ffd27d" }
  };
  const phase = (type, extra = {}) => ({ id: `spot-${type}`, type, name: PHASES[type].name, duration: PHASES[type].to - PHASES[type].from, gain: 100, ...extra });
  const DEFAULT_SCHEME = Object.freeze({
    version: VERSION,
    canvas: { width: 1920, height: 1080, preset: "1920x1080" },
    look: { lightColor: "#eaeeff", beamColor: "#babcf0", poolColor: "#e2c4ec", backgroundColor: "#010002", brightness: 100, sourceX: 0, sourceTop: 0, floorY: 0, rayCount: 6, beamWidth: 100, poolWidth: 100 },
    motion: { speed: 1, finalHold: 0, loop: true },
    rows: ["ignite", "bloom", "gather", "cone", "narrow", "hold", "pool", "fade", "dark"].map((type) => phase(type))
  });

  const state = { scheme: clone(DEFAULT_SCHEME), playing: true, elapsedMs: 0, lastFrame: performance.now(), exportBusy: false, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, activeRowId: "spot-ignite", previewMode: false };
  const canvas = $("glyphMorphCanvas");
  const frame = $("compositionFrame");
  const lookIds = ["brightness", "sourceX", "sourceTop", "floorY", "rayCount", "beamWidth", "poolWidth"];
  const LOOK_RANGES = { brightness: [20, 200], sourceX: [-60, 60], sourceTop: [-20, 30], floorY: [-25, 15], rayCount: [0, 8], beamWidth: [40, 250], poolWidth: [40, 250] };

  // ---------- Timing ----------
  function schedule() {
    let cursor = 0, lastRef = 0;
    return state.scheme.rows.map((row) => {
      const meta = PHASES[row.type] || PHASES.pause;
      const item = { row, start: cursor, end: cursor + row.duration, refFrom: row.type === "pause" ? lastRef : meta.from, refTo: row.type === "pause" ? lastRef : meta.to };
      cursor = item.end;
      lastRef = item.refTo;
      return item;
    });
  }
  function contentMs() { return schedule().reduce((max, item) => Math.max(max, item.end), 0); }
  function cycleDurationMs() { return Math.max(1, (contentMs() + state.scheme.motion.finalHold) / Math.max(0.01, state.scheme.motion.speed)); }
  // Elapsed preview/export time → [reference time, phase brightness].
  function resolve(elapsedMs) {
    const total = cycleDurationMs();
    const local = state.scheme.motion.loop ? ((elapsedMs % total) + total) % total : Math.min(elapsedMs, total);
    const time = local * Math.max(0.01, state.scheme.motion.speed);
    const items = schedule();
    if (!items.length) return { ref: R.REF_DURATION, gain: 1 };
    const item = items.find((entry) => time < entry.end) || items[items.length - 1];
    const progress = item.row.duration > 0 ? clamp((time - item.start) / item.row.duration) : 1;
    return { ref: item.refFrom + (item.refTo - item.refFrom) * progress, gain: item.row.gain / 100 };
  }
  function renderFrame(target, timeSeconds, width = target.width, height = target.height) {
    const { ref, gain } = resolve(timeSeconds * 1000);
    R.renderFrame(target.getContext("2d"), width, height, ref, state.scheme.look, gain);
  }

  function resizePreview() {
    const ratio = state.scheme.canvas.width / state.scheme.canvas.height;
    frame.style.setProperty("--gm-aspect", String(ratio));
    const stage = $("glyphMorphStage");
    const style = getComputedStyle(stage);
    const availableWidth = Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    const availableHeight = Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    const fittedWidth = Math.min(availableWidth, availableHeight * ratio);
    frame.style.width = `${fittedWidth}px`;
    frame.style.height = `${fittedWidth / ratio}px`;
    frame.style.maxHeight = "none";
    const rect = frame.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2, 2000 / Math.max(1, rect.width, rect.height));
    canvas.width = Math.max(2, Math.round(rect.width * scale));
    canvas.height = Math.max(2, Math.round(canvas.width / ratio));
    stage.style.setProperty("--tc-active-composition-bg", state.scheme.look.backgroundColor);
    renderFrame(canvas, state.elapsedMs / 1000);
  }

  // ---------- Rows ----------
  function rowSummary(item) {
    const speed = Math.max(0.01, state.scheme.motion.speed);
    return `${(item.row.duration / 1000).toFixed(2)}s · ${(item.start / speed / 1000).toFixed(2)}–${(item.end / speed / 1000).toFixed(2)}s`;
  }
  function renderRows() {
    const items = schedule();
    $("sequenceRows").innerHTML = items.map((item, index) => {
      const row = item.row;
      const builtIn = row.type !== "pause";
      return `
      <div class="gm-row-shell" data-row-id="${row.id}" data-row-summary="${escapeHtml(rowSummary(item))}">
        <div class="gm-row">
          <span class="gm-row-index">${String(index + 1).padStart(2, "0")}</span>
          <input data-key="text" value="${escapeHtml(row.name)}" placeholder="${escapeHtml(PHASES[row.type]?.name || "阶段")}" aria-label="第 ${index + 1} 个阶段名称">
          <span class="spot-row-spacer" aria-hidden="true"></span>
          <button data-action="up" type="button" aria-label="上移">↑</button>
          <button data-action="down" type="button" aria-label="下移">↓</button>
          <button data-action="delete" type="button" aria-label="删除"${state.scheme.rows.length <= 1 ? " disabled" : ""}>×</button>
        </div>
        <div class="gm-row-background-grid spot-row-grid">
          <label>本阶段时长<input data-key="duration" type="number" min="0" max="20000" step="10" value="${row.duration}"><small>毫秒</small></label>
          <label>本阶段亮度<input data-key="gain" type="number" min="0" max="300" step="5" value="${row.gain}"><small>%</small></label>
          <p class="gm-help spot-wide">${builtIn ? `对应原片 ${(PHASES[row.type].from / 1000).toFixed(2)}–${(PHASES[row.type].to / 1000).toFixed(2)} 秒；原片时长 ${PHASES[row.type].to - PHASES[row.type].from} 毫秒。改时长只改变快慢，画面不变。` : "停顿：画面停在上一阶段的结尾，持续设定的时长。"}</p>
        </div>
        <div class="gm-row-meta">
          <button class="gm-row-pause" data-action="pause-row" type="button">暂停查看</button>
          <button class="gm-text-button" data-action="preview-row" type="button">▶ 从这里播放</button>
          ${builtIn ? `<button class="gm-text-button" data-action="reset-row" type="button">恢复原片时长</button>` : ""}
        </div>
      </div>`;
    }).join("");
  }
  function refreshRowChrome() {
    const items = schedule();
    document.querySelectorAll("#sequenceRows .gm-row-shell").forEach((element) => {
      const item = items.find((entry) => entry.row.id === element.dataset.rowId);
      if (item) element.dataset.rowSummary = rowSummary(item);
    });
  }

  // ---------- Timeline ----------
  function renderTimeline() {
    const speed = Math.max(0.01, state.scheme.motion.speed);
    const blocks = schedule().filter((item) => item.row.duration > 0).map((item) => {
      const meta = PHASES[item.row.type] || PHASES.pause;
      return `<button type="button" data-seek-ms="${item.start / speed}" class="gm-timeline-block me-choreo-block" style="background:${meta.fill} !important" role="listitem"><strong>${escapeHtml(item.row.name || meta.name)}</strong><small>${(item.row.duration / speed / 1000).toFixed(2)}s</small></button>`;
    });
    if (state.scheme.motion.finalHold > 0) blocks.push(`<button type="button" data-seek-ms="${contentMs() / speed}" class="gm-timeline-block me-choreo-block" style="background:#d4b8ff !important" role="listitem"><strong>结束停留</strong><small>${(state.scheme.motion.finalHold / speed / 1000).toFixed(2)}s</small></button>`);
    $("timeline").innerHTML = blocks.join("");
    const total = cycleDurationMs();
    $("scrubber").max = String(Math.max(0.001, total));
    $("timeTotal").textContent = `${(total / 1000).toFixed(2)}s`;
  }

  // ---------- Controls and scheme ----------
  function updateOutputs() {
    const formats = { speed: (v) => `${Number(v).toFixed(2)}×`, brightness: (v) => `${v}%`, finalHold: (v) => `${v}ms`, sourceX: (v) => `${v}%`, sourceTop: (v) => `${v}%`, floorY: (v) => `${v}%`, rayCount: (v) => `${v}`, beamWidth: (v) => `${v}%`, poolWidth: (v) => `${v}%` };
    Object.entries(formats).forEach(([id, format]) => { const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = format(Number($(id).value)); });
  }
  function syncControls() {
    const { canvas: size, look, motion } = state.scheme;
    $("canvasPreset").value = size.preset;
    $("canvasWidth").value = size.width; $("canvasHeight").value = size.height;
    document.querySelector(".gm-custom-size").hidden = size.preset !== "custom";
    $("textColor").value = look.lightColor; $("beamColor").value = look.beamColor; $("poolColor").value = look.poolColor; $("backgroundColor").value = look.backgroundColor;
    lookIds.forEach((id) => { $(id).value = look[id]; });
    $("speed").value = motion.speed; $("finalHold").value = motion.finalHold; $("loop").checked = Boolean(motion.loop);
    renderRows(); renderTimeline(); updateOutputs(); resizePreview();
  }
  function collectControls() {
    const { look, motion } = state.scheme;
    look.lightColor = normalizeColor($("textColor").value, look.lightColor);
    look.beamColor = normalizeColor($("beamColor").value, look.beamColor);
    look.poolColor = normalizeColor($("poolColor").value, look.poolColor);
    look.backgroundColor = normalizeColor($("backgroundColor").value, look.backgroundColor);
    lookIds.forEach((id) => { look[id] = number($(id).value, DEFAULT_SCHEME.look[id], ...LOOK_RANGES[id]); });
    motion.speed = number($("speed").value, 1, 0.25, 3);
    motion.finalHold = number($("finalHold").value, 0, 0, 5000);
    motion.loop = $("loop").checked;
  }
  function autoSave() {
    if (state.previewMode) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scheme)); } catch (_) {}
  }
  function normalizeRow(input) {
    const type = PHASES[input?.type] ? input.type : "pause";
    const meta = PHASES[type];
    return { id: String(input?.id || uid()), type, name: String(input?.name ?? meta.name), duration: number(input?.duration, type === "pause" ? 500 : meta.to - meta.from, 0, 20000), gain: number(input?.gain, 100, 0, 300) };
  }
  function applyScheme(scheme, status = "") {
    if (!scheme || !Array.isArray(scheme.rows)) return;
    const look = { ...clone(DEFAULT_SCHEME.look), ...(scheme.look || {}) };
    ["lightColor", "beamColor", "poolColor", "backgroundColor"].forEach((key) => { look[key] = normalizeColor(look[key], DEFAULT_SCHEME.look[key]); });
    lookIds.forEach((key) => { look[key] = number(look[key], DEFAULT_SCHEME.look[key], ...LOOK_RANGES[key]); });
    const motion = { ...clone(DEFAULT_SCHEME.motion), ...(scheme.motion || {}) };
    state.scheme = { version: VERSION, canvas: { ...clone(DEFAULT_SCHEME.canvas), ...(scheme.canvas || {}) }, look, motion, rows: scheme.rows.map(normalizeRow) };
    if (!state.scheme.rows.length) state.scheme.rows = clone(DEFAULT_SCHEME.rows);
    if (!state.scheme.rows.some((row) => row.id === state.activeRowId)) state.activeRowId = state.scheme.rows[0].id;
    state.elapsedMs = 0; state.playing = !state.reducedMotion; state.lastFrame = performance.now();
    updatePlaybackButton(); syncControls(); autoSave();
    if (status) $("exportStatus").textContent = status;
  }
  function changed({ restart = false } = {}) {
    collectControls();
    if (restart) playFrom(0);
    refreshRowChrome(); renderTimeline(); updateOutputs(); autoSave(); resizePreview();
  }

  // ---------- Playback ----------
  function updatePlaybackButton() {
    $("togglePlayback").innerHTML = state.playing ? "Ⅱ <span>暂停</span>" : "▶ <span>播放</span>";
    $("togglePlayback").setAttribute("aria-pressed", String(!state.playing));
  }
  function pauseAt(ms) { state.elapsedMs = Math.max(0, ms); state.playing = false; updatePlaybackButton(); resizePreview(); }
  function playFrom(ms) { state.elapsedMs = Math.max(0, ms); state.playing = true; state.lastFrame = performance.now(); updatePlaybackButton(); resizePreview(); }
  // Row pause shows the most characteristic frame of the phase (its middle).
  function seekToRowStart(rowIdOrIndex, pause = true) {
    const items = schedule();
    const item = typeof rowIdOrIndex === "number" ? items[rowIdOrIndex] : items.find((entry) => entry.row.id === rowIdOrIndex);
    if (!item) return;
    const speed = Math.max(0.01, state.scheme.motion.speed);
    state.activeRowId = item.row.id;
    if (pause) pauseAt((item.start + item.row.duration * 0.6) / speed);
    else playFrom(item.start / speed);
  }

  // ---------- Events ----------
  $("canvasPreset").addEventListener("change", () => {
    const preset = $("canvasPreset").value;
    state.scheme.canvas.preset = preset;
    document.querySelector(".gm-custom-size").hidden = preset !== "custom";
    if (preset !== "custom") {
      const [width, height] = preset.split("x").map(Number);
      Object.assign(state.scheme.canvas, { width, height });
      $("canvasWidth").value = width; $("canvasHeight").value = height;
    }
    changed();
  });
  ["canvasWidth", "canvasHeight"].forEach((id) => ["input", "change"].forEach((type) => $(id).addEventListener(type, () => {
    state.scheme.canvas[id === "canvasWidth" ? "width" : "height"] = clamp(Number($(id).value) || 1080, 320, 3840);
    changed();
  })));
  ["textColor", "beamColor", "poolColor", "backgroundColor", ...lookIds, "speed", "finalHold", "loop"].forEach((id) => $(id).addEventListener("input", () => changed({ restart: id === "speed" })));
  $("sequenceRows").addEventListener("input", (event) => {
    const element = event.target.closest(".gm-row-shell");
    const row = state.scheme.rows.find((item) => item.id === element?.dataset.rowId);
    const key = event.target.dataset.key;
    if (!row || !key) return;
    state.activeRowId = row.id;
    if (key === "text") row.name = event.target.value;
    if (key === "duration") row.duration = number(event.target.value, row.duration, 0, 20000);
    if (key === "gain") row.gain = number(event.target.value, row.gain, 0, 300);
    refreshRowChrome(); renderTimeline(); autoSave();
    if (key === "duration") seekToRowStart(row.id, false);
    else seekToRowStart(row.id, true);
  });
  $("sequenceRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const element = button?.closest(".gm-row-shell");
    if (!button || !element) return;
    const index = state.scheme.rows.findIndex((item) => item.id === element.dataset.rowId);
    const row = state.scheme.rows[index];
    if (!row) return;
    state.activeRowId = row.id;
    const action = button.dataset.action;
    if (action === "pause-row") { seekToRowStart(index, true); return; }
    if (action === "preview-row") { seekToRowStart(index, false); return; }
    if (action === "reset-row" && PHASES[row.type]?.to != null) { row.duration = PHASES[row.type].to - PHASES[row.type].from; row.gain = 100; }
    if (action === "delete" && state.scheme.rows.length > 1) state.scheme.rows.splice(index, 1);
    if (action === "up" && index > 0) [state.scheme.rows[index - 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index - 1]];
    if (action === "down" && index < state.scheme.rows.length - 1) [state.scheme.rows[index + 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index + 1]];
    renderRows(); renderTimeline(); autoSave(); resizePreview();
  });
  $("addRow").addEventListener("click", () => {
    const index = Math.max(0, state.scheme.rows.findIndex((item) => item.id === state.activeRowId));
    const row = normalizeRow({ type: "pause", name: "停顿", duration: 500 });
    state.scheme.rows.splice(index + 1, 0, row);
    state.activeRowId = row.id;
    renderRows(); renderTimeline(); autoSave();
    seekToRowStart(row.id, true);
    // The shared shell selects the last row after adding; keep the new pause selected instead.
    setTimeout(() => document.querySelector(`#tcRowList [data-row-id="${row.id}"]`)?.click(), 0);
  });
  $("scrubber").addEventListener("input", () => pauseAt(Number($("scrubber").value)));
  // Drag anywhere on the timeline (blocks included) to scrub; a plain click still jumps to the block start.
  let timelineDrag = null;
  const timelineMs = (event) => { const rect = $("timeline").getBoundingClientRect(); return clamp((event.clientX - rect.left) / Math.max(1, rect.width)) * cycleDurationMs(); };
  $("timeline").addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    timelineDrag = { pointerId: event.pointerId, x: event.clientX, moved: false };
    $("timeline").setPointerCapture(event.pointerId);
  });
  $("timeline").addEventListener("pointermove", (event) => {
    if (!timelineDrag || timelineDrag.pointerId !== event.pointerId) return;
    if (!timelineDrag.moved && Math.abs(event.clientX - timelineDrag.x) < 4) return;
    timelineDrag.moved = true;
    pauseAt(timelineMs(event));
  });
  ["pointerup", "pointercancel"].forEach((name) => $("timeline").addEventListener(name, () => { setTimeout(() => { timelineDrag = null; }, 0); }));
  $("timeline").addEventListener("click", (event) => {
    if (timelineDrag?.moved) return;
    const block = event.target.closest("[data-seek-ms]");
    if (block) pauseAt(Number(block.dataset.seekMs) + 1);
  });
  $("togglePlayback").addEventListener("click", () => {
    if (!state.playing && !state.scheme.motion.loop && state.elapsedMs >= cycleDurationMs()) state.elapsedMs = 0;
    state.playing = !state.playing; state.lastFrame = performance.now(); updatePlaybackButton();
  });
  $("restartPreview").addEventListener("click", () => playFrom(0));
  $("toggleInspector").addEventListener("click", () => {
    document.body.classList.toggle("gm-inspector-hidden");
    $("toggleInspector").setAttribute("aria-pressed", String(document.body.classList.contains("gm-inspector-hidden")));
    setTimeout(resizePreview, 220);
  });

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.className = "gm-download-ready"; anchor.textContent = `下载 ${filename}`;
    const previous = document.querySelector(".gm-download-ready");
    if (previous) { URL.revokeObjectURL(previous.href); previous.remove(); }
    $("exportStatus").after(anchor);
    anchor.click();
  }
  $("saveScheme").addEventListener("click", () => {
    collectControls(); autoSave();
    download(new Blob([JSON.stringify(state.scheme, null, 2)], { type: "application/json" }), `${SLUG}-scheme.json`);
    $("exportStatus").textContent = "方案已保存并下载 JSON。";
  });
  $("importScheme").addEventListener("click", () => $("schemeFile").click());
  $("schemeFile").addEventListener("change", async () => {
    const file = $("schemeFile").files?.[0];
    if (!file) return;
    try { applyScheme(JSON.parse(await file.text()), "方案已导入。"); } catch (error) { $("exportStatus").textContent = `导入失败：${error.message}`; }
    $("schemeFile").value = "";
  });
  $("restoreScheme").addEventListener("click", () => { try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} applyScheme(clone(DEFAULT_SCHEME), "已恢复不可变默认方案。"); });
  $("clearScheme").addEventListener("click", () => {
    const next = clone(state.scheme);
    next.rows = clone(DEFAULT_SCHEME.rows);
    applyScheme(next, "阶段已恢复为原片节奏；颜色、形状和画布保持不变。");
  });

  // ---------- Export ----------
  function exportCanvas() {
    const output = document.createElement("canvas");
    output.width = Math.max(2, Math.round(state.scheme.canvas.width));
    output.height = Math.max(2, Math.round(state.scheme.canvas.height));
    return output;
  }
  function exportSeconds() { return $("exportDuration").value === "cycle" ? cycleDurationMs() / 1000 : Number($("exportDuration").value); }
  function setBusy(value, message) { state.exportBusy = value; document.querySelectorAll("#exportPng,#exportGif,#exportMp4").forEach((button) => { button.disabled = value; }); $("exportStatus").textContent = message; }
  let h264Loader;
  function loadH264Encoder() {
    if (window.HME?.createH264MP4Encoder) return Promise.resolve();
    if (!h264Loader) h264Loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/h264-mp4-encoder.web.js";
      script.onload = () => window.HME?.createH264MP4Encoder ? resolve() : reject(new Error("MP4 编码器初始化失败"));
      script.onerror = () => reject(new Error("MP4 编码器加载失败"));
      document.head.append(script);
    });
    return h264Loader;
  }
  $("exportPng").addEventListener("click", () => {
    const output = exportCanvas();
    renderFrame(output, state.elapsedMs / 1000);
    output.toBlob((blob) => { if (!blob) return; download(blob, `${SLUG}-${output.width}x${output.height}.png`); $("exportStatus").textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png");
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
        renderFrame(output, index / fps);
        gif.addFrame(output, { copy: true, delay: (Math.round((index + 1) * 100 / fps) - Math.round(index * 100 / fps)) * 10 });
      }
      gif.on("progress", (progress) => { $("exportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => { URL.revokeObjectURL(workerUrl); download(blob, `${SLUG}-${output.width}x${output.height}.gif`); setBusy(false, "GIF 已生成"); });
      gif.render();
    } catch (error) { if (workerUrl) URL.revokeObjectURL(workerUrl); console.error(error); setBusy(false, `GIF 生成失败：${error.message}`); }
  });
  $("exportMp4").addEventListener("click", async () => {
    const output = exportCanvas();
    output.width -= output.width % 2; output.height -= output.height % 2;
    const requested = Number($("exportFps").value);
    const fps = [24, 30, 60].includes(requested) ? requested : 30;
    const total = Math.max(1, Math.ceil(exportSeconds() * fps));
    let encoder = null;
    setBusy(true, "正在加载 MP4 编码器…");
    try {
      await loadH264Encoder();
      encoder = await window.HME.createH264MP4Encoder();
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.max(8000, Math.min(30000, Math.round(output.width * output.height * fps * 0.18 / 1000)));
      encoder.groupOfPictures = Math.max(12, Math.round(fps / 2));
      encoder.outputFilename = `${SLUG}-${output.width}x${output.height}-${fps}fps.mp4`;
      encoder.initialize();
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      const every = Math.max(1, Math.floor(fps / 10));
      for (let index = 0; index < total; index += 1) {
        renderFrame(output, index / fps);
        encoder.addFrameRgba(outputContext.getImageData(0, 0, output.width, output.height).data);
        if (index % every === 0 || index === total - 1) { $("exportStatus").textContent = `正在导出 MP4 ${output.width} × ${output.height} · ${fps}fps · ${Math.round((index + 1) / total * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); }
      }
      encoder.finalize();
      const mp4 = encoder.FS.readFile(encoder.outputFilename);
      download(new Blob([mp4], { type: "video/mp4" }), encoder.outputFilename);
      setBusy(false, `MP4 已生成 · ${output.width} × ${output.height} · ${fps}fps · ${(mp4.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) { console.error(error); setBusy(false, `MP4 生成失败：${error.message}`); }
    finally { try { encoder?.delete(); } catch (_) {} }
  });

  // ---------- Loop and init ----------
  function animationLoop(now) {
    const total = cycleDurationMs();
    if (state.playing) {
      state.elapsedMs += Math.min(80, now - state.lastFrame);
      if (!state.scheme.motion.loop && state.elapsedMs >= total) { state.elapsedMs = total; state.playing = false; updatePlaybackButton(); }
    }
    state.lastFrame = now;
    renderFrame(canvas, state.elapsedMs / 1000);
    const display = state.scheme.motion.loop ? state.elapsedMs % Math.max(1, total) : Math.min(state.elapsedMs, total);
    $("scrubber").value = String(display);
    $("timeNow").textContent = `${(display / 1000).toFixed(2)}s`;
    requestAnimationFrame(animationLoop);
  }
  function moveGlobalCards() {
    const panel = document.querySelector('.tc-properties[data-panel="global"]');
    if (panel) document.querySelectorAll("[data-spot-global-card]").forEach((card) => panel.append(card));
    // The shared shell labels rows as text blocks; this effect's rows are light phases.
    const heading = document.querySelector(".tc-content .tc-panel-heading h2");
    const count = $("tcRowCount");
    if (heading && count) heading.replaceChildren(document.createTextNode("光效阶段 "), count);
    const hint = document.querySelector(".tc-content .tc-hint");
    if (hint) hint.textContent = "选择一个阶段，在右侧调整时长和亮度";
    const title = $("tcSelectedTitle");
    if (title) {
      const relabel = () => { const next = title.textContent.replace(/^段落 /, "阶段 "); if (next !== title.textContent) title.textContent = next; };
      relabel();
      new MutationObserver(relabel).observe(title, { childList: true, characterData: true, subtree: true });
    }
  }
  function initialize() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    const params = new URLSearchParams(location.search);
    state.previewMode = params.has("preview") || params.has("embed");
    if (state.previewMode) document.body.classList.add("is-preview");
    const useDefault = params.has("preview") || params.get("from") === "gallery";
    applyScheme(useDefault || !stored?.rows || Number(stored.version || 1) !== VERSION ? clone(DEFAULT_SCHEME) : stored);
    if (state.reducedMotion) seekToRowStart(1, true);
    new ResizeObserver(resizePreview).observe(frame);
    window.addEventListener("resize", resizePreview, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", moveGlobalCards, { once: true }); else moveGlobalCards();
    const setPlaying = (playing) => { state.playing = Boolean(playing); state.lastFrame = performance.now(); updatePlaybackButton(); resizePreview(); };
    const setTime = (seconds) => { state.elapsedMs = clamp(Number(seconds) || 0, 0, cycleDurationMs() / 1000) * 1000; setPlaying(false); };
    window.CellMotionEffectBridge = {
      version: "1.0.0", effectId: SLUG,
      getScheme: () => clone(state.scheme),
      applyScheme: (scheme, options = {}) => { applyScheme(clone(scheme)); if (options.autoplay === false) setPlaying(false); },
      play: () => setPlaying(true), pause: () => setPlaying(false), restart: () => { state.elapsedMs = 0; setPlaying(true); }, seek: setTime, durationMs: cycleDurationMs
    };
    const postDuration = () => { if (window.parent !== window) window.parent.postMessage({ type: "cellmotion:duration", effectId: SLUG, durationMs: cycleDurationMs() }, "*"); };
    window.addEventListener("message", (event) => {
      const message = event.data || {};
      if (typeof message.type !== "string" || !message.type.startsWith("cellmotion:")) return;
      if (message.type === "cellmotion:configure") {
        const manifest = message.manifest;
        if (manifest?.effect?.id && manifest.effect.id !== SLUG) return;
        const composition = manifest?.composition || message.composition;
        if (composition) window.CellMotionEffectBridge.applyScheme(composition, { autoplay: manifest?.presentation?.autoplay });
        postDuration();
      }
      if (message.type === "cellmotion:play") window.CellMotionEffectBridge.play();
      if (message.type === "cellmotion:pause") window.CellMotionEffectBridge.pause();
      if (message.type === "cellmotion:restart") window.CellMotionEffectBridge.restart();
      if (message.type === "cellmotion:seek") window.CellMotionEffectBridge.seek(message.seconds);
      if (message.type === "cellmotion:request-duration") postDuration();
    });
    window.__spotlightTest = { renderFrame, resolve, getScheme: () => clone(state.scheme), cycleDurationMs, setTime };
    if (window.parent !== window) window.parent.postMessage({ type: "cellmotion:ready", effectId: SLUG, bridgeVersion: "1.0.0", durationMs: cycleDurationMs() }, "*");
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
