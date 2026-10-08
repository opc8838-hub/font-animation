/* CellMotion adaptation of Johnlzx/pro-svg-lab. See docs/PRO_SVG_LAB_ATTRIBUTION.md.
 * The upstream generator remains unmodified under vendor/pro-svg-lab/. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+n) ? +n : lo));
  const promoDefaults = {"promoEnabled":false,"promoText":"How I made this","promoFont":"stg:instrument-serif","promoZoom":3.4,"promoBreath":0,"promoSize":110,"promoColor":"#16181b","promoY":0,"promoTyping":false,"promoReveal":0.6,"promoHold":3.2,"promoFade":0.6,"promoGap":0,"promoScans":1};
  const defaults = { palette: 'original', stage: 5, blur: 7.3, grain: .12, period: 4.4, warp: 0, light: 0, direction: 1, proShape: true, ...promoDefaults };
  const fields = { palette: 'materialPalette', stage: 'materialStage', blur: 'materialBlur', grain: 'materialGrain', period: 'materialPeriod', warp: 'materialWarp', light: 'materialLight', direction: 'materialDirection', proShape: 'materialProShape', promoEnabled: 'promoEnabled', promoText: 'promoText', promoFont: 'promoFont', promoZoom: 'promoZoom', promoBreath: 'promoBreath', promoSize: 'promoSize', promoColor: 'promoColor', promoY: 'promoY', promoTyping: 'promoTyping', promoReveal: 'promoReveal', promoHold: 'promoHold', promoFade: 'promoFade', promoGap: 'promoGap', promoScans: 'promoScans' };
  const copy = value => JSON.parse(JSON.stringify(value));
  function normalize(value = {}) {
    const v = { ...defaults, ...value };
    return { palette: ['original','silver','lava','violet'].includes(v.palette) ? v.palette : 'original', stage: Math.round(clamp(v.stage, 0, 5)), blur: clamp(v.blur, 0, 16), grain: clamp(v.grain, 0, .4), period: clamp(v.period, 1, 12), warp: clamp(v.warp, 0, 24), light: clamp(v.light, 0, 2), direction: +v.direction === -1 ? -1 : 1, proShape: v.proShape !== false,
      promoEnabled: v.promoEnabled === true, promoTyping: v.promoTyping === true,
      promoText: String(v.promoText ?? promoDefaults.promoText).slice(0,1000),
      promoFont: window.STGFontLibrary?.preset(v.promoFont) ? v.promoFont : promoDefaults.promoFont,
      promoColor: /^#[0-9a-f]{6}$/i.test(v.promoColor) ? v.promoColor : promoDefaults.promoColor,
      promoZoom: clamp(v.promoZoom,1,8), promoBreath: clamp(v.promoBreath,0,.5),
      promoSize: clamp(v.promoSize,24,240), promoY: clamp(v.promoY,-40,40),
      promoReveal: clamp(v.promoReveal,.1,10), promoHold: clamp(v.promoHold,.1,20),
      promoFade: clamp(v.promoFade,.1,10), promoGap: clamp(v.promoGap,0,10), promoScans: Math.round(clamp(v.promoScans,1,8)) };
  }
  const scheme = {
    version: 7,
    canvas: { width: 1920, height: 1080, preset: '1920x1080' },
    typography: { fontFamily: 'stg:archivo-black', fontSize: 400, tracking: 0, positionX: 0, positionY: 0, alignment: 'center', textColor: '#16181b', backgroundColor: '#ffffff' },
    motion: { introEnabled: true, introDuration: 440, introCharacterDelay: 0, morphDuration: 600, characterDelay: 0, effectAmount: 0, speed: 1, loop: true },
    material: { ...defaults },
    rows: [{ id: 'prosvg-01', text: 'PRO', hold: 0, icons: [], fontFamily: '', textColor: '#16181b', backgroundColor: '#ffffff', backgroundMedia: null, backgroundTransition: 'direct', backgroundTransitionDuration: 120 }]
  };
  const smooth = p => { p=clamp(p,0,1); return p*p*(3-2*p); };
  function promoBeats(m,row) {
    return [[m.promoTyping?'文案逐字':'文案出现',m.promoReveal*1000],['文案停留',m.promoHold*1000+row.hold],['文案淡出',m.promoFade*1000],...(m.promoGap?[['轮间空隙',m.promoGap*1000]]:[])];
  }
  function promoDuration(m,row) { return promoBeats(m,row).reduce((sum,beat)=>sum+beat[1],0); }
  function promoPose(m,row,seconds) {
    const duration=promoDuration(m,row)/1000;
    const local=clamp(seconds,0,duration), reveal=m.promoReveal, hold=m.promoHold+row.hold/1000;
    return {duration, zoom:m.promoZoom*(1+m.promoBreath*Math.pow(Math.sin(Math.PI*local/duration),2)),
      reveal:clamp(local/reveal,0,1), opacity:local<reveal?(m.promoTyping?1:smooth(local/reveal)):1-smooth((local-reveal-hold)/m.promoFade)};
  }
  const graphemes = text => typeof Intl.Segmenter==='function' ? [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(s=>s.segment) : Array.from(text);
  function drawPromoCaption(ctx,m,pose,width,height) {
    if(!m.promoText || pose.opacity<=0)return;
    const preset=window.STGFontLibrary.preset(m.promoFont), family=window.STGFontLibrary.family(m.promoFont);
    let size=m.promoSize*Math.min(width,height)/1080;
    const setFont=()=>{ctx.font=preset.style+' '+preset.weight+' '+size+'px '+family;};
    setFont();
    const lines=m.promoText.split('\n');
    const widest=Math.max(1,...lines.map(line=>ctx.measureText(line).width));
    size*=Math.min(1,width*.9/widest,height*.8/(size*1.2*lines.length));setFont();
    const chars=graphemes(m.promoText), count=m.promoTyping?Math.floor(chars.length*pose.reveal):chars.length;
    const visible=chars.slice(0,count).join('').split('\n');
    ctx.save();ctx.globalAlpha=pose.opacity;ctx.fillStyle=m.promoColor;ctx.textAlign='left';ctx.textBaseline='middle';
    lines.forEach((line,index)=>{const x=(width-ctx.measureText(line).width)/2;
      const y=height*(.5+m.promoY/100)+(index-(lines.length-1)/2)*size*1.2;
      ctx.fillText(visible[index]||'',x,y);});ctx.restore();
  }
  function segments(s) {
    const m=normalize(s.material);
    const period = m.period * 1000;
    const duration = period * (s.motion.introEnabled ? 2 : 1);
    return s.rows.map((row, index) => {
      const to = s.rows[(index + 1) % s.rows.length];
      const canTransition = s.rows.length > 1 && (s.motion.loop || index < s.rows.length - 1);
      const transitionMs = canTransition && to.backgroundTransition === 'crossfade' ? clamp(to.backgroundTransitionDuration,10,2000) : 0;
      const holdMs=m.promoEnabled?promoDuration(m,row):duration+row.hold;
      return { from: row, to, durationMs: holdMs + transitionMs, holdMs, transitionMs, morphMs: transitionMs, tailMs: 0, introMs: 0, terminal: false };
    });
  }
  function renderTimeline(s) {
    const track = $('timeline');
    track.replaceChildren();
    let cursor = 0;
    const period = normalize(s.material).period * 1000 / s.motion.speed;
    s.rows.forEach((row,index) => {
      const transition = segments(s)[index].transitionMs / s.motion.speed;
      const m=normalize(s.material);
      const beats = m.promoEnabled ? [...promoBeats(m,row).map(([name,duration])=>[name,duration/s.motion.speed]),...(transition?[['背景淡化',transition]]:[])] : [...(s.motion.introEnabled ? [['柔和揭示', period]] : []), ['色谱流动', period], ...(row.hold ? [['材质停留', row.hold / s.motion.speed]] : []), ...(transition ? [['背景淡化',transition]] : [])];
      beats.forEach(([name, duration], i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'gm-timeline-block me-choreo-block'; button.setAttribute('role','listitem');
        button.dataset.seekMs = String(cursor);
        button.style.background = ({'文案出现':'#d7ff2f','文案逐字':'#d7ff2f','文案停留':'#8ec8ff','文案淡出':'#ffc4d6','轮间空隙':'#d4b8ff','背景淡化':'#9de7d7','柔和揭示':'#d7ff2f','色谱流动':'#8ec8ff','材质停留':'#ffd27d'})[name];
        const strong = document.createElement('strong'); strong.textContent = name;
        const small = document.createElement('small'); small.textContent = (row.text || '留白') + ' · ' + (duration / 1000).toFixed(2) + 's';
        button.append(strong, small); track.append(button); cursor += duration;
      });
    });
    $('scrubber').max = String(Math.max(1,cursor)); $('timeTotal').textContent = (cursor / 1000).toFixed(2) + 's';
  }
  let api;
  const shapeCache = new Map();
  const jobs = new WeakMap();
  let lastSvg = '';
  let lastGeometry;
  const escapeAttr = v => String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  function materialLayout(ctx, layout, typography, width, height) {
    ctx.font = layout.style + ' ' + layout.weight + ' ' + layout.fontSize + 'px ' + layout.family;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const glyphs = layout.slots.filter(slot => slot.token.type === 'glyph' && slot.token.glyph.trim());
    const measures = glyphs.map(slot => ctx.measureText(slot.token.glyph));
    if (!measures.length) measures.push(ctx.measureText('H'));
    const ascent = Math.max(0,...measures.map(m => m.actualBoundingBoxAscent || 0));
    const descent = Math.max(0,...measures.map(m => m.actualBoundingBoxDescent || 0));
    const inkHeight = Math.max(1,ascent + descent || layout.fontSize * .73);
    const left = layout.slots.length ? Math.min(...layout.slots.map(slot => slot.x - slot.width / 2)) : width / 2;
    const right = layout.slots.length ? Math.max(...layout.slots.map(slot => slot.x + slot.width / 2)) : left + 1;
    const span = Math.max(1,right-left);
    // Here the size control denotes visible letter height, as it does for the
    // canonical 129-unit PRO outline. Fit only when the composition is too wide.
    const factor = Math.min(layout.fontSize / inkHeight,width * .88 / span);
    const total = span * factor;
    let start = width * (.5 + typography.positionX / 100) - total / 2;
    if (typography.alignment === 'left') start = width * (.08 + typography.positionX / 100);
    if (typography.alignment === 'right') start = width * (.92 + typography.positionX / 100) - total;
    const baselineOffset = (ascent - descent) * factor / 2;
    return { inkHeight: inkHeight * factor, layout: { ...layout,
      fontSize: layout.fontSize * factor,
      slots: layout.slots.map(slot => ({ ...slot, x: start + (slot.x-left)*factor,
        y: slot.y + (slot.token.type === 'glyph' ? baselineOffset : 0), width: slot.width*factor })) } };
  }
  function shapeFor(args, timeline) {
    const { state, width, height, glyphLayout, drawToken } = args;
    const row = timeline.segment.from;
    const s = state.scheme, m = normalize(s.material);
    const original = m.proShape && row.text.toUpperCase() === 'PRO' && !row.icons.length && !s.typography.tracking;
    const key = JSON.stringify([width,height,s.typography,row.text,row.fontFamily,row.icons,original,document.fonts.status]);
    if (shapeCache.has(key)) return shapeCache.get(key);
    const scratch = document.createElement('canvas'); scratch.width = width; scratch.height = height;
    const ctx = scratch.getContext('2d');
    let layout = glyphLayout(ctx,row,width,height);
    let W, H, x, y, scale, markup = '';
    if (original) {
      W = 337; H = 129;
      scale = Math.min(s.typography.fontSize * Math.min(width,height) / 1080 / H, width * .88 / W);
      x = width * (.5 + s.typography.positionX / 100) - W * scale / 2;
      if (s.typography.alignment === 'left') x = width * (.08 + s.typography.positionX / 100);
      if (s.typography.alignment === 'right') x = width * (.92 + s.typography.positionX / 100) - W * scale;
      y = height * (.5 + s.typography.positionY / 100) - H * scale / 2;
    } else {
      const normalized = materialLayout(ctx,layout,s.typography,width,height);
      layout = normalized.layout;
      const slots = layout.slots;
      x = slots.length ? Math.min(...slots.map(slot => slot.x - slot.width / 2)) : width / 2;
      const right = slots.length ? Math.max(...slots.map(slot => slot.x + slot.width / 2)) : x + 1;
      scale = normalized.inkHeight / 129;
      W = Math.max(1,(right-x)/scale); H = 129;
      y = height * (.5 + s.typography.positionY / 100) - H * scale / 2;
      // A self-contained alpha mask embeds the resolved shared font. No remote font
      // dependency or second set of export text metrics is introduced.
      scratch.width = Math.max(2,Math.ceil(W * 3)); scratch.height = Math.ceil(H * 3);
      ctx.scale(3/scale,3/scale); ctx.translate(-x,-y);
      slots.filter(slot => slot.token.type === 'glyph').forEach(slot => drawToken(ctx,slot,layout,1,1,0,null,{color:'#ffffff'}));
      markup = '<mask id="cm-shape" maskUnits="userSpaceOnUse" x="0" y="0" width="'+W+'" height="'+H+'"><image href="'+scratch.toDataURL()+'" width="'+W+'" height="'+H+'"/></mask><g id="cm-letters"><rect width="'+W+'" height="'+H+'" mask="url(#cm-shape)"/></g>';
    }
    const result = { W,H,x,y,scale,markup,layout,original };
    if (shapeCache.size > 8) shapeCache.clear();
    shapeCache.set(key,result); return result;
  }
  function createSvg(s, row, geometry, seconds, animated = false, timing = null) {
    const m = normalize(s.material), {W,H,markup} = geometry;
    if(timing)m.period=timing.scanPeriod;
    const id = 'cm';
    let svg = window.SVGMaterial.create({ ...m, id, intro: s.motion.introEnabled, period: m.period / (animated ? s.motion.speed : 1) });
    if (markup) {
      svg = svg.replace(/<path id="cm-letters"[^>]+\/>/,markup)
        .replace('width="337" height="129"','width="'+W+'" height="'+H+'"')
        .replace('width="385" height="177"','width="'+(W+48)+'" height="'+(H+48)+'"')
        .replace('viewBox="-18 -24 373 177"','viewBox="-18 -24 '+(W+36)+' '+(H+48)+'"')
        .replaceAll('168 64',W/2+' '+H/2);
      // Keep the material wavelength in the same cap-height coordinate system.
      svg = svg.replaceAll('to="594 0"','to="'+(594+Math.max(0,W-337))+' 0"');
    }
    // In the isolated grain stage, preserve white as a fixed point. Multiplying
    // the paper by noise colors the entire filter rectangle; modulate its ink
    // coverage instead: 1 - (1 - soft) * grain. The final color stage stays intact.
    if (m.stage === 4) {
      svg = svg.replace('operator="arithmetic" k1="1" result="textured"',
        'operator="arithmetic" k1="1" k3="-1" k4="1" result="textured"');
    }
    const color = row.textColor || s.typography.textColor;
    if (/^#[0-9a-f]{6}$/i.test(color) && color.toLowerCase() !== '#16181b') {
      svg = svg.replaceAll('#16181b', color);
      const tables = window.SVGMaterial.tables(m.palette);
      ['R','G','B'].forEach((ch,i) => {
        const channel = parseInt(color.slice(1+i*2,3+i*2),16)/255;
        const table = tables[i].split(' ').map((value,index) => index < 12 ? (+value + (channel - +value)*(1-index/12)).toFixed(3) : value).join(' ');
        svg = svg.replace('tableValues="'+tables[i]+'"','tableValues="'+table+'"');
      });
    }
    if (!animated) {
      const phase = ((seconds / m.period) % 1 + 1) % 1;
      const sweep = 109 + 486 * (m.direction === 1 ? phase : 1-phase);
      const reveal = 109 + (485 + Math.max(0,W-337)) * (timing ? 1 : Math.min(1,Math.max(0,seconds) / Math.max(.1,m.period-.01)));
      svg = svg.replace(/(<linearGradient id="cm-sweep"[^>]*gradientTransform=")([^"]*)"/, '$1$2 translate('+sweep+' 0)"')
        .replace(/(<linearGradient id="cm-reveal"[^>]*gradientTransform=")([^"]*)"/, '$1$2 translate('+reveal+' 0)"')
        .replace(/<animateTransform\b[^>]*\/>/g,'');
      const phase2 = ((seconds / (timing?.loopPeriod || m.period * 2)) % 1 + 1) % 1;
      const triangle = 1-Math.abs(2*phase2-1);
      svg = svg.replace('baseFrequency=".018 .035"','baseFrequency="'+(.018+.009*triangle)+' '+(.035-.015*triangle)+'"')
        .replace('<fePointLight x="-60"','<fePointLight x="'+(-60+457*triangle)+'"')
        .replace(/<animate\b[^>]*\/>/g,'');
    } else if (m.direction === -1) {
      svg = svg.replace(/(id="cm-sweep"[\s\S]*?from=")([^"]+)(" to=")([^"]+)"/, '$1$4$3$2"');
    }
    svg = svg.replace('width="746" height="354"','width="'+Math.max(2,Math.round((W+36)*geometry.scale))+'" height="'+Math.max(2,Math.round((H+48)*geometry.scale))+'"');
    svg = svg.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escapeAttr(row.text)+' · PRO SVG material</title>')
      .replace(/<desc>[\s\S]*?<\/desc>/,'<desc>Material implementation: Johnlzx/pro-svg-lab. Original visual: Mike Bespalov / Refero. CellMotion: editor, editable content and deterministic export adaptation.</desc>');
    return svg;
  }
  let decodedSvg = "", decodedImage;
  async function decode(svg) {
    if (svg === decodedSvg && decodedImage) return decodedImage;
    const url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try { const img = new Image(); img.src = url; await img.decode(); decodedSvg = svg; decodedImage = img; return img; }
    finally { URL.revokeObjectURL(url); }
  }
  const captionFonts=new Map();
  async function render(args) {
    const {targetCanvas,width,height,timeSeconds,state,canvas,resolveTimeline,renderBackground,syncPresentationBackdrop,drawToken} = args;
    const preview = targetCanvas === canvas;
    if (preview && jobs.get(targetCanvas)) return jobs.get(targetCanvas);
    const job = (async () => {
      const timeline = resolveTimeline(timeSeconds*1000);
      const s = state.scheme, m = normalize(s.material), row = timeline.segment.from;
      const geometry = shapeFor(args,timeline);
      const scanDuration = m.period*(s.motion.introEnabled?2:1);
      let seconds = s.rows.length === 1 && !row.hold ? timeSeconds*s.motion.speed : timeline.segmentTime/1000;
      if (timeline.segmentTime/1000 >= scanDuration && row.hold > 0) seconds = m.period*1.5;
      if (!s.motion.loop) seconds = Math.min(seconds,scanDuration);
      const pose=m.promoEnabled?promoPose(m,row,timeline.segmentTime/1000):null;
      const materialScheme=pose?{...s,motion:{...s.motion,introEnabled:false},material:{...m,period:pose.duration/m.promoScans}}:s;
      const materialSeconds=pose?clamp(timeline.segmentTime/1000,0,pose.duration):seconds;
      const svg = createSvg(materialScheme,row,geometry,materialSeconds,false,pose?{scanPeriod:pose.duration/m.promoScans,loopPeriod:pose.duration}:null);
      if(pose){
        const key=m.promoFont+'|'+m.promoText;
        if(!captionFonts.has(key)){if(captionFonts.size>8)captionFonts.clear();const f=window.STGFontLibrary.preset(m.promoFont);captionFonts.set(key,document.fonts.load(f.style+' '+f.weight+' 40px '+window.STGFontLibrary.family(m.promoFont),m.promoText||'中文ABC'));}
        await captionFonts.get(key);
      }
      const img = await decode(svg);
      if (targetCanvas.width !== width || targetCanvas.height !== height || state.scheme !== s) return timeline;
      const ctx = targetCanvas.getContext('2d',{willReadFrequently:true});
      ctx.save(); ctx.clearRect(0,0,width,height);
      if (preview) syncPresentationBackdrop(timeline);
      renderBackground(ctx,timeline,width,height,preview);
      // White belongs to the original filter computation. Unmatte it only when
      // placing the material on another background; white preview remains exact.
      let artwork = img;
      if (row.backgroundMedia || row.backgroundColor.toLowerCase() !== '#ffffff' || !timeline.inHold) {
        const layer = document.createElement('canvas'); layer.width=img.width;layer.height=img.height;
        const lc=layer.getContext('2d',{willReadFrequently:true});lc.drawImage(img,0,0);
        const pixels=lc.getImageData(0,0,layer.width,layer.height),d=pixels.data;
        for(let i=0;i<d.length;i+=4){const white=Math.min(d[i],d[i+1],d[i+2]);const a=1-white/255;if(a<=0){d[i+3]=0;continue;}for(let c=0;c<3;c++)d[i+c]=(d[i+c]-white)/a;d[i+3]*=a;}
        lc.putImageData(pixels,0,0);artwork=layer;
      }
      if(pose){ctx.save();ctx.translate(width/2,height/2);ctx.scale(pose.zoom,pose.zoom);ctx.translate(-width/2,-height/2);}
      ctx.drawImage(artwork,geometry.x-18*geometry.scale,geometry.y-24*geometry.scale,(geometry.W+36)*geometry.scale,(geometry.H+48)*geometry.scale);
      geometry.layout.slots.filter(slot=>slot.token.type==='icon').forEach(slot=>drawToken(ctx,slot,geometry.layout,1,1,timeSeconds));
      if(pose){ctx.restore();drawPromoCaption(ctx,m,pose,width,height);}
      ctx.restore();
      if(preview){lastGeometry=geometry;lastSvg=svg;targetCanvas.dataset.materialTime=String(timeSeconds);}
      return timeline;
    })();
    if(preview) jobs.set(targetCanvas,job);
    try{return await job;}catch(error){if(!preview)throw error;$('exportStatus').textContent='材质渲染失败：'+error.message;console.error(error);}
    finally{if(preview)jobs.delete(targetCanvas);}
  }
  function sync(s) {
    shapeCache.clear();
    const m=normalize(s.material);
    Object.entries(fields).forEach(([key,id])=>{if($(id).type==='checkbox')$(id).checked=m[key];else $(id).value=m[key];const out=document.querySelector('output[for="'+id+'"]');if(out)out.value=String(m[key])+(['period','promoReveal','promoHold','promoFade','promoGap'].includes(key)?'s':key==='promoZoom'?'×':'');});
    $('promoSettings').hidden=!m.promoEnabled;
    $('materialPeriod').disabled=m.promoEnabled;
    $('introEnabled').disabled=m.promoEnabled;
  }
  function collect(s){for(const key of ['width','height']) { s.canvas[key]=Math.round(clamp(s.canvas[key],320,3840)/2)*2; const input=$('canvas'+key[0].toUpperCase()+key.slice(1));if(document.activeElement!==input)input.value=s.canvas[key]; } const value={};Object.entries(fields).forEach(([key,id])=>value[key]=$(id).type==='checkbox'?$(id).checked:$(id).value);s.material=normalize(value);}
  let disabled=[];
  function busy(value){
    if(value){disabled=[...document.querySelectorAll('input,textarea,select,button')].map(node=>[node,node.disabled]);disabled.forEach(([node])=>node.disabled=true);document.body.classList.add('prosvg-exporting');}
    else{disabled.forEach(([node,was])=>node.disabled=was);disabled=[];document.body.classList.remove('prosvg-exporting');}
  }
  function normalizeScheme(input) {
    const s=copy(input);
    s.canvas={...scheme.canvas,...s.canvas};
    for(const key of ['width','height'])s.canvas[key]=Math.round(clamp(s.canvas[key],320,3840)/2)*2;
    s.typography={...scheme.typography,...s.typography};
    for(const [key,min,max] of [['fontSize',42,600],['tracking',-12,60],['positionX',-40,40],['positionY',-40,40]])s.typography[key]=clamp(s.typography[key],min,max);
    if(!['left','center','right'].includes(s.typography.alignment))s.typography.alignment='center';
    s.motion={...scheme.motion,...s.motion};s.motion.speed=clamp(s.motion.speed,.25,2);
    return s;
  }
  function bind(runtime){
    api=runtime;
    document.addEventListener('input',event=>{
      if (!event.target.matches('#fontFamily,select[data-key="fontFamily"]')) return;
      // A deliberate font choice applies to PRO as well as other content.
      $('materialProShape').checked=false;api.changed();sync(api.getScheme());
    });
    Object.entries(fields).forEach(([key,id])=>$(id).addEventListener('input',()=>{
      const bridge=window.CellMotionEffectBridge, previous=api.getScheme().material.period;
      const playing=window.__morphPortTest.isPlaying(), elapsed=api.getElapsedMs();
      const timing=['promoReveal','promoHold','promoFade','promoGap'].includes(key);
      api.changed({restart:key==='promoEnabled'||timing});sync(api.getScheme());
      const s=api.getScheme(),m=s.material;
      if(m.promoEnabled&&bridge&&key.startsWith('promo')&&(!playing||timing)){
        const rowIndex=api.resolveTimeline(elapsed).index,row=s.rows[rowIndex];
        const beats=promoBeats(m,row);let offset=m.promoReveal*1000+m.promoHold*500;
        const phase={promoReveal:0,promoHold:1,promoFade:2,promoGap:3}[key];
        if(phase!==undefined&&beats[phase])offset=beats.slice(0,phase).reduce((sum,b)=>sum+b[1],0)+beats[phase][1]/2;
        const base=segments(s).slice(0,rowIndex).reduce((sum,seg)=>sum+seg.durationMs,0);
        bridge.seek((base+offset)/s.motion.speed/1000);if(playing)bridge.play();
      }
      if(key==='period'&&bridge)bridge.seek((window.__morphPortTest.getElapsedMs()/1000)*m.period/previous);
    }));
    $('clearScheme').addEventListener('click',()=>{const s=api.getScheme();s.material.promoText='';sync(s);api.changed({restart:true});});
    $('exportDuration').addEventListener('change',()=>$('customDurationField').hidden=$('exportDuration').value!=='custom');
    $('exportSvg').addEventListener('click',async()=>{
      const time=api.getElapsedMs()/1000;
      await jobs.get(api.canvas);
      await api.renderFrame(api.canvas,time,api.canvas.width,api.canvas.height);
      const s=api.getScheme();const timeline=api.resolveTimeline(time*1000);
      if(!lastGeometry)return;
      api.download(new Blob([createSvg(s,timeline.segment.from,lastGeometry,0,true)],{type:'image/svg+xml'}),'prosvg-'+s.material.palette+'.svg');
      $('exportStatus').textContent='SVG 材质动画已生成 · 保留来源署名';
    });
    // Shared four-action scheme card remains unchanged. History uses standard shortcuts.
    let history=[],cursor=-1,restoring=false,timer;
    const record=()=>{if(restoring)return;const serialized=JSON.stringify(api.getScheme());if(history[cursor]===serialized)return;history=history.slice(0,cursor+1);history.push(serialized);if(history.length>40)history.shift();cursor=history.length-1;};
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(record,200);};
    document.addEventListener('input',schedule);document.addEventListener('change',schedule);document.addEventListener('click',schedule);
    document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey)||event.altKey||event.target.matches('input,textarea,[contenteditable]'))return;const key=event.key.toLowerCase();if(key!=='z'&&key!=='y')return;event.preventDefault();record();const next=cursor+((key==='y'||event.shiftKey)?1:-1);if(next<0||next>=history.length)return;cursor=next;restoring=true;api.applyScheme(JSON.parse(history[cursor]),'已'+(key==='y'||event.shiftKey?'重做':'撤销'));restoring=false;});
    // Apply explicit entry mode after the shared runtime loads its default/autosave.
    queueMicrotask(()=>{if(new URLSearchParams(location.search).get('promo')==='1'){$('promoEnabled').checked=true;api.changed({restart:true});sync(api.getScheme());}});
    setTimeout(record,0);
  }
  window.MEMorphPortExtension={port:{mode:'material',slug:'prosvg',zh:'彩铸',en:'PRO SVG Lab',amountMin:0,amountMax:1,amountStep:.01,amountUnit:'',scheme},minimumRows:1,materialLayout,normalizeScheme,invalidate:()=>shapeCache.clear(),normalize,segments,renderTimeline,editOffset:s=>{const m=normalize(s.material);return m.promoEnabled?m.promoReveal*1000+m.promoHold*500:m.period*600;},render,sync,collect,busy,bind,createSvg,promoPose,promoBeats,getLastSvg:()=>lastSvg};
})();
