const flashSceneCards = [
  ["arc", "弧线", "Arc", "文字沿大弧面快速展开"],
  ["bend", "弯折", "Bend", "字面像软片一样弯曲切入"],
  ["box", "方框", "Box", "文字与几何框体同时收放"],
  ["bug-eye", "虫眼", "Bug Eye", "双圆透镜式放大与聚焦"],
  ["halo", "光环", "Halo", "文字围绕中心形成环形节奏"],
  ["sun", "旭日", "Sun", "放射线与标题共同升起"],
  ["shutter-1", "百叶窗一", "Shutter 1", "纵向遮片分段打开文字"],
  ["shutter-2", "百叶窗二", "Shutter 2", "更密集的切片开合"],
  ["slots", "滚轮", "Slots", "像机械字轮一样纵向滚动"],
  ["snap", "闪切", "Snap", "短促缩放和位置跳切"],
  ["split", "分裂", "Split", "文字从中心向两侧分开"],
  ["star", "星芒", "Star", "放射星形与文字爆发"],
  ["twist", "扭转", "Twist", "文字平面产生空间扭转"]
];

const sceneGrid = document.querySelector("#flashSceneGrid");
sceneGrid.innerHTML = flashSceneCards.map(([slug, zh, en, description], index) => `
  <article class="effect-card flash-scene-card scene-${index + 1}">
    <a class="effect-link" href="flash.html?scene=${slug}" aria-label="打开 ${zh} 子风格">
      <div class="flash-scene-preview" aria-hidden="true">
        <span class="flash-scene-word">${en.toUpperCase()}</span>
        <span class="flash-scene-shape"></span>
        <span class="effect-number">${String(index + 1).padStart(2, "0")}</span>
      </div>
      <div class="effect-body">
        <div><h2>${zh}</h2><p>${en}</p><small>${description}</small></div>
        <span class="effect-arrow" aria-hidden="true">→</span>
      </div>
    </a>
  </article>`).join("");
