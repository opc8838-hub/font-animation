(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const E = window.ZeroGEngine;
  const qs = new URLSearchParams(location.search);
  const PREVIEW_ONLY = qs.has('preview');
  const STORAGE_KEY = 'cellmotion-zerogflip-v20';
  const BASE = 'assets/zerogflip/sanxingdui/';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = () => `z${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const BUILTINS = [
    { id: 'sxd-mask-flat', name: '青铜人头像 · 平顶', src: `${BASE}mask-flat.webp` },
    { id: 'sxd-mask-round', name: '青铜人头像 · 圆顶', src: `${BASE}mask-round.webp` },
    { id: 'sxd-vessel', name: '青铜器 · 兽耳', src: `${BASE}vessel.webp` },
    { id: 'sxd-tree', name: '青铜神树', src: `${BASE}tree.webp` },
    { id: 'sxd-bell', name: '青铜铃', src: `${BASE}bell.webp` },
  ];
  const EXPLODED_DEFAULT = { id: 'sxd-exploded', name: '人头像爆炸图', src: `${BASE}exploded.jpg` };
  const BG_DEFAULT = { id: 'sxd-hall', name: '三星堆展厅', src: `${BASE}hall.jpg` };
  const DEFAULT_CUTS = { wings: true, left: 0.215, right: 0.79, top: 0.155, bottom: 0.445, base: true, baseV: 0.585 };
  const GENERIC_CUTS = { wings: true, left: 0.2, right: 0.8, top: 0.15, bottom: 0.45, base: true, baseV: 0.62 };

  // 滑块 ↔ 参数：[id, 倍率, 显示格式]
  const sec = v => `${v.toFixed(2)}s`;
  const pct = v => `${Math.round(v * 100)}%`;
  const deg = v => `${Math.round(v)}°`;
  const MOTION = [
    ['spread', 100, v => `${v.toFixed(2)}×`], ['elevation', 1, deg], ['yaw', 1, deg], ['fovStart', 1, deg],
    ['explodeHold', 100, sec], ['converge', 100, sec],
    ['turns', 1, v => String(v)], ['spinSec', 100, sec], ['wobble', 100, pct], ['thickness', 100, pct],
    ['pan', 100, pct], ['blur', 100, v => String(Math.round(v * 100))], ['dim', 100, pct], ['rim', 100, pct],
    ['reflection', 100, pct], ['objSize', 100, pct], ['objY', 100, v => `${(v * 100).toFixed(1)}%`],
    ['firstHold', 100, sec], ['interval', 100, sec], ['accel', 100, pct], ['lastHold', 100, sec], ['titleHold', 100, sec],
  ];

  const DEFAULTS = {
    version: 20,
    canvas: { width: 1920, height: 1080 },
    title: '三星堆', subtitle: 'SANXINGDUI', titleFont: 'stg:noto-sc', textColor: '#f2f0ec', backgroundColor: '#000000', titleOn: true,
    main: 'sxd-mask-flat', exploded: 'sxd-exploded', background: 'sxd-hall',
    sequence: [
      { id: 'seq-round', ref: 'sxd-mask-round', scale: 1, x: 0, y: 0 },
      { id: 'seq-vessel', ref: 'sxd-vessel', scale: 1, x: 0, y: 0 },
      { id: 'seq-tree', ref: 'sxd-tree', scale: 1, x: 0, y: 0 },
      { id: 'seq-bell', ref: 'sxd-bell', scale: 1, x: 0, y: 0 },
    ],
    returnMain: true,
    cuts: { ...DEFAULT_CUTS },
    core: [4, 5],
    motion: {
      explodeOn: true, spread: 1, elevation: 22, yaw: -40, fovStart: 40, explodeHold: 0.30, converge: 0.85,
      turns: 1, spinSec: 1.47, wobble: 1, thickness: 0.62,
      pan: 1, panDir: 'ltr', blur: 0.42, dim: 0.48, rim: 1, reflection: 0.10, objSize: 0.60, objY: 0.475,
      firstHold: 0.97, interval: 0.5, accel: 0.84, lastHold: 0.40, titleHold: 1.35,
    },
    uploads: [],
  };

  const clone = v => JSON.parse(JSON.stringify(v));
  let state = clone(DEFAULTS);
  const ui = { time: 0, playing: true, last: 0, selectedLibraryId: '', activeItemId: '', dragId: '' };

  // ───────────── 素材解析与缓存 ─────────────
  const sourceOf = ref => {
    if (!ref) return null;
    const hit = BUILTINS.find(b => b.id === ref) || [EXPLODED_DEFAULT, BG_DEFAULT].find(b => b.id === ref) || state.uploads.find(u => u.id === ref);
    return hit ? { name: hit.name, src: hit.src || hit.dataUrl } : null;
  };
  const artCache = new Map();
  const explodedCache = new Map();
  const imageCache = new Map();
  const resolved = { main: null, mainRef: null, seq: new Map(), parts: null, bg: null, bgRef: null };

  function cached(map, key, make) {
    if (!map.has(key)) {
      const p = make();
      p.catch(() => map.delete(key));
      map.set(key, p);
    }
    return map.get(key);
  }
  function loadArt(ref, back) {
    const s = sourceOf(ref);
    return cached(artCache, `${ref}|${back ? 1 : 0}`, () => (s ? E.processArtifact(s.src, { back }) : Promise.reject(new Error('素材不存在'))));
  }
  function loadExploded(ref) {
    const s = sourceOf(ref);
    return cached(explodedCache, ref, () => (s ? E.processExploded(s.src) : Promise.reject(new Error('素材不存在'))));
  }
  function loadBackground(ref) {
    const s = sourceOf(ref);
    return cached(imageCache, ref, () => (s ? E.loadImage(s.src) : Promise.reject(new Error('素材不存在'))));
  }

  let loadToken = 0;
  let readyResolve = () => {};
  let ready = Promise.resolve();
  const busy = (on, text) => {
    $('zgBusy').hidden = !on;
    if (text) $('zgBusy').querySelector('span').textContent = text;
  };

  // 先处理主体（处理完立即开播），背景、爆炸图、切换素材在后台依次处理
  async function ensureAssets() {
    const token = ++loadToken;
    const fresh = () => token === loadToken;
    ready = new Promise(r => { readyResolve = r; });
    try {
      if (!resolved.main || resolved.mainRef !== state.main) {
        busy(true, '正在生成立体效果…');
        resolved.main = null;
        const art = await loadArt(state.main, true);
        if (!fresh()) return;
        resolved.main = art;
        resolved.mainRef = state.main;
        drawCutEditor();
      }
      busy(false);
      const bg = await loadBackground(state.background).catch(() => null);
      if (!fresh()) return;
      resolved.bg = bg;
      resolved.bgRef = state.background;
      if (state.exploded) {
        const ex = await loadExploded(state.exploded).catch(() => null);
        if (!fresh()) return;
        resolved.parts = ex ? ex.parts : null;
        if (ex && ui.suggestCore) { state.core = E.suggestCoreParts(ex.parts); ui.suggestCore = false; scheduleSave(); }
      } else {
        resolved.parts = null;
      }
      renderCoreParts();
      for (const item of state.sequence) {
        if (resolved.seq.get(item.id)?.ref === item.ref) continue;
        const art = await loadArt(item.ref, false).catch(() => null);
        if (!fresh()) return;
        if (art) resolved.seq.set(item.id, { ref: item.ref, art });
      }
      readyResolve();
    } catch (err) {
      busy(true, `素材处理失败：${err.message}`);
    }
  }

  // ───────────── 场景 ─────────────
  function titleFont() {
    const lib = window.STGFontLibrary;
    const p = lib?.preset(state.titleFont);
    return { family: lib ? lib.family(state.titleFont) : '"Noto Sans SC",sans-serif', weight: p?.weight || 500, style: p?.style || 'normal' };
  }
  function sequenceItems() {
    const items = state.sequence.map(it => ({ id: it.id, art: resolved.seq.get(it.id)?.art || null, scale: it.scale, x: it.x, y: it.y }));
    if (state.returnMain && items.length) items.push({ id: 'main-return', art: resolved.main, scale: 1, x: 0, y: 0 });
    return items;
  }
  const params = () => ({ ...state.motion, titleOn: state.titleOn });
  function scene() {
    const p = params();
    const sequence = sequenceItems();
    return {
      params: p,
      timeline: E.buildTimeline(p, sequence.length),
      main: resolved.main ? { art: resolved.main, scale: 1, x: 0, y: 0 } : null,
      sequence,
      cuts: state.cuts,
      core: resolved.parts ? state.core.map(i => resolved.parts[i]).filter(Boolean) : [],
      background: resolved.bg,
      backgroundId: resolved.bgRef,
      baseColor: state.backgroundColor,
      endColor: state.backgroundColor,
      textColor: state.textColor,
      title: state.title,
      subtitle: state.subtitle,
      titleFont: titleFont(),
    };
  }
  const timeline = () => E.buildTimeline(params(), sequenceItems().length);

  // ───────────── 预览 ─────────────
  const canvas = $('previewCanvas');
  const pctx = canvas.getContext('2d');
  const renderer = E.createRenderer();
  if (!renderer) busy(true, '当前浏览器不支持 WebGL2，请用最新版 Chrome / Edge / Safari 打开。');

  function fitStage() {
    const stage = document.querySelector('.stage-shell');
    const frame = $('designFrame');
    if (!stage || !frame) return;
    const rect = stage.getBoundingClientRect();
    const pad = 36;
    const maxW = Math.max(160, rect.width - pad * 2);
    const maxH = Math.max(160, rect.height - pad * 2);
    const { width, height } = state.canvas;
    const scale = Math.min(maxW / width, maxH / height);
    const w = width * scale, h = height * scale;
    frame.style.position = 'absolute';
    frame.style.left = `${(rect.width - w) / 2}px`;
    frame.style.top = `${(rect.height - h) / 2}px`;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    // 预览按显示尺寸渲染（几何全部按画布比例归一化，和导出一致）
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const k = Math.min(1, (w * dpr) / width);
    const pw = Math.max(2, Math.round(width * k)), ph = Math.max(2, Math.round(height * k));
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  }

  function draw() {
    if (!renderer || !resolved.main) return;
    const out = renderer.render(scene(), ui.time, { width: canvas.width, height: canvas.height, samples: 1 });
    pctx.drawImage(out, 0, 0);
  }

  function setPlaying(on) {
    ui.playing = on;
    $('stagePauseButton').innerHTML = on ? 'Ⅱ <span>暂停</span>' : '▶ <span>播放</span>';
    $('stagePauseButton').setAttribute('aria-pressed', String(!on));
  }
  function seek(t, pause = true) {
    ui.time = Math.max(0, t);
    if (pause) setPlaying(false);
    draw();
    syncScrubber();
  }

  function tick(now) {
    const dt = ui.last ? Math.min(0.05, (now - ui.last) / 1000) : 0;
    ui.last = now;
    const T = timeline();
    if (ui.playing && resolved.main) {
      ui.time += dt;
      if (ui.time > T.total + 0.6) ui.time = 0;
    }
    fitStage();
    draw();
    syncScrubber(T);
    requestAnimationFrame(tick);
  }

  // ───────────── 时间轴 ─────────────
  function phases() {
    const T = timeline();
    const list = [];
    const names = state.sequence.map(it => sourceOf(it.ref)?.name || '素材');
    if (state.returnMain && names.length) names.push('回到主体');
    if (state.motion.explodeOn) {
      list.push({ label: '爆炸拆开', cls: 'me-phase-lime', a: 0, b: T.explodeHold });
      list.push({ label: '合拢', cls: 'me-phase-mint', a: T.explodeHold, b: T.spinStart });
    }
    list.push({ label: '翻转', cls: 'me-phase-coral', a: T.spinStart, b: T.spinEnd });
    list.push({ label: '回正关灯', cls: 'me-phase-amber', a: T.spinEnd, b: T.switches[0] ?? T.endCard });
    T.switches.forEach((s, k) => list.push({ label: '切图', detail: names[k], cls: 'me-phase-sky', a: s, b: T.switches[k + 1] ?? T.endCard }));
    if (state.titleOn) list.push({ label: '片名', cls: 'me-phase-violet', a: T.endCard, b: T.total });
    return list.filter(p => p.b - p.a > 0.001);
  }

  // 方块位置、配色、阶段详情由共享时间轴外观（typecascade-polish.js）按 data-seek-ms 统一排布
  function renderTimeline() {
    const T = timeline();
    const bar = $('timeline');
    $('scrubber').max = String(Math.round(T.total * 1000));
    $('timeTotal').textContent = `${T.total.toFixed(2)}s`;
    bar.replaceChildren(...phases().map(p => {
      const block = document.createElement('button');
      block.type = 'button';
      block.className = `gm-timeline-block me-choreo-block ${p.cls}`;
      block.dataset.seekMs = String(Math.round(p.a * 1000));
      block.innerHTML = `<strong>${p.label}</strong><small>${p.detail ? `${p.detail} · ` : ''}${(p.b - p.a).toFixed(2)}s</small>`;
      return block;
    }));
  }

  function syncScrubber(T = timeline()) {
    const t = Math.min(ui.time, T.total);
    $('scrubber').value = String(Math.round(t * 1000));
    $('timeNow').textContent = `${t.toFixed(2)}s`;
  }

  // ───────────── 拆解切线编辑器 ─────────────
  const cutCanvas = $('cutEditor');
  const cctx = cutCanvas.getContext('2d');
  let cutThumb = null, cutThumbFor = null;
  function cutGeometry() {
    const art = resolved.main;
    if (!art) return null;
    const cw = cutCanvas.width, ch = cutCanvas.height;
    const s = Math.min((cw - 16) / art.w, (ch - 16) / art.h);
    const w = art.w * s, h = art.h * s;
    return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
  }
  function drawCutEditor() {
    const art = resolved.main;
    const cw = cutCanvas.width, ch = cutCanvas.height;
    cctx.clearRect(0, 0, cw, ch);
    if (!art) return;
    if (cutThumbFor !== art) {
      const c = document.createElement('canvas');
      c.width = art.w; c.height = art.h;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(art.color), art.w, art.h), 0, 0);
      cutThumb = c; cutThumbFor = art;
    }
    const G = cutGeometry();
    cctx.globalAlpha = state.motion.explodeOn ? 1 : 0.4;
    cctx.drawImage(cutThumb, G.x, G.y, G.w, G.h);
    cctx.globalAlpha = 1;
    const c = state.cuts;
    const X = u => G.x + u * G.w, Y = v => G.y + v * G.h;
    cctx.lineWidth = 2;
    if (c.wings) {
      cctx.strokeStyle = '#c9a7ff';
      cctx.setLineDash([5, 4]);
      cctx.beginPath();
      cctx.moveTo(G.x, Y(c.top)); cctx.lineTo(G.x + G.w, Y(c.top));
      cctx.moveTo(G.x, Y(c.bottom)); cctx.lineTo(G.x + G.w, Y(c.bottom));
      cctx.stroke();
      cctx.setLineDash([]);
      cctx.beginPath();
      cctx.moveTo(X(c.left), Y(c.top)); cctx.lineTo(X(c.left), Y(c.bottom));
      cctx.moveTo(X(c.right), Y(c.top)); cctx.lineTo(X(c.right), Y(c.bottom));
      cctx.stroke();
    }
    if (c.base) {
      cctx.strokeStyle = '#7fe3d2';
      cctx.beginPath();
      cctx.moveTo(G.x, Y(c.baseV)); cctx.lineTo(G.x + G.w, Y(c.baseV));
      cctx.stroke();
    }
    const handle = (x, y, color) => { cctx.fillStyle = color; cctx.beginPath(); cctx.arc(x, y, 5, 0, Math.PI * 2); cctx.fill(); };
    if (c.wings) {
      const mid = Y((c.top + c.bottom) / 2);
      handle(X(c.left), mid, '#c9a7ff'); handle(X(c.right), mid, '#c9a7ff');
      handle(G.x + G.w - 6, Y(c.top), '#c9a7ff'); handle(G.x + G.w - 6, Y(c.bottom), '#c9a7ff');
    }
    if (c.base) handle(G.x + 6, Y(c.baseV), '#7fe3d2');
  }
  let cutDrag = null;
  function cutPointer(e) {
    const r = cutCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * cutCanvas.width / r.width, y: (e.clientY - r.top) * cutCanvas.height / r.height };
  }
  const explodedFrame = () => Math.min(0.12, timeline().explodeHold);
  cutCanvas.addEventListener('pointerdown', e => {
    const G = cutGeometry();
    if (!G) return;
    const p = cutPointer(e), c = state.cuts;
    const X = u => G.x + u * G.w, Y = v => G.y + v * G.h;
    const cands = [];
    if (c.wings) {
      if (p.y > Y(c.top) - 8 && p.y < Y(c.bottom) + 8) cands.push(['left', Math.abs(p.x - X(c.left))], ['right', Math.abs(p.x - X(c.right))]);
      cands.push(['top', Math.abs(p.y - Y(c.top))], ['bottom', Math.abs(p.y - Y(c.bottom))]);
    }
    if (c.base) cands.push(['baseV', Math.abs(p.y - Y(c.baseV))]);
    cands.sort((a, b) => a[1] - b[1]);
    if (!cands.length || cands[0][1] > 12) return;
    cutDrag = cands[0][0];
    cutCanvas.setPointerCapture(e.pointerId);
    seek(explodedFrame());
  });
  cutCanvas.addEventListener('pointermove', e => {
    const G = cutGeometry();
    if (!cutDrag || !G) return;
    const p = cutPointer(e), c = state.cuts;
    const u = clamp((p.x - G.x) / G.w, 0, 1), v = clamp((p.y - G.y) / G.h, 0, 1);
    if (cutDrag === 'left') c.left = clamp(u, 0.02, Math.min(0.48, c.right - 0.04));
    if (cutDrag === 'right') c.right = clamp(u, Math.max(0.52, c.left + 0.04), 0.98);
    if (cutDrag === 'top') c.top = clamp(v, 0, c.bottom - 0.03);
    if (cutDrag === 'bottom') c.bottom = clamp(v, c.top + 0.03, 1);
    if (cutDrag === 'baseV') c.baseV = clamp(v, 0.3, 0.97);
    drawCutEditor();
    draw();
  });
  const endCutDrag = () => { if (cutDrag) { cutDrag = null; scheduleSave(); } };
  cutCanvas.addEventListener('pointerup', endCutDrag);
  cutCanvas.addEventListener('pointercancel', endCutDrag);

  // ───────────── 内部结构零件 ─────────────
  function renderCoreParts() {
    const box = $('coreParts');
    box.replaceChildren();
    const parts = resolved.parts;
    $('clearExploded').hidden = !state.exploded;
    const ex = sourceOf(state.exploded);
    $('explodedThumb').hidden = !ex;
    if (ex) $('explodedThumb').src = ex.src;
    if (!parts) {
      $('coreHint').textContent = state.exploded ? '正在切分爆炸图…' : '未使用爆炸图：开场只拆主体外壳。上传爆炸图可加入内部结构。';
      return;
    }
    $('coreHint').textContent = '系统按空白缝自动切出零件，点亮的零件会插在前后壳之间。';
    parts.forEach(part => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'zg-core-chip';
      b.setAttribute('aria-pressed', String(state.core.includes(part.index)));
      b.setAttribute('aria-label', `零件 ${part.index + 1}`);
      b.innerHTML = `<img src="${part.thumb}" alt="">`;
      b.addEventListener('click', () => {
        const on = state.core.includes(part.index);
        state.core = on ? state.core.filter(i => i !== part.index) : [...state.core, part.index].sort((a, c) => a - c);
        renderCoreParts();
        seek(explodedFrame());
        scheduleSave();
      });
      box.append(b);
    });
  }

  // ───────────── 素材库与收尾切换 ─────────────
  const libraryItems = () => [...BUILTINS, ...state.uploads.filter(u => u.role === 'object')];

  function renderLibrary() {
    const grid = $('zgLibrary');
    grid.replaceChildren();
    libraryItems().forEach(item => {
      const wrap = document.createElement('div');
      wrap.className = 'zg-lib-item';
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = `me-asset-choice${ui.selectedLibraryId === item.id ? ' is-selected' : ''}`;
      choice.innerHTML = `<img src="${item.src || item.dataUrl}" alt=""><span>${item.name}</span>`;
      choice.addEventListener('click', () => {
        ui.selectedLibraryId = item.id;
        $('librarySelectionName').textContent = `已选择：${item.name}`;
        renderLibrary();
      });
      const quick = document.createElement('button');
      quick.type = 'button';
      quick.className = 'zg-quick-insert';
      quick.textContent = '插入';
      quick.setAttribute('aria-label', `插入 ${item.name}`);
      quick.addEventListener('click', () => { ui.selectedLibraryId = item.id; addToSequence(item.id); renderLibrary(); });
      wrap.append(choice, quick);
      grid.append(wrap);
    });
    const mainSel = $('mainSelect');
    mainSel.replaceChildren();
    libraryItems().forEach(item => {
      const o = document.createElement('option');
      o.value = item.id; o.textContent = item.name;
      mainSel.append(o);
    });
    mainSel.value = state.main;
    const m = sourceOf(state.main);
    if (m) $('mainThumb').src = m.src;
    const bg = sourceOf(state.background);
    if (bg) $('bgThumb').src = bg.src;
    $('clearBg').hidden = state.background === BG_DEFAULT.id;
  }

  function addToSequence(ref) {
    const src = sourceOf(ref);
    if (!src) return;
    if (state.sequence.some(it => it.ref === ref)) {
      $('librarySelectionName').textContent = `已在切换序列中：${src.name}`;
      return;
    }
    state.sequence.push({ id: uid(), ref, scale: 1, x: 0, y: 0 });
    $('librarySelectionName').textContent = `已添加：${src.name}`;
    afterSequenceChange();
  }

  function afterSequenceChange() {
    renderSelectedAssets();
    renderTimeline();
    ensureAssets();
    scheduleSave();
  }

  function moveItem(id, dir) {
    const from = state.sequence.findIndex(it => it.id === id);
    const to = clamp(from + dir, 0, state.sequence.length - 1);
    if (from < 0 || from === to) return;
    const [m] = state.sequence.splice(from, 1);
    state.sequence.splice(to, 0, m);
    afterSequenceChange();
    $('zgLayerItems').querySelector(`[data-id="${id}"]`)?.focus();
  }

  function renderSelectedAssets() {
    const root = $('zgLayerItems');
    root.replaceChildren();
    $('selectedAssetCount').textContent = String(state.sequence.length);
    state.sequence.forEach((item, index) => {
      const s = sourceOf(item.ref);
      const row = document.createElement('article');
      row.className = 'me-layer-item';
      row.draggable = true;
      row.tabIndex = 0;
      row.dataset.id = item.id;
      row.setAttribute('aria-label', `${s?.name || '素材'}，第 ${index + 1} 个切换；Alt 加上下方向键调整顺序`);
      row.innerHTML = `<span class="me-layer-grip" aria-hidden="true">⋮⋮</span><img src="${s?.src || ''}" alt=""><span class="me-layer-name"><b>${s?.name || '素材'}</b><small>第 ${index + 1} 个切换 · ${Math.round(item.scale * 100)}%</small></span><button type="button" data-edit>单独编辑</button><button type="button" data-remove aria-label="删除">×</button>`;
      row.addEventListener('keydown', e => {
        if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        moveItem(item.id, e.key === 'ArrowUp' ? -1 : 1);
      });
      row.addEventListener('dragstart', () => { ui.dragId = item.id; });
      row.addEventListener('dragover', e => e.preventDefault());
      row.addEventListener('drop', e => {
        e.preventDefault();
        const from = state.sequence.findIndex(it => it.id === ui.dragId);
        const to = state.sequence.findIndex(it => it.id === item.id);
        if (from >= 0 && to >= 0 && from !== to) {
          const [m] = state.sequence.splice(from, 1);
          state.sequence.splice(to, 0, m);
          afterSequenceChange();
        }
      });
      row.querySelector('[data-edit]').addEventListener('click', () => openAsset(item.id));
      row.querySelector('[data-remove]').addEventListener('click', () => {
        state.sequence = state.sequence.filter(it => it.id !== item.id);
        resolved.seq.delete(item.id);
        if (ui.activeItemId === item.id) closeAsset();
        afterSequenceChange();
      });
      root.append(row);
    });
  }

  function setAssetManager(open) {
    $('zgLayerItems').hidden = !open;
    $('zgLayerPanel').classList.toggle('is-list-expanded', open);
    $('zgLayerToggle').textContent = open ? '收起已选' : '展开已选';
  }

  // 单独编辑：先停在这件素材的画面上再调
  function openAsset(id) {
    const item = state.sequence.find(it => it.id === id);
    if (!item) return;
    ui.activeItemId = id;
    const s = sourceOf(item.ref);
    $('assetEditorThumb').src = s?.src || '';
    $('assetEditorName').textContent = s?.name || '';
    $('assetScale').value = String(Math.round(item.scale * 100));
    $('assetX').value = String(Math.round(item.x * 100));
    $('assetY').value = String(Math.round(item.y * 100));
    updateAssetOutputs();
    $('zgAssetDrawer').hidden = false;
    const k = state.sequence.indexOf(item);
    const T = timeline();
    seek((T.switches[k] ?? T.spinEnd) + 0.05);
  }
  function closeAsset() {
    ui.activeItemId = '';
    $('zgAssetDrawer').hidden = true;
  }
  function updateAssetOutputs() {
    $('assetScaleOut').textContent = `${$('assetScale').value}%`;
    $('assetXOut').textContent = $('assetX').value;
    $('assetYOut').textContent = $('assetY').value;
  }
  [['assetScale', 'scale'], ['assetX', 'x'], ['assetY', 'y']].forEach(([id, key]) => {
    $(id).addEventListener('input', () => {
      const item = state.sequence.find(it => it.id === ui.activeItemId);
      if (!item) return;
      item[key] = Number($(id).value) / 100;
      updateAssetOutputs();
      renderSelectedAssets();
      draw();
      scheduleSave();
    });
  });

  // ───────────── 上传 ─────────────
  const readFile = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  async function addUpload(file, role) {
    const dataUrl = await readFile(file);
    const item = { id: uid(), name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || '上传图片', dataUrl, role };
    state.uploads.push(item);
    return item;
  }
  // 没被用到的爆炸图 / 背景上传不进方案；上传的文物留在素材库里
  function pruneUploads() {
    const used = new Set([state.main, state.exploded, state.background, ...state.sequence.map(it => it.ref)]);
    state.uploads = state.uploads.filter(u => used.has(u.id) || u.role === 'object');
  }

  // ───────────── 控件 ─────────────
  function writeInputs() {
    const { width: w, height: h } = state.canvas;
    const key = `${w}x${h}`;
    const preset = $('canvasPreset');
    preset.value = [...preset.options].some(o => o.value === key) ? key : 'custom';
    $('canvasWidth').value = w; $('canvasHeight').value = h;
    $('customSize').hidden = preset.value !== 'custom';
    $('title').value = state.title;
    $('subtitle').value = state.subtitle;
    $('titleFont').value = state.titleFont;
    $('textColor').value = state.textColor;
    $('backgroundColor').value = state.backgroundColor;
    $('titleOn').checked = state.titleOn;
    $('returnMain').checked = state.returnMain;
    $('explodeOn').checked = state.motion.explodeOn;
    $('cutWings').checked = state.cuts.wings;
    $('cutBase').checked = state.cuts.base;
    $('panDir').value = state.motion.panDir;
    MOTION.forEach(([id, k]) => { $(id).value = String(state.motion[id] * k); });
    updateOutputs();
  }
  function updateOutputs() {
    MOTION.forEach(([id, , fmt]) => { const o = $(`${id}Out`); if (o) o.textContent = fmt(state.motion[id]); });
  }
  function readInputs(e) {
    const preset = $('canvasPreset').value;
    if (preset === 'custom') {
      state.canvas = { width: clamp(Number($('canvasWidth').value) || 1920, 320, 4096), height: clamp(Number($('canvasHeight').value) || 1080, 320, 4096) };
    } else {
      const [w, h] = preset.split('x').map(Number);
      state.canvas = { width: w, height: h };
    }
    $('customSize').hidden = preset !== 'custom';
    state.title = $('title').value;
    state.subtitle = $('subtitle').value;
    state.titleFont = $('titleFont').value;
    state.textColor = $('textColor').value;
    state.backgroundColor = $('backgroundColor').value;
    state.titleOn = $('titleOn').checked;
    state.returnMain = $('returnMain').checked;
    state.motion.explodeOn = $('explodeOn').checked;
    state.cuts.wings = $('cutWings').checked;
    state.cuts.base = $('cutBase').checked;
    state.motion.panDir = $('panDir').value;
    MOTION.forEach(([id, k]) => { state.motion[id] = Number($(id).value) / k; });
    updateOutputs();
    renderTimeline();
    drawCutEditor();
    // 改哪段就停到哪段看效果
    const id = e?.target?.id;
    const T = timeline();
    const end = T.endCard + 0.6;
    const jump = {
      spread: 0.1, elevation: 0.1, yaw: 0.1, fovStart: 0.1, explodeHold: 0, converge: T.explodeHold, cutWings: 0.1, cutBase: 0.1, explodeOn: 0,
      turns: T.spinStart, spinSec: T.spinStart, wobble: T.spinEnd - 0.1, thickness: T.spinStart + 0.35,
      pan: 0, panDir: 0, blur: T.spinStart, dim: T.dimEnd, rim: T.spinStart + 0.3, reflection: T.dimEnd, objSize: T.dimEnd, objY: T.dimEnd,
      firstHold: T.spinEnd, interval: T.switches[0] ?? T.spinEnd, accel: T.switches[0] ?? T.spinEnd, lastHold: T.switches.at(-1) ?? T.spinEnd,
      title: end, subtitle: end, titleFont: end, textColor: end, titleHold: end, titleOn: T.endCard - 0.2,
    }[id];
    if (jump !== undefined && (e.type === 'input' || !ui.playing)) seek(jump);
    if (id === 'returnMain') ensureAssets();
    scheduleSave();
  }

  // ───────────── 方案 ─────────────
  function serialize(withUploads = true) {
    pruneUploads();
    const s = clone(state);
    if (!withUploads) s.uploads = s.uploads.map(u => ({ ...u, dataUrl: '' }));
    return s;
  }
  let saveTimer = 0;
  function scheduleSave() {
    if (PREVIEW_ONLY) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(true)));
      } catch (_) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(false)));
          $('schemeStatus').textContent = '上传的图片较大，自动保存只记住参数；请用「保存方案」下载完整文件。';
        } catch (__) { /* 存储不可用时不保存 */ }
      }
    }, 400);
  }
  function normalize(data) {
    const d = data && typeof data === 'object' ? data : {};
    const s = { ...clone(DEFAULTS), ...clone(d) };
    s.motion = { ...DEFAULTS.motion, ...(d.motion || {}) };
    s.cuts = { ...DEFAULTS.cuts, ...(d.cuts || {}) };
    s.canvas = { ...DEFAULTS.canvas, ...(d.canvas || {}) };
    s.uploads = (Array.isArray(s.uploads) ? s.uploads : []).filter(u => u && u.id && u.dataUrl);
    const exists = ref => !!(BUILTINS.find(b => b.id === ref) || s.uploads.find(u => u.id === ref));
    if (!exists(s.main)) s.main = DEFAULTS.main;
    if (s.exploded && s.exploded !== EXPLODED_DEFAULT.id && !s.uploads.find(u => u.id === s.exploded)) s.exploded = null;
    if (s.background !== BG_DEFAULT.id && !s.uploads.find(u => u.id === s.background)) s.background = BG_DEFAULT.id;
    s.sequence = (Array.isArray(s.sequence) ? s.sequence : []).filter(it => it && exists(it.ref))
      .map(it => ({ id: it.id || uid(), ref: it.ref, scale: Number(it.scale) || 1, x: Number(it.x) || 0, y: Number(it.y) || 0 }));
    s.core = Array.isArray(s.core) ? s.core.filter(Number.isInteger) : [];
    return s;
  }
  function apply(data, status) {
    state = normalize(data);
    resolved.seq.clear();
    resolved.mainRef = null;
    resolved.parts = null;
    closeAsset();
    writeInputs();
    renderLibrary();
    renderSelectedAssets();
    renderTimeline();
    renderCoreParts();
    ensureAssets();
    ui.time = 0;
    setPlaying(true);
    if (status) $('schemeStatus').textContent = status;
    scheduleSave();
  }
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ───────────── 导出 ─────────────
  let exportRenderer = null;
  async function prepareExport() {
    await ready;
    const f = titleFont();
    try { await document.fonts.load(`${f.weight} 48px ${f.family}`, `${state.title}${state.subtitle}`); } catch (_) { /* 字体按回退显示 */ }
    if (!exportRenderer) exportRenderer = E.createRenderer();
    return exportRenderer;
  }
  const exportSize = () => ({ width: state.canvas.width, height: state.canvas.height });
  const exportSeconds = () => ($('exportDuration').value === 'full' ? timeline().total : Number($('exportDuration').value));
  const progress = (v, text) => {
    $('exportProgress').hidden = v == null;
    if (v != null) $('exportProgress').value = v;
    if (text) $('exportStatus').textContent = text;
  };
  const yieldUI = () => new Promise(r => setTimeout(r, 0));
  let exporting = false;
  async function withExport(fn) {
    if (exporting) return;
    exporting = true;
    ['exportPng', 'exportGif', 'exportMp4'].forEach(id => { $(id).disabled = true; });
    try { await fn(); } catch (err) { progress(null, `导出失败：${err.message || err}`); } finally {
      exporting = false;
      ['exportPng', 'exportGif', 'exportMp4'].forEach(id => { $(id).disabled = false; });
    }
  }

  // ───────────── 绑定 ─────────────
  function bind() {
    ['canvasPreset', 'canvasWidth', 'canvasHeight', 'title', 'subtitle', 'titleFont', 'textColor', 'backgroundColor', 'titleOn', 'returnMain', 'explodeOn', 'cutWings', 'cutBase', 'panDir', ...MOTION.map(m => m[0])]
      .forEach(id => { $(id).addEventListener('input', readInputs); $(id).addEventListener('change', readInputs); });

    $('mainSelect').addEventListener('change', () => {
      state.main = $('mainSelect').value;
      state.cuts = { ...(state.main === DEFAULTS.main ? DEFAULT_CUTS : GENERIC_CUTS) };
      writeInputs(); renderLibrary(); ensureAssets(); ui.time = 0; setPlaying(true); scheduleSave();
    });
    $('mainFile').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const item = await addUpload(file, 'object');
      state.main = item.id;
      state.cuts = { ...GENERIC_CUTS };
      writeInputs(); renderLibrary(); ensureAssets(); ui.time = 0; setPlaying(true); scheduleSave();
    });
    $('explodedFile').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const item = await addUpload(file, 'exploded');
      state.exploded = item.id;
      state.motion.explodeOn = true;
      ui.suggestCore = true;
      resolved.parts = null;
      writeInputs(); renderCoreParts(); ensureAssets(); seek(explodedFrame()); scheduleSave();
    });
    $('clearExploded').addEventListener('click', () => {
      state.exploded = null; state.core = []; resolved.parts = null;
      renderCoreParts(); ensureAssets(); seek(explodedFrame()); scheduleSave();
    });
    $('bgFile').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const item = await addUpload(file, 'background');
      state.background = item.id;
      renderLibrary(); ensureAssets(); scheduleSave();
    });
    $('clearBg').addEventListener('click', () => { state.background = BG_DEFAULT.id; renderLibrary(); ensureAssets(); scheduleSave(); });

    $('zgLayerToggle').addEventListener('click', () => setAssetManager($('zgLayerItems').hidden));
    $('addSelectedAsset').addEventListener('click', () => {
      if (!ui.selectedLibraryId) { $('librarySelectionName').textContent = '先在素材库里选一件'; return; }
      addToSequence(ui.selectedLibraryId);
    });
    $('assetUpload').addEventListener('change', async e => {
      const files = [...(e.target.files || [])];
      e.target.value = '';
      for (const file of files) {
        const item = await addUpload(file, 'object');
        state.sequence.push({ id: uid(), ref: item.id, scale: 1, x: 0, y: 0 });
      }
      renderLibrary();
      afterSequenceChange();
    });
    $('closeAssetDrawer').addEventListener('click', closeAsset);
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('zgAssetDrawer').hidden) closeAsset();
      else if (!$('zgLayerItems').hidden) setAssetManager(false);
    });

    $('toggleInspector').addEventListener('click', () => {
      const hidden = document.body.classList.toggle('gm-inspector-hidden');
      $('toggleInspector').setAttribute('aria-pressed', String(hidden));
    });
    $('stageReplayButton').addEventListener('click', () => { ui.time = 0; setPlaying(true); });
    $('stagePauseButton').addEventListener('click', () => setPlaying(!ui.playing));
    $('scrubber').addEventListener('input', () => seek(Number($('scrubber').value) / 1000));
    const seekFrom = e => {
      const el = e.target.closest('[data-seek-ms]');
      if (el) seek(Number(el.dataset.seekMs) / 1000 + 0.001, false);
    };
    $('timeline').addEventListener('click', seekFrom);

    $('saveScheme').addEventListener('click', () => {
      const json = JSON.stringify(serialize(true), null, 2);
      try { localStorage.setItem(STORAGE_KEY, json); } catch (_) { /* 下载的文件仍然完整 */ }
      download('zerogflip-scheme.json', new Blob([json], { type: 'application/json' }));
      $('schemeStatus').textContent = '方案已保存并下载（含上传的图片）。';
    });
    $('importScheme').addEventListener('click', () => $('importSchemeFile').click());
    $('importSchemeFile').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try { apply(JSON.parse(await file.text()), '方案已导入。'); } catch (_) { $('schemeStatus').textContent = '文件不是有效的方案。'; }
    });
    $('restoreScheme').addEventListener('click', () => apply(DEFAULTS, '已恢复默认三星堆方案。'));
    $('clearScheme').addEventListener('click', () => {
      apply({ ...clone(DEFAULTS), title: '', subtitle: '', titleOn: false, sequence: [], exploded: null, core: [], uploads: [] }, '已清空：只保留主体翻转，可重新添加素材。');
    });

    $('exportPng').addEventListener('click', () => withExport(async () => {
      const R = await prepareExport();
      const { width, height } = exportSize();
      const out = R.render(scene(), ui.time, { width, height, samples: 5 });
      await new Promise(res => out.toBlob(blob => { download(`zerogflip-${width}x${height}.png`, blob); res(); }, 'image/png'));
      progress(null, 'PNG 已生成。');
    }));
    $('exportGif').addEventListener('click', () => withExport(async () => {
      if (!window.GIF) throw new Error('GIF 组件未加载');
      const R = await prepareExport();
      const { width, height } = exportSize();
      const fps = Math.min(30, Number($('exportFps').value));
      const n = Math.max(1, Math.round(exportSeconds() * fps));
      const gif = new window.GIF({ workers: 2, quality: 8, width, height, workerScript: 'js/continuation-gif.worker.js' });
      const sc = scene();
      for (let i = 0; i < n; i++) {
        const out = R.render(sc, i / fps, { width, height, samples: 5 });
        const copy = document.createElement('canvas');
        copy.width = width; copy.height = height;
        copy.getContext('2d').drawImage(out, 0, 0);
        gif.addFrame(copy, { delay: 1000 / fps, copy: true });
        progress((i + 1) / n * 0.6, `正在渲染 GIF 帧 ${i + 1}/${n}…`);
        await yieldUI();
      }
      await new Promise(res => {
        gif.on('progress', v => progress(0.6 + v * 0.4, '正在编码 GIF…'));
        gif.on('finished', blob => { download(`zerogflip-${width}x${height}.gif`, blob); res(); });
        gif.render();
      });
      progress(null, 'GIF 已生成。');
    }));
    $('exportMp4').addEventListener('click', () => withExport(async () => {
      if (!window.HME?.createH264MP4Encoder) throw new Error('MP4 组件未加载');
      const R = await prepareExport();
      let { width, height } = exportSize();
      width -= width % 2; height -= height % 2;
      const fps = Number($('exportFps').value);
      const n = Math.max(1, Math.round(exportSeconds() * fps));
      const encoder = await window.HME.createH264MP4Encoder();
      encoder.width = width; encoder.height = height; encoder.frameRate = fps;
      encoder.kbps = Math.round(width * height / 1000 * 6);
      encoder.initialize();
      const sc = scene();
      const copy = document.createElement('canvas');
      copy.width = width; copy.height = height;
      const cg = copy.getContext('2d', { willReadFrequently: true });
      for (let i = 0; i < n; i++) {
        const out = R.render(sc, i / fps, { width, height, samples: 5 });
        cg.drawImage(out, 0, 0);
        encoder.addFrameRgba(cg.getImageData(0, 0, width, height).data);
        progress((i + 1) / n, `正在渲染 MP4 帧 ${i + 1}/${n}…`);
        await yieldUI();
      }
      encoder.finalize();
      download(`zerogflip-${width}x${height}.mp4`, new Blob([encoder.FS.readFile(encoder.outputFilename)], { type: 'video/mp4' }));
      encoder.delete?.();
      progress(null, 'MP4 已生成。');
    }));

    window.addEventListener('resize', fitStage);
  }

  // ───────────── 启动 ─────────────
  bind();
  let initial = DEFAULTS;
  if (!PREVIEW_ONLY) {
    try { initial = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || DEFAULTS; } catch (_) { initial = DEFAULTS; }
  }
  state = normalize(initial);
  writeInputs();
  renderLibrary();
  renderSelectedAssets();
  renderTimeline();
  renderCoreParts();
  ensureAssets();
  requestAnimationFrame(tick);

  window.cellmotionZerogflip = {
    get ready() { return ready; },
    setTime(t) { seek(t); },
    getState() { return { ...serialize(false), time: ui.time, playing: ui.playing }; },
    timeline,
    async renderFrame(t, samples = 5) {
      const R = await prepareExport();
      const { width, height } = exportSize();
      return R.render(scene(), t, { width, height, samples }).toDataURL('image/jpeg', 0.92);
    },
  };
})();
