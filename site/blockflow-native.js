/* The flowing-block beat from Bot Voice, exposed as an independent composition. */
window.ArchiveMotionFactories ||= {};
window.ArchiveMotionFactories.blockflow = (canvas, helpers) => {
  const W = 1080, H = 1920, g = canvas.getContext('2d');
  const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
  const mix = (a,b,t) => a+(b-a)*t;
  const ease = v => { const t=clamp(v); return t*t*(3-2*t); };
  const progress = (t,a,b) => ease((t-a)/(b-a));
  const roundRect = (x,y,w,h,r) => {
    g.beginPath();g.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));
  };
  let state,resources;
  function draw(t) {
    const s=state.scene,cards=state.cards,n=cards.length;
    g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    g.clearRect(0,0,W,H);
    if(!n)return;
    const appear=progress(t,0,.75),fold=progress(t,2.55,3.3);
    const size=s.blockSize, gap=s.tileGap;
    const fullWidth=Math.min(1000,Math.max(450,98*n+Math.max(0,n-1)*gap))*size;
    const totalWidth=mix(100*size,fullWidth,appear)*(1-.88*fold);
    const unit=Math.max(2,totalWidth/(1+(n-1)*appear*(1-fold)));
    const rowWidth=unit*(1+(n-1)*appear*(1-fold));
    const centerX=W/2,centerY=H/2;
    const phase=(t-.75)*s.flowSpeed*4.2;
    const solid=progress(t,.18,.78);
    const iconAlpha=(1-solid)+s.iconOpacity*solid*(1-fold);
    const wave=progress(t,.45,.95)*(1-progress(t,2.5,3.25));
    const blue=s.accent;
    const gradient=g.createLinearGradient(centerX-rowWidth/2,centerY-190,centerX+rowWidth/2,centerY+190);
    gradient.addColorStop(0,helpers.tint(blue,.32));gradient.addColorStop(.48,blue);gradient.addColorStop(1,helpers.tint(blue,.1));
    g.save();
    for(let i=0;i<n;i++){
      const c=cards[i],entry=i===0?progress(t,0,.2):progress(t,.08+i*.055,.38+i*.055);
      const tail=1-fold*clamp(Math.abs(i-(n-1)/2)/Math.max(1,n/2));
      const x=centerX+(i-(n-1)/2)*(unit+gap)*appear*(1-fold);
      const waveShape=.5+.5*Math.sin(phase-i*.72)+.19*Math.sin(phase*1.75+i*.48);
      const edge=.68+.32*Math.sin(Math.PI*(i+.5)/n);
      const h=(mix(98,130+230*clamp(waveShape)*s.waveHeight*edge,wave))*(1-.5*fold)*size*entry*tail;
      const y=centerY-h/2+(1-entry)*(i%2?-80:80);
      const w=unit*entry*tail;
      if(w<1||h<1)continue;
      const alpha=clamp(entry*3)*(1-fold*clamp(Math.abs(i-(n-1)/2)/Math.max(1,n/2))*.85);
      g.save();g.globalAlpha=alpha*(c.opacity??1);
      g.translate(x+(c.x||0),y+h/2+(c.y||0));g.rotate((c.rotation||0)*Math.PI/180);
      const rw=w*(c.scale??1),rh=h*(c.scale??1),radius=Math.min(rw/2,rh/2,s.roundness);
      roundRect(-rw/2,-rh/2,rw,rh,radius);g.clip();
      g.fillStyle=gradient;g.fillRect(-rw/2,-rh/2,rw,rh);
      const shine=g.createRadialGradient(rw*.25*Math.sin(phase*.6)-rw*.1,-rh*.17,0,rw*.25*Math.sin(phase*.6),0,Math.max(50,rw*1.5));
      shine.addColorStop(0,'rgba(239,246,255,.9)');shine.addColorStop(.5,'rgba(196,216,255,.22)');shine.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=shine;g.fillRect(-rw/2,-rh/2,rw,rh);
      const image=helpers.image(c,resources,t);
      if(image&&iconAlpha>0.005){
        const iw=image.videoWidth||image.naturalWidth||image.width,ih=image.videoHeight||image.naturalHeight||image.height;
        if(iw&&ih){const m=Math.min(rw*.65/iw,rh*.68/ih,1);g.globalAlpha*=iconAlpha;g.drawImage(image,-iw*m/2,-ih*m/2,iw*m,ih*m);}
      }
      g.restore();
      if(c.caption&&iconAlpha>.15&&w>75){
        g.save();g.globalAlpha=alpha*iconAlpha;g.fillStyle=c.textColor||s.textColor;
        g.font='500 23px '+window.STGFontLibrary.family(c.fontFamily||state.typography.fontFamily);
        g.textAlign='center';g.fillText(c.caption,x,centerY+Math.max(90,h/2)+30+(c.gap||0),Math.max(60,w));g.restore();
      }
    }
    g.restore();
  }
  return {width:W,height:H,duration:3.3,
    shots:[['图标汇聚·变方块',0,.75],['方块流动',.75,2.55],['收拢归一',2.55,3.3]],
    draw(t,s,r){state=s;resources=r;draw(clamp(t,0,3.3));},
    stableTime(index){return Math.min(.6,.22+index*.035);}
  };
};
