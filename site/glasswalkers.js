(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('glassCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const defaults = Object.freeze({
    version: 1, width: 1920, height: 1080, peopleCount: 5, animalCount: 1,
    animalKind: 'cat', direction: 'mixed', speed: 1, figureSize: 100,
    softness: 70, halftone: 75, background: '#f8f8f8', shadow: '#24242a', markers: true
  });
  const storageKey = 'cellmotion-glasswalkers-v1';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const number = (value, fallback, min, max) => clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max);
  const hex = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : null;
  const cycle = () => 12 / state.speed;
  const hash = value => {
    const n = Math.sin(value * 127.1 + 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  const rgba = (color, alpha) => {
    const n = parseInt(color.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  };
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
      markers: source.markers !== false
    };
  }
  const galleryEntry = new URLSearchParams(location.search).has('from');
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (_) {}
  let state = normalize(galleryEntry ? defaults : saved || defaults);
  let language = localStorage.getItem('cellmotion-site-language') === 'en' ? 'en' : 'zh';
  let theme = localStorage.getItem('cellmotion-site-theme') === 'light' ? 'light' : 'dark';
  let selectedFigure = 'people', panel = 'figure', playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time = 0, started = performance.now(), raf = 0, autosave = 0, exporting = false;
  const frame = $('compositionFrame');
  const stage = document.querySelector('.gm-stage');
  const controls = ['peopleCount', 'animalCount', 'animalKind', 'direction', 'speed', 'figureSize', 'softness', 'halftone', 'background', 'shadow', 'markers'];
  const labels = {
    people: ['行人穿行', 'People crossing'],
    animal: ['动物经过', 'Animal passage'],
    crossing: ['人影交错', 'Crossing paths']
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
  function oval(context, x, y, rx, ry, alpha) {
    context.save();
    context.translate(x, y);
    context.scale(rx, ry);
    const gradient = context.createRadialGradient(0, 0, .04, 0, 0, 1);
    gradient.addColorStop(0, rgba(state.shadow, alpha));
    gradient.addColorStop(.48, rgba(state.shadow, alpha * .65));
    gradient.addColorStop(1, rgba(state.shadow, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  function sole(context, x, y, length, breadth, angle, lift = 0) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    oval(context, 0, 0, length * .72 + lift * 9, breadth * .9 + lift * 5, .28 * (1 - lift * .5));
    context.fillStyle = rgba(state.shadow, .93 - lift * .48);
    context.beginPath();
    context.moveTo(-length * .48, -breadth * .18);
    context.bezierCurveTo(-length * .52, -breadth * .48, -length * .25, -breadth * .43, -length * .05, -breadth * .42);
    context.bezierCurveTo(length * .17, -breadth * .52, length * .42, -breadth * .57, length * .57, -breadth * .31);
    context.bezierCurveTo(length * .75, 0, length * .59, breadth * .4, length * .36, breadth * .48);
    context.bezierCurveTo(length * .13, breadth * .53, -length * .05, breadth * .38, -length * .28, breadth * .38);
    context.bezierCurveTo(-length * .47, breadth * .41, -length * .56, breadth * .11, -length * .48, -breadth * .18);
    context.fill();
    context.restore();
  }
  function dots(context, x, y, rx, ry) {
    if (!state.halftone) return;
    const step = 5.8 - state.halftone * .014;
    context.save();
    context.fillStyle = state.shadow;
    for (let yy = y - ry; yy <= y + ry; yy += step) {
      for (let xx = x - rx; xx <= x + rx; xx += step) {
        const u = (xx - x) / rx, v = (yy - y) / ry;
        const weight = Math.max(0, 1 - u * u - v * v);
        if (weight > .06) {
          context.globalAlpha = weight * state.halftone / 400;
          context.beginPath();
          context.arc(xx + (Math.round(yy / step) % 2) * step * .5, yy, .7 + weight * .45, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
    context.restore();
  }
  function softSegment(context, x1, y1, x2, y2, radius, alpha) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.save();
    context.translate((x1 + x2) / 2, (y1 + y2) / 2);
    context.rotate(angle);
    oval(context, 0, 0, Math.hypot(x2 - x1, y2 - y1) * .6 + radius, radius, alpha);
    context.restore();
  }
  function person(context, seconds, actor, width, height, index) {
    const f = [Math.cos(actor.angle), Math.sin(actor.angle)];
    const n = [-f[1], f[0]];
    const eyeX = (width * .5 - actor.x) * .18 / actor.size;
    const eyeY = (-height * .3 - actor.y) * .18 / actor.size;
    const softness = .78 + state.softness / 280;
    const phase = (seconds / cycle() * 10 + index * .37) % 1;
    const feet = [];
    oval(context, eyeX * 1.22, eyeY * 1.22, 73 * softness, 66 * softness, .18);
    softSegment(context, eyeX * .53, eyeY * .53, eyeX * 1.22, eyeY * 1.22, 39 * softness, .29);
    oval(context, eyeX * .62, eyeY * .62, 51 * softness, 42 * softness, .31);
    dots(context, eyeX * .95, eyeY * .95, 75 * softness, 87 * softness);
    for (let side = -1; side <= 1; side += 2) {
      const step = (phase + (side === 1 ? .5 : 0)) % 1;
      const stance = step < .62;
      const along = stance ? 58 - 116 * step / .62 : -58 + 116 * (step - .62) / .38;
      const lift = stance ? 0 : Math.sin((step - .62) / .38 * Math.PI);
      const fx = f[0] * along + n[0] * side * 16;
      const fy = f[1] * along + n[1] * side * 16;
      const kneeX = fx * .45 + eyeX * .46 + n[0] * side * 7;
      const kneeY = fy * .45 + eyeY * .46 + n[1] * side * 7;
      softSegment(context, eyeX * .58 + n[0] * side * 13, eyeY * .58 + n[1] * side * 13, kneeX, kneeY, 22 * softness, .39);
      softSegment(context, kneeX, kneeY, fx, fy, (19 + lift * 8) * softness, .52 - lift * .12);
      dots(context, (kneeX + fx) * .5, (kneeY + fy) * .5, 25 * softness, 35 * softness);
      feet.push({ x: fx, y: fy, angle: actor.angle + side * .11, lift });
    }
    feet.forEach(foot => sole(context, foot.x, foot.y, 76, 35, foot.angle, foot.lift));
  }
  function animal(context, seconds, actor, width, height, index) {
    const dog = state.animalKind === 'dog';
    const size = dog ? 1.36 : 1.12;
    const f = [Math.cos(actor.angle), Math.sin(actor.angle)];
    const n = [-f[1], f[0]];
    const eyeX = (width * .5 - actor.x) * .045 / actor.size;
    const eyeY = (-height * .3 - actor.y) * .045 / actor.size;
    context.scale(size, size);
    const softness = .8 + state.softness / 300;
    const phase = seconds / cycle() * (dog ? 26 : 34) + index * .6;
    softSegment(context, -f[0] * 35 + eyeX, -f[1] * 35 + eyeY, f[0] * 28 + eyeX, f[1] * 28 + eyeY, 20 * softness, .5);
    oval(context, f[0] * 40 + eyeX, f[1] * 40 + eyeY, 21 * softness, 19 * softness, .3);
    dots(context, eyeX, eyeY, 52 * softness, 32 * softness);
    context.save();
    context.strokeStyle = rgba(state.shadow, .22);
    context.lineWidth = dog ? 7 : 5;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-f[0] * 42 + eyeX, -f[1] * 42 + eyeY);
    context.quadraticCurveTo(-f[0] * 80 + n[0] * 12 + eyeX, -f[1] * 80 + n[1] * 12 + eyeY, -f[0] * 78 + n[0] * (25 + Math.sin(phase) * 6) + eyeX, -f[1] * 78 + n[1] * (25 + Math.sin(phase) * 6) + eyeY);
    context.stroke();
    context.restore();
    for (let i = 0; i < 4; i++) {
      const along = i < 2 ? 25 : -28;
      const side = i % 2 ? 1 : -1;
      const step = Math.sin(phase * Math.PI * 2 + i * Math.PI / 2);
      const x = f[0] * (along + step * 12) + n[0] * side * 13;
      const y = f[1] * (along + step * 12) + n[1] * side * 13;
      softSegment(context, x, y, x + eyeX * .7, y + eyeY * .7, 8 * softness, .25);
      sole(context, x, y, dog ? 22 : 16, dog ? 11 : 8, actor.angle, Math.max(0, step) * .65);
    }
    oval(context, f[0] * 48 + n[0] * 8 + eyeX, f[1] * 48 + n[1] * 8 + eyeY, 7, 8, .2);
    oval(context, f[0] * 48 - n[0] * 8 + eyeX, f[1] * 48 - n[1] * 8 + eyeY, 7, 8, .2);
  }
  function pose(index, kind, progress, width, height, count) {
    const horizontal = state.direction === 'horizontal' || (state.direction === 'mixed' && index % 3 !== 2);
    const reverse = index % 2 === 1;
    const lane = .13 + .74 * hash(index + (kind === 'animal' ? 31 : 7));
    const travel = reverse ? 1 - progress : progress;
    const drift = Math.sin(progress * Math.PI * 2 + index * 2) * .035;
    const x = (horizontal ? -.2 + travel * 1.4 : lane + drift) * width;
    const y = (horizontal ? lane + drift : -.25 + travel * 1.5) * height;
    const angle = horizontal ? (reverse ? Math.PI : 0) : (reverse ? -Math.PI / 2 : Math.PI / 2);
    const size = Math.min(width / 1440, height / 900) * state.figureSize / 100 * (.88 + hash(index + count + 4) * .3);
    return { x, y, angle, size };
  }
  function mark(context, kind, index) {
    context.strokeStyle = kind === 'animal' ? 'rgba(85,150,160,.55)' : 'rgba(139,115,210,.5)';
    context.fillStyle = context.strokeStyle;
    context.lineWidth = 1;
    const left = kind === 'animal' ? -48 : -18, top = kind === 'animal' ? -29 : -43;
    const wide = kind === 'animal' ? 96 : 110, high = kind === 'animal' ? 58 : 86;
    for (const [x, y, sx, sy] of [[left, top, 1, 1], [left + wide, top, -1, 1], [left, top + high, 1, -1], [left + wide, top + high, -1, -1]]) {
      context.beginPath();
      context.moveTo(x + sx * 12, y); context.lineTo(x, y); context.lineTo(x, y + sy * 12); context.stroke();
    }
    context.font = '8px ui-monospace,monospace';
    context.fillText((kind === 'animal' ? 'CAT' : 'MOVE') + ' / ' + String(index + 1).padStart(2, '0'), left + 2, top - 5);
  }
  function render(target, seconds, width, height) {
    const context = target.getContext('2d', { alpha: false, willReadFrequently: target !== canvas });
    context.setTransform(target.width / width, 0, 0, target.height / height, 0, 0);
    context.fillStyle = state.background;
    context.fillRect(0, 0, width, height);
    const u = ((seconds / cycle()) % 1 + 1) % 1;
    for (let i = 0; i < state.peopleCount; i++) {
      const p = (u + (i + .34) / Math.max(1, state.peopleCount)) % 1;
      const actor = pose(i, 'person', p, width, height, state.peopleCount);
      context.save();
      context.translate(actor.x, actor.y);
      context.scale(actor.size, actor.size);
      person(context, seconds, actor, width, height, i);
      if (state.markers && i % 2 === 0) mark(context, 'person', i);
      context.restore();
    }
    if (u >= .23 && u <= .76) {
      for (let i = 0; i < state.animalCount; i++) {
        const p = (u - .23) / .53 * .9 + i / Math.max(1, state.animalCount) * .28;
        if (p > 1) continue;
        const actor = pose(i + 12, 'animal', p, width, height, state.animalCount);
        context.save();
        context.translate(actor.x, actor.y);
        context.scale(actor.size, actor.size);
        animal(context, seconds, actor, width, height, i);
        if (state.markers) mark(context, 'animal', i);
        context.restore();
      }
    }
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
    render(canvas, time, width, height);
  }
  function updateTimeline() {
    const total = cycle(), u = time / total;
    $('scrubber').max = String(total);
    $('scrubber').value = String(clamp(time, 0, total));
    $('timeReadout').textContent = time.toFixed(2) + ' / ' + total.toFixed(2) + ' s';
    $('playhead').style.left = (u * 100) + '%';
    const beats = [
      ['people', 0, .23, '0–' + (total * .23).toFixed(1) + 's'],
      ['animal', .23, .53, (total * .53).toFixed(1) + 's'],
      ['crossing', .76, .24, (total * .24).toFixed(1) + 's']
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
    render(canvas, time, state.width, state.height);
    $('scrubber').value = String(time);
    $('timeReadout').textContent = time.toFixed(2) + ' / ' + cycle().toFixed(2) + ' s';
    $('playhead').style.left = (time / cycle() * 100) + '%';
  }
  function tick(now) {
    if (!playing) { raf = 0; return; }
    time = ((now - started) / 1000) % cycle();
    redraw();
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
    render(output, time, state.width, state.height);
    output.toBlob(blob => {
      if (blob) download(blob, 'glass-walkers-' + state.width + 'x' + state.height + '.png');
      status('exportStatus', blob ? 'PNG 已生成' : 'PNG 生成失败', blob ? 'PNG ready' : 'PNG failed');
    }, 'image/png');
  });
  $('exportGif').addEventListener('click', async () => {
    if (exporting) return;
    if (!window.GIF) { status('exportStatus', 'GIF 编码器未加载', 'GIF encoder unavailable'); return; }
    const output = exportCanvas(), fps = Number($('exportFps').value), length = exportLength();
    const frames = Math.ceil(fps * length);
    busy(true, '正在准备 GIF…', 'Preparing GIF…');
    try {
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: 'js/continuation-gif.worker.js' });
      for (let i = 0; i < frames; i++) {
        render(output, i / fps, state.width, state.height);
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
    const output = exportCanvas(), fps = Number($('exportFps').value), frames = Math.ceil(exportLength() * fps);
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
        render(output, i / fps, state.width, state.height);
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
