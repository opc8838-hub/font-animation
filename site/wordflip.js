(() => {
  "use strict";

  const { $, clamp01, lerp, formatSeconds } = FX;
  const FPS = 30;
  const TYPE_START = 4;
  const CHAR_FADE = 6;
  const JITTER = 0.18;
  const EXIT_Y = -1.29;
  const ENTER_Y = 0.135;
  const ROTATE = 90;
  const MOTION_SCALE = 0.98;
  const BLUR_EM = 0.085;
  const DEFAULT_PREFIX = "我想做一套";
  const DEFAULT_WORDS = "干净 锋利 温柔";
  const DEFAULT_SUFFIX = "封面";
  const COLOR_PAIRS = [
    ["蓝粉", "#2a8bf5", "#e11d48"],
    ["青紫", "#06b6d4", "#7c3aed"],
    ["柠黑", "#d7ff2f", "#111111"],
    ["橙粉", "#ff6b1a", "#ff4d8d"],
    ["电蓝", "#2563eb", "#22d3ee"],
    ["金红", "#f5b301", "#ef4444"],
    ["紫粉", "#7c5cff", "#f43f5e"],
    ["墨绿", "#0f766e", "#84cc16"],
    ["黑灰", "#111111", "#6b7280"],
    ["玫蓝", "#db2777", "#3b82f6"],
    ["天蓝", "#38bdf8", "#1d4ed8"],
    ["珊瑚", "#fb7185", "#f97316"]
  ];
  const WORD_DEFAULTS = [
    ["#2a8bf5", "#e11d48"],
    ["#06b6d4", "#7c3aed"],
    ["#f59e0b", "#f43f5e"]
  ];

  const assets = new Map();
  const instanceTunes = new Map();
  let wordColors = [];
  let selectedAssetId = "music";
  let selectedInstanceKey = "";
  let animalLibraryOpen = false;
  let assetRevision = 0;
  let insertField = null;

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
    const asset = { id, label, src, image, ratio: 1, ready: false, removable, scale: 1, offsetX: 0, offsetY: 0 };
    image.onload = () => {
      asset.ratio = Math.max(0.2, Math.min(5, image.naturalWidth / Math.max(1, image.naturalHeight)));
      asset.ready = true;
      assetRevision += 1;
    };
    image.src = src;
    assets.set(id, asset);
    assetRevision += 1;
  }
  builtIns.forEach(([id, label, src]) => addAsset(id, label, src));
  if (window.TokenAssetTools) {
    window.TokenAssetTools.animalAssets().forEach(({ id, label, src }) => addAsset(id, label, src));
  }

  function bezier(x1, y1, x2, y2) {
    return (x) => {
      let t = clamp01(x);
      for (let i = 0; i < 8; i += 1) {
        const u = 1 - t;
        const xEst = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
        const dx = 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2);
        if (Math.abs(dx) < 1e-6) break;
        t = clamp01(t - (xEst - x) / dx);
      }
      const u = 1 - t;
      return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    };
  }
  const ENTER_EASE = bezier(0.2, 0.6, 0.35, 1);

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function prefixText() { return $("#prefix").value || ""; }
  function suffixText() { return $("#suffix").value || ""; }
  function wordList() {
    const items = ($("#words").value || DEFAULT_WORDS).trim().split(/\s+/).filter(Boolean);
    return items.length ? items : ["干净"];
  }
  function num(id, fallback) {
    const node = $(id);
    return node ? Number(node.value) : fallback;
  }
  function pauseFrames() { return Math.max(0, num("#pause", 6)); }
  function cycleFrames() { return Math.max(8, num("#cycle", 35)); }
  function exitFrames() { return Math.max(2, num("#exitDuration", 9)); }
  function enterFrames() { return Math.max(2, num("#enterDuration", 9)); }
  function overlapFrames() { return Math.max(0, Math.min(exitFrames() - 1, num("#overlap", 3))); }
  function perspectiveEm() { return Math.max(2, num("#perspective", 65) / 10); }
  function iconGapPx(em) { return num("#iconGap", 18) / 1000 * em; }

  function instanceKey(id, occurrence) { return `${id}#${occurrence}`; }
  function getTune(id, occurrence) {
    const key = instanceKey(id, occurrence);
    if (!instanceTunes.has(key)) {
      const asset = assets.get(id);
      instanceTunes.set(key, {
        scale: asset ? asset.scale : 1,
        offsetX: asset ? asset.offsetX : 0,
        offsetY: asset ? asset.offsetY : 0
      });
    }
    return instanceTunes.get(key);
  }

  function parseUnits(text, counts) {
    const units = [];
    const regex = /\{\{([^{}]+)\}\}/g;
    let last = 0;
    let match;
    const source = text || "";
    while ((match = regex.exec(source))) {
      if (match.index > last) {
        FX.graphemes(source.slice(last, match.index)).forEach((ch) => units.push({ type: "glyph", ch }));
      }
      const id = match[1];
      const occurrence = counts.get(id) || 0;
      counts.set(id, occurrence + 1);
      units.push({ type: "icon", id, occurrence, tune: getTune(id, occurrence) });
      last = match.index + match[0].length;
    }
    if (last < source.length) FX.graphemes(source.slice(last)).forEach((ch) => units.push({ type: "glyph", ch }));
    return units;
  }

  function parseLine() {
    const counts = new Map();
    return {
      prefix: parseUnits(prefixText(), counts),
      words: wordList().map((word) => parseUnits(word, counts)),
      suffix: parseUnits(suffixText(), counts)
    };
  }

  function typeUnits() {
    const line = parseLine();
    return line.prefix.concat(line.suffix);
  }

  function listInsertedIcons() {
    const line = parseLine();
    const found = [];
    line.prefix.concat(...line.words, line.suffix).forEach((unit) => {
      if (unit.type === "icon") found.push({ id: unit.id, occurrence: unit.occurrence, key: instanceKey(unit.id, unit.occurrence) });
    });
    return found;
  }

  function measureUnit(ctx, unit, em, tracking, iconGap) {
    if (unit.type === "icon") {
      const asset = assets.get(unit.id);
      const tune = unit.tune || getTune(unit.id, unit.occurrence || 0);
      const height = em * (tune.scale || asset?.scale || 1);
      const width = height * (asset?.ratio || 1) + iconGap * 2;
      return { ...unit, asset, tune, width, height };
    }
    return { ...unit, width: ctx.measureText(unit.ch).width, height: em };
  }

  function measureUnits(ctx, units, em, tracking, iconGap) {
    const measured = units.map((unit) => measureUnit(ctx, unit, em, tracking, iconGap));
    let width = 0;
    measured.forEach((unit, index) => {
      width += unit.width;
      if (index < measured.length - 1) width += tracking;
    });
    return { units: measured, width };
  }

  function framesPerChar(cps) { return FPS / Math.max(0.001, cps); }
  function keystrokeOffset(index, jitter) {
    if (jitter <= 0) return 0;
    const w = Math.sin(index * 12.9898) * 0.6 + Math.sin(index * 4.1414) * 0.4;
    return w * jitter;
  }
  function charStartFrame(index, cps) {
    const per = framesPerChar(cps);
    return TYPE_START + index * per + keystrokeOffset(index, JITTER) * per;
  }
  function typingEndFrame() {
    const units = typeUnits();
    const cps = Math.max(3, num("#cps", 9));
    if (!units.length) return TYPE_START + pauseFrames();
    return charStartFrame(units.length - 1, cps) + CHAR_FADE;
  }
  function flipStartFrame(i) {
    return typingEndFrame() + pauseFrames() + i * cycleFrames();
  }
  function wordAt(frame) {
    const first = flipStartFrame(0);
    const count = wordList().length;
    if (frame < first) return { index: 0, local: frame - first };
    const n = Math.floor((frame - first) / cycleFrames());
    const local = frame - first - n * cycleFrames();
    const index = ((n % count) + count) % count;
    return { index, local };
  }
  function easeInBack(t, s = 1.70158) {
    return t * t * ((s + 1) * t - s);
  }
  function easeInBackSpeed(t, s = 1.70158) {
    const d = 3 * (s + 1) * t * t - 2 * s * t;
    const peak = 3 * (s + 1) - 2 * s;
    return Math.abs(d) / peak;
  }
  function interp(frame, fromFrame, toFrame, from, to, easing) {
    const p = clamp01((frame - fromFrame) / Math.max(0.0001, toFrame - fromFrame));
    return lerp(from, to, easing ? easing(p) : p);
  }
  function fitScales(widths) {
    const max = Math.max(...widths, 1);
    return widths.map((w) => (w > 0 ? max / w : 1));
  }
  function pairFor(i) {
    return WORD_DEFAULTS[i % WORD_DEFAULTS.length];
  }
  function syncWordColors() {
    const words = wordList();
    wordColors = words.map((_, i) => {
      const prev = wordColors[i];
      const fallback = pairFor(i);
      return {
        from: prev?.from || fallback[0],
        to: prev?.to || fallback[1]
      };
    });
  }
  function plainWord(word) {
    return word.replace(/\{\{([^{}]+)\}\}/g, (_, id) => `[${assets.get(id)?.label || id}]`);
  }

  function fieldLabel(node) {
    if (!node) return "前半句";
    if (node.id === "words") return "翻转词";
    if (node.id === "suffix") return "后半句";
    return "前半句";
  }
  function setInsertField(node) {
    insertField = node;
    const hint = $("#insertHint");
    if (hint) hint.textContent = `当前插入到：${fieldLabel(node)}`;
  }

  function insertToken(id) {
    const field = insertField || $("#prefix");
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const token = `{{${id}}}`;
    field.value = `${field.value.slice(0, start)}${token}${field.value.slice(end)}`;
    const caret = start + token.length;
    field.focus();
    field.setSelectionRange(caret, caret);
    setInsertField(field);
    syncWordColors();
    renderUsedIcons();
    renderWordColorList();
    renderChoreoTrack();
  }

  function makeAssetCard(asset) {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.classList.toggle("is-selected", asset.id === selectedAssetId);
    const insert = document.createElement("button");
    insert.type = "button";
    insert.className = "asset-insert";
    insert.title = `插入 {{${asset.id}}}`;
    const preview = document.createElement("img");
    preview.src = asset.src;
    preview.alt = asset.label;
    const label = document.createElement("span");
    label.textContent = asset.label;
    insert.append(preview, label);
    insert.addEventListener("click", () => {
      selectedAssetId = asset.id;
      syncAssetTuner();
      renderAssetGrid();
      insertToken(asset.id);
    });
    card.append(insert);
    if (asset.removable) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "asset-remove";
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        assets.delete(asset.id);
        renderAssetGrid();
      });
      card.append(remove);
    }
    return card;
  }

  function renderAssetGrid() {
    const core = $("#coreIconGrid");
    const grid = $("#assetGrid");
    if (core) {
      core.replaceChildren();
      ["music", "play", "cloud", "watch"].forEach((id) => {
        const asset = assets.get(id);
        if (asset) core.append(makeAssetCard(asset));
      });
    }
    if (!grid) return;
    grid.replaceChildren();
    let animalIndex = 0;
    assets.forEach((asset) => {
      if (["music", "play", "cloud", "watch"].includes(asset.id)) return;
      const isAnimal = String(asset.id).startsWith("animal");
      const card = makeAssetCard(asset);
      if (isAnimal && animalIndex++ >= 12 && !animalLibraryOpen) card.classList.add("is-library-hidden");
      grid.append(card);
    });
    const divider = document.createElement("div");
    divider.className = "asset-library-divider";
    divider.innerHTML = `<span>透明动物素材 · 31 张</span><button type="button">${animalLibraryOpen ? "收起" : "查看全部"}</button>`;
    divider.querySelector("button").addEventListener("click", () => {
      animalLibraryOpen = !animalLibraryOpen;
      renderAssetGrid();
    });
    grid.append(divider);
  }

  function syncAssetTuner() {
    const asset = assets.get(selectedAssetId) || [...assets.values()][0];
    if (!asset) return;
    selectedAssetId = asset.id;
    const name = $("#selectedAssetName");
    if (name) name.textContent = asset.label;
    const scale = $("#assetItemScale");
    const ox = $("#assetOffsetX");
    const oy = $("#assetOffsetY");
    if (scale) scale.value = String(Math.round(asset.scale * 100));
    if (ox) ox.value = String(Math.round(asset.offsetX));
    if (oy) oy.value = String(Math.round(asset.offsetY));
    if ($("#assetItemScaleOut")) $("#assetItemScaleOut").textContent = `${Math.round(asset.scale * 100)}%`;
    if ($("#assetOffsetXOut")) $("#assetOffsetXOut").textContent = `${Math.round(asset.offsetX)}%`;
    if ($("#assetOffsetYOut")) $("#assetOffsetYOut").textContent = `${Math.round(asset.offsetY)}%`;
  }

  function renderUsedIcons() {
    const box = $("#usedIcons");
    if (!box) return;
    const items = listInsertedIcons();
    box.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "textswell-used-empty";
      empty.textContent = "默认没有图标。点上面的音乐 / 播放 / 云 / 手表或小动物，插到当前输入框。插入后每一枚都能单独调大小和位置。";
      box.append(empty);
      return;
    }
    items.forEach((item, index) => {
      const asset = assets.get(item.id);
      const tune = getTune(item.id, item.occurrence);
      const card = document.createElement("div");
      card.className = "icon-tune-card";
      if (item.key === selectedInstanceKey) card.classList.add("is-active");
      card.innerHTML = `
        <div class="icon-tune-head">
          <img src="${asset?.src || ""}" alt="">
          <div><b>${asset?.label || item.id}</b><small>第 ${index + 1} 枚 · {{${item.id}}}</small></div>
        </div>
        <div class="icon-tune-grid">
          <label>大小 <output>${Math.round(tune.scale * 100)}%</output>
            <input data-k="scale" type="range" min="20" max="300" value="${Math.round(tune.scale * 100)}">
          </label>
          <label>左右 <output>${Math.round(tune.offsetX)}%</output>
            <input data-k="offsetX" type="range" min="-150" max="150" value="${Math.round(tune.offsetX)}">
          </label>
          <label>上下 <output>${Math.round(tune.offsetY)}%</output>
            <input data-k="offsetY" type="range" min="-150" max="150" value="${Math.round(tune.offsetY)}">
          </label>
        </div>
        <div class="icon-nudge">
          <button type="button" data-dx="-4" data-dy="0">←</button>
          <button type="button" data-dx="4" data-dy="0">→</button>
          <button type="button" data-dx="0" data-dy="-4">↑</button>
          <button type="button" data-dx="0" data-dy="4">↓</button>
        </div>`;
      card.addEventListener("pointerdown", () => { selectedInstanceKey = item.key; });
      card.querySelectorAll("input[type=range]").forEach((slider) => {
        const output = slider.previousElementSibling;
        slider.addEventListener("input", () => {
          const key = slider.dataset.k;
          if (key === "scale") tune.scale = Number(slider.value) / 100;
          else tune[key] = Number(slider.value);
          output.textContent = `${slider.value}%`;
        });
      });
      card.querySelectorAll("[data-dx]").forEach((button) => {
        button.addEventListener("click", () => {
          tune.offsetX = Math.max(-150, Math.min(150, tune.offsetX + Number(button.dataset.dx)));
          tune.offsetY = Math.max(-150, Math.min(150, tune.offsetY + Number(button.dataset.dy)));
          renderUsedIcons();
        });
      });
      box.append(card);
    });
  }

  function pairButtons(onPick, activeFrom, activeTo) {
    return COLOR_PAIRS.map(([name, from, to]) => {
      const active = activeFrom === from && activeTo === to ? " is-active" : "";
      return `<button type="button" class="color-pair${active}" data-from="${from}" data-to="${to}" title="${name}" style="--a:${from};--b:${to}"></button>`;
    }).join("");
  }

  function renderColorPairBar() {
    const bar = $("#colorPairBar");
    if (!bar) return;
    bar.innerHTML = `<small style="width:100%;font-size:12px;color:#62615c">点一下套到全部翻转词</small>${pairButtons(() => {})}`;
    bar.querySelectorAll(".color-pair").forEach((button) => {
      button.addEventListener("click", () => {
        wordColors = wordList().map(() => ({ from: button.dataset.from, to: button.dataset.to }));
        renderWordColorList();
        renderColorPairBar();
      });
    });
  }

  function exitAt(local, em) {
    const t = clamp01(local / exitFrames());
    const p = easeInBack(t);
    return {
      y: p * EXIT_Y * em,
      rotate: p * ROTATE,
      scale: 1 + p * (MOTION_SCALE - 1),
      blur: easeInBackSpeed(t) * BLUR_EM * em,
      opacity: interp(t, 0.65, 1, 1, 0)
    };
  }
  function enterAt(local, em) {
    const start = Math.max(0, exitFrames() - overlapFrames());
    const p = interp(local, start, start + enterFrames(), 0, 1, ENTER_EASE);
    return {
      y: (1 - p) * ENTER_Y * em,
      rotate: -(1 - p) * ROTATE,
      scale: MOTION_SCALE + p * (1 - MOTION_SCALE),
      blur: (1 - p) * BLUR_EM * em,
      opacity: interp(p, 0, 0.45, 0, 1)
    };
  }
  function stateFor(i, entering, local, em) {
    const outgoing = entering - 1;
    const enterStart = Math.max(0, exitFrames() - overlapFrames());
    if (i === entering && local >= enterStart) return enterAt(local, em);
    if (i === outgoing && local >= 0 && local <= exitFrames()) return exitAt(local, em);
    if (i === entering && local > exitFrames()) return enterAt(local, em);
    if (i === entering && local < 0) return { y: 0, rotate: 0, scale: 1, blur: 0, opacity: 0 };
    return null;
  }
  function loopFrames() {
    return flipStartFrame(wordList().length) + 8;
  }
  function cycleLength() {
    return loopFrames() / FPS / speed();
  }
  function choreoBeats() {
    const line = parseLine();
    const cps = Math.max(3, num("#cps", 9));
    const beats = [];
    const prefixEnd = line.prefix.length ? charStartFrame(line.prefix.length - 1, cps) + CHAR_FADE : TYPE_START;
    const typeEnd = typingEndFrame();
    if (line.prefix.length) beats.push({ id: "prefix", label: "1. 打前半句", start: 0, end: prefixEnd, kind: "type" });
    if (line.suffix.length) beats.push({ id: "suffix", label: "2. 打后半句", start: prefixEnd, end: typeEnd, kind: "type" });
    const holdEnd = typeEnd + pauseFrames();
    beats.push({ id: "hold", label: `${beats.length + 1}. 停住`, start: typeEnd, end: holdEnd, kind: "hold" });
    wordList().forEach((word, i) => {
      const start = flipStartFrame(i);
      beats.push({
        id: `flip-${i}`,
        label: `${beats.length + 1}. 翻入 ${plainWord(word)}`,
        start,
        end: start + cycleFrames(),
        kind: "flip"
      });
    });
    return beats;
  }
  function renderChoreoTrack() {
    const bar = $("#choreoBar");
    if (!bar) return;
    const beats = choreoBeats();
    const total = Math.max(1, loopFrames());
    bar.innerHTML = beats.map((beat, index) => {
      const width = Math.max(10, (beat.end - beat.start) / total * 100);
      return `<div class="flip-beat-block is-${beat.kind}" data-start="${beat.start}" role="button" tabindex="0" style="width:${width}%"><em>${index + 1}</em><strong>${beat.label.replace(/^\d+\.\s/, "")}</strong><small>${formatSeconds((beat.end - beat.start) / FPS)}</small></div>`;
    }).join("") + `<div class="wordflip-playhead" id="choreoPlayhead"></div>`;
    bar.querySelectorAll(".flip-beat-block").forEach((block) => {
      block.addEventListener("click", () => {
        if (player) player.setTime(Number(block.dataset.start) / FPS / speed());
      });
    });
  }

  function renderWordColorList() {
    const host = $("#wordColorList");
    if (!host) return;
    syncWordColors();
    host.innerHTML = wordList().map((word, i) => {
      const color = wordColors[i];
      return `<div class="flip-word-card">
        <div class="flip-word-head"><b>${i + 1}. ${plainWord(word)}</b><small>槽位词</small></div>
        <div class="color-pair-row">${pairButtons(null, color.from, color.to)}</div>
        <label class="word-color">左色<input data-word="${i}" data-key="from" type="color" value="${color.from}"></label>
        <label class="word-color">右色<input data-word="${i}" data-key="to" type="color" value="${color.to}"></label>
      </div>`;
    }).join("");
    host.querySelectorAll("input[type=color]").forEach((input) => {
      input.addEventListener("input", () => {
        const i = Number(input.dataset.word);
        if (!wordColors[i]) return;
        wordColors[i][input.dataset.key] = input.value;
        renderColorPairBar();
      });
    });
    host.querySelectorAll(".color-pair").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".flip-word-card");
        const index = [...host.children].indexOf(card);
        if (index < 0) return;
        wordColors[index] = { from: button.dataset.from, to: button.dataset.to };
        renderWordColorList();
        renderColorPairBar();
      });
    });
  }

  function drawUnit(ctx, unit, x, baseline, em, fill) {
    if (unit.type === "icon") {
      if (!unit.asset?.ready) return unit.width;
      const tune = unit.tune || { offsetX: 0, offsetY: 0 };
      const height = unit.height;
      const width = height * (unit.asset.ratio || 1);
      const dx = x + (unit.width - width) / 2 + height * (tune.offsetX || 0) / 100;
      const dy = baseline - height * 0.82 + height * (tune.offsetY || 0) / 100;
      ctx.drawImage(unit.asset.image, dx, dy, width, height);
      return unit.width;
    }
    ctx.fillStyle = fill;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(unit.ch, x, baseline);
    return unit.width;
  }

  function drawUnits(ctx, units, x, baseline, em, tracking, fillAt) {
    let cursor = x;
    units.forEach((unit, i) => {
      const fill = typeof fillAt === "function" ? fillAt(i, unit) : fillAt;
      const alpha = fill && fill.alpha != null ? fill.alpha : 1;
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha *= alpha;
        drawUnit(ctx, unit, cursor, baseline, em, fill && fill.color ? fill.color : fill);
        ctx.restore();
      }
      cursor += unit.width;
      if (i < units.length - 1) cursor += tracking;
    });
    return cursor;
  }

  function drawFlipWord(ctx, units, x, baseline, em, state, fit, from, to, tracking) {
    if (!state || state.opacity <= 0.001) return;
    ctx.save();
    ctx.translate(x, baseline);
    ctx.translate(0, state.y);
    const rad = state.rotate * Math.PI / 180;
    const persp = perspectiveEm() * em;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const proj = persp / Math.max(1, persp - sin * em * 0.35);
    ctx.scale(fit * state.scale * proj, fit * state.scale * Math.max(0.001, Math.abs(cos)) * proj);
    ctx.globalAlpha *= state.opacity;
    if (state.blur > 0.01) ctx.filter = `blur(${state.blur}px)`;
    const width = Math.max(1, units.reduce((sum, unit, i) => sum + unit.width + (i ? tracking : 0), 0));
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    drawUnits(ctx, units, 0, 0, em, tracking, (i, unit) => (unit.type === "icon" ? "#000" : gradient));
    ctx.restore();
  }

  function charOpacity(frame, index, cps) {
    const start = charStartFrame(index, cps);
    return interp(frame, start, start + CHAR_FADE, 0, 1);
  }

  function renderFrame(ctx, time, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = $("#backgroundColor").value;
    ctx.fillRect(0, 0, w, h);

    const em = Math.max(18, num("#fontSize", 72));
    const tracking = num("#tracking", -20) / 1000 * em;
    const iconGap = iconGapPx(em);
    FX.applyFont(ctx, $("#fontFamily").value, em, Number($("#fontWeight").value));
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    const line = parseLine();
    const prefixLayout = measureUnits(ctx, line.prefix, em, tracking, iconGap);
    const suffixLayout = measureUnits(ctx, line.suffix, em, tracking, iconGap);
    const wordLayouts = line.words.map((units) => measureUnits(ctx, units, em, tracking, iconGap));
    const widths = wordLayouts.map((item) => item.width);
    const scales = fitScales(widths);
    const slot = Math.max(...widths, em * 0.4);
    const space = ctx.measureText(" ").width;
    const total = prefixLayout.width + space + slot + space + suffixLayout.width;
    const fit = Math.min(1, (w * 0.88) / Math.max(1, total));
    const frame = time * FPS * speed();
    const cps = Math.max(3, num("#cps", 9));
    const { index: entering, local } = wordAt(frame);
    const typingEnd = typingEndFrame();
    const caretOn = $("#caret") && $("#caret").checked;
    const caretDone = frame > typingEnd + pauseFrames();
    const typed = typeUnits();
    const caretIndex = Math.max(0, Math.min(typed.length, Math.floor((frame - TYPE_START) / framesPerChar(cps)) + 1));
    const showCaret = caretOn && !caretDone && frame >= TYPE_START;
    const blink = Math.floor((frame / FPS) * 2) % 2 === 0 ? 1 : 0.15;

    ctx.save();
    ctx.translate(w / 2, h / 2 + em * 0.18);
    ctx.scale(fit, fit);
    ctx.translate(-total / 2, 0);
    ctx.fillStyle = $("#textColor").value;

    const drawCaret = (x) => {
      if (!showCaret) return;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.fillStyle = $("#textColor").value;
      ctx.fillRect(x + 0.06 * em, -0.78 * em, Math.max(2, 0.055 * em), 0.78 * em);
      ctx.restore();
    };

    let x = 0;
    prefixLayout.units.forEach((unit, i) => {
      const alpha = charOpacity(frame, i, cps);
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = alpha;
        drawUnit(ctx, unit, x, 0, em, $("#textColor").value);
        ctx.restore();
      }
      x += unit.width + (i < prefixLayout.units.length - 1 ? tracking : 0);
      if (showCaret && caretIndex === i + 1 && caretIndex <= prefixLayout.units.length) drawCaret(x);
    });
    if (showCaret && caretIndex === 0 && prefixLayout.units.length) drawCaret(0);
    x = prefixLayout.width + space;

    wordLayouts.forEach((layout, i) => {
      const state = stateFor(i, entering, local, em);
      const color = wordColors[i] || { from: pairFor(i)[0], to: pairFor(i)[1] };
      drawFlipWord(ctx, layout.units, x, 0, em, state, scales[i], color.from, color.to, tracking);
    });
    x += slot + space;

    suffixLayout.units.forEach((unit, i) => {
      const index = prefixLayout.units.length + i;
      const alpha = charOpacity(frame, index, cps);
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = alpha;
        drawUnit(ctx, unit, x, 0, em, $("#textColor").value);
        ctx.restore();
      }
      x += unit.width + (i < suffixLayout.units.length - 1 ? tracking : 0);
      if (showCaret && caretIndex === index + 1 && caretIndex > prefixLayout.units.length) drawCaret(x);
    });
    ctx.restore();
  }

  function collectState() {
    const uploads = [];
    assets.forEach((asset) => {
      if (asset.removable) uploads.push({ id: asset.id, label: asset.label, src: asset.src, scale: asset.scale, offsetX: asset.offsetX, offsetY: asset.offsetY });
    });
    return {
      version: 2,
      prefix: $("#prefix").value,
      words: $("#words").value,
      suffix: $("#suffix").value,
      fontFamily: $("#fontFamily").value,
      fontWeight: $("#fontWeight").value,
      backgroundColor: $("#backgroundColor").value,
      textColor: $("#textColor").value,
      cps: $("#cps").value,
      pause: $("#pause").value,
      cycle: $("#cycle").value,
      exitDuration: $("#exitDuration").value,
      enterDuration: $("#enterDuration").value,
      overlap: $("#overlap").value,
      perspective: $("#perspective").value,
      tracking: $("#tracking").value,
      iconGap: $("#iconGap") ? $("#iconGap").value : "18",
      fontSize: $("#fontSize").value,
      speed: $("#speed").value,
      caret: $("#caret").checked,
      wordColors,
      instanceTunes: Object.fromEntries(instanceTunes),
      uploads
    };
  }

  function applyState(state) {
    if (!state || typeof state !== "object") return;
    ["prefix", "words", "suffix", "fontFamily", "fontWeight", "backgroundColor", "textColor", "cps", "pause", "cycle", "exitDuration", "enterDuration", "overlap", "perspective", "tracking", "iconGap", "fontSize", "speed"].forEach((key) => {
      if (state[key] != null && $(`#${key}`)) $(`#${key}`).value = state[key];
    });
    if ($("#caret") && state.caret != null) $("#caret").checked = !!state.caret;
    if (Array.isArray(state.wordColors)) wordColors = state.wordColors;
    instanceTunes.clear();
    Object.entries(state.instanceTunes || {}).forEach(([key, value]) => instanceTunes.set(key, value));
    (state.uploads || []).forEach((item) => addAsset(item.id, item.label, item.src, true));
    syncWordColors();
    renderAssetGrid();
    syncAssetTuner();
    renderUsedIcons();
    renderWordColorList();
    renderColorPairBar();
    renderChoreoTrack();
    if (player) player.setTime(0);
  }

  const player = FX.create({
    filePrefix: "wordflip",
    cycleLength,
    onTick(_time, local) {
      const beatLabel = $("#choreoBeat");
      const head = $("#choreoPlayhead");
      const frame = local * FPS * speed();
      const beats = choreoBeats();
      const current = beats.find((beat) => frame >= beat.start && frame < beat.end) || beats[beats.length - 1];
      if (beatLabel && current) beatLabel.textContent = current.label;
      if (head) head.style.left = `${(frame / Math.max(1, loopFrames())) * 100}%`;
      document.querySelectorAll(".flip-beat-block").forEach((block, index) => {
        block.classList.toggle("is-active", beats[index] && beats[index].id === current?.id);
      });
    },
    updateOutputs() {
      const set = (id, value) => { const node = $(id); if (node) node.textContent = value; };
      set("#cpsOut", `${$("#cps").value} 字/秒`);
      set("#pauseOut", formatSeconds(pauseFrames() / FPS));
      set("#cycleOut", formatSeconds(cycleFrames() / FPS));
      set("#exitOut", formatSeconds(exitFrames() / FPS));
      set("#enterOut", formatSeconds(enterFrames() / FPS));
      set("#overlapOut", `${overlapFrames()} 帧`);
      set("#perspectiveOut", `${perspectiveEm().toFixed(1)}em`);
      set("#trackingOut", `${(num("#tracking", -20) / 1000).toFixed(3)}em`);
      set("#iconGapOut", `${(num("#iconGap", 18) / 1000).toFixed(2)}em`);
      set("#fontSizeOut", $("#fontSize").value);
      set("#speedOut", `${speed().toFixed(2)}×`);
    },
    renderFrame
  });

  ["#prefix", "#words", "#suffix"].forEach((id) => {
    const node = $(id);
    if (!node) return;
    node.addEventListener("focus", () => setInsertField(node));
    node.addEventListener("click", () => setInsertField(node));
    node.addEventListener("input", () => {
      syncWordColors();
      renderUsedIcons();
      renderWordColorList();
      renderChoreoTrack();
    });
  });
  ["#cps", "#pause", "#cycle", "#exitDuration", "#enterDuration", "#overlap"].forEach((id) => {
    if ($(id)) $(id).addEventListener("input", () => renderChoreoTrack());
  });
  $("#saveButton").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(collectState(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wordflip-scheme.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    localStorage.setItem("wordflip-scheme", JSON.stringify(collectState()));
    const status = $("#exportStatus");
    if (status) status.textContent = "方案已保存到本机，并下载了 JSON。";
  });
  $("#importFile").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!file) return;
    applyState(JSON.parse(await file.text()));
  });
  $("#clearButton").addEventListener("click", () => {
    localStorage.removeItem("wordflip-scheme");
    $("#prefix").value = DEFAULT_PREFIX;
    $("#words").value = DEFAULT_WORDS;
    $("#suffix").value = DEFAULT_SUFFIX;
    wordColors = [];
    instanceTunes.clear();
    syncWordColors();
    renderUsedIcons();
    renderWordColorList();
    renderColorPairBar();
    renderChoreoTrack();
    if (player) player.setTime(0);
  });
  ["#assetItemScale", "#assetOffsetX", "#assetOffsetY"].forEach((id) => {
    const node = $(id);
    if (!node) return;
    node.addEventListener("input", () => {
      const asset = assets.get(selectedAssetId);
      if (!asset) return;
      if (id === "#assetItemScale") asset.scale = Number($("#assetItemScale").value) / 100;
      if (id === "#assetOffsetX") asset.offsetX = Number($("#assetOffsetX").value);
      if (id === "#assetOffsetY") asset.offsetY = Number($("#assetOffsetY").value);
      syncAssetTuner();
    });
  });
  if ($("#assetUpload")) {
    $("#assetUpload").addEventListener("change", async (event) => {
      const files = [...event.currentTarget.files];
      event.currentTarget.value = "";
      for (const file of files) {
        const processed = window.TokenAssetTools
          ? await window.TokenAssetTools.processFile(file, { removeBackground: true })
          : { src: URL.createObjectURL(file) };
        addAsset(`upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file.name.replace(/\.[^.]+$/, ""), processed.src, true);
      }
      renderAssetGrid();
      renderUsedIcons();
    });
  }

  try {
    const saved = localStorage.getItem("wordflip-scheme");
    if (saved) applyState(JSON.parse(saved));
  } catch (_) {}

  setInsertField($("#prefix"));
  syncWordColors();
  renderAssetGrid();
  syncAssetTuner();
  renderUsedIcons();
  renderWordColorList();
  renderColorPairBar();
  renderChoreoTrack();
})();
