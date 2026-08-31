(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#stageCanvas");
  const stageShell = $("#stageShell");
  const workspace = $("#workspace");
  const exportStatus = $("#exportStatus");
  const schemeStatus = $("#schemeStatus");
  const STORAGE_KEY = "me-ribbon-ink-autosave-v1";
  const EFFECT_ID = "ribbon-ink";
  const SCHEME_VERSION = 1;
  const PHASE_COLORS = ["#ef4d86", "#6a2f8c", "#ee7b34", "#2589d8"];
  const urlParams = new URLSearchParams(location.search);
  const REFERENCE_ATLAS_SRC = "assets/ribbonink/ribbonink-reference-atlas.webp?v=20260901b";
  const REFERENCE_FRAME = { width: 720, height: 405, columns: 5, count: 75, fps: 30, offset: 3 };
  const REFERENCE_PHASES = { write: [0, .50], flow: [.50, 1.37], erase: [1.37, 1.94], hold: [1.94, 2.50] };

  const inputIds = [
    "canvasPreset", "canvasWidth", "canvasHeight", "textInput", "fontSelect", "fontSize",
    "letterSpacing", "textColor", "backgroundColor", "brushColor", "textureColor",
    "brushScale", "brushWidth", "positionX", "positionY", "textureDensity", "textureSpeed",
    "writeDuration", "flowDuration", "eraseDuration", "holdDuration", "motionEase",
    "exportDuration", "exportDurationCustom", "exportFps"
  ];
  const inputs = Object.fromEntries(inputIds.map((id) => [id, $(`#${id}`)]));

  const defaultValues = {
    canvasPreset: "1920x1080", canvasWidth: "1920", canvasHeight: "1080",
    textInput: "TIME", fontSelect: "stg:roboto-condensed", fontSize: "270", letterSpacing: "2",
    textColor: "#080808", backgroundColor: "#f7f7f5", brushColor: "#ef39d4", textureColor: "#8613c6",
    brushScale: "100", brushWidth: "100", positionX: "50", positionY: "52",
    textureDensity: "100", textureSpeed: "100", writeDuration: "50", flowDuration: "87",
    eraseDuration: "57", holdDuration: "56", motionEase: "smooth",
    exportDuration: "full", exportDurationCustom: "2.5", exportFps: "30"
  };

  const state = {
    paused: false,
    pausedAt: 0,
    startedAt: performance.now(),
    raf: 0,
    autosaveTimer: 0,
    background: null,
    backgroundDataUrl: "",
    referenceAtlas: null,
    previewBacking: { width: 1, height: 1 }
  };

  const maskCanvas = document.createElement("canvas");
  const paintCanvas = document.createElement("canvas");

  const authored = [
    {
      start: 0,
      end: .88,
      width: 1,
      segments: [
        [[-22, 374], [56, 317], [160, 229], [247, 169]],
        [[247, 169], [276, 149], [309, 155], [305, 180]],
        [[305, 180], [300, 205], [263, 211], [237, 198]],
        [[237, 198], [218, 188], [216, 210], [234, 230]],
        [[234, 230], [252, 250], [282, 251], [305, 228]],
        [[305, 228], [319, 214], [325, 195], [329, 185]],
        [[329, 185], [331, 207], [322, 240], [340, 248]],
        [[340, 248], [354, 254], [367, 223], [378, 210]],
        [[378, 210], [389, 197], [393, 207], [386, 229]],
        [[386, 229], [381, 248], [395, 252], [406, 239]],
        [[406, 239], [420, 222], [418, 199], [430, 198]],
        [[430, 198], [443, 198], [432, 244], [450, 249]],
        [[450, 249], [465, 254], [481, 222], [498, 210]],
        [[498, 210], [519, 194], [544, 201], [546, 222]],
        [[546, 222], [547, 242], [521, 253], [497, 241]],
        [[497, 241], [516, 266], [550, 269], [584, 247]],
        [[584, 247], [628, 221], [683, 218], [756, 264]]
      ]
    },
    {
      start: .18,
      end: .36,
      width: .72,
      segments: [[[180, 220], [217, 208], [271, 193], [326, 178]]]
    },
    {
      start: .47,
      end: .53,
      width: .76,
      dot: [329, 153]
    }
  ];

  function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
  function mix(a, b, amount) { return a + (b - a) * amount; }
  function fract(value) { return value - Math.floor(value); }
  function smoothstep(value) { const x = clamp(value); return x * x * (3 - 2 * x); }
  function easeOutQuint(value) { return 1 - Math.pow(1 - clamp(value), 5); }
  function easeInCubic(value) { return Math.pow(clamp(value), 3); }

  function phaseEase(value, phase) {
    const mode = inputs.motionEase.value;
    if (mode === "direct") return clamp(value);
    if (mode === "snappy") return phase === "erase" ? easeInCubic(value) : easeOutQuint(value);
    return smoothstep(value);
  }

  function cubicPoint(segment, t) {
    const [p0, p1, p2, p3] = segment;
    const u = 1 - t;
    return {
      x: u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
      y: u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
    };
  }

  function sampleStroke(stroke) {
    if (stroke.dot) return [];
    const points = [];
    stroke.segments.forEach((segment, segmentIndex) => {
      const steps = 28;
      for (let step = segmentIndex ? 1 : 0; step <= steps; step += 1) {
        points.push(cubicPoint(segment, step / steps));
      }
    });
    let total = 0;
    points.forEach((point, index) => {
      if (index) total += Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y);
      point.length = total;
    });
    points.forEach((point, index) => {
      point.s = total ? point.length / total : 0;
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      point.angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    });
    return points;
  }
  authored.forEach((stroke) => { stroke.samples = sampleStroke(stroke); });

  function timing() {
    const write = Number(inputs.writeDuration.value) / 100;
    const flow = Number(inputs.flowDuration.value) / 100;
    const erase = Number(inputs.eraseDuration.value) / 100;
    const hold = Number(inputs.holdDuration.value) / 100;
    return { write, flow, erase, hold, total: write + flow + erase + hold };
  }

  function phaseAt(rawTime) {
    const span = timing();
    const time = ((rawTime % span.total) + span.total) % span.total;
    if (time < span.write) return { name: "write", progress: time / Math.max(.001, span.write), time, span };
    if (time < span.write + span.flow) return { name: "flow", progress: (time - span.write) / Math.max(.001, span.flow), time, span };
    if (time < span.write + span.flow + span.erase) return { name: "erase", progress: (time - span.write - span.flow) / Math.max(.001, span.erase), time, span };
    return { name: "hold", progress: (time - span.write - span.flow - span.erase) / Math.max(.001, span.hold), time, span };
  }

  function visibleWindow(rawTime) {
    const phase = phaseAt(rawTime);
    if (phase.name === "write") return { start: 0, end: phaseEase(phase.progress, "write"), phase };
    if (phase.name === "flow") return { start: 0, end: 1, phase };
    if (phase.name === "erase") return { start: phaseEase(phase.progress, "erase"), end: 1, phase };
    return { start: 1, end: 1, phase };
  }

  function canvasDimensions() {
    if (inputs.canvasPreset.value === "custom") {
      return [
        clamp(Math.round((Number(inputs.canvasWidth.value) || 1920) / 2) * 2, 240, 3840),
        clamp(Math.round((Number(inputs.canvasHeight.value) || 1080) / 2) * 2, 240, 3840)
      ];
    }
    return inputs.canvasPreset.value.split("x").map(Number);
  }

  function fontSpec(size, overrideFamily) {
    const preset = window.STGFontLibrary?.preset(inputs.fontSelect.value);
    const family = overrideFamily || window.STGFontLibrary?.family(inputs.fontSelect.value) || "sans-serif";
    return `${preset?.style || "normal"} ${preset?.weight || 700} ${size}px ${family}`;
  }

  function spacedTextMetrics(context, text, size, spacing) {
    context.font = fontSpec(size);
    const glyphs = Array.from(text || " ");
    const widths = glyphs.map((glyph) => context.measureText(glyph).width);
    return { glyphs, widths, total: widths.reduce((sum, value) => sum + value, 0) + Math.max(0, glyphs.length - 1) * spacing };
  }

  function drawSpacedText(context, text, centerX, centerY, size, spacing, color) {
    const metrics = spacedTextMetrics(context, text, size, spacing);
    context.save();
    context.font = fontSpec(size);
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = color;
    let cursor = centerX - metrics.total / 2;
    metrics.glyphs.forEach((glyph, index) => {
      context.fillText(glyph, cursor, centerY);
      cursor += metrics.widths[index] + spacing;
    });
    context.restore();
    return metrics;
  }

  function fitBaseText(context, text, width, height, unit) {
    const desired = Number(inputs.fontSize.value) * unit;
    const spacing = Number(inputs.letterSpacing.value) * unit;
    const maxWidth = width * .76;
    const metrics = spacedTextMetrics(context, text, desired, spacing);
    const scale = metrics.total > maxWidth ? maxWidth / metrics.total : 1;
    return { size: desired * scale, spacing: spacing * scale };
  }

  function drawBackground(context, width, height) {
    context.fillStyle = inputs.backgroundColor.value;
    context.fillRect(0, 0, width, height);
    const image = state.background;
    if (!image || !image.complete || !image.naturalWidth) return;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function loadReferenceAtlas() {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => { state.referenceAtlas = image; resolve(); };
      image.onerror = () => { state.referenceAtlas = null; resolve(); };
      image.src = REFERENCE_ATLAS_SRC;
    });
  }

  function usesReferenceAtlas(text) {
    const expected = {
      fontSelect: "stg:roboto-condensed", fontSize: "270", letterSpacing: "2", textColor: "#080808",
      brushColor: "#ef39d4", textureColor: "#8613c6", brushScale: "100", brushWidth: "100",
      positionX: "50", positionY: "52", textureDensity: "100", textureSpeed: "100", motionEase: "smooth"
    };
    return text.toLocaleUpperCase() === "TIME"
      && state.referenceAtlas?.complete
      && state.referenceAtlas.naturalWidth
      && Object.entries(expected).every(([key, value]) => inputs[key].value.toLocaleLowerCase() === value);
  }

  function referenceTime(rawTime) {
    const phase = phaseAt(rawTime);
    const [start, end] = REFERENCE_PHASES[phase.name];
    return mix(start, end, clamp(phase.progress));
  }

  function drawReferenceAtlas(context, rawTime, width, height) {
    const logicalFrame = Math.min(REFERENCE_FRAME.count - 1, Math.floor(referenceTime(rawTime) * REFERENCE_FRAME.fps));
    const frame = (logicalFrame + REFERENCE_FRAME.offset) % REFERENCE_FRAME.count;
    const column = frame % REFERENCE_FRAME.columns;
    const row = Math.floor(frame / REFERENCE_FRAME.columns);
    const scale = Math.min(width / REFERENCE_FRAME.width, height / REFERENCE_FRAME.height);
    const drawWidth = REFERENCE_FRAME.width * scale;
    const drawHeight = REFERENCE_FRAME.height * scale;
    const x = width * .5 - REFERENCE_FRAME.width * .5 * scale;
    const y = height * .52 - REFERENCE_FRAME.height * .52 * scale;
    context.drawImage(
      state.referenceAtlas,
      column * REFERENCE_FRAME.width,
      row * REFERENCE_FRAME.height,
      REFERENCE_FRAME.width,
      REFERENCE_FRAME.height,
      x,
      y,
      drawWidth,
      drawHeight
    );
  }

  function exactTransform(width, height) {
    const scale = Math.min(width / 720, height / 405) * Number(inputs.brushScale.value) / 100;
    return {
      scale,
      x: width * Number(inputs.positionX.value) / 100 - 360 * scale,
      y: height * Number(inputs.positionY.value) / 100 - 210 * scale
    };
  }

  function transformPoint(point, transform) {
    return { x: transform.x + point.x * transform.scale, y: transform.y + point.y * transform.scale, angle: point.angle || 0 };
  }

  function strokeLocalWindow(stroke, start, end) {
    const length = Math.max(.0001, stroke.end - stroke.start);
    return {
      start: clamp((start - stroke.start) / length),
      end: clamp((end - stroke.start) / length)
    };
  }

  function widthProfile(s) {
    const organic = .93 + Math.sin(s * Math.PI * 7.2) * .08 + Math.sin(s * Math.PI * 17.4) * .035;
    const head = mix(.58, 1, smoothstep(clamp(s / .055)));
    const tail = mix(.72, 1, smoothstep(clamp((1 - s) / .07)));
    return organic * Math.min(head, tail);
  }

  function drawSampledStroke(context, stroke, globalStart, globalEnd, transform, baseWidth) {
    const range = strokeLocalWindow(stroke, globalStart, globalEnd);
    if (range.end <= range.start) return;
    if (stroke.dot) {
      if (range.end < .05 || range.start >= 1) return;
      const point = transformPoint({ x: stroke.dot[0], y: stroke.dot[1] }, transform);
      context.beginPath();
      context.fillStyle = "#fff";
      context.arc(point.x, point.y, baseWidth * stroke.width * .43, 0, Math.PI * 2);
      context.fill();
      return;
    }
    const points = stroke.samples;
    let previous = null;
    points.forEach((sample) => {
      if (sample.s < range.start || sample.s > range.end) return;
      const point = transformPoint(sample, transform);
      if (previous) {
        const width = baseWidth * stroke.width * widthProfile(sample.s);
        context.strokeStyle = "#fff";
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.stroke();
      }
      previous = point;
    });
  }

  function pointOnMain(u, transform) {
    const samples = authored[0].samples;
    const index = clamp(u) * (samples.length - 1);
    const low = Math.floor(index);
    const high = Math.min(samples.length - 1, low + 1);
    const amount = index - low;
    const a = samples[low];
    const b = samples[high];
    return transformPoint({ x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount), angle: mix(a.angle, b.angle, amount) }, transform);
  }

  function ensureScratch(width, height) {
    if (maskCanvas.width !== width || maskCanvas.height !== height) {
      maskCanvas.width = paintCanvas.width = width;
      maskCanvas.height = paintCanvas.height = height;
    }
  }

  function paintTexture(context, width, height, rawTime, transform, visible) {
    context.globalCompositeOperation = "source-atop";
    const density = Number(inputs.textureDensity.value) / 100;
    const speed = Number(inputs.textureSpeed.value) / 100;
    const count = Math.max(5, Math.round(10 * density));
    context.strokeStyle = inputs.textureColor.value;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (let index = 0; index < count; index += 1) {
      const seed = fract(Math.sin(index * 41.31) * 928.13);
      const head = fract(index / count + rawTime * .075 * speed + seed * .035);
      const wormLength = .035 + seed * .015;
      context.lineWidth = transform.scale * mix(12, 18, seed);
      context.beginPath();
      let hasPoint = false;
      const steps = 12;
      for (let step = 0; step <= steps; step += 1) {
        const u = head + wormLength * (step / steps);
        if (u > 1 || u < visible.start || u > visible.end) continue;
        const point = pointOnMain(u, transform);
        const wave = Math.sin(step / steps * Math.PI * 2 + index * 1.93 + rawTime * 1.2 * speed);
        const offset = wave * transform.scale * mix(2.5, 7, seed);
        const x = point.x - Math.sin(point.angle) * offset;
        const y = point.y + Math.cos(point.angle) * offset;
        if (!hasPoint) context.moveTo(x, y);
        else context.lineTo(x, y);
        hasPoint = true;
      }
      if (hasPoint) context.stroke();
    }
    const dot = transformPoint({ x: 329, y: 153 }, transform);
    if (visible.start < .52 && visible.end > .48) {
      context.fillStyle = inputs.textureColor.value;
      context.beginPath();
      context.ellipse(dot.x - 3 * transform.scale, dot.y + 2 * transform.scale, 7 * transform.scale, 12 * transform.scale, .55, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = "source-over";
  }

  function drawExactBrush(context, rawTime, width, height, visible) {
    ensureScratch(width, height);
    const mask = maskCanvas.getContext("2d");
    const paint = paintCanvas.getContext("2d");
    mask.setTransform(1, 0, 0, 1, 0, 0);
    paint.setTransform(1, 0, 0, 1, 0, 0);
    mask.clearRect(0, 0, width, height);
    paint.clearRect(0, 0, width, height);
    const transform = exactTransform(width, height);
    const baseWidth = 37 * transform.scale * Number(inputs.brushWidth.value) / 100;
    authored.forEach((stroke) => drawSampledStroke(mask, stroke, visible.start, visible.end, transform, baseWidth));
    paint.drawImage(maskCanvas, 0, 0);
    paint.globalCompositeOperation = "source-in";
    paint.fillStyle = inputs.brushColor.value;
    paint.fillRect(0, 0, width, height);
    paintTexture(paint, width, height, rawTime, transform, visible);
    context.drawImage(paintCanvas, 0, 0);
  }

  function drawGenericBrush(context, rawTime, width, height, visible, text, baseFit, unit) {
    ensureScratch(width, height);
    const mask = maskCanvas.getContext("2d");
    const paint = paintCanvas.getContext("2d");
    mask.setTransform(1, 0, 0, 1, 0, 0);
    paint.setTransform(1, 0, 0, 1, 0, 0);
    mask.clearRect(0, 0, width, height);
    paint.clearRect(0, 0, width, height);
    const centerX = width * Number(inputs.positionX.value) / 100;
    const centerY = height * Number(inputs.positionY.value) / 100 + baseFit.size * .2;
    const textMetrics = spacedTextMetrics(context, text.toLocaleUpperCase(), baseFit.size, baseFit.spacing);
    const span = Math.min(width * .8, Math.max(baseFit.size * 1.25, textMetrics.total * 1.08));
    const left = centerX - span / 2;
    const right = centerX + span / 2;
    const clipLeft = mix(left, right, visible.start);
    const clipRight = mix(left, right, visible.end);
    mask.save();
    mask.beginPath();
    mask.rect(clipLeft, centerY - baseFit.size, Math.max(0, clipRight - clipLeft), baseFit.size * 2);
    mask.clip();
    mask.strokeStyle = "#fff";
    mask.lineJoin = "round";
    mask.lineCap = "round";
    mask.lineWidth = Math.max(8, 34 * unit * Number(inputs.brushWidth.value) / 100 * Number(inputs.brushScale.value) / 100);
    mask.beginPath();
    mask.moveTo(left, centerY + baseFit.size * .2);
    mask.bezierCurveTo(
      left + span * .2, centerY - baseFit.size * .18,
      left + span * .4, centerY + baseFit.size * .18,
      centerX, centerY
    );
    mask.bezierCurveTo(
      left + span * .64, centerY - baseFit.size * .16,
      left + span * .78, centerY + baseFit.size * .2,
      right, centerY - baseFit.size * .04
    );
    mask.stroke();
    mask.restore();
    paint.drawImage(maskCanvas, 0, 0);
    paint.globalCompositeOperation = "source-in";
    paint.fillStyle = inputs.brushColor.value;
    paint.fillRect(0, 0, width, height);
    paint.globalCompositeOperation = "source-atop";
    paint.fillStyle = inputs.textureColor.value;
    const speed = Number(inputs.textureSpeed.value) / 100;
    const density = Number(inputs.textureDensity.value) / 100;
    const blobs = Math.max(5, Math.round(9 * density));
    for (let index = 0; index < blobs; index += 1) {
      const u = fract(index / blobs + rawTime * .09 * speed);
      if (u < visible.start || u > visible.end) continue;
      const x = mix(left, right, u);
      const y = centerY + Math.sin(u * Math.PI * 4 + .6) * baseFit.size * .09;
      paint.beginPath();
      paint.ellipse(x, y, baseFit.size * .075, baseFit.size * .032, Math.sin(index) * .55, 0, Math.PI * 2);
      paint.fill();
    }
    paint.globalCompositeOperation = "source-over";
    context.drawImage(paintCanvas, 0, 0);
  }

  function renderFrame(target, rawTime, width, height, backingWidth = width, backingHeight = height) {
    const targetWidth = Math.max(1, Math.round(backingWidth));
    const targetHeight = Math.max(1, Math.round(backingHeight));
    if (target.width !== targetWidth || target.height !== targetHeight) {
      target.width = targetWidth;
      target.height = targetHeight;
    }
    const context = target.getContext("2d", { alpha: false, willReadFrequently: target !== canvas });
    context.setTransform(targetWidth / width, 0, 0, targetHeight / height, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    drawBackground(context, width, height);
    const text = inputs.textInput.value.trim() || " ";
    const exactReference = usesReferenceAtlas(text);
    const unit = Math.min(width / 720, height / 405);
    const fit = fitBaseText(context, text.toLocaleUpperCase(), width, height, unit);
    const centerX = width * Number(inputs.positionX.value) / 100;
    const centerY = height * Number(inputs.positionY.value) / 100;
    const visible = visibleWindow(rawTime);
    if (exactReference) {
      drawReferenceAtlas(context, rawTime, width, height);
    } else {
      if (visible.end > visible.start + .0001) {
        if (text.toLocaleUpperCase() === "TIME") drawExactBrush(context, rawTime, width, height, visible);
        else drawGenericBrush(context, rawTime, width, height, visible, text, fit, unit);
      }
      drawSpacedText(context, text.toLocaleUpperCase(), centerX, centerY, fit.size, fit.spacing, inputs.textColor.value);
    }
    if (target === canvas) updateTimelinePlayhead(visible.phase);
  }

  function currentTime() {
    return state.paused ? state.pausedAt : (performance.now() - state.startedAt) / 1000;
  }

  function setTime(value) {
    const total = timing().total;
    state.pausedAt = ((value % total) + total) % total;
    state.startedAt = performance.now() - state.pausedAt * 1000;
    renderPreview(state.pausedAt);
  }

  function renderPreview(time = currentTime()) {
    const [width, height] = canvasDimensions();
    renderFrame(canvas, time, width, height, state.previewBacking.width, state.previewBacking.height);
  }

  function previewLoop() {
    renderPreview();
    state.raf = requestAnimationFrame(previewLoop);
  }

  function updateStageLayout() {
    const [width, height] = canvasDimensions();
    const preview = document.body.classList.contains("is-preview");
    const availableWidth = preview ? window.innerWidth : Math.max(160, workspace.clientWidth - 52);
    const availableHeight = preview ? window.innerHeight : Math.max(160, workspace.clientHeight - 52);
    const fit = Math.min(availableWidth / width, availableHeight / height);
    const cssWidth = Math.max(1, Math.round(width * fit));
    const cssHeight = Math.max(1, Math.round(height * fit));
    stageShell.style.width = `${cssWidth}px`;
    stageShell.style.height = `${cssHeight}px`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    state.previewBacking = { width: Math.round(cssWidth * dpr), height: Math.round(cssHeight * dpr) };
    $("#sizeBadge").textContent = `${width} × ${height}`;
    renderPreview();
  }

  function timelinePhases() {
    const span = timing();
    return [
      { id: "write", label: "写入", duration: span.write, color: PHASE_COLORS[0] },
      { id: "flow", label: "流动", duration: span.flow, color: PHASE_COLORS[1] },
      { id: "erase", label: "擦除", duration: span.erase, color: PHASE_COLORS[2] },
      { id: "hold", label: "底字", duration: span.hold, color: PHASE_COLORS[3] }
    ];
  }

  function renderTimeline() {
    const phases = timelinePhases();
    const total = timing().total;
    $("#timelineBar").innerHTML = phases.map((phase) =>
      `<div class="me-choreo-block" data-phase="${phase.id}" style="width:${phase.duration / total * 100}%;background:${phase.color}"><b>${phase.label}</b><small>${phase.duration.toFixed(2)}s</small></div>`
    ).join("");
    $("#timelineLegend").innerHTML = phases.map((phase) =>
      `<span><i style="background:${phase.color}"></i>${phase.label} · ${phase.duration.toFixed(2)} 秒</span>`
    ).join("");
  }

  function updateTimelinePlayhead(phase) {
    const total = phase.span.total;
    $("#timelinePlayhead").style.left = `${phase.time / total * 100}%`;
    document.querySelectorAll(".me-choreo-block").forEach((block) => block.classList.toggle("is-active", block.dataset.phase === phase.name));
  }

  function updateOutputs() {
    const map = {
      fontSizeOut: `${inputs.fontSize.value}`,
      letterSpacingOut: `${inputs.letterSpacing.value}`,
      brushScaleOut: `${inputs.brushScale.value}%`,
      brushWidthOut: `${inputs.brushWidth.value}%`,
      positionXOut: `${inputs.positionX.value}%`,
      positionYOut: `${inputs.positionY.value}%`,
      textureDensityOut: `${inputs.textureDensity.value}%`,
      textureSpeedOut: `${inputs.textureSpeed.value}%`,
      writeDurationOut: `${(Number(inputs.writeDuration.value) / 100).toFixed(2)} 秒`,
      flowDurationOut: `${(Number(inputs.flowDuration.value) / 100).toFixed(2)} 秒`,
      eraseDurationOut: `${(Number(inputs.eraseDuration.value) / 100).toFixed(2)} 秒`,
      holdDurationOut: `${(Number(inputs.holdDuration.value) / 100).toFixed(2)} 秒`
    };
    Object.entries(map).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    $("#pathModeHint").textContent = inputs.textInput.value.trim().toLocaleUpperCase() === "TIME"
      ? "TIME 使用完整流彩笔迹；其他文字自动使用通用笔刷。"
      : "当前文字使用通用笔刷；输入 TIME 可恢复完整流彩笔迹。";
    $("#customSize").hidden = inputs.canvasPreset.value !== "custom";
    $("#customDuration").hidden = inputs.exportDuration.value !== "custom";
    renderTimeline();
  }

  function schemeData() {
    const values = {};
    Object.entries(inputs).forEach(([key, input]) => { values[key] = input.value; });
    return { version: SCHEME_VERSION, effect: EFFECT_ID, values, background: state.backgroundDataUrl || "" };
  }

  function loadBackground(dataUrl) {
    state.backgroundDataUrl = dataUrl || "";
    if (!dataUrl) { state.background = null; return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { state.background = image; resolve(); };
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  async function applyScheme(data) {
    if (!data || data.effect !== EFFECT_ID) throw new Error("不是流彩笔迹方案");
    Object.entries(data.values || {}).forEach(([key, value]) => {
      if (inputs[key] && value != null) inputs[key].value = String(value);
    });
    await loadBackground(data.background || "");
    updateOutputs();
    updateStageLayout();
    setTime(0);
  }

  function queueAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schemeData()));
        schemeStatus.textContent = "已自动保存当前方案。";
      } catch (_) {
        schemeStatus.textContent = "内容较大，请下载方案保存。";
      }
    }, 260);
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1800);
  }

  function setPaused(paused) {
    if (paused === state.paused) return;
    if (paused) {
      state.pausedAt = currentTime() % timing().total;
      state.paused = true;
    } else {
      state.startedAt = performance.now() - state.pausedAt * 1000;
      state.paused = false;
    }
    const label = state.paused ? "播放" : "暂停";
    $("#pauseButton").textContent = label;
    $("#stagePauseButton").textContent = label;
  }

  function replay() {
    state.pausedAt = 0;
    state.startedAt = performance.now();
    if (state.paused) setPaused(false);
  }

  function exportDurationSeconds() {
    if (inputs.exportDuration.value === "full") return timing().total;
    if (inputs.exportDuration.value === "custom") return clamp(Number(inputs.exportDurationCustom.value) || timing().total, .5, 15);
    return Math.max(.5, Number(inputs.exportDuration.value) || timing().total);
  }

  function exportFps() { return clamp(Math.round(Number(inputs.exportFps.value) || 30), 15, 60); }
  function makeExportCanvas() {
    const [width, height] = canvasDimensions();
    const output = document.createElement("canvas");
    output.width = Math.round(width / 2) * 2;
    output.height = Math.round(height / 2) * 2;
    return output;
  }

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }

  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `ribbon-ink-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas();
    const fps = exportFps();
    const duration = exportDurationSeconds();
    const frames = Math.max(1, Math.ceil(duration * fps));
    setExportBusy(true, `正在准备 GIF · 0 / ${frames} 帧`);
    try {
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
      for (let frame = 0; frame < frames; frame += 1) {
        renderFrame(output, frame / fps, output.width, output.height);
        const centisecondStart = Math.round(frame * duration * 100 / frames);
        const centisecondEnd = Math.round((frame + 1) * duration * 100 / frames);
        gif.addFrame(output, { copy: true, delay: Math.max(10, (centisecondEnd - centisecondStart) * 10) });
      }
      gif.on("progress", (value) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(value * 100)}%`; });
      gif.on("finished", (blob) => {
        downloadBlob(blob, `ribbon-ink-${output.width}x${output.height}-${fps}fps.gif`);
        setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height} · ${fps} FPS`);
      });
      gif.render();
    } catch (error) {
      console.error(error);
      setExportBusy(false, "GIF 编码失败，请降低尺寸后重试。");
    }
  });

  $("#exportVideo").addEventListener("click", async () => {
    if (!window.HME?.createH264MP4Encoder) { exportStatus.textContent = "MP4 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas();
    const context = output.getContext("2d", { willReadFrequently: true });
    const fps = exportFps();
    const duration = exportDurationSeconds();
    const frames = Math.max(1, Math.ceil(duration * fps));
    const filename = `ribbon-ink-${output.width}x${output.height}-${fps}fps.mp4`;
    let encoder;
    setExportBusy(true, `正在逐帧导出 MP4 · 0 / ${frames} 帧`);
    try {
      encoder = await HME.createH264MP4Encoder();
      encoder.outputFilename = filename;
      encoder.width = output.width;
      encoder.height = output.height;
      encoder.frameRate = fps;
      encoder.kbps = fps >= 60 ? 24000 : 18000;
      encoder.groupOfPictures = Math.max(12, Math.round(fps / 2));
      encoder.initialize();
      for (let frame = 0; frame < frames; frame += 1) {
        renderFrame(output, frame / fps, output.width, output.height);
        encoder.addFrameRgba(context.getImageData(0, 0, output.width, output.height).data);
        if (frame % 2 === 0 || frame === frames - 1) {
          exportStatus.textContent = `正在逐帧导出 MP4 · ${frame + 1} / ${frames}`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(filename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), filename);
      setExportBusy(false, `MP4 已生成 · ${output.width} × ${output.height} · ${fps} FPS`);
    } catch (error) {
      console.error(error);
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder?.delete(); } catch (_) {}
    }
  });

  Object.entries(inputs).forEach(([key, input]) => {
    if (!input) return;
    const handler = () => {
      updateOutputs();
      if (["canvasPreset", "canvasWidth", "canvasHeight"].includes(key)) updateStageLayout();
      queueAutosave();
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });

  $("#backgroundUpload").addEventListener("change", (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      schemeStatus.textContent = "当前版本仅接收图片背景。";
      event.currentTarget.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await loadBackground(String(reader.result));
      queueAutosave();
      renderPreview();
      schemeStatus.textContent = `已载入背景：${file.name}`;
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  });

  $("#clearBackground").addEventListener("click", () => {
    loadBackground("");
    queueAutosave();
    renderPreview();
    schemeStatus.textContent = "已清除背景图片。";
  });

  $("#saveScheme").addEventListener("click", () => {
    downloadBlob(new Blob([JSON.stringify(schemeData(), null, 2)], { type: "application/json" }), "ribbon-ink-scheme.json");
    schemeStatus.textContent = "方案已保存。";
  });

  $("#importScheme").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await applyScheme(JSON.parse(await file.text()));
      queueAutosave();
      schemeStatus.textContent = "方案已导入。";
    } catch (error) {
      schemeStatus.textContent = error.message || "方案导入失败。";
    }
    input.value = "";
  });

  $("#resetScheme").addEventListener("click", async () => {
    await applyScheme({ version: SCHEME_VERSION, effect: EFFECT_ID, values: defaultValues, background: "" });
    queueAutosave();
    schemeStatus.textContent = "已恢复默认方案。";
  });

  $("#clearScheme").addEventListener("click", async () => {
    const cleared = { ...defaultValues, textInput: "" };
    await applyScheme({ version: SCHEME_VERSION, effect: EFFECT_ID, values: cleared, background: "" });
    localStorage.removeItem(STORAGE_KEY);
    schemeStatus.textContent = "已清空内容，可重新编辑。";
  });

  $("#pauseButton").addEventListener("click", () => setPaused(!state.paused));
  $("#stagePauseButton").addEventListener("click", () => setPaused(!state.paused));
  $("#replayButton").addEventListener("click", replay);
  $("#stageReplayButton").addEventListener("click", replay);
  $("#backButton").addEventListener("click", () => { setPaused(true); setTime(state.pausedAt - 1 / exportFps()); });
  $("#forwardButton").addEventListener("click", () => { setPaused(true); setTime(state.pausedAt + 1 / exportFps()); });
  $("#timelineTrack").addEventListener("click", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPaused(true);
    setTime((event.clientX - rect.left) / rect.width * timing().total);
  });

  window.addEventListener("resize", updateStageLayout);
  window.addEventListener("beforeunload", () => cancelAnimationFrame(state.raf));
  if (urlParams.has("preview")) document.body.classList.add("is-preview");

  window.RibbonInk = { renderFrame, timing, phaseAt, visibleWindow, schemeData, applyScheme, setTime, setPaused, canvasDimensions };

  async function initialize() {
    window.STGFontLibrary?.enhanceAll(document);
    await loadReferenceAtlas();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    try {
      await applyScheme(saved?.effect === EFFECT_ID ? saved : { version: SCHEME_VERSION, effect: EFFECT_ID, values: defaultValues, background: "" });
      schemeStatus.textContent = saved?.effect === EFFECT_ID ? "已恢复上次自动保存的方案。" : "已载入默认方案。";
    } catch (error) {
      console.warn(error);
    }
    await document.fonts.ready;
    updateOutputs();
    updateStageLayout();
    if (urlParams.has("frame")) {
      setPaused(true);
      setTime(Number(urlParams.get("frame")) || 0);
    }
    previewLoop();
  }
  initialize();
})();
