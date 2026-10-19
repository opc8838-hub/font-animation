/* Run after video-compare-browser.cjs, using the same node_modules / Edge arguments. */
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/video-compare/audio-regression');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const site=path.join(root,'site');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(site,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(site+path.sep))return res.writeHead(403).end();const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]});
 const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(base+'/video-compare.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.VideoCompare&&window.STGFontLibrary);
  const fixtures={};
  for(const name of ['before','after'])fixtures[name]=(await fs.readFile(path.join(root,'output/video-compare/regression',name+'.mp4'))).toString('base64');
  await page.evaluate(async fixtures=>{
   const audio=await import('./video-compare-audio.js');
   const scheme=VideoCompare.getScheme();scheme.canvas={preset:'custom',width:640,height:360};
   scheme.export={duration:'custom',customDuration:1.5,fps:24,shortClip:'hold'};
   for(const row of scheme.rows){
    const before=row.id==='before',length=before?1:2,buffer=new AudioBuffer({numberOfChannels:2,length:48000*length,sampleRate:48000});
    for(let ch=0;ch<2;ch++){const samples=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++)samples[i]=.25*Math.sin(2*Math.PI*(before?(i<24000?220:330):660)*i/48000);}
    const silent=await (await fetch('data:video/mp4;base64,'+fixtures[row.id])).blob();
    const blob=await audio.muxAudio(silent,buffer,24,()=>false);
    const url=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
    row.media={url,name:row.id+'-tone.mp4',fileType:'video/mp4',fit:'contain',zoom:1,panX:.5,panY:.5,trimStart:before?.25:.5,trimEnd:before?.75:2};
   }
   scheme.rows.forEach(row=>delete row.audioEnabled);await VideoCompare.applyScheme(scheme);
  },fixtures);
  await page.waitForFunction(()=>VideoCompare.getAudioState().every(r=>r.hasAudio===true));
  assert.deepEqual(await page.evaluate(()=>VideoCompare.getScheme().rows.map(r=>r.audioEnabled)),[false,true]);
  console.log('PASS legacy schemes default to After audio only; both uploaded AAC tracks detected');
  await page.locator('.tc-row-select[data-row-id="before"]').click();
  await page.locator('[data-row-id="before"].vc-row [data-key="audioEnabled"]').check();
  await page.locator('#togglePlayback').click();await page.waitForTimeout(180);
  const playback=await page.evaluate(()=>VideoCompare.getAudioState());
  assert.ok(playback.every(r=>!r.muted&&!r.paused&&r.volume===.5));
  await page.locator('#togglePlayback').click();
  assert.ok((await page.evaluate(()=>VideoCompare.getAudioState())).every(r=>r.paused));
  console.log('PASS independent sound switch and user-gesture playback, equal preview mix, pause stops audio');
  const spectra=async file=>page.evaluate(async base64=>{
   const input=await (await fetch('data:video/mp4;base64,'+base64)).arrayBuffer();
   const ctx=new AudioContext();
   try{
    const b=await ctx.decodeAudioData(input),samples=b.getChannelData(0),rate=b.sampleRate;
    const windows=[.1,.35,.75,1.25].map(time=>{
     const start=Math.round(time*rate),n=Math.round(.08*rate),data=samples.subarray(start,start+n);
     const energy=f=>{let re=0,im=0;for(let i=0;i<data.length;i++){re+=data[i]*Math.cos(2*Math.PI*f*i/rate);im+=data[i]*Math.sin(2*Math.PI*f*i/rate);}return 2*Math.hypot(re,im)/data.length;};
     return {rms:Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length),hz220:energy(220),hz330:energy(330),hz660:energy(660)};
    });return {duration:b.duration,windows};
   }finally{await ctx.close();}
  },(await fs.readFile(file)).toString('base64'));
  await page.locator('.tc-tabs [data-panel="global"]').click();
  const results={};
  for(const [name,before,after,mode]of [['after',false,true,'hold'],['before',true,false,'hold'],['mixed',true,true,'hold'],['muted',false,false,'hold'],['loop',true,false,'loop']]){
   await page.evaluate(async({before,after,mode})=>{const s=VideoCompare.getScheme();s.rows[0].audioEnabled=before;s.rows[1].audioEnabled=after;s.export.shortClip=mode;await VideoCompare.applyScheme(s);},{before,after,mode});
   const event=page.waitForEvent('download',{timeout:60000});event.catch(()=>{});
   const status=await page.evaluate(async()=>{await VideoCompare.exportComposition('mp4');return document.querySelector('#exportStatus').textContent;});
   assert.ok(/ready|已生成/.test(status),status);const download=await event,file=path.join(out,name+'.mp4');await download.saveAs(file);
   const tracks=await page.evaluate(async base64=>{const m=await import('./js/vendor/mediabunny/mediabunny-1.61.3.min.js');const input=new m.Input({source:new m.BlobSource(await(await fetch('data:video/mp4;base64,'+base64)).blob()),formats:m.ALL_FORMATS});try{return {audio:(await input.getAudioTracks()).length,video:(await input.getVideoTracks()).length,duration:await input.computeDuration()};}finally{input.dispose();}},(await fs.readFile(file)).toString('base64'));
   assert.equal(tracks.video,1);assert.equal(tracks.audio,name==='muted'?0:1);assert.ok(Math.abs(tracks.duration-1.5)<.04);
   if(name!=='muted')results[name]=await spectra(file);
   console.log('PASS actual '+name+' MP4 export: '+JSON.stringify(tracks));
  }
  const a=results.after.windows,b=results.before.windows,m=results.mixed.windows,l=results.loop.windows;
  assert.ok(a[0].hz660>.20&&a[2].hz660>.20&&a[0].hz220<.02&&a[3].hz660>.20);
  assert.ok(b[0].hz220>.20&&b[1].hz330>.20&&b[0].hz660<.02&&b[2].hz330>.20&&b[3].hz330>.20);
  assert.ok(m[0].hz220>.09&&m[0].hz660>.09&&m[2].hz660>.09&&m[2].hz660<.16&&m[3].hz660>.09&&m[3].hz330>.09);
  assert.ok(l[0].hz220>.20&&l[1].hz330>.20&&l[2].hz330>.20&&l[3].hz330>.20);
  await fs.writeFile(path.join(out,'spectra.json'),JSON.stringify(results,null,2));
  console.log('PASS decoded audio frequencies prove source selection, trim, equal mix, automatic short-source loops through the longest trimmed clip');
  // Save the edited switches in the public JSON and reload through the same importer.
  await page.evaluate(async()=>{const s=VideoCompare.getScheme();s.rows[0].audioEnabled=true;s.rows[1].audioEnabled=false;await VideoCompare.applyScheme(s);});
  const event=page.waitForEvent('download');await page.locator('#saveScheme').click();const download=await event,file=path.join(out,'audio-scheme.json');await download.saveAs(file);
  assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')).rows.map(r=>r.audioEnabled),[true,false]);
  await page.locator('#clearScheme').click();await page.waitForFunction(()=>VideoCompare.getScheme().rows.every(r=>!r.media));await page.locator('#schemeFile').setInputFiles(file);
  await page.waitForFunction(()=>VideoCompare.getScheme().rows[0].media&&VideoCompare.getScheme().rows[0].audioEnabled&&!VideoCompare.getScheme().rows[1].audioEnabled);
  await page.locator('.site-language-toggle').click();await page.waitForFunction(()=>document.body.dataset.editorLanguage==='en');
  await page.locator('.tc-row-select[data-row-id="before"]').click();
  assert.equal(await page.locator('[data-row-id="before"].vc-row [data-key="audioEnabled"]').isChecked(),true);
  assert.ok((await page.locator('[data-row-id="before"].vc-row .vc-audio-toggle').textContent()).includes('Source audio'));
  assert.deepEqual(errors,[]);console.log('PASS sound switches survive JSON import, bilingual labels and clean browser console');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
