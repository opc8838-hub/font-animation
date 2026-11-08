(() => {
  'use strict';
  const $ = id => document.getElementById(id), clone = value => structuredClone(value);
  const canvas = $('paperCanvas'), stage = document.querySelector('.gm-stage'), frame = $('compositionFrame');
  const renderer = new PaperType.Renderer(), params = new URLSearchParams(location.search);
  const previewMode = params.has('preview'), storageKey = 'cellmotion-paper-type-v1';
  const specimen = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 & . , : ; ! ? @ # %';
  const rowDefault = (text, index) => ({ id: 'paper-' + index, text, font: 'stg:papyrus', fontSize: index === 2 ? 180 : 280,
    textColor: '#292923', align: 'left', showSpecimen: true, specimen, backgroundColor: '#e8e3d3', paper: '3', media: null });
  const defaults = { effect: 'paper-type', version: 1, width: 1080, height: 1440, layout: 'vertical', gap: 24,
    canvasColor: '#f8f7f2', speed: 1, reveal: .85, stagger: .22, hold: 4, fade: .7,
    rows: ['16', 'PAPERS', 'jpg.'].map((text, index) => rowDefault(text, index + 1)) };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = (v, fallback, lo, hi) => clamp(Number.isFinite(Number(v)) ? Number(v) : fallback, lo, hi);
  const color = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v || '') ? v : fallback;
  function normalize(input) {
    const s = input || defaults, ids = new Set();
    const rows = Array.isArray(s.rows) && s.rows.length ? s.rows : defaults.rows;
    const width = Math.round(num(s.width, 1080, 320, 3840) / 2) * 2, height = Math.round(num(s.height, 1440, 320, 3840) / 2) * 2;
    const regions = PaperType.regions({ width, height, rows, layout: s.layout === 'horizontal' ? 'horizontal' : 'vertical', gap: num(s.gap, 24, 0, 80) });
    return { effect: 'paper-type', version: 1,
      width: Math.round(num(s.width, 1080, 320, 3840) / 2) * 2, height: Math.round(num(s.height, 1440, 320, 3840) / 2) * 2,
      layout: s.layout === 'horizontal' ? 'horizontal' : 'vertical', gap: num(s.gap, 24, 0, 80), canvasColor: color(s.canvasColor, '#f8f7f2'),
      speed: num(s.speed, 1, .5, 2), reveal: num(s.reveal, .85, .2, 3), stagger: num(s.stagger, .22, 0, 1), hold: num(s.hold, 4, .5, 12), fade: num(s.fade, .7, .2, 3),
      rows: rows.map((r, i) => {
        r = r && typeof r === 'object' ? r : {};
        let id = String(r.id || 'paper-' + (i + 1));
        if (ids.has(id)) id = crypto.randomUUID();
        ids.add(id);
        const uploaded = CellMotionBackgroundMedia.normalize(r.media);
        if (uploaded && !/^(data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,|assets\/)/i.test(uploaded.url)) throw new Error('Unsupported media source');
        return { id, text: String(r.text ?? ''), font: 'stg:' + (STGFontLibrary.idFor(r.font) || 'papyrus'), fontSize: num(r.fontSize, 180, 40, 500),
          fontSizePx: num(r.fontSizePx, num(r.fontSize, 180, 40, 500) * regions[i].width / 1000, 12, 1000),
          tracking: num(r.tracking, 0, -.05, .2), lineHeight: num(r.lineHeight, 1.4, 1.1, 2.4), autoFit: r.autoFit !== false,
          textColor: color(r.textColor, '#292923'), align: ['left', 'center', 'right'].includes(r.align) ? r.align : 'left',
          showSpecimen: r.showSpecimen !== false, specimen: String(r.specimen ?? specimen), backgroundColor: color(r.backgroundColor, '#e8e3d3'),
          paper: ['1', '2', '3', 'color', 'upload'].includes(r.paper) ? r.paper : '3', media: uploaded };
      }) };
  }
  // IndexedDB preserves uploaded media beyond localStorage's small text quota.
  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open(storageKey, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('schemes');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  async function stored(value) {
    const db = await database, writing = value !== undefined;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('schemes', writing ? 'readwrite' : 'readonly');
      const request = writing ? transaction.objectStore('schemes').put(value, 'current') : transaction.objectStore('schemes').get('current');
      transaction.oncomplete = () => resolve(request.result); transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  let state = normalize(defaults), selected = state.rows[0].id, time = PaperType.timing(state).entrance + .3;
  let language = localStorage.getItem('cellmotion-site-language') === 'en' ? 'en' : 'zh';
  let theme = localStorage.getItem('cellmotion-site-theme') === 'dark' ? 'dark' : 'light';
  let playing = previewMode && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = performance.now(), raf = 0, saving = 0, painting = false, dirty = false, exporting = false, revision = 0;
  let ready = false, history = [], historyIndex = -1;
  const row = () => state.rows.find(item => item.id === selected) || state.rows[0];
  const cycle = () => PaperType.timing(state).duration;
  const say = (zh, en) => language === 'en' ? en : zh;
  const status = (id, zh, en) => { $(id).textContent = say(zh, en); };
  const rowFields = ['text', 'font', 'fontSize', 'tracking', 'lineHeight', 'autoFit', 'textColor', 'align', 'showSpecimen', 'specimen', 'paper', 'backgroundColor'];
  const globalFields = ['layout', 'gap', 'canvasColor', 'speed', 'reveal', 'stagger', 'hold', 'fade'];
  function remember() {
    const snapshot = JSON.stringify(state);
    if (history[historyIndex] === snapshot) return;
    history.splice(historyIndex + 1); history.push(snapshot);
    if (history.length > 30) history.shift();
    historyIndex = history.length - 1;
  }
  function persist() {
    if (previewMode) return;
    clearTimeout(saving);
    saving = setTimeout(() => {
      remember(); stored(clone(state)).catch(() => status('schemeStatus', '自动保存失败，请下载方案保留内容。', 'Autosave failed. Download your scheme to keep it.'));
    }, 250);
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function clockUI() {
    $('scrubber').max = cycle(); $('scrubber').value = time;
    $('timeReadout').textContent = time.toFixed(2) + ' / ' + cycle().toFixed(2) + ' s';
    $('playhead').style.left = time / cycle() * 100 + '%';
    document.querySelectorAll('#timeline button').forEach(button => button.classList.toggle('is-active', time >= Number(button.dataset.seek) && time < Number(button.dataset.end)));
  }
  async function paint() {
    dirty = true;
    if (painting || !ready) return;
    painting = true; dirty = false;
    const scene = state, at = time, version = revision;
    try {
      await renderer.ready(scene); await renderer.prepare(scene, at);
      if (version === revision) {
        renderer.draw(canvas, scene, at); canvas.dataset.time = String(at); canvas.dataset.ready = 'true';
        const actual = renderer.metrics.get(selected)?.fontSizePx;
        $('typeMetrics').textContent = say('实际绘制 ', 'Rendered at ') + (actual || 0).toFixed(1) + ' px' + (row().autoFit ? say(' · 自动适应区域', ' · shrink to fit') : '');
      }
    } catch (error) { playing = false; start(); status('mediaStatus', '资源加载失败：' + error.message, 'Resource failed: ' + error.message); }
    finally { painting = false; if (dirty || version !== revision) void paint(); }
  }
  function redraw() { clockUI(); void paint(); }
  function fit() {
    const width = Math.max(1, stage.clientWidth - (previewMode ? 0 : 36));
    const height = Math.max(1, stage.clientHeight - (previewMode ? 0 : 82));
    const w = Math.min(width, height * state.width / state.height);
    frame.style.width = w + 'px'; frame.style.height = w * state.height / state.width + 'px';
    frame.style.aspectRatio = state.width + '/' + state.height;
    const scale = Math.min(1, 1200 / state.width, 1100 / state.height);
    canvas.width = Math.round(state.width * scale); canvas.height = Math.round(state.height * scale);
    $('canvasDimensions').textContent = state.width + ' × ' + state.height; redraw();
  }
  function tick(now) {
    if (!playing) return;
    time = ((now - started) / 1000) % cycle(); redraw(); raf = requestAnimationFrame(tick);
  }
  function start() {
    cancelAnimationFrame(raf); started = performance.now() - time * 1000;
    $('pause').textContent = playing ? say('Ⅱ 暂停', 'Ⅱ Pause') : say('▶ 播放', '▶ Play');
    $('pause').setAttribute('aria-pressed', String(!playing));
    if (playing) raf = requestAnimationFrame(tick);
  }
  function seek(seconds) { playing = false; time = clamp(Number(seconds) || 0, 0, cycle() - .001); start(); redraw(); }
  function holdFrame() { seek(PaperType.timing(state).entrance + Math.min(.3, state.hold / state.speed / 2)); }
  function selectPanel(name) {
    document.querySelectorAll('.tc-properties').forEach(el => { el.hidden = el.dataset.panel !== name; });
    document.querySelectorAll('.tc-tabs button').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.panel === name)));
  }
  function renderRows() {
    $('rowList').replaceChildren(...state.rows.map((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'tc-row-select';
      button.dataset.row = item.id; button.setAttribute('aria-pressed', String(item.id === selected));
      const number = document.createElement('span'), title = document.createElement('strong'), detail = document.createElement('small');
      number.className = 'tc-row-number'; number.textContent = String(index + 1).padStart(2, '0');
      title.className = 'tc-row-text'; title.textContent = item.text || say('空白文字', 'Empty text');
      detail.className = 'tc-row-description'; detail.textContent = (STGFontLibrary.preset(item.font)?.label || 'Papyrus') + ' · ' + say('暂停修改', 'Pause to edit');
      button.append(number, title, detail); return button;
    }));
    $('moveUp').disabled = state.rows[0].id === selected; $('moveDown').disabled = state.rows.at(-1).id === selected;
    $('deleteRow').disabled = state.rows.length === 1;
  }
  function timeline() {
    const timing = PaperType.timing(state), phases = [
      ['reveal', say('逐块显现', 'Reveal'), timing.entrance], ['hold', say('同屏停留', 'Together'), timing.hold], ['exit', say('墨迹淡出', 'Fade'), timing.fade]
    ];
    $('timeline').querySelectorAll('button').forEach(el => el.remove());
    let cursor = 0;
    for (const [kind, label, length] of phases) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'me-choreo-block is-' + kind;
      button.style.flex = String(length); button.dataset.seek = cursor; button.dataset.end = cursor + length;
      button.setAttribute('aria-label', label + ' · ' + length.toFixed(2) + ' s');
      const name = document.createElement('strong'), duration = document.createElement('small');
      name.textContent = label; duration.textContent = length.toFixed(2) + ' s'; button.append(name, duration); $('timeline').append(button); cursor += length;
    }
    clockUI();
  }
  async function trimUI() {
    const item = row(), runtime = renderer.backgrounds.get(item.id), visible = item.paper === 'upload' && runtime?.video;
    $('videoTrim').hidden = !visible;
    if (!visible) return;
    const bounds = CellMotionBackgroundMedia.clip(item.media, runtime.duration);
    for (const [id, value] of [['trimStart', bounds.start], ['trimEnd', bounds.end]]) {
      for (const suffix of ['', 'Handle']) { $(id + suffix).max = runtime.duration; $(id + suffix).value = value.toFixed(2); }
    }
    try {
      const film = await runtime.filmstrip();
      if (film && selected === item.id) $('filmstrip').getContext('2d').drawImage(film, 0, 0);
    } catch (error) { status('mediaStatus', error.message, error.message); }
  }
  function syncForm() {
    const item = row();
    for (const id of [...rowFields, ...globalFields]) {
      const el = $(id), value = id === 'fontSize' ? item.fontSizePx : id === 'lineHeight' ? item.lineHeight ?? 1.4 : rowFields.includes(id) ? item[id] : state[id];
      if (el.type === 'checkbox') el.checked = value;
      else if (document.activeElement !== el) el.value = value;
      const output = document.querySelector(`output[for="${id}"]`);
      if (output) output.textContent = value + (id === 'speed' ? '×' : ['reveal', 'stagger', 'hold', 'fade'].includes(id) ? ' s' : '');
    }
    const currentFace = STGFontLibrary.preset(item.font);
    const variants = STGFontLibrary.fonts.filter(face => face.family === currentFace.family).sort((a, b) => a.weight - b.weight);
    const signature = language + ':' + variants.map(face => face.id).join(',');
    if ($('fontWeight').dataset.variants !== signature) {
      $('fontWeight').replaceChildren(...variants.map(face => {
        const option = document.createElement('option'); option.value = 'stg:' + face.id;
        option.textContent = face.weight + (face.style === 'italic' ? ' · Italic' : '') + (variants.length === 1 ? say(' · 唯一收录字重', ' · only available weight') : ''); return option;
      }));
      $('fontWeight').dataset.variants = signature;
    }
    $('fontWeight').value = item.font; $('fontWeight').disabled = exporting || variants.length === 1;
    $('specimen').disabled = !item.showSpecimen;
    $('blockTitle').textContent = String(state.rows.indexOf(item) + 1).padStart(2, '0') + ' · ' + (item.text.split('\n')[0] || say('文字', 'Text'));
    const preset = state.width + 'x' + state.height;
    $('canvasPreset').value = [...$('canvasPreset').options].some(el => el.value === preset) ? preset : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom'; $('canvasWidth').value = state.width; $('canvasHeight').value = state.height;
    $('mediaStatus').textContent = item.paper === 'upload' ? item.media?.name || say('选择文件上传', 'Choose a file') : '';
    renderRows(); timeline(); void trimUI(); document.dispatchEvent(new CustomEvent('tc-controls-synced'));
  }
  function syncLanguage() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN'; document.body.dataset.editorLanguage = language;
    document.querySelectorAll('[data-zh][data-en]').forEach(el => { el.textContent = el.dataset[language]; });
    $('languageToggle').textContent = language === 'en' ? '中' : 'EN';
    syncForm(); start(); document.dispatchEvent(new CustomEvent('tc-languagechange', { detail: { language } }));
  }
  function changed({ resize = false, stable = true } = {}) {
    state = normalize(state); revision++;
    if (!state.rows.some(item => item.id === selected)) selected = state.rows[0].id;
    if (stable) holdFrame(); else { time = Math.min(time, cycle() - .001); start(); redraw(); }
    syncForm(); if (resize) fit(); persist();
  }
  async function apply(next) {
    if (next?.effect !== 'paper-type' || next.version !== 1 || !Array.isArray(next.rows) || !next.rows.length) throw new Error('Invalid Paper Type scheme');
    const normalized = normalize(next);
    // Verify imported resources before replacing the user's current work.
    const probe = new PaperType.Renderer();
    try { await probe.ready(normalized); } finally { probe.dispose(); }
    state = normalized; selected = state.rows[0].id; changed({ resize: true });
  }
  $('rowList').addEventListener('click', event => {
    const button = event.target.closest('[data-row]'); if (!button) return;
    selected = button.dataset.row; selectPanel('block'); syncForm(); holdFrame();
  });
  $('addRow').addEventListener('click', () => {
    const item = { ...rowDefault(say('新字样', 'New type'), state.rows.length + 1), id: crypto.randomUUID() };
    state.rows.push(item); selected = item.id; changed(); selectPanel('block');
  });
  for (const [id, offset] of [['moveUp', -1], ['moveDown', 1]]) $(id).addEventListener('click', () => {
    const index = state.rows.findIndex(item => item.id === selected), target = index + offset;
    if (target < 0 || target >= state.rows.length) return;
    [state.rows[index], state.rows[target]] = [state.rows[target], state.rows[index]]; changed();
  });
  $('deleteRow').addEventListener('click', () => { if (state.rows.length > 1) { state.rows = state.rows.filter(item => item.id !== selected); changed(); } });
  for (const id of [...rowFields, ...globalFields]) $(id).addEventListener('input', () => {
    const el = $(id), target = rowFields.includes(id) ? row() : state;
    if (id === 'paper' && el.value === 'upload' && !row().media) { el.value = row().paper; $('backgroundFile').click(); return; }
    if (el.type === 'number' && (el.value === '' || !Number.isFinite(Number(el.value)))) return;
    target[id === 'fontSize' ? 'fontSizePx' : id] = el.type === 'checkbox' ? el.checked : ['range', 'number'].includes(el.type) ? Number(el.value) : el.value;
    changed();
  });
  $('fontWeight').addEventListener('input', () => { row().font = $('fontWeight').value; changed(); });
  $('canvasPreset').addEventListener('change', () => {
    $('customSize').hidden = $('canvasPreset').value !== 'custom';
    if ($('canvasPreset').value === 'custom') return;
    [state.width, state.height] = $('canvasPreset').value.split('x').map(Number); changed({ resize: true });
  });
  for (const id of ['canvasWidth', 'canvasHeight']) $(id).addEventListener('change', () => {
    state.width = Number($('canvasWidth').value); state.height = Number($('canvasHeight').value); changed({ resize: true });
  });
  $('uploadBackground').addEventListener('click', () => $('backgroundFile').click());
  $('backgroundFile').addEventListener('change', async event => {
    const file = event.target.files?.[0], owner = row().id; event.target.value = ''; if (!file) return;
    status('mediaStatus', '正在读取背景…', 'Loading background…');
    let probe;
    try {
      const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const uploaded = { url, fileType: file.type, name: file.name, videoStart: 0, videoEnd: null };
      probe = CellMotionBackgroundMedia.create(); await probe.setMedia(uploaded);
      const ownerRow = state.rows.find(item => item.id === owner); if (!ownerRow) return;
      ownerRow.media = uploaded; ownerRow.paper = 'upload'; changed();
      await renderer.ready(state); await trimUI(); redraw();
    } catch (error) { status('mediaStatus', '背景无法读取：' + error.message, 'Cannot read background: ' + error.message); }
    finally { probe?.dispose(); }
  });
  $('removeBackground').addEventListener('click', () => { row().media = null; row().paper = 'color'; changed(); });
  $('applyBackground').addEventListener('click', () => {
    const { paper, media, backgroundColor } = row();
    state.rows.forEach(item => Object.assign(item, { paper, media: clone(media), backgroundColor })); changed();
  });
  for (const id of ['trimStart', 'trimEnd', 'trimStartHandle', 'trimEndHandle']) $(id).addEventListener('input', () => {
    const item = row(), runtime = renderer.backgrounds.get(item.id); if (!runtime?.video || !item.media) return;
    const bounds = CellMotionBackgroundMedia.clip(item.media, runtime.duration), isStart = id.startsWith('trimStart');
    item.media.videoStart = isStart ? clamp(Number($(id).value), 0, bounds.end - .05) : bounds.start;
    item.media.videoEnd = isStart ? bounds.end : clamp(Number($(id).value), bounds.start + .05, runtime.duration); changed();
  });
  $('pause').addEventListener('click', () => { playing = !playing; start(); });
  $('replay').addEventListener('click', () => { time = 0; playing = true; start(); redraw(); });
  $('scrubber').addEventListener('input', () => seek($('scrubber').value));
  $('timeline').addEventListener('click', event => { const button = event.target.closest('[data-seek]'); if (button) seek(Number(button.dataset.seek) + .02); });
  document.querySelectorAll('.tc-tabs button').forEach(button => button.addEventListener('click', () => selectPanel(button.dataset.panel)));
  $('exportShortcut').addEventListener('click', () => { selectPanel('export'); if (matchMedia('(max-width:860px)').matches) $('exportPng').scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  $('themeToggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark'; document.body.dataset.editorTheme = theme; document.documentElement.style.colorScheme = theme;
    localStorage.setItem('cellmotion-site-theme', theme); localStorage.setItem('cellmotion-editor-theme', theme);
  });
  $('languageToggle').addEventListener('click', () => { language = language === 'en' ? 'zh' : 'en'; localStorage.setItem('cellmotion-site-language', language); syncLanguage(); });
  $('saveScheme').addEventListener('click', async () => {
    clearTimeout(saving); remember(); const snapshot = clone(state);
    download(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }), 'paper-type-scheme.json');
    try { await stored(snapshot); status('schemeStatus', '方案已保存', 'Scheme saved'); }
    catch (_) { status('schemeStatus', '方案已下载，本地自动保存不可用。', 'Scheme downloaded; local autosave unavailable.'); }
  });
  $('importScheme').addEventListener('click', () => $('schemeFile').click());
  $('schemeFile').addEventListener('change', async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try { await apply(JSON.parse(await file.text())); status('schemeStatus', '方案已导入', 'Scheme imported'); }
    catch (error) { status('schemeStatus', '导入失败：' + error.message, 'Import failed: ' + error.message); }
  });
  $('resetScheme').addEventListener('click', () => { state = normalize(defaults); selected = state.rows[0].id; changed({ resize: true }); status('schemeStatus', '已恢复默认三块字样', 'Three default blocks restored'); });
  $('clearScheme').addEventListener('click', () => {
    state.rows = [{ ...rowDefault('', 1), paper: 'color', showSpecimen: false, specimen: '' }]; selected = state.rows[0].id; changed(); status('schemeStatus', '已清空，可重新输入', 'Cleared; ready for your text');
  });
  document.addEventListener('keydown', event => {
    if (exporting || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    event.preventDefault(); clearTimeout(saving); remember(); const next = historyIndex + (event.shiftKey ? 1 : -1);
    if (next < 0 || next >= history.length) return;
    historyIndex = next; state = normalize(JSON.parse(history[next])); changed({ resize: true });
  });
  $('exportDuration').addEventListener('change', () => { $('customDurationRow').hidden = $('exportDuration').value !== 'custom'; });
  function exportLength() { const choice = $('exportDuration').value; return choice === 'cycle' ? cycle() : choice === 'custom' ? num($('customDuration').value, 5, .5, 30) : Number(choice); }
  function busy(value) {
    exporting = value; document.querySelector('.tc-content').inert = value;
    document.querySelectorAll('.gm-inspector input,.gm-inspector select,.gm-inspector button').forEach(el => { el.disabled = value; });
    $('pause').disabled = value; $('replay').disabled = value; $('scrubber').disabled = value;
    if (!value) syncForm();
  }
  async function exportFile(format) {
    if (exporting) return;
    playing = false; start(); busy(true);
    const scene = clone(state), output = document.createElement('canvas'), exportRenderer = new PaperType.Renderer();
    output.width = scene.width; output.height = scene.height;
    const fps = Number($('exportFps').value), frames = Math.ceil(exportLength() * fps), name = `paper-type-${scene.width}x${scene.height}.${format}`;
    let encoder;
    status('exportStatus', '正在准备导出…', 'Preparing export…');
    try {
      await exportRenderer.ready(scene);
      if (format === 'png') {
        await exportRenderer.prepare(scene, time); exportRenderer.draw(output, scene, time);
        const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG encoding failed'); download(blob, name);
      } else {
        let gif;
        if (format === 'gif') gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: 'js/continuation-gif.worker.js' });
        else {
          encoder = await HME.createH264MP4Encoder(); encoder.outputFilename = name;
          encoder.width = output.width; encoder.height = output.height; encoder.frameRate = fps; encoder.groupOfPictures = fps;
          encoder.kbps = Math.min(16000, Math.max(1500, Math.round(output.width * output.height * fps / 5000))); encoder.initialize();
        }
        const ctx = output.getContext('2d', { willReadFrequently: true });
        for (let i = 0; i < frames; i++) {
          await exportRenderer.prepare(scene, i / fps); exportRenderer.draw(output, scene, i / fps);
          if (gif) gif.addFrame(output, { copy: true, delay: 1000 / fps });
          else encoder.addFrameRgba(ctx.getImageData(0, 0, output.width, output.height).data);
          if (i % 3 === 0) { status('exportStatus', `绘制 ${i + 1} / ${frames}`, `Rendering ${i + 1} / ${frames}`); await new Promise(resolve => setTimeout(resolve, 0)); }
        }
        if (gif) {
          const blob = await new Promise((resolve, reject) => {
            gif.on('progress', progress => status('exportStatus', 'GIF 编码 ' + Math.round(progress * 100) + '%', 'Encoding GIF ' + Math.round(progress * 100) + '%'));
            gif.on('finished', resolve); gif.on('abort', () => reject(new Error('GIF aborted'))); gif.render();
          }); download(blob, name);
        } else { encoder.finalize(); download(new Blob([encoder.FS.readFile(name)], { type: 'video/mp4' }), name); }
      }
      status('exportStatus', format.toUpperCase() + ' 已生成', format.toUpperCase() + ' ready');
    } catch (error) { status('exportStatus', '导出失败：' + error.message, 'Export failed: ' + error.message); }
    finally { encoder?.delete(); exportRenderer.dispose(); busy(false); redraw(); }
  }
  for (const format of ['Png', 'Gif', 'Mp4']) $('export' + format).addEventListener('click', () => exportFile(format.toLowerCase()));
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else start(); });
  document.body.classList.toggle('is-preview', previewMode); document.body.dataset.editorTheme = theme; document.documentElement.style.colorScheme = theme;
  new ResizeObserver(fit).observe(stage);
  async function init() {
    try { if (!previewMode && !params.has('from')) { const saved = await stored(); if (saved) state = normalize(saved); } }
    catch (_) { status('schemeStatus', '本地方案不可用，可继续编辑和下载方案。', 'Local scheme unavailable; editing and downloads still work.'); }
    selected = state.rows[0].id; time = previewMode ? 0 : PaperType.timing(state).entrance + .3;
    ready = true; syncLanguage(); fit(); start(); remember();
  }
  window.CellMotionPaperType = { getScheme: () => clone(state), applyScheme: apply, seek,
    get time() { return time; }, get playing() { return playing; }, get ready() { return ready && canvas.dataset.ready === 'true'; },
    async render(target, seconds) { const scene = clone(state), instance = new PaperType.Renderer(); try { await instance.ready(scene); await instance.prepare(scene, seconds); instance.draw(target, scene, seconds); } finally { instance.dispose(); } }
  };
  void init();
})();
