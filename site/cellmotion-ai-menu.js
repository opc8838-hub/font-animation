(() => {
  "use strict";

  const isReferenceEditor = document.body.classList.contains("rm-letterpulse");
  const isStgEditor = document.body.classList.contains("stg-pro-workspace");
  if (!document.body.classList.contains("tc-workspace") && !isReferenceEditor && !isStgEditor) return;
  const slug = isReferenceEditor ? window.ReferenceMotionEffect?.slug : (document.body.dataset.morphPort || location.pathname.split("/").pop().replace(/\.html$/, ""));
  if (!slug || slug === "typecascade") return;
  const header = document.querySelector(isReferenceEditor ? ".rm-header" : isStgEditor ? ".stg-workspace-header" : ".tc-header");
  const exportButton = header?.querySelector(isReferenceEditor ? ".rm-export-shortcut" : isStgEditor ? (".stg-standard-export-shortcut, .stg-workspace-top") : ".tc-export-shortcut");
  if (!header || !exportButton || !window.CellMotionAI) return;

  let language = (document.body.dataset.editorLanguage || localStorage.getItem(isReferenceEditor ? "cellmotion-lang" : "cellmotion-site-language") || "zh") === "en" ? "en" : "zh";
  let definitionPromise;
  const authoredComponentDefinitions = new Set(["prosvg", "typecascade", "sproutshift", "mistlift", "letterpulse", "iconburst", "glyphreveal", "curvedgallery"]);
  const title = (isReferenceEditor ? document.querySelector(".rm-title strong") : document.querySelector(".tc-header h1")?.childNodes[0])?.textContent?.trim() || slug;
  const words = {
    zh: {
      trigger: "用于 AI", preview: "预览 AI 组件", prompt: "复制 AI 提示词", code: "复制配置代码",
      json: "下载组件 JSON", params: "查看参数说明", copied: "已复制，可直接交给 AI",
      downloaded: "组件 JSON 已下载", title: `${title} · AI 参数说明`, close: "关闭",
      global: "全局", effect: "动效", row: "逐段", asset: "逐图"
    },
    en: {
      trigger: "For AI", preview: "Preview AI component", prompt: "Copy AI prompt", code: "Copy configured code",
      json: "Download component JSON", params: "View parameter guide", copied: "Copied — ready for AI",
      downloaded: "Component JSON downloaded", title: `${title} · AI parameters`, close: "Close",
      global: "Global", effect: "Effect", row: "Per row", asset: "Per image"
    }
  };

  const root = document.createElement("div");
  root.className = "tc-ai-actions";
  root.innerHTML = '<button class="tc-ai-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span></span><b aria-hidden="true"></b></button><div class="tc-ai-menu" role="menu" hidden><button type="button" data-ai-action="preview"></button><i></i><button type="button" data-ai-action="prompt"></button><button type="button" data-ai-action="code"></button><button type="button" data-ai-action="json"></button><i></i><button type="button" data-ai-action="params"></button></div>';
  header.insertBefore(root, exportButton);
  const trigger = root.querySelector(".tc-ai-trigger");
  const menu = root.querySelector(".tc-ai-menu");
  if (isStgEditor) {
    document.body.append(menu);
    const positionMenu = () => {
      const rect = trigger.getBoundingClientRect();
      menu.style.setProperty("position", "fixed", "important");
      menu.style.setProperty("top", `${Math.round(rect.bottom + 8)}px`, "important");
      menu.style.setProperty("left", `${Math.max(8, Math.min(window.innerWidth - 226, Math.round(rect.right - 218)))}px`, "important");
      menu.style.setProperty("right", "auto", "important");
      menu.style.setProperty("z-index", "2147483647", "important");
    };
    trigger.addEventListener("click", () => requestAnimationFrame(() => { if (!menu.hidden) positionMenu(); }));
    window.addEventListener("resize", () => { if (!menu.hidden) positionMenu(); }, { passive: true });
    window.addEventListener("scroll", () => { if (!menu.hidden) positionMenu(); }, { passive: true, capture: true });
  }
  const toast = document.createElement("div");
  toast.className = "tc-ai-toast";
  toast.setAttribute("role", "status");
  toast.hidden = true;
  document.body.append(toast);
  const dialog = document.createElement("dialog");
  dialog.className = "tc-ai-dialog";
  dialog.innerHTML = '<div class="tc-ai-dialog-head"><div><small>CELLMOTION COMPONENT / V1</small><h2></h2></div><button type="button" data-ai-close aria-label="Close">×</button></div><p class="tc-ai-summary"></p><div class="tc-ai-params"></div>';
  document.body.append(dialog);

  function notify(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.hidden = true; }, 2200);
  }
  function controlDefinitions() {
    const seen = new Map();
    return [...document.querySelectorAll("input, select, textarea")]
      .filter((control) => !["file", "button", "submit", "reset", "hidden"].includes(control.type) && !control.disabled)
      .map((control, index) => {
        const labelNode = control.closest("label") || (control.id ? document.querySelector(`label[for="${CSS.escape(control.id)}"]`) : null);
        const labelClone = labelNode?.cloneNode(true);
        labelClone?.querySelectorAll("input, select, textarea, output, button").forEach((node) => node.remove());
        const label = labelClone?.textContent?.replace(/\s+/g, " ").trim() || control.getAttribute("aria-label") || control.id || `参数 ${index + 1}`;
        const key = control.id || control.name || `control-${index + 1}`;
        const occurrence = (seen.get(key) || 0) + 1;
        seen.set(key, occurrence);
        const section = control.closest(".export-panel, [data-panel='export']") ? "global" : control.closest(".pair-editor-row, .gm-row-shell, .text-layer-row") ? "row" : "effect";
        return { path: `editor.controls.${key}${occurrence > 1 ? `.${occurrence}` : ""}`, scope: section, name: { zh: label, en: control.id || control.name || `Control ${index + 1}` }, type: control.type === "range" || control.type === "number" ? "number" : control.type === "color" ? "color" : control.tagName.toLowerCase() === "select" ? "enum" : control.type === "checkbox" ? "boolean" : "string", unit: control.dataset.unit || undefined };
      });
  }
  function genericDefinition() {
    const titleText = document.querySelector(".tc-header h1, .stg-workspace-heading strong, .rm-title strong, h1")?.textContent?.trim() || slug;
    return {
      effect: { id: slug, name: { zh: titleText, en: slug } },
      runtime: { entry: location.pathname + location.search },
      capabilities: { nativeEffectPage: true, liveEditorState: true, preview: false },
      behavior: { summary: { zh: `使用 ${titleText} 编辑器中的当前设置。配置包含页面控件、画布尺寸和文字内容。`, en: `Uses the current settings from the ${titleText} editor, including controls, canvas dimensions, and text.` } },
      parameters: controlDefinitions()
    };
  }
  function definition() {
    definitionPromise ||= authoredComponentDefinitions.has(slug)
      ? fetch(`effects/${slug}.component.json`).then(async (response) => response.ok ? response.json() : genericDefinition()).catch(() => genericDefinition())
      : Promise.resolve(genericDefinition());
    return definitionPromise;
  }
  async function manifest() {
    const bridge = window.CellMotionEffectBridge;
    const def = await definition();
    let scheme;
    if (bridge?.getScheme) scheme = bridge.getScheme();
    else if (def.capabilities?.nativeEffectPage) {
      const stage = document.querySelector("main, .stg-canvas-stage, .gm-stage, .current-stage") || document.body;
      const stageRect = stage.getBoundingClientRect();
      const canvas = document.querySelector("canvas");
      const width = Math.max(1, Math.round(canvas?.width || stageRect.width || 1920));
      const height = Math.max(1, Math.round(canvas?.height || stageRect.height || 1080));
      const controls = [...document.querySelectorAll("input, select, textarea")]
        .filter((control) => !["file", "button", "submit", "reset", "hidden"].includes(control.type))
        .map((control, index) => ({ id: control.id || control.name || `control-${index + 1}`, type: control.type || control.tagName.toLowerCase(), value: control.type === "checkbox" ? control.checked : control.value }));
      const textControls = [...document.querySelectorAll("textarea, input[type='text'], input:not([type])")]
        .filter((control) => !control.closest(".tc-ai-menu, .tc-ai-dialog"));
      const rows = textControls.map((control, index) => ({ id: control.id || `row-${index + 1}`, text: control.value || "", hold: 0 }));
      scheme = { version: 1, canvas: { width, height, fps: 30 }, typography: {}, rows, editorState: { entry: location.href, controls } };
      window.CellMotionEffectBridge = { getScheme: () => structuredClone(scheme) };
    } else throw new Error("Editor runtime bridge unavailable");
    return window.CellMotionAI.createManifest({ definition: def, scheme, baseUrl: document.baseURI });
  }
  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }
  function renderLanguage() {
    const t = words[language];
    trigger.querySelector("span").textContent = t.trigger;
    const labels = { preview: t.preview, prompt: t.prompt, code: t.code, json: t.json, params: t.params };
    Object.entries(labels).forEach(([action, label]) => {
      const button = menu.querySelector(`[data-ai-action="${action}"]`);
      if (button) button.textContent = label;
    });
    const previewButton = root.querySelector('[data-ai-action="preview"]');
    if (previewButton) previewButton.hidden = false;
  }
  function showParameters(def) {
    const t = words[language];
    dialog.querySelector("h2").textContent = `${def.effect?.name?.[language] || title} · ${language === 'en' ? 'AI parameters' : 'AI 参数说明'}`;
    dialog.querySelector(".tc-ai-summary").textContent = def.behavior?.summary?.[language] || "";
    const grouped = (def.parameters || []).reduce((result, item) => {
      (result[item.scope || "effect"] ||= []).push(item);
      return result;
    }, {});
    dialog.querySelector(".tc-ai-params").innerHTML = ["global", "effect", "row", "asset"]
      .filter((scope) => grouped[scope]?.length)
      .map((scope) => "<section><h3>" + t[scope] + "</h3>" + grouped[scope].map((item) => "<div><strong>" + (item.name?.[language] || item.path) + "</strong><code>" + item.path + "</code><span>" + item.type + (item.unit ? " · " + item.unit : "") + "</span></div>").join("") + "</section>")
      .join("");
    dialog.showModal();
  }

  trigger.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  });
  (isStgEditor ? menu : root).addEventListener("click", async (event) => {
    const button = event.target.closest("[data-ai-action]");
    if (!button) return;
    const action = button.dataset.aiAction;
    const currentDefinition = await definition();
    if (currentDefinition.capabilities?.preview === false && action === "preview") return;
    const previewWindow = action === "preview" ? window.open("about:blank", "_blank") : null;
    closeMenu();
    try {
      const current = await manifest();
      if (action === "preview") {
        if (!previewWindow) throw new Error(language === "en" ? "Allow pop-ups to open the preview" : "请允许弹出窗口后再打开预览");
        const receiveReady = (messageEvent) => {
          if (messageEvent.source !== previewWindow || messageEvent.data?.type !== "cellmotion:demo-ready") return;
          previewWindow.postMessage({ type: "cellmotion:demo-manifest", manifest: current }, location.origin);
          window.removeEventListener("message", receiveReady);
        };
        window.addEventListener("message", receiveReady);
        previewWindow.location.href = "typecascade-component-demo.html?live=1";
      }
      if (action === "prompt") await window.CellMotionAI.copyText(window.CellMotionAI.aiPrompt(current, language)).then(() => notify(words[language].copied));
      if (action === "code") await window.CellMotionAI.copyText(window.CellMotionAI.configuredCode(current)).then(() => notify(words[language].copied));
      if (action === "json") {
        window.CellMotionAI.downloadJson(current, `${slug}-component.json`);
        notify(words[language].downloaded);
      }
      if (action === "params") showParameters(await definition());
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      console.error(error);
      notify(language === "en" ? error.message : "生成失败：" + error.message);
    }
  });
  document.addEventListener("click", (event) => { if (!root.contains(event.target)) closeMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  dialog.querySelector("[data-ai-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  const onLanguageChange = (event) => {
    language = (event.detail?.language || document.body.dataset.editorLanguage) === "en" ? "en" : "zh";
    renderLanguage();
  };
  document.addEventListener("tc-languagechange", onLanguageChange);
  document.addEventListener("cellmotion:languagechange", onLanguageChange);
  renderLanguage();
  definition().then((def) => {
    if (def.capabilities?.preview === false) menu.querySelector('[data-ai-action="preview"]')?.remove();
  }).catch((error) => {
    console.error(error);
    root.remove();
  });
})();
