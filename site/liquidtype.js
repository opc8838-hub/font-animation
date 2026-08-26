(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#liquidCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const schemeStatus = $("#schemeStatus");
  const fps = 30;
  const SAVE_KEY = "me-scatter-scheme-v2";
  const FIELD_IDS = [
    "cleanText", "cleanFontFamily", "bloomText", "bloomFontFamily", "liquidText", "liquidFontFamily", "scatterText", "scatterFontFamily",
    "fontWeight", "fontSize", "tracking", "textX", "textY",
    "backgroundColor", "cleanColor", "bloomColor", "liquidColor", "smokeColor",
    "speed", "cleanHold", "bloomIn", "bloomHold", "liquidIn", "liquidHold",
    "scatterDuration", "scatterHold", "scatterDirection", "rhythm", "scatterStagger",
    "scatterDistance", "density", "particleSize", "petalCount", "bloomDrift",
    "spread", "drift", "roundness", "gloss", "smokeWidth", "smokeBlur"
  ];
  const inputs = Object.fromEntries(FIELD_IDS.map((id) => [id, document.getElementById(id)]));
  const DEFAULTS = {
    cleanText: "Prompt it.", cleanFontFamily: "stg:inter",
    bloomText: "Prompt it.", bloomFontFamily: "stg:inter",
    liquidText: "Prompt it.", liquidFontFamily: "stg:inter",
    scatterText: "Prompt it.", scatterFontFamily: "stg:inter",
    fontWeight: "700", fontSize: "112", tracking: "-3", textX: "50", textY: "50",
    backgroundColor: "#000000", cleanColor: "#ffffff", bloomColor: "#dedbd2", liquidColor: "#59c7ef", smokeColor: "#925049",
    speed: "1", cleanHold: "380", bloomIn: "120", bloomHold: "580", liquidIn: "140", liquidHold: "1180",
    scatterDuration: "500", scatterHold: "490", scatterDirection: "center", rhythm: "burst", scatterStagger: "40",
    scatterDistance: "118", density: "72", particleSize: "7", petalCount: "5", bloomDrift: "8",
    spread: "82", drift: "38", roundness: "10", gloss: "78", smokeWidth: "120", smokeBlur: "32"
  };
  const STAGES = {
    clean: { text: "cleanText", font: "cleanFontFamily" },
    bloom: { text: "bloomText", font: "bloomFontFamily" },
    liquid: { text: "liquidText", font: "liquidFontFamily" },
    scatter: { text: "scatterText", font: "scatterFontFamily" }
  };
  const DAISY_ASSETS = Array.from({ length: 5 }, (_, index) => `assets/scatter/sprites/daisy-${index + 1}.png`);
  const daisySprites = [];

  const masks = new Map();
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;
  let previewDirty = true;
  let lastDuration = 3.39;
  let autoSaveTimer = 0;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const easeOutBack = (value) => {
    const t = clamp(value) - 1;
    return 1 + 2.70158 * t * t * t + 1.70158 * t * t;
  };
  const hash = (seed) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  function hexRgb(value) {
    const raw = String(value || "#000000").replace("#", "");
    const hex = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw.padEnd(6, "0").slice(0, 6);
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }

  function rgba(value, alpha) {
    const [r, g, b] = hexRgb(value);
    return `rgba(${r},${g},${b},${clamp(alpha)})`;
  }

  function shiftColor(value, amount) {
    const [r, g, b] = hexRgb(value);
    const shift = (channel) => Math.round(clamp(channel + amount, 0, 255));
    return `rgb(${shift(r)},${shift(g)},${shift(b)})`;
  }

  function value(id, fallback = 0) {
    return Number(inputs[id]?.value ?? fallback);
  }

  function timing() {
    const speed = Math.max(0.25, value("speed", 1));
    return {
      clean: value("cleanHold") / 1000 / speed,
      bloomIn: value("bloomIn") / 1000 / speed,
      bloomHold: value("bloomHold") / 1000 / speed,
      liquidIn: value("liquidIn") / 1000 / speed,
      liquidHold: value("liquidHold") / 1000 / speed,
      scatter: value("scatterDuration") / 1000 / speed,
      scatterHold: value("scatterHold") / 1000 / speed
    };
  }

  function marks() {
    const duration = timing();
    let cursor = 0;
    return {
      duration,
      cleanEnd: cursor += duration.clean,
      bloomInEnd: cursor += duration.bloomIn,
      bloomHoldEnd: cursor += duration.bloomHold,
      liquidInEnd: cursor += duration.liquidIn,
      liquidHoldEnd: cursor += duration.liquidHold,
      scatterEnd: cursor += duration.scatter,
      cycleEnd: cursor += duration.scatterHold
    };
  }

  function cycleDuration() {
    return Math.max(1 / fps, marks().cycleEnd);
  }

  function phaseAt(time) {
    const line = marks();
    const clock = mod(time, line.cycleEnd);
    if (clock < line.cleanEnd) return { name: "clean", progress: clock / Math.max(.001, line.duration.clean), clock, line };
    if (clock < line.bloomInEnd) return { name: "bloom-in", progress: (clock - line.cleanEnd) / Math.max(.001, line.duration.bloomIn), clock, line };
    if (clock < line.bloomHoldEnd) return { name: "bloom-hold", progress: (clock - line.bloomInEnd) / Math.max(.001, line.duration.bloomHold), clock, line };
    if (clock < line.liquidInEnd) return { name: "liquid-in", progress: (clock - line.bloomHoldEnd) / Math.max(.001, line.duration.liquidIn), clock, line };
    if (clock < line.liquidHoldEnd) return { name: "liquid-hold", progress: (clock - line.liquidInEnd) / Math.max(.001, line.duration.liquidHold), clock, line };
    if (clock < line.scatterEnd) return { name: "scatter", progress: (clock - line.liquidHoldEnd) / Math.max(.001, line.duration.scatter), clock, line };
    return { name: "scatter-hold", progress: (clock - line.scatterEnd) / Math.max(.001, line.duration.scatterHold), clock, line };
  }

  function timelineTime() {
    return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000);
  }

  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
    previewDirty = true;
    drawPreview(pausedAt);
  }

  function syncPauseButtons() {
    $("#pauseButton").textContent = paused ? "继续" : "暂停";
    $("#stagePauseIcon").textContent = paused ? "▶" : "Ⅱ";
    $("#stagePauseLabel").textContent = paused ? "继续" : "暂停";
    $("#stagePauseButton").setAttribute("aria-pressed", String(paused));
  }

  function restart() {
    pausedAt = 0;
    animationStart = performance.now();
    paused = false;
    lastDuration = cycleDuration();
    previewDirty = true;
    syncPauseButtons();
  }

  function togglePause() {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
    } else {
      pausedAt = timelineTime();
      paused = true;
      drawPreview(pausedAt);
    }
    syncPauseButtons();
  }

  function preservePhase() {
    const now = timelineTime();
    const before = Math.max(1 / fps, lastDuration);
    const after = cycleDuration();
    const cycleIndex = Math.floor(now / before);
    const next = (cycleIndex + mod(now, before) / before) * after;
    lastDuration = after;
    if (paused) pausedAt = next;
    else animationStart = performance.now() - next * 1000;
    previewDirty = true;
    masks.clear();
  }

  function trackedWidth(context, text, tracking) {
    const chars = Array.from(text);
    return chars.reduce((sum, char) => sum + context.measureText(char).width, 0) + Math.max(0, chars.length - 1) * tracking;
  }

  function drawTracked(context, text, x, y, tracking, mode = "fill") {
    const chars = Array.from(text);
    const total = trackedWidth(context, text, tracking);
    let cursor = x - total / 2;
    chars.forEach((char) => {
      if (mode === "stroke") context.strokeText(char, cursor, y);
      else context.fillText(char, cursor, y);
      cursor += context.measureText(char).width + tracking;
    });
  }

  function stageContent(stageName) {
    const stage = STAGES[stageName] || STAGES.clean;
    return {
      text: inputs[stage.text]?.value || " ",
      fontValue: inputs[stage.font]?.value || "stg:inter"
    };
  }

  function preloadDaisySprites() {
    DAISY_ASSETS.forEach((source) => {
      const image = new Image();
      image.decoding = "async";
      image.addEventListener("load", () => {
        daisySprites.push(image);
        previewDirty = true;
      });
      image.src = source;
    });
  }

  function styleFor(context, width, height, stageName = "clean") {
    const scale = Math.max(.24, Math.min(width / 1000, height / 900));
    const content = stageContent(stageName);
    const preset = window.STGFontLibrary?.preset(content.fontValue);
    const family = window.STGFontLibrary?.family(content.fontValue) || '"STG Inter","STG Noto Sans SC",sans-serif';
    const fontStyle = preset?.style || "normal";
    const tracking = value("tracking") * scale;
    let size = value("fontSize") * scale;
    const setFont = () => { context.font = `${fontStyle} ${inputs.fontWeight.value} ${size}px ${family}`; };
    setFont();
    const text = content.text;
    const maxWidth = width * .9;
    const measured = trackedWidth(context, text, tracking);
    if (measured > maxWidth) {
      size *= maxWidth / measured;
      setFont();
    }
    const measuredWidth = trackedWidth(context, text, tracking);
    return {
      size, scale, tracking, family, fontStyle, text, stageName,
      font: context.font,
      x: width * value("textX") / 100,
      y: height * value("textY") / 100,
      width: measuredWidth,
      left: width * value("textX") / 100 - measuredWidth / 2,
      right: width * value("textX") / 100 + measuredWidth / 2
    };
  }

  function maskFor(width, height, stageName = "clean") {
    const content = stageContent(stageName);
    const key = [stageName, width, height, content.text, content.fontValue, ...["fontWeight", "fontSize", "tracking", "textX", "textY", "density"].map((id) => inputs[id].value)].join("|");
    if (masks.has(key)) return masks.get(key);
    const scratch = document.createElement("canvas");
    scratch.width = Math.max(1, Math.round(width));
    scratch.height = Math.max(1, Math.round(height));
    const context = scratch.getContext("2d", { willReadFrequently: true });
    const style = styleFor(context, width, height, stageName);
    context.clearRect(0, 0, width, height);
    context.font = style.font;
    context.fillStyle = "#fff";
    context.textBaseline = "middle";
    drawTracked(context, style.text, style.x, style.y, style.tracking);
    const pixels = context.getImageData(0, 0, scratch.width, scratch.height).data;
    const density = value("density") / 100;
    const step = Math.max(2, Math.round(style.size / lerp(22, 42, density)));
    const points = [];
    const edgePoints = [];
    let seed = 0;
    for (let y = 0; y < scratch.height; y += step) {
      for (let x = 0; x < scratch.width; x += step) {
        seed += 1;
        const sampleX = Math.min(scratch.width - 1, Math.max(0, Math.round(x + (hash(seed + 7) - .5) * step * .7)));
        const sampleY = Math.min(scratch.height - 1, Math.max(0, Math.round(y + (hash(seed + 19) - .5) * step * .7)));
        const alpha = pixels[(sampleY * scratch.width + sampleX) * 4 + 3];
        if (alpha <= 40) continue;
        const point = { x: sampleX, y: sampleY, a: hash(seed + 3), b: hash(seed + 17), c: hash(seed + 53), d: hash(seed + 91) };
        points.push(point);
        const radius = Math.max(2, step * 2);
        const left = pixels[(sampleY * scratch.width + Math.max(0, sampleX - radius)) * 4 + 3];
        const right = pixels[(sampleY * scratch.width + Math.min(scratch.width - 1, sampleX + radius)) * 4 + 3];
        const top = pixels[(Math.max(0, sampleY - radius) * scratch.width + sampleX) * 4 + 3];
        const bottom = pixels[(Math.min(scratch.height - 1, sampleY + radius) * scratch.width + sampleX) * 4 + 3];
        if (Math.min(left, right, top, bottom) < 28) edgePoints.push(point);
      }
    }
    const materialCanvas = document.createElement("canvas");
    materialCanvas.width = scratch.width;
    materialCanvas.height = scratch.height;
    const result = { points, edgePoints, style, canvas: scratch, materialCanvas, step, waterMaterial: null };
    masks.set(key, result);
    if (masks.size > 8) masks.delete(masks.keys().next().value);
    return result;
  }

  function drawInsideGlyph(context, mask, alpha, painter) {
    if (alpha <= 0) return;
    const buffer = mask.materialCanvas;
    if (buffer.width !== mask.canvas.width || buffer.height !== mask.canvas.height) {
      buffer.width = mask.canvas.width;
      buffer.height = mask.canvas.height;
    }
    const bufferContext = buffer.getContext("2d");
    bufferContext.setTransform(1, 0, 0, 1, 0, 0);
    bufferContext.clearRect(0, 0, buffer.width, buffer.height);
    bufferContext.globalCompositeOperation = "source-over";
    bufferContext.globalAlpha = 1;
    bufferContext.filter = "none";
    painter(bufferContext, buffer.width, buffer.height);
    bufferContext.globalCompositeOperation = "destination-in";
    bufferContext.drawImage(mask.canvas, 0, 0);
    bufferContext.globalCompositeOperation = "source-over";
    context.save();
    context.globalAlpha = clamp(alpha);
    context.drawImage(buffer, 0, 0);
    context.restore();
  }

  function smoothstepRange(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(.00001, edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function liquidMaterialFor(mask) {
    if (mask.waterMaterial) return mask.waterMaterial;
    const { style } = mask;
    const width = mask.canvas.width;
    const height = mask.canvas.height;
    const shape = document.createElement("canvas");
    shape.width = width;
    shape.height = height;
    const shapeContext = shape.getContext("2d", { willReadFrequently: true });
    const roundness = Math.max(2, value("roundness") * style.scale);

    shapeContext.clearRect(0, 0, width, height);
    shapeContext.filter = `blur(${Math.max(1, roundness * .46)}px)`;
    shapeContext.globalAlpha = .96;
    shapeContext.drawImage(mask.canvas, 0, 0);
    shapeContext.filter = "none";
    shapeContext.fillStyle = "#fff";
    mask.edgePoints.forEach((point, index) => {
      if (point.y < style.y + style.size * .08 || index % 7 !== 0) return;
      const drop = style.size * (.035 + point.b * .07);
      const length = style.size * (.025 + point.c * .17);
      shapeContext.beginPath();
      shapeContext.roundRect(point.x - drop * .58, point.y - drop * .25, drop * 1.16, length + drop, drop * .58);
      shapeContext.fill();
      shapeContext.beginPath();
      shapeContext.arc(point.x, point.y + length + drop * .25, drop * .66, 0, Math.PI * 2);
      shapeContext.fill();
    });

    const heightField = document.createElement("canvas");
    heightField.width = width;
    heightField.height = height;
    const heightContext = heightField.getContext("2d", { willReadFrequently: true });
    heightContext.filter = `blur(${Math.max(2, roundness * .72)}px)`;
    heightContext.drawImage(shape, 0, 0);
    heightContext.filter = "none";

    const shapePixels = shapeContext.getImageData(0, 0, width, height).data;
    const heightPixels = heightContext.getImageData(0, 0, width, height).data;
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const outputContext = output.getContext("2d");
    const image = outputContext.createImageData(width, height);
    const [baseR, baseG, baseB] = hexRgb(inputs.liquidColor.value);
    const gloss = value("gloss") / 100;
    const stride = width * 4;
    const x0 = Math.max(1, Math.floor(style.left - style.size * .28));
    const x1 = Math.min(width - 2, Math.ceil(style.right + style.size * .28));
    const y0 = Math.max(1, Math.floor(style.y - style.size * .76));
    const y1 = Math.min(height - 2, Math.ceil(style.y + style.size * .88));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const offset = (y * width + x) * 4;
        const raw = shapePixels[offset + 3] / 255;
        const h = heightPixels[offset + 3] / 255;
        const alpha = smoothstepRange(.14, .48, Math.max(raw, h * .86));
        if (alpha <= .005) continue;
        const gx = (heightPixels[offset - 4 + 3] - heightPixels[offset + 4 + 3]) / 255;
        const gy = (heightPixels[offset - stride + 3] - heightPixels[offset + stride + 3]) / 255;
        const nz = .16;
        const length = Math.hypot(gx * 2.7, gy * 2.7, nz) || 1;
        const nx = gx * 2.7 / length;
        const ny = gy * 2.7 / length;
        const normalZ = nz / length;
        const diffuse = clamp(.54 + nx * -.42 + ny * -.52 + normalZ * .2, .12, 1.1);
        const specular = Math.pow(clamp(nx * -.4 + ny * -.48 + normalZ * .77, 0, 1), 18) * gloss;
        const rim = Math.pow(1 - normalZ, 1.6) * .38;
        image.data[offset] = clamp(baseR * diffuse + 255 * specular + 18 * rim, 0, 255);
        image.data[offset + 1] = clamp(baseG * diffuse + 255 * specular + 30 * rim, 0, 255);
        image.data[offset + 2] = clamp(baseB * diffuse + 255 * specular + 42 * rim, 0, 255);
        image.data[offset + 3] = Math.round(alpha * 255);
      }
    }
    outputContext.putImageData(image, 0, 0);
    mask.waterMaterial = output;
    return output;
  }

  function pointOrder(point, mask) {
    const style = mask.style;
    const direction = inputs.scatterDirection.value;
    const normalized = clamp((point.x - style.left) / Math.max(1, style.width));
    if (direction === "left") return normalized;
    if (direction === "right") return 1 - normalized;
    if (direction === "random") return point.a;
    return clamp(Math.abs(point.x - style.x) / Math.max(1, style.width / 2));
  }

  function rhythmEase(progress) {
    const t = clamp(progress);
    if (inputs.rhythm.value === "smooth") return smooth(t);
    if (inputs.rhythm.value === "pulse") return clamp(smooth(t) + Math.sin(t * Math.PI * 4) * (1 - t) * .13);
    if (inputs.rhythm.value === "wave") return smooth(t * t * (3 - 2 * t));
    return clamp(easeOutBack(t));
  }

  function localProgress(progress, point, mask, duration) {
    const stagger = value("scatterStagger") / 1000 / Math.max(.001, duration);
    const delay = pointOrder(point, mask) * Math.min(.8, stagger);
    return rhythmEase((progress - delay) / Math.max(.05, 1 - delay));
  }

  function drawClean(context, style, alpha = 1, color = inputs.cleanColor.value) {
    context.save();
    context.globalAlpha = clamp(alpha);
    context.font = style.font;
    context.fillStyle = color;
    context.textBaseline = "middle";
    drawTracked(context, style.text, style.x, style.y, style.tracking);
    context.restore();
  }

  function drawCleanMaterial(context, mask, time, alpha = 1, entrance = 1) {
    drawClean(context, mask.style, alpha * clamp(entrance * 3.2));
  }

  function drawFlower(context, x, y, radius, rotation, color, alpha, seed = 0) {
    const sprite = daisySprites.length ? daisySprites[Math.abs(seed) % daisySprites.length] : null;
    const nodes = Math.max(3, Math.round(value("petalCount")));
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.globalAlpha = clamp(alpha);
    if (sprite) {
      const spriteSize = radius * 4.2;
      context.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      context.restore();
      return;
    }
    for (let node = 0; node < nodes; node += 1) {
      const angle = node / nodes * Math.PI * 2 + hash(seed + node * 7) * .7;
      const distance = radius * (.16 + hash(seed + node * 13) * .42);
      const rx = radius * (.34 + hash(seed + node * 17) * .34);
      const ry = radius * (.28 + hash(seed + node * 23) * .32);
      context.fillStyle = node % 3 === 0 ? shiftColor(color, 22) : node % 3 === 1 ? color : shiftColor(color, -24);
      context.beginPath();
      context.ellipse(Math.cos(angle) * distance, Math.sin(angle) * distance, rx, ry, angle, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha *= .68;
    context.fillStyle = inputs.backgroundColor.value;
    context.beginPath();
    context.arc(radius * (hash(seed + 101) - .5) * .32, radius * (hash(seed + 151) - .5) * .28, radius * (.08 + hash(seed + 201) * .16), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawBloom(context, mask, progress, time, alpha = 1) {
    const q = smooth(progress);
    const size = value("particleSize") * mask.style.scale * 1.04;
    const drift = value("bloomDrift") * mask.style.scale;
    const spread = value("spread") * mask.style.scale * .34;
    const density = value("density") / 100;
    const color = inputs.bloomColor.value;
    drawClean(context, mask.style, alpha * (1 - q) * .22, shiftColor(color, -42));
    context.save();
    mask.points.forEach((point, index) => {
      if (index % 2 !== 0 || point.a > Math.min(1, density + .3)) return;
      const order = clamp((point.x - mask.style.left) / Math.max(1, mask.style.width));
      const local = clamp((q - order * .14 - point.a * .06) / .78);
      if (local <= 0) return;
      const pop = easeOutBack(local);
      const kick = (1 - smooth(local)) * spread * (.15 + point.b * .52);
      const angle = point.c * Math.PI * 2;
      const jitterX = Math.sin(time * (1.35 + point.a * .35) + index) * drift * .085;
      const jitterY = Math.cos(time * (1.18 + point.b * .3) + index * .7) * drift * .07;
      const x = point.x + Math.cos(angle) * kick + jitterX;
      const y = point.y + Math.sin(angle) * kick * .4 + jitterY;
      const radius = Math.max(2.8, size * (.8 + point.d * 1.02) * Math.max(.12, pop));
      drawFlower(context, x, y, radius, (point.b - .5) * .5 + Math.sin(time * .8 + index) * .025, color, alpha * local * (.76 + point.c * .24), index);
    });
    context.restore();
  }

  function drawLiquid(context, mask, time, alpha = 1) {
    const style = mask.style;
    const material = liquidMaterialFor(mask);
    const pulse = 1 + Math.sin(time * 2.25) * .006;
    context.save();
    context.translate(style.x, style.y);
    context.scale(pulse, 1 / pulse);
    context.translate(-style.x, -style.y);
    context.globalAlpha = clamp(alpha);
    context.drawImage(material, 0, 0);
    context.restore();
  }

  function drawDrops(context, mask, time, alpha = 1, expansion = 1) {
    const size = value("particleSize") * mask.style.scale;
    const spread = value("spread") * mask.style.scale * expansion;
    const drift = value("drift") * mask.style.scale;
    const density = value("density") / 100;
    context.save();
    const color = inputs.liquidColor.value;
    mask.edgePoints.forEach((point, index) => {
      if (index % 3 !== 0 || point.a > density || point.y > mask.style.y + mask.style.size * .4) return;
      const angle = point.b * Math.PI * 2;
      const distance = spread * (.35 + point.c * .85) + Math.sin(time * (1.2 + point.a) + index) * drift;
      const x = point.x + Math.cos(angle) * distance;
      const y = point.y + Math.sin(angle) * distance * .46 - Math.sin(time * 1.7 + index) * drift * .22;
      const radius = Math.max(1.2, size * (.22 + point.a * .58));
      const sphere = context.createRadialGradient(x - radius * .35, y - radius * .42, radius * .05, x, y, radius);
      sphere.addColorStop(0, "rgba(245,254,255,.98)");
      sphere.addColorStop(.18, shiftColor(color, 48));
      sphere.addColorStop(.72, color);
      sphere.addColorStop(1, shiftColor(color, -58));
      context.globalAlpha = clamp(alpha) * (.42 + point.c * .56);
      context.fillStyle = sphere;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  function scatterSign(point, style) {
    const direction = inputs.scatterDirection.value;
    if (direction === "left") return 1;
    if (direction === "right") return -1;
    if (direction === "random") return point.b < .5 ? -1 : 1;
    return point.x < style.x ? -1 : 1;
  }

  function drawScatter(context, mask, progress, time, alpha = 1) {
    const style = mask.style;
    const q = rhythmEase(progress);
    const distance = value("scatterDistance") * style.scale;
    const blur = value("smokeBlur") * style.scale;
    const smokeExtent = style.width * value("smokeWidth") / 100;
    const color = inputs.smokeColor.value;

    context.save();
    context.globalAlpha = clamp(alpha) * (.08 + q * .27);
    context.filter = `blur(${Math.max(.4, blur * .28)}px)`;
    for (let plumeIndex = 0; plumeIndex < 7; plumeIndex += 1) {
      const side = plumeIndex % 2 ? -1 : 1;
      const band = (plumeIndex - 3) / 3;
      const edge = style.x + side * (style.width * (.28 + q * .42) + smokeExtent * q * (.05 + hash(plumeIndex + 8) * .12));
      const y = style.y + band * style.size * .23 + Math.sin(time * .85 + plumeIndex) * blur * .12;
      const plume = style.size * (.12 + hash(plumeIndex + 2) * .15) + blur * .55;
      context.save();
      context.translate(edge, y);
      context.scale(2.2 + q * 3.2, .34 + hash(plumeIndex + 6) * .35);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, plume);
      gradient.addColorStop(0, rgba(color, .68));
      gradient.addColorStop(.4, rgba(color, .26));
      gradient.addColorStop(1, rgba(color, 0));
      context.fillStyle = gradient;
      context.fillRect(-plume, -plume, plume * 2, plume * 2);
      context.restore();
    }
    context.restore();

    context.save();
    mask.points.forEach((point, index) => {
      if (point.a > value("density") / 100 + .18) return;
      const local = localProgress(q, point, mask, timing().scatter);
      const sign = scatterSign(point, style);
      const travel = sign * distance * easeOut(local) * (.28 + point.c * 1.05);
      const wobble = Math.sin(time * (1.3 + point.a) + index) * blur * .14 * local;
      const x = point.x + travel;
      const y = point.y + wobble + (point.d - .5) * blur * .32 * local;
      const length = Math.max(1, style.scale * (1.1 + point.a * 2.8) + Math.abs(travel) * .19);
      const height = Math.max(.45, style.scale * (.42 + point.b * 1.28));
      context.fillStyle = index % 5 === 0 ? shiftColor(color, 28) : index % 7 === 0 ? shiftColor(color, -22) : color;
      context.globalAlpha = clamp(alpha) * (.28 + point.d * .5) * (1 - local * .68);
      if (local < .82) {
        context.beginPath();
        context.arc(point.x, point.y, height * (.62 + point.c * .54), 0, Math.PI * 2);
        context.fill();
      }
      if (local <= 0) return;
      context.globalAlpha *= .72;
      context.fillRect(sign < 0 ? x - length : x, y - height / 2, length, height);
      context.beginPath();
      context.arc(x + sign * length, y, height * (.55 + point.c), 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  function drawBloomStage(context, width, height, progress, time, alpha = 1) {
    drawBloom(context, maskFor(width, height, "bloom"), progress, time, alpha);
  }

  function drawLiquidStage(context, width, height, time, alpha = 1, expansion = 1, entrance = 1) {
    const mask = maskFor(width, height, "liquid");
    drawLiquid(context, mask, time, alpha);
    drawDrops(context, mask, time, alpha, expansion);
  }

  function drawScatterStage(context, width, height, progress, time, alpha = 1) {
    drawScatter(context, maskFor(width, height, "scatter"), progress, time, alpha);
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d", { alpha: false, willReadFrequently: target !== canvas });
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = inputs.backgroundColor.value;
    context.fillRect(0, 0, width, height);
    const phase = phaseAt(time);
    const q = smooth(phase.progress);

    if (phase.name === "clean") {
      drawCleanMaterial(context, maskFor(width, height, "clean"), time, 1, phase.progress);
    } else if (phase.name === "bloom-in") {
      drawCleanMaterial(context, maskFor(width, height, "clean"), time, 1 - q);
      drawBloomStage(context, width, height, phase.progress, time, q);
    } else if (phase.name === "bloom-hold") {
      drawBloomStage(context, width, height, 1, time, 1);
    } else if (phase.name === "liquid-in") {
      drawBloomStage(context, width, height, 1, time, 1 - q);
      drawLiquidStage(context, width, height, time, q, q, q);
    } else if (phase.name === "liquid-hold") {
      drawLiquidStage(context, width, height, time, 1, 1, 1);
    } else if (phase.name === "scatter") {
      drawLiquidStage(context, width, height, time, 1 - q, 1 + q * .25, 1);
      drawScatterStage(context, width, height, phase.progress, time, q);
    } else {
      drawScatterStage(context, width, height, 1, time, 1);
    }

    if (target === canvas) {
      canvas.dataset.motionPhase = phase.name;
      canvas.dataset.motionProgress = phase.progress.toFixed(3);
      canvas.dataset.renderMode = "dynamic-material";
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(1.75, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth));
    const height = Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.dataset.ratio = String(ratio);
      previewDirty = true;
      masks.clear();
    }
  }

  function drawPreview(time = timelineTime()) {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    previewDirty = false;
    frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`;
    updateTimelinePlayhead(time);
  }

  function previewLoop() {
    if (!paused || previewDirty) drawPreview();
    rafId = requestAnimationFrame(previewLoop);
  }

  const FORMATS = {
    speed: (v) => `${Number(v).toFixed(2)}×`,
    cleanHold: (v) => `${(v / 1000).toFixed(2)}秒`, bloomIn: (v) => `${(v / 1000).toFixed(2)}秒`, bloomHold: (v) => `${(v / 1000).toFixed(2)}秒`,
    liquidIn: (v) => `${(v / 1000).toFixed(2)}秒`, liquidHold: (v) => `${(v / 1000).toFixed(2)}秒`, scatterDuration: (v) => `${(v / 1000).toFixed(2)}秒`, scatterHold: (v) => `${(v / 1000).toFixed(2)}秒`,
    scatterStagger: (v) => `${v}ms`, scatterDistance: (v) => `${v}px`, density: (v) => `${v}%`, particleSize: (v) => `${v}px`, petalCount: (v) => `${v}`,
    bloomDrift: (v) => `${v}px`, spread: (v) => `${v}px`, drift: (v) => `${v}px`, roundness: (v) => `${v}px`, gloss: (v) => `${v}%`, smokeWidth: (v) => `${v}%`, smokeBlur: (v) => `${v}px`,
    fontSize: (v) => `${v}px`, tracking: (v) => `${v}px`, textX: (v) => `${v}%`, textY: (v) => `${v}%`
  };

  function updateOutputs() {
    Object.entries(FORMATS).forEach(([id, format]) => {
      const output = document.getElementById(`${id}Out`);
      if (output && inputs[id]) output.textContent = format(inputs[id].value);
    });
    renderTimeline();
  }

  function timelineBeats() {
    const line = marks();
    return [
      { kind: "intro", name: "白字停留", start: 0, end: line.cleanEnd },
      { kind: "orbit", name: "花粒侵入", start: line.cleanEnd, end: line.bloomInEnd },
      { kind: "hold", name: "花粒停留", start: line.bloomInEnd, end: line.bloomHoldEnd },
      { kind: "color", name: "蓝胶凝结", start: line.bloomHoldEnd, end: line.liquidInEnd },
      { kind: "hold", name: "蓝胶停留", start: line.liquidInEnd, end: line.liquidHoldEnd },
      { kind: "replace", name: "横向散开", start: line.liquidHoldEnd, end: line.scatterEnd },
      { kind: "contact", name: "余尘停留", start: line.scatterEnd, end: line.cycleEnd }
    ].map((beat, index) => ({ ...beat, index, duration: Math.max(.001, beat.end - beat.start) }));
  }

  function formatSeconds(value) {
    return value < 1 ? `${value.toFixed(2)}秒` : `${value.toFixed(1)}秒`;
  }

  function renderTimeline() {
    const track = $("#scatterTimelineTrack");
    const list = $("#scatterTimelineList");
    if (!track || !list) return;
    const beats = timelineBeats();
    track.replaceChildren();
    list.replaceChildren();
    beats.forEach((beat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `me-choreo-block is-${beat.kind}`;
      button.style.flex = `${Math.max(.08, beat.duration)} 1 0`;
      button.dataset.beatIndex = String(beat.index);
      button.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.name}</strong><small>${formatSeconds(beat.duration)}</small>`;
      button.addEventListener("click", () => setTime(beat.start + .001));
      track.append(button);
      const row = document.createElement("li");
      row.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.name}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      list.append(row);
    });
    const playhead = document.createElement("i");
    playhead.className = "me-choreo-playhead";
    playhead.id = "scatterTimelinePlayhead";
    playhead.setAttribute("aria-hidden", "true");
    track.append(playhead);
  }

  function updateTimelinePlayhead(time) {
    const duration = cycleDuration();
    const clock = mod(time, duration);
    const playhead = $("#scatterTimelinePlayhead");
    if (playhead) playhead.style.left = `${clock / duration * 100}%`;
    timelineBeats().forEach((beat) => {
      const block = document.querySelector(`[data-beat-index="${beat.index}"]`);
      block?.classList.toggle("is-active", clock >= beat.start && clock < beat.end);
    });
  }

  function collectScheme() {
    return { version: 2, effect: "scatter", fields: Object.fromEntries(FIELD_IDS.map((id) => [id, inputs[id].value])) };
  }

  function applyScheme(scheme, message = "方案已应用。") {
    const imported = scheme?.fields || {};
    const legacyText = imported.copyText;
    const legacyFont = imported.fontFamily;
    const migrated = { ...imported };
    Object.values(STAGES).forEach((stage) => {
      if (legacyText != null && migrated[stage.text] == null) migrated[stage.text] = legacyText;
      if (legacyFont != null && migrated[stage.font] == null) migrated[stage.font] = legacyFont;
    });
    const fields = { ...DEFAULTS, ...migrated };
    Object.entries(fields).forEach(([id, fieldValue]) => {
      const field = inputs[id];
      if (field && fieldValue != null) field.value = String(fieldValue);
    });
    masks.clear();
    updateOutputs();
    restart();
    if (schemeStatus) schemeStatus.textContent = message;
  }

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(collectScheme()));
        if (schemeStatus) schemeStatus.textContent = "已自动保存当前散动效方案。";
      } catch (_) {
        if (schemeStatus) schemeStatus.textContent = "自动保存失败，请使用“保存方案”下载 JSON。";
      }
    }, 500);
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1800);
  }

  function saveScheme() {
    const scheme = collectScheme();
    localStorage.setItem(SAVE_KEY, JSON.stringify(scheme));
    downloadBlob(new Blob([JSON.stringify(scheme)], { type: "application/json" }), "scatter-scheme.json");
    if (schemeStatus) schemeStatus.textContent = "方案已保存并下载 JSON。";
  }

  FIELD_IDS.forEach((id) => {
    const input = inputs[id];
    if (!input) return;
    const eventName = input.tagName === "SELECT" || input.type === "color" ? "change" : "input";
    input.addEventListener(eventName, () => {
      updateOutputs();
      preservePhase();
      scheduleAutoSave();
    });
  });

  function applyTextPreset(texts, font) {
    Object.values(STAGES).forEach((stage, index) => {
      inputs[stage.text].value = texts[index] || texts[0] || "";
      inputs[stage.font].value = font;
    });
    masks.clear();
    restart();
    scheduleAutoSave();
  }

  $("#englishPreset").addEventListener("click", () => applyTextPreset(["Prompt", "Shape it", "Make it", "Scatter"], "stg:inter"));
  $("#chinesePreset").addEventListener("click", () => applyTextPreset(["让文字", "开始生长", "凝成形状", "向外散开"], "stg:noto-sc"));
  $("#restartTop").addEventListener("click", restart);
  $("#restartButton").addEventListener("click", restart);
  $("#stageRestartButton").addEventListener("click", restart);
  $("#pauseButton").addEventListener("click", togglePause);
  $("#stagePauseButton").addEventListener("click", togglePause);
  $("#backButton").addEventListener("click", () => { if (!paused) togglePause(); setTime(Math.max(0, pausedAt - 1 / fps)); });
  $("#forwardButton").addEventListener("click", () => { if (!paused) togglePause(); setTime(pausedAt + 1 / fps); });
  $("#saveButton").addEventListener("click", saveScheme);
  $("#resetButton").addEventListener("click", () => { localStorage.removeItem(SAVE_KEY); applyScheme({ fields: DEFAULTS }, "已恢复默认散动效方案。"); });
  $("#clearButton").addEventListener("click", () => { Object.values(STAGES).forEach((stage) => { inputs[stage.text].value = ""; }); masks.clear(); restart(); scheduleAutoSave(); if (schemeStatus) schemeStatus.textContent = "已清空四段文字，可分别重新输入内容。"; });
  $("#importFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const scheme = JSON.parse(await file.text());
      if (!scheme?.fields) throw new Error("方案格式不正确");
      applyScheme(scheme, "方案已导入。所有散开阶段已同步恢复。");
      localStorage.setItem(SAVE_KEY, JSON.stringify(collectScheme()));
    } catch (error) {
      if (schemeStatus) schemeStatus.textContent = `导入失败：${error.message || "文件无效"}`;
    }
  });

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else previewLoop();
  });

  function exportDimensions(vertical = false) {
    if (vertical) return [1080, 1920];
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }

  function makeExportCanvas(vertical = false) {
    const [width, height] = exportDimensions(vertical);
    const output = document.createElement("canvas");
    output.width = Math.max(240, Math.min(3840, Math.round(width)));
    output.height = Math.max(240, Math.min(3840, Math.round(height)));
    return output;
  }

  function selectedDuration() {
    const selected = $("#exportDuration").value;
    if (selected === "cycle") return cycleDuration();
    if (selected === "custom") return Math.max(.5, Number($("#customDuration").value));
    return Number(selected);
  }

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }

  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, timelineTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `scatter-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = makeExportCanvas();
    const rate = Number($("#exportFps").value) || 30;
    const duration = selectedDuration();
    const frameTotal = Math.max(1, Math.ceil(duration * rate));
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    setBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    for (let frame = 0; frame < frameTotal; frame += 1) {
      renderFrame(output, frame / rate, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / rate });
    }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `scatter-${output.width}x${output.height}.gif`); setBusy(false, "GIF 已生成。"); });
    gif.render();
  });

  async function exportMp4(vertical = false) {
    if (!window.HME || typeof HME.createH264MP4Encoder !== "function") { setBusy(false, "MP4 编码器未加载，请刷新后重试。"); return; }
    let [width, height] = exportDimensions(vertical);
    width = Math.max(240, Math.min(3840, Math.round(width / 2) * 2));
    height = Math.max(240, Math.min(3840, Math.round(height / 2) * 2));
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { willReadFrequently: true });
    const rate = Number($("#exportFps").value) || 30;
    const duration = selectedDuration();
    const frameTotal = Math.max(1, Math.ceil(duration * rate));
    const encoder = await HME.createH264MP4Encoder();
    encoder.outputFilename = `scatter-${width}x${height}.mp4`;
    encoder.width = width;
    encoder.height = height;
    encoder.frameRate = rate;
    encoder.kbps = 18000;
    encoder.groupOfPictures = Math.max(10, Math.round(rate / 2));
    encoder.initialize();
    setBusy(true, `正在导出 MP4 ${width} × ${height} · 0%`);
    try {
      for (let frame = 0; frame < frameTotal; frame += 1) {
        renderFrame(output, frame / rate, width, height, 1);
        encoder.addFrameRgba(context.getImageData(0, 0, width, height).data);
        if (frame % 2 === 0) {
          exportStatus.textContent = `正在导出 MP4 ${width} × ${height} · ${Math.round((frame + 1) / frameTotal * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), `scatter-${width}x${height}.mp4`);
      setBusy(false, `MP4 已生成 · ${width} × ${height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      setBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder.delete(); } catch (_) {}
    }
  }

  $("#exportVideo").addEventListener("click", () => exportMp4(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportMp4(true));

  let initial = { fields: DEFAULTS };
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) initial = JSON.parse(saved);
  } catch (_) {}
  applyScheme(initial, "已载入散动效方案。");
  preloadDaisySprites();
  lastDuration = cycleDuration();
  syncPauseButtons();
  resizeCanvas();
  previewLoop();
  document.fonts?.ready?.then(() => { masks.clear(); previewDirty = true; });
})();
