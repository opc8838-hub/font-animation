(() => {
  "use strict";

  const player = document.getElementById("demoPlayer");
  const status = document.getElementById("demoStatus");
  const code = document.getElementById("demoCode");
  const seek = document.getElementById("demoSeek");
  let configuredCode = "";
  let livePreview = false;

  function applyManifest(manifest, sourceLabel = "默认方案") {
    const validation = window.CellMotionAI.validate(manifest);
    if (!validation.valid) throw new Error(validation.errors.join("；"));
    player.manifest = manifest;
    configuredCode = window.CellMotionAI.configuredCode(manifest);
    code.textContent = configuredCode;
    status.textContent = `${sourceLabel} Manifest 已载入，正在等待同一 Canvas 渲染器就绪…`;
  }

  async function initialize() {
    try {
      livePreview = new URLSearchParams(location.search).get("live") === "1";
      if (livePreview && window.opener) {
        status.textContent = "正在接收编辑器当前配置…";
        window.opener.postMessage({ type: "cellmotion:demo-ready" }, location.origin);
        return;
      }
      const [definitionResponse, presetResponse] = await Promise.all([
        fetch("effects/typecascade.component.json"),
        fetch("assets/presets/typecascade-default.json")
      ]);
      if (!definitionResponse.ok || !presetResponse.ok) throw new Error("组件描述或默认方案加载失败");
      const manifest = window.CellMotionAI.createManifest({
        definition: await definitionResponse.json(),
        scheme: await presetResponse.json(),
        baseUrl: document.baseURI
      });
      applyManifest(manifest);
    } catch (error) {
      console.error(error);
      status.textContent = `演示加载失败：${error.message}`;
    }
  }

  window.addEventListener("message", (event) => {
    if (!livePreview || event.origin !== location.origin || event.source !== window.opener || event.data?.type !== "cellmotion:demo-manifest") return;
    try {
      applyManifest(event.data.manifest, "编辑器当前配置");
    } catch (error) {
      console.error(error);
      status.textContent = `实时预览加载失败：${error.message}`;
    }
  });
  player.addEventListener("cellmotion-ready", () => { status.textContent = `${livePreview ? "编辑器当前配置" : "默认方案"}已就绪 · Preview 与 Code 使用同一份 Manifest`; });
  document.querySelector(".demo-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    document.querySelectorAll("[data-tab]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    document.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== button.dataset.tab; });
  });
  document.querySelector(".demo-controls").addEventListener("click", (event) => {
    const action = event.target.closest("[data-player-action]")?.dataset.playerAction;
    if (action && typeof player[action] === "function") player[action]();
  });
  seek.addEventListener("input", () => player.seek(Number(seek.value)));
  document.getElementById("copyDemoCode").addEventListener("click", async () => {
    if (!configuredCode) return;
    await window.CellMotionAI.copyText(configuredCode);
    status.textContent = "配置代码已复制";
  });

  initialize();
})();
