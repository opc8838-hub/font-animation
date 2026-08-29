const effects = [
  ["coil", "线圈", "Coil", "flow", "波形流动"],
  ["continuation", "续句", "Continuation", "type", "匹配切换"],
  ["currentwall", "水流", "Water Flow", "flow", "多行水流"],
  ["verticalwall", "纵跃", "Vertical Rise", "flow", "纵向弹出"],
  ["creatorstudio", "汇聚", "Creator Merge", "type", "字位重组"],
  ["focuswheel", "焦轮", "Focus Wheel", "flow", "纵向焦点滚轮"],
  ["gradienttype", "渐字", "Gradient Type", "type", "流动渐变逐字输入"],
  ["glyphrelay", "字标接力", "Glyph Relay", "type", "字位图标与颜色接力"],
  ["wordgather", "词序汇聚", "Word Gather", "type", "分散词组汇合与彩幕收尾"],
  ["focusportal", "焦点转场", "Focus Portal", "type", "字母或图标放大旋转转场"],
  ["rapidsequence", "速序轮播", "Rapid Sequence", "flow", "逐行滚入与快速文字轮播"],
  ["citystack", "城市字塔", "City Stack", "type", "港版黑体中英文字逐项点亮叠满"],
  ["colorcanvas", "彩幕组句", "Color Canvas", "type", "逐行弹出与彩色弧面"],
  ["liquidtype", "散", "Scatter", "type", "花粒 · 蓝胶 · 横向散尘"],
  ["scrapbin", "Delete 删除", "Delete", "physics", "真实揉纸与重力入桶"],
  ["terminalbrand", "终端署名", "Terminal Brand", "type", "输入回删与图标签名"],
  ["slotstories", "字位剧场", "Slot Stories", "graphic", "字位图标与角色表演"],
  ["mediacascade", "镜头铺展", "Media Cascade", "space", "媒体复制与全屏展开"],
  ["colorrecompose", "彩组", "Color Recompose", "type", "彩色重组"],
  ["phrasebuild", "组句", "Phrase Build", "type", "累计组词"],
  ["switchdrop", "降临", "Switch Drop", "graphic", "主体降临 × 明暗开关"],
  ["searchtyping", "搜写", "Search Typing", "type", "搜索框逐字打入"],
  ["beforeafter", "图片对比", "Before After", "type", "原图对比 · 生成切成片"],
  ["shutterafter", "快门对比", "Shutter After", "type", "原图快门 · 划过成片"],
  ["verbcue", "动令", "Verb Cue", "type", "短句打散 · 像素扫清"],
  ["tighten", "收距", "Tighten", "type", "词距先松后紧"],
  ["titlecard", "标卡", "Title Card", "type", "主副标题再切标志"],
  ["lockup", "夹图", "Lockup", "type", "左右字夹中间物"],
  ["pullback", "退远", "Pullback", "type", "标题缓慢退远"],
  ["textswell", "胀句", "Text Swell", "type", "首词推近 · 后词顶入"],
  ["wordflip", "翻词", "Word Flip", "type", "打字后立体翻词"],
  ["textbuild", "垒词", "Text Build", "type", "一词入场 · 让位居中"],
  ["textswap", "换句", "Text Swap", "type", "旧句冲镜换新句"],
  ["textreveal", "显句", "Text Reveal", "type", "首词特写再组句"],
  ["phoneframe", "机框", "Phone Frame", "graphic", "手机框摆正亮屏"],
  ["laptopframe", "本框", "Laptop Frame", "graphic", "笔记本打开钻屏"],
  ["orbitgallery", "旋廊", "Orbit Gallery", "graphic", "照片螺旋进中心"],
  ["followerrush", "涌粉", "Follower Rush", "graphic", "关注通知叠头像"],
  ["logoassemble", "标聚", "Logo Assemble", "graphic", "卡片塌成品牌"],
  ["moodboard", "图墙", "Moodboard", "graphic", "散图推进主图"],
  ["pathwriter", "轨书", "Path Writer", "type", "路径书写"],
  ["construct", "构筑", "Construct", "graphic", "图形系统"],
  ["crash", "碰撞", "Crash", "physics", "物理粒子"],
  ["crashclock", "碰撞时钟", "Crash Clock", "physics", "物理粒子"],
  ["danger", "警示", "Danger", "type", "排版实验"],
  ["field", "场域", "Field", "flow", "波形流动"],
  ["iconburst", "图标爆发", "Icon Burst", "graphic", "文字 × 图标 × 硬切换色"],
  ["flash", "闪光", "Flash", "type", "排版实验"],
  ["index", "圆柱", "Cylinder", "space", "立体空间"],
  ["layers", "层叠", "Layers", "type", "排版实验"],
  ["morisawa", "森泽", "Morisawa", "type", "排版实验"],
  ["pow", "砰", "Pow", "graphic", "图形系统"],
  ["prism", "棱镜", "Prism", "space", "色散纵深"],
  ["ribbon", "丝带", "Ribbon", "flow", "波形流动"],
  ["shine", "闪耀", "Shine", "graphic", "图形系统"],
  ["snap", "吸附", "Snap", "physics", "物理粒子"],
  ["string", "琴弦", "String", "flow", "波形流动"],
  ["vessel", "器皿", "Vessel", "space", "立体空间"],
];

