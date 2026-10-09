(() => {
  'use strict';
  const $ = id => document.getElementById(id), motion = window.CurvedGalleryMotion, effects = window.CurvedGalleryEffects;
  const KEY = 'cellmotion-curvedgallery-v1', resources = new Map();
  let state = { settings: { ...motion.defaults }, assets: [] }, selectedId = null, candidate = null;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches, time = 0, started = performance.now();
  let ready = false, busy = false, saveTimer, language = localStorage.getItem('cellmotion-editor-language') || 'zh';
  let imagePreview = false, imagePreviewStarted = 0;
  const params = new URLSearchParams(location.search), preview = params.has('preview');
  const portraitsDemo = params.get('demo') === 'portraits';
  if (preview) document.body.classList.add('is-preview');
  const geometry = [
    ['slots', '圆环卡片数量', 'Panel count', 4, 36, 1],
    ['gap', '卡片间距', 'Panel gap', 0.02, 0.45, 0.01],
    ['cardHeight', '图片高度', 'Panel height', 180, 820, 10],
    ['curvature', '弧面倾斜', 'Arc tilt', 0.08, 0.55, 0.01],
    ['turns', '旋转圈数', 'Turns', 0.1, 3, 0.05],
    ['finalSize', '收尾标志大小', 'Final mark size', 70, 300, 5],
  ];
  const timings = [
    ['speed', '整体速度', 'Speed', 0.25, 3, 0.05],
    ['spin', '环形转动时长', 'Rotation duration', 0.2, 5, 0.01],
    ['pullback', '缩小归标时长', 'Pullback duration', 0.2, 4, 0.01],
    ['overlap', '旋转与缩小重叠', 'Rotation / pullback overlap', 0, 0.8, 0.05],
    ['shiftOverlap', '聚拢与左移重叠', 'Pullback / shift overlap', 0, 0.5, 0.01],
    ['shift', '整组左移时长', 'Left shift duration', 0.2, 3, 0.05],
    ['textDelay', '左移后文字延迟', 'Word delay after shift starts', 0, 3, 0.05],
    ['markHold', '标志单独停留', 'Mark-only hold', 0, 3, 0.05],
    ['reveal', '文字揭开时长', 'Word reveal duration', 0.1, 3, 0.01],
    ['hold', '组合停留时长', 'Lockup hold', 0, 5, 0.01],
    ['fade', '最后淡出时长', 'Fade duration', 0, 2, 0.05],
  ];
  function controls(target, rows) {
    for (const [key, zh, en, min, max, step] of rows) {
      const label = document.createElement('label'); label.className = 'gm-field'; label.dataset.en = en;
      label.append(document.createTextNode(zh));
      const input = document.createElement('input'); Object.assign(input, { type: 'range', min, max, step, value: state.settings[key] });
      input.dataset.setting = key; label.append(input, document.createElement('output')); $(target).append(label);
    }
  }
  controls('geometryControls', geometry); controls('timingControls', timings);
  const imageControls = [
    ['strength', '特效强度', 'Effect strength', 0, 1, .01],
    ['hoverDistortionStrength', '扭曲强度', 'Distortion', 0, .2, .005],
    ['grainStrength', '颗粒强度', 'Grain', 0, .3, .005],
    ['effectRadius', '效果范围', 'Effect radius', .1, 1, .01],
    ['uvScale', '图片缩放', 'Image UV scale', .7, 1, .01],
    ['parallaxIntensity', '图片内视差', 'Image parallax', 0, 1, .01],
    ['shaderMultiplier', '视差倍率', 'Parallax multiplier', 0, 2, .1],
    ['speed', '特效速度', 'Effect speed', 0, 3, .05],
    ['focusX', '效果中心 X', 'Effect center X', 0, 1, .01],
    ['focusY', '效果中心 Y', 'Effect center Y', 0, 1, .01],
    ['hoverTransitionSpeed', '悬停跟随速度', 'Hover response', .02, .3, .01],
  ];
  for (const [target, rows] of [['lookControls', [['lookStrength', '外观强度', 'Look strength', 0, 1, .01], ['lookScale', '纹理尺寸 / 柔度', 'Texture scale / softness', .5, 3, .05]]], ['imageEffectControls', imageControls]]) {
    for (const [key, zh, english, min, max, step] of rows) {
      const label = document.createElement('label'); label.className = 'gm-field'; label.dataset.en = english; label.append(document.createTextNode(zh));
      const input = document.createElement('input'); Object.assign(input, { type: 'range', min, max, step, value: effects.defaults[key] }); input.dataset.imageEffect = key;
      label.append(input, document.createElement('output')); $(target).append(label);
    }
  }
  const option = (value, zh, english) => { const node = new Option(zh, value); node.dataset.en = english; return node; };
  $('imageEffect').append(option(-1, '无特效', 'No effect'), ...effects.effects.map((name, i) => option(i, name, effects.effectNames[i])));
  $('imageLook').append(...effects.looks.map((name, i) => option(name, effects.lookNames[i], effects.lookEnglish[i])));
  window.STGFontLibrary.enhanceSelect($('fontFamily'));
  const en = () => language === 'en';
  const status = (zh, english = zh) => { $('schemeStatus').textContent = en() ? english : zh; };
  function setPanel(name) {
    if (name !== 'content') imagePreview = false;
    document.querySelectorAll('.tc-properties').forEach(node => { node.hidden = node.dataset.panel !== name; });
    document.querySelectorAll('.tc-tabs button').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.panel === name)));
    $('libraryDrawer').hidden = true; $('inspector').hidden = false;
    if (ready) draw();
  }
  document.querySelector('.tc-tabs').addEventListener('click', event => { if (event.target.dataset.panel) setPanel(event.target.dataset.panel); });
  $('exportShortcut').onclick = () => setPanel('export');
  function syncControls() {
    document.querySelectorAll('[data-setting]').forEach(input => {
      const value = state.settings[input.dataset.setting];
      if (input.type === 'checkbox') input.checked = value; else input.value = String(value);
      const output = input.parentElement.querySelector('output'); if (output) output.textContent = value;
      input.dispatchEvent(new Event('change'));
    });
    $('canvasWidth').value = state.settings.width; $('canvasHeight').value = state.settings.height;
    const size = `${state.settings.width}x${state.settings.height}`;
    $('canvasPreset').value = [...$('canvasPreset').options].some(o => o.value === size) ? size : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom'; $('canvasPreset').dispatchEvent(new Event('change'));
    renderTimeline(); renderSelectedAssets(); fitStage();
  }
  function current() { return paused ? time : (performance.now() - started) / 1000; }
  function setTime(value, pause = true) {
    time = Math.max(0, Math.min(motion.timeline(state.settings).total, value));
    paused = pause; started = performance.now() - time * 1000; syncPlayback(); draw();
  }
  function syncPlayback() { $('playButton').textContent = paused ? (en() ? 'Play' : '播放') : (en() ? 'Pause' : '暂停'); }
  $('playButton').onclick = () => { if (busy) return; imagePreview = false; time = current() % motion.timeline(state.settings).total; paused = !paused; started = performance.now() - time * 1000; syncPlayback(); draw(); };
  $('replayButton').onclick = () => { if (!busy) { imagePreview = false; setTime(0, false); } };
  $('seek').oninput = () => { if (!busy) { imagePreview = false; setTime(Number($('seek').value)); } };
  $('exitImagePreview').onclick = () => { imagePreview = false; draw(); };
  function renderTimeline() {
    const line = motion.timeline(state.settings), bar = $('timeline');
    bar.querySelectorAll('button').forEach(node => node.remove()); $('legend').replaceChildren();
    line.phases.forEach(phase => {
      if (phase.end <= phase.start) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'me-choreo-block';
      button.style.left = `${phase.start / line.total * 100}%`; button.style.width = `${(phase.end - phase.start) / line.total * 100}%`;
      button.style.setProperty('--cg-phase', phase.color); button.style.top = phase.en === 'Fold / pull back' || phase.en === 'Word reveal' ? '12px' : '0';
      const strong = document.createElement('strong'); strong.textContent = en() ? phase.en : phase.name;
      const small = document.createElement('small'); small.textContent = `${(phase.end - phase.start).toFixed(2)}s`;
      button.append(strong, small); button.title = `${strong.textContent}: ${phase.start.toFixed(2)}–${phase.end.toFixed(2)}s`;
      button.onclick = () => { if (!busy) { imagePreview = false; setTime(phase.start + 0.001); } }; bar.append(button);
      const legend = document.createElement('span'); legend.style.setProperty('--phase', phase.color); legend.textContent = strong.textContent; $('legend').append(legend);
    });
    $('seek').max = line.total;
  }
  const bounds = Object.fromEntries([...geometry, ...timings].map(([key, , , min, max]) => [key, [min, max]]));
  Object.assign(bounds, { weight: [100, 900], fontSize: [30, 400], textGap: [0, 240], width: [240, 3840], height: [240, 3840], direction: [-1, 1] });
  document.addEventListener('input', event => {
    const input = event.target, key = input.dataset.setting; if (!key || busy || !ready) return;
    const oldTotal = motion.timeline(state.settings).total, oldTime = current() % oldTotal;
    state.settings[key] = input.type === 'checkbox' ? input.checked : typeof motion.defaults[key] === 'number' ? Number(input.value) : input.value;
    if (bounds[key]) state.settings[key] = Math.max(bounds[key][0], Math.min(bounds[key][1], state.settings[key]));
    if (key === 'font') document.fonts.load(`${state.settings.weight} 64px ${STGFontLibrary.family(state.settings.font)}`).then(draw);
    const output = input.parentElement.querySelector('output'); if (output) output.textContent = state.settings[key];
    const total = motion.timeline(state.settings).total; time = oldTime / oldTotal * total; started = performance.now() - time * 1000;
    if (['text', 'font', 'weight', 'fontSize', 'textGap'].includes(key)) setTime(motion.timeline(state.settings).revealEnd / state.settings.speed + 0.05);
    renderTimeline(); scheduleSave(); draw();
  });
  function fitStage() {
    const stage = $('stage'), frame = stage.querySelector('.gm-composition-frame');
    const style = getComputedStyle(stage), spaceW = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), spaceH = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const ratio = state.settings.width / state.settings.height, w = Math.max(1, Math.min(spaceW, spaceH * ratio)), h = w / ratio;
    frame.style.width = `${w}px`; frame.style.height = `${h}px`;
    const dpr = Math.min(2, devicePixelRatio || 1); $('canvas').width = Math.round(w * dpr); $('canvas').height = Math.round(h * dpr); draw();
  }
  new ResizeObserver(fitStage).observe($('stage'));
  function changeSize() {
    if (!ready || busy) return;
    let [w, h] = $('canvasPreset').value === 'custom' ? [Number($('canvasWidth').value), Number($('canvasHeight').value)] : $('canvasPreset').value.split('x').map(Number);
    [w, h] = [w, h].map(n => Math.round(Math.max(240, Math.min(3840, n || 1080)) / 2) * 2);
    state.settings.width = w; state.settings.height = h; $('canvasWidth').value = w; $('canvasHeight').value = h;
    $('customSize').hidden = $('canvasPreset').value !== 'custom'; fitStage(); scheduleSave();
  }
  $('canvasPreset').oninput = changeSize; $('canvasWidth').onchange = changeSize; $('canvasHeight').onchange = changeSize;
  function draw() {
    const canvas = $('canvas'), line = motion.timeline(state.settings);
    const at = paused ? Math.min(time, line.total) : current() % line.total;
    const selected = imagePreview ? state.assets.find(a => a.id === selectedId) : null;
    const renderTime = selected ? .3 + (performance.now() - imagePreviewStarted) / 1000 : at;
    motion.render(canvas.getContext('2d'), canvas.width, canvas.height, renderTime, state.settings, state.assets, resources, undefined, pointer, selected?.id);
    $('focusStatus').hidden = !selected;
    if (selected) $('focusName').textContent = `${en() ? 'Image preview' : '单图效果预览'} · ${state.assets.indexOf(selected) + 1} · ${selected.imageName}`;
    $('seek').value = at; $('playhead').style.left = `${Math.min(1, at / line.total) * 100}%`;
    $('timeReadout').textContent = `${at.toFixed(2)} / ${line.total.toFixed(2)}s`;
    const phase = line.phases.findLast(p => at >= p.start && at <= p.end); $('phaseReadout').textContent = selected ? (en() ? 'Image preview' : '单图效果预览') : phase ? (en() ? phase.en : phase.name) : '';
  }
  let lastFrame = 0;
  const pointer = { active: false, x: .5, y: .5 };
  $('canvas').onpointermove = event => { const box = $('canvas').getBoundingClientRect(); Object.assign(pointer, { active: true, x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }); if (ready && !busy) draw(); };
  $('canvas').onpointerleave = () => { pointer.active = false; if (ready && !busy) draw(); };
  function tick(stamp) {
    const hovering = state.assets.some(a => a.effects.activation === 'hover' && (pointer.active || resources.get(a.id)?.hoverProgress > .002));
    if (ready && (!paused || imagePreview || hovering) && !busy && stamp - lastFrame > 30) { lastFrame = stamp; draw(); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Portable media fields match the shared CellMotion resource model. Decoded images never enter schemes.
  const assetFrom = (source, name, type = 'image/png', extra = {}) => ({ id: crypto.randomUUID(), source: 'image', originalDataUrl: source, fileType: type, imageName: name, fit: 'cover', cropX: 0.5, cropY: 0.5, opacity: 1, ...extra, effects: effects.normalize(extra.effects) });
  function disposeResource(resource) { CellMotionAnimatedImage.dispose(resource?.animated); effects.dispose(resource); }
  async function loadAsset(asset, cache = resources) {
    if ((asset.effects.effect >= 0 && asset.effects.strength > 0) || (!asset.effects.lookBaked && asset.effects.look !== 'none') || asset.effects.uvScale !== 1 || asset.effects.parallaxIntensity > 0) effects.ensureAvailable();
    const old = cache.get(asset.id); if (old?.source === asset.originalDataUrl) return old;
    const image = new Image(); image.decoding = 'async'; image.src = asset.originalDataUrl; await image.decode();
    const resource = { source: asset.originalDataUrl, image, animated: null, canvas: null };
    if (asset.fileType === 'image/gif') resource.animated = await CellMotionAnimatedImage.decode({ url: asset.originalDataUrl, type: asset.fileType });
    if (asset.kind === 'vector') { resource.canvas = document.createElement('canvas'); resource.canvas.width = resource.canvas.height = 256; }
    if (old && cache === resources) disposeResource(old);
    cache.set(asset.id, resource); return resource;
  }
  function readFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
  async function addFiles(files, replaceId = null) {
    if (busy) return;
    try {
      const incoming = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error(en() ? 'Choose an image file.' : '请选择图片文件。');
        const previous = replaceId ? state.assets.find(a => a.id === replaceId) : null;
        const extra = previous ? { id: previous.id, fit: previous.fit, cropX: previous.cropX, cropY: previous.cropY, opacity: previous.opacity, effects: { ...previous.effects, lookBaked: false } } : {};
        const asset = assetFrom(await readFile(file), file.name, file.type, extra);
        await loadAsset(asset); incoming.push(asset);
      }
      if (replaceId) state.assets[state.assets.findIndex(a => a.id === replaceId)] = incoming[0]; else state.assets.push(...incoming);
      selectedId = incoming.at(-1)?.id || selectedId; renderSelectedAssets(); editAsset(selectedId); scheduleSave();
      status(replaceId ? '图片已替换，原效果和裁切设置已保留。' : `已添加 ${incoming.length} 张图片。`, replaceId ? 'Image replaced; effects and crop settings kept.' : `${incoming.length} image(s) added.`);
    } catch (error) { status(error.message); }
  }
  $('imageUpload').onchange = async event => { await addFiles([...event.target.files]); event.target.value = ''; };
  $('replaceImage').onchange = async event => { if (selectedId && event.target.files[0]) await addFiles([event.target.files[0]], selectedId); event.target.value = ''; };
  function setAssetManager(expanded) {
    $('assetManager').classList.toggle('is-list-expanded', expanded); $('selectedAssets').hidden = !expanded; $('assetToggle').setAttribute('aria-expanded', String(expanded));
  }
  $('assetToggle').onclick = () => setAssetManager($('selectedAssets').hidden);
  function renderSelectedAssets() {
    $('contentList').replaceChildren(); $('selectedAssets').replaceChildren();
    state.assets.forEach((asset, i) => {
      const make = () => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'cg-asset-row'; button.setAttribute('aria-pressed', String(selectedId === asset.id));
        const image = new Image(); image.src = asset.originalDataUrl; image.alt = '';
        const span = document.createElement('span'); span.textContent = `${String(i + 1).padStart(2, '0')} ${asset.imageName}`;
        button.append(image, span); button.title = asset.imageName; button.onclick = () => editAsset(asset.id); return button;
      };
      $('contentList').append(make()); $('selectedAssets').append(make());
    });
    if (!state.assets.length) { const p = document.createElement('p'); p.className = 'gm-help'; p.textContent = en() ? 'Solid panels until you add images.' : '未添加图片时显示纯色弧形卡片。'; $('contentList').append(p); }
    $('assetToggle').textContent = `${en() ? 'Selected images' : '已添加图片'} · ${state.assets.length}`;
  }
  function editAsset(id) {
    const asset = state.assets.find(a => a.id === id); if (!asset) return;
    selectedId = id; setPanel('content'); $('brandEditor').hidden = true; $('assetEditor').hidden = false; $('selectBrand').setAttribute('aria-pressed', 'false');
    $('assetTitle').textContent = asset.imageName; $('assetPreview').src = asset.originalDataUrl; $('assetName').value = asset.imageName;
    $('assetFit').value = asset.fit; $('cropX').value = asset.cropX; $('cropY').value = asset.cropY; $('assetFit').dispatchEvent(new Event('change'));
    syncImageEffects(asset); renderSelectedAssets(); showImagePreview(true);
    $('inspector').scrollTop = 0; document.querySelector('.tc-properties[data-panel="content"]').scrollTop = 0;
  }
  function showImagePreview(reset = false) {
    if (reset || !imagePreview) imagePreviewStarted = performance.now();
    imagePreview = true; setTime(current() % motion.timeline(state.settings).total);
  }
  function syncImageEffects(asset) {
    document.querySelectorAll('[data-image-effect]').forEach(input => {
      const value = asset.effects[input.dataset.imageEffect]; input.value = String(value);
      const output = input.parentElement.querySelector('output'); if (output) output.textContent = value;
      input.dispatchEvent(new Event('change'));
    });
    $('bakedLookNotice').hidden = !asset.effects.lookBaked;
  }
  document.addEventListener('input', event => {
    const input = event.target, key = input.dataset.imageEffect, asset = state.assets.find(a => a.id === selectedId);
    if (!key || !asset || busy || !ready) return;
    const next = { ...asset.effects, [key]: typeof effects.defaults[key] === 'number' ? Number(input.value) : input.value };
    if (key.startsWith('look')) next.lookBaked = false;
    if (key === 'look') next.lookColor = effects.colors[effects.looks.indexOf(next.look)];
    if (!key.startsWith('look') && key !== 'strength' && next.effect >= 0 && next.strength === 0) next.strength = 1;
    try { const normalized = effects.normalize(next); effects.ensureAvailable(); asset.effects = normalized; } catch (error) { status(error.message); syncImageEffects(asset); return; }
    syncImageEffects(asset); scheduleSave(); showImagePreview();
  });
  $('selectBrand').onclick = () => { imagePreview = false; selectedId = null; setPanel('content'); $('brandEditor').hidden = false; $('assetEditor').hidden = true; $('selectBrand').setAttribute('aria-pressed', 'true'); renderSelectedAssets(); setTime(motion.timeline(state.settings).revealEnd / state.settings.speed + 0.05); };
  for (const [id, key] of [['assetName', 'imageName'], ['assetFit', 'fit'], ['cropX', 'cropX'], ['cropY', 'cropY']]) {
    $(id).oninput = () => { const asset = state.assets.find(a => a.id === selectedId); if (!asset || busy) return; asset[key] = key.startsWith('crop') ? Number($(id).value) : $(id).value; renderSelectedAssets(); scheduleSave(); showImagePreview(); };
  }
  function moveAsset(delta) {
    if (busy) return; const i = state.assets.findIndex(a => a.id === selectedId), j = i + delta; if (i < 0 || j < 0 || j >= state.assets.length) return;
    [state.assets[i], state.assets[j]] = [state.assets[j], state.assets[i]]; renderSelectedAssets(); scheduleSave(); draw();
  }
  $('moveUp').onclick = () => moveAsset(-1); $('moveDown').onclick = () => moveAsset(1);
  $('deleteAsset').onclick = () => {
    if (busy) return; disposeResource(resources.get(selectedId)); resources.delete(selectedId); state.assets = state.assets.filter(a => a.id !== selectedId);
    $('selectBrand').click(); scheduleSave();
  };
  function setLibrary(open) { $('libraryDrawer').hidden = !open; $('inspector').hidden = open; }
  $('openLibrary').onclick = () => setLibrary(true); $('closeLibrary').onclick = () => setLibrary(false);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('libraryDrawer').hidden) { setLibrary(false); $('openLibrary').focus(); } });
  const groupNames = { flow: '流动图标 / Flow', gifMotion: 'GIF 动图 / Motion', animals: '透明动物 / Animals', bots: 'Bot 系列 / Bots' };
  for (const [groupId, items] of Object.entries(STGIconLibrary.groups)) {
    const section = document.createElement('section'); section.className = 'cg-library-group'; const title = document.createElement('h3'); title.textContent = groupNames[groupId]; section.append(title);
    for (const item of items) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'me-asset-choice';
      const image = new Image(); image.src = item.url; image.alt = ''; image.loading = 'lazy'; const label = document.createElement('span'); label.textContent = item.name; button.append(image, label);
      button.onclick = () => { candidate = item; $('library').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button))); $('insertCandidate').disabled = false; };
      section.append(button);
    }
    $('library').append(section);
  }
  $('insertCandidate').onclick = async () => {
    if (!candidate || busy) return;
    try {
      const asset = assetFrom(candidate.url, candidate.name, candidate.fileType, { libraryId: candidate.libraryId, kind: candidate.kind, vectorType: candidate.vectorType, vectorStyle: candidate.vectorStyle });
      await loadAsset(asset); state.assets.push(asset); setLibrary(false); editAsset(asset.id); scheduleSave();
    } catch (error) { status(error.message); }
  };

  const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY, 1); request.onupgradeneeded = () => request.result.createObjectStore('schemes');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  dbPromise.catch(() => {});
  async function persist() {
    const db = await dbPromise;
    return new Promise((resolve, reject) => { const tx = db.transaction('schemes', 'readwrite'); tx.objectStore('schemes').put(collectScheme(), 'current'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  }
  function collectScheme() { return { effect: 'curvedgallery', version: 2, settings: { ...state.settings }, assets: state.assets.map(a => ({ ...a })) }; }
  function scheduleSave() {
    clearTimeout(saveTimer); saveTimer = setTimeout(() => persist().then(() => status('已自动保存；保存方案可带图片下载。', 'Autosaved. Save a scheme to download it with images.')).catch(() => status('浏览器存储不可用，请用“保存方案”下载备份。', 'Browser storage unavailable. Download a scheme backup.')), 350);
  }
  function parseScheme(value) {
    if (value?.effect !== 'curvedgallery' || ![1, 2].includes(value.version) || !value.settings || !Array.isArray(value.assets) || value.assets.length > 100) throw new Error('无效的弧廊归标方案 / Invalid scheme');
    const settings = { ...motion.defaults };
    for (const key of Object.keys(settings)) {
      const v = value.settings[key]; if (v === undefined) continue;
      if (typeof v !== typeof settings[key] || (typeof v === 'number' && (!Number.isFinite(v) || (bounds[key] && (v < bounds[key][0] || v > bounds[key][1]))))) throw new Error(`无效参数 / Invalid setting: ${key}`);
      if (['background', 'color', 'markColor'].includes(key) && !/^#[0-9a-f]{6}$/i.test(v)) throw new Error('无效颜色 / Invalid color');
      if (key === 'font' && !STGFontLibrary.preset(v)) throw new Error('无效字体 / Invalid font');
      if (key === 'text' && v.length > 120) throw new Error('文字过长 / Text too long'); settings[key] = v;
    }
    // Upgrade untouched v1 defaults while preserving all photos and custom settings.
    if (value.version === 1) {
      const previousDefaults = { cardHeight: 570, spin: 1.20, pullback: 1.15, markHold: 0.45, reveal: 0.55, hold: 1.05 };
      for (const [key, oldDefault] of Object.entries(previousDefaults)) if (settings[key] === oldDefault) settings[key] = motion.defaults[key];
    }
    if (!Number.isInteger(settings.slots) || ![1, -1].includes(settings.direction) || settings.width % 2 || settings.height % 2) throw new Error('无效画布或卡片数量 / Invalid canvas or count');
    const ids = new Set();
    const assets = value.assets.map(a => {
      if (!a || typeof a.id !== 'string' || !a.id || ids.has(a.id) || typeof a.imageName !== 'string' || a.imageName.length > 200 || typeof a.originalDataUrl !== 'string') throw new Error('无效图片 / Invalid image');
      ids.add(a.id); const library = a.libraryId ? STGIconLibrary.byId.get(a.libraryId) : null;
      if (!library && !/^data:image\/(png|jpeg|webp|gif|avif|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(a.originalDataUrl)) throw new Error('图片必须嵌入方案 / Images must be embedded');
      for (const key of ['cropX', 'cropY', 'opacity']) if (a[key] !== undefined && (typeof a[key] !== 'number' || !Number.isFinite(a[key]) || a[key] < 0 || a[key] > 1)) throw new Error('无效裁切 / Invalid crop');
      return assetFrom(library?.url || a.originalDataUrl, a.imageName, library?.fileType || a.fileType || 'image/png', { id: a.id, fit: a.fit === 'stretch' ? 'stretch' : 'cover', cropX: a.cropX ?? 0.5, cropY: a.cropY ?? 0.5, opacity: a.opacity ?? 1, effects: a.effects, ...(library ? { libraryId: library.libraryId, kind: library.kind, vectorType: library.vectorType, vectorStyle: library.vectorStyle } : {}) });
    });
    return { settings, assets };
  }
  async function applyScheme(value) {
    const next = parseScheme(value);
    // Preload all candidates before changing the active composition.
    const pending = new Map(resources);
    try { for (const asset of next.assets) await loadAsset(asset, pending); }
    catch (error) { for (const [id, resource] of pending) if (resource !== resources.get(id)) disposeResource(resource); throw error; }
    for (const [id, resource] of resources) if (!next.assets.some(a => a.id === id) || pending.get(id) !== resource) disposeResource(resource);
    resources.clear(); next.assets.forEach(asset => resources.set(asset.id, pending.get(asset.id)));
    state = next; selectedId = null; imagePreview = false; syncControls(); $('brandEditor').hidden = false; $('assetEditor').hidden = true; setTime(0, false);
  }
  function download(blob, name) { const link = document.createElement('a'), url = URL.createObjectURL(blob); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
  $('saveScheme').onclick = async () => {
    if (busy) return; download(new Blob([JSON.stringify(collectScheme(), null, 2)], { type: 'application/json' }), 'curved-gallery-scheme.json');
    try { await persist(); status('方案已保存，包含全部图片。', 'Scheme saved with all images.'); } catch (_) { status('备份已下载；浏览器存储不可用。', 'Backup downloaded; browser storage unavailable.'); }
  };
  $('importScheme').onchange = async event => {
    if (!event.target.files[0] || busy) return;
    try { await applyScheme(JSON.parse(await event.target.files[0].text())); scheduleSave(); status('方案已导入。', 'Scheme imported.'); } catch (error) { status(error.message); }
    event.target.value = '';
  };
  $('resetScheme').onclick = async () => { if (busy) return; await applyScheme({ effect: 'curvedgallery', version: 2, settings: { ...motion.defaults }, assets: [] }); scheduleSave(); };
  $('clearScheme').onclick = () => { if (busy) return; resources.forEach(disposeResource); resources.clear(); state.assets = []; $('selectBrand').click(); renderSelectedAssets(); scheduleSave(); };
  $('parallaxImport').onchange = async event => {
    if (!event.target.files[0] || busy) return;
    try {
      const project = JSON.parse(await event.target.files[0].text());
      if (project.version !== 1 || !Array.isArray(project.images) || project.images.length > 100 || !project.settings) throw new Error('请选择视差工坊导出的备份 / Choose a Parallax Studio backup');
      const assets = project.images.map(image => {
        if (typeof image.name !== 'string' || !/^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i.test(image.src || '')) throw new Error('请在视差工坊使用“导出备份”，让图片嵌入 JSON / Export a backup with embedded images');
        const values = Object.fromEntries(['uvScale', 'parallaxIntensity', 'shaderMultiplier', 'hoverDistortionStrength', 'grainStrength', 'effectRadius', 'hoverTransitionSpeed'].filter(key => project.settings[key] !== undefined).map(key => [key, project.settings[key]]));
        return assetFrom(image.src, image.name, image.src.slice(5, image.src.indexOf(';')), { effects: { ...values, effect: image.effect ?? -1 } });
      });
      await applyScheme({ effect: 'curvedgallery', version: 2, settings: state.settings, assets }); scheduleSave();
      status(`已导入 ${assets.length} 张图片及其可编辑视差效果。`, `${assets.length} images and editable parallax effects imported.`);
    } catch (error) { status(error.message); } event.target.value = '';
  };

  function setTheme(theme) { document.body.dataset.editorTheme = theme; $('themeButton').textContent = theme === 'dark' ? (en() ? '☀ Light' : '☀ 浅色') : (en() ? '☾ Dark' : '☾ 深色'); localStorage.setItem('cellmotion-editor-theme', theme); }
  function setLanguage(lang) {
    language = lang; document.body.dataset.editorLanguage = lang; document.documentElement.lang = en() ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-en]').forEach(node => {
      const text = [...node.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!text) return; if (!node.dataset.zh) node.dataset.zh = text.textContent; text.textContent = en() ? node.dataset.en : node.dataset.zh;
    });
    $('languageButton').textContent = en() ? '中文' : 'EN'; setTheme(document.body.dataset.editorTheme); syncPlayback(); renderTimeline(); renderSelectedAssets(); localStorage.setItem('cellmotion-editor-language', lang);
    document.dispatchEvent(new Event('tc-languagechange'));
  }
  $('themeButton').onclick = () => setTheme(document.body.dataset.editorTheme === 'dark' ? 'light' : 'dark');
  $('languageButton').onclick = () => setLanguage(en() ? 'zh' : 'en');
  setTheme(localStorage.getItem('cellmotion-editor-theme') === 'light' ? 'light' : 'dark'); setLanguage(language);

  $('exportDuration').oninput = () => { $('durationLabel').hidden = $('exportDuration').value !== 'custom'; };
  function exportLength() { const value = $('exportDuration').value; return value === 'cycle' ? motion.timeline(state.settings).total : Math.max(0.5, Math.min(30, Number(value === 'custom' ? $('customDuration').value : value) || 4.6)); }
  const disabledBeforeExport = new Map();
  function setBusy(value) {
    busy = value;
    if (value) {
      document.querySelectorAll('.tc-content button,.tc-content input,.gm-inspector button,.gm-inspector input,.gm-inspector select,.me-asset-drawer button,#canvasPreset,#canvasWidth,#canvasHeight,#seek,#playButton,#replayButton').forEach(node => { disabledBeforeExport.set(node, node.disabled); node.disabled = true; });
    } else { disabledBeforeExport.forEach((disabled, node) => { node.disabled = disabled; }); disabledBeforeExport.clear(); }
  }
  async function exportFile(format) {
    if (busy) return; imagePreview = false; const exportState = structuredClone(state), at = current() % motion.timeline(state.settings).total;
    setTime(at); setBusy(true); $('exportStatus').textContent = en() ? 'Preparing…' : '正在准备…'; let encoder;
    try {
      await document.fonts.load(`${exportState.settings.weight} 64px ${STGFontLibrary.family(exportState.settings.font)}`);
      await Promise.all(exportState.assets.map(asset => loadAsset(asset)));
      const canvas = document.createElement('canvas'); canvas.width = exportState.settings.width; canvas.height = exportState.settings.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }), fps = format === 'gif' ? Math.min(30, Number($('exportFps').value)) : Number($('exportFps').value), frames = Math.ceil(exportLength() * fps), cycle = motion.timeline(exportState.settings).total;
      const render = seconds => motion.render(ctx, canvas.width, canvas.height, seconds % cycle, exportState.settings, exportState.assets, resources);
      const name = `curved-gallery-${canvas.width}x${canvas.height}.${format}`;
      if (format === 'png') { render(at); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); download(blob, name); }
      else if (format === 'gif') {
        const gif = new GIF({ workers: 2, quality: 10, width: canvas.width, height: canvas.height, workerScript: 'js/continuation-gif.worker.js' });
        for (let i = 0; i < frames; i++) { render(i / fps); const delay = (Math.round((i + 1) * 100 / fps) - Math.round(i * 100 / fps)) * 10; gif.addFrame(canvas, { copy: true, delay }); if (i % 4 === 0) { $('exportStatus').textContent = `GIF · ${i + 1}/${frames}`; await new Promise(r => setTimeout(r, 0)); } }
        const blob = await new Promise((resolve, reject) => { gif.on('finished', resolve); gif.on('abort', () => reject(new Error('GIF aborted'))); gif.on('progress', p => { $('exportStatus').textContent = `GIF · ${Math.round(p * 100)}%`; }); gif.render(); }); download(blob, name);
      } else {
        encoder = await HME.createH264MP4Encoder(); encoder.outputFilename = name; encoder.width = canvas.width; encoder.height = canvas.height; encoder.frameRate = fps; encoder.kbps = 12000; encoder.groupOfPictures = fps; encoder.initialize();
        for (let i = 0; i < frames; i++) { render(i / fps); encoder.addFrameRgba(ctx.getImageData(0, 0, canvas.width, canvas.height).data); if (i % 3 === 0) { $('exportStatus').textContent = `MP4 · ${Math.round((i + 1) / frames * 100)}%`; await new Promise(r => setTimeout(r, 0)); } }
        encoder.finalize(); download(new Blob([encoder.FS.readFile(name)], { type: 'video/mp4' }), name);
      }
      $('exportStatus').textContent = `${format.toUpperCase()} ${en() ? 'saved' : '已生成'} · ${canvas.width} × ${canvas.height}`;
    } catch (error) { $('exportStatus').textContent = `${en() ? 'Export failed' : '导出失败'}: ${error.message}`; }
    finally { encoder?.delete(); setBusy(false); draw(); }
  }
  $('exportPng').onclick = () => exportFile('png'); $('exportGif').onclick = () => exportFile('gif'); $('exportVideo').onclick = () => exportFile('mp4');
  // Public deterministic hooks also serve frame comparison and offline integration.
  window.CurvedGallery = { seek: setTime, collectScheme, applyScheme, render: (ctx, w, h, seconds) => motion.render(ctx, w, h, seconds, state.settings, state.assets, resources), exportFile };
  (async () => {
    try {
      if (portraitsDemo) {
        const assets = await Promise.all(Array.from({ length: 7 }, async (_, i) => {
          const name = `${String(i + 1).padStart(2, '0')}.png`;
          const response = await fetch(`https://opc8838-hub.github.io/xiaoguo-/gallery/${name}`);
          if (!response.ok) throw new Error(`图片载入失败 / Image load failed: ${name}`);
          return assetFrom(await readFile(await response.blob()), name, 'image/png', { effects: { effect: i, strength: 0, look: effects.looks[i + 1], lookColor: effects.colors[i + 1], lookBaked: true } });
        }));
        // Loading the example does not replace the user's stored composition.
        await applyScheme({ effect: 'curvedgallery', version: 2, settings: { ...motion.defaults }, assets });
      } else if (!preview) {
        const db = await dbPromise, saved = await new Promise((resolve, reject) => { const request = db.transaction('schemes').objectStore('schemes').get('current'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        if (saved) await applyScheme(saved);
      }
      await document.fonts.load(`400 64px ${STGFontLibrary.family(state.settings.font)}`);
    } catch (error) { status(`已使用默认方案：${error.message}`, `Default scheme loaded: ${error.message}`); }
    ready = true; syncControls(); syncPlayback(); started = performance.now(); draw();
  })();
})();
