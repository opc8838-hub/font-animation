(function () {
  const effects = [
    ["index", "圆柱", "Cylinder"], ["field", "场域", "Field"], ["stripes", "条纹", "Stripes"],
    ["coil", "线圈", "Coil"], ["flag", "旗帜", "Flag"], ["morisawa", "森泽", "Morisawa"],
    ["cascade", "瀑布", "Cascade"], ["ribbon", "丝带", "Ribbon"], ["layers", "层叠", "Layers"],
    ["danger", "警示", "Danger"], ["string", "琴弦", "String"], ["badge", "徽章", "Badge"],
    ["clutter", "杂散", "Clutter"], ["construct", "构筑", "Construct"], ["snap", "吸附", "Snap"],
    ["flash", "闪光", "Flash"], ["pow", "砰", "Pow"], ["crash", "碰撞", "Crash"],
    ["crashclock", "碰撞时钟", "Crash Clock"], ["vessel", "器皿", "Vessel"], ["shine", "闪耀", "Shine"],
    ["boost", "助推", "Boost"], ["boxsquad", "方块小队", "BoxSquad"],
  ];

  const dictionary = new Map(Object.entries({
    "Select...": "选择效果", "ReadMe": "关于", "TEXT INPUT": "输入文字", "TEXT": "文字",
    "TYPE": "字体", "STYLE": "样式", "MOTION": "动效", "ANIMATION": "动画", "ACCELERATION": "加速",
    "EXPORT": "导出", "SAVE": "保存", "SCENES": "场景", "PHYSICS": "物理", "DEBRIS": "碎片",
    "CLOCK": "时钟", "COLOR": "颜色", "IMAGE": "图片", "BACKGROUND": "背景", "PRESETS": "预设",
    "STRIP": "条带", "ORBIT": "轨道", "TUNNEL": "隧道", "RING": "圆环", "GATES": "闸门",
    "SPREAD": "扩散", "TRACK": "轨道", "MAIN RADIUS": "主半径", "BLAST": "爆发", "SCRUB": "时间轴",
    "Size": "尺寸", "Scale": "缩放", "Color": "颜色", "Fill": "填充色", "Bkgd": "背景色",
    "Stroke": "描边", "Weight": "粗细", "Align": "对齐", "Length": "长度", "Amount": "数量",
    "Distance": "距离", "Pause": "停顿", "Delay": "延迟", "Strength": "强度", "Detail": "细节",
    "Ratio": "比例", "Position": "位置", "Display": "显示", "Hands": "指针", "Accent": "强调色",
    "Boundary": "边界", "Visible": "显示", "Padding": "间距", "Repeat": "重复", "Cycle": "循环",
    "Invert": "反色", "Outline": "轮廓", "Flip": "翻转", "Window Size": "窗口尺寸",
    "Vertical, 9:16": "竖版 9:16", "Square, 1:1": "方形 1:1", "SAVE LOOP": "导出循环动画",
    "RESET": "重置", "REPEAT": "重复", "PACE": "节奏", "Rays": "光线", "Inside": "内侧",
    "Outside": "外侧", "Scatter": "散射", "Blend": "混合", "Into": "进入", "Extrude": "挤出",
    "Letter": "逐字", "Line": "逐行", "Rotate": "旋转", "Speed": "速度",
    "Acceleration": "加速", "Animation": "动画", "Export": "导出", "Style": "样式",
    "Clock": "时钟", "Back": "背面", "Bottom": "底部", "Top": "顶部", "Left": "左侧",
    "Right": "右侧", "Center": "居中", "In": "进入", "Out": "离开", "In & Out": "进入与离开",
    "Width": "宽度", "Height": "高度", "Radius": "半径", "Circ": "周长", "Circumference": "周长",
    "Angle Offset": "角度偏移", "Inner Radius": "内半径", "Rotate Angle": "旋转角度",
    "X Rotate": "X轴旋转", "Z Rotate": "Z轴旋转", "Y-Position": "Y轴位置", "Zoom": "缩放",
    "Stretch Size": "拉伸尺寸", "Width Pinch": "宽度收束", "Height Pinch": "高度收束",
    "X-Pinch": "X轴收束", "Y-Pinch": "Y轴收束", "Sides": "边数", "Caps": "端点",
    "Particles": "粒子", "Gravity": "重力", "Angle": "角度", "Type Connections": "文字连接",
    "Debris One": "碎片一", "Debris Two": "碎片二", "Debris Three": "碎片三",
    "Debris Four": "碎片四", "Debris Five": "碎片五", "Debris Six": "碎片六", "Debris Seven": "碎片七",
    "Arc": "弧线", "Bend": "弯曲", "Block": "方块", "Border": "边框", "Bounce": "弹跳",
    "Box": "方框", "Chain": "连锁", "Clouds": "云朵", "Crest": "波峰", "Cubic": "三次曲线",
    "Cycle Random": "随机循环", "Elastic": "弹性", "Ellipse": "椭圆", "Enable": "启用",
    "Half": "一半", "Halo": "光环", "Keep Centered": "保持居中", "MatchCut": "匹配切换",
    "Messy": "凌乱", "Mouse Center": "鼠标居中", "Mouse Pop": "鼠标弹出", "Never": "从不",
    "None": "无", "Orbit Control": "轨道控制", "Punch": "冲击", "Radial": "放射",
    "Reroll": "重新随机", "Reset Grid": "重置网格", "Reset every...": "重置间隔",
    "Ring Count": "圆环数量", "Random Color Swap": "随机换色", "Shear Angle": "倾斜角度",
    "Silhouette": "剪影", "Sine": "正弦", "Solid": "实色", "Split": "分割", "Spurs": "尖刺",
    "Square": "方形", "Tangent": "切线", "Taper": "渐缩", "Transparent": "透明",
    "Triple": "三倍", "Tumble": "翻滚", "Twist": "扭转", "All The Sliders": "全部参数",
    "Copy & Paste text here": "在这里粘贴文字", "CLEAR ALL": "全部清除", "RANDOM PALETTE": "随机配色",
    "RECORD": "录制", "RECORD MP4": "录制 MP4", "SAVE JPG": "保存 JPG", "SAVE SVG": "保存 SVG",
    "Rendering?": "正在渲染", "RECORDING IN PROCESS": "正在录制", "5 Seconds": "5 秒",
    "Hours": "小时", "Hours & Min": "小时与分钟", "Minute": "分钟", "fps": "帧/秒",
    "PAUSE": "暂停", "STROKE": "描边", "TEXTURE": "纹理", "FLUX SIZE": "波动尺寸",
    "INTRO STAGE": "入场阶段", "OUTRO STAGE": "退场阶段", "TEMOPORARY DISABLED! Fix coming soon! Thanks for your patience.": "暂时不可用，修复完成后恢复。",
    "Readme and Support!": "说明与支持", "Readme!": "说明", "Buy me a coffee": "请原作者喝杯咖啡",
    "a generator from": "生成器原作者", "a kinetic generator from": "动态生成器原作者",
    "a kinetic type generator from": "动态字体生成器原作者", "to support STG": "支持 STG",
    "Columns": "列数", "Rows": "行数", "Twerk": "摆动", "B/W": "黑白",
    "Checker": "棋盘格", "Debug": "调试", "Reset Grid": "重置网格", "Reroll": "重新随机"
  }));

  const slug = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");
  const currentIndex = Math.max(0, effects.findIndex((effect) => effect[0] === slug));
  const current = effects[currentIndex];
  const legacyEffects = new Set([
    "index", "field", "stripes", "coil", "flag", "morisawa",
    "cascade", "ribbon", "layers", "danger", "string"
  ]);

  document.documentElement.lang = "zh-CN";
  document.body.classList.add("stg-cn-enhanced");

  if (window.matchMedia("(max-width: 640px)").matches) {
    document.querySelectorAll("[autofocus]").forEach((element) => {
      element.removeAttribute("autofocus");
      element.blur();
    });
    window.addEventListener("load", () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
    }, { once: true });
  }

  document.title = `${current[1]} ${current[2]} | STG 中文版`;

  const toolbar = document.createElement("nav");
  toolbar.className = "stg-cn-toolbar";
  toolbar.setAttribute("aria-label", "效果导航");
  toolbar.innerHTML = `
    <a class="stg-cn-home" href="gallery.html" aria-label="返回效果库">STG</a>
    <div class="stg-cn-title"><strong>${current[1]}</strong><small>${current[2]}</small></div>
    <a class="stg-cn-prev" href="${effects[(currentIndex - 1 + effects.length) % effects.length][0]}.html" aria-label="上一个效果">←</a>
    <a class="stg-cn-next" href="${effects[(currentIndex + 1) % effects.length][0]}.html" aria-label="下一个效果">→</a>
    <button class="stg-cn-menu-button" type="button" aria-expanded="false" aria-controls="stgCnDrawer">效果</button>`;

  const drawer = document.createElement("div");
  drawer.id = "stgCnDrawer";
  drawer.className = "stg-cn-drawer";
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="stg-cn-drawer-header"><span>全部 23 个效果</span><span>STG CN</span></div>
    <div class="stg-cn-drawer-grid">${effects.map(([itemSlug, zh, en], index) => `
      <a href="${itemSlug}.html" ${itemSlug === slug ? 'aria-current="page"' : ""}>
        <span>${String(index + 1).padStart(2, "0")} · ${zh}</span><small>${en}</small>
      </a>`).join("")}</div>`;

  document.body.append(toolbar, drawer);

  const menuButton = toolbar.querySelector(".stg-cn-menu-button");
  function setDrawer(open) {
    drawer.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
  }
  menuButton.addEventListener("click", () => setDrawer(drawer.hidden));
  document.addEventListener("click", (event) => {
    if (!drawer.hidden && !drawer.contains(event.target) && !menuButton.contains(event.target)) setDrawer(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setDrawer(false);
  });

  function translate(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement?.closest("script, style, .stg-cn-toolbar, .stg-cn-drawer")) return;
      const trimmed = node.nodeValue.trim();
      if (!trimmed || !dictionary.has(trimmed)) return;
      node.nodeValue = node.nodeValue.replace(trimmed, dictionary.get(trimmed));
    });
  }

  translate(document.body);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) translate(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const exactControlLabels = {
    inp: "输入文字", sel: "字体", rSlider: "圆柱半径", stackNumSlider: "圆柱数量",
    rRotateSlider: "圆柱旋转", rOffsetSlider: "圆柱偏移", rWaveCountSlider: "波浪数量",
    rWaveSpeedSlider: "波浪速度", rWaveSlider: "纬度波浪", rLongSlider: "经度波浪",
    rZaxisSlider: "涟漪强度", typeXSlider: "文字宽度", typeYSlider: "文字高度",
    typeStrokeSlider: "文字粗细", xRotCameraSlider: "相机 X 旋转",
    yRotCameraSlider: "相机 Y 旋转", zRotCameraSlider: "相机 Z 旋转",
    zoomCameraSlider: "相机缩放", bkgdColorPicker: "背景颜色",
    backgroundPicker: "背景颜色", forePicker: "文字颜色", textColorPicker: "文字颜色",
    outlineCheck: "显示轮廓", roundCapCheck: "圆角端点", button: "重置节点"
  };

  const controlTerms = {
    x: "X", y: "Y", z: "Z", r: "半径", num: "数量", count: "数量", row: "行数",
    rows: "行数", col: "列数", cols: "列数", rotate: "旋转", rot: "旋转",
    camera: "相机", wave: "波浪", speed: "速度", offset: "偏移", size: "尺寸",
    scale: "缩放", scaler: "缩放", stretch: "拉伸", strecher: "拉伸", width: "宽度",
    height: "高度", length: "长度", radius: "半径", stroke: "描边", weight: "粗细",
    type: "文字", font: "字体", text: "文字", color: "颜色", bkgd: "背景",
    background: "背景", fore: "前景", padding: "内边距", space: "间距",
    tracking: "字距", depth: "深度", segment: "分段", middle: "中段",
    gradient: "渐变", outline: "轮廓", round: "圆角", cap: "端点", check: "开关",
    picker: "颜色", amount: "数量", detail: "细节", angle: "角度", strength: "强度",
    gravity: "重力", friction: "摩擦", delay: "延迟", pause: "停顿", cycle: "循环",
    repeat: "重复", zoom: "缩放", shear: "倾斜", pinch: "收缩", line: "线条",
    letter: "字形", strip: "条带", orbit: "轨道", tunnel: "隧道", particle: "粒子"
  };

  function findControlKey(control) {
    for (const key of Object.getOwnPropertyNames(window)) {
      try {
        const value = window[key];
        if (value?.elt === control || value?.elt?.contains?.(control)) return key;
      } catch (_) {}
    }
    return "";
  }

  function humanizeControlKey(key) {
    if (!key) return "参数";
    if (exactControlLabels[key]) return exactControlLabels[key];
    const cleaned = key
      .replace(/Buntton|Button|Slider|slider|Picker|picker|Checkbox|checkbox|Check|check|Select|select|Set$/g, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .trim();
    const words = cleaned.split(/[_\s-]+/).filter(Boolean);
    const translated = words.map((word) => controlTerms[word.toLowerCase()] || word);
    return translated.join(" ") || "参数";
  }

  function getControlLabel(control, key, index) {
    const nativeLabel = control.labels?.[0]?.textContent?.trim();
    if (nativeLabel) return nativeLabel;
    if (control.id) {
      const linked = document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
      if (linked?.textContent.trim()) return linked.textContent.trim();
    }
    if (control.tagName === "BUTTON" && control.textContent.trim()) return control.textContent.trim();
    const label = humanizeControlKey(key || control.id || control.name);
    return label === "参数" ? `参数 ${String(index + 1).padStart(2, "0")}` : label;
  }

  function controlGroup(control, key) {
    const type = (control.type || "").toLowerCase();
    const hint = `${key} ${control.id} ${control.name}`.toLowerCase();
    if (control.tagName === "TEXTAREA" || type === "text" || control.tagName === "SELECT") return "text";
    if (type === "color" || /color|bkgd|background|fore|gradient|palette/.test(hint)) return "color";
    if (control.tagName === "BUTTON" || type === "button") return "action";
    if (/speed|wave|rotate|rot|motion|anim|camera|delay|pause|gravity|friction|cycle/.test(hint)) return "motion";
    return "shape";
  }

  function dispatchOriginal(control, type) {
    control.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function buildProxyControl(control, key, labelText, syncers) {
    const type = (control.type || "").toLowerCase();
    const row = document.createElement("label");
    row.className = "stg-editor-control";
    const label = document.createElement("span");
    label.className = "stg-editor-label";
    label.textContent = labelText;
    row.append(label);

    if (control.tagName === "BUTTON" || type === "button") {
      const proxy = document.createElement("button");
      proxy.type = "button";
      proxy.className = "stg-editor-command";
      proxy.textContent = labelText;
      proxy.addEventListener("click", () => control.click());
      row.replaceChildren(proxy);
      return row;
    }

    if (type === "checkbox" || type === "radio") {
      const proxy = document.createElement("input");
      proxy.type = type;
      proxy.checked = control.checked;
      proxy.addEventListener("change", () => {
        control.checked = proxy.checked;
        dispatchOriginal(control, "change");
        dispatchOriginal(control, "input");
      });
      row.classList.add("stg-editor-toggle");
      row.append(proxy);
      syncers.push(() => { proxy.checked = control.checked; });
      return row;
    }

    if (control.tagName === "SELECT") {
      const proxy = document.createElement("select");
      proxy.innerHTML = control.innerHTML;
      proxy.value = control.value;
      proxy.addEventListener("change", () => {
        control.value = proxy.value;
        dispatchOriginal(control, "change");
        dispatchOriginal(control, "input");
      });
      row.append(proxy);
      syncers.push(() => { if (proxy.value !== control.value) proxy.value = control.value; });
      return row;
    }

    if (type === "range") {
      const value = document.createElement("output");
      value.className = "stg-editor-value";
      label.append(value);
      const proxy = document.createElement("input");
      proxy.type = "range";
      for (const attr of ["min", "max", "step"]) if (control.hasAttribute(attr)) proxy.setAttribute(attr, control.getAttribute(attr));
      proxy.value = control.value;
      const update = () => { value.value = Number(proxy.value).toFixed(2).replace(/\.00$/, ""); };
      proxy.addEventListener("input", () => {
        control.value = proxy.value;
        dispatchOriginal(control, "input");
        update();
      });
      proxy.addEventListener("change", () => dispatchOriginal(control, "change"));
      row.append(proxy);
      update();
      syncers.push(() => {
        if (proxy.value !== control.value) { proxy.value = control.value; update(); }
      });
      return row;
    }

    const proxy = document.createElement(control.tagName === "TEXTAREA" ? "textarea" : "input");
    if (proxy.tagName === "INPUT") proxy.type = type || "text";
    proxy.value = control.value;
    proxy.addEventListener("input", () => {
      control.value = proxy.value;
      dispatchOriginal(control, "input");
    });
    proxy.addEventListener("change", () => dispatchOriginal(control, "change"));
    row.append(proxy);
    syncers.push(() => {
      if (document.activeElement !== proxy && proxy.value !== control.value) proxy.value = control.value;
    });
    return row;
  }

  function enhanceLegacyEditor() {
    if (document.querySelector(".stg-editor-panel")) return;
    const textControl = document.querySelector(".bottom textarea");
    const controls = [
      ...(textControl ? [textControl] : []),
      ...document.querySelectorAll("body input, body select, body button, body textarea")
    ].filter((control, index, items) =>
      items.indexOf(control) === index &&
      !control.closest(".stg-cn-toolbar, .stg-cn-drawer, .dropdown, .stg-editor-panel, .bottom .slug")
    );

    if (controls.length < 2) return false;
    const panel = document.createElement("aside");
    panel.className = "stg-editor-panel";
    panel.setAttribute("aria-label", "效果编辑器");
    panel.innerHTML = `
      <header class="stg-editor-header">
        <div><small>STG 中文编辑器</small><strong>${current[1]}</strong></div>
        <a href="gallery.html">全部效果</a>
      </header>
      <div class="stg-editor-tabs" role="tablist"></div>
      <div class="stg-editor-groups"></div>`;

    const groups = new Map();
    const syncers = [];
    controls.forEach((control, index) => {
      const key = findControlKey(control);
      const groupName = controlGroup(control, key);
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName).push(buildProxyControl(control, key, getControlLabel(control, key, index), syncers));
      control.dataset.stgManagedOriginal = "true";
      control.tabIndex = -1;
      control.setAttribute("aria-hidden", "true");
    });

    const groupLabels = { text: "文字", shape: "形态", motion: "动效", color: "颜色", action: "操作" };
    const tabs = panel.querySelector(".stg-editor-tabs");
    const groupHost = panel.querySelector(".stg-editor-groups");
    let firstGroup = "";
    for (const name of ["text", "shape", "motion", "color", "action"]) {
      const rows = groups.get(name);
      if (!rows?.length) continue;
      if (!firstGroup) firstGroup = name;
      const tab = document.createElement("button");
      tab.type = "button";
      tab.textContent = groupLabels[name];
      tab.dataset.editorGroup = name;
      tab.setAttribute("role", "tab");
      const section = document.createElement("section");
      section.className = "stg-editor-group";
      section.dataset.editorGroup = name;
      rows.forEach((row) => section.append(row));
      tabs.append(tab);
      groupHost.append(section);
    }

    function selectGroup(name) {
      panel.querySelectorAll("[data-editor-group]").forEach((element) => {
        const active = element.dataset.editorGroup === name;
        if (element.matches("button")) element.setAttribute("aria-selected", String(active));
        else element.hidden = !active;
      });
    }
    tabs.addEventListener("click", (event) => {
      const tab = event.target.closest("button[data-editor-group]");
      if (tab) selectGroup(tab.dataset.editorGroup);
    });

    document.body.append(panel);
    document.body.classList.add("stg-legacy-editor");
    selectGroup(firstGroup);
    window.setInterval(() => syncers.forEach((sync) => sync()), 250);
    return true;
  }

  if (legacyEffects.has(slug)) {
    let attempts = 0;
    const editorTimer = window.setInterval(() => {
      attempts += 1;
      if (enhanceLegacyEditor() || attempts > 30) window.clearInterval(editorTimer);
    }, 300);
  } else {
    document.body.classList.add("stg-modern-editor");
    window.addEventListener("load", () => {
      window.setTimeout(() => {
        const firstSection = document.querySelector("#generatorInput .collapsible");
        const content = firstSection?.nextElementSibling;
        if (firstSection && content && getComputedStyle(content).display === "none") {
          firstSection.classList.add("active");
          content.style.display = "block";
        }
      }, 400);
    }, { once: true });
  }

  window.myFunction = function () {
    window.alert(`SPACE TYPE GENERATOR\n${current[1]} / ${current[2]}\n原作与程序：Kiel M\n中文改造版支持实时中文输入。`);
  };
})();
