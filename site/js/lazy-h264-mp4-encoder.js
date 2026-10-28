(() => {
  if (window.HME?.createH264MP4Encoder) return;
  const source = new URL('h264-mp4-encoder.web.js', document.currentScript.src).href;
  let pending;
  const proxy = { async createH264MP4Encoder(...args) {
    if (!pending) pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = () => window.HME !== proxy && window.HME?.createH264MP4Encoder ? resolve(window.HME) : reject(new Error('MP4 encoder unavailable'));
      script.onerror = () => { script.remove(); pending = null; reject(new Error('MP4 encoder download failed; please retry')); };
      document.head.append(script);
    });
    const encoder = await pending;
    return encoder.createH264MP4Encoder(...args);
  } };
  window.HME = proxy;
})();
