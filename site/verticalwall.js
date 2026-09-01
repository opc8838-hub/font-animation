(() => {
  "use strict";

  const pageParams = new URLSearchParams(location.search);
  const PREVIEW = pageParams.has("preview");
  const FROM_GALLERY = pageParams.get("from") === "gallery";
  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const rowOverviewCanvas = $("#rowOverviewCanvas");
  const rowOverviewPanel = $("#rowOverviewPanel");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    rows: $("#rowsInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    lineGap: $("#lineGap"), assetScale: $("#assetScale"), introAssetGap: $("#introAssetGap"),
    rowCount: $("#rowCount"), wallScale: $("#wallScale"), itemGap: $("#itemGap"),
    wallFontSize: $("#wallFontSize"),
    wallTextGap: $("#wallTextGap"),
    finalFontSize: $("#finalFontSize"), finalAssetScale: $("#finalAssetScale"), finalTextGap: $("#finalTextGap"),
    background: $("#backgroundColor"), foreground: $("#textColor"),
    motionMode: $("#motionMode"), introWord: $("#introWord"), nextWord: $("#nextWord"),
    collapseDirection: $("#collapseDirection"), introDuration: $("#introDuration"),
    spreadDuration: $("#spreadDuration"), collapseDuration: $("#collapseDuration"),
    finalDuration: $("#finalDuration"), exitDuration: $("#exitDuration"),
    bounce: $("#bounce"), stagger: $("#stagger"),
    verticalDrift: $("#verticalDrift"), horizontalPhase: $("#horizontalPhase"), nextOpacity: $("#nextOpacity"),
    swapInterval: $("#swapInterval"), finalScanSpeed: $("#finalScanSpeed"), iconHoldDuration: $("#iconHoldDuration"),
    iconRotationDuration: $("#iconRotationDuration"), iconSlowMotionStart: $("#iconSlowMotionStart"),
    finalRestoreDuration: $("#finalRestoreDuration"), finalRestoreStep: $("#finalRestoreStep"),
    assetItemScale: $("#assetItemScale"),
    assetOffsetX: $("#assetOffsetX"), assetOffsetY: $("#assetOffsetY"),
    assetGapBefore: $("#assetGapBefore"), assetGapAfter: $("#assetGapAfter")
  };

  const fontPresets = {
    "snap-inter-medium": { family: "Continuation Inter Medium", weight: 500, style: "normal" },
    "snap-inter-black": { family: "Continuation Inter", weight: 900, style: "normal" },
    "snap-ibm-plex": { family: "Continuation IBM Plex Mono", weight: 700, style: "italic" },
    "snap-space-mono": { family: "Continuation Space Mono", weight: 700, style: "normal" },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 700, style: "normal" },
    "ff-space-grotesk": { family: "Continuation Space Grotesk", weight: 400, style: "normal" },
    "ff-martian-mono": { family: "Continuation Martian Mono", weight: 400, style: "normal" },
    "ff-oi": { family: "Continuation Oi", weight: 400, style: "normal" },
    "ff-barriecito": { family: "Continuation Barriecito", weight: 400, style: "normal" },
    "uncut-berlin": { family: "Continuation Berlin", weight: 400, style: "normal" },
    "uncut-berlin-bold": { family: "Continuation Berlin", weight: 700, style: "normal" },
    "fs-satoshi": { family: "Satoshi", weight: 500, style: "normal" },
    "fs-general-sans": { family: "General Sans", weight: 500, style: "normal" },
    "fs-clash-display": { family: "Clash Display", weight: 500, style: "normal" },
    "fs-cabinet": { family: "Cabinet Grotesk", weight: 700, style: "normal" },
    "cn-noto-regular": { family: "Continuation SC", weight: 400, style: "normal" },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900, style: "normal" }
  };

  const assets = new Map();
  const layoutCache = new Map();
  let uploadSerial = 0;
  let assetRevision = 0;
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let rafId = 0;
  let activeTokenInput = inputs.rows;
  let selectedAssetId = "music";
  let selectedFinalSlot = 0;
  let finalSlotMap = { 4: "animal01", 9: "animal08", 11: "cloud" };
  let finalSlotSettings = {};
  let rowAssetGaps = [];
  let rowAssetGapsAfter = [];
  let rowAssetScales = [];
  let rowAssetOffsetsX = [];
  let rowTextGaps = [];

  const svg = (body, background = "#ffffff") => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`
  )}`;

  const builtIns = [
    ["music", "音乐", svg('<g transform="translate(-7.5 -1)"><path d="M45 25v35.5c-2.8-1.3-6.4-1.5-9.6-.4-6.9 2.1-11.1 7.7-9.3 12.5 1.8 4.9 8.8 7.1 15.7 5 6.1-1.9 10.2-6.5 9.6-11V38l23-6v23.5c-2.8-1.3-6.4-1.5-9.6-.4-6.9 2.1-11.1 7.7-9.3 12.5 1.8 4.9 8.8 7.1 15.7 5 6.1-1.9 10.2-6.5 9.6-11V20z" fill="white"/></g>', "#fa264f")],
    ["play", "播放", svg('<circle cx="50" cy="50" r="35" fill="none" stroke="white" stroke-width="6"/><path d="M40 29 69 50 40 71z" fill="white"/>', "#111111")],
    ["cloud", "云", svg('<g transform="translate(-4.5 -1.5)"><circle cx="37" cy="53" r="16" fill="white"/><circle cx="52" cy="44" r="22" fill="white"/><circle cx="72" cy="53" r="16" fill="white"/><rect x="21" y="52" width="67" height="22" rx="11" fill="white"/></g>', "#1389ff")],
    ["watch", "手表", svg('<rect x="27" y="20" width="46" height="60" rx="16" fill="#111"/><rect x="34" y="28" width="32" height="44" rx="10" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8")]
  ];

  function addAsset(id, label, src, removable = false, metadata = {}) {
    const image = new Image();
    const asset = {
      id, label, src, image, ratio: 1, ready: false, removable,
      scale: 1, offsetX: 0, offsetY: 0, gapBefore: 0, gapAfter: 0,
      libraryId: metadata.libraryId || "", groupKey: metadata.groupKey || (removable ? "uploads" : "current"),
      kind: metadata.kind || "image", vectorType: metadata.vectorType || "", vectorStyle: metadata.vectorStyle || ""
    };
    image.onload = () => {
      asset.ratio = Math.max(.2, Math.min(5, image.naturalWidth / Math.max(1, image.naturalHeight)));
      asset.ready = true;
      assetRevision += 1;
      layoutCache.clear();
      renderRowOverview(currentTime());
    };
    image.src = src;
    assets.set(id, asset);
    assetRevision += 1;
    layoutCache.clear();
  }

  builtIns.forEach(([id, label, src]) => addAsset(id, label, src));
  window.TokenAssetTools.animalAssets().forEach(({ id, label, src }) => addAsset(id, label, src));

  function ensureSharedAssets() {
    Object.entries(window.STGIconLibrary?.groups || {}).forEach(([groupKey, items]) => items.forEach((item) => {
      const id = `shared-${item.libraryId}`;
      const metadata = {
        libraryId: item.libraryId, groupKey,
        kind: item.kind || "image", vectorType: item.vectorType || "", vectorStyle: item.vectorStyle || ""
      };
      if (!assets.has(id)) addAsset(id, item.name, item.url, false, metadata);
      else Object.assign(assets.get(id), metadata);
    }));
  }

  ensureSharedAssets();

  function parseRows() {
    const rows = inputs.rows.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return rows.length ? rows.slice(0, 24) : ["leveling up"];
  }

  function renderAssetGrid() {
    const grid = $("#assetGrid");
    grid.replaceChildren();
    const groupLabels = {
      current: "当前基础图标", flow: "流动图标", gifMotion: "GIF 动图",
      animals: "透明动物表情", bots: "Bot 动态表情", uploads: "我的上传"
    };
    const groupedAssets = new Map();
    assets.forEach((asset) => {
      const key = asset.groupKey || "current";
      if (!groupedAssets.has(key)) groupedAssets.set(key, []);
      groupedAssets.get(key).push(asset);
    });
    const createCard = (asset) => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.dataset.assetId = asset.id;
      card.classList.toggle("is-selected", asset.id === selectedAssetId);
      const insert = document.createElement("button");
      insert.type = "button";
      insert.className = "asset-insert me-asset-choice";
      insert.title = `选择并编辑 ${asset.label}`;
      const preview = document.createElement("img");
      preview.src = asset.src;
      preview.alt = "";
      preview.loading = "lazy";
      preview.decoding = "async";
      const label = document.createElement("span");
      label.textContent = asset.label;
      insert.append(preview, label);
      insert.addEventListener("click", () => {
        selectedAssetId = asset.id;
        syncAssetTuner();
        renderAssetGrid();
        renderSelectedAssets();
        renderFinalSlotEditor();
        $("#assetProcessStatus").textContent = `已选择“${asset.label}”。调整后点“插入到光标”才会添加。`;
      });
      card.append(insert);
      if (asset.removable) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "asset-remove";
        remove.textContent = "×";
        remove.title = `移除 ${asset.label}`;
        remove.addEventListener("click", () => removeAsset(asset.id));
        card.append(remove);
      }
      return card;
    };
    groupedAssets.forEach((items, groupKey) => {
      const group = document.createElement("details");
      group.className = "asset-library-group";
      group.dataset.group = groupKey;
      group.open = groupKey === "current" || groupKey === "uploads";
      const summary = document.createElement("summary");
      summary.innerHTML = `<strong></strong><span>${items.length} 个</span>`;
      summary.querySelector("strong").textContent = groupLabels[groupKey] || "其他素材";
      const itemsGrid = document.createElement("div");
      itemsGrid.className = "asset-grid";
      items.forEach((asset) => itemsGrid.append(createCard(asset)));
      group.append(summary, itemsGrid);
      grid.append(group);
    });
    renderFinalSlotAssetSelect();
  }

  function renderFinalSlotAssetSelect() {
    const select = $("#finalSlotAssetSelect");
    const labels = { current: "当前基础图标", flow: "流动图标", gifMotion: "GIF 动图", animals: "透明动物表情", bots: "Bot 动态表情", uploads: "我的上传" };
    const groups = new Map();
    assets.forEach((asset) => {
      const key = asset.groupKey || "current";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(asset);
    });
    select.replaceChildren();
    groups.forEach((items, key) => {
      const group = document.createElement("optgroup");
      group.label = labels[key] || "其他素材";
      items.forEach((asset) => {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = asset.label;
        group.append(option);
      });
      select.append(group);
    });
    if (assets.has(selectedAssetId)) select.value = selectedAssetId;
    const asset = assets.get(select.value) || assets.values().next().value;
    if (asset) $("#finalSlotAssetPreview").src = asset.src;
  }

  function finalCharacters() {
    return graphemes(inputs.nextWord.value.replace(/\r?\n/g, " ") || "leveling up");
  }

  function normalizedFinalSlotSetting(index) {
    const setting = finalSlotSettings[index] || {};
    const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    return {
      scale: Math.max(40, Math.min(240, Number(setting.scale) || 100)),
      gapBefore: Math.max(-40, Math.min(120, Number(setting.gapBefore) || 0)),
      gapAfter: Math.max(-40, Math.min(120, Number(setting.gapAfter) || 0)),
      offsetX: Math.max(-120, Math.min(120, Number(setting.offsetX) || 0)),
      offsetY: Math.max(-120, Math.min(120, Number(setting.offsetY) || 0)),
      rotation: Math.max(-360, Math.min(360, finiteOr(setting.rotation, 0)))
    };
  }

  function syncFinalSlotTuner() {
    const tuner = $("#finalSlotTuner");
    const mappedAsset = assets.get(finalSlotMap[selectedFinalSlot]);
    const controls = [["finalSlotScale", "finalSlotScaleOut", "scale", "%"], ["finalSlotGapBefore", "finalSlotGapBeforeOut", "gapBefore", ""],
      ["finalSlotGapAfter", "finalSlotGapAfterOut", "gapAfter", ""], ["finalSlotOffsetX", "finalSlotOffsetXOut", "offsetX", ""],
      ["finalSlotOffsetY", "finalSlotOffsetYOut", "offsetY", ""], ["finalSlotRotation", "finalSlotRotationOut", "rotation", "°"]];
    const setting = mappedAsset ? normalizedFinalSlotSetting(selectedFinalSlot) : { scale: 100, gapBefore: 0, gapAfter: 0, offsetX: 0, offsetY: 0, rotation: 0 };
    tuner.classList.toggle("is-disabled", !mappedAsset);
    $("#finalSlotTunerTitle").textContent = mappedAsset
      ? `第 ${selectedFinalSlot + 1} 个字 · ${finalCharacters()[selectedFinalSlot]} → ${mappedAsset.label}`
      : "收尾图标角度与排版";
    $("#finalSlotTunerState").textContent = mappedAsset
      ? "当前角度只影响这个字位；正数顺时针，负数逆时针。"
      : `第 ${selectedFinalSlot + 1} 个字“${finalCharacters()[selectedFinalSlot]}”还没有图标；请先添加，或点击上方带图标的字位。`;
    if (mappedAsset) finalSlotSettings[selectedFinalSlot] = setting;
    controls.forEach(([inputId, outputId, key, suffix]) => {
      const input = $("#" + inputId);
      const value = setting[key];
      input.disabled = !mappedAsset;
      input.value = String(value);
      $("#" + outputId).textContent = `${value}${suffix}`;
    });
  }

  function normalizeFinalSlotMap() {
    const characters = finalCharacters();
    Object.keys(finalSlotMap).forEach((index) => {
      const numericIndex = Number(index);
      if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= characters.length || /^\s$/.test(characters[numericIndex]) || !assets.has(finalSlotMap[index])) {
        delete finalSlotMap[index];
        delete finalSlotSettings[index];
      }
    });
    if (!characters.length) selectedFinalSlot = -1;
    else if (selectedFinalSlot < 0 || selectedFinalSlot >= characters.length || /^\s$/.test(characters[selectedFinalSlot])) selectedFinalSlot = characters.findIndex((character) => !/^\s$/.test(character));
  }

  function renderFinalSlotEditor() {
    normalizeFinalSlotMap();
    const characters = finalCharacters();
    const editor = $("#finalSlotEditor");
    editor.replaceChildren();
    characters.forEach((character, index) => {
      const button = document.createElement("button");
      const asset = assets.get(finalSlotMap[index]);
      button.type = "button";
      button.className = "final-slot";
      button.classList.toggle("is-selected", index === selectedFinalSlot);
      button.classList.toggle("is-mapped", Boolean(asset));
      button.classList.toggle("is-space", /^\s$/.test(character));
      button.disabled = /^\s$/.test(character);
      if (asset) {
        const image = document.createElement("img");
        image.src = asset.src;
        image.alt = asset.label;
        button.append(image);
        const angle = document.createElement("em");
        angle.className = "final-slot-angle";
        angle.textContent = `${normalizedFinalSlotSetting(index).rotation}°`;
        button.append(angle);
        button.title = `${asset.label} · 平面旋转 ${normalizedFinalSlotSetting(index).rotation}°`;
      } else {
        const glyph = document.createElement("span");
        glyph.textContent = /^\s$/.test(character) ? "·" : character;
        button.append(glyph);
      }
      const position = document.createElement("small");
      position.textContent = String(index + 1);
      button.append(position);
      button.addEventListener("click", () => {
        selectedFinalSlot = index;
        if (asset) selectedAssetId = asset.id;
        renderAssetGrid();
        renderFinalSlotEditor();
      });
      editor.append(button);
    });
    const character = characters[selectedFinalSlot];
    const mappedAsset = assets.get(finalSlotMap[selectedFinalSlot]);
    const selectedAsset = assets.get(selectedAssetId);
    if (!character) $("#finalSlotStatus").textContent = "请先输入收尾一行文字。";
    else if (mappedAsset) $("#finalSlotStatus").textContent = `第 ${selectedFinalSlot + 1} 个字“${character}”当前为 ${mappedAsset.label}。`;
    else $("#finalSlotStatus").textContent = `已选第 ${selectedFinalSlot + 1} 个字“${character}”；当前素材：${selectedAsset?.label || "无"}。`;
    $("#assignFinalAsset").disabled = !character || !selectedAsset;
    $("#removeFinalAsset").disabled = !mappedAsset;
    syncFinalSlotTuner();
  }

  function syncAssetTuner() {
    const asset = assets.get(selectedAssetId) || assets.values().next().value;
    if (!asset) return;
    selectedAssetId = asset.id;
    $("#selectedAssetName").textContent = asset.label;
    $("#selectedAssetPreview").src = asset.src;
    $("#currentAssetEditorName").textContent = asset.label;
    inputs.assetItemScale.value = String(Math.round(asset.scale * 100));
    inputs.assetOffsetX.value = String(Math.round(asset.offsetX));
    inputs.assetOffsetY.value = String(Math.round(asset.offsetY));
    inputs.assetGapBefore.value = String(Math.round(asset.gapBefore));
    inputs.assetGapAfter.value = String(Math.round(asset.gapAfter));
    $("#assetItemScaleOut").textContent = `${Math.round(asset.scale * 100)}%`;
    $("#assetOffsetXOut").textContent = `${Math.round(asset.offsetX)}%`;
    $("#assetOffsetYOut").textContent = `${Math.round(asset.offsetY)}%`;
    $("#assetGapBeforeOut").textContent = String(Math.round(asset.gapBefore));
    $("#assetGapAfterOut").textContent = String(Math.round(asset.gapAfter));
  }

  function updateSelectedAsset() {
    const asset = assets.get(selectedAssetId);
    if (!asset) return;
    asset.scale = Number(inputs.assetItemScale.value) / 100;
    asset.offsetX = Number(inputs.assetOffsetX.value);
    asset.offsetY = Number(inputs.assetOffsetY.value);
    asset.gapBefore = Number(inputs.assetGapBefore.value);
    asset.gapAfter = Number(inputs.assetGapAfter.value);
    assetRevision += 1;
    layoutCache.clear();
    syncAssetTuner();
  }

  function insertToken(id) {
    const textarea = activeTokenInput || inputs.rows;
    const token = `{{${id}}}`;
    const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
    const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : start;
    textarea.setRangeText(token, start, end, "end");
    textarea.focus();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setTokenTarget(field, focus = false) {
    activeTokenInput = field;
    document.querySelectorAll("[data-token-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tokenTarget === (field === inputs.introWord ? "intro" : "rows"));
    });
    $("#insertSelectedAsset").textContent = field === inputs.introWord ? "插入到开头光标" : "插入到主行光标";
    if (focus) field.focus();
  }

  function effectiveWallRows(rows = parseRows()) {
    const centerSource = Math.floor(rows.length / 2);
    const primaryLine = rows[centerSource];
    const openingLine = inputs.introWord.value.trim() || primaryLine;
    const hasInlineAsset = (line) => [...line.matchAll(/\{\{([^{}]+)\}\}/g)].some((match) => assets.has(match[1]));
    const carryOpeningAssets = inputs.motionMode.value === "choreography" && hasInlineAsset(openingLine) && !hasInlineAsset(primaryLine);
    return rows.map((line, index) => index === centerSource && carryOpeningAssets ? openingLine : line);
  }

  function firstRowAssetParts(line) {
    const match = /\{\{([^{}]+)\}\}/.exec(line);
    if (!match || !assets.has(match[1])) return { left: line, assetId: "", right: "" };
    return {
      left: line.slice(0, match.index),
      assetId: match[1],
      right: line.slice(match.index + match[0].length)
    };
  }

  function showWallEditPreview() {
    const timing = choreographyTiming();
    paused = true;
    setTime(Math.max(0, timing.spreadEnd - .001));
    syncPlaybackControls();
  }

  function updateVisibleRow(index, value) {
    const lines = inputs.rows.value.split(/\r?\n/);
    const visibleIndices = lines.map((line, rawIndex) => line.trim() ? rawIndex : -1).filter((rawIndex) => rawIndex >= 0);
    const rawIndex = visibleIndices[index] ?? lines.length;
    if (rawIndex === lines.length) lines.push(value);
    else lines[rawIndex] = value;
    inputs.rows.value = lines.join("\n");
    layoutCache.clear();
    renderSelectedAssets();
    renderRowOverview(currentTime());
    showWallEditPreview();
  }

  [inputs.rows, inputs.introWord].forEach((field) => {
    field.addEventListener("focus", () => { setTokenTarget(field); });
    field.addEventListener("input", renderSelectedAssets);
  });
  inputs.introWord.addEventListener("input", syncRowAssetGaps);

  document.querySelectorAll("[data-token-target]").forEach((button) => {
    button.addEventListener("click", () => setTokenTarget(button.dataset.tokenTarget === "intro" ? inputs.introWord : inputs.rows, true));
  });

  $("#chooseIntroAsset").addEventListener("click", () => {
    setTokenTarget(inputs.introWord, true);
    const library = document.querySelector(".asset-library-panel");
    library.open = true;
    library.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function usedAssetEntries() {
    const counts = new Map();
    const order = [];
    [inputs.rows.value, inputs.introWord.value].forEach((value) => {
      for (const match of value.matchAll(/\{\{([^{}]+)\}\}/g)) {
        if (!assets.has(match[1])) continue;
        if (!counts.has(match[1])) order.push(match[1]);
        counts.set(match[1], (counts.get(match[1]) || 0) + 1);
      }
    });
    Object.values(finalSlotMap).forEach((id) => {
      if (!assets.has(id)) return;
      if (!counts.has(id)) order.push(id);
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return order.map((id) => ({ asset: assets.get(id), count: counts.get(id) }));
  }

  function openAssetEditor(assetId) {
    if (!assets.has(assetId)) return;
    selectedAssetId = assetId;
    syncAssetTuner();
    renderSelectedAssets();
    const editorWidth = $("#controlPanel")?.getBoundingClientRect().width || 420;
    const drawer = $("#assetEditorDrawer");
    drawer.style.setProperty("--asset-drawer-left", `${editorWidth}px`);
    drawer.hidden = false;
  }

  function removeUsedAsset(assetId) {
    [inputs.rows, inputs.introWord].forEach((field) => {
      field.value = field.value.split(`{{${assetId}}}`).join("");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    Object.keys(finalSlotMap).forEach((index) => {
      if (finalSlotMap[index] === assetId) {
        delete finalSlotMap[index];
        delete finalSlotSettings[index];
      }
    });
    renderFinalSlotEditor();
    renderSelectedAssets();
  }

  function renderIntroAssets() {
    const ids = [...inputs.introWord.value.matchAll(/\{\{([^{}]+)\}\}/g)]
      .map((match) => match[1])
      .filter((id, index, all) => assets.has(id) && all.indexOf(id) === index);
    const list = $("#introAssetList");
    list.replaceChildren();
    $("#introAssetSummary").textContent = ids.length ? `${ids.length} 个 · 可单独编辑` : "尚未添加";
    if (!ids.length) {
      const empty = document.createElement("p");
      empty.className = "intro-asset-empty";
      empty.textContent = "选择素材后，可插入到开头文字的任意光标位置。";
      list.append(empty);
      return;
    }
    ids.forEach((id) => {
      const asset = assets.get(id);
      const item = document.createElement("article");
      item.className = "intro-asset-item";
      item.innerHTML = `<img alt=""><span></span><button class="edit-intro-asset" type="button">单独编辑</button><button class="remove-intro-asset" type="button" aria-label="只从开头移除">×</button>`;
      item.querySelector("img").src = asset.src;
      item.querySelector("span").textContent = asset.label;
      item.querySelector(".edit-intro-asset").addEventListener("click", () => openAssetEditor(id));
      item.querySelector(".remove-intro-asset").addEventListener("click", () => {
        inputs.introWord.value = inputs.introWord.value.split(`{{${id}}}`).join("");
        inputs.introWord.dispatchEvent(new Event("input", { bubbles: true }));
      });
      list.append(item);
    });
  }

  function renderSelectedAssets() {
    renderIntroAssets();
    const entries = usedAssetEntries();
    $("#selectedAssetCount").textContent = String(entries.length);
    const list = $("#selectedAssetList");
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "selected-asset-empty";
      empty.textContent = "文字内容里还没有图片或图标。请先选择素材，再点“插入到光标”。";
      list.append(empty);
      return;
    }
    entries.forEach(({ asset, count }) => {
      const row = document.createElement("article");
      row.className = "selected-asset-row";
      row.classList.toggle("is-active", asset.id === selectedAssetId);
      row.innerHTML = `<img alt=""><span><b></b><small></small></span><button class="edit-used-asset" type="button">单独编辑</button><button class="remove-used-asset" type="button" aria-label="从内容中移除">×</button>`;
      row.querySelector("img").src = asset.src;
      row.querySelector("b").textContent = asset.label;
      row.querySelector("small").textContent = `内容中使用 ${count} 次`;
      row.querySelector(".edit-used-asset").addEventListener("click", () => openAssetEditor(asset.id));
      row.querySelector(".remove-used-asset").addEventListener("click", () => removeUsedAsset(asset.id));
      list.append(row);
    });
  }

  function setAssetManager(expanded) {
    const manager = $("#assetManager");
    manager.classList.toggle("is-list-expanded", expanded);
    $("#toggleAssetManager").textContent = expanded ? "收起" : "展开已选";
    $("#toggleAssetManager").setAttribute("aria-expanded", String(expanded));
    document.body.classList.toggle("asset-manager-open", expanded);
    if (!expanded) $("#assetEditorDrawer").hidden = true;
  }

  $("#toggleAssetManager").addEventListener("click", () => setAssetManager(!$("#assetManager").classList.contains("is-list-expanded")));
  $("#closeAssetEditor").addEventListener("click", () => { $("#assetEditorDrawer").hidden = true; });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#assetEditorDrawer").hidden) $("#assetEditorDrawer").hidden = true;
    else if ($("#assetManager").classList.contains("is-list-expanded")) setAssetManager(false);
  });

  $("#insertSelectedAsset").addEventListener("click", () => {
    const asset = assets.get(selectedAssetId);
    if (!asset) return;
    insertToken(asset.id);
    $("#assetProcessStatus").textContent = `已把“${asset.label}”插入到${activeTokenInput === inputs.introWord ? "开头" : "主行"}光标位置。`;
  });

  $("#finalSlotAssetSelect").addEventListener("change", (event) => {
    if (!assets.has(event.currentTarget.value)) return;
    selectedAssetId = event.currentTarget.value;
    syncAssetTuner();
    renderAssetGrid();
    renderSelectedAssets();
    renderFinalSlotEditor();
  });
  $("#assignFinalAsset").addEventListener("click", () => {
    const characters = finalCharacters();
    if (!assets.has(selectedAssetId) || selectedFinalSlot < 0 || selectedFinalSlot >= characters.length || /^\s$/.test(characters[selectedFinalSlot])) return;
    finalSlotMap[selectedFinalSlot] = selectedAssetId;
    finalSlotSettings[selectedFinalSlot] = normalizedFinalSlotSetting(selectedFinalSlot);
    renderFinalSlotEditor();
    renderSelectedAssets();
  });
  $("#removeFinalAsset").addEventListener("click", () => {
    delete finalSlotMap[selectedFinalSlot];
    delete finalSlotSettings[selectedFinalSlot];
    renderFinalSlotEditor();
    renderSelectedAssets();
  });
  [["finalSlotScale", "scale", "finalSlotScaleOut", "%"], ["finalSlotGapBefore", "gapBefore", "finalSlotGapBeforeOut", ""],
    ["finalSlotGapAfter", "gapAfter", "finalSlotGapAfterOut", ""], ["finalSlotOffsetX", "offsetX", "finalSlotOffsetXOut", ""],
    ["finalSlotOffsetY", "offsetY", "finalSlotOffsetYOut", ""], ["finalSlotRotation", "rotation", "finalSlotRotationOut", "°"]].forEach(([inputId, key, outputId, suffix]) => {
    $("#" + inputId).addEventListener("input", (event) => {
      if (!finalSlotMap[selectedFinalSlot]) return;
      const setting = normalizedFinalSlotSetting(selectedFinalSlot);
      setting[key] = Number(event.currentTarget.value);
      finalSlotSettings[selectedFinalSlot] = setting;
      $("#" + outputId).textContent = `${event.currentTarget.value}${suffix}`;
      if (key === "rotation") renderFinalSlotEditor();
    });
  });
  inputs.nextWord.addEventListener("input", () => {
    inputs.nextWord.value = inputs.nextWord.value.replace(/\r?\n/g, " ");
    renderFinalSlotEditor();
    renderSelectedAssets();
  });

  function syncRowAssetGaps() {
    const rows = parseRows();
    const displayRows = effectiveWallRows(rows);
    const globalScale = Number($("#globalRowAssetScale").value) || 92;
    const globalOffsetX = Number($("#globalRowAssetOffsetX").value) || 0;
    rowAssetGaps = rows.map((_, index) => Number(rowAssetGaps[index]) || 0);
    rowAssetGapsAfter = rows.map((_, index) => Number.isFinite(Number(rowAssetGapsAfter[index])) ? Number(rowAssetGapsAfter[index]) : rowAssetGaps[index]);
    rowAssetScales = rows.map((_, index) => Number.isFinite(Number(rowAssetScales[index])) ? Number(rowAssetScales[index]) : globalScale);
    rowAssetOffsetsX = rows.map((_, index) => Number.isFinite(Number(rowAssetOffsetsX[index])) ? Number(rowAssetOffsetsX[index]) : globalOffsetX);
    rowTextGaps = rows.map((_, index) => Number.isFinite(Number(rowTextGaps[index])) ? Number(rowTextGaps[index]) : 0);
    $("#globalRowAssetScaleOut").textContent = `${globalScale}%`;
    $("#globalRowAssetOffsetXOut").textContent = `${globalOffsetX}px`;
    const list = $("#rowGapList");
    list.replaceChildren();
    displayRows.forEach((line, index) => {
      const item = document.createElement("div");
      item.className = "vertical-row-gap-item";
      item.setAttribute("aria-label", `编辑第 ${index + 1} 行图标排版`);
      item.innerHTML = `<span></span><div class="vertical-row-compose">
        <label><b>左侧文字</b><input data-part="left" type="text"></label>
        <label><b>这一行图标</b><select data-part="asset"></select></label>
        <label><b>右侧文字</b><input data-part="right" type="text"></label>
      </div><div class="vertical-row-controls">
        <label><b>左侧间距</b><input data-key="gap" type="range" min="-20" max="120" step="1"><output></output></label>
        <label><b>右侧间距</b><input data-key="gapAfter" type="range" min="-20" max="120" step="1"><output></output></label>
        <label><b>图标大小</b><input data-key="scale" type="range" min="35" max="220" step="1"><output></output></label>
        <label><b>图标左右位置</b><input data-key="offsetX" type="range" min="-120" max="120" step="1"><output></output></label>
        <label><b>整行左右字距</b><input data-key="textGap" type="range" min="-50" max="100" step="1"><output></output></label>
      </div>`;
      item.querySelector("span").textContent = `第 ${index + 1} 行 · ${line.replace(/\{\{[^{}]+\}\}/g, "[图标]")}`;
      const parts = firstRowAssetParts(line);
      const leftInput = item.querySelector('[data-part="left"]');
      const rightInput = item.querySelector('[data-part="right"]');
      const assetSelect = item.querySelector('[data-part="asset"]');
      leftInput.value = parts.left;
      rightInput.value = parts.right;
      assetSelect.append(new Option("无图标", ""));
      [...assets.values()].forEach((asset) => assetSelect.append(new Option(asset.label, asset.id)));
      assetSelect.value = parts.assetId;
      const updateComposition = () => {
        const assetToken = assetSelect.value ? `{{${assetSelect.value}}}` : "";
        const nextLine = `${leftInput.value}${assetToken}${rightInput.value}`;
        item.querySelector("span").textContent = `第 ${index + 1} 行 · ${nextLine.replace(/\{\{[^{}]+\}\}/g, "[图标]")}`;
        updateVisibleRow(index, nextLine);
      };
      leftInput.addEventListener("input", updateComposition);
      rightInput.addEventListener("input", updateComposition);
      assetSelect.addEventListener("change", updateComposition);
      const controls = {
        gap: { values: rowAssetGaps, suffix: "px" },
        gapAfter: { values: rowAssetGapsAfter, suffix: "px" },
        scale: { values: rowAssetScales, suffix: "%" },
        offsetX: { values: rowAssetOffsetsX, suffix: "px" },
        textGap: { values: rowTextGaps, suffix: "px" }
      };
      item.querySelectorAll(".vertical-row-controls input").forEach((slider) => {
        const control = controls[slider.dataset.key];
        const output = slider.parentElement.querySelector("output");
        slider.value = String(control.values[index]);
        output.textContent = `${control.values[index]}${control.suffix}`;
        slider.addEventListener("input", () => {
          control.values[index] = Number(slider.value);
          output.textContent = `${slider.value}${control.suffix}`;
          layoutCache.clear();
          renderRowOverview(currentTime());
          showWallEditPreview();
        });
      });
      list.append(item);
    });
    $("#rowSettingsCount").textContent = `${rows.length} 行 · 图标与整行左右字距独立微调`;
    renderRowOverview(currentTime());
  }

  function applyGlobalRowControl(key, value) {
    const count = parseRows().length;
    if (key === "scale") rowAssetScales = Array(count).fill(value);
    else rowAssetOffsetsX = Array(count).fill(value);
    layoutCache.clear();
    syncRowAssetGaps();
    showWallEditPreview();
  }

  $("#globalRowAssetScale").addEventListener("input", (event) => applyGlobalRowControl("scale", Number(event.currentTarget.value)));
  $("#globalRowAssetOffsetX").addEventListener("input", (event) => applyGlobalRowControl("offsetX", Number(event.currentTarget.value)));

  function removeAsset(id) {
    const asset = assets.get(id);
    if (!asset?.removable) return;
    assets.delete(id);
    if (selectedAssetId === id) selectedAssetId = "music";
    assetRevision += 1;
    layoutCache.clear();
    [inputs.rows, inputs.introWord].forEach((field) => {
      field.value = field.value.split(`{{${id}}}`).join("");
    });
    Object.keys(finalSlotMap).forEach((index) => {
      if (finalSlotMap[index] === id) delete finalSlotMap[index];
    });
    renderAssetGrid();
    renderFinalSlotEditor();
    renderSelectedAssets();
    syncAssetTuner();
  }

  $("#assetUpload").addEventListener("change", async (event) => {
    const files = [...event.currentTarget.files].filter((file) => file.type.startsWith("image/"));
    for (const file of files) {
      const id = `img${++uploadSerial}`;
      $("#assetProcessStatus").textContent = `正在处理 ${file.name}…`;
      try {
        const result = await window.TokenAssetTools.processFile(file, { removeBackground: $("#assetRemoveBackground").checked });
        addAsset(id, file.name.replace(/\.[^.]+$/, "").slice(0, 12) || id, result.src, true);
        selectedAssetId = id;
        renderAssetGrid();
        syncAssetTuner();
        renderSelectedAssets();
        syncRowAssetGaps();
        $("#assetProcessStatus").textContent = `${file.name} · ${result.status} · 已选中但尚未插入，可先单独编辑。`;
      } catch (error) {
        $("#assetProcessStatus").textContent = `${file.name} 处理失败，请换用 PNG、JPG、WebP、SVG 或 GIF。`;
      }
    }
    event.currentTarget.value = "";
  });

  function tokensFor(line) {
    const tokens = [];
    const expression = /\{\{([^{}]+)\}\}/g;
    let cursor = 0;
    let match;
    while ((match = expression.exec(line))) {
      if (match.index > cursor) tokens.push({ type: "text", value: line.slice(cursor, match.index) });
      tokens.push({ type: "asset", id: match[1] });
      cursor = match.index + match[0].length;
    }
    if (cursor < line.length) tokens.push({ type: "text", value: line.slice(cursor) });
    return tokens.length ? tokens : [{ type: "text", value: "everything" }];
  }

  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const smooth = (value) => {
    const x = clamp01(value);
    return x * x * (3 - 2 * x);
  };
  const smoother = (value) => {
    const x = clamp01(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const rangeProgress = (value, from, to) => clamp01((value - from) / (to - from));
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);

  function layoutTokens(context, line, fontPx, assetHeight, textGap, assetGap = textGap, useAssetTuning = true) {
    const cacheKey = [line, context.font, fontPx.toFixed(3), assetHeight.toFixed(3), textGap.toFixed(3), assetGap.toFixed(3), useAssetTuning, assetRevision].join("|");
    const cached = layoutCache.get(cacheKey);
    if (cached) return cached;
    const items = tokensFor(line).flatMap((token) => {
      if (token.type === "text") return graphemes(token.value).map((value) => ({ type: "text", value, width: context.measureText(value).width }));
      const asset = assets.get(token.id);
      const tunedHeight = assetHeight * (useAssetTuning ? (asset?.scale || 1) : 1);
      return [{ ...token, asset, width: tunedHeight * (asset?.ratio || 1), height: tunedHeight }];
    });
    const gaps = items.slice(0, -1).map((item, index) => {
      const next = items[index + 1];
      if (item.type !== "asset" && next?.type !== "asset") return textGap;
      const tunedBefore = useAssetTuning && next?.type === "asset" ? (next.asset?.gapBefore || 0) * fontPx / 100 : 0;
      const tunedAfter = useAssetTuning && item.type === "asset" ? (item.asset?.gapAfter || 0) * fontPx / 100 : 0;
      return assetGap + tunedBefore + tunedAfter;
    });
    const layout = {
      items, gaps, textGap, assetGap,
      width: Math.max(fontPx, items.reduce((sum, item) => sum + item.width, 0) + gaps.reduce((sum, gap) => sum + gap, 0))
    };
    if (layoutCache.size > 240) layoutCache.clear();
    layoutCache.set(cacheKey, layout);
    return layout;
  }

  function layoutRowSegments(context, line, fontPx, assetHeight, textGap, gapBefore, gapAfter, frameWidth = 0) {
    const parts = firstRowAssetParts(line);
    const asset = assets.get(parts.assetId);
    if (!asset) return null;
    const left = parts.left ? layoutTokens(context, parts.left, fontPx, assetHeight, textGap, textGap, false) : null;
    const right = parts.right ? layoutTokens(context, parts.right, fontPx, assetHeight, textGap, textGap, false) : null;
    const iconWidth = assetHeight * (asset.ratio || 1);
    const leftWidth = left?.width || 0;
    const naturalWidth = leftWidth + gapBefore + iconWidth + gapAfter + (right?.width || 0);
    const width = frameWidth > 0 ? frameWidth : naturalWidth;
    const rightX = right ? width - right.width : width;
    const slotStart = leftWidth + gapBefore;
    const slotEnd = rightX - gapAfter;
    const iconX = slotStart + (slotEnd - slotStart - iconWidth) / 2;
    return {
      asset, assetId: parts.assetId, assetHeight, iconWidth, left, right,
      iconX, rightX, width
    };
  }

  function neutralRowWidth(context, line, fontPx, iconWidth, textGap) {
    const widths = tokensFor(line).flatMap((token) => token.type === "text"
      ? graphemes(token.value).map((value) => context.measureText(value).width)
      : [iconWidth]);
    return Math.max(fontPx, widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * textGap);
  }

  function rowSegmentBounds(segments, iconOffset = 0) {
    if (!segments) return null;
    return {
      minX: Math.min(0, segments.iconX + iconOffset),
      maxX: Math.max(segments.width, segments.iconX + iconOffset + segments.iconWidth)
    };
  }

  function wallFrameFit(layouts, segments, startX, offsetsX, requestedZoom, width, height, lineHeight, fontPx, rowCount) {
    const horizontalExtent = layouts.reduce((extent, layout, index) => {
      const bounds = rowSegmentBounds(segments[index], offsetsX[index] || 0)
        || { minX: 0, maxX: layout?.width || fontPx };
      return Math.max(extent, Math.abs(startX + bounds.minX), Math.abs(startX + bounds.maxX));
    }, 1);
    const margin = Math.min(width, height) * .006;
    const contentHeight = Math.max(fontPx, (Math.max(1, rowCount) - 1) * lineHeight + fontPx);
    return Math.min(
      1,
      Math.max(.01, width - margin * 2) / (horizontalExtent * 2 * requestedZoom),
      Math.max(.01, height - margin * 2) / (contentHeight * requestedZoom)
    );
  }

  function drawRowSegments(context, segments, startX, iconOffset, y, color, time) {
    if (segments.left) drawSequence(context, segments.left, startX, y, color, 0, time, 0, false);
    drawItem(context, {
      type: "asset", id: segments.assetId, asset: segments.asset,
      width: segments.iconWidth, height: segments.assetHeight
    }, startX + segments.iconX + iconOffset, y, color, { time, useAssetTuning: false });
    if (segments.right) drawSequence(context, segments.right, startX + segments.rightX, y, color, 0, time, 0, false);
  }

  function drawItem(context, item, x, y, color, options = {}) {
    const alpha = options.alpha ?? 1;
    const itemScale = options.scale ?? 1;
    const rotation = options.rotation ?? 0;
    const pitch = item.type === "asset" ? (options.pitch ?? 0) : 0;
    const yaw = item.type === "asset" ? (options.yaw ?? 0) : 0;
    const pitchRadians = pitch * Math.PI / 180;
    const yawRadians = yaw * Math.PI / 180;
    const pitchScale = Math.max(.58, Math.cos(pitchRadians));
    const yawScale = Math.max(.58, Math.cos(yawRadians));
    const pitchLift = item.type === "asset" ? Math.sin(pitchRadians) * (item.height || 0) * .12 : 0;
    const yawShift = item.type === "asset" ? Math.sin(yawRadians) * (item.height || 0) * .08 : 0;
    context.save();
    context.globalAlpha *= clamp01(alpha);
    context.translate(x + item.width / 2 + (options.x || 0) + yawShift, y + (options.y || 0) - pitchLift);
    context.rotate(rotation);
    context.scale(itemScale * yawScale, itemScale * pitchScale);
    context.fillStyle = color;
    if (item.type === "text") {
      context.fillText(item.value, -item.width / 2, 0);
    } else if (item.asset?.kind === "vector" && window.STGIconLibrary?.drawVector) {
      context.save();
      context.translate(0, 0);
      context.scale(item.width / Math.max(1, item.height), 1);
      window.STGIconLibrary.drawVector(context, item.asset, item.height, options.time || 0);
      context.restore();
    } else if (item.asset?.ready) {
      const drawX = options.useAssetTuning === false ? 0 : item.height * item.asset.offsetX / 100;
      const drawY = options.useAssetTuning === false ? 0 : item.height * item.asset.offsetY / 100;
      context.save();
      context.shadowColor = "rgba(0, 0, 0, .20)";
      context.shadowBlur = Math.max(2, item.height * .10);
      context.shadowOffsetX = Math.sin(yawRadians) * item.height * .06;
      context.shadowOffsetY = Math.sin(Math.abs(pitchRadians)) * item.height * .08 + item.height * .025;
      context.drawImage(item.asset.image, -item.width / 2 + drawX, -item.height / 2 + drawY, item.width, item.height);
      context.restore();
    } else {
      context.strokeStyle = color;
      context.lineWidth = Math.max(1, item.height * .045);
      context.strokeRect(-item.width / 2 + 1, -item.height / 2, Math.max(2, item.width - 2), item.height);
    }
    context.restore();
  }

  function drawSequence(context, layout, x, y, color, assetRotation = 0, time = 0, assetOffsetX = 0, useAssetTuning = true) {
    let cursor = x;
    layout.items.forEach((item, index) => {
      drawItem(context, item, cursor, y, color, {
        rotation: item.type === "asset" ? assetRotation : 0,
        x: item.type === "asset" ? assetOffsetX : 0,
        useAssetTuning,
        time
      });
      cursor += item.width + (layout.gaps[index] || 0);
    });
  }

  function drawRepeatedLine(context, layout, y, width, color, shift, alpha = 1, assetRotation = 0, time = 0) {
    let x = -mod(shift, layout.width) - layout.width;
    context.save();
    context.globalAlpha *= clamp01(alpha);
    while (x < width + layout.width) {
      drawSequence(context, layout, x, y, color, assetRotation, time);
      x += layout.width;
    }
    context.restore();
  }

  function drawAnchoredLine(context, layout, y, width, color, anchorX, alpha = 1, time = 0) {
    context.save();
    context.globalAlpha *= clamp01(alpha);
    for (let x = anchorX; x < width + layout.width; x += layout.width) drawSequence(context, layout, x, y, color, 0, time);
    for (let x = anchorX - layout.width; x > -layout.width * 2; x -= layout.width) drawSequence(context, layout, x, y, color, 0, time);
    context.restore();
  }

  const easeOutBack = (value) => {
    const x = clamp01(value) - 1;
    return 1 + 2.35 * x * x * x + 1.35 * x * x;
  };

  function layoutFinalText(context, text, letterGap = 0) {
    const characters = graphemes(text || "leveling up");
    let prefix = "";
    let previousWidth = 0;
    const slots = characters.map((character, index) => {
      prefix += character;
      const nextWidth = context.measureText(prefix).width;
      const width = Math.max(1, nextWidth - previousWidth + (index < characters.length - 1 ? letterGap : 0));
      const slot = { character, index, x: previousWidth, width };
      previousWidth = nextWidth;
      return slot;
    });
    return { slots, width: previousWidth };
  }

  function finalScanTiming() {
    const speed = Math.max(.5, Math.min(24, Number(inputs.finalScanSpeed.value)));
    const speedRatio = speed / 4;
    const transition = Math.max(16, Math.min(220, 100 / speedRatio)) / 1000;
    const launchKick = Math.max(.008, Math.max(20, Math.min(240, Number(inputs.iconSlowMotionStart.value))) / 1000 / speedRatio);
    const entryStep = Math.max(60, Math.min(1200, Number(inputs.swapInterval.value))) / 1000;
    const step = Math.max(.012, entryStep / speedRatio);
    return {
      speedRatio,
      transition,
      launchKick,
      restoreTransition: Math.max(.008, Math.max(20, Math.min(600, Number(inputs.finalRestoreDuration.value))) / 1000 / speedRatio),
      hold: Math.max(.008, Math.max(40, Math.min(1200, Number(inputs.iconHoldDuration.value))) / 1000 / speedRatio),
      rotation: Math.max(.04, Math.max(200, Math.min(2400, Number(inputs.iconRotationDuration.value))) / 1000 / speedRatio),
      step,
      restoreStep: Math.max(.012, Math.max(20, Math.min(600, Number(inputs.finalRestoreStep.value))) / 1000 / speedRatio)
    };
  }

  function finalScanDuration() {
    const count = Math.max(1, Object.keys(finalSlotMap).filter((index) => assets.has(finalSlotMap[index])).length);
    const scan = finalScanTiming();
    return finalScanPhases(count, scan).end;
  }

  function finalScanPhases(count, scan = finalScanTiming()) {
    const lastEnterStart = Math.max(0, count - 1) * scan.step;
    const enterSweep = Math.max(0, count - 1) * scan.step + scan.transition;
    const lastRotationEnd = lastEnterStart + scan.transition * .45 + scan.launchKick + scan.rotation;
    const restoreStart = Math.max(enterSweep + scan.hold, lastRotationEnd);
    const lastRestoreStart = Math.max(0, count - 1) * scan.restoreStep;
    return {
      enterEnd: enterSweep,
      restoreStart,
      end: restoreStart + lastRestoreStart + scan.restoreTransition
    };
  }

  function drawFinalAsset(context, asset, centerX, centerY, width, height, time, rotation = 0) {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    if (asset.kind === "vector" && window.STGIconLibrary?.drawVector) {
      context.scale(width / Math.max(1, height), 1);
      window.STGIconLibrary.drawVector(context, asset, height, time);
    } else if (asset.ready) {
      context.drawImage(asset.image, -width / 2, -height / 2, width, height);
    }
    context.restore();
  }

  function drawFinalLine(context, text, centerX, y, color, assetHeight, sequenceElapsed, unitScale) {
    const layout = layoutFinalText(context, text, Number(inputs.finalTextGap.value) * unitScale);
    const mappedSlots = layout.slots.filter((slot) => assets.has(finalSlotMap[slot.index]));
    const scanTiming = finalScanTiming();
    const activeReplacements = new Map();
    const scanPhases = finalScanPhases(Math.max(1, mappedSlots.length), scanTiming);
    const restoreSweepStart = scanPhases.restoreStart;
    mappedSlots.forEach((slot, order) => {
      const enterStart = order * scanTiming.step;
      const restoreStart = restoreSweepStart + order * scanTiming.restoreStep;
      if (sequenceElapsed < enterStart || sequenceElapsed >= restoreStart + scanTiming.restoreTransition) return;
      const asset = assets.get(finalSlotMap[slot.index]);
      const enterRaw = rangeProgress(sequenceElapsed, enterStart, enterStart + scanTiming.transition);
      const exitRaw = rangeProgress(sequenceElapsed, restoreStart, restoreStart + scanTiming.restoreTransition);
      const setting = normalizedFinalSlotSetting(slot.index);
      const requestedHeight = assetHeight * setting.scale / 100;
      const requestedWidth = requestedHeight * (asset.ratio || 1);
      const gapBefore = setting.gapBefore * unitScale;
      const gapAfter = setting.gapAfter * unitScale;
      const requiredWidth = Math.max(1, requestedWidth + gapBefore + gapAfter);
      const closeRaw = exitRaw;
      const openRaw = rangeProgress(enterRaw, .45, 1);
      const openProgress = easeOut(openRaw) * (1 - smooth(closeRaw));
      activeReplacements.set(slot.index, {
        asset, enterStart, restoreStart, enterRaw, exitRaw, swap: enterRaw >= .45 && exitRaw < .55,
        requestedHeight, requestedWidth, requiredWidth, gapBefore,
        offsetX: setting.offsetX * unitScale, offsetY: setting.offsetY * unitScale,
        rotation: setting.rotation * Math.PI / 180,
        widthDelta: (requiredWidth - slot.width) * openProgress, openProgress
      });
    });
    const dynamicWidths = layout.slots.map((slot) => Math.max(1, slot.width + (activeReplacements.get(slot.index)?.widthDelta || 0)));
    let cursorX = centerX - dynamicWidths.reduce((sum, width) => sum + width, 0) / 2;
    context.fillStyle = color;
    layout.slots.forEach((slot) => {
      const dynamicSlotWidth = dynamicWidths[slot.index];
      const replacement = activeReplacements.get(slot.index);
      if (replacement?.swap) {
        const { asset, enterStart, requestedHeight, requestedWidth, requiredWidth, gapBefore, offsetX, offsetY,
          rotation } = replacement;
        const iconExit = rangeProgress(replacement.exitRaw, 0, .55);
        const fullCenterOffset = (dynamicSlotWidth - requiredWidth) / 2 + gapBefore + requestedWidth / 2;
        const settledCenterX = cursorX + fullCenterOffset + offsetX;
        const launchStart = enterStart + scanTiming.transition * .45;
        const launchEnd = launchStart + scanTiming.launchKick;
        const slowMotionEnd = replacement.restoreStart;
        const slowMotionStart = Math.max(launchEnd, slowMotionEnd - scanTiming.rotation);
        const slowProgress = rangeProgress(sequenceElapsed, slowMotionStart, slowMotionEnd);
        const launchProgress = sequenceElapsed < slowMotionStart
          ? easeOut(rangeProgress(sequenceElapsed, launchStart, launchEnd))
          : 1;
        const drawCenterX = settledCenterX - requestedWidth * .28 * (1 - launchProgress);
        const drawCenterY = y + offsetY;
        const replacementScale = (.72 + launchProgress * .28) * (1 - smooth(iconExit) * .18);
        const rotationMotion = slowProgress;
        const rotationProgress = sequenceElapsed < slowMotionStart
          ? 0
          : sequenceElapsed < slowMotionEnd
            ? rotationMotion < .45
              ? smoother(rotationMotion / .45)
              : lerp(1, -1, smoother((rotationMotion - .45) / .55))
            : lerp(-1, 0, easeOut(rangeProgress(replacement.exitRaw, 0, .55)));
        drawFinalAsset(context, asset, drawCenterX, drawCenterY, requestedWidth * replacementScale, requestedHeight * replacementScale,
          sequenceElapsed, rotation * Math.max(-1, Math.min(1, rotationProgress)));
      } else {
        let glyphScaleX = 1;
        let glyphScaleY = 1;
        if (replacement?.enterRaw < .45) {
          const prepare = easeOut(rangeProgress(replacement.enterRaw, 0, .45));
          glyphScaleX = 1 - prepare * .12;
          glyphScaleY = 1 + prepare * .035;
        } else if (replacement) {
          const restore = easeOutBack(rangeProgress(replacement.exitRaw, .55, 1));
          glyphScaleX = .82 + restore * .18;
          glyphScaleY = 1.02 - restore * .02;
        }
        context.save();
        context.translate(cursorX + dynamicSlotWidth / 2, y);
        context.scale(glyphScaleX, glyphScaleY);
        context.fillText(slot.character, -slot.width / 2, 0);
        context.restore();
      }
      cursorX += dynamicSlotWidth;
    });
  }

  function choreographyTiming() {
    const launch = Number(inputs.introDuration.value) / 1000;
    const spread = Number(inputs.spreadDuration.value) / 1000;
    const collapse = Number(inputs.collapseDuration.value) / 1000;
    const scan = finalScanDuration();
    const finalHold = Number(inputs.finalDuration.value) / 1000;
    const exit = Number(inputs.exitDuration.value) / 1000;
    const duration = [launch, spread, collapse, scan, finalHold, exit];
    const introEnd = launch;
    const spreadStart = launch * .48;
    const spreadEnd = spreadStart + spread;
    const collapseEnd = spreadEnd + collapse;
    const scanEnd = collapseEnd + scan;
    const holdEnd = scanEnd + finalHold;
    const exitEnd = holdEnd + exit;
    return {
      cycle: exitEnd, duration, introEnd, spreadStart, spreadEnd, collapseEnd, scanEnd, holdEnd, exitEnd, finalEnd: exitEnd
    };
  }

  function popEase(value, strength) {
    const x = clamp01(value);
    const overshoot = 1.15 + strength * 1.9;
    return 1 + (overshoot + 1) * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
  }

  function openingJump(progress) {
    const x = clamp01(progress);
    const arrive = easeOut(x);
    return {
      y: lerp(.48, 0, arrive),
      scaleX: lerp(.68, 1, arrive),
      scaleY: lerp(.52, 1, arrive)
    };
  }

  function renderFrame(target, time, width, height, pixelRatio = 1) {
    const context = target.getContext("2d");
    const w = width ?? target.width / pixelRatio;
    const h = height ?? target.height / pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, w, h);
    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, w, h);

    const rows = parseRows();
    const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const scale = h / 900;
    const introFontPx = Math.max(8, Number(inputs.fontSize.value) * scale);
    const wallFontPx = Math.max(8, Number(inputs.wallFontSize.value) * scale);
    const finalFontPx = Math.max(8, Number(inputs.finalFontSize.value) * scale);
    const introStage = {
      fontPx: introFontPx,
      assetHeight: introFontPx * Number(inputs.assetScale.value) / 100,
      textGap: Number(inputs.itemGap.value) * scale,
      assetGap: Number(inputs.introAssetGap.value) * scale
    };
    const wallStage = {
      fontPx: wallFontPx,
      assetHeight: wallFontPx,
      textGap: Number(inputs.wallTextGap.value) * scale,
      assetGap: 0
    };
    const finalStage = {
      fontPx: finalFontPx,
      assetHeight: finalFontPx * Number(inputs.finalAssetScale.value) / 100,
      textGap: Number(inputs.finalTextGap.value) * scale,
      assetGap: 0
    };
    const lineHeight = Math.max(wallFontPx * .66, wallFontPx + Number(inputs.lineGap.value) * scale);
    const requestedRows = Math.max(3, Math.round(Number(inputs.rowCount.value)) | 1);
    const maxRowsForCanvas = Math.max(3, (Math.ceil(h / Math.max(1, lineHeight)) + 4) | 1);
    const uniqueRowCount = rows.length % 2 === 0 ? Math.max(1, rows.length - 1) : rows.length;
    const rowCount = Math.min(requestedRows, maxRowsForCanvas, uniqueRowCount);
    const halfRows = Math.floor(rowCount / 2);
    const choreography = inputs.motionMode.value === "choreography";
    const timing = choreographyTiming();
    const localTime = choreography ? mod(time, timing.cycle) : time;
    const bounceStrength = Number(inputs.bounce.value) / 100;
    const staggerStrength = Number(inputs.stagger.value) / 100;
    const horizontalPhase = Number(inputs.horizontalPhase.value) * scale;
    const verticalSpeed = Number(inputs.verticalDrift.value) * scale;

    const fontFor = (stage) => `${preset.style} ${preset.weight} ${stage.fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    context.font = fontFor(introStage);
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;

    const centerSource = Math.floor(rows.length / 2);
    const primaryLine = rows[centerSource];
    const openingLine = inputs.introWord.value.trim() || primaryLine;
    const hasInlineAsset = (line) => [...line.matchAll(/\{\{([^{}]+)\}\}/g)].some((match) => assets.has(match[1]));
    const carryOpeningAssets = choreography && hasInlineAsset(openingLine) && !hasInlineAsset(primaryLine);
    const centerWallLine = carryOpeningAssets ? openingLine : primaryLine;
    const wallRows = rows.map((line, index) => index === centerSource ? centerWallLine : line);
    const indexForLane = (lane) => mod(centerSource + lane, rows.length);
    const lineForLane = (lane) => wallRows[indexForLane(lane)];
    context.font = fontFor(wallStage);
    const wallRowTextGaps = wallRows.map((_, index) => wallStage.textGap + (Number(rowTextGaps[index]) || 0) * scale);
    const wallLayouts = wallRows.map((line, index) => layoutTokens(
      context, line, wallStage.fontPx, wallStage.assetHeight * rowAssetScales[index] / 100, wallRowTextGaps[index],
      wallRowTextGaps[index] + (Number(rowAssetGaps[index]) || 0) * scale, false
    ));
    const globalRowAssetScale = Number($("#globalRowAssetScale").value) || 100;
    const neutralWallWidths = wallRows.map((line, index) => neutralRowWidth(
      context, line, wallStage.fontPx, wallStage.fontPx * globalRowAssetScale / 100, wallRowTextGaps[index]
    ));
    const fixedWallWidth = Math.max(...neutralWallWidths, wallStage.fontPx);
    const wallSegments = wallRows.map((line, index) => layoutRowSegments(
      context, line, wallStage.fontPx, wallStage.assetHeight * rowAssetScales[index] / 100, wallRowTextGaps[index],
      wallRowTextGaps[index] + (Number(rowAssetGaps[index]) || 0) * scale,
      wallRowTextGaps[index] + (Number(rowAssetGapsAfter[index]) || 0) * scale,
      fixedWallWidth
    ));
    const centerWallBounds = rowSegmentBounds(
      wallSegments[centerSource], (Number(rowAssetOffsetsX[centerSource]) || 0) * scale
    ) || { minX: 0, maxX: wallLayouts[centerSource]?.width || 0 };
    const wallStartX = -fixedWallWidth / 2;
    const requestedWallZoom = Number(inputs.wallScale.value) / 100;
    const wallFit = wallFrameFit(
      wallLayouts, wallSegments, wallStartX,
      rowAssetOffsetsX.map((value) => (Number(value) || 0) * scale),
      requestedWallZoom, w, h, lineHeight, wallFontPx, rowCount
    );
    const wallZoom = requestedWallZoom * wallFit;
    const drawCentered = (line, y, xOffset = 0, alpha = 1, rowScale = 1, stage = introStage, rowIndex = 0, axisScaleX = 1, axisScaleY = 1) => {
      context.font = fontFor(stage);
      const isWall = stage === wallStage;
      const layout = isWall
        ? (wallLayouts[rowIndex] || layoutTokens(context, line, stage.fontPx, stage.assetHeight, stage.textGap, stage.assetGap, false))
        : layoutTokens(context, line, stage.fontPx, stage.assetHeight, stage.textGap, stage.assetGap);
      const segments = isWall ? wallSegments[rowIndex] : null;
      context.save();
      context.globalAlpha *= clamp01(alpha);
      context.translate(w / 2 + xOffset, h / 2 + y);
      const compositionScale = rowScale * (isWall ? wallZoom : 1);
      context.scale(compositionScale * axisScaleX, compositionScale * axisScaleY);
      if (segments) {
        drawRowSegments(context, segments, wallStartX, (Number(rowAssetOffsetsX[rowIndex]) || 0) * scale, 0, inputs.foreground.value, localTime);
      } else {
        drawSequence(context, layout, isWall ? wallStartX : -layout.width / 2, 0, inputs.foreground.value, 0, localTime, 0, !isWall);
      }
      context.restore();
    };
    const markPhase = (phase, extras = {}) => {
      if (target !== canvas) return;
      canvas.dataset.motionPhase = phase;
      canvas.dataset.renderedRows = String(extras.rows ?? 1);
      canvas.dataset.finalState = String(extras.finalState ?? -1);
      canvas.dataset.finalScale = String((extras.finalScale ?? 1).toFixed(4));
      canvas.dataset.wallScale = inputs.wallScale.value;
      canvas.dataset.introFontSize = inputs.fontSize.value;
      canvas.dataset.introAssetScale = inputs.assetScale.value;
      canvas.dataset.introTextGap = inputs.itemGap.value;
      canvas.dataset.introAssetGap = inputs.introAssetGap.value;
      canvas.dataset.wallFontSize = inputs.wallFontSize.value;
      canvas.dataset.wallTextGap = inputs.wallTextGap.value;
      canvas.dataset.wallLayoutFit = wallFit.toFixed(6);
      canvas.dataset.wallColumnAnchor = (wallStartX / scale).toFixed(4);
      canvas.dataset.wallAssetGap = "per-row";
      canvas.dataset.rowAssetGaps = rowAssetGaps.join(",");
      canvas.dataset.rowAssetGapsAfter = rowAssetGapsAfter.join(",");
      canvas.dataset.rowAssetScales = rowAssetScales.join(",");
      canvas.dataset.rowAssetOffsetsX = rowAssetOffsetsX.join(",");
      canvas.dataset.rowTextGaps = rowTextGaps.join(",");
      canvas.dataset.neutralRowWidths = neutralWallWidths.map((width) => width.toFixed(3)).join(",");
      canvas.dataset.fixedRowFrameWidth = fixedWallWidth.toFixed(3);
      canvas.dataset.rowFrameWidths = wallSegments.map((segments) => (segments?.width || fixedWallWidth).toFixed(3)).join(",");
      canvas.dataset.rowRightTextAnchors = wallSegments.map((segments) => (segments ? wallStartX + segments.rightX : wallStartX + fixedWallWidth).toFixed(3)).join(",");
      canvas.dataset.rowRightEdges = wallSegments.map((segments) => (wallStartX + (segments?.width || fixedWallWidth)).toFixed(3)).join(",");
      canvas.dataset.finalFontSize = inputs.finalFontSize.value;
      canvas.dataset.finalAssetScale = inputs.finalAssetScale.value;
      canvas.dataset.finalTextGap = inputs.finalTextGap.value;
      canvas.dataset.finalAssetGap = "per-slot";
      canvas.dataset.swapMotion = extras.swapMotion || "idle";
      canvas.dataset.swapTargets = String(extras.swapTargets ?? 0);
      canvas.dataset.iconRotationMotion = "fast-zero-angle-launch-scale-locked-slow-angle-swing-ultrafast-left-to-right-glyph-close";
      canvas.dataset.iconRotationDuration = inputs.iconRotationDuration.value;
      canvas.dataset.iconSlowMotionStart = inputs.iconSlowMotionStart.value;
      canvas.dataset.iconSlowMotionTurnRatio = ".45";
      canvas.dataset.iconSlowMotionCrossRatio = ".55";
      canvas.dataset.iconSlowMotionFastReturn = "restore-transition";
      canvas.dataset.iconSlowMotionDrift = "fast-right-entry-then-locked";
      canvas.dataset.iconSlowMotionAnchor = "immediately-before-each-restore";
      canvas.dataset.finalIconEntrySlide = ".28";
      canvas.dataset.finalIconRotationStart = `${inputs.iconSlowMotionStart.value}ms`;
      canvas.dataset.finalIconVerticalMotion = "0";
      canvas.dataset.finalIconLaunchKick = finalScanTiming().launchKick.toFixed(4);
      canvas.dataset.finalRestoreOrder = "left-to-right";
      canvas.dataset.finalRestoreStep = finalScanTiming().restoreStep.toFixed(4);
      canvas.dataset.finalRestoreTransition = finalScanTiming().restoreTransition.toFixed(4);
      canvas.dataset.finalRestoreDuration = inputs.finalRestoreDuration.value;
      canvas.dataset.finalIconHoldDuration = inputs.iconHoldDuration.value;
      canvas.dataset.finalScanMasterRatio = finalScanTiming().speedRatio.toFixed(4);
      canvas.dataset.finalScanTotalDuration = finalScanDuration().toFixed(4);
      canvas.dataset.centerLineSource = carryOpeningAssets ? "opening-assets" : "middle-row";
      canvas.dataset.centerLineAssets = [...centerWallLine.matchAll(/\{\{([^{}]+)\}\}/g)]
        .map((match) => match[1]).filter((id) => assets.has(id)).join(",");
      canvas.dataset.centerLineOffset = (wallStartX + (centerWallBounds.minX + centerWallBounds.maxX) / 2).toFixed(4);
      canvas.dataset.columnAnchorX = wallStartX.toFixed(4);
      canvas.dataset.columnAnchorSource = "neutral-row-composition";
      canvas.dataset.centerHandoffMode = "fixed-center-row";
      canvas.dataset.centerJumpScaleX = String((extras.centerJumpScaleX ?? 1).toFixed(4));
      canvas.dataset.centerJumpScaleY = String((extras.centerJumpScaleY ?? 1).toFixed(4));
      canvas.dataset.centerJumpY = String((extras.centerJumpY ?? 0).toFixed(4));
      canvas.dataset.centerWallRowScale = String((extras.centerWallRowScale ?? 1).toFixed(4));
      canvas.dataset.wallExitScaleMode = extras.wallExitScaleMode || "idle";
      canvas.dataset.finalSweepBase = "water-flow-with-2d-rotation";
      canvas.dataset.finalExitY = String((extras.finalExitY ?? 0).toFixed(4));
      canvas.dataset.finalRevealScale = String((extras.finalRevealScale ?? 1).toFixed(4));
      canvas.dataset.renderTime = localTime.toFixed(4);
    };

    if (!choreography) {
      const loopHeight = rowCount * lineHeight * wallZoom;
      const drift = mod(localTime * verticalSpeed + loopHeight / 2, loopHeight) - loopHeight / 2;
      for (let lane = -halfRows - 1; lane <= halfRows + 1; lane += 1) {
        let y = lane * lineHeight * wallZoom + drift;
        if (y < -(halfRows + 1) * lineHeight * wallZoom) y += loopHeight;
        if (y > (halfRows + 1) * lineHeight * wallZoom) y -= loopHeight;
        drawCentered(lineForLane(lane), y, horizontalPhase, 1, 1, wallStage, indexForLane(lane));
      }
      markPhase("continuous", { rows: rowCount });
      return;
    }

    const launchProgress = rangeProgress(localTime, 0, timing.introEnd);
    const launchJump = openingJump(launchProgress);
    const centerStableScale = introFontPx / Math.max(1, wallFontPx * wallZoom);
    const centerFilledZoom = 1 / Math.max(.001, centerStableScale);
    const spreadProgress = rangeProgress(localTime, timing.spreadStart, timing.spreadEnd);
    const centerFillProgress = smoother(rangeProgress(localTime, timing.spreadStart, timing.introEnd));
    const centerDisplayScale = launchJump.scaleX * lerp(1, centerFilledZoom, centerFillProgress);
    const collapseProgress = rangeProgress(localTime, timing.spreadEnd, timing.collapseEnd);

    if (localTime < timing.spreadEnd) {
      for (let lane = -halfRows; lane <= halfRows; lane += 1) {
        const distance = Math.abs(lane);
        if (distance > 0 && localTime < timing.spreadStart) continue;
        const appearStart = distance === 0 ? 0 : (distance - 1) / Math.max(1, halfRows) * staggerStrength * .84;
        const appearEnd = Math.min(1, appearStart + lerp(.42, .18, staggerStrength));
        const appear = distance === 0
          ? launchProgress
          : popEase(rangeProgress(spreadProgress, appearStart, appearEnd), bounceStrength);
        const alpha = distance === 0
          ? 1
          : smoother(rangeProgress(spreadProgress, appearStart, Math.min(1, appearStart + .16)));
        if (alpha <= .002) continue;
        const spreadPosition = distance === 0 ? 1 : popEase(rangeProgress(spreadProgress, appearStart, appearEnd), bounceStrength);
        const y = distance === 0
          ? launchJump.y * introFontPx
          : lane * lineHeight * wallZoom * spreadPosition;
        const rowScale = distance === 0
          ? centerStableScale * centerDisplayScale
          : lerp(.76, 1, appear);
        const centerAxisScaleY = distance === 0
          ? (localTime < timing.introEnd ? launchJump.scaleY / Math.max(.001, launchJump.scaleX) : 1)
          : 1;
        if (distance === 0) {
          drawCentered(centerWallLine, y, horizontalPhase, alpha, rowScale,
            wallStage, indexForLane(lane), 1, centerAxisScaleY);
        } else {
          drawCentered(lineForLane(lane), y, horizontalPhase, alpha, rowScale, wallStage, indexForLane(lane));
        }
      }
      const phase = localTime < timing.spreadStart ? "center-launch" : "wall-spread";
      markPhase(phase, { rows: localTime < timing.spreadStart ? 1 : rowCount,
        centerJumpScaleX: centerDisplayScale,
        centerJumpScaleY: localTime < timing.introEnd
          ? centerDisplayScale * launchJump.scaleY / Math.max(.001, launchJump.scaleX)
          : centerDisplayScale,
        centerJumpY: localTime < timing.introEnd ? launchJump.y : 0,
        centerWallRowScale: centerStableScale * centerDisplayScale });
      return;
    }

    let driftY = Math.min(Math.max(0, localTime - timing.spreadEnd), timing.duration[2]) * verticalSpeed;
    const direction = inputs.collapseDirection.value;
    if (direction !== "center") {
      driftY += (direction === "up" ? -1 : 1) * h * .32 * smoother(collapseProgress);
    }

    if (localTime < timing.collapseEnd) {
      for (let lane = -halfRows; lane <= halfRows; lane += 1) {
        const distance = Math.abs(lane);
        const collapseOrder = (halfRows - distance) / Math.max(1, halfRows);
        const disappearStart = collapseOrder * .58;
        const disappear = smoother(rangeProgress(collapseProgress, disappearStart, Math.min(1, disappearStart + .30)));
        const alpha = 1 - disappear;
        if (alpha <= .002) continue;
        const y = distance === 0 ? 0 : lane * lineHeight * wallZoom + driftY;
        drawCentered(lineForLane(lane), y, horizontalPhase, alpha, 1, wallStage, indexForLane(lane));
      }

      const nextReveal = smoother(rangeProgress(collapseProgress, .38, .92));
      const nextAlpha = Number(inputs.nextOpacity.value) / 100 * nextReveal;
      drawCentered(inputs.nextWord.value.trim() || "leveling up", 0, 0, nextAlpha, 1, finalStage);
      markPhase("wall-exit", { rows: rowCount, centerJumpScaleX: centerFilledZoom, centerJumpScaleY: centerFilledZoom,
        centerJumpY: 0, centerWallRowScale: 1, wallExitScaleMode: "uniform-1", finalRevealScale: 1 });
      return;
    }

    const finalElapsed = Math.max(0, localTime - timing.collapseEnd);
    const exitProgress = rangeProgress(localTime, timing.holdEnd, timing.exitEnd);
    context.font = fontFor(finalStage);
    context.save();
    const finalExitEase = easeOut(exitProgress);
    context.globalAlpha *= Number(inputs.nextOpacity.value) / 100 * (1 - finalExitEase);
    context.translate(w / 2, h / 2 - finalFontPx * .12 * finalExitEase);
    const finalExitScale = 1 - finalExitEase * .055;
    context.scale(finalExitScale, finalExitScale);
    drawFinalLine(context, inputs.nextWord.value.trim() || "leveling up", 0, 0, inputs.foreground.value, finalStage.assetHeight, finalElapsed, scale);
    context.restore();
    const finalPhase = localTime < timing.scanEnd ? "final-sweep" : localTime < timing.holdEnd ? "final-hold" : "final-exit";
    markPhase(finalPhase, { finalState: Math.min(1, finalElapsed / Math.max(.001, finalScanDuration())),
      finalScale: finalExitScale, finalExitY: -finalFontPx * .12 * finalExitEase,
      swapTargets: Object.keys(finalSlotMap).length, swapMotion: "water-scan-upright-angle-return-2d-rotation" });
  }

  function timelineBeats(timing = choreographyTiming()) {
    return [
      { kind: "intro", name: "中心跳出", start: 0, end: timing.introEnd },
      { kind: "orbit", name: "跳出并连续弹满", start: timing.spreadStart, end: timing.spreadEnd },
      { kind: "replace", name: "立即收束", start: timing.spreadEnd, end: timing.collapseEnd },
      { kind: "contact", name: "字母图标扫变", start: timing.collapseEnd, end: timing.scanEnd },
      { kind: "hold", name: "恢复后停留", start: timing.scanEnd, end: timing.holdEnd },
      { kind: "intro", name: "快速消失", start: timing.holdEnd, end: timing.exitEnd }
    ].map((beat, index) => ({ ...beat, index, duration: Math.max(0, beat.end - beat.start) }));
  }

  function renderTimeline() {
    const track = $("#flowTimelineTrack");
    const list = $("#flowTimelineList");
    const timing = choreographyTiming();
    track.replaceChildren();
    list.replaceChildren();
    timelineBeats(timing).forEach((beat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `flow-timeline-beat me-choreo-block is-${beat.kind}`;
      button.style.flex = `${Math.max(.08, beat.duration)} 1 0`;
      button.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.name}</strong><small>${beat.duration.toFixed(2)}秒</small>`;
      button.addEventListener("click", () => setTime(beat.start + .001));
      track.append(button);
      const row = document.createElement("li");
      row.className = "flow-timeline-row";
      row.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.name}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      list.append(row);
    });
    const playhead = document.createElement("i");
    playhead.className = "flow-timeline-playhead me-choreo-playhead";
    playhead.id = "flowTimelinePlayhead";
    playhead.setAttribute("aria-hidden", "true");
    track.append(playhead);
    $("#flowTimeline").classList.toggle("is-continuous", inputs.motionMode.value !== "choreography");
  }

  function updateTimelinePlayhead(time, timing) {
    const playhead = $("#flowTimelinePlayhead");
    if (playhead) playhead.style.left = `${clamp01(time / Math.max(.001, timing.cycle)) * 100}%`;
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.dataset.ratio = String(dpr);
    }
  }

  function currentTime() {
    return paused ? pausedAt : (performance.now() - animationStart) / 1000;
  }

  function previewLoop() {
    resizeCanvas();
    const ratio = Number(canvas.dataset.ratio || 1);
    const time = currentTime();
    renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
    renderRowOverview(time);
    const displayTime = inputs.motionMode.value === "choreography" ? mod(time, choreographyTiming().cycle) : time;
    frameCounter.textContent = `F ${String(Math.round(displayTime * fps)).padStart(4, "0")}`;
    updateTimelinePlayhead(inputs.motionMode.value === "choreography" ? displayTime : 0, choreographyTiming());
    rafId = requestAnimationFrame(previewLoop);
  }

  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }

  function syncPlaybackControls() {
    $("#pauseButton").textContent = paused ? "继续" : "暂停";
    $("#stagePauseIcon").textContent = paused ? "▶" : "Ⅱ";
    $("#stagePauseLabel").textContent = paused ? "播放" : "暂停";
    $("#stagePauseButton").setAttribute("aria-pressed", String(paused));
  }

  function restartPlayback() {
    paused = false;
    setTime(0);
    syncPlaybackControls();
  }

  function togglePlayback() {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
    } else {
      pausedAt = currentTime();
      paused = true;
    }
    syncPlaybackControls();
  }

  $("#restartButton").addEventListener("click", restartPlayback);
  $("#stageRestartButton").addEventListener("click", restartPlayback);
  $("#pauseButton").addEventListener("click", togglePlayback);
  $("#stagePauseButton").addEventListener("click", togglePlayback);
  $("#backButton").addEventListener("click", () => { paused = true; setTime(currentTime() - 1 / fps); syncPlaybackControls(); });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(currentTime() + 1 / fps); syncPlaybackControls(); });

  function updateOutputs() {
    const timing = choreographyTiming();
    const formatSeconds = (seconds) => `${seconds < 1 ? seconds.toFixed(2) : seconds.toFixed(1)}秒`;
    const values = {
      fontSizeOut: `${inputs.fontSize.value}px`,
      lineGapOut: `${inputs.lineGap.value}px`,
      assetScaleOut: `${inputs.assetScale.value}%`,
      introAssetGapOut: `${inputs.introAssetGap.value}px`,
      rowCountOut: inputs.rowCount.value,
      wallFontSizeOut: `${inputs.wallFontSize.value}px`,
      wallTextGapOut: `${inputs.wallTextGap.value}px`,
      wallScaleOut: `${inputs.wallScale.value}%`,
      itemGapOut: `${inputs.itemGap.value}px`,
      finalFontSizeOut: `${inputs.finalFontSize.value}px`,
      finalAssetScaleOut: `${inputs.finalAssetScale.value}%`,
      finalTextGapOut: `${inputs.finalTextGap.value}px`,
      cycleDurationOut: formatSeconds(timing.cycle),
      introDurationOut: formatSeconds(timing.duration[0]),
      spreadDurationOut: formatSeconds(timing.duration[1]),
      collapseDurationOut: formatSeconds(timing.duration[2]),
      finalDurationOut: formatSeconds(Number(inputs.finalDuration.value) / 1000),
      exitDurationOut: formatSeconds(Number(inputs.exitDuration.value) / 1000),
      swapIntervalOut: `${(Number(inputs.swapInterval.value) / 1000).toFixed(2)}秒`,
      finalScanSpeedOut: `${Number(inputs.finalScanSpeed.value).toFixed(1)}× · 整段${finalScanDuration().toFixed(2)}秒`,
      iconHoldDurationOut: `${inputs.iconHoldDuration.value}ms`,
      iconRotationDurationOut: formatSeconds(Number(inputs.iconRotationDuration.value) / 1000),
      iconSlowMotionStartOut: `${inputs.iconSlowMotionStart.value}ms`,
      finalRestoreDurationOut: `${inputs.finalRestoreDuration.value}ms`,
      finalRestoreStepOut: `${inputs.finalRestoreStep.value}ms`,
      bounceOut: `${inputs.bounce.value}%`,
      staggerOut: `${inputs.stagger.value}%`,
      verticalDriftOut: inputs.verticalDrift.value,
      horizontalPhaseOut: inputs.horizontalPhase.value,
      nextOpacityOut: `${inputs.nextOpacity.value}%`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    document.documentElement.style.setProperty("--text-color", inputs.foreground.value);
    renderTimeline();
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  const previewFinalSweep = () => {
    paused = false;
    setTime(choreographyTiming().collapseEnd + .001);
    syncPlaybackControls();
  };
  [inputs.swapInterval, inputs.finalScanSpeed, inputs.finalRestoreStep].forEach((input) => input.addEventListener("input", previewFinalSweep));
  [inputs.iconHoldDuration, inputs.iconRotationDuration, inputs.iconSlowMotionStart, inputs.finalRestoreDuration, inputs.finalFontSize, inputs.finalAssetScale, inputs.finalTextGap]
    .forEach((input) => input.addEventListener("input", () => setTime(choreographyTiming().collapseEnd + .025)));
  const previewFinalExit = () => {
    paused = false;
    const timing = choreographyTiming();
    setTime(timing.holdEnd + .001);
    syncPlaybackControls();
  };
  [inputs.finalDuration, inputs.exitDuration].forEach((input) => input.addEventListener("input", previewFinalExit));
  [inputs.wallScale, inputs.wallFontSize, inputs.wallTextGap, inputs.lineGap].forEach((input) => {
    input.addEventListener("input", () => setTime(choreographyTiming().spreadStart + choreographyTiming().duration[1] * .8));
  });
  [inputs.fontSize, inputs.assetScale, inputs.itemGap, inputs.introAssetGap].forEach((input) => {
    input.addEventListener("input", () => setTime(choreographyTiming().duration[0] * .5));
  });
  [inputs.assetItemScale, inputs.assetOffsetX, inputs.assetOffsetY, inputs.assetGapBefore, inputs.assetGapAfter].forEach((input) => {
    input.addEventListener("input", updateSelectedAsset);
  });
  inputs.rows.addEventListener("input", () => {
    syncRowAssetGaps();
    showWallEditPreview();
  });
  inputs.motionMode.addEventListener("change", () => setTime(0));

  function positionRowOverview() {
    if (rowOverviewPanel.hidden) return;
    const editor = $("#controlPanel").getBoundingClientRect();
    const previewWidth = window.innerWidth > 720 ? Math.min(360, Math.max(0, window.innerWidth - editor.right)) : 0;
    rowOverviewPanel.style.left = `${Math.round(editor.left)}px`;
    rowOverviewPanel.style.top = `${Math.round(Math.max(0, editor.top))}px`;
    rowOverviewPanel.style.width = `${Math.round(editor.width + previewWidth)}px`;
    rowOverviewPanel.style.height = `${Math.round(Math.min(editor.height, window.innerHeight - Math.max(0, editor.top)))}px`;
    rowOverviewPanel.style.setProperty("--row-overview-editor-width", `${Math.round(editor.width)}px`);
  }

  function openRowOverview() {
    rowOverviewPanel.hidden = false;
    $("#openRowOverview").setAttribute("aria-expanded", "true");
    positionRowOverview();
    syncRowAssetGaps();
  }

  function closeRowOverview() {
    rowOverviewPanel.hidden = true;
    $("#openRowOverview").setAttribute("aria-expanded", "false");
  }

  $("#openRowOverview").setAttribute("aria-expanded", "false");
  $("#openRowOverview").addEventListener("click", openRowOverview);
  $("#closeRowOverview").addEventListener("click", closeRowOverview);
  window.addEventListener("resize", () => {
    positionRowOverview();
    renderRowOverview(currentTime());
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !rowOverviewPanel.hidden && $("#assetEditorDrawer").hidden) closeRowOverview();
  });
  const SCHEME_STORAGE_KEY = "me-vertical-rise-scheme-v7";
  const LEGACY_SCHEME_STORAGE_KEYS = ["me-vertical-rise-scheme-v6", "me-vertical-rise-scheme-v5", "me-vertical-rise-scheme-v4", "me-vertical-rise-scheme-v3", "me-vertical-rise-scheme-v2"];
  let defaultSchemeSnapshot = null;
  let applyingScheme = false;
  let persistTimer = 0;
  const schemeControlIds = [...new Set([
    ...Object.values(inputs).filter(Boolean).map((input) => input.id),
    "assetRemoveBackground", "exportPreset", "exportWidth", "exportHeight", "exportDuration", "exportFps", "customDuration",
    "globalRowAssetScale", "globalRowAssetOffsetX"
  ])];

  function collectScheme() {
    const controls = {};
    schemeControlIds.forEach((id) => {
      const field = document.getElementById(id);
      if (field) controls[id] = field.type === "checkbox" ? field.checked : field.value;
    });
    return {
      type: "me-vertical-rise", version: 21, controls, selectedAssetId,
      rowAssetGaps: [...rowAssetGaps], rowAssetGapsAfter: [...rowAssetGapsAfter],
      rowAssetScales: [...rowAssetScales], rowAssetOffsetsX: [...rowAssetOffsetsX],
      rowTextGaps: [...rowTextGaps],
      finalSlotMap: { ...finalSlotMap },
      finalSlotSettings: Object.fromEntries(Object.entries(finalSlotSettings).map(([index, setting]) => [index, normalizedFinalSlotSetting(index)])),
      assets: [...assets.values()].map((asset) => ({
        id: asset.id, label: asset.label, src: asset.src, removable: asset.removable,
        scale: asset.scale, offsetX: asset.offsetX, offsetY: asset.offsetY,
        gapBefore: asset.gapBefore, gapAfter: asset.gapAfter,
        libraryId: asset.libraryId, groupKey: asset.groupKey, kind: asset.kind,
        vectorType: asset.vectorType, vectorStyle: asset.vectorStyle
      }))
    };
  }

  const cloneScheme = (scheme) => JSON.parse(JSON.stringify(scheme));

  function migrateScheme(source) {
    const scheme = cloneScheme(source);
    if (!scheme || typeof scheme !== "object") throw new Error("方案内容不完整");
    scheme.controls ||= {};
    if (Number(scheme.version) < 3) {
      if (!scheme.controls.introWord || scheme.controls.introWord === "motivation") scheme.controls.introWord = "leveling up";
      if (!scheme.controls.nextWord || scheme.controls.nextWord === "togetherness") scheme.controls.nextWord = "leveling up";
      delete scheme.controls.iconWobbleAngle;
      delete scheme.controls.iconWobbleSpeed;
    }
    if (Number(scheme.version) < 4) {
      if (Number(scheme.controls.introDuration) === 260) scheme.controls.introDuration = 300;
      Object.values(scheme.finalSlotSettings || {}).forEach((setting) => {
        delete setting.throwAngle;
        delete setting.throwDistance;
        delete setting.turn;
        setting.rotation = 0;
      });
    }
    if (Number(scheme.version) < 5) {
      const legacyScale = Number(scheme.controls.wallAssetScale) || 92;
      const rowCount = Array.isArray(scheme.rowAssetGaps) ? scheme.rowAssetGaps.length : parseRows().length;
      if (!Array.isArray(scheme.rowAssetScales)) scheme.rowAssetScales = Array(rowCount).fill(legacyScale);
      if (!Array.isArray(scheme.rowAssetOffsetsX)) scheme.rowAssetOffsetsX = Array(rowCount).fill(0);
      delete scheme.controls.wallAssetScale;
    }
    if (Number(scheme.version) < 6) {
      scheme.controls.globalRowAssetScale = String(Number(scheme.rowAssetScales?.[0]) || 92);
      scheme.controls.globalRowAssetOffsetX = String(Number(scheme.rowAssetOffsetsX?.[0]) || 0);
    }
    if (Number(scheme.version) < 7) {
      scheme.rowAssetGapsAfter = Array.isArray(scheme.rowAssetGaps) ? [...scheme.rowAssetGaps] : [];
    }
    if (Number(scheme.version) < 8) {
      const rowCount = Array.isArray(scheme.rowAssetScales) ? scheme.rowAssetScales.length : parseRows().length;
      scheme.rowOffsetsY = Array(rowCount).fill(0);
    }
    if (Number(scheme.version) < 9) {
      const rowCount = Array.isArray(scheme.rowAssetScales) ? scheme.rowAssetScales.length : parseRows().length;
      scheme.rowTextGaps = Array(rowCount).fill(0);
      delete scheme.rowOffsetsY;
    }
    if (Number(scheme.version) < 10 && Number(scheme.controls.iconRotationDuration) < 480) {
      scheme.controls.iconRotationDuration = "680";
    }
    if (Number(scheme.version) < 11) scheme.controls.finalRestoreDuration = "40";
    if (Number(scheme.version) < 12) scheme.controls.iconSlowMotionStart = "10";
    if (Number(scheme.version) < 14) {
      scheme.controls.iconSlowMotionStart = "80";
      scheme.controls.finalRestoreDuration = "20";
      Object.values(scheme.finalSlotSettings || {}).forEach((setting) => {
        delete setting.turnSpeed;
        delete setting.returnSpeed;
      });
    }
    if (Number(scheme.version) < 15) scheme.controls.iconSlowMotionStart = "50";
    if (Number(scheme.version) < 16) scheme.controls.iconSlowMotionStart = "0";
    if (Number(scheme.version) < 17) {
      scheme.controls.iconSlowMotionStart = "80";
      scheme.controls.finalRestoreStep = "140";
    }
    if (Number(scheme.version) < 18) scheme.controls.iconSlowMotionStart = "0";
    if (Number(scheme.version) < 19) scheme.controls.iconSlowMotionStart = "80";
    if (Number(scheme.version) < 21) scheme.controls.finalDuration = "0";
    scheme.version = 21;
    return scheme;
  }

  function renderRowOverview(time = 0) {
    if (!rowOverviewCanvas || rowOverviewPanel.hidden) return;
    const rows = effectiveWallRows();
    const [logicalWidth, logicalHeight] = exportDimensions();
    const width = 720;
    const height = Math.max(240, Math.min(1600, Math.round(width * logicalHeight / logicalWidth)));
    if (rowOverviewCanvas.width !== width || rowOverviewCanvas.height !== height) {
      rowOverviewCanvas.width = width;
      rowOverviewCanvas.height = height;
    }
    const context = rowOverviewCanvas.getContext("2d");
    const preset = window.STGFontLibrary?.preset(inputs.font.value) || fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const unitScale = height / 900;
    const fontPx = Math.max(8, Number(inputs.wallFontSize.value) * unitScale);
    const lineHeight = Math.max(fontPx * .66, fontPx + Number(inputs.lineGap.value) * unitScale);
    const requestedWallZoom = Number(inputs.wallScale.value) / 100;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = inputs.background.value;
    context.fillRect(0, 0, width, height);
    context.font = `${preset.style} ${preset.weight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;
    const previewRowTextGaps = rows.map((_, index) =>
      (Number(inputs.wallTextGap.value) + (Number(rowTextGaps[index]) || 0)) * unitScale
    );
    const layouts = rows.map((line, index) => layoutTokens(context, line, fontPx,
      fontPx * rowAssetScales[index] / 100, previewRowTextGaps[index],
      previewRowTextGaps[index] + (Number(rowAssetGaps[index]) || 0) * unitScale, false));
    const plainWidths = rows.map((line, index) => neutralRowWidth(
      context, line, fontPx, fontPx * (Number($("#globalRowAssetScale").value) || 100) / 100,
      previewRowTextGaps[index]
    ));
    const fixedFrameWidth = Math.max(...plainWidths, fontPx);
    const segments = rows.map((line, index) => layoutRowSegments(context, line, fontPx,
      fontPx * rowAssetScales[index] / 100, previewRowTextGaps[index],
      previewRowTextGaps[index] + (Number(rowAssetGaps[index]) || 0) * unitScale,
      previewRowTextGaps[index] + (Number(rowAssetGapsAfter[index]) || 0) * unitScale,
      fixedFrameWidth));
    const startX = -fixedFrameWidth / 2;
    const fit = wallFrameFit(
      layouts, segments, startX,
      rowAssetOffsetsX.map((value) => (Number(value) || 0) * unitScale),
      requestedWallZoom, width, height, lineHeight, fontPx, rows.length
    );
    const wallZoom = requestedWallZoom * fit;
    const renderedLineHeight = lineHeight * wallZoom;
    const startY = height / 2 - (rows.length - 1) * renderedLineHeight / 2;
    layouts.forEach((layout, index) => {
      context.save();
      context.translate(width / 2, startY + index * renderedLineHeight);
      context.scale(wallZoom, wallZoom);
      if (segments[index]) {
        drawRowSegments(context, segments[index], startX, (Number(rowAssetOffsetsX[index]) || 0) * unitScale, 0, inputs.foreground.value, time);
      } else {
        drawSequence(context, layout, startX, 0, inputs.foreground.value, 0, time, 0, false);
      }
      context.restore();
    });
    rowOverviewCanvas.dataset.columnAnchorX = startX.toFixed(4);
    rowOverviewCanvas.dataset.logicalColumnAnchor = (startX / unitScale).toFixed(4);
    rowOverviewCanvas.dataset.layoutFit = fit.toFixed(6);
    rowOverviewCanvas.dataset.fixedRowFrameWidth = fixedFrameWidth.toFixed(3);
    rowOverviewCanvas.dataset.rowFrameWidths = segments.map((row) => (row?.width || fixedFrameWidth).toFixed(3)).join(",");
    rowOverviewCanvas.dataset.rowRightTextAnchors = segments.map((row) => (row ? startX + row.rightX : startX + fixedFrameWidth).toFixed(3)).join(",");
    rowOverviewCanvas.dataset.rowRightEdges = segments.map((row) => (startX + (row?.width || fixedFrameWidth)).toFixed(3)).join(",");
    rowOverviewCanvas.dataset.rowTextGaps = rowTextGaps.join(",");
    rowOverviewCanvas.dataset.rowWidths = plainWidths.map((width) => width.toFixed(3)).join(",");
    $("#rowOverviewStatus").textContent = `${rows.length} 行 · ${logicalWidth} × ${logicalHeight}`;
  }

  function restoreSchemeAssets(items) {
    assets.clear();
    (items || []).forEach((item) => {
      addAsset(item.id, item.label, item.src, Boolean(item.removable), item);
      Object.assign(assets.get(item.id), {
        scale: Number(item.scale) || 1, offsetX: Number(item.offsetX) || 0, offsetY: Number(item.offsetY) || 0,
        gapBefore: Number(item.gapBefore) || 0, gapAfter: Number(item.gapAfter) || 0
      });
    });
    ensureSharedAssets();
    uploadSerial = Math.max(0, ...[...assets.keys()].map((id) => Number(String(id).replace(/^img/, "")) || 0));
  }

  function applyScheme(scheme, message = "方案已载入。") {
    if (!scheme?.controls) throw new Error("方案内容不完整");
    applyingScheme = true;
    schemeControlIds.forEach((id) => {
      const field = document.getElementById(id);
      if (!field || !(id in scheme.controls)) return;
      if (field.type === "checkbox") field.checked = Boolean(scheme.controls[id]);
      else field.value = String(scheme.controls[id]);
    });
    if (Array.isArray(scheme.assets) && scheme.assets.length) restoreSchemeAssets(scheme.assets);
    rowAssetGaps = Array.isArray(scheme.rowAssetGaps) ? scheme.rowAssetGaps.map(Number) : [];
    rowAssetGapsAfter = Array.isArray(scheme.rowAssetGapsAfter) ? scheme.rowAssetGapsAfter.map(Number) : [];
    rowAssetScales = Array.isArray(scheme.rowAssetScales) ? scheme.rowAssetScales.map(Number) : [];
    rowAssetOffsetsX = Array.isArray(scheme.rowAssetOffsetsX) ? scheme.rowAssetOffsetsX.map(Number) : [];
    rowTextGaps = Array.isArray(scheme.rowTextGaps) ? scheme.rowTextGaps.map(Number) : [];
    finalSlotMap = scheme.finalSlotMap && typeof scheme.finalSlotMap === "object" ? { ...scheme.finalSlotMap } : {};
    finalSlotSettings = scheme.finalSlotSettings && typeof scheme.finalSlotSettings === "object" ? { ...scheme.finalSlotSettings } : {};
    selectedAssetId = assets.has(scheme.selectedAssetId) ? scheme.selectedAssetId : assets.keys().next().value;
    layoutCache.clear();
    syncRowAssetGaps();
    renderAssetGrid();
    renderSelectedAssets();
    renderFinalSlotEditor();
    syncAssetTuner();
    $("#customSize").hidden = $("#exportPreset").value !== "custom";
    $("#customDurationWrap").hidden = $("#exportDuration").value !== "custom";
    updateOutputs();
    syncStagePreview();
    restartPlayback();
    applyingScheme = false;
    $("#schemeStatus").textContent = message;
  }

  function scheduleSchemePersist() {
    if (applyingScheme) return;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme()));
        $("#schemeStatus").textContent = "已自动保存当前方案。";
      } catch (error) {
        $("#schemeStatus").textContent = `自动保存失败：${error.message || "浏览器存储空间不足"}`;
      }
    }, 320);
  }

  $("#controlPanel").addEventListener("input", (event) => {
    if (event.target.type !== "file" && !event.target.closest(".transport")) scheduleSchemePersist();
  });
  rowOverviewPanel.addEventListener("input", scheduleSchemePersist);
  $("#saveScheme").addEventListener("click", () => {
    const scheme = collectScheme();
    try { localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(scheme)); } catch (_) {}
    downloadBlob(new Blob([JSON.stringify(scheme, null, 2)], { type: "application/json" }), "vertical-rise-scheme.json");
    $("#schemeStatus").textContent = "方案已保存到本机，并下载了 JSON。";
  });
  $("#importScheme").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      applyScheme(migrateScheme(JSON.parse(await file.text())), "方案已导入，文字、素材和时间轴均已重建。");
      localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme()));
    } catch (error) {
      $("#schemeStatus").textContent = `导入失败：${error.message}`;
    }
  });
  $("#resetScheme").addEventListener("click", () => {
    applyScheme(cloneScheme(defaultSchemeSnapshot), "已恢复纵跃默认示例。");
    localStorage.removeItem(SCHEME_STORAGE_KEY);
  });
  $("#clearScheme").addEventListener("click", () => {
    const blank = cloneScheme(defaultSchemeSnapshot);
    blank.controls.rowsInput = "纵跃";
    blank.controls.introWord = "leveling up";
    blank.controls.nextWord = "leveling up";
    blank.finalSlotMap = {};
    blank.finalSlotSettings = {};
    blank.assets = blank.assets.filter((asset) => !asset.removable);
    applyScheme(blank, "已清理文字和上传素材，可从空白内容重新编辑。");
    scheduleSchemePersist();
  });

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    const dimensions = String(preset || "1920x1080").split("x").map(Number);
    return dimensions.every((value) => Number.isFinite(value) && value > 0) ? dimensions : [1920, 1080];
  }

  function syncStagePreview() {
    if (PREVIEW) return;
    const [rawWidth, rawHeight] = exportDimensions();
    const targetWidth = Math.max(240, rawWidth || 1920);
    const targetHeight = Math.max(240, rawHeight || 1080);
    const aspect = targetWidth / targetHeight;
    const panel = $("#controlPanel");
    const compact = window.innerWidth <= 720;
    const panelRight = compact || !panel?.open ? 0 : panel.getBoundingClientRect().right;
    const gutter = compact ? 10 : 18;
    const availableLeft = panelRight + gutter;
    const availableWidth = Math.max(120, window.innerWidth - availableLeft - gutter);
    const availableHeight = Math.max(120, (compact ? window.innerHeight * .58 : window.innerHeight) - gutter * 2);
    let stageWidth = Math.min(availableWidth, availableHeight * aspect);
    let stageHeight = stageWidth / aspect;
    if (stageHeight > availableHeight) { stageHeight = availableHeight; stageWidth = stageHeight * aspect; }
    const stage = $("#currentStage");
    stage.style.setProperty("--current-stage-left", `${Math.round(availableLeft + (availableWidth - stageWidth) / 2)}px`);
    stage.style.setProperty("--current-stage-top", `${Math.round(gutter + (availableHeight - stageHeight) / 2)}px`);
    stage.style.setProperty("--current-stage-width", `${Math.max(1, Math.round(stageWidth))}px`);
    stage.style.setProperty("--current-stage-height", `${Math.max(1, Math.round(stageHeight))}px`);
    $("#canvasSizeReadout").textContent = `${targetWidth} × ${targetHeight} · ${aspect.toFixed(3)}:1`;
  }

  function makeExportCanvas() {
    const [width, height] = exportDimensions();
    const result = document.createElement("canvas");
    result.width = Math.max(240, Math.min(3840, width));
    result.height = Math.max(240, Math.min(3840, height));
    return result;
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    exportStatus.textContent = message;
  }

  $("#exportPreset").addEventListener("change", (event) => {
    $("#customSize").hidden = event.currentTarget.value !== "custom";
    syncStagePreview();
  });
  [$("#exportWidth"), $("#exportHeight")].forEach((input) => input.addEventListener("input", syncStagePreview));
  $("#controlPanel").addEventListener("toggle", syncStagePreview);
  window.addEventListener("resize", syncStagePreview, { passive: true });
  $("#exportDuration").addEventListener("change", (event) => {
    $("#customDurationWrap").hidden = event.currentTarget.value !== "custom";
  });

  function selectedExportDuration() {
    const value = $("#exportDuration").value;
    if (value === "cycle") return inputs.motionMode.value === "choreography" ? choreographyTiming().cycle : 4;
    if (value === "custom") return Math.max(.5, Math.min(30, Number($("#customDuration").value) || 4));
    return Number(value) || 4;
  }

  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `vertical-rise-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新页面后重试。";
      return;
    }
    const output = makeExportCanvas();
    const gifFps = Math.min(30, Number($("#exportFps").value) || 15);
    const duration = selectedExportDuration();
    const frameTotal = Math.max(1, Math.ceil(gifFps * duration));
    setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    try {
      const gif = new GIF({
        workers: 2, quality: 10, width: output.width, height: output.height,
        workerScript: "js/continuation-gif.worker.js"
      });
      for (let frame = 0; frame < frameTotal; frame += 1) {
        renderFrame(output, frame / gifFps, output.width, output.height, 1);
        gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
      }
      gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => {
        downloadBlob(blob, `vertical-rise-${output.width}x${output.height}.gif`);
        setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height}`);
      });
      gif.render();
    } catch (error) {
      console.error(error);
      setExportBusy(false, "GIF 编码失败，请缩小尺寸后重试。");
    }
  });

  $("#exportVideo").addEventListener("click", async () => {
    if (!window.HME || typeof HME.createH264MP4Encoder !== "function") {
      exportStatus.textContent = "MP4 编码器未加载，请刷新页面后重试。";
      return;
    }
    const output = makeExportCanvas();
    output.width = Math.round(output.width / 2) * 2;
    output.height = Math.round(output.height / 2) * 2;
    const context = output.getContext("2d", { willReadFrequently: true });
    const videoFps = Number($("#exportFps").value) || 30;
    const duration = selectedExportDuration();
    const frameTotal = Math.max(1, Math.ceil(videoFps * duration));
    let encoder;
    setExportBusy(true, `正在导出 MP4 · 0 / ${frameTotal} 帧`);
    try {
      encoder = await HME.createH264MP4Encoder();
      encoder.outputFilename = `vertical-rise-${output.width}x${output.height}.mp4`;
      encoder.width = output.width;
      encoder.height = output.height;
      encoder.frameRate = videoFps;
      encoder.kbps = 18000;
      encoder.groupOfPictures = 15;
      encoder.initialize();
      for (let frame = 0; frame < frameTotal; frame += 1) {
        renderFrame(output, frame / videoFps, output.width, output.height, 1);
        encoder.addFrameRgba(context.getImageData(0, 0, output.width, output.height).data);
        if (frame % 2 === 0) {
          exportStatus.textContent = `正在导出 MP4 · ${Math.round((frame + 1) / frameTotal * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), encoder.outputFilename);
      setExportBusy(false, `MP4 已生成 · ${output.width} × ${output.height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      console.error(error);
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder?.delete(); } catch (_) {}
    }
  });

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  async function initializeEditor() {
    if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
    syncRowAssetGaps();
    renderAssetGrid();
    renderSelectedAssets();
    renderFinalSlotEditor();
    syncAssetTuner();
    updateOutputs();
    syncPlaybackControls();
    syncStagePreview();
    const fallbackDefaultScheme = collectScheme();
    try {
      const response = await fetch("assets/presets/vertical-rise-default.json?v=20260901-1");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      defaultSchemeSnapshot = migrateScheme(await response.json());
    } catch (error) {
      console.warn("纵跃默认示例读取失败，使用页面内置示例。", error);
      defaultSchemeSnapshot = fallbackDefaultScheme;
    }
    let storedScheme = null;
    if (!PREVIEW && !FROM_GALLERY) {
      try {
        const storedValue = localStorage.getItem(SCHEME_STORAGE_KEY)
          || LEGACY_SCHEME_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
        storedScheme = JSON.parse(storedValue || "null");
      }
      catch (_) { $("#schemeStatus").textContent = "本机方案读取失败，已使用默认示例。"; }
    }
    if (storedScheme?.controls) {
      applyScheme(migrateScheme(storedScheme), "已恢复上次自动保存的纵跃方案。");
      try { localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme())); } catch (_) {}
    }
    else applyScheme(cloneScheme(defaultSchemeSnapshot), PREVIEW ? "" : "已载入纵跃默认示例。");
    if (FROM_GALLERY) {
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("from");
      history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }
    document.fonts.ready.finally(previewLoop);
  }

  initializeEditor();
})();
