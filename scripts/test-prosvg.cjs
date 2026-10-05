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
const animated=extension.createSvg(clean,clean.rows[0],geometry,0,true);
assert.match(animated,/<animateTransform/,'standalone SVG retains native motion');
assert.doesNotMatch(animated,/<script/);
assert.deepEqual(JSON.parse(fs.readFileSync('site/assets/presets/prosvg-default.json')),JSON.parse(JSON.stringify(clean)),'reset source and portable default must agree');
const catalog=JSON.parse(fs.readFileSync('site/cellmotion-catalog.json'));
assert.equal(catalog.effects.filter(item=>item.id==='prosvg').length,1);
assert.equal(catalog.effects.find(item=>item.id==='prosvg').status,'ready');
for(const file of ['site/prosvg.html','site/prosvg.css','site/final_prosvg.png','site/assets/previews/prosvg-card.mp4','docs/PRO_SVG_LAB_ATTRIBUTION.md'])assert.ok(fs.statSync(file).size>0,file);
console.log('PASS prosvg timeline, normalization, deterministic frames, attribution, preset and catalog');
