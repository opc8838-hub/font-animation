const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(path.resolve(process.argv[2] || 'node_modules', 'playwright'));
const base = process.argv[4] || 'http://127.0.0.1:8789';
const output = path.resolve(__dirname, '../output/metallic-strokes'); fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.argv[3] || undefined });
  try {
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/metallic-text.html?from=gallery`); await page.waitForFunction(() => window.CellMotionEffectBridge);
    const result = await page.evaluate(async () => {
      const s = CellMotionMetallicText.getScheme(), c = document.createElement('canvas'); c.width = 800; c.height = 600;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const render = at => { ctx.clearRect(0, 0, 800, 600); MetallicTextRenderer.draw(ctx, s, at, 800, 600, true); return ctx.getImageData(0, 0, 800, 600).data; };
      const rows = data => [0, 1].map(row => {
        let left = 800, right = -1;
        for (let y = row * 300; y < (row + 1) * 300; y++) for (let x = 0; x < 800; x++) if (data[(y * 800 + x) * 4 + 3] > 127) { left = Math.min(left, x); right = Math.max(right, x); }
        return { left, right, center: (left + right) / 2 };
      });
      const layouts = [];
      for (const font of ['stg:cellmotion-square', 'stg:inter', 'stg:noto-sc-black']) for (const alignment of ['left', 'center', 'right']) {
        Object.assign(s.scene, { font, text: font.includes('noto') ? ' 未来   \n来 ' : 'B2   \n W ', alignment, revealMode: 'none' });
        await CellMotionMetallicText.applyScheme(s, { autoplay: false });
        layouts.push({ font, alignment, rows: rows(render(0)) });
      }
      Object.assign(s.scene, { font: 'stg:cellmotion-square', text: 'U', alignment: 'center', revealMode: 'laser', writeDuration: 2.4 });
      await CellMotionMetallicText.applyScheme(s, { autoplay: false });
      const full = render(2.4); let left=800,right=0,top=600,bottom=0;
      for(let y=0;y<600;y++)for(let x=0;x<800;x++)if(full[(y*800+x)*4+3]>127){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      const frames = [];
      for (const at of [0, .3, .6, .9, 1.2, 1.5, 1.8, 2.4]) {
        const data = render(at), regions = { upperLeft: 0, lowerLeft: 0, upperRight: 0, lowerRight: 0 };
        for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(data[(y*800+x)*4+3]>127){const nx=(x-left)/(right-left),ny=(y-top)/(bottom-top);if(nx<.3&&ny<.4)regions.upperLeft++;if(nx<.3&&ny>.8)regions.lowerLeft++;if(nx>.7&&ny<.4)regions.upperRight++;if(nx>.7&&ny>.8)regions.lowerRight++;}
        frames.push({ at, regions, png: c.toDataURL() });
      }
      s.scene.text = '2'; await CellMotionMetallicText.applyScheme(s, { autoplay: false });
      const digitFull = render(2.4); let digitTop=600,digitBottom=0;
      for(let y=0;y<600;y++)for(let x=0;x<800;x++)if(digitFull[(y*800+x)*4+3]>127){digitTop=Math.min(digitTop,y);digitBottom=Math.max(digitBottom,y);}
      const digit = render(.9); let digitUpper=0,digitLower=0;
      for(let y=0;y<600;y++)for(let x=0;x<800;x++)if(digit[(y*800+x)*4+3]>127){if(y<digitTop+(digitBottom-digitTop)*.4)digitUpper++;if(y>digitTop+(digitBottom-digitTop)*.8)digitLower++;}
      Object.assign(s.scene, { text: 'AVATR', fontSize: .2, fontHeight: 1, extraBold: 0 });
      await CellMotionMetallicText.applyScheme(s, { autoplay: false });
      const firstA = render(.47), reference = document.createElement('canvas'); reference.width=800;reference.height=600;
      const ink = reference.getContext('2d'), font = STGFontLibrary.preset(s.scene.font), size=600*s.scene.fontSize;
      ink.font=`${font.style} ${font.weight} ${size}px ${STGFontLibrary.family(s.scene.font)}`;ink.letterSpacing=`${size*s.scene.tracking}px`;ink.fontKerning='normal';
      const metric = ink.measureText('AVATR');ink.fillText('A',(800-metric.width+size*s.scene.tracking)/2,(600+metric.actualBoundingBoxAscent-metric.actualBoundingBoxDescent)/2);
      const expected=ink.getImageData(0,0,800,600).data;let leaked=0,firstInk=0;
      for(let i=3;i<firstA.length;i+=4)if(firstA[i]>127){firstInk++;if(expected[i]>127)continue;let neighbor=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(expected[i+(dy*800+dx)*4]>127)neighbor=true;if(!neighbor)leaked++;}
      const languages=[];
      for(const [font,text] of [['cellmotion-square','METAL'],['noto-sc-black','金属\n流光'],['noto-jp-black','金属の光'],['noto-kr-black','금속빛']]){
        Object.assign(s.scene,{font:`stg:${font}`,text,fontSize:.8,fontHeight:.8,extraBold:.015,revealMode:'laser'});
        await CellMotionMetallicText.applyScheme(s,{autoplay:false});
        const count=data=>{let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>127)n++;return n;};
        const samples=[0,.3,1.2,2.4].map(at=>count(render(at)));
        s.scene.revealMode='none';const complete=count(render(0));languages.push({font,samples,complete});
      }
      return { layouts, frames, digitUpper, digitLower, firstInk, leaked, languages };
    });
    for(const frame of result.frames){fs.writeFileSync(path.join(output, `u-${frame.at}.png`),Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;}
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(result, null, 2));
    // Rounded emboldening can extend curved/diagonal edges by a few different pixels.
    for(const layout of result.layouts){const key=layout.alignment==='center'?'center':layout.alignment;assert.ok(Math.abs(layout.rows[0][key]-layout.rows[1][key])<=(key==='center'?2:3),`${layout.font} ${key}: visible row edges must align despite surrounding spaces: ${JSON.stringify(layout.rows)}`);}
    const early=result.frames.find(f=>f.at===.3).regions;
    assert.ok(early.upperLeft>100,'U starts at the upper-left stroke');
    assert.equal(early.lowerLeft,0,'Laser must travel down the U stem, not reveal its entire height with a horizontal wipe');
    const middle=result.frames.find(f=>f.at===1.2).regions;
    assert.ok(middle.lowerLeft>100,'Laser rounds the bottom of U');
    assert.equal(middle.upperRight,0,'Upper-right stem waits for the laser to climb from the bottom');
    assert.ok(result.digitUpper>100);assert.equal(result.digitLower,0,'2 traces its upper curve before returning left to write the bottom');
    assert.ok(result.firstInk>100);assert.equal(result.leaked,0,'Writing A must not expose the overlapping bounding box of V');
    for(const sample of result.languages){assert.equal(sample.samples[0],0);assert.ok(sample.samples[1]>0);assert.ok(sample.samples[2]>sample.samples[1]);assert.equal(sample.samples[3],sample.complete,`${sample.font} stroke completion preserves the native shaped silhouette`);}
    assert.deepEqual(errors,[]);
    console.log('PASS: visible multiline alignment, whitespace, shared fonts and curved stroke-following laser');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
