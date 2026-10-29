(() => {
  'use strict';
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const chars = ' .,:;i1tfLCG08@';
  const source = document.createElement('canvas');
  const sample = source.getContext('2d', {willReadFrequently:true});
  const butterfly = document.createElement('canvas');
  butterfly.width = 900; butterfly.height = 900;
  const butterflyContext = butterfly.getContext('2d');
  const phases = state => {
    let start = 0;
    return [
      ['source', '原图呈现', 'Source', '#8ec8ff'],
      ['reveal', '网格显影', 'Grid reveal', '#d4b8ff'],
      ['hold', '效果展示', 'Result hold', '#d7ff2f'],
      ['reset', '回到原图', 'Return', '#ffc4d6']
    ].map(([id, zh, en, color]) => {
      const duration = state.motion[id] / state.motion.speed;
      const phase = {id, zh, en, color, start, duration};
      start += duration;
      return phase;
    });
  };
  const duration = state => phases(state).reduce((sum, phase) => sum + phase.duration, 0);
  const defaults = effect => ({
    effect, version:1, canvas:{width:1440,height:1080}, typography:{fontFamily:'stg:ibm-plex-mono'},
    backgroundColor:'#dce8e7', customAssets:[], cards:[{id:'source-1',libraryId:'dither-ascii-demo',scale:1,opacity:1,rotation:0,x:0,y:0,gap:24,caption:''}],
    scene:{mode:'ascii',tone:'duotone',mask:'none',sampleArea:'dark',strength:1,cellSize:37,spacing:1,levels:3,
      foreground:'#a8b889',background:'#f3f4ea',maskSize:90,feather:0,invert:false},
    motion:{speed:1,loop:true,source:.55,reveal:1.25,hold:2.4,reset:.55}
  });
  function cover(ctx, image, w, h, card) {
    const iw=image.videoWidth||image.width, ih=image.videoHeight||image.height;
    const scale = Math.max(w/iw, h/ih) * (card.scale || 1);
    const dw = iw * scale, dh = ih * scale;
    ctx.save();
    ctx.globalAlpha = clamp(card.opacity ?? 1);
    ctx.translate(w/2+(card.x||0)*w/1080, h/2+(card.y||0)*h/1080);
    ctx.rotate((card.rotation||0)*Math.PI/180);
    ctx.drawImage(image,-dw/2,-dh/2,dw,dh);
    ctx.restore();
  }
  function drawButterfly(ctx,time) {
    ctx.save();ctx.setTransform(900,0,0,900,0,0);
    ctx.fillStyle='#f3f4ea';ctx.fillRect(0,0,1,1);
    const flutter=(1+Math.cos(time*Math.PI*2/2.3))*.5;
    ctx.translate(.52,.51);ctx.rotate(-.08);
    function wing(side,fold) {
      ctx.save();ctx.scale(side*fold,1);
      const upper=ctx.createLinearGradient(-.46,-.48,-.02,.15);
      upper.addColorStop(0,'#c7d4a6');upper.addColorStop(.6,'#a8bd8e');upper.addColorStop(1,'#819b83');
      ctx.fillStyle=upper;ctx.beginPath();ctx.moveTo(0,-.02);
      ctx.bezierCurveTo(-.12,-.18,-.31,-.46,-.46,-.49);
      ctx.bezierCurveTo(-.52,-.45,-.51,-.16,-.44,.03);
      ctx.bezierCurveTo(-.36,.21,-.15,.11,0,.03);ctx.fill();
      ctx.fillStyle='#a9bd94';ctx.beginPath();ctx.moveTo(-.02,.01);
      ctx.bezierCurveTo(-.15,.10,-.36,.15,-.43,.29);
      ctx.bezierCurveTo(-.48,.42,-.33,.43,-.23,.36);
      ctx.bezierCurveTo(-.09,.28,-.02,.12,0,.04);ctx.fill();
      ctx.strokeStyle='#e4ebd5';ctx.lineWidth=.005;ctx.globalAlpha=.75;
      for(const [x,y] of [[-.46,-.46],[-.49,-.31],[-.48,-.15],[-.43,.02],[-.35,.20],[-.40,.34],[-.24,.35]]) {
        ctx.beginPath();ctx.moveTo(-.015,.015);ctx.quadraticCurveTo(x*.6,y*.7,x,y);ctx.stroke();
      }
      ctx.restore();
    }
    wing(1,.35+.65*flutter);wing(-1,.26+.74*flutter);
    ctx.fillStyle='#718977';ctx.beginPath();ctx.ellipse(0,.06,.016,.145,.1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#718977';ctx.lineWidth=.004;
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,-.05);ctx.quadraticCurveTo(side*.035,-.20,side*.10,-.26);ctx.stroke();}
    ctx.restore();
  }
  function revealAt(state, time) {
    const p = phases(state), reveal = p[1], reset = p[3];
    if (time < reveal.start) return 0;
    if (time < reveal.start+reveal.duration) return clamp((time-reveal.start)/reveal.duration);
    if (time < reset.start) return 1;
    return 1-clamp((time-reset.start)/reset.duration);
  }
  function maskAlpha(mode, x, y, w, h, progress, size, feather) {
    if (mode === 'none') return progress * clamp(size/100);
    const soft = Math.max(.001, feather/100);
    if (mode === 'circle') {
      const distance = Math.hypot((x-w*.5)/w,(y-h*.5)/h);
      const radius = progress*(size/100)*.75;
      return clamp((radius-distance)/soft+.5);
    }
    return clamp((progress-(x/w))/soft+.5);
  }
  function tagline(ctx,panel,h) {
    ctx.globalAlpha=1;const fade=ctx.createLinearGradient(0,panel.y+panel.h*.68,0,panel.y+panel.h);fade.addColorStop(0,'#f3f4ea00');fade.addColorStop(1,'#f3f4eadd');ctx.fillStyle=fade;ctx.fillRect(panel.x,panel.y+panel.h*.68,panel.w,panel.h*.32);
    ctx.textAlign='left';ctx.fillStyle='#263222';ctx.font=`500 ${h*.033}px Georgia,serif`;ctx.fillText('Your browser,',panel.x+h*.03,panel.y+panel.h-h*.105);
    ctx.font=`italic 500 ${h*.041}px Georgia,serif`;ctx.fillText('at command.',panel.x+h*.03,panel.y+panel.h-h*.045);
  }
  function draw(ctx, time, width, height, state, resources) {
    const w = width, h = height, scene = state.scene;
    ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);
    ctx.clearRect(0,0,w,h);ctx.fillStyle=state.backgroundColor;ctx.fillRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w*.55,h*.94,0,w*.55,h*.94,w*.72);glow.addColorStop(0,'#cc7237');glow.addColorStop(.48,'#e8bc8f');glow.addColorStop(1,'#b7d5dc');ctx.fillStyle=glow;ctx.globalAlpha=.88;ctx.fillRect(0,0,w,h);
    const upper=ctx.createRadialGradient(w*.47,-h*.14,0,w*.47,-h*.14,w*.65);upper.addColorStop(0,'#e79632');upper.addColorStop(.48,'#e2b572');upper.addColorStop(1,'#b9d5d7');ctx.fillStyle=upper;ctx.globalAlpha=.72;ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
    const background=resources.get(state.backgroundMedia?.libraryId);
    const backgroundImage=background?.video || (background?.animated ? window.CellMotionAnimatedImage.frameAt(background.animated,time)?.image : background?.image);
    if(backgroundImage?.width || backgroundImage?.videoWidth)cover(ctx,backgroundImage,w,h,{scale:1,opacity:1});
    const cardSize=Math.min(w*.89,h*.9);const card={x:(w-cardSize)/2,y:(h-cardSize)/2,w:cardSize,h:cardSize};
    const panel={x:card.x+card.w*.025,y:card.y+card.h*.025,w:card.w*.95,h:card.h*.95};
    ctx.save();ctx.shadowColor='#47504b50';ctx.shadowBlur=h*.035;ctx.shadowOffsetY=h*.015;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.roundRect(card.x,card.y,card.w,card.h,h*.04);ctx.fill();ctx.restore();
    const cards = state.cards || [];
    const sw = Math.max(1,Math.round(Math.min(panel.w,720))), sh = Math.max(1,Math.round(panel.h*sw/panel.w));
    if (source.width!==sw || source.height!==sh) {source.width=sw;source.height=sh;}
    sample.fillStyle=scene.background;sample.fillRect(0,0,sw,sh);
    for (const card of cards) {
      if(card.libraryId==='dither-ascii-demo') {drawButterfly(butterflyContext,Math.max(0,time)%duration(state));cover(sample,butterfly,sw,sh,card);continue;}
      const asset = resources.get(card.libraryId);
      const image = asset?.animated ? window.CellMotionAnimatedImage.frameAt(asset.animated,time)?.image || asset.image : asset?.image;
      if (image?.width) cover(sample,image,sw,sh,card);
    }
    ctx.save();ctx.beginPath();ctx.roundRect(panel.x,panel.y,panel.w,panel.h,h*.018);ctx.clip();
    ctx.drawImage(source,panel.x,panel.y,panel.w,panel.h);
    const progress = revealAt(state,Math.max(0,time)%duration(state));
    if (progress <= 0 || !cards.length) {tagline(ctx,panel,h);ctx.restore();ctx.restore();return;}
    const pixels=sample.getImageData(0,0,sw,sh).data;
    const cell=Math.max(1.5,scene.cellSize*panel.w/2400), step=cell*Math.max(.5,scene.spacing);
    const ink=scene.foreground, paper=scene.background;
    const levels=Math.max(2,Math.round(scene.levels));
    const widthCells=Math.ceil(panel.w/step), heightCells=Math.ceil(panel.h/step);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${Math.max(1.5,cell*.89)}px "STG IBM Plex Mono",monospace`;
    for(let row=0;row<heightCells;row++)for(let col=0;col<widthCells;col++) {
      const x=col*step, y=row*step, alpha=maskAlpha(scene.mask,x+step*.5,y+step*.5,panel.w,panel.h,progress,scene.maskSize,scene.feather);
      if(alpha<=0)continue;
      const sx=Math.min(sw-1,Math.round((x+step*.5)/panel.w*sw)), sy=Math.min(sh-1,Math.round((y+step*.5)/panel.h*sh));
      const at=(sy*sw+sx)*4, r=pixels[at], g=pixels[at+1], b=pixels[at+2];
      let light=clamp(((r*.2126+g*.7152+b*.0722)/255-.5)*scene.strength+.5);
      if(scene.invert)light=1-light;
      if(scene.sampleArea==='dark') light=clamp((light-.5)*1.4+.5);
      if(scene.sampleArea==='light') light=clamp((light-.5)*.8+.5);
      ctx.globalAlpha=alpha;
      ctx.fillStyle=paper;ctx.fillRect(panel.x+x,panel.y+y,step+.5,step+.5);
      if(scene.mode==='ascii') {
        const density=clamp((.96-light)*2.1);
        const index=Math.min(chars.length-1,Math.floor(density*chars.length));
        ctx.fillStyle=scene.tone==='original'?`rgb(${r},${g},${b})`:scene.tone==='mono'?'#e7e8e6':ink;
        ctx.fillText(chars[index],panel.x+x+step*.5,panel.y+y+step*.54);
      } else {
        const threshold=(bayer[(row%4)*4+col%4]+.5)/16-.5;
        const quant=clamp(Math.round(light*(levels-1)+threshold)/(levels-1));
        if(scene.tone==='original')ctx.fillStyle=`rgb(${Math.round(r*quant)},${Math.round(g*quant)},${Math.round(b*quant)})`;
        else if(scene.tone==='mono') {const v=Math.round(quant*255);ctx.fillStyle=`rgb(${v},${v},${v})`;}
        else {ctx.fillStyle=(1-light)*1.8>(bayer[(row%4)*4+col%4]+.5)/16?ink:paper;}
        ctx.fillRect(panel.x+x,panel.y+y,Math.min(cell,step+.5),Math.min(cell,step+.5));
      }
    }
    tagline(ctx,panel,h);
    ctx.restore();
    ctx.restore();
  }
  window.CardMotion={clamp,defaults,phases,duration,draw};
  const n=(path,zh,en,min,max,step=1,unit='')=>[path,zh,en,min,max,step,unit];
  window.CellMotionEditorExtension={
    title:['网格显影','Dither / ASCII'],assetLabel:['图像素材','Image sources'],captionLabel:['素材备注','Asset note'],
    assetLibrary:'assets/dither-ascii/library.json',
    fields:[n('motion.source','原图停留','Source hold',0,4,.05,'s'),n('motion.reveal','显影时间','Reveal duration',.1,5,.05,'s'),n('motion.hold','效果停留','Result hold',0,8,.05,'s'),n('motion.reset','还原时间','Return duration',.1,5,.05,'s')],
    content({input,range,select,t}) {return `<section class="gm-card"><h2>${t('图像处理','Image treatment')}</h2>
      ${select('scene.mode','效果模式','Effect mode',[['dither','Dither 抖动','Dither'],['ascii','ASCII 字符画','ASCII']])}
      ${select('scene.tone','色调','Tone',[['original','保留原色','Original color'],['mono','黑白','Monochrome'],['duotone','双色','Duotone']])}
      <div class="dither-color-label">${t('配色','Color')}</div><div class="dither-swatches" aria-label="${t('配色','Color')}">
        <button type="button" data-swatch="#a8b889" aria-label="Sage" style="--swatch:#a8b889"></button><button type="button" data-swatch="#8bb0e9" aria-label="Blue" style="--swatch:#8bb0e9"></button><button type="button" data-swatch="#d98842" aria-label="Orange" style="--swatch:#d98842"></button><button type="button" data-swatch="#a78cde" aria-label="Violet" style="--swatch:#a78cde"></button><button type="button" data-swatch="#b3b5b2" aria-label="Gray" style="--swatch:#b3b5b2"></button>
      </div>
      ${select('scene.mask','遮罩','Mask',[['wipe','横向扫入','Horizontal wipe'],['circle','圆形扩张','Expanding circle'],['none','整体渐显','Full fade']])}
      ${select('scene.sampleArea','采样区域','Sample region',[['all','完整明暗','All tones'],['dark','暗部细节','Dark detail'],['light','亮部细节','Light detail']])}
      ${range(n('scene.strength','采样强度','Sampling strength',.4,2.8,.05))}
      ${range(n('scene.cellSize','大小','Cell size',6,42,1,'px'))}
      ${range(n('scene.spacing','间距','Grid spacing',.6,2.2,.05))}
      ${range(n('scene.levels','色阶','Color levels',2,6,1))}
      ${range(n('scene.maskSize','遮罩范围','Mask range',25,120,1,'%'))}
      ${range(n('scene.feather','遮罩柔和度','Mask softness',0,40,1,'%'))}
      <div class="gm-grid-2">${input('scene.foreground','前景色','Foreground','color')}${input('scene.background','底色','Background','color')}</div>
      <label class="cm-check"><input data-path="scene.invert" type="checkbox">${t('反转亮度','Invert brightness')}</label>
      </section><section class="gm-card me-layer-panel" id="assetManager"><button class="me-layer-toggle" id="assetToggle">${t('展开已选','Show selected')}</button><div class="me-layer-items" id="selectedAssets" hidden></div></section>`;},
    async prepare(state,resources,prepareAsset,builtins) {for(const asset of builtins)await prepareAsset(asset);await document.fonts.load('600 16px "STG IBM Plex Mono"');},
    normalize(raw,state,def) {
      state.scene={...def.scene,...raw.scene};
      for(const [key,lo,hi] of [['strength',.4,2.8],['cellSize',6,42],['spacing',.6,2.2],['levels',2,6],['maskSize',25,120],['feather',0,40]]){
        const value=Number(state.scene[key]);state.scene[key]=clamp(Number.isFinite(value)?value:def.scene[key],lo,hi);
      }
      if(!['dither','ascii'].includes(state.scene.mode))state.scene.mode='dither';
      if(!['original','mono','duotone'].includes(state.scene.tone))state.scene.tone='original';
      if(!['wipe','circle','none'].includes(state.scene.mask))state.scene.mask='wipe';
      if(!['all','dark','light'].includes(state.scene.sampleArea))state.scene.sampleArea='all';
      for(const key of ['foreground','background'])if(!/^#[0-9a-f]{6}$/i.test(state.scene[key]))state.scene[key]=def.scene[key];
      state.scene.invert=!!state.scene.invert;
    },
    stable:state=>phases(state)[2].start+.1,
    seekForPath(state,path){const p=phases(state).find(item=>'motion.'+item.id===path);return p?p.start+p.duration*.5:phases(state)[2].start;},
    layout(){document.body.classList.add('archive-editor','dither-editor');const heading=document.querySelector('.tc-panel-heading h2');heading.dataset.zh='图像素材';heading.dataset.en='Image sources';heading.textContent='图像素材';document.querySelector('.tc-panel-heading').append(document.getElementById('openLibrary'));document.querySelector('.tc-tabs [data-panel="content"] span').dataset.zh='画面设置';document.querySelector('.tc-tabs [data-panel="content"] span').dataset.en='Scene';const color=document.querySelector('[data-path="scene.foreground"]');const buttons=[...document.querySelectorAll('[data-swatch]')];const sync=()=>buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.swatch===color.value.toLowerCase())));buttons.forEach(button=>button.addEventListener('click',()=>{color.value=button.dataset.swatch;color.dispatchEvent(new Event('input',{bubbles:true}));sync();}));color.addEventListener('input',sync);const mode=document.querySelector('[data-path="scene.mode"]'),size=document.querySelector('[data-path="scene.cellSize"]');mode.addEventListener('change',()=>{size.value=mode.value==='dither'?15:37;size.dispatchEvent(new Event('input',{bubbles:true}));});sync();},
    extraCard({t}){return `<label class="gm-field">${t('素材备注','Asset note')}<input data-card-key="caption" type="text" maxlength="300"></label><button id="replaceAsset">${t('替换图像','Replace image')}</button>`;},
    bindCard({card}){document.querySelector('[data-card-key="caption"]').value=card.caption||'';}
  };
})();
