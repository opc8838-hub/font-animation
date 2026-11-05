const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const base=process.argv[4]||'http://127.0.0.1:8789';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/metallic-text.html?from=gallery`);await page.waitForFunction(()=>window.CellMotionEffectBridge);
  const evidence=await page.evaluate(async()=>{
   const original=CellMotionMetallicText.getScheme(),c=document.createElement('canvas');c.width=640;c.height=360;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   const pixels=(s,t)=>{ctx.clearRect(0,0,640,360);MetallicTextRenderer.draw(ctx,s,t,640,360,true);return ctx.getImageData(0,0,640,360).data;};
   const reports=[];
   for(const mode of ['scan','laser'])for(const direction of ['forward','reverse']){
    const s=structuredClone(original);Object.assign(s.scene,{text:'OOOO',revealMode:mode,writeDuration:2.4,sweep:3.6,hold:.6,direction});
    await CellMotionMetallicText.applyScheme(s,{autoplay:false});
    const a=pixels(s,.9),b=pixels(s,1.6);let shared=0,changed=0;
    for(let y=0;y<360;y++)for(let x=0;x<160;x++){const i=(y*640+x)*4;if(a[i+3]<254||b[i+3]<254)continue;shared++;if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>3)changed++;}
    const complete=pixels(s,2.4),noReveal=structuredClone(s);noReveal.scene.revealMode='none';const expected=pixels(noReveal,2.4);
    let mismatch=0;for(let i=0;i<complete.length;i++)if(complete[i]!==expected[i])mismatch++;
    reports.push({mode,direction,shared,changed,mismatch,duration:MetallicTextRenderer.duration(s.scene)});
   }
   return reports;
  });
  for(const r of evidence){assert.ok(r.shared>100);assert.ok(r.changed>100,`${r.mode}/${r.direction}: reflection must move on the already revealed first O while later letters are writing`);assert.equal(r.mismatch,0,'Reflection uses the same absolute clock with and without text reveal');assert.ok(Math.abs(r.duration-4.2)<.001);}
  for(const mode of ['scan','laser','none'])for(const [writeDuration,sweep,hold,speed] of [[2.4,3.6,.6,1],[5,1.2,.4,2],[2.4,3.6,0,.5]]){
   await page.evaluate(async s=>{const state=CellMotionMetallicText.getScheme();Object.assign(state.scene,s);await CellMotionMetallicText.applyScheme(state,{autoplay:false});},{revealMode:mode,writeDuration,sweep,hold,speed});
   const active=Math.max(mode==='none'?0:writeDuration,sweep),duration=(active+hold)/speed;
   const phases=await page.locator('#timeline button').evaluateAll(buttons=>buttons.map(b=>({key:b.dataset.phase,start:Number(b.dataset.seek),end:Number(b.dataset.end),left:b.getBoundingClientRect().left,top:b.getBoundingClientRect().top})));
   const light=phases.find(p=>p.key==='sweep');assert.equal(light.start,0);assert.ok(Math.abs(light.end-sweep/speed)<.001);
   if(mode!=='none'){const write=phases.find(p=>p.key==='writeDuration');assert.equal(write.start,0);assert.ok(Math.abs(write.left-light.left)<1);assert.ok(light.top>write.top);await page.evaluate(at=>CellMotionMetallicText.seek(at),Math.min(writeDuration,sweep)/speed/2);assert.equal(await page.locator('#timeline button[aria-current="true"]').count(),2);}
   if(hold){const pause=phases.find(p=>p.key==='hold');assert.ok(Math.abs(pause.start-active/speed)<.001);await page.locator('#timeline button[data-phase="hold"]').click();assert.ok(Math.abs(await page.evaluate(()=>CellMotionMetallicText.time)-(active+hold/2)/speed)<.001);}
   assert.ok(Math.abs(Number(await page.locator('#scrubber').getAttribute('max'))-duration)<.001);
  }
  await page.evaluate(async()=>{const s=CellMotionMetallicText.getScheme();Object.assign(s.scene,{text:'AVATR\nLASER',revealMode:'laser',writeDuration:2.4,sweep:3.6,hold:.6,speed:1});await CellMotionMetallicText.applyScheme(s,{autoplay:false});await CellMotionMetallicText.seek(1.5);});
  await page.locator('[data-panel="motion"]').first().click();
  for(const [id,value,expected] of [['sweepExact','4',2],['holdExact','.8',4.4],['writeDurationExact','6',3]]){
   await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('change');assert.ok(Math.abs(await page.evaluate(()=>CellMotionMetallicText.time)-expected)<.001,`${id} seeks within the actual parallel interval`);
  }
  await page.evaluate(async()=>{const s=CellMotionMetallicText.getScheme();Object.assign(s.scene,{writeDuration:2.4,sweep:3.6,hold:.6});await CellMotionMetallicText.applyScheme(s,{autoplay:false});await CellMotionMetallicText.seek(1.5);});
  const output=path.resolve(__dirname,'../output/metallic-overlap');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'desktop.png')});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(evidence,null,2));assert.deepEqual(errors,[]);
  console.log('PASS: concurrent light/reveal in both modes/directions, shared absolute clock, overlapping timeline, durations, speed, seek and mobile');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
