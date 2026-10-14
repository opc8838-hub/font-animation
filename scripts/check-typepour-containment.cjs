/* Pixel-level containment regression: run against preview-typepour.cjs. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.TYPEPOUR_URL || 'http://127.0.0.1:4179') + '/typepour.html');
    await page.evaluate(() => TypePourEditor.readyPromise);
    const result = await page.evaluate(async () => {
      TypePour.state.playing = false;
      const original = TypePourEditor.getScheme(), clip = TypePourGlass.clipLiquid;
      // Isolate ink from photographic glass/shadows, without changing the real render path.
      TypePour.state.glassReady = false;
      const violations = [], cases = [];
      function inspect(width, height, time, motion) {
        const c = document.createElement('canvas');c.width = width;c.height = height;
        TypePour.renderFrame(c, time);
        const pixels = c.getContext('2d').getImageData(0,0,width,height).data;
        const scale = Math.min(width/900,height/1000), portrait = Math.abs(width/height-9/16)<.015;
        const ox = (width-900*scale)/2 + (110 + (portrait?-90:0) + motion.cupX)*scale;
        const oy = (height-1000*scale)/2 + ((portrait?240:0) + motion.cupY)*scale;
        let outside = 0, ink = 0;
        for(let py=0;py<height;py++)for(let px=0;px<width;px++) {
          const i=(py*width+px)*4;if(pixels[i]>245&&pixels[i+1]>245&&pixels[i+2]>245)continue;
          const x=((motion.direction==='left'?width-px-.5:px+.5)-ox)/scale, y=(py+.5-oy)/scale;
          if(y<452)continue;ink++;
          // Independent measured inner-wall envelope, with one pixel of raster tolerance.
          const depth=Math.min(1,Math.max(0,(y-450)/402)), tolerance=1/scale;
          if(x<314+20*depth-tolerance || x>636-18*depth+tolerance || y>865+tolerance)outside++;
        }
        return {outside,ink};
      }
      for(const size of [15,28])for(const squares of [0,84]) {
        const scheme=structuredClone(original);scheme.typography.fontSize=size;scheme.markers.density=squares;
        await TypePourEditor.applyScheme(scheme);TypePour.state.glassReady=false;
        for(const [width,height] of [[900,1000],[540,960],[960,540]])for(const time of [4,7.2,8.5,10,12]) {
          const check=inspect(width,height,time,scheme.motion);
          cases.push(check);if(check.outside)violations.push({size,squares,width,height,time,...check});
        }
      }
      const shifted=structuredClone(original);shifted.motion.cupX=55;shifted.motion.cupY=-70;shifted.motion.direction='left';
      await TypePourEditor.applyScheme(shifted);TypePour.state.glassReady=false;
      const offset=inspect(540,960,10,shifted.motion);if(offset.outside)violations.push({offset});
      await TypePourEditor.applyScheme(original);TypePour.state.glassReady=false;
      TypePourGlass.clipLiquid=()=>{};
      const uncorrected=inspect(900,1000,10,original.motion);
      TypePourGlass.clipLiquid=clip;
      // Airborne glyphs above the mouth must be pixel-identical to the approved motion.
      function air() { const c=document.createElement('canvas');c.width=900;c.height=1000;TypePour.renderFrame(c,2);return Array.from(c.getContext('2d').getImageData(0,0,900,400).data); }
      const correctedAir=air();TypePourGlass.clipLiquid=()=>{};const oldAir=air();TypePourGlass.clipLiquid=clip;
      return {violations,cases:cases.length,minimumInk:Math.min(...cases.map(c=>c.ink)),uncorrected,airUnchanged:correctedAir.every((v,i)=>v===oldAir[i])};
    });
    assert.equal(result.violations.length,0,JSON.stringify(result.violations));
    assert.ok(result.minimumInk>1000,'pool remains visible');
    assert.ok(result.uncorrected.outside>0,'regression must detect original overflow');
    assert.equal(result.airUnchanged,true,'approved incoming stream stays unchanged');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
