/* Invoke this exported function with the current Playwright page. */
module.exports = async function checkRibbonSeam(page) {
  return page.evaluate(async () => {
    const saved = RibbonInk.schemeData(), failures = [], measurements = [];
    let samples = 0, configurations = 0;
    const canvas = document.createElement('canvas');
    const inkAt = (ctx, x, y) => {
      const p = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return p[0] > 70 && p[2] > 90 && p[1] < 180;
    };
    try {
      // Probe the actual source/continuation overlap, with no text to hide gaps.
      for (const [w, h] of [[640, 360], [640, 640], [360, 640]]) {
        const unit = Math.min(w / 720, h / 405), W = w / unit, H = h / unit;
        for (const scale of [55, 100, 150]) for (const thickness of [55, 100, 160]) {
          const scheme = structuredClone(saved);
          Object.assign(scheme.values, { sequenceMode: 'double', textInput: '', page2Text: '',
            brushScale: String(scale), brushWidth: String(thickness), positionX: '50', positionY: '52',
            inkColor1: '#f34bd9', inkColor2: '#a40de4', inkColor3: '#ff78e9',
            inkColor4: '#7827d8', inkColor5: '#f33ccd', page2PaletteMode: 'inherit' });
          await RibbonInk.applyScheme(scheme); RibbonInk.setPaused(true);
          const join = RibbonInk.sequenceJoin(w, h, unit);
          if (join.entry[0] > W) failures.push({ reason: 'join beyond clipped page', w, h, scale, thickness });
          const route = RibbonInkSequence.compile(scheme.values.page2Route, W, H, join.entry, join);
          const span = RibbonInk.timing(), options = RibbonInkSequence.settings(scheme.values);
          for (const elapsed of [.025, .05, .085, .12]) {
            const motion = RibbonInkSequence.evaluate(elapsed, span.bridge, .42, route, span.page2, options);
            RibbonInk.renderFrame(canvas, span.write + span.flow + elapsed, w, h);
            const ctx = canvas.getContext('2d');
            for (let d = -6; d <= Math.min(15, motion.head); d += 1) {
              const x = (join.entry[0] + Math.cos(join.angle) * d - motion.camera * W) * unit;
              const y = (join.entry[1] + Math.sin(join.angle) * d) * unit;
              if (x < 1 || x >= w - 1 || y < 1 || y >= h - 1) continue;
              samples++;
              if (!inkAt(ctx, x, y)) failures.push({ reason: 'visible join gap', w, h, scale, thickness, elapsed, d });
            }
          }
          configurations++;
        }
      }
      // Both page controls must enlarge real glyph pixels, not only their labels.
      for (const [font, text] of [['stg:inter', 'FLOW'], ['stg:noto-sc-black', '风格上新'],
        ['stg:noto-jp-black', 'あいうえ'], ['stg:noto-kr-black', '자유필기']]) {
        for (const size of [270, 340, 540]) {
          const scheme = structuredClone(saved);
          Object.assign(scheme.values, { sequenceMode: 'double', fontSelect: font, page2Font: font,
            textInput: text, page2Text: text, fontSize: String(size), page2Size: String(size),
            textColor: '#080808', page2Color: '#080808', backgroundColor: '#f7f7f5',
            positionX: '50', positionY: '52' });
          await RibbonInk.applyScheme(scheme); RibbonInk.setPaused(true);
          const span = RibbonInk.timing();
          const heights = [];
          for (const time of [0, span.write + span.flow + span.bridge + span.finish]) {
            RibbonInk.renderFrame(canvas, time, 640, 640);
            const data = canvas.getContext('2d').getImageData(0, 0, 640, 640).data;
            let top = 640, bottom = -1;
            for (let y = 0; y < 640; y++) for (let x = 0; x < 640; x++) {
              const i = (y * 640 + x) * 4;
              if (data[i] < 80 && data[i + 1] < 80 && data[i + 2] < 80) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
            }
            heights.push(bottom - top + 1);
          }
          measurements.push({ font, size, heights });
        }
        const rows = measurements.filter(row => row.font === font);
        for (let page = 0; page < 2; page++) if (!(rows[1].heights[page] > rows[0].heights[page] * 1.15 && rows[2].heights[page] > rows[1].heights[page] * 1.3))
          failures.push({ reason: 'font enlargement cancelled', font, page, rows });
      }
      if (failures.length) throw new Error(JSON.stringify(failures.slice(0, 12)));
      return { configurations, coveredJoinSamples: samples, measurements };
    } finally {
      await RibbonInk.applyScheme(saved); RibbonInk.setPaused(true);
    }
  });
};
