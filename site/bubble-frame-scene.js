/* High-resolution fixed-camera stage reconstruction. Furniture, floor bounce
 * and side walls stay in the plate; editable type replaces the curved screen. */
(() => {
  const plate=new Image();plate.src='assets/bubble-frame/stage-hd.webp?v=20261027-hd1';
  const W=592,H=345;
  const tinted=document.createElement('canvas');tinted.width=W;tinted.height=H;
  const ready=plate.decode().then(()=>{tinted.width=plate.naturalWidth;tinted.height=plate.naturalHeight;cachedColor='';rasterKey='';});
  let cachedColor='';
  const raster=document.createElement('canvas');let rasterKey='';
  function outputPlate(background,scale,color){
    const width=Math.ceil(W*scale),height=Math.ceil(H*scale),key=[color,width,height].join(':');
    if(key!==rasterKey){
      raster.width=width;raster.height=height;
      const ctx=raster.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(background,0,0,width,height);rasterKey=key;
    }
    return raster;
  }
  function scenePlate(color){
    if(color===cachedColor)return tinted;
    const ctx=tinted.getContext('2d',{willReadFrequently:true});ctx.drawImage(plate,0,0);
    const image=ctx.getImageData(0,0,tinted.width,tinted.height),pixels=image.data;
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255),maximum=Math.max(...rgb),minimum=Math.min(...rgb),delta=maximum-minimum;
    let hue=delta?(maximum===rgb[0]?(rgb[1]-rgb[2])/delta:maximum===rgb[1]?2+(rgb[2]-rgb[0])/delta:4+(rgb[0]-rgb[1])/delta):0;
    hue=(hue/6+1)%1;
    for(let i=0;i<pixels.length;i+=4){
      const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255;
      const max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min;
      // Recolor green/cyan light, keeping luminance detail and neutral furniture.
      if(g<r||chroma<.015||!max)continue;
      const sourceHue=(g===max?2+(b-r)/chroma:4+(r-g)/chroma)/6;
      const h=((sourceHue+hue-.43+1)%1)*6,s=(chroma/max)*(maximum?delta/maximum:0),c=max*s,x=c*(1-Math.abs(h%2-1)),m=max-c;
      const result=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];
      for(let k=0;k<3;k++)pixels[i+k]=Math.round((result[k]+m)*255);
    }
    ctx.putImageData(image,0,0);cachedColor=color;return tinted;
  }
  function edges(u){return {x:102.5+387*u,top:Math.max(6.5,104-15*u-51*u*u-36.5*u*u*u),bottom:229+5*u+8*u*u+40*u*u*u};}
  function render(target,screen,color='#17ff9f'){
    const ctx=target.getContext('2d'),scale=Math.min(target.width/W,target.height/H);
    ctx.fillStyle='#000';ctx.fillRect(0,0,target.width,target.height);
    if(!plate.complete||!plate.naturalWidth)return;
    const background=outputPlate(scenePlate(color),scale,color);
    ctx.save();ctx.translate((target.width-W*scale)/2,(target.height-H*scale)/2);ctx.scale(scale,scale);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(background,0,0,W,H);
    ctx.save();ctx.beginPath();
    for(let i=0;i<=128;i++){const e=edges(i/128);if(!i)ctx.moveTo(e.x,e.top);else ctx.lineTo(e.x,e.top);}
    for(let i=128;i>=0;i--){const e=edges(i/128);ctx.lineTo(e.x,e.bottom);}
    ctx.closePath();ctx.clip();
    // Subpixel strips reconstruct the measured curved projection without a flat homography.
    const strips=512;
    for(let i=0;i<strips;i++){
      const u=i/strips,next=(i+1)/strips,e=edges(u),n=edges(next);
      ctx.drawImage(screen,u*screen.width,0,screen.width/strips+.4,screen.height,e.x,e.top,n.x-e.x+.3,e.bottom-e.top);
    }
    ctx.restore();
    // Foreground chair backs occlude the very bottom of the LED surface.
    ctx.save();ctx.beginPath();ctx.moveTo(118,236);ctx.bezierCurveTo(115,222,140,219,149,225);ctx.bezierCurveTo(154,232,145,242,132,243);ctx.lineTo(118,241);ctx.closePath();
    ctx.moveTo(173,249);ctx.bezierCurveTo(174,240,199,228,207,230);ctx.lineTo(205,244);ctx.lineTo(196,254);ctx.lineTo(176,254);ctx.closePath();ctx.clip();ctx.drawImage(background,0,0,W,H);ctx.restore();
    ctx.restore();
  }
  window.BubbleFrameScene={ready,render};
})();
