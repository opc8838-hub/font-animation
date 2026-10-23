(() => {
  'use strict';
  const Core = window.GlassRevealCore;
  const Library = window.STGIconLibrary;
  const Animated = window.CellMotionAnimatedImage;
  const Fonts = window.STGFontLibrary;
  const $ = id => document.getElementById(id);
  const STORE = 'cellmotion:glass-icon-reveal:v1';
  const DEFAULT = { P: { ...Core.LOOKS.light }, width: 1080, height: 1080, customSize: false, speed: 1, loop: true, font: 'stg:inter', assetId: '', assetUrl: '', assetType: '' };
  const SIZE_OPTIONS = ['1080x1080', '1080x1350', '1080x1440', '1080x1620', '1080x1920', '1920x1080', '1440x1080', '1620x1080'];
  const PHASES = [
    { zh: '水滴凝结', en: 'Droplet', color: '#8ec8ff' },
    { zh: '玻璃铺展', en: 'Glass spread', color: '#d4b8ff' },
    { zh: '标志显现', en: 'Logo reveal', color: '#d7ff2f' },
    { zh: '循环停留', en: 'Loop hold', color: '#ffd27d' }
  ];
  let state = restoreLocal();
  const history = [JSON.stringify(state)];
  let historyIndex = 0, lastHistoryAt = 0, lastHistoryKind = '';
  let lang = localStorage.getItem('cellmotion-site-language') === 'en' ? 'en' : 'zh';
  let theme = (localStorage.getItem('cellmotion-site-theme') || localStorage.getItem('cellmotion-editor-theme')) === 'light' ? 'light' : 'dark';
  let time = 0, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, last = performance.now();
  let logoData = null, animatedResource = null, dynamicAsset = null, logoVersion = 0, busy = false;
  const dynamicCache = new Map();
  const preview = $('view');
  let renderer;
  try { renderer = Core.createRenderer(preview, { preserve: true }); } catch (error) { console.error(error); }
  if (!renderer) { $('renderError').hidden = false; $('renderError').textContent = 'WebGL 2 is required for this glass effect.'; }

  function restoreLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved?.version === 1) return readScheme(saved);
    } catch (_) { /* private browsing may disable storage */ }
    return structuredClone(DEFAULT);
  }
  function readScheme(raw) {
    if (raw.type && raw.type !== 'cellmotion-glass-icon-reveal') throw new Error('Wrong project type');
    if (raw.version !== 1 || !raw.P || typeof raw.P !== 'object') throw new Error('Unsupported project');
    const P = { ...Core.LOOKS.light };
    Object.keys(P).forEach(key => {
      const value = raw.P[key];
      if (typeof value === typeof P[key]) P[key] = value;
    });
    const dimension = (v, fallback) => Number.isFinite(v) ? Math.max(128, Math.min(3840, Math.round(v / 2) * 2)) : fallback;
    return { P, width: dimension(raw.width, 1080), height: dimension(raw.height, 1080), customSize: raw.customSize === true, speed: Number.isFinite(raw.speed) ? Math.max(.25, Math.min(2, raw.speed)) : 1, loop: raw.loop !== false, font: typeof raw.font === 'string' ? raw.font : 'stg:inter', assetId: typeof raw.assetId === 'string' ? raw.assetId : '', assetUrl: typeof raw.assetUrl === 'string' ? raw.assetUrl : '', assetType: typeof raw.assetType === 'string' ? raw.assetType : '' };
  }
  function persist(record = true) {
    if (record) {
      const snapshot = JSON.stringify(state);
      if (snapshot !== history[historyIndex]) {
        const now = performance.now();
        history.splice(historyIndex + 1);
        const kind = ['range', 'color'].includes(document.activeElement?.type) ? document.activeElement.id : '';
        if (historyIndex > 0 && kind && kind === lastHistoryKind && now - lastHistoryAt < 300) history[historyIndex] = snapshot;
        else { history.push(snapshot); historyIndex++; }
        if (history.length > 30) { history.shift(); historyIndex--; }
        lastHistoryAt = now; lastHistoryKind = kind;
      }
      syncHistoryButtons();
    }
    try { localStorage.setItem(STORE, JSON.stringify({ type: 'cellmotion-glass-icon-reveal', version: 1, ...state })); }
    catch (_) { $('schemeStatus').textContent = label('浏览器存储空间不足，请保存方案文件。', 'Browser storage is full. Save the project file.'); }
  }
  function syncHistoryButtons() { $('undoButton').disabled = historyIndex === 0; $('redoButton').disabled = historyIndex >= history.length - 1; }
  async function stepHistory(direction) {
    const next = historyIndex + direction;
    if (next < 0 || next >= history.length) return;
    historyIndex = next; state = JSON.parse(history[next]);
    playing = false; time = 0; syncControls(); syncHistoryButtons(); persist(false); await refreshLogo(); updatePlayButton();
  }
  $('undoButton').onclick = () => stepHistory(-1);
  $('redoButton').onclick = () => stepHistory(1);
  function label(zh, en) { return lang === 'en' ? en : zh; }
  function localize() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.documentElement.dataset.siteLanguage = lang;
    document.documentElement.dataset.siteTheme = theme;
    document.querySelectorAll('[data-zh][data-en]').forEach(node => { node.textContent = node.dataset[lang]; });
    $('languageButton').textContent = lang === 'en' ? '中' : 'EN';
    $('themeButton').textContent = theme === 'dark' ? '☀' : '☾';
    $('undoButton').title = label('撤销', 'Undo'); $('undoButton').setAttribute('aria-label', $('undoButton').title);
    $('redoButton').title = label('重做', 'Redo'); $('redoButton').setAttribute('aria-label', $('redoButton').title);
    document.body.dataset.editorTheme = theme;
    updatePlayButton(); buildTimeline(); updateExportInfo();
  }
  $('languageButton').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; localStorage.setItem('cellmotion-site-language', lang); localize(); };
  $('themeButton').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('cellmotion-site-theme', theme); localStorage.setItem('cellmotion-editor-theme', theme); localize(); };
  document.querySelectorAll('.tc-tabs button').forEach(button => button.onclick = () => setPanel(button.dataset.panel));
  $('openExport').onclick = () => setPanel('export');
  function setPanel(name) {
    document.querySelectorAll('.tc-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === name)));
    document.querySelectorAll('.tc-properties').forEach(panel => panel.hidden = panel.dataset.panel !== name);
  }
  function setSource(name) {
    document.querySelectorAll('.source-tabs button').forEach(button => button.setAttribute('aria-selected', String(button.dataset.source === name)));
    document.querySelectorAll('.source-panel').forEach(panel => panel.hidden = panel.id !== name + 'Panel');
  }
  document.querySelectorAll('.source-tabs button').forEach(button => button.onclick = () => setSource(button.dataset.source));

  const valueKeys = ['tileSize', 'logoScale', 'finalScale', 'response', 'bounce', 'startSize', 'opticalDepth', 'dispersion', 'glow', 'specular', 'shadow', 'present', 'hold'];
  const colorKeys = ['background', 'logoColor', 'plateColor'];
  const boolKeys = ['originalColors', 'iconPlate'];
  function syncControls() {
    valueKeys.forEach(key => {
      const input = $(key); input.value = state.P[key];
      input.nextElementSibling.textContent = key === 'tileSize' ? `${state.P[key]} px` : ['response','present','hold'].includes(key) ? `${Number(state.P[key]).toFixed(2)} s` : Number(state.P[key]).toFixed(2);
    });
    colorKeys.forEach(key => { $(key).value = state.P[key]; });
    boolKeys.forEach(key => { $(key).checked = state.P[key]; });
    $('plateColorField').hidden = !state.P.iconPlate;
    $('logoColor').disabled = state.P.originalColors;
    $('textField').hidden = state.P.logo !== 'text';
    $('fontField').hidden = state.P.logo !== 'text';
    $('logoText').value = state.P.text;
    $('logoFont').value = state.font;
    $('speed').value = state.speed; $('speed').nextElementSibling.textContent = `${state.speed.toFixed(2)}×`;
    $('loop').checked = state.loop;
    document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === state.P.logo)));
    $('canvasPreset').value = !state.customSize && SIZE_OPTIONS.includes(`${state.width}x${state.height}`) ? `${state.width}x${state.height}` : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom';
    $('canvasWidth').value = state.width; $('canvasHeight').value = state.height;
    $('canvasInfo').textContent = `${state.width} × ${state.height}`;
    $('scrubber').max = String(cycle());
    buildTimeline(); fitStage(); updateExportInfo();
  }
  valueKeys.forEach(key => $(key).addEventListener('input', () => {
    state.P[key] = Number($(key).value); syncControls(); persist(); drawPreview();
  }));
  colorKeys.forEach(key => $(key).addEventListener('input', () => { state.P[key] = $(key).value; syncControls(); persist(); drawPreview(); }));
  boolKeys.forEach(key => $(key).addEventListener('change', () => { state.P[key] = $(key).checked; syncControls(); persist(); drawPreview(); }));
  $('speed').oninput = () => { state.speed = Number($('speed').value); syncControls(); persist(); };
  $('loop').onchange = () => { state.loop = $('loop').checked; persist(); };
  $('logoText').oninput = () => { state.P.text = $('logoText').value; persist(); queueLogo(); };
  $('logoFont').onchange = () => { state.font = $('logoFont').value; persist(); queueLogo(); };
  let logoTimer;
  function queueLogo() { clearTimeout(logoTimer); logoTimer = setTimeout(refreshLogo, 150); }
  document.querySelectorAll('[data-preset]').forEach(button => button.onclick = async () => {
    state.P.logo = button.dataset.preset; state.P.originalColors = state.P.logo === 'pinwheel';
    state.assetId = ''; state.assetUrl = ''; state.assetType = '';
    syncControls(); persist(); await refreshLogo(); replay();
  });

  let selectedAsset = null;
  function buildLibrary() {
    const groups = [
      ['flow', '图形 / Flow', Library.groups.flow],
      ['gifMotion', 'GIF 动图 / Motion', Library.groups.gifMotion],
      ['animals', '透明动物 / Animals', Library.groups.animals],
      ['bots', 'Bot / Bots', Library.groups.bots]
    ];
    const root = $('assetLibrary'); root.replaceChildren();
    for (const [, title, assets] of groups) {
      const section = document.createElement('section'); section.className = 'library-group';
      const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
      const grid = document.createElement('div'); grid.className = 'library-grid';
      assets.forEach(asset => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.assetId = asset.libraryId; button.setAttribute('aria-pressed', 'false');
        const img = document.createElement('img'); img.src = asset.url; img.alt = ''; img.loading = 'lazy';
        const name = document.createElement('span'); name.textContent = asset.name; button.append(img, name);
        button.onclick = () => {
          selectedAsset = asset;
          root.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
          $('librarySelection').firstElementChild.textContent = asset.name;
          $('insertAsset').disabled = false;
        };
        grid.append(button);
      });
      section.append(grid); root.append(section);
    }
  }
  $('insertAsset').onclick = async () => {
    if (!selectedAsset) return;
    state.P.logo = 'upload'; state.P.originalColors = true; state.assetId = selectedAsset.libraryId; state.assetUrl = selectedAsset.url; state.assetType = selectedAsset.fileType;
    syncControls(); persist(); await refreshLogo(); replay(); setPanel('content');
  };
  $('logoFile').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!/^image\/(svg\+xml|png|jpeg|webp|gif)$/.test(file.type)) { $('uploadName').textContent = label('请选择 SVG、PNG、JPG、WebP 或 GIF。', 'Choose SVG, PNG, JPG, WebP or GIF.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      state.P.logo = 'upload'; state.P.originalColors = true; state.assetId = ''; state.assetUrl = reader.result; state.assetType = file.type;
      $('uploadName').textContent = file.name; syncControls(); persist(); await refreshLogo(); replay(); setPanel('content');
    };
    reader.readAsDataURL(file); event.target.value = '';
  };
  function makeDynamicLogo(image, asset, at) {
    let source = image, width = image?.width, height = image?.height;
    if (asset?.kind === 'vector') {
      source = document.createElement('canvas'); source.width = source.height = 512;
      const ctx = source.getContext('2d'); ctx.translate(256, 256); Library.drawVector(ctx, asset, 390, at);
      width = height = 512;
    }
    const canvas = Core.fitToTexture(source, width, height);
    return { canvas, sdf: Core.buildSdf(canvas) };
  }
  function dynamicLogoAt(at) {
    if (!animatedResource && !dynamicAsset?.kind) return logoData;
    let key, source;
    if (animatedResource) {
      source = Animated.frameAt(animatedResource, at);
      key = animatedResource.frames.findIndex(frame => frame.image === source);
    } else { key = Math.floor(at * 12); source = null; }
    if (!dynamicCache.has(key)) {
      try { dynamicCache.set(key, makeDynamicLogo(source, dynamicAsset, at)); }
      catch (error) { console.error(error); return logoData; }
      if (dynamicCache.size > 16) dynamicCache.delete(dynamicCache.keys().next().value);
    }
    return dynamicCache.get(key);
  }
  async function refreshLogo() {
    const version = ++logoVersion;
    if (animatedResource) Animated.dispose(animatedResource);
    animatedResource = null; dynamicAsset = null; dynamicCache.clear(); logoData = null;
    if (state.P.logo === 'empty') { drawPreview(); return; }
    try {
      const asset = Library.byId.get(state.assetId);
      const source = asset?.url || state.assetUrl;
      let nextResource = null;
      if (state.P.logo === 'upload' && state.assetType === 'image/gif') {
        nextResource = await Animated.decode({ url: source, type: 'image/gif' });
      }
      if (version !== logoVersion) { if (nextResource) Animated.dispose(nextResource); return; }
      animatedResource = nextResource;
      dynamicAsset = asset?.kind === 'vector' ? asset : null;
      if (nextResource || dynamicAsset) logoData = dynamicLogoAt(time) || null;
      else {
        const font = Fonts.preset(state.font);
        if (state.P.logo === 'text' && font) await document.fonts.load(`${font.style} ${font.weight} 600px ${Fonts.family(state.font)}`, state.P.text || 'Aa');
        if (version !== logoVersion) return;
        logoData = await Core.makeLogo(state.P.logo, { text: state.P.text, font: Fonts.family(state.font), style: font?.style, weight: font?.weight, url: source });
      }
      if (version !== logoVersion) return;
      $('renderError').hidden = !!renderer;
      drawPreview();
    } catch (error) { $('renderError').hidden = false; $('renderError').textContent = error.message; console.error(error); }
  }

  function cycle() { return Core.endOf(state.P) + state.P.hold; }
  function phases() {
    const end = Core.endOf(state.P), first = Math.min(state.P.present * .36, state.P.response * .8);
    return [0, first, state.P.present, end, cycle()];
  }
  function buildTimeline() {
    const marks = phases(), total = cycle(), timeline = $('timeline'); timeline.replaceChildren();
    PHASES.forEach((phase, index) => {
      const length = marks[index + 1] - marks[index]; if (length < .01) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'me-choreo-block'; button.style.setProperty('--phase-color', phase.color);
      button.style.flex = `${length} 1 0`; button.dataset.seek = marks[index]; button.setAttribute('role', 'listitem');
      button.innerHTML = `<strong>${label(phase.zh, phase.en)}</strong><small>${length.toFixed(2)} s</small>`;
      button.setAttribute('aria-label', `${label(phase.zh, phase.en)} ${marks[index].toFixed(2)}–${marks[index + 1].toFixed(2)} s`);
      button.onclick = () => seek(marks[index] + Math.min(.08, length / 3)); timeline.append(button);
    });
    $('timelineDetails').replaceChildren(...PHASES.map((phase, i) => {
      const span = document.createElement('span'); span.style.setProperty('--phase-color', phase.color);
      span.innerHTML = `<b></b>${label(phase.zh, phase.en)} ${Math.max(0, marks[i + 1] - marks[i]).toFixed(2)}s`; return span;
    }));
    $('scrubber').max = String(total);
  }
  function fitStage() {
    const rect = $('stageArea').getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const scale = Math.min((rect.width - 40) / state.width, (rect.height - 40) / state.height);
    const width = Math.max(1, Math.round(state.width * scale)), height = Math.max(1, Math.round(state.height * scale));
    $('stageFrame').style.width = `${width}px`; $('stageFrame').style.height = `${height}px`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    preview.width = Math.max(1, Math.round(width * dpr)); preview.height = Math.max(1, Math.round(height * dpr));
    drawPreview();
  }
  function drawFrame(at, target, canvas, width, height) {
    if (!target) return;
    const data = dynamicLogoAt(at);
    if (!data) { const [r,g,b] = [1,3,5].map(i => parseInt(state.P.background.slice(i,i+2),16) / 255); target.gl.viewport(0,0,width,height); target.gl.clearColor(r,g,b,1); target.gl.clear(target.gl.COLOR_BUFFER_BIT); return; }
    if (target._logo !== data) { target.setLogo(data); target._logo = data; }
    const end = Core.endOf(state.P), fade = at > end ? Math.min(1, (at - end) / Math.max(.1, state.P.hold)) : 0;
    const frame = Core.frameAt(Math.min(at,end), state.P, fade);
    target.render(frame, width, height, Math.min(width,height) * state.P.tileSize / 480);
  }
  function drawPreview() { drawFrame(time, renderer, preview, preview.width, preview.height); }
  function seek(at) { playing = false; time = Math.max(0, Math.min(cycle(), at)); drawPreview(); updateClock(); updatePlayButton(); }
  function replay() { time = 0; playing = true; last = performance.now(); drawPreview(); updatePlayButton(); }
  function updatePlayButton() { $('playButton').textContent = playing ? label('Ⅱ 暂停', 'Ⅱ Pause') : label('▶ 播放', '▶ Play'); $('playButton').setAttribute('aria-label', playing ? label('暂停', 'Pause') : label('播放', 'Play')); }
  function updateClock() {
    const duration = cycle(); $('clock').textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`;
    $('scrubber').value = String(time); $('timeline').style.setProperty('--playhead', `${time / duration * 100}%`);
  }
  $('playButton').onclick = () => { if (!playing && time >= cycle()) time = 0; playing = !playing; last = performance.now(); updatePlayButton(); };
  $('replayButton').onclick = replay;
  $('scrubber').oninput = () => seek(Number($('scrubber').value));
  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && !event.target.closest('input,textarea,select')) {
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') { event.preventDefault(); stepHistory(key === 'y' || event.shiftKey ? 1 : -1); }
      return;
    }
    if (event.target.closest('input,select,button') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') { event.preventDefault(); $('playButton').click(); } else if (event.key.toLowerCase() === 'r') replay();
  });
  function tick(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (playing && !busy) {
      time += dt * state.speed;
      if (time >= cycle()) { if (state.loop) time %= cycle(); else { time = cycle(); playing = false; updatePlayButton(); } }
      drawPreview(); updateClock();
    }
    requestAnimationFrame(tick);
  }
  $('canvasPreset').onchange = () => {
    const value = $('canvasPreset').value;
    state.customSize = value === 'custom';
    if (value !== 'custom') [state.width,state.height] = value.split('x').map(Number);
    syncControls(); persist();
  };
  for (const [id,key] of [['canvasWidth','width'],['canvasHeight','height']]) $(id).onchange = () => {
    state[key] = Math.max(128, Math.min(3840, Math.round(Number($(id).value) / 2) * 2 || state[key]));
    syncControls(); persist();
  };
  new ResizeObserver(fitStage).observe($('stageArea'));

  function download(blob, filename) {
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 30000);
  }
  $('saveScheme').onclick = () => { persist(); download(new Blob([JSON.stringify({ type: 'cellmotion-glass-icon-reveal', version: 1, ...state }, null, 2)], { type: 'application/json' }), 'cellmotion-glass-icon-reveal.json'); $('schemeStatus').textContent = label('方案已下载。', 'Project downloaded.'); };
  $('importScheme').onclick = () => $('schemeFile').click();
  $('schemeFile').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { state = readScheme(JSON.parse(await file.text())); seek(0); syncControls(); persist(); await refreshLogo(); $('schemeStatus').textContent = label('方案已导入。', 'Project imported.'); }
    catch (error) { $('schemeStatus').textContent = `${label('导入失败', 'Import failed')}: ${error.message}`; }
    event.target.value = '';
  };
  $('restoreScheme').onclick = async () => { state = structuredClone(DEFAULT); seek(0); syncControls(); persist(); await refreshLogo(); $('schemeStatus').textContent = label('已恢复默认方案。', 'Default restored.'); };
  $('clearScheme').onclick = () => { state.P.logo = 'empty'; state.assetId = state.assetUrl = state.assetType = ''; logoData = null; if (animatedResource) Animated.dispose(animatedResource); animatedResource = null; dynamicAsset = null; dynamicCache.clear(); seek(0); syncControls(); persist(); $('schemeStatus').textContent = label('已清空图标，请重新选择。', 'Icon cleared. Choose a new one.'); };

  $('exportDuration').onchange = () => { $('customDurationField').hidden = $('exportDuration').value !== 'custom'; updateExportInfo(); };
  $('customDuration').oninput = updateExportInfo; $('exportScale').onchange = updateExportInfo;
  function exportSeconds() { const value = $('exportDuration').value; return value === 'cycle' ? cycle() : value === 'custom' ? Math.max(.5, Math.min(30, Number($('customDuration').value) || 4)) : Number(value); }
  function outputSize() { const scale = Number($('exportScale').value); return [state.width,state.height].map(n => Math.max(2, Math.round(n * scale / 2) * 2)); }
  function updateExportInfo() { const [w,h] = outputSize(); $('exportInfo').textContent = `${w} × ${h} px · ${exportSeconds().toFixed(2)} s`; }
  const scriptCache = new Map();
  function loadScript(url) {
    if (!scriptCache.has(url)) scriptCache.set(url, new Promise((resolve,reject) => {
      const script = document.createElement('script'); script.src = url; script.onload = resolve; script.onerror = () => reject(new Error(`Cannot load ${url}`)); document.head.append(script);
    }));
    return scriptCache.get(url);
  }
  async function exportArtwork(format) {
    if (busy || !renderer) return;
    busy = true; const wasPlaying = playing; playing = false; updatePlayButton();
    document.querySelectorAll('.export-actions button').forEach(button => button.disabled = true);
    const progress = $('exportProgress'), status = $('exportStatus'); progress.hidden = false; progress.value = 0;
    status.textContent = label('正在准备导出…', 'Preparing export…');
    const [width,height] = outputSize(), seconds = exportSeconds(), fps = Number($('exportFps').value);
    const glCanvas = document.createElement('canvas'); glCanvas.width = width; glCanvas.height = height;
    const output = document.createElement('canvas'); output.width = width; output.height = height;
    const context = output.getContext('2d', { willReadFrequently: true });
    let exportRenderer, encoder;
    try {
      exportRenderer = Core.createRenderer(glCanvas, { preserve: true });
      if (!exportRenderer) throw new Error('WebGL 2 unavailable');
      const draw = at => { drawFrame(at, exportRenderer, glCanvas, width, height); context.drawImage(glCanvas, 0, 0); };
      let blob;
      if (format === 'png') { draw(time); blob = await new Promise(resolve => output.toBlob(resolve,'image/png')); }
      else {
        const frames = Math.ceil(seconds * fps);
        let gif;
        if (format === 'mp4') {
          await loadScript('js/h264-mp4-encoder.web.js');
          encoder = await window.HME.createH264MP4Encoder();
          Object.assign(encoder,{ width,height,frameRate:fps,kbps:Math.max(2000,Math.round(width*height*.025)),groupOfPictures:fps,outputFilename:'glass-icon-reveal.mp4' });
          encoder.initialize();
        } else {
          await loadScript('js/continuation-gif.js');
          gif = new window.GIF({ workers:2,quality:8,repeat:0,width,height,workerScript:'js/continuation-gif.worker.js' });
        }
        for (let frame=0; frame<frames; frame++) {
          draw(Math.min(frame/fps,cycle()));
          if (encoder) encoder.addFrameRgba(context.getImageData(0,0,width,height).data);
          else gif.addFrame(output,{copy:true,delay:(Math.round((frame+1)*100/fps)-Math.round(frame*100/fps))*10});
          if (frame % 4 === 0) { progress.value = frame/frames*.8; status.textContent = `${format.toUpperCase()} · ${Math.round(progress.value*100)}%`; await new Promise(resolve => setTimeout(resolve,0)); }
        }
        if (encoder) { encoder.finalize(); blob = new Blob([encoder.FS.readFile('glass-icon-reveal.mp4')],{type:'video/mp4'}); }
        else blob = await new Promise((resolve,reject) => { gif.on('progress',v => { progress.value=.8+v*.2; }); gif.on('finished',resolve); gif.on('abort',()=>reject(new Error('GIF encoding stopped'))); gif.render(); });
      }
      if (!blob) throw new Error('No output generated');
      download(blob,`cellmotion-glass-icon-reveal-${width}x${height}.${format}`);
      progress.value = 1; status.textContent = `${format.toUpperCase()} ${label('已生成', 'ready')} · ${width} × ${height}`;
    } catch (error) { console.error(error); status.textContent = `${label('导出失败', 'Export failed')}: ${error.message}`; }
    finally { encoder?.delete(); exportRenderer?.dispose(); busy = false; playing = wasPlaying; last = performance.now(); updatePlayButton(); document.querySelectorAll('.export-actions button').forEach(button => button.disabled = false); }
  }
  $('exportPng').onclick = () => exportArtwork('png'); $('exportGif').onclick = () => exportArtwork('gif'); $('exportMp4').onclick = () => exportArtwork('mp4');
  window.CellMotionGlassReveal = { state: () => structuredClone(state), seek, exportArtwork, get time() { return time; }, get ready() { return !!logoData; } };
  buildLibrary(); Fonts.enhanceSelect($('logoFont')); syncControls(); localize(); refreshLogo(); requestAnimationFrame(tick);
})();
