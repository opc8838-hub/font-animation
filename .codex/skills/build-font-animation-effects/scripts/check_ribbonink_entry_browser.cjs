/* Invoke this exported function with the current Playwright page. */
module.exports = async function checkRibbonEntry(page) {
  return page.evaluate(async () => {
    const saved = RibbonInk.schemeData(), failures = [], canvas = document.createElement('canvas');
    let configurations = 0;
    const set = (id, value) => { document.querySelector(`#${id}`).value = String(value); };
    const inkAt = (data, width, x, y) => {
      const i = (y * width + x) * 4;
      return data[i] > 70 && data[i + 2] > 90 && data[i + 1] < 180;
    };
    try {
      set('sequenceMode', 'double'); set('textInput', ''); set('page2Text', ''); set('positionY', 52);
      set('inkColor1', '#f34bd9'); set('inkColor2', '#a40de4'); set('inkColor3', '#ff78e9');
      set('inkColor4', '#7827d8'); set('inkColor5', '#f33ccd');
      RibbonInk.setPaused(true);
      // The prepended ink must carry the old cropped edge through a composition
      // boundary for every editor extreme, regardless of canvas aspect.
      for (const [w, h] of [[640, 360], [640, 640], [360, 640]]) {
        for (const scale of [55, 100, 150]) for (const position of [8, 50, 92]) for (const thickness of [55, 160]) {
          set('brushScale', scale); set('brushWidth', thickness); set('positionX', position);
          RibbonInk.renderFrame(canvas, .92, w, h);
          const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, w, h).data, edge = [];
          for (let x = 0; x < w; x++) edge.push([x, 1], [x, h - 2]);
          for (let y = 0; y < h; y++) edge.push([1, y], [w - 2, y]);
          if (!edge.some(([x, y]) => inkAt(data, w, x, y)))
            failures.push({ w, h, scale, position, thickness });
          configurations++;
        }
      }
      if (failures.length) throw new Error(`flat entry crop exposed: ${JSON.stringify(failures)}`);
      return { configurations };
    } finally {
      await RibbonInk.applyScheme(saved); RibbonInk.setPaused(true);
    }
  });
};
