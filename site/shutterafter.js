(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const colorValue = (id, fallback) => {
    const field = document.getElementById(id);
    const value = field && String(field.value || "").trim();
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
  };
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const schemeStatus = $("#schemeStatus");
  const fps = 30;
  const SAVE_KEY = "me-shutterafter-preset-v15";
  const DEFAULT_PRESET_URL = "assets/presets/shutterafter-default.json?v=20260827-apple1";
  const LAYOUT_REF_W = 390;
  const MIN_PAIRS = 3;

  const DEFAULT_PAIRS = [
    { title: "WATERCOLOR", before: "assets/shutterafter/p1-before.jpg", after: "assets/shutterafter/p1-after.jpg", wipe: "ltr", beforeName: "水彩原图", afterName: "水彩效果图" },
    { title: "COMIC BOOK", before: "assets/shutterafter/p2-before.jpg", after: "assets/shutterafter/p2-after.jpg", wipe: "rtl", beforeName: "漫画原图", afterName: "漫画效果图" },
    { title: "KEYCHAIN", before: "assets/shutterafter/p3-before.jpg", after: "assets/shutterafter/p3-after.jpg", wipe: "ltr", beforeName: "挂件原图", afterName: "挂件效果图" },
    { title: "CHIBI", before: "assets/shutterafter/p4-before.jpg", after: "assets/shutterafter/p4-after.jpg", wipe: "rtl", beforeName: "Q版原图", afterName: "Q版效果图" }
  ];

  const fieldIds = [
    "beforeLabel", "afterLabel", "beforeFont", "afterFont", "labelSize", "labelTracking", "labelPad", "labelOffset",
    "showTitles", "beforeColor", "afterColor", "titleColor", "frameScale", "cardGap", "sideYaw", "sideLift", "sideShift", "radius",
    "shutterSize", "shutterOffset", "shutterLook", "flashStyle", "wipeStyle", "scrollStyle", "stageBg", "shutterColor", "beforeHold", "shutterDuration", "wipeDuration", "afterHold",
    "scrollDuration", "speed", "stagePopDuration", "stagePopStrength", "tvOffEnabled", "tvOffTheme",
    "tvOffDuration", "tvOffHold", "tvOffGlow", "tvOffBgColor", "tvOffColor"
  ];

  const inputs = Object.fromEntries(fieldIds.map((id) => [id, document.getElementById(id)]));

  let pairs = [];
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let autoSaveTimer = 0;
  const tvOffBuffer = document.createElement("canvas");

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const easeInOutCubic = (t) => {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const easeOutBack = (t) => {
    const x = clamp01(t);
    const c1 = 1.45;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
  const smoothstep = (t) => {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
  };
  const easeOutInertia = (t) => {
    const x = clamp01(t);
    return 1 - Math.exp(-5.6 * x) * Math.cos(Math.PI * 1.32 * x);
  };
  const appleSpin = (t) => {
    const x = clamp01(t);
    if (x < 0.42) return 0.058 * (1 - Math.pow(1 - x / 0.42, 3));
    if (x < 0.74) return lerp(0.058, -0.016, easeInOutCubic((x - 0.42) / 0.32));
    return lerp(-0.016, 0, easeOutCubic((x - 0.74) / 0.26));
  };
  const scrollEase = (t, style) => {
    if (style === "apple") return easeOutInertia(t);
    if (style === "spring") return easeOutBack(t);
    if (style === "snap") return easeOutCubic(t);
    if (style === "drift") return smoothstep(t);
    return easeInOutCubic(t);
  };
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const fontFamily = (value, fallback) => window.STGFontLibrary?.preset(value)?.family || fallback;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "sync";
      image.onload = () => {
        if (image.decode) image.decode().then(() => resolve(image), () => resolve(image));
        else resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => loadImage(reader.result).then(resolve, reject);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function imageToDataURL(image) {
    if (!image) return "";
    const board = document.createElement("canvas");
    board.width = image.naturalWidth || image.width;
    board.height = image.naturalHeight || image.height;
    if (!board.width || !board.height) return "";
    board.getContext("2d").drawImage(image, 0, 0);
    return board.toDataURL("image/jpeg", 0.97);
  }

  function roundRect(context, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawCover(context, image, x, y, w, h, radius, fill = "#0b0b0c") {
    context.save();
    roundRect(context, x, y, w, h, radius);
    context.clip();
    context.fillStyle = fill;
    context.fillRect(x, y, w, h);
    const iw = image && (image.naturalWidth || image.width) || 0;
    const ih = image && (image.naturalHeight || image.height) || 0;
    if (image && iw > 1 && ih > 1 && w > 1 && h > 1) {
      const scale = Math.max(w / iw, h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
    context.restore();
  }

  function drawEmpty(context, x, y, w, h, radius) {
    context.save();
    roundRect(context, x, y, w, h, radius);
    context.fillStyle = "#1c1c1e";
    context.fill();
    context.restore();
  }

  function drawLabel(context, text, cx, y, color, size, family, tracking) {
    if (!text) return;
    context.save();
    context.fillStyle = color;
    context.font = `600 ${size}px "${family}", "STG Noto Sans SC", sans-serif`;
    context.letterSpacing = `${tracking}px`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, cx, y);
    context.restore();
  }

  function drawWithStagePop(context, w, h, elapsed, options, draw) {
    const progress = clamp01(elapsed / Math.max(0.001, options.stagePopDuration));
    const strength = options.stagePopStrength;
    let scale;
    if (progress < 0.58) scale = lerp(1 - strength, 1 + strength * 0.38, easeOutCubic(progress / 0.58));
    else scale = lerp(1 + strength * 0.38, 1, easeInOutCubic((progress - 0.58) / 0.42));
    context.save();
    context.translate(w / 2, h / 2);
    context.scale(scale, scale);
    context.translate(-w / 2, -h / 2);
    context.globalAlpha = lerp(0.82, 1, easeOutCubic(progress));
    draw();
    context.restore();
  }

  function settings() {
    return {
      beforeLabel: inputs.beforeLabel.value,
      afterLabel: inputs.afterLabel.value,
      beforeFont: fontFamily(inputs.beforeFont.value, "STG Space Grotesk"),
      afterFont: fontFamily(inputs.afterFont.value, "STG Space Grotesk"),
      labelSize: Number(inputs.labelSize.value) / 100,
      labelTracking: Number(inputs.labelTracking.value),
      labelPad: Number(inputs.labelPad.value),
      labelOffset: Number(inputs.labelOffset?.value || 0),
      showTitles: Boolean(inputs.showTitles?.checked),
      beforeColor: colorValue("beforeColor", "#111111"),
      afterColor: colorValue("afterColor", "#111111"),
      titleColor: colorValue("titleColor", "#8e8e93"),
      frameScale: Number(inputs.frameScale.value) / 100,
      cardGap: Number(inputs.cardGap.value) / 100,
      sideTilt: Number(inputs.sideYaw.value) * Math.PI / 180,
      sideLift: Number(inputs.sideLift?.value || 0),
      sideShift: Number(inputs.sideShift?.value || 0),
      radius: Number(inputs.radius.value),
      shutterSize: Math.max(0.025, Math.min(0.2, Number(inputs.shutterSize.value) / 100)),
      shutterOffset: Number(inputs.shutterOffset.value),
      shutterLook: ["glass", "ring", "camera", "raised", "flat"].includes(inputs.shutterLook?.value) ? inputs.shutterLook.value : "glass",
      flashStyle: ["soft", "lift", "glow", "fade", "blowout"].includes(inputs.flashStyle?.value) ? inputs.flashStyle.value : "soft",
      wipeStyle: ["fade", "wipe", "ltr", "rtl", "snap"].includes(inputs.wipeStyle?.value) ? inputs.wipeStyle.value : "fade",
      scrollStyle: ["apple", "slide", "drift", "spring", "fade", "snap"].includes(inputs.scrollStyle?.value) ? inputs.scrollStyle.value : "apple",
      stageBg: colorValue("stageBg", "#ffffff"),
      shutterColor: colorValue("shutterColor", "#ffffff"),
      beforeHold: Number(inputs.beforeHold.value) / 1000,
      shutterDuration: Number(inputs.shutterDuration.value) / 1000,
      wipeDuration: Number(inputs.wipeDuration.value) / 1000,
      afterHold: Number(inputs.afterHold.value) / 1000,
      scrollDuration: Number(inputs.scrollDuration.value) / 1000,
      speed: Number(inputs.speed.value) / 100,
      stagePopDuration: Number(inputs.stagePopDuration.value) / 1000,
      stagePopStrength: Number(inputs.stagePopStrength.value) / 100,
      tvOffEnabled: Boolean(inputs.tvOffEnabled.checked),
      tvOffTheme: inputs.tvOffTheme.value || "dark",
      tvOffDuration: Number(inputs.tvOffDuration.value) / 1000,
      tvOffHold: Number(inputs.tvOffHold.value) / 1000,
      tvOffGlow: Number(inputs.tvOffGlow.value) / 100,
      tvOffBgColor: inputs.tvOffTheme.value === "light" ? "#ffffff" : inputs.tvOffTheme.value === "custom" ? colorValue("tvOffBgColor", "#000000") : "#000000",
      tvOffColor: inputs.tvOffTheme.value === "light" ? "#111111" : inputs.tvOffTheme.value === "custom" ? colorValue("tvOffColor", "#ffffff") : "#ffffff"
    };
  }

  function pairCycle(options) {
    return options.beforeHold + options.shutterDuration + options.wipeDuration + options.afterHold;
  }

  function marks(options, count = Math.max(MIN_PAIRS, pairs.length)) {
    const item = pairCycle(options);
    const scrolls = Math.max(0, count - 1) * options.scrollDuration;
    const contentEnd = item * count + scrolls;
    const tvOffEnd = contentEnd + (options.tvOffEnabled ? options.tvOffDuration : 0);
    const tvOffHoldEnd = tvOffEnd + (options.tvOffEnabled ? options.tvOffHold : 0);
    const cycleEnd = options.tvOffEnabled ? tvOffHoldEnd : contentEnd;
    return { item, contentEnd, tvOffEnd, tvOffHoldEnd, cycleEnd, count };
  }

  function resolveClock(clock, options, count) {
    let t = 0;
    for (let index = 0; index < count; index += 1) {
      const beforeEnd = t + options.beforeHold;
      const shutterEnd = beforeEnd + options.shutterDuration;
      const wipeEnd = shutterEnd + Math.max(0, options.wipeDuration);
      const afterEnd = wipeEnd + options.afterHold;
      if (clock < beforeEnd) return { index, phase: "before", local: (clock - t) / Math.max(0.001, options.beforeHold), position: index, reveal: 0, shutter: 0 };
      if (clock < shutterEnd) {
        const shutter = (clock - beforeEnd) / Math.max(0.001, options.shutterDuration);
        return { index, phase: "shutter", local: shutter, position: index, reveal: 0, shutter };
      }
      if (clock < wipeEnd) {
        const reveal = easeInOutCubic((clock - shutterEnd) / Math.max(0.001, options.wipeDuration));
        return { index, phase: "wipe", local: reveal, position: index, reveal, shutter: 1 };
      }
      if (clock < afterEnd) return { index, phase: "after", local: (clock - wipeEnd) / Math.max(0.001, options.afterHold), position: index, reveal: 1, shutter: 1 };
      t = afterEnd;
      if (index < count - 1) {
        const scrollEnd = t + options.scrollDuration;
        if (clock < scrollEnd) {
          const raw = (clock - t) / Math.max(0.001, options.scrollDuration);
          const p = scrollEase(raw, options.scrollStyle);
          return { index, phase: "scroll", local: p, position: index + p, reveal: 1, shutter: 1, scrollT: raw };
        }
        t = scrollEnd;
      }
    }
    return { index: count - 1, phase: "after", local: 1, position: count - 1, reveal: 1, shutter: 1 };
  }

  function timelineBeats(options = settings(), line = marks(options)) {
    const beats = [];
    let t = 0;
    for (let index = 0; index < line.count; index += 1) {
      const title = `第${index + 1}组`;
      beats.push({ kind: "hold", name: `${title} · Before`, start: t, end: t + options.beforeHold });
      t += options.beforeHold;
      beats.push({ kind: "contact", name: `${title} · 快门`, start: t, end: t + options.shutterDuration });
      t += options.shutterDuration;
      if (options.wipeDuration > 0.001) {
        beats.push({ kind: "replace", name: `${title} · 切到 After`, start: t, end: t + options.wipeDuration });
        t += options.wipeDuration;
      }
      beats.push({ kind: "color", name: `${title} · After`, start: t, end: t + options.afterHold });
      t += options.afterHold;
      if (index < line.count - 1) {
        beats.push({ kind: "orbit", name: "滑向下组", start: t, end: t + options.scrollDuration });
        t += options.scrollDuration;
      }
    }
    if (options.tvOffEnabled) beats.push({ kind: "fade", name: "电视熄屏", start: line.contentEnd, end: line.tvOffEnd });
    if (options.tvOffEnabled && options.tvOffHold > 0) beats.push({ kind: "hold", name: "熄屏停留", start: line.tvOffEnd, end: line.tvOffHoldEnd });
    return beats.map((beat, index) => ({ ...beat, index, duration: Math.max(0, beat.end - beat.start) }));
  }

  function displayedImage(pair, reveal) {
    if (!pair) return null;
    if (reveal >= 0.5) return pair.afterImage || pair.beforeImage;
    return pair.beforeImage || pair.afterImage;
  }

  function stageShell(w, h, options) {
    const portrait = w / Math.max(1, h) <= 0.85;
    const pad = options.labelPad * (h / (LAYOUT_REF_W * 16 / 9));
    const labelStack = h * 0.06 + pad * 0.35;
    const shutterWell = h * 0.072;
    const availH = Math.max(80, h - labelStack - shutterWell);
    return {
      portrait,
      labelStack,
      shutterWell,
      availH,
      availW: w,
      y0: labelStack
    };
  }

  function cardLayout(w, h, options) {
    const shell = stageShell(w, h, options);
    const aspect = 9 / 16;
    const gap = w * 0.026 * (options.cardGap || 1);
    let cardW = w * 0.352 * Math.max(0.45, options.frameScale);
    let cardH = cardW / aspect;
    if (cardH > shell.availH) {
      cardH = shell.availH;
      cardW = cardH * aspect;
    }
    const sx = cardW / Math.max(1, LAYOUT_REF_W * 0.352 * Math.max(0.45, options.frameScale));
    const sy = cardH / Math.max(1, LAYOUT_REF_W * 0.352 * Math.max(0.45, options.frameScale) / aspect);
    return { shell, cardW, cardH, gap, sx, sy };
  }

  function blitCover(context, image, x, y, w, h) {
    const iw = image && (image.naturalWidth || image.width) || 0;
    const ih = image && (image.naturalHeight || image.height) || 0;
    if (!image || iw < 2 || ih < 2 || w <= 1 || h <= 1) return;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    context.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function paintCard(context, pair, x, y, w, h, radius, reveal, wipeStyle = "fade") {
    const before = pair && (pair.beforeImage || pair.afterImage);
    const after = pair && (pair.afterImage || pair.beforeImage);
    const t = clamp01(reveal);
    const style = wipeStyle || "fade";
    if (t <= 0.001 || style === "snap" && t < 0.5) {
      drawCover(context, before, x, y, w, h, radius);
      return;
    }
    if (t >= 0.999 || style === "snap") {
      drawCover(context, after, x, y, w, h, radius);
      return;
    }
    const dir = style === "rtl" ? "rtl" : style === "ltr" ? "ltr" : style === "wipe" && pair && pair.wipe === "rtl" ? "rtl" : style === "wipe" ? "ltr" : "";
    if (dir) {
      drawCover(context, before, x, y, w, h, radius);
      context.save();
      context.beginPath();
      if (dir === "rtl") context.rect(x + w * (1 - t), y, w * t, h);
      else context.rect(x, y, w * t, h);
      context.clip();
      blitCover(context, after, x, y, w, h);
      context.restore();
      return;
    }
    context.save();
    roundRect(context, x, y, w, h, radius);
    context.clip();
    context.fillStyle = "#0b0b0c";
    context.fillRect(x, y, w, h);
    blitCover(context, before, x, y, w, h);
    context.globalAlpha = t;
    blitCover(context, after, x, y, w, h);
    context.restore();
  }

  function cardTexture(pair, w, h, radius, reveal, pixelRatio, wipeStyle = "fade") {
    const bw = Math.max(2, Math.round(w * pixelRatio));
    const bh = Math.max(2, Math.round(h * pixelRatio));
    const shown = displayedImage(pair, reveal);
    const key = `${bw}x${bh}:${Math.round(radius * pixelRatio)}:${Math.round(clamp01(reveal) * 40)}:${wipeStyle}:${pair && pair.wipe || ""}:${shown && shown.src || ""}`;
    if (pair && pair._tex && pair._texKey === key) return pair._tex;
    const board = pair && pair._tex && pair._tex.width === bw && pair._tex.height === bh ? pair._tex : document.createElement("canvas");
    board.width = bw;
    board.height = bh;
    const ctx = board.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    paintCard(ctx, pair, 0, 0, bw, bh, radius * pixelRatio, reveal, wipeStyle);
    if (pair) {
      pair._tex = board;
      pair._texKey = key;
    }
    return board;
  }

  function peekPose(offset, cardW, gap, sideTilt, sideLift, sideShift, feel) {
    const slot = Math.max(-1.4, Math.min(1.4, offset));
    const dist = Math.min(1, Math.abs(slot));
    const dir = slot === 0 ? 0 : Math.sign(slot);
    const apple = feel === "apple";
    const yaw = slot * (apple ? sideTilt * 1.18 + 0.03 : sideTilt);
    return {
      x: slot * (cardW + gap) * (apple ? 0.98 : 1) + dir * dist * sideShift,
      y: dist * sideLift,
      scale: 1,
      scaleX: apple ? Math.max(0.9, Math.cos(yaw * 1.04)) : 1,
      rotZ: yaw
    };
  }

  function clipCardPath(context, w, h, radius) {
    roundRect(context, -w / 2, -h / 2, w, h, radius);
  }

  function shutterPulse(t) {
    return Math.sin(clamp01(t) * Math.PI);
  }

  function drawFlashFx(context, style, state, w, h, radius) {
    if (state.phase !== "shutter" || style === "fade") return;
    const pulse = shutterPulse(state.shutter);
    if (pulse < 0.01) return;
    context.save();
    clipCardPath(context, w, h, radius);
    context.clip();
    if (style === "lift") {
      context.fillStyle = `rgba(255,255,255,${0.16 * pulse})`;
      context.fillRect(-w / 2, -h / 2, w, h);
    } else if (style === "glow") {
      const R = Math.hypot(w, h) * 0.72;
      const glow = context.createRadialGradient(0, h * 0.2, 4, 0, 0, R);
      glow.addColorStop(0, `rgba(255,255,255,${0.34 * pulse})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = glow;
      context.fillRect(-w / 2, -h / 2, w, h);
    } else if (style === "blowout") {
      context.fillStyle = `rgba(255,255,255,${0.78 * pulse})`;
      context.fillRect(-w / 2, -h / 2, w, h);
    } else {
      context.fillStyle = `rgba(255,255,255,${0.28 * pulse})`;
      context.fillRect(-w / 2, -h / 2, w, h);
    }
    context.restore();
  }

  function drawShutter(context, cx, cy, radius, color, press, look = "glass") {
    const scale = press <= 0 ? 1 : press < 0.45 ? lerp(1, 0.82, easeOutCubic(press / 0.45)) : lerp(0.82, 1, easeInOutCubic((press - 0.45) / 0.55));
    context.save();
    context.translate(cx, cy);
    context.scale(scale, scale);
    context.shadowColor = "rgba(0,0,0,0.5)";
    context.shadowBlur = radius * 0.55;
    context.shadowOffsetY = radius * 0.16;
    const disc = (r, fill) => {
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.fillStyle = fill;
      context.fill();
    };
    if (look === "flat") {
      disc(radius, color);
    } else if (look === "ring") {
      disc(radius, color);
      context.shadowColor = "transparent";
      context.beginPath();
      context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      context.lineWidth = Math.max(1.5, radius * 0.1);
      context.strokeStyle = "rgba(0,0,0,0.14)";
      context.stroke();
      disc(radius * 0.52, color);
      const shine = context.createLinearGradient(0, -radius, 0, radius);
      shine.addColorStop(0, "rgba(255,255,255,0.55)");
      shine.addColorStop(0.45, "rgba(255,255,255,0)");
      disc(radius * 0.52, shine);
    } else if (look === "camera") {
      disc(radius, "#1a1a1c");
      context.shadowColor = "transparent";
      context.beginPath();
      context.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
      context.lineWidth = Math.max(2, radius * 0.12);
      context.strokeStyle = "#d8d8dc";
      context.stroke();
      disc(radius * 0.58, color);
      context.beginPath();
      context.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
      context.strokeStyle = "rgba(0,0,0,0.18)";
      context.lineWidth = Math.max(1, radius * 0.06);
      context.stroke();
    } else if (look === "raised") {
      const body = context.createRadialGradient(-radius * 0.2, -radius * 0.28, radius * 0.1, 0, 0, radius);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.65, color);
      body.addColorStop(1, "#c8c8cc");
      disc(radius, body);
      context.shadowColor = "transparent";
      context.beginPath();
      context.ellipse(-radius * 0.18, -radius * 0.38, radius * 0.42, radius * 0.22, -0.4, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,255,255,0.45)";
      context.fill();
    } else {
      const body = context.createRadialGradient(-radius * 0.25, -radius * 0.32, radius * 0.08, 0, radius * 0.15, radius);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.45, color);
      body.addColorStop(1, "#bdbdc2");
      disc(radius, body);
      context.shadowColor = "transparent";
      context.beginPath();
      context.ellipse(-radius * 0.16, -radius * 0.42, radius * 0.46, radius * 0.24, -0.35, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,255,255,0.5)";
      context.fill();
      context.beginPath();
      context.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
      context.strokeStyle = "rgba(255,255,255,0.28)";
      context.lineWidth = Math.max(1, radius * 0.04);
      context.stroke();
    }
    context.restore();
  }

  function cardReveal(cardIndex, state) {
    if (cardIndex < state.index) return 1;
    if (cardIndex > state.index) return 0;
    if (state.phase === "scroll") return 1;
    return state.reveal;
  }

  function drawCarousel(context, w, h, options, state, pixelRatio = 1) {
    const layout = cardLayout(w, h, options);
    const { cardW, cardH, gap, sx, sy } = layout;
    const radius = Math.min(options.radius * Math.min(w, h) / 720, cardW * 0.12);
    const count = Math.max(MIN_PAIRS, pairs.length);
    const wrap = (value) => ((Math.round(value) % count) + count) % count;
    const base = Math.floor(state.position + 1e-6);
    const y = layout.shell.y0 + Math.max(0, (layout.shell.availH - cardH) / 2);
    const cy = y + cardH / 2;
    const labelPx = Math.max(15, h * 0.026) * options.labelSize;
    const shutterR = Math.max(8, Math.min(w, h) * options.shutterSize);
    const shutterY = y + cardH + options.shutterOffset * sy;

    const feel = options.scrollStyle || "apple";
    const items = [base - 1, base, base + 1];
    if (state.position - base > 0.02) items.push(base + 2);
    items.sort((a, b) => Math.abs(b - state.position) - Math.abs(a - state.position));
    context.save();
    context.beginPath();
    context.rect(0, 0, w, h);
    context.clip();

    items.forEach((rawIndex) => {
      const offset = rawIndex - state.position;
      if (Math.abs(offset) > 1.18) return;
      const pair = pairs[wrap(rawIndex)];
      const reveal = cardReveal(Math.round(rawIndex), state);
      const pose = peekPose(offset, cardW, gap, options.sideTilt || 0, (options.sideLift || 0) * sy, (options.sideShift || 0) * sx, feel);
      const travel = Math.abs(offset - Math.round(offset));
      const slideScale = feel === "apple" ? 1 + 0.008 * Math.sin(travel * Math.PI)
        : feel === "spring" ? 1 + 0.07 * Math.sin(travel * Math.PI)
        : feel === "drift" ? 1 + 0.02 * Math.sin(travel * Math.PI)
        : feel === "snap" ? 1
        : 1 + 0.035 * Math.sin(travel * Math.PI);
      const edgeCut = Math.abs(offset) <= 1 ? 1 : clamp01(1 - (Math.abs(offset) - 1) / 0.12);
      const slideAlpha = (feel === "fade" ? 1 - 0.38 * travel : 1) * edgeCut;
      const drawW = cardW * pose.scale * slideScale;
      const drawH = cardH * pose.scale * slideScale;
      const cx = w / 2 + pose.x;
      const extraSpin = feel === "apple" && state.phase === "scroll" ? appleSpin(state.scrollT || 0) : 0;
      context.save();
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.globalAlpha = slideAlpha;
      context.translate(cx, cy + pose.y);
      context.rotate(pose.rotZ + extraSpin);
      context.scale(pose.scaleX || 1, 1);
      const isHero = state.phase !== "scroll" && Math.abs(offset) < 0.42;
      if (isHero) {
        context.save();
        context.shadowColor = "rgba(0,0,0,0.28)";
        context.shadowBlur = Math.max(10, cardW * 0.06);
        context.shadowOffsetY = Math.max(3, cardH * 0.01);
        roundRect(context, -drawW / 2, -drawH / 2, drawW, drawH, radius);
        context.fillStyle = "#111";
        context.fill();
        context.restore();
      }
      paintCard(context, pair, -drawW / 2, -drawH / 2, drawW, drawH, radius, reveal, options.wipeStyle);
      if (isHero) drawFlashFx(context, options.flashStyle, state, drawW, drawH, radius);
      context.restore();

      if (Math.abs(offset) < 0.42) {
        const showingAfter = reveal >= 0.85;
        drawLabel(
          context,
          showingAfter ? options.afterLabel : options.beforeLabel,
          w / 2,
          y - Math.max(18, h * 0.028) + (options.labelOffset || 0) * sy,
          showingAfter ? options.afterColor : options.beforeColor,
          labelPx,
          showingAfter ? options.afterFont : options.beforeFont,
          options.labelTracking
        );
      }
    });
    const press = state.phase === "shutter" ? state.shutter : 0;
    drawShutter(context, w / 2, shutterY, shutterR, options.shutterColor, press, options.shutterLook);
    context.restore();
  }

  function drawTvShutdown(context, target, w, h, pixelRatio, progress, options) {
    const p = clamp01(progress);
    if (tvOffBuffer.width !== target.width || tvOffBuffer.height !== target.height) {
      tvOffBuffer.width = target.width;
      tvOffBuffer.height = target.height;
    }
    const bufferContext = tvOffBuffer.getContext("2d");
    bufferContext.setTransform(1, 0, 0, 1, 0, 0);
    bufferContext.clearRect(0, 0, tvOffBuffer.width, tvOffBuffer.height);
    bufferContext.drawImage(target, 0, 0);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = options.tvOffBgColor;
    context.fillRect(0, 0, w, h);
    const verticalEnd = 0.64;
    const vertical = clamp01(p / verticalEnd);
    const horizontal = clamp01((p - verticalEnd) / (1 - verticalEnd));
    const verticalEase = easeInOutCubic(vertical);
    const horizontalEase = easeOutCubic(horizontal);
    const widthScale = p < verticalEnd ? lerp(1, 0.96, verticalEase) : lerp(0.96, 0, horizontalEase);
    const heightScale = p < verticalEnd ? lerp(1, 0.009, verticalEase) : lerp(0.009, 0.003, horizontalEase);
    const drawWidth = Math.max(2, w * widthScale);
    const drawHeight = Math.max(1.5, h * heightScale);
    const centerX = w / 2;
    const centerY = h / 2;
    context.save();
    context.globalAlpha = p < verticalEnd ? 1 : 1 - horizontalEase * 0.72;
    context.drawImage(tvOffBuffer, 0, 0, tvOffBuffer.width, tvOffBuffer.height, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
    context.restore();
    const glowAlpha = p < verticalEnd ? verticalEase * 0.82 : (1 - horizontalEase) * 0.92;
    if (glowAlpha > 0.001 && options.tvOffGlow > 0) {
      context.save();
      context.globalCompositeOperation = options.tvOffTheme === "light" ? "multiply" : options.tvOffTheme === "dark" ? "screen" : "source-over";
      context.globalAlpha = glowAlpha * options.tvOffGlow;
      context.fillStyle = options.tvOffColor;
      context.shadowColor = options.tvOffColor;
      context.shadowBlur = Math.max(8, Math.min(w, h) * 0.035 * options.tvOffGlow);
      context.fillRect(centerX - drawWidth / 2, centerY - Math.max(1, drawHeight * 0.16), drawWidth, Math.max(1.5, drawHeight * 0.32));
      context.restore();
    }
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    const options = settings();
    const line = marks(options);
    const clock = mod(time * options.speed, Math.max(0.05, line.cycleEnd));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (options.tvOffEnabled && clock >= line.tvOffEnd) {
      context.fillStyle = options.tvOffBgColor;
      context.fillRect(0, 0, w, h);
      return;
    }

    const state = resolveClock(Math.min(clock, line.contentEnd - 0.0001), options, line.count);
    context.fillStyle = options.stageBg;
    context.fillRect(0, 0, w, h);
    const popElapsed = clock;
    const drawScene = () => drawCarousel(context, w, h, options, state, pixelRatio);
    if (clock < options.stagePopDuration) drawWithStagePop(context, w, h, popElapsed, options, drawScene);
    else drawScene();

    if (options.tvOffEnabled && clock >= line.contentEnd) {
      const tvOffProgress = clamp01((clock - line.contentEnd) / Math.max(0.001, options.tvOffDuration));
      drawTvShutdown(context, target, w, h, pixelRatio, tvOffProgress, options);
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.dataset.ratio = String(ratio);
    }
  }

  function currentTime() { return paused ? pausedAt : (performance.now() - animationStart) / 1000; }
  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }
  function cycleLength() {
    const options = settings();
    return Math.max(0.05, marks(options).cycleEnd / Math.max(0.05, options.speed));
  }

  function formatSeconds(seconds) {
    if (seconds < 1) return `${seconds.toFixed(2)}秒`;
    return `${seconds.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}秒`;
  }

  function renderTimeline() {
    const track = $("#timelineTrack");
    const list = $("#timelineList");
    if (!track || !list) return;
    const options = settings();
    const line = marks(options);
    const beats = timelineBeats(options, line);
    track.replaceChildren();
    list.replaceChildren();
    beats.forEach((beat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `me-choreo-block is-${beat.kind}`;
      button.style.flex = `${Math.max(0.08, beat.duration)} 1 0`;
      button.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.name}</strong><small>${formatSeconds(beat.duration)}</small>`;
      button.addEventListener("click", () => setTime((beat.start + 0.001) / Math.max(0.05, options.speed)));
      track.append(button);
      const row = document.createElement("li");
      row.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.name}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      list.append(row);
    });
    const playhead = document.createElement("i");
    playhead.className = "me-choreo-playhead";
    playhead.id = "timelinePlayhead";
    playhead.setAttribute("aria-hidden", "true");
    track.append(playhead);
  }

  function updateTimelinePlayhead(time) {
    const options = settings();
    const line = marks(options);
    const clock = mod(time * options.speed, Math.max(0.05, line.cycleEnd));
    const playhead = $("#timelinePlayhead");
    if (playhead) playhead.style.left = `${(clock / Math.max(0.05, line.cycleEnd)) * 100}%`;
    $("#timelineList")?.querySelectorAll("li").forEach((row, index) => {
      const beats = timelineBeats(options, line);
      row.classList.toggle("is-active", clock >= beats[index].start && clock < beats[index].end);
    });
  }

  function updateOutputs() {
    const options = settings();
    $("#labelSizeOut").textContent = `${Math.round(options.labelSize * 100)}%`;
    $("#labelTrackingOut").textContent = String(options.labelTracking);
    $("#labelPadOut").textContent = String(options.labelPad);
    if ($("#labelOffsetOut")) $("#labelOffsetOut").textContent = `${Math.round(options.labelOffset || 0)}px`;
    $("#frameScaleOut").textContent = `${Math.round(options.frameScale * 100)}%`;
    $("#cardGapOut").textContent = `${Math.round(options.cardGap * 100)}%`;
    $("#sideYawOut").textContent = `${Math.round((options.sideTilt || 0) * 180 / Math.PI)}°`;
    if ($("#sideLiftOut")) $("#sideLiftOut").textContent = `${Math.round(options.sideLift || 0)}px`;
    if ($("#sideShiftOut")) $("#sideShiftOut").textContent = `${Math.round(options.sideShift || 0)}px`;
    $("#radiusOut").textContent = `${options.radius}px`;
    $("#shutterSizeOut").textContent = `${(options.shutterSize * 100).toFixed(1).replace(/\.0$/, "")}%`;
    if ($("#shutterOffsetOut")) $("#shutterOffsetOut").textContent = `${Math.round(options.shutterOffset)}px`;
    $("#beforeHoldOut").textContent = formatSeconds(options.beforeHold);
    $("#shutterDurationOut").textContent = formatSeconds(options.shutterDuration);
    $("#wipeDurationOut").textContent = formatSeconds(options.wipeDuration);
    $("#afterHoldOut").textContent = formatSeconds(options.afterHold);
    $("#scrollDurationOut").textContent = formatSeconds(options.scrollDuration);
    $("#speedOut").textContent = `${options.speed.toFixed(2)}×`;
    $("#stagePopDurationOut").textContent = formatSeconds(options.stagePopDuration);
    $("#stagePopStrengthOut").textContent = `${Math.round(options.stagePopStrength * 100)}%`;
    $("#tvOffDurationOut").textContent = formatSeconds(options.tvOffDuration);
    $("#tvOffHoldOut").textContent = formatSeconds(options.tvOffHold);
    $("#tvOffGlowOut").textContent = `${Math.round(options.tvOffGlow * 100)}%`;
    $(".sa-tv-off-section")?.classList.toggle("is-disabled", !options.tvOffEnabled);
    $(".sa-tv-off-section")?.classList.toggle("is-custom-theme", options.tvOffTheme === "custom");
    renderTimeline();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function pairThumb(image) {
    return image && image.src ? image.src : "";
  }

  function renderPairList() {
    const list = $("#pairList");
    list.replaceChildren();
    pairs.forEach((pair, index) => {
      const card = document.createElement("article");
      card.className = "sa-pair-card";
      const beforeSrc = pairThumb(pair.beforeImage);
      const afterSrc = pairThumb(pair.afterImage);
      card.draggable = true;
      card.dataset.index = String(index);
      card.innerHTML = `
        <div class="sa-pair-head">
          <strong><i class="sa-drag" aria-hidden="true">⋮⋮</i> 第 ${index + 1} 组</strong>
          <div class="sa-pair-tools">
            <button type="button" data-move-up="${index}" ${index === 0 ? "disabled" : ""}>上移</button>
            <button type="button" data-move-down="${index}" ${index === pairs.length - 1 ? "disabled" : ""}>下移</button>
            <button type="button" data-remove="${index}" ${pairs.length <= MIN_PAIRS ? "disabled" : ""}>删除</button>
          </div>
        </div>
        <div class="sa-uploads">
          <label class="sa-upload">
            <span>原图</span>
            <div class="sa-thumb">${beforeSrc ? `<img src="${beforeSrc}" alt="">` : "<i>点击上传原图</i>"}</div>
            <small>${escapeHtml(pair.beforeName || "未选择")}</small>
            <input type="file" accept="image/*" data-before="${index}">
          </label>
          <label class="sa-upload">
            <span>效果图</span>
            <div class="sa-thumb">${afterSrc ? `<img src="${afterSrc}" alt="">` : "<i>点击上传效果图</i>"}</div>
            <small>${escapeHtml(pair.afterName || "未选择")}</small>
            <input type="file" accept="image/*" data-after="${index}">
          </label>
        </div>
        <label>划过方向
          <select data-wipe="${index}">
            <option value="ltr" ${pair.wipe !== "rtl" ? "selected" : ""}>从左到右</option>
            <option value="rtl" ${pair.wipe === "rtl" ? "selected" : ""}>从右到左</option>
          </select>
        </label>`;
      list.append(card);
    });
  }

  async function loadPairImages(list, keepImages = false) {
    const next = await Promise.all(list.map(async (pair, index) => {
      const item = { ...pair };
      if (keepImages && pairs[index]) {
        item.beforeImage = pair.beforeImage || pairs[index].beforeImage;
        item.afterImage = pair.afterImage || pairs[index].afterImage;
      }
      try { if (item.before && !item.beforeImage) item.beforeImage = await loadImage(item.before); } catch (_) {}
      try { if (item.after && !item.afterImage) item.afterImage = await loadImage(item.after); } catch (_) {}
      return item;
    }));
    pairs = next;
    renderPairList();
    renderTimeline();
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    renderFrame(canvas, currentTime(), canvas.width / ratio, canvas.height / ratio, ratio);
    updateTimelinePlayhead(currentTime());
    frameCounter.textContent = `F ${String(Math.round(mod(currentTime(), cycleLength()) * fps)).padStart(4, "0")}`;
    requestAnimationFrame(previewLoop);
  }

  function syncPauseButtons() {
    $("#pauseButton").textContent = paused ? "继续" : "暂停";
    $("#stagePauseIcon").textContent = paused ? "▶" : "Ⅱ";
    $("#stagePauseLabel").textContent = paused ? "继续" : "暂停";
    $("#stagePauseButton").setAttribute("aria-pressed", String(paused));
  }
  function restartPlayback() { paused = false; setTime(0); syncPauseButtons(); }
  function togglePause() {
    if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; }
    else { pausedAt = currentTime(); paused = true; }
    syncPauseButtons();
  }

  $("#restartButton").addEventListener("click", restartPlayback);
  $("#stageRestartButton").addEventListener("click", restartPlayback);
  $("#pauseButton").addEventListener("click", togglePause);
  $("#stagePauseButton").addEventListener("click", togglePause);
  $("#backButton").addEventListener("click", () => { paused = true; setTime(currentTime() - 1 / fps); syncPauseButtons(); });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(currentTime() + 1 / fps); syncPauseButtons(); });
  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.target.closest("input, textarea, select, button")) return;
    event.preventDefault();
    togglePause();
  });

  $("#pairList").addEventListener("input", () => {
    scheduleAutoSave();
  });
  $("#pairList").addEventListener("change", async (event) => {
    const wipe = event.target.dataset.wipe;
    if (wipe != null) pairs[Number(wipe)].wipe = event.target.value;
    const before = event.target.dataset.before;
    const after = event.target.dataset.after;
    const file = event.target.files && event.target.files[0];
    if (file && before != null) {
      pairs[Number(before)].beforeImage = await fileToImage(file);
      pairs[Number(before)].beforeName = file.name;
      pairs[Number(before)].before = "";
      pairs[Number(before)]._texKey = "";
      renderPairList();
    }
    if (file && after != null) {
      pairs[Number(after)].afterImage = await fileToImage(file);
      pairs[Number(after)].afterName = file.name;
      pairs[Number(after)].after = "";
      pairs[Number(after)]._texKey = "";
      renderPairList();
    }
    scheduleAutoSave();
    renderTimeline();
  });
  function movePair(from, to) {
    const start = Number(from);
    const end = Number(to);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return;
    if (start < 0 || end < 0 || start >= pairs.length || end >= pairs.length) return;
    const [item] = pairs.splice(start, 1);
    pairs.splice(end, 0, item);
    renderPairList();
    renderTimeline();
    scheduleAutoSave();
  }

  $("#pairList").addEventListener("click", (event) => {
    const up = event.target.dataset.moveUp;
    if (up != null) {
      movePair(up, Number(up) - 1);
      return;
    }
    const down = event.target.dataset.moveDown;
    if (down != null) {
      movePair(down, Number(down) + 1);
      return;
    }
    const remove = event.target.dataset.remove;
    if (remove == null || pairs.length <= MIN_PAIRS) return;
    pairs.splice(Number(remove), 1);
    renderPairList();
    renderTimeline();
    scheduleAutoSave();
  });
  $("#pairList").addEventListener("dragstart", (event) => {
    const card = event.target.closest(".sa-pair-card");
    if (!card || event.target.closest("input, select, button")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", card.dataset.index || "0");
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("is-dragging");
  });
  $("#pairList").addEventListener("dragend", (event) => {
    event.target.closest(".sa-pair-card")?.classList.remove("is-dragging");
    [...document.querySelectorAll(".sa-pair-card")].forEach((node) => node.classList.remove("is-drop"));
  });
  $("#pairList").addEventListener("dragover", (event) => {
    const card = event.target.closest(".sa-pair-card");
    if (!card) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    [...document.querySelectorAll(".sa-pair-card")].forEach((node) => node.classList.toggle("is-drop", node === card));
  });
  $("#pairList").addEventListener("drop", (event) => {
    const card = event.target.closest(".sa-pair-card");
    if (!card) return;
    event.preventDefault();
    movePair(event.dataTransfer.getData("text/plain"), card.dataset.index);
  });
  $("#addPairButton").addEventListener("click", () => {
    pairs.push({ title: `STYLE ${pairs.length + 1}`, wipe: pairs.length % 2 ? "rtl" : "ltr", beforeName: "未选择", afterName: "未选择" });
    renderPairList();
    renderTimeline();
    scheduleAutoSave();
  });

  fieldIds.forEach((id) => {
    const field = inputs[id];
    if (!field) return;
    field.addEventListener("input", () => { updateOutputs(); scheduleAutoSave(); });
    field.addEventListener("change", () => { updateOutputs(); scheduleAutoSave(); });
  });
  document.querySelectorAll("[data-speed-value]").forEach((button) => {
    button.addEventListener("click", () => {
      inputs.speed.value = button.dataset.speedValue;
      updateOutputs();
      scheduleAutoSave();
    });
  });

  function collectPreset() {
    const fields = {};
    fieldIds.forEach((id) => {
      const el = inputs[id];
      if (el && "value" in el) fields[id] = el.type === "checkbox" ? el.checked : el.value;
    });
    return {
      version: 1,
      fields,
      pairs: pairs.map((pair) => ({
        title: pair.title,
        wipe: pair.wipe,
        beforeName: pair.beforeName,
        afterName: pair.afterName,
        before: pair.before || "",
        after: pair.after || "",
        beforeImage: pair.before && !String(pair.before).startsWith("data:") ? "" : imageToDataURL(pair.beforeImage),
        afterImage: pair.after && !String(pair.after).startsWith("data:") ? "" : imageToDataURL(pair.afterImage)
      }))
    };
  }

  async function applyPreset(preset) {
    if (!preset?.fields) return;
    Object.entries(preset.fields).forEach(([id, value]) => {
      const field = inputs[id];
      if (!field || value == null) return;
      if (field.type === "checkbox") field.checked = value === true || value === "true";
      else if (id === "stageBg" && (value === "#050506" || value === "#111113")) field.value = "#ffffff";
      else field.value = value;
    });
    const list = (preset.pairs && preset.pairs.length ? preset.pairs : DEFAULT_PAIRS).map((pair) => ({
      title: pair.title || "",
      wipe: pair.wipe === "rtl" ? "rtl" : "ltr",
      beforeName: pair.beforeName || "",
      afterName: pair.afterName || "",
      before: pair.beforeImage || pair.before || "",
      after: pair.afterImage || pair.after || "",
      beforeImage: null,
      afterImage: null
    }));
    while (list.length < MIN_PAIRS) list.push({ title: `STYLE ${list.length + 1}`, wipe: "ltr" });
    await loadPairImages(list);
    updateOutputs();
    setTime(0);
  }

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(collectPreset()));
        if (schemeStatus) schemeStatus.textContent = "已自动保存当前快门对比方案。";
      } catch (_) {
        if (schemeStatus) schemeStatus.textContent = "自动保存空间不足，请使用“保存方案”下载 JSON。";
      }
    }, 500);
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeURL?.(url) || URL.revokeObjectURL(url), 2000);
  }

  $("#saveButton").addEventListener("click", () => {
    const preset = collectPreset();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(preset)); } catch (_) {}
    downloadBlob(new Blob([JSON.stringify(preset)], { type: "application/json" }), "shutterafter-preset.json");
    exportStatus.textContent = "方案已保存，并下载了模板文件。";
    if (schemeStatus) schemeStatus.textContent = "方案已保存并下载 JSON。";
  });
  $("#importFile").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const preset = JSON.parse(await file.text());
      await applyPreset(preset);
      localStorage.setItem(SAVE_KEY, JSON.stringify(preset));
      exportStatus.textContent = "方案已导入。";
    } catch (error) {
      exportStatus.textContent = `导入失败：${error.message || "文件无效"}`;
    }
  });
  async function loadDefaultPreset() {
    try {
      const preset = await fetch(DEFAULT_PRESET_URL, { cache: "no-store" }).then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      });
      await applyPreset(preset);
      return true;
    } catch (_) {
      fieldIds.forEach((id) => {
        const field = inputs[id];
        if (!field) return;
        if (field.type === "checkbox") field.checked = field.defaultChecked;
        else field.value = field.defaultValue;
      });
      await loadPairImages(DEFAULT_PAIRS.map((pair) => ({ ...pair })));
      updateOutputs();
      setTime(0);
      return false;
    }
  }

  $("#resetButton").addEventListener("click", async () => {
    localStorage.removeItem(SAVE_KEY);
    const ok = await loadDefaultPreset();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(collectPreset())); } catch (_) {}
    if (schemeStatus) schemeStatus.textContent = ok ? "已恢复项目默认参数。" : "已恢复页面默认四组示例。";
  });
  $("#clearButton").addEventListener("click", async () => {
    await loadPairImages(Array.from({ length: MIN_PAIRS }, (_, index) => ({
      title: `STYLE ${index + 1}`,
      wipe: index % 2 ? "rtl" : "ltr",
      beforeName: "未选择",
      afterName: "未选择"
    })));
    updateOutputs();
    setTime(0);
    if (schemeStatus) schemeStatus.textContent = "已清空图片，保留三组空位。";
  });

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
  }

  function syncStageAspect() {
    const phone = document.querySelector(".sa-phone");
    if (!phone) return;
    const preset = $("#exportPreset") && $("#exportPreset").value;
    let width = 1080;
    let height = 1920;
    if (preset && preset !== "current") {
      [width, height] = exportDimensions();
    }
    width = Math.max(1, width);
    height = Math.max(1, height);
    phone.style.setProperty("--sa-aspect", `${width} / ${height}`);
    phone.style.setProperty("--sa-ratio", String(width / height));
    window.dispatchEvent(new Event("resize"));
  }
  function makeExportCanvas() {
    const [width, height] = exportDimensions();
    const result = document.createElement("canvas");
    result.width = Math.max(240, Math.min(3840, width));
    result.height = Math.max(240, Math.min(3840, height));
    return result;
  }
  function setExportBusy(busy, message) {
    ["exportPng", "exportGif", "exportVideo", "exportVerticalVideo"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = busy;
    });
    exportStatus.textContent = message;
  }
  $("#exportPreset").addEventListener("change", (event) => {
    $("#customSize").hidden = event.currentTarget.value !== "custom";
    syncStageAspect();
  });
  $("#exportWidth")?.addEventListener("change", syncStageAspect);
  $("#exportHeight")?.addEventListener("change", syncStageAspect);
  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `shutter-after-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。";
      return;
    }
    const output = makeExportCanvas();
    const gifFps = 12;
    const duration = cycleLength();
    const frameTotal = Math.ceil(duration * gifFps);
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
    for (let frame = 0; frame < frameTotal; frame += 1) {
      renderFrame(output, frame / gifFps, output.width, output.height, 1);
      gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
    }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
    gif.on("finished", (blob) => {
      downloadBlob(blob, `shutter-after-${output.width}x${output.height}.gif`);
      setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height}`);
    });
    gif.render();
  });
  async function exportVideo(verticalHD) {
    if (!window.HME || typeof HME.createH264MP4Encoder !== "function") {
      setExportBusy(false, "MP4 编码器未加载，请刷新后重试。");
      return;
    }
    let width;
    let height;
    if (verticalHD) { width = 1080; height = 1920; }
    else [width, height] = exportDimensions();
    width = Math.max(240, Math.min(3840, Math.round(width / 2) * 2));
    height = Math.max(240, Math.min(3840, Math.round(height / 2) * 2));
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { willReadFrequently: true });
    const duration = cycleLength();
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    setExportBusy(true, `正在导出 MP4 ${width} × ${height} · 0%`);
    const encoder = await HME.createH264MP4Encoder();
    encoder.outputFilename = `shutter-after-${width}x${height}.mp4`;
    encoder.width = width;
    encoder.height = height;
    encoder.frameRate = fps;
    encoder.kbps = 20000;
    encoder.groupOfPictures = 15;
    encoder.initialize();
    try {
      for (let frame = 0; frame < frameCount; frame += 1) {
        renderFrame(output, frame / fps, width, height, 1);
        encoder.addFrameRgba(context.getImageData(0, 0, width, height).data);
        if (frame % 2 === 0) {
          exportStatus.textContent = `正在导出 MP4 ${width} × ${height} · ${Math.round((frame + 1) / frameCount * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), `shutter-after-${width}x${height}.mp4`);
      setExportBusy(false, `MP4 已生成 · ${width} × ${height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder.delete(); } catch (_) {}
    }
  }
  $("#exportVideo").addEventListener("click", () => exportVideo(false));
  $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  (async function boot() {
    let loaded = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        await applyPreset(JSON.parse(raw));
        loaded = true;
      }
    } catch (_) {}
    if (!loaded) {
      const ok = await loadDefaultPreset();
      if (!ok) await loadPairImages(DEFAULT_PAIRS.map((pair) => ({ ...pair })));
    }
    updateOutputs();
    syncStageAspect();
    previewLoop();
  })();
})();
