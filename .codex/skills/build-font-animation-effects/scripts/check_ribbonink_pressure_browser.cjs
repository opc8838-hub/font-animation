module.exports = async function(page, options = {}) {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(options.url || 'http://127.0.0.1:4175/ribbonink.html?from=gallery&sequence=2&rev=20260905-41');
  await page.waitForFunction(()=>window.RibbonInk && document.querySelector('#schemeStatus')?.textContent.includes('默认'));
  await page.selectOption('#fontSelect','stg:noto-sc-black');
  await page.selectOption('#page2Font','stg:noto-sc-black');
  await page.fill('#textInput','中文');
  await page.fill('#page2Text','风格上新');
  await page.evaluate(()=>document.fonts.ready);
  if(!await page.locator('#page1GlyphEditor').evaluate(e=>e.open) || !await page.locator('#page2GlyphEditor').evaluate(e=>e.open))
    throw Error('Per-page character panels did not open after text edits');
  await page.locator('#firstDeselectGlyphs').click();
  await page.locator('#firstGlyphChips button').nth(1).click();
  await page.locator('#firstPressSelectedGlyphs').click();
  const first=await page.evaluate(()=>RibbonInk.schemeData());
  if(first.page1Glyphs.map(g=>g.motion).join(',')!=='none,press') throw Error('First-page selection leaked');
  const adjust=async(id,value)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
  const sample=async(firstPage,index)=>page.evaluate(({firstPage,index})=>{
    const d=RibbonInk.glyphDiagnostics();
    return (firstPage?d.first:d.second).poses[index];
  },{firstPage,index});
  const firstSamples=[];
  for(const amount of [0,15,40,85]) {
    await adjust('firstGlyphAmount',amount);
    firstSamples.push({amount,pose:await sample(true,1)});
  }
  if(firstSamples[0].pose.sy!==1 || !(firstSamples[1].pose.sy>firstSamples[2].pose.sy && firstSamples[2].pose.sy>firstSamples[3].pose.sy))
    throw Error('First-page pressure is not monotonic: '+JSON.stringify(firstSamples));
  await adjust('firstGlyphAmount',20);
  const firstBeforeSecond=await page.evaluate(()=>RibbonInk.schemeData().page1Glyphs);
  await page.locator('#deselectGlyphs').click();
  await page.locator('#glyphChips button').nth(0).click();
  await page.locator('#glyphChips button').nth(2).click();
  await page.locator('#pressSelectedGlyphs').click();
  const secondSamples=[];
  for(const amount of [0,20,45,90]) {
    await adjust('glyphAmount',amount);
    secondSamples.push({amount,pose:await sample(false,0)});
  }
  if(secondSamples[0].pose.sy!==1 || !(secondSamples[1].pose.sy>secondSamples[2].pose.sy && secondSamples[2].pose.sy>secondSamples[3].pose.sy))
    throw Error('Second-page pressure is not monotonic: '+JSON.stringify(secondSamples));
  await adjust('glyphAmount',30);
  const expected=await page.evaluate(()=>RibbonInk.schemeData());
  if(expected.page2Glyphs.map(g=>g.motion).join(',')!=='press,none,press,none')throw Error('Second-page selection leaked');
  if(JSON.stringify(expected.page1Glyphs)!==JSON.stringify(firstBeforeSecond))throw Error('Second-page edit changed first page');
  const scan=await page.evaluate(()=>{
    const scheme=RibbonInk.schemeData(),c=document.createElement('canvas'),span=RibbonInk.timing();
    let checked=0;
    for(let i=0;i<45;i++){
      RibbonInk.renderFrame(c,(span.write+span.flow+span.bridge)*i/44,640,640);
      const d=RibbonInk.glyphDiagnostics();
      for(const [glyphs,frame] of [[scheme.page1Glyphs,d.first],[scheme.page2Glyphs,d.second]]) if(frame)
        glyphs.forEach((g,j)=>{if(g.motion==='none'){const p=frame.poses[j];if(p.sy!==1||p.sx!==1||p.dx!==0||p.rotation!==0)throw Error('Unselected glyph moved');checked++;}});
    }
    return checked;
  });
  const downloadEvent=page.waitForEvent('download');
  await page.locator('#saveScheme').click();
  const file=options.schemePath || 'output/playwright/glyph-pressure-scheme.json';
  await (await downloadEvent).saveAs(file);
  await page.locator('#resetScheme').click();
  await page.waitForFunction(()=>document.querySelector('#textInput').value==='TIME');
  await page.locator('#importScheme').setInputFiles(file);
  await page.waitForFunction(()=>document.querySelector('#textInput').value==='中文' && document.querySelector('#importScheme').value==='');
  const imported=await page.evaluate(()=>RibbonInk.schemeData());
  if(JSON.stringify(imported.page1Glyphs)!==JSON.stringify(expected.page1Glyphs)||JSON.stringify(imported.page2Glyphs)!==JSON.stringify(expected.page2Glyphs))
    throw Error('Per-glyph strengths lost during real scheme import');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {firstSamples,secondSamples,neutralGlyphChecks:scan,schemeRoundtrip:true,errors};
}
