// Run from the repository root: node scripts/test-prosvg.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { window: {}, document: { getElementById() {} }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('site/vendor/pro-svg-lab/renderer.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('site/prosvg.js','utf8'),sandbox);
const extension = sandbox.window.MEMorphPortExtension;
// Timeline resizing converts displayed seconds through master speed.
const resizeScheme = JSON.parse(JSON.stringify(extension.port.scheme));
resizeScheme.motion.speed=2;
resizeScheme.material.promoEnabled=true;
resizeScheme.material.promoScans=3;
resizeScheme.material.promoCaptions=[{id:'second',text:'第二条',hold:2}];
let resizeTarget=extension.phaseResizeTarget(resizeScheme,0,'柔和揭示');
extension.resizePhase(resizeScheme,resizeTarget,0);
assert.equal(resizeScheme.material.revealDuration,.1,'reveal respects minimum duration');
resizeTarget=extension.phaseResizeTarget(resizeScheme,0,'文案停留',1);
extension.resizePhase(resizeScheme,resizeTarget,.6);
assert.equal(resizeScheme.material.promoCaptions[0].hold,1.2);
assert.equal(resizeScheme.material.promoHold,extension.port.scheme.material.promoHold,'only selected caption changes');
resizeTarget=extension.phaseResizeTarget(resizeScheme,0,'材质停留');
extension.resizePhase(resizeScheme,resizeTarget,.75);
assert.equal(resizeScheme.rows[0].hold,1500,'row milliseconds use the same displayed time scale');
console.log('PASS timeline resize speed, bounds and independent caption hold');
const s = JSON.parse(JSON.stringify(extension.port.scheme));
const geometry = { W:337,H:129,markup:'',scale:2 };
assert.equal(extension.segments(s)[0].durationMs,4400);
s.rows[0].hold=750;
assert.equal(extension.segments(s)[0].durationMs,5150,'row hold extends the actual timeline');
s.rows.push({...s.rows[0],id:'next',backgroundTransition:'crossfade',backgroundTransitionDuration:350});
assert.equal(extension.segments(s)[0].transitionMs,350,'incoming page owns the background transition');
s.motion.introEnabled=false;
assert.equal(extension.segments(s)[0].durationMs,1100,'intro-off removes a full period, retaining hold and transition');
const bad=extension.normalize({period:-5,grain:99,stage:999,palette:'missing'});
assert.equal(bad.period,1);assert.equal(bad.grain,.4);assert.equal(bad.stage,5);assert.equal(bad.palette,'original');
const sanitized=extension.normalizeScheme({...s,canvas:{width:321,height:-1},motion:{speed:0}});
assert.equal(sanitized.canvas.width,322);assert.equal(sanitized.canvas.height,320);assert.equal(sanitized.motion.speed,.25);
const clean=extension.port.scheme;
assert.equal(clean.typography.fontFamily,'stg:archivo-black','editable default uses the matching heavy font');
const testLayout={fontSize:400,family:'Test Font',weight:900,style:'normal',slots:[0,1,2].map((i)=>({token:{type:'glyph',glyph:'ABC'[i]},x:760+i*200,y:540,width:200}))};
for (const [ascent,descent] of [[240,60],[300,0],[190,90]]) {
  const ctx={measureText:()=>({actualBoundingBoxAscent:ascent,actualBoundingBoxDescent:descent})};
  const normalized=extension.materialLayout(ctx,testLayout,clean.typography,1920,1080);
  assert.equal(normalized.inkHeight,400,'font metrics must not shrink the visible size after typing');
  const baseline=normalized.layout.slots[0].y,factor=normalized.layout.fontSize/400;
  assert.equal((baseline-ascent*factor+baseline+descent*factor)/2,540,'visible ink remains vertically centered');
}
const wideLayout={...testLayout,slots:[0,1].map(i=>({token:{type:'glyph',glyph:'M'},x:500+i*1000,y:540,width:1000}))};
const fitted=extension.materialLayout({measureText:()=>({actualBoundingBoxAscent:300,actualBoundingBoxDescent:0})},wideLayout,clean.typography,1920,1080);
const slots=fitted.layout.slots;
assert(Math.abs((slots.at(-1).x+slots.at(-1).width/2)-(slots[0].x-slots[0].width/2)-1920*.88)<.001,'long text still fits the canvas');
for(const time of [0,.5,2.2,4.4,6.6,8.8]) {
  const svg=extension.createSvg(clean,clean.rows[0],geometry,time);
  assert.doesNotMatch(svg,/<animate(?:Transform)?\b/,'raster frames cannot depend on wall-clock SMIL');
  assert.match(svg,/Johnlzx\/pro-svg-lab/);
  assert.match(svg,/Mike Bespalov \/ Refero/);
  assert.match(svg,/viewBox="-18 -24 373 177"/,'canonical geometry is unchanged');
}
// Grain may texture ink, but must leave fully white paper exactly white.
// Exercise the emitted filter arithmetic with multiple palettes and grain values.
for (const palette of ['original','silver','lava','violet']) {
  for (const grain of [0,.12,.4]) {
    const material={...clean,material:{...clean.material,stage:4,palette,grain}};
    for (const animated of [false,true]) {
      const svg=extension.createSvg(material,material.rows[0],geometry,6.3,animated);
      const composite=svg.match(/<feComposite in="soft" in2="grain"[^>]+>/)[0];
      const coefficient=k=>Number(composite.match(new RegExp(k+'="([^" ]+)"'))?.[1]||0);
      for (const noise of [0,.6,.9,1]) {
        const white=coefficient('k1')*noise+coefficient('k2')+coefficient('k3')*noise+coefficient('k4');
        assert.equal(white,1,'grain must not tint the rectangular paper area');
      }
    }
  }
}
for (const W of [200,800]) {
  const editedGeometry={W,H:129,scale:2,markup:'<g id="cm-letters"><rect width="'+W+'" height="129"/></g>'};
  const svg=extension.createSvg(clean,clean.rows[0],editedGeometry,2.2);
  assert.match(svg,/x2="486"/,'typing must not stretch the material wavelength with word width');
}
const animated=extension.createSvg(clean,clean.rows[0],geometry,0,true);
assert.match(animated,/<animateTransform/,'standalone SVG retains native motion');
assert.doesNotMatch(animated,/<script/);
const portableDefault=JSON.parse(fs.readFileSync('site/assets/presets/prosvg-default.json'));
portableDefault.material=JSON.parse(JSON.stringify(extension.normalize(portableDefault.material)));
assert.deepEqual(portableDefault,JSON.parse(JSON.stringify(clean)),'reset source and portable default must agree');
const catalog=JSON.parse(fs.readFileSync('site/cellmotion-catalog.json'));
assert.equal(catalog.effects.filter(item=>item.id==='prosvg').length,1);
assert.equal(catalog.effects.find(item=>item.id==='prosvg').status,'ready');
for(const file of ['site/prosvg.html','site/prosvg.css','site/final_prosvg.png','site/assets/previews/prosvg-card.mp4','docs/PRO_SVG_LAB_ATTRIBUTION.md'])assert.ok(fs.statSync(file).size>0,file);
console.log('PASS prosvg timeline, normalization, deterministic frames, attribution, preset and catalog');

