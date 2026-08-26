(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#scrapCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    copy: $("#copyText"), font: $("#fontFamily"), weight: $("#fontWeight"),
    background: $("#backgroundColor"), textColor: $("#textColor"), paperTextColor: $("#paperTextColor"), paperColor: $("#paperColor"),
    speed: $("#speed"), titleReveal: $("#titleReveal"), titleHold: $("#titleHold"), binReveal: $("#binReveal"), readyHold: $("#readyHold"),
    sheet: $("#sheet"), crumple: $("#crumple"), throw: $("#throw"), resultHold: $("#resultHold"),
    throwRhythm: $("#throwRhythm"), spin: $("#spin"), paperWidth: $("#paperWidth"), paperHeight: $("#paperHeight"),
    wrinkle: $("#wrinkle"), paperTexture: $("#paperTexture"), arcHeight: $("#arcHeight"), sway: $("#sway"),
    binSize: $("#binSize"), binGap: $("#binGap"), binOpacity: $("#binOpacity"),
    fontSize: $("#fontSize"), tracking: $("#tracking"), textX: $("#textX"), textY: $("#textY")
  };

  const binAsset = new Image();
  binAsset.decoding = "async";
  binAsset.src = "assets/delete-bin.png";
  const state = { background: null, paperTexture: null, paperTextureKey: "", autosaveTimer: 0 };
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const smooth = (value) => { const p = clamp(value); return p * p * (3 - 2 * p); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const easeIn = (value) => Math.pow(clamp(value), 3);
  const hash = (seed) => { const value = Math.sin(seed * 91.719 + 17.317) * 43758.5453; return value - Math.floor(value); };
  const hexToRgb = (hex) => {
    const value = String(hex || "#ffffff").replace("#", "");
    const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value.padEnd(6, "f");
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
  };
  const rgba = (hex, alpha) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${alpha})`; };
  const paperInkColor = () => inputs.paperTextColor.value;

  function timing() {
    const speed = Math.max(.1, Number(inputs.speed.value));
    const result = {
      titleReveal: Number(inputs.titleReveal.value) / 1000 / speed,
      title: Number(inputs.titleHold.value) / 1000 / speed,
      bin: Number(inputs.binReveal.value) / 1000 / speed,
      ready: Number(inputs.readyHold.value) / 1000 / speed,
      sheet: Number(inputs.sheet.value) / 1000 / speed,
      crumple: Number(inputs.crumple.value) / 1000 / speed,
      throw: Number(inputs.throw.value) / 1000 / speed,
      result: Number(inputs.resultHold.value) / 1000 / speed
    };
    result.cycle = Object.values(result).reduce((sum, value) => sum + value, 0);
    return result;
  }

  function beats(span = timing()) {
    let cursor = 0;
    return [
      ["文字柔现", "intro", "titleReveal", span.titleReveal], ["文字停留", "hold", "title", span.title],
      ["垃圾桶渐显", "contact", "bin", span.bin], ["准备停留", "hold", "ready", span.ready],
      ["纸面形成", "replace", "sheet", span.sheet], ["连续揉皱", "color", "crumple", span.crumple],
      ["自然落入", "orbit", "throw", span.throw], ["空桶停留", "hold", "result", span.result]
    ].map(([label, kind, phase, duration], index) => {
      const beat = { index, label, kind, phase, duration, start: cursor, end: cursor + duration };
      cursor = beat.end;
      return beat;
    });
  }

  function phaseAt(rawTime) {
    const span = timing();
    const local = ((rawTime % Math.max(.001, span.cycle)) + span.cycle) % span.cycle;
    const beat = beats(span).find((item) => local >= item.start && local < item.end) || beats(span).at(-1);
    return { name: beat.phase, progress: clamp((local - beat.start) / Math.max(.001, beat.duration)), local, span, activeIndex: beat.index };
  }

  function currentTime() { return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000); }
  function setTime(seconds) {
    const safe = Math.max(0, seconds);
    if (paused) pausedAt = safe;
    else animationStart = performance.now() - safe * 1000;
    drawPreview(safe);
  }
  function restart() {
    pausedAt = 0;
    animationStart = performance.now();
    paused = false;
    syncPlaybackLabels();
  }
  function setPaused(value) {
    if (value === paused) return;
    if (value) pausedAt = currentTime();
    else animationStart = performance.now() - pausedAt * 1000;
    paused = value;
    syncPlaybackLabels();
  }
  function syncPlaybackLabels() {
    $("#pauseButton").textContent = paused ? "播放" : "暂停";
    $("#stagePauseButton").textContent = paused ? "播放" : "暂停";
  }

  function fontFamily() {
    return window.STGFontLibrary?.family(inputs.font.value) || '"Arial","PingFang SC",sans-serif';
  }
  function trackedWidth(ctx, text, tracking) {
    const characters = Array.from(text);
    return characters.reduce((sum, character) => sum + ctx.measureText(character).width, 0) + Math.max(0, characters.length - 1) * tracking;
  }
  function drawTrackedText(ctx, text, x, y, tracking) {
    const characters = Array.from(text);
    let cursor = x - trackedWidth(ctx, text, tracking) / 2;
    characters.forEach((character) => {
      const width = ctx.measureText(character).width;
      ctx.fillText(character, cursor + width / 2, y);
      cursor += width + tracking;
    });
  }

  function compositionScale(width, height) {
    return clamp(Math.sqrt((width * height) / (1440 * 900)), .48, 2.35);
  }
  function layout(ctx, width, height) {
    const scale = compositionScale(width, height);
    let fontSize = Number(inputs.fontSize.value) * scale;
    const tracking = Number(inputs.tracking.value) * scale;
    const text = inputs.copy.value || " ";
    ctx.font = `${inputs.weight.value} ${fontSize}px ${fontFamily()}`;
    const maxWidth = width * .82;
    const measured = trackedWidth(ctx, text, tracking);
    if (measured > maxWidth) {
      fontSize *= maxWidth / measured;
      ctx.font = `${inputs.weight.value} ${fontSize}px ${fontFamily()}`;
    }
    const textWidth = trackedWidth(ctx, text, tracking);
    const x = width * Number(inputs.textX.value) / 100;
    const y = height * Number(inputs.textY.value) / 100;
    const binSize = Number(inputs.binSize.value) * scale;
    const binY = Math.min(height * .78, y + Number(inputs.binGap.value) * scale + binSize * .5);
    return {
      scale, fontSize, tracking, text, textWidth, x, y, binSize, binY,
      paperWidth: Math.max(fontSize * 1.45, textWidth * Number(inputs.paperWidth.value) / 100),
      paperHeight: fontSize * Number(inputs.paperHeight.value) / 100
    };
  }

  function createPaperTexture(st) {
    const key = [st.text, st.paperWidth.toFixed(1), st.paperHeight.toFixed(1), inputs.paperColor.value, inputs.textColor.value, inputs.paperTexture.value, inputs.font.value, inputs.weight.value, inputs.tracking.value].join("|");
    if (state.paperTexture && state.paperTextureKey === key) return state.paperTexture;
    const texture = document.createElement("canvas");
    texture.width = clamp(Math.round(st.paperWidth * 2), 320, 1800);
    texture.height = clamp(Math.round(texture.width * st.paperHeight / st.paperWidth), 180, 900);
    const ctx = texture.getContext("2d");
    const intensity = Number(inputs.paperTexture.value) / 100;
    const gradient = ctx.createLinearGradient(0, 0, texture.width, texture.height);
    gradient.addColorStop(0, rgba(inputs.paperColor.value, 1));
    gradient.addColorStop(.52, rgba(inputs.paperColor.value, .96));
    gradient.addColorStop(1, rgba(inputs.paperColor.value, .88));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, texture.width, texture.height);
    for (let index = 0; index < 1100; index += 1) {
      const x = hash(index + 3) * texture.width;
      const y = hash(index + 41) * texture.height;
      const alpha = intensity * (.018 + hash(index + 80) * .045);
      ctx.fillStyle = hash(index + 9) > .5 ? `rgba(20,20,20,${alpha})` : `rgba(255,255,255,${alpha * 1.8})`;
      const radius = .4 + hash(index + 70) * 1.7;
      ctx.fillRect(x, y, radius, radius);
    }
    const factor = texture.width / st.paperWidth;
    ctx.font = `${inputs.weight.value} ${st.fontSize * factor}px ${fontFamily()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = paperInkColor();
    drawTrackedText(ctx, st.text, texture.width / 2, texture.height / 2, st.tracking * factor);
    state.paperTexture = texture;
    state.paperTextureKey = key;
    return texture;
  }

  function paperVertices(st, progress, texture) {
    const columns = 8;
    const rows = 5;
    const amount = clamp(progress);
    const sideFold = smooth(clamp(amount / .48));
    const verticalFold = smooth(clamp((amount - .18) / .56));
    const compact = smooth(clamp((amount - .55) / .45));
    const wrinkle = Number(inputs.wrinkle.value) / 100;
    const vertices = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns;
        const v = row / rows;
        const seed = row * 29 + column * 17;
        const edge = column === 0 || column === columns || row === 0 || row === rows;
        const flatX = (u - .5) * st.paperWidth + (edge ? (hash(seed + 7) - .5) * st.scale * 3 : 0);
        const flatY = (v - .5) * st.paperHeight + (edge ? (hash(seed + 11) - .5) * st.scale * 3 : 0);
        const foldedX = flatX * mix(1, .5, sideFold);
        const foldedY = flatY * mix(1, .56, verticalFold);
        const foldX = Math.sin(v * Math.PI) * Math.sin(u * Math.PI * 2 + amount * 2.6) * st.fontSize * .065 * sideFold * (1 - compact);
        const foldY = Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 2 - amount * 2.1) * st.fontSize * .055 * verticalFold * (1 - compact);
        const targetX = (u - .5) * st.fontSize * .62 + (hash(seed + 37) - .5) * st.fontSize * .1 * wrinkle;
        const targetY = (v - .5) * st.fontSize * .42 + (hash(seed + 53) - .5) * st.fontSize * .085 * wrinkle;
        vertices.push({
          sx: u * texture.width, sy: v * texture.height,
          x: mix(foldedX + foldX, targetX, compact),
          y: mix(foldedY + foldY, targetY, compact)
        });
      }
    }
    return { vertices, columns, rows };
  }

  function drawImageTriangle(ctx, image, source, destination) {
    const [s0, s1, s2] = source;
    const [d0, d1, d2] = destination;
    const denominator = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
    if (Math.abs(denominator) < .00001) return;
    const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denominator;
    const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denominator;
    const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denominator;
    const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denominator;
    const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denominator;
    const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denominator;
    const centerX = (d0.x + d1.x + d2.x) / 3;
    const centerY = (d0.y + d1.y + d2.y) / 3;
    const expand = (point) => {
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const length = Math.hypot(dx, dy) || 1;
      return { x: point.x + dx / length * 1.55, y: point.y + dy / length * 1.55 };
    };
    const c0 = expand(d0), c1 = expand(d1), c2 = expand(d2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.lineTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  function drawPaper(ctx, st, progress, x, y, rotation = 0, scale = 1, alpha = 1) {
    const texture = createPaperTexture(st);
    const mesh = paperVertices(st, progress, texture);
    const stride = mesh.columns + 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    const shadowWidth = mix(st.paperWidth, st.fontSize * .68, smooth(progress));
    const shadowHeight = mix(st.paperHeight, st.fontSize * .42, smooth(progress));
    ctx.save();
    ctx.filter = `blur(${Math.max(2, st.scale * 7)}px)`;
    ctx.fillStyle = "rgba(0,0,0,.42)";
    ctx.beginPath();
    ctx.ellipse(st.scale * 3, st.scale * 7, shadowWidth * .48, shadowHeight * .42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let row = 0; row < mesh.rows; row += 1) {
      for (let column = 0; column < mesh.columns; column += 1) {
        const i0 = row * stride + column;
        const i1 = i0 + 1;
        const i2 = i0 + stride;
        const i3 = i2 + 1;
        const v0 = mesh.vertices[i0], v1 = mesh.vertices[i1], v2 = mesh.vertices[i2], v3 = mesh.vertices[i3];
        drawImageTriangle(ctx, texture, [{ x: v0.sx, y: v0.sy }, { x: v1.sx, y: v1.sy }, { x: v2.sx, y: v2.sy }], [v0, v1, v2]);
        drawImageTriangle(ctx, texture, [{ x: v1.sx, y: v1.sy }, { x: v3.sx, y: v3.sy }, { x: v2.sx, y: v2.sy }], [v1, v3, v2]);
      }
    }
    if (progress > .02) {
      const outline = [];
      for (let column = 0; column <= mesh.columns; column += 1) outline.push(mesh.vertices[column]);
      for (let row = 1; row <= mesh.rows; row += 1) outline.push(mesh.vertices[row * stride + mesh.columns]);
      for (let column = mesh.columns - 1; column >= 0; column -= 1) outline.push(mesh.vertices[mesh.rows * stride + column]);
      for (let row = mesh.rows - 1; row > 0; row -= 1) outline.push(mesh.vertices[row * stride]);
      const xs = outline.map((point) => point.x);
      const ys = outline.map((point) => point.y);
      const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
      ctx.save();
      ctx.beginPath();
      outline.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
      ctx.clip();
      const foldLight = smooth(progress);
      const sideShade = ctx.createLinearGradient(left, 0, right, 0);
      sideShade.addColorStop(0, `rgba(35,35,35,${.08 * foldLight})`);
      sideShade.addColorStop(.32, "rgba(255,255,255,0)");
      sideShade.addColorStop(.52, `rgba(255,255,255,${.11 * foldLight})`);
      sideShade.addColorStop(.74, "rgba(255,255,255,0)");
      sideShade.addColorStop(1, `rgba(32,32,32,${.09 * foldLight})`);
      ctx.fillStyle = sideShade;
      ctx.fillRect(left, top, right - left, bottom - top);
      const verticalShade = ctx.createLinearGradient(0, top, 0, bottom);
      verticalShade.addColorStop(0, `rgba(255,255,255,${.06 * foldLight})`);
      verticalShade.addColorStop(.48, "rgba(255,255,255,0)");
      verticalShade.addColorStop(1, `rgba(28,28,28,${.1 * foldLight})`);
      ctx.fillStyle = verticalShade;
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPaperReveal(ctx, st, progress) {
    const texture = createPaperTexture(st);
    const reveal = smooth(clamp(progress));
    const alpha = smooth(clamp(progress * 1.65));
    const startWidth = Math.min(st.paperWidth, Math.max(st.textWidth + st.fontSize * .3, st.paperWidth * .56));
    const startHeight = Math.min(st.paperHeight, st.fontSize * .86);
    const revealWidth = mix(startWidth, st.paperWidth, reveal);
    const revealHeight = mix(startHeight, st.paperHeight, reveal);
    const settle = 1 + Math.sin(reveal * Math.PI) * .012;
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.scale(settle, settle);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-revealWidth / 2, -revealHeight / 2, revealWidth, revealHeight, st.scale * 3);
    else ctx.rect(-revealWidth / 2, -revealHeight / 2, revealWidth, revealHeight);
    ctx.clip();
    ctx.drawImage(texture, -st.paperWidth / 2, -st.paperHeight / 2, st.paperWidth, st.paperHeight);
    ctx.restore();
  }

  function binGeometry(st) {
    return { width: st.binSize, height: st.binSize * 1.12, x: st.x, y: st.binY, rimY: st.binY - st.binSize * .47 };
  }
  function binBodyPath(ctx, geometry) {
    const { width, height, x, y } = geometry;
    ctx.beginPath();
    ctx.moveTo(x - width * .48, y - height * .42);
    ctx.quadraticCurveTo(x - width * .46, y + height * .32, x - width * .34, y + height * .46);
    ctx.quadraticCurveTo(x, y + height * .53, x + width * .34, y + height * .46);
    ctx.quadraticCurveTo(x + width * .46, y + height * .32, x + width * .48, y - height * .42);
    ctx.closePath();
  }
  function withBinReveal(ctx, st, appear, draw) {
    const progress = easeOut(appear);
    const geometry = binGeometry(st);
    ctx.save();
    ctx.translate(geometry.x, geometry.y + mix(st.binSize * .13, 0, progress));
    ctx.scale(mix(.9, 1, progress), mix(.52, 1, progress));
    ctx.translate(-geometry.x, -geometry.y);
    ctx.globalAlpha = progress;
    draw(geometry, progress);
    ctx.restore();
  }
  function drawBinAsset(ctx, geometry, opacity) {
    if (!binAsset.complete || !binAsset.naturalWidth) return false;
    const sourceX = binAsset.naturalWidth * .09;
    const sourceWidth = binAsset.naturalWidth * .82;
    const sourceHeight = binAsset.naturalHeight * .955;
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.drawImage(
      binAsset,
      sourceX, 0, sourceWidth, sourceHeight,
      geometry.x - geometry.width * .5, geometry.y - geometry.height * .5,
      geometry.width, geometry.height
    );
    ctx.restore();
    return true;
  }
  function drawBinBack(ctx, st, appear) {
    withBinReveal(ctx, st, appear, (geometry) => {
      ctx.save();
      ctx.filter = `blur(${Math.max(2, st.scale * 6)}px)`;
      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.beginPath();
      ctx.ellipse(geometry.x, geometry.y + geometry.height * .55, geometry.width * .48, geometry.height * .12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const opacity = Number(inputs.binOpacity.value) / 100;
      if (!drawBinAsset(ctx, geometry, opacity)) {
        binBodyPath(ctx, geometry);
        ctx.fillStyle = `rgba(212,214,218,${.55 * opacity})`;
        ctx.fill();
      }
    });
  }
  function drawBinFront(ctx, st, appear) {
    withBinReveal(ctx, st, appear, (geometry) => {
      const opacity = Number(inputs.binOpacity.value) / 100;
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        geometry.x - geometry.width * .57,
        geometry.rimY + geometry.height * .055,
        geometry.width * 1.14,
        geometry.height
      );
      ctx.clip();
      drawBinAsset(ctx, geometry, opacity);
      ctx.restore();
    });
  }

  function drawBackgroundMedia(ctx, width, height) {
    if (!state.background?.element) return;
    const media = state.background.element;
    if (media instanceof HTMLImageElement && (!media.complete || !media.naturalWidth)) return;
    if (media instanceof HTMLVideoElement && media.readyState < 2) return;
    const naturalWidth = media.videoWidth || media.naturalWidth || width;
    const naturalHeight = media.videoHeight || media.naturalHeight || height;
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    ctx.drawImage(media, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function throwProgress(value) {
    if (inputs.throwRhythm.value === "smooth") return smooth(value);
    if (inputs.throwRhythm.value === "snap") return Math.pow(clamp(value * 1.18), 1.55);
    const time = clamp(value);
    return .12 * time + .88 * time * time;
  }

  function renderFrame(target, rawTime, width, height, ratio = 1) {
    const ctx = target.getContext("2d", { alpha: false });
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = inputs.background.value;
    ctx.fillRect(0, 0, width, height);
    drawBackgroundMedia(ctx, width, height);
    const st = layout(ctx, width, height);
    const phase = phaseAt(rawTime);
    ctx.font = `${inputs.weight.value} ${st.fontSize}px ${fontFamily()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = inputs.textColor.value;

    const binVisible = phase.name === "titleReveal" || phase.name === "title" ? 0 : phase.name === "bin" ? phase.progress : 1;
    if (binVisible > 0) drawBinBack(ctx, st, binVisible);

    if (phase.name === "titleReveal") {
      const reveal = smooth(phase.progress);
      const settle = easeOut(reveal);
      ctx.save();
      ctx.globalAlpha = smooth(clamp(phase.progress * 1.16));
      ctx.translate(st.x, st.y + mix(12 * st.scale, 0, settle));
      const titleScale = mix(.985, 1, settle);
      ctx.scale(titleScale, titleScale);
      ctx.translate(-st.x, -st.y);
      drawTrackedText(ctx, st.text, st.x, st.y, st.tracking);
      ctx.restore();
    } else if (phase.name === "title" || phase.name === "bin" || phase.name === "ready") {
      drawTrackedText(ctx, st.text, st.x, st.y, st.tracking);
    } else if (phase.name === "sheet") {
      ctx.save();
      ctx.globalAlpha = 1 - smooth(clamp(phase.progress * 2.2));
      drawTrackedText(ctx, st.text, st.x, st.y, st.tracking);
      ctx.restore();
      drawPaperReveal(ctx, st, phase.progress);
    } else if (phase.name === "crumple") {
      const amount = smooth(phase.progress);
      const settle = 1 + Math.sin(phase.progress * Math.PI) * .018;
      const rotation = Math.sin(phase.progress * Math.PI) * -.035;
      drawPaper(ctx, st, amount, st.x, st.y, rotation, settle, 1);
    } else if (phase.name === "throw") {
      const progress = throwProgress(phase.progress);
      const geometry = binGeometry(st);
      const endY = geometry.y + geometry.height * .34;
      const x = mix(st.x, geometry.x + Number(inputs.sway.value) * st.scale, smooth(progress));
      const y = mix(st.y, endY, progress) - Math.sin(phase.progress * Math.PI) * Number(inputs.arcHeight.value) * st.scale;
      const rotation = Number(inputs.spin.value) * Math.PI * 2 * smooth(phase.progress);
      const paperScale = mix(1, .86, smooth(phase.progress));
      const alpha = 1 - smooth(clamp((phase.progress - .8) / .2));
      drawPaper(ctx, st, 1, x, y, rotation, paperScale, alpha);
    }

    if (binVisible > 0) drawBinFront(ctx, st, binVisible);
    if (target === canvas) {
      frameCounter.textContent = `F ${String(Math.floor(rawTime * fps) % 10000).padStart(4, "0")}`;
      updateChoreography(phase);
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(canvas.clientWidth));
    const height = Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.dataset.ratio = String(ratio);
    }
  }
  function drawPreview(time = currentTime()) {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio) || 1;
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
  }
  function previewLoop() {
    drawPreview();
    rafId = requestAnimationFrame(previewLoop);
  }

  function renderChoreography() {
    const span = timing();
    const items = beats(span);
    const bar = $("#deleteChoreoBar");
    const playhead = $("#timelinePlayhead");
    const legend = $("#deleteChoreoLegend");
    bar.replaceChildren(playhead);
    legend.replaceChildren();
    items.forEach((beat) => {
      const block = document.createElement("button");
      block.type = "button";
      block.className = `me-choreo-block is-${beat.kind}`;
      block.style.flexGrow = Math.max(.08, beat.duration);
      block.dataset.beatIndex = beat.index;
      block.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.label}</strong><small>${beat.duration.toFixed(2)}秒</small>`;
      block.addEventListener("click", () => setTime(beat.start + .01));
      bar.append(block);
      const row = document.createElement("li");
      row.dataset.beatIndex = beat.index;
      row.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.label}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      row.addEventListener("click", () => setTime(beat.start + .01));
      legend.append(row);
    });
    $("#cycleDurationOut").textContent = `${span.cycle.toFixed(2)} 秒`;
  }
  function updateChoreography(phase) {
    const progress = phase.local / Math.max(.001, phase.span.cycle);
    $("#timelinePlayhead").style.left = `${progress * 100}%`;
    document.querySelectorAll("[data-beat-index]").forEach((node) => node.classList.toggle("is-active", Number(node.dataset.beatIndex) === phase.activeIndex));
  }

  const outputFormatters = {
    speed: (value) => `${Number(value).toFixed(2)}×`,
    titleReveal: (value) => `${(value / 1000).toFixed(2)}秒`, titleHold: (value) => `${(value / 1000).toFixed(2)}秒`, binReveal: (value) => `${(value / 1000).toFixed(2)}秒`,
    readyHold: (value) => `${(value / 1000).toFixed(2)}秒`, sheet: (value) => `${(value / 1000).toFixed(2)}秒`,
    crumple: (value) => `${(value / 1000).toFixed(2)}秒`, throw: (value) => `${(value / 1000).toFixed(2)}秒`, resultHold: (value) => `${(value / 1000).toFixed(2)}秒`,
    spin: (value) => `${Number(value).toFixed(2)}圈`, paperWidth: (value) => `${value}%`, paperHeight: (value) => `${value}%`,
    wrinkle: (value) => `${value}%`, paperTexture: (value) => `${value}%`, arcHeight: (value) => `${value}px`, sway: (value) => `${value}px`,
    binSize: (value) => `${value}px`, binGap: (value) => `${value}px`, binOpacity: (value) => `${value}%`,
    fontSize: (value) => `${value}px`, tracking: (value) => `${value}px`, textX: (value) => `${value}%`, textY: (value) => `${value}%`
  };
  function updateOutputs() {
    Object.entries(outputFormatters).forEach(([key, formatter]) => {
      const output = $(`#${inputs[key]?.id}Out`);
      if (output) output.textContent = formatter(Number(inputs[key].value));
    });
    state.paperTextureKey = "";
    renderChoreography();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function setBackgroundSource(source) {
    if (state.background?.objectUrl) URL.revokeObjectURL(state.background.objectUrl);
    if (!source?.url) { state.background = null; return; }
    if (String(source.type).startsWith("video/")) {
      const video = document.createElement("video");
      video.src = source.url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.play().catch(() => {});
      state.background = { ...source, element: video };
    } else {
      const image = new Image();
      image.src = source.url;
      state.background = { ...source, element: image };
    }
  }

  function assetGroups() {
    return [["#deleteFlowLibrary", flowAssets], ["#deleteAnimalLibrary", animalAssets], ["#deleteBotLibrary", botAssets], ["#deleteShapeLibrary", shapeAssets], ["#deleteCustomLibrary", state.customLibrary]];
  }
  function renderAssetLibrary() {
    assetGroups().forEach(([selector, assets]) => {
      const root = $(selector);
      root.replaceChildren();
      assets.forEach((asset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "delete-asset-choice me-asset-choice";
        button.classList.toggle("is-selected", state.librarySelection?.url === asset.url);
        button.innerHTML = `<img alt="" src="${asset.url}"><span>${asset.name}</span>`;
        button.addEventListener("click", () => { state.librarySelection = asset; renderAssetLibrary(); });
        root.append(button);
      });
    });
    $("#deleteCustomGroup").hidden = state.customLibrary.length === 0;
    $("#deleteCustomCount").textContent = state.customLibrary.length;
    const commit = $("#deleteAssetCommit");
    commit.disabled = !state.librarySelection;
    commit.textContent = state.librarySelection ? `添加：${state.librarySelection.name}` : "选择一个素材后添加";
  }
  function addAsset(source) {
    const asset = { id: `delete-asset-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: source.name || "纸面素材", url: source.url, size: 80, opacity: 100, offsetX: 0, offsetY: 0, rotation: 0 };
    state.assets.push(asset);
    cachedImage(asset.url);
    state.paperTextureKey = "";
    renderAssets();
    queueAutosave();
  }
  function moveAsset(assetId, delta) {
    const from = state.assets.findIndex((asset) => asset.id === assetId);
    const to = clamp(from + delta, 0, state.assets.length - 1);
    if (from < 0 || from === to) return;
    const [moved] = state.assets.splice(from, 1);
    state.assets.splice(to, 0, moved);
    state.paperTextureKey = "";
    renderAssets();
    queueAutosave();
  }
  function closeAssetDrawer() {
    state.activeAssetId = null;
    $("#deleteAssetDrawer").hidden = true;
  }
  function updateDrawerOutputs() {
    $("#deleteDrawerSizeOut").textContent = `${$("#deleteDrawerSize").value}%`;
    $("#deleteDrawerOpacityOut").textContent = `${$("#deleteDrawerOpacity").value}%`;
    $("#deleteDrawerXOut").textContent = $("#deleteDrawerX").value;
    $("#deleteDrawerYOut").textContent = $("#deleteDrawerY").value;
    $("#deleteDrawerRotationOut").textContent = `${$("#deleteDrawerRotation").value}°`;
  }
  function openAssetDrawer(assetId) {
    const asset = state.assets.find((item) => item.id === assetId);
    if (!asset) return closeAssetDrawer();
    state.activeAssetId = assetId;
    $("#deleteDrawerTitle").textContent = asset.name;
    $("#deleteDrawerPreview").src = asset.url;
    $("#deleteDrawerSize").value = asset.size ?? 80;
    $("#deleteDrawerOpacity").value = asset.opacity ?? 100;
    $("#deleteDrawerX").value = asset.offsetX ?? 0;
    $("#deleteDrawerY").value = asset.offsetY ?? 0;
    $("#deleteDrawerRotation").value = asset.rotation ?? 0;
    updateDrawerOutputs();
    $("#deleteAssetDrawer").hidden = false;
  }
  function renderAssets() {
    const root = $("#deleteSelectedAssets");
    root.replaceChildren();
    $("#deleteAssetCount").textContent = state.assets.length;
    $("#openDeleteAssets").disabled = state.assets.length === 0;
    if (!state.assets.length) {
      root.innerHTML = '<p class="delete-empty">还没有添加纸面素材。</p>';
      closeAssetDrawer();
      return;
    }
    state.assets.forEach((asset) => {
      const row = document.createElement("article");
      row.className = "delete-selected-row";
      row.draggable = true;
      row.tabIndex = 0;
      row.dataset.assetId = asset.id;
      row.innerHTML = `<span class="delete-drag" aria-hidden="true">⋮⋮</span><img alt="" src="${asset.url}"><div class="delete-selected-copy"><b>${asset.name}</b><small>纸面图案 · ${asset.size}% · ${asset.opacity ?? 100}%</small></div><button type="button" data-move="-1" aria-label="上移">↑</button><button type="button" data-move="1" aria-label="下移">↓</button><button type="button" data-edit="1">单独编辑</button><button type="button" data-remove="1" aria-label="移除">×</button>`;
      row.querySelector("[data-edit]").addEventListener("click", () => openAssetDrawer(asset.id));
      row.querySelector("[data-remove]").addEventListener("click", () => {
        state.assets = state.assets.filter((item) => item.id !== asset.id);
        if (state.activeAssetId === asset.id) closeAssetDrawer();
        state.paperTextureKey = "";
        renderAssets();
        queueAutosave();
      });
      row.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => moveAsset(asset.id, Number(button.dataset.move))));
      row.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", asset.id));
      row.addEventListener("dragover", (event) => event.preventDefault());
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("text/plain");
        const from = state.assets.findIndex((item) => item.id === sourceId);
        const to = state.assets.findIndex((item) => item.id === asset.id);
        if (from < 0 || to < 0 || from === to) return;
        const [moved] = state.assets.splice(from, 1);
        state.assets.splice(to, 0, moved);
        state.paperTextureKey = "";
        renderAssets();
        queueAutosave();
      });
      row.addEventListener("keydown", (event) => {
        if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        moveAsset(asset.id, event.key === "ArrowUp" ? -1 : 1);
      });
      root.append(row);
    });
  }
  function setAssetManager(open) {
    const manager = $("#deleteAssetManager");
    manager.hidden = !open;
    manager.classList.toggle("is-list-expanded", open);
    document.body.classList.toggle("is-list-expanded", open);
    if (!open) closeAssetDrawer();
  }

  function collectScheme() {
    const values = {};
    Object.entries(inputs).forEach(([key, input]) => { if (input) values[key] = input.value; });
    const background = state.background?.url ? { name: state.background.name, type: state.background.type, url: state.background.url } : null;
    return { version: 2, effect: "delete", values, background };
  }
  function applyScheme(scheme) {
    if (!scheme || !["delete", "scrap-bin"].includes(scheme.effect)) throw new Error("不是 Delete 删除方案");
    Object.entries(scheme.values || {}).forEach(([key, value]) => { if (inputs[key] && value != null) inputs[key].value = value; });
    setBackgroundSource(scheme.background || null);
    updateOutputs();
    restart();
  }
  const defaultScheme = collectScheme();
  function queueAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => {
      try { localStorage.setItem("me-delete-autosave-v6", JSON.stringify(collectScheme())); $("#schemeStatus").textContent = "已自动保存当前 Delete 方案。"; }
      catch (_) { $("#schemeStatus").textContent = "背景素材较大，请使用“保存方案”下载。"; }
    }, 260);
  }
  function downloadBlob(blob, name) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1600);
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => { updateOutputs(); queueAutosave(); });
    input.addEventListener("change", () => { updateOutputs(); queueAutosave(); });
  });
  $("#backgroundUpload").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    setBackgroundSource({ name: file.name, type: file.type, url });
    queueAutosave();
    event.currentTarget.value = "";
  });
  $("#clearBackground").addEventListener("click", () => { setBackgroundSource(null); queueAutosave(); });
  $("#saveScheme").addEventListener("click", () => {
    downloadBlob(new Blob([JSON.stringify(collectScheme(), null, 2)], { type: "application/json" }), "delete-scheme.json");
    $("#schemeStatus").textContent = "Delete 方案已保存。";
  });
  $("#importScheme").addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try { applyScheme(JSON.parse(await file.text())); queueAutosave(); $("#schemeStatus").textContent = "Delete 方案已导入。"; }
    catch (error) { $("#schemeStatus").textContent = error.message || "方案导入失败。"; }
    event.currentTarget.value = "";
  });
  $("#resetScheme").addEventListener("click", () => { applyScheme(defaultScheme); queueAutosave(); $("#schemeStatus").textContent = "已恢复默认方案。"; });
  $("#clearRedo").addEventListener("click", () => {
    applyScheme(defaultScheme);
    inputs.copy.value = "";
    setBackgroundSource(null);
    localStorage.removeItem("me-delete-autosave-v6");
    updateOutputs();
    restart();
    $("#schemeStatus").textContent = "已清理，可重新编辑。";
  });

  $("#restartButton").addEventListener("click", restart);
  $("#stageReplayButton").addEventListener("click", restart);
  $("#pauseButton").addEventListener("click", () => setPaused(!paused));
  $("#stagePauseButton").addEventListener("click", () => setPaused(!paused));
  $("#backButton").addEventListener("click", () => { setPaused(true); setTime(pausedAt - 1 / fps); });
  $("#forwardButton").addEventListener("click", () => { setPaused(true); setTime(pausedAt + 1 / fps); });
  window.addEventListener("resize", resizeCanvas);

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }
  function exportCanvas() {
    const [width, height] = exportDimensions();
    const output = document.createElement("canvas");
    output.width = clamp(Math.round(width), 240, 3840);
    output.height = clamp(Math.round(height), 240, 3840);
    return output;
  }
  function exportDuration() {
    const selected = $("#exportDuration").value;
    if (selected === "cycle") return timing().cycle;
    if (selected === "custom") return clamp(Number($("#customDuration").value) || 4, .5, 20);
    return Number(selected) || timing().cycle;
  }
  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.currentTarget.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.currentTarget.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => {
    const output = exportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `delete-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载。"; return; }
    const output = exportCanvas();
    const rate = Math.min(30, Number($("#exportFps").value) || 30);
    const duration = exportDuration();
    const total = Math.max(1, Math.ceil(duration * rate));
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    setExportBusy(true, `正在准备 GIF · 0 / ${total} 帧`);
    for (let frame = 0; frame < total; frame += 1) {
      renderFrame(output, frame / rate, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / rate });
    }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => { downloadBlob(blob, `delete-${output.width}x${output.height}.gif`); setExportBusy(false, "GIF 已生成。"); });
    gif.render();
  });

  const videoMime = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
  if (videoMime && !videoMime.includes("mp4")) $("#exportVideo").textContent = "WebM 视频";
  $("#exportVideo").addEventListener("click", async () => {
    const output = exportCanvas();
    if (!output.captureStream || !window.MediaRecorder) { exportStatus.textContent = "当前浏览器不支持视频导出。"; return; }
    const rate = Number($("#exportFps").value) || 30;
    const duration = exportDuration();
    const stream = output.captureStream(rate);
    const recorder = new MediaRecorder(stream, videoMime ? { mimeType: videoMime, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
    setExportBusy(true, "正在录制视频 · 0%");
    recorder.start();
    const started = performance.now();
    await new Promise((resolve) => {
      function draw(now) {
        const elapsed = (now - started) / 1000;
        renderFrame(output, elapsed, output.width, output.height, 1);
        exportStatus.textContent = `正在录制视频 · ${Math.min(100, Math.round(elapsed / duration * 100))}%`;
        if (elapsed < duration) requestAnimationFrame(draw); else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    const mime = recorder.mimeType || videoMime || "video/webm";
    const extension = mime.includes("mp4") ? "mp4" : "webm";
    downloadBlob(new Blob(chunks, { type: mime }), `delete-${output.width}x${output.height}.${extension}`);
    setExportBusy(false, `${extension.toUpperCase()} 视频已生成 · ${output.width} × ${output.height}`);
  });

  try {
    const saved = JSON.parse(localStorage.getItem("me-delete-autosave-v6") || "null");
    if (saved?.effect === "delete") { applyScheme(saved); $("#schemeStatus").textContent = "已恢复上次自动保存的 Delete 方案。"; }
  } catch (_) {}
  updateOutputs();
  syncPlaybackLabels();
  document.fonts.ready.finally(previewLoop);
  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
})();
