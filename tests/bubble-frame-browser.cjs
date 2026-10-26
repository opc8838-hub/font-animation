const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../output/bubble-frame');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 try{
  await page.goto('http://127.0.0.1:8772/bubble-frame.html');
  await page.waitForFunction(()=>window.CellMotionBubbleFrame);
  await page.evaluate(()=>BubbleFrameScene.ready);
  for(const [name,time] of [['title',0],['flow',.7],['twist',2.2],['reflow',3.8]]){
   await page.evaluate(t=>CellMotionBubbleFrame.seek(t),time);
   await page.locator('#canvas').screenshot({path:path.join(output,`${name}.png`)});
  }
  await page.evaluate(()=>CellMotionBubbleFrame.seek(0));
  await page.screenshot({path:path.join(output,'desktop.png')});
  assert.equal(await page.locator('.me-choreo-block').count(),3);
  for(const value of ['A','abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ\n0123456789!?','任意文字\n泡泡边框']){
   await page.locator('#text').fill(value);await page.locator('#pauseEdit').click();
   assert.equal(await page.evaluate(()=>CellMotionBubbleFrame.state().text),value);
   await page.locator('#canvas').screenshot({path:path.join(output,`text-${value==='A'?'single':value.startsWith('a')?'lower':value.startsWith('A')?'alphabet':'chinese'}.png`)});
  }
  await page.locator('#resetScheme').click();
  await page.waitForTimeout(200);
  await page.locator('#theme').click();await page.locator('#language').click();
  assert.equal(await page.locator('[data-tab="motion"]').innerText(),'Motion');
  await page.locator('#ratio').selectOption('1080x1920',{force:true});
  await page.waitForTimeout(100);
  const bounds=await page.locator('#canvas').boundingBox();assert.ok(Math.abs(bounds.width/bounds.height-9/16)<.01);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#ratio').selectOption('custom',{force:true});await page.locator('#canvasWidth').fill('320');await page.locator('#canvasWidth').dispatchEvent('change');await page.locator('#canvasHeight').fill('320');await page.locator('#canvasHeight').dispatchEvent('change');
  await page.locator('[data-tab="export"]').click();await page.locator('#exportDuration').fill('1');await page.locator('#exportFps').selectOption('15',{force:true});
  for(const format of ['png','gif','mp4']){
   const download=page.waitForEvent('download',{timeout:120000});await page.locator(`#${format}`).click();const file=await download;await file.saveAs(path.join(output,`export.${format}`));
   await page.waitForFunction(()=>!document.querySelector('#mp4').disabled);
  }
  await page.locator('#resetScheme').click();
  await page.waitForTimeout(200);
  await page.evaluate(()=>CellMotionBubbleFrame.seek(0));
  const poster=await page.locator('#canvas').evaluate(c=>c.toDataURL('image/png').split(',')[1]);
  fs.writeFileSync(path.resolve(__dirname,'../site/final_bubble-frame.png'),Buffer.from(poster,'base64'));
  await page.locator('#ratio').selectOption('custom',{force:true});
  await page.locator('#canvasWidth').fill('640');await page.locator('#canvasWidth').dispatchEvent('change');
  await page.locator('#canvasHeight').fill('360');await page.locator('#canvasHeight').dispatchEvent('change');
  await page.locator('#exportDuration').fill('0');await page.locator('#exportFps').selectOption('30',{force:true});
  const complete=page.waitForEvent('download',{timeout:120000});await page.locator('#mp4').click();
  await (await complete).saveAs(path.resolve(__dirname,'../site/assets/previews/bubble-frame-card.mp4'));
  await page.waitForFunction(()=>!document.querySelector('#mp4').disabled);
  await page.locator('[data-tab="content"]').click();
  await page.locator('#text').fill('BUBBLE\nMOTION');
  await page.waitForTimeout(350);await page.reload();await page.waitForFunction(()=>window.CellMotionBubbleFrame);
  assert.equal(await page.evaluate(()=>CellMotionBubbleFrame.state().text),'BUBBLE\nMOTION');
  const saved=page.waitForEvent('download');await page.locator('#saveScheme').click();const scheme=await saved;const schemePath=path.join(output,'scheme.json');await scheme.saveAs(schemePath);
  await page.locator('#clearScheme').click();assert.equal(await page.locator('#text').inputValue(),'');
  await page.locator('#schemeFile').setInputFiles(schemePath);await page.waitForTimeout(200);assert.equal(await page.locator('#text').inputValue(),'BUBBLE\nMOTION');
  for(const [font,text] of [['stg:space-grotesk','Motion'],['stg:noto-sc','泡泡'],['stg:noto-jp-black','ガラス'],['stg:noto-kr-black','유리']]){
   await page.locator('#font').selectOption(font,{force:true});await page.locator('#text').fill(text);await page.locator('#pauseEdit').click();
   await page.evaluate(()=>document.fonts.ready);
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,errors,output}));
 }catch(error){console.error(JSON.stringify({browserErrors:errors}));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
