(() => {
  "use strict";

  // Type Garden editor. Rows are forced lines; every row owns its text, font,
  // text color and inline icons (icons grow stems like letters). The poster
  // loop is deterministic: preview, seek, PNG/SVG/GIF/MP4 share renderFrame().
  // "边打边长" is the original live typing mode on the same canvas.
  const $ = (id) => document.getElementById(id);
  const VERSION = 1;
  const SLUG = "typegarden";
  const STORAGE_KEY = `me-motion-${SLUG}-v1`;
  const { Garden, PRESETS, PALETTES } = window.TypeGarden;
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const split = (value) => segmenter ? Array.from(segmenter.segment(String(value)), ({ segment }) => segment) : Array.from(String(value));
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `garden-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalizeColor = (value, fallback = "#ffffff") => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toUpperCase() : fallback;
  const number = (value, fallback, min, max) => { const result = Number(value); return clamp(Number.isFinite(result) ? result : fallback, min, max); };
  const COLOR_KEYS = ["bg", "flower", "stem", "line", "text"];
  const paletteColors = (index) => { const p = PALETTES[index] || PALETTES[0]; return { bg: p.bg, flower: p.flower, stem: p.stem, line: p.line, text: p.text }; };
  const WALLPAPER = new Set(["1206x2622", "1320x2868", "1179x2556", "1080x2400", "1440x3200", "2048x2732"]);

  // Phase colors follow the shared timeline palette; the meaning mapping is this effect's own.
  const FILL = { grow: "#d7ff2f", bloom: "#ffd27d", wither: "#ffc4d6", still: "#9de7d7", air: "#8ec8ff", wing: "#d4b8ff" };

  const row = (id, text, extra = {}) => ({ id, text, fontFamily: "", textColor: "", icons: [], ...extra });
  // Approved default (user scheme 2026-10-06): "halo你好" typed on Paper, Lora, with visiting butterflies and a light.
  // The original poster default ("in bloom", Breathe, Rose noir, seed 7) stays one click away in the motion and palette cards.
  const DEFAULT_SCHEME = Object.freeze({
    version: VERSION,
    canvas: { width: 1920, height: 1080, preset: "1920x1080" },
    typography: { fontFamily: "stg:lora", layoutScale: 100, letterSpacing: 0, positionX: 0, positionY: 0 },
    garden: { preset: "typed", palette: 1, colors: paletteColors(1), density: 1, flowers: 100, textFront: false, butterflies: 3, lights: 1, flyOn: true, lightOn: true, recoil: 20, boil: true, seed: 7, speed: 0.75 },
    background: { media: null, opacity: 100, zoom: 1, x: 0, y: 0, videoStart: 0, videoEnd: 0 },
    rows: [row("garden-row-1", "halo你好")]
  });

  const state = {
    scheme: clone(DEFAULT_SCHEME),
    mode: "poster",
    playing: true,
    elapsedMs: 0,
    lastFrame: performance.now(),
    exportBusy: false,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    activeRowId: DEFAULT_SCHEME.rows[0].id,
    previewMode: false,
    fontsVersion: 0,
    posterKey: "",
    background: null,
    caretBoundary: split(DEFAULT_SCHEME.rows[0].text).length,
    librarySelectionId: "",
    activeIconId: "",
    imageCache: new Map(),
    lock: false
  };

  const canvas = $("glyphMorphCanvas");
  const frame = $("compositionFrame");
  const context = canvas.getContext("2d");
  const library = () => window.STGFontLibrary;
  const garden = new Garden({ drawIcon: (ctx, icon, x, y, size, color, t) => drawIcon(ctx, icon, x, y, size, color, t) });
  const live = new Garden({ drawIcon: (ctx, icon, x, y, size, color, t) => drawIcon(ctx, icon, x, y, size, color, t) });

  // ---------- Fonts ----------
  function fontKey(rowState) { return rowState?.fontFamily || state.scheme.typography.fontFamily; }
  function fontPreset(key) { return library()?.preset(key) || { family: "STG Playfair Display", weight: 700, style: "normal", id: "playfair" }; }
  function isSerif(key) { return (library()?.fonts || []).find((font) => font.id === fontPreset(key).id)?.group === "衬线与书写"; }
  // Serif faces fall back to the bold Song face for Chinese so the garden keeps one voice.
  function faceFor(key) {
    const preset = fontPreset(key);
    const cjk = isSerif(key) ? '"STG Noto Serif SC",' : "";
    return { family: `"${preset.family}",${cjk}${library()?.fallbackStack || "sans-serif"}`, weight: preset.weight || 700, style: preset.style || "normal" };
  }
  function normalizeFontValue(value) { return window.MERowFonts?.normalize(value) || ""; }
  async function refreshFonts() {
    if (!document.fonts?.load) return;
    const loads = new Map();
    const add = (family, weight, style, text) => { const css = `${style} ${weight} 64px "${family}"`; loads.set(css, (loads.get(css) || "") + text); };
    const texts = state.scheme.rows.map((item) => ({ key: fontKey(item), text: item.text || "Aa" }));
    if (state.mode === "live") texts.push({ key: state.scheme.typography.fontFamily, text: live.liveText() || "Aa" });
    texts.forEach(({ key, text }) => {
      const preset = fontPreset(key);
      add(preset.family, preset.weight || 700, preset.style || "normal", text);
      if (/[㐀-鿿]/u.test(text)) {
        if (isSerif(key)) add("STG Noto Serif SC", 700, "normal", text);
        else if (!/Noto Sans SC|XiaoWei|Ma Shan Zheng|Noto Serif SC/.test(preset.family)) add("STG Noto Sans SC", 400, "normal", text);
      }
    });
    await Promise.all(Array.from(loads, ([css, text]) => document.fonts.load(css, text).catch(() => null)));
    state.fontsVersion += 1;
    garden.clearCache(); live.clearCache();
    state.posterKey = "";
    resizePreview();
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

  // ---------- Composition ----------
  // Logical space keeps the short side at 1080 so a square poster is identical to the original.
  function logicalSize(width = state.scheme.canvas.width, height = state.scheme.canvas.height) {
    const s = Math.min(width, height) / 1080;
    return { W: width / s, H: height / s };
  }
  function letterSpec() {
    const letters = [];
    state.scheme.rows.forEach((rowState, rowIndex) => {
      const face = faceFor(fontKey(rowState)), track = state.scheme.typography.letterSpacing / 100;
      const color = rowState.textColor ? normalizeColor(rowState.textColor) : undefined;
      let first = true;
      rowTokens(rowState).forEach((token) => {
        const item = token.type === "icon"
          ? { ch: "◆", icon: { libraryId: token.icon.libraryId, size: token.icon.size, gap: token.icon.gap, x: token.icon.x, y: token.icon.y } }
          : { ch: /^\s+$/u.test(token.glyph) ? " " : token.glyph, face, color, track };
        if (first && rowIndex > 0) item.br = true;
        first = false;
        letters.push(item);
      });
    });
    return letters;
  }
  function ensurePoster() {
    const { W, H } = logicalSize();
    const { typography, garden: g } = state.scheme;
    const spec = { letters: letterSpec(), preset: g.preset, seed: g.seed, W, H, scale: typography.layoutScale / 100, offsetX: typography.positionX / 100, offsetY: typography.positionY / 100 };
    const key = JSON.stringify([spec, g.density, g.flowers, state.fontsVersion]);
    if (key === state.posterKey && garden.P) return garden.P;
    garden.density = g.density;
    garden.flowers = g.flowers / 100;
    garden.buildPoster(spec);
    state.posterKey = key;
    return garden.P;
  }
  function gardenColors() {
    const c = state.scheme.garden.colors;
    return { red: c.flower, blue: c.stem, line: c.line, text: c.text, vein: c.bg };
  }
  function posterLength() { return (PRESETS.find((p) => p.id === state.scheme.garden.preset) || PRESETS[0]).T; }
  function cycleDurationMs() { return posterLength() / Math.max(0.01, state.scheme.garden.speed); }
  function posterTime(elapsedMs) { return elapsedMs * Math.max(0.01, state.scheme.garden.speed); }

  // ---------- Background ----------
  const isVideoMedia = (media) => /^video\//i.test(media?.type || "");
  function loadVideo(url) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "auto"; video.loop = false;
      video.addEventListener("loadeddata", () => resolve(video), { once: true });
      video.addEventListener("error", () => resolve(null), { once: true });
      video.src = url; video.load();
    });
  }
  function disposeBackground(runtime) {
    if (!runtime) return;
    if (runtime.resource?.kind === "frames") window.CellMotionAnimatedImage?.dispose(runtime.resource);
    [runtime.video, runtime.exportVideo].forEach((video) => { if (video) { video.pause(); video.removeAttribute("src"); video.load(); } });
  }
  async function prepareBackground() {
    const media = state.scheme.background.media;
    if (state.background && state.background.url === media?.url) return state.background.ready;
    disposeBackground(state.background);
    state.background = null;
    if (!media?.url) { syncVideoTrim(); return null; }
    const runtime = { url: media.url, resource: null, video: null, exportVideo: null, duration: 0, filmstrip: null };
    state.background = runtime;
    runtime.ready = (async () => {
      try {
        if (isVideoMedia(media)) {
          [runtime.video, runtime.exportVideo] = await Promise.all([loadVideo(media.url), loadVideo(media.url)]);
          runtime.duration = Number(runtime.video?.duration) || 0;
          syncVideoTrim();
          buildFilmstrip(runtime);
        } else {
          const animated = /gif/i.test(media.type || "") ? await window.CellMotionAnimatedImage?.decode({ url: media.url, type: media.type, maxFrames: 600 }) : null;
          if (animated) runtime.resource = animated;
          else {
            const image = new Image();
            image.src = media.url;
            await image.decode();
            runtime.resource = { kind: "image", image };
          }
        }
      } catch (error) { console.warn("background", error); }
      resizePreview();
      return runtime;
    })();
    return runtime.ready;
  }
  function videoTrim() {
    const background = state.scheme.background, duration = state.background?.duration || 0;
    const start = clamp(Number(background.videoStart) || 0, 0, Math.max(0, duration - 0.1));
    const rawEnd = Number(background.videoEnd);
    const end = rawEnd > start ? Math.min(rawEnd, duration || rawEnd) : duration;
    return { start, end: Math.max(start + 0.1, end), duration };
  }
  // Background seconds → source video seconds; the trimmed clip loops under the garden.
  function videoTime(timeSeconds) {
    const { start, end } = videoTrim(), length = Math.max(0.1, end - start);
    return start + ((timeSeconds % length) + length) % length;
  }
  function seekVideo(video, time) {
    return new Promise((resolve) => {
      if (!video) { resolve(); return; }
      if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) { resolve(); return; }
      let settled = false;
      const done = () => {
        if (settled) return; settled = true;
        if (typeof video.requestVideoFrameCallback === "function") { const fallback = setTimeout(resolve, 120); video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve(); }); }
        else requestAnimationFrame(resolve);
      };
      video.addEventListener("seeked", done, { once: true });
      video.currentTime = time;
      setTimeout(done, 1200);
    });
  }
  // Export frames wait for the exact source frame before drawing.
  async function syncExportMedia(timeSeconds) {
    if (!isVideoMedia(state.scheme.background.media) || !state.background?.exportVideo) return;
    await seekVideo(state.background.exportVideo, videoTime(timeSeconds));
  }
  // The preview video follows the editor clock without seeking on every frame.
  function syncPreviewVideo(timeSeconds, playing) {
    const video = state.background?.video;
    if (!video || !isVideoMedia(state.scheme.background.media)) return;
    const target = videoTime(timeSeconds), runtime = state.background, now = performance.now();
    // Some browsers cannot play a codec they can still seek: after a stall, step frame by frame instead.
    if (playing && !runtime.stepMode) {
      if (video.readyState >= 2) runtime.stalledSince = 0;
      else if (!runtime.stalledSince) runtime.stalledSince = now;
      else if (now - runtime.stalledSince > 900) {
        // the stalled element can stay "seeking" forever, so continue on a fresh, never-played one
        runtime.stepMode = true; video.pause();
        loadVideo(runtime.url).then((fresh) => { if (fresh && state.background === runtime) { video.removeAttribute("src"); video.load(); runtime.video = fresh; } });
      }
    }
    if (runtime.stepMode) playing = false;
    if (playing) {
      if (video.paused) video.play().catch(() => {});
      if (Math.abs(video.currentTime - target) > 0.25 && !video.seeking) video.currentTime = target;
    } else {
      if (!video.paused) video.pause();
      if (Math.abs(video.currentTime - target) > 0.02 && !video.seeking) video.currentTime = target;
    }
  }
  function backgroundImage(timeSeconds, exporting = false) {
    const runtime = state.background?.url === state.scheme.background.media?.url ? state.background : null;
    if (!runtime) return null;
    if (isVideoMedia(state.scheme.background.media)) {
      if (exporting) return runtime.exportVideo?.readyState >= 2 ? runtime.exportVideo : null;
      // Preview keeps the last decoded frame so seeking never flashes the plain background.
      const video = runtime.video;
      if (video?.readyState >= 2 && !video.seeking && video.videoWidth && runtime.cachedTime !== video.currentTime) {
        const cache = runtime.cache || (runtime.cache = document.createElement("canvas"));
        const scale = Math.min(1, 1280 / video.videoWidth);
        cache.width = Math.round(video.videoWidth * scale); cache.height = Math.round(video.videoHeight * scale);
        cache.getContext("2d").drawImage(video, 0, 0, cache.width, cache.height);
        runtime.cachedTime = video.currentTime;
      }
      return runtime.cache || null;
    }
    const resource = runtime.resource;
    if (!resource) return null;
    if (resource.kind === "image") return resource.image;
    return window.CellMotionAnimatedImage?.frameAt(resource, timeSeconds) || resource.frames?.[0]?.image || null;
  }
  function renderBackground(ctx, width, height, timeSeconds, exporting = false) {
    const background = state.scheme.background;
    ctx.fillStyle = normalizeColor(state.scheme.garden.colors.bg, "#000000");
    ctx.fillRect(0, 0, width, height);
    const image = backgroundImage(timeSeconds, exporting);
    if (!image) return;
    const sourceWidth = image.videoWidth || image.naturalWidth || image.width || width, sourceHeight = image.videoHeight || image.naturalHeight || image.height || height;
    const cover = Math.max(width / sourceWidth, height / sourceHeight) * background.zoom;
    const drawWidth = sourceWidth * cover, drawHeight = sourceHeight * cover;
    const x = (width - drawWidth) / 2 + (background.x || 0) / 100 * Math.max(0, drawWidth - width) / 2;
    const y = (height - drawHeight) / 2 + (background.y || 0) / 100 * Math.max(0, drawHeight - height) / 2;
    ctx.save();
    ctx.globalAlpha = clamp(background.opacity / 100);
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    ctx.restore();
  }

  // ---------- Video trim (filmstrip + handles, shared CellMotion trim UI) ----------
  async function buildFilmstrip(runtime) {
    const video = await loadVideo(runtime.url);
    if (!video || !(runtime.duration > 0)) return;
    const strip = document.createElement("canvas");
    strip.width = 720; strip.height = 96;
    const ctx = strip.getContext("2d"), count = 8, frameWidth = strip.width / count;
    for (let index = 0; index < count; index += 1) {
      await seekVideo(video, (index + 0.5) / count * runtime.duration);
      const scale = Math.max(frameWidth / (video.videoWidth || 1), strip.height / (video.videoHeight || 1));
      const w = (video.videoWidth || 1) * scale, h = (video.videoHeight || 1) * scale;
      ctx.save(); ctx.beginPath(); ctx.rect(index * frameWidth, 0, frameWidth, strip.height); ctx.clip();
      ctx.drawImage(video, index * frameWidth + (frameWidth - w) / 2, (strip.height - h) / 2, w, h);
      ctx.restore();
    }
    video.removeAttribute("src"); video.load();
    if (state.background !== runtime) return;
    runtime.filmstrip = strip;
    syncVideoTrim();
  }
  function syncVideoTrim() {
    const video = isVideoMedia(state.scheme.background.media) && state.background?.duration > 0;
    $("videoTrim").hidden = !video;
    if (!video) return;
    const { start, end, duration } = videoTrim();
    $("videoSelection").style.left = `${start / duration * 100}%`;
    $("videoSelection").style.width = `${(end - start) / duration * 100}%`;
    $("videoDuration").textContent = `${duration.toFixed(1)} 秒`;
    if (document.activeElement !== $("videoStart")) $("videoStart").value = start.toFixed(1);
    if (document.activeElement !== $("videoEnd")) $("videoEnd").value = end.toFixed(1);
    $("videoStart").max = String(Math.max(0, duration - 0.1)); $("videoEnd").max = String(duration);
    const strip = state.background.filmstrip, target = $("videoFilmstrip");
    if (strip) target.getContext("2d").drawImage(strip, 0, 0, target.width, target.height);
  }
  function setVideoTrim(start, end) {
    const { duration } = videoTrim();
    start = clamp(start, 0, Math.max(0, duration - 0.2));
    end = clamp(end, start + 0.2, duration);
    state.scheme.background.videoStart = Math.round(start * 10) / 10;
    state.scheme.background.videoEnd = Math.round(end * 10) / 10;
    syncVideoTrim();
    autoSave();
    if (state.background?.video) state.background.video.currentTime = videoTime(state.elapsedMs / 1000);
  }

  // ---------- Rendering ----------
  const gardenOptions = () => ({ boil: state.scheme.garden.boil, recoil: state.scheme.garden.recoil, textFront: state.scheme.garden.textFront, butterflies: state.scheme.garden.butterflies, lights: state.scheme.garden.lights, flyOn: state.scheme.garden.flyOn, lightOn: state.scheme.garden.lightOn });
  function renderFrame(targetCanvas, timeSeconds, width = targetCanvas.width, height = targetCanvas.height, exporting = false) {
    const ctx = targetCanvas.getContext("2d");
    ensurePoster();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderBackground(ctx, width, height, timeSeconds, exporting);
    const { W } = logicalSize(width, height);
    const k = width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    garden.posterRender(garden.backend(ctx, timeSeconds), posterTime(timeSeconds * 1000), gardenColors(), gardenOptions());
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // Live typing frame; advance=false repaints the current state (used for export).
  function renderLive(targetCanvas, width = targetCanvas.width, height = targetCanvas.height, advance = true) {
    const ctx = targetCanvas.getContext("2d");
    const now = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    renderBackground(ctx, width, height, now / 1000);
    const { W } = logicalSize(width, height);
    const k = width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const options = { ...gardenOptions(), caret: advance && document.activeElement === $("tgLiveInput") };
    if (advance) live.liveFrame(ctx, now, gardenColors(), options);
    else live.livePaint(ctx, now, gardenColors(), options);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    frame.style.setProperty("--tg-frame-w", `${fittedWidth}px`);
    const rect = frame.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2, 2200 / Math.max(1, rect.width, rect.height));
    canvas.width = Math.max(2, Math.round(rect.width * scale));
    canvas.height = Math.max(2, Math.round(canvas.width / ratio));
    stage.style.setProperty("--tc-active-composition-bg", normalizeColor(state.scheme.garden.colors.bg, "#000000"));
    const { W, H } = logicalSize();
    if (live.W !== W || live.H !== H) live.setSize(W, H);
    if (state.mode === "live") renderLive(canvas, canvas.width, canvas.height, false);
    else renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
  }

  // ---------- Row editor ----------
  function rowSummary(rowState) {
    const font = (library()?.preset(fontKey(rowState))?.label || "全局字体").replace(/ · .*$/, "");
    const icons = (rowState.icons || []).length;
    return `${font} · ${icons} 个图标`;
  }
  function renderRows() {
    const minimum = 1;
    $("sequenceRows").innerHTML = state.scheme.rows.map((rowState, index) => `
      <div class="gm-row-shell" data-row-id="${rowState.id}" data-row-summary="${escapeHtml(rowSummary(rowState))}">
        <div class="gm-row">
          <span class="gm-row-index">${String(index + 1).padStart(2, "0")}</span>
          <input data-key="text" value="${escapeHtml(rowState.text)}" placeholder="写一行字，让花园长出来" aria-label="第 ${index + 1} 行文字">
          <span class="tg-row-spacer" aria-hidden="true"></span>
          <button data-action="up" type="button" aria-label="上移">↑</button>
          <button data-action="down" type="button" aria-label="下移">↓</button>
          <button data-action="delete" type="button" aria-label="删除"${state.scheme.rows.length <= minimum ? " disabled title=\"至少保留一行文字\"" : ""}>×</button>
        </div>
        <label class="gm-row-font">本行字体<select data-key="fontFamily" data-stg-font-library="true" aria-label="第 ${index + 1} 行字体">${window.MERowFonts?.options(rowState.fontFamily) || '<option value="">跟随全局字体</option>'}</select></label>
        <div class="gm-row-text-color">
          <label>本段文字颜色<input data-row-text-color type="color" value="${normalizeColor(rowState.textColor || state.scheme.garden.colors.text)}"></label>
          <button data-action="follow-palette" type="button"${rowState.textColor ? "" : " disabled"}>${rowState.textColor ? "改回跟随配色" : "跟随配色中"}</button>
          <button data-action="apply-text-color-all" type="button">应用到全部段落</button>
        </div>
        <div class="gm-row-meta">
          <button class="gm-row-target${state.activeRowId === rowState.id ? " is-active" : ""}" data-action="target" type="button">＋ 插入图标</button>
          <button class="gm-row-pause" data-action="pause-row" type="button">暂停修改</button>
          <span class="gm-row-icon-count">${(rowState.icons || []).length} 个图标</span>
        </div>
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
    [["iconSize", icon.size, "%"], ["iconGap", icon.gap, "%"], ["iconX", icon.x, "%"], ["iconY", icon.y, "%"]].forEach(([id, value, suffix]) => {
      $(id).value = String(value);
      const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = `${value}${suffix}`;
    });
  }

  // ---------- Motion presets and palettes ----------
  function renderPresets() {
    const current = state.scheme.garden.preset;
    syncAddons();
    $("presetGrid").innerHTML = PRESETS.map((preset) => `<button type="button" role="radio" data-preset="${preset.id}" aria-checked="${preset.id === current}" class="tg-preset${preset.id === current ? " is-active" : ""}"><span class="tg-preset-head"><strong>${preset.label}</strong><em>${preset.T / 1000}s</em></span><small>${preset.sub}</small></button>`).join("");
  }
  // Visitor and Reach carry their own butterflies / lights; elsewhere they are optional add-ons.
  function syncAddons() {
    const { preset, flyOn, lightOn } = state.scheme.garden;
    const own = { fly: preset === "visit", light: preset === "reach" };
    controls.flyOn.checked = own.fly || flyOn; controls.flyOn.disabled = own.fly;
    controls.lightOn.checked = own.light || lightOn; controls.lightOn.disabled = own.light;
    controls.butterflies.disabled = !controls.flyOn.checked; controls.lights.disabled = !controls.lightOn.checked;
    $("flyAddon").classList.toggle("is-on", controls.flyOn.checked);
    $("lightAddon").classList.toggle("is-on", controls.lightOn.checked);
    $("flyAddon").title = own.fly ? "访客动态自带蝴蝶" : "";
    $("lightAddon").title = own.light ? "追光动态自带光点" : "";
  }
  function renderPalettes() {
    const { palette, colors } = state.scheme.garden;
    $("paletteGrid").innerHTML = PALETTES.map((p, index) => `<button type="button" role="radio" data-palette="${index}" aria-checked="${index === palette}" class="tg-palette${index === palette ? " is-active" : ""}" title="${p.zh} · ${p.name}">
      <span class="tg-palette-chip" style="background:${p.bg}"><i style="background:${p.flower}"></i><i style="background:${p.stem}"></i><b style="color:${p.text}">Aa</b></span><span>${p.zh}</span></button>`).join("");
    document.querySelectorAll("[data-color]").forEach((input) => { input.value = colors[input.dataset.color]; });
    controls.textColor.value = colors.text;
    controls.backgroundColor.value = colors.bg;
    $("bgQuickColor").value = colors.bg;
    document.querySelectorAll("[data-bg-quick]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.bgQuick === colors.bg)));
    $("backgroundSwatch").style.backgroundColor = colors.bg;
    document.querySelectorAll("[data-row-text-color]").forEach((input) => {
      const rowState = state.scheme.rows.find((item) => item.id === input.closest(".gm-row-shell")?.dataset.rowId);
      if (rowState && !rowState.textColor) input.value = colors.text;
    });
  }

  // ---------- Timeline ----------
  function timelinePhases() {
    const P = ensurePoster();
    const T = P.T, L = P.letters.filter((l) => l.ch !== " ");
    const maxB = L.length ? Math.max(...L.map((l) => l.b)) : 0;
    const minD = L.length ? Math.min(...L.map((l) => l.d)) : T;
    const maxD = L.length ? Math.max(...L.map((l) => l.d)) : T;
    const text = state.scheme.rows.map((item) => item.text.trim()).filter(Boolean).join(" / ") || "花园";
    const list = [];
    const push = (label, kind, from, to, detail = text) => { from = clamp(from, 0, T); to = clamp(to, 0, T); if (to - from > 1) list.push({ label, kind, from, to, detail }); };
    switch (P.preset) {
      case "breathe": push("整园呼吸", "air", 0, T); break;
      case "grow": {
        const bloomed = Math.min(minD, maxB + 1300);
        push("逐字生长", "grow", 0, bloomed); push("盛放停留", "bloom", bloomed, minD); push("依次凋谢", "wither", minD, maxD + 600); push("留白", "still", maxD + 600, T);
        break;
      }
      case "typed": push("逐字输入", "grow", 0, maxB + 80); push("剪断收尾", "bloom", maxB + 80, 4400); push("清屏", "still", 4400, T); break;
      case "wind": {
        const xs = L.map((l) => l.tx / P.W);
        const a = ((xs.length ? Math.min(...xs) : 0.1) - 0.15 + 0.35) / 1.9 * T, b = ((xs.length ? Math.max(...xs) : 0.9) + 0.2 + 0.35) / 1.9 * T;
        push("静候", "still", 0, a); push("阵风扫过", "air", a, b); push("余摆回稳", "wing", b, T);
        break;
      }
      case "reach":
        if (state.scheme.garden.lights > 1) { push("追光 · 前半圈", "air", 0, T / 2, `${state.scheme.garden.lights} 个光点`); push("追光 · 后半圈", "wing", T / 2, T, `${state.scheme.garden.lights} 个光点`); }
        else { push("追光 · 右侧", "air", 0, T / 2); push("追光 · 左侧", "wing", T / 2, T); }
        break;
      case "scatter": {
        const bloomed = Math.min(minD, maxB + 1300);
        push("随机绽放", "grow", 0, bloomed); push("盛放停留", "bloom", bloomed, minD); push("一齐凋谢", "wither", minD, maxD + 600); push("留白", "still", maxD + 600, T);
        break;
      }
      case "visit": {
        const who = state.scheme.garden.butterflies > 1 ? `第 1 只 / 共 ${state.scheme.garden.butterflies} 只` : text;
        push("蝴蝶飞入", "wing", 0, 1800, who); push("停在花上", "bloom", 1800, 3400, who); push("换一朵花", "wing", 3400, 4600, who); push("再次停驻", "bloom", 4600, 5800, who); push("飞离", "wing", 5800, T, who);
        break;
      }
      default: push("花园", "air", 0, T);
    }
    return list;
  }
  // A readable full-bloom moment for row pause and icon editing.
  function stablePosterMs() {
    const P = ensurePoster();
    const L = P.letters.filter((l) => l.ch !== " ");
    if (P.preset === "grow" || P.preset === "scatter") return Math.max(0, Math.min(...L.map((l) => l.d), P.T) - 120);
    if (P.preset === "typed") return 4300;
    return 0;
  }
  function stableElapsed() { return stablePosterMs() / Math.max(0.01, state.scheme.garden.speed); }
  function renderTimeline() {
    const speed = Math.max(0.01, state.scheme.garden.speed);
    $("timeline").innerHTML = timelinePhases().map((phase) => {
      const start = phase.from / speed;
      const seconds = (phase.to - phase.from) / speed / 1000;
      return `<button type="button" data-seek-ms="${start}" class="gm-timeline-block me-choreo-block" data-phase-color="${FILL[phase.kind]}" style="background:${FILL[phase.kind]} !important" role="listitem"><strong>${escapeHtml(phase.label)}</strong><small data-no-translate>${escapeHtml(phase.detail)} · ${seconds.toFixed(2)}s</small></button>`;
    }).join("");
    const total = cycleDurationMs();
    $("scrubber").max = String(Math.max(0.001, total));
    $("timeTotal").textContent = `${(total / 1000).toFixed(2)}s`;
  }

  // ---------- Controls and scheme ----------
  const controlIds = ["fontFamily", "layoutScale", "letterSpacing", "positionX", "positionY", "speed", "density", "flowers", "textFront", "butterflies", "lights", "flyOn", "lightOn", "recoil", "seed", "boil", "textColor", "backgroundColor", "backgroundOpacity", "backgroundZoom", "backgroundX", "backgroundY"];
  const controls = Object.fromEntries(controlIds.map((id) => [id, $(id)]));
  function updateOutputs() {
    const formats = { layoutScale: (v) => `${v}%`, letterSpacing: (v) => `${v}%`, positionX: (v) => `${v}%`, positionY: (v) => `${v}%`, speed: (v) => `${Number(v).toFixed(2)}×`, density: (v) => `${Number(v).toFixed(1)}×`, flowers: (v) => `${v}%`, butterflies: (v) => `${v} 只`, lights: (v) => `${v} 个`, recoil: (v) => `${v}px` };
    Object.entries(formats).forEach(([id, format]) => {
      const output = document.querySelector(`output[for="${id}"]`);
      if (output) output.value = format(Number(controls[id].value));
    });
  }
  function syncBackgroundChrome() {
    const media = state.scheme.background.media;
    $("backgroundSwatch").style.backgroundColor = state.scheme.garden.colors.bg;
    $("backgroundSwatch").setAttribute("aria-label", `当前背景颜色 ${state.scheme.garden.colors.bg}`);
    $("backgroundMediaInfo").hidden = !media;
    $("backgroundMediaName").textContent = media?.name || "";
    const kind = isVideoMedia(media) ? "视频" : /gif/i.test(media?.type || "") ? "GIF" : media ? "图片" : "";
    $("backgroundMediaType").textContent = kind;
    $("backgroundMediaLabel").textContent = kind || "未上传";
    syncVideoTrim();
  }
  function syncControlsFromState() {
    const { canvas: canvasState, typography, garden: g, background } = state.scheme;
    $("canvasPreset").value = canvasState.preset;
    $("canvasWidth").value = canvasState.width;
    $("canvasHeight").value = canvasState.height;
    document.querySelector(".gm-custom-size").hidden = canvasState.preset !== "custom";
    library()?.enhanceSelect(controls.fontFamily);
    controls.fontFamily.value = typography.fontFamily;
    ["layoutScale", "letterSpacing", "positionX", "positionY"].forEach((id) => { controls[id].value = typography[id]; });
    ["speed", "density", "flowers", "butterflies", "lights", "recoil", "seed"].forEach((id) => { controls[id].value = g[id]; });
    controls.boil.checked = Boolean(g.boil);
    controls.textFront.checked = Boolean(g.textFront);
    syncAddons();
    controls.backgroundOpacity.value = background.opacity;
    controls.backgroundZoom.value = background.zoom;
    controls.backgroundX.value = background.x;
    controls.backgroundY.value = background.y;
    renderRows();
    renderPresets();
    renderPalettes();
    syncBackgroundChrome();
    renderSelectedAssets();
    renderTimeline();
    updateOutputs();
    syncLock();
    resizePreview();
  }
  function collectControls() {
    const { typography, garden: g, background } = state.scheme;
    typography.fontFamily = normalizeFontValue(controls.fontFamily.value) || "stg:playfair";
    typography.layoutScale = number(controls.layoutScale.value, 100, 50, 150);
    typography.letterSpacing = number(controls.letterSpacing.value, 0, -20, 40);
    typography.positionX = number(controls.positionX.value, 0, -40, 40);
    typography.positionY = number(controls.positionY.value, 0, -40, 40);
    g.speed = number(controls.speed.value, 1, 0.25, 2);
    g.density = number(controls.density.value, 1, 0.5, 1.6);
    g.recoil = number(controls.recoil.value, 20, 0, 80);
    g.seed = Math.round(number(controls.seed.value, 7, 0, 999999));
    g.boil = controls.boil.checked;
    g.flowers = Math.round(number(controls.flowers.value, 100, 0, 100));
    g.butterflies = Math.round(number(controls.butterflies.value, 1, 1, 6));
    g.lights = Math.round(number(controls.lights.value, 1, 1, 4));
    if (!controls.flyOn.disabled) g.flyOn = controls.flyOn.checked;
    if (!controls.lightOn.disabled) g.lightOn = controls.lightOn.checked;
    g.textFront = controls.textFront.checked;
    background.opacity = number(controls.backgroundOpacity.value, 100, 0, 100);
    background.zoom = number(controls.backgroundZoom.value, 1, 1, 4);
    background.x = number(controls.backgroundX.value, 0, -100, 100);
    background.y = number(controls.backgroundY.value, 0, -100, 100);
  }
  function autoSave() {
    if (state.previewMode) return;
    // A video is kept as a session blob URL, which cannot survive a reload.
    const stored = clone(state.scheme);
    if (/^blob:/.test(stored.background.media?.url || "")) stored.background.media = null;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); }
    catch (_) { $("exportStatus").textContent = "背景素材较大，当前编辑仍可使用；请下载 JSON 方案以长期保留。"; }
  }
  function normalizeRow(input) {
    const result = row(input?.id || uid(), String(input?.text ?? ""));
    result.fontFamily = normalizeFontValue(input?.fontFamily);
    result.textColor = input?.textColor ? normalizeColor(input.textColor) : "";
    const glyphCount = split(result.text).length, seen = new Set();
    result.icons = (Array.isArray(input?.icons) ? input.icons : []).map((icon) => ({
      id: icon.id || uid(), libraryId: String(icon.libraryId || ""), boundary: clamp(Math.round(Number(icon.boundary) || 0), 0, glyphCount),
      size: clamp(Number(icon.size) || 80, 20, 200), gap: clamp(Number(icon.gap) || 0, 0, 60), x: clamp(Number(icon.x) || 0, -100, 100), y: clamp(Number(icon.y) || 0, -100, 100)
    })).filter((icon) => libraryAsset(icon.libraryId) && !seen.has(icon.libraryId) && seen.add(icon.libraryId));
    return result;
  }
  function applyScheme(scheme, status = "") {
    if (!scheme || !Array.isArray(scheme.rows)) return;
    const typography = { ...clone(DEFAULT_SCHEME.typography), ...(scheme.typography || {}) };
    typography.fontFamily = normalizeFontValue(typography.fontFamily) || DEFAULT_SCHEME.typography.fontFamily;
    typography.letterSpacing = number(typography.letterSpacing, 0, -20, 40);
    const g = { ...clone(DEFAULT_SCHEME.garden), ...(scheme.garden || {}) };
    g.preset = PRESETS.some((p) => p.id === g.preset) ? g.preset : "breathe";
    g.palette = Number.isInteger(g.palette) && PALETTES[g.palette] ? g.palette : -1;
    const fallback = paletteColors(g.palette >= 0 ? g.palette : 0);
    const given = scheme.garden?.colors || {};
    g.colors = Object.fromEntries(COLOR_KEYS.map((key) => [key, normalizeColor(given[key], fallback[key])]));
    g.density = number(g.density, 1, 0.5, 1.6); g.recoil = number(g.recoil, 20, 0, 80); g.speed = number(g.speed, 1, 0.25, 2);
    g.seed = Math.round(number(g.seed, 7, 0, 999999)); g.boil = g.boil !== false;
    g.flowers = Math.round(number(g.flowers, 100, 0, 100)); g.textFront = g.textFront === true;
    g.butterflies = Math.round(number(g.butterflies, 1, 1, 6)); g.lights = Math.round(number(g.lights, 1, 1, 4));
    g.flyOn = g.flyOn === true; g.lightOn = g.lightOn === true;
    const background = { ...clone(DEFAULT_SCHEME.background), ...(scheme.background || {}) };
    background.media = background.media?.url ? { name: String(background.media.name || "背景"), type: String(background.media.type || ""), url: String(background.media.url) } : null;
    background.x = number(background.x, 0, -100, 100); background.y = number(background.y, 0, -100, 100);
    background.videoStart = Math.max(0, Number(background.videoStart) || 0);
    background.videoEnd = Math.max(0, Number(background.videoEnd) || 0);
    const canvasState = { ...clone(DEFAULT_SCHEME.canvas), ...(scheme.canvas || {}) };
    canvasState.width = Math.round(number(canvasState.width, 1080, 320, 3840));
    canvasState.height = Math.round(number(canvasState.height, 1080, 320, 3840));
    state.scheme = { version: VERSION, canvas: canvasState, typography, garden: g, background, rows: scheme.rows.map(normalizeRow) };
    state.lock = WALLPAPER.has(canvasState.preset);
    if (!state.scheme.rows.length) state.scheme.rows.push(row(uid(), ""));
    if (!state.scheme.rows.some((item) => item.id === state.activeRowId)) state.activeRowId = state.scheme.rows[0].id;
    state.caretBoundary = clamp(state.caretBoundary, 0, split(state.scheme.rows.find((item) => item.id === state.activeRowId)?.text || "").length);
    state.activeIconId = "";
    state.posterKey = "";
    state.elapsedMs = 0;
    state.playing = !state.reducedMotion;
    state.lastFrame = performance.now();
    updatePlaybackButton();
    syncControlsFromState();
    refreshFonts();
    prepareBackground();
    preloadInsertedAssets().then(() => { state.posterKey = ""; resizePreview(); });
    autoSave();
    if (status) $("exportStatus").textContent = status;
  }
  function changed({ restart = false, stable = false } = {}) {
    collectControls();
    state.posterKey = "";
    if (restart) { state.elapsedMs = 0; state.playing = true; state.lastFrame = performance.now(); updatePlaybackButton(); }
    document.querySelectorAll("#sequenceRows .gm-row-shell").forEach((element) => {
      const rowState = state.scheme.rows.find((item) => item.id === element.dataset.rowId);
      if (rowState) refreshRowChrome(element, rowState);
    });
    live.density = state.scheme.garden.density;
    live.flowers = state.scheme.garden.flowers / 100;
    if (live.tracking !== state.scheme.typography.letterSpacing / 100) { live.tracking = state.scheme.typography.letterSpacing / 100; live.layout(true); }
    renderTimeline();
    updateOutputs();
    autoSave();
    if (stable && !state.playing) pauseAt(stableElapsed());
    else resizePreview();
  }

  // ---------- Playback ----------
  function updatePlaybackButton() {
    $("togglePlayback").innerHTML = state.playing ? "Ⅱ <span>暂停</span>" : "▶ <span>播放</span>";
    $("togglePlayback").setAttribute("aria-pressed", String(!state.playing));
  }
  function pauseAt(elapsedMs) {
    if (state.mode === "live") setMode("poster");
    state.elapsedMs = Math.max(0, elapsedMs);
    state.playing = false;
    updatePlaybackButton();
    resizePreview();
  }
  // Row pause lands on the complete, readable garden.
  function seekToRowStart(rowIdOrIndex, pause = true) {
    const index = typeof rowIdOrIndex === "number" ? rowIdOrIndex : state.scheme.rows.findIndex((item) => item.id === rowIdOrIndex);
    const rowState = state.scheme.rows[index];
    if (rowState) state.activeRowId = rowState.id;
    if (pause) pauseAt(stableElapsed());
    else playFrom(0);
  }
  function playFrom(elapsedMs) {
    if (state.mode === "live") setMode("poster");
    state.elapsedMs = Math.max(0, elapsedMs);
    state.playing = true;
    state.lastFrame = performance.now();
    updatePlaybackButton();
    resizePreview();
  }

  // ---------- Live typing ("边打边长") ----------
  const SENT = String.fromCharCode(0x200b); // kept in the hidden field so Backspace on an empty field still reports
  const liveInput = $("tgLiveInput");
  let liveValue = SENT, composing = false, keyHandled = false;
  // What was typed live becomes the poster text (as in the original Type → Poster switch).
  function carryLiveText() {
    const text = live.liveText();
    if (!text || text === state.scheme.rows.map((item) => item.text).join(" ").trim()) return false;
    const first = state.scheme.rows[0];
    state.scheme.rows = [row(first.id, text, { fontFamily: first.fontFamily, textColor: first.textColor })];
    state.activeRowId = first.id;
    state.caretBoundary = split(text).length;
    state.posterKey = "";
    renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); refreshFonts();
    $("exportStatus").textContent = `已把刚打的“${text}”带进循环海报。`;
    return true;
  }
  function setMode(mode) {
    if (state.mode === mode) return;
    if (state.mode === "live" && mode === "poster") carryLiveText();
    state.mode = mode;
    document.body.classList.toggle("tg-live", mode === "live");
    $("tgLiveBar").hidden = mode !== "live";
    document.querySelectorAll("#tgModes button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
    if (mode === "live") {
      const { W, H } = logicalSize();
      live.face = faceFor(state.scheme.typography.fontFamily);
      live.density = state.scheme.garden.density;
      live.flowers = state.scheme.garden.flowers / 100;
      live.tracking = state.scheme.typography.letterSpacing / 100;
      live.clearCache();
      live.setSize(W, H);
      live.t0 = performance.now();
      liveInput.value = SENT; liveValue = SENT;
      liveInput.focus({ preventScroll: true });
      $("exportStatus").textContent = "边打边长：直接打字。PNG / SVG 导出当前画面；GIF / MP4 导出下方选中的循环动态。";
    }
    resizePreview();
  }
  function liveMark() { live.lastKey = performance.now(); keyHandled = true; setTimeout(() => { keyHandled = false; }, 0); }
  function liveKey(event) {
    if (state.mode !== "live" || event.isComposing || event.keyCode === 229) return;
    if (event.metaKey || event.ctrlKey || event.altKey) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); (event.shiftKey ? $("exportSvg") : $("exportPng")).click(); }
      return;
    }
    const now = performance.now();
    if (event.key === "Backspace") { event.preventDefault(); liveMark(); live.wither(now); return; }
    if (event.key === "Enter") { event.preventDefault(); liveMark(); live.clear(); return; }
    if (event.key === "Escape") { liveInput.blur(); return; }
    if (event.key.length !== 1) return;
    event.preventDefault(); liveMark();
    live.add(event.key, now);
    refreshFontsSoon();
  }
  // phone keyboards and IMEs write into the field instead: mirror it and apply the difference
  function liveInputDiff() {
    if (state.mode !== "live" || keyHandled) { liveValue = composing ? liveInput.value : SENT; if (!composing) liveInput.value = SENT; return; }
    if (composing) return;
    const old = liveValue == null ? SENT : liveValue, cur = liveInput.value;
    let p = 0; while (p < old.length && p < cur.length && old[p] === cur[p]) p++;
    let dels = old.length - p;
    if (p === 0 && old[0] === SENT && old.length > 1) dels -= 1;
    const now = performance.now(); live.lastKey = now;
    for (let i = 0; i < dels; i++) live.wither(now);
    for (const ch of split(cur.slice(p))) {
      if (ch === SENT) continue;
      if (ch === "\n") live.clear(); else live.add(ch, now);
    }
    liveInput.value = SENT; liveValue = SENT;
    refreshFontsSoon();
  }
  let fontTimer = 0;
  function refreshFontsSoon() { clearTimeout(fontTimer); fontTimer = setTimeout(refreshFonts, 250); }
  liveInput.addEventListener("keydown", liveKey);
  liveInput.addEventListener("input", liveInputDiff);
  liveInput.addEventListener("compositionstart", () => { composing = true; });
  liveInput.addEventListener("compositionend", () => { composing = false; setTimeout(liveInputDiff, 0); });
  function logicalPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const { W, H } = logicalSize();
    return [(event.clientX - rect.left) / rect.width * W, (event.clientY - rect.top) / rect.height * H];
  }
  canvas.addEventListener("pointermove", (event) => { if (state.mode !== "live") return; [live.mx, live.my] = logicalPoint(event); });
  canvas.addEventListener("pointerleave", () => { live.mx = null; });
  canvas.addEventListener("pointerup", (event) => { if (event.pointerType && event.pointerType !== "mouse") live.mx = null; });
  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode !== "live") return;
    const [x, y] = logicalPoint(event);
    live.spawnFly(x, y);
    if (event.pointerType === "mouse") { event.preventDefault(); liveInput.focus({ preventScroll: true }); }
  });
  canvas.addEventListener("click", () => { if (state.mode === "live") liveInput.focus({ preventScroll: true }); });
  $("tgModes").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    if (button.dataset.mode === "poster") playFrom(0); else setMode("live");
  });
  $("tgLiveToPoster").addEventListener("click", () => {
    if (!live.liveText()) { $("exportStatus").textContent = "先在画布上打几个字。"; return; }
    playFrom(0);
    $("exportStatus").textContent = `已用“${live.liveText()}”生成循环海报，可以导出 GIF / MP4。`;
  });

  // ---------- Lock-screen preview (editor only, never exported) ----------
  const lockAllowed = () => state.scheme.canvas.height > state.scheme.canvas.width;
  function syncLock() {
    if (!lockAllowed()) state.lock = false;
    $("toggleLock").hidden = !lockAllowed();
    $("tgLock").hidden = !state.lock;
    $("toggleLock").setAttribute("aria-pressed", String(state.lock));
    if (!state.lock) return;
    const now = new Date();
    $("tgLockTime").textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    $("tgLockDate").textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${"日一二三四五六"[now.getDay()]}`;
  }
  $("toggleLock").addEventListener("click", () => { state.lock = !state.lock; syncLock(); });

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
    state.lock = WALLPAPER.has(preset);
    syncLock();
    changed();
  });
  ["canvasWidth", "canvasHeight"].forEach((id) => $(id).addEventListener("change", () => {
    state.scheme.canvas[id === "canvasWidth" ? "width" : "height"] = Math.round(clamp(Number($(id).value) || 1080, 320, 3840));
    syncLock();
    changed();
  }));
  controlIds.forEach((id) => controls[id].addEventListener(["seed", "boil", "textFront", "flyOn", "lightOn"].includes(id) ? "change" : "input", () => {
    if (id === "flyOn" || id === "lightOn") { collectControls(); syncAddons(); autoSave(); resizePreview(); return; }
    if (id === "textColor" || id === "backgroundColor") {
      state.scheme.garden.colors[id === "textColor" ? "text" : "bg"] = normalizeColor(controls[id].value);
      state.scheme.garden.palette = -1;
      renderPalettes(); syncBackgroundChrome(); autoSave(); resizePreview();
      return;
    }
    if (id === "fontFamily") { collectControls(); live.face = faceFor(state.scheme.typography.fontFamily); live.clearCache(); live.layout(true); renderRows(); refreshFonts(); }
    changed({ restart: id === "speed", stable: ["layoutScale", "letterSpacing", "positionX", "positionY", "fontFamily", "density", "flowers", "seed", "textFront"].includes(id) });
  }));
  $("presetGrid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-preset]");
    if (!button) return;
    state.scheme.garden.preset = button.dataset.preset;
    state.posterKey = "";
    renderPresets(); renderTimeline(); autoSave();
    playFrom(0);
  });
  $("paletteGrid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-palette]");
    if (!button) return;
    const index = Number(button.dataset.palette);
    state.scheme.garden.palette = index;
    state.scheme.garden.colors = paletteColors(index);
    renderPalettes(); syncBackgroundChrome(); autoSave(); resizePreview();
  });
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  function setQuickBackground(value) {
    const colors = state.scheme.garden.colors;
    colors.bg = normalizeColor(value, "#000000");
    let note = "";
    if (contrast(colors.text, colors.bg) < 3) { colors.text = luminance(colors.bg) > 0.4 ? "#111111" : "#FFFFFF"; note = "，文字颜色已自动调成能看清的颜色"; }
    if (contrast(colors.line, colors.flower) < 1.2) colors.line = luminance(colors.flower) > 0.4 ? "#1A1A1A" : "#FFFFFF";
    state.scheme.garden.palette = -1;
    renderPalettes(); syncBackgroundChrome(); autoSave(); resizePreview();
    $("exportStatus").textContent = `背景已换成 ${colors.bg}${note}。`;
  }
  document.querySelector(".tg-bg-quick").addEventListener("click", (event) => {
    const button = event.target.closest("[data-bg-quick]");
    if (button) setQuickBackground(button.dataset.bgQuick);
  });
  $("bgQuickColor").addEventListener("input", () => setQuickBackground($("bgQuickColor").value));
  document.querySelectorAll("[data-color]").forEach((input) => input.addEventListener("input", () => {
    state.scheme.garden.colors[input.dataset.color] = normalizeColor(input.value);
    state.scheme.garden.palette = -1;
    renderPalettes(); syncBackgroundChrome(); autoSave(); resizePreview();
  }));
  $("regrow").addEventListener("click", () => {
    state.scheme.garden.seed = Math.floor(Math.random() * 1e6);
    controls.seed.value = state.scheme.garden.seed;
    state.posterKey = "";
    renderTimeline(); autoSave();
    playFrom(0);
  });
  $("backgroundFile").addEventListener("change", async () => {
    const file = $("backgroundFile").files?.[0];
    if (!file) return;
    const video = /^video\//i.test(file.type);
    const url = video ? URL.createObjectURL(file) : await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const previous = state.scheme.background.media?.url;
    if (/^blob:/.test(previous || "")) setTimeout(() => URL.revokeObjectURL(previous), 1000);
    state.scheme.background.media = { name: file.name, type: file.type, url };
    state.scheme.background.videoStart = 0;
    state.scheme.background.videoEnd = 0;
    if (video) $("exportStatus").textContent = "视频背景已载入：拖动片段两侧把手选择要循环的几秒。视频只在本次编辑中保留，刷新前请先导出。";
    $("backgroundFile").value = "";
    syncBackgroundChrome();
    await prepareBackground();
    autoSave();
    resizePreview();
  });
  function trimFromPointer(edge, clientX) {
    const rect = $("videoTimeline").getBoundingClientRect();
    const { start, end, duration } = videoTrim();
    const time = clamp((clientX - rect.left) / Math.max(1, rect.width)) * duration;
    if (edge === "start") setVideoTrim(time, end); else setVideoTrim(start, time);
  }
  $("videoTimeline").addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".gm-video-handle");
    const { start, end } = videoTrim(), rect = $("videoTimeline").getBoundingClientRect();
    const time = clamp((event.clientX - rect.left) / Math.max(1, rect.width)) * videoTrim().duration;
    const edge = handle?.dataset.edge || (Math.abs(time - start) < Math.abs(time - end) ? "start" : "end");
    event.preventDefault();
    $("videoTimeline").setPointerCapture(event.pointerId);
    trimFromPointer(edge, event.clientX);
    const move = (moveEvent) => trimFromPointer(edge, moveEvent.clientX);
    const up = () => { $("videoTimeline").removeEventListener("pointermove", move); $("videoTimeline").removeEventListener("pointerup", up); $("videoTimeline").removeEventListener("pointercancel", up); };
    $("videoTimeline").addEventListener("pointermove", move);
    $("videoTimeline").addEventListener("pointerup", up);
    $("videoTimeline").addEventListener("pointercancel", up);
  });
  $("videoTimeline").addEventListener("keydown", (event) => {
    const handle = event.target.closest(".gm-video-handle");
    if (!handle || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const step = (event.shiftKey ? 1 : 0.1) * (event.key === "ArrowLeft" ? -1 : 1);
    const { start, end } = videoTrim();
    if (handle.dataset.edge === "start") setVideoTrim(start + step, end); else setVideoTrim(start, end + step);
  });
  ["videoStart", "videoEnd"].forEach((id) => $(id).addEventListener("change", () => setVideoTrim(Number($("videoStart").value) || 0, Number($("videoEnd").value) || 0)));
  $("backgroundRemove").addEventListener("click", () => {
    state.scheme.background.media = null;
    syncBackgroundChrome();
    prepareBackground();
    autoSave();
    resizePreview();
  });

  function handleRowInput(event) {
    const rowElement = event.target.closest(".gm-row-shell");
    const rowState = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!rowState) return;
    state.activeRowId = rowState.id;
    if (event.target.matches("[data-row-text-color]")) {
      rowState.textColor = normalizeColor(event.target.value);
      const follow = rowElement.querySelector('[data-action="follow-palette"]');
      if (follow) { follow.disabled = false; follow.textContent = "改回跟随配色"; }
      state.posterKey = "";
      autoSave();
      if (state.playing) pauseAt(stableElapsed()); else resizePreview();
      return;
    }
    const key = event.target.dataset.key;
    if (!key) return;
    if (key === "fontFamily") rowState.fontFamily = normalizeFontValue(event.target.value);
    else rowState[key] = event.target.value;
    if (key === "text") {
      const glyphCount = split(rowState.text).length;
      (rowState.icons || []).forEach((icon) => { icon.boundary = clamp(icon.boundary, 0, glyphCount); });
      state.caretBoundary = split(rowState.text.slice(0, event.target.selectionStart ?? rowState.text.length)).length;
      updateInsertTargetLabel();
      renderSelectedAssets();
    }
    refreshFonts();
    refreshRowChrome(rowElement, rowState);
    state.posterKey = "";
    renderTimeline();
    autoSave();
    pauseAt(stableElapsed());
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
    if (action === "edit-icon") { openIconEditor(button.dataset.iconId); return; }
    if (action === "target") {
      const input = rowElement.querySelector('input[data-key="text"]');
      state.caretBoundary = split(rowState.text.slice(0, input?.selectionStart ?? rowState.text.length)).length;
      renderRows(); renderLibrarySelection();
      setIconLibraryDrawer(true);
      return;
    }
    if (action === "follow-palette") {
      rowState.textColor = "";
      state.posterKey = "";
      renderRows(); renderPalettes(); autoSave(); pauseAt(stableElapsed());
      return;
    }
    if (action === "apply-text-color-all") {
      const value = rowState.textColor;
      state.scheme.rows.forEach((item) => { item.textColor = value; });
      $("exportStatus").textContent = value ? "文字颜色已应用到全部段落。" : "全部段落改为跟随配色。";
      state.posterKey = "";
      renderRows(); renderPalettes(); autoSave(); pauseAt(stableElapsed());
      return;
    }
    if (action === "delete" && state.scheme.rows.length > 1) {
      state.scheme.rows.splice(index, 1);
      if (!state.scheme.rows.some((item) => item.id === state.activeRowId)) state.activeRowId = state.scheme.rows[Math.max(0, index - 1)].id;
    }
    if (action === "up" && index > 0) [state.scheme.rows[index - 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index - 1]];
    if (action === "down" && index < state.scheme.rows.length - 1) [state.scheme.rows[index + 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index + 1]];
    state.posterKey = "";
    renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); pauseAt(stableElapsed());
  });
  $("addRow").addEventListener("click", () => {
    const source = state.scheme.rows.find((item) => item.id === state.activeRowId) || state.scheme.rows[state.scheme.rows.length - 1];
    const nextRow = row(uid(), "新的一行", source ? { fontFamily: source.fontFamily, textColor: source.textColor } : {});
    state.scheme.rows.push(nextRow);
    state.activeRowId = nextRow.id;
    state.posterKey = "";
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
  function iconsChanged() { state.posterKey = ""; renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); resizePreview(); }
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
    rowState.icons = [...(rowState.icons || []), { id: uid(), libraryId: asset.libraryId, boundary: clamp(state.caretBoundary, 0, split(rowState.text).length), size: 80, gap: 6, x: 0, y: 0 }];
    loadAssetResource(asset).then(resizePreview);
    iconsChanged();
    pauseAt(stableElapsed());
    $("exportStatus").textContent = `已将“${asset.name}”插入第 ${state.scheme.rows.indexOf(rowState) + 1} 行，它会像字母一样长出花茎。`;
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
  [["iconSize", "size", "%"], ["iconGap", "gap", "%"], ["iconX", "x", "%"], ["iconY", "y", "%"]].forEach(([id, key, suffix]) => {
    $(id).addEventListener("input", () => {
      const entry = activeIconEntry(); if (!entry) return;
      entry.icon[key] = Number($(id).value);
      const output = document.querySelector(`output[for="${id}"]`); if (output) output.value = `${entry.icon[key]}${suffix}`;
      state.posterKey = ""; autoSave(); resizePreview();
    });
    $(id).addEventListener("change", () => { renderRows(); renderSelectedAssets(); });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.target === liveInput) return;
    if (state.activeIconId) { state.activeIconId = ""; renderAssetEditor(); renderSelectedAssets(); return; }
    if ($("iconLayerPanel").classList.contains("is-list-expanded")) { setLayerManager(false); return; }
    if (document.body.classList.contains("gm-library-open")) setIconLibraryDrawer(false);
  });

  $("scrubber").addEventListener("input", () => pauseAt(Number($("scrubber").value)));
  $("timeline").addEventListener("click", (event) => {
    const block = event.target.closest("[data-seek-ms]");
    if (block) pauseAt(Number(block.dataset.seekMs) + 1);
  });
  $("togglePlayback").addEventListener("click", () => {
    if (state.mode === "live") { playFrom(state.elapsedMs); return; }
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
  $("restoreScheme").addEventListener("click", () => { try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} applyScheme(clone(DEFAULT_SCHEME), "已恢复默认方案。"); });
  $("clearScheme").addEventListener("click", () => {
    const cleared = clone(state.scheme);
    cleared.rows = [row(cleared.rows[0]?.id || uid(), "", { fontFamily: cleared.rows[0]?.fontFamily || "", textColor: cleared.rows[0]?.textColor || "" })];
    applyScheme(cleared, "文字已清空，配色、动态和画布保持不变。");
    $("sequenceRows").querySelector('input[data-key="text"]')?.focus();
  });

  // ---------- Export ----------
  function exportCanvas(scale = 1) {
    const output = document.createElement("canvas");
    output.width = Math.max(2, Math.round(state.scheme.canvas.width * scale));
    output.height = Math.max(2, Math.round(state.scheme.canvas.height * scale));
    return output;
  }
  function exportSeconds() {
    const value = $("exportDuration").value;
    if (value === "cycle") return cycleDurationMs() / 1000;
    if (value.endsWith("s")) return Number(value.slice(0, -1));
    return cycleDurationMs() / 1000 * Number(value);
  }
  function setBusy(value, message) {
    state.exportBusy = value;
    document.querySelectorAll("#exportPng,#exportGif,#exportMp4,#exportSvg").forEach((button) => { button.disabled = value; });
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
  async function exportReady() { await refreshFonts(); await prepareBackground(); await preloadInsertedAssets(); ensurePoster(); }
  const fileBase = () => `${SLUG}-${(state.mode === "live" ? live.liveText() : state.scheme.rows.map((item) => item.text).join(" ")).trim().replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase().slice(0, 24) || "garden"}`;
  $("exportPng").addEventListener("click", async () => {
    await exportReady();
    const output = exportCanvas();
    if (state.mode === "live") renderLive(output, output.width, output.height, false);
    else { await syncExportMedia(state.elapsedMs / 1000); renderFrame(output, state.elapsedMs / 1000, output.width, output.height, true); }
    output.toBlob((blob) => {
      if (!blob) return;
      download(blob, `${fileBase()}-${output.width}x${output.height}.png`);
      $("exportStatus").textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("exportSvg").addEventListener("click", async () => {
    await exportReady();
    const { W, H } = logicalSize();
    const parts = [], n = (v) => Math.round(v * 100) / 100;
    const pb = () => ({ d: "", moveTo(x, y) { this.d += `M${n(x)} ${n(y)}`; }, lineTo(x, y) { this.d += `L${n(x)} ${n(y)}`; }, quadraticCurveTo(a, b, x, y) { this.d += `Q${n(a)} ${n(b)} ${n(x)} ${n(y)}`; }, closePath() { this.d += "Z"; } });
    const engine = state.mode === "live" ? live : garden;
    const B = {
      fill: (p, col) => { const b = pb(); engine.path(b, p, true); parts.push(`<path d="${b.d}" fill="${col}"/>`); },
      stroke: (p, col, w) => { const b = pb(); engine.path(b, p, false); parts.push(`<path d="${b.d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`); },
      rect: () => {},
      text: (l, x, y, S, col) => {
        if (l.icon) {
          const asset = libraryAsset(l.icon.libraryId), size = S * (l.icon.size || 80) / 100;
          if (asset?.url) parts.push(`<image href="${escapeHtml(new URL(asset.url, location.href).href)}" x="${n(x + (l.icon.x || 0) / 100 * S - size / 2)}" y="${n(y - 0.36 * S + (l.icon.y || 0) / 100 * S - size / 2)}" width="${n(size)}" height="${n(size)}" preserveAspectRatio="xMidYMid meet"/>`);
          return;
        }
        const face = l.face || engine.face;
        const families = face.family.replace(/"STG /g, '"');
        parts.push(`<text x="${n(x)}" y="${n(y)}" text-anchor="middle" font-family='${families}' font-weight="${face.weight}" font-style="${face.style}" font-size="${n(S)}" fill="${l.color || col}">${escapeHtml(l.ch)}</text>`);
      }
    };
    if (state.mode === "live") engine.livePaint(null, performance.now(), gardenColors(), { ...gardenOptions(), backend: B });
    else engine.posterRender(B, posterTime(state.elapsedMs), gardenColors(), gardenOptions());
    const media = state.scheme.background.media;
    const image = media?.url ? `<image href="${escapeHtml(media.url)}" width="${n(W)}" height="${n(H)}" preserveAspectRatio="xMidYMid slice" opacity="${clamp(state.scheme.background.opacity / 100)}"/>` : "";
    const { width, height } = state.scheme.canvas;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${n(W)} ${n(H)}"><rect width="100%" height="100%" fill="${state.scheme.garden.colors.bg}"/>${image}${parts.join("")}</svg>`;
    download(new Blob([svg], { type: "image/svg+xml" }), `${fileBase()}.svg`);
    $("exportStatus").textContent = `SVG 已生成 · 花茎与花朵为矢量路径，文字保留为可编辑文本`;
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
      const fps = Math.min(30, Number($("exportFps").value));
      const total = Math.max(1, Math.round(exportSeconds() * fps));
      // gif.js keeps every frame in memory until encoding; stay inside a safe budget
      let scale = Number($("gifScale").value) || 1, note = "";
      const budget = 320e6, bytes = state.scheme.canvas.width * state.scheme.canvas.height * scale * scale * 4 * total;
      if (bytes > budget) { scale *= Math.sqrt(budget / bytes); note = "（尺寸较大，已自动缩小以免浏览器内存不足）"; }
      const output = exportCanvas(scale);
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: workerUrl });
      for (let index = 0; index < total; index += 1) {
        await syncExportMedia(index / fps);
        renderFrame(output, index / fps, output.width, output.height, true);
        const delay = (Math.round((index + 1) * 100 / fps) - Math.round(index * 100 / fps)) * 10;
        gif.addFrame(output, { copy: true, delay });
        if (index % 10 === 0) { $("exportStatus").textContent = `正在绘制 GIF 帧 · ${Math.round(index / total * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); }
      }
      gif.on("progress", (progress) => { $("exportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => { URL.revokeObjectURL(workerUrl); download(blob, `${fileBase()}-${output.width}x${output.height}.gif`); setBusy(false, `GIF 已生成 · ${output.width} × ${output.height} · ${(blob.size / 1024 / 1024).toFixed(1)} MB${note}`); });
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
    const total = Math.max(1, Math.round(exportSeconds() * fps));
    let encoder = null;
    setBusy(true, "正在加载 MP4 编码器…");
    try {
      await loadH264Encoder();
      await exportReady();
      encoder = await window.HME.createH264MP4Encoder();
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.max(8000, Math.min(30000, Math.round(output.width * output.height * fps * 0.18 / 1000)));
      encoder.groupOfPictures = Math.max(12, Math.round(fps / 2));
      encoder.outputFilename = `${fileBase()}-${output.width}x${output.height}-${fps}fps.mp4`;
      encoder.initialize();
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      const progressInterval = Math.max(1, Math.floor(fps / 10));
      for (let index = 0; index < total; index += 1) {
        await syncExportMedia(index / fps);
        renderFrame(output, index / fps, output.width, output.height, true);
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
    if (state.playing && state.mode === "poster") state.elapsedMs += Math.min(80, now - state.lastFrame);
    state.lastFrame = now;
    syncPreviewVideo(state.mode === "live" ? now / 1000 : state.elapsedMs / 1000, state.mode === "live" || state.playing);
    if (state.mode === "live") renderLive(canvas, canvas.width, canvas.height, true);
    else renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
    const displayTime = state.elapsedMs % Math.max(1, total);
    $("scrubber").value = String(displayTime);
    $("timeNow").textContent = `${(displayTime / 1000).toFixed(2)}s`;
    if (state.lock && Math.floor(now / 1000) % 15 === 0) syncLock();
    requestAnimationFrame(animationLoop);
  }

  function moveGlobalCards() {
    // The live-typing help sits in its own block under the canvas, above the playback controls.
    const canvasCard = document.querySelector(".tc-canvas-toolbar .gm-canvas-card");
    if (canvasCard) { canvasCard.before($("tgModes")); $("tgModes").classList.add("is-in-toolbar"); }
    const timelineCard = document.querySelector(".tc-timeline");
    if (timelineCard) timelineCard.prepend($("tgLiveBar"));
    else $("glyphMorphStage").after($("tgLiveBar"));
    const panel = document.querySelector('.tc-properties[data-panel="global"]');
    if (!panel) return;
    document.querySelectorAll("[data-tg-global-card]").forEach((card) => panel.append(card));
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
    const stageObserver = new ResizeObserver(() => resizePreview());
    stageObserver.observe(frame);
    stageObserver.observe($("glyphMorphStage"));
    document.fonts?.ready.then(() => { garden.clearCache(); state.posterKey = ""; resizePreview(); });
    document.fonts?.addEventListener("loadingdone", () => { state.fontsVersion += 1; garden.clearCache(); live.clearCache(); state.posterKey = ""; resizePreview(); });
    window.addEventListener("resize", resizePreview, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", moveGlobalCards, { once: true });
    else moveGlobalCards();
    if (params.get("mode") === "live") setMode("live");

    const setPlaying = (playing) => { if (state.mode === "live") setMode("poster"); state.playing = Boolean(playing); state.lastFrame = performance.now(); updatePlaybackButton(); resizePreview(); };
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
    window.__typeGardenTest = { background: () => state.background, garden, live, renderFrame, getScheme: () => clone(state.scheme), cycleDurationMs, setTime, stableElapsed, refreshFonts, timelinePhases, setMode, logicalSize };
    if (window.parent !== window) window.parent.postMessage({ type: "cellmotion:ready", effectId: SLUG, bridgeVersion: "1.0.0", durationMs: cycleDurationMs() }, "*");
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
