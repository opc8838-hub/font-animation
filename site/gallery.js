const effects = [
  ["badge", "徽章", "Badge", "graphic", "图形系统"],
  ["boost", "助推", "Boost", "type", "排版实验"],
  ["boxsquad", "方块小队", "BoxSquad", "graphic", "图形系统"],
  ["cascade", "瀑布", "Cascade", "flow", "波形流动"],
  ["clutter", "杂散", "Clutter", "space", "立体空间"],
  ["coil", "线圈", "Coil", "flow", "波形流动"],
  ["continuation", "续句", "Continuation", "type", "匹配切换"],
  ["currentwall", "流墙", "Current Wall", "flow", "水流字墙"],
  ["verticalwall", "纵跃", "Vertical Rise", "flow", "纵向弹出"],
  ["creatorstudio", "汇聚", "Creator Merge", "type", "字位重组"],
  ["focuswheel", "焦轮", "Focus Wheel", "flow", "纵向焦点滚轮"],
  ["gradienttype", "渐字", "Gradient Type", "type", "流动渐变逐字输入"],
  ["colorrecompose", "彩组", "Color Recompose", "type", "彩色重组"],
  ["phrasebuild", "组句", "Phrase Build", "type", "累计组词"],
  ["switchdrop", "降临", "Switch Drop", "graphic", "主体降临 × 明暗开关"],
  ["pathwriter", "轨书", "Path Writer", "type", "路径书写"],
  ["construct", "构筑", "Construct", "graphic", "图形系统"],
  ["crash", "碰撞", "Crash", "physics", "物理粒子"],
  ["crashclock", "碰撞时钟", "Crash Clock", "physics", "物理粒子"],
  ["danger", "警示", "Danger", "type", "排版实验"],
  ["field", "场域", "Field", "flow", "波形流动"],
  ["flag", "旗帜", "Flag", "flow", "波形流动"],
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
  ["stripes", "条纹", "Stripes", "graphic", "图形系统"],
  ["vessel", "器皿", "Vessel", "space", "立体空间"],
];

const grid = document.querySelector("#effectGrid");
const searchInput = document.querySelector("#searchInput");
const count = document.querySelector("#visibleCount");
const emptyState = document.querySelector("#emptyState");
const filterButtons = [...document.querySelectorAll(".filter")];
let activeFilter = "all";

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase("zh-CN");
  const visible = effects.filter(([slug, zh, en, category, categoryName]) => {
    const matchesFilter = activeFilter === "all" || category === activeFilter;
    const haystack = `${slug} ${zh} ${en} ${categoryName}`.toLocaleLowerCase("zh-CN");
    return matchesFilter && (!query || haystack.includes(query));
  });

  grid.innerHTML = visible.map(([slug, zh, en, , categoryName]) => {
    const index = effects.findIndex((effect) => effect[0] === slug) + 1;
    const imageName = slug === "crashclock" ? "final_crashclock.png" : ["iconburst", "focuswheel", "gradienttype", "colorrecompose", "phrasebuild", "switchdrop"].includes(slug) ? `final_${slug}.svg` : `final_${slug}.png`;
    const target = slug === "flash" ? "flash-scenes.html" : `${slug}.html`;
    const detail = slug === "flash" ? "13 个独立子风格" : categoryName;
    return `
      <article class="effect-card">
        <a class="effect-link" href="${target}" aria-label="打开${zh}效果">
          <div class="effect-preview">
            <img src="${imageName}" alt="${zh}动态字体效果预览" ${index > 8 ? 'loading="lazy"' : ""}>
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
