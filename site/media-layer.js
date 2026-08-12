/* Shared image/shape layer for Flash, Snap and Construct. */
var stgMedia = {
  enabled: false,
  source: "shape",
  image: null,
  processedCanvas: null,
  processedWidth: 0,
  processedHeight: 0,
  animationTextureWidth: 0,
  animationTextureHeight: 0,
  animationTextureLimit: 768,
  originalElement: null,
  originalDataUrl: "",
  fileType: "",
  imageName: "",
  removeBackground: true,
  backgroundColor: "#ffffff",
  backgroundTolerance: 32,
  backgroundFeather: 8,
  imageQuality: "high",
  protectSubjectWhite: true,
  backgroundPreviewMode: "green",
  backgroundPreviewCanvases: null,
  backgroundMaskStats: null,
  backgroundRemoved: false,
  autoBackgroundColor: true,
  autoCrop: true,
  shape: "circle",
  color: "#ff5a45",
  x: 50,
  y: 50,
  size: 22,
  aspect: 1,
  rotation: 0,
  opacity: 100,
  inlineScale: 1,
  inlineOffsetY: 0,
  inlinePadding: 8,
  motion: "pop",
  speed: 1,
  layer: "inline",
  caretStart: null,
  caretEnd: null,
  processSequence: 0,
  assets: [],
  activeAssetId: null,
  nextAssetId: 1,
  uploadQueue: [],
  uploadBusy: false
};

var stgMediaAssetKeys = [
  "source", "image", "processedCanvas", "processedWidth", "processedHeight",
  "animationTextureWidth", "animationTextureHeight", "originalElement", "originalDataUrl",
  "fileType", "imageName", "removeBackground", "backgroundColor", "backgroundTolerance",
  "backgroundFeather", "imageQuality", "protectSubjectWhite", "backgroundPreviewMode",
  "backgroundPreviewCanvases", "backgroundMaskStats", "backgroundRemoved", "autoBackgroundColor",
  "autoCrop", "shape", "color", "layer", "x", "y", "size", "aspect", "rotation", "opacity", "inlineScale", "inlineOffsetY", "inlinePadding",
  "motion", "speed"
];

function stgMediaActiveAsset() {
  return stgMedia.assets.find(function(asset) { return asset.id === stgMedia.activeAssetId; }) || null;
}

function stgMediaSyncActiveAsset() {
  var asset = stgMediaActiveAsset();
  if (!asset) return;
  stgMediaAssetKeys.forEach(function(key) { asset[key] = stgMedia[key]; });
}

function stgMediaApplyAssetState(asset) {
  if (!asset) return;
  stgMediaAssetKeys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(asset, key)) stgMedia[key] = asset[key];
  });
  stgMedia.activeAssetId = asset.id;
  var controls = {
    mediaInlineScale: "inlineScale", mediaInlineOffsetY: "inlineOffsetY", mediaInlinePadding: "inlinePadding",
    mediaX: "x", mediaY: "y", mediaSize: "size", mediaAspect: "aspect",
    mediaRotation: "rotation", mediaOpacity: "opacity", mediaSpeed: "speed"
  };
  Object.keys(controls).forEach(function(id) {
    var input = document.getElementById(id);
    if (input) input.value = String(stgMedia[controls[id]]);
    var output = document.querySelector('[data-media-value="' + controls[id] + '"]');
    if (output) output.textContent = controls[id] === "inlineScale"
      ? String(Math.round(stgMedia.inlineScale * 100))
      : String(stgMedia[controls[id]]);
  });
  var selectControls = {
    mediaSource: "source", mediaShape: "shape", mediaColor: "color",
    mediaLayer: "layer", mediaMotion: "motion", mediaImageQuality: "imageQuality",
    mediaBackgroundPreviewMode: "backgroundPreviewMode", mediaBackgroundColor: "backgroundColor",
    mediaBackgroundTolerance: "backgroundTolerance", mediaBackgroundFeather: "backgroundFeather"
  };
  Object.keys(selectControls).forEach(function(id) {
    var control = document.getElementById(id);
    if (control) control.value = String(stateValue(selectControls[id]));
    var output = document.querySelector('[data-media-value="' + selectControls[id] + '"]');
    if (output) output.textContent = String(stateValue(selectControls[id]));
  });
  var checkboxControls = {
    mediaRemoveBackground: "removeBackground", mediaAutoBackgroundColor: "autoBackgroundColor",
    mediaProtectSubjectWhite: "protectSubjectWhite", mediaAutoCrop: "autoCrop"
  };
  Object.keys(checkboxControls).forEach(function(id) {
    var checkbox = document.getElementById(id);
    if (checkbox) checkbox.checked = Boolean(stateValue(checkboxControls[id]));
  });
  var scaleReadout = document.getElementById("mediaScaleReadout");
  if (scaleReadout) scaleReadout.textContent = Math.round(stgMedia.inlineScale * 100) + "%";
  stgMediaUpdateBackgroundPreview();
  stgMediaUpdateActiveAssetBar();
  stgMediaUpdateSourceUI();
  stgMediaUpdateLayerUI();
  stgMediaUpdateStatus();
  stgMediaRenderAssetLibrary();

  function stateValue(key) { return stgMedia[key]; }
}

function stgMediaSelectAsset(assetId) {
  if (assetId === stgMedia.activeAssetId) return;
  stgMediaSyncActiveAsset();
  stgMediaApplyAssetState(stgMedia.assets.find(function(asset) { return asset.id === assetId; }));
  stgMediaNotifyChange(true);
}

function stgMediaCreateAsset(file, original, dataUrl) {
  var slot = stgMedia.nextAssetId++;
  var asset = {};
  stgMediaAssetKeys.forEach(function(key) { asset[key] = stgMedia[key]; });
  asset.id = "media-" + slot;
  asset.slot = slot;
  asset.source = "image";
  asset.image = null;
  asset.processedCanvas = null;
  asset.processedWidth = 0;
  asset.processedHeight = 0;
  asset.animationTextureWidth = 0;
  asset.animationTextureHeight = 0;
  asset.originalElement = original;
  asset.originalDataUrl = dataUrl;
  asset.fileType = file.type || "";
  asset.imageName = file.name;
  asset.backgroundPreviewCanvases = null;
  asset.backgroundMaskStats = null;
  asset.backgroundRemoved = false;
  stgMedia.assets.push(asset);
  return asset;
}

function stgMediaCreateShapeAsset() {
  stgMediaSyncActiveAsset();
  var slot = stgMedia.nextAssetId++;
  var asset = {};
  stgMediaAssetKeys.forEach(function(key) { asset[key] = stgMedia[key]; });
  asset.id = "media-" + slot;
  asset.slot = slot;
  asset.source = "shape";
  asset.image = null;
  asset.originalElement = null;
  asset.originalDataUrl = "";
  asset.processedCanvas = null;
  asset.processedWidth = 0;
  asset.processedHeight = 0;
  asset.animationTextureWidth = 0;
  asset.animationTextureHeight = 0;
  asset.fileType = "shape/" + stgMedia.shape;
  asset.imageName = "内置" + stgMediaShapeLabel(stgMedia.shape);
  asset.backgroundRemoved = false;
  asset.layer = "inline";
  stgMedia.assets.push(asset);
  stgMedia.enabled = true;
  var enabled = document.getElementById("mediaEnabled");
  if (enabled) enabled.checked = true;
  stgMediaApplyAssetState(asset);
  stgMediaUpdateStatus("已添加 {图" + asset.slot + "} · " + asset.imageName + "，可插入文字或切换为自由图层。", false);
  stgMediaNotifyChange(true);
  return asset;
}

function stgMediaShapeLabel(shape) {
  return ({ circle: "圆形", square: "方形", triangle: "三角形", star: "星形", pill: "药丸形", ring: "圆环" })[shape] || "图形";
}

function stgMediaShapePreview(asset) {
  var shape = asset.shape || "circle";
  return '<span class="stg-media-shape-preview is-' + shape + '" style="--shape-color:' + asset.color + '"></span>';
}

