(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const mode = document.body.dataset.sequenceEffect || "gather";
  const canvas = $("#sequenceCanvas");
  const panel = $(".sequence-panel");
  const panelScroll = panel.querySelector(".panel-scroll");
  const frameCounter = $("#frameCounter");
  const fps = 30;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const smoother = (value) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const easeIn = (value) => Math.pow(clamp(value), 2.35);
  const backOut = (value) => { const t = clamp(value) - 1; return 1 + 2.15 * t * t * t + 1.15 * t * t; };
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value || ""), (part) => part.segment)
    : Array.from(value || "");

  const config = {
    gather: { title: "词序汇聚", en: "WORD GATHER / 37", file: "word-gather", map: ["逐字出现", "接力成句", "彩幕收尾"] },
    portal: { title: "焦点转场", en: "FOCUS PORTAL / 38", file: "focus-portal", map: ["文字序列", "锁定字位", "放大转场"] },
    rapid: { title: "速序轮播", en: "RAPID SEQUENCE / 39", file: "rapid-sequence", map: ["逐行滚入", "快速轮播", "图标收束"] }
  }[mode];

  const iconOptions = `
    <option value="music">音乐</option><option value="play">播放</option><option value="cloud">云朵</option>
    <option value="watch">手表</option><option value="target">彩色靶心</option><option value="animal-01">透明动物 01</option>
    <option value="animal-08">透明动物 08</option><option value="animal-15">透明动物 15</option><option value="animal-23">透明动物 23</option><option value="upload">用户上传</option>`;
  const slider = (label, id, min, max, step, value, format = "number") => `
    <label><span>${label}<output id="${id}Out"></output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-output="${id}Out" data-format="${format}"></label>`;
  const commonFont = `
    <section>
      <div class="sequence-font-grid">
        <label><span class="section-label">字体</span><select id="fontFamily"><option value="inter" selected>Inter</option><option value="space">Space Grotesk</option><option value="manrope">Manrope</option><option value="poppins">Poppins</option><option value="noto">Noto Sans SC · 中文</option></select></label>
        <label><span class="section-label">字重</span><select id="fontWeight"><option value="400">Regular</option><option value="500" selected>Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra Bold</option></select></label>
      </div>
    </section>`;
  const commonColors = `
    <section class="sequence-colors">
      <label>背景<input id="backgroundColor" type="color" value="#f4f3fb"></label>
      <label>文字<input id="textColor" type="color" value="#09090b"></label>
      <label>强调<input id="accentColor" type="color" value="#6c63ff"></label>
    </section>`;
  const commonExport = `
    <section class="transport" aria-label="时间轴控制"><button id="restartButton" type="button">重播</button><button id="pauseButton" type="button">暂停</button><button id="backButton" type="button">−1 帧</button><button id="forwardButton" type="button">+1 帧</button></section>
    <section class="export-panel">
      <label class="section-label" for="exportPreset">导出尺寸</label>
      <select id="exportPreset"><option value="current">当前画板</option><option value="1080x1080">1:1 · 1080 × 1080</option><option value="1080x1350">4:5 · 1080 × 1350</option><option value="1080x1920">9:16 · 1080 × 1920</option><option value="1920x1080">16:9 · 1920 × 1080</option><option value="custom">自定义尺寸</option></select>
      <div class="custom-size" id="customSize" hidden><label>宽<input id="exportWidth" type="number" min="240" max="3840" value="1080"></label><span>×</span><label>高<input id="exportHeight" type="number" min="240" max="3840" value="1920"></label></div>
      <div class="export-timing-grid"><label>导出时长<select id="exportDuration"><option value="cycle" selected>完整一轮</option><option value="1">1 秒</option><option value="3">3 秒</option><option value="5">5 秒</option><option value="10">10 秒</option><option value="custom">自定义</option></select></label><label>导出帧率<select id="exportFps"><option value="15">15 FPS</option><option value="24">24 FPS</option><option value="30" selected>30 FPS</option><option value="60">60 FPS</option></select></label></div>
      <label class="custom-duration" id="customDurationWrap" hidden>自定义秒数<input id="customDuration" type="number" min="0.5" max="30" step="0.1" value="5"></label>
      <div class="export-actions"><button id="exportPng" type="button">PNG 图片</button><button id="exportGif" type="button">GIF 动图</button><button id="exportVideo" type="button">视频</button><button class="export-hd-video" id="exportVerticalVideo" type="button">导出 9:16 高清视频 · 1080 × 1920</button></div>
      <p class="export-status" id="exportStatus" aria-live="polite">画面使用同一条确定性时间线，可逐帧导出。</p>
    </section>`;

  function gatherPanel() {
    return `
      <section class="sequence-content">
        <div class="section-heading"><p class="section-label">内容</p><small class="section-note">用竖线分组；每组内部逐字出现</small></div>
        <label class="stacked-control">接力词组<textarea id="gatherWords">All|new|interface|design</textarea></label>
        <label class="stacked-control">收尾标题<input id="finalTitle" type="text" value="iOS"></label>
        <div class="sequence-preset-actions"><button id="referencePreset" type="button">参考文案</button><button id="chinesePreset" type="button">中文示例</button><button id="restartTop" type="button">从头播放</button></div>
      </section>
      ${commonFont}
      <section>
        <div class="section-heading"><p class="section-label">出现方向</p><small class="section-note">参考视频为从左到右、从下向上</small></div>
        <div class="controls-grid">
          <label>动作版本<select id="gatherStyle"><option value="reference" selected>原版 · 先上升后放大</option><option value="simultaneous">同步上升放大 · 保留版</option></select></label>
          <label>词组顺序<select id="revealOrder"><option value="ltr" selected>从左到右</option><option value="rtl">从右到左</option></select></label>
          <label>进入方向<select id="verticalDirection"><option value="up" selected>从下向上</option><option value="down">从上向下</option></select></label>
        </div>
      </section>
      <section>
        <div class="section-heading"><p class="section-label">核心节奏</p><small class="section-note">逐组接力，并在组合过程中持续放大</small></div>
        <div class="motion-map"><span>${config.map[0]}</span><i>→</i><span>${config.map[1]}</span><i>→</i><span>${config.map[2]}</span></div>
        <div class="controls-grid">
          ${slider("整体速度", "playbackSpeed", .25, 3, .05, 1, "speed")}
          ${slider("开场等待", "gatherLeadIn", 0, 1500, 10, 140, "seconds")}
          ${slider("词组接力间隔", "groupInterval", 40, 1600, 10, 200, "seconds")}
          ${slider("单组上升时间", "groupRise", 80, 1800, 10, 420, "seconds")}
          ${slider("组内逐字间隔", "characterInterval", 0, 240, 2, 24, "seconds")}
          ${slider("单字出现时间", "characterReveal", 30, 800, 10, 130, "seconds")}
          ${slider("汇合后等待", "gatherZoomDelay", 0, 1200, 10, 40, "seconds")}
          ${slider("整体放大时间", "gatherZoomDuration", 40, 1600, 10, 200, "seconds")}
          <label>放大节奏<select id="gatherZoomCurve"><option value="natural" selected>自然柔和</option><option value="fast">快速收束</option><option value="spring">轻弹放大</option><option value="linear">匀速</option></select></label>
          ${slider("标题切换", "titleTransition", 80, 1800, 10, 170, "seconds")}
          ${slider("彩幕展开", "colorReveal", 80, 2200, 10, 350, "seconds")}
          ${slider("收尾停留", "finalHold", 0, 5000, 10, 310, "seconds")}
        </div>
      </section>
      <section>
        <div class="section-heading"><p class="section-label">收尾图标</p><small class="section-note">标题后可追加项目图标</small></div>
        <div class="controls-grid">
          <label class="check-control">显示图标<input id="showIcon" type="checkbox" checked></label>
          <label>内置图标<select id="iconPreset">${iconOptions}</select></label>
          <label class="media-upload">上传图片 / GIF<input id="iconUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"></label>
          ${slider("图标大小", "iconSize", 20, 220, 1, 72, "percent")}
        </div>
      </section>
      <details class="sequence-advanced"><summary>高级细调</summary><div class="controls-grid">
        ${slider("汇聚字号", "fontSize", 24, 220, 1, 58, "pixels")}
        ${slider("收尾字号", "finalSize", 20, 180, 1, 42, "pixels")}
        ${slider("词间距", "wordGap", -30, 120, 1, 18, "pixels")}
        ${slider("水平位置", "textX", 5, 95, 1, 50, "percent")}
        ${slider("垂直位置", "textY", 5, 95, 1, 50, "percent")}
        ${slider("进入距离", "entryDistance", 0, 420, 1, 112, "pixels")}
        ${slider("开场文字大小", "gatherStartScale", 20, 100, 1, 58, "percent")}
        ${slider("合并文字大小", "gatherEndScale", 60, 180, 1, 100, "percent")}
        ${slider("位移柔和度", "gatherSoftness", 0, 100, 1, 82, "percent")}
      </div></details>
      ${commonColors}${commonExport}`;
  }

  function portalPanel() {
    return `
      <section class="sequence-content">
        <div class="section-heading"><p class="section-label">文字序列</p><small class="section-note">每行是一幕；[icon] 代表图标</small></div>
        <label class="stacked-control">开场序列<textarea id="portalSequence">13\n[icon]\nIntroducing\niPhone\n13\nPro</textarea></label>
        <label class="stacked-control">焦点句<input id="portalPhrase" type="text" value="Our fastest model yet."></label>
        <div class="sequence-preset-actions"><button id="referencePreset" type="button">参考文案</button><button id="chinesePreset" type="button">中文示例</button><button id="restartTop" type="button">从头播放</button></div>
      </section>
      ${commonFont}
      <section>
        <div class="section-heading"><p class="section-label">核心节奏</p><small class="section-note">锁定字位后连续放大，不停帧</small></div>
        <div class="motion-map"><span>${config.map[0]}</span><i>→</i><span>${config.map[1]}</span><i>→</i><span>${config.map[2]}</span></div>
        <div class="controls-grid">
          ${slider("整体速度", "playbackSpeed", .25, 3, .05, 1, "speed")}
          ${slider("首幕停留", "introHold", 100, 4000, 20, 1200, "seconds")}
          ${slider("序列间隔", "sequenceInterval", 80, 1800, 10, 340, "seconds")}
          ${slider("焦点句停留", "phraseHold", 0, 5000, 20, 1000, "seconds")}
          ${slider("放大转场时长", "zoomDuration", 180, 5000, 20, 1100, "seconds")}
          ${slider("转场后停留", "finalHold", 0, 5000, 10, 630, "seconds")}
        </div>
      </section>
      <section>
        <div class="section-heading"><p class="section-label">焦点字位 / 图标</p><small class="section-note">可把被放大的字母直接换成图标</small></div>
        <div class="controls-grid">
          <label>焦点类型<select id="focusType"><option value="letter" selected>原文字母</option><option value="icon">替换成图标</option></select></label>
          ${slider("焦点字位", "focusIndex", 1, 30, 1, 1, "index")}
          <label>内置图标<select id="iconPreset">${iconOptions}</select></label>
          <label class="media-upload">上传焦点图片 / GIF<input id="iconUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"></label>
          ${slider("图标大小", "iconSize", 20, 220, 1, 88, "percent")}
          ${slider("放大倍数", "zoomScale", 3, 28, .5, 18, "times")}
        </div>
      </section>
      <details class="sequence-advanced"><summary>高级细调</summary><div class="controls-grid">
        ${slider("字号", "fontSize", 20, 160, 1, 36, "pixels")}
        ${slider("焦点句字号", "phraseSize", 24, 200, 1, 54, "pixels")}
        ${slider("转场旋转", "zoomRotate", -90, 90, 1, -16, "degrees")}
        ${slider("拖影层数", "trailCount", 0, 10, 1, 5, "layers")}
        ${slider("水平位置", "textX", 5, 95, 1, 50, "percent")}
        ${slider("垂直位置", "textY", 5, 95, 1, 50, "percent")}
      </div><label class="stacked-control media-upload">上传转场后图片 / GIF<input id="finalUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label></details>
      ${commonColors}${commonExport}`;
  }

  function rapidPanel() {
    return `
      <section class="sequence-content">
        <div class="section-heading"><p class="section-label">内容</p><small class="section-note">每行文字单独滚入</small></div>
        <label class="stacked-control">开场三行<textarea id="headlineLines">Smooth.\nStylish.\nCustomizable.</textarea></label>
        <label class="stacked-control">中段标题<input id="bridgeText" type="text" value="That's iPhone."></label>
        <label class="stacked-control">快速轮播词<textarea id="rapidItems">M4 Neural Engine\nPro camera system\nAction mode\nSpatial audio\nAll-day battery\nSimply powerful</textarea></label>
        <div class="sequence-preset-actions"><button id="referencePreset" type="button">参考文案</button><button id="chinesePreset" type="button">中文示例</button><button id="restartTop" type="button">从头播放</button></div>
      </section>
      ${commonFont}
      <section>
        <div class="section-heading"><p class="section-label">核心节奏</p><small class="section-note">速度和加减速节奏分开编辑</small></div>
        <div class="motion-map"><span>${config.map[0]}</span><i>→</i><span>${config.map[1]}</span><i>→</i><span>${config.map[2]}</span></div>
        <div class="controls-grid">
          ${slider("整体速度", "playbackSpeed", .25, 3, .05, 1, "speed")}
          ${slider("逐行间隔", "lineStagger", 40, 1600, 10, 230, "seconds")}
          ${slider("单行滚入", "lineRoll", 60, 1500, 10, 190, "seconds")}
          ${slider("三行停留", "headlineHold", 0, 5000, 10, 1350, "seconds")}
          ${slider("轮播每词时间", "rapidInterval", 50, 1200, 10, 180, "seconds")}
          <label>轮播节奏<select id="rapidRhythm"><option value="steady">匀速丝滑</option><option value="accelerate" selected>逐渐加快</option><option value="decelerate">逐渐减慢</option><option value="pulse">快慢脉冲</option><option value="whip">瞬间加速</option></select></label>
        </div>
      </section>
      <section>
        <div class="section-heading"><p class="section-label">图标收束</p><small class="section-note">沿用项目已有图标与动物素材</small></div>
        <div class="controls-grid">
          <label>内置图标<select id="iconPreset">${iconOptions}</select></label>
          <label class="media-upload">上传图片 / GIF<input id="iconUpload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"></label>
          ${slider("图标大小", "iconSize", 20, 220, 1, 78, "percent")}
          ${slider("中段停留", "bridgeHold", 100, 4000, 10, 650, "seconds")}
          ${slider("图标切幕", "iconHold", 80, 3000, 10, 350, "seconds")}
          ${slider("收尾停留", "finalHold", 0, 5000, 10, 850, "seconds")}
        </div>
      </section>
      <details class="sequence-advanced"><summary>高级细调</summary><div class="controls-grid">
        ${slider("字号", "fontSize", 20, 160, 1, 38, "pixels")}
        ${slider("行距", "lineGap", 20, 180, 1, 52, "pixels")}
        ${slider("滚动距离", "scrollDistance", 20, 400, 1, 86, "pixels")}
        ${slider("滚动柔和度", "rollSoftness", 0, 100, 1, 72, "percent")}
        ${slider("水平位置", "textX", 5, 95, 1, 50, "percent")}
        ${slider("垂直位置", "textY", 5, 95, 1, 50, "percent")}
      </div></details>
      ${commonColors}${commonExport}`;
  }

  panel.querySelector("summary").innerHTML = `<span><b>${config.title}</b><small>${config.en}</small></span><i aria-hidden="true">参数</i>`;
  panelScroll.innerHTML = mode === "gather" ? gatherPanel() : mode === "portal" ? portalPanel() : rapidPanel();

  const fontMap = {
    inter: '"Relay Inter", "Relay Noto", sans-serif', space: '"Relay Space", "Relay Noto", sans-serif',
    manrope: '"Relay Manrope", "Relay Noto", sans-serif', poppins: '"Relay Poppins", "Relay Noto", sans-serif', noto: '"Relay Noto", sans-serif'
  };
  const value = (id, fallback = "") => { const element = $(`#${id}`); return element ? element.value : fallback; };
  const number = (id, fallback = 0) => { const result = Number(value(id, fallback)); return Number.isFinite(result) ? result : fallback; };
  const checked = (id) => Boolean($(`#${id}`)?.checked);
  const lines = (id) => String(value(id)).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const csv = (id) => String(value(id)).split(/[,，\s]+/).map(Number).filter(Number.isFinite);
  const speed = () => Math.max(.25, number("playbackSpeed", 1));
  const imageCache = new Map();
  let uploadedIcon = null;
  let uploadedFinal = null;
  let paused = false;
  let pausedAt = 0;
  let animationStart = performance.now();
  let rafId = 0;
  let lastCycle = 1;

  function getImage(path) {
    if (!imageCache.has(path)) { const image = new Image(); image.src = path; imageCache.set(path, image); }
    return imageCache.get(path);
  }
  function selectedImage() {
    const preset = value("iconPreset", "target");
    if (preset === "upload") return uploadedIcon;
    if (preset.startsWith("animal-")) return getImage(`assets/transparent-animals/${preset}.png`);
    return null;
  }
  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + width, y, x + width, y + height, r); context.arcTo(x + width, y + height, x, y + height, r); context.arcTo(x, y + height, x, y, r); context.arcTo(x, y, x + width, y, r); context.closePath();
  }
  function drawBuiltinIcon(context, type, x, y, size, accent = value("accentColor", "#6c63ff")) {
    context.save();
    if (type === "target") {
      ["#ff3157", "#ffcf22", "#36c991", "#36a9ff", "#121214"].forEach((color, index) => { context.beginPath(); context.fillStyle = color; context.arc(x, y, size * (.5 - index * .08), 0, Math.PI * 2); context.fill(); });
      context.restore(); return;
    }
    const background = type === "music" ? "#fa264f" : type === "play" ? "#111" : type === "cloud" ? "#168cff" : type === "watch" ? "#d7ff2f" : accent;
    roundedRect(context, x - size / 2, y - size / 2, size, size, size * .23); context.fillStyle = background; context.fill();
    context.fillStyle = type === "watch" ? "#111" : "#fff"; context.strokeStyle = context.fillStyle; context.lineWidth = size * .065; context.lineCap = "round";
    if (type === "play") { context.beginPath(); context.moveTo(x - size * .1, y - size * .2); context.lineTo(x + size * .23, y); context.lineTo(x - size * .1, y + size * .2); context.closePath(); context.fill(); }
    else if (type === "cloud") { context.beginPath(); context.arc(x - size * .18, y + size * .07, size * .15, 0, Math.PI * 2); context.arc(x + size * .01, y - size * .04, size * .22, 0, Math.PI * 2); context.arc(x + size * .22, y + size * .07, size * .14, 0, Math.PI * 2); context.fill(); }
    else if (type === "watch") { roundedRect(context, x - size * .2, y - size * .29, size * .4, size * .58, size * .11); context.fill(); roundedRect(context, x - size * .13, y - size * .18, size * .26, size * .36, size * .07); context.fillStyle = "#fff"; context.fill(); }
    else { context.beginPath(); context.moveTo(x - size * .05, y - size * .27); context.lineTo(x - size * .05, y + size * .16); context.stroke(); context.beginPath(); context.arc(x - size * .16, y + size * .22, size * .11, 0, Math.PI * 2); context.fill(); context.beginPath(); context.arc(x + size * .07, y + size * .13, size * .11, 0, Math.PI * 2); context.fill(); }
    context.restore();
  }
  function drawIcon(context, x, y, size, alpha = 1) {
    const actualSize = size * number("iconSize", 80) / 100;
    const image = selectedImage();
    context.save(); context.globalAlpha *= alpha;
    if (image?.complete && image.naturalWidth) context.drawImage(image, x - actualSize / 2, y - actualSize / 2, actualSize, actualSize);
    else drawBuiltinIcon(context, value("iconPreset", "target") === "upload" ? "target" : value("iconPreset", "target"), x, y, actualSize);
    context.restore();
  }
  function setFont(context, size) {
    context.font = `${number("fontWeight", 500)} ${size}px ${fontMap[value("fontFamily", "inter")] || fontMap.inter}`;
    context.textBaseline = "middle"; context.textAlign = "left";
  }
  function logicalScale(width, height) { return Math.max(.22, Math.min(width / 1280, height / 720)); }
  function splitWords() { const raw = String(value("gatherWords", "All|new|interface|design")); return raw.includes("|") ? raw.split("|").map((item) => item.trim()).filter(Boolean) : raw.split(/\s+/).filter(Boolean); }

  function timing() {
    const divisor = speed();
    if (mode === "gather") {
      const words = splitWords(), leadIn = number("gatherLeadIn", 140) / 1000 / divisor, interval = number("groupInterval", 200) / 1000 / divisor;
      const rise = number("groupRise", 420) / 1000 / divisor, characterInterval = number("characterInterval", 24) / 1000 / divisor, characterReveal = number("characterReveal", 130) / 1000 / divisor;
      const longestCharacterRun = Math.max(0, ...words.map((word) => Math.max(0, graphemes(word).length - 1) * characterInterval + characterReveal));
      const groupMotion = Math.max(rise, longestCharacterRun), zoomDelay = number("gatherZoomDelay", 40) / 1000 / divisor, zoom = number("gatherZoomDuration", 200) / 1000 / divisor;
      const motionEnd = leadIn + Math.max(0, words.length - 1) * interval + groupMotion, build = motionEnd + zoomDelay + zoom;
      const transition = number("titleTransition", 170) / 1000 / divisor, color = number("colorReveal", 350) / 1000 / divisor, hold = number("finalHold", 310) / 1000 / divisor;
      return { leadIn, interval, rise, characterInterval, characterReveal, groupMotion, motionEnd, zoomDelay, zoom, build, transition, color, hold, cycle: Math.max(1 / fps, build + transition + color + hold) };
    }
    if (mode === "portal") {
      const sequenceCount = Math.max(1, lines("portalSequence").length), intro = number("introHold", 1200) / 1000 / divisor, interval = number("sequenceInterval", 340) / 1000 / divisor;
      const sequence = intro + Math.max(0, sequenceCount - 1) * interval, phrase = number("phraseHold", 1000) / 1000 / divisor, zoom = number("zoomDuration", 1100) / 1000 / divisor, hold = number("finalHold", 630) / 1000 / divisor;
      return { intro, interval, sequence, phrase, zoom, hold, cycle: Math.max(1 / fps, sequence + phrase + zoom + hold) };
    }
    const lineCount = Math.max(1, lines("headlineLines").length), stagger = number("lineStagger", 230) / 1000 / divisor, roll = number("lineRoll", 190) / 1000 / divisor, headlineHold = number("headlineHold", 1350) / 1000 / divisor;
    const headline = Math.max(roll, (lineCount - 1) * stagger + roll) + headlineHold, bridge = number("bridgeHold", 650) / 1000 / divisor, icon = number("iconHold", 350) / 1000 / divisor;
    const rapidCount = Math.max(1, lines("rapidItems").length), interval = number("rapidInterval", 180) / 1000 / divisor, rapid = Math.max(interval, rapidCount * interval), hold = number("finalHold", 850) / 1000 / divisor;
    return { stagger, roll, headline, bridge, icon, interval, rapid, hold, cycle: Math.max(1 / fps, headline + bridge + icon + rapid + hold) };
  }
  function currentTime() { return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000); }
  function setTime(next) { pausedAt = Math.max(0, next); animationStart = performance.now() - pausedAt * 1000; drawPreview(pausedAt); }
  function restart() { pausedAt = 0; animationStart = performance.now(); paused = false; lastCycle = timing().cycle; $("#pauseButton").textContent = "暂停"; }
  function preservePhase() {
    const now = currentTime(), previous = Math.max(1 / fps, lastCycle), next = timing().cycle;
    const rebased = (Math.floor(now / previous) + mod(now, previous) / previous) * next;
    lastCycle = next; if (paused) pausedAt = rebased; else animationStart = performance.now() - rebased * 1000;
  }

  function fillBackground(context, width, height, color = value("backgroundColor", "#f4f3fb")) { context.fillStyle = color; context.fillRect(0, 0, width, height); }
  function wordMetrics(context, words, gap) {
    const widths = words.map((word) => context.measureText(word).width), total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, words.length - 1);
    let cursor = -total / 2; return words.map((word, index) => { const item = { word, width: widths[index], x: cursor }; cursor += widths[index] + gap; return item; });
  }
  function drawGatherPhrase(context, width, height, scale, alpha = 1, groupScale = 1) {
    const words = splitWords(), size = number("fontSize", 58) * scale, gap = number("wordGap", 18) * scale;
    setFont(context, size); const metrics = wordMetrics(context, words, gap), centerX = width * number("textX", 50) / 100, centerY = height * number("textY", 50) / 100;
    context.save(); context.globalAlpha *= alpha; context.translate(centerX, centerY); context.scale(groupScale, groupScale); context.fillStyle = value("textColor", "#09090b");
    metrics.forEach((item) => context.fillText(item.word, item.x, 0)); context.restore();
  }
  function drawGatherTitle(context, width, height, scale, alpha = 1, titleScale = 1) {
    const title = value("finalTitle", "iOS"), size = number("finalSize", 42) * scale, centerX = width * number("textX", 50) / 100, centerY = height * number("textY", 50) / 100;
    setFont(context, size); const textWidth = context.measureText(title).width, iconSpace = checked("showIcon") ? size * .86 : 0, total = textWidth + (iconSpace ? size * .16 + iconSpace : 0);
    context.save(); context.globalAlpha *= alpha; context.translate(centerX, centerY); context.scale(titleScale, titleScale); context.fillStyle = value("textColor", "#09090b"); context.fillText(title, -total / 2, 0);
    if (iconSpace) drawIcon(context, -total / 2 + textWidth + size * .16 + iconSpace / 2, 0, iconSpace, 1); context.restore();
  }
  function gatherZoomCurve(progress) {
    const p = clamp(progress), curve = value("gatherZoomCurve", "natural");
    if (curve === "fast") return easeOut(p);
    if (curve === "spring") return backOut(p);
    if (curve === "linear") return p;
    return smoother(p);
  }
  function renderGather(context, phase, width, height) {
    const t = timing(), scale = logicalScale(width, height), centerX = width * number("textX", 50) / 100, centerY = height * number("textY", 50) / 100;
    fillBackground(context, width, height);
    if (phase < t.build) {
      const words = splitWords(), size = number("fontSize", 58) * scale, gap = number("wordGap", 18) * scale;
      const rightToLeft = value("revealOrder", "ltr") === "rtl", order = rightToLeft ? [...words.keys()].reverse() : [...words.keys()];
      const verticalSign = value("verticalDirection", "up") === "down" ? -1 : 1, distance = number("entryDistance", 112) * scale, softness = number("gatherSoftness", 82) / 100;
      const startScale = number("gatherStartScale", 58) / 100, endScale = number("gatherEndScale", 100) / 100;
      const simultaneous = value("gatherStyle", "reference") === "simultaneous";
      const scaleProgress = simultaneous
        ? smooth((phase - t.leadIn) / Math.max(.001, t.build - t.leadIn - t.zoom * .35))
        : gatherZoomCurve((phase - t.motionEnd - t.zoomDelay) / Math.max(.001, t.zoom));
      setFont(context, size);
      const widths = words.map((word) => context.measureText(word).width), rankByIndex = new Map(order.map((index, rank) => [index, rank]));
      const presence = words.map((word, index) => {
        const rank = rankByIndex.get(index), local = clamp((phase - t.leadIn - rank * t.interval) / Math.max(.001, t.rise));
        return lerp(local, smoother(local), softness);
      });
      const activeIndices = presence.map((progress, index) => progress > .0001 ? index : -1).filter((index) => index >= 0);
      const firstActive = activeIndices.length ? Math.min(...activeIndices) : 0, lastActive = activeIndices.length ? Math.max(...activeIndices) : -1;
      let total = 0;
      for (let index = firstActive; index <= lastActive; index += 1) total += widths[index] * presence[index];
      for (let index = firstActive; index < lastActive; index += 1) total += gap * Math.min(presence[index], presence[index + 1]);
      let cursor = -total / 2; const positions = [];
      for (let index = firstActive; index <= lastActive; index += 1) {
        const slot = widths[index] * presence[index]; positions[index] = cursor + slot / 2;
        cursor += slot + (index < lastActive ? gap * Math.min(presence[index], presence[index + 1]) : 0);
      }
      const groupScale = lerp(startScale, endScale, scaleProgress);
      context.save(); context.translate(centerX, centerY); context.scale(groupScale, groupScale); context.fillStyle = value("textColor", "#09090b");
      words.forEach((word, index) => {
        const groupProgress = presence[index]; if (groupProgress <= 0) return;
        const chars = graphemes(word), rank = rankByIndex.get(index), groupStart = t.leadIn + rank * t.interval;
        const characterOrder = rightToLeft ? [...chars.keys()].reverse() : [...chars.keys()], characterRank = new Map(characterOrder.map((characterIndex, orderIndex) => [characterIndex, orderIndex]));
        const characterWidths = chars.map((character) => context.measureText(character).width), wordWidth = characterWidths.reduce((sum, item) => sum + item, 0), wordLeft = positions[index] - wordWidth / 2;
        let characterX = wordLeft;
        chars.forEach((character, characterIndex) => {
          const revealStart = groupStart + characterRank.get(characterIndex) * t.characterInterval, reveal = smooth((phase - revealStart) / Math.max(.001, t.characterReveal));
          if (reveal > 0) {
            context.save(); context.globalAlpha = reveal;
            context.translate(0, verticalSign * distance * (1 - groupProgress) + verticalSign * distance * .16 * (1 - reveal));
            const characterScale = lerp(.88, 1, reveal); context.scale(characterScale, characterScale); context.fillText(character, characterX, 0); context.restore();
          }
          characterX += characterWidths[characterIndex];
        });
      });
      context.restore();
      return;
    }
    if (phase < t.build + t.transition) {
      const p = smooth((phase - t.build) / Math.max(.001, t.transition)), endScale = number("gatherEndScale", 100) / 100; drawGatherPhrase(context, width, height, scale, 1 - p, endScale * (1 + p * .08)); drawGatherTitle(context, width, height, scale, smooth((p - .36) / .64), lerp(.72, 1, backOut((p - .36) / .64))); return;
    }
    const colorStart = t.build + t.transition;
    if (phase < colorStart + t.color) {
      const p = smooth((phase - colorStart) / Math.max(.001, t.color)), radius = Math.hypot(width, height) * p;
      const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(1, radius)); gradient.addColorStop(0, value("accentColor", "#6c63ff")); gradient.addColorStop(.5, "#dc5fb4"); gradient.addColorStop(1, "#ef9b57");
      context.save(); context.beginPath(); context.arc(centerX, centerY, radius, 0, Math.PI * 2); context.clip(); context.fillStyle = gradient; context.fillRect(0, 0, width, height); context.restore(); drawGatherTitle(context, width, height, scale, 1, 1); return;
    }
    const gradient = context.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, value("accentColor", "#6c63ff")); gradient.addColorStop(.48, "#d35fbd"); gradient.addColorStop(1, "#f2a353"); context.fillStyle = gradient; context.fillRect(0, 0, width, height); drawGatherTitle(context, width, height, scale, 1, 1);
  }

  function phraseLayout(context, phrase, width, height, size, replaceIndex = -1) {
    const chars = graphemes(phrase), iconWidth = size * .9, widths = chars.map((char, index) => index === replaceIndex ? iconWidth : context.measureText(char).width), total = widths.reduce((sum, item) => sum + item, 0);
    let x = width * number("textX", 50) / 100 - total / 2; const y = height * number("textY", 50) / 100;
    return chars.map((char, index) => { const item = { char, index, x, y, width: widths[index], centerX: x + widths[index] / 2 }; x += widths[index]; return item; });
  }
  function drawPortalPhrase(context, width, height, scale, alpha = 1, transform = null) {
    const phrase = value("portalPhrase", "Our fastest model yet."), size = number("phraseSize", 54) * scale, replaceIndex = value("focusType", "letter") === "icon" ? clamp(number("focusIndex", 1) - 1, 0, Math.max(0, graphemes(phrase).length - 1)) : -1;
    setFont(context, size); const layout = phraseLayout(context, phrase, width, height, size, replaceIndex), focusIndex = clamp(number("focusIndex", 1) - 1, 0, Math.max(0, layout.length - 1)), focus = layout[focusIndex] || { centerX: width / 2, y: height / 2 };
    context.save(); context.globalAlpha *= alpha;
    if (transform) { context.translate(width / 2, height / 2); context.rotate(transform.rotation); context.scale(transform.scale, transform.scale); context.translate(-focus.centerX, -focus.y); }
    context.fillStyle = value("textColor", "#09090b"); layout.forEach((item) => { if (item.index === replaceIndex) drawIcon(context, item.centerX, item.y, size, 1); else context.fillText(item.char, item.x, item.y); }); context.restore();
    return { layout, focus };
  }
  function drawPortalFinal(context, width, height, scale, alpha = 1) {
    context.save(); context.globalAlpha *= alpha;
    if (uploadedFinal?.complete && uploadedFinal.naturalWidth) {
      const sourceRatio = uploadedFinal.naturalWidth / uploadedFinal.naturalHeight, targetRatio = width / height; let drawWidth, drawHeight, x, y;
      if (sourceRatio > targetRatio) { drawHeight = height; drawWidth = height * sourceRatio; x = (width - drawWidth) / 2; y = 0; } else { drawWidth = width; drawHeight = width / sourceRatio; x = 0; y = (height - drawHeight) / 2; }
      context.drawImage(uploadedFinal, x, y, drawWidth, drawHeight); context.restore(); return;
    }
    const gradient = context.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, "#f2f1f8"); gradient.addColorStop(1, "#a7a2bd"); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
    context.save(); context.translate(width * .7, height * .56); context.rotate(-.18); const phoneW = 360 * scale, phoneH = 520 * scale; roundedRect(context, -phoneW / 2, -phoneH / 2, phoneW, phoneH, 52 * scale); context.fillStyle = "#24232b"; context.fill();
    [[-.23, -.23], [.18, -.23], [-.23, .16]].forEach(([x, y]) => { context.beginPath(); context.fillStyle = "#0a0a0d"; context.arc(x * phoneW, y * phoneW, 70 * scale, 0, Math.PI * 2); context.fill(); context.beginPath(); context.strokeStyle = "#777486"; context.lineWidth = 8 * scale; context.arc(x * phoneW, y * phoneW, 56 * scale, 0, Math.PI * 2); context.stroke(); }); context.restore();
    context.restore();
  }
  function renderPortal(context, phase, width, height) {
    const t = timing(), scale = logicalScale(width, height), sequence = lines("portalSequence"); fillBackground(context, width, height);
    if (phase < t.sequence) {
      let index = 0, local = 1;
      if (phase >= t.intro) { const elapsed = phase - t.intro; index = Math.min(sequence.length - 1, 1 + Math.floor(elapsed / Math.max(.001, t.interval))); local = mod(elapsed, Math.max(.001, t.interval)) / Math.max(.001, t.interval); }
      const item = sequence[index] || "13", reveal = index === 0 ? 1 : smooth(local / .28), y = height * number("textY", 50) / 100 + lerp(18 * scale, 0, reveal); const size = number("fontSize", 36) * scale;
      setFont(context, size); context.textAlign = "center"; context.fillStyle = value("textColor", "#09090b"); context.globalAlpha = reveal;
      if (item.toLowerCase() === "[icon]") drawIcon(context, width * number("textX", 50) / 100, y, size * 1.15, 1); else context.fillText(item, width * number("textX", 50) / 100, y); context.globalAlpha = 1; return;
    }
    const phraseStart = t.sequence;
    if (phase < phraseStart + t.phrase) { drawPortalPhrase(context, width, height, scale, 1); return; }
    const zoomStart = phraseStart + t.phrase;
    if (phase < zoomStart + t.zoom) {
      const p = clamp((phase - zoomStart) / Math.max(.001, t.zoom)), mapped = easeIn(p), zoomScale = number("zoomScale", 18), rotation = number("zoomRotate", -16) * Math.PI / 180 * mapped, trailCount = Math.round(number("trailCount", 5));
      for (let index = trailCount; index >= 1; index -= 1) { const ghostP = clamp(p - index * .014), ghostMapped = easeIn(ghostP); drawPortalPhrase(context, width, height, scale, .035 + .025 * (trailCount - index), { scale: lerp(1, zoomScale, ghostMapped), rotation: number("zoomRotate", -16) * Math.PI / 180 * ghostMapped }); }
      drawPortalPhrase(context, width, height, scale, 1, { scale: lerp(1, zoomScale, mapped), rotation });
      const portal = smooth((p - .74) / .26); if (portal > 0) { context.beginPath(); context.fillStyle = "#09090b"; context.arc(width / 2, height / 2, Math.hypot(width, height) * portal, 0, Math.PI * 2); context.fill(); }
      const reveal = smooth((p - .88) / .12); if (reveal > 0) drawPortalFinal(context, width, height, scale, reveal); return;
    }
    drawPortalFinal(context, width, height, scale, 1);
  }

  function rapidCurve(progress, rhythm) {
    const p = clamp(progress);
    if (rhythm === "accelerate") return Math.pow(p, 1.42);
    if (rhythm === "decelerate") return 1 - Math.pow(1 - p, 1.55);
    if (rhythm === "pulse") return clamp(p + Math.sin(p * Math.PI * 6) * .045 * Math.sin(Math.PI * p));
    if (rhythm === "whip") return p < .36 ? .22 * smoother(p / .36) : .22 + .78 * Math.pow((p - .36) / .64, .62);
    return p;
  }
  function drawRapidRoll(context, textA, textB, fraction, width, height, scale, size) {
    const distance = number("scrollDistance", 86) * scale, softness = number("rollSoftness", 72) / 100, eased = lerp(fraction, smooth(fraction), softness), centerX = width * number("textX", 50) / 100, centerY = height * number("textY", 50) / 100;
    setFont(context, size); context.textAlign = "center"; context.fillStyle = value("textColor", "#09090b");
    context.save(); context.globalAlpha = 1 - smooth(eased); context.fillText(textA || "", centerX, centerY - distance * eased); context.restore();
    context.save(); context.globalAlpha = smooth(eased); context.fillText(textB || textA || "", centerX, centerY + distance * (1 - eased)); context.restore();
  }
  function renderRapid(context, phase, width, height) {
    const t = timing(), scale = logicalScale(width, height), size = number("fontSize", 38) * scale, centerX = width * number("textX", 50) / 100, centerY = height * number("textY", 50) / 100; fillBackground(context, width, height);
    if (phase < t.headline) {
      const items = lines("headlineLines"), gap = number("lineGap", 52) * scale; setFont(context, size); context.textAlign = "left"; const maxWidth = Math.max(...items.map((item) => context.measureText(item).width), 1), x = centerX - maxWidth / 2, firstY = centerY - gap * (items.length - 1) / 2;
      items.forEach((item, index) => { const start = index * t.stagger, p = smooth((phase - start) / Math.max(.001, t.roll)); if (p <= 0) return; context.save(); context.globalAlpha = p; context.fillStyle = value("textColor", "#09090b"); context.fillText(item, x, firstY + index * gap + lerp(34 * scale, 0, p)); context.restore(); }); return;
    }
    let cursor = t.headline;
    if (phase < cursor + t.bridge) {
      const local = clamp((phase - cursor) / Math.max(.001, t.bridge)), p = smooth(local / .26), words = value("bridgeText", "That's iPhone.").trim().split(/\s+/), suffix = words.length > 1 ? words.pop() : "", prefix = words.join(" ") || suffix, suffixProgress = suffix ? smooth((local - .42) / .24) : 0;
      setFont(context, size); context.textAlign = "left"; const prefixWidth = context.measureText(prefix).width, suffixWidth = suffix ? context.measureText(` ${suffix}`).width : 0, totalWidth = prefixWidth + suffixWidth, prefixX = lerp(centerX - prefixWidth / 2, centerX - totalWidth / 2, suffixProgress), y = centerY + lerp(22 * scale, 0, p);
      context.save(); context.globalAlpha = p; context.fillStyle = value("textColor", "#09090b"); context.fillText(prefix, prefixX, y); if (suffix) { context.globalAlpha *= suffixProgress; context.fillStyle = value("accentColor", "#6c63ff"); context.fillText(` ${suffix}`, prefixX + prefixWidth, y); } context.restore(); return;
    }
    cursor += t.bridge;
    if (phase < cursor + t.icon) { fillBackground(context, width, height, "#101014"); drawIcon(context, centerX, centerY, size * 1.3, 1); return; }
    cursor += t.icon;
    if (phase < cursor + t.rapid) {
      const items = lines("rapidItems"), u = clamp((phase - cursor) / Math.max(.001, t.rapid)), position = rapidCurve(u, value("rapidRhythm", "accelerate")) * Math.max(0, items.length - 1), index = Math.min(items.length - 1, Math.floor(position)), fraction = position - Math.floor(position), next = Math.min(items.length - 1, index + 1); drawRapidRoll(context, items[index], items[next], fraction, width, height, scale, size); return;
    }
    cursor += t.rapid; const p = smooth((phase - cursor) / Math.max(.12, Math.min(t.hold * .7, .48 / speed()))), blobSize = Math.hypot(width, height) * .11 * lerp(.25, 1, backOut(p));
    context.save(); context.translate(centerX, centerY); context.rotate(-.28); roundedRect(context, -blobSize * .68, -blobSize * .48, blobSize * 1.36, blobSize * .96, blobSize * .28); context.fillStyle = value("accentColor", "#6c63ff"); context.fill(); context.restore(); drawIcon(context, centerX, centerY, size * 1.35, p);
  }

  function renderFrame(target, time, width, height, ratio = 1) {
    const context = target.getContext("2d"); context.setTransform(ratio, 0, 0, ratio, 0, 0); context.imageSmoothingEnabled = true; const local = mod(time, timing().cycle);
    if (mode === "gather") renderGather(context, local, width, height); else if (mode === "portal") renderPortal(context, local, width, height); else renderRapid(context, local, width, height);
    if (target === canvas) { canvas.dataset.effect = mode; canvas.dataset.phase = local.toFixed(4); canvas.dataset.cycleDuration = timing().cycle.toFixed(4); canvas.dataset.timelineTime = time.toFixed(4); }
  }
  function resizeCanvas() {
    const ratio = Math.min(1.35, Math.max(1, window.devicePixelRatio || 1)), width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight), pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; canvas.dataset.ratio = String(ratio); }
  }
  function drawPreview(time = currentTime()) { resizeCanvas(); const ratio = Number(canvas.dataset.ratio || 1); renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio); frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`; }
  function previewLoop() { drawPreview(); rafId = requestAnimationFrame(previewLoop); }

  function outputText(input) {
    const raw = Number(input.value), format = input.dataset.format;
    if (format === "seconds") return `${(raw / 1000).toFixed(2)}秒`;
    if (format === "speed") return `${raw.toFixed(2)}×`;
    if (format === "pixels") return `${raw}px`;
    if (format === "percent") return `${raw}%`;
    if (format === "degrees") return `${raw}°`;
    if (format === "times") return `${raw.toFixed(1)}×`;
    if (format === "layers") return `${raw}层`;
    if (format === "index") return `第${raw}位`;
    return String(raw);
  }
  function updateOutputs() { document.querySelectorAll("[data-output]").forEach((input) => { const output = $(`#${input.dataset.output}`); if (output) output.textContent = outputText(input); }); }
  panelScroll.querySelectorAll("input, textarea, select").forEach((input) => input.addEventListener(input.type === "file" ? "change" : "input", () => { updateOutputs(); preservePhase(); }));
  $("#iconUpload")?.addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { uploadedIcon = image; $("#iconPreset").value = "upload"; }; image.src = reader.result; }; reader.readAsDataURL(file); });
  $("#finalUpload")?.addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { uploadedFinal = image; }; image.src = reader.result; }; reader.readAsDataURL(file); });

  function setReference() {
    if (mode === "gather") { $("#gatherWords").value = "All|new|interface|design"; $("#finalTitle").value = "iOS"; }
    else if (mode === "portal") { $("#portalSequence").value = "13\n[icon]\nIntroducing\niPhone\n13\nPro"; $("#portalPhrase").value = "Our fastest model yet."; $("#focusIndex").value = "1"; }
    else { $("#headlineLines").value = "Smooth.\nStylish.\nCustomizable."; $("#bridgeText").value = "That's iPhone."; $("#rapidItems").value = "M4 Neural Engine\nPro camera system\nAction mode\nSpatial audio\nAll-day battery\nSimply powerful"; }
    $("#fontFamily").value = "inter"; updateOutputs(); restart();
  }
  function setChinese() {
    if (mode === "gather") { $("#gatherWords").value = "全新|界面|灵感|设计"; $("#finalTitle").value = "现在开始"; }
    else if (mode === "portal") { $("#portalSequence").value = "你好\n[icon]\n重新认识\n未来\n现在\n出发"; $("#portalPhrase").value = "最快的灵感，就在此刻。"; $("#focusIndex").value = "1"; }
    else { $("#headlineLines").value = "流畅。\n醒目。\n自由。"; $("#bridgeText").value = "这就是灵感。"; $("#rapidItems").value = "快速切换\n丝滑滚动\n自由节奏\n图标收束\n马上开始"; }
    $("#fontFamily").value = "noto"; updateOutputs(); restart();
  }
  $("#referencePreset").addEventListener("click", setReference); $("#chinesePreset").addEventListener("click", setChinese);
  [$("#restartTop"), $("#restartButton")].forEach((button) => button.addEventListener("click", restart));
  $("#pauseButton").addEventListener("click", (event) => { if (paused) { animationStart = performance.now() - pausedAt * 1000; paused = false; event.currentTarget.textContent = "暂停"; } else { pausedAt = currentTime(); paused = true; drawPreview(pausedAt); event.currentTarget.textContent = "继续"; } });
  $("#backButton").addEventListener("click", () => { paused = true; setTime(currentTime() - 1 / fps); $("#pauseButton").textContent = "继续"; });
  $("#forwardButton").addEventListener("click", () => { paused = true; setTime(currentTime() + 1 / fps); $("#pauseButton").textContent = "继续"; });
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(rafId); else { animationStart = performance.now() - currentTime() * 1000; previewLoop(); } });

  function exportDimensions() { const preset = value("exportPreset", "current"); if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)]; if (preset === "custom") return [number("exportWidth", 1080), number("exportHeight", 1920)]; return preset.split("x").map(Number); }
  function exportCanvas(vertical = false) { const result = document.createElement("canvas"), dimensions = vertical ? [1080, 1920] : exportDimensions(); result.width = clamp(Math.round(dimensions[0]) || 1080, 240, 3840); result.height = clamp(Math.round(dimensions[1]) || 1080, 240, 3840); return result; }
  function exportDuration() { const selected = value("exportDuration", "cycle"); if (selected === "cycle") return timing().cycle; if (selected === "custom") return clamp(number("customDuration", 5), .5, 30); return number("exportDuration", 5); }
  function download(blob, filename) { const link = document.createElement("a"), url = URL.createObjectURL(blob); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  const exportStatus = $("#exportStatus"), exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")];
  function setBusy(busy, message) { exportButtons.forEach((button) => { button.disabled = busy; }); exportStatus.textContent = message; }
  $("#exportPreset").addEventListener("change", (event) => { $("#customSize").hidden = event.target.value !== "custom"; });
  $("#exportDuration").addEventListener("change", (event) => { $("#customDurationWrap").hidden = event.target.value !== "custom"; });
  $("#exportPng").addEventListener("click", () => { const output = exportCanvas(); renderFrame(output, currentTime(), output.width, output.height, 1); output.toBlob((blob) => { if (!blob) return; download(blob, `${config.file}-${output.width}x${output.height}.png`); exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`; }, "image/png"); });
  $("#exportGif").addEventListener("click", () => {
    if (!window.GIF) { exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。"; return; }
    const output = exportCanvas(), rate = number("exportFps", 30), duration = exportDuration(), frameTotal = Math.ceil(duration * rate), gif = new GIF({ workers: 2, quality: 10, width: output.width, height: output.height, workerScript: "js/continuation-gif.worker.js" }); setBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
    for (let frame = 0; frame < frameTotal; frame += 1) { renderFrame(output, frame / rate, output.width, output.height, 1); gif.addFrame(output, { copy: true, delay: 1000 / rate }); }
    gif.on("progress", (progress) => { exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`; }); gif.on("finished", (blob) => { download(blob, `${config.file}-${output.width}x${output.height}.gif`); setBusy(false, "GIF 已生成"); }); gif.render();
  });
  async function exportVideo(vertical = false) {
    const output = exportCanvas(vertical), rate = number("exportFps", 30), duration = exportDuration(), frameTotal = Math.ceil(duration * rate); setBusy(true, "正在逐帧生成视频 · 0%");
    try { if (typeof window.WebMWriter !== "function") throw new Error("视频编码器未加载"); const writer = new WebMWriter({ quality: .94, frameRate: rate }); for (let frame = 0; frame < frameTotal; frame += 1) { renderFrame(output, frame / rate, output.width, output.height, 1); writer.addFrame(output); if (frame % 2 === 0) { exportStatus.textContent = `正在逐帧生成视频 · ${Math.round((frame + 1) / frameTotal * 100)}%`; await new Promise((resolve) => setTimeout(resolve, 0)); } } download(await writer.complete(), `${config.file}-${output.width}x${output.height}.webm`); setBusy(false, `WEBM 视频已生成 · ${output.width} × ${output.height}`); }
    catch (error) { setBusy(false, `视频导出失败：${error.message}`); }
  }
  $("#exportVideo").addEventListener("click", () => exportVideo(false)); $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));

  updateOutputs(); lastCycle = timing().cycle; document.fonts.ready.then(restart); previewLoop();
})();
