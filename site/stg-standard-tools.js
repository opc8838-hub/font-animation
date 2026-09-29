(() => {
  "use strict";
  if (!document.body.matches('[data-editor-standard="true"][data-morph-port="construct"], [data-editor-standard="true"][data-morph-port="crash"], [data-editor-standard="true"][data-morph-port="snap"]')) return;

  let stage = document.querySelector("#stgCanvasStage");
  if (!stage) { stage = document.createElement("main"); stage.id = "stgCanvasStage"; stage.className = "stg-canvas-stage"; document.body.prepend(stage); }
  const panel = document.querySelector("#widget .sec") || document.querySelector("#generatorInput");
  if (!stage || !panel) return;
  const tr = (zh, en) => (localStorage.getItem("cellmotion-site-language") || "zh") === "en" ? en : zh;
  const tools = document.createElement("section");
  tools.className = "stg-standard-tools";
  tools.innerHTML = `
    <h3>${tr("画布与时间轴", "Canvas & timeline")}</h3>
    <label class="stg-tool-field">${tr("画布尺寸", "Canvas size")}
      <select data-canvas-size><option value="1920x1080">16:9 · 1920 × 1080</option><option value="1080x1080">1:1 · 1080 × 1080</option><option value="1080x1920">9:16 · 1080 × 1920</option><option value="custom">${tr("自定义", "Custom")}</option></select>
    </label>
    <div class="stg-tool-custom" hidden><label>${tr("宽", "Width")}<input data-width type="number" min="240" max="3840" value="1920"></label><label>${tr("高", "Height")}<input data-height type="number" min="240" max="3840" value="1080"></label></div>
    <div class="stg-tool-timeline"><div class="stg-tool-timeline-head"><strong>${tr("循环时间轴", "Loop timeline")}</strong><output data-clock>0.00s</output></div><div class="stg-tool-ruler" data-ruler></div><div class="stg-tool-track me-choreo-track"><i data-loop>${tr("循环预览", "Preview loop")}</i><b data-playhead></b></div></div>
    <div class="stg-tool-export"><h4>${tr("导出作品", "Export")}</h4><div class="stg-tool-fields"><label>${tr("时长", "Duration")}<select data-duration><option value="3">3 s</option><option value="5" selected>5 s</option><option value="10">10 s</option><option value="custom">${tr("自定义", "Custom")}</option></select></label><label>${tr("帧率", "Frame rate")}<select data-fps><option>15</option><option>24</option><option selected>30</option><option>60</option></select></label></div><label class="stg-tool-custom-duration" hidden>${tr("自定义秒数", "Custom seconds")}<input data-custom-duration type="number" min="0.2" max="60" step="0.1" value="5"></label><div class="stg-tool-actions"><button data-export="png" type="button">PNG</button><button data-export="gif" type="button">GIF</button><button data-export="mp4" type="button">H.264 MP4</button></div><p class="stg-tool-status" aria-live="polite">${tr("按当前画布比例导出。", "Exports use the selected canvas ratio.")}</p></div>`;
  panel.append(tools);
  const inspectorTabs = document.createElement("nav");
  inspectorTabs.className = "stg-standard-inspector-tabs";
  inspectorTabs.setAttribute("aria-label", tr("编辑器设置", "Editor settings"));
  inspectorTabs.innerHTML = `<button type="button" data-inspector-tab="segment" aria-pressed="true">${tr("当前段落", "Current segment")}</button><button type="button" data-inspector-tab="motion" aria-pressed="false">${tr("动效设置", "Motion")}</button><button type="button" data-inspector-tab="export" aria-pressed="false">${tr("导出", "Export")}</button>`;
  panel.classList.add("stg-standard-inspector");
  panel.dataset.inspectorView = "segment";
  panel.prepend(inspectorTabs);
  const textArea = panel.querySelector("#textArea");
  if (textArea) {
    textArea.dataset.inspectorSection = "segment";
    if (textArea.nextElementSibling) textArea.nextElementSibling.dataset.inspectorSection = "segment";
  }
  panel.querySelector(".stg-media-grid")?.setAttribute("data-inspector-section", "segment");
  panel.querySelectorAll(".rangers, .butts").forEach((node) => node.setAttribute("data-inspector-section", "motion"));
  if (document.body.dataset.morphPort === "construct") {
    const motionControls = panel.querySelector(".rangers");
    if (motionControls && !motionControls.querySelector("[data-font-size]")) {
      const fontSize = document.createElement("label");
      fontSize.className = "stg-standard-type-size";
      fontSize.innerHTML = `<span>${tr("文字大小", "Font size")} <output data-font-size-value>100</output> px</span><input data-font-size type="range" min="24" max="200" step="1" value="100" aria-label="${tr("文字大小", "Font size")}">`;
      motionControls.append(fontSize);
      fontSize.querySelector("[data-font-size]").addEventListener("input", (event) => {
        const value = Number(event.target.value);
        fontSize.querySelector("[data-font-size-value]").value = value;
        fontSize.querySelector("[data-font-size-value]").textContent = String(value);
        if (typeof window.setPGsize === "function") window.setPGsize(value);
      });
    }
  }
  tools.querySelector(".stg-tool-export")?.setAttribute("data-inspector-section", "export");
  inspectorTabs.querySelectorAll("[data-inspector-tab]").forEach((button) => button.addEventListener("click", () => {
    panel.dataset.inspectorView = button.dataset.inspectorTab;
    inspectorTabs.querySelectorAll("[data-inspector-tab]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  }));

  // Place the three legacy STG effects in the shared editor geometry: content
  // navigation, a measured stage, a real loop ruler, and a scrolling inspector.
  const editor = document.querySelector("#generatorInput") || document.querySelector("#widget");
  const header = document.querySelector(".stg-workspace-header");
  if (editor && header) {
    const names = { construct: ["构筑", "Construct"], crash: ["碰撞", "Crash"], snap: ["吸附", "Snap"] }[document.body.dataset.morphPort];
    header.classList.add("stg-standard-header");
    const brand = document.createElement("a");
    brand.className = "stg-standard-brand";
    brand.href = "cellmotion.html";
    brand.setAttribute("aria-label", "CellMotion 首页");
    brand.innerHTML = '<img src="assets/cellmotion/logo-original-transparent.png?v=20260926-1" alt="CellMotion">';
    const brandImage = brand.querySelector("img");
    const syncBrandLogo = () => { const dark = document.documentElement.dataset.siteTheme === "dark"; brandImage.src = dark ? "assets/cellmotion/logo-dark-original.png?v=20260927-1" : "assets/cellmotion/logo-original-transparent.png?v=20260926-1"; };
    syncBrandLogo();
    new MutationObserver(syncBrandLogo).observe(document.documentElement, { attributes: true, attributeFilter: ["data-site-theme"] });
    const heading = header.querySelector(".stg-workspace-heading");
    const title = heading?.querySelector("strong");
    if (title && names) title.innerHTML = `${names[0]} <span class="no-translate">${names[1]}</span>`;
    heading?.querySelector("small")?.remove();
    header.querySelector(".stg-workspace-back")?.remove();
    header.querySelector(".stg-workspace-top")?.remove();
    const library = document.createElement("a");
    library.className = "stg-standard-library";
    library.href = "cellmotion-components.html";
    library.textContent = tr("动效库", "Library");
    header.prepend(brand);
    heading?.after(library);
    if (editor.id === "generatorInput" && editor.parentElement?.id === "widget") { editor.parentElement.removeChild(editor); document.body.append(editor); document.querySelector("#widget")?.remove(); }
    const syncEditorGrid = () => { const mobile = window.matchMedia("(max-width: 640px)").matches; editor.style.setProperty("position", "relative", "important"); editor.style.setProperty("inset", "auto", "important"); editor.style.setProperty("grid-area", mobile ? "5 / 1" : "2 / 3 / 5", "important"); editor.style.setProperty("width", mobile ? "100%" : "auto", "important"); editor.style.setProperty("height", "auto", "important"); editor.style.setProperty("max-height", "none", "important"); editor.style.setProperty("max-width", mobile ? "100%" : "none", "important"); editor.style.setProperty("box-sizing", "border-box", "important"); editor.style.setProperty("justify-self", "stretch", "important"); editor.style.setProperty("transform", "none", "important"); editor.style.setProperty("zoom", "1", "important"); editor.style.setProperty("overflow-y", mobile ? "visible" : "auto", "important"); editor.style.setProperty("overflow-x", "hidden", "important"); };
    syncEditorGrid();
    window.addEventListener("resize", syncEditorGrid, { passive: true });
    const sidebar = document.createElement("aside");
    sidebar.className = "stg-standard-sidebar";
    sidebar.innerHTML = `<div class="stg-standard-sidebar-heading"><small>${tr("内容", "CONTENT")}</small><h2>${document.body.dataset.morphPort === "construct" ? tr("构筑", "Construct") : document.body.dataset.morphPort === "crash" ? tr("碰撞", "Crash") : tr("吸附", "Snap")}</h2></div><p>${tr("在右侧编辑文字、图形与素材，画布会实时更新。", "Edit text, shapes and assets in the inspector; the canvas updates live.")}</p><div class="stg-standard-nav"><button type="button" data-focus="text">${tr("文字与素材", "Text & assets")}</button><button type="button" data-focus="timeline">${tr("时间轴", "Timeline")}</button><button type="button" data-focus="export">${tr("导出设置", "Export settings")}</button></div><section class="stg-standard-scheme"><h3>${tr("方案", "Scheme")}</h3><div><button type="button" data-scheme-save>${tr("保存方案 JSON", "Save scheme JSON")}</button><button type="button" data-scheme-import>${tr("导入方案 JSON", "Import scheme JSON")}</button><button type="button" data-scheme-reset>${tr("恢复默认", "Restore defaults")}</button><button type="button" data-scheme-clear>${tr("清理重做", "Clear & rebuild")}</button></div><input data-scheme-file type="file" accept="application/json,.json" hidden><p data-scheme-status aria-live="polite"></p></section><div class="stg-standard-sidebar-foot"><span>${tr("画板", "Canvas")}</span><strong data-canvas-summary>1920 × 1080</strong><small>${tr("实时预览 · 秒级刻度", "Live preview · seconds ruler")}</small></div>`;
    const toolbar = document.createElement("div");
    toolbar.className = "stg-standard-toolbar";
    toolbar.innerHTML = `<strong>${tr("画布预览", "Canvas preview")}</strong>`;
    const sizeControl = tools.querySelector(".stg-tool-field");
    if (sizeControl) toolbar.append(sizeControl);
    const customSizeControl = tools.querySelector(".stg-tool-custom");
    if (customSizeControl) toolbar.append(customSizeControl);
    const timelineCard = document.createElement("section");
    timelineCard.className = "stg-standard-timeline";
    timelineCard.setAttribute("aria-label", tr("动效时间轴", "Animation timeline"));
    const timeline = tools.querySelector(".stg-tool-timeline");
    if (timeline) timelineCard.append(timeline);
    const transport = document.querySelector(".stg-stage-controls");
    transport?.classList.add("me-stage-controls");
    if (transport) timelineCard.prepend(transport);
    const sizeSelect = toolbar.querySelector("[data-canvas-size]") || tools.querySelector("[data-canvas-size]");
    const stageElement = document.querySelector("#stgCanvasStage") || stage;
    stageElement.classList.add("stg-standard-stage");
    const stageHeading = document.querySelector(".stg-workspace-intro");
    stageHeading?.remove();
    header.remove();
    document.body.prepend(header);
    document.body.append(sidebar, toolbar, timelineCard);
    const legacyNavigation = document.querySelector(".stg-cn-toolbar");
    if (legacyNavigation) header.append(legacyNavigation);
    document.querySelectorAll("body > canvas").forEach((canvas) => stageElement.append(canvas));
    const topExport = document.createElement("button");
    topExport.type = "button";
    topExport.className = "stg-standard-export-shortcut";
    topExport.textContent = tr("导出作品", "Export");
    topExport.addEventListener("click", () => {
      inspectorTabs.querySelector('[data-inspector-tab="export"]')?.click();
      tools.querySelector(".stg-tool-export")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    header.append(topExport);
    sidebar.querySelector('[data-focus="text"]')?.setAttribute("aria-pressed", "true");
    sidebar.querySelectorAll("[data-focus]").forEach((button) => button.addEventListener("click", () => {
      sidebar.querySelectorAll("[data-focus]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      if (button.dataset.focus === "export") inspectorTabs.querySelector('[data-inspector-tab="export"]')?.click();
      if (button.dataset.focus === "text") inspectorTabs.querySelector('[data-inspector-tab="segment"]')?.click();
      const target = button.dataset.focus === "export" ? tools.querySelector(".stg-tool-export") : button.dataset.focus === "timeline" ? timelineCard : editor;
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (button.dataset.focus === "text") editor.scrollTo({ top: 0, behavior: "smooth" });
    }));
    const updateCanvasSummary = () => {
      const value = sizeSelect?.value || "1920x1080";
      const summary = sidebar.querySelector("[data-canvas-summary]");
      const activeWidth = value === "custom" ? toolbar.querySelector("[data-width]")?.value : value.split("x")[0];
      const activeHeight = value === "custom" ? toolbar.querySelector("[data-height]")?.value : value.split("x")[1];
      summary.textContent = `${activeWidth} × ${activeHeight}`;
      const timelineHeading = timelineCard.querySelector(".stg-tool-timeline-head strong");
      if (timelineHeading) timelineHeading.textContent = `${tr("循环时间轴", "Loop timeline")} · ${activeWidth} × ${activeHeight}`;
    };
    sizeSelect?.addEventListener("change", updateCanvasSummary);
    toolbar.querySelectorAll("[data-width], [data-height]").forEach((input) => input.addEventListener("input", updateCanvasSummary));
    updateCanvasSummary();
    const schemeStatus = sidebar.querySelector("[data-scheme-status]");
    const schemeFields = () => Array.from(editor.querySelectorAll("input:not([type=file]), select, textarea")).filter((field) => field.id);
    const readScheme = () => ({
      version: 1,
      effect: document.body.dataset.morphPort,
      editor: Object.fromEntries(schemeFields().map((field) => [field.id, field.type === "checkbox" ? field.checked : field.value])),
      canvas: { preset: sizeSelect.value, width: toolbar.querySelector("[data-width]").value, height: toolbar.querySelector("[data-height]").value },
      export: { duration: tools.querySelector("[data-duration]").value, customDuration: tools.querySelector("[data-custom-duration]").value, fps: tools.querySelector("[data-fps]").value }
    });
    sidebar.querySelector("[data-scheme-save]").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(readScheme(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `cellmotion-${document.body.dataset.morphPort}-scheme.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      schemeStatus.textContent = tr("方案 JSON 已保存。", "Scheme JSON saved.");
    });
    const importInput = sidebar.querySelector("[data-scheme-file]");
    sidebar.querySelector("[data-scheme-import]").addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", async () => {
      const file = importInput.files?.[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data.version !== 1 || data.effect !== document.body.dataset.morphPort) throw new Error(tr("方案文件与当前动效不匹配。", "This scheme does not match the current effect."));
        for (const field of schemeFields()) {
          if (!Object.hasOwn(data.editor || {}, field.id) || field.type === "file") continue;
          if (field.type === "checkbox") field.checked = Boolean(data.editor[field.id]); else field.value = String(data.editor[field.id]);
          field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new Event("change", { bubbles: true }));
        }
        sizeSelect.value = data.canvas?.preset || "1920x1080";
        toolbar.querySelector("[data-width]").value = data.canvas?.width || "1920"; toolbar.querySelector("[data-height]").value = data.canvas?.height || "1080";
        sizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        tools.querySelector("[data-duration]").value = data.export?.duration || "5"; tools.querySelector("[data-custom-duration]").value = data.export?.customDuration || "5"; tools.querySelector("[data-fps]").value = data.export?.fps || "30";
        tools.querySelector("[data-duration]").dispatchEvent(new Event("change", { bubbles: true })); updateCanvasSummary();
        schemeStatus.textContent = tr("方案已导入；已上传文件需重新添加。", "Scheme imported. Re-add uploaded media files.");
      } catch (error) { schemeStatus.textContent = error.message || tr("方案文件无法读取。", "The scheme file could not be read."); }
      importInput.value = "";
    });
    sidebar.querySelector("[data-scheme-reset]").addEventListener("click", () => window.location.reload());
    sidebar.querySelector("[data-scheme-clear]").addEventListener("click", () => {
      const textarea = editor.querySelector("textarea"); if (textarea) { textarea.value = ""; textarea.dispatchEvent(new Event("input", { bubbles: true })); }
      if (window.stgMedia) { window.stgMedia.enabled = false; window.stgMedia.assets.splice(0); window.stgMedia.activeAssetId = null; window.stgMediaUpdateStatus?.(); window.stgMediaRenderAssetLibrary?.(); }
      editor.querySelectorAll("input[type=checkbox]").forEach((field) => { field.checked = false; field.dispatchEvent(new Event("input", { bubbles: true })); });
      schemeStatus.textContent = tr("内容已清空，可以重新编辑。", "Content cleared. You can start a new edit.");
    });
    const syncShellLanguage = () => {
      const english = (localStorage.getItem("cellmotion-site-language") || "zh") === "en";
      sidebar.querySelector(".stg-standard-sidebar-heading small").textContent = english ? "CONTENT" : "内容";
      sidebar.querySelector(".stg-standard-sidebar > p").textContent = english ? "Edit text, shapes and assets in the inspector; the canvas updates live." : "在右侧编辑文字、图形与素材，画布会实时更新。";
      sidebar.querySelector('[data-focus="text"]').textContent = english ? "Text & assets" : "文字与素材";
      sidebar.querySelector('[data-focus="timeline"]').textContent = english ? "Timeline" : "时间轴";
      sidebar.querySelector('[data-focus="export"]').textContent = english ? "Export settings" : "导出设置";
      sidebar.querySelector(".stg-standard-sidebar-foot > span").textContent = english ? "Canvas" : "画板";
      sidebar.querySelector(".stg-standard-sidebar-foot small").textContent = english ? "Live preview · seconds ruler" : "实时预览 · 秒级刻度";
      sidebar.querySelector(".stg-standard-scheme h3").textContent = english ? "Scheme" : "方案";
      sidebar.querySelector("[data-scheme-save]").textContent = english ? "Save scheme JSON" : "保存方案 JSON";
      sidebar.querySelector("[data-scheme-import]").textContent = english ? "Import scheme JSON" : "导入方案 JSON";
      sidebar.querySelector("[data-scheme-reset]").textContent = english ? "Restore defaults" : "恢复默认";
      sidebar.querySelector("[data-scheme-clear]").textContent = english ? "Clear & rebuild" : "清理重做";
      toolbar.querySelector("strong").textContent = english ? "Canvas preview" : "画布预览";
      const names = { construct: ["构筑", "Construct"], crash: ["碰撞", "Crash"], snap: ["吸附", "Snap"] }[document.body.dataset.morphPort];
      const title = header.querySelector(".stg-workspace-heading strong");
      if (title && names) title.innerHTML = english ? names[1] : `${names[0]} <span class="no-translate">${names[1]}</span>`;
      header.querySelector(".stg-standard-library").textContent = english ? "Library" : "动效库";
      topExport.textContent = english ? "Export" : "导出作品";
      inspectorTabs.querySelector('[data-inspector-tab="segment"]').textContent = english ? "Current segment" : "当前段落";
      inspectorTabs.querySelector('[data-inspector-tab="motion"]').textContent = english ? "Motion" : "动效设置";
      inspectorTabs.querySelector('[data-inspector-tab="export"]').textContent = english ? "Export" : "导出";
    };
    document.addEventListener("cellmotion:languagechange", syncShellLanguage);
    syncShellLanguage();
  }

  const $ = (selector) => tools.querySelector(selector)
    || document.querySelector(`.stg-standard-toolbar ${selector}`)
    || document.querySelector(`.stg-standard-timeline ${selector}`);
  const setStatus = (message) => { const status = $(".stg-tool-status"); status.dataset.isDefault = "false"; status.textContent = message; };
  const labels = {
    canvas: ["画布尺寸", "Canvas size"], width: ["宽", "Width"], height: ["高", "Height"],
    timeline: ["循环时间轴", "Loop timeline"], loop: ["循环预览", "Preview loop"],
    export: ["导出作品", "Export"], duration: ["时长", "Duration"], fps: ["帧率", "Frame rate"],
    custom: ["自定义", "Custom"], seconds: ["自定义秒数", "Custom seconds"],
    status: ["按当前画布比例导出。", "Exports use the selected canvas ratio."]
  };
  const applyLanguage = () => {
    const value = (pair) => tr(pair[0], pair[1]);
    $("h3").textContent = tr("画布与时间轴", "Canvas & timeline");
    $(".stg-tool-field").firstChild.textContent = value(labels.canvas);
    $("[data-width]").parentElement.firstChild.textContent = value(labels.width);
    $("[data-height]").parentElement.firstChild.textContent = value(labels.height);
    $(".stg-tool-timeline-head strong").textContent = value(labels.timeline);
    $("[data-loop]").textContent = value(labels.loop);
    $(".stg-tool-export h4").textContent = value(labels.export);
    $("[data-duration]").parentElement.firstChild.textContent = value(labels.duration);
    $("[data-fps]").parentElement.firstChild.textContent = value(labels.fps);
    $(".stg-tool-custom-duration").firstChild.textContent = value(labels.seconds);
    $("[data-canvas-size] option[value='custom']").textContent = value(labels.custom);
    $("[data-duration] option[value='custom']").textContent = value(labels.custom);
    const status = $(".stg-tool-status");
    if (status.dataset.isDefault === "true") status.textContent = value(labels.status);
  };
  let width = 1920;
  let height = 1080;
  let duration = 5;
  let startedAt = performance.now();
  let lastCanvasAspect = null;
  $(".stg-tool-status").dataset.isDefault = "true";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
  const canvas = () => document.querySelector("#stgCanvasStage canvas, #generatorInput canvas, #widget canvas, canvas");
  const dimensions = () => ({ width, height });
  function syncStageSize() {
    const stageElement = document.querySelector("#stgCanvasStage");
    const source = stageElement?.querySelector("canvas");
    if (!stageElement || !source) return;
    const scale = Math.min(stageElement.clientWidth / width, stageElement.clientHeight / height);
    if (!(scale > 0)) return;
    const pixelWidth = Math.max(1, Math.floor(width * scale));
    const pixelHeight = Math.max(1, Math.floor(height * scale));
    const nextAspect = pixelWidth / pixelHeight;
    const aspectChanged = lastCanvasAspect !== null && Math.abs(lastCanvasAspect - nextAspect) > .005;
    if (window.resizeCanvas && (source.width !== pixelWidth || source.height !== pixelHeight)) {
      window.resizeCanvas(pixelWidth, pixelHeight);
      if (aspectChanged) {
        if (Number.isFinite(window.wPad) && typeof window.map === "function") window.wWindow = source.width - window.map(window.wPad, 0, 100, 0, source.width);
        if (typeof window.setText === "function") window.setText();
      }
    }
    lastCanvasAspect = nextAspect;
    source.style.setProperty("position", "absolute", "important");
    source.style.setProperty("left", "50%", "important"); source.style.setProperty("top", "50%", "important");
    source.style.setProperty("right", "auto", "important"); source.style.setProperty("bottom", "auto", "important");
    source.style.setProperty("transform", "translate(-50%,-50%)", "important");
    source.style.setProperty("width", pixelWidth + "px", "important"); source.style.setProperty("height", pixelHeight + "px", "important");
    source.style.setProperty("max-width", "100%", "important"); source.style.setProperty("max-height", "100%", "important");
    source.style.setProperty("object-fit", "contain", "important");
  }
  const makeOutput = () => {
    const output = document.createElement("canvas");
    output.width = width; output.height = height;
    return output;
  };
  const download = (name, blob) => {
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);
  };
  function drawCurrentFrame(output) {
    const source = canvas();
    if (!source) throw new Error(tr("画布尚未载入。", "The animation canvas is not ready."));
    const context = output.getContext("2d");
    context.clearRect(0, 0, width, height);
    const scale = Math.max(width / source.width, height / source.height);
    const drawWidth = source.width * scale; const drawHeight = source.height * scale;
    context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }
  function drawRuler() {
    const ruler = $("[data-ruler]");
    const total = duration;
    ruler.replaceChildren();
    for (let second = 0; second <= total; second += 1) {
      const tick = document.createElement("span"); tick.textContent = `${second}s`;
      tick.style.left = `${second / total * 100}%`; ruler.append(tick);
    }
    $("[data-loop]").style.width = "100%";
  }
  function updateDuration() {
    duration = $("[data-duration]").value === "custom" ? clamp($("[data-custom-duration]").value, .2, 60) : Number($("[data-duration]").value);
    drawRuler();
  }
  $("[data-canvas-size]").addEventListener("change", (event) => {
    const value = event.target.value;
    if (value === "custom") { $(".stg-tool-custom").hidden = false; return; }
    [width, height] = value.split("x").map(Number);
    $(".stg-tool-custom").hidden = true;
    $("[data-width]").value = width; $("[data-height]").value = height;
    requestAnimationFrame(syncStageSize);
  });
  ["[data-width]", "[data-height]"].forEach((selector) => $(selector).addEventListener("change", () => {
    width = clamp($("[data-width]").value, 240, 3840); height = clamp($("[data-height]").value, 240, 3840);
    $("[data-width]").value = width; $("[data-height]").value = height;
    $("[data-canvas-size]").value = "custom"; $(".stg-tool-custom").hidden = false;
    requestAnimationFrame(syncStageSize);
  }));
  $("[data-duration]").addEventListener("change", () => {
    $(".stg-tool-custom-duration").hidden = $("[data-duration]").value !== "custom"; updateDuration();
  });
  $("[data-custom-duration]").addEventListener("change", updateDuration);
  $("[data-export='png']").addEventListener("click", () => {
    try { const output = makeOutput(); drawCurrentFrame(output); output.toBlob((blob) => blob && download(`cellmotion-${document.body.dataset.morphPort}-${width}x${height}.png`, blob), "image/png"); setStatus(`${tr("PNG 已生成", "PNG ready")} · ${width} × ${height}`); }
    catch (error) { setStatus(error.message); }
  });
  $("[data-export='gif']").addEventListener("click", async () => {
    if (!window.GIF) { setStatus(tr("GIF 编码器未加载。", "GIF encoder is unavailable.")); return; }
    const fps = Number($("[data-fps]").value) || 15; const frameCount = Math.max(1, Math.ceil(duration * fps));
    const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: "js/continuation-gif.worker.js" });
    const output = makeOutput(); const source = canvas();
    if (!source) { setStatus(tr("画布尚未载入。", "The animation canvas is not ready.")); return; }
    for (let frame = 0; frame < frameCount; frame += 1) {
      drawCurrentFrame(output); gif.addFrame(output, { copy: true, delay: 1000 / fps });
      setStatus(`${tr("准备 GIF", "Preparing GIF")} · ${frame + 1} / ${frameCount}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
    }
    gif.on("progress", (progress) => { setStatus(`${tr("编码 GIF", "Encoding GIF")} · ${Math.round(progress * 100)}%`); });
    gif.on("finished", (blob) => { download(`cellmotion-${document.body.dataset.morphPort}-${width}x${height}.gif`, blob); setStatus(`${tr("GIF 已生成", "GIF ready")} · ${width} × ${height}`); });
    gif.render();
  });
  $("[data-export='mp4']").addEventListener("click", async () => {
    if (!window.HME?.createH264MP4Encoder) { setStatus(tr("MP4 编码器未加载。", "MP4 encoder is unavailable.")); return; }
    const fps = Number($("[data-fps]").value) || 30; const frameCount = Math.max(1, Math.ceil(duration * fps));
    let encoder;
    try {
      const output = makeOutput(); const context = output.getContext("2d", { willReadFrequently: true });
      encoder = await window.HME.createH264MP4Encoder();
      encoder.outputFilename = `cellmotion-${document.body.dataset.morphPort}-${width}x${height}.mp4`;
      encoder.width = width; encoder.height = height; encoder.frameRate = fps; encoder.kbps = Math.max(4000, Math.round(width * height * fps * .12 / 1000)); encoder.groupOfPictures = 15; encoder.initialize();
      for (let frame = 0; frame < frameCount; frame += 1) {
        drawCurrentFrame(output); encoder.addFrameRgba(context.getImageData(0, 0, width, height).data);
        setStatus(`${tr("编码 MP4", "Encoding MP4")} · ${Math.round((frame + 1) / frameCount * 100)}%`);
        await new Promise((resolve) => setTimeout(resolve, 1000 / fps));
      }
      encoder.finalize(); const bytes = encoder.FS.readFile(encoder.outputFilename);
      download(encoder.outputFilename, new Blob([bytes], { type: "video/mp4" }));
      setStatus(`${tr("MP4 已生成", "MP4 ready")} · ${width} × ${height}`);
    } catch (error) { setStatus(`${tr("MP4 导出失败", "MP4 export failed")}: ${error.message}`); }
    finally { try { encoder?.delete(); } catch (_) {} }
  });

  function animateTimeline(now) {
    const seconds = ((now - startedAt) / 1000) % duration;
    $("[data-clock]").textContent = `${seconds.toFixed(2)}s`;
    $("[data-playhead]").style.left = `${seconds / duration * 100}%`;
    requestAnimationFrame(animateTimeline);
  }
  drawRuler(); requestAnimationFrame(animateTimeline);
  window.addEventListener("resize", () => requestAnimationFrame(syncStageSize));
  let stageSyncAttempts = 0;
  const stageSyncTimer = window.setInterval(() => {
    stageSyncAttempts += 1; syncStageSize();
    const source = document.querySelector("#stgCanvasStage canvas");
    if ((source && Math.abs(source.width / Math.max(1, source.height) - width / height) < .005) || stageSyncAttempts >= 60) window.clearInterval(stageSyncTimer);
  }, 500);
  document.addEventListener("cellmotion:languagechange", applyLanguage);
  applyLanguage();
})();
