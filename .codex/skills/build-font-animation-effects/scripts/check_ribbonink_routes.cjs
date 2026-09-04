const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('../../../../site/ribbonink-sequence.js');
const S = globalThis.RibbonInkSequence;
const baseline = {loop:'ccf07079197d8935badd7d57c6c23422ff9cab5b6e58162fe6e25f926f53da6b',arc:'807498fb8e15a4d751d5c5ffe7523c5b6c7d06cb381c93859aba203b90d33af2'};
for (const shape of Object.keys(baseline)) {
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(S.compile(shape,720,405,[710,195]))).digest('hex'),baseline[shape], 'approved route stays byte-identical');
}
const shapes = ['wave','eight','spiral'];
const signatures = new Set();
for (const shape of shapes) for (const H of [405,720,1280]) {
  const route = S.compile(shape,720,H,[710,H/2-7.5]);
  assert.deepEqual(S.compile(shape,720,H,[710,H/2-7.5]),route);
  assert.equal(route.contactDistance,route.parts[0].end);
  assert.ok(route.parts.at(-1).points.at(-1).x>1440+80,'fully outside the second page');
  for (let i=0;i<route.parts.length;i++) {
    const part=route.parts[i];
    assert.equal(part.rear,i%2===0);
    for(const p of part.points) assert.ok([p.x,p.y,p.length,p.angle].every(Number.isFinite));
    if(i){
      const a=route.parts[i-1].points.at(-1),b=part.points[0];
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,'no path jump');
      const turn=Math.abs(Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle)));
      assert.ok(turn<.06,shape+' has a smooth sampled tangent at join '+i+': '+turn);
    }
  }
  for(const bridge of [.55,.9,1.6]) {
    const settings={rhythm:'snake',position:.48,width:.3,strength:.82,finish:.36};
    let previous={head:0,tail:0};
    for(let i=0;i<=120;i++){
      const m=S.evaluate(i/120*(bridge+.36),bridge,.42,route,1.15,settings);
      assert.ok(m.head>=previous.head-1e-7&&m.tail>=previous.tail-1e-7&&m.tail<=m.head+1e-7);
      previous=m;
    }
    assert.ok(Math.abs(previous.tail-route.length)<1e-7);
    const center=S.evaluate(bridge,bridge,.42,route,1.15,settings).contact;
    assert.ok(center>0&&center<bridge,'word pops after the head reaches center');
  }
  if(H===405) signatures.add(JSON.stringify(route.parts));
}
assert.equal(signatures.size,3,'new routes must differ');
console.log('PASS: old routes frozen; three distinct continuous routes, responsive geometry, weaving, contact and exit clocks');
