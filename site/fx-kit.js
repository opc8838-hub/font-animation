(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const lerp = (from, to, progress) => from + (to - from) * progress;
  const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
  const easeInOut = (value) => {
    const x = clamp01(value);
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  };
  const smoother = (value) => {
    const x = clamp01(value);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const graphemes = (value) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);
  const seeded = (seed) => {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const mixHex = (from, to, progress) => {
    const parse = (hex) => {
      const value = String(hex).replace("#", "");
      if (value.length < 6) return [255, 255, 255];
      return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
    };
    const a = parse(from);
    const b = parse(to);
    const t = clamp01(progress);
    return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
  };
  const formatSeconds = (seconds) => `${seconds < 1 ? Number(seconds).toFixed(2) : Number(seconds).toFixed(1)}秒`;
  const FONTS = {
    "snap-inter-medium": { family: "Continuation Inter", weight: 500 },
    "snap-inter-black": { family: "Continuation Inter", weight: 900 },
    "snap-ibm-plex": { family: "Continuation IBM Plex Mono", weight: 700 },
    "snap-space-mono": { family: "Continuation Space Mono", weight: 700 },
    "snap-space-grotesk": { family: "Continuation Space Grotesk", weight: 700 },
    "ib-archivo": { family: "CRArchivo", weight: 900 },
    "ib-roboto-condensed": { family: "CRRobotoCondensed", weight: 700 },
    "ib-work": { family: "CRWork", weight: 400 },
    "ib-lora": { family: "CRLora", weight: 400 },
    "ib-fenix": { family: "CRFenix", weight: 400 },
    "ib-vollkorn": { family: "CRVollkorn", weight: 700 },
    "ib-cairo": { family: "CRCairo", weight: 700 },
    "ib-aguafina": { family: "CRAguafina", weight: 400 },
    "ib-manrope": { family: "CRManrope", weight: 500 },
    "ib-spartan": { family: "CRSpartan", weight: 500 },
    "ib-cinzel": { family: "CRCinzel", weight: 500 },
    "ib-instrument": { family: "CRInstrument", weight: 400 },
    "ib-bebas": { family: "CRBebas", weight: 400 },
    "ib-poppins": { family: "CRPoppins", weight: 400 },
    "ib-rajdhani": { family: "CRRajdhani", weight: 700 },
    "ib-teko": { family: "CRTeko", weight: 500 },
    "ib-khand": { family: "CRKhand", weight: 400 },
    "ib-fraunces": { family: "CRFraunces", weight: 500 },
    "cn-noto-regular": { family: "Continuation SC", weight: 400 },
    "cn-noto-black": { family: "Continuation SC Black", weight: 900 },
    "ib-sc-thin": { family: "CRSCThin", weight: 200 },
    "ib-jp-thin": { family: "CRJPThin", weight: 200 },
    "ib-jp-black": { family: "CRJPBlack", weight: 900 },
    "ib-kr-black": { family: "CRKRBlack", weight: 900 }
  };
  function applyFont(ctx, key, px, weight) {
    const preset = FONTS[key] || FONTS["cn-noto-regular"];
    const w = weight || preset.weight;
    ctx.font = `${w} ${px}px "${preset.family}", "Continuation SC", "Noto Sans SC", sans-serif`;
    return preset;
  }
  function loadImages(urls) {
    return urls.map((url) => {
      const image = new Image();
      image.src = url;
      return image;
    });
  }

  function create(options) {
    const canvas = $("#flowCanvas");
    const frameCounter = $("#frameCounter");
    const exportStatus = $("#exportStatus");
    const fps = options.fps || 30;
    const prefix = options.filePrefix || "effect";
    let animationStart = performance.now();
    let pausedAt = 0;
    let paused = false;

    function currentTime() {
      return paused ? pausedAt : (performance.now() - animationStart) / 1000;
    }
    function setTime(time) {
      pausedAt = Math.max(0, time);
      animationStart = performance.now() - pausedAt * 1000;
    }
    function resizeCanvas() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, canvas.clientWidth || window.innerWidth);
      const height = Math.max(1, canvas.clientHeight || window.innerHeight);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.dataset.ratio = String(dpr);
      }
    }
    function paint(target, time, width, height, pixelRatio = 1) {
      const context = target.getContext("2d");
      const w = width ?? target.width / pixelRatio;
      const h = height ?? target.height / pixelRatio;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      try {
        options.renderFrame(context, time, w, h);
      } catch (error) {
        console.error(error);
      }
    }
    function previewLoop() {
      resizeCanvas();
      const ratio = Number(canvas.dataset.ratio || 1);
      const time = currentTime();
      paint(canvas, time, canvas.width / ratio, canvas.height / ratio, ratio);
      if (frameCounter) frameCounter.textContent = `F ${String(Math.round(mod(time, options.cycleLength()) * fps)).padStart(4, "0")}`;
      if (typeof options.onTick === "function") options.onTick(time, mod(time, options.cycleLength()));
      requestAnimationFrame(previewLoop);
    }
    function exportDimensions() {
      const preset = $("#exportPreset").value;
      if (preset === "current") return [Math.round(canvas.clientWidth), Math.round(canvas.clientHeight)];
      if (preset === "custom") return [Number($("#exportWidth").value), Number($("#exportHeight").value)];
      return preset.split("x").map(Number);
    }
    function makeExportCanvas() {
      const [width, height] = exportDimensions();
      const result = document.createElement("canvas");
      result.width = Math.max(240, Math.min(3840, width));
      result.height = Math.max(240, Math.min(3840, height));
      return result;
    }
    function downloadBlob(blob, filename) {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    const exportButtons = [$("#exportPng"), $("#exportGif"), $("#exportVideo"), $("#exportVerticalVideo")].filter(Boolean);
    function setExportBusy(busy, message) {
      exportButtons.forEach((button) => { button.disabled = busy; });
      if (exportStatus) exportStatus.textContent = message;
    }
    if ($("#exportPreset")) {
      $("#exportPreset").addEventListener("change", (event) => {
        if ($("#customSize")) $("#customSize").hidden = event.currentTarget.value !== "custom";
      });
    }
    if ($("#exportPng")) {
      $("#exportPng").addEventListener("click", () => {
        const output = makeExportCanvas();
        paint(output, currentTime(), output.width, output.height, 1);
        output.toBlob((blob) => {
          if (!blob) return;
          downloadBlob(blob, `${prefix}-${output.width}x${output.height}.png`);
          if (exportStatus) exportStatus.textContent = `PNG 已生成 · ${output.width} × ${output.height}`;
        }, "image/png");
      });
    }
    if ($("#exportGif")) {
      $("#exportGif").addEventListener("click", () => {
        if (!window.GIF) {
          if (exportStatus) exportStatus.textContent = "GIF 编码器未加载，请刷新后重试。";
          return;
        }
        const output = makeExportCanvas();
        const gifFps = 15;
        const duration = options.cycleLength();
        const frameTotal = Math.ceil(duration * gifFps);
        setExportBusy(true, `正在准备 GIF · 0 / ${frameTotal} 帧`);
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: output.width,
          height: output.height,
          workerScript: "js/continuation-gif.worker.js"
        });
        for (let frame = 0; frame < frameTotal; frame += 1) {
          paint(output, frame / gifFps, output.width, output.height, 1);
          gif.addFrame(output, { copy: true, delay: 1000 / gifFps });
        }
        gif.on("progress", (progress) => {
          if (exportStatus) exportStatus.textContent = `正在编码 GIF · ${Math.round(progress * 100)}%`;
        });
        gif.on("finished", (blob) => {
          downloadBlob(blob, `${prefix}-${output.width}x${output.height}.gif`);
          setExportBusy(false, "GIF 已生成");
        });
        gif.render();
      });
    }
    async function exportVideo(verticalHD) {
      if (!window.HME || typeof HME.createH264MP4Encoder !== "function") {
        setExportBusy(false, "MP4 编码器未加载，请刷新后重试。");
        return;
      }
      let width;
      let height;
      if (verticalHD) {
        width = 1080;
        height = 1920;
      } else {
        [width, height] = exportDimensions();
      }
      width = Math.max(240, Math.min(3840, Math.round(width / 2) * 2));
      height = Math.max(240, Math.min(3840, Math.round(height / 2) * 2));
      const output = document.createElement("canvas");
      output.width = width;
      output.height = height;
      const context = output.getContext("2d", { willReadFrequently: true });
      const duration = options.cycleLength();
      const frameCount = Math.max(1, Math.ceil(duration * fps));
      setExportBusy(true, `正在导出 MP4 ${width} × ${height} · 0%`);
      const encoder = await HME.createH264MP4Encoder();
      encoder.outputFilename = `${prefix}-${width}x${height}.mp4`;
      encoder.width = width;
      encoder.height = height;
      encoder.frameRate = fps;
      encoder.kbps = 20000;
      encoder.groupOfPictures = 15;
      encoder.initialize();
      try {
        for (let frame = 0; frame < frameCount; frame += 1) {
          paint(output, frame / fps, width, height, 1);
          encoder.addFrameRgba(context.getImageData(0, 0, width, height).data);
          if (frame % 2 === 0) {
            if (exportStatus) exportStatus.textContent = `正在导出 MP4 ${width} × ${height} · ${Math.round((frame + 1) / frameCount * 100)}%`;
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
        encoder.finalize();
        const bytes = encoder.FS.readFile(encoder.outputFilename);
        downloadBlob(new Blob([bytes], { type: "video/mp4" }), `${prefix}-${width}x${height}.mp4`);
        setExportBusy(false, `MP4 已生成 · ${width} × ${height} · ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
      } catch (error) {
        setExportBusy(false, `MP4 导出失败：${error.message || "编码器异常"}`);
      } finally {
        try { encoder.delete(); } catch (_) {}
      }
    }
    if ($("#exportVideo")) $("#exportVideo").addEventListener("click", () => exportVideo(false));
    if ($("#exportVerticalVideo")) $("#exportVerticalVideo").addEventListener("click", () => exportVideo(true));
    if ($("#restartButton")) $("#restartButton").addEventListener("click", () => setTime(0));
    if ($("#pauseButton")) {
      $("#pauseButton").addEventListener("click", (event) => {
        if (paused) {
          animationStart = performance.now() - pausedAt * 1000;
          paused = false;
          event.currentTarget.textContent = "暂停";
        } else {
          pausedAt = currentTime();
          paused = true;
          event.currentTarget.textContent = "继续";
        }
      });
    }
    if ($("#backButton")) {
      $("#backButton").addEventListener("click", () => {
        paused = true;
        setTime(currentTime() - 1 / fps);
        if ($("#pauseButton")) $("#pauseButton").textContent = "继续";
      });
    }
    if ($("#forwardButton")) {
      $("#forwardButton").addEventListener("click", () => {
        paused = true;
        setTime(currentTime() + 1 / fps);
        if ($("#pauseButton")) $("#pauseButton").textContent = "继续";
      });
    }
    document.querySelectorAll("input, textarea, select").forEach((field) => {
      field.addEventListener("input", () => {
        if (options.updateOutputs) options.updateOutputs();
      });
    });
    if (options.updateOutputs) options.updateOutputs();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTime(0));
    previewLoop();
    return { $, currentTime, setTime, paint };
  }

  window.FX = {
    $, clamp01, lerp, easeOutCubic, easeInOut, smoother, mod, graphemes, seeded, mixHex, formatSeconds, create,
    FONTS, applyFont, loadImages
  };
})();
