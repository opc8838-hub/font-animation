/* Inflated complete letters share the reference's interlocking packing and turns. */
(() => {
  const mix=(a,b,t)=>a+(b-a)*t,ease=t=>(1-Math.cos(Math.PI*t))/2;
  const interpolate=(p0,p1,p2,p3,t)=>p1+.5*t*(p2-p0+t*(2*p0-5*p1+4*p2-p3+t*(3*(p1-p2)+p3-p0)));
  const cache=new Map(),slots=BubbleFrameReferenceSlots,poses=BubbleFramePoses;
  function matrix(name,slot,pose,rotation){
    const [x,y,w,h,angle]=pose,c=Math.cos(angle*rotation),s=Math.sin(angle*rotation);
    const rw=slot.w*600,rh=slot.h*320;
    const points=(BubbleFrameFluidOutlines[name]||BubbleFrameFluidOutlines[slot.ch]).flat().map(([x,y])=>{
      const u=(x/100-.5)*rw,v=(y/100-.5)*rh;return [u*c-v*s,u*s+v*c];
    });
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys);
    const sx=w/(Math.max(...xs)-left),sy=h/(Math.max(...ys)-top);
    return [rw*c*sx,-rh*s*sx,x-left*sx,rw*s*sy,rh*c*sy,y-top*sy];
  }
  function trajectory(name,donor,rotation){
    const key=[name,donor,rotation].join(':');if(cache.has(key))return cache.get(key);
    const slot=slots[donor],base=matrix(name,slot,[slot.x,slot.y,slot.w,slot.h,0],rotation);
    const start=[slot.x,slot.y,slot.w,slot.h,0];
    const result={base,frames:poses.map((frame,i)=>{
      const weight=ease(Math.min(1,i/(poses.length-1)*2));
      const pose=frame[donor].map((v,k)=>mix(start[k],v,weight));
      return matrix(name,slot,pose,rotation);
    })};cache.set(key,result);return result;
  }
  function loop(ctx,points,width,height){
    const last=points.at(-1),first=points[0];ctx.moveTo((last[0]+first[0])*width/2,(last[1]+first[1])*height/2);
    points.forEach((p,i)=>{const q=points[(i+1)%points.length];ctx.quadraticCurveTo(p[0]*width,p[1]*height,(p[0]+q[0])*width/2,(p[1]+q[1])*height/2);});ctx.closePath();
  }
  function render(ctx,items,state,at,width,height){
    const total=state.lead+state.write+state.restore,time=((at%total)+total)%total;
    const progress=time<state.lead?ease(time/state.lead):time<state.lead+state.write?1:1-ease((time-state.lead-state.write)/state.restore);
    const f=progress*(poses.length-1),a=Math.floor(f),b=Math.min(a+1,poses.length-1),t=f-a;
    const scale=state.size/172,envelope=state.flow;
    ctx.save();ctx.translate(width*(1-scale)/2,height*(1-scale)/2);ctx.scale(scale,scale);ctx.fillStyle=ctx.strokeStyle=state.textColor;
    items.forEach((g,index)=>{
      const donor=index%14,slot=slots[donor],name=g.variant||g.ch.toUpperCase();
      const track=trajectory(name,donor,state.rotation),before=track.frames[Math.max(0,a-1)],after=track.frames[Math.min(poses.length-1,b+1)];
      let m=track.base.map((v,k)=>mix(v,interpolate(before[k],track.frames[a][k],track.frames[b][k],after[k],t),envelope));
      if(!g.reference){
        // Replacement compositions retain their own text layout and inherit the same turns.
        const sx=g.w/slot.w,sy=g.h/slot.h;
        m=[m[0]*sx,m[1]*sx,g.x+(m[2]-slot.x)*sx,m[3]*sy,m[4]*sy,g.y+(m[5]-slot.y)*sy];
      }else{
        const spacing=1+state.tracking/500;m=[m[0]*spacing,m[1]*spacing,.5+(m[2]-.5)*spacing,m[3],m[4],m[5]+(g.row===0?-1:1)*(state.lineSpacing-1)*.08];
      }
      if(g.reference){
        const clearance=BubbleFrameClearance,cb=clearance[Math.max(0,a-1)][donor],ca=clearance[Math.min(clearance.length-1,b+1)][donor];
        const [inset,dx,dy]=clearance[a][donor].map((v,k)=>interpolate(cb[k],v,clearance[b][donor][k],ca[k],t)),points=BubbleFrameFluidOutlines[name]||BubbleFrameFluidOutlines[slot.ch];
        const mapped=points.flat().map(([x,y])=>{const u=x/100-.5,v=y/100-.5;return [m[0]*u+m[1]*v+m[2],m[3]*u+m[4]*v+m[5]];});
        const xs=mapped.map(p=>p[0]),ys=mapped.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
        m=[m[0]*inset,m[1]*inset,cx+(m[2]-cx)*inset+dx,m[3]*inset,m[4]*inset,cy+(m[5]-cy)*inset+dy];
      }
      const outlines=state.letterStyle==='bubble'?BubbleFrameFluidOutlines[name]:null;
      if(outlines){
        ctx.beginPath();for(const contour of outlines)loop(ctx,contour.map(([x,y])=>{const u=x/100-.5,v=y/100-.5;return [m[0]*u+m[1]*v+m[2],m[3]*u+m[4]*v+m[5]];}),width,height);ctx.fill('evenodd');
      }else{
        ctx.save();ctx.transform(m[0]*width/100,m[3]*height/100,m[1]*width/100,m[4]*height/100,m[2]*width,m[5]*height);ctx.translate(-50,-50);
        if(state.letterStyle==='bubble'&&BubbleFrameGlyphs.has(g.ch))BubbleFrameGlyphs.draw(ctx,g.ch);
        else{const preset=STGFontLibrary.preset(state.font);ctx.font=`900 90px ${preset.family}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(g.ch,50,52);}ctx.restore();
      }
    });ctx.restore();
  }
  window.BubbleFrameFluid={render};
})();
