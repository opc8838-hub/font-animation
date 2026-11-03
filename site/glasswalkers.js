(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('glassCanvas');
  if (!canvas) return;
  canvas.getContext('2d', { alpha: false });
  const renderer = new window.GlassWalkersRenderer();
  const defaults = Object.freeze({
    version: 1, width: 1920, height: 1080, peopleCount: 6, animalCount: 1,
    animalKind: 'cat', direction: 'mixed', speed: 1, figureSize: 100,
    softness: 70, halftone: 75, background: '#f8f8f8', shadow: '#0a0a0e', markers: true, trackingMode: 'person'
  });
  const storageKey = 'cellmotion-glasswalkers-v1';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const number = (value, fallback, min, max) => clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max);
  const hex = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : null;
  const cycle = () => 12 / state.speed;
  function normalize(input) {
    const source = input && typeof input === 'object' ? input : defaults;
    return {
      version: 1,
      width: Math.round(number(source.width, defaults.width, 320, 3840) / 2) * 2,
      height: Math.round(number(source.height, defaults.height, 320, 3840) / 2) * 2,
      peopleCount: Math.round(number(source.peopleCount, defaults.peopleCount, 0, 8)),
      animalCount: Math.round(number(source.animalCount, defaults.animalCount, 0, 4)),
      animalKind: ['cat', 'dog'].includes(source.animalKind) ? source.animalKind : defaults.animalKind,
      direction: ['mixed', 'horizontal', 'vertical'].includes(source.direction) ? source.direction : defaults.direction,
      speed: number(source.speed, defaults.speed, .5, 2),
      figureSize: number(source.figureSize, defaults.figureSize, 60, 160),
      softness: number(source.softness, defaults.softness, 0, 100),
      halftone: number(source.halftone, defaults.halftone, 0, 100),
      background: hex(source.background) || defaults.background,
      shadow: hex(source.shadow) || defaults.shadow,
      markers: source.markers !== false,
      trackingMode: source.trackingMode === 'feet' ? 'feet' : 'person'
    };
  }
  const galleryEntry = new URLSearchParams(location.search).has('from');
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (_) {}
  let state = normalize(galleryEntry ? defaults : saved || defaults);
  if (new URLSearchParams(location.search).get('tracking') === 'feet') state = { ...state, markers: true, trackingMode: 'feet' };
  let language = localStorage.getItem('cellmotion-site-language') === 'en' ? 'en' : 'zh';
  let theme = localStorage.getItem('cellmotion-site-theme') === 'light' ? 'light' : 'dark';
  let selectedFigure = 'people', panel = 'figure', playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time = 0, started = performance.now(), raf = 0, autosave = 0, exporting = false;
  const frame = $('compositionFrame');
  const stage = document.querySelector('.gm-stage');
  const controls = ['peopleCount', 'animalCount', 'animalKind', 'direction', 'speed', 'figureSize', 'softness', 'halftone', 'background', 'shadow', 'markers', 'trackingMode'];
  const labels = {
    people: ['行人穿行', 'People crossing'],
    animal: ['人流与动物', 'People and animals'],
    crossing: ['继续穿行', 'Ongoing crossings']
  };
  function say(zh, en) { return language === 'en' ? en : zh; }
  function status(id, zh, en) { $(id).textContent = say(zh, en); }
  function saveSoon() {
    clearTimeout(autosave);
    autosave = setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {} }, 250);
  }
  function download(blob, filename) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function render(target, seconds, scene = state) {
    renderer.draw(target, scene, seconds);
    if (target === canvas) {
      canvas.dataset.time = seconds.toFixed(3);
      canvas.dataset.people = String(state.peopleCount);
      canvas.dataset.animals = String(state.animalCount);
    }
  }
  function dimensions() { return [state.width, state.height]; }
  function fit() {
    const [width, height] = dimensions();
    const spaceWidth = Math.max(180, stage.clientWidth - 36);
    const spaceHeight = Math.max(160, stage.clientHeight - 95);
    const displayWidth = Math.min(spaceWidth, spaceHeight * width / height, 1100);
    const displayHeight = displayWidth * height / width;
    frame.style.width = displayWidth + 'px';
    frame.style.height = displayHeight + 'px';
    frame.style.aspectRatio = width + '/' + height;
    const previewScale = Math.min(1, 1100 / width, 850 / height);
    canvas.width = Math.max(2, Math.round(width * previewScale));
    canvas.height = Math.max(2, Math.round(height * previewScale));
    $('canvasDimensions').textContent = width + ' × ' + height;
    render(canvas, time);
  }
  function updateTimeline() {
    const total = cycle(), u = time / total;
    $('scrubber').max = String(total);
    $('scrubber').value = String(clamp(time, 0, total));
    $('timeReadout').textContent = time.toFixed(2) + ' / ' + total.toFixed(2) + ' s';
    $('playhead').style.left = (u * 100) + '%';
    const beats = [
      ['people', 0, 1 / 6, '0–' + (total / 6).toFixed(1) + 's'],
      ['animal', 1 / 6, 7 / 12, (total * 7 / 12).toFixed(1) + 's'],
      ['crossing', .75, .25, (total * .25).toFixed(1) + 's']
    ];
    const bar = $('timeline');
    bar.querySelectorAll('button').forEach(button => button.remove());
    for (const [name, start, length, duration] of beats) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'me-choreo-block is-' + name;
      button.style.width = 'calc(' + (length * 100) + '% - 3px)';
      button.dataset.seek = String(start * total);
      button.setAttribute('role', 'listitem');
      button.setAttribute('aria-label', say(labels[name][0], labels[name][1]) + ' · ' + duration);
      const strong = document.createElement('strong'), small = document.createElement('small');
      strong.textContent = say(labels[name][0], labels[name][1]);
      small.textContent = duration;
      button.append(strong, small);
      bar.append(button);
    }
  }
  function redraw() {
    render(canvas, time);
    $('scrubber').value = String(time);
    $('timeReadout').textContent = time.toFixed(2) + ' / ' + cycle().toFixed(2) + ' s';
    $('playhead').style.left = (time / cycle() * 100) + '%';
  }
  function tick(now) {
    if (!playing) { raf = 0; return; }
    time = ((now - started) / 1000) % cycle();
    if (!exporting) redraw();
    raf = requestAnimationFrame(tick);
  }
  function syncPlayback() {
    $('pause').textContent = playing ? say('Ⅱ 暂停', 'Ⅱ Pause') : say('▶ 播放', '▶ Play');
    $('pause').setAttribute('aria-pressed', String(!playing));
  }
  function start() {
    cancelAnimationFrame(raf);
    started = performance.now() - time * 1000;
    if (playing) raf = requestAnimationFrame(tick);
    syncPlayback();
  }
  function selectPanel(name) {
    panel = name;
    document.querySelectorAll('.tc-properties').forEach(item => { item.hidden = item.dataset.panel !== name; });
    document.querySelectorAll('.tc-tabs button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.panel === name)));
  }
  function selectFigure(name) {
    selectedFigure = name;
    document.querySelectorAll('[data-figure]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.figure === name)));
    $('peoplePanel').hidden = name !== 'people';
    $('animalPanel').hidden = name !== 'animals';
    selectPanel('figure');
  }
  function syncLanguage() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(item => { item.textContent = item.dataset[language]; });
    $('languageToggle').textContent = language === 'en' ? '中' : 'EN';
    $('peopleSummary').textContent = language === 'en' ? state.peopleCount + ' people · crossing' : state.peopleCount + ' 人 · 交错穿行';
    $('animalSummary').textContent = language === 'en' ? state.animalCount + ' · ' + state.animalKind : state.animalCount + ' 只 · ' + (state.animalKind === 'dog' ? '狗' : '猫') + '影经过';
    const tracking = state.markers && state.trackingMode === 'feet';
    $('trackingToggle').setAttribute('aria-pressed', String(tracking));
    $('trackingToggle').textContent = tracking ? say('脚步追踪：开', 'Foot tracking: On') : say('脚步追踪：关', 'Foot tracking: Off');
    updateTimeline();
    syncPlayback();
  }
  function syncForm() {
    for (const id of controls) {
      const element = $(id);
      if (element.type === 'checkbox') element.checked = state[id];
      else element.value = state[id];
      const output = document.querySelector('output[for="' + id + '"]');
      if (output) output.textContent = id === 'speed' ? state[id].toFixed(2) + '×' : String(state[id]) + (['figureSize', 'softness', 'halftone'].includes(id) ? '%' : '');
    }
    $('trackingMode').disabled = !state.markers;
    const preset = state.width + 'x' + state.height;
    $('canvasPreset').value = [...$('canvasPreset').options].some(option => option.value === preset) ? preset : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom';
    $('canvasWidth').value = String(state.width);
    $('canvasHeight').value = String(state.height);
    syncLanguage();
    fit();
  }
  function apply(next) {
    state = normalize(next);
    time = 0;
    syncForm();
    start();
    saveSoon();
  }
  function exportCanvas() {
    const output = document.createElement('canvas');
    output.width = state.width; output.height = state.height;
    return output;
  }
  function exportLength() {
    const selected = $('exportDuration').value;
    return selected === 'cycle' ? cycle() : selected === 'custom' ? number($('customDuration').value, 5, .5, 30) : Number(selected);
  }
  function busy(value, zh, en) {
    exporting = value;
    ['exportPng', 'exportGif', 'exportMp4'].forEach(id => { $(id).disabled = value; });
    status('exportStatus', zh, en);
  }
  async function yieldFrame() { await new Promise(resolve => setTimeout(resolve, 0)); }
  $('exportPng').addEventListener('click', () => {
    const output = exportCanvas();
    render(output, time);
    output.toBlob(blob => {
      if (blob) download(blob, 'glass-walkers-' + state.width + 'x' + state.height + '.png');
      status('exportStatus', blob ? 'PNG 已生成' : 'PNG 生成失败', blob ? 'PNG ready' : 'PNG failed');
    }, 'image/png');
  });
  $('exportGif').addEventListener('click', async () => {
    if (exporting) return;
    if (!window.GIF) { status('exportStatus', 'GIF 编码器未加载', 'GIF encoder unavailable'); return; }
    const output = exportCanvas(), fps = Number($('exportFps').value), length = exportLength(), scene = { ...state };
    const frames = Math.ceil(fps * length);
    busy(true, '正在准备 GIF…', 'Preparing GIF…');
    try {
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: 'js/continuation-gif.worker.js' });
      for (let i = 0; i < frames; i++) {
        render(output, i / fps, scene);
        gif.addFrame(output, { copy: true, delay: 1000 / fps });
        if (i % 4 === 0) { status('exportStatus', '准备 GIF ' + (i + 1) + '/' + frames, 'Preparing GIF ' + (i + 1) + '/' + frames); await yieldFrame(); }
      }
      gif.on('progress', progress => status('exportStatus', 'GIF 编码 ' + Math.round(progress * 100) + '%', 'Encoding GIF ' + Math.round(progress * 100) + '%'));
      gif.on('finished', blob => { download(blob, 'glass-walkers-' + state.width + 'x' + state.height + '.gif'); busy(false, 'GIF 已生成', 'GIF ready'); });
      gif.on('abort', () => busy(false, 'GIF 已中止', 'GIF aborted'));
      gif.render();
    } catch (error) { busy(false, 'GIF 失败：' + error.message, 'GIF failed: ' + error.message); }
  });
  $('exportMp4').addEventListener('click', async () => {
    if (exporting) return;
    if (!window.HME?.createH264MP4Encoder) { status('exportStatus', 'MP4 编码器未加载', 'MP4 encoder unavailable'); return; }
    const output = exportCanvas(), fps = Number($('exportFps').value), frames = Math.ceil(exportLength() * fps), scene = { ...state };
    const context = output.getContext('2d', { willReadFrequently: true });
    let encoder;
    busy(true, '正在生成 MP4…', 'Rendering MP4…');
    try {
      encoder = await HME.createH264MP4Encoder();
      encoder.outputFilename = 'glass-walkers-' + output.width + 'x' + output.height + '.mp4';
      encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps;
      encoder.kbps = Math.min(16000, Math.max(1500, Math.round(output.width * output.height * fps / 5000)));
      encoder.groupOfPictures = fps;
      encoder.initialize();
      for (let i = 0; i < frames; i++) {
        render(output, i / fps, scene);
        encoder.addFrameRgba(context.getImageData(0, 0, output.width, output.height).data);
        if (i % 2 === 0) {
          const progress = Math.round((i + 1) / frames * 100);
          status('exportStatus', '正在生成 MP4 ' + progress + '%', 'Rendering MP4 ' + progress + '%');
          await yieldFrame();
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      download(new Blob([bytes], { type: 'video/mp4' }), encoder.outputFilename);
      busy(false, 'MP4 已生成', 'MP4 ready');
    } catch (error) { busy(false, 'MP4 失败：' + error.message, 'MP4 failed: ' + error.message); }
    finally { try { encoder?.delete(); } catch (_) {} }
  });
  for (const id of controls) {
    const element = $(id);
    element.addEventListener('input', () => {
      const oldCycle = cycle(), progress = time / oldCycle;
      state[id] = element.type === 'checkbox' ? element.checked : element.type === 'range' ? Number(element.value) : element.value;
      state = normalize(state);
      time = progress * cycle();
      syncForm();
      start();
      saveSoon();
    });
  }
  $('canvasPreset').addEventListener('change', event => {
    $('customSize').hidden = event.target.value !== 'custom';
    if (event.target.value === 'custom') return;
    const [width, height] = event.target.value.split('x').map(Number);
    state.width = width; state.height = height;
    syncForm(); saveSoon();
  });
  for (const id of ['canvasWidth', 'canvasHeight']) {
    $(id).addEventListener('change', () => {
      state.width = number($('canvasWidth').value, state.width, 320, 3840);
      state.height = number($('canvasHeight').value, state.height, 320, 3840);
      state = normalize(state);
      syncForm(); saveSoon();
    });
  }
  $('exportDuration').addEventListener('change', () => { $('customDurationRow').hidden = $('exportDuration').value !== 'custom'; });
  $('replay').addEventListener('click', () => { time = 0; playing = true; start(); redraw(); });
  $('pause').addEventListener('click', () => { playing = !playing; start(); });
  $('trackingToggle').addEventListener('click', () => {
    const tracking = state.markers && state.trackingMode === 'feet';
    state.trackingMode = tracking ? 'person' : 'feet';
    state.markers = true;
    syncForm(); saveSoon();
  });
  $('scrubber').addEventListener('input', event => { playing = false; time = clamp(Number(event.target.value), 0, cycle()); start(); redraw(); });
  $('timeline').addEventListener('click', event => {
    const button = event.target.closest('[data-seek]');
    if (!button) return;
    playing = false; time = Number(button.dataset.seek) + .05; start(); redraw();
  });
  document.querySelectorAll('.tc-tabs button').forEach(button => button.addEventListener('click', () => selectPanel(button.dataset.panel)));
  document.querySelectorAll('[data-figure]').forEach(button => button.addEventListener('click', () => selectFigure(button.dataset.figure)));
  $('exportShortcut').addEventListener('click', () => selectPanel('export'));
  $('themeToggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.editorTheme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('cellmotion-site-theme', theme);
  });
  $('languageToggle').addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh';
    localStorage.setItem('cellmotion-site-language', language);
    syncLanguage();
  });
  $('saveScheme').addEventListener('click', () => {
    localStorage.setItem(storageKey, JSON.stringify(state));
    download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'glass-walkers-scheme.json');
    status('schemeStatus', '方案已保存', 'Scheme saved');
  });
  $('importScheme').addEventListener('click', () => $('schemeFile').click());
  $('schemeFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { apply(JSON.parse(await file.text())); status('schemeStatus', '方案已导入', 'Scheme imported'); }
    catch (_) { status('schemeStatus', '无法读取方案', 'Could not read scheme'); }
    event.target.value = '';
  });
  $('resetScheme').addEventListener('click', () => { apply(defaults); status('schemeStatus', '已恢复默认', 'Default restored'); });
  $('clearScheme').addEventListener('click', () => { apply({ ...state, peopleCount: 0, animalCount: 0, markers: false }); status('schemeStatus', '场景已清空', 'Scene cleared'); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (playing) start();
  });
  new ResizeObserver(fit).observe(stage);
  document.body.dataset.editorTheme = theme;
  document.documentElement.style.colorScheme = theme;
  syncForm(); selectFigure('people'); updateTimeline(); redraw(); start();
})();
