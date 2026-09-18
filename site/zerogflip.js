(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'cellmotion-zerogflip-v16';
  const PHASES = [
    { key: 'flip', label: '翻转', className: 'me-phase-coral', seconds: 1.2 },
    { key: 'hold', label: '回正', className: 'me-phase-amber', seconds: 0.28 },
    { key: 'recolor', label: '切图', className: 'me-phase-sky', seconds: 2.5 },
  ];
  const CAMERA_ELEV = 6 * Math.PI / 180;

  const state = {
    canvas: { width: 1920, height: 1080 },
    background: '#07080c',
    caption: "What's next?",
    captionOn: true,
    flipTurns: 1,
    pitch: 14,
    yaw0: 22,
    parallax: 72,
    recolorAmt: 100,
    cardScale: 80,
    cardLift: 0,
    speed: 1,
    image: null,
    imageName: '',
    seqSheets: [],
    seqNames: [],
    bgCustom: null,
    playing: true,
    time: 0,
    last: 0,
  };

  const canvas = $('previewCanvas');
  const source = document.createElement('canvas');
  const sourceCtx = source.getContext('2d');
  const sourceBack = document.createElement('canvas');
  const sourceBackCtx = sourceBack.getContext('2d');
  const sourceEdge = document.createElement('canvas');
  const sourceEdgeCtx = sourceEdge.getContext('2d');
  const tinted = document.createElement('canvas');
  const tintedCtx = tinted.getContext('2d');
  const faceSilver = document.createElement('canvas');
  const faceBlack = document.createElement('canvas');
  const faceBlue = document.createElement('canvas');
  const defaultBg = new Image();
  defaultBg.src = 'assets/zerogflip/bg-office-wide.jpg';
  const defaultCard = new Image();
  defaultCard.src = 'assets/zerogflip/card.jpg';

  const easeOut = t => 1 - (1 - t) ** 3;
  const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const deg = d => d * Math.PI / 180;

  function cycleSeconds() {
    return PHASES.reduce((sum, phase) => sum + phase.seconds, 0) / Math.max(0.25, state.speed);
  }

  function phaseAt(seconds) {
    const total = cycleSeconds();
    const t = ((seconds % total) + total) % total;
    let cursor = 0;
    for (const phase of PHASES) {
      const dur = phase.seconds / Math.max(0.25, state.speed);
      if (t < cursor + dur) return { phase, local: (t - cursor) / dur, t, total };
      cursor += dur;
    }
    return { phase: PHASES.at(-1), local: 1, t, total };
  }

  function inertialSpin(t) {
    const x = clamp(t, 0, 1);
    const s = x * x * (3 - 2 * x);
    return 0.84 * x + 0.16 * s;
  }

  function smoothstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function motionAt(seconds) {
    const { phase, local } = phaseAt(seconds);
    const yaw0 = deg(state.yaw0);
    const pitch0 = deg(state.pitch);
    const travel = Math.PI * 2 * state.flipTurns - yaw0;
    const spin = phase.key === 'flip' ? inertialSpin(local) : 1;
    const flatten = phase.key === 'flip' ? smoothstep((local - 0.82) / 0.18) : 1;
    const after = phase.key === 'flip' ? 0 : (phase.key === 'hold' ? local * 0.28 : 0.28 + local * 2.5);
    const damp = Math.exp(-after * 1.35);
    const yaw = yaw0 + spin * travel + deg(2.2) * damp * Math.sin(after * 2.05);
    const pitch = pitch0 * (1 - flatten) + deg(0.8) * damp * Math.sin(after * 1.55);
    const elev = CAMERA_ELEV * (1 - flatten);
    const recolor = phase.key === 'recolor' ? local : 0;
    const scale = clamp(state.parallax / 72, 0.4, 1.35);
    let camU = 0;
    if (phase.key === 'flip') {
      camU = 0.78 * local;
    } else {
      camU = 0.78 + 0.22 * (1 - Math.exp(-2.95 * after));
    }
    camU = clamp(camU * scale, 0, 1);
    const driftY = Math.sin(seconds * 0.85) * 0.012;
    return { phase, local, spin, recolor, camU, yaw, pitch, elev, driftY };
  }

  function paintTint(target, filter) {
    target.width = source.width;
    target.height = source.height;
    const g = target.getContext('2d');
    g.clearRect(0, 0, target.width, target.height);
    g.filter = filter;
    g.drawImage(source, 0, 0);
    g.filter = 'none';
  }

  function bakeTints() {
    paintTint(faceSilver, 'grayscale(1) contrast(1.12) brightness(1.06)');
    paintTint(faceBlack, 'grayscale(1) brightness(0.22) contrast(1.2)');
    paintTint(faceBlue, 'grayscale(0.25) hue-rotate(200deg) saturate(1.35) brightness(0.72) contrast(1.05)');
  }

  function mixFaces(a, b, t) {
    const w = Math.max(a.width, b.width);
    const h = Math.max(a.height, b.height);
    if (tinted.width !== w || tinted.height !== h) {
      tinted.width = w;
      tinted.height = h;
    }
    const drawFit = (img, alpha) => {
      tintedCtx.globalAlpha = alpha;
      const s = Math.min(w / img.width, h / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      tintedCtx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };
    tintedCtx.clearRect(0, 0, w, h);
    drawFit(a, 1);
    drawFit(b, clamp(t, 0, 1));
    tintedCtx.globalAlpha = 1;
    return tinted;
  }

  function cardFace(recolor) {
    const p = recolor * clamp(state.recolorAmt / 100, 0, 1);
    const sheets = state.seqSheets.length ? [source, ...state.seqSheets] : null;
    if (sheets && sheets.length > 1) {
      if (p <= 0.001) return sheets[0];
      const n = sheets.length;
      const x = clamp(p, 0, 1) * (n - 1);
      const i = Math.min(n - 2, Math.floor(x));
      return mixFaces(sheets[i], sheets[i + 1], smoothstep(x - i));
    }
    if (p <= 0.02) return source;
    if (p < 0.16) return mixFaces(source, faceSilver, (p - 0.02) / 0.14);
    if (p < 0.38) return faceSilver;
    if (p < 0.5) return mixFaces(faceSilver, faceBlack, (p - 0.38) / 0.12);
    if (p < 0.7) return faceBlack;
    if (p < 0.82) return mixFaces(faceBlack, faceBlue, (p - 0.7) / 0.12);
    return faceBlue;
  }

  function roundRect(g, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
  }

  function drawFallbackCard(w, h) {
    source.width = w;
    source.height = h;
    const g = sourceCtx;
    g.clearRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.045;
    g.fillStyle = '#efe8dc';
    roundRect(g, 0, 0, w, h, r);
    g.fill();
    const m = Math.round(Math.min(w, h) * 0.055);
    const grd = g.createLinearGradient(0, m, 0, h - m);
    grd.addColorStop(0, '#1a2030');
    grd.addColorStop(0.55, '#2a1c28');
    grd.addColorStop(1, '#0c1018');
    g.fillStyle = grd;
    roundRect(g, m, m, w - m * 2, h - m * 2, r * 0.55);
    g.fill();
    g.fillStyle = 'rgba(230,220,200,0.22)';
    g.beginPath();
    g.arc(w * 0.62, h * 0.28, w * 0.08, 0, Math.PI * 2);
    g.fill();
  }

  function bakeCardOnto(target, img) {
    const max = 1400;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(1, max / Math.max(iw, ih));
    const pw = Math.max(2, Math.round(iw * scale));
    const ph = Math.max(2, Math.round(ih * scale));
    const border = Math.round(Math.min(pw, ph) * 0.07);
    const bottom = Math.round(border * 1.15);
    target.width = pw + border * 2;
    target.height = ph + border + bottom;
    const g = target.getContext('2d');
    g.clearRect(0, 0, target.width, target.height);
    const r = Math.min(target.width, target.height) * 0.04;
    g.fillStyle = '#f4efe7';
    roundRect(g, 0, 0, target.width, target.height, r);
    g.fill();
    g.save();
    roundRect(g, border, border, pw, ph, Math.max(2, r * 0.35));
    g.clip();
    g.drawImage(img, border, border, pw, ph);
    g.restore();
  }

  function drawPhotoCard(img) {
    bakeCardOnto(source, img);
  }

  function paintRounded(g, img, w, h) {
    const r = Math.min(w, h) * 0.04;
    g.save();
    roundRect(g, 0, 0, w, h, r);
    g.clip();
    g.drawImage(img, 0, 0, w, h);
    g.restore();
  }

  function bakeSides() {
    const w = source.width;
    const h = source.height;
    const r = Math.min(w, h) * 0.045;
    sourceBack.width = w;
    sourceBack.height = h;
    sourceBackCtx.clearRect(0, 0, w, h);
    sourceBackCtx.fillStyle = '#ece6dc';
    roundRect(sourceBackCtx, 0, 0, w, h, r);
    sourceBackCtx.fill();
    sourceBackCtx.fillStyle = '#ddd4c8';
    const inset = Math.max(8, w * 0.06);
    roundRect(sourceBackCtx, inset, inset, w - inset * 2, h - inset * 2, Math.max(2, r - 4));
    sourceBackCtx.fill();
    sourceBackCtx.fillStyle = 'rgba(90,70,55,0.12)';
    sourceBackCtx.beginPath();
    sourceBackCtx.arc(w / 2, h * 0.5, w * 0.09, 0, Math.PI * 2);
    sourceBackCtx.fill();
  }

  let sourceGen = 0;
  function ensureSource() {
    if (sourceGen && source.width) return;
    if (state.image) drawPhotoCard(state.image);
    else if (defaultCard.complete && defaultCard.naturalWidth) drawPhotoCard(defaultCard);
    else drawFallbackCard(720, 1080);
    bakeSides();
    bakeTints();
    sourceGen += 1;
  }

  function invalidateSource() {
    sourceGen = 0;
    source.width = 0;
  }

  function cardSize(viewW, viewH, faceCanvas) {
    ensureSource();
    const sheet = faceCanvas && faceCanvas.width ? faceCanvas : source;
    const boxH = viewH * (state.cardScale / 100);
    const boxW = viewW * 0.72;
    const aspect = sheet.width / Math.max(1, sheet.height);
    let h = boxH;
    let w = h * aspect;
    if (w > boxW) {
      w = boxW;
      h = w / aspect;
    }
    return { w, h };
  }

  function transformVertex(x, y, z, pitch, yaw, elev) {
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y1 = y * cp + z * sp;
    const z1 = -y * sp + z * cp;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x2 = x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    const ce = Math.cos(elev);
    const se = Math.sin(elev);
    return {
      x: x2,
      y: y1 * ce + z2 * se,
      z: -y1 * se + z2 * ce,
    };
  }

  function projectPoint(p, f, camZ, cx, cy) {
    const denom = camZ - p.z;
    const s = f / Math.max(40, denom);
    return { x: cx + p.x * s, y: cy - p.y * s, z: p.z, s };
  }

  function lerpP(a, b, t) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
  }

  function bilinear(tl, tr, br, bl, u, v) {
    return lerpP(lerpP(tl, tr, u), lerpP(bl, br, u), v);
  }

  function triArea(p0, p1, p2) {
    return (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
  }

  function drawTexturedTriangle(g, img, s0, s1, s2, p0, p1, p2) {
    const area = triArea(p0, p1, p2);
    if (area < 0.6) return;
    const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
    if (Math.abs(denom) < 0.01) return;
    const a = (p0.x * (s1.y - s2.y) + p1.x * (s2.y - s0.y) + p2.x * (s0.y - s1.y)) / denom;
    const c = (p0.x * (s2.x - s1.x) + p1.x * (s0.x - s2.x) + p2.x * (s1.x - s0.x)) / denom;
    const e = (p0.x * (s1.x * s2.y - s2.x * s1.y) + p1.x * (s2.x * s0.y - s0.x * s2.y) + p2.x * (s0.x * s1.y - s1.x * s0.y)) / denom;
    const b = (p0.y * (s1.y - s2.y) + p1.y * (s2.y - s0.y) + p2.y * (s0.y - s1.y)) / denom;
    const d = (p0.y * (s2.x - s1.x) + p1.y * (s0.x - s2.x) + p2.y * (s1.x - s0.x)) / denom;
    const f = (p0.y * (s1.x * s2.y - s2.x * s1.y) + p1.y * (s2.x * s0.y - s0.x * s2.y) + p2.y * (s0.x * s1.y - s1.x * s0.y)) / denom;
    const cx = (p0.x + p1.x + p2.x) / 3;
    const cy = (p0.y + p1.y + p2.y) / 3;
    const grow = p => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return { x: p.x + (dx / len) * 0.45, y: p.y + (dy / len) * 0.45 };
    };
    const q0 = grow(p0);
    const q1 = grow(p1);
    const q2 = grow(p2);
    g.save();
    g.beginPath();
    g.moveTo(q0.x, q0.y);
    g.lineTo(q1.x, q1.y);
    g.lineTo(q2.x, q2.y);
    g.closePath();
    g.clip();
    g.setTransform(a, b, c, d, e, f);
    g.drawImage(img, 0, 0);
    g.restore();
  }

  function drawTexturedQuad(g, img, tl, tr, br, bl, project, cols, rows) {
    const iw = img.width;
    const ih = img.height;
    for (let j = 0; j < rows; j += 1) {
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      for (let i = 0; i < cols; i += 1) {
        const u0 = i / cols;
        const u1 = (i + 1) / cols;
        const p00 = project(bilinear(tl, tr, br, bl, u0, v0));
        const p10 = project(bilinear(tl, tr, br, bl, u1, v0));
        const p11 = project(bilinear(tl, tr, br, bl, u1, v1));
        const p01 = project(bilinear(tl, tr, br, bl, u0, v1));
        if (triArea(p00, p10, p01) <= 0 && triArea(p10, p11, p01) <= 0) continue;
        const s00 = { x: u0 * iw, y: v0 * ih };
        const s10 = { x: u1 * iw, y: v0 * ih };
        const s11 = { x: u1 * iw, y: v1 * ih };
        const s01 = { x: u0 * iw, y: v1 * ih };
        drawTexturedTriangle(g, img, s00, s10, s01, p00, p10, p01);
        drawTexturedTriangle(g, img, s10, s11, s01, p10, p11, p01);
      }
    }
  }

  function fillProjectedQuad(g, pts, color) {
    if (pts.length < 3) return;
    if (triArea(pts[0], pts[1], pts[2]) <= 0) return;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fill();
  }

  function drawRoom(g, width, height, motion) {
    const bg = state.bgCustom && state.bgCustom.complete ? state.bgCustom : (defaultBg.complete ? defaultBg : null);
    g.fillStyle = state.background;
    g.fillRect(0, 0, width, height);
    if (!bg || !bg.naturalWidth) return;
    const s = (height / bg.naturalHeight) * 1.06;
    const dw = bg.naturalWidth * s;
    const dh = bg.naturalHeight * s;
    const dy = height - dh + height * 0.05;
    const maxShift = Math.max(0, dw - width);
    const dx = -clamp(motion.camU || 0, 0, 1) * maxShift;
    g.drawImage(bg, dx, dy, dw, dh);
    g.fillStyle = 'rgba(4,5,8,0.08)';
    g.fillRect(0, 0, width, height);
  }

  function drawCard(g, card, motion, cx, cy, width, faceImg) {
    const { w, h } = card;
    const pitch = motion.pitch;
    const yaw = motion.yaw;
    const elev = motion.elev || 0;
    const camZ = Math.max(width, 1100) * 0.92;
    const f = camZ * 0.84;
    const hw = w / 2;
    const hh = h / 2;
    const ht = 0.9;
    const xf = (x, y, z) => transformVertex(x, y, z, pitch, yaw, elev);
    const pr = p => projectPoint(p, f, camZ, cx, cy);
    const front = [xf(-hw, hh, ht), xf(hw, hh, ht), xf(hw, -hh, ht), xf(-hw, -hh, ht)];
    const back = [xf(hw, hh, -ht), xf(-hw, hh, -ht), xf(-hw, -hh, -ht), xf(hw, -hh, -ht)];
    const faces = [
      { z: xf(0, 0, ht).z, img: faceImg || cardFace(motion.recolor || 0), pts: front },
      { z: xf(0, 0, -ht).z, img: sourceBack, pts: back },
    ];
    faces.sort((a, b) => a.z - b.z);
    faces.forEach(face => {
      const area = triArea(pr(face.pts[0]), pr(face.pts[1]), pr(face.pts[3]));
      if (area < 1.2) return;
      drawTexturedQuad(g, face.img, face.pts[0], face.pts[1], face.pts[2], face.pts[3], pr, 5, 3);
    });
  }

  function renderFrame(target, seconds, width, height) {
    const g = target.getContext('2d');
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    g.imageSmoothingEnabled = true;
    const motion = motionAt(seconds);
    drawRoom(g, width, height, motion);
    const face = cardFace(motion.recolor || 0);
    const card = cardSize(width, height, face);
    const lift = (state.cardLift / 100) * height;
    drawCard(g, card, motion, width / 2, height / 2 - lift + (motion.driftY || 0) * card.h, width, face);
    if (state.captionOn && state.caption.trim()) {
      const font = Math.max(18, Math.round(width * 0.022));
      g.font = `600 ${font}px "Inter", "Noto Sans SC", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const text = state.caption.trim();
      const tw = g.measureText(text).width;
      const padX = font * 0.7;
      const x = width / 2;
      const y = height * 0.86;
      g.fillStyle = 'rgba(10,10,14,0.82)';
      roundRect(g, x - tw / 2 - padX, y - font * 0.85, tw + padX * 2, font * 1.7, font * 0.45);
      g.fill();
      g.fillStyle = '#f3f3f5';
      g.fillText(text, x, y);
    }
  }

  function fitStage() {
    const stage = document.querySelector('.stage-shell');
    const frame = $('designFrame');
    if (!stage || !frame) return;
    const rect = stage.getBoundingClientRect();
    const pad = 36;
    const maxW = Math.max(160, rect.width - pad * 2);
    const maxH = Math.max(160, rect.height - pad * 2);
    const scale = Math.min(maxW / state.canvas.width, maxH / state.canvas.height);
    const w = state.canvas.width * scale;
    const h = state.canvas.height * scale;
    frame.style.position = 'absolute';
    frame.style.left = `${(rect.width - w) / 2}px`;
    frame.style.top = `${(rect.height - h) / 2}px`;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  function draw() {
    fitStage();
    renderFrame(canvas, state.time, state.canvas.width, state.canvas.height);
  }

  function renderTimeline() {
    const bar = $('timeline');
    if (!bar) return;
    bar.replaceChildren();
    let start = 0;
    const speed = Math.max(0.25, state.speed);
    PHASES.forEach(phase => {
      const seconds = phase.seconds / speed;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gm-timeline-block me-choreo-block ${phase.className}`;
      button.dataset.seekMs = String(start * 1000);
      button.innerHTML = `<strong>${phase.label}</strong><small>${seconds.toFixed(2)}s</small>`;
      bar.append(button);
      start += seconds;
    });
    const total = cycleSeconds();
    $('scrubber').max = String(total * 1000);
    $('timeTotal').textContent = `${total.toFixed(2)}s`;
  }

  function syncScrubber() {
    const total = cycleSeconds();
    const now = ((state.time % total) + total) % total;
    $('scrubber').value = String(now * 1000);
    $('timeNow').textContent = `${now.toFixed(2)}s`;
  }

  function tick(now) {
    if (!state.last) state.last = now;
    const dt = Math.min(0.032, (now - state.last) / 1000);
    state.last = now;
    if (state.playing) state.time += dt;
    draw();
    syncScrubber();
    requestAnimationFrame(tick);
  }

  function readInputs() {
    state.background = $('backgroundColor').value;
    state.caption = $('caption').value;
    state.captionOn = $('captionEnabled').checked;
    state.flipTurns = Number($('flipTurns').value) / 100;
    state.pitch = Number($('pitch').value);
    state.yaw0 = Number($('yaw0').value);
    state.parallax = Number($('parallax').value);
    state.recolorAmt = Number($('recolorAmt').value);
    state.cardScale = Number($('cardScale').value);
    state.cardLift = Number($('cardLift').value);
    state.speed = Number($('speed').value) / 100;
    const preset = $('canvasPreset').value;
    if (preset === 'custom') {
      state.canvas.width = clamp(Number($('canvasWidth').value) || 1920, 320, 4096);
      state.canvas.height = clamp(Number($('canvasHeight').value) || 1080, 320, 4096);
    } else {
      const [w, h] = preset.split('x').map(Number);
      state.canvas.width = w;
      state.canvas.height = h;
    }
    $('customSize').hidden = preset !== 'custom';
    $('flipTurnsOut').textContent = state.flipTurns.toFixed(2);
    $('pitchOut').textContent = `${Math.round(state.pitch)}°`;
    $('yaw0Out').textContent = `${Math.round(state.yaw0)}°`;
    $('parallaxOut').textContent = String(state.parallax);
    $('recolorAmtOut').textContent = String(state.recolorAmt);
    $('cardScaleOut').textContent = String(state.cardScale);
    $('cardLiftOut').textContent = String(state.cardLift);
    $('speedOut').textContent = `${state.speed.toFixed(2)}×`;
    renderTimeline();
  }

  function serialize() {
    return {
      canvas: state.canvas,
      background: state.background,
      caption: state.caption,
      captionOn: state.captionOn,
      flipTurns: state.flipTurns,
      pitch: state.pitch,
      yaw0: state.yaw0,
      parallax: state.parallax,
      recolorAmt: state.recolorAmt,
      cardScale: state.cardScale,
      cardLift: state.cardLift,
      speed: state.speed,
    };
  }

  const DEFAULTS = {
    canvas: { width: 1920, height: 1080 },
    background: '#07080c',
    caption: "What's next?",
    captionOn: true,
    flipTurns: 1,
    pitch: 14,
    yaw0: 22,
    parallax: 72,
    recolorAmt: 100,
    cardScale: 80,
    cardLift: 0,
    speed: 1,
  };

  function apply(data) {
    if (!data) return;
    $('backgroundColor').value = data.background || DEFAULTS.background;
    $('caption').value = data.caption ?? DEFAULTS.caption;
    $('captionEnabled').checked = data.captionOn !== false;
    $('flipTurns').value = String(Math.round((data.flipTurns ?? DEFAULTS.flipTurns) * 100));
    $('pitch').value = String(data.pitch ?? DEFAULTS.pitch);
    $('yaw0').value = String(data.yaw0 ?? DEFAULTS.yaw0);
    $('parallax').value = String(data.parallax ?? DEFAULTS.parallax);
    $('recolorAmt').value = String(data.recolorAmt ?? DEFAULTS.recolorAmt);
    $('cardScale').value = String(data.cardScale ?? DEFAULTS.cardScale);
    $('cardLift').value = String(data.cardLift ?? DEFAULTS.cardLift);
    $('speed').value = String(Math.round((data.speed ?? DEFAULTS.speed) * 100));
    if (data.canvas) {
      $('canvasWidth').value = data.canvas.width;
      $('canvasHeight').value = data.canvas.height;
      const key = `${data.canvas.width}x${data.canvas.height}`;
      const found = [...$('canvasPreset').options].some(option => option.value === key);
      $('canvasPreset').value = found ? key : 'custom';
    }
    readInputs();
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportFrames(seconds, fps, onFrame) {
    const frames = Math.max(1, Math.round(seconds * fps));
    const off = document.createElement('canvas');
    for (let i = 0; i < frames; i += 1) {
      renderFrame(off, i / fps, state.canvas.width, state.canvas.height);
      await onFrame(off, i);
    }
  }

  function bind() {
    ['backgroundColor', 'caption', 'captionEnabled', 'flipTurns', 'pitch', 'yaw0', 'parallax', 'recolorAmt', 'cardScale', 'cardLift', 'speed', 'canvasPreset', 'canvasWidth', 'canvasHeight'].forEach(id => {
      $(id)?.addEventListener('input', readInputs);
      $(id)?.addEventListener('change', readInputs);
    });
    $('assetFile').addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.image = img;
        state.imageName = file.name;
        $('assetName').textContent = file.name;
        $('clearAsset').hidden = false;
        invalidateSource();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
    $('clearAsset').addEventListener('click', () => {
      state.image = null;
      $('assetName').textContent = '默认照片卡片';
      $('clearAsset').hidden = true;
      $('assetFile').value = '';
      invalidateSource();
    });
    $('seqFiles').addEventListener('change', e => {
      const files = [...(e.target.files || [])].slice(0, 3);
      if (!files.length) return;
      state.seqSheets = new Array(files.length);
      state.seqNames = files.map(file => file.name);
      let left = files.length;
      files.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const sheet = document.createElement('canvas');
          bakeCardOnto(sheet, img);
          state.seqSheets[index] = sheet;
          URL.revokeObjectURL(url);
          left -= 1;
          if (left <= 0) {
            state.seqSheets = state.seqSheets.filter(Boolean);
            $('seqName').textContent = state.seqNames.join('、');
            $('clearSeq').hidden = false;
          }
        };
        img.src = url;
      });
    });
    $('clearSeq').addEventListener('click', () => {
      state.seqSheets = [];
      state.seqNames = [];
      $('seqName').textContent = '未上传，默认走银/黑/蓝演示';
      $('clearSeq').hidden = true;
      $('seqFiles').value = '';
    });
    $('bgFile').addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.bgCustom = img;
        $('bgName').textContent = file.name;
        $('clearBg').hidden = false;
      };
      img.src = url;
    });
    $('clearBg').addEventListener('click', () => {
      state.bgCustom = null;
      $('bgName').textContent = '默认暗空间';
      $('clearBg').hidden = true;
      $('bgFile').value = '';
    });
    $('toggleInspector').addEventListener('click', () => {
      const hidden = document.body.classList.toggle('gm-inspector-hidden');
      $('toggleInspector').setAttribute('aria-pressed', String(hidden));
    });
    $('stageReplayButton').addEventListener('click', () => { state.time = 0; state.playing = true; });
    $('stagePauseButton').addEventListener('click', () => {
      state.playing = !state.playing;
      $('stagePauseButton').innerHTML = state.playing ? 'Ⅱ <span>暂停</span>' : '▶ <span>播放</span>';
      $('stagePauseButton').setAttribute('aria-pressed', String(!state.playing));
    });
    $('scrubber').addEventListener('input', () => {
      state.playing = false;
      state.time = Number($('scrubber').value) / 1000;
      $('stagePauseButton').innerHTML = '▶ <span>播放</span>';
    });
    $('timeline').addEventListener('click', e => {
      const block = e.target.closest('[data-seek-ms]');
      if (!block) return;
      state.time = Number(block.dataset.seekMs) / 1000;
    });
    $('saveScheme').addEventListener('click', () => {
      const json = JSON.stringify(serialize(), null, 2);
      try { localStorage.setItem(STORAGE_KEY, json); } catch (_) {}
      download('zerogflip-scheme.json', new Blob([json], { type: 'application/json' }));
      $('schemeStatus').textContent = '方案已保存并下载。';
    });
    $('importScheme').addEventListener('click', () => $('importSchemeFile').click());
    $('importSchemeFile').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      apply(JSON.parse(await file.text()));
      $('schemeStatus').textContent = '方案已导入。';
    });
    $('restoreScheme').addEventListener('click', () => {
      apply(DEFAULTS);
      $('schemeStatus').textContent = '已恢复默认。';
    });
    $('clearScheme').addEventListener('click', () => {
      $('caption').value = '';
      $('captionEnabled').checked = false;
      $('clearAsset').click();
      $('clearSeq')?.click();
      readInputs();
      $('schemeStatus').textContent = '已清空卡片与字幕。';
    });
    $('exportPng').addEventListener('click', () => {
      const off = document.createElement('canvas');
      renderFrame(off, state.time, state.canvas.width, state.canvas.height);
      off.toBlob(blob => download(`zerogflip-${state.canvas.width}x${state.canvas.height}.png`, blob), 'image/png');
      $('exportStatus').textContent = 'PNG 已生成。';
    });
    $('exportGif').addEventListener('click', async () => {
      if (!window.GIF) { $('exportStatus').textContent = 'GIF 组件未加载。'; return; }
      $('exportStatus').textContent = '正在导出 GIF…';
      const fps = Number($('exportFps').value);
      const seconds = $('exportDuration').value === 'full' ? cycleSeconds() : Number($('exportDuration').value);
      const gif = new window.GIF({ workers: 2, quality: 8, width: state.canvas.width, height: state.canvas.height, workerScript: 'js/continuation-gif.worker.js' });
      await exportFrames(seconds, fps, async frame => {
        const copy = document.createElement('canvas');
        copy.width = frame.width;
        copy.height = frame.height;
        copy.getContext('2d').drawImage(frame, 0, 0);
        gif.addFrame(copy, { delay: 1000 / fps, copy: true });
      });
      gif.on('finished', blob => {
        download(`zerogflip-${state.canvas.width}x${state.canvas.height}.gif`, blob);
        $('exportStatus').textContent = 'GIF 已生成。';
      });
      gif.render();
    });
    $('exportMp4').addEventListener('click', async () => {
      if (!window.HME?.createH264MP4Encoder) { $('exportStatus').textContent = 'MP4 组件未加载。'; return; }
      $('exportStatus').textContent = '正在导出 MP4…';
      const fps = Number($('exportFps').value);
      const seconds = $('exportDuration').value === 'full' ? cycleSeconds() : Number($('exportDuration').value);
      const encoder = await window.HME.createH264MP4Encoder();
      encoder.width = state.canvas.width;
      encoder.height = state.canvas.height;
      encoder.frameRate = fps;
      encoder.kbps = 8000;
      encoder.initialize();
      await exportFrames(seconds, fps, async frame => {
        encoder.addFrameRgba(frame.getContext('2d').getImageData(0, 0, frame.width, frame.height).data);
      });
      encoder.finalize();
      download(`zerogflip-${state.canvas.width}x${state.canvas.height}.mp4`, new Blob([encoder.FS.readFile(encoder.outputFilename)], { type: 'video/mp4' }));
      $('exportStatus').textContent = 'MP4 已生成。';
    });
    window.addEventListener('resize', fitStage);
    defaultBg.addEventListener('load', () => draw());
    defaultCard.addEventListener('load', () => { invalidateSource(); draw(); });
    try { apply(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); } catch (_) { readInputs(); }
    if (!localStorage.getItem(STORAGE_KEY)) readInputs();
  }

  bind();
  window.cellmotionZerogflip = {
    setTime(t) {
      state.time = t;
      state.playing = false;
      draw();
    },
    motionAt,
    getState() {
      return { ...serialize(), time: state.time, playing: state.playing };
    },
  };
  requestAnimationFrame(tick);
})();