// The promotional mode is additive; approved material pixels and the default stay intact.
const crypto=require('node:crypto');
const legacyHashes=["65e5055cb376e12516ca1942f25dd78e6b262296067236475796865f6e3be698","d01aac144bdf64bc7ec6a89da87afb9f58c088e4730f65c06ab792ca34ce4f79","36681c145fd862dfe2a2631d1ef82f2b94c0c15068d0faea71d7761dd17db868","9ba8659a6fc42ffe30966b8ab740b474c0d80e61b1dc3c4d4fad7fcc8f907e32","2b5ad878bff4c481908e58c5b007b536516c081a31234442a3bd3a4f5d363a07","25e48d0da37d9639c1ef673590e3f42195f76e645c57670c540e4ebbc99c44c1"];
legacyHashes.forEach((hash,stage)=>{const oldMode={...clean,material:{...clean.material,stage}};
  assert.equal(crypto.createHash('sha256').update(extension.createSvg(oldMode,oldMode.rows[0],geometry,1.5)).digest('hex'),hash,'original material output remains unchanged');});
const promo=JSON.parse(JSON.stringify(clean));promo.material.promoEnabled=true;
const m=promo.material,row=promo.rows[0];
assert.equal(extension.segments(promo)[0].durationMs,11600,'reveal directly precedes the additional 7.2s');
for(const t of [0,2.2,4.4]) {
  const pose=extension.promoPose(m,row,t);
  assert.equal(pose.zoom,1,'original phases keep original framing');assert.equal(pose.opacity,0);
  assert.equal(extension.createSvg(promo,row,geometry,t),extension.createSvg(clean,row,geometry,t),'promo cannot replace the original material clock or reveal');
}
assert(Math.abs(extension.promoPose(m,row,4.8).zoom-2.2)<1e-10,'zoom-in passes through its midpoint');
assert.equal(extension.promoPose(m,row,5.2).zoom,3.4);
assert.equal(extension.promoPose(m,row,6.6).opacity,1);
assert.equal(extension.promoPose(m,row,9.6).opacity,0);
assert(Math.abs(extension.promoPose(m,row,10).zoom-2.2)<1e-10,'zoom-out passes through its midpoint');
for(const t of [10.4,11,11.6,20]) {
  const pose=extension.promoPose(m,row,t);assert.equal(pose.zoom,1,'full original framing is restored');assert.equal(pose.opacity,0,'caption is gone after return');
}
m.promoBreath=.4;
assert(extension.promoPose(m,row,7.4).zoom>m.promoZoom);
assert.equal(extension.promoPose(m,row,5.2).zoom,m.promoZoom,'breathing starts without a jump');
assert.equal(extension.promoPose(m,row,9.6).zoom,m.promoZoom,'breathing ends without a jump');
row.hold=800;m.promoGap=.3;
assert.equal(extension.segments(promo)[0].durationMs,12700,'row hold extends the original phase; loop gap extends the end');
assert.equal(extension.promoPose(m,row,5.2).zoom,1,'row hold must delay zoom, not silently extend the caption');
m.promoReveal=1.2;
assert.equal(extension.segments(promo)[0].durationMs,13300,'caption entrance edit changes only that interval');
m.promoScans=2;
assert.equal(extension.segments(promo)[0].durationMs,13300,'legacy flow count no longer inserts a phase');
promo.motion.introEnabled=false;
assert.equal(extension.segments(promo)[0].durationMs,8900,'intro remains independently editable in promo mode');
for(const intro of [true,false])for(const count of [1,3])for(const zoom of [1,8]) {
  m.promoScans=count;m.promoZoom=zoom;
  const end=extension.segments({...promo,motion:{...promo.motion,introEnabled:intro}})[0].holdMs/1000;
  assert.equal(extension.promoPose(m,row,0,intro).zoom,1);
  assert.equal(extension.promoPose(m,row,end,intro).zoom,1);
}
const oldScheme=extension.normalize(JSON.parse(fs.readFileSync('site/assets/presets/prosvg-default.json')).material);
assert.equal(oldScheme.promoEnabled,false,'old schemes do not accidentally enable a new motion mode');
console.log('PASS prosvg promo phase timing, original rendering, legacy schemes and complete zoom return');

