const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const base=process.argv[4]||'http://127.0.0.1:8789';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/metallic-text.html?from=gallery`);await page.waitForFunction(()=>window.CellMotionEffectBridge);
  const report=await page.evaluate(async()=>{
   const s=CellMotionMetallicText.getScheme();Object.assign(s.scene,{text:'B2\nW',writeDuration:.8,sweep:3.6,hold:1.58,lightAmplitude:.28,lightSpeed:1});
   const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d',{willReadFrequently:true});
   const frame=t=>{ctx.clearRect(0,0,640,480);MetallicTextRenderer.draw(ctx,s,t,640,480,true);return ctx.getImageData(0,0,640,480).data;};
   const delta=(a,b,alphaOnly=false)=>{let total=0,n=0;for(let i=0;i<a.length;i+=4){if(alphaOnly){total+=Math.abs(a[i+3]-b[i+3]);n++;}else if(a[i+3]>250&&b[i+3]>250){for(let j=0;j<3;j++)total+=Math.abs(a[i+j]-b[i+j]);n+=3;}}return total/Math.max(1,n);};
   const tails=[];
   for(const mode of ['none','scan','laser'])for(const direction of ['forward','reverse']){
    Object.assign(s.scene,{revealMode:mode,direction});await CellMotionMetallicText.applyScheme(s,{autoplay:false});
    const changes=[];let previous=frame(3.8);for(let t=3.9;t<5.18;t+=.1){const next=frame(t);changes.push(delta(previous,next));previous=next;}tails.push({mode,direction,changes});
   }
   s.scene.revealMode='none';const duration=MetallicTextRenderer.duration(s.scene),seams=[];
   for(const lightSpeed of [.5,1,1.5,2,2.5,3]){s.scene.lightSpeed=lightSpeed;const first=frame(0),last=frame(duration),before=frame(duration-1/60),after=frame(1/60);seams.push({lightSpeed,endpoint:delta(first,last),boundary:delta(before,first),next:delta(first,after)});}
   s.scene.lightSpeed=1;const normal=frame(.8);s.scene.lightSpeed=2;const fast=frame(.4);
   s.scene.lightSpeed=1;s.scene.lightAmplitude=.08;const small=frame(.37);s.scene.lightAmplitude=.42;const large=frame(.37);
   s.scene.revealMode='laser';s.scene.lightSpeed=.5;const slowMask=frame(.35);s.scene.lightSpeed=3;const fastMask=frame(.35);
   return {tails,seams,speedDelta:delta(normal,fast),amplitudeDelta:delta(small,large),writingMaskDelta:delta(slowMask,fastMask,true)};
  });
  for(const sample of report.tails)assert.ok(Math.min(...sample.changes)>.3,`${sample.mode}/${sample.direction}: light must keep moving throughout the final hold`);
  for(const sample of report.seams){assert.equal(sample.endpoint,0);assert.ok(sample.boundary<sample.next*2+.2,'Loop seam should be no larger than an ordinary frame step');}
  assert.equal(report.speedDelta,0,'2x light speed reaches the same phase in half the time');assert.ok(report.amplitudeDelta>2);assert.equal(report.writingMaskDelta,0,'Light speed must not change writing speed');
  await page.locator('[data-panel="motion"]').first().click();
  for(const [id,value] of [['lightAmplitudeExact','36'],['lightSpeedExact','1.5']]){await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('change');}
  const edited=await page.evaluate(()=>CellMotionMetallicText.getScheme());assert.equal(edited.scene.lightAmplitude,.36);assert.equal(edited.scene.lightSpeed,1.5);
  await page.goto(`${base}/metallic-text.html`);await page.waitForFunction(()=>window.CellMotionEffectBridge);assert.deepEqual(await page.evaluate(()=>CellMotionMetallicText.getScheme()),edited);
  await page.evaluate(()=>CellMotionMetallicText.seek(4.6));assert.equal(await page.locator('#timeline button[data-phase="sweep"][aria-current="true"]').count(),1);assert.equal(await page.locator('#timeline button[data-phase="hold"][aria-current="true"]').count(),1);
  const output=path.resolve(__dirname,'../output/metallic-flow');fs.mkdirSync(output,{recursive:true});await page.locator('[data-panel="motion"]').first().click();await page.screenshot({path:path.join(output,'controls.png')});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2));assert.deepEqual(errors,[]);
  console.log('PASS: continuous final hold, seamless speed levels, larger editable amplitude, independent light speed, persistence, timeline and mobile');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
