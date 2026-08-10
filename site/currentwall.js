(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#flowCanvas");
  const frameCounter = $("#frameCounter");
  const exportStatus = $("#exportStatus");
  const fps = 30;
  const inputs = {
    rows: $("#rowsInput"), font: $("#fontFamily"), fontSize: $("#fontSize"),
    lineGap: $("#lineGap"), speed: $("#speed"), assetScale: $("#assetScale"),
    wave: $("#wave"), waveRate: $("#waveRate"), vertical: $("#vertical"),
    repeatGap: $("#repeatGap"), background: $("#backgroundColor"), foreground: $("#textColor"),
    motionMode: $("#motionMode"), introWord: $("#introWord"), cycleDuration: $("#cycleDuration"),
    reversePull: $("#reversePull"), burst: $("#burst"), finalLine: $("#finalLine"), finalSwap: $("#finalSwap"),
    introLeft: $("#introLeft"), introReturn: $("#introReturn"), popDuration: $("#popDuration"),
    fullDuration: $("#fullDuration"), exitDuration: $("#exitDuration"), finalDuration: $("#finalDuration"),
    swapMoment: $("#swapMoment"), assetItemScale: $("#assetItemScale"),
    assetOffsetX: $("#assetOffsetX"), assetOffsetY: $("#assetOffsetY")
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
    ["music", "音乐", svg('<g transform="translate(10 0)"><path d="M59 18v47c-3-2-7-3-11-2-9 1-15 7-14 14 1 7 8 11 17 10 9-1 16-7 16-15V28L38 35v34c-3-2-7-3-11-2-9 1-15 7-14 14 1 7 8 11 17 10 9-1 16-7 16-15V26z" fill="white"/></g>', "#fa264f")],
    ["play", "播放", svg('<circle cx="50" cy="50" r="35" fill="none" stroke="white" stroke-width="6"/><path d="M40 29 69 50 40 71z" fill="white"/>', "#111111")],
    ["cloud", "云", svg('<g transform="translate(-9 -2)"><path d="M28 69h45a17 17 0 0 0 1-34 25 25 0 0 0-46 8 13 13 0 0 0 0 26z" fill="white"/></g>', "#1389ff")],
    ["watch", "手表", svg('<rect x="27" y="20" width="46" height="60" rx="16" fill="#111"/><rect x="34" y="28" width="32" height="44" rx="10" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8")]
  ];

  function addAsset(id, label, src, removable = false) {
    const image = new Image();
    const asset = { id, label, src, image, ratio: 1, ready: false, removable, scale: 1, offsetX: 0, offsetY: 0 };
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
      insert.className = "asset-insert";
      insert.title = `插入 {{${asset.id}}}`;
      const preview = document.createElement("img");
      preview.src = asset.src;
      preview.alt = "";
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
        remove.title = `移除 ${asset.label}`;
        remove.addEventListener("click", () => removeAsset(asset.id));
        card.append(remove);
      }
      grid.append(card);
    });
  }

  function syncAssetTuner() {
    const asset = assets.get(selectedAssetId) || assets.values().next().value;
    if (!asset) return;
    selectedAssetId = asset.id;
    $("#selectedAssetName").textContent = asset.label;
    inputs.assetItemScale.value = String(Math.round(asset.scale * 100));
    inputs.assetOffsetX.value = String(Math.round(asset.offsetX));
    inputs.assetOffsetY.value = String(Math.round(asset.offsetY));
    $("#assetItemScaleOut").textContent = `${Math.round(asset.scale * 100)}%`;
    $("#assetOffsetXOut").textContent = `${Math.round(asset.offsetX)}%`;
    $("#assetOffsetYOut").textContent = `${Math.round(asset.offsetY)}%`;
  }

  function updateSelectedAsset() {
    const asset = assets.get(selectedAssetId);
    if (!asset) return;
    asset.scale = Number(inputs.assetItemScale.value) / 100;
    asset.offsetX = Number(inputs.assetOffsetX.value);
    asset.offsetY = Number(inputs.assetOffsetY.value);
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

  [inputs.rows, inputs.introWord, inputs.finalLine].forEach((field) => {
    field.addEventListener("focus", () => { activeTokenInput = field; });
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
    syncAssetTuner();
  }

  $("#assetUpload").addEventListener("change", (event) => {
    [...event.currentTarget.files].forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const id = `img${++uploadSerial}`;
        addAsset(id, file.name.replace(/\.[^.]+$/, "").slice(0, 12) || id, String(reader.result), true);
        renderAssetGrid();
        insertToken(id);
      };
      reader.readAsDataURL(file);
    });
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
  const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const rangeProgress = (value, from, to) => clamp01((value - from) / (to - from));

  function layoutTokens(context, line, fontPx, assetHeight, repeatGap) {
    const cacheKey = [line, context.font, fontPx.toFixed(3), assetHeight.toFixed(3), repeatGap.toFixed(3), assetRevision].join("|");
    const cached = layoutCache.get(cacheKey);
    if (cached) return cached;
    const items = tokensFor(line).map((token) => {
      if (token.type === "text") return { ...token, width: context.measureText(token.value).width };
      const asset = assets.get(token.id);
      const tunedHeight = assetHeight * (asset?.scale || 1);
      return { ...token, asset, width: tunedHeight * (asset?.ratio || 1), height: tunedHeight };
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
        const drawX = cursor + item.height * item.asset.offsetX / 100;
        const drawY = y + item.height * item.asset.offsetY / 100;
        if (assetRotation) {
          context.save();
          context.translate(drawX + item.width / 2, drawY);
          context.rotate(assetRotation);
          context.drawImage(item.asset.image, -item.width / 2, -item.height / 2, item.width, item.height);
          context.restore();
        } else {
          context.drawImage(item.asset.image, drawX, drawY - item.height / 2, item.width, item.height);
        }
      } else {
        context.save();
        context.strokeStyle = color;
        context.lineWidth = Math.max(1, item.height * .045);
        context.strokeRect(cursor + 1, y - item.height / 2, Math.max(2, item.width - 2), item.height);
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
    const cycle = Number(inputs.cycleDuration.value) / 1000;
    const raw = [inputs.introLeft, inputs.introReturn, inputs.popDuration, inputs.fullDuration, inputs.exitDuration, inputs.finalDuration]
      .map((input) => Number(input.value) / 1000);
    const rawTotal = raw.reduce((sum, value) => sum + value, 0);
    const ratio = cycle / Math.max(.1, rawTotal);
    const duration = raw.map((value) => value * ratio);
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
    const masterSpeed = Number(inputs.speed.value) / 100;
    const waveAmp = Number(inputs.wave.value) * scale;
    const waveRate = Number(inputs.waveRate.value) / 100;
    const verticalSpeed = Number(inputs.vertical.value) * scale;
    const laneCount = Math.ceil(h / lineHeight) + 6;
    const halfLanes = Math.ceil(laneCount / 2);
    const choreography = inputs.motionMode.value === "choreography";
    const timing = choreographyTiming();
    const localTime = choreography ? mod(time, timing.cycle) : time;
    const verticalOffset = Math.sin(localTime * .34) * verticalSpeed * 1.8;

    context.font = `${preset.style} ${preset.weight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.imageSmoothingEnabled = true;

    if (choreography && localTime < timing.leftEnd) {
      const introFontPx = fontPx * 1.12;
      const introAssetHeight = assetHeight * 1.12;
      context.font = `${preset.style} ${preset.weight} ${introFontPx}px "${preset.family}", "Continuation SC", sans-serif`;
      const introLayout = layoutTokens(context, inputs.introWord.value.trim() || "for", introFontPx, introAssetHeight, 0);
      const introPhase = rangeProgress(localTime, 0, timing.leftEnd);
      const drift = lerp(0, -fontPx * .72, smooth(introPhase));
      context.save();
      context.translate(w / 2 + drift, h / 2);
      drawSequence(context, introLayout, -introLayout.width / 2, 0, inputs.foreground.value);
      context.restore();
      context.font = `${preset.style} ${preset.weight} ${fontPx}px "${preset.family}", "Continuation SC", sans-serif`;
    }

    const burstStrength = Number(inputs.burst.value) / 100;
    const fullProgress = rangeProgress(localTime, timing.popEnd, timing.fullEnd);
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
        wallScale = lerp(initialScale, 1, smooth(formationProgress));
        revealLimit = lerp(1.05, halfLanes + 1, easeOut(rangeProgress(formationProgress, .04, .96)));
        wallShiftX = formationProgress < returnCut
          ? lerp(-fontPx * .72, fontPx * .42, easeOut(formationProgress / returnCut))
          : lerp(fontPx * .42, -fontPx * .28, smooth(rangeProgress(formationProgress, returnCut, 1)));
      } else if (localTime < timing.fullEnd) {
        revealLimit = halfLanes + 1;
      } else if (localTime < timing.exitEnd) {
        wallScale = lerp(1, 1.06, smooth(exitProgress));
        revealLimit = halfLanes + 1;
      } else {
        finalStage = true;
        const shrink = smooth(rangeProgress(finalProgress, .62, 1));
        wallScale = lerp(1.06, .64, shrink);
        revealLimit = 0;
        wallAlpha = 1 - smooth(rangeProgress(finalProgress, .9, 1));
      }
    }

    const localWidth = w / wallScale;
    context.save();
    context.translate(w / 2, h / 2);
    context.scale(wallScale, wallScale);
    context.translate(-localWidth / 2, 0);

    for (let laneIndex = -halfLanes; laneIndex <= halfLanes; laneIndex += 1) {
      if (choreography && finalStage && laneIndex !== 0) continue;
      const sourceIndex = mod(laneIndex, rows.length);
      const setting = rowSettings[sourceIndex] || { direction: -1, speed: 100, phase: 0 };
      const finalLine = inputs.finalLine.value.replace(/\s*\r?\n\s*/g, " ").trim();
      const swapActive = finalStage && inputs.finalSwap.value === "on" && finalProgress >= Number(inputs.swapMoment.value) / 100;
      const line = finalStage ? (swapActive ? (finalLine || rows[0]) : rows[0]) : rows[sourceIndex];
      const layout = layoutTokens(context, line, fontPx, assetHeight, repeatGap);
      const laneDistance = Math.abs(laneIndex);
      let rowAlpha = laneDistance <= revealLimit ? 1 : 0;
      if (choreography && localTime >= timing.fullEnd && localTime < timing.exitEnd && laneIndex !== 0) {
        const inwardOrder = (halfLanes - laneDistance) / Math.max(1, halfLanes);
        const disappearAt = .44 + inwardOrder * .43 + (laneIndex > 0 ? .012 : 0);
        rowAlpha *= 1 - smooth(rangeProgress(exitProgress, disappearAt, disappearAt + .055));
      }
      if (rowAlpha <= .001 || wallAlpha <= .001) continue;

      const yWave = Math.sin(localTime * waveRate * 1.45 + laneIndex * .72) * waveAmp * .28;
      const xWave = Math.sin(localTime * waveRate * .92 + laneIndex * .91) * waveAmp;
      const y = laneIndex * lineHeight * (choreography && localTime >= timing.fullEnd ? lerp(1, .92, exitProgress) : 1) + verticalOffset + yWave;
      const velocity = fontPx * .9 * masterSpeed * (setting.speed / 100);
      const signedTravel = setting.direction === 0 ? 0 : (setting.direction < 0 ? localTime * velocity : -localTime * velocity);
      const globalLeftPull = choreography ? localWidth * .23 * smooth(rangeProgress(localTime, timing.returnEnd, timing.fullEnd)) : 0;
      let reverseTravel = 0;
      if (choreography && localTime >= timing.popEnd) {
        const pull = Number(inputs.reversePull.value) / 100;
        const enter = smooth(rangeProgress(fullProgress, .56, .78));
        const continueRight = Math.max(0, fullProgress - .78);
        const centerWeight = Math.exp(-(laneIndex * laneIndex) / 5.2);
        reverseTravel = centerWeight * localWidth * pull * (.3 * enter + .5 * continueRight);
      }

      if (finalStage) {
        const originalLayout = layoutTokens(context, rows[0], fontPx, assetHeight, repeatGap);
        const finalVelocity = fontPx * .9 * masterSpeed * (setting.speed / 100);
        const signedAtExit = setting.direction === 0 ? 0 : (setting.direction < 0 ? timing.exitEnd * finalVelocity : -timing.exitEnd * finalVelocity);
        const xWaveAtExit = Math.sin(timing.exitEnd * waveRate * .92) * waveAmp;
        const pull = Number(inputs.reversePull.value) / 100;
        const reverseAtExit = localWidth * pull * (.3 + .5 * .22);
        const shiftAtExit = signedAtExit + setting.phase / 100 * originalLayout.width + xWaveAtExit + localWidth * .23 - reverseAtExit - localWidth * .55;
        const repeatedStart = -mod(shiftAtExit, originalLayout.width) - originalLayout.width;
        const anchorAtExit = repeatedStart + Math.round((localWidth / 2 - repeatedStart) / originalLayout.width) * originalLayout.width;
        const anchorX = anchorAtExit;
        drawAnchoredLine(context, layout, y, localWidth, inputs.foreground.value, anchorX, rowAlpha * wallAlpha);
        continue;
      }

      let groupRight = 0;
      let centerLeftPush = 0;
      if (choreography && localTime >= timing.fullEnd) {
        const centerWeight = Math.exp(-(laneIndex * laneIndex) / 2.7);
        const leftImpulse = exitProgress < .16
          ? smooth(exitProgress / .16)
          : 1 - smooth(rangeProgress(exitProgress, .16, .34));
        centerLeftPush = localWidth * .085 * centerWeight * leftImpulse;
        const followDelay = .09 + laneDistance / Math.max(1, halfLanes) * .23;
        const follow = easeOut(rangeProgress(exitProgress, followDelay, Math.min(.96, followDelay + .58)));
        groupRight = localWidth * .58 * follow;
      }
      const shift = signedTravel + setting.phase / 100 * layout.width + xWave + globalLeftPull + centerLeftPush - reverseTravel - groupRight - wallShiftX;
      drawRepeatedLine(context, layout, y, localWidth, inputs.foreground.value, shift, rowAlpha * wallAlpha);
    }
    context.restore();
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
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
    const displayTime = inputs.motionMode.value === "choreography" ? mod(time, Number(inputs.cycleDuration.value) / 1000) : time;
    frameCounter.textContent = `F ${String(Math.round(displayTime * fps)).padStart(4, "0")}`;
    rafId = requestAnimationFrame(previewLoop);
  }

  function setTime(time) {
    pausedAt = Math.max(0, time);
    animationStart = performance.now() - pausedAt * 1000;
  }

  $("#restartButton").addEventListener("click", () => setTime(0));
  $("#pauseButton").addEventListener("click", (event) => {
    if (paused) {
      animationStart = performance.now() - pausedAt * 1000;
      paused = false;
      event.currentTarget.textContent = "暂停";
    } else {
      pausedAt = currentTime();
      paused = true;
      event.currentTarget.textContent = "继续";
    }
  });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(currentTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(currentTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });

  function updateOutputs() {
    const values = {
      fontSizeOut: inputs.fontSize.value,
      lineGapOut: inputs.lineGap.value,
      speedOut: `${(Number(inputs.speed.value) / 100).toFixed(2)}×`,
      assetScaleOut: `${inputs.assetScale.value}%`,
      waveOut: inputs.wave.value,
      waveRateOut: (Number(inputs.waveRate.value) / 100).toFixed(2),
      verticalOut: inputs.vertical.value,
      repeatGapOut: inputs.repeatGap.value,
      cycleDurationOut: `${(Number(inputs.cycleDuration.value) / 1000).toFixed(1)}秒`,
      reversePullOut: `${inputs.reversePull.value}%`,
      burstOut: `${inputs.burst.value}%`,
      introLeftOut: inputs.introLeft.value,
      introReturnOut: inputs.introReturn.value,
      popDurationOut: inputs.popDuration.value,
      fullDurationOut: inputs.fullDuration.value,
      exitDurationOut: inputs.exitDuration.value,
      finalDurationOut: inputs.finalDuration.value,
      swapMomentOut: `${inputs.swapMoment.value}%`
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).textContent = value; });
    document.documentElement.style.setProperty("--text-color", inputs.foreground.value);
  }

  Object.values(inputs).forEach((input) => input.addEventListener("input", updateOutputs));
  [inputs.assetItemScale, inputs.assetOffsetX, inputs.assetOffsetY].forEach((input) => {
    input.addEventListener("input", updateSelectedAsset);
  });
  inputs.rows.addEventListener("input", syncRowSettings);
  inputs.motionMode.addEventListener("change", () => setTime(0));

  function exportDimensions() {
    const preset = $("#exportPreset").value;
    if (preset === "current") return [Math.round(window.innerWidth), Math.round(window.innerHeight)];
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

  $("#exportPng").addEventListener("click", () => {
    const output = makeExportCanvas();
    renderFrame(output, currentTime(), output.width, output.height, 1);
    output.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `current-wall-${output.width}x${output.height}.png`);
      exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
    }, "image/png");
  });

  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) {
      exportStatus.textContent = "GIF 编码器未加载，请刷新页面后重试。";
      return;
    }
    const output = makeExportCanvas();
    const gifFps = 12;
    const duration = inputs.motionMode.value === "choreography" ? Number(inputs.cycleDuration.value) / 1000 : 4;
    const frameTotal = gifFps * duration;
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
        downloadBlob(blob, `current-wall-${output.width}x${output.height}.gif`);
        setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height}`);
      });
      gif.render();
    } catch (error) {
      console.error(error);
      setExportBusy(false, "GIF 编码失败，请缩小尺寸后重试。");
    }
  });

  $("#exportVideo").addEventListener("click", async () => {
    const output = makeExportCanvas();
    if (!output.captureStream || !window.MediaRecorder) {
      exportStatus.textContent = "当前浏览器不支持视频录制，请使用最新版 Chrome / Edge。";
      return;
    }
    const candidates = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const stream = output.captureStream(fps);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 12_000_000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        downloadBlob(new Blob(chunks, { type }), `current-wall-${output.width}x${output.height}.${extension}`);
        resolve(extension.toUpperCase());
      };
    });
    const duration = inputs.motionMode.value === "choreography" ? Number(inputs.cycleDuration.value) / 1000 : 4;
    setExportBusy(true, "正在录制视频 · 0%");
    recorder.start();
    const started = performance.now();
    await new Promise((resolve) => {
      function draw(now) {
        const elapsed = (now - started) / 1000;
        renderFrame(output, elapsed, output.width, output.height, 1);
        exportStatus.textContent = `正在录制视频 · ${Math.min(100, Math.round(elapsed / duration * 100))}%`;
        if (elapsed < duration) requestAnimationFrame(draw);
        else resolve();
      }
      requestAnimationFrame(draw);
    });
    recorder.stop();
    const extension = await finished;
    stream.getTracks().forEach((track) => track.stop());
    setExportBusy(false, `${extension} 视频已生成 · ${output.width} × ${output.height}`);
  });

  window.addEventListener("beforeunload", () => cancelAnimationFrame(rafId));
  if (window.innerWidth <= 720) $("#controlPanel").removeAttribute("open");
  renderAssetGrid();
  syncAssetTuner();
  syncRowSettings();
  updateOutputs();
  document.fonts.ready.finally(previewLoop);
})();
