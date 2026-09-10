/* Generic CellMotion three-column shell for me-motion-editor and Icon Burst pages. */
(() => {
  if (new URLSearchParams(location.search).has("preview")) return;
  if (document.body.classList.contains("tc-workspace")) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const make = (tag, className, html = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };

  const body = document.body;
  const iconBurst = Boolean($(".ib-app"));
  const panel = iconBurst ? $(".ib-editor") : $(".control-panel, .impact-panel, .sequence-panel");
  const stage = iconBurst ? $("#ibStage") : $("main");
  if (!panel || !stage) return;

  body.classList.add("tc-workspace");
  if (!iconBurst) body.classList.add("me-motion-editor");
  if (panel instanceof HTMLDetailsElement) panel.open = true;

  const titleSource = $("h1", panel) || $("summary b", panel) || $("b", panel);
  const enSource = $("h1 span", panel) || $("summary small", panel);
  const zhName = ((titleSource?.childNodes[0]?.textContent || titleSource?.textContent || document.title.split("|")[0] || "CellMotion").replace(/\s*[·•].*$/, "").trim());
  const enName = (enSource?.textContent || "").replace(/\/.*/, "").replace("·", " ").trim() || "";

  const header = make("header", "gm-header tc-header",
    `<a class="tc-brand" href="cellmotion.html" aria-label="CellMotion 首页"><img src="assets/cellmotion/logo-original.png" alt="CellMotion"></a><div><small>让创意，自由生长</small><h1>${zhName}${enName ? ` <span>${enName}</span>` : ""}</h1></div>`);
  body.prepend(header);
  header.append(make("a", "tc-back", "动效库"));
  header.lastChild.href = "cellmotion-components.html";
  const exportShortcut = make("button", "tc-export-shortcut", "导出作品");
  exportShortcut.type = "button";
  header.append(exportShortcut);

  const scroll = $(".panel-scroll", panel) || panel;
  const sections = [...scroll.children].filter((node) => node.nodeType === 1 && node.tagName !== "HEADER" && !node.classList.contains("ib-editor-header"));

  const classify = (section) => {
    const ids = $$("[id]", section).map((el) => el.id).join(" ");
    const text = section.textContent || "";
    if (/exportPng|exportGif|exportMp4|exportVideo|ibExportPng/.test(ids) || section.classList.contains("export-panel") || section.classList.contains("ib-export-section")) return "export";
    if (/exportPreset|canvasPreset|ibExportPreset/.test(ids) && /画板|尺寸|比例|canvas|导出尺寸/.test(text)) return "canvas";
    if (section.querySelector(".me-choreo-track, .me-choreo-bar, .ib-choreo-track, .flow-timeline, #choreoBar, #flowTimeline, #pathwriterChoreoBar, #deleteChoreoBar, #ibChoreoTrack")) return "timeline";
    if (section.querySelector("#saveScheme, #saveButton, #ibSaveScheme, .me-scheme-actions, .ib-scheme-row") || /方案/.test(section.querySelector(".section-label, .ib-kicker, p")?.textContent || "") && section.querySelector("button")) return "scheme";
    if (section.querySelector("textarea, #phrase, #copyText, #rowsInput, #phrasesInput, #pairList, #wordRows, #sceneAText, #ibText, .sa-pair-list, .half-section")) return "content";
    return "motion";
  };

  const buckets = { canvas: [], content: [], motion: [], timeline: [], scheme: [], export: [] };
  sections.forEach((section) => {
    section.classList.add("gm-card");
    const track = section.querySelector(".me-choreo-track, .me-choreo-bar, .ib-choreo-track, .flow-timeline, #choreoBar, #flowTimeline, #pathwriterChoreoBar, #deleteChoreoBar, #ibChoreoTrack");
    const extras = track ? $$("input, select, textarea, button", section).filter((el) => !track.contains(el) && !el.closest(".me-choreo-legend")) : [];
    if (track && extras.length > 4) {
      const wrap = make("section", "gm-card");
      wrap.append(track);
      buckets.timeline.push(wrap);
      buckets.motion.push(section);
      return;
    }
    buckets[classify(section)].push(section);
  });

  const left = make("aside", "tc-content", '<div class="tc-panel-heading"><div><small>内容</small><h2>文字段落 <span id="tcRowCount"></span></h2></div></div><p class="tc-hint">选择一段内容，在右侧编辑</p><div class="tc-row-list" id="tcRowList" aria-label="选择文字段落"></div>');
  left.setAttribute("aria-label", "段落导航");
  const addButton = $("#addPairButton, #addRow, .add-pair-button");
  if (addButton) {
    addButton.setAttribute("aria-label", "添加文字段落");
    left.querySelector(".tc-panel-heading").append(addButton);
  }
  buckets.scheme.forEach((section) => {
    section.classList.add("tc-scheme");
    left.append(section);
  });
  body.append(left);

  const inspector = make("aside", "gm-inspector");
  inspector.id = "glyphMorphInspector";
  inspector.setAttribute("aria-label", `${zhName}编辑器`);
  const tabs = make("nav", "tc-tabs", '<button type="button" data-panel="row" aria-pressed="true">当前段落</button><button type="button" data-panel="global" aria-pressed="false">动效设置</button><button type="button" data-panel="export" aria-pressed="false">导出</button>');
  tabs.setAttribute("aria-label", "属性分类");
  const rowPanel = make("section", "tc-properties", '<div class="tc-panel-heading"><div><small>当前编辑</small><h2 id="tcSelectedTitle">段落 01</h2></div></div>');
  rowPanel.dataset.panel = "row";
  buckets.content.forEach((section) => rowPanel.append(section));
  const globalPanel = make("section", "tc-properties");
  globalPanel.dataset.panel = "global";
  globalPanel.hidden = true;
  buckets.motion.forEach((section) => globalPanel.append(section));
  const exportPanel = make("section", "tc-properties");
  exportPanel.dataset.panel = "export";
  exportPanel.hidden = true;
  buckets.export.forEach((section) => exportPanel.append(section));
  inspector.append(tabs, rowPanel, globalPanel, exportPanel);
  body.append(inspector);

  const toolbar = make("section", "tc-canvas-toolbar", '<span class="tc-preview-label">画布预览</span>');
  const canvasCard = make("section", "gm-card gm-canvas-card");
  buckets.canvas.forEach((section) => canvasCard.append(section));
  toolbar.append(canvasCard);
  const center = make("section", "tc-center");
  center.setAttribute("aria-label", "画布与播放");
  if (!stage.id) stage.id = "cellmotionStage";
  stage.classList.add("gm-stage");
  const frame = $(".design-frame, .impact-canvas-shell, .sa-phone, .ib-composition, canvas", stage)?.closest("div") || $("canvas", stage)?.parentElement;
  frame?.classList.add("gm-composition-frame");
  const timeline = make("section", "tc-timeline gm-card");
  const controls = $(".me-stage-controls, .ib-controls, .water-stage-controls, .writer-stage-actions, .vertical-stage-controls, .transport", stage) || $(".transport");
  if (controls) {
    controls.classList.add("gm-stage-controls");
    timeline.append(controls);
  }
  buckets.timeline.forEach((section) => timeline.append(section));
  center.append(toolbar, stage, timeline);
  body.append(center);

  if (iconBurst) $(".ib-app")?.remove();
  else panel.remove();

  const setPanel = (name) => {
    [rowPanel, globalPanel, exportPanel].forEach((section) => { section.hidden = section.dataset.panel !== name; });
    $$("button", tabs).forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.panel === name)));
  };
  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-panel]");
    if (button) setPanel(button.dataset.panel);
  });
  exportShortcut.addEventListener("click", () => setPanel("export"));

  const listRoot = $("#pairList, #wordRows, .sa-pair-list");
  const rowList = $("#tcRowList");
  const collectItems = () => {
    if (listRoot) return [...listRoot.children].filter((node) => node.nodeType === 1);
    if (buckets.content.length) return buckets.content;
    return [rowPanel];
  };
  let selected = 0;
  const labelFor = (item, index) => {
    const input = item.querySelector?.("input[type='text'], textarea, .pair-lead-input, .sa-pair-name");
    const text = input?.value || item.querySelector?.("strong, b, .section-label, .ib-kicker")?.textContent || item.textContent;
    const clean = String(text || "").trim().split("\n")[0].slice(0, 28);
    return clean || `段落 ${String(index + 1).padStart(2, "0")}`;
  };
  const syncRows = () => {
    const items = collectItems();
    if (selected >= items.length) selected = Math.max(0, items.length - 1);
    $("#tcRowCount").textContent = String(items.length);
    rowList.replaceChildren(...items.map((item, index) => {
      const selectedNow = index === selected;
      if (item !== rowPanel && item.style) item.style.display = listRoot ? "" : (selectedNow ? "" : "none");
      if (selectedNow) $("#tcSelectedTitle").textContent = `段落 ${String(index + 1).padStart(2, "0")}`;
      const button = make("button", "tc-row-select");
      button.type = "button";
      button.dataset.index = String(index);
      button.setAttribute("aria-pressed", String(selectedNow));
      button.append(make("span", "tc-row-number", String(index + 1).padStart(2, "0")), make("strong", "tc-row-text", labelFor(item, index)), make("small", "tc-row-description", "在右侧编辑"));
      return button;
    }));
  };
  rowList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    selected = Number(button.dataset.index);
    setPanel("row");
    syncRows();
  });
  if (listRoot) new MutationObserver(syncRows).observe(listRoot, { childList: true });
  document.addEventListener("input", (event) => {
    if (event.target.closest("#pairList, #wordRows, textarea, input[type='text']")) syncRows();
  });
  addButton?.addEventListener("click", () => requestAnimationFrame(() => {
    selected = Math.max(0, collectItems().length - 1);
    syncRows();
  }));
  syncRows();
  window.dispatchEvent(new Event("resize"));
})();
