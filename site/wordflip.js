(() => {
  "use strict";

  const { $, clamp01, lerp, formatSeconds } = FX;
  const FPS = 30;
  const TYPE_START = 4;
  const CHAR_FADE = 6;
  const JITTER = 0.18;
  const EXIT_Y = -1.29;
  const ENTER_Y = 0.135;
  const ROTATE = 90;
  const MOTION_SCALE = 0.98;
  const BLUR_EM = 0.085;
  const DEFAULT_PREFIX = "我想做一套";
  const DEFAULT_WORDS = "干净 锋利 温柔";
  const DEFAULT_SUFFIX = "封面";
  const DEFAULT_FROM = "#2a8bf5";
  const DEFAULT_TO = "#e11d48";

  let wordColors = [];

  function bezier(x1, y1, x2, y2) {
    return (x) => {
      let t = clamp01(x);
      for (let i = 0; i < 8; i += 1) {
        const u = 1 - t;
        const xEst = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
        const dx = 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2);
        if (Math.abs(dx) < 1e-6) break;
        t = clamp01(t - (xEst - x) / dx);
      }
      const u = 1 - t;
      return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    };
  }
  const ENTER_EASE = bezier(0.2, 0.6, 0.35, 1);

  function speed() { return Math.max(0.4, Number($("#speed").value) / 100); }
  function prefixText() { return $("#prefix").value || ""; }
  function suffixText() { return $("#suffix").value || ""; }
  function wordList() {
    const items = ($("#words").value || DEFAULT_WORDS).trim().split(/\s+/).filter(Boolean);
    return items.length ? items : ["干净"];
  }
  function prefixChars() { return FX.graphemes(prefixText()); }
  function suffixChars() { return FX.graphemes(suffixText()); }
  function allTypeChars() { return prefixChars().concat(suffixChars()); }
  function num(id, fallback) {
    const node = $(id);
    return node ? Number(node.value) : fallback;
  }
  function pauseFrames() { return Math.max(0, num("#pause", 6)); }
  function cycleFrames() { return Math.max(8, num("#cycle", 35)); }
  function exitFrames() { return Math.max(2, num("#exitDuration", 9)); }
  function enterFrames() { return Math.max(2, num("#enterDuration", 9)); }
  function overlapFrames() { return Math.max(0, Math.min(exitFrames() - 1, num("#overlap", 3))); }
  function perspectiveEm() { return Math.max(2, num("#perspective", 65) / 10); }

  function framesPerChar(cps) { return FPS / Math.max(0.001, cps); }
  function keystrokeOffset(index, jitter) {
    if (jitter <= 0) return 0;
    const w = Math.sin(index * 12.9898) * 0.6 + Math.sin(index * 4.1414) * 0.4;
    return w * jitter;
  }
  function charStartFrame(index, cps) {
    const per = framesPerChar(cps);
    return TYPE_START + index * per + keystrokeOffset(index, JITTER) * per;
  }
  function typingEndFrame() {
    const chars = allTypeChars();
    const cps = Math.max(3, num("#cps", 9));
    if (!chars.length) return TYPE_START + pauseFrames();
    return charStartFrame(chars.length - 1, cps) + CHAR_FADE;
  }
  function flipStartFrame(i) {
    return typingEndFrame() + pauseFrames() + i * cycleFrames();
  }
  function wordAt(frame) {
    const first = flipStartFrame(0);
    const count = wordList().length;
    if (frame < first) return { index: 0, local: frame - first };
    const n = Math.floor((frame - first) / cycleFrames());
    const local = frame - first - n * cycleFrames();
    const index = ((n % count) + count) % count;
    return { index, local };
  }
  function easeInBack(t, s = 1.70158) {
    return t * t * ((s + 1) * t - s);
  }
  function easeInBackSpeed(t, s = 1.70158) {
    const d = 3 * (s + 1) * t * t - 2 * s * t;
    const peak = 3 * (s + 1) - 2 * s;
    return Math.abs(d) / peak;
  }
  function interp(frame, fromFrame, toFrame, from, to, easing) {
    const p = clamp01((frame - fromFrame) / Math.max(0.0001, toFrame - fromFrame));
    return lerp(from, to, easing ? easing(p) : p);
  }
  function fitScales(widths) {
    const max = Math.max(...widths, 1);
    return widths.map((w) => (w > 0 ? max / w : 1));
  }

  function syncWordColors() {
    const words = wordList();
    wordColors = words.map((_, i) => {
      const prev = wordColors[i];
      return {
        from: prev?.from || DEFAULT_FROM,
        to: prev?.to || DEFAULT_TO
      };
    });
  }

  function measureTracked(ctx, text, tracking) {
    const chars = FX.graphemes(text);
    if (!chars.length) return 0;
    let width = 0;
    chars.forEach((ch, i) => {
      width += ctx.measureText(ch).width;
      if (i < chars.length - 1) width += tracking;
    });
    return width;
  }

  function drawTracked(ctx, chars, x, y, tracking, opacityAt) {
    let cursor = x;
    chars.forEach((ch, i) => {
      const alpha = opacityAt ? opacityAt(i) : 1;
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillText(ch, cursor, y);
        ctx.restore();
      }
      cursor += ctx.measureText(ch).width + tracking;
    });
    return cursor;
  }

  function charOpacity(frame, index, cps) {
    const start = charStartFrame(index, cps);
    return interp(frame, start, start + CHAR_FADE, 0, 1);
  }

  function exitAt(local, em) {
    const t = clamp01(local / exitFrames());
    const p = easeInBack(t);
    return {
      y: p * EXIT_Y * em,
      rotate: p * ROTATE,
      scale: 1 + p * (MOTION_SCALE - 1),
      blur: easeInBackSpeed(t) * BLUR_EM * em,
      opacity: interp(t, 0.65, 1, 1, 0)
    };
  }

  function enterAt(local, em) {
    const start = Math.max(0, exitFrames() - overlapFrames());
    const p = interp(local, start, start + enterFrames(), 0, 1, ENTER_EASE);
    return {
      y: (1 - p) * ENTER_Y * em,
      rotate: -(1 - p) * ROTATE,
      scale: MOTION_SCALE + p * (1 - MOTION_SCALE),
      blur: (1 - p) * BLUR_EM * em,
      opacity: interp(p, 0, 0.45, 0, 1)
    };
  }

  function stateFor(i, entering, local, em) {
    const outgoing = entering - 1;
    const enterStart = Math.max(0, exitFrames() - overlapFrames());
    if (i === entering && local >= enterStart) return enterAt(local, em);
    if (i === outgoing && local >= 0 && local <= exitFrames()) return exitAt(local, em);
    if (i === entering && local > exitFrames()) return enterAt(local, em);
    if (i === entering && local < 0) return { y: 0, rotate: 0, scale: 1, blur: 0, opacity: 0 };
    return null;
  }

  function loopFrames() {
    return flipStartFrame(wordList().length) + 8;
  }
  function cycleLength() {
    return loopFrames() / FPS / speed();
  }

  function choreoBeats() {
    const prefix = prefixChars();
    const suffix = suffixChars();
    const cps = Math.max(3, num("#cps", 9));
    const beats = [];
    const prefixEnd = prefix.length ? charStartFrame(prefix.length - 1, cps) + CHAR_FADE : TYPE_START;
    const typeEnd = typingEndFrame();
    if (prefix.length) beats.push({ id: "prefix", label: "1. 打前半句", start: 0, end: prefixEnd, kind: "type" });
    if (suffix.length) beats.push({ id: "suffix", label: "2. 打后半句", start: prefixEnd, end: typeEnd, kind: "type" });
    const holdEnd = typeEnd + pauseFrames();
    beats.push({ id: "hold", label: `${beats.length + 1}. 停住`, start: typeEnd, end: holdEnd, kind: "hold" });
    wordList().forEach((word, i) => {
      const start = flipStartFrame(i);
      beats.push({
        id: `flip-${i}`,
        label: `${beats.length + 1}. 翻入 ${word}`,
        start,
        end: start + cycleFrames(),
        kind: "flip"
      });
    });
    return beats;
  }

  function renderChoreoTrack() {
    const bar = $("#choreoBar");
    if (!bar) return;
    const beats = choreoBeats();
    const total = Math.max(1, loopFrames());
    bar.innerHTML = beats.map((beat, index) => {
      const width = Math.max(10, (beat.end - beat.start) / total * 100);
      return `<div class="flip-beat-block is-${beat.kind}" data-start="${beat.start}" role="button" tabindex="0" style="width:${width}%"><em>${index + 1}</em><strong>${beat.label.replace(/^\d+\.\s/, "")}</strong><small>${formatSeconds((beat.end - beat.start) / FPS)}</small></div>`;
    }).join("") + `<div class="wordflip-playhead" id="choreoPlayhead"></div>`;
    bar.querySelectorAll(".flip-beat-block").forEach((block) => {
      block.addEventListener("click", () => {
        if (player) player.setTime(Number(block.dataset.start) / FPS / speed());
      });
    });
  }

  function renderWordColorList() {
    const host = $("#wordColorList");
    if (!host) return;
    syncWordColors();
    host.innerHTML = wordList().map((word, i) => {
      const color = wordColors[i];
      return `<div class="flip-word-card">
        <div class="flip-word-head"><b>${i + 1}. ${word}</b><small>槽位词</small></div>
        <label class="word-color">左色<input data-word="${i}" data-key="from" type="color" value="${color.from}"></label>
        <label class="word-color">右色<input data-word="${i}" data-key="to" type="color" value="${color.to}"></label>
      </div>`;
    }).join("");
    host.querySelectorAll("input[type=color]").forEach((input) => {
      input.addEventListener("input", () => {
        const i = Number(input.dataset.word);
        if (!wordColors[i]) return;
        wordColors[i][input.dataset.key] = input.value;
      });
    });
  }

  function drawFlipWord(ctx, word, x, baseline, em, state, fit, from, to, tracking) {
    if (!state || state.opacity <= 0.001) return;
    ctx.save();
    ctx.translate(x, baseline);
    ctx.translate(0, state.y);
    const rad = state.rotate * Math.PI / 180;
    const persp = perspectiveEm() * em;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const proj = persp / Math.max(1, persp - sin * em * 0.35);
    ctx.scale(fit * state.scale * proj, fit * state.scale * Math.max(0.001, Math.abs(cos)) * proj);
    ctx.globalAlpha *= state.opacity;
    if (state.blur > 0.01) ctx.filter = `blur(${state.blur}px)`;
    const width = Math.max(1, measureTracked(ctx, word, tracking));
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.fillStyle = gradient;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    drawTracked(ctx, FX.graphemes(word), 0, 0, tracking);
    ctx.restore();
  }

  function renderFrame(ctx, time, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = $("#backgroundColor").value;
    ctx.fillRect(0, 0, w, h);

    const em = Math.max(18, num("#fontSize", 72));
    const tracking = num("#tracking", -20) / 1000 * em;
    const words = wordList();
    FX.applyFont(ctx, $("#fontFamily").value, em, Number($("#fontWeight").value));
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    const prefixW = measureTracked(ctx, prefixText(), tracking);
    const suffixW = measureTracked(ctx, suffixText(), tracking);
    const widths = words.map((word) => measureTracked(ctx, word, tracking));
    const scales = fitScales(widths);
    const slot = Math.max(...widths, em * 0.4);
    const space = ctx.measureText(" ").width;
    const total = prefixW + space + slot + space + suffixW;
    const fit = Math.min(1, (w * 0.88) / Math.max(1, total));
    const frame = (time * FPS * speed());
    const cps = Math.max(3, num("#cps", 9));
    const { index: entering, local } = wordAt(frame);
    const typingEnd = typingEndFrame();
    const caretOn = $("#caret") && $("#caret").checked;
    const caretDone = frame > typingEnd + pauseFrames();
    const caretIndex = Math.max(0, Math.min(allTypeChars().length, Math.floor((frame - TYPE_START) / framesPerChar(cps)) + 1));
    const showCaret = caretOn && !caretDone && frame >= TYPE_START;
    const blink = Math.floor((frame / FPS) * 2) % 2 === 0 ? 1 : 0.15;
    const prefix = prefixChars();
    const suffix = suffixChars();

    ctx.save();
    ctx.translate(w / 2, h / 2 + em * 0.18);
    ctx.scale(fit, fit);
    ctx.translate(-total / 2, 0);
    ctx.fillStyle = $("#textColor").value;

    const drawCaret = (x) => {
      if (!showCaret) return;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.fillStyle = $("#textColor").value;
      ctx.fillRect(x + 0.06 * em, -0.78 * em, Math.max(2, 0.055 * em), 0.78 * em);
      ctx.restore();
    };

    let x = 0;
    prefix.forEach((ch, i) => {
      const alpha = charOpacity(frame, i, cps);
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillText(ch, x, 0);
        ctx.restore();
      }
      x += ctx.measureText(ch).width + tracking;
      if (showCaret && caretIndex === i + 1 && caretIndex <= prefix.length) drawCaret(x);
    });
    if (showCaret && caretIndex === 0 && prefix.length) drawCaret(0);
    x = prefixW;
    x += space;

    words.forEach((word, i) => {
      const state = stateFor(i, entering, local, em);
      const color = wordColors[i] || { from: DEFAULT_FROM, to: DEFAULT_TO };
      drawFlipWord(ctx, word, x, 0, em, state, scales[i], color.from, color.to, tracking);
    });
    x += slot + space;

    suffix.forEach((ch, i) => {
      const index = prefix.length + i;
      const alpha = charOpacity(frame, index, cps);
      if (alpha > 0.001) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillText(ch, x, 0);
        ctx.restore();
      }
      x += ctx.measureText(ch).width + tracking;
      if (showCaret && caretIndex === index + 1 && caretIndex > prefix.length) drawCaret(x);
    });
    ctx.restore();
  }

  function collectState() {
    return {
      version: 1,
      prefix: $("#prefix").value,
      words: $("#words").value,
      suffix: $("#suffix").value,
      fontFamily: $("#fontFamily").value,
      fontWeight: $("#fontWeight").value,
      backgroundColor: $("#backgroundColor").value,
      textColor: $("#textColor").value,
      cps: $("#cps").value,
      pause: $("#pause").value,
      cycle: $("#cycle").value,
      exitDuration: $("#exitDuration").value,
      enterDuration: $("#enterDuration").value,
      overlap: $("#overlap").value,
      perspective: $("#perspective").value,
      tracking: $("#tracking").value,
      fontSize: $("#fontSize").value,
      speed: $("#speed").value,
      caret: $("#caret").checked,
      wordColors
    };
  }

  function applyState(state) {
    if (!state || typeof state !== "object") return;
    ["prefix", "words", "suffix", "fontFamily", "fontWeight", "backgroundColor", "textColor", "cps", "pause", "cycle", "exitDuration", "enterDuration", "overlap", "perspective", "tracking", "fontSize", "speed"].forEach((key) => {
      if (state[key] != null && $(`#${key}`)) $(`#${key}`).value = state[key];
    });
    if ($("#caret") && state.caret != null) $("#caret").checked = !!state.caret;
    if (Array.isArray(state.wordColors)) wordColors = state.wordColors;
    syncWordColors();
    renderWordColorList();
    renderChoreoTrack();
    if (player) player.setTime(0);
  }

  const player = FX.create({
    filePrefix: "wordflip",
    cycleLength,
    onTick(_time, local) {
      const beatLabel = $("#choreoBeat");
      const head = $("#choreoPlayhead");
      const frame = local * FPS * speed();
      const beats = choreoBeats();
      const current = beats.find((beat) => frame >= beat.start && frame < beat.end) || beats[beats.length - 1];
      if (beatLabel && current) beatLabel.textContent = current.label;
      if (head) head.style.left = `${(frame / Math.max(1, loopFrames())) * 100}%`;
      document.querySelectorAll(".flip-beat-block").forEach((block, index) => {
        block.classList.toggle("is-active", beats[index] && beats[index].id === current?.id);
      });
    },
    updateOutputs() {
      const set = (id, value) => { const node = $(id); if (node) node.textContent = value; };
      set("#cpsOut", `${$("#cps").value} 字/秒`);
      set("#pauseOut", formatSeconds(pauseFrames() / FPS));
      set("#cycleOut", formatSeconds(cycleFrames() / FPS));
      set("#exitOut", formatSeconds(exitFrames() / FPS));
      set("#enterOut", formatSeconds(enterFrames() / FPS));
      set("#overlapOut", `${overlapFrames()} 帧`);
      set("#perspectiveOut", `${perspectiveEm().toFixed(1)}em`);
      set("#trackingOut", `${(num("#tracking", -20) / 1000).toFixed(3)}em`);
      set("#fontSizeOut", $("#fontSize").value);
      set("#speedOut", `${speed().toFixed(2)}×`);
    },
    renderFrame
  });

  ["#prefix", "#words", "#suffix"].forEach((id) => {
    $(id).addEventListener("input", () => {
      syncWordColors();
      renderWordColorList();
      renderChoreoTrack();
    });
  });
  ["#cps", "#pause", "#cycle", "#exitDuration", "#enterDuration", "#overlap"].forEach((id) => {
    if ($(id)) $(id).addEventListener("input", () => renderChoreoTrack());
  });
  $("#saveButton").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(collectState(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wordflip-scheme.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    localStorage.setItem("wordflip-scheme", JSON.stringify(collectState()));
    const status = $("#exportStatus");
    if (status) status.textContent = "方案已保存到本机，并下载了 JSON。";
  });
  $("#importFile").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    event.currentTarget.value = "";
    if (!file) return;
    applyState(JSON.parse(await file.text()));
  });
  $("#clearButton").addEventListener("click", () => {
    localStorage.removeItem("wordflip-scheme");
    $("#prefix").value = DEFAULT_PREFIX;
    $("#words").value = DEFAULT_WORDS;
    $("#suffix").value = DEFAULT_SUFFIX;
    wordColors = [];
    syncWordColors();
    renderWordColorList();
    renderChoreoTrack();
    if (player) player.setTime(0);
  });

  try {
    const saved = localStorage.getItem("wordflip-scheme");
    if (saved) applyState(JSON.parse(saved));
  } catch (_) {}

  syncWordColors();
  renderWordColorList();
  renderChoreoTrack();
})();
