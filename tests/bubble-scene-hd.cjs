const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const output=path.resolve(__dirname,'../output/bubble-stage-hd');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.sceneReadbacks=[];const read=CanvasRenderingContext2D.prototype.getImageData;
   CanvasRenderingContext2D.prototype.getImageData=function(x,y,w,h,...rest){if(w>1000&&h>600)window.sceneReadbacks.push([w,h]);return read.call(this,x,y,w,h,...rest);};
  });
  await page.goto('http://127.0.0.1:8772/bubble-frame.html?from=gallery');await page.waitForFunction(()=>window.CellMotionBubbleFrame);await page.evaluate(()=>BubbleFrameScene.ready);
  const result=await page.evaluate(async()=>{
   const plate=new Image();plate.src='assets/bubble-frame/stage-hd.webp';await plate.decode();
   CellMotionBubbleFrame.seek(.7);const c=document.createElement('canvas');c.width=3840;c.height=2160;CellMotionBubbleFrame.render(c,.7);
   const encoded=c.toDataURL('image/png').split(',')[1],timings=[];
   c.width=1920;c.height=1080;
   for(let i=0;i<60;i++){const start=performance.now();CellMotionBubbleFrame.render(c,i/30);timings.push(performance.now()-start);await new Promise(requestAnimationFrame);}
   timings.sort((a,b)=>a-b);
   return {width:plate.naturalWidth,height:plate.naturalHeight,readbacks:sceneReadbacks,medianMs:timings[30],p95Ms:timings[57],encoded};
  });
  const {encoded,...metrics}=result;fs.writeFileSync(path.join(output,'stage-3840.png'),Buffer.from(encoded,'base64'));
  assert.ok(result.width>=1600&&result.height>=900,'Background must contain a native high-resolution reconstruction');
  assert.ok(result.readbacks.some(([w,h])=>w===result.width&&h===result.height),'Scene tinting must retain the plate resolution');
  await page.locator('#ratio').selectOption('custom',{force:true});
  for(const id of ['canvasWidth','canvasHeight']){await page.locator('#'+id).fill('320');await page.locator('#'+id).dispatchEvent('change');}
  await page.locator('[data-tab="export"]').click();await page.locator('#exportDuration').fill('1');await page.locator('#exportFps').selectOption('15',{force:true});
  const download=page.waitForEvent('download',{timeout:120000});await page.locator('#gif').click();await(await download).saveAs(path.join(output,'stage-square.gif'));
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({...metrics,errors},null,2));console.log(JSON.stringify({...metrics,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
