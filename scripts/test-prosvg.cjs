// Run from the repository root: node scripts/test-prosvg.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { window: {}, document: { getElementById() {} }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('site/vendor/pro-svg-lab/renderer.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('site/prosvg.js','utf8'),sandbox);
const extension = sandbox.window.MEMorphPortExtension;
const s = JSON.parse(JSON.stringify(extension.port.scheme));
const geometry = { W:337,H:129,markup:'',scale:2 };
assert.equal(extension.segments(s)[0].durationMs,8800);
s.rows[0].hold=750;
assert.equal(extension.segments(s)[0].durationMs,9550,'row hold extends the actual timeline');
s.rows.push({...s.rows[0],id:'next',backgroundTransition:'crossfade',backgroundTransitionDuration:350});
assert.equal(extension.segments(s)[0].transitionMs,350,'incoming page owns the background transition');
s.motion.introEnabled=false;
assert.equal(extension.segments(s)[0].durationMs,5500,'intro-off removes a full period, retaining hold and transition');
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
assert.equal(extension.segments(promo)[0].durationMs,4400);
assert.equal(extension.promoPose(promo.material,promo.rows[0],0).opacity,0);
assert.equal(extension.promoPose(promo.material,promo.rows[0],1.5).opacity,1);
assert.equal(extension.promoPose(promo.material,promo.rows[0],4.4).opacity,0);
promo.material.promoBreath=.4;
const beginning=extension.promoPose(promo.material,promo.rows[0],0);
const ending=extension.promoPose(promo.material,promo.rows[0],4.4);
assert.equal(beginning.zoom,ending.zoom,'zoom has no jump at the loop seam');
assert(extension.promoPose(promo.material,promo.rows[0],2.2).zoom>beginning.zoom);
promo.rows[0].hold=800;promo.material.promoGap=.3;
assert.equal(extension.segments(promo)[0].durationMs,5500,'row hold and loop gap are included');
promo.material.promoReveal=1.2;
assert.equal(extension.segments(promo)[0].durationMs,6100,'entrance edit changes that interval exactly');
const loopMaterial={...promo,motion:{...promo.motion,introEnabled:false},material:{...promo.material,warp:12,light:1}};
for(const scans of [1,3,8]){const timing={scanPeriod:6.1/scans,loopPeriod:6.1};
  const start=extension.createSvg(loopMaterial,promo.rows[0],geometry,0,false,timing);
  const end=extension.createSvg(loopMaterial,promo.rows[0],geometry,6.1,false,timing);
  assert.equal(start,end,'sweep, displacement and lighting all return to their initial state');}
const oldScheme=extension.normalize(JSON.parse(fs.readFileSync('site/assets/presets/prosvg-default.json')).material);
assert.equal(oldScheme.promoEnabled,false,'old schemes do not accidentally enable a new motion mode');
console.log('PASS prosvg promo phase timing, original rendering, legacy schemes and loop seams');
