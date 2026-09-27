(() => {
  "use strict";
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  const split=value=>typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value||''),part=>part.segment):Array.from(value||'');
  const defaults={sizePreset:'cinema',width:1620,height:1080,word:'doel',font:'stg:archivo-black',textColor:'#ffffff',backgroundColor:'#000000',size:.83,peak:1.12,spacing:-.1,positionY:.81,hold:.22,pulse:1.85,scatter:.43,rebuild:.45,rest:.20,speed:1};
  const beats=s=>[
    {label:'整词停留',en:'Word hold',short:'停留',shortEn:'Hold',duration:+s.hold,color:'#8ec8ff'},
    {label:'逐字接力',en:'Glyph relay',short:'接力',shortEn:'Relay',duration:+s.pulse,color:'#ffc4d6'},
    {label:'缩到两端',en:'Shrink to edges',short:'缩隐',shortEn:'Shrink',duration:+s.scatter,color:'#d4b8ff'},
    {label:'两端重组',en:'Rebuild',short:'重组',shortEn:'Rebuild',duration:+s.rebuild,color:'#d7ff2f'},
    {label:'聚合停留',en:'Reformed hold',short:'回弹',shortEn:'Bounce',duration:+s.rest,color:'#ffd27d'}
  ];
  // Visible ink boxes x, y, width, height in the source's 493 × 340 frame.
  // The time origin is 1.50 s of the clean reference cycle.
  const frames=[
    {t:0, boxes:[[.015,.30,.30,.57],[.32,.36,.37,.54],[.69,.53,.19,.27],[.89,.30,.10,.57]]},
    {t:.30,boxes:[[.015,.30,.30,.57],[.30,.31,.41,.60],[.71,.53,.18,.27],[.89,.30,.10,.57]]},
    {t:.50,boxes:[[.01,.045,.51,.91],[.52,.29,.28,.60],[.79,.54,.13,.24],[.91,.40,.08,.40]]},
    {t:.75,boxes:[[.015,.10,.47,.83],[.48,.39,.29,.52],[.76,.52,.15,.27],[.91,.32,.08,.48]]},
    {t:.95,boxes:[[.02,.55,.21,.30],[.23,.39,.33,.50],[.54,.20,.30,.50],[.83,-.01,.15,.81]]},
    {t:1.05,boxes:[[.018,.39,.245,.46],[.263,.47,.264,.39],[.466,.21,.345,.52],[.811,0,.165,.79]]},
    {t:1.10,boxes:[[.018,.32,.295,.55],[.313,.55,.186,.30],[.46,.21,.36,.54],[.82,0,.16,.79]]},
    {t:1.16,boxes:[[.018,.18,.39,.74],[.41,.59,.17,.27],[.51,.27,.33,.50],[.84,.047,.14,.74]]},
    {t:1.20,boxes:[[.018,.106,.45,.84],[.467,.63,.14,.24],[.517,.285,.33,.49],[.846,.08,.13,.71]]},
    {t:1.35,boxes:[[.015,.08,.48,.85],[.49,.68,.12,.19],[.53,.31,.32,.49],[.855,.08,.125,.70]]},
    {t:1.56,boxes:[[.015,.05,.49,.88],[.50,.70,.10,.15],[.53,.31,.32,.50],[.855,.11,.125,.66]]},
    {t:1.68,boxes:[[.015,.06,.48,.87],[.48,.50,.16,.28],[.66,.29,.245,.39],[.88,.17,.09,.49]]},
    {t:1.80,boxes:[[.015,.08,.47,.84],[.48,.35,.34,.50],[.79,.27,.17,.28],[.94,.23,.04,.32]]},
    {t:2.05,boxes:[[.02,.092,.45,.88],[.46,.37,.33,.48],[.79,.39,.15,.22],[.94,.29,.04,.23]]},
    {t:2.50,boxes:[[.02,.83,0,0],[.30,.74,0,0],[.98,.70,0,0],[1,.65,0,0]]},
    {t:2.70,boxes:[[.02,.76,.04,.09],[.21,.75,.007,.014],[.93,.71,.015,.03],[.98,.67,.012,.06]]},
    {t:2.84,boxes:[[.02,.38,.28,.53],[.29,.70,.04,.07],[.82,.42,.12,.23],[.94,.37,.04,.35]]},
    {t:2.95,boxes:[[.015,.30,.30,.57],[.30,.34,.32,.54],[.60,.43,.28,.43],[.88,.30,.10,.57]]},
    {t:3.15,boxes:[[.015,.30,.30,.57],[.32,.36,.37,.54],[.69,.53,.19,.27],[.89,.30,.10,.57]]}
  ];
  function collapseSize(t,center,steepness){
    const sample=x=>1/(1+Math.exp((x-center)*steepness));
    return clamp((sample(t)-sample(2.40))/(sample(2.05)-sample(2.40)));
  }
  function collapsePose(t){
    const p=clamp((t-2.05)/.45),start=frames.find(frame=>frame.t===2.05).boxes;
    const end=frames.find(frame=>frame.t===2.50).boxes;
    const travel=1-(1-p)**3;
    const dSize=(1-.07*ease((t-2.05)/.15))*collapseSize(t,2.279,62);
    const sizes=[dSize,collapseSize(t,2.19,40),collapseSize(t,2.18,35),collapseSize(t,2.18,35)];
    const result=start.map((box,i)=>{
      const size=sizes[i];
      const height=box[3]*size;
      const baseline=mix(box[1]+box[3],end[i][1],travel);
      const y=i===0?mix(box[1]+box[3]/2,.74,1-collapseSize(t,2.275,70))-height/2:baseline-height;
      return [mix(box[0],end[i][0],travel),y,box[2]*size,height];
    });
    result[0][0]-=.008;
    // In the recording o stays tangent to the shrinking right edge of d.
    result[1][0]=result[0][0]+result[0][2]-.01;
    return result;
  }
  function boxesAt(t){
    if(t>=2.05&&t<=2.50)return collapsePose(t);
    if(t<=0)return frames[0].boxes;
    for(let j=1;j<frames.length;j++)if(t<=frames[j].t){
      const a=frames[j-1],b=frames[j],p=ease((t-a.t)/(b.t-a.t));
      return a.boxes.map((box,i)=>box.map((v,k)=>mix(v,b.boxes[i][k],p)));
    }
    return frames.at(-1).boxes;
  }
  function sourceTime(time,s){
    const hold=+s.hold,pulse=+s.pulse,scatter=+s.scatter,rebuild=+s.rebuild,rest=+s.rest;
    if(time<hold)return 0;
    if(time<hold+pulse)return mix(.22,2.07,(time-hold)/pulse);
    if(time<hold+pulse+scatter)return mix(2.07,2.50,(time-hold-pulse)/scatter);
    if(time<hold+pulse+scatter+rebuild)return mix(2.50,2.95,(time-hold-pulse-scatter)/rebuild);
    return mix(2.95,3.15,(time-hold-pulse-scatter-rebuild)/Math.max(.001,rest));
  }
  function fontFor(s){
    const preset=window.STGFontLibrary?.preset(s.font)||{weight:900,style:'normal'};
    return `${preset.style||'normal'} ${preset.weight||900} 1000px ${window.STGFontLibrary?.family(s.font)||'"STG Archivo Black",sans-serif'}`;
  }
  function interpolateProfile(boxes,u){
    const x=clamp(u)*3,i=Math.min(2,Math.floor(x)),p=ease(x-i);
    return boxes[i].map((v,j)=>mix(v,boxes[i+1][j],p));
  }
  function keyedValue(t,keys){
    if(t<=keys[0][0])return keys[0][1];
    for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
      const a=keys[i-1],b=keys[i];
      return mix(a[1],b[1],ease((t-a[0])/(b[0]-a[0])));
    }
    return keys.at(-1)[1];
  }
  function detailPose(time,s){
    const t=sourceTime(time,s),boxes=boxesAt(t).map(box=>box.slice());
    // In the opening frames e compresses around its center, then briefly rises.
    const early=time<+s.hold?time*.22/Math.max(.001,+s.hold):t;
    const eSize=keyedValue(early,[[0,1],[.10,.90],[.23,1.04],[.33,.94],[.42,1]]);
    const eRise=keyedValue(early,[[0,0],[.10,0],[.23,-6],[.33,-2],[.42,0]]);
    if(early<=.42){
      const center=boxes[2][1]+boxes[2][3]/2;
      boxes[2][3]*=eSize;
      boxes[2][1]=center-boxes[2][3]/2+eRise/340;
    }
    // At 3.18–3.22 s in the recording e/l dip and spring upward together.
    const elHop=keyedValue(t,[[0,0],[1.60,0],[1.683,1],[1.717,.08],[1.78,-.17],[1.85,0],[3.15,0]]);
    boxes[2][1]+=elHop*31/340;
    boxes[3][1]+=elHop*24/340;
    return boxes;
  }
  function contactStrength(t){
    return keyedValue(t,[[0,1],[1.53,1],[1.68,0],[1.80,1],[2.03,1],[2.10,0],[2.84,0],[2.95,1],[3.15,1]]);
  }
  function drawReferenceO(ctx){
    // The recording has an elliptical crown and a narrow centered counter.
    ctx.beginPath();
    ctx.ellipse(.485,.5,.51,.485,0,0,Math.PI*2);
    ctx.ellipse(.48,.5,.16,.26,0,0,Math.PI*2);
    ctx.fill('evenodd');
  }
  function drawReferenceD(ctx,shoulder){
    // Trace one continuous outer edge; overlapping bowl/stem paths leave a pointed seam.
    const corner=clamp(shoulder);
    const stemX=.677,lowerJoin=.70;
    const startAngle=mix(5.296,4.855,corner);
    const point=angle=>{
      const cos=Math.cos(angle),sin=Math.sin(angle),power=sin<0?2.15:2.4;
      return [
        .43-.03*Math.max(0,sin)-.14*Math.max(0,sin)*Math.max(0,cos)+.43*Math.sign(cos)*Math.abs(cos)**(2/power),
        .644+(sin<0?.38:.366)*Math.sign(sin)*Math.abs(sin)**(2/power)
      ];
    };
    ctx.beginPath();
    ctx.moveTo(stemX,0);
    ctx.lineTo(stemX,mix(.327,.28,corner));
    ctx.bezierCurveTo(stemX,mix(.327,.283,corner),mix(stemX,.56,corner),mix(.327,.267,corner),...point(startAngle));
    for(let i=0;i<=256;i++){
      const angle=startAngle-(startAngle-lowerJoin)*i/256;
      ctx.lineTo(...point(angle));
    }
    ctx.lineTo(stemX,.899);
    ctx.lineTo(stemX,.995);
    ctx.lineTo(1,.995);
    ctx.lineTo(1,0);
    ctx.closePath();
    ctx.ellipse(.507,.634,.16,.183,0,0,Math.PI*2);
    ctx.fill('evenodd');
  }
  function draw(ctx,time,w,h,s){
    ctx.fillStyle=s.backgroundColor;ctx.fillRect(0,0,w,h);
    const chars=split(s.word).slice(0,24),count=chars.length;if(!count)return;
    const sourceWord=s.word==='doel'&&count===4;
    const roundedTypeface=window.STGFontLibrary?.idFor(s.font)==='archivo-black';
    const referenceTypeface=sourceWord&&roundedTypeface;
    const t=sourceTime(time,s);
    const reference=detailPose(time,s),referenceW=493,virtualH=340;
    // Preserve the hand-tuned source layout at its native aspect ratio. On a
    // wider canvas, re-layout the word in a matching logical frame so glyphs
    // keep their natural proportions while using the added width.
    const aspect=w/Math.max(1,h),referenceAspect=referenceW/virtualH;
    const useWideLayout=aspect>referenceAspect+.08;
    const useReferenceLayout=sourceWord&&!useWideLayout;
    const virtualW=useWideLayout?virtualH*aspect:referenceW;
    const scale=Math.min(w/virtualW,h/virtualH),ox=(w-virtualW*scale)/2,oy=(h-virtualH*scale)/2;
    const zoom=(+s.size||.83)/.83,peak=(+s.peak||1.12)/1.12;
    ctx.fillStyle=s.textColor;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font=fontFor(s);
    const metrics=chars.map(ch=>ctx.measureText(ch));
    const gap=((+s.spacing||0)+.1)*virtualH;
    const inRelay=time>=+s.hold&&time<+s.hold+(+s.pulse);
    const adjustedHeight=(height,index)=>inRelay?Math.max(.003,frames[0].boxes[index][3]+(height-frames[0].boxes[index][3])*peak):height;
    let boxes;
    if(useReferenceLayout)boxes=reference;
    else{
      const profiles=chars.map((_,i)=>interpolateProfile(reference,count===1?.5:i/(count-1)));
      const initial=chars.map((_,i)=>interpolateProfile(frames[0].boxes,count===1?.5:i/(count-1)));
      const widths=metrics.map(m=>Math.max(1,m.actualBoundingBoxLeft+m.actualBoundingBoxRight||m.width));
      const heights=metrics.map(m=>Math.max(1,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));
      const cjk=chars.some(ch=>/[^\u0000-\u024f]/u.test(ch));
      const narrow=ch=>/[ilIjtfr1|]/u.test(ch);
      const pairGaps=chars.slice(1).map((ch,i)=>clamp(gap+(cjk?12:roundedTypeface?(narrow(chars[i])&&narrow(ch)?10:narrow(chars[i])||narrow(ch)?5:2):5),cjk?-4:-16,30));
      const totalGap=pairGaps.reduce((a,b)=>a+b,0);
      const maxTextHeight=virtualH*.57;
      const fontSize=Math.min(1000*maxTextHeight/Math.max(...heights),1000*(virtualW-20-totalGap)/widths.reduce((a,b)=>a+b,0));
      const maxAscent=Math.max(...metrics.map(m=>m.actualBoundingBoxAscent))*fontSize/1000;
      const maxDescent=Math.max(...metrics.map(m=>m.actualBoundingBoxDescent))*fontSize/1000;
      const baseBaseline=virtualH/2+(maxAscent-maxDescent)/2;
      const ratios=profiles.map((p,i)=>{
        const relative=p[3]/Math.max(.001,initial[i][3]);
        return clamp(inRelay?1+(relative-1)*peak:relative,.001,2.2);
      });
      const natural=widths.map((width,i)=>width*fontSize/1000*ratios[i]);
      const unit=natural.reduce((a,b)=>a+b,0),fit=Math.min(1,(virtualW-18)/Math.max(1,unit+totalGap));
      let x=(virtualW-(unit+totalGap)*fit)/2;
      boxes=profiles.map((p,i)=>{
        const height=heights[i]*fontSize/1000*ratios[i]*fit;
        const motionBaseline=(p[1]+p[3]-initial[i][1]-initial[i][3])*virtualH*.56;
        const baseline=baseBaseline+motionBaseline;
        const width=natural[i]*fit,b=[x/virtualW,(baseline-height)/virtualH,width/virtualW,height/virtualH];
        x+=width+(pairGaps[i]||0)*fit;
        return b;
      });
    }
    const glyphs=boxes.map((box,i)=>{
      const m=metrics[i],iw=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,ih=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
      if(!iw||!ih||box[2]<=.00001||box[3]<=.00001)return null;
      const targetH=(useReferenceLayout?adjustedHeight(box[3],i):box[3])*virtualH*zoom;
      const naturalW=targetH*iw/ih;
      const targetW=useReferenceLayout?clamp(box[2]*virtualW*zoom*(targetH/(box[3]*virtualH*zoom)),naturalW*.78,naturalW*1.22):box[2]*virtualW*zoom;
      const shapeScale=referenceTypeface&&i===2?keyedValue(t,[[0,1.20],[.30,1]]):sourceWord&&i===1?1.035:1;
      return {m,iw,ih,w:targetW,h:targetH*shapeScale,x:box[0]*virtualW+(useReferenceLayout?(i-(count-1)/2)*gap:0),y:box[1]*virtualH-targetH*(shapeScale-1)/2};
    });
    if(useReferenceLayout&&glyphs.every(Boolean)){
      const strength=contactStrength(t);
      if(strength>0){
        const diagonalContact=keyedValue(t,[[0,0],[.65,0],[.86,8],[1.08,8],[1.16,20],[1.60,20],[1.68,0],[1.76,20],[2.03,20],[2.10,0],[3.15,0]]);
        const overlap=6-clamp(gap,-18,30),middleOverlap=overlap+diagonalContact;
        const total=glyphs.reduce((sum,g)=>sum+g.w,0),totalOverlap=overlap*2+middleOverlap;
        const fit=clamp((virtualW-18+totalOverlap)/Math.max(1,total),.65,1.06);
        const linkedWidth=total*fit-totalOverlap;
        let x=(virtualW-linkedWidth)/2-3;
        glyphs.forEach((g,i)=>{
          g.x=mix(g.x,x,strength);
          g.w=mix(g.w,g.w*fit,strength);
          x+=g.w-(i===1?middleOverlap:overlap);
        });
      }
    }
    if(referenceTypeface&&glyphs[1]){
      const o=glyphs[1],oldHeight=o.h;
      o.w*=keyedValue(t,[[0,1],[2.95,1],[3,.91],[3.15,1.08]]);
      o.h*=keyedValue(t,[[0,1],[2.95,1],[3,.79],[3.15,1.065]]);
      o.y+=(oldHeight-o.h)/2+keyedValue(t,[[0,0],[2.95,0],[3,12],[3.15,-3]]);
    }
    if(referenceTypeface&&Math.abs(gap)<1&&glyphs[2]){
      const inset=keyedValue(t,[[0,12],[.30,5],[.75,0],[2.95,0],[3,5],[3.15,-3]]);
      glyphs[2].x-=inset;
      glyphs[2].w+=inset;
    }
    if(useWideLayout){
      const visible=glyphs.filter(Boolean),shiftY=(+s.positionY-.81)*virtualH;
      if(visible.length){
        const left=Math.min(...visible.map(g=>g.x)),right=Math.max(...visible.map(g=>g.x+g.w));
        const top=Math.min(...visible.map(g=>g.y+shiftY)),bottom=Math.max(...visible.map(g=>g.y+shiftY+g.h));
        const fit=Math.min(aspect/referenceAspect,(virtualW-12)/Math.max(1,right-left),(virtualH-12)/Math.max(1,bottom-top));
        if(Math.abs(fit-1)>.001){
          const cx=(left+right)/2,cy=(top+bottom)/2;
          visible.forEach(g=>{
            const gx=g.x+g.w/2,gy=g.y+shiftY+g.h/2;
            g.w*=fit;g.h*=fit;
            g.x=cx+(gx-cx)*fit-g.w/2;
            g.y=cy+(gy-cy)*fit-g.h/2-shiftY;
          });
        }
      }
    }
    glyphs.forEach((g,i)=>{
      if(!g)return;
      ctx.save();ctx.translate(ox+g.x*scale,oy+(g.y+(+s.positionY-.81)*virtualH)*scale);
      if(roundedTypeface&&chars[i]==='o'){
        ctx.scale(g.w*scale,g.h*scale);
        drawReferenceO(ctx);
      }else if(roundedTypeface&&chars[i]==='d'){
        ctx.scale(g.w*scale,g.h*scale);
        drawReferenceD(ctx,(g.h-205)/95);
      }else{
        ctx.scale(g.w*scale/g.iw,g.h*scale/g.ih);
        ctx.fillText(chars[i],g.m.actualBoundingBoxLeft,g.m.actualBoundingBoxAscent);
      }
      ctx.restore();
    });
  }
  window.ReferenceMotionEffect={slug:'letterpulse',title:'字阶',titleEn:'Letter Pulse',subtitle:'逐字放大接力 · 缩隐重组',subtitleEn:'Glyph relay and rebuild',defaults,
    contentFields:[{key:'word',label:'文字',en:'Text',type:'text'}],
    motionFields:[
      {key:'size',label:'整体大小',en:'Overall size',type:'range',min:.22,max:1.1,step:.01,unit:' × 高'},
      {key:'peak',label:'跳动幅度',en:'Bounce amplitude',type:'range',min:.4,max:1.5,step:.01,unit:' ×'},
      {key:'spacing',label:'字母间距',en:'Letter spacing',type:'range',min:-.3,max:.2,step:.01,unit:' × 高'},
      {key:'positionY',label:'纵向位置',en:'Vertical position',type:'range',min:.4,max:.98,step:.01,unit:' × 高'},
      {key:'hold',label:'整词停留',en:'Word hold',type:'range',min:.1,max:2,step:.05,unit:' s',timing:true},
      {key:'pulse',label:'接力时长',en:'Relay duration',type:'range',min:.4,max:4,step:.05,unit:' s',timing:true},
      {key:'scatter',label:'缩隐时长',en:'Shrink duration',type:'range',min:.1,max:1.5,step:.01,unit:' s',timing:true},
      {key:'rebuild',label:'重组时长',en:'Rebuild duration',type:'range',min:.1,max:2,step:.01,unit:' s',timing:true},
      {key:'rest',label:'末段回弹',en:'Final bounce',type:'range',min:.1,max:1.5,step:.01,unit:' s',timing:true},
      {key:'speed',label:'播放速度',en:'Playback speed',type:'range',min:.25,max:3,step:.05,unit:' ×'}
    ],beats,draw};
})();
