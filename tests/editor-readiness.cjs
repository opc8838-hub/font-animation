const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const root=process.argv[4]||'http://127.0.0.1:8772';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const results=[];
 try{
  const home=await browser.newPage({viewport:{width:1906,height:938}});
  const session=await home.context().newCDPSession(home);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions',{offline:false,latency:120,downloadThroughput:125000,uploadThroughput:125000});
  console.log('slow-home-start');
  await home.goto(root+'/',{waitUntil:'domcontentloaded',timeout:15000});
  await home.locator('#motion-showcase').scrollIntoViewIfNeeded();
  await home.waitForFunction(()=>[...document.querySelectorAll('.ribbon-card')].filter(c=>{const r=c.getBoundingClientRect();return r.left<innerWidth&&r.right>0}).every(c=>c.querySelector('img').naturalWidth>0),null,{timeout:15000});
  const ribbon=await home.evaluate(()=>({sources:[...document.querySelectorAll('.ribbon-card video')].filter(v=>v.hasAttribute('src')).length,names:[...document.querySelectorAll('.ribbon-placeholder')].map(s=>s.textContent)}));
  assert.ok(ribbon.sources<=2,'Slow-network video requests must stay bounded');
  assert.ok(ribbon.names.length>5&&ribbon.names.every(Boolean),'A missing poster must retain a readable effect name');
  console.log('slow-home-done');results.push({page:'home at 1 Mbit/s',...ribbon});await home.close();
  for(const file of ['bubble-frame.html','typecascade.html']){
   console.log('editor-start',file);const page=await browser.newPage(),requests=[],errors=[];
   page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
   await page.goto(root+'/'+file,{waitUntil:'networkidle',timeout:12000});
   assert.ok(await page.locator('canvas').count());
   assert.ok(!requests.some(u=>/NotoSansSC-(Regular|Black)\.ttf|NotoSansJP-Thin\.otf|NotoSans(SC-Regular|JP-Thin)\.woff2/.test(u)),'Initial editor must not download complete CJK fonts');
   assert.ok(!requests.some(u=>u.includes('/h264-mp4-encoder.web.js')),'MP4 encoder must wait for export');
   if(file==='bubble-frame.html'){
    await page.locator('#text').fill('中文界面');await page.locator('#pauseEdit').click();
    await page.evaluate(()=>STGFontLibrary.load('stg:noto-sc','中文界面'));
    assert.equal(await page.locator('#text').inputValue(),'中文界面');
   }
   assert.deepEqual(errors,[]);results.push({page:file,fontFiles:requests.filter(u=>/Noto/.test(u)),errors});await page.close();
  }
  const upgrade=await browser.newPage();
  const source=await (await upgrade.request.get(root+'/')).text();
  await upgrade.route('http://cellmotion.cn/**',r=>r.fulfill({contentType:'text/html',body:source}));
  await upgrade.route('https://cellmotion.cn/**',r=>r.fulfill({contentType:'text/html',body:'<title>HTTPS destination</title>'}));
  await upgrade.goto('http://cellmotion.cn/editor.html?from=old#timeline',{waitUntil:'domcontentloaded'});
  await upgrade.waitForURL('https://cellmotion.cn/editor.html?from=old#timeline',{timeout:5000});
  results.push({page:'HTTP upgrade',url:upgrade.url()});
  console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
