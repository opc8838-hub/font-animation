const assert = require('node:assert/strict');
const path = require('node:path');
require(path.resolve(__dirname, '../../../../site/ribbonink-writing.js'));
require(path.resolve(__dirname, '../../../../site/ribbonink-sequence.js'));
const drift = globalThis.RibbonInkWriting.materialDrift;
assert.equal(drift(2, 0), 0);
assert.equal(drift(2, 2), drift(2, 1) * 2);
assert.ok(drift(.3, 1) - drift(.2, 1) > 10, 'pigment remains visibly moving during short slow pockets');
for (let i = 0; i < 100; i++) assert.ok(drift((i + 1) / 60, 1) > drift(i / 60, 1));
const bounds=globalThis.RibbonInkWriting.pigmentBounds;
for(const density of [.45,1,1.9])for(let s=-2000;s<3000;s+=7){
  const a=bounds(s,100,density),b=bounds(s+14,114,density);
  assert.deepEqual(a,b,'material field advects without a shape reset');
  assert.ok(Number.isFinite(a.low)&&Number.isFinite(a.high)&&a.high>a.low);
}
const paletteStyle=globalThis.RibbonInkWriting.paletteStyle;
const colors=['#f34bd9','#a40de4'],next=['#64d2ff','#0a84ff'];
const first={points:[{x:710},{x:1080}]},second={points:[{x:1080},{x:900}]},route={parts:[first,second]};
const ctx={createLinearGradient(...points){return{points,stops:[],addColorStop(t,color){this.stops.push([t,color])}}}};
assert.equal(paletteStyle(ctx,colors,colors.slice(),0,first,route),colors[0],'same palette never adds a transition');
assert.equal(paletteStyle(ctx,colors,next,0,second,route),next[0],'returning left on page two cannot return to old colors');
const gradient=paletteStyle(ctx,colors,next,1,first,route);
assert.deepEqual(gradient.stops,[[0,colors[1]],[.12,colors[1]],[1,next[1]]]);
assert.ok(gradient.points[2]<first.points.at(-1).x,'new color is complete before word contact');
const exit = globalThis.RibbonInkSequence.textExit;
assert.deepEqual(exit(0), {sx:1,sy:1,dx:0,alpha:1});
assert.equal(exit(1).alpha,0);
assert.equal(exit(2).alpha,0);
assert.deepEqual(exit(-1),exit(0));
for(let i=0;i<100;i++){
  const a=exit(i/100), b=exit((i+1)/100);
  assert.ok(b.dx>=a.dx && b.alpha<=a.alpha && b.sy>0);
  assert.deepEqual(exit(i/100),a);
}
console.log('PASS: deterministic advecting pigment, zero-speed freeze, same-color bypass, page-owned palette handoff, text collapse and complete disappearance');
