const assert = require('node:assert/strict');
const path = require('node:path');
require(path.resolve(__dirname,'../../../../site/ribbonink-sequence.js'));
const exit = globalThis.RibbonInkSequence.singleTextExit;
assert.deepEqual(exit(0),{sx:1,sy:1,dx:0,dy:0,alpha:1});
assert.equal(exit(1).alpha,0);
assert.equal(exit(.5).dx,0);
assert.ok(exit(.2).sy<exit(.4).sy,'single-page text should rebound after its initial press');
assert.ok(exit(.2).dy>exit(.4).dy,'single-page text should release upward before collapsing');
let previous=exit(0);
for(let i=1;i<=100;i++){
  const next=exit(i/100);
  assert.ok(next.alpha<=previous.alpha&&next.dx===0&&next.sy>0);
  previous=next;
}
for(let i=1;i<100;i++){
  const a=exit((i-1)/100),b=exit(i/100),c=exit((i+1)/100);
  assert.ok(Math.abs((c.sy-b.sy)-(b.sy-a.sy))<.025,'scale velocity must not kink between stages');
}
console.log('PASS: single-page text exits in place with a deterministic press, rebound and collapse');
