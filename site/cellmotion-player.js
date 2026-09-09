(() => {
  "use strict";

  class CellMotionPlayer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._manifest = null;
      this._ready = false;
      this._durationMs = 0;
      this._onMessage = this._onMessage.bind(this);
      this.shadowRoot.innerHTML = `<style>:host{display:block;position:relative;overflow:hidden;border-radius:inherit;background:#f6f6f8}iframe{display:block;width:100%;height:100%;border:0;background:transparent}</style><iframe title="CellMotion animation" loading="eager" allow="autoplay"></iframe>`;
      this.iframe = this.shadowRoot.querySelector("iframe");
    }

    connectedCallback() {
      window.addEventListener("message", this._onMessage);
      this._mount();
    }

    disconnectedCallback() { window.removeEventListener("message", this._onMessage); }
    set manifest(value) { this._manifest = value; this._mount(); }
    get manifest() { return this._manifest; }
    get duration() { return this._durationMs / 1000; }

    _mount() {
      if (!this.isConnected || !this._manifest?.runtime?.entry) return;
      const canvas = this._manifest.composition?.canvas || {};
      const width = Number(canvas.width) || 1080;
      const height = Number(canvas.height) || 1080;
      this.style.aspectRatio = `${width} / ${height}`;
      const entry = new URL(this._manifest.runtime.entry, document.baseURI);
      entry.searchParams.set("preview", "1");
      entry.searchParams.set("embed", "1");
      if (this.iframe.src !== entry.href) {
        this._ready = false;
        this.iframe.src = entry.href;
      } else if (this._ready) this._post("cellmotion:configure", { manifest: this._manifest });
    }

    _onMessage(event) {
      if (event.source !== this.iframe.contentWindow) return;
      if (event.data?.type === "cellmotion:duration") {
        this._setDuration(event.data.durationMs);
        return;
      }
      if (event.data?.type !== "cellmotion:ready") return;
      this._ready = true;
      this._setDuration(event.data.durationMs);
      this._post("cellmotion:configure", { manifest: this._manifest });
      this.dispatchEvent(new CustomEvent("cellmotion-ready", { detail: { duration: this.duration } }));
    }

    _setDuration(value) {
      const next = Math.max(0, Number(value) || 0);
      if (next === this._durationMs) return;
      this._durationMs = next;
      this.dispatchEvent(new CustomEvent("cellmotion-durationchange", { detail: { duration: this.duration } }));
    }

    _post(type, detail = {}) { this.iframe.contentWindow?.postMessage({ type, ...detail }, "*"); }
    play() { this._post("cellmotion:play"); }
    pause() { this._post("cellmotion:pause"); }
    restart() { this._post("cellmotion:restart"); }
    seek(seconds) { this._post("cellmotion:seek", { seconds: Number(seconds) || 0 }); }
    update(composition) {
      if (!this._manifest) return;
      this.manifest = { ...this._manifest, composition };
    }
  }

  if (!customElements.get("cellmotion-player")) customElements.define("cellmotion-player", CellMotionPlayer);
})();
