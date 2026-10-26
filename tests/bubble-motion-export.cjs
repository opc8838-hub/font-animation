const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8772/bubble-frame.html');await page.waitForFunction(()=>window.CellMotionBubbleFrame);await page.evaluate(()=>BubbleFrameScene.ready);
  await page.locator('#resetScheme').click();await page.evaluate(()=>CellMotionBubbleFrame.seek(.7));
  const poster=await page.locator('#canvas').evaluate(c=>c.toDataURL('image/png').split(',')[1]);
  fs.writeFileSync(path.resolve(__dirname,'../site/final_bubble-frame.png'),Buffer.from(poster,'base64'));
  await page.locator('#ratio').selectOption('custom',{force:true});
  for(const [id,value] of [['canvasWidth','640'],['canvasHeight','360']]){await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('change');}
  await page.locator('[data-tab="export"]').click();
  const download=page.waitForEvent('download',{timeout:120000});await page.locator('#mp4').click();
  await (await download).saveAs(path.resolve(__dirname,'../site/assets/previews/bubble-frame-card.mp4'));
  await page.waitForFunction(()=>!document.querySelector('#mp4').disabled);
  if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify({ok:true,errors,duration:4.8}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
