/* Run after video-compare-browser.cjs, using the same node_modules / Edge arguments. */
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/video-compare/mobile-upload-regression');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const site=path.join(root,'site');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(site,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(site+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 const page=await browser.newPage({...require(path.resolve(process.argv[2]||'node_modules','playwright')).devices['iPhone 13'],acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(base+'/video-compare.html',{waitUntil:'networkidle'});await page.evaluate(()=>VideoCompare.readyPromise);
  const input=page.locator('.vc-row[data-row-id="before"] [data-video-file]'),name=page.locator('.vc-row[data-row-id="before"] .vc-file-name');
  await input.scrollIntoViewIfNeeded();const picker=page.waitForEvent('filechooser');await page.locator('.vc-upload').first().tap();await picker;console.log('PASS mobile touch opens file picker');
  const bytes=Array.from(await fs.readFile(path.join(root,'output/video-compare/regression/before.mp4')));
  const select=async(type,filename)=>page.evaluate(({bytes,type,filename})=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array(bytes)],filename,{type}));const input=document.querySelector('[data-video-file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));},{bytes,type,filename});
  for(const type of ['', 'application/octet-stream']){
   await select(type,'phone-'+(type?'generic':'empty')+'.MP4');
   await page.waitForFunction(filename=>VideoCompare.getScheme().rows[0].media?.name===filename&&VideoCompare.getScheme().rows[0].media?.trimEnd>0&&document.querySelector('[data-video-file]').value==='','phone-'+(type?'generic':'empty')+'.MP4',{timeout:8000});
   assert.equal(await name.evaluate(e=>e.classList.contains('is-error')),false);assert.equal(await input.inputValue(),'');
   assert.equal(await page.evaluate(()=>VideoCompare.getScheme().rows[0].media.fileType),'video/mp4');
   console.log('PASS real MP4 with '+(type||'empty MIME')+' decodes and allows retry');
  }
  const previous=await page.evaluate(()=>VideoCompare.getScheme().rows[0].media.name);
  await select('text/plain','wrong.txt');await page.waitForFunction(()=>document.querySelector('.vc-file-name').classList.contains('is-error'));
  assert.equal(await input.inputValue(),'');assert.equal(await page.evaluate(()=>VideoCompare.getScheme().rows[0].media.name),previous);console.log('PASS rejected file preserves source and resets picker');
  await page.evaluate(()=>{window.NativeReader=FileReader;window.FileReader=class extends NativeReader{readAsDataURL(file){setTimeout(()=>super.readAsDataURL(file),600);}};});
  await select('video/mp4','slow-phone.mp4');await page.evaluate(()=>document.dispatchEvent(new Event('tc-languagechange')));
  assert.match(await name.textContent(),/读取|Reading/);assert.equal(await name.getAttribute('aria-busy'),'true');
  await page.waitForFunction(()=>VideoCompare.getScheme().rows[0].media?.name==='slow-phone.mp4'&&document.querySelector('[data-video-file]').value==='');
  assert.equal(await name.getAttribute('aria-busy'),'false');await page.evaluate(()=>window.FileReader=NativeReader);console.log('PASS reading status survives UI refresh and clears after decode');
  const pixel=await page.evaluate(()=>{const c=document.querySelector('#glyphMorphCanvas'),b=VideoCompare.geometry(c.width,c.height).boxes[0];VideoCompare.renderFrame();return Array.from(c.getContext('2d').getImageData(Math.round(b.x+b.w/2),Math.round(b.y+b.h/2),1,1).data);});assert.ok(pixel[1]>100&&pixel[1]>pixel[0]);
  await page.screenshot({path:path.join(out,'mobile-upload.png'),fullPage:true});assert.deepEqual(errors,[]);console.log('PASS decoded source is visible and browser console is clean');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
