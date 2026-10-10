/* Shared CellMotion shell for two independent card tools. No server or build dependency. */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id), M = window.CardMotion, effect = document.body.dataset.cardmotion;
  const login = effect === 'card-login', params = new URLSearchParams(location.search), preview = params.has('preview');
  const storageKey = `cellmotion-${effect}-v1`, resources = new Map(), clone = v => JSON.parse(JSON.stringify(v));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let language = localStorage.getItem('cellmotion-language') === 'en' ? 'en' : 'zh';
  const tr = (zh, en) => language === 'en' ? en : zh;
  const t = (zh, en) => `<span data-zh="${esc(zh)}" data-en="${esc(en)}">${esc(tr(zh, en))}</span>`;
  const readPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
  const putPath = (o, p, v) => { const keys = p.split('.'), key = keys.pop(); keys.reduce((a, k) => a[k], o)[key] = v; };
  let state, selected = login ? 'scene' : 'card-0', candidate = null, time = 0, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let customCanvas = false;
  let busy = false, last = performance.now(), autosave, ready = false, history = [], future = [], definition;
  const fields = login ? [
    ['motion.duration','翻转时长','Flip duration',.6,4,.01,'s'], ['motion.hold','登录停留','Login hold',0,5,.1,'s'],
    ['motion.faceSwitch','翻面变白时机','White face switch',.1,.6,.001,'%'],
    ['motion.contentDelay','文字出现延迟','Content delay',0,3,.01,'s'], ['motion.contentDuration','文字渐入时长','Content reveal',.1,2,.01,'s'],
    ['motion.scaleX','起始卡片宽度','Starting width',.15,1,.005,'%'], ['motion.scaleY','起始卡片高度','Starting height',.15,1,.005,'%'],
    ['motion.startZ','起始倾角','Starting tilt',-30,30,1,'°'], ['motion.startY','起始旋转','Starting rotation',-25,25,1,'°'],
    ['motion.offsetY','衔接垂直偏移','Handoff offset',-100,100,1,'px'], ['motion.perspective','透视距离','Perspective',600,3000,10,'px'],
    ['motion.overshoot','归位缓冲','Settle overshoot',0,.06,.001,'%']
  ] : [
    ['motion.rows','行数','Rows',1,5,1,''], ['motion.gap','卡片间距','Card gap',0,.3,.005,'%'],
    ['motion.size','卡片大小','Card size',.65,1.25,.01,'%'], ['motion.derive','横移速度','Drift speed',0,.8,.01,''],
    ['motion.repos','单卡停留','Stack hold',0,4,.1,'s'], ['motion.ouvre','展开时长','Spread duration',.2,4,.01,'s'],
    ['motion.tenue','横移时长','Drift duration',0,8,.1,'s'], ['motion.repli','收拢时长','Gather duration',.2,4,.01,'s'],
    ['motion.stagger','抽出交错','Card stagger',0,.5,.01,'s'], ['motion.pile','展开缩小倍率','Spread scale',.5,1,.01,'%'],
    ['motion.angle','叠放角度','Stack angle',-20,20,1,'°'], ['motion.inclinaison','飞行倾角','Flight tilt',0,18,1,'°'],
    ['motion.ratio','卡片高宽比','Height / width',1,2,.01,'']
  ];
  const input = (path, zh, en, type = 'text', extra = '') => `<label class="gm-field"><span>${t(zh,en)}</span><input data-path="${path}" type="${type}" ${extra}></label>`;
  const range = ([path, zh, en, min, max, step, unit]) => `<label class="gm-field"><span>${t(zh,en)}<output data-value="${path}" data-unit="${unit}"></output></span><input data-path="${path}" type="range" min="${min}" max="${max}" step="${step}"></label>`;
  const options = values => values.map(([value, zh, en]) => `<option value="${value}" data-zh="${esc(zh)}" data-en="${esc(en)}">${esc(tr(zh,en))}</option>`).join('');
  const select = (path, zh, en, values) => `<label class="gm-field"><span>${t(zh,en)}</span><select data-path="${path}">${options(values)}</select></label>`;
  const check = (path, zh, en) => `<label class="cm-check"><input data-path="${path}" type="checkbox">${t(zh,en)}</label>`;
  const title = tr(login ? '翻牌登录' : '卡牌剧场', login ? 'Card Login' : 'Card Deck');
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="tc-header">
      <a class="tc-brand" href="cellmotion.html" aria-label="CellMotion"><img src="assets/cellmotion/logo-original-transparent.png?v=20260926-3" alt="CellMotion"></a>
      <div class="cm-title"><small>${t('让创意，自由生长','Let creativity grow')}</small><h1>${t(login?'翻牌登录':'卡牌剧场',login?'Card Login':'Card Deck')} <span>${login?'Card Login':'Card Deck'}</span></h1></div>
      <a class="tc-back" href="cellmotion-components.html">${t('动效库','Effects')}</a>
      <button id="themeButton" type="button"></button><button id="languageButton" type="button">EN</button>
      <div class="cm-ai"><button id="aiButton" type="button" aria-haspopup="menu" aria-expanded="false">${t('用于 AI','For AI')}⌄</button>
        <div id="aiMenu" class="cm-ai-menu" role="menu" hidden>
          <button data-ai="preview" role="menuitem">${t('预览 AI 组件','Preview AI component')}</button>
          <button data-ai="prompt" role="menuitem">${t('复制 AI 提示词','Copy AI prompt')}</button>
          <button data-ai="code" role="menuitem">${t('复制配置代码','Copy configured code')}</button>
          <button data-ai="json" role="menuitem">${t('下载组件 JSON','Download component JSON')}</button>
          <button data-ai="guide" role="menuitem">${t('查看参数说明','Parameter guide')}</button>
        </div></div>
      <button class="tc-export-shortcut" id="exportShortcut">${t('导出作品','Export')}</button>
    </header>
    <aside class="tc-content" aria-label="Content & scheme">
      <div class="tc-panel-heading"><div><small>CONTENT</small><h2>${t(login?'登录转场':'卡牌素材',login?'Login transition':'Card collection')}</h2></div><span id="cardCount"></span></div>
      <p class="tc-hint">${login?t('尺寸不跳变，在翻面中变白。','Match the card. Turn white while flipping.'):t('叠放、分排、交错横移，再收回。','Stack, spread, drift, and gather.')}</p>
      <div class="tc-row-list" id="contentList"></div>
      ${login?'':`<button id="openLibrary">${t('＋ 添加卡牌 / 素材','＋ Add cards / media')}</button>`}
      <section class="gm-card tc-scheme me-scheme-panel"><h2>${t('方案','Scheme')}</h2>
        <div class="me-scheme-actions"><button id="saveScheme">${t('保存方案','Save scheme')}</button><button id="importScheme">${t('导入方案','Import scheme')}</button><button id="restoreScheme">${t('恢复默认','Restore default')}</button><button id="clearScheme">${t('清理重做','Clear / rebuild')}</button></div>
        <input id="schemeFile" type="file" accept="application/json,.json" hidden><p id="schemeStatus" class="gm-status" role="status">${t('自动保存于此浏览器。Ctrl / ⌘ Z 撤销。','Autosaved in this browser. Ctrl / ⌘ Z to undo.')}</p>
      </section>
    </aside>
    <main class="tc-center">
      <section class="tc-canvas-toolbar"><span class="tc-preview-label">${t('画布预览','Canvas preview')}</span>
        <div class="gm-card gm-canvas-card cm-size"><label class="gm-field"><select id="canvasPreset" aria-label="Canvas size">${options([
          ['1920x1080','16:9 · 1920 × 1080','16:9 · 1920 × 1080'],['1080x1080','1:1 · 1080 × 1080','1:1 · 1080 × 1080'],['1080x1350','4:5 · 1080 × 1350','4:5 · 1080 × 1350'],['1080x1440','3:4 · 1080 × 1440','3:4 · 1080 × 1440'],['1080x1620','2:3 · 1080 × 1620','2:3 · 1080 × 1620'],['1080x1920','9:16 · 1080 × 1920','9:16 · 1080 × 1920'],['1440x1080','4:3 · 1440 × 1080','4:3 · 1440 × 1080'],['1620x1080','3:2 · 1620 × 1080','3:2 · 1620 × 1080'],['custom','自定义','Custom']])}</select></label></div>
        <div id="customSize" class="cm-custom" hidden>${input('canvas.width','宽度','Width','number','min="240" max="3840" step="2"')}${input('canvas.height','高度','Height','number','min="240" max="3840" step="2"')}</div>
      </section>
      <section class="gm-stage" id="stage"><div class="gm-composition-frame" id="frame"><canvas id="canvas" aria-label="${title}"></canvas></div>
        <div class="me-stage-controls"><button id="playButton" aria-label="Pause"></button><button id="replayButton">↺ ${t('重播','Replay')}</button></div></section>
      <section class="tc-timeline"><div class="cm-time"><span id="timeReadout"></span><span id="phaseReadout"></span></div>
        <div class="me-choreo-track"><div class="me-choreo-scroll"><div class="me-choreo-bar" id="timeline"></div></div><div class="me-choreo-legend" id="legend"></div></div>
        <input id="seek" type="range" min="0" max="3" step="0.001" value="0" aria-label="Seek animation">
      </section>
    </main>
    <aside class="gm-inspector" id="inspector" aria-label="Properties">
      <nav class="tc-tabs"><button data-panel="content" aria-pressed="true">${t('当前内容','Content')}</button><button data-panel="motion" aria-pressed="false">${t('动效设置','Motion')}</button><button data-panel="export" aria-pressed="false">${t('导出','Export')}</button></nav>
      <section class="tc-properties" data-panel="content" id="contentPanel">
        ${login?`<section class="gm-card"><h2>${t('登录内容','Login content')}</h2>
          ${input('scene.brand','品牌','Brand')}${input('scene.title','标题','Title')}${input('scene.subtitle','说明','Subtitle')}
          <label class="gm-field"><span>${t('字体','Font')}</span><select id="fontFamily" data-path="typography.fontFamily"></select></label>
          <div class="gm-grid-2">${input('scene.account','账号标签','Account label')}${input('scene.password','密码标签','Password label')}</div>
          ${input('scene.button','按钮文字','Button text')}${input('scene.footer','底部文字','Footer')}
          <div class="gm-grid-2">${input('scene.textColor','文字颜色','Text color','color','id="textColor"')}${input('backgroundColor','画面背景','Backdrop','color','id="backgroundColor"')}${input('scene.backColor','卡牌背面','Card back','color')}${input('scene.frontColor','登录正面','Login face','color')}${input('scene.accent','强调色','Accent','color')}</div>
        </section><details><summary>${t('卡片尺寸与位置','Card size & position')}</summary><div>
          ${range(['scene.width','登录卡宽度','Login card width',280,700,2,'px'])}${range(['scene.height','登录卡高度','Login card height',460,850,2,'px'])}
          ${range(['scene.radius','圆角','Corner radius',0,60,1,'px'])}${range(['scene.x','水平位置','Horizontal position',-400,400,1,'px'])}${range(['scene.y','垂直位置','Vertical position',-200,200,1,'px'])}
        </div></details>`:`<section class="gm-card"><h2>${t('卡牌与画面','Cards & canvas')}</h2>${input('backgroundColor','画面背景','Background','color','id="backgroundColor"')}
          <p class="gm-help">${t('首张为收拢后的主卡。卡牌独立保存大小、颜色与顺序。','The first card is the stack cover. Each card keeps its size, color, and order.')}</p>
          <button id="editSelected">${t('单独编辑当前卡牌','Edit selected card')}</button>
        </section><section class="gm-card me-layer-panel" id="assetManager"><button class="me-layer-toggle" id="assetToggle" aria-expanded="false">${t('展开已选','Show selected')}</button><div class="me-layer-items" id="selectedAssets" hidden></div></section>`}
      </section>
      <section class="tc-properties" data-panel="motion" hidden><section class="gm-card"><h2>${t('动作节奏','Motion rhythm')}</h2>
        ${range(['motion.speed','整体速度','Overall speed',.25,3,.05,'×'])}
        ${login?select('motion.direction','翻转方向','Flip direction',[[1,'向右','Right'],[-1,'向左','Left']]):select('motion.mode','展开方式','Spread style',[['dos','背后向上','Lift from behind'],['eventail','横向分排','Horizontal fan']])+select('motion.modeRepli','收拢方式','Gather style',[['synchrone','同步收拢','Together'],['rangees','逐排收回','Row by row']])+select('motion.rythme','快慢节奏','Easing',[['fluide','丝滑','Smooth'],['regulier','匀速','Linear'],['vif','利落','Snappy']])}
        ${fields.slice(0,login?5:8).map(range).join('')}${check('motion.loop','循环播放','Loop playback')}
      </section><details><summary>${t('精细调整','Fine adjustments')}</summary><div>${fields.slice(login?5:8).map(range).join('')}</div></details></section>
      <section class="tc-properties" data-panel="export" hidden><section class="gm-card"><h2>${t('导出作品','Export artwork')}</h2>
        <p class="gm-help">${t('使用上方画布尺寸。PNG 保存当前帧，GIF / MP4 从第一帧开始。','Uses the canvas size above. PNG saves this frame; GIF / MP4 starts at frame zero.')}</p>
        <label class="gm-field"><span>${t('时长','Duration')}</span><select id="exportDuration">${options([['cycle','完整一轮','Full cycle'],['3','3 秒','3 seconds'],['5','5 秒','5 seconds'],['10','10 秒','10 seconds'],['custom','自定义','Custom']])}</select></label>
        <label class="gm-field" id="durationLabel" hidden><span>${t('自定义秒数','Custom seconds')}</span><input id="customDuration" type="number" min=".5" max="30" step=".1" value="3"></label>
        <label class="gm-field"><span>${t('帧率','Frame rate')}</span><select id="exportFps"><option>15</option><option>24</option><option selected>30</option><option>60</option></select></label>
        <div class="cm-export-actions"><button id="exportPng">PNG</button><button id="exportGif">GIF</button><button id="exportMp4" class="cm-primary">MP4</button></div>
        <progress id="exportProgress" value="0" max="1"></progress><p id="exportStatus" class="gm-status" role="status">${t('预览与导出共用同一条时间轴。','Preview and export share one timeline.')}</p>
      </section>${login?`<section class="gm-card"><h2>${t('接入真实登录表单','Use a real login form')}</h2><p class="gm-help">${t('播放器呈现视觉动效；可输入的表单请用原始 HTML / CSS 源码包接入。','The player renders the visual motion. Use the original HTML / CSS kit for interactive form fields.')}</p><a class="cm-upload" href="assets/cardbot-login-handoff.zip" download>${t('下载转场源码','Download source kit')}</a><a class="cm-upload" href="card-login-source/" target="_blank" rel="noopener">${t('打开表单转场示例','Open the form example')}</a></section>`:''}</section>
    </aside>
    <aside class="me-asset-drawer" id="libraryDrawer" aria-label="Asset library" hidden>
      <header><h2 id="drawerTitle">${t('卡牌与共享图库','Cards & shared library')}</h2><button id="closeLibrary" aria-label="Close">×</button></header>
      <div class="me-asset-library" id="libraryBrowse"><label class="cm-upload">${t('上传 SVG / 图片 / GIF','Upload SVG / image / GIF')}<input id="uploadAssets" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif" multiple hidden></label>
        <p class="gm-help">${t('先选择，再点插入。上传不会自动加入画面。','Select, then insert. Uploading alone does not change the canvas.')}</p><div id="libraryGroups"></div></div>
      <section class="me-asset-editor" id="singleAssetEditor" hidden></section>
      <button class="me-asset-commit cm-primary" id="insertCandidate" disabled>${t('插入选中素材','Insert selected asset')}</button>
    </aside>
    <dialog class="cm-dialog" id="parameterGuide"><header><h2>${t('AI 组件 · 参数说明','AI component · Parameters')}</h2><button id="closeGuide" aria-label="Close">×</button></header><div id="guideBody"></div></dialog>
    <div class="cm-toast" id="toast" role="status" hidden></div>`);

  function notify(zh, en = zh) { $('toast').textContent = tr(zh,en); $('toast').hidden = false; clearTimeout(notify.timer); notify.timer = setTimeout(() => $('toast').hidden = true, 2600); }
  function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
  function historyPush() { if (busy) return; history.push(clone(state)); if (history.length > 30) history.shift(); future = []; }
  function saveLocal() { clearTimeout(autosave); autosave = setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { notify('本地存储已满，请点击保存下载方案。','Storage is full. Download your scheme with Save.'); } }, 300); }
  function theme(dark) {
    document.body.dataset.editorTheme = dark ? 'dark' : 'light';
    $('themeButton').textContent = dark ? tr('☀ 浅色','☀ Light') : tr('◐ 深色','◐ Dark');
    $('themeButton').setAttribute('aria-label', tr('切换明暗主题','Switch theme'));
    document.body.style.transition = 'background-color 240ms,color 240ms';
    document.querySelector('.tc-brand img').src = dark ? 'assets/cellmotion/logo-dark-original.png' : 'assets/cellmotion/logo-original-transparent.png?v=20260926-3';
  }
  function translate() {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.querySelectorAll('[data-zh][data-en]').forEach(n => n.textContent = n.dataset[language]);
    $('languageButton').textContent = language === 'en' ? '中文' : 'EN';
    theme(document.body.dataset.editorTheme !== 'light');
    document.dispatchEvent(new CustomEvent('tc-languagechange', { detail: { language } }));
    if (ready) { renderAssets(); timeline(); playbackUI(); }
  }
  function setPanel(name) {
    document.querySelectorAll('.tc-properties').forEach(n => n.hidden = n.dataset.panel !== name);
    document.querySelectorAll('.tc-tabs button').forEach(n => n.setAttribute('aria-pressed', String(n.dataset.panel === name)));
    closeDrawer();
  }
  $('contentPanel').insertAdjacentHTML('beforeend',`<details><summary class="cm-background-label">${t('背景素材','Background media')}<i id="backgroundSwatch"></i></summary><div>
    <label class="cm-upload">${t('上传图片 / GIF / 视频','Upload image / GIF / video')}<input id="backgroundUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm" hidden></label>
    <p id="backgroundName" class="gm-help"></p><div id="backgroundTrim" hidden><div id="filmstrip" class="cm-filmstrip"></div>
      <label class="gm-field"><span>${t('视频起点','Trim start')}<output id="startReadout"></output></span><input id="videoStart" data-bg-key="videoStart" type="range" min="0" max="10" step=".01"></label>
      <label class="gm-field"><span>${t('视频终点','Trim end')}<output id="endReadout"></output></span><input id="videoEnd" data-bg-key="videoEnd" type="range" min="0" max="10" step=".01"></label></div>
    <button id="removeBackground">${t('移除背景素材','Remove background media')}</button></div></details>`);
  function playbackUI() {
    $('playButton').textContent = playing ? tr('Ⅱ 暂停','Ⅱ Pause') : tr('▶ 播放','▶ Play');
    $('playButton').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
  }
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  function fit() {
    if (!ready) return;
    const box = $('stage').getBoundingClientRect(), style = getComputedStyle($('stage'));
    const aw = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), ah = box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const { width:w, height:h } = state.canvas, factor = Math.max(.001, Math.min(aw / w, ah / h));
    $('frame').style.width = `${w * factor}px`; $('frame').style.height = `${h * factor}px`;
    const pixelScale = Math.min(1.5, (devicePixelRatio || 1) * factor);
    canvas.width = Math.max(1,Math.round(w * pixelScale)); canvas.height = Math.max(1,Math.round(h * pixelScale)); draw();
  }
  function draw() {
    if (!ready) return;
    M.draw(ctx,time,state.canvas.width,state.canvas.height,state,resources);
    const total = M.duration(state), p = total ? time / total : 0;
    $('seek').value = time; $('timeReadout').textContent = `${time.toFixed(2)} / ${total.toFixed(2)} s`;
    $('playhead').style.left = `${Math.min(100,p * 100)}%`;
    const beat = M.phases(state).find(b => time >= b.start && time < b.start + b.duration) || M.phases(state).at(-1);
    $('phaseReadout').textContent = beat ? tr(beat.zh,beat.en) : '';
    document.querySelectorAll('[data-seek]').forEach(b => b.setAttribute('aria-current', String(b.dataset.phase === beat?.id)));
  }
  function seek(seconds) { time = M.clamp(Number(seconds) || 0,0,M.duration(state)); playing = false; playbackUI(); draw();if(state.backgroundMedia)prepareFrame(state,time).then(draw).catch(e=>notify(e.message)); }
  function stable() { return login ? state.motion.duration / state.motion.speed : (state.motion.repos + state.motion.ouvre + Math.min(.1,state.motion.tenue / 2)) / state.motion.speed; }
  function timeline() {
    const phases = M.phases(state), total = M.duration(state);
    $('timeline').innerHTML = phases.map(b => `<button class="me-choreo-block" data-phase="${b.id}" data-seek="${b.start}" style="left:${b.start / total * 100}%;width:calc(${b.duration / total * 100}% - 4px);--phase:${b.color}" title="${esc(tr(b.zh,b.en))} · ${b.start.toFixed(2)}–${(b.start+b.duration).toFixed(2)}s"><strong>${esc(tr(b.zh,b.en))}</strong><small>${b.duration.toFixed(2)}s</small></button>`).join('')+'<i class="me-choreo-playhead" id="playhead"></i>';
    $('legend').innerHTML = phases.map(b => `<span style="--phase:${b.color}">${esc(tr(b.zh,b.en))} · ${b.start.toFixed(2)}–${(b.start+b.duration).toFixed(2)}s</span>`).join('');
    $('seek').max = total; draw();
  }
  function syncControls() {
    document.querySelectorAll('[data-path]').forEach(n => { const value = readPath(state,n.dataset.path); if (n.type === 'checkbox') n.checked = !!value; else n.value = value ?? ''; });
    document.querySelectorAll('output[data-value]').forEach(n => { const value = Number(readPath(state,n.dataset.value)); n.textContent = n.dataset.unit === '%' ? `${Math.round(value * 1000) / 10}%` : `${Number(value.toFixed(3))}${n.dataset.unit}`; });
    const size = `${state.canvas.width}x${state.canvas.height}`;
    $('canvasPreset').value = !customCanvas && [...$('canvasPreset').options].some(o => o.value === size) ? size : 'custom';
    $('customSize').hidden = $('canvasPreset').value !== 'custom';
    $('backgroundSwatch').style.background=state.backgroundColor;
    $('backgroundName').textContent=state.backgroundMedia?lookup(state.backgroundMedia.libraryId)?.name||'':tr('未设置，使用画面背景色。','No media. Using the background color.');
    const video=resources.get(state.backgroundMedia?.libraryId)?.video;
    $('backgroundTrim').hidden=!video;
    if(video){$('videoStart').max=$('videoEnd').max=video.duration;$('videoStart').value=state.backgroundMedia.videoStart;$('videoEnd').value=state.backgroundMedia.videoEnd;$('startReadout').textContent=Number(state.backgroundMedia.videoStart).toFixed(2)+'s';$('endReadout').textContent=Number(state.backgroundMedia.videoEnd).toFixed(2)+'s';}
    document.dispatchEvent(new Event('tc-controls-synced'));
  }
  const sanitized = text => {
    const doc = new DOMParser().parseFromString(text,'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error(tr('SVG 无法解析','Invalid SVG'));
    if (doc.querySelector('script,foreignObject,iframe,animate,animateTransform,animateMotion') || doc.querySelector('style')?.textContent?.includes('@keyframes')) throw new Error(tr('请将自定义动画导出为 GIF；SVG 仅支持静态素材。','Export custom animation as GIF; SVG uploads must be static.'));
    doc.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => { if (/^on/i.test(a.name) || ((a.name.endsWith('href') || a.name === 'src') && !a.value.startsWith('#')) || /url\(\s*["']?(?!#)/i.test(a.value)) el.removeAttribute(a.name); }));
    return new XMLSerializer().serializeToString(doc);
  };
  function cardbotSvg(svg) {
    const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),mask=doc.querySelector('mask'),style=doc.querySelector('style')?.textContent||'';
    if(!mask||!style.includes('@keyframes oeil0')||doc.querySelector('script,foreignObject,iframe'))return null;
    const paths=[...mask.querySelectorAll('path')], duration=Number(style.match(/animation-duration:([\d.]+)s/)?.[1]);
    if(paths.length!==3||!duration)return null;
    const eyes=paths.slice(1).map(p=>{const key=p.getAttribute('class'),track=style.split(`@keyframes ${key}{`)[1]?.split('@keyframes')[0];
      const frames=[...(track||'').matchAll(/([\d.]+)%\{transform:matrix\(([^)]+)\)/g)].map(([,p,m])=>[Number(p)/100,...m.split(',').map(Number)]);
      if(!frames.length||frames.some(f=>f.length!==7||!f.every(Number.isFinite)))throw new Error('Invalid CardBot keyframes');
      p.setAttribute('transform',`matrix(${frames[0].slice(1).join(',')})`);return {path:p.getAttribute('d'),frames};});
    doc.querySelectorAll('style').forEach(n=>n.remove());
    const dataUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized(new XMLSerializer().serializeToString(doc)))}`;
    return {kind:'cardbot',body:paths[0].getAttribute('d'),eyes,duration,color:doc.querySelector('g[mask] rect')?.getAttribute('fill')||'#111111',dataUrl};
  }
  async function prepareAsset(asset) {
    const prior=resources.get(asset.libraryId);
    if (prior && ['dataUrl','src','kind','type','body','color','duration'].every(k=>prior[k]===asset[k]) && JSON.stringify(prior.eyes)===JSON.stringify(asset.eyes)) return;
    const record = { ...asset };
    if (/^video\//.test(asset.type||'')) {
      const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
      await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Cannot read video'));video.src=asset.dataUrl;});record.video=video;
    } else if (asset.kind !== 'vector' && asset.kind !== 'cardbot') {
      const image = new Image(); image.src = asset.dataUrl || asset.src; await image.decode(); record.image = image;
      if (/gif/i.test(asset.type || asset.dataUrl?.slice(0,40) || asset.src)) {
        record.animated = await window.CellMotionAnimatedImage.decode({ url:image.src,type:'image/gif' });
        if (!record.animated && !preview) notify('当前浏览器无法逐帧读取 GIF，建议使用 Chrome。','Use Chrome for frame-accurate GIF playback.');
      }
    }
    if(prior?.animated)window.CellMotionAnimatedImage.dispose(prior.animated);
    prior?.video?.pause();resources.set(asset.libraryId,record);
  }
  async function prepare(s) {
    for (const a of s.customAssets) await prepareAsset(a);
    for (const c of s.cards) {
      const a = window.STGIconLibrary.byId.get(c.libraryId);
      if (a) await prepareAsset(a);
    }
    await document.fonts.load(`500 24px ${window.STGFontLibrary.family(s.typography.fontFamily)}`);
  }
  async function seekVideo(video,seconds){if(Math.abs(video.currentTime-seconds)<.002&&video.readyState>=2)return;await new Promise((resolve,reject)=>{let timer;const done=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);resolve();};video.addEventListener('seeked',done);timer=setTimeout(()=>{video.removeEventListener('seeked',done);reject(new Error('Video seek timed out'));},5000);video.currentTime=seconds;});}
  async function prepareFrame(s,t){const b=s.backgroundMedia,video=resources.get(b?.libraryId)?.video;if(!video)return;const start=Number(b.videoStart)||0,end=Number(b.videoEnd)||video.duration,span=Math.max(.05,end-start);await seekVideo(video,Math.min(video.duration-.001,start+(t*s.motion.speed)%span));}
  async function filmstrip(){const b=state.backgroundMedia,video=resources.get(b?.libraryId)?.video;$('filmstrip').replaceChildren();if(!video)return;
    const prior=video.currentTime,c=document.createElement('canvas');c.width=120;c.height=68;const context=c.getContext('2d');
    for(let i=0;i<6;i++){await seekVideo(video,Math.min(video.duration-.01,video.duration*i/6));context.drawImage(video,0,0,120,68);const image=new Image();image.src=c.toDataURL();$('filmstrip').append(image);}await seekVideo(video,prior);}
  function normalize(raw) {
    if (raw?.schemaVersion) raw = raw.composition;
    if (!raw || raw.effect !== effect || raw.version !== 1) throw new Error(tr('不是此动效的方案','This scheme belongs to another effect'));
    const s = { ...clone(defaultState), ...clone(raw), canvas: { ...defaultState.canvas, ...raw.canvas }, motion: { ...defaultState.motion, ...raw.motion }, typography: { ...defaultState.typography, ...raw.typography } };
    s.typography.fontFamily='stg:'+(window.STGFontLibrary.idFor(s.typography.fontFamily)||'inter');s.motion.loop=!!s.motion.loop;
    if (login) s.scene = { ...defaultState.scene, ...raw.scene };
    s.canvas.width = Math.round(M.clamp(Number(s.canvas.width) || 1920,240,3840) / 2) * 2;
    s.canvas.height = Math.round(M.clamp(Number(s.canvas.height) || 1080,240,3840) / 2) * 2;
    for (const [path,,,lo,hi] of [...fields,['motion.speed','','',.25,3],...(login?[['scene.width','','',280,700],['scene.height','','',460,850],['scene.radius','','',0,60],['scene.x','','',-400,400],['scene.y','','',-200,200]]:[])]) {
      const value = Number(readPath(s,path)); putPath(s,path,Number.isFinite(value) ? M.clamp(value,lo,hi) : readPath(defaultState,path));
    }
    if (!login) { s.motion.rows = Math.round(s.motion.rows); if (!['dos','eventail'].includes(s.motion.mode)) s.motion.mode = 'dos'; if (!['synchrone','rangees'].includes(s.motion.modeRepli)) s.motion.modeRepli = 'synchrone'; if (!['fluide','regulier','vif'].includes(s.motion.rythme)) s.motion.rythme = 'fluide'; }
    else { s.motion.direction = Number(s.motion.direction) === -1 ? -1 : 1; for (const k of ['brand','title','subtitle','account','password','button','footer']) s.scene[k] = String(s.scene[k] ?? '').slice(0,300); }
    s.customAssets = Array.isArray(s.customAssets) ? s.customAssets.slice(0,100).filter(a => a.libraryId?.startsWith('custom:') && /^data:(image\/(png|jpeg|gif|webp|svg\+xml)|video\/(mp4|webm));/i.test(a.dataUrl || '')) : [];
    for (const a of s.customAssets) if (/^data:image\/svg\+xml/i.test(a.dataUrl)) {
      // Revalidate imported SVGs rather than trusting a JSON file.
      const encoded = a.dataUrl.split(',')[1], svg = a.dataUrl.includes(';base64,') ? atob(encoded) : decodeURIComponent(encoded);
      a.dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized(svg))}`;
    }
    for(const a of s.customAssets)if(a.kind==='cardbot'){
      if(typeof a.body!=='string'||!Array.isArray(a.eyes)||a.eyes.length!==2||!(a.duration>0)||a.eyes.some(e=>typeof e.path!=='string'||!Array.isArray(e.frames)||!e.frames.length||e.frames.length>10000||e.frames.some(f=>f.length!==7||!f.every(Number.isFinite))))throw new Error('Invalid CardBot asset data');
      new Path2D(a.body);a.eyes.forEach(e=>new Path2D(e.path));
    }
    const seen = new Set();
    s.cards = (Array.isArray(s.cards) ? s.cards : []).slice(0,200).filter(c => c && typeof c.libraryId === 'string').map((c,i) => {
      let id = String(c.id || `card-${i}`); if (seen.has(id)) id = `card-${i}-${crypto.randomUUID()}`; seen.add(id);
      return { ...c,id,scale:M.clamp(Number(c.scale)||1,.2,2),opacity:M.clamp(Number(c.opacity) || 0,0,1),x:M.clamp(Number(c.x)||0,-800,800),y:M.clamp(Number(c.y)||0,-500,500),rotation:M.clamp(Number(c.rotation)||0,-180,180) };
    });
    if(s.backgroundMedia&&!s.customAssets.some(a=>a.libraryId===s.backgroundMedia.libraryId))s.backgroundMedia=null;
    return s;
  }
  async function apply(raw, remember = true) {
    const next = normalize(raw); await prepare(next); if (remember) historyPush(); state = next; time = 0;
    selected = login ? 'scene' : state.cards[0]?.id;customCanvas=false;syncControls(); renderAssets(); timeline(); fit(); saveLocal();
    if(state.backgroundMedia){await filmstrip();await prepareFrame(state,time);draw();}
  }
  function assetName(c) { return resources.get(c.libraryId)?.name || c.libraryId; }
  function renderAssets() {
    $('cardCount').textContent = login ? '01' : String(state.cards.length);
    if (login) { $('contentList').innerHTML = `<button class="tc-row-select" aria-pressed="true"><span>01</span><strong>${esc(state.scene.title || tr('登录界面','Login face'))}</strong><small>${tr('文字 · 色彩 · 尺寸','Text · colors · dimensions')}</small></button>`; return; }
    $('contentList').innerHTML = state.cards.map((c,i) => { const a = resources.get(c.libraryId); return `<button class="tc-row-select" data-card="${esc(c.id)}" draggable="true" aria-pressed="${c.id===selected}">${a?.src||a?.dataUrl?`<img src="${esc(a.src||a.dataUrl)}" alt="">`:`<span>${String(i+1).padStart(2,'0')}</span>`}<strong>${esc(assetName(c))}</strong><small>${i===0?tr('主卡 · 收拢封面','Cover · stack face'):tr('卡牌','Card')+' '+String(i+1).padStart(2,'0')}</small></button>`; }).join('');
    $('selectedAssets').innerHTML = state.cards.map(c => `<div class="cm-asset-row"><span>${esc(assetName(c))}</span><button data-edit="${esc(c.id)}">${tr('编辑','Edit')}</button><button data-remove="${esc(c.id)}" aria-label="${tr('移除','Remove')}">×</button></div>`).join('');
    $('editSelected').disabled = !state.cards.length;
  }
  function setAssetManager(open) { $('assetManager').classList.toggle('is-list-expanded',open); $('selectedAssets').hidden = !open; $('assetToggle').setAttribute('aria-expanded',String(open)); }
  function closeDrawer() { $('libraryDrawer').hidden = true; $('inspector').hidden = false; }
  function libraryView() {
    $('libraryDrawer').hidden = false; $('inspector').hidden = true; $('libraryBrowse').hidden = false; $('singleAssetEditor').hidden = true; $('insertCandidate').hidden = false;
    $('drawerTitle').textContent = tr('卡牌与共享图库','Cards & shared library'); renderLibrary();
  }
  function renderLibrary() {
    const groups = [['CardBot',builtins],['Flow',window.STGIconLibrary.groups.flow],['GIF 动图',window.STGIconLibrary.groups.gifMotion],['Animals',window.STGIconLibrary.groups.animals],['Bots',window.STGIconLibrary.groups.bots], [tr('我的素材','My uploads'),state.customAssets.filter(a=>!/^video\//.test(a.type||''))]];
    $('libraryGroups').innerHTML = groups.map(([name,items],i) => `<details ${i===0?'open':''}><summary>${esc(name)} · ${items.length}</summary><div class="cm-library-grid">${items.map(a => `<div class="cm-library-item"><button class="me-asset-choice" data-candidate="${esc(a.libraryId)}" aria-pressed="${candidate===a.libraryId}"><img src="${esc(a.dataUrl||a.src)}" loading="lazy" alt=""><span>${esc(a.name)}</span></button><button class="me-asset-commit" data-insert="${esc(a.libraryId)}">${tr('插入','Insert')}</button></div>`).join('')}</div></details>`).join('');
  }
  function lookup(id) { return resources.get(id) || state.customAssets.find(a => a.libraryId===id) || window.STGIconLibrary.byId.get(id); }
  async function insert(id) {
    if (busy) return;
    if (state.cards.some(c=>c.libraryId===id)) { notify('此素材已在画面中。','This asset is already selected.'); return; }
    const a = lookup(id); if (!a) return; await prepareAsset(a); historyPush();
    const c = {id:crypto.randomUUID(),libraryId:id,scale:1,opacity:1,x:0,y:0,rotation:0}; state.cards.push(c); selected = c.id;
    renderAssets(); saveLocal(); seek(stable()); notify('已插入，素材管理保持折叠状态。','Inserted. The selected manager stays as it was.');
  }
  function editCard(id) {
    selected = id; const card = state.cards.find(c=>c.id===id); if (!card) return;
    renderAssets(); seek(stable()); $('libraryDrawer').hidden = false; $('inspector').hidden = true; $('libraryBrowse').hidden = true;
    $('singleAssetEditor').hidden = false; $('insertCandidate').hidden = true; $('drawerTitle').textContent = tr('单独编辑','Edit one card');
    const a = lookup(card.libraryId);
    $('singleAssetEditor').innerHTML = `${a?.src||a?.dataUrl?`<img id="assetThumb" src="${esc(a.dataUrl||a.src)}" alt="">`:''}<h3>${esc(assetName(card))}</h3><p class="gm-help">${tr('已定位到卡牌展开后的完整画面。','Paused at the fully spread frame.')}</p>${[
      ['scale','卡牌大小','Card size',.2,2,.01,'%'],['opacity','不透明度','Opacity',0,1,.01,'%'],['rotation','旋转角度','Rotation',-180,180,1,'°'],['x','水平偏移','Horizontal offset',-800,800,1,'px'],['y','垂直偏移','Vertical offset',-500,500,1,'px']
    ].map(([key,zh,en,lo,hi,step,unit])=>`<label class="gm-field"><span>${t(zh,en)}<output data-card-value="${key}">${card[key]}${unit}</output></span><input data-card-key="${key}" type="range" min="${lo}" max="${hi}" step="${step}" value="${card[key]}"></label>`).join('')}
      ${a?.kind==='cardbot'?`<label class="gm-field"><span>${t('卡牌颜色','Card color')}</span><input data-card-key="color" type="color" value="${esc(card.color||a.color)}"></label>`:''}
      <div class="gm-grid-2"><button data-move="-1">${t('向前','Move earlier')}</button><button data-move="1">${t('向后','Move later')}</button></div><button id="backToLibrary">${t('返回图库','Back to library')}</button>`;
    $('backToLibrary').onclick = libraryView;
  }
  function reorder(id,index) { if (busy) return; const from = state.cards.findIndex(c=>c.id===id); if (from<0) return; historyPush(); const [c]=state.cards.splice(from,1); state.cards.splice(M.clamp(index,0,state.cards.length),0,c); renderAssets(); saveLocal(); seek(stable()); }
  function remove(id) { if (busy) return; historyPush(); state.cards = state.cards.filter(c=>c.id!==id); selected=state.cards[0]?.id; renderAssets(); saveLocal(); draw(); }
  async function upload(files) {
    for (const f of files) try {
      if (f.size > 12*1024*1024) throw new Error(tr('单个文件不能超过 12 MB','Maximum file size is 12 MB'));
      let dataUrl;
      let nativeCard=null;
      if (/svg/i.test(f.type)) {const svg=await f.text();nativeCard=cardbotSvg(svg);dataUrl=nativeCard?.dataUrl||`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized(svg))}`;}
      else dataUrl = await new Promise((resolve,reject)=>{ const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f); });
      const a = {libraryId:`custom:${crypto.randomUUID()}`,name:f.name,type:f.type,dataUrl,kind:'image',...nativeCard}; await prepareAsset(a); historyPush();state.customAssets.push(a);
      candidate=a.libraryId; $('insertCandidate').disabled=false;
    } catch (e) { notify(e.message); }
    renderLibrary();saveLocal();notify('素材已入库，点击插入才会加入画面。','Uploaded to library. Click Insert to add to the canvas.');
  }
  async function manifest() {
    definition ||= await fetch(`effects/${effect}.component.json`).then(r=>{if(!r.ok)throw new Error('Component definition unavailable');return r.json();});
    return window.CellMotionAI.createManifest({definition,scheme:clone(state),baseUrl:document.baseURI});
  }
  function closeAI() { $('aiMenu').hidden=true; $('aiButton').setAttribute('aria-expanded','false'); }
  async function aiAction(action) {
    closeAI(); const popup = action==='preview'?window.open('about:blank','_blank'):null;
    try { const current=await manifest();
      if(action==='preview') {
        if(!popup) throw new Error(tr('请允许弹出预览窗口','Allow the preview pop-up'));
        const receive = e=>{ if(e.source!==popup||e.data?.type!=='cellmotion:demo-ready')return;popup.postMessage({type:'cellmotion:demo-manifest',manifest:current},location.origin);window.removeEventListener('message',receive); };
        window.addEventListener('message',receive); popup.location.href=`cardmotion-component-demo.html?effect=${effect}&live=1`;
        setTimeout(()=>window.removeEventListener('message',receive),30000);
      } else if(action==='json') window.CellMotionAI.downloadJson(current,`${effect}-component.json`);
      else if(action==='guide') {
        $('guideBody').innerHTML=`<p>${esc(current.behavior.summary[language])}</p><p>${t('组件是视觉动效，不包含账号认证。生产接入须限制消息来源域名。','This is a visual component, not authentication. Restrict message origins in production.')}</p>`+current.parameterDefinitions.map(p=>`<section><strong>${esc(p.name?.[language]||p.path)}</strong><br><code>${esc(p.path)}</code><p>${esc(p.description?.[language]||p.type)}${p.unit?' · '+esc(p.unit):''}</p></section>`).join(''); $('parameterGuide').showModal();
      } else { await window.CellMotionAI.copyText(action==='code'?window.CellMotionAI.configuredCode(current):window.CellMotionAI.aiPrompt(current,language)); notify('已复制当前配置，可直接交给 AI。','Copied the current configuration for AI.'); }
    } catch(e) { popup?.close();notify(e.message); }
  }
  async function exportFile(format) {
    if(busy)return;
    const snapshot=clone(state), w=state.canvas.width,h=state.canvas.height,fps=Number($('exportFps').value);
    const chosen=$('exportDuration').value, duration=chosen==='cycle'?M.duration(snapshot):chosen==='custom'?M.clamp(Number($('customDuration').value)||3,.5,30):Number(chosen);
    if(format==='gif'&&w*h*Math.ceil(duration*fps)>240000000) { notify('GIF 画面较大，请降低画布尺寸或帧率，或改用 MP4。','Large GIF: reduce canvas size / FPS, or use MP4.');return; }
    busy=true; const wasPlaying=playing;playing=false;playbackUI();
    const controls=[...document.querySelectorAll('button,input,select')].map(n=>[n,n.disabled]); controls.forEach(([n])=>n.disabled=true);
    const out=document.createElement('canvas');out.width=w;out.height=h;const c=out.getContext('2d',{willReadFrequently:true});
    const render=t=>M.draw(c,t,w,h,snapshot,resources);let encoder;
    const report=p=>{$('exportProgress').value=p;$('exportStatus').textContent=tr('正在导出','Exporting')+` ${format.toUpperCase()} · ${w} × ${h} · ${Math.round(p*100)}%`;};
    try {
      await prepare(snapshot);let blob;
      if(format==='png') {await prepareFrame(snapshot,time);render(time);blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));}
      else if(format==='gif') {
        encoder=new GIF({workers:2,quality:10,width:w,height:h,workerScript:'js/continuation-gif.worker.js'});
        const frames=Math.max(1,Math.ceil(duration*fps));
        for(let i=0;i<frames;i++) {const t=(i/fps)%M.duration(snapshot);await prepareFrame(snapshot,t);render(t);encoder.addFrame(c,{copy:true,delay:1000/fps});report((i+1)/frames*.65);if(i%4===0)await new Promise(r=>setTimeout(r,0));}
        blob=await new Promise((resolve,reject)=>{encoder.on('finished',resolve);encoder.on('progress',p=>report(.65+.35*p));encoder.on('abort',()=>reject(new Error('GIF encoding aborted')));encoder.render();});
      } else {
        encoder=await window.HME.createH264MP4Encoder();encoder.width=w;encoder.height=h;encoder.frameRate=fps;encoder.speed=10;encoder.kbps=8000;encoder.groupOfPictures=fps*2;encoder.initialize();
        const count=Math.max(1,Math.ceil(duration*fps));
        for(let i=0;i<count;i++) {const t=(i/fps)%M.duration(snapshot);await prepareFrame(snapshot,t);render(t);encoder.addFrameRgba(c.getImageData(0,0,w,h).data);report((i+1)/count);if(i%4===0)await new Promise(r=>setTimeout(r,0));}
        encoder.finalize();blob=new Blob([encoder.FS.readFile(encoder.outputFilename)],{type:'video/mp4'});
      }
      if(!blob?.size)throw new Error('Empty output');download(blob,`${effect}-${w}x${h}.${format}`);report(1);
      $('exportStatus').textContent=tr('已下载','Downloaded')+` ${format.toUpperCase()} · ${w} × ${h}`;
    } catch(e) {$('exportStatus').textContent=tr('导出失败：','Export failed: ')+e.message;}
    finally {if(format==='mp4')encoder?.delete();busy=false;controls.forEach(([n,disabled])=>n.disabled=disabled);playing=wasPlaying;last=performance.now();playbackUI();draw();}
  }
  // Load only the packaged originals. No runtime dependency on the bot repository.
  let builtins, defaultState;
  try {
    const response=await fetch('assets/cardbot/library.json');if(!response.ok)throw new Error('CardBot assets unavailable');builtins=(await response.json()).cards;
    builtins.forEach(a=>resources.set(a.libraryId,a));defaultState=M.defaults(effect,builtins);state=clone(defaultState);
    // Gallery always opens the immutable default; a normal refresh resumes this browser's work.
    if(!preview&&!params.has('from')) {const saved=localStorage.getItem(storageKey);if(saved)try{state=normalize(JSON.parse(saved));}catch{notify('已使用默认方案，旧方案未被覆盖。','Using the default; incompatible saved data was not applied.');}}
    await prepare(state);if(state.backgroundMedia){await filmstrip();await prepareFrame(state,0);}ready=true;$('editorLoading').remove();if(preview)document.body.classList.add('is-preview');
    window.STGFontLibrary.enhanceSelect($('fontFamily')||document.createElement('select'));
    theme(localStorage.getItem('cellmotion-editor-theme')!=='light');syncControls();renderAssets();timeline();fit();translate();
  }catch(e){$('editorLoading').textContent=tr('加载失败，请刷新：','Loading failed. Refresh: ')+e.message;return;}
  document.addEventListener('input',async e=>{
    const n=e.target;if(busy||!n.dataset.path)return;const path=n.dataset.path;historyPush();
    const value=n.type==='checkbox'?n.checked:n.type==='range'||n.type==='number'?Number(n.value):path==='motion.direction'?Number(n.value):n.value;
    if(typeof value==='number'&&!Number.isFinite(value))return;
    putPath(state,path,value);
    if(path.startsWith('canvas.'))state.canvas[path.split('.')[1]]=Math.round(M.clamp(value||240,240,3840)/2)*2;
    if(path==='motion.rows')state.motion.rows=Math.round(value);
    if(path==='typography.fontFamily')await prepare(state);
    if(path.startsWith('motion.')) {timeline();const key=path.split('.')[1];
      if(login)seek(['hold','contentDelay','contentDuration'].includes(key)?stable():state.motion.duration*.45/state.motion.speed);
      else seek(['repos','ouvre','mode','stagger','inclinaison'].includes(key)?(state.motion.repos+state.motion.ouvre*.55)/state.motion.speed:['repli','modeRepli'].includes(key)?(state.motion.repos+state.motion.ouvre+state.motion.tenue+state.motion.repli*.5)/state.motion.speed:stable());
    } else seek(stable());
    syncControls();saveLocal();renderAssets();fit();
  });
  $('canvasPreset').onchange=()=>{if(busy)return;historyPush();customCanvas=$('canvasPreset').value==='custom';$('customSize').hidden=!customCanvas;if(!customCanvas){const[w,h]=$('canvasPreset').value.split('x').map(Number);state.canvas={width:w,height:h};}syncControls();fit();saveLocal();};
  document.querySelector('.tc-tabs').onclick=e=>{if(e.target.closest('[data-panel]'))setPanel(e.target.closest('[data-panel]').dataset.panel);};
  $('exportShortcut').onclick=()=>setPanel('export');$('playButton').onclick=()=>{playing=!playing;if(playing&&time>=M.duration(state))time=0;last=performance.now();playbackUI();};
  $('replayButton').onclick=()=>{time=0;playing=true;last=performance.now();playbackUI();draw();};$('seek').oninput=()=>seek($('seek').value);
  $('timeline').onclick=e=>{const n=e.target.closest('[data-seek]');if(n)seek(Number(n.dataset.seek)+.001);};
  $('themeButton').onclick=()=>{const dark=document.body.dataset.editorTheme==='light';theme(dark);localStorage.setItem('cellmotion-editor-theme',dark?'dark':'light');};
  $('languageButton').onclick=()=>{language=language==='en'?'zh':'en';localStorage.setItem('cellmotion-language',language);translate();};
  $('saveScheme').onclick=()=>{let cached=true;try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{cached=false;}window.CellMotionAI.downloadJson(state,`${effect}-scheme.json`);if(cached)notify('方案已保存并下载。','Scheme saved and downloaded.');else notify('浏览器存储已满；方案已下载，请妥善保存。','Browser storage is full. Your scheme was downloaded; keep the file safe.');};
  $('importScheme').onclick=()=>$('schemeFile').click();$('schemeFile').onchange=async e=>{try{if(e.target.files[0])await apply(JSON.parse(await e.target.files[0].text()));notify('方案已导入。','Scheme imported.');}catch(err){notify(err.message);}e.target.value='';};
  $('restoreScheme').onclick=()=>apply(defaultState);$('clearScheme').onclick=()=>{const s=clone(defaultState);if(login)for(const key of ['brand','title','subtitle','account','password','button','footer'])s.scene[key]='';else s.cards=[];s.customAssets=[];apply(s);};
  $('aiButton').onclick=()=>{const open=$('aiMenu').hidden;$('aiMenu').hidden=!open;$('aiButton').setAttribute('aria-expanded',String(open));};
  $('aiMenu').onclick=e=>{const n=e.target.closest('[data-ai]');if(n)aiAction(n.dataset.ai);};
  document.addEventListener('click',e=>{if(!e.target.closest('.cm-ai'))closeAI();});$('closeGuide').onclick=()=>$('parameterGuide').close();
  $('parameterGuide').onclick=e=>{if(e.target===$('parameterGuide'))$('parameterGuide').close();};
  $('exportDuration').onchange=()=>$('durationLabel').hidden=$('exportDuration').value!=='custom';
  $('exportPng').onclick=()=>exportFile('png');$('exportGif').onclick=()=>exportFile('gif');$('exportMp4').onclick=()=>exportFile('mp4');
  $('closeLibrary').onclick=closeDrawer;
  $('backgroundUpload').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
    if(file.size>12*1024*1024)throw new Error(tr('背景文件不能超过 12 MB。','Maximum background size is 12 MB.'));
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
    const asset={libraryId:`custom:${crypto.randomUUID()}`,name:file.name,type:file.type,dataUrl,kind:'image'};
    if(/svg/i.test(file.type))asset.dataUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized(await file.text()))}`;
    await prepareAsset(asset);historyPush();state.customAssets.push(asset);const video=resources.get(asset.libraryId)?.video;
    state.backgroundMedia={libraryId:asset.libraryId,videoStart:0,videoEnd:video?.duration||0};playing=false;playbackUI();syncControls();await filmstrip();await prepareFrame(state,time);draw();saveLocal();
  }catch(err){notify(err.message);}e.target.value='';};
  document.querySelectorAll('[data-bg-key]').forEach(n=>n.oninput=async()=>{if(!state.backgroundMedia||busy)return;historyPush();const b=state.backgroundMedia,v=resources.get(b.libraryId).video;
    if(n.id==='videoStart')b.videoStart=M.clamp(Number(n.value),0,b.videoEnd-.05);else b.videoEnd=M.clamp(Number(n.value),b.videoStart+.05,v.duration);
    playing=false;playbackUI();syncControls();await prepareFrame(state,time);draw();saveLocal();});
  $('removeBackground').onclick=()=>{historyPush();state.backgroundMedia=null;syncControls();draw();saveLocal();};
  if(!login){
    $('openLibrary').onclick=libraryView;$('assetToggle').onclick=()=>setAssetManager($('selectedAssets').hidden);
    $('editSelected').onclick=()=>editCard(selected);$('contentList').onclick=e=>{const n=e.target.closest('[data-card]');if(n){selected=n.dataset.card;renderAssets();setPanel('content');seek(stable());}};
    $('selectedAssets').onclick=e=>{const n=e.target.closest('[data-edit],[data-remove]');if(n?.dataset.edit)editCard(n.dataset.edit);else if(n)remove(n.dataset.remove);};
    $('libraryGroups').onclick=async e=>{const n=e.target.closest('[data-candidate],[data-insert]');if(n?.dataset.candidate){candidate=n.dataset.candidate;$('insertCandidate').disabled=false;document.querySelectorAll('[data-candidate]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.candidate===candidate)));}else if(n?.dataset.insert)await insert(n.dataset.insert);};
    $('insertCandidate').onclick=()=>insert(candidate);$('uploadAssets').onchange=e=>{upload([...e.target.files]);e.target.value='';};
    $('singleAssetEditor').oninput=e=>{const n=e.target;if(!n.dataset.cardKey||busy)return;const card=state.cards.find(c=>c.id===selected);if(!card)return;historyPush();card[n.dataset.cardKey]=n.type==='color'?n.value:Number(n.value);const o=$('singleAssetEditor').querySelector(`[data-card-value="${n.dataset.cardKey}"]`);if(o)o.textContent=n.value;saveLocal();draw();};
    $('singleAssetEditor').addEventListener('click',e=>{const n=e.target.closest('[data-move]');if(n)reorder(selected,state.cards.findIndex(c=>c.id===selected)+Number(n.dataset.move));});
    let dragged;
    $('contentList').ondragstart=e=>{dragged=e.target.closest('[data-card]')?.dataset.card;};$('contentList').ondragover=e=>e.preventDefault();$('contentList').ondrop=e=>{e.preventDefault();const id=e.target.closest('[data-card]')?.dataset.card;if(dragged&&id)reorder(dragged,state.cards.findIndex(c=>c.id===id));};
    $('contentList').onkeydown=e=>{if(e.altKey&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const id=e.target.closest('[data-card]')?.dataset.card;if(id)reorder(id,state.cards.findIndex(c=>c.id===id)+(e.key==='ArrowUp'?-1:1));}};
  }
  document.addEventListener('keydown',async e=>{
    if(e.key==='Escape'){closeAI();if(!$('singleAssetEditor').hidden)libraryView();else closeDrawer();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')&&!busy){e.preventDefault();const from=e.shiftKey?future:history,to=e.shiftKey?history:future;if(from.length){to.push(clone(state));await apply(from.pop(),false);}}
    if(e.code==='Space'&&!e.target.matches('input,textarea,button,select')){e.preventDefault();$('playButton').click();}
  });
  new ResizeObserver(fit).observe($('stage'));
  async function tick(now){const delta=Math.min(.1,(now-last)/1000);last=now;if(playing&&!busy&&!document.hidden){time+=delta;const total=M.duration(state);if(time>=total){if(state.motion.loop)time%=total;else{time=total;playing=false;playbackUI();}}try{await prepareFrame(state,time);}catch{playing=false;playbackUI();}draw();}requestAnimationFrame(tick);}
  requestAnimationFrame(tick);
  window.CardMotionEditor={getScheme:()=>clone(state),apply,manifest,seek,replay:()=>$('replayButton').click(),draw:(target,t,w,h)=>M.draw(target,t,w,h,state,resources),resources,exportFile};
  // Shared queue preserves configure → pause/seek order even with asynchronous media loading.
  if(preview)window.CellMotionBridge.register({effectId:effect,getScheme:()=>clone(state),durationMs:()=>M.duration(state)*1000,
    applyScheme:async(raw,presentation={})=>{playing=false;await apply(raw,false);playing=presentation.autoplay!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches;last=performance.now();playbackUI();},
    play:()=>{playing=true;last=performance.now();playbackUI();},pause:()=>{playing=false;playbackUI();},
    restart:()=>{time=0;playing=true;last=performance.now();playbackUI();draw();},seek});
})();
