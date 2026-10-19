(() => {
'use strict';
const $ = id => document.getElementById(id), canvas = $('flowCanvas'), ctx = canvas.getContext('2d');
const KEY='me-thermal-profile-v1', DEFAULT={version:1,text:'hely.fun',showText:true,fontFamily:'stg:inter',textColor:'#fff4df',warm:'#f7cd8d',cool:'#8966db',hot:'#c246a2',fontSize:13.3,tracking:-0.025,textX:50,textY:51,size:113,x:50,y:0,softness:0.05,drift:1.1,flip:false,direction:1,speed:1,prelude:1.6,reveal:0.8,hold:2.8,return:0.8,width:1920,height:1080,export:{fps:60,duration:'cycle',seconds:6},media:{source:'image',originalDataUrl:'assets/thermal/profile.png',imageName:'侧脸',fileType:'image/png'}};
let state=structuredClone(DEFAULT), time=0, playing=true, last=performance.now(), ready=false, busy=false, loadId=0;
let history=[], future=[], savedTimer, asset=null, mask=null, textReplayTimer;
const layer=document.createElement('canvas'), lc=layer.getContext('2d');
const composite=document.createElement('canvas'), cc=composite.getContext('2d');
const coreMask=document.createElement('canvas'),mc=coreMask.getContext('2d'),bloom=document.createElement('canvas'),bc=bloom.getContext('2d');
let maskResult=null,coreMaskKey='';
const maskEditor=ThermalMask.editor({get:()=>state.media,onChange:config=>{if(!asset)return;remember();state.media.mask=config;refreshMask();persist();}});
const snapshot=()=>JSON.stringify(state), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const total=()=> (state.prelude+state.reveal+state.hold+state.return)/state.speed;
const ranges={fontSize:[1,40,.1,'文字大小','%'],tracking:[-.1,.3,.005,'字距','em'],textX:[0,100,1,'文字左右','%'],textY:[0,100,1,'文字上下','%'],size:[50,170,1,'主体大小','%'],x:[0,100,1,'主体左右','%'],y:[-40,40,1,'主体上下','%'],softness:[0,5,.05,'边缘柔化','%'],drift:[0,5,.1,'轻微漂移','%'],speed:[.25,3,.05,'整体速度','×'],prelude:[.1,8,.1,'热色流动','秒'],reveal:[.1,4,.1,'逐字浮现','秒'],hold:[.1,10,.1,'文字停留','秒'],return:[.1,5,.1,'循环回归','秒']};
for(const [box,keys] of [['typeControls',['fontSize','tracking','textX','textY']],['portraitControls',['size','x','y','softness','drift']],['timingControls',['speed','prelude','reveal','hold','return']]]) for(const key of keys){
 const [min,max,step,label,unit]=ranges[key], row=document.createElement('label'); row.textContent=label;const output=document.createElement('output');output.id=key+'Out';row.append(output);const input=document.createElement('input');Object.assign(input,{id:key,type:'range',min,max,step});input.dataset.state='';row.append(input);$(box).append(row);
}
function normalized(raw){
 const result=structuredClone(DEFAULT);
 for(const key of Object.keys(DEFAULT)){
  if(key==='media'||key==='export')continue;
  if(typeof DEFAULT[key]==='number'){const v=Number(raw[key]);if(Number.isFinite(v)) result[key]=v;}
  else if(typeof DEFAULT[key]==='boolean'){if(typeof raw[key]==='boolean')result[key]=raw[key];}
  else if(typeof raw[key]==='string')result[key]=raw[key].slice(0,2000);
 }
 for(const [key,[min,max]] of Object.entries(ranges))result[key]=clamp(result[key],min,max);
 for(const key of ['textColor','warm','cool','hot'])if(!/^#[\da-f]{6}$/i.test(result[key]))result[key]=DEFAULT[key];
 result.direction=result.direction===-1?-1:1;
 result.width=clamp(Math.round(result.width/2)*2,240,3840);result.height=clamp(Math.round(result.height/2)*2,240,3840);
 if(!STGFontLibrary.preset(result.fontFamily))result.fontFamily=DEFAULT.fontFamily;
 if(raw.media===null)result.media=null;
 else if(raw.media&&typeof raw.media.originalDataUrl==='string'&&(/^(data:image\/(png|jpeg|webp|avif|gif|bmp|svg\+xml);base64,|assets\/thermal\/profile\.png$)/.test(raw.media.originalDataUrl))){result.media={source:'image',originalDataUrl:raw.media.originalDataUrl,imageName:String(raw.media.imageName||'图片').slice(0,100),fileType:String(raw.media.fileType||'image/png'),libraryId:typeof raw.media.libraryId==='string'?raw.media.libraryId.slice(0,100):undefined,fit:raw.media.fit==='contain'?'contain':'cover',mask:ThermalMask.settings(raw.media.mask)};}
 const e=raw.export||{};result.export={fps:[15,24,30,60].includes(Number(e.fps))?Number(e.fps):60,duration:['cycle','3','6','10','custom'].includes(e.duration)?e.duration:'cycle',seconds:clamp(Number(e.seconds)||6,.2,60)};
 return result;
}
function remember(){history.push(snapshot());if(history.length>40)history.shift();future=[];}
function persist(){clearTimeout(savedTimer);savedTimer=setTimeout(()=>{try{localStorage.setItem(KEY,snapshot());$('schemeStatus').textContent='已自动保存 · Ctrl / ⌘ Z 撤销';}catch{$('schemeStatus').textContent='本地空间不足，请用保存方案下载 JSON。';}},300);}
function setTime(t,pause=true){time=Math.max(0,t);if(pause)playing=false;last=performance.now();syncPlayback();paint();}
function replayText(){playing=true;setTime(state.prelude/state.speed,false);syncPlayback();}
function syncPlayback(){$('pauseButton').textContent=playing?'暂停':'播放';}
function sync(){
 document.querySelectorAll('[data-state]').forEach(el=>{if(el.type==='checkbox')el.checked=state[el.id];else el.value=state[el.id];});
 for(const [key,range]of Object.entries(ranges))$(key+'Out').textContent=Number(state[key].toFixed(3))+range[4];
 const preset=state.width+'x'+state.height;$('exportPreset').value=[...$('exportPreset').options].some(o=>o.value===preset)?preset:'custom';$('customSize').hidden=$('exportPreset').value!=='custom';$('exportWidth').value=state.width;$('exportHeight').value=state.height;
 $('layerToggle').textContent=($('selectedAsset').hidden?'展开已选':'收起已选')+' · '+(state.media?1:0);
 $('selectedAsset').replaceChildren();if(state.media){const img=new Image();img.src=state.media.originalDataUrl;const name=document.createElement('span');name.textContent=state.media.imageName+' · 图片轮廓';$('selectedAsset').append(img,name);}else $('selectedAsset').textContent='尚未添加图片';
 $('fps').value=state.export.fps;$('duration').value=state.export.duration;$('seconds').value=state.export.seconds;$('durationCustom').hidden=state.export.duration!=='custom';document.dispatchEvent(new Event('tc-controls-synced'));document.dispatchEvent(new CustomEvent('thermal:statechange',{detail:{state:structuredClone(state)}}));
 $('subjectFit').value=state.media?.fit||'cover';timeline();fit();
}
function timeline(){
 const phases=[['热色流动',state.prelude,'#ffd27d'],['逐字浮现',state.reveal,'#d4b8ff'],['停留流动',state.hold,'#ffc4d6'],['循环回归',state.return,'#9de7d7']];
 $('choreoBar').querySelectorAll('.me-choreo-block').forEach(e=>e.remove());$('choreoLegend').replaceChildren();let start=0;
 for(const [name,duration,color]of phases){const from=start/state.speed,to=(start+duration)/state.speed;const button=document.createElement('button');button.className='me-choreo-block';button.style.cssText='width:'+((to-from)/total()*100)+'%;background:'+color+'!important';button.innerHTML='<strong>'+name+'</strong><small>'+((to-from).toFixed(1))+'s</small>';button.onclick=()=>setTime(from+(to-from)*.5);$('choreoBar').insertBefore(button,$('choreoPlayhead'));const li=document.createElement('li');li.innerHTML='<i style="background:'+color+'"></i><b>'+name+'</b><span>'+from.toFixed(1)+'–'+to.toFixed(1)+' s</span>';$('choreoLegend').append(li);start+=duration;}
}
function fit(){const stage=canvas.parentElement,style=getComputedStyle(stage);const w=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),h=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),scale=Math.min(w/state.width,h/state.height);canvas.style.width=Math.max(1,state.width*scale)+'px';canvas.style.height=Math.max(1,state.height*scale)+'px';const r=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.round(state.width*scale*r));canvas.height=Math.max(1,Math.round(state.height*scale*r));paint();}
function refreshMask(){
 coreMaskKey='';
 if(!asset){mask=null;maskResult=null;maskEditor.update(null);paint();return;}
 maskResult=ThermalMask.build(asset.originalElement,state.media.mask);mask=maskResult.mask;asset.processedCanvas=mask;asset.processedWidth=mask.width;asset.processedHeight=mask.height;
 const ratio=Math.min(1,384/Math.max(mask.width,mask.height));layer.width=Math.max(1,Math.round(mask.width*ratio));layer.height=Math.max(1,Math.round(mask.height*ratio));maskEditor.update(maskResult);paint();
}
async function loadMedia(){
 const id=++loadId;ready=false;
 if(!state.media){mask=null;maskResult=null;asset=null;stgMedia.assets=[];maskEditor.clearDraft();maskEditor.update(null);ready=true;return;}
 const source=structuredClone(state.media),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('图片无法解码，请转换为 PNG、JPG 或 WebP 后重试'));img.src=source.originalDataUrl;});if(id!==loadId)return;
 stgMedia.assets=[];asset=stgMediaCreateAsset({name:source.imageName,type:source.fileType},img,source.originalDataUrl);asset.layer='back';stgMedia.activeAssetId=asset.id;maskEditor.clearDraft();refreshMask();ready=true;paint();
}
function mix(a,b,p){const aa=a.match(/\w\w/g).map(x=>parseInt(x,16)),bb=b.match(/\w\w/g).map(x=>parseInt(x,16));return '#'+aa.map((x,i)=>Math.round(x+(bb[i]-x)*p).toString(16).padStart(2,'0')).join('');}
// Elliptical diffusion without a flat center or a visible circular shoulder.
function glow(c,x,y,r,color,opacity=1,flatten=.68){
 c.save();c.translate(x,y);c.scale(1,flatten);const g=c.createRadialGradient(0,0,0,0,0,r);
 for(let i=0;i<=16;i++){const p=i/16,a=(Math.exp(-p*p*4.8)-Math.exp(-4.8))/(1-Math.exp(-4.8));g.addColorStop(p,color+Math.round(a*opacity*255).toString(16).padStart(2,'0'));}
 c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
}
// The portrait is ONLY an alpha mask. Source RGB never enters the renderer.
function renderFrame(target,t,w,h){
 const phase=((t%total())+total())%total()*state.speed, duration=total()*state.speed, theta=phase/duration*Math.PI*2*state.direction;
 target.save();target.setTransform(1,0,0,1,0,0);target.clearRect(0,0,w,h);target.imageSmoothingEnabled=true;target.imageSmoothingQuality='high';
 const transition=(1-Math.cos(theta))*.5,bg=target.createLinearGradient(0,0,w*.16*Math.sin(theta),h);
 bg.addColorStop(0,mix(mix(state.warm,state.cool,transition*.82),'#fff8f2',.2));bg.addColorStop(.5,mix(mix(state.warm,state.cool,.48),'#fff8f2',.2));bg.addColorStop(1,mix(mix(state.cool,state.warm,transition*.82),'#f0eaff',.18));target.fillStyle=bg;target.fillRect(0,0,w,h);
 if(mask){
  const mw=layer.width,mh=layer.height;lc.clearRect(0,0,mw,mh);lc.globalCompositeOperation='source-over';const field=lc.createLinearGradient(0,0,mw*.35,mh);const deepCool=mix(state.cool,'#7053cf',.12),richHot=mix(state.hot,'#d46b9e',.2),lightWarm=mix(state.warm,'#fff2d0',.2);field.addColorStop(0,mix(richHot,deepCool,transition));field.addColorStop(.48,mix(lightWarm,richHot,transition*.8));field.addColorStop(1,mix(richHot,deepCool,.7));lc.fillStyle=field;lc.fillRect(0,0,mw,mh);
  glow(lc,mw*(.47+.17*Math.sin(theta)),mh*(.32+.24*Math.sin(theta+.2)),mh*.66,lightWarm,.98,.72);
  glow(lc,mw*(.5+.17*Math.cos(theta)),mh*(.12+.39*(1-Math.cos(theta))*.5),mh*.48,richHot,.78,.75);
  glow(lc,mw*(.38+.15*Math.sin(theta)),mh*(.85-.38*Math.sin(theta)),mh*.58,deepCool,.82,.85);
  glow(lc,mw*.73,mh*(.83+.13*Math.cos(theta)),mh*.45,lightWarm,.9,.82);
  const fitted=state.media?.fit==='contain',bounds=fitted?maskResult.bounds:{x:0,y:0,w:1,h:1};
  const aspect=mask.width*bounds.w/(mask.height*bounds.h);
  const ph=fitted?Math.min(h*.76,w*.76/aspect)*state.size/100:Math.min(h*1.03,w*1.6)*state.size/100,pw=ph*aspect,dx=Math.sin(theta)*h*state.drift/100,dy=(1-Math.cos(theta))*h*state.drift/500;
  // Soft color fields use a small surface; the native-resolution alpha is applied last.
  const ratio=Math.min(1,4096/Math.max(pw,ph)),cw=Math.max(1,Math.ceil(pw*ratio)),ch=Math.max(1,Math.ceil(ph*ratio));if(composite.width!==cw||composite.height!==ch){composite.width=cw;composite.height=ch;}
  const feather=h*state.softness/100,key=[cw,ch,bounds.x,bounds.y,bounds.w,bounds.h,Math.max(h*.00085,feather)*cw/pw].join(':');
  if(coreMaskKey!==key){coreMask.width=cw;coreMask.height=ch;mc.filter='blur('+(Math.max(h*.00085,feather)*cw/pw)+'px)';mc.drawImage(mask,bounds.x*mask.width,bounds.y*mask.height,bounds.w*mask.width,bounds.h*mask.height,0,0,cw,ch);mc.filter='none';coreMaskKey=key;}
  cc.clearRect(0,0,cw,ch);cc.imageSmoothingEnabled=true;cc.imageSmoothingQuality='high';cc.globalCompositeOperation='source-over';cc.drawImage(coreMask,0,0);cc.globalCompositeOperation='source-in';cc.drawImage(layer,bounds.x*mw,bounds.y*mh,bounds.w*mw,bounds.h*mh,0,0,cw,ch);cc.globalCompositeOperation='source-over';
  // Diffusion has no fine detail: evaluate its broad blur on a small padded surface.
  const gs=Math.min(1,320/Math.max(pw,ph)),gw=Math.max(1,Math.ceil(pw*gs)),gh=Math.max(1,Math.ceil(ph*gs)),pad=Math.ceil(Math.max(h*.018,feather)*gs*3)+2;
  if(bloom.width!==gw+2*pad||bloom.height!==gh+2*pad){bloom.width=gw+2*pad;bloom.height=gh+2*pad;}bc.clearRect(0,0,bloom.width,bloom.height);
  bc.globalAlpha=.24;bc.filter='blur('+(Math.max(h*.018,feather)*gs)+'px)';bc.drawImage(composite,pad,pad,gw,gh);
  bc.globalAlpha=.22;bc.filter='blur('+(Math.max(h*.0055,feather)*gs)+'px)';bc.drawImage(composite,pad,pad,gw,gh);bc.filter='none';bc.globalAlpha=1;
  target.save();target.translate(w*state.x/100+dx,h*state.y/100+dy);target.scale(state.flip?-1:1,1);const top=fitted?(h-ph)*.5:-ph*.04;
  target.drawImage(bloom,-pw*.5-pad/gs,top-pad/gs,bloom.width/gs,bloom.height/gs);target.globalAlpha=.94;target.drawImage(composite,-pw*.5,top,pw,ph);target.restore();
 }
 if(state.showText&&state.text){
  const exit=1-smooth((phase-(duration-state.return))/state.return);
  if(phase>=state.prelude&&exit>0){const font=STGFontLibrary.preset(state.fontFamily);let fontPx=Math.min(w,h)*state.fontSize/100;
   const chars=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(state.text),s=>s.segment);
   const measure=()=>{target.font=font.style+' '+font.weight+' '+fontPx+'px '+STGFontLibrary.family(state.fontFamily);return chars.map(c=>target.measureText(c).width);};let widths=measure(),gap=fontPx*state.tracking,line=widths.reduce((a,b)=>a+b,0)+gap*Math.max(0,chars.length-1);if(line>w*.88){fontPx*=w*.88/line;widths=measure();gap=fontPx*state.tracking;line=widths.reduce((a,b)=>a+b,0)+gap*Math.max(0,chars.length-1);}
   let x=w*state.textX/100-line/2;target.textBaseline='middle';const y=h*state.textY/100;
   // The entire grapheme sequence fits the reveal phase, regardless of text length.
   const glyphDuration=state.reveal*(chars.length>1?.35:1),stagger=chars.length>1?(state.reveal-glyphDuration)/(chars.length-1):0;
   chars.forEach((char,i)=>{const progress=clamp((phase-state.prelude-i*stagger)/glyphDuration,0,1),appear=smooth(progress),rise=1-Math.pow(1-progress,3);if(appear>0){target.globalAlpha=appear*exit;target.fillStyle=mix(state.hot,state.textColor,appear);target.fillText(char,x,y+(1-rise)*fontPx*.5);}x+=widths[i]+gap;});
  }
 }
 target.restore();
}
function paint(){renderFrame(ctx,time,canvas.width,canvas.height);const p=(time%total())/total();$('choreoPlayhead').style.left=(p*100)+'%';$('clock').textContent=(time%total()).toFixed(2)+' / '+total().toFixed(2)+(document.body.dataset.editorLanguage==='en'?' s':' 秒');}
function tick(now){const active=playing&&!busy&&ready&&!document.hidden;if(active)time+=(now-last)/1000;last=now;if(active)paint();requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',()=>{last=performance.now();});
async function apply(raw){state=normalized(raw);sync();setTime(0,false);await loadMedia();persist();}
async function fontReady(){const p=STGFontLibrary.preset(state.fontFamily);await document.fonts.load(p.style+' '+p.weight+' 48px '+STGFontLibrary.family(state.fontFamily),state.text||'hely.fun');}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function status(message){$('exportStatus').textContent=message;$('stageExportStatus').textContent=message;}
async function exportFile(format){
 if(busy||!ready)return;busy=true;$('stageExportVideo').disabled=true;status('正在准备导出…');$('maskCanvas').style.pointerEvents='none';document.querySelectorAll('.panel-scroll input,.panel-scroll select,.panel-scroll button,.gm-inspector input,.gm-inspector select,.gm-inspector button,.tc-content button,.tc-content input,.me-asset-drawer button,.me-asset-drawer input,.me-asset-drawer select').forEach(el=>el.disabled=true);$('exportProgress').hidden=false;$('exportProgress').value=0;let encoder;
 try{await fontReady();const out=document.createElement('canvas');out.width=state.width;out.height=state.height;const c=out.getContext('2d',{willReadFrequently:true});const fps=Number($('fps').value),seconds=$('duration').value==='cycle'?total():clamp(Number($('duration').value==='custom'?$('seconds').value:$('duration').value)||6,.2,60),frames=Math.ceil(seconds*fps);const filename='hely-thermal-'+out.width+'x'+out.height+'.'+format;
  if(format==='png'){renderFrame(c,time,out.width,out.height);download(await new Promise(resolve=>out.toBlob(resolve,'image/png')),filename);}
  else if(format==='gif'){
   const gif=new GIF({workers:2,quality:5,width:out.width,height:out.height,workerScript:'js/continuation-gif.worker.js'});
   for(let f=0;f<frames;f++){renderFrame(c,f/fps,out.width,out.height);gif.addFrame(c,{copy:true,delay:1000/fps});if(f%4===0){status('准备 GIF · '+Math.round(f/frames*100)+'%');$('exportProgress').value=f/frames*.5;await new Promise(r=>setTimeout(r,0));}}
   const blob=await new Promise((resolve,reject)=>{gif.on('finished',resolve);gif.on('abort',()=>reject(Error('GIF 已取消')));gif.on('progress',p=>{status('编码 GIF · '+Math.round(p*100)+'%');$('exportProgress').value=.5+p*.5;});gif.render();});download(blob,filename);
  }else{
   encoder=await HME.createH264MP4Encoder();encoder.width=out.width;encoder.height=out.height;encoder.frameRate=fps;encoder.kbps=0;encoder.quantizationParameter=18;encoder.groupOfPictures=fps;encoder.outputFilename=filename;encoder.initialize();
   for(let f=0;f<frames;f++){renderFrame(c,f/fps,out.width,out.height);encoder.addFrameRgba(c.getImageData(0,0,out.width,out.height).data);if(f%3===0){status('编码 MP4 · '+Math.round(f/frames*100)+'%');$('exportProgress').value=f/frames;await new Promise(r=>setTimeout(r,0));}}
   encoder.finalize();download(new Blob([encoder.FS.readFile(filename)],{type:'video/mp4'}),filename);
  }$('exportProgress').value=1;status(format.toUpperCase()+' 已生成 · '+out.width+' × '+out.height);
 }catch(e){status('导出失败：'+e.message);}finally{encoder?.delete();busy=false;$('stageExportVideo').disabled=false;$('maskCanvas').style.pointerEvents='';document.querySelectorAll('.panel-scroll input,.panel-scroll select,.panel-scroll button').forEach(el=>el.disabled=false);last=performance.now();}
}
document.querySelectorAll('[data-state]').forEach(el=>{el.addEventListener('pointerdown',()=>{if(el.type==='range')remember();});el.addEventListener('focus',()=>{if(el.type==='text')remember();});el.addEventListener('input',event=>{if(event.isComposing)return;if(el.type!=='range'&&el.type!=='text')remember();state[el.id]=el.type==='checkbox'?el.checked:typeof DEFAULT[el.id]==='number'?Number(el.value):el.value;sync();if(['prelude','reveal','hold','return','speed'].includes(el.id)){const starts={prelude:0,reveal:state.prelude,hold:state.prelude+state.reveal,return:state.prelude+state.reveal+state.hold,speed:0};setTime(starts[el.id]/state.speed,false);playing=true;syncPlayback();}if(['text','fontFamily','showText'].includes(el.id)){clearTimeout(textReplayTimer);textReplayTimer=setTimeout(()=>{fontReady().then(replayText);},180);}persist();});});
$('text').addEventListener('compositionend',()=>{$('text').dispatchEvent(new Event('input',{bubbles:true}));});
$('replayText').onclick=replayText;
$('exportPreset').onchange=()=>{remember();if($('exportPreset').value!=='custom'){[state.width,state.height]=$('exportPreset').value.split('x').map(Number);}else{$('customSize').hidden=false;return;}sync();persist();};
for(const id of ['exportWidth','exportHeight'])$(id).onchange=()=>{remember();state=normalized({...state,width:Number($('exportWidth').value),height:Number($('exportHeight').value)});sync();persist();};
$('pauseButton').onclick=()=>{playing=!playing;last=performance.now();syncPlayback();};$('restartButton').onclick=()=>{playing=true;setTime(0,false);};
$('layerToggle').onclick=()=>{$('selectedAsset').hidden=!$('selectedAsset').hidden;$('layerToggle').closest('.me-layer-panel').classList.toggle('is-list-expanded',!$('selectedAsset').hidden);sync();};
$('subjectFit').onchange=e=>{if(!state.media)return;remember();state.media.fit=e.target.value;paint();persist();};
$('portraitUpload').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp','image/avif','image/gif','image/bmp','image/svg+xml'].includes(file.type)){status('请选择 PNG、JPG、WebP、AVIF、GIF、BMP 或 SVG 图片');e.target.value='';return;}
 if(file.size>40*1024*1024){status('图片超过 40 MB，请先压缩或缩小尺寸');e.target.value='';return;}
 const previous=structuredClone(state);$('maskStatus').textContent='正在读取图片并生成轮廓…';
 try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('读取图片失败'));r.readAsDataURL(file);});remember();await apply({...state,size:100,x:50,y:0,media:{source:'image',originalDataUrl:data,imageName:file.name,fileType:file.type,fit:'contain',mask:ThermalMask.settings()}});if(file.type==='image/gif')$('maskStatus').textContent+=' · GIF 使用首帧';}
 catch(err){await apply(previous);status(err.message);}e.target.value='';
};
$('saveButton').onclick=()=>{persist();download(new Blob([JSON.stringify({effect:'thermal-profile',...state},null,2)],{type:'application/json'}),'thermal-profile-scheme.json');};
$('importFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const raw=JSON.parse(await f.text());if(raw.effect!=='thermal-profile'||raw.version!==1)throw Error('请选择热感 v1 方案');remember();await apply(raw);$('schemeStatus').textContent='方案已导入';}catch(err){$('schemeStatus').textContent='导入失败：'+err.message;}e.target.value='';};
$('resetButton').onclick=()=>{remember();apply(DEFAULT);};$('clearButton').onclick=()=>{remember();apply({...DEFAULT,text:'',media:null});};
document.addEventListener('keydown',async e=>{if(!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z'||/INPUT|TEXTAREA/.test(e.target.tagName))return;e.preventDefault();const from=e.shiftKey?future:history,to=e.shiftKey?history:future;if(from.length){to.push(snapshot());await apply(JSON.parse(from.pop()));}});
$('stageExportVideo').onclick=()=>exportFile('mp4');
for(const id of ['fps','duration','seconds'])$(id).onchange=()=>{remember();state.export={fps:Number($('fps').value),duration:$('duration').value,seconds:clamp(Number($('seconds').value)||6,.2,60)};$('durationCustom').hidden=state.export.duration!=='custom';persist();};for(const [id,format]of [['exportPng','png'],['exportGif','gif'],['exportVideo','mp4']])$(id).onclick=()=>exportFile(format);
new ResizeObserver(fit).observe(canvas.parentElement);window.addEventListener('resize',fit);
// Gallery / preview opens the approved default; ordinary refresh restores working autosave.
try{if(!new URLSearchParams(location.search).has('preview')&&!new URLSearchParams(location.search).has('from')){const saved=localStorage.getItem(KEY);if(saved)state=normalized(JSON.parse(saved));}}catch{}
sync();loadMedia().then(fontReady).then(()=>{ready=true;last=performance.now();paint();}).catch(e=>status(e.message));requestAnimationFrame(tick);
window.ThermalProfile={renderFrame,setTime,apply,exportFile,paint,fit,replayText,
 play(){playing=true;last=performance.now();syncPlayback();},pause(){playing=false;syncPlayback();},restart(){playing=true;setTime(0,false);},
 edit(){setTime((state.prelude+state.reveal+state.hold*.5)/state.speed);},
 async replaceMedia(media){remember();await apply({...state,size:100,x:50,y:0,media});},async removeMedia(){remember();await apply({...state,media:null});},
 get defaultState(){return structuredClone(DEFAULT)},get playing(){return playing},get time(){return time},get state(){return structuredClone(state)},get ready(){return ready},get busy(){return busy},get duration(){return total()}};
})();