// Reveal duration is independent from scanning; captions own hold and switch windows.
const story=JSON.parse(JSON.stringify(clean));
story.material.revealDuration=.5;story.material.promoEnabled=true;story.material.promoHold=1;
story.material.promoCaptions=[{id:'second',text:'第二条',hold:2},{id:'third',text:'第三条',hold:.5}];
assert.equal(story.material.period,4.4);
assert.equal(extension.segments(story)[0].durationMs,10400);
const windows=extension.captionWindows(story.material);
assert.equal(windows[1].start,2.2);
assert.equal(windows[2].start,5.4);
for(const [time,index,text,opacity] of [[1.3,0,'How I made this',0],[2.4,0,'How I made this',1],[3.5,1,'第二条',0],[4.6,1,'第二条',1],[6.7,2,'第三条',0],[7.4,2,'第三条',1],[8.4,-1,'',0]]){
  const pose=extension.promoPose(story.material,story.rows[0],time);
  assert.equal(pose.captionIndex,index,'caption switch uses its exact timeline boundary');
  assert.equal(pose.captionText,text);assert.equal(pose.opacity,opacity);
}
assert.equal(extension.promoPose(story.material,story.rows[0],10.4).zoom,1);
const revealSvg=extension.createSvg(story,story.rows[0],geometry,.5);
assert.match(revealSvg,/cm-reveal[^>]*gradientTransform="[^"]*translate\(594 0\)/,'short reveal reaches full mask without changing scan period');
const animatedStory=extension.createSvg(story,story.rows[0],geometry,0,true);
assert.match(animatedStory,/cm-sweep[\s\S]*?dur="4.4s"/);
assert.match(animatedStory,/cm-reveal[\s\S]*?dur="0.49s"/);
assert.equal(extension.normalize({period:2}).revealDuration,2,'old schemes retain their old reveal time');
const migrated=extension.normalize({promoText:'旧文案',promoHold:2});
assert.equal(migrated.promoText,'旧文案');assert.equal(migrated.promoCaptions.length,0);
const ordered=extension.normalize({promoCaptions:[{id:'a',text:'A',hold:1},{id:'b',text:'B',hold:3}]});
assert.equal(ordered.promoCaptions[1].id,'b');
const reordered=extension.normalize({...ordered,promoCaptions:ordered.promoCaptions.slice().reverse()});
assert.equal(reordered.promoCaptions[0].text,'B');assert.equal(reordered.promoCaptions[0].hold,3);assert.equal(reordered.promoCaptions[0].id,'b');
console.log('PASS independent soft reveal, ordered captions, switch boundaries and migration');
