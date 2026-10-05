(() => {
  "use strict";

  // City Stack editor. Rows are the lines of the tower; every row owns its text,
  // role, typography, color, layout and neon timing. Preview and export share
  // renderFrame() and the same deterministic clock.
  const $ = (id) => document.getElementById(id);
  const VERSION = 1;
  const SLUG = "citystack";
  const STORAGE_KEY = `me-motion-${SLUG}-v1`;
  const BASE = { width: 1080, height: 1480 };
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const split = (value) => segmenter ? Array.from(segmenter.segment(String(value)), ({ segment }) => segment) : Array.from(String(value));
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `city-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalizeColor = (value, fallback = "#ffffff") => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const number = (value, fallback, min, max) => { const result = Number(value); return clamp(Number.isFinite(result) ? result : fallback, min, max); };
  const LETTERING = "hk-lettering";

  const ROLES = {
    han: { label: "主汉字 · 逐字点亮", short: "主汉字", phase: "汉字点亮" },
    english: { label: "英文行 · 整行点亮", short: "英文行", phase: "英文点亮" },
    subtitle: { label: "副标题 · 两端先亮", short: "副标题", phase: "副标题点亮" },
    footer: { label: "署名 · 最后淡入", short: "署名", phase: "署名淡入" }
  };
  const HOLD_PHASE = "结果定格";
  const PHASE_FILL = { "汉字点亮": "#d7ff2f", "英文点亮": "#8ec8ff", "副标题点亮": "#9de7d7", "署名淡入": "#ffc4d6", [HOLD_PHASE]: "#ffd27d" };
  const WEIGHTS = [["", "字体默认"], ["300", "Light 300"], ["400", "Regular 400"], ["500", "Medium 500"], ["600", "Semibold 600"], ["700", "Bold 700"], ["750", "Bold 750 · 原片"], ["800", "Extra Bold 800"], ["900", "Black 900"]];
  const ROW_NUMBERS = {
    size: [20, 400], scaleY: [30, 250], widthRatio: [0, 160], letterGap: [-60, 160], gapBefore: [-120, 800], fadeStart: [0, 20000], fadeDuration: [0, 5000]
  };

  const row = (id, text, role, extra = {}) => ({
    id, text, role, fontFamily: "", fontWeight: "", textColor: "#4cebfa", size: 160, scaleY: 100, widthRatio: 100, letterGap: 0, gapBefore: 29,
    starts: "", offs: "", fadeStart: 0, fadeDuration: 350, icons: [], ...extra
  });
  // Approved HK reference lockup (HK动效 reference, measured 2026-10-05). Keep synchronized with assets/presets/citystack-default.json.
  const DEFAULT_SCHEME = Object.freeze({
    version: VERSION,
    canvas: { width: 1080, height: 1920, preset: "1080x1920" },
    typography: { fontFamily: "stg:noto-hk", lineWidth: 490, layoutScale: 100, positionX: 0, positionY: 0, textColor: "#4cebfa" },
    motion: { leadIn: 60, finalHold: 2490, speed: 1, loop: true },
    background: { color: "#000000", media: null, opacity: 100 },
    rows: [
      row("city-han-1", "只在", "han", { fontFamily: LETTERING, fontWeight: "500", size: 250, scaleY: 96, widthRatio: 105, letterGap: 8, gapBefore: 0, starts: "0,333", offs: "100-233; 133-167" }),
      row("city-han-2", "香港", "han", { fontFamily: LETTERING, fontWeight: "500", size: 250, scaleY: 128, widthRatio: 105, letterGap: 8, gapBefore: 29, starts: "500,700", offs: "33-133; 300-333" }),
      row("city-en-1", "HONG", "english", { fontFamily: "stg:montserrat", fontWeight: "700", size: 165, gapBefore: 31, starts: "900", offs: "500-533,567-600" }),
      row("city-en-2", "KONG", "english", { fontFamily: "stg:montserrat", fontWeight: "700", size: 165, gapBefore: 29, starts: "1133", offs: "100-267,667-733" }),
      row("city-sub", "亚洲国际都会", "subtitle", { fontFamily: "stg:noto-hk", fontWeight: "750", size: 77, letterGap: 9, gapBefore: 29, starts: "1467,1533,1700", offs: "167-267; 133-300; " }),
      row("city-footer", "discoverhongkong.cn", "footer", { fontFamily: "stg:albert-sans", fontWeight: "600", textColor: "#ffffff", size: 58, widthRatio: 0, gapBefore: 222, fadeStart: 1936, fadeDuration: 350 })
    ]
  });

  const state = {
    scheme: clone(DEFAULT_SCHEME),
    playing: true,
    elapsedMs: 0,
    lastFrame: performance.now(),
    exportBusy: false,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    activeRowId: DEFAULT_SCHEME.rows[0].id,
    previewMode: false,
    fontsVersion: 0,
    background: null,
    caretBoundary: split(DEFAULT_SCHEME.rows[0].text).length,
    librarySelectionId: "",
    activeIconId: "",
    imageCache: new Map()
  };

  const canvas = $("glyphMorphCanvas");
  const frame = $("compositionFrame");
  const context = canvas.getContext("2d");
  const library = () => window.STGFontLibrary;
  const controlIds = ["fontFamily", "lineWidth", "layoutScale", "positionX", "positionY", "leadIn", "finalHold", "speed", "loop", "textColor", "backgroundColor", "backgroundOpacity"];
  const controls = Object.fromEntries(controlIds.map((id) => [id, $(id)]));

  // ---------- Fonts ----------
  function fontKey(rowState) { return rowState.fontFamily || state.scheme.typography.fontFamily; }
  function isLettering(rowState) { return fontKey(rowState) === LETTERING; }
  function fontFace(rowState) {
    const key = isLettering(rowState) ? "stg:noto-hk" : fontKey(rowState);
    const preset = library()?.preset(key) || { family: "STG Noto Sans HK", weight: 500, style: "normal" };
    return { family: `"${preset.family}","STG Noto Sans HK",${library()?.fallbackStack || "sans-serif"}`, weight: Number(rowState.fontWeight) || preset.weight || 500, style: preset.style || "normal" };
  }
  function fontString(rowState, size) {
    const face = fontFace(rowState);
    return `${face.style} ${face.weight} ${size}px ${face.family}`;
  }
  function normalizeFontValue(value) {
    if (value === LETTERING) return LETTERING;
    return window.MERowFonts?.normalize(value) || "";
  }
  // Load only each row's own face (plus the HK face for Chinese typed in a Latin font);
  // passing the whole fallback stack to fonts.load() would download every CJK fallback.
  async function refreshFonts() {
    if (!document.fonts?.load) return;
    const loads = new Map();
    state.scheme.rows.forEach((item) => {
      const key = isLettering(item) ? "stg:noto-hk" : fontKey(item);
      const preset = library()?.preset(key) || { family: "STG Noto Sans HK", style: "normal" };
      const face = fontFace(item);
      const text = item.text || "Aa";
      const add = (family) => { const css = `${face.style} ${face.weight} 64px "${family}"`; loads.set(css, (loads.get(css) || "") + text); };
      add(preset.family);
      if (/[㐀-鿿]/u.test(text) && preset.family !== "STG Noto Sans HK") add("STG Noto Sans HK");
    });
    await Promise.all(Array.from(loads, ([css, text]) => document.fonts.load(css, text).catch(() => null)));
    state.fontsVersion += 1;
    measureCache.clear();
    resizePreview();
  }
  function letteringFontOption(selected) {
    return `<optgroup label="原片字形"><option value="${LETTERING}"${selected === LETTERING ? " selected" : ""}>原片字形 · 只在香港</option></optgroup>`;
  }
  function ensureGlobalFontOption() {
    const select = controls.fontFamily;
    library()?.enhanceSelect(select);
    if (!select.querySelector(`option[value="${LETTERING}"]`)) select.insertAdjacentHTML("afterbegin", letteringFontOption(""));
  }

  // ---------- Inline icons (shared icon library, row-owned) ----------
  function libraryAsset(libraryId) { return window.STGIconLibrary?.byId?.get(libraryId) || null; }
  function rowTokens(rowState) {
    const glyphs = split(rowState.text);
    const buckets = new Map();
    (rowState.icons || []).forEach((icon) => {
      const boundary = clamp(Math.round(Number(icon.boundary) || 0), 0, glyphs.length);
      if (!buckets.has(boundary)) buckets.set(boundary, []);
      buckets.get(boundary).push(icon);
    });
    const tokens = [];
    for (let boundary = 0; boundary <= glyphs.length; boundary += 1) {
      (buckets.get(boundary) || []).forEach((icon) => tokens.push({ type: "icon", icon, boundary }));
      if (boundary < glyphs.length) tokens.push({ type: "glyph", glyph: glyphs[boundary], characterIndex: boundary });
    }
    return tokens;
  }
  async function loadAssetResource(asset) {
    if (!asset || asset.kind === "vector") return null;
    if (state.imageCache.has(asset.libraryId)) return state.imageCache.get(asset.libraryId);
    const promise = (async () => {
      const fallbackPromise = new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = asset.url;
      });
      if (/gif/i.test(asset.fileType || "") && window.CellMotionAnimatedImage) {
        try { return { ...await window.CellMotionAnimatedImage.decode({ url: asset.url, type: asset.fileType }), fallbackImage: await fallbackPromise }; }
        catch (error) { console.warn(`动态图标解码回退：${asset.name}`, error); }
      }
      return { kind: "image", image: await fallbackPromise };
    })();
    state.imageCache.set(asset.libraryId, promise);
    const resource = await promise;
    state.imageCache.set(asset.libraryId, resource);
    return resource;
  }
  async function preloadInsertedAssets() {
    const ids = new Set(state.scheme.rows.flatMap((item) => (item.icons || []).map((icon) => icon.libraryId)));
    await Promise.all(Array.from(ids, (id) => loadAssetResource(libraryAsset(id))));
  }
  function drawableImage(resource, timeSeconds) {
    if (!resource) return null;
    if (resource.kind === "image") return resource.image;
    if (resource.kind === "frames") return window.CellMotionAnimatedImage?.frameAt(resource, timeSeconds) || resource.frames[0]?.image;
    return resource.fallbackImage || null;
  }
  function drawIcon(ctx, icon, x, y, size, color, timeSeconds) {
    const asset = libraryAsset(icon.libraryId);
    ctx.save();
    ctx.translate(x, y);
    if (asset?.kind === "vector") window.STGIconLibrary.drawVector(ctx, asset, size, timeSeconds);
    else {
      const cached = state.imageCache.get(icon.libraryId);
      const image = drawableImage(cached && typeof cached.then !== "function" ? cached : null, timeSeconds);
      if (image) {
        const naturalWidth = image.displayWidth || image.naturalWidth || image.width || 1;
        const naturalHeight = image.displayHeight || image.naturalHeight || image.height || 1;
        const fit = size / Math.max(naturalWidth, naturalHeight);
        ctx.drawImage(image, -naturalWidth * fit / 2, -naturalHeight * fit / 2, naturalWidth * fit, naturalHeight * fit);
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, size * 0.05);
        ctx.strokeRect(-size * 0.32, -size * 0.32, size * 0.64, size * 0.64);
      }
    }
    ctx.restore();
  }

  // ---------- Units and timing (composition milliseconds) ----------
  function visibleIndices(text) {
    return split(text).map((glyph, index) => [glyph, index]).filter(([glyph]) => !/^\s+$/u.test(glyph)).map(([, index]) => index);
  }
  function subtitleGroups(indices) {
    if (indices.length <= 2) return indices.length ? [indices] : [];
    const used = new Set(), groups = [];
    const push = (positions) => {
      const clean = positions.filter((position) => position >= 0 && position < indices.length && !used.has(position));
      if (clean.length) { clean.forEach((position) => used.add(position)); groups.push(clean.map((position) => indices[position])); }
    };
    push([0, 1]); push([indices.length - 2, indices.length - 1]);
    for (let position = 2; position < indices.length - 2; position += 2) push([position, position + 1]);
    return groups;
  }
  function rowUnits(rowState) {
    const indices = visibleIndices(rowState.text);
    if (!indices.length) return [];
    if (rowState.role === "han") return indices.map((index) => [index]);
    if (rowState.role === "subtitle") return subtitleGroups(indices);
    return [indices];
  }
  function csvNumbers(value) { return String(value || "").split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean).map(Number).filter(Number.isFinite); }
  function parseOffs(value) {
    return String(value || "").split(/[,，]/).map((pair) => pair.trim().match(/^(\d+(?:\.\d+)?)\s*[-~–]\s*(\d+(?:\.\d+)?)$/)).filter(Boolean)
      .map((match) => ({ from: Number(match[1]), to: Number(match[2]) })).filter((item) => item.to > item.from);
  }
  function rowSchedule(rowState) {
    const leadIn = state.scheme.motion.leadIn;
    const units = rowUnits(rowState);
    if (rowState.role === "footer") {
      const start = leadIn + rowState.fadeStart;
      return { kind: "fade", units, start, duration: rowState.fadeDuration, end: start + rowState.fadeDuration, items: [] };
    }
    const starts = csvNumbers(rowState.starts);
    const offLists = String(rowState.offs || "").split(/[;；]/);
    const step = starts.length > 1 ? Math.max(0, (starts[starts.length - 1] - starts[0]) / (starts.length - 1)) : 200;
    let previous = starts.length ? starts[0] - step : 0;
    const items = units.map((unit, index) => {
      const relative = starts[index] ?? (index === 0 ? 0 : previous + step);
      previous = relative;
      const offs = index < offLists.length ? parseOffs(offLists[index]) : [{ from: 100, to: 233 }];
      const start = leadIn + Math.max(0, relative);
      const item = { unit, start, offs: offs.map((off) => ({ from: start + off.from, to: start + off.to })) };
      item.end = Math.max(start, ...item.offs.map((off) => off.to));
      return item;
    });
    const start = items.length ? Math.min(...items.map((item) => item.start)) : leadIn;
    const end = items.length ? Math.max(...items.map((item) => item.end)) : leadIn;
    return { kind: "neon", units, items, start, end };
  }
  function schedules() { return state.scheme.rows.map((item) => ({ row: item, schedule: rowSchedule(item) })); }
  function contentEndComposition() { return Math.max(state.scheme.motion.leadIn, ...schedules().map(({ schedule }) => schedule.end)); }
  function cycleDurationMs() { return (contentEndComposition() + state.scheme.motion.finalHold) / Math.max(0.01, state.scheme.motion.speed); }
  function compositionTime(elapsedMs) {
    const total = cycleDurationMs();
    const local = state.scheme.motion.loop ? ((elapsedMs % total) + total) % total : Math.min(elapsedMs, total);
    return local * Math.max(0.01, state.scheme.motion.speed);
  }
  function stableElapsed() { return contentEndComposition() / Math.max(0.01, state.scheme.motion.speed) + 1; }

  // ---------- Measurement (logical units, vector-drawn later) ----------
  const measureCache = new Map();
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d", { willReadFrequently: true });
  function drawGlyph(ctx, glyph, x, y, size, lettering) {
    if (lettering && window.CityLettering?.has(glyph)) { window.CityLettering.fill(ctx, glyph, x, y, size); return; }
    ctx.fillText(glyph, x, y);
  }
  function measureRow(rowState) {
    const lettering = isLettering(rowState);
    const font = fontString(rowState, rowState.size);
    const key = [font, rowState.text, rowState.letterGap, lettering, state.fontsVersion, JSON.stringify(rowState.icons || [])].join("|");
    if (measureCache.has(key)) return measureCache.get(key);
    measureContext.setTransform(1, 0, 0, 1, 0, 0);
    measureContext.font = font;
    const size = rowState.size;
    const glyphs = split(rowState.text);
    const tokens = rowTokens(rowState).map((token) => {
      if (token.type === "glyph") return { ...token, width: measureContext.measureText(token.glyph).width };
      const iconSize = size * clamp(Number(token.icon.size) || 90, 20, 220) / 100;
      const gap = clamp(Number(token.icon.gap) || 0, 0, 80);
      return { ...token, iconSize, width: iconSize + gap * 2, offsetX: size * clamp(Number(token.icon.x) || 0, -100, 100) / 100, offsetY: size * clamp(Number(token.icon.y) || 0, -100, 100) / 100 };
    });
    const total = tokens.reduce((sum, token) => sum + token.width, 0) + Math.max(0, tokens.length - 1) * rowState.letterGap;
    const centers = glyphs.map(() => 0);
    let cursor = -total / 2;
    tokens.forEach((token) => { token.center = cursor + token.width / 2; if (token.type === "glyph") centers[token.characterIndex] = token.center; cursor += token.width + rowState.letterGap; });
    const pad = Math.ceil(size * 0.6);
    const width = Math.max(8, Math.min(8192, Math.ceil(total + pad * 2)));
    const height = Math.max(8, Math.ceil(size * 2.4));
    measureCanvas.width = width; measureCanvas.height = height;
    const ctx = measureContext;
    ctx.clearRect(0, 0, width, height);
    ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
    const originX = width / 2, originY = height / 2;
    glyphs.forEach((glyph, index) => drawGlyph(ctx, glyph, originX + centers[index], originY, size, lettering));
    let left = width, right = -1, top = height, bottom = -1;
    if (glyphs.length) {
      const pixels = ctx.getImageData(0, 0, width, height).data;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pixels[(y * width + x) * 4 + 3] >= 128) { if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y; }
        }
      }
    }
    const icons = tokens.filter((token) => token.type === "icon");
    let inkLeft = right < left ? Infinity : left - originX, inkRight = right < left ? -Infinity : right + 1 - originX;
    let inkTop = right < left ? Infinity : top - originY, inkBottom = right < left ? -Infinity : bottom + 1 - originY;
    // Text keeps the tower alignment; icons only define the box of an icon-only row.
    if (right < left) icons.forEach((token) => {
      const half = token.iconSize / 2;
      inkLeft = Math.min(inkLeft, token.center + token.offsetX - half); inkRight = Math.max(inkRight, token.center + token.offsetX + half);
      inkTop = Math.min(inkTop, token.offsetY - half); inkBottom = Math.max(inkBottom, token.offsetY + half);
    });
    const result = !Number.isFinite(inkLeft)
      ? { glyphs, centers, icons, inkLeft: 0, inkRight: 0, inkTop: 0, inkBottom: 0, empty: true }
      : { glyphs, centers, icons, inkLeft, inkRight, inkTop, inkBottom, empty: false };
    measureCache.set(key, result);
    return result;
  }
  function composition(width, height) {
    const { typography } = state.scheme;
    const scale = Math.min(width / BASE.width, height / BASE.height) * typography.layoutScale / 100;
    let cursor = 0, placed = 0;
    const entries = state.scheme.rows.map((rowState) => {
      const metrics = measureRow(rowState);
      const inkWidth = metrics.inkRight - metrics.inkLeft;
      const scaleY = rowState.scaleY / 100;
      const inkHeight = (metrics.inkBottom - metrics.inkTop) * scaleY;
      const targetWidth = rowState.widthRatio > 0 ? typography.lineWidth * rowState.widthRatio / 100 : inkWidth;
      const scaleX = inkWidth > 0 ? targetWidth / inkWidth : 1;
      const top = metrics.empty ? cursor : cursor + (placed ? rowState.gapBefore : 0);
      if (!metrics.empty) { cursor = top + inkHeight; placed += 1; }
      return { row: rowState, metrics, scaleX, scaleY, top, height: metrics.empty ? 0 : inkHeight };
    });
    const centerX = width / 2 + typography.positionX / 100 * width;
    const top = height / 2 + typography.positionY / 100 * height - cursor * scale / 2;
    return { scale, entries, centerX, top };
  }

  // ---------- Background (color + image / GIF / video; cropped and trimmed like 字芽) ----------
  const isVideoMedia = (media) => /^video\//i.test(media?.fileType || "");
  const isGifMedia = (media) => /gif/i.test(media?.fileType || "");
  function normalizeBackgroundMedia(media) {
    if (!media || typeof media !== "object" || !media.url) return null;
    return {
      name: String(media.name || "背景素材"),
      url: String(media.url),
      fileType: String(media.fileType || media.type || "image/png"),
      videoStart: Math.max(0, Number.isFinite(Number(media.videoStart)) ? Number(media.videoStart) : 0),
      videoEnd: Number.isFinite(Number(media.videoEnd)) && Number(media.videoEnd) > 0 ? Number(media.videoEnd) : null,
      cropX: clamp(Number.isFinite(Number(media.cropX)) ? Number(media.cropX) : 0.5),
      cropY: clamp(Number.isFinite(Number(media.cropY)) ? Number(media.cropY) : 0.5),
      cropZoom: clamp(Number.isFinite(Number(media.cropZoom)) ? Number(media.cropZoom) : 1, 1, 4)
    };
  }
  function videoClipBounds(media, duration) {
    const safeDuration = Math.max(0.1, Number(duration) || 0.1);
    const start = clamp(Number(media?.videoStart) || 0, 0, Math.max(0, safeDuration - 0.1));
    const requestedEnd = Number(media?.videoEnd);
    const end = clamp(Number.isFinite(requestedEnd) && requestedEnd > 0 ? Math.max(requestedEnd, start + 0.1) : safeDuration, start + 0.1, safeDuration);
    return { start, end, duration: Math.max(0.1, end - start) };
  }
  function videoClipTime(media, duration, localTime) {
    const clip = videoClipBounds(media, duration);
    return Math.min(clip.end - 0.001, clip.start + (((localTime % clip.duration) + clip.duration) % clip.duration));
  }
  function backgroundRuntime() {
    const media = state.scheme.background.media;
    return media && state.background?.url === media.url ? state.background : null;
  }
  function disposeBackground() {
    const runtime = state.background;
    runtime?.video?.pause();
    runtime?.exportVideo?.pause();
    if (runtime?.resource?.kind === "frames") window.CellMotionAnimatedImage?.dispose(runtime.resource);
    state.background = null;
  }
  function prepareBackground() {
    const media = state.scheme.background.media;
    if (!media) { disposeBackground(); return Promise.resolve(null); }
    if (state.background?.url === media.url) return state.background.promise;
    disposeBackground();
    const runtime = { url: media.url, kind: isVideoMedia(media) ? "video" : "image", resource: null, video: null, exportVideo: null, duration: 0, previewImage: null, exportImage: null, filmstrip: null, filmstripPromise: null, promise: null };
    state.background = runtime;
    if (runtime.kind === "image") {
      runtime.promise = (async () => {
        try {
          const animated = isGifMedia(media) ? await window.CellMotionAnimatedImage?.decode({ url: media.url, type: media.fileType, maxFrames: 600 }) : null;
          if (animated) runtime.resource = animated;
          else { const image = new Image(); image.src = media.url; await image.decode(); runtime.resource = { kind: "image", image }; }
        } catch (error) { console.warn("background", error); }
        return runtime;
      })();
    } else {
      const loadVideo = (key) => new Promise((resolve) => {
        const video = document.createElement("video");
        video.muted = true; video.loop = false; video.playsInline = true; video.preload = "auto";
        const finish = () => { runtime[key] = video; runtime.duration = Number(video.duration) || runtime.duration; resolve(runtime); };
        video.addEventListener("loadeddata", finish, { once: true });
        video.addEventListener("error", () => resolve(runtime), { once: true });
        video.src = media.url;
        video.load();
      });
      runtime.promise = Promise.all([loadVideo("video"), loadVideo("exportVideo")]).then(() => runtime);
    }
    runtime.promise.then(() => { if (state.background === runtime) { refreshMediaUi(); resizePreview(); } });
    return runtime.promise;
  }
  function waitForSeek(video, target, fallbackMs) {
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (typeof video.requestVideoFrameCallback === "function") {
          const fallback = setTimeout(resolve, fallbackMs);
          video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve(); });
        } else requestAnimationFrame(resolve);
      };
      video.addEventListener("seeked", done, { once: true });
      video.currentTime = target;
      setTimeout(done, 800);
    });
  }
  function prepareVideoFilmstrip(runtime) {
    if (!runtime?.url) return Promise.resolve(null);
    if (runtime.filmstrip) return Promise.resolve(runtime.filmstrip);
    if (runtime.filmstripPromise) return runtime.filmstripPromise;
    runtime.filmstripPromise = (async () => {
      const video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "auto";
      await new Promise((resolve, reject) => { video.addEventListener("loadeddata", resolve, { once: true }); video.addEventListener("error", reject, { once: true }); video.src = runtime.url; video.load(); });
      const duration = Number(video.duration) || runtime.duration;
      if (!(duration > 0)) return null;
      const filmstrip = document.createElement("canvas");
      filmstrip.width = 720; filmstrip.height = 96;
      const filmstripContext = filmstrip.getContext("2d");
      const frameCount = 8, frameWidth = filmstrip.width / frameCount;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        await waitForSeek(video, clamp((frameIndex + 0.5) / frameCount * duration, 0, Math.max(0, duration - 0.001)), 120);
        const sourceWidth = video.videoWidth || 1, sourceHeight = video.videoHeight || 1;
        const cover = Math.max(frameWidth / sourceWidth, filmstrip.height / sourceHeight);
        const drawWidth = sourceWidth * cover, drawHeight = sourceHeight * cover;
        filmstripContext.save();
        filmstripContext.beginPath(); filmstripContext.rect(frameIndex * frameWidth, 0, frameWidth, filmstrip.height); filmstripContext.clip();
        filmstripContext.drawImage(video, frameIndex * frameWidth + (frameWidth - drawWidth) / 2, (filmstrip.height - drawHeight) / 2, drawWidth, drawHeight);
        filmstripContext.restore();
      }
      video.pause(); video.removeAttribute("src"); video.load();
      runtime.filmstrip = filmstrip;
      return filmstrip;
    })().catch(() => null);
    return runtime.filmstripPromise;
  }
  function cachePreviewVideoFrame(runtime) {
    const video = runtime?.video;
    if (!video || video.readyState < 2 || video.seeking || !video.videoWidth || !video.videoHeight) return;
    const frameCanvas = runtime.previewImage || document.createElement("canvas");
    if (frameCanvas.width !== video.videoWidth || frameCanvas.height !== video.videoHeight) { frameCanvas.width = video.videoWidth; frameCanvas.height = video.videoHeight; }
    frameCanvas.getContext("2d").drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    runtime.previewImage = frameCanvas;
  }
  function backgroundImageAt(timeSeconds, preview) {
    const media = state.scheme.background.media;
    const runtime = backgroundRuntime();
    if (!media || !runtime) return null;
    if (runtime.kind === "image") {
      const resource = runtime.resource;
      if (!resource) return null;
      return resource.kind === "image" ? resource.image : (window.CellMotionAnimatedImage?.frameAt(resource, timeSeconds) || resource.frames?.[0]?.image || null);
    }
    if (!preview) return runtime.exportImage || runtime.previewImage;
    const video = runtime.video;
    if (!video || video.readyState < 2) return runtime.previewImage;
    const target = videoClipTime(media, runtime.duration || Number(video.duration) || 0, timeSeconds);
    cachePreviewVideoFrame(runtime);
    if (!video.seeking && Math.abs(video.currentTime - target) > 0.16) video.currentTime = target;
    if (state.playing && !state.exportBusy && !video.seeking) {
      video.playbackRate = clamp(Number(state.scheme.motion.speed) || 1, 0.25, 2);
      video.play().catch(() => {});
    } else video.pause();
    cachePreviewVideoFrame(runtime);
    return video.seeking ? runtime.previewImage : video;
  }
  // Export seeks a dedicated video element to the exact clip time of every frame.
  async function prepareBackgroundFrame(timeSeconds) {
    const media = state.scheme.background.media;
    const runtime = backgroundRuntime();
    if (!media || !runtime || runtime.kind !== "video") return;
    await runtime.promise;
    const video = runtime.exportVideo;
    const duration = runtime.duration || Number(video?.duration) || 0;
    if (!video || !(duration > 0)) return;
    const target = videoClipTime(media, duration, timeSeconds);
    if (Math.abs(video.currentTime - target) > 1 / 240) await waitForSeek(video, target, 180);
    const frameCanvas = runtime.exportImage || document.createElement("canvas");
    frameCanvas.width = video.videoWidth || 2; frameCanvas.height = video.videoHeight || 2;
    frameCanvas.getContext("2d").drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    runtime.exportImage = frameCanvas;
  }
  function drawBackgroundLayer(ctx, width, height, image) {
    const background = state.scheme.background;
    ctx.fillStyle = normalizeColor(background.color, "#000000");
    ctx.fillRect(0, 0, width, height);
    if (!image) return;
    const media = background.media;
    const sourceWidth = image.videoWidth || image.width || image.naturalWidth || width;
    const sourceHeight = image.videoHeight || image.height || image.naturalHeight || height;
    const cover = Math.max(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight)) * (media?.cropZoom || 1);
    const drawWidth = sourceWidth * cover, drawHeight = sourceHeight * cover;
    ctx.save();
    ctx.globalAlpha = clamp(background.opacity / 100);
    ctx.drawImage(image, -(drawWidth - width) * (media?.cropX ?? 0.5), -(drawHeight - height) * (media?.cropY ?? 0.5), drawWidth, drawHeight);
    ctx.restore();
  }
  function renderBackground(ctx, width, height, timeSeconds, preview) {
    drawBackgroundLayer(ctx, width, height, backgroundImageAt(timeSeconds, preview));
  }
  function drawCropPreview() {
    const cropCanvas = $("backgroundCropPreview");
    const runtime = backgroundRuntime();
    if (!cropCanvas || !state.scheme.background.media || !runtime) return;
    const ratio = state.scheme.canvas.width / Math.max(1, state.scheme.canvas.height);
    cropCanvas.width = 720;
    cropCanvas.height = Math.max(180, Math.round(720 / ratio));
    cropCanvas.style.aspectRatio = `${state.scheme.canvas.width} / ${state.scheme.canvas.height}`;
    const image = runtime.kind === "video"
      ? (runtime.previewImage || (runtime.video?.readyState >= 2 ? runtime.video : null))
      : backgroundImageAt(state.elapsedMs / 1000, false);
    drawBackgroundLayer(cropCanvas.getContext("2d"), cropCanvas.width, cropCanvas.height, image);
  }

  // ---------- Rendering ----------
  function unitVisible(item, time) {
    return time >= item.start && !item.offs.some((off) => time >= off.from && time < off.to);
  }
  function renderFrame(targetCanvas, timeSeconds, width = targetCanvas.width, height = targetCanvas.height, elapsedMode = true) {
    const ctx = targetCanvas.getContext("2d");
    const time = elapsedMode ? compositionTime(timeSeconds * 1000) : timeSeconds * 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderBackground(ctx, width, height, time / 1000, targetCanvas === canvas);
    const layout = composition(width, height);
    layout.entries.forEach((entry) => {
      if (entry.metrics.empty) return;
      const schedule = rowSchedule(entry.row);
      let alpha = 1;
      let visible;
      if (schedule.kind === "fade") {
        if (time < schedule.start) return;
        const progress = schedule.duration > 0 ? clamp((time - schedule.start) / schedule.duration) : 1;
        alpha = 1 - (1 - progress) ** 2;
        visible = new Set(schedule.units.flat());
      } else {
        visible = new Set(schedule.items.filter((item) => unitVisible(item, time)).flatMap((item) => item.unit));
      }
      if ((!visible.size && !measureRow(entry.row).icons.length) || alpha <= 0) return;
      const { metrics, row: rowState } = entry;
      const lettering = isLettering(rowState);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(layout.centerX, layout.top + (entry.top + entry.height / 2) * layout.scale);
      ctx.scale(layout.scale * entry.scaleX, layout.scale * entry.scaleY);
      ctx.translate(-(metrics.inkLeft + metrics.inkRight) / 2, -(metrics.inkTop + metrics.inkBottom) / 2);
      ctx.font = fontString(rowState, rowState.size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = normalizeColor(rowState.textColor, state.scheme.typography.textColor);
      metrics.glyphs.forEach((glyph, index) => { if (visible.has(index)) drawGlyph(ctx, glyph, metrics.centers[index], 0, rowState.size, lettering); });
      ctx.restore();
      if (!metrics.icons.length) return;
      // Icons follow the glyph before them (or the first glyph), and keep their own square proportions.
      const glyphIndices = visibleIndices(rowState.text);
      const rowCenterY = layout.top + (entry.top + entry.height / 2) * layout.scale;
      const inkCenterX = (metrics.inkLeft + metrics.inkRight) / 2, inkCenterY = (metrics.inkTop + metrics.inkBottom) / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      metrics.icons.forEach((token) => {
        const owner = [...glyphIndices].reverse().find((index) => index < token.boundary) ?? glyphIndices[0];
        const shown = owner == null ? (schedule.kind === "fade" || time >= schedule.start) : visible.has(owner);
        if (!shown) return;
        const x = layout.centerX + (token.center + token.offsetX - inkCenterX) * layout.scale * entry.scaleX;
        const y = rowCenterY + (token.offsetY - inkCenterY) * layout.scale * entry.scaleY;
        drawIcon(ctx, token.icon, x, y, token.iconSize * layout.scale * entry.scaleY, ctx.fillStyle, timeSeconds);
      });
      ctx.restore();
    });
  }

  function resizePreview() {
    const ratio = state.scheme.canvas.width / state.scheme.canvas.height;
    frame.style.setProperty("--gm-aspect", String(ratio));
    const stage = $("glyphMorphStage");
    const stageStyle = getComputedStyle(stage);
    const availableWidth = Math.max(1, stage.clientWidth - parseFloat(stageStyle.paddingLeft) - parseFloat(stageStyle.paddingRight));
    const availableHeight = Math.max(1, stage.clientHeight - parseFloat(stageStyle.paddingTop) - parseFloat(stageStyle.paddingBottom));
    const fittedWidth = Math.min(availableWidth, availableHeight * ratio);
    frame.style.width = `${fittedWidth}px`;
    frame.style.height = `${fittedWidth / ratio}px`;
    frame.style.maxHeight = "none";
    const rect = frame.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2, 2200 / Math.max(1, rect.width, rect.height));
    canvas.width = Math.max(2, Math.round(rect.width * scale));
    canvas.height = Math.max(2, Math.round(canvas.width / ratio));
    stage.style.setProperty("--tc-active-composition-bg", normalizeColor(state.scheme.background.color, "#000000"));
    renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
    drawCropPreview();
  }

  // ---------- Row editor ----------
  function rowSummary(rowState) {
    const schedule = rowSchedule(rowState);
    const speed = Math.max(0.01, state.scheme.motion.speed);
    const range = `${(schedule.start / speed / 1000).toFixed(2)}–${(schedule.end / speed / 1000).toFixed(2)}s`;
    const font = isLettering(rowState) ? "原片字形" : (library()?.preset(fontKey(rowState))?.label || "全局字体").replace(/ · .*$/, "");
    return `${ROLES[rowState.role]?.short || "文字"} · ${font} · ${range}`;
  }
  function fontOptions(rowState) {
    const options = window.MERowFonts?.options(rowState.fontFamily === LETTERING ? "" : rowState.fontFamily) || '<option value="">跟随全局字体</option>';
    const firstEnd = options.indexOf("</option>") + "</option>".length;
    const followSelected = rowState.fontFamily ? options.slice(0, firstEnd).replace(" selected", "") : options.slice(0, firstEnd);
    return followSelected + letteringFontOption(rowState.fontFamily) + options.slice(firstEnd);
  }
  function numberField(label, key, value, unit, step = 1) {
    const [min, max] = ROW_NUMBERS[key];
    return `<label>${label}<input data-key="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"><small>${unit}</small></label>`;
  }
  function motionFields(rowState) {
    if (rowState.role === "footer") {
      return `${numberField("淡入开始", "fadeStart", rowState.fadeStart, "毫秒", 10)}${numberField("淡入时长", "fadeDuration", rowState.fadeDuration, "毫秒", 10)}
        <p class="gm-help city-wide">时间从“开始出现”之后算起；淡入为先快后慢，与原片署名一致。</p>`;
    }
    const units = rowUnits(rowState);
    const names = units.map((unit) => unit.map((index) => split(rowState.text)[index]).join("")).join("、") || "（无文字）";
    return `<label class="city-wide">亮起时间<input data-key="starts" type="text" value="${escapeHtml(rowState.starts)}" placeholder="毫秒，逗号分隔，例如 0,333" spellcheck="false"></label>
      <label class="city-wide">熄灭区间<input data-key="offs" type="text" value="${escapeHtml(rowState.offs)}" placeholder="毫秒，相对该项亮起；分号分隔每一项" spellcheck="false"></label>
      <p class="gm-help city-wide">本行点亮单位：${escapeHtml(names)}。时间从“开始出现”之后算起；熄灭区间里整项消失，例如 100-233 表示亮起 0.10 秒后熄灭到 0.233 秒。</p>
      <button class="gm-text-button city-wide" type="button" data-action="preview-row">▶ 预览本行点亮</button>`;
  }
  function renderRows() {
    const minimum = 1;
    $("sequenceRows").innerHTML = state.scheme.rows.map((rowState, index) => `
      <div class="gm-row-shell" data-row-id="${rowState.id}" data-row-summary="${escapeHtml(rowSummary(rowState))}">
        <div class="gm-row">
          <span class="gm-row-index">${String(index + 1).padStart(2, "0")}</span>
          <input data-key="text" value="${escapeHtml(rowState.text)}" placeholder="字塔文字" aria-label="第 ${index + 1} 行文字">
          <span class="city-row-spacer" aria-hidden="true"></span>
          <button data-action="up" type="button" aria-label="上移">↑</button>
          <button data-action="down" type="button" aria-label="下移">↓</button>
          <button data-action="delete" type="button" aria-label="删除"${state.scheme.rows.length <= minimum ? " disabled title=\"至少保留一行文字\"" : ""}>×</button>
        </div>
        <label class="gm-row-font">本行类型<select data-key="role" aria-label="第 ${index + 1} 行类型">${Object.entries(ROLES).map(([value, role]) => `<option value="${value}"${rowState.role === value ? " selected" : ""}>${role.label}</option>`).join("")}</select></label>
        <label class="gm-row-font">本行字体<select data-key="fontFamily" data-stg-font-library="true" aria-label="第 ${index + 1} 行字体">${fontOptions(rowState)}</select></label>
        <label class="gm-row-font">本行字重<select data-key="fontWeight" aria-label="第 ${index + 1} 行字重">${WEIGHTS.map(([value, label]) => `<option value="${value}"${String(rowState.fontWeight) === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
        <div class="gm-row-text-color">
          <label>本段文字颜色<input data-row-text-color type="color" value="${normalizeColor(rowState.textColor, state.scheme.typography.textColor)}"></label>
          <button data-action="apply-text-color-all" type="button">应用到全部段落</button>
        </div>
        <div class="gm-row-meta">
          <button class="gm-row-target${state.activeRowId === rowState.id ? " is-active" : ""}" data-action="target" type="button">＋ 插入图标</button>
          <button class="gm-row-pause" data-action="pause-row" type="button">暂停修改</button>
          <span class="gm-row-icon-count">${(rowState.icons || []).length} 个图标</span>
        </div>
        <details class="gm-row-background gm-row-motion city-row-layout"><summary><span>本行排版</span><b>字号 / 比例 / 间距</b></summary><div class="gm-row-background-grid">
          ${numberField("字号", "size", rowState.size, "px")}
          ${numberField("纵向比例", "scaleY", rowState.scaleY, "%")}
          ${numberField("行宽比例", "widthRatio", rowState.widthRatio, "%")}
          ${numberField("字距", "letterGap", rowState.letterGap, "px")}
          ${numberField("与上一行间距", "gapBefore", rowState.gapBefore, "px")}
          <p class="gm-help city-wide">行宽比例按“统一行宽”计算，100% 时与其它行左右对齐；设为 0 保持字体原宽。</p>
        </div></details>
        <details class="gm-row-background gm-row-motion city-row-timing"><summary><span>本行点亮节奏</span><b>${rowState.role === "footer" ? "淡入开始 / 时长" : "亮起 / 熄灭"}</b></summary><div class="gm-row-background-grid">${motionFields(rowState)}</div></details>
        <div class="gm-row-icons">${(rowState.icons || []).map((icon) => {
          const asset = libraryAsset(icon.libraryId);
          const name = escapeHtml(asset?.name || "图标");
          return `<div class="gm-inline-icon-chip"><img src="${escapeHtml(asset?.url || "")}" alt=""><strong>${name}</strong><span>位置 ${icon.boundary}</span><button class="gm-inline-icon-edit" data-action="edit-icon" data-icon-id="${icon.id}" type="button" aria-label="编辑${name}">编辑</button></div>`;
        }).join("")}</div>
      </div>`).join("");
    updateInsertTargetLabel();
  }
  function refreshRowChrome(rowElement, rowState) {
    rowElement.dataset.rowSummary = rowSummary(rowState);
    const count = rowElement.querySelector(".gm-row-icon-count");
    if (count) count.textContent = `${(rowState.icons || []).length} 个图标`;
  }

  function allInsertedIcons() {
    return state.scheme.rows.flatMap((item, rowIndex) => (item.icons || []).map((icon) => ({ icon, row: item, rowIndex })));
  }
  function activeIconEntry() { return allInsertedIcons().find(({ icon }) => icon.id === state.activeIconId) || null; }
  function renderSelectedAssets() {
    const entries = allInsertedIcons();
    $("selectedIconCount").textContent = String(entries.length);
    $("selectedIconItems").innerHTML = entries.length ? entries.map(({ icon, rowIndex }) => {
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
    const labels = { flow: "原始图标", gifMotion: "GIF 动图", animals: "透明动物", bots: "Bot 动态图标" };
    $("iconLibrary").innerHTML = ["flow", "gifMotion", "animals", "bots"].map((groupName) => {
      const assets = groups[groupName] || [];
      return `<details class="gm-icon-group"><summary>${labels[groupName]} · ${assets.length}</summary><div class="gm-asset-library me-asset-library">${assets.map((asset) => {
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
    const rowIndex = state.scheme.rows.findIndex((item) => item.id === state.activeRowId);
    const rowState = state.scheme.rows[rowIndex] || state.scheme.rows[0];
    if (!rowState || !$("insertTargetLabel")) return;
    const length = split(rowState.text).length;
    const boundary = clamp(state.caretBoundary, 0, length);
    const position = boundary === 0 ? "文字开头" : boundary === length ? "文字末尾" : `第 ${boundary} 字后`;
    $("insertTargetLabel").textContent = `目标：第 ${String(Math.max(0, rowIndex) + 1).padStart(2, "0")} 行 · ${position}`;
  }
  function boundaryOptions(rowState, selected) {
    const glyphs = split(rowState.text);
    return Array.from({ length: glyphs.length + 1 }, (_, boundary) => {
      const label = boundary === 0 ? "文字开头" : boundary === glyphs.length ? "文字末尾" : `第 ${boundary} 字“${glyphs[boundary - 1]}”之后`;
      return `<option value="${boundary}"${boundary === selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
  }
  function renderAssetEditor() {
    const entry = activeIconEntry();
    $("iconLibraryBrowse").hidden = Boolean(entry);
    $("iconAssetDrawer").hidden = !entry;
    if (!entry) return;
    const { icon, row: rowState } = entry;
    $("activeIconName").textContent = libraryAsset(icon.libraryId)?.name || "图标";
    $("iconRow").innerHTML = state.scheme.rows.map((item, index) => `<option value="${item.id}"${item.id === rowState.id ? " selected" : ""}>第 ${String(index + 1).padStart(2, "0")} 行 · ${escapeHtml(item.text || "空白")}</option>`).join("");
    $("iconBoundary").innerHTML = boundaryOptions(rowState, icon.boundary);
    [["iconSize", icon.size, "%"], ["iconGap", icon.gap, "px"], ["iconX", icon.x, "%"], ["iconY", icon.y, "%"]].forEach(([id, value, suffix]) => {
      $(id).value = String(value);
      const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = `${value}${suffix}`;
    });
  }

  // ---------- Timeline ----------
  function timelinePhases() {
    const groups = new Map();
    schedules().forEach(({ row: rowState, schedule }) => {
      if (!rowUnits(rowState).length) return;
      const label = ROLES[rowState.role]?.phase || "汉字点亮";
      const group = groups.get(label) || { label, start: Infinity, end: 0, texts: [] };
      group.start = Math.min(group.start, schedule.start);
      group.end = Math.max(group.end, schedule.end);
      group.texts.push(rowState.text.trim());
      groups.set(label, group);
    });
    const ordered = [...groups.values()].sort((a, b) => a.start - b.start);
    const contentEnd = contentEndComposition();
    const phases = ordered.map((group, index) => ({ ...group, from: index === 0 ? 0 : group.start, to: index + 1 < ordered.length ? ordered[index + 1].start : contentEnd }));
    phases.push({ label: HOLD_PHASE, texts: ["完整字塔"], from: contentEnd, to: contentEnd + state.scheme.motion.finalHold });
    return phases.filter((phase) => phase.to > phase.from);
  }
  function renderTimeline() {
    const speed = Math.max(0.01, state.scheme.motion.speed);
    $("timeline").innerHTML = timelinePhases().map((phase) => {
      const start = phase.from / speed;
      const seconds = (phase.to - phase.from) / speed / 1000;
      const color = PHASE_FILL[phase.label] || "#d4b8ff";
      return `<button type="button" data-seek-ms="${start}" class="gm-timeline-block me-choreo-block" style="background:${color} !important" role="listitem"><strong>${escapeHtml(phase.label)}</strong><small>${escapeHtml(phase.texts.join(" "))} · ${seconds.toFixed(2)}s</small></button>`;
    }).join("");
    const total = cycleDurationMs();
    $("scrubber").max = String(Math.max(0.001, total));
    $("timeTotal").textContent = `${(total / 1000).toFixed(2)}s`;
  }

  // ---------- Controls and scheme ----------
  function updateOutputs() {
    const formats = { lineWidth: (v) => `${v}px`, layoutScale: (v) => `${v}%`, positionX: (v) => `${v}%`, positionY: (v) => `${v}%`, leadIn: (v) => `${v}ms`, finalHold: (v) => `${v}ms`, speed: (v) => `${Number(v).toFixed(2)}×` };
    Object.entries(formats).forEach(([id, format]) => {
      const output = document.querySelector(`output[for="${id}"]`);
      if (output) output.value = format(Number(controls[id].value));
    });
  }
  function syncBackgroundChrome() {
    const background = state.scheme.background;
    $("backgroundSwatch").style.backgroundColor = background.color;
    $("backgroundSwatch").setAttribute("aria-label", `当前背景颜色 ${background.color}`);
    $("backgroundSummary").textContent = background.media?.name || "";
    $("backgroundSummary").hidden = !background.media;
  }
  function drawFilmstrip(filmstrip) {
    const target = $("backgroundFilmstrip");
    if (!filmstrip || !target) return;
    const filmstripContext = target.getContext("2d");
    filmstripContext.clearRect(0, 0, target.width, target.height);
    filmstripContext.drawImage(filmstrip, 0, 0, target.width, target.height);
  }
  async function refreshMediaUi() {
    syncBackgroundChrome();
    const media = state.scheme.background.media;
    $("backgroundMediaInfo").hidden = !media;
    if (!media) return;
    $("backgroundMediaName").textContent = media.name;
    $("backgroundMediaType").textContent = isVideoMedia(media) ? "视频" : isGifMedia(media) ? "GIF" : "图片";
    $("backgroundVideoTrim").hidden = !isVideoMedia(media);
    $("backgroundCropZoom").value = String(media.cropZoom);
    $("backgroundCropOutput").textContent = `${media.cropZoom.toFixed(2)}×`;
    const runtime = await prepareBackground();
    if (!runtime || backgroundRuntime() !== runtime) return;
    drawCropPreview();
    if (runtime.kind !== "video" || !(runtime.duration > 0)) return;
    const duration = runtime.duration;
    const clip = videoClipBounds(media, duration);
    media.videoStart = clip.start;
    media.videoEnd = clip.end;
    $("backgroundVideoStart").max = String(Math.max(0, duration - 0.1));
    $("backgroundVideoEnd").max = String(duration);
    $("backgroundVideoStart").value = String(Number(clip.start.toFixed(2)));
    $("backgroundVideoEnd").value = String(Number(clip.end.toFixed(2)));
    $("backgroundVideoDuration").textContent = `${duration.toFixed(1)} 秒`;
    const selection = $("backgroundVideoSelection");
    selection.style.left = `${clip.start / duration * 100}%`;
    selection.style.width = `${clip.duration / duration * 100}%`;
    selection.querySelector(".is-start").setAttribute("aria-valuetext", `${clip.start.toFixed(1)} 秒`);
    selection.querySelector(".is-end").setAttribute("aria-valuetext", `${clip.end.toFixed(1)} 秒`);
    if (runtime.filmstrip) drawFilmstrip(runtime.filmstrip);
    else prepareVideoFilmstrip(runtime).then(drawFilmstrip);
  }
  function syncControlsFromState() {
    const { canvas: canvasState, typography, motion, background } = state.scheme;
    $("canvasPreset").value = canvasState.preset;
    $("canvasWidth").value = canvasState.width;
    $("canvasHeight").value = canvasState.height;
    document.querySelector(".gm-custom-size").hidden = canvasState.preset !== "custom";
    ensureGlobalFontOption();
    controls.fontFamily.value = typography.fontFamily;
    ["lineWidth", "layoutScale", "positionX", "positionY", "textColor"].forEach((id) => { controls[id].value = typography[id]; });
    ["leadIn", "finalHold", "speed"].forEach((id) => { controls[id].value = motion[id]; });
    controls.loop.checked = Boolean(motion.loop);
    controls.backgroundColor.value = background.color;
    controls.backgroundOpacity.value = background.opacity;
    refreshMediaUi();
    renderRows();
    renderSelectedAssets();
    renderTimeline();
    updateOutputs();
    resizePreview();
  }
  function collectControls() {
    const { typography, motion, background } = state.scheme;
    typography.fontFamily = normalizeFontValue(controls.fontFamily.value) || "stg:noto-hk";
    typography.lineWidth = number(controls.lineWidth.value, 490, 240, 980);
    typography.layoutScale = number(controls.layoutScale.value, 100, 40, 160);
    typography.positionX = number(controls.positionX.value, 0, -40, 40);
    typography.positionY = number(controls.positionY.value, 0, -40, 40);
    typography.textColor = normalizeColor(controls.textColor.value, "#4cebfa");
    motion.leadIn = number(controls.leadIn.value, 60, 0, 2000);
    motion.finalHold = number(controls.finalHold.value, 2490, 0, 6000);
    motion.speed = number(controls.speed.value, 1, 0.25, 2);
    motion.loop = controls.loop.checked;
    background.color = normalizeColor(controls.backgroundColor.value, "#000000");
    background.opacity = number(controls.backgroundOpacity.value, 100, 0, 100);
  }
  function autoSave() {
    if (state.previewMode) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scheme)); }
    catch (_) { $("exportStatus").textContent = "背景素材较大，当前编辑仍可使用；请下载 JSON 方案以长期保留。"; }
  }
  function normalizeRow(input, fallbackColor) {
    const base = row(input?.id || uid(), String(input?.text ?? ""), ROLES[input?.role] ? input.role : "english");
    const result = { ...base };
    result.fontFamily = normalizeFontValue(input?.fontFamily);
    result.fontWeight = WEIGHTS.some(([value]) => value === String(input?.fontWeight ?? "")) ? String(input.fontWeight ?? "") : "";
    result.textColor = normalizeColor(input?.textColor, fallbackColor);
    Object.entries(ROW_NUMBERS).forEach(([key, [min, max]]) => { result[key] = number(input?.[key], base[key], min, max); });
    result.starts = String(input?.starts ?? "");
    result.offs = String(input?.offs ?? "");
    const glyphCount = split(result.text).length, seen = new Set();
    result.icons = (Array.isArray(input?.icons) ? input.icons : []).map((icon) => ({
      id: icon.id || uid(), libraryId: String(icon.libraryId || ""), boundary: clamp(Math.round(Number(icon.boundary) || 0), 0, glyphCount),
      size: clamp(Number(icon.size) || 90, 20, 220), gap: clamp(Number(icon.gap) || 0, 0, 80), x: clamp(Number(icon.x) || 0, -100, 100), y: clamp(Number(icon.y) || 0, -100, 100)
    })).filter((icon) => libraryAsset(icon.libraryId) && !seen.has(icon.libraryId) && seen.add(icon.libraryId));
    return result;
  }
  function applyScheme(scheme, status = "") {
    if (!scheme || !Array.isArray(scheme.rows)) return;
    const typography = { ...clone(DEFAULT_SCHEME.typography), ...(scheme.typography || {}) };
    typography.fontFamily = normalizeFontValue(typography.fontFamily) || DEFAULT_SCHEME.typography.fontFamily;
    const sourceBackground = scheme.background || {};
    const background = { color: normalizeColor(sourceBackground.color, DEFAULT_SCHEME.background.color), opacity: number(sourceBackground.opacity, 100, 0, 100) };
    // Older schemes stored a single zoom value beside the media.
    background.media = normalizeBackgroundMedia(sourceBackground.media ? { cropZoom: sourceBackground.zoom, ...sourceBackground.media } : null);
    state.scheme = {
      version: VERSION,
      canvas: { ...clone(DEFAULT_SCHEME.canvas), ...(scheme.canvas || {}) },
      typography,
      motion: { ...clone(DEFAULT_SCHEME.motion), ...(scheme.motion || {}) },
      background,
      rows: scheme.rows.map((item) => normalizeRow(item, typography.textColor))
    };
    if (!state.scheme.rows.length) state.scheme.rows.push(row(uid(), "", "han", { textColor: typography.textColor }));
    if (!state.scheme.rows.some((item) => item.id === state.activeRowId)) state.activeRowId = state.scheme.rows[0].id;
    state.caretBoundary = clamp(state.caretBoundary, 0, split(state.scheme.rows.find((item) => item.id === state.activeRowId)?.text || "").length);
    state.activeIconId = "";
    measureCache.clear();
    state.elapsedMs = 0;
    state.playing = !state.reducedMotion;
    state.lastFrame = performance.now();
    updatePlaybackButton();
    syncControlsFromState();
    refreshFonts();
    prepareBackground();
    preloadInsertedAssets().then(() => { measureCache.clear(); resizePreview(); });
    autoSave();
    if (status) $("exportStatus").textContent = status;
  }
  function changed({ restart = false } = {}) {
    collectControls();
    if (restart) { state.elapsedMs = 0; state.playing = true; state.lastFrame = performance.now(); updatePlaybackButton(); }
    document.querySelectorAll("#sequenceRows .gm-row-shell").forEach((element) => {
      const rowState = state.scheme.rows.find((item) => item.id === element.dataset.rowId);
      if (rowState) refreshRowChrome(element, rowState);
    });
    renderTimeline();
    updateOutputs();
    autoSave();
    resizePreview();
  }

  // ---------- Playback ----------
  function updatePlaybackButton() {
    $("togglePlayback").innerHTML = state.playing ? "Ⅱ <span>暂停</span>" : "▶ <span>播放</span>";
    $("togglePlayback").setAttribute("aria-pressed", String(!state.playing));
  }
  function pauseAt(elapsedMs) {
    state.elapsedMs = Math.max(0, elapsedMs);
    state.playing = false;
    updatePlaybackButton();
    resizePreview();
  }
  // Row pause lands on the complete, readable tower (every row lit).
  function seekToRowStart(rowIdOrIndex, pause = true) {
    const index = typeof rowIdOrIndex === "number" ? rowIdOrIndex : state.scheme.rows.findIndex((item) => item.id === rowIdOrIndex);
    const rowState = state.scheme.rows[index];
    if (rowState) state.activeRowId = rowState.id;
    if (pause) pauseAt(stableElapsed());
    else playFrom(Math.max(0, rowSchedule(rowState || state.scheme.rows[0]).start / Math.max(0.01, state.scheme.motion.speed) - 120));
  }
  function playFrom(elapsedMs) {
    state.elapsedMs = Math.max(0, elapsedMs);
    state.playing = true;
    state.lastFrame = performance.now();
    updatePlaybackButton();
    resizePreview();
  }

  // ---------- Events ----------
  $("canvasPreset").addEventListener("change", () => {
    const preset = $("canvasPreset").value;
    state.scheme.canvas.preset = preset;
    document.querySelector(".gm-custom-size").hidden = preset !== "custom";
    if (preset !== "custom") {
      const [width, height] = preset.split("x").map(Number);
      state.scheme.canvas.width = width; state.scheme.canvas.height = height;
      $("canvasWidth").value = width; $("canvasHeight").value = height;
    }
    changed();
  });
  ["canvasWidth", "canvasHeight"].forEach((id) => ["input", "change"].forEach((eventName) => $(id).addEventListener(eventName, () => {
    state.scheme.canvas[id === "canvasWidth" ? "width" : "height"] = clamp(Number($(id).value) || 1080, 320, 3840);
    changed();
  })));
  const timingControls = new Set(["leadIn", "speed"]);
  controlIds.forEach((id) => controls[id].addEventListener("input", () => {
    if (id === "textColor") { collectControls(); autoSave(); return; }
    changed({ restart: timingControls.has(id) });
    if (id === "fontFamily") { measureCache.clear(); renderRows(); refreshFonts(); }
    if (id === "backgroundColor") syncBackgroundChrome();
    if (id === "speed") { const runtime = backgroundRuntime(); if (runtime) runtime.exportImage = null; }
    if (id === "finalHold") pauseAt(cycleDurationMs() - 1);
    if (["lineWidth", "layoutScale", "positionX", "positionY"].includes(id) && !state.playing) pauseAt(stableElapsed());
  }));
  $("backgroundFile").addEventListener("change", async () => {
    const file = $("backgroundFile").files?.[0];
    if (!file) return;
    if (!/^(image|video)\//i.test(file.type || "")) { $("exportStatus").textContent = "请选择图片、GIF 或视频文件。"; $("backgroundFile").value = ""; return; }
    const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    state.scheme.background.media = normalizeBackgroundMedia({ name: file.name, url, fileType: file.type, videoStart: 0, videoEnd: null, cropX: 0.5, cropY: 0.5, cropZoom: 1 });
    $("backgroundFile").value = "";
    await prepareBackground();
    await refreshMediaUi();
    autoSave();
    resizePreview();
    $("exportStatus").textContent = `${file.name} 已设为画面背景。`;
  });
  $("backgroundRemove").addEventListener("click", () => {
    disposeBackground();
    state.scheme.background.media = null;
    refreshMediaUi();
    autoSave();
    resizePreview();
  });
  $("backgroundCropZoom").addEventListener("input", () => {
    const media = state.scheme.background.media;
    if (!media) return;
    media.cropZoom = clamp(Number($("backgroundCropZoom").value) || 1, 1, 4);
    $("backgroundCropOutput").textContent = `${media.cropZoom.toFixed(2)}×`;
    autoSave(); resizePreview();
  });
  $("backgroundCropReset").addEventListener("click", () => {
    const media = state.scheme.background.media;
    if (!media) return;
    media.cropX = 0.5; media.cropY = 0.5; media.cropZoom = 1;
    $("backgroundCropZoom").value = "1";
    $("backgroundCropOutput").textContent = "1.00×";
    autoSave(); resizePreview();
  });
  let cropDrag = null;
  $("backgroundCropPreview").addEventListener("pointerdown", (event) => {
    const media = state.scheme.background.media;
    if (!media) return;
    cropDrag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, cropX: media.cropX, cropY: media.cropY };
    $("backgroundCropPreview").setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  $("backgroundCropPreview").addEventListener("pointermove", (event) => {
    const media = state.scheme.background.media;
    if (!cropDrag || cropDrag.pointerId !== event.pointerId || !media) return;
    const rect = $("backgroundCropPreview").getBoundingClientRect();
    media.cropX = clamp(cropDrag.cropX - (event.clientX - cropDrag.clientX) / Math.max(1, rect.width));
    media.cropY = clamp(cropDrag.cropY - (event.clientY - cropDrag.clientY) / Math.max(1, rect.height));
    autoSave(); resizePreview();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => $("backgroundCropPreview").addEventListener(eventName, () => { cropDrag = null; }));
  function commitTrim() {
    const media = state.scheme.background.media;
    const runtime = backgroundRuntime();
    if (!isVideoMedia(media) || !(runtime?.duration > 0)) return;
    const clip = videoClipBounds({ ...media, videoStart: Number($("backgroundVideoStart").value), videoEnd: Number($("backgroundVideoEnd").value) }, runtime.duration);
    media.videoStart = clip.start;
    media.videoEnd = clip.end;
    runtime.exportImage = null;
    autoSave(); refreshMediaUi(); resizePreview();
  }
  ["backgroundVideoStart", "backgroundVideoEnd"].forEach((id) => $(id).addEventListener("change", commitTrim));
  function trimPointerSeconds(event) {
    const rect = $("backgroundVideoTimeline").getBoundingClientRect();
    return clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) * (backgroundRuntime()?.duration || 0);
  }
  function setTrimBoundary(edge, rawSeconds) {
    const media = state.scheme.background.media;
    const runtime = backgroundRuntime();
    if (!media || !(runtime?.duration > 0)) return;
    const clip = videoClipBounds(media, runtime.duration);
    const seconds = Math.round(Number(rawSeconds) * 10) / 10;
    if (edge === "start") $("backgroundVideoStart").value = String(clamp(seconds, 0, clip.end - 0.1));
    else $("backgroundVideoEnd").value = String(clamp(seconds, clip.start + 0.1, runtime.duration));
    commitTrim();
  }
  let draggedEdge = "";
  $("backgroundVideoTimeline").addEventListener("pointerdown", (event) => {
    const media = state.scheme.background.media;
    const runtime = backgroundRuntime();
    if (!media || !(runtime?.duration > 0)) return;
    const clip = videoClipBounds(media, runtime.duration);
    const seconds = trimPointerSeconds(event);
    draggedEdge = event.target.closest("[data-video-edge]")?.dataset.videoEdge || (Math.abs(seconds - clip.start) <= Math.abs(seconds - clip.end) ? "start" : "end");
    $("backgroundVideoTimeline").setPointerCapture(event.pointerId);
    setTrimBoundary(draggedEdge, seconds);
    event.preventDefault();
  });
  $("backgroundVideoTimeline").addEventListener("pointermove", (event) => { if (draggedEdge && $("backgroundVideoTimeline").hasPointerCapture(event.pointerId)) setTrimBoundary(draggedEdge, trimPointerSeconds(event)); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => $("backgroundVideoTimeline").addEventListener(eventName, () => { draggedEdge = ""; }));
  $("backgroundVideoSelection").querySelectorAll("[data-video-edge]").forEach((handle) => handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const current = handle.dataset.videoEdge === "start" ? Number($("backgroundVideoStart").value) : Number($("backgroundVideoEnd").value);
    setTrimBoundary(handle.dataset.videoEdge, current + (event.key === "ArrowLeft" ? -0.1 : 0.1));
    event.preventDefault();
  }));

  const styleKeys = new Set(["fontFamily", "fontWeight", "size", "scaleY", "widthRatio", "letterGap", "gapBefore", "role", "text"]);
  function handleRowInput(event) {
    const rowElement = event.target.closest(".gm-row-shell");
    const rowState = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!rowState) return;
    state.activeRowId = rowState.id;
    if (event.target.matches("[data-row-text-color]")) {
      rowState.textColor = normalizeColor(event.target.value, rowState.textColor);
      autoSave();
      if (!state.playing) resizePreview(); else pauseAt(stableElapsed());
      return;
    }
    const key = event.target.dataset.key;
    if (!key) return;
    if (ROW_NUMBERS[key]) rowState[key] = number(event.target.value, rowState[key], ...ROW_NUMBERS[key]);
    else if (key === "fontFamily") rowState.fontFamily = normalizeFontValue(event.target.value);
    else if (key === "role") rowState.role = ROLES[event.target.value] ? event.target.value : rowState.role;
    else rowState[key] = event.target.value;
    if (["fontFamily", "fontWeight", "text"].includes(key)) refreshFonts();
    if (key === "role") {
      renderRows();
      const reopened = [...$("sequenceRows").children].find((element) => element.dataset.rowId === rowState.id);
      reopened?.querySelector(".city-row-timing")?.setAttribute("open", "");
    } else refreshRowChrome(rowElement, rowState);
    if (key === "text") {
      const glyphCount = split(rowState.text).length;
      (rowState.icons || []).forEach((icon) => { icon.boundary = clamp(icon.boundary, 0, glyphCount); });
      state.caretBoundary = split(rowState.text.slice(0, event.target.selectionStart ?? rowState.text.length)).length;
      updateInsertTargetLabel();
      renderSelectedAssets();
      measureCache.clear();
      const timing = rowElement.querySelector(".city-row-timing .gm-row-background-grid");
      if (timing && !timing.contains(document.activeElement)) timing.innerHTML = motionFields(rowState);
    }
    renderTimeline();
    autoSave();
    if (styleKeys.has(key)) pauseAt(stableElapsed());
    else playFrom(Math.max(0, rowSchedule(rowState).start / Math.max(0.01, state.scheme.motion.speed) - 120));
  }
  $("sequenceRows").addEventListener("input", handleRowInput);
  $("sequenceRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const rowElement = button?.closest(".gm-row-shell");
    if (!button || !rowElement) return;
    const index = state.scheme.rows.findIndex((item) => item.id === rowElement.dataset.rowId);
    const rowState = state.scheme.rows[index];
    if (!rowState) return;
    state.activeRowId = rowState.id;
    const action = button.dataset.action;
    if (action === "pause-row") { seekToRowStart(index, true); return; }
    if (action === "preview-row") { seekToRowStart(index, false); return; }
    if (action === "edit-icon") { openIconEditor(button.dataset.iconId); return; }
    if (action === "target") {
      const input = rowElement.querySelector('input[data-key="text"]');
      state.caretBoundary = split(rowState.text.slice(0, input?.selectionStart ?? rowState.text.length)).length;
      renderRows(); renderLibrarySelection();
      setIconLibraryDrawer(true);
      return;
    }
    if (action === "apply-text-color-all") {
      const value = normalizeColor(rowState.textColor, state.scheme.typography.textColor);
      state.scheme.rows.forEach((item) => { item.textColor = value; });
      state.scheme.typography.textColor = value;
      controls.textColor.value = value;
      document.querySelectorAll("[data-row-text-color]").forEach((input) => { input.value = value; });
      $("exportStatus").textContent = "文字颜色已应用到全部段落。";
      autoSave();
      pauseAt(stableElapsed());
      return;
    }
    if (action === "delete" && state.scheme.rows.length > 1) {
      state.scheme.rows.splice(index, 1);
      if (!state.scheme.rows.some((item) => item.id === state.activeRowId)) state.activeRowId = state.scheme.rows[Math.max(0, index - 1)].id;
    }
    if (action === "up" && index > 0) [state.scheme.rows[index - 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index - 1]];
    if (action === "down" && index < state.scheme.rows.length - 1) [state.scheme.rows[index + 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index + 1]];
    renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); pauseAt(stableElapsed());
  });
  $("addRow").addEventListener("click", () => {
    const source = state.scheme.rows.find((item) => item.id === state.activeRowId) || state.scheme.rows[state.scheme.rows.length - 1];
    const role = source?.role === "footer" ? "english" : (source?.role || "english");
    const nextStart = Math.max(0, contentEndComposition() - state.scheme.motion.leadIn + 150);
    const nextRow = row(uid(), "新文字", role, source ? {
      fontFamily: source.fontFamily, fontWeight: source.fontWeight, textColor: normalizeColor(source.textColor, state.scheme.typography.textColor),
      size: source.size, scaleY: source.scaleY, widthRatio: source.widthRatio || 100, letterGap: source.letterGap, gapBefore: 29,
      starts: String(Math.round(nextStart)), offs: "100-233", fadeStart: Math.round(nextStart), fadeDuration: 350
    } : { textColor: state.scheme.typography.textColor, starts: String(Math.round(nextStart)), offs: "100-233" });
    state.scheme.rows.push(nextRow);
    state.activeRowId = nextRow.id;
    renderRows(); renderTimeline(); autoSave(); refreshFonts();
    pauseAt(stableElapsed());
    $("sequenceRows").lastElementChild?.querySelector('input[data-key="text"]')?.select();
  });

  function captureCaret(input) {
    const rowElement = input.closest(".gm-row-shell");
    const rowState = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!rowState) return;
    state.activeRowId = rowState.id;
    state.caretBoundary = split(rowState.text.slice(0, input.selectionStart ?? rowState.text.length)).length;
    document.querySelectorAll(".gm-row-target").forEach((button) => button.classList.toggle("is-active", button.closest(".gm-row-shell")?.dataset.rowId === rowState.id));
    renderLibrarySelection();
  }
  ["focusin", "click", "keyup", "select"].forEach((eventName) => $("sequenceRows").addEventListener(eventName, (event) => {
    if (event.target.matches('input[data-key="text"]')) captureCaret(event.target);
  }));
  function setLayerManager(expanded) {
    $("iconLayerPanel").classList.toggle("is-list-expanded", expanded);
    $("toggleSelectedIcons").setAttribute("aria-expanded", String(expanded));
    $("toggleSelectedIcons").textContent = expanded ? "收起已选" : "展开已选";
    if (!expanded) { state.activeIconId = ""; renderAssetEditor(); }
  }
  function setIconLibraryDrawer(open) {
    $("iconLibraryDrawer").hidden = !open;
    document.body.classList.toggle("gm-library-open", open);
    $("openIconLibrary").setAttribute("aria-expanded", String(open));
    $("openIconLibraryLarge").setAttribute("aria-expanded", String(open));
    if (!open) { state.activeIconId = ""; renderAssetEditor(); }
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
  function iconsChanged() { measureCache.clear(); renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); resizePreview(); }
  function removeIcon(iconId) {
    state.scheme.rows.forEach((item) => { item.icons = (item.icons || []).filter((icon) => icon.id !== iconId); });
    if (state.activeIconId === iconId) state.activeIconId = "";
    iconsChanged();
  }
  function insertSelectedIconAtCaret() {
    const rowState = state.scheme.rows.find((item) => item.id === state.activeRowId);
    const asset = libraryAsset(state.librarySelectionId);
    if (!rowState || !asset) return;
    if ((rowState.icons || []).some((icon) => icon.libraryId === asset.libraryId)) {
      $("exportStatus").textContent = `“${asset.name}”已经在这一行；可在单独编辑中移动它。`;
      return;
    }
    rowState.icons = [...(rowState.icons || []), { id: uid(), libraryId: asset.libraryId, boundary: clamp(state.caretBoundary, 0, split(rowState.text).length), size: 90, gap: 12, x: 0, y: 0 }];
    loadAssetResource(asset).then(resizePreview);
    iconsChanged();
    pauseAt(stableElapsed());
    $("exportStatus").textContent = `已将“${asset.name}”插入第 ${state.scheme.rows.indexOf(rowState) + 1} 行。`;
  }
  $("iconLibrary").addEventListener("click", (event) => {
    const quickInsert = event.target.closest("button[data-quick-insert]");
    if (quickInsert) { state.librarySelectionId = quickInsert.dataset.quickInsert; renderLibrarySelection(); insertSelectedIconAtCaret(); return; }
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
    const item = event.target.closest("[data-icon-id]");
    const button = event.target.closest("button[data-action]");
    if (!item || !button) return;
    if (button.dataset.action === "edit-icon") openIconEditor(item.dataset.iconId);
    if (button.dataset.action === "remove-icon") removeIcon(item.dataset.iconId);
  });
  $("closeIconDrawer").addEventListener("click", () => { state.activeIconId = ""; renderAssetEditor(); renderSelectedAssets(); });
  $("removeActiveIcon").addEventListener("click", () => { if (state.activeIconId) removeIcon(state.activeIconId); });
  $("iconRow").addEventListener("change", () => {
    const entry = activeIconEntry();
    const targetRow = state.scheme.rows.find((item) => item.id === $("iconRow").value);
    if (!entry || !targetRow || targetRow.id === entry.row.id) return;
    if ((targetRow.icons || []).some((icon) => icon.libraryId === entry.icon.libraryId)) { $("exportStatus").textContent = "目标行已经有同一个图标。"; renderAssetEditor(); return; }
    entry.row.icons = entry.row.icons.filter((icon) => icon.id !== entry.icon.id);
    entry.icon.boundary = clamp(entry.icon.boundary, 0, split(targetRow.text).length);
    targetRow.icons = [...(targetRow.icons || []), entry.icon];
    state.activeRowId = targetRow.id;
    iconsChanged();
  });
  $("iconBoundary").addEventListener("change", () => {
    const entry = activeIconEntry(); if (!entry) return;
    entry.icon.boundary = clamp(Number($("iconBoundary").value), 0, split(entry.row.text).length);
    iconsChanged();
  });
  [["iconSize", "size", "%"], ["iconGap", "gap", "px"], ["iconX", "x", "%"], ["iconY", "y", "%"]].forEach(([id, key, suffix]) => {
    $(id).addEventListener("input", () => {
      const entry = activeIconEntry(); if (!entry) return;
      entry.icon[key] = Number($(id).value);
      const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = `${entry.icon[key]}${suffix}`;
      measureCache.clear(); autoSave(); resizePreview();
    });
    $(id).addEventListener("change", () => { renderRows(); renderSelectedAssets(); });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.activeIconId) { state.activeIconId = ""; renderAssetEditor(); renderSelectedAssets(); return; }
    if ($("iconLayerPanel").classList.contains("is-list-expanded")) { setLayerManager(false); return; }
    if (document.body.classList.contains("gm-library-open")) setIconLibraryDrawer(false);
  });

  $("scrubber").addEventListener("input", () => pauseAt(Number($("scrubber").value)));
  $("timeline").addEventListener("click", (event) => {
    const block = event.target.closest("[data-seek-ms]");
    if (block) pauseAt(Number(block.dataset.seekMs));
  });
  $("togglePlayback").addEventListener("click", () => {
    if (!state.playing && !state.scheme.motion.loop && state.elapsedMs >= cycleDurationMs()) state.elapsedMs = 0;
    state.playing = !state.playing; state.lastFrame = performance.now(); updatePlaybackButton();
  });
  $("restartPreview").addEventListener("click", () => playFrom(0));
  $("toggleInspector").addEventListener("click", () => {
    document.body.classList.toggle("gm-inspector-hidden");
    if (document.body.classList.contains("gm-inspector-hidden")) setIconLibraryDrawer(false);
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
    const cleared = clone(state.scheme);
    cleared.rows.forEach((item) => { item.text = ""; });
    applyScheme(cleared, "全部文字内容已清空，每行的字体、颜色、排版与节奏保持不变。");
  });

  // ---------- Export ----------
  function exportCanvas() {
    const output = document.createElement("canvas");
    output.width = Math.max(2, Math.round(state.scheme.canvas.width));
    output.height = Math.max(2, Math.round(state.scheme.canvas.height));
    return output;
  }
  function exportSeconds() { return $("exportDuration").value === "cycle" ? cycleDurationMs() / 1000 : Number($("exportDuration").value); }
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
      script.onload = () => window.HME?.createH264MP4Encoder ? resolve() : reject(new Error("MP4 编码器初始化失败"));
      script.onerror = () => reject(new Error("MP4 编码器加载失败"));
      document.head.append(script);
    });
    return h264Loader;
  }
  async function exportReady() { await refreshFonts(); await prepareBackground(); await preloadInsertedAssets(); }
  $("exportPng").addEventListener("click", async () => {
    await exportReady();
    const output = exportCanvas();
    await prepareBackgroundFrame(compositionTime(state.elapsedMs) / 1000);
    renderFrame(output, state.elapsedMs / 1000, output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) return;
      download(blob, `${SLUG}-${output.width}x${output.height}.png`);
      $("exportStatus").textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("exportGif").addEventListener("click", async () => {
    if (!window.GIF) { $("exportStatus").textContent = "GIF 编码器未加载。"; return; }
    setBusy(true, "正在准备 GIF…");
    let workerUrl = "";
    try {
      await exportReady();
      const response = await fetch("js/continuation-gif.worker.js");
      if (!response.ok) throw new Error(`worker ${response.status}`);
      workerUrl = URL.createObjectURL(new Blob([await response.text()], { type: "text/javascript" }));
      const output = exportCanvas();
      const fps = Math.min(30, Number($("exportFps").value));
      const total = Math.max(1, Math.ceil(exportSeconds() * fps));
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: workerUrl });
      for (let index = 0; index < total; index += 1) {
        await prepareBackgroundFrame(compositionTime(index / fps * 1000) / 1000);
        renderFrame(output, index / fps, output.width, output.height);
        const delay = (Math.round((index + 1) * 100 / fps) - Math.round(index * 100 / fps)) * 10;
        gif.addFrame(output, { copy: true, delay });
      }
      gif.on("progress", (progress) => { $("exportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => { URL.revokeObjectURL(workerUrl); download(blob, `${SLUG}-${output.width}x${output.height}.gif`); setBusy(false, "GIF 已生成"); });
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
      await exportReady();
      encoder = await window.HME.createH264MP4Encoder();
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.max(8000, Math.min(30000, Math.round(output.width * output.height * fps * 0.18 / 1000)));
      encoder.groupOfPictures = Math.max(12, Math.round(fps / 2));
      encoder.outputFilename = `${SLUG}-${output.width}x${output.height}-${fps}fps.mp4`;
      encoder.initialize();
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      const progressInterval = Math.max(1, Math.floor(fps / 10));
      for (let index = 0; index < total; index += 1) {
        await prepareBackgroundFrame(compositionTime(index / fps * 1000) / 1000);
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

  // ---------- Loop and init ----------
  function animationLoop(now) {
    const total = cycleDurationMs();
    if (state.playing) {
      state.elapsedMs += Math.min(80, now - state.lastFrame);
      if (!state.scheme.motion.loop && state.elapsedMs >= total) { state.elapsedMs = total; state.playing = false; updatePlaybackButton(); }
    }
    state.lastFrame = now;
    renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
    const displayTime = state.scheme.motion.loop ? state.elapsedMs % Math.max(1, total) : Math.min(state.elapsedMs, total);
    $("scrubber").value = String(displayTime);
    $("timeNow").textContent = `${(displayTime / 1000).toFixed(2)}s`;
    requestAnimationFrame(animationLoop);
  }

  function moveGlobalCards() {
    const panel = document.querySelector('.tc-properties[data-panel="global"]');
    if (!panel) return;
    document.querySelectorAll("[data-city-global-card]").forEach((card) => panel.append(card));
  }

  function initialize() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    const params = new URLSearchParams(location.search);
    state.previewMode = params.has("preview") || params.has("embed");
    if (state.previewMode) document.body.classList.add("is-preview");
    const useDefault = params.has("preview") || params.get("from") === "gallery";
    renderIconLibrary();
    applyScheme(useDefault || !stored?.rows || Number(stored.version || 1) !== VERSION ? clone(DEFAULT_SCHEME) : stored);
    if (state.reducedMotion) pauseAt(stableElapsed());
    new ResizeObserver(resizePreview).observe(frame);
    document.fonts?.ready.then(() => { measureCache.clear(); resizePreview(); });
    document.fonts?.addEventListener("loadingdone", () => { state.fontsVersion += 1; measureCache.clear(); resizePreview(); });
    window.addEventListener("resize", resizePreview, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", moveGlobalCards, { once: true });
    else moveGlobalCards();

    const setPlaying = (playing) => { state.playing = Boolean(playing); state.lastFrame = performance.now(); updatePlaybackButton(); resizePreview(); };
    const setTime = (seconds) => { state.elapsedMs = clamp(Number(seconds) || 0, 0, cycleDurationMs() / 1000) * 1000; setPlaying(false); };
    window.CellMotionEffectBridge = {
      version: "1.0.0",
      effectId: SLUG,
      getScheme: () => clone(state.scheme),
      applyScheme: (scheme, options = {}) => { applyScheme(clone(scheme)); if (options.autoplay === false) setPlaying(false); },
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      restart: () => { state.elapsedMs = 0; setPlaying(true); },
      seek: setTime,
      durationMs: cycleDurationMs
    };
    const postDuration = () => { if (window.parent !== window) window.parent.postMessage({ type: "cellmotion:duration", effectId: SLUG, durationMs: cycleDurationMs() }, "*"); };
    window.addEventListener("message", (event) => {
      const message = event.data || {};
      if (typeof message.type !== "string" || !message.type.startsWith("cellmotion:")) return;
      if (message.type === "cellmotion:configure") {
        const manifest = message.manifest;
        if (manifest?.effect?.id && manifest.effect.id !== SLUG) return;
        const compositionState = manifest?.composition || message.composition;
        if (compositionState) window.CellMotionEffectBridge.applyScheme(compositionState, { autoplay: manifest?.presentation?.autoplay });
        postDuration();
      }
      if (message.type === "cellmotion:play") window.CellMotionEffectBridge.play();
      if (message.type === "cellmotion:pause") window.CellMotionEffectBridge.pause();
      if (message.type === "cellmotion:restart") window.CellMotionEffectBridge.restart();
      if (message.type === "cellmotion:seek") window.CellMotionEffectBridge.seek(message.seconds);
      if (message.type === "cellmotion:request-duration") postDuration();
    });
    window.__cityStackTest = { prepareBackgroundFrame, prepareBackground, preloadInsertedAssets, renderFrame, getScheme: () => clone(state.scheme), cycleDurationMs, setTime, stableElapsed, refreshFonts, rowSchedule };
    if (window.parent !== window) window.parent.postMessage({ type: "cellmotion:ready", effectId: SLUG, bridgeVersion: "1.0.0", durationMs: cycleDurationMs() }, "*");
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
