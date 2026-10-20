(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const defaults = Object.freeze({text:"Oddball\nInk in Motion",font:"stg:oddball",size:172,tracking:0,lineSpacing:1.22,textColor:"#29262c",backgroundColor:"#eeeae1",lead:0.4,write:3.2,hold:1.5,speckles:32,width:1080,height:1080});
  const keys = Object.keys(defaults);
  const storageKey = "cellmotion-oddball-ink-v1";
  const state = {...defaults};
  const canvas = $("canvas");
  const inkCanvas = document.createElement("canvas");
  const maskCanvas = document.createElement("canvas");
  let backgroundMedia = null, backgroundRuntime = null;
  let time = 0, playing = true, busy = false, lastFrame = performance.now(), saveTimer;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const englishOnly = (value) => String(value).replace(/\r\n?/g,"\n").replace(/[^\x20-\x7e\n]/g,"");
  const noise = (seed) => {const value=Math.sin(seed*12.9898)*43758.5453;return value-Math.floor(value);};
  const duration = () => state.lead + state.write + state.hold;
  const split = (value) => [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(value)].map(item=>item.segment);
  const lines = () => state.text.split(/\r?\n/).slice(0,20);
  const mediaDatabase = new Promise((resolve,reject)=>{
    const request=indexedDB.open("cellmotion-oddball-media",1);
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
    $("ratio").value = [...$("ratio").options].some(option=>option.value===preset) ? preset : "custom";
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
  }

  function fitCanvas() {
    const area = canvas.parentElement;
    const scale = Math.min((area.clientWidth||600)/state.width,(area.clientHeight||600)/state.height);
    canvas.style.width = `${Math.max(1,Math.floor(state.width*scale))}px`;
    canvas.style.height = `${Math.max(1,Math.floor(state.height*scale))}px`;
  }

  function phases() {
    return [
      {key:"lead",zh:"落笔",en:"Lead",start:0,length:state.lead},
      {key:"write",zh:"逐字写出",en:"Write",start:state.lead,length:state.write},
      {key:"hold",zh:"结束画面",en:"End frame",start:state.lead+state.write,length:state.hold}
    ];
  }
  function buildTimeline() {
    const total = duration();
    $("seek").max = total;
    $("phaseSegments").replaceChildren(...phases().map(phase=>{
      const item=document.createElement("div");
      item.className="tp-phase me-choreo-block";
      item.dataset.phase=phase.key;
      item.style.width=`${100*phase.length/total}%`;
      item.innerHTML=`<span>${document.body.dataset.editorLanguage==="en"?phase.en:phase.zh}</span><small>${phase.length.toFixed(1)}s</small>`;
      item.setAttribute("aria-label",`${phase.zh} ${phase.length.toFixed(1)} 秒`);
      item.addEventListener("click",()=>{time=phase.start+Math.min(phase.length/2,0.35);playing=false;tickControls();paint(canvas,time);});
      return item;
    }));
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

  function writeGlyph(ctx, character, penX, baseline, size, progress) {
    const strokes = window.ODDBALL_STROKES?.[character];
    if (!strokes?.length) return;
    const bounds = ctx.measureText(character);
    const padding = Math.ceil(size * 0.16);
    const originX = Math.ceil(bounds.actualBoundingBoxLeft + padding);
    const originY = Math.ceil(bounds.actualBoundingBoxAscent + padding);
    const width = Math.ceil(bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight + padding * 2);
    const height = Math.ceil(bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent + padding * 2);
    inkCanvas.width = maskCanvas.width = Math.max(1, width);
    inkCanvas.height = maskCanvas.height = Math.max(1, height);
    const ink = inkCanvas.getContext("2d");
    ink.font = ctx.font;
    ink.letterSpacing = ctx.letterSpacing;
    ink.textBaseline = "alphabetic";
    ink.fillStyle = state.textColor;
    ink.fillText(character, originX, originY);
    const mask = maskCanvas.getContext("2d");
    mask.fillStyle = mask.strokeStyle = "#000";
    mask.lineCap = mask.lineJoin = "round";
    const scale = size / 256;
    let remaining = progress * strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    for (const stroke of strokes) {
      for (let i = 0; i < stroke.length && remaining > 0; i++, remaining--) {
        const fraction = Math.min(1, remaining);
        const previous = stroke[Math.max(0, i - 1)];
        const current = stroke[i];
        const x = originX + (previous[0] + (current[0] - previous[0]) * fraction) * scale;
        const y = originY + (previous[1] + (current[1] - previous[1]) * fraction) * scale;
        const radius = (previous[2] + (current[2] - previous[2]) * fraction) * scale;
        if (i > 0) {
          mask.lineWidth = (previous[2] + radius / scale) * scale;
          mask.beginPath();
          mask.moveTo(originX + previous[0] * scale, originY + previous[1] * scale);
          mask.lineTo(x, y);
          mask.stroke();
        }
        mask.beginPath();
        mask.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
        mask.fill();
      }
      if (remaining <= 0) break;
    }
    ink.globalCompositeOperation = "destination-in";
    ink.drawImage(maskCanvas, 0, 0);
    ctx.drawImage(inkCanvas, penX - originX, baseline - originY);
  }

  function scatterGlyph(ctx, character, penX, baseline, size, progress, row, index) {
    const strokes = window.ODDBALL_STROKES?.[character];
    if (!strokes?.length || state.speckles <= 0) return;
    const total = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
    const count = Math.round(state.speckles * 0.35);
    const scale = size / 256;
    for (let i = 0; i < count; i++) {
      const seed = (row + 1) * 1039 + (index + 1) * 827 + i * 211;
      let pointIndex = Math.floor((i + noise(seed)) * total / count);
      if (pointIndex >= total * progress) continue;
      let point;
      for (const stroke of strokes) {
        if (pointIndex < stroke.length) { point = stroke[pointIndex]; break; }
        pointIndex -= stroke.length;
      }
      if (!point) continue;
      const angle = noise(seed + 17) * Math.PI * 2;
      const distance = size * (0.04 + noise(seed + 31) * 0.09);
      const radius = size * (0.004 + noise(seed + 53) * 0.017);
      ctx.globalAlpha = 0.3 + noise(seed + 71) * 0.4;
      ctx.beginPath();
      ctx.arc(penX + point[0] * scale + Math.cos(angle) * distance,
        baseline + point[1] * scale + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paint(target,at,exportVideo=null) {
    const ctx=target.getContext("2d");
    const width=target.width,height=target.height;
    ctx.fillStyle=state.backgroundColor;
    ctx.fillRect(0,0,width,height);
    drawBackgroundVideo(ctx,exportVideo||previewVideoFrame(at),width,height);
    const content=lines();
    const glyphCount=Math.max(1,content.reduce((sum,line)=>sum+split(line).length,0));
    const written=clamp((at-state.lead)/state.write,0,1);
    const visibleCount=glyphCount*written;
    if(visibleCount<=0) return;
    const preset=STGFontLibrary.preset("stg:oddball");
    const family=STGFontLibrary.family("stg:oddball");
    let size=Math.min(state.size,width*0.29,height/(Math.max(content.length,1)*state.lineSpacing+0.7));
    ctx.textBaseline="alphabetic";
    ctx.textAlign="left";
    const setFont=()=>{ctx.font=`${preset.style} ${preset.weight} ${size}px ${family}`;ctx.letterSpacing=`${state.tracking*size/172}px`;};
    setFont();
    for(let attempt=0;attempt<12;attempt++){
      if(content.every(line=>split(line).reduce((sum,ch)=>sum+ctx.measureText(ch).width,0)<=width*0.83)) break;
      size*=0.9;setFont();
    }
    const stride=size*state.lineSpacing;
    const firstBaseline=height/2-(content.length-1)*stride/2+size*0.32;
    ctx.fillStyle=state.textColor;
    let offset=0;
    content.forEach((line,row)=>{
      const chars=split(line);
      const lineWidth=chars.reduce((sum,ch)=>sum+ctx.measureText(ch).width,0);
      const x=(width-lineWidth)/2;
      const y=firstBaseline+row*stride;
      const lineProgress=clamp(visibleCount-offset,0,chars.length);
      if(lineProgress>0){
        const active=Math.floor(lineProgress),wet=lineProgress-active;
        const eased=wet*wet*(3-2*wet);
        let pen=x;
        chars.forEach((ch,index)=>{
          if(index<active) ctx.fillText(ch,pen,y);
          else if(index===active&&wet>0) writeGlyph(ctx,ch,pen,y,size,eased);
          if(index<active) scatterGlyph(ctx,ch,pen,y,size,1,row,index);
          else if(index===active&&wet>0) scatterGlyph(ctx,ch,pen,y,size,eased,row,index);
          pen+=ctx.measureText(ch).width;
        });
      }
      offset+=chars.length;
    });
    ctx.globalAlpha=1;
  }

  async function loadFont(){await document.fonts.load(`172px ${STGFontLibrary.family("stg:oddball")}`,state.text||"Oddball");paint(canvas,time);}
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>localStorage.setItem(storageKey,JSON.stringify({version:1,state,media:backgroundMedia})),250);}
  async function apply(candidate,media=null,videoData=null){
    for(const key of keys){
      const incoming=candidate?.[key];
      state[key]=typeof defaults[key]==="number" ? (Number.isFinite(Number(incoming))?Number(incoming):defaults[key]) : (typeof incoming==="string"?incoming:defaults[key]);
    }
    state.font="stg:oddball";
    state.text=englishOnly(state.text).trimEnd();
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
    const ratio=width/state.width;
    const current=canvas;
    const originalSize=state.size,originalTracking=state.tracking;
    const originalWidth=state.width,originalHeight=state.height;
    let exportVideo=null;
    const render=async(at)=>{state.width=width;state.height=height;state.size=originalSize*ratio;state.tracking=originalTracking*ratio;if(exportVideo)await seekVideo(exportVideo,at);paint(out,at,exportVideo);};
    let encoder;
    try{
      await loadFont();
      exportVideo=await exportBackgroundVideo();
      if(format==="png"){
        await render(time);
        const blob=await new Promise(resolve=>out.toBlob(resolve,"image/png"));
        if(!blob)throw new Error("PNG 编码失败");
        download(blob,`oddball-ink-${width}x${height}.png`);
      }else{
        const fps=Number($("exportFps").value),count=Math.ceil(duration()*fps);
        if(format==="mp4"){
          encoder=await HME.createH264MP4Encoder();
          encoder.width=width;encoder.height=height;encoder.frameRate=fps;encoder.kbps=Math.max(6000,Math.round(width*height*.025));encoder.groupOfPictures=fps;encoder.outputFilename="oddball-ink.mp4";encoder.initialize();
          const context=out.getContext("2d",{willReadFrequently:true});
          for(let i=0;i<count;i++){await render(i/fps);encoder.addFrameRgba(context.getImageData(0,0,width,height).data);if(i%10===0){$("status").textContent=`MP4 ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}}
          encoder.finalize();download(new Blob([encoder.FS.readFile("oddball-ink.mp4")],{type:"video/mp4"}),"oddball-ink.mp4");
        }else{
          const gif=new GIF({workers:2,quality:8,repeat:-1,width,height,workerScript:"js/continuation-gif.worker.js"});
          for(let i=0;i<count;i++){await render(i/fps);gif.addFrame(out,{copy:true,delay:Math.round(1000/fps)});if(i%8===0){$("status").textContent=`GIF ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}}
          const blob=await new Promise((resolve,reject)=>{gif.on("finished",resolve);gif.on("abort",()=>reject(new Error("GIF 编码中断")));gif.render();});
          download(blob,"oddball-ink.gif");
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
        const filtered=englishOnly(input.value);
        if(filtered!==input.value){input.value=filtered;state.text=filtered;$("saveStatus").textContent="此动效仅支持英文，已移除非英文字符";}
        time=0;playing=true;lastFrame=performance.now();
        loadFont();
      }
      if(["lead","write","hold"].includes(key)){time=Math.min(time,duration());buildTimeline();}
      syncControls();persist();
    });
  });
  for(const button of document.querySelectorAll("[data-paper]"))button.addEventListener("click",()=>{
    state.backgroundColor=button.dataset.paper;
    state.textColor=button.dataset.ink;
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
  $("saveScheme").addEventListener("click",async()=>{try{const scheme={version:1,state,media:backgroundMedia};if(backgroundRuntime)scheme.videoData=await blobDataURL(backgroundRuntime.blob);localStorage.setItem(storageKey,JSON.stringify({version:1,state,media:backgroundMedia}));download(new Blob([JSON.stringify(scheme,null,2)],{type:"application/json"}),"oddball-ink-scheme.json");$("saveStatus").textContent="方案已保存";}catch(error){$("saveStatus").textContent=`保存失败：${error.message}`;}});
  $("importScheme").addEventListener("click",()=>$("schemeFile").click());
  $("schemeFile").addEventListener("change",async()=>{try{const data=JSON.parse(await $("schemeFile").files[0].text());if(data.version!==1||!data.state)throw new Error("方案格式不匹配");await apply(data.state,data.media,data.videoData);$("saveStatus").textContent="方案已导入";}catch(error){$("saveStatus").textContent=`导入失败：${error.message}`;}$("schemeFile").value="";});
  $("resetScheme").addEventListener("click",async()=>{await apply(defaults);$("saveStatus").textContent="已恢复默认";});
  $("clearScheme").addEventListener("click",async()=>{await apply({...defaults,text:""});$("saveStatus").textContent="文字已清空";});
  for(const format of ["png","gif","mp4"])$(format).addEventListener("click",()=>exportFrame(format));
  new ResizeObserver(fitCanvas).observe(canvas.parentElement);
  function animate(now){if(playing&&!busy){time=Math.min(duration(),time+Math.max(0,Math.min((now-lastFrame)/1000,0.1))*Number($("speed").value));if(time>=duration())playing=false;tickControls();paint(canvas,time);}lastFrame=now;requestAnimationFrame(animate);}
  try{const saved=JSON.parse(localStorage.getItem(storageKey));apply(saved?.version===1?saved.state:defaults,saved?.media).catch(error=>{$("backgroundVideoStatus").textContent=error.message;});}catch{apply(defaults);}
  requestAnimationFrame(animate);
})();