function stgMediaRemoveAsset(assetId) {
  var index = stgMedia.assets.findIndex(function(asset) { return asset.id === assetId; });
  if (index < 0) return;
  var removed = stgMedia.assets[index];
  stgMedia.assets.splice(index, 1);
  var textarea = document.getElementById("textArea");
  if (textarea) {
    var tokenPattern = new RegExp("[\\{\\[]图" + removed.slot + "[\\}\\]]", "g");
    textarea.value = textarea.value.replace(tokenPattern, "");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (stgMedia.activeAssetId === assetId) {
    stgMedia.activeAssetId = null;
    var next = stgMedia.assets[Math.max(0, index - 1)] || null;
    if (next) stgMediaApplyAssetState(next);
    else {
      stgMedia.image = null;
      stgMedia.imageName = "";
      stgMedia.processedCanvas = null;
    }
  }
  stgMediaRenderAssetLibrary();
  stgMediaUpdateStatus();
  stgMediaNotifyChange(true);
}

function stgMediaAssetForCharacter(character) {
  if (!character) return null;
  if (character === "\uFFFC") return stgMediaActiveAsset() || (stgMedia.source === "shape" ? stgMedia : null);
  var code = character.charCodeAt(0);
  if (code < 0xE001 || code > 0xF8FF) return null;
  var slot = code - 0xE000;
  return stgMedia.assets.find(function(asset) { return asset.slot === slot; }) || null;
}

function stgMediaAssetForSlot(slot) {
  return stgMedia.assets.find(function(asset) { return asset.slot === Number(slot); }) || null;
}

function stgMediaIsInlineCharacter(character) {
  return Boolean(stgMediaAssetForCharacter(character));
}

function stgMediaEncodeTokens(value) {
  return String(value || "").replace(/\{图(\d*)\}|\[图(\d*)\]/g, function(match, curlySlot, squareSlot) {
    var requestedSlot = Number(curlySlot || squareSlot || 0);
    var asset = requestedSlot
      ? stgMedia.assets.find(function(item) { return item.slot === requestedSlot; })
      : stgMediaActiveAsset() || stgMedia.assets[0];
    if (asset) return String.fromCharCode(0xE000 + asset.slot);
    return stgMedia.source === "shape" ? "\uFFFC" : match;
  });
}

function stgMediaRenderAssetLibrary() {
  var library = document.getElementById("mediaAssetLibrary");
  var list = document.getElementById("mediaAssetList");
  var count = document.getElementById("mediaAssetCount");
  if (!library || !list) return;
  library.hidden = stgMedia.assets.length === 0;
  if (count) count.textContent = stgMedia.assets.length + " 项";
  list.innerHTML = stgMedia.assets.map(function(asset) {
    var preview = asset.processedCanvas ? asset.processedCanvas.toDataURL("image/png") : asset.originalDataUrl;
    var previewMarkup = asset.source === "shape"
      ? stgMediaShapePreview(asset)
      : '<img src="' + preview + '" alt="">';
    return '<div class="stg-media-asset' + (asset.id === stgMedia.activeAssetId ? ' is-active' : '') + '" data-asset-id="' + asset.id + '">' +
      '<button class="stg-media-asset-preview" type="button" title="选择并编辑这个资源">' + previewMarkup + '</button>' +
      '<span class="stg-media-asset-copy"><strong>{图' + asset.slot + '} · ' + asset.imageName.replace(/[<>]/g, '') + '</strong><small>' +
      (asset.source === "shape" ? stgMediaShapeLabel(asset.shape) : asset.processedWidth ? asset.processedWidth + '×' + asset.processedHeight : '处理中') + ' · 独立位置与尺寸</small></span>' +
      '<span class="stg-media-asset-actions"><button class="stg-media-asset-select" type="button">' + (asset.id === stgMedia.activeAssetId ? '正在编辑' : '单独编辑') + '</button><button class="stg-media-asset-insert" type="button">插入</button><button class="stg-media-asset-delete" type="button" aria-label="删除这张图片">×</button></span></div>';
  }).join("");
  list.querySelectorAll(".stg-media-asset").forEach(function(row) {
    var assetId = row.dataset.assetId;
    row.querySelector(".stg-media-asset-preview").addEventListener("click", function() { stgMediaSelectAsset(assetId); });
    row.querySelector(".stg-media-asset-copy").addEventListener("click", function() { stgMediaSelectAsset(assetId); });
    row.querySelector(".stg-media-asset-select").addEventListener("click", function() { stgMediaSelectAsset(assetId); });
    row.querySelector(".stg-media-asset-insert").addEventListener("pointerdown", stgMediaRememberCaret);
    row.querySelector(".stg-media-asset-insert").addEventListener("click", function() { stgMediaInsertToken(assetId); });
    row.querySelector(".stg-media-asset-delete").addEventListener("click", function() { stgMediaRemoveAsset(assetId); });
  });
}

function stgCanvasAreaWidth() {
  var stage = document.getElementById("stgCanvasStage");
  return Math.max(1, Math.round(stage ? stage.getBoundingClientRect().width : window.innerWidth));
}

function stgCanvasAreaHeight() {
  var stage = document.getElementById("stgCanvasStage");
  return Math.max(1, Math.round(stage ? stage.getBoundingClientRect().height : window.innerHeight));
}

function stgMountCanvas(canvasRenderer) {
  var stage = document.getElementById("stgCanvasStage");
  if (stage && canvasRenderer && typeof canvasRenderer.parent === "function") {
    canvasRenderer.parent(stage);
  }
  return canvasRenderer;
}

function stgSetEditorCollapsed(collapsed) {
  document.body.classList.toggle("stg-editor-collapsed", Boolean(collapsed));
}

function stgMediaNumber(value, fallback) {
  var number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stgMediaSetEnabled(value) {
  stgMedia.enabled = Boolean(value);
  stgMediaUpdateStatus();
  stgMediaNotifyChange(true);
}

function stgMediaSetSource(value) {
  if (stgMediaActiveAsset()) return;
  stgMedia.source = value;
  stgMediaUpdateSourceUI();
  stgMediaUpdateStatus();
  stgMediaNotifyChange(true);
}

function stgMediaSetShape(value) {
  var asset = stgMediaActiveAsset();
  if (!asset || asset.source !== "shape") return;
  stgMedia.shape = value;
  stgMedia.imageName = "内置" + stgMediaShapeLabel(value);
  stgMedia.fileType = "shape/" + value;
  stgMediaSyncActiveAsset();
  stgMediaRenderAssetLibrary();
  stgMediaUpdateActiveAssetBar();
  stgMediaNotifyChange(true);
}

function stgMediaSetColor(value) {
  var asset = stgMediaActiveAsset();
  if (!asset || asset.source !== "shape") return;
  stgMedia.color = value;
  stgMediaSyncActiveAsset();
  stgMediaRenderAssetLibrary();
  stgMediaNotifyChange(true);
}

function stgMediaSetLayer(value) {
  if (!stgMediaActiveAsset()) return;
  stgMedia.layer = value;
  stgMediaSyncActiveAsset();
  stgMediaUpdateLayerUI();
  stgMediaUpdateStatus();
  stgMediaNotifyChange(true);
}

function stgMediaSetMotion(value) {
  if (!stgMediaActiveAsset()) return;
  stgMedia.motion = value;
  stgMediaSyncActiveAsset();
}

function stgMediaSetValue(key, value) {
  if (!(key in stgMedia) || !stgMediaActiveAsset()) return;
  stgMedia[key] = stgMediaNumber(value, stgMedia[key]);
  var output = document.querySelector('[data-media-value="' + key + '"]');
  if (output) output.textContent = key === "inlineScale"
    ? String(Math.round(stgMedia[key] * 100))
    : String(stgMedia[key]);
  if (key === "inlineScale") {
    var scaleReadout = document.getElementById("mediaScaleReadout");
    if (scaleReadout) scaleReadout.textContent = Math.round(stgMedia.inlineScale * 100) + "%";
  }
  if (["aspect", "inlineScale", "inlineOffsetY", "inlinePadding"].includes(key) && stgMedia.layer === "inline") {
    stgMediaNotifyChange(true);
  }
  stgMediaSyncActiveAsset();
}

function stgMediaSetInlineScale(value) {
  var next = Math.max(0.25, Math.min(3, stgMediaNumber(value, stgMedia.inlineScale)));
  var input = document.getElementById("mediaInlineScale");
  if (input) input.value = String(next);
  stgMediaSetValue("inlineScale", next);
}

function stgMediaNudgeInlineScale(delta) {
  stgMediaSetInlineScale(Math.round((stgMedia.inlineScale + delta) * 20) / 20);
}

function stgMediaLoadFile(input) {
  var files = input && input.files ? Array.from(input.files) : [];
  if (!files.length) return;
  stgMedia.uploadQueue = stgMedia.uploadQueue.concat(files);
  if (input) input.value = "";
  stgMediaProcessNextFile();
}

function stgMediaProcessNextFile() {
  if (stgMedia.uploadBusy || !stgMedia.uploadQueue.length) return;
  var file = stgMedia.uploadQueue.shift();
  stgMedia.uploadBusy = true;

  var reader = new FileReader();
  reader.onload = function(event) {
    var original = new window.Image();
    original.onload = function() {
      stgMediaSyncActiveAsset();
      var asset = stgMediaCreateAsset(file, original, event.target.result);
      stgMediaApplyAssetState(asset);
      stgMedia.enabled = true;

      var source = document.getElementById("mediaSource");
      var enabled = document.getElementById("mediaEnabled");
      if (source) source.value = "image";
      if (enabled) enabled.checked = true;
      stgMediaUpdateSourceUI();
      stgMediaRenderAssetLibrary();
      stgMediaUpdateStatus("正在处理 " + file.name + "；其余图片会自动排队…", false);
      setTimeout(stgMediaApplyBackgroundRemoval, 0);
    };
    original.onerror = function() {
      stgMedia.image = null;
      stgMedia.imageName = "";
      stgMediaUpdateStatus("无法读取这张图片，请换用 PNG、JPG、SVG、WebP 或 GIF。", true);
      stgMedia.uploadBusy = false;
      stgMediaProcessNextFile();
    };
    original.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function stgMediaCommitImage(dataUrl, backgroundRemoved, processSequence) {
  loadImage(dataUrl, function(imageAsset) {
    if (processSequence != null && processSequence !== stgMedia.processSequence) return;
    stgMedia.image = imageAsset;
    stgMedia.backgroundRemoved = Boolean(backgroundRemoved);
    stgMediaSyncActiveAsset();
    stgMediaRenderAssetLibrary();
    stgMediaUpdateStatus();
    stgMediaNotifyChange(true);
    stgMedia.uploadBusy = false;
    setTimeout(stgMediaProcessNextFile, 0);
  }, function() {
    stgMedia.image = null;
    stgMediaUpdateStatus("图片处理失败，请尝试降低图片尺寸或换一种格式。", true);
    stgMedia.uploadBusy = false;
    stgMediaProcessNextFile();
  });
}

function stgMediaScaledCanvas(source, maxDimension) {
  var scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  var target = document.createElement("canvas");
  target.width = Math.max(1, Math.round(source.width * scale));
  target.height = Math.max(1, Math.round(source.height * scale));
  var targetContext = target.getContext("2d");
  targetContext.imageSmoothingEnabled = true;
  targetContext.imageSmoothingQuality = "high";
  targetContext.drawImage(source, 0, 0, target.width, target.height);
  return target;
}

function stgMediaCommitProcessedCanvas(processedCanvas, backgroundRemoved, processSequence) {
  stgMedia.processedCanvas = processedCanvas;
  stgMedia.processedWidth = processedCanvas.width;
  stgMedia.processedHeight = processedCanvas.height;
  var animationCanvas = stgMediaScaledCanvas(processedCanvas, stgMedia.animationTextureLimit);
  stgMedia.animationTextureWidth = animationCanvas.width;
  stgMedia.animationTextureHeight = animationCanvas.height;
  stgMediaSyncActiveAsset();
  stgMediaCommitImage(animationCanvas.toDataURL("image/png"), backgroundRemoved, processSequence);
}

function stgMediaPreviewCanvas(source) {
  return stgMediaScaledCanvas(source, 520);
}

function stgMediaCropCanvas(source, bounds) {
  if (!stgMedia.autoCrop || !bounds || bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return source;
  var subjectWidth = bounds.maxX - bounds.minX + 1;
  var subjectHeight = bounds.maxY - bounds.minY + 1;
  var padding = Math.max(2, Math.round(Math.max(subjectWidth, subjectHeight) * 0.025));
  var sourceX = Math.max(0, bounds.minX - padding);
  var sourceY = Math.max(0, bounds.minY - padding);
  var sourceRight = Math.min(source.width, bounds.maxX + padding + 1);
  var sourceBottom = Math.min(source.height, bounds.maxY + padding + 1);
  var cropped = document.createElement("canvas");
  cropped.width = Math.max(1, sourceRight - sourceX);
  cropped.height = Math.max(1, sourceBottom - sourceY);
  cropped.getContext("2d").drawImage(
    source,
    sourceX, sourceY, cropped.width, cropped.height,
    0, 0, cropped.width, cropped.height
  );
  return cropped;
}

function stgMediaSampleCornerBackground(context, canvasWidth, canvasHeight) {
  var inset = Math.max(1, Math.round(Math.min(canvasWidth, canvasHeight) * 0.015));
  var sampleSize = Math.max(2, Math.min(12, Math.round(Math.min(canvasWidth, canvasHeight) * 0.004)));
  var points = [
    [inset, inset], [canvasWidth - inset - sampleSize, inset],
    [inset, canvasHeight - inset - sampleSize], [canvasWidth - inset - sampleSize, canvasHeight - inset - sampleSize]
  ];
  var totals = { r: 0, g: 0, b: 0, count: 0 };
  points.forEach(function(point) {
    var sample = context.getImageData(
      Math.max(0, point[0]), Math.max(0, point[1]),
      Math.min(sampleSize, canvasWidth), Math.min(sampleSize, canvasHeight)
    ).data;
    for (var index = 0; index < sample.length; index += 4) {
      if (sample[index + 3] < 16) continue;
      totals.r += sample[index];
      totals.g += sample[index + 1];
      totals.b += sample[index + 2];
      totals.count++;
    }
  });
  if (!totals.count) return stgMediaHexToRgb(stgMedia.backgroundColor);
  return {
    r: Math.round(totals.r / totals.count),
    g: Math.round(totals.g / totals.count),
    b: Math.round(totals.b / totals.count)
  };
}

function stgMediaRgbToHex(rgb) {
  return "#" + [rgb.r, rgb.g, rgb.b].map(function(value) {
    return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  }).join("");
}

function stgMediaDownloadProcessed() {
  if (!stgMedia.processedCanvas) {
    stgMediaUpdateStatus("请先上传并处理一张图片。", true);
    return;
  }
  stgMedia.processedCanvas.toBlob(function(blob) {
    if (!blob) return;
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = (stgMedia.imageName || "ME-cutout").replace(/\.[^.]+$/, "") + "-transparent.png";
    link.click();
    setTimeout(function() { URL.revokeObjectURL(link.href); }, 1000);
  }, "image/png");
}

function stgMediaHexToRgb(value) {
  var hex = String(value || "#ffffff").replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(function(part) { return part + part; }).join("");
  var number = parseInt(hex, 16);
  return { r: number >> 16 & 255, g: number >> 8 & 255, b: number & 255 };
}

function stgMediaPixelDistance(pixels, offset, background) {
  var redDelta = pixels[offset] - background.r;
  var greenDelta = pixels[offset + 1] - background.g;
  var blueDelta = pixels[offset + 2] - background.b;
  return Math.sqrt(redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta);
}

function stgMediaConnectedBackgroundMask(pixels, canvasWidth, canvasHeight, background, threshold) {
  var pixelCount = canvasWidth * canvasHeight;
  var mask = new Uint8Array(pixelCount);

  if (!stgMedia.protectSubjectWhite) {
    for (var allIndex = 0; allIndex < pixelCount; allIndex++) {
      if (stgMediaPixelDistance(pixels, allIndex * 4, background) <= threshold) mask[allIndex] = 1;
    }
    return mask;
  }

  var queue = new Uint32Array(pixelCount);
  var queueStart = 0;
  var queueEnd = 0;
  function enqueue(pixelIndex) {
    if (mask[pixelIndex]) return;
    if (stgMediaPixelDistance(pixels, pixelIndex * 4, background) > threshold) return;
    mask[pixelIndex] = 1;
    queue[queueEnd++] = pixelIndex;
  }

  for (var x = 0; x < canvasWidth; x++) {
    enqueue(x);
    enqueue((canvasHeight - 1) * canvasWidth + x);
  }
  for (var y = 1; y < canvasHeight - 1; y++) {
    enqueue(y * canvasWidth);
    enqueue(y * canvasWidth + canvasWidth - 1);
  }

  while (queueStart < queueEnd) {
    var current = queue[queueStart++];
    var currentX = current % canvasWidth;
    var currentY = Math.floor(current / canvasWidth);
    if (currentX > 0) enqueue(current - 1);
    if (currentX + 1 < canvasWidth) enqueue(current + 1);
    if (currentY > 0) enqueue(current - canvasWidth);
    if (currentY + 1 < canvasHeight) enqueue(current + canvasWidth);
  }
  return mask;
}

function stgMediaUpdateBackgroundPreview() {
  var preview = document.getElementById("mediaBackgroundPreview");
  var canvases = stgMedia.backgroundPreviewCanvases;
  if (!preview || !canvases) return;
  var source = canvases[stgMedia.backgroundPreviewMode] || canvases.original;
  if (!source) return;
  var context = preview.getContext("2d");
  context.clearRect(0, 0, preview.width, preview.height);
  var scale = Math.min(preview.width / source.width, preview.height / source.height);
  var drawWidth = source.width * scale;
  var drawHeight = source.height * scale;
  context.drawImage(source, (preview.width - drawWidth) / 2, (preview.height - drawHeight) / 2, drawWidth, drawHeight);
}

function stgMediaApplyBackgroundRemoval() {
  if (!stgMedia.originalElement || !stgMedia.originalDataUrl) return;
  var processSequence = ++stgMedia.processSequence;
  var isGif = /gif/i.test(stgMedia.fileType);
  if (isGif) {
    stgMedia.backgroundPreviewCanvases = null;
    stgMediaCommitImage(stgMedia.originalDataUrl, false, processSequence);
    if (stgMedia.removeBackground) {
      stgMediaUpdateStatus("GIF 将保留动画；自动抠背景仅应用于静态图片。", false);
    }
    return;
  }

  stgMediaUpdateStatus(stgMedia.removeBackground ? "正在本地去除背景…" : "正在优化高清图片…", false);
  var originalWidth = stgMedia.originalElement.naturalWidth || stgMedia.originalElement.width;
  var originalHeight = stgMedia.originalElement.naturalHeight || stgMedia.originalElement.height;
  // 高质量仍限制纹理上限，避免 4K 相机图直接进入每帧绘制拖慢画布。
  var qualityLimits = { balanced: 1200, high: 2048, ultra: 3200 };
  var maxDimension = qualityLimits[stgMedia.imageQuality] || qualityLimits.high;
  var scaleDown = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  var canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(originalWidth * scaleDown));
  canvas.height = Math.max(1, Math.round(originalHeight * scaleDown));
  var context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(stgMedia.originalElement, 0, 0, canvas.width, canvas.height);

  if (!stgMedia.removeBackground) {
    stgMedia.backgroundPreviewCanvases = { original: stgMediaPreviewCanvas(canvas) };
    stgMedia.backgroundMaskStats = null;
    stgMediaUpdateBackgroundPreview();
    stgMediaCommitProcessedCanvas(canvas, false, processSequence);
    return;
  }

  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var pixels = imageData.data;
  var background = stgMedia.autoBackgroundColor
    ? stgMediaSampleCornerBackground(context, canvas.width, canvas.height)
    : stgMediaHexToRgb(stgMedia.backgroundColor);
  if (stgMedia.autoBackgroundColor) {
    stgMedia.backgroundColor = stgMediaRgbToHex(background);
    var backgroundInput = document.getElementById("mediaBackgroundColor");
    if (backgroundInput) backgroundInput.value = stgMedia.backgroundColor;
  }
  var tolerance = stgMedia.backgroundTolerance;
  var feather = Math.max(0, stgMedia.backgroundFeather);
  var mask = stgMediaConnectedBackgroundMask(pixels, canvas.width, canvas.height, background, tolerance + feather);
  var transparentData = context.createImageData(canvas.width, canvas.height);
  var greenData = context.createImageData(canvas.width, canvas.height);
  var transparentPixels = transparentData.data;
  var greenPixels = greenData.data;
  var detectedPixels = 0;
  var subjectBounds = { minX: canvas.width, minY: canvas.height, maxX: -1, maxY: -1 };
  for (var pixel = 0; pixel < pixels.length; pixel += 4) {
    var pixelIndex = pixel / 4;
    var distance = stgMediaPixelDistance(pixels, pixel, background);
    var keep = 1;
    if (mask[pixelIndex]) {
      detectedPixels++;
      keep = distance <= tolerance ? 0 : (feather > 0 ? Math.min(1, (distance - tolerance) / feather) : 1);
    }
    var removeStrength = 1 - keep;
    // 对半透明边缘做背景色去污染，避免白底图片抠完仍留一圈灰白毛边。
    var edgeRed = pixels[pixel];
    var edgeGreen = pixels[pixel + 1];
    var edgeBlue = pixels[pixel + 2];
    if (keep > 0.02 && keep < 0.995) {
      edgeRed = Math.max(0, Math.min(255, (edgeRed - background.r * (1 - keep)) / keep));
      edgeGreen = Math.max(0, Math.min(255, (edgeGreen - background.g * (1 - keep)) / keep));
      edgeBlue = Math.max(0, Math.min(255, (edgeBlue - background.b * (1 - keep)) / keep));
    }
    transparentPixels[pixel] = Math.round(edgeRed);
    transparentPixels[pixel + 1] = Math.round(edgeGreen);
    transparentPixels[pixel + 2] = Math.round(edgeBlue);
    var outputAlpha = Math.round(pixels[pixel + 3] * keep);
    transparentPixels[pixel + 3] = outputAlpha;
    if (outputAlpha > 8) {
      var subjectX = pixelIndex % canvas.width;
      var subjectY = Math.floor(pixelIndex / canvas.width);
      if (subjectX < subjectBounds.minX) subjectBounds.minX = subjectX;
      if (subjectX > subjectBounds.maxX) subjectBounds.maxX = subjectX;
      if (subjectY < subjectBounds.minY) subjectBounds.minY = subjectY;
      if (subjectY > subjectBounds.maxY) subjectBounds.maxY = subjectY;
    }
    greenPixels[pixel] = Math.round(pixels[pixel] * keep);
    greenPixels[pixel + 1] = Math.round(pixels[pixel + 1] * keep + 255 * removeStrength);
    greenPixels[pixel + 2] = Math.round(pixels[pixel + 2] * keep);
    greenPixels[pixel + 3] = pixels[pixel + 3];
  }

  var transparentCanvas = document.createElement("canvas");
  transparentCanvas.width = canvas.width;
  transparentCanvas.height = canvas.height;
  transparentCanvas.getContext("2d").putImageData(transparentData, 0, 0);
  var greenCanvas = document.createElement("canvas");
  greenCanvas.width = canvas.width;
  greenCanvas.height = canvas.height;
  greenCanvas.getContext("2d").putImageData(greenData, 0, 0);
  var croppedCanvas = stgMediaCropCanvas(transparentCanvas, subjectBounds);
  stgMedia.backgroundPreviewCanvases = {
    original: stgMediaPreviewCanvas(canvas),
    green: stgMediaPreviewCanvas(greenCanvas),
    transparent: stgMediaPreviewCanvas(croppedCanvas)
  };
  stgMedia.backgroundMaskStats = { detectedPixels: detectedPixels, totalPixels: canvas.width * canvas.height };
  stgMediaUpdateBackgroundPreview();
  stgMediaCommitProcessedCanvas(croppedCanvas, true, processSequence);
}

var stgMediaBackgroundTimer;
function stgMediaScheduleBackgroundRemoval() {
  clearTimeout(stgMediaBackgroundTimer);
  var targetId = stgMedia.activeAssetId;
  stgMediaBackgroundTimer = setTimeout(function() {
    if (targetId && targetId === stgMedia.activeAssetId) stgMediaApplyBackgroundRemoval();
  }, 100);
}

async function stgMediaApplyAiBackgroundRemoval() {
  if (!stgMedia.originalDataUrl) {
    stgMediaUpdateStatus("请先上传一张图片。", true);
    return;
  }
  var button = document.getElementById("mediaAiRemoveBackground");
  if (button) button.disabled = true;
  var processSequence = ++stgMedia.processSequence;
  try {
    stgMediaUpdateStatus("正在载入本地 AI 抠图组件；首次约需下载 40MB，之后会缓存…", false);
    var library = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm");
    var removeBackground = library.removeBackground || library.default;
    var aiInput = stgMedia.originalDataUrl;
    if (/svg/i.test(stgMedia.fileType)) {
      var svgCanvas = document.createElement("canvas");
      var svgWidth = stgMedia.originalElement.naturalWidth || stgMedia.originalElement.width;
      var svgHeight = stgMedia.originalElement.naturalHeight || stgMedia.originalElement.height;
      var svgScale = Math.min(1, 2048 / Math.max(svgWidth, svgHeight));
      svgCanvas.width = Math.max(1, Math.round(svgWidth * svgScale));
      svgCanvas.height = Math.max(1, Math.round(svgHeight * svgScale));
      svgCanvas.getContext("2d").drawImage(stgMedia.originalElement, 0, 0, svgCanvas.width, svgCanvas.height);
      aiInput = await new Promise(function(resolve, reject) {
        svgCanvas.toBlob(function(blob) { blob ? resolve(blob) : reject(new Error("SVG 转换失败")); }, "image/png");
      });
    }
    var resultBlob = await removeBackground(aiInput, {
      device: navigator.gpu ? "gpu" : "cpu",
      model: "isnet_quint8",
      output: { format: "image/png", quality: 1, type: "foreground" },
      progress: function(key, current, total) {
        if (!total) return;
        var percent = Math.min(100, Math.round(current / total * 100));
        stgMediaUpdateStatus("正在下载/运行 AI 抠图 · " + percent + "%", false);
      }
    });
    if (processSequence !== stgMedia.processSequence) return;
    var bitmap = await createImageBitmap(resultBlob);
    var qualityLimits = { balanced: 1200, high: 2048, ultra: 3200 };
    var maxDimension = qualityLimits[stgMedia.imageQuality] || qualityLimits.high;
    var scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    var resultCanvas = document.createElement("canvas");
    resultCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
    resultCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
    var resultContext = resultCanvas.getContext("2d", { willReadFrequently: true });
    resultContext.imageSmoothingEnabled = true;
    resultContext.imageSmoothingQuality = "high";
    resultContext.drawImage(bitmap, 0, 0, resultCanvas.width, resultCanvas.height);
    bitmap.close();

    var resultPixels = resultContext.getImageData(0, 0, resultCanvas.width, resultCanvas.height).data;
    var bounds = { minX: resultCanvas.width, minY: resultCanvas.height, maxX: -1, maxY: -1 };
    for (var pixel = 3; pixel < resultPixels.length; pixel += 4) {
      if (resultPixels[pixel] <= 8) continue;
      var pixelIndex = (pixel - 3) / 4;
      var x = pixelIndex % resultCanvas.width;
      var y = Math.floor(pixelIndex / resultCanvas.width);
      if (x < bounds.minX) bounds.minX = x;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (y > bounds.maxY) bounds.maxY = y;
    }
    var cropped = stgMediaCropCanvas(resultCanvas, bounds);
    var originalCanvas = document.createElement("canvas");
    originalCanvas.width = stgMedia.originalElement.naturalWidth || stgMedia.originalElement.width;
    originalCanvas.height = stgMedia.originalElement.naturalHeight || stgMedia.originalElement.height;
    originalCanvas.getContext("2d").drawImage(stgMedia.originalElement, 0, 0);
    stgMedia.backgroundPreviewCanvases = {
      original: stgMediaPreviewCanvas(originalCanvas),
      transparent: stgMediaPreviewCanvas(cropped),
      green: stgMediaPreviewCanvas(cropped)
    };
    stgMedia.backgroundPreviewMode = "transparent";
    var previewMode = document.getElementById("mediaBackgroundPreviewMode");
    if (previewMode) previewMode.value = "transparent";
    stgMedia.backgroundMaskStats = null;
    stgMediaUpdateBackgroundPreview();
    stgMediaCommitProcessedCanvas(cropped, true, processSequence);
    stgMediaUpdateStatus("AI 抠图完成，高清结果已保留；动画使用轻量纹理。", false);
  } catch (error) {
    console.error("AI background removal failed", error);
    stgMediaUpdateStatus("AI 抠图未能启动，已保留快速纯色抠图。请检查网络或改用最新版 Chrome。", true);
  } finally {
    if (button) button.disabled = false;
  }
}

function stgMediaInstallBackgroundControls() {
  var uploadRow = document.getElementById("mediaUploadRow");
  if (!uploadRow || document.getElementById("mediaBackgroundControls")) return;
  var fileInput = document.getElementById("mediaFile");
  if (fileInput) {
    fileInput.multiple = true;
    fileInput.setAttribute("aria-describedby", "mediaMultiUploadHint");
  }
  var multiHint = document.createElement("p");
  multiHint.id = "mediaMultiUploadHint";
  multiHint.className = "stg-media-note";
  multiHint.textContent = "可以一次选择多张图片；每张图片都会获得独立编号、尺寸、位置和插入点。";
  uploadRow.appendChild(multiHint);
  var library = document.createElement("section");
  library.id = "mediaAssetLibrary";
  library.className = "stg-media-library";
  library.hidden = true;
  library.innerHTML = '<div class="stg-media-library-heading"><strong>资源列表</strong><span id="mediaAssetCount">0 项</span></div><div id="mediaAssetList" class="stg-media-assets"></div>';
  uploadRow.insertAdjacentElement("afterend", library);
  var controls = document.createElement("div");
  controls.id = "mediaBackgroundControls";
  controls.className = "stg-background-controls";
  controls.innerHTML = `
    <label class="stg-media-switch" for="mediaRemoveBackground">
      <span>自动去除图片背景</span>
      <input id="mediaRemoveBackground" type="checkbox" checked>
    </label>
    <label class="stg-media-switch" for="mediaAutoBackgroundColor">
      <span>自动识别四角背景色</span>
      <input id="mediaAutoBackgroundColor" type="checkbox" checked>
    </label>
    <div class="stg-media-pair">
      <div class="stg-media-row"><label for="mediaBackgroundColor">背景颜色</label><input id="mediaBackgroundColor" type="color" value="#ffffff"></div>
      <div class="stg-media-row"><label for="mediaBackgroundTolerance">容差 <output data-media-value="backgroundTolerance">32</output></label><input id="mediaBackgroundTolerance" type="range" min="0" max="220" value="32"></div>
    </div>
    <div class="stg-media-row"><label for="mediaBackgroundFeather">边缘过渡 <output data-media-value="backgroundFeather">8</output></label><input id="mediaBackgroundFeather" type="range" min="0" max="60" value="8"></div>
    <div class="stg-media-row">
      <label for="mediaImageQuality">处理清晰度</label>
      <select id="mediaImageQuality">
        <option value="balanced">流畅 · 1200px</option>
        <option value="high" selected>高清 · 2048px</option>
        <option value="ultra">超清 · 3200px</option>
      </select>
    </div>
    <label class="stg-media-switch" for="mediaProtectSubjectWhite">
      <span>保护主体内部的白色</span>
      <input id="mediaProtectSubjectWhite" type="checkbox" checked>
    </label>
    <label class="stg-media-switch" for="mediaAutoCrop">
      <span>自动裁掉透明空白边缘</span>
      <input id="mediaAutoCrop" type="checkbox" checked>
    </label>
    <div class="stg-media-row">
      <label for="mediaBackgroundPreviewMode">抠图检查</label>
      <select id="mediaBackgroundPreviewMode">
        <option value="green" selected>绿幕预览：绿色部分将被删除</option>
        <option value="transparent">透明结果</option>
        <option value="original">原图</option>
      </select>
    </div>
    <div class="stg-background-preview"><canvas id="mediaBackgroundPreview" width="300" height="170" aria-label="抠图预览"></canvas></div>
    <div class="stg-media-action-row">
      <button id="mediaBackgroundRecommended" class="stg-media-subaction" type="button">恢复清晰参数</button>
      <button id="mediaDownloadProcessed" class="stg-media-subaction" type="button">下载高清透明 PNG</button>
    </div>
    <button id="mediaAiRemoveBackground" class="stg-media-ai-action" type="button">复杂背景：AI 智能抠图（按需）</button>
    <p class="stg-media-note">白底或纯色底优先使用上面的快速抠图，不需要模型。复杂场景可按需启用浏览器本地 AI；首次约下载 40MB，图片不会上传。</p>`;
  uploadRow.appendChild(controls);

  controls.querySelector("#mediaRemoveBackground").addEventListener("input", function(event) {
    stgMedia.removeBackground = event.target.checked;
    stgMediaSyncActiveAsset();
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaBackgroundColor").addEventListener("input", function(event) {
    stgMedia.backgroundColor = event.target.value;
    stgMedia.autoBackgroundColor = false;
    stgMediaSyncActiveAsset();
    controls.querySelector("#mediaAutoBackgroundColor").checked = false;
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaAutoBackgroundColor").addEventListener("input", function(event) {
    stgMedia.autoBackgroundColor = event.target.checked;
    stgMediaSyncActiveAsset();
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaBackgroundTolerance").addEventListener("input", function(event) {
    stgMediaSetValue("backgroundTolerance", event.target.value);
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaBackgroundFeather").addEventListener("input", function(event) {
    stgMediaSetValue("backgroundFeather", event.target.value);
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaImageQuality").addEventListener("input", function(event) {
    stgMedia.imageQuality = event.target.value;
    stgMediaSyncActiveAsset();
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaProtectSubjectWhite").addEventListener("input", function(event) {
    stgMedia.protectSubjectWhite = event.target.checked;
    stgMediaSyncActiveAsset();
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaAutoCrop").addEventListener("input", function(event) {
    stgMedia.autoCrop = event.target.checked;
    stgMediaSyncActiveAsset();
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaBackgroundPreviewMode").addEventListener("input", function(event) {
    stgMedia.backgroundPreviewMode = event.target.value;
    stgMediaSyncActiveAsset();
    stgMediaUpdateBackgroundPreview();
  });
  controls.querySelector("#mediaBackgroundRecommended").addEventListener("click", function() {
    stgMedia.backgroundTolerance = 32;
    stgMedia.backgroundFeather = 8;
    stgMedia.protectSubjectWhite = true;
    stgMedia.autoBackgroundColor = true;
    stgMedia.autoCrop = true;
    stgMediaSyncActiveAsset();
    controls.querySelector("#mediaBackgroundTolerance").value = "32";
    controls.querySelector("#mediaBackgroundFeather").value = "8";
    controls.querySelector("#mediaProtectSubjectWhite").checked = true;
    controls.querySelector("#mediaAutoBackgroundColor").checked = true;
    controls.querySelector("#mediaAutoCrop").checked = true;
    controls.querySelector('[data-media-value="backgroundTolerance"]').textContent = "32";
    controls.querySelector('[data-media-value="backgroundFeather"]').textContent = "8";
    stgMediaScheduleBackgroundRemoval();
  });
  controls.querySelector("#mediaDownloadProcessed").addEventListener("click", stgMediaDownloadProcessed);
  controls.querySelector("#mediaAiRemoveBackground").addEventListener("click", stgMediaApplyAiBackgroundRemoval);
}

function stgMediaInstallAssetAddControls() {
  var grid = document.querySelector(".stg-media-grid");
  var status = document.getElementById("mediaStatus");
  var fileInput = document.getElementById("mediaFile");
  if (!grid || !status || !fileInput || document.getElementById("mediaAddControls")) return;
  var controls = document.createElement("div");
  controls.id = "mediaAddControls";
  controls.className = "stg-media-add-controls";
  controls.innerHTML = `
    <div><strong>多资源编辑</strong><span>图片与图形互相独立</span></div>
    <div class="stg-media-add-actions">
      <button id="mediaAddImages" type="button"><span aria-hidden="true">＋</span> 添加图片</button>
      <button id="mediaAddShape" type="button"><span aria-hidden="true">◇</span> 添加内置图形</button>
    </div>`;
  status.insertAdjacentElement("afterend", controls);
  var library = document.getElementById("mediaAssetLibrary");
  if (library) controls.insertAdjacentElement("afterend", library);
  var activeBar = document.createElement("div");
  activeBar.id = "mediaActiveAssetBar";
  activeBar.className = "stg-media-active-bar is-empty";
  activeBar.innerHTML = '<span>当前没有选中资源</span><small>先在上方添加图片或图形</small>';
  (library || controls).insertAdjacentElement("afterend", activeBar);
  var sourceControl = document.getElementById("mediaSource");
  var sourceRow = sourceControl && sourceControl.closest(".stg-media-row");
  if (sourceRow) sourceRow.hidden = true;
  var uploadLabel = document.querySelector('#mediaUploadRow > label[for="mediaFile"]');
  if (uploadLabel) uploadLabel.textContent = "继续添加图片（不会替换当前图片）";
  controls.querySelector("#mediaAddImages").addEventListener("click", function() {
    var upload = document.getElementById("mediaUploadRow");
    if (upload) upload.hidden = false;
    fileInput.click();
  });
  controls.querySelector("#mediaAddShape").addEventListener("click", function() {
    stgMedia.source = "shape";
    var source = document.getElementById("mediaSource");
    if (source) source.value = "shape";
    stgMediaUpdateSourceUI();
    stgMediaCreateShapeAsset();
  });
}

function stgMediaInstallQuickScaleControls() {
  var scaleInput = document.getElementById("mediaInlineScale");
  if (!scaleInput || document.getElementById("mediaQuickScale")) return;
  var controls = document.createElement("div");
  controls.id = "mediaQuickScale";
  controls.className = "stg-media-quick-scale stg-inline-only";
  controls.innerHTML = `
    <span>图片大小</span>
    <div>
      <button type="button" aria-label="缩小图片">− 缩小</button>
      <strong id="mediaScaleReadout">${Math.round(stgMedia.inlineScale * 100)}%</strong>
      <button type="button" aria-label="放大图片">放大 ＋</button>
    </div>
    <button class="stg-media-scale-reset" type="button">恢复 100%</button>`;
  var activeBar = document.getElementById("mediaActiveAssetBar");
  var mediaStatus = document.getElementById("mediaStatus");
  if (activeBar) activeBar.insertAdjacentElement("afterend", controls);
  else if (mediaStatus && mediaStatus.parentNode) mediaStatus.insertAdjacentElement("afterend", controls);
  else {
    var scaleContainer = scaleInput.closest(".stg-media-scale-controls") || scaleInput.closest(".stg-media-row");
    scaleContainer.parentNode.insertBefore(controls, scaleContainer);
  }
  var buttons = controls.querySelectorAll("div button");
  buttons[0].addEventListener("click", function() { stgMediaNudgeInlineScale(-0.1); });
  buttons[1].addEventListener("click", function() { stgMediaNudgeInlineScale(0.1); });
  controls.querySelector(".stg-media-scale-reset").addEventListener("click", function() { stgMediaSetInlineScale(1); });
}

function stgMediaUpdateSourceUI() {
  var upload = document.getElementById("mediaUploadRow");
  var shape = document.getElementById("mediaShapeRow");
  if (upload) upload.hidden = stgMedia.source !== "image";
  if (shape) shape.hidden = stgMedia.source !== "shape";
  var backgroundControls = document.getElementById("mediaBackgroundControls");
  if (backgroundControls) backgroundControls.hidden = stgMedia.source !== "image";
}

function stgMediaUpdateActiveAssetBar() {
  var bar = document.getElementById("mediaActiveAssetBar");
  if (!bar) return;
  var asset = stgMediaActiveAsset();
  var editorControlIds = ["mediaShape", "mediaColor", "mediaLayer", "mediaMotion", "mediaInlineScale", "mediaInlineOffsetY", "mediaInlinePadding", "mediaX", "mediaY", "mediaSize", "mediaAspect", "mediaRotation", "mediaOpacity", "mediaSpeed"];
  editorControlIds.forEach(function(id) {
    var control = document.getElementById(id);
    if (control) control.disabled = !asset;
  });
  var quickScale = document.getElementById("mediaQuickScale");
  if (quickScale) quickScale.hidden = !asset;
  if (!asset) {
    bar.classList.add("is-empty");
    bar.innerHTML = '<span>当前没有选中资源</span><small>先在上方添加图片或图形</small>';
    return;
  }
  bar.classList.remove("is-empty");
  bar.innerHTML = '<span>正在单独编辑 <strong>{图' + asset.slot + '}</strong></span><small>' +
    (asset.source === "shape" ? "内置图形 · " + stgMediaShapeLabel(asset.shape) : "上传图片 · " + asset.imageName.replace(/[<>]/g, "")) +
    '；下面所有参数只影响这一项</small>';
}

function stgMediaInstallLayerContexts() {
  ["mediaInlineScale", "mediaInlineOffsetY", "mediaInlinePadding"].forEach(function(id) {
    var control = document.getElementById(id);
    if (control) control.closest(".stg-media-row")?.classList.add("stg-inline-only");
  });
  ["mediaX", "mediaY", "mediaSize"].forEach(function(id) {
    var control = document.getElementById(id);
    if (control) control.closest(".stg-media-row")?.classList.add("stg-free-layer-only");
  });
}

function stgMediaUpdateLayerUI() {
  var isInline = stgMedia.layer === "inline";
  document.querySelectorAll(".stg-inline-only").forEach(function(row) { row.hidden = !isInline; });
  document.querySelectorAll(".stg-free-layer-only").forEach(function(row) { row.hidden = isInline; });
  document.querySelectorAll(".stg-media-pair").forEach(function(pair) {
    var contextualRows = Array.from(pair.children).filter(function(child) {
      return child.classList.contains("stg-inline-only") || child.classList.contains("stg-free-layer-only");
    });
    if (contextualRows.length && contextualRows.length === pair.children.length) {
      pair.hidden = contextualRows.every(function(row) { return row.hidden; });
    }
  });
}

function stgMediaUpdateStatus(message, isError) {
  var status = document.getElementById("mediaStatus");
  if (!status) return;

  if (message) {
    status.textContent = message;
  } else if (!stgMedia.enabled) {
    status.textContent = "媒体层未显示";
  } else if (stgMedia.source === "image" && !stgMedia.image) {
    status.textContent = "请选择一张图片";
  } else if (stgMedia.layer === "inline") {
    var dimensionNote = stgMedia.processedWidth
      ? " · 高清主体 " + stgMedia.processedWidth + "×" + stgMedia.processedHeight + " · 动画纹理 " + stgMedia.animationTextureWidth + "×" + stgMedia.animationTextureHeight
      : "";
    var activeAsset = stgMediaActiveAsset();
    status.textContent = stgMedia.source === "image"
      ? (activeAsset ? "{图" + activeAsset.slot + "} · " : "") + stgMedia.imageName + (stgMedia.backgroundRemoved ? " · 背景已转透明" : "") + dimensionNote + " · 可插入任意文字位置"
      : "图形可作为一个字插入光标位置";
  } else {
    status.textContent = stgMedia.source === "image"
      ? stgMedia.imageName + (stgMedia.backgroundRemoved ? " · 已生成透明背景" : "")
      : "内置图形";
  }
  status.classList.toggle("is-error", Boolean(isError));
}

var stgMediaRebuildTimer;
function stgMediaNotifyChange(rebuildInline) {
  if (!rebuildInline || typeof window.stgMediaChanged !== "function") return;
  clearTimeout(stgMediaRebuildTimer);
  stgMediaRebuildTimer = setTimeout(function() {
    window.stgMediaChanged();
    if (window.stgMotionPaused && typeof redraw === "function") redraw();
  }, 48);
}

function stgConfigurePerformance() {
  if (typeof pixelDensity === "function") pixelDensity(1);
}

function stgMediaRememberCaret() {
  var textarea = document.getElementById("textArea");
  if (!textarea) return;
  stgMedia.caretStart = textarea.selectionStart == null ? textarea.value.length : textarea.selectionStart;
  stgMedia.caretEnd = textarea.selectionEnd == null ? stgMedia.caretStart : textarea.selectionEnd;
}

function stgMediaActivateInlineMode() {
  stgMedia.enabled = true;
  stgMedia.layer = "inline";
  var enabled = document.getElementById("mediaEnabled");
  var layer = document.getElementById("mediaLayer");
  if (enabled) enabled.checked = true;
  if (layer) layer.value = "inline";
  stgMediaSyncActiveAsset();
  stgMediaUpdateLayerUI();
}

function stgMediaInsertToken(assetId) {
  var textarea = document.getElementById("textArea");
  if (!textarea) return;
  if (assetId && assetId !== stgMedia.activeAssetId) stgMediaSelectAsset(assetId);
  if (stgMedia.source === "image" && !stgMedia.image) {
    stgMediaUpdateStatus("请先上传一张图片，处理完成后再插入。", true);
    var fileInput = document.getElementById("mediaFile");
    if (fileInput) fileInput.focus();
    return;
  }
  stgMediaActivateInlineMode();
  var activeAsset = stgMediaActiveAsset();
  var token = activeAsset ? "{图" + activeAsset.slot + "}" : "{图}";
  var start = stgMedia.caretStart == null ? textarea.selectionStart : stgMedia.caretStart;
  var end = stgMedia.caretEnd == null ? textarea.selectionEnd : stgMedia.caretEnd;
  if (start == null) start = textarea.value.length;
  if (end == null) end = start;
  textarea.value = textarea.value.slice(0, start) + token + textarea.value.slice(end);
  textarea.focus();
  textarea.setSelectionRange(start + token.length, start + token.length);
  stgMedia.caretStart = start + token.length;
  stgMedia.caretEnd = stgMedia.caretStart;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  stgMediaUpdateStatus("已把 " + token + " 插入第 " + (start + 1) + " 个文字位置；它可独立缩放和调整。", false);
}

function stgMediaEaseOutBack(value) {
  var c1 = 1.70158;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

function stgMediaMotion(phase, asset) {
  var state = asset || stgMedia;
  var t = ((phase * state.speed) % 1 + 1) % 1;
  var result = { x: 0, y: 0, scale: 1, rotation: 0, alpha: 1 };

  if (state.motion === "pop") {
    var intro = Math.min(1, t / 0.32);
    result.scale = 0.15 + 0.85 * stgMediaEaseOutBack(intro);
    result.alpha = Math.min(1, intro * 2.5);
  } else if (state.motion === "slide-left") {
    var slideX = Math.min(1, t / 0.42);
    result.x = (1 - stgMediaEaseOutBack(slideX)) * 180;
    result.alpha = Math.min(1, slideX * 2.4);
  } else if (state.motion === "slide-up") {
    var slideY = Math.min(1, t / 0.42);
    result.y = (1 - stgMediaEaseOutBack(slideY)) * 180;
    result.alpha = Math.min(1, slideY * 2.4);
  } else if (state.motion === "spin") {
    result.rotation = t * Math.PI * 2;
    result.scale = 0.86 + Math.sin(t * Math.PI) * 0.14;
  } else if (state.motion === "breathe") {
    result.scale = 0.88 + (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) * 0.1;
  } else if (state.motion === "float") {
    result.y = Math.sin(t * Math.PI * 2) * 22;
    result.rotation = Math.sin(t * Math.PI * 2) * 0.06;
  } else if (state.motion === "orbit") {
    result.x = Math.cos(t * Math.PI * 2) * 36;
    result.y = Math.sin(t * Math.PI * 2) * 22;
    result.rotation = t * Math.PI * 2;
  }
  return result;
}

function stgMediaDrawShape(shapeName, drawWidth, drawHeight, alpha, asset) {
  var state = asset || stgMedia;
  var shapeColor = color(state.color);
  shapeColor.setAlpha(255 * (alpha == null ? 1 : alpha));
  fill(shapeColor);
  noStroke();
  rectMode(CENTER);
  ellipseMode(CENTER);

  if (shapeName === "square") {
    rect(0, 0, drawWidth, drawHeight, Math.min(drawWidth, drawHeight) * 0.12);
  } else if (shapeName === "pill") {
    rect(0, 0, drawWidth, drawHeight, Math.min(drawWidth, drawHeight) / 2);
  } else if (shapeName === "triangle") {
    triangle(0, -drawHeight / 2, drawWidth / 2, drawHeight / 2, -drawWidth / 2, drawHeight / 2);
  } else if (shapeName === "star") {
    beginShape();
    for (var point = 0; point < 10; point++) {
      var radius = point % 2 === 0 ? drawWidth / 2 : drawWidth / 4.4;
      var angle = -Math.PI / 2 + point * Math.PI / 5;
      vertex(Math.cos(angle) * radius, Math.sin(angle) * radius * drawHeight / drawWidth);
    }
    endShape(CLOSE);
  } else if (shapeName === "ring") {
    noFill();
    stroke(shapeColor);
    strokeWeight(Math.max(3, Math.min(drawWidth, drawHeight) * 0.13));
    ellipse(0, 0, drawWidth * 0.82, drawHeight * 0.82);
  } else {
    ellipse(0, 0, drawWidth, drawHeight);
  }
}

function stgMediaDrawAsset(drawWidth, drawHeight, alpha, asset) {
  var state = asset || stgMedia;
  if (state.source === "image") {
    if (!state.image) return;
    var nativeAspect = state.image.width / Math.max(1, state.image.height);
    var targetWidth = drawWidth * nativeAspect;
    var useWebglTint = typeof _renderer !== "undefined" && _renderer && _renderer.isP3D && alpha != null && alpha < 0.999;
    if (useWebglTint) tint(255, 255 * alpha);
    imageMode(CENTER);
    image(state.image, 0, 0, targetWidth, drawHeight);
    if (useWebglTint) noTint();
  } else {
    stgMediaDrawShape(state.shape, drawWidth, drawHeight, alpha, state);
  }
}

function stgDrawMediaLayer(options) {
  options = options || {};
  var requestedLayer = options.layer || "front";
  if (!stgMedia.enabled) return;

  var canvasWidth = options.width || width;
  var canvasHeight = options.height || height;
  var phase = options.phase == null ? ((frameCount % 90) / 90) : options.phase;
  var states = stgMedia.assets.length ? stgMedia.assets : [stgMedia];
  states.forEach(function(state) {
    if (state.layer === "inline" || state.layer !== requestedLayer) return;
    if (state.source === "image" && !state.image) return;
    var motion = stgMediaMotion(phase, state);
    var base = Math.min(canvasWidth, canvasHeight) * state.size / 100;
    var drawWidth = base * state.aspect;
    var drawHeight = base;
    var alpha = state.opacity / 100 * motion.alpha;

    push();
    var drawX = canvasWidth * state.x / 100 + motion.x;
    var drawY = canvasHeight * state.y / 100 + motion.y;
    if (typeof _renderer !== "undefined" && _renderer && _renderer.isP3D) {
      translate(drawX, drawY, requestedLayer === "front" ? 5000 : -5000);
    } else {
      translate(drawX, drawY);
    }
    rotate(state.rotation * Math.PI / 180 + motion.rotation);
    scale(motion.scale);
    if (typeof drawingContext !== "undefined" && drawingContext) {
      if (typeof drawingContext.save === "function") drawingContext.save();
      if ("globalAlpha" in drawingContext) drawingContext.globalAlpha = alpha;
    }
    stgMediaDrawAsset(drawWidth, drawHeight, alpha, state);
    if (typeof drawingContext !== "undefined" && drawingContext && typeof drawingContext.restore === "function") {
      drawingContext.restore();
    }
    pop();
  });
}

function stgDrawInlineMedia(drawWidth, drawHeight, asset) {
  var state = asset || stgMedia;
  if (!stgMedia.enabled || state.layer !== "inline") return false;
  if (state.source === "image" && !state.image) return false;
  var phase = typeof frameCount === "number" ? (frameCount % 90) / 90 : 0;
  var motion = stgMediaMotion(phase, state);
  push();
  translate(motion.x * 0.2, motion.y * 0.2 + drawHeight * state.inlineOffsetY / 100);
  rotate(state.rotation * Math.PI / 180 + motion.rotation);
  scale(motion.scale);
  if (typeof drawingContext !== "undefined" && drawingContext && typeof drawingContext.save === "function") {
    drawingContext.save();
    if ("globalAlpha" in drawingContext) drawingContext.globalAlpha = state.opacity / 100 * motion.alpha;
  }
  var contentHeight = drawHeight * state.inlineScale;
  var contentWidth = contentHeight * state.aspect;
  if (state.source === "image") {
    contentWidth *= state.image.width / Math.max(1, state.image.height);
    imageMode(CENTER);
    image(state.image, 0, 0, contentWidth, contentHeight);
  } else {
    stgMediaDrawShape(state.shape, contentWidth, contentHeight, state.opacity / 100 * motion.alpha, state);
  }
  if (typeof drawingContext !== "undefined" && drawingContext && typeof drawingContext.restore === "function") {
    drawingContext.restore();
  }
  pop();
  return true;
}

function stgDrawInlineMediaToGraphics(target, lineHeightValue, asset) {
  var state = asset || stgMedia;
  if (!target || !stgMedia.enabled || state.layer !== "inline") return false;
  if (state.source === "image" && !state.image) return false;
  var contentHeight = lineHeightValue * state.inlineScale;
  var contentWidth = contentHeight * state.aspect;
  if (state.source === "image") {
    contentWidth *= state.image.width / Math.max(1, state.image.height);
  }

  target.push();
  target.translate(0, lineHeightValue * state.inlineOffsetY / 100);
  target.rotate(state.rotation * Math.PI / 180);
  if (state.source === "image") {
    target.tint(255, 255 * state.opacity / 100);
    target.imageMode(CENTER);
    target.image(state.image, 0, 0, contentWidth, contentHeight);
    target.noTint();
  } else {
    var shapeColor = color(state.color);
    shapeColor.setAlpha(255 * state.opacity / 100);
    target.fill(shapeColor);
    target.noStroke();
    target.rectMode(CENTER);
    target.ellipseMode(CENTER);
    if (state.shape === "square") {
      target.rect(0, 0, contentWidth, contentHeight, Math.min(contentWidth, contentHeight) * 0.12);
    } else if (state.shape === "pill") {
      target.rect(0, 0, contentWidth, contentHeight, Math.min(contentWidth, contentHeight)/2);
    } else if (state.shape === "triangle") {
      target.triangle(0, -contentHeight/2, contentWidth/2, contentHeight/2, -contentWidth/2, contentHeight/2);
    } else if (state.shape === "ring") {
      target.noFill();
      target.stroke(shapeColor);
      target.strokeWeight(Math.max(2, Math.min(contentWidth, contentHeight) * 0.13));
      target.ellipse(0, 0, contentWidth * 0.82, contentHeight * 0.82);
    } else {
      target.ellipse(0, 0, contentWidth, contentHeight);
    }
  }
  target.pop();
  return true;
}

function stgMediaInlineWidth(lineHeightValue, asset) {
  var state = asset || stgMedia;
  var padding = lineHeightValue * state.inlinePadding / 100 * 2;
  var contentHeight = lineHeightValue * state.inlineScale;
  if (state.source === "image" && state.image) {
    return contentHeight * (state.image.width / Math.max(1, state.image.height)) * state.aspect + padding;
  }
  return contentHeight * state.aspect + padding;
}

function stgMediaInlineAsset(asset) {
  var state = asset || stgMedia;
  if (!stgMedia.enabled || state.layer !== "inline") return null;
  if (state.source === "image" && !state.image) return null;
  if (state.source === "image" && /gif/i.test(state.fileType)) return state.image;

  var baseHeight = 512;
  var contentHeight = baseHeight * Math.min(1, state.inlineScale);
  var nativeAspect = state.source === "image"
    ? state.image.width / Math.max(1, state.image.height)
    : 1;
  var contentWidth = contentHeight * nativeAspect * state.aspect;
  var padding = baseHeight * state.inlinePadding / 100;
  var graphicWidth = Math.max(8, Math.ceil(contentWidth + padding * 2));
  var graphic = createGraphics(graphicWidth, baseHeight);
  graphic.clear();
  graphic.push();
  graphic.translate(graphic.width/2, graphic.height/2 + graphic.height * state.inlineOffsetY / 100);
  graphic.rotate(state.rotation * Math.PI / 180);
  if (state.source === "image") {
    graphic.imageMode(CENTER);
    graphic.tint(255, 255 * state.opacity / 100);
    graphic.image(state.image, 0, 0, contentWidth, contentHeight);
    graphic.noTint();
    graphic.pop();
    return graphic;
  }

  graphic.fill(state.color);
  graphic.noStroke();
  graphic.rectMode(CENTER);
  graphic.ellipseMode(CENTER);
  if (state.shape === "square") {
    graphic.rect(0, 0, contentWidth, contentHeight, Math.min(contentWidth, contentHeight) * 0.12);
  } else if (state.shape === "pill") {
    graphic.rect(0, 0, contentWidth, contentHeight * 0.58, contentHeight * 0.29);
  } else if (state.shape === "triangle") {
    graphic.triangle(0, -contentHeight/2, contentWidth/2, contentHeight/2, -contentWidth/2, contentHeight/2);
  } else if (state.shape === "star") {
    graphic.beginShape();
    for (var point = 0; point < 10; point++) {
      var radius = point % 2 === 0 ? contentWidth/2 : contentWidth/4.4;
      var angle = -Math.PI / 2 + point * Math.PI / 5;
      graphic.vertex(Math.cos(angle) * radius, Math.sin(angle) * radius * contentHeight/contentWidth);
    }
    graphic.endShape(CLOSE);
  } else if (state.shape === "ring") {
    graphic.noFill();
    graphic.stroke(state.color);
    graphic.strokeWeight(Math.max(3, Math.min(contentWidth, contentHeight) * 0.13));
    graphic.ellipse(0, 0, contentWidth * 0.82, contentHeight * 0.82);
  } else {
    graphic.ellipse(0, 0, contentWidth, contentHeight);
  }
  graphic.pop();
  return graphic;
}

document.addEventListener("DOMContentLoaded", function() {
  stgMediaInstallBackgroundControls();
  stgMediaInstallAssetAddControls();
  stgMediaInstallQuickScaleControls();
  stgMediaInstallLayerContexts();
  stgMediaUpdateLayerUI();
  var textarea = document.getElementById("textArea");
  if (textarea) {
    ["input", "keyup", "mouseup", "select", "focus", "blur"].forEach(function(eventName) {
      textarea.addEventListener(eventName, stgMediaRememberCaret);
    });
    stgMediaRememberCaret();
  }
  document.querySelectorAll(".stg-media-action").forEach(function(button) {
    button.addEventListener("pointerdown", stgMediaRememberCaret);
  });
  stgMediaUpdateSourceUI();
  stgMediaUpdateActiveAssetBar();
  stgMediaUpdateStatus();
});
