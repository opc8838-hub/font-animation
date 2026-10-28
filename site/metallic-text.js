(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Core = window.MetallicTextRenderer;
  const Fonts = window.STGFontLibrary;
  const Media = window.CellMotionBackgroundMedia;
  const background = Media.create();
  const STORE = 'cellmotion-metallic-text-v1';
  const previewMode = new URLSearchParams(location.search).has('preview');
  document.body.classList.toggle('is-preview', previewMode);
  const DEFAULT = {
    effect: 'metallic-text', version: 1,
    canvas: { width: 1920, height: 1080 },
    settings: { font: 'stg:cellmotion-square' },
    scene: { text: 'OK', font: 'stg:cellmotion-square', fontSize: .8, fontHeight: .8, extraBold: .015, tracking: .015, background: '#020403', metalTint: '#c1c8cb', coolTint: '#8bc4ff', warmTint: '#ffdbad', bevel: .07, shine: 1, lightWidth: .28, direction: 'forward', intro: .45, sweep: 3.6, hold: .6, speed: 1 }
  };
  const PHASES = [
    { key: 'intro', zh: '银字浮现', en: 'Silver reveal', color: '#d4b8ff' },
    { key: 'sweep', zh: '流光经过', en: 'Light sweep', color: '#8ec8ff' },
    { key: 'hold', zh: '亮面停留', en: 'Lit hold', color: '#ffd27d' }
  ];
  const numericKeys = ['fontSize', 'fontHeight', 'extraBold', 'tracking', 'bevel', 'shine', 'lightWidth', 'intro', 'sweep', 'hold', 'speed', 'positionX', 'positionY'];
  const optionalDefaults = { positionX: 0, positionY: 0, alignment: 'center' };
  const colorFields = { background: 'backgroundColor', metalTint: 'textColor', coolTint: 'coolTint', warmTint: 'warmTint' };
  const colorKeys = Object.keys(colorFields);
  const dimension = value => Math.max(128, Math.min(3840, Math.round(Number(value) / 2) * 2 || 1080));
  let language = localStorage.getItem('cellmotion-site-language') === 'en' ? 'en' : 'zh';
  let theme = localStorage.getItem('cellmotion-editor-theme') === 'light' ? 'light' : 'dark';
  let state = structuredClone(DEFAULT);
  if (!previewMode && new URLSearchParams(location.search).get('from') !== 'gallery') {
    try { const saved = JSON.parse(localStorage.getItem(STORE)); if (saved) state = readScheme(saved); } catch (_) { /* A broken local draft must not prevent opening the editor. */ }
  }
  const history = [JSON.stringify(state)];
  let historyIndex = 0;
  let time = matchMedia('(prefers-reduced-motion: reduce)').matches ? state.scene.intro : 0;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), busy = false, fontRequest = 0;
  let previewPromise = null, requestedTime = null, mediaVersion = 0;
  let followBackground = localStorage.getItem('cellmotion-stage-backdrop-enabled') === 'true';
  let stageColor = localStorage.getItem('cellmotion-stage-backdrop-color') || '';
  const canvas = $('view');
  const label = (zh, en) => language === 'en' ? en : zh;
  const cycle = () => Core.duration(state.scene) / state.scene.speed;

  function readScheme(raw) {
    if (raw?.effect !== 'metallic-text' || raw.version !== 1 || !raw.scene || !raw.canvas) throw new Error('Invalid Metallic Text project');
    const next = structuredClone({ ...raw, ...DEFAULT, scene: { ...raw.scene, ...DEFAULT.scene }, settings: { ...raw.settings, ...DEFAULT.settings } });
    next.canvas = { width: dimension(raw.canvas.width), height: dimension(raw.canvas.height) };
    for (const key of numericKeys) {
      const input = $(key);
      if (Number.isFinite(raw.scene[key])) next.scene[key] = Math.max(Number(input.min), Math.min(Number(input.max), raw.scene[key]));
    }
    for (const key of colorKeys) if (/^#[0-9a-f]{6}$/i.test(raw.scene[key] || '')) next.scene[key] = raw.scene[key];
    if (typeof raw.scene.text === 'string') next.scene.text = raw.scene.text;
    if (Fonts.idFor(raw.scene.font)) next.scene.font = `stg:${Fonts.idFor(raw.scene.font)}`;
    next.scene.direction = raw.scene.direction === 'reverse' ? 'reverse' : 'forward';
    if ('alignment' in raw.scene) next.scene.alignment = ['left', 'center', 'right'].includes(raw.scene.alignment) ? raw.scene.alignment : 'center';
    if ('backgroundMedia' in raw.scene) next.scene.backgroundMedia = Media.normalize(raw.scene.backgroundMedia);
    next.settings.font = next.scene.font;
    return next;
  }
  function persist() {
    if (previewMode) return;
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (_) { $('schemeStatus').textContent = label('本机存储已满，请保存方案文件。', 'Storage is full. Save a project file.'); }
  }
  function record() {
    state.settings.font = state.scene.font;
    const snapshot = JSON.stringify(state);
    if (history[historyIndex] !== snapshot) {
      history.splice(historyIndex + 1);
      history.push(snapshot);
      if (history.length > 60) history.shift();
      historyIndex = history.length - 1;
    }
    persist();
    syncHistory();
  }
  async function loadFont() {
    const request = ++fontRequest;
    const preset = Fonts.preset(state.scene.font);
    await document.fonts.load(`${preset?.style || 'normal'} ${preset?.weight || 900} 120px "${preset?.family || 'sans-serif'}"`, state.scene.text || 'OK');
    if (request === fontRequest) { Core.invalidate(); drawPreview(); }
  }
  function localize() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.body.dataset.editorTheme = theme;
    document.body.dataset.editorLanguage = language;
    document.querySelectorAll('[data-zh][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
    $('languageButton').textContent = language === 'en' ? '中' : 'EN';
    $('themeButton').textContent = theme === 'dark' ? '☀' : '☾';
    $('themeButton').setAttribute('aria-label', label('切换明暗主题', 'Switch theme'));
    $('openBackground').setAttribute('aria-label', label('更换背景', 'Change background'));
    document.querySelectorAll('.range-row input[type="range"]').forEach(range => {
      const name = range.closest('label').querySelector('span').textContent;
      range.setAttribute('aria-label', name); $(range.id + 'Exact')?.setAttribute('aria-label', name + label('数值', ' value'));
    });
    $('backgroundCrop').setAttribute('aria-label', label('拖动画面裁剪背景', 'Drag to reframe the background'));
    $('videoStartHandle').setAttribute('aria-label', label('视频开始位置', 'Video trim start')); $('videoEndHandle').setAttribute('aria-label', label('视频结束位置', 'Video trim end'));
    document.dispatchEvent(new CustomEvent('tc-languagechange', { detail: { language } }));
    buildTimeline(); updateClock(); updateExportInfo(); syncBackdrop();
  }
  function setPanel(name) {
    document.querySelectorAll('.tc-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === name)));
    document.querySelectorAll('.tc-properties').forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
  }
  function syncControls() {
    numericKeys.forEach(key => {
      const input = $(key), value = state.scene[key] ?? optionalDefaults[key];
      input.value = value;
      input.nextElementSibling.textContent = ['intro', 'sweep', 'hold'].includes(key) ? `${value.toFixed(2)} s` : key === 'speed' ? `${value.toFixed(2)}×` : ['fontSize', 'fontHeight', 'extraBold', 'lightWidth', 'tracking'].includes(key) ? `${Number((value * 100).toFixed(1))}%` : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      if ($(key + 'Exact')) $(key + 'Exact').value = Number((value * Number(input.dataset.displayFactor || 1)).toFixed(3));
    });
    colorKeys.forEach(key => { $(colorFields[key]).value = state.scene[key]; });
    $('text').value = state.scene.text;
    $('contentTitle').textContent = state.scene.text || label('空白文字', 'Empty text');
    $('font').value = state.scene.font;
    $('fontSummary').textContent = Fonts.preset(state.scene.font)?.label || '';
    $('alignment').value = state.scene.alignment || 'center';
    $('direction').value = state.scene.direction;
    const sizeValue = `${state.canvas.width}x${state.canvas.height}`;
    $('canvasPreset').value = [...$('canvasPreset').options].some(option => option.value === sizeValue) ? sizeValue : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom';
    $('canvasWidth').value = state.canvas.width; $('canvasHeight').value = state.canvas.height;
    $('canvasInfo').textContent = `${state.canvas.width} × ${state.canvas.height}`;
    $('scrubber').max = String(cycle());
    time = Math.min(time, cycle());
    buildTimeline(); updateClock(); fitStage(); updateExportInfo(); syncBackgroundControls(); syncHistory(); syncBackdrop();
    document.dispatchEvent(new Event('tc-controls-synced'));
  }
  function buildTimeline() {
    let at = 0;
    $('timeline').replaceChildren(); $('timelineDetails').replaceChildren();
    PHASES.forEach(phase => {
      const duration = state.scene[phase.key] / state.scene.speed;
      if (duration <= 0) return;
      const start = at; at += duration;
      const name = label(phase.zh, phase.en);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'me-choreo-block'; button.dataset.seek = start;
      button.dataset.end = at;
      button.style.setProperty('--phase-duration', duration);
      button.style.setProperty('--phase-color', phase.color);
      button.setAttribute('aria-label', `${name} ${start.toFixed(2)}–${at.toFixed(2)} s`);
      const strong = document.createElement('strong'); strong.textContent = name;
      const small = document.createElement('small'); small.textContent = `${duration.toFixed(2)} s`;
      button.append(strong, small); button.onclick = () => seek(start + duration * .5);
      $('timeline').append(button);
      const detail = document.createElement('span'), dot = document.createElement('i');
      dot.style.background = phase.color;
      detail.append(dot, `${name} ${start.toFixed(2)}–${at.toFixed(2)}s`);
      $('timelineDetails').append(detail);
    });
  }
  function fitStage() {
    const stage = $('stageArea'), frame = $('stageFrame');
    const pad = previewMode ? 0 : window.innerWidth <= 860 ? 28 : 44;
    const availableW = Math.max(1, stage.clientWidth - pad), availableH = Math.max(1, stage.clientHeight - pad);
    const scale = Math.min(availableW / state.canvas.width, availableH / state.canvas.height);
    frame.style.width = `${state.canvas.width * scale}px`;
    frame.style.height = `${state.canvas.height * scale}px`;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(state.canvas.width * scale * dpr));
    canvas.height = Math.max(2, Math.round(state.canvas.height * scale * dpr));
    drawPreview();
  }
  function render(target, at, width = target.width, height = target.height) {
    const ctx = target.getContext('2d'), media = state.scene.backgroundMedia;
    ctx.fillStyle = state.scene.background; ctx.fillRect(0, 0, width, height);
    background.draw(ctx, width, height, media);
    Core.draw(ctx, state, at * state.scene.speed, width, height, !!media);
  }
  async function prepareFrame(at) { await background.prepare(at * state.scene.speed, state.scene.backgroundMedia); }
  function drawPreview() {
    if (busy) return previewPromise || Promise.resolve();
    requestedTime = time;
    if (previewPromise) return previewPromise;
    previewPromise = (async () => {
      while (requestedTime !== null && !busy) {
        const at = requestedTime; requestedTime = null;
        await prepareFrame(at); render(canvas, at); drawCropPreview();
      }
    })().catch(error => { playing = false; $('backgroundStatus').textContent = error.message; updateClock(); })
      .finally(() => { previewPromise = null; });
    return previewPromise;
  }
  function updateClock() {
    const duration = cycle();
    $('clock').textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`;
    $('scrubber').value = time;
    $('timeline').style.setProperty('--playhead', `${Math.min(100, time / duration * 100)}%`);
    $('timeline').querySelectorAll('button').forEach(button => button.setAttribute('aria-current', String(time >= Number(button.dataset.seek) && time < Number(button.dataset.end))));
    $('playButton').textContent = playing ? label('Ⅱ 暂停', 'Ⅱ Pause') : label('▶ 播放', '▶ Play');
    $('playButton').setAttribute('aria-label', playing ? label('暂停', 'Pause') : label('播放', 'Play'));
  }
  function seek(seconds) { playing = false; time = Math.max(0, Math.min(cycle(), Number(seconds) || 0)); updateClock(); return drawPreview(); }
  function replay() { time = 0; playing = true; last = performance.now(); updateClock(); drawPreview(); }
  function tick(now) {
    if (playing && !busy) { time = (time + Math.min(.1, (now - last) / 1000)) % cycle(); drawPreview(); updateClock(); }
    last = now; requestAnimationFrame(tick);
  }
  numericKeys.forEach(key => $(key).addEventListener('input', () => {
    state.scene[key] = Number($(key).value); syncControls(); persist();
    if (['intro', 'sweep', 'hold'].includes(key)) { const index = PHASES.findIndex(phase => phase.key === key); const start = PHASES.slice(0, index).reduce((sum, phase) => sum + state.scene[phase.key], 0); seek((start + state.scene[key] * .5) / state.scene.speed); }
    else drawPreview();
  }));
  numericKeys.forEach(key => $(key).addEventListener('change', record));
  colorKeys.forEach(key => $(colorFields[key]).addEventListener('input', () => { state.scene[key] = $(colorFields[key]).value; persist(); syncBackdrop(); syncBackgroundControls(); drawPreview(); }));
  colorKeys.forEach(key => $(colorFields[key]).addEventListener('change', record));
  $('text').addEventListener('input', () => { state.scene.text = $('text').value; $('contentTitle').textContent = state.scene.text || label('空白文字', 'Empty text'); persist(); drawPreview(); loadFont(); });
  $('text').addEventListener('change', record);
  $('font').addEventListener('change', () => { state.scene.font = $('font').value; $('fontSummary').textContent = Fonts.preset(state.scene.font)?.label || ''; record(); loadFont(); });
  $('alignment').addEventListener('change', () => { state.scene.alignment = $('alignment').value; record(); drawPreview(); });
  $('direction').addEventListener('change', () => { state.scene.direction = $('direction').value; record(); drawPreview(); });
  $('canvasPreset').addEventListener('change', () => {
    const value = $('canvasPreset').value;
    if (value !== 'custom') [state.canvas.width, state.canvas.height] = value.split('x').map(Number);
    syncControls(); $('customSize').hidden = value !== 'custom'; record();
  });
  ['canvasWidth', 'canvasHeight'].forEach(id => $(id).addEventListener('change', () => {
    state.canvas[id === 'canvasWidth' ? 'width' : 'height'] = dimension($(id).value); syncControls(); record();
  }));
  $('playButton').onclick = () => { playing = !playing; if (time >= cycle()) time = 0; last = performance.now(); updateClock(); };
  $('replayButton').onclick = replay;
  $('pauseForEdit').onclick = () => seek((state.scene.intro + state.scene.sweep * .45) / state.scene.speed);
  $('scrubber').addEventListener('input', () => seek($('scrubber').value));
  $('languageButton').onclick = () => { language = language === 'zh' ? 'en' : 'zh'; localStorage.setItem('cellmotion-site-language', language); localize(); };
  $('themeButton').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('cellmotion-editor-theme', theme); localStorage.setItem('cellmotion-site-theme', theme); localize(); };
  document.querySelectorAll('.tc-tabs button').forEach(button => { button.onclick = () => setPanel(button.dataset.panel); });
  $('openExport').onclick = () => setPanel('export');
  $('selectText').onclick = () => setPanel('content');
  $('openBackground').onclick = () => { setPanel('content'); $('backgroundSettings').open = true; $('backgroundSettings').scrollIntoView({ block: 'nearest' }); };

  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function applyScheme(raw, presentation = {}) {
    playing = false; requestedTime = null; await previewPromise;
    state = readScheme(raw);
    const reduceMotion = presentation.reducedMotion === 'pause' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    time = reduceMotion ? state.scene.intro / state.scene.speed : 0;
    await loadBackground(); syncControls(); await loadFont();
    playing = presentation.autoplay !== false && !reduceMotion; last = performance.now(); updateClock(); await drawPreview();
  }
  $('saveScheme').onclick = () => { persist(); download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'metallic-text-project.json'); $('schemeStatus').textContent = label('方案已保存并下载', 'Project saved and downloaded'); };
  $('importScheme').onclick = () => $('schemeFile').click();
  $('schemeFile').onchange = async () => {
    try { const file = $('schemeFile').files[0]; if (!file) return; await applyScheme(JSON.parse(await file.text()), { autoplay: false }); await seek((state.scene.intro + state.scene.sweep * .45) / state.scene.speed); record(); $('schemeStatus').textContent = label('方案已导入', 'Project imported'); }
    catch (error) { $('schemeStatus').textContent = `${label('导入失败', 'Import failed')}: ${error.message}`; }
    finally { $('schemeFile').value = ''; }
  };
  $('restoreScheme').onclick = async () => { await applyScheme(DEFAULT); record(); };
  $('clearScheme').onclick = async () => { const clean = structuredClone(DEFAULT); clean.scene.text = ''; await applyScheme(clean, { autoplay: false }); record(); };
  function syncHistory() { $('undoButton').disabled = historyIndex === 0; $('redoButton').disabled = historyIndex >= history.length - 1; }
  async function stepHistory(delta) {
    const next = historyIndex + delta;
    if (next < 0 || next >= history.length) return;
    historyIndex = next; await applyScheme(JSON.parse(history[next]), { autoplay: false }); persist(); syncHistory();
  }
  $('undoButton').onclick = () => stepHistory(-1); $('redoButton').onclick = () => stepHistory(1);
  document.addEventListener('keydown', async event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
    event.preventDefault(); await stepHistory(event.shiftKey ? 1 : -1);
  });

  function syncBackdrop() {
    const fallback = theme === 'light' ? '#e7e7ec' : '#121214';
    const independent = /^#[0-9a-f]{6}$/i.test(stageColor) ? stageColor : fallback;
    $('stageArea').style.backgroundColor = followBackground ? state.scene.background : independent;
    $('tcBackdropEnabled').checked = followBackground; $('tcBackdropColor').value = independent;
    $('tcBackdropToggle').setAttribute('aria-pressed', String(followBackground));
  }
  function closeBackdrop() { $('backdropPopover').hidden = true; $('tcBackdropToggle').setAttribute('aria-expanded', 'false'); }
  $('tcBackdropToggle').onclick = () => { const open = $('backdropPopover').hidden; $('backdropPopover').hidden = !open; $('tcBackdropToggle').setAttribute('aria-expanded', String(open)); };
  $('tcBackdropEnabled').onchange = () => { followBackground = $('tcBackdropEnabled').checked; localStorage.setItem('cellmotion-stage-backdrop-enabled', followBackground); syncBackdrop(); };
  $('tcBackdropColor').oninput = () => { stageColor = $('tcBackdropColor').value; localStorage.setItem('cellmotion-stage-backdrop-color', stageColor); syncBackdrop(); };
  $('tcBackdropReset').onclick = () => { stageColor = ''; localStorage.removeItem('cellmotion-stage-backdrop-color'); syncBackdrop(); };
  document.addEventListener('click', event => { if (!event.target.closest('.tc-backdrop-control')) closeBackdrop(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeBackdrop(); });

  function drawCropPreview() {
    if (!$('backgroundSettings').open || !state.scene.backgroundMedia) return;
    const target = $('backgroundCrop'), height = Math.round(480 * state.canvas.height / state.canvas.width);
    if (target.height !== height) target.height = height;
    const ctx = target.getContext('2d'); ctx.fillStyle = state.scene.background; ctx.fillRect(0, 0, target.width, target.height);
    background.draw(ctx, target.width, target.height, state.scene.backgroundMedia);
  }
  function syncBackgroundControls() {
    const media = state.scene.backgroundMedia;
    $('backgroundSwatch').style.backgroundColor = state.scene.background;
    $('backgroundSwatch').setAttribute('aria-label', label('当前背景颜色 ', 'Current background color ') + state.scene.background);
    $('backgroundMediaControls').hidden = !media; $('backgroundVideoControls').hidden = !Media.isVideo(media);
    $('backgroundName').textContent = media?.name || '';
    $('cropZoom').value = media?.cropZoom || 1; $('cropZoom').nextElementSibling.textContent = `${Number(media?.cropZoom || 1).toFixed(2)}×`;
    if ($('cropZoomExact')) $('cropZoomExact').value = Number(media?.cropZoom || 1).toFixed(2);
    if (Media.isVideo(media) && background.duration > 0) {
      const bounds = Media.clip(media, background.duration);
      $('videoStart').value = bounds.start.toFixed(2); $('videoEnd').value = bounds.end.toFixed(2);
      $('videoStart').max = Math.max(0, background.duration - .05); $('videoEnd').max = background.duration;
      $('videoSelection').style.left = `${bounds.start / background.duration * 100}%`;
      $('videoSelection').style.width = `${bounds.duration / background.duration * 100}%`;
      $('videoDuration').textContent = `0.00 – ${background.duration.toFixed(2)} s · ${label('选中', 'Selected')} ${bounds.duration.toFixed(2)} s`;
      ['Start', 'End'].forEach(edge => { const handle = $('video' + edge + 'Handle'); handle.setAttribute('aria-valuemax', background.duration); handle.setAttribute('aria-valuenow', bounds[edge.toLowerCase()]); });
    }
    drawCropPreview();
  }
  async function loadBackground() {
    const version = ++mediaVersion, media = state.scene.backgroundMedia;
    await background.setMedia(media); await background.prepare(time * state.scene.speed, media);
    syncBackgroundControls();
    if (Media.isVideo(media)) background.filmstrip().then(filmstrip => {
      if (filmstrip && version === mediaVersion) $('videoFilmstrip').getContext('2d').drawImage(filmstrip, 0, 0);
    }).catch(error => { $('backgroundStatus').textContent = error.message; });
  }
  $('backgroundSettings').addEventListener('toggle', drawCropPreview);
  $('backgroundFile').onchange = async () => {
    const file = $('backgroundFile').files[0]; if (!file) return;
    $('backgroundStatus').textContent = label('正在读取背景…', 'Loading background…');
    try {
      const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const media = Media.normalize({ url, name: file.name, fileType: file.type || (/\.(mp4|webm|mov)$/i.test(file.name) ? 'video/mp4' : /\.gif$/i.test(file.name) ? 'image/gif' : 'image/png') });
      playing = false; requestedTime = null; await previewPromise; await background.setMedia(media);
      state.scene.backgroundMedia = media; time = (state.scene.intro + state.scene.sweep * .45) / state.scene.speed; await loadBackground(); record();
      $('backgroundStatus').textContent = label('背景已更新', 'Background updated'); await drawPreview(); updateClock();
    } catch (error) { $('backgroundStatus').textContent = `${label('背景加载失败', 'Background failed')}: ${error.message}`; }
    finally { $('backgroundFile').value = ''; }
  };
  $('removeBackground').onclick = async () => { playing = false; requestedTime = null; await previewPromise; delete state.scene.backgroundMedia; await loadBackground(); record(); $('backgroundStatus').textContent = ''; await drawPreview(); updateClock(); };
  $('cropZoom').oninput = () => { if (!state.scene.backgroundMedia) return; state.scene.backgroundMedia.cropZoom = Number($('cropZoom').value); syncBackgroundControls(); persist(); drawPreview(); };
  $('cropZoom').onchange = record;
  $('resetCrop').onclick = () => { if (!state.scene.backgroundMedia) return; Object.assign(state.scene.backgroundMedia, { cropX: .5, cropY: .5, cropZoom: 1 }); record(); syncBackgroundControls(); drawPreview(); };
  let cropDrag = null;
  $('backgroundCrop').onpointerdown = event => { const media = state.scene.backgroundMedia; if (!media) return; cropDrag = { x: event.clientX, y: event.clientY, cropX: media.cropX, cropY: media.cropY }; event.currentTarget.setPointerCapture(event.pointerId); };
  $('backgroundCrop').onpointermove = event => {
    if (!cropDrag || !state.scene.backgroundMedia) return;
    const rect = event.currentTarget.getBoundingClientRect(), media = state.scene.backgroundMedia;
    media.cropX = Math.max(0, Math.min(1, cropDrag.cropX - (event.clientX - cropDrag.x) / rect.width));
    media.cropY = Math.max(0, Math.min(1, cropDrag.cropY - (event.clientY - cropDrag.y) / rect.height));
    persist(); drawPreview();
  };
  const endCrop = () => { if (cropDrag) { cropDrag = null; record(); } };
  $('backgroundCrop').onpointerup = endCrop; $('backgroundCrop').onpointercancel = endCrop;
  $('backgroundCrop').onkeydown = event => {
    const media = state.scene.backgroundMedia; if (!media || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const key = /Left|Right/.test(event.key) ? 'cropX' : 'cropY';
    media[key] = Math.max(0, Math.min(1, media[key] + (/Right|Down/.test(event.key) ? .01 : -.01))); record(); drawPreview();
  };
  function setTrim(edge, value, commit = true) {
    const media = state.scene.backgroundMedia; if (!Media.isVideo(media) || !background.duration) return;
    const bounds = Media.clip(media, background.duration);
    media.videoStart = edge === 'start' ? Math.max(0, Math.min(bounds.end - .05, value)) : bounds.start;
    media.videoEnd = edge === 'end' ? Math.max(bounds.start + .05, Math.min(background.duration, value)) : bounds.end;
    playing = false; syncBackgroundControls(); if (commit) record(); else persist(); drawPreview(); updateClock();
  }
  ['start', 'end'].forEach(edge => {
    const suffix = edge === 'start' ? 'Start' : 'End';
    $('video' + suffix).onchange = () => setTrim(edge, Number($('video' + suffix).value));
    const handle = $('video' + suffix + 'Handle'); let dragging = false;
    handle.onpointerdown = event => { dragging = true; handle.setPointerCapture(event.pointerId); event.preventDefault(); };
    handle.onpointermove = event => { if (!dragging) return; const rect = $('videoTimeline').getBoundingClientRect(); setTrim(edge, (event.clientX - rect.left) / rect.width * background.duration, false); };
    handle.onpointerup = handle.onpointercancel = () => { if (dragging) { dragging = false; record(); } };
    handle.onkeydown = event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const bounds = Media.clip(state.scene.backgroundMedia, background.duration); setTrim(edge, bounds[edge] + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 1 : .1)); };
  });
  [...numericKeys, 'cropZoom'].forEach(key => {
    const range = $(key), factor = ['fontSize', 'fontHeight', 'extraBold', 'tracking', 'bevel', 'lightWidth'].includes(key) ? 100 : 1;
    const unit = ['intro', 'sweep', 'hold'].includes(key) ? 's' : ['speed', 'cropZoom'].includes(key) ? '×' : '%';
    range.dataset.displayFactor = factor;
    const box = document.createElement('span'); box.className = 'metal-exact-box';
    const exact = document.createElement('input'); exact.type = 'number'; exact.id = key + 'Exact'; exact.min = Number(range.min) * factor; exact.max = Number(range.max) * factor; exact.step = Number(range.step) * factor;
    exact.setAttribute('aria-label', `${range.closest('label').querySelector('span').textContent}数值`);
    const suffix = document.createElement('span'); suffix.textContent = unit; box.append(exact, suffix); range.parentElement.append(box);
    exact.onchange = () => { if (exact.value === '' || !Number.isFinite(exact.valueAsNumber)) { syncControls(); return; } range.value = Math.max(Number(range.min), Math.min(Number(range.max), exact.valueAsNumber / factor)); range.dispatchEvent(new Event('input', { bubbles: true })); range.dispatchEvent(new Event('change', { bubbles: true })); };
    exact.onkeydown = event => { if (event.key === 'Enter') exact.blur(); };
  });
  const outputSize = () => [state.canvas.width, state.canvas.height].map(value => Math.max(2, Math.round(value * Number($('exportScale').value) / 2) * 2));
  const exportSeconds = () => $('exportDuration').value === 'cycle' ? cycle() : Math.max(.5, Math.min(30, Number($('exportDuration').value === 'custom' ? $('customDuration').value : $('exportDuration').value) || 4));
  function updateExportInfo() { const [w, h] = outputSize(); $('exportInfo').textContent = `${w} × ${h} · ${exportSeconds().toFixed(2)} s · ${$('exportFps').value} FPS`; $('customDurationField').hidden = $('exportDuration').value !== 'custom'; }
  ['exportScale', 'exportFps', 'exportDuration', 'customDuration'].forEach(id => $(id).addEventListener('change', updateExportInfo));
  const scripts = new Map();
  function loadScript(src) {
    if (!scripts.has(src)) scripts.set(src, new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = () => { scripts.delete(src); reject(new Error(`Cannot load ${src}`)); }; document.head.append(script); }));
    return scripts.get(src);
  }
  async function exportArtwork(format) {
    if (busy) return;
    busy = true; const wasPlaying = playing; playing = false; updateClock();
    document.querySelectorAll('.export-actions button').forEach(button => { button.disabled = true; });
    const progress = $('exportProgress'), status = $('exportStatus'); progress.hidden = false; progress.value = 0;
    status.textContent = label('正在准备导出…', 'Preparing export…');
    const [width, height] = outputSize(), seconds = exportSeconds(), fps = Number($('exportFps').value);
    const output = document.createElement('canvas'); output.width = width; output.height = height;
    const outputContext = output.getContext('2d', { willReadFrequently: true });
    let encoder;
    try {
      await previewPromise; await loadFont();
      const draw = async at => { await prepareFrame(at); render(output, at, width, height); };
      let blob;
      if (format === 'png') { await draw(time); blob = await new Promise(resolve => output.toBlob(resolve, 'image/png')); }
      else {
        const frames = Math.ceil(seconds * fps); let gif;
        if (format === 'mp4') {
          await loadScript('js/h264-mp4-encoder.web.js'); encoder = await window.HME.createH264MP4Encoder();
          Object.assign(encoder, { width, height, frameRate: fps, kbps: Math.max(1500, Math.round(width * height * .025)), groupOfPictures: fps, outputFilename: 'metallic-text.mp4' }); encoder.initialize();
        } else {
          await loadScript('js/continuation-gif.js'); gif = new window.GIF({ workers: 2, quality: 8, repeat: 0, width, height, workerScript: 'js/continuation-gif.worker.js' });
        }
        for (let frame = 0; frame < frames; frame++) {
          await draw((frame / fps) % cycle());
          if (encoder) encoder.addFrameRgba(outputContext.getImageData(0, 0, width, height).data);
          else gif.addFrame(output, { copy: true, delay: (Math.round((frame + 1) * 100 / fps) - Math.round(frame * 100 / fps)) * 10 });
          if (frame % 4 === 0) { progress.value = frame / frames * .8; status.textContent = `${format.toUpperCase()} · ${Math.round(progress.value * 100)}%`; await new Promise(resolve => setTimeout(resolve, 0)); }
        }
        if (encoder) { encoder.finalize(); blob = new Blob([encoder.FS.readFile('metallic-text.mp4')], { type: 'video/mp4' }); }
        else blob = await new Promise((resolve, reject) => { gif.on('progress', value => { progress.value = .8 + value * .2; }); gif.on('finished', resolve); gif.on('abort', () => reject(new Error('GIF encoding stopped'))); gif.render(); });
      }
      if (!blob) throw new Error('No output generated');
      download(blob, `cellmotion-metallic-text-${width}x${height}.${format}`);
      progress.value = 1; status.textContent = `${format.toUpperCase()} ${label('已生成', 'ready')} · ${width} × ${height}`;
    } catch (error) { console.error(error); status.textContent = `${label('导出失败', 'Export failed')}: ${error.message}`; }
    finally { encoder?.delete(); busy = false; playing = wasPlaying; last = performance.now(); updateClock(); drawPreview(); document.querySelectorAll('.export-actions button').forEach(button => { button.disabled = false; }); }
  }
  $('exportPng').onclick = () => exportArtwork('png'); $('exportGif').onclick = () => exportArtwork('gif'); $('exportMp4').onclick = () => exportArtwork('mp4');
  window.CellMotionMetallicText = { getScheme: () => structuredClone(state), applyScheme, seek, render, prepareFrame, exportArtwork, get time() { return time; }, get playing() { return playing; } };
  syncControls(); localize();
  new ResizeObserver(fitStage).observe($('stageArea'));
  document.fonts.addEventListener('loadingdone', () => { Core.invalidate(); drawPreview(); });
  Promise.all([loadFont(), loadBackground()]).then(() => {
    window.CellMotionBridge.register({ effectId: 'metallic-text', getScheme: () => structuredClone(state), applyScheme,
      play: () => { playing = true; last = performance.now(); updateClock(); }, pause: () => { playing = false; updateClock(); }, restart: replay, seek, durationMs: () => cycle() * 1000 });
  });
  requestAnimationFrame(tick);
})();
