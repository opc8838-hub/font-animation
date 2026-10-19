/* Standalone continuation: artwork arcs and editable patent-count typography. */
window.ArchiveMotionFactories ||= {};
window.ArchiveMotionFactories.patentcount = (cv, helpers) => {
  const W = 1920, H = 1080, g = cv.getContext('2d');
  const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
  const mix = (a,b,t) => a+(b-a)*t;
  const bezier = (x1,y1,x2,y2) => {
    const X=t=>3*x1*(1-t)*(1-t)*t+3*x2*(1-t)*t*t+t*t*t;
    const Y=t=>3*y1*(1-t)*(1-t)*t+3*y2*(1-t)*t*t+t*t*t;
    return v=>{let lo=0,hi=1;for(let i=0;i<22;i++){const m=(lo+hi)/2;if(X(m)<clamp(v))lo=m;else hi=m;}return Y((lo+hi)/2);};
  };
  const E={
    out:bezier(.3,0,.2,1),soft:bezier(.4,0,.2,1),
    land:bezier(.2,.7,.2,1),zoom:bezier(.6,0,.2,1),
    pop:bezier(.22,1.35,.4,1),calm:bezier(.3,0,.7,1)
  };
  const progress=(t,a,b)=>clamp((t-a)/(b-a));
  const ARC={cx:960,cy:150,rx:1138,ry:590,rows:[1,.82,.645],rowW:[1,.95,.9],w0:72,grow:1.7,gap:1.12,tilt:.42,yCut:255,yFade:70,heroRow:1};
  const IMG_RATIO=1491/1055,heroW0=1055/1491*1000*1.93,heroH0=1000*1.93;
  const widthAt=(r,p)=>ARC.w0*ARC.rowW[r]*(1+ARC.grow*(1-Math.cos(p)));
  const tables=ARC.rows.map((f,r)=>{
    const N=1400,phi=[],distance=[];let sum=0;
    for(let i=0;i<=N;i++){
      const p=-Math.PI+2*Math.PI*i/N;
      if(i){const mid=p-Math.PI/N;sum+=f*Math.hypot(ARC.rx*Math.cos(mid),ARC.ry*Math.sin(mid))/(widthAt(r,mid)*ARC.gap)*2*Math.PI/N;}
      phi.push(p);distance.push(sum);
    }
    const zero=distance[N/2];return{phi,distance:distance.map(v=>v-zero)};
  });
  function arcSlot(r,n){
    const tab=tables[r],a=tab.distance;if(n<=a[0]||n>=a[a.length-1])return null;
    let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m]<n)lo=m;else hi=m;}
    const ph=mix(tab.phi[lo],tab.phi[hi],(n-a[lo])/(a[hi]-a[lo]));
    const f=ARC.rows[r],x=ARC.cx+f*ARC.rx*Math.sin(ph),y=ARC.cy+f*ARC.ry*Math.cos(ph),w=widthAt(r,ph);
    return{x,y,w,h:w*IMG_RATIO,rot:Math.atan2(ARC.cx-x,y-ARC.cy)*ARC.tilt};
  }
  const hero=arcSlot(ARC.heroRow,0);
  const slots=[];
  for(let r=0;r<3;r++)for(let n=-(r===0?12:r===1?10:8);n<=(r===0?12:r===1?10:8);n++){
    const p=arcSlot(r,n);if(p&&p.y>ARC.yCut&&p.x>-p.w&&p.x<W+p.w)slots.push({r,n,dist:Math.hypot(p.x-hero.x,p.y-hero.y)/180,hero:r===ARC.heroRow&&n===0});
  }
  slots.sort((a,b)=>Number(b.hero)-Number(a.hero)||a.dist-b.dist||a.r-b.r||a.n-b.n);
  let state,resources;
  const nameOf=card=>resources.get(card?.libraryId)?.name||'';
  const font=()=>window.STGFontLibrary.family(state.typography.fontFamily);
  function image(card,t){return card&&helpers.image(card,resources,t);}
  function artwork(card,x,y,w,h,rotation,alpha,t){
    const im=image(card,t);if(!im||alpha<=0||w<1)return;
    w*=card.scale??1;h*=card.scale??1;
    if(x+w<0||x-w>W||y+h<0||y-h>H)return;
    g.save();g.globalAlpha*=alpha*(card.opacity??1);
    g.translate(x+(card.x||0),y+(card.y||0));g.rotate(rotation+(card.rotation||0)*Math.PI/180);
    g.fillStyle='rgba(1,8,35,.16)';g.fillRect(-w/2+3,-h/2+6,w,h);
    const iw=im.videoWidth||im.naturalWidth||im.width,ih=im.videoHeight||im.naturalHeight||im.height;
    const sourceRatio=iw/ih,targetRatio=w/h;
    let sx=0,sy=0,sw=iw,sh=ih;
    if(sourceRatio>targetRatio){sw=ih*targetRatio;sx=(iw-sw)/2;}else{sh=iw/targetRatio;sy=(ih-sh)/2;}
    g.drawImage(im,sx,sy,sw,sh,-w/2,-h/2,w,h);
    if(card.caption&&w>280){
      const size=Math.min(42,Math.max(19,w*.055));
      g.fillStyle=card.textColor||state.scene.textColor;g.font='600 '+size+'px '+window.STGFontLibrary.family(card.fontFamily||state.typography.fontFamily);
      g.textAlign='center';g.textBaseline='top';g.fillText(card.caption,0,h/2+12,w);
    }
    g.restore();
  }
  function typed(text,x,y,size,weight,start,step,t,track=0){
    g.font=weight+' '+size+'px '+font();g.textBaseline='alphabetic';
    let at=x,end=start;
    for(const ch of String(text||'')){
      const q=progress(t,end,end+.28);
      if(q>0){g.globalAlpha=clamp(q*2.2);g.fillText(ch,at,y+(1-E.pop(q))*size*.32);}
      at+=g.measureText(ch).width+size*track;end+=step;
    }
    g.globalAlpha=1;return{end,width:at-x};
  }
  function textLayer(t){
    if(t<1.45)return;
    const s=state.scene,portrait=state.canvas.width/state.canvas.height<.8;
    g.save();g.fillStyle=s.textColor;g.textAlign='left';
    const titleX=portrait?590:597,countX=portrait?1070:1086,sideX=portrait?590:112;
    const title=typed(s.title,titleX,243,s.titleSize,500,1.45,.07,t,.04);
    const nq=E.out(progress(t,title.end-.1,title.end+.9));
    if(t>title.end-.1){
      g.globalAlpha=progress(t,title.end-.1,title.end+.05);
      g.font='700 '+s.numberSize+'px '+(state.typography.fontFamily==='stg:noto-sc'?window.STGFontLibrary.family('stg:inter'):font());
      const countText=String(Math.round(s.countTo*nq)),numberX=Math.max(countX,titleX+title.width+24);
      g.fillText(countText,numberX,248);
      const pq=progress(t,title.end+.85,title.end+1.15);
      if(pq>0){g.save();g.globalAlpha=clamp(pq*2);g.translate(Math.min(1770,numberX+g.measureText(countText).width+22),152);const v=E.pop(pq);g.scale(v,v);g.font='600 58px '+font();if(s.plus)g.fillText(s.plus,0,20);g.restore();}
      g.globalAlpha=1;
    }
    typed(s.subtitle,portrait?600:605,284,25,400,1.75,.018,t);
    const begin=2.2,groups=[[s.sideA,s.sideAEn],[s.sideB,s.sideBEn]].filter(([zh,en])=>zh||en);
    if(groups.length){
      const line=E.out(progress(t,begin,begin+.6));
      if(line>0){g.globalAlpha=.65;g.fillRect(sideX-20,740,2,(groups.length>1?178:82)*line);g.globalAlpha=1;}
      groups.forEach(([zh,en],i)=>{
        const y=786+i*96,at=begin+.15+i*.45;
        const first=typed(zh,sideX,y,38,500,at,.055,t);
        typed(en,sideX,zh?y+25:y,17,400,zh?first.end-.2:at,.012,t);
      });
    }
    g.restore();
  }
  function arcShift(t){const f=Math.max(0,t-1.7),r=1.2;return state.scene.flowDirection*state.scene.flowSpeed*(f<r?f*f/(2*r):f-r/2);}
  function render(t){
    g.setTransform(cv.width/W,0,0,cv.height/H,0,0);g.clearRect(0,0,W,H);
    const bg=E.soft(progress(t,.25,1.4));
    g.fillStyle='#fff';g.globalAlpha=1-bg;g.fillRect(0,0,W,H);g.globalAlpha=1;
    const k0=heroW0/hero.w,p=E.zoom(progress(t,0,2));
    const k=Math.exp(mix(Math.log(k0),0,p))*(1-.025*E.calm(progress(t,1.7,4.8)));
    const m=clamp((k0/k-1)/(k0-1)),pivotX=mix(W/2,hero.x,m),pivotY=mix(H/2+60*1.93,hero.y,m);
    const toScreen=(x,y)=>[pivotX+(x-hero.x)*k,pivotY+(y-hero.y)*k];
    const moving=arcShift(t),list=[];
    const available=state.cards.length,visible=Math.min(available,slots.length);
    for(let i=0;i<visible;i++){
      const slot=slots[i],place=arcSlot(slot.r,slot.n+moving);if(!place)continue;
      const edge=clamp((place.y-ARC.yCut)/ARC.yFade);if(edge<=0)continue;
      const [x,baseY]=toScreen(place.x,place.y);
      const q=slot.hero?1:E.land(progress(t,.55+slot.dist*.13,.55+slot.dist*.13+.95));
      if(q<=0)continue;
      let y=baseY;if(!slot.hero)y+=(place.y<hero.y-4?-1:1)*H*.95*(1-q);
      const card=state.cards[i===visible-1&&available>slots.length?available-1:i];
      list.push({card,x,y,w:place.w*k*state.scene.cardSize,h:place.h*k*state.scene.cardSize,rot:place.rot*clamp(m*1.2),alpha:(slot.hero?1:edge*clamp(q*4)),hero:slot.hero});
    }
    list.sort((a,b)=>Number(a.hero)-Number(b.hero));
    for(const item of list)artwork(item.card,item.x,item.y,item.w,item.h,item.rot,item.alpha,t);
    textLayer(t);
  }
  return {
    width:W,height:H,duration:4.8,
    shots:[['主卡拉远·作品进场',0,1.45],['文字与计数',1.45,2.9],['弧墙巡航',2.9,4.8]],
    draw(t,s,r){state=s;resources=r;render(clamp(t,0,4.8));},
    stableTime(index){if(index<=0)return .5;const slot=slots[Math.min(index,slots.length-1)];return Math.min(4.4,.55+slot.dist*.13+.95);}
  };
};
