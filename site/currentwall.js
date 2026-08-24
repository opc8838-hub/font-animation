(() => {
  "use strict";

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
    motionMode: $("#motionMode"), introWord: $("#introWord"),
    reversePull: $("#reversePull"), burst: $("#burst"), finalLine: $("#finalLine"), finalSwap: $("#finalSwap"),
    introLeft: $("#introLeft"), introReturn: $("#introReturn"), popDuration: $("#popDuration"),
    revealStagger: $("#revealStagger"), exitStagger: $("#exitStagger"),
    fullDuration: $("#fullDuration"), exitDuration: $("#exitDuration"), finalDuration: $("#finalDuration"),
    retreatDuration: $("#retreatDuration"), swapMoment: $("#swapMoment"), swapInterval: $("#swapInterval"), assetItemScale: $("#assetItemScale"),
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

  const svg = (body, background = "#ffffff") => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`
  )}`;

  const builtIns = [
    ["music", "音乐", svg('<g transform="translate(-7.5 -1)"><path d="M45 25v35.5c-2.8-1.3-6.4-1.5-9.6-.4-6.9 2.1-11.1 7.7-9.3 12.5 1.8 4.9 8.8 7.1 15.7 5 6.1-1.9 10.2-6.5 9.6-11V38l23-6v23.5c-2.8-1.3-6.4-1.5-9.6-.4-6.9 2.1-11.1 7.7-9.3 12.5 1.8 4.9 8.8 7.1 15.7 5 6.1-1.9 10.2-6.5 9.6-11V20z" fill="white"/></g>', "#fa264f")],
    ["play", "播放", svg('<circle cx="50" cy="50" r="35" fill="none" stroke="white" stroke-width="6"/><path d="M40 29 69 50 40 71z" fill="white"/>', "#111111")],
    ["cloud", "云", svg('<g transform="translate(-4.5 -1.5)"><circle cx="37" cy="53" r="16" fill="white"/><circle cx="52" cy="44" r="22" fill="white"/><circle cx="72" cy="53" r="16" fill="white"/><rect x="21" y="52" width="67" height="22" rx="11" fill="white"/></g>', "#1389ff")],
    ["watch", "手表", svg('<rect x="27" y="20" width="46" height="60" rx="16" fill="#111"/><rect x="34" y="28" width="32" height="44" rx="10" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8")]
  ];

  function addAsset(id, label, src, removable = false) {
    const image = new Image();
    const asset = { id, label, src, image, ratio: 1, ready: false, removable, scale: 1, offsetX: 0, offsetY: 0, gapBefore: 0, gapAfter: 0 };
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
            <button type="button" data-direction="0" title="暂停该行">■</button>
            <button type="button" data-direction="1" title="向右流">→</button>
          </div>
          <div class="row-sliders">
            <label>速度<input class="row-speed" type="range" min="0" max="200" value="${setting.speed}"><output>${setting.speed}%</output></label>
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
    assets.forEach((asset) => {
      const card = document.createElement("div");
      card.className = "asset-card";
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
      grid.append(card);
    });
  }

  function usedAssetEntries() {
    const counts = new Map();
    const order = [];
    [inputs.rows.value, inputs.introWord.value, inputs.finalLine.value].forEach((value) => {
      for (const match of value.matchAll(/\{\{([^{}]+)\}\}/g)) {
        if (!assets.has(match[1])) continue;
        if (!counts.has(match[1])) order.push(match[1]);
        counts.set(match[1], (counts.get(match[1]) || 0) + 1);
      }
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
    [inputs.rows, inputs.introWord, inputs.finalLine].forEach((field) => {
      field.value = field.value.split(`{{${assetId}}}`).join("");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
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

  [inputs.rows, inputs.introWord, inputs.finalLine].forEach((field) => {
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
    [inputs.rows, inputs.introWord, inputs.finalLine].forEach((field) => {
      field.value = field.value.split(`{{${id}}}`).join("");
    });
    syncRowSettings();
    renderAssetGrid();
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

  function drawAnchoredLine(context, layout, y, width, color, anchorX, alpha = 1) {
    context.save();
    context.globalAlpha *= clamp01(alpha);
    for (let x = anchorX; x < width + layout.width; x += layout.width) drawSequence(context, layout, x, y, color);
    for (let x = anchorX - layout.width; x > -layout.width * 2; x -= layout.width) drawSequence(context, layout, x, y, color);
    context.restore();
  }

  function choreographyTiming() {
    const duration = [inputs.introLeft, inputs.introReturn, inputs.popDuration, inputs.fullDuration, inputs.exitDuration, inputs.finalDuration]
      .map((input) => Number(input.value) / 1000);
    const cycle = duration.reduce((sum, value) => sum + value, 0);
    const end = [];
    duration.reduce((sum, value, index) => {
      end[index] = sum + value;
      return end[index];
    }, 0);
    return {
      cycle, duration,
      leftEnd: end[0], returnEnd: end[1], popEnd: end[2],
      fullEnd: end[3], exitEnd: end[4], finalEnd: end[5]
    };
  }

  function choreographyPhase(timing, localTime) {
    const phases = timelineBeats(timing).map((beat) => [beat.name, beat.start, beat.end]);
    return phases.find(([, start, end]) => localTime >= start && localTime < end) || phases[phases.length - 1];
  }

  function timelineBeats(timing = choreographyTiming()) {
    return [
      { kind: "intro", name: "开场向左", start: 0, end: timing.leftEnd },
      { kind: "orbit", name: "切入并铺满", start: timing.leftEnd, end: timing.popEnd },
      { kind: "hold", name: "满屏向左水流", start: timing.popEnd, end: timing.fullEnd },
      { kind: "contact", name: "向右带动并回收", start: timing.fullEnd, end: timing.exitEnd },
      { kind: "replace", name: "单行切换收尾", start: timing.exitEnd, end: timing.finalEnd }
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
      const introPhase = rangeProgress(localTime, 0, timing.leftEnd);
      const drift = lerp(0, -fontPx * .72, smooth(introPhase));
      context.save();
      context.translate(w / 2 + drift, h / 2);
      drawSequence(context, introLayout, -introLayout.width / 2, 0, inputs.foreground.value);
      context.restore();
      context.font = `${activePreset.style || "normal"} ${activePreset.weight} ${fontPx}px ${activeFamily}`;
    }

    const burstStrength = Number(inputs.burst.value) / 100;
    const exitProgress = rangeProgress(localTime, timing.fullEnd, timing.exitEnd);
    const finalProgress = rangeProgress(localTime, timing.exitEnd, timing.finalEnd);
    const initialScale = 1 + .34 * burstStrength;
    let wallScale = 1;
    let revealLimit = halfLanes + 1;
    let wallAlpha = 1;
    let wallShiftX = 0;
    let finalStage = false;

    if (choreography) {
      if (localTime < timing.leftEnd) wallAlpha = 0;
      else if (localTime < timing.popEnd) {
        const formationProgress = rangeProgress(localTime, timing.leftEnd, timing.popEnd);
        const returnCut = timing.duration[1] / Math.max(.001, timing.duration[1] + timing.duration[2]);
        // Complete the pop/settle before every row is visible. The remaining
        // formation frames then share the same constant leftward velocity as
        // the full-wall stage, avoiding a visible speed drop at the boundary.
        const settleEnd = Math.min(.72, returnCut + .28);
        wallScale = lerp(initialScale, 1, easeOut(rangeProgress(formationProgress, 0, settleEnd)));
        revealLimit = halfLanes + 1;
        wallShiftX = formationProgress < returnCut
          ? lerp(-fontPx * .72, fontPx * .42, easeOut(formationProgress / returnCut))
          : lerp(fontPx * .42, 0, easeOut(rangeProgress(formationProgress, returnCut, settleEnd)));
      } else if (localTime < timing.fullEnd) {
        revealLimit = halfLanes + 1;
      } else if (localTime < timing.exitEnd) {
        wallScale = lerp(1, 1.06, smooth(exitProgress));
        revealLimit = halfLanes + 1;
      } else {
        finalStage = true;
        const shrink = smooth(finalProgress);
        wallScale = lerp(1.06, .9, shrink);
        revealLimit = 0;
        wallAlpha = 1;
      }
    }

    const localWidth = w / wallScale;
    context.save();
    context.translate(w / 2, h / 2);
    context.scale(wallScale, wallScale);
    context.translate(-localWidth / 2, 0);

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
    const exitRowCount = Math.max(1, halfLanes * 2);
    const exitStaggerRequested = Number(inputs.exitStagger.value) / 1000;
    const exitFade = Math.max(.09, Math.min(exitDuration * .34, Math.max(.12, exitStaggerRequested * 2.25)));
    const exitStagger = exitRowCount > 1
      ? Math.min(exitStaggerRequested, Math.max(0, exitDuration - exitFade) / (exitRowCount - 1))
      : 0;

    for (let laneIndex = -halfLanes; laneIndex <= halfLanes; laneIndex += 1) {
      if (choreography && finalStage && laneIndex !== 0) continue;
      const sourceIndex = mod(laneIndex, rows.length);
      const setting = rowSettings[sourceIndex] || { direction: -1, speed: 100, phase: 0 };
      const finalStates = inputs.finalLine.value.split(/\r?\n/).map((state) => state.trim()).filter(Boolean);
      const swapStart = Number(inputs.swapMoment.value) / 100;
      const swapActive = finalStage && inputs.finalSwap.value === "on" && finalProgress >= swapStart && finalStates.length;
      const swapElapsed = Math.max(0, localTime - timing.exitEnd - timing.duration[5] * swapStart) * 1000;
      const swapIndex = swapActive ? Math.floor(swapElapsed / Math.max(80, Number(inputs.swapInterval.value))) % finalStates.length : 0;
      const line = finalStage ? (swapActive ? finalStates[swapIndex] : rows[0]) : rows[sourceIndex];
      const layout = layoutTokens(context, line, fontPx, assetHeight, repeatGap, assetGap);
      const laneDistance = Math.abs(laneIndex);
      let rowAlpha = laneDistance <= revealLimit ? 1 : 0;
      let rowFormationProgress = 1;
      if (formationActive) {
        const revealStart = laneDistance * revealStagger;
        rowFormationProgress = smoother(rangeProgress(formationElapsed, revealStart, revealStart + revealFade));
        rowAlpha *= rowFormationProgress;
      }
      if (choreography && localTime >= timing.fullEnd && localTime < timing.exitEnd && laneIndex !== 0) {
        const topToBottomOrder = laneIndex < 0 ? laneIndex + halfLanes : halfLanes - 1 + laneIndex;
        const disappearStart = topToBottomOrder * exitStagger;
        rowAlpha *= 1 - smoother(rangeProgress(exitElapsed, disappearStart, disappearStart + exitFade));
      }
      if (rowAlpha <= .001 || wallAlpha <= .001) continue;

      const yWave = Math.sin(localTime * waveRate * 1.45 + laneIndex * .72) * waveAmp * .28;
      const xWave = Math.sin(localTime * waveRate * .92 + laneIndex * .91) * waveAmp;
      const targetY = laneIndex * lineHeight * (choreography && localTime >= timing.fullEnd ? lerp(1, .92, exitProgress) : 1);
      const y = (formationActive ? lerp(0, targetY, rowFormationProgress) : targetY)
        + (verticalOffset + yWave) * (formationActive ? rowFormationProgress : 1);
      const velocity = fontPx * 1.45 * masterSpeed * (setting.speed / 100);
      const signedShiftRate = setting.direction === 0 ? 0 : (setting.direction < 0 ? velocity : -velocity);
      // The full-wall duration is a real motion boundary, not just a label.
      // Stop accumulating leftward distance when stage 2 ends; stage 3 owns
      // all movement after that point. Without this clamp, a 0.20 s setting
      // could still look like several seconds of left flow.
      const leftFlowClock = choreography ? Math.min(localTime, timing.fullEnd) : localTime;
      const signedTravel = leftFlowClock * signedShiftRate;

      if (finalStage) {
        const anchorX = localWidth / 2 - layout.width / 2;
        drawAnchoredLine(context, layout, 0, localWidth, inputs.foreground.value, anchorX, rowAlpha * wallAlpha);
        continue;
      }

      let groupRight = 0;
      const exitMovementElapsed = Math.max(0, localTime - timing.fullEnd);
      const rightDuration = Math.min(Number(inputs.retreatDuration.value) / 1000, timing.duration[4]);
      const rightForce = Number(inputs.reversePull.value) / 100;
      if (choreography && localTime >= timing.fullEnd) {
        const distanceRatio = laneDistance / Math.max(1, halfLanes);
        const followDelay = distanceRatio * rightDuration * .18;
        const flowProgress = rangeProgress(exitMovementElapsed, followDelay, Math.min(timing.duration[4], followDelay + rightDuration));
        groupRight = localWidth * .34 * rightForce * smoother(flowProgress);
      }
      const shift = signedTravel + setting.phase / 100 * layout.width + xWave - groupRight - wallShiftX;
      if (choreography && localTime >= timing.fullEnd && laneIndex === 0) {
        const centeredAnchor = localWidth / 2 - layout.width / 2;
        const entrySignedTravel = timing.fullEnd * signedShiftRate;
        const entryXWave = Math.sin(timing.fullEnd * waveRate * .92) * waveAmp;
        const entryShift = entrySignedTravel + setting.phase / 100 * layout.width + entryXWave;
        const entryCenteredAnchor = w / 2 - layout.width / 2;
        const entryRepeatedAnchor = -mod(entryShift, layout.width) - layout.width;
        const entryApproachAnchor = entryRepeatedAnchor + Math.floor((entryCenteredAnchor - entryRepeatedAnchor) / layout.width) * layout.width;
        const entryOffset = (entryApproachAnchor - entryCenteredAnchor) * localWidth / w;
        const rightProgress = rangeProgress(exitMovementElapsed, 0, rightDuration);
        const entryWaveShiftRate = Math.cos(timing.fullEnd * waveRate * .92) * waveAmp * waveRate * .92;
        const velocityCarry = (signedShiftRate + entryWaveShiftRate) * rightDuration
          * rightProgress * Math.pow(1 - rightProgress, 3);
        const settle = smoother(rangeProgress(rightProgress, .08, 1));
        const anchorX = centeredAnchor + entryOffset * (1 - settle) - velocityCarry;
        drawAnchoredLine(context, layout, y, localWidth, inputs.foreground.value, anchorX, rowAlpha * wallAlpha);
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
      reversePullOut: `${inputs.reversePull.value}%`,
      burstOut: `${inputs.burst.value}%`,
      introLeftOut: Math.round(timing.duration[0] * 1000),
      introReturnOut: Math.round(timing.duration[1] * 1000),
      popDurationOut: formatSeconds(timing.duration[1] + timing.duration[2]),
      revealStaggerOut: `${inputs.revealStagger.value}ms`,
      fullDurationOut: formatSeconds(timing.duration[3]),
      retreatDurationOut: formatSeconds(Math.min(Number(inputs.retreatDuration.value) / 1000, timing.duration[4])),
      exitDurationOut: formatSeconds(timing.duration[4]),
      exitStaggerOut: `${inputs.exitStagger.value}ms`,
      finalDurationOut: formatSeconds(timing.duration[5]),
      swapMomentOut: `${inputs.swapMoment.value}%`,
      swapIntervalOut: `${inputs.swapInterval.value}ms`
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
  [inputs.popDuration, inputs.revealStagger].forEach((input) => {
    input.addEventListener("input", () => {
      if (inputs.motionMode.value === "choreography") setTime(choreographyTiming().leftEnd + .02);
    });
  });
  [inputs.exitDuration, inputs.exitStagger].forEach((input) => {
    input.addEventListener("input", () => {
      if (inputs.motionMode.value === "choreography") setTime(choreographyTiming().fullEnd + .02);
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

  const SCHEME_STORAGE_KEY = "me-water-flow-scheme-v2";
  const SCHEME_VERSION = 2;
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
      rowSettings: rowSettings.map((setting) => ({ ...setting })),
      assets: [...assets.values()].map((asset) => ({
        id: asset.id, label: asset.label, src: asset.src, removable: asset.removable,
        scale: asset.scale, offsetX: asset.offsetX, offsetY: asset.offsetY,
        gapBefore: asset.gapBefore, gapAfter: asset.gapAfter
      }))
    };
  }

  function cloneScheme(scheme) { return JSON.parse(JSON.stringify(scheme)); }

  function restoreSchemeAssets(items) {
    assets.clear();
    (items || []).forEach((item) => {
      addAsset(item.id, item.label, item.src, Boolean(item.removable));
      const asset = assets.get(item.id);
      Object.assign(asset, {
        scale: Number(item.scale) || 1,
        offsetX: Number(item.offsetX) || 0,
        offsetY: Number(item.offsetY) || 0,
        gapBefore: Number(item.gapBefore) || 0,
        gapAfter: Number(item.gapAfter) || 0
      });
    });
    uploadSerial = Math.max(0, ...[...assets.keys()].map((id) => Number(String(id).replace(/^img/, "")) || 0));
  }

  function applyScheme(scheme, message = "方案已载入。") {
    if (!scheme || !scheme.controls) throw new Error("方案内容不完整");
    applyingScheme = true;
    schemeControlIds.forEach((id) => {
      const field = document.getElementById(id);
      if (!field || !(id in scheme.controls)) return;
      if (field.type === "checkbox") field.checked = Boolean(scheme.controls[id]);
      else field.value = String(scheme.controls[id]);
    });
    if (Array.isArray(scheme.assets) && scheme.assets.length) restoreSchemeAssets(scheme.assets);
    rowSettings = Array.isArray(scheme.rowSettings) ? scheme.rowSettings.map((setting) => ({ ...setting })) : [];
    selectedAssetId = assets.has(scheme.selectedAssetId) ? scheme.selectedAssetId : assets.keys().next().value;
    layoutCache.clear();
    syncRowSettings();
    renderAssetGrid();
    renderSelectedAssets();
    syncAssetTuner();
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
    if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
    if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
    return preset.split("x").map(Number);
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
  });
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

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  renderAssetGrid();
  renderSelectedAssets();
  syncAssetTuner();
  syncRowSettings();
  updateOutputs();
  syncPlaybackControls();
  defaultSchemeSnapshot = collectScheme();
  try {
    const storedScheme = JSON.parse(localStorage.getItem(SCHEME_STORAGE_KEY) || "null");
    if (storedScheme?.controls) applyScheme(storedScheme, "已恢复上次自动保存的水流方案。" );
  } catch (_) {
    $("#schemeStatus").textContent = "本机方案读取失败，已使用默认示例。";
  }
  snapshotHistory();
  document.fonts.ready.finally(previewLoop);
})();
