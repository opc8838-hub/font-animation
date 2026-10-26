const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
 const output=path.resolve(__dirname,'../output/bubble-fluid');fs.mkdirSync(output,{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8772/bubble-frame.html');await page.waitForFunction(()=>window.CellMotionBubbleFrame);
  await page.evaluate(()=>BubbleFrameScene.ready);await page.locator('#resetScheme').click();
  assert.equal(await page.locator('#captionLeft,#captionRight,#footer,#thickness,#hold,#endHold').count(),0);
  assert.equal(await page.locator('.me-choreo-block').count(),3);
  const capture=async(name,time)=>{
   const encoded=await page.evaluate(t=>{CellMotionBubbleFrame.seek(t);const c=document.createElement('canvas');c.width=1184;c.height=690;CellMotionBubbleFrame.render(c,t);return c.toDataURL('image/png').split(',')[1];},time);
   fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(encoded,'base64'));
  };
  for(const [name,time] of [['pink-start',0],['pink-flow',.7],['pink-twist',2.2],['pink-reflow',3.8]])await capture(name,time);
  const continuity=await page.evaluate(()=>{
   const phases=CellMotionBubbleFrame.phases(),total=phases.reduce((s,p)=>s+p.length,0);
   const c=document.createElement('canvas');c.width=592;c.height=345;const ctx=c.getContext('2d',{willReadFrequently:true});
   CellMotionBubbleFrame.render(c,0);const start=ctx.getImageData(0,0,592,345).data;
   CellMotionBubbleFrame.render(c,total);const end=ctx.getImageData(0,0,592,345).data;
   let loopError=0;for(let i=0;i<start.length;i++)loopError=Math.max(loopError,Math.abs(start[i]-end[i]));
   const occupancy=[];for(let frame=0;frame<24;frame++){
    CellMotionBubbleFrame.render(c,frame/24*total);const p=ctx.getImageData(0,0,592,345).data;let filled=0,area=0;
    for(let x=103;x<488;x++){const u=(x-101)/389;for(let y=Math.ceil(107-100*u*u);y<235+50*u*u;y++){
     const i=(y*592+x)*4;area++;if(p[i]>160&&p[i+2]>120)filled++;
    }}occupancy.push(filled/area);
   }
   return {loopError,minimumOccupancy:Math.min(...occupancy),maximumOccupancy:Math.max(...occupancy),occupancy};
  });
  assert.equal(continuity.loopError,0);assert.ok(continuity.minimumOccupancy>.35,'Letters must stay spread across the LED screen');
  for(const name of ['荧光黄','荧光绿','电光青','荧光橙','电光紫','荧光粉']){
   await page.getByRole('button',{name,exact:true}).click();
   const state=await page.evaluate(()=>CellMotionBubbleFrame.state()),rgb=[1,3,5].map(i=>parseInt(state.backgroundColor.slice(i,i+2),16));
   assert.ok(Math.max(...rgb)>=105,'Every neon preset needs a visibly colored screen');
   assert.ok(Math.max(...rgb)-Math.min(...rgb)>70,'The screen must retain its palette hue');
   await capture('color-'+state.textColor.slice(1),0);
  }
  await page.locator('#textColor').fill('#ff3377');await page.locator('#textColor').dispatchEvent('input');
  assert.notEqual((await page.evaluate(()=>CellMotionBubbleFrame.state())).backgroundColor,'#861267','Custom foreground colors also pair the screen color');
  await page.getByRole('button',{name:'荧光粉',exact:true}).click();
  for(const [name,text] of [['custom','SOFT\nMOTION'],['single','R'],['source-short','TOO MUCH'],['chinese','流动字体\n荧光舞台']]){
   await page.locator('#text').fill(text);await page.locator('#pauseEdit').click();await page.evaluate(()=>document.fonts.ready);
   await capture(name,2.5);assert.equal(await page.evaluate(()=>CellMotionBubbleFrame.state().text),text);
  }
  const shortText=await page.evaluate(()=>{
   const original=BubbleFrameFluid.render;
   let boxes=[];
   BubbleFrameFluid.render=(ctx,items,...rest)=>{boxes=items.map(({ch,x,y,w,h,reference})=>({ch,x,y,w,h,reference}));return original(ctx,items,...rest);};
   const inspect=text=>{document.querySelector('#text').value=text;document.querySelector('#text').dispatchEvent(new Event('input',{bubbles:true}));CellMotionBubbleFrame.seek(0);return boxes;};
   const result={single:inspect('R'),short:inspect('HI'),reference:inspect('TOO MUCH\nTO WATCH'),sameCount:inspect('NEW TYPE\nBIG IDEA')};
   BubbleFrameFluid.render=original;
   return result;
  });
  const single=shortText.single[0];
  assert.ok(single.x>.25&&single.x+single.w<.75,'One letter stays centered instead of filling the LED width');
  assert.ok(single.w*600/(single.h*320)<1.15,'One letter retains a readable physical aspect ratio');
  assert.ok(shortText.short[0].x>.1&&shortText.short.at(-1).x+shortText.short.at(-1).w<.9,'Short rows stay centered');
  assert.ok(shortText.reference.every(g=>g.reference),'Default retains the asymmetric source packing');
  assert.ok(shortText.reference[0].h>.8&&shortText.reference[1].w<.1,'Tall T spans rows beside a tucked small O');
  assert.ok(shortText.sameCount.every(g=>g.reference),'Replacement phrases with matching counts inherit the same packing');
  assert.ok(await page.evaluate(()=>[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].every(ch=>BubbleFrameFluidOutlines[ch])),'All Latin letters and digits use upright rounded masters');
  const landmarks=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=c.height=100;const ctx=c.getContext('2d',{willReadFrequently:true});
   const filled=(ch,x,y)=>{ctx.clearRect(0,0,100,100);ctx.beginPath();for(const p of BubbleFrameFluidOutlines[ch]){ctx.moveTo(...p[0]);p.slice(1).forEach(q=>ctx.lineTo(...q));ctx.closePath();}ctx.fill('evenodd');return ctx.getImageData(x,y,1,1).data[3]>128;};
   return {Ocounter:!filled('O',50,50),Cmouth:!filled('C',95,50),Cspine:filled('C',10,50),Uopening:!filled('U',50,10),Ubowl:filled('U',50,90),Hopening:!filled('H',50,10),Hbar:filled('H',50,50)};
  });
  assert.ok(Object.values(landmarks).every(Boolean),'Letter openings, bowls and crossbars must remain distinguishable: '+JSON.stringify(landmarks));
  await page.locator('#resetScheme').click();await page.evaluate(()=>CellMotionBubbleFrame.seek(0));
  await page.screenshot({path:path.join(output,'editor.png')});
  const migration=await browser.newPage();
  await migration.addInitScript(()=>localStorage.setItem('cellmotion-bubble-frame-fluid-v1',JSON.stringify({version:1,state:{text:'KEEP MY TEXT',textColor:'#f1ff38',backgroundColor:'#252b12'}})));
  await migration.goto('http://127.0.0.1:8772/bubble-frame.html');await migration.waitForFunction(()=>window.CellMotionBubbleFrame);
  const migrated=await migration.evaluate(()=>CellMotionBubbleFrame.state());assert.equal(migrated.text,'KEEP MY TEXT');assert.equal(migrated.backgroundColor,'#797914');await migration.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({errors,...continuity},null,2));
  console.log(JSON.stringify({ok:true,errors,...continuity}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
