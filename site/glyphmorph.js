(() => {
  "use strict";

  // Independent Canvas adaptation of the observable per-glyph diff model used by
  // LTMorphingLabel (MIT, lexrus/LTMorphingLabel). No Swift/UIKit source is embedded.
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "me-motion-glyphmorph-v1";
  const VERSION = 2;
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const split = (value) => segmenter ? Array.from(segmenter.segment(String(value)), ({ segment }) => segment) : Array.from(String(value));
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const easeOutQuint = (value) => 1 - Math.pow(1 - clamp(value), 5);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `gm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // Frozen approved example. Keep synchronized with assets/presets/glyphmorph-default.json.
  const DEFAULT_SCHEME = Object.freeze({
    version: VERSION,
    canvas: { width: 1080, height: 1080, preset: "1080x1080" },
    typography: { fontFamily: "stg:inter", fontSize: 150, tracking: 0, positionX: 0, positionY: 0, alignment: "center", textColor: "#111111", backgroundColor: "#ffffff" },
    motion: { morphDuration: 600, characterDelay: 33, scaleFloor: 0.2, speed: 1.1, loop: true },
    rows: [
      { id: "month-01", text: "January", hold: 100, icons: [{ id: "gm-mtiwdbki-o66e2f", libraryId: "animal-56", boundary: 4, size: 105, gap: 1, x: 0, y: 0 }] },
      { id: "month-02", text: "February", hold: 100, icons: [{ id: "gm-mtisnt3w-y8g89h", libraryId: "animal-02", boundary: 3, size: 123, gap: 2, x: 0, y: 0 }] },
      { id: "month-03", text: "March", hold: 100, icons: [] },
      { id: "month-04", text: "四月", hold: 100, icons: [{ id: "gm-mtiwc4ke-otnhg5", libraryId: "animal-57", boundary: 2, size: 138, gap: 12, x: -5, y: -9 }] },
      { id: "month-05", text: "May", hold: 100, icons: [] },
      { id: "month-06", text: "June", hold: 100, icons: [] },
      { id: "month-07", text: "July", hold: 100, icons: [] },
      { id: "month-08", text: "August", hold: 100, icons: [{ id: "gm-mtiwfq1a-io9hdk", libraryId: "animal-35", boundary: 0, size: 130, gap: 3, x: 0, y: 0 }] },
      { id: "month-09", text: "September", hold: 100, icons: [] },
      { id: "month-10", text: "October", hold: 100, icons: [] },
      { id: "month-11", text: "November", hold: 100, icons: [] },
      { id: "month-12", text: "December", hold: 100, icons: [] }
    ]
  });

  const state = {
    scheme: clone(DEFAULT_SCHEME),
    playing: true,
    elapsedMs: 0,
    lastFrame: performance.now(),
    exportBusy: false,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    activeRowId: "month-01",
    caretBoundary: 7,
    librarySelectionId: "",
    activeIconId: "",
    imageCache: new Map()
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
      holdMs: Math.max(0, Number(row.hold) || 0),
      durationMs: state.scheme.motion.morphDuration + Math.max(0, Number(row.hold) || 0)
    }));
  }
  function rowStartElapsed(rowIndex) {
    const segments = timelineSegments();
    const length = segments.length;
    if (!length) return 0;
    const index = ((rowIndex % length) + length) % length;
    let rawStart = 0;
    for (let cursor = 0; cursor < index; cursor += 1) rawStart += segments[cursor].durationMs;
    return rawStart / Math.max(0.01, state.scheme.motion.speed);
  }

  function seekToRowStart(rowIdOrIndex, pause = true) {
    const rows = state.scheme.rows.length > 1 ? state.scheme.rows : [{ id: "blank-a", text: "", hold: 100 }, { id: "blank-b", text: "", hold: 100 }];
    const index = typeof rowIdOrIndex === "number" ? rowIdOrIndex : rows.findIndex((row) => row.id === rowIdOrIndex);
    const total = cycleDurationMs();
    const elapsedMs = Math.min(total, rowStartElapsed(index));
    state.elapsedMs = elapsedMs;
    state.playing = !pause;
    state.lastFrame = performance.now();
    updatePlaybackButton();
    resizePreview();
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
        return { segment, index, progress: clamp((segmentTime - segment.holdMs) / Math.max(1, segment.morphMs)), inHold: segmentTime < segment.holdMs };
      }
      cursor += segment.durationMs;
    }
    return { segment: segments[0], index: 0, progress: 0, inHold: false };
  }

  function libraryAsset(libraryId) {
    return window.STGIconLibrary?.byId?.get(libraryId) || null;
  }

  function rowTokens(row) {
    const glyphs = split(row.text);
    const buckets = new Map();
    (row.icons || []).forEach((icon) => {
      const boundary = clamp(Math.round(Number(icon.boundary) || 0), 0, glyphs.length);
      if (!buckets.has(boundary)) buckets.set(boundary, []);
      buckets.get(boundary).push(icon);
    });
    const tokens = [];
    for (let boundary = 0; boundary <= glyphs.length; boundary += 1) {
      (buckets.get(boundary) || []).forEach((icon) => tokens.push({ type: "icon", key: `i:${icon.libraryId}`, icon }));
      if (boundary < glyphs.length) tokens.push({ type: "glyph", key: `g:${glyphs[boundary]}`, glyph: glyphs[boundary] });
    }
    return tokens;
  }

  async function loadAssetResource(asset) {
    if (!asset || asset.kind === "vector") return null;
    if (state.imageCache.has(asset.libraryId)) return state.imageCache.get(asset.libraryId);
    const promise = (async () => {
      let fallbackImage = null;
      const fallbackPromise = new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => { fallbackImage = image; resolve(image); };
        image.onerror = () => resolve(null);
        image.src = asset.url;
      });
      if (/gif/i.test(asset.fileType || "") && "ImageDecoder" in window) {
        try {
          const response = await fetch(asset.url);
          if (!response.ok) throw new Error(`asset ${response.status}`);
          const blob = await response.blob();
          const decoder = new ImageDecoder({ data: blob.stream(), type: asset.fileType });
          await decoder.tracks.ready;
          const frameCount = decoder.tracks.selectedTrack?.frameCount || 1;
          const frames = [];
          let totalMs = 0;
          for (let index = 0; index < frameCount; index += 1) {
            const decoded = await decoder.decode({ frameIndex: index, completeFramesOnly: true });
            const durationMs = Math.max(20, Number(decoded.image.duration || 100000) / 1000);
            frames.push({ image: decoded.image, startMs: totalMs, durationMs });
            totalMs += durationMs;
          }
          return { kind: "frames", frames, totalMs, decoder, fallbackImage: await fallbackPromise };
        } catch (error) {
          console.warn(`动态图标解码回退：${asset.name}`, error);
        }
      }
      return { kind: "image", image: await fallbackPromise };
    })();
    state.imageCache.set(asset.libraryId, promise);
    const resource = await promise;
    state.imageCache.set(asset.libraryId, resource);
    return resource;
  }

  async function preloadInsertedAssets() {
    const ids = new Set(state.scheme.rows.flatMap((row) => (row.icons || []).map((icon) => icon.libraryId)));
    await Promise.all(Array.from(ids, (id) => loadAssetResource(libraryAsset(id))));
  }

  function glyphLayout(ctx, row, width, height) {
    const sourceTokens = rowTokens(row);
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
      const fitScale = size / baseSize;
      const tokens = sourceTokens.map((token) => {
        if (token.type === "glyph") return { ...token, width: ctx.measureText(token.glyph).width };
        const iconSize = size * clamp(Number(token.icon.size) || 90, 20, 220) / 100;
        const gap = clamp(Number(token.icon.gap) || 0, 0, 80) * unit * fitScale;
        return { ...token, iconSize, gap, width: iconSize + gap * 2 };
      });
      return { tokens, total: tokens.reduce((sum, token) => sum + token.width, 0) + Math.max(0, tokens.length - 1) * tracking * fitScale };
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
    const slots = metrics.tokens.map((token) => {
      const slot = { token, x: cursor + token.width / 2, y: baseline, width: token.width };
      cursor += token.width + appliedTracking;
      return slot;
    });
    return { tokens: metrics.tokens, slots, fontSize, family, style, weight, unit };
  }

  function matchGlyphs(from, to) {
    const claimed = new Set();
    const matches = new Map();
    from.forEach((token, oldIndex) => {
      const newIndex = to.findIndex((candidate, index) => candidate.key === token.key && !claimed.has(index));
      if (newIndex >= 0) {
        claimed.add(newIndex);
        matches.set(oldIndex, newIndex);
      }
    });
    return { matches, claimed };
  }

  function drawableImage(resource, timeSeconds) {
    if (!resource) return null;
    if (resource.kind === "image") return resource.image;
    if (resource.kind === "frames" && resource.frames.length) {
      const timeMs = ((timeSeconds * 1000) % resource.totalMs + resource.totalMs) % resource.totalMs;
      return (resource.frames.find((frame) => timeMs >= frame.startMs && timeMs < frame.startMs + frame.durationMs) || resource.frames[0]).image;
    }
    return resource.fallbackImage || null;
  }

  function drawToken(ctx, slot, layout, scale, alpha, timeSeconds, iconOverride = null) {
    const token = slot.token;
    if (alpha <= 0 || scale <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    if (token.type === "glyph") {
      if (!token.glyph.trim()) { ctx.restore(); return; }
      ctx.fillStyle = state.scheme.typography.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${layout.style} ${layout.weight} ${layout.fontSize}px ${layout.family}`;
      ctx.translate(slot.x, slot.y);
      ctx.scale(scale, scale);
      ctx.fillText(token.glyph, 0, 0);
      ctx.restore();
      return;
    }
    const icon = iconOverride || token.icon;
    const size = layout.fontSize * clamp(Number(icon.size) || 90, 20, 220) / 100;
    const offsetX = layout.fontSize * clamp(Number(icon.x) || 0, -100, 100) / 100;
    const offsetY = layout.fontSize * clamp(Number(icon.y) || 0, -100, 100) / 100;
    const asset = libraryAsset(icon.libraryId);
    ctx.translate(slot.x + offsetX, slot.y + offsetY);
    ctx.scale(scale, scale);
    if (asset?.kind === "vector") {
      window.STGIconLibrary.drawVector(ctx, asset, size, timeSeconds);
    } else {
      const cached = state.imageCache.get(icon.libraryId);
      const resource = cached && typeof cached.then !== "function" ? cached : null;
      const image = drawableImage(resource, timeSeconds);
      if (image) {
        const naturalWidth = image.displayWidth || image.naturalWidth || image.width || 1;
        const naturalHeight = image.displayHeight || image.naturalHeight || image.height || 1;
        const fit = size / Math.max(naturalWidth, naturalHeight);
        ctx.drawImage(image, -naturalWidth * fit / 2, -naturalHeight * fit / 2, naturalWidth * fit, naturalHeight * fit);
      } else {
        ctx.strokeStyle = state.scheme.typography.textColor;
        ctx.lineWidth = Math.max(1, size * 0.05);
        ctx.strokeRect(-size * 0.32, -size * 0.32, size * 0.64, size * 0.64);
      }
    }
    ctx.restore();
  }

  function renderFrame(targetCanvas, timeSeconds, width = targetCanvas.width, height = targetCanvas.height) {
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = state.scheme.typography.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    const timeline = resolveTimeline(timeSeconds * 1000);
    const fromLayout = glyphLayout(ctx, timeline.segment.from, width, height);
    const toLayout = glyphLayout(ctx, timeline.segment.to, width, height);
    if (timeline.inHold) {
      fromLayout.slots.forEach((slot) => drawToken(ctx, slot, fromLayout, 1, 1, timeSeconds));
      ctx.restore();
      return timeline;
    }
    const { matches, claimed } = matchGlyphs(fromLayout.tokens, toLayout.tokens);
    const delayRatio = state.scheme.motion.characterDelay / Math.max(1, state.scheme.motion.morphDuration);
    const floor = state.scheme.motion.scaleFloor;
    fromLayout.slots.forEach((oldSlot, oldIndex) => {
      const glyphProgress = clamp(timeline.progress + delayRatio * oldIndex);
      const eased = easeOutQuint(glyphProgress);
      const newIndex = matches.get(oldIndex);
      if (newIndex == null) {
        drawToken(ctx, oldSlot, fromLayout, Math.max(floor, 1 - eased), 1 - eased, timeSeconds);
        return;
      }
      const target = toLayout.slots[newIndex];
      let iconOverride = null;
      if (oldSlot.token.type === "icon" && target.token.type === "icon") {
        iconOverride = { ...oldSlot.token.icon };
        ["size", "gap", "x", "y"].forEach((key) => { iconOverride[key] = Number(oldSlot.token.icon[key] || 0) + (Number(target.token.icon[key] || 0) - Number(oldSlot.token.icon[key] || 0)) * eased; });
      }
      drawToken(ctx, { token: oldSlot.token, x: oldSlot.x + (target.x - oldSlot.x) * eased, y: oldSlot.y + (target.y - oldSlot.y) * eased }, fromLayout, 1, 1, timeSeconds, iconOverride);
    });
    toLayout.slots.forEach((newSlot, newIndex) => {
      if (claimed.has(newIndex)) return;
      const glyphProgress = clamp(timeline.progress - delayRatio * newIndex);
      const eased = easeOutQuint(glyphProgress);
      drawToken(ctx, newSlot, toLayout, floor + (1 - floor) * eased, eased, timeSeconds);
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
      <div class="gm-row-shell" data-row-id="${row.id}">
        <div class="gm-row">
          <span class="gm-row-index">${String(index + 1).padStart(2, "0")}</span>
          <input data-key="text" value="${escapeHtml(row.text)}" aria-label="第 ${index + 1} 行文字">
          <input data-key="hold" type="number" min="0" max="5000" step="10" value="${row.hold}" aria-label="第 ${index + 1} 行停留毫秒">
          <button data-action="up" type="button" aria-label="上移">↑</button>
          <button data-action="down" type="button" aria-label="下移">↓</button>
          <button data-action="delete" type="button" aria-label="删除">×</button>
        </div>
        <div class="gm-row-meta">
          <button class="gm-row-target${state.activeRowId === row.id ? " is-active" : ""}" data-action="target" type="button">＋ 插入图标</button>
          <button class="gm-row-pause" data-action="pause-row" type="button">暂停修改</button>
          <span class="gm-row-icon-count">${(row.icons || []).length} 个图标</span>
        </div>
        <div class="gm-row-icons">${(row.icons || []).map((icon) => {
          const asset = libraryAsset(icon.libraryId);
          const name = escapeHtml(asset?.name || "图标");
          return `<div class="gm-inline-icon-chip"><img src="${escapeHtml(asset?.url || "")}" alt=""><strong>${name}</strong><span>位置 ${icon.boundary}</span><button class="gm-inline-icon-edit" data-action="edit-icon" data-icon-id="${icon.id}" type="button" aria-label="编辑${name}">编辑</button></div>`;
        }).join("")}</div>
      </div>`).join("");
    updateInsertTargetLabel();
  }

  function allInsertedIcons() {
    return state.scheme.rows.flatMap((row, rowIndex) => (row.icons || []).map((icon) => ({ icon, row, rowIndex })));
  }

  function activeIconEntry() {
    return allInsertedIcons().find(({ icon }) => icon.id === state.activeIconId) || null;
  }

  function renderSelectedAssets() {
    const entries = allInsertedIcons();
    $("selectedIconCount").textContent = String(entries.length);
    $("selectedIconItems").innerHTML = entries.length ? entries.map(({ icon, row, rowIndex }) => {
      const asset = libraryAsset(icon.libraryId);
      return `<div class="gm-selected-icon" data-icon-id="${icon.id}">
        <img src="${escapeHtml(asset?.url || "")}" alt="">
        <div><strong>${escapeHtml(asset?.name || "图标")}</strong><small>第 ${String(rowIndex + 1).padStart(2, "0")} 行 · 边界 ${icon.boundary} · ${icon.size}% · 间距 ${icon.gap}</small></div>
        <div class="gm-selected-icon-actions"><button data-action="edit-icon" type="button">单独编辑</button><button data-action="remove-icon" type="button" aria-label="删除">×</button></div>
      </div>`;
    }).join("") : '<p class="gm-help">还没有插入图标。先从下方图库选择，再点击“插入到光标”。</p>';
    renderAssetEditor();
  }

  function renderIconLibrary() {
    const groups = window.STGIconLibrary?.groups || {};
    const labels = { flow: "流动图标", gifMotion: "GIF 动图", animals: "透明动物", bots: "Bot 动态图标" };
    $("iconLibrary").innerHTML = ["flow", "gifMotion", "animals", "bots"].map((groupName, groupIndex) => {
      const assets = groups[groupName] || [];
      return `<details class="gm-icon-group"${groupIndex === 0 ? " open" : ""}><summary>${labels[groupName]} · ${assets.length}</summary><div class="gm-asset-library me-asset-library">${assets.map((asset) => {
        const selected = state.librarySelectionId === asset.libraryId;
        return `<div class="gm-asset-choice-wrap${selected ? " is-selected" : ""}" data-library-id="${asset.libraryId}">
          <button class="gm-asset-choice me-asset-choice${selected ? " is-selected" : ""}" data-library-id="${asset.libraryId}" type="button"><img src="${escapeHtml(asset.url)}" alt=""><span>${escapeHtml(asset.name)}</span></button>
          <button class="gm-asset-quick-insert" data-quick-insert="${asset.libraryId}" type="button" aria-label="插入${escapeHtml(asset.name)}">＋ 插入</button>
        </div>`;
      }).join("")}</div></details>`;
    }).join("");
    renderLibrarySelection();
  }

  function renderLibrarySelection() {
    const asset = libraryAsset(state.librarySelectionId);
    $("librarySelectionPreview").innerHTML = asset ? `<img src="${escapeHtml(asset.url)}" alt="">` : "＋";
    $("librarySelectionName").textContent = asset?.name || "请先选择图标";
    $("insertSelectedIcon").disabled = !asset || !state.activeRowId;
    $("iconLibrary").querySelectorAll(".gm-asset-choice-wrap").forEach((wrapper) => {
      const selected = wrapper.dataset.libraryId === state.librarySelectionId;
      wrapper.classList.toggle("is-selected", selected);
      wrapper.querySelector(".gm-asset-choice")?.classList.toggle("is-selected", selected);
    });
    updateInsertTargetLabel();
  }

  function updateInsertTargetLabel() {
    const rowIndex = state.scheme.rows.findIndex((row) => row.id === state.activeRowId);
    const row = state.scheme.rows[rowIndex] || state.scheme.rows[0];
    if (!row || !$("insertTargetLabel")) return;
    const length = split(row.text).length;
    const boundary = clamp(state.caretBoundary, 0, length);
    const position = boundary === 0 ? "文字开头" : boundary === length ? "文字末尾" : `第 ${boundary} 字后`;
    $("insertTargetLabel").textContent = `目标：第 ${String(Math.max(0, rowIndex) + 1).padStart(2, "0")} 行 · ${position}`;
  }

  function boundaryOptions(row, selected) {
    const glyphs = split(row.text);
    return Array.from({ length: glyphs.length + 1 }, (_, boundary) => {
      const label = boundary === 0 ? "文字开头" : boundary === glyphs.length ? "文字末尾" : `第 ${boundary} 字“${glyphs[boundary - 1]}”之后`;
      return `<option value="${boundary}"${boundary === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
  }

  function renderAssetEditor() {
    const entry = activeIconEntry();
    const drawer = $("iconAssetDrawer");
    $("iconLibraryBrowse").hidden = Boolean(entry);
    if (!entry) {
      drawer.hidden = true;
      return;
    }
    const { icon, row } = entry;
    drawer.hidden = false;
    const asset = libraryAsset(icon.libraryId);
    $("activeIconName").textContent = asset?.name || "图标";
    $("iconRow").innerHTML = state.scheme.rows.map((item, index) => `<option value="${item.id}"${item.id === row.id ? " selected" : ""}>第 ${String(index + 1).padStart(2, "0")} 行 · ${escapeHtml(item.text || "空白")}</option>`).join("");
    $("iconBoundary").innerHTML = boundaryOptions(row, icon.boundary);
    [["iconSize", icon.size, "%"], ["iconGap", icon.gap, "px"], ["iconX", icon.x, "%"], ["iconY", icon.y, "%"]].forEach(([id, value, suffix]) => { $(id).value = String(value); const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = `${value}${suffix}`; });
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
    renderIconLibrary();
    renderSelectedAssets();
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
      rows: scheme.rows.map((row) => {
        const text = String(row.text ?? "");
        const glyphCount = split(text).length;
        const seen = new Set();
        const icons = (Array.isArray(row.icons) ? row.icons : []).map((icon) => ({
          id: icon.id || uid(), libraryId: String(icon.libraryId || ""), boundary: clamp(Math.round(Number(icon.boundary) || 0), 0, glyphCount),
          size: clamp(Number(icon.size) || 90, 20, 220), gap: clamp(Number(icon.gap) || 12, 0, 80), x: clamp(Number(icon.x) || 0, -100, 100), y: clamp(Number(icon.y) || 0, -100, 100)
        })).filter((icon) => libraryAsset(icon.libraryId) && !seen.has(icon.libraryId) && seen.add(icon.libraryId));
        return { id: row.id || uid(), text, hold: clamp(Number(row.hold) || 0, 0, 5000), icons };
      })
    };
    if (state.scheme.rows.length < 2) state.scheme.rows.push({ id: uid(), text: "", hold: 100, icons: [] });
    if (!state.scheme.rows.some((row) => row.id === state.activeRowId)) state.activeRowId = state.scheme.rows[0].id;
    state.caretBoundary = clamp(state.caretBoundary, 0, split(state.scheme.rows.find((row) => row.id === state.activeRowId)?.text || "").length);
    state.activeIconId = "";
    state.elapsedMs = 0;
    syncControlsFromState();
    preloadInsertedAssets().then(resizePreview);
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
      script.onload = () => window.HME?.createH264MP4Encoder
        ? resolve()
        : reject(new Error("MP4 编码器初始化失败"));
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
    const rowElement = event.target.closest(".gm-row-shell");
    const row = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!row) return;
    row[event.target.dataset.key] = event.target.dataset.key === "hold" ? clamp(Number(event.target.value) || 0, 0, 5000) : event.target.value;
    if (event.target.dataset.key === "text") {
      const glyphCount = split(row.text).length;
      (row.icons || []).forEach((icon) => { icon.boundary = clamp(icon.boundary, 0, glyphCount); });
      state.activeRowId = row.id;
      state.caretBoundary = split(row.text.slice(0, event.target.selectionStart ?? row.text.length)).length;
      updateInsertTargetLabel();
      renderSelectedAssets();
    }
    state.elapsedMs = 0;
    renderTimeline();
    autoSave();
  });
  function captureCaret(input) {
    const rowElement = input.closest(".gm-row-shell");
    const row = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!row) return;
    state.activeRowId = row.id;
    state.caretBoundary = split(row.text.slice(0, input.selectionStart ?? row.text.length)).length;
    document.querySelectorAll(".gm-row-target").forEach((button) => button.classList.toggle("is-active", button.closest(".gm-row-shell")?.dataset.rowId === row.id));
    renderLibrarySelection();
  }
  ["focusin", "click", "keyup", "select"].forEach((eventName) => $("sequenceRows").addEventListener(eventName, (event) => {
    if (event.target.matches('input[data-key="text"]')) captureCaret(event.target);
  }));
  $("sequenceRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const rowElement = button?.closest(".gm-row-shell");
    if (!button || !rowElement) return;
    const index = state.scheme.rows.findIndex((item) => item.id === rowElement.dataset.rowId);
    if (button.dataset.action === "edit-icon") { openIconEditor(button.dataset.iconId); return; }
    if (button.dataset.action === "pause-row") {
      const row = state.scheme.rows[index];
      if (row) {
        state.activeRowId = row.id;
        seekToRowStart(index, true);
      }
      return;
    }
    if (button.dataset.action === "target") {
      const row = state.scheme.rows[index];
      const input = rowElement.querySelector('input[data-key="text"]');
      state.activeRowId = row.id;
      state.caretBoundary = split(row.text.slice(0, input.selectionStart ?? row.text.length)).length;
      renderRows(); renderLibrarySelection();
      setIconLibraryDrawer(true);
      return;
    }
    if (button.dataset.action === "delete" && state.scheme.rows.length > 2) {
      state.scheme.rows.splice(index, 1);
      if (!state.scheme.rows.some((row) => row.id === state.activeRowId)) state.activeRowId = state.scheme.rows[Math.max(0, index - 1)].id;
    }
    if (button.dataset.action === "up" && index > 0) [state.scheme.rows[index - 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index - 1]];
    if (button.dataset.action === "down" && index < state.scheme.rows.length - 1) [state.scheme.rows[index + 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index + 1]];
    state.elapsedMs = 0;
    renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); resizePreview();
  });
  $("addRow").addEventListener("click", () => {
    const row = { id: uid(), text: "新文字", hold: 100, icons: [] };
    state.scheme.rows.push(row);
    state.activeRowId = row.id; state.caretBoundary = split(row.text).length;
    renderRows(); renderSelectedAssets(); renderTimeline(); autoSave();
    $("sequenceRows").lastElementChild?.querySelector('input[data-key="text"]')?.select();
  });

  function setLayerManager(expanded) {
    $("iconLayerPanel").classList.toggle("is-list-expanded", expanded);
    $("toggleSelectedIcons").setAttribute("aria-expanded", String(expanded));
    $("toggleSelectedIcons").textContent = expanded ? "收起已选" : "展开已选";
    if (!expanded) { state.activeIconId = ""; renderAssetEditor(); }
  }
  function setIconLibraryDrawer(open) {
    const drawer = $("iconLibraryDrawer");
    drawer.hidden = !open;
    document.body.classList.toggle("gm-library-open", open);
    $("openIconLibrary").setAttribute("aria-expanded", String(open));
    $("openIconLibraryLarge").setAttribute("aria-expanded", String(open));
    if (!open) {
      state.activeIconId = "";
      renderAssetEditor();
    }
    requestAnimationFrame(resizePreview);
  }
  function openIconEditor(iconId) {
    const entry = allInsertedIcons().find(({ icon }) => icon.id === iconId);
    if (!entry) return;
    state.activeRowId = entry.row.id;
    state.caretBoundary = clamp(entry.icon.boundary, 0, split(entry.row.text).length);
    state.activeIconId = iconId;
    seekToRowStart(entry.rowIndex, true);
    setIconLibraryDrawer(true);
    renderAssetEditor();
    renderRows();
    renderSelectedAssets();
  }
  function removeIcon(iconId) {
    state.scheme.rows.forEach((row) => { row.icons = (row.icons || []).filter((icon) => icon.id !== iconId); });
    if (state.activeIconId === iconId) state.activeIconId = "";
    renderRows(); renderSelectedAssets(); autoSave(); resizePreview();
  }

  function insertSelectedIconAtCaret() {
    const row = state.scheme.rows.find((item) => item.id === state.activeRowId);
    const asset = libraryAsset(state.librarySelectionId);
    if (!row || !asset) return;
    if ((row.icons || []).some((icon) => icon.libraryId === asset.libraryId)) {
      $("exportStatus").textContent = `“${asset.name}”已经在这一行；可在单独编辑中移动它。`;
      return;
    }
    const icon = { id: uid(), libraryId: asset.libraryId, boundary: clamp(state.caretBoundary, 0, split(row.text).length), size: 90, gap: 12, x: 0, y: 0 };
    row.icons = [...(row.icons || []), icon];
    loadAssetResource(asset).then(resizePreview);
    const rowElement = document.querySelector(`.gm-row-shell[data-row-id="${row.id}"]`);
    if (rowElement) {
      const input = rowElement.querySelector('input[data-key="text"]');
      if (input) state.caretBoundary = split(row.text.slice(0, input.selectionStart ?? row.text.length)).length;
    }
    renderRows(); renderSelectedAssets(); autoSave(); resizePreview();
    $("exportStatus").textContent = `已将“${asset.name}”插入第 ${state.scheme.rows.indexOf(row) + 1} 行。`;
  }

  $("iconLibrary").addEventListener("click", (event) => {
    const quickInsert = event.target.closest("button[data-quick-insert]");
    if (quickInsert) {
      state.librarySelectionId = quickInsert.dataset.quickInsert;
      renderLibrarySelection();
      insertSelectedIconAtCaret();
      return;
    }
    const choice = event.target.closest("button[data-library-id]");
    if (!choice) return;
    state.librarySelectionId = choice.dataset.libraryId;
    renderLibrarySelection();
  });
  $("insertSelectedIcon").addEventListener("click", insertSelectedIconAtCaret);
  $("toggleSelectedIcons").addEventListener("click", () => setLayerManager(!$("iconLayerPanel").classList.contains("is-list-expanded")));
  ["openIconLibrary", "openIconLibraryLarge"].forEach((id) => $(id).addEventListener("click", () => setIconLibraryDrawer(true)));
  $("closeIconLibrary").addEventListener("click", () => setIconLibraryDrawer(false));
  $("selectedIconItems").addEventListener("click", (event) => {
    const row = event.target.closest("[data-icon-id]");
    const button = event.target.closest("button[data-action]");
    if (!row || !button) return;
    if (button.dataset.action === "edit-icon") openIconEditor(row.dataset.iconId);
    if (button.dataset.action === "remove-icon") removeIcon(row.dataset.iconId);
  });
  $("closeIconDrawer").addEventListener("click", () => { state.activeIconId = ""; renderAssetEditor(); renderSelectedAssets(); });
  $("removeActiveIcon").addEventListener("click", () => { if (state.activeIconId) removeIcon(state.activeIconId); });
  $("iconRow").addEventListener("change", () => {
    const entry = activeIconEntry();
    const targetRow = state.scheme.rows.find((row) => row.id === $("iconRow").value);
    if (!entry || !targetRow || targetRow.id === entry.row.id) return;
    if ((targetRow.icons || []).some((icon) => icon.libraryId === entry.icon.libraryId)) { $("exportStatus").textContent = "目标行已经有同一个图标。"; renderAssetEditor(); return; }
    entry.row.icons = entry.row.icons.filter((icon) => icon.id !== entry.icon.id);
    entry.icon.boundary = clamp(entry.icon.boundary, 0, split(targetRow.text).length);
    targetRow.icons = [...(targetRow.icons || []), entry.icon];
    renderRows(); renderSelectedAssets(); autoSave(); resizePreview();
  });
  $("iconBoundary").addEventListener("change", () => {
    const entry = activeIconEntry(); if (!entry) return;
    entry.icon.boundary = clamp(Number($("iconBoundary").value), 0, split(entry.row.text).length);
    renderRows(); renderSelectedAssets(); autoSave(); resizePreview();
  });
  [["iconSize", "size", "%"], ["iconGap", "gap", "px"], ["iconX", "x", "%"], ["iconY", "y", "%"]].forEach(([id, key, suffix]) => {
    $(id).addEventListener("input", () => {
      const entry = activeIconEntry(); if (!entry) return;
      entry.icon[key] = Number($(id).value);
      const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = `${entry.icon[key]}${suffix}`;
      autoSave(); resizePreview();
    });
    $(id).addEventListener("change", () => { renderRows(); renderSelectedAssets(); });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.activeIconId) { state.activeIconId = ""; renderAssetEditor(); renderSelectedAssets(); return; }
    if ($("iconLayerPanel").classList.contains("is-list-expanded")) { setLayerManager(false); return; }
    if (document.body.classList.contains("gm-library-open")) setIconLibraryDrawer(false);
  });

  $("scrubber").addEventListener("input", () => {
    state.elapsedMs = Number($("scrubber").value);
    state.playing = false;
    updatePlaybackButton();
    resizePreview();
  });
  $("togglePlayback").addEventListener("click", () => { state.playing = !state.playing; state.lastFrame = performance.now(); updatePlaybackButton(); });
  $("restartPreview").addEventListener("click", () => { seekToRowStart(0, false); });
  $("toggleInspector").addEventListener("click", () => {
    if (!document.body.classList.contains("gm-inspector-hidden")) setIconLibraryDrawer(false);
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
  $("clearScheme").addEventListener("click", () => {
    const cleared = clone(state.scheme);
    cleared.rows = [{ id: uid(), text: "", hold: 100, icons: [] }, { id: uid(), text: "", hold: 100, icons: [] }];
    applyScheme(cleared, "全部文字内容已清空，当前样式与画布保持不变。" );
  });

  $("exportPng").addEventListener("click", async () => {
    await preloadInsertedAssets();
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
      await preloadInsertedAssets();
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
    const requestedFps = Number($("exportFps").value);
    const fps = [24, 30, 60].includes(requestedFps) ? requestedFps : 30;
    const total = Math.max(1, Math.ceil(exportSeconds() * fps));
    let encoder = null;
    setBusy(true, "正在加载 MP4 编码器…");
    try {
      await loadH264Encoder();
      await preloadInsertedAssets();
      encoder = await window.HME.createH264MP4Encoder();
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.max(8000, Math.min(30000, Math.round(output.width * output.height * fps * 0.18 / 1000)));
      encoder.groupOfPictures = Math.max(12, Math.round(fps / 2));
      encoder.outputFilename = `glyph-morph-${output.width}x${output.height}-${fps}fps.mp4`;
      encoder.initialize();
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      const progressInterval = Math.max(1, Math.floor(fps / 10));
      for (let index = 0; index < total; index += 1) {
        renderFrame(output, index / fps, output.width, output.height);
        encoder.addFrameRgba(outputContext.getImageData(0, 0, output.width, output.height).data);
        if (index % progressInterval === 0 || index === total - 1) {
          $("exportStatus").textContent = `正在导出 MP4 ${output.width} × ${output.height} · ${fps}fps · ${Math.round((index + 1) / total * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const mp4 = encoder.FS.readFile(encoder.outputFilename);
      download(new Blob([mp4], { type: "video/mp4" }), encoder.outputFilename);
      setBusy(false, `MP4 已生成 · ${output.width} × ${output.height} · ${fps}fps · ${(mp4.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      console.error(error); setBusy(false, `MP4 生成失败：${error.message}`);
    } finally { try { encoder?.delete(); } catch (_) {} }
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
    renderIconLibrary();
    applyScheme(useDefault || !stored?.rows || Number(stored.version || 1) > VERSION ? clone(DEFAULT_SCHEME) : stored);
    if (state.reducedMotion) { state.playing = false; state.elapsedMs = state.scheme.motion.morphDuration; updatePlaybackButton(); }
    new ResizeObserver(resizePreview).observe(frame);
    document.fonts?.ready.then(resizePreview);
    window.addEventListener("resize", resizePreview, { passive: true });
    window.__glyphMorphTest = { renderFrame, resolveTimeline, matchGlyphs, getScheme: () => clone(state.scheme), cycleDurationMs, rowStartElapsed, preloadInsertedAssets, setTime: (seconds) => { state.elapsedMs = seconds * 1000; resizePreview(); } };
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
