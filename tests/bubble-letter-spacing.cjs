const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8772/bubble-frame.html');await page.waitForFunction(()=>window.CellMotionBubbleFrame);await page.evaluate(()=>BubbleFrameScene.ready);
  await page.locator('#resetScheme').click();
  const results=await page.evaluate(()=>{
   let items;const render=BubbleFrameFluid.render;BubbleFrameFluid.render=(ctx,list,...rest)=>{items=list;return render(ctx,list,...rest);};CellMotionBubbleFrame.seek(0);BubbleFrameFluid.render=render;
   const c=document.createElement('canvas');c.width=360;c.height=192;const ctx=c.getContext('2d',{willReadFrequently:true}),state=CellMotionBubbleFrame.state();
   let masks,areas;
   const proxy=new Proxy(ctx,{get(target,key){
    if(key==='beginPath')return ()=>{ctx.clearRect(0,0,c.width,c.height);ctx.beginPath();};
    if(key==='fill')return (...args)=>{ctx.fill(...args);const pixels=ctx.getImageData(0,0,c.width,c.height).data,mask=new Uint8Array(c.width*c.height);let area=0;for(let i=0;i<mask.length;i++)if(pixels[i*4+3]>128){mask[i]=1;area++;}masks.push(mask);areas.push(area);};
    const value=target[key];return typeof value==='function'?value.bind(target):value;
   },set(target,key,value){target[key]=value;return true;}});
   const worst=[];let maximumOverlap=0;
   const total=state.lead+state.write+state.restore;
   for(let f=0;f<72;f++){
    masks=[];areas=[];render(proxy,items,state,f/72*total,c.width,c.height);
    for(let i=0;i<masks.length;i++)for(let j=i+1;j<masks.length;j++){
     let overlap=0;for(let p=0;p<masks[i].length;p++)overlap+=masks[i][p]&masks[j][p];
     const ratio=overlap/Math.min(areas[i],areas[j]);maximumOverlap=Math.max(maximumOverlap,ratio);
     if(overlap>2)worst.push({time:Number((f/72*total).toFixed(3)),pair:[i,j],letters:[items[i].ch,items[j].ch],ratio:Number(ratio.toFixed(4)),pixels:overlap});
    }
   }
   worst.sort((a,b)=>b.ratio-a.ratio);return {maximumOverlap,worst:worst.slice(0,12)};
  });
  const output=path.resolve(__dirname,'../output/bubble-research');fs.writeFileSync(path.join(output,'letter-spacing.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  assert.ok(results.maximumOverlap<.005,'Letters must stay separate throughout the full cycle');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
