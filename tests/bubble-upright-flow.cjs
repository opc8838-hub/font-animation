const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const output=path.resolve(__dirname,'../output/bubble-upright');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BUBBLE_URL||'http://127.0.0.1:8784/bubble-frame.html?from=gallery',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.CellMotionBubbleFrame);await page.evaluate(()=>BubbleFrameScene.ready);
  const metrics=await page.evaluate(async()=>{
   const initial=CellMotionBubbleFrame.state(),render=BubbleFrameFluid.render;
   let items;BubbleFrameFluid.render=(ctx,list,...args)=>{items=list;return render(ctx,list,...args);};
   const results=[];
   for(const text of ['VISION','TOO MUCH\nTO WATCH','NEW TYPE\nBIG IDEA','I','MW I MW','ABCDEFGHI\nJKLMNOPQR\nSTUVWXYZ','Too much\nto Watch','abcdefghi\njklmnopqr\nstuvwxyz','OoOo']){
    await CellMotionBubbleFrame.apply({...initial,text,flow:1.5});CellMotionBubbleFrame.seek(0);
    const state=CellMotionBubbleFrame.state(),total=state.lead+state.write+state.restore;
    function capture(at){
     const paths=[];let points=[];
     const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){points=[];},moveTo(){},closePath(){},
      quadraticCurveTo(x,y){points.push([x,y]);},fill(){paths.push(points);}};
     render(ctx,items,state,at,1440,768);return paths;
    }
    let minGap=Infinity,minRowGap=Infinity,minUpright=Infinity,maxStep=0,minWidth=Infinity,minHeight=Infinity;
    let previous;
    for(let f=0;f<=240;f++){
     const paths=capture(f/240*total),bounds=paths.map(p=>({l:Math.min(...p.map(q=>q[0])),r:Math.max(...p.map(q=>q[0])),t:Math.min(...p.map(q=>q[1])),b:Math.max(...p.map(q=>q[1]))}));
     paths.forEach((points,i)=>{
      const source=BubbleFrameFluidOutlines[items[i].ch].flat();
      const left=source.reduce((a,p,j)=>p[0]<source[a][0]?j:a,0),right=source.reduce((a,p,j)=>p[0]>source[a][0]?j:a,0);
      const top=source.reduce((a,p,j)=>p[1]<source[a][1]?j:a,0),bottom=source.reduce((a,p,j)=>p[1]>source[a][1]?j:a,0);
      minUpright=Math.min(minUpright,points[right][0]-points[left][0],points[bottom][1]-points[top][1]);
      if(previous)points.forEach((p,j)=>{maxStep=Math.max(maxStep,Math.hypot(p[0]-previous[i][j][0],p[1]-previous[i][j][1]));});
      if(i&&items[i].row===items[i-1].row)minGap=Math.min(minGap,bounds[i].l-bounds[i-1].r);
     });
     for(let row=1;row<=items.at(-1).row;row++){
      const upper=bounds.filter((b,i)=>items[i].row===row-1),lower=bounds.filter((b,i)=>items[i].row===row);
      minRowGap=Math.min(minRowGap,Math.min(...lower.map(b=>b.t))-Math.max(...upper.map(b=>b.b)));
     }
     if(items.length>=3){
      minWidth=Math.min(minWidth,(Math.max(...bounds.map(b=>b.r))-Math.min(...bounds.map(b=>b.l)))/1440);
      minHeight=Math.min(minHeight,(Math.max(...bounds.map(b=>b.b))-Math.min(...bounds.map(b=>b.t)))/768);
     }
     previous=paths;
    }
    const start=capture(0),end=capture(total);
    const loopError=Math.max(...start.flatMap((p,i)=>p.flatMap((v,j)=>v.map((n,k)=>Math.abs(n-end[i][j][k])))));
    // A reset/hold boundary must not create a velocity jump.
    let boundarySpeed=0;
    for(const at of [0,state.lead*.12,state.lead,state.lead+state.write,total]){
     const before=capture(at-.0001),after=capture(at+.0001);
     before.forEach((p,i)=>p.forEach((v,j)=>v.forEach((n,k)=>{boundarySpeed=Math.max(boundarySpeed,Math.abs(n-after[i][j][k])/.0002);})));
    }
    results.push({text,minGap:Number.isFinite(minGap)?minGap:null,minRowGap:Number.isFinite(minRowGap)?minRowGap:null,minWidth:Number.isFinite(minWidth)?minWidth:null,minHeight:Number.isFinite(minHeight)?minHeight:null,minUpright,maxStep,loopError,boundarySpeed});
   }
   BubbleFrameFluid.render=render;await CellMotionBubbleFrame.apply(initial);return results;
  });
  for(const m of metrics){
   assert.ok(m.minGap===null||m.minGap>2,'Letters must remain separated: '+m.text);
   assert.ok(m.minRowGap===null||m.minRowGap>3,'Packed rows must retain a visible separation: '+m.text);
   assert.ok(m.minWidth===null||m.minWidth>.93,'Packed text must fill the screen width: '+m.text);
   assert.ok(m.minHeight===null||m.minHeight>.87,'Packed text must fill the screen height: '+m.text);
   assert.ok(m.minUpright>0,'Glyph orientation must remain upright: '+m.text);
   assert.ok(m.maxStep<12,'No frame-to-frame jumps: '+m.text);
   assert.equal(m.loopError,0);assert.ok(m.boundarySpeed<.1,'Loop and holds must ease to rest');
  }
  const detailChecks=await page.evaluate(async()=>{
   const state=CellMotionBubbleFrame.state();
   const lower=[...'abcdefghijklmnopqrstuvwxyz'].every(ch=>BubbleFrameFluidOutlines[ch]);
   const distinct=['a','b','d','e','g','h','i','j','m','n','r','t'].every(ch=>JSON.stringify(BubbleFrameFluidOutlines[ch])!==JSON.stringify(BubbleFrameFluidOutlines[ch.toUpperCase()]));
   const roundness=BubbleFrameFluidOutlines.O.map((contour,index)=>Math.max(...contour.map(([x,y])=>Math.abs(((x-50)/(index?17:50))**2+((y-50)/(index?20:50))**2-1))));
   let items;const render=BubbleFrameFluid.render;BubbleFrameFluid.render=(ctx,list,...args)=>{items=list;return render(ctx,list,...args);};
   await CellMotionBubbleFrame.apply({...state,text:'OoAg'});CellMotionBubbleFrame.seek(0);BubbleFrameFluid.render=render;
   const mixedMetrics=items[1].h<items[0].h*.8&&items[3].y+items[3].h>items[2].y+items[2].h;
   BubbleFrameFluid.render=(ctx,list,...args)=>{items=list;return render(ctx,list,...args);};
   await CellMotionBubbleFrame.apply({...state,text:'IiLH'});CellMotionBubbleFrame.seek(0);BubbleFrameFluid.render=render;
   const stemWidths={I:items[0].w/items[3].w,i:items[1].w/items[3].w,L:items[2].w/items[3].w};
   const glyphCanvas=document.createElement('canvas');glyphCanvas.width=glyphCanvas.height=200;
   const glyphContext=glyphCanvas.getContext('2d',{willReadFrequently:true});
   const openings=[['E',70,32],['E',70,68],['F',70,32],['G',85,35],['S',70,32]].map(([ch,x,y])=>{
    glyphContext.clearRect(0,0,200,200);glyphContext.beginPath();
    for(const points of BubbleFrameFluidOutlines[ch]){glyphContext.moveTo(points[0][0]*2,points[0][1]*2);points.slice(1).forEach(p=>glyphContext.lineTo(p[0]*2,p[1]*2));glyphContext.closePath();}
    glyphContext.fill('evenodd');return {ch,alpha:glyphContext.getImageData(x*2,y*2,1,1).data[3]};
   });
   const counters=['B','P','R'].map(ch=>({ch,areas:BubbleFrameFluidOutlines[ch].slice(1).map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2)}));
   const canvas=document.createElement('canvas');canvas.width=2368;canvas.height=1380;
   const seam=[];
   for(const [textColor,backgroundColor] of [['#ff54dc','#963079'],['#17ff9f','#076f45'],['#f1ff38','#89882b']]){
    await CellMotionBubbleFrame.apply({...state,textColor,backgroundColor});CellMotionBubbleFrame.render(canvas,.8);
    const p=canvas.getContext('2d').getImageData(1960,36,2,220).data;let brightestNeutral=0;
    for(let i=0;i<p.length;i+=4)brightestNeutral=Math.max(brightestNeutral,Math.min(p[i],p[i+1],p[i+2]));
    seam.push({textColor,brightestNeutral});
   }
   await CellMotionBubbleFrame.apply(state);return {lower,distinct,roundness,mixedMetrics,stemWidths,openings,counters,seam};
  });
  assert.ok(detailChecks.lower&&detailChecks.distinct&&detailChecks.mixedMetrics,'True lowercase glyphs must retain x-height and descenders');
  assert.ok(detailChecks.stemWidths.I<.38&&detailChecks.stemWidths.i<.36&&detailChecks.stemWidths.L<=.81,'I/i/L must retain slimmer widths in packed text');
  assert.ok(detailChecks.openings.every(sample=>sample.alpha===0),'E/F/G/S openings must remain visible');
  assert.ok(detailChecks.counters.every(({ch,areas})=>areas.length===(ch==='B'?2:1)&&areas.every(area=>area>300)),'B/P/R counters must remain open');
  assert.ok(detailChecks.roundness.every(error=>error<.0001),'O inner and outer contours must be smooth ellipses');
  assert.ok(detailChecks.seam.every(sample=>sample.brightestNeutral<100),'No neutral white fringe along the upper-right screen edge');
  for(const [name,text] of [['one','VISION'],['two','TOO MUCH\nTO WATCH'],['mixed','Too much\nto Watch'],['cjk','流动字体\n荧光舞台']]){
   const frames=await page.evaluate(async text=>{
    await CellMotionBubbleFrame.apply({...CellMotionBubbleFrame.state(),text,textColor:'#17ff9f',backgroundColor:'#076f45'});
    const canvas=document.createElement('canvas');canvas.width=1184;canvas.height=690;
    return [0,.8,1.4,2.3,3.5,4.8].map(t=>{CellMotionBubbleFrame.render(canvas,t);return canvas.toDataURL().split(',')[1];});
   },text);
   frames.forEach((data,i)=>fs.writeFileSync(path.join(output,name+'-'+i+'.png'),Buffer.from(data,'base64')));
  }
  // Exercise real editor exports, preserving the published gallery artifacts.
  await page.evaluate(()=>CellMotionBubbleFrame.apply({...CellMotionBubbleFrame.state(),text:'Oo Flow\nAgileType',width:640,height:360}));
  await page.locator('[data-tab="export"]').click();
  for(const format of ['png','mp4']){
   const download=page.waitForEvent('download',{timeout:120000});await page.locator('#'+format).click();
   await(await download).saveAs(path.join(output,'upright-flow.'+format));await page.waitForFunction(()=>!document.querySelector('#mp4').disabled);
  }
  await page.evaluate(()=>CellMotionBubbleFrame.apply({...CellMotionBubbleFrame.state(),text:'Soft\nMotion',width:320,height:320}));
  await page.locator('#exportFps').selectOption('15',{force:true});
  const download=page.waitForEvent('download',{timeout:120000});await page.locator('#gif').click();
  await(await download).saveAs(path.join(output,'upright-square.gif'));
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({metrics,detailChecks,errors},null,2));
  console.log(JSON.stringify({metrics,detailChecks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
