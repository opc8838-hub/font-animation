/* Run after the video/audio regressions. Args: node_modules Edge [Ajv node_modules]. */
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const Ajv=require(path.resolve(process.argv[4]||'node_modules','ajv/dist/2020')).default;
const root=path.resolve(__dirname,'..'),site=path.join(root,'site'),out=path.join(root,'output/video-compare/ai-regression');
(async()=>{
 await fs.mkdir(out,{recursive:true});let configured='';
 const serve=()=>http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/configured.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta charset="utf-8"><title>Configured component</title><button id="hostPlay" onclick="document.querySelector(\'cellmotion-player\').play()">Play</button>'+configured);}
  const file=path.resolve(site,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(site+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 const server=serve(),external=serve();await Promise.all([new Promise(r=>server.listen(0,'127.0.0.1',r)),new Promise(r=>external.listen(0,'127.0.0.1',r))]);
 const base='http://127.0.0.1:'+server.address().port,other='http://127.0.0.1:'+external.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});const context=await browser.newContext({viewport:{width:1440,height:960},permissions:['clipboard-read','clipboard-write']});
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));const page=await context.newPage();
 const ok=s=>console.log('PASS '+s);
 try{
  await page.goto(base+'/video-compare.html',{waitUntil:'domcontentloaded'});await page.waitForSelector('.tc-ai-trigger');await page.evaluate(()=>VideoCompare.readyPromise);
  const scheme=JSON.parse(await fs.readFile(path.join(root,'output/video-compare/audio-regression/audio-scheme.json'),'utf8'));
  await page.evaluate(s=>VideoCompare.applyScheme(s),scheme);
  await page.locator('.tc-row-select[data-row-id="before"]').click();await page.locator('.vc-row[data-row-id="before"] [data-key="text"]').fill('Before 原作');await page.locator('.vc-row[data-row-id="before"] [data-key="caption"]').fill('网上看到的 · AI 实时配置');
  await page.locator('.tc-row-select[data-row-id="after"]').click();await page.locator('.vc-row[data-row-id="after"] [data-key="caption"]').fill('我做的 · 保留声音选择');
  await page.locator('.tc-tabs [data-panel="global"]').click();await page.locator('#topText').fill('have a good day · AI');await page.locator('#fontFamily').selectOption('stg:noto-sc');await page.locator('#compositionTheme').selectOption('dark');await page.locator('#beforeScale').fill('60');await page.locator('#beforeScale').dispatchEvent('input');
  const expected=await page.evaluate(()=>VideoCompare.getScheme());
  const action=async name=>{await page.locator('.tc-ai-trigger').click();await page.locator('[data-ai-action="'+name+'"]').click();};
  const event=page.waitForEvent('download');await action('json');const download=await event,file=path.join(out,'live-component.json');await download.saveAs(file);const manifest=JSON.parse(await fs.readFile(file,'utf8'));
  assert.deepEqual(manifest.composition,expected);assert.equal(manifest.runtime.kind,'iframe-bridge');assert.equal(manifest.effect.id,'video-compare');assert.equal(manifest.assets.fonts[0].id,'stg:noto-sc');assert.deepEqual(manifest.assets.videos.map(v=>v.rowId),['before','after']);assert.deepEqual(manifest.assets.videos.map(v=>v.audioEnabled),[true,false]);assert.ok(manifest.composition.rows.every(r=>r.media.url.startsWith('data:video/')));assert.ok(manifest.parameterDefinitions.some(p=>p.path==='composition.rows[].media.trimStart'));
  const schema=JSON.parse(await fs.readFile(path.join(site,'schemas/cellmotion-component-v1.schema.json'),'utf8')),validate=new Ajv({strict:false,allErrors:true}).compile(schema);assert.ok(validate(manifest),JSON.stringify(validate.errors));
  const invalid=structuredClone(manifest);invalid.composition.canvas.width=641;assert.equal(validate(invalid),false);assert.equal(await page.evaluate(m=>CellMotionAI.validate(m).valid,invalid),false);
  const duplicate=structuredClone(manifest);duplicate.composition.rows[1].id='before';assert.equal(validate(duplicate),false);assert.equal(await page.evaluate(m=>CellMotionAI.validate(m).valid,duplicate),false);
  ok('authored Manifest preserves every edited native field, video bytes, trims, audio ownership and font; formal schema validates');
  await action('params');assert.equal(await page.locator('.tc-ai-dialog[open]').count(),1);assert.ok((await page.locator('.tc-ai-dialog').textContent()).includes('原视频声音'));await page.keyboard.press('Escape');assert.equal(await page.locator('.tc-ai-dialog[open]').count(),0);
  await action('prompt');const prompt=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(prompt.includes('before/after')&&prompt.includes('声音开关')&&prompt.includes('AI 实时配置'));
  await action('code');configured=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(configured.includes('cellmotion-player.js')&&configured.includes('"audioEnabled": true'));await fs.writeFile(path.join(out,'configured.html'),configured);
  ok('parameter dialog, Escape, copied AI prompt and actual copied configured HTML');
  const popupEvent=page.waitForEvent('popup');await action('preview');const popup=await popupEvent;await popup.waitForFunction(()=>document.querySelector('#demoPlayer')?.duration===1.5);
  const preview=popup.frames().find(f=>f.url().includes('video-compare.html'));assert.ok(preview);assert.deepEqual(await preview.evaluate(()=>VideoCompare.getScheme()),expected);
  assert.equal(await preview.locator('#glyphMorphInspector').isVisible(),false);assert.equal(await preview.locator('.me-stage-controls').isVisible(),false);
  await popup.locator('[data-player-action="pause"]').click();await preview.waitForFunction(()=>VideoCompare.getAudioState().every(r=>r.paused));
  await popup.locator('#demoSeek').evaluate(el=>{el.value='.35';el.dispatchEvent(new Event('input',{bubbles:true}));});await preview.waitForFunction(()=>VideoCompare.getTime()===.35);
  await page.evaluate(()=>VideoCompare.setTime(350));
  const pixels=await page.evaluate(()=>document.querySelector('#glyphMorphCanvas').toDataURL());assert.equal(await preview.evaluate(()=>document.querySelector('#glyphMorphCanvas').toDataURL()),pixels);
  await popup.locator('[data-player-action="play"]').click();await preview.waitForFunction(()=>VideoCompare.getTime()>.5&&VideoCompare.getAudioState().every(r=>!r.paused));assert.deepEqual((await preview.evaluate(()=>VideoCompare.getAudioState())).map(r=>r.muted),[false,true]);
  await popup.locator('[data-player-action="pause"]').click();await preview.waitForFunction(()=>VideoCompare.getAudioState().every(r=>r.paused));
  await popup.locator('[data-player-action="restart"]').click();await preview.waitForFunction(()=>VideoCompare.getTime()<.3&&!VideoCompare.getAudioState()[0].paused);
  const updated=structuredClone(expected);updated.layout.beforeScale=55;updated.rows[1].caption='AI live update';await popup.evaluate(s=>document.querySelector('#demoPlayer').update(s),updated);await preview.waitForFunction(()=>VideoCompare.getScheme().rows[1].caption==='AI live update');assert.equal(await preview.evaluate(()=>VideoCompare.geometry(640,360).boxes[0].w/VideoCompare.geometry(640,360).boxes[1].w),.55);
  ok('real menu popup uses the same renderer: exact paused pixels, play/pause/restart/seek, audible source selection and live updates');
  await preview.evaluate(()=>{const fake={...VideoCompare.getScheme(),layout:{...VideoCompare.getScheme().layout,topText:'REJECT ME'}};for(const [origin,version]of [['https://untrusted.invalid','1.0.0'],[new URL(document.referrer).origin,'0.0.1']])window.dispatchEvent(new MessageEvent('message',{origin,source:parent,data:{type:'cellmotion:update',bridgeVersion:version,composition:fake}}));});
  assert.notEqual(await preview.evaluate(()=>VideoCompare.getScheme().layout.topText),'REJECT ME');
  const host=await context.newPage();await host.goto(other+'/configured.html',{waitUntil:'domcontentloaded'});await host.waitForFunction(()=>document.querySelector('cellmotion-player')?.duration===1.5);
  const embedded=host.frames().find(f=>f.url().includes('video-compare.html'));assert.deepEqual(await embedded.evaluate(()=>VideoCompare.getScheme()),expected);
  await host.locator('#hostPlay').click();await embedded.waitForFunction(()=>!VideoCompare.getAudioState()[0].paused);assert.equal(await embedded.evaluate(()=>VideoCompare.getAudioState()[0].muted),false);
  await host.evaluate(()=>document.querySelector('cellmotion-player').seek(.4));await embedded.waitForFunction(()=>VideoCompare.getTime()===.4);
  assert.equal(await embedded.locator('#glyphMorphInspector').isVisible(),false);
  ok('actual copied code on a different origin configures embedded videos, plays selected sound and seeks; invalid origins/versions are ignored');
  await page.locator('.site-language-toggle').click();await page.waitForFunction(()=>document.body.dataset.editorLanguage==='en');assert.equal(await page.locator('.tc-ai-trigger').textContent(),'For AI');assert.deepEqual(await page.evaluate(()=>VideoCompare.getScheme()),expected);
  await page.locator('.site-theme-toggle').click();assert.deepEqual(await page.evaluate(()=>VideoCompare.getScheme()),expected);
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'header/canvas overflow at '+width);for(const selector of ['.site-theme-toggle','.site-language-toggle','.tc-ai-trigger','.tc-export-shortcut']){const bounds=await page.locator(selector).boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width,selector+' clipped at '+width);}await page.locator('.tc-ai-trigger').click();const rect=await page.locator('.tc-ai-menu').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1);await page.keyboard.press('Escape');}
  await page.screenshot({path:path.join(out,'mobile-ai-editor.png'),fullPage:true});ok('bilingual/light-dark state preservation, mobile header and reachable AI menu at 320–1440 px');
  const home=await context.newPage();await home.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await home.waitForSelector('#recent-grid .recent-card');assert.ok((await home.locator('#recent-grid .recent-card').first().getAttribute('href')).startsWith('video-compare.html'));
  const catalog=JSON.parse(await fs.readFile(path.join(site,'cellmotion-catalog.json'),'utf8'));assert.equal(catalog.recent[0].id,'video-compare');assert.equal(catalog.recent[0].date,'2026-10-14');assert.ok(catalog.effects.find(e=>e.id==='video-compare').webComponent);assert.ok(catalog.effects.find(e=>e.id==='typepour').webComponent);assert.equal(catalog.effects.length,77);
  const direct=await context.newPage();await direct.goto(base+'/typecascade-component-demo.html?effect=video-compare',{waitUntil:'domcontentloaded'});await direct.waitForFunction(()=>document.querySelector('#demoPlayer')?.manifest?.effect.id==='video-compare'&&document.querySelector('#demoPlayer').duration===6);
  assert.deepEqual(errors,[]);ok('homepage first recent release, preserved Type Pour, direct component default and clean browser consoles');
 }finally{await browser.close();server.close();external.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
