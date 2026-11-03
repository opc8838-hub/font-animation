/* Upright letters share a travelling stretch; each row keeps its reading order. */
(() => {
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
  const outlinesCache=new Map();
  function outline(name){
    if(outlinesCache.has(name))return outlinesCache.get(name);
    const source=BubbleFrameFluidOutlines[name];if(!source)return null;
    const points=source.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
    const normalized=source.map(contour=>contour.map(([x,y])=>[(x-left)/w-.5,(y-top)/h-.5]));
    outlinesCache.set(name,normalized);return normalized;
  }
  function loop(ctx,points){
    const last=points.at(-1),first=points[0];ctx.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
    points.forEach((p,i)=>{const q=points[(i+1)%points.length];ctx.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);});ctx.closePath();
  }
  function render(ctx,items,state,at,width,height){
    const total=state.lead+state.write+state.restore,time=((at%total)+total)%total;
    const progress=time<state.lead?smooth((time/state.lead-.12)/.88):time<state.lead+state.write?1:1-smooth((time-state.lead-state.write)/state.restore);
    const strength=progress*state.flow,scale=state.size/172;
    ctx.save();ctx.translate(width*(1-scale)/2,height*(1-scale)/2);ctx.scale(scale,scale);ctx.fillStyle=ctx.strokeStyle=state.textColor;
    const rows=new Map();
    items.forEach(g=>{if(!rows.has(g.row))rows.set(g.row,[]);rows.get(g.row).push(g);});
    for(const [row,glyphs] of rows){
      const start=glyphs[0].x,end=glyphs.at(-1).x+glyphs.at(-1).w,span=end-start;
      const waves=glyphs.map(g=>Math.sin((g.x+g.w/2-start)/span*3.8-progress*3.2+row*.55));
      const weights=glyphs.map((g,i)=>g.w*Math.exp(.22*strength*waves[i]));
      const available=glyphs.reduce((sum,g)=>sum+g.w,0),normalizer=available/weights.reduce((sum,w)=>sum+w,0);
      let x=start;
      glyphs.forEach((g,i)=>{
        // Conserve total row width and every gap, including spaces between words.
        const w=weights[i]*normalizer,h=g.h*(1-.025*strength*(waves[i]+1)/2);
        const cx=(x+w/2)*width,cy=(g.y+g.h/2+g.h*.006*strength*waves[i])*height;
        const angle=.035*strength*state.rotation*waves[i],c=Math.cos(angle),s=Math.sin(angle);
        const rw=w*width,rh=h*height;
        // Fit the tilted rectangle inside its own cell, so neighbours never collide.
        const tilt=Math.sqrt(s*s+.000004);
        const sx=rw/(rw*c+rh*tilt),sy=rh/(rw*tilt+rh*c);
        const m=[rw*c*sx,-rh*s*sx,cx,rw*s*sy,rh*c*sy,cy];
        const contours=state.letterStyle==='bubble'?outline(g.ch):null;
        if(contours){
          ctx.beginPath();for(const contour of contours)loop(ctx,contour.map(([u,v])=>[m[0]*u+m[1]*v+m[2],m[3]*u+m[4]*v+m[5]]));ctx.fill('evenodd');
        }else{
          ctx.save();ctx.transform(m[0]/100,m[3]/100,m[1]/100,m[4]/100,m[2],m[5]);ctx.translate(-50,-50);
          if(state.letterStyle==='bubble'&&BubbleFrameGlyphs.has(g.ch))BubbleFrameGlyphs.draw(ctx,g.ch);
          else{const preset=STGFontLibrary.preset(state.font);ctx.font='900 90px '+preset.family;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(g.ch,50,52,90);}ctx.restore();
        }
        x+=w+(i<glyphs.length-1?glyphs[i+1].x-g.x-g.w:0);
      });
    }
    ctx.restore();
  }
  window.BubbleFrameFluid={render};
})();
