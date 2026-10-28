/* Scene background runtime. Uses the Morph Ports media shape and shared GIF clock. */
(() => {
  'use strict';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function normalize(media) {
    if (!media?.url) return null;
    return { ...media, name: String(media.name || 'Background'), url: String(media.url), fileType: String(media.fileType || 'image/png'),
      videoStart: Math.max(0, Number(media.videoStart) || 0), videoEnd: Number(media.videoEnd) > 0 ? Number(media.videoEnd) : null,
      cropX: clamp(Number.isFinite(media.cropX) ? media.cropX : .5, 0, 1), cropY: clamp(Number.isFinite(media.cropY) ? media.cropY : .5, 0, 1), cropZoom: clamp(Number(media.cropZoom) || 1, 1, 4) };
  }
  const isVideo = media => /^video\//i.test(media?.fileType || '');
  function clip(media, duration) {
    const endLimit = Math.max(.01, duration);
    const start = clamp(Number(media?.videoStart) || 0, 0, Math.max(0, endLimit - .05));
    const end = clamp(Number(media?.videoEnd) || endLimit, Math.min(endLimit, start + .05), endLimit);
    return { start, end, duration: Math.max(.01, end - start) };
  }
  async function loadVideo(url) {
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Cannot decode background video')), { once: true });
      video.src = url; video.load();
    });
    return video;
  }
  async function seek(video, at) {
    const target = clamp(at, 0, Math.max(0, video.duration - .001));
    if (!video.seeking && Math.abs(video.currentTime - target) < 1 / 1000) return;
    await new Promise((resolve, reject) => {
      const finish = () => { clearTimeout(timer); video.removeEventListener('seeked', finish); resolve(); };
      const timer = setTimeout(() => { video.removeEventListener('seeked', finish); reject(new Error('Background video seek timed out')); }, 5000);
      video.addEventListener('seeked', finish); video.currentTime = target;
    });
  }
  function dispose(runtime) {
    if (runtime?.resource) window.CellMotionAnimatedImage.dispose(runtime.resource);
    if (runtime?.video) { runtime.video.pause(); runtime.video.removeAttribute('src'); runtime.video.load(); }
    runtime?.image?.close?.();
  }
  function create() {
    let current = null, request = 0, pending = Promise.resolve();
    async function setMedia(media) {
      const id = ++request;
      if (!media) { dispose(current); current = null; return; }
      if (current?.url === media.url) return;
      const next = { url: media.url, fileType: media.fileType, image: null, resource: null, video: null, duration: 0 };
      try {
        if (isVideo(media)) { next.video = await loadVideo(media.url); next.duration = next.video.duration; }
        else if (/gif/i.test(media.fileType)) {
          next.resource = await window.CellMotionAnimatedImage.decode({ url: media.url, type: media.fileType });
          if (!next.resource?.frames?.length) { next.image = new Image(); next.image.src = media.url; await next.image.decode(); }
        } else { next.image = new Image(); next.image.crossOrigin = 'anonymous'; next.image.src = media.url; await next.image.decode(); }
        if (id !== request) { dispose(next); return; }
        dispose(current); current = next;
      } catch (error) { dispose(next); throw error; }
    }
    async function prepare(time, media) {
      const runtime = current;
      if (!runtime || !media || runtime.url !== media.url) return;
      if (!runtime.video) { runtime.frame = runtime.resource ? window.CellMotionAnimatedImage.frameAt(runtime.resource, time) || runtime.image : runtime.image; return; }
      const bounds = clip(media, runtime.duration);
      const target = bounds.start + ((time % bounds.duration) + bounds.duration) % bounds.duration;
      pending = pending.catch(() => {}).then(async () => {
        await seek(runtime.video, target);
        if (runtime !== current) return;
        const frame = runtime.frame || document.createElement('canvas');
        if (frame.width !== runtime.video.videoWidth || frame.height !== runtime.video.videoHeight) { frame.width = runtime.video.videoWidth; frame.height = runtime.video.videoHeight; }
        frame.getContext('2d').drawImage(runtime.video, 0, 0); runtime.frame = frame;
      });
      await pending;
    }
    function draw(ctx, width, height, media) {
      const image = current?.frame || current?.image;
      if (!media || !image || current.url !== media.url) return;
      const sourceWidth = image.width || image.naturalWidth, sourceHeight = image.height || image.naturalHeight;
      const scale = Math.max(width / sourceWidth, height / sourceHeight) * (media.cropZoom || 1);
      const w = sourceWidth * scale, h = sourceHeight * scale;
      ctx.drawImage(image, -(w - width) * (media.cropX ?? .5), -(h - height) * (media.cropY ?? .5), w, h);
    }
    async function filmstrip() {
      if (!current?.video) return null;
      const runtime = current;
      if (runtime.filmstrip) return runtime.filmstrip;
      const video = await loadVideo(runtime.url), canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      try {
        for (let i = 0; i < 8; i++) {
          await seek(video, video.duration * (i + .5) / 8);
          const scale = Math.max(90 / video.videoWidth, 96 / video.videoHeight), w = video.videoWidth * scale, h = video.videoHeight * scale;
          ctx.save(); ctx.beginPath(); ctx.rect(i * 90, 0, 90, 96); ctx.clip(); ctx.drawImage(video, i * 90 + (90 - w) / 2, (96 - h) / 2, w, h); ctx.restore();
        }
        runtime.filmstrip = canvas; return canvas;
      } finally { video.pause(); video.removeAttribute('src'); video.load(); }
    }
    return { setMedia, prepare, draw, filmstrip, get duration() { return current?.duration || 0; }, get video() { return !!current?.video; }, dispose: () => { request++; dispose(current); current = null; } };
  }
  window.CellMotionBackgroundMedia = Object.freeze({ normalize, clip, isVideo, create });
})();
