(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const previewCanvas = $("#previewCanvas");
  const designFrame = $("#designFrame");
  const textStudioDialog = $("#textStudioDialog");
  const textStudioCanvas = $("#textStudioCanvas");
  const textStudioFrame = $("#textStudioFrame");
  const previewContext = previewCanvas.getContext("2d", { alpha: false, desynchronized: true });
  const compositionCanvas = document.createElement("canvas");
  const compositionContext = compositionCanvas.getContext("2d");
  const backdropCanvas = document.createElement("canvas");
  const backdropContext = backdropCanvas.getContext("2d");
  const compositionExtensionCanvas = document.createElement("canvas");
  const compositionExtensionContext = compositionExtensionCanvas.getContext("2d");
  const bootCanvas = document.createElement("canvas");
  const bootContext = bootCanvas.getContext("2d");
  const textStudioSceneCanvas = document.createElement("canvas");
  const textStudioSceneContext = textStudioSceneCanvas.getContext("2d");
  let textStudioSceneKey = "";
  const fontLibrary = window.STGFontLibrary;
  const iconLibrary = window.STGIconLibrary;
  const STORAGE_KEY = "me-motion-split-flip-v6";
  const PROJECT_FORMAT = "opc8838-hub/font-animation:split-flip";
  const PROJECT_FORMAT_VERSION = 1;
  const DEFAULT_PROJECT_URL = "assets/presets/split-flip-default.json?v=20260907-1";
  let approvedDefaultState = null;
  const makeText = (content, overrides = {}) => ({
    id: uid("text"), content, font: "stg:noto-sc-black", size: 12, color: "#ffffff",
    x: 50, y: 50, weight: 900, align: "center", rotation: 0,
    enterAt: .55, enterDuration: .22, exitAt: 2.65, interval: .333, offset: 0, strength: 100, ...overrides
  });
  const makeHalf = (color, text, overrides = {}) => ({
    color, media: null, fit: "cover", mediaScale: 100, mediaX: 0, mediaY: 0, mediaOpacity: 100, mediaTint: "#000000", mediaTintStrength: 0, transition: "direct", transitionDuration: .25, textX: 50, textY: 50, textGap: 2, texts: [makeText(text)], ...overrides
  });
  const defaultState = () => ({
    version: 14,
    canvas: { width: 1080, height: 1080, preset: "1080x1080" },
    motion: { direction: "right", anglePreset: "180", customAngle: 270, wipeMax: 50, overlayEnabled: true, overlayStart: 1.2, overlayFadeDuration: .45, sweepEnabled: false, sweepDirection: "top-down", sweepEasing: "eased", bootTheme: "black", durationMode: "timeline", timelineDuration: 6, speed: 1, introHold: 1.8, flipDuration: 3.2, sweepDuration: 2.4, sweepUpDuration: 1.2, sweepDownDuration: 1.2, sweepStart: 1.2, endHold: .45, easing: "easeInOut" },
    textMotion: { direction: "ltr", startAt: 3.1, impactScale: 420, impactDuration: .1, settleDuration: .35, appendInterval: .333, appendDuration: .2, finalHold: .4, blurStrength: 115, ghostCount: 18, ghostForce: 140, masterSpeed: 1, settleScale: 100, appendSqueeze: 0, appendTravel: 200, breathAmount: 1.5, tailBlur: 22 },
    halves: {
      top: makeHalf("#1479ff", "", { texts: [] }),
      bottom: makeHalf("#d7ff2f", "", { textY: 30, texts: [] })
    },
    assets: []
  });

  let state = defaultState();
  let playing = true;
  let playheadSeconds = 0;
  let textStudioPlaying = true;
  let textStudioSeconds = 0;
  let lastFrame = performance.now();
  let lastTimelineUiFrame = 0;
  let lastActiveTimelinePhase = "";
  let lastRenderedVideoFrame = -1;
  let selectedCandidate = null;
  let activeAssetId = null;
  let exporting = false;
  let textPreviewOnly = false;
  let activeTextId = "";
  let persistTimer = 0;
  const runtimes = new Map();
  const textMeasureCache = new WeakMap();

  function phaseDuration() {
    const motion = state.motion;
    const effectiveSweepStart = Math.max(motion.overlayStart, motion.sweepStart);
    const sweepEnd = motion.overlayEnabled && motion.sweepEnabled ? effectiveSweepStart + motion.sweepUpDuration + motion.sweepDownDuration : 0;
    const overlayEnd = motion.overlayEnabled ? motion.overlayStart + motion.overlayFadeDuration : 0;
    return motion.introHold + Math.max(motion.flipDuration, overlayEnd, sweepEnd) + motion.endHold;
  }

  function trimmedVideoDuration() {
    return Math.max(0, ...["top", "bottom"].map((halfName) => {
      const media = state.halves[halfName].media;
      if (!media?.type?.startsWith("video/")) return 0;
      const runtime = runtimes.get(mediaKey(halfName, media));
      const end = Number(media.end) || runtime?.duration || 0;
      return Math.max(0, end - (Number(media.start) || 0));
    }));
  }

  function totalDuration() {
    const videoDuration = trimmedVideoDuration();
    if (state.motion.durationMode === "video" && videoDuration > 0) return videoDuration;
    return clamp(state.motion.timelineDuration, .1, 300);
  }

  function ease(progress) {
    const p = clamp(progress, 0, 1);
    if (state.motion.easing === "linear") return p;
    if (state.motion.easing === "easeOut") return 1 - (1 - p) ** 3;
    if (state.motion.easing === "spring") return p === 1 ? 1 : 1 - Math.cos(p * Math.PI * 4.5) * Math.exp(-p * 6);
    return p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  }

  function timelineAt(realSeconds) {
    const effectiveSweepStart = Math.max(state.motion.overlayStart, state.motion.sweepStart);
    const cycleDuration = Math.max(.01, totalDuration());
    const safeSeconds = Math.max(0, realSeconds);
    const localReal = safeSeconds % cycleDuration;
    const local = localReal * state.motion.speed;
    const flipStart = state.motion.introHold;
    const flipEnd = flipStart + state.motion.flipDuration;
    const overlayStart = flipStart + state.motion.overlayStart;
    const sweepStart = flipStart + effectiveSweepStart;
    const upwardDuration = Math.max(.05, state.motion.sweepUpDuration);
    const downwardDuration = Math.max(.05, state.motion.sweepDownDuration);
    const firstSweepDuration = state.motion.sweepDirection === "bottom-up" ? upwardDuration : downwardDuration;
    const secondSweepDuration = state.motion.sweepDirection === "bottom-up" ? downwardDuration : upwardDuration;
    const sweepEnd = sweepStart + firstSweepDuration + secondSweepDuration;
    const raw = local <= flipStart ? 0 : local >= flipEnd ? 1 : (local - flipStart) / Math.max(.01, state.motion.flipDuration);
    const sweepElapsed = clamp(local - sweepStart, 0, firstSweepDuration + secondSweepDuration);
    const sweepRaw = !state.motion.sweepEnabled || local <= sweepStart ? 0 : local >= sweepEnd ? 1 : sweepElapsed <= firstSweepDuration
      ? .5 * sweepElapsed / firstSweepDuration
      : .5 + .5 * (sweepElapsed - firstSweepDuration) / secondSweepDuration;
    const angle = state.motion.anglePreset === "custom" ? state.motion.customAngle : Number(state.motion.anglePreset);
    const returnProgress = clamp((sweepRaw - .5) / .5, 0, 1);
    const sweepCurveRaw = state.motion.sweepDirection === "bottom-up" && sweepRaw > .5 && state.motion.sweepEasing !== "linear"
      ? .5 + returnProgress ** 1.6 * .5
      : sweepRaw;
    const sweepProgress = state.motion.sweepEasing === "linear" ? sweepCurveRaw : ease(sweepCurveRaw);
    const sweepWave = state.motion.sweepEasing === "linear" ? Math.abs(1 - sweepProgress * 2) : .5 + .5 * Math.cos(sweepProgress * Math.PI * 2);
    const sweepAmount = state.motion.sweepDirection === "bottom-up" ? 1 - sweepWave : sweepWave;
    const activeWipe = state.motion.sweepEnabled ? state.motion.wipeMax / 100 * sweepAmount : state.motion.wipeMax / 100;
    const overlayRaw = !state.motion.overlayEnabled ? 0 : clamp((local - overlayStart) / Math.max(.01, state.motion.overlayFadeDuration), 0, 1);
    const overlayAlpha = 1 - (1 - overlayRaw) ** 3;
    const wipe = !state.motion.overlayEnabled || local < overlayStart ? 0 : activeWipe;
    return { local, raw, progress: ease(raw), angle: angle * (state.motion.direction === "left" ? -1 : 1), accumulatedProgress: ease(raw), wipe, overlayAlpha, fade: 1, flipStart, flipEnd, overlayStart, sweepStart, sweepEnd, cycleDuration, cycleProgress: localReal / cycleDuration };
  }

  function textStartTimes(layers = state.halves.bottom.texts) {
    const overlayStart = state.motion.introHold + state.motion.overlayStart;
    const firstStart = Math.max(overlayStart, Number(state.textMotion.startAt) || overlayStart);
    return layers.reduce((times, layer, index) => {
      times.push(index === 0 ? firstStart : times[index - 1] + Math.max(.01, Number(layer.interval) || state.textMotion.appendInterval));
      return times;
    }, []);
  }

  function clipOverlay(context, width, height, wipe) {
    const clipHeight = height * wipe;
    context.rect(0, height - clipHeight, width, clipHeight);
  }

  function mediaKey(owner, media) { return media ? `${owner}:${media.url.slice(0, 80)}` : ""; }

  function prepareMedia(owner, media) {
    if (!media?.url) return null;
    const key = mediaKey(owner, media);
    if (runtimes.has(key)) return runtimes.get(key);
    const runtime = { ready: false, image: null, video: null, exportVideo: null, exportImage: null, frames: null, duration: 0, filmstrip: null, filmstripPromise: null, promise: null, exportPromise: null, sourcePromise: null, loadVideo: null, previewFrameVersion: 0 };
    runtimes.set(key, runtime);
    if (media.type.startsWith("video/")) {
      runtime.sourcePromise = media.previewUrl ? Promise.resolve(media.previewUrl) : media.url.startsWith("data:")
        ? fetch(media.url).then((response) => response.blob()).then((blob) => URL.createObjectURL(blob)).catch(() => media.url)
        : Promise.resolve(media.url);
      const loadVideo = (key) => runtime.sourcePromise.then((sourceUrl) => new Promise((resolve) => {
        const video = document.createElement("video");
        video.muted = true; video.loop = key === "video"; video.playsInline = true; video.preload = "auto";
        video.addEventListener("loadeddata", () => { runtime[key] = video; runtime.ready = true; runtime.duration = Number(video.duration) || runtime.duration; media.end = clamp(media.end || runtime.duration, .01, runtime.duration || 1); if (key === "video") { if (typeof video.requestVideoFrameCallback === "function") { const observeFrame = () => { runtime.previewFrameVersion += 1; video.requestVideoFrameCallback(observeFrame); }; video.requestVideoFrameCallback(observeFrame); } syncHalfEditor(owner); updateMotionOutputs(); renderTimeline(); if (playing) video.play().catch(() => {}); } resolve(runtime); }, { once: true });
        video.addEventListener("error", () => resolve(runtime), { once: true });
        video.src = sourceUrl; video.load();
      }));
      runtime.loadVideo = loadVideo;
      runtime.promise = loadVideo("video");
    } else {
      const image = new Image();
      image.onload = () => { runtime.ready = true; };
      image.src = media.url;
      runtime.image = image;
      runtime.promise = new Promise((resolve) => { image.addEventListener("load", () => resolve(runtime), { once: true }); image.addEventListener("error", () => resolve(runtime), { once: true }); });
      if (/gif/i.test(media.type || media.url) && window.CellMotionAnimatedImage) decodeAnimatedImage(media.url, media.type, runtime);
    }
    return runtime;
  }

  async function decodeAnimatedImage(url, type, runtime) {
    try {
      const animated = await window.CellMotionAnimatedImage.decode({ url, type });
      runtime.frames = animated.frames.map((frame) => ({ image: frame.image, start: frame.startMs / 1000, duration: frame.durationMs / 1000 }));
      runtime.duration = animated.totalMs / 1000;
    } catch (_) {}
  }

  async function prepareVideoFilmstrip(owner, runtime) {
    if (!runtime?.video || runtime.filmstripPromise) return runtime?.filmstripPromise;
    runtime.filmstripPromise = (async () => {
      const video = runtime.exportVideo || runtime.video;
      if (!video || !(runtime.duration > 0)) return null;
      const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 96;
      const context = canvas.getContext("2d"); const frameCount = 8; const frameWidth = canvas.width / frameCount;
      for (let index = 0; index < frameCount; index += 1) {
        await seekVideo(video, (index + .5) / frameCount * Math.max(.01, runtime.duration - .01));
        context.save(); context.beginPath(); context.rect(index * frameWidth, 0, frameWidth, canvas.height); context.clip();
        drawCover(context, video, index * frameWidth, 0, frameWidth, canvas.height, "cover"); context.restore();
      }
      runtime.filmstrip = canvas;
      const target = $(`.half-section[data-half="${owner}"] .video-filmstrip`);
      if (target) target.getContext("2d").drawImage(canvas, 0, 0, target.width, target.height);
      return canvas;
    })().catch(() => null);
    return runtime.filmstripPromise;
  }

  function seekVideo(video, time) {
    return new Promise((resolve) => {
      if (!video || Math.abs(video.currentTime - time) <= 1 / 240) { resolve(); return; }
      let settled = false;
      const done = () => { if (settled) return; settled = true; if (typeof video.requestVideoFrameCallback === "function") { const fallback = setTimeout(resolve, 180); video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve(); }); } else requestAnimationFrame(resolve); };
      video.addEventListener("seeked", done, { once: true }); video.currentTime = time; setTimeout(done, 900);
    });
  }

  function syncVideos(seconds) {
    for (const halfName of ["top", "bottom"]) {
      const media = state.halves[halfName].media;
      if (!media?.type.startsWith("video/")) continue;
      const runtime = prepareMedia(halfName, media);
      const video = runtime?.video;
      if (!video || !runtime.ready) continue;
      const start = clamp(media.start, 0, runtime.duration);
      const end = clamp(media.end || runtime.duration, start + .01, runtime.duration);
      const desired = start + (seconds % Math.max(.01, end - start));
      const playbackRate = 1;
      if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
      const drift = Math.abs(video.currentTime - desired);
      const crossedLoop = video.currentTime < start || video.currentTime >= end;
      if (!playing && drift > 1 / 60) video.currentTime = desired;
      else if (playing && crossedLoop) video.currentTime = start;
      if (playing && video.paused) video.play().catch(() => {});
      if (!playing && !video.paused) video.pause();
    }
  }

  function primaryVideoFrameVersion() {
    for (const halfName of ["top", "bottom"]) {
      const media = state.halves[halfName].media;
      if (!media?.type?.startsWith("video/")) continue;
      const runtime = runtimes.get(mediaKey(halfName, media));
      if (runtime?.ready) return runtime.previewFrameVersion;
    }
    return -1;
  }

  function drawCover(context, source, x, y, width, height, fit = "cover") {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) return;
    const scale = fit === "contain" ? Math.min(width / sw, height / sh) : Math.max(width / sw, height / sh);
    const dw = sw * scale, dh = sh * scale;
    context.drawImage(source, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  }

  function animatedFrameAt(runtime, seconds) {
    if (!runtime?.frames?.length || !(runtime.duration > 0)) return null;
    const local = ((seconds % runtime.duration) + runtime.duration) % runtime.duration;
    return (runtime.frames.find((frame) => local >= frame.start && local < frame.start + frame.duration) || runtime.frames.at(-1)).image;
  }

  function drawHalfBackground(context, halfName, half, x, y, width, height, seconds) {
    context.fillStyle = half.color;
    context.fillRect(x, y, width, height);
    const runtime = prepareMedia(halfName, half.media);
    const source = animatedFrameAt(runtime, seconds) || (exporting ? runtime?.exportImage : runtime?.video) || runtime?.image;
    if (runtime?.ready && source) {
      const transitionAlpha = half.transition === "crossfade" ? clamp(seconds / Math.max(.01, half.transitionDuration), 0, 1) : 1;
      const sw = source.videoWidth || source.naturalWidth || source.width;
      const sh = source.videoHeight || source.naturalHeight || source.height;
      const baseScale = half.fit === "contain" ? Math.min(width / sw, height / sh) : Math.max(width / sw, height / sh);
      const scale = baseScale * half.mediaScale / 100;
      const drawWidth = sw * scale;
      const drawHeight = sh * scale;
      const drawX = x + (width - drawWidth) / 2 + width * half.mediaX / 100;
      const drawY = y + (height - drawHeight) / 2 + height * half.mediaY / 100;
      context.save(); context.beginPath(); context.rect(x, y, width, height); context.clip(); context.globalAlpha = transitionAlpha * half.mediaOpacity / 100; context.drawImage(source, drawX, drawY, drawWidth, drawHeight); context.restore();
      if (half.mediaTintStrength > 0) { context.save(); context.globalAlpha = transitionAlpha * half.mediaTintStrength / 100; context.fillStyle = half.mediaTint; context.fillRect(x, y, width, height); context.restore(); }
    }
  }

  function fontSpec(layer, height) {
    const preset = fontLibrary.preset(layer.font) || fontLibrary.preset("stg:noto-sc-black");
    const size = Math.max(10, height * layer.size / 100);
    return { css: `${preset.style || "normal"} ${layer.weight || preset.weight || 700} ${size}px ${fontLibrary.family(layer.font)}`, size };
  }

  const lerp = (from, to, amount) => from + (to - from) * amount;
  const smooth = (value) => { const p = clamp(value, 0, 1); return p * p * (3 - 2 * p); };
  const easeOut = (value) => 1 - (1 - clamp(value, 0, 1)) ** 4;
  const easeOutCubic = (value) => 1 - (1 - clamp(value, 0, 1)) ** 3;
  const impactCollapseAt = (progress) => smooth((progress - .28) / .68);
  const incomingRawProgress = (progress) => clamp((progress - .12) / .88, 0, 1);
  const inertialProgress = (value) => {
    const p = clamp(value, 0, 1);
    if (p < .68) return .96 * (1 - (1 - p / .68) ** 3);
    return .96 + .04 * (1 - (1 - (p - .68) / .32) ** 2);
  };
  const inertialVelocity = (value) => {
    const p = clamp(value, 0, 1);
    return smooth(p / .08) * (1 - p) ** 1.6;
  };

  function drawTextGroupRow(context, half, width, height, timeline) {
    const layers = half.texts;
    if (!layers.length) return;
    const items = layers.map((layer) => {
      const font = fontSpec(layer, height);
      const measureKey = `${font.css}|${layer.content || ""}|${width}`;
      let measured = textMeasureCache.get(layer);
      if (!measured || measured.key !== measureKey) {
        context.save(); context.font = font.css;
        measured = { key: measureKey, width: Math.min(width * .7, context.measureText(layer.content || "").width) };
        context.restore();
        textMeasureCache.set(layer, measured);
      }
      return { layer, font, naturalWidth: measured.width };
    });
    const time = timeline.local;
    const motion = state.textMotion;
    const textSpeed = Math.max(.4, motion.masterSpeed);
    const starts = textStartTimes(layers);
    const startAt = (_item, index) => starts[index];
    let count = 0;
    let activeIndex = -1;
    let rawProgress = 1;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemStart = startAt(item, index);
      if (time < itemStart) continue;
      count = index + 1;
      const duration = index === 0
        ? (motion.impactDuration + motion.settleDuration) / textSpeed
        : Math.max(.05, item.layer.enterDuration) / Math.max(.35, item.layer.strength / 100) / textSpeed;
      if (time < itemStart + duration) {
        activeIndex = index;
        rawProgress = clamp((time - itemStart) / duration, 0, 1);
      }
    }
    if (!count) return;

    const gap = width * half.textGap / 100;
    const direction = motion.direction === "rtl" ? -1 : 1;
    const currentItems = items.slice(0, count).map((item, sequenceIndex) => ({ ...item, sequenceIndex }));
    const visualItems = direction < 0 ? [...currentItems].reverse() : currentItems;
    const measureRow = (rowItems) => rowItems.reduce((sum, item) => sum + item.naturalWidth, 0) + gap * Math.max(0, rowItems.length - 1);
    const occupiedWidth = measureRow(currentItems);
    const previousWidth = activeIndex > 0 ? measureRow(items.slice(0, activeIndex)) : occupiedWidth;
    const rowCenter = width * half.textX / 100;
    const rowY = height * half.textY / 100;
    const progress = activeIndex > 0 ? inertialProgress(rawProgress) : 1;
    const appendShift = activeIndex > 0 ? Math.max(0, (occupiedWidth - previousWidth) / 2) : 0;
    const first = items[0];
    const firstDuration = (motion.impactDuration + motion.settleDuration) / textSpeed;
    const firstElapsed = time - startAt(first, 0);
    const impactDuration = Math.max(.001, motion.impactDuration / textSpeed);
    const settledScale = motion.settleScale / 100;
    let scale = settledScale;
    if (firstElapsed >= 0 && firstElapsed < impactDuration) {
      const p = clamp(firstElapsed / impactDuration, 0, 1);
      scale = lerp(lerp(2.15, motion.impactScale / 100, easeOut(p / .2)), settledScale * .92, impactCollapseAt(p));
    } else if (firstElapsed < firstDuration) {
      scale = lerp(settledScale * .92, settledScale, easeOutCubic((firstElapsed - impactDuration) / Math.max(.001, firstDuration - impactDuration)));
    }
    const settledAt = Math.max(...currentItems.map((item, index) => startAt(item, index) + (index === 0 ? motion.impactDuration + motion.settleDuration : Math.max(.05, item.layer.enterDuration) / Math.max(.35, item.layer.strength / 100)) / textSpeed));
    const finalEnd = settledAt + motion.finalHold / textSpeed;
    if (time >= settledAt && time < finalEnd) scale *= 1 + Math.sin((time - settledAt) * Math.PI * 1.15 * textSpeed) * motion.breathAmount / 100;
    const impactProgress = clamp(firstElapsed / impactDuration, 0, 1);
    const impactReveal = firstElapsed >= 0 && firstElapsed < impactDuration ? easeOut((impactProgress - .16) / .12) : firstElapsed >= impactDuration ? 1 : 0;
    const impact = firstElapsed >= 0 && firstElapsed < impactDuration ? impactReveal * (1 - impactCollapseAt(impactProgress)) : 0;
    const fit = Math.min(1, width * lerp(.9, .72, impact) / Math.max(1, occupiedWidth * scale));
    scale *= fit;

    const drawLayer = (sampleTime, alpha, offsetX, blurPx, scaleXExtra) => {
      let sampleActiveIndex = activeIndex;
      let sampleRaw = rawProgress;
      if (activeIndex > 0) {
        const active = items[activeIndex].layer;
        const activeStart = startAt(items[activeIndex], activeIndex);
        sampleRaw = clamp((sampleTime - activeStart) / (Math.max(.05, active.enterDuration) / Math.max(.35, active.strength / 100) / textSpeed), 0, 1);
        sampleActiveIndex = sampleTime >= activeStart ? activeIndex : -1;
      }
      const sampleProgress = sampleActiveIndex > 0 ? inertialProgress(sampleRaw) : progress;
      context.save();
      context.globalAlpha *= alpha;
      context.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";
      context.translate(rowCenter + offsetX, rowY);
      const squeeze = 1 - motion.appendSqueeze / 100 * (activeIndex > 0 ? Math.sin(Math.PI * sampleProgress) : 0);
      context.scale(scale * squeeze * scaleXExtra, scale);
      context.translate(-rowCenter, -rowY);
      let cursor = rowCenter - occupiedWidth / 2;
      visualItems.forEach((item) => {
        const index = item.sequenceIndex;
        let followOffset = index < activeIndex ? direction * appendShift * (1 - sampleProgress) : 0;
        let travel = 0;
        let alphaIn = 1;
        if (index === activeIndex) {
          const incomingRaw = incomingRawProgress(sampleRaw);
          const follow = inertialProgress(incomingRaw);
          alphaIn = smooth(incomingRaw / .55);
          followOffset = direction * appendShift * (1 - follow);
          travel = direction * motion.appendTravel / 100 * item.font.size * (1 - follow);
        }
        const visible = sampleTime < item.layer.exitAt ? 1 : 0;
        const itemX = cursor + followOffset + travel + item.naturalWidth / 2;
        context.save();
        context.globalAlpha *= alphaIn * visible;
        context.font = item.font.css;
        context.fillStyle = item.layer.color;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.translate(itemX, rowY);
        context.rotate(item.layer.rotation * Math.PI / 180);
        context.fillText(item.layer.content || "", 0, 0, width * .7);
        context.restore();
        cursor += item.naturalWidth + gap;
      });
      context.restore();
    };

    const strength = motion.blurStrength / 100 * Math.max(.35, first.layer.strength / 100);
    if (impact > .01) {
      const distance = Math.min(width, height) * .29 * impact * strength;
      drawLayer(time, .3 * impact, 0, 0, 1 + .38 * impact);
      for (let index = 4; index >= 1; index -= 1) {
        const amount = index / 4;
        const alpha = .09 * (1 - amount * .28) * impact;
        drawLayer(time, alpha, distance * amount, 0, 1 + .56 * amount * impact);
        drawLayer(time, alpha, -distance * amount, 0, 1 + .56 * amount * impact);
      }
    }
    const append = activeIndex > 0 ? inertialVelocity(rawProgress) : 0;
    if (append > .01) {
      const distance = Math.min(width, height) * .32 * append * strength;
      const blurUnit = Math.min(width, height) / 304;
      const ghostForce = motion.ghostForce / 100;
      const immediateCount = Math.max(1, Math.ceil(motion.ghostCount * .55));
      const temporalCount = Math.max(1, Math.round(motion.ghostCount) - immediateCount);
      drawLayer(time, clamp(.58 * append * ghostForce, 0, 1), direction * distance * .34, 3.4 * blurUnit, 1 + .18 * append);
      for (let index = immediateCount; index >= 1; index -= 1) {
        const amount = index / immediateCount;
        drawLayer(time, clamp(.14 * (1 - amount * .38) * append * ghostForce, 0, 1), direction * distance * amount, 0, 1 + .16 * amount * append);
      }
      const activeDuration = Math.max(.05, items[activeIndex].layer.enterDuration) / Math.max(.35, items[activeIndex].layer.strength / 100) / textSpeed;
      for (let index = temporalCount; index >= 1; index -= 1) {
        const amount = index / temporalCount;
        const sampledTime = Math.max(startAt(items[activeIndex], activeIndex), time - activeDuration * .58 * amount);
        drawLayer(sampledTime, clamp(.12 * (1 - amount * .34) * append * ghostForce, 0, 1), direction * distance * amount * .86, 0, 1 + .13 * amount * append);
      }
    }
    const tailDuration = .15 / textSpeed;
    const tailElapsed = time - finalEnd;
    const tail = tailElapsed >= 0 && tailElapsed < tailDuration ? clamp(tailElapsed / Math.max(.001, tailDuration), 0, 1) * motion.tailBlur / 100 : 0;
    if (tail > .01 && strength > 0) {
      const distance = Math.min(width, height) * .08 * tail * strength;
      for (let index = 5; index >= 1; index -= 1) {
        const amount = index / 5;
        const alpha = .045 * (1 - amount * .4) * tail;
        drawLayer(time, alpha, distance * amount, 0, 1 + .08 * tail);
        drawLayer(time, alpha, -distance * amount, 0, 1 + .08 * tail);
      }
    }
    drawLayer(time, activeIndex === 0 ? impactReveal : 1, 0, 0, 1);
    if (impact > .01) {
      context.save();
      context.globalAlpha *= .76 * impact;
      context.font = first.font.css;
      context.fillStyle = first.layer.color;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.translate(rowCenter, rowY);
      context.scale(scale * 1.04, scale);
      context.rotate(first.layer.rotation * Math.PI / 180);
      context.fillText(first.layer.content || "", 0, 0, width * .7);
      context.restore();
    }
  }

  function prepareAsset(asset) {
    if (asset.kind === "vector") return null;
    const key = `asset:${asset.id}`;
    if (runtimes.has(key)) return runtimes.get(key);
    const runtime = { ready: false, image: new Image(), frames: null, duration: 0, promise: null };
    runtime.image.onload = () => { runtime.ready = true; };
    runtime.image.src = asset.url;
    runtimes.set(key, runtime);
    runtime.promise = new Promise((resolve) => { runtime.image.addEventListener("load", () => resolve(runtime), { once: true }); runtime.image.addEventListener("error", () => resolve(runtime), { once: true }); });
    if (/gif/i.test(asset.type || asset.url) && window.CellMotionAnimatedImage) decodeAnimatedImage(asset.url, asset.type, runtime);
    return runtime;
  }

  function drawAsset(context, asset, x, y, width, height, seconds) {
    const size = Math.min(width, height) * asset.size / 100;
    const px = x + width * asset.x / 100;
    const py = y + height * asset.y / 100;
    context.save();
    context.globalAlpha = asset.opacity / 100;
    context.translate(px, py);
    context.rotate(asset.rotation * Math.PI / 180);
    if (asset.kind === "vector") iconLibrary.drawVector(context, asset, size, seconds);
    else {
      const runtime = prepareAsset(asset);
      const source = animatedFrameAt(runtime, seconds) || runtime?.image;
      if (runtime?.ready && source) drawCover(context, source, -size / 2, -size / 2, size, size, "contain");
    }
    context.restore();
  }

  function drawTvPowerOn(context, sourceCanvas, width, height, progress) {
    const q = clamp(progress, 0, 1);
    if (q >= 1) return;
    if (bootCanvas.width !== sourceCanvas.width) bootCanvas.width = sourceCanvas.width;
    if (bootCanvas.height !== sourceCanvas.height) bootCanvas.height = sourceCanvas.height;
    bootContext.setTransform(1, 0, 0, 1, 0, 0);
    bootContext.clearRect(0, 0, bootCanvas.width, bootCanvas.height);
    bootContext.drawImage(sourceCanvas, 0, 0);

    const shutdownProgress = 1 - q;
    const verticalEnd = .64;
    const vertical = clamp(shutdownProgress / verticalEnd, 0, 1);
    const horizontal = clamp((shutdownProgress - verticalEnd) / (1 - verticalEnd), 0, 1);
    const verticalEase = vertical < .5 ? 4 * vertical ** 3 : 1 - (-2 * vertical + 2) ** 3 / 2;
    const horizontalEase = 1 - (1 - horizontal) ** 3;
    const widthScale = shutdownProgress < verticalEnd ? 1 + (.96 - 1) * verticalEase : .96 * (1 - horizontalEase);
    const heightScale = shutdownProgress < verticalEnd ? 1 + (.009 - 1) * verticalEase : .009 + (.003 - .009) * horizontalEase;
    const drawWidth = Math.max(2, width * widthScale);
    const drawHeight = Math.max(1.5, height * heightScale);
    const centerX = width / 2;
    const centerY = height / 2;
    const background = state.motion.bootTheme === "white" ? "#ffffff" : "#000000";
    const line = state.motion.bootTheme === "white" ? "#000000" : "#ffffff";

    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.save();
    context.globalAlpha = shutdownProgress < verticalEnd ? 1 : 1 - horizontalEase * .72;
    context.drawImage(bootCanvas, 0, 0, bootCanvas.width, bootCanvas.height, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
    context.restore();

    const glowAlpha = shutdownProgress < verticalEnd ? verticalEase * .82 : (1 - horizontalEase) * .92;
    if (glowAlpha > .001) {
      context.save();
      context.globalCompositeOperation = state.motion.bootTheme === "white" ? "multiply" : "screen";
      context.globalAlpha = glowAlpha * .22;
      context.fillStyle = line;
      const lineHeight = Math.max(1.5, Math.min(height * .004, drawHeight * .12));
      context.fillRect(centerX - drawWidth / 2, centerY - lineHeight / 2, drawWidth, lineHeight);
      context.restore();
    }
  }

  function drawMirroredExtension(context, source, width, height, extent, extensionCanvas, extensionContext) {
    const extensionScale = Math.min(1, 512 / Math.max(width, height));
    const sourceWidth = Math.max(1, Math.round(width * extensionScale));
    const sourceHeight = Math.max(1, Math.round(height * extensionScale));
    const tileWidth = sourceWidth * 2;
    const tileHeight = sourceHeight * 2;
    if (extensionCanvas.width !== tileWidth) extensionCanvas.width = tileWidth;
    if (extensionCanvas.height !== tileHeight) extensionCanvas.height = tileHeight;
    extensionContext.imageSmoothingEnabled = true;
    extensionContext.imageSmoothingQuality = exporting ? "high" : "medium";
    extensionContext.setTransform(1, 0, 0, 1, 0, 0);
    extensionContext.drawImage(source, 0, 0, sourceWidth, sourceHeight);
    extensionContext.setTransform(-1, 0, 0, 1, tileWidth, 0);
    extensionContext.drawImage(source, 0, 0, sourceWidth, sourceHeight);
    extensionContext.setTransform(1, 0, 0, -1, 0, tileHeight);
    extensionContext.drawImage(source, 0, 0, sourceWidth, sourceHeight);
    extensionContext.setTransform(-1, 0, 0, -1, tileWidth, tileHeight);
    extensionContext.drawImage(source, 0, 0, sourceWidth, sourceHeight);
    extensionContext.setTransform(1, 0, 0, 1, 0, 0);
    context.save();
    context.translate(-width / 2, -height / 2);
    context.scale(1 / extensionScale, 1 / extensionScale);
    context.fillStyle = context.createPattern(extensionCanvas, "repeat");
    context.fillRect((-extent + width / 2) * extensionScale, (-extent + height / 2) * extensionScale, extent * 2 * extensionScale, extent * 2 * extensionScale);
    context.restore();
    context.drawImage(source, -width / 2, -height / 2);
  }

  function drawSolidExtension(context, source, width, height, extent, color) {
    context.fillStyle = color;
    context.fillRect(-extent, -extent, extent * 2, extent * 2);
    context.drawImage(source, -width / 2, -height / 2);
  }

  function textOnlyTimeline(baseTimeline, seconds) {
    const layers = state.halves.bottom.texts;
    if (!layers.length) return baseTimeline;
    const speed = Math.max(.4, state.textMotion.masterSpeed);
    const starts = textStartTimes(layers);
    const start = starts[0];
    const settled = Math.max(...layers.map((layer, index) => starts[index] + (index === 0 ? state.textMotion.impactDuration + state.textMotion.settleDuration : Math.max(.05, layer.enterDuration) / Math.max(.35, layer.strength / 100)) / speed));
    const end = settled + (state.textMotion.finalHold + .15) / speed;
    return { ...baseTimeline, local: start + (Math.max(0, seconds) % Math.max(.5, end - start)) };
  }

  function renderTextOnlyFrame(canvas, seconds, width, height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    const overlayWipe = state.motion.wipeMax / 100;
    const halfSceneKey = (halfName) => {
      const half = state.halves[halfName];
      const runtime = prepareMedia(halfName, half.media);
      return [half.color, half.fit, half.mediaScale, half.mediaX, half.mediaY, half.mediaOpacity, half.mediaTint, half.mediaTintStrength, half.media?.name || "", half.media?.url?.length || 0, runtime?.ready || false, runtime?.previewFrameVersion || 0];
    };
    const assetSceneKeys = state.assets.map((asset) => { const runtime = prepareAsset(asset); return [asset.id, asset.half, asset.x, asset.y, asset.size, asset.opacity, asset.rotation, runtime?.ready || false].join(":"); });
    const sceneKey = [width, height, Math.round(playheadSeconds * 30), state.motion.wipeMax, state.motion.sweepDirection, ...halfSceneKey("top"), ...halfSceneKey("bottom"), ...assetSceneKeys].join("|");
    if (sceneKey !== textStudioSceneKey) {
      textStudioSceneKey = sceneKey;
      textStudioSceneCanvas.width = width;
      textStudioSceneCanvas.height = height;
      textStudioSceneContext.imageSmoothingEnabled = true;
      textStudioSceneContext.imageSmoothingQuality = "high";
      textStudioSceneContext.clearRect(0, 0, width, height);
      drawHalfBackground(textStudioSceneContext, "top", state.halves.top, 0, 0, width, height, playheadSeconds);
      state.assets.filter((asset) => asset.half === "top").forEach((asset) => drawAsset(textStudioSceneContext, asset, 0, 0, width, height, playheadSeconds));
      textStudioSceneContext.save();
      textStudioSceneContext.beginPath();
      clipOverlay(textStudioSceneContext, width, height, overlayWipe);
      textStudioSceneContext.clip();
      drawHalfBackground(textStudioSceneContext, "bottom", state.halves.bottom, 0, 0, width, height, playheadSeconds);
      state.assets.filter((asset) => asset.half === "bottom").forEach((asset) => drawAsset(textStudioSceneContext, asset, 0, 0, width, height, playheadSeconds));
      textStudioSceneContext.restore();
    }
    context.drawImage(textStudioSceneCanvas, 0, 0);
    context.save();
    context.beginPath();
    clipOverlay(context, width, height, overlayWipe);
    context.clip();
    const timeline = textOnlyTimeline(timelineAt(seconds), seconds);
    drawTextGroupRow(context, state.halves.bottom, width, height, timeline);
    context.restore();
    return timeline;
  }

  function renderFrame(canvas, seconds, width = state.canvas.width, height = state.canvas.height) {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    if (compositionCanvas.width !== width) compositionCanvas.width = width;
    if (compositionCanvas.height !== height) compositionCanvas.height = height;
    if (backdropCanvas.width !== width) backdropCanvas.width = width;
    if (backdropCanvas.height !== height) backdropCanvas.height = height;
    const context = canvas.getContext("2d");
    const smoothingQuality = exporting ? "high" : "medium";
    context.imageSmoothingQuality = smoothingQuality;
    compositionContext.imageSmoothingEnabled = true;
    compositionContext.imageSmoothingQuality = smoothingQuality;
    backdropContext.imageSmoothingEnabled = true;
    backdropContext.imageSmoothingQuality = smoothingQuality;
    compositionContext.clearRect(0, 0, width, height);
    backdropContext.clearRect(0, 0, width, height);
    const timeline = timelineAt(seconds);
    const isolated = textPreviewOnly && !exporting;
    const sceneTimeline = isolated ? { ...timeline, accumulatedProgress: 0, wipe: state.motion.wipeMax / 100, overlayAlpha: 1, fade: 1 } : timeline;
    const textTimeline = isolated ? textOnlyTimeline(timeline, seconds) : timeline;
    const sceneSeconds = isolated ? 0 : seconds;
    drawHalfBackground(compositionContext, "top", state.halves.top, 0, 0, width, height, sceneSeconds);
    state.assets.filter((asset) => asset.half === "top").forEach((asset) => drawAsset(compositionContext, asset, 0, 0, width, height, sceneSeconds));
    if (sceneTimeline.wipe > .0005 && sceneTimeline.overlayAlpha > .0005) {
      drawHalfBackground(backdropContext, "bottom", state.halves.bottom, 0, 0, width, height, sceneSeconds);
      state.assets.filter((asset) => asset.half === "bottom").forEach((asset) => drawAsset(backdropContext, asset, 0, 0, width, height, sceneSeconds));
    }
    context.clearRect(0, 0, width, height);
    const bootRaw = isolated ? 1 : clamp(timeline.local / Math.max(.01, state.motion.introHold), 0, 1);
    const radians = sceneTimeline.angle * sceneTimeline.accumulatedProgress * Math.PI / 180;
    const extent = Math.hypot(width, height);
    context.save();
    context.globalAlpha = sceneTimeline.fade;
    context.translate(width / 2, height / 2);
    context.rotate(radians);
    drawMirroredExtension(context, compositionCanvas, width, height, extent, compositionExtensionCanvas, compositionExtensionContext);
    context.restore();
    context.save();
    context.beginPath();
    clipOverlay(context, width, height, sceneTimeline.wipe);
    context.clip();
    context.globalAlpha *= sceneTimeline.overlayAlpha;
    context.translate(width / 2, height / 2);
    context.rotate(radians);
    drawSolidExtension(context, backdropCanvas, width, height, extent, state.halves.bottom.color);
    context.setTransform(1, 0, 0, 1, 0, 0);
    drawTextGroupRow(context, state.halves.bottom, width, height, textTimeline);
    context.restore();
    drawTvPowerOn(context, canvas, width, height, bootRaw);
    return timeline;
  }

  function fitStage() {
    const stage = $(".split-flip-stage");
    const availableWidth = Math.max(120, stage.clientWidth);
    const viewportHeightRatio = matchMedia("(max-width: 920px)").matches ? .51 : .86;
    const availableHeight = Math.max(120, Math.min(stage.clientHeight, innerHeight * viewportHeightRatio));
    const scale = Math.min(availableWidth / state.canvas.width, availableHeight / state.canvas.height);
    const displayWidth = Math.max(1, Math.round(state.canvas.width * scale));
    const displayHeight = Math.max(1, Math.round(state.canvas.height * scale));
    designFrame.style.width = `${displayWidth}px`;
    designFrame.style.height = `${displayHeight}px`;
    designFrame.style.aspectRatio = `${state.canvas.width} / ${state.canvas.height}`;
    const displayPixels = Math.max(displayWidth, displayHeight) * Math.min(2, devicePixelRatio || 1);
    const previewLimit = Math.min(playing ? 1200 : 1440, Math.max(900, Math.ceil(displayPixels)));
    const previewScale = Math.min(1, previewLimit / Math.max(state.canvas.width, state.canvas.height));
    previewCanvas.width = Math.max(1, Math.round(state.canvas.width * previewScale));
    previewCanvas.height = Math.max(1, Math.round(state.canvas.height * previewScale));
  }

  function fitTextStudio() {
    if (!textStudioDialog.open) return;
    const stage = $(".text-studio-stage");
    const availableWidth = Math.max(120, stage.clientWidth - 36);
    const availableHeight = Math.max(120, stage.clientHeight - 94);
    const scale = Math.min(availableWidth / state.canvas.width, availableHeight / state.canvas.height);
    textStudioFrame.style.width = `${Math.max(1, Math.round(state.canvas.width * scale))}px`;
    textStudioFrame.style.height = `${Math.max(1, Math.round(state.canvas.height * scale))}px`;
    textStudioFrame.style.aspectRatio = `${state.canvas.width} / ${state.canvas.height}`;
    const previewScale = Math.min(1, 1440 / Math.max(state.canvas.width, state.canvas.height));
    textStudioCanvas.width = Math.max(1, Math.round(state.canvas.width * previewScale));
    textStudioCanvas.height = Math.max(1, Math.round(state.canvas.height * previewScale));
  }

  function updateTextStartControl() {
    const minimum = state.motion.introHold + state.motion.overlayStart;
    const maximum = Math.max(12, totalDuration(), minimum);
    state.textMotion.startAt = clamp(state.textMotion.startAt, minimum, maximum);
    $("#textStartAt").min = String(minimum);
    $("#textStartAt").max = String(maximum);
    $("#textStartAt").value = String(state.textMotion.startAt);
    $("#textStartAtOut").textContent = `${state.textMotion.startAt.toFixed(2)}s`;
  }

  function updateMotionOutputs() {
    $("#speedOut").textContent = `${state.motion.speed.toFixed(2)}×`;
    $("#timelineDurationOut").textContent = `${state.motion.timelineDuration.toFixed(2)}s`;
    $("#customAngleOut").textContent = `${state.motion.customAngle}°`;
    $("#introHoldOut").textContent = `${state.motion.introHold.toFixed(2)}s`;
    $("#flipDurationOut").textContent = `${state.motion.flipDuration.toFixed(2)}s`;
    $("#sweepUpDurationOut").textContent = `${state.motion.sweepUpDuration.toFixed(2)}s`;
    $("#sweepDownDurationOut").textContent = `${state.motion.sweepDownDuration.toFixed(2)}s`;
    $("#sweepStartOut").textContent = `${state.motion.sweepStart.toFixed(2)}s`;
    $("#endHoldOut").textContent = `${state.motion.endHold.toFixed(2)}s`;
    $("#wipeMaxOut").textContent = `${state.motion.wipeMax}%`;
    $("#overlayStartOut").textContent = `${state.motion.overlayStart.toFixed(2)}s`;
    $("#overlayFadeDurationOut").textContent = `${state.motion.overlayFadeDuration.toFixed(2)}s`;
    $("#overlayStart").disabled = !state.motion.overlayEnabled;
    $("#overlayFadeDuration").disabled = !state.motion.overlayEnabled;
    $("#sweepEnabled").disabled = !state.motion.overlayEnabled;
    $("#sweepDirection").disabled = !state.motion.overlayEnabled || !state.motion.sweepEnabled;
    $("#sweepEasing").disabled = !state.motion.overlayEnabled || !state.motion.sweepEnabled;
    $("#sweepUpDuration").disabled = !state.motion.overlayEnabled || !state.motion.sweepEnabled;
    $("#sweepDownDuration").disabled = !state.motion.overlayEnabled || !state.motion.sweepEnabled;
    $("#sweepStart").disabled = !state.motion.overlayEnabled || !state.motion.sweepEnabled;
    $("#timelineDuration").disabled = state.motion.durationMode !== "timeline";
    updateTextStartControl();
    const videoDuration = trimmedVideoDuration();
    $("#totalDurationOut").textContent = state.motion.durationMode === "video" && !(videoDuration > 0) ? "请先上传并裁剪视频" : `${totalDuration().toFixed(2)}s`;
  }

  function updateTextMotionOutputs() {
    const motion = state.textMotion;
    $("#textImpactScaleOut").textContent = `${(motion.impactScale / 100).toFixed(2)}×`;
    $("#textImpactDurationOut").textContent = `${motion.impactDuration.toFixed(2)}s`;
    $("#textSettleDurationOut").textContent = `${motion.settleDuration.toFixed(2)}s`;
    $("#textAppendIntervalOut").textContent = `${motion.appendInterval.toFixed(2)}s`;
    $("#textAppendDurationOut").textContent = `${motion.appendDuration.toFixed(2)}s`;
    $("#textFinalHoldOut").textContent = `${motion.finalHold.toFixed(2)}s`;
    $("#textBlurStrengthOut").textContent = `${motion.blurStrength}%`;
    $("#textGhostCountOut").textContent = `${motion.ghostCount} 层`;
    $("#textGhostForceOut").textContent = `${motion.ghostForce}%`;
    $("#textMasterSpeedOut").textContent = `${motion.masterSpeed.toFixed(2)}×`;
    $("#textSettleScaleOut").textContent = `${(motion.settleScale / 100).toFixed(2)}×`;
    $("#textAppendSqueezeOut").textContent = `${motion.appendSqueeze}%`;
    $("#textAppendTravelOut").textContent = `${motion.appendTravel}%`;
    $("#textBreathAmountOut").textContent = `${motion.breathAmount}%`;
    $("#textTailBlurOut").textContent = `${motion.tailBlur}%`;
    updateTextStartControl();
  }

  function syncTextTimingRows() {
    state.halves.bottom.texts.forEach((layer) => {
      const row = $(`.text-layer-row[data-text-id="${layer.id}"]`);
      if (!row) return;
      $(".text-enter-duration", row).value = String(layer.enterDuration);
      updateTextOutputs(row, layer);
    });
  }

  function textRow(layer, halfName, index) {
    const row = document.createElement("div");
    row.className = "text-layer-row";
    row.dataset.textId = layer.id;
    row.classList.toggle("is-active", layer.id === activeTextId);
    row.innerHTML = `<div class="text-layer-head"><strong>覆盖层文字组 ${index + 1}</strong><button type="button">删除</button></div><div class="text-layer-grid"><label class="text-content">本组文字<textarea placeholder="一个字、一个字母或一串文字"></textarea></label><label class="font-field">字体<select class="text-font" id="font-${layer.id}"><option value="stg:noto-sc-black">Noto Sans SC Black</option></select></label><label>字重<select class="text-weight"><option value="100">100 Thin</option><option value="200">200 Extra Light</option><option value="300">300 Light</option><option value="400">400 Regular</option><option value="500">500 Medium</option><option value="600">600 Semi Bold</option><option value="700">700 Bold</option><option value="800">800 Extra Bold</option><option value="900">900 Black</option></select></label><label>字号 <output class="text-size-out"></output><input class="text-size" type="range" min="3" max="45" step=".5"></label><label>文字角度 <output class="text-rotation-out"></output><input class="text-rotation" type="range" min="0" max="360" step="1"></label><label class="color-field">颜色<input class="text-color" type="color"></label><label>弹出时长 <output class="text-enter-duration-out"></output><input class="text-enter-duration" type="range" min=".05" max="3" step=".05"></label><label>直接消失时间点 <output class="text-exit-at-out"></output><input class="text-exit-at" type="range" min="0" max="12" step=".05"></label></div>`;
    const strengthLabel = document.createElement("label");
    strengthLabel.innerHTML = `冲击强度 <output class="text-strength-out"></output><input class="text-strength" type="range" min="35" max="180" step="1">`;
    $(".text-layer-grid", row).append(strengthLabel);
    const fields = { content: $("textarea", row), font: $(".text-font", row), weight: $(".text-weight", row), size: $(".text-size", row), rotation: $(".text-rotation", row), color: $(".text-color", row), enterDuration: $(".text-enter-duration", row), exitAt: $(".text-exit-at", row), strength: $(".text-strength", row) };
    if (index === 0) { layer.enterDuration = state.textMotion.impactDuration + state.textMotion.settleDuration; fields.enterDuration.disabled = true; fields.enterDuration.closest("label").title = "首组时长由上方的冲击时长和停稳时长共同控制"; }
    if (index > 0) {
      const intervalLabel = document.createElement("label");
      intervalLabel.append("与上一组间隔 ");
      const intervalOutput = document.createElement("output");
      intervalOutput.className = "text-interval-out";
      const intervalInput = document.createElement("input");
      intervalInput.className = "text-interval";
      intervalInput.type = "range";
      intervalInput.min = ".05";
      intervalInput.max = "3";
      intervalInput.step = ".01";
      intervalLabel.append(intervalOutput, intervalInput);
      $(".text-layer-grid", row).append(intervalLabel);
      fields.interval = intervalInput;
    }
    fontLibrary.enhanceSelect(fields.font);
    Object.entries(fields).forEach(([key, field]) => {
      field.value = layer[key];
      field.addEventListener("input", () => {
        const layers = state.halves[halfName].texts;
        const previousStarts = key === "interval" ? textStartTimes(layers) : null;
        layer[key] = key === "content" || key === "font" || key === "color" ? field.value : Number(field.value);
        if (previousStarts) {
          const nextStarts = textStartTimes(layers);
          layers.slice(index).forEach((item, relativeIndex) => { item.exitAt += nextStarts[index + relativeIndex] - previousStarts[index + relativeIndex]; });
        }
        updateTextOutputs(row, layer);
        if (key === "content") { const tab = $$("#textGroupTabs button")[index]; if (tab) tab.textContent = `${index + 1} · ${layer.content || "未命名文字"}`; }
        if (textPreviewOnly && ["content", "interval", "enterDuration", "exitAt"].includes(key)) textStudioSeconds = 0;
        schedulePersist(false);
      });
    });
    $(".text-layer-head strong", row).addEventListener("click", () => { activeTextId = layer.id; $$(".text-layer-row").forEach((item) => item.classList.toggle("is-active", item.dataset.textId === activeTextId)); });
    $(".text-layer-head button", row).addEventListener("click", () => { state.halves[halfName].texts = state.halves[halfName].texts.filter((item) => item.id !== layer.id); if (activeTextId === layer.id) activeTextId = state.halves[halfName].texts[Math.max(0, index - 1)]?.id || ""; renderTextEditors(); schedulePersist(false); });
    updateTextOutputs(row, layer);
    return row;
  }

  function updateTextOutputs(row, layer) {
    $(".text-size-out", row).textContent = `${layer.size}%`;
    $(".text-rotation-out", row).textContent = `${layer.rotation}°`;
    $(".text-enter-duration-out", row).textContent = `${layer.enterDuration.toFixed(2)}s`;
    $(".text-exit-at-out", row).textContent = `${layer.exitAt.toFixed(2)}s`;
    $(".text-strength-out", row).textContent = `${layer.strength}%`;
    const intervalOut = $(".text-interval-out", row); if (intervalOut) intervalOut.textContent = `${layer.interval.toFixed(2)}s`;
  }

  function renderTextEditors() {
    const bottomLayers = state.halves.bottom.texts;
    if (!bottomLayers.some((layer) => layer.id === activeTextId)) activeTextId = bottomLayers[0]?.id || "";
    const tabs = $("#textGroupTabs");
    tabs.replaceChildren(...bottomLayers.map((layer, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.toggle("is-active", layer.id === activeTextId);
      button.textContent = `${index + 1} · ${layer.content || "未命名文字"}`;
      button.title = layer.content || `文字组 ${index + 1}`;
      button.addEventListener("click", () => { activeTextId = layer.id; renderTextEditors(); });
      return button;
    }));
    $$(".half-section .text-layer-list").forEach((list) => {
      const section = list.closest(".half-section");
      const halfName = section.dataset.half;
      const layers = state.halves[halfName].texts;
      const activeIndex = layers.findIndex((layer) => layer.id === activeTextId);
      list.replaceChildren(...(activeIndex >= 0 ? [textRow(layers[activeIndex], halfName, activeIndex)] : []));
    });
  }

  function syncHalfEditor(halfName) {
    const section = $(`.half-section[data-half="${halfName}"]`);
    const half = state.halves[halfName];
    [[".group-x", ".group-x-out", "textX"], [".group-y", ".group-y-out", "textY"], [".group-gap", ".group-gap-out", "textGap"]].forEach(([inputSelector, outputSelector, key]) => { const input=$(inputSelector, section),output=$(outputSelector, section); if(input) input.value=String(half[key]); if(output) output.textContent=`${half[key]}%`; });
    $(".half-bg-color", section).value = half.color;
    $(".media-fit", section).value = half.fit;
    $(".media-scale", section).value = String(half.mediaScale);
    $(".media-scale-out", section).textContent = `${half.mediaScale}%`;
    $(".media-x", section).value = String(half.mediaX);
    $(".media-x-out", section).textContent = `${half.mediaX}%`;
    $(".media-y", section).value = String(half.mediaY);
    $(".media-y-out", section).textContent = `${half.mediaY}%`;
    $(".media-opacity", section).value = String(half.mediaOpacity);
    $(".media-opacity-out", section).textContent = `${half.mediaOpacity}%`;
    $(".media-tint", section).value = half.mediaTint;
    $(".media-tint-strength", section).value = String(half.mediaTintStrength);
    $(".media-tint-strength-out", section).textContent = `${half.mediaTintStrength}%`;
    $(".media-transition", section).value = half.transition;
    $(".transition-duration", section).hidden = half.transition !== "crossfade";
    $(".transition-duration input", section).value = String(half.transitionDuration);
    const runtime = prepareMedia(halfName, half.media);
    $(".half-media-name", section).textContent = half.media?.name || "纯色背景";
    $(".remove-half-media", section).hidden = !half.media;
    const trim = $(".video-trim", section);
    trim.hidden = !half.media?.type.startsWith("video/");
    if (!trim.hidden) {
      $(".video-start", section).value = String(half.media.start || 0);
      $(".video-end", section).value = String(half.media.end || runtime?.duration || 1);
      $(".video-start", section).max = String(runtime?.duration || 9999);
      $(".video-end", section).max = String(runtime?.duration || 9999);
      $(".video-start-range", section).max = String(runtime?.duration || 1);
      $(".video-end-range", section).max = String(runtime?.duration || 1);
      $(".video-start-range", section).value = String(half.media.start || 0);
      $(".video-end-range", section).value = String(half.media.end || runtime?.duration || 1);
      if (runtime?.filmstrip) $(".video-filmstrip", section).getContext("2d").drawImage(runtime.filmstrip, 0, 0, 720, 96);
    }
  }

  function renderLibraries() {
    const groups = [["flowIconLibrary", iconLibrary.groups.flow], ["gifMotionLibrary", iconLibrary.groups.gifMotion], ["animalIconLibrary", iconLibrary.groups.animals], ["botIconLibrary", iconLibrary.groups.bots]];
    groups.forEach(([id, items]) => {
      const container = $(`#${id}`);
      container.replaceChildren(...items.map((item) => {
        const button = document.createElement("button");
        button.className = "me-asset-choice"; button.type = "button"; button.dataset.libraryId = item.libraryId; button.title = item.name;
        button.innerHTML = `<img src="${item.url}" alt="${item.name}" loading="lazy">`;
        button.addEventListener("click", () => { selectedCandidate = item; $$(".me-asset-choice").forEach((choice) => choice.classList.toggle("is-selected", choice === button)); $("#candidateName").textContent = item.name; $("#addCandidateButton").disabled = false; });
        return button;
      }));
    });
  }

  function makeAsset(source, half = $("#assetTarget").value) {
    return { id: uid("asset"), half, libraryId: source.libraryId || null, name: source.name || "上传资源", url: source.url, type: source.fileType || "image/png", kind: source.kind || "image", vectorType: source.vectorType || "", vectorStyle: source.vectorStyle || "", size: 24, opacity: 100, x: 50, y: 50, rotation: 0 };
  }

  function renderSelectedAssets() {
    $("#assetCount").textContent = String(state.assets.length);
    const list = $("#selectedAssetList");
    list.replaceChildren(...state.assets.map((asset) => {
      const row = document.createElement("div");
      row.className = "selected-asset-row"; row.dataset.assetId = asset.id;
      row.innerHTML = `<img src="${asset.url}" alt=""><span><strong></strong><small></small></span><span class="selected-asset-actions"><button class="edit" type="button">单独编辑</button><button class="remove" type="button">删除</button></span>`;
      $("strong", row).textContent = asset.name;
      $("small", row).textContent = asset.half === "top" ? "上层画面" : "下层画面";
      $(".edit", row).addEventListener("click", () => openAssetDrawer(asset.id));
      $(".remove", row).addEventListener("click", () => { state.assets = state.assets.filter((item) => item.id !== asset.id); runtimes.delete(`asset:${asset.id}`); renderSelectedAssets(); schedulePersist(); });
      return row;
    }));
  }

  function activeAsset() { return state.assets.find((asset) => asset.id === activeAssetId); }
  function openAssetDrawer(id) { activeAssetId = id; const asset = activeAsset(); if (!asset) return; $("#drawerAssetName").textContent = asset.name; $("#assetDrawer").hidden = false; syncAssetDrawer(); }
  function syncAssetDrawer() {
    const asset = activeAsset(); if (!asset) return;
    [["assetHalf", "half"], ["assetSize", "size"], ["assetOpacity", "opacity"], ["assetX", "x"], ["assetY", "y"], ["assetRotation", "rotation"]].forEach(([id, key]) => { $(`#${id}`).value = asset[key]; });
    $("#assetSizeOut").textContent = `${asset.size}%`; $("#assetOpacityOut").textContent = `${asset.opacity}%`; $("#assetXOut").textContent = `${asset.x}%`; $("#assetYOut").textContent = `${asset.y}%`; $("#assetRotationOut").textContent = `${asset.rotation}°`;
  }

  function renderTimeline() {
    const effectiveSweepStart = Math.max(state.motion.overlayStart, state.motion.sweepStart);
    const sweepDuration = state.motion.sweepUpDuration + state.motion.sweepDownDuration;
    const motionDuration = Math.max(state.motion.flipDuration, state.motion.overlayEnabled ? state.motion.overlayStart + state.motion.overlayFadeDuration : 0, state.motion.overlayEnabled && state.motion.sweepEnabled ? effectiveSweepStart + sweepDuration : 0);
    const toReal = (seconds) => seconds / state.motion.speed;
    const total = totalDuration();
    const phases = [
      { key: "intro", label: "电视开机展开", value: toReal(state.motion.introHold), className: "is-intro", start: 0, track: 0 },
      { key: "flip", label: "整块旋转", value: toReal(state.motion.flipDuration), className: "is-orbit", start: toReal(state.motion.introHold), track: 1 },
      ...(state.motion.overlayEnabled ? [{ key: "overlay", label: `覆盖层淡入 · +${state.motion.overlayStart.toFixed(2)}s`, value: toReal(state.motion.overlayFadeDuration), className: "is-replace", start: toReal(state.motion.introHold + state.motion.overlayStart), track: 2 }] : []),
      ...(state.motion.overlayEnabled && state.motion.sweepEnabled ? [{ key: "sweep", label: `覆盖层上下扫 · +${effectiveSweepStart.toFixed(2)}s`, value: toReal(sweepDuration), className: "is-contact", start: toReal(state.motion.introHold + effectiveSweepStart), track: 3 }] : []),
      { key: "end", label: "结果停留", value: toReal(state.motion.endHold), className: "is-hold", start: toReal(state.motion.introHold + motionDuration), track: 0 }
    ];
    const bar = $("#choreoBar");
    bar.querySelectorAll("button").forEach((node) => node.remove());
    phases.forEach((phase) => {
      const button = document.createElement("button"); button.type = "button"; button.className = `me-choreo-block ${phase.className}`; button.dataset.start = phase.start; button.dataset.end = phase.start + phase.value; button.style.left = `${phase.start / total * 100}%`; button.style.width = `${Math.max(3, phase.value / total * 100)}%`; button.style.top = `${phase.track * 42}px`; button.innerHTML = `<em>${phase.key === "flip" ? "↻" : phase.key === "sweep" ? "↕" : "•"}</em><strong>${phase.label}</strong><small>${phase.value.toFixed(2)}s</small>`;
      button.addEventListener("click", () => { playheadSeconds = phase.start; playing = false; syncPlaybackButtons(); });
      bar.append(button);
    });
    const legend = $("#choreoLegend");
    legend.innerHTML = phases.map((phase) => `<li><i class="${phase.className}"></i><b>${phase.label}</b><span>${phase.value.toFixed(2)}s</span></li>`).join("");
    bar.append($("#choreoPlayhead"));
  }

  function serialize() { return JSON.parse(JSON.stringify(state)); }
  function serializeProject() {
    return {
      format: PROJECT_FORMAT,
      formatVersion: PROJECT_FORMAT_VERSION,
      effect: { name: "上下翻转", slug: "split-flip" },
      exportedAt: new Date().toISOString(),
      includesMedia: true,
      state: serialize()
    };
  }
  function projectState(payload) {
    return payload?.format === PROJECT_FORMAT && payload?.state ? payload.state : payload;
  }
  function approvedDefault() {
    return approvedDefaultState ? JSON.parse(JSON.stringify(approvedDefaultState)) : defaultState();
  }
  function schedulePersist(updateTimeline = true) { clearTimeout(persistTimer); persistTimer = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize())); } catch (_) {} }, 180); if (updateTimeline) renderTimeline(); }
  function download(name, blob) { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }

  function exportDurationSeconds() {
    const value = $("#exportDuration").value;
    if (value === "full") return totalDuration();
    if (value === "custom") return clamp($("#customDuration").value, .1, 30);
    return Number(value) || totalDuration();
  }

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo")];
  function setExportBusy(busy, message) { exporting = busy; exportButtons.forEach((button) => { button.disabled = busy; }); $("#exportStatus").textContent = message; }

  async function prepareAllMedia() {
    const tasks = [];
    ["top", "bottom"].forEach((halfName) => { const runtime = prepareMedia(halfName, state.halves[halfName].media); if (runtime?.promise) tasks.push(runtime.promise); if (runtime?.loadVideo && !runtime.exportPromise) runtime.exportPromise = runtime.loadVideo("exportVideo"); if (runtime?.exportPromise) tasks.push(runtime.exportPromise); });
    state.assets.forEach((asset) => { const runtime = prepareAsset(asset); if (runtime?.promise) tasks.push(runtime.promise); });
    await Promise.all(tasks);
  }

  async function seekBackgroundsAt(seconds) {
    await Promise.all(["top", "bottom"].map(async (halfName) => {
      const half = state.halves[halfName]; const media = half.media;
      if (!media?.type.startsWith("video/")) return;
      const runtime = prepareMedia(halfName, media); await runtime?.exportPromise;
      const video = runtime?.exportVideo; const duration = runtime?.duration || Number(video?.duration) || 0;
      if (!video || !(duration > 0)) return;
      const start = clamp(media.start, 0, duration); const end = clamp(media.end || duration, start + .01, duration);
      const target = start + (seconds % Math.max(.01, end - start));
      await seekVideo(video, target);
      const frame = runtime.exportImage || document.createElement("canvas"); frame.width = video.videoWidth || 2; frame.height = video.videoHeight || 2;
      frame.getContext("2d").drawImage(video, 0, 0, frame.width, frame.height); runtime.exportImage = frame;
    }));
  }

  function applyState(next, message = "") {
    const fallback = defaultState();
    const normalizedHalf = (halfName) => {
      const source = next?.halves?.[halfName];
      const sourceTexts = Array.isArray(source?.texts) ? source.texts : fallback.halves[halfName].texts;
      const textFallback = fallback.halves[halfName].texts[0] || makeText("");
      return { ...fallback.halves[halfName], ...source, texts: sourceTexts.map((text, index) => ({ ...textFallback, ...text, rotation: Number(text.rotation) || 0, interval: index === 0 ? fallback.textMotion.appendInterval : Math.max(.01, Number(text.interval) || Number(next?.textMotion?.appendInterval) || fallback.textMotion.appendInterval), enterDuration: next?.version < 4 && Number(text.enterDuration) === .35 ? .22 : Number(text.enterDuration ?? textFallback.enterDuration) })) };
    };
    state = { ...fallback, ...next, version: 14, canvas: { ...fallback.canvas, ...next?.canvas }, motion: { ...fallback.motion, ...next?.motion }, textMotion: { ...fallback.textMotion, ...next?.textMotion }, halves: { top: normalizedHalf("top"), bottom: normalizedHalf("bottom") }, assets: Array.isArray(next?.assets) ? next.assets : [] };
    if (!(Number(next?.motion?.sweepUpDuration) > 0) || !(Number(next?.motion?.sweepDownDuration) > 0)) {
      const legacyHalfDuration = clamp(Number(next?.motion?.sweepDuration) || fallback.motion.sweepDuration, .1, 40) / 2;
      state.motion.sweepUpDuration = legacyHalfDuration;
      state.motion.sweepDownDuration = legacyHalfDuration;
    }
    state.motion.sweepUpDuration = clamp(state.motion.sweepUpDuration, .05, 20);
    state.motion.sweepDownDuration = clamp(state.motion.sweepDownDuration, .05, 20);
    state.motion.sweepDuration = state.motion.sweepUpDuration + state.motion.sweepDownDuration;
    if ((next?.version || 0) < 12) state.textMotion.startAt = Math.max(state.motion.introHold + state.motion.overlayStart, Number(next?.halves?.bottom?.texts?.[0]?.enterAt) || 0);
    if (next?.version < 5 && Number(next?.motion?.introHold) === .4) state.motion.introHold = 1.8;
    if ((next?.version || 0) < 9) state.motion.timelineDuration = phaseDuration() * (Number(next?.motion?.timelineScale) || 1) / state.motion.speed;
    runtimes.clear();
    $("#canvasPreset").value = state.canvas.preset; $("#canvasWidth").value = state.canvas.width; $("#canvasHeight").value = state.canvas.height; $("#customSize").hidden = state.canvas.preset !== "custom";
    [["direction", "direction"], ["anglePreset", "anglePreset"], ["customAngle", "customAngle"], ["wipeMax", "wipeMax"], ["overlayStart", "overlayStart"], ["overlayFadeDuration", "overlayFadeDuration"], ["durationMode", "durationMode"], ["timelineDuration", "timelineDuration"], ["bootTheme", "bootTheme"], ["speed", "speed", 100], ["introHold", "introHold"], ["flipDuration", "flipDuration"], ["sweepDirection", "sweepDirection"], ["sweepEasing", "sweepEasing"], ["sweepUpDuration", "sweepUpDuration"], ["sweepDownDuration", "sweepDownDuration"], ["sweepStart", "sweepStart"], ["endHold", "endHold"], ["easing", "easing"]].forEach(([id, key, factor = 1]) => { const value = state.motion[key]; $(`#${id}`).value = String(typeof value === "number" ? value * factor : value); });
    [["textImpactScale", "impactScale"], ["textImpactDuration", "impactDuration", 1000], ["textSettleDuration", "settleDuration", 1000], ["textAppendInterval", "appendInterval", 1000], ["textAppendDuration", "appendDuration", 1000], ["textFinalHold", "finalHold", 1000], ["textBlurStrength", "blurStrength"], ["textGhostCount", "ghostCount"], ["textGhostForce", "ghostForce"], ["textMasterSpeed", "masterSpeed", 100], ["textSettleScale", "settleScale"], ["textAppendSqueeze", "appendSqueeze"], ["textAppendTravel", "appendTravel"], ["textBreathAmount", "breathAmount"], ["textTailBlur", "tailBlur"]].forEach(([id, key, factor = 1]) => { $(`#${id}`).value = String(state.textMotion[key] * factor); });
    $("#textDirection").value = state.textMotion.direction;
    $("#overlayEnabled").checked = state.motion.overlayEnabled;
    $("#sweepEnabled").checked = state.motion.sweepEnabled;
    $("#customAngleWrap").hidden = state.motion.anglePreset !== "custom";
    fitStage(); updateMotionOutputs(); updateTextMotionOutputs(); renderTextEditors(); ["top", "bottom"].forEach(syncHalfEditor); renderSelectedAssets(); renderTimeline();
    if (message) $("#schemeStatus").textContent = message;
  }

  function syncPlaybackButtons() { $("#stagePauseButton").textContent = playing ? "暂停" : "播放"; $("#textStudioPauseButton").textContent = textStudioPlaying ? "暂停" : "播放"; }
  function restartPlayback() {
    if (textPreviewOnly) { textStudioSeconds = 0; textStudioPlaying = true; }
    else { playheadSeconds = 0; lastRenderedVideoFrame = -1; playing = true; fitStage(); }
    syncPlaybackButtons();
  }
  function animate(now) {
    const delta = Math.min(.25, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
    if (textPreviewOnly && textStudioPlaying) textStudioSeconds += delta;
    if (!textPreviewOnly && playing) playheadSeconds += delta;
    const cycleSeconds = playheadSeconds % Math.max(.01, totalDuration());
    if (!textPreviewOnly) syncVideos(cycleSeconds);
    const videoFrameVersion = textPreviewOnly ? -1 : primaryVideoFrameVersion();
    if (!textPreviewOnly && playing && videoFrameVersion >= 0 && videoFrameVersion === lastRenderedVideoFrame) { requestAnimationFrame(animate); return; }
    lastRenderedVideoFrame = videoFrameVersion;
    const timeline = textStudioDialog.open
      ? renderTextOnlyFrame(textStudioCanvas, textStudioSeconds, textStudioCanvas.width, textStudioCanvas.height)
      : renderFrame(previewCanvas, playheadSeconds, previewCanvas.width, previewCanvas.height);
    if (!textPreviewOnly && now - lastTimelineUiFrame >= 100) {
      lastTimelineUiFrame = now;
      $("#choreoPlayhead").style.left = `${timeline.cycleProgress * 100}%`;
      const activePhase = $$(".me-choreo-block", $("#choreoBar")).find((block) => timeline.local >= Number(block.dataset.start) && timeline.local < Number(block.dataset.end))?.dataset.start || "";
      if (activePhase !== lastActiveTimelinePhase) {
        lastActiveTimelinePhase = activePhase;
        $$(".me-choreo-block", $("#choreoBar")).forEach((block) => block.classList.toggle("is-active", block.dataset.start === activePhase));
      }
    }
    requestAnimationFrame(animate);
  }

  function selectAssetHalf(halfName) {
    $("#assetTarget").value = halfName;
    $("#addCandidateButton").textContent = `添加到${halfName === "top" ? "底层画面" : "覆盖图层"}`;
    $("#assetSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $$("[data-jump]").forEach((button) => button.addEventListener("click", () => {
    const target = button.dataset.jump.startsWith(".") ? $(button.dataset.jump) : document.getElementById(button.dataset.jump);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  $$(".half-section").forEach((section) => {
    const halfName = section.dataset.half;
    $(".add-text", section)?.addEventListener("click", () => {
      const layers = state.halves[halfName].texts;
      const index = layers.length;
      const interval = state.textMotion.appendInterval;
      const starts = textStartTimes(layers);
      const enterAt = index ? starts[index - 1] + interval : textStartTimes([{}])[0];
      const enterDuration = index ? state.textMotion.appendDuration : state.textMotion.impactDuration + state.textMotion.settleDuration;
      const layer = makeText("新文字组", { color: "#111111", enterAt, enterDuration, interval, exitAt: Math.max(enterAt + 2, enterAt + enterDuration + state.textMotion.finalHold) });
      layers.push(layer);
      activeTextId = layer.id;
      renderTextEditors();
      restartPlayback();
      schedulePersist(false);
      requestAnimationFrame(() => $(`.text-layer-row[data-text-id="${layer.id}"]`)?.scrollIntoView({ block: "nearest" }));
    });
    [[".group-x", "textX"], [".group-y", "textY"], [".group-gap", "textGap"]].forEach(([selector, key]) => $(selector, section)?.addEventListener("input", (event) => { state.halves[halfName][key] = Number(event.target.value); syncHalfEditor(halfName); schedulePersist(); }));
    $(".add-icon", section).addEventListener("click", () => selectAssetHalf(halfName));
    $(".half-bg-color", section).addEventListener("input", (event) => { state.halves[halfName].color = event.target.value; schedulePersist(); });
    $(".media-fit", section).addEventListener("change", (event) => { state.halves[halfName].fit = event.target.value; schedulePersist(); });
    [[".media-scale", "mediaScale"], [".media-x", "mediaX"], [".media-y", "mediaY"]].forEach(([selector, key]) => $(selector, section).addEventListener("input", (event) => { state.halves[halfName][key] = Number(event.target.value); syncHalfEditor(halfName); schedulePersist(); }));
    $(".media-opacity", section).addEventListener("input", (event) => { state.halves[halfName].mediaOpacity = Number(event.target.value); syncHalfEditor(halfName); schedulePersist(); });
    $(".media-tint", section).addEventListener("input", (event) => { state.halves[halfName].mediaTint = event.target.value; schedulePersist(); });
    $(".media-tint-strength", section).addEventListener("input", (event) => { state.halves[halfName].mediaTintStrength = Number(event.target.value); syncHalfEditor(halfName); schedulePersist(); });
    $(".media-transition", section).addEventListener("change", (event) => { state.halves[halfName].transition = event.target.value; syncHalfEditor(halfName); schedulePersist(); });
    $(".transition-duration input", section).addEventListener("change", (event) => { state.halves[halfName].transitionDuration = clamp(event.target.value, .01, 2); syncHalfEditor(halfName); schedulePersist(); });
    $(".half-bg-file", section).addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; const previewUrl = URL.createObjectURL(file); const url = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); state.halves[halfName].media = { name: file.name, type: file.type || (file.name.endsWith(".qt") ? "video/quicktime" : "image/png"), url, start: 0, end: 0 }; Object.defineProperty(state.halves[halfName].media, "previewUrl", { value: previewUrl, enumerable: false }); prepareMedia(halfName, state.halves[halfName].media); syncHalfEditor(halfName); updateMotionOutputs(); restartPlayback(); schedulePersist(); event.target.value = ""; });
    $(".remove-half-media", section).addEventListener("click", () => { const media = state.halves[halfName].media; const runtime = prepareMedia(halfName, media); runtime?.video?.pause(); runtimes.delete(mediaKey(halfName, media)); state.halves[halfName].media = null; syncHalfEditor(halfName); updateMotionOutputs(); schedulePersist(); });
    [[".video-start", "start", "change"], [".video-end", "end", "change"], [".video-start-range", "start", "input"], [".video-end-range", "end", "input"]].forEach(([selector, key, eventName]) => $(selector, section).addEventListener(eventName, (event) => { const media = state.halves[halfName].media; const runtime = prepareMedia(halfName, media); if (!media) return; const duration = runtime?.duration || 9999; media[key] = clamp(event.target.value, key === "start" ? 0 : (media.start || 0) + .01, key === "start" ? Math.max(0, (media.end || duration) - .01) : duration); syncHalfEditor(halfName); updateMotionOutputs(); schedulePersist(); }));
  });

  $("#canvasPreset").addEventListener("change", (event) => { state.canvas.preset = event.target.value; $("#customSize").hidden = event.target.value !== "custom"; if (event.target.value !== "custom") [state.canvas.width, state.canvas.height] = event.target.value.split("x").map(Number); fitStage(); schedulePersist(); });
  [["canvasWidth", "width"], ["canvasHeight", "height"]].forEach(([id, key]) => $(`#${id}`).addEventListener("change", (event) => { state.canvas[key] = clamp(event.target.value, 240, 3840); state.canvas.preset = "custom"; fitStage(); schedulePersist(); }));

  const motionBindings = [["direction", "direction", "change"], ["anglePreset", "anglePreset", "change"], ["customAngle", "customAngle", "input", 1], ["wipeMax", "wipeMax", "input", 1], ["overlayStart", "overlayStart", "input", 1], ["overlayFadeDuration", "overlayFadeDuration", "input", 1], ["durationMode", "durationMode", "change"], ["timelineDuration", "timelineDuration", "input", 1], ["bootTheme", "bootTheme", "change"], ["speed", "speed", "input", .01], ["introHold", "introHold", "input", 1], ["flipDuration", "flipDuration", "input", 1], ["sweepDirection", "sweepDirection", "change"], ["sweepEasing", "sweepEasing", "change"], ["sweepUpDuration", "sweepUpDuration", "input", 1], ["sweepDownDuration", "sweepDownDuration", "input", 1], ["sweepStart", "sweepStart", "input", 1], ["endHold", "endHold", "input", 1], ["easing", "easing", "change"]];
  motionBindings.forEach(([id, key, eventName, factor]) => $(`#${id}`).addEventListener(eventName, (event) => { state.motion[key] = factor ? Number(event.target.value) * factor : event.target.value; if (id === "anglePreset") $("#customAngleWrap").hidden = event.target.value !== "custom"; if (id === "sweepUpDuration" || id === "sweepDownDuration") state.motion.sweepDuration = state.motion.sweepUpDuration + state.motion.sweepDownDuration; updateMotionOutputs(); restartPlayback(); schedulePersist(); }));
  const textMotionBindings = [["textImpactScale", "impactScale", 1], ["textImpactDuration", "impactDuration", .001], ["textSettleDuration", "settleDuration", .001], ["textAppendInterval", "appendInterval", .001], ["textAppendDuration", "appendDuration", .001], ["textFinalHold", "finalHold", .001], ["textBlurStrength", "blurStrength", 1], ["textGhostCount", "ghostCount", 1], ["textGhostForce", "ghostForce", 1], ["textMasterSpeed", "masterSpeed", .01], ["textSettleScale", "settleScale", 1], ["textAppendSqueeze", "appendSqueeze", 1], ["textAppendTravel", "appendTravel", 1], ["textBreathAmount", "breathAmount", 1], ["textTailBlur", "tailBlur", 1]];
  $("#textDirection").addEventListener("change", (event) => {
    state.textMotion.direction = event.target.value;
    restartPlayback();
    schedulePersist(false);
  });
  $("#textAppendInterval").closest("label").firstChild.textContent = "全部组统一间隔 ";
  $("#textStartAt").addEventListener("input", (event) => {
    const minimum = state.motion.introHold + state.motion.overlayStart;
    const maximum = Math.max(12, totalDuration(), minimum);
    const previous = textStartTimes()[0];
    state.textMotion.startAt = clamp(event.target.value, minimum, maximum);
    const shift = state.textMotion.startAt - previous;
    if (Math.abs(shift) > .0001) state.halves.bottom.texts.forEach((layer) => { layer.exitAt += shift; });
    updateTextStartControl();
    textStudioSeconds = 0;
    schedulePersist(false);
  });
  textMotionBindings.forEach(([id, key, factor]) => $(`#${id}`).addEventListener("input", (event) => {
    state.textMotion[key] = Number(event.target.value) * factor;
    const layers = state.halves.bottom.texts;
    if ((key === "impactDuration" || key === "settleDuration") && layers[0]) layers[0].enterDuration = state.textMotion.impactDuration + state.textMotion.settleDuration;
    if (key === "appendDuration") layers.slice(1).forEach((layer) => { layer.enterDuration = state.textMotion.appendDuration; });
    if (key === "appendInterval" && layers.length > 1) {
      const previousStarts = textStartTimes(layers);
      layers.slice(1).forEach((layer) => { layer.interval = state.textMotion.appendInterval; });
      const nextStarts = textStartTimes(layers);
      layers.slice(1).forEach((layer, index) => { layer.exitAt += nextStarts[index + 1] - previousStarts[index + 1]; });
    }
    updateTextMotionOutputs(); syncTextTimingRows(); if (textPreviewOnly) textStudioSeconds = 0; schedulePersist(false);
  }));
  function setTextPreviewMode(enabled) {
    textPreviewOnly = enabled;
    $("#textPreviewOnly").checked = enabled;
    if (enabled) { textStudioSeconds = 0; textStudioPlaying = true; }
    lastRenderedVideoFrame = -1;
    runtimes.forEach((runtime) => runtime?.video?.pause());
    if (!textPreviewOnly && playing) runtimes.forEach((runtime) => runtime?.video?.play?.().catch(() => {}));
  }
  $("#textPreviewOnly").addEventListener("change", (event) => setTextPreviewMode(event.target.checked));
  $("#textReplayButton").addEventListener("click", () => { textStudioSeconds = 0; textStudioPlaying = true; syncPlaybackButtons(); });
  [$("#openTextStudio"), $("#openTextStudioInline")].forEach((button) => button.addEventListener("click", () => {
    setTextPreviewMode(true);
    syncPlaybackButtons();
    textStudioDialog.showModal();
    requestAnimationFrame(fitTextStudio);
  }));
  $("#closeTextStudio").addEventListener("click", () => textStudioDialog.close());
  textStudioDialog.addEventListener("close", () => {
    playing = false;
    setTextPreviewMode(false);
    const layers = state.halves.bottom.texts;
    const starts = textStartTimes(layers);
    if (starts.length) {
      const textSpeed = Math.max(.4, state.textMotion.masterSpeed);
      const settledLocal = Math.max(...layers.map((layer, index) => starts[index] + (index === 0
        ? state.textMotion.impactDuration + state.textMotion.settleDuration
        : Math.max(.05, layer.enterDuration) / Math.max(.35, layer.strength / 100)) / textSpeed));
      const validExits = layers.map((layer, index) => Number(layer.exitAt)).filter((exitAt, index) => exitAt > starts[index]);
      const earliestExit = validExits.length ? Math.min(...validExits) : Infinity;
      const previewLocal = Math.max(starts[0] + .02, Math.min(settledLocal, earliestExit - .02));
      playheadSeconds = previewLocal / Math.max(.01, state.motion.speed);
    }
    lastRenderedVideoFrame = -1;
    runtimes.forEach((runtime) => runtime?.video?.pause?.());
    fitStage();
    syncPlaybackButtons();
  });
  $("#overlayEnabled").addEventListener("change", (event) => { state.motion.overlayEnabled = event.target.checked; updateMotionOutputs(); restartPlayback(); schedulePersist(); });
  $("#sweepEnabled").addEventListener("change", (event) => { state.motion.sweepEnabled = event.target.checked; updateMotionOutputs(); restartPlayback(); schedulePersist(); });

  $("#assetTarget").addEventListener("change", (event) => { $("#addCandidateButton").textContent = `添加到${event.target.value === "top" ? "底层画面" : "覆盖图层"}`; });
  $("#addCandidateButton").addEventListener("click", () => { if (!selectedCandidate) return; const half = $("#assetTarget").value; if (selectedCandidate.libraryId && state.assets.some((asset) => asset.half === half && asset.libraryId === selectedCandidate.libraryId)) { $("#schemeStatus").textContent = "该图层已经添加过这个内置资源。"; return; } const asset = makeAsset(selectedCandidate, half); state.assets.push(asset); prepareAsset(asset); renderSelectedAssets(); schedulePersist(); });
  $("#assetUpload").addEventListener("change", async (event) => { for (const file of event.target.files) { const url = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); const asset = makeAsset({ name: file.name, url, fileType: file.type }); state.assets.push(asset); prepareAsset(asset); } renderSelectedAssets(); schedulePersist(); event.target.value = ""; });
  function setAssetManager(expanded) { const panel = $("#assetLayerPanel"); panel.classList.toggle("is-list-expanded", expanded); $("#assetListToggle").textContent = expanded ? "收起已选" : "展开已选"; $("#assetListToggle").setAttribute("aria-expanded", String(expanded)); }
  $("#assetListToggle").addEventListener("click", () => setAssetManager(!$("#assetLayerPanel").classList.contains("is-list-expanded")));
  $("#closeAssetDrawer").addEventListener("click", () => { activeAssetId = null; $("#assetDrawer").hidden = true; });
  [["assetHalf", "half", "change"], ["assetSize", "size", "input"], ["assetOpacity", "opacity", "input"], ["assetX", "x", "input"], ["assetY", "y", "input"], ["assetRotation", "rotation", "input"]].forEach(([id, key, eventName]) => $(`#${id}`).addEventListener(eventName, (event) => { const asset = activeAsset(); if (!asset) return; asset[key] = key === "half" ? event.target.value : Number(event.target.value); syncAssetDrawer(); renderSelectedAssets(); schedulePersist(); }));
  document.addEventListener("keydown", (event) => { if (event.key !== "Escape") return; if (!$("#assetDrawer").hidden) $("#closeAssetDrawer").click(); else if ($("#assetLayerPanel").classList.contains("is-list-expanded")) $("#assetListToggle").click(); });

  $("#stagePauseButton").addEventListener("click", () => {
    playing = !playing;
    lastRenderedVideoFrame = -1;
    runtimes.forEach((runtime) => {
      if (playing) runtime?.video?.play?.().catch(() => {});
      else runtime?.video?.pause?.();
    });
    fitStage();
    syncPlaybackButtons();
  });
  $("#stageReplayButton").addEventListener("click", () => { playheadSeconds = 0; playing = true; fitStage(); syncPlaybackButtons(); });
  $("#textStudioPauseButton").addEventListener("click", () => { textStudioPlaying = !textStudioPlaying; syncPlaybackButtons(); });
  $("#textStudioReplayButton").addEventListener("click", () => { textStudioSeconds = 0; textStudioPlaying = true; syncPlaybackButtons(); });
  $("#saveScheme").addEventListener("click", () => { const savedState = JSON.stringify(serialize()); try { localStorage.setItem(STORAGE_KEY, savedState); } catch (_) {} const json = JSON.stringify(serializeProject(), null, 2); download("split-flip-project.json", new Blob([json], { type: "application/json" })); $("#schemeStatus").textContent = "完整项目 JSON 已保存并下载（包含上传媒体）。"; });
  $("#importScheme").addEventListener("change", async (event) => { const file = event.target.files[0]; if (!file) return; try { applyState(projectState(JSON.parse(await file.text())), "完整项目 JSON 已导入。" ); schedulePersist(); } catch (_) { $("#schemeStatus").textContent = "项目 JSON 无法读取。"; } event.target.value = ""; });
  $("#restoreScheme").addEventListener("click", () => { applyState(approvedDefault(), "已恢复批准的默认示例。" ); schedulePersist(); });
  $("#clearScheme").addEventListener("click", () => { const blank = defaultState(); blank.halves.top.texts = []; blank.halves.bottom.texts = []; blank.assets = []; applyState(blank, "已清空文字与资源。" ); schedulePersist(); });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.target.value !== "custom"; });
  $("#exportPng").addEventListener("click", async () => {
    setExportBusy(true, "正在准备 PNG 素材…");
    try { await prepareAllMedia(); await seekBackgroundsAt(playheadSeconds); const output = document.createElement("canvas"); renderFrame(output, playheadSeconds, state.canvas.width, state.canvas.height); output.toBlob((blob) => { if (blob) download(`split-flip-${state.canvas.width}x${state.canvas.height}.png`, blob); setExportBusy(false, `PNG 已生成 · ${state.canvas.width} × ${state.canvas.height}`); }, "image/png"); }
    catch (error) { console.error(error); setExportBusy(false, `PNG 导出失败：${error.message}`); }
  });

  $("#exportGif").addEventListener("click", async () => {
    if (!window.GIF) { $("#exportStatus").textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    setExportBusy(true, "正在准备 GIF 素材…");
    try {
      await prepareAllMedia(); const output = document.createElement("canvas"); const fps = Math.min(30, Number($("#exportFps").value) || 15); const duration = exportDurationSeconds(); const frameCount = Math.max(1, Math.ceil(duration * fps));
      const gif = new GIF({ workers: 2, quality: 10, width: state.canvas.width, height: state.canvas.height, workerScript: "js/continuation-gif.worker.js" });
      for (let frame = 0; frame < frameCount; frame += 1) { const seconds = frame / fps; await seekBackgroundsAt(seconds); renderFrame(output, seconds, state.canvas.width, state.canvas.height); gif.addFrame(output, { copy: true, delay: 1000 / fps }); if (frame % 4 === 0) $("#exportStatus").textContent = `正在准备 GIF · ${frame + 1} / ${frameCount} 帧`; }
      gif.on("progress", (progress) => { $("#exportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => { download(`split-flip-${state.canvas.width}x${state.canvas.height}.gif`, blob); setExportBusy(false, `GIF 已生成 · ${state.canvas.width} × ${state.canvas.height}`); });
      gif.on("abort", () => setExportBusy(false, "GIF 编码已取消。")); gif.render();
    } catch (error) { console.error(error); setExportBusy(false, `GIF 导出失败：${error.message}`); }
  });

  $("#exportVideo").addEventListener("click", async () => {
    if (!window.HME?.createH264MP4Encoder) { $("#exportStatus").textContent = "MP4 编码器未加载，请刷新后重试。"; return; }
    setExportBusy(true, "正在准备 MP4 素材…"); let encoder;
    try {
      await prepareAllMedia(); const output = document.createElement("canvas"); output.width = state.canvas.width; output.height = state.canvas.height; const context = output.getContext("2d", { willReadFrequently: true }); const fps = Number($("#exportFps").value) || 30; const duration = exportDurationSeconds(); const frameCount = Math.max(1, Math.ceil(duration * fps));
      encoder = await window.HME.createH264MP4Encoder(); encoder.outputFilename = `split-flip-${state.canvas.width}x${state.canvas.height}.mp4`; encoder.width = state.canvas.width; encoder.height = state.canvas.height; encoder.frameRate = fps; encoder.kbps = Math.max(4000, Math.round(state.canvas.width * state.canvas.height * fps * .12 / 1000)); encoder.groupOfPictures = 15; encoder.initialize();
      for (let frame = 0; frame < frameCount; frame += 1) { const seconds = frame / fps; await seekBackgroundsAt(seconds); renderFrame(output, seconds, state.canvas.width, state.canvas.height); encoder.addFrameRgba(context.getImageData(0, 0, output.width, output.height).data); if (frame % 2 === 0 || frame === frameCount - 1) { $("#exportStatus").textContent = `正在编码 MP4 · ${Math.round((frame + 1) / frameCount * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); } }
      encoder.finalize(); const bytes = encoder.FS.readFile(encoder.outputFilename); download(encoder.outputFilename, new Blob([bytes], { type: "video/mp4" })); setExportBusy(false, `MP4 已生成 · ${state.canvas.width} × ${state.canvas.height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) { console.error(error); setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`); }
    finally { try { encoder?.delete(); } catch (_) {} }
  });

  async function initialize() {
    renderLibraries();
    try {
      const response = await fetch(DEFAULT_PROJECT_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`默认示例加载失败：${response.status}`);
      const payload = await response.json();
      if (payload?.format !== PROJECT_FORMAT || payload?.effect?.slug !== "split-flip") throw new Error("默认示例格式不正确");
      approvedDefaultState = projectState(payload);
    } catch (error) {
      console.warn(error);
    }
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) {}
    applyState(stored || approvedDefault(), stored ? "已恢复上次自动保存的方案。" : approvedDefaultState ? "已载入批准的默认示例。" : "内置默认示例已载入。" );
    syncPlaybackButtons();
    new ResizeObserver(fitStage).observe($(".split-flip-stage"));
    new ResizeObserver(fitTextStudio).observe($(".text-studio-stage"));
    requestAnimationFrame(animate);
  }
  initialize();
})();
