(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const defaults = Object.freeze({text:"TOO MUCH\nTO WATCH",font:"stg:archivo-black",letterStyle:"bubble",size:172,tracking:0,lineSpacing:1,textColor:"#ff54dc",backgroundColor:"#963079",lead:2,write:.6,restore:2.2,flow:1,rotation:1,width:1920,height:1080});
  const keys = Object.keys(defaults);
  const storageKey = "cellmotion-bubble-frame-fluid-v2";
  const paletteBackgrounds={'#ff54dc':'#963079','#f1ff38':'#89882b','#17ff9f':'#076f45','#49edff':'#126d83','#ff9c28':'#a7562c','#bd80ff':'#744bb0'};
  const previousBackgrounds={'#ff54dc':'#861267','#f1ff38':'#797914','#ff9c28':'#994516','#bd80ff':'#6336a1'};
  function pairedBackground(color){
    if(paletteBackgrounds[color])return paletteBackgrounds[color];
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),max=Math.max(...rgb)||1;
    return '#'+rgb.map(v=>Math.round(10+v/max*118).toString(16).padStart(2,'0')).join('');
  }
  const state = {...defaults};
  const canvas = $("canvas");
  const screenCanvas=document.createElement('canvas');screenCanvas.width=1440;screenCanvas.height=768;
  let backgroundMedia = null, backgroundRuntime = null;
  let time = 0, playing = true, busy = false, lastFrame = performance.now(), saveTimer;
  let customSizeSelected = false;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const duration = () => state.lead + state.write + state.restore;
  const split = (value) => [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(value)].map(item=>item.segment);
  const lines = () => {
    const count=9;
    return state.text.split(/\r?\n/).flatMap(line=>{const chars=split(line),rows=[];for(let i=0;i<chars.length;i+=count)rows.push(chars.slice(i,i+count).join(''));return rows.length?rows:[''];});
  };
  const mediaDatabase = new Promise((resolve,reject)=>{
    const request=indexedDB.open("cellmotion-bubble-frame-media",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("videos");
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  async function videoBlob(id,blob){
    const db=await mediaDatabase;
    return new Promise((resolve,reject)=>{
      const request=db.transaction("videos",blob?"readwrite":"readonly").objectStore("videos")[blob?"put":"get"](...(blob?[blob,id]:[id]));
      request.onsuccess=()=>resolve(blob||request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  const blobDataURL=(blob)=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  async function drawVideoFilmstrip(runtime){
    const film=$('backgroundFilmstrip');if(!film)return;
    const video=document.createElement('video');video.muted=true;video.preload='auto';
    try{
      await new Promise((resolve,reject)=>{video.addEventListener('loadeddata',resolve,{once:true});video.addEventListener('error',reject,{once:true});video.src=runtime.url;});
      const ctx=film.getContext('2d');ctx.clearRect(0,0,film.width,film.height);
      for(let i=0;i<8;i++){
        if(backgroundRuntime!==runtime)return;
        const at=Math.min(runtime.duration-.02,(i+.5)/8*runtime.duration);
        await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=at;});
        if(backgroundRuntime!==runtime)return;
        const sw=video.videoWidth,sh=video.videoHeight,fit=Math.max(60/sw,64/sh);
        ctx.save();ctx.beginPath();ctx.rect(i*60,0,60,64);ctx.clip();ctx.drawImage(video,i*60+(60-sw*fit)/2,(64-sh*fit)/2,sw*fit,sh*fit);ctx.restore();
      }
    }catch{film.getContext('2d').clearRect(0,0,film.width,film.height);}
    finally{video.removeAttribute('src');video.load();}
  }
  function syncBackgroundControls(){
    $("backgroundVideoOptions").hidden=!backgroundMedia;
    $("backgroundVideoName").textContent=backgroundMedia?.name||"";
    const length=backgroundRuntime?.duration||0;
    $("videoStart").max=String(Math.max(0,length-.1));
    $("videoEnd").max=String(length||3600);
    $("videoStart").value=String(backgroundMedia?.start||0);
    $("videoEnd").value=String(backgroundMedia?(backgroundMedia.end||length).toFixed(1):0);
    for(const button of document.querySelectorAll("[data-paper]")){
      button.style.setProperty("--paper-color",button.dataset.paper);
      button.setAttribute("aria-pressed",String(button.dataset.paper===state.backgroundColor));
    }
    for(const button of document.querySelectorAll("[data-ink-color]")){
      button.style.setProperty("--ink-color",button.dataset.inkColor);
      button.setAttribute("aria-pressed",String(button.dataset.inkColor===state.textColor));
    }
  }
  async function installVideo(info,blob){
    const url=URL.createObjectURL(blob);
    const video=document.createElement("video");
    video.muted=true;video.playsInline=true;video.preload="auto";
    try{
      await new Promise((resolve,reject)=>{
        video.addEventListener("loadeddata",resolve,{once:true});
        video.addEventListener("error",()=>reject(new Error("视频无法解码")),{once:true});
        video.src=url;video.load();
      });
    }catch(error){URL.revokeObjectURL(url);throw error;}
    backgroundRuntime?.video.pause();
    if(backgroundRuntime)URL.revokeObjectURL(backgroundRuntime.url);
    backgroundRuntime={url,blob,video,duration:video.duration,frame:null};
    backgroundMedia={id:info.id,name:info.name,type:info.type,start:info.start||0,end:info.end||video.duration};
    video.addEventListener("seeked",()=>paint(canvas,time));
    syncBackgroundControls();persist();paint(canvas,time);
    drawVideoFilmstrip(backgroundRuntime);
  }
  async function restoreVideo(info,data){
    if(!info){backgroundRuntime?.video.pause();if(backgroundRuntime)URL.revokeObjectURL(backgroundRuntime.url);backgroundMedia=backgroundRuntime=null;syncBackgroundControls();paint(canvas,time);return;}
    const id=info.id||crypto.randomUUID();
    const blob=data?await fetch(data).then(response=>response.blob()):await videoBlob(id);
    if(!blob)throw new Error("找不到已保存的视频，请重新上传");
    if(data)await videoBlob(id,blob);
    await installVideo({...info,id},blob);
  }
  function clipTime(at){
    const length=backgroundRuntime?.duration||0;
    if(!length)return 0;
    const start=clamp(backgroundMedia?.start||0,0,Math.max(0,length-.1));
    const end=clamp(backgroundMedia?.end||length,start+.1,length);
    return Math.min(length-.02,start+(Math.max(0,at)%(end-start)));
  }
  function previewVideoFrame(at){
    const runtime=backgroundRuntime;if(!runtime)return null;
    const video=runtime.video,target=clipTime(at);
    if(!video.seeking&&Math.abs(video.currentTime-target)>(playing?.16:.004))video.currentTime=target;
    if(playing&&!busy&&!video.seeking){video.playbackRate=Number($("speed").value);video.play().catch(()=>{});}
    else video.pause();
    if(video.seeking||video.readyState<2)return runtime.frame;
    const frame=runtime.frame||document.createElement("canvas");
    if(frame.width!==video.videoWidth||frame.height!==video.videoHeight){frame.width=video.videoWidth;frame.height=video.videoHeight;}
    frame.getContext("2d").drawImage(video,0,0);
    runtime.frame=frame;
    return frame;
  }
  function drawBackgroundVideo(ctx,source,width,height){
    if(!source)return;
    const sourceWidth=source.videoWidth||source.width,sourceHeight=source.videoHeight||source.height;
    if(!sourceWidth||!sourceHeight)return;
    const scale=Math.max(width/sourceWidth,height/sourceHeight),drawWidth=sourceWidth*scale,drawHeight=sourceHeight*scale;
    ctx.drawImage(source,(width-drawWidth)/2,(height-drawHeight)/2,drawWidth,drawHeight);
  }
  async function seekVideo(video,at){
    const target=clipTime(at);
    if(Math.abs(video.currentTime-target)<.002&&video.readyState>=2)return;
    await new Promise((resolve,reject)=>{
      const done=()=>{video.removeEventListener("error",fail);resolve();};
      const fail=()=>{video.removeEventListener("seeked",done);reject(new Error("视频帧读取失败"));};
      video.addEventListener("seeked",done,{once:true});video.addEventListener("error",fail,{once:true});video.currentTime=target;
    });
  }
  async function exportBackgroundVideo(){
    if(!backgroundRuntime)return null;
    const video=document.createElement("video");video.muted=true;video.preload="auto";
    await new Promise((resolve,reject)=>{video.addEventListener("loadeddata",resolve,{once:true});video.addEventListener("error",()=>reject(new Error("视频无法解码")),{once:true});video.src=backgroundRuntime.url;video.load();});
    return video;
  }

  function syncControls() {
    keys.forEach(key => {if ($(key)) $(key).value = state[key];});
    const preset = `${state.width}x${state.height}`;
    if (!customSizeSelected) $("ratio").value = [...$("ratio").options].some(option=>option.value===preset) ? preset : "custom";
    $("customSize").hidden = $("ratio").value !== "custom";
    $("canvasWidth").value = state.width;
    $("canvasHeight").value = state.height;
    $("dimensions").textContent = `${state.width} × ${state.height}`;
    $("exportDimensions").textContent = `${Math.round(state.width * Number($("exportScale").value))} × ${Math.round(state.height * Number($("exportScale").value))}`;
    for (const input of document.querySelectorAll("input[type=range]")) {
      const output = document.querySelector(`output[for="${input.id}"]`);
      if (output) output.textContent = input.value;
    }
    canvas.width = state.width;
    canvas.height = state.height;
    syncBackgroundControls();
    buildTimeline();
    fitCanvas();
    paint(canvas,time);
    document.dispatchEvent(new Event('bubble-controls-synced'));
  }

  function fitCanvas() {
    const area = canvas.parentElement;
    const scale = Math.min((area.clientWidth||600)/state.width,(area.clientHeight||600)/state.height);
    canvas.style.width = `${Math.max(1,Math.floor(state.width*scale))}px`;
    canvas.style.height = `${Math.max(1,Math.floor(state.height*scale))}px`;
  }

  function phases() {
    let start=0;
    return [["lead","舒展挤压","Expand","#d4b8ff"],["write","柔软定形","Settle","#ffc4d6"],["restore","回流展开","Reflow","#9de7d7"]].map(([key,zh,en,color])=>{const phase={key,zh,en,color,start,length:state[key]};start+=phase.length;return phase;});
  }
  function buildTimeline() {
    const total = duration();
    $("seek").max = total;
    $("phaseSegments").replaceChildren(...phases().map(phase=>{
      const item=document.createElement("button");item.type="button";
      item.className="tp-phase me-choreo-block";
      item.dataset.phase=phase.key;item.style.background=phase.color;
      item.style.width=`${100*phase.length/total}%`;
      item.innerHTML=`<span>${document.body.dataset.editorLanguage==="en"?phase.en:phase.zh}</span><small>${phase.length.toFixed(1)}s</small>`;
      item.setAttribute("aria-label",document.body.dataset.editorLanguage==="en"?`${phase.en} ${phase.length.toFixed(1)} seconds`:`${phase.zh} ${phase.length.toFixed(1)} 秒`);
      item.addEventListener("click",()=>{time=phase.start+Math.min(phase.length/2,0.35);playing=false;tickControls();paint(canvas,time);});
      return item;
    }));
    $("phaseLegend").textContent=phases().map(p=>`${document.body.dataset.editorLanguage==="en"?p.en:p.zh} ${p.start.toFixed(1)}–${(p.start+p.length).toFixed(1)}s`).join(" · ");
    tickControls();
  }
  function tickControls() {
    const total=duration();
    $("clock").textContent=`${time.toFixed(2)} / ${total.toFixed(2)}`;
    $("seek").value=time;
    $("playhead").style.left=`${100*time/total}%`;
    $("play").textContent=playing?(document.body.dataset.editorLanguage==="en"?"Pause":"暂停"):(document.body.dataset.editorLanguage==="en"?"Play":"播放");
    for(const block of $("phaseSegments").children){
      const phase=phases().find(item=>item.key===block.dataset.phase);
      block.setAttribute("aria-current",String(time>=phase.start && time<phase.start+phase.length));
    }
  }

  function layoutGlyphs() {
    const rows=lines().filter(line=>line.trim());
    const items=[];
    const margin=.025, gap=.007+state.tracking/8000;
    const rowHeight=(1-2*margin)/Math.max(1,rows.length);
    rows.forEach((line,row)=>{
      const chars=split(line);
      const height=rowHeight*.9/state.lineSpacing;
      const widths=chars.map(ch=>height*320/600*(/\s/.test(ch)?.35:/[Ii!.,:|]/.test(ch)?.4:/[MWmw]/.test(ch)?1.02:/[ftjr]/i.test(ch)?.62:.8));
      const natural=widths.reduce((sum,w)=>sum+w,0)+gap*Math.max(0,chars.length-1);
      const fit=Math.min(1,(1-2*margin)/natural);
      const h=height;
      let x=(1-natural*fit)/2;
      chars.forEach((ch,index)=>{
        const w=widths[index]*fit;
        if(!/\s/.test(ch)){
          const wobble=Math.sin(index*2.4+row)*.035;
          items.push({ch,x,y:margin+row*rowHeight+(rowHeight-h)/2+h*wobble,w,h,row});
        }
        x+=w+gap*fit;
      });
    });
    if(rows.length===2&&items.length===14&&items.filter(g=>g.row===0).length===7){
      items.forEach((g,i)=>{const box=BubbleFrameReferenceSlots[i];Object.assign(g,{x:box.x,y:box.y,w:box.w,h:box.h,variant:g.ch.toUpperCase()===box.ch?box.variant:undefined,reference:true});});
    }
    return items;
  }
  function paint(target,at,exportVideo=null) {
    const ctx=screenCanvas.getContext('2d'),width=screenCanvas.width,height=screenCanvas.height;
    ctx.fillStyle=state.backgroundColor;ctx.fillRect(0,0,width,height);
    drawBackgroundVideo(ctx,exportVideo||previewVideoFrame(at),width,height);
    BubbleFrameFluid.render(ctx,layoutGlyphs(),state,at,width,height);
    BubbleFrameScene.render(target,screenCanvas,state.textColor);
  }

  async function loadFont(){await Promise.all([BubbleFrameScene.ready,STGFontLibrary.load('stg:inter','CellMotion'),STGFontLibrary.load(state.font,state.text||"Bubble")]);paint(canvas,time);}
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>localStorage.setItem(storageKey,JSON.stringify({version:1,state,media:backgroundMedia})),250);}
  async function apply(candidate,media=null,videoData=null){
    for(const key of keys){
      const incoming=candidate?.[key];
      state[key]=typeof defaults[key]==="number" ? (Number.isFinite(Number(incoming))?Number(incoming):defaults[key]) : (typeof incoming==="string"?incoming:defaults[key]);
    }
    for(const p of ["lead","write","restore"])state[p]=clamp(state[p],.1,30);
    state.flow=clamp(state.flow,0,1.5);
    state.rotation=clamp(state.rotation,0,1);
    state.size=clamp(state.size,70,172);
    state.width=clamp(Math.round(state.width),320,4096);
    state.height=clamp(Math.round(state.height),320,4096);
    time=0;playing=true;syncControls();await loadFont();await restoreVideo(media,videoData);persist();
  }
  function download(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function exportFrame(format){
    if(busy)return;
    busy=true;
    for(const id of ["png","gif","mp4"])$(id).disabled=true;
    const scale=Number($("exportScale").value);
    const width=Math.round(state.width*scale/2)*2,height=Math.round(state.height*scale/2)*2;
    const out=document.createElement("canvas");out.width=width;out.height=height;
    const current=canvas;
    const originalSize=state.size,originalTracking=state.tracking;
    const originalWidth=state.width,originalHeight=state.height;
    let exportVideo=null;
    const render=async(at)=>{state.width=width;state.height=height;if(exportVideo)await seekVideo(exportVideo,at);paint(out,at%duration(),exportVideo);};
    let encoder;
    try{
      await loadFont();
      exportVideo=await exportBackgroundVideo();
      if(format==="png"){
        await render(time);
        const blob=await new Promise(resolve=>out.toBlob(resolve,"image/png"));
        if(!blob)throw new Error("PNG 编码失败");
        download(blob,`bubble-frame-${width}x${height}.png`);
      }else{
        const fps=Number($("exportFps").value),count=Math.ceil((Number($("exportDuration").value)||duration())*fps-1e-7);
        if(format==="mp4"){
          encoder=await HME.createH264MP4Encoder();
          encoder.width=width;encoder.height=height;encoder.frameRate=fps;encoder.kbps=Math.max(6000,Math.round(width*height*.025));encoder.groupOfPictures=fps;encoder.outputFilename="bubble-frame.mp4";encoder.initialize();
          const context=out.getContext("2d",{willReadFrequently:true});
          for(let i=0;i<count;i++){await render(i/fps);encoder.addFrameRgba(context.getImageData(0,0,width,height).data);if(i%10===0){$("status").textContent=`MP4 ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}}
          encoder.finalize();download(new Blob([encoder.FS.readFile("bubble-frame.mp4")],{type:"video/mp4"}),"bubble-frame.mp4");
        }else{
          const gif=new GIF({workers:2,quality:8,repeat:-1,width,height,workerScript:"js/continuation-gif.worker.js"});
          for(let i=0;i<count;i++){await render(i/fps);gif.addFrame(out,{copy:true,delay:Math.round(1000/fps)});if(i%8===0){$("status").textContent=`GIF ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}}
          const blob=await new Promise((resolve,reject)=>{gif.on("finished",resolve);gif.on("abort",()=>reject(new Error("GIF 编码中断")));gif.render();});
          download(blob,"bubble-frame.gif");
        }
      }
      $("status").textContent=`${format.toUpperCase()} 已生成 · ${width} × ${height}`;
    }catch(error){$("status").textContent=`导出失败：${error.message}`;}
    finally{encoder?.delete();exportVideo?.pause();state.width=originalWidth;state.height=originalHeight;state.size=originalSize;state.tracking=originalTracking;paint(current,time);busy=false;for(const id of ["png","gif","mp4"])$(id).disabled=false;}
  }

  keys.forEach(key=>{
    const input=$(key);if(!input)return;
    input.addEventListener(input.tagName==="SELECT"?"change":"input",()=>{
      state[key]=typeof defaults[key]==="number"?Number(input.value):input.value;
      if(key==="text"){
        time=0;playing=true;lastFrame=performance.now();
        loadFont();
      }
      if(["lead","write","restore"].includes(key)){time=phases().find(p=>p.key===key).start;playing=true;lastFrame=performance.now();buildTimeline();}
      if(key==="font")loadFont();
      if(key==="textColor")state.backgroundColor=pairedBackground(state.textColor);
      syncControls();persist();
    });
  });
  for(const button of document.querySelectorAll("[data-paper]"))button.addEventListener("click",()=>{
    state.backgroundColor=button.dataset.paper;
    syncControls();persist();
  });
  for(const button of document.querySelectorAll("[data-ink-color]"))button.addEventListener("click",()=>{
    state.textColor=button.dataset.inkColor;
    if(button.dataset.stageColor)state.backgroundColor=button.dataset.stageColor;
    syncControls();persist();
  });
  $("backgroundVideoFile").addEventListener("change",async()=>{
    const file=$("backgroundVideoFile").files[0];if(!file)return;
    $("backgroundVideoStatus").textContent="正在载入视频…";
    try{
      if(!file.type.startsWith("video/"))throw new Error("请选择视频文件");
      const info={id:crypto.randomUUID(),name:file.name,type:file.type,start:0,end:null};
      await videoBlob(info.id,file);
      await installVideo(info,file);
      $("backgroundVideoStatus").textContent="视频背景已替换";
    }catch(error){$("backgroundVideoStatus").textContent=`载入失败：${error.message}`;}
    $("backgroundVideoFile").value="";
  });
  for(const id of ["videoStart","videoEnd"])$(id).addEventListener("change",()=>{
    if(!backgroundMedia||!backgroundRuntime)return;
    const length=backgroundRuntime.duration;
    const start=clamp(Number($("videoStart").value)||0,0,Math.max(0,length-.1));
    const end=clamp(Number($("videoEnd").value)||length,start+.1,length);
    backgroundMedia.start=Math.min(start,end-.1);backgroundMedia.end=end;
    syncBackgroundControls();persist();paint(canvas,time);
  });
  $("removeBackgroundVideo").addEventListener("click",async()=>{await restoreVideo(null);persist();$("backgroundVideoStatus").textContent="视频背景已移除";});
  $("ratio").addEventListener("change",()=>{
    customSizeSelected=$("ratio").value==="custom";
    $("customSize").hidden=$("ratio").value!=="custom";
    if($("ratio").value!=="custom") [state.width,state.height]=$("ratio").value.split("x").map(Number);
    syncControls();persist();
  });
  for(const [id,key] of [["canvasWidth","width"],["canvasHeight","height"]])$(id).addEventListener("change",()=>{state[key]=clamp(Number($(id).value)||1080,320,4096);syncControls();persist();});
  $("exportScale").addEventListener("change",syncControls);
  $("seek").addEventListener("input",()=>{time=Number($("seek").value);playing=false;tickControls();paint(canvas,time);});
  $("play").addEventListener("click",()=>{playing=!playing;if(time>=duration())time=0;lastFrame=performance.now();tickControls();});
  $("replay").addEventListener("click",()=>{time=0;playing=true;lastFrame=performance.now();tickControls();paint(canvas,time);});
  for(const button of document.querySelectorAll(".tc-tabs button"))button.addEventListener("click",()=>{
    for(const item of document.querySelectorAll(".tc-tabs button"))item.setAttribute("aria-pressed",String(item===button));
    for(const pane of document.querySelectorAll("[data-pane]"))pane.hidden=pane.dataset.pane!==button.dataset.tab;
  });
  $("exportShortcut").addEventListener("click",()=>document.querySelector('[data-tab="export"]').click());
  $("theme").addEventListener("click",()=>{document.body.dataset.editorTheme=document.body.dataset.editorTheme==="dark"?"light":"dark";});
  $("language").addEventListener("click",()=>{
    const en=document.body.dataset.editorLanguage!=="en";
    document.body.dataset.editorLanguage=en?"en":"zh";
    for(const element of document.querySelectorAll("[data-zh][data-en]"))element.textContent=element.dataset[en?"en":"zh"];
    $("language").textContent=en?"中文":"EN";buildTimeline();
  });
  $("saveScheme").addEventListener("click",async()=>{try{const scheme={version:1,state,media:backgroundMedia};if(backgroundRuntime)scheme.videoData=await blobDataURL(backgroundRuntime.blob);localStorage.setItem(storageKey,JSON.stringify({version:1,state,media:backgroundMedia}));download(new Blob([JSON.stringify(scheme,null,2)],{type:"application/json"}),"bubble-frame-scheme.json");$("saveStatus").textContent="方案已保存";}catch(error){$("saveStatus").textContent=`保存失败：${error.message}`;}});
  $("importScheme").addEventListener("click",()=>$("schemeFile").click());
  $("schemeFile").addEventListener("change",async()=>{try{const data=JSON.parse(await $("schemeFile").files[0].text());if(data.version!==1||!data.state)throw new Error("方案格式不匹配");await apply(data.state,data.media,data.videoData);$("saveStatus").textContent="方案已导入";}catch(error){$("saveStatus").textContent=`导入失败：${error.message}`;}$("schemeFile").value="";});
  $("resetScheme").addEventListener("click",async()=>{await apply(defaults);$("saveStatus").textContent="已恢复默认";});
  $("clearScheme").addEventListener("click",async()=>{await apply({...defaults,text:""});$("saveStatus").textContent="文字已清空";});
  for(const format of ["png","gif","mp4"])$(format).addEventListener("click",()=>exportFrame(format));
  $("pauseEdit").onclick=()=>{time=0;playing=false;tickControls();paint(canvas,time);};
  window.CellMotionBubbleFrame={state:()=>({...state}),apply,phases,render:paint,seek:(at)=>{time=clamp(at,0,duration());playing=false;tickControls();paint(canvas,time);}};
  new ResizeObserver(fitCanvas).observe(canvas.parentElement);
  function animate(now){if(playing&&!busy){time=Math.min(duration(),time+Math.max(0,Math.min((now-lastFrame)/1000,0.1))*Number($("speed").value));if(time>=duration())time=0;tickControls();paint(canvas,time);}lastFrame=now;requestAnimationFrame(animate);}
  try{
    let saved=JSON.parse(localStorage.getItem(storageKey));
    if(new URLSearchParams(location.search).get('from')==='gallery'){apply(defaults);requestAnimationFrame(animate);return;}
    if(saved?.state&&previousBackgrounds[saved.state.textColor]===saved.state.backgroundColor)saved={...saved,state:{...saved.state,backgroundColor:pairedBackground(saved.state.textColor)}};
    if(!saved){
      const legacy=JSON.parse(localStorage.getItem('cellmotion-bubble-frame-fluid-v1'));
      if(legacy?.version===1)saved={...legacy,state:{...legacy.state,backgroundColor:pairedBackground(legacy.state.textColor||defaults.textColor),lead:defaults.lead,write:defaults.write,restore:defaults.restore,flow:1}};
    }
    apply(saved?.version===1?saved.state:defaults,saved?.media).catch(error=>{$("backgroundVideoStatus").textContent=error.message;});
  }catch{apply(defaults);}
  requestAnimationFrame(animate);
})();
