(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pageParams = new URLSearchParams(window.location.search);
  const previewMode = pageParams.get("preview") === "1";
  const galleryDefaultMode = pageParams.get("from") === "gallery";
  document.body.classList.toggle("ib-card-preview", previewMode);
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
  const backgroundMediaLayer = $("ibBackgroundMedia");
  const backgroundImage = $("ibBackgroundImage");
  const backgroundVideo = $("ibBackgroundVideo");
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
    letterAnchors: null,
    backgroundMedia: null
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
  const shapeLabels = { ring: "圆环", "rainbow-ring": "彩虹圆环", star: "星形" };
  const iconSvg = (body, background) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`)}`;
  const flowIconImages = [
    { name: "水流音乐", url: iconSvg('<g transform="translate(-4 0)"><path d="M44 24v37c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V39l24-7v24c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V19z" fill="white"/></g>', "#fa264f") },
    { name: "水流播放", url: iconSvg('<circle cx="50" cy="50" r="34" fill="none" stroke="white" stroke-width="6"/><path d="M41 30 70 50 41 70z" fill="white"/>', "#111111") },
    { name: "水流云", url: iconSvg('<circle cx="34" cy="56" r="15" fill="white"/><circle cx="51" cy="45" r="22" fill="white"/><circle cx="70" cy="56" r="16" fill="white"/><rect x="19" y="54" width="67" height="21" rx="10" fill="white"/>', "#1389ff") },
    { name: "水流手表", url: iconSvg('<rect x="28" y="19" width="44" height="62" rx="15" fill="#111"/><rect x="35" y="28" width="30" height="44" rx="9" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8") }
  ];
  const transparentAnimalImages = Array.from({ length: 31 }, (_, index) => ({
    name: index === 4 ? "鲸鱼" : `透明动物 ${String(index + 1).padStart(2, "0")}`,
    url: `assets/transparent-animals/animal-${String(index + 1).padStart(2, "0")}.png`,
    fileType: "image/png",
    width: 768,
    height: 768
  }));
  const botSeriesImages = [
    "bloub-capsule-colere-brun.gif",
    "bloub-cercle-attentif-violet.gif",
    "bloub-cercle-curieux-encre.gif",
    "bloub-galet-blase-orange.gif",
    "bloub-galet-somnolent-rouge.gif",
    "bloub-goutte-curieux-turquoise.gif",
    "bloub-hexagone-surpris-gris.gif",
    "bloub-nuage-mefiant-rouge.gif",
    "bloub-nuage-neutre-bleu.gif",
    "bloub-squircle-effraye-orange.gif",
    "bloub-triangle-mefiant-ambre.gif"
  ].map((filename, index) => ({
    name: `Bot 动态表情 ${String(index + 1).padStart(2, "0")}`,
    url: `assets/bot-series/${filename}`,
    fileType: "image/gif",
    width: 320,
    height: 320
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

  function botAsset(index, role, overrides) {
    const image = botSeriesImages[index % botSeriesImages.length];
    return defaultAsset(Object.assign({
      id: `${role}-bot-${index}`,
      builtin: true,
      type: "image",
      role,
      name: image.name,
      url: image.url,
      originalDataUrl: image.url,
      fileType: image.fileType,
      libraryImage: true,
      removeBackground: false,
      autoBackground: false,
      processedWidth: image.width,
      processedHeight: image.height,
      status: "内置 Bot 动态 GIF；保留原动画，可独立缩放、移动、旋转或替换。"
    }, overrides || {}));
  }
  function collisionColorProgress(value) {
    const colorSpeed = clamp(Number($("ibColorSpeed").value), .5, 24);
    // Keep a visible blend window even at the fastest setting. The previous
    // multiplier completed a color change in less than one 30fps frame.
    const durationScale = clamp(5 / colorSpeed, .82, 3);
    return smoothstep(clamp(value / durationScale, 0, 1));
  }
  // The reference is a two-beat impact, not a uniformly staggered squeeze.
  // Inner pairs chase each other quickly; the outermost letter on each side
  // waits for that first impact before it closes the word on the second beat.
  function collisionPairStartOffset(rank, maxRank, pairStaggerSeconds) {
    if (maxRank <= 1) return rank * pairStaggerSeconds;
    if (rank === maxRank) return ((maxRank - 1) * .32 + 2.8) * pairStaggerSeconds;
    return rank * pairStaggerSeconds * .32;
  }
  function collisionBeat(value) {
    const progress = clamp(value, 0, 1);
    let distanceFactor = 1;
    if (progress < .16) {
      // A small outward preparation makes the following inward force legible.
      distanceFactor = 1 + .105 * smoothstep(progress / .16);
    } else if (progress < .68) {
      const impact = easeOutExpo((progress - .16) / .52);
      // Cross the resting point slightly instead of stopping on it.
      distanceFactor = 1.105 + (-.075 - 1.105) * impact;
    } else {
      const settle = clamp((progress - .68) / .32, 0, 1);
      distanceFactor = -.075 * (1 - easeOut(settle)) * Math.cos(settle * Math.PI * .75);
    }
    const impactPulse = Math.exp(-Math.pow((progress - .67) / .13, 2));
    return {
      distanceFactor,
      scale: 1 + .065 * impactPulse,
      color: collisionColorProgress(clamp((progress - .18) / .78, 0, 1))
    };
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
  function activeEffectColors() {
    const count = clamp(Number($("ibColorCount").value) || 1, 1, 4);
    return [$("ibColorA").value, $("ibColorB").value, $("ibColorC").value, $("ibColorD").value].slice(0, count);
  }
  function finalEffectColor() {
    const colors = activeEffectColors();
    return colors[colors.length - 1] || $("ibColorA").value;
  }
  function sampleColorList(colors, progress) {
    if (!colors.length) return $("ibBaseColor").value;
    if (colors.length === 1) return colors[0];
    const scaled = clamp(progress, 0, .9999) * (colors.length - 1);
    const index = Math.floor(scaled);
    return mixHex(colors[index], colors[index + 1], scaled - index);
  }
  function colorUniformProgress(colorReveal) {
    return smoothstep(clamp((colorReveal - .68) / .32, 0, 1));
  }
  function colorWaveAlpha(index, count, colorReveal) {
    if (count <= 1) return smoothstep(colorReveal);
    const midpoint = (count - 1) / 2;
    const distance = Math.abs(index - midpoint) / Math.max(1, midpoint);
    // Each letter overlaps the next one instead of switching as a hard batch.
    // The outermost letters deliberately finish at reveal=1.
    const start = Math.max(0, distance - .15);
    const end = distance > .999 ? 1 : Math.min(1, distance + .05);
    return smoothstep(clamp((colorReveal - start) / Math.max(.001, end - start), 0, 1));
  }
  function palette() { return [$("ibBaseColor").value].concat(activeEffectColors()); }
  function samplePalette(progress) {
    return sampleColorList(palette(), progress);
  }

  function defaultAsset(overrides) {
    return Object.assign({
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: "shape",
      role: "orbit",
      name: "内置图形",
      shape: "ring",
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
    // Default matches the user-approved Desktop/好.json scheme.
    const orbitAssets = [
      animalAsset(7, "orbit", { size: 1.25, x: -12, y: 43, rotation: 8 }),
      flowIconAsset(0, "orbit", { size: .66, x: 9, y: 3, rotation: -34 }),
      flowIconAsset(2, "orbit", { size: .44, x: 12, y: 39, rotation: 7, motion: "burst" }),
      animalAsset(14, "orbit", { size: .92, x: -21, y: 28, rotation: -5 }),
      botAsset(4, "orbit", { id: "asset-1787541798107-f7srpo4wp74", size: 1.17, x: 21, y: 18 }),
      botAsset(8, "orbit", { id: "asset-1787541786819-8txbw0ri9u5", size: 1.17, x: 27, y: -15 }),
      animalAsset(16, "orbit", { id: "asset-1787546329677-4v6f2tev1t3", size: 1.88, x: -14 }),
      animalAsset(0, "orbit", { size: 1.39, x: 34, y: -5, rotation: -7 }),
      animalAsset(22, "orbit", { size: .86, x: -33, rotation: 6 }),
      botAsset(9, "orbit", { id: "asset-1787546594968-2i0m9arp6m8", x: 9, y: 80 }),
      defaultAsset({
        id: "builtin-2",
        builtin: true,
        role: "orbit",
        name: "内置彩虹圆环",
        shape: "rainbow-ring",
        color: "#c35088",
        color2: "#c35088",
        size: .25,
        x: -26,
        y: -9,
        rotation: -8
      }),
      botAsset(5, "orbit", { id: "asset-1787541806043-k5p68ob6sjq", size: 1.15, x: -13, y: -31 }),
      botAsset(0, "orbit", { id: "asset-1787541793520-prqzk1jrof", size: .69, x: 34, y: 66 }),
      animalAsset(1, "orbit", { id: "asset-1787545440266-t9ixo4q0zp", size: 1.71, x: 3, y: -41, rotation: 8, motion: "float" }),
      animalAsset(28, "orbit", { id: "asset-1787545462401-ufm9pq0nnuq", size: .74, x: -3, y: -6 }),
      animalAsset(30, "orbit", { id: "asset-1787545485795-htbyjo3maq", x: 21, y: -23 }),
      flowIconAsset(1, "orbit", { size: .5, x: 7, y: 77, rotation: -4 })
    ];
    const glyphAssets = [
      animalAsset(4, "glyph", {
        id: "glyph-animal-default",
        size: 1.08,
        x: 3,
        target: 3,
        sequence: 0,
        replaceSpeed: .75,
        holdMs: 240
      }),
      animalAsset(20, "glyph", {
        id: "asset-1787548078283-aadgpae989o",
        size: 1.28,
        target: 1,
        sequence: 1,
        holdMs: 400
      }),
      defaultAsset({
        id: "glyph-3",
        builtin: true,
        role: "glyph",
        name: "替字圆环",
        shape: "ring",
        color: iconColors[4][0],
        color2: iconColors[4][1],
        size: 1.08,
        motion: "replace",
        target: 7,
        sequence: 2,
        replaceSpeed: 1.8
      }),
      botAsset(10, "glyph", {
        id: "asset-1787548088170-o2942v3cenr",
        size: 1.2,
        x: 6,
        y: 3,
        target: 8,
        sequence: 3,
        holdMs: 1000
      }),
      botAsset(2, "glyph", {
        id: "asset-1787554949010-orgtjde8pw",
        size: 1.17,
        target: -1,
        sequence: 4,
        holdMs: 600
      })
    ];
    return orbitAssets.concat(glyphAssets);
  }

  function activeAsset() { return state.assets.find((asset) => asset.id === state.activeAssetId) || null; }
  function contentMode() { return $("ibContentMode").value; }
  function replacementEnabled() { return contentMode() === "replace-one" || contentMode() === "replace-multi"; }
  function shapeMarkup(asset) {
    return `<span class="ib-geom ${asset.shape || "ring"}" style="--c1:${asset.color};--c2:${asset.color2 || asset.color}"></span>`;
  }
  function assetPreview(asset) {
    if (asset.type === "image") return asset.url ? `<img src="${asset.url}" alt="">` : '<span class="ib-image-empty">＋</span>';
    return shapeMarkup(asset);
  }

  function renderImageLibraries() {
    const renderLibrary = (libraryId, images) => {
      $(libraryId).innerHTML = images.map((image, index) => `<button type="button" data-image-index="${index}" title="添加${safe(image.name)}"><img src="${image.url}" alt="${safe(image.name)}" loading="lazy"><span>${String(index + 1).padStart(2, "0")}</span></button>`).join("");
    };
    renderLibrary("ibOrbitImageLibrary", transparentAnimalImages);
    renderLibrary("ibGlyphImageLibrary", transparentAnimalImages);
    renderLibrary("ibOrbitBotLibrary", botSeriesImages);
    renderLibrary("ibGlyphBotLibrary", botSeriesImages);
    renderLibrary("ibOrbitFlowLibrary", flowIconImages);
    renderLibrary("ibGlyphFlowLibrary", flowIconImages);
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
        <span class="ib-drag-handle" role="button" tabindex="0" aria-label="上下拖动${safe(asset.name)}调整位置" title="按住上下拖动">⋮⋮</span>
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
    scheduleSchemePersist();
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

  function commitAssetOrder(list) {
    const glyphList = list.id === "ibGlyphItems";
    const orderedIds = Array.from(list.querySelectorAll(".ib-asset"), (row) => row.dataset.id);
    const orderedAssets = orderedIds.map((id) => state.assets.find((asset) => asset.id === id)).filter(Boolean);
    if (glyphList) orderedAssets.forEach((asset, index) => { asset.sequence = index; });
    let cursor = 0;
    state.assets = state.assets.map((asset) => {
      const belongsToList = glyphList ? asset.role === "glyph" : asset.role !== "glyph";
      return belongsToList ? orderedAssets[cursor++] : asset;
    });
    renderIcons();
    renderAssets();
  }

  function setLayerManager(panel, expanded) {
    if (!panel) return;
    $("ibAssetDrawer").hidden = true;
    $("ibAssetEditor").hidden = true;
    document.querySelectorAll(".ib-layer-panel.is-list-expanded").forEach((item) => {
      if (item !== panel) {
        item.classList.remove("is-list-expanded");
        const otherToggle = item.querySelector("[data-layer-toggle]");
        if (otherToggle) {
          otherToggle.textContent = "展开已选";
          otherToggle.setAttribute("aria-expanded", "false");
        }
      }
    });
    panel.classList.toggle("is-list-expanded", expanded);
    if (expanded) {
      const editorWidth = document.querySelector(".ib-editor")?.getBoundingClientRect().width;
      if (editorWidth) panel.style.setProperty("--panel", `${editorWidth}px`);
    }
    const toggle = panel.querySelector("[data-layer-toggle]");
    if (toggle) {
      toggle.textContent = expanded ? "收起" : "展开已选";
      toggle.setAttribute("aria-expanded", String(expanded));
    }
    document.body.classList.toggle("ib-list-manager-open", Boolean(document.querySelector(".ib-layer-panel.is-list-expanded")));
    if (expanded) panel.scrollTop = 0;
  }

  $("ibAssets").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-layer-toggle]");
    if (!toggle) return;
    const panel = toggle.closest(".ib-layer-panel");
    setLayerManager(panel, !panel.classList.contains("is-list-expanded"));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("ibAssetDrawer").hidden) {
      $("ibAssetDrawer").hidden = true;
      $("ibAssetEditor").hidden = true;
      return;
    }
    const panel = document.querySelector(".ib-layer-panel.is-list-expanded");
    if (panel) setLayerManager(panel, false);
  });

  window.addEventListener("resize", () => {
    const panel = document.querySelector(".ib-layer-panel.is-list-expanded");
    const editorWidth = document.querySelector(".ib-editor")?.getBoundingClientRect().width;
    if (panel && editorWidth) panel.style.setProperty("--panel", `${editorWidth}px`);
    if (!$("ibAssetDrawer").hidden && editorWidth) {
      $("ibAssetDrawer").style.setProperty("--asset-drawer-left", `${editorWidth}px`);
      $("ibAssetDrawer").style.setProperty("--asset-drawer-width", `${Math.min(420, Math.max(0, window.innerWidth - editorWidth))}px`);
    }
  }, { passive: true });

  let assetDrag = null;
  let suppressAssetClickUntil = 0;

  $("ibAssets").addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".ib-drag-handle");
    const row = event.target.closest(".ib-asset");
    const list = row?.closest(".ib-layer-items");
    const interactive = event.target.closest("button, select, input, textarea, label, a");
    if (!row || !list || (!handle && interactive)) return;
    // Mouse users can grab anywhere on the card. On touch screens the visible
    // handle remains the drag target so normal vertical page scrolling works.
    if (event.pointerType !== "mouse" && !handle) return;
    row.setPointerCapture?.(event.pointerId);
    assetDrag = {
      handle,
      row,
      list,
      pointerId: event.pointerId,
      startY: event.clientY,
      started: false,
      moved: false
    };
  });

  window.addEventListener("pointermove", (event) => {
    if (!assetDrag || event.pointerId !== assetDrag.pointerId) return;
    if (!assetDrag.started && Math.abs(event.clientY - assetDrag.startY) < 5) return;
    event.preventDefault();
    if (!assetDrag.started) {
      assetDrag.started = true;
      assetDrag.row.classList.add("is-dragging");
      assetDrag.handle?.setAttribute("aria-grabbed", "true");
    }
    const { row, list } = assetDrag;
    const scrollSurface = list.closest(".ib-layer-panel.is-list-expanded") || document.querySelector(".ib-editor");
    const editorRect = scrollSurface?.getBoundingClientRect();
    if (scrollSurface && editorRect) {
      const edge = 72;
      let scrollDelta = 0;
      if (event.clientY < editorRect.top + edge) scrollDelta = -18;
      else if (event.clientY > editorRect.bottom - edge) scrollDelta = 18;
      if (scrollDelta) {
        const editorStyle = getComputedStyle(scrollSurface);
        if (editorStyle.overflowY === "auto" || editorStyle.overflowY === "scroll") scrollSurface.scrollTop += scrollDelta;
        else window.scrollBy(0, scrollDelta);
      }
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".ib-asset");
    if (!target || target === row || target.parentElement !== list) return;
    const targetRect = target.getBoundingClientRect();
    const pointerInsideRow = event.clientY >= targetRect.top && event.clientY <= targetRect.bottom;
    const multiColumn = getComputedStyle(list).gridTemplateColumns.split(" ").length > 1;
    const before = multiColumn && pointerInsideRow
      ? event.clientX < targetRect.left + targetRect.width / 2
      : event.clientY < targetRect.top + targetRect.height / 2;
    const reference = before ? target : target.nextElementSibling;
    if (reference !== row && (!reference || reference.previousElementSibling !== row)) {
      list.insertBefore(row, reference);
      assetDrag.moved = true;
    }
  }, { passive: false });

  function finishAssetDrag(event) {
    if (!assetDrag || (event.pointerId != null && event.pointerId !== assetDrag.pointerId)) return;
    const { handle, row, list, pointerId, moved, started } = assetDrag;
    row.releasePointerCapture?.(pointerId);
    handle?.removeAttribute("aria-grabbed");
    row.classList.remove("is-dragging");
    if (started) suppressAssetClickUntil = performance.now() + 300;
    assetDrag = null;
    if (moved) commitAssetOrder(list);
  }

  window.addEventListener("pointerup", finishAssetDrag);
  window.addEventListener("pointercancel", finishAssetDrag);

  $("ibAssets").addEventListener("keydown", (event) => {
    const handle = event.target.closest(".ib-drag-handle");
    if (!handle || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const row = handle.closest(".ib-asset");
    const list = row.closest(".ib-layer-items");
    const sibling = event.key === "ArrowUp" ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    if (event.key === "ArrowUp") list.insertBefore(row, sibling);
    else list.insertBefore(sibling, row);
    commitAssetOrder(list);
    list.querySelector(`[data-id="${row.dataset.id}"] .ib-drag-handle`)?.focus();
  });

  function renderAssetEditor() {
    const editor = $("ibAssetEditor");
    const drawer = $("ibAssetDrawer");
    const asset = activeAsset();
    $("ibOrbitPanel").classList.toggle("is-editing", Boolean(asset && asset.role !== "glyph"));
    $("ibGlyphPanel").classList.toggle("is-editing", Boolean(asset && asset.role === "glyph"));
    const panel = asset ? $(asset.role === "glyph" ? "ibGlyphPanel" : "ibOrbitPanel") : null;
    const showDrawer = Boolean(asset && panel?.classList.contains("is-list-expanded"));
    drawer.hidden = !showDrawer;
    editor.hidden = !showDrawer;
    if (!showDrawer) return;
    const editorWidth = document.querySelector(".ib-editor")?.getBoundingClientRect().width || 420;
    drawer.style.setProperty("--asset-drawer-left", `${editorWidth}px`);
    drawer.style.setProperty("--asset-drawer-width", `${Math.min(420, Math.max(0, window.innerWidth - editorWidth))}px`);
    $("ibActiveAsset").textContent = `${asset.role === "glyph" ? "字体图标" : "环绕图标"} · ${asset.name}`;
    $("ibAssetSource").value = asset.type;
    $("ibAssetShapeFields").hidden = asset.type !== "shape";
    $("ibAssetImageFields").hidden = asset.type !== "image";
    $("ibAssetShape").value = asset.shape || "ring";
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
    renderChoreoTrack();
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
    const family = window.STGFontLibrary?.family($("ibFont").value) || fontMap[$("ibFont").value] || "IBSpace";
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
    const overlayColors = activeEffectColors();
    overlayLetters.forEach((letter, index) => {
      const progress = overlayLetters.length > 1 ? index / (overlayLetters.length - 1) : 0;
      const effectColor = sampleColorList(overlayColors, progress);
      letter.dataset.effectColor = effectColor;
      letter.style.setProperty("--overlay-color", effectColor);
    });
    stage.style.setProperty("--stage-bg", $("ibBackground").value);
  }

  function updateColorCountUI() {
    const count = clamp(Number($("ibColorCount").value) || 1, 1, 4);
    document.querySelectorAll("[data-color-slot]").forEach((label) => { label.hidden = Number(label.dataset.colorSlot) > count; });
    document.querySelector(".ib-colors")?.style.setProperty("--active-colors", String(count));
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
    renderChoreoTrack();
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
    const scaleX = composition.offsetWidth ? compositionRect.width / composition.offsetWidth : 1;
    const scaleY = composition.offsetHeight ? compositionRect.height / composition.offsetHeight : 1;
    state.letterAnchors = Array.from(word.children).map((letter) => {
      const rect = letter.getBoundingClientRect();
      return {
        x: (rect.left + rect.width / 2 - (compositionRect.left + compositionRect.width / 2)) / Math.max(.001, scaleX),
        y: (rect.top + rect.height / 2 - (compositionRect.top + compositionRect.height / 2)) / Math.max(.001, scaleY)
      };
    });
    return state.letterAnchors;
  }

  function lightLetter(letter, color, intensity) {
    const level = clamp(intensity, 0, 1);
    letter.style.setProperty("--letter-color", mixHex($("ibBaseColor").value, color, level));
  }

  function linearSweepColor(index, count, colorReveal, whiteReveal = 0) {
    const base = $("ibBaseColor").value;
    const colors = activeEffectColors();
    if (!colors.length) return base;
    const position = count > 1 ? index / (count - 1) : 0;
    const softness = .04 + clamp(Number($("ibSoftness").value), 0, 100) / 100 * .09;
    // Keep every enabled swatch inside the visible sweep trail. The previous
    // narrow trail compressed intermediate selected colors until they were
    // almost invisible and made the sweep appear to ignore them.
    const paletteWidth = .20 + colors.length * .14;
    const colorTravel = 1 + paletteWidth + softness * 2;
    const colorHead = -softness + colorTravel * clamp(colorReveal, 0, 1);
    const coverage = smoothstep(clamp((colorHead - position + softness) / (softness * 2), 0, 1));
    const paletteProgress = clamp((colorHead - position) / paletteWidth, 0, 1);
    let color = mixHex(base, sampleColorList(colors, paletteProgress), coverage);
    // The return to the base color uses the same left-to-right light front,
    // preventing the fully colored word from snapping back in one frame.
    if (whiteReveal > 0) {
      const whiteHead = -.08 + 1.38 * clamp(whiteReveal, 0, 1);
      const whiteCoverage = smoothstep(clamp((whiteHead - position + softness) / (softness * 2), 0, 1));
      color = mixHex(color, base, whiteCoverage);
    }
    return color;
  }

  function applyLinearSweep(letters, colorReveal, whiteReveal = 0) {
    const count = letters.length;
    letters.forEach((letter, index) => {
      if (!letter.textContent.trim()) return;
      letter.style.setProperty("--letter-color", linearSweepColor(index, count, colorReveal, whiteReveal));
    });
  }

  function animateColor(contentTime, oneShot) {
    const mode = $("ibColorMode").value;
    const letters = Array.from(word.children);
    if (!letters.length) return "等待文字";
    const speed = Number($("ibColorSpeed").value);
    const hold = Number($("ibSoftness").value) / 100;
    const time = Math.max(0, contentTime * speed);
    const effectColors = activeEffectColors();
    if (mode === "flash") {
      const cycle = 560 + hold * 420;
      const local = oneShot ? time : time % cycle;
      const intensity = local < cycle * .62 ? 1 : 0;
      letters.forEach((letter, index) => lightLetter(letter, effectColors[index % effectColors.length], intensity));
      return "全体瞬时换色";
    }
    if (mode === "chase" || mode === "relay") {
      const stagger = mode === "chase" ? 32 : 22;
      const cycle = Math.max(470, letters.length * stagger + 260 + hold * 260);
      const local = oneShot ? time : time % cycle;
      letters.forEach((letter, index) => {
        const letterTime = local - index * stagger;
        const intensity = letterTime >= 0 && letterTime < 210 + hold * 180 ? 1 : 0;
        lightLetter(letter, effectColors[index % effectColors.length], intensity);
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
        lightLetter(letter, effectColors[index % effectColors.length], intensity);
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
      letters.forEach((letter, index) => lightLetter(letter, effectColors[index % effectColors.length], on ? 1 : 0));
      return "整体颜色闪切";
    }
    if (mode === "cut") {
      const beat = Math.floor(time / 150);
      letters.forEach((letter, index) => lightLetter(letter, effectColors[(beat + index) % effectColors.length], 1));
      return "高速节拍硬切";
    }
    return "保持初始色";
  }

  function glyphPlaybackConfig() {
    const glyphAssets = state.assets.filter((asset) => asset.role === "glyph").sort((a, b) => Number(a.sequence) - Number(b.sequence));
    const requestedCount = $("ibReplaceCount").value === "all" ? glyphAssets.length : Number($("ibReplaceCount").value);
    const usableLetterCount = Math.max(1, Array.from($("ibText").value || "GOOD JOB").filter((character) => character.trim()).length);
    // More simultaneous icons than visible letters can only overlap. Spill
    // excess assets into the next playback group instead of stacking them.
    const count = contentMode() === "replace-one" ? 1 : Math.min(Math.max(1, requestedCount), Math.max(1, glyphAssets.length), usableLetterCount);
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

  function incomingPairCount() {
    const ranks = [incomingLeft, incomingRight].flatMap((side) => Array.from(side.children).map((letter) => Number(letter.dataset.rank || 0)));
    return Math.max(1, (ranks.length ? Math.max(...ranks) : 0) + 1);
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
    const pairCount = incomingPairCount();
    const collisionSpeed = clamp(Number($("ibCollisionSpeed").value), .5, 3);
    const pairStaggerSeconds = clamp(Number($("ibPairStagger").value) / 1000 / collisionSpeed, .015, .52);
    const collisionDurationSeconds = clamp(Number($("ibCollisionDuration").value) / 1000 / collisionSpeed, .04, 1.60);
    // The centre pair starts while the icon cloud is still suspended. Each
    // following pair joins in rank order, so arbitrary text lengths generate
    // their own collision choreography instead of collapsing all at once.
    const contactStartSeconds = collapseStartSeconds + .03;
    const lastPairOffsetSeconds = collisionPairStartOffset(pairCount - 1, pairCount - 1, pairStaggerSeconds);
    const contactSeconds = Math.max(iconsGoneSeconds, contactStartSeconds + collisionDurationSeconds + lastPairOffsetSeconds);
    // Color begins with the centre pair, not after every pair has already
    // arrived. This overlap is the visual hand-off between collision and color.
    const lettersMoveStart = contactStartSeconds;
    const colorSpeed = clamp(Number($("ibColorSpeed").value), .5, 24);
    const colorHold = clamp(Number($("ibSoftness").value), 8, 70);
    // The colored front has its own clock. It must not inherit the duration of
    // the last colliding pair or the speed control becomes visually inert.
    const colorDuration = clamp(.55 * (5 / colorSpeed), .11, 2.50);
    const colorHoldDuration = clamp(.02 + (colorHold - 28) / 42 * .16, .01, .18);
    const whiteDuration = clamp(.20 * (5 / colorSpeed), .04, .80);
    const colorFullSeconds = lettersMoveStart + colorDuration;
    // A fast sweep can finish while the outer letters are still arriving.
    // Keep its final selected color until the word is compact, then return to
    // the base color before in-place glyph replacement begins.
    const whiteStartSeconds = Math.max(colorFullSeconds + colorHoldDuration, contactSeconds + .02);
    const whiteFullSeconds = whiteStartSeconds + whiteDuration;
    const replaceStartSeconds = whiteFullSeconds + .04;
    return {
      settleEnd,
      wordsEnterStart,
      wordReturnDuration,
      holdEndSeconds,
      collapseStartSeconds,
      iconsGoneSeconds,
      contactStartSeconds,
      contactSeconds,
      pairCount,
      pairStaggerSeconds,
      collisionDurationSeconds,
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

  function seekToSeconds(seconds) {
    const rate = Math.max(.01, Number($("ibSpeed").value));
    const elapsed = Math.max(0, seconds) * 1000 / rate;
    state.start = performance.now() - elapsed;
    state.pausedAt = elapsed;
  }

  function choreoBeats(playback = glyphPlaybackConfig()) {
    const markers = timelineMarkers();
    const total = animationDuration(playback) / 1000;
    return [
      { id: "intro", kind: "intro", label: "中央标题与图标起步", start: 0, end: markers.wordsEnterStart },
      { id: "orbit", kind: "orbit", label: "文字接入 · 图标聚拢", start: markers.wordsEnterStart, end: markers.settleEnd },
      { id: "hold", kind: "hold", label: "图标滞空继续流动", start: markers.settleEnd, end: markers.contactStartSeconds },
      { id: "contact", kind: "contact", label: `${markers.pairCount} 对字体逐对靠拢并同步换色`, start: markers.contactStartSeconds, end: markers.contactSeconds },
      { id: "color", kind: "color", label: "换色完成与复位", start: markers.contactSeconds, end: markers.replaceStartSeconds },
      { id: "replace", kind: "replace", label: replacementEnabled() ? "文字切换图标 / 图片" : "紧凑标题停留", start: markers.replaceStartSeconds, end: total }
    ].filter((beat) => beat.end > beat.start + .001);
  }

  function renderChoreoTrack() {
    const track = $("ibChoreoTrack");
    if (!track) return;
    const beats = choreoBeats();
    const total = Math.max(.001, beats[beats.length - 1]?.end || state.duration / 1000);
    const scroll = document.createElement("div");
    scroll.className = "ib-choreo-scroll";
    const bar = document.createElement("div");
    bar.className = "ib-choreo-bar";
    beats.forEach((beat, index) => {
      const block = document.createElement("div");
      block.className = `ib-choreo-block is-${beat.kind}`;
      block.dataset.beat = beat.id;
      block.tabIndex = 0;
      block.style.flex = `${Math.max(.08, beat.end - beat.start)} 1 0`;
      block.innerHTML = `<em>${index + 1}</em><strong>${beat.label}</strong><small>${(beat.end - beat.start).toFixed(2)}秒</small>`;
      const jump = () => seekToSeconds(beat.start);
      block.addEventListener("click", jump);
      block.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") jump(); });
      bar.append(block);
    });
    const playhead = document.createElement("div");
    playhead.className = "ib-choreo-playhead";
    playhead.id = "ibChoreoPlayhead";
    bar.append(playhead);
    scroll.append(bar);
    const legend = document.createElement("ol");
    legend.className = "ib-choreo-legend";
    beats.forEach((beat, index) => {
      const item = document.createElement("li");
      item.innerHTML = `<i class="is-${beat.kind}"></i><b>${index + 1}. ${beat.label}</b><span>${beat.start.toFixed(2)}s → ${beat.end.toFixed(2)}s</span>`;
      legend.append(item);
    });
    track.replaceChildren(scroll, legend);
    const head = $("ibChoreoPlayhead");
    if (head) head.style.left = "0%";
    track.dataset.duration = String(total);
  }

  let choreoRenderPending = false;
  function scheduleChoreoRender() {
    if (choreoRenderPending) return;
    choreoRenderPending = true;
    requestAnimationFrame(() => { choreoRenderPending = false; renderChoreoTrack(); });
  }

  function updateChoreoPlayhead(seconds) {
    const beats = choreoBeats();
    const total = Math.max(.001, beats[beats.length - 1]?.end || 1);
    const current = beats.find((beat) => seconds >= beat.start && seconds < beat.end) || beats[beats.length - 1];
    const head = $("ibChoreoPlayhead");
    if (head) head.style.left = `${clamp(seconds / total, 0, 1) * 100}%`;
    document.querySelectorAll(".ib-choreo-block[data-beat]").forEach((block) => block.classList.toggle("is-active", block.dataset.beat === current?.id));
    if ($("ibChoreoBeat") && current) $("ibChoreoBeat").textContent = `${beats.indexOf(current) + 1} · ${current.label}`;
  }

  const SCHEME_STORAGE_KEY = "iconburst-scheme-v2";
  const schemeControlIds = [
    "ibText", "ibFont", "ibWeight", "ibFontSize", "ibTracking",
    "ibColorMode", "ibColorCount", "ibBaseColor", "ibColorA", "ibColorB", "ibColorC", "ibColorD", "ibBackground", "ibColorSpeed", "ibSoftness",
    "ibContentMode", "ibRange", "ibSize", "ibReplaceCount", "ibBeat", "ibReplaceSpeed", "ibCollapse", "ibClusterX", "ibHang", "ibDrift", "ibOvershoot",
    "ibSync", "ibCollisionSpeed", "ibCollisionDuration", "ibPairStagger", "ibOrbitSpeed", "ibWordReturn", "ibDensity", "ibCurve", "ibFinalScale", "ibFinalScaleDuration", "ibSpeed"
  ];
  const defaultControlValues = Object.fromEntries(schemeControlIds.map((id) => [id, $(id).value]));
  const latestDefaultControls = {
    ibText: "GOOD  JOB",
    ibFont: "archivoBlack",
    ibWeight: "800",
    ibFontSize: "88",
    ibTracking: "-2",
    ibColorMode: "unfold",
    ibColorCount: "3",
    ibBaseColor: "#050505",
    ibColorA: "#6c3df0",
    ibColorB: "#b84dff",
    ibColorC: "#9a6ddf",
    ibColorD: "#bf73e7",
    ibBackground: "#f5f5f5",
    ibColorSpeed: "9.7",
    ibSoftness: "8",
    ibContentMode: "replace-multi",
    ibRange: "98",
    ibSize: "100",
    ibReplaceCount: "all",
    ibBeat: "80",
    ibReplaceSpeed: "4.5",
    ibCollapse: "91",
    ibClusterX: "-14",
    ibHang: "20",
    ibDrift: "22",
    ibOvershoot: "58",
    ibSync: "155",
    ibCollisionSpeed: "2",
    ibCollisionDuration: "210",
    ibPairStagger: "40",
    ibOrbitSpeed: "145",
    ibWordReturn: "360",
    ibDensity: "85",
    ibCurve: "58",
    ibFinalScale: "4",
    ibFinalScaleDuration: "300",
    ibSpeed: "1"
  };

  function serializableAsset(asset) {
    const copy = {};
    Object.entries(asset).forEach(([key, value]) => {
      if (["originalImage", "processing"].includes(key) || typeof value === "function") return;
      copy[key] = value;
    });
    copy.processing = false;
    return copy;
  }

  function collectScheme() {
    return {
      version: 3,
      controls: Object.fromEntries(schemeControlIds.map((id) => [id, $(id).value])),
      assets: state.assets.map(serializableAsset),
      backgroundMedia: state.backgroundMedia ? {
        name: state.backgroundMedia.name,
        type: state.backgroundMedia.type,
        dataUrl: state.backgroundMedia.dataUrl
      } : null
    };
  }

  function hydrateAssetImage(asset) {
    if (asset.type !== "image" || !asset.url) return;
    loadImage(asset.url).then((image) => { asset.originalImage = image; }).catch(() => {
      asset.status = "图片未能重新载入，请重新选择该素材。";
    });
  }

  function migrateAsset(asset) {
    const migrated = defaultAsset(asset);
    if (migrated.name === "流墙音乐" || /flow-icon-0$/.test(migrated.id || "")) {
      migrated.name = flowIconImages[0].name;
      migrated.url = flowIconImages[0].url;
      migrated.originalDataUrl = flowIconImages[0].url;
      migrated.fileType = "image/svg+xml";
    }
    if (migrated.type === "image" && /animal-05\.png(?:$|[?#])/.test(migrated.url || "")) {
      migrated.name = "鲸鱼";
    }
    return migrated;
  }

  function applyScheme(scheme, options = {}) {
    if (!scheme || typeof scheme !== "object") return;
    const controls = { ...(scheme.controls || {}) };
    if (Number(scheme.version || 0) < 3 && Number(controls.ibPairStagger || 0) <= 50) controls.ibPairStagger = 95;
    Object.entries(controls).forEach(([id, value]) => { if ($(id) && value != null) $(id).value = String(value); });
    state.assets = Array.isArray(scheme.assets)
      ? scheme.assets.map(migrateAsset).filter((asset) => asset.type !== "shape" || !["square", "triangle", "heart", "circle"].includes(asset.shape))
      : builtinAssets();
    normalizeGlyphSequence();
    setBackgroundMedia(scheme.backgroundMedia || null);
    state.assets.forEach(hydrateAssetImage);
    state.activeAssetId = null;
    updateWord();
    updateColorCountUI();
    updateContentModeUI();
    renderIcons();
    renderAssets();
    readouts.forEach(([id, output, format]) => { if ($(id) && $(output)) $(output).textContent = format($(id).value); });
    renderChoreoTrack();
    restart();
    if (options.status && $("ibSchemeStatus")) $("ibSchemeStatus").textContent = options.status;
  }

  function defaultScheme(includeAssets = true) {
    return { version: 3, controls: { ...defaultControlValues, ...latestDefaultControls }, assets: includeAssets ? builtinAssets().map(serializableAsset) : [], backgroundMedia: null };
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  let schemePersistTimer = 0;
  function scheduleSchemePersist() {
    if (previewMode) return;
    clearTimeout(schemePersistTimer);
    schemePersistTimer = setTimeout(() => {
      try { localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme())); } catch (_) {}
    }, 250);
  }

  function resolveReplacementTargets(timings, usableTargets, groupIndex) {
    if (!usableTargets.length) return timings.map(() => 0);
    const usableIndices = new Set(usableTargets.map((item) => item.index));
    const resolved = Array(timings.length).fill(null);
    const reserved = new Set();
    const automatic = [];

    timings.forEach((timing, index) => {
      const requested = Number(timing.asset.target);
      if (requested >= 0 && usableIndices.has(requested)) {
        resolved[index] = requested;
        reserved.add(requested);
      } else {
        automatic.push(index);
      }
    });
    const hasExplicitTargets = reserved.size > 0;

    automatic.forEach((timingIndex, automaticIndex) => {
      const available = usableTargets.filter((item) => !reserved.has(item.index));
      let chosen;
      if (!available.length) {
        chosen = usableTargets[(groupIndex + automaticIndex) % usableTargets.length];
      } else if (!hasExplicitTargets) {
        const desiredPosition = automatic.length === 1
          ? groupIndex % usableTargets.length
          : Math.round(automaticIndex * (usableTargets.length - 1) / Math.max(1, automatic.length - 1));
        const desiredIndex = usableTargets[desiredPosition].index;
        chosen = available.reduce((best, item) => Math.abs(item.index - desiredIndex) < Math.abs(best.index - desiredIndex) ? item : best, available[0]);
      } else {
        chosen = available.reduce((best, item) => {
          const clearance = Math.min(...Array.from(reserved, (target) => Math.abs(item.index - target)));
          const bestClearance = Math.min(...Array.from(reserved, (target) => Math.abs(best.index - target)));
          return clearance > bestClearance ? item : best;
        }, available[0]);
      }
      resolved[timingIndex] = chosen.index;
      reserved.add(chosen.index);
    });

    return resolved;
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
    const resolvedTargets = resolveReplacementTargets(group.timings, usableTargets, groupIndex);
    group.timings.forEach((timing, offset) => {
      const { asset, transitionMs, holdMs } = timing;
      const enter = easeOut(clamp(groupTime / transitionMs, 0, 1));
      const exit = easeInOut(clamp((groupTime - transitionMs - holdMs) / transitionMs, 0, 1));
      const envelope = clamp(enter * (1 - exit), 0, 1);
      const target = resolvedTargets[offset];
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
      contactStartSeconds,
      contactSeconds,
      pairCount,
      pairStaggerSeconds,
      collisionDurationSeconds,
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
    const syncRate = clamp(Number($("ibSync").value) / 100, .50, 1.80);
    const overshootStrength = clamp(Number($("ibOvershoot").value) / 100, 0, 1);
    const iconMotionTime = (time) => Math.max(0, time * syncRate);
    const gatherAtSlowStart = sampleIconGather(iconMotionTime(settleEnd));
    const slowElapsed = clamp(seconds - settleEnd, 0, holdEndSeconds - settleEnd);
    const velocityWindow = .008;
    const gatherBeforeSlow = sampleIconGather(iconMotionTime(settleEnd - velocityWindow));
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
      ? sampleIconGather(iconMotionTime(seconds))
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
    const gapClose = seconds < contactStartSeconds
      ? 0
      : easeInOut(clamp((seconds - contactStartSeconds) / Math.max(.001, contactSeconds - contactStartSeconds), 0, 1));
    const letterContract = 1;

    let colorReveal = 0;
    if (seconds >= lettersMoveStart && seconds < colorFullSeconds) {
      colorReveal = smoothstep((seconds - lettersMoveStart) / Math.max(.001, colorFullSeconds - lettersMoveStart));
    } else if (seconds >= colorFullSeconds) colorReveal = 1;

    let whiteReveal = 0;
    if (seconds >= whiteStartSeconds && seconds < whiteFullSeconds) whiteReveal = easeInOut((seconds - whiteStartSeconds) / (whiteFullSeconds - whiteStartSeconds));
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
    else if (seconds >= contactStartSeconds && seconds < contactSeconds) { velocityZone = "title-contact"; label = "06 · 中心第一对开始 · 逐对靠拢并同步换色"; }
    else if (seconds >= contactSeconds && seconds < whiteStartSeconds) { velocityZone = "contact-color-expands"; label = "07 · 逐对碰合完成 · 颜色继续展开"; }
    else if (seconds >= whiteStartSeconds && seconds < whiteFullSeconds) { velocityZone = "white-reset-expands"; label = "07 · 白色从左向右扫回复位"; }
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
      contactProgress: clamp((seconds - contactStartSeconds) / Math.max(.001, contactSeconds - contactStartSeconds), 0, 1),
      collapseStartSeconds,
      iconsGoneSeconds,
      contactStartSeconds,
      contactSeconds,
      pairCount,
      pairStaggerSeconds,
      collisionDurationSeconds,
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
      syncRate,
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
    if (colorActive && colorMode === "sweep") applyLinearSweep(Array.from(word.children), timeline.colorReveal, timeline.whiteReveal);
    else if (colorActive && colorMode !== "unfold") animateColor(colorTime, true);
    if (colorMode !== "unfold" && colorMode !== "sweep" && timeline.colorReveal >= .999 && timeline.seconds < timeline.whiteStartSeconds) {
      Array.from(word.children).forEach((letter) => { if (letter.textContent.trim()) letter.style.setProperty("--letter-color", finalEffectColor()); });
    }
    if (replacementActive) label = "11 · 按资源顺序 · 使用各自速度与停留时间";
    phaseLabel.textContent = label;
    updateChoreoPlayhead(timeline.seconds);

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
    const collisionColors = activeEffectColors();
    const collisionBaseColor = $("ibBaseColor").value;
    const collisionLetterCount = Math.max(1, Array.from(word.children).length);
    [
      { element: incomingLeft, direction: -1 },
      { element: incomingRight, direction: 1 }
    ].forEach(({ element, direction }) => {
      const letters = Array.from(element.children);
      const maxRank = Math.max(0, ...letters.map((letter) => Number(letter.dataset.rank || 0)));
      letters.forEach((letter) => {
        const rank = Number(letter.dataset.rank || 0);
        const inwardOrder = rank;
        const letterStart = timeline.contactStartSeconds + collisionPairStartOffset(rank, maxRank, timeline.pairStaggerSeconds);
        const localProgress = clamp((timeline.seconds - letterStart) / timeline.collisionDurationSeconds, 0, 1);
        const beat = collisionBeat(localProgress);
        const rankRatio = maxRank > 0 ? rank / maxRank : 0;
        const openDistance = sideShift * (.88 + .12 * rankRatio);
        letter.style.setProperty("--incoming-letter-x", `${(direction * openDistance * beat.distanceFactor).toFixed(2)}px`);
        letter.style.setProperty("--incoming-letter-scale", beat.scale.toFixed(4));
        const letterIndex = clamp(Number(letter.dataset.letter || 0), 0, collisionLetterCount - 1);
        const collisionColor = colorMode === "sweep"
          ? linearSweepColor(letterIndex, collisionLetterCount, timeline.colorReveal, timeline.whiteReveal)
          : mixHex(collisionBaseColor, collisionColors[inwardOrder % collisionColors.length], beat.color);
        letter.style.setProperty("--incoming-letter-color", collisionColor);
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
    const replacementExpansion = 0;
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

    const uniformColorProgress = colorUniformProgress(timeline.colorReveal);
    const uniformColor = finalEffectColor();
    const colorLetters = Array.from(colorWord.children);
    colorLetters.forEach((letter) => {
      if (!letter.textContent.trim()) return;
      const transitionColor = letter.dataset.effectColor || uniformColor;
      letter.style.setProperty("--overlay-color", mixHex(transitionColor, uniformColor, uniformColorProgress));
    });

    const overlayActive = colorMode === "unfold" && timeline.seconds >= timeline.contactSeconds && timeline.seconds < timeline.replaceStartSeconds;
    colorWord.style.opacity = overlayActive ? "1" : "0";
    whiteWord.style.opacity = colorMode === "unfold" && timeline.seconds >= timeline.whiteStartSeconds && timeline.seconds < timeline.replaceStartSeconds ? "1" : "0";
    colorWord.style.setProperty("--color-sweep-inset", `${(50 * (1 - timeline.colorReveal)).toFixed(3)}%`);
    whiteWord.style.setProperty("--reveal-inset", `${(50 * (1 - timeline.whiteReveal)).toFixed(3)}%`);

    const range = Number($("ibRange").value) / 100;
    const iconSize = Number($("ibSize").value) / 100;
    const rect = { width: composition.clientWidth, height: composition.clientHeight };
    const letters = Array.from(word.children);
    const anchors = replacementActive ? getLetterAnchors() : [];
    const burst = 1 - clamp(timeline.pathProgress, 0, 1);
    const curveStrength = Number($("ibCurve").value) / 100;
    const orbitSpeed = clamp(Number($("ibOrbitSpeed").value) / 100, .5, 2);
    const clusterOffsetX = Number($("ibClusterX").value) / 100 * rect.width * .35 * easeInOut(clamp(timeline.iconGather / .85, 0, 1));
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
        anchorX = anchors[replacement.target].x;
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
      const translateX = replacement ? anchorX + customX + motionX : scatterX + customX + motionX + (asset.role === "orbit" ? clusterOffsetX : 0);
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
      contactStart: timeline.contactStartSeconds, contactEnd: timeline.contactSeconds,
      wordGap, openGap, closedGap, clusterOffsetX,
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

  function setBackgroundMedia(media) {
    backgroundVideo.pause();
    backgroundVideo.removeAttribute("src");
    backgroundVideo.load();
    backgroundImage.removeAttribute("src");
    backgroundImage.classList.remove("is-active");
    backgroundVideo.classList.remove("is-active");
    const valid = media && media.dataUrl && /^(image|video)\//i.test(media.type || "");
    state.backgroundMedia = valid ? { name: media.name || "背景素材", type: media.type, dataUrl: media.dataUrl } : null;
    backgroundMediaLayer.hidden = !state.backgroundMedia;
    $("ibClearBackground").disabled = !state.backgroundMedia;
    if (!state.backgroundMedia) {
      $("ibBackgroundStatus").textContent = "当前使用纯色背景";
      return;
    }
    const isVideo = /^video\//i.test(state.backgroundMedia.type);
    const element = isVideo ? backgroundVideo : backgroundImage;
    element.classList.add("is-active");
    element.src = state.backgroundMedia.dataUrl;
    $("ibBackgroundStatus").textContent = `${isVideo ? "视频" : /gif/i.test(state.backgroundMedia.type) ? "GIF" : "图片"}背景 · ${state.backgroundMedia.name}`;
    if (isVideo) {
      backgroundVideo.currentTime = 0;
      backgroundVideo.play().catch(() => {});
    }
  }

  function drawCover(ctx, media, width, height) {
    const sourceWidth = media.videoWidth || media.naturalWidth || media.width;
    const sourceHeight = media.videoHeight || media.naturalHeight || media.height;
    if (!sourceWidth || !sourceHeight) return;
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    ctx.drawImage(media, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function drawBackgroundToCanvas(ctx, width, height) {
    ctx.fillStyle = $("ibBackground").value;
    ctx.fillRect(0, 0, width, height);
    if (!state.backgroundMedia) return;
    if (/^video\//i.test(state.backgroundMedia.type)) {
      if (backgroundVideo.readyState >= 2) drawCover(ctx, backgroundVideo, width, height);
    } else if (backgroundImage.complete && backgroundImage.naturalWidth) {
      drawCover(ctx, backgroundImage, width, height);
    }
  }

  function waitForMedia(element, eventName, timeout = 1200) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        element.removeEventListener(eventName, finish);
        resolve();
      };
      element.addEventListener(eventName, finish, { once: true });
      setTimeout(finish, timeout);
    });
  }

  async function prepareBackgroundFrame(realSeconds) {
    if (!state.backgroundMedia) return;
    if (!/^video\//i.test(state.backgroundMedia.type)) {
      if (!backgroundImage.complete) await waitForMedia(backgroundImage, "load");
      return;
    }
    if (backgroundVideo.readyState < 2) await waitForMedia(backgroundVideo, "loadeddata", 2400);
    const duration = backgroundVideo.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const target = ((realSeconds % duration) + duration) % duration;
    if (Math.abs(backgroundVideo.currentTime - target) < .004) return;
    const seeked = waitForMedia(backgroundVideo, "seeked", 900);
    backgroundVideo.currentTime = target;
    await seeked;
  }

  function exportDimensions(verticalHD = false) {
    if (verticalHD) return [1080, 1920];
    const preset = $("ibExportPreset").value;
    if (preset === "current") return [Math.max(240, Math.round(stage.clientWidth)), Math.max(240, Math.round(stage.clientHeight))];
    if (preset === "custom") return [Number($("ibExportWidth").value), Number($("ibExportHeight").value)];
    return preset.split("x").map(Number);
  }

  function exportDurationSeconds() {
    const value = $("ibExportDuration").value;
    if (value === "cycle") return state.duration / 1000 / Math.max(.01, Number($("ibSpeed").value));
    if (value === "custom") return clamp(Number($("ibCustomDuration").value), .5, 30);
    return Number(value);
  }

  function makeExportCanvas(verticalHD = false) {
    const [rawWidth, rawHeight] = exportDimensions(verticalHD);
    const canvas = document.createElement("canvas");
    canvas.width = clamp(Math.round(rawWidth / 2) * 2, 240, 3840);
    canvas.height = clamp(Math.round(rawHeight / 2) * 2, 240, 3840);
    return canvas;
  }

  async function preloadExportAssets() {
    await Promise.all(state.assets.map(async (asset, index) => {
      if (asset.type !== "image" || !asset.url || asset.originalImage?.complete) return;
      const domImage = state.iconElements[index]?.querySelector("img");
      if (domImage?.complete && domImage.naturalWidth) { asset.originalImage = domImage; return; }
      try { asset.originalImage = await loadImage(asset.url); } catch (_) {}
    }));
    if (document.fonts?.ready) await document.fonts.ready;
  }

  function trackedLayout(ctx, text, tracking) {
    const characters = Array.from(text);
    const widths = characters.map((character) => ctx.measureText(character === " " ? "\u00a0" : character).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, characters.length - 1) * tracking;
    const centers = [];
    let cursor = -total / 2;
    widths.forEach((width) => { centers.push(cursor + width / 2); cursor += width + tracking; });
    return { characters, widths, centers, total };
  }

  function drawTrackedText(ctx, layout, centerX, baselineY, tracking, colorFor, hiddenTargets = new Set(), scale = 1) {
    ctx.save();
    ctx.translate(centerX, baselineY);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    layout.characters.forEach((character, index) => {
      if (hiddenTargets.has(index)) return;
      ctx.fillStyle = typeof colorFor === "function" ? colorFor(index, character) : colorFor;
      ctx.fillText(character === " " ? "\u00a0" : character, layout.centers[index], 0);
    });
    ctx.restore();
  }

  function drawAssetToCanvas(ctx, asset, x, y, size, rotation, alpha) {
    if (!(alpha > .001) || !(size > .1)) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    if (asset.type === "image" && asset.originalImage?.complete && asset.originalImage.naturalWidth) {
      const image = asset.originalImage;
      const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
      const width = ratio >= 1 ? size : size * ratio;
      const height = ratio >= 1 ? size / ratio : size;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      const half = size * .44;
      ctx.fillStyle = asset.color || "#ffcc00";
      ctx.strokeStyle = asset.color || "#ffcc00";
      ctx.lineWidth = Math.max(2, size * .09);
      ctx.beginPath();
      if (asset.shape === "circle") ctx.arc(0, 0, half, 0, Math.PI * 2);
      else if (asset.shape === "ring" || asset.shape === "rainbow-ring") ctx.arc(0, 0, half * .86, 0, Math.PI * 2);
      else if (asset.shape === "triangle") { ctx.moveTo(0, -half); ctx.lineTo(half, half); ctx.lineTo(-half, half); ctx.closePath(); }
      else if (asset.shape === "star") {
        for (let point = 0; point < 10; point += 1) {
          const radius = point % 2 ? half * .45 : half;
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
          if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else ctx.rect(-half, -half, half * 2, half * 2);
      if (asset.shape === "rainbow-ring") {
        const rainbow = ctx.createConicGradient(-Math.PI / 2, 0, 0);
        [[0, "#ff3b30"], [.17, "#ff9500"], [.34, "#ffcc00"], [.5, "#34c759"], [.67, "#0a84ff"], [.84, "#5856d6"], [1, "#ff2d8d"]].forEach(([stop, color]) => rainbow.addColorStop(stop, color));
        ctx.strokeStyle = rainbow;
        ctx.stroke();
      } else if (asset.shape === "ring") ctx.stroke(); else ctx.fill();
    }
    ctx.restore();
  }

  function exportTextColor(index, count, timeline) {
    const base = $("ibBaseColor").value;
    const mode = $("ibColorMode").value;
    if (mode === "sweep") return linearSweepColor(index, count, timeline.colorReveal, timeline.whiteReveal);
    if (timeline.seconds < timeline.contactSeconds) return base;
    if (timeline.colorReveal >= .999 && timeline.seconds < timeline.whiteStartSeconds) return finalEffectColor();
    if (mode === "flash") return base;
    const midpoint = (count - 1) / 2;
    const distance = Math.abs(index - midpoint) / Math.max(1, midpoint);
    if (mode === "unfold") {
      if (timeline.seconds >= timeline.whiteStartSeconds) {
        const whiteThreshold = timeline.whiteReveal;
        if (distance <= whiteThreshold) return base;
      }
      const colors = activeEffectColors();
      const progress = count > 1 ? index / (count - 1) : 0;
      const transitionColor = sampleColorList(colors, progress);
      const targetColor = mixHex(transitionColor, finalEffectColor(), colorUniformProgress(timeline.colorReveal));
      return mixHex(base, targetColor, colorWaveAlpha(index, count, timeline.colorReveal));
    }
    const progress = clamp((timeline.seconds - timeline.contactSeconds) / Math.max(.001, timeline.replaceStartSeconds - timeline.contactSeconds), 0, 1);
    return samplePalette(clamp(progress + index / Math.max(1, count) * .35, 0, 1));
  }

  function renderExportFrame(canvas, realSeconds) {
    const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    const width = canvas.width, height = canvas.height;
    drawBackgroundToCanvas(ctx, width, height);
    const playback = glyphPlaybackConfig();
    state.duration = animationDuration(playback);
    const speed = Math.max(.01, Number($("ibSpeed").value));
    const baseCycleSeconds = state.duration / 1000;
    const seconds = ((realSeconds * speed) % baseCycleSeconds + baseCycleSeconds) % baseCycleSeconds;
    const timeline = masterTimeline(seconds / baseCycleSeconds, baseCycleSeconds, playback.total);
    const family = window.STGFontLibrary?.family($("ibFont").value) || fontMap[$("ibFont").value] || "IBSpace";
    const screenScale = stage.clientWidth ? width / stage.clientWidth : 1;
    // Export from the same measured composition as the live preview. The old
    // renderer invented a second responsive layout (82% x 62%), so GIF/MP4
    // frames made the icon cluster smaller and the title gap wider than the
    // editor at the very same timestamp.
    const liveFontPx = parseFloat(getComputedStyle(word).fontSize) || 100;
    const fontPx = liveFontPx * screenScale;
    const liveIconPx = parseFloat(getComputedStyle(state.iconElements[0] || orbitLayer).width) || liveFontPx * .64;
    const exportIconPx = liveIconPx * screenScale;
    const compositionWidth = Math.max(1, composition.clientWidth * screenScale);
    const compositionHeight = Math.max(1, composition.clientHeight * screenScale);
    const tracking = Number($("ibTracking").value) * clamp(screenScale, .5, 4);
    ctx.font = `${$("ibWeight").value} ${fontPx}px "${family}"`;
    const text = $("ibText").value || "GOOD JOB";
    const layout = trackedLayout(ctx, text, tracking);
    const baseline = height / 2 + fontPx * .34;
    const finalScaleProgress = smoothstep(clamp(Math.max(0, seconds - timeline.replaceStartSeconds) * 1000 / clamp(Number($("ibFinalScaleDuration").value), 200, 1200), 0, 1));
    const finalScale = 1 + Number($("ibFinalScale").value) / 100 * finalScaleProgress;

    if (timeline.introOpacity > .001) {
      ctx.globalAlpha = timeline.introOpacity;
      drawTrackedText(ctx, layout, width / 2, baseline, tracking, $("ibBaseColor").value, new Set(), timeline.introScale);
      ctx.globalAlpha = 1;
    }

    const leftLetters = Array.from(incomingLeft.children);
    const rightLetters = Array.from(incomingRight.children);
    if (timeline.incomingOpacity > .001 && (leftLetters.length || rightLetters.length)) {
      ctx.save();
      ctx.globalAlpha = timeline.incomingOpacity;
      const leftText = leftLetters.map((letter) => letter.textContent).join("");
      const rightText = rightLetters.map((letter) => letter.textContent).join("");
      const leftLayout = trackedLayout(ctx, leftText, tracking);
      const rightLayout = trackedLayout(ctx, rightText, tracking);
      const closedGap = state.naturalGap ? fontPx * .18 : 0;
      const openGap = closedGap + clamp(stage.clientWidth * .22, 120, 260) * screenScale * Number($("ibCollapse").value) / 100;
      const sideShift = (openGap - closedGap) / 2;
      const orbitArc = Math.sin(Math.PI * timeline.incomingOrbit);
      const orbitShift = (1 - timeline.incomingOrbit) * clamp(width * .46, 120, width * .46) - orbitArc * width * .015 * Number($("ibCurve").value) / 100;
      const drawSide = (letters, sideLayout, direction, startX) => {
        const maxRank = Math.max(0, ...letters.map((letter) => Number(letter.dataset.rank || 0)));
        letters.forEach((letter, index) => {
          const rank = Number(letter.dataset.rank || 0);
          const letterStart = timeline.contactStartSeconds + collisionPairStartOffset(rank, maxRank, timeline.pairStaggerSeconds);
          const localProgress = clamp((timeline.seconds - letterStart) / timeline.collisionDurationSeconds, 0, 1);
          const beat = collisionBeat(localProgress);
          const rankRatio = maxRank > 0 ? rank / maxRank : 0;
          const openDistance = sideShift * (.88 + .12 * rankRatio);
          const x = startX + sideLayout.centers[index] + direction * openDistance * beat.distanceFactor + direction * orbitShift;
          const pairColors = activeEffectColors();
          const letterIndex = clamp(Number(letter.dataset.letter || 0), 0, Math.max(0, layout.characters.length - 1));
          ctx.fillStyle = $("ibColorMode").value === "sweep"
            ? linearSweepColor(letterIndex, layout.characters.length, timeline.colorReveal, timeline.whiteReveal)
            : mixHex($("ibBaseColor").value, pairColors[rank % pairColors.length], beat.color);
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.save();
          ctx.translate(x, baseline);
          ctx.scale(beat.scale, beat.scale);
          ctx.fillText(letter.textContent, 0, 0);
          ctx.restore();
        });
      };
      // The live grid always starts both halves at the natural/closed gap;
      // per-letter transforms create and close the temporary slot. Starting
      // at the animated gap here counted that slot twice in exported media.
      drawSide(leftLetters, leftLayout, -1, width / 2 - closedGap / 2 - leftLayout.total / 2);
      drawSide(rightLetters, rightLayout, 1, width / 2 + closedGap / 2 + rightLayout.total / 2);
      ctx.restore();
    }

    const replacementTime = Math.max(0, (seconds - timeline.replaceStartSeconds) * 1000);
    const replacementActive = replacementEnabled() && seconds >= timeline.replaceStartSeconds && seconds < timeline.replaceEnd * baseCycleSeconds;
    const replacements = replacementState(replacementTime, replacementActive, playback);
    const hiddenTargets = new Set();
    const glyphsToDraw = [];
    replacements.forEach((replacement, assetId) => {
      if (replacement.swap) hiddenTargets.add(replacement.target);
      const asset = state.assets.find((item) => item.id === assetId);
      if (asset && replacement.swap) glyphsToDraw.push({ asset, replacement });
    });
    if (timeline.wordOpacity > .001) {
      ctx.globalAlpha = timeline.wordOpacity;
      drawTrackedText(ctx, layout, width / 2, baseline, tracking, (index) => exportTextColor(index, layout.characters.length, timeline), hiddenTargets, finalScale);
      ctx.globalAlpha = 1;
    }

    const range = Number($("ibRange").value) / 100;
    const iconSize = Number($("ibSize").value) / 100;
    const orbitSpeed = clamp(Number($("ibOrbitSpeed").value) / 100, .5, 2);
    const curveStrength = Number($("ibCurve").value) / 100;
    const clusterOffsetX = Number($("ibClusterX").value) / 100 * compositionWidth * .35 * easeInOut(clamp(timeline.iconGather / .85, 0, 1));
    const orbitAssets = state.assets.filter((asset) => asset.role === "orbit");
    const poses = orbitAssets.map((asset, orbitIndex) => {
      const seed = seeds[orbitIndex % seeds.length];
      const orbitCount = Math.max(1, orbitAssets.length);
      const angleJitter = seed[2] * 1.65 * Math.PI / 180;
      const sphereY = 1 - 2 * (orbitIndex + .5) / orbitCount;
      const latitudeRadius = Math.sqrt(Math.max(0, 1 - sphereY * sphereY));
      const baseLongitude = orbitIndex * Math.PI * (3 - Math.sqrt(5)) + angleJitter * .28;
      const orbitalAngle = baseLongitude + timeline.orbitAngleDegrees * curveStrength * orbitSpeed * Math.PI / 180;
      const sphereX = Math.cos(orbitalAngle) * latitudeRadius;
      const sphereZ = Math.sin(orbitalAngle) * latitudeRadius;
      const pitch = (-16 + 27 * easeInOut(clamp(timeline.iconGather, 0, 1))) * Math.PI / 180;
      const projectedY = sphereY * Math.cos(pitch) - sphereZ * Math.sin(pitch);
      const projectedZ = sphereY * Math.sin(pitch) + sphereZ * Math.cos(pitch);
      const radialProgress = easeInOut(clamp(timeline.iconGather, 0, 1));
      const startRadius = Math.min(compositionWidth, compositionHeight) * range * (.49 + (orbitIndex % 3) * .018);
      const spreadScale = 1.45 - .83 * clamp(Number($("ibDensity").value) / 100, 0, 1);
      const clusterRadius = Math.min(compositionWidth, compositionHeight) * (.118 + (orbitIndex % 3) * .003) * spreadScale;
      const sphereRadius = startRadius + (clusterRadius - startRadius) * radialProgress;
      const perspective = 1 / (1 - projectedZ * .22);
      let x = sphereX * sphereRadius * perspective;
      let y = projectedY * sphereRadius * perspective * .94;
      const crossT = clamp((timeline.iconGather - .58) / .39, 0, 1);
      const crossPulse = Math.pow(Math.sin(Math.PI * crossT), 2);
      const crossingDrift = Math.min(compositionWidth, compositionHeight) * .018 * curveStrength * crossPulse;
      x += -Math.sin(orbitalAngle) * crossingDrift;
      y += Math.cos(orbitalAngle) * Math.cos(pitch) * crossingDrift;
      let collapseScale = 1;
      if (timeline.seconds >= timeline.collapseStartSeconds) {
        const local = clamp((timeline.seconds - timeline.collapseStartSeconds) / Math.max(.001, timeline.iconsGoneSeconds - timeline.collapseStartSeconds), 0, 1);
        collapseScale = 1 - easeInOut(clamp((local - .65) / .35, 0, 1));
      }
      const depthScale = clamp(1 + projectedZ * .22, .76, 1.24);
      const startScale = 1.12 + (orbitIndex % 4) * .09;
      const gatherScale = startScale + (1 - startScale) * timeline.iconGather;
      return { asset, depth: projectedZ, x: width / 2 + x + clusterOffsetX + asset.x / 100 * compositionWidth * .28, y: height / 2 + y + asset.y / 100 * compositionHeight * .28, size: exportIconPx * iconSize * asset.size * gatherScale * collapseScale * depthScale, alpha: timeline.iconPresence * asset.opacity * collapseScale, rotation: asset.rotation + 10 * Math.sin(Math.PI * clamp(timeline.iconGather, 0, 1)) };
    }).sort((a, b) => a.depth - b.depth);
    poses.forEach((pose) => drawAssetToCanvas(ctx, pose.asset, pose.x, pose.y, pose.size, pose.rotation, pose.alpha));

    glyphsToDraw.forEach(({ asset, replacement }) => {
      const x = width / 2 + (layout.centers[replacement.target] || 0) * finalScale + asset.x / 100 * compositionWidth * .28;
      const y = baseline - fontPx * .38 + asset.y / 100 * compositionHeight * .28;
      const replacementScale = .98 + easeOut(replacement.envelope) * .02;
      drawAssetToCanvas(ctx, asset, x, y, exportIconPx * iconSize * asset.size * replacementScale, asset.rotation, asset.opacity * replacement.envelope);
    });
  }

  const exportButtons = [$("ibExportPng"), $("ibExportGif"), $("ibExportVideo"), $("ibExportVerticalVideo")];
  function setExportBusy(busy, message) {
    exportButtons.forEach((button) => { button.disabled = busy; });
    $("ibExportStatus").textContent = message;
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
    if (performance.now() < suppressAssetClickUntil) return;
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
    // Native select menus dispatch a bubbling click before the user has made
    // a choice. Re-rendering the whole row here destroyed the open menu, which
    // made playback order (and the other quick controls) impossible to edit.
    if (event.target.closest("select, input, textarea, label, a")) return;
    selectAsset(asset.id);
  });

  $("ibBackgroundFile").addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/^(image|video)\//i.test(file.type || "")) {
      $("ibBackgroundStatus").textContent = "不支持该格式，请选择图片、GIF、MP4、WebM 或 MOV。";
      return;
    }
    $("ibBackgroundStatus").textContent = `正在读取背景 · ${file.name}`;
    try {
      const dataUrl = await readFile(file);
      setBackgroundMedia({ name: file.name, type: file.type, dataUrl });
      scheduleSchemePersist();
    } catch (_) {
      $("ibBackgroundStatus").textContent = "背景素材读取失败，请重新选择文件。";
    }
  });

  $("ibClearBackground").addEventListener("click", () => {
    setBackgroundMedia(null);
    scheduleSchemePersist();
  });

  ["ibText", "ibFont", "ibWeight", "ibFontSize", "ibTracking", "ibColorCount", "ibBaseColor", "ibColorA", "ibColorB", "ibColorC", "ibColorD", "ibBackground"].forEach((id) => {
    $(id).addEventListener("input", () => {
      if (id === "ibText") updateWord();
      else {
        if (id === "ibColorCount") updateColorCountUI();
        updateTypography();
      }
    });
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
    ["ibClusterX", "ibClusterXValue", (value) => `${Number(value) > 0 ? "+" : ""}${value}%`],
    ["ibHang", "ibHangValue", (value) => `${(Number(value) / 100).toFixed(2)} 秒`],
    ["ibDrift", "ibDriftValue", (value) => `${value}%`],
    ["ibSync", "ibSyncValue", (value) => `${(Number(value) / 100).toFixed(2)}×`],
    ["ibCollisionSpeed", "ibCollisionSpeedValue", (value) => `${Number(value).toFixed(2)}×`],
    ["ibCollisionDuration", "ibCollisionDurationValue", (value) => `${(Number(value) / 1000).toFixed(2)} 秒`],
    ["ibPairStagger", "ibPairStaggerValue", (value) => `${(Number(value) / 1000).toFixed(2)} 秒`],
    ["ibOvershoot", "ibOvershootValue", (value) => `${value}%`],
    ["ibDensity", "ibDensityValue", (value) => `${value}%`],
    ["ibFinalScale", "ibFinalScaleValue", (value) => `+${Number(value).toFixed(1)}%`],
    ["ibFinalScaleDuration", "ibFinalScaleDurationValue", (value) => `${(Number(value) / 1000).toFixed(2)} 秒`],
    ["ibWordReturn", "ibWordReturnValue", (value) => `${(Number(value) / 1000).toFixed(2)} 秒`],
    ["ibOrbitSpeed", "ibOrbitSpeedValue", (value) => `${(Number(value) / 100).toFixed(2)}×`],
    ["ibCurve", "ibCurveValue", (value) => `${value}%`],
    ["ibSpeed", "ibSpeedValue", (value) => `${Number(value).toFixed(1)}×`]
  ];
  readouts.forEach(([id, output, format]) => $(id).addEventListener("input", () => { $(output).textContent = format($(id).value); scheduleChoreoRender(); scheduleSchemePersist(); }));
  // Amplitude is not a static font-size edit. Releasing either final-scale
  // control restarts the complete choreography so the user sees the title
  // grow over time in its actual replacement chapter.
  ["ibFinalScale", "ibFinalScaleDuration"].forEach((id) => $(id).addEventListener("change", restart));
  ["ibWordReturn", "ibSync", "ibCollisionSpeed", "ibCollisionDuration", "ibPairStagger", "ibOrbitSpeed", "ibOvershoot"].forEach((id) => $(id).addEventListener("change", restart));

  $("ibSaveScheme").addEventListener("click", () => {
    const scheme = collectScheme();
    localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(scheme));
    downloadBlob(new Blob([JSON.stringify(scheme, null, 2)], { type: "application/json" }), "iconburst-scheme.json");
    $("ibSchemeStatus").textContent = "方案已保存到本机，并下载了 JSON。";
  });
  $("ibImportScheme").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const scheme = JSON.parse(await file.text());
      applyScheme(scheme, { status: "方案已导入；文字长度、碰撞对数和素材编辑项已自动重建。" });
      localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme()));
    } catch (error) {
      $("ibSchemeStatus").textContent = `导入失败：${error.message}`;
    }
  });
  $("ibResetScheme").addEventListener("click", () => {
    localStorage.removeItem(SCHEME_STORAGE_KEY);
    applyScheme(defaultScheme(true), { status: "已恢复默认示例与全部内置素材。" });
  });
  $("ibClearScheme").addEventListener("click", () => {
    const blank = defaultScheme(false);
    blank.controls.ibText = "GOOD JOB";
    blank.controls.ibContentMode = "text";
    localStorage.removeItem(SCHEME_STORAGE_KEY);
    applyScheme(blank, { status: "已清空全部图片和图标，可从空白方案重新添加。" });
  });
  document.querySelector(".ib-editor")?.addEventListener("input", scheduleSchemePersist);
  document.querySelector(".ib-editor")?.addEventListener("change", scheduleSchemePersist);

  $("ibExportPreset").addEventListener("change", () => { $("ibCustomSize").hidden = $("ibExportPreset").value !== "custom"; });
  $("ibExportDuration").addEventListener("change", () => { $("ibCustomDurationWrap").hidden = $("ibExportDuration").value !== "custom"; });

  function currentRealSeconds() {
    const elapsed = state.playing ? performance.now() - state.start : state.pausedAt;
    return Math.max(0, elapsed / 1000);
  }

  $("ibExportPng").addEventListener("click", async () => {
    setExportBusy(true, "正在准备高清素材…");
    try {
      await preloadExportAssets();
      const output = makeExportCanvas(false);
      const exportSecond = currentRealSeconds();
      await prepareBackgroundFrame(exportSecond);
      renderExportFrame(output, exportSecond);
      output.toBlob((blob) => {
        if (blob) downloadBlob(blob, `icon-burst-${output.width}x${output.height}.png`);
        setExportBusy(false, blob ? `PNG 已生成 · ${output.width} × ${output.height}` : "PNG 生成失败");
      }, "image/png");
    } catch (error) { setExportBusy(false, `PNG 导出失败：${error.message}`); }
  });

  $("ibExportGif").addEventListener("click", async () => {
    if (!window.GIF) { $("ibExportStatus").textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    setExportBusy(true, "正在准备高清素材…");
    try {
      await preloadExportAssets();
      const output = makeExportCanvas(false);
      const fps = Math.min(30, Number($("ibExportFps").value) || 15);
      const duration = exportDurationSeconds();
      const frames = Math.max(1, Math.ceil(duration * fps));
      const gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" });
      for (let frame = 0; frame < frames; frame += 1) {
        const frameSecond = frame / fps;
        await prepareBackgroundFrame(frameSecond);
        renderExportFrame(output, frameSecond);
        gif.addFrame(output, { copy: true, delay: 1000 / fps });
        if (frame % 4 === 0) $("ibExportStatus").textContent = `正在准备 GIF · ${frame + 1} / ${frames} 帧`;
      }
      gif.on("progress", (progress) => { $("ibExportStatus").textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; });
      gif.on("finished", (blob) => { downloadBlob(blob, `icon-burst-${output.width}x${output.height}.gif`); setExportBusy(false, `GIF 已生成 · ${output.width} × ${output.height}`); });
      gif.render();
    } catch (error) { setExportBusy(false, `GIF 导出失败：${error.message}`); }
  });

  async function exportMp4(verticalHD = false) {
    if (!window.HME || typeof HME.createH264MP4Encoder !== "function") { $("ibExportStatus").textContent = "MP4 编码器未加载，请刷新后重试。"; return; }
    setExportBusy(true, "正在准备高清素材…");
    let encoder;
    try {
      await preloadExportAssets();
      const output = makeExportCanvas(verticalHD);
      const context = output.getContext("2d", { willReadFrequently: true });
      const fps = Number($("ibExportFps").value) || 30;
      const duration = exportDurationSeconds();
      const frameCount = Math.max(1, Math.ceil(duration * fps));
      encoder = await HME.createH264MP4Encoder();
      encoder.outputFilename = `icon-burst-${output.width}x${output.height}.mp4`;
      encoder.width = output.width;
      encoder.height = output.height;
      encoder.frameRate = fps;
      encoder.kbps = verticalHD ? 20000 : 16000;
      encoder.groupOfPictures = 15;
      encoder.initialize();
      for (let frame = 0; frame < frameCount; frame += 1) {
        const frameSecond = frame / fps;
        await prepareBackgroundFrame(frameSecond);
        renderExportFrame(output, frameSecond);
        encoder.addFrameRgba(context.getImageData(0, 0, output.width, output.height).data);
        if (frame % 2 === 0) {
          $("ibExportStatus").textContent = `正在导出 MP4 ${output.width} × ${output.height} · ${Math.round((frame + 1) / frameCount * 100)}%`;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename);
      downloadBlob(new Blob([bytes], { type: "video/mp4" }), encoder.outputFilename);
      setExportBusy(false, `MP4 已生成 · ${output.width} × ${output.height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (error) {
      setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
    } finally {
      try { encoder?.delete(); } catch (_) {}
    }
  }
  $("ibExportVideo").addEventListener("click", () => exportMp4(false));
  $("ibExportVerticalVideo").addEventListener("click", () => exportMp4(true));

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
      asset.name = `内置${shapeLabels[asset.shape || "ring"]}`;
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

  $("ibCloseAssetDrawer").addEventListener("click", () => {
    $("ibAssetDrawer").hidden = true;
    $("ibAssetEditor").hidden = true;
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
      if (role === "glyph") normalizeGlyphSequence();
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
      if (role === "glyph") normalizeGlyphSequence();
      state.activeAssetId = asset.id;
      renderAssets(); renderIcons();
    });
  }

  function bindImageLibrary(libraryId, role, images) {
    $(libraryId).addEventListener("click", (event) => {
      const button = event.target.closest("[data-image-index]");
      if (!button) return;
      const image = images[Number(button.dataset.imageIndex)];
      if (!image) return;
      const sequence = role === "glyph" ? state.assets.filter((asset) => asset.role === "glyph").length : 0;
      const asset = defaultAsset({
        type: "image",
        role,
        name: image.name,
        url: image.url,
        originalDataUrl: image.url,
        fileType: image.fileType,
        libraryImage: true,
        removeBackground: false,
        autoBackground: false,
        processedWidth: image.width,
        processedHeight: image.height,
        status: image.fileType === "image/gif"
          ? "内置 Bot 动态 GIF；保留原动画，可独立缩放、移动、旋转或替换。"
          : "内置高清透明 PNG；当前资源可独立缩放、移动、旋转或替换。",
        target: -1,
        sequence
      });
      state.assets.push(asset);
      if (role === "glyph") normalizeGlyphSequence();
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
  bindImageLibrary("ibOrbitImageLibrary", "orbit", transparentAnimalImages);
  bindImageLibrary("ibGlyphImageLibrary", "glyph", transparentAnimalImages);
  bindImageLibrary("ibOrbitBotLibrary", "orbit", botSeriesImages);
  bindImageLibrary("ibGlyphBotLibrary", "glyph", botSeriesImages);
  bindImageLibrary("ibOrbitFlowLibrary", "orbit", flowIconImages);
  bindImageLibrary("ibGlyphFlowLibrary", "glyph", flowIconImages);

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
  let storedScheme = null;
  if (!previewMode && !galleryDefaultMode) {
    try { storedScheme = JSON.parse(localStorage.getItem(SCHEME_STORAGE_KEY) || "null"); } catch (_) {}
  }
  if (!previewMode && galleryDefaultMode) {
    applyScheme(defaultScheme(true), { status: "已从首页卡片载入同一套最新示例。" });
    try { localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(collectScheme())); } catch (_) {}
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("from");
    history.replaceState({}, "", cleanUrl);
  } else if (!previewMode && storedScheme && Number(storedScheme.version) >= 2) {
    applyScheme(storedScheme, { status: "已恢复上次自动保存的方案。" });
  } else {
    applyScheme(defaultScheme(true), previewMode ? {} : { status: "已载入最新默认示例。" });
  }
  updateColorCountUI();
  requestAnimationFrame(animate);
})();
