/* Public media editing needs a secure context for WebCodecs and clipboard APIs. */
(() => {
  const demo=location.pathname.endsWith('/typecascade-component-demo.html');
  const videoCompare=!demo||new URLSearchParams(location.search).get('effect')==='video-compare';
  if (videoCompare && location.hostname === 'cellmotion.cn' && location.protocol === 'http:') {
    const target = new URL(location.href);target.protocol = 'https:';location.replace(target.href);
  }
})();
