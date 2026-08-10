(function () {
  "use strict";

  const canvas = document.querySelector("#prism-canvas");
  const context = canvas.getContext("2d", { alpha: false });
  const controls = {
    text: document.querySelector("#prism-text"),
    depth: document.querySelector("#prism-depth"),
    spread: document.querySelector("#prism-spread"),
    refraction: document.querySelector("#prism-refraction"),
    slices: document.querySelector("#prism-slices"),
    size: document.querySelector("#prism-size"),
    speed: document.querySelector("#prism-speed"),
    rotation: document.querySelector("#prism-rotation"),
    palette: document.querySelector("#prism-palette"),
    surface: document.querySelector("#prism-surface"),
    grid: document.querySelector("#prism-grid"),
    random: document.querySelector("#prism-random"),
    pause: document.querySelector("#prism-pause"),
    save: document.querySelector("#prism-save")
  };

  const palettes = {
    signal: ["#ff2b6a", "#00e5ff", "#c8ff2e"],
    print: ["#ff006e", "#00cfe8", "#ffe600"],
    ice: ["#2457ff", "#00ffd5", "#f4f7ff"],
    ember: ["#ff3b16", "#ffb000", "#ff4fa3"]
  };

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    phase: 0,
    lastTime: 0,
    paused: false,
    pulse: 0,
    pointerX: 0.5,
    pointerY: 0.5,
    targetX: 0.5,
    targetY: 0.5
  };

  const readout = document.querySelector("#prism-readout");
  const liveRegion = document.querySelector("#prism-live");
  const textCount = document.querySelector("#text-count");
  const rangeControls = [...document.querySelectorAll("input[type='range']")];

  function numberValue(control) {
    return Number(control.value);
  }

  function updateOutput(control) {
    const output = document.querySelector(`[data-output="${control.id}"]`);
    if (!output) return;
    if (control === controls.speed) output.value = numberValue(control).toFixed(2);
    else if (control === controls.rotation) output.value = `${control.value}°`;
    else output.value = control.value;
  }

  function syncInterface() {
    rangeControls.forEach(updateOutput);
    textCount.value = `${[...controls.text.value].length} / 18`;
    readout.textContent = `${state.paused ? "HOLD" : "LIVE"} · ${controls.depth.value} LAYERS`;
    document.body.dataset.surface = controls.surface.value;
  }

  function resizeCanvas() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function drawGrid(dark, leftEdge) {
    if (!controls.grid.checked) return;
    const width = state.width;
    const height = state.height;
    context.save();
    context.lineWidth = 1;
    context.strokeStyle = dark ? "rgba(255,255,255,0.095)" : "rgba(17,17,15,0.11)";
    context.beginPath();
    const step = Math.max(54, Math.min(width, height) / 10);
    for (let x = leftEdge + step; x < width; x += step) {
      context.moveTo(Math.round(x) + 0.5, 0);
      context.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = step; y < height; y += step) {
      context.moveTo(leftEdge, Math.round(y) + 0.5);
      context.lineTo(width, Math.round(y) + 0.5);
    }
    context.stroke();

    context.strokeStyle = dark ? "rgba(200,255,46,0.26)" : "rgba(36,87,255,0.24)";
    context.beginPath();
    context.moveTo(leftEdge, height * 0.5 + 0.5);
    context.lineTo(width, height * 0.5 + 0.5);
    context.moveTo((leftEdge + width) * 0.5 + 0.5, 0);
    context.lineTo((leftEdge + width) * 0.5 + 0.5, height);
    context.stroke();
    context.restore();
  }

  function drawCornerMarks(dark, leftEdge) {
    const ink = dark ? "rgba(255,255,255,0.58)" : "rgba(17,17,15,0.62)";
    const x1 = leftEdge + 24;
    const x2 = state.width - 24;
    const y1 = 24;
    const y2 = state.height - 24;
    const length = 22;
    context.save();
    context.strokeStyle = ink;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x1, y1 + length); context.lineTo(x1, y1); context.lineTo(x1 + length, y1);
    context.moveTo(x2 - length, y1); context.lineTo(x2, y1); context.lineTo(x2, y1 + length);
    context.moveTo(x1, y2 - length); context.lineTo(x1, y2); context.lineTo(x1 + length, y2);
    context.moveTo(x2 - length, y2); context.lineTo(x2, y2); context.lineTo(x2, y2 - length);
    context.stroke();
    context.restore();
  }

  function fittedFontSize(text, requested, stageWidth) {
    let size = Math.min(requested, state.height * (window.innerWidth <= 720 ? 0.28 : 0.46));
    context.font = `900 ${size}px "STG Prism", "Microsoft YaHei", sans-serif`;
    const measured = Math.max(1, context.measureText(text).width);
    size *= Math.min(1, stageWidth * 0.78 / measured);
    return Math.max(48, size);
  }

  function drawBackdropLabel(text, centerX, centerY, fontSize, dark) {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `900 ${fontSize * 1.55}px "STG Prism", "Microsoft YaHei", sans-serif`;
    context.lineWidth = 1;
    context.strokeStyle = dark ? "rgba(255,255,255,0.04)" : "rgba(17,17,15,0.045)";
    context.strokeText(text, 0, 0);
    context.restore();
  }

  function drawTextLayer(options) {
    const {
      text, centerX, centerY, fontSize, layer, layers, slices, spread,
      refraction, rotation, colors, dark, crisp
    } = options;
    const progress = layers <= 1 ? 1 : layer / (layers - 1);
    const depth = 1 - progress;
    const scale = crisp ? 1 : 0.76 + progress * 0.24;
    const pulse = state.pulse * depth;
    const parallaxX = (state.pointerX - 0.5) * (42 + pulse * 20) * depth;
    const parallaxY = (state.pointerY - 0.5) * 30 * depth;
    const stackY = crisp ? 0 : (layer - (layers - 1) / 2) * spread * 0.34;
    const bandHeight = fontSize * 1.18 / slices;
    const bandTop = centerY - fontSize * 0.59;

    for (let band = 0; band < slices; band += 1) {
      const y = bandTop + band * bandHeight;
      const bandWave = Math.sin(state.phase * 1.9 + band * 0.78 + layer * 0.31);
      const wave = bandWave * refraction * (crisp ? 0.16 : 0.18 + depth * 0.72);
      const pulseKick = Math.sin(band * 1.7 + state.phase * 3) * pulse * 16;
      const channelSet = crisp ? [1] : [0, 1, 2];

      for (const channel of channelSet) {
        const channelOffset = crisp ? 0 : (channel - 1) * spread * (0.32 + depth * 0.82);
        context.save();
        context.beginPath();
        context.rect(0, y - 1, state.width, bandHeight + 2);
        context.clip();
        context.translate(
          centerX + parallaxX + wave + channelOffset + pulseKick,
          centerY + parallaxY + stackY
        );
        context.rotate(rotation + (state.pointerX - 0.5) * 0.045 * depth);
        context.scale(scale, scale);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `900 ${fontSize}px "STG Prism", "Microsoft YaHei", sans-serif`;
        context.globalCompositeOperation = crisp ? "source-over" : (dark ? "screen" : "multiply");
        context.globalAlpha = crisp ? 0.96 : 0.055 + progress * 0.035;
        context.fillStyle = crisp ? (dark ? "#f5f4ef" : "#11110f") : colors[channel];
        context.fillText(text, 0, 0);
        context.restore();
      }
    }
  }

  function drawMetadata(dark, leftEdge, text, layers) {
    const ink = dark ? "rgba(255,255,255,0.62)" : "rgba(17,17,15,0.62)";
    context.save();
    context.fillStyle = ink;
    context.font = "10px Consolas, monospace";
    context.textBaseline = "top";
    context.fillText("PRISM / CHROMATIC DEPTH", leftEdge + 30, 30);
    context.textAlign = "right";
    context.fillText(`${String([...text].length).padStart(2, "0")} GLYPHS · ${String(layers).padStart(2, "0")} PLANES`, state.width - 30, 30);
    context.restore();
  }

  function render(time) {
    const delta = state.lastTime ? Math.min(40, time - state.lastTime) : 16;
    state.lastTime = time;
    if (!state.paused) state.phase += delta * 0.001 * numberValue(controls.speed);
    state.pulse *= 0.93;
    state.pointerX += (state.targetX - state.pointerX) * 0.055;
    state.pointerY += (state.targetY - state.pointerY) * 0.055;

    const dark = controls.surface.value === "dark";
    const background = dark ? "#080908" : "#f5f4ef";
    const leftEdge = window.innerWidth > 720 ? 350 : 0;
    const stageWidth = state.width - leftEdge;
    const centerX = leftEdge + stageWidth * 0.5;
    const centerY = window.innerWidth <= 720 ? state.height * 0.27 : state.height * 0.52;
    const text = controls.text.value.trim() || " ";
    const layers = numberValue(controls.depth);
    const spread = numberValue(controls.spread);
    const refraction = numberValue(controls.refraction);
    const slices = numberValue(controls.slices);
    const fontSize = fittedFontSize(text, numberValue(controls.size), stageWidth);
    const rotation = numberValue(controls.rotation) * Math.PI / 180;
    const colors = palettes[controls.palette.value];

    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.fillStyle = background;
    context.fillRect(0, 0, state.width, state.height);

    drawGrid(dark, leftEdge);
    drawCornerMarks(dark, leftEdge);
    drawBackdropLabel(text, centerX, centerY, fontSize, dark);

    for (let layer = 0; layer < layers; layer += 1) {
      drawTextLayer({
        text, centerX, centerY, fontSize, layer, layers, slices, spread,
        refraction, rotation, colors, dark, crisp: false
      });
    }

    drawTextLayer({
      text, centerX, centerY, fontSize, layer: layers - 1, layers, slices,
      spread, refraction, rotation, colors, dark, crisp: true
    });

    drawMetadata(dark, leftEdge, text, layers);
    window.requestAnimationFrame(render);
  }

  function randomize() {
    const randomInteger = (minimum, maximum) => Math.round(minimum + Math.random() * (maximum - minimum));
    controls.depth.value = randomInteger(6, 16);
    controls.spread.value = randomInteger(8, 38);
    controls.refraction.value = randomInteger(18, 78);
    controls.slices.value = randomInteger(7, 19);
    controls.rotation.value = randomInteger(-12, 12);
    controls.palette.value = Object.keys(palettes)[randomInteger(0, 3)];
    state.pulse = 1;
    syncInterface();
    liveRegion.textContent = "已生成一组新的棱镜参数";
  }

  function togglePause() {
    state.paused = !state.paused;
    controls.pause.setAttribute("aria-pressed", String(state.paused));
    controls.pause.textContent = state.paused ? "继续" : "暂停";
    syncInterface();
    liveRegion.textContent = state.paused ? "动画已暂停" : "动画已继续";
  }

  function saveFrame() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.download = `stg-prism-${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      liveRegion.textContent = "当前画面已导出为 PNG";
    }, "image/png");
  }

  rangeControls.forEach((control) => control.addEventListener("input", () => {
    updateOutput(control);
    syncInterface();
  }));
  controls.text.addEventListener("input", syncInterface);
  controls.palette.addEventListener("change", () => { state.pulse = 0.7; });
  controls.surface.addEventListener("change", syncInterface);
  controls.grid.addEventListener("change", syncInterface);
  controls.random.addEventListener("click", randomize);
  controls.pause.addEventListener("click", togglePause);
  controls.save.addEventListener("click", saveFrame);

  canvas.addEventListener("pointermove", (event) => {
    state.targetX = event.clientX / Math.max(1, state.width);
    state.targetY = event.clientY / Math.max(1, state.height);
  });
  canvas.addEventListener("pointerleave", () => {
    state.targetX = 0.5;
    state.targetY = 0.5;
  });
  canvas.addEventListener("pointerdown", (event) => {
    state.targetX = event.clientX / Math.max(1, state.width);
    state.targetY = event.clientY / Math.max(1, state.height);
    state.pulse = 1;
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea, button")) return;
    if (event.key.toLowerCase() === "p") togglePause();
    if (event.key.toLowerCase() === "r") randomize();
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    controls.speed.value = "0.25";
  }

  resizeCanvas();
  syncInterface();
  document.fonts.ready.then(() => window.requestAnimationFrame(render));
})();
