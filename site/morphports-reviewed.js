(() => {
  "use strict";

  // Independent Canvas ports of five observable per-glyph motion contracts from
  // LTMorphingLabel (MIT, lexrus/LTMorphingLabel). No Swift/UIKit source is embedded.
  const $ = (id) => document.getElementById(id);
  const VERSION = 5;
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const split = (value) => segmenter ? Array.from(segmenter.segment(String(value)), ({ segment }) => segment) : Array.from(String(value));
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const easeOutQuint = (value) => 1 - Math.pow(1 - clamp(value), 5);
  const easeInQuint = (value) => Math.pow(clamp(value), 5);
  const easeOutBack = (value) => {
    const t = clamp(value) - 1;
    const s = 2.70158;
    return t * t * ((s + 1) * t + s) + 1;
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const BASE_CANVAS = { width: 1080, height: 1080, preset: "1080x1080" };
  const BASE_TYPE = { fontFamily: "stg:inter", fontSize: 174, tracking: 0, positionX: 0, positionY: 0, alignment: "center", textColor: "#111111", backgroundColor: "#ffffff" };
  const BASE_MOTION = { morphDuration: 600, characterDelay: 0.026, speed: 1, loop: true };
  const row = (id, text, hold, extra = {}) => ({ id, text, hold, icons: [], backgroundColor: "#ffffff", backgroundMedia: null, backgroundTransition: "direct", backgroundTransitionDuration: 120, ...extra });
  const PORTS = {
    sproutshift: {
      mode: "sprout", slug: "sproutshift", zh: "字芽", en: "Sprout Shift", amountLabel: "最小缩放", amountUnit: "%", amountMin: 0, amountMax: 0.35, amountStep: 0.01,
      phaseLabel: "缩放生长", enterLabel: "放大出现", exitLabel: "缩小退出",
      scheme: {
        version: VERSION, canvas: BASE_CANVAS, typography: BASE_TYPE, motion: { ...BASE_MOTION, effectAmount: 0 },
        rows: [
          row("sprout-01", "Motion", 100),
          row("sprout-02", "Motion is not just", 650),
          row("sprout-03", "what the eye can see", 650),
          row("sprout-04", "and scroll past.", 650),
          row("sprout-05", "Motion", 650),
          row("sprout-06", "is how ideas speak.", 750),
          row("sprout-07", "— ME Studio", 1200)
        ]
      }
    },
    mistlift: {
      mode: "mist", slug: "mistlift", zh: "雾升", en: "Mist Lift", amountLabel: "升散幅度", amountUnit: "×", amountMin: 0.4, amountMax: 1.6, amountStep: 0.05,
      phaseLabel: "升散浮入", enterLabel: "下方浮入", exitLabel: "向上升散",
      scheme: {
        version: VERSION, canvas: BASE_CANVAS, typography: BASE_TYPE, motion: { ...BASE_MOTION, effectAmount: 1 },
        rows: [
          row("mist-01", "Pause and listen,", 800),
          row("mist-02", "‘What moved first?’", 800),
          row("mist-03", "then the letters answer,", 800),
          row("mist-04", "‘Watch the space between.’", 800),
          row("mist-05", "— ME Studio", 1400)
        ]
      }
    },
    typecascade: {
      mode: "cascade", slug: "typecascade", zh: "字倾", en: "Type Cascade", amountLabel: "倾倒角度", amountUnit: "°", amountMin: 60, amountMax: 220, amountStep: 1,
      phaseLabel: "倾倒坠落", enterLabel: "基线长入", exitLabel: "倾倒坠落",
      scheme: {
        version: VERSION, canvas: BASE_CANVAS, typography: { ...BASE_TYPE, fontSize: 167 }, motion: { ...BASE_MOTION, morphDuration: 810, characterDelay: 0.052, effectAmount: 168 },
        rows: [
          row("cascade-01", "Sketch", 450, { icons: [{ id: "mp-mtn08rg8-op1v11", libraryId: "bot-08", boundary: 6, size: 110, gap: 15, x: 0, y: 0 }] }),
          row("cascade-02", "Frame", 450),
          row("cascade-03", "Rhythm", 450),
          row("cascade-04", "Keyframe", 450),
          row("cascade-05", "Timeline", 450),
          row("cascade-06", "Render", 600),
          row("cascade-07", "Create", 1278)
        ]
      }
    },
    dotresolve: {
      mode: "dots", slug: "dotresolve", zh: "点解", en: "Dot Resolve", amountLabel: "像素半径", amountUnit: "×", amountMin: 2, amountMax: 12, amountStep: 0.5,
      phaseLabel: "像素解析", enterLabel: "颗粒解析", exitLabel: "像素消散",
      scheme: {
        version: VERSION, canvas: BASE_CANVAS, typography: BASE_TYPE, motion: { ...BASE_MOTION, loop: true, effectAmount: 6 },
        rows: [
          row("dots-01", "Signal", 650),
          row("dots-02", "Frame", 650),
          row("dots-03", "Composition", 650),
          row("dots-04", "Motion", 750)
        ]
      }
    },
    glyphreveal: {
      mode: "sprout", slug: "glyphreveal", zh: "字现", en: "Glyph Reveal", amountLabel: "最小缩放", amountUnit: "%", amountMin: 0, amountMax: 0.35, amountStep: 0.01,
      phaseLabel: "逐字显现", enterLabel: "逐字显现", exitLabel: "逐字隐去",
      scheme: {
        version: VERSION, canvas: BASE_CANVAS, typography: { ...BASE_TYPE, fontSize: 154 }, motion: { ...BASE_MOTION, loop: true, effectAmount: 0 },
        rows: [
          row("reveal-blank", "", 50),
          row("reveal-title", "Words come alive", 884)
        ]
      }
    }
  };
  const portKey = document.body.dataset.morphPort;
  const port = PORTS[portKey] || PORTS.sproutshift;
  const STORAGE_KEY = `me-motion-${port.slug}-v3`;

  // Frozen approved example. Keep synchronized with assets/presets/{slug}-default.json.
  const DEFAULT_SCHEME = Object.freeze(clone(port.scheme));

  const state = {
    scheme: clone(DEFAULT_SCHEME),
    playing: true,
    elapsedMs: 0,
    lastFrame: performance.now(),
    exportBusy: false,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    activeRowId: DEFAULT_SCHEME.rows[0].id,
    caretBoundary: split(DEFAULT_SCHEME.rows[0].text).length,
    librarySelectionId: "",
    activeIconId: "",
    imageCache: new Map(),
    backgroundCache: new Map(),
    activeBackgroundRowId: ""
  };

  const canvas = $("glyphMorphCanvas");
  const frame = $("compositionFrame");
  const context = canvas.getContext("2d");
  const controlIds = ["fontFamily", "fontSize", "tracking", "positionX", "positionY", "textColor", "backgroundColor", "morphDuration", "characterDelay", "effectAmount", "speed", "loop"];
  const controls = Object.fromEntries(controlIds.map((id) => [id, $(id)]));
  const normalizeColor = (value, fallback = "#ffffff") => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const dotPalette = ["#ff375f", "#ff9f0a", "#32d74b", "#00c7be", "#0a84ff", "#bf5af2"];
  function dotColors(row) {
    return {
      initialColor: normalizeColor(row.initialColor, state.scheme.typography.textColor),
      colorMode: ["single", "multi"].includes(row.colorMode) ? row.colorMode : "off",
      effectColor: normalizeColor(row.effectColor, "#ff375f"),
      effectColors: split(row.text).map((_, index) => normalizeColor(row.effectColors?.[index], dotPalette[index % dotPalette.length])),
      sweepEnabled: row.sweepEnabled === true
    };
  }
  // Paint the outgoing row only. The next row enters in its own initial color.
  // No extra phase or reset is added to the approved pixelation choreography.
  function dotTokenColor(row, token, progress = -1) {
    const colors = dotColors(row);
    if (colors.colorMode === "off" || progress < 0) return colors.initialColor;
    const index = token.characterIndex ?? 0;
    const count = Math.max(1, split(row.text).length);
    const visibleWindow = Math.max(0.05, 1 - state.scheme.motion.characterDelay * Math.max(0, rowTokens(row).length - 1));
    if (colors.sweepEnabled && clamp(progress) < index / count * visibleWindow) return colors.initialColor;
    return colors.colorMode === "multi" ? colors.effectColors[index] : colors.effectColor;
  }
  const normalizeBackgroundTransition = (value) => value === "crossfade" ? "crossfade" : "direct";
  const normalizeBackgroundTransitionDuration = (value) => clamp(Number.isFinite(Number(value)) ? Number(value) : 120, 10, 2000);
  const normalizeBackgroundMedia = (media) => media && typeof media === "object" && media.url ? {
    name: String(media.name || "背景视频"),
    url: String(media.url),
    fileType: String(media.fileType || "video/mp4"),
    videoStart: Math.max(0, Number.isFinite(Number(media.videoStart)) ? Number(media.videoStart) : 0),
    videoEnd: Number.isFinite(Number(media.videoEnd)) && Number(media.videoEnd) > 0 ? Number(media.videoEnd) : null
  } : null;
  const isVideoMedia = (media) => /^video\//i.test(media?.fileType || "");
  const videoClipBounds = (media, duration) => {
    const safeDuration = Math.max(0.1, Number(duration) || 0.1);
    const start = clamp(Number(media?.videoStart) || 0, 0, Math.max(0, safeDuration - 0.1));
    const requestedEnd = Number(media?.videoEnd);
    const end = clamp(Number.isFinite(requestedEnd) && requestedEnd > 0 ? Math.max(requestedEnd, start + 0.1) : safeDuration, start + 0.1, safeDuration);
    return { start, end, duration: Math.max(0.1, end - start) };
  };
  const videoClipTime = (media, duration, localTime) => {
    const clip = videoClipBounds(media, duration);
    return Math.min(clip.end - 0.001, clip.start + (((localTime % clip.duration) + clip.duration) % clip.duration));
  };

  function fontPreset(row) {
    return window.MERowFonts.preset(row, state.scheme.typography);
  }

  async function refreshFonts() {
    try {
      await window.MERowFonts.loadRows(state.scheme.rows, state.scheme.typography);
      fitCache.key = "";
      resizePreview();
    } catch (error) { $("exportStatus").textContent = `字体加载失败：${error.message}`; }
  }

  function cascadeTiming(row) {
    return {
      tilt: clamp(Number(row.tiltDuration ?? 300), 50, 5000),
      hang: clamp(Number(row.hangDuration ?? 120), 0, 5000),
      drop: clamp(Number(row.fallDuration ?? 450), 50, 5000)
    };
  }

  function cascadePose(row, index, elapsedMs, slot, layout, height) {
    const timing = cascadeTiming(row);
    const delay = state.scheme.motion.morphDuration * state.scheme.motion.characterDelay * index;
    const local = Math.max(0, elapsedMs - delay);
    const dropProgress = clamp((local - timing.tilt - timing.hang) / timing.drop);
    const sign = index % 2 ? 1 : -1;
    // Include the full rotated glyph/icon envelope, not a fixed pixel offset.
    const distance = Math.max(0, height - slot.y) + layout.fontSize * 5;
    return {
      offsetY: distance * dropProgress * dropProgress,
      pivotY: layout.fontSize * 0.46,
      rotation: easeOutBack(local / timing.tilt) * sign * state.scheme.motion.effectAmount * Math.PI / 180,
      complete: dropProgress >= 1 - 1e-9
    };
  }

  function timelineSegments() {
    const rows = state.scheme.rows.length > 1 ? state.scheme.rows : [{ id: "blank-a", text: "", hold: 100 }, { id: "blank-b", text: "", hold: 100 }];
    return rows.map((row, index) => {
      const terminal = !state.scheme.motion.loop && index === rows.length - 1;
      const to = terminal ? row : rows[(index + 1) % rows.length];
      const morphMs = terminal ? 0 : state.scheme.motion.morphDuration;
      const count = rowTokens(to).length;
      const staggerMs = morphMs * state.scheme.motion.characterDelay;
      const tailMs = terminal ? 0 : staggerMs * Math.max(0, count - 1);
      const timing = cascadeTiming(row);
      const exitMs = port.mode === "cascade" && !terminal ? timing.tilt + timing.hang + timing.drop + staggerMs * Math.max(0, rowTokens(row).length - 1) : 0;
      const transitionMs = Math.max(morphMs + tailMs, exitMs);
      const holdMs = Math.max(0, Number(row.hold) || 0);
      return { from: row, to, morphMs, tailMs, holdMs, transitionMs, durationMs: holdMs + transitionMs, terminal };
    });
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
        return { segment, index, segmentTime, rawLocal: local, rawCycle, progress: Math.max(0, (segmentTime - segment.holdMs) / Math.max(1, segment.morphMs)), inHold: segment.terminal || segmentTime < segment.holdMs };
      }
      cursor += segment.durationMs;
    }
    return { segment: segments[0], index: 0, segmentTime: 0, rawLocal: 0, rawCycle, progress: 0, inHold: true };
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
      if (boundary < glyphs.length) tokens.push({ type: "glyph", key: `g:${glyphs[boundary]}`, glyph: glyphs[boundary], characterIndex: boundary });
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
    await window.MERowFonts.loadRows(state.scheme.rows, state.scheme.typography);
    const ids = new Set(state.scheme.rows.flatMap((row) => (row.icons || []).map((icon) => icon.libraryId)));
    await Promise.all(Array.from(ids, (id) => loadAssetResource(libraryAsset(id))));
  }

  async function prepareRowBackground(row) {
    const media = normalizeBackgroundMedia(row?.backgroundMedia);
    if (!row?.id || !isVideoMedia(media)) {
      if (row?.id) state.backgroundCache.delete(row.id);
      return null;
    }
    const existing = state.backgroundCache.get(row.id);
    if (existing?.url === media.url) return existing.promise;
    existing?.video?.pause();
    existing?.exportVideo?.pause();
    const runtime = { url: media.url, video: null, exportVideo: null, duration: 0, previewImage: null, exportImage: null, exportTime: -1, filmstrip: null, filmstripPromise: null, promise: null, exportPromise: null };
    state.backgroundCache.set(row.id, runtime);
    const loadVideo = (key) => new Promise((resolve) => {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = false;
      video.playsInline = true;
      video.preload = "auto";
      const finish = () => { runtime[key] = video; runtime.duration = Number(video.duration) || runtime.duration; resolve(runtime); };
      video.addEventListener("loadeddata", finish, { once: true });
      video.addEventListener("error", () => resolve(runtime), { once: true });
      video.src = media.url;
      video.load();
    });
    runtime.promise = loadVideo("video");
    runtime.exportPromise = loadVideo("exportVideo");
    return runtime.promise;
  }

  async function preloadRowBackgrounds() {
    await Promise.all(state.scheme.rows.map((item) => prepareRowBackground(item)));
  }

  async function prepareVideoFilmstrip(runtime) {
    if (!runtime?.url) return null;
    if (runtime.filmstrip) return runtime.filmstrip;
    if (runtime.filmstripPromise) return runtime.filmstripPromise;
    runtime.filmstripPromise = (async () => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      await new Promise((resolve, reject) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("error", reject, { once: true });
        video.src = runtime.url;
        video.load();
      });
      const duration = Number(video.duration) || runtime.duration;
      if (!(duration > 0)) return null;
      const filmstrip = document.createElement("canvas");
      filmstrip.width = 720;
      filmstrip.height = 96;
      const filmstripContext = filmstrip.getContext("2d");
      const frameCount = 8;
      const frameWidth = filmstrip.width / frameCount;
      const seek = (time) => new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          if (typeof video.requestVideoFrameCallback === "function") {
            const fallback = setTimeout(resolve, 120);
            video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve(); });
          } else requestAnimationFrame(resolve);
        };
        video.addEventListener("seeked", done, { once: true });
        video.currentTime = clamp(time, 0, Math.max(0, duration - 0.001));
        setTimeout(done, 800);
      });
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        await seek((frameIndex + 0.5) / frameCount * duration);
        const sourceWidth = video.videoWidth || 1;
        const sourceHeight = video.videoHeight || 1;
        const cover = Math.max(frameWidth / sourceWidth, filmstrip.height / sourceHeight);
        const drawWidth = sourceWidth * cover;
        const drawHeight = sourceHeight * cover;
        filmstripContext.save();
        filmstripContext.beginPath();
        filmstripContext.rect(frameIndex * frameWidth, 0, frameWidth, filmstrip.height);
        filmstripContext.clip();
        filmstripContext.drawImage(video, frameIndex * frameWidth + (frameWidth - drawWidth) / 2, (filmstrip.height - drawHeight) / 2, drawWidth, drawHeight);
        filmstripContext.restore();
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
      runtime.filmstrip = filmstrip;
      return filmstrip;
    })().catch(() => null);
    return runtime.filmstripPromise;
  }

  function activatePreviewBackgrounds(rowIds) {
    const active = new Set(rowIds.filter(Boolean));
    state.backgroundCache.forEach((runtime, rowId) => { if (!active.has(rowId)) runtime.video?.pause(); });
    state.activeBackgroundRowId = Array.from(active).join("|");
  }

  function cachePreviewVideoFrame(runtime) {
    const video = runtime?.video;
    if (!video || video.readyState < 2 || video.seeking || !video.videoWidth || !video.videoHeight) return;
    const frameCanvas = runtime.previewImage || document.createElement("canvas");
    if (frameCanvas.width !== video.videoWidth || frameCanvas.height !== video.videoHeight) {
      frameCanvas.width = video.videoWidth;
      frameCanvas.height = video.videoHeight;
    }
    frameCanvas.getContext("2d").drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    runtime.previewImage = frameCanvas;
  }

  function backgroundImageAt(row, localTime, preview, freeze = false) {
    const media = normalizeBackgroundMedia(row?.backgroundMedia);
    const runtime = state.backgroundCache.get(row?.id);
    if (!media || !runtime) return null;
    if (!preview) return runtime.exportImage || runtime.previewImage || (runtime.exportVideo?.readyState >= 2 ? runtime.exportVideo : null);
    const video = runtime.video;
    if (!video || video.readyState < 2) return runtime.previewImage;
    const duration = runtime.duration || Number(video.duration) || 0;
    const target = freeze ? videoClipBounds(media, duration).start : videoClipTime(media, duration, localTime);
    if (!video.seeking && Math.abs(video.currentTime - target) > 0.16) video.currentTime = target;
    if (state.playing && !freeze && !state.exportBusy && !video.seeking) {
      video.playbackRate = clamp(Number(state.scheme.motion.speed) || 1, 0.25, 2);
      video.play().catch(() => {});
    } else video.pause();
    cachePreviewVideoFrame(runtime);
    return video.seeking ? runtime.previewImage : video;
  }

  async function seekRuntimeBackground(row, localTime, freeze = false) {
    const media = normalizeBackgroundMedia(row?.backgroundMedia);
    const runtime = state.backgroundCache.get(row?.id);
    if (!media || !runtime) return;
    await runtime.exportPromise;
    const video = runtime.exportVideo;
    const duration = runtime.duration || Number(video?.duration) || 0;
    if (!video || !(duration > 0)) return;
    const target = freeze ? videoClipBounds(media, duration).start : videoClipTime(media, duration, localTime);
    if (Math.abs(video.currentTime - target) > 1 / 240) {
      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          if (typeof video.requestVideoFrameCallback === "function") {
            const fallback = setTimeout(resolve, 180);
            video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve(); });
          } else requestAnimationFrame(resolve);
        };
        video.addEventListener("seeked", done, { once: true });
        video.currentTime = target;
        setTimeout(done, 800);
      });
    }
    const frameCanvas = runtime.exportImage || document.createElement("canvas");
    frameCanvas.width = video.videoWidth || 2;
    frameCanvas.height = video.videoHeight || 2;
    frameCanvas.getContext("2d").drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    runtime.exportImage = frameCanvas;
    runtime.exportTime = target;
  }

  function drawBackgroundLayer(ctx, width, height, rowState, image, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.fillStyle = normalizeColor(rowState?.backgroundColor, state.scheme.typography.backgroundColor);
    ctx.fillRect(0, 0, width, height);
    if (image) {
      const sourceWidth = image.videoWidth || image.width || image.naturalWidth || width;
      const sourceHeight = image.videoHeight || image.height || image.naturalHeight || height;
      const cover = Math.max(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight));
      const drawWidth = sourceWidth * cover;
      const drawHeight = sourceHeight * cover;
      ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    }
    ctx.restore();
  }

  function renderBackground(ctx, timeline, width, height, preview) {
    const morphElapsed = Math.max(0, timeline.segmentTime - timeline.segment.holdMs) / 1000;
    if (timeline.inHold) {
      activatePreviewBackgrounds(preview ? [timeline.segment.from.id] : []);
      drawBackgroundLayer(ctx, width, height, timeline.segment.from, backgroundImageAt(timeline.segment.from, timeline.segmentTime / 1000, preview));
      return;
    }
    const incoming = timeline.segment.to;
    const transition = normalizeBackgroundTransition(incoming.backgroundTransition);
    if (transition === "crossfade") {
      activatePreviewBackgrounds(preview ? [timeline.segment.from.id, incoming.id] : []);
      drawBackgroundLayer(ctx, width, height, timeline.segment.from, backgroundImageAt(timeline.segment.from, timeline.segmentTime / 1000, preview));
      const duration = normalizeBackgroundTransitionDuration(incoming.backgroundTransitionDuration) / 1000;
      const progress = clamp(morphElapsed / Math.max(0.01, duration));
      const eased = progress * progress * (3 - 2 * progress);
      drawBackgroundLayer(ctx, width, height, incoming, backgroundImageAt(incoming, 0, preview, true), eased);
      return;
    }
    activatePreviewBackgrounds(preview ? [incoming.id] : []);
    drawBackgroundLayer(ctx, width, height, incoming, backgroundImageAt(incoming, 0, preview, true));
  }

  async function prepareBackgroundFrame(timeSeconds) {
    const timeline = resolveTimeline(timeSeconds * 1000);
    if (timeline.inHold) {
      await seekRuntimeBackground(timeline.segment.from, timeline.segmentTime / 1000);
      return;
    }
    const incoming = timeline.segment.to;
    if (normalizeBackgroundTransition(incoming.backgroundTransition) === "crossfade") await seekRuntimeBackground(timeline.segment.from, timeline.segmentTime / 1000);
    await seekRuntimeBackground(incoming, 0, true);
  }

  let fitCache = { key: "", size: 0 };
  function glyphLayout(ctx, row, width, height) {
    const sourceTokens = rowTokens(row);
    const typography = state.scheme.typography;
    const unit = Math.min(width, height) / 1080;
    const baseSize = Math.max(1, typography.fontSize * unit);
    const tracking = typography.tracking * unit;
    const preset = fontPreset(row);
    const fallback = window.STGFontLibrary?.fallbackStack || "sans-serif";
    const family = `"${preset.family}",${fallback}`;
    const style = preset.style || "normal";
    const weight = preset.weight || 500;
    const measure = (size, inputTokens = sourceTokens, inputPreset = preset) => {
      ctx.font = `${inputPreset.style || "normal"} ${inputPreset.weight || 500} ${size}px "${inputPreset.family}",${fallback}`;
      const fitScale = size / baseSize;
      const tokens = inputTokens.map((token) => {
        if (token.type === "glyph") return { ...token, width: ctx.measureText(token.glyph).width };
        const iconSize = size * clamp(Number(token.icon.size) || 90, 20, 220) / 100;
        const gap = clamp(Number(token.icon.gap) || 0, 0, 80) * unit * fitScale;
        return { ...token, iconSize, gap, width: iconSize + gap * 2 };
      });
      return { tokens, total: tokens.reduce((sum, token) => sum + token.width, 0) + Math.max(0, tokens.length - 1) * tracking * fitScale };
    };
    const fitKey = JSON.stringify([width, height, typography, state.scheme.rows.map((item) => [item.text, item.icons, item.fontFamily])]);
    const maxWidth = width * 0.88;
    if (fitCache.key !== fitKey) {
      const widest = Math.max(1, ...state.scheme.rows.map((item) => measure(baseSize, rowTokens(item), fontPreset(item)).total));
      fitCache = { key: fitKey, size: baseSize * Math.min(1, maxWidth / widest) };
    }
    const fontSize = fitCache.size;
    const metrics = measure(fontSize);
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
    return { tokens: metrics.tokens, slots, fontSize, family, style, weight, unit, row };
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

  function drawToken(ctx, slot, layout, scale, alpha, timeSeconds, iconOverride = null, options = {}) {
    const token = slot.token;
    if (alpha <= 0 || scale <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    const offsetX = Number(options.offsetX) || 0;
    const offsetY = Number(options.offsetY) || 0;
    const rotation = Number(options.rotation) || 0;
    const pivotY = Number(options.pivotY) || 0;
    if (token.type === "glyph") {
      if (!token.glyph.trim()) { ctx.restore(); return; }
      ctx.fillStyle = options.color || (port.mode === "dots" ? dotTokenColor(layout.row, token) : state.scheme.typography.textColor);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${layout.style} ${layout.weight} ${layout.fontSize}px ${layout.family}`;
      ctx.translate(slot.x + offsetX, slot.y + offsetY + pivotY);
      ctx.rotate(rotation);
      ctx.translate(0, -pivotY);
      ctx.scale(scale, scale);
      ctx.fillText(token.glyph, 0, 0);
      ctx.restore();
      return;
    }
    const icon = iconOverride || token.icon;
    const size = layout.fontSize * clamp(Number(icon.size) || 90, 20, 220) / 100;
    const iconOffsetX = layout.fontSize * clamp(Number(icon.x) || 0, -100, 100) / 100;
    const iconOffsetY = layout.fontSize * clamp(Number(icon.y) || 0, -100, 100) / 100;
    const asset = libraryAsset(icon.libraryId);
    ctx.translate(slot.x + iconOffsetX + offsetX, slot.y + iconOffsetY + offsetY + pivotY);
    ctx.rotate(rotation);
    ctx.translate(0, -pivotY);
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

  const pixelSourceCanvas = document.createElement("canvas");
  const pixelSampleCanvas = document.createElement("canvas");
  function drawPixelatedToken(ctx, slot, layout, alpha, pixelProgress, timeSeconds, iconOverride = null, options = {}) {
    const radius = Math.max(0.0001, clamp(pixelProgress) * Math.max(0.1, state.scheme.motion.effectAmount));
    const sampleScale = Math.min(1, 1 / radius);
    if (sampleScale >= 0.985) {
      drawToken(ctx, slot, layout, 1, alpha, timeSeconds, iconOverride, options);
      return;
    }
    const side = Math.max(8, Math.ceil(layout.fontSize * 4.8));
    pixelSourceCanvas.width = side;
    pixelSourceCanvas.height = side;
    const source = pixelSourceCanvas.getContext("2d");
    source.clearRect(0, 0, side, side);
    drawToken(source, { ...slot, x: side / 2, y: side / 2 }, layout, 1, 1, timeSeconds, iconOverride, options);
    pixelSampleCanvas.width = Math.max(1, Math.round(side * sampleScale));
    pixelSampleCanvas.height = Math.max(1, Math.round(side * sampleScale));
    const sample = pixelSampleCanvas.getContext("2d");
    sample.clearRect(0, 0, pixelSampleCanvas.width, pixelSampleCanvas.height);
    sample.imageSmoothingEnabled = false;
    sample.drawImage(pixelSourceCanvas, 0, 0, pixelSampleCanvas.width, pixelSampleCanvas.height);
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pixelSampleCanvas, slot.x - side / 2, slot.y - side / 2, side, side);
    ctx.restore();
  }

  function tokenProgress(kind, globalProgress, index) {
    const delay = state.scheme.motion.characterDelay;
    if (port.mode === "mist") {
      const offset = Math.round(Math.cos(index) * 1.2);
      return clamp(kind === "old" ? globalProgress + delay * offset : globalProgress - delay * offset);
    }
    if (port.mode === "cascade") {
      if (kind === "old") return Math.max(0.0001, clamp(globalProgress + delay * Math.sin(index) * 1.7));
      return clamp(globalProgress - delay * index / 1.7);
    }
    return clamp(kind === "old" ? globalProgress + delay * index : globalProgress - delay * index);
  }

  function renderFrame(targetCanvas, timeSeconds, width = targetCanvas.width, height = targetCanvas.height) {
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    const timeline = resolveTimeline(timeSeconds * 1000);
    renderBackground(ctx, timeline, width, height, targetCanvas === canvas);
    const fromLayout = glyphLayout(ctx, timeline.segment.from, width, height);
    const toLayout = glyphLayout(ctx, timeline.segment.to, width, height);
    if (timeline.inHold) {
      fromLayout.slots.forEach((slot) => drawToken(ctx, slot, fromLayout, 1, 1, timeSeconds));
      ctx.restore();
      return timeline;
    }
    const { matches, claimed } = matchGlyphs(fromLayout.tokens, toLayout.tokens);
    const amount = state.scheme.motion.effectAmount;
    fromLayout.slots.forEach((oldSlot, oldIndex) => {
      const glyphProgress = tokenProgress("old", timeline.progress, oldIndex);
      const eased = easeOutQuint(glyphProgress);
      const newIndex = matches.get(oldIndex);
      if (newIndex == null) {
        if (port.mode === "sprout") {
          const floor = clamp(amount, 0, 0.35);
          drawToken(ctx, oldSlot, fromLayout, Math.max(0.0001, floor + (1 - floor) * (1 - eased)), 1 - glyphProgress, timeSeconds);
        } else if (port.mode === "mist") {
          drawToken(ctx, oldSlot, fromLayout, 1, 1 - eased, timeSeconds, null, { offsetY: -fromLayout.fontSize * 0.8 * eased * amount });
        } else if (port.mode === "cascade") {
          const pose = cascadePose(timeline.segment.from, oldIndex, timeline.segmentTime - timeline.segment.holdMs, oldSlot, fromLayout, height);
          if (!pose.complete) drawToken(ctx, oldSlot, fromLayout, 1, 1, timeSeconds, null, pose);
        } else {
          drawPixelatedToken(ctx, oldSlot, fromLayout, clamp(glyphProgress * -2 + 2.01), glyphProgress, timeSeconds, null, { color: dotTokenColor(timeline.segment.from, oldSlot.token, timeline.progress) });
        }
        return;
      }
      const target = toLayout.slots[newIndex];
      let iconOverride = null;
      if (oldSlot.token.type === "icon" && target.token.type === "icon") {
        iconOverride = { ...oldSlot.token.icon };
        ["size", "gap", "x", "y"].forEach((key) => { iconOverride[key] = Number(oldSlot.token.icon[key] || 0) + (Number(target.token.icon[key] || 0) - Number(oldSlot.token.icon[key] || 0)) * eased; });
      }
      const movingLayout = { ...fromLayout, fontSize: fromLayout.fontSize + (toLayout.fontSize - fromLayout.fontSize) * eased };
      const movingSlot = { token: oldSlot.token, x: oldSlot.x + (target.x - oldSlot.x) * eased, y: oldSlot.y + (target.y - oldSlot.y) * eased };
      const fontChanged = oldSlot.token.type === "glyph" && ["family", "style", "weight"].some((key) => fromLayout[key] !== toLayout[key]);
      const color = port.mode === "dots" ? dotTokenColor(timeline.segment.from, oldSlot.token, timeline.progress) : null;
      const colorChanged = port.mode === "dots" && color !== dotTokenColor(timeline.segment.to, target.token);
      const blend = colorChanged ? clamp((timeline.progress - 0.8) / 0.2) : eased;
      drawToken(ctx, movingSlot, movingLayout, 1, fontChanged || colorChanged ? 1 - blend : 1, timeSeconds, iconOverride, { color });
      if (fontChanged || colorChanged) drawToken(ctx, { ...movingSlot, token: target.token }, { ...toLayout, fontSize: movingLayout.fontSize }, 1, blend, timeSeconds);
    });
    toLayout.slots.forEach((newSlot, newIndex) => {
      if (claimed.has(newIndex)) return;
      const glyphProgress = tokenProgress("new", timeline.progress, newIndex);
      const eased = easeOutQuint(glyphProgress);
      if (port.mode === "sprout") {
        const floor = clamp(amount, 0, 0.35);
        drawToken(ctx, newSlot, toLayout, Math.max(0.0001, floor + (1 - floor) * eased), clamp(timeline.progress), timeSeconds);
      } else if (port.mode === "mist") {
        drawToken(ctx, newSlot, toLayout, 1, clamp(timeline.progress), timeSeconds, null, { offsetY: toLayout.fontSize * (1 - eased) * 1.2 * amount });
      } else if (port.mode === "cascade") {
        drawToken(ctx, newSlot, toLayout, Math.max(0.0001, eased), clamp(timeline.progress), timeSeconds);
      } else {
        drawPixelatedToken(ctx, newSlot, toLayout, glyphProgress, 1 - glyphProgress, timeSeconds);
      }
    });
    ctx.restore();
    return timeline;
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
    const maxPixels = 1500;
    const scale = Math.min(window.devicePixelRatio || 1, 2, maxPixels / Math.max(rect.width, rect.height));
    canvas.width = Math.max(2, Math.round(rect.width * scale));
    canvas.height = Math.max(2, Math.round(canvas.width / ratio));
    renderFrame(canvas, state.elapsedMs / 1000, canvas.width, canvas.height);
  }

  function renderRows() {
    $("sequenceRows").innerHTML = state.scheme.rows.map((row, index) => `
      <div class="gm-row-shell" data-row-id="${row.id}">
        <div class="gm-row">
          <span class="gm-row-index">${String(index + 1).padStart(2, "0")}</span>
          <input data-key="text" value="${escapeHtml(row.text)}" placeholder="${row.text ? "文字段落" : "复位留白"}" aria-label="第 ${index + 1} 行文字">
          <input data-key="hold" type="number" min="0" max="5000" step="10" value="${row.hold}" aria-label="第 ${index + 1} 行停留毫秒">
          <button data-action="up" type="button" aria-label="上移">↑</button>
          <button data-action="down" type="button" aria-label="下移">↓</button>
          <button data-action="delete" type="button" aria-label="删除">×</button>
        </div>
        <label class="gm-row-font">本行字体<select data-key="fontFamily" data-stg-font-library="true" aria-label="第 ${index + 1} 行字体">${window.MERowFonts.options(row.fontFamily)}</select></label>
        ${port.mode === "dots" ? `<div class="gm-dot-colors">${dotColorControls(row)}</div>` : ""}
        <div class="gm-row-meta">
          <button class="gm-row-target${state.activeRowId === row.id ? " is-active" : ""}" data-action="target" type="button">＋ 插入图标</button>
          <button class="gm-row-pause" data-action="pause-row" type="button">暂停修改</button>
          <span class="gm-row-icon-count">${(row.icons || []).length} 个图标</span>
        </div>
        ${port.mode === "cascade" ? `<details class="gm-row-background gm-row-motion"><summary><span>本行倾倒与下落</span><b>调整快慢 / 悬停</b></summary><div class="gm-row-background-grid">
          <label>倾倒时长（毫秒）<input data-key="tiltDuration" type="number" min="50" max="5000" step="10" value="${cascadeTiming(row).tilt}"></label>
          <label>悬停时长（毫秒）<input data-key="hangDuration" type="number" min="0" max="5000" step="10" value="${cascadeTiming(row).hang}"></label>
          <label>下落时长（毫秒）<input data-key="fallDuration" type="number" min="50" max="5000" step="10" value="${cascadeTiming(row).drop}"></label>
          <p class="gm-help">下落时长越短越快；悬停设为 0 可直接落下。修改后从本行倾倒开始播放。</p>
        </div></details>` : ""}
        <details class="gm-row-background">
          <summary><span>本行背景</span><b>${escapeHtml(row.backgroundMedia?.name || "纯色")}</b></summary>
          <div class="gm-row-background-grid">
            <label>背景颜色<input data-background-key="backgroundColor" type="color" value="${normalizeColor(row.backgroundColor, state.scheme.typography.backgroundColor)}"></label>
            <label class="gm-background-upload">上传背景视频<input data-background-file type="file" accept="video/mp4,video/webm,video/quicktime"></label>
            <label>背景转场<select data-background-key="backgroundTransition"><option value="direct"${row.backgroundTransition === "direct" ? " selected" : ""}>直接切换</option><option value="crossfade"${row.backgroundTransition === "crossfade" ? " selected" : ""}>柔和叠化</option></select></label>
            <label>叠化时长<input data-background-key="backgroundTransitionDuration" type="number" min="10" max="2000" step="10" value="${normalizeBackgroundTransitionDuration(row.backgroundTransitionDuration)}"><small>毫秒</small></label>
            <div class="gm-background-video"${row.backgroundMedia ? "" : " hidden"}>
              <div class="gm-background-video-head"><strong>${escapeHtml(row.backgroundMedia?.name || "")}</strong><button data-background-remove type="button">移除视频</button></div>
              <div class="gm-video-timeline" aria-label="拖动两侧把手裁剪视频片段">
                <canvas data-video-filmstrip width="720" height="96"></canvas>
                <div class="gm-video-selection"><span class="gm-video-handle is-start" data-video-edge="start" role="slider" tabindex="0"></span><span class="gm-video-handle is-end" data-video-edge="end" role="slider" tabindex="0"></span></div>
              </div>
              <div class="gm-video-scale"><span>0.0 秒</span><span data-video-duration>读取中…</span></div>
              <label>开始秒数<input data-video-start type="number" min="0" step="0.1" value="${Number(row.backgroundMedia?.videoStart || 0)}"></label>
              <label>结束秒数<input data-video-end type="number" min="0.1" step="0.1" value="${row.backgroundMedia?.videoEnd == null ? "" : Number(row.backgroundMedia.videoEnd)}"></label>
            </div>
          </div>
        </details>
        <div class="gm-row-icons">${(row.icons || []).map((icon) => {
          const asset = libraryAsset(icon.libraryId);
          const name = escapeHtml(asset?.name || "图标");
          return `<div class="gm-inline-icon-chip"><img src="${escapeHtml(asset?.url || "")}" alt=""><strong>${name}</strong><span>位置 ${icon.boundary}</span><button class="gm-inline-icon-edit" data-action="edit-icon" data-icon-id="${icon.id}" type="button" aria-label="编辑${name}">编辑</button></div>`;
        }).join("")}</div>
      </div>`).join("");
    bindRowBackgroundControls();
    updateInsertTargetLabel();
  }

  function dotColorControls(row) {
    const colors = dotColors(row);
    return `<div class="gm-grid-2">
      <label class="gm-field">开头颜色<input data-dot-key="initialColor" type="color" value="${colors.initialColor}"></label>
      <label class="gm-field">动效换色<select data-dot-key="colorMode"><option value="off"${colors.colorMode === "off" ? " selected" : ""}>不换色</option><option value="single"${colors.colorMode === "single" ? " selected" : ""}>单色</option><option value="multi"${colors.colorMode === "multi" ? " selected" : ""}>多色 · 逐字设置</option></select></label>
    </div>
    <div${colors.colorMode === "off" ? " hidden" : ""}>
      <label class="gm-check"><input data-dot-key="sweepEnabled" type="checkbox"${colors.sweepEnabled ? " checked" : ""}><span>从左到右扫色</span></label>
      ${colors.colorMode === "multi" ? `<div class="gm-letter-colors">${split(row.text).map((glyph, index) => /\s/u.test(glyph) ? "" : `<label><span>${escapeHtml(glyph)}</span><input type="color" data-dot-key="effectColors" data-color-index="${index}" value="${colors.effectColors[index]}" aria-label="第 ${index + 1} 字 ${escapeHtml(glyph)} 的动效颜色"></label>`).join("")}</div>` : `<label class="gm-field">动效颜色<input data-dot-key="effectColor" type="color" value="${colors.effectColor}"></label>`}
      <p class="gm-help">${colors.sweepEnabled ? "扫色与像素化同步，扫过后不恢复原色。" : "像素化开始时同步换色，不逐字扫过。"} 下一行使用自己的开头颜色。</p>
      <button class="gm-text-button" type="button" data-action="preview-color">▶ 预览本行换色</button>
    </div>`;
  }

  const fileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  function bindRowBackgroundControls() {
    document.querySelectorAll(".gm-row-shell").forEach((rowElement) => {
      const rowState = state.scheme.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!rowState) return;
      const color = rowElement.querySelector('[data-background-key="backgroundColor"]');
      const transition = rowElement.querySelector('[data-background-key="backgroundTransition"]');
      const transitionDuration = rowElement.querySelector('[data-background-key="backgroundTransitionDuration"]');
      const fileInput = rowElement.querySelector("[data-background-file]");
      const mediaPanel = rowElement.querySelector(".gm-background-video");
      const startInput = rowElement.querySelector("[data-video-start]");
      const endInput = rowElement.querySelector("[data-video-end]");
      const timeline = rowElement.querySelector(".gm-video-timeline");
      const selection = rowElement.querySelector(".gm-video-selection");
      const filmstripCanvas = rowElement.querySelector("[data-video-filmstrip]");
      const summary = rowElement.querySelector(".gm-row-background:not(.gm-row-motion) summary b");
      const durationLabel = rowElement.querySelector("[data-video-duration]");
      let draggedEdge = "";

      const drawFilmstrip = (filmstrip) => {
        if (!filmstrip || !filmstripCanvas.isConnected) return;
        const filmstripContext = filmstripCanvas.getContext("2d");
        filmstripContext.clearRect(0, 0, filmstripCanvas.width, filmstripCanvas.height);
        filmstripContext.drawImage(filmstrip, 0, 0, filmstripCanvas.width, filmstripCanvas.height);
      };
      const refreshMediaUi = async () => {
        const media = normalizeBackgroundMedia(rowState.backgroundMedia);
        mediaPanel.hidden = !media;
        summary.textContent = media ? media.name : "纯色";
        if (!media) return;
        mediaPanel.querySelector("strong").textContent = media.name;
        const runtime = await prepareRowBackground(rowState);
        if (!rowElement.isConnected || !runtime) return;
        const duration = runtime.duration || 0;
        if (!(duration > 0)) return;
        const clip = videoClipBounds(media, duration);
        rowState.backgroundMedia.videoStart = clip.start;
        rowState.backgroundMedia.videoEnd = clip.end;
        startInput.max = String(Math.max(0, duration - 0.1));
        endInput.max = String(duration);
        startInput.value = String(Number(clip.start.toFixed(2)));
        endInput.value = String(Number(clip.end.toFixed(2)));
        durationLabel.textContent = `${duration.toFixed(1)} 秒`;
        selection.style.left = `${clip.start / duration * 100}%`;
        selection.style.width = `${clip.duration / duration * 100}%`;
        selection.querySelector(".is-start").setAttribute("aria-valuetext", `${clip.start.toFixed(1)} 秒`);
        selection.querySelector(".is-end").setAttribute("aria-valuetext", `${clip.end.toFixed(1)} 秒`);
        if (runtime.filmstrip) drawFilmstrip(runtime.filmstrip);
        else prepareVideoFilmstrip(runtime).then(drawFilmstrip);
      };
      const commitTrim = () => {
        const runtime = state.backgroundCache.get(rowState.id);
        if (!rowState.backgroundMedia || !(runtime?.duration > 0)) return;
        const draft = { ...rowState.backgroundMedia, videoStart: Number(startInput.value), videoEnd: Number(endInput.value) };
        const clip = videoClipBounds(draft, runtime.duration);
        rowState.backgroundMedia.videoStart = clip.start;
        rowState.backgroundMedia.videoEnd = clip.end;
        runtime.exportImage = null;
        runtime.exportTime = -1;
        autoSave();
        refreshMediaUi();
        resizePreview();
      };
      const pointerSeconds = (event) => {
        const runtime = state.backgroundCache.get(rowState.id);
        const rect = timeline.getBoundingClientRect();
        return clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) * (runtime?.duration || 0);
      };
      const setBoundary = (edge, rawSeconds) => {
        const runtime = state.backgroundCache.get(rowState.id);
        if (!rowState.backgroundMedia || !(runtime?.duration > 0)) return;
        const clip = videoClipBounds(rowState.backgroundMedia, runtime.duration);
        const seconds = Math.round(Number(rawSeconds) * 10) / 10;
        if (edge === "start") startInput.value = String(clamp(seconds, 0, clip.end - 0.1));
        else endInput.value = String(clamp(seconds, clip.start + 0.1, runtime.duration));
        commitTrim();
      };

      color.addEventListener("input", () => { rowState.backgroundColor = color.value; autoSave(); resizePreview(); });
      transition.addEventListener("change", () => { rowState.backgroundTransition = normalizeBackgroundTransition(transition.value); autoSave(); resizePreview(); });
      transitionDuration.addEventListener("input", () => { rowState.backgroundTransitionDuration = normalizeBackgroundTransitionDuration(transitionDuration.value); autoSave(); resizePreview(); });
      [startInput, endInput].forEach((input) => input.addEventListener("change", commitTrim));
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        rowState.backgroundMedia = normalizeBackgroundMedia({ name: file.name, url: await fileAsDataUrl(file), fileType: file.type || "video/mp4", videoStart: 0, videoEnd: null });
        rowState.backgroundTransition = "crossfade";
        rowState.backgroundTransitionDuration = 120;
        transition.value = "crossfade";
        transitionDuration.value = "120";
        fileInput.value = "";
        await prepareRowBackground(rowState);
        await refreshMediaUi();
        autoSave();
        resizePreview();
      });
      rowElement.querySelector("[data-background-remove]").addEventListener("click", () => {
        state.backgroundCache.get(rowState.id)?.video?.pause();
        state.backgroundCache.get(rowState.id)?.exportVideo?.pause();
        state.backgroundCache.delete(rowState.id);
        rowState.backgroundMedia = null;
        autoSave();
        refreshMediaUi();
        resizePreview();
      });
      timeline.addEventListener("pointerdown", (event) => {
        const runtime = state.backgroundCache.get(rowState.id);
        if (!(runtime?.duration > 0)) return;
        const clip = videoClipBounds(rowState.backgroundMedia, runtime.duration);
        const seconds = pointerSeconds(event);
        draggedEdge = event.target.closest("[data-video-edge]")?.dataset.videoEdge || (Math.abs(seconds - clip.start) <= Math.abs(seconds - clip.end) ? "start" : "end");
        timeline.setPointerCapture(event.pointerId);
        setBoundary(draggedEdge, seconds);
        event.preventDefault();
      });
      timeline.addEventListener("pointermove", (event) => { if (draggedEdge && timeline.hasPointerCapture(event.pointerId)) setBoundary(draggedEdge, pointerSeconds(event)); });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => timeline.addEventListener(eventName, () => { draggedEdge = ""; }));
      selection.querySelectorAll("[data-video-edge]").forEach((handle) => handle.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        const current = handle.dataset.videoEdge === "start" ? Number(startInput.value) : Number(endInput.value);
        setBoundary(handle.dataset.videoEdge, current + (event.key === "ArrowLeft" ? -0.1 : 0.1));
        event.preventDefault();
      }));
      refreshMediaUi();
    });
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
    const speed = Math.max(0.01, state.scheme.motion.speed);
    let cursor = 0;
    $("timeline").innerHTML = segments.map(({ from, to, durationMs, holdMs, transitionMs, terminal }) => {
      const phase = terminal ? "结束停留" : from.text && !to.text ? port.exitLabel : !from.text && to.text ? port.enterLabel : port.phaseLabel;
      const timing = cascadeTiming(from);
      const phases = port.mode === "cascade" && !terminal
        ? [["停留", holdMs], ["倾倒", timing.tilt], ["悬停", timing.hang], ["下落", transitionMs - timing.tilt - timing.hang]]
        : [[phase, durationMs]];
      return phases.filter(([, ms]) => ms > 0).map(([label, ms], index) => {
        const start = cursor / speed;
        cursor += ms;
        return `<button type="button" data-seek-ms="${start}" class="gm-timeline-block me-choreo-block" style="flex:${ms};border-top:3px solid ${["#d9ee84", "#8bbdff", "#d8b3ff", "#ffb98b"][index % 4]}" role="listitem"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(from.text || "留白")} · ${(ms / speed / 1000).toFixed(2)}s</small></button>`;
      }).join("");
    }).join("");
    const total = cycleDurationMs();
    $("scrubber").max = String(Math.max(0.001, total));
    $("timeTotal").textContent = `${(total / 1000).toFixed(2)}s`;
  }

  function updateOutputs() {
    const amountFormat = (value) => port.amountUnit === "%" ? `${Math.round(value * 100)}%` : `${Number(value).toFixed(port.amountStep < 1 ? 1 : 0)}${port.amountUnit}`;
    const formats = { fontSize: (v) => `${v}px`, tracking: (v) => `${v}px`, positionX: (v) => `${v}%`, positionY: (v) => `${v}%`, morphDuration: (v) => `${v}ms`, characterDelay: (v) => `${(v * 100).toFixed(1)}%`, effectAmount: amountFormat, speed: (v) => `${Number(v).toFixed(2)}×` };
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
    const motionNumbers = ["morphDuration", "characterDelay", "effectAmount", "speed"];
    typographyNumbers.forEach((id) => { state.scheme.typography[id] = Number(controls[id].value); });
    ["fontFamily", "textColor", "backgroundColor"].forEach((id) => { state.scheme.typography[id] = controls[id].value; });
    state.scheme.typography.alignment = document.querySelector('input[name="alignment"]:checked')?.value || "center";
    motionNumbers.forEach((id) => { state.scheme.motion[id] = Number(controls[id].value); });
    state.scheme.motion.loop = controls.loop.checked;
  }

  function autoSave() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scheme)); }
    catch (_) { if ($("exportStatus")) $("exportStatus").textContent = "背景视频较大，当前编辑仍可使用；请保存 JSON 方案以长期保留。"; }
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
        return {
          id: row.id || uid(), text, hold: clamp(Number(row.hold) || 0, 0, 5000), icons,
          fontFamily: window.MERowFonts.normalize(row.fontFamily),
          ...(port.mode === "dots" ? { ...dotColors({ ...row, text }), initialColor: normalizeColor(row.initialColor, scheme.typography?.textColor || DEFAULT_SCHEME.typography.textColor) } : {}),
          ...(port.mode === "cascade" ? { tiltDuration: cascadeTiming(row).tilt, hangDuration: cascadeTiming(row).hang, fallDuration: cascadeTiming(row).drop } : {}),
          backgroundColor: normalizeColor(row.backgroundColor, scheme.typography?.backgroundColor || DEFAULT_SCHEME.typography.backgroundColor),
          backgroundMedia: normalizeBackgroundMedia(row.backgroundMedia),
          backgroundTransition: normalizeBackgroundTransition(row.backgroundTransition),
          backgroundTransitionDuration: normalizeBackgroundTransitionDuration(row.backgroundTransitionDuration)
        };
      })
    };
    // Migrate the former default single-shot setting without discarding edited rows.
    // Version 4 explicit loop-off remains an intentional user choice.
    if (Number(scheme.version || 1) < 4) state.scheme.motion.loop = true;
    if (state.scheme.rows.length < 2) state.scheme.rows.push(row(uid(), "", 100, { backgroundColor: state.scheme.typography.backgroundColor }));
    const liveRowIds = new Set(state.scheme.rows.map((item) => item.id));
    state.backgroundCache.forEach((runtime, rowId) => {
      if (liveRowIds.has(rowId)) return;
      runtime.video?.pause();
      runtime.exportVideo?.pause();
      state.backgroundCache.delete(rowId);
    });
    if (!state.scheme.rows.some((row) => row.id === state.activeRowId)) state.activeRowId = state.scheme.rows[0].id;
    state.caretBoundary = clamp(state.caretBoundary, 0, split(state.scheme.rows.find((row) => row.id === state.activeRowId)?.text || "").length);
    state.activeIconId = "";
    state.elapsedMs = 0;
    state.playing = !state.reducedMotion;
    state.lastFrame = performance.now();
    fitCache.key = "";
    updatePlaybackButton();
    syncControlsFromState();
    Promise.all([preloadInsertedAssets(), preloadRowBackgrounds()]).then(() => { renderRows(); resizePreview(); });
    autoSave();
    if (status) $("exportStatus").textContent = status;
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.className = "gm-download-ready";
    anchor.textContent = `下载 ${filename}`;
    const previous = document.querySelector(".gm-download-ready");
    if (previous) { URL.revokeObjectURL(previous.href); previous.remove(); }
    $("exportStatus").after(anchor);
    anchor.click();
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
  ["canvasWidth", "canvasHeight"].forEach((id) => ["input", "change"].forEach((eventName) => $(id).addEventListener(eventName, () => {
    state.scheme.canvas[id === "canvasWidth" ? "width" : "height"] = clamp(Number($(id).value) || 1080, 320, 3840);
    changed({ restart: false });
  })));
  controlIds.forEach((id) => controls[id].addEventListener("input", () => {
    if (id === "textColor" && port.mode === "dots") {
      state.scheme.rows.forEach((item) => { item.initialColor = controls.textColor.value; });
      renderRows();
    }
    if (id === "backgroundColor") {
      state.scheme.rows.forEach((item) => { item.backgroundColor = controls.backgroundColor.value; });
      renderRows();
    }
    changed({ restart: id === "morphDuration" || id === "characterDelay" || id === "speed" });
    if (id === "fontFamily") refreshFonts();
    if (id === "loop" && controls.loop.checked && !state.playing && state.elapsedMs >= cycleDurationMs()) {
      seekToRowStart(0, false);
    }
  }));
  document.querySelectorAll('input[name="alignment"]').forEach((input) => input.addEventListener("change", () => changed()));

  function handleRowInput(event) {
    const rowElement = event.target.closest(".gm-row-shell");
    const row = state.scheme.rows.find((item) => item.id === rowElement?.dataset.rowId);
    if (!row) return;
    if (event.target.dataset.dotKey) {
      const key = event.target.dataset.dotKey;
      if (key === "effectColors") {
        row.effectColors = dotColors(row).effectColors;
        row.effectColors[Number(event.target.dataset.colorIndex)] = normalizeColor(event.target.value);
      } else row[key] = key === "sweepEnabled" ? event.target.checked : event.target.value;
      state.activeRowId = row.id;
      seekToRowStart(state.scheme.rows.indexOf(row), true);
      if (key !== "initialColor") {
        state.elapsedMs += (row.hold + state.scheme.motion.morphDuration * 0.35) / Math.max(0.01, state.scheme.motion.speed);
        resizePreview();
      }
      if (["colorMode", "sweepEnabled"].includes(key)) rowElement.querySelector(".gm-dot-colors").innerHTML = dotColorControls(row);
      autoSave();
      return;
    }
    if (!event.target.dataset.key) return;
    const key = event.target.dataset.key;
    const phaseTiming = ["tiltDuration", "hangDuration", "fallDuration"].includes(key);
    row[key] = key === "hold" || phaseTiming ? clamp(Number(event.target.value) || 0, ["tiltDuration", "fallDuration"].includes(key) ? 50 : 0, 5000) : event.target.value;
    if (key === "fontFamily") {
      row.fontFamily = window.MERowFonts.normalize(event.target.value);
      state.activeRowId = row.id;
      seekToRowStart(state.scheme.rows.indexOf(row), true);
      autoSave();
      refreshFonts();
      if (port.mode === "dots") rowElement.querySelector(".gm-dot-colors").innerHTML = dotColorControls(row);
      return;
    }
    if (event.target.dataset.key === "text") {
      const glyphCount = split(row.text).length;
      (row.icons || []).forEach((icon) => { icon.boundary = clamp(icon.boundary, 0, glyphCount); });
      state.activeRowId = row.id;
      state.caretBoundary = split(row.text.slice(0, event.target.selectionStart ?? row.text.length)).length;
      updateInsertTargetLabel();
      renderSelectedAssets();
      refreshFonts();
      if (port.mode === "dots") rowElement.querySelector(".gm-dot-colors").innerHTML = dotColorControls(row);
    }
    state.elapsedMs = 0;
    if (phaseTiming) {
      state.elapsedMs = rowStartElapsed(state.scheme.rows.indexOf(row)) + row.hold / Math.max(0.01, state.scheme.motion.speed);
      state.playing = true;
      state.lastFrame = performance.now();
      updatePlaybackButton();
    }
    renderTimeline();
    autoSave();
  }
  $("sequenceRows").addEventListener("input", handleRowInput);
  $("sequenceRows").addEventListener("change", (event) => {
    if (event.target.type === "color" && event.target.dataset.dotKey) handleRowInput(event);
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
    if (button.dataset.action === "preview-color") {
      seekToRowStart(index, false);
      return;
    }
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
      const [removed] = state.scheme.rows.splice(index, 1);
      const runtime = state.backgroundCache.get(removed?.id);
      runtime?.video?.pause();
      runtime?.exportVideo?.pause();
      state.backgroundCache.delete(removed?.id);
      if (!state.scheme.rows.some((row) => row.id === state.activeRowId)) state.activeRowId = state.scheme.rows[Math.max(0, index - 1)].id;
    }
    if (button.dataset.action === "up" && index > 0) [state.scheme.rows[index - 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index - 1]];
    if (button.dataset.action === "down" && index < state.scheme.rows.length - 1) [state.scheme.rows[index + 1], state.scheme.rows[index]] = [state.scheme.rows[index], state.scheme.rows[index + 1]];
    state.elapsedMs = 0;
    renderRows(); renderSelectedAssets(); renderTimeline(); autoSave(); resizePreview();
  });
  $("addRow").addEventListener("click", () => {
    const nextRow = row(uid(), "新文字", 100, { backgroundColor: state.scheme.typography.backgroundColor });
    state.scheme.rows.push(nextRow);
    state.activeRowId = nextRow.id; state.caretBoundary = split(nextRow.text).length;
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
  $("timeline").addEventListener("click", (event) => {
    const block = event.target.closest("[data-seek-ms]");
    if (!block) return;
    state.elapsedMs = Number(block.dataset.seekMs);
    state.playing = false;
    updatePlaybackButton();
    resizePreview();
  });
  $("togglePlayback").addEventListener("click", () => { if (!state.playing && state.elapsedMs >= cycleDurationMs()) state.elapsedMs = 0; state.playing = !state.playing; state.lastFrame = performance.now(); updatePlaybackButton(); });
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
    download(new Blob([JSON.stringify(state.scheme, null, 2)], { type: "application/json" }), `${port.slug}-scheme.json`);
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
    await Promise.all([preloadInsertedAssets(), preloadRowBackgrounds()]);
    const output = exportCanvas();
    await prepareBackgroundFrame(state.elapsedMs / 1000);
    renderFrame(output, state.elapsedMs / 1000, output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) return;
      download(blob, `${port.slug}-${output.width}x${output.height}.png`);
      $("exportStatus").textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("exportGif").addEventListener("click", async () => {
    if (!window.GIF) { $("exportStatus").textContent = "GIF 编码器未加载。"; return; }
    setBusy(true, "正在准备 GIF…");
    let workerUrl = "";
    try {
      await Promise.all([preloadInsertedAssets(), preloadRowBackgrounds()]);
      const response = await fetch("js/continuation-gif.worker.js");
      if (!response.ok) throw new Error(`worker ${response.status}`);
      workerUrl = URL.createObjectURL(new Blob([await response.text()], { type: "text/javascript" }));
      const output = exportCanvas();
      const fps = Math.min(30, Number($("exportFps").value));
      const total = Math.max(1, Math.ceil(exportSeconds() * fps));
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: workerUrl });
      for (let index = 0; index < total; index += 1) {
        await prepareBackgroundFrame(index / fps);
        renderFrame(output, index / fps, output.width, output.height);
        const delay = (Math.round((index + 1) * 100 / fps) - Math.round(index * 100 / fps)) * 10;
        gif.addFrame(output, { copy: true, delay });
      }
      gif.on("progress", (progress) => $("exportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`);
      gif.on("finished", (blob) => { URL.revokeObjectURL(workerUrl); download(blob, `${port.slug}-${output.width}x${output.height}.gif`); setBusy(false, "GIF 已生成"); });
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
      await Promise.all([preloadInsertedAssets(), preloadRowBackgrounds()]);
      encoder = await window.HME.createH264MP4Encoder();
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.max(8000, Math.min(30000, Math.round(output.width * output.height * fps * 0.18 / 1000)));
      encoder.groupOfPictures = Math.max(12, Math.round(fps / 2));
      encoder.outputFilename = `${port.slug}-${output.width}x${output.height}-${fps}fps.mp4`;
      encoder.initialize();
      const outputContext = output.getContext("2d", { willReadFrequently: true });
      const progressInterval = Math.max(1, Math.floor(fps / 10));
      for (let index = 0; index < total; index += 1) {
        await prepareBackgroundFrame(index / fps);
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
    const displayTime = state.scheme.motion.loop ? state.elapsedMs % Math.max(1, total) : Math.min(state.elapsedMs, total);
    $("scrubber").value = String(displayTime);
    $("timeNow").textContent = `${(displayTime / 1000).toFixed(2)}s`;
    requestAnimationFrame(animationLoop);
  }

  function initialize() {
    window.STGFontLibrary?.enhanceSelect($("fontFamily"));
    controls.effectAmount.min = String(port.amountMin);
    controls.effectAmount.max = String(port.amountMax);
    controls.effectAmount.step = String(port.amountStep);
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    const params = new URLSearchParams(location.search);
    const useDefault = params.has("preview") || params.get("from") === "gallery";
    renderIconLibrary();
    applyScheme(useDefault || !stored?.rows || Number(stored.version || 1) > VERSION ? clone(DEFAULT_SCHEME) : stored);
    if (state.reducedMotion) { state.playing = false; state.elapsedMs = state.scheme.motion.morphDuration; updatePlaybackButton(); }
    new ResizeObserver(resizePreview).observe(frame);
    document.fonts?.ready.then(() => { fitCache.key = ""; resizePreview(); });
    document.fonts?.addEventListener("loadingdone", () => { fitCache.key = ""; resizePreview(); });
    window.addEventListener("resize", resizePreview, { passive: true });
    window.__morphPortTest = { port: clone({ mode: port.mode, slug: port.slug, zh: port.zh, en: port.en }), renderFrame, resolveTimeline, matchGlyphs, getScheme: () => clone(state.scheme), getElapsedMs: () => state.elapsedMs, isPlaying: () => state.playing, cycleDurationMs, rowStartElapsed, preloadInsertedAssets, setTime: (seconds) => { state.elapsedMs = seconds * 1000; resizePreview(); } };
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
