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
  const mixHex = (from, to, progress) => {
    const parse = (color) => {
      const hex = String(color || "").replace("#", "").padEnd(6, "0").slice(0, 6);
      return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) || 0);
    };
    const a = parse(from), b = parse(to), p = clamp(progress);
    return `rgb(${a.map((channel, index) => Math.round(lerp(channel, b[index], p))).join(",")})`;
  };
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
    rapid: { title: "速序轮播", en: "RAPID SEQUENCE / 39", file: "rapid-sequence", map: ["逐行滚入", "快速轮播", "图标收束"] },
    city: { title: "城市字塔", en: "CITY STACK / 40", file: "city-stack", map: ["逐字点亮", "纵向叠满", "署名收尾"] }
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
  const cityFont = `
    <section>
      <div class="section-heading"><p class="section-label">字体</p><small class="section-note">按原片分开：中文主字、英文、副标题、署名各用一套字体</small></div>
      <div class="sequence-font-grid">
        <label><span class="section-label">主中文字体</span><select id="fontFamily"><option value="hk-lettering" selected>原片字形 · 只在香港</option><option value="noto-hk">Noto Sans HK</option><option value="noto">Noto Sans SC</option><option value="city-black">Noto Sans SC Black</option><option value="montserrat">Montserrat</option><option value="albert">Albert Sans</option><option value="inter">Inter</option><option value="space">Space Grotesk</option><option value="manrope">Manrope</option><option value="poppins">Poppins</option></select></label>
        <label><span class="section-label">主中文字重</span><select id="cityHanWeight"><option value="300">Light</option><option value="400">Regular</option><option value="500" selected>Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra Bold</option></select></label>
        <label><span class="section-label">英文字体</span><select id="cityEnglishFont"><option value="follow">跟随主字体</option><option value="noto-hk">Noto Sans HK</option><option value="noto">Noto Sans SC</option><option value="city-black">Noto Sans SC Black</option><option value="montserrat" selected>Montserrat</option><option value="albert">Albert Sans</option><option value="inter">Inter</option><option value="space">Space Grotesk</option><option value="manrope">Manrope</option><option value="poppins">Poppins</option></select></label>
        <label><span class="section-label">英文字重</span><select id="cityEnglishWeight"><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700" selected>Bold</option><option value="800">Extra Bold</option></select></label>
        <label><span class="section-label">副标题字体</span><select id="citySubtitleFont"><option value="follow">跟随主字体</option><option value="noto-hk" selected>Noto Sans HK</option><option value="noto">Noto Sans SC</option><option value="city-black">Noto Sans SC Black</option><option value="montserrat">Montserrat</option><option value="albert">Albert Sans</option><option value="inter">Inter</option><option value="space">Space Grotesk</option><option value="manrope">Manrope</option><option value="poppins">Poppins</option></select></label>
        <label><span class="section-label">副标题字重</span><select id="citySubtitleWeight"><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="750" selected>Bold 750 · 原片</option><option value="800">Extra Bold</option><option value="900">Black</option></select></label>
        <label><span class="section-label">署名字体</span><select id="cityFooterFont"><option value="follow">跟随主字体</option><option value="noto-hk">Noto Sans HK</option><option value="noto">Noto Sans SC</option><option value="city-black">Noto Sans SC Black</option><option value="montserrat">Montserrat</option><option value="albert" selected>Albert Sans</option><option value="inter">Inter</option><option value="space">Space Grotesk</option><option value="manrope">Manrope</option><option value="poppins">Poppins</option></select></label>
        <label><span class="section-label">署名字重</span><select id="cityFooterWeight"><option value="400">Regular</option><option value="500">Medium</option><option value="600" selected>Semibold</option><option value="700">Bold</option></select></label>
      </div>
      <p class="hint">“原片字形”按参考视频逐笔还原了“只在香港”四个字（字重固定为原片粗细）；输入其它汉字时自动使用 Noto Sans HK。</p>
    </section>`;
  const commonColors = `
    <section class="sequence-colors">
      <label>背景<input id="backgroundColor" type="color" value="#f4f3fb"></label>
      <label>文字<input id="textColor" type="color" value="#09090b"></label>
      <label>强调<input id="accentColor" type="color" value="#6c63ff"></label>
    </section>`;
  const cityColors = `
    <section class="sequence-colors">
      <label>背景<input id="backgroundColor" type="color" value="#000000"></label>
      <label>主汉字<input id="accentColor" type="color" value="#4cebfa"></label>
      <label>英文字<input id="cityEnglishColor" type="color" value="#4cebfa"></label>
      <label>副标题<input id="citySubtitleColor" type="color" value="#4cebfa"></label>
      <label>单项闪烁<input id="cityFlashColor" type="color" value="#0f3f45"></label>
      <label>署名<input id="textColor" type="color" value="#ffffff"></label>
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
          ${slider("开始上升时间", "gatherLeadIn", 0, 1500, 10, 140, "seconds")}
          ${slider("词组接力间隔", "groupInterval", 40, 1600, 10, 200, "seconds")}
          ${slider("单组上升时间", "groupRise", 80, 1800, 10, 420, "seconds")}
          ${slider("第一组起始距离", "entryDistance", 0, 520, 1, 48, "pixels")}
          ${slider("每组递增距离", "entryStep", 0, 240, 1, 84, "pixels")}
          ${slider("组内逐字间隔", "characterInterval", 0, 240, 2, 24, "seconds")}
          ${slider("单字出现时间", "characterReveal", 30, 800, 10, 130, "seconds")}
          ${slider("汇合后等待", "gatherZoomDelay", 0, 1200, 10, 40, "seconds")}
          ${slider("整体放大时间", "gatherZoomDuration", 40, 1600, 10, 200, "seconds")}
          ${slider("上升阶段大小", "gatherStartScale", 20, 100, 1, 46, "percent")}
          ${slider("放大完成大小", "gatherEndScale", 60, 180, 1, 116, "percent")}
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

  function cityPanel() {
    return `
      <section class="sequence-content">
        <div class="section-heading"><p class="section-label">文字内容</p><small class="section-note">输入任意字数；换行决定排版，顺序单独编排</small></div>
        <label class="stacked-control">主汉字<textarea id="cityHanLines">只在\n香港</textarea></label>
        <div class="controls-grid">
          <label>播放结构<select id="cityTimelineMode"><option value="neon" selected>原片霓虹点亮 · HK</option><option value="build">逐项搭建 · 动效 11</option><option value="pulse">全文出现后局部闪 · 11-1</option></select></label>
          <label>汉字搭建顺序<select id="cityHanOrder"><option value="row-ltr" selected>逐行 · 左到右</option><option value="row-rtl">逐行 · 右到左</option><option value="column">逐列 · 上到下</option><option value="reverse">全部倒序</option><option value="custom">自定义字位</option></select></label>
          <label>汉字自定义顺序<input id="cityCustomOrder" type="text" value="1,2,3,4" placeholder="例如 2,1,4,3"></label>
          <label>局部闪烁顺序<input id="cityFlashSequence" type="text" value="全部" placeholder="例如 H3,S3+S4,E1,E2"></label>
        </div>
        <p class="hint">字位：H=主汉字，E=英文行，S=副标题字；例如 H3,S3+S4,E1。逗号代表先后，+ 代表同时；未填写的字不闪烁，“全部”代表全部参与。</p>
        <label class="stacked-control">逐项闪烁时长 · 可选<input id="cityHanDurations" type="text" value="" placeholder="毫秒，例如 320,450,280；留空使用统一时长"></label>
        <label class="stacked-control">逐项闪完后等待 · 可选<input id="cityFlashGaps" type="text" value="" placeholder="毫秒，例如 40,120,80；留空使用统一等待"></label>
        <label class="stacked-control">霓虹点亮 · 逐项亮起时间<input id="cityNeonStarts" type="text" value="0,333,500,700,900,1133,1467,1533,1700" placeholder="毫秒，按 只、在、香、港、HONG、KONG、亚洲、都会、国际 的顺序"></label>
        <label class="stacked-control">霓虹点亮 · 逐项熄灭区间<input id="cityNeonOffs" type="text" value="100-233; 133-167; 33-133; 300-333; 500-533,567-600; 100-267,667-733; 167-267; 133-300; " placeholder="毫秒，相对该项亮起；分号分隔每一项，例如 100-233; 133-167"></label>
        <p class="hint">霓虹点亮按原片逐帧测得：每一项硬切亮起，在熄灭区间里整项消失，之后常亮。顺序为主汉字（按搭建顺序）→ 英文行 → 副标题组（两端先亮、中间后亮）；未填写的项沿用最后的间隔和 100-233 的熄灭区间。</p>
        <label class="stacked-control">英文叠字<textarea id="cityEnglishLines">HONG\nKONG</textarea></label>
        <label class="stacked-control">底部副标题<input id="citySubtitle" type="text" value="亚洲国际都会"></label>
        <label class="stacked-control">末尾署名<input id="cityFooter" type="text" value="discoverhongkong.cn"></label>
        <div class="sequence-preset-actions"><button id="referenceHkPreset" type="button">HK 原片参考</button><button id="referencePreset" type="button">动效 11 参考</button><button id="referenceAltPreset" type="button">动效 11-1 参考</button><button id="chinesePreset" type="button">中文示例</button><button id="restartTop" type="button">从头播放</button></div>
      </section>
      ${cityFont}
      <section>
        <div class="section-heading"><p class="section-label">核心节奏</p><small class="section-note">单字依次亮起、熄灭，再进入下一次点亮</small></div>
        <div class="motion-map"><span>${config.map[0]}</span><i>→</i><span>${config.map[1]}</span><i>→</i><span>${config.map[2]}</span></div>
        <div class="controls-grid">
          ${slider("整体速度", "playbackSpeed", .25, 3, .05, 1, "speed")}
          ${slider("开始出现时间", "cityLeadIn", 0, 2400, 10, 60, "seconds")}
          ${slider("全文出现到首次闪烁", "cityPulseDelay", 0, 1600, 10, 120, "seconds")}
          ${slider("每字闪完后等待", "cityHanInterval", 0, 1000, 10, 40, "seconds")}
          ${slider("英文每行闪完后等待", "cityEnglishInterval", 0, 1200, 10, 40, "seconds")}
          ${slider("统一单字闪烁时长", "cityEntryDuration", 80, 1000, 10, 320, "seconds")}
          ${slider("单项闪烁次数", "cityFlashCount", 1, 6, 1, 4, "number")}
          ${slider("末个汉字到英文", "citySectionGap", 0, 1200, 10, 150, "seconds")}
          ${slider("末行英文到副标", "citySubtitleDelay", 0, 1800, 10, 260, "seconds")}
          ${slider("副标题每组结束后等待", "citySubtitleInterval", 0, 600, 10, 40, "seconds")}
          ${slider("署名等待", "cityFooterDelay", 0, 2400, 10, 70, "seconds")}
          ${slider("署名淡入", "cityFooterFade", 60, 1600, 10, 350, "seconds")}
          ${slider("完成后停留", "finalHold", 0, 6000, 10, 2490, "seconds")}
          <label>进入节奏<select id="cityRhythm"><option value="flash" selected>闪现点亮</option><option value="rise">柔和上升</option><option value="snap">快速弹入</option><option value="cut">直接切入</option></select></label>
        </div>
      </section>
      <section>
        <div class="section-heading"><p class="section-label">字体间距</p><small class="section-note">横向字距与纵向行距分别调整</small></div>
        <div class="controls-grid">
          ${slider("汉字横向间距", "cityHanLetterGap", -80, 160, 1, 8, "pixels")}
          ${slider("汉字纵向间距", "cityHanVerticalGap", -100, 180, 1, 54, "pixels")}
          <label class="check-control"><span>主文字每行等宽</span><input id="cityUniformLineWidth" type="checkbox" checked></label>
          ${slider("统一行宽", "cityLineWidth", 280, 900, 1, 490, "pixels")}
          ${slider("汉字行宽比例", "cityHanWidthRatio", 80, 130, 1, 105, "percent")}
          ${slider("英文横向间距", "cityEnglishLetterGap", -30, 120, 1, 0, "pixels")}
          ${slider("英文纵向间距", "cityEnglishVerticalGap", -100, 180, 1, 10, "pixels")}
          ${slider("副标题横向间距", "citySubtitleLetterGap", -30, 100, 1, 9, "pixels")}
          ${slider("署名横向间距", "cityFooterLetterGap", -20, 80, 1, 0, "pixels")}
          ${slider("中英文纵向距离", "cityBlockGap", -40, 180, 1, 39, "pixels")}
          ${slider("副标题纵向距离", "citySubtitleGap", -20, 180, 1, -1, "pixels")}
          ${slider("署名纵向距离", "cityFooterGap", 40, 700, 1, 245, "pixels")}
        </div>
        <label class="stacked-control">各行横向比例 · 关闭等宽时使用<input id="cityHanRowScaleX" type="text" value="100,100" placeholder="百分比，例如 100,92"></label>
        <label class="stacked-control">各行纵向比例<input id="cityHanRowScaleY" type="text" value="96,128" placeholder="百分比，例如 96,130；第一行扁、第二行高"></label>
      </section>
      <details class="sequence-advanced"><summary>高级细调</summary><div class="controls-grid">
        ${slider("汉字大小", "cityHanSize", 60, 340, 1, 250, "pixels")}
        ${slider("英文大小", "cityEnglishSize", 36, 220, 1, 165, "pixels")}
        ${slider("副标题大小", "citySubtitleSize", 18, 120, 1, 77, "pixels")}
        ${slider("署名大小", "cityFooterSize", 16, 100, 1, 58, "pixels")}
        ${slider("进入位移", "cityEntryDistance", 0, 180, 1, 0, "pixels")}
        ${slider("进入放大", "cityEntryScale", 100, 180, 1, 100, "percent")}
        ${slider("单项闪烁强度", "cityFlashStrength", 0, 100, 1, 88, "percent")}
        ${slider("水平位置", "textX", 5, 95, 1, 50, "percent")}
        ${slider("垂直位置", "textY", 10, 90, 1, 44, "percent")}
      </div></details>
      ${cityColors}${commonExport}`;
  }

  panel.querySelector("summary").innerHTML = `<span><b>${config.title}</b><small>${config.en}</small></span><i aria-hidden="true">参数</i>`;
  panelScroll.innerHTML = mode === "gather" ? gatherPanel() : mode === "portal" ? portalPanel() : mode === "rapid" ? rapidPanel() : cityPanel();

  const fontMap = {
    inter: '"Relay Inter", "Relay Noto", sans-serif', space: '"Relay Space", "Relay Noto", sans-serif',
    manrope: '"Relay Manrope", "Relay Noto", sans-serif', poppins: '"Relay Poppins", "Relay Noto", sans-serif',
    noto: '"Relay Noto", sans-serif', "noto-hk": '"City Noto HK", "Relay Noto", sans-serif', "city-black": '"City Noto Black", "Relay Noto", sans-serif',
    "hk-lettering": '"City Noto HK", "Relay Noto", sans-serif', montserrat: '"City Montserrat", "City Noto HK", sans-serif', albert: '"City Albert Sans", "City Noto HK", sans-serif'
  };
  const value = (id, fallback = "") => { const element = $(`#${id}`); return element ? element.value : fallback; };
  const number = (id, fallback = 0) => { const result = Number(value(id, fallback)); return Number.isFinite(result) ? result : fallback; };
  const checked = (id) => Boolean($(`#${id}`)?.checked);
  const lines = (id) => String(value(id)).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const csv = (id) => String(value(id)).split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
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
    context.font = `${number("fontWeight", 500)} ${size}px ${window.STGFontLibrary?.family(value("fontFamily", "inter")) || fontMap[value("fontFamily", "inter")] || fontMap.inter}`;
    context.textBaseline = "middle"; context.textAlign = "left";
  }
  function cityFamily(familyId = "fontFamily") {
    let key = value(familyId, "follow"); if (!key || key === "follow") key = value("fontFamily", "noto-hk");
    if (fontMap[key] && !window.STGFontLibrary?.idFor(key)) return fontMap[key];
    return window.STGFontLibrary?.family(key) || fontMap[key] || fontMap["noto-hk"];
  }
  let cityLetteringWanted = mode === "city";
  function ensureCityLetteringOption() {
    const select = $("#fontFamily"); if (mode !== "city" || !select) return;
    window.STGFontLibrary?.enhanceSelect(select);
    if (!select.querySelector('option[value="hk-lettering"]')) { const group = document.createElement("optgroup"); group.label = "原片字形"; group.innerHTML = '<option value="hk-lettering">原片字形 · 只在香港</option>'; select.prepend(group); }
    if (cityLetteringWanted) select.value = "hk-lettering";
  }
  function setCityFont(context, size, weightId, fallbackWeight, familyId = "fontFamily") {
    context.font = `${number(weightId, fallbackWeight)} ${size}px ${cityFamily(familyId)}`;
    context.textBaseline = "middle"; context.textAlign = "left";
  }
  let cityLetteringActive = false;
  function cityFillGlyph(context, character, x, y) {
    if (cityLetteringActive && window.CityLettering?.has(character)) { const size = Number((context.font.match(/([\d.]+)px/) || [0, 100])[1]); window.CityLettering.fill(context, character, x, y, size); return; }
    context.fillText(character, x, y);
  }
  function logicalScale(width, height) { return Math.max(.22, Math.min(width / 1280, height / 720)); }
  function splitWords() { const raw = String(value("gatherWords", "All|new|interface|design")); return raw.includes("|") ? raw.split("|").map((item) => item.trim()).filter(Boolean) : raw.split(/\s+/).filter(Boolean); }
  function cityHanItems() {
    const items = []; lines("cityHanLines").forEach((line, row) => graphemes(line).forEach((character, column) => items.push({ character, row, column, flat: items.length })));
    return items;
  }
  function cityHanSequence(items = cityHanItems()) {
    const modeName = value("cityHanOrder", "row-ltr"); let ordered = [...items];
    if (modeName === "row-rtl") ordered.sort((a, b) => a.row - b.row || b.column - a.column);
    else if (modeName === "column") ordered.sort((a, b) => a.column - b.column || a.row - b.row);
    else if (modeName === "reverse") ordered.reverse();
    else if (modeName === "custom") {
      const requested = csv("cityCustomOrder").map((item) => Math.round(item) - 1), used = new Set(); ordered = [];
      requested.forEach((flat) => { const item = items.find((candidate) => candidate.flat === flat); if (item && !used.has(flat)) { used.add(flat); ordered.push(item); } });
      items.forEach((item) => { if (!used.has(item.flat)) ordered.push(item); });
    }
    return ordered;
  }
  function cityFlashGroups() {
    const raw = String(value("cityFlashSequence", "全部")).trim();
    if (/^(全部|all)$/i.test(raw)) return null;
    if (!raw) return [];
    return raw.split(/[,，]+/).map((group) => group.split(/[+＋]+/).map((item) => item.trim().toUpperCase()).filter((item) => /^[HES]\d+$/.test(item))).filter((group) => group.length);
  }
  function cityAllFlashGroups() {
    const han = cityHanSequence().map((item) => [`H${item.flat + 1}`]);
    const english = lines("cityEnglishLines").map((line, index) => [`E${index + 1}`]);
    const subtitle = citySubtitleGroups(graphemes(value("citySubtitle", "亚洲国际都会")).length).map((group) => group.map((index) => `S${index + 1}`));
    return [...han, ...english, ...subtitle];
  }
  function cityFlashKeySet() {
    const groups = cityFlashGroups();
    return groups ? new Set(groups.flat()) : null;
  }
  function cityPulseSchedule(divisor = 1) {
    const groups = cityFlashGroups() || cityAllFlashGroups(), overrides = csv("cityHanDurations"), gapOverrides = csv("cityFlashGaps");
    const defaultGap = number("cityHanInterval", 40) / 1000 / divisor;
    const leadIn = number("cityLeadIn", 200) / 1000 / divisor, pulseDelay = number("cityPulseDelay", 120) / 1000 / divisor, byKey = new Map(); let cursor = leadIn + pulseDelay;
    groups.forEach((group, rank) => {
      const duration = Math.max(.08 / divisor, (overrides[rank] ?? number("cityEntryDuration", 320)) / 1000 / divisor), gap = Math.max(0, (gapOverrides[rank] ?? number("cityHanInterval", 40)) / 1000 / divisor);
      group.forEach((key) => byKey.set(key, { start: cursor, duration, rank })); cursor += duration + (rank < groups.length - 1 ? gap : 0);
    });
    return { groups, byKey, leadIn, pulseDelay, end: groups.length ? cursor : leadIn + pulseDelay, defaultGap };
  }
  function cityNeonUnits() {
    const units = cityHanSequence().map((item) => ({ section: "han", keys: [`H${item.flat + 1}`] }));
    lines("cityEnglishLines").forEach((line, index) => units.push({ section: "english", keys: [`E${index + 1}`] }));
    citySubtitleGroups(graphemes(value("citySubtitle", "亚洲国际都会")).length).forEach((group) => units.push({ section: "subtitle", keys: group.map((index) => `S${index + 1}`) }));
    return units;
  }
  function cityNeonOffs(raw) {
    return String(raw || "").split(/[,，]/).map((pair) => pair.trim().match(/^(\d+(?:\.\d+)?)\s*[-~–]\s*(\d+(?:\.\d+)?)$/)).filter(Boolean)
      .map((match) => ({ from: Number(match[1]), to: Number(match[2]) })).filter((item) => item.to > item.from);
  }
  function cityNeonSchedule(divisor = 1) {
    const units = cityNeonUnits(), starts = csv("cityNeonStarts"), offLists = String(value("cityNeonOffs", "")).split(/[;；]/), leadIn = number("cityLeadIn", 60) / 1000 / divisor, byKey = new Map(), sections = {};
    const step = starts.length > 1 ? Math.max(0, (starts[starts.length - 1] - starts[0]) / (starts.length - 1)) : 230;
    let previous = -step, end = leadIn;
    units.forEach((unit, rank) => {
      const startMs = starts[rank] ?? previous + step, offs = rank < offLists.length ? cityNeonOffs(offLists[rank]) : [{ from: 100, to: 233 }]; previous = startMs;
      const start = leadIn + Math.max(0, startMs) / 1000 / divisor, item = { start, offs: offs.map((off) => ({ from: start + off.from / 1000 / divisor, to: start + off.to / 1000 / divisor })) };
      item.end = Math.max(start, ...item.offs.map((off) => off.to)); end = Math.max(end, item.end);
      unit.keys.forEach((key) => byKey.set(key, item));
      const section = sections[unit.section] || (sections[unit.section] = { start: Infinity, end: 0 }); section.start = Math.min(section.start, start); section.end = Math.max(section.end, item.end + 1 / fps);
    });
    return { leadIn, byKey, sections, end };
  }
  function cityHanSchedule(divisor = 1) {
    const items = cityHanItems(), ordered = cityHanSequence(items), overrides = csv("cityHanDurations"), gapOverrides = csv("cityFlashGaps"), defaultDuration = number("cityEntryDuration", 320) / 1000 / divisor, gap = number("cityHanInterval", 40) / 1000 / divisor, leadIn = number("cityLeadIn", 670) / 1000 / divisor, byIndex = new Map(); let cursor = leadIn;
    ordered.forEach((item, rank) => { const duration = Math.max(.08 / divisor, (overrides[rank] ?? number("cityEntryDuration", 320)) / 1000 / divisor), after = Math.max(0, (gapOverrides[rank] ?? number("cityHanInterval", 40)) / 1000 / divisor); byIndex.set(item.flat, { start: cursor, duration, rank }); cursor += duration + (rank < ordered.length - 1 ? after : 0); });
    return { items, ordered, byIndex, leadIn, gap, end: ordered.length ? cursor : leadIn + defaultDuration };
  }

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
    if (mode === "city") {
      if (value("cityTimelineMode", "build") === "neon") {
        const neon = cityNeonSchedule(divisor), footerStart = neon.end + number("cityFooterDelay", 70) / 1000 / divisor, footerFade = number("cityFooterFade", 350) / 1000 / divisor, hold = number("finalHold", 2490) / 1000 / divisor;
        return { cityMode: "neon", neon, leadIn: neon.leadIn, footerStart, footerFade, hold, cycle: Math.max(1 / fps, footerStart + footerFade + hold) };
      }
      if (value("cityTimelineMode", "build") === "pulse") {
        const pulseSchedule = cityPulseSchedule(divisor), hold = number("finalHold", 1066) / 1000 / divisor;
        return { cityMode: "pulse", pulseSchedule, leadIn: pulseSchedule.leadIn, footerFade: number("cityFooterFade", 100) / 1000 / divisor, hold, cycle: Math.max(1 / fps, pulseSchedule.end + hold) };
      }
      const hanSchedule = cityHanSchedule(divisor), englishCount = Math.max(1, lines("cityEnglishLines").length), subtitleGroupCount = Math.max(1, citySubtitleGroups(graphemes(value("citySubtitle", "亚洲国际都会")).length).length);
      const leadIn = hanSchedule.leadIn, hanInterval = hanSchedule.gap, englishInterval = number("cityEnglishInterval", 40) / 1000 / divisor, entry = number("cityEntryDuration", 320) / 1000 / divisor;
      const sectionGap = number("citySectionGap", 150) / 1000 / divisor, subtitleDelay = number("citySubtitleDelay", 260) / 1000 / divisor, subtitleInterval = number("citySubtitleInterval", 40) / 1000 / divisor;
      const footerDelay = number("cityFooterDelay", 500) / 1000 / divisor, footerFade = number("cityFooterFade", 300) / 1000 / divisor, hold = number("finalHold", 716) / 1000 / divisor;
      const hanEnd = hanSchedule.end, englishStart = hanEnd + sectionGap;
      const englishLastStart = englishStart + Math.max(0, englishCount - 1) * (entry + englishInterval), englishEnd = englishLastStart + entry, subtitleStart = englishEnd + subtitleDelay;
      const subtitleLastStart = subtitleStart + Math.max(0, subtitleGroupCount - 1) * (entry + subtitleInterval), subtitleEnd = subtitleLastStart + entry, footerStart = subtitleEnd + footerDelay, cycle = footerStart + footerFade + hold;
      return { cityMode: "build", leadIn, hanInterval, hanSchedule, englishInterval, entry, sectionGap, subtitleDelay, subtitleInterval, footerDelay, footerFade, hold, hanEnd, englishStart, englishLastStart, englishEnd, subtitleStart, subtitleLastStart, subtitleEnd, footerStart, cycle: Math.max(1 / fps, cycle) };
    }
    const lineCount = Math.max(1, lines("headlineLines").length), stagger = number("lineStagger", 230) / 1000 / divisor, roll = number("lineRoll", 190) / 1000 / divisor, headlineHold = number("headlineHold", 1350) / 1000 / divisor;
    const headline = Math.max(roll, (lineCount - 1) * stagger + roll) + headlineHold, bridge = number("bridgeHold", 650) / 1000 / divisor, icon = number("iconHold", 350) / 1000 / divisor;
    const rapidCount = Math.max(1, lines("rapidItems").length), interval = number("rapidInterval", 180) / 1000 / divisor, rapid = Math.max(interval, rapidCount * interval), hold = number("finalHold", 850) / 1000 / divisor;
    return { stagger, roll, headline, bridge, icon, interval, rapid, hold, cycle: Math.max(1 / fps, headline + bridge + icon + rapid + hold) };
  }
  const sequenceTimeline = document.createElement("section");
  sequenceTimeline.className = "choreo-section sequence-choreo-section";
  sequenceTimeline.innerHTML = '<p class="section-label" data-sequence-timeline-title></p><div class="me-choreo-track"><div class="me-choreo-scroll"><div class="me-choreo-ruler" data-sequence-ruler></div><div class="me-choreo-bar" id="sequenceChoreoBar"><i class="me-choreo-playhead" data-sequence-playhead></i></div></div></div>';
  panelScroll.append(sequenceTimeline);
  const sequencePhaseNames = {
    gather: [["逐组出现", "Word entry", "is-intro"], ["汇聚放大", "Gather and zoom", "is-orbit"], ["标题切换", "Title transition", "is-contact"], ["彩幕展开", "Color reveal", "is-replace"], ["收尾停留", "Final hold", "is-hold"]],
    portal: [["文字序列", "Text sequence", "is-intro"], ["短句停留", "Phrase hold", "is-hold"], ["放大转场", "Zoom transition", "is-orbit"], ["结果停留", "Result hold", "is-contact"]],
    rapid: [["逐行进入", "Headline entry", "is-intro"], ["文案过渡", "Copy transition", "is-contact"], ["图标停留", "Icon hold", "is-hold"], ["快速轮播", "Rapid sequence", "is-orbit"], ["收尾停留", "Final hold", "is-replace"]],
    city: [["汉字点亮", "Chinese title", "is-intro"], ["英文出现", "English title", "is-orbit"], ["副标题出现", "Subtitle entry", "is-contact"], ["署名出现", "Footer reveal", "is-replace"], ["结果停留", "Result hold", "is-hold"]]
  };
  function sequencePhaseData(t) {
    const phases = [], add = (index, start, end) => { if (end > start) phases.push({ name: sequencePhaseNames[mode][index], start, end }); };
    if (mode === "gather") {
      add(0, 0, t.motionEnd); add(1, t.motionEnd, t.build - t.transition - t.color - t.hold);
      add(2, t.build, t.build + t.transition); add(3, t.build + t.transition, t.build + t.transition + t.color);
      add(4, t.cycle - t.hold, t.cycle);
    } else if (mode === "portal") {
      add(0, 0, t.sequence); add(1, t.sequence, t.sequence + t.phrase);
      add(2, t.sequence + t.phrase, t.sequence + t.phrase + t.zoom); add(3, t.cycle - t.hold, t.cycle);
    } else if (mode === "rapid") {
      add(0, 0, t.headline); add(1, t.headline, t.headline + t.bridge);
      add(2, t.headline + t.bridge, t.headline + t.bridge + t.icon);
      add(3, t.headline + t.bridge + t.icon, t.cycle - t.hold); add(4, t.cycle - t.hold, t.cycle);
    } else if (t.cityMode === "neon") {
      const sections = t.neon.sections;
      if (sections.han) add(0, sections.han.start, sections.han.end);
      if (sections.english) add(1, sections.english.start, sections.english.end);
      if (sections.subtitle) add(2, sections.subtitle.start, sections.subtitle.end);
      add(3, t.footerStart, t.footerStart + t.footerFade); add(4, t.cycle - t.hold, t.cycle);
    } else if (t.cityMode === "pulse") {
      add(0, 0, t.pulseSchedule.end); add(3, t.pulseSchedule.end, t.pulseSchedule.end + t.footerFade);
      add(4, t.cycle - t.hold, t.cycle);
    } else {
      add(0, 0, t.hanEnd); add(1, t.englishStart, t.englishEnd); add(2, t.subtitleStart, t.subtitleEnd);
      add(3, t.footerStart, t.footerStart + t.footerFade); add(4, t.cycle - t.hold, t.cycle);
    }
    return phases;
  }
  function renderSequenceTimeline() {
    const total = timing().cycle, scroll = sequenceTimeline.querySelector(".me-choreo-scroll");
    const ruler = sequenceTimeline.querySelector("[data-sequence-ruler]");
    const bar = $("#sequenceChoreoBar"), title = sequenceTimeline.querySelector("[data-sequence-timeline-title]");
    if (!bar || !ruler || !scroll) return;
    const width = Math.max(scroll.clientWidth, total * 150, 640);
    bar.style.cssText = "position:relative;display:block;width:" + width + "px;height:78px;min-height:78px;overflow:visible";
    ruler.style.width = width + "px"; ruler.style.height = "28px";
    const majorStep = total > 20 ? 5 : total > 10 ? 2 : 1, ticks = [];
    for (let seconds = 0; seconds <= total + .001; seconds += 1) {
      const tick = document.createElement("span");
      tick.className = Math.abs(seconds / majorStep - Math.round(seconds / majorStep)) < .001 ? "is-major" : "";
      tick.style.left = seconds / total * width + "px"; tick.dataset.time = String(seconds);
      if (tick.classList.contains("is-major")) tick.textContent = seconds + "s";
      ticks.push(tick);
    }
    ruler.replaceChildren(...ticks);
    const english = localStorage.getItem("cellmotion-site-language") === "en";
    const buttons = sequencePhaseData(timing()).map((phase) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "me-choreo-block " + phase.name[2];
      button.dataset.start = String(phase.start); button.dataset.end = String(phase.end);
      button.style.cssText = "position:absolute;left:" + phase.start / total * width + "px;top:0;width:" + Math.max(12, (phase.end - phase.start) / total * width) + "px;height:68px;min-height:68px;flex:none";
      button.innerHTML = "<strong>" + phase.name[english ? 1 : 0] + "</strong><small>" + (phase.end - phase.start).toFixed(2) + "s</small>";
      return button;
    });
    const playhead = document.createElement("i");
    playhead.className = "me-choreo-playhead"; playhead.dataset.sequencePlayhead = "";
    playhead.style.cssText = "position:absolute;top:-5px;height:78px;left:" + mod(currentTime(), total) / total * width + "px";
    bar.replaceChildren(...buttons, playhead);
    title.textContent = english ? "Motion timeline" : "动效时间轴";
  }
  sequenceTimeline.querySelector("#sequenceChoreoBar").addEventListener("click", (event) => {
    const block = event.target.closest("button[data-start]");
    if (!block) return;
    paused = true; setTime(Number(block.dataset.start));
    $("#pauseButton").textContent = localStorage.getItem("cellmotion-site-language") === "en" ? "Continue" : "继续";
  });
  document.addEventListener("cellmotion:languagechange", renderSequenceTimeline);
  function currentTime() { return paused ? pausedAt : Math.max(0, (performance.now() - animationStart) / 1000); }
  function setTime(next) { pausedAt = Math.max(0, next); animationStart = performance.now() - pausedAt * 1000; drawPreview(pausedAt); }
  function restart() { pausedAt = 0; animationStart = performance.now(); paused = false; lastCycle = timing().cycle; $("#pauseButton").textContent = "暂停"; }
  function preservePhase() {
    const now = currentTime(), previous = Math.max(1 / fps, lastCycle), next = timing().cycle;
    const rebased = (Math.floor(now / previous) + mod(now, previous) / previous) * next;
    lastCycle = next; if (paused) pausedAt = rebased; else animationStart = performance.now() - rebased * 1000;
    renderSequenceTimeline();
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
      const verticalSign = value("verticalDirection", "up") === "down" ? -1 : 1, baseDistance = number("entryDistance", 48) * scale, distanceStep = number("entryStep", 84) * scale, softness = number("gatherSoftness", 82) / 100;
      const startScale = number("gatherStartScale", 46) / 100, endScale = number("gatherEndScale", 116) / 100;
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
        const wordDistance = baseDistance + rank * distanceStep, unscaledDistance = wordDistance / Math.max(.001, groupScale);
        const characterOrder = rightToLeft ? [...chars.keys()].reverse() : [...chars.keys()], characterRank = new Map(characterOrder.map((characterIndex, orderIndex) => [characterIndex, orderIndex]));
        const characterWidths = chars.map((character) => context.measureText(character).width), wordWidth = characterWidths.reduce((sum, item) => sum + item, 0), wordLeft = positions[index] - wordWidth / 2;
        let characterX = wordLeft;
        chars.forEach((character, characterIndex) => {
          const revealStart = groupStart + characterRank.get(characterIndex) * t.characterInterval, reveal = smooth((phase - revealStart) / Math.max(.001, t.characterReveal));
          if (reveal > 0) {
            context.save(); context.globalAlpha = reveal;
            context.translate(0, verticalSign * unscaledDistance * (1 - groupProgress) + verticalSign * unscaledDistance * .16 * (1 - reveal));
            const characterScale = lerp(.88, 1, reveal); context.scale(characterScale, characterScale); context.fillText(character, characterX, 0); context.restore();
          }
          characterX += characterWidths[characterIndex];
        });
      });
      context.restore();
      return;
    }
    if (phase < t.build + t.transition) {
      const p = smooth((phase - t.build) / Math.max(.001, t.transition)), endScale = number("gatherEndScale", 116) / 100; drawGatherPhrase(context, width, height, scale, 1 - p, endScale * (1 + p * .08)); drawGatherTitle(context, width, height, scale, smooth((p - .36) / .64), lerp(.72, 1, backOut((p - .36) / .64))); return;
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

  function cityEntryProgress(phase, start, duration) {
    const raw = clamp((phase - start) / Math.max(.001, duration)), rhythm = value("cityRhythm", "flash");
    if (rhythm === "cut") return raw > 0 ? 1 : 0;
    if (rhythm === "snap") return backOut(raw);
    if (rhythm === "rise") return smoother(raw);
    return easeOut(raw);
  }
  function cityFlicker(progress) {
    const p = clamp(progress);
    if (p < .32) return { alpha: 1, dim: 0 };
    if (p < .42) return { alpha: lerp(1, .04, smooth((p - .32) / .1)), dim: smooth((p - .32) / .1) };
    if (p < .55) return { alpha: .04, dim: 1 };
    if (p < .68) return { alpha: lerp(.04, .36, smooth((p - .55) / .13)), dim: 1 };
    if (p < .8) return { alpha: .36, dim: 1 };
    return { alpha: lerp(.36, 1, smooth((p - .8) / .2)), dim: 1 - smooth((p - .8) / .2) };
  }
  function cityTextMetrics(context, text, letterGap = 0) {
    const characters = graphemes(text), widths = characters.map((character) => context.measureText(character).width);
    return { characters, widths, total: widths.reduce((sum, width) => sum + width, 0) + Math.max(0, characters.length - 1) * letterGap };
  }
  function cityInkBounds(context, text, letterGap = 0, glyphScale = 1) {
    const characters = graphemes(text), previousAlign = context.textAlign; context.textAlign = "center";
    const metrics = characters.map((character) => context.measureText(character)); context.textAlign = previousAlign;
    const widths = metrics.map((item) => item.width), total = widths.reduce((sum, width) => sum + width * glyphScale, 0) + Math.max(0, characters.length - 1) * letterGap;
    let cursor = -total / 2, left = Infinity, right = -Infinity;
    metrics.forEach((item, index) => {
      const center = cursor + item.width * glyphScale / 2, fallback = item.width / 2;
      const inkLeft = Number.isFinite(item.actualBoundingBoxLeft) ? item.actualBoundingBoxLeft : fallback, inkRight = Number.isFinite(item.actualBoundingBoxRight) ? item.actualBoundingBoxRight : fallback;
      left = Math.min(left, center - inkLeft * glyphScale); right = Math.max(right, center + inkRight * glyphScale); cursor += item.width * glyphScale + letterGap;
    });
    if (!characters.length) return { width: 0, center: 0, total: 0 };
    return { width: Math.max(0, right - left), center: (left + right) / 2, total };
  }
  let cityRasterCanvas = null;
  function cityRasterInkBounds(context, text, letterGap, glyphScale, mode = "split", scaleY = 1, originX = 0) {
    if (!cityRasterCanvas) { cityRasterCanvas = document.createElement("canvas"); cityRasterCanvas.width = 2048; cityRasterCanvas.height = 512; }
    const raster = cityRasterCanvas.getContext("2d", { willReadFrequently: true }), centerX = cityRasterCanvas.width / 2, centerY = cityRasterCanvas.height / 2;
    raster.setTransform(1, 0, 0, 1, 0, 0); raster.clearRect(0, 0, cityRasterCanvas.width, cityRasterCanvas.height); raster.font = context.font; raster.textAlign = "center"; raster.textBaseline = "middle"; raster.fillStyle = "#fff";
    raster.save(); raster.translate(centerX + originX, centerY);
    if (mode === "group") { raster.scale(glyphScale, scaleY); fillCityText(raster, text, letterGap); }
    else {
      const metrics = cityTextMetrics(raster, text, letterGap), scaledWidths = metrics.widths.map((width) => width * glyphScale), total = scaledWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, scaledWidths.length - 1) * letterGap;
      let cursor = -total / 2;
      metrics.characters.forEach((character, index) => { raster.save(); raster.translate(cursor + scaledWidths[index] / 2, 0); raster.scale(glyphScale, scaleY); cityFillGlyph(raster, character, 0, 0); raster.restore(); cursor += scaledWidths[index] + letterGap; });
    }
    raster.restore();
    const pixels = raster.getImageData(0, 0, cityRasterCanvas.width, cityRasterCanvas.height).data; let left = cityRasterCanvas.width, right = -1;
    for (let y = 0; y < cityRasterCanvas.height; y += 1) for (let x = 0; x < cityRasterCanvas.width; x += 1) if (pixels[(y * cityRasterCanvas.width + x) * 4 + 3] >= 148) { left = Math.min(left, x); right = Math.max(right, x); }
    if (right < left) return { width: 0, center: 0, left: 0, right: 0 };
    return { width: right - left + 1, center: (left + right) / 2 - centerX, left: left - centerX, right: right - centerX };
  }
  const cityUniformLayerCache = new Map();
  function drawCityUniformLine(context, text, letterGap, targetWidth, centerX, centerY, mode, scaleY, painter) {
    const fontReady = document.fonts ? document.fonts.check(context.font) : true, key = [context.font, cityLetteringActive, text, letterGap.toFixed(3), mode, scaleY.toFixed(3), fontReady].join("|"); let layer = cityUniformLayerCache.get(key);
    if (!layer) {
      const bounds = cityRasterInkBounds(context, text, letterGap, 1, mode, scaleY), padding = 3, fontSize = Number((context.font.match(/([\d.]+)px/) || [0, 200])[1]), canvas = document.createElement("canvas"); canvas.width = Math.max(8, Math.ceil(bounds.width) + padding * 2); canvas.height = Math.max(64, Math.ceil(fontSize * Math.max(1, scaleY) * 1.7) + 24);
      layer = { bounds, padding, canvas, context: canvas.getContext("2d"), originX: padding - bounds.left, originY: canvas.height / 2 }; cityUniformLayerCache.set(key, layer);
    }
    const layerContext = layer.context; layerContext.setTransform(1, 0, 0, 1, 0, 0); layerContext.clearRect(0, 0, layer.canvas.width, layer.canvas.height); layerContext.font = context.font; layerContext.textAlign = "center"; layerContext.textBaseline = "middle"; painter(layerContext, layer.originX, layer.originY);
    const destinationWidth = Math.max(1, Math.round(targetWidth)), destinationX = Math.round(centerX - destinationWidth / 2), destinationY = centerY - layer.originY, sourceLeft = Math.min(layer.canvas.width - 1, layer.padding + 1), sourceRight = Math.max(0, Math.min(layer.canvas.width - 1, layer.padding + layer.bounds.width - 2)); context.save(); context.imageSmoothingEnabled = false; context.beginPath(); context.rect(destinationX, destinationY, destinationWidth, layer.canvas.height); context.clip(); context.drawImage(layer.canvas, layer.padding, 0, layer.bounds.width, layer.canvas.height, destinationX, destinationY, destinationWidth, layer.canvas.height); context.drawImage(layer.canvas, sourceLeft, 0, 1, layer.canvas.height, destinationX, destinationY, 1, layer.canvas.height); context.drawImage(layer.canvas, sourceRight, 0, 1, layer.canvas.height, destinationX + destinationWidth - 1, destinationY, 1, layer.canvas.height); context.restore();
  }
  function fillCityText(context, text, letterGap = 0) {
    const metrics = cityTextMetrics(context, text, letterGap); let x = -metrics.total / 2;
    metrics.characters.forEach((character, index) => { cityFillGlyph(context, character, x + metrics.widths[index] / 2, 0); x += metrics.widths[index] + letterGap; });
  }
  function drawCityItem(context, text, x, y, phase, start, duration, scale, color, letterGap = 0, shouldFlash = true, scaleX = 1, scaleY = 1) {
    if (phase < start || !text) return;
    const raw = clamp((phase - start) / Math.max(.001, duration)), progress = cityEntryProgress(phase, start, duration), rhythm = shouldFlash ? value("cityRhythm", "flash") : "cut", distance = number("cityEntryDistance", 0) * scale, startScale = number("cityEntryScale", 100) / 100;
    const travel = rhythm === "flash" ? distance * .28 : rhythm === "cut" ? 0 : distance, itemScale = rhythm === "cut" ? 1 : lerp(startScale, 1, clamp(progress));
    const flicker = rhythm === "flash" ? cityFlicker(raw) : { alpha: clamp(progress), dim: 0 }, flashMix = number("cityFlashStrength", 88) / 100 * flicker.dim;
    context.save(); context.globalAlpha *= flicker.alpha; context.fillStyle = mixHex(color, value("cityFlashColor", "#0a5010"), flashMix); context.translate(x, y + travel * (1 - clamp(progress))); context.scale(itemScale * scaleX, itemScale * scaleY); context.textAlign = "center"; fillCityText(context, text, letterGap); context.restore();
  }
  function cityPulseFlicker(progress) {
    const count = Math.max(1, Math.round(number("cityFlashCount", 4))), local = mod(clamp(progress) * count, 1);
    if (progress >= 1) return { alpha: 1, dim: 0 };
    if (local < .24) return { alpha: 1, dim: 0 };
    if (local < .38) return { alpha: lerp(1, .04, smooth((local - .24) / .14)), dim: smooth((local - .24) / .14) };
    if (local < .64) return { alpha: .04, dim: 1 };
    return { alpha: lerp(.04, 1, smooth((local - .64) / .36)), dim: 1 - smooth((local - .64) / .36) };
  }
  function drawCityPulseItem(context, text, x, y, phase, revealAt, timingItem, color, letterGap = 0, scaleX = 1, scaleY = 1) {
    if (phase < revealAt || !text) return;
    let flicker = { alpha: 1, dim: 0 };
    if (timingItem && phase >= timingItem.start && phase <= timingItem.start + timingItem.duration) flicker = cityPulseFlicker((phase - timingItem.start) / Math.max(.001, timingItem.duration));
    const flashMix = number("cityFlashStrength", 88) / 100 * flicker.dim;
    context.save(); context.globalAlpha *= flicker.alpha; context.fillStyle = mixHex(color, value("cityFlashColor", "#0a5010"), flashMix); context.translate(x, y); context.scale(scaleX, scaleY); context.textAlign = "center"; fillCityText(context, text, letterGap); context.restore();
  }
  function drawCityNeonItem(context, text, x, y, phase, item, fallbackStart, color, letterGap = 0, scaleX = 1, scaleY = 1) {
    const visible = item ? phase >= item.start && !item.offs.some((off) => phase >= off.from && phase < off.to) : phase >= fallbackStart;
    if (!text || !visible) return;
    context.save(); context.fillStyle = color; context.translate(x, y); context.scale(scaleX, scaleY); context.textAlign = "center"; fillCityText(context, text, letterGap); context.restore();
  }
  function citySubtitleGroups(length) {
    if (length <= 2) return [Array.from({ length }, (_, index) => index)];
    const used = new Set(), groups = [];
    const push = (indices) => { const clean = indices.filter((index) => index >= 0 && index < length && !used.has(index)); if (clean.length) { clean.forEach((index) => used.add(index)); groups.push(clean); } };
    push([0, 1]); push([length - 2, length - 1]);
    for (let index = 2; index < length - 2; index += 2) push([index, index + 1]);
    return groups;
  }
  function renderCity(context, phase, width, height) {
    const t = timing(), scale = Math.max(.24, Math.min(width / 1080, height / 1480)), centerX = width * number("textX", 50) / 100, centerY = height * number("textY", 44) / 100;
    fillBackground(context, width, height, value("backgroundColor", "#050505"));
    const hanLines = lines("cityHanLines"), englishLines = lines("cityEnglishLines"), subtitle = graphemes(value("citySubtitle", "亚洲国际都会")), footer = value("cityFooter", "discoverhongkong.cn");
    const hanSize = number("cityHanSize", 250) * scale, englishSize = number("cityEnglishSize", 170) * scale, englishLineHeight = Math.max(englishSize * .35, englishSize * .84 + number("cityEnglishVerticalGap", 14) * scale);
    const subtitleSize = number("citySubtitleSize", 80) * scale, footerSize = number("cityFooterSize", 60) * scale, blockGap = number("cityBlockGap", 34) * scale, subtitleGap = number("citySubtitleGap", 21) * scale, footerGap = number("cityFooterGap", 240) * scale;
    const hanLetterGap = number("cityHanLetterGap", 8) * scale, englishLetterGap = number("cityEnglishLetterGap", 0) * scale, subtitleLetterGap = number("citySubtitleLetterGap", 3) * scale, footerLetterGap = number("cityFooterLetterGap", 0) * scale;
    const hanColor = value("accentColor", "#1dff11"), englishColor = value("cityEnglishColor", "#1dff11"), subtitleColor = value("citySubtitleColor", "#1dff11");
    const rowScaleXs = csv("cityHanRowScaleX"), rowScaleYs = csv("cityHanRowScaleY"), hanVerticalGap = number("cityHanVerticalGap", 57) * scale;
    const uniformLineWidth = checked("cityUniformLineWidth"), targetLineWidth = number("cityLineWidth", 490) * scale, hanLineWidth = targetLineWidth * number("cityHanWidthRatio", 100) / 100;
    const hanRows = hanLines.map((line, row) => ({ line, scaleX: Math.max(.2, (rowScaleXs[row] ?? 100) / 100), scaleY: Math.max(.2, (rowScaleYs[row] ?? 100) / 100) }));
    hanRows.forEach((row) => { row.height = Math.max(hanSize * .35, hanSize * .82 * row.scaleY); });
    const hanHeight = hanRows.reduce((sum, row) => sum + row.height, 0) + Math.max(0, hanRows.length - 1) * hanVerticalGap;
    const mainHeight = hanHeight + blockGap + englishLines.length * englishLineHeight + subtitleGap + subtitleSize, top = centerY - mainHeight / 2;
    const targets = cityFlashKeySet(), pulses = t.cityMode === "pulse" ? t.pulseSchedule.byKey : null, participates = (key) => targets === null || targets.has(key);
    context.save();
    setCityFont(context, hanSize, "cityHanWeight", 500); cityLetteringActive = value("fontFamily", "noto-hk") === "hk-lettering"; let characterIndex = 0, rowY = top;
    hanRows.forEach((row) => {
      const metrics = cityTextMetrics(context, row.line, hanLetterGap), itemY = rowY + row.height / 2;
      const paintHanRow = (paintContext, originX, originY, rowScaleX) => { const scaledWidths = metrics.widths.map((item) => item * rowScaleX), total = scaledWidths.reduce((sum, item) => sum + item, 0) + Math.max(0, scaledWidths.length - 1) * hanLetterGap; let x = originX - total / 2;
        metrics.characters.forEach((char, index) => { const key = `H${characterIndex + 1}`, itemX = x + scaledWidths[index] / 2;
          if (t.cityMode === "neon") drawCityNeonItem(paintContext, char, itemX, originY, phase, t.neon.byKey.get(key), t.leadIn, hanColor, 0, rowScaleX, row.scaleY);
          else if (t.cityMode === "pulse") drawCityPulseItem(paintContext, char, itemX, originY, phase, t.leadIn, pulses.get(key), hanColor, 0, rowScaleX, row.scaleY);
          else { const itemTiming = t.hanSchedule.byIndex.get(characterIndex) || { start: t.leadIn, duration: t.entry }; drawCityItem(paintContext, char, itemX, originY, phase, itemTiming.start, itemTiming.duration, scale, hanColor, 0, participates(key), rowScaleX, row.scaleY); }
          x += scaledWidths[index] + hanLetterGap; characterIndex += 1; }); };
      if (uniformLineWidth) drawCityUniformLine(context, row.line, hanLetterGap, hanLineWidth, centerX, itemY, "split", row.scaleY, (paintContext, originX, originY) => paintHanRow(paintContext, originX, originY, 1));
      else { const bounds = cityInkBounds(context, row.line, hanLetterGap, row.scaleX); paintHanRow(context, centerX - bounds.center, itemY, row.scaleX); }
      rowY += row.height + hanVerticalGap;
    });
    cityLetteringActive = false; const englishTop = top + hanHeight + blockGap; setCityFont(context, englishSize, "cityEnglishWeight", 700, "cityEnglishFont");
    englishLines.forEach((line, index) => { const key = `E${index + 1}`, text = line.toUpperCase(), lineY = englishTop + englishLineHeight * (index + .5), paintEnglish = (paintContext, x, y) => { if (t.cityMode === "neon") drawCityNeonItem(paintContext, text, x, y, phase, t.neon.byKey.get(key), t.leadIn, englishColor, englishLetterGap); else if (t.cityMode === "pulse") drawCityPulseItem(paintContext, text, x, y, phase, t.leadIn, pulses.get(key), englishColor, englishLetterGap); else drawCityItem(paintContext, text, x, y, phase, t.englishStart + index * (t.entry + t.englishInterval), t.entry, scale, englishColor, englishLetterGap, participates(key)); };
      if (uniformLineWidth) drawCityUniformLine(context, text, englishLetterGap, targetLineWidth, centerX, lineY, "group", 1, paintEnglish); else { const ink = cityInkBounds(context, text, englishLetterGap); paintEnglish(context, centerX - ink.center, lineY); }
    });
    const subtitleY = englishTop + englishLines.length * englishLineHeight + subtitleGap + subtitleSize / 2; setCityFont(context, subtitleSize, "citySubtitleWeight", 800, "citySubtitleFont");
    const subtitleText = subtitle.join(""), subtitleMetrics = cityTextMetrics(context, subtitleText, subtitleLetterGap), subtitleGroups = citySubtitleGroups(subtitle.length), subtitleRank = new Map(subtitleGroups.flatMap((group, rank) => group.map((index) => [index, rank])));
    const paintSubtitle = (paintContext, originX, originY) => { let subtitleX = originX - subtitleMetrics.total / 2; subtitle.forEach((char, index) => { const key = `S${index + 1}`, x = subtitleX + subtitleMetrics.widths[index] / 2; if (t.cityMode === "neon") drawCityNeonItem(paintContext, char, x, originY, phase, t.neon.byKey.get(key), t.leadIn, subtitleColor); else if (t.cityMode === "pulse") drawCityPulseItem(paintContext, char, x, originY, phase, t.leadIn, pulses.get(key), subtitleColor); else drawCityItem(paintContext, char, x, originY, phase, t.subtitleStart + (subtitleRank.get(index) || 0) * (t.entry + t.subtitleInterval), t.entry, scale, subtitleColor, 0, participates(key)); subtitleX += subtitleMetrics.widths[index] + subtitleLetterGap; }); };
    if (uniformLineWidth) drawCityUniformLine(context, subtitleText, subtitleLetterGap, targetLineWidth, centerX, subtitleY, "split", 1, paintSubtitle); else { const bounds = cityInkBounds(context, subtitleText, subtitleLetterGap); paintSubtitle(context, centerX - bounds.center, subtitleY); } context.restore();
    const footerStart = t.cityMode === "pulse" ? t.leadIn : t.footerStart;
    if (phase >= footerStart && footer) {
      const footerProgress = clamp((phase - footerStart) / Math.max(.001, t.footerFade)), reveal = t.cityMode === "neon" ? 1 - (1 - footerProgress) ** 2 : smoother(footerProgress); context.save(); context.globalAlpha = reveal; context.fillStyle = value("textColor", "#d5d5d5"); context.font = `${number("cityFooterWeight", 600)} ${footerSize}px ${cityFamily("cityFooterFont")}`; context.textAlign = "center"; context.textBaseline = "middle"; context.translate(centerX, subtitleY + subtitleSize / 2 + footerGap); fillCityText(context, footer, footerLetterGap); context.restore();
    }
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
    if (mode === "gather") renderGather(context, local, width, height); else if (mode === "portal") renderPortal(context, local, width, height); else if (mode === "rapid") renderRapid(context, local, width, height); else renderCity(context, local, width, height);
    if (target === canvas) { canvas.dataset.effect = mode; canvas.dataset.phase = local.toFixed(4); canvas.dataset.cycleDuration = timing().cycle.toFixed(4); canvas.dataset.timelineTime = time.toFixed(4); }
  }
  function resizeCanvas() {
    const ratio = Math.min(1.35, Math.max(1, window.devicePixelRatio || 1)), width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight), pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; canvas.dataset.ratio = String(ratio); }
  }
  function drawPreview(time = currentTime()) { resizeCanvas(); const ratio = Number(canvas.dataset.ratio || 1); renderFrame(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio); frameCounter.textContent = `F ${String(Math.floor(time * fps)).padStart(4, "0")}`; }
  function previewLoop() { drawPreview(); const playhead = sequenceTimeline.querySelector("[data-sequence-playhead]"), bar = $("#sequenceChoreoBar"), total = timing().cycle; if (playhead && bar) playhead.style.left = (mod(currentTime(), total) / total * Number.parseFloat(bar.style.width || "0")) + "px"; rafId = requestAnimationFrame(previewLoop); }

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

  if (mode === "city") {
    $("#fontFamily")?.addEventListener("change", () => { cityLetteringWanted = value("fontFamily") === "hk-lettering"; });
    document.querySelector("script[data-stg-font-library]")?.addEventListener("load", () => { ensureCityLetteringOption(); preservePhase(); });
    ensureCityLetteringOption();
  }
  function assignValues(values) { Object.entries(values).forEach(([id, next]) => { const input = $(`#${id}`); if (!input) return; if (input.type === "checkbox") input.checked = Boolean(next); else input.value = String(next); }); }
  function setReference() {
    if (mode === "gather") { $("#gatherWords").value = "All|new|interface|design"; $("#finalTitle").value = "iOS"; }
    else if (mode === "portal") { $("#portalSequence").value = "13\n[icon]\nIntroducing\niPhone\n13\nPro"; $("#portalPhrase").value = "Our fastest model yet."; $("#focusIndex").value = "1"; }
    else if (mode === "rapid") { $("#headlineLines").value = "Smooth.\nStylish.\nCustomizable."; $("#bridgeText").value = "That's iPhone."; $("#rapidItems").value = "M4 Neural Engine\nPro camera system\nAction mode\nSpatial audio\nAll-day battery\nSimply powerful"; }
    else {
      cityLetteringWanted = true; ensureCityLetteringOption();
      assignValues({
        cityHanLines: "只在\n香港", cityEnglishLines: "HONG\nKONG", citySubtitle: "亚洲国际都会", cityFooter: "discoverhongkong.cn",
        cityTimelineMode: "build", cityHanOrder: "row-ltr", cityCustomOrder: "1,2,3,4", cityFlashSequence: "全部", cityHanDurations: "", cityFlashGaps: "", cityHanWeight: 500, cityEnglishWeight: 500, citySubtitleWeight: 700, playbackSpeed: 1, cityLeadIn: 670, cityPulseDelay: 120, cityHanInterval: 40, cityEnglishInterval: 40,
        cityEntryDuration: 320, citySectionGap: 150, citySubtitleDelay: 260, citySubtitleInterval: 40, cityFooterDelay: 500,
        cityFooterFade: 300, finalHold: 716, cityRhythm: "flash", cityHanSize: 250, cityEnglishSize: 170, citySubtitleSize: 80,
        cityFooterSize: 60, cityHanLetterGap: 8, cityHanVerticalGap: 57, cityUniformLineWidth: true, cityLineWidth: 520, cityHanRowScaleX: "100,100", cityHanRowScaleY: "96,130", cityEnglishLetterGap: 0, cityEnglishVerticalGap: 14,
        citySubtitleLetterGap: 3, cityFooterLetterGap: 0, cityBlockGap: 34, citySubtitleGap: 21, cityFooterGap: 240,
        cityEntryDistance: 0, cityEntryScale: 100, cityFlashCount: 4, cityFlashStrength: 88, textX: 50, textY: 44,
        backgroundColor: "#050505", accentColor: "#1dff11", cityEnglishColor: "#1dff11", citySubtitleColor: "#1dff11",
        cityFlashColor: "#0a5010", textColor: "#d5d5d5", ...cityHkType
      });
    }
    if (mode !== "city") $("#fontFamily").value = "inter"; updateOutputs(); restart();
  }
  const cityHkType = {
    fontFamily: "hk-lettering", cityEnglishFont: "stg:montserrat", citySubtitleFont: "stg:noto-hk", cityFooterFont: "stg:albert-sans",
    cityHanWeight: 500, cityEnglishWeight: 700, citySubtitleWeight: 750, cityFooterWeight: 600,
    cityHanSize: 250, cityEnglishSize: 165, citySubtitleSize: 77, cityFooterSize: 58,
    cityHanLetterGap: 8, cityHanVerticalGap: 54, cityUniformLineWidth: true, cityLineWidth: 490, cityHanWidthRatio: 105, cityHanRowScaleX: "100,100", cityHanRowScaleY: "96,128",
    cityEnglishLetterGap: 0, cityEnglishVerticalGap: 10, citySubtitleLetterGap: 9, cityFooterLetterGap: 0, cityBlockGap: 39, citySubtitleGap: -1, cityFooterGap: 245, textX: 50, textY: 44
  };
  function setHkReference() {
    if (mode !== "city") return;
    cityLetteringWanted = true; ensureCityLetteringOption();
    assignValues({
      cityHanLines: "只在\n香港", cityEnglishLines: "HONG\nKONG", citySubtitle: "亚洲国际都会", cityFooter: "discoverhongkong.cn",
      cityTimelineMode: "neon", cityHanOrder: "row-ltr", cityCustomOrder: "1,2,3,4", cityFlashSequence: "全部", cityHanDurations: "", cityFlashGaps: "",
      cityNeonStarts: "0,333,500,700,900,1133,1467,1533,1700", cityNeonOffs: "100-233; 133-167; 33-133; 300-333; 500-533,567-600; 100-267,667-733; 167-267; 133-300; ",
      playbackSpeed: 1, cityLeadIn: 60, cityFooterDelay: 70, cityFooterFade: 350, finalHold: 2490, cityRhythm: "flash", cityEntryDistance: 0, cityEntryScale: 100, cityFlashCount: 4, cityFlashStrength: 88,
      backgroundColor: "#000000", accentColor: "#4cebfa", cityEnglishColor: "#4cebfa", citySubtitleColor: "#4cebfa", cityFlashColor: "#0f3f45", textColor: "#ffffff",
      ...cityHkType
    });
    updateOutputs(); restart();
  }
  function setAltReference() {
    if (mode !== "city") return;
    cityLetteringWanted = true; ensureCityLetteringOption();
    assignValues({
      cityHanLines: "只在\n香港", cityEnglishLines: "HONG\nKONG", citySubtitle: "亚洲国际都会", cityFooter: "discoverhongkong.cn",
      cityTimelineMode: "pulse", cityFlashSequence: "H3,S3+S4,E1,E2", cityHanDurations: "520,240,300,460", cityFlashGaps: "360,100,200,0",
      cityHanWeight: 500, cityEnglishWeight: 500, citySubtitleWeight: 700, playbackSpeed: 1, cityLeadIn: 200, cityPulseDelay: 120, cityHanInterval: 40, cityEntryDuration: 320, cityFlashCount: 4,
      cityFooterFade: 100, finalHold: 1066, cityRhythm: "flash", cityHanSize: 250, cityEnglishSize: 170, citySubtitleSize: 80, cityFooterSize: 60,
      cityHanLetterGap: 8, cityHanVerticalGap: 57, cityUniformLineWidth: true, cityLineWidth: 520, cityHanRowScaleX: "100,100", cityHanRowScaleY: "96,130", cityEnglishLetterGap: 0, cityEnglishVerticalGap: 14,
      citySubtitleLetterGap: 3, cityFooterLetterGap: 0, cityBlockGap: 34, citySubtitleGap: 21, cityFooterGap: 240,
      cityFlashStrength: 92, textX: 50, textY: 44, backgroundColor: "#050505", accentColor: "#c176ff", cityEnglishColor: "#c176ff", citySubtitleColor: "#c176ff", cityFlashColor: "#281536", textColor: "#f2f2f2", ...cityHkType
    });
    updateOutputs(); restart();
  }
  function setChinese() {
    if (mode === "gather") { $("#gatherWords").value = "全新|界面|灵感|设计"; $("#finalTitle").value = "现在开始"; }
    else if (mode === "portal") { $("#portalSequence").value = "你好\n[icon]\n重新认识\n未来\n现在\n出发"; $("#portalPhrase").value = "最快的灵感，就在此刻。"; $("#focusIndex").value = "1"; }
    else if (mode === "rapid") { $("#headlineLines").value = "流畅。\n醒目。\n自由。"; $("#bridgeText").value = "这就是灵感。"; $("#rapidItems").value = "快速切换\n丝滑滚动\n自由节奏\n图标收束\n马上开始"; }
    else assignValues({ cityHanLines: "灵感\n发生", cityEnglishLines: "CREATE\nMORE", citySubtitle: "每一次相遇", cityFooter: "hello-motion.cn", cityTimelineMode: "build", cityFlashSequence: "全部", cityHanDurations: "", cityFlashGaps: "", cityUniformLineWidth: true, cityLineWidth: 520, cityHanRowScaleX: "100,100", cityHanRowScaleY: "88,108" });
    if (mode === "city") { cityLetteringWanted = false; $("#fontFamily").value = "stg:noto-hk"; } else $("#fontFamily").value = "noto-hk";
    updateOutputs(); restart();
  }
  $("#referencePreset").addEventListener("click", setReference); $("#referenceHkPreset")?.addEventListener("click", setHkReference); $("#referenceAltPreset")?.addEventListener("click", setAltReference); $("#chinesePreset").addEventListener("click", setChinese);
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

  updateOutputs(); lastCycle = timing().cycle; renderSequenceTimeline(); document.fonts.ready.then(() => { if (mode === "city") setHkReference(); else restart(); }); previewLoop();
})();
