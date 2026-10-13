/* Run against scripts/preview-typepour.cjs. PLAYWRIGHT_MODULE and CHROMIUM_PATH are optional. */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const base=process.env.TYPEPOUR_URL||'http://127.0.0.1:4179';
 await page.goto(base+'/typepour.html');await page.evaluate(()=>TypePourEditor.readyPromise);
 const initial=await page.evaluate(()=>TypePourEditor.getScheme());
 assert.deepEqual(initial.canvas,{width:1080,height:1920});
 assert.equal(await page.locator('.tc-scheme button').count(),4);
 assert.ok(await page.locator('#font option').count()>100);
 const prototype=await browser.newPage();await prototype.goto(base+'/typepour-prototype.html');await prototype.waitForFunction(()=>window.TypePour?.state.ready);
 const render=()=>{const c=document.createElement('canvas');c.width=1080;c.height=1920;TypePour.renderFrame(c,5);return c.toDataURL();};
 assert.equal(await page.evaluate(render),await prototype.evaluate(render),'approved portrait must remain pixel-identical');
 await page.locator('#pureVariant').click();await page.evaluate(()=>TypePourEditor.whenIdle());assert.equal(await page.evaluate(()=>TypePour.style.squares),0);
 await page.locator('#undo').click();await page.evaluate(()=>TypePourEditor.whenIdle());assert.equal(await page.evaluate(()=>TypePour.style.squares),.84);
 await page.locator('#redo').click();await page.evaluate(()=>TypePourEditor.whenIdle());assert.equal(await page.evaluate(()=>TypePour.style.squares),0);
 await page.locator('#text').fill('文字像水一样流动。');await page.locator('#text').dispatchEvent('change');await page.evaluate(()=>TypePourEditor.whenIdle());
 assert.equal(await page.evaluate(()=>TypePourEditor.scheme.rows[0].text),'文字像水一样流动。');
 await page.evaluate(async s=>{s.motion.pour=8;s.extension={roundTrip:true};await TypePourEditor.applyScheme(s);},initial);
 assert.equal(await page.evaluate(()=>TypePourEditor.duration),13.25);assert.equal(await page.evaluate(()=>TypePourEditor.getScheme().extension.roundTrip),true);
 await page.locator('#resetScheme').click();await page.evaluate(()=>TypePourEditor.whenIdle());assert.deepEqual(await page.evaluate(()=>TypePourEditor.getScheme()),initial);
 await page.locator('#clearScheme').click();await page.evaluate(()=>TypePourEditor.whenIdle());assert.equal(await page.evaluate(()=>TypePourEditor.scheme.rows[0].text),'');
 await page.locator('#resetScheme').click();await page.evaluate(()=>TypePourEditor.whenIdle());
 await page.locator('#openLibrary').click();await page.locator('#assetGrid button').first().click();assert.equal(await page.evaluate(()=>TypePourEditor.scheme.rows[0].icons.length),0,'selection must not insert');
 await page.locator('#insertAsset').click();await page.evaluate(()=>TypePourEditor.whenIdle());assert.equal(await page.evaluate(()=>TypePourEditor.scheme.rows[0].icons.length),1);await page.locator('#closeLibrary').click();
 await page.evaluate(s=>TypePourEditor.applyScheme(s),initial);
 await page.locator('#language').click();await page.locator('#theme').click();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile overflow');
 await page.setViewportSize({width:1440,height:1000});
 await page.addScriptTag({url:base+'/cellmotion-player.js'});
 await page.evaluate(async()=>{const definition=await fetch('effects/typepour.component.json').then(r=>r.json());const manifest=CellMotionAI.createManifest({definition,scheme:TypePourEditor.getScheme()});manifest.composition.rows[0].text='AI </script><script>window.bad=1</script>';manifest.presentation.autoplay=false;window.player=document.createElement('cellmotion-player');player.style.cssText='position:fixed;top:0;width:300px;height:533px';document.body.append(player);player.manifest=manifest;});
 const frame=await (async()=>{await page.waitForFunction(()=>player.duration===12);return page.frames().find(f=>f.url().includes('embed=1'));})();
 await frame.waitForFunction(()=>TypePourEditor.scheme.rows[0].text.startsWith('AI'));
 assert.equal(await frame.evaluate(()=>window.bad),undefined);assert.equal(await frame.evaluate(()=>TypePour.state.playing),false);
 await page.evaluate(()=>player.seek(5));await frame.waitForFunction(()=>TypePour.state.time===5);
 await page.evaluate(()=>player.update({...player.manifest.composition,motion:{...player.manifest.composition.motion,pour:8}}));await page.waitForFunction(()=>player.duration===13.25);
 assert.deepEqual(errors,[]);console.log('PASS: approved pixels, native scheme round-trip, fonts, Chinese, history, assets, mobile and actual AI player.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
