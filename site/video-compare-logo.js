/* Local image preparation and monochrome contour tracing. No remote services. */
(() => {
  'use strict';
  async function decode(url) {
    const image=new Image();image.src=url;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('Invalid logo image');
    const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
  }
  function process(source,settings) {
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height),d=image.data;
    const threshold=255-Math.max(1,Math.min(100,settings.tolerance||24));
    const border=[[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1],[Math.floor(canvas.width/2),0],[Math.floor(canvas.width/2),canvas.height-1],[0,Math.floor(canvas.height/2)],[canvas.width-1,Math.floor(canvas.height/2)]];
    const whiteMatte=border.filter(([x,y])=>{const i=(y*canvas.width+x)*4;return d[i+3]>240&&Math.min(d[i],d[i+1],d[i+2])>=threshold;}).length>=2;
    if(settings.background==='remove-white'&&whiteMatte) {
      // White matte removal preserves antialiased edges and enclosed white holes.
      // Original pixels stay in the scheme so processing is always reversible.
      for(let i=0;i<d.length;i+=4){const minimum=Math.min(d[i],d[i+1],d[i+2]);
        if(minimum>=threshold){d[i+3]=0;continue;}
        const coverage=1-minimum/255;
        if(coverage>0){for(let c=0;c<3;c++)d[i+c]=Math.max(0,(d[i+c]-minimum)/coverage);d[i+3]=Math.round(d[i+3]*coverage);}
      }
    }
    if(settings.color==='black'||settings.color==='white')for(let i=0;i<d.length;i+=4)d[i]=d[i+1]=d[i+2]=settings.color==='white'?255:0;
    ctx.putImageData(image,0,0);return canvas;
  }
  function trace(source,settings) {
    // Trace binary pixel boundaries, including inner holes, into real SVG paths.
    const scale=Math.min(1,800/Math.max(source.width,source.height));
    const small=document.createElement('canvas');small.width=Math.max(1,Math.round(source.width*scale));small.height=Math.max(1,Math.round(source.height*scale));small.getContext('2d').drawImage(source,0,0,small.width,small.height);
    const image=process(small,{...settings,color:'original',background:'remove-white'}),w=image.width,h=image.height,d=image.getContext('2d').getImageData(0,0,w,h).data;
    const mask=new Uint8Array(w*h);for(let i=0;i<mask.length;i++)mask[i]=d[i*4+3]>=128?1:0;
    const edges=new Map(),stride=w+1,point=(x,y)=>y*stride+x;
    const add=(a,b)=>{if(!edges.has(a))edges.set(a,[]);edges.get(a).push(b);};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){
      if(y===0||!mask[(y-1)*w+x])add(point(x,y),point(x+1,y));
      if(x===w-1||!mask[y*w+x+1])add(point(x+1,y),point(x+1,y+1));
      if(y===h-1||!mask[(y+1)*w+x])add(point(x+1,y+1),point(x,y+1));
      if(x===0||!mask[y*w+x-1])add(point(x,y+1),point(x,y));
    }
    let path='';
    while(edges.size){const start=edges.keys().next().value;let at=start;const points=[];
      do{points.push([at%stride,Math.floor(at/stride)]);const list=edges.get(at);if(!list?.length)break;const next=list.pop();if(!list.length)edges.delete(at);at=next;}while(at!==start);
      const corners=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
      if(corners.length>=3)path+='M'+corners.map(p=>p.join(' ')).join('L')+'Z';
    }
    if(!path)throw new Error('No visible logo to trace / 未找到可描边的 Logo');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'"><path fill="'+(settings.color==='white'?'#fff':'#000')+'" fill-rule="evenodd" d="'+path+'"/></svg>';
  }
  window.VideoCompareLogo={decode,process,trace};
})();