const grid = document.querySelector("#effectGrid");
const searchInput = document.querySelector("#searchInput");
const count = document.querySelector("#visibleCount");
const emptyState = document.querySelector("#emptyState");
const filterButtons = [...document.querySelectorAll(".filter")];
let activeFilter = "all";
const livePreviews = new Set(["textswell"]);
const featuredPreviews = new Set(["textswell", "currentwall", "iconburst", "continuation", "beforeafter", "shutterafter", "pathwriter", "scrapbin"]);
const liveObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const frame = entry.target;
    if (entry.isIntersecting) {
      if (frame.dataset.src && frame.getAttribute("src") !== frame.dataset.src) {
        frame.src = frame.dataset.src;
      }
    } else if (frame.getAttribute("src")) {
      frame.removeAttribute("src");
    }
  });
}, { rootMargin: "120px 0px", threshold: 0.15 });

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase("zh-CN");
  const visible = effects.filter(([slug, zh, en, category, categoryName]) => {
    const matchesFilter = activeFilter === "all" || category === activeFilter;
    const haystack = `${slug} ${zh} ${en} ${categoryName}`.toLocaleLowerCase("zh-CN");
    return matchesFilter && (!query || haystack.includes(query));
  });

  grid.innerHTML = visible.map(([slug, zh, en, , categoryName]) => {
    const index = effects.findIndex((effect) => effect[0] === slug) + 1;
    const imageName = slug === "crashclock" ? "final_crashclock.png" : ["iconburst", "focuswheel", "gradienttype", "glyphrelay", "wordgather", "focusportal", "rapidsequence", "citystack", "colorcanvas", "liquidtype", "scrapbin", "terminalbrand", "slotstories", "mediacascade", "colorrecompose", "phrasebuild", "switchdrop", "searchtyping", "beforeafter", "shutterafter", "assemble", "verbcue", "tighten", "titlecard", "lockup", "promptcue", "pullback", "textswell", "wordflip", "textbuild", "textswap", "textreveal", "phoneframe", "laptopframe", "orbitgallery", "followerrush", "logoassemble", "moodboard"].includes(slug) ? `final_${slug}.svg` : `final_${slug}.png`;
    const target = slug === "flash" ? "flash-scenes.html" : slug === "iconburst" ? "iconburst.html?from=gallery&v=20260824-37" : slug === "continuation" ? "continuation.html?from=gallery&v=20260829-editor25" : slug === "currentwall" ? "currentwall.html?from=gallery&v=20260830-28" : slug === "beforeafter" ? "beforeafter.html?from=gallery&v=20260825-latest1" : slug === "shutterafter" ? "shutterafter.html?from=gallery&v=20260827-1" : slug === "pathwriter" ? "pathwriter.html?from=gallery&v=20260827-default2" : slug === "scrapbin" ? "scrapbin.html?from=gallery&v=20260826-delete11" : slug === "liquidtype" ? "liquidtype.html?from=gallery&v=20260824-scatter3" : `${slug}.html`;
    const detail = slug === "flash" ? "13 个独立子风格" : categoryName;
    const preview = slug === "continuation"
      ? `<video class="effect-loop" src="assets/previews/continuation-card.mp4?v=20260829-1" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "iconburst"
      ? `<video class="effect-loop" src="assets/previews/iconburst-card.mp4?v=20260824-1" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "currentwall"
        ? `<video class="effect-loop" src="assets/previews/water-flow-card.mp4?v=20260830-1" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "beforeafter"
        ? `<video class="effect-loop effect-loop-portrait" src="assets/previews/beforeafter-card.mp4?v=20260825-latest1" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "shutterafter"
        ? `<video class="effect-loop effect-loop-portrait" src="assets/previews/shutterafter-card.mp4?v=20260827-1" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "pathwriter"
        ? `<video class="effect-loop" src="assets/previews/pathwriter-card.mp4?v=20260827-default2" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "scrapbin"
        ? `<video class="effect-loop" src="assets/previews/delete-card.mp4?v=20260826-3" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : slug === "colorrecompose"
        ? `<video class="effect-loop" src="assets/previews/color-recompose-card.mp4?v=20260827-1" autoplay muted loop playsinline preload="metadata" aria-label="${zh}动态效果预览"></video>`
      : livePreviews.has(slug)
        ? `<iframe class="effect-live" title="${zh}实时预览" data-src="${slug}.html?preview=1&amp;v=${slug === "currentwall" ? "20260824-ui10" : "20260824-37"}" loading="lazy" tabindex="-1"></iframe>`
        : `<img src="${imageName}" alt="${zh}动态字体效果预览" ${index > 8 ? 'loading="lazy"' : ""}>`;
    return `
      <article class="effect-card${featuredPreviews.has(slug) ? " has-live-preview" : ""}" data-effect="${slug}">
        <a class="effect-link" href="${target}" aria-label="打开${zh}效果">
          <div class="effect-preview">
            ${preview}
            <span class="effect-number">${String(index).padStart(2, "0")}</span>
          </div>
          <div class="effect-body">
            <div><h2>${zh}</h2><p>${en} / ${detail}</p></div>
            <span class="effect-arrow" aria-hidden="true">→</span>
          </div>
        </a>
      </article>`;
  }).join("");

  if (count) count.textContent = String(visible.length);
  grid.hidden = visible.length === 0;
  emptyState.hidden = visible.length !== 0;
  liveObserver.disconnect();
  grid.querySelectorAll("iframe.effect-live").forEach((frame) => liveObserver.observe(frame));
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    render();
  });
});

searchInput.addEventListener("input", render);
render();
