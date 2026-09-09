(() => {
  "use strict";

  if (!document.body.classList.contains("tc-workspace")) return;
  const slug = document.body.dataset.morphPort;
  if (!slug || slug === "typecascade") return;
  const header = document.querySelector(".tc-header");
  const exportButton = header?.querySelector(".tc-export-shortcut");
  if (!header || !exportButton || !window.CellMotionAI) return;

  let language = localStorage.getItem("cellmotion-language") === "en" ? "en" : "zh";
  let definitionPromise;
  const title = document.querySelector(".tc-header h1")?.childNodes[0]?.textContent?.trim() || slug;
  const words = {
    zh: {
      trigger: "用于 AI", preview: "预览 AI 组件", prompt: "复制 AI 提示词", code: "复制配置代码",
      json: "下载组件 JSON", params: "查看参数说明", copied: "已复制，可直接交给 AI",
      downloaded: "组件 JSON 已下载", title: `${title} · AI 参数说明`, close: "关闭",
      global: "全局", effect: "动效", row: "逐段"
    },
    en: {
      trigger: "For AI", preview: "Preview AI component", prompt: "Copy AI prompt", code: "Copy configured code",
      json: "Download component JSON", params: "View parameter guide", copied: "Copied — ready for AI",
      downloaded: "Component JSON downloaded", title: `${title} · AI parameters`, close: "Close",
      global: "Global", effect: "Effect", row: "Per row"
    }
  };

  const root = document.createElement("div");
  root.className = "tc-ai-actions";
  root.innerHTML = '<button class="tc-ai-trigger" type="button" aria-haspopup="menu" aria-expanded="false"><span></span><b aria-hidden="true"></b></button><div class="tc-ai-menu" role="menu" hidden><button type="button" data-ai-action="prompt"></button><button type="button" data-ai-action="code"></button><button type="button" data-ai-action="json"></button><i></i><button type="button" data-ai-action="params"></button></div>';
  header.insertBefore(root, exportButton);
  const trigger = root.querySelector(".tc-ai-trigger");
  const menu = root.querySelector(".tc-ai-menu");
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
  function definition() {
    definitionPromise ||= fetch(`effects/${slug}.component.json`).then((response) => {
      if (!response.ok) throw new Error("AI component definition unavailable");
      return response.json();
    });
    return definitionPromise;
  }
  async function manifest() {
    const bridge = window.CellMotionEffectBridge;
    if (!bridge?.getScheme) throw new Error("Editor runtime bridge unavailable");
    return window.CellMotionAI.createManifest({ definition: await definition(), scheme: bridge.getScheme(), baseUrl: document.baseURI });
  }
  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }
  function renderLanguage() {
    const t = words[language];
    trigger.querySelector("span").textContent = t.trigger;
    root.querySelector('[data-ai-action="prompt"]').textContent = t.prompt;
    root.querySelector('[data-ai-action="code"]').textContent = t.code;
    root.querySelector('[data-ai-action="json"]').textContent = t.json;
    root.querySelector('[data-ai-action="params"]').textContent = t.params;
  }
  function showParameters(def) {
    const t = words[language];
    dialog.querySelector("h2").textContent = t.title;
    dialog.querySelector(".tc-ai-summary").textContent = def.behavior?.summary?.[language] || "";
    const grouped = (def.parameters || []).reduce((result, item) => {
      (result[item.scope || "effect"] ||= []).push(item);
      return result;
    }, {});
    dialog.querySelector(".tc-ai-params").innerHTML = ["global", "effect", "row"]
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
  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-ai-action]");
    if (!button) return;
    const action = button.dataset.aiAction;
    closeMenu();
    try {
      const current = await manifest();
      if (action === "prompt") await window.CellMotionAI.copyText(window.CellMotionAI.aiPrompt(current, language)).then(() => notify(words[language].copied));
      if (action === "code") await window.CellMotionAI.copyText(window.CellMotionAI.configuredCode(current)).then(() => notify(words[language].copied));
      if (action === "json") {
        window.CellMotionAI.downloadJson(current, `${slug}-component.json`);
        notify(words[language].downloaded);
      }
      if (action === "params") showParameters(await definition());
    } catch (error) {
      console.error(error);
      notify(language === "en" ? error.message : "生成失败：" + error.message);
    }
  });
  document.addEventListener("click", (event) => { if (!root.contains(event.target)) closeMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  dialog.querySelector("[data-ai-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  document.addEventListener("tc-languagechange", (event) => {
    language = event.detail?.language === "en" ? "en" : "zh";
    renderLanguage();
  });
  renderLanguage();
})();
