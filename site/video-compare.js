/* Static comparison composition. Preview and exports share renderFrame and sourceTime. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SLUG = 'video-compare', KEY = 'cellmotion-video-compare-v1';
  const clone = value => structuredClone(value);
  const clamp = (v,a,b) => Math.min(b,Math.max(a,Number(v)||0));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const en = () => document.body.dataset.editorLanguage === 'en';
  const tr = (zh,english) => en() ? english : zh;
  const copy = (zh,english) => '<span data-vc-zh="'+esc(zh)+'" data-vc-en="'+esc(english)+'" data-no-translate>'+esc(tr(zh,english))+'</span>';
  const defaults = {
    effect: SLUG, version: 1, canvas: {preset:'1920x1080',width:1920,height:1080},
    layout: {fontFamily:'stg:manrope',compositionTheme:'light',textColor:'#171717',backgroundColor:'#faf9f7',labelSize:100,marginSize:5,frameGap:4,frameRadius:28,logoSize:22,videoAspect:'auto',beforeScale:65,topText:'have a good day'},
    export: {duration:'cycle',customDuration:6,fps:30,shortClip:'hold'},
    rows: [
      {id:'before',text:'Before',caption:'网上看到的',audioEnabled:false,media:null},
      {id:'after',text:'After',caption:'我做的',audioEnabled:true,media:null}
    ]
  };
  let scheme = clone(defaults), elapsed = 0, playing = false, busy = false, cancelled = false;
  let last = performance.now(), revision = 0, persistTimer, historyTimer, dbRef;
  const runtime = new Map(), uploadTokens = new Map();
  const undoStack = [], redoStack = [];
  const canvas = $('glyphMorphCanvas'), frame = $('compositionFrame');
  const previewMode = new URLSearchParams(location.search).has('preview');
  const logos = {};
  for (const color of ['black','white']) {
    const img = new Image(); img.src = 'assets/video-compare/logo-'+color+'.png';
    img.onload = () => renderFrame(canvas); logos[color] = img;
  }
  const dbPromise = new Promise((resolve,reject) => {
    const request = indexedDB.open(KEY,1);
    request.onupgradeneeded = () => request.result.createObjectStore('schemes');
    request.onsuccess = () => { dbRef=request.result; resolve(request.result); };
    request.onerror = () => reject(new Error('Browser storage unavailable'));
  });
  dbPromise.catch(() => {});
  async function stored(mode,value) {
    const db = await dbPromise;
    return new Promise((resolve,reject) => {
      const tx = db.transaction('schemes',mode), store = tx.objectStore('schemes');
      const req = mode === 'readonly' ? store.get('working') : store.put(value,'working');
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  function status(id,zh,english) { $(id).textContent = tr(zh,english); }
  function persist() {
    if (previewMode) return;
    clearTimeout(persistTimer);
    status('schemeStatus','正在保存…','Saving…');
    persistTimer = setTimeout(async () => {
      try { await stored('readwrite',clone(scheme)); status('schemeStatus','已自动保存在本机，包含视频。','Autosaved on this device, including videos.'); }
      catch { status('schemeStatus','本机保存失败，请使用保存方案下载。','Device save failed. Download your scheme to keep it.'); }
    },400);
  }
  window.addEventListener('pagehide',()=>{if(dbRef&&!previewMode){clearTimeout(persistTimer);try{dbRef.transaction('schemes','readwrite').objectStore('schemes').put(clone(scheme),'working');}catch{}}});
  function checkpoint() { undoStack.push(clone(scheme)); if(undoStack.length>30)undoStack.shift(); redoStack.length=0; }
  function edited() { revision++; persist(); syncLayoutInfo(); renderTimeline(); renderFrame(canvas); }
  function clipDuration(row) {
    const rt = runtime.get(row.id);
    if(!row.media || !rt?.ready) return 0;
    return Math.max(.01,Math.min(rt.duration,row.media.trimEnd||rt.duration)-row.media.trimStart);
  }
  function duration() {
    if(scheme.export.duration==='cycle') return Math.max(.1,...scheme.rows.map(clipDuration))===.1 ? 6 : Math.max(...scheme.rows.map(clipDuration));
    return scheme.export.duration==='custom' ? scheme.export.customDuration : Number(scheme.export.duration);
  }
  function sourceTime(row,seconds) {
    const rt=runtime.get(row.id), m=row.media;
    if(!rt?.ready || !m) return 0;
    const start=clamp(m.trimStart,0,Math.max(0,rt.duration-.01));
    const end=clamp(m.trimEnd||rt.duration,start+.01,rt.duration);
    const length=end-start;
    const local=scheme.export.shortClip==='loop' ? Math.max(0,seconds)%length : Math.min(Math.max(0,seconds),Math.max(0,length-1/120));
    return Math.min(rt.duration-.001,start+local);
  }
  let audioModule;
  function loadAudio(){return audioModule ||= import('./video-compare-audio.js?v=20261013-4');}
  function syncPreviewAudio(start=false){
    const enabled=scheme.rows.filter(r=>r.audioEnabled&&runtime.get(r.id)?.ready&&runtime.get(r.id).hasAudio!==false);
    for(const row of scheme.rows){const rt=runtime.get(row.id);if(!rt?.ready)continue;
      rt.video.muted=!row.audioEnabled;rt.video.volume=enabled.length>1?1/enabled.length:1;
      if(start&&playing&&!(scheme.export.shortClip==='hold'&&elapsed/1000>=clipDuration(row)))void rt.video.play().catch(()=>{});
      if(!playing||busy)rt.video.pause();
    }
  }
  function makeVideo(url) {
    const video=document.createElement('video');
    video.muted=true; video.playsInline=true; video.preload='auto'; video.src=url;
    return video;
  }
  function readyVideo(video) {
    return new Promise((resolve,reject) => {
      if(video.readyState>=2 && Number.isFinite(video.duration)) return resolve();
      const timer=setTimeout(()=>finish(new Error('Video decode timed out')),15000);
      const ok=()=>finish(), error=()=>finish(new Error('Unsupported or damaged video'));
      function finish(err) { clearTimeout(timer);video.removeEventListener('loadeddata',ok);video.removeEventListener('error',error);err?reject(err):resolve(); }
      video.addEventListener('loadeddata',ok);video.addEventListener('error',error);
    });
  }
  // Wait for decoded source frames. No real-time capture or guessed fixed seek delay.
  function seekVideo(video,time) {
    time=clamp(time,0,Math.max(0,video.duration-.001));
    if(!video.seeking && video.readyState>=2 && Math.abs(video.currentTime-time)<.0005) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(new Error('Video seek timed out')),10000);
      const ok=()=>finish(), error=()=>finish(new Error('Video decode failed'));
      function finish(err) { clearTimeout(timer);video.removeEventListener('seeked',ok);video.removeEventListener('error',error);err?reject(err):resolve(); }
      video.addEventListener('seeked',ok);video.addEventListener('error',error);video.currentTime=time;
    });
  }
  function dispose(rt) { for(const v of [rt?.video,rt?.exportVideo,rt?.filmVideo])if(v){v.pause();v.removeAttribute('src');v.load();} }
  async function loadMedia(row) {
    const old=runtime.get(row.id); dispose(old);runtime.delete(row.id);
    if(!row.media)return;
    const m=row.media, rt={media:m,video:makeVideo(m.url),exportVideo:makeVideo(m.url),filmVideo:makeVideo(m.url),ready:false};
    runtime.set(row.id,rt);
    try {
      await Promise.all([readyVideo(rt.video),readyVideo(rt.exportVideo),readyVideo(rt.filmVideo)]);
      if(runtime.get(row.id)!==rt)return;
      rt.duration=rt.video.duration;rt.ready=true;
      rt.audioInfo=loadAudio().then(module=>module.inspectAudio(m.url)).then(has=>{if(runtime.get(row.id)===rt){rt.hasAudio=has;syncMediaUi(row);syncPreviewAudio();}}).catch(()=>{});
      syncPreviewAudio();
      m.trimStart=clamp(m.trimStart,0,Math.max(0,rt.duration-.01));
      m.trimEnd=clamp(m.trimEnd||rt.duration,m.trimStart+.01,rt.duration);
      await Promise.all([seekVideo(rt.video,m.trimStart),seekVideo(rt.exportVideo,m.trimStart)]);
      syncMediaUi(row);syncLayoutInfo();renderTimeline(); await buildFilmstrip(row,rt);renderFrame(canvas);
    } catch(error) {
      if(runtime.get(row.id)!==rt)return;
      dispose(rt);runtime.delete(row.id);
      const name=document.querySelector('[data-row-id="'+row.id+'"] .vc-file-name');
      if(name){name.textContent=tr('无法读取视频，请换成浏览器可播放的 MP4 或 WebM。','Cannot decode video. Use a browser-compatible MP4 or WebM.');name.classList.add('is-error');}
      throw error;
    }
  }
  async function buildFilmstrip(row,rt) {
    const film=document.createElement('canvas');film.width=640;film.height=80;const c=film.getContext('2d');
    for(let i=0;i<8;i++) {
      if(runtime.get(row.id)!==rt)return;
      await seekVideo(rt.filmVideo,Math.max(0,rt.duration-.01)*i/8);
      const sw=rt.filmVideo.videoWidth,sh=rt.filmVideo.videoHeight,s=Math.max(80/sw,80/sh);
      c.save();c.beginPath();c.rect(i*80,0,80,80);c.clip();c.drawImage(rt.filmVideo,i*80+(80-sw*s)/2,(80-sh*s)/2,sw*s,sh*s);c.restore();
    }
    rt.film=film;syncMediaUi(row);
  }
  function rowHtml(row) {
    return '<div class="gm-row-shell vc-row" data-row-id="'+row.id+'" data-row-summary="'+esc(tr('独立视频 · 同步播放','Video · Synchronized'))+'">'+
      '<label class="gm-field vc-text-field">'+copy('主标签','Label')+'<input data-key="text" value="'+esc(row.text)+'" maxlength="100" aria-label="'+esc(tr('主标签','Label'))+'"></label>'+
      '<label class="gm-field">'+copy('说明文字 · 可编辑','Caption · Editable')+'<input data-key="caption" value="'+esc(row.caption)+'" maxlength="160" aria-label="'+esc(row.id+' '+tr('说明文字','caption'))+'"></label>'+
      '<label class="vc-upload"><b aria-hidden="true">＋</b>'+copy('上传 / 替换视频','Upload / replace video')+'<small data-no-translate>MP4 / WebM / MOV</small><input type="file" data-video-file accept="video/mp4,video/webm,video/quicktime,video/*" aria-label="'+esc(row.text)+' video"></label>'+
      '<p class="vc-file-name" data-no-translate></p>'+
      '<label class="vc-audio-toggle"><span>'+copy('原视频声音','Source audio')+'<small class="vc-audio-status" data-no-translate></small></span><input type="checkbox" role="switch" data-key="audioEnabled" aria-label="'+row.id+' '+esc(tr('声音','audio'))+'" '+(row.audioEnabled?'checked':'')+'></label>'+
      '<div class="vc-media-tools" hidden>'+
      '<div class="gm-grid-2"><label class="gm-field">'+copy('视频适配','Video fit')+'<select data-key="fit"><option value="contain">'+tr('完整显示','Fit inside')+'</option><option value="cover">'+tr('铺满裁切','Fill and crop')+'</option></select></label><label class="gm-field">'+copy('放大','Zoom')+'<input data-key="zoom" type="number" min="1" max="4" step="0.05" value="1"></label><label class="gm-field">'+copy('水平取景','Horizontal position')+'<input data-key="panX" type="range" min="0" max="1" step="0.01" value="0.5"></label><label class="gm-field">'+copy('垂直取景','Vertical position')+'<input data-key="panY" type="range" min="0" max="1" step="0.01" value="0.5"></label></div>'+
      '<div class="vc-trim"><p class="vc-section-label">'+copy('视频片段','Video trim')+'</p><div class="vc-video-timeline"><canvas width="640" height="80" aria-label="'+esc(tr('视频缩略时间轴','Video filmstrip'))+'"></canvas><div class="vc-trim-selection"><button type="button" class="vc-trim-handle" data-edge="start" role="slider" aria-label="'+esc(tr('片段开始','Trim start'))+'" aria-valuemin="0" tabindex="0"></button><button type="button" class="vc-trim-handle" data-edge="end" role="slider" aria-label="'+esc(tr('片段结束','Trim end'))+'" aria-valuemin="0" tabindex="0"></button></div></div><div class="gm-grid-2"><label class="gm-field">'+copy('开始 / 秒','Start / seconds')+'<input data-key="trimStart" type="number" min="0" step="0.05"></label><label class="gm-field">'+copy('结束 / 秒','End / seconds')+'<input data-key="trimEnd" type="number" min="0.01" step="0.05"></label></div></div>'+
      '<div class="vc-inline-actions"><button type="button" class="vc-secondary" data-action="reset-crop">'+copy('重置取景','Reset framing')+'</button><button type="button" class="vc-secondary" data-action="remove-video">'+copy('移除视频','Remove video')+'</button></div></div>'+
      '<div class="gm-row-meta"><button class="gm-row-pause" data-action="pause-row" type="button">'+copy('暂停查看','Pause to edit')+'</button></div></div>';
  }
  function renderRows() {
    $('sequenceRows').innerHTML=scheme.rows.map(rowHtml).join('');
    scheme.rows.forEach(syncMediaUi);
  }
  function syncMediaUi(row) {
    const shell=document.querySelector('[data-row-id="'+row.id+'"].vc-row');if(!shell)return;
    const m=row.media,rt=runtime.get(row.id);
    shell.querySelector('[data-key="audioEnabled"]').checked=row.audioEnabled;
    shell.querySelector('.vc-audio-status').textContent=rt?.hasAudio===false?tr('素材无音轨','Source has no audio track'):row.audioEnabled?tr('已开启 · 预览与 MP4','On · Preview & MP4'):tr('已关闭 · 预览与 MP4','Off · Preview & MP4');
    shell.querySelector('.vc-media-tools').hidden=!m;
    const name=shell.querySelector('.vc-file-name');name.classList.remove('is-error');
    name.textContent=m ? m.name+(rt?.ready?' · '+tr('素材 ','Source ')+rt.video.videoWidth+' × '+rt.video.videoHeight+' · '+ratioLabel(rt.video.videoWidth/rt.video.videoHeight)+' '+tr(rt.video.videoWidth>=rt.video.videoHeight?'横屏':'竖屏',rt.video.videoWidth>=rt.video.videoHeight?'landscape':'portrait')+' · '+rt.duration.toFixed(2)+'s':' · '+tr('读取中…','Loading…')) : tr('未上传视频 · 素材尺寸将自动识别','No video selected · Source dimensions detected on upload');
    if(!m)return;
    for(const key of ['fit','zoom','panX','panY','trimStart','trimEnd']){const field=shell.querySelector('[data-key="'+key+'"]');if(field!==document.activeElement)field.value=m[key];}
    if(rt?.ready) {
      const selection=shell.querySelector('.vc-trim-selection');selection.style.left=m.trimStart/rt.duration*100+'%';selection.style.right=(1-m.trimEnd/rt.duration)*100+'%';
      for(const handle of selection.children){handle.setAttribute('aria-valuemax',rt.duration);handle.setAttribute('aria-valuenow',handle.dataset.edge==='start'?m.trimStart:m.trimEnd);}
      for(const key of ['trimStart','trimEnd'])shell.querySelector('[data-key="'+key+'"]').max=rt.duration;
      const film=shell.querySelector('.vc-video-timeline canvas');if(rt.film)film.getContext('2d').drawImage(rt.film,0,0,film.width,film.height);
    }
  }
  function videoAspect() {
    const mode=scheme.layout.videoAspect;
    if(mode==='16:9'||mode==='9:16')return {ratio:mode==='16:9'?16/9:9/16,owner:null};
    const owner=['after','before'].find(id=>runtime.get(id)?.ready);
    const video=runtime.get(owner)?.video;
    return {ratio:video?video.videoWidth/video.videoHeight:16/9,owner};
  }
  function ratioLabel(ratio) {
    for(const [label,value]of [['16:9',16/9],['9:16',9/16],['1:1',1],['4:3',4/3]])if(Math.abs(ratio-value)<.015)return label;
    return ratio.toFixed(2)+':1';
  }
  function syncLayoutInfo() {
    const info=videoAspect(),status=$('videoAspectStatus');if(!status)return;
    status.textContent=tr('当前视频框：','Video frames: ')+ratioLabel(info.ratio)+(info.owner?tr(' · 自动跟随 ',' · Matched to ')+(info.owner==='after'?'After':'Before'):scheme.layout.videoAspect==='auto'?tr(' · 上传后自动识别',' · Detected after upload'):tr(' · 手动选择',' · Manual selection'));
  }
  // One proportionate layout for the live canvas and every export size.
  function geometry(w,h) {
    const l=scheme.layout,ratio=videoAspect().ratio,scale=l.beforeScale/100;
    const margin=w*l.marginSize/100,gap=w*l.frameGap/100,usableW=w-2*margin;
    const headerFactor=.085*l.labelSize/100*1.5;
    const stacked=w/h<1.25&&ratio>=1;
    const top=h*(stacked?.075:.13),bottom=h*(stacked?.81:.79),bodyH=bottom-top;
    let afterW,boxes;
    if(stacked){
      const verticalGap=h*(.055+l.frameGap/100);
      afterW=Math.min(usableW,(bodyH-verticalGap)/((1+scale)*(1/ratio+headerFactor)));
      const beforeW=afterW*scale,beforeY=top+beforeW*headerFactor;
      const afterY=beforeY+beforeW/ratio+verticalGap+afterW*headerFactor;
      boxes=[{x:(w-beforeW)/2,y:beforeY,w:beforeW,h:beforeW/ratio},{x:(w-afterW)/2,y:afterY,w:afterW,h:afterW/ratio}];
    }else{
      afterW=Math.min((usableW-gap)/(1+scale),bodyH/(1/ratio+headerFactor));
      const beforeW=afterW*scale,afterH=afterW/ratio,beforeH=beforeW/ratio;
      const x=(w-afterW-beforeW-gap)/2,afterY=top+(bodyH-afterH-afterW*headerFactor)/2+afterW*headerFactor;
      boxes=[{x,y:afterY+(afterH-beforeH)/2,w:beforeW,h:beforeH},{x:x+beforeW+gap,y:afterY,w:afterW,h:afterH}];
    }
    boxes.forEach(b=>{b.textSize=b.w*.085*l.labelSize/100;b.headerHeight=b.textSize*1.5;});
    return {boxes,logoY:h*.91,ratio,arrangement:stacked?'stacked':'side-by-side'};
  }
  function mediaPlacement(box,sw,sh,media) {
    const scale=(media.fit==='cover'?Math.max(box.w/sw,box.h/sh):Math.min(box.w/sw,box.h/sh))*media.zoom;
    const w=sw*scale,h=sh*scale;
    return {x:box.x+(box.w-w)*media.panX,y:box.y+(box.h-h)*media.panY,w,h};
  }
  function drawText(ctx,text,x,y,size,maxWidth,font,weight) {
    const family=window.STGFontLibrary.family(font);
    ctx.font=weight+' '+size+'px '+family;const measured=ctx.measureText(text).width;
    if(measured>maxWidth)ctx.font=weight+' '+(size*maxWidth/measured)+'px '+family;
    ctx.fillText(text,x,y);
  }
  function renderFrame(target=canvas,seconds=elapsed/1000,exporting=false) {
    const ctx=target.getContext('2d'), w=target.width,h=target.height,l=scheme.layout;
    const {boxes,logoY}=geometry(w,h),font=window.STGFontLibrary.preset(l.fontFamily)||{weight:700};
    ctx.clearRect(0,0,w,h);ctx.fillStyle=l.backgroundColor;ctx.fillRect(0,0,w,h);
    const dark=l.compositionTheme==='dark';
    ctx.save();ctx.fillStyle=l.textColor;ctx.globalAlpha=.55;ctx.textAlign='center';ctx.textBaseline='middle';
    drawText(ctx,l.topText,w/2,h*.035,Math.min(w,h)*.016,w*.6,l.fontFamily,400);ctx.restore();
    scheme.rows.forEach((row,i)=>{
      const b=boxes[i],m=row.media,rt=runtime.get(row.id),image=exporting?rt?.exportVideo:rt?.video;
      const size=b.textSize;
      ctx.fillStyle=l.textColor;ctx.textBaseline='alphabetic';ctx.textAlign='left';
      drawText(ctx,row.text,b.x,b.y-size*.45,size,b.w*.55,l.fontFamily,font.weight||700);
      ctx.textAlign='right';drawText(ctx,row.caption,b.x+b.w,b.y-size*.5,size*.60,b.w*.42,l.fontFamily,500);
      ctx.save();ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,l.frameRadius*w/1920);ctx.clip();
      ctx.fillStyle=dark?'#1b1b1d':'#eeedeb';ctx.fillRect(b.x,b.y,b.w,b.h);
      if(m && rt?.ready && image?.readyState>=2) {
        const sw=image.videoWidth,sh=image.videoHeight;
        const placement=mediaPlacement(b,sw,sh,m);
        ctx.drawImage(image,placement.x,placement.y,placement.w,placement.h);
      } else {
        ctx.fillStyle=dark?'#858589':'#999795';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='400 '+Math.min(b.w,b.h)*.08+'px '+window.STGFontLibrary.family('stg:manrope');ctx.fillText('+',b.x+b.w/2,b.y+b.h*.42);
        ctx.font='400 '+Math.min(b.w,b.h)*.034+'px '+window.STGFontLibrary.family('stg:manrope');ctx.fillText(tr('点击上传视频','Click to upload video'),b.x+b.w/2,b.y+b.h*.57);
      }
      ctx.restore();
    });
    const logo=logos[dark?'white':'black'];
    if(logo?.complete && logo.naturalWidth){const lw=w*l.logoSize/100,lh=lw*logo.naturalHeight/logo.naturalWidth;ctx.drawImage(logo,(w-lw)/2,logoY-lh/2,lw,lh);}
    return target;
  }
  async function prepareFrame(seconds) { await Promise.all(scheme.rows.map(async row=>{const rt=runtime.get(row.id);if(rt?.ready)await seekVideo(rt.exportVideo,sourceTime(row,seconds));})); }
  function resizePreview() {
    const stage=$('glyphMorphStage'),style=getComputedStyle(stage),ratio=scheme.canvas.width/scheme.canvas.height;
    const aw=Math.max(1,stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
    const ah=Math.max(1,stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
    const fw=Math.min(aw,ah*ratio);frame.style.width=fw+'px';frame.style.height=fw/ratio+'px';frame.style.maxHeight='none';frame.style.setProperty('--gm-aspect',ratio);
    // Render at logical output dimensions; preview CSS only scales the same pixels.
    canvas.width=scheme.canvas.width;canvas.height=scheme.canvas.height;
    stage.style.setProperty('--tc-active-composition-bg',scheme.layout.backgroundColor);renderFrame(canvas);
  }
  function renderTimeline() {
    const total=duration()*1000;
    const clips=scheme.rows.filter(row=>clipDuration(row)>0).map(row=>clipDuration(row)*1000);
    const shortest=clips.length===2?Math.min(...clips):total;
    const phases=[{from:0,to:Math.min(total,shortest),zh:'双视频对比',english:'Video comparison',color:'#8ec8ff'}];
    if(shortest<total-.5)phases.push({from:shortest,to:total,zh:scheme.export.shortClip==='loop'?'短片循环':'末帧保留',english:scheme.export.shortClip==='loop'?'Short clip loops':'Hold last frame',color:'#d4b8ff'});
    $('timeline').innerHTML=phases.map(p=>'<button type="button" class="gm-timeline-block me-choreo-block" role="listitem" data-seek-ms="'+p.from+'" data-phase-color="'+p.color+'" style="background:'+p.color+';flex-grow:'+(p.to-p.from)+'"><strong>'+esc(tr(p.zh,p.english))+'</strong><small>'+((p.to-p.from)/1000).toFixed(2)+'s</small></button>').join('');
    $('scrubber').max=String(total);$('timeTotal').textContent=(total/1000).toFixed(2)+'s';
    elapsed=Math.min(elapsed,total);
  }
  function playbackButton(){ $('togglePlayback').setAttribute('aria-pressed',String(!playing));$('togglePlayback').innerHTML=playing?'Ⅱ '+copy('暂停','Pause'):'▶ '+copy('播放','Play'); }
  async function setTime(ms,pause=true) {
    if(busy)return;
    if(pause)playing=false;elapsed=clamp(ms,0,duration()*1000);last=performance.now();playbackButton();
    await Promise.allSettled(scheme.rows.map(row=>{const rt=runtime.get(row.id);if(!rt?.ready)return Promise.resolve();rt.video.pause();return seekVideo(rt.video,sourceTime(row,elapsed/1000));}));
    renderFrame(canvas);
  }
  function changeSize() {
    if(busy)return;const preset=$('canvasPreset').value;
    let w,h;if(preset==='custom'){w=Math.round(clamp($('canvasWidth').value,320,3840)/2)*2;h=Math.round(clamp($('canvasHeight').value,320,3840)/2)*2;}else [w,h]=preset.split('x').map(Number);
    checkpoint();scheme.canvas={preset,width:w,height:h};status('canvasStatus','','');syncControls();resizePreview();edited();
  }
  function syncControls() {
    $('canvasPreset').value=scheme.canvas.preset;$('canvasWidth').value=scheme.canvas.width;$('canvasHeight').value=scheme.canvas.height;document.querySelector('.gm-custom-size').hidden=scheme.canvas.preset!=='custom';
    for(const [id,value]of Object.entries(scheme.layout))if($(id))$(id).value=value;
    syncLayoutInfo();
    $('exportDuration').value=scheme.export.duration;$('exportFps').value=scheme.export.fps;$('customDuration').value=scheme.export.customDuration;$('shortClip').value=scheme.export.shortClip;$('customDurationField').hidden=scheme.export.duration!=='custom';
    for(const id of ['labelSize','marginSize','frameGap','frameRadius','logoSize','beforeScale']){const out=document.querySelector('output[for="'+id+'"]');out.value=scheme.layout[id]+(id==='frameRadius'?'px':'%');$(id).dispatchEvent(new CustomEvent('vc-sync'));}
  }
  function normalize(input) {
    if(!input || input.effect!==SLUG || input.version!==1 || !Array.isArray(input.rows) || input.rows.length!==2)throw new Error(tr('不是有效的视频对比方案。','Invalid Video Compare scheme.'));
    const result=clone(defaults),c=input.canvas||{};
    result.canvas.width=Math.round(clamp(c.width,320,3840)/2)*2;result.canvas.height=Math.round(clamp(c.height,320,3840)/2)*2;
    result.canvas.preset=[...$('canvasPreset').options].some(o=>o.value===c.preset&&!o.disabled)?c.preset:'custom';
    if(result.canvas.preset!=='custom' && result.canvas.preset!==result.canvas.width+'x'+result.canvas.height)result.canvas.preset='custom';
    const l=input.layout||{};result.layout.topText=typeof l.topText==='string'?l.topText.slice(0,100):defaults.layout.topText;result.layout.videoAspect=['auto','16:9','9:16'].includes(l.videoAspect)?l.videoAspect:'auto';for(const id of ['labelSize','marginSize','frameGap','frameRadius','logoSize','beforeScale'])result.layout[id]=clamp(l[id]??defaults.layout[id],$(id).min,$(id).max);
    for(const id of ['textColor','backgroundColor'])if(/^#[0-9a-f]{6}$/i.test(l[id]))result.layout[id]=l[id];
    if(window.STGFontLibrary.preset(l.fontFamily))result.layout.fontFamily=l.fontFamily;
    result.layout.compositionTheme=l.compositionTheme==='dark'?'dark':'light';
    const ex=input.export||{};result.export.duration=['cycle','3','5','10','custom'].includes(ex.duration)?ex.duration:'cycle';result.export.customDuration=clamp(ex.customDuration||6,.1,120);result.export.fps=[24,30,60].includes(Number(ex.fps))?Number(ex.fps):30;result.export.shortClip=ex.shortClip==='loop'?'loop':'hold';
    result.rows=result.rows.map((row,i)=>{const r=input.rows.find(r=>r.id===row.id);if(!r)throw new Error('Missing video slot');row.text=String(r.text??row.text).slice(0,100);row.caption=String(r.caption??row.caption).slice(0,160);row.audioEnabled=typeof r.audioEnabled==='boolean'?r.audioEnabled:row.audioEnabled;if(r.media){const m=r.media;if(!/^data:video\//i.test(m.url||''))throw new Error(tr('方案视频必须包含在文件内。','Scheme videos must be embedded in the file.'));row.media={kind:'video',url:m.url,name:String(m.name||'Video'),fileType:String(m.fileType||'video/mp4'),fit:m.fit==='cover'?'cover':'contain',zoom:clamp(m.zoom||1,1,4),panX:clamp(m.panX??.5,0,1),panY:clamp(m.panY??.5,0,1),trimStart:Math.max(0,Number(m.trimStart)||0),trimEnd:Math.max(0,Number(m.trimEnd)||0)};}return row;});return result;
  }
  async function applyScheme(input) {
    const next=normalize(input);const myRevision=++revision;
    for(const rt of runtime.values())dispose(rt);runtime.clear();scheme=next;elapsed=0;playing=false;
    renderRows();syncControls();resizePreview();renderTimeline();playbackButton();
    const loaded=await Promise.allSettled([loadFont(),...scheme.rows.map(loadMedia)]);
    if(myRevision!==revision)return;
    if(loaded.some(r=>r.status==='rejected'))throw new Error(tr('部分视频无法解码，请替换。','Some videos could not be decoded. Replace them.'));
    renderFrame(canvas);refreshShell();persist();
  }
  $('sequenceRows').addEventListener('change',async e=>{
    if(!e.target.matches('[data-video-file]') || busy)return;
    const row=scheme.rows.find(r=>r.id===e.target.closest('[data-row-id]').dataset.rowId),file=e.target.files[0];if(!file)return;
    const myToken=Symbol(),previousMedia=row.media;uploadTokens.set(row.id,myToken);
    const name=e.target.closest('.vc-row').querySelector('.vc-file-name');
    if(!file.type.startsWith('video/') || file.size>200*1024*1024){name.textContent=tr('请选择 200 MB 以内的视频文件。','Choose a video file smaller than 200 MB.');name.classList.add('is-error');return;}
    name.textContent=tr('正在读取视频…','Reading video…');
    try {
      const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
      if(uploadTokens.get(row.id)!==myToken || !scheme.rows.includes(row))return;
      checkpoint();row.media={kind:'video',url,name:file.name,fileType:file.type,trimStart:0,trimEnd:0,fit:'contain',zoom:1,panX:.5,panY:.5};
      await loadMedia(row);await setTime(0);syncMediaUi(row);edited();refreshShell();
    }catch{if(uploadTokens.get(row.id)===myToken && scheme.rows.includes(row)){row.media=previousMedia;try{await loadMedia(row);}catch{}syncMediaUi(row);edited();}status('schemeStatus','视频无法读取，已保留原视频。','Cannot read video. Your previous video is preserved.');}
  });
  $('sequenceRows').addEventListener('input',e=>{
    const key=e.target.dataset.key,shell=e.target.closest('.vc-row');if(!key||!shell||busy)return;
    const row=scheme.rows.find(r=>r.id===shell.dataset.rowId);
    if(!historyTimer){checkpoint();historyTimer=setTimeout(()=>historyTimer=null,500);}
    if(['text','caption'].includes(key))row[key]=e.target.value;
    else if(key==='audioEnabled'){row.audioEnabled=e.target.checked;syncMediaUi(row);syncPreviewAudio(true);}
    else if(row.media){const m=row.media,rt=runtime.get(row.id);m[key]=key==='fit'?e.target.value:Number(e.target.value);if(key==='zoom')m.zoom=clamp(m.zoom,1,4);if(['panX','panY'].includes(key))m[key]=clamp(m[key],0,1);if(rt?.ready){m.trimStart=clamp(m.trimStart,0,rt.duration-.01);m.trimEnd=clamp(m.trimEnd,m.trimStart+.01,rt.duration);}syncMediaUi(row);}
    if(key==='trimStart'||key==='trimEnd')void setTime(0);
    edited();
  });
  $('sequenceRows').addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action,shell=e.target.closest('.vc-row');if(!action||!shell||busy)return;
    const row=scheme.rows.find(r=>r.id===shell.dataset.rowId);
    if(action==='pause-row')void setTime(elapsed);
    if(action==='reset-crop'&&row.media){checkpoint();Object.assign(row.media,{fit:'contain',zoom:1,panX:.5,panY:.5});syncMediaUi(row);edited();}
    if(action==='remove-video'){checkpoint();uploadTokens.set(row.id,Symbol());row.media=null;dispose(runtime.get(row.id));runtime.delete(row.id);syncMediaUi(row);edited();}
  });
  let drag=null;
  $('sequenceRows').addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-edge]');if(!handle||busy)return;const row=scheme.rows.find(r=>r.id===handle.closest('.vc-row').dataset.rowId);if(!runtime.get(row.id)?.ready)return;checkpoint();drag={row,handle,edge:handle.dataset.edge};handle.setPointerCapture(e.pointerId);e.preventDefault();trimAt(e);});
  function trimAt(e){if(!drag)return;const {row,handle,edge}=drag,rt=runtime.get(row.id),rect=handle.closest('.vc-video-timeline').getBoundingClientRect();const seconds=clamp((e.clientX-rect.left)/rect.width,0,1)*rt.duration;if(edge==='start')row.media.trimStart=clamp(seconds,0,row.media.trimEnd-.01);else row.media.trimEnd=clamp(seconds,row.media.trimStart+.01,rt.duration);syncMediaUi(row);void setTime(0);edited();}
  $('sequenceRows').addEventListener('pointermove',e=>{if(drag)trimAt(e);});
  for(const event of ['pointerup','pointercancel'])$('sequenceRows').addEventListener(event,()=>{drag=null;});
  $('sequenceRows').addEventListener('keydown',e=>{const handle=e.target.closest('[data-edge]');if(!handle||!['ArrowLeft','ArrowRight'].includes(e.key)||busy)return;e.preventDefault();const row=scheme.rows.find(r=>r.id===handle.closest('.vc-row').dataset.rowId);const rt=runtime.get(row.id);if(!rt?.ready)return;checkpoint();const delta=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?.5:.05);if(handle.dataset.edge==='start')row.media.trimStart=clamp(row.media.trimStart+delta,0,row.media.trimEnd-.01);else row.media.trimEnd=clamp(row.media.trimEnd+delta,row.media.trimStart+.01,rt.duration);syncMediaUi(row);void setTime(0);edited();});
  for(const id of ['canvasPreset','canvasWidth','canvasHeight'])$(id).addEventListener('change',changeSize);
  for(const id of Object.keys(defaults.layout))$(id).addEventListener('input',()=>{
    if(busy)return;checkpoint();scheme.layout[id]=['range','number'].includes($(id).type)?Number($(id).value):$(id).value;
    if(id==='compositionTheme'){Object.assign(scheme.layout,$(id).value==='dark'?{textColor:'#fafafa',backgroundColor:'#101011'}:{textColor:'#171717',backgroundColor:'#faf9f7'});}
    syncControls();void loadFont();resizePreview();edited();
  });
  for(const id of ['exportDuration','exportFps','customDuration','shortClip'])$(id).addEventListener('change',()=>{if(busy)return;checkpoint();scheme.export={duration:$('exportDuration').value,fps:Number($('exportFps').value),customDuration:clamp($('customDuration').value,.1,120),shortClip:$('shortClip').value};syncControls();edited();});
  $('scrubber').addEventListener('input',()=>void setTime(Number($('scrubber').value)));
  $('timeline').addEventListener('click',e=>{const b=e.target.closest('[data-seek-ms]');if(b)void setTime(Number(b.dataset.seekMs));});
  $('togglePlayback').addEventListener('click',()=>{if(busy)return;playing=!playing;if(playing&&elapsed>=duration()*1000)elapsed=0;last=performance.now();syncPreviewAudio(true);playbackButton();});
  $('restartPreview').addEventListener('click',()=>{if(busy)return;elapsed=0;playing=true;for(const row of scheme.rows){const rt=runtime.get(row.id);if(rt?.ready)rt.video.currentTime=sourceTime(row,0);}last=performance.now();syncPreviewAudio(true);playbackButton();});
  $('toggleInspector').addEventListener('click',()=>{document.body.classList.toggle('gm-inspector-hidden');requestAnimationFrame(resizePreview);});
  canvas.addEventListener('click',e=>{
    if(busy)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;
    geometry(canvas.width,canvas.height).boxes.forEach((b,i)=>{
      if(x<b.x||x>b.x+b.w||y<b.y-b.headerHeight||y>b.y+b.h)return;
      const row=scheme.rows[i];document.querySelector('.tc-row-select[data-row-id="'+row.id+'"]')?.click();
      const shell=document.querySelector('.vc-row[data-row-id="'+row.id+'"]');
      if(y<b.y){void setTime(elapsed);const input=shell.querySelector('[data-key="'+(x>b.x+b.w*.58?'caption':'text')+'"]');input.focus();input.select();}
      else if(!row.media)shell.querySelector('[data-video-file]')?.click();
    });
  });
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  $('saveScheme').addEventListener('click',()=>{download(new Blob([JSON.stringify(scheme,null,2)],{type:'application/json'}),'video-compare-scheme.json');persist();status('schemeStatus','方案已下载，包含两段视频。','Scheme downloaded, including both videos.');});
  $('importScheme').addEventListener('click',()=>$('schemeFile').click());
  $('schemeFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file||busy)return;try{const input=JSON.parse(await file.text());normalize(input);checkpoint();await applyScheme(input);status('schemeStatus','方案已导入。','Scheme imported.');}catch(error){status('schemeStatus','导入失败：'+error.message,'Import failed: '+error.message);}finally{e.target.value='';}});
  for(const id of ['restoreScheme','clearScheme'])$(id).addEventListener('click',async()=>{if(busy)return;checkpoint();await applyScheme(clone(defaults));status('schemeStatus',id==='restoreScheme'?'已恢复默认模板。':'已清理视频，可重新制作。',id==='restoreScheme'?'Default template restored.':'Videos cleared. Ready to start again.');});
  document.addEventListener('keydown',async e=>{if(busy||e.target.closest('input,textarea,select,[contenteditable]')||!(e.ctrlKey||e.metaKey))return;if(!['z','y'].includes(e.key.toLowerCase()))return;e.preventDefault();const redo=e.shiftKey||e.key.toLowerCase()==='y',from=redo?redoStack:undoStack,to=redo?undoStack:redoStack;if(!from.length)return;to.push(clone(scheme));await applyScheme(from.pop());});
  async function loadFont(){const face=window.STGFontLibrary.preset(scheme.layout.fontFamily);if(face){try{await document.fonts.load((face.style||'normal')+' '+(face.weight||700)+' 60px "'+face.family+'"','Before 网上看到的');}catch{}renderFrame(canvas);}}
  let encoderLoader;
  function loadEncoder(){if(window.HME?.createH264MP4Encoder)return Promise.resolve();if(!encoderLoader)encoderLoader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='js/h264-mp4-encoder.web.js';s.onload=resolve;s.onerror=()=>{encoderLoader=null;reject(new Error('MP4 encoder unavailable'));};document.head.append(s);});return encoderLoader;}
  function setBusy(value){busy=value;document.body.classList.toggle('vc-exporting',value);$('cancelExport').hidden=!value;$('exportProgress').hidden=!value;for(const id of ['exportPng','exportGif','exportMp4','saveScheme','importScheme','restoreScheme','clearScheme','exportDuration','exportFps','customDuration','shortClip','togglePlayback','restartPreview','scrubber'])$(id).disabled=value;for(const input of document.querySelectorAll('#sequenceRows input,#sequenceRows select,.gm-custom-size input,#canvasPreset,.tc-properties[data-panel="global"] input,.tc-properties[data-panel="global"] select'))input.disabled=value;}
  $('cancelExport').addEventListener('click',()=>{cancelled=true;});
  async function exportComposition(format){
    if(busy)return;let encoder,workerUrl='',gif;
    cancelled=false;const wasPlaying=playing;playing=false;syncPreviewAudio();playbackButton();setBusy(true);$('exportProgress').value=0;
    try {
      if(scheme.rows.some(row=>row.media&&!runtime.get(row.id)?.ready))throw new Error(tr('请先等待视频读取完成。','Wait for the videos to finish loading.'));
      if(format!=='png' && scheme.rows.some(row=>!row.media))throw new Error(tr('请先上传两段视频。','Upload both videos first.'));
      await loadFont();await Promise.all(Object.values(logos).map(img=>img.decode()));
      const output=document.createElement('canvas');output.width=scheme.canvas.width;output.height=scheme.canvas.height;
      let audio=null;
      const fps=format==='gif'?Math.min(30,scheme.export.fps):scheme.export.fps,total=format==='png'?1:Math.max(1,Math.ceil(duration()*fps));
      if(format==='mp4'){status('exportStatus','正在处理声音…','Preparing audio…');audio=await (await loadAudio()).mixAudio(scheme.rows,total/fps,scheme.export.shortClip,()=>cancelled);await loadEncoder();encoder=await window.HME.createH264MP4Encoder();encoder.width=output.width;encoder.height=output.height;encoder.frameRate=fps;encoder.kbps=Math.max(5000,Math.min(30000,Math.round(output.width*output.height*fps*.18/1000)));encoder.groupOfPictures=fps;encoder.outputFilename=SLUG+'.mp4';encoder.initialize();}
      if(format==='gif'){const response=await fetch('js/continuation-gif.worker.js');if(!response.ok)throw new Error('GIF worker unavailable');workerUrl=URL.createObjectURL(new Blob([await response.text()],{type:'text/javascript'}));gif=new GIF({workers:2,quality:10,width:output.width,height:output.height,workerScript:workerUrl});}
      for(let i=0;i<total;i++){
        if(cancelled)throw new Error(tr('已取消导出。','Export cancelled.'));
        const time=format==='png'?elapsed/1000:i/fps;
        await prepareFrame(time);renderFrame(output,time,true);
        if(format==='mp4')encoder.addFrameRgba(output.getContext('2d',{willReadFrequently:true}).getImageData(0,0,output.width,output.height).data);
        if(format==='gif')gif.addFrame(output,{copy:true,delay:(Math.round((i+1)*100/fps)-Math.round(i*100/fps))*10});
        $('exportProgress').value=(i+1)/total;status('exportStatus','正在导出 '+format.toUpperCase()+' · '+Math.round((i+1)/total*100)+'%','Exporting '+format.toUpperCase()+' · '+Math.round((i+1)/total*100)+'%');
        if(i%3===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      let blob;
      if(format==='png')blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
      if(format==='mp4'){encoder.finalize();blob=new Blob([encoder.FS.readFile(encoder.outputFilename)],{type:'video/mp4'});if(audio){status('exportStatus','正在合成 MP4 声音…','Muxing MP4 audio…');blob=await (await loadAudio()).muxAudio(blob,audio,fps,()=>cancelled);}}
      if(format==='gif')blob=await new Promise((resolve,reject)=>{let finished=false;const check=setInterval(()=>{if(cancelled&&!finished){finished=true;clearInterval(check);gif.abort();gif.activeWorkers?.forEach(w=>w.terminate());gif.freeWorkers?.forEach(w=>w.terminate());reject(new Error(tr('已取消导出。','Export cancelled.')));}},100);gif.on('progress',p=>status('exportStatus','正在编码 GIF · '+Math.round(p*100)+'%','Encoding GIF · '+Math.round(p*100)+'%'));gif.on('finished',b=>{if(finished)return;finished=true;clearInterval(check);resolve(b);});gif.on('abort',()=>{if(finished)return;finished=true;clearInterval(check);reject(new Error('GIF encoding aborted'));});gif.render();});
      if(cancelled)throw new Error(tr('已取消导出。','Export cancelled.'));
      download(blob,SLUG+'-'+output.width+'x'+output.height+'.'+format);
      status('exportStatus',format.toUpperCase()+' 已生成 · '+output.width+' × '+output.height,format.toUpperCase()+' ready · '+output.width+' × '+output.height);
    } catch(error){status('exportStatus',error.message,error.message);}
    finally{try{encoder?.delete();}catch{}if(workerUrl)URL.revokeObjectURL(workerUrl);setBusy(false);playing=wasPlaying;last=performance.now();syncPreviewAudio(true);playbackButton();syncControls();}
  }
  for(const format of ['png','gif','mp4'])$('export'+format[0].toUpperCase()+format.slice(1)).addEventListener('click',()=>void exportComposition(format));
  function refreshShell(){
    const canvasLabel=document.querySelector('.tc-preview-label');if(canvasLabel){canvasLabel.setAttribute('data-no-translate','');canvasLabel.textContent=tr('整体画布','Output canvas');}
    const leftHeading=document.querySelector('.tc-content .tc-panel-heading h2');if(leftHeading){const count=$('tcRowCount')||document.createElement('span');count.id='tcRowCount';count.textContent='2';leftHeading.replaceChildren(document.createTextNode(tr('对比视频','Compare videos')),count);}
    const hint=document.querySelector('.tc-hint');if(hint)hint.textContent=tr('分别上传视频，标签可自由修改。','Upload each video and edit its labels.');
    const tabs=document.querySelectorAll('.tc-tabs button');if(tabs.length){tabs[0].textContent=tr('当前视频','Video');tabs[1].textContent=tr('版式设置','Layout');}
    const selected=document.querySelector('.tc-row-select[aria-pressed="true"]')?.dataset.rowId;
    const title=$('tcSelectedTitle');const text=selected==='after'?'After':'Before';if(title&&title.textContent!==text)title.textContent=text;
    document.querySelectorAll('[data-vc-zh]').forEach(node=>{const value=node.dataset[en()?'vcEn':'vcZh'];if(node.textContent!==value)node.textContent=value;});
    for(const row of scheme.rows){const shell=document.querySelector('.vc-row[data-row-id="'+row.id+'"]');if(shell){shell.dataset.rowSummary=tr('独立视频 · 同步播放','Video · Synchronized');shell.querySelector('[data-key="caption"]').setAttribute('aria-label',row.id+' '+tr('说明文字','caption'));shell.querySelector('[data-key="text"]').setAttribute('aria-label',row.id+' '+tr('主标签','label'));}syncMediaUi(row);}
    document.querySelectorAll('.tc-row-description').forEach(node=>node.textContent=tr('独立视频 · 同步播放','Video · Synchronized'));
    const option=$('canvasPreset').querySelector('[value="1080x1920"]');option.textContent='9:16 · 1080 × 1920';
    for(const o of $('videoAspect').options)o.textContent=o.value==='auto'?tr('自动跟随素材 · 优先 After','Match source · After first'):o.value==='16:9'?tr('16:9 · 横屏视频','16:9 · Landscape video'):tr('9:16 · 竖屏视频','9:16 · Portrait video');
    syncLayoutInfo();
    for(const [id,entries]of Object.entries({compositionTheme:{light:['白底 · 黑字','White / black'],dark:['黑底 · 白字','Black / white']},shortClip:{hold:['停在最后一帧','Hold last frame'],loop:['循环播放','Loop']},exportDuration:{cycle:['完整视频','Full duration'],custom:['自定义','Custom']}}))for(const [value,words]of Object.entries(entries))$(id).querySelector('[value="'+value+'"]').textContent=tr(...words);
    document.querySelectorAll('.vc-row select[data-key="fit"] option').forEach(o=>o.textContent=o.value==='cover'?tr('铺满裁切','Fill and crop'):tr('完整显示','Fit inside'));
    renderTimeline();playbackButton();renderFrame(canvas);
  }
  document.addEventListener('tc-languagechange',refreshShell);document.addEventListener('cellmotion:languagechange',refreshShell);
  function tick(now){
    if(!busy){
      if(playing){elapsed+=(now-last);if(elapsed>=duration()*1000)elapsed%=duration()*1000;}
      for(const row of scheme.rows){const rt=runtime.get(row.id);if(!rt?.ready)continue;const v=rt.video,target=sourceTime(row,elapsed/1000),end=scheme.export.shortClip==='hold'&&elapsed/1000>=clipDuration(row);
        if(!v.seeking && Math.abs(v.currentTime-target)>(playing?.12:.002))v.currentTime=target;
        if(playing&&!end&&v.paused)void v.play().catch(()=>{});if((!playing||end)&&!v.paused)v.pause();
      }
      renderFrame(canvas);$('scrubber').value=String(elapsed);$('timeNow').textContent=(elapsed/1000).toFixed(2)+'s';
    }
    last=now;requestAnimationFrame(tick);
  }
  renderRows();syncControls();renderTimeline();playbackButton();
  window.addEventListener('resize',resizePreview,{passive:true});new ResizeObserver(resizePreview).observe($('glyphMorphStage'));
  document.addEventListener('DOMContentLoaded',async()=>{
    refreshShell();requestAnimationFrame(resizePreview);
    const title=$('tcSelectedTitle');if(title)new MutationObserver(()=>{const selected=document.querySelector('.tc-row-select[aria-pressed="true"]')?.dataset.rowId;const label=selected==='after'?'After':'Before';if(title.textContent!==label)title.textContent=label;}).observe(title,{childList:true});
    await loadFont();
    if(!previewMode)try{const saved=await stored('readonly');if(saved&&revision===0)await applyScheme(saved);}catch{status('schemeStatus','未能恢复本机方案，可导入 JSON。','Could not restore the saved scheme. You can import JSON.');}
    requestAnimationFrame(tick);
  });
  // Explicit test surface: same renderer and timing, no alternate export implementation.
  window.VideoCompare={renderFrame,geometry,mediaPlacement,videoAspect,sourceTime,duration,prepareFrame,applyScheme,getScheme:()=>clone(scheme),setTime,exportComposition,getTime:()=>elapsed/1000,getAudioState:()=>scheme.rows.map(r=>({id:r.id,enabled:r.audioEnabled,muted:runtime.get(r.id)?.video.muted,volume:runtime.get(r.id)?.video.volume,paused:runtime.get(r.id)?.video.paused,hasAudio:runtime.get(r.id)?.hasAudio}))};
})();
