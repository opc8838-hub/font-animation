(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Core = window.MetallicTextRenderer;
  const Fonts = window.STGFontLibrary;
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
  const numericKeys = ['fontSize', 'fontHeight', 'extraBold', 'tracking', 'bevel', 'shine', 'lightWidth', 'intro', 'sweep', 'hold', 'speed'];
  const colorFields = { background: 'backgroundColor', metalTint: 'textColor', coolTint: 'coolTint', warmTint: 'warmTint' };
  const colorKeys = Object.keys(colorFields);
  const dimension = value => Math.max(128, Math.min(3840, Math.round(Number(value) / 2) * 2 || 1080));
  let language = localStorage.getItem('cellmotion-site-language') === 'en' ? 'en' : 'zh';
  let theme = localStorage.getItem('cellmotion-editor-theme') === 'light' ? 'light' : 'dark';
  let state = structuredClone(DEFAULT);
  if (!previewMode) {
    try { const saved = JSON.parse(localStorage.getItem(STORE)); if (saved) state = readScheme(saved); } catch (_) { /* A broken local draft must not prevent opening the editor. */ }
  }
  const history = [JSON.stringify(state)];
  let historyIndex = 0;
  let time = matchMedia('(prefers-reduced-motion: reduce)').matches ? state.scene.intro : 0;
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), busy = false, fontRequest = 0;
  const canvas = $('view');
  const context = canvas.getContext('2d');
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
  }
  async function loadFont() {
    const request = ++fontRequest;
    const preset = Fonts.preset(state.scene.font);
    await document.fonts.load(`${preset?.weight || 900} 120px "${preset?.family || 'sans-serif'}"`, state.scene.text || 'OK');
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
    document.dispatchEvent(new CustomEvent('tc-languagechange', { detail: { language } }));
    buildTimeline(); updateClock(); updateExportInfo();
  }
  function setPanel(name) {
    document.querySelectorAll('.tc-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === name)));
    document.querySelectorAll('.tc-properties').forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
  }
  function syncControls() {
    numericKeys.forEach(key => {
      const input = $(key), value = state.scene[key];
      input.value = value;
      input.nextElementSibling.textContent = ['intro', 'sweep', 'hold'].includes(key) ? `${value.toFixed(2)} s` : key === 'speed' ? `${value.toFixed(2)}×` : ['fontSize', 'fontHeight', 'extraBold', 'lightWidth', 'tracking'].includes(key) ? `${Number((value * 100).toFixed(1))}%` : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    });
    colorKeys.forEach(key => { $(colorFields[key]).value = state.scene[key]; });
    $('text').value = state.scene.text;
    $('font').value = state.scene.font;
    $('direction').value = state.scene.direction;
    const sizeValue = `${state.canvas.width}x${state.canvas.height}`;
    $('canvasPreset').value = [...$('canvasPreset').options].some(option => option.value === sizeValue) ? sizeValue : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom';
    $('canvasWidth').value = state.canvas.width; $('canvasHeight').value = state.canvas.height;
    $('canvasInfo').textContent = `${state.canvas.width} × ${state.canvas.height}`;
    $('scrubber').max = String(cycle());
    time = Math.min(time, cycle());
    buildTimeline(); updateClock(); fitStage(); updateExportInfo();
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
    Core.draw(target.getContext('2d'), state, at * state.scene.speed, width, height);
  }
  function drawPreview() { Core.draw(context, state, time * state.scene.speed, canvas.width, canvas.height); }
  function updateClock() {
    const duration = cycle();
    $('clock').textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`;
    $('scrubber').value = time;
    $('timeline').style.setProperty('--playhead', `${Math.min(100, time / duration * 100)}%`);
    $('timeline').querySelectorAll('button').forEach(button => button.setAttribute('aria-current', String(time >= Number(button.dataset.seek) && time < Number(button.dataset.end))));
    $('playButton').textContent = playing ? label('Ⅱ 暂停', 'Ⅱ Pause') : label('▶ 播放', '▶ Play');
    $('playButton').setAttribute('aria-label', playing ? label('暂停', 'Pause') : label('播放', 'Play'));
  }
  function seek(seconds) { playing = false; time = Math.max(0, Math.min(cycle(), Number(seconds) || 0)); updateClock(); drawPreview(); }
  function replay() { time = 0; playing = true; last = performance.now(); updateClock(); drawPreview(); }
  function tick(now) {
    if (playing && !busy) { time = (time + Math.min(.1, (now - last) / 1000)) % cycle(); drawPreview(); updateClock(); }
    last = now; requestAnimationFrame(tick);
  }
  numericKeys.forEach(key => $(key).addEventListener('input', () => { state.scene[key] = Number($(key).value); syncControls(); persist(); drawPreview(); }));
  numericKeys.forEach(key => $(key).addEventListener('change', record));
  colorKeys.forEach(key => $(colorFields[key]).addEventListener('input', () => { state.scene[key] = $(colorFields[key]).value; persist(); drawPreview(); }));
  colorKeys.forEach(key => $(colorFields[key]).addEventListener('change', record));
  $('text').addEventListener('input', () => { state.scene.text = $('text').value; persist(); drawPreview(); loadFont(); });
  $('text').addEventListener('change', record);
  $('font').addEventListener('change', () => { state.scene.font = $('font').value; record(); loadFont(); });
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

  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function applyScheme(raw, presentation = {}) {
    state = readScheme(raw);
    const reduceMotion = presentation.reducedMotion === 'pause' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    time = reduceMotion ? state.scene.intro / state.scene.speed : 0;
    playing = presentation.autoplay !== false && !reduceMotion;
    syncControls(); await loadFont(); updateClock(); drawPreview();
  }
  $('saveScheme').onclick = () => { persist(); download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'metallic-text-project.json'); $('schemeStatus').textContent = label('方案已保存并下载', 'Project saved and downloaded'); };
  $('importScheme').onclick = () => $('schemeFile').click();
  $('schemeFile').onchange = async () => {
    try { const file = $('schemeFile').files[0]; if (!file) return; await applyScheme(JSON.parse(await file.text()), { autoplay: false }); record(); $('schemeStatus').textContent = label('方案已导入', 'Project imported'); }
    catch (error) { $('schemeStatus').textContent = `${label('导入失败', 'Import failed')}: ${error.message}`; }
    finally { $('schemeFile').value = ''; }
  };
  $('restoreScheme').onclick = async () => { await applyScheme(DEFAULT); record(); };
  $('clearScheme').onclick = async () => { const clean = structuredClone(DEFAULT); clean.scene.text = ''; await applyScheme(clean, { autoplay: false }); record(); };
  document.addEventListener('keydown', async event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA/.test(event.target.tagName)) return;
    const next = historyIndex + (event.shiftKey ? 1 : -1);
    if (next < 0 || next >= history.length) return;
    event.preventDefault(); historyIndex = next; await applyScheme(JSON.parse(history[next]), { autoplay: false }); persist();
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
      await loadFont();
      const draw = at => render(output, at, width, height);
      let blob;
      if (format === 'png') { draw(time); blob = await new Promise(resolve => output.toBlob(resolve, 'image/png')); }
      else {
        const frames = Math.ceil(seconds * fps); let gif;
        if (format === 'mp4') {
          await loadScript('js/h264-mp4-encoder.web.js'); encoder = await window.HME.createH264MP4Encoder();
          Object.assign(encoder, { width, height, frameRate: fps, kbps: Math.max(1500, Math.round(width * height * .025)), groupOfPictures: fps, outputFilename: 'metallic-text.mp4' }); encoder.initialize();
        } else {
          await loadScript('js/continuation-gif.js'); gif = new window.GIF({ workers: 2, quality: 8, repeat: 0, width, height, workerScript: 'js/continuation-gif.worker.js' });
        }
        for (let frame = 0; frame < frames; frame++) {
          draw((frame / fps) % cycle());
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
  window.CellMotionMetallicText = { getScheme: () => structuredClone(state), applyScheme, seek, render, exportArtwork, get time() { return time; }, get playing() { return playing; } };
  syncControls(); localize();
  new ResizeObserver(fitStage).observe($('stageArea'));
  loadFont().then(() => {
    window.CellMotionBridge.register({ effectId: 'metallic-text', getScheme: () => structuredClone(state), applyScheme,
      play: () => { playing = true; last = performance.now(); updateClock(); }, pause: () => { playing = false; updateClock(); }, restart: replay, seek, durationMs: () => cycle() * 1000 });
  });
  requestAnimationFrame(tick);
})();
