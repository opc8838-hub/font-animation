(() => {
  const $ = (s) => document.querySelector(s),
    canvas = $("#mediaCanvas"),
    frameCounter = $("#frameCounter"),
    exportStatus = $("#exportStatus"),
    mediaStatus = $("#mediaStatus"),
    fps = 30;
  const inputs = {
    prefix: $("#prefixText"),
    suffix: $("#suffixText"),
    upload: $("#mediaUpload"),
    font: $("#fontFamily"),
    weight: $("#fontWeight"),
    speed: $("#speed"),
    title: $("#titleIn"),
    seed: $("#seedIn"),
    duplicate: $("#duplicate"),
    stripHold: $("#stripHold"),
    textExit: $("#textExit"),
    laptop: $("#laptopIn"),
    fullscreen: $("#fullscreenIn"),
    fullHold: $("#fullscreenHold"),
    rhythm: $("#rhythm"),
    count: $("#copyCount"),
    stripWidth: $("#stripWidth"),
    stripHeight: $("#stripHeight"),
    shotGap: $("#shotGap"),
    direction: $("#direction"),
    fit: $("#mediaFit"),
    laptopSize: $("#laptopSize"),
    bezel: $("#bezel"),
    margin: $("#fullscreenMargin"),
    mediaSpeed: $("#mediaSpeed"),
    fontSize: $("#fontSize"),
    tracking: $("#tracking"),
    slotWidth: $("#slotWidth"),
    textX: $("#textX"),
    textY: $("#textY"),
    glow: $("#glow"),
    exitDistance: $("#exitDistance"),
    titleOffset: $("#titleOffset"),
    background: $("#backgroundColor"),
    textColor: $("#textColor"),
    glowColor: $("#glowColor"),
    laptopColor: $("#laptopColor"),
  };
  const fonts = {
    inter: '"MC Inter","MC Noto",sans-serif',
    space: '"MC Space","MC Noto",sans-serif',
    manrope: '"MC Manrope","MC Noto",sans-serif',
    poppins: '"MC Poppins","MC Noto",sans-serif',
    noto: '"MC Noto",sans-serif',
  };
  let media = {
      kind: "placeholder",
      element: null,
      url: null,
      name: "动态占位镜头",
    },
    paused = false,
    pausedAt = 0,
    start = performance.now(),
    raf = 0,
    dirty = true,
    lastDuration = 1;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    mod = (v, d) => ((v % d) + d) % d,
    lerp = (a, b, t) => a + (b - a) * t,
    smooth = (v) => {
      const t = clamp(v);
      return t * t * (3 - 2 * t);
    },
    easeOut = (v) => 1 - Math.pow(1 - clamp(v), 3),
    easeIn = (v) => Math.pow(clamp(v), 3);
  function timing() {
    const s = Math.max(0.25, +inputs.speed.value);
    return {
      title: +inputs.title.value / 1000 / s,
      seed: +inputs.seed.value / 1000 / s,
      dup: +inputs.duplicate.value / 1000 / s,
      strip: +inputs.stripHold.value / 1000 / s,
      exit: +inputs.textExit.value / 1000 / s,
      laptop: +inputs.laptop.value / 1000 / s,
      full: +inputs.fullscreen.value / 1000 / s,
      hold: +inputs.fullHold.value / 1000 / s,
    };
  }
  function duration() {
    const t = timing();
    return Math.max(
      1 / fps,
      Object.values(t).reduce((a, b) => a + b, 0),
    );
  }
  function now() {
    return paused ? pausedAt : Math.max(0, (performance.now() - start) / 1000);
  }
  function restart() {
    pausedAt = 0;
    start = performance.now();
    paused = false;
    lastDuration = duration();
    dirty = true;
    $("#pauseButton").textContent = "暂停";
  }
  function setTime(v) {
    pausedAt = Math.max(0, v);
    start = performance.now() - pausedAt * 1000;
    dirty = true;
    drawPreview(pausedAt);
  }
  function preserve() {
    const n = now(),
      a = Math.max(1 / fps, lastDuration),
      b = duration(),
      x = (Math.floor(n / a) + mod(n, a) / a) * b;
    lastDuration = b;
    if (paused) pausedAt = x;
    else start = performance.now() - x * 1000;
    dirty = true;
  }
  function phaseAt(time) {
    const p = mod(time, duration()),
      t = timing();
    let x = 0;
    if (p < (x += t.title))
      return { name: "title", p: p / Math.max(0.001, t.title), local: p };
    if (p < (x += t.seed))
      return {
        name: "seed",
        p: (p - x + t.seed) / Math.max(0.001, t.seed),
        local: p,
      };
    if (p < (x += t.dup))
      return {
        name: "duplicate",
        p: (p - x + t.dup) / Math.max(0.001, t.dup),
        local: p,
      };
    if (p < (x += t.strip)) return { name: "strip", p: 1, local: p };
    if (p < (x += t.exit))
      return {
        name: "exit",
        p: (p - x + t.exit) / Math.max(0.001, t.exit),
        local: p,
      };
    if (p < (x += t.laptop))
      return {
        name: "laptop",
        p: (p - x + t.laptop) / Math.max(0.001, t.laptop),
        local: p,
      };
    if (p < (x += t.full))
      return {
        name: "fullscreen",
        p: (p - x + t.full) / Math.max(0.001, t.full),
        local: p,
      };
    return { name: "hold", p: 1, local: p - x };
  }
  function motion(p) {
    if (inputs.rhythm.value === "smooth") return smooth(p);
    if (inputs.rhythm.value === "snap") return easeOut(clamp(p * 1.45));
    if (inputs.rhythm.value === "elastic") {
      const t = clamp(p);
      return clamp(1 - Math.pow(2, -8 * t) * Math.cos(t * Math.PI * 3.5));
    }
    return p < 0.55
      ? easeIn(p / 0.55) * 0.62
      : 0.62 + easeOut((p - 0.55) / 0.45) * 0.38;
  }
  function widthOf(ctx, text, tracking) {
    const chars = Array.from(text);
    return (
      chars.reduce((s, c) => s + ctx.measureText(c).width, 0) +
      Math.max(0, chars.length - 1) * tracking
    );
  }
  function drawAt(ctx, text, x, y, tracking) {
    let c = x;
    Array.from(text).forEach((ch) => {
      ctx.fillText(ch, c, y);
      c += ctx.measureText(ch).width + tracking;
    });
    return c;
  }
  function style(ctx, w, h) {
    const scale = Math.max(0.24, Math.min(w / 1000, h / 900)),
      family = fonts[inputs.font.value] || fonts.inter,
      tracking = +inputs.tracking.value * scale;
    let size = +inputs.fontSize.value * scale;
    ctx.font = `${inputs.weight.value} ${size}px ${family}`;
    const slot = (size * +inputs.slotWidth.value) / 100,
      full =
        widthOf(ctx, inputs.prefix.value || " ", tracking) +
        slot +
        widthOf(ctx, inputs.suffix.value || " ", tracking),
      max = w * 0.92;
    if (full > max) {
      const fit = max / full;
      size *= fit;
      ctx.font = `${inputs.weight.value} ${size}px ${family}`;
    }
    return {
      scale,
      family,
      tracking,
      size,
      x: (w * +inputs.textX.value) / 100,
      y: (h * +inputs.textY.value) / 100,
    };
  }
  function group(ctx, st) {
    ctx.font = `${inputs.weight.value} ${st.size}px ${st.family}`;
    const a = widthOf(ctx, inputs.prefix.value || " ", st.tracking),
      b = widthOf(ctx, inputs.suffix.value || " ", st.tracking),
      slot = (st.size * +inputs.slotWidth.value) / 100,
      total = a + slot + b,
      left = st.x - total / 2;
    return {
      a,
      b,
      slot,
      total,
      left,
      prefixX: left,
      suffixX: left + a + slot,
      slotX: left + a + slot / 2,
    };
  }
  function drawTitle(
    ctx,
    st,
    w,
    h,
    progress = 1,
    mediaRect = null,
    exit = 0,
    time = 0,
    spread = 0,
  ) {
    const g = group(ctx, st),
      offset = +inputs.titleOffset.value * st.scale * (1 - motion(progress)),
      distance = (w * +inputs.exitDistance.value) / 100,
      alpha = (1 - exit) * clamp(progress * 1.7),
      push = spread + exit * (1 - spread);
    ctx.save();
    ctx.font = `${inputs.weight.value} ${st.size}px ${st.family}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = inputs.textColor.value;
    ctx.shadowColor = inputs.glowColor.value;
    ctx.shadowBlur = (st.size * 0.23 * +inputs.glow.value) / 100;
    ctx.globalAlpha = alpha;
    drawAt(
      ctx,
      inputs.prefix.value,
      g.prefixX - distance * push,
      st.y - offset,
      st.tracking,
    );
    drawAt(
      ctx,
      inputs.suffix.value,
      g.suffixX + distance * push,
      st.y + offset,
      st.tracking,
    );
    ctx.restore();
    if (mediaRect)
      drawMedia(
        ctx,
        mediaRect.x,
        mediaRect.y,
        mediaRect.w,
        mediaRect.h,
        time,
        1,
      );
  }
  function drawPlaceholder(ctx, x, y, w, h, time) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#2c0b56");
    grad.addColorStop(0.55, "#8356ff");
    grad.addColorStop(1, "#12d6c5");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,.22)";
    const cx = x + w * (0.5 + 0.22 * Math.sin(time * 1.8)),
      cy = y + h * (0.5 + 0.18 * Math.cos(time * 1.4));
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${Math.max(10, Math.min(w, h) * 0.18)}px ${fonts.inter}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MEDIA", x + w / 2, y + h / 2);
    ctx.textAlign = "start";
  }
  function drawMedia(ctx, x, y, w, h, time, alpha = 1) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.08);
    ctx.clip();
    const el = media.element,
      sw = el ? el.videoWidth || el.naturalWidth || 0 : 0,
      sh = el ? el.videoHeight || el.naturalHeight || 0 : 0;
    if (el && sw && sh) {
      const contain = inputs.fit.value === "contain",
        scale = contain ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh),
        dw = sw * scale,
        dh = sh * scale;
      ctx.fillStyle = "#050505";
      ctx.fillRect(x, y, w, h);
      ctx.drawImage(el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else drawPlaceholder(ctx, x, y, w, h, time);
    ctx.restore();
  }
  function stripRect(ctx, st, w, h, widthProgress = 1, heightProgress = 1) {
    const targetW = (w * +inputs.stripWidth.value) / 100,
      targetH = (h * +inputs.stripHeight.value) / 100,
      g = group(ctx, st),
      currentW = lerp(g.slot, targetW, widthProgress),
      direction = inputs.direction.value;
    let x = st.x - currentW / 2;
    if (direction === "left") x = st.x + g.slot / 2 - currentW;
    if (direction === "right") x = st.x - g.slot / 2;
    return {
      x,
      y: st.y - lerp(st.size * 0.72, targetH, heightProgress) / 2,
      w: currentW,
      h: lerp(st.size * 0.72, targetH, heightProgress),
    };
  }
  function drawStrip(ctx, rect, count, time, alpha = 1) {
    ctx.save();
    ctx.shadowColor = inputs.glowColor.value;
    ctx.shadowBlur = (18 * +inputs.glow.value) / 100;
    ctx.strokeStyle = inputs.glowColor.value;
    ctx.lineWidth = Math.max(2, rect.h * 0.025);
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, rect.h * 0.06);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, rect.h * 0.06);
    ctx.clip();
    const gap = +inputs.shotGap.value,
      countSafe = Math.max(1, count),
      shotW = (rect.w - gap * (countSafe - 1)) / countSafe;
    for (let i = 0; i < countSafe; i++) {
      let index = i;
      if (inputs.direction.value === "left") index = countSafe - 1 - i;
      drawMedia(
        ctx,
        rect.x + i * (shotW + gap),
        rect.y,
        shotW,
        rect.h,
        time + index * 0.08,
        1,
      );
    }
    ctx.restore();
  }
  function laptopRect(w, h) {
    const screenW = (w * +inputs.laptopSize.value) / 100,
      screenH = (screenW * 9) / 16;
    return {
      x: w / 2 - screenW / 2,
      y: h / 2 - screenH / 2,
      w: screenW,
      h: screenH,
    };
  }
  function lerpRect(a, b, p) {
    return {
      x: lerp(a.x, b.x, p),
      y: lerp(a.y, b.y, p),
      w: lerp(a.w, b.w, p),
      h: lerp(a.h, b.h, p),
    };
  }
  function drawLaptop(
    ctx,
    rect,
    time,
    progress = 1,
    chromeAlpha = 1,
    copies = 1,
  ) {
    const bezel = +inputs.bezel.value;
    ctx.save();
    ctx.globalAlpha = progress * chromeAlpha;
    ctx.fillStyle = inputs.laptopColor.value;
    ctx.beginPath();
    ctx.roundRect(
      rect.x - bezel,
      rect.y - bezel,
      rect.w + bezel * 2,
      rect.h + bezel * 2,
      Math.max(4, bezel * 0.8),
    );
    ctx.fill();
    ctx.globalAlpha = progress;
    if (copies > 1) drawStrip(ctx, rect, copies, time);
    else drawMedia(ctx, rect.x, rect.y, rect.w, rect.h, time);
    ctx.globalAlpha = chromeAlpha * progress;
    ctx.fillStyle = inputs.laptopColor.value;
    ctx.beginPath();
    ctx.moveTo(rect.x - rect.w * 0.08, rect.y + rect.h + bezel);
    ctx.lineTo(rect.x + rect.w * 1.08, rect.y + rect.h + bezel);
    ctx.lineTo(rect.x + rect.w * 0.95, rect.y + rect.h + bezel + rect.h * 0.09);
    ctx.lineTo(rect.x + rect.w * 0.05, rect.y + rect.h + bezel + rect.h * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function renderFrame(target, time, w, h, ratio = 1) {
    const ctx = target.getContext("2d", { alpha: false });
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = inputs.background.value;
    ctx.fillRect(0, 0, w, h);
    const st = style(ctx, w, h),
      phase = phaseAt(time),
      g = group(ctx, st);
    if (phase.name === "title") {
      drawTitle(ctx, st, w, h, phase.p, null, 0, time);
      return;
    }
    if (phase.name === "seed") {
      const p = motion(phase.p),
        rect = {
          x: g.slotX - lerp(g.slot * 0.05, g.slot * 0.5, p),
          y: st.y - lerp(st.size * 0.42, st.size * 0.48, p),
          w: lerp(g.slot * 0.1, g.slot, p),
          h: lerp(st.size * 0.84, st.size * 0.96, p),
        };
      drawTitle(ctx, st, w, h, 1, rect, 0, time);
      return;
    }
    const targetStrip = stripRect(ctx, st, w, h, 1, 1);
    if (phase.name === "duplicate") {
      const p = motion(phase.p),
        rect = stripRect(ctx, st, w, h, p, p),
        count = Math.max(1, Math.round(lerp(1, +inputs.count.value, p)));
      drawStrip(ctx, rect, count, time);
      drawTitle(ctx, st, w, h, 1, null, 0, time, 0.45 * p);
      return;
    }
    if (phase.name === "strip") {
      drawStrip(ctx, targetStrip, +inputs.count.value, time);
      drawTitle(ctx, st, w, h, 1, null, 0, time, 0.45);
      return;
    }
    if (phase.name === "exit") {
      drawStrip(ctx, targetStrip, +inputs.count.value, time);
      drawTitle(ctx, st, w, h, 1, null, motion(phase.p), time, 0.45);
      return;
    }
    const laptop = laptopRect(w, h);
    if (phase.name === "laptop") {
      const p = motion(phase.p),
        rect = lerpRect(targetStrip, laptop, p),
        copies = Math.max(1, Math.round(lerp(+inputs.count.value, 1, p)));
      drawLaptop(ctx, rect, time, p, p, copies);
      return;
    }
    const margin = (Math.min(w, h) * +inputs.margin.value) / 100,
      full = { x: margin, y: margin, w: w - margin * 2, h: h - margin * 2 };
    if (phase.name === "fullscreen") {
      const p = motion(phase.p),
        rect = lerpRect(laptop, full, p);
      drawLaptop(ctx, rect, time, 1, 1 - p, 1);
      return;
    }
    drawMedia(ctx, full.x, full.y, full.w, full.h, time);
  }
  function resize() {
    const r = Math.min(1.25, window.devicePixelRatio || 1),
      w = Math.max(1, Math.round(canvas.clientWidth)),
      h = Math.max(1, Math.round(canvas.clientHeight));
    if (
      canvas.width !== Math.round(w * r) ||
      canvas.height !== Math.round(h * r)
    ) {
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);
      canvas.dataset.ratio = String(r);
      dirty = true;
    }
  }
  function drawPreview(t = now()) {
    resize();
    const r = +canvas.dataset.ratio || 1;
    renderFrame(canvas, t, canvas.width / r, canvas.height / r, r);
    dirty = false;
    frameCounter.textContent = `F ${String(Math.floor(t * fps)).padStart(4, "0")}`;
  }
  function loop() {
    if (!paused || dirty) drawPreview();
    raf = requestAnimationFrame(loop);
  }
  function loadMedia(file) {
    if (media.kind === "video" && media.element) {
      media.element.pause();
      media.element.remove();
    }
    if (media.url) URL.revokeObjectURL(media.url);
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.style.display = "none";
      video.onloadeddata = () => {
        video.play().catch(() => {});
        dirty = true;
        mediaStatus.textContent = `视频已加载 · ${file.name} · ${video.duration.toFixed(1)}秒`;
      };
      video.src = url;
      document.body.append(video);
      video.load();
      media = { kind: "video", element: video, url, name: file.name };
    } else {
      const image = new Image();
      image.onload = () => {
        dirty = true;
        mediaStatus.textContent = `图片 / GIF 已加载 · ${file.name}`;
      };
      image.src = url;
      media = { kind: "image", element: image, url, name: file.name };
    }
  }
  window.addEventListener("beforeunload", () => {
    if (media.kind === "video" && media.element) {
      media.element.pause();
      media.element.remove();
    }
  });
  async function seekMedia(time) {
    if (
      media.kind !== "video" ||
      !media.element ||
      !Number.isFinite(media.element.duration) ||
      !media.element.duration
    )
      return;
    const video = media.element,
      target = mod(
        time * +inputs.mediaSpeed.value,
        Math.max(0.05, video.duration - 0.001),
      );
    if (Math.abs(video.currentTime - target) < 0.025) return;
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener("seeked", finish);
        resolve();
      };
      video.addEventListener("seeked", finish, { once: true });
      video.currentTime = target;
      setTimeout(finish, 250);
    });
  }
  const fmt = {
    speed: (v) => `${(+v).toFixed(2)}×`,
    title: (v) => `${(v / 1000).toFixed(2)}秒`,
    seed: (v) => `${(v / 1000).toFixed(2)}秒`,
    duplicate: (v) => `${(v / 1000).toFixed(2)}秒`,
    stripHold: (v) => `${(v / 1000).toFixed(2)}秒`,
    textExit: (v) => `${(v / 1000).toFixed(2)}秒`,
    laptop: (v) => `${(v / 1000).toFixed(2)}秒`,
    fullscreen: (v) => `${(v / 1000).toFixed(2)}秒`,
    fullHold: (v) => `${(v / 1000).toFixed(2)}秒`,
    count: (v) => v,
    stripWidth: (v) => `${v}%`,
    stripHeight: (v) => `${v}%`,
    shotGap: (v) => `${v}px`,
    laptopSize: (v) => `${v}%`,
    bezel: (v) => `${v}px`,
    margin: (v) => `${v}%`,
    mediaSpeed: (v) => `${(+v).toFixed(2)}×`,
    fontSize: (v) => `${v}px`,
    tracking: (v) => `${v}px`,
    slotWidth: (v) => `${v}%`,
    textX: (v) => `${v}%`,
    textY: (v) => `${v}%`,
    glow: (v) => `${v}%`,
    exitDistance: (v) => `${v}%`,
    titleOffset: (v) => `${v}px`,
  };
  Object.entries(inputs).forEach(([k, input]) => {
    if (!input || input.type === "file") return;
    input.addEventListener(
      input.tagName === "SELECT" || input.type === "color" ? "change" : "input",
      () => {
        const out = $(`#${input.id}Out`);
        if (out && fmt[k]) out.textContent = fmt[k](input.value);
        preserve();
      },
    );
  });
  inputs.upload.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadMedia(file);
  };
  $("#referencePreset").onclick = () => {
    inputs.prefix.value = "Edit a";
    inputs.suffix.value = "video.";
    inputs.font.value = "inter";
    restart();
  };
  $("#chinesePreset").onclick = () => {
    inputs.prefix.value = "剪辑一段";
    inputs.suffix.value = "视频";
    inputs.font.value = "noto";
    restart();
  };
  $("#restartTop").onclick = restart;
  $("#restartButton").onclick = restart;
  $("#pauseButton").onclick = (e) => {
    if (paused) {
      start = performance.now() - pausedAt * 1000;
      paused = false;
      e.currentTarget.textContent = "暂停";
      if (media.kind === "video") media.element.play().catch(() => {});
    } else {
      pausedAt = now();
      paused = true;
      drawPreview(pausedAt);
      e.currentTarget.textContent = "继续";
      if (media.kind === "video") media.element.pause();
    }
  };
  $("#backButton").onclick = () => {
    if (!paused) $("#pauseButton").click();
    setTime(Math.max(0, pausedAt - 1 / fps));
    seekMedia(pausedAt).then(() => drawPreview(pausedAt));
  };
  $("#forwardButton").onclick = () => {
    if (!paused) $("#pauseButton").click();
    setTime(pausedAt + 1 / fps);
    seekMedia(pausedAt).then(() => drawPreview(pausedAt));
  };
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      if (media.kind === "video") media.element.pause();
    } else {
      if (media.kind === "video" && !paused)
        media.element.play().catch(() => {});
      loop();
    }
  });
  function dims(vertical = false) {
    if (vertical) return [1080, 1920];
    const v = $("#exportPreset").value;
    if (v === "current")
      return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (v === "custom")
      return [+$("#exportWidth").value, +$("#exportHeight").value];
    return v.split("x").map(Number);
  }
  function exportCanvas(vertical = false) {
    const [w, h] = dims(vertical),
      c = document.createElement("canvas");
    c.width = clamp(w, 240, 3840);
    c.height = clamp(h, 240, 3840);
    return c;
  }
  function exportDuration() {
    const v = $("#exportDuration").value;
    return v === "cycle"
      ? duration()
      : v === "custom"
        ? +$("#customDuration").value
        : +v;
  }
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  const buttons = [
    $("#exportPng"),
    $("#exportGif"),
    $("#exportVideo"),
    $("#exportVerticalVideo"),
  ];
  function busy(v, msg) {
    buttons.forEach((b) => (b.disabled = v));
    exportStatus.textContent = msg;
  }
  $("#exportPreset").onchange = (e) => {
    $("#customSize").hidden = e.target.value !== "custom";
  };
  $("#exportDuration").onchange = (e) => {
    $("#customDurationWrap").hidden = e.target.value !== "custom";
  };
  $("#exportPng").onclick = () => {
    const c = exportCanvas();
    renderFrame(c, now(), c.width, c.height);
    c.toBlob((b) => {
      if (b) {
        download(b, `media-cascade-${c.width}x${c.height}.png`);
        exportStatus.textContent = `PNG 已生成 · ${c.width} × ${c.height}`;
      }
    }, "image/png");
  };
  $("#exportGif").onclick = async () => {
    if (!window.GIF) return;
    const c = exportCanvas(),
      rate = +$("#exportFps").value || 30,
      d = exportDuration(),
      frames = Math.ceil(d * rate),
      gif = new GIF({
        workers: 2,
        quality: 10,
        width: c.width,
        height: c.height,
        workerScript: "js/continuation-gif.worker.js",
    });
    busy(true, `正在准备 GIF · 0 / ${frames} 帧`);
    if (media.kind === "video") media.element.pause();
    try {
      for (let i = 0; i < frames; i++) {
        await seekMedia(i / rate);
        renderFrame(c, i / rate, c.width, c.height);
        // Pass the 2D context directly. The bundled gif.js treats a canvas as
        // a generic image and creates an extra scratch context, which can be
        // unavailable under browser canvas pressure.
        gif.addFrame(c.getContext("2d"), {
          copy: true,
          delay: 1000 / rate,
        });
        if (i % 3 === 0) {
          exportStatus.textContent = `正在读取素材 · ${i + 1} / ${frames} 帧`;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } catch (error) {
      busy(false, `GIF 导出失败：${error.message}`);
      if (media.kind === "video" && !paused)
        media.element.play().catch(() => {});
      return;
    }
    gif.on(
      "progress",
      (p) =>
        (exportStatus.textContent = `正在编码 GIF · ${Math.round(p * 100)}%`),
    );
    gif.on("finished", (b) => {
      download(b, `media-cascade-${c.width}x${c.height}.gif`);
      busy(false, "GIF 已生成");
      if (media.kind === "video" && !paused)
        media.element.play().catch(() => {});
    });
    gif.on("abort", () => busy(false, "GIF 导出已中止"));
    gif.render();
  };
  async function videoExport(vertical = false) {
    const c = exportCanvas(vertical),
      rate = +$("#exportFps").value || 30,
      d = exportDuration(),
      frames = Math.ceil(d * rate);
    busy(true, "正在逐帧读取素材 · 0%");
    if (media.kind === "video") media.element.pause();
    try {
      const writer = new WebMWriter({ quality: 0.94, frameRate: rate });
      for (let i = 0; i < frames; i++) {
        await seekMedia(i / rate);
        renderFrame(c, i / rate, c.width, c.height);
        writer.addFrame(c);
        if (i % 2 === 0) {
          exportStatus.textContent = `正在逐帧生成视频 · ${Math.round(((i + 1) / frames) * 100)}%`;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      download(
        await writer.complete(),
        `media-cascade-${c.width}x${c.height}.webm`,
      );
      busy(false, `WEBM 视频已生成 · ${c.width} × ${c.height}`);
    } catch (e) {
      busy(false, `视频导出失败：${e.message}`);
    }
    if (media.kind === "video" && !paused) media.element.play().catch(() => {});
  }
  $("#exportVideo").onclick = () => videoExport();
  $("#exportVerticalVideo").onclick = () => videoExport(true);
  window.addEventListener("beforeunload", () => {
    if (media.url) URL.revokeObjectURL(media.url);
  });
  lastDuration = duration();
  resize();
  loop();
})();
