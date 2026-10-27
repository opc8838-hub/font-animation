const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
const baseline=require('./bubble-palette-baseline.json');
function lightness(hex){
 const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x>.04045?((x+.055)/1.055)**2.4:x/12.92);
 const [l,m,s]=[[.4122214708,.5363325363,.0514459929],[.2119034982,.6806995451,.1073969566],[.0883024619,.2817188376,.6299787005]].map(row=>Math.cbrt(row.reduce((sum,v,i)=>sum+v*c[i],0)));
 return .2104542553*l+.793617785*m-.0040720468*s;
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const output=path.resolve(__dirname,'../output/bubble-color-balance');fs.mkdirSync(output,{recursive:true});const results={};
 try{
  await page.goto('http://127.0.0.1:8772/bubble-frame.html?from=gallery',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.CellMotionBubbleFrame);await page.evaluate(()=>BubbleFrameScene.ready);
  for(const color of Object.keys(baseline)){
   await page.locator('[data-ink-color="#'+color+'"]').click();
   const result=await page.evaluate(async()=>{
    CellMotionBubbleFrame.seek(.7);const c=document.createElement('canvas');c.width=1184;c.height=690;CellMotionBubbleFrame.render(c,.7);const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const hash=await crypto.subtle.digest('SHA-256',pixels),digest=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
    const mean=(x1,y1,x2,y2)=>{let sum=0,count=0,clipped=0;for(let y=y1*2;y<y2*2;y++)for(let x=x1*2;x<x2*2;x++){const i=(y*c.width+x)*4;sum+=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;count++;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>=254)clipped++;}return {brightness:sum/count,clipped:clipped/count};};
    return {state:CellMotionBubbleFrame.state(),digest,floor:mean(40,290,430,330),ceiling:mean(40,2,300,18),png:c.toDataURL().split(',')[1]};
   });
   fs.writeFileSync(path.join(output,'after-'+color+'.png'),Buffer.from(result.png,'base64'));delete result.png;
   const old=baseline[color],lift=lightness(result.state.backgroundColor)-old.backgroundLightness,floorGain=result.floor.brightness/old.floorBrightness;
   results[color]={background:result.state.backgroundColor,lightnessLift:lift,floorGain,ceiling:result.ceiling,clipped:result.floor.clipped};
   if(['17ff9f','49edff'].includes(color))assert.equal(result.digest,old.pixelsSHA256,'Green/cyan frames must remain unchanged');
   else assert.ok(lift>.025&&lift<.07,'Muted screen colors need a small lightness lift, not a bright wash');
   assert.ok(floorGain>=.999&&floorGain<1.15,'Floor lift must stay gentle');
   if(['ff54dc','bd80ff'].includes(color))assert.ok(floorGain>1.02,'Pink and violet reflections must become more luminous');
   assert.ok(result.ceiling.brightness<=old.ceilingBrightness*1.03,'Ceiling blacks must stay dark');assert.ok(result.floor.clipped<.001,'Floor highlights must not clip');
  }
  for(const [background,expected] of [['#861267','#963079'],['#222244','#222244']]){
   const migration=await browser.newPage();await migration.addInitScript(({background})=>localStorage.setItem('cellmotion-bubble-frame-fluid-v2',JSON.stringify({version:1,state:{text:'KEEP MY WORK',textColor:'#ff54dc',backgroundColor:background}})),{background});
   await migration.goto('http://127.0.0.1:8772/bubble-frame.html',{waitUntil:'domcontentloaded'});await migration.waitForFunction(()=>window.CellMotionBubbleFrame);
   const migrated=await migration.evaluate(()=>CellMotionBubbleFrame.state());assert.equal(migrated.text,'KEEP MY WORK');assert.equal(migrated.backgroundColor,expected);await migration.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'balance.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({results,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
