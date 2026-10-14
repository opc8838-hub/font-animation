importScripts('typepour-fluid.js?v=1');
self.onmessage = function (event) {
  const { Liquid, DURATION, FPS } = self.TypePourFluid;
  const liquid = new Liquid(event.data), frames = [liquid.snapshot()];
  for (let i = 1; i <= DURATION * FPS; i++) {
    liquid.step(); liquid.step(); frames.push(liquid.snapshot());
    if (i % 60 === 0) self.postMessage({ progress: i / (DURATION * FPS) });
  }
  self.postMessage({ frames }, frames.map(frame => frame.buffer));
};
