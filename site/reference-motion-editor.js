(() => {
  "use strict";
  const effect = window.ReferenceMotionEffect;
  if (!effect) throw new Error("ReferenceMotionEffect is required");
  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const sizes = { square: [1080, 1080], portrait: [1080, 1350], photo: [1080, 1440], tall: [1080, 1620], vertical: [1080, 1920], wide: [1920, 1080], landscape: [1440, 1080], cinema: [1620, 1080] };
  const storageKey = `cellmotion-${effect.slug}-scheme-v1`;
  const defaults = clone(effect.defaults);
  let state = clone(defaults);
  if (!new URLSearchParams(location.search).has("from")) {
    try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (saved?.effect === effect.slug && saved?.version === 1) state = { ...clone(defaults), ...saved.state }; } catch (_) { /* Keep approved default. */ }
  }
  let current = 0, playing = true, lastFrame = 0, busy = false, lang = localStorage.getItem("cellmotion-lang") || "zh";
  const isLetterpulse = effect.slug === "letterpulse";
  const backdropStorageKey = "cellmotion-letterpulse-backdrop-v1";
  const defaultBackdrop = { followPage: false, color: "#e6e7ed" };
  let backdropSettings = { ...defaultBackdrop };
  if (isLetterpulse) {
    try {
      const storedBackdrop = JSON.parse(localStorage.getItem(backdropStorageKey));
      if (storedBackdrop && typeof storedBackdrop === "object") {
        backdropSettings = { followPage: Boolean(storedBackdrop.followPage), color: /^#[0-9a-f]{6}$/i.test(storedBackdrop.color) ? storedBackdrop.color : defaultBackdrop.color };
      }
    } catch (_) { /* Use the default stage background. */ }
  }
  const themeKey = isLetterpulse ? "cellmotion-letterpulse-theme" : "cellmotion-theme";
  let syncLetterpulseLogo = () => {};
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === "light" || (isLetterpulse && savedTheme !== "dark")) document.body.classList.add("light");
  const tr = (zh, en) => lang === "en" ? (en || zh) : zh;
  const fieldDefinitions = [...(effect.contentFields || []), ...(effect.motionFields || [])];
  const option = (value, text) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`;
  function field(def) {
    const value = state[def.key] ?? def.default ?? "";
    const label = escapeHtml(tr(def.label, def.en));
    const id = `rm-${def.key}`;
    const output = def.type === "range" ? `<output id="${id}-out">${escapeHtml(value)}${def.unit || ""}</output>` : "";
    let control;
    if (def.type === "textarea") control = `<textarea id="${id}" data-key="${def.key}" rows="2">${escapeHtml(value)}</textarea>`;
    else if (def.type === "select" || def.type === "font") control = `<select id="${id}" data-key="${def.key}">${(def.options || []).map((item) => option(item[0], tr(item[1], item[2]))).join("")}</select>`;
    else if (def.type === "checkbox") control = `<input id="${id}" data-key="${def.key}" type="checkbox" ${value ? "checked" : ""}>`;
    else control = `<input id="${id}" data-key="${def.key}" type="${def.type || "text"}" value="${escapeHtml(value)}" ${def.min != null ? `min="${def.min}"` : ""} ${def.max != null ? `max="${def.max}"` : ""} ${def.step != null ? `step="${def.step}"` : ""}>`;
    return `<label class="rm-field ${def.type === "checkbox" ? "rm-check" : ""}" for="${id}"><span>${label}${output}</span>${control}</label>`;
  }
  function renderList() {
    if (!effect.list) return "";
    const rows = (state.items || []).map((item, index) => `<div class="rm-list-row" data-id="${escapeHtml(item.id)}"><div class="rm-row-head"><strong>${escapeHtml(tr(effect.list.label, effect.list.en))} ${index + 1}</strong><div class="rm-row-actions"><button type="button" data-row-action="up" title="上移">↑</button><button type="button" data-row-action="down" title="下移">↓</button><button type="button" data-row-action="remove" title="删除">×</button></div></div><label class="rm-field"><span>${tr("文字", "Text")}</span><input data-row-field="text" type="text" value="${escapeHtml(item.text)}"></label><div class="rm-inline"><label class="rm-field"><span>${tr("字号层级", "Size rank")}</span><input data-row-field="rank" type="range" min="0.4" max="2.2" step="0.01" value="${item.rank}"></label><label class="rm-field"><span>${tr("微文案", "Caption")}</span><input data-row-field="caption" type="text" value="${escapeHtml(item.caption || "")}"></label></div></div>`).join("");
    return `<div class="rm-card"><h3>${tr(effect.list.title, effect.list.titleEn)}</h3><p>${tr(effect.list.hint, effect.list.hintEn)}</p><div id="rm-list">${rows}</div><button id="rm-add-row" type="button" class="rm-action primary">＋ ${tr("添加词组", "Add group")}</button></div>`;
  }
  document.body.innerHTML = `<header class="rm-header"><a class="rm-back" href="gallery.html" aria-label="Back">←</a><div class="rm-logo">CELL<b>MOTION</b></div><div class="rm-title"><strong>${escapeHtml(tr(effect.title, effect.titleEn))}</strong><small>${escapeHtml(tr(effect.subtitle, effect.subtitleEn))}</small></div><div class="rm-header-spacer"></div><button class="rm-lang" id="rm-lang" type="button">${lang === "zh" ? "EN" : "中"}</button><button class="rm-theme" id="rm-theme" type="button">${document.body.classList.contains("light") ? "◐" : "◑"}</button></header><div class="rm-layout"><aside class="rm-left"><span class="rm-eyebrow">01 / CONTENT</span><h2>${tr("内容", "Content")}</h2><div class="rm-nav"><a class="active" href="#rm-content"><span class="number">01</span>${tr("画面内容", "Composition")}</a><a href="#rm-scheme"><span class="number">02</span>${tr("方案", "Scheme")}</a></div><div id="rm-content" class="rm-section"><div class="rm-card"><h3>${tr("主要文字", "Main text")}</h3>${(effect.contentFields || []).map(field).join("")}</div>${renderList()}</div><div id="rm-scheme" class="rm-card"><h3>${tr("方案", "Scheme")}</h3><div class="rm-actions"><button id="rm-save" type="button">${tr("保存方案", "Save")}</button><button id="rm-import" type="button">${tr("导入方案", "Import")}</button><button id="rm-reset" type="button">${tr("恢复默认", "Restore")}</button><button id="rm-clear" type="button">${tr("清空重建", "Clear")}</button></div><input id="rm-import-file" class="rm-hide" type="file" accept="application/json,.json"><p class="rm-status" id="rm-scheme-status"></p></div></aside><main class="rm-center"><div class="rm-stage-top"><span>${tr("实时画布", "Live canvas")}</span><span id="rm-size-label"></span></div><div class="rm-stage-area" id="rm-stage-area"><div class="rm-frame" id="rm-frame"><canvas id="rm-canvas" aria-label="${escapeHtml(effect.title)}"></canvas></div></div><div class="rm-stage-controls me-stage-controls"><button id="rm-replay" type="button">↺ ${tr("重播", "Replay")}</button><button id="rm-play" type="button">Ⅱ ${tr("暂停", "Pause")}</button></div><div class="rm-timeline-card"><div class="rm-timeline-heading"><strong>${tr("编排时间线", "Choreography")}</strong><span id="rm-time-label">0.00 s</span></div><div id="rm-timeline" class="rm-timeline me-choreo-track"></div><div id="rm-timeline-legend" class="rm-timeline-legend me-choreo-legend"></div></div></main><aside class="rm-right"><div class="rm-tabs" role="tablist"><button type="button" data-tab="motion" aria-selected="true">${tr("动效设置", "Motion")}</button><button type="button" data-tab="export" aria-selected="false">${tr("导出", "Export")}</button></div><section id="rm-motion-panel" class="rm-tab-panel"><span class="rm-eyebrow">02 / MOTION</span><div class="rm-card"><h3>${tr("画布尺寸", "Canvas size")}</h3><label class="rm-field"><span>${tr("比例与尺寸", "Aspect and size")}</span><select id="rm-preset">${[["square",tr("1:1 方形 · 1080 × 1080","1:1 Square · 1080 × 1080")],["portrait",tr("4:5 竖版 · 1080 × 1350","4:5 Portrait · 1080 × 1350")],["photo",tr("3:4 竖版 · 1080 × 1440","3:4 Portrait · 1080 × 1440")],["tall",tr("2:3 竖版 · 1080 × 1620","2:3 Portrait · 1080 × 1620")],["vertical",tr("9:16 全屏 · 1080 × 1920","9:16 Full screen · 1080 × 1920")],["wide",tr("16:9 横版 · 1920 × 1080","16:9 Landscape · 1920 × 1080")],["landscape",tr("4:3 横版 · 1440 × 1080","4:3 Landscape · 1440 × 1080")],["cinema",tr("3:2 横版 · 1620 × 1080","3:2 Landscape · 1620 × 1080")],["custom",tr("自定义","Custom")]].map(([v,l])=>option(v,l)).join("")}</select></label><div id="rm-custom-size" class="rm-inline"><label class="rm-field"><span>${tr("宽", "Width")}</span><input id="rm-width" type="number" min="240" max="3840" step="2"></label><label class="rm-field"><span>${tr("高", "Height")}</span><input id="rm-height" type="number" min="240" max="3840" step="2"></label></div></div><div class="rm-card"><h3>${tr("文字与色彩", "Type and color")}</h3><label class="rm-field"><span>${tr("字体", "Font")}</span><select id="rm-font" data-key="font"></select></label><div class="rm-inline"><label class="rm-field"><span>${tr("文字", "Text")}</span><input id="rm-text-color" data-key="textColor" type="color"></label><label class="rm-field"><span>${tr("背景", "Background")}</span><input id="rm-bg-color" data-key="backgroundColor" type="color"></label></div></div><div class="rm-card"><h3>${tr("运动节奏", "Motion rhythm")}</h3>${(effect.motionFields || []).map(field).join("")}</div></section><section id="rm-export-panel" class="rm-tab-panel" hidden><span class="rm-eyebrow">03 / EXPORT</span><div class="rm-card"><h3>${tr("导出当前画布", "Export canvas")}</h3><label class="rm-field"><span>${tr("时长", "Duration")}</span><select id="rm-duration"><option value="cycle">${tr("完整一轮", "Full cycle")}</option><option value="1">1 s</option><option value="3">3 s</option><option value="5">5 s</option><option value="custom">${tr("自定义", "Custom")}</option></select></label><label class="rm-field" id="rm-duration-custom-wrap" hidden><span>${tr("秒数", "Seconds")}</span><input id="rm-duration-custom" type="number" min="0.5" max="30" step="0.1" value="4"></label><label class="rm-field"><span>${tr("帧率", "Frame rate")}</span><select id="rm-fps"><option>15</option><option>24</option><option selected>30</option><option>60</option></select></label><div class="rm-export-actions"><button id="rm-png" type="button">PNG</button><button id="rm-gif" type="button">GIF</button><button id="rm-mp4" type="button">MP4</button></div><div class="rm-progress"><i id="rm-progress-bar"></i></div><p id="rm-export-status" class="rm-status">${tr("预览与导出使用同一时间轴。", "Preview and export share one timeline.")}</p></div></section></aside></div>`;
  if (isLetterpulse) {
    document.body.classList.add("rm-letterpulse");
    if (new URLSearchParams(location.search).get("embed") === "1") document.body.classList.add("rm-embed");
    const header = $(".rm-header");
    $(".rm-back").remove();
    $(".rm-logo").innerHTML = '<img src="assets/cellmotion/logo-original-transparent.png?v=20260926-2" alt="CellMotion">';
    syncLetterpulseLogo = () => { $(".rm-logo img").src = "assets/cellmotion/logo-original-transparent.png?v=20260926-3"; };
    syncLetterpulseLogo();
    $(".rm-title small").remove();
    header.insertBefore(Object.assign(document.createElement("a"), { className: "rm-gallery-link", href: "gallery.html", textContent: tr("动效库", "Effects") }), $(".rm-header-spacer"));
    $("#rm-lang").insertAdjacentHTML("beforebegin", `<button id="rm-export-shortcut" class="rm-export-shortcut" type="button">${tr("导出作品", "Export")}</button>`);
    $(".rm-left > .rm-eyebrow").remove();
    $(".rm-left > h2").textContent = tr("内容", "Content");
    $(".rm-nav").remove();
    const wordField = $("#rm-word").closest(".rm-field");
    $("#rm-content .rm-card").innerHTML = `<h3>${tr("文字段落", "Text segments")} <span>1</span></h3><button id="rm-word-row" class="rm-word-row" type="button" aria-current="true"><small>01</small><strong id="rm-word-preview">${escapeHtml(state.word || tr("空白文字", "Empty text"))}</strong><em>${tr("单段动效 · 5 个节拍", "One segment · five beats")}</em></button><p class="rm-content-hint">${tr("选择段落，在右侧编辑。", "Select the segment to edit it on the right.")}</p>`;
    const motionPanel = $("#rm-motion-panel");
    const cards = [...motionPanel.querySelectorAll(":scope > .rm-card")];
    cards[0].classList.add("rm-canvas-card");
    $(".rm-stage-top").append(cards[0]);
    $(".rm-stage-top > span:first-child").textContent = tr("画布预览", "Canvas preview");
    $(".rm-stage-top").insertAdjacentHTML("afterbegin", `<div class="rm-backdrop-control"><button id="rm-backdrop" class="rm-backdrop" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="rm-backdrop-menu">▧ ${tr("铺满背景", "Canvas background")}</button><div id="rm-backdrop-menu" class="rm-backdrop-menu" role="dialog" aria-label="${tr("画布背景设置", "Canvas background settings")}" hidden><label class="rm-backdrop-option"><span>${tr("跟随当前页背景", "Follow page background")}</span><input id="rm-backdrop-follow" type="checkbox"></label><label class="rm-backdrop-option"><span>${tr("独立画布背景", "Canvas background color")}</span><input id="rm-backdrop-color" type="color" value="#e6e7ed"></label><button id="rm-backdrop-reset" type="button">${tr("恢复默认灰色", "Restore default gray")}</button></div></div>`);
    const currentPanel = document.createElement("section");
    currentPanel.id = "rm-current-panel";
    currentPanel.className = "rm-tab-panel";
    currentPanel.innerHTML = `<span class="rm-eyebrow">${tr("当前编辑", "Now editing")}</span><h2>${tr("文字样式", "Typography")}</h2>`;
    motionPanel.before(currentPanel);
    currentPanel.append(cards[1]);
    cards[1].querySelector("h3").textContent = tr("字体与颜色", "Font and colors");
    cards[1].insertBefore(wordField, cards[1].querySelector(".rm-field"));
    const composition = document.createElement("div");
    composition.className = "rm-card rm-composition-card";
    composition.innerHTML = `<h3>${tr("大小与位置", "Size and position")}</h3>`;
    currentPanel.append(composition);
    ["size", "spacing", "positionY"].forEach((key) => composition.append($(`#rm-${key}`).closest(".rm-field")));
    cards[2].querySelector("h3").textContent = tr("动效节奏", "Motion rhythm");
    const durationSelect = $("#rm-duration");
    durationSelect.innerHTML = `<option value="cycle">${tr("完整循环", "Full cycle")}</option><option value="3">3 s</option><option value="5">5 s</option><option value="10">10 s</option><option value="custom">${tr("自定义", "Custom")}</option>`;
    const exportCard = $("#rm-export-panel .rm-card");
    const exportGrid = document.createElement("div");
    exportGrid.className = "rm-export-grid";
    exportCard.insertBefore(exportGrid, exportCard.querySelector(".rm-export-actions"));
    exportGrid.append($("#rm-duration").closest(".rm-field"), $("#rm-fps").closest(".rm-field"), $("#rm-duration-custom-wrap"));
    $(".rm-tabs").insertAdjacentHTML("afterbegin", `<button type="button" data-tab="current" aria-selected="true">${tr("当前文字", "Text")}</button>`);
    $("[data-tab=motion]").setAttribute("aria-selected", "false");
    motionPanel.hidden = true;
    $(".rm-timeline-heading strong").textContent = tr("时间线", "Timeline");
    $("#rm-timeline").insertAdjacentHTML("afterend", `<input id="rm-scrubber" type="range" min="0" max="1" step="0.001" value="0" aria-label="${tr("播放进度", "Playback position")}">`);
    $("#rm-timeline-legend").insertAdjacentHTML("afterend", `<details class="rm-phase-details" open><summary>${tr("阶段详情", "Phase details")} <span>${tr("名称与起止时间", "Names and time range")}</span></summary><div id="rm-phase-details-list" class="rm-phase-details-list"></div></details>`);
    $("#rm-timeline").insertAdjacentHTML("afterend", `<div class="rm-time-ruler" id="rm-time-ruler" aria-hidden="true"></div>`);
    document.querySelectorAll("input[type=range][data-key]").forEach((range) => {
      const number = document.createElement("input");
      number.type = "number";
      number.className = "rm-number";
      number.min = range.min;
      number.max = range.max;
      number.step = range.step;
      number.value = range.value;
      number.setAttribute("aria-label", `${range.closest(".rm-field").querySelector("span").firstChild.textContent.trim()}数值`);
      range.closest(".rm-field").querySelector("span").append(number);
      const commitNumber = (normalize = false) => {
        if (number.value.trim() === "" || !Number.isFinite(Number(number.value))) return;
        range.value = String(clamp(Number(number.value), Number(range.min), Number(range.max)));
        if (normalize) number.value = range.value;
        range.dispatchEvent(new Event("input", { bubbles: true }));
      };
      number.addEventListener("input", () => commitNumber());
      number.addEventListener("change", () => commitNumber(true));
    });
  }
  const canvas = $("#rm-canvas"), frame = $("#rm-frame"), stage = $("#rm-stage-area");
  const ctx = canvas.getContext("2d");
  const fontSelect = $("#rm-font");
  window.STGFontLibrary?.enhanceSelect(fontSelect);
  let syncFontPicker = () => {};
  if (isLetterpulse) {
    const fontField = fontSelect.closest(".rm-field");
    fontField.classList.add("rm-native-font-field");
    fontSelect.setAttribute("aria-hidden", "true");
    fontSelect.tabIndex = -1;
    const picker = document.createElement("div");
    picker.className = "rm-font-picker";
    picker.innerHTML = `<button type="button" class="rm-font-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-label="${tr("字体", "Font")}"><span></span><i aria-hidden="true"></i></button>`;
    const menu = document.createElement("div");
    menu.className = "rm-font-menu";
    menu.id = "rm-font-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    let fontIndex = 0;
    [...fontSelect.children].forEach((group) => {
      if (group.tagName !== "OPTGROUP") return;
      const section = document.createElement("div");
      section.className = "rm-font-group";
      section.setAttribute("role", "group");
      section.setAttribute("aria-label", group.label);
      const title = document.createElement("div");
      title.className = "rm-font-group-title";
      title.textContent = group.label;
      section.append(title);
      [...group.children].forEach((option) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "rm-font-option";
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.dataset.index = String(fontIndex++);
        item.textContent = option.textContent;
        section.append(item);
      });
      menu.append(section);
    });
    fontField.insertAdjacentElement("afterend", picker);
    document.body.append(menu);
    const trigger = picker.querySelector(".rm-font-trigger");
    const options = () => [...menu.querySelectorAll(".rm-font-option")];
    const close = (restoreFocus = false) => { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); if (restoreFocus) trigger.focus(); };
    const position = () => {
      if (menu.hidden) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(rect.width, window.innerWidth - 24);
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${Math.min(380, window.innerHeight * .58)}px`;
      const height = menu.getBoundingClientRect().height;
      const below = window.innerHeight - rect.bottom;
      const top = below < Math.min(height, 300) && rect.top > height + 8 ? rect.top - height - 6 : rect.bottom + 6;
      menu.style.left = `${clamp(rect.left, 12, window.innerWidth - width - 12)}px`;
      menu.style.top = `${clamp(top, 8, window.innerHeight - Math.min(height, window.innerHeight - 16) - 8)}px`;
    };
    const setOpen = (open, focusCurrent = false) => {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        position();
        const currentOption = options().find((item) => item.dataset.value === fontSelect.value);
        options().forEach((item) => { const selected = item === currentOption; item.setAttribute("aria-selected", String(selected)); item.classList.toggle("selected", selected); });
        if (focusCurrent && currentOption) { currentOption.focus(); currentOption.scrollIntoView({ block: "nearest" }); }
        else menu.scrollTop = 0;
      }
    };
    syncFontPicker = () => {
      const selected = fontSelect.selectedOptions[0];
      trigger.querySelector("span").textContent = selected?.textContent || tr("选择字体", "Choose a font");
      options().forEach((item) => { const active = item.dataset.value === fontSelect.value; item.setAttribute("aria-selected", String(active)); item.classList.toggle("selected", active); });
    };
    trigger.setAttribute("aria-controls", menu.id);
    trigger.addEventListener("click", () => setOpen(menu.hidden));
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "Enter", " "].includes(event.key)) { event.preventDefault(); setOpen(true, true); }
    });
    menu.addEventListener("click", (event) => {
      const item = event.target.closest(".rm-font-option");
      if (!item) return;
      fontSelect.value = item.dataset.value;
      fontSelect.dispatchEvent(new Event("change", { bubbles: true }));
      syncFontPicker();
      close(true);
    });
    menu.addEventListener("keydown", (event) => {
      const items = options(), index = items.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); close(true); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : clamp(index + (event.key === "ArrowDown" ? 1 : -1), 0, items.length - 1);
        items[next]?.focus(); items[next]?.scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter") { event.preventDefault(); document.activeElement?.click(); }
    });
    document.addEventListener("pointerdown", (event) => { if (!picker.contains(event.target) && !menu.contains(event.target)) close(); });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", () => { if (!menu.hidden) position(); }, { capture: true, passive: true });
    fontSelect.addEventListener("change", syncFontPicker);
    syncFontPicker();
  }
  function dimensions() {
    if (state.sizePreset !== "custom") return sizes[state.sizePreset] || sizes.wide;
    return [clamp(Math.round(Number(state.width) || 1080), 240, 3840), clamp(Math.round(Number(state.height) || 1080), 240, 3840)];
  }
  function beats() { return effect.beats(state).filter((beat) => Number(beat.duration) > 0); }
  function cycle() { return beats().reduce((total, beat) => total + Number(beat.duration), 0) || 1; }
  function render(targetCtx, time, width, height) {
    targetCtx.setTransform(1, 0, 0, 1, 0, 0);
    targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
    const scaleX = targetCtx.canvas.width / width, scaleY = targetCtx.canvas.height / height;
    targetCtx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    effect.draw(targetCtx, ((time % cycle()) + cycle()) % cycle(), width, height, state);
  }
  function fit() {
    const [w,h] = dimensions();
    const bounds = stage.getBoundingClientRect();
    const factor = Math.min((bounds.width - 12) / w, (bounds.height - 12) / h);
    frame.style.width = `${Math.max(1,w*factor)}px`;
    frame.style.height = `${Math.max(1,h*factor)}px`;
    const previewScale = Math.min(1, 1200 / Math.max(w,h));
    canvas.width = Math.max(1,Math.round(w*previewScale));
    canvas.height = Math.max(1,Math.round(h*previewScale));
    $("#rm-size-label").textContent = `${w} × ${h}`;
    render(ctx, current, w, h);
  }
  function saveLocal() { try { localStorage.setItem(storageKey, JSON.stringify({ version:1,effect:effect.slug,state })); } catch (_) { $("#rm-scheme-status").textContent = tr("浏览器储存空间不足，可用保存方案下载 JSON。", "Local storage is full; use Save to download JSON."); } }
  let saveTimer;
  function changed(timing = false) { clearTimeout(saveTimer); saveTimer = setTimeout(saveLocal, 220); if (timing) drawTimeline(); fit(); }
  function sync() {
    document.querySelectorAll("[data-key]").forEach((input) => { const key = input.dataset.key; if (input.type === "checkbox") input.checked = !!state[key]; else input.value = state[key] ?? ""; });
    syncFontPicker();
    if (isLetterpulse) $("#rm-word-preview").textContent = state.word || tr("空白文字", "Empty text");
    $("#rm-preset").value = state.sizePreset || "wide";
    $("#rm-width").value = state.width || 1080; $("#rm-height").value = state.height || 1080;
    $("#rm-custom-size").hidden = state.sizePreset !== "custom";
    document.querySelectorAll("input[type=range][data-key]").forEach((input) => { const output = $(`#${input.id}-out`); if (output) output.textContent = `${input.value}${fieldDefinitions.find((d) => d.key === input.dataset.key)?.unit || ""}`; const number = input.closest(".rm-field")?.querySelector(".rm-number"); if (number) number.value = input.value; });
    if (effect.list) $("#rm-list").innerHTML = listRows();
    drawTimeline(); fit();
  }
  document.querySelectorAll("[data-key]").forEach((input) => input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", () => {
    const def = fieldDefinitions.find((field) => field.key === input.dataset.key);
    state[input.dataset.key] = input.type === "checkbox" ? input.checked : ["number","range"].includes(input.type) ? Number(input.value) : input.value;
    if (isLetterpulse && input.dataset.key === "word") $("#rm-word-preview").textContent = state.word || tr("空白文字", "Empty text");
    if (def?.type === "range") { const output = $(`#${input.id}-out`); if (output) output.textContent = `${input.value}${def.unit || ""}`; const number = input.closest(".rm-field")?.querySelector(".rm-number"); if (number && document.activeElement !== number) number.value = input.value; }
    if (isLetterpulse && def?.timing) {
      const timingKeys = ["hold", "pulse", "scatter", "rebuild", "rest"];
      const index = timingKeys.indexOf(def.key);
      if (index >= 0) { current = timingKeys.slice(0, index).reduce((sum, key) => sum + Number(state[key]), 0) + Math.min(.12, Number(state[def.key]) * .2); playing = false; updatePlay(); }
    }
    changed(def?.timing);
  }));
  $("#rm-preset").addEventListener("change", (event) => { state.sizePreset = event.target.value; $("#rm-custom-size").hidden = state.sizePreset !== "custom"; changed(); });
  [["rm-width","width"],["rm-height","height"]].forEach(([id,key]) => {const input=$("#"+id);input.addEventListener("input", (event) => { state[key] = clamp(Number(event.target.value)||240,240,3840); changed(); });input.addEventListener("change",()=>{input.value=state[key];});});
  if (effect.list) {
    $("#rm-add-row").addEventListener("click", () => { state.items.push({ id: crypto.randomUUID(), text: tr("新词组", "New group"), rank:1, caption:"" }); $("#rm-list").innerHTML = listRows(); changed(); });
    $("#rm-list").addEventListener("input", (event) => { const row = event.target.closest("[data-id]"); if (!row || !event.target.dataset.rowField) return; const item = state.items.find((part) => part.id === row.dataset.id); if (!item) return; item[event.target.dataset.rowField] = event.target.type === "range" ? Number(event.target.value) : event.target.value; changed(); });
    $("#rm-list").addEventListener("click", (event) => { const action = event.target.dataset.rowAction, row = event.target.closest("[data-id]"); if (!action || !row) return; const index = state.items.findIndex((part) => part.id === row.dataset.id); if (action === "remove" && state.items.length > 1) state.items.splice(index,1); if (action === "up" && index > 0) [state.items[index-1],state.items[index]] = [state.items[index],state.items[index-1]]; if (action === "down" && index < state.items.length-1) [state.items[index+1],state.items[index]] = [state.items[index],state.items[index+1]]; $("#rm-list").innerHTML = listRows(); changed(); });
  }
  function listRows() { const holder = document.createElement("div"); holder.innerHTML = renderList(); return $("#rm-list", holder)?.innerHTML || ""; }
  function drawTimeline() {
    const parts = beats(), total = cycle(); let cursor = 0;
    $("#rm-timeline").innerHTML = parts.map((part) => { const start = cursor; cursor += Number(part.duration); return `<button type="button" class="rm-beat me-choreo-block" data-seek="${start}" data-duration="${part.duration}" style="flex:${part.duration};background:${part.color}" aria-label="${escapeHtml(tr(part.label,part.en))} ${part.duration.toFixed(2)}s"><span class="rm-beat-full">${escapeHtml(tr(part.label,part.en))}</span>${part.short ? `<span class="rm-beat-short">${escapeHtml(tr(part.short,part.shortEn))}</span>` : ""}<small>${part.duration.toFixed(2)}s</small></button>`; }).join("") + `<i class="rm-playhead me-choreo-playhead" id="rm-playhead"></i>`;
    $("#rm-timeline-legend").innerHTML = parts.map((part) => `<span style="--fill:${part.color}">${escapeHtml(tr(part.label,part.en))}</span>`).join("");
    if (isLetterpulse) {
      const marks = [];
      for (let tick = 0; tick <= Math.ceil(total * 4); tick++) {
        const time = tick / 4;
        if (time > total + .001) break;
        const major = tick % 4 === 0;
        marks.push(`<span class="${major ? "major" : "minor"}" style="left:${time / total * 100}%"><i></i>${major ? `${time}s` : ""}</span>`);
      }
      if (Math.abs(total - Math.round(total)) > .45) marks.push(`<span class="end" style="left:100%"><i></i>${total.toFixed(2)}s</span>`);
      $("#rm-time-ruler").innerHTML = marks.join("");
    }
    if (isLetterpulse) {
      let start = 0;
      $("#rm-phase-details-list").innerHTML = parts.map((part, index) => {
        const end = start + Number(part.duration);
        const row = `<button class="rm-phase-detail" type="button" data-start="${start}" data-end="${end}" data-seek="${start}"><span class="rm-phase-index" style="--phase:${part.color}">${String(index + 1).padStart(2,"0")}</span><span class="rm-phase-name">${escapeHtml(tr(part.label,part.en))}</span><small>${start.toFixed(2)}–${end.toFixed(2)} s</small></button>`;
        start = end;
        return row;
      }).join("");
      $("#rm-phase-details-list").querySelectorAll("[data-seek]").forEach((button) => button.addEventListener("click", () => { current=Number(button.dataset.seek);playing=false;updatePlay();tickDisplay();fit(); }));
    }
    $("#rm-timeline").querySelectorAll("[data-seek]").forEach((button) => button.addEventListener("click", (event) => { const rect=button.getBoundingClientRect(),fraction=clamp((event.clientX-rect.left)/Math.max(1,rect.width),0,1);current=Number(button.dataset.seek)+Math.max(.015,fraction*Number(button.dataset.duration));playing=false;updatePlay();tickDisplay();fit(); }));
    tickDisplay();
  }
  function tickDisplay() {
    const total = cycle(), t = current % total;
    $("#rm-time-label").textContent = `${t.toFixed(2)} / ${total.toFixed(2)} s`;
    $("#rm-playhead").style.left = `${t/total*100}%`;
    if (isLetterpulse) { const scrubber = $("#rm-scrubber"); scrubber.max = String(total); if (document.activeElement !== scrubber) scrubber.value = String(t); scrubber.style.setProperty("--progress", `${t / total * 100}%`); }
    let elapsed = 0;
    $("#rm-timeline").querySelectorAll(".rm-beat").forEach((button,index) => { const duration = beats()[index]?.duration || 0; button.classList.toggle("active", t >= elapsed && t < elapsed+duration); elapsed += duration; });
    if (isLetterpulse) $("#rm-phase-details-list").querySelectorAll(".rm-phase-detail").forEach((button) => button.classList.toggle("active", t >= Number(button.dataset.start) && t < Number(button.dataset.end)));
  }
  function updatePlay() { $("#rm-play").textContent = playing ? `Ⅱ ${tr("暂停","Pause")}` : `▶ ${tr("播放","Play")}`; $("#rm-play").setAttribute("aria-pressed", String(!playing)); }
  $("#rm-play").addEventListener("click", () => { playing = !playing; lastFrame = performance.now(); updatePlay(); });
  $("#rm-replay").addEventListener("click", () => { current = 0; playing = true; lastFrame = performance.now(); updatePlay(); fit(); });
  function animate(now) { if (playing && lastFrame) current = (current + Math.min(.1,(now-lastFrame)/1000) * (Number(state.speed)||1)) % cycle(); lastFrame = now; const [w,h] = dimensions(); render(ctx,current,w,h); tickDisplay(); requestAnimationFrame(animate); }
  function selectTab(name) { document.querySelectorAll("[data-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === name))); document.querySelectorAll(".rm-tab-panel").forEach((panel) => { panel.hidden = panel.id !== `rm-${name}-panel`; }); }
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => selectTab(button.dataset.tab)));
  if (isLetterpulse) {
    $("#rm-word-row").addEventListener("click", () => { selectTab("current"); if (matchMedia("(max-width:800px)").matches) $(".rm-right").scrollIntoView({ block: "start", behavior: "smooth" }); $("#rm-word").focus(); });
    $("#rm-export-shortcut").addEventListener("click", () => selectTab("export"));
    const backdropControl = $(".rm-backdrop-control"), backdropButton = $("#rm-backdrop"), backdropMenu = $("#rm-backdrop-menu");
    const followPageInput = $("#rm-backdrop-follow"), backdropColorInput = $("#rm-backdrop-color"), backdropReset = $("#rm-backdrop-reset"), stageArea = $("#rm-stage-area");
    const syncBackdrop = (persist = true) => {
      followPageInput.checked = backdropSettings.followPage;
      backdropColorInput.value = backdropSettings.color;
      backdropColorInput.disabled = backdropSettings.followPage;
      backdropControl.classList.toggle("is-following-page", backdropSettings.followPage);
      stageArea.style.setProperty("--rm-stage-backdrop", backdropSettings.color);
      stageArea.classList.toggle("follows-page-background", backdropSettings.followPage);
      if (persist) localStorage.setItem(backdropStorageKey, JSON.stringify(backdropSettings));
    };
    const closeBackdropMenu = () => { backdropMenu.hidden = true; backdropButton.setAttribute("aria-expanded", "false"); };
    backdropButton.addEventListener("click", () => {
      backdropMenu.hidden = !backdropMenu.hidden;
      backdropButton.setAttribute("aria-expanded", String(!backdropMenu.hidden));
    });
    followPageInput.addEventListener("change", () => { backdropSettings.followPage = followPageInput.checked; syncBackdrop(); });
    backdropColorInput.addEventListener("input", () => { backdropSettings = { followPage: false, color: backdropColorInput.value }; syncBackdrop(); });
    backdropReset.addEventListener("click", () => { backdropSettings = { ...defaultBackdrop }; syncBackdrop(); });
    document.addEventListener("pointerdown", (event) => { if (!backdropControl.contains(event.target)) closeBackdropMenu(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !backdropMenu.hidden) { closeBackdropMenu(); backdropButton.focus(); } });
    syncBackdrop(false);
    $("#rm-scrubber").addEventListener("input", (event) => { current = Number(event.target.value); playing = false; updatePlay(); fit(); tickDisplay(); });
  }
  $("#rm-theme").addEventListener("click", () => { document.body.classList.toggle("light"); localStorage.setItem(themeKey, document.body.classList.contains("light") ? "light" : "dark"); $("#rm-theme").textContent = document.body.classList.contains("light") ? "◐" : "◑"; syncLetterpulseLogo(); });
  $("#rm-lang").addEventListener("click", () => { lang = lang === "zh" ? "en" : "zh"; localStorage.setItem("cellmotion-lang",lang); saveLocal(); location.reload(); });
  function download(blob,name) { const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href=url; link.download=name; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000); }
  $("#rm-save").addEventListener("click", () => { saveLocal(); download(new Blob([JSON.stringify({version:1,effect:effect.slug,state},null,2)],{type:"application/json"}),`${effect.slug}-scheme.json`); $("#rm-scheme-status").textContent=tr("方案已保存。","Scheme saved."); });
  $("#rm-import").addEventListener("click", () => $("#rm-import-file").click());
  $("#rm-import-file").addEventListener("change", async (event) => { try { const data=JSON.parse(await event.target.files[0].text()); if(data.effect!==effect.slug || data.version!==1) throw new Error(tr("方案类型或版本不匹配","Invalid scheme type or version")); state={...clone(defaults),...data.state}; sync(); saveLocal(); $("#rm-scheme-status").textContent=tr("方案已导入。","Scheme imported."); } catch(error) { $("#rm-scheme-status").textContent=error.message; } event.target.value=""; });
  $("#rm-reset").addEventListener("click", () => { state=clone(defaults); current=0; sync(); saveLocal(); $("#rm-scheme-status").textContent=tr("已恢复默认。","Default restored."); });
  $("#rm-clear").addEventListener("click", () => { state=clone(defaults); if(effect.list) state.items=[{id:crypto.randomUUID(),text:"",rank:1,caption:""}]; else state.word=""; current=0; sync(); saveLocal(); $("#rm-scheme-status").textContent=tr("内容已清空。","Content cleared."); });
  $("#rm-duration").addEventListener("change", () => { $("#rm-duration-custom-wrap").hidden = $("#rm-duration").value!=="custom"; });
  function exportDuration() { const choice=$("#rm-duration").value; return choice==="cycle"?cycle():clamp(Number(choice==="custom"?$("#rm-duration-custom").value:choice)||cycle(),.5,30); }
  function makeOutput() { const [w,h]=dimensions(), output=document.createElement("canvas"); output.width=Math.round(w/2)*2; output.height=Math.round(h/2)*2; return output; }
  function setBusy(value,message,progress=0) { busy=value; ["#rm-png","#rm-gif","#rm-mp4"].forEach((id)=>$(id).disabled=value); $("#rm-export-status").textContent=message; $("#rm-progress-bar").style.width=`${progress}%`; }
  $("#rm-png").addEventListener("click", () => { const output=makeOutput(); render(output.getContext("2d"),current,output.width,output.height); output.toBlob((blob)=>{ if(blob) download(blob,`${effect.slug}-${output.width}x${output.height}.png`); setBusy(false,tr("PNG 已生成","PNG ready"),100); },"image/png"); });
  $("#rm-gif").addEventListener("click", async () => { if(busy)return; if(!window.GIF){setBusy(false,tr("GIF 编码器未加载","GIF encoder unavailable"));return;} const output=makeOutput(), fps=Number($("#rm-fps").value), duration=exportDuration(), total=Math.ceil(duration*fps); setBusy(true,tr("正在准备 GIF","Preparing GIF")); try { const response=await fetch("js/continuation-gif.worker.js"); if(!response.ok)throw new Error(`GIF worker ${response.status}`); const worker=URL.createObjectURL(new Blob([await response.text()],{type:"text/javascript"})); const gif=new GIF({workers:2,quality:10,width:output.width,height:output.height,workerScript:worker}); for(let i=0;i<total;i++){render(output.getContext("2d"),i/fps,output.width,output.height);gif.addFrame(output,{copy:true,delay:1000/fps});if(i%5===0){setBusy(true,`${tr("准备 GIF","Preparing GIF")} ${i+1}/${total}`,i/total*60);await new Promise((resolve)=>setTimeout(resolve,0));}}gif.on("progress",(progress)=>setBusy(true,`${tr("编码 GIF","Encoding GIF")} ${Math.round(progress*100)}%`,60+progress*40));gif.on("finished",(blob)=>{download(blob,`${effect.slug}-${output.width}x${output.height}.gif`);URL.revokeObjectURL(worker);setBusy(false,tr("GIF 已生成","GIF ready"),100);});gif.render(); } catch(error) { console.error(error);setBusy(false,`GIF: ${error.message}`); } });
  $("#rm-mp4").addEventListener("click", async () => { if(busy)return; const output=makeOutput(), context=output.getContext("2d",{willReadFrequently:true}),fps=Number($("#rm-fps").value),duration=exportDuration(),total=Math.ceil(duration*fps);let encoder;setBusy(true,tr("正在加载 MP4 编码器","Loading MP4 encoder"));try{if(!window.HME?.createH264MP4Encoder)throw new Error("H.264 encoder unavailable");encoder=await window.HME.createH264MP4Encoder();encoder.outputFilename=`${effect.slug}-${output.width}x${output.height}.mp4`;encoder.width=output.width;encoder.height=output.height;encoder.frameRate=fps;encoder.kbps=Math.max(2500,Math.min(20000,Math.round(output.width*output.height*fps/8000)));encoder.groupOfPictures=Math.max(1,Math.round(fps/2));encoder.initialize();for(let i=0;i<total;i++){render(context,i/fps,output.width,output.height);encoder.addFrameRgba(context.getImageData(0,0,output.width,output.height).data);if(i%2===0){setBusy(true,`${tr("正在导出 MP4","Exporting MP4")} ${Math.round((i+1)/total*100)}%`,(i+1)/total*95);await new Promise((resolve)=>setTimeout(resolve,0));}}encoder.finalize();const bytes=encoder.FS.readFile(encoder.outputFilename);download(new Blob([bytes],{type:"video/mp4"}),encoder.outputFilename);setBusy(false,`${tr("MP4 已生成","MP4 ready")} · ${output.width}×${output.height}`,100);}catch(error){console.error(error);setBusy(false,`MP4: ${error.message}`);}finally{try{encoder?.delete();}catch(_){}} });
  sync();
  new ResizeObserver(fit).observe(stage);
  document.fonts?.ready.then(fit);
  requestAnimationFrame(animate);
  window.ReferenceMotionEditor = { get state(){return state;}, renderAt(time,target=canvas){const [w,h]=dimensions();render(target.getContext("2d"),time,w,h);}, seek(time){current=time;playing=false;updatePlay();fit();} };
  if (isLetterpulse) {
    const aiScheme = () => {
      const [width, height] = dimensions();
      const live = clone(state);
      return {
        canvas: { width, height, backgroundColor: live.backgroundColor },
        typography: { fontFamily: live.font, fontSize: live.size, tracking: live.spacing, positionY: live.positionY, color: live.textColor },
        motion: { hold: live.hold, relayDuration: live.pulse, shrinkDuration: live.scatter, rebuildDuration: live.rebuild, finalBounceDuration: live.rest, peak: live.peak, speed: live.speed, duration: cycle() },
        rows: [{ id: "letterpulse-main", text: live.word, fontFamily: live.font, textColor: live.textColor, backgroundColor: live.backgroundColor, hold: live.hold * 1000, icons: [] }],
        letterpulse: live
      };
    };
    window.CellMotionEffectBridge = { getScheme: aiScheme };
    if (document.body.classList.contains("rm-embed")) {
      const send = (type, detail = {}) => parent.postMessage({ type, ...detail }, location.origin);
      const setFromComposition = (composition) => {
        if (!composition?.letterpulse || typeof composition.letterpulse !== "object") return;
        state = { ...clone(defaults), ...clone(composition.letterpulse) };
        current = 0;
        playing = true;
        lastFrame = performance.now();
        sync();
        send("cellmotion:duration", { durationMs: cycle() * 1000 });
      };
      window.addEventListener("message", (event) => {
        if (event.origin !== location.origin || event.source !== parent) return;
        const message = event.data || {};
        if (message.type === "cellmotion:configure") setFromComposition(message.manifest?.composition);
        else if (message.type === "cellmotion:update") setFromComposition(message.composition);
        else if (message.type === "cellmotion:play") { playing = true; lastFrame = performance.now(); }
        else if (message.type === "cellmotion:pause") { playing = false; updatePlay(); }
        else if (message.type === "cellmotion:restart") { current = 0; playing = true; lastFrame = performance.now(); updatePlay(); fit(); }
        else if (message.type === "cellmotion:seek") { current = clamp(Number(message.seconds) || 0, 0, cycle()); playing = false; updatePlay(); fit(); tickDisplay(); }
      });
      send("cellmotion:ready", { durationMs: cycle() * 1000 });
    }
  }
})();
