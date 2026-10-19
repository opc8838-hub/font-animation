// Targeted regression for the 2026-10-19 artwork review.
// Run: node scripts/test-artwork-review.cjs [playwright-package-path] [browser-executable]
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'../site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 try{
  for(const id of ['blockflow','patentwall','patentcount']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/'+id+'.html?from=gallery');
   await page.waitForFunction(()=>window.CardMotionEditor&&CardMotionEditor.getScheme().cards.length>0,null,{timeout:90000});
   const preset=JSON.parse(await fs.readFile(path.join(root,'assets/presets',id+'-default.json'),'utf8'));
   assert.deepEqual(await page.evaluate(()=>CardMotionEditor.getScheme()),preset,id+' default scheme');
   assert.deepEqual(await page.evaluate(async()=>CellMotionAI.validate(await CardMotionEditor.manifest())),{valid:true,errors:[]},id+' For AI manifest');
   if(id==='blockflow'){
    const opening=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1080;c.height=1920;const g=c.getContext('2d',{willReadFrequently:true});CardMotionEditor.draw(g,0,1080,1920);const d=g.getImageData(0,960,1080,1).data;let left=1080,right=0,runs=0,on=false;for(let x=400;x<680;x++){const i=x*4,ink=Math.abs(d[i]-243)+Math.abs(d[i+1]-243)+Math.abs(d[i+2]-243)>20;if(ink){left=Math.min(left,x);right=Math.max(right,x);if(!on)runs++;}on=ink;}return{width:right-left+1,runs};});
    assert.ok(opening.width>=85&&opening.width<=120,'opening block is a single square');
    assert.equal(opening.runs,1,'opening square has no separated bars');
    const added=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=1080;c.height=1920;const g=c.getContext('2d');CardMotionEditor.draw(g,1.65,1080,1920);const before=c.toDataURL();const s=CardMotionEditor.getScheme();s.cards.push({...s.cards[0],id:'extra-block',libraryId:'rainbow-ring',caption:'测试'});s.scene.iconOpacity=.4;await CardMotionEditor.apply(s);CardMotionEditor.draw(g,1.65,1080,1920);return {count:CardMotionEditor.getScheme().cards.length,changed:before!==c.toDataURL()};});
    assert.deepEqual(added,{count:9,changed:true},'added square, icon and caption alter the render');
   }
   if(id==='patentwall'){
    const result=await page.evaluate(()=>{const s=CardMotionEditor.getScheme(),phase=CardMotion.phases(s)[0].duration;const paint=(t,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});CardMotionEditor.draw(g,t,w,h);return g.getImageData(0,0,w,h).data};const a=paint(phase-.001,640,360),b=paint(phase+.001,640,360);let delta=0;for(let i=0;i<a.length;i+=4)delta+=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;delta/=a.length/4;const d=paint(CardMotion.duration(s)-.15,1080,1920);const band=(a,b)=>{let n=0;for(let y=a;y<b;y+=4)for(let x=0;x<1080;x+=4){const i=(y*1080+x)*4;if(d[i]<225||d[i+1]<225||d[i+2]<225)n++;}return n};return{delta,top:band(0,180),bottom:band(1740,1920)};});
    assert.ok(result.delta<3,'flip back face joins the next card without an image cut');
    assert.ok(result.top>500&&result.bottom>500,'9:16 artwork reaches both screen edges');
   }
   if(id==='patentcount'){
    assert.equal(preset.scene.title,'图片数量');assert.equal(preset.backgroundMedia.libraryId,'patentcount-gallery-bg');
    const empty=await page.evaluate(async()=>{const s=CardMotionEditor.getScheme();for(const k of ['title','subtitle','plus','sideA','sideAEn','sideB','sideBEn'])s.scene[k]='';await CardMotionEditor.apply(s);return ['title','subtitle','plus','sideA','sideAEn','sideB','sideBEn'].every(k=>CardMotionEditor.getScheme().scene[k]==='');});
    assert.ok(empty,'all count labels can be cleared');
   }
   assert.deepEqual(errors,[],id+' browser errors');
   console.log('PASS '+id);await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
