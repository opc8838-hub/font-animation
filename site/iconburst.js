(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stage = $("ibStage");
  const composition = $("ibComposition");
  const word = $("ibWord");
  const introWord = $("ibIntroWord");
  const incomingWord = $("ibIncomingWord");
  const incomingLeft = $("ibIncomingLeft");
  const incomingRight = $("ibIncomingRight");
  const colorWord = $("ibColorWord");
  const whiteWord = $("ibWhiteWord");
  const orbitLayer = $("ibOrbitLayer");
  const glyphLayer = $("ibGlyphLayer");
  const phaseLabel = $("ibPhase");
  const state = {
    playing: true,
    start: performance.now(),
    pausedAt: 0,
    assets: [],
    iconElements: [],
    activeAssetId: null,
    duration: 2400,
    backgroundTimer: 0,
    naturalGap: false,
    letterAnchors: null
  };
  window.ibMotionState = state;

  const seeds = [
    [-.43, -.12, -18], [.39, -.18, 14], [-.28, .34, 22], [.18, .38, -12], [-.06, -.4, 8],
    [.5, .19, 25], [-.52, .22, -25], [.34, .46, 14], [.28, -.02, -8], [-.18, -.04, 20],
    [.6, -.31, 11], [-.61, -.3, -16], [.42, .42, 19], [-.4, .46, -13],
    [.12, -.58, 28], [-.16, .56, -22], [.68, .06, 17], [-.67, .04, -19], [.54, .38, 24], [-.55, -.42, -27]
  ];
  const clusterTargets = [
    [-.040, -.120], [.018, -.142], [.060, -.092], [-.070, -.062],
    [.012, -.066], [.075, -.025], [-.055, -.010], [.030, .015],
    [-.075, .045], [-.015, .064], [.055, .086], [.005, .125],
    [-.052, -.118], [.064, -.087], [-.026, -.082], [.072, -.032],
    [-.038, -.018], [.050, .012], [-.052, .082], [.042, .112]
  ];
  const iconColors = [["#ffcc00", "#ff6b00"], ["#7b61ff", "#28c8ff"], ["#ff4fa3", "#7b61ff"], ["#35d07f", "#00a7ff"], ["#ff5f57", "#ffd60a"]];
  const shapeLabels = { square: "方形", circle: "圆形", ring: "圆环", triangle: "三角形", star: "星形" };
  const iconSvg = (body, background) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`)}`;
  const flowIconImages = [
    { name: "流墙音乐", url: iconSvg('<path d="M44 24v37c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V39l24-7v24c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V19z" fill="white"/>', "#fa264f") },
    { name: "流墙播放", url: iconSvg('<circle cx="50" cy="50" r="34" fill="none" stroke="white" stroke-width="6"/><path d="M41 30 70 50 41 70z" fill="white"/>', "#111111") },
    { name: "流墙云", url: iconSvg('<circle cx="34" cy="56" r="15" fill="white"/><circle cx="51" cy="45" r="22" fill="white"/><circle cx="70" cy="56" r="16" fill="white"/><rect x="19" y="54" width="67" height="21" rx="10" fill="white"/>', "#1389ff") },
    { name: "流墙手表", url: iconSvg('<rect x="28" y="19" width="44" height="62" rx="15" fill="#111"/><rect x="35" y="28" width="30" height="44" rx="9" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8") }
  ];
  const transparentAnimalImages = Array.from({ length: 31 }, (_, index) => ({
    name: `透明动物 ${String(index + 1).padStart(2, "0")}`,
    url: `assets/transparent-animals/animal-${String(index + 1).padStart(2, "0")}.png`
  }));

  function animalAsset(index, role, overrides) {
    const image = transparentAnimalImages[index % transparentAnimalImages.length];
    return defaultAsset(Object.assign({
      id: `${role}-animal-${index}`,
      builtin: true,
      type: "image",
      role,
      name: image.name,
      url: image.url,
      originalDataUrl: image.url,
      fileType: "image/png",
      libraryImage: true,
      removeBackground: false,
      autoBackground: false,
      processedWidth: 768,
      processedHeight: 768,
      status: "内置高清透明 PNG；可独立缩放、移动、旋转或替换。"
    }, overrides || {}));
  }

  function flowIconAsset(index, role, overrides) {
    const image = flowIconImages[index % flowIconImages.length];
    return defaultAsset(Object.assign({
      id: `${role}-flow-icon-${index}`,
      builtin: true,
      type: "image",
      role,
      name: image.name,
      url: image.url,
      originalDataUrl: image.url,
      fileType: "image/svg+xml",
      libraryImage: true,
      removeBackground: false,
      autoBackground: false,
      status: "沿用流墙的内置图标；可独立缩放、移动、旋转或替换。"
    }, overrides || {}));
  }
  const fontMap = {
    archivoBlack: "IBArchivoBlack", robotoCondensed: "IBRobotoCondensed", space: "IBSpace", work: "IBWork", serif: "IBLora", mono: "IBMono",
    scRegular: "IBSCRegular", scBlack: "IBSCBlack", fenix: "IBFenix", spaceMonoBold: "IBSpaceMonoBold",
    vollkornBoldItalic: "IBVollkornBoldItalic", cairoBold: "IBCairoBold", aguafina: "IBAguafina",
    manrope: "IBManrope", spartan: "IBSpartan", cinzel: "IBCinzel",
    instrument: "IBInstrument", bebas: "IBBebas", poppins: "IBPoppins",
    rajdhani: "IBRajdhani", teko: "IBTeko", khand: "IBKhand", fraunces: "IBFraunces",
    scThin: "IBSCThin", jpThin: "IBJPThin", jpBlack: "IBJPBlack", krBlack: "IBKRBlack"
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function easeOut(value) { return 1 - Math.pow(1 - clamp(value, 0, 1), 3); }
  function easeOutExpo(value) {
    const t = clamp(value, 0, 1);
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  function easeIn(value) { return Math.pow(clamp(value, 0, 1), 3); }
  function easeInOut(value) {
    const t = clamp(value, 0, 1);
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function createMonotoneSampler(keyframes) {
    const slopes = keyframes.slice(0, -1).map((point, index) => (keyframes[index + 1][1] - point[1]) / (keyframes[index + 1][0] - point[0]));
    const tangents = keyframes.map((point, index) => {
      if (index === 0) return slopes[0];
      if (index === keyframes.length - 1) return slopes[slopes.length - 1];
      const before = slopes[index - 1], after = slopes[index];
      if (before * after <= 0) return 0;
      const beforeWidth = keyframes[index][0] - keyframes[index - 1][0];
      const afterWidth = keyframes[index + 1][0] - keyframes[index][0];
      return (beforeWidth + afterWidth) / (beforeWidth / before + afterWidth / after);
    });
    return (time) => {
      if (time <= keyframes[0][0]) return keyframes[0][1];
      if (time >= keyframes[keyframes.length - 1][0]) return keyframes[keyframes.length - 1][1];
      let index = 0;
      while (index < keyframes.length - 2 && time > keyframes[index + 1][0]) index += 1;
      const [x0, y0] = keyframes[index], [x1, y1] = keyframes[index + 1];
      const width = x1 - x0;
      const t = clamp((time - x0) / width, 0, 1);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y0
        + (t3 - 2 * t2 + t) * width * tangents[index]
        + (-2 * t3 + 3 * t2) * y1
        + (t3 - t2) * width * tangents[index + 1];
    };
  }
  // One continuous motion clock for the opening. It accelerates into the
  // cluster, then keeps a small amount of forward travel during the long
  // slow-motion beat. The value never becomes flat before the final collapse.
  const sampleIconGather = createMonotoneSampler([
    [0, 0], [.12, .04], [.20, .09], [.36, .35], [.45, .52], [.57, .70],
    [.68, .82], [.75, .88], [.80, .90], [1.10, .94], [1.35, .955], [1.53, .966]
  ]);
  // Positional orbit for the whole icon—not rotation of the icon card. Keep
  // this base sweep strictly monotonic; the former sine rebound briefly
  // reversed direction near the slow-motion cut and looked like a dropped
  // frame followed by a restart.
  function sampleOrbitalSweep(progress) {
    // Progress may exceed 1 during the slow-motion orbit. Radius and pitch
    // settle at 1, while longitude keeps advancing on the same path.
    const p = Math.max(0, progress);
    const mainSweep = 132 * (.72 * p + .28 * easeOut(clamp(p, 0, 1)));
    // Around the centre the projected radius is smaller, so the same angular
    // progress produced less than .2px of visible travel per 60Hz frame. Add
    // smoothly increasing arc density on this exact path—no second animation
    // and no state switch—so slow motion remains visibly alive.
    const centreDistance = Math.max(0, p - .55);
    const centreArcBoost = 82 * (centreDistance - .10 * (1 - Math.exp(-centreDistance / .10)));
    return (mainSweep + centreArcBoost) * Math.PI / 180;
  }
  function smoothstep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function cubicPoint(start, controlA, controlB, end, t) {
    const inverse = 1 - t;
    return inverse * inverse * inverse * start
      + 3 * inverse * inverse * t * controlA
      + 3 * inverse * t * t * controlB
      + t * t * t * end;
  }
  function spring(value) { return clamp(1 - Math.exp(-7 * clamp(value, 0, 1)) * Math.cos(10.5 * value), 0, 1.06); }
  function safe(value) { return String(value || "").replace(/[<>&"]/g, ""); }
  function hexToRgb(color) {
    if (String(color).startsWith("rgb")) {
      const channels = String(color).match(/[\d.]+/g);
      return channels ? channels.slice(0, 3).map(Number) : [0, 0, 0];
    }
    const hex = String(color).replace("#", "");
    const expanded = hex.length === 3 ? hex.split("").map((character) => character + character).join("") : hex;
    const value = parseInt(expanded, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  function rgbToHex(rgb) {
    return "#" + rgb.map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("");
  }
  function mixHex(from, to, amount) {
    const a = hexToRgb(from), b = hexToRgb(to), t = clamp(amount, 0, 1);
    return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * t)).join(",")})`;
  }
  function palette() { return [$("ibBaseColor").value, $("ibColorA").value, $("ibColorC").value, $("ibColorB").value, $("ibColorD").value]; }
  function samplePalette(progress) {
    const colors = palette();
    const scaled = clamp(progress, 0, .9999) * (colors.length - 1);
    const index = Math.floor(scaled);
    return mixHex(colors[index], colors[index + 1], scaled - index);
  }

  function defaultAsset(overrides) {
    return Object.assign({
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "shape",
      role: "orbit",
      name: "内置图形",
      shape: "square",
      color: "#ffcc00",
      color2: "#ff6b00",
      size: 1,
      opacity: 1,
      x: 0,
      y: 0,
      rotation: 0,
      motion: "replace",
      target: -1,
      sequence: 0,
      replaceSpeed: 1,
      holdMs: 160,
      url: "",
      originalDataUrl: "",
      originalImage: null,
      fileType: "",
      removeBackground: true,
      autoBackground: true,
      backgroundColor: "#ffffff",
      tolerance: 32,
      feather: 4,
      processedWidth: 0,
      processedHeight: 0,
      processing: false,
      status: ""
    }, overrides || {});
  }

  function builtinAssets() {
    // Twelve readable defaults are enough to establish the cloud without
    // turning every frame into visual noise. Users can still add any number.
    const names = ["方形", "圆环", "星形", "能量圆"];
    const shapes = ["square", "circle", "ring", "star", "square", "circle", "ring", "star", "square", "circle", "ring", "star"];
    const orbitAssets = names.map((name, index) => defaultAsset({
      id: `builtin-${index}`,
      builtin: true,
      role: "orbit",
      name: `内置${name}`,
      shape: shapes[index],
      color: iconColors[index % iconColors.length][0],
      color2: iconColors[index % iconColors.length][1],
      size: .82 + (index % 3) * .1,
      rotation: index % 2 ? 12 : -8
    }));
    orbitAssets.splice(2, 0,
      animalAsset(0, "orbit", { size: .88, rotation: -7 }),
      flowIconAsset(0, "orbit", { size: .9, rotation: 5 }),
      animalAsset(7, "orbit", { size: .82, rotation: 8 }),
      flowIconAsset(1, "orbit", { size: .84, rotation: -4 }),
      animalAsset(14, "orbit", { size: .92, rotation: -5 }),
      flowIconAsset(2, "orbit", { size: .91, rotation: 7 }),
      animalAsset(22, "orbit", { size: .86, rotation: 6 }),
      flowIconAsset(3, "orbit", { size: .83, rotation: -6 })
    );
    const defaultGlyphTargets = [1, 3, 5, 7];
    const defaultGlyphSpeeds = [1, .75, 1.5, 1.8];
    const glyphAssets = ["圆形", "星形", "方形", "圆环"].map((name, index) => defaultAsset({
      id: `glyph-${index}`,
      builtin: true,
      role: "glyph",
      name: `替字${name}`,
      shape: ["circle", "star", "square", "ring"][index],
      color: iconColors[(index + 1) % iconColors.length][0],
      color2: iconColors[(index + 1) % iconColors.length][1],
      size: .9 + index * .06,
      motion: "replace",
      target: defaultGlyphTargets[index],
      sequence: index,
      replaceSpeed: defaultGlyphSpeeds[index]
    }));
    glyphAssets.splice(1, 1, animalAsset(4, "glyph", {
      id: "glyph-animal-default",
      size: .96,
      target: defaultGlyphTargets[1],
      sequence: 1,
      replaceSpeed: defaultGlyphSpeeds[1]
    }));
    return orbitAssets.concat(glyphAssets);
  }

  function activeAsset() { return state.assets.find((asset) => asset.id === state.activeAssetId) || null; }
  function contentMode() { return $("ibContentMode").value; }
  function replacementEnabled() { return contentMode() === "replace-one" || contentMode() === "replace-multi"; }
  function shapeMarkup(asset) {
    return `<span class="ib-geom ${asset.shape || "square"}" style="--c1:${asset.color};--c2:${asset.color2 || asset.color}"></span>`;
  }
  function assetPreview(asset) {
    if (asset.type === "image") return asset.url ? `<img src="${asset.url}" alt="">` : '<span class="ib-image-empty">＋</span>';
    return shapeMarkup(asset);
  }

  function renderImageLibraries() {
    const markup = transparentAnimalImages.map((image, index) => `<button type="button" data-image-index="${index}" title="添加${image.name}"><img src="${image.url}" alt="${image.name}" loading="lazy"><span>${String(index + 1).padStart(2, "0")}</span></button>`).join("");
    $("ibOrbitImageLibrary").innerHTML = markup;
    $("ibGlyphImageLibrary").innerHTML = markup;
  }

  function renderIcons() {
    orbitLayer.innerHTML = "";
    glyphLayer.innerHTML = "";
    state.iconElements = [];
    state.assets.forEach((asset, index) => {
      const element = document.createElement("div");
      element.className = "ib-icon";
      element.dataset.index = index;
      element.dataset.assetId = asset.id;
      if (asset.type === "image" && asset.url) {
        const image = document.createElement("img");
        image.src = asset.url;
        image.alt = "";
        element.append(image);
      } else if (asset.type === "shape") {
        element.innerHTML = shapeMarkup(asset);
      }
      (asset.role === "glyph" ? glyphLayer : orbitLayer).append(element);
      state.iconElements.push(element);
    });
  }

  function renderAssets() {
    function assetRows(assets) {
      if (!assets.length) return '<p class="ib-asset-empty">还没有内容，可从上方直接添加。</p>';
      return assets.map((asset) => {
      const dimensions = asset.processedWidth ? ` · ${asset.processedWidth}×${asset.processedHeight}` : "";
      const purpose = asset.role === "glyph" ? (asset.target < 0 ? "自动换字" : `替换第 ${asset.target + 1} 字`) : "开场环绕";
      const quickTarget = asset.role === "glyph"
        ? `<span class="ib-glyph-routing"><label class="ib-quick-target">替换字位<select data-action="quick-target" aria-label="${safe(asset.name)}替换字位">${targetOptions(asset)}</select></label><label class="ib-quick-target">播放顺序<select data-action="quick-order" aria-label="${safe(asset.name)}播放顺序">${sequenceOptions(asset, assets.length)}</select></label><label class="ib-quick-target">单项速度<select data-action="quick-speed" aria-label="${safe(asset.name)}单项速度">${speedOptions(asset)}</select></label><label class="ib-quick-target ib-quick-hold">图标停留<select data-action="quick-hold" aria-label="${safe(asset.name)}停留时间">${holdOptions(asset)}</select></label></span>`
        : "";
      const sourceLabel = asset.type === "shape" ? "内置图形" : asset.libraryImage ? "内置透明图片" : "上传图片";
      return `<div class="ib-asset${asset.id === state.activeAssetId ? " is-active" : ""}" data-id="${asset.id}">
        <span class="ib-asset-preview">${assetPreview(asset)}</span>
        <span class="ib-asset-copy"><strong>${safe(asset.name)}</strong><small>${sourceLabel}${dimensions} · ${Math.round(asset.size * 100)}% · ${purpose}${asset.role === "glyph" ? ` · 顺序 ${Number(asset.sequence) + 1} · ${Number(asset.replaceSpeed).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}× · 停留 ${Number(asset.holdMs || 160)}ms` : ""}</small>${quickTarget}</span>
        <span class="ib-asset-actions"><button type="button" data-action="edit">${asset.id === state.activeAssetId ? "正在编辑" : "单独编辑"}</button><button class="ib-remove" type="button" data-action="remove" aria-label="删除">×</button></span>
      </div>`;
      }).join("");
    }
    const orbitAssets = state.assets.filter((asset) => asset.role !== "glyph");
    const glyphAssets = state.assets.filter((asset) => asset.role === "glyph").sort((a, b) => Number(a.sequence) - Number(b.sequence));
    $("ibOrbitItems").innerHTML = assetRows(orbitAssets);
    $("ibGlyphItems").innerHTML = assetRows(glyphAssets);
    $("ibOrbitCount").textContent = String(orbitAssets.length);
    $("ibGlyphCount").textContent = String(glyphAssets.length);
    renderAssetEditor();
  }

  function selectAsset(assetId) {
    if (!state.assets.some((asset) => asset.id === assetId)) return;
    state.activeAssetId = assetId;
    renderAssets();
  }

  function targetOptions(asset) {
    const letters = Array.from($("ibText").value || "GOOD JOB");
    return ['<option value="-1">自动轮换</option>'].concat(letters.map((character, index) =>
      `<option value="${index}"${/\s/.test(character) ? " disabled" : ""}${asset.target === index ? " selected" : ""}>${index + 1} · ${/\s/.test(character) ? "空格（不可替换）" : safe(character)}</option>`
    )).join("");
  }

  function sequenceOptions(asset, count) {
    return Array.from({ length: count }, (_, index) => `<option value="${index}"${Number(asset.sequence) === index ? " selected" : ""}>第 ${index + 1} 个播放</option>`).join("");
  }

  function speedOptions(asset) {
    const speeds = [.5, .75, 1, 1.25, 1.5, 1.8, 2];
    return speeds.map((speed) => `<option value="${speed}"${Number(asset.replaceSpeed) === speed ? " selected" : ""}>${speed}×</option>`).join("");
  }

  function holdOptions(asset) {
    const durations = [40, 80, 120, 160, 240, 400, 600, 1000];
    return durations.map((duration) => `<option value="${duration}"${Number(asset.holdMs || 160) === duration ? " selected" : ""}>${duration < 1000 ? `${duration} ms` : "1.0 秒"}</option>`).join("");
  }

  function normalizeGlyphSequence() {
    state.assets.filter((asset) => asset.role === "glyph").sort((a, b) => Number(a.sequence) - Number(b.sequence)).forEach((asset, index) => { asset.sequence = index; });
  }

  function renderAssetEditor() {
    const editor = $("ibAssetEditor");
    const asset = activeAsset();
    $("ibOrbitPanel").classList.toggle("is-editing", Boolean(asset && asset.role !== "glyph"));
    $("ibGlyphPanel").classList.toggle("is-editing", Boolean(asset && asset.role === "glyph"));
    editor.hidden = !asset;
    if (!asset) return;
    $(asset.role === "glyph" ? "ibGlyphEditorSlot" : "ibOrbitEditorSlot").append(editor);
    $("ibActiveAsset").textContent = `${asset.role === "glyph" ? "字体图标" : "环绕图标"} · ${asset.name}`;
    $("ibAssetSource").value = asset.type;
    $("ibAssetShapeFields").hidden = asset.type !== "shape";
    $("ibAssetImageFields").hidden = asset.type !== "image";
    $("ibAssetShape").value = asset.shape || "square";
    $("ibAssetColor").value = asset.color || "#ffcc00";
    $("ibAssetTarget").innerHTML = targetOptions(asset);
    $("ibAssetTarget").value = String(asset.target);
    $("ibAssetHoldField").hidden = asset.role !== "glyph";
    $("ibAssetHold").value = String(asset.holdMs || 160);
    $("ibAssetSize").value = String(Math.round(asset.size * 100));
    $("ibAssetOpacity").value = String(Math.round(asset.opacity * 100));
    $("ibAssetX").value = String(asset.x);
    $("ibAssetY").value = String(asset.y);
    $("ibAssetRotation").value = String(asset.rotation);
    $("ibAssetMotion").value = asset.motion;
    $("ibRemoveBackground").checked = asset.removeBackground;
    $("ibAutoBackground").checked = asset.autoBackground;
    $("ibBackgroundColor").value = asset.backgroundColor;
    $("ibTolerance").value = String(asset.tolerance);
    $("ibFeather").value = String(asset.feather);
    $("ibToleranceValue").textContent = String(asset.tolerance);
    $("ibFeatherValue").textContent = String(asset.feather);
    $("ibProcessStatus").textContent = asset.status || (asset.originalDataUrl ? "已保留高清原图，可重新调整抠图参数。" : "选择文件后，只会替换当前这一项。");
    $("ibAssetTargetField").hidden = !replacementEnabled() || asset.role !== "glyph";
    updateAssetReadouts(asset);
  }

  function updateContentModeUI() {
    const mode = contentMode();
    const hints = {
      text: "环绕图标从首帧沿弧线转向聚拢；字体始终保持水平，图标消失后文字闭合并继续换色。",
      "replace-one": "环绕与字体换面完成后，每个节拍只让一个文字位置切换成字体图标或图片。",
      "replace-multi": "环绕与字体换面完成后，多个文字位置可由不同字体图标或图片分别接管。"
    };
    const glyphMode = replacementEnabled();
    // Editing the post-color glyph layer remains available in every content
    // mode. The mode controls playback only; it must not hide prepared assets.
    $("ibGlyphTools").hidden = false;
    $("ibGlyphModeMessage").hidden = glyphMode;
    $("ibReplacementTiming").hidden = !replacementEnabled();
    $("ibMotionTiming").hidden = false;
    $("ibReplaceCountField").hidden = mode !== "replace-multi";
    const asset = activeAsset();
    $("ibAssetTargetField").hidden = !replacementEnabled() || !asset || asset.role !== "glyph";
    $("ibContentModeHint").textContent = hints[mode];
    renderAssets();
  }

  function updateAssetReadouts(asset) {
    $("ibAssetSizeValue").textContent = `${Math.round(asset.size * 100)}%`;
    $("ibAssetOpacityValue").textContent = `${Math.round(asset.opacity * 100)}%`;
    $("ibAssetXValue").textContent = `${asset.x}%`;
    $("ibAssetYValue").textContent = `${asset.y}%`;
    $("ibAssetRotationValue").textContent = `${asset.rotation}°`;
    $("ibAssetHoldValue").textContent = `${Number(asset.holdMs || 160)} ms`;
  }

  function updateTypography() {
    invalidateLetterAnchors();
    const family = fontMap[$("ibFont").value] || "IBSpace";
    const base = clamp(stage.clientWidth * .09, 52, 154);
    [word, introWord, incomingWord, colorWord, whiteWord].forEach((element) => {
      element.style.fontFamily = family;
      element.style.fontWeight = $("ibWeight").value;
      element.style.fontSize = `${base * Number($("ibFontSize").value) / 100}px`;
      element.style.letterSpacing = `${Number($("ibTracking").value)}px`;
      element.style.setProperty("--base", $("ibBaseColor").value);
      element.style.setProperty("--color-a", $("ibColorA").value);
      element.style.setProperty("--color-b", $("ibColorB").value);
      element.style.setProperty("--color-c", $("ibColorC").value);
      element.style.setProperty("--color-d", $("ibColorD").value);
    });
    const overlayLetters = Array.from(colorWord.children).filter((letter) => letter.textContent.trim());
    const overlayColors = [$("ibColorA").value, $("ibColorC").value, $("ibColorB").value, $("ibColorD").value];
    overlayLetters.forEach((letter, index) => {
      const progress = overlayLetters.length > 1 ? index / (overlayLetters.length - 1) : 0;
      const scaled = Math.min(.9999, progress) * (overlayColors.length - 1);
      const colorIndex = Math.floor(scaled);
      letter.style.setProperty("--overlay-color", mixHex(overlayColors[colorIndex], overlayColors[colorIndex + 1], scaled - colorIndex));
    });
    stage.style.setProperty("--stage-bg", $("ibBackground").value);
  }

  function updateWord() {
    const text = $("ibText").value || "GOOD JOB";
    word.innerHTML = "";
    const characters = Array.from(text);
    const middle = (characters.length - 1) / 2;
    let gapIndex = -1;
    characters.forEach((character, index) => {
      if (/\s/.test(character) && (gapIndex < 0 || Math.abs(index - middle) < Math.abs(gapIndex - middle))) gapIndex = index;
    });
    state.naturalGap = gapIndex >= 0;
    if (gapIndex < 0) gapIndex = Math.max(0, Math.floor((characters.length - 1) / 2));
    introWord.textContent = text;
    if (state.naturalGap) {
      incomingLeft.textContent = "";
      incomingRight.textContent = "";
      Array.from(characters.slice(0, gapIndex).join("").trimEnd()).forEach((character, index) => {
        const span = document.createElement("span");
        span.className = "ib-incoming-letter";
        span.textContent = character;
        span.dataset.rank = String(Math.max(0, gapIndex - 1 - index));
        incomingLeft.append(span);
      });
      Array.from(characters.slice(gapIndex + 1).join("").trimStart()).forEach((character, index) => {
        const span = document.createElement("span");
        span.className = "ib-incoming-letter";
        span.textContent = character;
        span.dataset.rank = String(index);
        incomingRight.append(span);
      });
    } else {
      incomingLeft.textContent = "";
      incomingRight.textContent = "";
      characters.slice(0, gapIndex + 1).forEach((character, index, sideCharacters) => {
        const span = document.createElement("span");
        span.className = "ib-incoming-letter";
        span.textContent = character;
        span.dataset.rank = String(sideCharacters.length - 1 - index);
        incomingLeft.append(span);
      });
      characters.slice(gapIndex + 1).forEach((character, index) => {
        const span = document.createElement("span");
        span.className = "ib-incoming-letter";
        span.textContent = character;
        span.dataset.rank = String(index);
        incomingRight.append(span);
      });
    }
    characters.forEach((character, index) => {
      const span = document.createElement("span");
      span.textContent = character === " " ? "\u00a0" : character;
      span.dataset.letter = index;
      if (state.naturalGap && index === gapIndex) span.classList.add("ib-word-gap");
      if (!state.naturalGap && index === gapIndex) span.classList.add("ib-gap-anchor");
      word.append(span);
    });
    colorWord.innerHTML = word.innerHTML;
    whiteWord.innerHTML = word.innerHTML;
    state.assets.forEach((asset) => { if (asset.target >= word.children.length) asset.target = -1; });
    updateTypography();
    renderAssets();
  }

  function resetLetters() {
    const baseColor = $("ibBaseColor").value;
    Array.from(word.children).forEach((letter) => {
      letter.style.setProperty("--letter-color", baseColor);
      letter.style.setProperty("--replace-alpha", "1");
    });
  }

  function invalidateLetterAnchors() {
    state.letterAnchors = null;
  }

  function getLetterAnchors() {
    if (state.letterAnchors && state.letterAnchors.length === word.children.length) return state.letterAnchors;
    const compositionRect = composition.getBoundingClientRect();
    state.letterAnchors = Array.from(word.children).map((letter) => {
      const rect = letter.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - (compositionRect.left + compositionRect.width / 2),
        y: rect.top + rect.height / 2 - (compositionRect.top + compositionRect.height / 2)
      };
    });
    return state.letterAnchors;
  }

  function lightLetter(letter, color, intensity) {
    const level = clamp(intensity, 0, 1);
    letter.style.setProperty("--letter-color", mixHex($("ibBaseColor").value, color, level));
  }

  function animateColor(contentTime, oneShot) {
    const mode = $("ibColorMode").value;
    const letters = Array.from(word.children);
    if (!letters.length) return "等待文字";
    const speed = Number($("ibColorSpeed").value);
    const hold = Number($("ibSoftness").value) / 100;
    const time = Math.max(0, contentTime * speed);
    const colors = palette();
    if (mode === "flash") {
      const cycle = 560 + hold * 420;
      const local = oneShot ? time : time % cycle;
      const intensity = local < cycle * .62 ? 1 : 0;
      letters.forEach((letter, index) => lightLetter(letter, colors[1 + index % 4], intensity));
      return "全体瞬时换色";
    }
    if (mode === "chase" || mode === "relay") {
      const stagger = mode === "chase" ? 32 : 22;
      const cycle = Math.max(470, letters.length * stagger + 260 + hold * 260);
      const local = oneShot ? time : time % cycle;
      letters.forEach((letter, index) => {
        const letterTime = local - index * stagger;
        const intensity = letterTime >= 0 && letterTime < 210 + hold * 180 ? 1 : 0;
        lightLetter(letter, colors[1 + index % 4], intensity);
      });
      return mode === "chase" ? "逐字瞬时换色" : "逐字高速接力换色";
    }
    if (mode === "unfold") {
      const center = (letters.length - 1) / 2;
      const stagger = 30;
      const cycle = Math.max(470, center * stagger + 350 + hold * 220);
      const local = oneShot ? time : time % cycle;
      letters.forEach((letter, index) => {
        const distance = Math.abs(index - center);
        const letterTime = local - distance * stagger;
        const intensity = letterTime >= 0 && letterTime < 220 + hold * 160 ? 1 : 0;
        lightLetter(letter, colors[1 + index % 4], intensity);
      });
      return "从中心向两侧瞬时换色";
    }
    if (mode === "sweep") {
      const cycle = 640 + hold * 260;
      const head = clamp((oneShot ? time : time % cycle) / cycle, 0, 1) * 1.45 - .2;
      letters.forEach((letter, index) => {
        const position = index / Math.max(1, letters.length - 1);
        const intensity = clamp((head - position + .12) / .12, 0, 1);
        lightLetter(letter, samplePalette(clamp(position, 0, 1)), intensity);
      });
      return "高速字面扫色";
    }
    if (mode === "aurora") {
      const progress = oneShot ? clamp(time / 720, 0, 1) : (time % 720) / 720;
      letters.forEach((letter, index) => {
        const local = (progress + index / Math.max(1, letters.length) * .54) % 1;
        lightLetter(letter, samplePalette(local), 1);
      });
      return "高速流体换色";
    }
    if (mode === "pulse") {
      const on = oneShot ? true : (time % 520) < 280;
      letters.forEach((letter, index) => lightLetter(letter, colors[1 + index % 4], on ? 1 : 0));
      return "整体颜色闪切";
    }
    if (mode === "cut") {
      const beat = Math.floor(time / 150);
      letters.forEach((letter, index) => lightLetter(letter, colors[1 + (beat + index) % 4], 1));
      return "高速节拍硬切";
    }
    return "保持初始色";
  }

  function glyphPlaybackConfig() {
    const glyphAssets = state.assets.filter((asset) => asset.role === "glyph").sort((a, b) => Number(a.sequence) - Number(b.sequence));
    const requestedCount = $("ibReplaceCount").value === "all" ? glyphAssets.length : Number($("ibReplaceCount").value);
    const count = contentMode() === "replace-one" ? 1 : Math.min(Math.max(1, requestedCount), Math.max(1, glyphAssets.length));
    const globalSpeed = Number($("ibReplaceSpeed").value);
    const minimumGroupMs = Number($("ibBeat").value);
    const groups = [];
    for (let start = 0; start < glyphAssets.length; start += count) {
      const assets = glyphAssets.slice(start, start + count);
      const timings = assets.map((asset) => {
        const speed = clamp(globalSpeed * Number(asset.replaceSpeed || 1), .5, 16);
        const transitionMs = clamp(120 / speed, 18, 180);
        const holdMs = clamp(Number(asset.holdMs || 160), 40, 1200);
        return { asset, transitionMs, holdMs, duration: transitionMs * 2 + holdMs };
      });
      groups.push({ timings, duration: Math.max(minimumGroupMs, ...timings.map((timing) => timing.duration)) });
    }
    return { groups, total: groups.reduce((sum, group) => sum + group.duration, 0) };
  }

  function timelineMarkers() {
    const wordsEnterStart = .39;
    const wordReturnDuration = clamp(Number($("ibWordReturn").value) / 1000, .08, 1.20);
    // A longer font return extends the shared opening chapter. Later chapters
    // are derived from this marker, so slow motion, color and replacements can
    // never begin while the side words are still arriving.
    const settleEnd = Math.max(.75, wordsEnterStart + wordReturnDuration);
    const slowDuration = clamp(Number($("ibHang").value) / 100, .20, 1.40);
    const holdEndSeconds = settleEnd + slowDuration;
    const collapseStartSeconds = holdEndSeconds;
    const iconsGoneSeconds = collapseStartSeconds + .20;
    // Give the outer-to-inner letter cascade enough time to read as individual
    // letters while keeping the whole title contact fast.
    const contactSeconds = iconsGoneSeconds + .16;
    const lettersMoveStart = contactSeconds;
    const colorSpeed = clamp(Number($("ibColorSpeed").value), .5, 6);
    const colorHold = clamp(Number($("ibSoftness").value), 8, 70);
    const colorDuration = clamp(.11 * (5 / colorSpeed), .085, .55);
    const colorHoldDuration = clamp(.02 + (colorHold - 28) / 42 * .16, .01, .18);
    const whiteDuration = clamp(.08 * (5 / colorSpeed), .06, .40);
    const colorFullSeconds = lettersMoveStart + colorDuration;
    const whiteStartSeconds = colorFullSeconds + colorHoldDuration;
    const whiteFullSeconds = whiteStartSeconds + whiteDuration;
    const replaceStartSeconds = whiteFullSeconds + .04;
    return {
      settleEnd,
      wordsEnterStart,
      wordReturnDuration,
      holdEndSeconds,
      collapseStartSeconds,
      iconsGoneSeconds,
      contactSeconds,
      lettersMoveStart,
      colorFullSeconds,
      whiteStartSeconds,
      whiteFullSeconds,
      replaceStartSeconds
    };
  }

  function animationDuration(playback) {
    const { replaceStartSeconds } = timelineMarkers();
    if (!replacementEnabled()) return Math.max(2400, (replaceStartSeconds + .30) * 1000);
    const scaleDuration = clamp(Number($("ibFinalScaleDuration").value), 200, 1200);
    const replacementDuration = Math.max(playback.total, scaleDuration + 100);
    return Math.max(2400, replaceStartSeconds * 1000 + replacementDuration + 60);
  }

  function replacementState(contentTime, enabled, playback) {
    const letters = Array.from(word.children);
    if (!enabled || !replacementEnabled() || !playback.groups.length || !letters.length) return new Map();
    let groupIndex = 0;
    let groupStartTime = 0;
    for (let index = 0; index < playback.groups.length; index += 1) {
      const groupEnd = groupStartTime + playback.groups[index].duration;
      if (contentTime < groupEnd || index === playback.groups.length - 1) {
        groupIndex = index;
        break;
      }
      groupStartTime = groupEnd;
    }
    const group = playback.groups[groupIndex];
    const groupTime = Math.max(0, contentTime - groupStartTime);
    const usableTargets = letters.map((letter, index) => ({ letter, index })).filter((item) => item.letter.textContent.trim());
    const replacements = new Map();
    const used = new Set();
    group.timings.forEach((timing, offset) => {
      const { asset, transitionMs, holdMs } = timing;
      const enter = easeOut(clamp(groupTime / transitionMs, 0, 1));
      const exit = easeInOut(clamp((groupTime - transitionMs - holdMs) / transitionMs, 0, 1));
      const envelope = clamp(enter * (1 - exit), 0, 1);
      let target = asset.target;
      if (target < 0 || !letters[target] || !letters[target].textContent.trim()) {
        const candidate = usableTargets[(groupIndex * group.timings.length + offset) % Math.max(1, usableTargets.length)];
        target = candidate ? candidate.index : 0;
      }
      if (asset.target < 0) {
        while (used.has(target) && usableTargets.length > used.size) target = (target + 1) % letters.length;
      }
      used.add(target);
      // Use a true matched cut: the source glyph and its replacement are
      // mutually exclusive, so an icon can never sit on top of a live letter.
      const swap = envelope >= .5;
      replacements.set(asset.id, { target, envelope, swap });
      const letter = letters[target];
      if (letter) {
        letter.style.setProperty("--replace-alpha", swap ? "0" : "1");
        letter.style.setProperty("--replace-scale", "1");
      }
    });
    return replacements;
  }

  function masterTimeline(phase, durationSeconds, replacementDurationMs) {
    const seconds = phase * durationSeconds;
    const at = (value) => value / durationSeconds;
    const markers = timelineMarkers();
    const cutStart = 0;
    const iconMoveStart = 0;
    // Keep the center title readable long enough to establish the opening shot.
    // The former .09s shrink yielded fewer than three useful frames at 30fps,
    // so viewers perceived the side words as the actual beginning.
    const shrinkStartSeconds = .20;
    const {
      settleEnd,
      wordsEnterStart,
      wordReturnDuration,
      holdEndSeconds,
      collapseStartSeconds,
      iconsGoneSeconds,
      contactSeconds,
      lettersMoveStart,
      colorFullSeconds,
      whiteStartSeconds,
      whiteFullSeconds,
      replaceStartSeconds
    } = markers;
    const replaceEndSeconds = replacementEnabled() ? replaceStartSeconds + replacementDurationMs / 1000 : 2.37;

    // One physical position drives the opening icons and the two text faces.
    // By the frame where the center title disappears, the icons have completed
    // roughly three quarters of their gather instead of lagging behind it.
    const slowDuration = Math.max(.001, holdEndSeconds - settleEnd);
    const slowT = seconds < settleEnd
      ? 0
      : clamp((seconds - settleEnd) / slowDuration, 0, 1);
    const slowMultiplier = clamp(Number($("ibDrift").value) / 100, .15, .60);
    const overshootStrength = clamp(Number($("ibOvershoot").value) / 100, 0, 1);
    const gatherAtSlowStart = sampleIconGather(settleEnd);
    const slowElapsed = clamp(seconds - settleEnd, 0, holdEndSeconds - settleEnd);
    const velocityWindow = .008;
    const gatherBeforeSlow = sampleIconGather(settleEnd - velocityWindow);
    const entryGatherVelocity = Math.max(.01, (gatherAtSlowStart - gatherBeforeSlow) / velocityWindow);
    const slowGatherVelocity = entryGatherVelocity * slowMultiplier;
    // One integrated motion clock drives radius, longitude, depth and pitch.
    // During a short ramp its speed moves continuously from 1x toward the user
    // selected multiplier; it never swaps to a second geometric state.
    const slowRampDuration = Math.min(.14, slowDuration * .35);
    function integratedSlowDistance(elapsed) {
      const t = clamp(elapsed, 0, slowDuration);
      if (t <= slowRampDuration) {
        const x = t / Math.max(.001, slowRampDuration);
        const smoothIntegral = x * x * x - .5 * x * x * x * x;
        return entryGatherVelocity * (t + (slowMultiplier - 1) * slowRampDuration * smoothIntegral);
      }
      const rampDistance = entryGatherVelocity * slowRampDuration * (1 + slowMultiplier) / 2;
      return rampDistance + slowGatherVelocity * (t - slowRampDuration);
    }
    const slowGatherAdvance = integratedSlowDistance(slowElapsed);
    const gatherAtSlowEnd = gatherAtSlowStart + integratedSlowDistance(slowDuration);
    const collapseT = clamp((seconds - collapseStartSeconds) / Math.max(.001, iconsGoneSeconds - collapseStartSeconds), 0, 1);
    const collapseDuration = Math.max(.001, iconsGoneSeconds - collapseStartSeconds);
    const collapseElapsed = clamp(seconds - collapseStartSeconds, 0, iconsGoneSeconds - collapseStartSeconds);
    const exitVelocity = entryGatherVelocity * (1.05 + 2.70 * overshootStrength);
    const accelerationIntegral = Math.pow(collapseT, 3) - .5 * Math.pow(collapseT, 4);
    const collapseAdvance = slowGatherVelocity * collapseElapsed
      + (exitVelocity - slowGatherVelocity) * collapseDuration * accelerationIntegral;
    const iconGather = seconds <= settleEnd
      ? sampleIconGather(seconds)
      : gatherAtSlowStart + slowGatherAdvance + collapseAdvance;
    const orbitAngleDegrees = sampleOrbitalSweep(iconGather) * 180 / Math.PI;
    const orbitStartDegrees = sampleOrbitalSweep(gatherAtSlowStart) * 180 / Math.PI;
    const slowOrbitDegrees = sampleOrbitalSweep(gatherAtSlowEnd) * 180 / Math.PI - orbitStartDegrees;
    const orbitOvershootDegrees = sampleOrbitalSweep(iconGather) * 180 / Math.PI
      - sampleOrbitalSweep(gatherAtSlowStart + slowGatherAdvance) * 180 / Math.PI;
    const acceleratedOrbitDegrees = orbitOvershootDegrees;
    const orbitCarryDegrees = orbitAngleDegrees - orbitStartDegrees;
    const openingSync = clamp((iconGather - .12) / .62, 0, 1);
    const leadInProgress = clamp(seconds / shrinkStartSeconds, 0, 1);
    const introScale = (1 - .04 * leadInProgress) * (1 - .97 * openingSync);
    // In the slowed reference this lasts roughly .4s; played at normal speed
    // it is a ~140ms two-sided snap. Strong deceleration keeps the arrival fast
    // without producing a hard positional cut.
    const incomingEntry = easeOutExpo(clamp((seconds - wordsEnterStart) / wordReturnDuration, 0, 1));
    const incomingReveal = incomingEntry > .02 ? 1 : 0;
    const incomingYaw = 0;
    const incomingOrbit = incomingEntry;
    const gapClose = seconds < iconsGoneSeconds
      ? 0
      : easeInOut(clamp((seconds - iconsGoneSeconds) / (contactSeconds - iconsGoneSeconds), 0, 1));
    const letterContract = 1;

    let colorReveal = 0;
    const colorKickSeconds = lettersMoveStart + .05;
    if (seconds >= lettersMoveStart && seconds < colorKickSeconds) colorReveal = .12 + .38 * easeOut((seconds - lettersMoveStart) / .05);
    else if (seconds >= colorKickSeconds && seconds < colorFullSeconds) colorReveal = .50 + .50 * easeOut((seconds - colorKickSeconds) / (colorFullSeconds - colorKickSeconds));
    else if (seconds >= colorFullSeconds) colorReveal = 1;

    let whiteReveal = 0;
    if (seconds >= whiteStartSeconds && seconds < whiteFullSeconds) whiteReveal = .12 + .88 * easeOut((seconds - whiteStartSeconds) / (whiteFullSeconds - whiteStartSeconds));
    else if (seconds >= whiteFullSeconds) whiteReveal = 1;

    const iconPresence = seconds < iconsGoneSeconds ? 1 : 0;
    const wordOpacity = seconds >= contactSeconds ? 1 : 0;
    const introOpacity = seconds < wordsEnterStart
      ? 1
      : 1 - easeOut(clamp((seconds - wordsEnterStart) / .045, 0, 1));
    const incomingOpacity = seconds < wordsEnterStart - .015 || seconds >= contactSeconds
      ? 0
      : easeOut(clamp((seconds - (wordsEnterStart - .015)) / .045, 0, 1));
    const iconHold = seconds >= settleEnd && seconds < holdEndSeconds;
    const iconCollapse = seconds >= collapseStartSeconds && seconds < iconsGoneSeconds;
    const colorActive = seconds >= lettersMoveStart && seconds < whiteFullSeconds;

    let velocityZone = "center-title-readable";
    let label = "01 · 中央标题清晰出现 · 图标连续起步";
    if (seconds >= shrinkStartSeconds && seconds < wordsEnterStart) { velocityZone = "center-title-shrinks-in"; label = "02 · 中央标题向内缩小并消失"; }
    else if (seconds >= wordsEnterStart && seconds < settleEnd) { velocityZone = "orbital-title-takes-over"; label = "03 · 文字水平接入 · 图标向右绕转并聚拢"; }
    else if (seconds >= settleEnd && seconds < collapseStartSeconds) { velocityZone = "inertial-float"; label = "04 · 图文沿原方向减速滞空 · 从未定住"; }
    else if (seconds >= collapseStartSeconds && seconds < iconsGoneSeconds) { velocityZone = "shared-accelerated-close"; label = "05 · 共同加速 · 图标沿弧线缩没"; }
    else if (seconds >= iconsGoneSeconds && seconds < contactSeconds) { velocityZone = "title-contact"; label = "06 · 图标消失 · 左右文字瞬间碰合"; }
    else if (seconds >= contactSeconds && seconds < whiteStartSeconds) { velocityZone = "contact-color-expands"; label = "07 · 文字碰合瞬间 · 颜色从中心亮起"; }
    else if (seconds >= whiteStartSeconds && seconds < whiteFullSeconds) { velocityZone = "white-reset-expands"; label = "07 · 白色由中心向两侧复位"; }
    else if (seconds >= whiteFullSeconds && seconds < replaceStartSeconds) { velocityZone = "compact-title-hold"; label = "08 · 紧凑白色标题"; }
    else if (seconds >= replaceStartSeconds) { velocityZone = "glyph-replacement"; label = "09 · 可选文字切换图标 / 图片"; }

    return {
      seconds,
      cutStart: at(cutStart),
      gatherEnd: at(settleEnd),
      slowEnd: at(holdEndSeconds),
      snapEnd: at(iconsGoneSeconds),
      colorStart: at(lettersMoveStart),
      colorEnd: at(whiteFullSeconds),
      replaceStart: at(replaceStartSeconds),
      replaceEnd: at(replaceEndSeconds),
      pathProgress: iconGather,
      orbitProgress: iconGather,
      iconGather,
      openingSync,
      iconHold,
      iconCollapse,
      iconPresence,
      wordScale: 1,
      wordOpacity,
      introScale,
      introOpacity,
      incomingOpacity,
      incomingOrbit,
      incomingReveal,
      incomingYaw,
      sharedProgress: iconGather,
      letterContract,
      colorReveal,
      whiteReveal,
      colorActive,
      gapClose,
      contactProgress: clamp((seconds - iconsGoneSeconds) / (contactSeconds - iconsGoneSeconds), 0, 1),
      collapseStartSeconds,
      iconsGoneSeconds,
      contactSeconds,
      replaceStartSeconds,
      whiteStartSeconds,
      groupScale: 1,
      groupRotate: 0,
      groupX: 0,
      groupY: 0,
      slowT,
      slowOrbitDegrees,
      slowOrbitVelocity: slowGatherVelocity,
      entryOrbitVelocity: entryGatherVelocity,
      entryGatherVelocity,
      slowGatherVelocity,
      orbitStartDegrees,
      orbitOvershootDegrees,
      acceleratedOrbitDegrees,
      orbitCarryDegrees,
      orbitAngleDegrees,
      driftStrength: slowMultiplier,
      slowMultiplier,
      exitVelocity,
      wordReturnDuration,
      overshootStrength,
      velocityZone,
      label
    };
  }

  function animate(now) {
    const elapsed = state.playing ? now - state.start : state.pausedAt;
    const speed = Number($("ibSpeed").value);
    const playback = glyphPlaybackConfig();
    state.duration = animationDuration(playback);
    const masterElapsed = elapsed * speed;
    const phase = (masterElapsed % state.duration) / state.duration;
    const timeline = masterTimeline(phase, state.duration / 1000, playback.total);
    const inContent = phase >= timeline.snapEnd;
    const colorActive = timeline.colorActive;
    const replacementActive = replacementEnabled() && phase >= timeline.replaceStart && phase < timeline.replaceEnd;
    const colorTime = Math.max(0, (phase - timeline.colorStart) * state.duration);
    const replacementTime = Math.max(0, (phase - timeline.replaceStart) * state.duration);
    const finalScaleDuration = clamp(Number($("ibFinalScaleDuration").value), 200, 1200);
    const replacementScaleProgress = replacementEnabled() && phase >= timeline.replaceStart
      ? smoothstep(clamp(replacementTime / finalScaleDuration, 0, 1))
      : 0;
    // The reference finishes on a lightly enlarged title. Do not ease this
    // back down inside the loop; the next loop reset is the only reset.
    const finalScaleAmount = clamp(Number($("ibFinalScale").value) / 100, 0, .10);
    const replacementFontScale = 1 + finalScaleAmount * replacementScaleProgress;

    resetLetters();
    let label = timeline.label;
    const replacements = replacementState(replacementTime, replacementActive, playback);
    const colorMode = $("ibColorMode").value;
    if (colorActive && colorMode !== "unfold") animateColor(colorTime, true);
    if (replacementActive) label = "11 · 按资源顺序 · 使用各自速度与停留时间";
    phaseLabel.textContent = label;

    const groupScale = timeline.groupScale;
    composition.style.setProperty("--group-scale", timeline.groupScale.toFixed(4));
    composition.style.setProperty("--group-rotate", `${timeline.groupRotate.toFixed(3)}deg`);
    composition.style.setProperty("--group-x", `${timeline.groupX.toFixed(2)}px`);
    composition.style.setProperty("--group-y", `${timeline.groupY.toFixed(2)}px`);
    composition.style.setProperty("--replacement-scale", replacementFontScale.toFixed(4));
    word.style.setProperty("--word-scale", "1");
    word.style.opacity = String(timeline.wordOpacity);
    introWord.style.setProperty("--intro-scale", timeline.introScale.toFixed(4));
    introWord.style.opacity = String(timeline.introOpacity);
    incomingWord.style.opacity = String(timeline.incomingOpacity);
    const wordCurveStrength = Number($("ibCurve").value) / 100;
    const orbitRemaining = 1 - timeline.incomingOrbit;
    const orbitArc = Math.sin(Math.PI * timeline.incomingOrbit);
    const orbitCenterShift = orbitRemaining * clamp(stage.clientWidth * .46, 250, 450);
    const orbitOvershoot = orbitArc * clamp(stage.clientWidth * .015, 7, 15) * wordCurveStrength;
    const orbitX = orbitCenterShift - orbitOvershoot;
    const orbitY = orbitArc * clamp(stage.clientHeight * .007, 3, 6) * wordCurveStrength;
    incomingWord.style.setProperty("--incoming-orbit-x", `${orbitX.toFixed(2)}px`);
    incomingWord.style.setProperty("--incoming-orbit-y", `${orbitY.toFixed(2)}px`);
    incomingWord.style.setProperty("--incoming-mask", "0%");
    incomingWord.classList.toggle("is-unmasked", timeline.incomingReveal > 0);

    const fontSize = parseFloat(word.style.fontSize) || 100;
    const closedGap = state.naturalGap ? fontSize * .18 : 0;
    const slotScale = Number($("ibCollapse").value) / 100;
    const openGap = closedGap + clamp(stage.clientWidth * .22, 120, 260) * slotScale;
    const wordGap = closedGap + (openGap - closedGap) * (1 - timeline.gapClose);
    word.style.setProperty("--word-gap", `${closedGap.toFixed(2)}px`);
    incomingWord.style.setProperty("--word-gap", `${closedGap.toFixed(2)}px`);
    colorWord.style.setProperty("--word-gap", `${closedGap.toFixed(2)}px`);
    whiteWord.style.setProperty("--word-gap", `${closedGap.toFixed(2)}px`);
    const sideShift = (openGap - closedGap) / 2;
    [
      { element: incomingLeft, direction: -1 },
      { element: incomingRight, direction: 1 }
    ].forEach(({ element, direction }) => {
      const letters = Array.from(element.children);
      const maxRank = Math.max(0, ...letters.map((letter) => Number(letter.dataset.rank || 0)));
      letters.forEach((letter) => {
        const rank = Number(letter.dataset.rank || 0);
        // rank 0 is nearest the center. It leads the move, with each following
        // letter joining in sequence toward the outside edge. This reads as a
        // word feeding into the center and avoids letters overtaking each other.
        const inwardOrder = rank;
        const delay = Math.min(.48, inwardOrder * .16);
        const localProgress = clamp((timeline.contactProgress - delay) / Math.max(.16, 1 - delay), 0, 1);
        const close = easeOutExpo(localProgress);
        const rankRatio = maxRank > 0 ? rank / maxRank : 0;
        const openDistance = sideShift * (.88 + .12 * rankRatio);
        letter.style.setProperty("--incoming-letter-x", `${(direction * openDistance * (1 - close)).toFixed(2)}px`);
      });
    });

    const finalSequence = timeline.seconds >= 1.766667;
    const visibleLetters = Array.from(word.children).filter((letter) => letter.textContent.trim());
    const midpoint = (visibleLetters.length - 1) / 2;
    const maxDistance = Math.max(1, midpoint);
    const replacementEnvelope = Math.max(0, ...Array.from(replacements.values()).map((replacement) => replacement.envelope));
    // A very small persistent opening accompanies the shared scale-up. It is
    // driven by phase rather than the per-icon envelope, so it does not fall
    // back after an icon's hold time ends.
    const replacementExpansion = replacementScaleProgress * fontSize * .012;
    const letterOffsets = new Map();
    visibleLetters.forEach((letter, index) => {
      const distance = index - midpoint;
      const looseOffset = distance / maxDistance * fontSize * .58;
      const microOffset = distance / maxDistance * replacementExpansion;
      letterOffsets.set(Number(letter.dataset.letter), (finalSequence ? looseOffset * (1 - timeline.letterContract) : 0) + microOffset);
    });
    [word, colorWord, whiteWord].forEach((layer) => {
      Array.from(layer.children).forEach((letter) => {
        const offset = letterOffsets.get(Number(letter.dataset.letter)) || 0;
        letter.style.setProperty("--letter-x", `${offset.toFixed(2)}px`);
      });
    });

    const overlayActive = colorMode === "unfold" && timeline.seconds >= timeline.contactSeconds && timeline.seconds < timeline.replaceStartSeconds;
    colorWord.style.opacity = overlayActive ? "1" : "0";
    whiteWord.style.opacity = colorMode === "unfold" && timeline.seconds >= timeline.whiteStartSeconds && timeline.seconds < timeline.replaceStartSeconds ? "1" : "0";
    colorWord.style.setProperty("--reveal-inset", `${(50 * (1 - timeline.colorReveal)).toFixed(3)}%`);
    whiteWord.style.setProperty("--reveal-inset", `${(50 * (1 - timeline.whiteReveal)).toFixed(3)}%`);

    const range = Number($("ibRange").value) / 100;
    const iconSize = Number($("ibSize").value) / 100;
    const rect = { width: composition.clientWidth, height: composition.clientHeight };
    const letters = Array.from(word.children);
    const anchors = replacementActive ? getLetterAnchors() : [];
    const burst = 1 - clamp(timeline.pathProgress, 0, 1);
    const curveStrength = Number($("ibCurve").value) / 100;
    const orbitSpeed = clamp(Number($("ibOrbitSpeed").value) / 100, .5, 2);
    const orbitAssets = state.assets.filter((asset) => asset.role === "orbit");
    const orbitIndexById = new Map(orbitAssets.map((asset, index) => [asset.id, index]));
    state.iconElements.forEach((element, index) => {
      const asset = state.assets[index];
      if (!asset) return;
      const seed = seeds[index % seeds.length];
      const ring = Math.floor(index / seeds.length) + 1;
      const replacement = replacements.get(asset.id);
      let anchorX = 0, anchorY = 0;
      if (replacement && anchors[replacement.target]) {
        anchorX = anchors[replacement.target].x + (letterOffsets.get(replacement.target) || 0);
        anchorY = anchors[replacement.target].y;
      }
      const envelope = replacement ? replacement.envelope : 0;
      const swap = Boolean(replacement && replacement.swap);
      const customX = asset.x / 100 * rect.width * .28;
      const customY = asset.y / 100 * rect.height * .28;
      const orbitIndex = orbitIndexById.has(asset.id) ? orbitIndexById.get(asset.id) : -1;
      const orbitCount = Math.max(1, orbitAssets.length);
      const angleJitter = seed[2] * 1.65 * Math.PI / 180;
      const distributedAngle = -Math.PI / 2 + Math.PI * 2 * Math.max(0, orbitIndex) / orbitCount + angleJitter;
      const radialScatter = .46 + ((Math.max(0, orbitIndex) * 7) % 5) * .068;
      const startX = asset.role === "orbit"
        ? Math.cos(distributedAngle) * rect.width * range * radialScatter
        : seed[0] * rect.width * range * (.82 + .18 * ring);
      const startY = asset.role === "orbit"
        ? Math.sin(distributedAngle) * rect.height * range * radialScatter
        : seed[1] * rect.height * range * (.82 + .18 * ring);
      const target = clusterTargets[Math.max(0, orbitIndex) % clusterTargets.length];
      const targetX = target[0] * rect.width;
      const targetY = target[1] * rect.height;
      const gather = timeline.iconGather;
      const settledGather = clamp(gather, 0, 1);
      const radius = Math.max(1, Math.hypot(startX, startY));
      // All opening assets share one orbital direction. Alternating the
      // direction per icon made the cloud look like unrelated pieces fighting
      // each other. Individuality now comes from radius and target, not from a
      // different choreography.
      const trajectoryDirection = 1;
      let pathTangentX = -startY / radius;
      let pathTangentY = startX / radius;
      let depthScale = 1;
      let depthValue = 0;
      let scatterX;
      let scatterY;
      if (asset.role === "orbit") {
        // Fibonacci sphere: assets are evenly distributed over a 3D shell,
        // rotate together around its Y axis, and remain camera-facing. This
        // creates front/back crossings instead of a flat vertical carousel.
        const safeOrbitIndex = Math.max(0, orbitIndex);
        const sphereY = 1 - 2 * (safeOrbitIndex + .5) / orbitCount;
        const latitudeRadius = Math.sqrt(Math.max(0, 1 - sphereY * sphereY));
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const baseLongitude = safeOrbitIndex * goldenAngle + angleJitter * .28;
        const orbitalAngle = baseLongitude + timeline.orbitAngleDegrees * curveStrength * orbitSpeed * Math.PI / 180;
        const sphereX = Math.cos(orbitalAngle) * latitudeRadius;
        const sphereZ = Math.sin(orbitalAngle) * latitudeRadius;
        // A small diagonal pitch turns the round shell into the reference's
        // crossing, slightly tilted orbit without rotating the text layer.
        const pitch = (-16 + 27 * easeInOut(settledGather)) * Math.PI / 180;
        const projectedY = sphereY * Math.cos(pitch) - sphereZ * Math.sin(pitch);
        const projectedZ = sphereY * Math.sin(pitch) + sphereZ * Math.cos(pitch);
        const radialProgress = easeInOut(settledGather);
        const startRadius = Math.min(rect.width, rect.height) * range * (.49 + (safeOrbitIndex % 3) * .018);
        const densityStrength = clamp(Number($("ibDensity").value) / 100, 0, 1);
        const spreadScale = 1.45 - .83 * densityStrength;
        const clusterRadius = Math.min(rect.width, rect.height) * (.118 + (safeOrbitIndex % 3) * .003) * spreadScale;
        const sphereRadius = startRadius + (clusterRadius - startRadius) * radialProgress;
        const perspective = 1 / (1 - projectedZ * .22);
        scatterX = sphereX * sphereRadius * perspective;
        scatterY = projectedY * sphereRadius * perspective * .94;
        depthValue = projectedZ;
        depthScale = clamp(1 + projectedZ * .22, .76, 1.24);
        pathTangentX = -Math.sin(orbitalAngle);
        pathTangentY = Math.cos(orbitalAngle) * Math.cos(pitch);
      } else {
        scatterX = startX + (targetX - startX) * easeInOut(gather);
        scatterY = startY + (targetY - startY) * easeInOut(gather);
      }
      // Near the cluster, continue through the target along the incoming
      // tangent, briefly crossing the opposite side before settling. This is
      // the reference's moving "cross" impression—not planar self-rotation.
      const crossT = clamp((gather - .58) / .39, 0, 1);
      const crossSine = Math.sin(Math.PI * crossT);
      const crossPulse = crossSine * crossSine;
      if (asset.role === "orbit") {
        const crossingDrift = Math.min(rect.width, rect.height) * .018 * curveStrength * crossPulse;
        scatterX += pathTangentX * trajectoryDirection * crossingDrift;
        scatterY += pathTangentY * trajectoryDirection * crossingDrift;
      }
      let motionX = 0, motionY = 0;
      if (replacementActive && swap && asset.motion === "float") motionY = Math.sin(replacementTime / 360 + index) * 5;
      if (replacementActive && swap && asset.motion === "orbit") {
        motionX = Math.cos(replacementTime / 420 + index) * 7;
        motionY = Math.sin(replacementTime / 420 + index) * 7;
      }
      let introVisible = asset.role !== "glyph" ? timeline.iconPresence : 0;
      let collapseScale = 1;
      if (asset.role === "orbit" && timeline.seconds >= timeline.collapseStartSeconds) {
        // Font contact and every icon collapse start on the same frame. The
        // former per-icon delay made the title visibly outrun the icon layer.
        const collapseDuration = timeline.iconsGoneSeconds - timeline.collapseStartSeconds;
        const localCollapse = clamp((timeline.seconds - timeline.collapseStartSeconds) / collapseDuration, 0, 1);
        // First arrive, then visibly continue past the endpoint on the sphere,
        // and only after that begin disappearing. Keeping full scale through
        // 65% of this chapter makes the forward rotation readable.
        const disappearStart = .65;
        const disappearProgress = clamp((localCollapse - disappearStart) / (1 - disappearStart), 0, 1);
        collapseScale = 1 - easeInOut(disappearProgress);
        if (localCollapse >= 1) introVisible = 0;
      }
      const reveal = Math.max(introVisible, swap ? 1 : 0);
      const translateX = replacement ? anchorX + customX + motionX : scatterX + customX + motionX;
      const translateY = replacement ? anchorY + customY + motionY : scatterY + customY + motionY;
      const startScale = 1.12 + (orbitIndex % 4) * .09;
      const introScale = (startScale + (1 - startScale) * gather) * collapseScale * depthScale;
      const replacementScale = .98 + easeOut(envelope) * .02;
      const baseScale = replacement ? replacementScale : introScale;
      const collapseT = asset.role === "orbit" && timeline.seconds >= timeline.collapseStartSeconds
        ? clamp((timeline.seconds - timeline.collapseStartSeconds) / (timeline.iconsGoneSeconds - timeline.collapseStartSeconds), 0, 1)
        : 0;
      // The spherical position carries the 3D motion. Icons remain readable
      // billboards and only bank gently along their path.
      const pathTurn = asset.role === "orbit" ? 10 * Math.sin(Math.PI * settledGather) : 0;
      const collapseTurn = asset.role === "orbit" ? 5.5 * Math.sin(Math.PI * collapseT) : 0;
      const rotation = asset.rotation + pathTurn + collapseTurn;
      const depthFront = clamp((depthValue + 1) / 2, 0, 1);
      const plateAlpha = asset.role === "orbit" ? (.12 + .10 * depthFront + .03 * crossPulse) * introVisible * collapseScale : 0;
      element.classList.toggle("is-replacement", swap);
      element.style.setProperty("--tx", `${translateX}px`);
      element.style.setProperty("--ty", `${translateY}px`);
      element.style.setProperty("--rot", `${rotation}deg`);
      element.style.setProperty("--s", String(iconSize * asset.size * baseScale));
      element.style.setProperty("--alpha", String(reveal * asset.opacity));
      element.style.setProperty("--plate-alpha", plateAlpha.toFixed(3));
      element.style.setProperty("--shadow-x", `${(1.5 + depthFront * 2.5).toFixed(2)}px`);
      element.style.setProperty("--shadow-y", `${(3 + depthFront * 4).toFixed(2)}px`);
      element.style.setProperty("--shadow-blur", `${(5 + depthFront * 8).toFixed(2)}px`);
      element.style.setProperty("--shadow-alpha", (.26 + depthFront * .24).toFixed(3));
      if (asset.role === "orbit" && !swap) element.style.zIndex = String(30 + Math.round((depthValue + 1) * 24));
    });

    window.ibMotionDebug = {
      phase, chapter: inContent ? "content" : "intro", pathProgress: timeline.pathProgress,
      orbitProgress: timeline.orbitProgress,
      burst, groupScale, groupRotate: timeline.groupRotate, groupX: timeline.groupX, groupY: timeline.groupY,
      groupFlip: 0, wordScale: replacementFontScale, wordOpacity: timeline.wordOpacity,
      introScale: timeline.introScale, introOpacity: timeline.introOpacity,
      incomingOpacity: timeline.incomingOpacity, incomingOrbit: timeline.incomingOrbit,
      incomingReveal: timeline.incomingReveal, incomingYaw: timeline.incomingYaw,
      openingSync: timeline.openingSync,
      gapClose: timeline.gapClose, contactProgress: timeline.contactProgress,
      contactStart: timeline.iconsGoneSeconds, contactEnd: timeline.contactSeconds,
      wordGap, openGap, closedGap,
      colorActive, replacementActive, contentTime: colorTime, velocityZone: timeline.velocityZone,
      replacementExpansion, replacementScaleProgress,
      replaceStart: timeline.replaceStart,
      slowT: timeline.slowT,
      slowOrbitDegrees: timeline.slowOrbitDegrees,
      slowOrbitVelocity: timeline.slowOrbitVelocity,
      entryOrbitVelocity: timeline.entryOrbitVelocity,
      entryGatherVelocity: timeline.entryGatherVelocity,
      slowGatherVelocity: timeline.slowGatherVelocity,
      orbitOvershootDegrees: timeline.orbitOvershootDegrees,
      acceleratedOrbitDegrees: timeline.acceleratedOrbitDegrees,
      orbitCarryDegrees: timeline.orbitCarryDegrees,
      orbitAngleDegrees: timeline.orbitAngleDegrees,
      finalScaleAmount,
      finalScaleDuration,
      orbitSpeed,
      wordReturnDuration: timeline.wordReturnDuration,
      introEnd: timeline.colorStart, slowEnd: timeline.slowEnd, snapEnd: timeline.snapEnd
    };
    requestAnimationFrame(animate);
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  function pixelDistance(pixels, offset, background) {
    const dr = pixels[offset] - background[0];
    const dg = pixels[offset + 1] - background[1];
    const db = pixels[offset + 2] - background[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function sampleCorners(context, width, height) {
    const size = Math.max(2, Math.min(12, Math.round(Math.min(width, height) * .006)));
    const points = [[0, 0], [Math.max(0, width - size), 0], [0, Math.max(0, height - size)], [Math.max(0, width - size), Math.max(0, height - size)]];
    const total = [0, 0, 0, 0];
    points.forEach(([x, y]) => {
      const data = context.getImageData(x, y, Math.min(size, width), Math.min(size, height)).data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] < 16) continue;
        total[0] += data[index]; total[1] += data[index + 1]; total[2] += data[index + 2]; total[3] += 1;
      }
    });
    return total[3] ? total.slice(0, 3).map((value) => value / total[3]) : [255, 255, 255];
  }

  function connectedBackgroundMask(pixels, width, height, background, threshold) {
    const count = width * height;
    const mask = new Uint8Array(count);
    const queue = new Uint32Array(count);
    let head = 0, tail = 0;
    function enqueue(pixel) {
      if (mask[pixel] || pixelDistance(pixels, pixel * 4, background) > threshold) return;
      mask[pixel] = 1;
      queue[tail++] = pixel;
    }
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
    for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < width) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y + 1 < height) enqueue(pixel + width);
    }
    return mask;
  }

  function cropTransparentCanvas(source, bounds) {
    if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return source;
    const subjectWidth = bounds.maxX - bounds.minX + 1;
    const subjectHeight = bounds.maxY - bounds.minY + 1;
    const padding = Math.max(2, Math.round(Math.max(subjectWidth, subjectHeight) * .025));
    const x = Math.max(0, bounds.minX - padding);
    const y = Math.max(0, bounds.minY - padding);
    const right = Math.min(source.width, bounds.maxX + padding + 1);
    const bottom = Math.min(source.height, bounds.maxY + padding + 1);
    const output = document.createElement("canvas");
    output.width = right - x;
    output.height = bottom - y;
    output.getContext("2d").drawImage(source, x, y, output.width, output.height, 0, 0, output.width, output.height);
    return output;
  }

  async function processAssetImage(asset) {
    if (!asset.originalImage || !asset.originalDataUrl) return;
    asset.processing = true;
    asset.status = "正在本地处理高清主体…";
    if (asset.id === state.activeAssetId) renderAssetEditor();
    if (/gif/i.test(asset.fileType)) {
      asset.url = asset.originalDataUrl;
      asset.processedWidth = asset.originalImage.naturalWidth || asset.originalImage.width;
      asset.processedHeight = asset.originalImage.naturalHeight || asset.originalImage.height;
      asset.processing = false;
      asset.status = "GIF 已保留动画；自动抠图仅处理静态图片。";
      renderIcons(); renderAssets();
      return;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const originalWidth = asset.originalImage.naturalWidth || asset.originalImage.width;
    const originalHeight = asset.originalImage.naturalHeight || asset.originalImage.height;
    const scale = Math.min(1, 2048 / Math.max(originalWidth, originalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(asset.originalImage, 0, 0, canvas.width, canvas.height);
    let output = canvas;
    if (asset.removeBackground) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const background = asset.autoBackground ? sampleCorners(context, canvas.width, canvas.height) : hexToRgb(asset.backgroundColor);
      if (asset.autoBackground) asset.backgroundColor = rgbToHex(background);
      const tolerance = asset.tolerance;
      const feather = asset.feather;
      const mask = connectedBackgroundMask(pixels, canvas.width, canvas.height, background, tolerance + feather);
      const transparent = context.createImageData(canvas.width, canvas.height);
      const target = transparent.data;
      const bounds = { minX: canvas.width, minY: canvas.height, maxX: -1, maxY: -1 };
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const pixel = offset / 4;
        const distance = pixelDistance(pixels, offset, background);
        let keep = 1;
        if (mask[pixel]) keep = distance <= tolerance ? 0 : feather > 0 ? Math.min(1, (distance - tolerance) / feather) : 1;
        let red = pixels[offset], green = pixels[offset + 1], blue = pixels[offset + 2];
        if (keep > .03 && keep < .995) {
          red = clamp((red - background[0] * (1 - keep)) / keep, 0, 255);
          green = clamp((green - background[1] * (1 - keep)) / keep, 0, 255);
          blue = clamp((blue - background[2] * (1 - keep)) / keep, 0, 255);
        }
        target[offset] = red; target[offset + 1] = green; target[offset + 2] = blue;
        target[offset + 3] = Math.round(pixels[offset + 3] * keep);
        if (target[offset + 3] > 8) {
          const x = pixel % canvas.width, y = Math.floor(pixel / canvas.width);
          bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
          bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
        }
      }
      const transparentCanvas = document.createElement("canvas");
      transparentCanvas.width = canvas.width;
      transparentCanvas.height = canvas.height;
      transparentCanvas.getContext("2d").putImageData(transparent, 0, 0);
      output = cropTransparentCanvas(transparentCanvas, bounds);
    }
    asset.url = output.toDataURL("image/png");
    asset.processedWidth = output.width;
    asset.processedHeight = output.height;
    asset.processing = false;
    asset.status = asset.removeBackground ? `背景已转透明 · 高清主体 ${output.width}×${output.height}` : `保留原背景 · ${output.width}×${output.height}`;
    renderIcons();
    renderAssets();
  }

  async function assignFileToAsset(asset, file) {
    try {
      asset.status = "正在读取图片…";
      const dataUrl = await readFile(file);
      const image = await loadImage(dataUrl);
      asset.type = "image";
      asset.name = file.name;
      asset.fileType = file.type || "";
      asset.originalDataUrl = dataUrl;
      asset.originalImage = image;
      asset.url = dataUrl;
      await processAssetImage(asset);
    } catch (error) {
      asset.processing = false;
      asset.status = "无法读取这张图片，请换用 PNG、JPG、WebP、SVG 或 GIF。";
      renderAssets();
    }
  }

  function scheduleAssetProcessing(asset) {
    clearTimeout(state.backgroundTimer);
    state.backgroundTimer = setTimeout(() => processAssetImage(asset), 120);
  }

  $("ibAssets").addEventListener("change", (event) => {
    const control = event.target.closest('[data-action^="quick-"]');
    if (!control) return;
    const row = control.closest(".ib-asset");
    const asset = row && state.assets.find((item) => item.id === row.dataset.id);
    if (!asset || asset.role !== "glyph") return;
    const action = control.dataset.action;
    if (action === "quick-target") {
      asset.target = Number(control.value);
      if (state.activeAssetId === asset.id) $("ibAssetTarget").value = String(asset.target);
    }
    if (action === "quick-speed") asset.replaceSpeed = Number(control.value);
    if (action === "quick-hold") asset.holdMs = Number(control.value);
    if (action === "quick-order") {
      const ordered = state.assets.filter((item) => item.role === "glyph" && item.id !== asset.id).sort((a, b) => Number(a.sequence) - Number(b.sequence));
      ordered.splice(clamp(Number(control.value), 0, ordered.length), 0, asset);
      ordered.forEach((item, index) => { item.sequence = index; });
    }
    renderAssets();
  });

  $("ibAssets").addEventListener("click", (event) => {
    const row = event.target.closest(".ib-asset");
    if (!row) return;
    const asset = state.assets.find((item) => item.id === row.dataset.id);
    if (!asset) return;
    if (event.target.closest('[data-action="remove"]')) {
      const index = state.assets.indexOf(asset);
      state.assets.splice(index, 1);
      if (asset.role === "glyph") normalizeGlyphSequence();
      if (state.activeAssetId === asset.id) state.activeAssetId = (state.assets[index] || state.assets[index - 1] || {}).id || null;
      renderAssets(); renderIcons();
      return;
    }
    selectAsset(asset.id);
  });

  ["ibText", "ibFont", "ibWeight", "ibFontSize", "ibTracking", "ibBaseColor", "ibColorA", "ibColorB", "ibColorC", "ibColorD", "ibBackground"].forEach((id) => {
    $(id).addEventListener("input", id === "ibText" ? updateWord : updateTypography);
  });
  const readouts = [
    ["ibFontSize", "ibFontSizeValue", (value) => `${value}%`],
    ["ibTracking", "ibTrackingValue", (value) => `${value} px`],
    ["ibColorSpeed", "ibColorSpeedValue", (value) => `${Number(value).toFixed(1)}×`],
    ["ibSoftness", "ibSoftnessValue", (value) => `${value}%`],
    ["ibRange", "ibRangeValue", (value) => `${value}%`],
    ["ibSize", "ibSizeValue", (value) => `${value}%`],
    ["ibBeat", "ibBeatValue", (value) => `${(Number(value) / 1000).toFixed(2).replace(/0$/, "")} 秒`],
    ["ibReplaceSpeed", "ibReplaceSpeedValue", (value) => `${Number(value).toFixed(1)}×`],
    ["ibCollapse", "ibCollapseValue", (value) => `${value}%`],
    ["ibHang", "ibHangValue", (value) => `${(Number(value) / 100).toFixed(2)} 秒`],
    ["ibDrift", "ibDriftValue", (value) => `${value}%`],
    ["ibOvershoot", "ibOvershootValue", (value) => `${value}%`],
    ["ibDensity", "ibDensityValue", (value) => `${value}%`],
    ["ibFinalScale", "ibFinalScaleValue", (value) => `+${Number(value).toFixed(1)}%`],
    ["ibFinalScaleDuration", "ibFinalScaleDurationValue", (value) => `${(Number(value) / 1000).toFixed(2)} 秒`],
    ["ibWordReturn", "ibWordReturnValue", (value) => `${(Number(value) / 1000).toFixed(2)} 秒`],
    ["ibOrbitSpeed", "ibOrbitSpeedValue", (value) => `${(Number(value) / 100).toFixed(2)}×`],
    ["ibCurve", "ibCurveValue", (value) => `${value}%`],
    ["ibSpeed", "ibSpeedValue", (value) => `${Number(value).toFixed(1)}×`]
  ];
  readouts.forEach(([id, output, format]) => $(id).addEventListener("input", () => { $(output).textContent = format($(id).value); }));
  // Amplitude is not a static font-size edit. Releasing either final-scale
  // control restarts the complete choreography so the user sees the title
  // grow over time in its actual replacement chapter.
  ["ibFinalScale", "ibFinalScaleDuration"].forEach((id) => $(id).addEventListener("change", restart));
  ["ibWordReturn", "ibOrbitSpeed", "ibOvershoot"].forEach((id) => $(id).addEventListener("change", restart));

  const assetInputs = ["ibAssetShape", "ibAssetColor", "ibAssetTarget", "ibAssetHold", "ibAssetSize", "ibAssetOpacity", "ibAssetX", "ibAssetY", "ibAssetRotation", "ibAssetMotion"];
  assetInputs.forEach((id) => $(id).addEventListener("input", () => {
    const asset = activeAsset();
    if (!asset) return;
    if (id === "ibAssetShape") { asset.shape = $(id).value; asset.name = `内置${shapeLabels[asset.shape]}`; }
    if (id === "ibAssetColor") { asset.color = $(id).value; asset.color2 = $(id).value; }
    if (id === "ibAssetTarget") asset.target = Number($(id).value);
    if (id === "ibAssetHold") asset.holdMs = Number($(id).value);
    if (id === "ibAssetSize") asset.size = Number($(id).value) / 100;
    if (id === "ibAssetOpacity") asset.opacity = Number($(id).value) / 100;
    if (id === "ibAssetX") asset.x = Number($(id).value);
    if (id === "ibAssetY") asset.y = Number($(id).value);
    if (id === "ibAssetRotation") asset.rotation = Number($(id).value);
    if (id === "ibAssetMotion") asset.motion = $(id).value;
    updateAssetReadouts(asset);
    if (["ibAssetShape", "ibAssetColor"].includes(id)) { renderIcons(); renderAssets(); }
  }));

  $("ibAssetSource").addEventListener("change", () => {
    const asset = activeAsset();
    if (!asset) return;
    if ($("ibAssetSource").value === "shape") {
      asset.type = "shape";
      asset.name = `内置${shapeLabels[asset.shape || "square"]}`;
      asset.status = "已将这一项切换为内置图形；其他资源不受影响。";
      renderIcons(); renderAssets();
    } else if (asset.originalDataUrl) {
      asset.type = "image";
      processAssetImage(asset);
    } else {
      $("ibAssetSource").value = "shape";
      asset.status = "请在下面选择图片；选择后只替换当前这一项。";
      renderAssetEditor();
      $("ibAssetFile").click();
    }
  });

  $("ibAssetFile").addEventListener("change", (event) => {
    const asset = activeAsset();
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (asset && file) assignFileToAsset(asset, file);
  });

  $("ibAssetEditor").addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset-size]");
    const asset = activeAsset();
    if (!button || !asset) return;
    asset.size = Number(button.dataset.assetSize) / 100;
    $("ibAssetSize").value = button.dataset.assetSize;
    updateAssetReadouts(asset);
    renderAssets();
  });

  ["ibRemoveBackground", "ibAutoBackground", "ibBackgroundColor", "ibTolerance", "ibFeather"].forEach((id) => {
    $(id).addEventListener("input", () => {
      const asset = activeAsset();
      if (!asset || asset.type !== "image") return;
      asset.removeBackground = $("ibRemoveBackground").checked;
      asset.autoBackground = $("ibAutoBackground").checked;
      asset.backgroundColor = $("ibBackgroundColor").value;
      asset.tolerance = Number($("ibTolerance").value);
      asset.feather = Number($("ibFeather").value);
      $("ibToleranceValue").textContent = String(asset.tolerance);
      $("ibFeatherValue").textContent = String(asset.feather);
      scheduleAssetProcessing(asset);
    });
  });

  function bindFileInput(inputId, role) {
    $(inputId).addEventListener("change", (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      const sequenceStart = state.assets.filter((asset) => asset.role === "glyph").length;
      const added = files.map((file, index) => defaultAsset({ id: `upload-${Date.now()}-${index}`, type: "image", role, name: file.name, status: "等待处理…", sequence: role === "glyph" ? sequenceStart + index : 0 }));
      state.assets.push(...added);
      if (added.length) state.activeAssetId = added[added.length - 1].id;
      renderAssets(); renderIcons();
      added.forEach((asset, index) => assignFileToAsset(asset, files[index]));
    });
  }

  function bindShapeButton(buttonId, shapeId, colorId, role) {
    $(buttonId).addEventListener("click", () => {
      const shape = $(shapeId).value;
      const color = $(colorId).value;
      const sequence = role === "glyph" ? state.assets.filter((asset) => asset.role === "glyph").length : 0;
      const asset = defaultAsset({ role, shape, color, color2: $("ibColorC").value, name: `内置${shapeLabels[shape]}`, target: -1, sequence });
      state.assets.push(asset);
      state.activeAssetId = asset.id;
      renderAssets(); renderIcons();
    });
  }

  function bindImageLibrary(libraryId, role) {
    $(libraryId).addEventListener("click", (event) => {
      const button = event.target.closest("[data-image-index]");
      if (!button) return;
      const image = transparentAnimalImages[Number(button.dataset.imageIndex)];
      if (!image) return;
      const sequence = role === "glyph" ? state.assets.filter((asset) => asset.role === "glyph").length : 0;
      const asset = defaultAsset({
        type: "image",
        role,
        name: image.name,
        url: image.url,
        originalDataUrl: image.url,
        fileType: "image/png",
        libraryImage: true,
        removeBackground: false,
        autoBackground: false,
        processedWidth: 768,
        processedHeight: 768,
        status: "内置高清透明 PNG；当前资源可独立缩放、移动、旋转或替换。",
        target: -1,
        sequence
      });
      state.assets.push(asset);
      state.activeAssetId = asset.id;
      renderAssets();
      renderIcons();
      loadImage(image.url).then((loadedImage) => { asset.originalImage = loadedImage; }).catch(() => {
        asset.status = "内置图片加载失败，请刷新页面后重试。";
        if (state.activeAssetId === asset.id) renderAssetEditor();
      });
    });
  }

  bindFileInput("ibOrbitFiles", "orbit");
  bindFileInput("ibGlyphFiles", "glyph");
  bindShapeButton("ibAddOrbitShape", "ibOrbitShape", "ibOrbitShapeColor", "orbit");
  bindShapeButton("ibAddGlyphShape", "ibGlyphShape", "ibGlyphShapeColor", "glyph");
  bindImageLibrary("ibOrbitImageLibrary", "orbit");
  bindImageLibrary("ibGlyphImageLibrary", "glyph");

  window.addEventListener("resize", invalidateLetterAnchors, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(invalidateLetterAnchors);

  function restart() {
    state.start = performance.now();
    state.pausedAt = 0;
    if (!state.playing) {
      state.playing = true;
      $("ibPlayIcon").textContent = "Ⅱ";
      $("ibPlayLabel").textContent = "暂停";
      $("ibPlay").setAttribute("aria-pressed", "false");
    }
  }

  $("ibContentMode").addEventListener("change", updateContentModeUI);
  $("ibRestart").addEventListener("click", restart);
  $("ibReplay").addEventListener("click", restart);
  $("ibPlay").addEventListener("click", () => {
    if (state.playing) {
      state.pausedAt = performance.now() - state.start;
      state.playing = false;
      $("ibPlayIcon").textContent = "▶";
      $("ibPlayLabel").textContent = "播放";
      $("ibPlay").setAttribute("aria-pressed", "true");
    } else {
      state.start = performance.now() - state.pausedAt;
      state.playing = true;
      $("ibPlayIcon").textContent = "Ⅱ";
      $("ibPlayLabel").textContent = "暂停";
      $("ibPlay").setAttribute("aria-pressed", "false");
    }
  });

  renderImageLibraries();
  state.assets = builtinAssets();
  // Keep both layer cards compact on entry. An editor opens inside the exact
  // layer card only after the user chooses an individual asset.
  state.activeAssetId = null;
  updateWord();
  updateContentModeUI();
  renderIcons();
  requestAnimationFrame(animate);
})();
