(() => {
  "use strict";

  // Switch Drop (降临) editor. A subject drops in, then the light goes off (or on) while the subject
  // slides left and the title pops out. The light-off is measured frame by frame from an Apple Watch
  // reference (docs/analyses/switchdrop.md): the light pool contracts from the edges, the dimming
  // accelerates and the last step cuts straight to black. Preview and export share renderFrame().
  const $ = (id) => document.getElementById(id);
  const VERSION = 2;
  const SLUG = "switchdrop";
  const STORAGE_KEY = `me-motion-${SLUG}-v2`;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalizeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const number = (value, fallback, min, max) => { const result = Number(value); return clamp(Number.isFinite(result) ? result : fallback, min, max); };
  const smoother = (value) => { const x = clamp(value); return x * x * x * (x * (x * 6 - 15) + 10); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 4);
  const easeOutBack = (value, strength) => { const x = clamp(value) - 1; const c = 0.55 + strength * 1.9; return 1 + (c + 1) * x * x * x + c * x * x; };
  const springOut = (value, amount) => { const x = clamp(value); return 1 - Math.pow(1 - x, 4) + Math.sin(x * Math.PI * 2.25) * (1 - x) * amount; };
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const graphemes = (value) => segmenter ? Array.from(segmenter.segment(String(value)), (part) => part.segment) : Array.from(String(value));

  // Monotone cubic (Fritsch–Carlson) through keyframes: continuous speed, no overshoot.
  function track(points) {
    const n = points.length;
    const slopes = [];
    for (let i = 0; i < n - 1; i += 1) slopes.push((points[i + 1][1] - points[i][1]) / Math.max(1e-6, points[i + 1][0] - points[i][0]));
    const tangents = points.map((_, i) => {
      if (i === 0) return slopes[0];
      if (i === n - 1) return slopes[n - 2];
      const a = slopes[i - 1], b = slopes[i];
      if (a * b <= 0) return 0;
      const ha = points[i][0] - points[i - 1][0], hb = points[i + 1][0] - points[i][0];
      return 3 * (ha + hb) / ((2 * hb + ha) / a + (hb + 2 * ha) / b);
    });
    return (x) => {
      if (x <= points[0][0]) return points[0][1];
      for (let i = 1; i < n; i += 1) {
        if (x <= points[i][0]) {
          const [x0, y0] = points[i - 1], [x1, y1] = points[i];
          const h = Math.max(1e-6, x1 - x0), t = (x - x0) / h, t2 = t * t, t3 = t2 * t;
          return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * tangents[i - 1] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * tangents[i];
        }
      }
      return points[n - 1][1];
    };
  }

  // ---------- Measured light-off (Apple Watch reference, 20.4 fps, frames 14 → 19 ≈ 0.25 s) ----------
  // Remaining light as a fraction of the lit frame, by elliptical distance r from the light centre
  // (r = 1 at the middle of each frame edge) and by switch progress τ (0 = lit, 1 = black).
  const LIGHT_R = [0, 0.15, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
  const LIGHT_TABLE = [
    [0, [1, 1, 1, 1, 1, 1, 1, 1]],
    [0.2, [0.987, 0.987, 0.987, 0.982, 0.973, 0.954, 0.935, 0.917]],
    [0.4, [0.94, 0.94, 0.926, 0.906, 0.869, 0.781, 0.711, 0.658]],
    [0.6, [0.788, 0.788, 0.753, 0.683, 0.579, 0.44, 0.37, 0.338]],
    [0.8, [0.338, 0.338, 0.296, 0.241, 0.192, 0.155, 0.137, 0.13]],
    [1, [0, 0, 0, 0, 0, 0, 0, 0]]
  ];
  const lightTracks = LIGHT_R.map((_, index) => track(LIGHT_TABLE.map(([tau, values]) => [tau, values[index]])));
  const centreLight = lightTracks[0];
  // τ at which the measured centre has the requested brightness (centre light falls monotonically).
  function tauForCentre(target) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i += 1) { const mid = (lo + hi) / 2; if (centreLight(mid) > target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  // The lit frame is itself a soft pool: flat to r ≈ 0.7, then 0.88 at the edge middles and ~0.6 in the corners.
  const litFalloff = (r, amount) => clamp(1 - 0.12 * amount * Math.pow(r, 2.7), 0, 1);

  const CURVES = {
    apple: { label: "苹果关灯 · 慢入快出（原片）" },
    balanced: { label: "平衡丝滑", fn: smoother },
    snappy: { label: "快速开关", fn: easeOut }
  };

  const DEFAULT_SCHEME = Object.freeze({
    version: VERSION,
    canvas: { width: 1920, height: 1080, preset: "1920x1080" },
    subject: { name: "主体", mode: "asset", assetId: "hely", text: "ME", color: "#8277f5", size: 190, rim: 70, nightLogo: true, nightGlow: 100 },
    title: { text: "hely.fun", fontFamily: "stg:manrope", fontWeight: 700, size: 112, gap: 42, tracking: -3, color: "#ffffff", dotColor: "#8277f5" },
    light: { direction: "off", curve: "apple", shape: "spot", duration: 240, delay: 0, litColor: "#dcdbe4", darkColor: "#010002", vignette: 100 },
    motion: { speed: 1, drop: 1150, startY: -24, endY: 50, overshoot: 0, settle: 0, shift: 460, titleDelay: 60, titleDuration: 420, titleSpring: 18, hold: 3500, loop: true },
    background: { opacity: 100, media: null }
  });
  const RANGES = {
    subject: { size: [50, 420], rim: [0, 150], nightGlow: [30, 180] },
    title: { fontWeight: [100, 900], size: [28, 260], gap: [0, 180], tracking: [-12, 40] },
    light: { duration: [80, 3000], delay: [0, 1500], vignette: [0, 200] },
    motion: { speed: [0.25, 3], drop: [250, 3200], startY: [-70, 0], endY: [25, 75], overshoot: [0, 22], settle: [0, 5000], shift: [100, 1800], titleDelay: [0, 1500], titleDuration: [80, 1800], titleSpring: [0, 55], hold: [0, 12000] }
  };

  const state = { scheme: clone(DEFAULT_SCHEME), playing: true, elapsedMs: 0, lastFrame: performance.now(), exportBusy: false, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, activeRowId: "sd-subject", previewMode: false, background: null, fontsVersion: 0 };
  const canvas = $("glyphMorphCanvas");
  const frame = $("compositionFrame");

  // ---------- Subject assets ----------
  const svgData = (body) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`)}`;
  const assets = new Map();
  function addAsset(id, label, src, options = {}) {
    const image = new Image();
    image.decoding = "async";
    const asset = { id, label, src, image, removable: Boolean(options.removable), special: options.special || "", ready: false };
    image.onload = () => {
      asset.ready = true;
      rimCache.clear();
      if (asset.special === "hely") {
        // Thumbnail from the same circular crop the renderer uses.
        const thumb = document.createElement("canvas");
        thumb.width = 96; thumb.height = 96;
        drawHelyLogo(thumb.getContext("2d"), image, 48, 48, 96);
        asset.thumb = thumb.toDataURL("image/png");
        renderAssetGrid();
      }
    };
    image.src = src;
    assets.set(id, asset);
    return asset;
  }
  addAsset("hely", "Hely Logo", "assets/hely-brand-reference.png", { special: "hely" });
  addAsset("watch", "手表", svgData('<rect x="31" y="18" width="66" height="92" rx="24" fill="#111"/><rect x="38" y="25" width="52" height="78" rx="19" fill="#f4f4f4"/><circle cx="64" cy="64" r="18" fill="#8277f5"/><path d="M64 50v15l12 8" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'));
  addAsset("bolt", "闪电", svgData('<path d="M72 8 25 72h33l-4 48 49-70H70z" fill="#8277f5"/>'));
  addAsset("play", "播放", svgData('<rect x="8" y="8" width="112" height="112" rx="30" fill="#111"/><path d="m50 37 43 27-43 27z" fill="#fff"/>'));
  addAsset("cloud", "云朵", svgData('<path d="M38 94h55a24 24 0 0 0 2-48 34 34 0 0 0-64-2A25 25 0 0 0 38 94Z" fill="#8277f5"/>'));
  (window.TokenAssetTools?.animalAssets?.(8) || []).forEach(({ id, label, src }) => addAsset(id, label, src));
  let uploadedCount = 0;

  // Night (self-lit) Hely logo: keyed from the provided night reference.
  const nightLogo = new Image();
  let nightLogoProcessed = null;
  nightLogo.onload = () => {
    const source = { x: 88, y: 139, width: 1016, height: 977 };
    const keyed = document.createElement("canvas");
    keyed.width = source.width; keyed.height = source.height;
    const keyedContext = keyed.getContext("2d", { willReadFrequently: true });
    keyedContext.drawImage(nightLogo, source.x, source.y, source.width, source.height, 0, 0, source.width, source.height);
    const imageData = keyedContext.getImageData(0, 0, source.width, source.height);
    const pixels = imageData.data;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const light = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]) / 255;
      if (light < 0.012) { pixels[offset + 3] = 0; continue; }
      for (let channel = 0; channel < 3; channel += 1) pixels[offset + channel] = Math.min(255, pixels[offset + channel] / Math.max(0.035, light));
      pixels[offset + 3] = Math.round(Math.pow(light, 1.12) * 255);
    }
    keyedContext.putImageData(imageData, 0, 0);
    nightLogoProcessed = keyed;
  };
  nightLogo.src = "assets/hely-brand-night-reference.png";

  // ---------- Fonts ----------
  function titleFace() {
    const preset = window.STGFontLibrary?.preset(state.scheme.title.fontFamily) || { family: "STG Manrope" };
    return { family: preset.family, weight: state.scheme.title.fontWeight };
  }
  const fontString = (size) => { const face = titleFace(); return `${face.weight} ${size}px "${face.family}", "STG Noto Sans SC", sans-serif`; };
  async function refreshFonts() {
    if (!document.fonts?.load) return;
    const face = titleFace();
    await document.fonts.load(`${face.weight} 64px "${face.family}"`, state.scheme.title.text || "Aa").catch(() => null);
    if (state.scheme.subject.mode === "text") await document.fonts.load(`900 64px "${face.family}"`, state.scheme.subject.text || "ME").catch(() => null);
    state.fontsVersion += 1;
    rimCache.clear();
    resizePreview();
  }

  // ---------- Timing (composition ms; speed scales the whole cycle) ----------
  function timing() {
    const { motion, light } = state.scheme;
    const drop = motion.drop;
    const shiftStart = drop + motion.settle;
    const switchStart = shiftStart + light.delay;
    const switchEnd = switchStart + light.duration;
    const titleStart = shiftStart + motion.titleDelay;
    const finish = Math.max(shiftStart + motion.shift, titleStart + motion.titleDuration, switchEnd);
    return { drop, shiftStart, switchStart, switchEnd, titleStart, finish, total: finish + motion.hold };
  }
  function cycleDurationMs() { return Math.max(1, timing().total / Math.max(0.01, state.scheme.motion.speed)); }
  function compositionTime(elapsedMs) {
    const total = cycleDurationMs();
    const local = state.scheme.motion.loop ? ((elapsedMs % total) + total) % total : Math.min(elapsedMs, total);
    return local * Math.max(0.01, state.scheme.motion.speed);
  }

  // Light state at switch progress p: τ along the measured light-off.
  function lightTau(progress) {
    const { direction, curve } = state.scheme.light;
    const p = direction === "on" ? 1 - clamp(progress) : clamp(progress);
    if (curve === "apple" || !CURVES[curve]?.fn) return p;
    return tauForCentre(1 - CURVES[curve].fn(p));
  }
  function lightAt(r, tau) {
    if (state.scheme.light.shape === "uniform") return centreLight(tau);
    if (r >= LIGHT_R[LIGHT_R.length - 1]) return lightTracks[LIGHT_R.length - 1](tau);
    let index = 1;
    while (LIGHT_R[index] < r) index += 1;
    const t = (r - LIGHT_R[index - 1]) / (LIGHT_R[index] - LIGHT_R[index - 1]);
    return lerp(lightTracks[index - 1](tau), lightTracks[index](tau), t);
  }

  // ---------- Background media (image / GIF / video; cropped and trimmed like 字芽) ----------
  const isVideoMedia = (media) => /^video\//i.test(media?.fileType || "");
  const isGifMedia = (media) => /gif/i.test(media?.fileType || "");
  function normalizeBackgroundMedia(media) {
    if (!media || typeof media !== "object" || !media.url) return null;
    return {
      name: String(media.name || "背景素材"), url: String(media.url), fileType: String(media.fileType || media.type || "image/png"),
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
        video.addEventListener("loadeddata", () => { runtime[key] = video; runtime.duration = Number(video.duration) || runtime.duration; resolve(runtime); }, { once: true });
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
  function drawMedia(ctx, width, height, image, alpha = 1) {
    if (!image) return;
    const media = state.scheme.background.media;
    const sourceWidth = image.videoWidth || image.width || image.naturalWidth || width;
    const sourceHeight = image.videoHeight || image.height || image.naturalHeight || height;
    const cover = Math.max(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight)) * (media?.cropZoom || 1);
    const drawWidth = sourceWidth * cover, drawHeight = sourceHeight * cover;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, -(drawWidth - width) * (media?.cropX ?? 0.5), -(drawHeight - height) * (media?.cropY ?? 0.5), drawWidth, drawHeight);
    ctx.restore();
  }
  function drawCropPreview() {
    const cropCanvas = $("backgroundCropPreview");
    const runtime = backgroundRuntime();
    if (!cropCanvas || !state.scheme.background.media || !runtime) return;
    const ratio = state.scheme.canvas.width / Math.max(1, state.scheme.canvas.height);
    cropCanvas.width = 720;
    cropCanvas.height = Math.max(180, Math.round(720 / ratio));
    cropCanvas.style.aspectRatio = `${state.scheme.canvas.width} / ${state.scheme.canvas.height}`;
    const image = runtime.kind === "video" ? (runtime.previewImage || (runtime.video?.readyState >= 2 ? runtime.video : null)) : backgroundImageAt(state.elapsedMs / 1000, false);
    const cropContext = cropCanvas.getContext("2d");
    cropContext.fillStyle = state.scheme.light.litColor;
    cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    drawMedia(cropContext, cropCanvas.width, cropCanvas.height, image, 1);
  }

  // ---------- Subject drawing ----------
  function drawHelyLogo(ctx, image, x, y, size) {
    const source = { x: 178, y: 193, width: 415, height: 414 };
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, size * 0.49, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(image, source.x, source.y, source.width, source.height, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }
  function drawSubjectShape(ctx, x, y, size) {
    const subject = state.scheme.subject;
    if (subject.mode === "text") {
      ctx.font = `900 ${size * 0.58}px "${titleFace().family}", "STG Noto Sans SC", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = subject.color;
      ctx.fillText(subject.text.trim() || "ME", x, y);
      return;
    }
    const asset = assets.get(subject.assetId) || assets.get("hely");
    if (!asset?.ready) return;
    if (asset.special === "hely") { drawHelyLogo(ctx, asset.image, x, y, size); return; }
    const ratio = asset.image.naturalWidth / Math.max(1, asset.image.naturalHeight);
    const drawWidth = ratio >= 1 ? size : size * ratio;
    const drawHeight = ratio >= 1 ? size / ratio : size;
    ctx.drawImage(asset.image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
  }
  // Rim light: the subject's outline (silhouette minus its eroded copy), lit from behind once the
  // front light is gone — like the watch cases and bands in the reference.
  const rimCache = new Map();
  function rimSprite(size) {
    const key = `${state.scheme.subject.mode}|${state.scheme.subject.assetId}|${state.scheme.subject.text}|${Math.round(size)}|${state.fontsVersion}`;
    if (rimCache.has(key)) return rimCache.get(key);
    const pad = Math.ceil(size * 0.2);
    const side = Math.ceil(size * 1.6) + pad * 2;
    const silhouette = document.createElement("canvas");
    silhouette.width = side; silhouette.height = side;
    const s = silhouette.getContext("2d");
    drawSubjectShape(s, side / 2, side / 2, size);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = "#ffffff";
    s.fillRect(0, 0, side, side);
    const eroded = document.createElement("canvas");
    eroded.width = side; eroded.height = side;
    const e = eroded.getContext("2d");
    const d = Math.max(1, size * 0.018);
    e.drawImage(silhouette, 0, 0);
    e.globalCompositeOperation = "destination-in";
    [[d, 0], [-d, 0], [0, d], [0, -d]].forEach(([dx, dy]) => e.drawImage(silhouette, dx, dy));
    const rim = document.createElement("canvas");
    rim.width = side; rim.height = side;
    const r = rim.getContext("2d");
    r.filter = `blur(${Math.max(0.5, size * 0.004)}px)`;
    r.drawImage(silhouette, 0, 0);
    r.filter = "none";
    r.globalCompositeOperation = "destination-out";
    r.drawImage(eroded, 0, 0);
    const sprite = { canvas: rim, side };
    if (rimCache.size > 24) rimCache.clear();
    rimCache.set(key, sprite);
    return sprite;
  }
  function drawNight(ctx, x, y, size, darkness) {
    const subject = state.scheme.subject;
    if (darkness <= 0.001) return;
    const isHely = subject.mode === "asset" && (assets.get(subject.assetId)?.special === "hely");
    if (isHely && subject.nightLogo && nightLogoProcessed) {
      const glow = subject.nightGlow / 100;
      const drawWidth = size * 1.26;
      const drawHeight = drawWidth * nightLogoProcessed.height / nightLogoProcessed.width;
      ctx.save();
      ctx.globalAlpha = clamp(darkness * Math.min(1.25, glow));
      ctx.filter = `brightness(${0.8 + glow * 0.2})`;
      ctx.drawImage(nightLogoProcessed, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
      return;
    }
    if (subject.rim <= 0) return;
    const sprite = rimSprite(size);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = clamp(darkness * subject.rim / 100 * 0.85);
    ctx.drawImage(sprite.canvas, x - sprite.side / 2, y - sprite.side / 2);
    ctx.restore();
  }

  // ---------- Rendering ----------
  function textMetrics(ctx, text, tracking) {
    const glyphs = graphemes(text);
    const widths = glyphs.map((glyph) => ctx.measureText(glyph).width);
    return { glyphs, widths, total: widths.reduce((sum, width) => sum + width, 0) + Math.max(0, glyphs.length - 1) * tracking };
  }
  function frameState(time) {
    const t = timing();
    const { motion } = state.scheme;
    const final = time >= t.finish;
    const dropRaw = clamp(time / Math.max(1, t.drop));
    const switchRaw = final ? 1 : clamp((time - t.switchStart) / Math.max(1, t.switchEnd - t.switchStart));
    return {
      dropRaw,
      drop: easeOutBack(dropRaw, motion.overshoot / 100),
      switchRaw,
      tau: lightTau(switchRaw),
      shift: smoother(clamp((time - t.shiftStart) / Math.max(1, motion.shift))),
      titleRaw: clamp((time - t.titleStart) / Math.max(1, motion.titleDuration)),
      final
    };
  }
  function renderFrame(target, timeSeconds, width = target.width, height = target.height, preview = target === canvas) {
    const ctx = target.getContext("2d");
    const time = compositionTime(timeSeconds * 1000);
    const f = frameState(time);
    const { subject, title, light, motion, background } = state.scheme;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";

    // 1. Lit scene: lit background (+ media), then the subject.
    ctx.fillStyle = light.litColor;
    ctx.fillRect(0, 0, width, height);
    drawMedia(ctx, width, height, backgroundImageAt(time / 1000, preview), clamp(background.opacity / 100));

    const layoutScale = Math.min(width / 1100, height / 850);
    const subjectSize = Math.max(18, subject.size * layoutScale);
    const titleSize = Math.max(14, title.size * layoutScale);
    const tracking = title.tracking * layoutScale;
    const gap = title.gap * layoutScale;
    const titleText = title.text || "hely.fun";
    ctx.font = fontString(titleSize);
    const metrics = textMetrics(ctx, titleText, tracking);
    const fit = Math.min(1, width * 0.82 / Math.max(1, subjectSize + gap + metrics.total));
    const size = subjectSize * fit, fittedTitle = titleSize * fit, fittedGap = gap * fit, fittedTracking = tracking * fit;
    ctx.font = fontString(fittedTitle);
    const fitted = textMetrics(ctx, titleText, fittedTracking);
    const groupWidth = size + fittedGap + fitted.total;
    const startY = height * motion.startY / 100 - size * 0.5;
    const endY = height * motion.endY / 100;
    const subjectY = lerp(startY, endY, f.drop);
    const subjectX = lerp(width / 2, width / 2 - groupWidth / 2 + size / 2, f.shift);
    const dropScale = lerp(0.88, 1, smoother(f.dropRaw));
    ctx.save();
    ctx.translate(subjectX, subjectY); ctx.scale(dropScale, dropScale); ctx.translate(-subjectX, -subjectY);
    drawSubjectShape(ctx, subjectX, subjectY, size);
    ctx.restore();

    // 2. The light: one elliptical gradient multiplies the lit scene by (lit pool × remaining light).
    const cx = width / 2, cy = height / 2;
    const steps = 24, rMax = 1.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(width / 2, height / 2);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rMax);
    const dark = light.darkColor;
    const [dr, dg, db] = [1, 3, 5].map((offset) => parseInt(dark.slice(offset, offset + 2), 16));
    for (let i = 0; i <= steps; i += 1) {
      const r = i / steps * rMax;
      const remaining = litFalloff(r, light.vignette / 100) * lightAt(r, f.tau);
      gradient.addColorStop(i / steps, `rgba(${dr},${dg},${db},${clamp(1 - remaining).toFixed(4)})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
    ctx.restore();

    // 3. Self-lit layers: rim light / night logo as the front light goes, then the title.
    const sr = Math.hypot((subjectX - cx) / (width / 2), (subjectY - cy) / (height / 2));
    const darkness = clamp(1 - lightAt(sr, f.tau));
    ctx.save();
    ctx.translate(subjectX, subjectY); ctx.scale(dropScale, dropScale); ctx.translate(-subjectX, -subjectY);
    drawNight(ctx, subjectX, subjectY, size, darkness);
    ctx.restore();

    if (f.titleRaw > 0) {
      const progress = clamp(springOut(f.titleRaw, motion.titleSpring / 100));
      const titleX = subjectX + size / 2 + fittedGap;
      const visibleWidth = Math.max(1, fitted.total * clamp(f.titleRaw * 1.08));
      const slide = (1 - progress) * Math.max(16, fittedTitle * 0.28);
      const titleScale = lerp(0.92, 1, progress);
      ctx.save();
      ctx.beginPath(); ctx.rect(titleX - 2, endY - fittedTitle, visibleWidth + 8, fittedTitle * 2); ctx.clip();
      ctx.translate(titleX - slide, endY); ctx.scale(titleScale, titleScale);
      ctx.font = fontString(fittedTitle);
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      let cursor = 0;
      fitted.glyphs.forEach((glyph, index) => {
        ctx.fillStyle = glyph === "." ? title.dotColor : title.color;
        ctx.fillText(glyph, cursor, 0);
        cursor += fitted.widths[index] + fittedTracking;
      });
      ctx.restore();
    }
    ctx.restore();
    if (target === canvas) {
      canvas.dataset.lightTau = f.tau.toFixed(4);
      canvas.dataset.centreLight = lightAt(0, f.tau).toFixed(4);
    }
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
    stage.style.setProperty("--tc-active-composition-bg", state.scheme.light.litColor);
    renderFrame(canvas, state.elapsedMs / 1000);
    drawCropPreview();
  }

  // ---------- Rows: 主体 and 标题 ----------
  function subjectSummary() {
    const subject = state.scheme.subject;
    return subject.mode === "text" ? `文字 · ${subject.text || "ME"}` : `图片 · ${assets.get(subject.assetId)?.label || "Hely Logo"}`;
  }
  function assetGridHtml() {
    return [...assets.values()].map((asset) => `
      <div class="sd-asset${asset.id === state.scheme.subject.assetId && state.scheme.subject.mode === "asset" ? " is-selected" : ""}" data-asset-id="${asset.id}">
        <button type="button" data-action="pick-asset" aria-label="选择${escapeHtml(asset.label)}"><img src="${escapeHtml(asset.thumb || asset.src)}" alt=""><span>${escapeHtml(asset.label)}</span></button>
        ${asset.removable ? `<button class="sd-asset-remove" type="button" data-action="remove-asset" aria-label="删除这张图片">×</button>` : ""}
      </div>`).join("");
  }
  function rowHtml(id, index, inner, text, placeholder, summary) {
    return `
      <div class="gm-row-shell" data-row-id="${id}" data-row-summary="${escapeHtml(summary)}">
        <div class="gm-row">
          <span class="gm-row-index">${String(index).padStart(2, "0")}</span>
          <input data-key="text" value="${escapeHtml(text)}" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}">
        </div>
        ${inner}
        <div class="gm-row-meta">
          <button class="gm-row-pause" data-action="pause-row" type="button">暂停查看</button>
          <button class="gm-text-button" data-action="preview-row" type="button">▶ 从这里播放</button>
        </div>
      </div>`;
  }
  function renderRows() {
    const { subject, title } = state.scheme;
    const subjectInner = `
        <div class="gm-row-background-grid sd-row-grid">
          <label>主体类型<select data-key="mode"><option value="asset"${subject.mode === "asset" ? " selected" : ""}>图标 / 图片</option><option value="text"${subject.mode === "text" ? " selected" : ""}>文字</option></select></label>
          <label>主体大小<input data-key="size" type="number" min="50" max="420" step="1" value="${subject.size}"><small>px</small></label>
          <label>文字主体颜色<input data-key="color" type="color" value="${subject.color}"></label>
          <label>关灯后轮廓光<input data-key="rim" type="number" min="0" max="150" step="5" value="${subject.rim}"><small>%</small></label>
          <label class="sd-wide sd-check"><input data-key="nightLogo" type="checkbox"${subject.nightLogo ? " checked" : ""}><span>Hely Logo 关灯后切换夜光版本</span></label>
          <label>夜光强度<input data-key="nightGlow" type="number" min="30" max="180" step="5" value="${subject.nightGlow}"><small>%</small></label>
          <div class="sd-wide sd-asset-head"><strong>主体图片</strong><label class="sd-upload">上传图片<input id="assetUpload" type="file" accept="image/*" multiple></label></div>
          <label class="sd-wide sd-check"><input id="assetRemoveBackground" type="checkbox" checked><span>上传时自动去背景并裁掉透明空白</span></label>
          <div class="sd-wide sd-asset-grid" id="assetGrid">${assetGridHtml()}</div>
          <p class="gm-help sd-wide" id="assetProcessStatus" aria-live="polite">图片只在浏览器本地处理，不会上传到服务器。关灯后，普通图片会留下一圈轮廓光，Hely Logo 换成夜光版本。</p>
        </div>`;
    const titleInner = `
        <div class="gm-row-background-grid sd-row-grid">
          <label>字号<input data-key="size" type="number" min="28" max="260" step="1" value="${title.size}"><small>px</small></label>
          <label>与主体间距<input data-key="gap" type="number" min="0" max="180" step="1" value="${title.gap}"><small>px</small></label>
          <label>字距<input data-key="tracking" type="number" min="-12" max="40" step="1" value="${title.tracking}"><small>px</small></label>
          <label>字重<select data-key="fontWeight">${[300, 400, 500, 600, 700, 800, 900].map((weight) => `<option value="${weight}"${weight === title.fontWeight ? " selected" : ""}>${weight}</option>`).join("")}</select></label>
          <label>文字颜色<input data-key="color" type="color" value="${title.color}"></label>
          <label>标点颜色<input data-key="dotColor" type="color" value="${title.dotColor}"></label>
          <p class="gm-help sd-wide">标题在主体左移时从右侧弹出，字体在「动效设置 → 标题字体」里换。关灯时标题用浅色，开灯时用深色。</p>
        </div>`;
    $("sequenceRows").innerHTML = rowHtml("sd-subject", 1, subjectInner, subject.mode === "text" ? subject.text : (subject.name || "主体"), subject.mode === "text" ? "主体文字" : "主体名称", subjectSummary())
      + rowHtml("sd-title", 2, titleInner, title.text, "标题文字", `标题 · ${title.text}`);
    bindAssetUpload();
  }
  function refreshRowChrome() {
    const subjectShell = document.querySelector('.gm-row-shell[data-row-id="sd-subject"]');
    const titleShell = document.querySelector('.gm-row-shell[data-row-id="sd-title"]');
    if (subjectShell) subjectShell.dataset.rowSummary = subjectSummary();
    if (titleShell) titleShell.dataset.rowSummary = `标题 · ${state.scheme.title.text}`;
  }
  function renderAssetGrid() {
    const grid = $("assetGrid");
    if (grid) grid.innerHTML = assetGridHtml();
    refreshRowChrome();
    // The shared shell rebuilds its row list on input events; picking an image is a click.
    $("sequenceRows").dispatchEvent(new Event("input"));
  }
  function bindAssetUpload() {
    const upload = $("assetUpload");
    if (!upload || upload.dataset.bound) return;
    upload.dataset.bound = "true";
    upload.addEventListener("change", async (event) => {
      const files = [...event.currentTarget.files];
      if (!files.length) return;
      const status = $("assetProcessStatus");
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        status.textContent = `正在处理 ${index + 1} / ${files.length} · ${file.name}`;
        try {
          const result = await window.TokenAssetTools.processFile(file, { removeBackground: $("assetRemoveBackground")?.checked !== false });
          uploadedCount += 1;
          const id = `upload${uploadedCount}`;
          addAsset(id, file.name.replace(/\.[^.]+$/, ""), result.src, { removable: true });
          state.scheme.subject.assetId = id;
          state.scheme.subject.mode = "asset";
          status.textContent = `${result.status} · 已设为当前主体`;
        } catch (error) {
          status.textContent = `处理失败：${error.message || "无法读取图片"}`;
        }
      }
      event.currentTarget.value = "";
      const select = document.querySelector('.gm-row-shell[data-row-id="sd-subject"] [data-key="mode"]');
      if (select) select.value = "asset";
      rimCache.clear(); renderAssetGrid(); autoSave(); playFrom(0);
    });
  }

  // ---------- Timeline ----------
  function timelinePhases() {
    const t = timing();
    const marks = [...new Set([0, t.drop, t.shiftStart, t.switchStart, t.switchEnd, t.finish, t.total].map((value) => Math.round(value)))].sort((a, b) => a - b);
    const lightWord = state.scheme.light.direction === "on" ? "开灯" : "关灯";
    const phases = [];
    for (let i = 0; i < marks.length - 1; i += 1) {
      const from = marks[i], to = marks[i + 1];
      if (to - from < 1) continue;
      const mid = (from + to) / 2;
      let label, fill;
      if (mid >= t.finish) { label = "结束停留"; fill = "#d4b8ff"; }
      else if (mid >= t.switchStart && mid < t.switchEnd) { label = mid >= t.shiftStart && mid < t.shiftStart + state.scheme.motion.shift ? `${lightWord} · 左移` : lightWord; fill = "#ffc4d6"; }
      else if (mid < t.drop) { label = "主体降临"; fill = "#d7ff2f"; }
      else if (mid < t.shiftStart) { label = "落点停顿"; fill = "#9de7d7"; }
      else { label = "左移 · 标题"; fill = "#8ec8ff"; }
      const last = phases[phases.length - 1];
      if (last && last.label === label) last.to = to; else phases.push({ label, from, to, fill });
    }
    return phases;
  }
  function renderTimeline() {
    const speed = Math.max(0.01, state.scheme.motion.speed);
    $("timeline").innerHTML = timelinePhases().map((phase) => `<button type="button" data-seek-ms="${phase.from / speed}" class="gm-timeline-block me-choreo-block" style="background:${phase.fill} !important;flex-grow:${Math.max(1, phase.to - phase.from)}" role="listitem"><strong>${phase.label}</strong><small>${((phase.to - phase.from) / speed / 1000).toFixed(2)}s</small></button>`).join("");
    const total = cycleDurationMs();
    $("scrubber").max = String(Math.max(0.001, total));
    $("timeTotal").textContent = `${(total / 1000).toFixed(2)}s`;
  }

  // ---------- Global controls ----------
  const CONTROL_MAP = {
    switchMode: ["light", "direction"], switchEase: ["light", "curve"], switchShape: ["light", "shape"], switchDuration: ["light", "duration"], switchDelay: ["light", "delay"], vignette: ["light", "vignette"],
    backgroundColor: ["light", "litColor"], darkColor: ["light", "darkColor"],
    speed: ["motion", "speed"], dropDuration: ["motion", "drop"], startY: ["motion", "startY"], endY: ["motion", "endY"], dropOvershoot: ["motion", "overshoot"], settleDuration: ["motion", "settle"],
    shiftDuration: ["motion", "shift"], titleDelay: ["motion", "titleDelay"], titleDuration: ["motion", "titleDuration"], titleSpring: ["motion", "titleSpring"], holdDuration: ["motion", "hold"], loop: ["motion", "loop"],
    fontFamily: ["title", "fontFamily"], textColor: ["title", "color"], backgroundOpacity: ["background", "opacity"]
  };
  const ms = (v) => `${Math.round(Number(v))}ms`;
  const OUTPUT_FORMAT = { switchDuration: ms, switchDelay: ms, vignette: (v) => `${v}%`, speed: (v) => `${Number(v).toFixed(2)}×`, dropDuration: ms, startY: (v) => `${v}%`, endY: (v) => `${v}%`, dropOvershoot: (v) => `${v}%`, settleDuration: ms, shiftDuration: ms, titleDelay: ms, titleDuration: ms, titleSpring: (v) => `${v}%`, holdDuration: ms, backgroundOpacity: (v) => `${v}%` };
  function updateOutputs() {
    Object.entries(OUTPUT_FORMAT).forEach(([id, format]) => { const output = document.querySelector(`output[for="${id}"]`); if (output && $(id)) output.value = format(Number($(id).value)); });
  }
  function syncControls() {
    const { canvas: size } = state.scheme;
    $("canvasPreset").value = size.preset;
    $("canvasWidth").value = size.width; $("canvasHeight").value = size.height;
    document.querySelector(".gm-custom-size").hidden = size.preset !== "custom";
    Object.entries(CONTROL_MAP).forEach(([id, [group, key]]) => {
      const input = $(id);
      if (!input) return;
      const value = state.scheme[group][key];
      if (input.type === "checkbox") input.checked = Boolean(value); else input.value = String(value);
    });
    renderRows(); renderTimeline(); updateOutputs(); refreshMediaUi(); resizePreview();
  }
  function collectControls() {
    Object.entries(CONTROL_MAP).forEach(([id, [group, key]]) => {
      const input = $(id);
      if (!input) return;
      const target = state.scheme[group];
      if (input.type === "checkbox") target[key] = input.checked;
      else if (input.type === "color") target[key] = normalizeColor(input.value, target[key]);
      else if (input.tagName === "SELECT" || input.type === "text") target[key] = input.value;
      else target[key] = number(input.value, DEFAULT_SCHEME[group][key], ...(RANGES[group]?.[key] || [0, 100]));
    });
  }
  function autoSave() {
    if (state.previewMode) return;
    try {
      const saved = clone(state.scheme);
      // Uploaded subject images are session-only; keep the choice only if it is built in.
      if (/^upload/.test(saved.subject.assetId)) saved.subject.assetId = "hely";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (_) {}
  }
  function normalizeGroup(group, input) {
    const result = { ...clone(DEFAULT_SCHEME[group]), ...(input || {}) };
    Object.entries(RANGES[group] || {}).forEach(([key, range]) => { result[key] = number(result[key], DEFAULT_SCHEME[group][key], ...range); });
    Object.keys(result).forEach((key) => { if (/color$/i.test(key)) result[key] = normalizeColor(result[key], DEFAULT_SCHEME[group][key]); });
    return result;
  }
  function applyScheme(scheme, status = "") {
    if (!scheme || typeof scheme !== "object") return;
    const next = {
      version: VERSION,
      canvas: { ...clone(DEFAULT_SCHEME.canvas), ...(scheme.canvas || {}) },
      subject: normalizeGroup("subject", scheme.subject),
      title: normalizeGroup("title", scheme.title),
      light: normalizeGroup("light", scheme.light),
      motion: normalizeGroup("motion", scheme.motion),
      background: { opacity: number(scheme.background?.opacity, 100, 0, 100), media: normalizeBackgroundMedia(scheme.background?.media) }
    };
    if (!["off", "on"].includes(next.light.direction)) next.light.direction = "off";
    if (!CURVES[next.light.curve]) next.light.curve = "apple";
    if (!["spot", "uniform"].includes(next.light.shape)) next.light.shape = "spot";
    if (!assets.has(next.subject.assetId)) next.subject.assetId = "hely";
    if (!["asset", "text"].includes(next.subject.mode)) next.subject.mode = "asset";
    next.title.fontWeight = Math.round(next.title.fontWeight / 100) * 100;
    state.scheme = next;
    state.elapsedMs = 0; state.playing = !state.reducedMotion; state.lastFrame = performance.now();
    rimCache.clear();
    prepareBackground();
    updatePlaybackButton(); syncControls(); autoSave(); refreshFonts();
    if (status) $("exportStatus").textContent = status;
  }
  function changed({ restart = false } = {}) {
    collectControls();
    if (restart) playFrom(0);
    refreshRowChrome(); renderTimeline(); updateOutputs(); autoSave(); resizePreview();
  }

  // ---------- Background UI ----------
  function drawFilmstrip(filmstrip) {
    const target = $("backgroundFilmstrip");
    if (!filmstrip || !target) return;
    const filmstripContext = target.getContext("2d");
    filmstripContext.clearRect(0, 0, target.width, target.height);
    filmstripContext.drawImage(filmstrip, 0, 0, target.width, target.height);
  }
  async function refreshMediaUi() {
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
    media.videoStart = clip.start; media.videoEnd = clip.end;
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

  // ---------- Playback ----------
  function updatePlaybackButton() {
    $("togglePlayback").innerHTML = state.playing ? "Ⅱ <span>暂停</span>" : "▶ <span>播放</span>";
    $("togglePlayback").setAttribute("aria-pressed", String(!state.playing));
  }
  function pauseAt(value) { state.elapsedMs = Math.max(0, value); state.playing = false; updatePlaybackButton(); resizePreview(); }
  function playFrom(value) { state.elapsedMs = Math.max(0, value); state.playing = true; state.lastFrame = performance.now(); updatePlaybackButton(); resizePreview(); }
  // Subject row pauses on the landed subject; title row on the finished lockup.
  function seekToRowStart(rowId, pause = true) {
    const t = timing();
    const speed = Math.max(0.01, state.scheme.motion.speed);
    state.activeRowId = rowId;
    if (rowId === "sd-title") { if (pause) pauseAt(t.finish / speed + 1); else playFrom(t.shiftStart / speed); return; }
    if (pause) pauseAt(Math.max(0, t.shiftStart - 1) / speed); else playFrom(0);
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
  const LIGHT_CONTROLS = new Set(["switchMode", "switchEase", "switchShape", "switchDuration", "switchDelay", "vignette", "darkColor"]);
  Object.keys(CONTROL_MAP).forEach((id) => {
    const input = $(id);
    if (!input) return;
    input.addEventListener(input.matches("select, input[type=checkbox]") ? "change" : "input", () => {
      if (id === "switchMode") {
        // Lights off → light title; lights on → dark title on the lit frame.
        const off = input.value === "off";
        state.scheme.title.color = off ? "#ffffff" : "#050505";
        const titleColor = document.querySelector('.gm-row-shell[data-row-id="sd-title"] [data-key="color"]');
        if (titleColor) titleColor.value = state.scheme.title.color;
        $("textColor").value = state.scheme.title.color;
      }
      changed({ restart: id === "speed" });
      if (id === "fontFamily") refreshFonts();
      if (id === "backgroundColor") drawCropPreview();
      if (LIGHT_CONTROLS.has(id)) {
        // Show the light change itself: replay from just before the switch.
        const t = timing();
        playFrom(Math.max(0, t.switchStart - 500) / Math.max(0.01, state.scheme.motion.speed));
      }
      if (id === "holdDuration") pauseAt(cycleDurationMs() - 1);
    });
  });
  $("sequenceRows").addEventListener("input", (event) => {
    const element = event.target.closest(".gm-row-shell");
    const key = event.target.dataset.key;
    if (!element || !key) return;
    const rowId = element.dataset.rowId;
    const group = rowId === "sd-title" ? state.scheme.title : state.scheme.subject;
    const groupName = rowId === "sd-title" ? "title" : "subject";
    state.activeRowId = rowId;
    if (key === "text") {
      if (rowId === "sd-title") group.text = event.target.value;
      else if (group.mode === "text") group.text = event.target.value;
      else group.name = event.target.value;
      rimCache.clear();
    } else if (event.target.type === "checkbox") group[key] = event.target.checked;
    else if (event.target.type === "color") group[key] = normalizeColor(event.target.value, group[key]);
    else if (key === "mode") {
      group.mode = event.target.value === "text" ? "text" : "asset";
      const nameInput = element.querySelector('[data-key="text"]');
      if (nameInput) { nameInput.value = group.mode === "text" ? group.text : (group.name || "主体"); nameInput.placeholder = group.mode === "text" ? "主体文字" : "主体名称"; }
      rimCache.clear(); renderAssetGrid();
    } else group[key] = number(event.target.value, DEFAULT_SCHEME[groupName][key], ...(RANGES[groupName]?.[key] || [0, 1000]));
    if (key === "fontWeight") group.fontWeight = Math.round(group.fontWeight / 100) * 100;
    if (rowId === "sd-title" && key === "color") $("textColor").value = group.color;
    if (key === "size" || key === "text") rimCache.clear();
    refreshRowChrome(); autoSave();
    if (key === "text" || key === "fontWeight") refreshFonts();
    seekToRowStart(rowId, true);
  });
  $("sequenceRows").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    const element = button?.closest(".gm-row-shell");
    if (!button || !element) return;
    const action = button.dataset.action;
    if (action === "pause-row") { seekToRowStart(element.dataset.rowId, true); return; }
    if (action === "preview-row") { seekToRowStart(element.dataset.rowId, false); return; }
    const card = button.closest("[data-asset-id]");
    if (!card) return;
    const id = card.dataset.assetId;
    if (action === "pick-asset") {
      state.scheme.subject.assetId = id;
      state.scheme.subject.mode = "asset";
      const select = element.querySelector('[data-key="mode"]');
      if (select) select.value = "asset";
      const nameInput = element.querySelector('[data-key="text"]');
      if (nameInput) { nameInput.value = state.scheme.subject.name || "主体"; nameInput.placeholder = "主体名称"; }
    }
    if (action === "remove-asset") {
      assets.delete(id);
      if (state.scheme.subject.assetId === id) state.scheme.subject.assetId = "hely";
    }
    rimCache.clear(); renderAssetGrid(); autoSave(); playFrom(0);
  });
  $("addRow").addEventListener("click", () => {
    // Two fixed rows (subject + title); the add button jumps to the title row instead.
    setTimeout(() => document.querySelector('#tcRowList [data-row-id="sd-title"]')?.click(), 0);
  });
  $("backgroundFile").addEventListener("change", async () => {
    const file = $("backgroundFile").files?.[0];
    if (!file) return;
    if (!/^(image|video)\//i.test(file.type || "")) { $("exportStatus").textContent = "请选择图片、GIF 或视频文件。"; $("backgroundFile").value = ""; return; }
    const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    state.scheme.background.media = normalizeBackgroundMedia({ name: file.name, url, fileType: file.type });
    $("backgroundFile").value = "";
    await prepareBackground();
    await refreshMediaUi();
    autoSave(); resizePreview();
    $("exportStatus").textContent = `${file.name} 已设为画面背景，关灯时会一起变暗。`;
  });
  $("backgroundRemove").addEventListener("click", () => { disposeBackground(); state.scheme.background.media = null; refreshMediaUi(); autoSave(); resizePreview(); });
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
    $("backgroundCropZoom").value = "1"; $("backgroundCropOutput").textContent = "1.00×";
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
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => $("backgroundCropPreview").addEventListener(name, () => { cropDrag = null; }));
  function commitTrim() {
    const media = state.scheme.background.media;
    const runtime = backgroundRuntime();
    if (!isVideoMedia(media) || !(runtime?.duration > 0)) return;
    const clip = videoClipBounds({ ...media, videoStart: Number($("backgroundVideoStart").value), videoEnd: Number($("backgroundVideoEnd").value) }, runtime.duration);
    media.videoStart = clip.start; media.videoEnd = clip.end;
    runtime.exportImage = null;
    autoSave(); refreshMediaUi(); resizePreview();
  }
  ["backgroundVideoStart", "backgroundVideoEnd"].forEach((id) => $(id).addEventListener("change", commitTrim));
  function trimPointerSeconds(event) {
    const rect = $("backgroundVideoTimeline").getBoundingClientRect();
    return clamp((event.clientX - rect.left) / Math.max(1, rect.width)) * (backgroundRuntime()?.duration || 0);
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
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => $("backgroundVideoTimeline").addEventListener(name, () => { draggedEdge = ""; }));
  $("backgroundVideoSelection").querySelectorAll("[data-video-edge]").forEach((handle) => handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const current = handle.dataset.videoEdge === "start" ? Number($("backgroundVideoStart").value) : Number($("backgroundVideoEnd").value);
    setTrimBoundary(handle.dataset.videoEdge, current + (event.key === "ArrowLeft" ? -0.1 : 0.1));
    event.preventDefault();
  }));
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
  $("restoreScheme").addEventListener("click", () => { try { localStorage.removeItem(STORAGE_KEY); } catch (_) {} applyScheme(clone(DEFAULT_SCHEME), "已恢复默认方案（苹果关灯原片节奏）。"); });
  $("clearScheme").addEventListener("click", () => {
    const next = clone(state.scheme);
    next.light = clone(DEFAULT_SCHEME.light);
    next.motion = { ...clone(DEFAULT_SCHEME.motion), speed: state.scheme.motion.speed };
    applyScheme(next, "灯光与节奏已恢复为原片；主体、标题、背景和画布保持不变。");
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
  async function exportFrame(output, seconds) {
    await prepareBackgroundFrame(compositionTime(seconds * 1000) / 1000);
    renderFrame(output, seconds, output.width, output.height, false);
  }
  async function exportReady() { await refreshFonts(); await prepareBackground(); }
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
  $("exportPng").addEventListener("click", async () => {
    await exportReady();
    const output = exportCanvas();
    await exportFrame(output, state.elapsedMs / 1000);
    output.toBlob((blob) => { if (!blob) return; download(blob, `${SLUG}-${output.width}x${output.height}.png`); $("exportStatus").textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png");
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
        await exportFrame(output, index / fps);
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
      await exportReady();
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
        await exportFrame(output, index / fps);
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
    if (state.playing && !state.exportBusy) {
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
    if (panel) document.querySelectorAll("[data-sd-global-card]").forEach((card) => panel.append(card));
    const heading = document.querySelector(".tc-content .tc-panel-heading h2");
    const count = $("tcRowCount");
    if (heading && count) heading.replaceChildren(document.createTextNode("画面内容 "), count);
    const hint = document.querySelector(".tc-content .tc-hint");
    if (hint) hint.textContent = "选择主体或标题，在右侧修改；灯光与节奏在「动效设置」";
    const add = $("addRow");
    if (add) add.hidden = true;
    const title = $("tcSelectedTitle");
    if (title) {
      const relabel = () => {
        const next = title.textContent.replace(/^段落 01$/, "主体").replace(/^段落 02$/, "标题");
        if (next !== title.textContent) title.textContent = next;
      };
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
    applyScheme(useDefault || Number(stored?.version) !== VERSION ? clone(DEFAULT_SCHEME) : stored);
    if (state.reducedMotion) pauseAt(timing().finish / state.scheme.motion.speed + 1);
    new ResizeObserver(resizePreview).observe(frame);
    window.addEventListener("resize", resizePreview, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", moveGlobalCards, { once: true }); else moveGlobalCards();
    document.fonts?.ready?.then(refreshFonts);
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
    window.__switchdropTest = { renderFrame, timing, lightAt, lightTau, getScheme: () => clone(state.scheme), cycleDurationMs, setTime, compositionTime };
    if (window.parent !== window) window.parent.postMessage({ type: "cellmotion:ready", effectId: SLUG, bridgeVersion: "1.0.0", durationMs: cycleDurationMs() }, "*");
    requestAnimationFrame(animationLoop);
  }

  initialize();
})();
