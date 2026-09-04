(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const STORAGE_KEY = "me-motion-continuation-scheme-v2";
  const designFrame = $("#designFrame");
  const previewCanvas = $("#previewCanvas");
  const exportStatus = $("#exportStatus");
  const schemeStatus = $("#schemeStatus");
  const controlIds = [
    "fontFamily", "leadFontSize", "suffixFontSize", "leadFontWeight", "suffixFontWeight",
    "anticipation", "wordGap", "settleScale", "speed", "backgroundColor", "textColor",
    "exportPreset", "exportWidth", "exportHeight"
  ];
  const inputs = Object.fromEntries(controlIds.map((id) => [id, $(`#${id}`)]));
  const runtimeAssets = new Map();
  const runtimeBackgrounds = new Map();
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const splitText = (value) => segmenter ? [...segmenter.segment(String(value || ""))].map((part) => part.segment) : Array.from(String(value || ""));
  const isPunctuation = (character) => /^\p{P}+$/u.test(character);
  const normalizeColor = (value, fallback = "#ffffff") => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const normalizeFontSize = (value, fallback = 48) => clamp(Number(value) || Number(fallback) || 48, 18, 180);
  const normalizeLetterSpacing = (value, fallback = 0) => clamp(Number.isFinite(Number(value)) ? Number(value) : Number(fallback) || 0, -20, 60);
  const normalizePairGap = (value, fallback = 8) => clamp(Number.isFinite(Number(value)) ? Number(value) : Number.isFinite(Number(fallback)) ? Number(fallback) : 8, 0, 96);
  const normalizeAssetSpacing = (value, fallback = 6) => clamp(Number.isFinite(Number(value)) ? Number(value) : Number(fallback) || 6, 0, 96);
  const normalizeSweepDuration = (value, fallback = 100) => clamp(Number.isFinite(Number(value)) ? Number(value) : Number(fallback) || 100, 40, 600);
  const normalizeMilliseconds = (value, fallback, min, max) => clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max);
  const normalizeLeadIntroStyle = (value) => value === "softPop" ? "softPop" : "original";
  const normalizeRowFontFamily = (value) => {
    if (value === "inherit") return "inherit";
    const fontId = window.STGFontLibrary?.idFor(value);
    return fontId ? `stg:${fontId}` : "inherit";
  };
  const normalizeBackgroundTransition = (value) => value === "crossfade" ? "crossfade" : "direct";
  const normalizeBackgroundTransitionDuration = (value) => normalizeMilliseconds(value, 120, 10, 2000);
  const normalizeBackgroundMedia = (media) => media && typeof media === "object" && media.url ? { name: String(media.name || "上传素材"), url: String(media.url), fileType: String(media.fileType || ""), opacity: clamp(Number.isFinite(Number(media.opacity)) ? Number(media.opacity) : 100, 0, 100), tintColor: normalizeColor(media.tintColor, "#000000"), tintStrength: clamp(Number.isFinite(Number(media.tintStrength)) ? Number(media.tintStrength) : 0, 0, 100), videoStart: Math.max(0, Number.isFinite(Number(media.videoStart)) ? Number(media.videoStart) : 0), videoEnd: Number.isFinite(Number(media.videoEnd)) && Number(media.videoEnd) > 0 ? Number(media.videoEnd) : null } : null;
  const sweepColorChoices = ["#ff375f", "#ff9f0a", "#ffd60a", "#32d74b", "#00c7be", "#0a84ff", "#5e5ce6", "#bf5af2", "#ff2d55"];
  const generatedSweepColor = (rowId, index) => {
    let seed = index * 17;
    String(rowId || "row").split("").forEach((character) => { seed = (seed * 31 + character.charCodeAt(0)) >>> 0; });
    return sweepColorChoices[seed % sweepColorChoices.length];
  };
  const normalizeSweepColors = (colors, text, rowId) => {
    const source = Array.isArray(colors) ? colors : [];
    return splitText(text).map((_, index) => normalizeColor(source[index], generatedSweepColor(rowId, index)));
  };
  const randomSweepColors = (text) => {
    let previous = -1;
    return splitText(text).map(() => {
      let choice = Math.floor(Math.random() * sweepColorChoices.length);
      if (choice === previous) choice = (choice + 1) % sweepColorChoices.length;
      previous = choice;
      return sweepColorChoices[choice];
    });
  };
  const normalizeRevealStyle = (value) => value === "type" || value === "rightPop" ? value : "whole";
  const revealStyleLabel = (value) => value === "type" ? "逐字快速扫入" : value === "rightPop" ? "向右弹出" : "整体快速出现";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clamp01 = (value) => clamp(value, 0, 1);
  const isVideoMedia = (media) => /^video\//i.test(media?.fileType || "");
  const videoClipBounds = (media, duration) => {
    const safeDuration = Math.max(.1, Number(duration) || .1);
    const start = clamp(Number(media?.videoStart) || 0, 0, Math.max(0, safeDuration - .1));
    const requestedEnd = Number(media?.videoEnd);
    const end = clamp(Number.isFinite(requestedEnd) && requestedEnd > 0 ? Math.max(requestedEnd, start + .1) : safeDuration, start + .1, safeDuration);
    return { start, end, duration: Math.max(.1, end - start) };
  };
  const videoClipTime = (media, duration, localTime) => {
    const clip = videoClipBounds(media, duration);
    return Math.min(clip.end - .001, clip.start + (((localTime % clip.duration) + clip.duration) % clip.duration));
  };
  const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const easeOutBack = (value, overshoot) => { const progress = clamp01(value); if (overshoot <= 0) return easeOut(progress); const shifted = progress - 1; return 1 + (overshoot + 1) * Math.pow(shifted, 3) + overshoot * Math.pow(shifted, 2); };
  const easeOutExpo = (value) => value >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(value));
  const easeSettle = (value) => 1 - Math.pow(1 - clamp01(value), 2);

  const sharedIcons = window.STGIconLibrary;
  if (!sharedIcons) throw new Error("共享图标库未加载");
  const { flow: flowIconImages, gifMotion: gifMotionImages, animals: transparentAnimalImages, bots: botSeriesImages } = sharedIcons.groups;

  const defaultControls = {
    fontFamily: "stg:inter", leadFontSize: "48", suffixFontSize: "48", leadFontWeight: "500", suffixFontWeight: "500",
    suffixTypeDuration: "600", suffixRevealDuration: "120", suffixPopDuration: "420", suffixPopDistance: "72", suffixPopBounce: "55", anticipation: "25", wordGap: "8",
    settleScale: "110", speed: "100", introDuration: "267", rootHold: "100",
    anticipationDuration: "100", settleDuration: "500", phraseHold: "300", backgroundColor: "#000000", textColor: "#ffffff",
    exportPreset: "1920x1080", exportWidth: "1080", exportHeight: "1920"
  };
  function rowMotionDefaults(revealStyle = "whole", backgroundColor = "#000000") {
    return { introDuration: 267, rootHold: 100, anticipationDuration: 100, revealDuration: revealStyle === "type" ? 600 : revealStyle === "rightPop" ? 420 : 120, settleDuration: 500, phraseHold: 300, popDistance: 72, popBounce: 55, backgroundColor, backgroundMedia: null, backgroundTransition: "direct", backgroundTransitionDuration: 120 };
  }
  let phrasePairs = [{ id: "continuation-row-1", lead: "One", suffix: "subscription.", revealStyle: "whole", leadColor: "#ffffff", suffixColor: "#ffffff", punctuationColor: "#ffffff", leadFontSize: 48, suffixFontSize: 48, leadLetterSpacing: 0, suffixLetterSpacing: 0, pairGap: 8, sweepEnabled: false, sweepColors: [], sweepDuration: 100, leadIntroStyle: "original", ...rowMotionDefaults("whole") }, { id: "continuation-row-2", lead: "Endless", suffix: "creativity.", revealStyle: "type", leadColor: "#ffffff", suffixColor: "#ffffff", punctuationColor: "#ffffff", leadFontSize: 48, suffixFontSize: 48, leadLetterSpacing: 0, suffixLetterSpacing: 0, pairGap: 8, sweepEnabled: false, sweepColors: [], sweepDuration: 100, leadIntroStyle: "original", ...rowMotionDefaults("type") }];
  let rowPositions = [50, 50];
  let assets = [];
  let activeAssetId = null;
  let selectedCandidate = null;
  let nextAssetId = 1;
  let playing = true;
  let activePreviewBackgroundRowId = null;
  let simulationTime = 0;
  let lastFrameAt = performance.now();
  let persistTimer = 0;
  let draggedAssetId = null;
  let activeTimelineRow = 0;
  let assetTargetRow = 0;
  let nextRowId = 3;
  let exporting = false;
  let approvedDefaultScheme = null;

  async function loadApprovedDefaultScheme() {
    if (approvedDefaultScheme) return approvedDefaultScheme;
    const response = await fetch("assets/presets/continuation-default.json?v=20260829-1");
    if (!response.ok) throw new Error(`默认示例读取失败（${response.status}）`);
    approvedDefaultScheme = await response.json();
    return approvedDefaultScheme;
  }

  function parsePairs() {
    const pairs = phrasePairs.map((pair) => [String(pair.lead || "").trim(), String(pair.suffix || "").trim(), normalizeRevealStyle(pair.revealStyle), normalizeColor(pair.punctuationColor, inputs.textColor.value), normalizeColor(pair.leadColor, inputs.textColor.value), normalizeColor(pair.suffixColor, inputs.textColor.value), normalizeFontSize(pair.leadFontSize, inputs.leadFontSize.value), normalizeFontSize(pair.suffixFontSize, inputs.suffixFontSize.value), pair.id, normalizeLetterSpacing(pair.leadLetterSpacing), normalizeLetterSpacing(pair.suffixLetterSpacing), normalizePairGap(pair.pairGap, inputs.wordGap.value), Boolean(pair.sweepEnabled), normalizeSweepColors(pair.sweepColors, String(pair.suffix || "").trim(), pair.id), normalizeSweepDuration(pair.sweepDuration), normalizeLeadIntroStyle(pair.leadIntroStyle), normalizeMilliseconds(pair.introDuration, 267, 50, 1000), normalizeMilliseconds(pair.rootHold, 100, 0, 1500), normalizeMilliseconds(pair.anticipationDuration, 100, 30, 800), normalizeMilliseconds(pair.revealDuration, rowMotionDefaults(pair.revealStyle).revealDuration, 50, 3000), normalizeMilliseconds(pair.settleDuration, 500, 100, 1500), normalizeMilliseconds(pair.phraseHold, 300, 0, 300000), clamp(Number.isFinite(Number(pair.popDistance)) ? Number(pair.popDistance) : 72, 0, 220), clamp(Number.isFinite(Number(pair.popBounce)) ? Number(pair.popBounce) : 55, 0, 100), normalizeColor(pair.backgroundColor, inputs.backgroundColor.value), normalizeBackgroundMedia(pair.backgroundMedia), normalizeBackgroundTransition(pair.backgroundTransition), normalizeBackgroundTransitionDuration(pair.backgroundTransitionDuration), normalizeRowFontFamily(pair.fontFamily)]).filter((pair) => pair[0] || pair[1] || assets.some((asset) => asset.rowId === pair[8]) || pair[25]);
    return pairs.length ? pairs.slice(0, 8) : [["续句", "", "whole", inputs.textColor.value, inputs.textColor.value, inputs.textColor.value, Number(inputs.leadFontSize.value), Number(inputs.suffixFontSize.value), phrasePairs[0]?.id || "continuation-row-1", 0, 0, Number(inputs.wordGap.value), false, [], 100, "original", 267, 100, 100, 120, 500, 300, 72, 55, inputs.backgroundColor.value, null, "direct", 120, "inherit"]];
  }

  function fontPreset(rowFontFamily = "inherit") {
    const selected = normalizeRowFontFamily(rowFontFamily) === "inherit" ? inputs.fontFamily.value : rowFontFamily;
    return window.STGFontLibrary?.preset(selected) || { family: "sans-serif", weight: 500, style: "normal" };
  }

  function timingForPair(pair) {
    const timing = {
      intro: pair[16] / 1000,
      hold: pair[17] / 1000,
      anticipation: pair[18] / 1000,
      reveal: pair[19] / 1000,
      settle: pair[20] / 1000,
      phraseHold: pair[21] / 1000
    };
    timing.revealAt = timing.intro + timing.hold + timing.anticipation;
    timing.finish = timing.revealAt + Math.max(timing.reveal, timing.settle);
    timing.cycle = timing.finish + timing.phraseHold;
    return timing;
  }

  function timelineValues() {
    const pairs = parsePairs();
    let cursor = 0;
    const rows = pairs.map((pair, index) => {
      const timing = timingForPair(pair);
      const row = { pair, index, start: cursor, end: cursor + timing.cycle, timing };
      cursor = row.end;
      return row;
    });
    return { pairs, rows, total: Math.max(.1, cursor) };
  }

  function locateTimelineTime(time, timeline = timelineValues()) {
    const wrapped = ((time % timeline.total) + timeline.total) % timeline.total;
    const row = timeline.rows.find((item) => wrapped < item.end) || timeline.rows.at(-1);
    return { ...row, timeline, wrapped, local: wrapped - row.start };
  }

  function controlsSnapshot() {
    return Object.fromEntries(controlIds.map((id) => [id, inputs[id].value]));
  }

  function assetPlacement(asset, pair) {
    const leadLength = splitText(String(pair?.lead || "").trim()).length;
    const suffixLength = splitText(String(pair?.suffix || "").trim()).length;
    let part = asset?.insertPart === "lead" ? "lead" : "suffix";
    const maximum = part === "lead" ? leadLength : suffixLength;
    const fallback = maximum;
    let offset = clamp(Math.round(Number.isFinite(Number(asset?.insertOffset)) ? Number(asset.insertOffset) : fallback), 0, maximum);
    if (part === "suffix" && offset === 0) { part = "lead"; offset = leadLength; }
    return { part, offset };
  }

  function normalizeAssetPlacementInPlace(asset, pair) {
    const placement = assetPlacement(asset, pair);
    asset.insertPart = placement.part;
    asset.insertOffset = placement.offset;
    return placement;
  }

  function assetInsertionOptions(pair) {
    const lead = splitText(String(pair?.lead || "").trim());
    const suffix = splitText(String(pair?.suffix || "").trim());
    const options = [{ value: "lead:0", label: "句首" }];
    lead.forEach((character, index) => {
      const offset = index + 1;
      const label = offset === lead.length && suffix.length ? `前后句之间（“${character}”后）` : `前半句第 ${offset} 字“${character}”后`;
      options.push({ value: `lead:${offset}`, label });
    });
    suffix.forEach((character, index) => {
      const offset = index + 1;
      const label = offset === suffix.length ? `句末（“${character}”后）` : `后半句第 ${offset} 字“${character}”后`;
      options.push({ value: `suffix:${offset}`, label });
    });
    return options;
  }

  function assetInsertionLabel(asset, pair) {
    const placement = assetPlacement(asset, pair);
    const value = `${placement.part}:${placement.offset}`;
    return assetInsertionOptions(pair).find((option) => option.value === value)?.label || "句末";
  }

  function serializableAsset(asset) {
    const rowId = asset.rowId || phrasePairs[0]?.id || "continuation-row-1";
    const pair = phrasePairs.find((item) => item.id === rowId) || phrasePairs[0];
    const placement = assetPlacement(asset, pair);
    return { id: asset.id, rowId, insertPart: placement.part, insertOffset: placement.offset, spacing: normalizeAssetSpacing(asset.spacing, Math.max(3, Number(inputs.wordGap.value) * .7)), libraryId: asset.libraryId || null, name: asset.name, url: asset.url, fileType: asset.fileType || "", kind: asset.kind || "image", vectorType: asset.vectorType || "", vectorStyle: asset.vectorStyle || "", size: Number(asset.size) || 100, opacity: Number(asset.opacity) || 0, x: Number(asset.x) || 0, y: Number(asset.y) || 0, rotation: Number(asset.rotation) || 0, builtin: Boolean(asset.builtin) };
  }

  function collectScheme() {
    return { version: 18, controls: controlsSnapshot(), pairs: phrasePairs.map((pair) => ({ ...pair, fontFamily: normalizeRowFontFamily(pair.fontFamily), backgroundMedia: normalizeBackgroundMedia(pair.backgroundMedia) })), rowPositions: [...rowPositions], assets: assets.map(serializableAsset) };
  }

  function defaultScheme() {
    return approvedDefaultScheme || { version: 18, controls: { ...defaultControls }, pairs: [{ id: "continuation-row-1", lead: "One", suffix: "subscription.", revealStyle: "whole", fontFamily: "inherit", leadColor: "#ffffff", suffixColor: "#ffffff", punctuationColor: "#ffffff", leadFontSize: 48, suffixFontSize: 48, leadLetterSpacing: 0, suffixLetterSpacing: 0, pairGap: 8, sweepEnabled: false, sweepColors: [], sweepDuration: 100, leadIntroStyle: "original", ...rowMotionDefaults("whole") }, { id: "continuation-row-2", lead: "Endless", suffix: "creativity.", revealStyle: "type", fontFamily: "inherit", leadColor: "#ffffff", suffixColor: "#ffffff", punctuationColor: "#ffffff", leadFontSize: 48, suffixFontSize: 48, leadLetterSpacing: 0, suffixLetterSpacing: 0, pairGap: 8, sweepEnabled: false, sweepColors: [], sweepDuration: 100, leadIntroStyle: "original", ...rowMotionDefaults("type") }], rowPositions: [50, 50], assets: [] };
  }

  function blankScheme() {
    return { version: 18, controls: { ...defaultControls }, pairs: [{ id: "continuation-row-1", lead: "", suffix: "", revealStyle: "whole", fontFamily: "inherit", leadColor: "#ffffff", suffixColor: "#ffffff", punctuationColor: "#ffffff", leadFontSize: 48, suffixFontSize: 48, leadLetterSpacing: 0, suffixLetterSpacing: 0, pairGap: 8, sweepEnabled: false, sweepColors: [], sweepDuration: 100, leadIntroStyle: "original", ...rowMotionDefaults("whole") }], rowPositions: [50], assets: [] };
  }

  function applyScheme(scheme, message = "") {
    if (!scheme || typeof scheme !== "object") throw new Error("方案格式不正确");
    const controls = { ...defaultControls, ...(scheme.controls || {}) };
    if (Number(scheme.version || 0) < 3 && scheme.controls?.suffixTypeDuration == null) {
      const units = Math.max(2, ...(scheme.pairs || []).map((pair) => splitText(pair.suffix || "").length + (scheme.assets?.length || 0)));
      controls.suffixTypeDuration = String(clamp((units - 1) * (Number(scheme.controls?.suffixStagger) || 45) + 60, 100, 3000));
    }
    controlIds.forEach((id) => { if (inputs[id] && controls[id] != null) inputs[id].value = String(controls[id]); });
    if (!inputs.exportPreset.value || inputs.exportPreset.value === "current") inputs.exportPreset.value = defaultControls.exportPreset;
    const legacyRevealStyle = scheme.controls?.suffixRevealStyle === "type" ? "type" : "whole";
    const schemePairs = Array.isArray(scheme.pairs) && scheme.pairs.length ? scheme.pairs.slice(0, 8) : [{ lead: "", suffix: "" }];
    const usedRowIds = new Set();
    phrasePairs = schemePairs.map((pair, index) => {
      let id = String(pair.id || `continuation-row-${index + 1}`);
      let fallbackId = index + 1;
      while (usedRowIds.has(id)) id = `continuation-row-${fallbackId++}`;
      usedRowIds.add(id);
      const suffix = String(pair.suffix || "");
      const revealStyle = pair.revealStyle === "rightPop" ? "rightPop" : pair.revealStyle === "type" ? "type" : pair.revealStyle === "whole" ? "whole" : legacyRevealStyle;
      const legacyRevealDuration = revealStyle === "type" ? controls.suffixTypeDuration : revealStyle === "rightPop" ? controls.suffixPopDuration : controls.suffixRevealDuration;
      return { id, lead: String(pair.lead || ""), suffix, revealStyle, fontFamily: normalizeRowFontFamily(pair.fontFamily), leadColor: normalizeColor(pair.leadColor, controls.textColor), suffixColor: normalizeColor(pair.suffixColor, controls.textColor), punctuationColor: normalizeColor(pair.punctuationColor, controls.textColor), leadFontSize: normalizeFontSize(pair.leadFontSize, controls.leadFontSize), suffixFontSize: normalizeFontSize(pair.suffixFontSize, controls.suffixFontSize), leadLetterSpacing: normalizeLetterSpacing(pair.leadLetterSpacing), suffixLetterSpacing: normalizeLetterSpacing(pair.suffixLetterSpacing), pairGap: normalizePairGap(pair.pairGap, controls.wordGap), sweepEnabled: Boolean(pair.sweepEnabled), sweepColors: normalizeSweepColors(pair.sweepColors, suffix, id), sweepDuration: normalizeSweepDuration(pair.sweepDuration), leadIntroStyle: normalizeLeadIntroStyle(pair.leadIntroStyle), introDuration: normalizeMilliseconds(pair.introDuration, Number(controls.introDuration) || 267, 50, 1000), rootHold: normalizeMilliseconds(pair.rootHold, Number(controls.rootHold) || 100, 0, 1500), anticipationDuration: normalizeMilliseconds(pair.anticipationDuration, Number(controls.anticipationDuration) || 100, 30, 800), revealDuration: normalizeMilliseconds(pair.revealDuration, Number(legacyRevealDuration) || rowMotionDefaults(revealStyle).revealDuration, 50, 3000), settleDuration: normalizeMilliseconds(pair.settleDuration, Number(controls.settleDuration) || 500, 100, 1500), phraseHold: normalizeMilliseconds(pair.phraseHold, Number(controls.phraseHold) || 300, 0, 300000), popDistance: clamp(Number.isFinite(Number(pair.popDistance)) ? Number(pair.popDistance) : Number(controls.suffixPopDistance) || 72, 0, 220), popBounce: clamp(Number.isFinite(Number(pair.popBounce)) ? Number(pair.popBounce) : Number(controls.suffixPopBounce) || 55, 0, 100), backgroundColor: normalizeColor(pair.backgroundColor, controls.backgroundColor), backgroundMedia: normalizeBackgroundMedia(pair.backgroundMedia), backgroundTransition: normalizeBackgroundTransition(pair.backgroundTransition), backgroundTransitionDuration: normalizeBackgroundTransitionDuration(pair.backgroundTransitionDuration) };
    });
    nextRowId = Math.max(phrasePairs.length + 1, ...phrasePairs.map((pair) => (Number(pair.id.match(/(\d+)$/)?.[1]) || 0) + 1));
    rowPositions = phrasePairs.map((_, index) => clamp(Number(scheme.rowPositions?.[index]) || 50, 10, 90));
    runtimeAssets.clear();
    runtimeBackgrounds.clear();
    assets = Array.isArray(scheme.assets) ? scheme.assets.map((asset) => {
      const currentLibraryAsset = sharedIcons.byId.get(asset.libraryId);
      const legacyRowIndex = clamp(Math.round(Number(asset.rowIndex) || 0), 0, phrasePairs.length - 1);
      const rowId = phrasePairs.some((pair) => pair.id === asset.rowId) ? asset.rowId : phrasePairs[legacyRowIndex].id;
      return { ...serializableAsset({ ...currentLibraryAsset, ...asset, rowId }), id: asset.id || `continuation-asset-${nextAssetId++}` };
    }) : [];
    const highestAssetId = assets.reduce((highest, asset) => Math.max(highest, Number(String(asset.id).match(/(\d+)$/)?.[1]) || 0), 0);
    nextAssetId = Math.max(nextAssetId, highestAssetId + 1, assets.length + 1);
    activeAssetId = null;
    assetTargetRow = clamp(assetTargetRow, 0, phrasePairs.length - 1);
    closeAssetDrawer();
    renderPairEditor();
    refreshAssetTargetOptions();
    syncRowPositionControls();
    renderSelectedAssets();
    assets.forEach((asset) => prepareAsset(asset));
    phrasePairs.forEach((pair) => prepareRowBackground(pair));
    updateEditorState();
    simulationTime = 0;
    if (message) schemeStatus.textContent = message;
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectScheme())); } catch (_) {}
    }, 250);
  }

  function rowDisplayName(index) {
    const pair = phrasePairs[index];
    const text = `${String(pair?.lead || "").trim()} ${String(pair?.suffix || "").trim()}`.trim();
    return `第 ${index + 1} 行${text ? ` · ${text}` : ""}`;
  }

  function refreshAssetTargetOptions() {
    const select = $("#assetTargetRow");
    if (!select) return;
    assetTargetRow = clamp(assetTargetRow, 0, phrasePairs.length - 1);
    select.replaceChildren(...phrasePairs.map((_, index) => new Option(rowDisplayName(index), String(index))));
    select.value = String(assetTargetRow);
    $("#addCandidateButton").textContent = `添加到第 ${assetTargetRow + 1} 行`;
    const uploadText = $("#assetUploadText");
    if (uploadText) uploadText.textContent = `上传图片到第 ${assetTargetRow + 1} 行`;
  }

  function updatePairAssetCounts() {
    document.querySelectorAll(".pair-asset-button").forEach((button) => {
      const count = assets.filter((asset) => asset.rowId === button.dataset.rowId).length;
      button.textContent = `本行图标 ${count} 个 · 添加 / 管理`;
    });
  }

  function movePhrasePairToIndex(sourceId, targetIndex) {
    const sourceIndex = phrasePairs.findIndex((pair) => pair.id === sourceId);
    const destination = clamp(Number(targetIndex), 0, phrasePairs.length - 1);
    if (sourceIndex < 0 || sourceIndex === destination) return;
    const assetTargetId = phrasePairs[assetTargetRow]?.id;
    const activeRowId = phrasePairs[activeTimelineRow]?.id;
    const [movedPair] = phrasePairs.splice(sourceIndex, 1);
    const [movedPosition] = rowPositions.splice(sourceIndex, 1);
    phrasePairs.splice(destination, 0, movedPair);
    rowPositions.splice(destination, 0, movedPosition);
    assetTargetRow = Math.max(0, phrasePairs.findIndex((pair) => pair.id === assetTargetId));
    activeTimelineRow = Math.max(0, phrasePairs.findIndex((pair) => pair.id === activeRowId));
    renderPairEditor();
    refreshAssetTargetOptions();
    renderSelectedAssets();
    updateEditorState();
  }

  function renderPairEditor() {
    const editor = $("#pairEditor");
    editor.replaceChildren();
    rowPositions = phrasePairs.map((_, index) => Number.isFinite(rowPositions[index]) ? rowPositions[index] : 50);
    phrasePairs.forEach((pair, index) => {
      const row = document.createElement("div");
      row.className = "pair-editor-row";
      row.dataset.pairId = pair.id;
      row.innerHTML = `<label class="pair-order-field"><span class="sr-only">第 ${index + 1} 行播放顺序</span><select class="pair-order-select" aria-label="选择当前句子的播放行号">${phrasePairs.map((_, orderIndex) => `<option value="${orderIndex}"${orderIndex === index ? " selected" : ""}>第${orderIndex + 1}行</option>`).join("")}</select></label><label><span class="sr-only">第 ${index + 1} 组前半句</span><input class="pair-lead-input" type="text" spellcheck="false"></label><i aria-hidden="true">→</i><label><span class="sr-only">第 ${index + 1} 组后半句</span><input class="pair-suffix-input" type="text" spellcheck="false"></label><button class="remove-pair-button" type="button" aria-label="删除第 ${index + 1} 组">×</button><div class="pair-row-arrange"><div class="row-position-head"><span>本行水平位置</span><output class="row-position-output"></output></div><div class="row-position-tools"><div class="row-position-presets"><button type="button" data-position="25">左</button><button type="button" data-position="50">中</button><button type="button" data-position="75">右</button></div><input class="row-position-range" type="range" min="10" max="90" value="${rowPositions[index]}" aria-label="第 ${index + 1} 行水平位置"></div><div class="pair-page-controls"><label>本页停留<span><input class="pair-page-hold" type="number" min="0" max="300" step="0.1" inputmode="decimal" aria-label="第 ${index + 1} 页停留秒数"><b>秒</b></span></label></div></div><label class="pair-reveal-label">后半句形式<select class="pair-reveal-style" aria-label="第 ${index + 1} 行后半句接入形式"><option value="whole">整体快速出现</option><option value="type">逐字快速扫入</option><option value="rightPop">向右弹出</option></select></label><div class="pair-sweep-options"><div class="pair-sweep-head"><label class="pair-sweep-toggle"><input class="pair-sweep-enabled" type="checkbox">逐字扫色</label><button class="pair-sweep-random" type="button">重新随机</button></div><label class="pair-sweep-speed"><span>扫色快慢 <output class="pair-sweep-duration-out"></output></span><input class="pair-sweep-duration" type="range" min="40" max="600" step="10" aria-label="第 ${index + 1} 行扫色快慢"></label><div class="pair-sweep-colors" aria-label="第 ${index + 1} 行逐字扫色颜色"></div><p>每个色块对应后半句一个字；扫过后恢复原文字颜色。</p></div><div class="pair-size-options"><label><span>前半句字号 <output class="pair-lead-size-out"></output></span><input class="pair-lead-size" type="range" min="18" max="180" step="1" aria-label="第 ${index + 1} 行前半句字号"></label><label><span>后半句字号 <output class="pair-suffix-size-out"></output></span><input class="pair-suffix-size" type="range" min="18" max="180" step="1" aria-label="第 ${index + 1} 行后半句字号"></label></div><div class="pair-spacing-options"><label><span>前半句字间距 <output class="pair-lead-spacing-out"></output></span><input class="pair-lead-spacing" type="range" min="-20" max="60" step="1" aria-label="第 ${index + 1} 行前半句字间距"></label><label><span>后半句字间距 <output class="pair-suffix-spacing-out"></output></span><input class="pair-suffix-spacing" type="range" min="-20" max="60" step="1" aria-label="第 ${index + 1} 行后半句字间距"></label><label class="pair-gap-field"><span>前后两段间距 <output class="pair-gap-out"></output></span><input class="pair-gap" type="range" min="0" max="96" step="1" aria-label="第 ${index + 1} 行前后两段间距"></label></div><div class="pair-color-options"><label>前半句<input class="pair-lead-color" type="color" aria-label="第 ${index + 1} 行前半句文字颜色"></label><label>后半句<input class="pair-suffix-color" type="color" aria-label="第 ${index + 1} 行后半句文字颜色"></label><label>标点<input class="pair-punctuation-color" type="color" aria-label="第 ${index + 1} 行标点颜色"></label></div><button class="pair-asset-button" type="button" data-row-id="${pair.id}"></button>`;
      const motionOptions = document.createElement("div");
      motionOptions.className = "pair-motion-options";
      const leadIntroLabel = document.createElement("label");
      leadIntroLabel.className = "pair-lead-intro-label";
      leadIntroLabel.innerHTML = `<span>前半句入场</span><select class="pair-lead-intro-style" aria-label="第 ${index + 1} 行前半句入场形式"><option value="original">原有入场</option><option value="softPop">轻弹出现</option></select>`;
      const revealLabel = row.querySelector(".pair-reveal-label");
      revealLabel.before(motionOptions);
      motionOptions.append(leadIntroLabel, revealLabel);
      const timingOptions = document.createElement("details");
      timingOptions.className = "pair-timing-options";
      timingOptions.innerHTML = `<summary><span>本行动效节奏 · 独立</span><b class="pair-timing-summary"></b></summary><div class="pair-timing-grid"><label><span>前半句入场 <output class="pair-intro-duration-out"></output></span><input class="pair-intro-duration" type="range" min="50" max="1000" step="10"></label><label><span>前半句停顿 <output class="pair-root-hold-out"></output></span><input class="pair-root-hold" type="range" min="0" max="1500" step="10"></label><label><span>居中预备 <output class="pair-anticipation-duration-out"></output></span><input class="pair-anticipation-duration" type="range" min="30" max="800" step="10"></label><label><span class="pair-reveal-duration-label">后半句接入</span> <output class="pair-reveal-duration-out"></output><input class="pair-reveal-duration" type="range" min="50" max="3000" step="10"></label><label><span>组合结束停留 <output class="pair-settle-duration-out"></output></span><input class="pair-settle-duration" type="range" min="100" max="1500" step="10"></label><label class="pair-pop-only"><span>弹出距离 <output class="pair-pop-distance-out"></output></span><input class="pair-pop-distance" type="range" min="0" max="220" step="1"></label><label class="pair-pop-only"><span>弹性感 <output class="pair-pop-bounce-out"></output></span><input class="pair-pop-bounce" type="range" min="0" max="100" step="1"></label></div></details>`;
      row.querySelector(".pair-sweep-options").before(timingOptions);
      const backgroundOptions = document.createElement("details");
      backgroundOptions.className = "pair-background-options";
      backgroundOptions.innerHTML = `<summary><span>本行背景 / 元素</span><b class="pair-background-summary"></b></summary><div class="pair-background-grid"><div class="pair-background-transition"><label>背景转场<select class="pair-background-transition-style"><option value="direct">直接切换</option><option value="crossfade">柔和叠化</option></select></label><label class="pair-background-transition-duration-label">叠化时长<span><input class="pair-background-transition-duration" type="number" min="0.01" max="2" step="0.01" inputmode="decimal"><b>秒</b></span></label></div><label class="pair-background-color-label">背景颜色<input class="pair-background-color" type="color"></label><label class="pair-background-upload">上传图片 / GIF / 视频 / 元素<input class="pair-background-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,video/mp4,video/webm"></label><div class="pair-background-media"><div><strong class="pair-background-name"></strong><button class="pair-background-remove" type="button">移除素材</button></div><label><span>素材透明度 <output class="pair-background-opacity-out"></output></span><input class="pair-background-opacity" type="range" min="0" max="100" step="1"></label><label><span>染色强度 <output class="pair-background-tint-strength-out"></output></span><input class="pair-background-tint-strength" type="range" min="0" max="100" step="1"></label><label class="pair-background-tint-label">染色颜色<input class="pair-background-tint" type="color"></label><fieldset class="pair-background-video-trim"><legend>视频片段 <output class="pair-background-video-duration-out"></output></legend><div class="pair-video-timeline" aria-label="拖动两侧把手裁剪视频片段"><canvas class="pair-video-filmstrip" width="720" height="96"></canvas><div class="pair-video-selection"><span class="pair-video-handle is-start" data-edge="start" role="slider" tabindex="0" aria-label="视频片段开始"></span><span class="pair-video-handle is-end" data-edge="end" role="slider" tabindex="0" aria-label="视频片段结束"></span></div></div><div class="pair-video-timeline-scale"><span>0.0 秒</span><span class="pair-video-source-duration"></span></div><label>开始秒数<input class="pair-background-video-start" type="number" min="0" step="0.1" inputmode="decimal"></label><label>结束秒数<input class="pair-background-video-end" type="number" min="0.1" step="0.1" inputmode="decimal"></label><p>拖动左右把手选择片段，也可输入精确秒数；预览和导出使用同一区间。</p></fieldset></div></div></details>`;
      row.querySelector(".pair-asset-button").before(backgroundOptions);
      const rowFontLabel = document.createElement("label");
      rowFontLabel.className = "pair-font-label";
      rowFontLabel.innerHTML = `<span>本行字体</span><select class="pair-font-family" aria-label="第 ${index + 1} 行字体"><option value="inherit">跟随全局字体</option></select>`;
      row.querySelector(".pair-size-options").before(rowFontLabel);
      const rowFontFamily = rowFontLabel.querySelector("select");
      rowFontFamily.id = `pairFont-${pair.id}`;
      window.STGFontLibrary?.enhanceSelect(rowFontFamily);
      rowFontFamily.prepend(new Option("跟随全局字体", "inherit"));
      const lead = row.querySelector(".pair-lead-input");
      const suffix = row.querySelector(".pair-suffix-input");
      const leadIntroStyle = row.querySelector(".pair-lead-intro-style");
      const revealStyle = row.querySelector(".pair-reveal-style");
      const sweepOptions = row.querySelector(".pair-sweep-options");
      const sweepEnabled = row.querySelector(".pair-sweep-enabled");
      const sweepColors = row.querySelector(".pair-sweep-colors");
      const sweepRandom = row.querySelector(".pair-sweep-random");
      const sweepDuration = row.querySelector(".pair-sweep-duration");
      const leadFontSize = row.querySelector(".pair-lead-size");
      const suffixFontSize = row.querySelector(".pair-suffix-size");
      const leadLetterSpacing = row.querySelector(".pair-lead-spacing");
      const suffixLetterSpacing = row.querySelector(".pair-suffix-spacing");
      const pairGap = row.querySelector(".pair-gap");
      const leadColor = row.querySelector(".pair-lead-color");
      const suffixColor = row.querySelector(".pair-suffix-color");
      const punctuationColor = row.querySelector(".pair-punctuation-color");
      const introDuration = row.querySelector(".pair-intro-duration");
      const rootHold = row.querySelector(".pair-root-hold");
      const anticipationDuration = row.querySelector(".pair-anticipation-duration");
      const revealDuration = row.querySelector(".pair-reveal-duration");
      const settleDuration = row.querySelector(".pair-settle-duration");
      const phraseHold = row.querySelector(".pair-page-hold");
      const orderSelect = row.querySelector(".pair-order-select");
      const popDistance = row.querySelector(".pair-pop-distance");
      const popBounce = row.querySelector(".pair-pop-bounce");
      const backgroundColor = row.querySelector(".pair-background-color");
      const backgroundTransition = row.querySelector(".pair-background-transition-style");
      const backgroundTransitionDuration = row.querySelector(".pair-background-transition-duration");
      const backgroundFile = row.querySelector(".pair-background-file");
      const backgroundOpacity = row.querySelector(".pair-background-opacity");
      const backgroundTint = row.querySelector(".pair-background-tint");
      const backgroundTintStrength = row.querySelector(".pair-background-tint-strength");
      const backgroundVideoTrim = row.querySelector(".pair-background-video-trim");
      const backgroundVideoStart = row.querySelector(".pair-background-video-start");
      const backgroundVideoEnd = row.querySelector(".pair-background-video-end");
      const videoTimeline = row.querySelector(".pair-video-timeline");
      const videoSelection = row.querySelector(".pair-video-selection");
      const videoFilmstrip = row.querySelector(".pair-video-filmstrip");
      const positionRange = row.querySelector(".row-position-range");
      const setRowPosition = (value) => {
        rowPositions[index] = clamp(Number(value), 10, 90);
        positionRange.value = String(rowPositions[index]);
        updatePositionItem(row, rowPositions[index]);
        updateEditorState();
      };
      positionRange.addEventListener("input", () => setRowPosition(positionRange.value));
      row.querySelectorAll("button[data-position]").forEach((button) => button.addEventListener("click", () => setRowPosition(button.dataset.position)));
      updatePositionItem(row, rowPositions[index]);
      orderSelect.addEventListener("change", () => movePhrasePairToIndex(pair.id, Number(orderSelect.value)));
      let currentBackgroundMedia = normalizeBackgroundMedia(pair.backgroundMedia);
      lead.value = pair.lead;
      suffix.value = pair.suffix;
      leadIntroStyle.value = normalizeLeadIntroStyle(pair.leadIntroStyle);
      revealStyle.value = normalizeRevealStyle(pair.revealStyle);
      rowFontFamily.value = normalizeRowFontFamily(pair.fontFamily);
      sweepEnabled.checked = Boolean(pair.sweepEnabled);
      sweepDuration.value = String(normalizeSweepDuration(pair.sweepDuration));
      leadFontSize.value = String(normalizeFontSize(pair.leadFontSize, inputs.leadFontSize.value));
      suffixFontSize.value = String(normalizeFontSize(pair.suffixFontSize, inputs.suffixFontSize.value));
      leadLetterSpacing.value = String(normalizeLetterSpacing(pair.leadLetterSpacing));
      suffixLetterSpacing.value = String(normalizeLetterSpacing(pair.suffixLetterSpacing));
      pairGap.value = String(normalizePairGap(pair.pairGap, inputs.wordGap.value));
      leadColor.value = normalizeColor(pair.leadColor, inputs.textColor.value);
      suffixColor.value = normalizeColor(pair.suffixColor, inputs.textColor.value);
      punctuationColor.value = normalizeColor(pair.punctuationColor, inputs.textColor.value);
      introDuration.value = String(normalizeMilliseconds(pair.introDuration, 267, 50, 1000));
      rootHold.value = String(normalizeMilliseconds(pair.rootHold, 100, 0, 1500));
      anticipationDuration.value = String(normalizeMilliseconds(pair.anticipationDuration, 100, 30, 800));
      revealDuration.value = String(normalizeMilliseconds(pair.revealDuration, rowMotionDefaults(pair.revealStyle).revealDuration, 50, 3000));
      settleDuration.value = String(normalizeMilliseconds(pair.settleDuration, 500, 100, 1500));
      phraseHold.value = String(Number((normalizeMilliseconds(pair.phraseHold, 300, 0, 300000) / 1000).toFixed(1)));
      popDistance.value = String(clamp(Number.isFinite(Number(pair.popDistance)) ? Number(pair.popDistance) : 72, 0, 220));
      popBounce.value = String(clamp(Number.isFinite(Number(pair.popBounce)) ? Number(pair.popBounce) : 55, 0, 100));
      backgroundColor.value = normalizeColor(pair.backgroundColor, inputs.backgroundColor.value);
      backgroundTransition.value = normalizeBackgroundTransition(pair.backgroundTransition);
      backgroundTransitionDuration.value = String(Number((normalizeBackgroundTransitionDuration(pair.backgroundTransitionDuration) / 1000).toFixed(2)));
      backgroundOpacity.value = String(currentBackgroundMedia?.opacity ?? 100);
      backgroundTint.value = currentBackgroundMedia?.tintColor || "#000000";
      backgroundTintStrength.value = String(currentBackgroundMedia?.tintStrength ?? 0);
      backgroundVideoStart.value = String(currentBackgroundMedia?.videoStart ?? 0);
      backgroundVideoEnd.value = currentBackgroundMedia?.videoEnd == null ? "" : String(currentBackgroundMedia.videoEnd);
      let currentSweepColors = normalizeSweepColors(pair.sweepColors, suffix.value, pair.id);
      const renderSweepColors = () => {
        const characters = splitText(suffix.value);
        currentSweepColors = normalizeSweepColors(currentSweepColors, suffix.value, pair.id);
        sweepOptions.hidden = revealStyle.value !== "type";
        sweepOptions.classList.toggle("is-disabled", !sweepEnabled.checked);
        sweepColors.replaceChildren(...characters.map((character, colorIndex) => {
          const label = document.createElement("label");
          label.title = character.trim() ? `“${character}”的扫入颜色` : "空格的扫入颜色";
          label.innerHTML = `<span></span><input type="color" aria-label="第 ${index + 1} 行第 ${colorIndex + 1} 个字的扫入颜色">`;
          label.querySelector("span").textContent = character.trim() ? character : "空";
          const colorInput = label.querySelector("input");
          colorInput.value = currentSweepColors[colorIndex];
          colorInput.addEventListener("input", () => {
            currentSweepColors[colorIndex] = colorInput.value;
            phrasePairs[index].sweepColors = [...currentSweepColors];
            updateEditorState();
          });
          return label;
        }));
      };
      const renderVideoTimeline = () => {
        const runtime = runtimeBackgrounds.get(pair.id);
        const duration = runtime?.duration || 0;
        if (!isVideoMedia(currentBackgroundMedia) || !(duration > 0)) return;
        const clip = videoClipBounds(currentBackgroundMedia, duration);
        const left = clip.start / duration * 100;
        const width = clip.duration / duration * 100;
        videoSelection.style.left = `${left}%`;
        videoSelection.style.width = `${width}%`;
        row.querySelector(".pair-video-source-duration").textContent = `${duration.toFixed(1)} 秒`;
        videoSelection.querySelector(".is-start").setAttribute("aria-valuetext", `${clip.start.toFixed(1)} 秒`);
        videoSelection.querySelector(".is-end").setAttribute("aria-valuetext", `${clip.end.toFixed(1)} 秒`);
        const drawFilmstrip = (filmstrip) => {
          if (!filmstrip || !videoFilmstrip.isConnected) return;
          const context = videoFilmstrip.getContext("2d");
          context.clearRect(0, 0, videoFilmstrip.width, videoFilmstrip.height);
          context.drawImage(filmstrip, 0, 0, videoFilmstrip.width, videoFilmstrip.height);
        };
        if (runtime.filmstrip) drawFilmstrip(runtime.filmstrip);
        else prepareVideoFilmstrip(runtime).then(drawFilmstrip);
      };
      const renderBackgroundControls = () => {
        const mediaPanel = row.querySelector(".pair-background-media");
        mediaPanel.hidden = !currentBackgroundMedia;
        const videoMedia = isVideoMedia(currentBackgroundMedia);
        const runtime = runtimeBackgrounds.get(pair.id);
        const duration = runtime?.duration || 0;
        const clip = videoMedia && duration > 0 ? videoClipBounds(currentBackgroundMedia, duration) : null;
        const transitionText = backgroundTransition.value === "crossfade" ? `柔和叠化 ${backgroundTransitionDuration.value} 秒` : "直接切换";
        row.querySelector(".pair-background-summary").textContent = `${currentBackgroundMedia ? `${currentBackgroundMedia.name}${clip ? ` · ${clip.start.toFixed(1)}–${clip.end.toFixed(1)} 秒` : ""}` : "纯色"} · ${transitionText}`;
        row.querySelector(".pair-background-transition-duration-label").classList.toggle("is-disabled", backgroundTransition.value === "direct");
        backgroundTransitionDuration.disabled = backgroundTransition.value === "direct";
        if (!currentBackgroundMedia) return;
        row.querySelector(".pair-background-name").textContent = currentBackgroundMedia.name;
        backgroundOpacity.value = String(currentBackgroundMedia.opacity);
        backgroundTint.value = currentBackgroundMedia.tintColor;
        backgroundTintStrength.value = String(currentBackgroundMedia.tintStrength);
        backgroundVideoTrim.hidden = !videoMedia;
        if (videoMedia) {
          backgroundVideoStart.max = duration > 0 ? String(Math.max(0, duration - .1)) : "3600";
          backgroundVideoEnd.max = duration > 0 ? String(duration) : "3600";
          backgroundVideoStart.value = String(clip?.start ?? currentBackgroundMedia.videoStart ?? 0);
          backgroundVideoEnd.value = String(clip?.end ?? currentBackgroundMedia.videoEnd ?? "");
          row.querySelector(".pair-background-video-duration-out").textContent = clip ? `· ${clip.duration.toFixed(1)} 秒` : "· 读取中…";
          renderVideoTimeline();
        }
      };
      const updateRangeOutputs = () => {
        row.querySelector(".pair-lead-size-out").textContent = leadFontSize.value;
        row.querySelector(".pair-suffix-size-out").textContent = suffixFontSize.value;
        row.querySelector(".pair-lead-spacing-out").textContent = leadLetterSpacing.value;
        row.querySelector(".pair-suffix-spacing-out").textContent = suffixLetterSpacing.value;
        row.querySelector(".pair-gap-out").textContent = pairGap.value;
        row.querySelector(".pair-sweep-duration-out").textContent = `${(Number(sweepDuration.value) / 1000).toFixed(2)} 秒`;
        row.querySelector(".pair-intro-duration-out").textContent = `${introDuration.value} ms`;
        row.querySelector(".pair-root-hold-out").textContent = `${rootHold.value} ms`;
        row.querySelector(".pair-anticipation-duration-out").textContent = `${anticipationDuration.value} ms`;
        row.querySelector(".pair-reveal-duration-label").textContent = revealStyle.value === "type" ? "逐字扫入" : revealStyle.value === "rightPop" ? "向右弹出" : "整体出现";
        row.querySelector(".pair-reveal-duration-out").textContent = `${revealDuration.value} ms`;
        row.querySelector(".pair-settle-duration-out").textContent = `${settleDuration.value} ms`;
        row.querySelector(".pair-pop-distance-out").textContent = popDistance.value;
        row.querySelector(".pair-pop-bounce-out").textContent = `${popBounce.value}%`;
        row.querySelector(".pair-timing-summary").textContent = `${revealStyleLabel(revealStyle.value)} ${Number(revealDuration.value) / 1000} 秒`;
        row.querySelectorAll(".pair-pop-only").forEach((field) => { field.hidden = revealStyle.value !== "rightPop"; });
        row.querySelector(".pair-background-opacity-out").textContent = `${backgroundOpacity.value}%`;
        row.querySelector(".pair-background-tint-strength-out").textContent = `${backgroundTintStrength.value}%`;
      };
      const update = () => {
        currentSweepColors = normalizeSweepColors(currentSweepColors, suffix.value, pair.id);
        if (currentBackgroundMedia) {
          const draftMedia = { ...currentBackgroundMedia, opacity: backgroundOpacity.value, tintColor: backgroundTint.value, tintStrength: backgroundTintStrength.value, videoStart: backgroundVideoStart.value, videoEnd: backgroundVideoEnd.value === "" ? null : backgroundVideoEnd.value };
          const runtime = runtimeBackgrounds.get(pair.id);
          if (isVideoMedia(draftMedia) && runtime?.duration > 0) {
            const clip = videoClipBounds(draftMedia, runtime.duration);
            draftMedia.videoStart = clip.start;
            draftMedia.videoEnd = clip.end;
          }
          currentBackgroundMedia = normalizeBackgroundMedia(draftMedia);
        }
        phrasePairs[index] = { id: pair.id, lead: lead.value, suffix: suffix.value, revealStyle: revealStyle.value, fontFamily: normalizeRowFontFamily(rowFontFamily.value), leadColor: leadColor.value, suffixColor: suffixColor.value, punctuationColor: punctuationColor.value, leadFontSize: normalizeFontSize(leadFontSize.value, inputs.leadFontSize.value), suffixFontSize: normalizeFontSize(suffixFontSize.value, inputs.suffixFontSize.value), leadLetterSpacing: normalizeLetterSpacing(leadLetterSpacing.value), suffixLetterSpacing: normalizeLetterSpacing(suffixLetterSpacing.value), pairGap: normalizePairGap(pairGap.value, inputs.wordGap.value), sweepEnabled: sweepEnabled.checked, sweepColors: [...currentSweepColors], sweepDuration: normalizeSweepDuration(sweepDuration.value), leadIntroStyle: normalizeLeadIntroStyle(leadIntroStyle.value), introDuration: normalizeMilliseconds(introDuration.value, 267, 50, 1000), rootHold: normalizeMilliseconds(rootHold.value, 100, 0, 1500), anticipationDuration: normalizeMilliseconds(anticipationDuration.value, 100, 30, 800), revealDuration: normalizeMilliseconds(revealDuration.value, rowMotionDefaults(revealStyle.value).revealDuration, 50, 3000), settleDuration: normalizeMilliseconds(settleDuration.value, 500, 100, 1500), phraseHold: normalizeMilliseconds(Number(phraseHold.value) * 1000, 300, 0, 300000), popDistance: clamp(Number(popDistance.value), 0, 220), popBounce: clamp(Number(popBounce.value), 0, 100), backgroundColor: backgroundColor.value, backgroundMedia: currentBackgroundMedia, backgroundTransition: normalizeBackgroundTransition(backgroundTransition.value), backgroundTransitionDuration: normalizeBackgroundTransitionDuration(Number(backgroundTransitionDuration.value) * 1000) };
        updateRangeOutputs();
        renderSweepColors();
        renderBackgroundControls();
        syncRowPositionControls();
        refreshAssetTargetOptions();
        updateEditorState();
      };
      const updateText = () => {
        update();
        assets.filter((asset) => asset.rowId === pair.id).forEach((asset) => normalizeAssetPlacementInPlace(asset, phrasePairs[index]));
        renderSelectedAssets();
        if (activeAsset()?.rowId === pair.id) refreshAssetInsertionOptions(activeAsset());
      };
      lead.addEventListener("input", updateText);
      suffix.addEventListener("input", updateText);
      rowFontFamily.addEventListener("input", update);
      leadIntroStyle.addEventListener("input", update);
      revealStyle.addEventListener("input", update);
      sweepEnabled.addEventListener("input", update);
      sweepDuration.addEventListener("input", update);
      sweepRandom.addEventListener("click", () => {
        currentSweepColors = randomSweepColors(suffix.value);
        sweepEnabled.checked = true;
        update();
      });
      leadFontSize.addEventListener("input", update);
      suffixFontSize.addEventListener("input", update);
      leadLetterSpacing.addEventListener("input", update);
      suffixLetterSpacing.addEventListener("input", update);
      pairGap.addEventListener("input", update);
      leadColor.addEventListener("input", update);
      suffixColor.addEventListener("input", update);
      punctuationColor.addEventListener("input", update);
      [introDuration, rootHold, anticipationDuration, revealDuration, settleDuration, popDistance, popBounce, backgroundColor, backgroundOpacity, backgroundTint, backgroundTintStrength].forEach((control) => control.addEventListener("input", update));
      phraseHold.addEventListener("input", update);
      backgroundTransition.addEventListener("change", update);
      backgroundTransitionDuration.addEventListener("input", update);
      [backgroundVideoStart, backgroundVideoEnd].forEach((control) => control.addEventListener("change", () => {
        const runtime = runtimeBackgrounds.get(pair.id);
        if (runtime) { runtime.previewNeedsSync = true; runtime.exportImage = null; runtime.exportTime = -1; }
        update();
      }));
      let draggedVideoEdge = null;
      const setVideoBoundary = (edge, rawSeconds) => {
        const runtime = runtimeBackgrounds.get(pair.id);
        if (!runtime?.duration || !currentBackgroundMedia) return;
        const clip = videoClipBounds(currentBackgroundMedia, runtime.duration);
        const seconds = Math.round(Number(rawSeconds) * 10) / 10;
        if (edge === "start") backgroundVideoStart.value = String(clamp(seconds, 0, clip.end - .1));
        else backgroundVideoEnd.value = String(clamp(seconds, clip.start + .1, runtime.duration));
        runtime.previewNeedsSync = true;
        runtime.exportImage = null;
        runtime.exportTime = -1;
        update();
      };
      const videoTimeFromPointer = (event) => {
        const rect = videoTimeline.getBoundingClientRect();
        const runtime = runtimeBackgrounds.get(pair.id);
        return clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1) * (runtime?.duration || 0);
      };
      videoTimeline.addEventListener("pointerdown", (event) => {
        const runtime = runtimeBackgrounds.get(pair.id);
        if (!runtime?.duration) return;
        const clip = videoClipBounds(currentBackgroundMedia, runtime.duration);
        const pointerTime = videoTimeFromPointer(event);
        draggedVideoEdge = event.target.closest("[data-edge]")?.dataset.edge || (Math.abs(pointerTime - clip.start) <= Math.abs(pointerTime - clip.end) ? "start" : "end");
        videoTimeline.setPointerCapture(event.pointerId);
        setVideoBoundary(draggedVideoEdge, pointerTime);
        event.preventDefault();
      });
      videoTimeline.addEventListener("pointermove", (event) => {
        if (draggedVideoEdge && videoTimeline.hasPointerCapture(event.pointerId)) setVideoBoundary(draggedVideoEdge, videoTimeFromPointer(event));
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => videoTimeline.addEventListener(eventName, () => { draggedVideoEdge = null; }));
      videoSelection.querySelectorAll("[data-edge]").forEach((handle) => handle.addEventListener("keydown", (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        const current = handle.dataset.edge === "start" ? Number(backgroundVideoStart.value) : Number(backgroundVideoEnd.value);
        setVideoBoundary(handle.dataset.edge, current + (event.key === "ArrowLeft" ? -.1 : .1));
        event.preventDefault();
      }));
      backgroundFile.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        currentBackgroundMedia = normalizeBackgroundMedia({ name: file.name, url, fileType: file.type, opacity: 100, tintColor: "#000000", tintStrength: 0, videoStart: 0, videoEnd: null });
        if (isVideoMedia(currentBackgroundMedia)) {
          backgroundTransition.value = "crossfade";
          backgroundTransitionDuration.value = "0.12";
        }
        backgroundFile.value = "";
        phrasePairs[index].backgroundMedia = currentBackgroundMedia;
        const runtime = await prepareRowBackground(phrasePairs[index]);
        if (isVideoMedia(currentBackgroundMedia) && runtime?.duration > 0) {
          currentBackgroundMedia.videoEnd = runtime.duration;
          backgroundVideoEnd.value = String(runtime.duration);
        }
        update();
      });
      row.querySelector(".pair-background-remove").addEventListener("click", () => {
        currentBackgroundMedia = null;
        runtimeBackgrounds.get(pair.id)?.video?.pause();
        runtimeBackgrounds.delete(pair.id);
        update();
      });
      updateRangeOutputs();
      renderSweepColors();
      renderBackgroundControls();
      if (isVideoMedia(currentBackgroundMedia)) {
        prepareRowBackground(pair).then((runtime) => {
          if (!runtime?.duration || !currentBackgroundMedia || !isVideoMedia(currentBackgroundMedia)) return;
          if (currentBackgroundMedia.videoEnd == null) currentBackgroundMedia.videoEnd = runtime.duration;
          renderBackgroundControls();
          update();
        });
      }
      const assetButton = row.querySelector(".pair-asset-button");
      assetButton.textContent = `本行图标 ${assets.filter((asset) => asset.rowId === pair.id).length} 个 · 添加 / 管理`;
      assetButton.addEventListener("click", () => {
        assetTargetRow = index;
        refreshAssetTargetOptions();
        $(".icon-section").scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => $("#assetTargetRow")?.focus(), 250);
      });
      const remove = row.querySelector(".remove-pair-button");
      remove.disabled = phrasePairs.length === 1;
      remove.addEventListener("click", () => {
        if (phrasePairs.length === 1) return;
        const removedRowId = phrasePairs[index].id;
        phrasePairs.splice(index, 1);
        rowPositions.splice(index, 1);
        assets.filter((asset) => asset.rowId === removedRowId).forEach((asset) => runtimeAssets.delete(asset.id));
        runtimeBackgrounds.delete(removedRowId);
        assets = assets.filter((asset) => asset.rowId !== removedRowId);
        assetTargetRow = clamp(assetTargetRow, 0, phrasePairs.length - 1);
        renderPairEditor();
        refreshAssetTargetOptions();
        renderSelectedAssets();
        updateEditorState();
      });
      editor.append(row);
    });
    $("#addPairButton").disabled = phrasePairs.length >= 8;
  }

  function updatePositionItem(item, value) {
    item.querySelector(".row-position-output").textContent = `${value}%`;
    item.querySelectorAll("button[data-position]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.position) === value)));
  }

  function syncRowPositionControls() {
    rowPositions = phrasePairs.map((_, index) => Number.isFinite(rowPositions[index]) ? rowPositions[index] : 50);
    document.querySelectorAll(".pair-editor-row").forEach((row, index) => {
      const range = row.querySelector(".row-position-range");
      if (!range) return;
      range.value = String(rowPositions[index]);
      updatePositionItem(row, rowPositions[index]);
    });
  }

  function updateOutputs() {
    const values = {
      leadFontSizeOut: inputs.leadFontSize.value, suffixFontSizeOut: inputs.suffixFontSize.value,
      anticipationOut: "居中锁定", wordGapOut: inputs.wordGap.value,
      settleScaleOut: `${inputs.settleScale.value}%`, speedOut: `${(Number(inputs.speed.value) / 100).toFixed(2)}×`
    };
    Object.entries(values).forEach(([id, value]) => { const output = $(`#${id}`); if (output) output.textContent = value; });
    $("#customSize").hidden = inputs.exportPreset.value !== "custom";
  }

  const phaseDefinitions = [
    { key: "intro", index: "01", label: "主词入场", className: "is-intro" },
    { key: "hold", index: "02", label: "主词停顿", className: "is-hold" },
    { key: "anticipation", index: "03", label: "居中预备", className: "is-contact" },
    { key: "reveal", index: "04", label: "后句接入", className: "is-color" },
    { key: "phraseHold", index: "05", label: "本页停留", className: "is-replace" }
  ];

  function renderChoreoTrack(rowIndex = activeTimelineRow) {
    const timeline = timelineValues();
    activeTimelineRow = clamp(Math.round(rowIndex), 0, timeline.rows.length - 1);
    const activeRow = timeline.rows[activeTimelineRow];
    const timing = activeRow.timing;
    const bar = $("#choreoBar");
    const playhead = $("#choreoPlayhead");
    bar.replaceChildren(playhead);
    const phaseValues = { intro: timing.intro, hold: timing.hold, anticipation: timing.anticipation, reveal: Math.max(timing.reveal, timing.settle), phraseHold: timing.phraseHold };
    phaseDefinitions.forEach((phase) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `me-choreo-block ${phase.className}`;
      button.dataset.phase = phase.key;
      button.style.flexGrow = String(Math.max(.08, phaseValues[phase.key]));
      button.innerHTML = `<em>${phase.index}</em><strong>${phase.label}</strong><small>${Math.round(phaseValues[phase.key] * 1000)} ms</small>`;
      button.addEventListener("click", () => seekToPhase(phase.key));
      bar.insertBefore(button, playhead);
    });
    const legend = $("#choreoLegend");
    legend.innerHTML = `<li class="choreo-row-summary"><b>当前第 ${activeTimelineRow + 1} 行 · ${revealStyleLabel(activeRow.pair[2])}</b><span>${Math.round(timing.cycle * 1000)} ms</span></li>${phaseDefinitions.map((phase) => `<li><i class="${phase.className}"></i><b>${phase.label}</b><span>${Math.round(phaseValues[phase.key] * 1000)} ms</span></li>`).join("")}`;
  }

  function phaseStarts(timing) {
    return { intro: 0, hold: timing.intro, anticipation: timing.intro + timing.hold, reveal: timing.revealAt, phraseHold: timing.finish };
  }

  function seekToPhase(key) {
    const timeline = timelineValues();
    const activeRow = timeline.rows[clamp(activeTimelineRow, 0, timeline.rows.length - 1)];
    simulationTime = activeRow.start + (phaseStarts(activeRow.timing)[key] || 0);
    playing = false;
    syncPlayButtons();
  }

  function updateChoreoPlayhead(time) {
    const located = locateTimelineTime(time);
    if (located.index !== activeTimelineRow) renderChoreoTrack(located.index);
    const timing = located.timing;
    const local = located.local;
    $("#choreoPlayhead").style.left = `${clamp01(local / timing.cycle) * 100}%`;
    const starts = phaseStarts(timing);
    let current = "intro";
    Object.entries(starts).forEach(([key, start]) => { if (local >= start) current = key; });
    document.querySelectorAll(".me-choreo-block").forEach((block) => block.classList.toggle("is-active", block.dataset.phase === current));
  }

  function updateEditorState() {
    updateOutputs();
    renderChoreoTrack(activeTimelineRow);
    schedulePersist();
  }

  function renderLibrary(containerId, items) {
    const container = $(`#${containerId}`);
    container.innerHTML = items.map((item) => `<button class="me-asset-choice" type="button" data-library-id="${item.libraryId}" title="${item.name}"><img src="${item.url}" alt="${item.name}" loading="lazy"></button>`).join("");
    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-library-id]");
      if (!button) return;
      selectedCandidate = items.find((item) => item.libraryId === button.dataset.libraryId) || null;
      document.querySelectorAll(".me-asset-choice").forEach((choice) => choice.classList.toggle("is-selected", choice.dataset.libraryId === selectedCandidate?.libraryId));
      $("#candidateName").textContent = selectedCandidate ? `已选择：${selectedCandidate.name}` : "先在图库选择一个图标";
      $("#addCandidateButton").disabled = !selectedCandidate;
    });
  }

  function makeAsset(source, rowIndex = assetTargetRow) {
    const pair = phrasePairs[clamp(rowIndex, 0, phrasePairs.length - 1)];
    return { id: `continuation-asset-${nextAssetId++}`, rowId: pair.id, insertPart: "suffix", insertOffset: splitText(String(pair.suffix || "").trim()).length, spacing: normalizeAssetSpacing(undefined, Math.max(3, Number(inputs.wordGap.value) * .7)), libraryId: source.libraryId || null, name: source.name || "上传图片", url: source.url, fileType: source.fileType || "", kind: source.kind || "image", vectorType: source.vectorType || "", vectorStyle: source.vectorStyle || "", size: 100, opacity: 100, x: 0, y: 0, rotation: 0, builtin: Boolean(source.libraryId) };
  }

  async function prepareAsset(asset) {
    if (asset?.kind === "vector") return null;
    if (!asset?.url || runtimeAssets.has(asset.id)) return runtimeAssets.get(asset.id);
    const runtime = { image: null, frames: null, duration: 0, promise: null };
    runtimeAssets.set(asset.id, runtime);
    runtime.promise = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => { runtime.image = image; resolve(runtime); };
      image.onerror = () => resolve(runtime);
      image.src = asset.url;
    });
    await runtime.promise;
    if (/gif/i.test(asset.fileType || asset.url) && "ImageDecoder" in window) {
      try {
        const response = await fetch(asset.url);
        const data = await response.arrayBuffer();
        const decoder = new ImageDecoder({ data, type: asset.fileType || "image/gif" });
        await decoder.tracks.ready;
        const count = Math.min(180, decoder.tracks.selectedTrack?.frameCount || 1);
        const frames = [];
        let duration = 0;
        for (let index = 0; index < count; index += 1) {
          const decoded = await decoder.decode({ frameIndex: index });
          const frameDuration = Math.max(1 / 60, Number(decoded.image.duration || 100000) / 1000000);
          const bitmap = await createImageBitmap(decoded.image);
          decoded.image.close();
          frames.push({ image: bitmap, start: duration, duration: frameDuration });
          duration += frameDuration;
        }
        runtime.frames = frames;
        runtime.duration = duration;
        decoder.close();
      } catch (_) {}
    }
    return runtime;
  }

  async function prepareRowBackground(pair) {
    const media = normalizeBackgroundMedia(pair?.backgroundMedia);
    if (!pair?.id || !media) { if (pair?.id) runtimeBackgrounds.delete(pair.id); return null; }
    const existing = runtimeBackgrounds.get(pair.id);
    if (existing?.url === media.url) return existing.promise;
    existing?.video?.pause();
    existing?.exportVideo?.pause();
    const runtime = { url: media.url, image: null, video: null, exportVideo: null, frames: null, duration: 0, filmstrip: null, filmstripPromise: null, previewImage: null, previewTime: -1, previewNeedsSync: true, exportImage: null, exportTime: -1, promise: null, exportPromise: null };
    runtimeBackgrounds.set(pair.id, runtime);
    if (/^video\//i.test(media.fileType)) {
      const loadVideo = (key) => new Promise((resolve) => {
        const video = document.createElement("video");
        video.muted = true;
        video.loop = false;
        video.playsInline = true;
        video.preload = "auto";
        const finish = () => { runtime[key] = video; runtime.duration = Number(video.duration) || runtime.duration; resolve(runtime); };
        video.addEventListener("loadeddata", finish, { once: true });
        video.addEventListener("error", () => resolve(runtime), { once: true });
        video.src = media.url;
        video.load();
      });
      runtime.promise = loadVideo("video");
      runtime.exportPromise = loadVideo("exportVideo");
      return runtime.promise;
    }
    runtime.promise = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => { runtime.image = image; resolve(runtime); };
      image.onerror = () => resolve(runtime);
      image.src = media.url;
    });
    await runtime.promise;
    if (/gif/i.test(media.fileType || media.url) && "ImageDecoder" in window) {
      try {
        const response = await fetch(media.url);
        const data = await response.arrayBuffer();
        const decoder = new ImageDecoder({ data, type: media.fileType || "image/gif" });
        await decoder.tracks.ready;
        const count = Math.min(180, decoder.tracks.selectedTrack?.frameCount || 1);
        const frames = [];
        let duration = 0;
        for (let frameIndex = 0; frameIndex < count; frameIndex += 1) {
          const decoded = await decoder.decode({ frameIndex });
          const frameDuration = Math.max(1 / 60, Number(decoded.image.duration || 100000) / 1000000);
          const bitmap = await createImageBitmap(decoded.image);
          decoded.image.close();
          frames.push({ image: bitmap, start: duration, duration: frameDuration });
          duration += frameDuration;
        }
        runtime.frames = frames;
        runtime.duration = duration;
        decoder.close();
      } catch (_) {}
    }
    return runtime;
  }

  async function prepareVideoFilmstrip(runtime) {
    if (!runtime?.url) return null;
    if (runtime.filmstrip) return runtime.filmstrip;
    if (runtime.filmstripPromise) return runtime.filmstripPromise;
    runtime.filmstripPromise = (async () => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      await new Promise((resolve, reject) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("error", reject, { once: true });
        video.src = runtime.url;
        video.load();
      });
      const duration = Number(video.duration) || runtime.duration;
      if (!(duration > 0)) return null;
      const filmstrip = document.createElement("canvas");
      filmstrip.width = 720;
      filmstrip.height = 96;
      const context = filmstrip.getContext("2d");
      const frameCount = 8;
      const frameWidth = filmstrip.width / frameCount;
      const seek = (time) => new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          if (typeof video.requestVideoFrameCallback === "function") {
            const fallback = setTimeout(resolve, 120);
            video.requestVideoFrameCallback(() => { clearTimeout(fallback); resolve(); });
          }
          else requestAnimationFrame(resolve);
        };
        video.addEventListener("seeked", done, { once: true });
        video.currentTime = clamp(time, 0, Math.max(0, duration - .001));
        setTimeout(done, 800);
      });
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        await seek((frameIndex + .5) / frameCount * duration);
        const sourceWidth = video.videoWidth || 1;
        const sourceHeight = video.videoHeight || 1;
        const scale = Math.max(frameWidth / sourceWidth, filmstrip.height / sourceHeight);
        const drawWidth = sourceWidth * scale;
        const drawHeight = sourceHeight * scale;
        context.save();
        context.beginPath();
        context.rect(frameIndex * frameWidth, 0, frameWidth, filmstrip.height);
        context.clip();
        context.drawImage(video, frameIndex * frameWidth + (frameWidth - drawWidth) / 2, (filmstrip.height - drawHeight) / 2, drawWidth, drawHeight);
        context.restore();
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
      runtime.filmstrip = filmstrip;
      return filmstrip;
    })().catch(() => null);
    return runtime.filmstripPromise;
  }

  async function prepareAllAssets() {
    await Promise.all([...assets.map((asset) => prepareAsset(asset)), ...phrasePairs.map((pair) => prepareRowBackground(pair))]);
  }

  function assetImageAt(asset, time) {
    const runtime = runtimeAssets.get(asset.id);
    if (!runtime) return null;
    if (runtime.frames?.length && runtime.duration > 0) {
      const local = ((time % runtime.duration) + runtime.duration) % runtime.duration;
      return (runtime.frames.find((frame) => local >= frame.start && local < frame.start + frame.duration) || runtime.frames.at(-1)).image;
    }
    return runtime.image;
  }

  function setActivePreviewBackground(rowId) {
    if (activePreviewBackgroundRowId === rowId) return;
    runtimeBackgrounds.get(activePreviewBackgroundRowId)?.video?.pause();
    activePreviewBackgroundRowId = rowId;
    const runtime = runtimeBackgrounds.get(rowId);
    if (runtime) runtime.previewNeedsSync = true;
  }

  function cachePreviewVideoFrame(runtime) {
    const video = runtime.video;
    if (!video || video.readyState < 2 || video.seeking || !video.videoWidth || !video.videoHeight) return;
    const frameCanvas = runtime.previewImage || document.createElement("canvas");
    if (frameCanvas.width !== video.videoWidth || frameCanvas.height !== video.videoHeight) {
      frameCanvas.width = video.videoWidth;
      frameCanvas.height = video.videoHeight;
    }
    frameCanvas.getContext("2d").drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    runtime.previewImage = frameCanvas;
    runtime.previewTime = video.currentTime;
  }

  function backgroundImageAt(rowId, localTime, media, preview) {
    const runtime = runtimeBackgrounds.get(rowId);
    if (!runtime) return null;
    if (runtime.frames?.length && runtime.duration > 0) {
      const local = ((localTime % runtime.duration) + runtime.duration) % runtime.duration;
      return (runtime.frames.find((frame) => local >= frame.start && local < frame.start + frame.duration) || runtime.frames.at(-1)).image;
    }
    if (runtime.video) {
      const duration = runtime.duration || Number(runtime.video.duration) || 0;
      const target = duration > 0 ? videoClipTime(media, duration, localTime) : 0;
      if (!preview && runtime.exportImage && Math.abs(runtime.exportTime - target) <= 1 / 240) return runtime.exportImage;
      if (!preview) return runtime.previewImage || (runtime.video.readyState >= 2 ? runtime.video : null);
      const video = runtime.video;
      const clip = videoClipBounds(media, duration);
      const endGuard = Math.min(.05, clip.duration / 4);
      const outsideClip = video.currentTime < clip.start - .03 || video.currentTime >= clip.end - endGuard;
      const drift = Math.abs(video.currentTime - target);
      if (!video.seeking && (runtime.previewNeedsSync || outsideClip || drift > .18)) {
        runtime.previewNeedsSync = false;
        video.currentTime = target;
      }
      if (playing && !exporting && !video.seeking) {
        video.playbackRate = clamp(Number(inputs.speed.value) / 100, .25, 4);
        video.play().catch(() => {});
      } else video.pause();
      cachePreviewVideoFrame(runtime);
      return video.seeking || video.readyState < 2 ? runtime.previewImage : video;
    }
    return runtime.image;
  }

  async function seekRuntimeBackground(rowId, media, localTime) {
    const runtime = runtimeBackgrounds.get(rowId);
    if (!runtime) return;
    await runtime.exportPromise;
    const video = runtime.exportVideo;
    if (!video) return;
    const duration = runtime.duration || Number(video.duration) || 0;
    if (!(duration > 0)) return;
    const target = videoClipTime(media, duration, localTime);
    if (Math.abs(video.currentTime - target) > 1 / 240) {
      await new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          if (typeof video.requestVideoFrameCallback === "function") {
            let fallbackTimer = setTimeout(resolve, 250);
            video.requestVideoFrameCallback(() => { clearTimeout(fallbackTimer); resolve(); });
          } else requestAnimationFrame(() => resolve());
        };
        video.addEventListener("seeked", done, { once: true });
        video.currentTime = target;
        setTimeout(done, 1000);
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = video.videoWidth || 2;
    frameCanvas.height = video.videoHeight || 2;
    frameCanvas.getContext("2d").drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
    runtime.exportImage = frameCanvas;
    runtime.exportTime = target;
  }

  async function seekBackgroundAt(realSeconds) {
    const located = locateTimelineTime(realSeconds);
    const timeline = located.timeline;
    const tasks = [seekRuntimeBackground(located.pair[8], located.pair[25], located.local)];
    const transitionDuration = Number(located.pair[27]) / 1000;
    if (timeline.rows.length > 1 && located.pair[26] === "crossfade" && located.local < transitionDuration) {
      const previous = timeline.rows[(located.index - 1 + timeline.rows.length) % timeline.rows.length];
      tasks.push(seekRuntimeBackground(previous.pair[8], previous.pair[25], Math.max(0, previous.timing.cycle - .001)));
    }
    await Promise.all(tasks);
  }

  function renderSelectedAssets() {
    $("#assetCount").textContent = String(assets.length);
    const list = $("#selectedAssetList");
    list.replaceChildren();
    assets.forEach((asset, index) => {
      const row = document.createElement("div");
      row.className = "selected-asset-row";
      row.draggable = true;
      row.tabIndex = 0;
      row.dataset.assetId = asset.id;
      const pairIndex = Math.max(0, phrasePairs.findIndex((pair) => pair.id === asset.rowId));
      const pair = phrasePairs[pairIndex];
      row.innerHTML = `<img src="${asset.url}" alt=""><span class="selected-asset-copy"><strong></strong><small></small></span><span class="selected-asset-actions"><button class="edit-asset" type="button">单独编辑</button><button class="remove-asset" type="button">从本行删除</button></span>`;
      row.querySelector("strong").textContent = asset.name;
      row.querySelector("small").textContent = `${rowDisplayName(pairIndex)} · ${assetInsertionLabel(asset, pair)}`;
      row.querySelector(".edit-asset").addEventListener("click", () => openAssetDrawer(asset.id));
      row.querySelector(".remove-asset").addEventListener("click", () => removeAsset(asset.id));
      row.addEventListener("dragstart", () => { draggedAssetId = asset.id; });
      row.addEventListener("dragover", (event) => event.preventDefault());
      row.addEventListener("drop", (event) => { event.preventDefault(); moveAsset(draggedAssetId, asset.id); });
      row.addEventListener("keydown", (event) => {
        if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const targetIndex = clamp(index + (event.key === "ArrowUp" ? -1 : 1), 0, assets.length - 1);
        if (targetIndex === index) return;
        const [moved] = assets.splice(index, 1);
        assets.splice(targetIndex, 0, moved);
        renderSelectedAssets();
        updateEditorState();
        requestAnimationFrame(() => list.querySelector(`[data-asset-id="${asset.id}"]`)?.focus());
      });
      list.append(row);
    });
    updatePairAssetCounts();
  }

  function moveAsset(sourceId, targetId) {
    const sourceIndex = assets.findIndex((asset) => asset.id === sourceId);
    const targetIndex = assets.findIndex((asset) => asset.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const [moved] = assets.splice(sourceIndex, 1);
    assets.splice(targetIndex, 0, moved);
    renderSelectedAssets();
    updateEditorState();
  }

  function removeAsset(assetId) {
    assets = assets.filter((asset) => asset.id !== assetId);
    runtimeAssets.delete(assetId);
    if (activeAssetId === assetId) closeAssetDrawer();
    renderSelectedAssets();
    updateEditorState();
  }

  function activeAsset() { return assets.find((asset) => asset.id === activeAssetId) || null; }
  const assetControlMap = { assetSpacing: "spacing", assetSize: "size", assetOpacity: "opacity", assetX: "x", assetY: "y", assetRotation: "rotation" };

  function refreshAssetInsertionOptions(asset = activeAsset()) {
    if (!asset) return;
    const pair = phrasePairs.find((item) => item.id === asset.rowId) || phrasePairs[0];
    const placement = normalizeAssetPlacementInPlace(asset, pair);
    const insertion = $("#assetInsertionPoint");
    insertion.replaceChildren(...assetInsertionOptions(pair).map((option) => new Option(option.label, option.value)));
    insertion.value = `${placement.part}:${placement.offset}`;
  }

  function openAssetDrawer(assetId) {
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) return;
    activeAssetId = assetId;
    const pairIndex = Math.max(0, phrasePairs.findIndex((pair) => pair.id === asset.rowId));
    $("#drawerAssetName").textContent = `${rowDisplayName(pairIndex)} · ${asset.name}`;
    const assignment = $("#assetRowAssignment");
    assignment.replaceChildren(...phrasePairs.map((_, index) => new Option(rowDisplayName(index), String(index))));
    assignment.value = String(pairIndex);
    refreshAssetInsertionOptions(asset);
    Object.entries(assetControlMap).forEach(([id, key]) => { $(`#${id}`).value = String(asset[key]); });
    updateAssetOutputs();
    $("#assetDrawer").hidden = false;
  }

  function closeAssetDrawer() { activeAssetId = null; $("#assetDrawer").hidden = true; }

  function updateAssetOutputs() {
    const asset = activeAsset();
    if (!asset) return;
    $("#assetSpacingOut").textContent = Number(asset.spacing).toFixed(Number(asset.spacing) % 1 ? 1 : 0);
    $("#assetSizeOut").textContent = `${asset.size}%`;
    $("#assetOpacityOut").textContent = `${asset.opacity}%`;
    $("#assetXOut").textContent = String(asset.x);
    $("#assetYOut").textContent = String(asset.y);
    $("#assetRotationOut").textContent = `${asset.rotation}°`;
  }

  function canvasFont(context, preset, weight, size) {
    context.font = `${preset.style || "normal"} ${weight} ${size}px "${preset.family}"`;
  }

  function drawAsset(context, asset, image, centerX, centerY, size, outputScale, alpha, time) {
    if (alpha <= 0 || (asset.kind !== "vector" && !image)) return;
    context.save();
    context.globalAlpha = alpha * Number(asset.opacity) / 100;
    context.translate(centerX + Number(asset.x) * outputScale, centerY + Number(asset.y) * outputScale);
    context.rotate(Number(asset.rotation) * Math.PI / 180);
    if (asset.kind === "vector") sharedIcons.drawVector(context, asset, size, time);
    else {
      const width = image.width || image.naturalWidth || size;
      const height = image.height || image.naturalHeight || size;
      const fit = size / Math.max(1, Math.max(width, height));
      context.drawImage(image, -width * fit / 2, -height * fit / 2, width * fit, height * fit);
    }
    context.restore();
  }

  function buildInlineLayout(characters, characterWidths, tracking, placedAssets, baseSize, outputScale) {
    const byOffset = new Map();
    placedAssets.forEach(({ asset, offset }) => {
      if (!byOffset.has(offset)) byOffset.set(offset, []);
      byOffset.get(offset).push(asset);
    });
    const items = [];
    for (let offset = 0; offset <= characters.length; offset += 1) {
      (byOffset.get(offset) || []).forEach((asset) => items.push({ type: "asset", asset, width: baseSize * Number(asset.size) / 100, spacing: normalizeAssetSpacing(asset.spacing, Math.max(3, Number(inputs.wordGap.value) * .7)) * outputScale }));
      if (offset < characters.length) items.push({ type: "character", character: characters[offset], characterIndex: offset, width: characterWidths[offset] });
    }
    let width = 0;
    items.forEach((item, index) => {
      const previous = items[index - 1];
      item.gapBefore = previous ? previous.type === "asset" && item.type === "asset" ? Math.max(previous.spacing, item.spacing) : previous.type === "asset" ? previous.spacing : item.type === "asset" ? item.spacing : tracking : 0;
      width += item.gapBefore + item.width;
    });
    return { items, width };
  }

  // Measure ink, not the transparent rectangle around an icon. Bitmap/GIF frames
  // are cached by identity; vectors use the shared renderer at a fixed resolution
  // so preview and export derive the same normalized bounds.
  const imageBoundsCache = new WeakMap();
  const boundsCanvas = document.createElement("canvas");
  boundsCanvas.width = boundsCanvas.height = 512;
  const boundsContext = boundsCanvas.getContext("2d", { willReadFrequently: true });
  function assetInkBounds(asset, image, time) {
    if (asset.kind !== "vector" && !image) return null;
    const rotation = Number(asset.rotation) || 0;
    const cached = asset.kind !== "vector" ? imageBoundsCache.get(image) : null;
    if (cached?.has(rotation)) return cached.get(rotation);
    boundsContext.clearRect(0, 0, 512, 512);
    boundsContext.save();
    boundsContext.translate(256, 256);
    boundsContext.rotate(rotation * Math.PI / 180);
    if (asset.kind === "vector") sharedIcons.drawVector(boundsContext, asset, 320, time);
    else {
      const width = image.width || image.naturalWidth;
      const height = image.height || image.naturalHeight;
      const fit = 320 / Math.max(width, height, 1);
      boundsContext.drawImage(image, -width * fit / 2, -height * fit / 2, width * fit, height * fit);
    }
    boundsContext.restore();
    let result;
    try {
      const pixels = boundsContext.getImageData(0, 0, 512, 512).data;
      let left = 512, top = 512, right = -1, bottom = -1;
      for (let y = 0; y < 512; y += 1) for (let x = 0; x < 512; x += 1) {
        if (pixels[(y * 512 + x) * 4 + 3] <= 2) continue;
        left = Math.min(left, x); right = Math.max(right, x + 1);
        top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
      }
      result = right < 0 ? null : { left: (left - 256) / 320, right: (right - 256) / 320, top: (top - 256) / 320, bottom: (bottom - 256) / 320 };
    } catch (_) {
      // A cross-origin image may be drawable but not readable.
      result = { left: -.5, right: .5, top: -.5, bottom: .5 };
      boundsCanvas.width = 512;
    }
    if (asset.kind !== "vector") {
      const rotations = cached || new Map();
      rotations.set(rotation, result);
      imageBoundsCache.set(image, rotations);
    }
    return result;
  }

  function compositionBounds(context, items, preset, outputScale, time) {
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    const include = (x, y) => {
      bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
    };
    items.forEach((item) => {
      if (item.alpha < 1 / 255) return;
      if (item.type === "character") {
        canvasFont(context, preset, item.weight, item.fontSize);
        const ink = context.measureText(item.character);
        if (!ink.actualBoundingBoxLeft && !ink.actualBoundingBoxRight) return;
        include(item.x - ink.actualBoundingBoxLeft * item.scale, -ink.actualBoundingBoxAscent * item.scale);
        include(item.x + ink.actualBoundingBoxRight * item.scale, ink.actualBoundingBoxDescent * item.scale);
      } else {
        if (Number(item.asset.opacity) <= 0) return;
        const ink = assetInkBounds(item.asset, item.image, time);
        if (!ink) return;
        const centerX = item.width / 2 + Number(item.asset.x) * outputScale;
        const centerY = Number(item.asset.y) * outputScale;
        include(item.x + (centerX + ink.left * item.width) * item.scale, (centerY + ink.top * item.width) * item.scale);
        include(item.x + (centerX + ink.right * item.width) * item.scale, (centerY + ink.bottom * item.width) * item.scale);
      }
    });
    return Number.isFinite(bounds.left) ? bounds : null;
  }

  function drawBackgroundLayer(context, width, height, color, media, image, alpha = 1) {
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
    if (image && media) {
      const sourceWidth = image.videoWidth || image.width || image.naturalWidth || width;
      const sourceHeight = image.videoHeight || image.height || image.naturalHeight || height;
      const coverScale = Math.max(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight));
      const drawWidth = sourceWidth * coverScale;
      const drawHeight = sourceHeight * coverScale;
      const mediaOpacity = Number(media.opacity) / 100;
      context.globalAlpha = alpha * mediaOpacity;
      context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      if (Number(media.tintStrength) > 0) {
        context.globalAlpha = alpha * mediaOpacity * Number(media.tintStrength) / 100;
        context.fillStyle = media.tintColor;
        context.fillRect(0, 0, width, height);
      }
    }
    context.restore();
  }

  function renderFrame(canvas, realSeconds, width = canvas.width, height = canvas.height) {
    const context = canvas.getContext("2d");
    const located = locateTimelineTime(realSeconds);
    const { index: pairIndex, local, timing } = located;
    const [leadText, suffixText, revealStyle, punctuationColor, leadColor, suffixColor, leadFontSize, suffixFontSize, rowId, leadLetterSpacing, suffixLetterSpacing, pairGap, sweepEnabled, sweepColors, sweepDurationMs, leadIntroStyle, , , , , , , popDistance, popBounce, rowBackgroundColor, rowBackgroundMedia, backgroundTransition, backgroundTransitionDurationMs, rowFontFamily] = located.pair;
    const preset = fontPreset(rowFontFamily);
    const shortSide = Math.min(width, height);
    const outputScale = shortSide / 720;
    const leadSize = Number(leadFontSize) * outputScale;
    const suffixSize = Number(suffixFontSize) * outputScale;
    const rowAssets = assets.filter((asset) => asset.rowId === rowId);
    const leadTracking = Number(leadLetterSpacing) * outputScale;
    const suffixTracking = Number(suffixLetterSpacing) * outputScale;
    const sourcePairIndex = Math.max(0, phrasePairs.findIndex((pair) => pair.id === rowId));
    const anchorX = width * (rowPositions[sourcePairIndex] ?? 50) / 100;
    const anchorY = height / 2;

    context.clearRect(0, 0, width, height);
    const preview = canvas === previewCanvas;
    if (preview) setActivePreviewBackground(rowId);
    const backgroundImage = backgroundImageAt(rowId, local, rowBackgroundMedia, preview);
    const transitionDuration = Number(backgroundTransitionDurationMs) / 1000;
    const timeline = located.timeline;
    if (backgroundTransition === "crossfade" && timeline.rows.length > 1 && local < transitionDuration) {
      const previous = timeline.rows[(pairIndex - 1 + timeline.rows.length) % timeline.rows.length];
      const previousPair = previous.pair;
      const previousImage = backgroundImageAt(previousPair[8], Math.max(0, previous.timing.cycle - .001), previousPair[25], false);
      drawBackgroundLayer(context, width, height, previousPair[24], previousPair[25], previousImage);
      const progress = clamp01(local / Math.max(.01, transitionDuration));
      const easedProgress = progress * progress * (3 - 2 * progress);
      drawBackgroundLayer(context, width, height, rowBackgroundColor, rowBackgroundMedia, backgroundImage, easedProgress);
    } else drawBackgroundLayer(context, width, height, rowBackgroundColor, rowBackgroundMedia, backgroundImage);
    context.fillStyle = leadColor;
    context.textAlign = "left";
    context.textBaseline = "middle";
    canvasFont(context, preset, inputs.leadFontWeight.value, leadSize);
    const leadCharacters = splitText(leadText);
    const leadWidths = leadCharacters.map((character) => context.measureText(character).width);
    const suffixCharacters = splitText(suffixText);
    canvasFont(context, preset, inputs.suffixFontWeight.value, suffixSize);
    const suffixWidths = suffixCharacters.map((character) => context.measureText(character).width);
    const placedAssets = rowAssets.map((asset) => ({ asset, ...assetPlacement(asset, { lead: leadText, suffix: suffixText }) }));
    const leadLayout = buildInlineLayout(leadCharacters, leadWidths, leadTracking, placedAssets.filter((item) => item.part === "lead"), leadSize, outputScale);
    const suffixLayout = buildInlineLayout(suffixCharacters, suffixWidths, suffixTracking, placedAssets.filter((item) => item.part === "suffix"), suffixSize, outputScale);
    const leadWidth = leadLayout.width;
    const suffixWidth = suffixLayout.width;
    const gap = leadLayout.items.length && suffixLayout.items.length ? Number(pairGap) * outputScale : 0;
    const fullWidth = leadWidth + gap + suffixWidth;
    const availableWidth = Math.max(width * .16, 2 * (Math.min(anchorX, width - anchorX) - width * .04));
    const settleStartScale = Number(inputs.settleScale.value) / 100;
    const leadFit = Math.min(1, availableWidth / Math.max(1, leadWidth * settleStartScale));
    const phraseFit = Math.min(1, availableWidth / Math.max(1, fullWidth * settleStartScale));
    let groupScale = leadFit;
    let leadAlpha = 1;
    let assembled = local >= timing.revealAt;
    if (!assembled) {
      if (leadIntroStyle === "softPop") {
        const introProgress = clamp01(local / timing.intro);
        groupScale = leadFit * (.9 + .1 * easeOutBack(introProgress, .9));
        leadAlpha = easeOut(local / Math.min(timing.intro, .14));
      } else {
        const introProgress = pairIndex === 0 ? easeOut(local / timing.intro) : easeOutExpo(local / timing.intro);
        if (pairIndex === 0) leadAlpha = introProgress;
        else groupScale = leadFit * (settleStartScale + (1 - settleStartScale) * introProgress);
      }
    } else {
      const settleProgress = easeSettle((local - timing.revealAt) / timing.settle);
      groupScale = phraseFit * (settleStartScale + (1 - settleStartScale) * settleProgress);
    }

    const leadX = assembled ? -fullWidth / 2 : -leadWidth / 2;
    const drawItems = [];
    let leadCursor = leadX;
    leadLayout.items.forEach((item) => {
      leadCursor += item.gapBefore;
      drawItems.push({ ...item, x: leadCursor, scale: 1, alpha: leadAlpha, fontSize: leadSize, weight: inputs.leadFontWeight.value, color: isPunctuation(item.character) ? punctuationColor : leadColor, image: item.type === "asset" ? assetImageAt(item.asset, realSeconds) : null });
      leadCursor += item.width;
    });

    if (assembled) {
      const revealElapsed = local - timing.revealAt;
      const revealProgress = timing.reveal <= 0 ? 1 : clamp01(revealElapsed / timing.reveal);
      const wholeAlpha = revealStyle === "whole" ? easeOut(revealProgress) : revealStyle === "rightPop" ? easeOut(revealElapsed / Math.max(.04, Math.min(.12, timing.reveal * .35))) : 1;
      const popEase = revealStyle === "rightPop" ? easeOutBack(revealProgress, Number(popBounce) / 100 * 2.2) : 1;
      const popOffset = revealStyle === "rightPop" ? -Number(popDistance) * outputScale * (1 - popEase) : 0;
      const popScale = revealStyle === "rightPop" ? .88 + .12 * popEase : 1;
      const revealUnits = suffixLayout.items.length;
      const stagger = revealUnits > 1 ? Math.max(0, timing.reveal - .045) / (revealUnits - 1) : 0;
      let cursor = 0;
      suffixLayout.items.forEach((item, index) => {
        cursor += item.gapBefore;
        const unitElapsed = revealElapsed - index * stagger;
        const alpha = revealStyle === "type" ? easeOut(unitElapsed / .045) : wholeAlpha;
        const finalColor = isPunctuation(item.character) ? punctuationColor : suffixColor;
        const sweepDuration = Number(sweepDurationMs) / 1000;
        const sweepActive = revealStyle === "type" && sweepEnabled && unitElapsed >= 0 && unitElapsed < sweepDuration;
        drawItems.push({ ...item, x: leadX + leadWidth + gap + popOffset + cursor * popScale, scale: popScale, alpha, fontSize: suffixSize, weight: inputs.suffixFontWeight.value, color: sweepActive ? normalizeColor(sweepColors[item.characterIndex], finalColor) : finalColor, image: item.type === "asset" ? assetImageAt(item.asset, realSeconds) : null });
        cursor += item.width;
      });
    }

    // Only currently visible content participates. Hidden suffixes, icon padding,
    // pop overshoot and local offsets must not pull the composition off its anchor.
    const bounds = compositionBounds(context, drawItems, preset, outputScale, realSeconds);
    context.save();
    if (bounds) {
      groupScale = Math.min(groupScale, availableWidth / Math.max(1, bounds.right - bounds.left), height * .92 / Math.max(1, bounds.bottom - bounds.top));
      context.translate(anchorX, anchorY);
      context.scale(groupScale, groupScale);
      context.translate(-(bounds.left + bounds.right) / 2, -(bounds.top + bounds.bottom) / 2);
    }
    drawItems.forEach((item) => {
      if (item.alpha < 1 / 255) return;
      context.save();
      context.translate(item.x, 0);
      context.scale(item.scale, item.scale);
      if (item.type === "character") {
        canvasFont(context, preset, item.weight, item.fontSize);
        context.globalAlpha = item.alpha;
        context.fillStyle = item.color;
        context.fillText(item.character, 0, 0);
      } else drawAsset(context, item.asset, item.image, item.width / 2, 0, item.width, outputScale, item.alpha, realSeconds);
      context.restore();
    });
    context.restore();
    return { pairIndex, local, timing, leadText, suffixText };
  }

  function selectedCanvasDimensions() {
    const preset = inputs.exportPreset.value;
    if (preset === "custom") return { width: clamp(Number(inputs.exportWidth.value) || 1080, 240, 3840), height: clamp(Number(inputs.exportHeight.value) || 1080, 240, 3840) };
    const normalizedPreset = preset === "current" ? "1920x1080" : preset;
    const [width, height] = normalizedPreset.split("x").map(Number);
    return { width, height };
  }

  function fitDesignFrame() {
    const shellRect = $(".stage-shell").getBoundingClientRect();
    const dimensions = selectedCanvasDimensions();
    const padding = window.innerWidth <= 720 ? 16 : 44;
    const availableWidth = Math.max(1, shellRect.width - padding * 2);
    const availableHeight = Math.max(1, shellRect.height - padding * 2);
    const fitScale = Math.min(availableWidth / dimensions.width, availableHeight / dimensions.height);
    const width = Math.max(1, dimensions.width * fitScale);
    const height = Math.max(1, dimensions.height * fitScale);
    const styles = { width: `${width}px`, height: `${height}px`, left: `${(shellRect.width - width) / 2}px`, top: `${(shellRect.height - height) / 2}px` };
    Object.entries(styles).forEach(([key, value]) => { if (designFrame.style[key] !== value) designFrame.style[key] = value; });
    return dimensions;
  }

  function resizePreview() {
    const dimensions = fitDesignFrame();
    const rect = designFrame.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (previewCanvas.width !== width || previewCanvas.height !== height) { previewCanvas.width = width; previewCanvas.height = height; }
  }

  function animate(now) {
    resizePreview();
    const delta = Math.min(.1, Math.max(0, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    const timeline = timelineValues();
    if (playing) simulationTime = (simulationTime + delta * Number(inputs.speed.value) / 100) % timeline.total;
    const state = renderFrame(previewCanvas, simulationTime, previewCanvas.width, previewCanvas.height);
    $("#livePhrase").textContent = `${state.leadText} ${state.suffixText}`.trim();
    updateChoreoPlayhead(simulationTime);
    requestAnimationFrame(animate);
  }

  function syncPlayButtons() {
    $("#stagePauseButton").textContent = playing ? "暂停" : "播放";
    $("#stagePauseButton").setAttribute("aria-pressed", String(!playing));
  }

  function exportDimensions() {
    return selectedCanvasDimensions();
  }

  function makeExportCanvas() {
    const canvas = document.createElement("canvas");
    const dimensions = exportDimensions();
    canvas.width = Math.max(2, Math.round(dimensions.width / 2) * 2);
    canvas.height = Math.max(2, Math.round(dimensions.height / 2) * 2);
    return canvas;
  }

  function exportDurationSeconds() {
    const selected = $("#exportDuration").value;
    if (selected === "full") return timelineValues().total / (Number(inputs.speed.value) / 100);
    if (selected === "custom") return clamp(Number($("#customDuration").value) || 3, .1, 30);
    return Number(selected);
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
  function setExportBusy(busy, message) { exporting = busy; exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }

  $("#exportPng").addEventListener("click", async () => {
    setExportBusy(true, "正在准备高清素材…");
    await prepareAllAssets();
    const canvas = makeExportCanvas();
    await seekBackgroundAt(simulationTime);
    renderFrame(canvas, simulationTime, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (blob) downloadBlob(blob, `continuation-${canvas.width}x${canvas.height}.png`); setExportBusy(false, `PNG 已生成 · ${canvas.width} × ${canvas.height}`); }, "image/png");
  });

  $("#exportGif").addEventListener("click", async () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    setExportBusy(true, "正在准备高清素材…");
    try {
      await prepareAllAssets();
      const canvas = makeExportCanvas();
      const fps = Math.min(30, Number($("#exportFps").value) || 15);
      const duration = exportDurationSeconds();
      const frames = Math.max(1, Math.ceil(duration * fps));
      const speed = Number(inputs.speed.value) / 100;
      const gif = new GIF({ workers: 2, quality: 10, width: canvas.width, height: canvas.height, workerScript: "js/continuation-gif.worker.js" });
      for (let frame = 0; frame < frames; frame += 1) {
        const frameTime = frame / fps * speed;
        await seekBackgroundAt(frameTime);
        renderFrame(canvas, frameTime, canvas.width, canvas.height);
        gif.addFrame(canvas, { copy: true, delay: 1000 / fps });
        if (frame % 5 === 0) exportStatus.textContent = `正在准备 GIF · ${frame + 1} / ${frames} 帧`;
      }
      gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => { downloadBlob(blob, `continuation-${canvas.width}x${canvas.height}.gif`); setExportBusy(false, `GIF 已生成 · ${canvas.width} × ${canvas.height}`); });
      gif.on("abort", () => setExportBusy(false, "GIF 编码已取消。"));
      gif.render();
    } catch (error) { console.error(error); setExportBusy(false, `GIF 导出失败：${error.message}`); }
  });

  $("#exportVideo").addEventListener("click", async () => {
    if (!window.HME?.createH264MP4Encoder) { exportStatus.textContent = "MP4 编码器未加载，请刷新后重试。"; return; }
    setExportBusy(true, "正在准备 MP4 素材…");
    let encoder;
    try {
      await prepareAllAssets();
      const canvas = makeExportCanvas();
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const fps = Number($("#exportFps").value) || 30;
      const duration = exportDurationSeconds();
      const speed = Number(inputs.speed.value) / 100;
      const frameCount = Math.max(1, Math.ceil(duration * fps));
      encoder = await window.HME.createH264MP4Encoder();
      encoder.outputFilename = `continuation-${canvas.width}x${canvas.height}.mp4`;
      encoder.width = canvas.width;
      encoder.height = canvas.height;
      encoder.frameRate = fps;
      encoder.kbps = Math.max(4000, Math.round(canvas.width * canvas.height * fps * .12 / 1000));
      encoder.groupOfPictures = 15;
      encoder.initialize();
      for (let frame = 0; frame < frameCount; frame += 1) {
        const frameTime = frame / fps * speed;
        await seekBackgroundAt(frameTime);
        renderFrame(canvas, frameTime, canvas.width, canvas.height);
        encoder.addFrameRgba(context.getImageData(0, 0, canvas.width, canvas.height).data);
        if (frame % 2 === 0 || frame === frameCount - 1) { exportStatus.textContent = `正在编码 MP4 · ${Math.round((frame + 1) / frameCount * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), encoder.outputFilename);
      setExportBusy(false, `MP4 已生成 · ${canvas.width} × ${canvas.height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) { console.error(error); setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`); }
    finally { try { encoder?.delete(); } catch (_) {} }
  });

  controlIds.forEach((id) => inputs[id].addEventListener("input", updateEditorState));
  [["leadFontSize", "leadFontSize"], ["suffixFontSize", "suffixFontSize"]].forEach(([controlId, pairKey]) => {
    inputs[controlId].addEventListener("input", () => {
      phrasePairs.forEach((pair) => { pair[pairKey] = normalizeFontSize(inputs[controlId].value); });
      renderPairEditor();
      updateEditorState();
    });
  });
  inputs.wordGap.addEventListener("input", () => {
    phrasePairs.forEach((pair) => { pair.pairGap = normalizePairGap(inputs.wordGap.value); });
    renderPairEditor();
    updateEditorState();
  });
  inputs.backgroundColor.addEventListener("input", () => {
    phrasePairs.forEach((pair) => { pair.backgroundColor = inputs.backgroundColor.value; });
    renderPairEditor();
    updateEditorState();
  });
  $("#addPairButton").addEventListener("click", () => {
    if (phrasePairs.length >= 8) return;
    phrasePairs.push({ id: `continuation-row-${nextRowId++}`, lead: "New", suffix: "continuation.", revealStyle: "whole", fontFamily: "inherit", leadColor: inputs.textColor.value, suffixColor: inputs.textColor.value, punctuationColor: inputs.textColor.value, leadFontSize: Number(inputs.leadFontSize.value), suffixFontSize: Number(inputs.suffixFontSize.value), leadLetterSpacing: 0, suffixLetterSpacing: 0, pairGap: Number(inputs.wordGap.value), sweepEnabled: false, sweepColors: [], sweepDuration: 100, leadIntroStyle: "original", ...rowMotionDefaults("whole", inputs.backgroundColor.value) });
    rowPositions.push(50);
    renderPairEditor();
    refreshAssetTargetOptions();
    syncRowPositionControls();
    updateEditorState();
    $("#pairEditor .pair-editor-row:last-child .pair-lead-input")?.select();
  });

  function setAssetManager(expanded) {
    const panel = $("#continuationLayerPanel");
    panel.classList.toggle("is-list-expanded", expanded);
    $("#assetListToggle").textContent = expanded ? "收起已选" : "展开已选";
    $("#assetListToggle").setAttribute("aria-expanded", String(expanded));
  }
  $("#assetListToggle").addEventListener("click", () => setAssetManager(!$("#continuationLayerPanel").classList.contains("is-list-expanded")));
  $("#assetTargetRow").addEventListener("change", (event) => { assetTargetRow = clamp(Number(event.target.value) || 0, 0, phrasePairs.length - 1); refreshAssetTargetOptions(); });
  $("#addCandidateButton").addEventListener("click", () => {
    if (!selectedCandidate) return;
    const targetRowId = phrasePairs[assetTargetRow].id;
    if (assets.some((asset) => asset.rowId === targetRowId && asset.libraryId === selectedCandidate.libraryId)) { schemeStatus.textContent = `这个内置图标已经加入第 ${assetTargetRow + 1} 行。`; return; }
    const asset = makeAsset(selectedCandidate, assetTargetRow);
    assets.push(asset);
    prepareAsset(asset);
    renderSelectedAssets();
    updateEditorState();
    schemeStatus.textContent = `已把“${asset.name}”添加到第 ${assetTargetRow + 1} 行，可展开已选后单独编辑。`;
  });
  $("#assetUpload").addEventListener("change", async (event) => {
    const uploadTargetRow = assetTargetRow;
    for (const file of Array.from(event.target.files || [])) {
      const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const asset = makeAsset({ name: file.name, url, fileType: file.type }, uploadTargetRow);
      assets.push(asset);
      prepareAsset(asset);
    }
    event.target.value = "";
    renderSelectedAssets();
    updateEditorState();
    schemeStatus.textContent = `上传图片已加入第 ${uploadTargetRow + 1} 行，可展开已选后单独编辑。`;
  });
  Object.entries(assetControlMap).forEach(([id, key]) => $(`#${id}`).addEventListener("input", (event) => { const asset = activeAsset(); if (!asset) return; asset[key] = Number(event.target.value); updateAssetOutputs(); updateEditorState(); }));
  $("#assetRowAssignment").addEventListener("change", (event) => {
    const asset = activeAsset();
    if (!asset) return;
    const targetIndex = clamp(Number(event.target.value) || 0, 0, phrasePairs.length - 1);
    const targetRowId = phrasePairs[targetIndex].id;
    if (asset.libraryId && assets.some((item) => item.id !== asset.id && item.rowId === targetRowId && item.libraryId === asset.libraryId)) {
      schemeStatus.textContent = `第 ${targetIndex + 1} 行已经有这个内置图标。`;
      event.target.value = String(Math.max(0, phrasePairs.findIndex((pair) => pair.id === asset.rowId)));
      return;
    }
    asset.rowId = targetRowId;
    normalizeAssetPlacementInPlace(asset, phrasePairs[targetIndex]);
    assetTargetRow = targetIndex;
    refreshAssetTargetOptions();
    refreshAssetInsertionOptions(asset);
    renderSelectedAssets();
    $("#drawerAssetName").textContent = `${rowDisplayName(targetIndex)} · ${asset.name}`;
    updateEditorState();
  });
  $("#assetInsertionPoint").addEventListener("change", (event) => {
    const asset = activeAsset();
    if (!asset) return;
    const [part, offset] = String(event.target.value).split(":");
    asset.insertPart = part === "lead" ? "lead" : "suffix";
    asset.insertOffset = Number(offset) || 0;
    normalizeAssetPlacementInPlace(asset, phrasePairs.find((pair) => pair.id === asset.rowId));
    renderSelectedAssets();
    updateEditorState();
  });
  $("#closeAssetDrawer").addEventListener("click", closeAssetDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#assetDrawer").hidden) { closeAssetDrawer(); return; }
    const panel = $("#continuationLayerPanel");
    if (panel.classList.contains("is-list-expanded")) $("#assetListToggle").click();
  });

  $("#stagePauseButton").addEventListener("click", () => { playing = !playing; syncPlayButtons(); });
  $("#stageReplayButton").addEventListener("click", () => { simulationTime = 0; playing = true; syncPlayButtons(); });
  $("#choreoBar").addEventListener("click", (event) => {
    if (event.target.closest(".me-choreo-block")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const timeline = timelineValues();
    const activeRow = timeline.rows[clamp(activeTimelineRow, 0, timeline.rows.length - 1)];
    simulationTime = activeRow.start + clamp01((event.clientX - rect.left) / rect.width) * activeRow.timing.cycle;
    playing = false;
    syncPlayButtons();
  });
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.target.value !== "custom"; resizePreview(); });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.target.value !== "custom"; });

  $("#saveScheme").addEventListener("click", () => {
    const scheme = collectScheme();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
    downloadBlob(new Blob([JSON.stringify(scheme, null, 2)], { type: "application/json" }), "continuation-scheme.json");
    schemeStatus.textContent = "方案已保存到本机，并下载 JSON。";
  });
  $("#importScheme").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { applyScheme(JSON.parse(await file.text()), "方案已导入，文字、图标、位置与编舞已重建。"); schedulePersist(); }
    catch (error) { schemeStatus.textContent = `导入失败：${error.message}`; }
    event.target.value = "";
  });
  $("#restoreScheme").addEventListener("click", async () => {
    try { await loadApprovedDefaultScheme(); }
    catch (error) { console.error(error); }
    applyScheme(defaultScheme(), "已恢复默认示例。");
    schedulePersist();
  });
  $("#clearScheme").addEventListener("click", () => { applyScheme(blankScheme(), "已清空文字和图标，可从空白方案重建。"); schedulePersist(); });

  async function initialize() {
    renderLibrary("flowIconLibrary", flowIconImages);
    renderLibrary("gifMotionLibrary", gifMotionImages);
    renderLibrary("animalIconLibrary", transparentAnimalImages);
    renderLibrary("botIconLibrary", botSeriesImages);
    try { await loadApprovedDefaultScheme(); }
    catch (error) { console.error(error); }
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}
    applyScheme(stored || defaultScheme(), stored ? "已恢复上次自动保存的方案。" : "已载入默认示例。");
    document.fonts?.ready?.then(() => { simulationTime = 0; });
    syncPlayButtons();
    requestAnimationFrame(animate);
  }

  initialize();
})();
