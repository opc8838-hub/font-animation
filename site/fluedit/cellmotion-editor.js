import { localize } from './cellmotion-locale.js?v=20261023-cm1';

export async function mountCellMotion(core) {
  const $ = selector => document.querySelector(selector);
  const make = (tag, className, html = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };
  const label = (zh, en) => `<span data-zh="${zh}" data-en="${en}">${zh}</span>`;
  const body = document.body;
  const defaults = { width: 1920, height: 1080, duration: 'cycle', seconds: 6, fps: 30, scale: 1 };
  const storageKey = 'cellmotion-fluedit-workspace-v1';
  let settings = { ...defaults };
  try { settings = validateSettings(JSON.parse(localStorage.getItem(storageKey)) || defaults); } catch { /* Use the approved default. */ }
  let busy = false;
  let saveTimer;
  let exportRenderer;
  const text = (zh, en) => document.documentElement.dataset.siteLanguage === 'en' ? en : zh;

  const header = make('header', 'tc-header', `
    <a class="tc-brand" href="../" aria-label="CellMotion">
      <img class="tc-logo-dark" src="../assets/cellmotion/logo-dark-original.png" alt="CellMotion">
      <img class="tc-logo-light" src="../assets/cellmotion/logo-original-transparent.png" alt="" aria-hidden="true">
    </a>
    <h1>${label('流彩', 'Organic Color')} <span>Fluedit</span></h1>
    <div class="cm-history"></div>
    <a class="tc-back" href="../cellmotion-components.html">${label('动效库', 'Library')}</a>
    <button class="tc-export-shortcut" type="button">${label('导出作品', 'Export')}</button>`);
  const left = make('aside', 'tc-content cm-content', `
    <div class="tc-panel-heading"><div><small>CONTENT</small><h2>${label('有机形状', 'Organic shapes')} <span class="cm-count">08</span></h2></div></div>
    <p class="tc-hint">${label('选择形状，探索色彩的流动。', 'Choose a shape. Explore color in motion.')}</p>
    <div class="cm-shape-slot"></div><div class="cm-palette-slot"></div>
    <section class="tc-scheme gm-card"><div class="gm-card-title"><h2>${label('方案', 'Project')}</h2></div>
      <div class="gm-actions cm-scheme-actions">
        <button id="saveScheme" type="button">${label('保存方案', 'Save project')}</button>
        <button id="importScheme" type="button">${label('导入方案', 'Import project')}</button>
        <button id="restoreScheme" type="button">${label('恢复默认', 'Restore default')}</button>
        <button id="clearScheme" type="button">${label('清理重做', 'Clear & rebuild')}</button>
      </div><input id="schemeFile" type="file" accept="application/json,.json" hidden>
      <p id="schemeStatus" class="cm-status" role="status">${label('修改自动保存在本机', 'Changes are saved in this browser')}</p>
    </section>`);
  const inspector = $('.inspector');
  const fieldset = $('#editor');
  const preview = $('.preview');
  const stage = $('#stage');
  const nativeToolbar = $('.editor-toolbar');
  const shapes = $('.shape-library');
  const palettes = $('.preset-section');
  const motion = $('.motion-section');
  const tabs = make('nav', 'tc-tabs', `<button type="button" data-panel="color" aria-pressed="true">${label('色彩编辑', 'Color')}</button><button type="button" data-panel="motion" aria-pressed="false">${label('动效设置', 'Motion')}</button><button type="button" data-panel="export" aria-pressed="false">${label('导出', 'Export')}</button>`);
  tabs.setAttribute('aria-label', '属性分类');
  shapes.open = true;
  left.querySelector('.cm-shape-slot').append(shapes);
  left.querySelector('.cm-palette-slot').append(palettes);
  palettes.open = matchMedia('(min-width: 861px)').matches;
  header.querySelector('.cm-history').append($('#undo'), $('#redo'), $('#compare'));
  $('#reset').hidden = true;
  const nativeExport = $('#export');
  const colorPanel = make('section', 'tc-properties cm-color-panel');
  colorPanel.dataset.panel = 'color';
  colorPanel.append(...[...fieldset.children].filter(node => node !== motion));
  const motionPanel = make('section', 'tc-properties cm-motion-panel');
  motionPanel.dataset.panel = 'motion';
  motionPanel.hidden = true;
  motionPanel.innerHTML = `<div class="tc-panel-heading"><div><small>MOTION</small><h2>${label('色彩流动', 'Color flow')}</h2></div></div>`;
  motionPanel.append(motion);
  const exportPanel = make('section', 'tc-properties cm-export-panel', `
    <div class="tc-panel-heading"><div><small>EXPORT</small><h2>${label('导出作品', 'Export artwork')}</h2></div></div>
    <div class="cm-fields">
      <label>${label('时长', 'Duration')}<select id="cmDuration"><option value="cycle" data-zh="基础流动周期" data-en="Base flow cycle">基础流动周期</option><option value="3">3 s</option><option value="6">6 s</option><option value="10">10 s</option><option value="custom" data-zh="自定义" data-en="Custom">自定义</option></select></label>
      <label id="cmSecondsLabel" hidden>${label('秒', 'Seconds')}<input id="cmSeconds" type="number" min="0.5" max="60" step="0.5" value="6"></label>
      <label>${label('帧率', 'Frame rate')}<select id="cmFps"><option value="15">15 FPS</option><option value="24">24 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label>
      <label>${label('输出比例', 'Output scale')}<select id="cmExportScale"><option value="1">100%</option><option value="0.5">50%</option><option value="0.25">25%</option></select></label>
    </div>
    <p id="cmExportDimensions" class="cm-status"></p><div class="cm-export-actions"></div>
    <progress id="cmExportProgress" max="1" value="0" hidden></progress><p id="cmExportStatus" class="cm-status" role="status">${label('图片导出当前帧，动画按所选时长导出。', 'Images use the current frame. Animations use the selected duration.')}</p>`);
  exportPanel.dataset.panel = 'export';
  exportPanel.hidden = true;
  nativeExport.className = 'cm-primary';
  nativeExport.textContent = 'PNG';
  nativeExport.setAttribute('aria-label', '导出 PNG');
  const gifButton = make('button', '', 'GIF');
  gifButton.id = 'cmExportGif';
  gifButton.type = 'button';
  const mp4Button = make('button', '', 'MP4');
  mp4Button.id = 'cmExportMp4';
  mp4Button.type = 'button';
  exportPanel.querySelector('.cm-export-actions').append(nativeExport, gifButton, mp4Button);
  fieldset.replaceChildren(colorPanel, motionPanel, exportPanel);
  inspector.prepend(tabs);
  nativeToolbar.hidden = true;
  inspector.classList.add('gm-inspector', 'cm-inspector');

  const center = make('section', 'tc-center cm-center');
  const toolbar = make('section', 'tc-canvas-toolbar cm-canvas-toolbar', `
    <span class="tc-preview-label">${label('画布', 'Canvas')}</span>
    <div class="gm-canvas-card"><select id="cmCanvasPreset" aria-label="画布尺寸">
      <option value="1080x1080">1:1 · 1080 × 1080</option><option value="1080x1350">4:5 · 1080 × 1350</option><option value="1080x1440">3:4 · 1080 × 1440</option><option value="1080x1620">2:3 · 1080 × 1620</option><option value="1080x1920">9:16 · 1080 × 1920</option><option value="1920x1080">16:9 · 1920 × 1080</option><option value="1440x1080">4:3 · 1440 × 1080</option><option value="1620x1080">3:2 · 1620 × 1080</option><option value="custom" data-zh="自定义" data-en="Custom">自定义</option>
    </select><div id="cmCustomSize" class="cm-custom-size" hidden><label>W <input id="cmWidth" type="number" min="320" max="3840" step="2"></label><span>×</span><label>H <input id="cmHeight" type="number" min="320" max="3840" step="2"></label></div></div>
    <label class="cm-background-label">${label('背景', 'Background')}<input id="cmBackground" type="color" aria-label="背景颜色"></label>`);
  const timeline = make('section', 'tc-timeline cm-timeline', `
    <div class="cm-transport"><button id="cmReplay" type="button" aria-label="从头播放">↺</button><button id="cmPlay" type="button"></button><span id="cmTime" data-no-translate></span><span class="cm-timeline-title">${label('色彩时间轴', 'Color timeline')}</span></div>
    <div id="cmTimeline" class="me-choreo-track" role="group" aria-label="色彩时间轴"></div>
    <input id="cmScrubber" class="me-choreo-playhead" type="range" min="0" max="1" step="0.001" value="0" aria-label="播放进度">
    <div class="cm-time-scale"><span>0 s</span><span id="cmDurationLabel"></span></div>`);
  center.append(toolbar, preview, timeline);
  body.append(header, left, center, inspector, $('#toast'));
  $('#app').remove();
  $('#fluedit-loading').remove();
  body.classList.add('tc-workspace', 'cm-fluedit', 'fluedit-ready');
  body.dataset.editorStandard = 'true';
  body.dataset.editorTheme = localStorage.getItem('cellmotion-site-theme') || localStorage.getItem('cellmotion-editor-theme') || 'dark';
  // This adapter owns bilingual labels; shared preferences still own the site preference state.
  [header, left, center, inspector].forEach(node => node.dataset.noTranslate = '');

  function panel(name) {
    for (const node of [colorPanel, motionPanel, exportPanel]) node.hidden = node.dataset.panel !== name;
    for (const button of tabs.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.panel === name));
    if (innerWidth <= 860) inspector.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  tabs.onclick = event => { const button = event.target.closest('[data-panel]'); if (button) panel(button.dataset.panel); };
  header.querySelector('.tc-export-shortcut').onclick = () => panel('export');

  function validateSettings(candidate) {
    const result = { ...defaults, ...candidate };
    for (const key of ['width', 'height']) {
      if (!Number.isInteger(result[key]) || result[key] < 320 || result[key] > 3840) throw new Error('Invalid canvas size');
      result[key] = Math.round(result[key] / 2) * 2;
    }
    if (!['cycle', '3', '6', '10', 'custom'].includes(result.duration) || ![15, 24, 30, 60].includes(result.fps) || ![1, .5, .25].includes(result.scale) || !Number.isFinite(result.seconds) || result.seconds < .5 || result.seconds > 60) throw new Error('Invalid export settings');
    return result;
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(settings)), 200);
  }
  function duration() {
    if (settings.duration === 'cycle') return 2 * Math.PI / (.08 + core.state().motion.speed / 100 * .7);
    return settings.duration === 'custom' ? settings.seconds : Number(settings.duration);
  }
  function fitStage() {
    const rect = preview.getBoundingClientRect();
    const width = Math.max(1, Math.min(rect.width - 40, (rect.height - 40) * settings.width / settings.height));
    stage.style.width = `${width}px`;
    stage.style.height = `${width * settings.height / settings.width}px`;
    core.refresh();
  }
  function syncSettings() {
    const value = `${settings.width}x${settings.height}`;
    const preset = $('#cmCanvasPreset');
    preset.value = [...preset.options].some(option => option.value === value) ? value : 'custom';
    $('#cmCustomSize').hidden = preset.value !== 'custom';
    $('#cmWidth').value = settings.width;
    $('#cmHeight').value = settings.height;
    $('#cmDuration').value = settings.duration;
    $('#cmSeconds').value = settings.seconds;
    $('#cmSecondsLabel').hidden = settings.duration !== 'custom';
    $('#cmFps').value = settings.fps;
    $('#cmExportScale').value = settings.scale;
    const [width, height] = outputSize();
    $('#cmExportDimensions').textContent = `${width} × ${height} px · ${duration().toFixed(2)} s`;
    document.dispatchEvent(new Event('tc-controls-synced'));
    fitStage();
    buildTimeline();
  }
  function sync() {
    shapes.open = true;
    $('#cmBackground').value = core.background();
    buildTimeline();
    translate();
  }
  function buildTimeline() {
    const state = core.state();
    const tracks = [{ zh: state.motion.enabled ? '色彩流动' : '色彩静帧', en: state.motion.enabled ? 'Color flow' : 'Still artwork', color: '#9273dc' }];
    if (state.motion.enabled && state.motion.shiftEnabled) tracks.push({ zh: '色谱偏移', en: 'Color shift', color: '#df927c' });
    if (state.motion.enabled && state.motion.spreadEnabled) tracks.push({ zh: '色域呼吸', en: 'Color spread', color: '#71a9d7' });
    $('#cmTimeline').innerHTML = tracks.map(track => `<button class="me-choreo-block" type="button" style="--phase-color:${track.color}" data-seek="0">${label(track.zh, track.en)}<small>${duration().toFixed(2)} s</small></button>`).join('');
    $('#cmDurationLabel').textContent = `${duration().toFixed(2)} s`;
    $('#cmExportDimensions').textContent = `${outputSize().join(' × ')} px · ${duration().toFixed(2)} s`;
    $('#cmScrubber').max = duration();
  }
  $('#cmCanvasPreset').onchange = event => {
    if (event.target.value === 'custom') { $('#cmCustomSize').hidden = false; return; }
    if (event.target.value !== 'custom') [settings.width, settings.height] = event.target.value.split('x').map(Number);
    syncSettings();
    $('#cmCustomSize').hidden = event.target.value !== 'custom';
    persist();
  };
  for (const [id, key] of [['cmWidth', 'width'], ['cmHeight', 'height']]) $(`#${id}`).onchange = event => {
    const input = event.target;
    if (!input.validity.valid || !input.value) { input.value = settings[key]; return; }
    settings[key] = Math.round(Number(input.value) / 2) * 2;
    syncSettings(); persist();
  };
  $('#cmBackground').oninput = event => core.setBackground(event.target.value);
  for (const [id, key] of [['cmDuration', 'duration'], ['cmSeconds', 'seconds'], ['cmFps', 'fps'], ['cmExportScale', 'scale']]) $(`#${id}`).onchange = event => {
    if (!event.target.validity.valid || !event.target.value) { syncSettings(); return; }
    settings[key] = key === 'duration' ? event.target.value : Number(event.target.value);
    syncSettings(); translate(); persist();
  };
  function start() {
    if (!core.state().motion.enabled) { $('#motion-enabled').checked = true; $('#motion-enabled').dispatchEvent(new Event('change', { bubbles: true })); }
    core.play(true);
    sync();
  }
  $('#cmPlay').onclick = () => core.playing() ? core.play(false) : start();
  $('#cmReplay').onclick = () => { core.seek(0); start(); };
  $('#cmScrubber').oninput = event => { core.play(false); core.seek(Number(event.target.value)); };
  $('#cmTimeline').onclick = event => {
    const beat = event.target.closest('[data-seek]');
    if (!beat) return;
    const rect = beat.getBoundingClientRect();
    core.play(false);
    core.seek(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration());
  };
  function updateClock() {
    const now = core.time() % duration();
    $('#cmScrubber').value = now;
    $('#cmTime').textContent = `${now.toFixed(2)} / ${duration().toFixed(2)} s`;
    const title = core.playing() ? text('Ⅱ 暂停', 'Ⅱ Pause') : text('▶ 播放', '▶ Play');
    if ($('#cmPlay').textContent !== title) $('#cmPlay').textContent = title;
    $('#cmPlay').setAttribute('aria-pressed', String(core.playing()));
    $('#cmTimeline').style.setProperty('--playhead', `${now / duration() * 100}%`);
    requestAnimationFrame(updateClock);
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $('#saveScheme').onclick = () => {
    persist();
    const project = { type: 'cellmotion-fluedit', version: 1, active: core.state().shape, documents: core.library(), settings };
    download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), 'cellmotion-fluedit.json');
    $('#schemeStatus').textContent = text('方案已保存并下载', 'Project saved and downloaded');
  };
  $('#importScheme').onclick = () => $('#schemeFile').click();
  $('#schemeFile').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const project = JSON.parse(await file.text());
      if (project.type !== 'cellmotion-fluedit' || project.version !== 1) throw new Error(text('请选择流彩方案文件', 'Choose a Fluedit project file'));
      const nextSettings = validateSettings(project.settings);
      core.applyLibrary(project.documents, project.active);
      settings = nextSettings; core.play(false); core.seek(0);
      syncSettings(); sync(); persist();
      $('#schemeStatus').textContent = text('方案已导入', 'Project imported');
    } catch (error) { $('#schemeStatus').textContent = `${text('导入失败', 'Import failed')}: ${error.message}`; }
    event.target.value = '';
  };
  function restore() {
    core.applyLibrary({ butterfly: core.defaultState('butterfly') }, 'butterfly');
    core.play(false); core.seek(0); settings = { ...defaults };
    syncSettings(); sync(); persist();
  }
  $('#restoreScheme').onclick = restore;
  $('#clearScheme').onclick = () => {
    const state = core.defaultState(core.state().shape);
    state.stops = [{ id: 1, color: '#151515', position: 0, midpoint: .5, blend: 1 }, { id: 2, color: '#ffffff', position: 1, midpoint: .5, blend: 1 }];
    core.apply(state); core.play(false); core.seek(0); sync();
  };

  function outputSize() { return [settings.width, settings.height].map(size => Math.max(2, Math.round(size * settings.scale / 2) * 2)); }
  const loadedScripts = new Map();
  function loadScript(path) {
    if (!loadedScripts.has(path)) loadedScripts.set(path, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(path, import.meta.url);
      script.onload = resolve; script.onerror = () => reject(new Error(`Cannot load ${path}`));
      document.head.append(script);
    }));
    return loadedScripts.get(path);
  }
  async function exportArtwork(format) {
    if (busy || !core.ready()) return;
    busy = true;
    const playing = core.playing();
    core.play(false);
    fieldset.disabled = true;
    left.inert = true;
    body.classList.add('cm-exporting');
    const progress = $('#cmExportProgress');
    const status = $('#cmExportStatus');
    progress.hidden = false; progress.value = 0;
    status.textContent = text('正在准备导出…', 'Preparing export…');
    const state = core.renderState();
    const [width, height] = outputSize();
    const seconds = duration(), fps = settings.fps;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let encoder;
    try {
      exportRenderer ??= await core.createExportRenderer();
      const draw = time => exportRenderer.draw(context, time, width, height, state);
      let blob;
      if (format === 'png') {
        draw(core.time());
        blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG encoding failed');
      } else {
        const frames = Math.ceil(seconds * fps);
        let gif;
        if (format === 'mp4') {
          await loadScript('../js/h264-mp4-encoder.web.js');
          encoder = await window.HME.createH264MP4Encoder();
          Object.assign(encoder, { width, height, frameRate: fps, kbps: Math.max(2000, Math.round(width * height * .025)), groupOfPictures: fps, outputFilename: 'fluedit.mp4' });
          encoder.initialize();
        } else {
          await loadScript('../js/continuation-gif.js');
          gif = new window.GIF({ workers: 2, quality: 8, repeat: 0, width, height, workerScript: new URL('../js/continuation-gif.worker.js', import.meta.url).href });
        }
        for (let frame = 0; frame < frames; frame++) {
          draw(frame / fps);
          if (encoder) encoder.addFrameRgba(context.getImageData(0, 0, width, height).data);
          else gif.addFrame(canvas, { copy: true, delay: (Math.round((frame + 1) * 100 / fps) - Math.round(frame * 100 / fps)) * 10 });
          if (frame % 5 === 0) {
            progress.value = frame / frames * .8;
            status.textContent = `${format.toUpperCase()} · ${Math.round(progress.value * 100)}%`;
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        if (encoder) { encoder.finalize(); blob = new Blob([encoder.FS.readFile('fluedit.mp4')], { type: 'video/mp4' }); }
        else blob = await new Promise((resolve, reject) => {
          gif.on('progress', value => progress.value = .8 + value * .2);
          gif.on('finished', resolve); gif.on('abort', () => reject(new Error('GIF encoding stopped'))); gif.render();
        });
      }
      download(blob, `cellmotion-fluedit-${state.shape}-${width}x${height}.${format}`);
      progress.value = 1;
      status.textContent = `${format.toUpperCase()} ${text('已生成', 'ready')} · ${width} × ${height}`;
    } catch (error) { status.textContent = `${text('导出失败', 'Export failed')}: ${error.message}`; }
    finally {
      encoder?.delete();
      busy = false; fieldset.disabled = !core.ready(); left.inert = false;
      body.classList.remove('cm-exporting'); core.play(playing);
    }
  }
  nativeExport.onclick = () => exportArtwork('png');
  gifButton.onclick = () => exportArtwork('gif');
  mp4Button.onclick = () => exportArtwork('mp4');

  const translate = () => localize(body);
  let syncPending = false;
  function scheduleSync() {
    if (syncPending) return;
    syncPending = true;
    requestAnimationFrame(() => { syncPending = false; sync(); });
  }
  for (const event of ['input', 'change', 'click', 'pointerup', 'keydown']) document.addEventListener(event, scheduleSync);
  document.addEventListener('cellmotion:languagechange', () => { buildTimeline(); translate(); document.dispatchEvent(new Event('tc-languagechange')); });
  new ResizeObserver(fitStage).observe(preview);
  if (new URLSearchParams(location.search).has('from')) restore();
  syncSettings(); sync(); updateClock();
  await loadScript('../site-preferences.js?v=20260926-24');
  await loadScript('../typecascade-selects.js?v=20261023-fluedit1');
  translate();
  window.CellMotionFluedit = { state: core.state, settings: () => ({ ...settings }), time: core.time, seek: seconds => { core.play(false); core.seek(seconds); }, exportArtwork };
}
