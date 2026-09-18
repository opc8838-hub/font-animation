(() => {
  if (new URLSearchParams(location.search).has('preview')) return;
  const $ = id => document.getElementById(id);
  const panel = $('controlPanel');
  if (!panel) return;
  const make = (tag, className, html = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };
  const body = document.body;
  body.classList.add('tc-workspace', 'glyphmorph-editor');
  panel.open = true;
  const header = make('header', 'gm-header tc-header', '<a class="tc-brand" href="cellmotion.html" aria-label="CellMotion 首页"><img src="assets/cellmotion/logo-original.png" alt="CellMotion"></a><div><small>让创意，自由生长</small><h1>无重力翻转 <span>Zero-G Flip</span></h1></div>');
  body.prepend(header);
  header.append(make('a', 'tc-back', '动效库'));
  header.lastChild.href = 'cellmotion-components.html';
  const exportShortcut = make('button', 'tc-export-shortcut', '导出作品');
  exportShortcut.type = 'button';
  header.append(exportShortcut);

  const assetCard = $('assetCard');
  const left = make('aside', 'tc-content', '<div class="tc-panel-heading"><div><small>内容</small><h2>素材</h2></div></div><p class="tc-hint">首图翻转，转完立刻切 2–3 张图。主图更大，画布含 19:6</p>');
  const scheme = document.querySelector('.scheme-section');
  scheme.classList.add('tc-scheme', 'gm-card');
  left.append(scheme);
  body.append(left);

  const inspector = make('aside', 'gm-inspector');
  inspector.id = 'glyphMorphInspector';
  const tabs = make('nav', 'tc-tabs', '<button type="button" data-panel="row" aria-pressed="true">当前素材</button><button type="button" data-panel="global" aria-pressed="false">动效设置</button><button type="button" data-panel="export" aria-pressed="false">导出</button>');
  const rowPanel = make('section', 'tc-properties');
  rowPanel.dataset.panel = 'row';
  assetCard.querySelector('.gm-card-title')?.remove();
  rowPanel.append(assetCard);
  const globalPanel = make('section', 'tc-properties');
  globalPanel.dataset.panel = 'global';
  globalPanel.hidden = true;
  globalPanel.append(document.getElementById('motionCard'));
  const exportPanel = make('section', 'tc-properties');
  exportPanel.dataset.panel = 'export';
  exportPanel.hidden = true;
  exportPanel.append(document.querySelector('.export-panel'));
  inspector.append(tabs, rowPanel, globalPanel, exportPanel);
  body.append(inspector);

  const toolbar = make('section', 'tc-canvas-toolbar', '<span class="tc-preview-label">画布预览</span>');
  const canvasCard = document.querySelector('.gm-canvas-card');
  canvasCard.querySelector('.gm-card-title')?.remove();
  toolbar.append(canvasCard);
  const center = make('section', 'tc-center');
  const stage = document.querySelector('.stage-shell');
  const timeline = document.querySelector('.choreo-section');
  timeline.classList.add('tc-timeline', 'gm-card');
  const controls = stage.querySelector('.gm-stage-controls');
  const title = timeline.querySelector('.gm-card-title');
  if (title) title.replaceWith(controls);
  else timeline.prepend(controls);
  center.append(toolbar, stage, timeline);
  body.append(center);
  panel.remove();

  const setPanel = name => {
    [rowPanel, globalPanel, exportPanel].forEach(section => { section.hidden = section.dataset.panel !== name; });
    tabs.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.panel === name)));
  };
  tabs.addEventListener('click', e => {
    const button = e.target.closest('button[data-panel]');
    if (button) setPanel(button.dataset.panel);
  });
  exportShortcut.addEventListener('click', () => {
    body.classList.remove('gm-inspector-hidden');
    setPanel('export');
  });
  window.dispatchEvent(new Event('resize'));
})();
