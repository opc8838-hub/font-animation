(() => {
  "use strict";

  const PREVIEW = new URLSearchParams(location.search).has("preview");
  const DEFAULT_SCHEME_URL = "assets/presets/water-flow-default.json?v=20260830-28";
  if (PREVIEW) {
    document.documentElement.classList.add("is-preview");
    document.body.classList.add("is-preview");
  }

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    rows: $("#rowsInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    lineGap: $("#lineGap"), speed: $("#speed"), assetScale: $("#assetScale"), assetGap: $("#assetGap"), wallRowsMode: $("#wallRowsMode"), wallRows: $("#wallRows"),
    wave: $("#wave"), waveRate: $("#waveRate"), vertical: $("#vertical"),
    repeatGap: $("#repeatGap"), background: $("#backgroundColor"), foreground: $("#textColor"),
    motionMode: $("#motionMode"), introWord: $("#introWord"), introStyle: $("#introStyle"), introHold: $("#introHold"),
    reversePull: $("#reversePull"), burst: $("#burst"), finalLine: $("#finalLine"), finalSwap: $("#finalSwap"),
    introLeft: $("#introLeft"), introReturn: $("#introReturn"), popDuration: $("#popDuration"),
    revealStagger: $("#revealStagger"), exitStagger: $("#exitStagger"),
    fullDuration: $("#fullDuration"), exitDuration: $("#exitDuration"), finalDuration: $("#finalDuration"),
    retreatDuration: $("#retreatDuration"), reversalDuration: $("#reversalDuration"), rowExitDuration: $("#rowExitDuration"),
    swapMoment: $("#swapMoment"), swapInterval: $("#swapInterval"), finalScanSpeed: $("#finalScanSpeed"),
    iconHoldDuration: $("#iconHoldDuration"), assetItemScale: $("#assetItemScale"),
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
  let rowSettings = [];
  let animationStart = performance.now();
  let pausedAt = 0;
  let paused = false;
  let rafId = 0;
  let activeTokenInput = inputs.rows;
  let selectedAssetId = "music";
  let selectedFinalSlot = 0;
  let finalSlotMap = {};
  let finalSlotSettings = {};

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
    };
    image.src = src;
    assets.set(id, asset);
    assetRevision += 1;
    layoutCache.clear();
  }

  builtIns.forEach(([id, label, src]) => addAsset(id, label, src));
  window.TokenAssetTools.animalAssets().forEach(({ id, label, src }) => addAsset(id, label, src));
  [
    "bloub-capsule-colere-brun.gif", "bloub-cercle-attentif-violet.gif", "bloub-cercle-curieux-encre.gif",
    "bloub-galet-blase-orange.gif", "bloub-galet-somnolent-rouge.gif", "bloub-goutte-curieux-turquoise.gif",
    "bloub-hexagone-surpris-gris.gif", "bloub-nuage-mefiant-rouge.gif", "bloub-nuage-neutre-bleu.gif",
    "bloub-squircle-effraye-orange.gif", "bloub-triangle-mefiant-ambre.gif"
  ].forEach((filename, index) => addAsset(`bot${index + 1}`, `Bot ${String(index + 1).padStart(2, "0")}`, `assets/bot-series/${filename}`));
  addAsset("rainbow", "彩虹圆环", `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff3b30"/><stop offset=".2" stop-color="#ffcc00"/><stop offset=".4" stop-color="#34c759"/><stop offset=".6" stop-color="#00c7ff"/><stop offset=".8" stop-color="#5856d6"/><stop offset="1" stop-color="#ff2d95"/></linearGradient></defs><circle cx="50" cy="50" r="32" fill="none" stroke="url(#g)" stroke-width="15"/></svg>')}`);

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
    return rows.length ? rows.slice(0, 24) : ["everything"];
  }

  function plainLabel(line) {
    return line.replace(/\{\{([^{}]+)\}\}/g, (_, id) => `[${assets.get(id)?.label || id}]`);
  }

  function syncRowSettings() {
    const rows = parseRows();
    rowSettings = rows.map((_, index) => rowSettings[index] || {
      direction: -1,
      speed: 82 + (index * 13) % 37,
      phase: (index * 27) % 100
    });
    const list = $("#rowFlowList");
    list.replaceChildren();

    rows.forEach((line, index) => {
      const setting = rowSettings[index];
      const item = document.createElement("div");
      item.className = "row-flow-item";
      item.innerHTML = `
        <div class="row-flow-head"><span class="row-flow-title"></span><span>ROW ${String(index + 1).padStart(2, "0")}</span></div>
        <div class="row-flow-tools">
          <div class="row-direction" aria-label="第 ${index + 1} 行流向">
            <button type="button" data-direction="-1" title="向左流">←</button>
            <button type="button" data-direction="1" title="向右流">→</button>
          </div>
          <div class="row-sliders">
            <label>速度<input class="row-speed" type="range" min="20" max="200" value="${Math.max(20, Number(setting.speed) || 20)}"><output>${Math.max(20, Number(setting.speed) || 20)}%</output></label>
            <label>相位<input class="row-phase" type="range" min="0" max="100" value="${setting.phase}"><output>${setting.phase}%</output></label>
          </div>
        </div>`;
      item.querySelector(".row-flow-title").textContent = plainLabel(line);
      item.querySelectorAll("[data-direction]").forEach((button) => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.direction) === setting.direction));
        button.addEventListener("click", () => {
          setting.direction = Number(button.dataset.direction);
          item.querySelectorAll("[data-direction]").forEach((candidate) => {
            candidate.setAttribute("aria-pressed", String(candidate === button));
          });
        });
      });
      [[".row-speed", "speed"], [".row-phase", "phase"]].forEach(([selector, key]) => {
        const slider = item.querySelector(selector);
        const output = slider.nextElementSibling;
        slider.addEventListener("input", () => {
          setting[key] = Number(slider.value);
          output.textContent = `${setting[key]}%`;
        });
      });
      list.append(item);
    });
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
    if (!select) return;
    const labels = {
      current: "当前基础图标", flow: "流动图标", gifMotion: "GIF 动图",
      animals: "透明动物表情", bots: "Bot 动态表情", uploads: "我的上传"
    };
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
    return Array.from(inputs.finalLine.value.replace(/\r?\n/g, " ") || "everything");
  }

  function normalizedFinalSlotSetting(index) {
    const setting = finalSlotSettings[index] || {};
    return {
      scale: Math.max(40, Math.min(240, Number(setting.scale) || 100)),
      gapBefore: Math.max(-40, Math.min(120, Number(setting.gapBefore) || 0)),
      gapAfter: Math.max(-40, Math.min(120, Number(setting.gapAfter) || 0)),
      offsetX: Math.max(-120, Math.min(120, Number(setting.offsetX) || 0)),
      offsetY: Math.max(-120, Math.min(120, Number(setting.offsetY) || 0))
    };
  }

  function syncFinalSlotTuner() {
    const tuner = $("#finalSlotTuner");
    const mappedAsset = assets.get(finalSlotMap[selectedFinalSlot]);
    if (!tuner) return;
    tuner.hidden = !mappedAsset;
    if (!mappedAsset) return;
    const setting = normalizedFinalSlotSetting(selectedFinalSlot);
    finalSlotSettings[selectedFinalSlot] = setting;
    $("#finalSlotTunerTitle").textContent = `第 ${selectedFinalSlot + 1} 个字 · ${finalCharacters()[selectedFinalSlot]} → ${mappedAsset.label}`;
    [["finalSlotScale", "finalSlotScaleOut", setting.scale, "%"],
      ["finalSlotGapBefore", "finalSlotGapBeforeOut", setting.gapBefore, ""],
      ["finalSlotGapAfter", "finalSlotGapAfterOut", setting.gapAfter, ""],
      ["finalSlotOffsetX", "finalSlotOffsetXOut", setting.offsetX, ""],
      ["finalSlotOffsetY", "finalSlotOffsetYOut", setting.offsetY, ""]].forEach(([inputId, outputId, value, suffix]) => {
      $("#" + inputId).value = String(value);
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
    Object.keys(finalSlotSettings).forEach((index) => {
      if (!finalSlotMap[index]) delete finalSlotSettings[index];
    });
    if (!characters.length) selectedFinalSlot = -1;
    else if (selectedFinalSlot < 0 || selectedFinalSlot >= characters.length || /^\s$/.test(characters[selectedFinalSlot])) selectedFinalSlot = characters.findIndex((character) => !/^\s$/.test(character));
  }

  function renderFinalSlotEditor() {
    normalizeFinalSlotMap();
    const characters = finalCharacters();
    const editor = $("#finalSlotEditor");
    if (!editor) return;
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
      button.title = asset ? `第 ${index + 1} 个字符“${character}”使用 ${asset.label}` : `选择第 ${index + 1} 个字符“${character}”`;
      if (asset) {
        const image = document.createElement("img");
        image.src = asset.src;
        image.alt = asset.label;
        button.append(image);
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
    const status = $("#finalSlotStatus");
    if (!character) status.textContent = "请先输入最后一行文字。";
    else if (mappedAsset) status.textContent = `第 ${selectedFinalSlot + 1} 个字“${character}”当前为 ${mappedAsset.label}；已选素材：${selectedAsset?.label || "无"}。`;
    else status.textContent = `已选第 ${selectedFinalSlot + 1} 个字“${character}”；当前素材：${selectedAsset?.label || "无"}。`;
    $("#assignFinalAsset").disabled = !character || !selectedAsset;
    $("#removeFinalAsset").disabled = !mappedAsset;
    syncFinalSlotTuner();
  }

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
    snapshotHistory();
    scheduleSchemePersist();
  });

  $("#removeFinalAsset").addEventListener("click", () => {
    delete finalSlotMap[selectedFinalSlot];
    delete finalSlotSettings[selectedFinalSlot];
    renderFinalSlotEditor();
    renderSelectedAssets();
    snapshotHistory();
    scheduleSchemePersist();
  });

  [["finalSlotScale", "scale", "finalSlotScaleOut", "%"],
    ["finalSlotGapBefore", "gapBefore", "finalSlotGapBeforeOut", ""],
    ["finalSlotGapAfter", "gapAfter", "finalSlotGapAfterOut", ""],
    ["finalSlotOffsetX", "offsetX", "finalSlotOffsetXOut", ""],
    ["finalSlotOffsetY", "offsetY", "finalSlotOffsetYOut", ""]].forEach(([inputId, key, outputId, suffix]) => {
    const input = $("#" + inputId);
    input.addEventListener("input", () => {
      if (!finalSlotMap[selectedFinalSlot]) return;
      const setting = normalizedFinalSlotSetting(selectedFinalSlot);
      setting[key] = Number(input.value);
      finalSlotSettings[selectedFinalSlot] = setting;
      $("#" + outputId).textContent = `${input.value}${suffix}`;
      scheduleSchemePersist();
    });
    input.addEventListener("change", snapshotHistory);
  });

  inputs.finalLine.addEventListener("input", () => {
    const cleanValue = inputs.finalLine.value.replace(/\r?\n/g, " ");
    if (inputs.finalLine.value !== cleanValue) inputs.finalLine.value = cleanValue;
    renderFinalSlotEditor();
    renderSelectedAssets();
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
    snapshotHistory();
    scheduleSchemePersist();
  }

  function renderSelectedAssets() {
    const entries = usedAssetEntries();
    $("#selectedAssetCount").textContent = String(entries.length);
    const list = $("#selectedAssetList");
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "selected-asset-empty";
      empty.textContent = "文字内容里还没有图片或图标。请先从素材库选择，再点“插入到光标”。";
      list.append(empty);
      return;
    }
    entries.forEach(({ asset, count }) => {
      const row = document.createElement("article");
      row.className = "selected-asset-row";
      row.classList.toggle("is-active", asset.id === selectedAssetId);
      row.dataset.assetId = asset.id;
      row.innerHTML = `<img alt=""><span><b></b><small></small></span><button class="edit-used-asset" type="button">单独编辑</button><button class="remove-used-asset" type="button" aria-label="从文字中移除">×</button>`;
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
    const toggle = $("#toggleAssetManager");
    toggle.textContent = expanded ? "收起" : "展开已选";
    toggle.setAttribute("aria-expanded", String(expanded));
    document.body.classList.toggle("asset-manager-open", expanded);
    if (!expanded) $("#assetEditorDrawer").hidden = true;
    else manager.scrollTop = 0;
  }

  $("#toggleAssetManager").addEventListener("click", () => {
    setAssetManager(!$("#assetManager").classList.contains("is-list-expanded"));
  });
  $("#closeAssetEditor").addEventListener("click", () => { $("#assetEditorDrawer").hidden = true; });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#assetEditorDrawer").hidden) $("#assetEditorDrawer").hidden = true;
    else if ($("#assetManager").classList.contains("is-list-expanded")) setAssetManager(false);
  });
  window.addEventListener("resize", () => {
    if ($("#assetEditorDrawer").hidden) return;
    const editorWidth = $("#controlPanel")?.getBoundingClientRect().width || 420;
    $("#assetEditorDrawer").style.setProperty("--asset-drawer-left", `${editorWidth}px`);
  }, { passive: true });

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
    snapshotHistory();
  }

  $("#insertSelectedAsset").addEventListener("click", () => {
    const asset = assets.get(selectedAssetId);
    if (!asset) return;
    insertToken(asset.id);
    $("#assetProcessStatus").textContent = `已把“${asset.label}”插入到当前光标位置。`;
  });

  [inputs.rows, inputs.introWord].forEach((field) => {
    field.addEventListener("focus", () => { activeTokenInput = field; });
    field.addEventListener("input", renderSelectedAssets);
  });

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
      if (finalSlotMap[index] === id) {
        delete finalSlotMap[index];
        delete finalSlotSettings[index];
      }
    });
    syncRowSettings();
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
        $("#assetProcessStatus").textContent = `${file.name} · ${result.status} · 已选中但尚未插入，可先单独编辑。`;
        snapshotHistory();
        scheduleSchemePersist();
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
  const easeOutBack = (value) => {
    const x = clamp01(value) - 1;
    return 1 + 2.35 * x * x * x + 1.35 * x * x;
  };
  const hermiteTurn = (value, startSlope, endSlope = 0) => {
    const x = clamp01(value);
    return (-2 * x * x * x + 3 * x * x)
      + startSlope * (x * x * x - 2 * x * x + x)
      + endSlope * (x * x * x - x * x);
  };
  const rangeProgress = (value, from, to) => clamp01((value - from) / (to - from));

  function layoutTokens(context, line, fontPx, assetHeight, repeatGap, assetGap) {
    const cacheKey = [line, context.font, fontPx.toFixed(3), assetHeight.toFixed(3), repeatGap.toFixed(3), assetGap.toFixed(3), assetRevision].join("|");
    const cached = layoutCache.get(cacheKey);
    if (cached) return cached;
    const items = tokensFor(line).map((token) => {
      if (token.type === "text") return { ...token, width: context.measureText(token.value).width };
      const asset = assets.get(token.id);
      const tunedHeight = assetHeight * (asset?.scale || 1);
      const drawWidth = tunedHeight * (asset?.ratio || 1);
      const beforeGap = assetGap + (asset?.gapBefore || 0) * fontPx / 100;
      const afterGap = assetGap + (asset?.gapAfter || 0) * fontPx / 100;
      return { ...token, asset, drawWidth, beforeGap, afterGap, width: drawWidth + beforeGap + afterGap, height: tunedHeight };
    });
    const layout = { items, width: Math.max(fontPx, items.reduce((sum, item) => sum + item.width, 0) + repeatGap) };
    if (layoutCache.size > 240) layoutCache.clear();
    layoutCache.set(cacheKey, layout);
    return layout;
  }

  function drawSequence(context, layout, x, y, color, assetRotation = 0) {
    let cursor = x;
    context.fillStyle = color;
    layout.items.forEach((item) => {
      if (item.type === "text") {
        context.fillText(item.value, cursor, y);
      } else if (item.asset?.ready) {
        const contentX = cursor + item.beforeGap;
        const drawX = contentX + item.height * item.asset.offsetX / 100;
        const drawY = y + item.height * item.asset.offsetY / 100;
        if (assetRotation) {
          context.save();
          context.translate(drawX + item.drawWidth / 2, drawY);
          context.rotate(assetRotation);
          context.drawImage(item.asset.image, -item.drawWidth / 2, -item.height / 2, item.drawWidth, item.height);
          context.restore();
        } else {
          context.drawImage(item.asset.image, drawX, drawY - item.height / 2, item.drawWidth, item.height);
        }
      } else {
        context.save();
        context.strokeStyle = color;
        context.lineWidth = Math.max(1, item.height * .045);
        context.strokeRect(cursor + item.beforeGap + 1, y - item.height / 2, Math.max(2, item.drawWidth - 2), item.height);
        context.restore();
      }
      cursor += item.width;
    });
  }

  function drawRepeatedLine(context, layout, y, width, color, shift, alpha = 1, assetRotation = 0) {
    let x = -mod(shift, layout.width) - layout.width;
    context.save();
    context.globalAlpha *= clamp01(alpha);
    while (x < width + layout.width) {
      drawSequence(context, layout, x, y, color, assetRotation);
      x += layout.width;
    }
    context.restore();
  }

  function layoutFinalText(context, text) {
    const characters = Array.from(text || "everything");
    let prefix = "";
    let previousWidth = 0;
    const slots = characters.map((character, index) => {
      prefix += character;
      const nextWidth = context.measureText(prefix).width;
      const width = Math.max(1, nextWidth - previousWidth);
      const slot = { character, index, x: previousWidth, width, center: previousWidth + width / 2 };
      previousWidth = nextWidth;
      return slot;
    });
    return { slots, width: previousWidth };
  }

  function finalScanCount() {
    const characterCount = finalCharacters().length;
    const mappedCount = Object.keys(finalSlotMap).filter((index) => Number(index) < characterCount && finalSlotMap[index]).length;
    return Math.max(1, mappedCount);
  }

  function finalScanTiming() {
    const speed = Math.max(.5, Math.min(8, Number(inputs.finalScanSpeed.value)));
    const speedRatio = speed / 4;
    const transitionMs = Math.max(45, Math.min(220, 100 / speedRatio));
    const holdMs = Math.max(40, Math.min(1200, Number(inputs.iconHoldDuration.value) / speedRatio));
    const stepMs = Math.max(35, Math.min(1200, Number(inputs.swapInterval.value) / speedRatio));
    return { transition: transitionMs / 1000, hold: holdMs / 1000, step: stepMs / 1000 };
  }

  function finalScanDuration(count, scanTiming) {
    const sweepDuration = Math.max(0, count - 1) * scanTiming.step + scanTiming.transition;
    return sweepDuration * 2 + scanTiming.hold;
  }

  function drawFinalAsset(context, asset, centerX, centerY, width, height, time) {
    if (asset.kind === "vector" && window.STGIconLibrary?.drawVector) {
      context.save();
      context.translate(centerX, centerY);
      context.scale(width / Math.max(1, height), 1);
      window.STGIconLibrary.drawVector(context, asset, height, time);
      context.restore();
      return;
    }
    context.drawImage(asset.image, centerX - width / 2, centerY - height / 2, width, height);
  }

  function drawFinalLine(context, text, centerX, y, color, assetHeight, sequenceElapsed, scanTiming, unitScale) {
    const layout = layoutFinalText(context, text);
    const mappedSlots = layout.slots.filter((slot) => assets.get(finalSlotMap[slot.index])?.ready);
    const activeReplacements = new Map();
    const enterSweepEnd = Math.max(0, mappedSlots.length - 1) * scanTiming.step + scanTiming.transition;
    const restoreSweepStart = enterSweepEnd + scanTiming.hold;
    if (inputs.finalSwap.value === "on") mappedSlots.forEach((slot, order) => {
      const enterStart = order * scanTiming.step;
      const restoreStart = restoreSweepStart + order * scanTiming.step;
      if (sequenceElapsed < enterStart || sequenceElapsed >= restoreStart + scanTiming.transition) return;
      const asset = assets.get(finalSlotMap[slot.index]);
      const enterRaw = rangeProgress(sequenceElapsed, enterStart, enterStart + scanTiming.transition);
      const exitRaw = rangeProgress(sequenceElapsed, restoreStart, restoreStart + scanTiming.transition);
      const slotSetting = normalizedFinalSlotSetting(slot.index);
      const requestedHeight = assetHeight * slotSetting.scale / 100;
      const requestedWidth = requestedHeight * (asset.ratio || 1);
      const gapBefore = slotSetting.gapBefore * unitScale;
      const gapAfter = slotSetting.gapAfter * unitScale;
      const requiredWidth = Math.max(1, requestedWidth + gapBefore + gapAfter);
      const closeRaw = rangeProgress(sequenceElapsed, restoreStart + scanTiming.transition * .15, restoreStart + scanTiming.transition);
      const openProgress = Math.max(0, easeOutBack(enterRaw) * (1 - smooth(closeRaw)));
      activeReplacements.set(slot.index, {
        slot, asset, enterRaw, exitRaw,
        swap: enterRaw >= .45 && exitRaw < .55,
        requestedHeight, requestedWidth, requiredWidth, gapBefore,
        offsetX: slotSetting.offsetX * unitScale,
        offsetY: slotSetting.offsetY * unitScale,
        widthDelta: (requiredWidth - slot.width) * openProgress,
        openProgress
      });
    });

    const dynamicWidths = layout.slots.map((slot) => Math.max(1, slot.width + (activeReplacements.get(slot.index)?.widthDelta || 0)));
    const dynamicWidth = dynamicWidths.reduce((sum, width) => sum + width, 0);
    const startX = centerX - dynamicWidth / 2;
    context.fillStyle = color;

    let cursorX = startX;
    layout.slots.forEach((slot) => {
      const dynamicSlotWidth = dynamicWidths[slot.index];
      const slotCenterX = cursorX + dynamicSlotWidth / 2;
      const replacement = activeReplacements.get(slot.index);

      if (replacement?.swap) {
        const { asset, enterRaw, exitRaw, requestedHeight, requestedWidth, requiredWidth, gapBefore, offsetX, offsetY, openProgress } = replacement;
        const iconEnter = rangeProgress(enterRaw, .45, 1);
        const iconExit = rangeProgress(exitRaw, 0, .55);
        const popScale = Math.min(1.08, .72 + easeOutBack(iconEnter) * .28);
        const replacementScale = popScale * (1 - smooth(iconExit) * .18);
        const drawHeight = requestedHeight * replacementScale;
        const drawWidth = requestedWidth * replacementScale;
        const lift = -Math.sin(Math.PI * clamp01(iconEnter)) * requestedHeight * .055;
        const fullCenterOffset = (dynamicSlotWidth - requiredWidth) / 2 + gapBefore + requestedWidth / 2;
        const iconCenterOffset = lerp(slot.width / 2, fullCenterOffset, clamp01(openProgress));
        const drawCenterX = cursorX + iconCenterOffset + offsetX;
        const drawCenterY = y + lift + offsetY;
        context.save();
        drawFinalAsset(context, asset, drawCenterX, drawCenterY, drawWidth, drawHeight, sequenceElapsed);
        context.restore();
      } else {
        let glyphScaleX = 1;
        let glyphScaleY = 1;
        if (replacement) {
          if (replacement.enterRaw < .45) {
            const prepare = easeOut(rangeProgress(replacement.enterRaw, 0, .45));
            glyphScaleX = 1 - prepare * .12;
            glyphScaleY = 1 + prepare * .035;
          } else {
            const restore = easeOutBack(rangeProgress(replacement.exitRaw, .55, 1));
            glyphScaleX = .9 + restore * .1;
            glyphScaleY = 1.04 - restore * .04;
          }
        }
        context.save();
        context.translate(slotCenterX, y);
        context.scale(glyphScaleX, glyphScaleY);
        context.fillText(slot.character, -slot.width / 2, 0);
        context.restore();
      }
      cursorX += dynamicSlotWidth;
    });
  }

  function choreographyTiming() {
    const introMoveDuration = Number(inputs.introLeft.value) / 1000;
    const introHold = Number(inputs.introHold.value) / 1000;
    const baseDuration = [introMoveDuration + introHold, inputs.introReturn, inputs.popDuration, inputs.fullDuration, inputs.exitDuration]
      .map((value) => typeof value === "number" ? value : Number(value.value) / 1000);
    const end = [];
    baseDuration.reduce((sum, value, index) => {
      end[index] = sum + value;
      return end[index];
    }, 0);
    const finalSequenceStart = end[3] + baseDuration[4] * Number(inputs.swapMoment.value) / 100;
    const scanTiming = finalScanTiming();
    const finalSequenceDuration = finalScanDuration(finalScanCount(), scanTiming);
    const finalSequenceEnd = finalSequenceStart + finalSequenceDuration;
    const finalHold = Number(inputs.finalDuration.value) / 1000;
    const outroDuration = .16;
    const outroStart = Math.max(end[4], finalSequenceEnd) + finalHold;
    const finalEnd = outroStart + outroDuration;
    const duration = [...baseDuration, finalEnd - end[4]];
    return {
      cycle: finalEnd, duration,
      leftEnd: end[0], returnEnd: end[1], popEnd: end[2],
      fullEnd: end[3], exitEnd: end[4], finalEnd,
      introMoveEnd: introMoveDuration, introHold,
      finalSequenceStart, finalSequenceEnd, finalHold, outroStart, outroDuration
    };
  }

  function choreographyPhase(timing, localTime) {
    const phases = timelineBeats(timing).map((beat) => [beat.name, beat.start, beat.end]);
    return phases.find(([, start, end]) => localTime >= start && localTime < end) || phases[phases.length - 1];
  }

  function timelineBeats(timing = choreographyTiming()) {
    return [
      { kind: "intro", name: "开场弹入与停留", start: 0, end: timing.leftEnd },
      { kind: "orbit", name: "切入并铺满", start: timing.leftEnd, end: timing.popEnd },
      { kind: "hold", name: "铺满后继续向左", start: timing.popEnd, end: timing.fullEnd },
      { kind: "contact", name: "向右带动并回收", start: timing.fullEnd, end: timing.exitEnd },
      { kind: "replace", name: "双向扫变并收尾", start: timing.exitEnd, end: timing.finalEnd }
    ].map((beat, index) => ({ ...beat, index, duration: Math.max(0, beat.end - beat.start) }));
  }

  function renderTimeline() {
    const track = $("#flowTimelineTrack");
    const list = $("#flowTimelineList");
    if (!track || !list) return;
    const timing = choreographyTiming();
    const beats = timelineBeats(timing);
    track.replaceChildren();
    list.replaceChildren();
    beats.forEach((beat) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `flow-timeline-beat me-choreo-block is-${beat.kind}`;
      button.style.setProperty("--beat-width", String(Math.max(.035, beat.duration / Math.max(.001, timing.cycle))));
      button.style.flex = `${Math.max(.08, beat.duration)} 1 0`;
      button.dataset.beatIndex = String(beat.index);
      button.innerHTML = `<em>${beat.index + 1}</em><strong>${beat.name}</strong><small>${beat.duration.toFixed(2)}秒</small>`;
      button.addEventListener("click", () => setTime(beat.start + .001));
      track.append(button);

      const row = document.createElement("li");
      row.className = "flow-timeline-row";
      row.innerHTML = `<i class="is-${beat.kind}"></i><b>${beat.index + 1}. ${beat.name}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      list.append(row);
    });
    const overlap = document.createElement("button");
    overlap.type = "button";
    overlap.className = "flow-timeline-overlap";
    overlap.dataset.start = timing.finalSequenceStart.toFixed(6);
    overlap.dataset.exitEnd = timing.exitEnd.toFixed(6);
    overlap.style.left = `${(timing.finalSequenceStart / timing.cycle * 100).toFixed(3)}%`;
    overlap.style.width = `${((timing.finalSequenceEnd - timing.finalSequenceStart) / timing.cycle * 100).toFixed(3)}%`;
    overlap.textContent = "字母 → 图标 → 字母";
    overlap.title = `收尾从 ${timing.finalSequenceStart.toFixed(2)} 秒提前插入`;
    overlap.addEventListener("click", () => setTime(timing.finalSequenceStart + .001));
    track.append(overlap);

    const overlapRow = document.createElement("li");
    overlapRow.className = "flow-timeline-row is-overlap";
    overlapRow.innerHTML = `<i></i><b>收尾提前插入</b><span>${timing.finalSequenceStart.toFixed(2)}s → ${timing.finalSequenceEnd.toFixed(2)}s</span>`;
    list.append(overlapRow);
    const playhead = document.createElement("i");
    playhead.className = "flow-timeline-playhead me-choreo-playhead";
    playhead.id = "flowTimelinePlayhead";
    playhead.setAttribute("aria-hidden", "true");
    track.append(playhead);
    $("#flowTimeline").classList.toggle("is-continuous", inputs.motionMode.value !== "choreography");
  }

  function updateTimelinePlayhead(time, timing) {
    const playhead = $("#flowTimelinePlayhead");
    if (!playhead) return;
    const progress = inputs.motionMode.value === "choreography" ? clamp01(time / Math.max(.001, timing.cycle)) : 0;
    playhead.style.left = `${(progress * 100).toFixed(3)}%`;
    const active = timelineBeats(timing).find((beat) => time >= beat.start && time < beat.end)?.index ?? 0;
    document.querySelectorAll("[data-beat-index]").forEach((element) => {
      element.classList.toggle("is-active", Number(element.dataset.beatIndex) === active);
    });
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
    const preset = fontPresets[inputs.font.value] || fontPresets["snap-inter-medium"];
    const scale = h / 900;
    const fontPx = Math.max(8, Number(inputs.fontSize.value) * scale);
    const lineHeight = Math.max(fontPx * .66, fontPx + Number(inputs.lineGap.value) * scale);
    const assetHeight = fontPx * Number(inputs.assetScale.value) / 100;
    const repeatGap = Number(inputs.repeatGap.value) * scale;
    const assetGap = Number(inputs.assetGap.value) * scale;
    const masterSpeed = Number(inputs.speed.value) / 100;
    const waveAmp = Number(inputs.wave.value) * scale;
    const waveRate = Number(inputs.waveRate.value) / 100;
    const verticalSpeed = Number(inputs.vertical.value) * scale;
    // Auto mode preserves the original full-screen wall: row count follows
    // the actual canvas height, font size and line height. A fixed row count
    // is only used after the user explicitly switches to custom mode.
    const autoLaneCount = Math.ceil(h / lineHeight) + 6;
    const customLaneCount = Math.max(3, Number(inputs.wallRows.value) || 9);
    const halfLanes = inputs.wallRowsMode.value === "auto"
      ? Math.ceil(autoLaneCount / 2)
      : Math.floor(customLaneCount / 2);
    const renderedLaneCount = halfLanes * 2 + 1;
    if (target === canvas) {
      canvas.dataset.wallRowsMode = inputs.wallRowsMode.value;
      canvas.dataset.wallRowsResolved = String(renderedLaneCount);
      const rowOutput = $("#wallRowsOut");
      const rowLabel = inputs.wallRowsMode.value === "auto" ? `自动 · ${renderedLaneCount}行` : `${renderedLaneCount}行`;
      if (rowOutput.textContent !== rowLabel) rowOutput.textContent = rowLabel;
    }
    const choreography = inputs.motionMode.value === "choreography";
    const timing = choreographyTiming();
    const localTime = choreography ? mod(time, timing.cycle) : time;
    const verticalOffset = Math.sin(localTime * .34) * verticalSpeed * 1.8;

    const sharedPreset = window.STGFontLibrary?.preset(inputs.font.value);
    const activePreset = sharedPreset || preset;
    const activeFamily = window.STGFontLibrary?.family(inputs.font.value) || `"${activePreset.family}", "Continuation SC", sans-serif`;
    context.font = `${activePreset.style || "normal"} ${activePreset.weight} ${fontPx}px ${activeFamily}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;

    if (choreography && localTime < timing.leftEnd) {
      const introFontPx = fontPx * 1.12;
      const introAssetHeight = assetHeight * 1.12;
      context.font = `${activePreset.style || "normal"} ${activePreset.weight} ${introFontPx}px ${activeFamily}`;
      const introLayout = layoutTokens(context, inputs.introWord.value.trim() || "for", introFontPx, introAssetHeight, 0, assetGap);
      const introEnter = rangeProgress(localTime, 0, Math.max(.001, timing.introMoveEnd));
      const introEase = easeOut(introEnter);
      const isJumpLeft = inputs.introStyle.value === "jump-left";
      const drift = isJumpLeft
        ? lerp(0, -fontPx * .72, smooth(introEnter))
        : lerp(fontPx * .06, -fontPx * .18, introEase);
      const introLift = 0;
      const introScale = isJumpLeft
        ? lerp(.94, 1, introEase) + Math.sin(Math.PI * introEnter) * .012
        : lerp(.985, 1, introEase) + Math.sin(Math.PI * introEnter) * .004;
      context.save();
      context.globalAlpha *= easeOut(rangeProgress(introEnter, 0, .55));
      context.translate(w / 2 + drift, h / 2 + introLift);
      context.scale(introScale, introScale);
      drawSequence(context, introLayout, -introLayout.width / 2, 0, inputs.foreground.value);
      context.restore();
      context.font = `${activePreset.style || "normal"} ${activePreset.weight} ${fontPx}px ${activeFamily}`;
    }

    const burstStrength = Number(inputs.burst.value) / 100;
    const exitProgress = rangeProgress(localTime, timing.fullEnd, timing.exitEnd);
    const finalProgress = rangeProgress(localTime, timing.exitEnd, timing.finalEnd);
    const outroProgress = rangeProgress(localTime, timing.outroStart, timing.finalEnd);
    const finalSequenceActive = choreography && localTime >= timing.finalSequenceStart;
    const initialScale = 1 + .08 * burstStrength;
    let wallScale = 1;
    let revealLimit = halfLanes + 1;
    let wallAlpha = 1;
    let finalStage = false;

    if (choreography) {
      if (localTime < timing.leftEnd) wallAlpha = 0;
      else if (localTime < timing.popEnd) {
        const formationProgress = rangeProgress(localTime, timing.leftEnd, timing.popEnd);
        const returnCut = timing.duration[1] / Math.max(.001, timing.duration[1] + timing.duration[2]);
        // Rows start flowing left as soon as they appear. This spring only
        // supplies the centre-out spring and never gates horizontal travel.
        const settleEnd = Math.min(.72, returnCut + .28);
        wallScale = lerp(initialScale, 1, easeOut(rangeProgress(formationProgress, 0, settleEnd)));
        revealLimit = halfLanes + 1;
      } else if (localTime < timing.fullEnd) {
        revealLimit = halfLanes + 1;
      } else if (localTime < timing.exitEnd) {
        wallScale = 1;
        revealLimit = halfLanes + 1;
      } else {
        finalStage = true;
        wallScale = 1;
        revealLimit = 0;
        wallAlpha = 1 - smoother(outroProgress);
      }
    }

    const localWidth = w / wallScale;
    context.save();
    context.translate(w / 2, h / 2);
    context.scale(wallScale, wallScale);
    context.translate(-localWidth / 2, 0);
    if (choreography && outroProgress > 0) {
      const outroEase = smoother(outroProgress);
      const outroScale = 1 - outroEase * .055;
      context.translate(localWidth / 2, -fontPx * .12 * outroEase);
      context.scale(outroScale, outroScale);
      context.translate(-localWidth / 2, 0);
    }

    const formationActive = choreography && localTime >= timing.leftEnd && localTime < timing.popEnd;
    const formationElapsed = Math.max(0, localTime - timing.leftEnd);
    const formationDuration = Math.max(.001, timing.popEnd - timing.leftEnd);
    const revealStaggerRequested = Number(inputs.revealStagger.value) / 1000;
    const revealFade = Math.max(.07, Math.min(formationDuration * .34, Math.max(.1, revealStaggerRequested * 2.2)));
    const revealStagger = halfLanes > 0
      ? Math.min(revealStaggerRequested, Math.max(0, formationDuration - revealFade) / halfLanes)
      : 0;
    const exitDuration = Math.max(.001, timing.exitEnd - timing.fullEnd);
    const exitElapsed = Math.max(0, localTime - timing.fullEnd);
    // The outer top/bottom rows leave as a pair, followed by the next pair,
    // until only the centre row remains. One stagger step therefore
    // represents a symmetric pair rather than an individual row.
    const visibleHalfLanes = Math.max(1, Math.ceil(h / (2 * lineHeight)));
    const exitPairCount = visibleHalfLanes;
    const exitStaggerRequested = Number(inputs.exitStagger.value) / 1000;
    const exitFade = Math.max(.08, Math.min(exitDuration, Number(inputs.rowExitDuration.value) / 1000));
    const exitStagger = exitPairCount > 1
      ? Math.min(exitStaggerRequested, Math.max(0, exitDuration - exitFade) / (exitPairCount - 1))
      : 0;

    for (let laneIndex = -halfLanes; laneIndex <= halfLanes; laneIndex += 1) {
      if (choreography && finalStage && laneIndex !== 0) continue;
      const sourceIndex = mod(laneIndex, rows.length);
      const setting = rowSettings[sourceIndex] || { direction: -1, speed: 100, phase: 0 };
      const line = rows[sourceIndex];
      const layout = layoutTokens(context, line, fontPx, assetHeight, repeatGap, assetGap);
      const laneDistance = Math.abs(laneIndex);
      let rowAlpha = laneDistance <= revealLimit ? 1 : 0;
      let rowFormationProgress = 1;
      let rowFormationEase = 1;
      let rowExitProgress = 0;
      if (formationActive) {
        const revealStart = laneDistance * revealStagger;
        const rowFormationRaw = rangeProgress(formationElapsed, revealStart, revealStart + revealFade);
        rowFormationProgress = smoother(rowFormationRaw);
        rowFormationEase = easeOutBack(rowFormationRaw);
        // Rows used to travel all the way out from y=0 while fading. Several
        // translucent copies therefore crossed already-visible rows and read
        // as grey ghosting. Keep each row opaque and reveal it close to its
        // own lane; the stagger still provides the centre-out progression.
        rowAlpha *= rowFormationProgress > .035 ? 1 : 0;
      }
      if (choreography && localTime >= timing.fullEnd && localTime < timing.exitEnd && laneIndex !== 0) {
        const outerToCentreOrder = Math.max(0, visibleHalfLanes - Math.min(Math.abs(laneIndex), visibleHalfLanes));
        const disappearStart = outerToCentreOrder * exitStagger;
        const rowExitRaw = rangeProgress(exitElapsed, disappearStart, disappearStart + exitFade);
        // Exact time-reverse of the opening back-ease: a tiny outward load,
        // then a crisp spring toward the centre. Keep the whole row opaque so
        // it pops away intact instead of looking wiped or faded.
        rowExitProgress = 1 - easeOutBack(1 - rowExitRaw);
        rowAlpha *= rowExitRaw < .96 ? 1 : 0;
      }
      if (rowAlpha <= .001 || wallAlpha <= .001) continue;

      const yWave = Math.sin(localTime * waveRate * 1.45 + laneIndex * .72) * waveAmp * .28;
      const xWave = Math.sin(localTime * waveRate * .92 + laneIndex * .91) * waveAmp;
      const targetY = laneIndex * lineHeight;
      const formationOffset = formationActive && laneIndex !== 0
        ? -Math.sign(laneIndex) * lineHeight * (.42 + .24 * burstStrength) * (1 - rowFormationEase)
        : 0;
      const exitContractionOffset = choreography && localTime >= timing.fullEnd && localTime < timing.exitEnd && laneIndex !== 0
        ? -Math.sign(laneIndex) * lineHeight * .72 * rowExitProgress
        : 0;
      const y = targetY + formationOffset + exitContractionOffset
        + (verticalOffset + yWave) * (formationActive ? rowFormationProgress : 1);
      const rowSpeed = Math.max(20, Number(setting.speed) || 20);
      const rowDirection = setting.direction === 0 ? -1 : setting.direction;
      const velocity = fontPx * 1.45 * masterSpeed * (rowSpeed / 100);
      const signedShiftRate = rowDirection < 0 ? velocity : -velocity;
      // Horizontal flow begins with the first revealed row. fullDuration is
      // only the additional left-flow time after the wall is completely full.
      const leftFlowDuration = choreography ? Math.max(0, timing.fullEnd - timing.leftEnd) : timing.fullEnd;
      const leftFlowClock = choreography
        ? Math.max(0, Math.min(localTime, timing.fullEnd) - timing.leftEnd)
        : localTime;
      const signedTravel = leftFlowClock * signedShiftRate;

      let groupRight = 0;
      let rightTurnProgress = 0;
      const exitMovementElapsed = Math.max(0, localTime - timing.fullEnd);
      const rightDuration = Math.min(Number(inputs.retreatDuration.value) / 1000, timing.duration[4]);
      const rightForce = Math.max(.3, Number(inputs.reversePull.value) / 100);
      if (choreography && localTime >= timing.fullEnd) {
        // Every row carries the incoming left velocity immediately. The
        // stagger controls only the centre-out contraction, never movement.
        const flowWindow = Math.max(.04, Math.min(rightDuration, timing.duration[4]));
        const rowElapsed = exitMovementElapsed;
        const reversalDuration = Math.max(.04, Number(inputs.reversalDuration.value) / 1000);
        const flowProgress = rangeProgress(rowElapsed, 0, Math.min(timing.duration[4], flowWindow));
        const pushDistance = localWidth * .24 * rightForce;
        const matchedSlope = Math.abs(signedShiftRate) * flowWindow / Math.max(1, pushDistance);
        const turnSharpness = Math.max(.8, Math.min(1.35, .28 / reversalDuration));
        const startSlope = Math.max(.22, Math.min(.9, matchedSlope * 1.08 * turnSharpness));
        const endSlope = Math.max(.55, Math.min(1.15, startSlope * 1.35));
        rightTurnProgress = hermiteTurn(flowProgress, startSlope, endSlope);
        const carriedRight = Math.max(0, rowElapsed - flowWindow) * pushDistance * endSlope / flowWindow;
        groupRight = pushDistance * rightTurnProgress + carriedRight;
      }

      let centerAnchorX = localWidth / 2 - layout.width / 2;
      let centerMotionX = localWidth / 2;
      const exitEntryWave = Math.sin(timing.fullEnd * waveRate * .92 + laneIndex * .91) * waveAmp;
      const exitEntryShift = leftFlowDuration * signedShiftRate + setting.phase / 100 * layout.width + exitEntryWave;
      if (choreography && localTime >= timing.fullEnd && laneIndex === 0) {
        const entrySignedTravel = leftFlowDuration * signedShiftRate;
        const entryXWave = Math.sin(timing.fullEnd * waveRate * .92) * waveAmp;
        const entryShift = entrySignedTravel + setting.phase / 100 * layout.width + entryXWave;
        const entryCenteredAnchor = w / 2 - layout.width / 2;
        const entryRepeatedAnchor = -mod(entryShift, layout.width) - layout.width;
        const entryApproachAnchor = entryRepeatedAnchor + Math.floor((entryCenteredAnchor - entryRepeatedAnchor) / layout.width) * layout.width;
        const entryOffset = (entryApproachAnchor - entryCenteredAnchor) * localWidth / w;
        centerAnchorX += entryOffset * (1 - rightTurnProgress);
        centerMotionX = centerAnchorX + layout.width / 2;
      }

      if ((finalStage || finalSequenceActive) && laneIndex === 0) {
        const finalText = inputs.finalLine.value.trim() || "everything";
        const sequenceElapsed = Math.max(0, localTime - timing.finalSequenceStart);
        const scanTiming = finalScanTiming();
        // Keep the final line on the same carried trajectory as the centre row
        // so the editable insertion moment does not introduce a motion cut.
        context.save();
        context.globalAlpha *= rowAlpha * wallAlpha;
        drawFinalLine(context, finalText, centerMotionX, 0, inputs.foreground.value, assetHeight, sequenceElapsed, scanTiming, scale);
        context.restore();
        continue;
      }

      const shift = signedTravel + setting.phase / 100 * layout.width + xWave - groupRight;
      if (choreography && localTime >= timing.fullEnd && laneIndex === 0) {
        drawRepeatedLine(context, layout, y, localWidth, inputs.foreground.value, exitEntryShift - groupRight, rowAlpha * wallAlpha);
      } else if (choreography && localTime >= timing.fullEnd && localTime < timing.exitEnd && laneIndex !== 0) {
        drawRepeatedLine(context, layout, y, localWidth, inputs.foreground.value, exitEntryShift - groupRight, rowAlpha * wallAlpha);
      } else {
        drawRepeatedLine(context, layout, y, localWidth, inputs.foreground.value, shift, rowAlpha * wallAlpha);
      }
    }
    context.restore();
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
    const timing = choreographyTiming();
    const displayTime = inputs.motionMode.value === "choreography" ? mod(time, timing.cycle) : time;
    frameCounter.textContent = `F ${String(Math.round(displayTime * fps)).padStart(4, "0")}`;
    if (inputs.motionMode.value === "choreography") {
      const [phaseName, phaseStart, phaseEnd] = choreographyPhase(timing, displayTime);
      const phaseDuration = Math.max(0, phaseEnd - phaseStart);
      if (canvas.dataset.motionPhase !== phaseName) canvas.dataset.motionPhase = phaseName;
      canvas.dataset.phaseDuration = phaseDuration.toFixed(3);
      const status = `当前：${phaseName} · 本段 ${phaseDuration.toFixed(2)} 秒 · 一轮 ${timing.cycle.toFixed(2)} 秒`;
      if ($("#timingReadout").textContent !== status) $("#timingReadout").textContent = status;
      updateTimelinePlayhead(displayTime, timing);
    } else {
      canvas.dataset.motionPhase = "持续满屏水流";
      delete canvas.dataset.phaseDuration;
      const status = "当前：持续满屏水流 · 不进入下一阶段";
      if ($("#timingReadout").textContent !== status) $("#timingReadout").textContent = status;
      updateTimelinePlayhead(0, timing);
    }
    rafId = requestAnimationFrame(previewLoop);
  }

  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }

  function syncPlaybackControls() {
    const label = paused ? "播放" : "暂停";
    $("#pauseButton").textContent = paused ? "继续" : "暂停";
    $("#stagePauseIcon").textContent = paused ? "▶" : "Ⅱ";
    $("#stagePauseLabel").textContent = label;
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
    const formatSeconds = (seconds) => `${seconds.toFixed(2)}秒`;
    const values = {
      fontSizeOut: inputs.fontSize.value,
      lineGapOut: inputs.lineGap.value,
      speedOut: `${(Number(inputs.speed.value) / 100).toFixed(2)}×`,
      assetScaleOut: `${inputs.assetScale.value}%`,
      assetGapOut: inputs.assetGap.value,
      wallRowsOut: inputs.wallRowsMode.value === "auto" ? "自动铺满" : `${inputs.wallRows.value}行`,
      waveOut: inputs.wave.value,
      waveRateOut: (Number(inputs.waveRate.value) / 100).toFixed(2),
      verticalOut: inputs.vertical.value,
      repeatGapOut: inputs.repeatGap.value,
      cycleDurationOut: formatSeconds(timing.cycle),
      reversePullOut: `${(Number(inputs.reversePull.value) / 100).toFixed(2)}×`,
      burstOut: `${inputs.burst.value}%`,
      introLeftOut: inputs.introLeft.value,
      introHoldOut: `${(Number(inputs.introHold.value) / 1000).toFixed(2)}秒`,
      introReturnOut: Math.round(timing.duration[1] * 1000),
      popDurationOut: formatSeconds(timing.duration[1] + timing.duration[2]),
      revealStaggerOut: `${inputs.revealStagger.value}ms`,
      fullDurationOut: formatSeconds(timing.duration[3]),
      retreatDurationOut: formatSeconds(Math.min(Number(inputs.retreatDuration.value) / 1000, timing.duration[4])),
      reversalDurationOut: formatSeconds(Number(inputs.reversalDuration.value) / 1000),
      rowExitDurationOut: formatSeconds(Math.min(Number(inputs.rowExitDuration.value) / 1000, timing.duration[4])),
      exitDurationOut: formatSeconds(timing.duration[4]),
      exitStaggerOut: `${inputs.exitStagger.value}ms`,
      finalDurationOut: formatSeconds(Number(inputs.finalDuration.value) / 1000),
      swapMomentOut: `消失 ${inputs.swapMoment.value}%`,
      swapIntervalOut: `${(Number(inputs.swapInterval.value) / 1000).toFixed(2)}秒`,
      finalScanSpeedOut: `${Number(inputs.finalScanSpeed.value).toFixed(1)}×`,
      iconHoldDurationOut: `${inputs.iconHoldDuration.value}ms`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    inputs.wallRows.disabled = inputs.wallRowsMode.value === "auto";
    document.documentElement.style.setProperty("--text-color", inputs.foreground.value);
    renderTimeline();
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  inputs.fullDuration.addEventListener("input", () => {
    if (inputs.motionMode.value !== "choreography") return;
    // Direct manipulation: every slider movement previews this exact stage,
    // so short values such as 0.20 s can be judged without waiting a full loop.
    setTime(choreographyTiming().popEnd);
  });
  inputs.speed.addEventListener("input", () => {
    if (inputs.motionMode.value === "choreography") setTime(choreographyTiming().popEnd + .02);
  });
  [inputs.popDuration, inputs.revealStagger].forEach((input) => {
    input.addEventListener("input", () => {
      if (inputs.motionMode.value === "choreography") setTime(choreographyTiming().leftEnd + .02);
    });
  });
  [inputs.exitDuration, inputs.exitStagger, inputs.retreatDuration, inputs.reversePull, inputs.reversalDuration, inputs.rowExitDuration].forEach((input) => {
    input.addEventListener("input", () => {
      if (inputs.motionMode.value === "choreography") setTime(choreographyTiming().fullEnd + .02);
    });
  });
  [inputs.rowExitDuration, inputs.exitStagger].forEach((input) => {
    input.addEventListener("input", () => {
      const required = Number(inputs.rowExitDuration.value) + Number(inputs.exitStagger.value) * 5;
      if (Number(inputs.exitDuration.value) >= required) return;
      inputs.exitDuration.value = String(Math.min(Number(inputs.exitDuration.max), Math.ceil(required / 10) * 10));
      updateOutputs();
    });
  });
  [inputs.finalDuration, inputs.swapMoment, inputs.swapInterval, inputs.finalScanSpeed, inputs.iconHoldDuration].forEach((input) => {
    input.addEventListener("input", () => {
      if (inputs.motionMode.value !== "choreography") return;
      const timing = choreographyTiming();
      setTime(timing.finalSequenceStart + .02);
    });
  });
  [inputs.assetItemScale, inputs.assetOffsetX, inputs.assetOffsetY, inputs.assetGapBefore, inputs.assetGapAfter].forEach((input) => {
    input.addEventListener("input", () => {
      updateSelectedAsset();
      scheduleSchemePersist();
    });
    input.addEventListener("change", snapshotHistory);
  });
  inputs.rows.addEventListener("input", syncRowSettings);
  inputs.motionMode.addEventListener("change", () => setTime(0));
  [inputs.introStyle, inputs.introLeft, inputs.introHold].forEach((input) => {
    input.addEventListener("input", () => {
      if (inputs.motionMode.value === "choreography") setTime(0);
    });
  });

  const SCHEME_STORAGE_KEY = "me-water-flow-scheme-v2";
  const SCHEME_VERSION = 16;
  let defaultSchemeSnapshot = null;
  let applyingScheme = false;
  let persistTimer = 0;
  let historyIndex = -1;
  const schemeHistory = [];
  const schemeControlIds = [...new Set([
    ...Object.values(inputs).filter(Boolean).map((input) => input.id),
    "assetRemoveBackground", "exportPreset", "exportWidth", "exportHeight", "exportDuration", "exportFps", "customDuration"
  ])];

  function collectScheme() {
    const controls = {};
    schemeControlIds.forEach((id) => {
      const field = document.getElementById(id);
      if (!field) return;
      controls[id] = field.type === "checkbox" ? field.checked : field.value;
    });
    return {
      type: "me-water-flow",
      version: SCHEME_VERSION,
      controls,
      selectedAssetId,
      finalSlotMap: { ...finalSlotMap },
      finalSlotSettings: Object.fromEntries(Object.entries(finalSlotSettings).map(([index, setting]) => [index, normalizedFinalSlotSetting(index)])),
      rowSettings: rowSettings.map((setting) => ({ ...setting })),
      assets: [...assets.values()].map((asset) => ({
        id: asset.id, label: asset.label, src: asset.src, removable: asset.removable,
        scale: asset.scale, offsetX: asset.offsetX, offsetY: asset.offsetY,
        gapBefore: asset.gapBefore, gapAfter: asset.gapAfter,
        libraryId: asset.libraryId, groupKey: asset.groupKey, kind: asset.kind,
        vectorType: asset.vectorType, vectorStyle: asset.vectorStyle
      }))
    };
  }

  function cloneScheme(scheme) { return JSON.parse(JSON.stringify(scheme)); }

  function restoreSchemeAssets(items) {
    assets.clear();
    (items || []).forEach((item) => {
      addAsset(item.id, item.label, item.src, Boolean(item.removable), item);
      const asset = assets.get(item.id);
      Object.assign(asset, {
        scale: Number(item.scale) || 1,
        offsetX: Number(item.offsetX) || 0,
        offsetY: Number(item.offsetY) || 0,
        gapBefore: Number(item.gapBefore) || 0,
        gapAfter: Number(item.gapAfter) || 0
      });
    });
    ensureSharedAssets();
    uploadSerial = Math.max(0, ...[...assets.keys()].map((id) => Number(String(id).replace(/^img/, "")) || 0));
  }

  function migrateLegacyFinalLine(value) {
    const states = String(value || "").split(/\r?\n/).map((state) => state.trim()).filter(Boolean);
    const plainText = [...states].reverse().find((state) => !/\{\{[^{}]+\}\}/.test(state)) || "everything";
    const plainLength = Array.from(plainText).length;
    const slotMap = {};
    states.forEach((state) => {
      let slotIndex = 0;
      let cursor = 0;
      for (const match of state.matchAll(/\{\{([^{}]+)\}\}/g)) {
        slotIndex += Array.from(state.slice(cursor, match.index)).length;
        if (slotIndex < plainLength) slotMap[slotIndex] = match[1];
        slotIndex += 1;
        cursor = match.index + match[0].length;
      }
    });
    return { plainText, slotMap };
  }

  function applyScheme(scheme, message = "方案已载入。") {
    if (!scheme || !scheme.controls) throw new Error("方案内容不完整");
    applyingScheme = true;
    const migratedControls = { ...scheme.controls };
    if (Number(scheme.version || 0) < 3) {
      if (Number(migratedControls.swapInterval) === 200) migratedControls.swapInterval = 520;
      if (Number(migratedControls.finalDuration) === 1100) migratedControls.finalDuration = 2600;
    }
    let migratedFinalSlotMap = scheme.finalSlotMap && typeof scheme.finalSlotMap === "object" ? { ...scheme.finalSlotMap } : null;
    let migratedFinalSlotSettings = scheme.finalSlotSettings && typeof scheme.finalSlotSettings === "object" ? { ...scheme.finalSlotSettings } : {};
    if (Number(scheme.version || 0) < 4 || !migratedFinalSlotMap) {
      const migratedFinal = migrateLegacyFinalLine(migratedControls.finalLine);
      migratedControls.finalLine = migratedFinal.plainText;
      migratedFinalSlotMap = migratedFinal.slotMap;
      if (migratedControls.exportPreset === "current") migratedControls.exportPreset = "1920x1080";
    }
    if (Number(scheme.version || 0) < 5) {
      const previousFinalDuration = Math.max(0, Number(migratedControls.finalDuration) || 600);
      const revealDuration = Math.max(100, Number(migratedControls.swapInterval) || 220);
      migratedControls.swapMoment = 68;
      migratedControls.iconHoldDuration = 120;
      migratedControls.restoreSweepDuration = revealDuration;
      migratedControls.finalDuration = Math.max(120, previousFinalDuration - revealDuration - 120);
    }
    if (Number(scheme.version || 0) < 6) {
      migratedControls.reversalDuration = 280;
      migratedControls.rowExitDuration = 480;
      const stagger = Math.max(0, Number(migratedControls.exitStagger) || 0);
      migratedControls.exitDuration = Math.max(Number(migratedControls.exitDuration) || 0, 480 + stagger * 5);
    }
    if (Number(scheme.version || 0) < 7) {
      migratedControls.reversePull = Math.max(30, Number(migratedControls.reversePull) || 0);
    }
    if (Number(scheme.version || 0) < 8) {
      if (Number(migratedControls.introLeft) === 270) migratedControls.introLeft = 120;
      if (Number(migratedControls.introReturn) === 150) migratedControls.introReturn = 70;
      if (Number(migratedControls.popDuration) === 1080) migratedControls.popDuration = 280;
      if (Number(migratedControls.revealStagger) === 25) migratedControls.revealStagger = 30;
      if (Number(migratedControls.fullDuration) === 250) migratedControls.fullDuration = 350;
      if (Number(migratedControls.retreatDuration) === 650) migratedControls.retreatDuration = 320;
      if (Number(migratedControls.reversalDuration) === 280) migratedControls.reversalDuration = 90;
      if (Number(migratedControls.rowExitDuration) === 480) migratedControls.rowExitDuration = 180;
      if (Number(migratedControls.exitStagger) === 90) migratedControls.exitStagger = 45;
      if (Number(migratedControls.exitDuration) === 950) migratedControls.exitDuration = 450;
      if (Number(migratedControls.finalDuration) === 240) migratedControls.finalDuration = 140;
    }
    if (Number(scheme.version || 0) < 9) {
      migratedControls.finalAssetScale ??= 100;
      migratedControls.finalAssetGap ??= 0;
    }
    if (Number(scheme.version || 0) < 10) {
      if (Number(migratedControls.swapInterval) === 220) migratedControls.swapInterval = 70;
      if (Number(migratedControls.iconHoldDuration) === 120) migratedControls.iconHoldDuration = 20;
      if (Number(migratedControls.restoreSweepDuration) === 220) migratedControls.restoreSweepDuration = 70;
    }
    if (Number(scheme.version || 0) < 11) {
      migratedControls.finalScanSpeed ??= 4;
      if (Number(migratedControls.swapInterval) === 70) migratedControls.swapInterval = 80;
      if (Number(migratedControls.iconHoldDuration) === 20) migratedControls.iconHoldDuration = 160;
    }
    if (Number(scheme.version || 0) < 14) {
      Object.keys(migratedFinalSlotMap || {}).forEach((index) => {
        migratedFinalSlotSettings[index] = {
          scale: Number(migratedControls.finalAssetScale) || 100,
          gapBefore: Number(migratedControls.finalAssetGap) || 0,
          gapAfter: Number(migratedControls.finalAssetGap) || 0,
          offsetX: 0,
          offsetY: 0
        };
      });
    }
    if (Number(scheme.version || 0) < 15) {
      migratedControls.introStyle ??= "gentle-left";
      migratedControls.introHold ??= 160;
    }
    if (Number(scheme.version || 0) < 16 && Number(migratedControls.introLeft) === 120) {
      migratedControls.introLeft = 260;
    }
    schemeControlIds.forEach((id) => {
      const field = document.getElementById(id);
      if (!field || !(id in migratedControls)) return;
      if (field.type === "checkbox") field.checked = Boolean(migratedControls[id]);
      else field.value = String(migratedControls[id]);
    });
    if (Array.isArray(scheme.assets) && scheme.assets.length) restoreSchemeAssets(scheme.assets);
    finalSlotMap = migratedFinalSlotMap || {};
    finalSlotSettings = migratedFinalSlotSettings;
    rowSettings = Array.isArray(scheme.rowSettings)
      ? scheme.rowSettings.map((setting) => ({
        ...setting,
        direction: Number(setting.direction) === 0 ? -1 : Number(setting.direction) || -1,
        speed: Math.max(20, Number(setting.speed) || 20)
      }))
      : [];
    selectedAssetId = assets.has(scheme.selectedAssetId) ? scheme.selectedAssetId : assets.keys().next().value;
    layoutCache.clear();
    syncRowSettings();
    renderAssetGrid();
    renderFinalSlotEditor();
    renderSelectedAssets();
    syncAssetTuner();
    $("#customSize").hidden = $("#exportPreset").value !== "custom";
    syncStagePreview();
    snapshotHistory();
    scheduleSchemePersist();
    updateOutputs();
    restartPlayback();
    applyingScheme = false;
    $("#schemeStatus").textContent = message;
  }

  function updateHistoryButtons() {
    if ($("#undoScheme")) $("#undoScheme").disabled = historyIndex <= 0;
    if ($("#redoScheme")) $("#redoScheme").disabled = historyIndex >= schemeHistory.length - 1;
  }

  function snapshotHistory() {
    if (applyingScheme) return;
    const serialized = JSON.stringify(collectScheme());
    if (schemeHistory[historyIndex] === serialized) return;
    schemeHistory.splice(historyIndex + 1);
    schemeHistory.push(serialized);
    if (schemeHistory.length > 30) schemeHistory.shift();
    historyIndex = schemeHistory.length - 1;
    updateHistoryButtons();
  }

  function scheduleSchemePersist() {
    if (applyingScheme) return;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme()));
        $("#schemeStatus").textContent = "已自动保存当前方案。";
      } catch (error) {
        $("#schemeStatus").textContent = `自动保存失败：${error.message || "浏览器存储空间不足"}`;
      }
    }, 320);
  }

  $("#controlPanel").addEventListener("input", (event) => {
    if (event.target.type === "file" || event.target.closest(".transport")) return;
    scheduleSchemePersist();
  });
  $("#controlPanel").addEventListener("change", (event) => {
    if (event.target.type === "file") return;
    snapshotHistory();
  });
  $("#saveScheme").addEventListener("click", () => {
    const scheme = collectScheme();
    try { localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(scheme)); } catch (_) {}
    downloadBlob(new Blob([JSON.stringify(scheme, null, 2)], { type: "application/json" }), "water-flow-scheme.json");
    $("#schemeStatus").textContent = "方案已保存到本机，并下载了 JSON。";
    snapshotHistory();
  });
  $("#importScheme").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      applyScheme(JSON.parse(await file.text()), "方案已导入，文字、素材和时间轴均已重建。");
      localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme()));
      snapshotHistory();
    } catch (error) {
      $("#schemeStatus").textContent = `导入失败：${error.message}`;
    }
  });
  $("#resetScheme").addEventListener("click", () => {
    applyScheme(cloneScheme(defaultSchemeSnapshot), "已恢复水流默认示例。" );
    localStorage.removeItem(SCHEME_STORAGE_KEY);
    snapshotHistory();
  });
  $("#clearScheme").addEventListener("click", () => {
    const blank = cloneScheme(defaultSchemeSnapshot);
    blank.controls.rowsInput = "everything";
    blank.controls.introWord = "for";
    blank.controls.finalLine = "everything";
    blank.finalSlotMap = {};
    blank.finalSlotSettings = {};
    blank.assets = blank.assets.filter((asset) => !asset.removable);
    applyScheme(blank, "已清理文字和上传素材，可从空白内容重新编辑。" );
    snapshotHistory();
    scheduleSchemePersist();
  });
  $("#undoScheme")?.addEventListener("click", () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    applyScheme(JSON.parse(schemeHistory[historyIndex]), "已撤销上一步编辑。" );
    updateHistoryButtons();
    scheduleSchemePersist();
  });
  $("#redoScheme")?.addEventListener("click", () => {
    if (historyIndex >= schemeHistory.length - 1) return;
    historyIndex += 1;
    applyScheme(JSON.parse(schemeHistory[historyIndex]), "已重做下一步编辑。" );
    updateHistoryButtons();
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
    const stageRegionHeight = compact ? window.innerHeight * .58 : window.innerHeight;
    const availableHeight = Math.max(120, stageRegionHeight - gutter * 2);
    let stageWidth = Math.min(availableWidth, availableHeight * aspect);
    let stageHeight = stageWidth / aspect;
    if (stageHeight > availableHeight) {
      stageHeight = availableHeight;
      stageWidth = stageHeight * aspect;
    }
    const left = availableLeft + (availableWidth - stageWidth) / 2;
    const top = gutter + (availableHeight - stageHeight) / 2;
    const stage = $(".current-stage");
    stage.style.setProperty("--current-stage-left", `${Math.round(left)}px`);
    stage.style.setProperty("--current-stage-top", `${Math.round(top)}px`);
    stage.style.setProperty("--current-stage-width", `${Math.max(1, Math.round(stageWidth))}px`);
    stage.style.setProperty("--current-stage-height", `${Math.max(1, Math.round(stageHeight))}px`);
    $("#canvasSizeReadout").textContent = `${targetWidth} × ${targetHeight} · ${(aspect).toFixed(3)}:1`;
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
      downloadBlob(blob, `water-flow-${output.width}x${output.height}.png`);
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
        downloadBlob(blob, `water-flow-${output.width}x${output.height}.gif`);
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
      encoder.outputFilename = `water-flow-${output.width}x${output.height}.mp4`;
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

  async function initializeEditor() {
    if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
    renderAssetGrid();
    renderSelectedAssets();
    syncAssetTuner();
    syncRowSettings();
    updateOutputs();
    syncPlaybackControls();

    // Keep a functional in-page fallback, then replace it with the approved
    // exported scheme. Editor reset and the gallery preview both use this
    // exact object so the card cannot drift from the effect page.
    defaultSchemeSnapshot = collectScheme();
    try {
      const response = await fetch(DEFAULT_SCHEME_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const approvedScheme = await response.json();
      if (approvedScheme?.type !== "me-water-flow" || !approvedScheme.controls) throw new Error("方案格式不正确");
      defaultSchemeSnapshot = cloneScheme(approvedScheme);
    } catch (error) {
      console.error("Water Flow default scheme failed to load", error);
      $("#schemeStatus").textContent = "默认方案读取失败，已使用内置备用示例。";
    }

    let storedScheme = null;
    if (!PREVIEW) {
      try {
        storedScheme = JSON.parse(localStorage.getItem(SCHEME_STORAGE_KEY) || "null");
      } catch (_) {
        $("#schemeStatus").textContent = "本机方案读取失败，已使用默认示例。";
      }
    }
    if (storedScheme?.controls) applyScheme(storedScheme, "已恢复上次自动保存的水流方案。" );
    else applyScheme(cloneScheme(defaultSchemeSnapshot), PREVIEW ? "" : "已载入水流默认示例。" );
    snapshotHistory();
    document.fonts.ready.finally(previewLoop);
  }

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  initializeEditor();
})();
