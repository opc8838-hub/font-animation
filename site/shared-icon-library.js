(() => {
  "use strict";
  if (window.STGIconLibrary) return;

  const svgIcon = (body, background) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${background}"/>${body}</svg>`)}`;
  const vectorPreview = (body, background = "#0b0b0d") => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">${background === "transparent" ? "" : `<rect width="160" height="100" rx="16" fill="${background}"/>`}${body}</svg>`)}`;
  const item = (libraryId, name, url, fileType, extra = {}) => ({ libraryId, name, url, fileType, ...extra });

  const flow = [
    item("flow-music", "水流音乐", svgIcon('<g transform="translate(-4 0)"><path d="M44 24v37c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V39l24-7v24c-3-2-7-2-11-1-7 2-11 8-9 13s9 7 16 5c6-2 10-7 10-12V19z" fill="white"/></g>', "#fa264f"), "image/svg+xml"),
    item("flow-play", "水流播放", svgIcon('<circle cx="50" cy="50" r="34" fill="none" stroke="white" stroke-width="6"/><path d="M41 30 70 50 41 70z" fill="white"/>', "#111111"), "image/svg+xml"),
    item("flow-cloud", "水流云", svgIcon('<circle cx="34" cy="56" r="15" fill="white"/><circle cx="51" cy="45" r="22" fill="white"/><circle cx="70" cy="56" r="16" fill="white"/><rect x="19" y="54" width="67" height="21" rx="10" fill="white"/>', "#1389ff"), "image/svg+xml"),
    item("flow-watch", "水流手表", svgIcon('<rect x="28" y="19" width="44" height="62" rx="15" fill="#111"/><rect x="35" y="28" width="30" height="44" rx="9" fill="#d7ff2f"/><circle cx="50" cy="50" r="3" fill="#111"/>', "#d8d8d8"), "image/svg+xml"),
    item("rainbow-ring", "彩虹圆环", vectorPreview('<defs><linearGradient id="r"><stop stop-color="#ff375f"/><stop offset=".34" stop-color="#ffd60a"/><stop offset=".67" stop-color="#32d74b"/><stop offset="1" stop-color="#0a84ff"/></linearGradient></defs><ellipse cx="80" cy="50" rx="50" ry="28" fill="none" stroke="url(#r)" stroke-width="12"/>', "transparent"), "vector/rainbow-ring", { kind: "vector", vectorType: "rainbow-ring" })
  ];

  const gifMotion = [
    item("collision-hand", "动态手掌", "crash_resources/images/0.gif", "image/gif"),
    item("collision-sky", "动态天空", "crash_resources/images/1.gif", "image/gif"),
    item("construct-cloud", "动态线云", vectorPreview('<path d="M28 65c-18-22 10-43 28-28 8-26 44-27 54-3 22-12 40 13 22 30z" fill="none" stroke="#fff" stroke-width="3"/>'), "vector/cloud", { kind: "vector", vectorType: "cloud" }),
    item("construct-cloud-paper", "动态线云 · 透明底黑线", vectorPreview('<path d="M28 65c-18-22 10-43 28-28 8-26 44-27 54-3 22-12 40 13 22 30z" fill="none" stroke="#111" stroke-width="3"/>', "transparent"), "vector/cloud", { kind: "vector", vectorType: "cloud", vectorStyle: "ink" }),
    item("construct-loop", "环绕线条", vectorPreview('<g fill="none" stroke="#fff" stroke-width="2"><ellipse cx="80" cy="50" rx="55" ry="24" transform="rotate(-10 80 50)"/><ellipse cx="80" cy="50" rx="55" ry="24" transform="rotate(10 80 50)"/></g>'), "vector/loop", { kind: "vector", vectorType: "loop" }),
    item("construct-loop-paper", "环绕线条 · 透明底黑线", vectorPreview('<g fill="none" stroke="#111" stroke-width="2"><ellipse cx="80" cy="50" rx="55" ry="24" transform="rotate(-10 80 50)"/><ellipse cx="80" cy="50" rx="55" ry="24" transform="rotate(10 80 50)"/></g>', "transparent"), "vector/loop", { kind: "vector", vectorType: "loop", vectorStyle: "ink" }),
    item("construct-stroke", "彩色粗线", vectorPreview('<path d="M20 63C42 12 69 91 91 45S128 78 143 27" fill="none" stroke="url(#g)" stroke-width="13" stroke-linecap="round"/><defs><linearGradient id="g"><stop stop-color="#36df7a"/><stop offset=".5" stop-color="#ffb000"/><stop offset="1" stop-color="#1479ff"/></linearGradient></defs>'), "vector/stroke", { kind: "vector", vectorType: "stroke" }),
    item("construct-bar", "渐变粗条", vectorPreview('<defs><linearGradient id="b" x2="0" y2="1"><stop stop-color="#24ef82"/><stop offset="1" stop-color="#24ef82" stop-opacity="0"/></linearGradient></defs><rect x="18" y="30" width="124" height="40" rx="8" fill="url(#b)"/>'), "vector/bar", { kind: "vector", vectorType: "bar" }),
    item("construct-wave", "流光波线", vectorPreview('<path d="M12 54C34 17 53 86 78 47s45 35 70-8" fill="none" stroke="#d8ff2f" stroke-width="5" stroke-linecap="round"/>'), "vector/wave", { kind: "vector", vectorType: "wave" }),
    item("construct-ribbon", "双层飘带", vectorPreview('<g fill="none" stroke-linecap="round"><path d="M12 38C42 76 65 18 96 57s38-20 54-9" stroke="#ff315f" stroke-width="9"/><path d="M12 57C40 22 72 82 103 38s33 20 47 5" stroke="#38cfff" stroke-width="5"/></g>'), "vector/ribbon", { kind: "vector", vectorType: "ribbon" }),
    item("construct-coil", "旋转线圈", vectorPreview('<g fill="none" stroke="#fff" stroke-width="2"><ellipse cx="80" cy="50" rx="60" ry="18"/><ellipse cx="80" cy="50" rx="42" ry="28" transform="rotate(28 80 50)"/><ellipse cx="80" cy="50" rx="24" ry="38" transform="rotate(-28 80 50)"/></g>'), "vector/coil", { kind: "vector", vectorType: "coil" }),
    item("construct-coil-paper", "旋转线圈 · 透明底黑线", vectorPreview('<g fill="none" stroke="#111" stroke-width="2"><ellipse cx="80" cy="50" rx="60" ry="18"/><ellipse cx="80" cy="50" rx="42" ry="28" transform="rotate(28 80 50)"/><ellipse cx="80" cy="50" rx="24" ry="38" transform="rotate(-28 80 50)"/></g>', "transparent"), "vector/coil", { kind: "vector", vectorType: "coil", vectorStyle: "ink" }),
    item("construct-pulse", "脉冲线束", vectorPreview('<g fill="none" stroke="#ffcf20" stroke-width="4" stroke-linecap="round"><path d="M14 50h28l8-23 15 49 13-38 11 24 10-12h47"/><path d="M14 67h132" stroke="#985cff" stroke-width="2"/></g>'), "vector/pulse", { kind: "vector", vectorType: "pulse" })
  ];

  const animals = Array.from({ length: 31 }, (_, index) => item(
    `animal-${String(index + 1).padStart(2, "0")}`,
    index === 4 ? "鲸鱼" : `透明动物 ${String(index + 1).padStart(2, "0")}`,
    `assets/transparent-animals/animal-${String(index + 1).padStart(2, "0")}.png`,
    "image/png"
  ));
  const bots = [
    "bloub-capsule-colere-brun.gif", "bloub-cercle-attentif-violet.gif", "bloub-cercle-curieux-encre.gif",
    "bloub-galet-blase-orange.gif", "bloub-galet-somnolent-rouge.gif", "bloub-goutte-curieux-turquoise.gif",
    "bloub-hexagone-surpris-gris.gif", "bloub-nuage-mefiant-rouge.gif", "bloub-nuage-neutre-bleu.gif",
    "bloub-squircle-effraye-orange.gif", "bloub-triangle-mefiant-ambre.gif"
  ].map((filename, index) => item(`bot-${String(index + 1).padStart(2, "0")}`, `Bot 动态图标 ${String(index + 1).padStart(2, "0")}`, `assets/bot-series/${filename}`, "image/gif"));

  function drawVector(context, asset, size, time) {
    const pulse = 1 + Math.sin(time * 4.2 + Number(asset.rotation || 0)) * .045;
    const ink = asset.vectorStyle === "ink" ? "#111" : "#f5f5f7";
    context.save();
    context.scale(pulse, pulse);
    context.lineCap = "round";
    context.lineJoin = "round";
    if (asset.vectorType === "rainbow-ring") {
      const gradient = context.createLinearGradient(-size / 2, 0, size / 2, 0);
      [[0, "#ff375f"], [.34, "#ffd60a"], [.67, "#32d74b"], [1, "#0a84ff"]].forEach(([stop, color]) => gradient.addColorStop(stop, color));
      context.strokeStyle = gradient; context.lineWidth = size * .12; context.beginPath(); context.ellipse(0, 0, size * .43, size * .27, time * .35, 0, Math.PI * 2); context.stroke();
    } else if (asset.vectorType === "cloud") {
      context.translate(Math.sin(time * 1.8) * size * .04, Math.cos(time * 2.1) * size * .025); context.strokeStyle = ink; context.lineWidth = Math.max(2, size * .045); context.setLineDash([size * .16, size * .05]); context.lineDashOffset = -time * size * .22; context.beginPath(); context.moveTo(-size * .42, size * .16); context.bezierCurveTo(-size * .56, -size * .08, -size * .31, -size * .34, -size * .13, -size * .2); context.bezierCurveTo(-size * .02, -size * .48, size * .33, -size * .42, size * .34, -size * .12); context.bezierCurveTo(size * .58, -size * .2, size * .63, size * .2, size * .35, size * .22); context.lineTo(-size * .42, size * .16); context.stroke();
    } else if (asset.vectorType === "loop") {
      context.strokeStyle = ink; context.lineWidth = Math.max(1.5, size * .025); for (let index = 0; index < 3; index += 1) { context.save(); context.rotate(time * .32 * (index % 2 ? -1 : 1) + index * .3); context.scale(1, .42); context.beginPath(); context.arc(0, 0, size * .48, 0, Math.PI * 2); context.stroke(); context.restore(); }
    } else if (asset.vectorType === "stroke") {
      const gradient = context.createLinearGradient(-size / 2, 0, size / 2, 0); gradient.addColorStop(0, "#31df78"); gradient.addColorStop(.48, "#ffad00"); gradient.addColorStop(1, "#1479ff"); context.strokeStyle = gradient; context.lineWidth = size * .15; context.beginPath(); context.moveTo(-size * .48, size * .12); context.bezierCurveTo(-size * .28, -size * .38, -size * .04, size * .43, size * .17, -.05 * size); context.bezierCurveTo(size * .3, -size * .34, size * .38, size * .28, size * .49, -size * .2); context.stroke();
    } else if (asset.vectorType === "bar") {
      const gradient = context.createLinearGradient(0, -size / 2, 0, size / 2); gradient.addColorStop(0, "#22e783"); gradient.addColorStop(1, "rgba(34,231,131,0)"); context.fillStyle = gradient; const sweep = .72 + .28 * Math.sin(time * 3.2) ** 2; context.fillRect(-size * .52, -size * .21, size * 1.04 * sweep, size * .42);
    } else if (asset.vectorType === "wave" || asset.vectorType === "ribbon") {
      const ribbon = asset.vectorType === "ribbon", gradient = context.createLinearGradient(-size / 2, 0, size / 2, 0); gradient.addColorStop(0, ribbon ? "#ff315f" : "#d8ff2f"); gradient.addColorStop(.52, ribbon ? "#ffcf20" : "#38cfff"); gradient.addColorStop(1, ribbon ? "#38cfff" : "#985cff"); context.strokeStyle = gradient; context.lineWidth = size * (ribbon ? .11 : .06); context.setLineDash([size * .22, size * .055]); context.lineDashOffset = -time * size * .55; context.beginPath(); context.moveTo(-size * .54, size * .08); context.bezierCurveTo(-size * .3, -size * .42, -size * .08, size * .43, size * .14, -.06 * size); context.bezierCurveTo(size * .29, -size * .39, size * .42, size * .31, size * .55, -size * .17); context.stroke(); if (ribbon) { context.strokeStyle = "rgba(255,255,255,.72)"; context.lineWidth = size * .025; context.lineDashOffset *= -1; context.translate(0, size * .13); context.stroke(); }
    } else if (asset.vectorType === "coil") {
      context.strokeStyle = ink; context.lineWidth = Math.max(1.5, size * .022); for (let index = 0; index < 4; index += 1) { context.save(); context.rotate(time * .7 * (index % 2 ? -1 : 1) + index * .44); context.scale(1, .28 + index * .08); context.beginPath(); context.arc(0, 0, size * (.5 - index * .055), 0, Math.PI * 2); context.stroke(); context.restore(); }
    } else if (asset.vectorType === "pulse") {
      context.strokeStyle = "#ffcf20"; context.lineWidth = size * .045; context.setLineDash([size * .18, size * .045]); context.lineDashOffset = -time * size * .65; context.beginPath(); context.moveTo(-size * .52, 0); context.lineTo(-size * .28, 0); context.lineTo(-size * .2, -size * .28); context.lineTo(-size * .08, size * .3); context.lineTo(size * .05, -size * .21); context.lineTo(size * .18, size * .14); context.lineTo(size * .28, 0); context.lineTo(size * .52, 0); context.stroke();
    }
    context.restore();
  }

  const groups = { flow, gifMotion, animals, bots };
  const all = Object.values(groups).flat();
  const byId = new Map(all.map((asset) => [asset.libraryId, asset]));
  window.STGIconLibrary = { groups, all, byId, drawVector };
})();
