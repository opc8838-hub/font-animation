/* Local silhouette extraction. No network, inference, or model dependencies. */
(() => {
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const modes=['auto','alpha','dark','light','manual'];
function settings(raw={}){
 if(!raw||typeof raw!=='object')raw={};
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)?p.map(v=>clamp(v,0,1)):null;
 return {mode:modes.includes(raw.mode)?raw.mode:'auto',tolerance:clamp(Number(raw.tolerance)||42,1,180),threshold:clamp(Number(raw.threshold)||160,1,254),background:/^#[\da-f]{6}$/i.test(raw.background)?raw.background:null,protect:raw.protect!==false,
 polygon:Array.isArray(raw.polygon)?raw.polygon.slice(0,2000).map(point).filter(Boolean):[],strokes:Array.isArray(raw.strokes)?raw.strokes.slice(0,300).map(s=>({kind:s.kind==='restore'?'restore':'erase',radius:clamp(Number(s.radius)||.025,.001,.25),points:Array.isArray(s.points)?s.points.slice(0,4000).map(point).filter(Boolean):[]})).filter(s=>s.points.length):[]};
}
function borderColor(data,w,h){
 const buckets=new Map();const add=i=>{if(data[i+3]<250)return;const key=[data[i]>>4,data[i+1]>>4,data[i+2]>>4].join(',');const a=buckets.get(key)||[0,0,0,0];a[0]++;a[1]+=data[i];a[2]+=data[i+1];a[3]+=data[i+2];buckets.set(key,a);};
 const step=Math.max(1,Math.floor(Math.max(w,h)/256));for(let x=0;x<w;x+=step){add(x*4);add(((h-1)*w+x)*4);}for(let y=0;y<h;y+=step){add(y*w*4);add((y*w+w-1)*4);}
 const a=[...buckets.values()].sort((a,b)=>b[0]-a[0])[0]||[1,255,255,255];return {r:Math.round(a[1]/a[0]),g:Math.round(a[2]/a[0]),b:Math.round(a[3]/a[0])};
}
function build(image,raw){
 const config=settings(raw),iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,scale=Math.min(1,4096/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
 const source=make(w,h),sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0,w,h);const pixels=sc.getImageData(0,0,w,h),originalAlpha=new Uint8Array(w*h);let transparent=0;
 for(let i=0;i<originalAlpha.length;i++){originalAlpha[i]=pixels.data[i*4+3];if(originalAlpha[i]<250)transparent++;}
 const hasAlpha=transparent>Math.max(4,w*h*.001),method=config.mode==='auto'&&hasAlpha?'alpha':config.mode;
 let rgb=config.background?{r:parseInt(config.background.slice(1,3),16),g:parseInt(config.background.slice(3,5),16),b:parseInt(config.background.slice(5,7),16)}:borderColor(pixels.data,w,h),background;
 if(method==='auto'){
  const protect=stgMedia.protectSubjectWhite;stgMedia.protectSubjectWhite=config.protect;
  try{background=stgMediaConnectedBackgroundMask(pixels.data,w,h,rgb,config.tolerance);}finally{stgMedia.protectSubjectWhite=protect;}
 }
 for(let i=0;i<originalAlpha.length;i++){
  const o=i*4;let alpha=originalAlpha[i];
  if(background?.[i])alpha=0;
  if(method==='dark'||method==='light'){const luminance=.2126*pixels.data[o]+.7152*pixels.data[o+1]+.0722*pixels.data[o+2];const amount=clamp((method==='dark'?config.threshold-luminance:luminance-config.threshold)/3+.5,0,1);alpha*=amount;}
  pixels.data[o]=pixels.data[o+1]=pixels.data[o+2]=255;pixels.data[o+3]=alpha;
 }
 const mask=make(w,h),mc=mask.getContext('2d',{willReadFrequently:true});mc.putImageData(pixels,0,0);
 if(config.polygon.length>=3){mc.clearRect(0,0,w,h);mc.fillStyle='#fff';mc.beginPath();config.polygon.forEach((p,i)=>mc[i?'lineTo':'moveTo'](p[0]*w,p[1]*h));mc.closePath();mc.fill();}
 for(const stroke of config.strokes){mc.globalCompositeOperation=stroke.kind==='erase'?'destination-out':'source-over';mc.fillStyle=mc.strokeStyle='#fff';mc.lineCap=mc.lineJoin='round';mc.lineWidth=stroke.radius*Math.min(w,h)*2;mc.beginPath();stroke.points.forEach((p,i)=>mc[i?'lineTo':'moveTo'](p[0]*w,p[1]*h));if(stroke.points.length===1){mc.arc(stroke.points[0][0]*w,stroke.points[0][1]*h,mc.lineWidth/2,0,Math.PI*2);mc.fill();}else mc.stroke();}
 mc.globalCompositeOperation='source-over';const finished=mc.getImageData(0,0,w,h);for(let i=0;i<originalAlpha.length;i++)finished.data[i*4+3]=Math.min(finished.data[i*4+3],originalAlpha[i]);mc.putImageData(finished,0,0);
 // Sample bounds at reduced resolution; the mask itself retains source precision.
 const small=make(Math.min(512,w),Math.max(1,Math.round(h*Math.min(512,w)/w))),sm=small.getContext('2d',{willReadFrequently:true});sm.drawImage(mask,0,0,small.width,small.height);const sample=sm.getImageData(0,0,small.width,small.height).data;let x0=small.width,y0=small.height,x1=-1,y1=-1,count=0;
 for(let y=0;y<small.height;y++)for(let x=0;x<small.width;x++)if(sample[(y*small.width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}
 const bounds=count?{x:Math.max(0,(x0-1)/small.width),y:Math.max(0,(y0-1)/small.height),w:Math.min(1,(x1-x0+3)/small.width),h:Math.min(1,(y1-y0+3)/small.height)}:{x:0,y:0,w:1,h:1};bounds.w=Math.min(bounds.w,1-bounds.x);bounds.h=Math.min(bounds.h,1-bounds.y);
 return {mask,source,bounds,method,coverage:count/(small.width*small.height),background:'#'+[rgb.r,rgb.g,rgb.b].map(v=>v.toString(16).padStart(2,'0')).join(''),width:w,height:h};
}
function editor({get,onChange}){
 const $=id=>document.getElementById(id),view=$('maskCanvas'),vc=view.getContext('2d');let result=null,polygon=[],active=null,tool='erase';
 function draw(){if(!result){vc.clearRect(0,0,view.width,view.height);return;}const {source,mask}=result,w=view.width,h=view.height;vc.clearRect(0,0,w,h);vc.drawImage(source,0,0,w,h);const overlay=make(w,h),oc=overlay.getContext('2d');oc.fillStyle='rgba(12,17,30,.68)';oc.fillRect(0,0,w,h);oc.globalCompositeOperation='destination-out';oc.drawImage(mask,0,0,w,h);vc.drawImage(overlay,0,0);const line=(points,color,radius,close=false)=>{if(!points.length)return;vc.strokeStyle=color;vc.fillStyle=color;vc.lineWidth=radius;vc.lineCap=vc.lineJoin='round';vc.beginPath();points.forEach((p,i)=>vc[i?'lineTo':'moveTo'](p[0]*w,p[1]*h));if(close)vc.closePath();vc.stroke();};line(polygon,'#3bffcf',2);for(const p of polygon){vc.fillStyle='#3bffcf';vc.beginPath();vc.arc(p[0]*w,p[1]*h,3,0,7);vc.fill();}if(active)line(active.points,active.kind==='erase'?'#ff537b99':'#23e9b199',active.radius*Math.min(w,h)*2);}
 function update(next){result=next;const cfg=settings(get()?.mask);$('maskMode').value=cfg.mode;$('maskTolerance').value=cfg.tolerance;$('maskThreshold').value=cfg.threshold;$('maskProtect').checked=cfg.protect;$('maskToleranceOut').textContent=cfg.tolerance;$('maskThresholdOut').textContent=cfg.threshold;$('maskBackground').value=cfg.background||next?.background||'#ffffff';$('maskAutoColor').checked=!cfg.background;
  if(next){view.width=Math.min(1000,next.width);view.height=Math.round(next.height*view.width/next.width);const method={auto:'背景色提取',alpha:'透明通道',light:'浅色图案',dark:'深色图案',manual:'手动轮廓'}[next.method];$('maskStatus').textContent=method+' · '+next.width+' × '+next.height+(next.coverage<.002?' · 未找到轮廓，请调容差或手动圈选':next.coverage>.96?' · 背景较复杂，可在下方手动圈选':'');}else $('maskStatus').textContent='上传图片后生成轮廓';draw();
 }
 const change=patch=>{const media=get();if(media)onChange({...settings(media.mask),...patch});};
 $('maskMode').onchange=e=>{polygon=[];change({mode:e.target.value,polygon:[],strokes:[]});};
 for(const [id,key]of [['maskTolerance','tolerance'],['maskThreshold','threshold']]){$(id).oninput=e=>$(id+'Out').textContent=e.target.value;$(id).onchange=e=>change({[key]:Number(e.target.value)});}
 $('maskProtect').onchange=e=>change({protect:e.target.checked});$('maskBackground').onchange=e=>change({background:e.target.value});$('maskAutoColor').onchange=e=>change({background:e.target.checked?null:$('maskBackground').value});
 $('maskTool').onchange=e=>{tool=e.target.value;polygon=[];draw();};$('maskZoom').onchange=e=>{view.style.width=Number(e.target.value)*100+'%';};
 $('maskComplete').onclick=()=>{if(polygon.length<3){$('maskStatus').textContent='先沿主体边缘点击至少 3 个点，再完成圈选';return;}change({mode:'manual',polygon:polygon.slice(),strokes:[]});polygon=[];draw();};
 $('maskUndo').onclick=()=>{if(polygon.length){polygon.pop();draw();return;}const cfg=settings(get()?.mask);if(cfg.strokes.length){cfg.strokes.pop();change(cfg);}else if(cfg.polygon.length)change({polygon:[]});};
 $('maskReset').onclick=()=>{polygon=[];change({mode:'auto',background:null,polygon:[],strokes:[]});};
 const pos=e=>{const r=view.getBoundingClientRect();return [clamp((e.clientX-r.left)/r.width,0,1),clamp((e.clientY-r.top)/r.height,0,1)];};
 view.onpointerdown=e=>{if(!result)return;e.preventDefault();const p=pos(e);if(tool==='pick'){const sc=result.source.getContext('2d'),d=sc.getImageData(Math.min(result.width-1,Math.floor(p[0]*result.width)),Math.min(result.height-1,Math.floor(p[1]*result.height)),1,1).data;change({mode:'auto',background:'#'+[...d.slice(0,3)].map(v=>v.toString(16).padStart(2,'0')).join('')});return;}if(tool==='polygon'){polygon.push(p);draw();return;}active={kind:tool,radius:Number($('maskBrush').value)/100,points:[p]};view.setPointerCapture(e.pointerId);draw();};
 view.onpointermove=e=>{if(!active)return;active.points.push(pos(e));draw();};
 view.onpointerup=()=>{if(!active)return;const cfg=settings(get()?.mask),stroke=active;active=null;change({strokes:[...cfg.strokes,stroke]});};view.onpointercancel=()=>{active=null;draw();};
 return {update,clearDraft(){polygon=[];active=null;}};
}
window.ThermalMask={settings,build,editor};
})();
