/* CellMotion three-column shell. Original controls, state and renderer remain authoritative. */
(() => {
  if (new URLSearchParams(location.search).has('preview')) return;
  const $ = id => document.getElementById(id);
  const body = document.body;
  const inspector = $('glyphMorphInspector');
  if (!inspector) return;
  const rows = $('sequenceRows');
  const card = id => $(id)?.closest('.gm-card') || null;
  const make = (tag, className, html = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };
  body.classList.add('tc-workspace');
  const header = inspector.querySelector('.gm-header');
  header.classList.add('tc-header');
  if (!header.querySelector('.tc-brand')) {
    const brand = make('a', 'tc-brand', '<img src="assets/cellmotion/logo-original.png" alt="CellMotion">');
    brand.href = 'cellmotion.html';
    brand.setAttribute('aria-label', 'CellMotion 首页');
    const legacy = header.querySelector('a');
    if (legacy) legacy.replaceWith(brand);
    else header.prepend(brand);
  }
  const tagline = header.querySelector('small');
  if (tagline) tagline.textContent = '让创意，自由生长';
  body.prepend(header);
  header.append(make('a', 'tc-back', '动效库'));
  header.lastChild.href = 'cellmotion-components.html';
  const exportShortcut = make('button', 'tc-export-shortcut', '导出作品');
  exportShortcut.type = 'button';
  header.append(exportShortcut);

  const contentCard = card('sequenceRows');
  const addRowButton = $('addRow');
  addRowButton.setAttribute('aria-label', '添加文字段落');
  contentCard.querySelector('.gm-text-colors')?.setAttribute('hidden', '');
  contentCard.querySelector('.gm-help')?.remove();
  contentCard.querySelector('.gm-card-title')?.remove();
  const left = make('aside', 'tc-content', '<div class="tc-panel-heading"><div><small>CONTENT</small><h2>文字段落 <span id="tcRowCount"></span></h2></div></div><p class="tc-hint">选择一段文字，在右侧编辑</p><div class="tc-row-list" id="tcRowList" aria-label="选择文字段落"></div>');
  left.setAttribute('aria-label', '段落导航');
  left.querySelector('.tc-panel-heading').append(addRowButton);
  body.append(left);
  const schemeCard = card('saveScheme');
  schemeCard.classList.add('tc-scheme');
  left.append(schemeCard);

  const tabs = make('nav', 'tc-tabs', '<button type="button" data-panel="row" aria-pressed="true">当前段落</button><button type="button" data-panel="global" aria-pressed="false">动效设置</button><button type="button" data-panel="export" aria-pressed="false">导出</button>');
  tabs.setAttribute('aria-label', '属性分类');
  inspector.prepend(tabs);
  const rowPanel = make('section', 'tc-properties', '<div class="tc-panel-heading"><div><small>SELECTED CELL</small><h2 id="tcSelectedTitle">段落 01</h2></div></div>');
  rowPanel.dataset.panel = 'row';
  rowPanel.append(contentCard);
  const globalPanel = make('section', 'tc-properties');
  globalPanel.dataset.panel = 'global';
  globalPanel.hidden = true;
  const motionCard = card('introEnabled') || card('morphDuration');
  [card('fontFamily'), motionCard].filter(Boolean).forEach(node => globalPanel.append(node));
  const exportPanel = make('section', 'tc-properties');
  exportPanel.dataset.panel = 'export';
  exportPanel.hidden = true;
  exportPanel.append(card('exportPng'));
  inspector.append(rowPanel, globalPanel, exportPanel);
  const libraryCard = card('openIconLibrary');
  if (libraryCard) libraryCard.hidden = true;

  const toolbar = make('section', 'tc-canvas-toolbar', '<span class="tc-preview-label">画布预览</span>');
  const canvasCard = card('canvasPreset');
  canvasCard.querySelector('.gm-card-title')?.remove();
  toolbar.append(canvasCard);
  const center = make('section', 'tc-center');
  center.setAttribute('aria-label', '画布与播放');
  const stage = $('glyphMorphStage');
  const timeline = card('timeline');
  const controls = stage.querySelector('.gm-stage-controls');
  timeline.classList.add('tc-timeline');
  timeline.querySelector('.gm-card-title')?.replaceWith(controls);
  center.append(toolbar, stage, timeline);
  body.append(center);

  function setPanel(name) {
    [rowPanel, globalPanel, exportPanel].forEach(panel => panel.hidden = panel.dataset.panel !== name);
    tabs.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === name)));
  }
  tabs.addEventListener('click', e => {
    const button = e.target.closest('button[data-panel]');
    if (button) setPanel(button.dataset.panel);
  });
  exportShortcut.addEventListener('click', () => {
    body.classList.remove('gm-inspector-hidden');
    $('closeIconLibrary')?.click();
    setPanel('export');
  });

  let selectedId = rows.firstElementChild?.dataset.rowId;
  const rowList = $('tcRowList');
  function pauseRow(row) {
    row?.querySelector('[data-action="pause-row"]')?.click();
  }
  function selectRow(id, seek = false) {
    selectedId = id;
    setPanel('row');
    syncRows();
    if (seek) pauseRow([...rows.children].find(row => row.dataset.rowId === id));
  }
  function syncRows() {
    const shells = [...rows.children];
    if (!shells.some(row => row.dataset.rowId === selectedId)) selectedId = shells[0]?.dataset.rowId;
    $('tcRowCount').textContent = String(shells.length);
    const oldFocus = document.activeElement?.closest('.tc-row-select')?.dataset.rowId;
    rowList.replaceChildren(...shells.map((row, index) => {
      const selected = row.dataset.rowId === selectedId;
      row.hidden = !selected;
      if (selected) $('tcSelectedTitle').textContent = `段落 ${String(index + 1).padStart(2, '0')}`;
      const hold = row.querySelector('[data-key="hold"]');
      if (hold && !hold.closest('label')) {
        const label = make('label', 'tc-hold-label', '停留 / 毫秒');
        hold.before(label);
        label.append(hold);
      }
      const button = make('button', 'tc-row-select');
      button.type = 'button';
      button.dataset.rowId = row.dataset.rowId;
      button.setAttribute('aria-pressed', String(selected));
      const number = make('span', 'tc-row-number');
      number.textContent = String(index + 1).padStart(2, '0');
      const title = make('strong', 'tc-row-text');
      title.textContent = row.querySelector('[data-key="text"]')?.value || '留白段落';
      const meta = make('small', 'tc-row-description');
      const holdSeconds = hold ? `${Number(hold.value) / 1000}s 停留` : '独立段落';
      meta.textContent = `${holdSeconds} · ${row.querySelectorAll('.gm-inline-icon-chip').length} 个图标`;
      button.append(number, title, meta);
      return button;
    }));
    if (oldFocus) [...rowList.children].find(row => row.dataset.rowId === oldFocus)?.focus({ preventScroll: true });
  }
  rowList.addEventListener('click', e => {
    const button = e.target.closest('[data-row-id]');
    if (button) selectRow(button.dataset.rowId, true);
  });
  new MutationObserver(syncRows).observe(rows, { childList: true });
  rows.addEventListener('input', e => {
    syncRows();
    if (['text', 'hold'].includes(e.target.dataset.key)) pauseRow(e.target.closest('[data-row-id]'));
  });
  rows.addEventListener('focusin', e => {
    const row = e.target.closest('[data-row-id]');
    if (row && row.dataset.rowId !== selectedId) selectRow(row.dataset.rowId);
  });
  $('addRow').addEventListener('click', () => selectRow(rows.lastElementChild.dataset.rowId, true));
  $('iconRow')?.addEventListener('change', e => selectRow(e.target.value));
  syncRows();
  window.dispatchEvent(new Event('resize'));
})();
