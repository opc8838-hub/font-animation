/* Run with node tests/video-compare-browser.cjs <node_modules> [browser exe]. */
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const sharp=require(path.resolve(process.argv[2]||'node_modules','sharp'));
const root=path.resolve(__dirname,'..'),site=path.join(root,'site'),out=path.join(root,'output/video-compare/regression');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const filename=path.resolve(site,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!filename.startsWith(site+path.sep))return res.writeHead(403).end();const data=await fs.readFile(filename);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.wasm':'application/wasm','.mp4':'video/mp4'};res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const ok=name=>console.log('PASS '+name);
 try{
 await page.goto(base+'/video-compare.html');await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('.tc-row-select').count(),2);assert.equal(await page.locator('.tc-scheme button').count(),4);ok('shared three-column shell and four scheme actions');
 await page.addScriptTag({url:base+'/js/h264-mp4-encoder.web.js'});
 for(const [name,width,height,seconds]of [['before',320,180,1],['after',180,320,2]]){
  const bytes=await page.evaluate(async({width,height,seconds})=>{const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d'),e=await HME.createH264MP4Encoder();e.width=width;e.height=height;e.frameRate=24;e.kbps=1200;e.outputFilename='fixture.mp4';e.initialize();for(let i=0;i<seconds*24;i++){x.fillStyle='rgb('+(20+i*3)+',140,100)';x.fillRect(0,0,width,height);x.fillStyle='#eee4c9';x.fillRect(10+i*2,30,30,40);e.addFrameRgba(x.getImageData(0,0,width,height).data);}e.finalize();const a=Array.from(e.FS.readFile(e.outputFilename));e.delete();return a;},{width,height,seconds});
  const p=path.join(out,name+'.mp4');await fs.writeFile(p,Buffer.from(bytes));
  await page.locator('.tc-row-select[data-row-id="'+name+'"]').click();await page.locator('.vc-row[data-row-id="'+name+'"] [data-video-file]').setInputFiles(p);
  await page.waitForFunction(id=>VideoCompare.getScheme().rows.find(r=>r.id===id).media?.trimEnd>0,name);await page.waitForFunction(()=>document.querySelector('#schemeStatus').textContent.includes('自动保存'));
 }
 assert.equal(await page.evaluate(()=>VideoCompare.duration()),2);ok('upload landscape and portrait videos; duration follows longer clip');
 await page.locator('.vc-row[data-row-id="after"] [data-key="trimStart"]').fill('0.25');await page.locator('.vc-row[data-row-id="after"] [data-key="trimEnd"]').fill('1.75');await page.locator('.vc-row[data-row-id="after"] [data-key="trimEnd"]').dispatchEvent('input');
 assert.equal(await page.evaluate(()=>VideoCompare.duration()),1.5);await page.evaluate(()=>VideoCompare.setTime(300));
 assert.equal(await page.evaluate(()=>VideoCompare.getTime()),.3);ok('trim updates timing and exact seek');
 await page.locator('.vc-row[data-row-id="after"] [data-key="text"]').fill('After 改进作品');await page.locator('.vc-row[data-row-id="after"] [data-key="caption"]').fill('我的作品');
 await page.locator('.tc-tabs [data-panel="global"]').click();await page.locator('#compositionTheme').selectOption('dark');
 await page.waitForFunction(()=>document.querySelector('#schemeStatus').textContent.includes('自动保存'));
 const saved=await page.evaluate(()=>VideoCompare.getScheme());await page.reload();await page.waitForLoadState('networkidle');await page.waitForFunction(()=>document.querySelector('#schemeStatus').textContent.includes('自动保存'));
 assert.deepEqual(await page.evaluate(()=>VideoCompare.getScheme()),saved);ok('autosave restores labels, both video files, trim, palette and canvas');
 const snapshot=await page.evaluate(()=>JSON.stringify(VideoCompare.getScheme()));await page.locator('.site-language-toggle').click();await page.waitForFunction(()=>document.body.dataset.editorLanguage==='en');await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>JSON.stringify(VideoCompare.getScheme())),snapshot);assert.equal(await page.locator('.tc-tabs [data-panel="global"]').textContent(),'Layout');
 await page.locator('.site-theme-toggle').click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>JSON.stringify(VideoCompare.getScheme())),snapshot);ok('language and editor theme preserve composition and user content');
 const getDownload=async(action,name)=>{const event=page.waitForEvent('download',{timeout:60000});await action();const d=await event;const file=path.join(out,name);await d.saveAs(file);return file;};
 const schemeFile=await getDownload(()=>page.locator('#saveScheme').click(),'scheme.json');await page.locator('#clearScheme').click();await page.waitForFunction(()=>VideoCompare.getScheme().rows.every(r=>r.media===null));await page.locator('#schemeFile').setInputFiles(schemeFile);await page.waitForFunction(()=>document.querySelector('#schemeStatus').textContent==='Scheme imported.');assert.deepEqual(await page.evaluate(()=>VideoCompare.getScheme()),saved);ok('JSON scheme embeds and restores both sources after clear');
 await page.locator('#canvasPreset').selectOption('custom');await page.locator('#canvasWidth').fill('640');await page.locator('#canvasWidth').dispatchEvent('change');await page.locator('#canvasHeight').fill('360');await page.locator('#canvasHeight').dispatchEvent('change');assert.deepEqual(await page.evaluate(()=>VideoCompare.getScheme().canvas),{preset:'custom',width:640,height:360});ok('width-first custom size changes live and export dimensions together');
 await page.evaluate(()=>VideoCompare.setTime(400));const preview=await page.evaluate(()=>document.querySelector('#glyphMorphCanvas').toDataURL());
 await page.locator('.tc-tabs [data-panel="export"]').click();const png=await getDownload(()=>page.locator('#exportPng').click(),'frame.png');const pngInfo=await sharp(png).metadata();assert.equal(pngInfo.width,640);assert.equal(pngInfo.height,360);
 const livePixels=await sharp(Buffer.from(preview.split(',')[1],'base64')).raw().toBuffer(),exportPixels=await sharp(png).raw().toBuffer();assert.deepEqual(exportPixels,livePixels);ok('real PNG equals paused live pixels at selected size');
 await page.locator('#exportDuration').selectOption('custom');await page.locator('#customDuration').fill('0.4');await page.locator('#customDuration').dispatchEvent('change');await page.locator('#exportFps').selectOption('24');
 const mp4=await getDownload(()=>page.locator('#exportMp4').click(),'clip.mp4');const videoInfo=await page.evaluate(async bytes=>{const v=document.createElement('video');v.src=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'video/mp4'}));await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=j;});const result={width:v.videoWidth,height:v.videoHeight,duration:v.duration};URL.revokeObjectURL(v.src);return result;},Array.from(await fs.readFile(mp4)));assert.equal(videoInfo.width,640);assert.equal(videoInfo.height,360);assert.ok(Math.abs(videoInfo.duration-10/24)<.002);ok('real H.264 MP4 decodes with exact dimensions, FPS duration');
 const gif=await getDownload(()=>page.locator('#exportGif').click(),'clip.gif');const gifInfo=await sharp(gif,{animated:true}).metadata();assert.equal(gifInfo.width,640);assert.equal(gifInfo.pageHeight,360);assert.equal(gifInfo.pages,10);ok('real GIF has selected dimensions and ten timed frames');
 await page.locator('#canvasPreset').selectOption('1080x1080');const boxes=await page.evaluate(()=>VideoCompare.geometry(1080,1080).boxes);assert.ok(boxes[1].y>boxes[0].y);assert.ok(Math.abs(boxes[0].w/boxes[0].h-16/9)<.0001);
 const square=await getDownload(()=>page.locator('#exportPng').click(),'square.png');const squareInfo=await sharp(square).metadata();assert.equal(squareInfo.width,1080);assert.equal(squareInfo.height,1080);ok('square layout stacks two 16:9 slots and exports exact square');
 assert.equal(await page.locator('#canvasPreset option[value="1080x1920"]').evaluate(option=>option.disabled),true);
 for(const [width,height]of [[1440,900],[1200,800],[1024,768],[768,1024],[390,844]]){await page.setViewportSize({width,height});await page.waitForFunction(()=>{const s=document.querySelector('#glyphMorphStage').getBoundingClientRect(),f=document.querySelector('#compositionFrame').getBoundingClientRect();return f.left>=s.left&&f.right<=s.right+1&&f.top>=s.top&&f.bottom<=s.bottom+1;},{},{timeout:5000});const fit=await page.evaluate(()=>{const stage=document.querySelector('#glyphMorphStage').getBoundingClientRect(),frame=document.querySelector('#compositionFrame').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,inside:frame.left>=stage.left&&frame.right<=stage.right+1&&frame.top>=stage.top&&frame.bottom<=stage.bottom+1};});assert.equal(fit.overflow,false);assert.equal(fit.inside,true,JSON.stringify({width,height,...fit}));}
 await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});ok('desktop/tablet/mobile no overflow; portrait output stays deferred');
 assert.deepEqual(errors,[]);ok('clean browser runtime');console.log('All Video Compare acceptance checks passed.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
