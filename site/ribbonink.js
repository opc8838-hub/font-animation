(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#stageCanvas");
  const stageShell = $("#stageShell");
  const workspace = $("#workspace");
  const exportStatus = $("#exportStatus");
  const schemeStatus = $("#schemeStatus");
  const STORAGE_KEY = "me-ribbon-ink-autosave-v3";
  const EFFECT_ID = "ribbon-ink";
  const SCHEME_VERSION = 12;
  const freehand = window.RibbonInkFreehand;
  let drawing = freehand.validate(null);
  let compiledDrawing = freehand.compile(drawing);
  let redoStrokes = [];
  let activePointer = null;
  let lastPointTime = 0;
  let drawingEnabled = false;
  const PHASE_COLORS = ["#ef4d86", "#6a2f8c", "#ee7b34", "#2589d8"];
  const urlParams = new URLSearchParams(location.search);
  const BRUSH_MOTHER_SRC = "assets/ribbonink/ribbonink-brush-mother.png?v=20260902-1";
  const MOTHER_FRAME = { width: 1672, height: 941 };
  const DOT_REGION = { x: 520, y: 150, width: 190, height: 205, centerX: 612, centerY: 252 };
  const PALETTES = {
    reference: ["#f34bd9", "#a40de4", "#ff78e9", "#7827d8", "#f33ccd"],
    apple: ["#ff375f", "#ff9f0a", "#ffd60a", "#30d158", "#0a84ff"],
    ocean: ["#64d2ff", "#0a84ff", "#5e5ce6", "#30d158", "#00c7be"],
    sunset: ["#ff2d55", "#ff375f", "#ff9f0a", "#ffd60a", "#bf5af2"]
  };

  const inputIds = [
    "page1Weave", "page1Choreo",
    "singleTextExit", "singleEmptyHold",
    "page2PaletteMode", "page2PalettePreset", "page2InkColor1", "page2InkColor2", "page2InkColor3", "page2InkColor4", "page2InkColor5",
    "page2TextExit", "page2EmptyHold",
    "page2Rhythm", "page2SlowPosition", "page2SlowWidth", "page2SlowStrength", "page2Finish",
    "sequenceMode", "page2Route", "page2Weave", "page2Text", "page2Font", "page2Size", "page2Spacing", "page2Color", "bridgeDuration", "page2Pop", "page2Hold",
    "drawingMode", "freehandWidth",
    "canvasPreset", "canvasWidth", "canvasHeight", "textInput", "fontSelect", "fontSize",
    "letterSpacing", "textColor", "backgroundColor", "palettePreset",
    "inkColor1", "inkColor2", "inkColor3", "inkColor4", "inkColor5",
    "brushScale", "brushWidth", "positionX", "positionY", "textureDensity", "textureSpeed",
    "dotScale", "dotDelay",
    "writeDuration", "flowDuration", "eraseDuration", "holdDuration", "motionEase",
    "snakeIntensity", "letterImpact",
    "exportDuration", "exportDurationCustom", "exportFps"
  ];
  const inputs = Object.fromEntries(inputIds.map((id) => [id, $(`#${id}`)]));

  const defaultValues = {
    page1Weave: "weave", page1Choreo: "auto",
    singleTextExit: "16", singleEmptyHold: "20",
    page2PaletteMode: "inherit", page2PalettePreset: "reference",
    page2InkColor1: "#f34bd9", page2InkColor2: "#a40de4", page2InkColor3: "#ff78e9", page2InkColor4: "#7827d8", page2InkColor5: "#f33ccd",
    page2TextExit: "16", page2EmptyHold: "20",
    page2Rhythm: "snake", page2SlowPosition: "48", page2SlowWidth: "30", page2SlowStrength: "82", page2Finish: "36",
    sequenceMode: "single", page2Route: "loop", page2Weave: "weave", page2Text: "FLOW", page2Font: "stg:roboto-condensed", page2Size: "270", page2Spacing: "2", page2Color: "#080808", bridgeDuration: "90", page2Pop: "42", page2Hold: "35",
    drawingMode: "time", freehandWidth: "28",
    canvasPreset: "1920x1080", canvasWidth: "1920", canvasHeight: "1080",
    textInput: "TIME", fontSelect: "stg:roboto-condensed", fontSize: "270", letterSpacing: "2",
    textColor: "#080808", backgroundColor: "#f7f7f5", palettePreset: "reference",
    inkColor1: "#f34bd9", inkColor2: "#a40de4", inkColor3: "#ff78e9", inkColor4: "#7827d8", inkColor5: "#f33ccd",
    brushScale: "100", brushWidth: "100", positionX: "50", positionY: "52",
    textureDensity: "100", textureSpeed: "100", dotScale: "100", dotDelay: "46",
    writeDuration: "50", flowDuration: "87",
    eraseDuration: "57", holdDuration: "56", motionEase: "snake",
    snakeIntensity: "82", letterImpact: "100",
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
    brushMother: null,
    motherDetail: null,
    motherHighlight: null,
    previewBacking: { width: 1, height: 1 }
  };

  const shapeCanvas = document.createElement("canvas");
  const revealCanvas = document.createElement("canvas");
  const detailLayerCanvas = document.createElement("canvas");
  const paintCanvas = document.createElement("canvas");
  const mainToneCanvas = document.createElement("canvas");
  const textLayerCanvas = document.createElement("canvas");
  const foregroundTextCanvas = document.createElement("canvas");
  const singleExitCanvas = document.createElement("canvas");
  const textLayerKeys = ["", ""];
  const mEdgeCache = new Map();
  const page2Occlusion = document.createElement("canvas");
  let sequenceRouteKey = "", sequenceRoute;
  const glyphEngine = window.RibbonInkGlyphs;
  const glyphRenderer = glyphEngine.renderer(page2FontSpec);
  const firstGlyphRenderer = glyphEngine.renderer(fontSpec, {
    contacts: firstGlyphContacts,
    contactKey: () => [inputs.brushScale.value, inputs.brushWidth.value, inputs.positionX.value, inputs.positionY.value,
      inputs.motionEase.value, inputs.snakeIntensity.value, timing(), twoPages()]
  });
  let page1Glyphs = glyphEngine.reconcile([], defaultValues.textInput);
  let selectedFirstGlyphs = new Set([page1Glyphs[0].id]);
  let lastFirstGlyphFrame;
  const firstRearMask = document.createElement("canvas");
  const firstOver = document.createElement("canvas");
  let page2Glyphs = glyphEngine.reconcile([], defaultValues.page2Text);
  let selectedGlyphs = new Set([page2Glyphs[0].id]);
  let lastGlyphFrame;
  let mainToneKey = "";

  const authored = [
    {
      start: 0,
      end: .88,
      width: 1,
      segments: [
        [[-25, 409], [40, 332], [141, 245], [209, 204]],
        [[209, 204], [264, 172], [279, 189], [259, 211]],
        [[259, 211], [221, 235], [190, 284], [222, 298]],
        [[222, 298], [245, 300], [297, 237], [342, 213]],
        [[342, 213], [427, 166], [506, 121], [600, 126]],
        [[600, 126], [615, 138], [529, 159], [503, 183]],
        [[503, 183], [490, 200], [556, 166], [576, 181]],
        [[576, 181], [590, 199], [489, 243], [503, 275]],
        [[503, 275], [516, 310], [598, 246], [756, 190]]
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
      dot: [260, 112]
    }
  ];

  function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
  function mix(a, b, amount) { return a + (b - a) * amount; }
  function fract(value) { return value - Math.floor(value); }
  function smoothstep(value) { const x = clamp(value); return x * x * (3 - 2 * x); }
  function easeOutQuint(value) { return 1 - Math.pow(1 - clamp(value), 5); }
  function easeInCubic(value) { return Math.pow(clamp(value), 3); }

  function snakeEase(value, phase) {
    const x = clamp(value);
    const anchors = phase === "erase"
      ? [[0, 0], [.18, .27], [.46, .38], [.68, .78], [1, 1]]
      : [[0, 0], [.16, .29], [.45, .40], [.64, .79], [1, 1]];
    let segmentIndex = anchors.length - 2;
    for (let index = 0; index < anchors.length - 1; index += 1) {
      if (x <= anchors[index + 1][0]) { segmentIndex = index; break; }
    }
    const [timeA, progressA] = anchors[segmentIndex];
    const [timeB, progressB] = anchors[segmentIndex + 1];
    const local = clamp((x - timeA) / Math.max(.001, timeB - timeA));
    // Monotone Hermite interpolation: slow down without stopping at every knot.
    const slopes = anchors.slice(1).map((p, i) => (p[1] - anchors[i][1]) / (p[0] - anchors[i][0]));
    const tangent = (i) => {
      if (i === 0) return slopes[0];
      if (i === anchors.length - 1) return slopes[slopes.length - 1];
      const a = anchors[i][0] - anchors[i - 1][0];
      const b = anchors[i + 1][0] - anchors[i][0];
      return 3 * (a + b) / ((2 * b + a) / slopes[i - 1] + (b + 2 * a) / slopes[i]);
    };
    const t2 = local * local, t3 = t2 * local, span = timeB - timeA;
    const stepped = (2 * t3 - 3 * t2 + 1) * progressA + (t3 - 2 * t2 + local) * span * tangent(segmentIndex)
      + (-2 * t3 + 3 * t2) * progressB + (t3 - t2) * span * tangent(segmentIndex + 1);
    const intensity = Number(inputs.snakeIntensity.value) / 100;
    return mix(smoothstep(x), stepped, intensity);
  }

  function phaseEase(value, phase) {
    const mode = inputs.motionEase.value;
    if (mode === "direct") return clamp(value);
    if (mode === "snappy") return phase === "erase" ? easeInCubic(value) : easeOutQuint(value);
    if (mode === "snake") return snakeEase(value, phase);
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

  function twoPages() { return inputs.drawingMode.value === "time" && inputs.sequenceMode.value === "double"; }

  function timing() {
    const write = Number(inputs.writeDuration.value) / 100;
    const flow = Number(inputs.flowDuration.value) / 100;
    const erase = Number(inputs.eraseDuration.value) / 100;
    const hold = Number(inputs.holdDuration.value) / 100;
    if (twoPages()) {
      const bridge = Number(inputs.bridgeDuration.value) / 100;
      const finish = Number(inputs.page2Finish.value) / 100;
      const endHold = Number(inputs.page2Hold.value) / 100;
      const textExit = Number(inputs.page2TextExit.value) / 100;
      const emptyHold = Number(inputs.page2EmptyHold.value) / 100;
      const page2 = finish + endHold + textExit + emptyHold;
      return { write, flow, erase, hold, bridge, page2, finish, endHold, textExit, emptyHold, reset: 0, total: write + flow + bridge + page2 };
    }
    if (inputs.drawingMode.value === "freehand") return { write, flow, erase, hold, total: write + flow + erase + hold };
    const textExit = Number(inputs.singleTextExit.value) / 100;
    const emptyHold = Number(inputs.singleEmptyHold.value) / 100;
    return { write, flow, erase, hold, textExit, emptyHold, total: write + flow + erase + hold + textExit + emptyHold };
  }

  function phaseAt(rawTime) {
    const span = timing();
    const time = ((rawTime % span.total) + span.total) % span.total;
    if (time < span.write) return { name: "write", progress: time / Math.max(.001, span.write), time, span };
    if (time < span.write + span.flow) return { name: "flow", progress: (time - span.write) / Math.max(.001, span.flow), time, span };
    if (twoPages()) {
      const elapsed = time - span.write - span.flow;
      if (elapsed < span.bridge) return { name: "bridge", progress: elapsed / span.bridge, time, span };
      if (elapsed < span.bridge + span.finish) return { name: "page2", progress: (elapsed - span.bridge) / span.finish, time, span };
      const afterInk = elapsed - span.bridge - span.finish;
      if (afterInk < span.endHold) return { name: "settled", progress: afterInk / span.endHold, time, span };
      if (afterInk < span.endHold + span.textExit) return { name: "textExit", progress: (afterInk - span.endHold) / span.textExit, time, span };
      return { name: "empty", progress: (afterInk - span.endHold - span.textExit) / Math.max(.001, span.emptyHold), time, span };
    }
    if (time < span.write + span.flow + span.erase) return { name: "erase", progress: (time - span.write - span.flow) / Math.max(.001, span.erase), time, span };
    const afterInk = time - span.write - span.flow - span.erase;
    if (inputs.drawingMode.value === "freehand") return { name: "hold", progress: afterInk / Math.max(.001, span.hold), time, span };
    if (afterInk < span.hold) return { name: "singleSettled", progress: afterInk / Math.max(.001, span.hold), time, span };
    if (afterInk < span.hold + span.textExit) return { name: "singleTextExit", progress: (afterInk - span.hold) / Math.max(.001, span.textExit), time, span };
    return { name: "singleEmpty", progress: (afterInk - span.hold - span.textExit) / Math.max(.001, span.emptyHold), time, span };
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

  function impactLetterState(visible) {
    const intensity = clamp(Number(inputs.letterImpact.value) / 100, 0, 1.4);
    let reaction = { alpha: 1, scaleX: 1, scaleY: 1 };
    if (visible.phase.name === "write") {
      const hit = smoothstep((visible.phase.progress - .04) / .36);
      reaction = {
        alpha: hit < .90 ? 1 : 0,
        scaleX: 1 + Math.sin(hit * Math.PI) * .16 - hit * .22,
        scaleY: 1 - hit * .89 - Math.sin(hit * Math.PI) * .09
      };
    } else if (visible.phase.name === "flow") {
      reaction = { alpha: 0, scaleX: .76, scaleY: .09 };
    } else if (visible.phase.name === "erase") {
      const release = clamp((visible.phase.progress - .36) / .42);
      const rising = release < .62;
      const spring = rising
        ? smoothstep(release / .62)
        : smoothstep((release - .62) / .38);
      reaction = {
        alpha: release > .04 ? 1 : 0,
        scaleX: rising ? mix(.76, .93, spring) : mix(.93, 1, spring),
        scaleY: rising ? mix(.09, 1.18, spring) : mix(1.18, 1, spring)
      };
    }
    return {
      alpha: clamp(mix(1, reaction.alpha, Math.min(1, intensity))),
      scaleX: mix(1, reaction.scaleX, intensity),
      scaleY: Math.max(.02, mix(1, reaction.scaleY, intensity))
    };
  }

  function endLetterState(visible) {
    const phase = visible.phase;
    let squeeze = 0;
    if (phase.name === "write") squeeze = smoothstep((phase.progress - .38) / .40);
    if (phase.name === "flow") squeeze = 1;
    if (phase.name === "erase") squeeze = 1 - easeOutBack((phase.progress - .64) / .30);
    const amount = clamp(Number(inputs.letterImpact.value) / 100, 0, 1.4);
    return { alpha: 1, scaleX: 1 - .16 * squeeze * amount, scaleY: 1 - .22 * squeeze * amount };
  }

  function mDiagonalEdge() {
    const font = fontSpec(512);
    const key = `${font}:${document.fonts.check(font, "M")}`;
    if (mEdgeCache.has(key)) return mEdgeCache.get(key);
    const scan = document.createElement("canvas");
    const ctx = scan.getContext("2d", { willReadFrequently: true });
    ctx.font = font;
    const metrics = ctx.measureText("M");
    const w = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    const h = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
    scan.width = w + 20;
    scan.height = h + 20;
    ctx.font = font;
    ctx.fillText("M", 10 + metrics.actualBoundingBoxLeft, 10 + metrics.actualBoundingBoxAscent);
    const pixels = ctx.getImageData(0, 0, scan.width, scan.height).data;
    const points = [];
    for (let y = 0; y < h; y += 1) {
      let ink = false, gap = -1;
      for (let x = Math.floor(w / 2); x < w; x += 1) {
        const alpha = pixels[((y + 10) * scan.width + x + 10) * 4 + 3];
        if (alpha > 128) {
          if (gap >= 0 && x - gap > 2) {
            if ((x + gap) / 2 > w * .6) points.push({ y: y / h, x: (gap + .5) / w });
            break;
          }
          ink = true;
        } else if (ink && gap < 0) gap = x;
      }
    }
    // The gap's left edge is the diagonal's real outer contour. Extend its
    // direction through the joined top, rather than slicing it vertically.
    let edge = { top: 1, bottom: 1 };
    if (points.length > 8) {
      const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const slope = points.reduce((sum, p) => sum + (p.y - meanY) * (p.x - meanX), 0)
        / points.reduce((sum, p) => sum + (p.y - meanY) ** 2, 0);
      const top = meanX - slope * meanY + 1 / w;
      edge = { top: clamp(top), bottom: clamp(top + slope) };
    }
    if (mEdgeCache.size >= 24) mEdgeCache.clear();
    mEdgeCache.set(key, edge);
    return edge;
  }

  function drawSpacedText(context, text, centerX, centerY, size, spacing, color, visible, foreground = false) {
    const metrics = spacedTextMetrics(context, text, size, spacing);
    context.save();
    context.font = fontSpec(size);
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillStyle = color;
    let cursor = centerX - metrics.total / 2;
    metrics.glyphs.forEach((glyph, index) => {
      if (foreground) {
        if (glyph === "M") {
          // Only M's central diagonals cross in front of the ribbon. Its stems
          // remain behind it; never repaint the whole word above the brush.
          const bounds = context.measureText(glyph);
          const left = cursor - bounds.actualBoundingBoxLeft;
          const top = centerY - bounds.actualBoundingBoxAscent;
          const w = bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight;
          const h = bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent;
          context.save();
          context.beginPath();
          context.moveTo(left + .24 * w, top);
          const edge = mDiagonalEdge();
          context.lineTo(left + edge.top * w, top);
          context.lineTo(left + edge.bottom * w, top + h);
          context.lineTo(left + .24 * w, top + h);
          context.closePath();
          context.clip();
          context.fillText(glyph, cursor, centerY);
          context.restore();
        }
      } else if ((glyph === "I" || glyph === "E") && visible) {
        const motion = glyph === "I" ? impactLetterState(visible) : endLetterState(visible);
        const glyphCenter = cursor + metrics.widths[index] / 2;
        const descent = context.measureText(glyph).actualBoundingBoxDescent;
        context.save();
        context.globalAlpha *= motion.alpha;
        // The source squashes into the baseline, not below it.
        context.translate(glyphCenter, centerY + descent);
        context.scale(motion.scaleX, motion.scaleY);
        context.fillText(glyph, -metrics.widths[index] / 2, -descent);
        context.restore();
      } else {
        context.fillText(glyph, cursor, centerY);
      }
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

  function prepareMotherMasks(image) {
    const scan = document.createElement("canvas");
    scan.width = MOTHER_FRAME.width;
    scan.height = MOTHER_FRAME.height;
    const scanContext = scan.getContext("2d", { willReadFrequently: true });
    scanContext.drawImage(image, 0, 0, scan.width, scan.height);
    const source = scanContext.getImageData(0, 0, scan.width, scan.height);
    const detail = scanContext.createImageData(scan.width, scan.height);
    const highlight = scanContext.createImageData(scan.width, scan.height);
    for (let index = 0; index < source.data.length; index += 4) {
      const red = source.data[index];
      const green = source.data[index + 1];
      const blue = source.data[index + 2];
      const alpha = source.data[index + 3];
      const purple = clamp((blue - red + 58) / 112);
      const light = clamp((red + green - 278) / 145) * (1 - purple * .45);
      detail.data[index] = detail.data[index + 1] = detail.data[index + 2] = 255;
      detail.data[index + 3] = Math.round(alpha * purple * .92);
      highlight.data[index] = highlight.data[index + 1] = highlight.data[index + 2] = 255;
      highlight.data[index + 3] = Math.round(alpha * light * .66);
    }
    const detailCanvas = document.createElement("canvas");
    const highlightCanvas = document.createElement("canvas");
    detailCanvas.width = highlightCanvas.width = scan.width;
    detailCanvas.height = highlightCanvas.height = scan.height;
    detailCanvas.getContext("2d").putImageData(detail, 0, 0);
    highlightCanvas.getContext("2d").putImageData(highlight, 0, 0);
    state.motherDetail = detailCanvas;
    state.motherHighlight = highlightCanvas;
  }

  function loadBrushMother() {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        state.brushMother = image;
        prepareMotherMasks(image);
        resolve();
      };
      image.onerror = () => {
        state.brushMother = null;
        state.motherDetail = state.motherHighlight = null;
        resolve();
      };
      image.src = BRUSH_MOTHER_SRC;
    });
  }

  function exactTransform(width, height) {
    const scale = Math.min(width / 720, height / 405) * Number(inputs.brushScale.value) / 100;
    return {
      scale,
      widthScale: Number(inputs.brushWidth.value) / 100,
      x: width * Number(inputs.positionX.value) / 100 - 360 * scale,
      y: height * Number(inputs.positionY.value) / 100 - 210 * scale
    };
  }

  function transformPoint(point, transform) {
    return {
      x: transform.x + point.x * transform.scale,
      y: transform.y + (210 + (point.y - 210) * transform.widthScale) * transform.scale,
      angle: point.angle || 0
    };
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
    const at = (s) => {
      const samples = stroke.samples;
      const hi = samples.findIndex(p => p.s >= s);
      if (hi <= 0) return hi === 0 ? samples[0] : samples[samples.length - 1];
      const a = samples[hi - 1], b = samples[hi];
      const t = (s - a.s) / Math.max(1e-8, b.s - a.s);
      return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), s };
    };
    const points = [at(range.start), ...stroke.samples.filter(p => p.s > range.start && p.s < range.end), at(range.end)];
    // This is only a reveal mask; the mother alpha owns the irregular width.
    // Batch the path instead of submitting hundreds of overlapping round strokes.
    context.strokeStyle = "#fff";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = baseWidth * stroke.width;
    context.beginPath();
    let started = false;
    points.forEach((sample) => {
      if (sample.s < range.start || sample.s > range.end) return;
      const point = transformPoint(sample, transform);
      if (started) context.lineTo(point.x, point.y);
      else context.moveTo(point.x, point.y);
      started = true;
    });
    if (started) context.stroke();
  }

  function pointOnMain(u, transform) {
    const samples = authored[0].samples;
    const s = clamp(u);
    let low = 0, high = samples.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (samples[mid].s < s) low = mid;
      else high = mid;
    }
    const a = samples[low];
    const b = samples[high];
    const amount = (s - a.s) / Math.max(1e-8, b.s - a.s);
    const turn = Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle));
    return transformPoint({ x: mix(a.x, b.x, amount), y: mix(a.y, b.y, amount), angle: a.angle + turn * amount }, transform);
  }

  function ensureScratch(width, height) {
    width = Math.ceil(width);
    height = Math.ceil(height);
    if (shapeCanvas.width !== width || shapeCanvas.height !== height) {
      shapeCanvas.width = revealCanvas.width = detailLayerCanvas.width = paintCanvas.width = width;
      shapeCanvas.height = revealCanvas.height = detailLayerCanvas.height = paintCanvas.height = height;
    }
  }

  function paletteColors() {
    return [1, 2, 3, 4, 5].map((index) => inputs[`inkColor${index}`].value);
  }
  function page2PaletteColors() {
    return inputs.page2PaletteMode.value === "inherit" ? paletteColors()
      : [1, 2, 3, 4, 5].map(index => inputs[`page2InkColor${index}`].value);
  }

  function sourceToLogical(x, y) {
    return { x: x / MOTHER_FRAME.width * 720, y: y / MOTHER_FRAME.height * 405 };
  }

  function drawMotherSilhouette(context, transform, omitDot) {
    const image = state.brushMother;
    const top = transform.y + (210 - 210 * transform.widthScale) * transform.scale;
    if (image?.complete && image.naturalWidth) {
      context.drawImage(image, transform.x, top, 720 * transform.scale, 405 * transform.scale * transform.widthScale);
    } else {
      const fallbackWidth = 92 * transform.scale * transform.widthScale;
      authored.filter((stroke) => !stroke.dot).forEach((stroke) => drawSampledStroke(context, stroke, 0, 1, transform, fallbackWidth));
    }
    if (!omitDot) return;
    const a = transformPoint(sourceToLogical(DOT_REGION.x - 16, DOT_REGION.y - 16), transform);
    const b = transformPoint(sourceToLogical(DOT_REGION.x + DOT_REGION.width + 16, DOT_REGION.y + DOT_REGION.height + 16), transform);
    context.clearRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }

  function drawMotherToneLayer(target, toneMask, color, transform) {
    if (!toneMask) return;
    const layer = detailLayerCanvas.getContext("2d");
    layer.setTransform(1, 0, 0, 1, 0, 0);
    layer.clearRect(0, 0, detailLayerCanvas.width, detailLayerCanvas.height);
    const top = transform.y + (210 - 210 * transform.widthScale) * transform.scale;
    layer.drawImage(toneMask, transform.x, top, 720 * transform.scale, 405 * transform.scale * transform.widthScale);
    layer.globalCompositeOperation = "source-in";
    layer.fillStyle = color;
    layer.fillRect(0, 0, detailLayerCanvas.width, detailLayerCanvas.height);
    layer.globalCompositeOperation = "destination-in";
    layer.drawImage(shapeCanvas, 0, 0);
    layer.globalCompositeOperation = "source-over";
    target.drawImage(detailLayerCanvas, 0, 0);
  }

  function drawInkFlow(context, rawTime, transform) {
    const colors = paletteColors();
    const density = Number(inputs.textureDensity.value) / 100;
    const speed = Number(inputs.textureSpeed.value) / 100;
    const count = Math.max(6, Math.round(9 * density));
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = .58;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (let index = 0; index < count; index += 1) {
      const seed = fract(Math.sin(index * 41.31) * 928.13);
      const head = fract(index / count + rawTime * .082 * speed + seed * .04);
      const bandLength = .072 + seed * .088;
      context.strokeStyle = colors[(index + 1) % colors.length];
      context.lineWidth = transform.scale * transform.widthScale * mix(34, 72, seed);
      context.beginPath();
      let hasPoint = false;
      const steps = 20;
      for (let step = 0; step <= steps; step += 1) {
        const u = head - bandLength / 2 + bandLength * (step / steps);
        if (u < 0 || u > 1) continue;
        const point = pointOnMain(u, transform);
        const wave = Math.sin(step / steps * Math.PI * 2 + index * 1.93 + rawTime * 1.4 * speed);
        const offset = wave * transform.scale * transform.widthScale * mix(2, 9, seed);
        const x = point.x - Math.sin(point.angle) * offset;
        const y = point.y + Math.cos(point.angle) * offset;
        if (!hasPoint) context.moveTo(x, y);
        else context.lineTo(x, y);
        hasPoint = true;
      }
      if (hasPoint) context.stroke();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }

  function drawMainBrush(context, rawTime, width, height, visible, transform) {
    ensureScratch(width, height);
    const shape = shapeCanvas.getContext("2d");
    const reveal = revealCanvas.getContext("2d");
    const paint = paintCanvas.getContext("2d");
    shape.setTransform(1, 0, 0, 1, 0, 0);
    reveal.setTransform(1, 0, 0, 1, 0, 0);
    paint.setTransform(1, 0, 0, 1, 0, 0);
    reveal.clearRect(0, 0, width, height);
    paint.clearRect(0, 0, width, height);
    const colors = paletteColors();
    const key = JSON.stringify([width, height, transform, colors.slice(0, 3), !!state.motherDetail, !!state.motherHighlight]);
    if (key !== mainToneKey) {
      shape.clearRect(0, 0, width, height);
      drawMotherSilhouette(shape, transform, true);
      mainToneCanvas.width = Math.ceil(width);
      mainToneCanvas.height = Math.ceil(height);
      const tone = mainToneCanvas.getContext("2d");
      tone.drawImage(shapeCanvas, 0, 0);
      tone.globalCompositeOperation = "source-in";
      tone.fillStyle = colors[0];
      tone.fillRect(0, 0, width, height);
      tone.globalCompositeOperation = "source-over";
      drawMotherToneLayer(tone, state.motherDetail, colors[1], transform);
      drawMotherToneLayer(tone, state.motherHighlight, colors[2], transform);
      mainToneKey = key;
    }
    paint.drawImage(mainToneCanvas, 0, 0);
    if (visible.start > .0001 || visible.end < .9999) {
      const revealWidth = 128 * transform.scale * transform.widthScale;
      authored.filter((stroke) => !stroke.dot).forEach((stroke) => drawSampledStroke(reveal, stroke, visible.start, visible.end, transform, revealWidth));
      paint.globalCompositeOperation = "destination-in";
      paint.drawImage(revealCanvas, 0, 0);
      paint.globalCompositeOperation = "source-over";
    }
    drawInkFlow(paint, rawTime, transform);
    context.drawImage(paintCanvas, 0, 0);
  }

  function easeOutBack(value) {
    const x = clamp(value);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function dotState(phase) {
    const delay = Number(inputs.dotDelay.value) / 100;
    if (phase.name === "write") {
      const pathProgress = phaseEase(phase.progress, "write");
      const progress = clamp((pathProgress - delay) / .22);
      const settle = easeOutBack(progress);
      return {
        scaleX: settle,
        scaleY: settle * (1 + Math.sin(progress * Math.PI) * .08),
        y: -.52 * Math.exp(-4.8 * progress) * Math.cos(7.5 * progress),
        alpha: smoothstep(progress * 3),
        turn: progress * .55
      };
    }
    if (phase.name === "flow") {
      const pulse = Math.sin(phase.progress * Math.PI * 2);
      return { scaleX: 1 - pulse * .012, scaleY: 1 + pulse * .024, y: -pulse * .018, alpha: 1, turn: .55 + phase.progress * 1.5 };
    }
    if (phase.name === "erase") {
      const progress = clamp((phase.progress - .10) / .42);
      const lift = easeInCubic(progress);
      return {
        scaleX: 1 - lift * .18,
        scaleY: 1 + Math.sin(progress * Math.PI) * .12 - lift * .20,
        y: -.72 * lift,
        alpha: 1 - smoothstep((progress - .70) / .30),
        turn: 2.05 + progress * .8
      };
    }
    return { scaleX: 0, scaleY: 0, y: 0, alpha: 0, turn: 0 };
  }

  function drawDot(context, rawTime, width, height, phase, transform) {
    const motion = dotState(phase);
    if (motion.alpha <= .001 || motion.scaleX <= .001 || motion.scaleY <= .001) return;
    ensureScratch(width, height);
    const shape = shapeCanvas.getContext("2d");
    const paint = paintCanvas.getContext("2d");
    shape.setTransform(1, 0, 0, 1, 0, 0);
    paint.setTransform(1, 0, 0, 1, 0, 0);
    shape.clearRect(0, 0, width, height);
    paint.clearRect(0, 0, width, height);
    const centerSource = sourceToLogical(DOT_REGION.centerX, DOT_REGION.centerY);
    const center = transformPoint(centerSource, transform);
    const baseWidth = DOT_REGION.width / MOTHER_FRAME.width * 720 * transform.scale;
    const baseHeight = DOT_REGION.height / MOTHER_FRAME.height * 405 * transform.scale * transform.widthScale;
    const dotScale = Number(inputs.dotScale.value) / 100;
    const drawWidth = baseWidth * dotScale * motion.scaleX;
    const drawHeight = baseHeight * dotScale * motion.scaleY;
    const centerY = center.y + motion.y * baseHeight * dotScale;
    if (state.brushMother?.complete && state.brushMother.naturalWidth) {
      shape.drawImage(
        state.brushMother,
        DOT_REGION.x, DOT_REGION.y, DOT_REGION.width, DOT_REGION.height,
        center.x - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight
      );
    } else {
      shape.fillStyle = "#fff";
      shape.beginPath();
      shape.ellipse(center.x, centerY, drawWidth * .44, drawHeight * .44, 0, 0, Math.PI * 2);
      shape.fill();
    }
    const colors = paletteColors();
    paint.drawImage(shapeCanvas, 0, 0);
    paint.globalCompositeOperation = "source-in";
    paint.fillStyle = colors[2];
    paint.fillRect(0, 0, width, height);
    paint.globalCompositeOperation = "source-atop";
    paint.save();
    paint.translate(center.x, centerY);
    paint.rotate(motion.turn + rawTime * .35 * Number(inputs.textureSpeed.value) / 100);
    paint.fillStyle = colors[1];
    paint.beginPath();
    paint.ellipse(-drawWidth * .18, drawHeight * .06, drawWidth * .26, drawHeight * .58, -.35, 0, Math.PI * 2);
    paint.fill();
    paint.fillStyle = colors[4];
    paint.beginPath();
    paint.ellipse(drawWidth * .22, -drawHeight * .23, drawWidth * .13, drawHeight * .22, .5, 0, Math.PI * 2);
    paint.fill();
    paint.restore();
    paint.globalCompositeOperation = "source-over";
    context.save();
    context.globalAlpha = motion.alpha;
    context.drawImage(paintCanvas, 0, 0);
    context.restore();
  }

  function drawExactBrush(context, rawTime, width, height, visible) {
    const transform = exactTransform(width, height);
    drawMainBrush(context, rawTime, width, height, visible, transform);
    drawDot(context, rawTime, width, height, visible.phase, transform);
  }

  function page2FontSpec(size) {
    const preset = window.STGFontLibrary?.preset(inputs.page2Font.value);
    const family = window.STGFontLibrary?.family(inputs.page2Font.value) || "sans-serif";
    return `${preset?.style || "normal"} ${preset?.weight || 700} ${size}px ${family}`;
  }

  async function ensurePageFonts() {
    const requests = [document.fonts.load(fontSpec(32), inputs.textInput.value || "TIME")];
    if (twoPages()) requests.push(document.fonts.load(page2FontSpec(32), inputs.page2Text.value || "FLOW"));
    try { await Promise.all(requests); }
    catch (_) { schemeStatus.textContent = "部分字体加载失败，当前使用后备字体。"; }
  }

  function secondPageFrame(width, height, motion, elapsed, span) {
    const values = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
    lastGlyphFrame = glyphRenderer.frame(width, height, motion, elapsed, sequenceRoute, span, values, page2Glyphs);
    return lastGlyphFrame;
  }

  function authoredFirstText() {
    return inputs.page1Choreo.value === "auto" && inputs.textInput.value === "TIME"
      && inputs.fontSelect.value === defaultValues.fontSelect && inputs.fontSize.value === defaultValues.fontSize
      && inputs.letterSpacing.value === defaultValues.letterSpacing && inputs.page1Weave.value === "weave";
  }

  function firstGlyphContacts(layout, W, H) {
    const transform = exactTransform(W, H), span = timing();
    const inverse = (s, phase) => {
      let a = 0, b = 1;
      for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (phaseEase(m, phase) < s) a = m; else b = m; }
      return (a + b) / 2;
    };
    const radius = 43 * transform.scale * transform.widthScale;
    return layout.map(g => {
      let first = null, last = null;
      for (const point of authored[0].samples) {
        const p = transformPoint(point, transform);
        if (glyphEngine.inkContact(g, p.x, p.y, radius)) { first ??= point.s; last = point.s; }
      }
      if (first == null) return [];
      const release = twoPages() ? span.write + span.flow + span.bridge * .55
        : span.write + span.flow + inverse(last * authored[0].end, "erase") * span.erase;
      return [{ start: inverse(first * authored[0].end, "write") * span.write, release, rear: Math.floor(first * 4) % 2 === 0 }];
    });
  }

  function firstPageFrame(width, height, time, span) {
    const end = span.write + span.flow + (twoPages() ? span.bridge : span.erase);
    lastFirstGlyphFrame = firstGlyphRenderer.frame(width, height, { camera: 1, scale: 1 }, time, null,
      { ...span, bridge: end, finish: .001 }, {
        page2Size: inputs.fontSize.value, page2Spacing: inputs.letterSpacing.value, page2Color: inputs.textColor.value,
        page2Weave: inputs.page1Weave.value, centerX: Number(inputs.positionX.value) / 100,
        centerY: Number(inputs.positionY.value) / 100, brushWidth: inputs.brushWidth.value
      }, page1Glyphs);
    return lastFirstGlyphFrame;
  }

  function drawFirstForeground(context, letters, width, height, visible) {
    for (const c of [firstRearMask, firstOver]) {
      if (c.width !== Math.ceil(width) || c.height !== Math.ceil(height)) { c.width = Math.ceil(width); c.height = Math.ceil(height); }
    }
    const mask = firstRearMask.getContext("2d"), over = firstOver.getContext("2d");
    mask.clearRect(0, 0, width, height);
    const weave = inputs.page1Weave.value, tr = exactTransform(width, height);
    const rear = (i) => weave === "back" || (weave !== "front" && (weave === "reverse" ? i % 2 === 1 : i % 2 === 0));
    for (let i = 0; i < 4; i++) if (rear(i)) {
      drawSampledStroke(mask, authored[0], Math.max(visible.start, i * .22), Math.min(visible.end, (i + 1) * .22), tr, 112 * tr.scale * tr.widthScale);
    }
    over.clearRect(0, 0, width, height); over.drawImage(letters.inherit, 0, 0);
    over.globalCompositeOperation = "destination-in"; over.drawImage(firstRearMask, 0, 0);
    over.globalCompositeOperation = "source-over";
    if (weave === "back") context.drawImage(letters.inherit, 0, 0);
    else context.drawImage(firstOver, 0, 0);
    context.drawImage(letters.back, 0, 0);
  }

  function renderFrame(target, rawTime, width, height, backingWidth = width, backingHeight = height) {
    const targetWidth = Math.max(1, Math.round(backingWidth));
    const targetHeight = Math.max(1, Math.round(backingHeight));
    // Uniformly scale the shared coordinate system to preview backing pixels.
    // This avoids full-export-size scratch layers on a small live stage.
    if (target === canvas) {
      const rasterScale = Math.min(1, targetWidth / width, targetHeight / height);
      width *= rasterScale;
      height *= rasterScale;
    }
    if (target.width !== targetWidth || target.height !== targetHeight) {
      target.width = targetWidth;
      target.height = targetHeight;
    }
    const context = target.getContext("2d", { alpha: false, willReadFrequently: target !== canvas });
    context.setTransform(targetWidth / width, 0, 0, targetHeight / height, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    drawBackground(context, width, height);
    if (inputs.drawingMode.value === "freehand") {
      const visible = visibleWindow(rawTime);
      freehand.draw(context, drawing, compiledDrawing, width, height, visible, visible.phase.time,
        Number(inputs.freehandWidth.value), [1, 2, 3, 4, 5].map(i => inputs[`inkColor${i}`].value),
        Number(inputs.textureSpeed.value) / 100, Number(inputs.textureDensity.value) / 100);
      if (target === canvas) updateTimelinePlayhead(visible.phase);
      return;
    }
    const text = inputs.textInput.value.trim() || " ";
    const unit = Math.min(width / 720, height / 405);
    const fit = fitBaseText(context, text.toLocaleUpperCase(), width, height, unit);
    const centerX = width * Number(inputs.positionX.value) / 100;
    const centerY = height * Number(inputs.positionY.value) / 100;
    const phase = phaseAt(rawTime);
    const sequenceActive = twoPages() && ["bridge", "page2", "settled", "textExit", "empty"].includes(phase.name);
    const elapsed = phase.time - phase.span.write - phase.span.flow;
    const visible = sequenceActive
      ? { start: 0, end: 1, phase: { ...phase, name: phase.name === "reset" ? "hold" : "flow", progress: 1 + elapsed / phase.span.flow } }
      : visibleWindow(rawTime);
    const firstLetters = authoredFirstText() ? null : firstPageFrame(width, height, phase.time, phase.span);
    // Align the glyph ink box to the source baseline (not the font's em box).
    // Keep this in logical composition units for all preview/export sizes.
    const drawTextLayer = (foreground, targetContext = context) => {
      if (firstLetters) {
        if (foreground) drawFirstForeground(targetContext, firstLetters, width, height, visible);
        else targetContext.drawImage(firstLetters.base, 0, 0);
        return;
      }
      const textCanvas = foreground ? foregroundTextCanvas : textLayerCanvas;
      const slot = foreground ? 1 : 0;
      const key = JSON.stringify([width, height, text, fontSpec(fit.size), fit.spacing, centerX, centerY,
        document.fonts.check(fontSpec(fit.size), text || " "), inputs.textColor.value,
        foreground ? null : [impactLetterState(visible), endLetterState(visible)]]);
      // An alpha layer prevents opaque-canvas LCD text AA from changing after
      // the first frame/readback. PNG and video receive the same glyph pixels.
      if (textLayerKeys[slot] !== key) {
        if (textCanvas.width !== Math.ceil(width) || textCanvas.height !== Math.ceil(height)) {
          textCanvas.width = Math.ceil(width);
          textCanvas.height = Math.ceil(height);
        }
        const layer = textCanvas.getContext("2d");
        layer.clearRect(0, 0, textCanvas.width, textCanvas.height);
        layer.save();
        layer.translate(0, centerY + 16 * unit);
        layer.scale(1, .95);
        drawSpacedText(layer, text.toLocaleUpperCase(), centerX, 0, fit.size, fit.spacing, inputs.textColor.value, visible, foreground);
        layer.restore();
        textLayerKeys[slot] = key;
      }
      targetContext.drawImage(textCanvas, 0, 0);
    };
    if (!twoPages() && ["singleSettled", "singleTextExit", "singleEmpty"].includes(phase.name)) {
      if (phase.name !== "singleEmpty") {
        const exit = window.RibbonInkSequence.singleTextExit(phase.name === "singleSettled" ? 0 : phase.progress);
        if (singleExitCanvas.width !== Math.ceil(width) || singleExitCanvas.height !== Math.ceil(height)) {
          singleExitCanvas.width = Math.ceil(width); singleExitCanvas.height = Math.ceil(height);
        }
        const composed = singleExitCanvas.getContext("2d");
        composed.setTransform(1, 0, 0, 1, 0, 0); composed.clearRect(0, 0, width, height);
        drawTextLayer(false, composed); drawTextLayer(true, composed);
        composed.font = fontSpec(fit.size);
        composed.textBaseline = "middle";
        const descent = Math.max(0, ...Array.from(text.toLocaleUpperCase(), glyph => composed.measureText(glyph).actualBoundingBoxDescent));
        const exitPivotY = firstLetters ? firstLetters.bottom : centerY + 16 * unit + .95 * descent;
        context.save(); context.globalAlpha = exit.alpha;
        context.translate(centerX, exitPivotY); context.scale(exit.sx, exit.sy); context.translate(-centerX, -exitPivotY);
        context.drawImage(singleExitCanvas, 0, 0); context.restore();
      }
      if (target === canvas) updateTimelinePlayhead(phase);
      return;
    }
    if (sequenceActive) {
      const transform = exactTransform(width, height);
      const entry = transformPoint({ x: 710, y: 195 }, transform);
      const routeKey = JSON.stringify([width / unit, height / unit, entry.x / unit, entry.y / unit, inputs.page2Route.value]);
      if (sequenceRouteKey !== routeKey) {
        sequenceRoute = window.RibbonInkSequence.compile(inputs.page2Route.value, width / unit, height / unit, [entry.x / unit, entry.y / unit]);
        sequenceRouteKey = routeKey;
      }
      const motion = window.RibbonInkSequence.evaluate(elapsed, phase.span.bridge, Number(inputs.page2Pop.value) / 100, sequenceRoute, phase.span.page2,
        window.RibbonInkSequence.settings(Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]))));
      if (["settled", "textExit", "empty"].includes(phase.name)) {
        const letters = secondPageFrame(width, height, { ...motion, camera: 1, scale: 1 }, elapsed, phase.span);
        const exit = window.RibbonInkSequence.singleTextExit(phase.name === "settled" ? 0 : phase.name === "empty" ? 1 : phase.progress);
        context.save(); context.globalAlpha = exit.alpha;
        context.translate(width * .5, letters.bottom); context.scale(exit.sx, exit.sy);
        context.drawImage(letters.base, -width * .5, -letters.bottom); context.restore();
      } else {
        if (motion.camera < 1) {
          context.save(); context.translate(-motion.camera * width, 0); drawTextLayer(false); context.restore();
        }
        const letters = secondPageFrame(width, height, motion, elapsed, phase.span);
        context.drawImage(letters.base, 0, 0);
        const ribbon = window.RibbonInkWriting.draw(sequenceRoute, motion, width, height, unit,
          74 * Number(inputs.brushWidth.value) / 100, paletteColors(), phase.time,
          Number(inputs.textureSpeed.value) / 100, Number(inputs.textureDensity.value) / 100, inputs.page2Weave.value, page2PaletteColors());
        context.drawImage(ribbon.ink, 0, 0);
        if (motion.camera < 1) {
          // Existing ink is stationary in the world: the ONLY transform is the camera.
          context.save(); context.translate(-motion.camera * width, 0);
          drawExactBrush(context, rawTime, width, height, visible);
          drawTextLayer(true); context.restore();
        }
        if (motion.scale > 0 && motion.head > motion.tail) {
          if (page2Occlusion.width !== Math.ceil(width) || page2Occlusion.height !== Math.ceil(height)) {
            page2Occlusion.width = Math.ceil(width); page2Occlusion.height = Math.ceil(height);
          }
          const over = page2Occlusion.getContext("2d");
          for (const [glyphs, mask] of [[letters.inherit, ribbon.rear], [letters.back, ribbon.cover]]) {
            over.clearRect(0, 0, width, height);
            over.drawImage(glyphs, 0, 0);
            over.globalCompositeOperation = "destination-in";
            over.drawImage(mask, 0, 0);
            over.globalCompositeOperation = "source-over";
            context.drawImage(page2Occlusion, 0, 0);
          }
        }
      }
      if (target === canvas) updateTimelinePlayhead(phase);
      return;
    }
    drawTextLayer(false);
    if (visible.end > visible.start + .0001 || visible.phase.name === "write" || visible.phase.name === "erase") {
      drawExactBrush(context, rawTime, width, height, visible);
    }
    drawTextLayer(true);
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
    if (!state.exporting) renderPreview();
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
    // Prepare font masks/contact windows on an editor change, not on the first
    // live bridge frame. Both renders are synchronous, so no warm-up pose flashes.
    if (twoPages()) renderPreview(timing().write + timing().flow + timing().bridge * .84);
    renderPreview();
  }

  function timelinePhases() {
    const span = timing();
    if (twoPages()) return [
      { id: "write", label: "首页写入", duration: span.write, color: PHASE_COLORS[0] },
      { id: "flow", label: "首页流动", duration: span.flow, color: PHASE_COLORS[1] },
      { id: "bridge", label: "续写·弹出", duration: span.bridge, color: PHASE_COLORS[2] },
      { id: "page2", label: "收笔轻弹", duration: span.finish, color: PHASE_COLORS[3] },
      { id: "settled", label: "文字停留", duration: span.endHold, color: "#777780" },
      { id: "textExit", label: "文字退场", duration: span.textExit, color: "#9e499f" },
      { id: "empty", label: "结束留白", duration: span.emptyHold, color: "#657476" }
    ].filter(phase => phase.duration > 0);
    return [
      { id: "write", label: "写入", duration: span.write, color: PHASE_COLORS[0] },
      { id: "flow", label: "流动", duration: span.flow, color: PHASE_COLORS[1] },
      { id: "erase", label: "擦除", duration: span.erase, color: PHASE_COLORS[2] },
      { id: "hold", label: inputs.drawingMode.value === "freehand" ? "留白" : "文字停留", duration: span.hold, color: PHASE_COLORS[3] },
      { id: "singleTextExit", label: "文字退场", duration: span.textExit || 0, color: "#9e499f" },
      { id: "singleEmpty", label: "结束留白", duration: span.emptyHold || 0, color: "#657476" }
    ].filter(phase => phase.duration > 0);
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

  const glyphFields = { glyphDepth: 'depth', glyphMotion: 'motion', glyphAmount: 'amount', glyphDirection: 'direction', glyphPivot: 'pivot', glyphRebound: 'rebound' };
  const glyphEditors = [true, false].map(first => ({
    first,
    element: id => $("#" + (first ? "first" + id[0].toUpperCase() + id.slice(1) : id)),
    get glyphs() { return first ? page1Glyphs : page2Glyphs; },
    set glyphs(value) { if (first) page1Glyphs = value; else page2Glyphs = value; },
    get selected() { return first ? selectedFirstGlyphs : selectedGlyphs; },
    set selected(value) { if (first) selectedFirstGlyphs = value; else selectedGlyphs = value; },
    text: () => first ? inputs.textInput.value : inputs.page2Text.value,
    rest: () => first ? 0 : secondPageRestTime(),
    frame: () => first ? lastFirstGlyphFrame : lastGlyphFrame
  }));
  function syncGlyphEditor() {
    for (const editor of glyphEditors) {
      editor.glyphs = glyphEngine.reconcile(editor.glyphs, editor.text());
      editor.selected = new Set([...editor.selected].filter(id => editor.glyphs.some(g => g.id === id)));
      const list = editor.element("glyphChips"), signature = JSON.stringify(editor.glyphs.map(g => [g.id, g.text]));
      if (list.dataset.signature !== signature) {
        list.replaceChildren();
        editor.glyphs.forEach((g, index) => {
          const button = document.createElement("button");
          button.type = "button"; button.dataset.glyphId = g.id;
          button.textContent = g.text.trim() ? g.text : "␣";
          button.setAttribute("aria-label", `${index + 1}：${g.text.trim() ? g.text : "空格"}`);
          button.addEventListener("click", () => {
            if (editor.selected.has(g.id)) editor.selected.delete(g.id); else editor.selected.add(g.id);
            syncGlyphEditor(); setPaused(true); setTime(editor.rest());
            editor.element("glyphStatus").textContent = "已暂停在完整文字；点击“暂停看接触”检查穿插和动作。";
          });
          list.append(button);
        });
        list.dataset.signature = signature;
      }
      list.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(editor.selected.has(button.dataset.glyphId))));
      const chosen = editor.glyphs.filter(g => editor.selected.has(g.id));
      editor.element("glyphSelection").textContent = chosen.length ? `已选 ${chosen.length} 字：${chosen.map(g => g.text).join("、")}` : "尚未选择文字";
      editor.element("glyphFields").disabled = !chosen.length;
      for (const [id, key] of Object.entries(glyphFields)) {
        const input = editor.element(id), mixed = chosen.some(g => g[key] !== chosen[0][key]);
        const value = chosen[0]?.[key] ?? glyphEngine.defaults[key];
        if (input.type === "range") {
          input.value = Math.round(value * 100);
          editor.element(id + "Out").textContent = mixed ? "多种设置" : key === "amount" ? `${Math.round(value * 100)}%` : `${value.toFixed(2)} 秒`;
        } else input.value = mixed ? "" : value;
      }
    }
  }
  function seekGlyphContact(editor, play = false) {
    if (!editor.first && !twoPages()) return;
    const span = timing(), start = editor.first ? 0 : span.write + span.flow;
    setPaused(true);
    if (editor.first) {
      const [w, h] = canvasDimensions();
      firstPageFrame(w, h, 0, span);
    } else renderPreview(start + span.bridge * .84);
    const events = editor.glyphs.flatMap((g, i) => editor.selected.has(g.id) ? editor.frame().events[i] : []);
    const event = events.sort((a, b) => a.start - b.start)[0];
    if (!event) {
      setTime(editor.rest());
      editor.element("glyphStatus").textContent = "所选字没有与笔迹相交，可调整笔迹大小、字体或字号后再看。";
      return;
    }
    setTime(start + (play ? Math.max(0, event.start - .08) : Math.max(event.start, Math.min(event.release - .01, event.start + .13))));
    if (play) setPaused(false);
    editor.element("glyphStatus").textContent = `接触 ${event.start.toFixed(2)} 秒 · 笔尾释放 ${event.release.toFixed(2)} 秒（从本页书写起算）`;
  }
  for (const editor of glyphEditors) {
    editor.element("selectAllGlyphs").addEventListener("click", () => { editor.selected = new Set(editor.glyphs.map(g => g.id)); syncGlyphEditor(); });
    editor.element("deselectGlyphs").addEventListener("click", () => { editor.selected.clear(); syncGlyphEditor(); });
    editor.element("inspectGlyphContact").addEventListener("click", () => seekGlyphContact(editor));
    editor.element("playGlyphContact").addEventListener("click", () => seekGlyphContact(editor, true));
    for (const [id, key] of Object.entries(glyphFields)) editor.element(id).addEventListener("input", event => {
      const value = event.target.type === "range" ? Number(event.target.value) / 100 : event.target.value;
      editor.glyphs = editor.glyphs.map(g => editor.selected.has(g.id) ? { ...g, ...glyphEngine.normalize({ ...g, [key]: value }) } : g);
      if (editor.first) inputs.page1Choreo.value = "glyphs";
      syncGlyphEditor(); queueAutosave();
      const span = timing(), elapsed = currentTime() % span.total - (editor.first ? 0 : span.write + span.flow);
      const frame = editor.frame();
      const showingContact = state.paused && frame && editor.glyphs.some((g, i) => editor.selected.has(g.id) && frame.events[i]?.some(e => elapsed >= e.start && elapsed <= e.release + g.rebound));
      if (showingContact) renderPreview(); else seekGlyphContact(editor);
    });
  }
  function updateOutputs() {
    syncGlyphEditor();
    updateDrawingUI();
    $("#page1GlyphEditor").hidden = inputs.drawingMode.value === "freehand";
    inputs.page1Weave.closest("label").hidden = inputs.drawingMode.value === "freehand";
    inputs.page1Choreo.closest("label").hidden = inputs.drawingMode.value === "freehand";
    inputs.letterImpact.closest("label").hidden = inputs.drawingMode.value === "freehand" || !authoredFirstText();
    $("#sequenceCard").hidden = inputs.drawingMode.value === "freehand";
    $("#secondPageTools").hidden = !twoPages();
    $("#page2PaletteTools").hidden = inputs.page2PaletteMode.value !== "custom";
    document.body.classList.toggle("is-two-pages", twoPages());
    ["eraseDuration", "holdDuration"].forEach(id => { inputs[id].closest("label").hidden = twoPages(); });
    const singleTextEnding = !twoPages() && inputs.drawingMode.value !== "freehand";
    $("#singleTextExitField").hidden = !singleTextEnding;
    $("#singleEmptyHoldField").hidden = !singleTextEnding;
    $("#previewSingleEnding").hidden = !singleTextEnding;
    const map = {
      page2TextExitOut: `${(Number(inputs.page2TextExit.value) / 100).toFixed(2)} 秒`,
      page2EmptyHoldOut: `${(Number(inputs.page2EmptyHold.value) / 100).toFixed(2)} 秒`,
      singleTextExitOut: `${(Number(inputs.singleTextExit.value) / 100).toFixed(2)} 秒`,
      singleEmptyHoldOut: `${(Number(inputs.singleEmptyHold.value) / 100).toFixed(2)} 秒`,
      page2SlowPositionOut: `${inputs.page2SlowPosition.value}%`,
      page2SlowWidthOut: `${inputs.page2SlowWidth.value}%`,
      page2SlowStrengthOut: `${inputs.page2SlowStrength.value}%`,
      page2FinishOut: `${(Number(inputs.page2Finish.value) / 100).toFixed(2)} 秒`,
      page2SizeOut: inputs.page2Size.value,
      page2SpacingOut: inputs.page2Spacing.value,
      bridgeDurationOut: `${(Number(inputs.bridgeDuration.value) / 100).toFixed(2)} 秒`,
      page2PopOut: `${(Number(inputs.page2Pop.value) / 100).toFixed(2)} 秒`,
      page2HoldOut: `${(Number(inputs.page2Hold.value) / 100).toFixed(2)} 秒`,
      freehandWidthOut: `${inputs.freehandWidth.value}`,
      fontSizeOut: `${inputs.fontSize.value}`,
      letterSpacingOut: `${inputs.letterSpacing.value}`,
      brushScaleOut: `${inputs.brushScale.value}%`,
      brushWidthOut: `${inputs.brushWidth.value}%`,
      positionXOut: `${inputs.positionX.value}%`,
      positionYOut: `${inputs.positionY.value}%`,
      textureDensityOut: `${inputs.textureDensity.value}%`,
      textureSpeedOut: `${inputs.textureSpeed.value}%`,
      dotScaleOut: `${inputs.dotScale.value}%`,
      dotDelayOut: `${inputs.dotDelay.value}%`,
      snakeIntensityOut: `${inputs.snakeIntensity.value}%`,
      letterImpactOut: `${inputs.letterImpact.value}%`,
      writeDurationOut: `${(Number(inputs.writeDuration.value) / 100).toFixed(2)} 秒`,
      flowDurationOut: `${(Number(inputs.flowDuration.value) / 100).toFixed(2)} 秒`,
      eraseDurationOut: `${(Number(inputs.eraseDuration.value) / 100).toFixed(2)} 秒`,
      holdDurationOut: `${(Number(inputs.holdDuration.value) / 100).toFixed(2)} 秒`
    };
    Object.entries(map).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    ["page2SlowPosition", "page2SlowWidth"].forEach(id => { inputs[id].disabled = inputs.page2Rhythm.value === "linear"; });
    inputs.page2SlowStrength.disabled = inputs.page2Rhythm.value !== "snake";
    $("#customSize").hidden = inputs.canvasPreset.value !== "custom";
    $("#customDuration").hidden = inputs.exportDuration.value !== "custom";
    renderTimeline();
  }

  function applyPalettePreset(name) {
    const colors = PALETTES[name];
    if (!colors) return;
    colors.forEach((color, index) => { inputs[`inkColor${index + 1}`].value = color; });
  }

  function schemeData() {
    const values = {};
    Object.entries(inputs).forEach(([key, input]) => { values[key] = input.value; });
    return { version: SCHEME_VERSION, effect: EFFECT_ID, values, page1Glyphs: structuredClone(page1Glyphs), page2Glyphs: structuredClone(page2Glyphs), drawing: structuredClone(drawing), background: state.backgroundDataUrl || "" };
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
    const nextDrawing = freehand.validate(data.drawing);
    const nextGlyphs = glyphEngine.reconcile(data.page2Glyphs ?? [], String(data.values?.page2Text ?? defaultValues.page2Text));
    const nextFirstGlyphs = glyphEngine.reconcile(data.page1Glyphs ?? [], String(data.values?.textInput ?? defaultValues.textInput));
    finishDrawing();
    drawing = nextDrawing;
    compiledDrawing = freehand.compile(drawing);
    redoStrokes = [];
    page2Glyphs = nextGlyphs;
    page1Glyphs = nextFirstGlyphs;
    selectedFirstGlyphs = new Set(nextFirstGlyphs.length ? [nextFirstGlyphs[0].id] : []);
    selectedGlyphs = new Set(nextGlyphs.length ? [nextGlyphs[0].id] : []);
    Object.entries({ ...defaultValues, ...data.values }).forEach(([key, value]) => {
      if (inputs[key] && value != null) inputs[key].value = String(value);
    });
    await loadBackground(data.background || "");
    await ensurePageFonts();
    updateOutputs();
    updateStageLayout();
    setTime(0);
    drawingEnabled = inputs.drawingMode.value === "freehand";
    if (drawingEnabled) editDrawing();
    else updateDrawingUI();
  }

  function queueAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      state.autosaveTimer = 0;
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
    if (!paused && inputs.drawingMode.value === "freehand") {
      finishDrawing(); drawingEnabled = false; updateDrawingUI();
    }
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
    finishDrawing(); drawingEnabled = false; updateDrawingUI();
    if (twoPages()) renderPreview(timing().write + timing().flow + timing().bridge * .84);
    state.pausedAt = 0;
    state.startedAt = performance.now();
    if (state.paused) setPaused(false);
    renderPreview(0);
  }

  function updateDrawingUI() {
    const enabled = inputs.drawingMode.value === "freehand";
    $("#freehandTools").hidden = !enabled;
    document.body.classList.toggle("is-drawing", enabled && drawingEnabled);
    ["textInput", "fontSelect", "fontSize", "letterSpacing", "textColor", "brushScale", "brushWidth", "positionX", "positionY", "dotScale", "dotDelay", "letterImpact"].forEach(id => {
      inputs[id].closest("label").hidden = enabled;
    });
    inputs.letterImpact.closest("label").hidden = enabled || !authoredFirstText();
    $("#textTitle").textContent = enabled ? "笔迹与颜色" : twoPages() ? "第一页文字与配色" : "文字与颜色";
    inputs.holdDuration.closest("label").firstChild.textContent = enabled ? "留白停留 " : "笔迹消失后，文字停留 ";
    $("#drawingHint").hidden = !enabled || drawing.strokes.length > 0;
    $("#undoInk").disabled = !drawing.strokes.length;
    $("#redoInk").disabled = !redoStrokes.length;
    $("#clearInk").disabled = !drawing.strokes.length;
    $("#playInk").disabled = !drawing.strokes.length;
    $("#drawInk").setAttribute("aria-pressed", String(drawingEnabled));
    $("#drawingStatus").textContent = `${drawing.strokes.length} 笔 · ${drawingEnabled ? "绘画中，可继续落笔或调粗细" : "预览中，点继续绘画可修改"}`;
  }

  function showWholeDrawing() {
    setPaused(true);
    setTime(timing().write + timing().flow * .5);
  }

  function editDrawing() {
    drawingEnabled = true;
    showWholeDrawing(); updateDrawingUI();
  }

  function finishDrawing(event) {
    if (activePointer === null || (event && event.pointerId !== activePointer)) return;
    const pointer = activePointer; activePointer = null;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    compiledDrawing = freehand.compile(drawing);
    updateDrawingUI(); queueAutosave();
  }

  function appendPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const [width, height] = canvasDimensions();
    const fit = freehand.transform(drawing, width, height);
    const point = [clamp(((event.clientX - rect.left) / rect.width * width - fit.x) / fit.scale, 0, drawing.width),
      clamp(((event.clientY - rect.top) / rect.height * height - fit.y) / fit.scale, 0, drawing.height)];
    const stroke = drawing.strokes[drawing.strokes.length - 1];
    const last = stroke[stroke.length - 1];
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) >= 1.4) {
      if (drawing.strokes.reduce((n, s) => n + s.length, 0) >= 60000) return;
      const distance = last ? Math.hypot(point[0] - last[0], point[1] - last[1]) : 0;
      const velocity = distance / Math.max(4, event.timeStamp - lastPointTime);
      const targetPressure = event.pointerType === "pen" && event.pressure > 0
        ? .3 + event.pressure * .95 : .5 + .65 / (1 + velocity * 2);
      point.push(last ? (last[2] ?? .8) * .75 + targetPressure * .25 : .8);
      stroke.push(point);
      lastPointTime = event.timeStamp;
    }
  }

  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || activePointer !== null || !drawingEnabled || inputs.drawingMode.value !== "freehand") return;
    if (drawing.strokes.length >= 300) { schemeStatus.textContent = "已达 300 笔，请保存方案后新建绘画。"; return; }
    if (drawing.strokes.reduce((n, s) => n + s.length, 0) >= 60000) { schemeStatus.textContent = "已达手绘点数上限，请保存方案后新建绘画。"; return; }
    event.preventDefault();
    if (!drawing.strokes.length) {
      const [width, height] = canvasDimensions();
      const scale = Math.min(width, height) / 405;
      drawing.width = width / scale; drawing.height = height / scale;
    } else {
      // Expand the drawing document when drawing into a new aspect ratio's margins.
      // Existing centerlines keep their visible positions and proportions.
      const [width, height] = canvasDimensions();
      const fit = freehand.transform(drawing, width, height);
      if (fit.x > .01 || fit.y > .01) {
        const shift = stroke => stroke.map(p => [p[0] + fit.x / fit.scale, p[1] + fit.y / fit.scale, ...p.slice(2)]);
        drawing.strokes = drawing.strokes.map(shift);
        redoStrokes = redoStrokes.map(shift);
        drawing.width = width / fit.scale; drawing.height = height / fit.scale;
      }
    }
    activePointer = event.pointerId; canvas.setPointerCapture(activePointer);
    redoStrokes = []; drawing.strokes.push([]); appendPoint(event);
    compiledDrawing = freehand.compile(drawing); showWholeDrawing(); updateDrawingUI();
  });
  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== activePointer) return;
    for (const sample of (event.getCoalescedEvents?.().length ? event.getCoalescedEvents() : [event])) appendPoint(sample);
    compiledDrawing = freehand.compile(drawing); renderPreview();
  });
  canvas.addEventListener("pointerup", event => {
    if (event.pointerId !== activePointer) return;
    appendPoint(event); finishDrawing(event);
  });
  canvas.addEventListener("pointercancel", finishDrawing);
  canvas.addEventListener("lostpointercapture", finishDrawing);
  $("#drawInk").addEventListener("click", editDrawing);
  $("#playInk").addEventListener("click", replay);
  $("#undoInk").addEventListener("click", () => {
    finishDrawing(); if (drawing.strokes.length) redoStrokes.push(drawing.strokes.pop());
    compiledDrawing = freehand.compile(drawing); editDrawing(); queueAutosave();
  });
  $("#redoInk").addEventListener("click", () => {
    if (redoStrokes.length) drawing.strokes.push(redoStrokes.pop());
    compiledDrawing = freehand.compile(drawing); editDrawing(); queueAutosave();
  });
  $("#clearInk").addEventListener("click", () => {
    finishDrawing(); redoStrokes = [...drawing.strokes].reverse(); drawing.strokes = [];
    compiledDrawing = freehand.compile(drawing); editDrawing(); queueAutosave();
  });

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
    state.exporting = busy;
    $("#editorPanel").inert = busy;
    workspace.inert = busy;
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }

  $("#exportPng").addEventListener("click", async () => {
    await ensurePageFonts();
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `ribbon-ink-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", async () => {
    await ensurePageFonts();
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
    await ensurePageFonts();
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
      if (key === "drawingMode") {
        finishDrawing();
        if (input.value === "freehand") editDrawing();
        else { drawingEnabled = false; replay(); }
      }
      if (key === "palettePreset") applyPalettePreset(input.value);
      if (/^inkColor[1-5]$/.test(key)) inputs.palettePreset.value = "custom";
      if (key === "page2PalettePreset" && PALETTES[input.value]) {
        PALETTES[input.value].forEach((color,index) => { inputs[`page2InkColor${index+1}`].value = color; });
      }
      if (/^page2InkColor[1-5]$/.test(key)) inputs.page2PalettePreset.value = "custom";
      updateOutputs();
      if (["fontSelect", "page2Font", "textInput", "page2Text"].includes(key)) {
        ensurePageFonts().then(() => { textLayerKeys.fill(""); renderPreview(); });
      }
      if (key === "sequenceMode") replay();
      if (["page1Weave", "page1Choreo"].includes(key)) { setTime(0); setPaused(false); }
      if (twoPages() && ["page2Route", "page2Weave"].includes(key)) {
        setPaused(true); setTime(timing().write + timing().flow + timing().bridge * .84);
      }
      if (twoPages() && ["bridgeDuration", "page2Pop", "page2Rhythm", "page2SlowPosition", "page2SlowWidth", "page2SlowStrength"].includes(key)) {
        setTime(timing().write + timing().flow); setPaused(false);
      }
      if (twoPages() && key === "page2Finish") playEnding();
      if (twoPages() && ["page2Text", "page2Font", "page2Size", "page2Spacing", "page2Color"].includes(key)) {
        setPaused(true); setTime(secondPageRestTime());
      }
      if (twoPages() && /^(page2Palette|page2InkColor)/.test(key)) {
        setPaused(true); setTime(timing().write + timing().flow + timing().bridge * .84);
      }
      if (twoPages() && ["page2TextExit", "page2Hold", "page2EmptyHold"].includes(key)) playEnding();
      if (!twoPages() && ["eraseDuration", "holdDuration", "singleTextExit", "singleEmptyHold"].includes(key)) playSingleEnding();
      if (["canvasPreset", "canvasWidth", "canvasHeight"].includes(key)) updateStageLayout();
      if (drawingEnabled && inputs.drawingMode.value === "freehand") showWholeDrawing();
      queueAutosave();
    };
    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
  });

  $("#copyPage1Palette").addEventListener("click", () => {
    paletteColors().forEach((color,index) => { inputs[`page2InkColor${index+1}`].value = color; });
    inputs.page2PalettePreset.value = inputs.palettePreset.value;
    updateOutputs(); queueAutosave();
    setPaused(true); setTime(timing().write + timing().flow + timing().bridge * .84);
  });
  $("#previewPage2Palette").addEventListener("click", () => {
    setTime(timing().write + timing().flow - .15); setPaused(false);
  });
  $("#previewPage2Route").addEventListener("click", () => {
    setTime(timing().write + timing().flow - .15); setPaused(false);
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
    const cleared = { ...defaultValues, textInput: "", page2Text: "", drawingMode: inputs.drawingMode.value, sequenceMode: inputs.sequenceMode.value };
    await applyScheme({ version: SCHEME_VERSION, effect: EFFECT_ID, values: cleared, background: "" });
    localStorage.removeItem(STORAGE_KEY);
    clearTimeout(state.autosaveTimer); state.autosaveTimer = 0;
    schemeStatus.textContent = "已清空内容，可重新编辑。";
  });

  $("#pauseButton").addEventListener("click", () => setPaused(!state.paused));
  function playEnding() { setPaused(true); setTime(timing().write + timing().flow + timing().bridge - .08); setPaused(false); }
  function playSingleEnding() { setPaused(true); setTime(timing().write + timing().flow - .08); setPaused(false); }
  function secondPageRestTime() { const s = timing(); return s.write + s.flow + s.bridge + s.finish + Math.min(.1, s.endHold / 2); }
  $("#previewEnding").addEventListener("click", playEnding);
  $("#previewSingleEnding").addEventListener("click", playSingleEnding);
  $("#editFirstPage").addEventListener("click", () => { setPaused(true); setTime(0); inputs.textInput.focus(); });
  $("#editSecondPage").addEventListener("click", () => { setPaused(true); setTime(secondPageRestTime()); inputs.page2Text.focus(); });
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
  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(state.raf);
    if (state.autosaveTimer) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(schemeData())); } catch (_) {}
    }
  });
  if (urlParams.has("preview")) document.body.classList.add("is-preview");

  window.RibbonInk = { renderFrame, timing, phaseAt, visibleWindow, schemeData, applyScheme, setTime, setPaused, canvasDimensions,
    glyphDiagnostics: () => ({ first: lastFirstGlyphFrame && { events: lastFirstGlyphFrame.events, poses: lastFirstGlyphFrame.poses },
      second: lastGlyphFrame && { events: lastGlyphFrame.events, poses: lastGlyphFrame.poses }, authoredFirst: authoredFirstText() }) };

  async function initialize() {
    window.STGFontLibrary?.enhanceAll(document);
    await loadBrushMother();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    if (urlParams.get("from") === "gallery") saved = null;
    try {
      await applyScheme(saved?.effect === EFFECT_ID ? saved : { version: SCHEME_VERSION, effect: EFFECT_ID, values: defaultValues, background: "" });
      if (!saved && urlParams.get("sequence") === "2") {
        inputs.sequenceMode.value = "double"; updateOutputs(); replay();
      }
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
