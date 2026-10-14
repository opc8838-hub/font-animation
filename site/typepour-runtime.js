(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { CUP, FPS, hash } = TypePourFluid; let DURATION = 12; const editor = window.TypePourEditor;
  const canvas = $('canvas');
  const typeOnly = document.body.dataset.variant === 'type-only';
  const restingStatus = typeOnly ? '纯粹的文字，像水一样流动' : '文字与方块，一起流动';
  const state = { frames: [], time: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, width: 1080, height: 1920, busy: false, ready: false };
  const style = { text: $('text').value, font: 'stg:georgia', squares: typeOnly ? 0 : Number($('squares').value)/100, size: 15 };
  const audioPlayer = new TypePourAudio.Player();
  let glyphs = [], atlas = new Map(), preset;
  let sourceRun = { glyphs: [], width: 0, font: "" };
  const edgeLayer = document.createElement("canvas"); edgeLayer.width=900;edgeLayer.height=1000;
  let lastNow = performance.now(), redraw = true;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  async function prepareText() {
    style.text = $('text').value; style.font = $('font').value;
    glyphs = Array.from(segmenter.segment(style.text), s => s.segment).filter(s => !/^\s+$/.test(s));
    preset = STGFontLibrary.preset(style.font) || STGFontLibrary.preset('stg:georgia');
    await document.fonts.load(`${preset.style} ${preset.weight} 24px "${preset.family}"`, style.text || '水');
    if (/[^\u0000-\u024f]/.test(style.text)) await document.fonts.load('400 24px "STG Noto Sans SC"', style.text);
    atlas = new Map();
    for (const glyph of new Set(glyphs)) {
      const tile = document.createElement('canvas'); tile.width = tile.height = 88;
      const ctx = tile.getContext('2d');
      ctx.font = `${preset.style} ${preset.weight} ${style.size * 3}px ${STGFontLibrary.family(style.font)}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = style.color || '#202321';
      ctx.fillText(glyph, 44, 45); atlas.set(glyph, tile);
    }
    const measure=document.createElement('canvas').getContext('2d');
    sourceRun={glyphs:[],width:0,font: `${preset.style} ${preset.weight} ${Math.max(19,style.size*1.25)}px ${STGFontLibrary.family(style.font)}`};
    measure.font=sourceRun.font;
    for(const item of segmenter.segment(style.text+' ')){
      const advance=Math.max(.5,measure.measureText(item.segment).width+(style.tracking??.35));
      sourceRun.glyphs.push({text:item.segment,center:sourceRun.width+advance/2});sourceRun.width+=advance;
    }
    sourceRun.color=style.color; if(!style.text.trim())sourceRun.glyphs=[];
    redraw = true;
  }
  function sample(time) {
    const index=Math.min(state.frames.length-1,Math.max(0,time)*FPS), a=Math.floor(index), b=Math.min(a+1,state.frames.length-1);
    return { a:state.frames[a], b:state.frames[b], blend:index-a };
  }
  function drawFluid(ctx,time,edgesOnly=false,layout=null){
    if(!state.frames.length)return;
    const {a,b,blend}=sample(time);
    ctx.save();TypePourGlass.clipLiquid(ctx,layout?.cupX||0,layout?.cupY||0);
    for(let i=0;i<a.length/3;i++){
      const k=i*3,valid=k+2<b.length,x=a[k]+(valid?b[k]-a[k]:0)*blend,y=a[k+1]+(valid?b[k+1]-a[k+1]:0)*blend;
      if(edgesOnly&&(y<470||y>858||(x>342&&x<609)))continue;
      const angle=a[k+2]+(valid?b[k+2]-a[k+2]:0)*blend;
      const pose=TypePourSource.pose(x,y,angle,i);
      if(pose.opacity<.001)continue;
      // Every carrier keeps its black glyph; a blue marker is attached, never substituted.
      const glyph=glyphs[i%glyphs.length];
      const depth=Math.max(0,Math.min(1,(y-62)/388));
      const follow=depth*depth*(3-2*depth);
      ctx.save();ctx.translate(pose.x+(layout?.cupX||0)*follow,pose.y+(layout?.cupY||0)*follow+(editor?.scheme.motion.sourceY||0)*(1-follow));ctx.globalAlpha=pose.opacity;
      if(!editor?.drawParticleAsset(ctx,i,time,style.size) && glyphs.length){
        ctx.save();ctx.rotate(pose.angle);
        const tile=atlas.get(glyph);if(tile)ctx.drawImage(tile,-44/3,-44/3,88/3,88/3);
        ctx.restore();
      }
      const blueStrength=Math.max(0,Math.min(1,(y-240)/150));
      if(hash(i+300)<style.squares&&blueStrength>0){
        // Selection-style squares stay axis-aligned while their letter can tumble.
        const size=style.size*(.54+hash(i+90)*.055);
        const offset=style.size*.30,ox=-Math.cos(pose.angle)*offset,oy=-Math.sin(pose.angle)*offset;
        ctx.globalAlpha=pose.opacity*blueStrength;ctx.fillStyle=style.markerColor||'#5a80e3';
        ctx.fillRect(ox-size/2,oy-size/2,size,size);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function renderFrame(target,time,width=target.width,height=target.height){
    const ctx=target.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);editor.drawBackground(ctx,time,width,height);time=editor.canonicalTime(time);ctx.save();if(editor.scheme.motion.direction==='left'){ctx.translate(width,0);ctx.scale(-1,1);}
    // Tall portrait places the glass lower and just right of center; source stays put.
    const portrait=Math.abs(width/height-9/16)<.015;
    const layout=portrait?{cupX:-90,cupY:240}:{cupX:0,cupY:0};layout.cupX+=editor.scheme.motion.cupX;layout.cupY+=editor.scheme.motion.cupY;
    const scale=Math.min(width/900,height/1000);
    ctx.translate((width-900*scale)/2,(height-1000*scale)/2);ctx.scale(scale,scale);
    ctx.translate(110,0);
    ctx.save();ctx.translate(layout.cupX,layout.cupY);
    if(state.glassReady)TypePourGlass.back(ctx);ctx.restore();
    ctx.save();ctx.translate(0,editor.scheme.motion.sourceY);TypePourSource.draw(ctx,time,sourceRun);ctx.restore();
    drawFluid(ctx,time,false,layout);
    const edges=edgeLayer.getContext('2d');edges.clearRect(0,0,900,1000);drawFluid(edges,time,true);
    ctx.save();ctx.translate(layout.cupX,layout.cupY);
    if(state.glassReady)TypePourGlass.front(ctx,edgeLayer);ctx.restore();
    ctx.restore();ctx.setTransform(1,0,0,1,0,0);
  }
  function updateClock(){
    $('seek').value=state.time;$('clock').value=`${state.time.toFixed(2)} / ${DURATION.toFixed(2)}`;
    $('play').textContent=state.playing?editor.words('暂停','Pause'):editor.words('播放','Play');editor.updateTimeline(state.time);
  }
  function resize(){
    const rect=canvas.parentElement.getBoundingClientRect(),fit=Math.min(rect.width/state.width,rect.height/state.height);
    canvas.style.width=`${state.width*fit}px`;canvas.style.height=`${state.height*fit}px`;canvas.style.aspectRatio=`${state.width}/${state.height}`;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(state.width*fit*dpr);canvas.height=Math.round(state.height*fit*dpr);redraw=true;
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  function seek(time){if(state.busy)return;state.time=Math.max(0,Math.min(DURATION,Number(time)||0));redraw=true;updateClock();renderFrame(canvas,state.time);}
  $('seek').addEventListener('input',()=>{state.playing=false;seek($('seek').value);});
  $('play').addEventListener('click',()=>{state.playing=!state.playing;if(state.time>=DURATION&&state.playing)state.time=0;lastNow=performance.now();updateClock();});
  $('replay').addEventListener('click',()=>{seek(0);state.playing=true;lastNow=performance.now();updateClock();});
  $('speed').addEventListener('change',()=>{state.speed=Number($('speed').value);});
  $('text').addEventListener('input',prepareText);$('font').addEventListener('change',prepareText);
  $('size').addEventListener('input',()=>{style.size=Number($('size').value);prepareText();});
  $('squares').addEventListener('input',()=>{style.squares=Number($('squares').value)/100;redraw=true;});
  $('sound').addEventListener('click',async()=>{
    try{
      if(audioPlayer.enabled){audioPlayer.enabled=false;audioPlayer.stop();}
      else{await audioPlayer.enable();seek(0);state.playing=true;lastNow=performance.now();updateClock();}
      $('sound').textContent=audioPlayer.enabled?editor.words('关闭声音','Mute'):editor.words('试听倒水声','Water sound');$('sound').setAttribute('aria-pressed',String(audioPlayer.enabled));
    }catch(error){$('status').textContent='声音暂时无法播放：'+error.message;}
  });
  $('volume').addEventListener('input',()=>{audioPlayer.setVolume(Number($('volume').value)/100);});
  $('wav').addEventListener('click',()=>download(TypePourAudio.wav(Number($('duration').value),audioPlayer.volume,editor.canonicalTime),'typepour-water.wav'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audioPlayer.stop();});
  window.addEventListener('pagehide',()=>audioPlayer.stop());
  $('ratio').addEventListener('change',()=>{editor.changeSize();});
  function busy(value,message){state.busy=value;document.querySelectorAll('.tc-properties input,.tc-properties select,.tc-properties textarea,.tc-content button,.tc-tabs button,#assetDrawer button,#ratio,#canvasWidth,#canvasHeight,#undo,#redo,#blueVariant,#pureVariant,#seek,#play,#replay').forEach(el=>el.disabled=value);$('status').textContent=message;for(const id of ['png','gif','mp4'])$(id).disabled=value||!state.ready;for(const el of document.querySelectorAll('.settings input,.settings select,.sound-controls input,.sound-controls button,#duration,#exportScale'))el.disabled=value;}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  async function encode(format,options={}){
    if(!state.ready||state.busy)throw new Error('水流尚未准备好');
    const exportScale=Number($('exportScale').value);
    const width=options.width||Math.round(state.width*exportScale/2)*2,height=options.height||Math.round(state.height*exportScale/2)*2,seconds=options.seconds||Number($('duration').value),fps=options.fps||Number($('exportFps').value);
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const wasPlaying=state.playing;state.playing=false;audioPlayer.stop();updateClock();busy(true,`正在生成 ${format.toUpperCase()}…`);
    let encoder;
    try{
      await prepareText();
      if(format==='png'){
        await editor.prepareFrame(options.time??state.time);renderFrame(out,options.time??state.time);return await new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG 编码失败')),'image/png'));
      }
      if(format==='mp4'&&(options.sound??$('exportSound').checked)){
        return await TypePourAudio.encodeVideo(out,async(target,t)=>{await editor.prepareFrame(t);renderFrame(target,t);},{timeMap:editor.canonicalTime,width,height,seconds,fps,volume:audioPlayer.volume,onProgress:p=>{$('status').textContent='正在生成带声 MP4 · '+Math.round(p*100)+'%';}});
      }
      const count=Math.ceil(seconds*fps),context=out.getContext('2d',{willReadFrequently:true});
      if(format==='mp4'){
        encoder=await HME.createH264MP4Encoder();encoder.width=width;encoder.height=height;encoder.frameRate=fps;encoder.kbps=Math.max(10000,Math.round(width*height*.03));encoder.groupOfPictures=fps;encoder.outputFilename='typepour.mp4';encoder.initialize();
        for(let i=0;i<count;i++){
          await editor.prepareFrame(i/fps);renderFrame(out,i/fps);encoder.addFrameRgba(context.getImageData(0,0,width,height).data);
          if(i%10===0){$('status').textContent=`正在生成 MP4 · ${Math.round(i/count*100)}%`;await new Promise(resolve=>setTimeout(resolve,0));}
        }
        encoder.finalize();return new Blob([encoder.FS.readFile('typepour.mp4')],{type:'video/mp4'});
      }
      const gif=new GIF({workers:2,quality:8,width,height,workerScript:'js/continuation-gif.worker.js'});
      for(let i=0;i<count;i++){
        await editor.prepareFrame(i/fps);renderFrame(out,i/fps);gif.addFrame(out,{copy:true,delay:(Math.round((i+1)*100/fps)-Math.round(i*100/fps))*10});
        if(i%10===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      return await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>{gif.abort();reject(new Error('GIF 编码超时，请缩小画面尺寸'));},180000);
        gif.on('finished',blob=>{clearTimeout(timeout);resolve(blob);});gif.on('abort',()=>{clearTimeout(timeout);reject(new Error('GIF 已取消'));});
        gif.on('progress',progress=>{$('status').textContent=`正在生成 GIF · ${Math.round(progress*100)}%`;});gif.render();
      });
    }finally{encoder?.delete();state.playing=wasPlaying;lastNow=performance.now();busy(false,restingStatus);updateClock();}
  }
  for(const format of ['png','gif','mp4'])$(format).addEventListener('click',async()=>{
    try{const scale=Number($('exportScale').value),width=Math.round(state.width*scale/2)*2,height=Math.round(state.height*scale/2)*2;const blob=await encode(format,{width,height});download(blob,`${typeOnly ? 'typepour-pure' : 'typepour'}-${width}x${height}.${format}`);$('status').textContent=`${format.toUpperCase()} 已生成 · ${width} × ${height}`;}catch(error){$('status').textContent=`导出失败：${error.message}`;}
  });
  function loop(now){
    if(state.ready&&state.playing&&!state.busy){state.time+=Math.max(0,Math.min(.08,(now-lastNow)/1000))*state.speed;if(state.time>DURATION)state.time=0;redraw=true;}
    audioPlayer.sync(editor.canonicalTime(state.time),state.ready&&state.playing&&!state.busy,state.speed*editor.timeRate(state.time));
    lastNow=now;if(editor.hasAnimatedMedia())redraw=true;if(redraw){editor.preparePreview(state.time);renderFrame(canvas,state.time);updateClock();redraw=false;}requestAnimationFrame(loop);
  }
  const worker=new Worker('typepour-worker.js?v=1');
  worker.onmessage=async event=>{
    if(event.data.progress){$('progress').textContent=`${Math.round(event.data.progress*100)}%`;return;}
    state.frames=event.data.frames;await TypePourGlass.ready;state.glassReady=true;await prepareText();state.ready=true;await editor.ready();$('loading').hidden=true;
    for(const id of ['play','replay','seek','png','gif','mp4'])$(id).disabled=false;
    lastNow=performance.now();redraw=true;worker.terminate();
  };
  worker.onerror=()=>{$('loading').textContent='水流加载失败，请刷新重试。';};
  worker.postMessage({});requestAnimationFrame(loop);
  // One public render path for browser inspection, paused frame checks and all real exports.
  window.TypePour={state,style,audioPlayer,seek,renderFrame,encode,prepareText,sample,getSourceRun:()=>sourceRun,resize,invalidate:()=>{redraw=true;},setDuration:value=>{DURATION=value;$("seek").max=value;state.time=Math.min(value,state.time);updateClock();}};
})();
