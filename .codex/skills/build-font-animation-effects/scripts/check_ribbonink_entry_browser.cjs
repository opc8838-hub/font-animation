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
      // When the source crop would be visible, the generated continuation must
      // precede it but keep its complete round cap inside the composition.
      for (const [w, h] of [[640, 360], [640, 640], [360, 640]]) {
        for (const scale of [55, 100, 150]) for (const position of [8, 50, 92]) for (const thickness of [55, 160]) {
          set('brushScale', scale); set('brushWidth', thickness); set('positionX', position);
          RibbonInk.renderFrame(canvas, .92, w, h);
          const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, w, h).data, edge = [];
          for (let x = 0; x < w; x++) edge.push([x, 1], [x, h - 2]);
          for (let y = 0; y < h; y++) edge.push([1, y], [w - 2, y]);
          const unit = Math.min(w / 720, h / 405), factor = unit * scale / 100;
          const sourceX = w * position / 100 - 360 * factor;
          const widthScale = thickness / 100, sourceY = h * .52 - 210 * factor;
          const margin = 58 * factor * widthScale * .60 + 2;
          let extensionFits = false;
          for (let step = 0; step <= 96 && !extensionFits; step++) {
            const t = step / 96, u = 1 - t;
            const px = u ** 3 * -1100 + 3 * u * u * t * -780 + 3 * u * t * t * -80 + t ** 3 * 12;
            const py = u ** 3 * 620 + 3 * u * u * t * 600 + 3 * u * t * t * 428 + t ** 3 * 368;
            const x = sourceX + px * factor;
            const y = sourceY + (210 + (py - 210) * widthScale) * factor;
            extensionFits = x >= margin && x <= w - margin && y >= margin && y <= h - margin && t < .995;
          }
          let cropVisible = false;
          for (let y = 0; y < h && !cropVisible; y++) for (let x = Math.max(0, Math.floor(sourceX)); x < Math.min(w, Math.ceil(sourceX) + 5); x++) {
            if (inkAt(data, w, x, y)) { cropVisible = true; break; }
          }
          if (sourceX > 0 && cropVisible && extensionFits) {
            let precedesSource = false;
            for (let y = 0; y < h && !precedesSource; y++) for (let x = 2; x < Math.min(w, Math.floor(sourceX)); x++) {
              if (inkAt(data, w, x, y)) { precedesSource = true; break; }
            }
            const touchesEdge = edge.some(([x, y]) => x < sourceX && inkAt(data, w, x, y));
            if (!precedesSource || touchesEdge)
              failures.push({ w, h, scale, position, thickness, sourceX, precedesSource, touchesEdge });
          }
          configurations++;
        }
      }
      if (failures.length) throw new Error(`rounded entry contract failed: ${JSON.stringify(failures)}`);
      return { configurations };
    } finally {
      await RibbonInk.applyScheme(saved); RibbonInk.setPaused(true);
    }
  });
};
