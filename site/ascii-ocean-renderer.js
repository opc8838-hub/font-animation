/* Original articulated marine silhouettes and deterministic swimming, reconstructed from visual evidence. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mod = v => ((v % 1) + 1) % 1;
  const noise = (x, y) => { const n = Math.sin(x * 91.73 + y * 219.41) * 14673.947; return n - Math.floor(n); };
  const paths = [
    [[.28,.22],[.14,.48],[.10,.87],[-.14,1.16],[.19,1.19],[.40,.80],[.57,.52],[.47,.13],[.28,-.16],[.16,.01]],
    [[.42,.61],[.31,.89],[.07,1.14],[-.17,.73],[.20,.29],[.59,.18],[.84,.47],[.74,.83],[.43,1.12],[.39,.88]],
    [[.67,.44],[.81,.23],[1.01,.01],[1.14,-.16],[1.17,.31],[.96,.58],[.79,.82],[.49,1.06],[.29,.78],[.45,.62]],
    [[.52,.83],[.31,.93],[.06,.94],[-.20,.79],[-.10,.40],[.29,.09],[.76,.02],[1.15,.31],[.96,.75],[.70,1.10]],
    [[.72,.28],[.90,.50],[.78,.77],[.48,.81],[.22,.62],[.18,.29],[.40,.17],[.70,.12]],
    [[.58,.22],[.83,.32],[.87,.62],[.64,.84],[.31,.78],[.12,.52],[.20,.25],[.41,.15]]
  ];
  const variants = {
    'ascii-shark': {kind:'classic', tint:[.39,.43,.46], length:.44, depth:.61, path:1},
    'ascii-hammerhead': {kind:'hammerhead', tint:[.36,.39,.46], length:.45, depth:.97, path:2},
    'ascii-longtail': {kind:'longtail', tint:[.45,.43,.32], length:.39, depth:.88, path:0},
    'ascii-tiger': {kind:'tiger', tint:[.44,.41,.34], length:.40, depth:.94, path:3},
    'ascii-whale': {kind:'whale', tint:[.35,.43,.47], length:.53, depth:.94, path:4},
    'ascii-manta': {kind:'manta', tint:[.37,.42,.45], length:.40, depth:.91, path:5}
  };
  const rgb = hex => (hex.match(/[\da-f]{2}/gi) || ['80','80','80']).map(v => parseInt(v, 16));
  function curve(path, u, w, h) {
    const n = path.length, t = mod(u) * n, i = Math.floor(t), v = t - i, v2 = v * v, v3 = v2 * v;
    const a = path[(i + n - 1) % n], b = path[i % n], c = path[(i + 1) % n], d = path[(i + 2) % n];
    return [0, 1].map(k => .5 * (2*b[k] + (-a[k]+c[k])*v + (2*a[k]-5*b[k]+4*c[k]-d[k])*v2 + (-a[k]+3*b[k]-3*c[k]+d[k])*v3) * (k ? h : w));
  }
  function bodyWidth(s, kind) {
    if (kind === 'manta') {
      if(s<.08)return .065+s*.50;
      if(s<.46)return .009+.096*Math.pow(1-(s-.08)/.38,.8);
      return .0018+.0045*Math.pow((1-s)/.54,.8);
    }
    if (kind === 'whale') {
      if (s < .17) return .145 * Math.sqrt(Math.max(0, 1 - Math.pow((s - .17) / .17, 2)));
      return .011 + .134 * Math.pow(Math.max(0, (1-s)/.83), 1.15);
    }
    if (kind === 'longtail') {
      if (s < .12) return .072 * Math.sin(s / .12 * Math.PI / 2);
      if (s < .42) return .012 + .068 * Math.pow(1-(s-.12)/.30, .85);
      return .002 + .010 * Math.pow(Math.max(0,(1-s)/.58), .7);
    }
    if (kind === 'hammerhead' && s < .32) return .030 + .071 * Math.pow(clamp((s-.07)/.25), .85);
    const wide = kind === 'tiger' ? .112 : .096;
    if (s < .18) return wide * Math.pow(Math.sin(s/.18*Math.PI/2), kind === 'tiger' ? .55 : 1.05);
    return .012 + (wide-.012) * Math.pow(Math.max(0,(1-s)/.82), 1.35);
  }
  function spineFor(spec, card, index, u, w, h, state) {
    const size = Math.min(w, h), length = spec.length * size * state.scene.size * card.scale;
    const glide=u+.004*Math.sin(u*TAU*3+index);
    const phase = spec.kind === 'manta' ? mod(glide+(card.phase??.10)) : spec.kind === 'whale' ? mod(glide + (card.phase ?? .60) + (index-4)*.19) : glide;
    const path = paths[spec.path], direction = Number(state.scene.direction);
    const head = curve(path, phase * direction, w, h), samples = [{p:head, distance:0}];
    let distance = 0, last = head;
    // Walk a short history of the head trajectory, then resample at equal arc lengths.
    for (let step = 1; distance < length * (spec.kind==='manta'?1.42:1.12) && step < 400; step++) {
      const p = curve(path, (phase - step/1800) * direction, w, h);
      distance += Math.hypot(p[0]-last[0], p[1]-last[1]); samples.push({p,distance}); last=p;
    }
    const nodes = [], count=24; let cursor=1;
    for (let i=0; i<count; i++) {
      const s=i/(count-1), wanted=(spec.kind==='manta'&&s>.46?.46+(s-.46)*1.5:s)*length;
      while(cursor<samples.length-1 && samples[cursor].distance<wanted)cursor++;
      const a=samples[cursor-1], b=samples[cursor], f=clamp((wanted-a.distance)/(b.distance-a.distance||1));
      const dx=b.p[0]-a.p[0], dy=b.p[1]-a.p[1], distance=Math.hypot(dx,dy)||1;
      const stroke=u*TAU*(spec.kind==='manta'?12:spec.kind==='whale'?10:spec.kind==='longtail'?22:30)+.20*Math.sin(u*TAU*3+index);
      const wave=Math.sin(stroke-s*8+index)*Math.pow(s,1.8)*length*(spec.kind==='manta'?.012:spec.kind==='whale'?.017:.042)*state.scene.amplitude;
      nodes.push({x:a.p[0]+dx*f-dy/distance*wave+card.x*size/1080,y:a.p[1]+dy*f+dx/distance*wave+card.y*size/1080});
    }
    if (card.rotation) {
      const angle=card.rotation*Math.PI/180, c=Math.cos(angle), s=Math.sin(angle), origin=nodes[0];
      for(let i=1;i<nodes.length;i++){const dx=nodes[i].x-origin.x,dy=nodes[i].y-origin.y;nodes[i]={x:origin.x+dx*c-dy*s,y:origin.y+dx*s+dy*c};}
    }
    const segments=nodes.slice(0,-1).map((a,i)=>{const b=nodes[i+1],dx=b.x-a.x,dy=b.y-a.y;return {x:a.x,y:a.y,dx,dy,d2:dx*dx+dy*dy||1};});
    const at=(s,v=0)=>{
      const value=clamp(s)* (count-1), i=Math.min(count-2,Math.floor(value)), f=value-i, seg=segments[i], norm=Math.sqrt(seg.d2);
      return {x:seg.x+seg.dx*f-seg.dy/norm*v*length,y:seg.y+seg.dy*f+seg.dx/norm*v*length};
    };
    return {nodes,segments,length,at,spec,card,index};
  }
  function inside(x,y,points) {
    let hit=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;
    }
    return hit;
  }
  function finsFor(animal,u) {
    const {at,spec}=animal, fins=[];
    if(spec.kind==='manta'){
      const beat=Math.sin(u*TAU*12+animal.index),span=.47*(.93+.12*beat),sweep=.035*Math.cos(u*TAU*12+animal.index);
      for(const side of [-1,1]){
        fins.push([at(.025,side*.075),at(.09,side*.24),at(.18+sweep,side*span),at(.24+sweep,side*(span-.03)),at(.30,side*.30),at(.43,side*.13),at(.46,side*.025)]);
        const a=animal.segments[0],norm=Math.sqrt(a.d2),p=(s,v)=>({x:a.x+(a.dx*s-a.dy*v)/norm*animal.length,y:a.y+(a.dy*s+a.dx*v)/norm*animal.length});
        fins.push([p(.035,side*.085),p(-.060,side*.092),p(-.080,side*.065),p(-.060,side*.045),p(.020,side*.057)]);
      }
      return fins;
    }
    for(const sign of [-1,1]){
      if(spec.kind==='whale') {
        const reach=.31*(.94+.06*Math.cos(u*TAU*10));
        fins.push([at(.20,sign*.10),at(.42,sign*(reach-.02)),at(.58,sign*reach),at(.57,sign*(reach-.05)),at(.36,sign*.10)]);
      } else {
        const compact=spec.kind==='longtail';
        fins.push([at(compact?.14:.19,sign*.06),at(compact?.37:.56,sign*(compact?.17:.25)),at(compact?.30:.44,sign*.13),at(compact?.29:.40,sign*.065)]);
        if(!compact)fins.push([at(.59,sign*.024),at(.72,sign*.075),at(.67,sign*.017)]);
      }
      if(spec.kind!=='longtail') {
        const reach=spec.kind==='whale'?.18*(.9+.1*Math.cos(u*TAU*10)):.105;
        fins.push([at(.89,0),at(.96,sign*reach),at(1,sign*reach*.83),at(.98,sign*.025),at(1,0)]);
      }
    }
    if(spec.kind==='hammerhead'){
      const a=animal.segments[0],norm=Math.sqrt(a.d2),p=(s,v)=>({x:a.x+(a.dx*s-a.dy*v)/norm*animal.length,y:a.y+(a.dy*s+a.dx*v)/norm*animal.length});
      fins.push([p(.025,-.22),p(.078,-.215),p(.091,-.18),p(.061,-.075),p(.061,.075),p(.091,.18),p(.078,.215),p(.025,.22),p(-.008,.19),p(.013,.065),p(.023,0),p(.013,-.065),p(-.008,-.19)]);
    }
    return fins;
  }
  function rasterAnimal(g,animal,u,w,h,cw,ch,state) {
    const {nodes,segments,length,spec,card,at,index}=animal, fins=finsFor(animal,u);
    const points=[...nodes,...fins.flat()], margin=length*.17;
    const x0=Math.max(0,Math.floor((Math.min(...points.map(p=>p.x))-margin)/cw)), x1=Math.min(Math.ceil(w/cw)-1,Math.ceil((Math.max(...points.map(p=>p.x))+margin)/cw));
    const y0=Math.max(0,Math.floor((Math.min(...points.map(p=>p.y))-margin)/ch)), y1=Math.min(Math.ceil(h/ch)-1,Math.ceil((Math.max(...points.map(p=>p.y))+margin)/ch));
    if(x1<x0||y1<y0)return;
    const cols=x1-x0+1,rows=y1-y0+1,flags=new Uint8Array(cols*rows),shades=new Float32Array(cols*rows),keys=new Float32Array(cols*rows);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const px=(x+.5)*cw,py=(y+.5)*ch;let nearest=Infinity,along=0,across=0,normalX=0,normalY=0;
      for(let i=0;i<segments.length;i++){
        const a=segments[i], t=clamp(((px-a.x)*a.dx+(py-a.y)*a.dy)/a.d2), dx=px-a.x-a.dx*t,dy=py-a.y-a.dy*t,d=dx*dx+dy*dy;
        if(d<nearest){nearest=d;along=(i+t)/(nodes.length-1);across=(a.dx*dy-a.dy*dx)>=0?1:-1;const len=Math.sqrt(a.d2);normalX=-a.dy/len;normalY=a.dx/len;}
      }
      const distance=Math.sqrt(nearest)/length,tail=spec.kind==='manta'&&along>.46;
      const half=tail?Math.max(bodyWidth(along,spec.kind),Math.hypot(cw,ch)*.43/length):bodyWidth(along,spec.kind),offset=(y-y0)*cols+x-x0;
      let flag=0,shade=.58;
      if(distance<half){
        flag=1;const v=distance/(half||1),lit=(normalX*-.5+normalY*-.85)*across;
        const flow=(Math.sin(u*TAU*12-along*19+across*v*3)*.10+Math.cos(u*TAU*8+along*29)*.055)*(state.scene.shimmer??1);
        shade=clamp(.30+.46*v*v-.17*lit*v+flow,.04,.96);
        if(spec.kind!=='manta'&&along>.30&&along<.45&&v<.25){flag=4;shade=.09+flow*.5;}
        if(spec.kind==='tiger'&&along>.2&&along<.7&&Math.sin(along*100+v*2)>.78)shade*=.78;
        if(spec.kind==='whale'&&along>.25&&along<.70&&v>.56&&Math.sin(v*42+along*8)>.6)shade+=.08;
        if(along>.18&&along<.29&&v>.68&&Math.floor((along-.18)*55)%2===0)shade*=.8;
        if(tail){flag=5;shade=.17+.07*Math.sin(u*TAU*12-along*10);}
      }
      if(!flag&&fins.some(poly=>inside(px,py,poly))){flag=2;shade=.36+noise(x,y)*.20+Math.sin(u*TAU*12-along*13)*.12*(state.scene.shimmer??1);}
      if(!flag)continue;
      if(spec.kind==='hammerhead'&&along<.065&&distance>.14){flag=3;shade=.80;}
      else if(spec.kind!=='hammerhead'&&along>.07&&along<.13&&distance>half*.78&&flag===1){flag=3;shade=.73;}
      if(spec.kind==='whale'&&along>.10&&along<.135&&distance<.024){flag=3;shade=.55;}
      flags[offset]=flag;shades[offset]=shade;keys[offset]=noise(Math.floor(along*length/cw)+index*43,Math.round(across*distance*length/ch));
    }
    const light=rgb(state.scene.color),bg=rgb(state.backgroundColor),dark=bg.reduce((a,b)=>a+b,0)<380;
    const tint=spec.tint.map((value,i)=>clamp(value+(light[i]/255-.38),.08,.85));
    const glints=['#7c718b','#697c91','#777f58','#9c7773','#678e80',state.scene.accent];
    const glyphs=':;t%SX8#@',gap=Math.max(.65,cw*.07);
    for(let yy=0;yy<rows;yy++)for(let xx=0;xx<cols;xx++){
      const i=yy*cols+xx,flag=flags[i],x=(x0+xx)*cw,y=(y0+yy)*ch;
      if(!flag){
        let edge=false;
        for(let dy=-1;dy<=1&&!edge;dy++)for(let dx=-1;dx<=1;dx++){const a=xx+dx,b=yy+dy;if(a>=0&&a<cols&&b>=0&&b<rows&&flags[b*cols+a]){edge=true;break;}}
        if(edge){g.globalAlpha=card.opacity*spec.depth*.27;g.fillStyle=dark?'#b4bcc7':'#8e9491';const d=Math.max(1,cw*.26);g.fillRect(x+(cw-d)/2,y+(ch-d)/2,d,d);}
        continue;
      }
      const grain=keys[i],tone=clamp(.5+(shades[i]-.5)*(state.scene.contrast??1.15)+(grain-.5)*.34+.045*Math.sin(u*TAU*14+grain*TAU)),opacity=card.opacity*spec.depth;
      const roll=noise(Math.floor(grain*10007),Math.floor(u*64+grain*7));
      let color=tint.map(v=>Math.round(clamp((49+tone*192)*(v/.43),25,242)));
      if(dark)color=color.map(v=>255-v*.75);
      g.globalAlpha=opacity;g.fillStyle=roll<.018?glints[Math.floor(grain*1000)%glints.length]:`rgb(${color.join(',')})`;
      g.fillRect(x+gap/2,y+gap/2,cw-gap,ch-gap);
      g.globalAlpha=opacity*.96;g.fillStyle=roll>.91?glints[Math.floor(grain*1000)%glints.length]:dark?'#141920':'#fcfcf6';
      const char=flag===3?'o':glyphs[Math.min(8,Math.floor(grain*3+(1-tone)*5+roll))];
      g.fillText(char,x+cw/2,y+ch*.53);
    }
    if(card.caption){
      const p=at(.45),size=Math.min(w,h);g.globalAlpha=card.opacity;g.fillStyle=card.textColor||state.scene.color;
      g.font=`500 ${size*.035}px ${STGFontLibrary.family(card.fontFamily||state.typography.fontFamily)}`;
      g.fillText(card.caption,p.x,p.y+length*.28+card.gap*size/1080,w*.9);
    }
  }
  function render(g,time,w,h,state,resources,duration){
    g.setTransform(g.canvas.width/w,0,0,g.canvas.height/h,0,0);g.globalAlpha=1;g.fillStyle=state.backgroundColor;g.fillRect(0,0,w,h);
    const bg=resources.get(state.backgroundMedia?.libraryId);
    if(bg){const image=bg.video||(bg.animated?CellMotionAnimatedImage.frameAt(bg.animated,time):bg.image);if(image){const iw=image.videoWidth||image.width,ih=image.videoHeight||image.height,k=Math.max(w/iw,h/ih);g.drawImage(image,(w-iw*k)/2,(h-ih*k)/2,iw*k,ih*k);}}
    const cw=w/(116*state.scene.density),ch=cw*1.44,u=mod(time/duration),isDark=rgb(state.backgroundColor).reduce((a,b)=>a+b,0)<380;
    g.lineWidth=Math.max(.45,w/2200);g.strokeStyle=isDark?'rgba(220,230,240,.045)':'rgba(73,85,93,.042)';g.beginPath();
    for(let x=0;x<w;x+=cw){g.moveTo(x,0);g.lineTo(x,h);}for(let y=0;y<h;y+=ch){g.moveTo(0,y);g.lineTo(w,y);}g.stroke();
    g.textAlign='center';g.textBaseline='middle';g.font=`600 ${ch*.80}px 'STG IBM Plex Mono',Consolas,monospace`;
    const animals=[];
    state.cards.forEach((card,index)=>{const spec=variants[card.libraryId];if(spec)animals.push(spineFor(spec,card,index,u,w,h,state));});
    // Several loose schools of dashes, with a local displacement away from each shark's head.
    for(let i=0;i<Math.round(state.scene.fish);i++){
      const group=i%5,a=u*TAU*(group%2?-1:1)+group*1.71;
      let x=w*(.5+Math.cos(a)*.48+(noise(i,3)-.5)*.22),y=h*(.5+Math.sin(a*.999999+group*.8)*.39+(noise(i,7)-.5)*.29);
      for(const animal of animals){const head=animal.nodes[0],dx=x-head.x,dy=y-head.y,d=Math.hypot(dx,dy),r=Math.min(w,h)*.12;if(d<r&&d>0){const push=(r-d)*.45;x+=dx/d*push;y+=dy/d*push;}}
      g.globalAlpha=.22+noise(i,8)*.32;g.fillStyle=isDark?'#cbd3d7':'#4c5456';g.fillText('-',Math.round(x/cw)*cw+cw/2,Math.round(y/ch)*ch+ch/2);
    }
    g.fillStyle=isDark?'#9cb5bb':'#b9c2c2';g.globalAlpha=state.scene.dots*.25;
    for(let i=0;i<150;i++){const x=noise(i,1)*w,y=noise(i,2)*h;g.fillRect(Math.round(x/cw)*cw+cw*.4,Math.round(y/ch)*ch+ch*.45,Math.max(1,cw*.15),Math.max(1,cw*.15));}
    animals.sort((a,b)=>a.spec.depth-b.spec.depth).forEach(animal=>{g.font=`600 ${ch*.80}px 'STG IBM Plex Mono',Consolas,monospace`;rasterAnimal(g,animal,u,w,h,cw,ch,state);});
    state.cards.filter(card=>!variants[card.libraryId]).forEach((card,index)=>{
      const a=u*TAU+index*2.4,x=w*(.5+Math.cos(a)*.22)+card.x*Math.min(w,h)/1080,y=h*(.5+Math.sin(a)*.22)+card.y*Math.min(w,h)/1080,size=Math.min(w,h)*.14*card.scale,asset=resources.get(card.libraryId);
      g.save();g.translate(x,y);g.rotate(card.rotation*Math.PI/180);g.globalAlpha=card.opacity;
      if(asset?.kind==='vector')STGIconLibrary.drawVector(g,asset,size,time);
      else{const image=asset?.animated?CellMotionAnimatedImage.frameAt(asset.animated,time):asset?.image;if(image){const k=size/Math.max(image.width,image.height);g.drawImage(image,-image.width*k/2,-image.height*k/2,image.width*k,image.height*k);}}
      g.restore();
    });
    g.globalAlpha=1;
  }
  window.AsciiOceanRenderer={render,variants};
})();
