/* Run after video-compare-browser.cjs, using the same node_modules / Edge arguments. */
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/video-compare/recording-regression');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const site=path.join(root,'site');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(site,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(site+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(base+'/video-compare.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.VideoCompare);
  const source=Array.from(await fs.readFile(path.join(root,'output/video-compare/regression/before.mp4')));
  const fixture=await page.evaluate(async({bytes,base})=>{const {FFmpeg}=await import('./js/vendor/ffmpeg/ffmpeg/index.js');const ff=new FFmpeg();try{await ff.load({coreURL:base+'/js/vendor/ffmpeg/core/ffmpeg-core.js',wasmURL:base+'/js/vendor/ffmpeg/core/ffmpeg-core.wasm'});await ff.writeFile('source.mp4',new Uint8Array(bytes));const code=await ff.exec(['-i','source.mp4','-c:v','mpeg4','-q:v','3','-threads','1','recording.mp4']);if(code)throw Error('Cannot create fixture');return Array.from(await ff.readFile('recording.mp4'));}finally{ff.terminate();}},{bytes:source,base});
  const file=path.join(out,'screen-mpeg4.mp4');await fs.writeFile(file,Buffer.from(fixture));
  await page.locator('[data-video-file]').first().setInputFiles(file);
  await page.waitForFunction(()=>document.querySelector('.vc-file-name').classList.contains('is-error')||(document.querySelector('.vc-file-name').getAttribute('aria-busy')==='false'&&document.querySelector('.vc-file-name').textContent.includes('320')),null,{timeout:120000});
  assert.equal(await page.locator('.vc-file-name').first().evaluate(e=>e.classList.contains('is-error')),false,await page.locator('.vc-file-name').first().textContent());
  const pixel=await page.evaluate(()=>{const c=document.querySelector('#glyphMorphCanvas'),b=VideoCompare.geometry(c.width,c.height).boxes[0];VideoCompare.renderFrame();return Array.from(c.getContext('2d').getImageData(Math.round(b.x+b.w/2),Math.round(b.y+b.h/2),1,1).data);});assert.ok(pixel[1]>100&&pixel[1]>pixel[0]);console.log('PASS MPEG-4 recording uploads and displays its actual picture');
  const codec=await page.evaluate(async()=>{const m=await import('./js/vendor/mediabunny/mediabunny-1.61.3.min.js');const input=new m.Input({source:new m.BlobSource(await (await fetch(VideoCompare.getScheme().rows[0].media.url)).blob()),formats:m.ALL_FORMATS});try{return (await input.getPrimaryVideoTrack()).codec;}finally{input.dispose();}});assert.equal(codec,'avc');console.log('PASS unsupported MPEG-4 recording is converted to native-compatible H.264');assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
