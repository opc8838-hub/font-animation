(function () {
  const check = async function(page) {
    const url = 'http://127.0.0.1:4175/ribbonink.html?from=gallery&rev=20260905-40&frame=.92';
    const read = async () => {
      await page.goto(url);
      await page.waitForFunction(() => window.RibbonInk && document.querySelector('#schemeStatus')?.textContent.includes('默认'));
      return page.evaluate(async () => {
        await document.fonts.ready; RibbonInk.setPaused(true);
        const results=[];
        for(const [w,h] of [[320,180],[320,320],[360,640]]) for(const thickness of [55,100,160]) {
          document.querySelector('#brushWidth').value=thickness;
          const canvas=document.createElement('canvas');RibbonInk.renderFrame(canvas,.92,w,h);
          const data=canvas.getContext('2d').getImageData(0,0,w,h).data;
          const scale=Math.min(w/720,h/405),cut=h*.52+195*scale*thickness/100;
          let outside=2166136261,inside=2166136261;
          for(let y=0;y<h;y++) for(let x=0;x<w;x++) for(let c=0;c<3;c++) {
            const value=data[(y*w+x)*4+c];
            if(x<55*scale+1 && y>=Math.floor(cut-scale))
              inside=Math.imul(inside^value,16777619);
            else outside=Math.imul(outside^value,16777619);
          }
          const bottomAt=x=>{
            for(let y=h-1;y>=0;y--) {
              const i=(y*w+x)*4;
              if(data[i]>70 && data[i+2]>90 && data[i+1]<190) return y;
            }
            return -1;
          };
          results.push({w,h,thickness,outside,inside,cut,leftBottom:bottomAt(1),nearBottom:bottomAt(Math.round(18*scale))});
        }
        return results;
      });
    };
    const actual=await read();
    // Disable only the new underside completion to render the accepted baseline.
    // Everything else (including timing and source pixels) runs unchanged.
    const pattern='**/ribbonink.js?*';
    await page.route(pattern,async route=>{
      const response=await route.fetch();
      const body=(await response.text())
        .replace('finishMotherCrop(context, transform);','')
        .replace('const cap = motherCropCap(transform, layer.canvas.height);','const cap = null;');
      await route.fulfill({response,body,headers:{...response.headers(),'cache-control':'no-store'}});
    });
    let baseline;
    try {baseline=await read();}
    finally {await page.unroute(pattern);await page.goto(url);}
    const results=actual.map((value,i)=>{
      const before=baseline[i];
      if(value.outside!==before.outside) throw Error('Unrelated pixels changed: '+JSON.stringify(value));
      if(value.h===640 && value.thickness===100 && !(value.leftBottom>before.leftBottom+4 && value.leftBottom>value.nearBottom))
        throw Error('Portrait cut is not rounded: '+JSON.stringify({before,after:value}));
      return {width:value.w,height:value.h,thickness:value.thickness,outsideUnchanged:true,
        beforeBottom:before.leftBottom,afterBottom:value.leftBottom};
    });
    return {configurations:results.length,results};
  };
  if(typeof module!=='undefined') module.exports=check;
  return check;
})()
