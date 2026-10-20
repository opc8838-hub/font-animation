(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const defaults = Object.freeze({text:"Oddball\nInk in Motion",font:"stg:oddball",size:172,tracking:0,lineSpacing:1.22,textColor:"#29262c",backgroundColor:"#eeeae1",lead:0.4,write:3.2,hold:1.5,fade:0.8,speckles:32,width:1080,height:1080});
  const keys = Object.keys(defaults);
  const storageKey = "cellmotion-oddball-ink-v1";
  const state = {...defaults};
  const canvas = $("canvas");
  let time = 0, playing = true, busy = false, lastFrame = performance.now(), saveTimer;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const englishOnly = (value) => String(value).replace(/\r\n?/g,"\n").replace(/[^\x20-\x7e\n]/g,"");
  const noise = (seed) => {const value=Math.sin(seed*12.9898)*43758.5453;return value-Math.floor(value);};
  const duration = () => state.lead + state.write + state.hold + state.fade;
  const split = (value) => [...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(value)].map(item=>item.segment);
  const lines = () => state.text.split(/\r?\n/).slice(0,20);

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
      {key:"hold",zh:"墨迹停留",en:"Hold",start:state.lead+state.write,length:state.hold},
      {key:"fade",zh:"逐字擦除",en:"Erase",start:state.lead+state.write+state.hold,length:state.fade}
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

  function paint(target,at) {
    const ctx=target.getContext("2d");
    const width=target.width,height=target.height;
    ctx.fillStyle=state.backgroundColor;
    ctx.fillRect(0,0,width,height);
    const content=lines();
    const glyphCount=Math.max(1,content.reduce((sum,line)=>sum+split(line).length,0));
    const written=clamp((at-state.lead)/state.write,0,1);
    const erased=clamp((at-state.lead-state.write-state.hold)/state.fade,0,1);
    const visibleCount=glyphCount*written*(1-erased);
    if(visibleCount<=0) return;
    const preset=STGFontLibrary.preset("stg:oddball");
    const family=STGFontLibrary.family("stg:oddball");
    let size=Math.min(state.size,width*0.29,height/(Math.max(content.length,1)*state.lineSpacing+0.7));
    ctx.textBaseline="alphabetic";
    ctx.textAlign="left";
    const setFont=()=>{ctx.font=`${preset.style} ${preset.weight} ${size}px ${family}`;ctx.letterSpacing=`${state.tracking*size/172}px`;};
    setFont();
    for(let attempt=0;attempt<12;attempt++){
      if(content.every(line=>ctx.measureText(line).width<=width*0.83)) break;
      size*=0.9;setFont();
    }
    const stride=size*state.lineSpacing;
    const firstBaseline=height/2-(content.length-1)*stride/2+size*0.32;
    ctx.fillStyle=state.textColor;
    let offset=0;
    content.forEach((line,row)=>{
      const chars=split(line);
      const x=(width-ctx.measureText(line).width)/2;
      const y=firstBaseline+row*stride;
      const lineProgress=clamp(visibleCount-offset,0,chars.length);
      if(lineProgress>0){
        const active=Math.floor(lineProgress),wet=lineProgress-active;
        if(wet>0&&active<chars.length){
          const before=ctx.measureText(chars.slice(0,active).join("")).width;
          const advance=Math.max(ctx.measureText(chars.slice(0,active+1).join("")).width-before,size*0.18);
          ctx.save();
          ctx.globalAlpha=0.18*Math.sin(Math.PI*wet);
          ctx.filter=`blur(${Math.max(4,size*0.07)}px)`;
          for(let spot=0;spot<6;spot++){
            const seed=(row+1)*101+(active+1)*211+(spot+1)*307;
            ctx.beginPath();
            ctx.ellipse(x+before+advance*noise(seed),y-size*(0.15+noise(seed+37)*0.78),advance*0.2,size*0.13,noise(seed+73)*Math.PI,0,Math.PI*2);
            ctx.fill();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.beginPath();
        let prefix="",left=0;
        chars.forEach((character,index)=>{
          const next=prefix+character;
          const right=ctx.measureText(next).width;
          const progress=clamp(lineProgress-index,0,1);
          if(progress>=1){
            ctx.rect(x+left-size*0.04,y-size*1.18,right-left+size*0.08,size*1.55);
          }else if(progress>0){
            const advance=Math.max(right-left,size*0.18);
            for(let spot=0;spot<15;spot++){
              if(progress<(spot+0.15)/15)continue;
              const seed=(row+1)*101+(index+1)*211+(spot+1)*307;
              const cx=x+left+advance*(0.1+noise(seed)*0.8);
              const cy=y-size*(0.12+noise(seed+37)*0.82);
              ctx.ellipse(cx,cy,advance*(0.08+progress*0.24),size*(0.03+progress*0.14),noise(seed+73)*Math.PI,0,Math.PI*2);
            }
          }
          prefix=next;left=right;
        });
        ctx.clip();
        ctx.globalAlpha=0.2;
        ctx.filter=`blur(${Math.max(2,size*0.025)}px)`;
        ctx.fillText(line,x,y);
        ctx.globalAlpha=1;
        ctx.filter="none";
        ctx.fillText(line,x,y);
        ctx.restore();
      }
      if(state.speckles>0){
        const amount=Math.round(chars.length*state.speckles/38);
        for(let i=0;i<amount;i++){
          const seed=(row+1)*1039+i*827;
          const location=((seed*16807)%2147483647)/2147483647;
          if(location>lineProgress/Math.max(1,chars.length)) continue;
          const vertical=(((seed*48271)%2147483647)/2147483647-0.5)*size*1.5;
          const radius=(seed%4+1)*size/360;
          ctx.globalAlpha=0.28+(seed%7)/20;
          ctx.beginPath();ctx.arc(x+location*ctx.measureText(line).width,y+vertical,radius,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
      }
      offset+=chars.length;
    });
    ctx.globalAlpha=1;
  }

  async function loadFont(){await document.fonts.load(`172px ${STGFontLibrary.family("stg:oddball")}`,state.text||"Oddball");paint(canvas,time);}
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>localStorage.setItem(storageKey,JSON.stringify({version:1,state})),250);}
  function apply(candidate){
    for(const key of keys){
      const incoming=candidate?.[key];
      state[key]=typeof defaults[key]==="number" ? (Number.isFinite(Number(incoming))?Number(incoming):defaults[key]) : (typeof incoming==="string"?incoming:defaults[key]);
    }
    state.font="stg:oddball";
    state.text=englishOnly(state.text).trimEnd();
    state.width=clamp(Math.round(state.width),320,4096);
    state.height=clamp(Math.round(state.height),320,4096);
    time=0;playing=true;syncControls();loadFont();persist();
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
    const render=(at)=>{state.width=width;state.height=height;state.size=originalSize*ratio;state.tracking=originalTracking*ratio;paint(out,at);};
    let encoder;
    try{
      await loadFont();
      if(format==="png"){
        render(time);
        const blob=await new Promise(resolve=>out.toBlob(resolve,"image/png"));
        if(!blob)throw new Error("PNG 编码失败");
        download(blob,`oddball-ink-${width}x${height}.png`);
      }else{
        const fps=Number($("exportFps").value),count=Math.ceil(duration()*fps);
        if(format==="mp4"){
          encoder=await HME.createH264MP4Encoder();
          encoder.width=width;encoder.height=height;encoder.frameRate=fps;encoder.kbps=Math.max(6000,Math.round(width*height*.025));encoder.groupOfPictures=fps;encoder.outputFilename="oddball-ink.mp4";encoder.initialize();
          const context=out.getContext("2d",{willReadFrequently:true});
          for(let i=0;i<count;i++){render(i/fps);encoder.addFrameRgba(context.getImageData(0,0,width,height).data);if(i%10===0){$("status").textContent=`MP4 ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}}
          encoder.finalize();download(new Blob([encoder.FS.readFile("oddball-ink.mp4")],{type:"video/mp4"}),"oddball-ink.mp4");
        }else{
          const gif=new GIF({workers:2,quality:8,width,height,workerScript:"js/continuation-gif.worker.js"});
          for(let i=0;i<count;i++){render(i/fps);gif.addFrame(out,{copy:true,delay:Math.round(1000/fps)});if(i%8===0){$("status").textContent=`GIF ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}}
          const blob=await new Promise((resolve,reject)=>{gif.on("finished",resolve);gif.on("abort",()=>reject(new Error("GIF 编码中断")));gif.render();});
          download(blob,"oddball-ink.gif");
        }
      }
      $("status").textContent=`${format.toUpperCase()} 已生成 · ${width} × ${height}`;
    }catch(error){$("status").textContent=`导出失败：${error.message}`;}
    finally{encoder?.delete();state.width=originalWidth;state.height=originalHeight;state.size=originalSize;state.tracking=originalTracking;paint(current,time);busy=false;for(const id of ["png","gif","mp4"])$(id).disabled=false;}
  }

  keys.forEach(key=>{
    const input=$(key);if(!input)return;
    input.addEventListener(input.tagName==="SELECT"?"change":"input",()=>{
      state[key]=typeof defaults[key]==="number"?Number(input.value):input.value;
      if(key==="text"){
        const filtered=englishOnly(input.value);
        if(filtered!==input.value){input.value=filtered;state.text=filtered;$("saveStatus").textContent="此动效仅支持英文，已移除非英文字符";}
        loadFont();
      }
      if(["lead","write","hold","fade"].includes(key)){time=Math.min(time,duration());buildTimeline();}
      syncControls();persist();
    });
  });
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
  $("saveScheme").addEventListener("click",()=>{localStorage.setItem(storageKey,JSON.stringify({version:1,state}));download(new Blob([JSON.stringify({version:1,state},null,2)],{type:"application/json"}),"oddball-ink-scheme.json");$("saveStatus").textContent="方案已保存";});
  $("importScheme").addEventListener("click",()=>$("schemeFile").click());
  $("schemeFile").addEventListener("change",async()=>{try{const data=JSON.parse(await $("schemeFile").files[0].text());if(data.version!==1||!data.state)throw new Error("方案格式不匹配");apply(data.state);$("saveStatus").textContent="方案已导入";}catch(error){$("saveStatus").textContent=`导入失败：${error.message}`;}$("schemeFile").value="";});
  $("resetScheme").addEventListener("click",()=>{apply(defaults);$("saveStatus").textContent="已恢复默认";});
  $("clearScheme").addEventListener("click",()=>{apply({...defaults,text:""});$("saveStatus").textContent="文字已清空";});
  for(const format of ["png","gif","mp4"])$(format).addEventListener("click",()=>exportFrame(format));
  new ResizeObserver(fitCanvas).observe(canvas.parentElement);
  function animate(now){if(playing&&!busy){time+=Math.min((now-lastFrame)/1000,0.1)*Number($("speed").value);if(time>=duration())time%=duration();tickControls();paint(canvas,time);}lastFrame=now;requestAnimationFrame(animate);}
  try{const saved=JSON.parse(localStorage.getItem(storageKey));apply(saved?.version===1?saved.state:defaults);}catch{apply(defaults);}
  requestAnimationFrame(animate);
})();
