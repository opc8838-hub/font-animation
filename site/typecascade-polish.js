/* Presentation adapter: reads the existing timeline, never changes choreography. */
(() => {
  if (!document.body.classList.contains('tc-workspace')) return;
  const $ = id => document.getElementById(id);
  const body = document.body;
  const themeButton = document.createElement('button');
  themeButton.type = 'button';
  themeButton.className = 'tc-theme-toggle';
  themeButton.id = 'tcThemeToggle';
  document.querySelector('.tc-export-shortcut').before(themeButton);
  const darkLogo = document.querySelector('.tc-brand img');
  darkLogo.classList.add('tc-logo-dark');
  darkLogo.src = 'assets/cellmotion/logo-dark-original.png';
  const lightLogo = darkLogo.cloneNode();
  lightLogo.className = 'tc-logo-light';
  lightLogo.src = 'assets/cellmotion/logo-original.png';
  lightLogo.alt = '';
  lightLogo.setAttribute('aria-hidden', 'true');
  darkLogo.after(lightLogo);
  function setTheme(theme) {
    body.dataset.editorTheme = theme;
    document.documentElement.style.colorScheme = theme;
    const dark = theme === 'dark';
    themeButton.textContent = dark ? '☀ 浅色' : '☾ 深色';
    themeButton.setAttribute('aria-label', dark ? '切换为浅色编辑器' : '切换为深色编辑器');
    try { localStorage.setItem('cellmotion-editor-theme', theme); } catch (_) { /* Private storage may be unavailable. */ }
  }
  let savedTheme;
  try { savedTheme = localStorage.getItem('cellmotion-editor-theme'); } catch (_) { /* Use dark by default. */ }
  setTheme(savedTheme === 'light' ? 'light' : 'dark');
  themeButton.addEventListener('click', () => setTheme(body.dataset.editorTheme === 'dark' ? 'light' : 'dark'));

  // Optional recording backdrop: expand only the selected artwork background
  // across the stage. The composition frame remains the renderer's exact size.
  const backdropButton = document.createElement('button');
  backdropButton.type = 'button';
  backdropButton.className = 'tc-backdrop-toggle';
  backdropButton.id = 'tcBackdropToggle';
  backdropButton.textContent = '▧ 铺满背景';
  backdropButton.setAttribute('aria-pressed', 'false');
  backdropButton.setAttribute('aria-label', '开启背景铺满');
  document.querySelector('.tc-canvas-toolbar .gm-canvas-card').before(backdropButton);
  function selectedBackgroundColor() {
    return document.querySelector('#sequenceRows > .gm-row-shell:not([hidden]) [data-background-key="backgroundColor"]')?.value
      || $('backgroundColor')?.value
      || '#ffffff';
  }
  function syncBackdropColor() {
    document.querySelector('.gm-stage').style.setProperty('--tc-showcase-bg', selectedBackgroundColor());
  }
  function setBackdrop(enabled) {
    body.classList.toggle('tc-stage-backdrop-on', enabled);
    backdropButton.setAttribute('aria-pressed', String(enabled));
    backdropButton.setAttribute('aria-label', enabled ? '关闭背景铺满' : '开启背景铺满');
    syncBackdropColor();
  }
  backdropButton.addEventListener('click', () => setBackdrop(!body.classList.contains('tc-stage-backdrop-on')));
  document.addEventListener('input', event => {
    if (event.target.matches('#backgroundColor,[data-background-key="backgroundColor"]')) syncBackdropColor();
  });
  document.getElementById('tcRowList').addEventListener('click', () => requestAnimationFrame(syncBackdropColor));
  new MutationObserver(syncBackdropColor).observe(document.getElementById('sequenceRows'), { childList: true });
  syncBackdropColor();

  // Keep original range controls/listeners and outputs; add precise, separate numeric inputs.
  const ranges = [...document.querySelectorAll('.gm-field input[type="range"]')];
  ranges.forEach(range => {
    const field = range.closest('.gm-field');
    const output = document.querySelector(`output[for="${range.id}"]`);
    if (!output) return;
    const labelText = [...field.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
    field.classList.add('tc-range-field');
    range.setAttribute('aria-label', labelText);
    const valueBox = document.createElement('span');
    valueBox.className = 'tc-number-box';
    const number = document.createElement('input');
    number.type = 'number';
    number.id = `${range.id}Exact`;
    number.setAttribute('aria-label', `${labelText}数值`);
    const unit = document.createElement('span');
    unit.className = 'tc-number-unit';
    const factor = range.id === 'characterDelay' ? 100 : 1;
    number.min = String(Number(range.min) * factor);
    number.max = String(Number(range.max) * factor);
    number.step = String(Number(range.step) * factor);
    valueBox.append(number, unit);
    field.append(valueBox);
    output.hidden = true;
    function sync() {
      if (document.activeElement !== number) number.value = String(Number((Number(range.value) * factor).toFixed(4)));
      unit.textContent = output.value.replace(/[\d.\s+-]/g, '');
      const percent = (Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min)) * 100;
      range.style.setProperty('--tc-range-progress', `${percent}%`);
    }
    const commit = () => {
      if (number.value === '' || !Number.isFinite(number.valueAsNumber)) { number.value = String(Number(range.value) * factor); sync(); return; }
      range.value = String(number.valueAsNumber / factor);
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      number.value = String(Number((Number(range.value) * factor).toFixed(4)));
      sync();
    };
    number.addEventListener('change', commit);
    number.addEventListener('keydown', e => { if (e.key === 'Enter') { commit(); number.blur(); } });
    number.addEventListener('blur', commit);
    range.addEventListener('input', sync);
    new MutationObserver(sync).observe(output, { childList: true, subtree: true, characterData: true });
    sync();
  });

  const timeline = $('timeline');
  const scrubber = $('scrubber');
  const scroll = timeline.parentElement;
  scroll.classList.add('tc-phase-scroll');
  const surface = document.createElement('div');
  surface.className = 'tc-phase-surface';
  timeline.before(surface);
  surface.append(timeline);
  const ruler = document.createElement('div');
  ruler.className = 'tc-time-ruler';
  ruler.setAttribute('aria-hidden', 'true');
  const playhead = document.createElement('div');
  playhead.className = 'tc-phase-playhead me-choreo-playhead';
  playhead.setAttribute('aria-hidden', 'true');
  surface.append(ruler, playhead);
  const details = document.createElement('details');
  details.className = 'tc-phase-details';
  details.innerHTML = '<summary>阶段详情 <span>名称与起止时间</span></summary><ol class="me-choreo-legend"></ol>';
  document.querySelector('.tc-timeline').append(details);
  const legend = details.querySelector('ol');
  const phaseColors = { '立字开场': '#d7ff2f', '停留': '#8ec8ff', '倾倒': '#9de7d7', '悬停': '#ffc4d6', '下落': '#ffd27d', '结束停留': '#d4b8ff' };
  let phases = [];
  let total = 1;
  let width = 1;
  let activeIndex = -1;
  let followPlayback = true;
  let lastTime = -1;
  function rebuildTrack() {
    total = Math.max(1, Number(scrubber.max));
    const blocks = [...timeline.children];
    phases = blocks.map((block, index) => {
      const start = Number(block.dataset.seekMs);
      const end = index + 1 < blocks.length ? Number(blocks[index + 1].dataset.seekMs) : total;
      const label = block.querySelector('strong').textContent;
      const info = block.querySelector('small').textContent;
      const color = phaseColors[label] || '#d4b8ff';
      block.style.setProperty('--tc-phase-color', color);
      block.title = `${label} · ${info} · ${(start / 1000).toFixed(2)}–${(end / 1000).toFixed(2)}s`;
      block.setAttribute('aria-label', block.title);
      // Retain the shared listitem role and native button keyboard behavior.
      block.setAttribute('aria-current', 'false');
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const dot = document.createElement('i');
      dot.style.background = color;
      const name = document.createElement('strong');
      name.textContent = `${index + 1}. ${label} · ${info.split(' · ')[0]}`;
      const time = document.createElement('span');
      time.textContent = `${(start / 1000).toFixed(2)}–${(end / 1000).toFixed(2)}s`;
      button.append(dot, name, time);
      button.addEventListener('click', () => { block.click(); followPlayback = true; });
      item.append(button);
      return { block, item, start, end };
    });
    legend.replaceChildren(...phases.map(phase => phase.item));
    activeIndex = -1;
    lastTime = -1;
    fitTrack();
  }
  function fitTrack() {
    // One scale for blocks, ticks and playhead; gaps are inset inside time slots.
    width = Math.max(scroll.clientWidth - 4, total / 1000 * 200);
    surface.style.width = `${width}px`;
    phases.forEach(({ block, start, end }) => {
      const slot = (end - start) / total * width;
      block.style.left = `${start / total * 100}%`;
      block.style.width = `${Math.max(2, slot - 8)}px`;
      block.classList.toggle('tc-phase-narrow', slot < 48);
      block.classList.toggle('tc-phase-medium', slot < 105);
    });
    const pixelsPerSecond = width / (total / 1000);
    const step = pixelsPerSecond > 100 ? .2 : 1;
    const ticks = [];
    for (let seconds = 0; seconds <= total / 1000; seconds += step) {
      const tick = document.createElement('span');
      tick.style.left = `${seconds * pixelsPerSecond}px`;
      const major = Math.abs(seconds - Math.round(seconds)) < .001;
      tick.className = major ? 'is-major' : '';
      if (major) tick.textContent = `${Math.round(seconds)}s`;
      ticks.push(tick);
    }
    ruler.replaceChildren(...ticks);
    lastTime = -1;
  }
  new MutationObserver(rebuildTrack).observe(timeline, { childList: true });
  new ResizeObserver(fitTrack).observe(scroll);
  function seekAt(event) {
    const rect = surface.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / width));
    scrubber.value = String(fraction * total);
    scrubber.dispatchEvent(new Event('input', { bubbles: true }));
    lastTime = -1;
  }
  [ruler, playhead].forEach(handle => {
    handle.addEventListener('pointerdown', e => { if (e.button !== 0) return; followPlayback = false; handle.setPointerCapture(e.pointerId); seekAt(e); });
    handle.addEventListener('pointermove', e => { if (handle.hasPointerCapture(e.pointerId)) seekAt(e); });
    handle.addEventListener('pointerup', e => { if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId); });
  });
  scroll.addEventListener('wheel', () => { followPlayback = false; }, { passive: true });
  scroll.addEventListener('touchstart', () => { followPlayback = false; }, { passive: true });
  timeline.addEventListener('click', () => { followPlayback = true; lastTime = -1; });
  $('restartPreview').addEventListener('click', () => { followPlayback = true; scroll.scrollLeft = 0; });
  $('togglePlayback').addEventListener('click', () => { followPlayback = true; });
  function updatePlayhead() {
    // The existing renderer writes this value from its deterministic clock.
    const time = Number(scrubber.value);
    if (time !== lastTime && !document.hidden) {
      const x = time / total * width;
      playhead.style.transform = `translateX(${x}px)`;
      const index = phases.findIndex(p => time >= p.start && time < p.end);
      if (index !== activeIndex) {
        [phases[activeIndex], phases[index]].forEach(p => { if (p) { const active = p === phases[index]; p.block.classList.toggle('is-active', active); p.block.setAttribute('aria-current', String(active)); p.item.classList.toggle('is-active', active); } });
        activeIndex = index;
      }
      if (followPlayback && (x > scroll.scrollLeft + scroll.clientWidth - 20 || x < scroll.scrollLeft)) scroll.scrollLeft = Math.max(0, x - 30);
      lastTime = time;
    }
    requestAnimationFrame(updatePlayhead);
  }
  rebuildTrack();
  requestAnimationFrame(updatePlayhead);
})();
