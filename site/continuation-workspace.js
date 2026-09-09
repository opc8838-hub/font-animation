/* Continuation adapter for the CellMotion three-column shell. Original pair state stays authoritative. */
(() => {
  if (new URLSearchParams(location.search).has('preview')) return;
  const $ = id => document.getElementById(id);
  const body = document.body;
  const panel = $('controlPanel');
  if (!panel) return;
  const make = (tag, className, html = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };
  body.classList.add('tc-workspace');
  panel.open = true;
  const header = make('header', 'gm-header tc-header', '<a class="tc-brand" href="cellmotion.html" aria-label="CellMotion 首页"><img src="assets/cellmotion/logo-original.png" alt="CellMotion"></a><div><small>让创意，自由生长</small><h1>续句 <span>Continuation</span></h1></div>');
  body.prepend(header);
  header.append(make('a', 'tc-back', '动效库'));
  header.lastChild.href = 'cellmotion-components.html';
  const exportShortcut = make('button', 'tc-export-shortcut', '导出作品');
  exportShortcut.type = 'button';
  header.append(exportShortcut);

  const pairSection = document.querySelector('.pair-editor-section');
  const addRowButton = $('addPairButton');
  addRowButton.setAttribute('aria-label', '添加文字段落');
  const left = make('aside', 'tc-content', '<div class="tc-panel-heading"><div><small>CONTENT</small><h2>文字段落 <span id="tcRowCount"></span></h2></div></div><p class="tc-hint">选择一段文字，在右侧编辑</p><div class="tc-row-list" id="tcRowList" aria-label="选择文字段落"></div>');
  left.setAttribute('aria-label', '段落导航');
  left.querySelector('.tc-panel-heading').append(addRowButton);
  const schemeSection = document.querySelector('.scheme-section');
  schemeSection.classList.add('tc-scheme', 'gm-card');
  left.append(schemeSection);
  body.append(left);

  const inspector = make('aside', 'gm-inspector');
  inspector.id = 'glyphMorphInspector';
  inspector.setAttribute('aria-label', '续句编辑器');
  const tabs = make('nav', 'tc-tabs', '<button type="button" data-panel="row" aria-pressed="true">当前段落</button><button type="button" data-panel="global" aria-pressed="false">动效设置</button><button type="button" data-panel="export" aria-pressed="false">导出</button>');
  tabs.setAttribute('aria-label', '属性分类');
  const rowPanel = make('section', 'tc-properties', '<div class="tc-panel-heading"><div><small>SELECTED CELL</small><h2 id="tcSelectedTitle">段落 01</h2></div></div>');
  rowPanel.dataset.panel = 'row';
  pairSection.querySelector('.section-heading')?.remove();
  pairSection.querySelector('.pair-editor-head')?.remove();
  const inheritedColors = pairSection.querySelector('.continuation-colors');
  if (inheritedColors) inheritedColors.hidden = true;
  rowPanel.append(pairSection, document.querySelector('.icon-section'));
  const globalPanel = make('section', 'tc-properties');
  globalPanel.dataset.panel = 'global';
  globalPanel.hidden = true;
  document.querySelector('.font-picker')?.classList.add('gm-card');
  document.querySelector('.motion-section')?.classList.add('gm-card');
  globalPanel.append(document.querySelector('.font-picker'), document.querySelector('.motion-section'));
  const exportPanel = make('section', 'tc-properties');
  exportPanel.dataset.panel = 'export';
  exportPanel.hidden = true;
  document.querySelector('.export-panel')?.classList.add('gm-card');
  exportPanel.append(document.querySelector('.export-panel'));
  inspector.append(tabs, rowPanel, globalPanel, exportPanel);
  body.append(inspector);

  const toolbar = make('section', 'tc-canvas-toolbar', '<span class="tc-preview-label">画布预览</span>');
  const canvasCard = make('section', 'gm-card gm-canvas-card');
  canvasCard.append(document.querySelector('.canvas-size-section .full-field'), $('customSize'));
  document.querySelector('.canvas-size-section')?.remove();
  toolbar.append(canvasCard);
  const center = make('section', 'tc-center');
  center.setAttribute('aria-label', '画布与播放');
  const stage = document.querySelector('.stage-shell');
  stage.id = 'glyphMorphStage';
  stage.classList.add('gm-stage');
  document.querySelector('.design-frame')?.classList.add('gm-composition-frame');
  const timeline = document.querySelector('.choreo-section');
  timeline.classList.add('tc-timeline', 'gm-card');
  const controls = stage.querySelector('.me-stage-controls');
  controls.classList.add('gm-stage-controls');
  timeline.querySelector('.section-label')?.replaceWith(controls);
  center.append(toolbar, stage, timeline);
  body.append(center);
  panel.remove();

  function setPanel(name) {
    [rowPanel, globalPanel, exportPanel].forEach(section => section.hidden = section.dataset.panel !== name);
    tabs.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === name)));
  }
  tabs.addEventListener('click', e => {
    const button = e.target.closest('button[data-panel]');
    if (button) setPanel(button.dataset.panel);
  });
  exportShortcut.addEventListener('click', () => setPanel('export'));

  const pairEditor = $('pairEditor');
  const rowList = $('tcRowList');
  let selectedIndex = 0;
  function pairRows() {
    return [...pairEditor.querySelectorAll('.pair-editor-row')];
  }
  function selectRow(index, seek = false) {
    selectedIndex = Math.max(0, Math.min(index, pairRows().length - 1));
    setPanel('row');
    syncRows();
    if (seek) window.CellMotionContinuation?.seekRow?.(selectedIndex);
  }
  function syncRows() {
    const shells = pairRows();
    if (selectedIndex >= shells.length) selectedIndex = Math.max(0, shells.length - 1);
    $('tcRowCount').textContent = String(shells.length);
    rowList.replaceChildren(...shells.map((row, index) => {
      const selected = index === selectedIndex;
      row.hidden = !selected;
      row.classList.toggle('is-selected-pair', selected);
      if (selected) $('tcSelectedTitle').textContent = `段落 ${String(index + 1).padStart(2, '0')}`;
      const lead = row.querySelector('.pair-lead-input')?.value || '前半句';
      const suffix = row.querySelector('.pair-suffix-input')?.value || '后半句';
      const button = make('button', 'tc-row-select');
      button.type = 'button';
      button.dataset.rowIndex = String(index);
      button.setAttribute('aria-pressed', String(selected));
      const number = make('span', 'tc-row-number');
      number.textContent = String(index + 1).padStart(2, '0');
      const title = make('strong', 'tc-row-text');
      title.textContent = `${lead} → ${suffix}`;
      const meta = make('small', 'tc-row-description');
      meta.textContent = row.querySelector('.pair-timing-summary')?.textContent || '句组';
      button.append(number, title, meta);
      return button;
    }));
  }
  rowList.addEventListener('click', e => {
    const button = e.target.closest('[data-row-index]');
    if (button) selectRow(Number(button.dataset.rowIndex), true);
  });
  new MutationObserver(syncRows).observe(pairEditor, { childList: true });
  pairEditor.addEventListener('input', syncRows);
  pairEditor.addEventListener('focusin', e => {
    const row = e.target.closest('.pair-editor-row');
    if (!row) return;
    const index = pairRows().indexOf(row);
    if (index >= 0 && index !== selectedIndex) selectRow(index);
  });
  addRowButton.addEventListener('click', () => requestAnimationFrame(() => selectRow(pairRows().length - 1, true)));
  syncRows();
  window.dispatchEvent(new Event('resize'));
})();
