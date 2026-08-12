(() => {
  "use strict";

  const panel = document.querySelector(".control-panel, .prism-panel");
  const header = panel?.querySelector(":scope > summary, .prism-panel__header");
  if (panel instanceof HTMLDetailsElement) panel.open = true;
  if (header && !header.querySelector(".me-editor-back")) {
    const back = document.createElement("a");
    back.className = "me-editor-back";
    back.href = "gallery.html";
    back.setAttribute("aria-label", "返回效果库");
    back.textContent = "‹";
    back.addEventListener("click", (event) => event.stopPropagation());
    header.prepend(back);
  }

  const stage = document.querySelector(".stage-shell, .current-stage, #prism-canvas");
  if (stage && "ResizeObserver" in window) {
    new ResizeObserver(() => window.dispatchEvent(new Event("resize"))).observe(stage);
  }
})();
