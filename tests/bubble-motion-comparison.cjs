const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.resolve(process.argv[2]||'node_modules','playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.argv[3]||undefined});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8772/bubble-frame.html');await page.waitForFunction(()=>window.CellMotionBubbleFrame);
  await page.evaluate(()=>BubbleFrameScene.ready);await page.getByRole('button',{name:'荧光绿',exact:true}).click();
  for(const sourceTime of [13,13.2,13.8,14.4]){
   const encoded=await page.evaluate(sourceTime=>{
    const p=(sourceTime-13)/1.6,at=CellMotionBubbleFrame.state().lead*Math.acos(1-2*p)/Math.PI;
    const c=document.createElement('canvas');c.width=592;c.height=345;CellMotionBubbleFrame.render(c,at);
    return c.toDataURL('image/png').split(',')[1];
   },sourceTime);
   fs.writeFileSync(path.resolve(__dirname,'../output/bubble-research/measured-'+sourceTime+'.png'),Buffer.from(encoded,'base64'));
  }
  if(errors.length)throw new Error(errors.join('\n'));console.log('Measured source checkpoints rendered without browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
