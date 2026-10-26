const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
 const output=path.resolve(__dirname,'../output/bubble-release');fs.mkdirSync(output,{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8772/bubble-frame.html?from=gallery');await page.waitForFunction(()=>window.CellMotionBubbleFrame);await page.evaluate(()=>BubbleFrameScene.ready);
  await page.waitForFunction(()=>document.querySelectorAll('.tc-select-trigger').length===document.querySelectorAll('select').length);
  const capture=()=>page.evaluate(()=>{CellMotionBubbleFrame.seek(.7);const c=document.createElement('canvas');c.width=640;c.height=360;CellMotionBubbleFrame.render(c,.7);return c.toDataURL();});
  const baseline=await capture();
  for(const ratio of ['1080x1920','1080x1080','1920x1080']){
   await page.locator('#ratio + .tc-select-trigger').click();await page.locator('.tc-select-option[data-value="'+ratio+'"]').click();
   const bounds=await page.locator('#canvas').boundingBox(),[w,h]=ratio.split('x').map(Number);assert.ok(Math.abs(bounds.width/bounds.height-w/h)<.01);
  }
  await page.locator('#theme').click();await page.locator('#language').click();
  assert.equal(await page.locator('body').getAttribute('data-editor-theme'),'light');assert.equal(await page.locator('[data-tab="motion"]').innerText(),'Motion');
  assert.equal(await capture(),baseline,'Editor theme and language cannot change composition pixels');
  await page.locator('details:has(#font)>summary').click();await page.locator('#font + .tc-select-trigger').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.tc-select-popover').isVisible(),false);
  await page.locator('#screenSettings>summary').click();await page.locator('#backgroundColor').fill('#883399');await page.locator('#backgroundColor').dispatchEvent('input');
  assert.equal(await page.locator('#screenSwatch').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(136, 51, 153)');
  await page.locator('#backgroundVideoFile').setInputFiles(path.resolve(__dirname,'../site/assets/previews/bubble-frame-card.mp4'));
  await page.waitForFunction(()=>!document.querySelector('#backgroundVideoOptions').hidden);
  await page.waitForFunction(()=>{const c=document.querySelector('#backgroundFilmstrip'),p=c.getContext('2d').getImageData(470,32,1,1).data;return p[3]>0;});
  await page.locator('#videoStart').fill('.2');await page.locator('#videoStart').dispatchEvent('change');await page.locator('#videoEnd').fill('1.2');await page.locator('#videoEnd').dispatchEvent('change');
  assert.equal(await page.locator('#videoStart').inputValue(),'0.2');assert.equal(await page.locator('#videoEnd').inputValue(),'1.2');
  await page.locator('#removeBackgroundVideo').click();assert.equal(await page.locator('#backgroundVideoOptions').isVisible(),false);
  await page.locator('#resetScheme').click();await page.evaluate(()=>CellMotionBubbleFrame.seek(.7));await page.screenshot({path:path.join(output,'desktop-light.png')});
  await page.reload();await page.waitForFunction(()=>window.CellMotionBubbleFrame);assert.equal(await page.locator('body').getAttribute('data-editor-theme'),'light');assert.equal(await page.locator('body').getAttribute('data-editor-language'),'en');
  await page.locator('#theme').click();await page.locator('#language').click();await page.evaluate(()=>CellMotionBubbleFrame.seek(.7));await page.screenshot({path:path.join(output,'desktop-dark.png')});
  const phases=await page.locator('.me-choreo-block').evaluateAll(list=>list.map(e=>({color:getComputedStyle(e).backgroundColor,radius:getComputedStyle(e).borderRadius})));assert.equal(new Set(phases.map(p=>p.color)).size,3);assert.ok(phases.every(p=>parseFloat(p.radius)>=12));
  await page.locator('.me-choreo-block').nth(1).focus();await page.keyboard.press('Enter');assert.ok(Number((await page.locator('#clock').textContent()).split('/')[0])>=2);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const catalog=await (await page.request.get('http://127.0.0.1:8772/cellmotion-catalog.json')).json();assert.equal(catalog.effects.find(e=>e.id==='bubble-frame').status,'ready');assert.equal(catalog.recent[0].id,'bubble-frame');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,phases,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
