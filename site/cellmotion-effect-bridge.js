(() => {
  'use strict';
  const version = '1.0.0';
  function register(adapter) {
    const parent = window.parent;
    const origin = document.referrer ? new URL(document.referrer).origin : location.origin;
    const post = (type, detail = {}) => {
      if (parent !== window) parent.postMessage({ type, effectId: adapter.effectId, bridgeVersion: version, durationMs: adapter.durationMs(), ...detail }, origin);
    };
    let pending = Promise.resolve();
    window.CellMotionEffectBridge = { version, ...adapter };
    window.addEventListener('message', event => {
      const message = event.data;
      if (parent === window || event.source !== parent || event.origin !== origin || typeof message?.type !== 'string' || !message.type.startsWith('cellmotion:')) return;
      if (message.bridgeVersion && message.bridgeVersion !== version) return;
      if (message.manifest?.effect?.id && message.manifest.effect.id !== adapter.effectId) return;
      pending = pending.then(async () => {
        if (message.type === 'cellmotion:configure') {
          await adapter.applyScheme(message.manifest?.composition || message.composition, message.manifest?.presentation || {});
          post('cellmotion:duration');
        } else if (message.type === 'cellmotion:request-duration') post('cellmotion:duration');
        else if (message.type === 'cellmotion:seek') adapter.seek(Number(message.seconds) || 0);
        else if (['play', 'pause', 'restart'].includes(message.type.slice(11))) adapter[message.type.slice(11)]();
      }).catch(error => post('cellmotion:error', { message: error.message }));
    });
    post('cellmotion:ready');
  }
  window.CellMotionBridge = { register };
})();
