/* Generic CellMotion three-column shell for me-motion-editor and Icon Burst pages. */
(() => {
  if (new URLSearchParams(location.search).has("preview")) return;
  const pageBody = document.body;
  if (pageBody.classList.contains("tc-workspace")) {
    const slug = location.pathname.split("/").pop().replace(/\.html$/, "");
    const englishTitles = { "split-flip": "Split Flip", zerogflip: "Zero-G Flip", currentwall: "Water Flow", verticalwall: "Vertical Rise", creatorstudio: "Creator Merge", focuswheel: "Focus Wheel", gradienttype: "Gradient Type", glyphrelay: "Glyph Relay", wordgather: "Word Gather", focusportal: "Focus Portal", rapidsequence: "Rapid Sequence", citystack: "City Stack", typegarden: "Type Garden", colorcanvas: "Color Canvas", scrapbin: "Scrap Bin", terminalbrand: "Terminal Brand", colorrecompose: "Color Recompose", mistlift: "Mist Lift", glyphreveal: "Glyph Reveal", phrasebuild: "Phrase Build", switchdrop: "Switch Drop", searchtyping: "Search Typing", beforeafter: "Before After", shutterafter: "Shutter After", textswell: "Text Swell", impactbuild: "Impact Build", ribbonink: "Ribbon Ink", construct: "Construct", crash: "Crash", snap: "Snap" };
    const style = document.createElement("style");
    style.dataset.cellmotionAlignment = "true";
    style.textContent = `body.tc-workspace .tc-brand{display:flex!important;align-items:center!important;gap:8px!important;flex:0 0 158px!important;width:158px!important;min-width:158px!important;height:38px!important;padding:0!important;overflow:visible!important;background:transparent!important;color:#17171b!important;opacity:1!important;filter:none!important;mix-blend-mode:normal!important}body.tc-workspace .tc-brand img{display:none!important}body.tc-workspace .tc-brand svg{display:block!important;width:28px!important;height:28px!important;flex:0 0 28px!important;color:#17171b!important}body.tc-workspace .tc-brand>span{display:block!important;color:#17171b!important;font-size:18px!important;font-weight:700!important;letter-spacing:-.04em!important;white-space:nowrap!important}body.tc-workspace[data-editor-palette=dark] .tc-brand,body.tc-workspace[data-editor-palette=dark] .tc-brand svg,body.tc-workspace[data-editor-palette=dark] .tc-brand>span{color:#f4f3f6!important}body.tc-workspace[data-editor-theme=light] .tc-brand,body.tc-workspace[data-editor-theme=light] .tc-brand svg,body.tc-workspace[data-editor-theme=light] .tc-brand>span{color:#17171b!important}body.tc-workspace .gm-canvas-card .gm-field-wide{font-size:13px!important;color:var(--me-text,#222)!important}body.tc-workspace .gm-canvas-card .tc-select-trigger{display:flex!important;width:100%!important;max-width:100%!important;min-width:0!important;font-size:13px!important;color:var(--me-text,#222)!important}body.tc-workspace .gm-canvas-card .tc-select-label{display:block!important;min-width:0!important;font-size:13px!important;line-height:1.2!important;color:inherit!important;opacity:1!important}`;
    document.head.append(style);
    const header = document.querySelector("header.tc-header, header.gm-header");
    const brand = header?.querySelector(".tc-brand");
    if (brand) {
      brand.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 24 15 16 25 6M6 24l17 2M15 16l10-10"/></g><circle cx="6" cy="24" r="4" fill="currentColor"/><circle cx="15" cy="16" r="4" fill="currentColor"/><circle cx="25" cy="6" r="4" fill="#9067f5"/><circle cx="23" cy="26" r="4" fill="currentColor"/></svg><span>CellMotion</span>';
      brand.querySelector("span")?.setAttribute("data-no-translate", "");
      const syncBrandTone = () => {
        const dark = pageBody.dataset.editorTheme === "dark" || (!pageBody.dataset.editorTheme && document.documentElement.dataset.siteTheme === "dark");
        const color = dark ? "#f4f3f6" : "#17171b";
        brand.style.setProperty("color", color, "important");
        brand.style.setProperty("opacity", "1", "important");
        brand.style.setProperty("text-decoration", "none", "important");
        brand.querySelector("svg")?.style.setProperty("color", color, "important");
        brand.querySelector("span")?.style.setProperty("color", color, "important");
        brand.querySelector("span")?.style.setProperty("font", "700 18px/1 Arial, sans-serif", "important");
      };
      syncBrandTone();
      new MutationObserver(syncBrandTone).observe(pageBody, { attributes: true, attributeFilter: ["data-editor-theme"] });
      new MutationObserver(syncBrandTone).observe(document.documentElement, { attributes: true, attributeFilter: ["data-site-theme"] });
    }
    const heading = header?.querySelector("h1") || document.querySelector("h1");
    const englishName = englishTitles[slug];
    if (heading) heading.dataset.noTranslate = "";
    const syncHeading = () => {
      if (!heading || !englishName) return;
      const titleSource = document.title.split("|")[0].trim();
      const chineseName = titleSource.match(/^[\u3400-\u9fff]+/)?.[0] || heading.textContent.match(/[\u3400-\u9fff]+/)?.[0] || "";
      if (!chineseName) return;
      if (heading.textContent.trim() === `${chineseName} ${englishName}`) return;
      const english = document.createElement("span");
      english.textContent = englishName;
      heading.replaceChildren(document.createTextNode(chineseName), document.createTextNode(" "), english);
    };
    syncHeading();
    if (heading) new MutationObserver(syncHeading).observe(heading, { childList: true, characterData: true, subtree: true });
    const syncPalette = () => {
      const color = getComputedStyle(heading || header || pageBody).color;
      const channels = color.match(/[\d.]+/g)?.map(Number) || [];
      pageBody.dataset.editorPalette = channels.length >= 3 && channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 > 155 ? "dark" : "light";
    };
    syncPalette();
    new MutationObserver(syncPalette).observe(pageBody, { attributes: true, attributeFilter: ["data-editor-theme"] });
    return;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const make = (tag, className, html = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.innerHTML = html;
    return node;
  };

  const body = document.body;
  const effectSlug = location.pathname.split("/").pop().replace(/\.html$/, "");
  const alignmentFixes = document.createElement("style");
  alignmentFixes.dataset.cellmotionAlignment = "true";
  alignmentFixes.textContent = `
    body.tc-workspace .tc-canvas-toolbar { display: grid !important; grid-template-columns: auto minmax(0,1fr); align-items: center !important; justify-content: initial !important; min-width: 0 !important; gap: 8px 12px !important; overflow: visible !important; }
    body.tc-workspace .tc-preview-label { display: block !important; width: max-content !important; white-space: nowrap !important; }
    body.tc-workspace .gm-canvas-card { min-width: 0 !important; width: 100% !important; }
    body.tc-workspace .gm-canvas-card > .gm-card { min-width: 0 !important; width: 100% !important; }
    body.tc-workspace .tc-canvas-toolbar .canvas-card { display: grid !important; grid-template-columns: minmax(0,1fr) minmax(150px,230px) !important; align-items: end !important; gap: 8px 12px !important; }
    body.tc-workspace .tc-canvas-toolbar .canvas-card > .section-heading { display: grid !important; grid-column: 1 !important; align-content: center !important; gap: 2px !important; min-width: 0 !important; flex-wrap: nowrap !important; }
    body.tc-workspace .tc-canvas-toolbar .canvas-card > label { display: grid !important; grid-column: 2 !important; grid-template-columns: auto minmax(0,1fr) !important; align-items: center !important; gap: 8px !important; min-width: 0 !important; white-space: nowrap !important; }
    body.tc-workspace .tc-canvas-toolbar .canvas-card > label select { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
    body.tc-workspace .tc-canvas-toolbar .canvas-card > label :is(select,.tc-select-trigger) { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
    body.tc-workspace .tc-canvas-toolbar .gm-canvas-card > .canvas-size-section { display: grid !important; grid-template-columns: minmax(100px,1fr) minmax(180px,230px) !important; align-items: center !important; gap: 4px 12px !important; width: 100% !important; min-width: 0 !important; }
    body.tc-workspace .tc-canvas-toolbar .gm-canvas-card > .canvas-size-section > .section-heading { grid-column: 1 !important; grid-row: 1 !important; display: block !important; min-width: 0 !important; margin: 0 !important; }
    body.tc-workspace .tc-canvas-toolbar .gm-canvas-card > .canvas-size-section > :is(select,.tc-select-trigger) { grid-column: 2 !important; grid-row: 1 !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
    body.tc-workspace .tc-canvas-toolbar .gm-canvas-card > .canvas-size-section > .custom-size { grid-column: 2 !important; grid-row: 2 !important; min-width: 0 !important; }
    body.tc-workspace .tc-canvas-toolbar .gm-canvas-card > .canvas-size-section > .hint { grid-column: 1 / -1 !important; grid-row: auto !important; margin: 0 !important; font-size: 10px !important; line-height: 1.3 !important; }
    body.tc-workspace .gm-stage-controls.transport, body.tc-workspace .gm-stage-controls.writer-stage-actions, body.tc-workspace .gm-stage-controls.stage-controls, body.tc-workspace .gm-stage-controls.time-controls { display: flex !important; grid-template-columns: none !important; flex-wrap: nowrap !important; width: min(100%,520px) !important; }
    body.tc-workspace .gm-stage-controls.transport > button, body.tc-workspace .gm-stage-controls.writer-stage-actions > button, body.tc-workspace .gm-stage-controls.stage-controls > button, body.tc-workspace .gm-stage-controls.time-controls > button { min-width: 0 !important; flex: 1 1 0 !important; white-space: nowrap !important; }
    body.tc-workspace .gm-timeline .me-choreo-scroll { min-height: 148px !important; overflow-x: auto !important; overflow-y: visible !important; }
    body.tc-workspace #crChoreoBar { min-height: 144px !important; flex-wrap: nowrap !important; width: max-content !important; align-items: flex-start !important; }
    body.tc-workspace .phrase-time-fields { grid-template-columns: minmax(0,1fr) !important; }
    body.tc-workspace .phrase-time-fields label { display: block !important; width: 100% !important; min-width: 0 !important; }
    body.tc-workspace .phrase-time-fields label > span { display: flex !important; flex-wrap: nowrap !important; white-space: nowrap !important; align-items: center !important; }
    body.tc-workspace .phrase-time-fields output { flex: 0 0 auto !important; white-space: nowrap !important; }
    body.tc-workspace .phrase-rhythm-field { grid-template-columns: minmax(66px,auto) minmax(0,1fr) !important; }
    body.tc-workspace [hidden], body.tc-workspace .custom-size[hidden] { display: none !important; }
    body.tc-workspace .tc-canvas-toolbar { color: #373740 !important; }
    body.tc-workspace[data-editor-palette="dark"] .tc-canvas-toolbar { color: #e8e7ec !important; }
    body.tc-workspace .tc-preview-label { color: inherit !important; }
    body.tc-workspace .tc-preview-label, body.tc-workspace .tc-canvas-toolbar .section-heading { color: #34343b !important; font-weight: 600 !important; }
    body.tc-workspace[data-editor-palette="dark"] .tc-preview-label, body.tc-workspace[data-editor-palette="dark"] .tc-canvas-toolbar .section-heading { color: #ecebf0 !important; }
    body.tc-workspace .tc-brand { display: flex !important; align-items: center !important; gap: 8px !important; flex: 0 0 158px !important; width: 158px !important; min-width: 158px !important; height: 38px !important; padding: 0 !important; overflow: visible !important; background: transparent !important; color: #17171b !important; opacity: 1 !important; filter: none !important; mix-blend-mode: normal !important; }
    body.tc-workspace .tc-brand img { display: none !important; }
    body.tc-workspace .tc-brand svg { display: block !important; width: 28px !important; height: 28px !important; flex: 0 0 28px !important; color: #17171b !important; opacity: 1 !important; }
    body.tc-workspace .tc-brand > span { display: block !important; color: #17171b !important; opacity: 1 !important; font: 700 18px/1 Arial, sans-serif !important; letter-spacing: -.02em !important; white-space: nowrap !important; }
    body.tc-workspace[data-editor-palette="dark"] .tc-brand,
    body.tc-workspace[data-editor-palette="dark"] .tc-brand svg,
    body.tc-workspace[data-editor-palette="dark"] .tc-brand > span { color: #f4f3f6 !important; }
  `;
  document.head.append(alignmentFixes);
  const iconBurst = Boolean($(".ib-app"));
  const panel = iconBurst ? $(".ib-editor") : $(".control-panel, .impact-panel, .sequence-panel, .ink-panel, .prism-panel");
  const stage = iconBurst ? $("#ibStage") : $("main, .ink-stage, .prism-canvas-stage");
  if (!panel || !stage) return;

  body.classList.add("tc-workspace");
  body.dataset.morphPort ||= effectSlug;
  if (iconBurst) body.classList.add("ib-workspace");
  if (!iconBurst) body.classList.add("me-motion-editor");
  if (panel instanceof HTMLDetailsElement) panel.open = true;

  const titleSource = $("h1", panel) || $("summary b", panel) || $("b", panel);
  const enSource = $("h1 span", panel) || $("summary small", panel);
  const zhName = ((titleSource?.childNodes[0]?.textContent || titleSource?.textContent || document.title.split("|")[0] || "CellMotion").replace(/\s*[·•].*$/, "").trim());
  const inferredEnglishName = document.title.split("|")[0].replace(zhName, "").trim();
  const englishCandidate = (enSource?.textContent || "").replace(/\/.*/, "").replace("·", " ").trim();
  const englishTitles = { "split-flip": "Split Flip", zerogflip: "Zero-G Flip", currentwall: "Water Flow", verticalwall: "Vertical Rise", creatorstudio: "Creator Merge", focuswheel: "Focus Wheel", gradienttype: "Gradient Type", glyphrelay: "Glyph Relay", wordgather: "Word Gather", focusportal: "Focus Portal", rapidsequence: "Rapid Sequence", citystack: "City Stack", typegarden: "Type Garden", colorcanvas: "Color Canvas", scrapbin: "Scrap Bin", terminalbrand: "Terminal Brand", colorrecompose: "Color Recompose", mistlift: "Mist Lift", glyphreveal: "Glyph Reveal", phrasebuild: "Phrase Build", switchdrop: "Switch Drop", searchtyping: "Search Typing", beforeafter: "Before After", shutterafter: "Shutter After", textswell: "Text Swell", impactbuild: "Impact Build", ribbonink: "Ribbon Ink", construct: "Construct", crash: "Crash", snap: "Snap" };
  const enName = englishTitles[effectSlug] || (/^[\u3400-\u9fff\s·-]+$/.test(englishCandidate) || !englishCandidate ? inferredEnglishName : englishCandidate);

  const header = make("header", "gm-header tc-header",
    `<a class="tc-brand" href="cellmotion.html" aria-label="CellMotion 首页"><svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 24 15 16 25 6M6 24l17 2M15 16l10-10"/></g><circle cx="6" cy="24" r="4" fill="currentColor"/><circle cx="15" cy="16" r="4" fill="currentColor"/><circle cx="25" cy="6" r="4" fill="#9067f5"/><circle cx="23" cy="26" r="4" fill="currentColor"/></svg><span>CellMotion</span></a><div><small>让创意，自由生长</small><h1>${zhName}${enName ? ` <span>${enName}</span>` : ""}</h1></div>`);
  header.querySelector("h1")?.setAttribute("data-no-translate", "");
  header.querySelector(".tc-brand span")?.setAttribute("data-no-translate", "");
  const syncBrandLogo = () => {
    const dark = body.dataset.editorTheme === "dark" || (!body.dataset.editorTheme && document.documentElement.dataset.siteTheme === "dark");
    const color = dark ? "#f4f3f6" : "#17171b";
    body.dataset.editorPalette = dark ? "dark" : "light";
    const brand = header.querySelector(".tc-brand");
    brand?.style.setProperty("color", color, "important");
    brand?.style.setProperty("opacity", "1", "important");
    brand?.style.setProperty("text-decoration", "none", "important");
    brand?.querySelector("svg")?.style.setProperty("color", color, "important");
    brand?.querySelector("span")?.style.setProperty("color", color, "important");
    brand?.querySelector("span")?.style.setProperty("font", "700 18px/1 Arial, sans-serif", "important");
  };
  body.prepend(header);
  syncBrandLogo();
  new MutationObserver(syncBrandLogo).observe(document.documentElement, { attributes: true, attributeFilter: ["data-site-theme"] });
  new MutationObserver(syncBrandLogo).observe(body, { attributes: true, attributeFilter: ["data-editor-theme"] });
  header.append(make("a", "tc-back", "动效库"));
  header.lastChild.href = "cellmotion-components.html";
  const exportShortcut = make("button", "tc-export-shortcut", "导出作品");
  exportShortcut.type = "button";
  header.append(exportShortcut);

  const scroll = $(".panel-scroll, .ink-panel-scroll", panel) || panel;
  const sections = [...scroll.children].filter((node) => node.nodeType === 1 && node.tagName !== "HEADER" && !node.classList.contains("ib-editor-header"));

  const classify = (section) => {
    const ids = $$("[id]", section).map((el) => el.id).join(" ");
    if (section.matches(".half-section, .asset-section, .text-section, .content-section, .row-editor, .scene-editor")) return "content";
    const text = section.textContent || "";
    if (/exportPng|exportGif|exportMp4|exportVideo|ibExportPng/.test(ids) || section.classList.contains("export-panel") || section.classList.contains("ib-export-section")) return "export";
    if (section.classList.contains("ib-canvas-section") || (/exportPreset|canvasPreset|ibExportPreset/.test(ids) && /画板|尺寸|比例|canvas|导出尺寸/.test(text))) return "canvas";
    if (section.querySelector(".me-choreo-track, .me-choreo-bar, .ib-choreo-track, .flow-timeline, .swell-track, #choreoTrack, #choreoBar, #flowTimeline, #pathwriterChoreoBar, #deleteChoreoBar, #ibChoreoTrack")) return "timeline";
    if (section.querySelector("#saveScheme, #saveButton, #ibSaveScheme, .me-scheme-actions, .ib-scheme-row") || /方案/.test(section.querySelector(".section-label, .ib-kicker, p")?.textContent || "") && section.querySelector("button")) return "scheme";
    if (section.querySelector("textarea, #phrase, #copyText, #rowsInput, #phrasesInput, #pairList, #wordRows, #sceneAText, #ibText, #textInput, #fontSelect, .sa-pair-list, .half-section")) return "content";
    return "motion";
  };

  const buckets = { canvas: [], content: [], motion: [], timeline: [], scheme: [], export: [] };
  sections.forEach((section) => {
    section.classList.add("gm-card");
    const track = section.querySelector(".me-choreo-track, .me-choreo-bar, .ib-choreo-track, .flow-timeline, .swell-track, #choreoTrack, #choreoBar, #flowTimeline, #pathwriterChoreoBar, #deleteChoreoBar, #ibChoreoTrack");
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

  if (!iconBurst && buckets.content.length === 0) {
    const firstEditable = buckets.motion.findIndex((section) => section.querySelector("textarea, input:not([type='file']):not([type='hidden']), select, button"));
    if (firstEditable >= 0) buckets.content.push(buckets.motion.splice(firstEditable, 1)[0]);
  }

  const left = iconBurst
    ? make("aside", "tc-content ib-content-panel", '<div class="tc-panel-heading"><div><small>内容</small><h2>文字与画面</h2></div></div>')
    : make("aside", "tc-content", '<div class="tc-panel-heading"><div><small>内容</small><h2>文字段落 <span id="tcRowCount"></span></h2></div></div><p class="tc-hint">选择一段内容，在右侧编辑</p><div class="tc-row-list" id="tcRowList" aria-label="选择文字段落"></div>');
  left.setAttribute("aria-label", iconBurst ? "文字与画面" : "段落导航");
  const addButton = $("#addPairButton, #addRow, .add-pair-button");
  if (addButton && left) {
    addButton.setAttribute("aria-label", "添加文字段落");
    left.querySelector(".tc-panel-heading").append(addButton);
  }
  if (iconBurst) buckets.content.forEach((section) => left.append(section));
  buckets.scheme.forEach((section) => {
    section.classList.add("tc-scheme");
    left.append(section);
  });
  if (!buckets.scheme.length) {
    const scheme = make("section", "tc-scheme gm-card gm-scheme-fallback", '<strong class="gm-scheme-title">方案</strong><div class="gm-scheme-actions"><button type="button" data-scheme-save>保存方案</button><button type="button" data-scheme-import>导入方案</button><button type="button" data-scheme-restore>恢复默认</button><button type="button" data-scheme-clear>清理重做</button></div><input data-scheme-file type="file" accept="application/json,.json" hidden><small class="gm-scheme-status" aria-live="polite"></small>');
    left.append(scheme);
    const controls = [...panel.querySelectorAll("input:not([type='file']), textarea, select")];
    const getControlKey = (control, index) => control.id ? `#${control.id}` : control.name ? `[name="${control.name}"]` : `index:${index}`;
    const readScheme = () => ({
      format: "cellmotion-editor-scheme", version: 1, effect: effectSlug,
      controls: controls.map((control, index) => ({ key: getControlKey(control, index), type: control.type || control.tagName.toLowerCase(), value: control.type === "checkbox" || control.type === "radio" ? undefined : control.value, checked: control.type === "checkbox" || control.type === "radio" ? control.checked : undefined, selectedIndex: control instanceof HTMLSelectElement ? control.selectedIndex : undefined }))
    });
    const initialScheme = readScheme();
    const applyScheme = (schemeData) => {
      if (schemeData?.format !== "cellmotion-editor-scheme" || schemeData.effect !== effectSlug || !Array.isArray(schemeData.controls)) throw new Error("方案与当前动效不匹配");
      const current = new Map(controls.map((control, index) => [getControlKey(control, index), control]));
      schemeData.controls.forEach((item) => {
        const control = current.get(item.key);
        if (!control) return;
        if (control.type === "checkbox" || control.type === "radio") control.checked = Boolean(item.checked);
        else if (control instanceof HTMLSelectElement && Number.isInteger(item.selectedIndex)) control.selectedIndex = item.selectedIndex;
        else if (item.value !== undefined) control.value = String(item.value);
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
      });
    };
    const status = $(".gm-scheme-status", scheme);
    const importFile = $(`[data-scheme-file]`, scheme);
    $(`[data-scheme-save]`, scheme).addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(readScheme(), null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${effectSlug}-scheme.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1500);
      status.textContent = "方案已导出。上传媒体文件请在新方案中重新选择。";
    });
    $(`[data-scheme-import]`, scheme).addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      try { applyScheme(JSON.parse(await file.text())); status.textContent = "方案已导入。"; }
      catch (error) { status.textContent = error.message || "方案读取失败。"; }
      importFile.value = "";
    });
    $(`[data-scheme-restore]`, scheme).addEventListener("click", () => {
      try { applyScheme(initialScheme); status.textContent = "已恢复此页面初始默认方案。"; }
      catch (error) { status.textContent = error.message || "恢复失败。"; }
    });
    $(`[data-scheme-clear]`, scheme).addEventListener("click", () => {
      controls.forEach((control) => {
        if (control instanceof HTMLTextAreaElement || control instanceof HTMLInputElement && control.type === "text") {
          control.value = "";
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      status.textContent = "文字已清空，可从编辑区重新填写。";
    });
  }
  body.append(left);

  const inspector = make("aside", "gm-inspector");
  inspector.id = iconBurst ? "iconBurstInspector" : "glyphMorphInspector";
  inspector.setAttribute("aria-label", `${zhName}编辑器`);
  const tabs = make("nav", "tc-tabs", iconBurst
    ? '<button type="button" data-panel="global" aria-pressed="true">动效</button><button type="button" data-panel="assets" aria-pressed="false">图标</button><button type="button" data-panel="export" aria-pressed="false">导出</button>'
    : '<button type="button" data-panel="row" aria-pressed="true">当前段落</button><button type="button" data-panel="global" aria-pressed="false">动效设置</button><button type="button" data-panel="export" aria-pressed="false">导出</button>');
  tabs.setAttribute("aria-label", "属性分类");
  const rowPanel = make("section", "tc-properties", '<div class="tc-panel-heading"><div><small>当前编辑</small><h2 id="tcSelectedTitle">段落 01</h2></div></div>');
  rowPanel.dataset.panel = "row";
  if (!iconBurst) buckets.content.forEach((section) => rowPanel.append(section));
  const globalPanel = make("section", "tc-properties");
  globalPanel.dataset.panel = "global";
  globalPanel.hidden = !iconBurst;
  const assetPanel = iconBurst ? make("section", "tc-properties") : null;
  if (assetPanel) {
    assetPanel.dataset.panel = "assets";
    assetPanel.hidden = true;
  }
  buckets.motion.forEach((section) => {
    if (assetPanel && section.querySelector("#ibResourceTools")) assetPanel.append(section);
    else globalPanel.append(section);
  });
  const exportPanel = make("section", "tc-properties");
  exportPanel.dataset.panel = "export";
  exportPanel.hidden = true;
  buckets.export.forEach((section) => exportPanel.append(section));
  inspector.append(tabs);
  if (!iconBurst) inspector.append(rowPanel);
  inspector.append(globalPanel);
  if (assetPanel) inspector.append(assetPanel);
  inspector.append(exportPanel);
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
  const hasNativeTimeline = Boolean(buckets.timeline.length);
  if (!iconBurst && !hasNativeTimeline) {
    const genericTimeline = make("section", "gm-card gm-loop-timeline");
    genericTimeline.setAttribute("aria-label", "完整动效循环时间轴");
    genericTimeline.hidden = true;
    genericTimeline.innerHTML = '<div class="gm-loop-timeline-head"><strong data-loop-title>完整动效循环</strong><output data-loop-duration>—</output></div><div class="me-choreo-scroll"><div class="gm-loop-track"><div class="me-choreo-ruler" data-loop-ruler></div><div class="me-choreo-bar" data-loop-bar><i class="me-choreo-playhead" data-loop-playhead></i></div></div></div>';
    timeline.append(genericTimeline);
    let loopDuration = 0;
    let phaseSignature = "";
    const syncLoopTimeline = () => {
      const canvas = $("canvas", stage) || $("canvas");
      let provider = null;
      try { provider = window.cellmotionTimelineProvider?.() || null; } catch (_) { provider = null; }
      const phases = Array.isArray(provider?.phases) ? provider.phases.filter((phase) => Number(phase.duration) > 0) : [];
      const durationLabel = $("#cycleDurationOut")?.textContent || "";
      const durationFromLabel = Number.parseFloat(durationLabel.replace(",", "."));
      const providerDuration = Number(provider?.duration) || phases.reduce((maximum, phase) => Math.max(maximum, Number(phase.start || 0) + Number(phase.duration)), 0);
      const duration = Number(providerDuration || canvas?.dataset.cycleDuration || canvas?.dataset.duration || durationFromLabel || 0);
      if (duration > 0 && Number.isFinite(duration)) {
        genericTimeline.hidden = false;
        const ruler = $("[data-loop-ruler]", genericTimeline);
        const activePhases = phases.length ? phases : [{ label: { zh: "动效循环", en: "Animation cycle" }, duration, start: 0 }];
        let cursor = 0;
        activePhases.forEach((phase) => { phase.start = Number.isFinite(Number(phase.start)) ? Number(phase.start) : cursor; cursor = phase.start + Number(phase.duration); });
        const nextSignature = `${document.body.dataset.editorLanguage || "zh"}|${duration.toFixed(3)}|${activePhases.map((phase) => `${phase.label?.zh || phase.label}|${Number(phase.duration).toFixed(3)}`).join("|")}`;
        if (Math.abs(duration - loopDuration) > 0.02 || nextSignature !== phaseSignature) {
          loopDuration = duration;
          phaseSignature = nextSignature;
          $(".gm-loop-track", genericTimeline).style.width = `${Math.max(100, duration * 80)}px`;
          const stride = Math.max(1, Math.ceil(duration / 30));
          const tickTimes = new Set();
          for (let second = 0; second < duration; second += stride) tickTimes.add(second);
          tickTimes.add(duration);
          ruler.replaceChildren(...[...tickTimes].map((second) => {
            const tick = document.createElement("span");
            tick.className = "is-major";
            tick.textContent = `${Number(second.toFixed(2))}s`;
            tick.style.left = `${second / duration * 100}%`;
            return tick;
          }));
          const bar = $("[data-loop-bar]", genericTimeline);
          const playhead = $("[data-loop-playhead]", genericTimeline);
          bar.replaceChildren(...activePhases.map((phase, index) => {
            const block = document.createElement("button");
            block.type = "button";
            block.className = `me-choreo-block is-phase-${(index % 6) + 1}`;
            block.style.flex = `${Number(phase.duration)} 1 0%`;
            block.style.minWidth = `${Math.min(76, Math.max(42, Number(phase.duration) * 48))}px`;
            const label = typeof phase.label === "object" ? (document.body.dataset.editorLanguage === "en" ? phase.label.en : phase.label.zh) : phase.label;
            const title = document.createElement("strong");
            title.textContent = label || (document.body.dataset.editorLanguage === "en" ? "Animation phase" : "动效阶段");
            const time = document.createElement("small");
            time.textContent = `${Number(phase.duration).toFixed(2)}s`;
            block.append(title, time);
            block.setAttribute("aria-label", `${title.textContent} · ${time.textContent} · ${phase.start.toFixed(2)}s`);
            block.addEventListener("click", () => {
              const current = window.cellmotionTimelineProvider?.();
              if (typeof current?.seek === "function") current.seek(phase.start);
            });
            return block;
          }));
          bar.append(playhead);
          $$ ("[data-loop-duration]", genericTimeline).forEach((output) => { output.textContent = `${duration.toFixed(2)}s`; });
        }
        const english = document.body.dataset.editorLanguage === "en";
        $("[data-loop-title]", genericTimeline).textContent = provider?.title?.[english ? "en" : "zh"] || (english ? "Full animation cycle" : "完整动效循环");
        const rawTime = provider?.time ?? canvas?.dataset.timelineTime;
        const playhead = $("[data-loop-playhead]", genericTimeline);
        if (rawTime !== undefined && Number.isFinite(Number(rawTime))) {
          const time = Number(rawTime);
          playhead.style.display = "block";
          playhead.style.left = `${((time % duration + duration) % duration) / duration * 100}%`;
        } else {
          playhead.style.display = "none";
        }
      }
      requestAnimationFrame(syncLoopTimeline);
    };
    requestAnimationFrame(syncLoopTimeline);
  }
  center.append(toolbar, stage, timeline);
  body.append(center);

  if (iconBurst) $(".ib-app")?.remove();
  else panel.remove();

  const setPanel = (name) => {
    [iconBurst ? null : rowPanel, globalPanel, assetPanel, exportPanel].filter(Boolean).forEach((section) => { section.hidden = section.dataset.panel !== name; });
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
      button.append(make("span", "tc-row-number", String(index + 1).padStart(2, "0")), make("strong", "tc-row-text", labelFor(item, index)), make("small", "tc-row-description", iconBurst ? "主标题" : "在右侧编辑"));
      return button;
    }));
  };
  rowList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    selected = Number(button.dataset.index);
    setPanel("row");
    syncRows();
  });
  if (listRoot) new MutationObserver(syncRows).observe(listRoot, { childList: true });
  if (!iconBurst) document.addEventListener("input", (event) => {
    if (event.target.closest("#pairList, #wordRows, textarea, input[type='text']")) syncRows();
  });
  addButton?.addEventListener("click", () => requestAnimationFrame(() => {
    selected = Math.max(0, collectItems().length - 1);
    syncRows();
  }));
  if (!iconBurst) syncRows();
  window.dispatchEvent(new Event("resize"));
})();
