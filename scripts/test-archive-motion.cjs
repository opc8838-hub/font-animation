// Run: node scripts/test-archive-motion.cjs [playwright-package-path] [browser-executable]
// Uses an ephemeral local server; writes no source assets and never deploys.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.argv[2] || 'playwright');
const root = path.resolve(__dirname, '../site');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.gif':'image/gif','.mp4':'video/mp4','.woff2':'font/woff2','.jpg':'image/jpeg'};
const server = http.createServer(async (req,res) => {
  try {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await fs.readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'}).end(body);
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
  const failures = [];
  const evidence=path.resolve(__dirname,'../output/archive-import');
  await fs.mkdir(evidence,{recursive:true});
  try {
    for (const [slug,count] of [['botvoice',1],['blockflow',8],['patentwall',196],['patentcount',63],['animalwave',59]]) {
      const page = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
      page.on('pageerror',error=>failures.push(slug + ': ' + error.message));
      page.on('console',message=>{if(message.type()==='error')failures.push(slug + ': ' + message.text());});
      await page.goto(base + '/' + slug + '.html?from=gallery');
      await page.waitForFunction(()=>window.CardMotionEditor);
      assert.equal(await page.evaluate(()=>CardMotionEditor.getScheme().cards.length),count);
      const preset = await page.evaluate(async slug=>(await (await fetch('assets/presets/'+slug+'-default.json')).json()),slug);
      assert.deepEqual(await page.evaluate(()=>CardMotionEditor.getScheme()),preset,'immutable gallery preset');
      const desktop = await page.evaluate(()=>{const stage=document.querySelector('.gm-stage').getBoundingClientRect(),canvas=document.querySelector('#canvas').getBoundingClientRect(),left=document.querySelector('.tc-content').getBoundingClientRect(),right=document.querySelector('#inspector').getBoundingClientRect();return {left:left.width,right:right.width,separate:left.right<stage.left&&stage.right<right.left,inspectorVisible:getComputedStyle(document.querySelector('#inspector')).display!=='none',offset:Math.abs(stage.x+stage.width/2-canvas.x-canvas.width/2)};});
      assert.equal(desktop.left,250);assert.equal(desktop.right,360);assert.equal(desktop.separate,true);assert.equal(desktop.inspectorVisible,true);assert.ok(desktop.offset<1);
      if(slug==='animalwave'||slug==='patentwall'){
        const portrait=await page.evaluate(slug=>{const c=document.createElement('canvas');c.width=1080;c.height=1920;const g=c.getContext('2d',{willReadFrequently:true});CardMotionEditor.draw(g,slug==='animalwave'?.6:.8,1080,1920);const data=g.getImageData(0,0,1080,1920).data;let left=1080,right=0,top=1920,bottom=0;for(let y=0;y<1920;y+=2)for(let x=0;x<1080;x+=2){const i=(y*1080+x)*4;if(data[i]+data[i+1]+data[i+2]<690){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}return{width:right-left,height:bottom-top};},slug);
        assert.ok(portrait.width>(slug==='animalwave'?800:400),`${slug}: portrait subject must be readable`);
        await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();s.canvas={width:1080,height:1920};await CardMotionEditor.apply(s);});
        const [portraitPng]=await Promise.all([page.waitForEvent('download',{timeout:120000}),page.evaluate(()=>CardMotionEditor.exportFile('png'))]);
        const bytes=await fs.readFile(await portraitPng.path());
        assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1080,1920],'portrait PNG dimensions');
        await page.evaluate(s=>CardMotionEditor.apply(s),preset);
      }
      if(slug!=='botvoice'){
        const first=await page.evaluate(()=>CardMotionEditor.getScheme().cards[0].caption);
        await page.locator('#currentAssetCaption').fill('校对文字');
        assert.equal(await page.evaluate(()=>CardMotionEditor.getScheme().cards[0].caption),'校对文字','current asset field updates selected item');
        await page.locator('#currentAssetCaption').fill(first);
      }
      if(slug==='patentwall') {
        const changed=await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();CardMotionEditor.seek(.2);const before=document.querySelector('#canvas').toDataURL();s.cards[0].opacity=.15;await CardMotionEditor.apply(s);CardMotionEditor.seek(.2);return before!==document.querySelector('#canvas').toDataURL();});
        assert.equal(changed,true,'flip cover responds to per-asset opacity');
        assert.equal(new Set(preset.cards.map(card=>card.libraryId)).size,196,'every wall card uses a distinct asset');
        await page.evaluate(s=>CardMotionEditor.apply(s),preset);
      }
      if(slug==='blockflow') {
        const changed=await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();CardMotionEditor.seek(1.5);const before=document.querySelector('#canvas').toDataURL();s.scene.flowSpeed=2;s.scene.waveHeight=1.5;s.cards.push({...s.cards[0],id:'extra-block',libraryId:'rainbow-ring'});await CardMotionEditor.apply(s);CardMotionEditor.seek(1.5);return {changed:before!==document.querySelector('#canvas').toDataURL(),count:CardMotionEditor.getScheme().cards.length};});
        assert.deepEqual(changed,{changed:true,count:9},'add a block and edit its flow');
        await page.evaluate(s=>CardMotionEditor.apply(s),preset);
      }
      if(slug==='patentcount') {
        assert.equal(new Set(preset.cards.map(card=>card.libraryId)).size,63,'default patent artworks are unique');
        const changed=await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();CardMotionEditor.seek(4.1);const before=document.querySelector('#canvas').toDataURL();s.scene.title='已授权专利';s.scene.countTo=12345;s.cards[0].libraryId='patentwall-work-010';await CardMotionEditor.apply(s);CardMotionEditor.seek(4.1);return before!==document.querySelector('#canvas').toDataURL();});
        assert.equal(changed,true,'editable title, count, and hero artwork render');
        await page.evaluate(s=>CardMotionEditor.apply(s),preset);
      }
      if(slug==='animalwave') {
        const changed=await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();CardMotionEditor.seek(2.8);const before=document.querySelector('#canvas').toDataURL();s.scene.captionMode='text';s.scene.many='我们有 {count} 位关注者';s.scene.countStart=1200;s.scene.countStep=10;s.cards[0].caption='小明';await CardMotionEditor.apply(s);CardMotionEditor.seek(2.8);return before!==document.querySelector('#canvas').toDataURL();});
        assert.equal(changed,true,'editable follower count and caption render');
        await page.evaluate(s=>CardMotionEditor.apply(s),preset);
      }
      const phases = await page.evaluate(()=>CardMotion.phases(CardMotionEditor.getScheme()));
      for (const phase of phases) await page.evaluate(t=>CardMotionEditor.seek(t),phase.start+phase.duration*.5);
      await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();s.typography.fontFamily='stg:noto-sc';s.cards[0].caption='你好世界';s.scene.clock='你好';s.scene.brandA='动物';s.scene.brandB='朋友';await CardMotionEditor.apply(s);CardMotionEditor.seek(.8);});
      const [png] = await Promise.all([page.waitForEvent('download',{timeout:120000}),page.evaluate(()=>CardMotionEditor.exportFile('png'))]);
      assert.ok((await fs.stat(await png.path())).size>3000,'nonempty Chinese PNG export');
      await png.saveAs(path.join(evidence,slug+'-chinese.png'));
      await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();s.canvas={width:320,height:320};await CardMotionEditor.apply(s);document.querySelector('#exportDuration').value='custom';document.querySelector('#customDuration').value='1';document.querySelector('#exportFps').value='15';});
      const [gifDownload] = await Promise.all([page.waitForEvent('download',{timeout:120000}),page.evaluate(()=>CardMotionEditor.exportFile('gif'))]);
      const gifBytes=await fs.readFile(await gifDownload.path());
      await gifDownload.saveAs(path.join(evidence,slug+'-320x320.gif'));
      const gifDuration=await page.evaluate(async bytes=>{const delays=await CellMotionAnimatedImage.readGifFrameDurations(new Blob([new Uint8Array(bytes)],{type:'image/gif'}));return delays.reduce((a,b)=>a+b,0);},[...gifBytes]);
      assert.equal(gifDuration,1000,'GIF duration must not accumulate frame-rounding drift');
      await page.locator('#clearScheme').click();
      assert.equal(await page.evaluate(()=>CardMotionEditor.getScheme().cards.length),0);
      await page.locator('#restoreScheme').click();
      await page.waitForFunction(n=>CardMotionEditor.getScheme().cards.length===n,count);
      assert.deepEqual(await page.evaluate(()=>CardMotionEditor.getScheme()),preset,'reset restores complete preset');
      await page.setViewportSize({width:390,height:844});
      assert.deepEqual(await page.evaluate(()=>({fits:document.documentElement.scrollWidth===innerWidth,stageAbove:document.querySelector('.gm-stage').getBoundingClientRect().top<document.querySelector('.tc-content').getBoundingClientRect().top})),{fits:true,stageAbove:true});
      await page.setViewportSize({width:1440,height:1000});
      await page.locator('#openLibrary').click();
      for (const id of ['rainbow-ring','collision-hand']) {
        const group=page.locator('#libraryGroups details').filter({has:page.locator('[data-insert="'+id+'"]')});
        if(await group.getAttribute('open')===null)await group.locator('summary').click();
        await page.locator('[data-insert="'+id+'"]').click();
      }
      await page.waitForFunction(n=>CardMotionEditor.getScheme().cards.length===n,count+2);
      assert.equal(await page.evaluate(()=>CardMotionEditor.resources.get('rainbow-ring').kind),'vector');
      // Streaming ImageDecoder used to return a partial frameCount nondeterministically.
      const gif = await page.evaluate(async()=>{const a=STGIconLibrary.byId.get('collision-hand');const blob=await (await fetch(a.url)).blob();return {expected:(await CellMotionAnimatedImage.readGifFrameDurations(blob)).length,actual:CardMotionEditor.resources.get(a.libraryId).animated.frames.length};});
      assert.equal(gif.actual,gif.expected,'GIF must decode every source frame');
      await page.keyboard.press('Escape');
      await page.locator('#aiButton').click();
      const [demo] = await Promise.all([page.waitForEvent('popup'),page.locator('[data-ai="preview"]').click()]);
      await demo.waitForFunction(()=>document.querySelector('#demoStatus')?.textContent.includes('已就绪'));
      await demo.close();
      const manifest=await page.evaluate(async()=>CellMotionAI.validate(await CardMotionEditor.manifest()));
      assert.deepEqual(manifest,{valid:true,errors:[]});
      console.log('PASS '+slug+' preset, phases, Chinese PNG/GIF timing, reset, desktop/mobile, vector/GIF, AI preview');
      await page.close();
    }
    assert.deepEqual(failures,[],'browser errors');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
