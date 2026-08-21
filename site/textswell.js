(() => {
  "use strict";

  const { $, clamp01, lerp, formatSeconds } = FX;
  const FPS = 30;
  const FIT = 0.97;
  const INTRO = 8;
  const RISE = 10;
  const RISE_EM = 0.7;
  const START_SCALE = 1;
  const APPROACH_DELAY = 14;
  const APPROACH = 20;
  const WORD_DELAY = 27;
  const WORD_STAGGER = 14;
  const WORD_PUSH_EM = 0.15;
  const WORD_PUSH = 12;
  const LETTER_STAGGER = 2;
  const LETTER_RISE = 3;
  const LETTER_HOLD = 0;
  const LETTER_FALL = 6;
  const HOLD = 6;
  const RECEDE = 18;

  const RISE_EASE = bezier(0.2, 0.6, 0.35, 1);
  const APPROACH_EASE = bezier(0.4, 0, 0.15, 1);
  const ZOOM_EASE = bezier(0.5, 0, 0.05, 1);
  const WORD_EASE = bezier(0.22, 0.8, 0.36, 1);
  const LETTER_EASE = bezier(0.4, 0, 0.2, 1);

  const DEFAULT_TEXT = "Hely {{music}} fun {{play}} excellent";
  const assets = new Map();
  const instanceTunes = new Map();
  let wordMotion = [];
  let selectedAssetId = "music";
  let selectedInstanceKey = "";
  let animalLibraryOpen = false;
  let assetRevision = 0;

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

  function interpolate(frame, range, values, easing) {
    const p = clamp01((frame - range[0]) / Math.max(0.0001, range[1] - range[0]));
    const e = easing ? easing(p) : p;
    return values[0] + (values[1] - values[0]) * e;
  }

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function rawText() { return ($("#titleText").value || "Hely fun excellent").replace(/\n/g, " "); }
  function wordStrings() {
    const parts = rawText().split(" ").filter(Boolean);
    return parts.length ? parts : ["Hely", "fun", "excellent"];
  }

  function instanceKey(id, occurrence) { return `${id}#${occurrence}`; }

  function getTune(id, occurrence) {
    const key = instanceKey(id, occurrence);
    if (!instanceTunes.has(key)) {
      const asset = assets.get(id);
      instanceTunes.set(key, {
        scale: asset ? asset.scale : 1,
        offsetX: asset ? asset.offsetX : 0,
        offsetY: asset ? asset.offsetY : 0,
        bounce: true
      });
    }
    const tune = instanceTunes.get(key);
    if (tune.bounce === undefined) tune.bounce = true;
    return tune;
  }

  function listInsertedIcons() {
    const counts = new Map();
    const found = [];
    const regex = /\{\{([^{}]+)\}\}/g;
    let match;
    const text = rawText();
    while ((match = regex.exec(text))) {
      const id = match[1];
      const occurrence = counts.get(id) || 0;
      counts.set(id, occurrence + 1);
      found.push({ id, occurrence, key: instanceKey(id, occurrence) });
    }
    return found;
  }

  function parseUnits(word, counts) {
    const units = [];
    const regex = /\{\{([^{}]+)\}\}/g;
    let last = 0;
    let match;
    while ((match = regex.exec(word))) {
      if (match.index > last) {
        FX.graphemes(word.slice(last, match.index)).forEach((ch) => units.push({ type: "glyph", ch }));
      }
      const id = match[1];
      const occurrence = counts.get(id) || 0;
      counts.set(id, occurrence + 1);
      units.push({ type: "icon", id, occurrence, tune: getTune(id, occurrence) });
      last = match.index + match[0].length;
    }
    if (last < word.length) FX.graphemes(word.slice(last)).forEach((ch) => units.push({ type: "glyph", ch }));
    return units.length ? units : [{ type: "glyph", ch: "" }];
  }

  function measureWords(ctx, fontPx) {
    const tracking = Number($("#tracking").value) / 1000 * fontPx;
    const iconGap = Number($("#iconGap").value) / 1000 * fontPx;
    const counts = new Map();
    const words = wordStrings().map((word) => {
      const units = parseUnits(word, counts);
      const measured = units.map((unit) => {
        if (unit.type === "icon") {
          const asset = assets.get(unit.id);
          const tune = unit.tune || getTune(unit.id, unit.occurrence || 0);
          const height = fontPx * (tune.scale || asset?.scale || 1);
          const width = height * (asset?.ratio || 1) + iconGap * 2;
          return { ...unit, asset, tune, width, height };
        }
        return { ...unit, width: ctx.measureText(unit.ch).width, height: fontPx };
      });
      let width = 0;
      measured.forEach((unit, index) => {
        width += unit.width;
        if (index < measured.length - 1) width += tracking;
      });
      return { units: measured, width };
    });
    const space = ctx.measureText(" ").width + tracking;
    let cursor = 0;
    const ends = [];
    words.forEach((word, index) => {
      if (index) cursor += space;
      cursor += word.width;
      ends.push(cursor);
    });
    return { words, space, lineWidth: cursor, ends, leadCenter: words[0].width / 2, tracking };
  }

  function wordStart(i) { return WORD_DELAY + (i - 1) * WORD_STAGGER; }
  function wordSpeedOf(i) { return Math.max(0.35, Number(wordMotion[i]?.speed || 1)); }
  function wordBounces(i) {
    if (i <= 0) return false;
    return !!(wordMotion[i] && wordMotion[i].bounce);
  }
  function pushFrames(i) { return WORD_PUSH / wordSpeedOf(i); }
  function letterStart(i, j) { return wordStart(i) + j * (LETTER_STAGGER / wordSpeedOf(i)); }
  function bounceSpan(i, unitCount) {
    const spd = wordSpeedOf(i);
    return letterStart(i, Math.max(0, unitCount - 1)) + (LETTER_RISE + LETTER_HOLD + LETTER_FALL) / spd;
  }

  function defaultWordColor() {
    return $("#textColor") ? $("#textColor").value : "#101828";
  }
  function wordColor(i) {
    return wordMotion[i]?.color || defaultWordColor();
  }
  function syncWordMotion() {
    const words = wordStrings();
    const fallback = defaultWordColor();
    wordMotion = words.map((_, i) => {
      const prev = wordMotion[i];
      if (i === 0) {
        return { bounce: false, speed: prev?.speed || 1, color: prev?.color || fallback };
      }
      return {
        bounce: prev ? !!prev.bounce : i === 1,
        speed: prev?.speed || 1,
        color: prev?.color || fallback
      };
    });
  }

  function plainWord(word) {
    return word.replace(/\{\{([^{}]+)\}\}/g, (_, id) => `[${assets.get(id)?.label || id}]`);
  }

  function recedeFrames() {
    const node = $("#recedeMs");
    if (!node) return RECEDE;
    return Math.max(4, Number(node.value) / 1000 * FPS);
  }
  function endHoldFrames() {
    const node = $("#endHoldMs");
    if (!node) return 12;
    return Math.max(0, Number(node.value) / 1000 * FPS);
  }
  function endScaleValue() {
    const node = $("#endScale");
    if (!node) return 1;
    return Math.max(0.2, Number(node.value) / 100);
  }
  function iconBounces(unit) {
    if (!unit || unit.type !== "icon") return false;
    return unit.tune?.bounce !== false;
  }
  function wordOrIconBounces(i, units) {
    if (wordBounces(i)) return true;
    return (units || []).some((unit) => iconBounces(unit));
  }

  function lastMotionEnd() {
    const words = wordStrings();
    return Math.max(
      APPROACH_DELAY + APPROACH,
      ...words.map((word, i) => {
        if (i === 0) {
          const units = parseUnits(word, new Map());
          return units.some(iconBounces) ? bounceSpan(i, units.length) : 0;
        }
        const units = parseUnits(word, new Map());
        const bounceEnd = wordOrIconBounces(i, units) ? bounceSpan(i, units.length) : 0;
        return Math.max(wordStart(i) + pushFrames(i), bounceEnd);
      })
    );
  }

  function cycleFrames() {
    return lastMotionEnd() + HOLD + recedeFrames() + endHoldFrames();
  }

  function choreoBeats() {
    const words = wordStrings();
    const beats = [
      { id: "rise", label: "首词升起", kind: "lead", start: 0, end: RISE },
      { id: "approach", label: "推向镜头", kind: "lead", start: APPROACH_DELAY, end: APPROACH_DELAY + APPROACH }
    ];
    words.forEach((word, i) => {
      if (i === 0) return;
      const start = wordStart(i);
      const units = parseUnits(word, new Map());
      const bounce = wordOrIconBounces(i, units);
      const end = bounce ? bounceSpan(i, units.length) : start + pushFrames(i);
      beats.push({
        id: `word-${i}`,
        label: bounce ? `${plainWord(word)} 弹起` : `${plainWord(word)} 顶入`,
        kind: bounce ? "bounce" : "push",
        start,
        end: Math.max(end, start + pushFrames(i))
      });
    });
    const holdStart = lastMotionEnd();
    const recede = recedeFrames();
    const endHold = endHoldFrames();
    beats.push({ id: "hold", label: "停住", kind: "hold", start: holdStart, end: holdStart + HOLD });
    beats.push({ id: "recede", label: "整句收回", kind: "recede", start: holdStart + HOLD, end: holdStart + HOLD + recede });
    if (endHold > 0) {
      beats.push({ id: "endhold", label: "收尾停留", kind: "hold", start: holdStart + HOLD + recede, end: holdStart + HOLD + recede + endHold });
    }
    return beats;
  }

  function cycleLength() { return cycleFrames() / FPS / speed(); }

  function insertToken(id) {
    const field = $("#titleText");
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const token = `{{${id}}}`;
    field.value = `${field.value.slice(0, start)}${token}${field.value.slice(end)}`;
    const caret = start + token.length;
    field.focus();
    field.setSelectionRange(caret, caret);
    renderUsedIcons();
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
      const isAnimal = asset.id.startsWith("animal");
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
    const scaleOut = $("#assetItemScaleOut");
    const oxOut = $("#assetOffsetXOut");
    const oyOut = $("#assetOffsetYOut");
    if (scaleOut) scaleOut.textContent = `${Math.round(asset.scale * 100)}%`;
    if (oxOut) oxOut.textContent = `${Math.round(asset.offsetX)}%`;
    if (oyOut) oyOut.textContent = `${Math.round(asset.offsetY)}%`;
  }

  function renderUsedIcons() {
    const box = $("#usedIcons");
    if (!box) return;
    const items = listInsertedIcons();
    box.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "textswell-used-empty";
      empty.textContent = "句子里还没有图标。点上面的音乐 / 播放 / 云 / 手表或小动物插入。插入后每一枚都能单独调大小和位置。";
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
        <label class="swell-toggle"><input type="checkbox" data-icon-bounce ${tune.bounce !== false ? "checked" : ""}> 这个图标弹起来</label>
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
          output.textContent = key === "scale" ? `${slider.value}%` : `${slider.value}%`;
        });
      });
      const bounceBox = card.querySelector("[data-icon-bounce]");
      if (bounceBox) {
        bounceBox.addEventListener("change", () => {
          tune.bounce = bounceBox.checked;
          renderChoreoTrack();
        });
      }
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

  function drawUnit(ctx, unit, x, baseline, fontPx, color, swell) {
    ctx.save();
    const cx = x + unit.width / 2;
    ctx.translate(cx, baseline);
    ctx.scale(swell, swell);
    if (unit.type === "icon" && unit.asset?.ready) {
      const tune = unit.tune || { offsetX: unit.asset.offsetX, offsetY: unit.asset.offsetY };
      const height = unit.height;
      const width = height * unit.asset.ratio;
      const dx = -width / 2 + height * (tune.offsetX || 0) / 100;
      const dy = -height * 0.82 + height * (tune.offsetY || 0) / 100;
      ctx.drawImage(unit.asset.image, dx, dy, width, height);
    } else {
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(unit.ch, 0, 0);
    }
    ctx.restore();
  }

  function renderFrame(ctx, time, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = $("#backgroundColor").value;
    ctx.fillRect(0, 0, w, h);
    const fontPx = Number($("#fontSize").value);
    const weight = Number($("#fontWeight").value);
    FX.applyFont(ctx, $("#fontFamily").value, fontPx, weight);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const layout = measureWords(ctx, fontPx);
    const words = layout.words;
    const ends = layout.ends;
    const lineWidth = Math.max(1, layout.lineWidth);
    const leadCenter = layout.leadCenter;
    const letterSwell = Number($("#letterSwell").value) / 100;
    const frontWanted = Number(($("#leadScale") || $("#frontScale")).value) / 100;
    const startScale = Number($("#startScale") ? $("#startScale").value : 100) / 100;
    const frame = FX.mod(time, cycleLength()) * FPS * speed();

    const added = words.map((_, i) => (i === 0 ? 0 : ends[i] - ends[i - 1]));
    const totalAdded = added.reduce((a, b) => a + b, 0) || 1;
    const share = added.map((a) => a / totalAdded);
    const before = [];
    for (let i = 0, run = 0; i < words.length; i += 1) {
      before.push(run);
      run += share[i];
    }

    const restLeft = (w - lineWidth) / 2;
    let front = Math.min(frontWanted, (w * FIT - restLeft) / lineWidth);
    for (let i = 1; i < words.length; i += 1) {
      const unspent = 1 - before[i];
      const room = w * FIT - restLeft - (lineWidth / 2) * unspent;
      const reach = ends[i] + WORD_PUSH_EM * fontPx - leadCenter * unspent;
      if (reach > 0) front = Math.min(front, room / reach);
    }
    front = Math.max(1, front);

    const lastEnd = lastMotionEnd();
    const recedeStart = lastEnd + HOLD;
    const recedeLen = recedeFrames();
    const finishScale = endScaleValue();
    const scale =
      interpolate(frame, [APPROACH_DELAY, APPROACH_DELAY + APPROACH], [startScale, front], APPROACH_EASE) +
      interpolate(frame, [recedeStart, recedeStart + recedeLen], [0, finishScale - front], ZOOM_EASE);

    let shoved = 0;
    for (let i = 1; i < words.length; i += 1) {
      shoved += share[i] * interpolate(frame, [wordStart(i), wordStart(i) + pushFrames(i)], [0, 1], WORD_EASE);
    }
    const translateX = (lineWidth / 2 - scale * leadCenter) * (1 - shoved);
    const baselineY = h / 2 + fontPx * 0.18;

    ctx.save();
    ctx.translate(restLeft + translateX, baselineY);
    ctx.scale(scale, scale);

    let cursor = 0;
    words.forEach((word, i) => {
      if (i) cursor += layout.space;
      const isLead = i === 0;
      const start = wordStart(i);
      const spd = wordSpeedOf(i);
      const opacity = isLead
        ? interpolate(frame, [0, INTRO], [0, 1])
        : interpolate(frame, [start, start + 3], [0, 1]);
      const dx = isLead ? 0 : interpolate(frame, [start, start + pushFrames(i)], [WORD_PUSH_EM * fontPx, 0], WORD_EASE);
      const dy = isLead ? interpolate(frame, [0, RISE], [RISE_EM * fontPx, 0], RISE_EASE) : 0;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(dx, dy);
      let unitX = cursor;
      word.units.forEach((unit, j) => {
        let swell = 1;
        const bounces = unit.type === "icon" ? iconBounces(unit) : wordBounces(i);
        if (bounces) {
          const riseAt = letterStart(i, j);
          const riseDur = LETTER_RISE / spd;
          const holdDur = LETTER_HOLD / spd;
          const fallDur = LETTER_FALL / spd;
          const fallAt = riseAt + riseDur + holdDur;
          swell = 1 + letterSwell * (
            interpolate(frame, [riseAt, riseAt + riseDur], [0, 1], LETTER_EASE) -
            interpolate(frame, [fallAt, fallAt + fallDur], [0, 1], LETTER_EASE)
          );
        }
        drawUnit(ctx, unit, unitX, 0, fontPx, wordColor(i), swell);
        unitX += unit.width + layout.tracking;
      });
      ctx.restore();
      cursor += word.width;
    });
    ctx.restore();
  }

  function renderWordMotionList() {
    syncWordMotion();
    const box = $("#wordMotionList");
    if (!box) return;
    const words = wordStrings();
    box.replaceChildren();
    words.forEach((word, i) => {
      const card = document.createElement("div");
      card.className = "word-motion-card";
      if (i === 0) card.classList.add("is-lead");
      const motion = wordMotion[i] || { bounce: false, speed: 1 };
      if (i === 0) {
        const peak = Number(($("#leadScale") || $("#frontScale")).value);
        const start = Number($("#startScale") ? $("#startScale").value : 100);
        card.innerHTML = `<div class="word-motion-head"><b>${plainWord(word)}</b><small>首词 · 升起并放大</small></div>
          <p class="hint" style="margin:0">第一个词不弹，负责开场放大。</p>
          <label class="word-color">字色 <input data-word-color type="color" value="${motion.color || defaultWordColor()}"></label>
          <label>放大到 <output>${(peak / 100).toFixed(2)}×</output>
            <input data-lead-scale type="range" min="110" max="400" step="5" value="${peak}">
          </label>
          <label>从多大开始 <output>${(start / 100).toFixed(2)}×</output>
            <input data-start-scale type="range" min="50" max="160" step="5" value="${start}">
          </label>`;
        const peakInput = card.querySelector("[data-lead-scale]");
        const startInput = card.querySelector("[data-start-scale]");
        const colorInput = card.querySelector("[data-word-color]");
        colorInput.addEventListener("input", () => {
          wordMotion[i].color = colorInput.value;
        });
        peakInput.addEventListener("input", () => {
          if ($("#leadScale")) $("#leadScale").value = peakInput.value;
          if ($("#frontScale")) $("#frontScale").value = peakInput.value;
          peakInput.previousElementSibling.textContent = `${(Number(peakInput.value) / 100).toFixed(2)}×`;
          const out = $("#leadScaleOut");
          if (out) out.textContent = `${(Number(peakInput.value) / 100).toFixed(2)}×`;
          const frontOut = $("#frontScaleOut");
          if (frontOut) frontOut.textContent = `${(Number(peakInput.value) / 100).toFixed(2)}×`;
        });
        startInput.addEventListener("input", () => {
          if ($("#startScale")) $("#startScale").value = startInput.value;
          startInput.previousElementSibling.textContent = `${(Number(startInput.value) / 100).toFixed(2)}×`;
          const out = $("#startScaleOut");
          if (out) out.textContent = `${(Number(startInput.value) / 100).toFixed(2)}×`;
        });
        box.append(card);
        return;
      }
      card.innerHTML = `<div class="word-motion-head"><b>${plainWord(word)}</b><small>第 ${i + 1} 个词</small></div>
        <label class="word-color">字色 <input data-word-color type="color" value="${motion.color || defaultWordColor()}"></label>
        <label class="swell-toggle"><input type="checkbox" data-bounce ${motion.bounce ? "checked" : ""}> 这个词弹起来（字和图标都会动）</label>
        <label>弹起快慢 <output>${Number(motion.speed).toFixed(2)}×</output>
          <input data-speed type="range" min="35" max="220" step="5" value="${Math.round(motion.speed * 100)}">
        </label>`;
      const bounce = card.querySelector("[data-bounce]");
      const speedInput = card.querySelector("[data-speed]");
      const speedOut = speedInput.previousElementSibling;
      const colorInput = card.querySelector("[data-word-color]");
      colorInput.addEventListener("input", () => {
        wordMotion[i].color = colorInput.value;
      });
      bounce.addEventListener("change", () => {
        wordMotion[i].bounce = bounce.checked;
        renderChoreoTrack();
      });
      speedInput.addEventListener("input", () => {
        wordMotion[i].speed = Number(speedInput.value) / 100;
        speedOut.textContent = `${wordMotion[i].speed.toFixed(2)}×`;
        renderChoreoTrack();
      });
      box.append(card);
    });
  }

  function renderChoreoTrack() {
    const track = $("#choreoTrack");
    if (!track) return;
    let beats;
    try {
      beats = choreoBeats();
    } catch (error) {
      console.error(error);
      return;
    }
    const total = Math.max(1, cycleFrames());
    const colors = { lead: "#d7ff2f", bounce: "#8ec8ff", push: "#f3d19e", hold: "#e7e7ea", recede: "#ffc4d6" };
    const backup = track.innerHTML;
    const bar = document.createElement("div");
    bar.className = "swell-track-bar";
    beats.forEach((beat, index) => {
      const cell = document.createElement("div");
      const span = Math.max(0.01, beat.end - beat.start);
      cell.className = `swell-beat-block is-${beat.kind}`;
      cell.style.cssText = `width:${Math.max(14, (span / total) * 100)}%;min-width:76px;min-height:88px;background:${colors[beat.kind] || "#ececef"};color:#111;border:1px solid #111;padding:8px;`;
      cell.setAttribute("role", "button");
      cell.tabIndex = 0;
      cell.innerHTML = `<em>${index + 1}</em><strong>${beat.label}</strong><small>${(span / FPS).toFixed(2)}秒</small>`;
      const jump = () => { if (player) player.setTime(beat.start / FPS / speed()); };
      cell.addEventListener("click", jump);
      cell.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") jump();
      });
      bar.append(cell);
    });
    const head = document.createElement("div");
    head.className = "swell-playhead";
    head.id = "choreoPlayhead";
    bar.append(head);
    const list = document.createElement("ol");
    list.className = "swell-track-legend";
    beats.forEach((beat, index) => {
      const item = document.createElement("li");
      item.innerHTML = `<i class="is-${beat.kind}"></i><b>${index + 1}. ${beat.label}</b><span>${(beat.start / FPS).toFixed(2)}s → ${(beat.end / FPS).toFixed(2)}s</span>`;
      list.append(item);
    });
    try {
      track.replaceChildren(bar, list);
    } catch (error) {
      console.error(error);
      track.innerHTML = backup;
    }
  }

  try { renderChoreoTrack(); } catch (error) { console.error(error); }

  function collectState() {
    const uploads = [];
    assets.forEach((asset) => {
      if (asset.removable) uploads.push({ id: asset.id, label: asset.label, src: asset.src, scale: asset.scale, offsetX: asset.offsetX, offsetY: asset.offsetY });
    });
    return {
      version: 1,
      text: $("#titleText").value,
      fontFamily: $("#fontFamily").value,
      fontWeight: $("#fontWeight").value,
      backgroundColor: $("#backgroundColor").value,
      textColor: $("#textColor").value,
      tracking: $("#tracking").value,
      iconGap: $("#iconGap").value,
      letterSwell: $("#letterSwell").value,
      frontScale: $("#frontScale").value,
      leadScale: $("#leadScale") ? $("#leadScale").value : $("#frontScale").value,
      startScale: $("#startScale") ? $("#startScale").value : "100",
      endScale: $("#endScale") ? $("#endScale").value : "100",
      recedeMs: $("#recedeMs") ? $("#recedeMs").value : "600",
      endHoldMs: $("#endHoldMs") ? $("#endHoldMs").value : "400",
      fontSize: $("#fontSize").value,
      speed: $("#speed").value,
      wordMotion,
      instanceTunes: Object.fromEntries(instanceTunes),
      uploads
    };
  }

  function applyState(state) {
    if (!state || typeof state !== "object") return;
    $("#titleText").value = state.text || DEFAULT_TEXT;
    if (state.fontFamily) $("#fontFamily").value = state.fontFamily;
    if (state.fontWeight) $("#fontWeight").value = state.fontWeight;
    if (state.backgroundColor) $("#backgroundColor").value = state.backgroundColor;
    if (state.textColor) $("#textColor").value = state.textColor;
    ["tracking", "iconGap", "letterSwell", "frontScale", "leadScale", "startScale", "endScale", "recedeMs", "endHoldMs", "fontSize", "speed"].forEach((key) => {
      if (state[key] != null && $(`#${key}`)) $(`#${key}`).value = state[key];
    });
    if (Array.isArray(state.wordMotion)) wordMotion = state.wordMotion;
    instanceTunes.clear();
    Object.entries(state.instanceTunes || {}).forEach(([key, value]) => instanceTunes.set(key, value));
    (state.uploads || []).forEach((item) => addAsset(item.id, item.label, item.src, true));
    syncWordMotion();
    renderAssetGrid();
    syncAssetTuner();
    renderUsedIcons();
    renderWordMotionList();
    renderChoreoTrack();
    if (player) player.setTime(0);
  }

  const player = FX.create({
    filePrefix: "textswell",
    cycleLength,
    onTick(_time, local) {
      try {
      const beatLabel = $("#choreoBeat");
      const head = $("#choreoPlayhead");
      const frame = local * FPS * speed();
      const beats = choreoBeats();
      const current = beats.find((beat) => frame >= beat.start && frame < beat.end) || beats[beats.length - 1];
      if (beatLabel && current) beatLabel.textContent = current.label;
      if (head) {
        const total = Math.max(1, cycleFrames());
        head.style.left = `${(frame / total) * 100}%`;
      }
      const blocks = document.querySelectorAll(".swell-beat-block");
      blocks.forEach((block, index) => {
        block.classList.toggle("is-active", beats[index] && beats[index].id === current?.id);
      });
      } catch (error) { console.error(error); }
    },
    updateOutputs() {
      const set = (id, value) => { const node = $(id); if (node) node.textContent = value; };
      set("#trackingOut", `${(Number($("#tracking").value) / 1000).toFixed(3)}em`);
      set("#iconGapOut", `${(Number($("#iconGap").value) / 1000).toFixed(2)}em`);
      set("#letterSwellOut", `${$("#letterSwell").value}%`);
      set("#frontScaleOut", `${(Number($("#frontScale").value) / 100).toFixed(2)}×`);
      set("#leadScaleOut", `${(Number(($("#leadScale") || $("#frontScale")).value) / 100).toFixed(2)}×`);
      set("#startScaleOut", `${(Number($("#startScale") ? $("#startScale").value : 100) / 100).toFixed(2)}×`);
      set("#endScaleOut", `${endScaleValue().toFixed(2)}×`);
      set("#recedeMsOut", formatSeconds(Number($("#recedeMs") ? $("#recedeMs").value : 600) / 1000));
      set("#endHoldMsOut", formatSeconds(Number($("#endHoldMs") ? $("#endHoldMs").value : 400) / 1000));
      set("#fontSizeOut", $("#fontSize").value);
      set("#speedOut", `${speed().toFixed(2)}×`);
    },
    renderFrame
  });

  $("#titleText").addEventListener("input", () => {
    syncWordMotion();
    renderUsedIcons();
    renderWordMotionList();
    renderChoreoTrack();
  });
  if ($("#leadScale")) {
    $("#leadScale").addEventListener("input", () => {
      if ($("#frontScale")) $("#frontScale").value = $("#leadScale").value;
      renderWordMotionList();
    });
  }
  if ($("#frontScale")) {
    $("#frontScale").addEventListener("input", () => {
      if ($("#leadScale")) $("#leadScale").value = $("#frontScale").value;
      renderWordMotionList();
    });
  }
  if ($("#startScale")) {
    $("#startScale").addEventListener("input", () => renderWordMotionList());
  }
  ["#endScale", "#recedeMs", "#endHoldMs"].forEach((id) => {
    const node = $(id);
    if (!node) return;
    node.addEventListener("input", () => renderChoreoTrack());
  });
  $("#saveButton").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(collectState(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "textswell-scheme.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    localStorage.setItem("textswell-scheme", JSON.stringify(collectState()));
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
    localStorage.removeItem("textswell-scheme");
    wordMotion = [];
    instanceTunes.clear();
    $("#titleText").value = DEFAULT_TEXT;
    syncWordMotion();
    renderUsedIcons();
    renderWordMotionList();
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

  renderAssetGrid();
  syncAssetTuner();
  renderUsedIcons();
  syncWordMotion();
  renderWordMotionList();
  renderChoreoTrack();
})();
