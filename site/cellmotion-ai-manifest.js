(() => {
  "use strict";

  const SCHEMA_VERSION = "1.0.0";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const unique = (values) => [...new Set(values.filter(Boolean))];

  function collectAssets(scheme) {
    const rows = Array.isArray(scheme?.rows) ? scheme.rows : [];
    const fonts = unique([
      scheme?.typography?.fontFamily,
      scheme?.settings?.font,
      ...rows.map((row) => row.fontFamily)
    ]).map((id) => ({ id, source: id.startsWith("stg:") ? "cellmotion-font-library" : "css-font-family" }));
    const images = Array.isArray(scheme?.assets) ? scheme.assets : [];
    const icons = unique([...rows.flatMap((row) => (row.icons || []).map((icon) => icon.libraryId)), ...images.map((asset) => asset.libraryId)])
      .map((id) => ({ id, source: id.startsWith("custom:") ? "composition.customAssets" : "cellmotion-icon-library" }));
    const backgrounds = rows
      .filter((row) => row.backgroundMedia)
      .map((row) => ({ rowId: row.id, ...clone(row.backgroundMedia) }));
    const embedded = [...(Array.isArray(scheme?.customAssets) ? clone(scheme.customAssets) : []), ...images.map((asset, index) => ({ id: asset.id, name: asset.imageName, kind: asset.kind, source: `composition.assets[${index}]`, libraryId: asset.libraryId }))];
    return { fonts, icons, backgrounds, embedded };
  }

  function createManifest({ definition, scheme, baseUrl = document.baseURI }) {
    if (!definition?.effect?.id) throw new Error("缺少动效定义 effect.id");
    if (!scheme || typeof scheme !== "object") throw new Error("缺少当前编辑方案");
    const manifest = {
      $schema: new URL("schemas/cellmotion-component-v1.schema.json", baseUrl).href,
      schemaVersion: SCHEMA_VERSION,
      generator: { name: "CellMotion", mode: "editor-live-state" },
      effect: clone(definition.effect),
      runtime: clone(definition.runtime),
      capabilities: clone(definition.capabilities || {}),
      behavior: clone(definition.behavior || {}),
      parameterDefinitions: clone(definition.parameters || []),
      composition: clone(scheme),
      assets: collectAssets(scheme),
      presentation: {
        autoplay: true,
        responsive: "contain",
        reducedMotion: "pause"
      }
    };
    manifest.runtime.entry = new URL(manifest.runtime.entry, baseUrl).href;
    return manifest;
  }

  function validate(manifest) {
    const errors = [];
    if (manifest?.schemaVersion !== SCHEMA_VERSION) errors.push("schemaVersion 必须是 1.0.0");
    if (!manifest?.effect?.id) errors.push("缺少 effect.id");
    if (!manifest?.runtime?.entry) errors.push("缺少 runtime.entry");
    if (manifest?.runtime?.kind === 'iframe-bridge' && manifest.runtime.bridgeVersion !== SCHEMA_VERSION) errors.push('不支持的 bridgeVersion / Unsupported bridge version');
    if (manifest?.effect?.id === 'curvedgallery') {
      const composition = manifest.composition;
      if (composition?.effect !== 'curvedgallery' || ![1, 2].includes(composition?.version) || !Array.isArray(composition?.assets)) errors.push('无效的弧廊归标 composition');
      if (!['width', 'height'].every(key => Number.isFinite(composition?.settings?.[key]) && composition.settings[key] > 0)) errors.push('缺少 composition.settings 画布尺寸');
    } else {
      if (!manifest?.composition?.canvas) errors.push("缺少 composition.canvas");
      if (!Array.isArray(manifest?.composition?.rows)) errors.push("composition.rows 必须是数组");
    }
    return { valid: errors.length === 0, errors };
  }

  function configuredCode(manifest) {
    const json = JSON.stringify(manifest, null, 2).replace(/<\//g, "<\\/");
    const playerScript = new URL('cellmotion-player.js', manifest.runtime.entry); playerScript.searchParams.set('v', '20261010-ai1');
    if (manifest.capabilities?.nativeEffectPage) {
      return `<iframe title="${manifest.effect.name?.en || manifest.effect.id}" src="${manifest.runtime.entry}" style="display:block;width:100%;aspect-ratio:${manifest.composition.canvas.width}/${manifest.composition.canvas.height};border:0"></iframe>\n<script type="application/json" id="cellmotion-editor-config">${json}</script>`;
    }
    return `<script src="${playerScript.href}"></script>\n<cellmotion-player id="cellmotion" style="display:block;width:100%;max-width:720px"></cellmotion-player>\n<script>\n  document.querySelector('#cellmotion').manifest = ${json};\n<\/script>`;
  }

  function aiPrompt(manifest, language = "zh") {
    const payload = JSON.stringify(manifest, null, 2);
    if (manifest.capabilities?.nativeEffectPage) {
      if (language === "en") return `Reuse the existing CellMotion effect page at runtime.entry. Do not redraw or replace its animation. Keep the current text, canvas dimensions, and editor control values from composition.editorState. Place the page inside a responsive frame using composition.canvas dimensions.\n\n${payload}`;
      return `接入现有 CellMotion 动效页面 runtime.entry，不要重画或替换动效。保留 composition.editorState 中的文字、画布尺寸和编辑器控件值，并按 composition.canvas 的比例自适应展示。\n\n${payload}`;
    }
    if (language === "en") {
      return `Integrate this CellMotion component without reimplementing its animation. Load cellmotion-player.js, pass the complete manifest to <cellmotion-player>, preserve its canvas aspect ratio, text, fonts, images/icons, media ownership, crop/effects, backgrounds, timings and reduced-motion behavior. The composition is the user's live editor state.\n\n${payload}`;
    }
    return `请把下面的 CellMotion 动效组件接入前端，不要重新猜测或重写动画。加载 cellmotion-player.js，把完整 Manifest 交给 <cellmotion-player>；保持画布比例、文字、字体、图片/图标、素材所属关系、裁切与滤镜、背景、时间参数与减少动态效果规则。composition 是用户在编辑器中的实时配置。\n\n${payload}`;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function downloadJson(value, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.CellMotionAI = { SCHEMA_VERSION, createManifest, validate, configuredCode, aiPrompt, copyText, downloadJson };
})();
