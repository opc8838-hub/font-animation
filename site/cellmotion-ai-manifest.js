(() => {
  "use strict";

  const SCHEMA_VERSION = "1.0.0";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const unique = (values) => [...new Set(values.filter(Boolean))];

  function collectAssets(scheme) {
    const rows = Array.isArray(scheme?.rows) ? scheme.rows : [];
    const fonts = unique([
      scheme?.typography?.fontFamily,
      ...rows.map((row) => row.fontFamily)
    ]).map((id) => ({ id, source: id.startsWith("stg:") ? "cellmotion-font-library" : "css-font-family" }));
    const icons = unique(rows.flatMap((row) => (row.icons || []).map((icon) => icon.libraryId)))
      .map((id) => ({ id, source: id.startsWith("custom:") ? "composition.customAssets" : "cellmotion-icon-library" }));
    const backgrounds = rows
      .filter((row) => row.backgroundMedia)
      .map((row) => ({ rowId: row.id, ...clone(row.backgroundMedia) }));
    const embedded = Array.isArray(scheme?.customAssets) ? clone(scheme.customAssets) : [];
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
    if (!manifest?.composition?.canvas) errors.push("缺少 composition.canvas");
    if (!Array.isArray(manifest?.composition?.rows)) errors.push("composition.rows 必须是数组");
    return { valid: errors.length === 0, errors };
  }

  function configuredCode(manifest) {
    const json = JSON.stringify(manifest, null, 2).replace(/<\//g, "<\\/");
    return `<script type="module" src="${new URL("cellmotion-player.js", document.baseURI).href}"></script>\n<cellmotion-player id="cellmotion" style="display:block;width:100%;max-width:720px"></cellmotion-player>\n<script>\n  document.querySelector('#cellmotion').manifest = ${json};\n<\/script>`;
  }

  function aiPrompt(manifest, language = "zh") {
    const payload = JSON.stringify(manifest, null, 2);
    if (language === "en") {
      return `Integrate this CellMotion component without reimplementing its animation. Load cellmotion-player.js, pass the complete manifest to <cellmotion-player>, preserve its canvas aspect ratio, text, fonts, icons, per-row backgrounds/media, timings and reduced-motion behavior. The composition is the user's live editor state.\n\n${payload}`;
    }
    return `请把下面的 CellMotion 动效组件接入前端，不要重新猜测或重写动画。加载 cellmotion-player.js，把完整 Manifest 交给 <cellmotion-player>；保持画布比例、文字、字体、图标、逐段背景/媒体、时间参数与减少动态效果规则。composition 是用户在编辑器中的实时配置。\n\n${payload}`;
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
